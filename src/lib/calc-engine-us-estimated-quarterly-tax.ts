/**
 * calc-engine-us-estimated-quarterly-tax.ts — "Estimated Quarterly Tax
 * Calculator", 14 of 14 income-tax-derived family variants (Batch 10,
 * sub-batch 14 of 14 — the final sub-batch of the entire 50-state audit).
 * A general-purpose quarterly estimated tax tool (not contractor-specific
 * — for anyone with income not subject to regular withholding: investors,
 * retirees with taxable distributions, small business owners, etc.).
 * See calc-engine-us-income-tax-rates.ts for the shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, totalTaxEstimate } from "./calc-engine-us-income-tax-rates";

export const usEstimatedQuarterlyTaxCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-estimated-quarterly-tax-calculator`,
    ((values) => {
      const expectedAnnualIncome = Math.max(0, safeNumber(values.expectedAnnualIncome));
      const estimatedAnnualTax = totalTaxEstimate(expectedAnnualIncome, state);
      const quarterlyPayment = estimatedAnnualTax / 4;
      return { estimatedAnnualTax, quarterlyPayment };
    }) as CustomCalculator,
  ])
);
