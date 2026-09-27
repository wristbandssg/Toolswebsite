/**
 * calc-engine-us-effective-tax-rate.ts — "Effective Tax Rate Calculator",
 * 3 of 14 income-tax-derived family variants (Batch 10, sub-batch 3 of
 * 14). The BLENDED/average rate across all of a person's income (total
 * tax / income) — always <= the marginal rate for a graduated state,
 * equal to it for a flat state. See calc-engine-us-income-tax-rates.ts
 * for the shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, effectiveRateEstimate } from "./calc-engine-us-income-tax-rates";

export const usEffectiveTaxRateCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-effective-tax-rate-calculator`,
    ((values) => {
      const annualIncome = Math.max(0, safeNumber(values.annualIncome));
      return effectiveRateEstimate(annualIncome, state) * 100;
    }) as CustomCalculator,
  ])
);
