/**
 * New Zealand income tax calculator — a single national tool, like India,
 * Australia, South Africa, Pakistan, Hong Kong, Malaysia, and the
 * Philippines: New Zealand has no state/regional income tax on salary.
 *
 * See calc-engine.ts for how this file's `newZealandCustomCalculators` map
 * merges into the app-wide `customCalculators` registry.
 *
 * Structural note: New Zealand has no standard deduction/tax-free
 * threshold the way most other countries in this project do — the lowest
 * band (10.5%) starts from the very first dollar earned. The ACC Earner
 * Levy is this country's FICA/UIF/MPF equivalent: a flat rate on earnings,
 * capped at a maximum liable earnings ceiling, collected alongside PAYE —
 * implemented the same way as South Africa's UIF and Hong Kong's MPF (flat
 * rate, capped). KiwiSaver, unlike EPF/MPF/Provident Fund elsewhere in this
 * project, is deducted from an employee's pay AFTER PAYE and the ACC levy
 * are calculated (it does not reduce taxable income at all) — so
 * `kiwiSaverContribution` below is subtracted only when computing take-home
 * pay, never when computing tax or the ACC levy.
 *
 * Figures are for the 2026/27 tax year (1 April 2026 – 31 March 2027),
 * confirmed via published NZ tax rate references and cross-checked for
 * internal consistency (the ACC levy's rate × cap reproduces the published
 * maximum annual levy exactly) — see the Tool's own Instructions/
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
// PAYE income tax bands — 2026/27, confirmed via published NZ tax rate
// references: 10.5% up to $15,600, then 17.5%/30%/33% through three more
// bands, topping out at 39% above $180,000. No tax-free threshold.
// ---------------------------------------------------------------------------

const NZ_BRACKETS_2026: TaxBand[] = [
  { rate: 0.105, upTo: 15600 },
  { rate: 0.175, upTo: 53500 },
  { rate: 0.3, upTo: 78100 },
  { rate: 0.33, upTo: 180000 },
  { rate: 0.39, upTo: Infinity },
];

// ---------------------------------------------------------------------------
// ACC Earner Levy — 2026/27, confirmed via published NZ tax rate
// references: 1.52% of earnings, capped at $156,641/year of liable
// earnings, so the levy tops out at $2,380.94/year regardless of how much
// more someone earns above that (verified: $156,641 × 1.52% = $2,380.94).
// ---------------------------------------------------------------------------

const ACC_LEVY_RATE_2026 = 0.0152;
const ACC_LEVY_CAP_2026 = 156641;

function annualAccLevy(annualSalary: number): number {
  return Math.min(annualSalary, ACC_LEVY_CAP_2026) * ACC_LEVY_RATE_2026;
}

const newZealandIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const kiwiSaverPerPeriod = Math.max(0, safeNumber(values.kiwiSaverContribution));
  const annualKiwiSaver = kiwiSaverPerPeriod * periodsPerYear;

  const annualIncomeTax = progressiveTax(annualSalary, NZ_BRACKETS_2026);
  const annualAccLevyAmount = annualAccLevy(annualSalary);

  // KiwiSaver comes out after tax and the ACC levy — see file header.
  const annualTotalDeductions = annualIncomeTax + annualAccLevyAmount + annualKiwiSaver;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    accLevy: annualAccLevyAmount / periodsPerYear,
    kiwiSaverContribution: annualKiwiSaver / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const newZealandCustomCalculators: Record<string, CustomCalculator> = {
  "new-zealand-income-tax-calculator": newZealandIncomeTaxCalculator,
};
