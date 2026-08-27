import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDmaicWorkspace, type DmaicAnalysisArtifacts, type DmaicCharter, type DmaicExploratoryDiagnosisInput, type DmaicPipeline, type DmaicPipelineAnalysisContext, type DmaicSipoc, type DmaicSipocRow, type DmaicVocCqt, type DmaicWorkspace, type DmaicWorkspaceSummary, useGetDmaicWorkspace, useListDmaicWorkspaces, useRunDmaicExploratoryDiagnosis, useRunDmaicPipeline, useSaveDmaicWorkspace } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CloudUpload,
  Database,
  FileBarChart,
  FileText,
  FolderOpen,
  Gauge,
  GitBranch,
  Info,
  Layers3,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Network,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TestTube2,
  Upload,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type Area = 'overview' | 'definition' | 'measurement' | 'aic';
type Tool = { id: string; title: string; subtitle: string; icon: LucideIcon; status: string; tag?: string; accent: string };
type CharterTeamRole = 'leader' | 'sponsor' | 'teamMembers' | 'technicalSupport';
type CharterTeamMember = { name: string; position: string; areaCompany: string };
type ProjectCharterDraft = {
  projectName: string;
  client: string;
  area: string;
  leader: string;
  sponsor: string;
  date: string;
  objective: string;
  history: string;
  goalDefinition: string;
  kpis: string;
  includedScope: string;
  excludedScope: string;
  assumptionsAndConstraints: string;
  team: Record<CharterTeamRole, CharterTeamMember>;
  customerRequirements: string;
  businessContributions: string;
  businessContributionsQuantitative: string;
  businessContributionsQualitative: string;
  financialGainValue: string;
  financialInformation: string;
};
type CharterTextField = Exclude<keyof ProjectCharterDraft, 'team'>;
type ProjectCharterContext = Omit<ProjectCharterDraft, 'team'> & { team: Array<CharterTeamMember & { role: string }> };
type GeneratedCharterFields = Pick<ProjectCharterDraft, 'objective' | 'history' | 'goalDefinition' | 'kpis' | 'includedScope' | 'excludedScope' | 'assumptionsAndConstraints' | 'customerRequirements' | 'businessContributions' | 'businessContributionsQuantitative' | 'businessContributionsQualitative' | 'financialGainValue'>;
type WorkspaceSaveSource = 'statement' | 'charter' | 'suggestions' | 'voc' | 'sipoc';
type WorkspaceSaveData = { projectKey?: number; problemStatement: string; projectCharterContext: ProjectCharterContext; aiCharterSuggestions: GeneratedCharterFields | null; analysisArtifacts: DmaicAnalysisArtifacts };
type WorkspaceSaveAttempt = { source: WorkspaceSaveSource; data: WorkspaceSaveData; charterToPersist?: ProjectCharterDraft; expectedRevision?: number };
type WorkspaceLocalDraft = {
  version: 1;
  savedAt: string;
  baseRevision: number;
  projectKey: number | null;
  statement: string;
  charter: ProjectCharterDraft;
  confirmedCharter: ProjectCharterDraft;
  aiCharterSuggestions: GeneratedCharterFields | null;
  analysisArtifacts: DmaicAnalysisArtifacts;
};
type InputDataset = { fileName: string; headers: string[]; rows: Record<string, string>[]; dateColumn: string | null; indicatorColumns: string[] };
type ContinuousAnalysis = { kind: 'continuous'; indicator: string; rows: number; values: number[]; mean: number; median: number; minimum: number; maximum: number; standardDeviation: number; normality: string; normalityDetail: string };
type DiscreteAnalysis = { kind: 'discrete'; indicator: string; rows: number; categoryCount: number; topCategory: string; topCategoryCount: number; distribution: { label: string; count: number; percentage: number }[] };
type IndicatorAnalysis = ContinuousAnalysis | DiscreteAnalysis;
type ExploratoryPoint = { period: string; value: number };
type ExploratorySummary = { points: ExploratoryPoint[]; minimum: number; q1: number; median: number; q3: number; maximum: number; iqr: number; mean: number; standardDeviation: number; shapiroW: number | null; shapiroPValue: number | null; shapiroDetail: string };
const DIAGNOSIS_POINT_LIMIT = 240;
const PIPELINE_CATEGORY_LIMIT = 20;
const MAX_PERSISTED_CSV_ROWS = 10_000;
const MAX_PERSISTED_CSV_CHARACTERS = 1_500_000;
const MAX_PERSISTED_CSV_COLUMNS = 100;
const MAX_PERSISTED_CSV_CELL_CHARACTERS = 4_000;
const MAX_ANALYSIS_ARTIFACT_BYTES = 3_000_000;
const WORKSPACE_DRAFT_STORAGE_KEY = 'dmaic-agil-suite.workspace-draft.v1';
const DEFAULT_PROBLEM_STATEMENT = 'O tempo entre a entrada da solicitação e a aprovação do crédito varia de 8 a 31 minutos, gerando retrabalho e previsibilidade baixa para as agências no fechamento do mês.';
const charterTextFields = ['projectName', 'client', 'area', 'leader', 'sponsor', 'date', 'objective', 'history', 'goalDefinition', 'kpis', 'includedScope', 'excludedScope', 'assumptionsAndConstraints', 'customerRequirements', 'businessContributions', 'businessContributionsQuantitative', 'businessContributionsQualitative', 'financialGainValue', 'financialInformation'] as const satisfies readonly CharterTextField[];
const legacyCharterTextFields = ['projectName', 'client', 'area', 'leader', 'sponsor', 'date', 'objective', 'history', 'goalDefinition', 'kpis', 'includedScope', 'excludedScope', 'assumptionsAndConstraints', 'customerRequirements', 'businessContributions'] as const;
const generatedCharterFields = ['objective', 'history', 'goalDefinition', 'kpis', 'includedScope', 'excludedScope', 'assumptionsAndConstraints', 'customerRequirements', 'businessContributions', 'businessContributionsQuantitative', 'businessContributionsQualitative', 'financialGainValue'] as const satisfies readonly (keyof GeneratedCharterFields)[];
const legacyGeneratedCharterFields = ['objective', 'history', 'goalDefinition', 'kpis', 'includedScope', 'excludedScope', 'assumptionsAndConstraints', 'customerRequirements', 'businessContributions'] as const;
const CHARTER_FIELD_LABELS: Record<CharterTextField, string> = {
  projectName: 'Projeto',
  client: 'Cliente',
  area: 'Área',
  leader: 'Líder',
  sponsor: 'Patrocinador',
  date: 'Data',
  objective: 'Objetivo do projeto',
  history: 'Justificativa / histórico',
  goalDefinition: 'Definição da meta',
  kpis: 'KPIs',
  includedScope: 'Limites do projeto — inclui',
  excludedScope: 'Limites do projeto — exclui',
  assumptionsAndConstraints: 'Premissas e restrições do projeto',
  customerRequirements: 'Requisitos do cliente',
  businessContributions: 'Contribuições para o negócio — resumo',
  businessContributionsQuantitative: 'Contribuições quantitativas',
  businessContributionsQualitative: 'Contribuições qualitativas',
  financialGainValue: 'Valor do ganho financeiro esperado',
  financialInformation: 'Informações financeiras coletadas',
};
const CHARTER_TEAM_ROLE_LABELS: Record<CharterTeamRole, string> = {
  leader: 'Líder',
  sponsor: 'Patrocinador',
  teamMembers: 'Membros da equipe',
  technicalSupport: 'Especialistas para suporte técnico',
};
const AI_PROJECT_CHARTER_PREVIEW_LABELS: Record<keyof DmaicCharter, string> = {
  projectTitle: 'Título',
  problemStatement: 'Definição do Problema',
  businessCase: 'Business Case',
  expectedSavings: 'Ganhos Esperados',
};

const createEmptyAnalysisArtifacts = (): DmaicAnalysisArtifacts => ({
  version: 1,
  dataset: null,
  analysisMonths: 12,
  selectedIndicator: '',
  indicatorAnalysis: null,
  exploratorySummary: null,
  diagnosis: null,
  diagnosisInput: null,
  pipelineAnalysisContext: null,
  pareto: [],
  imr: [],
  pipeline: null,
  manualVocCtq: [],
});

function parseAnalysisArtifacts(value: unknown): DmaicAnalysisArtifacts {
  if (!isObject(value) || value.version !== 1 || !('dataset' in value) || !('analysisMonths' in value) || !('selectedIndicator' in value)) return createEmptyAnalysisArtifacts();
  return {
    ...value,
    pipeline: normalizePipelineSnapshot(value.pipeline),
    manualVocCtq: parseManualVocRows(value.manualVocCtq),
  } as unknown as DmaicAnalysisArtifacts;
}

function analysisArtifactsSizeInBytes(artifacts: DmaicAnalysisArtifacts): number {
  return new TextEncoder().encode(JSON.stringify(artifacts)).byteLength;
}

function getWorkspaceConflict(error: unknown): DmaicWorkspace | null {
  if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 409 || !('data' in error)) return null;
  const data = error.data;
  if (!data || typeof data !== 'object' || !('latestWorkspace' in data)) return null;
  const latestWorkspace = data.latestWorkspace;
  if (!latestWorkspace || typeof latestWorkspace !== 'object' || !('revision' in latestWorkspace) || typeof latestWorkspace.revision !== 'number') return null;
  return latestWorkspace as unknown as DmaicWorkspace;
}

const createProjectCharterDraft = (): ProjectCharterDraft => ({
  projectName: '',
  client: '',
  area: 'Operação',
  leader: '',
  sponsor: '',
  date: new Date().toISOString().slice(0, 10),
  objective: '',
  history: '',
  goalDefinition: '',
  kpis: 'NS atendimento',
  includedScope: '',
  excludedScope: '',
  assumptionsAndConstraints: '',
  team: {
    leader: { name: '', position: '', areaCompany: '' },
    sponsor: { name: '', position: '', areaCompany: '' },
    teamMembers: { name: '', position: '', areaCompany: '' },
    technicalSupport: { name: '', position: '', areaCompany: '' },
  },
  customerRequirements: '',
  businessContributions: '',
  businessContributionsQuantitative: '',
  businessContributionsQualitative: '',
  financialGainValue: '',
  financialInformation: '',
});

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseManualVocRows(value: unknown): DmaicVocCqt[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is DmaicVocCqt => isObject(row)
    && (row.clientType === 'internal' || row.clientType === 'external')
    && (row.sourceType === 'reactive' || row.sourceType === 'active')
    && ['vocNeed', 'client', 'source', 'directioner', 'ctq', 'ctp', 'measure', 'issue', 'ctqMetric'].every((field) => typeof row[field] === 'string'));
}

function toVocText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeVocSnapshot(value: unknown): DmaicVocCqt {
  const source = isObject(value) ? value : {};
  const vocNeed = toVocText(source.vocNeed, 'Necessidade do cliente a validar com a equipe.');
  const ctqMetric = toVocText(source.ctqMetric ?? source.measure, 'Medida principal a definir com o cliente.');
  const sourceType = source.sourceType === 'active' ? 'active' : 'reactive';
  return {
    vocNeed,
    clientType: source.clientType === 'external' ? 'external' : 'internal',
    client: toVocText(source.client, 'Cliente a identificar com o time.'),
    sourceType,
    source: toVocText(source.source, sourceType === 'active' ? 'Pesquisa, entrevista ou observação a planejar.' : 'Registro, reclamação ou suporte a confirmar.'),
    directioner: toVocText(source.directioner, 'Requisito orientador a validar com o cliente.'),
    ctq: toVocText(source.ctq, ctqMetric),
    ctp: toVocText(source.ctp, 'Etapa do processo a definir e validar.'),
    measure: toVocText(source.measure ?? source.ctqMetric, ctqMetric),
    issue: toVocText(source.issue, 'Dor do cliente a confirmar por fonte de voz.'),
    ctqMetric,
  };
}

function isLegacyVocSnapshot(value: unknown): boolean {
  if (!isObject(value)) return false;
  const legacyFields = ['vocNeed', 'issue', 'ctqMetric'];
  return Object.keys(value).length === legacyFields.length && legacyFields.every((field) => typeof value[field] === 'string');
}

const SIPOC_ROW_KEYS = ['suppliers', 'inputs', 'process', 'outputs', 'customers'] as const;

function isLegacySipocSnapshot(value: unknown): value is Record<typeof SIPOC_ROW_KEYS[number], unknown[]> {
  return isObject(value) && !Array.isArray(value) && SIPOC_ROW_KEYS.every((key) => Array.isArray((value as Record<string, unknown>)[key]));
}

function normalizeSipocSnapshot(value: unknown): DmaicSipoc | null {
  if (Array.isArray(value)) return value as DmaicSipoc;
  if (!isLegacySipocSnapshot(value)) return null;
  const rowCount = Math.max(...SIPOC_ROW_KEYS.map((key) => value[key].length));
  if (!Number.isFinite(rowCount) || rowCount <= 0) return [];
  return Array.from({ length: rowCount }, (_, index) => Object.fromEntries(SIPOC_ROW_KEYS.map((key) => [key, String(value[key][index] ?? '')])) as unknown as DmaicSipocRow);
}

function normalizePipelineSnapshot(value: unknown): DmaicPipeline | null {
  if (!isObject(value)) return null;
  const vocCtq = Array.isArray(value.vocCtq) && value.vocCtq.length > 0 && value.vocCtq.every(isLegacyVocSnapshot) ? value.vocCtq.map(normalizeVocSnapshot) : value.vocCtq;
  const sipoc = normalizeSipocSnapshot(value.sipoc);
  return { ...value, vocCtq, ...(sipoc !== null ? { sipoc } : {}) } as unknown as DmaicPipeline;
}

const manualVocRequiredFields = ['vocNeed', 'client', 'source', 'directioner', 'ctq', 'ctp', 'measure', 'ctqMetric'] as const;
const manualVocFieldLabels: Record<typeof manualVocRequiredFields[number], string> = {
  vocNeed: 'necessidade',
  client: 'cliente',
  source: 'fonte',
  directioner: 'direcionador',
  ctq: 'CTQ',
  ctp: 'CTP',
  measure: 'medida/aceitação',
  ctqMetric: 'métrica de referência',
};

function createManualVocRow(): DmaicVocCqt {
  return {
    vocNeed: '',
    clientType: 'internal',
    client: '',
    sourceType: 'reactive',
    source: '',
    directioner: '',
    ctq: '',
    ctp: '',
    measure: '',
    issue: '',
    ctqMetric: '',
  };
}

function getManualVocValidationMessage(row: DmaicVocCqt): string | null {
  const missing = manualVocRequiredFields.filter((field) => !row[field].trim());
  return missing.length ? `Preencha ${missing.map((field) => manualVocFieldLabels[field]).join(', ')} antes de salvar.` : null;
}

function parseCharterTeamMember(value: unknown): CharterTeamMember | null {
  if (!isObject(value) || typeof value.name !== 'string' || typeof value.position !== 'string' || typeof value.areaCompany !== 'string') return null;
  return { name: value.name, position: value.position, areaCompany: value.areaCompany };
}

function parseProjectCharterDraft(value: unknown): ProjectCharterDraft | null {
  if (!isObject(value) || !isObject(value.team)) return null;
  const textValues = {} as Record<CharterTextField, string>;
  for (const field of charterTextFields) {
    if (typeof value[field] === 'string') {
      textValues[field] = value[field];
      continue;
    }
    if (legacyCharterTextFields.includes(field as typeof legacyCharterTextFields[number])) return null;
    textValues[field] = '';
  }
  const leader = parseCharterTeamMember(value.team.leader);
  const sponsor = parseCharterTeamMember(value.team.sponsor);
  const teamMembers = parseCharterTeamMember(value.team.teamMembers);
  const technicalSupport = parseCharterTeamMember(value.team.technicalSupport);
  if (!leader || !sponsor || !teamMembers || !technicalSupport) return null;
  return { ...textValues, team: { leader, sponsor, teamMembers, technicalSupport } };
}

function parseGeneratedCharterFields(value: unknown): GeneratedCharterFields | null {
  if (value === null) return null;
  if (!isObject(value)) return null;
  const fields = {} as GeneratedCharterFields;
  for (const field of generatedCharterFields) {
    if (typeof value[field] === 'string') {
      fields[field] = value[field];
      continue;
    }
    if (legacyGeneratedCharterFields.includes(field as typeof legacyGeneratedCharterFields[number])) return null;
    fields[field] = '';
  }
  return fields;
}

function readWorkspaceLocalDraft(): WorkspaceLocalDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || value.version !== 1 || typeof value.savedAt !== 'string' || typeof value.baseRevision !== 'number' || !Number.isSafeInteger(value.baseRevision) || value.baseRevision < 0 || typeof value.statement !== 'string') return null;
    const projectKey = value.projectKey === undefined || value.projectKey === null
      ? null
      : typeof value.projectKey === 'number' && Number.isSafeInteger(value.projectKey) && value.projectKey > 0
        ? value.projectKey
        : null;
    const charter = parseProjectCharterDraft(value.charter);
    const confirmedCharter = parseProjectCharterDraft(value.confirmedCharter);
    const aiCharterSuggestions = parseGeneratedCharterFields(value.aiCharterSuggestions);
    return charter && confirmedCharter ? { version: 1, savedAt: value.savedAt, baseRevision: value.baseRevision, projectKey, statement: value.statement, charter, confirmedCharter, aiCharterSuggestions, analysisArtifacts: parseAnalysisArtifacts(value.analysisArtifacts) } : null;
  } catch {
    return null;
  }
}

function storeWorkspaceLocalDraft(draft: WorkspaceLocalDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKSPACE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Browsers can block local storage. The explicit Neon save remains available.
  }
}

const toProjectCharterContext = (charter: ProjectCharterDraft): ProjectCharterContext => ({
  ...charter,
  team: [
    { role: 'Líder', ...charter.team.leader },
    { role: 'Patrocinador', ...charter.team.sponsor },
    { role: 'Membros da equipe', ...charter.team.teamMembers },
    { role: 'Especialistas para suporte técnico', ...charter.team.technicalSupport },
  ],
});

const toProjectCharterDraft = (context: ProjectCharterContext): ProjectCharterDraft => {
  const memberByRole = new Map(context.team.map((member) => [member.role, member]));
  const getMember = (role: string): CharterTeamMember => {
    const member = memberByRole.get(role);
    return member ? { name: member.name, position: member.position, areaCompany: member.areaCompany } : { name: '', position: '', areaCompany: '' };
  };
  return {
    ...context,
    date: context.date.slice(0, 10),
    team: {
      leader: getMember('Líder'),
      sponsor: getMember('Patrocinador'),
      teamMembers: getMember('Membros da equipe'),
      technicalSupport: getMember('Especialistas para suporte técnico'),
    },
  };
};

const workspaceToLocalDraft = (workspace: DmaicWorkspace): WorkspaceLocalDraft => {
  const confirmedCharter = toProjectCharterDraft(workspace.projectCharterContext);
  const aiCharterSuggestions = workspace.aiCharterSuggestions;
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    baseRevision: workspace.revision,
    projectKey: workspace.projectKey,
    statement: workspace.problemStatement,
    charter: aiCharterSuggestions ? applyGeneratedCharterFields(confirmedCharter, aiCharterSuggestions) : confirmedCharter,
    confirmedCharter,
    aiCharterSuggestions,
    analysisArtifacts: workspace.analysisArtifacts,
  };
};

const applyGeneratedCharterFields = (charter: ProjectCharterDraft, generated: GeneratedCharterFields): ProjectCharterDraft => ({
  ...charter,
  ...generated,
  businessContributionsQuantitative: charter.businessContributionsQuantitative,
  financialInformation: charter.financialInformation,
});

const areaMeta: Record<Area, { label: string; kicker: string; description: string; color: string }> = {
  overview: { label: 'Visão geral', kicker: 'Command center', description: 'Onde o problema ganha forma, ritmo e dono.', color: 'hsl(var(--primary))' },
  definition: { label: 'Sprint 1 · Definição', kicker: 'Frame the signal', description: 'Alinhe o problema antes de procurar respostas.', color: 'hsl(var(--accent))' },
  measurement: { label: 'Sprint 2 · Medição', kicker: 'Trust the numbers', description: 'Transforme variação em evidência operacional.', color: 'hsl(var(--chart-3))' },
  aic: { label: 'Sprint 3+ · A-I-C', kicker: 'Move the system', description: 'Teste, implemente e sustente a melhoria.', color: 'hsl(var(--chart-4))' },
};

const navGroups = [
  {
    label: 'Ritmo DMAIC',
    items: [
      { id: 'overview' as Area, label: 'Visão geral', icon: LayoutDashboard },
      { id: 'definition' as Area, label: 'Sprint 1 · Definição', icon: Target },
      { id: 'measurement' as Area, label: 'Sprint 2 · Medição', icon: Gauge },
      { id: 'aic' as Area, label: 'Sprint 3+ · A-I-C', icon: GitBranch },
    ],
  },
  {
    label: 'Biblioteca de métodos',
    items: [
      { id: 'charter' as const, label: 'Charter & VOC', icon: ClipboardList },
      { id: 'analysis' as const, label: 'Análises', icon: BarChart3 },
      { id: 'control' as const, label: 'Controle', icon: ShieldCheck },
    ],
  },
];

const tools: Record<Area, Tool[]> = {
  overview: [],
  definition: [
    { id: 'charter', title: 'Project charter', subtitle: 'O contrato de foco do time', icon: ClipboardList, status: 'Pronto', tag: 'Exemplo', accent: 'var(--accent)' },
    { id: 'voc', title: 'VOC → CTQ', subtitle: 'Escute e traduza a demanda', icon: Network, status: '6 linhas', accent: 'var(--chart-3)' },
    { id: 'sipoc', title: 'SIPOC visual', subtitle: 'O sistema antes do detalhe', icon: Layers3, status: 'Rascunho', accent: 'var(--primary)' },
  ],
  measurement: [
    { id: 'msa', title: 'MSA validation', subtitle: 'A medida merece confiança?', icon: TestTube2, status: 'Validado', accent: 'var(--primary)' },
    { id: 'pareto', title: 'Pareto de defeitos', subtitle: 'Mostre onde está o peso', icon: BarChart3, status: 'Aguardando CSV', tag: 'Local', accent: 'var(--accent)' },
    { id: 'imr', title: 'I-MR chart', subtitle: 'Encontre sinais na sequência', icon: Activity, status: 'Aguardando CSV', tag: 'Local', accent: 'var(--chart-3)' },
    { id: 'vitalx', title: 'Vital X breakdown', subtitle: 'Do Y ao fator controlável', icon: Zap, status: '3 hipóteses', accent: 'var(--chart-4)' },
  ],
  aic: [
    { id: 'causes', title: '6M + matriz causa-efeito', subtitle: 'Organize o conhecimento do time', icon: GitBranch, status: '12 causas', accent: 'var(--chart-4)' },
    { id: 'gut', title: 'Priorização GUT', subtitle: 'Decida com critério explícito', icon: ClipboardCheck, status: 'Top 5', accent: 'var(--accent)' },
    { id: 'solutions', title: 'Solutions tree', subtitle: 'Hipótese vira experimento', icon: Sparkles, status: '4 caminhos', accent: 'var(--primary)' },
    { id: 'control-plan', title: 'Controle & SOP', subtitle: 'Faça a melhora sobreviver', icon: ShieldCheck, status: 'Em revisão', accent: 'var(--chart-3)' },
  ],
};

const vitalXs = [
  { id: 'x1', label: 'Tempo de espera', value: '18,4 min', delta: '-11,8%', note: 'Mais sensível ao Y' },
  { id: 'x2', label: 'Acuracidade de triagem', value: '82,6%', delta: '+4,2 pp', note: 'Estável há 3 ciclos' },
  { id: 'x3', label: 'Carga por operador', value: '14,2/h', delta: '+8,6%', note: 'Sinal de atenção' },
];

const initialPareto = [
  { name: 'Documentação incompleta', value: 38 },
  { name: 'Dado divergente', value: 27 },
  { name: 'Aprovação pendente', value: 18 },
  { name: 'Fila de integração', value: 11 },
  { name: 'Outros', value: 6 },
];

const initialImr = [42, 45, 43, 49, 46, 44, 47, 51, 50, 54, 48, 52, 53, 55, 51, 49, 56, 58, 54, 57, 60, 55, 53, 59];

const formatMetric = (value: number) => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(rounded);
};

function detectCsvDelimiter(text: string): string {
  const candidates = [';', ',', '\t'];
  const counts = new Map(candidates.map((delimiter) => [delimiter, 0]));
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && (character === '\n' || character === '\r')) break;
    if (!quoted && counts.has(character)) counts.set(character, (counts.get(character) ?? 0) + 1);
  }
  const detected = candidates.map((delimiter) => ({ delimiter, count: counts.get(delimiter) ?? 0 })).sort((left, right) => right.count - left.count)[0];
  if (!detected || detected.count < 1) throw new Error('Não foi possível identificar o separador do CSV. Use vírgula, ponto e vírgula ou tabulação.');
  return detected.delimiter;
}

function parseCsvRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;
  let fieldWasQuoted = false;
  const finishField = () => {
    record.push(field.trim());
    field = '';
    closedQuote = false;
    fieldWasQuoted = false;
  };
  const finishRecord = () => {
    if (record.length === 0 && field === '' && !fieldWasQuoted) return;
    finishField();
    records.push(record);
    record = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else if (character === '\r' && text[index + 1] === '\n') {
        field += '\n';
        index += 1;
      } else {
        field += character;
      }
      continue;
    }
    if (closedQuote) {
      if (character === delimiter) {
        finishField();
      } else if (character === '\n') {
        finishRecord();
      } else if (character === '\r') {
        if (text[index + 1] === '\n') index += 1;
        finishRecord();
      } else {
        throw new Error('Há texto após uma aspa de fechamento. Confira as aspas do CSV.');
      }
      continue;
    }
    if (character === '"') {
      if (field !== '') throw new Error('Há aspas fora do início de um campo. Confira as aspas do CSV.');
      quoted = true;
      fieldWasQuoted = true;
    } else if (character === delimiter) {
      finishField();
    } else if (character === '\n') {
      finishRecord();
    } else if (character === '\r') {
      if (text[index + 1] === '\n') index += 1;
      finishRecord();
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('Há aspas não fechadas no CSV. Corrija o arquivo antes de continuar.');
  if (record.length > 0 || field !== '' || fieldWasQuoted || closedQuote) finishRecord();
  return records;
}

function parseNumericValue(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(/^R\$/i, '').replace(/%$/, '');
  if (!normalized) return null;
  let numberValue: number;
  if (normalized.includes(',')) {
    if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d+$/.test(normalized)) return null;
    numberValue = Number(normalized.replace(/\./g, '').replace(',', '.'));
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    numberValue = Number(normalized.replace(/\./g, ''));
  } else if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    numberValue = Number(normalized);
  } else {
    return null;
  }
  return Number.isFinite(numberValue) ? numberValue : null;
}

function validUtcDate(year: number, month: number, day = 1): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

function parseDateValue(value: string): Date | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const yearMonth = normalized.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonth) return validUtcDate(Number(yearMonth[1]), Number(yearMonth[2]));
  const isoDate = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoDate) return validUtcDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
  const brazilian = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (brazilian) {
    const year = Number(brazilian[3]) < 100 ? Number(brazilian[3]) + 2000 : Number(brazilian[3]);
    return validUtcDate(year, Number(brazilian[2]), Number(brazilian[1]));
  }
  return null;
}

function parseInputCsv(text: string, fileName: string): InputDataset {
  if (text.length > MAX_PERSISTED_CSV_CHARACTERS) throw new Error('Este CSV excede o limite de 1,5 MB para salvar a análise no projeto. Reduza as colunas ou filtre o período antes do upload.');
  const delimiter = detectCsvDelimiter(text);
  const records = parseCsvRecords(text, delimiter);
  if (records.length < 2) throw new Error('O CSV precisa ter cabeçalho e pelo menos uma linha de dados.');
  if (records.length - 1 > MAX_PERSISTED_CSV_ROWS) throw new Error(`Este CSV tem mais de ${MAX_PERSISTED_CSV_ROWS.toLocaleString('pt-BR')} linhas. Filtre ou agregue os dados antes do upload para que a análise possa ser salva.`);
  const headers = records[0].map((header, index) => header || `Coluna ${index + 1}`);
  if (headers.length > MAX_PERSISTED_CSV_COLUMNS) throw new Error(`Este CSV tem mais de ${MAX_PERSISTED_CSV_COLUMNS} colunas. Mantenha somente os campos necessários para a análise.`);
  if (headers.some((header) => header.length > 255)) throw new Error('Um cabeçalho do CSV excede 255 caracteres. Renomeie as colunas antes do upload.');
  const rows = records.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`O registro ${index + 2} tem ${values.length} campos, mas o cabeçalho tem ${headers.length}. Confira o separador e as aspas do CSV.`);
    }
    if (values.some((value) => value.length > MAX_PERSISTED_CSV_CELL_CHARACTERS)) throw new Error(`O registro ${index + 2} possui um campo muito longo para ser salvo na análise.`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
  const dateColumn = headers.find((header) => {
    const normalized = header.toLowerCase();
    const namedDate = /data|date|mês|mes|month|período|period/.test(normalized);
    const validDates = rows.filter((row) => parseDateValue(row[header]) !== null).length;
    return validDates / rows.length >= 0.7 && (namedDate || validDates / rows.length >= 0.9);
  }) ?? null;
  const indicatorColumns = headers.filter((header) => header !== dateColumn && rows.some((row) => row[header] !== ''));
  if (indicatorColumns.length === 0) throw new Error('Não encontrei colunas de indicadores no CSV.');
  return { fileName, headers, rows, dateColumn, indicatorColumns };
}

function isContinuousIndicator(dataset: InputDataset, indicator: string): boolean {
  const values = dataset.rows.map((row) => row[indicator]).filter(Boolean);
  const numeric = values.map(parseNumericValue).filter((value): value is number => value !== null);
  const normalized = indicator.toLowerCase();
  const discreteHint = /id|código|codigo|categoria|tipo|status|flag|classe|class|faixa/.test(normalized);
  return !discreteHint && numeric.length >= 2 && numeric.length / Math.max(values.length, 1) >= 0.8;
}

function rowsForLastMonths(dataset: InputDataset, months: number): Record<string, string>[] {
  if (!dataset.dateColumn) return dataset.rows;
  const datedRows = dataset.rows
    .map((row) => ({ row, date: parseDateValue(row[dataset.dateColumn as string]) }))
    .filter((entry): entry is { row: Record<string, string>; date: Date } => entry.date !== null);
  if (!datedRows.length) return dataset.rows;
  const latest = new Date(Math.max(...datedRows.map((entry) => entry.date.getTime())));
  const cutoff = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - Math.max(months, 1) + 1, 1));
  return datedRows.filter((entry) => entry.date >= cutoff).sort((left, right) => left.date.getTime() - right.date.getTime()).map((entry) => entry.row);
}

function summarizeIndicator(dataset: InputDataset, indicator: string, months: number): IndicatorAnalysis | null {
  if (!indicator || !dataset.indicatorColumns.includes(indicator)) return null;
  const rows = rowsForLastMonths(dataset, months);
  const rawValues = rows.map((row) => row[indicator]).filter(Boolean);
  if (isContinuousIndicator(dataset, indicator)) {
    const values = rawValues.map(parseNumericValue).filter((value): value is number => value !== null);
    if (!values.length) return null;
    const ordered = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const median = ordered.length % 2 === 0 ? (ordered[ordered.length / 2 - 1] + ordered[ordered.length / 2]) / 2 : ordered[Math.floor(ordered.length / 2)];
    const variance = values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1) : 0;
    const standardDeviation = Math.sqrt(variance);
    if (values.length < 8 || standardDeviation === 0) {
      return { kind: 'continuous', indicator, rows: values.length, values, mean, median, minimum: ordered[0], maximum: ordered[ordered.length - 1], standardDeviation, normality: 'Indisponível', normalityDetail: values.length < 8 ? 'Amostra menor que 8 observações.' : 'Não há variação suficiente para testar a normalidade.' };
    }
    const skewness = values.reduce((sum, value) => sum + ((value - mean) / standardDeviation) ** 3, 0) / values.length;
    const kurtosis = values.reduce((sum, value) => sum + ((value - mean) / standardDeviation) ** 4, 0) / values.length - 3;
    const jarqueBera = (values.length / 6) * (skewness ** 2 + (kurtosis ** 2) / 4);
    const pValue = Math.exp(-jarqueBera / 2);
    const normality = pValue >= 0.05 ? 'Provavelmente normal' : 'Não normal';
    return { kind: 'continuous', indicator, rows: values.length, values, mean, median, minimum: ordered[0], maximum: ordered[ordered.length - 1], standardDeviation, normality, normalityDetail: `Teste Jarque–Bera · p = ${pValue.toFixed(3)} · significância de 5%` };
  }
  const counts = new Map<string, number>();
  rawValues.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const distribution = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count, percentage: (count / rawValues.length) * 100 }));
  const topCategory = distribution[0];
  return { kind: 'discrete', indicator, rows: rawValues.length, categoryCount: counts.size, topCategory: topCategory?.label ?? 'Sem dados', topCategoryCount: topCategory?.count ?? 0, distribution };
}

function percentile(sorted: number[], proportion: number): number {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * proportion;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absolute);
  const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return 0.5 * (1 + sign * (1 - polynomial * Math.exp(-absolute * absolute)));
}

function inverseNormalCdf(probability: number): number {
  const p = Math.min(1 - Number.EPSILON, Math.max(Number.EPSILON, probability));
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - 0.02425) return -inverseNormalCdf(1 - p);
  const q = p - 0.5;
  const r = q * q;
  const numerator = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q;
  const denominator = ((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1;
  return numerator / denominator;
}

function shapiroWilk(values: number[]): { statistic: number | null; pValue: number | null; detail: string } {
  if (values.length < 3) return { statistic: null, pValue: null, detail: 'Teste indisponível: são necessárias pelo menos 3 observações.' };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sumSquares = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  if (sumSquares <= Number.EPSILON) return { statistic: null, pValue: null, detail: 'Teste indisponível: não há variação suficiente para avaliar a normalidade.' };
  const sorted = [...values].sort((left, right) => left - right);
  const expected = sorted.map((_, index) => inverseNormalCdf((index + 1 - 0.375) / (values.length + 0.25)));
  const expectedMean = expected.reduce((sum, value) => sum + value, 0) / expected.length;
  const centeredExpected = expected.map((value) => value - expectedMean);
  const expectedSquares = centeredExpected.reduce((sum, value) => sum + value ** 2, 0);
  const numerator = centeredExpected.reduce((sum, value, index) => sum + value * (sorted[index] - mean), 0);
  const statistic = Math.min(1, Math.max(0, (numerator ** 2) / (sumSquares * expectedSquares)));
  const oneMinusStatistic = Math.max(1e-12, 1 - statistic);
  let standardized: number;
  if (values.length <= 11) {
    const gamma = -2.273 + 0.459 * values.length;
    const transformed = -Math.log(Math.max(1e-12, gamma - Math.log(oneMinusStatistic)));
    const expectedMeanForSmallSample = 0.5440 - 0.39978 * values.length + 0.025054 * values.length ** 2 - 0.0006714 * values.length ** 3;
    const standardDeviationForSmallSample = Math.exp(1.3822 - 0.77857 * values.length + 0.062767 * values.length ** 2 - 0.0020322 * values.length ** 3);
    standardized = (transformed - expectedMeanForSmallSample) / standardDeviationForSmallSample;
  } else {
    const logN = Math.log(values.length);
    const expectedMeanForLargeSample = 0.0038915 * logN ** 3 - 0.083751 * logN ** 2 - 0.31082 * logN - 1.5861;
    const standardDeviationForLargeSample = Math.exp(0.0030302 * logN ** 2 - 0.082676 * logN + 0.4803);
    standardized = (Math.log(oneMinusStatistic) - expectedMeanForLargeSample) / standardDeviationForLargeSample;
  }
  const pValue = Math.min(1, Math.max(0, normalCdf(standardized)));
  return { statistic, pValue, detail: `Shapiro–Wilk · W = ${statistic.toFixed(3)} · p = ${pValue.toFixed(3)} · significância de 5%` };
}

function formatExploratoryPeriod(row: Record<string, string>, dataset: InputDataset, index: number): string {
  const rawDate = dataset.dateColumn ? row[dataset.dateColumn] : '';
  const date = rawDate ? parseDateValue(rawDate) : null;
  if (!date) return `Observação ${index + 1}`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date).replace('.', '');
}

function buildExploratorySummary(dataset: InputDataset, analysis: IndicatorAnalysis, months: number): ExploratorySummary | null {
  if (analysis.kind !== 'continuous') return null;
  const points = rowsForLastMonths(dataset, months)
    .map((row, index) => {
      const value = parseNumericValue(row[analysis.indicator]);
      return value === null ? null : { period: formatExploratoryPeriod(row, dataset, index), value };
    })
    .filter((point): point is ExploratoryPoint => point !== null);
  if (!points.length) return null;
  const values = points.map((point) => point.value);
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const variance = values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1) : 0;
  const standardDeviation = Math.sqrt(variance);
  const shapiro = shapiroWilk(values);
  return { points, minimum: sorted[0], q1, median: percentile(sorted, 0.5), q3, maximum: sorted[sorted.length - 1], iqr: q3 - q1, mean, standardDeviation, shapiroW: shapiro.statistic, shapiroPValue: shapiro.pValue, shapiroDetail: shapiro.detail };
}

function diagnosisMatchesCurrentAnalysis(
  diagnosis: string | null,
  diagnosisInput: DmaicExploratoryDiagnosisInput | null,
  indicator: string,
  summary: ExploratorySummary | null,
): boolean {
  if (!diagnosis || !diagnosisInput || !summary || diagnosisInput.indicator !== indicator) return false;
  const statistics = diagnosisInput.statistics;
  return statistics.count === summary.points.length
    && statistics.mean === summary.mean
    && statistics.median === summary.median
    && statistics.minimum === summary.minimum
    && statistics.q1 === summary.q1
    && statistics.q3 === summary.q3
    && statistics.maximum === summary.maximum
    && statistics.iqr === summary.iqr
    && statistics.standardDeviation === summary.standardDeviation
    && (statistics.shapiroW ?? null) === summary.shapiroW
    && (statistics.shapiroPValue ?? null) === summary.shapiroPValue;
}

function sanitizeDiagnosisForPipeline(diagnosis: string): string {
  return diagnosis
    .replace(/[-+]?\d+(?:[.,]\d+)?(?:\s*(?:%|pp|min|h|horas?|dias?|meses?))?/gi, '[valor estatístico]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}

function createPipelineAnalysisContext(
  analysis: IndicatorAnalysis | null,
  summary: ExploratorySummary | null,
  analysisMonths: number,
  diagnosis: string | null,
  diagnosisInput: DmaicExploratoryDiagnosisInput | null,
): DmaicPipelineAnalysisContext | null {
  if (!analysis) return null;
  const indicatorSummary = analysis.kind === 'continuous'
    ? {
        kind: analysis.kind,
        indicator: analysis.indicator,
        rows: analysis.rows,
        mean: analysis.mean,
        median: analysis.median,
        minimum: analysis.minimum,
        maximum: analysis.maximum,
        standardDeviation: analysis.standardDeviation,
        normality: analysis.normality,
        normalityDetail: analysis.normalityDetail,
      }
    : {
        kind: analysis.kind,
        indicator: analysis.indicator,
        rows: analysis.rows,
        categoryCount: analysis.categoryCount,
        topCategory: analysis.topCategory,
        topCategoryCount: analysis.topCategoryCount,
        distribution: analysis.distribution.slice(0, PIPELINE_CATEGORY_LIMIT),
      };
  return {
    indicator: analysis.indicator,
    analysisMonths,
    indicatorSummary,
    exploratoryStatistics: summary
      ? {
          count: summary.points.length,
          mean: summary.mean,
          median: summary.median,
          minimum: summary.minimum,
          q1: summary.q1,
          q3: summary.q3,
          maximum: summary.maximum,
          iqr: summary.iqr,
          standardDeviation: summary.standardDeviation,
          shapiroW: summary.shapiroW ?? undefined,
          shapiroPValue: summary.shapiroPValue ?? undefined,
        }
      : null,
    diagnosis: diagnosisMatchesCurrentAnalysis(diagnosis, diagnosisInput, analysis.indicator, summary) ? sanitizeDiagnosisForPipeline(diagnosis as string) : null,
  };
}

function samplePointsForDiagnosis(points: ExploratoryPoint[]): ExploratoryPoint[] {
  if (points.length <= DIAGNOSIS_POINT_LIMIT) return points;
  return Array.from({ length: DIAGNOSIS_POINT_LIMIT }, (_, index) => points[Math.round((index * (points.length - 1)) / (DIAGNOSIS_POINT_LIMIT - 1))]);
}

function IconBadge({ icon: Icon, tone = 'primary' }: { icon: LucideIcon; tone?: 'primary' | 'accent' | 'chart-3' | 'chart-4' }) {
  const toneClasses = { primary: 'bg-primary/10 text-primary', accent: 'bg-accent/15 text-accent-foreground', 'chart-3': 'bg-chart-3/10 text-chart-3', 'chart-4': 'bg-chart-4/10 text-chart-4' };
  return <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone]}`}><Icon size={17} strokeWidth={1.8} /></span>;
}

function Button({ children, onClick, variant = 'solid', className = '', disabled = false, testId }: { children: ReactNode; onClick?: () => void; variant?: 'solid' | 'ghost' | 'outline' | 'dark'; className?: string; disabled?: boolean; testId: string }) {
  const variants = {
    solid: 'bg-primary text-primary-foreground hover:brightness-95',
    ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    outline: 'border border-border bg-card text-foreground hover:border-primary/45 hover:bg-primary/5',
    dark: 'bg-sidebar text-sidebar-foreground hover:bg-sidebar/90',
  };
  return <button data-testid={testId} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${className}`}>{children}</button>;
}

function StatusPill({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'gray' | 'red' }) {
  const tones = { green: 'bg-primary/10 text-primary', amber: 'bg-accent/15 text-foreground', gray: 'bg-muted text-muted-foreground', red: 'bg-destructive/10 text-destructive' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mono-label ${tones[tone]}`}><span className={`h-1.5 w-1.5 rounded-full ${tone === 'green' ? 'bg-primary' : tone === 'amber' ? 'bg-accent' : tone === 'red' ? 'bg-destructive' : 'bg-muted-foreground'}`} />{children}</span>;
}

function Sidebar({ area, setArea, mobileOpen, setMobileOpen, activeProjectName }: { area: Area; setArea: (area: Area) => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void; activeProjectName: string }) {
  return (
    <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:relative lg:translate-x-0`}>
      <div className="flex h-[76px] items-center justify-between border-b border-sidebar-border px-6">
        <button data-testid="button-brand" className="flex items-center gap-3 text-left" onClick={() => { setArea('overview'); setMobileOpen(false); }}>
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><span className="absolute h-4 w-4 rounded-full border-2 border-current" /><span className="absolute h-1.5 w-1.5 rounded-full bg-current" /></span>
          <span><span className="block font-serif text-[15px] font-bold tracking-tight">DMAIC Ágil</span><span className="mono-label mt-1 block text-sidebar-foreground/45">suite / 01</span></span>
        </button>
        <button data-testid="button-close-sidebar" aria-label="Fechar menu" className="lg:hidden text-sidebar-foreground/60" onClick={() => setMobileOpen(false)}><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-6">
        <div className="mb-7 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3.5">
          <div className="flex items-center justify-between"><span className="mono-label text-sidebar-foreground/45">Projeto ativo</span><span className="h-2 w-2 rounded-full bg-sidebar-primary pulse-dot" /></div>
           <p className="mt-2 truncate text-sm font-bold">{activeProjectName}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/55">Operação de crédito · BR-042</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-sidebar-foreground/10"><div className="h-full w-[42%] rounded-full bg-sidebar-primary" /></div>
          <div className="mt-2 flex justify-between text-[10px] text-sidebar-foreground/45"><span>42% do caminho</span><span>21 dias</span></div>
        </div>
        {navGroups.map((group) => <div key={group.label} className="mb-7"><p className="mono-label mb-2 px-3 text-sidebar-foreground/35">{group.label}</p><div className="space-y-1">{group.items.map((item) => { const active = item.id === area; const Icon = item.icon; return <button key={item.id} data-testid={`nav-${item.id}`} onClick={() => { const destinations: Record<string, Area> = { overview: 'overview', definition: 'definition', measurement: 'measurement', aic: 'aic', charter: 'definition', analysis: 'measurement', control: 'aic' }; setArea(destinations[item.id]); setMobileOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold transition-colors ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}><Icon size={16} strokeWidth={1.8} /><span>{item.label}</span>{active && <ArrowRight className="ml-auto" size={14} />}</button>; })}</div></div>)}
      </div>
      <div className="border-t border-sidebar-border p-4">
        <button data-testid="button-help" onClick={() => setArea('overview')} className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent"><CircleHelp size={16} /><span>Guia da sala de melhoria</span></button>
        <div className="mt-3 flex items-center gap-3 border-t border-sidebar-border pt-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">MC</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">Marina Costa</p><p className="truncate text-[10px] text-sidebar-foreground/45">Master Black Belt</p></div><Settings2 size={15} className="text-sidebar-foreground/40" /></div>
      </div>
    </aside>
  );
}

function Topbar({ area, setMobileOpen, onStart, pipelineLoading, activeProjectName }: { area: Area; setMobileOpen: (open: boolean) => void; onStart: () => void; pipelineLoading: boolean; activeProjectName: string }) {
  const meta = areaMeta[area];
  return <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-border bg-background/85 px-5 backdrop-blur-md sm:px-8"><div className="flex min-w-0 items-center gap-3"><button data-testid="button-open-sidebar" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"><Menu size={20} /></button><div className="min-w-0"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span>Projetos</span><span>/</span><span className="truncate text-foreground">{activeProjectName}</span></div><div className="mt-1 flex items-center gap-2"><h1 className="truncate font-serif text-lg font-bold tracking-tight">{meta.label}</h1><span className="hidden rounded bg-muted px-1.5 py-0.5 mono-label text-muted-foreground sm:inline-flex">{meta.kicker}</span></div></div></div><div className="flex shrink-0 items-center gap-2"><div className="relative hidden md:block"><Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" /><input data-testid="input-search" placeholder="Buscar no projeto" className="h-9 w-44 rounded-lg border border-border bg-card pl-9 pr-3 text-xs outline-none transition-all placeholder:text-muted-foreground/70 focus:w-56 focus:border-primary/50" /></div><Button testId="button-start-pipeline" onClick={onStart} disabled={pipelineLoading} className="hidden sm:inline-flex">{pipelineLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}{pipelineLoading ? 'Preparando...' : 'Iniciar pipeline'}</Button><button data-testid="button-more" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><MoreHorizontal size={19} /></button></div></header>;
}

function formatProjectUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'data indisponível' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}

function SavedProjects({ projects, selectedProjectKey, loading, error, onSelect, onLoad, onNew }: {
  projects: DmaicWorkspaceSummary[];
  selectedProjectKey: string;
  loading: boolean;
  error: string | null;
  onSelect: (projectKey: string) => void;
  onLoad: () => void;
  onNew: () => void;
}) {
  return <section data-testid="section-saved-projects" className="reveal mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3"><span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FolderOpen size={17} /></span><div><p className="mono-label text-primary">Projetos no Neon</p><h2 className="mt-1.5 font-serif text-lg font-bold">Continue um projeto salvo</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">Carregue um projeto existente antes de iniciar algo novo. As edições que ainda não foram salvas serão preservadas até você confirmar a troca.</p></div></div>
      <StatusPill tone={loading ? 'amber' : 'green'}>{loading ? 'Atualizando lista' : `${projects.length} salvo${projects.length === 1 ? '' : 's'}`}</StatusPill>
    </div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <label className="min-w-0 flex-1"><span className="sr-only">Projeto salvo</span><select data-testid="select-saved-project" value={selectedProjectKey} onChange={(event) => onSelect(event.target.value)} disabled={loading || projects.length === 0} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none transition-colors focus:border-primary/60"><option value="">{loading ? 'Carregando projetos...' : projects.length === 0 ? 'Nenhum projeto salvo encontrado' : 'Selecione um projeto salvo'}</option>{projects.map((project) => <option key={project.projectKey} value={project.projectKey}>{project.projectName} · #{project.projectKey} · atualizado em {formatProjectUpdatedAt(project.updatedAt)}</option>)}</select></label>
      <Button testId="button-load-selected-project" onClick={onLoad} disabled={!selectedProjectKey || loading} variant="dark"><FolderOpen size={14} /> Carregar projeto</Button>
      <Button testId="button-new-project" onClick={onNew} disabled={loading} variant="outline"><Plus size={14} /> Novo projeto</Button>
    </div>
    {error && <p data-testid="status-project-list-error" className="mt-3 text-xs text-destructive">{error}</p>}
    {!loading && !error && projects.length === 0 && <p data-testid="status-project-list-empty" className="mt-3 text-xs text-muted-foreground">Salve o Problem Statement para criar o primeiro projeto e ele aparecerá aqui.</p>}
  </section>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="mono-label mb-2 text-primary">{eyebrow}</p><h2 className="font-serif text-[21px] font-bold tracking-tight">{title}</h2>{description && <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function CharterInput({ label, value, onChange, testId, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; testId: string; type?: 'text' | 'date'; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">{label}</span><input data-testid={testId} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60" /></label>;
}

function CharterTextarea({ label, value, onChange, testId, placeholder = '', rows = 3 }: { label: string; value: string; onChange: (value: string) => void; testId: string; placeholder?: string; rows?: number }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">{label}</span><textarea data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="w-full resize-y rounded-lg border border-border bg-background p-3 text-xs leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60" /></label>;
}

function ProjectCharterForm({ charter, onFieldChange, onTeamChange, onSave, hasAiSuggestions }: { charter: ProjectCharterDraft; onFieldChange: (field: CharterTextField, value: string) => void; onTeamChange: (role: CharterTeamRole, field: keyof CharterTeamMember, value: string) => void; onSave: () => void; hasAiSuggestions: boolean }) {
  const teamRows: { role: CharterTeamRole; label: string; helper: string }[] = [
    { role: 'leader', label: 'Líder', helper: 'Responsável pelo projeto' },
    { role: 'sponsor', label: 'Patrocinador', helper: 'Sponsor / dono da decisão' },
    { role: 'teamMembers', label: 'Membros da equipe', helper: 'Separe nomes com vírgulas' },
    { role: 'technicalSupport', label: 'Especialistas para suporte técnico', helper: 'Apoio pontual ou consultivo' },
  ];
  return <section data-testid="section-project-charter" className="reveal-3 panel rounded-2xl p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5"><div><p className="mono-label text-primary">Contrato de projeto</p><h3 className="mt-2 font-serif text-xl font-bold">Project charter</h3><p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">Registre o acordo de foco, resultado, fronteiras e pessoas antes de aprofundar a análise.</p></div><StatusPill tone={hasAiSuggestions ? 'green' : 'amber'}>{hasAiSuggestions ? 'Sugestões da IA · editáveis' : 'Preenchimento guiado'}</StatusPill></div>
    {hasAiSuggestions && <div data-testid="status-charter-ai-suggestions" className="mt-5 flex gap-3 rounded-xl border border-primary/20 bg-primary/7 p-4 text-xs leading-relaxed"><Sparkles size={16} className="mt-0.5 shrink-0 text-primary" /><p><strong>Campos sugeridos pela IA.</strong> Objetivo, histórico, meta, KPIs, escopo, premissas, requisitos, contribuições e ganho financeiro são propostas para validação. As informações financeiras coletadas continuam sendo responsabilidade do time; revise, ajuste e salve o Charter quando estiver pronto.</p></div>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CharterInput label="Projeto" value={charter.projectName} onChange={(value) => onFieldChange('projectName', value)} testId="input-charter-project-name" placeholder="Ex.: Redução de lead time" />
      <CharterInput label="Cliente" value={charter.client} onChange={(value) => onFieldChange('client', value)} testId="input-charter-client" placeholder="Ex.: Agências parceiras" />
      <CharterInput label="Área" value={charter.area} onChange={(value) => onFieldChange('area', value)} testId="input-charter-area" placeholder="Ex.: Operação" />
      <CharterInput label="Líder" value={charter.leader} onChange={(value) => onFieldChange('leader', value)} testId="input-charter-leader" placeholder="Nome do líder do projeto" />
      <CharterInput label="Patrocinador" value={charter.sponsor} onChange={(value) => onFieldChange('sponsor', value)} testId="input-charter-sponsor" placeholder="Nome do patrocinador" />
      <CharterInput label="Data" value={charter.date} onChange={(value) => onFieldChange('date', value)} testId="input-charter-date" type="date" />
    </div>
    <div className="mt-5 grid gap-4">
      <CharterTextarea label="Objetivo do projeto" value={charter.objective} onChange={(value) => onFieldChange('objective', value)} testId="textarea-charter-objective" rows={3} placeholder="Qual resultado deve ser alcançado, para quem e em qual prazo?" />
      <CharterTextarea label="Justificativa / histórico" value={charter.history} onChange={(value) => onFieldChange('history', value)} testId="textarea-charter-history" rows={4} placeholder="O que motivou o projeto? Quais impactos, fatos e tentativas anteriores importam?" />
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.55fr_.75fr]">
      <CharterTextarea label="Definição da meta" value={charter.goalDefinition} onChange={(value) => onFieldChange('goalDefinition', value)} testId="textarea-charter-goal" rows={3} placeholder="Ex.: reduzir de 18,4 para 11,0 min até 30/jun." />
      <CharterTextarea label="KPIs" value={charter.kpis} onChange={(value) => onFieldChange('kpis', value)} testId="textarea-charter-kpis" rows={3} placeholder="Ex.: NS atendimento" />
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <CharterTextarea label="Limites do projeto — inclui" value={charter.includedScope} onChange={(value) => onFieldChange('includedScope', value)} testId="textarea-charter-in-scope" rows={3} placeholder="Processos, unidades ou etapas que fazem parte." />
      <CharterTextarea label="Limites do projeto — exclui" value={charter.excludedScope} onChange={(value) => onFieldChange('excludedScope', value)} testId="textarea-charter-out-scope" rows={3} placeholder="O que fica explicitamente fora desta iniciativa." />
    </div>
    <div className="mt-5"><CharterTextarea label="Premissas e restrições do projeto" value={charter.assumptionsAndConstraints} onChange={(value) => onFieldChange('assumptionsAndConstraints', value)} testId="textarea-charter-assumptions" rows={3} placeholder="Ex.: acesso aos dados, janela de implementação, orçamento, dependências e regras que não podem mudar." /></div>
    <div className="mt-6 overflow-x-auto rounded-xl border border-border">
      <div className="min-w-[720px]"><div className="grid grid-cols-[150px_1fr_1fr_1fr] border-b border-border bg-muted/55"><div className="p-3 mono-label text-muted-foreground">Equipe de trabalho</div><div className="p-3 mono-label text-muted-foreground">Nome</div><div className="p-3 mono-label text-muted-foreground">Cargo</div><div className="p-3 mono-label text-muted-foreground">Área / Empresa</div></div>{teamRows.map(({ role, label, helper }) => <div key={role} className="grid grid-cols-[150px_1fr_1fr_1fr] border-b border-border last:border-0"><div className="bg-muted/25 p-3"><p className="text-[11px] font-bold">{label}</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{helper}</p></div><div className="border-l border-border p-2"><input data-testid={`input-charter-team-${role}-name`} value={charter.team[role].name} onChange={(event) => onTeamChange(role, 'name', event.target.value)} placeholder="Nome(s)" className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs outline-none focus:border-primary/60" /></div><div className="border-l border-border p-2"><input data-testid={`input-charter-team-${role}-position`} value={charter.team[role].position} onChange={(event) => onTeamChange(role, 'position', event.target.value)} placeholder="Cargo(s)" className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs outline-none focus:border-primary/60" /></div><div className="border-l border-border p-2"><input data-testid={`input-charter-team-${role}-area`} value={charter.team[role].areaCompany} onChange={(event) => onTeamChange(role, 'areaCompany', event.target.value)} placeholder="Área ou empresa" className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs outline-none focus:border-primary/60" /></div></div>)}</div>
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <CharterTextarea label="Requisitos do cliente" value={charter.customerRequirements} onChange={(value) => onFieldChange('customerRequirements', value)} testId="textarea-charter-customer-requirements" rows={3} placeholder="Necessidades, critérios de aceitação e pontos inegociáveis para o cliente." />
      <CharterTextarea label="Contribuições para o negócio — resumo" value={charter.businessContributions} onChange={(value) => onFieldChange('businessContributions', value)} testId="textarea-charter-business-contributions" rows={3} placeholder="Como o projeto apoia o negócio, sempre conectado à VOC, à meta e ao escopo." />
    </div>
    <div data-testid="section-charter-business-value" className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
       <div className="mb-4"><p className="mono-label text-primary">Valor para o negócio</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Registre apenas impactos relacionados à VOC e ao escopo. Ao iniciar o pipeline, a IA usará as contribuições quantitativas e as informações financeiras coletadas para calcular uma estimativa e refazer a meta do projeto. Separe fatos coletados de estimativas; valide o resultado com Financeiro. Nem sempre a meta desejada pela empresa é estatisticamente alcançável: quando a média e a mediana históricas do indicador indicarem isso, a IA sinalizará esse risco na meta e proporá uma meta intermediária compatível com a evidência, mantendo a meta ideal como visão de longo prazo a validar com a equipe.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CharterTextarea label="Contribuições quantitativas" value={charter.businessContributionsQuantitative} onChange={(value) => onFieldChange('businessContributionsQuantitative', value)} testId="textarea-charter-business-contributions-quantitative" rows={4} placeholder="Ex.: reduzir 20% do retrabalho, liberar 80 h/mês, elevar o atendimento de 82% para 92%." />
        <CharterTextarea label="Contribuições qualitativas" value={charter.businessContributionsQualitative} onChange={(value) => onFieldChange('businessContributionsQualitative', value)} testId="textarea-charter-business-contributions-qualitative" rows={4} placeholder="Ex.: mais previsibilidade para o cliente, menor esforço operacional e decisão mais segura." />
        <CharterTextarea label="Valor do ganho financeiro esperado" value={charter.financialGainValue} onChange={(value) => onFieldChange('financialGainValue', value)} testId="textarea-charter-financial-gain-value" rows={4} placeholder="Qual será o ganho se a meta for alcançada? Informe valor estimado, moeda e período; marque como estimativa quando aplicável." />
        <CharterTextarea label="Informações financeiras coletadas" value={charter.financialInformation} onChange={(value) => onFieldChange('financialInformation', value)} testId="textarea-charter-financial-information" rows={4} placeholder="Base da estimativa ou valor confirmado: fonte, período, moeda, volume, custo unitário, premissas e responsável pela validação. Este campo não é preenchido pela IA." />
      </div>
    </div>
     <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="text-[11px] text-muted-foreground"><Info size={13} className="mr-1 inline-block align-[-2px]" /> Ao salvar, o conteúdo fica no Neon e será enviado ao Gemini como contexto ao iniciar o pipeline.</p><Button testId="button-save-charter" onClick={onSave} variant="outline"><Save size={14} /> Salvar charter</Button></div>
  </section>;
}

function Overview({ statement, setStatement, onSave, charter, onCharterChange, onTeamChange, onSaveCharter, pipelineDone, hasAiSuggestions, onOpenArea }: { statement: string; setStatement: (value: string) => void; onSave: () => void; charter: ProjectCharterDraft; onCharterChange: (field: CharterTextField, value: string) => void; onTeamChange: (role: CharterTeamRole, field: keyof CharterTeamMember, value: string) => void; onSaveCharter: () => void; pipelineDone: boolean; hasAiSuggestions: boolean; onOpenArea: (area: Area) => void }) {
  return <div className="space-y-7">
    <section className="reveal relative overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar px-6 py-7 text-sidebar-foreground sm:px-9 sm:py-9"><div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[32px] border-sidebar-primary/10" /><div className="pointer-events-none absolute right-10 top-12 h-28 w-28 rounded-full border border-sidebar-primary/20" /><div className="relative max-w-3xl"><div className="flex flex-wrap items-center gap-2"><span className="mono-label text-sidebar-primary">Sala de melhoria · ciclo 04</span><StatusPill tone="green">{pipelineDone ? 'Pipeline ativo' : 'Workspace pronto'}</StatusPill></div><h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold leading-[1.08] tracking-tight sm:text-[42px]">Do ruído operacional a uma decisão que <span className="text-sidebar-primary">se sustenta.</span></h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-sidebar-foreground/65">O time não precisa de mais uma planilha. Precisa de um caminho claro para descobrir, testar e controlar o que realmente move o resultado.</p><div className="mt-7 flex flex-wrap gap-3"><Button testId="button-hero-start" onClick={() => onOpenArea('definition')} variant="solid">Abrir Sprint 1 <ArrowRight size={15} /></Button><Button testId="button-hero-guide" onClick={() => document.querySelector('[data-testid="textarea-problem-statement"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} variant="outline" className="border-sidebar-foreground/20 bg-transparent text-sidebar-foreground hover:bg-sidebar-foreground/10">Ver guia rápido</Button></div></div></section>
    <section className="reveal-2 panel rounded-2xl p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mono-label text-accent-foreground/70">Problema que guia o ciclo</p><h3 className="mt-2 font-serif text-lg font-bold">Problem statement</h3></div><StatusPill tone="amber">Editável</StatusPill></div><textarea data-testid="textarea-problem-statement" value={statement} onChange={(event) => setStatement(event.target.value)} className="mt-5 min-h-[98px] w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span data-testid="text-problem-hint" className="text-[11px] text-muted-foreground"><Info size={13} className="mr-1 inline-block align-[-2px]" /> Seja específico sobre processo, impacto e janela de tempo.</span><Button testId="button-save-statement" onClick={onSave} variant="outline"><Save size={14} /> Salvar mudança</Button></div></section>
    <ProjectCharterForm charter={charter} onFieldChange={onCharterChange} onTeamChange={onTeamChange} onSave={onSaveCharter} hasAiSuggestions={hasAiSuggestions} />
    <section className="reveal-3"><SectionHeading eyebrow="Pulso do projeto" title="O trabalho em uma leitura" action={<button data-testid="button-refresh-pulse" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-2 text-[11px] font-bold text-muted-foreground hover:text-foreground"><RefreshCw size={14} /> Atualizado há 4 min</button>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Dias no ciclo', value: '21', note: 'de 45 previstos', icon: Clock3, color: 'text-chart-3' }, { label: 'Indicador Y', value: '12,8%', note: 'retrabalho atual', icon: Activity, color: 'text-accent-foreground' }, { label: 'Vital Xs', value: '03', note: '1 priorizado', icon: Zap, color: 'text-chart-4' }, { label: 'Confiança dos dados', value: 'B+', note: 'MSA validado', icon: ShieldCheck, color: 'text-primary' }].map((item) => <div key={item.label} data-testid={`metric-${item.label}`} className="panel rounded-xl p-4"><div className="flex items-start justify-between"><span className="text-xs font-semibold text-muted-foreground">{item.label}</span><item.icon size={17} className={item.color} strokeWidth={1.8} /></div><p className="mt-3 font-serif text-2xl font-bold">{item.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.note}</p></div>)}</div></section>
    <section className="reveal-4"><SectionHeading eyebrow="Mapa de trabalho" title="O caminho do time" description="Cada sprint fecha uma pergunta. O próximo passo só abre quando existe evidência suficiente." /><div className="grid gap-3 lg:grid-cols-3">{(['definition', 'measurement', 'aic'] as Area[]).map((id, index) => { const meta = areaMeta[id]; const progress = index === 0 ? 78 : index === 1 ? 42 : 18; return <button key={id} data-testid={`card-sprint-${id}`} onClick={() => onOpenArea(id)} className="group panel rounded-xl p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>0{index + 1}</span><ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div><h3 className="mt-5 font-serif text-lg font-bold">{meta.label.replace(' · ', ' / ')}</h3><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{meta.description}</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: meta.color }} /></div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{progress}% completo</span><span>{index === 0 ? '4 de 5' : index === 1 ? '2 de 5' : '1 de 5'} entregas</span></div></button>; })}</div></section>
  </div>;
}

function ToolCard({ tool, onOpen }: { tool: Tool; onOpen: (tool: Tool) => void }) {
  const Icon = tool.icon;
  return <button data-testid={`card-tool-${tool.id}`} onClick={() => onOpen(tool)} className="group panel flex min-h-[154px] flex-col rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45"><div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `hsl(${tool.accent} / .12)`, color: `hsl(${tool.accent})` }}><Icon size={17} strokeWidth={1.8} /></span><span className="opacity-0 transition-opacity group-hover:opacity-100"><ArrowRight size={16} className="text-primary" /></span></div><div className="mt-auto pt-5"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{tool.title}</h3>{tool.tag && <span className="rounded bg-muted px-1.5 py-0.5 mono-label text-muted-foreground">{tool.tag}</span>}</div><p className="mt-1 text-[11px] text-muted-foreground">{tool.subtitle}</p><p className="mt-3 mono-label text-primary">{tool.status}</p></div></button>;
}

function SprintView({ area, onOpenTool, onChangeVital, vitalId, inputDataset, inputAnalysis, inputError, analysisMonths, onAnalysisMonthsChange, selectedIndicator, onSelectedIndicatorChange, diagnosis, onDiagnosisChange, onSaveAnalysis, onUpload, inputRef, activeProjectName }: { area: 'definition' | 'measurement' | 'aic'; onOpenTool: (tool: Tool) => void; onChangeVital: (id: string) => void; vitalId: string; inputDataset: InputDataset | null; inputAnalysis: IndicatorAnalysis | null; inputError: string | null; analysisMonths: number; onAnalysisMonthsChange: (months: number) => void; selectedIndicator: string; onSelectedIndicatorChange: (indicator: string) => void; diagnosis: string | null; onDiagnosisChange: (diagnosis: string | null, input: DmaicExploratoryDiagnosisInput) => void; onSaveAnalysis: () => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; inputRef: { current: HTMLInputElement | null }; activeProjectName: string }) {
  const meta = areaMeta[area];
  const selectedVital = vitalXs.find((vital) => vital.id === vitalId) ?? vitalXs[0];
  return <div className="space-y-7">
    <div className="reveal flex flex-wrap items-end justify-between gap-4"><div><p className="mono-label mb-2" style={{ color: meta.color }}>{meta.kicker}</p><h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{meta.label}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{meta.description}</p></div><div className="flex items-center gap-2"><StatusPill tone="green">Em andamento</StatusPill><button data-testid="button-sprint-options" onClick={() => onOpenTool(tools[area][0])} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground"><MoreHorizontal size={17} /></button></div></div>
    {area === 'measurement' && <div className="reveal-2 panel flex flex-wrap items-center justify-between gap-4 rounded-xl border-l-4 border-l-chart-3 p-4"><div className="flex items-center gap-3"><IconBadge icon={Gauge} tone="chart-3" /><div><p className="text-sm font-bold">Indicador Y em foco</p><p className="mt-0.5 text-xs text-muted-foreground">Tempo total até aprovação · <span className="font-bold text-foreground">12,8 min</span> mediana</p></div></div><div className="flex items-center gap-2"><label htmlFor="vital-select" className="mono-label text-muted-foreground">Vital X</label><select id="vital-select" data-testid="select-vital-x" value={vitalId} onChange={(event) => onChangeVital(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary/50">{vitalXs.map((vital) => <option key={vital.id} value={vital.id}>{vital.label}</option>)}</select></div></div>}
    {area === 'measurement' && <div className="reveal-3 panel rounded-xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mono-label text-chart-3">Vital X selecionado</p><h3 className="mt-2 font-serif text-xl font-bold">{selectedVital.label}</h3><p className="mt-1 text-xs text-muted-foreground">{selectedVital.note} · janela de 30 dias</p></div><div className="text-right"><p className="font-serif text-2xl font-bold">{selectedVital.value}</p><p className="mt-1 text-[11px] font-bold text-primary">{selectedVital.delta} vs. baseline</p></div></div><div className="mt-5 grid h-14 grid-cols-12 items-end gap-1.5 border-b border-border pb-0 sm:grid-cols-24">{[30,36,34,42,38,45,40,49,46,54,51,48,58,53,56,62,59,64,57,68,61,65,72,66].map((height, index) => <div key={index} className="rounded-t-sm bg-chart-3/60 transition-all hover:bg-chart-3" style={{ height: `${height}%` }} />)}</div><div className="mt-2 flex justify-between mono-label text-muted-foreground"><span>01 mai</span><span>30 mai</span></div></div>}
     {(area === 'definition' || area === 'measurement') && <InputDataPanel dataset={inputDataset} analysis={inputAnalysis} error={inputError} months={analysisMonths} onMonthsChange={onAnalysisMonthsChange} selectedIndicator={selectedIndicator} onIndicatorChange={onSelectedIndicatorChange} diagnosis={diagnosis} onDiagnosisChange={onDiagnosisChange} onSaveAnalysis={onSaveAnalysis} onUpload={onUpload} inputRef={inputRef} activeProjectName={activeProjectName} />}
    <div className="reveal-2"><SectionHeading eyebrow={area === 'definition' ? 'Entregáveis de enquadramento' : area === 'measurement' ? 'Entregáveis de evidência' : 'Entregáveis de mudança'} title={area === 'definition' ? 'Dê nome ao problema certo' : area === 'measurement' ? 'Meça sem adivinhar' : 'Faça a solução pegar'} /></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{tools[area].map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={onOpenTool} />)}</div>
    {area === 'aic' && <div className="reveal-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="panel rounded-xl p-5"><div className="flex items-center justify-between"><div><p className="mono-label text-chart-4">Hipóteses em teste</p><h3 className="mt-2 font-serif text-lg font-bold">Do provável ao comprovado</h3></div><TestTube2 size={18} className="text-chart-4" /></div><div className="mt-5 space-y-4">{[{ name: 'H1 · Padronização da triagem', status: 'Em teste', pct: 68 }, { name: 'H2 · Regra de aprovação automática', status: 'Próximo', pct: 32 }, { name: 'H3 · Balanceamento da célula', status: 'Backlog', pct: 12 }].map((item) => <div key={item.name}><div className="flex justify-between gap-3 text-xs"><span className="font-semibold">{item.name}</span><span className="mono-label text-muted-foreground">{item.status}</span></div><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-chart-4" style={{ width: `${item.pct}%` }} /></div></div>)}</div></div><div className="panel rounded-xl bg-accent/10 p-5"><p className="mono-label text-accent-foreground">Próximo checkpoint</p><h3 className="mt-2 font-serif text-lg font-bold">Review de controle</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Quinta, 06 jun · 14:30<br />Validar plano de reação e dono do SOP.</p><Button testId="button-schedule-review" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} variant="dark" className="mt-5">Abrir agenda <ArrowRight size={14} /></Button></div></div>}
  </div>;
}

function ExploratoryLineChart({ summary, indicator }: { summary: ExploratorySummary; indicator: string }) {
  const width = 700;
  const height = 230;
  const padding = { top: 18, right: 18, bottom: 40, left: 64 };
  const values = summary.points.map((point) => point.value);
  const minimum = Math.min(...values, summary.mean);
  const maximum = Math.max(...values, summary.mean);
  const range = Math.max(maximum - minimum, 1);
  const xFor = (index: number) => padding.left + (index / Math.max(values.length - 1, 1)) * (width - padding.left - padding.right);
  const yFor = (value: number) => padding.top + (1 - (value - minimum) / range) * (height - padding.top - padding.bottom);
  const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ');
  const labels = [0, Math.floor((values.length - 1) / 2), values.length - 1].filter((value, index, list) => list.indexOf(value) === index);
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, tickIndex) => minimum + (range * tickIndex) / yTickCount);
  const baselineY = height - padding.bottom;
  return <div data-testid="chart-exploratory-time-series" className="rounded-xl border border-border bg-card p-3">
    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="mono-label text-chart-3">Série temporal</p><h4 className="mt-1 text-sm font-bold">{indicator} ao longo do período</h4></div><span className="mono-label text-muted-foreground">{summary.points.length} pontos</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label={`Série temporal de ${indicator}`}>
      {yTicks.map((tick, tickIndex) => <g key={`y-tick-${tickIndex}`}>
        <line x1={padding.left} x2={width - padding.right} y1={yFor(tick)} y2={yFor(tick)} stroke="hsl(var(--border))" strokeWidth="1" />
        <text data-testid={`text-exploratory-y-tick-${tickIndex}`} x={padding.left - 8} y={yFor(tick)} dy="3" textAnchor="end" className="fill-muted-foreground text-[10px]">{formatMetric(tick)}</text>
      </g>)}
      <line x1={padding.left} x2={padding.left} y1={padding.top} y2={baselineY} stroke="hsl(var(--border))" strokeWidth="1" />
      <line x1={padding.left} x2={width - padding.right} y1={baselineY} y2={baselineY} stroke="hsl(var(--border))" strokeWidth="1" />
      <line x1={padding.left} x2={width - padding.right} y1={yFor(summary.mean)} y2={yFor(summary.mean)} stroke="hsl(var(--accent))" strokeDasharray="5 5" />
      <polyline fill="none" stroke="hsl(var(--chart-3))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={points} />
      {summary.points.map((point, index) => <circle key={`${point.period}-${index}`} cx={xFor(index)} cy={yFor(point.value)} r="3.8" fill="hsl(var(--chart-3))"><title>{`${point.period}: ${formatMetric(point.value)}`}</title></circle>)}
      <text x={width - padding.right} y={yFor(summary.mean) - 7} textAnchor="end" className="fill-accent-foreground text-[10px]">média {formatMetric(summary.mean)}</text>
      {labels.map((index) => <g key={index}>
        <line x1={xFor(index)} x2={xFor(index)} y1={baselineY} y2={baselineY + 4} stroke="hsl(var(--border))" strokeWidth="1" />
        <text data-testid={`text-exploratory-x-tick-${index}`} x={xFor(index)} y={height - 10} textAnchor={index === 0 ? 'start' : index === values.length - 1 ? 'end' : 'middle'} className="fill-muted-foreground text-[10px]">{summary.points[index].period}</text>
      </g>)}
    </svg>
  </div>;
}

function ExploratoryBoxPlot({ summary, indicator }: { summary: ExploratorySummary; indicator: string }) {
  const width = 420;
  const height = 250;
  const plotTop = 22;
  const plotBottom = 220;
  const range = Math.max(summary.maximum - summary.minimum, 1);
  const yFor = (value: number) => plotBottom - ((value - summary.minimum) / range) * (plotBottom - plotTop);
  const x = 150;
  return <div data-testid="chart-exploratory-boxplot" className="rounded-xl border border-border bg-card p-3">
    <div className="mb-3"><p className="mono-label text-primary">Distribuição</p><h4 className="mt-1 text-sm font-bold">Boxplot de {indicator}</h4></div>
    <svg viewBox={`0 0 ${width} ${height + 26}`} className="h-auto w-full" role="img" aria-label={`Boxplot de ${indicator}`}>
      <line x1={x} x2={x} y1={yFor(summary.minimum)} y2={yFor(summary.maximum)} stroke="hsl(var(--primary))" strokeWidth="2" />
      <line x1={x - 25} x2={x + 25} y1={yFor(summary.minimum)} y2={yFor(summary.minimum)} stroke="hsl(var(--primary))" strokeWidth="2" />
      <line x1={x - 25} x2={x + 25} y1={yFor(summary.maximum)} y2={yFor(summary.maximum)} stroke="hsl(var(--primary))" strokeWidth="2" />
      <rect x={x - 42} y={yFor(summary.q3)} width="84" height={Math.max(yFor(summary.q1) - yFor(summary.q3), 3)} rx="6" fill="hsl(var(--primary) / .18)" stroke="hsl(var(--primary))" strokeWidth="2" />
      <line x1={x - 42} x2={x + 42} y1={yFor(summary.median)} y2={yFor(summary.median)} stroke="hsl(var(--accent))" strokeWidth="3" />
      {[['Máximo', summary.maximum], ['Q3', summary.q3], ['Mediana', summary.median], ['Q1', summary.q1], ['Mínimo', summary.minimum]].map(([label, value]) => <text key={String(label)} x={x + 58} y={yFor(Number(value)) + 4} className="fill-muted-foreground text-[10px]">{label} · {formatMetric(Number(value))}</text>)}
    </svg>
  </div>;
}

function ExploratoryAnalysisPanel({ dataset, analysis, months, diagnosis, onDiagnosisChange, activeProjectName }: { dataset: InputDataset; analysis: IndicatorAnalysis; months: number; diagnosis: string | null; onDiagnosisChange: (diagnosis: string | null, input: DmaicExploratoryDiagnosisInput) => void; activeProjectName: string }) {
  const summary = buildExploratorySummary(dataset, analysis, months);
  const diagnosisMutation = useRunDmaicExploratoryDiagnosis();
  const diagnosisPoints = summary ? samplePointsForDiagnosis(summary.points) : [];
  const diagnosisIsSampled = diagnosisPoints.length < (summary?.points.length ?? 0);
  const analysisKey = `${dataset.fileName}:${analysis.indicator}:${months}:${summary?.points.map((point) => `${point.period}:${point.value}`).join('|') ?? ''}`;
  useEffect(() => {
    diagnosisMutation.reset();
  }, [analysisKey]);

  if (analysis.kind !== 'continuous' || !summary) {
    return <section data-testid="panel-exploratory-analysis" className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
      <div className="flex items-start gap-3"><Info size={17} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="mono-label text-amber-700">Análise exploratória</p><h3 className="mt-1 font-serif text-lg font-bold">Série temporal & estatística descritiva</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Esta leitura exige um indicador numérico contínuo. Para indicadores categóricos, use a distribuição e o Pareto acima.</p></div></div>
    </section>;
  }

  const runDiagnosis = () => diagnosisMutation.mutate({
    data: {
      indicator: analysis.indicator,
      timeColumn: dataset.dateColumn ?? undefined,
      points: diagnosisPoints,
      statistics: {
        count: summary.points.length,
        mean: summary.mean,
        median: summary.median,
        minimum: summary.minimum,
        q1: summary.q1,
        q3: summary.q3,
        maximum: summary.maximum,
        iqr: summary.iqr,
        standardDeviation: summary.standardDeviation,
        shapiroW: summary.shapiroW ?? undefined,
        shapiroPValue: summary.shapiroPValue ?? undefined,
      },
    },
  }, {
    onSuccess: (result, variables) => onDiagnosisChange(result.diagnosis, variables.data),
  });
  return <section data-testid="panel-exploratory-analysis" className="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="mono-label text-primary">Análise exploratória</p><h3 className="mt-1 font-serif text-xl font-bold">Análise Exploratória & Estatística Descritiva</h3><p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">Leitura da série atual, calculada localmente a partir de {summary.points.length} observações de <strong>{analysis.indicator}</strong>.</p></div>
      <div className="flex items-center gap-2"><StatusPill tone="green">Dados do CSV · local</StatusPill><Button testId="button-export-exploratory-analysis" variant="outline" onClick={() => exportExploratoryPdf(summary, analysis.indicator, diagnosisMutation.data?.diagnosis ?? diagnosis, activeProjectName)}><FileText size={14} /> Exportar visão</Button></div>
    </div>
    <div className="mt-5 grid gap-3 xl:grid-cols-[1.35fr_.85fr]"><ExploratoryLineChart summary={summary} indicator={analysis.indicator} /><ExploratoryBoxPlot summary={summary} indicator={analysis.indicator} /></div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      {[
        ['Mínimo', summary.minimum, 'stat-exploratory-minimum'],
        ['Q1 · 25%', summary.q1, 'stat-exploratory-q1'],
        ['Mediana', summary.median, 'stat-exploratory-median'],
        ['Q3 · 75%', summary.q3, 'stat-exploratory-q3'],
        ['Máximo', summary.maximum, 'stat-exploratory-maximum'],
        ['IQR', summary.iqr, 'stat-exploratory-iqr'],
        ['Desvio-padrão', summary.standardDeviation, 'stat-exploratory-standard-deviation'],
        ['p Shapiro–Wilk', summary.shapiroPValue, 'stat-exploratory-shapiro-p'],
      ].map(([label, value, testId]) => <div key={String(label)} data-testid={String(testId)} className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-bold">{value === null ? 'Indisponível' : formatMetric(Number(value))}</p></div>)}
    </div>
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <div data-testid="text-exploratory-lower-interpretation" className="rounded-xl border border-border bg-background p-4"><p className="text-xs font-bold">25% inferiores</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">A região entre {formatMetric(summary.minimum)} e {formatMetric(summary.q1)} representa aproximadamente o quarto inferior das observações.</p></div>
      <div data-testid="text-exploratory-upper-interpretation" className="rounded-xl border border-border bg-background p-4"><p className="text-xs font-bold">25% superiores</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">A região entre {formatMetric(summary.q3)} e {formatMetric(summary.maximum)} representa aproximadamente o quarto superior das observações.</p></div>
    </div>
    <div data-testid="text-exploratory-shapiro-detail" className="mt-3 rounded-xl border border-border bg-background p-4"><p className="text-xs font-bold">Teste de normalidade</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{summary.shapiroDetail}{summary.shapiroPValue !== null && ` · ${summary.shapiroPValue >= 0.05 ? 'Não há evidência suficiente para rejeitar normalidade.' : 'Há evidência de desvio da normalidade.'}`}</p></div>
    <div className="mt-4 rounded-xl border border-primary/20 bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mono-label text-primary">Diagnóstico detalhado com IA</p><p className="mt-1 text-xs text-muted-foreground">Peça ao Gemini uma leitura completa de tendência, estabilidade, distribuição, normalidade e próximos passos do DMAIC.</p>{diagnosisIsSampled && <p className="mt-1 text-[11px] text-muted-foreground">Para manter a leitura focada, o Gemini recebe uma amostra cronológica de {DIAGNOSIS_POINT_LIMIT} pontos; os gráficos e estatísticas usam todas as {summary.points.length} observações.</p>}</div><Button testId="button-generate-exploratory-diagnosis" onClick={runDiagnosis} disabled={diagnosisMutation.isPending || diagnosisPoints.length < 2} variant="outline">{diagnosisMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}{diagnosisMutation.isPending ? 'Analisando...' : 'Gerar diagnóstico detalhado'}</Button></div>
      {diagnosisMutation.isError && <p data-testid="status-exploratory-diagnosis-error" className="mt-3 rounded-lg bg-destructive/5 p-3 text-xs text-destructive">{diagnosisMutation.error instanceof Error ? diagnosisMutation.error.message.replace(/^HTTP \d+ [^:]+:\s*/, '') : 'Não foi possível obter o diagnóstico textual agora. A análise estatística local continua disponível.'}</p>}
      {(diagnosisMutation.data?.diagnosis ?? diagnosis) && <div data-testid="text-exploratory-diagnosis" className="mt-4 max-w-none overflow-visible whitespace-pre-wrap break-words border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground"><p className="mb-3 text-xs font-bold text-foreground">Leitura detalhada do comportamento da série</p>{(diagnosisMutation.data?.diagnosis ?? diagnosis)?.split(/\n{2,}/).map((paragraph, index) => <p key={index} className="mb-3 last:mb-0">{paragraph.trim()}</p>)}</div>}
    </div>
  </section>;
}

function InputDataPanel({ dataset, analysis, error, months, onMonthsChange, selectedIndicator, onIndicatorChange, diagnosis, onDiagnosisChange, onSaveAnalysis, onUpload, inputRef, activeProjectName }: { dataset: InputDataset | null; analysis: IndicatorAnalysis | null; error: string | null; months: number; onMonthsChange: (months: number) => void; selectedIndicator: string; onIndicatorChange: (indicator: string) => void; diagnosis: string | null; onDiagnosisChange: (diagnosis: string | null, input: DmaicExploratoryDiagnosisInput) => void; onSaveAnalysis: () => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; inputRef: { current: HTMLInputElement | null }; activeProjectName: string }) {
  return <section data-testid="panel-input-data" className="reveal-4 panel rounded-xl border-dashed p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><IconBadge icon={CloudUpload} tone="accent" /><div><p className="mono-label text-accent-foreground">Entrada da Sprint 1</p><h3 className="mt-1.5 text-sm font-bold">Dados para análise</h3><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{dataset ? `${dataset.fileName} · ${dataset.rows.length} linhas · ${dataset.headers.length} colunas` : 'Carregue um CSV para selecionar o indicador e medir o comportamento do processo.'}</p></div></div>
      <div className="flex flex-wrap items-center gap-2">
        {dataset && <Button testId="button-export-input-data" variant="outline" onClick={() => exportInputDataPdf(dataset, analysis, months, diagnosis, activeProjectName)}><FileText size={14} /> Exportar visão</Button>}
        <label data-testid="button-upload-csv" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold transition-colors hover:border-primary/45 hover:bg-primary/5"><Upload size={14} /> {dataset ? 'Trocar CSV' : 'Carregar CSV'}<input ref={inputRef} data-testid="input-upload-csv" type="file" accept=".csv,text/csv" onChange={onUpload} className="sr-only" /></label>
      </div>
    </div>
    {dataset && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary/5 px-3.5 py-3"><p className="text-[11px] leading-relaxed text-muted-foreground"><Check size={13} className="mr-1.5 inline-block align-[-2px] text-primary" /> Esta análise é salva automaticamente no Neon após o upload e as alterações dos parâmetros.</p><Button testId="button-save-analysis" onClick={onSaveAnalysis} variant="outline"><Save size={14} /> Salvar análise agora</Button></div>}
    {error && <div data-testid="status-input-data-error" className="mt-4 flex gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs text-destructive"><Info size={16} className="mt-0.5 shrink-0" /><p>{error}</p></div>}
    {dataset && <div className="mt-5 grid gap-3 rounded-xl border border-border bg-background/60 p-4 md:grid-cols-[1fr_150px]">
      <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">Indicador a analisar</span><select data-testid="select-analysis-indicator" value={selectedIndicator} onChange={(event) => onIndicatorChange(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold outline-none focus:border-primary/60">{dataset.indicatorColumns.map((indicator) => <option key={indicator} value={indicator}>{indicator}</option>)}</select></label>
      <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">Últimos N meses</span><input data-testid="input-analysis-months" type="number" min="1" max="120" value={months} onChange={(event) => onMonthsChange(Math.min(120, Math.max(1, Number(event.target.value) || 1)))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold outline-none focus:border-primary/60" /></label>
     </div>}
    {dataset && analysis && <div data-testid="panel-analysis-summary" className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="mono-label text-primary">Resumo do indicador</p><h4 className="mt-1 text-sm font-bold">{analysis.indicator}</h4></div><div className="flex items-center gap-2"><StatusPill tone="green">{analysis.kind === 'continuous' ? 'Contínuo' : 'Discreto'}</StatusPill><span data-testid="text-analysis-rows" className="mono-label text-muted-foreground">{analysis.rows} observações · {dataset.dateColumn ? `últimos ${months} meses` : 'sem coluna de período'}</span></div></div>
      {analysis.kind === 'continuous' ? <><div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{[['Média', analysis.mean, 'stat-analysis-mean'], ['Mediana', analysis.median, 'stat-analysis-median'], ['Mínimo', analysis.minimum, 'stat-analysis-min'], ['Máximo', analysis.maximum, 'stat-analysis-max'], ['Desvio-padrão', analysis.standardDeviation, 'stat-analysis-standard-deviation']].map(([label, value, testId]) => <div key={String(label)} data-testid={String(testId)} className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-bold">{formatMetric(Number(value))}</p></div>)}<div data-testid="stat-analysis-normality" className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">Normalidade</p><p className={`mt-1 text-xs font-bold ${analysis.normality === 'Não normal' ? 'text-destructive' : 'text-primary'}`}>{analysis.normality}</p></div></div><p data-testid="text-analysis-normality-detail" className="mt-3 text-[11px] text-muted-foreground">{analysis.normalityDetail}</p></> : <><div className="mt-4 grid gap-2 sm:grid-cols-3"><div data-testid="stat-analysis-top-category" className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">Categoria dominante</p><p className="mt-1 truncate text-sm font-bold">{analysis.topCategory}</p></div><div className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">Ocorrências</p><p className="mt-1 font-mono text-sm font-bold">{analysis.topCategoryCount}</p></div><div className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">Categorias</p><p className="mt-1 font-mono text-sm font-bold">{analysis.categoryCount}</p></div></div><div className="mt-4 space-y-2">{analysis.distribution.map((item) => <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3 text-[11px]"><div><div className="mb-1 flex justify-between gap-2"><span className="truncate font-semibold">{item.label}</span><span className="mono-label text-muted-foreground">{item.percentage.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-r bg-muted"><div className="h-full rounded-r bg-accent" style={{ width: `${item.percentage}%` }} /></div></div><span className="text-right font-mono font-bold">{item.count}</span></div>)}</div><p className="mt-3 text-[11px] text-muted-foreground">Média, mediana, mínimo, máximo, desvio-padrão e normalidade não se aplicam a este indicador categórico.</p></>}
    </div>}
     {dataset && analysis && <ExploratoryAnalysisPanel dataset={dataset} analysis={analysis} months={months} diagnosis={diagnosis} onDiagnosisChange={onDiagnosisChange} activeProjectName={activeProjectName} />}
    <p className="mt-4 text-[11px] text-muted-foreground"><Info size={13} className="mr-1 inline-block align-[-2px]" /> O arquivo é processado localmente no navegador. A coluna de data, quando identificada, define o recorte dos últimos N meses.</p>
  </section>;
}

function DetailDrawer({ tool, onClose, pareto, imr, inputAnalysis, hasInputDataset, csvError, onRetry, pipeline, hasDiagnosis = false, manualRows, hasManualChanges, manualSaveConfirmed, onManualRowsChange, onSaveManualRows, charter, activeProjectName, sipocDirty = false, sipocSaved = false, onSipocChange, onSaveSipoc }: { tool: Tool; onClose: () => void; pareto: { name: string; value: number }[] | null; imr: number[] | null; inputAnalysis?: IndicatorAnalysis | null; hasInputDataset: boolean; csvError: string | null; onRetry: () => void; pipeline: DmaicPipeline | null; hasDiagnosis?: boolean; manualRows: DmaicVocCqt[]; hasManualChanges: boolean; manualSaveConfirmed: boolean; onManualRowsChange: (rows: DmaicVocCqt[]) => void; onSaveManualRows: () => void; charter?: ProjectCharterDraft; activeProjectName?: string; sipocDirty?: boolean; sipocSaved?: boolean; onSipocChange?: (next: DmaicSipoc) => void; onSaveSipoc?: () => void }) {
  const [tab, setTab] = useState<'preview' | 'data'>('preview');
  const isPareto = tool.id === 'pareto';
  const isImr = tool.id === 'imr';
  const isAnalysisTool = isPareto || isImr;
  const hasCompatibleData = isPareto ? Boolean(pareto) : isImr ? Boolean(imr) : true;
  const total = pareto?.reduce((sum, item) => sum + item.value, 0) ?? 0;
  const cumulative = (pareto ?? []).reduce<{ name: string; value: number; pct: number }[]>((result, item) => { const prior = result[result.length - 1]?.pct ?? 0; result.push({ ...item, pct: prior + (item.value / Math.max(total, 1)) * 100 }); return result; }, []);
  const source = hasInputDataset ? 'upload' : 'example';
  const unavailableMessage = !inputAnalysis
    ? 'Não há observações disponíveis para o indicador e período selecionados.'
    : isPareto
      ? 'O Pareto é aplicável somente a indicadores discretos ou categóricos. Selecione um indicador compatível.'
      : inputAnalysis.kind === 'continuous' && inputAnalysis.values.length < 2
        ? 'O I-MR precisa de pelo menos duas observações sequenciais no recorte selecionado.'
        : 'O I-MR é aplicável somente a indicadores contínuos. Selecione um indicador numérico compatível.';
  return <div className="fixed inset-0 z-40 flex justify-end bg-sidebar/25 backdrop-blur-[2px]" onClick={onClose}><section role="dialog" aria-modal="true" data-testid="panel-tool-detail" onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-border bg-background shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-background/95 px-5 py-5 backdrop-blur"><div className="flex gap-3"><IconBadge icon={tool.icon} tone="primary" /><div><p className="mono-label text-primary">{pipeline ? 'Gerado com IA' : manualRows.length > 0 ? 'Editado pela equipe' : tool.tag ?? 'Entregável gerado'}</p><h2 className="mt-1 font-serif text-xl font-bold">{tool.title}</h2><p className="mt-1 text-xs text-muted-foreground">{tool.subtitle}</p></div></div><button data-testid="button-close-tool" aria-label="Fechar detalhe" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><div className="border-b border-border px-5 pt-4"><div className="flex gap-5"><button data-testid="tab-preview" onClick={() => setTab('preview')} className={`border-b-2 pb-3 text-xs font-bold ${tab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Visualização</button><button data-testid="tab-data" onClick={() => setTab('data')} className={`border-b-2 pb-3 text-xs font-bold ${tab === 'data' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Dados & notas</button></div></div><div className="flex-1 p-5">{csvError && isAnalysisTool ? <div data-testid="status-tool-csv-error" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"><div className="flex gap-3"><Info size={17} className="mt-0.5 shrink-0 text-destructive" /><div><p className="text-sm font-bold text-destructive">Não foi possível ler o arquivo</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{csvError}</p><Button testId="button-retry-upload" onClick={onRetry} variant="outline" className="mt-3"><RefreshCw size={13} /> Tentar com outro arquivo</Button></div></div></div> : isAnalysisTool && !hasCompatibleData ? <div data-testid="status-tool-no-data" className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4"><div className="flex gap-3"><Info size={17} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-sm font-bold">Visualização indisponível</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{unavailableMessage}</p></div></div></div> : tab === 'preview' ? <>{isPareto && pareto ? <ParetoChart data={pareto} cumulative={cumulative} source={source} /> : isImr && imr ? <ImrChart data={imr} source={source} /> : tool.id === 'voc' ? <VocCqtMap rows={pipeline?.vocCtq ?? []} hasPipeline={Boolean(pipeline)} hasDiagnosis={hasDiagnosis} manualRows={manualRows} hasManualChanges={hasManualChanges} hasManualSaveConfirmation={manualSaveConfirmed} onManualRowsChange={onManualRowsChange} onSaveManualRows={onSaveManualRows} /> : tool.id === 'sipoc' ? <SipocMap sipoc={pipeline?.sipoc ?? null} hasPipeline={Boolean(pipeline)} dirty={sipocDirty} saved={sipocSaved} onChange={(next) => onSipocChange?.(next)} onSave={() => onSaveSipoc?.()} /> : <GenericPreview tool={tool} pipeline={pipeline} />}</> : <DataNotes tool={tool} pareto={pareto} imr={imr} source={source} />}</div><div className="border-t border-border bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><span className="mono-label text-muted-foreground">{pipeline ? 'Conteúdo gerado por Gemini' : manualRows.length > 0 ? 'Indicadores manuais · equipe' : hasInputDataset && isAnalysisTool ? hasCompatibleData ? 'Dados do CSV · local' : 'Sem dados compatíveis' : 'Conteúdo de exemplo · local'}</span><Button testId="button-export-tool" variant="outline" onClick={tool.id === 'charter' && charter ? () => exportProjectCharterPdf(charter, activeProjectName?.trim() || 'Novo projeto') : tool.id === 'sipoc' ? () => exportSipocPdf(pipeline?.sipoc?.length ? pipeline.sipoc : exampleSipoc, activeProjectName?.trim() || 'Novo projeto') : tool.id === 'voc' ? () => exportVocPdf((pipeline?.vocCtq?.length ? pipeline.vocCtq : manualRows.length ? manualRows : exampleVocRows), activeProjectName?.trim() || 'Novo projeto') : undefined}><FileText size={14} /> Exportar visão</Button></div></div></section></div>;
}

function ParetoChart({ data, cumulative, source }: { data: { name: string; value: number }[]; cumulative: { name: string; value: number; pct: number }[]; source: 'example' | 'upload' }) {
  const max = Math.max(...data.map((item) => item.value));
  return <div><div className="mb-5 flex items-start justify-between"><div><p className="mono-label text-accent-foreground">{source === 'upload' ? 'Dados do CSV' : 'Exemplo gerado'}</p><h3 className="mt-2 font-serif text-lg font-bold">Onde a fila realmente pesa</h3><p className="mt-1 text-xs text-muted-foreground">Pareto · causas por ocorrência</p></div><FileBarChart size={20} className="text-accent-foreground" /></div><div className="rounded-xl border border-border bg-card p-4"><div className="space-y-3">{data.map((item, index) => <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_38px] items-center gap-3"><div><div className="mb-1 flex justify-between gap-2 text-[11px]"><span className="truncate font-semibold">{item.name}</span><span className="mono-label text-muted-foreground">{cumulative[index]?.pct.toFixed(0)}%</span></div><div className="h-5 overflow-hidden rounded-r-md bg-muted"><div className={`h-full rounded-r-md ${index === 0 ? 'bg-accent' : 'bg-primary/70'}`} style={{ width: `${(item.value / max) * 100}%` }} /></div></div><span className="text-right font-mono text-xs font-bold">{item.value}</span></div>)}</div><div className="mt-5 flex justify-between border-t border-border pt-3 mono-label text-muted-foreground"><span>Ocorrências</span><span>{data.reduce((sum, item) => sum + item.value, 0)} total</span></div></div></div>;
}

function ImrChart({ data, source }: { data: number[]; source: 'example' | 'upload' }) {
  const width = 480;
  const height = 190;
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
  const movingRanges = data.slice(1).map((value, index) => Math.abs(value - data[index]));
  const meanMovingRange = movingRanges.reduce((sum, value) => sum + value, 0) / movingRanges.length;
  const upperControl = mean + 2.66 * meanMovingRange;
  const lowerControl = mean - 2.66 * meanMovingRange;
  const allValues = [...data, upperControl, lowerControl];
  const domainMin = Math.min(...allValues);
  const domainMax = Math.max(...allValues);
  const domainPadding = Math.max((domainMax - domainMin) * 0.12, 1);
  const yFor = (value: number) => height - ((value - (domainMin - domainPadding)) / (domainMax - domainMin + domainPadding * 2)) * height;
  const points = data.map((value, index) => `${(index / (data.length - 1)) * width},${yFor(value)}`).join(' ');
  const signals = data.filter((value) => value > upperControl || value < lowerControl).length;
  return <div><div className="mb-5 flex items-start justify-between"><div><p className="mono-label text-chart-3">{source === 'upload' ? 'Dados do CSV' : 'Exemplo gerado'}</p><h3 className="mt-2 font-serif text-lg font-bold">A variação está respirando?</h3><p className="mt-1 text-xs text-muted-foreground">I-MR · sequência de {data.length} medições</p></div><Activity size={20} className="text-chart-3" /></div><div className="rounded-xl border border-border bg-card p-3"><svg viewBox={`0 0 ${width} ${height + 25}`} className="h-auto w-full overflow-visible"><line x1="0" x2={width} y1={yFor(mean)} y2={yFor(mean)} stroke="hsl(var(--primary) / .35)" strokeDasharray="4 4" /><line x1="0" x2={width} y1={yFor(upperControl)} y2={yFor(upperControl)} stroke="hsl(var(--chart-3) / .45)" strokeDasharray="4 4" /><line x1="0" x2={width} y1={yFor(lowerControl)} y2={yFor(lowerControl)} stroke="hsl(var(--destructive) / .45)" strokeDasharray="4 4" /><polyline fill="none" stroke="hsl(var(--chart-3))" strokeWidth="2.5" points={points} />{data.map((value, index) => <circle key={index} cx={(index / (data.length - 1)) * width} cy={yFor(value)} r="3.5" fill="hsl(var(--chart-3))" />)}</svg><div data-testid="text-imr-limits" className="mt-2 flex justify-between mono-label text-muted-foreground"><span>LSC · {formatMetric(upperControl)}</span><span>média · {formatMetric(mean)}</span><span>LIC · {formatMetric(lowerControl)}</span></div></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-lg bg-muted p-3"><p className="mono-label text-muted-foreground">Média</p><p className="mt-1 font-mono text-sm font-bold">{formatMetric(mean)}</p></div><div className="rounded-lg bg-primary/8 p-3"><p className="mono-label text-primary">Sinais</p><p className="mt-1 font-mono text-sm font-bold text-primary">{signals}</p></div><div className="rounded-lg bg-accent/12 p-3"><p className="mono-label text-accent-foreground">MR médio</p><p className="mt-1 font-mono text-sm font-bold">{formatMetric(meanMovingRange)}</p></div></div></div>;
}

const exampleVocRows: DmaicVocCqt[] = [
  {
    vocNeed: 'Receber uma resposta previsível e sem retrabalho.',
    clientType: 'internal',
    client: 'Agência solicitante',
    sourceType: 'reactive',
    source: 'Chamados e registros de retrabalho',
    directioner: 'Fluxo claro, com retorno dentro do prazo combinado.',
    ctq: 'Previsibilidade do atendimento',
    ctp: 'Triagem e aprovação sem reentrada',
    measure: 'Percentual de solicitações concluídas no prazo definido.',
    issue: 'Variação do prazo gera cobranças e retrabalho.',
    ctqMetric: '% concluído no prazo',
  },
  {
    vocNeed: 'Saber quando a solicitação será concluída.',
    clientType: 'external',
    client: 'Cliente que aguarda o crédito',
    sourceType: 'active',
    source: 'Entrevista ou pesquisa a planejar',
    directioner: 'Comunicação simples sobre prazo e status.',
    ctq: 'Clareza do compromisso',
    ctp: 'Atualização de status ao longo do fluxo',
    measure: 'Percentual de clientes que reconhecem o status e o prazo.',
    issue: 'Necessidade inferida do problema; validar com consumidores.',
    ctqMetric: '% de entendimento do status',
  },
];

function VocManualRowEditor({ row, index, onChange, onRemove, validationMessage }: { row: DmaicVocCqt; index: number; onChange: (field: keyof DmaicVocCqt, value: string) => void; onRemove: () => void; validationMessage: string | null }) {
  const inputClassName = 'h-9 w-full rounded-lg border border-border bg-background px-3 text-[11px] outline-none transition-colors focus:border-primary/60';
  const textAreaClassName = 'min-h-[66px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[11px] leading-relaxed outline-none transition-colors focus:border-primary/60';
  return <div data-testid={`panel-voc-manual-row-${index}`} className="border-b border-border bg-primary/[0.025] p-4 last:border-0">
    <div className="flex items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Indicador manual</span><span className="mono-label text-muted-foreground">#{index + 1}</span></div><p className="mt-1 text-[11px] text-muted-foreground">Preencha os campos do mapa; esta linha será salva com o projeto e não será enviada ao Gemini.</p></div>
      <Button testId={`button-remove-voc-manual-${index}`} onClick={onRemove} variant="ghost" className="shrink-0 text-destructive"><X size={14} /> Remover</Button>
    </div>
    <div className="mt-4 overflow-x-auto">
      <div className="grid min-w-[980px] grid-cols-4 gap-3">
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">Necessidade *</span><textarea data-testid={`input-voc-manual-vocNeed-${index}`} value={row.vocNeed} onChange={(event) => onChange('vocNeed', event.target.value)} className={textAreaClassName} placeholder="O que o cliente precisa?" /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">Tipo de cliente *</span><select data-testid={`select-voc-manual-clientType-${index}`} value={row.clientType} onChange={(event) => onChange('clientType', event.target.value)} className={inputClassName}><option value="internal">Interno · Voz do Negócio</option><option value="external">Externo · Voz do Consumidor</option></select></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">Cliente *</span><input data-testid={`input-voc-manual-client-${index}`} value={row.client} onChange={(event) => onChange('client', event.target.value)} className={inputClassName} placeholder="Quem recebe ou entrega?" /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">Tipo de fonte *</span><select data-testid={`select-voc-manual-sourceType-${index}`} value={row.sourceType} onChange={(event) => onChange('sourceType', event.target.value)} className={inputClassName}><option value="reactive">Reativa · registro existente</option><option value="active">Ativa · coleta planejada</option></select></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">Fonte *</span><input data-testid={`input-voc-manual-source-${index}`} value={row.source} onChange={(event) => onChange('source', event.target.value)} className={inputClassName} placeholder="Pesquisa, chamado, entrevista..." /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">Direcionador *</span><textarea data-testid={`input-voc-manual-directioner-${index}`} value={row.directioner} onChange={(event) => onChange('directioner', event.target.value)} className={textAreaClassName} placeholder="Requisito que orienta a solução" /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">CTQ *</span><textarea data-testid={`input-voc-manual-ctq-${index}`} value={row.ctq} onChange={(event) => onChange('ctq', event.target.value)} className={textAreaClassName} placeholder="Critical to Quality" /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">CTP *</span><textarea data-testid={`input-voc-manual-ctp-${index}`} value={row.ctp} onChange={(event) => onChange('ctp', event.target.value)} className={textAreaClassName} placeholder="Critical to Process" /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">Medida / aceitação *</span><textarea data-testid={`input-voc-manual-measure-${index}`} value={row.measure} onChange={(event) => onChange('measure', event.target.value)} className={textAreaClassName} placeholder="Como será medido ou aceito?" /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">Dor / hipótese</span><textarea data-testid={`input-voc-manual-issue-${index}`} value={row.issue} onChange={(event) => onChange('issue', event.target.value)} className={textAreaClassName} placeholder="Dor observada ou hipótese para validar" /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">Métrica de referência *</span><input data-testid={`input-voc-manual-ctqMetric-${index}`} value={row.ctqMetric} onChange={(event) => onChange('ctqMetric', event.target.value)} className={inputClassName} placeholder="% no prazo, minutos, nota..." /></label>
      </div>
    </div>
    {validationMessage && <p data-testid={`status-voc-manual-validation-${index}`} className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-[11px] text-destructive"><Info size={14} className="shrink-0" />{validationMessage}</p>}
  </div>;
}

function VocCqtMap({ rows, hasPipeline, hasDiagnosis, manualRows, hasManualChanges, hasManualSaveConfirmation, onManualRowsChange, onSaveManualRows }: { rows: DmaicVocCqt[]; hasPipeline: boolean; hasDiagnosis: boolean; manualRows: DmaicVocCqt[]; hasManualChanges: boolean; hasManualSaveConfirmation: boolean; onManualRowsChange: (rows: DmaicVocCqt[]) => void; onSaveManualRows: () => void }) {
  const hasGeneratedMap = hasPipeline && rows.length > 0;
  const hasManualRows = manualRows.length > 0;
  const displayRows = hasGeneratedMap ? rows : hasManualRows ? manualRows : exampleVocRows;
  const showExample = !hasGeneratedMap && !hasManualRows;
  const addManualRow = () => onManualRowsChange([...manualRows, createManualVocRow()]);
  const updateManualRow = (index: number, field: keyof DmaicVocCqt, value: string) => onManualRowsChange(manualRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  const removeManualRow = (index: number) => onManualRowsChange(manualRows.filter((_, rowIndex) => rowIndex !== index));
  const invalidManualRows = manualRows.some((row) => getManualVocValidationMessage(row));
  return <div data-testid="map-voc-ctq" className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="mono-label text-primary">{hasGeneratedMap ? 'Mapa gerado pelo pipeline' : hasManualRows ? 'Mapa construído pela equipe' : 'Exemplo orientativo'}</p>
        <h3 className="mt-2 font-serif text-lg font-bold">Da voz às medidas que orientam o projeto</h3>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">Cada linha conecta uma necessidade a um cliente, uma fonte, um direcionador e critérios mensuráveis de qualidade e processo.</p>
      </div>
      <Network size={20} className="shrink-0 text-primary" />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div><p className="text-xs font-bold">Complemente o mapa com o conhecimento do time</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Adicione indicadores identificados em entrevistas, reuniões ou registros do processo.</p></div>
      <div className="flex flex-wrap gap-2"><Button testId="button-add-voc-manual" onClick={addManualRow}><Plus size={14} /> Adicionar indicador</Button>{(hasManualRows || hasManualChanges) && <Button testId="button-save-voc-manual" onClick={onSaveManualRows} variant="outline" disabled={invalidManualRows}><Save size={14} /> Salvar indicadores</Button>}</div>
    </div>
    {hasManualSaveConfirmation && <div data-testid="status-voc-manual-saved" className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span><strong>Indicadores VOC/CTQ salvos no Neon.</strong> As linhas manuais continuarão disponíveis ao reabrir este workspace.</span></div>}

    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold">Fluxo do método VOC</p>
          <p className="mt-1 text-[11px] text-muted-foreground">A voz precisa ser planejada e validada antes de virar requisito.</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${hasGeneratedMap ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-accent-foreground'}`}>{hasGeneratedMap ? `${displayRows.length} linhas` : 'Aguardando geração'}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-5">
        {[
          ['01', 'Identificar clientes'],
          ['02', 'Planejar fontes'],
          ['03', 'Analisar necessidades'],
          ['04', 'Traduzir em CTQs/CTPs'],
          ['05', 'Estabelecer medidas'],
        ].map(([number, label]) => <div key={number} className="relative rounded-lg bg-muted/65 p-3 sm:min-h-[82px]">
          <span className="font-mono text-[10px] font-bold text-primary">{number}</span>
          <p className="mt-2 text-[11px] font-bold leading-snug">{label}</p>
          {number !== '05' && <ArrowRight size={13} className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 bg-background text-muted-foreground sm:block" />}
        </div>)}
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <div data-testid="guide-voc-clients" className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2"><Layers3 size={15} className="text-primary" /><p className="text-xs font-bold">Quem é o cliente?</p></div>
        <div className="mt-3 space-y-2 text-[11px] leading-relaxed">
          <p><strong>Interno · Voz do Negócio:</strong> áreas, equipes e parceiros internos que recebem ou entregam o processo.</p>
          <p><strong>Externo · Voz do Consumidor:</strong> quem usa, recebe ou é impactado pelo produto ou serviço.</p>
        </div>
      </div>
      <div data-testid="guide-voc-sources" className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2"><ClipboardList size={15} className="text-chart-3" /><p className="text-xs font-bold">De onde vem a voz?</p></div>
        <div className="mt-3 space-y-2 text-[11px] leading-relaxed">
          <p><strong>Reativa:</strong> reclamações, chamados, devoluções, relatórios e outros registros já existentes.</p>
          <p><strong>Ativa:</strong> pesquisa, entrevista, grupo focal ou observação planejada para investigar a necessidade.</p>
        </div>
      </div>
    </div>

    {showExample && <div data-testid="status-voc-no-pipeline" className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 text-xs"><Info size={16} className="mt-0.5 shrink-0 text-accent-foreground" /><p className="leading-relaxed"><strong>O mapa ainda é um exemplo.</strong> Preencha o Problem Statement e o Project Charter, salve o projeto e gere o pipeline — ou adicione uma linha manual para registrar o conhecimento da equipe.</p></div>}
    {!hasGeneratedMap && hasManualRows && <div data-testid="status-voc-manual-only" className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs"><Info size={16} className="mt-0.5 shrink-0 text-primary" /><p className="leading-relaxed"><strong>Este mapa foi iniciado manualmente.</strong> Salve os indicadores preenchidos para protegê-los no workspace. A geração do pipeline pode ser feita depois.</p></div>}
    {hasGeneratedMap && !hasDiagnosis && <div data-testid="status-voc-no-diagnosis" className="flex items-start gap-3 rounded-xl border border-chart-3/25 bg-chart-3/5 p-4 text-xs"><Info size={16} className="mt-0.5 shrink-0 text-chart-3" /><p className="leading-relaxed"><strong>Diagnóstico detalhado não anexado.</strong> As necessidades foram contextualizadas com o Charter e o problema informado; recomendações e inferências ainda precisam ser validadas com clientes.</p></div>}

    {hasManualRows && <div className="overflow-hidden rounded-xl border border-primary/25" data-testid="section-voc-manual-rows">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-4 py-3"><div><p className="text-xs font-bold">Indicadores adicionados pela equipe</p><p className="mt-1 text-[11px] text-muted-foreground">Conteúdo manual · não gerado pelo Gemini</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{manualRows.length} {manualRows.length === 1 ? 'linha' : 'linhas'}</span></div>
      {manualRows.map((row, index) => <VocManualRowEditor key={`manual-${index}`} row={row} index={index} onChange={(field, value) => updateManualRow(index, field, value)} onRemove={() => removeManualRow(index)} validationMessage={getManualVocValidationMessage(row)} />)}
    </div>}

    {hasGeneratedMap && <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-chart-3" /><p className="text-xs font-bold">Linhas geradas pelo Gemini</p><span className="mono-label text-muted-foreground">· {rows.length} {rows.length === 1 ? 'linha' : 'linhas'}</span></div>}
    <div className="overflow-x-auto rounded-xl border border-border" data-testid="table-voc-ctq-scroll">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-[1.05fr_1.12fr_1.05fr_1.22fr] border-b border-border bg-sidebar px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground">
          <div>Necessidade</div>
          <div>Clientes</div>
          <div>Direcionadores</div>
          <div>CTQs / CTPs</div>
        </div>
        {displayRows.map((row, index) => <div key={`${row.vocNeed}-${index}`} data-testid={`row-voc-ctq-${index}`} className="grid grid-cols-[1.05fr_1.12fr_1.05fr_1.22fr] border-b border-border last:border-0">
          <div data-testid={`text-voc-need-${index}`} className="border-r border-border bg-primary/[0.035] p-4 text-xs leading-relaxed">{row.vocNeed}</div>
          <div className="border-r border-border p-4">
            <span data-testid={`badge-voc-client-type-${index}`} className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{row.clientType === 'external' ? 'Externo · Voz do Consumidor' : 'Interno · Voz do Negócio'}</span>
            <p data-testid={`text-voc-client-${index}`} className="mt-2 text-xs font-bold leading-relaxed">{row.client}</p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{row.sourceType === 'active' ? 'Fonte ativa' : 'Fonte reativa'}</p>
            <p data-testid={`text-voc-source-${index}`} className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{row.source}</p>
          </div>
          <div data-testid={`text-voc-directioner-${index}`} className="border-r border-border p-4 text-xs leading-relaxed">
            <p>{row.directioner}</p>
            <div className="mt-3 border-t border-border pt-3"><p className="mono-label text-muted-foreground">Dor / hipótese</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{row.issue}</p></div>
          </div>
          <div className="p-4">
            <p className="mono-label text-primary">CTQ</p>
            <p data-testid={`text-voc-ctq-${index}`} className="mt-1 text-xs font-bold leading-relaxed">{row.ctq}</p>
            <p className="mt-3 mono-label text-chart-3">CTP</p>
            <p data-testid={`text-voc-ctp-${index}`} className="mt-1 text-[11px] leading-relaxed">{row.ctp}</p>
            <div className="mt-3 rounded-lg bg-muted/70 p-2.5"><p className="mono-label text-muted-foreground">Medida / aceitação</p><p data-testid={`text-voc-measure-${index}`} className="mt-1 text-[11px] font-semibold leading-relaxed">{row.measure}</p><p className="mt-2 mono-label text-muted-foreground">Métrica de referência</p><p data-testid={`text-voc-ctq-metric-${index}`} className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{row.ctqMetric}</p></div>
          </div>
        </div>)}
     </div>
    </div>
    <p className="text-[10px] leading-relaxed text-muted-foreground">As fontes, necessidades inferidas e recomendações devem ser confirmadas por entrevistas, pesquisas, registros ou observação do processo. O mapa não substitui a coleta real de VOC.</p>
  </div>;
}

const exampleSipoc: DmaicSipoc = [
  { suppliers: 'Área de TI\nCliente', inputs: 'Totem de senha\nSistema de gerenciamento de fila\nNecessidade do cliente', process: 'Retirar a senha de atendimento', outputs: 'Senha impressa', customers: 'Cliente' },
  { suppliers: 'Área de Operação\nÁrea de TI\nCliente', inputs: 'Operador de atendimento\nGuichê de atendimento\nSistema de cadastro\nDocumentos', process: 'Cadastrar o cliente', outputs: 'Cadastro do cliente completo\nGuia de exames', customers: 'Área de Operação\nÁrea Comercial' },
  { suppliers: 'Área de Operação\nPlano de Saúde\nCliente', inputs: 'Operador de atendimento\nSite do plano de saúde\nDados do cliente\nPedido médico', process: 'Verificar autorização dos exames', outputs: 'Exames autorizados', customers: 'Área de Operação\nÁrea Comercial\nFinanceiro' },
  { suppliers: 'Área de Operação\nÁrea de TI', inputs: 'Operador de atendimento\nGuichê de atendimento\nSistema de cadastro', process: 'Imprimir guia para realização dos exames', outputs: 'Guia de exames impressa', customers: 'Ilha de exames\nCliente' },
  { suppliers: 'Área de Operação', inputs: 'Informações sobre localização dos exames\nAssistente de atendimento', process: 'Encaminhar cliente para o exame', outputs: 'Cliente conduzido até o local do exame', customers: 'Ilha de exames' },
];

const SIPOC_COLUMNS: { key: keyof DmaicSipocRow; label: string; hint: string; headerClass: string }[] = [
  { key: 'suppliers', label: 'Fornecedores', hint: 'Quem entrega o que a etapa precisa', headerClass: 'bg-chart-4/12 text-chart-4' },
  { key: 'inputs', label: 'Entradas', hint: 'O que alimenta a etapa', headerClass: 'bg-chart-3/12 text-chart-3' },
  { key: 'process', label: 'Processo', hint: 'Uma macroetapa, em ordem', headerClass: 'bg-primary/12 text-primary' },
  { key: 'outputs', label: 'Saídas', hint: 'O que a etapa entrega', headerClass: 'bg-accent/18 text-accent-foreground' },
  { key: 'customers', label: 'Clientes', hint: 'Quem recebe as saídas', headerClass: 'bg-chart-5/14 text-chart-5' },
];

function sipocCellLines(value: string): string[] {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function SipocGrid({ rows, readOnly, onUpdateCell, onAddRow, onRemoveRow }: { rows: DmaicSipoc; readOnly: boolean; onUpdateCell: (rowIndex: number, key: keyof DmaicSipocRow, value: string) => void; onAddRow: () => void; onRemoveRow: (rowIndex: number) => void }) {
  return <div data-testid="grid-sipoc" className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full min-w-[860px] border-collapse text-xs">
      <thead>
        <tr>
          {SIPOC_COLUMNS.map((column) => <th key={column.key} className={`border-b border-border px-3 py-2.5 text-left align-top ${column.headerClass}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide">{column.label}</p>
            <p className="mt-0.5 text-[10px] font-medium opacity-80">{column.hint}</p>
          </th>)}
          {!readOnly && <th className="w-9 border-b border-border" aria-hidden="true" />}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={SIPOC_COLUMNS.length + (readOnly ? 0 : 1)} className="px-3 py-4 text-center text-[11px] text-muted-foreground">Nenhuma etapa ainda.</td></tr>}
        {rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-border last:border-b-0 even:bg-muted/20">
          {SIPOC_COLUMNS.map((column) => <td key={column.key} data-testid={`cell-sipoc-${column.key}-${rowIndex}`} className="align-top px-2.5 py-2.5">
            {readOnly
              ? <ul className="space-y-1 text-[11px] leading-relaxed">
                {sipocCellLines(row[column.key]).length > 0
                  ? sipocCellLines(row[column.key]).map((item, itemIndex) => <li key={itemIndex} className="flex gap-1.5"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />{item}</li>)
                  : <li className="text-muted-foreground/70">—</li>}
              </ul>
              : <textarea data-testid={`input-sipoc-${column.key}-${rowIndex}`} value={row[column.key]} onChange={(event) => onUpdateCell(rowIndex, column.key, event.target.value)} rows={3} className="min-h-[64px] w-full min-w-[150px] resize-y rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] leading-relaxed outline-none transition-colors focus:border-primary/60" placeholder="Um item por linha..." />}
          </td>)}
          {!readOnly && <td className="align-top px-1 py-2.5"><button type="button" data-testid={`button-remove-sipoc-row-${rowIndex}`} onClick={() => onRemoveRow(rowIndex)} aria-label="Remover etapa" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><X size={13} /></button></td>}
        </tr>)}
      </tbody>
    </table>
    {!readOnly && <button type="button" data-testid="button-add-sipoc-row" onClick={onAddRow} className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-[11px] font-bold text-primary hover:bg-primary/5"><Plus size={13} /> Adicionar etapa</button>}
  </div>;
}

function SipocFlowDiagram({ sipoc }: { sipoc: DmaicSipoc }) {
  const columnItems = (key: keyof DmaicSipocRow) => sipoc.flatMap((row) => sipocCellLines(row[key]));
  return <div data-testid="diagram-sipoc-flow" className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-4">
    <div className="flex min-w-[780px] items-stretch gap-1">
      {SIPOC_COLUMNS.map((stage, index) => { const items = columnItems(stage.key); return <div key={stage.key} className="flex flex-1 items-stretch">
        <div className="flex flex-1 flex-col rounded-lg border border-border bg-background">
          <div className={`rounded-t-lg px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-wide ${stage.headerClass}`}>{stage.label}</div>
          <ul className="flex-1 space-y-1.5 p-2.5 text-[10.5px] leading-snug">
            {items.length > 0
              ? items.map((item, itemIndex) => <li key={itemIndex} className="flex gap-1.5"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />{item}</li>)
              : <li className="text-muted-foreground/70">—</li>}
          </ul>
        </div>
        {index < SIPOC_COLUMNS.length - 1 && <div className="flex w-6 shrink-0 items-center justify-center"><ArrowRight size={14} className="text-muted-foreground" /></div>}
      </div>; })}
    </div>
  </div>;
}

function SipocMap({ sipoc, hasPipeline, dirty, saved, onChange, onSave }: { sipoc: DmaicSipoc | null; hasPipeline: boolean; dirty: boolean; saved: boolean; onChange: (next: DmaicSipoc) => void; onSave: () => void }) {
  const displaySipoc = sipoc && sipoc.length > 0 ? sipoc : exampleSipoc;
  const readOnly = !hasPipeline;
  const updateCell = (rowIndex: number, key: keyof DmaicSipocRow, value: string) => onChange(displaySipoc.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row));
  const addRow = () => onChange([...displaySipoc, { suppliers: '', inputs: '', process: '', outputs: '', customers: '' }]);
  const removeRow = (rowIndex: number) => onChange(displaySipoc.filter((_, index) => index !== rowIndex));
  return <div data-testid="map-sipoc" className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="mono-label text-primary">{hasPipeline ? 'Gerado pelo pipeline · editável' : 'Exemplo orientativo'}</p>
        <h3 className="mt-2 font-serif text-lg font-bold">O sistema antes do detalhe</h3>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">Cada linha é uma macroetapa do processo, com fornecedores, entradas, saídas e clientes daquela etapa alinhados lado a lado.</p>
      </div>
      <Layers3 size={20} className="shrink-0 text-primary" />
    </div>

    {readOnly && <div data-testid="status-sipoc-no-pipeline" className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 text-xs"><Info size={16} className="mt-0.5 shrink-0 text-accent-foreground" /><p className="leading-relaxed"><strong>O SIPOC ainda é um exemplo.</strong> Preencha o Problem Statement e o Project Charter, salve o projeto e gere o pipeline para que o Gemini proponha a primeira versão — depois é só ajustar cada linha com o time.</p></div>}

    {hasPipeline && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div><p className="text-xs font-bold">Ajuste a grade com o conhecimento do time</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Adicione, edite ou remova etapas antes de tratá-las como fluxo validado. Use uma linha por item dentro de cada célula.</p></div>
      {(dirty || saved) && <Button testId="button-save-sipoc" onClick={onSave} variant="outline" disabled={!dirty}><Save size={14} /> Salvar SIPOC</Button>}
    </div>}
    {saved && !dirty && <div data-testid="status-sipoc-saved" className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span><strong>SIPOC salvo no Neon.</strong> As alterações continuarão disponíveis ao reabrir este workspace.</span></div>}

    <SipocGrid rows={displaySipoc} readOnly={readOnly} onUpdateCell={updateCell} onAddRow={addRow} onRemoveRow={removeRow} />

    <div>
      <p className="mb-3 text-xs font-bold">Visualização em fluxo</p>
      <SipocFlowDiagram sipoc={displaySipoc} />
    </div>
  </div>;
}

function escapeCharterHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildProjectCharterPrintDocument(charter: ProjectCharterDraft, projectName: string): string {
  const field = (key: CharterTextField) => {
    const value = charter[key].trim();
    return `<div class="field"><h3>${escapeCharterHtml(CHARTER_FIELD_LABELS[key])}</h3><p>${value ? escapeCharterHtml(value).replace(/\n/g, '<br />') : '<span class="empty">Não preenchido</span>'}</p></div>`;
  };
  const teamRows = (Object.keys(CHARTER_TEAM_ROLE_LABELS) as CharterTeamRole[]).map((role) => {
    const member = charter.team[role];
    return `<tr><td>${escapeCharterHtml(CHARTER_TEAM_ROLE_LABELS[role])}</td><td>${escapeCharterHtml(member.name.trim()) || '—'}</td><td>${escapeCharterHtml(member.position.trim()) || '—'}</td><td>${escapeCharterHtml(member.areaCompany.trim()) || '—'}</td></tr>`;
  }).join('');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>Project Charter - ${escapeCharterHtml(projectName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; margin: 0; padding: 36px 44px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #78716c; margin: 28px 0 12px; border-bottom: 1px solid #e7e5e4; padding-bottom: 6px; }
  h3 { font-size: 10.5px; font-weight: 700; color: #57534e; margin: 0 0 4px; }
  p { font-size: 12.5px; line-height: 1.5; margin: 0; }
  .subtitle { font-size: 12px; color: #78716c; margin: 0 0 8px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 20px; }
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 20px; }
  .stack { display: grid; gap: 14px; }
  .field { break-inside: avoid; }
  .empty { color: #a8a29e; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 4px; }
  th, td { border: 1px solid #e7e5e4; padding: 6px 8px; text-align: left; }
  th { background: #f5f5f4; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #78716c; }
  .print-bar { position: sticky; top: 0; display: flex; justify-content: flex-end; margin: -36px -44px 24px; padding: 12px 44px; background: #fafaf9; border-bottom: 1px solid #e7e5e4; }
  .print-bar button { font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; border: 1px solid #1c1917; background: #1c1917; color: #fff; cursor: pointer; }
  @page { margin: 16mm; }
  @media print { .print-bar { display: none; } body { padding: 0 8mm; } }
</style></head>
<body>
  <div class="print-bar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>
  <h1>Project Charter</h1>
  <p class="subtitle">${escapeCharterHtml(projectName)} &middot; gerado em ${new Date().toLocaleDateString('pt-BR')}</p>

  <h2>Identificação</h2>
  <div class="grid-3">${(['projectName', 'client', 'area', 'leader', 'sponsor', 'date'] as CharterTextField[]).map(field).join('')}</div>

  <h2>Objetivo e histórico</h2>
  <div class="stack">${(['objective', 'history'] as CharterTextField[]).map(field).join('')}</div>

  <h2>Meta e indicadores</h2>
  <div class="stack">${(['goalDefinition', 'kpis'] as CharterTextField[]).map(field).join('')}</div>

  <h2>Escopo e premissas</h2>
  <div class="grid-2">${(['includedScope', 'excludedScope'] as CharterTextField[]).map(field).join('')}</div>
  <div class="stack" style="margin-top:14px">${field('assumptionsAndConstraints')}</div>

  <h2>Equipe de trabalho</h2>
  <table><thead><tr><th>Papel</th><th>Nome</th><th>Cargo</th><th>Área / Empresa</th></tr></thead><tbody>${teamRows}</tbody></table>

  <h2>Requisitos e valor para o negócio</h2>
  <div class="stack">${(['customerRequirements', 'businessContributions'] as CharterTextField[]).map(field).join('')}</div>
  <div class="grid-2" style="margin-top:14px">${(['businessContributionsQuantitative', 'businessContributionsQualitative', 'financialGainValue', 'financialInformation'] as CharterTextField[]).map(field).join('')}</div>
</body></html>`;
}

function exportProjectCharterPdf(charter: ProjectCharterDraft, projectName: string) {
  const printWindow = window.open('', '_blank', 'width=960,height=1080');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildProjectCharterPrintDocument(charter, projectName));
  printWindow.document.close();
  printWindow.focus();
}

function buildSipocPrintDocument(sipoc: DmaicSipoc, projectName: string): string {
  const cell = (value: string) => {
    const lines = sipocCellLines(value);
    return lines.length > 0 ? `<ul>${lines.map((item) => `<li>${escapeCharterHtml(item)}</li>`).join('')}</ul>` : '<p class="empty">Não preenchido</p>';
  };
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>SIPOC - ${escapeCharterHtml(projectName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; margin: 0; padding: 36px 44px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #78716c; margin: 28px 0 12px; border-bottom: 1px solid #e7e5e4; padding-bottom: 6px; }
  p { font-size: 12.5px; line-height: 1.5; margin: 0; }
  ul { margin: 0; padding-left: 16px; font-size: 11px; line-height: 1.5; }
  li { margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #78716c; margin: 0 0 8px; }
  .empty { color: #a8a29e; font-style: italic; font-size: 11px; margin: 0; }
  table.sipoc-table { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }
  table.sipoc-table th, table.sipoc-table td { border: 1px solid #e7e5e4; padding: 10px 12px; text-align: left; vertical-align: top; }
  table.sipoc-table th { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
  table.sipoc-table th.suppliers { background: #fef3c7; color: #92400e; }
  table.sipoc-table th.inputs { background: #cffafe; color: #155e75; }
  table.sipoc-table th.process { background: #e0e7ff; color: #3730a3; }
  table.sipoc-table th.outputs { background: #fef9c3; color: #854d0e; }
  table.sipoc-table th.customers { background: #fce7f3; color: #9d174d; }
  table.sipoc-table td.process-cell { font-weight: 700; font-size: 12px; }
  table.sipoc-table tbody tr:nth-child(even) td { background: #fafaf9; }
  .print-bar { position: sticky; top: 0; display: flex; justify-content: flex-end; margin: -36px -44px 24px; padding: 12px 44px; background: #fafaf9; border-bottom: 1px solid #e7e5e4; }
  .print-bar button { font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; border: 1px solid #1c1917; background: #1c1917; color: #fff; cursor: pointer; }
  @page { margin: 16mm; }
  @media print { .print-bar { display: none; } body { padding: 0 8mm; } table.sipoc-table tr { break-inside: avoid; } }
</style></head>
<body>
  <div class="print-bar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>
  <h1>SIPOC</h1>
  <p class="subtitle">${escapeCharterHtml(projectName)} &middot; gerado em ${new Date().toLocaleDateString('pt-BR')}</p>

  <h2>Fornecedores &rarr; Entradas &rarr; Processo &rarr; Saídas &rarr; Clientes</h2>
  <table class="sipoc-table">
    <thead><tr><th class="suppliers">Fornecedores</th><th class="inputs">Entradas</th><th class="process">Processo</th><th class="outputs">Saídas</th><th class="customers">Clientes</th></tr></thead>
    <tbody>
      ${sipoc.length > 0 ? sipoc.map((row) => `<tr><td>${cell(row.suppliers)}</td><td>${cell(row.inputs)}</td><td class="process-cell">${row.process.trim() ? escapeCharterHtml(row.process.trim()) : '<span class="empty">Não preenchido</span>'}</td><td>${cell(row.outputs)}</td><td>${cell(row.customers)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty" style="text-align:center;padding:20px;">Nenhuma etapa preenchida ainda.</td></tr>'}
    </tbody>
  </table>
</body></html>`;
}

function exportSipocPdf(sipoc: DmaicSipoc, projectName: string) {
  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildSipocPrintDocument(sipoc, projectName));
  printWindow.document.close();
  printWindow.focus();
}

const VOC_CLIENT_TYPE_LABELS: Record<DmaicVocCqt['clientType'], string> = { external: 'Externo · Voz do Consumidor', internal: 'Interno · Voz do Negócio' };
const VOC_SOURCE_TYPE_LABELS: Record<DmaicVocCqt['sourceType'], string> = { active: 'Fonte ativa', reactive: 'Fonte reativa' };

function buildVocPrintDocument(rows: DmaicVocCqt[], projectName: string): string {
  const rowHtml = rows.map((row, index) => `<tr>
    <td>${escapeCharterHtml(row.vocNeed) || '—'}</td>
    <td><span class="tag">${escapeCharterHtml(VOC_CLIENT_TYPE_LABELS[row.clientType])}</span><br />${escapeCharterHtml(row.client) || '—'}</td>
    <td><span class="tag muted">${escapeCharterHtml(VOC_SOURCE_TYPE_LABELS[row.sourceType])}</span><br />${escapeCharterHtml(row.source) || '—'}</td>
    <td>${escapeCharterHtml(row.directioner) || '—'}<div class="sub"><strong>Dor / hipótese:</strong> ${escapeCharterHtml(row.issue) || '—'}</div></td>
    <td><strong>CTQ:</strong> ${escapeCharterHtml(row.ctq) || '—'}<div class="sub"><strong>CTP:</strong> ${escapeCharterHtml(row.ctp) || '—'}</div><div class="sub"><strong>Medida:</strong> ${escapeCharterHtml(row.measure) || '—'}</div><div class="sub"><strong>Métrica:</strong> ${escapeCharterHtml(row.ctqMetric) || '—'}</div></td>
  </tr>`).join('');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>VOC &rarr; CTQ - ${escapeCharterHtml(projectName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; margin: 0; padding: 36px 44px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p { font-size: 12.5px; line-height: 1.5; margin: 0; }
  .subtitle { font-size: 12px; color: #78716c; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
  th, td { border: 1px solid #e7e5e4; padding: 8px; text-align: left; vertical-align: top; word-wrap: break-word; }
  th { background: #f5f5f4; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; color: #78716c; }
  .sub { margin-top: 5px; font-size: 10.5px; color: #57534e; }
  .tag { display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: #047857; margin-bottom: 3px; }
  .tag.muted { color: #78716c; }
  .empty { color: #a8a29e; font-style: italic; text-align: center; padding: 24px; }
  .print-bar { position: sticky; top: 0; display: flex; justify-content: flex-end; margin: -36px -44px 24px; padding: 12px 44px; background: #fafaf9; border-bottom: 1px solid #e7e5e4; }
  .print-bar button { font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; border: 1px solid #1c1917; background: #1c1917; color: #fff; cursor: pointer; }
  @page { size: A4 landscape; margin: 14mm; }
  @media print { .print-bar { display: none; } body { padding: 0 6mm; } }
</style></head>
<body>
  <div class="print-bar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>
  <h1>VOC &rarr; CTQ</h1>
  <p class="subtitle">${escapeCharterHtml(projectName)} &middot; gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  <table>
    <thead><tr><th style="width:18%">Necessidade (VOC)</th><th style="width:18%">Cliente</th><th style="width:18%">Fonte</th><th style="width:20%">Direcionador</th><th style="width:26%">CTQ / CTP / Medida</th></tr></thead>
    <tbody>${rowHtml || '<tr><td colspan="5" class="empty">Nenhum indicador registrado</td></tr>'}</tbody>
  </table>
</body></html>`;
}

function exportVocPdf(rows: DmaicVocCqt[], projectName: string) {
  const printWindow = window.open('', '_blank', 'width=1200,height=850');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildVocPrintDocument(rows, projectName));
  printWindow.document.close();
  printWindow.focus();
}

const PRINT_DOCUMENT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; margin: 0; padding: 36px 44px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #78716c; margin: 28px 0 12px; border-bottom: 1px solid #e7e5e4; padding-bottom: 6px; }
  p { font-size: 12.5px; line-height: 1.5; margin: 0; }
  .subtitle { font-size: 12px; color: #78716c; margin: 0 0 16px; }
  .empty { color: #a8a29e; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 4px; }
  th, td { border: 1px solid #e7e5e4; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f5f5f4; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #78716c; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 4px; }
  .stat { border: 1px solid #e7e5e4; border-radius: 8px; padding: 10px 12px; break-inside: avoid; }
  .stat .label { font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; color: #78716c; }
  .stat .value { font-size: 15px; font-weight: 700; margin-top: 3px; font-family: 'Courier New', monospace; }
  .note { margin-top: 10px; }
  .chart-grid { display: grid; grid-template-columns: 1.35fr .85fr; gap: 14px; margin-top: 4px; }
  .chart-card { border: 1px solid #e7e5e4; border-radius: 10px; padding: 12px; break-inside: avoid; }
  .chart-card h4 { font-size: 12px; font-weight: 700; margin: 0 0 8px; }
  .chart-card svg { width: 100%; height: auto; display: block; }
  .bar-row { display: grid; grid-template-columns: minmax(0,1fr) 52px; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 11px; }
  .bar-track { grid-column: 1 / 2; height: 9px; border-radius: 5px; background: #f0ece4; overflow: hidden; margin-top: 3px; }
  .bar-fill { height: 100%; border-radius: 5px; background: #f5a029; }
  .bar-count { text-align: right; font-weight: 700; font-family: 'Courier New', monospace; }
  @media print { .chart-grid { grid-template-columns: 1.35fr .85fr; } }
  .print-bar { position: sticky; top: 0; display: flex; justify-content: flex-end; margin: -36px -44px 24px; padding: 12px 44px; background: #fafaf9; border-bottom: 1px solid #e7e5e4; }
  .print-bar button { font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; border: 1px solid #1c1917; background: #1c1917; color: #fff; cursor: pointer; }
  @page { margin: 16mm; }
  @media print { .print-bar { display: none; } body { padding: 0 8mm; } }
`;

function buildExploratoryLineChartSvg(summary: ExploratorySummary, indicator: string): string {
  const width = 700;
  const height = 230;
  const padding = { top: 18, right: 18, bottom: 40, left: 64 };
  const values = summary.points.map((point) => point.value);
  const minimum = Math.min(...values, summary.mean);
  const maximum = Math.max(...values, summary.mean);
  const range = Math.max(maximum - minimum, 1);
  const xFor = (index: number) => padding.left + (index / Math.max(values.length - 1, 1)) * (width - padding.left - padding.right);
  const yFor = (value: number) => padding.top + (1 - (value - minimum) / range) * (height - padding.top - padding.bottom);
  const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ');
  const labels = [0, Math.floor((values.length - 1) / 2), values.length - 1].filter((value, index, list) => list.indexOf(value) === index);
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, tickIndex) => minimum + (range * tickIndex) / yTickCount);
  const baselineY = height - padding.bottom;
  const yTicksSvg = yTicks.map((tick) => `<line x1="${padding.left}" x2="${width - padding.right}" y1="${yFor(tick)}" y2="${yFor(tick)}" stroke="#e7e5e4" stroke-width="1" /><text x="${padding.left - 8}" y="${yFor(tick) + 3}" text-anchor="end" font-size="10" fill="#78716c">${escapeCharterHtml(formatMetric(tick))}</text>`).join('');
  const pointsSvg = summary.points.map((point, index) => `<circle cx="${xFor(index)}" cy="${yFor(point.value)}" r="3.8" fill="#3e99a8"><title>${escapeCharterHtml(`${point.period}: ${formatMetric(point.value)}`)}</title></circle>`).join('');
  const labelsSvg = labels.map((index) => `<line x1="${xFor(index)}" x2="${xFor(index)}" y1="${baselineY}" y2="${baselineY + 4}" stroke="#e7e5e4" stroke-width="1" /><text x="${xFor(index)}" y="${height - 10}" text-anchor="${index === 0 ? 'start' : index === values.length - 1 ? 'end' : 'middle'}" font-size="10" fill="#78716c">${escapeCharterHtml(summary.points[index].period)}</text>`).join('');
  return `<div class="chart-card"><h4>${escapeCharterHtml(indicator)} ao longo do período &middot; ${summary.points.length} pontos</h4><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeCharterHtml(`Série temporal de ${indicator}`)}">
    ${yTicksSvg}
    <line x1="${padding.left}" x2="${padding.left}" y1="${padding.top}" y2="${baselineY}" stroke="#e7e5e4" stroke-width="1" />
    <line x1="${padding.left}" x2="${width - padding.right}" y1="${baselineY}" y2="${baselineY}" stroke="#e7e5e4" stroke-width="1" />
    <line x1="${padding.left}" x2="${width - padding.right}" y1="${yFor(summary.mean)}" y2="${yFor(summary.mean)}" stroke="#f5a029" stroke-dasharray="5 5" />
    <polyline fill="none" stroke="#3e99a8" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${points}" />
    ${pointsSvg}
    <text x="${width - padding.right}" y="${yFor(summary.mean) - 7}" text-anchor="end" font-size="10" fill="#b3781f">média ${escapeCharterHtml(formatMetric(summary.mean))}</text>
    ${labelsSvg}
  </svg></div>`;
}

function buildExploratoryBoxPlotSvg(summary: ExploratorySummary, indicator: string): string {
  const width = 420;
  const height = 250;
  const plotTop = 22;
  const plotBottom = 220;
  const range = Math.max(summary.maximum - summary.minimum, 1);
  const yFor = (value: number) => plotBottom - ((value - summary.minimum) / range) * (plotBottom - plotTop);
  const x = 150;
  const labelsSvg = ([['Máximo', summary.maximum], ['Q3', summary.q3], ['Mediana', summary.median], ['Q1', summary.q1], ['Mínimo', summary.minimum]] as [string, number][]).map(([label, value]) => `<text x="${x + 58}" y="${yFor(value) + 4}" font-size="10" fill="#78716c">${escapeCharterHtml(label)} &middot; ${escapeCharterHtml(formatMetric(value))}</text>`).join('');
  return `<div class="chart-card"><h4>Boxplot de ${escapeCharterHtml(indicator)}</h4><svg viewBox="0 0 ${width} ${height + 26}" role="img" aria-label="${escapeCharterHtml(`Boxplot de ${indicator}`)}">
    <line x1="${x}" x2="${x}" y1="${yFor(summary.minimum)}" y2="${yFor(summary.maximum)}" stroke="#329a77" stroke-width="2" />
    <line x1="${x - 25}" x2="${x + 25}" y1="${yFor(summary.minimum)}" y2="${yFor(summary.minimum)}" stroke="#329a77" stroke-width="2" />
    <line x1="${x - 25}" x2="${x + 25}" y1="${yFor(summary.maximum)}" y2="${yFor(summary.maximum)}" stroke="#329a77" stroke-width="2" />
    <rect x="${x - 42}" y="${yFor(summary.q3)}" width="84" height="${Math.max(yFor(summary.q1) - yFor(summary.q3), 3)}" rx="6" fill="#329a7730" stroke="#329a77" stroke-width="2" />
    <line x1="${x - 42}" x2="${x + 42}" y1="${yFor(summary.median)}" y2="${yFor(summary.median)}" stroke="#f5a029" stroke-width="3" />
    ${labelsSvg}
  </svg></div>`;
}

function buildInputDataPrintDocument(dataset: InputDataset, analysis: IndicatorAnalysis | null, months: number, diagnosis: string | null, projectName: string): string {
  const stat = (label: string, value: string) => `<div class="stat"><p class="label">${escapeCharterHtml(label)}</p><p class="value">${escapeCharterHtml(value)}</p></div>`;
  const overviewStats = [
    stat('Arquivo', dataset.fileName),
    stat('Linhas', String(dataset.rows.length)),
    stat('Colunas', String(dataset.headers.length)),
    stat('Coluna de data', dataset.dateColumn ?? 'Não identificada'),
  ].join('');
  const exploratorySummary = analysis && analysis.kind === 'continuous' ? buildExploratorySummary(dataset, analysis, months) : null;
  const analysisSection = !analysis
    ? '<p class="empty">Nenhum indicador selecionado.</p>'
    : analysis.kind === 'continuous'
      ? `<div class="stat-grid">${[
          stat('Média', formatMetric(analysis.mean)),
          stat('Mediana', formatMetric(analysis.median)),
          stat('Mínimo', formatMetric(analysis.minimum)),
          stat('Máximo', formatMetric(analysis.maximum)),
          stat('Desvio-padrão', formatMetric(analysis.standardDeviation)),
          stat('Normalidade', analysis.normality),
        ].join('')}</div><p class="note">${escapeCharterHtml(analysis.normalityDetail)}</p>${exploratorySummary ? `<div class="chart-grid" style="margin-top:14px">${buildExploratoryLineChartSvg(exploratorySummary, analysis.indicator)}${buildExploratoryBoxPlotSvg(exploratorySummary, analysis.indicator)}</div>` : ''}`
      : `<div class="stat-grid">${[
          stat('Categoria dominante', analysis.topCategory),
          stat('Ocorrências', String(analysis.topCategoryCount)),
          stat('Categorias', String(analysis.categoryCount)),
        ].join('')}</div><div class="chart-card" style="margin-top:10px"><h4>Distribuição por categoria</h4>${analysis.distribution.map((item) => `<div class="bar-row"><div><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:2px"><strong>${escapeCharterHtml(item.label)}</strong><span>${item.percentage.toFixed(1)}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${item.percentage}%"></div></div></div><span class="bar-count">${item.count}</span></div>`).join('')}</div>`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>Dados para análise - ${escapeCharterHtml(projectName)}</title>
<style>${PRINT_DOCUMENT_STYLES}</style></head>
<body>
  <div class="print-bar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>
  <h1>Dados para análise</h1>
  <p class="subtitle">${escapeCharterHtml(projectName)} &middot; gerado em ${new Date().toLocaleDateString('pt-BR')}</p>

  <h2>Conjunto de dados carregado</h2>
  <div class="stat-grid">${overviewStats}</div>
  <p class="note"><strong>Indicadores disponíveis:</strong> ${dataset.indicatorColumns.map(escapeCharterHtml).join(', ') || '—'}</p>

  <h2>Resumo do indicador${analysis ? ` &middot; ${escapeCharterHtml(analysis.indicator)}` : ''}</h2>
  <p class="note">${analysis ? `${analysis.rows} observações &middot; ${dataset.dateColumn ? `últimos ${months} meses` : 'sem coluna de período'} &middot; indicador ${analysis.kind === 'continuous' ? 'contínuo' : 'discreto'}` : ''}</p>
  <div style="margin-top:10px">${analysisSection}</div>
  ${exploratorySummary ? `<h2>Diagnóstico detalhado com IA</h2>${diagnosis
      ? diagnosis.split(/\n{2,}/).map((paragraph) => `<p class="note">${escapeCharterHtml(paragraph.trim())}</p>`).join('')
      : '<p class="empty">Nenhum diagnóstico detalhado foi gerado com IA para esta leitura.</p>'}` : ''}
</body></html>`;
}

function exportInputDataPdf(dataset: InputDataset, analysis: IndicatorAnalysis | null, months: number, diagnosis: string | null, projectName: string) {
  const printWindow = window.open('', '_blank', 'width=1000,height=900');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildInputDataPrintDocument(dataset, analysis, months, diagnosis, projectName));
  printWindow.document.close();
  printWindow.focus();
}

function buildExploratoryPrintDocument(summary: ExploratorySummary, indicator: string, diagnosis: string | null, projectName: string): string {
  const stat = (label: string, value: string) => `<div class="stat"><p class="label">${escapeCharterHtml(label)}</p><p class="value">${escapeCharterHtml(value)}</p></div>`;
  const statGrid = [
    stat('Mínimo', formatMetric(summary.minimum)),
    stat('Q1 · 25%', formatMetric(summary.q1)),
    stat('Mediana', formatMetric(summary.median)),
    stat('Q3 · 75%', formatMetric(summary.q3)),
    stat('Máximo', formatMetric(summary.maximum)),
    stat('IQR', formatMetric(summary.iqr)),
    stat('Desvio-padrão', formatMetric(summary.standardDeviation)),
    stat('p Shapiro–Wilk', summary.shapiroPValue === null ? 'Indisponível' : formatMetric(summary.shapiroPValue)),
  ].join('');
  const diagnosisHtml = diagnosis
    ? diagnosis.split(/\n{2,}/).map((paragraph) => `<p class="note">${escapeCharterHtml(paragraph.trim())}</p>`).join('')
    : '<p class="empty">Nenhum diagnóstico detalhado foi gerado com IA para esta leitura.</p>';
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>Análise Exploratória & Estatística Descritiva - ${escapeCharterHtml(projectName)}</title>
<style>${PRINT_DOCUMENT_STYLES}</style></head>
<body>
  <div class="print-bar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>
  <h1>Análise Exploratória & Estatística Descritiva</h1>
  <p class="subtitle">${escapeCharterHtml(projectName)} &middot; ${escapeCharterHtml(indicator)} &middot; ${summary.points.length} observações &middot; gerado em ${new Date().toLocaleDateString('pt-BR')}</p>

  <h2>Gráficos</h2>
  <div class="chart-grid">${buildExploratoryLineChartSvg(summary, indicator)}${buildExploratoryBoxPlotSvg(summary, indicator)}</div>

  <h2>Estatística descritiva</h2>
  <div class="stat-grid">${statGrid}</div>

  <h2>Leitura da distribuição</h2>
  <p class="note"><strong>25% inferiores:</strong> a região entre ${formatMetric(summary.minimum)} e ${formatMetric(summary.q1)} representa aproximadamente o quarto inferior das observações.</p>
  <p class="note"><strong>25% superiores:</strong> a região entre ${formatMetric(summary.q3)} e ${formatMetric(summary.maximum)} representa aproximadamente o quarto superior das observações.</p>
  <p class="note"><strong>Teste de normalidade:</strong> ${escapeCharterHtml(summary.shapiroDetail)}${summary.shapiroPValue !== null ? ` &middot; ${summary.shapiroPValue >= 0.05 ? 'Não há evidência suficiente para rejeitar normalidade.' : 'Há evidência de desvio da normalidade.'}` : ''}</p>

  <h2>Diagnóstico detalhado com IA</h2>
  ${diagnosisHtml}
</body></html>`;
}

function exportExploratoryPdf(summary: ExploratorySummary, indicator: string, diagnosis: string | null, projectName: string) {
  const printWindow = window.open('', '_blank', 'width=1000,height=900');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildExploratoryPrintDocument(summary, indicator, diagnosis, projectName));
  printWindow.document.close();
  printWindow.focus();
}

function GenericPreview({ tool, pipeline }: { tool: Tool; pipeline: DmaicPipeline | null }) {
  const first = (items: Record<string, string>[]) => Object.entries(items[0] ?? {}).map(([label, value]) => [label, value] as [string, string]);
  const generatedRows = pipeline ? tool.id === 'charter' ? Object.entries(pipeline.projectCharter).map(([field, value]) => [AI_PROJECT_CHARTER_PREVIEW_LABELS[field as keyof DmaicCharter] ?? field, value] as [string, string]) : tool.id === 'voc' ? Object.entries(pipeline.vocCtq[0] ?? {}) : tool.id === 'msa' ? first(pipeline.msaValidation) : tool.id === 'vitalx' ? first(pipeline.vitalXs) : tool.id === 'gut' ? first(pipeline.gutPrioritization) : tool.id === 'solutions' ? first(pipeline.actionPlan) : tool.id === 'control-plan' ? first(pipeline.controlPlan) : Object.entries(pipeline.indicatorsY) : null;
  const rows = generatedRows?.length ? generatedRows : tool.id === 'charter' ? [['Objetivo', 'Reduzir o lead time total'], ['Meta', 'De 18,4 para 11,0 min'], ['Dono do processo', 'Operações de crédito'], ['Prazo', '30 jun 2024']] : tool.id === 'voc' ? [['Cliente', 'Solicitante interno'], ['Necessidade', 'Resposta previsível'], ['CTQ', 'Tempo de aprovação'], ['Limite', '≤ 11 min']] : tool.id === 'msa' ? [['Método', 'Gage R&R simplificado'], ['Repetibilidade', '2,1%'], ['Reprodutibilidade', '3,4%'], ['Veredito', 'Sistema aceitável']] : [['Critério', 'Definição inicial'], ['Responsável', 'Time do projeto'], ['Evidência', 'Registro operacional'], ['Próxima revisão', '06 jun 2024']];
   return <div><div className="mb-5 flex items-start justify-between"><div><p className="mono-label text-primary">{pipeline ? 'Saída do pipeline' : 'Snapshot de trabalho'}</p><h3 className="mt-2 font-serif text-lg font-bold">{tool.title} / leitura rápida</h3><p className="mt-1 text-xs text-muted-foreground">{pipeline ? 'Artefato estruturado a partir do problema informado.' : 'Exemplo preenchido para orientar o time.'}</p></div><Check size={20} className="text-primary" /></div><div className="overflow-hidden rounded-xl border border-border">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[42%_58%] border-b border-border last:border-0"><div className="break-words bg-muted/55 p-3 text-[11px] font-bold text-muted-foreground">{label}</div><div className="break-words p-3 text-xs font-semibold">{value}</div></div>)}</div><div className="mt-5 rounded-xl bg-primary/7 p-4"><div className="flex gap-3"><Sparkles size={16} className="shrink-0 text-primary" /><p className="text-xs leading-relaxed"><strong>Leitura do facilitador:</strong> {pipeline ? 'revise e valide os artefatos com o time antes de tratar as hipóteses como evidência.' : 'a estrutura está suficientemente clara para a próxima conversa do time.'}</p></div></div></div>;
}

function DataNotes({ tool, pareto, imr, source }: { tool: Tool; pareto: { name: string; value: number }[] | null; imr: number[] | null; source: 'example' | 'upload' }) {
  const sourceDetail = tool.id === 'pareto' ? `${pareto?.length ?? 0} categorias · ${pareto?.reduce((sum, item) => sum + item.value, 0) ?? 0} ocorrências` : tool.id === 'imr' ? `${imr?.length ?? 0} observações sequenciais · coluna numérica` : 'Artefato orientativo do workspace';
  return <div><p className="mono-label text-primary">Notas do método</p><h3 className="mt-2 font-serif text-lg font-bold">Como ler este resultado</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{source === 'upload' ? 'Esta visualização usa o indicador selecionado do CSV e é calculada localmente no navegador.' : 'Esta visualização usa dados de exemplo e cálculos executados localmente. Troque o arquivo no bloco de upload para explorar seu próprio processo sem enviar dados para um servidor.'}</p><div className="mt-5 space-y-3"><div className="rounded-xl border border-border p-4"><div className="flex gap-3"><Database size={16} className="mt-0.5 text-primary" /><div><p className="text-xs font-bold">Fonte</p><p className="mt-1 text-[11px] text-muted-foreground">{sourceDetail}</p></div></div></div><div className="rounded-xl border border-border p-4"><div className="flex gap-3"><ClipboardCheck size={16} className="mt-0.5 text-chart-3" /><div><p className="text-xs font-bold">Próxima pergunta</p><p className="mt-1 text-[11px] text-muted-foreground">O padrão se mantém quando o time muda o turno ou o volume de entrada?</p></div></div></div></div></div>;
}

// hint: Structural and logic conflict. Both design and behavior differ.
function Workspace() {
  const pipelineMutation = useRunDmaicPipeline();
  const [initialLocalDraft] = useState<WorkspaceLocalDraft | null>(() => readWorkspaceLocalDraft());
  const workspaceQuery = useGetDmaicWorkspace(initialLocalDraft?.projectKey ? { projectKey: initialLocalDraft.projectKey } : undefined);
  const workspacesQuery = useListDmaicWorkspaces();
  const workspaceMutation = useSaveDmaicWorkspace();
  const [area, setArea] = useState<Area>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [statement, setStatement] = useState(() => initialLocalDraft?.statement ?? DEFAULT_PROBLEM_STATEMENT);
  const [projectKey, setProjectKey] = useState<number | null>(() => initialLocalDraft?.projectKey ?? null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(() => initialLocalDraft?.projectKey ? String(initialLocalDraft.projectKey) : '');
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectLoadedMessage, setProjectLoadedMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [charter, setCharter] = useState<ProjectCharterDraft>(() => initialLocalDraft?.charter ?? createProjectCharterDraft());
  const [charterSaved, setCharterSaved] = useState(false);
  const [manualVocSaved, setManualVocSaved] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceConflict, setWorkspaceConflict] = useState<{ latest: DmaicWorkspace; source: WorkspaceSaveSource } | null>(null);
  const [localDraftConflict, setLocalDraftConflict] = useState<{ local: WorkspaceLocalDraft; latest: DmaicWorkspace } | null>(null);
  const [localDraftRecovered, setLocalDraftRecovered] = useState(Boolean(initialLocalDraft));
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineDone, setPipelineDone] = useState(() => Boolean(initialLocalDraft?.analysisArtifacts.pipeline));
  const [confirmedCharter, setConfirmedCharter] = useState<ProjectCharterDraft>(() => initialLocalDraft?.confirmedCharter ?? createProjectCharterDraft());
  const [aiCharterSuggestions, setAiCharterSuggestions] = useState<GeneratedCharterFields | null>(() => initialLocalDraft?.aiCharterSuggestions ?? null);
  const [pipelineData, setPipelineData] = useState<DmaicPipeline | null>(() => initialLocalDraft?.analysisArtifacts.pipeline ?? null);
  const [manualVocCtq, setManualVocCtq] = useState<DmaicVocCqt[]>(() => initialLocalDraft?.analysisArtifacts.manualVocCtq ?? []);
  const [manualVocCtqDirty, setManualVocCtqDirty] = useState(false);
  const [sipocDirty, setSipocDirty] = useState(false);
  const [sipocSaved, setSipocSaved] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [vitalId, setVitalId] = useState('x1');
  const [inputDataset, setInputDataset] = useState<InputDataset | null>(() => initialLocalDraft?.analysisArtifacts.dataset ?? null);
  const [analysisMonths, setAnalysisMonths] = useState(() => initialLocalDraft?.analysisArtifacts.analysisMonths ?? 12);
  const [selectedIndicator, setSelectedIndicator] = useState(() => initialLocalDraft?.analysisArtifacts.selectedIndicator ?? initialLocalDraft?.analysisArtifacts.dataset?.indicatorColumns[0] ?? '');
  const [exploratoryDiagnosis, setExploratoryDiagnosis] = useState<string | null>(() => initialLocalDraft?.analysisArtifacts.diagnosis ?? null);
  const [exploratoryDiagnosisInput, setExploratoryDiagnosisInput] = useState<DmaicExploratoryDiagnosisInput | null>(() => initialLocalDraft?.analysisArtifacts.diagnosisInput ?? null);
  const [pipelineAnalysisContext, setPipelineAnalysisContext] = useState<DmaicPipelineAnalysisContext | null>(() => initialLocalDraft?.analysisArtifacts.pipelineAnalysisContext ?? null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadVersionRef = useRef(0);
  const charterReviewVersionRef = useRef(0);
  const workspaceSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const workspaceSessionRef = useRef(0);
  const workspaceProjectKeyRef = useRef<number | null>(initialLocalDraft?.projectKey ?? null);
  const analysisDirtyRef = useRef(false);
  const workspaceRevisionRef = useRef(initialLocalDraft?.baseRevision ?? 0);
  const workspaceLocalDraftRef = useRef<WorkspaceLocalDraft | null>(initialLocalDraft);
  const draftWriteEnabledRef = useRef(Boolean(initialLocalDraft));
  const workspaceStateRef = useRef({ projectKey, statement, charter, confirmedCharter, aiCharterSuggestions });
  const displayArea = area === 'overview' ? 'overview' : area;
  const inputAnalysis = useMemo(() => inputDataset ? summarizeIndicator(inputDataset, selectedIndicator, analysisMonths) : null, [analysisMonths, inputDataset, selectedIndicator]);
  const pareto = useMemo(() => !inputDataset ? initialPareto : inputAnalysis?.kind === 'discrete' ? inputAnalysis.distribution.map((item) => ({ name: item.label, value: item.count })) : null, [inputAnalysis, inputDataset]);
  const imr = useMemo(() => !inputDataset ? initialImr : inputAnalysis?.kind === 'continuous' && inputAnalysis.values.length >= 2 ? inputAnalysis.values : null, [inputAnalysis, inputDataset]);
  const activeProjectName = projectKey ? (workspacesQuery.data?.find((project) => project.projectKey === projectKey)?.projectName ?? (charter.projectName.trim() || `Projeto #${projectKey}`)) : (charter.projectName.trim() || 'Novo projeto');
  const createAnalysisArtifacts = (): DmaicAnalysisArtifacts => {
    const exploratorySummary = inputDataset && inputAnalysis ? buildExploratorySummary(inputDataset, inputAnalysis, analysisMonths) : null;
    return {
      version: 1,
      dataset: inputDataset,
      analysisMonths,
      selectedIndicator,
      indicatorAnalysis: inputAnalysis,
      exploratorySummary,
      diagnosis: exploratoryDiagnosis,
      diagnosisInput: exploratoryDiagnosis ? exploratoryDiagnosisInput : null,
      pipelineAnalysisContext,
      pareto: inputDataset ? pareto ?? [] : [],
      imr: inputDataset ? imr ?? [] : [],
      pipeline: pipelineData,
      manualVocCtq,
    };
  };

  const writeCurrentLocalDraft = (revision = workspaceRevisionRef.current) => {
    const current = workspaceStateRef.current;
    const draft: WorkspaceLocalDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      baseRevision: revision,
      projectKey: current.projectKey,
      statement: current.statement,
      charter: current.charter,
      confirmedCharter: current.confirmedCharter,
      aiCharterSuggestions: current.aiCharterSuggestions,
      analysisArtifacts: createAnalysisArtifacts(),
    };
    workspaceLocalDraftRef.current = draft;
    storeWorkspaceLocalDraft(draft);
  };
  const applyWorkspaceSnapshot = (workspace: DmaicWorkspace) => {
    const draft = workspaceToLocalDraft(workspace);
    analysisDirtyRef.current = false;
    setProjectKey(draft.projectKey);
    workspaceProjectKeyRef.current = draft.projectKey;
    setStatement(draft.statement);
    setConfirmedCharter(draft.confirmedCharter);
    setCharter(draft.charter);
    setAiCharterSuggestions(draft.aiCharterSuggestions);
    setInputDataset(draft.analysisArtifacts.dataset);
    setAnalysisMonths(draft.analysisArtifacts.analysisMonths);
    setSelectedIndicator(draft.analysisArtifacts.selectedIndicator || draft.analysisArtifacts.dataset?.indicatorColumns[0] || '');
    setExploratoryDiagnosis(draft.analysisArtifacts.diagnosis);
    setExploratoryDiagnosisInput(draft.analysisArtifacts.diagnosisInput);
    setPipelineAnalysisContext(draft.analysisArtifacts.pipelineAnalysisContext ?? null);
    setPipelineData(draft.analysisArtifacts.pipeline);
    setManualVocCtq(draft.analysisArtifacts.manualVocCtq ?? []);
    setManualVocCtqDirty(false);
    setManualVocSaved(false);
    setSipocDirty(false);
    setSipocSaved(false);
    setPipelineDone(Boolean(draft.analysisArtifacts.pipeline));
    setCsvError(null);
    workspaceRevisionRef.current = workspace.revision;
  };

  useEffect(() => {
    workspaceStateRef.current = { projectKey, statement, charter, confirmedCharter, aiCharterSuggestions };
  }, [aiCharterSuggestions, charter, confirmedCharter, projectKey, statement]);

  useEffect(() => {
    if (!workspaceQuery.data || workspaceHydrated) return;
    const localDraft = workspaceLocalDraftRef.current;
    workspaceRevisionRef.current = workspaceQuery.data.revision;
    if (workspaceQuery.data.hasSavedData && localDraft && localDraft.baseRevision < workspaceQuery.data.revision) {
      applyWorkspaceSnapshot(workspaceQuery.data);
      setLocalDraftConflict({ local: localDraft, latest: workspaceQuery.data });
    } else if (workspaceQuery.data.hasSavedData && !localDraft) {
      applyWorkspaceSnapshot(workspaceQuery.data);
    } else if (workspaceQuery.data.hasSavedData && localDraft && !localDraft.projectKey) {
      const migratedDraft = { ...localDraft, projectKey: workspaceQuery.data.projectKey };
      setProjectKey(migratedDraft.projectKey);
      workspaceLocalDraftRef.current = migratedDraft;
      storeWorkspaceLocalDraft(migratedDraft);
      setLocalDraftRecovered(true);
    } else if (localDraft) {
      setLocalDraftRecovered(true);
    }
    setWorkspaceHydrated(true);
  }, [workspaceHydrated, workspaceQuery.data]);

  useEffect(() => {
    if (localDraftConflict || !draftWriteEnabledRef.current) return;
    writeCurrentLocalDraft();
  }, [aiCharterSuggestions, analysisMonths, charter, confirmedCharter, exploratoryDiagnosis, exploratoryDiagnosisInput, inputDataset, localDraftConflict, manualVocCtq, pipelineAnalysisContext, pipelineData, selectedIndicator, statement]);

  const queueWorkspaceSave = (
    attempt: WorkspaceSaveAttempt,
    callbacks: { onSuccess?: (savedWorkspace: DmaicWorkspace) => void; onConflict?: (latestWorkspace: DmaicWorkspace) => void; onError: () => void },
  ) => {
    if (analysisArtifactsSizeInBytes(attempt.data.analysisArtifacts) > MAX_ANALYSIS_ARTIFACT_BYTES) {
      setWorkspaceError('Os dados da análise excedem o limite de 3 MB. Reduza as colunas ou filtre o período do CSV antes de salvar.');
      return;
    }
    const targetProjectKey = workspaceProjectKeyRef.current;
    const targetRevision = attempt.expectedRevision === undefined ? workspaceRevisionRef.current : attempt.expectedRevision;
    const targetSession = workspaceSessionRef.current;
    const queuedSave = workspaceSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const useCurrentWorkspace = targetSession === workspaceSessionRef.current;
        const requestProjectKey = useCurrentWorkspace ? workspaceProjectKeyRef.current : targetProjectKey;
        const requestRevision = useCurrentWorkspace ? workspaceRevisionRef.current : targetRevision;
        const savedWorkspace = await workspaceMutation.mutateAsync({
          data: {
            ...(requestProjectKey ? { projectKey: requestProjectKey } : {}),
            ...attempt.data,
            expectedRevision: requestRevision,
          },
        });
        if (targetSession !== workspaceSessionRef.current) return savedWorkspace;
        workspaceRevisionRef.current = savedWorkspace.revision;
        workspaceProjectKeyRef.current = savedWorkspace.projectKey;
        setProjectKey(savedWorkspace.projectKey);
        void workspacesQuery.refetch();
        return savedWorkspace;
      });
    workspaceSaveQueueRef.current = queuedSave.then(() => undefined, () => undefined);
    void queuedSave.then((savedWorkspace) => {
      if (targetSession === workspaceSessionRef.current) callbacks.onSuccess?.(savedWorkspace);
    }).catch((error: unknown) => {
      if (targetSession !== workspaceSessionRef.current) return;
      const latestWorkspace = getWorkspaceConflict(error);
      if (latestWorkspace) {
        callbacks.onConflict?.(latestWorkspace);
        return;
      }
      callbacks.onError();
    });
  };

  const saveWorkspace = (source: WorkspaceSaveSource, expectedRevision?: number, analysisArtifactsOverride?: DmaicAnalysisArtifacts) => {
    if (statement.trim().length < 10) {
      setWorkspaceError('Descreva o problema com pelo menos 10 caracteres antes de salvar no Neon.');
      return;
    }
    if (source === 'charter') charterReviewVersionRef.current += 1;
    setWorkspaceError(null);
    setWorkspaceConflict(null);
    const charterToPersist = source === 'charter' ? charter : confirmedCharter;
    const analysisArtifacts = analysisArtifactsOverride ?? createAnalysisArtifacts();
    if (analysisArtifactsSizeInBytes(analysisArtifacts) > MAX_ANALYSIS_ARTIFACT_BYTES) {
      setWorkspaceError('Os dados da análise excedem o limite de 3 MB. Reduza as colunas ou filtre o período do CSV antes de salvar.');
      return;
    }
    const attempt: WorkspaceSaveAttempt = {
      source,
      charterToPersist,
      expectedRevision,
      data: {
        problemStatement: statement.trim(),
        projectCharterContext: toProjectCharterContext(charterToPersist),
        aiCharterSuggestions: source === 'charter' ? null : aiCharterSuggestions,
        analysisArtifacts,
      },
    };
    queueWorkspaceSave(
      attempt,
      {
        onSuccess: (savedWorkspace) => {
          if (source === 'statement') analysisDirtyRef.current = false;
          draftWriteEnabledRef.current = true;
          const current = workspaceStateRef.current;
          const updatedDraft: WorkspaceLocalDraft = {
            version: 1,
            savedAt: new Date().toISOString(),
            baseRevision: savedWorkspace.revision,
            projectKey: savedWorkspace.projectKey,
            statement: current.statement,
            charter: current.charter,
            confirmedCharter: source === 'charter' ? charterToPersist : current.confirmedCharter,
            aiCharterSuggestions: source === 'charter' ? null : current.aiCharterSuggestions,
            analysisArtifacts: analysisArtifactsOverride ?? createAnalysisArtifacts(),
          };
          workspaceLocalDraftRef.current = updatedDraft;
          storeWorkspaceLocalDraft(updatedDraft);
          if (source === 'statement') {
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2200);
          } else if (source === 'charter') {
            setConfirmedCharter(charterToPersist);
            setAiCharterSuggestions(null);
            setCharterSaved(true);
            window.setTimeout(() => setCharterSaved(false), 2200);
          } else if (source === 'voc') {
            setManualVocCtqDirty(false);
            setManualVocSaved(true);
          } else if (source === 'sipoc') {
            setSipocDirty(false);
            setSipocSaved(true);
          }
        },
        onConflict: (latestWorkspace) => setWorkspaceConflict({ latest: latestWorkspace, source }),
        onError: () => setWorkspaceError('Não foi possível salvar no Neon. Confirme a conexão e tente novamente.'),
      },
    );
  };
  const saveStatement = () => saveWorkspace('statement');
  const saveCharter = () => saveWorkspace('charter');
  const handleDiagnosisChange = (diagnosis: string | null, diagnosisInput: DmaicExploratoryDiagnosisInput) => {
    setExploratoryDiagnosis(diagnosis);
    setExploratoryDiagnosisInput(diagnosisInput);
    analysisDirtyRef.current = true;
    if (diagnosis && projectKey) saveWorkspace('statement', undefined, { ...createAnalysisArtifacts(), diagnosis, diagnosisInput });
  };
  useEffect(() => {
    if (!workspaceHydrated || !projectKey || !inputDataset || !analysisDirtyRef.current) return;
    saveWorkspace('statement');
  }, [analysisMonths, inputDataset, projectKey, selectedIndicator, workspaceHydrated]);
  const applyLatestWorkspace = (latestWorkspace: DmaicWorkspace) => {
    applyWorkspaceSnapshot(latestWorkspace);
    setWorkspaceConflict(null);
    setWorkspaceError(null);
  };
  const useLatestWorkspace = () => {
    if (workspaceConflict) applyLatestWorkspace(workspaceConflict.latest);
  };
  const overwriteLatestWorkspace = () => {
    if (workspaceConflict) saveWorkspace(workspaceConflict.source, workspaceConflict.latest.revision);
  };
  const useServerVersionForLocalDraft = () => {
    if (!localDraftConflict) return;
    const serverDraft = workspaceToLocalDraft(localDraftConflict.latest);
    applyWorkspaceSnapshot(localDraftConflict.latest);
    draftWriteEnabledRef.current = true;
    workspaceLocalDraftRef.current = serverDraft;
    storeWorkspaceLocalDraft(serverDraft);
    setLocalDraftConflict(null);
    setLocalDraftRecovered(false);
    setWorkspaceError(null);
  };
  const recoverLocalDraft = () => {
    if (!localDraftConflict) return;
    const recoveredDraft: WorkspaceLocalDraft = {
      ...localDraftConflict.local,
      savedAt: new Date().toISOString(),
      baseRevision: localDraftConflict.latest.revision,
      projectKey: localDraftConflict.local.projectKey ?? localDraftConflict.latest.projectKey,
    };
    setProjectKey(recoveredDraft.projectKey);
    workspaceProjectKeyRef.current = recoveredDraft.projectKey;
    setStatement(recoveredDraft.statement);
    setCharter(recoveredDraft.charter);
    setConfirmedCharter(recoveredDraft.confirmedCharter);
    setAiCharterSuggestions(recoveredDraft.aiCharterSuggestions);
    setInputDataset(recoveredDraft.analysisArtifacts.dataset);
    setAnalysisMonths(recoveredDraft.analysisArtifacts.analysisMonths);
    setSelectedIndicator(recoveredDraft.analysisArtifacts.selectedIndicator || recoveredDraft.analysisArtifacts.dataset?.indicatorColumns[0] || '');
    setExploratoryDiagnosis(recoveredDraft.analysisArtifacts.diagnosis);
    setExploratoryDiagnosisInput(recoveredDraft.analysisArtifacts.diagnosisInput);
    setPipelineAnalysisContext(recoveredDraft.analysisArtifacts.pipelineAnalysisContext ?? null);
    setPipelineData(recoveredDraft.analysisArtifacts.pipeline);
    setManualVocCtq(recoveredDraft.analysisArtifacts.manualVocCtq ?? []);
    setManualVocCtqDirty(false);
    setManualVocSaved(false);
    setSipocDirty(false);
    setSipocSaved(false);
    setPipelineDone(Boolean(recoveredDraft.analysisArtifacts.pipeline));
    workspaceRevisionRef.current = recoveredDraft.baseRevision;
    draftWriteEnabledRef.current = true;
    workspaceLocalDraftRef.current = recoveredDraft;
    storeWorkspaceLocalDraft(recoveredDraft);
    setLocalDraftConflict(null);
    setLocalDraftRecovered(true);
    setWorkspaceError(null);
  };
  const updateStatement = (value: string) => {
    draftWriteEnabledRef.current = true;
    setStatement(value);
  };
  const updateCharter = (field: CharterTextField, value: string) => {
    draftWriteEnabledRef.current = true;
    setCharter((current) => ({ ...current, [field]: value }));
  };
  const updateCharterTeam = (role: CharterTeamRole, field: keyof CharterTeamMember, value: string) => {
    draftWriteEnabledRef.current = true;
    setCharter((current) => ({ ...current, team: { ...current.team, [role]: { ...current.team[role], [field]: value } } }));
  };
  const updateAnalysisMonths = (months: number) => {
    analysisDirtyRef.current = true;
    setAnalysisMonths(months);
  };
  const updateSelectedIndicator = (indicator: string) => {
    analysisDirtyRef.current = true;
    setSelectedIndicator(indicator);
  };
  const updateManualVocCtq = (rows: DmaicVocCqt[]) => {
    setManualVocCtq(rows);
    setManualVocCtqDirty(true);
    setManualVocSaved(false);
  };
  const saveManualVocCtq = () => {
    const invalidRow = manualVocCtq.find((row) => getManualVocValidationMessage(row));
    if (invalidRow) {
      setWorkspaceError(getManualVocValidationMessage(invalidRow) ?? 'Revise os campos do indicador manual antes de salvar.');
      return;
    }
    saveWorkspace('voc');
  };
  const updateSipoc = (next: DmaicSipoc) => {
    setPipelineData((prev) => prev ? { ...prev, sipoc: next } : prev);
    setSipocDirty(true);
    setSipocSaved(false);
  };
  const saveSipoc = () => {
    if (!pipelineData) return;
    saveWorkspace('sipoc');
  };
  const loadSelectedProject = async () => {
    const nextProjectKey = Number(selectedProjectKey);
    if (!Number.isSafeInteger(nextProjectKey) || nextProjectKey < 1 || projectLoading) return;
    const hasCurrentContent = Boolean(projectKey || statement.trim() || charter.projectName.trim());
    if (hasCurrentContent && !window.confirm('Carregar este projeto trocará o conteúdo que está na tela. Edições não salvas não serão mantidas. Deseja continuar?')) return;
    workspaceSessionRef.current += 1;
    setProjectLoading(true);
    setWorkspaceError(null);
    setProjectLoadedMessage(null);
    try {
      const loadedWorkspace = await getDmaicWorkspace({ projectKey: nextProjectKey });
      if (!loadedWorkspace.hasSavedData) throw new Error('Projeto não encontrado.');
      const loadedDraft = workspaceToLocalDraft(loadedWorkspace);
      applyWorkspaceSnapshot(loadedWorkspace);
      workspaceLocalDraftRef.current = loadedDraft;
      storeWorkspaceLocalDraft(loadedDraft);
      draftWriteEnabledRef.current = true;
      setWorkspaceHydrated(true);
      setWorkspaceConflict(null);
      setLocalDraftConflict(null);
      setLocalDraftRecovered(false);
      setPipelineError(null);
      setProjectLoadedMessage(`Projeto #${nextProjectKey} carregado do Neon.`);
      window.setTimeout(() => setProjectLoadedMessage(null), 2600);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Não foi possível carregar o projeto selecionado.');
    } finally {
      setProjectLoading(false);
    }
  };
  const startNewProject = () => {
    const hasCurrentContent = Boolean(projectKey || statement.trim() || charter.projectName.trim());
    if (hasCurrentContent && !window.confirm('Começar um novo projeto trocará o conteúdo que está na tela. Edições não salvas não serão mantidas. Deseja continuar?')) return;
    workspaceSessionRef.current += 1;
    const freshCharter = createProjectCharterDraft();
    setProjectKey(null);
    workspaceProjectKeyRef.current = null;
    analysisDirtyRef.current = false;
    setSelectedProjectKey('');
    setStatement('');
    setCharter(freshCharter);
    setConfirmedCharter(freshCharter);
    setAiCharterSuggestions(null);
    setPipelineData(null);
    setManualVocCtq([]);
    setManualVocCtqDirty(false);
    setManualVocSaved(false);
    setSipocDirty(false);
    setSipocSaved(false);
    setPipelineDone(false);
    setInputDataset(null);
    setAnalysisMonths(12);
    setSelectedIndicator('');
    setExploratoryDiagnosis(null);
    setExploratoryDiagnosisInput(null);
    setPipelineAnalysisContext(null);
    setCsvError(null);
    setPipelineError(null);
    setWorkspaceError(null);
    setWorkspaceConflict(null);
    setLocalDraftConflict(null);
    setLocalDraftRecovered(false);
    setProjectLoadedMessage('Novo projeto pronto para ser preenchido.');
    window.setTimeout(() => setProjectLoadedMessage(null), 2600);
    workspaceRevisionRef.current = 0;
    workspaceLocalDraftRef.current = null;
    draftWriteEnabledRef.current = false;
    setWorkspaceHydrated(true);
    if (typeof window !== 'undefined') window.localStorage.removeItem(WORKSPACE_DRAFT_STORAGE_KEY);
  };
  const startPipeline = () => {
    if (statement.trim().length < 10) {
      setPipelineError('Descreva o problema com pelo menos 10 caracteres para iniciar o pipeline.');
      return;
    }
    if (!projectKey) {
      setPipelineError('Salve o Problem Statement primeiro para criar o código numérico deste projeto no Neon.');
      return;
    }
    setPipelineError(null);
    setPipelineLoading(true);
    const generationReviewVersion = charterReviewVersionRef.current;
    const exploratorySummary = inputDataset && inputAnalysis ? buildExploratorySummary(inputDataset, inputAnalysis, analysisMonths) : null;
    const analysisContext = createPipelineAnalysisContext(
      inputAnalysis,
      exploratorySummary,
      analysisMonths,
      exploratoryDiagnosis,
      exploratoryDiagnosisInput,
    );
    pipelineMutation.mutate(
      {
        data: {
          problemStatement: statement.trim(),
          projectCharterContext: toProjectCharterContext(charter),
          analysisContext: analysisContext ?? undefined,
        },
      },
      {
        onSuccess: (data) => {
          if (generationReviewVersion !== charterReviewVersionRef.current) {
            setPipelineError('O Charter foi confirmado durante a geração. Inicie o pipeline novamente para usar a versão revisada.');
            return;
          }
          const generatedCharter = applyGeneratedCharterFields(charter, data.generatedCharter);
          setPipelineData(data);
          setPipelineAnalysisContext(analysisContext);
          setCharter(generatedCharter);
          setAiCharterSuggestions(data.generatedCharter);
          setPipelineDone(true);
          setArea('overview');
          queueWorkspaceSave(
            {
              source: 'suggestions',
              charterToPersist: charter,
              data: {
                problemStatement: statement.trim(),
                projectCharterContext: toProjectCharterContext(charter),
                aiCharterSuggestions: data.generatedCharter,
                analysisArtifacts: { ...createAnalysisArtifacts(), pipeline: data, pipelineAnalysisContext: analysisContext },
              },
            },
            {
              onConflict: (latestWorkspace) => setWorkspaceConflict({ latest: latestWorkspace, source: 'suggestions' }),
              onError: () => setWorkspaceError('As sugestões foram geradas, mas não puderam ser protegidas no Neon. Salve o Charter para tentar novamente.'),
            },
          );
        },
        onError: () => {
          setPipelineError('Não foi possível gerar o pipeline agora. A integração Gemini pode estar indisponível temporariamente; tente novamente em instantes.');
        },
        onSettled: () => setPipelineLoading(false),
      },
    );
  };
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploadVersion = uploadVersionRef.current + 1;
    uploadVersionRef.current = uploadVersion;
    const clearInputAnalysis = () => {
      setInputDataset(null);
      setSelectedIndicator('');
      setExploratoryDiagnosis(null);
      setExploratoryDiagnosisInput(null);
    };
    setCsvError(null);
    clearInputAnalysis();
    if (!file.name.toLowerCase().endsWith('.csv')) { clearInputAnalysis(); setCsvError('Use um arquivo com extensão .csv para calcular as análises.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (uploadVersion !== uploadVersionRef.current) return;
      try {
        const dataset = parseInputCsv(String(reader.result ?? ''), file.name);
        if (uploadVersion !== uploadVersionRef.current) return;
        analysisDirtyRef.current = true;
        setInputDataset(dataset);
        setSelectedIndicator(dataset.indicatorColumns[0]);
      } catch (error) {
        if (uploadVersion !== uploadVersionRef.current) return;
        clearInputAnalysis();
        setCsvError(error instanceof Error ? error.message : 'Não foi possível interpretar o CSV informado.');
      }
    };
    reader.onerror = () => {
      if (uploadVersion !== uploadVersionRef.current) return;
      clearInputAnalysis();
      setCsvError('O navegador não conseguiu ler este arquivo. Tente exportar o CSV novamente.');
    };
    reader.readAsText(file);
  };
  const retryUpload = () => { setCsvError(null); fileRef.current?.click(); };
  const openTool = (tool: Tool) => setSelectedTool(tool);
  return <div className="flex min-h-[100dvh] bg-background text-foreground">
    <Sidebar area={displayArea} setArea={setArea} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} activeProjectName={activeProjectName} />
    {mobileOpen && <button data-testid="button-sidebar-overlay" aria-label="Fechar menu" className="fixed inset-0 z-20 bg-sidebar/30 lg:hidden" onClick={() => setMobileOpen(false)} />}
    <div className="flex min-w-0 flex-1 flex-col"><Topbar area={displayArea} setMobileOpen={setMobileOpen} onStart={startPipeline} pipelineLoading={pipelineLoading} activeProjectName={activeProjectName} />
      <main className="dmaic-grid flex-1 overflow-x-hidden px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto max-w-[1240px]">
           {area === 'overview' && <SavedProjects projects={workspacesQuery.data ?? []} selectedProjectKey={selectedProjectKey} loading={workspacesQuery.isLoading || projectLoading} error={workspacesQuery.isError ? 'Não foi possível carregar a lista de projetos salvos.' : null} onSelect={setSelectedProjectKey} onLoad={() => { void loadSelectedProject(); }} onNew={startNewProject} />}
           {projectLoadedMessage && <div data-testid="status-project-loaded" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span>{projectLoadedMessage}</span></div>}
           {pipelineLoading && <div data-testid="status-pipeline-loading" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><RefreshCw size={15} className="animate-spin text-primary" /><span><strong>Montando seu caminho DMAIC...</strong> O Gemini está estruturando os entregáveis para a sessão.</span></div>}
           {pipelineError && <div data-testid="status-pipeline-error" className="reveal mb-6 flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive"><span>{pipelineError}</span><Button testId="button-retry-pipeline" onClick={startPipeline} variant="outline">Tentar novamente</Button></div>}
            {pipelineData && <div data-testid="status-pipeline-analysis-context" className="reveal mb-6 flex items-start gap-3 rounded-xl border border-chart-3/25 bg-chart-3/5 px-4 py-3 text-xs"><FileBarChart size={15} className="mt-0.5 shrink-0 text-chart-3" /><span>{pipelineAnalysisContext ? <><strong>Pipeline fundamentado na análise local.</strong> Indicador <strong>{pipelineAnalysisContext.indicator}</strong>, janela de {pipelineAnalysisContext.analysisMonths} mês(es) e resumo estatístico foram registrados junto aos artefatos gerados.</> : <><strong>Pipeline gerado sem análise estatística anexada.</strong> Carregue um CSV e gere novamente para fundamentar as sugestões em evidências locais.</>}</span></div>}
           {workspaceQuery.isLoading && <div data-testid="status-workspace-loading" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-border bg-muted/55 px-4 py-3 text-xs"><RefreshCw size={15} className="animate-spin text-primary" /><span>Carregando o Project Charter salvo...</span></div>}
            {localDraftConflict && <div data-testid="status-local-draft-conflict" className="reveal mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs"><div className="flex min-w-0 gap-3"><Info size={16} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="font-bold text-foreground">Encontramos um rascunho neste navegador e uma versão mais recente no Neon.</p><p className="mt-1 leading-relaxed text-muted-foreground">Nenhum conteúdo foi apagado. Escolha qual versão deseja manter na tela antes de continuar editando.</p></div></div><div className="flex shrink-0 flex-wrap gap-2"><Button testId="button-use-server-version" onClick={useServerVersionForLocalDraft} variant="outline">Usar versão do Neon</Button><Button testId="button-recover-local-draft" onClick={recoverLocalDraft}>Recuperar meu rascunho</Button></div></div>}
           {workspaceConflict && <div data-testid="status-workspace-conflict" className="reveal mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/35 bg-accent/10 px-4 py-3 text-xs"><div className="flex min-w-0 gap-3"><Info size={16} className="mt-0.5 shrink-0 text-accent-foreground" /><div><p className="font-bold text-foreground">Há uma edição mais recente neste workspace.</p><p className="mt-1 leading-relaxed text-muted-foreground">Seus campos e sugestões continuam aqui. Carregue a versão mais recente para revisá-la ou substitua-a conscientemente pela sua edição.</p></div></div><div className="flex shrink-0 flex-wrap gap-2"><Button testId="button-use-latest-workspace" onClick={useLatestWorkspace} variant="outline">Usar versão mais recente</Button><Button testId="button-overwrite-workspace" onClick={overwriteLatestWorkspace}>Substituir mesmo assim</Button></div></div>}
           {(workspaceError || workspaceQuery.isError) && <div data-testid="status-workspace-error" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive"><Info size={15} /><span>{workspaceError ?? 'Não foi possível carregar os dados salvos no Neon.'}</span></div>}
            {localDraftRecovered && !localDraftConflict && <div data-testid="status-local-draft-recovered" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span><strong>Rascunho recuperado deste navegador.</strong> Suas edições continuam protegidas localmente; use os botões de salvar para confirmá-las também no Neon.</span></div>}
           {saved && <div data-testid="status-statement-saved" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span><strong>Mudança salva no Neon.</strong> O enunciado estará disponível ao reabrir este workspace.</span></div>}
           {charterSaved && <div data-testid="status-charter-saved" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span><strong>Project charter salvo no Neon.</strong> Essas informações serão carregadas ao reabrir este workspace e usadas como contexto na geração do pipeline.</span></div>}
             {area === 'overview' ? <Overview statement={statement} setStatement={updateStatement} onSave={saveStatement} charter={charter} onCharterChange={updateCharter} onTeamChange={updateCharterTeam} onSaveCharter={saveCharter} pipelineDone={pipelineDone} hasAiSuggestions={Boolean(aiCharterSuggestions)} onOpenArea={setArea} /> : <SprintView area={area} onOpenTool={openTool} onChangeVital={setVitalId} vitalId={vitalId} inputDataset={inputDataset} inputAnalysis={inputAnalysis} inputError={csvError} analysisMonths={analysisMonths} onAnalysisMonthsChange={updateAnalysisMonths} selectedIndicator={selectedIndicator} onSelectedIndicatorChange={updateSelectedIndicator} diagnosis={exploratoryDiagnosis} onDiagnosisChange={handleDiagnosisChange} onSaveAnalysis={saveStatement} onUpload={handleUpload} inputRef={fileRef} activeProjectName={activeProjectName} />}
             <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[10px] text-muted-foreground"><span className="mono-label">DMAIC Ágil Suite · workspace no Neon {projectKey ? `· projeto #${projectKey}` : '· novo projeto'}</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {pipelineData ? 'artefatos gerados por IA · revise com o time' : 'dados de exemplo sinalizados · sem envio externo'}</span></footer>
        </div>
      </main>
    </div>
     {selectedTool && <DetailDrawer tool={selectedTool} onClose={() => setSelectedTool(null)} pareto={pareto} imr={imr} inputAnalysis={inputAnalysis} hasInputDataset={Boolean(inputDataset)} csvError={csvError} onRetry={retryUpload} pipeline={pipelineData} hasDiagnosis={Boolean(pipelineAnalysisContext?.diagnosis)} manualRows={manualVocCtq} hasManualChanges={manualVocCtqDirty} manualSaveConfirmed={manualVocSaved} onManualRowsChange={updateManualVocCtq} onSaveManualRows={saveManualVocCtq} charter={charter} activeProjectName={activeProjectName} sipocDirty={sipocDirty} sipocSaved={sipocSaved} onSipocChange={updateSipoc} onSaveSipoc={saveSipoc} />}
  </div>;
}
/*
 * Alternative pre-rebase Workspace implementation retained temporarily while
 * the active implementation above receives the Charter persistence changes.
 * It is intentionally inactive.
 */
/*
function Workspace() {
  const pipelineMutation = useRunDmaicPipeline();
  const workspaceQuery = useGetDmaicWorkspace();
  const workspaceMutation = useSaveDmaicWorkspace();
  const [area, setArea] = useState<Area>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [statement, setStatement] = useState('O tempo entre a entrada da solicitação e a aprovação do crédito varia de 8 a 31 minutos, gerando retrabalho e previsibilidade baixa para as agências no fechamento do mês.');
  const [saved, setSaved] = useState(false);
  const [charter, setCharter] = useState<ProjectCharterDraft>(createProjectCharterDraft);
  const [charterSaved, setCharterSaved] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineDone, setPipelineDone] = useState(false);
  const [confirmedCharter, setConfirmedCharter] = useState<ProjectCharterDraft>(createProjectCharterDraft);
  const [aiCharterSuggestions, setAiCharterSuggestions] = useState<GeneratedCharterFields | null>(null);
  const [pipelineData, setPipelineData] = useState<DmaicPipeline | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [vitalId, setVitalId] = useState('x1');
  const [csvName, setCsvName] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [pareto, setPareto] = useState(initialPareto);
  const [imr, setImr] = useState(initialImr);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const charterReviewVersionRef = useRef(0);
  const workspaceSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const displayArea = area === 'overview' ? 'overview' : area;

  useEffect(() => {
    if (!workspaceQuery.data || workspaceHydrated) return;
    if (workspaceQuery.data.hasSavedData) {
      setStatement(workspaceQuery.data.problemStatement);
      const persistedCharter = toProjectCharterDraft(workspaceQuery.data.projectCharterContext);
      const pendingSuggestions = workspaceQuery.data.aiCharterSuggestions;
      setConfirmedCharter(persistedCharter);
      setCharter(pendingSuggestions ? applyGeneratedCharterFields(persistedCharter, pendingSuggestions) : persistedCharter);
      setAiCharterSuggestions(pendingSuggestions);
    }
    setWorkspaceHydrated(true);
  }, [workspaceHydrated, workspaceQuery.data]);

  const queueWorkspaceSave = (
    data: { problemStatement: string; projectCharterContext: ProjectCharterContext; aiCharterSuggestions: GeneratedCharterFields | null },
    callbacks: { onSuccess?: () => void; onError: () => void },
  ) => {
    const queuedSave = workspaceSaveQueueRef.current
      .catch(() => undefined)
      .then(() => workspaceMutation.mutateAsync({ data }));
    workspaceSaveQueueRef.current = queuedSave.then(() => undefined, () => undefined);
    void queuedSave.then(() => callbacks.onSuccess?.()).catch(callbacks.onError);
  };

  const saveWorkspace = (source: 'statement' | 'charter') => {
    if (statement.trim().length < 10) {
      setWorkspaceError('Descreva o problema com pelo menos 10 caracteres antes de salvar no Neon.');
      return;
    }
    if (source === 'charter') charterReviewVersionRef.current += 1;
    setWorkspaceError(null);
    const charterToPersist = source === 'charter' ? charter : confirmedCharter;
    queueWorkspaceSave(
      {
        problemStatement: statement.trim(),
        projectCharterContext: toProjectCharterContext(charterToPersist),
        aiCharterSuggestions: source === 'charter' ? null : aiCharterSuggestions,
      },
      {
        onSuccess: () => {
          if (source === 'statement') {
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2200);
          } else {
            setConfirmedCharter(charter);
            setAiCharterSuggestions(null);
            setCharterSaved(true);
            window.setTimeout(() => setCharterSaved(false), 2200);
          }
        },
        onError: () => setWorkspaceError('Não foi possível salvar no Neon. Confirme a conexão e tente novamente.'),
      },
    );
  };
  const saveStatement = () => saveWorkspace('statement');
  const saveCharter = () => saveWorkspace('charter');
  const updateCharter = (field: CharterTextField, value: string) => {
    setCharter((current) => ({ ...current, [field]: value }));
  };
  const updateCharterTeam = (role: CharterTeamRole, field: keyof CharterTeamMember, value: string) => {
    setCharter((current) => ({ ...current, team: { ...current.team, [role]: { ...current.team[role], [field]: value } } }));
  };
  const startPipeline = () => {
    if (statement.trim().length < 10) {
      setPipelineError('Descreva o problema com pelo menos 10 caracteres para iniciar o pipeline.');
      return;
    }
    setPipelineError(null);
    setPipelineLoading(true);
    const generationReviewVersion = charterReviewVersionRef.current;
    pipelineMutation.mutate(
      {
        data: {
          problemStatement: statement.trim(),
          projectCharterContext: toProjectCharterContext(charter),
        },
      },
      {
        onSuccess: (data) => {
          if (generationReviewVersion !== charterReviewVersionRef.current) {
            setPipelineError('O Charter foi confirmado durante a geração. Inicie o pipeline novamente para usar a versão revisada.');
            return;
          }
          setPipelineData(data);
          setCharter((current) => applyGeneratedCharterFields(current, data.generatedCharter));
          setAiCharterSuggestions(data.generatedCharter);
          setPipelineDone(true);
          setArea('overview');
          queueWorkspaceSave(
            {
              problemStatement: statement.trim(),
              projectCharterContext: toProjectCharterContext(confirmedCharter),
              aiCharterSuggestions: data.generatedCharter,
            },
            {
              onError: () => setWorkspaceError('As sugestões foram geradas, mas não puderam ser protegidas no Neon. Salve o Charter para tentar novamente.'),
            },
          );
        },
        onError: () => {
          setPipelineError('Não foi possível gerar o pipeline agora. Verifique a chave Gemini e tente novamente.');
        },
        onSettled: () => setPipelineLoading(false),
      },
    );
  };
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    if (!file.name.toLowerCase().endsWith('.csv')) { setCsvError('Use um arquivo com extensão .csv para calcular as análises.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length < 2) { setCsvError('O CSV precisa ter cabeçalho e pelo menos uma linha de dados.'); return; }
      const rows = lines.slice(1).map((line) => line.split(/[;,]/).map((value) => value.trim()));
      const numeric = rows.map((row) => Number(row.find((value) => value !== '' && !Number.isNaN(Number(value)))?.replace(',', '.'))).filter((value) => Number.isFinite(value));
      if (numeric.length >= 3) setImr(numeric.slice(0, 40));
      const counts = new Map<string, number>();
      rows.forEach((row) => { const key = row.find((value) => value && Number.isNaN(Number(value))) ?? 'Categoria sem nome'; counts.set(key, (counts.get(key) ?? 0) + 1); });
      if (counts.size > 0) setPareto(Array.from(counts.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8));
      setCsvName(file.name);
    };
    reader.onerror = () => setCsvError('O navegador não conseguiu ler este arquivo. Tente exportar o CSV novamente.');
    reader.readAsText(file);
  };
  const retryUpload = () => { setCsvError(null); fileRef.current?.click(); };
  const openTool = (tool: Tool) => setSelectedTool(tool);
  return <div className="flex min-h-[100dvh] bg-background text-foreground">
    <Sidebar area={displayArea} setArea={setArea} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
    {mobileOpen && <button data-testid="button-sidebar-overlay" aria-label="Fechar menu" className="fixed inset-0 z-20 bg-sidebar/30 lg:hidden" onClick={() => setMobileOpen(false)} />}
    <div className="flex min-w-0 flex-1 flex-col"><Topbar area={displayArea} setMobileOpen={setMobileOpen} onStart={startPipeline} pipelineLoading={pipelineLoading} />
      <main className="dmaic-grid flex-1 overflow-x-hidden px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto max-w-[1240px]">
           {pipelineLoading && <div data-testid="status-pipeline-loading" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><RefreshCw size={15} className="animate-spin text-primary" /><span><strong>Montando seu caminho DMAIC...</strong> O Gemini está estruturando os entregáveis para a sessão.</span></div>}
           {pipelineError && <div data-testid="status-pipeline-error" className="reveal mb-6 flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive"><span>{pipelineError}</span><Button testId="button-retry-pipeline" onClick={startPipeline} variant="outline">Tentar novamente</Button></div>}
           {workspaceQuery.isLoading && <div data-testid="status-workspace-loading" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-border bg-muted/55 px-4 py-3 text-xs"><RefreshCw size={15} className="animate-spin text-primary" /><span>Carregando o Project Charter salvo...</span></div>}
           {(workspaceError || workspaceQuery.isError) && <div data-testid="status-workspace-error" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive"><Info size={15} /><span>{workspaceError ?? 'Não foi possível carregar os dados salvos no Neon.'}</span></div>}
           {saved && <div data-testid="status-statement-saved" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span><strong>Mudança salva no Neon.</strong> O enunciado estará disponível ao reabrir este workspace.</span></div>}
           {charterSaved && <div data-testid="status-charter-saved" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span><strong>Project charter salvo no Neon.</strong> Essas informações serão carregadas ao reabrir este workspace e usadas como contexto na geração do pipeline.</span></div>}
           {area === 'overview' ? <Overview statement={statement} setStatement={setStatement} onSave={saveStatement} charter={charter} onCharterChange={updateCharter} onTeamChange={updateCharterTeam} onSaveCharter={saveCharter} pipelineDone={pipelineDone} hasAiSuggestions={Boolean(aiCharterSuggestions)} onOpenArea={setArea} /> : <SprintView area={area} onOpenTool={openTool} onChangeVital={setVitalId} vitalId={vitalId} csvName={csvName} onUpload={handleUpload} inputRef={fileRef} />}
            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[10px] text-muted-foreground"><span className="mono-label">DMAIC Ágil Suite · workspace no Neon</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {pipelineData ? 'artefatos gerados por IA · revise com o time' : 'dados de exemplo sinalizados · sem envio externo'}</span></footer>
        </div>
      </main>
    </div>
     {selectedTool && <DetailDrawer tool={selectedTool} onClose={() => setSelectedTool(null)} pareto={pareto} imr={imr} csvError={csvError} onRetry={retryUpload} pipeline={pipelineData} />}
  </div>;
}
*/

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Workspace} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
