/**
 * Batch: "Interest Calculators" sub-batch A (Compounding Frequency &
 * Simple Interest, 11 tools). Part of the
 * Interest_Calculators_Topical_Map_Tool_List.xlsx build-out (34 tools
 * total; 3 duplicates against tools already built in this session were
 * skipped — see create-interest-core-calculators.ts header for the
 * skipped-slug list — leaving 31 new tools split into 3 sub-batches; see
 * calc-engine-interest-rates.ts and calc-engine-interest-analysis.ts for
 * the other two). Filed under the existing "Interest Calculators"
 * category (interest-calculators), created empty by
 * reparent-tool-categories-under-finance.ts and populated here for the
 * first time.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-interest-core-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Interest Calculator (general: simple + compound side by side) -------
// Distinct from the standalone Simple/Compound Interest Calculators (built
// earlier this session, in the Investment batch): this general tool shows
// BOTH results side by side for the same principal/rate/term, with a
// selectable compounding frequency, so a visitor can see how much
// compounding actually adds versus simple interest in one view.
export const interestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const years = Math.max(0, safeNumber(values.years, 5));
  const compoundingFrequency = Math.max(1, safeNumber(values.compoundingFrequency, 12));

  const r = annualRatePercent / 100;
  const simpleInterest = principal * r * years;
  const simpleEndingBalance = principal + simpleInterest;

  const compoundEndingBalance = principal * Math.pow(1 + r / compoundingFrequency, compoundingFrequency * years);
  const compoundInterest = compoundEndingBalance - principal;

  return {
    simpleInterest: round2(simpleInterest),
    simpleEndingBalance: round2(simpleEndingBalance),
    compoundInterest: round2(compoundInterest),
    compoundEndingBalance: round2(compoundEndingBalance),
  };
};

// --- Shared helper for the fixed-frequency compound variants below ----------
function compoundResult(principal: number, r: number, n: number, years: number) {
  const endingBalance = principal * Math.pow(1 + r / n, n * years);
  const interestEarned = endingBalance - principal;
  return {
    endingBalance: round2(endingBalance),
    interestEarned: round2(interestEarned),
  };
}

// --- 2. Daily Compound Interest Calculator (n = 365, fixed) -----------------
export const dailyCompoundInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const years = Math.max(0, safeNumber(values.years, 5));
  return compoundResult(principal, annualRatePercent / 100, 365, years);
};

// --- 3. Monthly Compound Interest Calculator (n = 12, fixed) ----------------
export const monthlyCompoundInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const years = Math.max(0, safeNumber(values.years, 5));
  return compoundResult(principal, annualRatePercent / 100, 12, years);
};

// --- 4. Quarterly Compound Interest Calculator (n = 4, fixed) ---------------
export const quarterlyCompoundInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const years = Math.max(0, safeNumber(values.years, 5));
  return compoundResult(principal, annualRatePercent / 100, 4, years);
};

// --- 5. Semiannual Compound Interest Calculator (n = 2, fixed) --------------
export const semiannualCompoundInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const years = Math.max(0, safeNumber(values.years, 5));
  return compoundResult(principal, annualRatePercent / 100, 2, years);
};

// --- 6. Annual Compound Interest Calculator (n = 1, fixed) ------------------
export const annualCompoundInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const years = Math.max(0, safeNumber(values.years, 5));
  return compoundResult(principal, annualRatePercent / 100, 1, years);
};

// --- 7. Continuous Compound Interest Calculator (P*e^(rt)) ------------------
export const continuousCompoundInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const years = Math.max(0, safeNumber(values.years, 5));
  const r = annualRatePercent / 100;

  const endingBalance = principal * Math.exp(r * years);
  const interestEarned = endingBalance - principal;

  return {
    endingBalance: round2(endingBalance),
    interestEarned: round2(interestEarned),
  };
};

// --- 8. Daily Interest Calculator (simple interest, daily-rate input) -------
// Period-native simple-interest variant: rate and term are both entered in
// DAYS, unlike the Annual Interest Calculator below (which uses an annual
// rate and a term in years). Not compounding.
export const dailyInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const dailyRatePercent = Math.max(0, safeNumber(values.dailyRatePercent, 0.02));
  const days = Math.max(0, safeNumber(values.days, 365));

  const interest = principal * (dailyRatePercent / 100) * days;
  const endingBalance = principal + interest;

  return {
    interestEarned: round2(interest),
    endingBalance: round2(endingBalance),
  };
};

// --- 9. Monthly Interest Calculator (simple interest, monthly-rate input) ---
export const monthlyInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const monthlyRatePercent = Math.max(0, safeNumber(values.monthlyRatePercent, 0.5));
  const months = Math.max(0, safeNumber(values.months, 24));

  const interest = principal * (monthlyRatePercent / 100) * months;
  const endingBalance = principal + interest;

  return {
    interestEarned: round2(interest),
    endingBalance: round2(endingBalance),
  };
};

// --- 10. Annual Interest Calculator (simple interest, annual-rate input) ----
export const annualInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const years = Math.max(0, safeNumber(values.years, 5));

  const interest = principal * (annualRatePercent / 100) * years;
  const endingBalance = principal + interest;

  return {
    interestEarned: round2(interest),
    endingBalance: round2(endingBalance),
  };
};

// --- 11. Simple vs Compound Interest Calculator (annual compounding fixed) --
// Distinct from tool #1 (Interest Calculator): this one fixes compounding
// to once a year (the classic textbook comparison) and has no frequency
// selector, keeping the focus purely on "simple vs. compound" as a
// concept rather than exploring different compounding frequencies.
export const simpleVsCompoundInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const years = Math.max(0, safeNumber(values.years, 5));
  const r = annualRatePercent / 100;

  const simpleInterest = principal * r * years;
  const simpleEndingBalance = principal + simpleInterest;

  const compoundEndingBalance = principal * Math.pow(1 + r, years);
  const compoundInterest = compoundEndingBalance - principal;

  const difference = compoundInterest - simpleInterest;

  return {
    simpleInterest: round2(simpleInterest),
    simpleEndingBalance: round2(simpleEndingBalance),
    compoundInterest: round2(compoundInterest),
    compoundEndingBalance: round2(compoundEndingBalance),
    difference: round2(difference),
  };
};

export const interestCoreCustomCalculators: Record<string, CustomCalculator> = {
  "interest-calculator": interestCalculator,
  "daily-compound-interest-calculator": dailyCompoundInterestCalculator,
  "monthly-compound-interest-calculator": monthlyCompoundInterestCalculator,
  "quarterly-compound-interest-calculator": quarterlyCompoundInterestCalculator,
  "semiannual-compound-interest-calculator": semiannualCompoundInterestCalculator,
  "annual-compound-interest-calculator": annualCompoundInterestCalculator,
  "continuous-compound-interest-calculator": continuousCompoundInterestCalculator,
  "daily-interest-calculator": dailyInterestCalculator,
  "monthly-interest-calculator": monthlyInterestCalculator,
  "annual-interest-calculator": annualInterestCalculator,
  "simple-vs-compound-interest-calculator": simpleVsCompoundInterestCalculator,
};
