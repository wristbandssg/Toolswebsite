/**
 * Philippines income tax calculator — a single national tool, like India,
 * Australia, South Africa, and Pakistan: the Philippines has no
 * province/city-level income tax on salary.
 *
 * See calc-engine.ts for how this file's `philippinesCustomCalculators` map
 * merges into the app-wide `customCalculators` registry.
 *
 * Structural note: unlike South Africa's UIF or Hong Kong's MPF (both a
 * single flat capped rate), the Philippines' three mandatory payroll
 * contributions — SSS, PhilHealth, and Pag-IBIG — each have their own
 * bracket table with its own floor and ceiling, none of which are
 * proportional to salary the way a flat percentage would suggest. Rather
 * than approximate all three with a formula that would be wrong at the
 * edges, this calculator takes their combined monthly amount as a direct
 * input (`mandatoryContributions`) — matching how India's Old Regime
 * deductions and Pakistan's Other Deductions are handled here. Unlike
 * Pakistan's deductions, though, SSS/PhilHealth/Pag-IBIG contributions ARE
 * excluded from taxable compensation income under Philippine tax law, so
 * `mandatoryContributions` below reduces taxable income as well as
 * take-home pay.
 *
 * Figures are for the graduated income tax table under the TRAIN Law
 * (Section 24(A)(2)(a) of the Tax Code, as amended by RA 10963), effective
 * since 1 January 2023 and still the current table — confirmed via the
 * Bureau of Internal Revenue's published tax table and cross-checked
 * against QuickBooks Philippines' guide — see the Tool's own Instructions/
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
// Graduated individual income tax table under the TRAIN Law, effective
// since 1 January 2023 (unchanged since) — confirmed via the BIR: 0% up to
// PHP 250,000, then 15%/20%/25%/30% through four more bands, topping out at
// 35% above PHP 8,000,000.
// ---------------------------------------------------------------------------

const PH_BRACKETS_2023: TaxBand[] = [
  { rate: 0, upTo: 250000 },
  { rate: 0.15, upTo: 400000 },
  { rate: 0.2, upTo: 800000 },
  { rate: 0.25, upTo: 2000000 },
  { rate: 0.3, upTo: 8000000 },
  { rate: 0.35, upTo: Infinity },
];

const philippinesIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const mandatoryPerPeriod = Math.max(0, safeNumber(values.mandatoryContributions));
  const annualMandatory = mandatoryPerPeriod * periodsPerYear;

  // SSS/PhilHealth/Pag-IBIG contributions are excluded from taxable
  // compensation income (see file header) — subtracted before computing tax.
  const taxableIncome = Math.max(0, annualSalary - annualMandatory);
  const annualIncomeTax = progressiveTax(taxableIncome, PH_BRACKETS_2023);

  const annualTotalDeductions = annualIncomeTax + annualMandatory;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    mandatoryContributions: annualMandatory / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const philippinesCustomCalculators: Record<string, CustomCalculator> = {
  "philippines-income-tax-calculator": philippinesIncomeTaxCalculator,
};
