/**
 * calc-engine-us-freelance-tax.ts — "Freelance Tax Calculator", 12 of 14
 * income-tax-derived family variants (Batch 10, sub-batch 12 of 14).
 * Estimates state income tax owed on net freelance income (after
 * business expenses) — the STATE income tax portion only; this does not
 * model federal self-employment tax (Social Security/Medicare), which is
 * a separate federal-level calculation out of scope for this state-tax
 * family. See calc-engine-us-income-tax-rates.ts for the shared rate
 * table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, totalTaxEstimate } from "./calc-engine-us-income-tax-rates";

export const usFreelanceTaxCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-freelance-tax-calculator`,
    ((values) => {
      const netFreelanceIncome = Math.max(0, safeNumber(values.netFreelanceIncome));
      return totalTaxEstimate(netFreelanceIncome, state);
    }) as CustomCalculator,
  ])
);
