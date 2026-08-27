import type { DmaicCsvDataset } from '@workspace/api-client-react';
import { shapiroWilk } from '@/lib/shapiro-wilk';

export type HistogramBin = {
  from: number;
  to: number;
  count: number;
};

export type MeasurementVariableSummary = {
  name: string;
  values: number[];
  count: number;
  mean: number;
  median: number;
  minimum: number;
  maximum: number;
  standardDeviation: number;
  q1: number;
  q3: number;
  iqr: number;
  coefficientOfVariation: number | null;
  shapiroW: number | null;
  shapiroPValue: number | null;
  normality: 'Normal' | 'Não normal' | 'Indisponível';
  slope: number;
  standardizedTrend: number;
  outlierCount: number;
  longestRun: number;
  histogram: HistogramBin[];
  variabilityComment: string;
  sequenceComment: string;
};

export type RepeatedMeasuresAnova = {
  available: boolean;
  fStatistic: number | null;
  pValue: number | null;
  numeratorDf: number | null;
  denominatorDf: number | null;
  epsilon: number | null;
  conclusion: string;
};

export type PairwiseComparison = {
  left: string;
  right: string;
  observations: number;
  meanDifference: number;
  tStatistic: number | null;
  degreesOfFreedom: number;
  rawPValue: number | null;
  adjustedPValue: number | null;
  significant: boolean;
  conclusion: string;
};

export type PrioritizedVariable = {
  name: string;
  score: number;
  explanation: string;
};

export type MeasurementAnalysis = {
  xColumn: string;
  xValues: string[];
  variables: MeasurementVariableSummary[];
  anova: RepeatedMeasuresAnova;
  pairwise: PairwiseComparison[];
  priorities: PrioritizedVariable[];
};

export function parseMeasurementNumber(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(/^R\$/i, '').replace(/%$/, '');
  if (!normalized) return null;
  let parsed: number;
  if (normalized.includes(',')) {
    if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d+$/.test(normalized)) return null;
    parsed = Number(normalized.replace(/\./g, '').replace(',', '.'));
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    parsed = Number(normalized.replace(/\./g, ''));
  } else if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    parsed = Number(normalized);
  } else {
    return null;
  }
  return Number.isFinite(parsed) ? parsed : null;
}

function percentile(sorted: number[], proportion: number): number {
  const position = (sorted.length - 1) * proportion;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values: number[], average = mean(values)): number {
  if (values.length < 2) return 0;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ];
  if (value < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  let x = 0.9999999999998099;
  const z = value - 1;
  coefficients.forEach((coefficient, index) => {
    x += coefficient / (z + index + 1);
  });
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200;
  const epsilon = 3e-12;
  const floor = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < floor) d = floor;
  d = 1 / d;
  let result = d;
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const even = 2 * iteration;
    let aa = (iteration * (b - iteration) * x) / ((qam + even) * (a + even));
    d = 1 + aa * d;
    if (Math.abs(d) < floor) d = floor;
    c = 1 + aa / c;
    if (Math.abs(c) < floor) c = floor;
    d = 1 / d;
    result *= d * c;
    aa = -((a + iteration) * (qab + iteration) * x) / ((a + even) * (qap + even));
    d = 1 + aa * d;
    if (Math.abs(d) < floor) d = floor;
    c = 1 + aa / c;
    if (Math.abs(c) < floor) c = floor;
    d = 1 / d;
    const delta = d * c;
    result *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return result;
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (front * betaContinuedFraction(a, b, x)) / a;
  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

function twoTailedStudentP(tStatistic: number, degreesOfFreedom: number): number {
  if (!Number.isFinite(tStatistic)) return 0;
  const x = degreesOfFreedom / (degreesOfFreedom + tStatistic ** 2);
  return Math.min(1, Math.max(0, regularizedIncompleteBeta(x, degreesOfFreedom / 2, 0.5)));
}

function fSurvivalProbability(fStatistic: number, numeratorDf: number, denominatorDf: number): number {
  if (!Number.isFinite(fStatistic)) return 0;
  const x = denominatorDf / (denominatorDf + numeratorDf * fStatistic);
  return Math.min(1, Math.max(0, regularizedIncompleteBeta(x, denominatorDf / 2, numeratorDf / 2)));
}

function buildHistogram(values: number[], q1: number, q3: number): HistogramBin[] {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) return [{ from: minimum, to: maximum, count: values.length }];
  const iqr = q3 - q1;
  const freedmanDiaconisWidth = iqr > 0 ? (2 * iqr) / Math.cbrt(values.length) : 0;
  const suggestedBins = freedmanDiaconisWidth > 0 ? Math.ceil((maximum - minimum) / freedmanDiaconisWidth) : Math.ceil(Math.sqrt(values.length));
  const binCount = Math.min(18, Math.max(4, suggestedBins));
  const width = (maximum - minimum) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    from: minimum + index * width,
    to: index === binCount - 1 ? maximum : minimum + (index + 1) * width,
    count: 0,
  }));
  values.forEach((value) => {
    const index = Math.min(binCount - 1, Math.floor((value - minimum) / width));
    bins[index].count += 1;
  });
  return bins;
}

function linearSlope(values: number[]): number {
  const xAverage = (values.length - 1) / 2;
  const yAverage = mean(values);
  const numerator = values.reduce((sum, value, index) => sum + (index - xAverage) * (value - yAverage), 0);
  const denominator = values.reduce((sum, _, index) => sum + (index - xAverage) ** 2, 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

function longestRunAroundMean(values: number[], average: number): number {
  let longest = 0;
  let current = 0;
  let priorSign = 0;
  values.forEach((value) => {
    const sign = value === average ? 0 : value > average ? 1 : -1;
    if (sign !== 0 && sign === priorSign) current += 1;
    else current = sign === 0 ? 0 : 1;
    priorSign = sign;
    longest = Math.max(longest, current);
  });
  return longest;
}

function summarizeVariable(dataset: DmaicCsvDataset, name: string): MeasurementVariableSummary {
  const values = dataset.rows.map((row) => parseMeasurementNumber(row[name]) as number);
  const sorted = [...values].sort((left, right) => left - right);
  const average = mean(values);
  const median = percentile(sorted, 0.5);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const standardDeviation = sampleStandardDeviation(values, average);
  const coefficientOfVariation = Math.abs(average) > Number.EPSILON ? Math.abs(standardDeviation / average) * 100 : null;
  const shapiro = shapiroWilk(values);
  const slope = linearSlope(values);
  const standardizedTrend = standardDeviation > Number.EPSILON ? (slope * Math.max(values.length - 1, 1)) / standardDeviation : 0;
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outlierCount = values.filter((value) => value < lowerFence || value > upperFence).length;
  const longestRun = longestRunAroundMean(values, average);
  const variabilityLevel = coefficientOfVariation === null
    ? 'não pode ser comparada pelo coeficiente de variação porque a média está próxima de zero'
    : coefficientOfVariation >= 30
      ? `é alta (CV de ${coefficientOfVariation.toFixed(1)}%)`
      : coefficientOfVariation >= 15
        ? `é moderada (CV de ${coefficientOfVariation.toFixed(1)}%)`
        : `é baixa (CV de ${coefficientOfVariation.toFixed(1)}%)`;
  const variabilityComment = `A variabilidade ${variabilityLevel}; o desvio-padrão é ${standardDeviation.toFixed(3)} e a amplitude observada é ${(sorted.at(-1) as number - sorted[0]).toFixed(3)}.${outlierCount ? ` Foram detectados ${outlierCount} possível(is) valor(es) atípico(s) pelo critério de 1,5×IQR.` : ' Não foram detectados valores atípicos pelo critério de 1,5×IQR.'}`;
  const trendText = Math.abs(standardizedTrend) >= 1
    ? `Há uma tendência ${standardizedTrend > 0 ? 'crescente' : 'decrescente'} relevante ao longo do eixo X (mudança estimada de ${Math.abs(standardizedTrend).toFixed(2)} desvios-padrão no período).`
    : 'Não há uma tendência linear forte ao longo do eixo X.';
  const runText = longestRun >= Math.max(5, Math.ceil(values.length * 0.4))
    ? ` Uma sequência de ${longestRun} pontos permaneceu do mesmo lado da média e merece investigação.`
    : ' Não foi identificada uma sequência longa de pontos do mesmo lado da média.';
  return {
    name,
    values,
    count: values.length,
    mean: average,
    median,
    minimum: sorted[0],
    maximum: sorted.at(-1) as number,
    standardDeviation,
    q1,
    q3,
    iqr,
    coefficientOfVariation,
    shapiroW: shapiro.statistic,
    shapiroPValue: shapiro.pValue,
    normality: shapiro.pValue === null ? 'Indisponível' : shapiro.pValue >= 0.05 ? 'Normal' : 'Não normal',
    slope,
    standardizedTrend,
    outlierCount,
    longestRun,
    histogram: buildHistogram(values, q1, q3),
    variabilityComment,
    sequenceComment: trendText + runText,
  };
}

function greenhouseGeisserEpsilon(matrix: number[][]): number {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  if (columns <= 2 || rows < 2) return 1;
  const columnMeans = Array.from({ length: columns }, (_, column) => mean(matrix.map((row) => row[column])));
  const covariance = Array.from({ length: columns }, (_, left) => Array.from({ length: columns }, (_, right) => (
    matrix.reduce((sum, row) => sum + (row[left] - columnMeans[left]) * (row[right] - columnMeans[right]), 0) / (rows - 1)
  )));
  const centering = Array.from({ length: columns }, (_, left) => Array.from({ length: columns }, (_, right) => (left === right ? 1 : 0) - 1 / columns));
  const product = centering.map((row) => covariance[0].map((_, column) => row.reduce((sum, value, index) => sum + value * covariance[index][column], 0)));
  const trace = product.reduce((sum, row, index) => sum + row[index], 0);
  const squaredTrace = product.reduce((sum, row, left) => sum + row.reduce((inner, value, right) => inner + value * product[right][left], 0), 0);
  if (squaredTrace <= Number.EPSILON) return 1;
  return Math.min(1, Math.max(1 / (columns - 1), (trace ** 2) / ((columns - 1) * squaredTrace)));
}

function repeatedMeasuresAnova(variables: MeasurementVariableSummary[]): RepeatedMeasuresAnova {
  const columns = variables.length;
  const rows = variables[0]?.values.length ?? 0;
  if (columns < 2 || rows < 3) {
    return { available: false, fStatistic: null, pValue: null, numeratorDf: null, denominatorDf: null, epsilon: null, conclusion: 'São necessárias pelo menos duas variáveis e três linhas pareadas para executar a ANOVA.' };
  }
  const matrix = Array.from({ length: rows }, (_, row) => variables.map((variable) => variable.values[row]));
  const allValues = matrix.flat();
  const grandMean = mean(allValues);
  const conditionMeans = variables.map((variable) => variable.mean);
  const rowMeans = matrix.map((row) => mean(row));
  const totalSquares = allValues.reduce((sum, value) => sum + (value - grandMean) ** 2, 0);
  const conditionSquares = rows * conditionMeans.reduce((sum, value) => sum + (value - grandMean) ** 2, 0);
  const rowSquares = columns * rowMeans.reduce((sum, value) => sum + (value - grandMean) ** 2, 0);
  const errorSquares = Math.max(0, totalSquares - conditionSquares - rowSquares);
  const baseNumeratorDf = columns - 1;
  const baseDenominatorDf = (rows - 1) * (columns - 1);
  const meanConditionSquares = conditionSquares / baseNumeratorDf;
  const meanErrorSquares = errorSquares / baseDenominatorDf;
  const fStatistic = meanErrorSquares <= Number.EPSILON ? Number.POSITIVE_INFINITY : meanConditionSquares / meanErrorSquares;
  const epsilon = greenhouseGeisserEpsilon(matrix);
  const numeratorDf = baseNumeratorDf * epsilon;
  const denominatorDf = baseDenominatorDf * epsilon;
  const pValue = fSurvivalProbability(fStatistic, numeratorDf, denominatorDf);
  return {
    available: true,
    fStatistic,
    pValue,
    numeratorDf,
    denominatorDf,
    epsilon,
    conclusion: pValue < 0.05
      ? 'Há evidência estatística de que pelo menos uma média difere das demais (α = 5%). Consulte os testes pareados para localizar as diferenças.'
      : 'Não há evidência estatística suficiente para concluir que as médias diferem entre as variáveis (α = 5%).',
  };
}

function pairedComparisons(variables: MeasurementVariableSummary[]): PairwiseComparison[] {
  const comparisons: PairwiseComparison[] = [];
  for (let leftIndex = 0; leftIndex < variables.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < variables.length; rightIndex += 1) {
      const left = variables[leftIndex];
      const right = variables[rightIndex];
      const differences = left.values.map((value, index) => value - right.values[index]);
      const averageDifference = mean(differences);
      const differenceDeviation = sampleStandardDeviation(differences, averageDifference);
      const degreesOfFreedom = differences.length - 1;
      const tStatistic = differenceDeviation <= Number.EPSILON ? (averageDifference === 0 ? 0 : Number.POSITIVE_INFINITY) : averageDifference / (differenceDeviation / Math.sqrt(differences.length));
      const rawPValue = degreesOfFreedom > 0 ? twoTailedStudentP(tStatistic, degreesOfFreedom) : null;
      comparisons.push({
        left: left.name,
        right: right.name,
        observations: differences.length,
        meanDifference: averageDifference,
        tStatistic,
        degreesOfFreedom,
        rawPValue,
        adjustedPValue: null,
        significant: false,
        conclusion: '',
      });
    }
  }
  const ranked = comparisons
    .map((comparison, index) => ({ index, pValue: comparison.rawPValue ?? 1 }))
    .sort((left, right) => left.pValue - right.pValue);
  let priorAdjusted = 0;
  ranked.forEach((item, rank) => {
    const adjusted = Math.min(1, Math.max(priorAdjusted, item.pValue * (ranked.length - rank)));
    priorAdjusted = adjusted;
    const comparison = comparisons[item.index];
    comparison.adjustedPValue = adjusted;
    comparison.significant = adjusted < 0.05;
    comparison.conclusion = comparison.significant
      ? `As médias de ${comparison.left} e ${comparison.right} diferem após a correção de Holm (α = 5%).`
      : `Não foi detectada diferença entre as médias de ${comparison.left} e ${comparison.right} após a correção de Holm (α = 5%).`;
  });
  return comparisons;
}

function prioritizeVariables(variables: MeasurementVariableSummary[], pairwise: PairwiseComparison[]): PrioritizedVariable[] {
  const nonZeroCvs = variables.map((variable) => variable.coefficientOfVariation).filter((value): value is number => value !== null && value > 0);
  const referenceCv = nonZeroCvs.length ? percentile([...nonZeroCvs].sort((left, right) => left - right), 0.5) : 1;
  return variables.map((variable) => {
    const significantPairs = pairwise.filter((comparison) => comparison.significant && (comparison.left === variable.name || comparison.right === variable.name)).length;
    const variabilityRatio = variable.coefficientOfVariation === null ? 0 : variable.coefficientOfVariation / Math.max(referenceCv, 1);
    const nonNormalScore = variable.normality === 'Não normal' ? 1.5 : 0;
    const outlierScore = variable.outlierCount > 0 ? Math.min(1.5, variable.outlierCount / Math.max(variable.count * 0.05, 1)) : 0;
    const trendScore = Math.min(2, Math.abs(variable.standardizedTrend));
    const score = significantPairs * 2 + variabilityRatio + nonNormalScore + outlierScore + trendScore;
    const reasons = [
      significantPairs ? `${significantPairs} diferença(s) pareada(s) significativa(s)` : 'nenhuma diferença pareada significativa',
      variable.coefficientOfVariation === null ? 'CV indisponível' : `CV ${variable.coefficientOfVariation.toFixed(1)}%`,
      variable.normality === 'Não normal' ? 'distribuição não normal' : variable.normality === 'Normal' ? 'normalidade não rejeitada' : 'normalidade indisponível',
      variable.outlierCount ? `${variable.outlierCount} possível(is) outlier(s)` : 'sem outliers pelo IQR',
      Math.abs(variable.standardizedTrend) >= 1 ? `tendência ${variable.standardizedTrend > 0 ? 'crescente' : 'decrescente'}` : 'sem tendência linear forte',
    ];
    return { name: variable.name, score, explanation: reasons.join('; ') + '. Priorizar significa investigar, não comprovar causalidade.' };
  }).sort((left, right) => right.score - left.score);
}

export function analyzeMeasurementDataset(dataset: DmaicCsvDataset): MeasurementAnalysis {
  const variables = dataset.indicatorColumns.map((name) => summarizeVariable(dataset, name));
  const pairwise = pairedComparisons(variables);
  return {
    xColumn: dataset.headers[0],
    xValues: dataset.rows.map((row) => row[dataset.headers[0]]),
    variables,
    anova: repeatedMeasuresAnova(variables),
    pairwise,
    priorities: prioritizeVariables(variables, pairwise),
  };
}