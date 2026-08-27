import type { ChangeEvent, RefObject } from 'react';
import type { DmaicCsvDataset } from '@workspace/api-client-react';
import { CloudUpload } from 'lucide-react';
import type { MeasurementAnalysis, MeasurementVariableSummary } from '@/lib/measurement-analysis';

type Props = {
  dataset: DmaicCsvDataset | null;
  analysis: MeasurementAnalysis | null;
  error: string | null;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onSave: () => void;
  activeProjectName: string;
};

const formatMetric = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const formatProbability = (value: number | null) => value === null ? '—' : value < 0.001 ? '< 0,001' : value.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const buttonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90';
const outlineButtonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-xs font-bold transition-colors hover:bg-muted';

function SequenceChart({ variable, labels }: { variable: MeasurementVariableSummary; labels: string[] }) {
  const width = 640;
  const height = 220;
  const left = 48;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const minimum = Math.min(...variable.values);
  const maximum = Math.max(...variable.values);
  const span = maximum - minimum || 1;
  const x = (index: number) => left + (index / Math.max(variable.values.length - 1, 1)) * (width - left - right);
  const y = (value: number) => top + ((maximum - value) / span) * (height - top - bottom);
  const labelStep = Math.max(1, Math.ceil(labels.length / 6));
  return <svg data-testid={`chart-sequence-${variable.name}`} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`Gráfico sequencial de ${variable.name}`}>
    {[0, 0.5, 1].map((fraction) => {
      const gridY = top + fraction * (height - top - bottom);
      const value = maximum - fraction * span;
      return <g key={fraction}><line x1={left} x2={width - right} y1={gridY} y2={gridY} stroke="hsl(var(--border))" strokeDasharray="4 5" /><text x={left - 8} y={gridY + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{formatMetric(value)}</text></g>;
    })}
    <polyline fill="none" stroke="hsl(var(--chart-3))" strokeWidth="2.5" points={variable.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')} />
    {variable.values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r="3" fill="hsl(var(--background))" stroke="hsl(var(--chart-3))" strokeWidth="2" />)}
    {labels.map((label, index) => index % labelStep === 0 || index === labels.length - 1 ? <text key={`${label}-${index}`} x={x(index)} y={height - 15} textAnchor="middle" className="fill-muted-foreground text-[9px]">{label.length > 12 ? `${label.slice(0, 10)}…` : label}</text> : null)}
  </svg>;
}

function Histogram({ variable }: { variable: MeasurementVariableSummary }) {
  const width = 640;
  const height = 220;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const maxCount = Math.max(...variable.histogram.map((bin) => bin.count), 1);
  const barWidth = (width - left - right) / variable.histogram.length;
  return <svg data-testid={`chart-histogram-${variable.name}`} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`Histograma de ${variable.name}`}>
    <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="hsl(var(--border))" />
    <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="hsl(var(--border))" />
    {variable.histogram.map((bin, index) => {
      const barHeight = (bin.count / maxCount) * (height - top - bottom);
      return <g key={`${bin.from}-${index}`}><rect x={left + index * barWidth + 1} y={height - bottom - barHeight} width={Math.max(1, barWidth - 2)} height={barHeight} fill="hsl(var(--accent))" opacity="0.82" />{(index === 0 || index === variable.histogram.length - 1) && <text x={left + index * barWidth + barWidth / 2} y={height - 15} textAnchor="middle" className="fill-muted-foreground text-[9px]">{formatMetric(index === 0 ? bin.from : bin.to)}</text>}</g>;
    })}
    <text x={left - 8} y={top + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{maxCount}</text>
    <text x={left - 8} y={height - bottom + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">0</text>
  </svg>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-black">{value}</p></div>;
}

export function MeasurementAnalysisPanel({ dataset, analysis, error, onUpload, inputRef, onSave, activeProjectName }: Props) {
  return <section data-testid="panel-measurement-analysis" className="reveal mt-8 space-y-5">
    <div className="overflow-hidden rounded-2xl border border-chart-3/25 bg-card shadow-[0_18px_55px_-38px_hsl(var(--chart-3)/0.55)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-gradient-to-r from-chart-3/10 via-transparent to-transparent p-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-chart-3">Análise estatística multivariada</p><h2 className="mt-1 text-xl font-black tracking-tight">CSV exclusivo da fase de Medição</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">A primeira coluna é o eixo X compartilhado (por exemplo, mês). Todas as demais colunas são variáveis numéricas pareadas por linha, como unidades fabris.</p></div>
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} data-testid="input-measurement-csv" className="hidden" type="file" accept=".csv,text/csv" onChange={onUpload} />
          <button data-testid="button-upload-measurement-csv" className={buttonClass} onClick={() => inputRef.current?.click()}><CloudUpload size={14} />{dataset ? 'Trocar CSV da Medição' : 'Carregar CSV da Medição'}</button>
          {dataset && <button data-testid="button-save-measurement-analysis" className={outlineButtonClass} onClick={onSave}>Salvar no Neon</button>}
        </div>
      </div>
      {error && <div data-testid="error-measurement-csv" className="m-5 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs leading-relaxed text-destructive">{error}</div>}
      {!dataset && !error && <div className="p-6 text-sm text-muted-foreground">Carregue um arquivo diferente do CSV usado na Definição. Os dados são processados no navegador; o arquivo bruto não é enviado ao Gemini.</div>}
      {dataset && analysis && <div className="space-y-7 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-chart-3/10 px-3 py-1 font-bold text-chart-3">{dataset.fileName}</span><span className="rounded-full bg-muted px-3 py-1">{dataset.rows.length} linhas pareadas</span><span className="rounded-full bg-muted px-3 py-1">{dataset.indicatorColumns.length} variáveis</span><span className="rounded-full bg-muted px-3 py-1">X: {analysis.xColumn}</span><span className="text-muted-foreground">Projeto: {activeProjectName}</span></div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Estatísticas descritivas e normalidade</p><h3 className="mt-1 text-base font-black">Visão comparativa das variáveis</h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[820px] text-left text-xs"><thead className="bg-muted/70"><tr>{['Variável', 'n', 'Média', 'Mediana', 'Desvio-padrão', 'CV', 'Shapiro–Wilk', 'Conclusão'].map((label) => <th key={label} className="px-3 py-2.5 font-bold">{label}</th>)}</tr></thead><tbody>{analysis.variables.map((variable) => <tr key={variable.name} className="border-t border-border"><td className="px-3 py-2.5 font-bold">{variable.name}</td><td className="px-3 py-2.5 font-mono">{variable.count}</td><td className="px-3 py-2.5 font-mono">{formatMetric(variable.mean)}</td><td className="px-3 py-2.5 font-mono">{formatMetric(variable.median)}</td><td className="px-3 py-2.5 font-mono">{formatMetric(variable.standardDeviation)}</td><td className="px-3 py-2.5 font-mono">{variable.coefficientOfVariation === null ? '—' : `${variable.coefficientOfVariation.toFixed(1)}%`}</td><td className="px-3 py-2.5 font-mono">W {variable.shapiroW?.toFixed(3) ?? '—'} · p {formatProbability(variable.shapiroPValue)}</td><td className={`px-3 py-2.5 font-bold ${variable.normality === 'Não normal' ? 'text-destructive' : variable.normality === 'Normal' ? 'text-primary' : 'text-muted-foreground'}`}>{variable.normality === 'Normal' ? 'Normalidade não rejeitada' : variable.normality === 'Não normal' ? 'Distribuição não normal' : 'Teste indisponível'}</td></tr>)}</tbody></table></div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Shapiro–Wilk com α = 5%. “Normalidade não rejeitada” não comprova normalidade; indica apenas que o teste não encontrou evidência suficiente contra ela. Em amostras pequenas, o poder do teste é limitado.</p>
        </div>
        <div className="space-y-5">{analysis.variables.map((variable) => <article key={variable.name} className="rounded-2xl border border-border bg-background/70 p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-chart-3">Variável analisada</p><h3 className="mt-1 text-lg font-black">{variable.name}</h3></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${variable.normality === 'Não normal' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{variable.normality}</span></div><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-border bg-card p-3"><p className="mb-2 text-xs font-bold">Gráfico sequencial por {analysis.xColumn}</p><SequenceChart variable={variable} labels={analysis.xValues} /></div><div className="rounded-xl border border-border bg-card p-3"><p className="mb-2 text-xs font-bold">Histograma</p><Histogram variable={variable} /></div></div><div className="mt-4 grid gap-3 lg:grid-cols-2"><p className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed"><strong>Variabilidade.</strong> {variable.variabilityComment}</p><p className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed"><strong>Padrão sequencial.</strong> {variable.sequenceComment}</p></div></article>)}</div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Comparação global</p><h3 className="mt-1 text-base font-black">ANOVA de medidas repetidas com correção Greenhouse–Geisser</h3>{analysis.anova.available ? <><div className="mt-4 grid gap-3 sm:grid-cols-4"><Stat label="F" value={analysis.anova.fStatistic?.toFixed(3) ?? '—'} /><Stat label="gl numerador" value={analysis.anova.numeratorDf?.toFixed(2) ?? '—'} /><Stat label="gl denominador" value={analysis.anova.denominatorDf?.toFixed(2) ?? '—'} /><Stat label="p-valor" value={formatProbability(analysis.anova.pValue)} /></div><p className="mt-4 text-sm font-semibold leading-relaxed">{analysis.anova.conclusion}</p><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">O modelo respeita o pareamento por linha/{analysis.xColumn}. A correção Greenhouse–Geisser (ε = {analysis.anova.epsilon?.toFixed(3)}) reduz a dependência da hipótese de esfericidade e é preferível à ANOVA independente com variâncias iguais para este desenho.</p></> : <p className="mt-3 text-xs text-muted-foreground">{analysis.anova.conclusion}</p>}</div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Comparações par a par</p><h3 className="mt-1 text-base font-black">Teste t pareado com correção de Holm</h3><div className="mt-3 max-h-[440px] overflow-auto rounded-xl border border-border"><table className="w-full min-w-[840px] text-left text-xs"><thead className="sticky top-0 bg-muted"><tr>{['Par', 'Diferença média', 't', 'gl', 'p bruto', 'p ajustado', 'Conclusão'].map((label) => <th key={label} className="px-3 py-2.5 font-bold">{label}</th>)}</tr></thead><tbody>{analysis.pairwise.map((comparison) => <tr key={`${comparison.left}-${comparison.right}`} className="border-t border-border"><td className="px-3 py-2.5 font-bold">{comparison.left} × {comparison.right}</td><td className="px-3 py-2.5 font-mono">{formatMetric(comparison.meanDifference)}</td><td className="px-3 py-2.5 font-mono">{comparison.tStatistic === null ? '—' : Number.isFinite(comparison.tStatistic) ? comparison.tStatistic.toFixed(3) : '∞'}</td><td className="px-3 py-2.5 font-mono">{comparison.degreesOfFreedom}</td><td className="px-3 py-2.5 font-mono">{formatProbability(comparison.rawPValue)}</td><td className="px-3 py-2.5 font-mono">{formatProbability(comparison.adjustedPValue)}</td><td className={`px-3 py-2.5 ${comparison.significant ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{comparison.conclusion}</td></tr>)}</tbody></table></div></div>
        <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-foreground">Conclusão e priorização</p><h3 className="mt-1 text-base font-black">Variáveis que merecem investigação primeiro</h3><ol className="mt-4 space-y-3">{analysis.priorities.map((priority, index) => <li key={priority.name} className="flex gap-3 rounded-xl border border-border bg-card p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-black text-accent-foreground">{index + 1}</span><div><p className="text-sm font-black">{priority.name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{priority.explanation}</p></div></li>)}</ol><p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">O ranking combina diferenças de média após correção de múltiplas comparações, variabilidade relativa, normalidade, possíveis outliers e comportamento temporal. Ele direciona a investigação; não identifica causa raiz sozinho.</p></div>
      </div>}
    </div>
  </section>;
}