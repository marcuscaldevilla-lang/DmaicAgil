export type ShapiroWilkResult = {
  statistic: number | null;
  pValue: number | null;
};

const C1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
const C2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
const C3 = [0.544, -0.39978, 0.025054, -0.0006714];
const C4 = [1.3822, -0.77857, 0.062767, -0.0020322];
const C5 = [-1.5861, -0.31082, -0.083751, 0.0038915];
const C6 = [-0.4803, -0.082676, 0.0030302];

function polynomial(coefficients: number[], value: number): number {
  return coefficients.reduceRight((result, coefficient) => result * value + coefficient, 0);
}

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absolute);
  const polynomialValue = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return 0.5 * (1 + sign * (1 - polynomialValue * Math.exp(-absolute * absolute)));
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
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
    / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function shapiroWeights(sampleSize: number): number[] {
  if (sampleSize === 3) return [Math.SQRT1_2];
  const half = Math.floor(sampleSize / 2);
  const expected = Array.from({ length: half }, (_, index) => inverseNormalCdf((index + 1 - 0.375) / (sampleSize + 0.25)));
  const sumSquares = 2 * expected.reduce((sum, value) => sum + value ** 2, 0);
  const normalization = Math.sqrt(sumSquares);
  const inverseRootN = 1 / Math.sqrt(sampleSize);
  const first = polynomial(C1, inverseRootN) - expected[0] / normalization;
  const startIndex = sampleSize > 5 ? 2 : 1;
  let second = 0;
  let factor: number;
  if (sampleSize > 5) {
    second = -expected[1] / normalization + polynomial(C2, inverseRootN);
    factor = Math.sqrt((sumSquares - 2 * expected[0] ** 2 - 2 * expected[1] ** 2) / (1 - 2 * first ** 2 - 2 * second ** 2));
  } else {
    factor = Math.sqrt((sumSquares - 2 * expected[0] ** 2) / (1 - 2 * first ** 2));
  }
  const weights = expected.map((value) => -value / factor);
  weights[0] = first;
  if (startIndex === 2) weights[1] = second;
  return weights;
}

export function shapiroWilk(values: number[]): ShapiroWilkResult {
  const sample = values.filter(Number.isFinite).sort((left, right) => left - right);
  const sampleSize = sample.length;
  if (sampleSize < 3 || sampleSize > 5000) return { statistic: null, pValue: null };
  const average = sample.reduce((sum, value) => sum + value, 0) / sampleSize;
  const denominator = sample.reduce((sum, value) => sum + (value - average) ** 2, 0);
  if (denominator <= Number.EPSILON) return { statistic: null, pValue: null };
  const weights = shapiroWeights(sampleSize);
  const weightedDifference = weights.reduce((sum, weight, index) => sum + weight * (sample[sampleSize - 1 - index] - sample[index]), 0);
  const statistic = Math.min(1, Math.max(0, weightedDifference ** 2 / denominator));
  if (sampleSize === 3) {
    const bounded = Math.max(0.75, statistic);
    return { statistic: bounded, pValue: Math.max(0, 1 - (6 / Math.PI) * Math.acos(Math.sqrt(bounded))) };
  }
  const logOneMinusW = Math.log(Math.max(1e-19, 1 - statistic));
  let transformed: number;
  let expectedMean: number;
  let standardDeviation: number;
  if (sampleSize <= 11) {
    const gamma = -2.273 + 0.459 * sampleSize;
    if (logOneMinusW >= gamma) return { statistic, pValue: 1e-19 };
    transformed = -Math.log(gamma - logOneMinusW);
    expectedMean = polynomial(C3, sampleSize);
    standardDeviation = Math.exp(polynomial(C4, sampleSize));
  } else {
    const logN = Math.log(sampleSize);
    transformed = logOneMinusW;
    expectedMean = polynomial(C5, logN);
    standardDeviation = Math.exp(polynomial(C6, logN));
  }
  const pValue = 1 - normalCdf((transformed - expectedMean) / standardDeviation);
  return { statistic, pValue: Math.min(1, Math.max(0, pValue)) };
}