/**
 * calc-engine-us-marginal-tax-rate.ts — "Marginal Tax Rate Calculator",
 * 2 of 14 income-tax-derived family variants (Batch 10, sub-batch 2 of
 * 14). Computationally identical to the Tax Bracket Calculator (both
 * estimate the rate on your NEXT dollar of income) — presented as a
 * separate tool because "marginal tax rate calculator" and "tax bracket
 * calculator" are both real, distinct search terms people use for the
 * same underlying concept. See calc-engine-us-income-tax-rates.ts for the
 * shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, marginalRateEstimate } from "./calc-engine-us-income-tax-rates";

export const usMarginalTaxRateCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-marginal-tax-rate-calculator`,
    ((values) => {
      const annualIncome = Math.max(0, safeNumber(values.annualIncome));
      return marginalRateEstimate(annualIncome, state) * 100;
    }) as CustomCalculator,
  ])
);
