/**
 * calc-engine-us-withholding-tax.ts — "Withholding Tax Calculator", 8 of
 * 14 income-tax-derived family variants (Batch 10, sub-batch 8 of 14).
 * A "catch-up withholding" tool, distinct from the Tax Withholding
 * Calculator: given expected annual income, tax already withheld
 * year-to-date, and how many pay periods remain, estimates how much MORE
 * needs to be withheld each remaining paycheck to hit the full-year
 * estimated liability. See calc-engine-us-income-tax-rates.ts for the
 * shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, totalTaxEstimate } from "./calc-engine-us-income-tax-rates";

export const usWithholdingTaxCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-withholding-tax-calculator`,
    ((values) => {
      const annualIncome = Math.max(0, safeNumber(values.annualIncome));
      const alreadyWithheldYtd = Math.max(0, safeNumber(values.alreadyWithheldYtd));
      const remainingPayPeriods = Math.max(1, safeNumber(values.remainingPayPeriods, 12));
      const estimatedAnnualTax = totalTaxEstimate(annualIncome, state);
      const remainingTaxDue = Math.max(0, estimatedAnnualTax - alreadyWithheldYtd);
      const perPaycheckAdjustment = remainingTaxDue / remainingPayPeriods;
      return { estimatedAnnualTax, remainingTaxDue, perPaycheckAdjustment };
    }) as CustomCalculator,
  ])
);
