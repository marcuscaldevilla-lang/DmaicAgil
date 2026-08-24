import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, dmaicWorkspaces } from "@workspace/db";
import {
  GetDmaicWorkspaceResponse,
  ListDmaicWorkspacesResponse,
  RunDmaicExploratoryDiagnosisBody,
  RunDmaicExploratoryDiagnosisResponse,
  RunDmaicPipelineBody,
  RunDmaicPipelineResponse,
  SaveDmaicWorkspaceBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DMAIC_SYSTEM_PROMPT = `Você é um Master Black Belt especialista em Lean Seis Sigma e Scrum.
Crie artefatos acionáveis em português do Brasil para um projeto DMAIC Ágil.
Responda SOMENTE com JSON válido, sem markdown, seguindo exatamente esta estrutura:
{
  "generatedCharter":{"objective":"","history":"","goalDefinition":"","kpis":"","includedScope":"","excludedScope":"","assumptionsAndConstraints":"","customerRequirements":"","businessContributions":"","businessContributionsQuantitative":"","businessContributionsQualitative":"","financialGainValue":""},
  "projectCharter":{"projectTitle":"","problemStatement":"","businessCase":"","expectedSavings":""},
  "teamSetup":{"productOwner":"","scrumMaster":"","beltSquadMembers":""},
  "vocCtq":[{"vocNeed":"","issue":"","ctqMetric":""}],
  "indicatorsY":{"primaryMetricY":"","operationalDefinition":"","targetGoal":"","baseline":""},
  "sipoc":{"suppliers":[""],"inputs":[""],"process":[""],"outputs":[""],"customers":[""]},
  "inOutMatrix":{"inScope":[""],"outOfScope":[""]},
  "msaValidation":[{"variable":"","gageRrStatus":"","recommendation":""}],
  "ishikawa":{"Método":[""],"Máquina":[""],"Material":[""],"Mão de Obra":[""],"Medição":[""],"Meio Ambiente":[""]},
  "gutPrioritization":[{"cause":"","gravity":"","urgency":"","tendency":"","gutScore":""}],
  "vitalXs":[{"id":"","description":"","specificGoalReduction":"","assignedSprint":""}],
  "hypotheses":[{"xVital":"","testType":"","pValueSimulated":"","conclusion":""}],
  "fmea":[{"step":"","failureMode":"","potentialCause":"","sev":"","occ":"","det":"","rpn":""}],
  "actionPlan":[{"what":"","why":"","where":"","when":"","who":"","how":"","howMuch":""}],
  "controlPlan":[{"parameter":"","specification":"","measurementFreq":"","responsible":"","reactionPlan":""}],
  "standardizationSop":[{"procedureName":"","pokaYokeFeature":"","ocapTrigger":""}]
}
Use 1 ou 2 itens concisos por lista. Todos os valores devem ser strings. Em "generatedCharter", preencha todos os doze campos com sugestões diretamente derivadas do problema informado e do contexto do Charter. Reescreva "goalDefinition" como uma meta SMART coerente com objetivo, KPIs, baseline, escopo, contribuições quantitativas e informações financeiras coletadas; não repita automaticamente uma meta antiga se os dados coletados apontarem outra. Para "financialGainValue", calcule uma estimativa somente a partir dos números, moeda, período, volume, custo unitário, percentual e premissas explicitamente presentes em "businessContributionsQuantitative" e "financialInformation". Mostre a fórmula ou a lógica usada e deixe claro o período, a moeda e as premissas. Se os campos não trouxerem dados suficientes para uma conta defensável, diga que não foi possível calcular e liste o dado faltante. Nunca invente valor, custo, volume, receita, economia, ROI ou payback, nem apresente estimativa como valor confirmado. O campo de informações financeiras coletadas é factual e pertence ao time, não à IA. As contribuições quantitativas, qualitativas e o ganho financeiro devem permanecer como propostas para validação; valores calculados devem ser validados com Financeiro. Seja específico ao problema e realista, sem afirmar como medidos dados que não foram informados. Quando houver contexto de Project Charter fornecido pela equipe, trate-o como fonte prioritária e reaproveite seus termos, metas, responsáveis, limites e informações financeiras coletadas.`;

const EXPLORATORY_SYSTEM_PROMPT = `Você é um Master Black Belt em Lean Six Sigma, com experiência em análise estatística aplicada.
Elabore um diagnóstico detalhado em português do Brasil sobre a série temporal e as estatísticas fornecidas.
Organize a resposta com os títulos: Resumo executivo, Comportamento ao longo do tempo, Variabilidade e distribuição, Normalidade, e Recomendações para o DMAIC.
Explique o que os dados sustentam e o que ainda precisa ser investigado, sem afirmar causalidade nem inventar fatos.
Use os valores numéricos informados para justificar as conclusões. Interprete o p-valor de Shapiro-Wilk com nível de significância de 5%: p >= 0,05 indica que não há evidência suficiente para rejeitar normalidade; p < 0,05 indica evidência de desvio da normalidade.
Considere que os gráficos e estatísticas podem conter todas as observações, enquanto a lista de pontos enviada pode ser uma amostra cronológica. Entregue 5 a 8 parágrafos completos, com recomendações acionáveis e perguntas para a próxima etapa. Não corte a resposta no meio de uma frase.`;

const DIAGNOSIS_WINDOW_MS = 10 * 60 * 1000;
const DIAGNOSIS_MAX_REQUESTS_PER_WINDOW = 6;
const diagnosisRequests = new Map<string, { count: number; windowStartedAt: number }>();
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const RETRYABLE_GEMINI_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function completeDiagnosisText(value: string): string {
  const text = value.trim();
  if (/[.!?…]$/.test(text)) return text;
  const endings = [...text.matchAll(/[.!?…](?=\s|$)/g)];
  const lastEnding = endings.at(-1);
  return lastEnding && lastEnding.index !== undefined ? text.slice(0, lastEnding.index + 1).trim() : text;
}

function canGenerateExploratoryDiagnosis(clientKey: string): boolean {
  const now = Date.now();
  for (const [key, record] of diagnosisRequests) {
    if (now - record.windowStartedAt >= DIAGNOSIS_WINDOW_MS) diagnosisRequests.delete(key);
  }
  const current = diagnosisRequests.get(clientKey);
  if (!current || now - current.windowStartedAt >= DIAGNOSIS_WINDOW_MS) {
    diagnosisRequests.set(clientKey, { count: 1, windowStartedAt: now });
    return true;
  }
  if (current.count >= DIAGNOSIS_MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestGemini(apiKey: string, body: unknown): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      if (response.ok || !RETRYABLE_GEMINI_STATUS_CODES.has(response.status) || attempt === 1) return response;
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
    }
    await wait(800);
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini request could not be completed.");
}

function parseModelJson(value: string): unknown {
  const withoutFences = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(withoutFences);
}

function emptyCharterContext() {
  return {
    projectName: "",
    client: "",
    area: "Operação",
    leader: "",
    sponsor: "",
    date: new Date().toISOString().slice(0, 10),
    objective: "",
    history: "",
    goalDefinition: "",
    kpis: "NS atendimento",
    includedScope: "",
    excludedScope: "",
    assumptionsAndConstraints: "",
    team: [],
    customerRequirements: "",
    businessContributions: "",
    businessContributionsQuantitative: "",
    businessContributionsQualitative: "",
    financialGainValue: "",
    financialInformation: "",
  };
}

function normalizeCharterContext(context: unknown) {
  const source = context && typeof context === "object" ? context as Record<string, unknown> : {};
  return {
    ...source,
    businessContributions: typeof source.businessContributions === "string" ? source.businessContributions : "",
    businessContributionsQuantitative: typeof source.businessContributionsQuantitative === "string" ? source.businessContributionsQuantitative : "",
    businessContributionsQualitative: typeof source.businessContributionsQualitative === "string" ? source.businessContributionsQualitative : "",
    financialGainValue: typeof source.financialGainValue === "string" ? source.financialGainValue : "",
    financialInformation: typeof source.financialInformation === "string" ? source.financialInformation : "",
  };
}

const FINANCIAL_ESTIMATE_PREFIX = "Estimativa calculada pela IA com base nas informações fornecidas";

function normalizeGeneratedCharterSuggestions(
  suggestions: unknown,
  financialInformation: string | undefined,
  businessContributionsQuantitative: string | undefined,
) {
  if (!suggestions || typeof suggestions !== "object") return suggestions;
  const source = suggestions as Record<string, unknown>;
  return {
    ...source,
    businessContributions: createBusinessContributionSuggestion("summary"),
    businessContributionsQuantitative: createBusinessContributionSuggestion("quantitative"),
    businessContributionsQualitative: createBusinessContributionSuggestion("qualitative"),
    financialGainValue: createFinancialGainSuggestion(
      financialInformation,
      businessContributionsQuantitative,
      typeof source.financialGainValue === "string" ? source.financialGainValue : undefined,
    ),
  };
}

export function createFinancialGainSuggestion(
  financialInformation: string | undefined,
  businessContributionsQuantitative: string | undefined,
  modelSuggestion?: string,
): string {
  const hasFinancialInputs = Boolean(financialInformation?.trim() || businessContributionsQuantitative?.trim());
  if (!hasFinancialInputs) {
    return "Não foi possível calcular o ganho financeiro: preencha Contribuições quantitativas e Informações financeiras coletadas.";
  }
  const suggestion = modelSuggestion?.trim();
  if (!suggestion || suggestion === "Valor a validar com Financeiro. Não há informações financeiras coletadas suficientes para propor um ganho.") {
    return "A IA não retornou um cálculo defensável a partir dos dados fornecidos. Valide com Financeiro a fonte, período, moeda, volume, custo unitário, premissas e fórmula.";
  }
  if (suggestion.startsWith(FINANCIAL_ESTIMATE_PREFIX)) return suggestion;
  return `${FINANCIAL_ESTIMATE_PREFIX} (Contribuições quantitativas + Informações financeiras coletadas): ${suggestion} Validação obrigatória com Financeiro antes de tratar o valor como confirmado.`;
}

function createBusinessContributionSuggestion(kind: "summary" | "quantitative" | "qualitative"): string {
  if (kind === "quantitative") {
    return "Proposta da IA para validação: descreva impactos mensuráveis ligados à VOC, à meta e ao escopo. Registre qualquer impacto financeiro somente depois da validação com Financeiro.";
  }
  if (kind === "qualitative") {
    return "Proposta da IA para validação: descreva ganhos não financeiros para cliente, operação, qualidade ou risco, sempre ligados à VOC e ao escopo.";
  }
  return "Proposta da IA para validação: relacione o benefício do projeto à VOC, à meta e ao escopo. Valores financeiros devem ser confirmados pelo time responsável.";
}

function parseProjectKey(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const projectKey = Number(value);
  return Number.isSafeInteger(projectKey) ? projectKey : null;
}

function serializeWorkspace(row?: typeof dmaicWorkspaces.$inferSelect) {
  const now = new Date();
  if (!row) {
    return {
      projectKey: null,
      hasSavedData: false,
      problemStatement: "",
      projectCharterContext: emptyCharterContext(),
      aiCharterSuggestions: null,
      revision: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  const projectCharterContext = normalizeCharterContext(row.projectCharterContext);
  return {
    projectKey: row.projectKey,
    hasSavedData: true,
    problemStatement: row.problemStatement,
    projectCharterContext,
    aiCharterSuggestions: normalizeGeneratedCharterSuggestions(
      row.aiCharterSuggestions,
      projectCharterContext.financialInformation,
      projectCharterContext.businessContributionsQuantitative,
    ),
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeWorkspaceSummary(row: typeof dmaicWorkspaces.$inferSelect) {
  const projectCharterContext = row.projectCharterContext && typeof row.projectCharterContext === "object"
    ? row.projectCharterContext as Record<string, unknown>
    : {};
  const projectName = typeof projectCharterContext.projectName === "string" ? projectCharterContext.projectName.trim() : "";
  return {
    projectKey: row.projectKey,
    projectName: projectName || `Projeto #${row.projectKey}`,
    problemStatement: row.problemStatement,
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/dmaic/workspace", async (req, res): Promise<void> => {
  const requestedProjectKey = req.query.projectKey;
  const projectKey = requestedProjectKey === undefined ? null : parseProjectKey(requestedProjectKey);
  if (requestedProjectKey !== undefined && !projectKey) {
    res.status(400).json({ error: "Informe um código de projeto numérico válido." });
    return;
  }

  try {
    const [workspace] = projectKey
      ? await db
        .select()
        .from(dmaicWorkspaces)
        .where(eq(dmaicWorkspaces.projectKey, projectKey))
        .limit(1)
      : await db
        .select()
        .from(dmaicWorkspaces)
        .orderBy(desc(dmaicWorkspaces.updatedAt))
        .limit(1);
    const payload = GetDmaicWorkspaceResponse.safeParse(serializeWorkspace(workspace));
    if (!payload.success) {
      req.log.error({ errors: payload.error.flatten() }, "Stored DMAIC workspace has an invalid shape");
      res.status(500).json({ error: "Não foi possível ler o workspace salvo." });
      return;
    }
    res.json(payload.data);
  } catch (error) {
    req.log.error({ error }, "Failed to load DMAIC workspace");
    res.status(500).json({ error: "Não foi possível carregar o workspace salvo." });
  }
});

router.get("/dmaic/workspaces", async (req, res): Promise<void> => {
  try {
    const workspaces = await db
      .select()
      .from(dmaicWorkspaces)
      .orderBy(desc(dmaicWorkspaces.updatedAt), desc(dmaicWorkspaces.projectKey));
    const payload = ListDmaicWorkspacesResponse.safeParse(workspaces.map(serializeWorkspaceSummary));
    if (!payload.success) {
      req.log.error({ errors: payload.error.flatten() }, "Stored DMAIC workspace list has an invalid shape");
      res.status(500).json({ error: "Não foi possível ler a lista de projetos salvos." });
      return;
    }
    res.json(payload.data);
  } catch (error) {
    req.log.error({ error }, "Failed to list DMAIC workspaces");
    res.status(500).json({ error: "Não foi possível carregar a lista de projetos salvos." });
  }
});

router.put("/dmaic/workspace", async (req, res): Promise<void> => {
  const body = SaveDmaicWorkspaceBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.flatten() }, "Invalid DMAIC workspace save request");
    res.status(400).json({ error: "Revise o problem statement e os campos do Project Charter." });
    return;
  }
  if (!Number.isSafeInteger(body.data.expectedRevision)) {
    req.log.warn({ expectedRevision: body.data.expectedRevision }, "Invalid DMAIC workspace revision");
    res.status(400).json({ error: "A revisão do workspace deve ser um número inteiro válido." });
    return;
  }

  const projectCharterContext = {
    ...body.data.projectCharterContext,
    date: body.data.projectCharterContext.date.toISOString().slice(0, 10),
  };
  const aiCharterSuggestions = normalizeGeneratedCharterSuggestions(
    body.data.aiCharterSuggestions,
    projectCharterContext.financialInformation,
    projectCharterContext.businessContributionsQuantitative,
  );
  const expectedRevision = body.data.expectedRevision;
  const projectKey = body.data.projectKey;
  if (expectedRevision > 0 && !projectKey) {
    res.status(400).json({ error: "Informe o código numérico do projeto para atualizar este workspace." });
    return;
  }

  try {
    const values = {
      problemStatement: body.data.problemStatement,
      projectCharterContext,
      aiCharterSuggestions,
    };
    let workspace: typeof dmaicWorkspaces.$inferSelect | undefined;

    if (expectedRevision === 0) {
      [workspace] = await db
        .insert(dmaicWorkspaces)
        .values(values)
        .onConflictDoNothing({ target: dmaicWorkspaces.projectKey })
        .returning();
    } else {
      const existingProjectKey = projectKey as number;
      [workspace] = await db
        .update(dmaicWorkspaces)
        .set({
          problemStatement: values.problemStatement,
          projectCharterContext: values.projectCharterContext,
          aiCharterSuggestions: values.aiCharterSuggestions,
          revision: sql`${dmaicWorkspaces.revision} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dmaicWorkspaces.projectKey, existingProjectKey),
            eq(dmaicWorkspaces.revision, expectedRevision),
          ),
        )
        .returning();
    }

    if (!workspace) {
      if (!projectKey) {
        req.log.error("DMAIC workspace insert did not return the generated project code");
        res.status(500).json({ error: "Não foi possível criar o projeto no Neon." });
        return;
      }
      const [latestWorkspace] = await db
        .select()
        .from(dmaicWorkspaces)
        .where(eq(dmaicWorkspaces.projectKey, projectKey))
        .limit(1);
      const latestPayload = GetDmaicWorkspaceResponse.safeParse(serializeWorkspace(latestWorkspace));
      if (!latestPayload.success) {
        req.log.error({ errors: latestPayload.error.flatten() }, "Workspace conflict response has an invalid shape");
        res.status(500).json({ error: "O workspace mudou, mas a versão mais recente não pôde ser lida." });
        return;
      }
      req.log.warn("Rejected stale DMAIC workspace save");
      res.status(409).json({
        error: "O workspace foi alterado por outra sessão desde a última leitura.",
        latestWorkspace: latestPayload.data,
      });
      return;
    }

    const payload = GetDmaicWorkspaceResponse.safeParse(serializeWorkspace(workspace));
    if (!payload.success) {
      req.log.error({ errors: payload.error.flatten() }, "Saved DMAIC workspace has an invalid shape");
      res.status(500).json({ error: "O workspace foi salvo, mas não pôde ser confirmado." });
      return;
    }
    req.log.info("DMAIC workspace saved");
    res.json(payload.data);
  } catch (error) {
    req.log.error({ error }, "Failed to save DMAIC workspace");
    res.status(500).json({ error: "Não foi possível salvar no Neon. Tente novamente." });
  }
});

router.post("/dmaic/exploratory-diagnosis", async (req, res): Promise<void> => {
  const body = RunDmaicExploratoryDiagnosisBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.flatten() }, "Invalid exploratory diagnosis request");
    res.status(400).json({ error: "Informe um indicador e pelo menos duas observações numéricas." });
    return;
  }

  const clientKey = req.ip || req.socket.remoteAddress || "unknown";
  if (!canGenerateExploratoryDiagnosis(clientKey)) {
    req.log.warn({ clientKey }, "Exploratory diagnosis rate limit reached");
    res.status(429).json({ error: "Você atingiu o limite temporário de diagnósticos. Aguarde alguns minutos antes de tentar novamente." });
    return;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    req.log.error("GOOGLE_API_KEY is not configured");
    res.status(503).json({ error: "A integração Gemini ainda não está configurada." });
    return;
  }

  try {
    const response = await requestGemini(apiKey, {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${EXPLORATORY_SYSTEM_PROMPT}\n\nIndicador: ${body.data.indicator}\nColuna temporal: ${body.data.timeColumn ?? "não informada"}\nEstatísticas calculadas localmente para todas as observações selecionadas:\n${JSON.stringify(body.data.statistics)}\nSérie selecionada em ordem cronológica (pode ser uma amostra quando o recorte for muito longo):\n${JSON.stringify(body.data.points)}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        });

    if (!response.ok) {
      const details = await response.text();
      req.log.error(
        { status: response.status, details: details.slice(0, 500) },
        "Gemini exploratory diagnosis request failed",
      );
      res.status(502).json({ error: "Não foi possível gerar o diagnóstico agora. Tente novamente." });
      return;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const diagnosis = completeDiagnosisText(payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "");
    if (!diagnosis) {
      req.log.error("Gemini returned no exploratory diagnosis");
      res.status(502).json({ error: "O diagnóstico retornou uma resposta vazia. Tente novamente." });
      return;
    }

    const parsed = RunDmaicExploratoryDiagnosisResponse.safeParse({ diagnosis });
    if (!parsed.success) {
      req.log.error({ errors: parsed.error.flatten() }, "Gemini returned an invalid exploratory diagnosis");
      res.status(502).json({ error: "O diagnóstico ficou incompleto. Tente novamente." });
      return;
    }

    req.log.info("DMAIC exploratory diagnosis generated");
    res.json(parsed.data);
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error
      ? { name: error.cause.name, message: error.cause.message }
      : undefined;
    req.log.error(
      {
        err: error,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        cause,
      },
      "Failed to generate exploratory diagnosis",
    );
    res.status(502).json({ error: "Ocorreu um erro ao gerar o diagnóstico. Tente novamente." });
  }
});

router.post("/dmaic/pipeline", async (req, res): Promise<void> => {
  const body = RunDmaicPipelineBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.flatten() }, "Invalid DMAIC pipeline request");
    res.status(400).json({ error: "Informe um problema com pelo menos 10 caracteres." });
    return;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    req.log.error("GOOGLE_API_KEY is not configured");
    res.status(503).json({ error: "A integração Gemini ainda não está configurada." });
    return;
  }

  try {
    const response = await requestGemini(apiKey, {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${DMAIC_SYSTEM_PROMPT}\n\nProblema do projeto:\n${body.data.problemStatement}\n\nContexto preenchido no Project Charter:\n${body.data.projectCharterContext ? JSON.stringify(body.data.projectCharterContext, null, 2) : "Nenhum contexto adicional foi preenchido."}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.25,
            maxOutputTokens: 16384,
          },
        });

    if (!response.ok) {
      const details = await response.text();
      req.log.error(
        { status: response.status, details: details.slice(0, 500) },
        "Gemini pipeline request failed",
      );
      res.status(502).json({ error: "Não foi possível gerar o pipeline agora. Tente novamente." });
      return;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      req.log.error("Gemini returned no pipeline content");
      res.status(502).json({ error: "A geração retornou uma resposta vazia. Tente novamente." });
      return;
    }

    const pipeline = RunDmaicPipelineResponse.safeParse(parseModelJson(text));
    if (!pipeline.success) {
      req.log.error(
        { errors: pipeline.error.flatten() },
        "Gemini returned an invalid DMAIC pipeline structure",
      );
      res.status(502).json({ error: "A geração ficou incompleta. Tente novamente." });
      return;
    }

    const safePipeline = {
      ...pipeline.data,
      projectCharter: {
        ...pipeline.data.projectCharter,
         expectedSavings: createFinancialGainSuggestion(
           body.data.projectCharterContext?.financialInformation,
           body.data.projectCharterContext?.businessContributionsQuantitative,
           pipeline.data.projectCharter.expectedSavings,
         ),
        businessCase: "Caso de negócio a validar pela equipe. Relacione a VOC, a meta e o escopo; qualquer impacto financeiro depende de confirmação com Financeiro.",
      },
      generatedCharter: {
        ...pipeline.data.generatedCharter,
         financialGainValue: createFinancialGainSuggestion(
           body.data.projectCharterContext?.financialInformation,
           body.data.projectCharterContext?.businessContributionsQuantitative,
           pipeline.data.generatedCharter.financialGainValue,
         ),
        businessContributions: createBusinessContributionSuggestion("summary"),
        businessContributionsQuantitative: createBusinessContributionSuggestion("quantitative"),
        businessContributionsQualitative: createBusinessContributionSuggestion("qualitative"),
      },
    };

    req.log.info("DMAIC pipeline generated");
    res.json(safePipeline);
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error
      ? { name: error.cause.name, message: error.cause.message }
      : undefined;
    req.log.error(
      {
        err: error,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        cause,
      },
      "Failed to generate DMAIC pipeline",
    );
    res.status(502).json({ error: "Ocorreu um erro ao gerar o pipeline. Tente novamente." });
  }
});

export default router;