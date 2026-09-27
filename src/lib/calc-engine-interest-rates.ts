/**
 * Batch: "Interest Calculators" sub-batch B (Rate Conversions — APR/APY/
 * Nominal/Effective, 10 tools). Part of the
 * Interest_Calculators_Topical_Map_Tool_List.xlsx build-out — see
 * calc-engine-interest-core.ts for the full batch context, skipped
 * duplicates, and the other 2 sub-batches.
 *
 * Deliberate differentiation from the pre-existing "APY Calculator"
 * (built in the Savings batch, apy-calculator: nominal rate + a fixed
 * dropdown of 5 standard compounding frequencies + an illustrative
 * deposit amount): the tools below either (a) take an ARBITRARY number
 * of compounding periods per year via a plain number input instead of a
 * fixed dropdown (effectiveInterestRateCalculator, nominalInterestRate-
 * Calculator), or (b) compute a full comparison TABLE across several
 * standard frequencies at once, including continuous compounding, from a
 * single rate input (nominalToEffectiveInterestRateCalculator,
 * effectiveToNominalInterestRateCalculator) — neither shape overlaps
 * with the existing single-frequency, single-output APY Calculator.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-interest-rates-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// --- 1. Interest Rate Calculator (solve r from I = P*r*t) -------------------
export const interestRateCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0.01, safeNumber(values.principal, 10000));
  const interestAmount = Math.max(0, safeNumber(values.interestAmount, 3000));
  const years = Math.max(0.01, safeNumber(values.years, 5));

  const ratePercent = (interestAmount / (principal * years)) * 100;

  return round4(ratePercent);
};

// --- 2. Effective Interest Rate Calculator (nominal -> EAR, ARBITRARY n) ----
export const effectiveInterestRateCalculator: CustomCalculator = (values) => {
  const nominalRatePercent = Math.max(0, safeNumber(values.nominalRatePercent, 6));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 12));

  const r = nominalRatePercent / 100;
  const ear = (Math.pow(1 + r / periodsPerYear, periodsPerYear) - 1) * 100;

  return round4(ear);
};

// --- 3. Nominal Interest Rate Calculator (EAR -> nominal, ARBITRARY n) ------
export const nominalInterestRateCalculator: CustomCalculator = (values) => {
  const effectiveRatePercent = Math.max(0, safeNumber(values.effectiveRatePercent, 6.18));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 12));

  const ear = effectiveRatePercent / 100;
  const nominal = periodsPerYear * (Math.pow(1 + ear, 1 / periodsPerYear) - 1) * 100;

  return round4(nominal);
};

// --- 4. Nominal to Effective Interest Rate Calculator (comparison table) ----
export const nominalToEffectiveInterestRateCalculator: CustomCalculator = (values) => {
  const nominalRatePercent = Math.max(0, safeNumber(values.nominalRatePercent, 6));
  const r = nominalRatePercent / 100;

  const earFor = (n: number) => (Math.pow(1 + r / n, n) - 1) * 100;

  return {
    effectiveAnnual: round4(earFor(1)),
    effectiveSemiannual: round4(earFor(2)),
    effectiveQuarterly: round4(earFor(4)),
    effectiveMonthly: round4(earFor(12)),
    effectiveDaily: round4(earFor(365)),
    effectiveContinuous: round4((Math.exp(r) - 1) * 100),
  };
};

// --- 5. Effective to Nominal Interest Rate Calculator (comparison table) ----
export const effectiveToNominalInterestRateCalculator: CustomCalculator = (values) => {
  const effectiveRatePercent = Math.max(0, safeNumber(values.effectiveRatePercent, 6));
  const ear = effectiveRatePercent / 100;

  const nominalFor = (n: number) => n * (Math.pow(1 + ear, 1 / n) - 1) * 100;

  return {
    nominalIfAnnual: round4(effectiveRatePercent),
    nominalIfSemiannual: round4(nominalFor(2)),
    nominalIfQuarterly: round4(nominalFor(4)),
    nominalIfMonthly: round4(nominalFor(12)),
    nominalIfDaily: round4(nominalFor(365)),
    nominalIfContinuous: round4(Math.log(1 + ear) * 100),
  };
};

// --- 6. APR Calculator (periodic rate -> APR, i.e. periodic × periods) -----
export const aprCalculator: CustomCalculator = (values) => {
  const periodicRatePercent = Math.max(0, safeNumber(values.periodicRatePercent, 0.5));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 12));

  const apr = periodicRatePercent * periodsPerYear;

  return round4(apr);
};

// --- 7. APR to APY Calculator (fixed daily compounding, n = 365) -----------
// Fixed to daily compounding (the U.S. Truth in Lending / Reg Z convention
// for credit cards), unlike Effective Interest Rate Calculator above,
// which lets the user choose any number of periods.
export const aprToApyCalculator: CustomCalculator = (values) => {
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 18));
  const r = aprPercent / 100;
  const apy = (Math.pow(1 + r / 365, 365) - 1) * 100;
  return round4(apy);
};

// --- 8. APY to APR Calculator (fixed daily compounding, n = 365) -----------
export const apyToAprCalculator: CustomCalculator = (values) => {
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 19.72));
  const apy = apyPercent / 100;
  const apr = 365 * (Math.pow(1 + apy, 1 / 365) - 1) * 100;
  return round4(apr);
};

// --- 9. Periodic Interest Rate Calculator (APR -> periodic rate, ARBITRARY n)
// Inverse of the APR Calculator above: divides instead of multiplying.
export const periodicInterestRateCalculator: CustomCalculator = (values) => {
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 12));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 12));

  const periodicRate = aprPercent / periodsPerYear;

  return round4(periodicRate);
};

// --- 10. Annualized Interest Rate Calculator (holding-period return -> annual)
export const annualizedInterestRateCalculator: CustomCalculator = (values) => {
  const periodReturnPercent = Math.max(-99, safeNumber(values.periodReturnPercent, 2));
  const holdingPeriodDays = Math.max(1, safeNumber(values.holdingPeriodDays, 90));

  const periodReturn = periodReturnPercent / 100;
  const annualized = (Math.pow(1 + periodReturn, 365 / holdingPeriodDays) - 1) * 100;

  return round4(annualized);
};

export const interestRatesCustomCalculators: Record<string, CustomCalculator> = {
  "interest-rate-calculator": interestRateCalculator,
  "effective-interest-rate-calculator": effectiveInterestRateCalculator,
  "nominal-interest-rate-calculator": nominalInterestRateCalculator,
  "nominal-to-effective-interest-rate-calculator": nominalToEffectiveInterestRateCalculator,
  "effective-to-nominal-interest-rate-calculator": effectiveToNominalInterestRateCalculator,
  "apr-calculator": aprCalculator,
  "apr-to-apy-calculator": aprToApyCalculator,
  "apy-to-apr-calculator": apyToAprCalculator,
  "periodic-interest-rate-calculator": periodicInterestRateCalculator,
  "annualized-interest-rate-calculator": annualizedInterestRateCalculator,
};
