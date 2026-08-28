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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="mono-label text-accent-foreground">Matriz Ishikawa · 6M</p><h3 className="mt-1 font-serif text-lg font-bold">Causas organizadas pela IA e revisáveis pela equipe</h3></div><button data-testid="button-save-ishikawa" type="button" onClick={onSave} disabled={!dirty} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:border-primary disabled:opacity-50"><Save size={14} /> {saved ? 'Salvo no Neon' : 'Salvar matriz'}</button></div>
      <div className="relative grid gap-4 lg:grid-cols-2">
        <div className="pointer-events-none absolute left-1/2 top-4 hidden h-[calc(100%-2rem)] w-px bg-primary/25 lg:block" />
        {CATEGORIES.map((category, categoryIndex) => <CategoryCard key={category} category={category} causes={matrix[category] ?? []} side={categoryIndex % 2 === 0 ? 'left' : 'right'} onChange={(causes) => updateCategory(category, causes)} />)}
      </div>
      <div className="relative mt-5 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-center"><div className="absolute left-0 top-1/2 hidden h-px w-full -translate-y-1/2 bg-primary/20 lg:block" /><span className="relative bg-card px-3 text-xs font-bold text-primary">EFEITO ANALISADO</span><p className="relative mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{sourceText}</p></div>
    </section> : <div className="rounded-xl border border-dashed border-border p-6 text-center"><Sparkles size={22} className="mx-auto text-primary" /><p className="mt-3 text-sm font-bold">A matriz ainda não foi gerada</p><p className="mt-1 text-xs text-muted-foreground">Preencha o texto acima e use o botão para criar a primeira versão.</p></div>}
  </div>;
}

function CategoryCard({ category, causes, side, onChange }: { category: string; causes: string[]; side: 'left' | 'right'; onChange: (causes: string[]) => void }) {
  const updateCause = (index: number, cause: string) => onChange(causes.map((item, itemIndex) => itemIndex === index ? cause : item));
  return <div className={`relative rounded-xl border border-border bg-background p-4 ${side === 'left' ? 'lg:mr-3' : 'lg:ml-3'}`}>
    <div className="flex items-center justify-between"><h4 className="text-sm font-bold">{category}</h4><button type="button" onClick={() => onChange([...causes, ''])} disabled={causes.length >= 8} className="inline-flex items-center gap-1 text-[11px] font-bold text-primary disabled:opacity-40"><Plus size={13} /> Causa</button></div>
    <div className="mt-3 space-y-2">{causes.map((cause, index) => <div key={`${category}-${index}`} className="flex items-start gap-2"><textarea value={cause} onChange={(event) => updateCause(index, event.target.value)} rows={2} maxLength={500} className="min-h-[52px] flex-1 resize-y rounded-lg border border-border bg-card px-3 py-2 text-[11px] leading-relaxed outline-none focus:border-primary/60" /><button aria-label={`Excluir causa ${index + 1} de ${category}`} type="button" onClick={() => onChange(causes.filter((_, itemIndex) => itemIndex !== index))} className="mt-1 rounded p-1.5 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"><Trash2 size={13} /></button></div>)}</div>
    {causes.length === 0 && <button type="button" onClick={() => onChange([''])} className="mt-3 w-full rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground hover:border-primary hover:text-primary">Adicionar causa em {category}</button>}
  </div>;
}