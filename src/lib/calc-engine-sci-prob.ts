/**
 * Batch: "Science Calculators" → Statistics & Probability (probability & distributions — 31 tools).
 *
 * Exact discrete pmfs/cdfs (binomial, Poisson, geometric, hypergeometric, negative binomial,
 * Bernoulli) via log-gamma for large arguments; continuous cdfs from sci-math-core (normal via
 * erf, gamma via the regularised incomplete gamma, beta via the incomplete beta), closed forms for
 * exponential, uniform, lognormal and Weibull. Inverse normal by Acklam's algorithm + Newton.
 * Birthday problem: P = 1 − Π(1 − k/d). Monte Carlo uses a seeded PRNG (mulberry32) so results
 * repeat for the same seed. See prisma/create-sci-prob-calculators.ts for the copy.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, compileFn, listOf, normCdf, normPdf, normInv, lgamma, gammaP, betaInc, lnChoose, choose } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const p01 = (p: number, name = "p") => {
  if (!(p >= 0 && p <= 1)) throw new InputError(`${name} must be between 0 and 1.`);
  return p;
};
export const TAIL = ["P(X = x)", "P(X ≤ x)", "P(X < x)", "P(X ≥ x)", "P(X > x)"];
/** Discrete tail probabilities from a pmf over 0..max. */
const tails = (pmf: (k: number) => number, x: number, max: number) => {
  let le = 0;
  for (let k = 0; k <= Math.min(x, max); k++) le += pmf(k);
  const eq = x >= 0 && x <= max ? pmf(x) : 0;
  return [eq, le, le - eq, 1 - le + eq, 1 - le].map((p) => Math.min(1, Math.max(0, p)));
};

export const probability: SciCalculator = (v) => {
  const a = p01(pos(v.pa, 0.5), "P(A)"), b = p01(pos(v.pb, 0.4), "P(B)"), indep = pick(v.rel, 3);
  const both = indep === 0 ? a * b : indep === 1 ? 0 : p01(pos(v.pab, 0.1), "P(A and B)");
  if (indep === 1 && a + b > 1) throw new InputError("Mutually exclusive events can't have P(A) + P(B) > 1.");
  return { and: s(both, 10), or: s(a + b - both, 10), notA: s(1 - a, 10), aNotB: s(a - both, 10), neither: s(1 - (a + b - both), 10), aGivenB: b ? s(both / b, 10) : "—", atLeastOne: s(1 - (1 - a) * (1 - b), 10) };
};
export const RELATION = ["Independent", "Mutually exclusive", "Enter P(A and B)"];
export const combination: SciCalculator = (v) => {
  const n = Math.round(pos(v.n, 10)), r = Math.round(pos(v.r, 3));
  if (r > n) throw new InputError("r can't be larger than n.");
  const nCr = choose(n, r), nPr = Math.exp(lgamma(n + 1) - lgamma(n - r + 1));
  return { nCr: nCr < 1e15 ? nCr : s(nCr, 10), nPr: nPr < 1e15 ? Math.round(nPr) : s(nPr, 10), withRepetition: s(choose(n + r - 1, r), 12), permRepetition: s(n ** r, 12) };
};
export const zScore: SciCalculator = (v) => {
  const x = num(v.x, 85), m = num(v.mean, 70), sd = pos(v.sd, 10);
  if (!sd) throw new InputError("The standard deviation must be positive.");
  const z = (x - m) / sd;
  return { z: s(z, 10), percentile: s(100 * normCdf(z), 8), above: s(1 - normCdf(z), 8), between: s(2 * normCdf(Math.abs(z)) - 1, 8) };
};
export const NORM_MODE = ["P(X < x)", "P(X > x)", "P(a < X < b)", "P(X outside a and b)"];
export const normalDist: SciCalculator = (v) => {
  const m = num(v.mean, 0), sd = pos(v.sd, 1), mode = pick(v.mode, 4), a = num(v.a, -1.96), b = num(v.b, 1.96);
  if (!sd) throw new InputError("The standard deviation must be positive.");
  const F = (x: number) => normCdf((x - m) / sd);
  const p = [F(a), 1 - F(a), F(b) - F(a), 1 - (F(b) - F(a))][mode];
  return { probability: s(p, 12), za: s((a - m) / sd, 10), zb: s((b - m) / sd, 10), density: s(normPdf((a - m) / sd) / sd, 10) };
};
export const binomial: SciCalculator = (v) => {
  const n = Math.round(pos(v.n, 10)), p = p01(pos(v.p, 0.5)), x = Math.round(pos(v.x, 5));
  const pmf = (k: number) => (k < 0 || k > n ? 0 : Math.exp(lnChoose(n, k) + k * Math.log(p || 1e-300) + (n - k) * Math.log(1 - p || 1e-300)));
  const [eq, le, lt, ge, gt] = tails(pmf, x, n);
  return { eq: s(eq, 12), le: s(le, 12), lt: s(lt, 12), ge: s(ge, 12), gt: s(gt, 12), mean: s(n * p, 10), sd: s(Math.sqrt(n * p * (1 - p)), 10) };
};
export const negBinomial: SciCalculator = (v) => {
  const r = Math.max(1, Math.round(pos(v.r, 3))), p = p01(pos(v.p, 0.4)), x = Math.round(pos(v.x, 7)); // x = trial of r-th success
  const pmf = (k: number) => (k < r ? 0 : Math.exp(lnChoose(k - 1, r - 1) + r * Math.log(p) + (k - r) * Math.log(1 - p || 1e-300)));
  let le = 0;
  for (let k = r; k <= x; k++) le += pmf(k);
  return { eq: s(pmf(x), 12), le: s(le, 12), gt: s(1 - le, 12), mean: s(r / p, 10), variance: s((r * (1 - p)) / (p * p), 10) };
};
export const poisson: SciCalculator = (v) => {
  const lam = pos(v.lambda, 3), x = Math.round(pos(v.x, 2));
  const pmf = (k: number) => Math.exp(-lam + k * Math.log(lam || 1e-300) - lgamma(k + 1));
  const [eq, le, lt, ge, gt] = tails(pmf, x, x + 1000);
  return { eq: s(eq, 12), le: s(le, 12), lt: s(lt, 12), ge: s(ge, 12), gt: s(gt, 12), mean: s(lam, 10), sd: s(Math.sqrt(lam), 10) };
};
export const geometric: SciCalculator = (v) => {
  const p = p01(pos(v.p, 0.2)), x = Math.max(1, Math.round(pos(v.x, 3)));
  return { eq: s((1 - p) ** (x - 1) * p, 12), le: s(1 - (1 - p) ** x, 12), gt: s((1 - p) ** x, 12), mean: s(1 / p, 10), variance: s((1 - p) / (p * p), 10) };
};
export const hypergeometric: SciCalculator = (v) => {
  const N = Math.round(pos(v.N, 52)), K = Math.round(pos(v.K, 13)), n = Math.round(pos(v.n, 5)), x = Math.round(pos(v.x, 2));
  if (K > N || n > N) throw new InputError("K and n can't exceed the population N.");
  const pmf = (k: number) => (k < Math.max(0, n - (N - K)) || k > Math.min(n, K) ? 0 : Math.exp(lnChoose(K, k) + lnChoose(N - K, n - k) - lnChoose(N, n)));
  const [eq, le, , ge] = tails(pmf, x, n);
  return { eq: s(eq, 12), le: s(le, 12), ge: s(ge, 12), mean: s((n * K) / N, 10), variance: s((n * K * (N - K) * (N - n)) / (N * N * (N - 1)), 10) };
};
export const bernoulli: SciCalculator = (v) => {
  const p = p01(pos(v.p, 0.3));
  return { p1: s(p, 12), p0: s(1 - p, 12), mean: s(p, 12), variance: s(p * (1 - p), 12), entropy: p > 0 && p < 1 ? s(-(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)), 10) : 0 };
};
export const expectedValue: SciCalculator = (v) => {
  const xs = listOf(v, "x", 1), ps = listOf(v, "p", 1);
  if (xs.length !== ps.length) throw new InputError("Enter one probability for each value.");
  const tot = ps.reduce((a, b) => a + b, 0);
  if (Math.abs(tot - 1) > 1e-6) throw new InputError(`The probabilities add up to ${fmt(tot)}, not 1.`);
  const E = xs.reduce((a, x, i) => a + x * ps[i], 0), E2 = xs.reduce((a, x, i) => a + x * x * ps[i], 0);
  return { expected: s(E, 12), variance: s(E2 - E * E, 12), sd: s(Math.sqrt(Math.max(0, E2 - E * E)), 12) };
};
export const discreteDist: SciCalculator = (v) => {
  const xs = listOf(v, "x", 1), ps = listOf(v, "p", 1), x0 = num(v.x0, 2);
  if (xs.length !== ps.length) throw new InputError("Enter one probability for each value.");
  const tot = ps.reduce((a, b) => a + b, 0);
  if (Math.abs(tot - 1) > 1e-6 || ps.some((p) => p < 0)) throw new InputError("Probabilities must be non-negative and add up to 1.");
  const E = xs.reduce((a, x, i) => a + x * ps[i], 0), Vv = xs.reduce((a, x, i) => a + (x - E) ** 2 * ps[i], 0);
  const cdf = xs.reduce((a, x, i) => a + (x <= x0 ? ps[i] : 0), 0);
  return { mean: s(E, 12), variance: s(Vv, 12), sd: s(Math.sqrt(Vv), 12), cdf: s(cdf, 12), valid: 0 };
};
export const VALID_DIST = ["Valid probability distribution", "Invalid"];
export const inverseNormal: SciCalculator = (v) => {
  const p = pos(v.p, 0.95), m = num(v.mean, 0), sd = pos(v.sd, 1), tail = pick(v.tail, 3);
  if (!(p > 0 && p < 1)) throw new InputError("The area must be between 0 and 1.");
  const z = tail === 0 ? normInv(p) : tail === 1 ? normInv(1 - p) : normInv(0.5 + p / 2);
  return { x: s(m + z * sd, 12), z: s(z, 12), interval: tail === 2 ? `${fmt(m - z * sd, 10)} to ${fmt(m + z * sd, 10)}` : "—" };
};
export const INV_TAIL = ["Left tail (area to the left)", "Right tail (area to the right)", "Centre (middle area)"];
export const conditional: SciCalculator = (v) => {
  const pab = p01(pos(v.pab, 0.12), "P(A and B)"), pb = p01(pos(v.pb, 0.4), "P(B)"), pa = p01(pos(v.pa, 0.3), "P(A)");
  if (!pb) throw new InputError("P(B) can't be 0.");
  return { aGivenB: s(pab / pb, 10), bGivenA: pa ? s(pab / pa, 10) : "—", independent: Math.abs(pab - pa * pb) < 1e-9 ? 0 : 1 };
};
export const INDEP = ["Independent (P(A ∩ B) = P(A)·P(B))", "Dependent"];
export const clt: SciCalculator = (v) => {
  const mu = num(v.mu, 100), sigma = pos(v.sigma, 15), n = Math.max(1, Math.round(pos(v.n, 36))), x = num(v.x, 104), mode = pick(v.mode, 2);
  const se = sigma / Math.sqrt(n), z = (x - mu) / se;
  return { se: s(se, 10), z: s(z, 10), probability: s(mode === 0 ? normCdf(z) : 1 - normCdf(z), 12), note: n < 30 ? "n < 30: the sample mean is only approximately normal unless the population is normal." : "n ≥ 30: the sampling distribution of the mean is approximately normal." };
};
export const LT_GT = ["P(x̄ < value)", "P(x̄ > value)"];
export const zToPercentile: SciCalculator = (v) => {
  const z = num(v.z, 1.5);
  const p = normCdf(z);
  return { percentile: s(100 * p, 10), left: s(p, 12), right: s(1 - p, 12), twoTail: s(2 * (1 - normCdf(Math.abs(z))), 12), between: s(2 * normCdf(Math.abs(z)) - 1, 12) };
};
export const birthday: SciCalculator = (v) => {
  const n = Math.round(pos(v.n, 23)), d = Math.round(pos(v.d, 365)) || 365;
  let q = 1;
  for (let k = 0; k < Math.min(n, d + 1); k++) q *= (d - k) / d;
  let need = 0, qq = 1;
  while (1 - qq < 0.5 && need < 1e6) {
    qq *= (d - need) / d;
    need++;
  }
  return { probability: s(n > d ? 1 : 1 - q, 10), percent: s(100 * (n > d ? 1 : 1 - q), 8), fifty: need, pairs: (n * (n - 1)) / 2 };
};
export const relativeRisk: SciCalculator = (v) => {
  const a = pos(v.a, 20), b = pos(v.b, 80), c = pos(v.c, 10), d = pos(v.d, 90);
  const r1 = a / (a + b), r0 = c / (c + d), rr = r1 / r0, or = (a * d) / (b * c);
  const seRR = Math.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d)), seOR = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  return { rr: s(rr, 10), or: s(or, 10), rrCI: `${fmt(Math.exp(Math.log(rr) - 1.96 * seRR), 6)} to ${fmt(Math.exp(Math.log(rr) + 1.96 * seRR), 6)}`, orCI: `${fmt(Math.exp(Math.log(or) - 1.96 * seOR), 6)} to ${fmt(Math.exp(Math.log(or) + 1.96 * seOR), 6)}`, ard: s(r1 - r0, 10) };
};
export const bayes: SciCalculator = (v) => {
  const prior = p01(pos(v.prior, 0.01), "P(A)"), sens = p01(pos(v.sens, 0.95), "P(B | A)"), fp = p01(pos(v.fp, 0.05), "P(B | not A)");
  const pb = sens * prior + fp * (1 - prior);
  return { posterior: s((sens * prior) / pb, 10), evidence: s(pb, 10), negPosterior: s(((1 - sens) * prior) / (1 - pb), 10) };
};
export const exponentialDist: SciCalculator = (v) => {
  const lam = pos(v.lambda, 0.5), x = pos(v.x, 2);
  const F = 1 - Math.exp(-lam * x);
  return { le: s(F, 12), gt: s(1 - F, 12), density: s(lam * Math.exp(-lam * x), 12), mean: s(1 / lam, 10), median: s(Math.LN2 / lam, 10) };
};
export const gammaDist: SciCalculator = (v) => {
  const k = pos(v.k, 2), th = pos(v.theta, 2), x = pos(v.x, 3);
  const F = gammaP(k, x / th);
  return { le: s(F, 12), gt: s(1 - F, 12), density: s(Math.exp((k - 1) * Math.log(x) - x / th - lgamma(k) - k * Math.log(th)), 12), mean: s(k * th, 10), variance: s(k * th * th, 10) };
};
export const betaDist: SciCalculator = (v) => {
  const a = pos(v.a, 2), b = pos(v.b, 5), x = p01(pos(v.x, 0.3), "x");
  const lnB = lgamma(a) + lgamma(b) - lgamma(a + b);
  return { le: s(betaInc(x, a, b), 12), gt: s(1 - betaInc(x, a, b), 12), density: s(Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lnB), 12), mean: s(a / (a + b), 10), mode: a > 1 && b > 1 ? s((a - 1) / (a + b - 2), 10) : "—" };
};
export const uniformDist: SciCalculator = (v) => {
  const a = num(v.a, 0), b = num(v.b, 10), x1 = num(v.x1, 2), x2 = num(v.x2, 5);
  if (b <= a) throw new InputError("b must be greater than a.");
  const cl = (x: number) => Math.min(b, Math.max(a, x));
  return { between: s((cl(x2) - cl(x1)) / (b - a), 12), density: s(1 / (b - a), 12), mean: s((a + b) / 2, 10), sd: s((b - a) / Math.sqrt(12), 10) };
};
export const lognormalDist: SciCalculator = (v) => {
  const mu = num(v.mu, 0), sg = pos(v.sigma, 0.5), x = pos(v.x, 1.5);
  const F = normCdf((Math.log(x) - mu) / sg);
  return { le: s(F, 12), gt: s(1 - F, 12), mean: s(Math.exp(mu + (sg * sg) / 2), 10), median: s(Math.exp(mu), 10), mode: s(Math.exp(mu - sg * sg), 10) };
};
export const weibullDist: SciCalculator = (v) => {
  const k = pos(v.k, 1.5), lam = pos(v.lambda, 1000), x = pos(v.x, 500);
  const F = 1 - Math.exp(-((x / lam) ** k));
  return { le: s(F, 12), reliability: s(1 - F, 12), hazard: s((k / lam) * (x / lam) ** (k - 1), 10), mean: s(lam * Math.exp(lgamma(1 + 1 / k)), 10), b10: s(lam * (-Math.log(0.9)) ** (1 / k), 10) };
};
export const coinFlip: SciCalculator = (v) => {
  const n = Math.round(pos(v.n, 10)), k = Math.round(pos(v.k, 5)), p = p01(pos(v.p, 0.5));
  const pmf = (j: number) => Math.exp(lnChoose(n, j) + j * Math.log(p || 1e-300) + (n - j) * Math.log(1 - p || 1e-300));
  const [eq, le, , ge] = tails(pmf, k, n);
  return { exactly: s(eq, 12), atLeast: s(ge, 12), atMost: s(le, 12), allHeads: s(p ** n, 12), streak: `expected longest run of heads ≈ ${fmt(Math.log(n * (1 - p)) / Math.log(1 / p), 4)}` };
};
export const chebyshev: SciCalculator = (v) => {
  const k = pos(v.k, 2), m = num(v.mean, 100), sd = pos(v.sd, 15);
  if (k <= 1) throw new InputError("k must be greater than 1.");
  return { within: s(100 * (1 - 1 / (k * k)), 10), outside: s(100 / (k * k), 10), interval: `${fmt(m - k * sd, 10)} to ${fmt(m + k * sd, 10)}`, normalCompare: s(100 * (2 * normCdf(k) - 1), 8) };
};
const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const randomNumbers: SciCalculator = (v) => {
  const lo = Math.round(num(v.lo, 1)), hi = Math.round(num(v.hi, 100)), n = Math.min(200, Math.max(1, Math.round(pos(v.count, 10)))), uniq = pick(v.unique, 2) === 0, seed = Math.round(num(v.seed, 0));
  if (hi < lo) throw new InputError("Maximum must be at least the minimum.");
  if (uniq && n > hi - lo + 1) throw new InputError("Not enough distinct numbers in that range.");
  const rnd = seed ? mulberry(seed) : Math.random;
  const out: number[] = [];
  while (out.length < n) {
    const x = lo + Math.floor(rnd() * (hi - lo + 1));
    if (!uniq || !out.includes(x)) out.push(x);
  }
  return { numbers: out.join(", "), sum: out.reduce((a, b) => a + b, 0), count: out.length };
};
export const UNIQUE = ["No repeats", "Repeats allowed"];
export const ppv: SciCalculator = (v) => {
  const sens = p01(pos(v.sens, 99) / 100, "Sensitivity"), spec = p01(pos(v.spec, 98) / 100, "Specificity"), prev = p01(pos(v.prev, 1) / 100, "Prevalence");
  const tp = sens * prev, fp = (1 - spec) * (1 - prev), fn = (1 - sens) * prev, tn = spec * (1 - prev);
  return { ppv: s((100 * tp) / (tp + fp), 8), npv: s((100 * tn) / (tn + fn), 8), lrPos: s(sens / (1 - spec), 8), lrNeg: s((1 - sens) / spec, 8), per1000: `per 1,000 tested: ${fmt(1000 * tp, 4)} true +, ${fmt(1000 * fp, 4)} false +` };
};
export const nnt: SciCalculator = (v) => {
  const ctrl = p01(pos(v.ctrl, 20) / 100, "Control event rate"), trt = p01(pos(v.trt, 15) / 100, "Treatment event rate");
  const arr = ctrl - trt;
  if (!arr) throw new InputError("The two rates are equal, so NNT is infinite.");
  return { nnt: Math.ceil(Math.abs(1 / arr)), kind: arr > 0 ? 0 : 1, arr: s(100 * arr, 8), rrr: s((100 * arr) / ctrl, 8) };
};
export const NNT_KIND = ["Number needed to treat (benefit)", "Number needed to harm (more events)"];
export const monteCarlo: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx"), ["u", "w"]);
  const n = Math.min(200000, Math.max(100, Math.round(pos(v.n, 10000)))), seed = Math.round(num(v.seed, 42)) || 42;
  const rnd = mulberry(seed);
  let sm = 0, sq = 0;
  for (let i = 0; i < n; i++) {
    const y = f(rnd(), rnd());
    sm += y;
    sq += y * y;
  }
  const mean = sm / n, sd = Math.sqrt(Math.max(0, sq / n - mean * mean));
  return { estimate: s(mean, 10), stderr: s(sd / Math.sqrt(n), 6), ci: `${fmt(mean - 1.96 * (sd / Math.sqrt(n)), 8)} to ${fmt(mean + 1.96 * (sd / Math.sqrt(n)), 8)}`, n };
};

export const sciProbCustomCalculators: Record<string, SciCalculator> = {
  "probability-calculator": probability,
  "combination-calculator": combination,
  "z-score-calculator": zScore,
  "normal-distribution-calculator": normalDist,
  "binomial-distribution-calculator": binomial,
  "probability-expected-value-calculator": expectedValue,
  "poisson-distribution-calculator": poisson,
  "probability-distribution-calculator": discreteDist,
  "inverse-normal-distribution-calculator": inverseNormal,
  "conditional-probability-calculator": conditional,
  "central-limit-theorem-calculator": clt,
  "z-score-to-percentile-calculator": zToPercentile,
  "hypergeometric-distribution-calculator": hypergeometric,
  "birthday-paradox-calculator": birthday,
  "geometric-distribution-calculator": geometric,
  "relative-risk-calculator": relativeRisk,
  "bayes-theorem-calculator": bayes,
  "exponential-distribution-calculator": exponentialDist,
  "gamma-distribution-calculator": gammaDist,
  "coin-flip-probability-calculator": coinFlip,
  "chebyshevs-theorem-calculator": chebyshev,
  "beta-distribution-calculator": betaDist,
  "random-number-generator-calculator": randomNumbers,
  "negative-binomial-distribution-calculator": negBinomial,
  "positive-predictive-value-calculator": ppv,
  "uniform-distribution-calculator": uniformDist,
  "number-needed-to-treat-calculator": nnt,
  "lognormal-distribution-calculator": lognormalDist,
  "weibull-distribution-calculator": weibullDist,
  "bernoulli-distribution-calculator": bernoulli,
  "monte-carlo-simulation-calculator": monteCarlo,
};

