import { useState, type ChangeEvent, type RefObject } from 'react';
import type { DmaicCsvDataset, DmaicMeasurementWhatIfRecord } from '@workspace/api-client-react';
import { Activity, Clock3, CloudUpload, FileSearch, Loader2, Sparkles } from 'lucide-react';
import type { MeasurementAnalysis, MeasurementVariableSummary } from '@/lib/measurement-analysis';

type Props = {
  dataset: DmaicCsvDataset | null;
  analysis: MeasurementAnalysis | null;
  error: string | null;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onSave: () => void;
  activeProjectName: string;
  whatIfAnalyses: DmaicMeasurementWhatIfRecord[];
  onRunWhatIf: (question: string) => void;
  whatIfLoading: boolean;
  whatIfError: string | null;
  whatIfSaved: boolean;
};

const formatMetric = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const formatProbability = (value: number | null) => value === null ? '—' : value < 0.001 ? '< 0,001' : value.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const buttonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90';
const outlineButtonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-xs font-bold transition-colors hover:bg-muted';

function niceStepCeiling(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * power;
}

function niceStepFloor(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  const niceFraction = fraction >= 5 ? 5 : fraction >= 2 ? 2 : 1;
  return niceFraction * power;
}

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
  const left = 48;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const domainMinimum = variable.histogram[0]?.from ?? variable.minimum;
  const domainMaximum = variable.histogram.at(-1)?.to ?? variable.maximum;
  const domainSpan = domainMaximum - domainMinimum || 1;
  const binWidth = variable.histogram[0] ? variable.histogram[0].to - variable.histogram[0].from : domainSpan;
  const maxCount = Math.max(...variable.histogram.map((bin) => bin.count), 1);
  const bandwidthBase = Math.min(variable.standardDeviation, variable.iqr > 0 ? variable.iqr / 1.34 : variable.standardDeviation);
  const bandwidth = Math.max(domainSpan / 1_000, 0.9 * bandwidthBase * variable.values.length ** -0.2);
  const density = Array.from({ length: 81 }, (_, index) => {
    const value = domainMinimum + (index / 80) * domainSpan;
    const kernelSum = variable.values.reduce((sum, observation) => {
      const standardized = (value - observation) / bandwidth;
      return sum + Math.exp(-0.5 * standardized ** 2) / Math.sqrt(2 * Math.PI);
    }, 0);
    return { value, count: (kernelSum / bandwidth) * binWidth };
  });
  const maximumDensity = Math.max(...density.map((point) => point.count), 0);
  const yMaximum = Math.max(maxCount, maximumDensity, 1) * 1.06;
  const x = (value: number) => left + ((value - domainMinimum) / domainSpan) * (width - left - right);
  const y = (count: number) => top + ((yMaximum - count) / yMaximum) * (height - top - bottom);
  const xStep = niceStepCeiling((variable.maximum - variable.minimum) / 3);
  const xTicks: number[] = [];
  for (let tick = Math.ceil(variable.minimum / xStep) * xStep; tick <= variable.maximum + xStep * 1e-9; tick += xStep) xTicks.push(tick);
  const yStep = niceStepFloor(yMaximum / 4);
  const yTicks: number[] = [];
  for (let tick = 0; tick <= yMaximum + yStep * 1e-9; tick += yStep) yTicks.push(tick);
  return <svg data-testid={`chart-histogram-${variable.name}`} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`Histograma de ${variable.name}`}>
    {yTicks.map((tick) => <g key={`y-${tick}`}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="hsl(var(--border))" strokeDasharray={tick === 0 ? undefined : '4 5'} /><text x={left - 8} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{formatMetric(tick)}</text></g>)}
    <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="hsl(var(--border))" />
    <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="hsl(var(--border))" />
    {variable.histogram.map((bin, index) => <rect key={`${bin.from}-${index}`} x={x(bin.from)} y={y(bin.count)} width={Math.max(1, x(bin.to) - x(bin.from))} height={height - bottom - y(bin.count)} fill="hsl(var(--accent))" fillOpacity="0.55" stroke="hsl(var(--foreground))" strokeOpacity="0.55" strokeWidth="1.25" />)}
    <polyline data-testid={`chart-histogram-line-${variable.name}`} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={density.map((point) => `${x(point.value)},${y(point.count)}`).join(' ')} />
    {xTicks.map((tick) => <g key={`x-${tick}`}><line x1={x(tick)} x2={x(tick)} y1={height - bottom} y2={height - bottom + 5} stroke="hsl(var(--border))" /><text x={x(tick)} y={height - 15} textAnchor="middle" className="fill-muted-foreground text-[10px]">{formatMetric(tick)}</text></g>)}
  </svg>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-black">{value}</p></div>;
}

function AnovaMeanChart({ analysis }: { analysis: MeasurementAnalysis }) {
  const variables = [...analysis.variables].sort((left, right) => right.mean - left.mean).slice(0, 3);
  const width = 640;
  const height = 280;
  const left = 58;
  const right = 24;
  const top = 24;
  const bottom = 66;
  const minimum = Math.min(...variables.map((variable) => variable.mean - 1.96 * variable.standardDeviation / Math.sqrt(variable.count)));
  const maximum = Math.max(...variables.map((variable) => variable.mean + 1.96 * variable.standardDeviation / Math.sqrt(variable.count)));
  const span = maximum - minimum || 1;
  const y = (value: number) => top + ((maximum - value) / span) * (height - top - bottom);
  const x = (index: number) => left + ((index + 0.5) / variables.length) * (width - left - right);
  return <div className="rounded-xl border border-border bg-card p-3"><div className="mb-2 flex items-start justify-between gap-3"><div><p className="text-xs font-bold">Médias das 3 principais variáveis</p><p className="text-[11px] text-muted-foreground">Barras de erro: intervalo aproximado de confiança de 95%.</p></div><FileSearch size={16} className="text-primary" /></div><svg data-testid="chart-anova-top-three" viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Médias e intervalos de confiança das três principais variáveis da ANOVA">{[0, 0.5, 1].map((fraction) => { const value = maximum - fraction * span; return <g key={fraction}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="hsl(var(--border))" strokeDasharray="4 5" /><text x={left - 8} y={y(value) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{formatMetric(value)}</text></g>; })}<line x1={left} x2={left} y1={top} y2={height - bottom} stroke="hsl(var(--border))" />{variables.map((variable, index) => { const margin = 1.96 * variable.standardDeviation / Math.sqrt(variable.count); const center = x(index); return <g key={variable.name}><line x1={center} x2={center} y1={y(variable.mean - margin)} y2={y(variable.mean + margin)} stroke="hsl(var(--chart-3))" strokeWidth="3" /><line x1={center - 7} x2={center + 7} y1={y(variable.mean - margin)} y2={y(variable.mean - margin)} stroke="hsl(var(--chart-3))" strokeWidth="3" /><line x1={center - 7} x2={center + 7} y1={y(variable.mean + margin)} y2={y(variable.mean + margin)} stroke="hsl(var(--chart-3))" strokeWidth="3" /><circle cx={center} cy={y(variable.mean)} r="5" fill="hsl(var(--background))" stroke="hsl(var(--chart-3))" strokeWidth="3" /><text x={center} y={height - 38} textAnchor="middle" className="fill-foreground text-[10px]">{variable.name.length > 18 ? `${variable.name.slice(0, 16)}…` : variable.name}</text><text x={center} y={height - 20} textAnchor="middle" className="fill-muted-foreground text-[10px]">{formatMetric(variable.mean)}</text></g>; })}</svg></div>;
}

function ExecutiveReading({ analysis }: { analysis: MeasurementAnalysis }) {
  const topPriority = analysis.priorities[0];
  const variabilityMessage = topPriority
    ? `A variabilidade pede atenção primeiro em ${topPriority.name}.`
    : 'A variabilidade ainda não aponta uma unidade prioritária.';
  const meaning = analysis.anova.available
    ? analysis.anova.pValue !== null && analysis.anova.pValue < 0.05
      ? 'As unidades apresentam diferenças estatisticamente relevantes no indicador analisado.'
      : 'As diferenças observadas entre unidades não foram suficientes para concluir que os níveis são distintos.'
    : 'A comparação global ainda não tem evidência estatística suficiente para sustentar uma conclusão.';
  const decision = topPriority
    ? `Investigue ${topPriority.name} primeiro e confirme a causa com um teste antes de mudar o processo.`
    : 'Complete a coleta ou valide a medição antes de priorizar uma intervenção.';
  return <section data-testid="measurement-executive-reading" className="border-y border-chart-3/25 bg-chart-3/5 px-5 py-5 sm:px-6"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chart-3 text-white"><Activity size={17} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-chart-3">Leitura executiva</p><h3 className="mt-1 text-lg font-black">O que a Medição já permite decidir</h3></div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="border-l-2 border-chart-3/50 pl-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">O que foi observado</p><p className="mt-1 text-xs font-semibold leading-relaxed">{variabilityMessage}</p></div><div className="border-l-2 border-chart-3/50 pl-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">O que isso significa</p><p className="mt-1 text-xs font-semibold leading-relaxed">{meaning}</p></div><div className="border-l-2 border-chart-3/50 pl-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Qual decisão é recomendada</p><p className="mt-1 text-xs font-semibold leading-relaxed text-chart-3">{decision}</p></div></div></section>;
}

function WhatIfAnalysis({ history, loading, error, saved, onRun }: { history: DmaicMeasurementWhatIfRecord[]; loading: boolean; error: string | null; saved: boolean; onRun: (question: string) => void }) {
  const [question, setQuestion] = useState('');
  const canSubmit = question.trim().length >= 8 && !loading;
  return <section data-testid="panel-measurement-what-if" className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card">
    <div className="border-b border-border p-5 sm:p-6">
      <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Análise What If</p><h3 className="mt-1 text-lg font-black">Teste um cenário com as evidências da Medição</h3><p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">A Suíte recebe apenas médias, dispersões, testes, prioridades e a meta do Charter. As linhas do CSV não são enviadas e nenhuma meta ou prioridade é alterada automaticamente.</p></div></div>
      <label htmlFor="measurement-what-if-question" className="mt-5 block text-xs font-bold">Pergunta de cenário</label>
      <textarea id="measurement-what-if-question" data-testid="input-measurement-what-if" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={3000} rows={4} placeholder="Ex.: Se BH Centro, BH Pampulha e Betim aumentarem 10%, qual deve ser a meta de BH Belvedere e Contagem para a média global atingir a meta do Charter?" className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-muted-foreground">{question.length}/3000 · mínimo de 8 caracteres</span><button data-testid="button-run-measurement-what-if" type="button" disabled={!canSubmit} onClick={() => onRun(question)} className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-50`}>{loading ? <><Loader2 size={14} className="animate-spin" />Analisando cenário…</> : <><Sparkles size={14} />Realizar Análise</>}</button></div>
      {error && <div data-testid="status-measurement-what-if-error" className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs leading-relaxed text-destructive">{error} Sua pergunta foi mantida para nova tentativa.</div>}
      {saved && <p data-testid="status-measurement-what-if-saved" className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs font-bold text-primary">Pergunta e resposta salvas no projeto.</p>}
    </div>
    {history.length > 0 && <div className="space-y-4 p-5 sm:p-6"><div className="flex items-center gap-2"><Clock3 size={15} className="text-muted-foreground" /><h4 className="text-sm font-black">Histórico do projeto</h4><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{history.length}</span></div>{history.map((item, index) => <article key={item.id} data-testid={index === 0 ? 'measurement-what-if-latest' : undefined} className="rounded-xl border border-border bg-background/80 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black">{item.question}</p><time className="text-[10px] font-semibold text-muted-foreground" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('pt-BR')}</time></div><div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{item.answer}</div><p className="mt-4 border-t border-border pt-3 text-[10px] text-muted-foreground">Contexto registrado: {item.context.rowCount} observações pareadas, {item.context.variables.length} variáveis e meta “{item.context.projectGoal || 'não informada'}”.</p></article>)}</div>}
  </section>;
}

export function MeasurementAnalysisPanel({ dataset, analysis, error, onUpload, inputRef, onSave, activeProjectName, whatIfAnalyses, onRunWhatIf, whatIfLoading, whatIfError, whatIfSaved }: Props) {
  return <section data-testid="panel-measurement-analysis" className="reveal mt-8 space-y-5">
    <div className="overflow-hidden rounded-2xl border border-chart-3/25 bg-card shadow-[0_18px_55px_-38px_hsl(var(--chart-3)/0.55)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-gradient-to-r from-chart-3/10 via-transparent to-transparent p-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-chart-3">Análise estatística multivariada</p><h2 className="mt-1 text-xl font-black tracking-tight">CSV exclusivo da fase de Medição</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">A Suite transforma o CSV para o modelo equivalente ao Jamovi: <strong>Valor</strong> como medida numérica, <strong>Variável</strong> como agrupamento e a primeira coluna como eixo compartilhado das observações pareadas.</p></div>
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} data-testid="input-measurement-csv" className="hidden" type="file" accept=".csv,text/csv" onChange={onUpload} />
          <button data-testid="button-upload-measurement-csv" className={buttonClass} onClick={() => inputRef.current?.click()}><CloudUpload size={14} />{dataset ? 'Trocar CSV da Medição' : 'Carregar CSV da Medição'}</button>
          {dataset && <button data-testid="button-save-measurement-analysis" className={outlineButtonClass} onClick={onSave}>Salvar no Repositório</button>}
        </div>
      </div>
      {error && <div data-testid="error-measurement-csv" className="m-5 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs leading-relaxed text-destructive">{error}</div>}
      {!dataset && !error && <div className="m-5 rounded-xl border border-dashed border-chart-3/35 bg-chart-3/5 p-5 text-xs leading-relaxed"><p className="font-bold text-foreground">Falta o CSV exclusivo da Medição.</p><p className="mt-1 text-muted-foreground">Ele é necessário para comparar variáveis, estimar variabilidade e priorizar a investigação. Exemplo mínimo: uma coluna de período, uma coluna de Variável e uma coluna numérica Valor.</p><button type="button" onClick={() => inputRef.current?.click()} className={`${buttonClass} mt-4`}><CloudUpload size={14} /> Carregar arquivo de exemplo</button></div>}
      {dataset && analysis && <div className="space-y-7 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-chart-3/10 px-3 py-1 font-bold text-chart-3">{dataset.fileName}</span><span className="rounded-full bg-muted px-3 py-1">{dataset.rows.length} linhas pareadas</span><span className="rounded-full bg-muted px-3 py-1">{analysis.longRows.length} registros Valor</span><span className="rounded-full bg-muted px-3 py-1">Valor: {analysis.valueColumn}</span><span className="rounded-full bg-muted px-3 py-1">Agrupamento: {analysis.groupingColumn}</span><span className="rounded-full bg-muted px-3 py-1">Eixo: {analysis.xColumn}</span><span className="text-muted-foreground">Projeto: {activeProjectName}</span></div>
        <ExecutiveReading analysis={analysis} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Estatísticas descritivas e normalidade</p><h3 className="mt-1 text-base font-black">Valor agrupado por Variável</h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[820px] text-left text-xs"><thead className="bg-muted/70"><tr>{['Variável', 'n', 'Média de Valor', 'Mediana', 'Desvio-padrão', 'CV', 'Shapiro–Wilk', 'Conclusão'].map((label) => <th key={label} className="px-3 py-2.5 font-bold">{label}</th>)}</tr></thead><tbody>{analysis.variables.map((variable) => <tr key={variable.name} className="border-t border-border"><td className="px-3 py-2.5 font-bold">{variable.name}</td><td className="px-3 py-2.5 font-mono">{variable.count}</td><td className="px-3 py-2.5 font-mono">{formatMetric(variable.mean)}</td><td className="px-3 py-2.5 font-mono">{formatMetric(variable.median)}</td><td className="px-3 py-2.5 font-mono">{formatMetric(variable.standardDeviation)}</td><td className="px-3 py-2.5 font-mono">{variable.coefficientOfVariation === null ? '—' : `${variable.coefficientOfVariation.toFixed(1)}%`}</td><td className="px-3 py-2.5 font-mono">W {variable.shapiroW?.toFixed(3) ?? '—'} · p {formatProbability(variable.shapiroPValue)}</td><td className={`px-3 py-2.5 font-bold ${variable.normality === 'Não normal' ? 'text-destructive' : variable.normality === 'Normal' ? 'text-primary' : 'text-muted-foreground'}`}>{variable.normality === 'Normal' ? 'Normalidade não rejeitada' : variable.normality === 'Não normal' ? 'Distribuição não normal' : 'Teste indisponível'}</td></tr>)}</tbody></table></div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Shapiro–Wilk com α = 5%. “Normalidade não rejeitada” não comprova normalidade; indica apenas que o teste não encontrou evidência suficiente contra ela. Em amostras pequenas, o poder do teste é limitado.</p>
        </div>
        <div className="space-y-5">{analysis.variables.map((variable) => <article key={variable.name} className="rounded-2xl border border-border bg-background/70 p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-chart-3">Variável do agrupamento</p><h3 className="mt-1 text-lg font-black">{variable.name}</h3><p className="mt-1 text-xs font-semibold text-chart-3">{variable.variabilityComment}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${variable.normality === 'Não normal' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{variable.normality}</span></div><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-border bg-card p-3"><p className="mb-1 text-xs font-bold">Valor por {analysis.xColumn}</p><p className="mb-2 text-[11px] text-muted-foreground">{variable.sequenceComment}</p><SequenceChart variable={variable} labels={analysis.xValues} /></div><div className="rounded-xl border border-border bg-card p-3"><p className="mb-1 text-xs font-bold">Histograma de Valor por {analysis.groupingColumn}</p><p className="mb-2 text-[11px] text-muted-foreground">A forma da distribuição orienta o teste, mas não comprova causalidade.</p><Histogram variable={variable} /></div></div></article>)}</div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Comparação global</p><h3 className="mt-1 text-base font-black">ANOVA de medidas repetidas com correção Greenhouse–Geisser</h3>{analysis.anova.available ? <><div className="mt-4 grid gap-3 sm:grid-cols-4"><Stat label="F" value={analysis.anova.fStatistic?.toFixed(3) ?? '—'} /><Stat label="gl numerador" value={analysis.anova.numeratorDf?.toFixed(2) ?? '—'} /><Stat label="gl denominador" value={analysis.anova.denominatorDf?.toFixed(2) ?? '—'} /><Stat label="p-valor" value={formatProbability(analysis.anova.pValue)} /></div><p className="mt-4 text-sm font-semibold leading-relaxed">{analysis.anova.conclusion}</p><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">O modelo respeita o pareamento por linha/{analysis.xColumn}. A correção Greenhouse–Geisser (ε = {analysis.anova.epsilon?.toFixed(3)}) reduz a dependência da hipótese de esfericidade e é preferível à ANOVA independente com variâncias iguais para este desenho.</p><div className="mt-5"><AnovaMeanChart analysis={analysis} /><button type="button" data-testid="button-anova-ai-analysis" onClick={() => onRunWhatIf('Analise o gráfico da ANOVA das três principais variáveis do Pareto. Comente se há algum comportamento especial que chame a atenção, como separação ou sobreposição dos intervalos de confiança, variabilidade incomum, possíveis outliers, tendência ou diferença relevante entre as três médias. Diferencie o que os dados mostram do que ainda precisa ser investigado.')} className={`${outlineButtonClass} mt-3`} disabled={whatIfLoading}><FileSearch size={14} /> Pedir análise da IA sobre o gráfico</button></div></> : <p className="mt-3 text-xs text-muted-foreground">{analysis.anova.conclusion}</p>}</div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Comparações par a par</p><h3 className="mt-1 text-base font-black">Teste t pareado com correção de Holm</h3><div className="mt-3 max-h-[440px] overflow-auto rounded-xl border border-border"><table className="w-full min-w-[840px] text-left text-xs"><thead className="sticky top-0 bg-muted"><tr>{['Par', 'Diferença média', 't', 'gl', 'p bruto', 'p ajustado', 'Conclusão'].map((label) => <th key={label} className="px-3 py-2.5 font-bold">{label}</th>)}</tr></thead><tbody>{analysis.pairwise.map((comparison) => <tr key={`${comparison.left}-${comparison.right}`} className="border-t border-border"><td className="px-3 py-2.5 font-bold">{comparison.left} × {comparison.right}</td><td className="px-3 py-2.5 font-mono">{formatMetric(comparison.meanDifference)}</td><td className="px-3 py-2.5 font-mono">{comparison.tStatistic === null ? '—' : Number.isFinite(comparison.tStatistic) ? comparison.tStatistic.toFixed(3) : '∞'}</td><td className="px-3 py-2.5 font-mono">{comparison.degreesOfFreedom}</td><td className="px-3 py-2.5 font-mono">{formatProbability(comparison.rawPValue)}</td><td className="px-3 py-2.5 font-mono">{formatProbability(comparison.adjustedPValue)}</td><td className={`px-3 py-2.5 ${comparison.significant ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{comparison.conclusion}</td></tr>)}</tbody></table></div></div>
        <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-foreground">Conclusão e priorização</p><h3 className="mt-1 text-base font-black">Variáveis que merecem investigação primeiro</h3><ol className="mt-4 space-y-3">{analysis.priorities.map((priority, index) => <li key={priority.name} className="flex gap-3 rounded-xl border border-border bg-card p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-black text-accent-foreground">{index + 1}</span><div><p className="text-sm font-black">{priority.name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{priority.explanation}</p></div></li>)}</ol><p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">O ranking combina diferenças de média após correção de múltiplas comparações, variabilidade relativa, normalidade, possíveis outliers e comportamento temporal. Ele direciona a investigação; não identifica causa raiz sozinho.</p></div>
        {analysis.priorities.length > 0 && <WhatIfAnalysis history={whatIfAnalyses} loading={whatIfLoading} error={whatIfError} saved={whatIfSaved} onRun={onRunWhatIf} />}
      </div>}
    </div>
  </section>;
}