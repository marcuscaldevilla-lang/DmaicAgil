import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dmaicWorkspaces } from "@workspace/db";
import {
  GetDmaicWorkspaceResponse,
  RunDmaicExploratoryDiagnosisBody,
  RunDmaicExploratoryDiagnosisResponse,
  RunDmaicPipelineBody,
  RunDmaicPipelineResponse,
  SaveDmaicWorkspaceBody,
} from "@workspace/api-zod";

const router: IRouter = Router();
const ACTIVE_WORKSPACE_KEY = "active-project";

const DMAIC_SYSTEM_PROMPT = `Você é um Master Black Belt especialista em Lean Seis Sigma e Scrum.
Crie artefatos acionáveis em português do Brasil para um projeto DMAIC Ágil.
Responda SOMENTE com JSON válido, sem markdown, seguindo exatamente esta estrutura:
{
  "generatedCharter":{"objective":"","history":"","goalDefinition":"","kpis":"","includedScope":"","excludedScope":"","assumptionsAndConstraints":"","customerRequirements":"","businessContributions":""},
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
Use de 2 a 4 itens por lista. Todos os valores devem ser strings. Em "generatedCharter", preencha todos os nove campos com sugestões diretamente derivadas do problema informado. Seja específico ao problema e realista, mas não invente dados apresentados como medidos; quando faltarem dados, formule hipóteses, limites e metas explicitamente como propostas para validação. Quando houver contexto de Project Charter fornecido pela equipe, trate-o como fonte prioritária e reaproveite seus termos, metas, responsáveis e limites.`;

const EXPLORATORY_SYSTEM_PROMPT = `Você é um Master Black Belt em Lean Six Sigma, com experiência em análise estatística aplicada.
Elabore um diagnóstico detalhado em português do Brasil sobre a série temporal e as estatísticas fornecidas.
Organize a resposta com os títulos: Resumo executivo, Comportamento ao longo do tempo, Variabilidade e distribuição, Normalidade, e Recomendações para o DMAIC.
Explique o que os dados sustentam e o que ainda precisa ser investigado, sem afirmar causalidade nem inventar fatos.
Use os valores numéricos informados para justificar as conclusões. Interprete o p-valor de Shapiro-Wilk com nível de significância de 5%: p >= 0,05 indica que não há evidência suficiente para rejeitar normalidade; p < 0,05 indica evidência de desvio da normalidade.
Considere que os gráficos e estatísticas podem conter todas as observações, enquanto a lista de pontos enviada pode ser uma amostra cronológica. Entregue 5 a 8 parágrafos completos, com recomendações acionáveis e perguntas para a próxima etapa. Não corte a resposta no meio de uma frase.`;

const DIAGNOSIS_WINDOW_MS = 10 * 60 * 1000;
const DIAGNOSIS_MAX_REQUESTS_PER_WINDOW = 6;
const diagnosisRequests = new Map<string, { count: number; windowStartedAt: number }>();

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
  };
}

function serializeWorkspace(row?: typeof dmaicWorkspaces.$inferSelect) {
  const now = new Date();
  if (!row) {
    return {
      projectKey: ACTIVE_WORKSPACE_KEY,
      hasSavedData: false,
      problemStatement: "",
      projectCharterContext: emptyCharterContext(),
      aiCharterSuggestions: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  return {
    projectKey: row.projectKey,
    hasSavedData: true,
    problemStatement: row.problemStatement,
    projectCharterContext: row.projectCharterContext,
    aiCharterSuggestions: row.aiCharterSuggestions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/dmaic/workspace", async (req, res): Promise<void> => {
  try {
    const [workspace] = await db
      .select()
      .from(dmaicWorkspaces)
      .where(eq(dmaicWorkspaces.projectKey, ACTIVE_WORKSPACE_KEY));
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

router.put("/dmaic/workspace", async (req, res): Promise<void> => {
  const body = SaveDmaicWorkspaceBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.flatten() }, "Invalid DMAIC workspace save request");
    res.status(400).json({ error: "Revise o problem statement e os campos do Project Charter." });
    return;
  }

  const projectCharterContext = {
    ...body.data.projectCharterContext,
    date: body.data.projectCharterContext.date.toISOString().slice(0, 10),
  };

  try {
    const [workspace] = await db
      .insert(dmaicWorkspaces)
      .values({
        projectKey: ACTIVE_WORKSPACE_KEY,
        problemStatement: body.data.problemStatement,
        projectCharterContext,
        aiCharterSuggestions: body.data.aiCharterSuggestions,
      })
      .onConflictDoUpdate({
        target: dmaicWorkspaces.projectKey,
        set: {
          problemStatement: body.data.problemStatement,
          projectCharterContext,
          aiCharterSuggestions: body.data.aiCharterSuggestions,
          updatedAt: new Date(),
        },
      })
      .returning();

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
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
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
        }),
      },
    );

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
    req.log.error({ error }, "Failed to generate exploratory diagnosis");
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
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
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
            maxOutputTokens: 8192,
          },
        }),
      },
    );

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

    req.log.info("DMAIC pipeline generated");
    res.json(pipeline.data);
  } catch (error) {
    req.log.error({ error }, "Failed to generate DMAIC pipeline");
    res.status(502).json({ error: "Ocorreu um erro ao gerar o pipeline. Tente novamente." });
  }
});

export default router;