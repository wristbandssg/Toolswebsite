/**
 * calc-engine-us-overtime-tax.ts — "Overtime Tax Calculator", 10 of 14
 * income-tax-derived family variants (Batch 10, sub-batch 10 of 14).
 * Estimates the state tax attributable to just the overtime portion of
 * pay, using the marginal rate at the combined (regular + overtime)
 * income level — since overtime is the "last dollars" earned on top of
 * regular wages. See calc-engine-us-income-tax-rates.ts for the shared
 * rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, marginalRateEstimate } from "./calc-engine-us-income-tax-rates";

export const usOvertimeTaxCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-overtime-tax-calculator`,
    ((values) => {
      const regularAnnualWages = Math.max(0, safeNumber(values.regularAnnualWages));
      const overtimePay = Math.max(0, safeNumber(values.overtimePay));
      const marginalRate = marginalRateEstimate(regularAnnualWages + overtimePay, state);
      return overtimePay * marginalRate;
    }) as CustomCalculator,
  ])
);
