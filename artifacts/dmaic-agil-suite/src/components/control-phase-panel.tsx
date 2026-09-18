import { Children, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Activity, Check, CloudUpload, FileText, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';

export type ControlDataset = {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  dateColumn: string | null;
  indicatorColumns: string[];
};

export type ControlStatistic = {
  indicator: string;
  count: number;
  omitted: number;
  mean: number;
  standardDeviation: number;
  minimum: number;
  maximum: number;
  movingRangeMean: number;
  upperControlLimit: number;
  lowerControlLimit: number;
  latestValue: number;
  baseline: number;
  target: number;
  improvementPp: number;
  values: number[];
};

export type ControlEvaluation = {
  success: boolean;
  summary: string;
  baseline: number;
  postControlMean: number;
  improvementPp: number;
  financialGainReal: string;
  financialCalculation: string;
  sustainabilityPlan: Array<{ title: string; owner: string; cadence: string; controls: string[] }>;
};

export type ControlPhase = {
  dataset: ControlDataset | null;
  months: number;
  selectedIndicators: string[];
  statistics: ControlStatistic[];
  evaluation: ControlEvaluation | null;
};

const emptyPhase: ControlPhase = { dataset: null, months: 12, selectedIndicators: [], statistics: [], evaluation: null };

function numberValue(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(/%$/, '');
  if (!normalized) return null;
  const parsed = normalized.includes(',') ? Number(normalized.replace(/\./g, '').replace(',', '.')) : Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatValue(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Math.round(value * 100) / 100);
}

function escapePdfHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildControlChartSvg(statistic: ControlStatistic): string {
  const width = 900;
  const height = 260;
  const padding = { top: 24, right: 92, bottom: 34, left: 42 };
  const values = [...statistic.values, statistic.upperControlLimit, statistic.lowerControlLimit];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 1);
  const x = (index: number) => padding.left + (index / Math.max(statistic.values.length - 1, 1)) * (width - padding.left - padding.right);
  const y = (value: number) => padding.top + (1 - (value - minimum) / range) * (height - padding.top - padding.bottom);
  const points = statistic.values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const line = (value: number, color: string, label: string) => `<line x1="${padding.left}" x2="${width - padding.right + 12}" y1="${y(value).toFixed(1)}" y2="${y(value).toFixed(1)}" stroke="${color}" stroke-dasharray="7 5"/><text x="${width - padding.right + 18}" y="${(y(value) + 4).toFixed(1)}" fill="${color}" font-size="12">${label} ${formatValue(value)}</text>`;
  const circles = statistic.values.map((value, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="4" fill="#2f8fa3"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Carta X-AM de ${escapePdfHtml(statistic.indicator)}" style="width:100%;height:auto;border:1px solid #e7e5e4;border-radius:6px;background:#fff"><rect width="100%" height="100%" fill="#fff"/>${line(statistic.upperControlLimit, '#dc625b', 'LSC')}${line(statistic.mean, '#398f78', 'Média')}${line(statistic.lowerControlLimit, '#dc625b', 'LIC')}<polyline points="${points}" fill="none" stroke="#2f8fa3" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${circles}</svg>`;
}

function exportControlPhasePdf(phase: ControlPhase, statistics: ControlStatistic[], evaluation: ControlEvaluation | null) {
  const printWindow = window.open('', '_blank', 'width=1100,height=900');
  if (!printWindow) return;
  const statisticRows = statistics.map((statistic) => `<tr><th>${escapePdfHtml(statistic.indicator)}</th><td>${formatValue(statistic.mean)}</td><td>${formatValue(statistic.standardDeviation)}</td><td>${formatValue(statistic.minimum)}</td><td>${formatValue(statistic.maximum)}</td><td>${statistic.omitted}</td><td>${statistic.count}</td></tr>`).join('');
  const chartSections = statistics.map((statistic) => `<div class="chart"><h3>${escapePdfHtml(statistic.indicator)} · Carta X-AM</h3>${buildControlChartSvg(statistic)}<p><strong>Pontos:</strong> ${statistic.count} · <strong>Média:</strong> ${formatValue(statistic.mean)} · <strong>LSC:</strong> ${formatValue(statistic.upperControlLimit)} · <strong>LIC:</strong> ${formatValue(statistic.lowerControlLimit)}</p><p><strong>Valores:</strong> ${statistic.values.map(formatValue).join(' · ')}</p></div>`).join('');
  const evaluationHtml = evaluation ? `<h2>Avaliação da Suíte</h2><div class="evaluation"><h3>${evaluation.success ? 'Projeto bem-sucedido' : 'Sucesso ainda não comprovado'}</h3><p>${escapePdfHtml(evaluation.summary)}</p><p><strong>Baseline:</strong> ${formatValue(evaluation.baseline)} · <strong>Média pós-controle:</strong> ${formatValue(evaluation.postControlMean)} · <strong>Variação:</strong> ${formatValue(evaluation.improvementPp)} p.p.</p><p><strong>Ganho financeiro real:</strong> ${escapePdfHtml(evaluation.financialGainReal)}</p><p><strong>Memória de cálculo:</strong> ${escapePdfHtml(evaluation.financialCalculation)}</p><h3>Plano de sustentabilidade</h3>${evaluation.sustainabilityPlan.map((pillar) => `<div class="pillar"><strong>${escapePdfHtml(pillar.title)}</strong><p>Responsável: ${escapePdfHtml(pillar.owner)} · Cadência: ${escapePdfHtml(pillar.cadence)}</p><ul>${pillar.controls.map((control) => `<li>${escapePdfHtml(control)}</li>`).join('')}</ul></div>`).join('')}</div>` : '<p class="empty">Avaliação da Suíte ainda não disponível.</p>';
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Fase de Controle</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1c1917;margin:0;padding:32px 40px;font-size:12px}h1{font-size:24px;margin:0 0 4px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#57534e;margin:28px 0 10px;border-bottom:1px solid #d6d3d1;padding-bottom:6px}h3{font-size:13px;margin:0 0 6px}p{line-height:1.5;margin:5px 0}.subtitle{color:#78716c}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#f5f5f4;padding:12px;margin-top:16px}.meta strong{display:block;font-size:10px;color:#78716c;text-transform:uppercase}.meta span{display:block;margin-top:4px}.print-bar{display:flex;justify-content:flex-end;margin:-32px -40px 24px;padding:10px 40px;background:#fafaf9;border-bottom:1px solid #e7e5e4}.print-bar button{padding:8px 14px;background:#1c1917;color:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer}table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #d6d3d1;padding:7px;text-align:left}thead th{background:#f5f5f4;font-size:10px;text-transform:uppercase;color:#57534e}.chart,.evaluation,.pillar{border:1px solid #d6d3d1;border-radius:6px;padding:10px;margin:8px 0;break-inside:avoid}.empty{color:#a8a29e;font-style:italic}ul{margin:6px 0 0;padding-left:18px}@page{margin:14mm}@media print{.print-bar{display:none}body{padding:0}}
</style></head><body><div class="print-bar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div><h1>Fase de Controle</h1><p class="subtitle">Relatório dinâmico · gerado em ${new Date().toLocaleString('pt-BR')}</p><div class="meta"><div><strong>Arquivo CSV</strong><span>${escapePdfHtml(phase.dataset?.fileName ?? 'Não carregado')}</span></div><div><strong>Linhas</strong><span>${phase.dataset?.rows.length ?? 0}</span></div><div><strong>Meses de coleta</strong><span>${phase.months}</span></div></div><h2>Variáveis escolhidas</h2><p>${phase.selectedIndicators.length > 0 ? phase.selectedIndicators.map(escapePdfHtml).join(' · ') : 'Nenhuma variável selecionada.'}</p><h2>Resumo estatístico</h2><table><thead><tr><th>Variável</th><th>Média</th><th>Desvio padrão</th><th>Mínimo</th><th>Máximo</th><th>Omissos</th><th>Observações</th></tr></thead><tbody>${statisticRows || '<tr><td colspan="7">Nenhuma estatística disponível.</td></tr>'}</tbody></table><h2>Cartas X-AM</h2>${chartSections || '<p class="empty">Nenhuma carta disponível.</p>'}${evaluationHtml}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
}

function valuesFor(dataset: ControlDataset, indicator: string, months: number): number[] {
  const rows = dataset.dateColumn ? dataset.rows.slice(-Math.max(months, 1)) : dataset.rows;
  return rows.map((row) => numberValue(row[indicator] ?? '')).filter((value): value is number => value !== null);
}

function statisticFor(dataset: ControlDataset, indicator: string, months: number): ControlStatistic | null {
  const rows = dataset.dateColumn ? dataset.rows.slice(-Math.max(months, 1)) : dataset.rows;
  const values = rows.map((row) => numberValue(row[indicator] ?? '')).filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const ordered = [...values].sort((first, second) => first - second);
  const movingRanges = values.slice(1).map((value, index) => Math.abs(value - values[index]));
  const movingRangeMean = movingRanges.length > 0 ? movingRanges.reduce((sum, value) => sum + value, 0) / movingRanges.length : 0;
  const baseline = values[0];
  const target = values.length > 2 ? values.reduce((sum, value) => sum + value, 0) / values.length : values[values.length - 1];
  return {
    indicator,
    count: values.length,
    omitted: rows.length - values.length,
    mean,
    standardDeviation: Math.sqrt(variance),
    minimum: ordered[0],
    maximum: ordered[ordered.length - 1],
    movingRangeMean,
    upperControlLimit: mean + 2.66 * movingRangeMean,
    lowerControlLimit: mean - 2.66 * movingRangeMean,
    latestValue: values[values.length - 1],
    baseline,
    target,
    improvementPp: values[values.length - 1] - baseline,
    values,
  };
}

function ControlChart({ statistic }: { statistic: ControlStatistic }) {
  const width = 700;
  const height = 220;
  const min = Math.min(...statistic.values, statistic.lowerControlLimit);
  const max = Math.max(...statistic.values, statistic.upperControlLimit);
  const range = Math.max(max - min, 1);
  const x = (index: number) => 30 + (index / Math.max(statistic.values.length - 1, 1)) * (width - 45);
  const y = (value: number) => 20 + (1 - (value - min) / range) * (height - 45);
  const points = statistic.values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  return <div className="rounded-xl border border-border bg-card p-3">
    <div className="mb-2 flex items-center justify-between gap-3"><div><p className="mono-label text-chart-3">Carta X-AM</p><h4 className="text-sm font-bold">{statistic.indicator}</h4></div><span className="mono-label text-muted-foreground">{statistic.count} pontos</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`Carta X-AM de ${statistic.indicator}`}>
      <line x1="30" x2={width - 15} y1={y(statistic.upperControlLimit)} y2={y(statistic.upperControlLimit)} stroke="hsl(var(--destructive))" strokeDasharray="5 4" />
      <line x1="30" x2={width - 15} y1={y(statistic.mean)} y2={y(statistic.mean)} stroke="hsl(var(--primary))" strokeDasharray="5 4" />
      <line x1="30" x2={width - 15} y1={y(statistic.lowerControlLimit)} y2={y(statistic.lowerControlLimit)} stroke="hsl(var(--destructive))" strokeDasharray="5 4" />
      <polyline points={points} fill="none" stroke="hsl(var(--chart-3))" strokeWidth="2.5" strokeLinejoin="round" />
      {statistic.values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r="3" fill="hsl(var(--chart-3))"><title>{formatValue(value)}</title></circle>)}
      <text x={width - 18} y={y(statistic.upperControlLimit) - 5} textAnchor="end" className="fill-destructive text-[10px]">LSC {formatValue(statistic.upperControlLimit)}</text>
      <text x={width - 18} y={y(statistic.mean) - 5} textAnchor="end" className="fill-primary text-[10px]">média {formatValue(statistic.mean)}</text>
      <text x={width - 18} y={y(statistic.lowerControlLimit) + 13} textAnchor="end" className="fill-destructive text-[10px]">LIC {formatValue(statistic.lowerControlLimit)}</text>
    </svg>
  </div>;
}

function ControlExecutiveReading({ phase, statistics, evaluation }: { phase: ControlPhase; statistics: ControlStatistic[]; evaluation?: ControlEvaluation | null }) {
  const observed = statistics.length > 0 ? `${statistics.length} indicador(es) têm cartas X-AM calculadas no período selecionado.` : 'Ainda não há indicadores pós-intervenção suficientes para observar estabilidade.';
  const meaning = evaluation ? evaluation.summary : statistics.length > 0 ? 'A média e os limites de controle mostram o comportamento atual, mas ainda precisam ser comparados com a meta.' : 'Sem dados pós-intervenção, não é possível afirmar que o ganho foi sustentado.';
  const decision = evaluation?.success ? 'Mantenha o plano de sustentabilidade e acompanhe os indicadores na cadência definida.' : phase.dataset ? 'Selecione os indicadores críticos e valide a estabilidade antes de declarar sucesso.' : 'Carregue o CSV pós-intervenção para iniciar a verificação.';
  return <section data-testid="control-executive-reading" className="border-y border-chart-3/25 bg-chart-3/5 px-5 py-5 sm:px-6"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chart-3 text-white"><Activity size={17} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-chart-3">Leitura executiva</p><h3 className="mt-1 text-lg font-black">O que o Controle já permite decidir</h3></div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="border-l-2 border-chart-3/50 pl-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">O que foi observado</p><p className="mt-1 text-xs font-semibold leading-relaxed">{observed}</p></div><div className="border-l-2 border-chart-3/50 pl-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">O que isso significa</p><p className="mt-1 text-xs font-semibold leading-relaxed">{meaning}</p></div><div className="border-l-2 border-chart-3/50 pl-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Qual decisão é recomendada</p><p className="mt-1 text-xs font-semibold leading-relaxed text-chart-3">{decision}</p></div></div></section>;
}

export function ControlPhasePanel({ phase = emptyPhase, onChange, onUpload, onSave, onEvaluate, evaluation, evaluating, evaluationError, saved = false }: {
  phase?: ControlPhase;
  onChange: (phase: ControlPhase) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: (phase: ControlPhase) => void;
  onEvaluate: (statistics: ControlStatistic[], months: number) => void;
  evaluation?: ControlEvaluation | null;
  evaluating: boolean;
  evaluationError: string | null;
  saved?: boolean;
}) {
  const [draft, setDraft] = useState<ControlPhase>(phase);
  const evaluationKey = useRef('');
  useEffect(() => setDraft(phase), [phase]);
  const statistics = useMemo(() => draft.dataset ? draft.selectedIndicators.map((indicator) => statisticFor(draft.dataset as ControlDataset, indicator, draft.months)).filter((value): value is ControlStatistic => value !== null) : [], [draft.dataset, draft.months, draft.selectedIndicators]);
  const update = (next: ControlPhase) => { setDraft(next); onChange(next); };
  useEffect(() => {
    const key = `${draft.dataset?.fileName ?? ''}|${draft.months}|${draft.selectedIndicators.join(',')}|${statistics.map((item) => `${item.indicator}:${item.mean}`).join(',')}`;
    if (statistics.length > 0 && key !== evaluationKey.current) {
      evaluationKey.current = key;
      onEvaluate(statistics, draft.months);
    }
  }, [draft.dataset, draft.months, draft.selectedIndicators, statistics, onEvaluate]);

  return <section data-testid="panel-control-phase" className="mt-6 space-y-6">
    <div className="panel rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mono-label text-chart-3">Controle</p><h3 className="mt-2 font-serif text-2xl font-bold">Monitore e sustente o ganho</h3><p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">Carregue os dados pós-intervenção, selecione os indicadores e acompanhe a estabilidade por cartas X-AM.</p></div><Activity size={22} className="text-chart-3" /></div>
      <div className="mt-4 grid gap-3 rounded-xl border border-border bg-background/60 p-4 text-xs sm:grid-cols-3"><div><p className="mono-label text-muted-foreground">Objetivo</p><p className="mt-1 font-semibold">Confirmar que o ganho foi sustentado.</p></div><div><p className="mono-label text-muted-foreground">Entregas concluídas</p><p className="mt-1 font-semibold">{statistics.length > 0 ? '1 de 2' : '0 de 2'}</p></div><div><p className="mono-label text-muted-foreground">Próximo passo</p><p className="mt-1 font-semibold text-primary">{draft.dataset ? 'Selecionar indicadores' : 'Carregar CSV pós-intervenção'}</p></div></div>
      <div className="mt-5 flex flex-wrap items-end gap-3"><label data-testid="button-upload-control-csv" className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:brightness-95"><CloudUpload size={14} /> {draft.dataset ? 'Trocar CSV de Controle' : 'Carregar CSV de Controle'}<input type="file" accept=".csv,text/csv" onChange={onUpload} className="sr-only" /></label><label className="block"><span className="mb-1 block text-[10px] font-bold text-muted-foreground">Meses de coleta</span><input data-testid="input-control-months" type="number" min="1" max="120" value={draft.months} onChange={(event) => update({ ...draft, months: Math.min(120, Math.max(1, Number(event.target.value) || 1)), evaluation: null })} className="h-9 w-32 rounded-lg border border-border bg-background px-3 text-xs font-bold outline-none focus:border-primary/60" /></label><ButtonLike testId="button-save-control-phase" onClick={() => onSave(draft)} variant="outline"><Save size={14} /> Salvar Controle</ButtonLike><ButtonLike testId="button-export-control-pdf" onClick={() => exportControlPhasePdf(draft, statistics, evaluation ?? null)} variant="outline"><FileText size={14} /> Exportar PDF</ButtonLike></div>
      {draft.dataset ? <p className="mt-3 text-[11px] text-muted-foreground">{draft.dataset.fileName} · {draft.dataset.rows.length} linhas · {draft.dataset.indicatorColumns.length} indicadores numéricos</p> : <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-xs text-amber-950"><strong>Falta o CSV pós-intervenção.</strong> Ele é necessário para comparar o processo com o baseline. Exemplo mínimo: uma coluna de período e uma coluna numérica por indicador.<button type="button" onClick={() => document.querySelector<HTMLInputElement>('[data-testid="button-upload-control-csv"] input')?.click()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400 px-3 py-2 text-[11px] font-bold hover:bg-amber-100">Carregar arquivo agora <CloudUpload size={13} /></button></div>}
      {draft.dataset && <div className="mt-5"><p className="text-xs font-bold">Indicadores para as cartas X-AM</p><div className="mt-2 flex flex-wrap gap-2">{draft.dataset.indicatorColumns.map((indicator) => <label key={indicator} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${draft.selectedIndicators.includes(indicator) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}><input type="checkbox" checked={draft.selectedIndicators.includes(indicator)} onChange={(event) => update({ ...draft, selectedIndicators: event.target.checked ? [...draft.selectedIndicators, indicator] : draft.selectedIndicators.filter((item) => item !== indicator), evaluation: null })} />{indicator}</label>)}</div></div>}
    </div>
    <ControlExecutiveReading phase={draft} statistics={statistics} evaluation={evaluation} />
    {statistics.length > 0 && <><div className="grid gap-4 xl:grid-cols-2">{statistics.map((statistic) => <ControlChart key={statistic.indicator} statistic={statistic} />)}</div><div className="panel overflow-x-auto rounded-xl p-4"><div className="mb-3"><p className="mono-label text-chart-3">Resumo estatístico</p><h3 className="mt-1 text-sm font-bold">Variáveis escolhidas</h3><p className="mt-1 text-[11px] text-muted-foreground">Cálculos sobre o período selecionado de coleta.</p></div><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-border text-[10px] font-bold uppercase tracking-wide text-muted-foreground"><th className="pb-2 pr-4">Variável</th><th className="pb-2 pr-4">Média</th><th className="pb-2 pr-4">Desvio padrão</th><th className="pb-2 pr-4">Mínimo</th><th className="pb-2 pr-4">Máximo</th><th className="pb-2 pr-4">Omissos</th><th className="pb-2">Observações</th></tr></thead><tbody>{statistics.map((statistic) => <tr key={statistic.indicator} className="border-b border-border/60 last:border-0"><th className="py-2.5 pr-4 font-semibold">{statistic.indicator}</th><td className="py-2.5 pr-4 font-mono">{formatValue(statistic.mean)}</td><td className="py-2.5 pr-4 font-mono">{formatValue(statistic.standardDeviation)}</td><td className="py-2.5 pr-4 font-mono">{formatValue(statistic.minimum)}</td><td className="py-2.5 pr-4 font-mono">{formatValue(statistic.maximum)}</td><td className="py-2.5 pr-4 font-mono">{statistic.omitted}</td><td className="py-2.5 font-mono">{statistic.count}</td></tr>)}</tbody></table></div></>}
    {saved && <div data-testid="status-control-saved" className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/7 p-4 text-xs"><Check size={15} className="text-primary" /><span><strong>Controle salvo no Repositório.</strong> Os dados e a avaliação continuarão disponíveis ao reabrir este workspace.</span></div>}
    {evaluating && <div data-testid="status-control-evaluation-loading" className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs"><RefreshCw size={15} className="animate-spin text-primary" /> Avaliando sucesso, ganho financeiro e sustentabilidade...</div>}
    {evaluationError && <div data-testid="status-control-evaluation-error" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs text-destructive">{evaluationError}</div>}
    {evaluation && <div data-testid="panel-control-evaluation" className="space-y-4"><div className={`rounded-xl border p-5 ${evaluation.success ? 'border-primary/30 bg-primary/5' : 'border-accent/30 bg-accent/10'}`}><div className="flex items-start gap-3"><Check size={18} className={evaluation.success ? 'text-primary' : 'text-accent-foreground'} /><div><p className="mono-label">Avaliação da Suíte</p><h3 className="mt-1 text-lg font-bold">{evaluation.success ? 'Projeto bem-sucedido' : 'Sucesso ainda não comprovado'}</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{evaluation.summary}</p><p className="mt-3 text-xs font-semibold">Ganho financeiro real: {evaluation.financialGainReal}</p><p className="mt-1 text-[11px] text-muted-foreground">{evaluation.financialCalculation}</p></div></div></div><div className="grid gap-3 md:grid-cols-2">{evaluation.sustainabilityPlan.map((pillar) => <div key={pillar.title} className="panel rounded-xl p-4"><div className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 text-primary" /><h4 className="text-sm font-bold">{pillar.title}</h4></div><p className="mt-3 text-[11px] text-muted-foreground"><strong>Responsável:</strong> {pillar.owner} · <strong>Cadência:</strong> {pillar.cadence}</p><ul className="mt-3 space-y-1.5 text-xs leading-relaxed">{pillar.controls.map((control) => <li key={control} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{control}</li>)}</ul></div>)}</div></div>}
  </section>;
}

function ButtonLike({ children, onClick, testId, variant = 'solid' }: { children: React.ReactNode; onClick: () => void; testId: string; variant?: 'solid' | 'outline' }) {
  const normalizedChildren = Children.map(children, (child) => typeof child === 'string' ? child.replace('Salvar Controle', 'Salvar no Repositório') : child);
  return <button data-testid={testId} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 ${variant === 'outline' ? 'border border-border bg-card hover:border-primary/45' : 'bg-primary text-primary-foreground hover:brightness-95'}`}>{normalizedChildren}</button>;
}
