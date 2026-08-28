import type { DmaicAnalysisArtifactsIshikawa } from '@workspace/api-client-react';
import { Plus, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';

const CATEGORIES = ['Método', 'Máquina', 'Material', 'Mão de Obra', 'Medição', 'Meio Ambiente'] as const;

type Props = {
  sourceText: string;
  value: DmaicAnalysisArtifactsIshikawa;
  dirty: boolean;
  saved: boolean;
  generating: boolean;
  error: string | null;
  onSourceTextChange: (value: string) => void;
  onGenerate: () => void;
  onChange: (value: Record<string, string[]>) => void;
  onSave: () => void;
};

export function IshikawaDiagramEditor({ sourceText, value, dirty, saved, generating, error, onSourceTextChange, onGenerate, onChange, onSave }: Props) {
  const matrix = value ?? Object.fromEntries(CATEGORIES.map((category) => [category, []]));
  const updateCategory = (category: string, causes: string[]) => onChange({ ...matrix, [category]: causes });

  return <div data-testid="panel-ishikawa-editor" className="space-y-5">
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div><p className="mono-label text-primary">Contexto fornecido pela equipe</p><h3 className="mt-1 font-serif text-lg font-bold">Descreva o efeito e as possíveis causas</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Escreva livremente o problema observado, sintomas, condições, evidências e hipóteses. A IA organizará a versão inicial nos 6Ms; depois, a equipe poderá revisar tudo.</p></div>
      <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_230px]">
        <textarea data-testid="input-ishikawa-source-text" value={sourceText} onChange={(event) => onSourceTextChange(event.target.value)} rows={7} maxLength={12000} placeholder="Ex.: O efeito observado é o aumento do tempo de atendimento. Há relatos de sistema lento, documentos incompletos, procedimentos diferentes entre operadores e falta de medição do tempo por etapa..." className="min-h-[164px] w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-xs leading-relaxed outline-none transition-colors focus:border-primary/60" />
        <button data-testid="button-generate-ishikawa" type="button" onClick={onGenerate} disabled={generating || sourceText.trim().length < 10} className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
          {generating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? 'Gerando diagrama...' : 'Gerar Diagrama de Causa e Efeito'}
        </button>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>O texto é salvo com o projeto e enviado ao Gemini somente ao gerar.</span><span>{sourceText.length}/12000</span></div>
      {error && <p data-testid="status-ishikawa-error" className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</p>}
    </section>

    {value ? <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="mono-label text-accent-foreground">Diagrama de causa e efeito · 6M</p><h3 className="mt-1 font-serif text-lg font-bold">Espinha de peixe para discussão com o time</h3><p className="mt-1 text-xs text-muted-foreground">A leitura visual segue o padrão clássico; os campos editáveis ficam logo abaixo de cada ramo.</p></div><button data-testid="button-save-ishikawa" type="button" onClick={onSave} disabled={!dirty} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:border-primary disabled:opacity-50"><Save size={14} /> {saved ? 'Salvo no Neon' : 'Salvar matriz'}</button></div>
      <FishboneDiagram matrix={matrix} effect={sourceText} />
      <div className="mt-5 border-t border-border pt-5"><p className="mono-label text-muted-foreground">Edição das causas</p><div className="mt-3 grid gap-4 lg:grid-cols-2">{CATEGORIES.map((category, categoryIndex) => <CategoryCard key={category} category={category} causes={matrix[category] ?? []} side={categoryIndex % 2 === 0 ? 'left' : 'right'} onChange={(causes) => updateCategory(category, causes)} />)}</div></div>
    </section> : <div className="rounded-xl border border-dashed border-border p-6 text-center"><Sparkles size={22} className="mx-auto text-primary" /><p className="mt-3 text-sm font-bold">A matriz ainda não foi gerada</p><p className="mt-1 text-xs text-muted-foreground">Preencha o texto acima e use o botão para criar a primeira versão.</p></div>}
  </div>;
}

function FishboneDiagram({ matrix, effect }: { matrix: Record<string, string[]>; effect: string }) {
  const width = 1120;
  const height = 540;
  const spineY = 270;
  const branches = [
    { category: CATEGORIES[0], branchX: 225, endX: 115, endY: 90, labelX: 35, labelY: 34, side: 'top' as const },
    { category: CATEGORIES[1], branchX: 465, endX: 355, endY: 90, labelX: 275, labelY: 34, side: 'top' as const },
    { category: CATEGORIES[2], branchX: 705, endX: 595, endY: 90, labelX: 515, labelY: 34, side: 'top' as const },
    { category: CATEGORIES[3], branchX: 225, endX: 115, endY: 450, labelX: 35, labelY: 500, side: 'bottom' as const },
    { category: CATEGORIES[4], branchX: 465, endX: 355, endY: 450, labelX: 275, labelY: 500, side: 'bottom' as const },
    { category: CATEGORIES[5], branchX: 705, endX: 595, endY: 450, labelX: 515, labelY: 500, side: 'bottom' as const },
  ];
  let causeNumber = 0;
  const effectLines = wrapSvgText(effect || 'Efeito a definir pela equipe', 24);
  return <div data-testid="ishikawa-fishbone" className="overflow-x-auto rounded-xl border border-border bg-background p-2 sm:p-4">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Diagrama Ishikawa de causa e efeito" className="min-w-[760px] w-full">
      <line x1="48" y1={spineY} x2="900" y2={spineY} stroke="hsl(var(--foreground) / .72)" strokeWidth="3" />
      <path d={`M 900 ${spineY} l -16 -8 M 900 ${spineY} l -16 8`} fill="none" stroke="hsl(var(--foreground) / .72)" strokeWidth="3" />
      {branches.map((branch) => {
        const causes = matrix[branch.category] ?? [];
        const displayCauses = causes.length ? causes : ['Causa a investigar'];
        const causeStartY = branch.side === 'top' ? 86 : 380;
        const lineGap = branch.side === 'top' ? 22 : 22;
        const currentStart = causeNumber + 1;
        causeNumber += causes.length;
        return <g key={branch.category}>
          <line x1={branch.branchX} y1={spineY} x2={branch.endX} y2={branch.endY} stroke="hsl(var(--foreground) / .62)" strokeWidth="2" />
          <rect x={branch.labelX} y={branch.labelY} width="178" height="32" fill="hsl(var(--background))" stroke="hsl(var(--foreground) / .45)" />
          <text x={branch.labelX + 89} y={branch.labelY + 21} textAnchor="middle" fontSize="14" fontWeight="700" fontStyle="italic" fill="hsl(var(--foreground))">{branch.category}</text>
          {displayCauses.slice(0, 6).map((cause, index) => <text key={`${branch.category}-${index}`} x={branch.endX + 10} y={causeStartY + index * lineGap} fontSize="12" fill={causes.length ? 'hsl(var(--foreground) / .88)' : 'hsl(var(--muted-foreground))'}>{causes.length ? `${currentStart + index}. ${truncateSvgText(cause, 27)}` : '— ' + cause}</text>)}
        </g>;
      })}
      <rect x="902" y="190" width="196" height="160" rx="2" fill="hsl(var(--chart-3) / .28)" stroke="hsl(var(--chart-3) / .65)" />
      <text x="918" y="218" fontSize="12" fontWeight="800" fill="hsl(var(--foreground))">EFEITO =</text>
      {effectLines.slice(0, 7).map((line, index) => <text key={line + index} x="918" y={244 + index * 17} fontSize="12" fill="hsl(var(--foreground) / .92)">{line}</text>)}
    </svg>
    <p className="mt-1 px-2 text-[10px] text-muted-foreground">As causas exibidas no desenho são um resumo visual. Edite o conteúdo nos campos correspondentes abaixo.</p>
  </div>;
}

function truncateSvgText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function wrapSvgText(value: string, maxCharactersPerLine: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharactersPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['Efeito a definir pela equipe'];
}

function CategoryCard({ category, causes, side, onChange }: { category: string; causes: string[]; side: 'left' | 'right'; onChange: (causes: string[]) => void }) {
  const updateCause = (index: number, cause: string) => onChange(causes.map((item, itemIndex) => itemIndex === index ? cause : item));
  return <div className={`relative rounded-xl border border-border bg-background p-4 ${side === 'left' ? 'lg:mr-3' : 'lg:ml-3'}`}>
    <div className="flex items-center justify-between"><h4 className="text-sm font-bold">{category}</h4><button type="button" onClick={() => onChange([...causes, ''])} disabled={causes.length >= 8} className="inline-flex items-center gap-1 text-[11px] font-bold text-primary disabled:opacity-40"><Plus size={13} /> Causa</button></div>
    <div className="mt-3 space-y-2">{causes.map((cause, index) => <div key={`${category}-${index}`} className="flex items-start gap-2"><textarea value={cause} onChange={(event) => updateCause(index, event.target.value)} rows={2} maxLength={500} className="min-h-[52px] flex-1 resize-y rounded-lg border border-border bg-card px-3 py-2 text-[11px] leading-relaxed outline-none focus:border-primary/60" /><button aria-label={`Excluir causa ${index + 1} de ${category}`} type="button" onClick={() => onChange(causes.filter((_, itemIndex) => itemIndex !== index))} className="mt-1 rounded p-1.5 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"><Trash2 size={13} /></button></div>)}</div>
    {causes.length === 0 && <button type="button" onClick={() => onChange([''])} className="mt-3 w-full rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground hover:border-primary hover:text-primary">Adicionar causa em {category}</button>}
  </div>;
}