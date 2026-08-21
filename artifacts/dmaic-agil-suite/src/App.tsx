import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type DmaicPipeline, useGetDmaicWorkspace, useRunDmaicPipeline, useSaveDmaicWorkspace } from '@workspace/api-client-react';
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
  SlidersHorizontal,
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
};
type CharterTextField = Exclude<keyof ProjectCharterDraft, 'team'>;
type ProjectCharterContext = Omit<ProjectCharterDraft, 'team'> & { team: Array<CharterTeamMember & { role: string }> };
type GeneratedCharterFields = Pick<ProjectCharterDraft, 'objective' | 'history' | 'goalDefinition' | 'kpis' | 'includedScope' | 'excludedScope' | 'assumptionsAndConstraints' | 'customerRequirements' | 'businessContributions'>;

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
});

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

const applyGeneratedCharterFields = (charter: ProjectCharterDraft, generated: GeneratedCharterFields): ProjectCharterDraft => ({
  ...charter,
  ...generated,
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
    { id: 'scope', title: 'Escopo & fronteiras', subtitle: 'Dentro, fora e sem ruído', icon: SlidersHorizontal, status: 'Pronto', accent: 'var(--chart-5)' },
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

function Sidebar({ area, setArea, mobileOpen, setMobileOpen }: { area: Area; setArea: (area: Area) => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
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
          <p className="mt-2 text-sm font-bold">Redução de lead time</p>
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

function Topbar({ area, setMobileOpen, onStart, pipelineLoading }: { area: Area; setMobileOpen: (open: boolean) => void; onStart: () => void; pipelineLoading: boolean }) {
  const meta = areaMeta[area];
  return <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-border bg-background/85 px-5 backdrop-blur-md sm:px-8"><div className="flex min-w-0 items-center gap-3"><button data-testid="button-open-sidebar" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"><Menu size={20} /></button><div className="min-w-0"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span>Projetos</span><span>/</span><span className="truncate text-foreground">Redução de lead time</span></div><div className="mt-1 flex items-center gap-2"><h1 className="truncate font-serif text-lg font-bold tracking-tight">{meta.label}</h1><span className="hidden rounded bg-muted px-1.5 py-0.5 mono-label text-muted-foreground sm:inline-flex">{meta.kicker}</span></div></div></div><div className="flex shrink-0 items-center gap-2"><div className="relative hidden md:block"><Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" /><input data-testid="input-search" placeholder="Buscar no projeto" className="h-9 w-44 rounded-lg border border-border bg-card pl-9 pr-3 text-xs outline-none transition-all placeholder:text-muted-foreground/70 focus:w-56 focus:border-primary/50" /></div><Button testId="button-start-pipeline" onClick={onStart} disabled={pipelineLoading} className="hidden sm:inline-flex">{pipelineLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}{pipelineLoading ? 'Preparando...' : 'Iniciar pipeline'}</Button><button data-testid="button-more" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><MoreHorizontal size={19} /></button></div></header>;
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
    {hasAiSuggestions && <div data-testid="status-charter-ai-suggestions" className="mt-5 flex gap-3 rounded-xl border border-primary/20 bg-primary/7 p-4 text-xs leading-relaxed"><Sparkles size={16} className="mt-0.5 shrink-0 text-primary" /><p><strong>Campos sugeridos pela IA.</strong> Objetivo, histórico, meta, KPIs, escopo, premissas, requisitos e contribuições foram propostos a partir do Problem statement. Revise, ajuste e salve o Charter quando estiver pronto.</p></div>}
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
      <CharterTextarea label="Contribuições para o negócio" value={charter.businessContributions} onChange={(value) => onFieldChange('businessContributions', value)} testId="textarea-charter-business-contributions" rows={3} placeholder="Benefícios esperados: custo, receita, risco, qualidade, experiência ou capacidade." />
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

function SprintView({ area, onOpenTool, onChangeVital, vitalId, csvName, onUpload, inputRef }: { area: 'definition' | 'measurement' | 'aic'; onOpenTool: (tool: Tool) => void; onChangeVital: (id: string) => void; vitalId: string; csvName: string | null; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; inputRef: { current: HTMLInputElement | null } }) {
  const meta = areaMeta[area];
  const selectedVital = vitalXs.find((vital) => vital.id === vitalId) ?? vitalXs[0];
  return <div className="space-y-7">
    <div className="reveal flex flex-wrap items-end justify-between gap-4"><div><p className="mono-label mb-2" style={{ color: meta.color }}>{meta.kicker}</p><h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{meta.label}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{meta.description}</p></div><div className="flex items-center gap-2"><StatusPill tone="green">Em andamento</StatusPill><button data-testid="button-sprint-options" onClick={() => onOpenTool(tools[area][0])} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground"><MoreHorizontal size={17} /></button></div></div>
    {area === 'measurement' && <div className="reveal-2 panel flex flex-wrap items-center justify-between gap-4 rounded-xl border-l-4 border-l-chart-3 p-4"><div className="flex items-center gap-3"><IconBadge icon={Gauge} tone="chart-3" /><div><p className="text-sm font-bold">Indicador Y em foco</p><p className="mt-0.5 text-xs text-muted-foreground">Tempo total até aprovação · <span className="font-bold text-foreground">12,8 min</span> mediana</p></div></div><div className="flex items-center gap-2"><label htmlFor="vital-select" className="mono-label text-muted-foreground">Vital X</label><select id="vital-select" data-testid="select-vital-x" value={vitalId} onChange={(event) => onChangeVital(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary/50">{vitalXs.map((vital) => <option key={vital.id} value={vital.id}>{vital.label}</option>)}</select></div></div>}
    {area === 'measurement' && <div className="reveal-3 panel rounded-xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mono-label text-chart-3">Vital X selecionado</p><h3 className="mt-2 font-serif text-xl font-bold">{selectedVital.label}</h3><p className="mt-1 text-xs text-muted-foreground">{selectedVital.note} · janela de 30 dias</p></div><div className="text-right"><p className="font-serif text-2xl font-bold">{selectedVital.value}</p><p className="mt-1 text-[11px] font-bold text-primary">{selectedVital.delta} vs. baseline</p></div></div><div className="mt-5 grid h-14 grid-cols-12 items-end gap-1.5 border-b border-border pb-0 sm:grid-cols-24">{[30,36,34,42,38,45,40,49,46,54,51,48,58,53,56,62,59,64,57,68,61,65,72,66].map((height, index) => <div key={index} className="rounded-t-sm bg-chart-3/60 transition-all hover:bg-chart-3" style={{ height: `${height}%` }} />)}</div><div className="mt-2 flex justify-between mono-label text-muted-foreground"><span>01 mai</span><span>30 mai</span></div></div>}
    <div className="reveal-2 flex items-center justify-between"><div><SectionHeading eyebrow={area === 'definition' ? 'Entregáveis de enquadramento' : area === 'measurement' ? 'Entregáveis de evidência' : 'Entregáveis de mudança'} title={area === 'definition' ? 'Dê nome ao problema certo' : area === 'measurement' ? 'Meça sem adivinhar' : 'Faça a solução pegar'} /></div><Button testId={`button-add-${area}`} onClick={() => onOpenTool(tools[area][0])} variant="outline"><Plus size={14} /> Adicionar item</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{tools[area].map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={onOpenTool} />)}</div>
    {area === 'measurement' && <DataUpload csvName={csvName} onUpload={onUpload} inputRef={inputRef} />}
    {area === 'aic' && <div className="reveal-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="panel rounded-xl p-5"><div className="flex items-center justify-between"><div><p className="mono-label text-chart-4">Hipóteses em teste</p><h3 className="mt-2 font-serif text-lg font-bold">Do provável ao comprovado</h3></div><TestTube2 size={18} className="text-chart-4" /></div><div className="mt-5 space-y-4">{[{ name: 'H1 · Padronização da triagem', status: 'Em teste', pct: 68 }, { name: 'H2 · Regra de aprovação automática', status: 'Próximo', pct: 32 }, { name: 'H3 · Balanceamento da célula', status: 'Backlog', pct: 12 }].map((item) => <div key={item.name}><div className="flex justify-between gap-3 text-xs"><span className="font-semibold">{item.name}</span><span className="mono-label text-muted-foreground">{item.status}</span></div><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-chart-4" style={{ width: `${item.pct}%` }} /></div></div>)}</div></div><div className="panel rounded-xl bg-accent/10 p-5"><p className="mono-label text-accent-foreground">Próximo checkpoint</p><h3 className="mt-2 font-serif text-lg font-bold">Review de controle</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Quinta, 06 jun · 14:30<br />Validar plano de reação e dono do SOP.</p><Button testId="button-schedule-review" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} variant="dark" className="mt-5">Abrir agenda <ArrowRight size={14} /></Button></div></div>}
  </div>;
}

function DataUpload({ csvName, onUpload, inputRef }: { csvName: string | null; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; inputRef: { current: HTMLInputElement | null } }) {
  return <div className="reveal-4 panel rounded-xl border-dashed p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><IconBadge icon={CloudUpload} tone="accent" /><div><h3 className="text-sm font-bold">Dados locais para análise</h3><p className="mt-1 text-xs text-muted-foreground">{csvName ? `Arquivo processado: ${csvName}` : 'Carregue um CSV para recalcular Pareto e I-MR no navegador.'}</p></div></div><label data-testid="button-upload-csv" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold transition-colors hover:border-primary/45 hover:bg-primary/5"><Upload size={14} /> {csvName ? 'Trocar CSV' : 'Carregar CSV'}<input ref={inputRef} data-testid="input-upload-csv" type="file" accept=".csv,text/csv" onChange={onUpload} className="sr-only" /></label></div></div>;
}

function DetailDrawer({ tool, onClose, pareto, imr, csvError, onRetry, pipeline }: { tool: Tool; onClose: () => void; pareto: { name: string; value: number }[]; imr: number[]; csvError: string | null; onRetry: () => void; pipeline: DmaicPipeline | null }) {
  const [tab, setTab] = useState<'preview' | 'data'>('preview');
  const isPareto = tool.id === 'pareto';
  const isImr = tool.id === 'imr';
  const total = pareto.reduce((sum, item) => sum + item.value, 0);
  const cumulative = pareto.reduce<{ name: string; value: number; pct: number }[]>((result, item) => { const prior = result[result.length - 1]?.pct ?? 0; result.push({ ...item, pct: prior + (item.value / total) * 100 }); return result; }, []);
  const max = Math.max(...imr);
  const min = Math.min(...imr);
   return <div className="fixed inset-0 z-40 flex justify-end bg-sidebar/25 backdrop-blur-[2px]" onClick={onClose}><section role="dialog" aria-modal="true" data-testid="panel-tool-detail" onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-border bg-background shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-background/95 px-5 py-5 backdrop-blur"><div className="flex gap-3"><IconBadge icon={tool.icon} tone="primary" /><div><p className="mono-label text-primary">{pipeline ? 'Gerado com IA' : tool.tag ?? 'Entregável gerado'}</p><h2 className="mt-1 font-serif text-xl font-bold">{tool.title}</h2><p className="mt-1 text-xs text-muted-foreground">{tool.subtitle}</p></div></div><button data-testid="button-close-tool" aria-label="Fechar detalhe" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><div className="border-b border-border px-5 pt-4"><div className="flex gap-5"><button data-testid="tab-preview" onClick={() => setTab('preview')} className={`border-b-2 pb-3 text-xs font-bold ${tab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Visualização</button><button data-testid="tab-data" onClick={() => setTab('data')} className={`border-b-2 pb-3 text-xs font-bold ${tab === 'data' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Dados & notas</button></div></div><div className="flex-1 p-5">{csvError && (isPareto || isImr) ? <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"><div className="flex gap-3"><Info size={17} className="mt-0.5 shrink-0 text-destructive" /><div><p className="text-sm font-bold text-destructive">Não foi possível ler o arquivo</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{csvError}</p><Button testId="button-retry-upload" onClick={onRetry} variant="outline" className="mt-3"><RefreshCw size={13} /> Tentar com outro arquivo</Button></div></div></div> : tab === 'preview' ? <>{isPareto ? <ParetoChart data={pareto} cumulative={cumulative} /> : isImr ? <ImrChart data={imr} min={min} max={max} /> : <GenericPreview tool={tool} pipeline={pipeline} />}</> : <DataNotes tool={tool} pareto={pareto} imr={imr} />}</div><div className="border-t border-border bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><span className="mono-label text-muted-foreground">{pipeline ? 'Conteúdo gerado por Gemini' : 'Conteúdo de exemplo · local'}</span><Button testId="button-export-tool" variant="outline"><FileText size={14} /> Exportar visão</Button></div></div></section></div>;
}

function ParetoChart({ data, cumulative }: { data: { name: string; value: number }[]; cumulative: { name: string; value: number; pct: number }[] }) {
  const max = Math.max(...data.map((item) => item.value));
  return <div><div className="mb-5 flex items-start justify-between"><div><p className="mono-label text-accent-foreground">Exemplo gerado</p><h3 className="mt-2 font-serif text-lg font-bold">Onde a fila realmente pesa</h3><p className="mt-1 text-xs text-muted-foreground">Pareto · causas por ocorrência</p></div><FileBarChart size={20} className="text-accent-foreground" /></div><div className="rounded-xl border border-border bg-card p-4"><div className="space-y-3">{data.map((item, index) => <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_38px] items-center gap-3"><div><div className="mb-1 flex justify-between gap-2 text-[11px]"><span className="truncate font-semibold">{item.name}</span><span className="mono-label text-muted-foreground">{cumulative[index]?.pct.toFixed(0)}%</span></div><div className="h-5 overflow-hidden rounded-r-md bg-muted"><div className={`h-full rounded-r-md ${index === 0 ? 'bg-accent' : 'bg-primary/70'}`} style={{ width: `${(item.value / max) * 100}%` }} /></div></div><span className="text-right font-mono text-xs font-bold">{item.value}</span></div>)}</div><div className="mt-5 flex justify-between border-t border-border pt-3 mono-label text-muted-foreground"><span>Ocorrências</span><span>{data.reduce((sum, item) => sum + item.value, 0)} total</span></div></div></div>;
}

function ImrChart({ data, min, max }: { data: number[]; min: number; max: number }) {
  const width = 480;
  const height = 190;
  const points = data.map((value, index) => `${(index / (data.length - 1)) * width},${height - ((value - min + 2) / (max - min + 4)) * height}`).join(' ');
  return <div><div className="mb-5 flex items-start justify-between"><div><p className="mono-label text-chart-3">Exemplo gerado</p><h3 className="mt-2 font-serif text-lg font-bold">A variação está respirando?</h3><p className="mt-1 text-xs text-muted-foreground">I-MR · sequência de 24 medições</p></div><Activity size={20} className="text-chart-3" /></div><div className="rounded-xl border border-border bg-card p-3"><svg viewBox={`0 0 ${width} ${height + 25}`} className="h-auto w-full overflow-visible"><line x1="0" x2={width} y1={height * .42} y2={height * .42} stroke="hsl(var(--primary) / .35)" strokeDasharray="4 4" /><line x1="0" x2={width} y1={height * .72} y2={height * .72} stroke="hsl(var(--destructive) / .35)" strokeDasharray="4 4" /><polyline fill="none" stroke="hsl(var(--chart-3))" strokeWidth="2.5" points={points} />{data.map((value, index) => <circle key={index} cx={(index / (data.length - 1)) * width} cy={height - ((value - min + 2) / (max - min + 4)) * height} r="3.5" fill="hsl(var(--chart-3))" />)}</svg><div className="mt-2 flex justify-between mono-label text-muted-foreground"><span>LSC · 62,1</span><span>média · 51,4</span><span>LIC · 42,8</span></div></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-lg bg-muted p-3"><p className="mono-label text-muted-foreground">Média</p><p className="mt-1 font-mono text-sm font-bold">51,4</p></div><div className="rounded-lg bg-primary/8 p-3"><p className="mono-label text-primary">Sinais</p><p className="mt-1 font-mono text-sm font-bold text-primary">0</p></div><div className="rounded-lg bg-accent/12 p-3"><p className="mono-label text-accent-foreground">Amplitude média</p><p className="mt-1 font-mono text-sm font-bold">4,8</p></div></div></div>;
}

function GenericPreview({ tool, pipeline }: { tool: Tool; pipeline: DmaicPipeline | null }) {
  const first = (items: Record<string, string>[]) => Object.entries(items[0] ?? {}).map(([label, value]) => [label, value] as [string, string]);
  const generatedRows = pipeline ? tool.id === 'charter' ? Object.entries(pipeline.projectCharter) : tool.id === 'voc' ? Object.entries(pipeline.vocCtq[0] ?? {}) : tool.id === 'msa' ? first(pipeline.msaValidation) : tool.id === 'vitalx' ? first(pipeline.vitalXs) : tool.id === 'gut' ? first(pipeline.gutPrioritization) : tool.id === 'solutions' ? first(pipeline.actionPlan) : tool.id === 'control-plan' ? first(pipeline.controlPlan) : Object.entries(pipeline.indicatorsY) : null;
  const rows = generatedRows?.length ? generatedRows : tool.id === 'charter' ? [['Objetivo', 'Reduzir o lead time total'], ['Meta', 'De 18,4 para 11,0 min'], ['Dono do processo', 'Operações de crédito'], ['Prazo', '30 jun 2024']] : tool.id === 'voc' ? [['Cliente', 'Solicitante interno'], ['Necessidade', 'Resposta previsível'], ['CTQ', 'Tempo de aprovação'], ['Limite', '≤ 11 min']] : tool.id === 'msa' ? [['Método', 'Gage R&R simplificado'], ['Repetibilidade', '2,1%'], ['Reprodutibilidade', '3,4%'], ['Veredito', 'Sistema aceitável']] : [['Critério', 'Definição inicial'], ['Responsável', 'Time do projeto'], ['Evidência', 'Registro operacional'], ['Próxima revisão', '06 jun 2024']];
   return <div><div className="mb-5 flex items-start justify-between"><div><p className="mono-label text-primary">{pipeline ? 'Saída do pipeline' : 'Snapshot de trabalho'}</p><h3 className="mt-2 font-serif text-lg font-bold">{tool.title} / leitura rápida</h3><p className="mt-1 text-xs text-muted-foreground">{pipeline ? 'Artefato estruturado a partir do problema informado.' : 'Exemplo preenchido para orientar o time.'}</p></div><Check size={20} className="text-primary" /></div><div className="overflow-hidden rounded-xl border border-border">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[42%_58%] border-b border-border last:border-0"><div className="break-words bg-muted/55 p-3 text-[11px] font-bold text-muted-foreground">{label}</div><div className="break-words p-3 text-xs font-semibold">{value}</div></div>)}</div><div className="mt-5 rounded-xl bg-primary/7 p-4"><div className="flex gap-3"><Sparkles size={16} className="shrink-0 text-primary" /><p className="text-xs leading-relaxed"><strong>Leitura do facilitador:</strong> {pipeline ? 'revise e valide os artefatos com o time antes de tratar as hipóteses como evidência.' : 'a estrutura está suficientemente clara para a próxima conversa do time.'}</p></div></div></div>;
}

function DataNotes({ tool, pareto, imr }: { tool: Tool; pareto: { name: string; value: number }[]; imr: number[] }) {
  return <div><p className="mono-label text-primary">Notas do método</p><h3 className="mt-2 font-serif text-lg font-bold">Como ler este resultado</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Esta visualização usa dados de exemplo e cálculos executados localmente. Troque o arquivo no bloco de upload para explorar seu próprio processo sem enviar dados para um servidor.</p><div className="mt-5 space-y-3"><div className="rounded-xl border border-border p-4"><div className="flex gap-3"><Database size={16} className="mt-0.5 text-primary" /><div><p className="text-xs font-bold">Fonte</p><p className="mt-1 text-[11px] text-muted-foreground">{tool.id === 'pareto' ? `${pareto.length} categorias · ${pareto.reduce((sum, item) => sum + item.value, 0)} ocorrências` : `${imr.length} observações sequenciais · coluna numérica`}</p></div></div></div><div className="rounded-xl border border-border p-4"><div className="flex gap-3"><ClipboardCheck size={16} className="mt-0.5 text-chart-3" /><div><p className="text-xs font-bold">Próxima pergunta</p><p className="mt-1 text-[11px] text-muted-foreground">O padrão se mantém quando o time muda o turno ou o volume de entrada?</p></div></div></div></div></div>;
}

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
  const [charterSuggestedByAi, setCharterSuggestedByAi] = useState(false);
  const [pipelineData, setPipelineData] = useState<DmaicPipeline | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [vitalId, setVitalId] = useState('x1');
  const [csvName, setCsvName] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [pareto, setPareto] = useState(initialPareto);
  const [imr, setImr] = useState(initialImr);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const displayArea = area === 'overview' ? 'overview' : area;

  useEffect(() => {
    if (!workspaceQuery.data || workspaceHydrated) return;
    if (workspaceQuery.data.hasSavedData) {
      setStatement(workspaceQuery.data.problemStatement);
      setCharter(toProjectCharterDraft(workspaceQuery.data.projectCharterContext));
    }
    setWorkspaceHydrated(true);
  }, [workspaceHydrated, workspaceQuery.data]);

  const saveWorkspace = (source: 'statement' | 'charter') => {
    if (statement.trim().length < 10) {
      setWorkspaceError('Descreva o problema com pelo menos 10 caracteres antes de salvar no Neon.');
      return;
    }
    setWorkspaceError(null);
    workspaceMutation.mutate(
      { data: { problemStatement: statement.trim(), projectCharterContext: toProjectCharterContext(charter) } },
      {
        onSuccess: () => {
          if (source === 'statement') {
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2200);
          } else {
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
    pipelineMutation.mutate(
      {
        data: {
          problemStatement: statement.trim(),
          projectCharterContext: toProjectCharterContext(charter),
        },
      },
      {
        onSuccess: (data) => {
          setPipelineData(data);
          setCharter((current) => applyGeneratedCharterFields(current, data.generatedCharter));
          setCharterSuggestedByAi(true);
          setPipelineDone(true);
          setArea('overview');
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
           {area === 'overview' ? <Overview statement={statement} setStatement={setStatement} onSave={saveStatement} charter={charter} onCharterChange={updateCharter} onTeamChange={updateCharterTeam} onSaveCharter={saveCharter} pipelineDone={pipelineDone} hasAiSuggestions={charterSuggestedByAi} onOpenArea={setArea} /> : <SprintView area={area} onOpenTool={openTool} onChangeVital={setVitalId} vitalId={vitalId} csvName={csvName} onUpload={handleUpload} inputRef={fileRef} />}
            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[10px] text-muted-foreground"><span className="mono-label">DMAIC Ágil Suite · workspace no Neon</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {pipelineData ? 'artefatos gerados por IA · revise com o time' : 'dados de exemplo sinalizados · sem envio externo'}</span></footer>
        </div>
      </main>
    </div>
     {selectedTool && <DetailDrawer tool={selectedTool} onClose={() => setSelectedTool(null)} pareto={pareto} imr={imr} csvError={csvError} onRetry={retryUpload} pipeline={pipelineData} />}
  </div>;
}

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
