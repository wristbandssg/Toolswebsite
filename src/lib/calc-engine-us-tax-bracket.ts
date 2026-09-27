/**
 * calc-engine-us-tax-bracket.ts — "Tax Bracket Calculator", 1 of 14
 * income-tax-derived family variants (Batch 10, sub-batch 1 of 14), one
 * tool per each of the 41 US states with a personal income tax. See
 * calc-engine-us-income-tax-rates.ts for the shared rate table and the
 * simplified-representative-rate approach used throughout this family.
 *
 * Shows the estimated marginal tax bracket (rate) a given income falls
 * into for that state.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, marginalRateEstimate } from "./calc-engine-us-income-tax-rates";

export const usTaxBracketCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-tax-bracket-calculator`,
    ((values) => {
      const annualIncome = Math.max(0, safeNumber(values.annualIncome));
      return marginalRateEstimate(annualIncome, state) * 100;
    }) as CustomCalculator,
  ])
);
