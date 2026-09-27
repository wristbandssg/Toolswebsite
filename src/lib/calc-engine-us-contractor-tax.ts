/**
 * calc-engine-us-contractor-tax.ts — "Contractor Tax Calculator", 13 of
 * 14 income-tax-derived family variants (Batch 10, sub-batch 13 of 14).
 * Like the Freelance Tax Calculator, but framed for 1099 contractors and
 * includes a quarterly breakdown of the estimated annual state tax — the
 * STATE income tax portion only, not federal self-employment tax. See
 * calc-engine-us-income-tax-rates.ts for the shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, totalTaxEstimate } from "./calc-engine-us-income-tax-rates";

export const usContractorTaxCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-contractor-tax-calculator`,
    ((values) => {
      const netContractorIncome = Math.max(0, safeNumber(values.netContractorIncome));
      const estimatedAnnualTax = totalTaxEstimate(netContractorIncome, state);
      const estimatedQuarterlyPayment = estimatedAnnualTax / 4;
      return { estimatedAnnualTax, estimatedQuarterlyPayment };
    }) as CustomCalculator,
  ])
);
