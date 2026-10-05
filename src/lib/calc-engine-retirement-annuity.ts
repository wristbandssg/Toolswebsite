/**
 * Batch: "Investment Calculators" expansion (5 Oct 2026), sub-batch 9 of 9 —
 * Annuity Investment (1 tool), filed under Retirement Calculators (with the
 * existing annuity-retirement-income and pension annuity tools). See
 * calc-engine-investment-stocks.ts for the full batch context.
 *
 *  - annuityInvestment: a fixed deferred annuity (MYGA) growing
 *    tax-deferred vs a taxable CD at a similar rate; after-tax value if
 *    cashed out; monthly income if annuitized over N years.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-retirement-annuity-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const annuityInvestmentCalculator: CustomCalculator = (values) => {
  const premium = Math.max(0, safeNumber(values.premium, 100000));
  const guaranteedRatePercent = Math.max(0, safeNumber(values.guaranteedRatePercent, 5.25));
  const years = Math.max(0, safeNumber(values.years, 7));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 24)));
  const cdRatePercent = Math.max(0, safeNumber(values.cdRatePercent, 4.75));
  const payoutYears = Math.max(1, Math.round(safeNumber(values.payoutYears, 20)));
  const payoutRatePercent = Math.max(0, safeNumber(values.payoutRatePercent, 4.5));

  const t = taxRatePercent / 100;
  const value = premium * Math.pow(1 + guaranteedRatePercent / 100, years);
  const afterTaxCash = value - (value - premium) * t;
  const cd = premium * Math.pow(1 + (cdRatePercent / 100) * (1 - t), years);
  const i = payoutRatePercent / 100 / 12;
  const n = payoutYears * 12;
  const monthly = i === 0 ? value / n : (value * i) / (1 - Math.pow(1 + i, -n));

  return {
    annuityValue: round2(value),
    interestEarned: round2(value - premium),
    afterTaxIfCashedOut: round2(afterTaxCash),
    taxableCdAfterTax: round2(cd),
    advantageOverCd: round2(afterTaxCash - cd),
    monthlyIncomeIfAnnuitized: round2(monthly),
  };
};

export const retirementAnnuityCustomCalculators: Record<string, CustomCalculator> = {
  "annuity-investment-calculator": annuityInvestmentCalculator,
};
