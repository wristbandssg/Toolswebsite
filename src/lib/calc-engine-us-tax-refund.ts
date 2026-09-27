/**
 * calc-engine-us-tax-refund.ts — "Tax Refund Calculator", 5 of 14
 * income-tax-derived family variants (Batch 10, sub-batch 5 of 14).
 * Compares estimated state tax liability against tax already withheld,
 * to estimate a refund (withheld > liability) or amount still owed
 * (liability > withheld). See calc-engine-us-income-tax-rates.ts for the
 * shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, totalTaxEstimate } from "./calc-engine-us-income-tax-rates";

export const usTaxRefundCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-tax-refund-calculator`,
    ((values) => {
      const annualIncome = Math.max(0, safeNumber(values.annualIncome));
      const amountWithheld = Math.max(0, safeNumber(values.amountWithheld));
      const estimatedLiability = totalTaxEstimate(annualIncome, state);
      const refundOrOwed = amountWithheld - estimatedLiability;
      return { estimatedLiability, refundOrOwed };
    }) as CustomCalculator,
  ])
);
