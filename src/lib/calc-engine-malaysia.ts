/**
 * Malaysia individual income tax calculator — a single national tool, like
 * India, Australia, South Africa, and Pakistan: Malaysia has no state-level
 * income tax on salary.
 *
 * See calc-engine.ts for how this file's `malaysiaCustomCalculators` map
 * merges into the app-wide `customCalculators` registry.
 *
 * Structural note: Malaysia has dozens of individual tax reliefs (self,
 * spouse, children, medical, lifestyle, EPF, life insurance, and more) —
 * modeling every one would need a much larger form than any other country
 * on this site. This calculator applies the two that affect nearly every
 * salaried taxpayer: the Individual Relief (RM9,000, automatic, no input
 * needed) and EPF/KWSP relief (capped at RM7,000/year, shared with life
 * insurance premiums in the real relief category but treated here as
 * EPF-only for simplicity — see the Tool's Assumptions text). EPF
 * contributions genuinely reduce both taxable income (up to the relief cap)
 * and take-home pay, unlike India's EPF (take-home only) or Pakistan's
 * Provident Fund (take-home only) — that's a real difference in how each
 * country's tax law treats retirement contributions, not an inconsistency
 * between these files.
 *
 * Figures are for YA 2025 (the assessment year for calendar year 2025
 * income, filed in 2026 and still the latest confirmed schedule as of this
 * tool's writing), confirmed via PwC's Worldwide Tax Summaries and
 * cross-checked against RinggitPlus's published guide for the relief
 * amounts — see the Tool's own Instructions/Assumptions text for the full
 * disclaimer shown to visitors.
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
// Resident individual tax bands — YA 2025, confirmed via PwC Worldwide Tax
// Summaries and RinggitPlus: 0% up to RM5,000, then 1%/3%/6%/11%/19%/25%/
// 26%/28% through eight more bands, topping out at 30% above RM2,000,000.
// ---------------------------------------------------------------------------

const MY_BRACKETS_2025: TaxBand[] = [
  { rate: 0, upTo: 5000 },
  { rate: 0.01, upTo: 20000 },
  { rate: 0.03, upTo: 35000 },
  { rate: 0.06, upTo: 50000 },
  { rate: 0.11, upTo: 70000 },
  { rate: 0.19, upTo: 100000 },
  { rate: 0.25, upTo: 400000 },
  { rate: 0.26, upTo: 600000 },
  { rate: 0.28, upTo: 2000000 },
  { rate: 0.3, upTo: Infinity },
];

// ---------------------------------------------------------------------------
// Reliefs — YA 2025, confirmed via RinggitPlus's published guide.
// Individual Relief applies automatically to every resident taxpayer; EPF
// relief is capped (shared with life insurance in the real relief category,
// treated as EPF-only here — see file header).
// ---------------------------------------------------------------------------

const INDIVIDUAL_RELIEF_2025 = 9000;
const EPF_RELIEF_CAP_2025 = 7000;

const malaysiaIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const epfPerPeriod = Math.max(0, safeNumber(values.epfContribution));
  const annualEpf = epfPerPeriod * periodsPerYear;
  const epfRelief = Math.min(annualEpf, EPF_RELIEF_CAP_2025);

  const chargeableIncome = Math.max(0, annualSalary - INDIVIDUAL_RELIEF_2025 - epfRelief);
  const annualIncomeTax = progressiveTax(chargeableIncome, MY_BRACKETS_2025);

  // The full EPF contribution reduces take-home pay even though only part
  // of it (up to RM7,000) reduces taxable income — see file header.
  const annualTotalDeductions = annualIncomeTax + annualEpf;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    epfContribution: annualEpf / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const malaysiaCustomCalculators: Record<string, CustomCalculator> = {
  "malaysia-income-tax-calculator": malaysiaIncomeTaxCalculator,
};
