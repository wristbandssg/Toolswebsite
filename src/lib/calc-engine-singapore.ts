/**
 * Singapore income tax calculator — a single national tool, like India,
 * Australia, South Africa, Pakistan, Hong Kong, Malaysia, the Philippines,
 * and New Zealand: Singapore has no state/regional income tax on salary.
 *
 * See calc-engine.ts for how this file's `singaporeCustomCalculators` map
 * merges into the app-wide `customCalculators` registry.
 *
 * Structural note: CPF (Central Provident Fund) contribution rates in
 * Singapore depend on the employee's age band and citizenship/PR status,
 * and only apply to citizens and Permanent Residents — a Singapore
 * Employment Pass holder or other foreign employee doesn't contribute to
 * CPF at all. Rather than assume a rate that would be wrong for a
 * meaningful share of this tool's visitors, `cpfContribution` below is a
 * direct monthly-amount input, the same approach used for Malaysia's EPF
 * and the Philippines' SSS/PhilHealth/Pag-IBIG in this project. Employee
 * CPF contributions genuinely reduce assessable income under Singapore tax
 * law (via CPF Relief), so — unlike a Provident Fund contribution in
 * Pakistan — `cpfContribution` here reduces taxable income as well as
 * take-home pay.
 *
 * Figures are for Year of Assessment 2026 (income year 2025), confirmed via
 * PwC's Worldwide Tax Summaries — this resident rate table has been
 * unchanged since the Budget 2023 revision took effect for YA 2024, so it's
 * also correct for YA 2025/2026 income — see the Tool's own Instructions/
 * Assumptions text for the full disclaimer shown to visitors.
 */

import type { CalcInputValues, CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

interface TaxBand {
  rate: number;
  upTo: number;
}

function progressiveTax(taxableIncome: number, bands: TaxBand[]): number {
  let tax = 0;
  let bandFloor = 0;
  for (const band of bands) {
    if (taxableIncome <= bandFloor) break;
    const amountInBand = Math.min(taxableIncome, band.upTo) - bandFloor;
    if (amountInBand > 0) tax += amountInBand * band.rate;
    bandFloor = band.upTo;
    if (taxableIncome <= band.upTo) break;
  }
  return tax;
}

// ---------------------------------------------------------------------------
// Resident individual tax bands — YA 2026, confirmed via PwC Worldwide Tax
// Summaries: 0% up to SGD 20,000, then eleven more bands from 2% to 23%,
// topping out at 24% above SGD 1,000,000.
// ---------------------------------------------------------------------------

const SG_BRACKETS_2026: TaxBand[] = [
  { rate: 0, upTo: 20000 },
  { rate: 0.02, upTo: 30000 },
  { rate: 0.035, upTo: 40000 },
  { rate: 0.07, upTo: 80000 },
  { rate: 0.115, upTo: 120000 },
  { rate: 0.15, upTo: 160000 },
  { rate: 0.18, upTo: 200000 },
  { rate: 0.19, upTo: 240000 },
  { rate: 0.195, upTo: 280000 },
  { rate: 0.2, upTo: 320000 },
  { rate: 0.22, upTo: 500000 },
  { rate: 0.23, upTo: 1000000 },
  { rate: 0.24, upTo: Infinity },
];

const singaporeIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const cpfPerPeriod = Math.max(0, safeNumber(values.cpfContribution));
  const annualCpf = cpfPerPeriod * periodsPerYear;

  // CPF Relief — see file header. A foreign employee not on CPF simply
  // leaves this at 0, and taxableIncome equals annualSalary.
  const taxableIncome = Math.max(0, annualSalary - annualCpf);
  const annualIncomeTax = progressiveTax(taxableIncome, SG_BRACKETS_2026);

  const annualTotalDeductions = annualIncomeTax + annualCpf;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    cpfContribution: annualCpf / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const singaporeCustomCalculators: Record<string, CustomCalculator> = {
  "singapore-income-tax-calculator": singaporeIncomeTaxCalculator,
};
