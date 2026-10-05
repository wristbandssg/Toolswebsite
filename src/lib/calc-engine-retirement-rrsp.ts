/**
 * Batch: "Interest Calculators" expansion (5 Oct 2026), sub-batch 8 of 9 —
 * RRSP (1 tool, CAD), filed under Retirement Calculators. See
 * calc-engine-interest-methods.ts for the full batch context.
 *
 *  - rrsp: 2026 room = 18% of last year's earned income up to $33,810;
 *    contributions capped at the room entered; yearly tax refund at the
 *    marginal rate; tax-deferred growth; after-tax value when withdrawn at
 *    the retirement tax rate.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-retirement-rrsp-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const rrspCalculator: CustomCalculator = (values) => {
  const earnedIncome = Math.max(0, safeNumber(values.earnedIncome, 80000));
  const yearlyContribution = Math.max(0, safeNumber(values.yearlyContribution, 10000));
  const unusedRoom = Math.max(0, safeNumber(values.unusedRoom, 0));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 30000));
  const returnPercent = safeNumber(values.returnPercent, 5);
  const years = Math.max(0, Math.round(safeNumber(values.years, 25)));
  const marginalTaxPercent = Math.min(100, Math.max(0, safeNumber(values.marginalTaxPercent, 30)));
  const retirementTaxPercent = Math.min(100, Math.max(0, safeNumber(values.retirementTaxPercent, 20)));
  const dollarLimit = Math.max(0, safeNumber(values.dollarLimit, 33810));

  const newRoom = Math.min(earnedIncome * 0.18, dollarLimit);
  const contribution = Math.min(yearlyContribution, newRoom + unusedRoom);
  const refund = (contribution * marginalTaxPercent) / 100;
  let balance = currentBalance;
  for (let y = 0; y < years; y++) balance = (balance + contribution) * (1 + returnPercent / 100);

  return {
    newContributionRoom: round2(newRoom),
    contributionAllowed: round2(contribution),
    taxRefundPerYear: round2(refund),
    totalTaxRefunds: round2(refund * years),
    rrspValue: round2(balance),
    afterTaxValueWhenWithdrawn: round2((balance * (100 - retirementTaxPercent)) / 100),
  };
};

export const retirementRrspCustomCalculators: Record<string, CustomCalculator> = {
  "rrsp-calculator": rrspCalculator,
};
