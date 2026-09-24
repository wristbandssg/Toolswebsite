/**
 * Australia income tax calculator — a single national tool, like India:
 * Australia has no state-level income tax (state payroll tax exists but is
 * an employer liability, not something withheld from an employee's pay, so
 * it's out of scope for a take-home-pay calculator).
 *
 * See calc-engine.ts for how this file's `australiaCustomCalculators` map
 * merges into the app-wide `customCalculators` registry.
 *
 * Two structural differences from every other country in this project:
 *
 *  - The Medicare Levy isn't a flat 2% for everyone — it "shades in" for
 *    low incomes: no levy at all below a threshold, then 10 cents of levy
 *    per dollar of income above that threshold (not the full 2%) until the
 *    running total reaches what a flat 2% would have been, at which point
 *    it switches to the ordinary flat 2%. See `medicareLevy` below.
 *  - Superannuation (Australia's compulsory retirement contribution, 12%
 *    of salary) is usually paid by the EMPLOYER ON TOP of an employee's
 *    quoted salary — unlike CPP/EI, National Insurance, or QPP/QPIP, it is
 *    NOT withheld from the employee's pay in the common case. Some job ads
 *    instead quote a "total package" figure that already INCLUDES super,
 *    in which case the same 12% has to be carved back out before
 *    calculating tax. This calculator asks which one the entered salary
 *    is via the `salaryIncludesSuper` field, and either way reports
 *    superannuation as an informational line — it is never subtracted
 *    from take-home pay, since in neither case does it reduce the
 *    employee's own cash salary beyond what the toggle already accounts
 *    for.
 *
 * SIMPLIFICATION: the Medicare Levy Surcharge (an extra 1–1.5% for higher
 * earners who don't hold private hospital cover) is deliberately not
 * modelled — it depends on private health insurance status, which this
 * calculator doesn't collect, and is documented as a known gap in the
 * Tool's Assumptions text rather than guessed at.
 *
 * Figures are for FY 2026-27 (1 July 2026 – 30 June 2027), confirmed via
 * the Australian Taxation Office (ato.gov.au) for tax brackets and the
 * Medicare Levy, and cross-checked for the Low Income Tax Offset and the
 * Superannuation Guarantee rate (see each constant's comment) — see the
 * Tool's own Instructions/Assumptions text for the full disclaimer shown
 * to visitors.
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
// Resident individual tax brackets — FY 2026-27, confirmed via ato.gov.au:
// tax-free up to $18,200, then 15% (cut from 16% the year before) up to
// $45,000, 30% up to $135,000, 37% up to $190,000, 45% above. Figures below
// are expressed as cumulative thresholds for the shared progressiveTax
// helper, equivalent to the ATO's own "$X plus Yc per $1 over Z" phrasing.
// ---------------------------------------------------------------------------

const AU_BRACKETS_2026: TaxBand[] = [
  { rate: 0, upTo: 18200 },
  { rate: 0.15, upTo: 45000 },
  { rate: 0.3, upTo: 135000 },
  { rate: 0.37, upTo: 190000 },
  { rate: 0.45, upTo: Infinity },
];

// ---------------------------------------------------------------------------
// Low Income Tax Offset (LITO) — confirmed unchanged for 2026-27: maximum
// $700 for taxable income up to $37,500, reduced 5c per $1 from $37,500 to
// $45,000 (down to $325), then reduced a further 1.5c per $1 from $45,000
// to $66,667 (down to $0).
// ---------------------------------------------------------------------------

function lowIncomeTaxOffset(taxableIncome: number): number {
  if (taxableIncome <= 37500) return 700;
  if (taxableIncome <= 45000) return 700 - (taxableIncome - 37500) * 0.05;
  if (taxableIncome <= 66667) return Math.max(0, 325 - (taxableIncome - 45000) * 0.015);
  return 0;
}

// ---------------------------------------------------------------------------
// Medicare Levy — a flat 2% of taxable income, EXCEPT for a "shade-in"
// range for low incomes, confirmed via the ATO: no levy below $28,011
// (single), then a reduced levy of 10 cents per dollar above that (not the
// full 2%) up to $35,013, above which the ordinary flat 2% applies. The
// shade-in rate is calibrated so the two formulas meet exactly at $35,013.
// This calculator uses the "single" thresholds — the ATO's family
// thresholds (higher, and per-dependent) aren't modelled, since this tool
// doesn't collect household/dependant information.
// ---------------------------------------------------------------------------

const MEDICARE_LEVY_RATE = 0.02;
const MEDICARE_LEVY_LOWER_THRESHOLD_2026 = 28011;
const MEDICARE_LEVY_UPPER_THRESHOLD_2026 = 35013;
const MEDICARE_LEVY_SHADE_IN_RATE = 0.1;

function medicareLevy(taxableIncome: number): number {
  if (taxableIncome <= MEDICARE_LEVY_LOWER_THRESHOLD_2026) return 0;
  if (taxableIncome <= MEDICARE_LEVY_UPPER_THRESHOLD_2026) {
    return (taxableIncome - MEDICARE_LEVY_LOWER_THRESHOLD_2026) * MEDICARE_LEVY_SHADE_IN_RATE;
  }
  return taxableIncome * MEDICARE_LEVY_RATE;
}

// ---------------------------------------------------------------------------
// Superannuation Guarantee — 12% for 2026-27 (reached its final legislated
// rate from 1 July 2025 and is unchanged since), confirmed via the ATO.
// ---------------------------------------------------------------------------

const SUPER_GUARANTEE_RATE_2026 = 0.12;

const australiaIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const enteredSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const salaryIncludesSuper = safeNumber(values.salaryIncludesSuper, 0) === 1;
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));
  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;

  // Cash salary is what actually reaches the employee — either the entered
  // figure as-is (super paid on top by the employer), or the entered
  // "total package" figure with the 12% super carved back out.
  const cashSalary = salaryIncludesSuper ? enteredSalary / (1 + SUPER_GUARANTEE_RATE_2026) : enteredSalary;
  const annualSuperGuarantee = salaryIncludesSuper
    ? enteredSalary - cashSalary
    : enteredSalary * SUPER_GUARANTEE_RATE_2026;

  const taxableIncome = Math.max(0, cashSalary - annualPreTax);

  const slabTax = progressiveTax(taxableIncome, AU_BRACKETS_2026);
  const annualIncomeTax = Math.max(0, slabTax - lowIncomeTaxOffset(taxableIncome));
  const annualMedicareLevy = medicareLevy(taxableIncome);

  const annualTotalDeductions = annualIncomeTax + annualMedicareLevy + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, cashSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: cashSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    medicareLevy: annualMedicareLevy / periodsPerYear,
    superGuarantee: annualSuperGuarantee / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const australiaCustomCalculators: Record<string, CustomCalculator> = {
  "australia-income-tax-calculator": australiaIncomeTaxCalculator,
};
