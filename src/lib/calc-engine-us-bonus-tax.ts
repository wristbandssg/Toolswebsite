/**
 * calc-engine-us-bonus-tax.ts — "Bonus Tax Calculator", 9 of 14
 * income-tax-derived family variants (Batch 10, sub-batch 9 of 14).
 * Estimates state tax withheld on a supplemental bonus payment, using
 * the state's flat/top rate (the common "flat supplemental wage rate"
 * convention most states use for bonuses). See
 * calc-engine-us-income-tax-rates.ts for the shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES } from "./calc-engine-us-income-tax-rates";

export const usBonusTaxCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-bonus-tax-calculator`,
    ((values) => {
      const bonusAmount = Math.max(0, safeNumber(values.bonusAmount));
      return bonusAmount * state.topRate;
    }) as CustomCalculator,
  ])
);
