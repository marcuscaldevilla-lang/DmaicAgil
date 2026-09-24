import { Children, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  getDmaicWorkspace,
  type DmaicAnalysisArtifacts,
  type DmaicAnalysisArtifactsIshikawa,
  type DmaicCharter,
  type DmaicCsvDataset,
  type DmaicExploratoryDiagnosisInput,
  type DmaicMeasurementWhatIfContext,
  type DmaicMeasurementWhatIfRecord,
  type DmaicPipeline,
  type DmaicPipelineAnalysisContext,
  type DmaicProcessMap,
  type DmaicRow,
  type DmaicSipoc,
  type DmaicSipocRow,
  type DmaicVocCqt,
  type DmaicWorkspace,
  type DmaicWorkspaceSummary,
  useGetDmaicWorkspace,
  useListDmaicWorkspaces,
  useRunDmaicExploratoryDiagnosis,
  useRunDmaicIshikawa,
  useRunDmaicMeasurementWhatIf,
  useRunDmaicPipeline,
  useSaveDmaicWorkspace,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MeasurementAnalysisPanel } from '@/components/measurement-analysis-panel';
import { ProcessMapEditor, processMapSvg } from '@/components/process-map-editor';
import type { MeasurementAnalysis } from '@/lib/measurement-analysis';
import { IshikawaDiagramEditor } from '@/components/ishikawa-diagram-editor';
import { analyzeMeasurementDataset, parseMeasurementNumber } from '@/lib/measurement-analysis';
import { cloneProcessMap, createInitialProcessMap, createProcessMapFromSipoc } from '@/lib/process-map';
import { shapiroWilk } from '@/lib/shapiro-wilk';
import executiveManualMarkdown from '../../../docs/manual-executivo-dmaic-agil.md?raw';
import usageManualMarkdown from '../../../docs/manual-utilizacao-dmaic-agil.md?raw';
import { Sprint3Matrices } from './components/Sprint3Matrices';
import { ControlPhasePanel, type ControlEvaluation, type ControlPhase, type ControlStatistic } from './components/control-phase-panel';
import NotFound from '@/pages/not-found';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CloudUpload,
  Copy,
  Database,
  FileBarChart,
  FileDown,
  FileText,
  FolderOpen,
  Gauge,
  GitBranch,
  Info,
  Layers3,
  LayoutDashboard,
  Maximize2,
  Menu,
  Minimize2,
  MoreHorizontal,
  Network,
  Pencil,
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

type Area = 'overview' | 'executive' | 'decisions' | 'definition' | 'measurement' | 'aic' | 'control';
type PhaseProgress = { progress: number; completed: number; total: number; pending: string[]; next: string };
type ProjectPulse = { cycleDays: number | null; cycleNote: string; indicatorValue: string; indicatorNote: string; vitalXsValue: string; vitalXsNote: string; dataConfidence: string; dataConfidenceNote: string; updatedLabel: string };
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
type HypothesisStatus = 'Backlog' | 'Próximo' | 'Em teste' | 'Comprovada' | 'Rejeitada';
type HypothesisStatusMap = Record<string, HypothesisStatus>;
type HypothesisNotesMap = Record<string, string>;
type HypothesisLink = { cause: string; vitalX: string; test: string; action: string; result: string };
type HypothesisLinksMap = Record<string, HypothesisLink>;
type AttachmentRecord = { name: string; type: string; size: number; addedAt: string };
type ProjectDecision = { decision: string; owner: string; date: string; evidence: string; impact: string };
type ArtifactHistoryEntry = { artifact: string; action: string; date: string; detail: string };
type WorkspaceSaveSource = 'statement' | 'charter' | 'suggestions' | 'voc' | 'sipoc' | 'msa' | 'vitalx' | 'gut' | 'solutions' | 'control-plan' | 'what-if' | 'process-map' | 'ishikawa' | 'hypotheses';
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

type MsaRow = { variable: string; gageRrStatus: string; recommendation: string };
type VitalXBreakdownRow = { variable: string; hypothesis: string; testMethod: string; conclusion: string };
type GutRow = { problem: string; g: number; u: number; t: number; score: number };
type SolutionRow = { hypothesis: string; solution: string; action: string; owner: string };
type ActionPlanRow = { what: string; why: string; who: string; how: string; howMuch: string; where: string; when: string; notes?: string };
type ControlPlanRow = { processStep: string; parameter: string; target: string; controlMethod: string; reactionPlan: string };

const EMPTY_MSA_ROW: MsaRow = { variable: '', gageRrStatus: '', recommendation: '' };
const EMPTY_VITAL_X_BREAKDOWN_ROW: VitalXBreakdownRow = { variable: '', hypothesis: '', testMethod: '', conclusion: '' };
const EMPTY_GUT_ROW: GutRow = { problem: '', g: 1, u: 1, t: 1, score: 1 };
const EMPTY_SOLUTION_ROW: SolutionRow = { hypothesis: '', solution: '', action: '', owner: '' };
const EMPTY_ACTION_PLAN_ROW: ActionPlanRow = { what: '', why: '', who: '', how: '', howMuch: '', where: '', when: '', notes: '' };
const EMPTY_PROJECT_DECISION: ProjectDecision = { decision: '', owner: '', date: '', evidence: '', impact: '' };
const EMPTY_HYPOTHESIS_LINK: HypothesisLink = { cause: '', vitalX: '', test: '', action: '', result: '' };
const EMPTY_CONTROL_PLAN_ROW: ControlPlanRow = { processStep: '', parameter: '', target: '', controlMethod: '', reactionPlan: '' };

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
  measurementDataset: null,
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
  whatIfAnalyses: [],
  processMap: createInitialProcessMap(),
  ishikawa: null,
  ishikawaInputText: '',
} as any);
function normalizeRows<T extends object>(data: unknown, fallback: T): T[] {
  if (!Array.isArray(data) || data.length === 0) return [fallback];
  return data as T[];
}

function parseAnalysisArtifacts(value: unknown): DmaicAnalysisArtifacts {
  if (!isObject(value) || value.version !== 1 || !('dataset' in value) || !('analysisMonths' in value) || !('selectedIndicator' in value)) return createEmptyAnalysisArtifacts();
  const empty = createEmptyAnalysisArtifacts();
  return {
    ...empty,
    dataset: isObject(value.dataset) ? value.dataset as unknown as DmaicCsvDataset : null,
    measurementDataset: isObject(value.measurementDataset) ? value.measurementDataset as unknown as DmaicCsvDataset : null,
    analysisMonths: typeof value.analysisMonths === 'number' ? value.analysisMonths : empty.analysisMonths,
    selectedIndicator: typeof value.selectedIndicator === 'string' ? value.selectedIndicator : '',
    indicatorAnalysis: value.indicatorAnalysis ?? null,
    exploratorySummary: value.exploratorySummary ?? null,
    diagnosis: typeof value.diagnosis === 'string' ? value.diagnosis : null,
    diagnosisInput: value.diagnosisInput ?? null,
    pipelineAnalysisContext: value.pipelineAnalysisContext ?? null,
    pipeline: normalizePipelineSnapshot(value.pipeline),
    manualVocCtq: parseManualVocRows(value.manualVocCtq),
    whatIfAnalyses: Array.isArray(value.whatIfAnalyses) ? value.whatIfAnalyses : [],
    processMap: parseProcessMapSnapshot(value.processMap, value.pipeline),
    ishikawa: isObject(value.ishikawa) ? value.ishikawa as DmaicAnalysisArtifactsIshikawa : null,
    ishikawaInputText: typeof value.ishikawaInputText === 'string' ? value.ishikawaInputText : '',
    hypothesisStatuses: isObject((value as any).hypothesisStatuses) ? (value as any).hypothesisStatuses as HypothesisStatusMap : {},
    hypothesisNotes: isObject((value as any).hypothesisNotes) ? (value as any).hypothesisNotes as HypothesisNotesMap : {},
    hypothesisLinks: isObject((value as any).hypothesisLinks) ? (value as any).hypothesisLinks as HypothesisLinksMap : {},
    attachments: Array.isArray((value as any).attachments) ? (value as any).attachments as AttachmentRecord[] : [],
    projectDecisions: Array.isArray((value as any).projectDecisions) ? (value as any).projectDecisions as ProjectDecision[] : [],
    artifactHistory: Array.isArray((value as any).artifactHistory) ? (value as any).artifactHistory as ArtifactHistoryEntry[] : [],
    controlPhase: isObject((value as any).controlPhase) ? (value as any).controlPhase : null,
    causeAndEffectMatrix: (value as any).causeAndEffectMatrix ?? null,
    solutionPrioritizationMatrix: (value as any).solutionPrioritizationMatrix ?? null,
  } as unknown as DmaicAnalysisArtifacts;
}

function parseProcessMapSnapshot(value: unknown, pipelineValue?: unknown): DmaicProcessMap {
  if (!isObject(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges) || !Array.isArray(value.variables)) {
    if (isObject(pipelineValue) && Array.isArray(pipelineValue.sipoc)) {
      return createProcessMapFromSipoc(
        pipelineValue.sipoc as DmaicSipoc,
        Array.isArray(pipelineValue.vocCtq) ? pipelineValue.vocCtq as DmaicVocCqt[] : [],
        isObject(pipelineValue.indicatorsY) ? pipelineValue.indicatorsY as unknown as DmaicPipeline['indicatorsY'] : null,
      );
    }
    return createInitialProcessMap();
  }
  return {
    version: typeof value.version === 'number' ? value.version : 1,
    nodes: value.nodes as DmaicProcessMap['nodes'],
    edges: value.edges as DmaicProcessMap['edges'],
    variables: value.variables as DmaicProcessMap['variables'],
  };
}

function analysisArtifactsSizeInBytes(artifacts: DmaicAnalysisArtifacts): number {
  return new TextEncoder().encode(JSON.stringify(artifacts)).byteLength;
}

function getWorkspaceConflict(error: unknown): DmaicWorkspace | null {
  if (!error || typeof error !== 'object' || !('status' in error) || (error as any).status !== 409 || !('data' in error)) return null;
  const data = (error as any).data;
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
    // Local storage indisponível
  }
}

const toProjectCharterContext = (charter: ProjectCharterDraft): ProjectCharterContext => {
  const parsedDate = new Date(charter.date);
  const date = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString().slice(0, 10) : charter.date;
  return {
    ...charter,
    date,
    team: [
      { role: 'Líder', ...charter.team.leader },
      { role: 'Patrocinador', ...charter.team.sponsor },
      { role: 'Membros da equipe', ...charter.team.teamMembers },
      { role: 'Especialistas para suporte técnico', ...charter.team.technicalSupport },
    ],
  };
};

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
  goalDefinition: charter.goalDefinition.trim() ? charter.goalDefinition : generated.goalDefinition,
  businessContributionsQuantitative: charter.businessContributionsQuantitative,
  financialInformation: charter.financialInformation,
});

const areaMeta: Record<Area, { label: string; kicker: string; description: string; color: string }> = {
  overview: { label: 'Visão geral', kicker: '', description: 'Onde o problema ganha forma, ritmo e dono.', color: 'hsl(var(--primary))' },
  executive: { label: 'Resumo executivo', kicker: '', description: 'A decisão, suas evidências e o próximo movimento.', color: 'hsl(var(--primary))' },
  decisions: { label: 'Decisões', kicker: '', description: 'Registre escolhas, responsáveis e evidências do projeto.', color: 'hsl(var(--primary))' },
  definition: { label: 'Definição', kicker: '', description: 'Alinhe o problema antes de procurar respostas.', color: 'hsl(var(--accent))' },
  measurement: { label: 'Medição', kicker: '', description: 'Transforme variação em evidência operacional.', color: 'hsl(var(--chart-3))' },
  aic: { label: 'Análise e Melhoria', kicker: '', description: 'Teste, implemente e sustente a melhoria.', color: 'hsl(var(--chart-4))' },
  control: { label: 'Controle', kicker: '', description: 'Monitore a estabilidade e sustente o resultado.', color: 'hsl(var(--chart-3))' },
};

const navGroups = [
  {
    label: 'Projeto',
    items: [
      { id: 'overview' as Area, label: 'Visão geral', icon: LayoutDashboard },
      { id: 'executive' as Area, label: 'Resumo executivo', icon: FileBarChart },
      { id: 'decisions' as Area, label: 'Decisões', icon: ClipboardCheck },
    ],
  },
  {
    label: 'DMAIC',
    items: [
      { id: 'definition' as Area, label: 'Definição', icon: Target },
      { id: 'measurement' as Area, label: 'Medição', icon: Gauge },
      { id: 'aic' as Area, label: 'Análise e Melhoria', icon: GitBranch },
      { id: 'control' as Area, label: 'Controle', icon: ShieldCheck },
    ],
  },
];

const tools: Record<Area, Tool[]> = {
  overview: [],
  executive: [],
  decisions: [],
  control: [],
  definition: [
    { id: 'charter', title: 'Project charter', subtitle: 'O contrato de foco do time', icon: ClipboardList, status: 'Pronto', tag: 'Exemplo', accent: 'var(--accent)' },
    { id: 'voc', title: 'VOC → CTQ', subtitle: 'Escute e traduza a demanda', icon: Network, status: '6 linhas', accent: 'var(--chart-3)' },
    { id: 'sipoc', title: 'SIPOC visual', subtitle: 'O sistema antes do detalhe', icon: Layers3, status: 'Rascunho', accent: 'var(--primary)' },
  ],
  measurement: [
    { id: 'process-map', title: 'Mapa de processo', subtitle: 'Fluxo editável e variáveis por etapa', icon: Network, status: 'Ativo', accent: 'var(--primary)' },
    { id: 'msa', title: 'MSA validation', subtitle: 'A medida merece confiança?', icon: TestTube2, status: 'Validado', accent: 'var(--primary)' },
    { id: 'pareto', title: 'Pareto de defeitos', subtitle: 'Mostre onde está o peso', icon: BarChart3, status: 'Aguardando CSV', tag: 'Local', accent: 'var(--accent)' },
    { id: 'imr', title: 'I-MR chart', subtitle: 'Encontre sinais na sequência', icon: Activity, status: 'Aguardando CSV', tag: 'Local', accent: 'var(--chart-3)' },
    { id: 'vitalx', title: 'Vital X breakdown', subtitle: 'Do Y ao fator controlável', icon: Zap, status: '3 hipóteses', accent: 'var(--chart-4)' },
  ],
  aic: [
    { id: 'causes', title: '6M + matriz causa-efeito', subtitle: 'Organize o conhecimento do time', icon: GitBranch, status: '12 causas', accent: 'var(--chart-4)' },
    { id: 'solutions', title: 'Plano de Ação', subtitle: 'Hipótese vira experimento', icon: Sparkles, status: '4 caminhos', accent: 'var(--primary)' },
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
  if (text.length > MAX_PERSISTED_CSV_CHARACTERS) throw new Error('Este CSV excede o limite de 1,5 MB para salvar a análise no projeto.');
  const delimiter = detectCsvDelimiter(text);
  const records = parseCsvRecords(text, delimiter);
  if (records.length < 2) throw new Error('O CSV precisa ter cabeçalho e pelo menos uma linha de dados.');
  if (records.length - 1 > MAX_PERSISTED_CSV_ROWS) throw new Error(`Este CSV tem mais de ${MAX_PERSISTED_CSV_ROWS.toLocaleString('pt-BR')} linhas.`);
  const headers = records[0].map((header, index) => header || `Coluna ${index + 1}`);
  if (headers.length > MAX_PERSISTED_CSV_COLUMNS) throw new Error(`Este CSV tem mais de ${MAX_PERSISTED_CSV_COLUMNS} colunas.`);
  if (headers.some((header) => header.length > 255)) throw new Error('Um cabeçalho do CSV excede 255 caracteres.');
  const rows = records.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`O registro ${index + 2} tem ${values.length} campos, mas o cabeçalho tem ${headers.length}.`);
    }
    if (values.some((value) => value.length > MAX_PERSISTED_CSV_CELL_CHARACTERS)) throw new Error(`O registro ${index + 2} possui um campo muito longo.`);
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

function parseMeasurementCsv(text: string, fileName: string): DmaicCsvDataset {
  const parsed = parseInputCsv(text, fileName);
  if (parsed.headers.length < 2) throw new Error('O CSV da Medição precisa ter a coluna X e pelo menos uma variável numérica.');
  const [xColumn, ...variableColumns] = parsed.headers;
  if (new Set(parsed.headers).size !== parsed.headers.length) throw new Error('O CSV da Medição possui cabeçalhos duplicados.');
  parsed.rows.forEach((row, rowIndex) => {
    if (!row[xColumn]?.trim()) throw new Error(`A linha ${rowIndex + 2} não possui valor na coluna X "${xColumn}".`);
    variableColumns.forEach((column) => {
      if (parseMeasurementNumber(row[column]) === null) {
        throw new Error(`A célula ${column}, linha ${rowIndex + 2}, não é numérica.`);
      }
    });
  });
  return {
    fileName: parsed.fileName,
    headers: parsed.headers,
    rows: parsed.rows,
    dateColumn: xColumn,
    indicatorColumns: variableColumns,
  };
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
  const shapiroDetail = shapiro.statistic === null || shapiro.pValue === null
    ? 'Teste indisponível: são necessárias de 3 a 5.000 observações com variação.'
    : `Shapiro–Wilk · W = ${shapiro.statistic.toFixed(3)} · p = ${shapiro.pValue.toFixed(3)} · significância de 5%`;
  return { points, minimum: sorted[0], q1, median: percentile(sorted, 0.5), q3, maximum: sorted[sorted.length - 1], iqr: q3 - q1, mean, standardDeviation, shapiroW: shapiro.statistic, shapiroPValue: shapiro.pValue, shapiroDetail };
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
  const normalizedChildren = Children.map(children, (child) => typeof child === 'string'
    ? child.replace('Salvar charter', 'Salvar no Repositório').replace('Salvar mudança', 'Salvar no Repositório').replace('Salvar registros', 'Salvar no Repositório').replace('Salvar análise agora', 'Salvar no Repositório').replace('Salvar plano', 'Salvar no Repositório').replace('Plano salvo', 'Salvo no Repositório').replace('Salvar indicadores', 'Salvar no Repositório').replace('Salvar SIPOC', 'Salvar no Repositório')
    : child);
  return <button data-testid={testId} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${className}`}>{normalizedChildren}</button>;
}

function StatusPill({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'gray' | 'red' }) {
  const tones = { green: 'bg-emerald-100 text-emerald-800', amber: 'bg-amber-100 text-amber-900', gray: 'bg-slate-100 text-slate-600', red: 'bg-red-100 text-red-800' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mono-label ${tones[tone]}`}><span className={`h-1.5 w-1.5 rounded-full ${tone === 'green' ? 'bg-emerald-600' : tone === 'amber' ? 'bg-amber-500' : tone === 'red' ? 'bg-red-600' : 'bg-slate-400'}`} />{children}</span>;
}

type ArtifactStatus = 'ai' | 'edited' | 'validated' | 'approved' | 'stale';

function ArtifactStatusBadge({ status }: { status: ArtifactStatus }) {
  const labels: Record<ArtifactStatus, string> = {
    ai: 'Sugestão da IA',
    edited: 'Editado pelo usuário',
    validated: 'Validado',
    approved: 'Aprovado',
    stale: 'Desatualizado',
  };
  const tones: Record<ArtifactStatus, 'green' | 'amber' | 'gray' | 'red'> = {
    ai: 'gray',
    edited: 'amber',
    validated: 'green',
    approved: 'green',
    stale: 'red',
  };
  return <StatusPill tone={tones[status]}>{labels[status]}</StatusPill>;
}

function Sidebar({ area, setArea, mobileOpen, setMobileOpen, activeProjectName, progress, completedMilestones, daysInCycle }: { area: Area; setArea: (area: Area) => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void; activeProjectName: string; progress: number; completedMilestones: number; daysInCycle: number | null }) {
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
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-sidebar-foreground/10"><div className="h-full rounded-full bg-sidebar-primary transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-2 flex justify-between text-[10px] text-sidebar-foreground/45"><span>{progress}% do caminho</span><span>{daysInCycle === null ? 'Data não definida' : `${daysInCycle} ${daysInCycle === 1 ? 'dia' : 'dias'}`}</span></div>
          <p className="mt-1 text-[10px] text-sidebar-foreground/35">{completedMilestones} de 5 marcos concluídos</p>
        </div>
        {navGroups.map((group) => <div key={group.label} className="mb-7"><p className="mono-label mb-2 px-3 text-sidebar-foreground/35">{group.label}</p><div className="space-y-1">{group.items.map((item) => { const active = item.id === area; const Icon = item.icon; return <button key={item.id} data-testid={`nav-${item.id}`} onClick={() => { const destinations: Record<string, Area> = { overview: 'overview', executive: 'executive', decisions: 'decisions', definition: 'definition', measurement: 'measurement', aic: 'aic', charter: 'definition', analysis: 'measurement', control: 'control' }; setArea(destinations[item.id] ?? 'overview'); setMobileOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold transition-colors ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}><Icon size={16} strokeWidth={1.8} /><span>{item.label}</span>{active && <ArrowRight className="ml-auto" size={14} />}</button>; })}</div></div>)}
      </div>
      <div className="border-t border-sidebar-border p-4">
        <button data-testid="button-export-executive-manual" onClick={exportExecutiveManualPdf} className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent"><FileDown size={16} /><span>Exportar manual executivo</span></button>
        <button data-testid="button-export-usage-manual" onClick={exportUsageManualPdf} className="mt-1 flex w-full items-center gap-3 rounded-lg p-2 text-left text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent"><FileDown size={16} /><span>Exportar manual de utilização</span></button>
        <div className="mt-3 flex items-center gap-3 border-t border-sidebar-border pt-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">MC</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">Marina Costa</p><p className="truncate text-[10px] text-sidebar-foreground/45">Master Black Belt</p></div><Settings2 size={15} className="text-sidebar-foreground/40" /></div>
      </div>
    </aside>
  );
}

function Topbar({ area, setMobileOpen, onStart, pipelineLoading, activeProjectName, searchTerm, onSearch, hasUnsavedChanges }: { area: Area; setMobileOpen: (open: boolean) => void; onStart: () => void; pipelineLoading: boolean; activeProjectName: string; searchTerm: string; onSearch: (value: string) => void; hasUnsavedChanges: boolean }) {
  const meta = areaMeta[area];
  return <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-border bg-background/85 px-5 backdrop-blur-md sm:px-8"><div className="flex min-w-0 items-center gap-3"><button data-testid="button-open-sidebar" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"><Menu size={20} /></button><div className="min-w-0"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span>Projetos</span><span>/</span><span className="truncate text-foreground">{activeProjectName}</span></div><div className="mt-1 flex items-center gap-2"><h1 className="truncate font-serif text-lg font-bold tracking-tight">{meta.label}</h1>{meta.kicker && <span className="hidden rounded bg-muted px-1.5 py-0.5 mono-label text-muted-foreground sm:inline-flex">{meta.kicker}</span>}</div></div></div><div className="flex shrink-0 items-center gap-2"><span data-testid="status-workspace-save" className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline-flex ${hasUnsavedChanges ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}><span className={`h-1.5 w-1.5 rounded-full ${hasUnsavedChanges ? 'bg-amber-500' : 'bg-emerald-600'}`} />{hasUnsavedChanges ? 'Alterações não salvas' : 'Salvo agora'}</span><div className="relative hidden md:block"><Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" /><input data-testid="input-search" value={searchTerm} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar no projeto" className="h-9 w-44 rounded-lg border border-border bg-card pl-9 pr-3 text-xs outline-none transition-all placeholder:text-muted-foreground/70 focus:w-56 focus:border-primary/50" /></div><Button testId="button-start-pipeline" onClick={onStart} disabled={pipelineLoading} className="hidden sm:inline-flex">{pipelineLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}{pipelineLoading ? 'Preparando...' : 'Iniciar pipeline'}</Button><button data-testid="button-more" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><MoreHorizontal size={19} /></button></div></header>;
}
function formatProjectUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'data indisponível' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}
function formatPulseUpdatedAt(value: string | null): string {
  if (!value) return 'Ainda não salvo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Atualização indisponível';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return 'Atualizado agora';
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  return `Atualizado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)}`;
}
function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Não foi possível concluir a operação.';
}
function DataNotes({ tool, pareto, imr, source }: { tool: Tool; pareto: { name: string; value: number }[] | null; imr: number[] | null; source: 'upload' | 'example' }): ReactNode {
  const dataSummary = tool.id === 'pareto'
    ? pareto ? `${pareto.length} categorias e ${pareto.reduce((total, item) => total + item.value, 0)} ocorrências.` : 'Nenhum dado de Pareto disponível.'
    : tool.id === 'imr'
      ? imr ? `${imr.length} observações numéricas em sequência.` : 'Nenhum dado de I-MR disponível.'
      : source === 'upload' ? 'Conteúdo calculado a partir dos dados carregados.' : 'Conteúdo local de exemplo.';
  return <div data-testid="panel-data-notes" className="space-y-4 text-sm"><div className="rounded-xl border border-border bg-card p-4"><p className="mono-label text-primary">Origem dos dados</p><p className="mt-2 leading-relaxed text-muted-foreground">{source === 'upload' ? 'Arquivo carregado e processado localmente no navegador.' : 'Dados de exemplo locais, sem envio externo.'}</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="mono-label text-primary">Resumo</p><p className="mt-2 leading-relaxed text-muted-foreground">{dataSummary}</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="mono-label text-primary">Interpretação</p><p className="mt-2 leading-relaxed text-muted-foreground">Revise o período, a qualidade da medição e a representatividade da amostra antes de tomar decisões.</p></div></div>;
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
      <div className="flex gap-3"><span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FolderOpen size={17} /></span><div><p className="mono-label text-primary">Projetos no Repositório</p><h2 className="mt-1.5 font-serif text-lg font-bold">Continue um projeto salvo</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">Carregue um projeto existente antes de iniciar algo novo. As edições que ainda não foram salvas serão preservadas até você confirmar a troca.</p></div></div>
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

function ProjectCharterForm({ charter, onFieldChange, onTeamChange, onSave, hasAiSuggestions, saved }: { charter: ProjectCharterDraft; onFieldChange: (field: CharterTextField, value: string) => void; onTeamChange: (role: CharterTeamRole, field: keyof CharterTeamMember, value: string) => void; onSave: () => void; hasAiSuggestions: boolean; saved: boolean }) {
  const teamRows: { role: CharterTeamRole; label: string; helper: string }[] = [
    { role: 'leader', label: 'Líder', helper: 'Responsável pelo projeto' },
    { role: 'sponsor', label: 'Patrocinador', helper: 'Sponsor / dono da decisão' },
    { role: 'teamMembers', label: 'Membros da equipe', helper: 'Separe nomes com vírgulas' },
    { role: 'technicalSupport', label: 'Especialistas para suporte técnico', helper: 'Apoio pontual ou consultivo' },
  ];
  return <section data-testid="section-project-charter" className="reveal-3 panel rounded-2xl p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5"><div><p className="mono-label text-primary">Contrato de projeto</p><h3 className="mt-2 font-serif text-xl font-bold">Project charter</h3><p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">Registre o acordo de foco, resultado, fronteiras e pessoas antes de aprofundar a análise.</p></div><ArtifactStatusBadge status={hasAiSuggestions ? 'ai' : saved ? 'validated' : 'edited'} /></div>
    {hasAiSuggestions && <div data-testid="status-charter-ai-suggestions" className="mt-5 flex gap-3 rounded-xl border border-primary/20 bg-primary/7 p-4 text-xs leading-relaxed"><Sparkles size={16} className="mt-0.5 shrink-0 text-primary" /><p><strong>Campos sugeridos pela Suíte.</strong> Objetivo, histórico, meta, KPIs, escopo, premissas, requisitos, contribuições e ganho financeiro são propostas para validação. As informações financeiras coletadas continuam sendo responsabilidade do time; revise, ajuste e salve o Charter quando estiver pronto.</p></div>}
    <nav aria-label="Etapas do Project Charter" className="mt-5 grid gap-2 sm:grid-cols-5">{['Contexto', 'Meta e escopo', 'Cliente e VOC', 'Equipe', 'Valor financeiro'].map((step, index) => <a key={step} href={`#charter-step-${index + 1}`} className={`rounded-lg border px-3 py-2 text-[10px] font-bold transition-colors hover:border-primary/50 hover:bg-primary/5 ${index === 0 ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground'}`}><span className="mr-1.5 font-mono">0{index + 1}</span>{step}</a>)}</nav>
    <details id="charter-step-1" open className="mt-5 rounded-xl border border-border bg-background/45 p-4 sm:p-5"><summary className="cursor-pointer list-inside text-sm font-bold marker:text-primary">01 · Contexto <span className="ml-2 text-[11px] font-normal text-muted-foreground">Identifique o projeto, cliente e responsáveis.</span></summary><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div></details>
    <details id="charter-step-2" className="mt-3 rounded-xl border border-border bg-background/45 p-4 sm:p-5"><summary className="cursor-pointer list-inside text-sm font-bold marker:text-primary">02 · Meta e escopo <span className="ml-2 text-[11px] font-normal text-muted-foreground">Defina resultado, indicadores e fronteiras.</span></summary><div className="mt-4">
    <div className="grid gap-4 lg:grid-cols-[1.55fr_.75fr]">
      <CharterTextarea label="Definição da meta" value={charter.goalDefinition} onChange={(value) => onFieldChange('goalDefinition', value)} testId="textarea-charter-goal" rows={3} placeholder="Ex.: reduzir de 18,4 para 11,0 min até 30/jun." />
      <CharterTextarea label="KPIs" value={charter.kpis} onChange={(value) => onFieldChange('kpis', value)} testId="textarea-charter-kpis" rows={3} placeholder="Ex.: NS atendimento" />
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <CharterTextarea label="Limites do projeto — inclui" value={charter.includedScope} onChange={(value) => onFieldChange('includedScope', value)} testId="textarea-charter-in-scope" rows={3} placeholder="Processos, unidades ou etapas que fazem parte." />
      <CharterTextarea label="Limites do projeto — exclui" value={charter.excludedScope} onChange={(value) => onFieldChange('excludedScope', value)} testId="textarea-charter-out-scope" rows={3} placeholder="O que fica explicitamente fora desta iniciativa." />
    </div>
    <div className="mt-5"><CharterTextarea label="Premissas e restrições do projeto" value={charter.assumptionsAndConstraints} onChange={(value) => onFieldChange('assumptionsAndConstraints', value)} testId="textarea-charter-assumptions" rows={3} placeholder="Ex.: acesso aos dados, janela de implementação, orçamento, dependências e regras que não podem mudar." /></div></div></details>
    <details id="charter-step-3" className="mt-3 rounded-xl border border-border bg-background/45 p-4 sm:p-5"><summary className="cursor-pointer list-inside text-sm font-bold marker:text-primary">03 · Cliente e VOC <span className="ml-2 text-[11px] font-normal text-muted-foreground">Registre necessidades e contribuição para o negócio.</span></summary><div className="mt-4 grid gap-4 lg:grid-cols-2">
    <CharterTextarea label="Requisitos do cliente" value={charter.customerRequirements} onChange={(value) => onFieldChange('customerRequirements', value)} testId="textarea-charter-customer-requirements" rows={3} placeholder="Necessidades, critérios de aceitação e pontos inegociáveis para o cliente." />
    <CharterTextarea label="Contribuições para o negócio — resumo" value={charter.businessContributions} onChange={(value) => onFieldChange('businessContributions', value)} testId="textarea-charter-business-contributions" rows={3} placeholder="Como o projeto apoia o negócio, sempre conectado à VOC, à meta e ao escopo." />
    </div></details>
    <details id="charter-step-4" className="mt-3 rounded-xl border border-border bg-background/45 p-4 sm:p-5"><summary className="cursor-pointer list-inside text-sm font-bold marker:text-primary">04 · Equipe <span className="ml-2 text-[11px] font-normal text-muted-foreground">Defina papéis, áreas e apoio técnico.</span></summary><div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <div className="min-w-[720px]"><div className="grid grid-cols-[150px_1fr_1fr_1fr] border-b border-border bg-muted/55"><div className="p-3 mono-label text-muted-foreground">Equipe de trabalho</div><div className="p-3 mono-label text-muted-foreground">Nome</div><div className="p-3 mono-label text-muted-foreground">Cargo</div><div className="p-3 mono-label text-muted-foreground">Área / Empresa</div></div>{teamRows.map(({ role, label, helper }) => <div key={role} className="grid grid-cols-[150px_1fr_1fr_1fr] border-b border-border last:border-0"><div className="bg-muted/25 p-3"><p className="text-[11px] font-bold">{label}</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{helper}</p></div><div className="border-l border-border p-2"><input data-testid={`input-charter-team-${role}-name`} value={charter.team[role].name} onChange={(event) => onTeamChange(role, 'name', event.target.value)} placeholder="Nome(s)" className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs outline-none focus:border-primary/60" /></div><div className="border-l border-border p-2"><input data-testid={`input-charter-team-${role}-position`} value={charter.team[role].position} onChange={(event) => onTeamChange(role, 'position', event.target.value)} placeholder="Cargo(s)" className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs outline-none focus:border-primary/60" /></div><div className="border-l border-border p-2"><input data-testid={`input-charter-team-${role}-area`} value={charter.team[role].areaCompany} onChange={(event) => onTeamChange(role, 'areaCompany', event.target.value)} placeholder="Área ou empresa" className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs outline-none focus:border-primary/60" /></div></div>)}</div>
    </div></details>
    <details id="charter-step-5" className="mt-3 rounded-xl border border-border bg-background/45 p-4 sm:p-5"><summary className="cursor-pointer list-inside text-sm font-bold marker:text-primary">05 · Valor financeiro <span className="ml-2 text-[11px] font-normal text-muted-foreground">Registre impactos, ganhos e base financeira.</span></summary><div data-testid="section-charter-business-value" className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="mb-4"><p className="mono-label text-primary">Valor para o negócio</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Registre apenas impactos relacionados à VOC e ao escopo. Ao iniciar o pipeline, a Suíte usará as contribuições quantitativas e as informações financeiras coletadas para calcular uma estimativa e refazer a meta do projeto.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CharterTextarea label="Contribuições quantitativas" value={charter.businessContributionsQuantitative} onChange={(value) => onFieldChange('businessContributionsQuantitative', value)} testId="textarea-charter-business-contributions-quantitative" rows={4} placeholder="Ex.: reduzir 20% do retrabalho, liberar 80 h/mês, elevar o atendimento de 82% para 92%." />
        <CharterTextarea label="Contribuições qualitativas" value={charter.businessContributionsQualitative} onChange={(value) => onFieldChange('businessContributionsQualitative', value)} testId="textarea-charter-business-contributions-qualitative" rows={4} placeholder="Ex.: mais previsibilidade para o cliente, menor esforço operacional e decisão mais segura." />
        <CharterTextarea label="Valor do ganho financeiro esperado" value={charter.financialGainValue} onChange={(value) => onFieldChange('financialGainValue', value)} testId="textarea-charter-financial-gain-value" rows={4} placeholder="Qual será o ganho se a meta for alcançada? Informe valor estimado, moeda e período." />
        <CharterTextarea label="Informações financeiras coletadas" value={charter.financialInformation} onChange={(value) => onFieldChange('financialInformation', value)} testId="textarea-charter-financial-information" rows={4} placeholder="Base da estimativa ou valor confirmado. Este campo não é preenchido pela Suíte." />
      </div>
    </div></details>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="text-[11px] text-muted-foreground"><Info size={13} className="mr-1 inline-block align-[-2px]" /> Ao salvar, o conteúdo fica no Repositório e será enviado ao Gemini como contexto ao iniciar o pipeline.</p><Button testId="button-save-charter" onClick={onSave} variant="outline"><Save size={14} /> Salvar no Repositório</Button></div>
  </section>;
}

function Overview({ statement, setStatement, onSave, statementSaved, charter, onCharterChange, onTeamChange, onSaveCharter, charterSaved, pipelineDone, hasAiSuggestions, onOpenArea, onOpenTool, phaseProgress, pulse }: { statement: string; setStatement: (value: string) => void; onSave: () => void; statementSaved: boolean; charter: ProjectCharterDraft; onCharterChange: (field: CharterTextField, value: string) => void; onTeamChange: (role: CharterTeamRole, field: keyof CharterTeamMember, value: string) => void; onSaveCharter: () => void; charterSaved: boolean; pipelineDone: boolean; hasAiSuggestions: boolean; onOpenArea: (area: Area) => void; onOpenTool: (tool: Tool) => void; phaseProgress: Record<'definition' | 'measurement' | 'aic', PhaseProgress>; pulse: ProjectPulse }) {
  const nextArea = phaseProgress.definition.progress < 100 ? 'definition' : phaseProgress.measurement.progress < 100 ? 'measurement' : 'aic';
  const nextPhase = areaMeta[nextArea];
  const pendingItems = [...new Set(Object.values(phaseProgress).flatMap((phase) => phase.pending))].slice(0, 4);
  return <div className="space-y-7">
    <section className="reveal relative overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar px-6 py-7 text-sidebar-foreground sm:px-9 sm:py-8"><div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[32px] border-sidebar-primary/10" /><div className="pointer-events-none absolute right-10 top-12 h-28 w-28 rounded-full border border-sidebar-primary/20" /><div className="relative flex flex-wrap items-end justify-between gap-6"><div className="max-w-2xl"><div className="flex flex-wrap items-center gap-2"><StatusPill tone="green">{pipelineDone ? 'Pipeline ativo' : 'Workspace pronto'}</StatusPill><span className="mono-label text-sidebar-foreground/45">Painel de decisão</span></div><h2 className="mt-4 font-serif text-3xl font-bold leading-[1.08] tracking-tight sm:text-[40px]">O que precisa acontecer agora?</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-sidebar-foreground/65">Acompanhe o avanço do projeto e continue pela próxima fase que ainda precisa de evidências.</p></div><Button testId="button-hero-start" onClick={() => onOpenArea(nextArea)} variant="solid">Continuar em {nextPhase.label} <ArrowRight size={15} /></Button></div></section>
    <section className="reveal-2 panel rounded-2xl p-5 sm:p-6"><SectionHeading eyebrow="Progresso DMAIC" title="O caminho do time" description="Cada fase fecha uma pergunta e indica a próxima decisão." /><div className="grid gap-3 lg:grid-cols-3">{(['definition', 'measurement', 'aic'] as const).map((id, index) => { const meta = areaMeta[id]; const phase = phaseProgress[id]; return <button key={id} data-testid={`card-sprint-${id}`} onClick={() => onOpenArea(id)} className="group rounded-xl border border-border bg-background/65 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>0{index + 1}</span><ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div><h3 className="mt-4 font-serif text-base font-bold">{meta.label}</h3><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all" style={{ width: `${phase.progress}%`, backgroundColor: meta.color }} /></div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{phase.progress}% completo</span><span>{phase.completed} de {phase.total}</span></div></button>; })}</div></section>
    <section className="reveal-3"><SectionHeading eyebrow="Pulso do projeto" title="O trabalho em uma leitura" action={<span className="inline-flex items-center gap-2 text-[11px] font-bold text-muted-foreground"><RefreshCw size={14} /> {pulse.updatedLabel}</span>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Dias no ciclo', value: pulse.cycleDays === null ? '—' : String(pulse.cycleDays), note: pulse.cycleNote, icon: Clock3, color: 'text-chart-3' }, { label: 'Indicador Y', value: pulse.indicatorValue, note: pulse.indicatorNote, icon: Activity, color: 'text-accent-foreground' }, { label: 'Vital Xs', value: pulse.vitalXsValue, note: pulse.vitalXsNote, icon: Zap, color: 'text-chart-4' }, { label: 'Confiança dos dados', value: pulse.dataConfidence, note: pulse.dataConfidenceNote, icon: ShieldCheck, color: 'text-primary' }].map((item) => <div key={item.label} data-testid={`metric-${item.label}`} className="panel rounded-xl p-4"><div className="flex items-start justify-between"><span className="text-xs font-semibold text-muted-foreground">{item.label}</span><item.icon size={17} className={item.color} strokeWidth={1.8} /></div><p className="mt-3 font-serif text-2xl font-bold">{item.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.note}</p></div>)}</div></section>
    <section className="reveal-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><div className="panel rounded-2xl p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground"><Info size={17} /></span><div><p className="mono-label text-accent-foreground">Atenção necessária</p><h3 className="mt-1 font-serif text-lg font-bold">Pendências do ciclo</h3></div></div>{pendingItems.length > 0 ? <ul className="mt-4 space-y-2 text-xs leading-relaxed">{pendingItems.map((item) => <li key={item} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{item}</li>)}</ul> : <p className="mt-4 text-xs text-muted-foreground">Nenhuma pendência crítica identificada.</p>}</div><div className="panel rounded-2xl p-5 sm:p-6"><p className="mono-label text-primary">Próximo passo recomendado</p><h3 className="mt-2 font-serif text-lg font-bold">{nextPhase.label}</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{phaseProgress[nextArea].next}</p><Button testId="button-continue-project" onClick={() => onOpenArea(nextArea)} className="mt-4">Abrir fase <ArrowRight size={14} /></Button></div></section>
    <details className="reveal-4 panel overflow-hidden rounded-2xl"><summary className="cursor-pointer list-inside px-5 py-5 text-sm font-bold marker:text-primary sm:px-6"><span className="mono-label mr-3 text-primary">Contexto do projeto</span>Problem Statement e Project Charter</summary><div className="space-y-6 border-t border-border p-5 sm:p-6"><section><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mono-label text-accent-foreground/70">Problema que guia o ciclo</p><h3 className="mt-2 font-serif text-lg font-bold">Problem statement</h3></div><ArtifactStatusBadge status={statementSaved ? 'validated' : 'edited'} /></div><textarea data-testid="textarea-problem-statement" value={statement} onChange={(event) => setStatement(event.target.value)} className="mt-5 min-h-[98px] w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span data-testid="text-problem-hint" className="text-[11px] text-muted-foreground"><Info size={13} className="mr-1 inline-block align-[-2px]" /> Seja específico sobre processo, impacto e janela de tempo.</span><Button testId="button-save-statement" onClick={onSave} variant="outline"><Save size={14} /> Salvar mudança</Button></div></section><ProjectCharterForm charter={charter} onFieldChange={onCharterChange} onTeamChange={onTeamChange} onSave={onSaveCharter} hasAiSuggestions={hasAiSuggestions} saved={charterSaved} /></div></details>
  </div>;
}

function ToolCard({ tool, onOpen }: { tool: Tool; onOpen: (tool: Tool) => void }) {
  const Icon = tool.icon;
  return <button data-testid={`card-tool-${tool.id}`} onClick={() => onOpen(tool)} className="group panel flex min-h-[154px] flex-col rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45"><div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `hsl(${tool.accent} / .12)`, color: `hsl(${tool.accent})` }}><Icon size={17} strokeWidth={1.8} /></span><span className="opacity-0 transition-opacity group-hover:opacity-100"><ArrowRight size={16} className="text-primary" /></span></div><div className="mt-auto pt-5"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{tool.title}</h3>{tool.tag && <span className="rounded bg-muted px-1.5 py-0.5 mono-label text-muted-foreground">{tool.tag}</span>}</div><p className="mt-1 text-[11px] text-muted-foreground">{tool.subtitle}</p><p className="mt-3 mono-label text-primary">{tool.status}</p></div></button>;
}

const phaseGoals: Record<'definition' | 'measurement' | 'aic' | 'control', string> = {
  definition: 'Definir o problema, o cliente e o escopo com clareza.',
  measurement: 'Transformar dados confiáveis em prioridades de investigação.',
  aic: 'Testar hipóteses, executar melhorias e verificar o resultado.',
  control: 'Monitorar a estabilidade e sustentar o resultado alcançado.',
};

function PhaseSummary({ area, progress, onOpenTool }: { area: 'definition' | 'measurement' | 'aic' | 'control'; progress: PhaseProgress; onOpenTool?: () => void }) {
  const pending = progress.pending;
  const next = progress.next;
  return <section data-testid={`phase-summary-${area}`} className="reveal sticky top-3 z-10 panel border-l-4 bg-card/95 p-4 shadow-lg backdrop-blur sm:p-5" style={{ borderLeftColor: areaMeta[area].color }}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><p className="mono-label text-primary">Objetivo da fase</p><p className="mt-1 text-sm font-bold">{phaseGoals[area]}</p></div>
      <div className="shrink-0 text-right"><p className="mono-label text-muted-foreground">Progresso real</p><p className="mt-1 font-serif text-2xl font-bold">{progress.completed}/{progress.total}</p><p className="text-[10px] text-muted-foreground">entregas concluídas</p></div>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all" style={{ width: `${progress.progress}%`, backgroundColor: areaMeta[area].color }} /></div>
    <div className="mt-4 grid gap-3 text-xs sm:grid-cols-[1fr_1fr_auto]"><div><p className="mono-label text-muted-foreground">Pendência principal</p><p className="mt-1 font-semibold">{pending[0] ?? 'Nenhuma pendência crítica'}</p>{pending.length > 1 && <p className="mt-1 text-[10px] text-muted-foreground">+ {pending.length - 1} outra(s) pendência(s)</p>}</div><div><p className="mono-label text-muted-foreground">Ação recomendada</p><p className="mt-1 font-semibold text-primary">{next}</p></div>{onOpenTool && <Button testId={`button-phase-action-${area}`} onClick={onOpenTool} className="self-end whitespace-nowrap">Abrir ferramenta <ArrowRight size={14} /></Button>}</div>
  </section>;
}

function ExecutiveSummary({ statement, charter, pipeline, ishikawa, hypothesisStatuses, hypothesisNotes, hypothesisLinks, controlPhase, attachments, searchTerm, onExport, onLinkChange, onAttachmentAdd, onDuplicate }: { statement: string; charter: ProjectCharterDraft; pipeline: DmaicPipeline | null; ishikawa: DmaicAnalysisArtifactsIshikawa | null; hypothesisStatuses: HypothesisStatusMap; hypothesisNotes: HypothesisNotesMap; hypothesisLinks: HypothesisLinksMap; controlPhase: ControlPhase; attachments: AttachmentRecord[]; searchTerm: string; onExport: () => void; onLinkChange: (key: string, field: keyof HypothesisLink, value: string) => void; onAttachmentAdd: (file: File) => void; onDuplicate: () => void }) {
  const [statusFilter, setStatusFilter] = useState<'Todos' | HypothesisStatus>('Todos');
  const causes = Object.entries(ishikawa ?? {}).flatMap(([category, items]) => (Array.isArray(items) ? items : []).filter(Boolean).map((cause) => ({ category, cause })));
  const hypotheses = causes.map((item) => ({ ...item, key: `${item.category}:${item.cause}`, status: hypothesisStatuses[`${item.category}:${item.cause}`] ?? 'Backlog', note: hypothesisNotes[`${item.category}:${item.cause}`] ?? '', link: hypothesisLinks[`${item.category}:${item.cause}`] ?? EMPTY_HYPOTHESIS_LINK })).filter((item) => statusFilter === 'Todos' || item.status === statusFilter).filter((item) => !searchTerm.trim() || `${item.category} ${item.cause} ${item.note} ${item.link.vitalX} ${item.link.test}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const actions = Array.isArray((pipeline as any)?.actionPlan) ? (pipeline as any).actionPlan as Partial<ActionPlanRow>[] : [];
  const openActions = actions.filter((action) => !action.notes?.toLowerCase().includes('conclu')).length;
  const alerts = [
    ...actions.filter((action) => !action.who?.trim() || !action.when?.trim()).map(() => 'Ação sem responsável ou prazo'),
    ...causes.filter((item) => !hypothesisNotes[`${item.category}:${item.cause}`]?.trim()).map((item) => `Hipótese sem evidência: ${item.cause}`),
    ...(!controlPhase.evaluation ? ['Revisão de controle pendente'] : []),
  ];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="mono-label text-primary">Decisão em uma página</p><h2 className="mt-2 font-serif text-3xl font-bold tracking-tight">Resumo executivo</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">O que sabemos, o que está sendo testado e o que precisa acontecer agora.</p></div><div className="flex flex-wrap gap-2"><Button testId="button-duplicate-project-model" onClick={onDuplicate} variant="outline"><Copy size={14} /> Duplicar como modelo</Button><Button testId="button-export-executive-report" onClick={onExport} variant="outline"><FileText size={14} /> Exportar relatório</Button></div></div>
    {alerts.length > 0 && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950"><Info size={16} className="mt-0.5 shrink-0" /><div><p className="font-bold">Atenção necessária</p><ul className="mt-2 grid gap-1 sm:grid-cols-2">{alerts.slice(0, 6).map((alert, index) => <li key={`${alert}-${index}`}>• {alert}</li>)}</ul></div></div>}
    <section className="panel rounded-xl p-5"><div className="flex items-start justify-between gap-3"><div><p className="mono-label text-primary">Problema do projeto</p><h3 className="mt-1 font-serif text-xl font-bold">O sinal que orienta a decisão</h3></div><StatusPill tone={statement ? 'green' : 'amber'}>{statement ? 'Definido' : 'Pendente'}</StatusPill></div><div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-4 text-sm leading-7 text-foreground">{statement || 'Ainda não definido.'}</div></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="panel rounded-xl p-4"><p className="mono-label text-muted-foreground">Y / indicador</p><p className="mt-2 text-sm font-bold">{(pipeline as any)?.indicatorsY?.primaryMetricY ?? 'Não definido'}</p></div><div className="panel rounded-xl p-4"><p className="mono-label text-muted-foreground">Baseline</p><p className="mt-2 text-sm font-bold">{(pipeline as any)?.indicatorsY?.baseline ?? 'Não registrado'}</p></div><div className="panel rounded-xl p-4"><p className="mono-label text-muted-foreground">Hipóteses</p><p className="mt-2 font-serif text-2xl font-bold">{hypotheses.length}</p><p className="text-[11px] text-muted-foreground">no filtro atual</p></div><div className="panel rounded-xl p-4"><p className="mono-label text-muted-foreground">Ações abertas</p><p className="mt-2 font-serif text-2xl font-bold">{openActions}</p><p className="text-[11px] text-muted-foreground">plano de ação</p></div></div>
    <section className="panel rounded-xl border-l-4 border-l-chart-3 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mono-label text-chart-3">Resultado atual</p><h3 className="mt-1 font-serif text-xl font-bold">Evidência pós-intervenção</h3></div><StatusPill tone={controlPhase.evaluation?.success ? 'green' : 'amber'}>{controlPhase.evaluation?.success ? 'Sucesso evidenciado' : 'Em validação'}</StatusPill></div><p className="mt-4 max-w-4xl text-sm leading-7 text-muted-foreground">{controlPhase.evaluation?.summary ?? 'Ainda não há uma avaliação pós-intervenção.'}</p></section>
    <section className="panel rounded-xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mono-label text-primary">Hipóteses e causas prioritárias</p><h3 className="mt-1 font-serif text-xl font-bold">O que está em movimento</h3></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'Todos' | HypothesisStatus)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold"><option>Todos</option>{(['Backlog', 'Próximo', 'Em teste', 'Comprovada', 'Rejeitada'] as HypothesisStatus[]).map((status) => <option key={status}>{status}</option>)}</select></div><div className="mt-4 divide-y divide-border">{hypotheses.length === 0 ? <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">Nenhuma hipótese corresponde ao filtro atual.</p> : hypotheses.map((item) => <div key={item.key} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="mono-label text-muted-foreground">{item.category}</p><p className="mt-1 text-sm font-bold">{item.cause}</p><p className="mt-1 max-w-3xl text-xs text-muted-foreground">{item.note || 'Sem evidência registrada.'}</p></div><StatusPill tone={item.status === 'Comprovada' ? 'green' : item.status === 'Rejeitada' ? 'red' : item.status === 'Em teste' ? 'amber' : 'gray'}>{item.status}</StatusPill></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{(['cause', 'vitalX', 'test', 'action', 'result'] as const).map((field) => <input key={field} value={field === 'cause' ? item.category : item.link[field]} onChange={(event) => field !== 'cause' && onLinkChange(item.key, field, event.target.value)} readOnly={field === 'cause'} placeholder={field === 'cause' ? 'Causa' : field === 'vitalX' ? 'X vital' : field === 'test' ? 'Teste' : field === 'action' ? 'Ação' : 'Resultado'} className="rounded border border-border bg-background px-2.5 py-2 text-[11px] outline-none focus:border-primary/60" />)}</div></div>)}</div></section>
    <section className="panel rounded-xl p-5"><p className="mono-label text-primary">Trilha de rastreabilidade</p><h3 className="mt-1 font-serif text-xl font-bold">Da causa ao resultado</h3><div className="mt-4 overflow-x-auto pb-2"><div className="flex min-w-[760px] items-center gap-2 text-center text-xs">{['Causa', 'Hipótese', 'Teste', 'Decisão', 'Ação', 'Resultado'].map((step, index) => <div key={step} className="flex flex-1 items-center gap-2"><div className="min-w-0 flex-1 rounded-lg border border-primary/20 bg-primary/5 p-3 font-bold">{step}<span className="mt-1 block text-[10px] font-normal text-muted-foreground">{index === 0 ? causes.length : index === 1 ? hypotheses.length : index === 4 ? openActions : index === 5 ? (controlPhase.evaluation ? 'Disponível' : 'Pendente') : 'A registrar'}</span></div>{index < 5 && <ArrowRight size={14} className="shrink-0 text-primary" />}</div>)}</div></div></section>
    <section className="panel rounded-xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mono-label text-primary">Evidências e anexos</p><p className="mt-1 text-xs text-muted-foreground">Ata, imagem, documento ou arquivo usado pela equipe.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold"><CloudUpload size={14} /> Adicionar anexo<input type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAttachmentAdd(file); }} /></label></div>{attachments.length ? <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{attachments.map((item, index) => <li key={`${item.name}-${index}`}>{item.name} · {Math.ceil(item.size / 1024)} KB</li>)}</ul> : <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Nenhum anexo nesta sessão.</p>}</section>
  </div>;
}

function ProjectRecordsPanel({ decisions, history, onDecisionsChange, onSave }: { decisions: ProjectDecision[]; history: ArtifactHistoryEntry[]; onDecisionsChange: (value: ProjectDecision[]) => void; onSave: () => void }) {
  const updateDecision = (index: number, field: keyof ProjectDecision, value: string) => onDecisionsChange(decisions.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  return <section data-testid="panel-project-records" className="panel space-y-5 rounded-xl p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mono-label text-primary">Governança da decisão</p><h3 className="mt-1 font-serif text-lg font-bold">Decisões e histórico</h3><p className="mt-1 text-xs text-muted-foreground">Registre por que uma decisão foi tomada e quais evidências sustentam o caminho.</p></div><div className="flex gap-2"><Button testId="button-add-decision" onClick={() => onDecisionsChange([...decisions, { ...EMPTY_PROJECT_DECISION, date: new Date().toISOString().slice(0, 10) }])}><Plus size={14} /> Registrar decisão</Button><Button testId="button-save-project-records" onClick={onSave} variant="outline"><Save size={14} /> Salvar registros</Button></div></div>
    {decisions.length === 0 ? <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">Ainda não há decisões registradas. Adicione a primeira decisão da equipe.</div> : <div className="space-y-3">{decisions.map((decision, index) => <div key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2"><textarea value={decision.decision} onChange={(event) => updateDecision(index, 'decision', event.target.value)} placeholder="Decisão" rows={2} className="rounded border border-border bg-background p-2 text-xs sm:col-span-2" /><input value={decision.owner} onChange={(event) => updateDecision(index, 'owner', event.target.value)} placeholder="Responsável" className="rounded border border-border bg-background p-2 text-xs" /><input type="date" value={decision.date} onChange={(event) => updateDecision(index, 'date', event.target.value)} className="rounded border border-border bg-background p-2 text-xs" /><textarea value={decision.evidence} onChange={(event) => updateDecision(index, 'evidence', event.target.value)} placeholder="Evidência" rows={2} className="rounded border border-border bg-background p-2 text-xs" /><textarea value={decision.impact} onChange={(event) => updateDecision(index, 'impact', event.target.value)} placeholder="Impacto esperado" rows={2} className="rounded border border-border bg-background p-2 text-xs" /></div>)}</div>}
    <div><p className="mono-label text-muted-foreground">Histórico de alterações</p>{history.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Nenhuma alteração registrada ainda.</p> : <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{history.slice(-6).reverse().map((entry, index) => <li key={`${entry.date}-${index}`}><strong>{entry.artifact}</strong> · {entry.action} · {new Intl.DateTimeFormat('pt-BR').format(new Date(entry.date))} · {entry.detail}</li>)}</ul>}</div>
  </section>;
}

function SprintView({
  area,
  onOpenTool,
  ishikawa,
  hypothesisStatuses,
  hypothesisNotes,
  onHypothesisNoteChange,
  hypothesisValidationError,
  projectDecisions,
  artifactHistory,
  onProjectDecisionsChange,
  onSaveProjectRecords,
  onHypothesisStatusChange,
  onSaveHypotheses,
  hypothesesDirty,
  hypothesesSaved,
  phaseProgress,
  onChangeVital,
  vitalId,
  inputDataset,
  inputAnalysis,
  inputError,
  analysisMonths,
  onAnalysisMonthsChange,
  selectedIndicator,
  onSelectedIndicatorChange,
  diagnosis,
  diagnosisInput,
  onDiagnosisChange,
  onSaveAnalysis,
  onUpload,
  inputRef,
  activeProjectName,
  pipeline,
  causeAndEffectMatrix,
  solutionPrioritizationMatrix,
  setCauseAndEffectMatrix,
  setSolutionPrioritizationMatrix,
  onSaveMatrices,
  onExportMeasurementPdf,
}: {
  area: 'definition' | 'measurement' | 'aic' | 'control';
  onOpenTool: (tool: Tool) => void;
  ishikawa: DmaicAnalysisArtifactsIshikawa | null;
  hypothesisStatuses: HypothesisStatusMap;
  hypothesisNotes: HypothesisNotesMap;
  onHypothesisNoteChange: (key: string, note: string) => void;
  hypothesisValidationError: string | null;
  projectDecisions: ProjectDecision[];
  artifactHistory: ArtifactHistoryEntry[];
  onProjectDecisionsChange: (value: ProjectDecision[]) => void;
  onSaveProjectRecords: () => void;
  onHypothesisStatusChange: (key: string, status: HypothesisStatus) => void;
  onSaveHypotheses: () => void;
  hypothesesDirty: boolean;
  hypothesesSaved: boolean;
  phaseProgress: PhaseProgress;
  onChangeVital: (id: string) => void;
  vitalId: string;
  inputDataset: InputDataset | null;
  inputAnalysis: IndicatorAnalysis | null;
  inputError: string | null;
  analysisMonths: number;
  onAnalysisMonthsChange: (months: number) => void;
  selectedIndicator: string;
  onSelectedIndicatorChange: (indicator: string) => void;
  diagnosis: string | null;
  diagnosisInput: DmaicExploratoryDiagnosisInput | null;
  onDiagnosisChange: (diagnosis: string | null, input: DmaicExploratoryDiagnosisInput) => void;
  onSaveAnalysis: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  inputRef: { current: HTMLInputElement | null };
  activeProjectName: string;
  pipeline: DmaicPipeline | null;
  causeAndEffectMatrix: any;
  solutionPrioritizationMatrix: any;
  setCauseAndEffectMatrix: (val: any) => void;
  setSolutionPrioritizationMatrix: (val: any) => void;
  onSaveMatrices: (causeData?: any, solData?: any) => void;
  onExportMeasurementPdf: () => void;
}) {
  const meta = areaMeta[area];
  const selectedVital = vitalXs.find((vital) => vital.id === vitalId) ?? vitalXs[0];
  const hypotheses = ishikawa
    ? Object.entries(ishikawa).flatMap(([category, causes]) =>
        (Array.isArray(causes) ? causes : [])
          .map((cause) => cause.trim())
          .filter(Boolean)
            .map((cause) => ({ key: `${category}:${cause}`, name: `${category} · ${cause}` }))
      )
    : [];
  return (
    <div className="space-y-7">
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          {meta.kicker && <p className="mono-label mb-2" style={{ color: meta.color }}>{meta.kicker}</p>}
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{meta.label}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone="green">Em andamento</StatusPill>
          <button data-testid="button-sprint-options" onClick={() => onOpenTool(tools[area][0])} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground">
            <MoreHorizontal size={17} />
          </button>
        </div>
      </div>

      <PhaseSummary area={area} progress={phaseProgress} onOpenTool={() => onOpenTool(tools[area][0])} />
      {area === 'measurement' && <div className="reveal-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"><div><p className="mono-label text-primary">Relatório da Medição</p><p className="mt-1 text-xs text-muted-foreground">Exporte todos os artefatos dinâmicos da fase, incluindo o mapa de processos.</p></div><Button testId="button-export-measurement-pdf" onClick={onExportMeasurementPdf} variant="outline"><FileText size={14} /> Exportar Medição em PDF</Button></div>}

      {area === 'measurement' && (
        <div className="reveal-2 panel flex flex-wrap items-center justify-between gap-4 rounded-xl border-l-4 border-l-chart-3 p-4">
          <div className="flex items-center gap-3">
            <IconBadge icon={Gauge} tone="chart-3" />
            <div>
              <p className="text-sm font-bold">Indicador Y em foco</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Tempo total até aprovação · <span className="font-bold text-foreground">12,8 min</span> mediana</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="vital-select" className="mono-label text-muted-foreground">Vital X</label>
            <select id="vital-select" data-testid="select-vital-x" value={vitalId} onChange={(event) => onChangeVital(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary/50">
              {vitalXs.map((vital) => <option key={vital.id} value={vital.id}>{vital.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {area === 'measurement' && (
        <div className="reveal-3 panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mono-label text-chart-3">Vital X selecionado</p>
              <h3 className="mt-2 font-serif text-xl font-bold">{selectedVital.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{selectedVital.note} · janela de 30 dias</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-2xl font-bold">{selectedVital.value}</p>
              <p className="mt-1 text-[11px] font-bold text-primary">{selectedVital.delta} vs. baseline</p>
            </div>
          </div>
          <div className="mt-5 grid h-14 grid-cols-12 items-end gap-1.5 border-b border-border pb-0 sm:grid-cols-24">
            {[30, 36, 34, 42, 38, 45, 40, 49, 46, 54, 51, 48, 58, 53, 56, 62, 59, 64, 57, 68, 61, 65, 72, 66].map((height, index) => (
              <div key={index} className="rounded-t-sm bg-chart-3/60 transition-all hover:bg-chart-3" style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between mono-label text-muted-foreground">
            <span>01 mai</span>
            <span>30 mai</span>
          </div>
        </div>
      )}

      {area === 'definition' && (
        <InputDataPanel
          dataset={inputDataset}
          analysis={inputAnalysis}
          error={inputError}
          months={analysisMonths}
          onMonthsChange={onAnalysisMonthsChange}
          selectedIndicator={selectedIndicator}
          onIndicatorChange={onSelectedIndicatorChange}
          diagnosis={diagnosis}
          diagnosisInput={diagnosisInput}
          onDiagnosisChange={onDiagnosisChange}
          onSaveAnalysis={onSaveAnalysis}
          onUpload={onUpload}
          inputRef={inputRef}
          activeProjectName={activeProjectName}
        />
      )}

      <div className="reveal-2">
        <SectionHeading
          eyebrow={area === 'definition' ? 'Entregáveis de enquadramento' : area === 'measurement' ? 'Entregáveis de evidência' : 'Entregáveis de mudança'}
          title={area === 'definition' ? 'Dê nome ao problema certo' : area === 'measurement' ? 'Meça sem adivinhar' : 'Faça a solução pegar'}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tools[area].map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={onOpenTool} />)}
      </div>

      {area === 'aic' && (
  <div className="reveal-3 mt-6">
    <Sprint3Matrices
      initialCauseAndEffect={causeAndEffectMatrix ?? (pipeline as any)?.causeAndEffectMatrix}
      initialEffortImpact={(pipeline as any)?.effortImpactMatrix}
      initialSolutions={solutionPrioritizationMatrix ?? (pipeline as any)?.solutionPrioritizationMatrix}
      onChangeCauseAndEffect={(data) => {
        // Atualiza o estado global imediatamente a cada alteração ou inclusão de linha
        setCauseAndEffectMatrix(data);
      }}
      onChangeSolutions={(data) => {
        setSolutionPrioritizationMatrix(data);
      }}
      onSave={(causeData, solData) => {
        const finalCauseData = causeData ?? causeAndEffectMatrix;
        const finalSolData = solData ?? solutionPrioritizationMatrix;

        if (finalCauseData) setCauseAndEffectMatrix(finalCauseData);
        if (finalSolData) setSolutionPrioritizationMatrix(finalSolData);
        
        // Dispara o salvamento para a BD enviando as causas atualizadas
        onSaveMatrices(finalCauseData, finalSolData);
      }}
    />
  </div>
)}

      {area === 'aic' && (
        <div className="reveal-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <div className="panel rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label text-chart-4">Hipóteses em teste</p>
                <h3 className="mt-2 font-serif text-lg font-bold">Do provável ao comprovado</h3>
              </div>
              <div className="flex items-center gap-1">
                <ArtifactStatusBadge status={hypothesesDirty ? 'edited' : hypothesesSaved ? 'validated' : hypotheses.length ? 'ai' : 'edited'} />
                {hypothesesDirty || hypothesesSaved ? <button type="button" data-testid="button-save-hypotheses" onClick={onSaveHypotheses} disabled={!hypothesesDirty} className="rounded-lg border border-border px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50">{hypothesesSaved && !hypothesesDirty ? 'Salvo' : 'Salvar'}</button> : null}
                <button
                  type="button"
                  data-testid="button-edit-hypotheses"
                  aria-label="Editar hipóteses"
                  title="Editar hipóteses"
                  onClick={() => onOpenTool(tools.aic[0])}
                  className="rounded-lg p-2 text-chart-4 transition-colors hover:bg-chart-4/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chart-4/50"
                >
                  <Pencil size={18} />
                </button>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {(hypotheses.length ? hypotheses : [{ key: 'empty', name: 'Nenhuma causa registrada na matriz Ishikawa' }]).map((item, index) => {
                const status = hypothesisStatuses[item.key] ?? 'Backlog';
                const progress = { Backlog: 12, 'Próximo': 32, 'Em teste': 68, Comprovada: 100, Rejeitada: 0 }[status];
                return <div key={item.key}>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="font-semibold">{hypotheses.length ? `H${index + 1} · ${item.name}` : item.name}</span>
                    {hypotheses.length && <div className="flex items-center gap-2">{status === 'Comprovada' && <ArtifactStatusBadge status="approved" />}<select aria-label={`Status de H${index + 1}`} data-testid={`select-hypothesis-status-${index}`} value={status} onChange={(event) => onHypothesisStatusChange(item.key, event.target.value as HypothesisStatus)} className="rounded border border-border bg-background px-1.5 py-1 mono-label text-muted-foreground outline-none focus:border-primary/60">
                      {(['Backlog', 'Próximo', 'Em teste', 'Comprovada', 'Rejeitada'] as HypothesisStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
                    </select></div>}
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-chart-4" style={{ width: `${hypotheses.length ? progress : 0}%` }} />
                  </div>
                  {hypotheses.length > 0 && <textarea aria-label={`Evidência de H${index + 1}`} value={hypothesisNotes[item.key] ?? ''} onChange={(event) => onHypothesisNoteChange(item.key, event.target.value)} placeholder="Evidência ou nota da equipe" rows={2} className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] outline-none focus:border-primary/60" />}
                </div>;
              })}
            </div>
                {hypothesisValidationError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{hypothesisValidationError}</p>}
          </div>
          <div className="panel rounded-xl bg-accent/10 p-5">
            <p className="mono-label text-accent-foreground">Próximo checkpoint</p>
            <h3 className="mt-2 font-serif text-lg font-bold">Review de controle</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Quinta, 06 jun · 14:30<br />Validar plano de reação e dono do SOP.
            </p>
            <Button testId="button-checkpoint-actions" onClick={() => onOpenTool(tools.aic.find((tool) => tool.id === 'solutions') ?? tools.aic[0])} variant="dark" className="mt-5">
              Abrir ações do checkpoint <ClipboardCheck size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
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

function ExploratoryAnalysisPanel({ dataset, analysis, months, diagnosis, diagnosisInput, onDiagnosisChange, activeProjectName }: { dataset: InputDataset; analysis: IndicatorAnalysis; months: number; diagnosis: string | null; diagnosisInput: DmaicExploratoryDiagnosisInput | null; onDiagnosisChange: (diagnosis: string | null, input: DmaicExploratoryDiagnosisInput) => void; activeProjectName: string }) {
  const summary = buildExploratorySummary(dataset, analysis, months);
  const diagnosisMutation = useRunDmaicExploratoryDiagnosis();
  const diagnosisPoints = summary ? samplePointsForDiagnosis(summary.points) : [];
  const diagnosisIsSampled = diagnosisPoints.length < (summary?.points.length ?? 0);
  const diagnosisStatus: ArtifactStatus | null = diagnosis
    ? diagnosisMatchesCurrentAnalysis(diagnosis, diagnosisInput, analysis.indicator, summary) ? 'ai' : 'stale'
    : null;
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
    <div className="flex items-center gap-2">{diagnosisStatus && <ArtifactStatusBadge status={diagnosisStatus} />}<StatusPill tone="green">Dados do CSV · local</StatusPill><Button testId="button-export-exploratory-analysis" variant="outline" onClick={() => exportExploratoryPdf(summary, analysis.indicator, diagnosisMutation.data?.diagnosis ?? diagnosis, activeProjectName)}><FileText size={14} /> Exportar visão</Button></div>
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
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mono-label text-primary">Diagnóstico detalhado da Suíte</p><p className="mt-1 text-xs text-muted-foreground">Peça ao Gemini uma leitura completa de tendência, estabilidade, distribuição, normalidade e próximos passos do DMAIC.</p>{diagnosisIsSampled && <p className="mt-1 text-[11px] text-muted-foreground">Para manter a leitura focada, o Gemini recebe uma amostra cronológica de {DIAGNOSIS_POINT_LIMIT} pontos; os gráficos e estatísticas usam todas as {summary.points.length} observações.</p>}</div><Button testId="button-generate-exploratory-diagnosis" onClick={runDiagnosis} disabled={diagnosisMutation.isPending || diagnosisPoints.length < 2} variant="outline">{diagnosisMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}{diagnosisMutation.isPending ? 'Analisando...' : 'Gerar diagnóstico detalhado'}</Button></div>
      {diagnosisMutation.isError && <p data-testid="status-exploratory-diagnosis-error" className="mt-3 rounded-lg bg-destructive/5 p-3 text-xs text-destructive">{diagnosisMutation.error instanceof Error ? diagnosisMutation.error.message.replace(/^HTTP \d+ [^:]+:\s*/, '') : 'Não foi possível obter o diagnóstico textual agora. A análise estatística local continua disponível.'}</p>}
      {(diagnosisMutation.data?.diagnosis ?? diagnosis) && <div data-testid="text-exploratory-diagnosis" className="mt-4 max-w-none overflow-visible whitespace-pre-wrap break-words border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground"><p className="mb-3 text-xs font-bold text-foreground">Leitura detalhada do comportamento da série</p>{(diagnosisMutation.data?.diagnosis ?? diagnosis)?.split(/\n{2,}/).map((paragraph, index) => <p key={index} className="mb-3 last:mb-0">{paragraph.trim()}</p>)}</div>}
    </div>
  </section>;
}

function InputDataPanel({ dataset, analysis, error, months, onMonthsChange, selectedIndicator, onIndicatorChange, diagnosis, diagnosisInput, onDiagnosisChange, onSaveAnalysis, onUpload, inputRef, activeProjectName }: { dataset: InputDataset | null; analysis: IndicatorAnalysis | null; error: string | null; months: number; onMonthsChange: (months: number) => void; selectedIndicator: string; onIndicatorChange: (indicator: string) => void; diagnosis: string | null; diagnosisInput: DmaicExploratoryDiagnosisInput | null; onDiagnosisChange: (diagnosis: string | null, input: DmaicExploratoryDiagnosisInput) => void; onSaveAnalysis: () => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; inputRef: { current: HTMLInputElement | null }; activeProjectName: string }) {
  return <section data-testid="panel-input-data" className="reveal-4 panel rounded-xl border-dashed p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><IconBadge icon={CloudUpload} tone="accent" /><div><p className="mono-label text-accent-foreground">Entrada da Definição</p><h3 className="mt-1.5 text-sm font-bold">Dados para análise</h3><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{dataset ? `${dataset.fileName} · ${dataset.rows.length} linhas · ${dataset.headers.length} colunas` : 'Ainda não há dados. Comece carregando um CSV para selecionar o indicador e medir o comportamento do processo.'}</p></div></div>
      <div className="flex flex-wrap items-center gap-2">
        {dataset && <Button testId="button-export-input-data" variant="outline" onClick={() => exportInputDataPdf(dataset, analysis, months, diagnosis, activeProjectName)}><FileText size={14} /> Exportar visão</Button>}
        <label data-testid="button-upload-csv" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold transition-colors hover:border-primary/45 hover:bg-primary/5"><Upload size={14} /> {dataset ? 'Trocar CSV' : 'Carregar CSV'}<input ref={inputRef} data-testid="input-upload-csv" type="file" accept=".csv,text/csv" onChange={onUpload} className="sr-only" /></label>
      </div>
    </div>
    {dataset && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary/5 px-3.5 py-3"><p className="text-[11px] leading-relaxed text-muted-foreground"><Check size={13} className="mr-1.5 inline-block align-[-2px] text-primary" /> Esta análise é salva automaticamente no Repositório após o upload e as alterações dos parâmetros.</p><Button testId="button-save-analysis" onClick={onSaveAnalysis} variant="outline"><Save size={14} /> Salvar análise agora</Button></div>}
    {error && <div data-testid="status-input-data-error" className="mt-4 flex gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs text-destructive"><Info size={16} className="mt-0.5 shrink-0" /><p>{error}</p></div>}
    {dataset && <div className="mt-5 grid gap-3 rounded-xl border border-border bg-background/60 p-4 md:grid-cols-[1fr_150px]">
      <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">Indicador a analisar</span><select data-testid="select-analysis-indicator" value={selectedIndicator} onChange={(event) => onIndicatorChange(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold outline-none focus:border-primary/60">{dataset.indicatorColumns.map((indicator) => <option key={indicator} value={indicator}>{indicator}</option>)}</select></label>
      <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">Últimos N meses</span><input data-testid="input-analysis-months" type="number" min="1" max="120" value={months} onChange={(event) => onMonthsChange(Math.min(120, Math.max(1, Number(event.target.value) || 1)))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold outline-none focus:border-primary/60" /></label>
    </div>}
    {dataset && analysis && <div data-testid="panel-analysis-summary" className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="mono-label text-primary">Resumo do indicador</p><h4 className="mt-1 text-sm font-bold">{analysis.indicator}</h4></div><div className="flex items-center gap-2"><StatusPill tone="green">{analysis.kind === 'continuous' ? 'Contínuo' : 'Discreto'}</StatusPill><span data-testid="text-analysis-rows" className="mono-label text-muted-foreground">{analysis.rows} observações · {dataset.dateColumn ? `últimos ${months} meses` : 'sem coluna de período'}</span></div></div>
      {analysis.kind === 'continuous' ? <><div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{[['Média', analysis.mean, 'stat-analysis-mean'], ['Mediana', analysis.median, 'stat-analysis-median'], ['Mínimo', analysis.minimum, 'stat-analysis-min'], ['Máximo', analysis.maximum, 'stat-analysis-max'], ['Desvio-padrão', analysis.standardDeviation, 'stat-analysis-standard-deviation']].map(([label, value, testId]) => <div key={String(label)} data-testid={String(testId)} className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-bold">{formatMetric(Number(value))}</p></div>)}<div data-testid="stat-analysis-normality" className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">Normalidade</p><p className={`mt-1 text-xs font-bold ${analysis.normality === 'Não normal' ? 'text-destructive' : 'text-primary'}`}>{analysis.normality}</p></div></div><p data-testid="text-analysis-normality-detail" className="mt-3 text-[11px] text-muted-foreground">{analysis.normalityDetail}</p></> : <><div className="mt-4 grid gap-2 sm:grid-cols-3"><div data-testid="stat-analysis-top-category" className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">Categoria dominante</p><p className="mt-1 truncate text-sm font-bold">{analysis.topCategory}</p></div><div className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">Ocorrências</p><p className="mt-1 font-mono text-sm font-bold">{analysis.topCategoryCount}</p></div><div className="rounded-lg border border-border bg-background p-3"><p className="mono-label text-muted-foreground">Categorias</p><p className="mt-1 font-mono text-sm font-bold">{analysis.categoryCount}</p></div></div><div className="mt-4 space-y-2">{analysis.distribution.map((item) => <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3 text-[11px]"><div><div className="mb-1 flex justify-between gap-2"><span className="truncate font-semibold">{item.label}</span><span className="mono-label text-muted-foreground">{item.percentage.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-r bg-muted"><div className="h-full rounded-r bg-accent" style={{ width: `${item.percentage}%` }} /></div></div><span className="text-right font-mono font-bold">{item.count}</span></div>)}</div><p className="mt-3 text-[11px] text-muted-foreground">Média, mediana, mínimo, máximo, desvio-padrão e normalidade não se aplicam a este indicador categórico.</p></>}
    </div>}
    {dataset && analysis && <ExploratoryAnalysisPanel dataset={dataset} analysis={analysis} months={months} diagnosis={diagnosis} diagnosisInput={diagnosisInput} onDiagnosisChange={onDiagnosisChange} activeProjectName={activeProjectName} />}
    <p className="mt-4 text-[11px] text-muted-foreground"><Info size={13} className="mr-1 inline-block align-[-2px]" /> O arquivo é processado localmente no navegador. A coluna de data, quando identificada, define o recorte dos últimos N meses.</p>
  </section>;
}

function DetailDrawer({ tool, onClose, pareto, imr, inputAnalysis, hasInputDataset, csvError, onRetry, pipeline, hasDiagnosis = false, manualRows, hasManualChanges, manualSaveConfirmed, onManualRowsChange, onSaveManualRows, charter, activeProjectName, sipocDirty = false, sipocSaved = false, onSipocChange, onSaveSipoc, msaDirty = false, msaSaved = false, onMsaChange, onSaveMsa, vitalXDirty = false, vitalXSaved = false, onVitalXChange, onSaveVitalX, gutDirty = false, gutSaved = false, onGutChange, onSaveGut, solutionsDirty = false, solutionsSaved = false, onSolutionsChange, onSaveSolutions, controlPlanDirty = false, controlPlanSaved = false, onControlPlanChange, onSaveControlPlan, ishikawa, ishikawaInputText = '', ishikawaDirty = false, ishikawaSaved = false, ishikawaGenerating = false, ishikawaError = null, onIshikawaInputTextChange, onGenerateIshikawa, onIshikawaChange, onSaveIshikawa }: { tool: Tool; onClose: () => void; pareto: { name: string; value: number }[] | null; imr: number[] | null; inputAnalysis?: IndicatorAnalysis | null; hasInputDataset: boolean; csvError: string | null; onRetry: () => void; pipeline: DmaicPipeline | null; hasDiagnosis?: boolean; manualRows: DmaicVocCqt[]; hasManualChanges: boolean; manualSaveConfirmed: boolean; onManualRowsChange: (rows: DmaicVocCqt[]) => void; onSaveManualRows: () => void; charter?: ProjectCharterDraft; activeProjectName?: string; sipocDirty?: boolean; sipocSaved?: boolean; onSipocChange?: (next: DmaicSipoc) => void; onSaveSipoc?: () => void; msaDirty?: boolean; msaSaved?: boolean; onMsaChange?: (next: MsaRow[]) => void; onSaveMsa?: () => void; vitalXDirty?: boolean; vitalXSaved?: boolean; onVitalXChange?: (next: VitalXBreakdownRow[]) => void; onSaveVitalX?: () => void; gutDirty?: boolean; gutSaved?: boolean; onGutChange?: (next: GutRow[]) => void; onSaveGut?: () => void; solutionsDirty?: boolean; solutionsSaved?: boolean; onSolutionsChange?: (next: SolutionRow[]) => void; onSaveSolutions?: () => void; controlPlanDirty?: boolean; controlPlanSaved?: boolean; onControlPlanChange?: (next: ControlPlanRow[]) => void; onSaveControlPlan?: () => void; ishikawa?: DmaicAnalysisArtifactsIshikawa; ishikawaInputText?: string; ishikawaDirty?: boolean; ishikawaSaved?: boolean; ishikawaGenerating?: boolean; ishikawaError?: string | null; onIshikawaInputTextChange?: (value: string) => void; onGenerateIshikawa?: () => void; onIshikawaChange?: (value: Record<string, string[]>) => void; onSaveIshikawa?: () => void }) {
  const [tab, setTab] = useState<'preview' | 'data'>('preview');
  const [maximized, setMaximized] = useState(() => ['process-map', 'causes', 'solutions'].includes(tool.id));
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
  const detailDirty = hasManualChanges || sipocDirty || msaDirty || vitalXDirty || gutDirty || controlPlanDirty;
  const detailSaved = manualSaveConfirmed || sipocSaved || msaSaved || vitalXSaved || gutSaved || controlPlanSaved;
  const detailStatus: ArtifactStatus = detailDirty ? 'edited' : detailSaved ? 'validated' : pipeline ? 'ai' : 'edited';
  if (tool.id === 'solutions') {
    return <SolutionsActionPlanDrawer tool={tool} onClose={onClose} pipeline={pipeline} dirty={solutionsDirty} saved={solutionsSaved} onChange={(rows) => onSolutionsChange?.(rows as unknown as SolutionRow[])} onSave={() => onSaveSolutions?.()} />;
  }
  if (tool.id === 'causes') {
    return <div className="fixed inset-0 z-40 flex justify-end bg-sidebar/25 backdrop-blur-[2px]" onClick={onClose}>
      <section role="dialog" aria-modal="true" data-testid="panel-tool-detail" onClick={(event) => event.stopPropagation()} className={`flex h-full w-full flex-col overflow-y-auto border-l border-border bg-background shadow-2xl transition-[max-width] duration-200 ${maximized ? 'max-w-full' : 'max-w-[960px]'}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-background/95 px-5 py-5 backdrop-blur">
          <div className="flex gap-3"><IconBadge icon={tool.icon} tone="primary" /><div><p className="mono-label text-primary">Hipóteses geradas pela Suíte e validadas pela equipe</p><h2 className="mt-1 font-serif text-xl font-bold">{tool.title}</h2><p className="mt-1 text-xs text-muted-foreground">{tool.subtitle}</p></div></div>
          <div className="flex items-center gap-1"><button data-testid="button-maximize-tool" aria-label={maximized ? 'Restaurar tamanho' : 'Maximizar painel'} aria-pressed={maximized} onClick={() => setMaximized((value) => !value)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">{maximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button><button data-testid="button-close-tool" aria-label="Fechar detalhe" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div>
        </div>
        <div className="flex-1 p-5"><IshikawaDiagramEditor sourceText={ishikawaInputText} value={ishikawa ?? null} dirty={ishikawaDirty} saved={ishikawaSaved} generating={ishikawaGenerating} error={ishikawaError} onSourceTextChange={(value) => onIshikawaInputTextChange?.(value)} onGenerate={() => onGenerateIshikawa?.()} onChange={(value) => onIshikawaChange?.(value)} onSave={() => onSaveIshikawa?.()} /></div>
      </section>
    </div>;

  }
  return <div className="fixed inset-0 z-40 flex justify-end bg-sidebar/25 backdrop-blur-[2px]" onClick={onClose}><section role="dialog" aria-modal="true" data-testid="panel-tool-detail" onClick={(event) => event.stopPropagation()} className={`flex h-full w-full flex-col overflow-y-auto border-l border-border bg-background shadow-2xl transition-[max-width] duration-200 ${maximized ? 'max-w-full' : 'max-w-[560px]'}`}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-background/95 px-5 py-5 backdrop-blur"><div className="flex gap-3"><IconBadge icon={tool.icon} tone="primary" /><div><p className="mono-label text-primary">{pipeline ? 'Gerado pela Suíte' : manualRows.length > 0 ? 'Editado pela equipe' : tool.tag ?? 'Entregável gerado'}</p><h2 className="mt-1 font-serif text-xl font-bold">{tool.title}</h2><p className="mt-1 text-xs text-muted-foreground">{tool.subtitle}</p></div></div><div className="flex items-center gap-1"><button data-testid="button-maximize-tool" aria-label={maximized ? 'Restaurar tamanho' : 'Maximizar painel'} aria-pressed={maximized} onClick={() => setMaximized((value) => !value)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">{maximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button><button data-testid="button-close-tool" aria-label="Fechar detalhe" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div></div><div className="border-b border-border px-5 pt-4"><div className="flex gap-5"><button data-testid="tab-preview" onClick={() => setTab('preview')} className={`border-b-2 pb-3 text-xs font-bold ${tab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Visualização</button><button data-testid="tab-data" onClick={() => setTab('data')} className={`border-b-2 pb-3 text-xs font-bold ${tab === 'data' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Dados & notas</button></div></div><div className="flex-1 p-5">{csvError && isAnalysisTool ? <div data-testid="status-tool-csv-error" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"><div className="flex gap-3"><Info size={17} className="mt-0.5 shrink-0 text-destructive" /><div><p className="text-sm font-bold text-destructive">Não foi possível ler o arquivo</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{csvError}</p><Button testId="button-retry-upload" onClick={onRetry} variant="outline" className="mt-3"><RefreshCw size={13} /> Tentar com outro arquivo</Button></div></div></div> : isAnalysisTool && !hasCompatibleData ? <div data-testid="status-tool-no-data" className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4"><div className="flex gap-3"><Info size={17} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-sm font-bold">Visualização indisponível</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{unavailableMessage}</p></div></div></div> : tab === 'preview' ? <>{isPareto && pareto ? <ParetoChart data={pareto} cumulative={cumulative} source={source} /> : isImr && imr ? <ImrChart data={imr} source={source} /> : tool.id === 'voc' ? <VocCqtMap rows={pipeline?.vocCtq ?? []} hasPipeline={Boolean(pipeline)} hasDiagnosis={hasDiagnosis} manualRows={manualRows} hasManualChanges={hasManualChanges} hasManualSaveConfirmation={manualSaveConfirmed} onManualRowsChange={onManualRowsChange} onSaveManualRows={onSaveManualRows} /> : tool.id === 'sipoc' ? <SipocMap sipoc={pipeline?.sipoc ?? null} hasPipeline={Boolean(pipeline)} dirty={sipocDirty} saved={sipocSaved} onChange={(next) => onSipocChange?.(next)} onSave={() => onSaveSipoc?.()} /> : tool.id === 'msa' ? <GenericPreview tool={tool} pipeline={pipeline} /> : tool.id === 'vitalx' ? <GenericPreview tool={tool} pipeline={pipeline} /> : tool.id === 'gut' ? <GenericPreview tool={tool} pipeline={pipeline} /> : tool.id === 'solutions' ? <GenericPreview tool={tool} pipeline={pipeline} /> : tool.id === 'control-plan' ? <GenericPreview tool={tool} pipeline={pipeline} /> : <GenericPreview tool={tool} pipeline={pipeline} />}</> : <DataNotes tool={tool} pareto={pareto} imr={imr} source={source} />}</div><div className="border-t border-border bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><span className="mono-label text-muted-foreground">{pipeline ? 'Conteúdo gerado por Gemini' : manualRows.length > 0 ? 'Indicadores manuais · equipe' : hasInputDataset && isAnalysisTool ? hasCompatibleData ? 'Dados do CSV · local' : 'Sem dados compatíveis' : 'Conteúdo de exemplo · local'}</span><Button testId="button-export-tool" variant="outline" onClick={tool.id === 'charter' && charter ? () => exportProjectCharterPdf(charter, activeProjectName?.trim() || 'Novo projeto') : tool.id === 'sipoc' ? () => exportSipocPdf(pipeline?.sipoc?.length ? pipeline.sipoc : exampleSipoc, activeProjectName?.trim() || 'Novo projeto') : tool.id === 'voc' ? () => exportVocPdf((pipeline?.vocCtq?.length ? pipeline.vocCtq : manualRows.length ? manualRows : exampleVocRows), activeProjectName?.trim() || 'Novo projeto') : undefined}><FileText size={14} /> Exportar visão</Button></div></div></section></div>;
}

function ActionPlanGrid({ rows, dirty, saved, onChange, onSave }: { rows: ActionPlanRow[]; dirty: boolean; saved: boolean; onChange: (rows: ActionPlanRow[]) => void; onSave: () => void }) {
  const columns: { key: keyof ActionPlanRow; label: string; tone: string }[] = [
    { key: 'what', label: 'O Que', tone: 'bg-muted' },
    { key: 'why', label: 'Porque', tone: 'bg-primary/15' },
    { key: 'who', label: 'Quem', tone: 'bg-muted' },
    { key: 'how', label: 'Como', tone: 'bg-primary/15' },
    { key: 'howMuch', label: 'Quanto', tone: 'bg-muted' },
    { key: 'where', label: 'Onde', tone: 'bg-primary/15' },
    { key: 'when', label: 'Quando', tone: 'bg-muted' },
    { key: 'notes', label: 'Notas', tone: 'bg-primary/15' },
  ];
  const updateCell = (rowIndex: number, key: keyof ActionPlanRow, value: string) => {
    onChange(rows.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row));
  };

  return <div data-testid="grid-action-plan" className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="mono-label text-primary">Plano de ação</p>
        <h3 className="mt-2 font-serif text-lg font-bold">Transforme a solução em execução</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Registre o que será feito, por que, por quem, como, quanto, onde e quando.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ArtifactStatusBadge status={dirty ? 'edited' : saved ? 'validated' : rows.length ? 'ai' : 'edited'} />
        <Button testId="button-add-action-plan-row" onClick={() => onChange([...rows, { ...EMPTY_ACTION_PLAN_ROW }])}><Plus size={14} /> Adicionar linha</Button>
        {(dirty || saved) && <Button testId="button-save-action-plan" onClick={onSave} variant="outline" disabled={!dirty}><Save size={14} /> {saved && !dirty ? 'Plano salvo' : 'Salvar plano'}</Button>}
      </div>
    </div>
    <p className="text-[11px] text-muted-foreground sm:hidden">Deslize horizontalmente para editar todas as colunas do plano.</p>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[1180px] border-collapse text-xs">
        <thead><tr>{columns.map((column) => <th key={column.key} className={`border-b border-border px-3 py-2 text-left ${column.tone}`}><span className="block text-[11px] font-bold">{column.label}</span><span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">{column.key === 'what' ? 'What' : column.key === 'why' ? 'Why' : column.key === 'who' ? 'Who' : column.key === 'how' ? 'How' : column.key === 'howMuch' ? 'How Much' : column.key === 'where' ? 'Where' : column.key === 'when' ? 'When' : 'Notes'}</span></th>)}<th className="w-10 border-b border-border" aria-hidden="true" /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length + 1} className="p-5 text-center text-muted-foreground">Ainda não há ações. Adicione a primeira ação do plano para definir responsável e prazo.</td></tr>}
          {rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-border last:border-b-0 align-top">
            {columns.map((column) => <td key={column.key} className="p-2"><textarea data-testid={`input-action-plan-${column.key}-${rowIndex}`} value={row[column.key]} onChange={(event) => updateCell(rowIndex, column.key, event.target.value)} rows={3} className="min-h-[76px] w-full resize-y rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] leading-relaxed outline-none focus:border-primary/60" /></td>)}
            <td className="p-2"><button type="button" data-testid={`button-remove-action-plan-row-${rowIndex}`} onClick={() => onChange(rows.filter((_, index) => index !== rowIndex))} aria-label={`Excluir linha ${rowIndex + 1}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><X size={14} /></button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {saved && !dirty && <p data-testid="status-action-plan-saved" className="text-xs text-primary"><Check size={14} className="mr-1 inline" /> Plano de ação salvo no Repositório.</p>}
  </div>;
}

function SolutionsActionPlanDrawer({ tool, onClose, pipeline, dirty, saved, onChange, onSave }: { tool: Tool; onClose: () => void; pipeline: DmaicPipeline | null; dirty: boolean; saved: boolean; onChange: (rows: ActionPlanRow[]) => void; onSave: () => void }) {
  const rows = Array.isArray(pipeline?.actionPlan)
    ? pipeline.actionPlan.map((row) => ({ ...EMPTY_ACTION_PLAN_ROW, ...(row as Partial<ActionPlanRow>) }))
    : [];
  return <div className="fixed inset-0 z-40 flex justify-end bg-sidebar/25 backdrop-blur-[2px]" onClick={onClose}>
    <section role="dialog" aria-modal="true" data-testid="panel-tool-detail" onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-full flex-col overflow-y-auto border-l border-border bg-background shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-background/95 px-5 py-5 backdrop-blur">
        <div className="flex gap-3"><IconBadge icon={tool.icon} tone="primary" /><div><p className="mono-label text-primary">Plano de ação · editável</p><h2 className="mt-1 font-serif text-xl font-bold">{tool.title}</h2><p className="mt-1 text-xs text-muted-foreground">{tool.subtitle}</p></div></div>
        <button data-testid="button-close-tool" aria-label="Fechar detalhe" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5"><ActionPlanGrid rows={rows} dirty={dirty} saved={saved} onChange={onChange} onSave={onSave} /></div>
    </section>
  </div>;
}

function GenericPreview({ tool, pipeline, solutionsDirty = false, solutionsSaved = false, onSolutionsChange, onSaveSolutions }: { tool: Tool; pipeline: DmaicPipeline | null; solutionsDirty?: boolean; solutionsSaved?: boolean; onSolutionsChange?: (rows: ActionPlanRow[]) => void; onSaveSolutions?: () => void }) {
  if (tool.id === 'solutions') {
    const actionPlan = Array.isArray(pipeline?.actionPlan) ? pipeline.actionPlan : [];
    const rows = actionPlan.map((row) => ({ ...EMPTY_ACTION_PLAN_ROW, ...(row as Partial<ActionPlanRow>) }));
    return <ActionPlanGrid rows={rows} dirty={solutionsDirty} saved={solutionsSaved} onChange={(next) => onSolutionsChange?.(next)} onSave={() => onSaveSolutions?.()} />;
  }
  const rowsByTool: Record<string, unknown> = {
    msa: pipeline?.msaValidation,
    vitalx: pipeline?.vitalXs,
    gut: pipeline?.gutPrioritization,
    solutions: pipeline?.actionPlan,
    'control-plan': pipeline?.controlPlan,
  };
  const rows = Array.isArray(rowsByTool[tool.id]) ? rowsByTool[tool.id] as Record<string, unknown>[] : [];

  return <div data-testid={`preview-${tool.id}`} className="space-y-4">
    <div>
      <p className="mono-label text-primary">{pipeline ? 'Artefato do pipeline' : 'Aguardando dados'}</p>
      <h3 className="mt-2 font-serif text-lg font-bold">{tool.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.subtitle}</p>
    </div>
    {rows.length === 0
      ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">Ainda não há dados para este artefato. Gere o pipeline ou carregue as informações necessárias para começar.</div>
      : <div className="space-y-2">
        {rows.map((row, index) => <div key={index} className="rounded-xl border border-border bg-card p-4">
          <p className="mono-label text-muted-foreground">Linha {index + 1}</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(row).map(([key, value]) => <div key={key}>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{key}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{Array.isArray(value) ? value.join(', ') : String(value ?? '')}</dd>
            </div>)}
          </dl>
        </div>)}
      </div>}
  </div>;
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
  return <div><div className="mb-5 flex items-start justify-between"><div><p className="mono-label text-chart-3">{source === 'upload' ? 'Dados do CSV' : 'Exemplo gerado'}</p><h3 className="mt-2 font-serif text-lg font-bold">A variação está respirando?</h3><p className="mt-1 text-xs text-muted-foreground">I-MR · sequência de {data.length} medições</p></div><Activity size={20} className="text-chart-3" /></div><div className="rounded-xl border border-border bg-card p-3"><svg viewBox={`0 0 ${width} ${height + 25}`} className="h-auto w-full overflow-visible"><line x1="0" x2={width} y1={yFor(mean)} y2={yFor(mean)} stroke="hsl(var(--primary) / .35)" strokeDasharray="4 4" /><line x1="0" x2={width} y1={yFor(upperControl)} y2={yFor(upperControl)} stroke="hsl(var(--chart-3) / .45)" strokeDasharray="4 4" /><line x1="0" x2={width} y1={yFor(lowerControl)} y2={yFor(lowerControl)} stroke="hsl(var(--destructive) / .45)" strokeDasharray="4 4" /><polyline fill="none" stroke="hsl(var(--chart-3))" strokeWidth="2.5" points={points} /><circle cx={0} cy={0} r={0} /></svg><div data-testid="text-imr-limits" className="mt-2 flex justify-between mono-label text-muted-foreground"><span>LSC · {formatMetric(upperControl)}</span><span>média · {formatMetric(mean)}</span><span>LIC · {formatMetric(lowerControl)}</span></div></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-lg bg-muted p-3"><p className="mono-label text-muted-foreground">Média</p><p className="mt-1 font-mono text-sm font-bold">{formatMetric(mean)}</p></div><div className="rounded-lg bg-primary/8 p-3"><p className="mono-label text-primary">Sinais</p><p className="mt-1 font-mono text-sm font-bold text-primary">{signals}</p></div><div className="rounded-lg bg-accent/12 p-3"><p className="mono-label text-accent-foreground">MR médio</p><p className="mt-1 font-mono text-sm font-bold">{formatMetric(meanMovingRange)}</p></div></div></div>;
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
    {hasManualSaveConfirmation && <div data-testid="status-voc-manual-saved" className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span><strong>Indicadores VOC/CTQ salvos no Repositório.</strong> As linhas manuais continuarão disponíveis ao reabrir este workspace.</span></div>}

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

    {showExample && <div data-testid="status-voc-no-pipeline" className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 text-xs"><Info size={16} className="mt-0.5 shrink-0 text-accent-foreground" /><p className="leading-relaxed"><strong>O mapa ainda é um exemplo.</strong> Preencha o Problem Statement e o Project Charter, salve o projeto e gere o pipeline.</p></div>}
    {!hasGeneratedMap && hasManualRows && <div data-testid="status-voc-manual-only" className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs"><Info size={16} className="mt-0.5 shrink-0 text-primary" /><p className="leading-relaxed"><strong>Este mapa foi iniciado manualmente.</strong> Salve os indicadores preenchidos para protegê-los no workspace.</p></div>}
    {hasGeneratedMap && !hasDiagnosis && <div data-testid="status-voc-no-diagnosis" className="flex items-start gap-3 rounded-xl border border-chart-3/25 bg-chart-3/5 p-4 text-xs"><Info size={16} className="mt-0.5 shrink-0 text-chart-3" /><p className="leading-relaxed"><strong>Diagnóstico detalhado não anexado.</strong> As necessidades foram contextualizadas com o Charter e o problema informado.</p></div>}

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
  </div>;
}

const exampleSipoc: DmaicSipoc = [
  { suppliers: 'Área de TI\nCliente', inputs: 'Portal do cliente\nQtd. de produto\nEspecificações do produto', process: 'Implantar pedido', outputs: 'Pedido implantado no sistema Voiitto Tubes', customers: 'Área Comercial' },
  { suppliers: 'Área Comercial\nÁrea de TI\nCliente', inputs: 'Pedido implantado\nMapa de entregas\nDisponibilidade do produto', process: 'Acordar prazo de entrega com cliente', outputs: 'Prazo acordado\nPedido liberado para a expedição', customers: 'Área de Expedição' },
  { suppliers: 'Área de Operação\nPlano de Saúde\nCliente', inputs: 'Pedido liberado\nSeparador\nMaterial para embalagem', process: 'Separar e embalar produto', outputs: 'Produto separado e embalado\nNota Fiscal emitida\nEtiqueta de identificação impressa e colada no produto', customers: 'Logística / modal de transporte' },
  { suppliers: 'Logística', inputs: 'Produto separado e embalado\nNota Fiscal\nDefinição do modal', process: 'Transportar produto até o cliente', outputs: 'Produto em transporte', customers: 'Modal / Transportadora' },
  { suppliers: 'Modal / Transportadora', inputs: 'Produto transportado\nNota Fiscal', process: 'Entregar o produto', outputs: 'Produto armazenado no local da entrega', customers: 'Cliente' },
];

const LEGACY_EXAMPLE_SIPOC_PROCESSES = [
  'Retirar a senha de atendimento',
  'Cadastrar o cliente',
  'Verificar autorização dos exames',
  'Imprimir guia para realização dos exames',
  'Encaminhar cliente para o exame',
];

function replaceLegacyExampleSipoc(sipoc: DmaicSipoc | null): DmaicSipoc | null {
  if (!sipoc || sipoc.length !== LEGACY_EXAMPLE_SIPOC_PROCESSES.length) return sipoc;
  const processes = sipoc.map((row) => row.process.trim());
  return LEGACY_EXAMPLE_SIPOC_PROCESSES.every((process, index) => processes[index] === process) ? exampleSipoc : sipoc;
}

const SIPOC_COLUMNS: { key: keyof DmaicSipocRow; label: string; hint: string; headerClass: string }[] = [
  { key: 'suppliers', label: 'Fornecedores', hint: 'Quem entrega o que a etapa precisa', headerClass: 'bg-chart-4/12 text-chart-4' },
  { key: 'inputs', label: 'Entradas', hint: 'O que alimenta a etapa', headerClass: 'bg-chart-3/12 text-chart-3' },
  { key: 'process', label: 'Processo', hint: 'Uma macroetapa, em ordem', headerClass: 'bg-primary/12 text-primary' },
  { key: 'outputs', label: 'Saídas', hint: 'O que a etapa entrega', headerClass: 'bg-accent/18 text-accent-foreground' },
  { key: 'customers', label: 'Clientes', hint: 'Quem recebe as saídas', headerClass: 'bg-chart-5/14 text-chart-5' },
];

function sipocCellLines(value: string, deduplicate = false): string[] {
  const lines = value.split('\n').map((item) => item.trim()).filter(Boolean);
  if (!deduplicate) return lines;
  const seen = new Set<string>();
  return lines.filter((line) => {
    const normalized = line.toLocaleLowerCase('pt-BR');
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
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
  const columnItems = (key: keyof DmaicSipocRow) => {
    const items = sipoc.flatMap((row) => sipocCellLines(row[key], key === 'suppliers'));
    if (key !== 'suppliers') return items;
    const seen = new Set<string>();
    return items.filter((item) => {
      const normalized = item.toLocaleLowerCase('pt-BR');
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  };
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
  const displaySipoc = replaceLegacyExampleSipoc(sipoc && sipoc.length > 0 ? sipoc : exampleSipoc) ?? exampleSipoc;
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
    {saved && !dirty && <div data-testid="status-sipoc-saved" className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs"><Check size={15} className="text-primary" /><span><strong>SIPOC salvo no Repositório.</strong> As alterações continuarão disponíveis ao reabrir este workspace.</span></div>}

    <SipocGrid rows={displaySipoc} readOnly={readOnly} onUpdateCell={updateCell} onAddRow={addRow} onRemoveRow={removeRow} />

    <div>
      <p className="mb-3 text-xs font-bold">Visualização em fluxo</p>
      <SipocFlowDiagram sipoc={displaySipoc} />
    </div>
  </div>;
}

const exampleMsaRows: MsaRow[] = [
  { variable: 'Tempo até aprovação (min)', gageRrStatus: 'R&R simplificado: 8,2% da variação total; discriminação de 6 categorias.', recommendation: 'Sistema de medição aceitável. Manter captura por timestamp automático, sem leitura manual.' },
  { variable: 'Classificação de risco do bureau', gageRrStatus: 'Concordância entre avaliadores: 91% nas últimas 30 amostras.', recommendation: 'Padronizar o critério de corte antes de tratar esta variável como Vital X.' },
];
function escapeCharterHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function markdownToPrintHtml(value: string): string {
  const lines = value.replace(/\r/g, '').split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  const inline = (text: string) => escapeCharterHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  const closeList = () => { if (listType) { output.push(`</${listType}>`); listType = null; } };
  const flushParagraph = () => { if (paragraph.length > 0) { output.push(`<p>${paragraph.map(inline).join(' ')}</p>`); paragraph = []; } };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (!line) { flushParagraph(); closeList(); continue; }
    if (heading) { flushParagraph(); closeList(); output.push(`<h4>${inline(heading[1])}</h4>`); continue; }
    if (bullet || numbered) {
      flushParagraph();
      const nextType = bullet ? 'ul' : 'ol';
      if (listType !== nextType) { closeList(); output.push(`<${nextType}>`); listType = nextType; }
      output.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
      continue;
    }
    closeList();
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  return output.join('');
}

function openPrintDocument(title: string, body: string, width = 1000, height = 850) {
  const printWindow = window.open('', '_blank', `width=${width},height=${height}`);
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeCharterHtml(title)}</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1c1917;margin:0;padding:34px 44px}h1{font-family:Georgia,serif;font-size:23px;margin:0 0 5px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#57534e;margin:25px 0 10px;border-bottom:1px solid #d6d3d1;padding-bottom:6px}h3{font-size:13px;margin:0 0 6px}h4{font-size:13px;margin:18px 0 8px;color:#1c1917}p{font-size:12px;line-height:1.5;margin:5px 0}.subtitle{color:#78716c}.print-bar{display:flex;justify-content:flex-end;margin:-34px -44px 24px;padding:10px 44px;background:#fafaf9;border-bottom:1px solid #e7e5e4}.print-bar button{padding:8px 14px;background:#1c1917;color:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer}table{width:100%;border-collapse:collapse;margin-top:6px;font-size:11px}th,td{border:1px solid #d6d3d1;padding:7px;text-align:left;vertical-align:top}th{background:#f5f5f4;font-size:10px;text-transform:uppercase;color:#57534e}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.chart-grid{display:grid;grid-template-columns:1.4fr .8fr;gap:12px;align-items:start}.metric{border:1px solid #d6d3d1;padding:9px}.metric strong{display:block;font-size:10px;color:#78716c;text-transform:uppercase}.metric span{display:block;margin-top:4px;font-weight:700}.diagnosis{white-space:pre-wrap;border:1px solid #d6d3d1;padding:12px;font-size:12px;line-height:1.55}.whatif-list{display:grid;gap:14px}.whatif-card{break-inside:avoid;border:1px solid #cbd5e1;border-left:4px solid #398f78;border-radius:8px;padding:13px 15px;margin:0 0 14px;background:#f8fafc}.whatif-header{display:flex;gap:10px;align-items:flex-start}.whatif-number{display:flex;align-items:center;justify-content:center;flex:0 0 24px;height:24px;border-radius:50%;background:#398f78;color:#fff;font-size:11px;font-weight:700}.whatif-label{margin:0 0 4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.whatif-answer{margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px}.markdown-answer{font-size:12px;line-height:1.6}.markdown-answer p{margin:0 0 11px}.markdown-answer h4{margin:16px 0 7px;font-size:12px;color:#334155}.markdown-answer ul,.markdown-answer ol{margin:6px 0 13px;padding-left:22px;font-size:12px;line-height:1.6}.markdown-answer li{margin:3px 0}.whatif-context{margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;color:#64748b;font-size:10px}.empty{color:#a8a29e;font-style:italic}@page{margin:14mm}@media print{.print-bar{display:none}body{padding:0}.chart-grid{grid-template-columns:1fr}}
</style></head><body><div class="print-bar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>${body}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
}

function buildExploratoryLineSvg(summary: ExploratorySummary): string {
  const width = 900;
  const height = 280;
  const left = 48;
  const right = 34;
  const top = 22;
  const bottom = 34;
  const range = Math.max(summary.maximum - summary.minimum, 1);
  const x = (index: number) => left + (index / Math.max(summary.points.length - 1, 1)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - summary.minimum) / range) * (height - top - bottom);
  const points = summary.points.map((point, index) => `${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
  const circles = summary.points.map((point, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(point.value).toFixed(1)}" r="3.5" fill="#2f8fa3"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;border:1px solid #e7e5e4;border-radius:6px;background:#fff"><line x1="${left}" x2="${width - right}" y1="${y(summary.mean)}" y2="${y(summary.mean)}" stroke="#398f78" stroke-dasharray="7 5"/><text x="${width - right}" y="${y(summary.mean) - 7}" text-anchor="end" fill="#398f78" font-size="12">Média ${formatMetric(summary.mean)}</text><polyline points="${points}" fill="none" stroke="#2f8fa3" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${circles}</svg>`;
}

function buildExploratoryBoxplotSvg(summary: ExploratorySummary): string {
  const width = 460;
  const height = 280;
  const top = 24;
  const bottom = 238;
  const x = 160;
  const range = Math.max(summary.maximum - summary.minimum, 1);
  const y = (value: number) => bottom - ((value - summary.minimum) / range) * (bottom - top);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;border:1px solid #e7e5e4;border-radius:6px;background:#fff"><line x1="${x}" x2="${x}" y1="${y(summary.minimum)}" y2="${y(summary.maximum)}" stroke="#398f78" stroke-width="2"/><line x1="${x - 28}" x2="${x + 28}" y1="${y(summary.minimum)}" y2="${y(summary.minimum)}" stroke="#398f78" stroke-width="2"/><line x1="${x - 28}" x2="${x + 28}" y1="${y(summary.maximum)}" y2="${y(summary.maximum)}" stroke="#398f78" stroke-width="2"/><rect x="${x - 44}" y="${y(summary.q3)}" width="88" height="${Math.max(y(summary.q1) - y(summary.q3), 4)}" fill="#398f7833" stroke="#398f78" stroke-width="2"/><line x1="${x - 44}" x2="${x + 44}" y1="${y(summary.median)}" y2="${y(summary.median)}" stroke="#d17b32" stroke-width="3"/><text x="${x + 62}" y="${y(summary.maximum) + 4}" fill="#57534e" font-size="12">Máximo ${formatMetric(summary.maximum)}</text><text x="${x + 62}" y="${y(summary.q3) + 4}" fill="#57534e" font-size="12">Q3 ${formatMetric(summary.q3)}</text><text x="${x + 62}" y="${y(summary.median) + 4}" fill="#57534e" font-size="12">Mediana ${formatMetric(summary.median)}</text><text x="${x + 62}" y="${y(summary.q1) + 4}" fill="#57534e" font-size="12">Q1 ${formatMetric(summary.q1)}</text><text x="${x + 62}" y="${y(summary.minimum) + 4}" fill="#57534e" font-size="12">Mínimo ${formatMetric(summary.minimum)}</text></svg>`;
}

function buildDiscreteBarSvg(analysis: Extract<IndicatorAnalysis, { kind: 'discrete' }>): string {
  const width = 900;
  const height = Math.max(220, analysis.distribution.length * 34 + 42);
  const maxCount = Math.max(...analysis.distribution.map((item) => item.count), 1);
  const bars = analysis.distribution.map((item, index) => { const barWidth = (item.count / maxCount) * 620; const y = 24 + index * 34; return `<text x="8" y="${y + 15}" fill="#57534e" font-size="12">${escapeCharterHtml(item.label)}</text><rect x="190" y="${y + 3}" width="${barWidth.toFixed(1)}" height="20" rx="3" fill="#2f8fa3"/><text x="${200 + barWidth}" y="${y + 18}" fill="#57534e" font-size="12">${item.count} (${item.percentage.toFixed(1)}%)</text>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;border:1px solid #e7e5e4;border-radius:6px;background:#fff">${bars}</svg>`;
}

function exportInputDataPdf(dataset: InputDataset, analysis: IndicatorAnalysis | null, months: number, diagnosis: string | null, projectName: string) {
  const rows = dataset.rows.slice(0, 250).map((row) => `<tr>${dataset.headers.map((header) => `<td>${escapeCharterHtml(row[header] ?? '') || '—'}</td>`).join('')}</tr>`).join('');
  const chartHtml = analysis?.kind === 'continuous' ? (() => { const summary = buildExploratorySummary(dataset, analysis, months); return summary ? `<h2>Gráficos</h2><div class="chart-grid"><div><h3>Série temporal</h3>${buildExploratoryLineSvg(summary)}</div><div><h3>Boxplot</h3>${buildExploratoryBoxplotSvg(summary)}</div></div>` : ''; })() : analysis?.kind === 'discrete' ? `<h2>Gráfico de distribuição</h2>${buildDiscreteBarSvg(analysis)}` : '';
  const analysisHtml = analysis?.kind === 'continuous'
    ? `<div class="grid"><div class="metric"><strong>Média</strong><span>${formatMetric(analysis.mean)}</span></div><div class="metric"><strong>Mediana</strong><span>${formatMetric(analysis.median)}</span></div><div class="metric"><strong>Mínimo</strong><span>${formatMetric(analysis.minimum)}</span></div><div class="metric"><strong>Máximo</strong><span>${formatMetric(analysis.maximum)}</span></div><div class="metric"><strong>Desvio padrão</strong><span>${formatMetric(analysis.standardDeviation)}</span></div></div>`
    : analysis ? `<p><strong>Categoria dominante:</strong> ${escapeCharterHtml(analysis.topCategory)} · <strong>Ocorrências:</strong> ${analysis.topCategoryCount} · <strong>Categorias:</strong> ${analysis.categoryCount}</p>`
      : '<p class="empty">Nenhuma análise selecionada.</p>';
  openPrintDocument(`Dados para análise - ${projectName}`, `<h1>Dados para análise</h1><p class="subtitle">${escapeCharterHtml(projectName)} · ${escapeCharterHtml(dataset.fileName)} · gerado em ${new Date().toLocaleDateString('pt-BR')}</p><p><strong>Linhas:</strong> ${dataset.rows.length} · <strong>Colunas:</strong> ${dataset.headers.length} · <strong>Período:</strong> últimos ${months} meses</p><h2>Resumo do indicador</h2>${analysisHtml}${chartHtml}<h2>Dados do CSV</h2><table><thead><tr>${dataset.headers.map((header) => `<th>${escapeCharterHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td>Nenhum registro.</td></tr>'}</tbody></table>${dataset.rows.length > 250 ? '<p class="subtitle">Exibidas as primeiras 250 linhas do CSV.</p>' : ''}${diagnosis ? `<h2>Diagnóstico</h2><div class="diagnosis">${escapeCharterHtml(diagnosis)}</div>` : ''}`);
}

function exportExploratoryPdf(summary: ExploratorySummary, indicator: string, diagnosis: string | null, projectName: string) {
  const rows = summary.points.map((point) => `<tr><td>${escapeCharterHtml(point.period)}</td><td>${formatMetric(point.value)}</td></tr>`).join('');
  openPrintDocument(`Análise exploratória - ${projectName}`, `<h1>Análise Exploratória</h1><p class="subtitle">${escapeCharterHtml(projectName)} · indicador ${escapeCharterHtml(indicator)} · gerado em ${new Date().toLocaleDateString('pt-BR')}</p><h2>Estatística descritiva</h2><div class="grid"><div class="metric"><strong>Média</strong><span>${formatMetric(summary.mean)}</span></div><div class="metric"><strong>Mediana</strong><span>${formatMetric(summary.median)}</span></div><div class="metric"><strong>Mínimo</strong><span>${formatMetric(summary.minimum)}</span></div><div class="metric"><strong>Máximo</strong><span>${formatMetric(summary.maximum)}</span></div><div class="metric"><strong>Q1</strong><span>${formatMetric(summary.q1)}</span></div><div class="metric"><strong>Q3</strong><span>${formatMetric(summary.q3)}</span></div><div class="metric"><strong>IQR</strong><span>${formatMetric(summary.iqr)}</span></div><div class="metric"><strong>Desvio padrão</strong><span>${formatMetric(summary.standardDeviation)}</span></div></div><h2>Gráficos</h2><div class="chart-grid"><div><h3>Série temporal</h3>${buildExploratoryLineSvg(summary)}</div><div><h3>Boxplot</h3>${buildExploratoryBoxplotSvg(summary)}</div></div><h2>Valores da série</h2><table><thead><tr><th>Período</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table>${diagnosis ? `<h2>Diagnóstico da Suíte</h2><div class="diagnosis">${escapeCharterHtml(diagnosis)}</div>` : ''}`);
}

function exportMeasurementPdf(dataset: DmaicCsvDataset | null, analysis: MeasurementAnalysis | null, processMap: DmaicProcessMap, whatIfAnalyses: DmaicMeasurementWhatIfRecord[], projectName: string) {
  const formatProbability = (value: number | null) => value === null ? '—' : value < 0.001 ? '< 0,001' : value.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const stats = analysis?.variables.map((variable) => `<tr><th>${escapeCharterHtml(variable.name)}</th><td>${variable.count}</td><td>${formatMetric(variable.mean)}</td><td>${formatMetric(variable.median)}</td><td>${formatMetric(variable.standardDeviation)}</td><td>${variable.normality}</td><td>${variable.outlierCount}</td></tr>`).join('') ?? '';
  const pairwise = analysis?.pairwise.map((comparison) => `<tr><td>${escapeCharterHtml(comparison.left)} × ${escapeCharterHtml(comparison.right)}</td><td>${formatMetric(comparison.meanDifference)}</td><td>${formatProbability(comparison.adjustedPValue)}</td><td>${escapeCharterHtml(comparison.conclusion)}</td></tr>`).join('') ?? '';
  const priorities = analysis?.priorities.map((priority, index) => `<tr><td>${index + 1}</td><th>${escapeCharterHtml(priority.name)}</th><td>${priority.score.toFixed(2)}</td><td>${escapeCharterHtml(priority.explanation)}</td></tr>`).join('') ?? '';
  const whatIf = whatIfAnalyses.map((item, index) => `<article class="whatif-card"><div class="whatif-header"><span class="whatif-number">${index + 1}</span><div><p class="whatif-label">Pergunta de cenário</p><h3>${escapeCharterHtml(item.question)}</h3></div></div><div class="whatif-answer"><p class="whatif-label">Resposta da análise</p><div class="markdown-answer">${markdownToPrintHtml(item.answer)}</div></div><p class="whatif-context">${item.context.variables.length} variáveis · ${item.context.rowCount} observações pareadas · meta: ${escapeCharterHtml(item.context.projectGoal || 'não informada')}</p></article>`).join('');
  const csvRows = dataset?.rows.slice(0, 250).map((row) => `<tr>${dataset.headers.map((header) => `<td>${escapeCharterHtml(row[header] ?? '')}</td>`).join('')}</tr>`).join('') ?? '';
  const map = processMapSvg(processMap);
  openPrintDocument(`Fase de Medição - ${projectName}`, `<h1>Fase de Medição</h1><p class="subtitle">${escapeCharterHtml(projectName)} · relatório completo · ${new Date().toLocaleDateString('pt-BR')}</p><h2>Dados carregados</h2><p><strong>Arquivo:</strong> ${escapeCharterHtml(dataset?.fileName ?? 'Não carregado')} · <strong>Linhas pareadas:</strong> ${dataset?.rows.length ?? 0} · <strong>Colunas:</strong> ${dataset?.headers.length ?? 0}</p>${analysis ? `<h2>Estatísticas descritivas e normalidade</h2><table><thead><tr><th>Unidade</th><th>n</th><th>Média</th><th>Mediana</th><th>Desvio padrão</th><th>Normalidade</th><th>Outliers</th></tr></thead><tbody>${stats}</tbody></table><h2>Comparação global</h2><p>${escapeCharterHtml(analysis.anova.conclusion)}</p><p><strong>F:</strong> ${analysis.anova.fStatistic?.toFixed(3) ?? '—'} · <strong>p:</strong> ${formatProbability(analysis.anova.pValue)} · <strong>epsilon:</strong> ${analysis.anova.epsilon?.toFixed(3) ?? '—'}</p><h2>Comparações par a par</h2><table><thead><tr><th>Par</th><th>Diferença média</th><th>p ajustado</th><th>Conclusão</th></tr></thead><tbody>${pairwise || '<tr><td colspan="4">Nenhuma comparação disponível.</td></tr>'}</tbody></table><h2>Prioridades de investigação</h2><table><thead><tr><th>#</th><th>Variável</th><th>Score</th><th>Explicação</th></tr></thead><tbody>${priorities || '<tr><td colspan="4">Nenhuma prioridade disponível.</td></tr>'}</tbody></table>` : '<p class="empty">A análise estatística ainda não foi gerada.</p>'}<h2>Mapa de processos</h2><div class="map">${map}</div>${whatIf ? `<h2>Análises What If</h2><div class="whatif-list">${whatIf}</div>` : ''}${dataset ? `<h2>Dados do CSV</h2><table><thead><tr>${dataset.headers.map((header) => `<th>${escapeCharterHtml(header)}</th>`).join('')}</tr></thead><tbody>${csvRows}</tbody></table>${dataset.rows.length > 250 ? '<p class="subtitle">Exibidas as primeiras 250 linhas do CSV.</p>' : ''}` : ''}`);
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

function renderManualMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let index = 0;
  const inline = (value: string) => escapeCharterHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) { code.push(lines[index]); index += 1; }
      index += 1;
      output.push(`<pre class="code-block ${language === 'mermaid' ? 'diagram-block' : ''}">${escapeCharterHtml(code.join('\n'))}</pre>`);
      continue;
    }
    if (/^\|/.test(line) && index + 1 < lines.length && /^\|?\s*[-:]+/.test(lines[index + 1])) {
      const tableRows: string[] = [];
      const cells = (value: string) => value.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
      tableRows.push(`<thead><tr>${cells(line).map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`);
      index += 2;
      while (index < lines.length && /^\|/.test(lines[index])) { tableRows.push(`<tr>${cells(lines[index]).map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`); index += 1; }
      output.push(`<div class="table-wrap"><table>${tableRows.join('').replace('<thead>', '<thead>').replace('</thead>', '</thead><tbody>').concat('</tbody>')}</table></div>`);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const className = level === 1 ? 'section-title' : level === 2 ? 'subsection-title' : 'minor-title';
      output.push(`<h${level} class="${className}">${inline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (line.startsWith('> ')) {
      output.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      index += 1;
      continue;
    }
    if (/^- /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^- /.test(lines[index])) { items.push(`<li>${inline(lines[index].slice(2))}</li>`); index += 1; }
      output.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\. /.test(lines[index])) { items.push(`<li>${inline(lines[index].replace(/^\d+\. /, ''))}</li>`); index += 1; }
      output.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s|^```|^> |^- |^\d+\. |^\|/.test(lines[index])) { paragraph.push(lines[index]); index += 1; }
    output.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return output.join('\n');
}

function exportManualPdf(markdown: string, manualLabel: string, coverTitle: string, coverLead: string) {
  const printWindow = window.open('', '_blank', 'width=1000,height=900');
  if (!printWindow) return;
  const renderedManual = renderManualMarkdown(markdown);
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeCharterHtml(manualLabel)} - DMAIC Ágil Suite</title><style>
  *{box-sizing:border-box} :root{--ink:#17383a;--muted:#607b7d;--teal:#2fae8a;--teal-dark:#087f70;--line:#d7e3df;--paper:#f6f8f5;--card:#fff;--orange:#e8922c} body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,'Helvetica Neue',sans-serif;font-size:11.5pt;line-height:1.58} .print-bar{position:sticky;top:0;z-index:3;display:flex;justify-content:flex-end;padding:12px 7vw;background:rgba(246,248,245,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(8px)} .print-bar button{border:0;border-radius:7px;padding:10px 16px;background:var(--ink);color:#fff;font-weight:700;cursor:pointer}.manual-shell{max-width:900px;margin:0 auto;padding:0 34px 70px;background:#fff;box-shadow:0 0 38px rgba(23,56,58,.08)}.cover{min-height:470px;display:flex;flex-direction:column;justify-content:flex-end;padding:70px 0 56px;border-bottom:1px solid var(--line);position:relative;overflow:hidden}.cover:before{content:'';position:absolute;right:-120px;top:-130px;width:430px;height:430px;border:34px solid rgba(47,174,138,.16);border-radius:50%}.cover:after{content:'';position:absolute;right:75px;top:95px;width:120px;height:120px;border:1px solid rgba(232,146,44,.45);border-radius:50%}.brand{position:relative;z-index:1;color:var(--teal-dark);font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.cover h1{position:relative;z-index:1;max-width:650px;margin:18px 0 12px;font-size:43px;line-height:1.04;letter-spacing:-.04em}.cover .lead{position:relative;z-index:1;max-width:570px;margin:0;color:var(--muted);font-size:16px;line-height:1.5}.meta{position:relative;z-index:1;display:flex;gap:24px;margin-top:34px;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em}.manual{padding-top:38px}.section-title{margin:42px 0 18px;padding:15px 0 10px;border-top:3px solid var(--teal);color:var(--ink);font-size:24px;line-height:1.15;break-after:avoid}.manual>.section-title:first-child{margin-top:0}.subsection-title{margin:30px 0 10px;color:var(--teal-dark);font-size:17px;break-after:avoid}.minor-title{margin:20px 0 7px;color:var(--ink);font-size:13px;break-after:avoid}.manual p{margin:0 0 13px;color:#425c5e}.manual ul,.manual ol{margin:7px 0 18px;padding-left:23px;color:#425c5e}.manual li{margin:5px 0;padding-left:3px}.manual strong{color:var(--ink)}blockquote{margin:22px 0;padding:17px 20px;border-left:4px solid var(--orange);border-radius:0 8px 8px 0;background:#fff8ed;color:#6e5327;font-weight:700;break-inside:avoid}.table-wrap{margin:18px 0 24px;overflow:hidden;border:1px solid var(--line);border-radius:8px;break-inside:avoid}table{width:100%;border-collapse:collapse;background:var(--card);font-size:10.5pt}th{padding:11px 12px;text-align:left;background:#e9f4ef;color:var(--teal-dark);font-size:9px;text-transform:uppercase;letter-spacing:.08em}td{padding:10px 12px;border-top:1px solid var(--line);vertical-align:top;color:#425c5e}.code-block{margin:18px 0;padding:17px 19px;overflow:auto;border-radius:8px;background:#17383a;color:#e2f2ed;font:10px/1.5 Consolas,monospace;white-space:pre-wrap;break-inside:avoid}.diagram-block{border:1px dashed rgba(47,174,138,.7);background:#102d2f;color:#9de2c8}.manual code{padding:2px 5px;border-radius:4px;background:#e8f2ee;color:var(--teal-dark);font:inherit}.manual hr{border:0;border-top:1px solid var(--line);margin:30px 0}.manual h1:first-of-type{display:none}@page{size:A4;margin:13mm}@media print{body{background:#fff}.print-bar{display:none}.manual-shell{max-width:none;padding:0;box-shadow:none}.cover{min-height:245mm}.section-title{break-before:auto}.table-wrap{overflow:visible}a{color:inherit;text-decoration:none}}@media(max-width:700px){.manual-shell{padding:0 20px 45px}.cover{min-height:480px;padding-top:55px}.cover h1{font-size:34px}.meta{flex-direction:column;gap:6px}}
  </style></head><body><div class="print-bar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div><main class="manual-shell"><header class="cover"><div class="brand">DMAIC ÁGIL SUITE · ${escapeCharterHtml(manualLabel).toUpperCase()}</div><h1>${escapeCharterHtml(coverTitle)}</h1><p class="lead">${escapeCharterHtml(coverLead)}</p><div class="meta"><span>Versão 2.0</span><span>Português do Brasil</span><span>Exportado em ${new Date().toLocaleDateString('pt-BR')}</span></div></header><article class="manual">${renderedManual}</article></main></body></html>`);
  printWindow.document.close();
  printWindow.focus();
}

function exportExecutiveManualPdf() {
  exportManualPdf(executiveManualMarkdown, 'MANUAL EXECUTIVO', 'Decisões melhores. Melhorias que permanecem.', 'Guia executivo para transformar problemas, dados e evidências em decisões sustentáveis.');
}

function exportUsageManualPdf() {
  exportManualPdf(usageManualMarkdown, 'MANUAL DE UTILIZAÇÃO', 'Use a Suíte com clareza.', 'Manual completo para conduzir o projeto DMAIC Ágil, revisar artefatos e sustentar resultados.');
}

function buildSipocPrintDocument(sipoc: DmaicSipoc, projectName: string): string {
  const cell = (value: string, deduplicate = false) => {
    const lines = sipocCellLines(value, deduplicate);
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
  const rowHtml = rows.map((row) => `<tr>
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

function Workspace() {
  const pipelineMutation = useRunDmaicPipeline();
  const whatIfMutation = useRunDmaicMeasurementWhatIf();
  const ishikawaMutation = useRunDmaicIshikawa();
  const [controlEvaluationLoading, setControlEvaluationLoading] = useState(false);
  const [controlEvaluationError, setControlEvaluationError] = useState<string | null>(null);
  const [initialLocalDraft] = useState<WorkspaceLocalDraft | null>(() => readWorkspaceLocalDraft());
  const workspaceQuery = useGetDmaicWorkspace(initialLocalDraft?.projectKey ? { projectKey: initialLocalDraft.projectKey } : undefined);
  const workspacesQuery = useListDmaicWorkspaces();
  const workspaceMutation = useSaveDmaicWorkspace();
  const [area, setArea] = useState<Area>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [statement, setStatement] = useState(() => initialLocalDraft?.statement ?? DEFAULT_PROBLEM_STATEMENT);
  const [projectKey, setProjectKey] = useState<number | null>(() => initialLocalDraft?.projectKey ?? null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(() => initialLocalDraft?.projectKey ? String(initialLocalDraft.projectKey) : '');
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectLoadedMessage, setProjectLoadedMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [workspaceDirty, setWorkspaceDirty] = useState(false);
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
  const [msaDirty, setMsaDirty] = useState(false);
  const [msaSaved, setMsaSaved] = useState(false);
  const [vitalXDirty, setVitalXDirty] = useState(false);
  const [vitalXSaved, setVitalXSaved] = useState(false);
  const [gutDirty, setGutDirty] = useState(false);
  const [gutSaved, setGutSaved] = useState(false);
  const [solutionsDirty, setSolutionsDirty] = useState(false);
  const [solutionsSaved, setSolutionsSaved] = useState(false);
  const [controlPlanDirty, setControlPlanDirty] = useState(false);
  const [controlPlanSaved, setControlPlanSaved] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [vitalId, setVitalId] = useState('x1');
  const [inputDataset, setInputDataset] = useState<InputDataset | null>(() => initialLocalDraft?.analysisArtifacts.dataset ?? null);
  const [measurementDataset, setMeasurementDataset] = useState<DmaicCsvDataset | null>(() => initialLocalDraft?.analysisArtifacts.measurementDataset ?? null);
  const [whatIfAnalyses, setWhatIfAnalyses] = useState<DmaicMeasurementWhatIfRecord[]>(() => initialLocalDraft?.analysisArtifacts.whatIfAnalyses ?? []);
  const [controlPhase, setControlPhase] = useState<ControlPhase>(() => (initialLocalDraft?.analysisArtifacts as any)?.controlPhase ?? { dataset: null, months: 12, selectedIndicators: [], statistics: [], evaluation: null });
  const [whatIfSaved, setWhatIfSaved] = useState(false);
  const [processMap, setProcessMap] = useState<DmaicProcessMap>(() => cloneProcessMap(initialLocalDraft?.analysisArtifacts.processMap ?? createInitialProcessMap()));
  const [processMapDirty, setProcessMapDirty] = useState(false);
  const [processMapSaved, setProcessMapSaved] = useState(false);
  const [ishikawa, setIshikawa] = useState<DmaicAnalysisArtifactsIshikawa>(() => initialLocalDraft?.analysisArtifacts.ishikawa ?? initialLocalDraft?.analysisArtifacts.pipeline?.ishikawa ?? null);
  const [hypothesisStatuses, setHypothesisStatuses] = useState<HypothesisStatusMap>(() => (initialLocalDraft?.analysisArtifacts as any)?.hypothesisStatuses ?? {});
  const [hypothesisNotes, setHypothesisNotes] = useState<HypothesisNotesMap>(() => (initialLocalDraft?.analysisArtifacts as any)?.hypothesisNotes ?? {});
  const [hypothesisLinks, setHypothesisLinks] = useState<HypothesisLinksMap>(() => (initialLocalDraft?.analysisArtifacts as any)?.hypothesisLinks ?? {});
  const [attachments, setAttachments] = useState<AttachmentRecord[]>(() => (initialLocalDraft?.analysisArtifacts as any)?.attachments ?? []);
  const [projectDecisions, setProjectDecisions] = useState<ProjectDecision[]>(() => (initialLocalDraft?.analysisArtifacts as any)?.projectDecisions ?? []);
  const [artifactHistory, setArtifactHistory] = useState<ArtifactHistoryEntry[]>(() => (initialLocalDraft?.analysisArtifacts as any)?.artifactHistory ?? []);
  const [hypothesisValidationError, setHypothesisValidationError] = useState<string | null>(null);
  const [hypothesesDirty, setHypothesesDirty] = useState(false);
  const [hypothesesSaved, setHypothesesSaved] = useState(false);
  const [ishikawaInputText, setIshikawaInputText] = useState(() => initialLocalDraft?.analysisArtifacts.ishikawaInputText ?? '');
  const [ishikawaDirty, setIshikawaDirty] = useState(false);
  const [ishikawaSaved, setIshikawaSaved] = useState(false);
  const [analysisMonths, setAnalysisMonths] = useState(() => initialLocalDraft?.analysisArtifacts.analysisMonths ?? 12);
  const [selectedIndicator, setSelectedIndicator] = useState(() => initialLocalDraft?.analysisArtifacts.selectedIndicator ?? initialLocalDraft?.analysisArtifacts.dataset?.indicatorColumns[0] ?? '');
  const [exploratoryDiagnosis, setExploratoryDiagnosis] = useState<string | null>(() => initialLocalDraft?.analysisArtifacts.diagnosis ?? null);
  const [exploratoryDiagnosisInput, setExploratoryDiagnosisInput] = useState<DmaicExploratoryDiagnosisInput | null>(() => initialLocalDraft?.analysisArtifacts.diagnosisInput ?? null);
  const [pipelineAnalysisContext, setPipelineAnalysisContext] = useState<DmaicPipelineAnalysisContext | null>(() => initialLocalDraft?.analysisArtifacts.pipelineAnalysisContext ?? null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [measurementCsvError, setMeasurementCsvError] = useState<string | null>(null);

  const [causeAndEffectMatrix, setCauseAndEffectMatrix] = useState<any>(() => 
    (initialLocalDraft?.analysisArtifacts as any)?.causeAndEffectMatrix ?? null
  );
  const [solutionPrioritizationMatrix, setSolutionPrioritizationMatrix] = useState<any>(() => 
    (initialLocalDraft?.analysisArtifacts as any)?.solutionPrioritizationMatrix ?? null
  );

  const fileRef = useRef<HTMLInputElement | null>(null);
  const measurementFileRef = useRef<HTMLInputElement | null>(null);
  const uploadVersionRef = useRef(0);
  const measurementUploadVersionRef = useRef(0);
  const controlUploadVersionRef = useRef(0);
  const charterReviewVersionRef = useRef(0);
  const workspaceSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const workspaceSessionRef = useRef(0);
  const workspaceProjectKeyRef = useRef<number | null>(initialLocalDraft?.projectKey ?? null);
  const analysisDirtyRef = useRef(false);
  const workspaceRevisionRef = useRef(initialLocalDraft?.baseRevision ?? 0);
  const workspaceLocalDraftRef = useRef<WorkspaceLocalDraft | null>(initialLocalDraft);
  const draftWriteEnabledRef = useRef(Boolean(initialLocalDraft));
  const workspaceStateRef = useRef({ projectKey, statement, charter, confirmedCharter, aiCharterSuggestions });
  const createAnalysisArtifactsRef = useRef<() => DmaicAnalysisArtifacts>(() => createEmptyAnalysisArtifacts());
  const displayArea = area === 'overview' ? 'overview' : area;
  const inputAnalysis = useMemo(() => inputDataset ? summarizeIndicator(inputDataset, selectedIndicator, analysisMonths) : null, [analysisMonths, inputDataset, selectedIndicator]);
  const measurementAnalysis = useMemo(() => measurementDataset ? analyzeMeasurementDataset(measurementDataset) : null, [measurementDataset]);
  const pareto = useMemo(() => !inputDataset ? initialPareto : inputAnalysis?.kind === 'discrete' ? inputAnalysis.distribution.map((item) => ({ name: item.label, value: item.count })) : null, [inputAnalysis, inputDataset]);
  const imr = useMemo(() => !inputDataset ? initialImr : inputAnalysis?.kind === 'continuous' && inputAnalysis.values.length >= 2 ? inputAnalysis.values : null, [inputAnalysis, inputDataset]);
  const activeProjectName = projectKey ? (workspacesQuery.data?.find((project) => project.projectKey === projectKey)?.projectName ?? (charter.projectName.trim() || `Projeto #${projectKey}`)) : (charter.projectName.trim() || 'Novo projeto');
  const projectMilestones = [
    statement.trim().length >= 10,
    Boolean(charter.projectName.trim() && charter.objective.trim() && charter.goalDefinition.trim()),
    Boolean((manualVocCtq.length || pipelineData?.vocCtq?.length) && pipelineData?.sipoc?.length),
    Boolean(inputDataset || measurementDataset),
    Boolean(controlPhase.evaluation),
  ];
  const completedMilestones = projectMilestones.filter(Boolean).length;
  const projectProgress = Math.round((completedMilestones / projectMilestones.length) * 100);
  const validatedHypothesis = Object.entries(hypothesisStatuses).some(([key, status]) => (status === 'Comprovada' || status === 'Rejeitada') && Boolean(hypothesisNotes[key]?.trim()));
  const validatedActionPlan = Array.isArray((pipelineData as any)?.actionPlan) && (pipelineData as any).actionPlan.length > 0 && (pipelineData as any).actionPlan.every((row: Partial<ActionPlanRow>) => Boolean(row.who?.trim() && row.when?.trim()));
  const phaseProgress = {
    definition: [
      statement.trim().length >= 10,
      Boolean(charter.projectName.trim() && charter.objective.trim() && charter.goalDefinition.trim()),
      Boolean(pipelineData),
      Boolean(manualVocCtq.length || pipelineData?.vocCtq?.length),
      Boolean(pipelineData?.sipoc?.length),
    ],
    measurement: [
      Boolean(inputDataset || measurementDataset),
      Boolean(inputAnalysis || measurementAnalysis),
      Boolean(pipelineData?.msaValidation?.length),
      Boolean(pipelineData?.vitalXs?.length),
      Boolean(pipelineData?.gutPrioritization?.length),
    ],
    aic: [
      validatedHypothesis,
      validatedActionPlan,
      Boolean(controlPhase.dataset || controlPhase.evaluation),
    ],
  } satisfies Record<'definition' | 'measurement' | 'aic', boolean[]>;
  const phaseMilestoneLabels = {
    definition: ['Problem statement', 'Project Charter', 'Pipeline gerado', 'VOC → CTQ', 'SIPOC'],
    measurement: ['Dados carregados', 'Análise calculada', 'MSA validado', 'Xs vitais', 'Causas priorizadas'],
    aic: ['Hipóteses', 'Plano de ação', 'Controle'],
  } satisfies Record<'definition' | 'measurement' | 'aic', string[]>;
  const calculatedPhaseProgress = Object.fromEntries(Object.entries(phaseProgress).map(([id, milestones]) => {
    const completed = milestones.filter(Boolean).length;
    const phaseId = id as 'definition' | 'measurement' | 'aic';
    const pending = milestones.flatMap((done, index) => done ? [] : [phaseMilestoneLabels[phaseId][index]]);
    return [id, { progress: Math.round((completed / milestones.length) * 100), completed, total: milestones.length, pending, next: pending[0] ?? 'Revisar e sustentar os resultados' }];
  })) as Record<'definition' | 'measurement' | 'aic', PhaseProgress>;
  const controlPhaseProgress: PhaseProgress = (() => {
    const milestones = [Boolean(controlPhase.dataset), Boolean(controlPhase.evaluation)];
    const labels = ['Dados pós-intervenção', 'Avaliação de sustentabilidade'];
    const completed = milestones.filter(Boolean).length;
    const pending = milestones.flatMap((done, index) => done ? [] : [labels[index]]);
    return { progress: Math.round((completed / milestones.length) * 100), completed, total: milestones.length, pending, next: pending[0] ?? 'Revisar a estabilidade periodicamente' };
  })();
  const daysInCycle = (() => {
    if (!charter.date) return null;
    const startDate = new Date(`${charter.date}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86_400_000) + 1);
  })();
  const meaningfulRows = (rows: DmaicRow[] | undefined) => rows?.filter((row) => Object.values(row).some((value) => String(value).trim())).length ?? 0;
  const vitalXsCount = meaningfulRows(pipelineData?.vitalXs);
  const indicatorValue = pipelineData?.indicatorsY?.baseline?.trim()
    || (inputAnalysis?.kind === 'continuous' ? inputAnalysis.mean.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '')
    || '—';
  const indicatorNote = pipelineData?.indicatorsY?.primaryMetricY?.trim() || selectedIndicator || 'Indicador Y pendente';
  const msaStatus = pipelineData?.msaValidation?.find((row) => String(row.gageRrStatus ?? '').trim())?.gageRrStatus?.trim() || '—';
  const pulse: ProjectPulse = {
    cycleDays: daysInCycle,
    cycleNote: charter.date ? `desde ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${charter.date}T00:00:00`))}` : 'Defina a data no Charter',
    indicatorValue,
    indicatorNote,
    vitalXsValue: String(vitalXsCount).padStart(2, '0'),
    vitalXsNote: vitalXsCount > 0 ? `${vitalXsCount} registrado(s)` : 'Nenhum X registrado',
    dataConfidence: msaStatus,
    dataConfidenceNote: msaStatus === '—' ? 'MSA ainda não validado' : 'Status informado no MSA',
    updatedLabel: formatPulseUpdatedAt(workspaceLocalDraftRef.current?.savedAt ?? null),
  };

  const hasUnsavedChanges = workspaceDirty || analysisDirtyRef.current || manualVocCtqDirty || sipocDirty || msaDirty || vitalXDirty || gutDirty || solutionsDirty || controlPlanDirty || processMapDirty || hypothesesDirty || ishikawaDirty;

  const createAnalysisArtifacts = (): DmaicAnalysisArtifacts => {
    const exploratorySummary = inputDataset && inputAnalysis ? buildExploratorySummary(inputDataset, inputAnalysis, analysisMonths) : null;
    return {
      version: 1,
      dataset: inputDataset,
      measurementDataset,
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
      whatIfAnalyses,
      processMap,
      ishikawa,
      ishikawaInputText,
      hypothesisStatuses,
      hypothesisNotes,
      hypothesisLinks,
      attachments,
      projectDecisions,
      artifactHistory,
      causeAndEffectMatrix,
      solutionPrioritizationMatrix,
      controlPhase,
    } as any;
  };
  createAnalysisArtifactsRef.current = createAnalysisArtifacts;

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
    setWorkspaceDirty(false);
    setProjectKey(draft.projectKey);
    workspaceProjectKeyRef.current = draft.projectKey;
    setStatement(draft.statement);
    setConfirmedCharter(draft.confirmedCharter);
    setCharter(draft.charter);
    setAiCharterSuggestions(draft.aiCharterSuggestions);
    setInputDataset(draft.analysisArtifacts.dataset);
    setMeasurementDataset(draft.analysisArtifacts.measurementDataset ?? null);
    setWhatIfAnalyses(draft.analysisArtifacts.whatIfAnalyses ?? []);
    setWhatIfSaved(false);
    setProcessMap(cloneProcessMap(draft.analysisArtifacts.processMap ?? createInitialProcessMap()));
    setProcessMapDirty(false);
    setProcessMapSaved(false);
    setIshikawa(draft.analysisArtifacts.ishikawa ?? draft.analysisArtifacts.pipeline?.ishikawa ?? null);
    setHypothesisStatuses((draft.analysisArtifacts as any)?.hypothesisStatuses ?? {});
    setHypothesisNotes((draft.analysisArtifacts as any)?.hypothesisNotes ?? {});
    setHypothesisLinks((draft.analysisArtifacts as any)?.hypothesisLinks ?? {});
    setAttachments((draft.analysisArtifacts as any)?.attachments ?? []);
    setProjectDecisions((draft.analysisArtifacts as any)?.projectDecisions ?? []);
    setArtifactHistory((draft.analysisArtifacts as any)?.artifactHistory ?? []);
    setHypothesesDirty(false);
    setHypothesesSaved(false);
    setIshikawaInputText(draft.analysisArtifacts.ishikawaInputText ?? '');
    setIshikawaDirty(false);
    setIshikawaSaved(false);
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
    setMsaDirty(false);
    setMsaSaved(false);
    setVitalXDirty(false);
    setVitalXSaved(false);
    setGutDirty(false);
    setGutSaved(false);
    setSolutionsDirty(false);
    setSolutionsSaved(false);
    setControlPlanDirty(false);
    setControlPlanSaved(false);
    setControlPhase({ dataset: null, months: 12, selectedIndicators: [], statistics: [], evaluation: null });
    setCauseAndEffectMatrix((draft.analysisArtifacts as any)?.causeAndEffectMatrix ?? null);
    setSolutionPrioritizationMatrix((draft.analysisArtifacts as any)?.solutionPrioritizationMatrix ?? null);
    setControlPhase((draft.analysisArtifacts as any)?.controlPhase ?? { dataset: null, months: 12, selectedIndicators: [], statistics: [], evaluation: null });
    setPipelineDone(Boolean(draft.analysisArtifacts.pipeline));
    setCsvError(null);
    setMeasurementCsvError(null);
    workspaceRevisionRef.current = workspace.revision;
          setWorkspaceDirty(false);
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
  }, [aiCharterSuggestions, analysisMonths, charter, confirmedCharter, exploratoryDiagnosis, exploratoryDiagnosisInput, inputDataset, ishikawa, ishikawaInputText, hypothesisStatuses, hypothesisNotes, hypothesisLinks, attachments, projectDecisions, artifactHistory, localDraftConflict, manualVocCtq, measurementDataset, pipelineAnalysisContext, pipelineData, processMap, selectedIndicator, statement, whatIfAnalyses, causeAndEffectMatrix, solutionPrioritizationMatrix, controlPhase]);

  const queueWorkspaceSave = (
    attempt: WorkspaceSaveAttempt,
    callbacks: { onSuccess?: (savedWorkspace: DmaicWorkspace) => void; onConflict?: (latestWorkspace: DmaicWorkspace) => void; onError: (error: unknown) => void },
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
      callbacks.onError(error);
    });
  };

  const saveWorkspace = (source: WorkspaceSaveSource, expectedRevision?: number, analysisArtifactsOverride?: DmaicAnalysisArtifacts) => {
    if (statement.trim().length < 10) {
      setWorkspaceError('Descreva o problema com pelo menos 10 caracteres antes de salvar no Repositório.');
      return;
    }
    if (statement.trim().length > 4000) {
      setWorkspaceError('O problem statement deve ter no máximo 4.000 caracteres antes de salvar no Repositório.');
      return;
    }
    if (source === 'charter') charterReviewVersionRef.current += 1;
    setWorkspaceError(null);
    setWorkspaceConflict(null);
    const charterToPersist = source === 'charter' ? charter : confirmedCharter;
    const analysisArtifacts = analysisArtifactsOverride ?? createAnalysisArtifacts();
    if (analysisArtifactsSizeInBytes(analysisArtifacts) > MAX_ANALYSIS_ARTIFACT_BYTES) {
      setWorkspaceError('Os dados da análise excedem o limite de 3 MB.');
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
          } else if (source === 'msa') {
            setMsaDirty(false);
            setMsaSaved(true);
          } else if (source === 'vitalx') {
            setVitalXDirty(false);
            setVitalXSaved(true);
          } else if (source === 'gut') {
            setGutDirty(false);
            setGutSaved(true);
          } else if (source === 'solutions') {
            setSolutionsDirty(false);
            setSolutionsSaved(true);
          } else if (source === 'control-plan') {
            setControlPlanDirty(false);
            setControlPlanSaved(true);
          } else if (source === 'what-if') {
            setWhatIfSaved(true);
          } else if (source === 'process-map') {
            setProcessMapDirty(false);
            setProcessMapSaved(true);
          } else if (source === 'ishikawa') {
            setIshikawaDirty(false);
            setIshikawaSaved(true);
          } else if (source === 'hypotheses') {
            setHypothesesDirty(false);
            setHypothesesSaved(true);
          }
        },
        onConflict: (latestWorkspace) => setWorkspaceConflict({ latest: latestWorkspace, source }),
        onError: (error) => setWorkspaceError(source === 'what-if'
          ? 'A resposta foi gerada, mas ainda não foi salva no Repositório.'
          : `Não foi possível salvar no Repositório. ${getApiErrorMessage(error)}`),
      },
    );
  };

  const saveStatement = () => saveWorkspace('statement');
  const saveCharter = () => saveWorkspace('charter');

  const saveMatrices = (causeData?: any, solData?: any) => {
    if (causeData) setCauseAndEffectMatrix(causeData);
    if (solData) setSolutionPrioritizationMatrix(solData);

    const currentPipeline = pipelineData || {
      version: 1,
      projectTitle: charter.projectName || 'Projeto',
      problemStatement: statement || DEFAULT_PROBLEM_STATEMENT,
      executiveSummary: '',
      businessCase: '',
      expectedSavings: '',
      projectCharter: {},
      vocCtq: [],
      sipoc: [],
      msaValidation: [],
      vitalXs: [],
      causeAndEffectMatrix: [],
      effortImpactMatrix: [],
      solutionPrioritizationMatrix: [],
      gutPrioritization: [],
      actionPlan: [],
      controlPlan: [],
      indicatorsY: {},
    };

    const updatedPipeline = {
      ...currentPipeline,
      causeAndEffectMatrix: causeData ?? causeAndEffectMatrix ?? (currentPipeline as any).causeAndEffectMatrix,
      solutionPrioritizationMatrix: solData ?? solutionPrioritizationMatrix ?? (currentPipeline as any).solutionPrioritizationMatrix,
    };

    setPipelineData(updatedPipeline as any);

    const validStatement = statement && statement.trim().length >= 10 ? statement.trim() : DEFAULT_PROBLEM_STATEMENT;
    if (!statement || statement.trim().length < 10) {
      setStatement(validStatement);
    }

    const artifacts = createAnalysisArtifacts();
    const finalArtifacts = {
      ...artifacts,
      pipeline: updatedPipeline as any,
      causeAndEffectMatrix: causeData ?? causeAndEffectMatrix,
      solutionPrioritizationMatrix: solData ?? solutionPrioritizationMatrix,
    };

    queueWorkspaceSave(
      {
        source: 'statement',
        data: {
          problemStatement: validStatement,
          projectCharterContext: toProjectCharterContext(confirmedCharter),
          aiCharterSuggestions: aiCharterSuggestions,
          analysisArtifacts: finalArtifacts,
        },
      },
      {
        onSuccess: () => {
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2200);
        },
        onError: () => {
          setWorkspaceError('Não foi possível gravar as matrizes no Repositório. Verifique sua conexão.');
        },
      }
    );
  };

  const updateProcessMap = (nextProcessMap: DmaicProcessMap) => {
    setWorkspaceDirty(true);
    setProcessMap(nextProcessMap);
    setProcessMapDirty(true);
    setProcessMapSaved(false);
  };
  const saveProcessMap = () => saveWorkspace('process-map');
  const updateIshikawaInputText = (value: string) => {
    setWorkspaceDirty(true);
    setIshikawaInputText(value);
    setIshikawaDirty(true);
    setIshikawaSaved(false);
    ishikawaMutation.reset();
  };
  const updateIshikawa = (value: Record<string, string[]>) => {
    setWorkspaceDirty(true);
    setIshikawa(value);
    setIshikawaDirty(true);
    setIshikawaSaved(false);
  };
  const updateHypothesisStatus = (key: string, status: HypothesisStatus) => {
    if (status === 'Comprovada' && !hypothesisNotes[key]?.trim()) {
      setHypothesisValidationError('Registre a evidência da hipótese antes de marcá-la como Comprovada.');
      return;
    }
    setHypothesisValidationError(null);
    setWorkspaceDirty(true);
    setHypothesisStatuses((current) => ({ ...current, [key]: status }));
    setHypothesesDirty(true);
    setHypothesesSaved(false);
  };
  const updateHypothesisNote = (key: string, note: string) => {
    setWorkspaceDirty(true);
    setHypothesisNotes((current) => ({ ...current, [key]: note }));
    setHypothesesDirty(true);
    setHypothesesSaved(false);
    setHypothesisValidationError(null);
  };
  const updateHypothesisLink = (key: string, field: keyof HypothesisLink, value: string) => {
    setWorkspaceDirty(true);
    setHypothesisLinks((current) => ({ ...current, [key]: { ...(current[key] ?? EMPTY_HYPOTHESIS_LINK), [field]: value } }));
    setHypothesesDirty(true);
    setHypothesesSaved(false);
  };
  const addAttachment = (file: File) => {
    setWorkspaceDirty(true);
    setAttachments((current) => [...current, { name: file.name, type: file.type, size: file.size, addedAt: new Date().toISOString() }]);
  };
  const saveHypotheses = () => {
    const nextHistory = [...artifactHistory, { artifact: 'Hipóteses', action: 'Atualização', date: new Date().toISOString(), detail: 'Status e evidências revisados pela equipe.' }];
    setArtifactHistory(nextHistory);
    saveWorkspace('hypotheses', undefined, { ...createAnalysisArtifacts(), hypothesisStatuses, hypothesisNotes, hypothesisLinks, attachments, artifactHistory: nextHistory } as any);
  };
  const saveProjectRecords = () => {
    const nextHistory = [...artifactHistory, { artifact: 'Decisões', action: 'Atualização', date: new Date().toISOString(), detail: 'Registro de decisão revisado pela equipe.' }];
    setArtifactHistory(nextHistory);
    saveWorkspace('hypotheses', undefined, { ...createAnalysisArtifacts(), projectDecisions, hypothesisLinks, attachments, artifactHistory: nextHistory } as any);
  };
  const generateIshikawa = () => {
    const sourceText = ishikawaInputText.trim();
    if (sourceText.length < 10) return;
    ishikawaMutation.mutate({ data: { sourceText } }, {
      onSuccess: (result) => {
        setIshikawa(result.ishikawa);
        setIshikawaDirty(true);
        setIshikawaSaved(false);
      },
    });
  };
  const saveIshikawa = () => saveWorkspace('ishikawa');
  const handleDiagnosisChange = (diagnosis: string | null, diagnosisInput: DmaicExploratoryDiagnosisInput) => {
    setExploratoryDiagnosis(diagnosis);
    setExploratoryDiagnosisInput(diagnosisInput);
    analysisDirtyRef.current = true;
    if (diagnosis && projectKey) saveWorkspace('statement', undefined, { ...createAnalysisArtifacts(), diagnosis, diagnosisInput });
  };
  const runMeasurementWhatIf = (question: string) => {
    if (!measurementAnalysis || !measurementDataset) return;
    const requestSession = workspaceSessionRef.current;
    whatIfMutation.reset();
    setWhatIfSaved(false);
    setWorkspaceError(null);
    const context: DmaicMeasurementWhatIfContext = {
      xColumn: measurementAnalysis.xColumn,
      rowCount: measurementDataset.rows.length,
      variables: measurementAnalysis.variables.map((variable) => ({
        name: variable.name,
        count: variable.count,
        mean: variable.mean,
        median: variable.median,
        minimum: variable.minimum,
        maximum: variable.maximum,
        standardDeviation: variable.standardDeviation,
        q1: variable.q1,
        q3: variable.q3,
        iqr: variable.iqr,
        normality: variable.normality,
      })),
      anova: {
        available: measurementAnalysis.anova.available,
        fStatistic: measurementAnalysis.anova.fStatistic,
        pValue: measurementAnalysis.anova.pValue,
        numeratorDf: measurementAnalysis.anova.numeratorDf,
        denominatorDf: measurementAnalysis.anova.denominatorDf,
        epsilon: measurementAnalysis.anova.epsilon,
      },
      pairwise: [...measurementAnalysis.pairwise]
        .sort((left, right) => Number(right.significant) - Number(left.significant)
          || (left.adjustedPValue ?? 1) - (right.adjustedPValue ?? 1)
          || Math.abs(right.meanDifference) - Math.abs(left.meanDifference)
          || left.left.localeCompare(right.left)
          || left.right.localeCompare(right.right))
        .slice(0, 100)
        .map((comparison) => ({
          left: comparison.left,
          right: comparison.right,
          observations: comparison.observations,
          meanDifference: comparison.meanDifference,
          adjustedPValue: comparison.adjustedPValue,
          significant: comparison.significant,
        })),
      pairwiseTotal: measurementAnalysis.pairwise.length,
      priorities: measurementAnalysis.priorities.map((priority) => ({
        name: priority.name,
        score: priority.score,
        explanation: priority.explanation,
      })),
      projectGoal: confirmedCharter.goalDefinition.trim() || confirmedCharter.objective.trim(),
      kpis: confirmedCharter.kpis.trim(),
      assumptions: confirmedCharter.assumptionsAndConstraints.trim(),
      businessContributionsQuantitative: confirmedCharter.businessContributionsQuantitative.trim(),
      financialGainValue: confirmedCharter.financialGainValue.trim(),
      financialInformation: confirmedCharter.financialInformation.trim(),
    };
    whatIfMutation.mutate(
      { data: { question: question.trim(), problemStatement: statement.trim() || DEFAULT_PROBLEM_STATEMENT, context } },
      {
        onSuccess: ({ answer }) => {
          if (requestSession !== workspaceSessionRef.current) return;
          const record: DmaicMeasurementWhatIfRecord = {
            id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `what-if-${Date.now()}`,
            question: question.trim(),
            answer,
            createdAt: new Date().toISOString(),
            context,
          };
          const nextHistory = [record, ...whatIfAnalyses].slice(0, 50);
          setWhatIfAnalyses(nextHistory);
          analysisDirtyRef.current = true;
          saveWorkspace('what-if', undefined, { ...createAnalysisArtifactsRef.current(), whatIfAnalyses: nextHistory });
        },
      },
    );
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
    setMeasurementDataset(recoveredDraft.analysisArtifacts.measurementDataset ?? null);
    setWhatIfAnalyses(recoveredDraft.analysisArtifacts.whatIfAnalyses ?? []);
    setWhatIfSaved(false);
    setProcessMap(cloneProcessMap(recoveredDraft.analysisArtifacts.processMap ?? createInitialProcessMap()));
    setProcessMapDirty(false);
    setProcessMapSaved(false);
    setIshikawa(recoveredDraft.analysisArtifacts.ishikawa ?? recoveredDraft.analysisArtifacts.pipeline?.ishikawa ?? null);
    setHypothesisStatuses((recoveredDraft.analysisArtifacts as any)?.hypothesisStatuses ?? {});
    setHypothesisNotes((recoveredDraft.analysisArtifacts as any)?.hypothesisNotes ?? {});
    setHypothesisLinks((recoveredDraft.analysisArtifacts as any)?.hypothesisLinks ?? {});
    setAttachments((recoveredDraft.analysisArtifacts as any)?.attachments ?? []);
    setProjectDecisions((recoveredDraft.analysisArtifacts as any)?.projectDecisions ?? []);
    setArtifactHistory((recoveredDraft.analysisArtifacts as any)?.artifactHistory ?? []);
    setHypothesesDirty(false);
    setHypothesesSaved(false);
    setIshikawaInputText(recoveredDraft.analysisArtifacts.ishikawaInputText ?? '');
    setIshikawaDirty(false);
    setIshikawaSaved(false);
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
    setMsaDirty(false);
    setMsaSaved(false);
    setVitalXDirty(false);
    setVitalXSaved(false);
    setGutDirty(false);
    setGutSaved(false);
    setSolutionsDirty(false);
    setSolutionsSaved(false);
    setControlPlanDirty(false);
    setControlPlanSaved(false);
    setCauseAndEffectMatrix((recoveredDraft.analysisArtifacts as any)?.causeAndEffectMatrix ?? null);
    setSolutionPrioritizationMatrix((recoveredDraft.analysisArtifacts as any)?.solutionPrioritizationMatrix ?? null);
    setPipelineDone(Boolean(recoveredDraft.analysisArtifacts.pipeline));
    setMeasurementCsvError(null);
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
    setWorkspaceDirty(true);
    setStatement(value);
  };
  const updateCharter = (field: CharterTextField, value: string) => {
    draftWriteEnabledRef.current = true;
    setWorkspaceDirty(true);
    setCharter((current) => ({ ...current, [field]: value }));
  };
  const updateCharterTeam = (role: CharterTeamRole, field: keyof CharterTeamMember, value: string) => {
    draftWriteEnabledRef.current = true;
    setWorkspaceDirty(true);
    setCharter((current) => ({ ...current, team: { ...current.team, [role]: { ...current.team[role], [field]: value } } }));
  };
  const updateAnalysisMonths = (months: number) => {
    analysisDirtyRef.current = true;
    setWorkspaceDirty(true);
    setAnalysisMonths(months);
  };
  const updateSelectedIndicator = (indicator: string) => {
    analysisDirtyRef.current = true;
    setWorkspaceDirty(true);
    setSelectedIndicator(indicator);
  };
  const updateManualVocCtq = (rows: DmaicVocCqt[]) => {
    setWorkspaceDirty(true);
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
    setWorkspaceDirty(true);
    setPipelineData((prev) => prev ? { ...prev, sipoc: next } : prev);
    setSipocDirty(true);
    setSipocSaved(false);
  };
  const saveSipoc = () => {
    if (!pipelineData) return;
    saveWorkspace('sipoc');
  };
  const updateMsa = (next: MsaRow[]) => {
    setWorkspaceDirty(true);
    setPipelineData((prev) => prev ? { ...prev, msaValidation: next } : prev);
    setMsaDirty(true);
    setMsaSaved(false);
  };
  const saveMsa = () => {
    if (!pipelineData) return;
    saveWorkspace('msa');
  };
  const updateVitalX = (next: VitalXBreakdownRow[]) => {
    setWorkspaceDirty(true);
    setPipelineData((prev) => prev ? { ...prev, vitalXs: next } : prev);
    setVitalXDirty(true);
    setVitalXSaved(false);
  };
  const saveVitalX = () => {
    if (!pipelineData) return;
    saveWorkspace('vitalx');
  };
  const updateGut = (next: GutRow[]) => {
    setWorkspaceDirty(true);
    const persistedRows: DmaicRow[] = next.map((row) => ({ problem: row.problem, g: String(row.g), u: String(row.u), t: String(row.t), score: String(row.score) }));
    setPipelineData((prev) => prev ? { ...prev, gutPrioritization: persistedRows } : prev);
    setGutDirty(true);
    setGutSaved(false);
  };
  const saveGut = () => {
    if (!pipelineData) return;
    saveWorkspace('gut');
  };
  const updateSolutions = (next: SolutionRow[]) => {
    setWorkspaceDirty(true);
    setPipelineData((prev) => prev ? { ...prev, actionPlan: next } : prev);
    setSolutionsDirty(true);
    setSolutionsSaved(false);
  };
  const saveSolutions = () => {
    if (!pipelineData) return;
    const incompleteAction = Array.isArray((pipelineData as any).actionPlan) && (pipelineData as any).actionPlan.some((row: Partial<ActionPlanRow>) => !row.who?.trim() || !row.when?.trim());
    if (incompleteAction) {
      setWorkspaceError('Cada ação precisa de responsável e prazo antes de ser salva.');
      return;
    }
    setWorkspaceError(null);
    saveWorkspace('solutions');
  };
  const updateControlPlan = (next: ControlPlanRow[]) => {
    setWorkspaceDirty(true);
    setPipelineData((prev) => prev ? { ...prev, controlPlan: next } : prev);
    setControlPlanDirty(true);
    setControlPlanSaved(false);
  };
  const saveControlPlan = () => {
    saveWorkspace('control-plan');
  };

  const evaluateControlPhase = (statistics: ControlStatistic[], months: number) => {
    if (!inputAnalysis && !measurementAnalysis) {
      setWorkspaceError('Defina uma baseline com dados de medição antes de avaliar a melhoria.');
      return;
    }
    setWorkspaceError(null);
    if (!statistics.length || statement.trim().length < 1) return;
    setControlPhase((current) => ({ ...current, statistics }));
    setControlEvaluationLoading(true);
    setControlEvaluationError(null);
    void fetch('/api/dmaic/control-evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemStatement: statement.trim(), projectCharterContext: toProjectCharterContext(charter), months, statistics }),
    }).then(async (response) => {
      const payload = await response.json() as ControlEvaluation & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Não foi possível avaliar o Controle.');
      const nextControlPhase = { ...controlPhase, statistics, evaluation: payload };
      setControlPhase(nextControlPhase);
      saveWorkspace('control-plan', undefined, { ...createAnalysisArtifacts(), controlPhase: nextControlPhase } as any);
    }).catch((error: unknown) => {
      setControlEvaluationError(error instanceof Error ? error.message : 'Não foi possível avaliar o Controle.');
    }).finally(() => setControlEvaluationLoading(false));
  };

  const loadSelectedProject = async () => {
    const nextProjectKey = Number(selectedProjectKey);
    if (!Number.isSafeInteger(nextProjectKey) || nextProjectKey < 1 || projectLoading) return;
    if (hasUnsavedChanges && !window.confirm('Há alterações não salvas neste projeto. Carregar outro projeto irá descartá-las. Deseja continuar?')) return;
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
      setProjectLoadedMessage(`Projeto #${nextProjectKey} carregado do Repositório.`);
      window.setTimeout(() => setProjectLoadedMessage(null), 2600);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Não foi possível carregar o projeto selecionado.');
    } finally {
      setProjectLoading(false);
    }
  };

  const startNewProject = () => {
    if (hasUnsavedChanges && !window.confirm('Há alterações não salvas neste projeto. Começar um novo projeto irá descartá-las. Deseja continuar?')) return;
    workspaceSessionRef.current += 1;
    const freshCharter = createProjectCharterDraft();
    setProjectKey(null);
    workspaceProjectKeyRef.current = null;
    analysisDirtyRef.current = false;
    setWorkspaceDirty(false);
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
    setMsaDirty(false);
    setMsaSaved(false);
    setVitalXDirty(false);
    setVitalXSaved(false);
    setGutDirty(false);
    setGutSaved(false);
    setSolutionsDirty(false);
    setSolutionsSaved(false);
    setControlPlanDirty(false);
    setControlPlanSaved(false);
    setCauseAndEffectMatrix(null);
    setSolutionPrioritizationMatrix(null);
    setPipelineDone(false);
    setInputDataset(null);
    setMeasurementDataset(null);
    setWhatIfAnalyses([]);
    setWhatIfSaved(false);
    setProcessMap(createInitialProcessMap());
    setProcessMapDirty(false);
    setProcessMapSaved(false);
    setIshikawa(null);
    setHypothesisStatuses({});
    setHypothesisNotes({});
    setHypothesisLinks({});
    setAttachments([]);
    setProjectDecisions([]);
    setArtifactHistory([]);
    setHypothesesDirty(false);
    setHypothesesSaved(false);
    setIshikawaInputText('');
    setIshikawaDirty(false);
    setIshikawaSaved(false);
    setAnalysisMonths(12);
    setSelectedIndicator('');
    setExploratoryDiagnosis(null);
    setExploratoryDiagnosisInput(null);
    setPipelineAnalysisContext(null);
    setCsvError(null);
    setMeasurementCsvError(null);
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
      setPipelineError('Salve o Problem Statement primeiro para criar o código numérico deste projeto no Repositório.');
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
          const shouldSeedProcessMap = !pipelineData && !processMapDirty;
          const generatedProcessMap = shouldSeedProcessMap
            ? createProcessMapFromSipoc(data.sipoc, data.vocCtq, data.indicatorsY)
            : processMap;
          setPipelineData(data);
          setPipelineAnalysisContext(analysisContext);
          setCharter(generatedCharter);
          setAiCharterSuggestions(data.generatedCharter);
          if (shouldSeedProcessMap) {
            setProcessMap(generatedProcessMap);
            setProcessMapDirty(false);
            setProcessMapSaved(false);
          }
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
                analysisArtifacts: { ...createAnalysisArtifacts(), pipeline: data, pipelineAnalysisContext: analysisContext, processMap: generatedProcessMap },
              },
            },
            {
              onConflict: (latestWorkspace) => setWorkspaceConflict({ latest: latestWorkspace, source: 'suggestions' }),
              onError: () => setWorkspaceError('As sugestões foram geradas, mas não puderam ser protegidas no Repositório. Salve o Charter para tentar novamente.'),
            },
          );
        },
        onError: (error) => {
          setPipelineError(`Não foi possível gerar o pipeline agora. ${getApiErrorMessage(error)}`);
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

  const handleMeasurementUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploadVersion = measurementUploadVersionRef.current + 1;
    measurementUploadVersionRef.current = uploadVersion;
    setMeasurementCsvError(null);
    setMeasurementDataset(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMeasurementCsvError('Use um arquivo com extensão .csv para executar a análise da Medição.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (uploadVersion !== measurementUploadVersionRef.current) return;
      try {
        const dataset = parseMeasurementCsv(String(reader.result ?? ''), file.name);
        if (uploadVersion !== measurementUploadVersionRef.current) return;
        analysisDirtyRef.current = true;
        setWorkspaceDirty(true);
        setMeasurementDataset(dataset);
      } catch (error) {
        if (uploadVersion !== measurementUploadVersionRef.current) return;
        setMeasurementDataset(null);
        setMeasurementCsvError(error instanceof Error ? error.message : 'Não foi possível interpretar o CSV da Medição.');
      }
    };
    reader.onerror = () => {
      if (uploadVersion !== measurementUploadVersionRef.current) return;
      setMeasurementDataset(null);
      setMeasurementCsvError('O navegador não conseguiu ler o arquivo da Medição. Tente exportar o CSV novamente.');
    };
    reader.readAsText(file);
  };

  const handleControlUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploadVersion = controlUploadVersionRef.current + 1;
    controlUploadVersionRef.current = uploadVersion;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setWorkspaceError('Use um arquivo com extensão .csv para Controle.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (uploadVersion !== controlUploadVersionRef.current) return;
      try {
        const dataset = parseInputCsv(String(reader.result ?? ''), file.name);
        const numericIndicators = dataset.indicatorColumns.filter((indicator) => {
          const normalized = indicator.toLowerCase();
          return indicator !== dataset.dateColumn && indicator !== dataset.headers[0] && !/\b(data|date|m[eê]s|mes|month|per[ií]odo|period)\b/.test(normalized) && isContinuousIndicator(dataset, indicator);
        });
        const selectedIndicators = numericIndicators.length > 0
          ? numericIndicators.slice(0, 1)
          : dataset.indicatorColumns.filter((indicator) => indicator !== dataset.headers[0]).slice(0, 1);
        setWorkspaceDirty(true);
        setControlPhase({ dataset, months: controlPhase.months, selectedIndicators: selectedIndicators.slice(0, 1), statistics: [], evaluation: null });
        setWorkspaceError(null);
      } catch (error) {
        setWorkspaceError(error instanceof Error ? error.message : 'Não foi possível interpretar o CSV de Controle.');
      }
    };
    reader.onerror = () => setWorkspaceError('O navegador não conseguiu ler o CSV de Controle.');
    reader.readAsText(file);
  };

  const retryUpload = () => { setCsvError(null); fileRef.current?.click(); };
  const openTool = (tool: Tool) => setSelectedTool(tool);
  const exportExecutiveReport = () => {
    const linkRows = Object.entries(hypothesisLinks).map(([key, link]) => `<tr><td>${escapeCharterHtml(key)}</td><td>${escapeCharterHtml(link.vitalX)}</td><td>${escapeCharterHtml(link.test)}</td><td>${escapeCharterHtml(link.action)}</td><td>${escapeCharterHtml(link.result)}</td></tr>`).join('');
    const decisionRows = projectDecisions.map((decision) => `<tr><td>${escapeCharterHtml(decision.decision)}</td><td>${escapeCharterHtml(decision.owner)}</td><td>${escapeCharterHtml(decision.date)}</td><td>${escapeCharterHtml(decision.evidence)}</td><td>${escapeCharterHtml(decision.impact)}</td></tr>`).join('');
    const historyRows = artifactHistory.map((entry) => `<li>${escapeCharterHtml(entry.artifact)} · ${escapeCharterHtml(entry.action)} · ${escapeCharterHtml(entry.detail)}</li>`).join('');
    const attachmentRows = attachments.map((item) => `<li>${escapeCharterHtml(item.name)} (${Math.ceil(item.size / 1024)} KB)</li>`).join('');
    const executiveRows = `<h1>Resumo executivo</h1><p class="subtitle">${escapeCharterHtml(activeProjectName)} · gerado em ${new Date().toLocaleDateString('pt-BR')}</p><h2>Problema</h2><p>${escapeCharterHtml(statement)}</p><h2>Y e baseline</h2><p>${escapeCharterHtml(String((pipelineData as any)?.indicatorsY?.primaryMetricY ?? 'Não definido'))} · ${escapeCharterHtml(String((pipelineData as any)?.indicatorsY?.baseline ?? 'Não registrado'))}</p><h2>Hipóteses em teste</h2><p>${Object.values(hypothesisStatuses).filter((status) => status === 'Em teste').length}</p><h2>Ações abertas</h2><p>${Array.isArray((pipelineData as any)?.actionPlan) ? (pipelineData as any).actionPlan.length : 0}</p><h2>Vínculos de rastreabilidade</h2><table><tr><th>Hipótese</th><th>X vital</th><th>Teste</th><th>Ação</th><th>Resultado</th></tr>${linkRows}</table><h2>Decisões</h2><table><tr><th>Decisão</th><th>Responsável</th><th>Data</th><th>Evidência</th><th>Impacto</th></tr>${decisionRows}</table><h2>Resultado atual</h2><p>${escapeCharterHtml(controlPhase.evaluation?.summary ?? 'Ainda não avaliado')}</p><h2>Histórico</h2><ul>${historyRows || '<li>Nenhum registro.</li>'}</ul><h2>Anexos</h2><ul>${attachmentRows || '<li>Nenhum anexo.</li>'}</ul>`;
    openPrintDocument(`Resumo executivo - ${activeProjectName}`, executiveRows);
  };
  const duplicateAsModel = () => {
    const modelCharter = { ...charter, projectName: `${charter.projectName.trim() || activeProjectName} (Modelo)` };
    void workspaceMutation.mutateAsync({ data: { problemStatement: statement, projectCharterContext: toProjectCharterContext(modelCharter), aiCharterSuggestions, analysisArtifacts: createAnalysisArtifacts(), expectedRevision: 0 } }).then((workspace) => {
      applyWorkspaceSnapshot(workspace);
      setArea('overview');
      setProjectLoadedMessage(`Modelo duplicado no Repositório como projeto #${workspace.projectKey}.`);
    }).catch(() => setWorkspaceError('Não foi possível duplicar o projeto como modelo.'));
  };

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground">
      <Sidebar area={displayArea} setArea={setArea} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} activeProjectName={activeProjectName} progress={projectProgress} completedMilestones={completedMilestones} daysInCycle={daysInCycle} />
      {mobileOpen && <button data-testid="button-sidebar-overlay" aria-label="Fechar menu" className="fixed inset-0 z-20 bg-sidebar/30 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar area={displayArea} setMobileOpen={setMobileOpen} onStart={startPipeline} pipelineLoading={pipelineLoading} activeProjectName={activeProjectName} searchTerm={searchTerm} onSearch={setSearchTerm} hasUnsavedChanges={hasUnsavedChanges} />
        <main className="dmaic-grid flex-1 overflow-x-hidden px-5 py-7 sm:px-8 sm:py-9">
          <div className="mx-auto max-w-[1240px]">
            {area === 'overview' && (
              <SavedProjects
                projects={workspacesQuery.data ?? []}
                selectedProjectKey={selectedProjectKey}
                loading={workspacesQuery.isLoading || projectLoading}
                error={workspacesQuery.isError ? 'Não foi possível carregar a lista de projetos salvos.' : null}
                onSelect={setSelectedProjectKey}
                onLoad={() => { void loadSelectedProject(); }}
                onNew={startNewProject}
              />
            )}

            {projectLoadedMessage && (
              <div data-testid="status-project-loaded" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs">
                <Check size={15} className="text-primary" />
                <span>{projectLoadedMessage}</span>
              </div>
            )}

            {pipelineLoading && (
              <div data-testid="status-pipeline-loading" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs">
                <RefreshCw size={15} className="animate-spin text-primary" />
                <span><strong>Montando seu caminho DMAIC...</strong> O Gemini está estruturando os entregáveis para a sessão.</span>
              </div>
            )}

            {pipelineError && (
              <div data-testid="status-pipeline-error" className="reveal mb-6 flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                <span>{pipelineError}</span>
                <Button testId="button-retry-pipeline" onClick={startPipeline} variant="outline">Tentar novamente</Button>
              </div>
            )}

            {pipelineData && (
              <div data-testid="status-pipeline-analysis-context" className="reveal mb-6 flex items-start gap-3 rounded-xl border border-chart-3/25 bg-chart-3/5 px-4 py-3 text-xs">
                <FileBarChart size={15} className="mt-0.5 shrink-0 text-chart-3" />
                <span>
                  {pipelineAnalysisContext ? (
                    <><strong>Pipeline fundamentado na análise local.</strong> Indicador <strong>{pipelineAnalysisContext.indicator}</strong>, janela de {pipelineAnalysisContext.analysisMonths} mês(es) e resumo estatístico foram registrados junto aos artefatos gerados.</>
                  ) : (
                    <><strong>Pipeline gerado sem análise estatística anexada.</strong> Carregue um CSV e gere novamente para fundamentar as sugestões em evidências locais.</>
                  )}
                </span>
              </div>
            )}

            {workspaceQuery.isLoading && (
              <div data-testid="status-workspace-loading" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-border bg-muted/55 px-4 py-3 text-xs">
                <RefreshCw size={15} className="animate-spin text-primary" />
                <span>Carregando o Project Charter salvo...</span>
              </div>
            )}

            {localDraftConflict && (
              <div data-testid="status-local-draft-conflict" className="reveal mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs">
                <div className="flex min-w-0 gap-3">
                  <Info size={16} className="mt-0.5 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-bold text-foreground">Encontramos um rascunho neste navegador e uma versão mais recente no Repositório.</p>
                    <p className="mt-1 leading-relaxed text-muted-foreground">Nenhum conteúdo foi apagado. Escolha qual versão deseja manter na tela antes de continuar editando.</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button testId="button-use-server-version" onClick={useServerVersionForLocalDraft} variant="outline">Usar versão do Repositório</Button>
                  <Button testId="button-recover-local-draft" onClick={recoverLocalDraft}>Recuperar meu rascunho</Button>
                </div>
              </div>
            )}

            {workspaceConflict && (
              <div data-testid="status-workspace-conflict" className="reveal mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/35 bg-accent/10 px-4 py-3 text-xs">
                <div className="flex min-w-0 gap-3">
                  <Info size={16} className="mt-0.5 shrink-0 text-accent-foreground" />
                  <div>
                    <p className="font-bold text-foreground">Há uma edição mais recente neste workspace.</p>
                    <p className="mt-1 leading-relaxed text-muted-foreground">Seus campos e sugestões continuam aqui. Carregue a versão mais recente para revisá-la ou substitua-a conscientemente pela sua edição.</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button testId="button-use-latest-workspace" onClick={useLatestWorkspace} variant="outline">Usar versão mais recente</Button>
                  <Button testId="button-overwrite-workspace" onClick={overwriteLatestWorkspace}>Substituir mesmo assim</Button>
                </div>
              </div>
            )}

            {(workspaceError || workspaceQuery.isError) && (
              <div data-testid="status-workspace-error" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                <Info size={15} />
                <span>{workspaceError ?? 'Não foi possível carregar os dados salvos no Repositório.'}</span>
              </div>
            )}

            {localDraftRecovered && !localDraftConflict && (
              <div data-testid="status-local-draft-recovered" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs">
                <Check size={15} className="text-primary" />
                <span><strong>Rascunho recuperado deste navegador.</strong> Suas edições continuam protegidas localmente; use os botões de salvar para confirmá-las também no Repositório.</span>
              </div>
            )}

            {saved && (
              <div data-testid="status-statement-saved" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs">
                <Check size={15} className="text-primary" />
                <span><strong>Mudança salva no Repositório.</strong> O enunciado estará disponível ao reabrir este workspace.</span>
              </div>
            )}

            {charterSaved && (
              <div data-testid="status-charter-saved" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs">
                <Check size={15} className="text-primary" />
                <span><strong>Project charter salvo no Repositório.</strong> Essas informações serão carregadas ao reabrir este workspace e usadas como contexto na geração do pipeline.</span>
              </div>
            )}

            {manualVocSaved && (
              <div data-testid="status-manual-voc-saved" className="reveal mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-xs">
                <Check size={15} className="text-primary" />
                <span><strong>Indicadores manuais salvos no Repositório.</strong> Suas métricas foram registradas neste workspace.</span>
              </div>
            )}

            {area === 'executive' ? (
              <ExecutiveSummary statement={statement} charter={charter} pipeline={pipelineData} ishikawa={ishikawa} hypothesisStatuses={hypothesisStatuses} hypothesisNotes={hypothesisNotes} hypothesisLinks={hypothesisLinks} controlPhase={controlPhase} attachments={attachments} searchTerm={searchTerm} onExport={exportExecutiveReport} onLinkChange={updateHypothesisLink} onAttachmentAdd={addAttachment} onDuplicate={duplicateAsModel} />
            ) : area === 'decisions' ? (
              <div className="space-y-7">
                <div className="reveal flex flex-wrap items-end justify-between gap-4">
                  <div><p className="mono-label mb-2 text-primary">Projeto</p><h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Decisões</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Registre as escolhas que orientam o projeto, seus responsáveis e as evidências que sustentam cada caminho.</p></div>
                  <StatusPill tone="green">Governança do projeto</StatusPill>
                </div>
                <ProjectRecordsPanel decisions={projectDecisions} history={artifactHistory} onDecisionsChange={setProjectDecisions} onSave={saveProjectRecords} />
              </div>
            ) : area === 'overview' ? (
              <Overview
                statement={statement}
                setStatement={updateStatement}
                onSave={saveStatement}
                statementSaved={saved}
                charter={charter}
                onCharterChange={updateCharter}
                onTeamChange={updateCharterTeam}
                onSaveCharter={saveCharter}
                charterSaved={charterSaved}
                pipelineDone={pipelineDone}
                hasAiSuggestions={Boolean(aiCharterSuggestions)}
                onOpenArea={setArea}
                onOpenTool={openTool}
                phaseProgress={calculatedPhaseProgress}
                pulse={pulse}
              />
            ) : area === 'control' ? null : (
              <SprintView
                area={area}
                onOpenTool={openTool}
                ishikawa={ishikawa}
                hypothesisStatuses={hypothesisStatuses}
                hypothesisNotes={hypothesisNotes}
                onHypothesisNoteChange={updateHypothesisNote}
                hypothesisValidationError={hypothesisValidationError}
                projectDecisions={projectDecisions}
                artifactHistory={artifactHistory}
                onProjectDecisionsChange={(value) => { setWorkspaceDirty(true); setProjectDecisions(value); }}
                onSaveProjectRecords={saveProjectRecords}
                onHypothesisStatusChange={updateHypothesisStatus}
                onSaveHypotheses={saveHypotheses}
                hypothesesDirty={hypothesesDirty}
                hypothesesSaved={hypothesesSaved}
                phaseProgress={calculatedPhaseProgress[area as 'definition' | 'measurement' | 'aic']}
                onChangeVital={setVitalId}
                vitalId={vitalId}
                inputDataset={inputDataset}
                inputAnalysis={inputAnalysis}
                inputError={csvError}
                analysisMonths={analysisMonths}
                onAnalysisMonthsChange={updateAnalysisMonths}
                selectedIndicator={selectedIndicator}
                onSelectedIndicatorChange={updateSelectedIndicator}
                diagnosis={exploratoryDiagnosis}
                diagnosisInput={exploratoryDiagnosisInput}
                onDiagnosisChange={handleDiagnosisChange}
                onSaveAnalysis={saveStatement}
                onUpload={handleUpload}
                inputRef={fileRef}
                activeProjectName={activeProjectName}
                pipeline={pipelineData}
                causeAndEffectMatrix={causeAndEffectMatrix}
                solutionPrioritizationMatrix={solutionPrioritizationMatrix}
                setCauseAndEffectMatrix={setCauseAndEffectMatrix}
                setSolutionPrioritizationMatrix={setSolutionPrioritizationMatrix}
                onSaveMatrices={saveMatrices}
                onExportMeasurementPdf={() => exportMeasurementPdf(measurementDataset, measurementAnalysis, processMap, whatIfAnalyses, activeProjectName)}
              />
            )}

            {area === 'control' && (
              <>
                <PhaseSummary area="control" progress={controlPhaseProgress} />
                <ControlPhasePanel
                  phase={controlPhase}
                  onChange={(value) => { setWorkspaceDirty(true); setControlPhase(value); }}
                  onUpload={handleControlUpload}
                  onSave={(phase) => saveWorkspace('control-plan', undefined, { ...createAnalysisArtifacts(), controlPhase: phase } as any)}
                  onEvaluate={evaluateControlPhase}
                  evaluation={controlPhase.evaluation}
                  evaluating={controlEvaluationLoading}
                  evaluationError={controlEvaluationError}
                  saved={controlPlanSaved}
                />
              </>
            )}

            {area === 'measurement' && (
              <>
                {area === 'measurement' && (
                  <MeasurementAnalysisPanel
                    dataset={measurementDataset}
                    analysis={measurementAnalysis}
                    error={measurementCsvError}
                    onUpload={handleMeasurementUpload}
                    inputRef={measurementFileRef}
                    onSave={saveStatement}
                    activeProjectName={activeProjectName}
                    whatIfAnalyses={whatIfAnalyses}
                    onRunWhatIf={runMeasurementWhatIf}
                    whatIfLoading={whatIfMutation.isPending}
                    whatIfError={
                      whatIfMutation.isError
                        ? whatIfMutation.error instanceof Error
                          ? whatIfMutation.error.message.replace(/^HTTP \d+ [^:]+:\s*/, '')
                          : 'Não foi possível realizar a análise What If agora.'
                        : null
                    }
                    whatIfSaved={whatIfSaved}
                  />
                )}
                <ProcessMapEditor
                  value={processMap}
                  onChange={updateProcessMap}
                  onSave={saveProcessMap}
                  dirty={processMapDirty}
                  saved={processMapSaved}
                />
              </>
            )}

            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[10px] text-muted-foreground">
              <span className="mono-label">DMAIC Ágil Suite · workspace no Repositório {projectKey ? `· projeto #${projectKey}` : '· novo projeto'}</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {pipelineData ? 'artefatos gerados pela Suíte · revise com o time' : 'dados de exemplo sinalizados · sem envio externo'}
              </span>
            </footer>
          </div>
        </main>
      </div>

      {selectedTool && (
        <DetailDrawer
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
          pareto={pareto}
          imr={imr}
          inputAnalysis={inputAnalysis}
          hasInputDataset={Boolean(inputDataset)}
          csvError={csvError}
          onRetry={retryUpload}
          pipeline={pipelineData}
          hasDiagnosis={Boolean(exploratoryDiagnosis)}
          manualRows={manualVocCtq}
          hasManualChanges={manualVocCtqDirty}
          manualSaveConfirmed={manualVocSaved}
          onManualRowsChange={updateManualVocCtq}
          onSaveManualRows={saveManualVocCtq}
          charter={charter}
          activeProjectName={activeProjectName}
          sipocDirty={sipocDirty}
          sipocSaved={sipocSaved}
          onSipocChange={updateSipoc}
          onSaveSipoc={saveSipoc}
          msaDirty={msaDirty}
          msaSaved={msaSaved}
          onMsaChange={updateMsa}
          onSaveMsa={saveMsa}
          vitalXDirty={vitalXDirty}
          vitalXSaved={vitalXSaved}
          onVitalXChange={updateVitalX}
          onSaveVitalX={saveVitalX}
          gutDirty={gutDirty}
          gutSaved={gutSaved}
          onGutChange={updateGut}
          onSaveGut={saveGut}
          solutionsDirty={solutionsDirty}
          solutionsSaved={solutionsSaved}
          onSolutionsChange={updateSolutions}
          onSaveSolutions={saveSolutions}
          controlPlanDirty={controlPlanDirty}
          controlPlanSaved={controlPlanSaved}
          onControlPlanChange={updateControlPlan}
          onSaveControlPlan={saveControlPlan}
          ishikawa={ishikawa}
          ishikawaInputText={ishikawaInputText}
          ishikawaDirty={ishikawaDirty}
          ishikawaSaved={ishikawaSaved}
          ishikawaGenerating={ishikawaMutation.isPending}
          ishikawaError={ishikawaMutation.isError ? getApiErrorMessage(ishikawaMutation.error) : null}
          onIshikawaInputTextChange={updateIshikawaInputText}
          onGenerateIshikawa={generateIshikawa}
          onIshikawaChange={updateIshikawa}
          onSaveIshikawa={saveIshikawa}
        />
      )}
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Workspace} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
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