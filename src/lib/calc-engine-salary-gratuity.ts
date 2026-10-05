/**
 * Batch: "Interest Calculators" expansion (5 Oct 2026), sub-batch 9 of 9 —
 * Gratuity (1 tool, INR), filed under Salary & Income Calculators (the
 * user's keyword was "Gratuity Interest Calculator"; gratuity is an
 * end-of-service payment, not interest). See
 * calc-engine-interest-methods.ts for the full batch context.
 *
 *  - gratuity: covered by the Payment of Gratuity Act: 15/26 x last salary
 *    (basic + DA) x years, a part year of 6+ months rounded up; not
 *    covered: 15/30 x salary x completed years. Needs 5 years' service
 *    (except death/disablement). Tax-free up to ₹20 lakh for private
 *    employees; the rest is taxable.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-salary-gratuity-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const gratuityCalculator: CustomCalculator = (values) => {
  const monthlySalary = Math.max(0, safeNumber(values.monthlySalary, 50000));
  const years = Math.max(0, Math.round(safeNumber(values.years, 10)));
  const extraMonths = Math.min(11, Math.max(0, Math.round(safeNumber(values.extraMonths, 7))));
  const covered = Math.round(safeNumber(values.covered, 1)) !== 0;
  const exemptLimit = Math.max(0, safeNumber(values.exemptLimit, 2000000));

  const counted = covered ? years + (extraMonths >= 6 ? 1 : 0) : years;
  const amount = covered ? (15 * monthlySalary * counted) / 26 : (15 * monthlySalary * counted) / 30;
  const eligible = years >= 5;

  return {
    yearsCounted: counted,
    gratuityAmount: round2(amount),
    taxFreePortion: round2(Math.min(amount, exemptLimit)),
    taxablePortion: round2(Math.max(0, amount - exemptLimit)),
    eligibleAfterFiveYears: eligible ? 1 : 0,
  };
};

export const salaryGratuityCustomCalculators: Record<string, CustomCalculator> = {
  "gratuity-calculator": gratuityCalculator,
};
