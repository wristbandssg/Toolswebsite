/**
 * calc-engine-us-commission-tax.ts — "Commission Tax Calculator", 11 of
 * 14 income-tax-derived family variants (Batch 10, sub-batch 11 of 14).
 * Commission is taxed identically to a bonus under most states'
 * supplemental-wage withholding rules, so this uses the same flat
 * top-rate treatment as the Bonus Tax Calculator — a distinct tool for a
 * distinct, real search term, not a duplicate calculation error. See
 * calc-engine-us-income-tax-rates.ts for the shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES } from "./calc-engine-us-income-tax-rates";

export const usCommissionTaxCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-commission-tax-calculator`,
    ((values) => {
      const commissionAmount = Math.max(0, safeNumber(values.commissionAmount));
      return commissionAmount * state.topRate;
    }) as CustomCalculator,
  ])
);
