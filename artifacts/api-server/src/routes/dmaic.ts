import { Router, type IRouter } from "express";
import {
  GetDmaicWorkspaceResponse,
  ListDmaicWorkspacesResponse,
  RunDmaicExploratoryDiagnosisBody,
  RunDmaicExploratoryDiagnosisResponse,
  RunDmaicPipelineBody,
  RunDmaicPipelineResponse,
  SaveDmaicWorkspaceBody,
} from "@workspace/api-zod";

export type DmaicWorkspaceRow = {
  projectKey: number;
  problemStatement: string;
  projectCharterContext: unknown;
  aiCharterSuggestions: unknown;
  analysisArtifacts: unknown;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DmaicWorkspaceWriteValues = Pick<
  DmaicWorkspaceRow,
  "problemStatement" | "projectCharterContext" | "aiCharterSuggestions"
> & {
  analysisArtifacts?: unknown;
};

export type DmaicWorkspaceRepository = {
  findByProjectKey: (projectKey: number) => Promise<DmaicWorkspaceRow | undefined>;
  findMostRecent: () => Promise<DmaicWorkspaceRow | undefined>;
  listWorkspaces: () => Promise<DmaicWorkspaceRow[]>;
  create: (values: DmaicWorkspaceWriteValues) => Promise<DmaicWorkspaceRow | undefined>;
  updateIfRevisionMatches: (
    projectKey: number,
    expectedRevision: number,
    values: DmaicWorkspaceWriteValues,
  ) => Promise<DmaicWorkspaceRow | undefined>;
};

const DMAIC_SYSTEM_PROMPT = `Você é um Master Black Belt especialista em Lean Seis Sigma e Scrum.
Crie artefatos acionáveis em português do Brasil para um projeto DMAIC Ágil.
Responda SOMENTE com JSON válido, sem markdown, seguindo exatamente esta estrutura:
{
  "generatedCharter":{"objective":"","history":"","goalDefinition":"","kpis":"","includedScope":"","excludedScope":"","assumptionsAndConstraints":"","customerRequirements":"","businessContributions":"","businessContributionsQuantitative":"","businessContributionsQualitative":"","financialGainValue":""},
  "projectCharter":{"projectTitle":"","problemStatement":"","businessCase":"","expectedSavings":""},
  "teamSetup":{"productOwner":"","scrumMaster":"","beltSquadMembers":""},
  "vocCtq":[{"vocNeed":"","clientType":"internal","client":"","sourceType":"reactive","source":"","directioner":"","ctq":"","ctp":"","measure":"","issue":"","ctqMetric":""}],
  "indicatorsY":{"primaryMetricY":"","operationalDefinition":"","targetGoal":"","baseline":""},
  "sipoc":[{"suppliers":"","inputs":"","process":"","outputs":"","customers":""}],
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
Use 1 ou 2 itens concisos por lista. Todos os valores devem ser strings. Para "sipoc", gere de 4 a 6 linhas, uma por macroetapa do processo em ordem; em cada linha, "process" é o nome da etapa e "suppliers"/"inputs"/"outputs"/"customers" trazem os itens daquela etapa específica (não do processo inteiro), cada campo podendo ter uma ou mais linhas separadas por quebra de linha quando houver mais de um item. Em "generatedCharter", preencha todos os doze campos com sugestões diretamente derivadas do problema informado e do contexto do Charter. Reescreva "goalDefinition" como uma meta SMART coerente com objetivo, KPIs, baseline, escopo, contribuições quantitativas e informações financeiras coletadas; não repita automaticamente uma meta antiga se os dados coletados apontarem outra. Quando houver resumo estatístico, use a mediana/média, a dispersão, quartis, IQR, normalidade e categorias como evidências explícitas para o baseline, a meta proposta e as contribuições. Diferencie o que foi observado nos dados do que é uma recomendação: estatísticas não confirmam uma meta, uma causa ou um ganho. Não invente causalidade, tendência, distribuição ou números ausentes; se não houver análise, declare que a linha de base estatística ainda precisa ser medida. Quando as informações financeiras trouxerem uma meta ideal e um prazo, aplique primeiro o teste estatístico de viabilidade abaixo: confronte a meta ideal com a média, a mediana, o desvio-padrão, os quartis/IQR e a amplitude observados no resumo estatístico. Se a meta ideal passar nesse teste (estiver dentro ou próxima da variação histórica), ela define a meta principal do projeto: escreva explicitamente a evolução do baseline até a meta ideal no prazo informado, em vez de manter a meta antiga como objetivo principal e citar a meta ideal apenas como visão futura. Se a meta ideal NÃO passar nesse teste — por exemplo, estiver fora do intervalo mínimo-máximo observado, exigir uma mudança muito maior do que a dispersão sustenta, ou distar da média por muitos desvios-padrão — declare explicitamente em "goalDefinition" e em "indicatorsY.targetGoal" que a meta desejada pode não ser estatisticamente alcançável apenas com o processo atual nas condições observadas, cite os valores numéricos (média, mediana, desvio-padrão ou amplitude) que sustentam essa avaliação, e proponha uma meta intermediária realista compatível com a evidência como meta principal do prazo informado; não descarte a meta ideal da empresa, apresente-a como visão de longo prazo condicionada a uma mudança estrutural no processo, a ser validada pela equipe. Essa verificação de viabilidade estatística tem prioridade sobre a regra anterior: nunca escreva a evolução do baseline direto até uma meta ideal que falhe no teste, mesmo que as informações financeiras a apresentem como definida pela empresa. Sem resumo estatístico, não afirme nem negue viabilidade estatística: diga apenas que a viabilidade ainda precisa ser avaliada com dados. Para "financialGainValue", calcule uma estimativa somente a partir dos números, moeda, período, volume, custo unitário, percentual e premissas explicitamente presentes em "businessContributionsQuantitative" e "financialInformation". Mostre a fórmula ou a lógica usada e deixe claro o período, a moeda e as premissas. Quando uma fórmula informar um ganho por ponto percentual acima de um limiar e o contexto informar uma meta acima desse limiar, calcule os pontos elegíveis como (meta - limiar), multiplique pelo ganho por ponto e pelo volume informado, e prorrogue proporcionalmente ao período informado; não descarte a conta apenas porque o baseline está abaixo do limiar. Por exemplo, uma fórmula de ganho acima de 75%, com meta de 90%, volume anual de 192.000 clientes e prazo de 6 meses, usa 15 pontos percentuais, 192 lotes de 1.000 clientes e metade do valor anual. Se a meta usada nessa conta for a mesma meta desejada/ideal que você classificou em "goalDefinition"/"indicatorsY.targetGoal" como estatisticamente além da variação histórica, calcule o valor principal de "financialGainValue" usando a meta intermediária realista (não a meta ideal ainda não sustentada pelos dados), deixe explícito que o valor usa a meta intermediária, e informe à parte — sem somar ao valor principal — que atingir a meta ideal completa representaria um ganho adicional apenas potencial, condicionado à mudança estrutural do processo e a validar com a equipe; nunca apresente o ganho da meta ideal ainda não sustentada como o valor calculado principal. Se os campos realmente não trouxerem dados suficientes para uma conta defensável, diga que não foi possível calcular e liste o dado faltante. Nunca invente valor, custo, volume, receita, economia, ROI ou payback, nem apresente estimativa como valor confirmado. O campo de informações financeiras coletadas é factual e pertence ao time, não à IA. As contribuições quantitativas, qualitativas e o ganho financeiro devem permanecer como propostas para validação; valores calculados devem ser validados com Financeiro. Seja específico ao problema e realista, sem afirmar como medidos dados que não foram informados. Quando houver contexto de Project Charter fornecido pela equipe, trate-o como fonte prioritária e reaproveite seus termos, metas, responsáveis, limites e informações financeiras coletadas. Para "vocCtq", gere 2 a 5 linhas específicas ao problema usando o Project Charter e o diagnóstico detalhado quando disponíveis. Cada linha deve separar: "clientType" como "internal" (cliente interno / Voz do Negócio) ou "external" (cliente externo / Voz do Consumidor); "client"; "sourceType" como "reactive" (reclamações, suporte, devoluções, relatórios ou registros existentes) ou "active" (pesquisa, entrevista, grupo focal ou observação planejada); "source"; "vocNeed" em linguagem da necessidade; "directioner" como requisito orientador; "ctq" como Critical to Quality; "ctp" como Critical to Process; e "measure" como medida operacional ou critério de aceitação. Use "issue" para resumir a dor observada e "ctqMetric" como cópia concisa da medida principal. Não invente falas de clientes, fontes coletadas, metas ou evidências: quando algo for inferido a partir do Charter ou diagnóstico, indique que é hipótese para validação da equipe.`;

const EXPLORATORY_SYSTEM_PROMPT = `Você é um Master Black Belt em Lean Six Sigma, com experiência em análise estatística aplicada.
Elabore um diagnóstico detalhado em português do Brasil sobre a série temporal e as estatísticas fornecidas.
Organize a resposta com os títulos: Resumo executivo, Comportamento ao longo do tempo, Variabilidade e distribuição, Normalidade, e Recomendações para o DMAIC.
Explique o que os dados sustentam e o que ainda precisa ser investigado, sem afirmar causalidade nem inventar fatos.
Use os valores numéricos informados para justificar as conclusões. Interprete o p-valor de Shapiro-Wilk com nível de significância de 5%: p >= 0,05 indica que não há evidência suficiente para rejeitar normalidade; p < 0,05 indica evidência de desvio da normalidade.
Considere que os gráficos e estatísticas podem conter todas as observações, enquanto a lista de pontos enviada pode ser uma amostra cronológica. Entregue 5 a 8 parágrafos completos, com recomendações acionáveis e perguntas para a próxima etapa. Não corte a resposta no meio de uma frase.`;

const DIAGNOSIS_WINDOW_MS = 10 * 60 * 1000;
const DIAGNOSIS_MAX_REQUESTS_PER_WINDOW = 6;
const MAX_ANALYSIS_ARTIFACT_BYTES = 3_000_000;
const MAX_PIPELINE_ANALYSIS_CONTEXT_BYTES = 80_000;
const diagnosisRequests = new Map<string, { count: number; windowStartedAt: number }>();
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const RETRYABLE_GEMINI_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const PIPELINE_ANALYSIS_CONTEXT_KEYS = new Set(["indicator", "analysisMonths", "indicatorSummary", "exploratoryStatistics", "diagnosis"]);
const PIPELINE_INDICATOR_SUMMARY_KEYS = new Set(["kind", "indicator", "rows", "mean", "median", "minimum", "maximum", "standardDeviation", "normality", "normalityDetail", "categoryCount", "topCategory", "topCategoryCount", "distribution"]);
const PIPELINE_EXPLORATORY_STATISTICS_KEYS = new Set(["count", "mean", "median", "minimum", "q1", "q3", "maximum", "iqr", "standardDeviation", "shapiroW", "shapiroPValue"]);
const PIPELINE_DISTRIBUTION_ITEM_KEYS = new Set(["label", "count", "percentage"]);

function completeDiagnosisText(value: string): string {
  const text = value.trim();
  if (/[.!?…]$/.test(text)) return text;
  const endings = [...text.matchAll(/[.!?…](?=\s|$)/g)];
  const lastEnding = endings.at(-1);
  return lastEnding && lastEnding.index !== undefined ? text.slice(0, lastEnding.index + 1).trim() : text;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKnownKeys(value: unknown, allowedKeys: Set<string>): value is Record<string, unknown> {
  return isPlainRecord(value) && Object.keys(value).every((key) => allowedKeys.has(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeDiagnosisForPipeline(value: string): string {
  return value
    .replace(/[-+]?\d+(?:[.,]\d+)?(?:\s*(?:%|pp|min|h|horas?|dias?|meses?))?/gi, "[valor estatístico]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function hasValidPipelineAnalysisContext(value: unknown): boolean {
  if (!hasOnlyKnownKeys(value, PIPELINE_ANALYSIS_CONTEXT_KEYS)) return false;
  const context = value;
  if (typeof context.indicator !== "string" || !context.indicator.trim() || !Number.isSafeInteger(context.analysisMonths) || (context.analysisMonths as number) < 1 || (context.analysisMonths as number) > 120) return false;
  if (!hasOnlyKnownKeys(context.indicatorSummary, PIPELINE_INDICATOR_SUMMARY_KEYS)) return false;
  const summary = context.indicatorSummary;
  if ((summary.kind !== "continuous" && summary.kind !== "discrete") || summary.indicator !== context.indicator || !Number.isSafeInteger(summary.rows) || (summary.rows as number) < 0) return false;
  if (context.diagnosis !== undefined && context.diagnosis !== null && (typeof context.diagnosis !== "string" || context.diagnosis.length > 2000)) return false;

  if (summary.kind === "continuous") {
    const requiredNumbers = ["mean", "median", "minimum", "maximum", "standardDeviation"];
    if (!requiredNumbers.every((key) => isFiniteNumber(summary[key]))) return false;
    if (typeof summary.normality !== "string" || typeof summary.normalityDetail !== "string") return false;
    if (!hasOnlyKnownKeys(context.exploratoryStatistics, PIPELINE_EXPLORATORY_STATISTICS_KEYS)) return false;
    const statistics = context.exploratoryStatistics;
    const statisticNumbers = ["count", "mean", "median", "minimum", "q1", "q3", "maximum", "iqr", "standardDeviation"];
    if (!statisticNumbers.every((key) => isFiniteNumber(statistics[key]))) return false;
    if (statistics.count !== summary.rows || statistics.mean !== summary.mean || statistics.median !== summary.median || statistics.minimum !== summary.minimum || statistics.maximum !== summary.maximum || statistics.standardDeviation !== summary.standardDeviation) return false;
    return true;
  }

  if (![summary.categoryCount, summary.topCategoryCount].every(isFiniteNumber) || typeof summary.topCategory !== "string") return false;
  if (summary.distribution !== undefined) {
    if (!Array.isArray(summary.distribution) || summary.distribution.length > 20) return false;
    if (!summary.distribution.every((item) => hasOnlyKnownKeys(item, PIPELINE_DISTRIBUTION_ITEM_KEYS) && typeof item.label === "string" && isFiniteNumber(item.count) && isFiniteNumber(item.percentage) && item.percentage >= 0 && item.percentage <= 100)) return false;
  }
  return context.exploratoryStatistics === undefined || context.exploratoryStatistics === null;
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
const FINANCIAL_VALIDATION_NOTICE = "Validação obrigatória com Financeiro antes de tratar o valor como confirmado.";

function normalizeGeneratedCharterSuggestions(
  suggestions: unknown,
  financialInformation: string | undefined,
  businessContributionsQuantitative: string | undefined,
) {
  if (!suggestions || typeof suggestions !== "object") return suggestions;
  const source = suggestions as Record<string, unknown>;
  return {
    ...source,
    businessContributions: normalizeBusinessContributionSuggestion(source.businessContributions, "summary"),
    businessContributionsQuantitative: normalizeBusinessContributionSuggestion(source.businessContributionsQuantitative, "quantitative"),
    businessContributionsQualitative: normalizeBusinessContributionSuggestion(source.businessContributionsQualitative, "qualitative"),
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
  const withoutRepeatedNotice = suggestion
    .replace(/\s*Validação obrigatória com(?: o setor)? Financeiro(?: antes de tratar o valor como confirmado)?\./gi, "")
    .trim();
  if (withoutRepeatedNotice.startsWith(FINANCIAL_ESTIMATE_PREFIX)) return `${withoutRepeatedNotice} ${FINANCIAL_VALIDATION_NOTICE}`;
  return `${FINANCIAL_ESTIMATE_PREFIX} (Contribuições quantitativas + Informações financeiras coletadas): ${withoutRepeatedNotice} ${FINANCIAL_VALIDATION_NOTICE}`;
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

function normalizeBusinessContributionSuggestion(
  value: unknown,
  kind: "summary" | "quantitative" | "qualitative",
): string {
  const suggestion = typeof value === "string" ? value.trim() : "";
  if (!suggestion) return createBusinessContributionSuggestion(kind);
  if (/valida(?:r|ção)|proposta da ia/i.test(suggestion)) return suggestion;
  return `${suggestion} Proposta da IA para validação com o time.`;
}

function textValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeVocCqt(value: unknown) {
  const source = isPlainRecord(value) ? value : {};
  const vocNeed = textValue(source.vocNeed ?? source.need, "Necessidade do cliente a validar com a equipe.");
  const issue = textValue(source.issue ?? source.observedIssue, "Dor do cliente a confirmar por fonte de voz.");
  const ctqMetric = textValue(source.ctqMetric ?? source.measure, "Medida principal a definir com o cliente.");
  const clientType = source.clientType === "external" ? "external" : "internal";
  const sourceType = source.sourceType === "active" ? "active" : "reactive";
  return {
    vocNeed,
    clientType,
    client: textValue(source.client ?? source.customer, "Cliente a identificar com o time."),
    sourceType,
    source: textValue(source.source, sourceType === "active" ? "Pesquisa, entrevista ou observação a planejar." : "Registro, reclamação ou suporte a confirmar."),
    directioner: textValue(source.directioner ?? source.requirement, "Requisito orientador a validar com o cliente."),
    ctq: textValue(source.ctq ?? source.criticalToQuality, ctqMetric),
    ctp: textValue(source.ctp ?? source.criticalToProcess, "Etapa do processo a definir e validar."),
    measure: textValue(source.measure ?? source.ctqMetric, ctqMetric),
    issue,
    ctqMetric,
  };
}

function isLegacyVocCqt(value: unknown): boolean {
  if (!isPlainRecord(value)) return false;
  const legacyFields = ["vocNeed", "issue", "ctqMetric"];
  return Object.keys(value).length === legacyFields.length
    && legacyFields.every((field) => typeof value[field] === "string");
}

const SIPOC_ROW_KEYS = ["suppliers", "inputs", "process", "outputs", "customers"] as const;

function isLegacySipoc(value: unknown): value is Record<typeof SIPOC_ROW_KEYS[number], unknown[]> {
  return isPlainRecord(value) && SIPOC_ROW_KEYS.every((key) => Array.isArray(value[key]));
}

function normalizeSipoc(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (!isLegacySipoc(value)) return value;
  const rowCount = Math.max(...SIPOC_ROW_KEYS.map((key) => value[key].length));
  if (!Number.isFinite(rowCount) || rowCount <= 0) return [];
  return Array.from({ length: rowCount }, (_, index) => Object.fromEntries(SIPOC_ROW_KEYS.map((key) => [key, String(value[key][index] ?? "")])));
}

function normalizePersistedPipeline(value: unknown) {
  if (!isPlainRecord(value)) return value;
  const vocCtq = Array.isArray(value.vocCtq) && value.vocCtq.length > 0 && value.vocCtq.every(isLegacyVocCqt) ? value.vocCtq.map(normalizeVocCqt) : value.vocCtq;
  return {
    ...value,
    vocCtq,
    sipoc: normalizeSipoc(value.sipoc),
  };
}

function normalizeAnalysisArtifacts(value: unknown) {
  if (!isPlainRecord(value)) return emptyAnalysisArtifacts();
  return {
    ...value,
    measurementDataset: value.measurementDataset ?? null,
    pipeline: value.pipeline ? normalizePersistedPipeline(value.pipeline) : null,
  };
}

function parseProjectKey(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const projectKey = Number(value);
  return Number.isSafeInteger(projectKey) ? projectKey : null;
}

function emptyAnalysisArtifacts() {
  return {
    version: 1,
    dataset: null,
    measurementDataset: null,
    analysisMonths: 12,
    selectedIndicator: "",
    indicatorAnalysis: null,
    exploratorySummary: null,
    diagnosis: null,
    diagnosisInput: null,
    pareto: [],
    imr: [],
    pipeline: null,
  };
}

function serializeWorkspace(row?: DmaicWorkspaceRow) {
  const now = new Date();
  if (!row) {
    return {
      projectKey: null,
      hasSavedData: false,
      problemStatement: "",
      projectCharterContext: emptyCharterContext(),
      aiCharterSuggestions: null,
      analysisArtifacts: emptyAnalysisArtifacts(),
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
       analysisArtifacts: normalizeAnalysisArtifacts(row.analysisArtifacts),
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeWorkspaceSummary(row: DmaicWorkspaceRow) {
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

export function createDmaicRouter(workspaceRepository: DmaicWorkspaceRepository): IRouter {
  const router: IRouter = Router();

router.get("/dmaic/workspace", async (req, res): Promise<void> => {
  const requestedProjectKey = req.query.projectKey;
  const projectKey = requestedProjectKey === undefined ? null : parseProjectKey(requestedProjectKey);
  if (requestedProjectKey !== undefined && !projectKey) {
    res.status(400).json({ error: "Informe um código de projeto numérico válido." });
    return;
  }

  try {
    const workspace = projectKey
      ? await workspaceRepository.findByProjectKey(projectKey)
      : await workspaceRepository.findMostRecent();
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
    const workspaces = await workspaceRepository.listWorkspaces();
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
  if (body.data.analysisArtifacts && Buffer.byteLength(JSON.stringify(body.data.analysisArtifacts), "utf8") > MAX_ANALYSIS_ARTIFACT_BYTES) {
    res.status(413).json({ error: "Os dados da análise excedem o limite de 3 MB. Reduza as colunas ou filtre o período do CSV antes de salvar." });
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
      analysisArtifacts: body.data.analysisArtifacts,
    };
    let workspace: DmaicWorkspaceRow | undefined;

    if (expectedRevision === 0) {
      workspace = await workspaceRepository.create({
        ...values,
        analysisArtifacts: values.analysisArtifacts ?? emptyAnalysisArtifacts(),
      });
    } else {
      workspace = await workspaceRepository.updateIfRevisionMatches(
        projectKey as number,
        expectedRevision,
        values,
      );
    }

    if (!workspace) {
      if (!projectKey) {
        req.log.error("DMAIC workspace insert did not return the generated project code");
        res.status(500).json({ error: "Não foi possível criar o projeto no Neon." });
        return;
      }
      const latestWorkspace = await workspaceRepository.findByProjectKey(projectKey);
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
  const rawAnalysisContext = isPlainRecord(req.body) ? req.body.analysisContext : undefined;
  if (body.data.analysisContext && !hasValidPipelineAnalysisContext(rawAnalysisContext)) {
    req.log.warn("Invalid DMAIC pipeline analysis context");
    res.status(400).json({ error: "O resumo estatístico está incompleto ou contém campos não permitidos." });
    return;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    req.log.error("GOOGLE_API_KEY is not configured");
    res.status(503).json({ error: "A integração Gemini ainda não está configurada." });
    return;
  }

  try {
    const analysisContext = body.data.analysisContext
      ? {
          ...body.data.analysisContext,
          diagnosis: body.data.analysisContext.diagnosis ? sanitizeDiagnosisForPipeline(body.data.analysisContext.diagnosis) : null,
        }
      : undefined;
    if (analysisContext && Buffer.byteLength(JSON.stringify(analysisContext), "utf8") > MAX_PIPELINE_ANALYSIS_CONTEXT_BYTES) {
      res.status(400).json({ error: "O resumo estatístico excede o limite permitido. Reduza o diagnóstico antes de gerar o pipeline." });
      return;
    }
    const analysisContextPrompt = analysisContext
      ? `\n\nResumo estatístico calculado localmente (evidência, não meta confirmada; não contém o CSV bruto):\n${JSON.stringify(analysisContext, null, 2)}`
      : "\n\nResumo estatístico: não há análise exploratória disponível. Não invente baseline, distribuição ou evidência numérica.";
    const response = await requestGemini(apiKey, {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${DMAIC_SYSTEM_PROMPT}\n\nProblema do projeto:\n${body.data.problemStatement}\n\nContexto preenchido no Project Charter:\n${body.data.projectCharterContext ? JSON.stringify(body.data.projectCharterContext, null, 2) : "Nenhum contexto adicional foi preenchido."}${analysisContextPrompt}`,
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
    if (pipeline.data.vocCtq.length < 2 || pipeline.data.vocCtq.length > 5) {
      req.log.error({ count: pipeline.data.vocCtq.length }, "Gemini returned an invalid number of VOC/CTQ rows");
      res.status(502).json({ error: "O mapa VOC/CTQ retornou uma quantidade inválida de linhas. Tente novamente." });
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
         businessContributions: normalizeBusinessContributionSuggestion(pipeline.data.generatedCharter.businessContributions, "summary"),
         businessContributionsQuantitative: normalizeBusinessContributionSuggestion(pipeline.data.generatedCharter.businessContributionsQuantitative, "quantitative"),
         businessContributionsQualitative: normalizeBusinessContributionSuggestion(pipeline.data.generatedCharter.businessContributionsQualitative, "qualitative"),
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

  return router;
}