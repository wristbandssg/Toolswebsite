/**
 * calc-engine-us-tax-withholding.ts — "Tax Withholding Calculator", 7 of
 * 14 income-tax-derived family variants (Batch 10, sub-batch 7 of 14).
 * Annualizes a per-paycheck wage amount, estimates the annual state tax
 * on it, and divides back down to a per-paycheck withholding estimate.
 * See calc-engine-us-income-tax-rates.ts for the shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, totalTaxEstimate } from "./calc-engine-us-income-tax-rates";

export const usTaxWithholdingCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-tax-withholding-calculator`,
    ((values) => {
      const wagesPerPaycheck = Math.max(0, safeNumber(values.wagesPerPaycheck));
      const payFrequency = safeNumber(values.payFrequency, 26) || 26;
      const annualizedIncome = wagesPerPaycheck * payFrequency;
      const estimatedAnnualTax = totalTaxEstimate(annualizedIncome, state);
      const perPaycheckWithholding = estimatedAnnualTax / payFrequency;
      return { perPaycheckWithholding, estimatedAnnualTax };
    }) as CustomCalculator,
  ])
);
