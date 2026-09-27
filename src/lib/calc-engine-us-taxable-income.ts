/**
 * calc-engine-us-taxable-income.ts — "Taxable Income Calculator", 6 of 14
 * income-tax-derived family variants (Batch 10, sub-batch 6 of 14).
 * Subtracts entered deductions/exemptions from gross income to estimate
 * taxable income, then estimates the state tax on that taxable amount.
 * See calc-engine-us-income-tax-rates.ts for the shared rate table.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";
import { STATE_INCOME_TAX_RATES, totalTaxEstimate } from "./calc-engine-us-income-tax-rates";

export const usTaxableIncomeCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => [
    `${slug}-taxable-income-calculator`,
    ((values) => {
      const grossIncome = Math.max(0, safeNumber(values.grossIncome));
      const deductions = Math.max(0, safeNumber(values.deductions));
      const taxableIncome = Math.max(0, grossIncome - deductions);
      const estimatedTax = totalTaxEstimate(taxableIncome, state);
      return { taxableIncome, estimatedTax };
    }) as CustomCalculator,
  ])
);
