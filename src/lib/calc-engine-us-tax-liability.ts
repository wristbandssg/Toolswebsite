/**
 * calc-engine-us-tax-liability.ts — "Tax Liability Calculator", 4 of 14
 * income-tax-derived family variants (Batch 10, sub-batch 4 of 14). The
 * total estimated dollar amount of state income tax owed for the year —
 * the same underlying math as the Effective Tax Rate Calculator, shown in
 * dollars rather than as a percentage. See calc-engine-us-income-tax-rates.ts
 * for the shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, totalTaxEstimate } from "./calc-engine-us-income-tax-rates";

export const usTaxLiabilityCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-tax-liability-calculator`,
    ((values) => {
      const annualIncome = Math.max(0, safeNumber(values.annualIncome));
      return totalTaxEstimate(annualIncome, state);
    }) as CustomCalculator,
  ])
);
