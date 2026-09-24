/**
 * United Kingdom income tax calculators.
 *
 * See calc-engine.ts for how this file's `ukCustomCalculators` map merges
 * into the app-wide `customCalculators` registry, and calc-engine-us.ts's
 * header for how the per-country file split works in general.
 *
 * UK income tax is structurally very different from the US federal+state
 * model, so this file does NOT reuse anything from calc-engine-us.ts (no
 * shared "federal bracket" concept applies here) — it's fully self-
 * contained, with its own Personal Allowance, tax-band, and National
 * Insurance logic:
 *
 *  - There is no US-style "filing status": UK income tax is assessed on
 *    each individual separately regardless of marital status (the small,
 *    optional "Marriage Allowance" transfer isn't modeled), so these tools
 *    have no filingStatus input at all — a genuine structural difference
 *    from every US state tool, not an oversight.
 *  - Income tax is devolved to Scotland, which sets its own rates and
 *    bands via the Scottish Parliament — England, Wales, and Northern
 *    Ireland share one set of bands ("rest of UK"). That's why there are
 *    two tools here (uk-income-tax-calculator, scotland-income-tax-
 *    calculator) rather than one, and why there's no per-region grid the
 *    way US states get one — the UK doesn't have 50 separate income tax
 *    systems, just these two.
 *  - National Insurance (Class 1, employee) is NOT devolved — the same
 *    thresholds and rates apply UK-wide, including Scotland, so both
 *    tools share the identical `nationalInsurance()` calculation below.
 *
 * Figures are for tax year 2026/27 (6 April 2026 – 5 April 2027), sourced
 * directly from GOV.UK (see each constant's comment) — see the Tools'
 * own Instructions/Assumptions text for the full disclaimer shown to
 * visitors.
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

// ---------------------------------------------------------------------------
// Shared UK constants and helpers (income tax + National Insurance alike)
// ---------------------------------------------------------------------------

// Personal Allowance 2026/27 — confirmed via GOV.UK (gov.uk/income-tax-rates):
// £12,570, tapered away £1 for every £2 of income above £100,000, reaching
// £0 once income hits £125,140. Frozen at this level since 2021/22 and
// confirmed still in force for 2026/27.
const PERSONAL_ALLOWANCE_2026 = 12570;
const PERSONAL_ALLOWANCE_TAPER_START_2026 = 100000;

function personalAllowanceFor(income: number): number {
  if (income <= PERSONAL_ALLOWANCE_TAPER_START_2026) return PERSONAL_ALLOWANCE_2026;
  const reduction = (income - PERSONAL_ALLOWANCE_TAPER_START_2026) / 2;
  return Math.max(0, PERSONAL_ALLOWANCE_2026 - reduction);
}

function progressiveTax(taxableIncome: number, bands: { rate: number; upTo: number }[]): number {
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

// National Insurance (Class 1, employee) 2026/27 — confirmed via GOV.UK-
// sourced payroll tables: Primary Threshold £12,570/year (deliberately set
// equal to the Personal Allowance), 8% between the Primary Threshold and
// the Upper Earnings Limit (£50,270/year, equal to the higher-rate
// threshold), 2% above the Upper Earnings Limit. Same for every UK
// taxpayer — Scotland included, since NI isn't devolved.
const NI_PRIMARY_THRESHOLD_2026 = 12570;
const NI_UPPER_EARNINGS_LIMIT_2026 = 50270;
const NI_MAIN_RATE = 0.08;
const NI_UPPER_RATE = 0.02;

function nationalInsurance(annualNiablePay: number): number {
  const mainBand = Math.max(
    0,
    Math.min(annualNiablePay, NI_UPPER_EARNINGS_LIMIT_2026) - NI_PRIMARY_THRESHOLD_2026
  );
  const upperBand = Math.max(0, annualNiablePay - NI_UPPER_EARNINGS_LIMIT_2026);
  return mainBand * NI_MAIN_RATE + upperBand * NI_UPPER_RATE;
}

// ---------------------------------------------------------------------------
// UK Income Tax Calculator (England, Wales, Northern Ireland — "rest of
// UK") — 2026/27 bands confirmed via GOV.UK (gov.uk/income-tax-rates):
// Basic rate 20% on the first £37,700 of taxable income (after the
// Personal Allowance), Higher rate 40% on the next £74,870 (taxable income
// up to £112,570 — equivalent to £125,140 of gross income at a full
// Personal Allowance), Additional rate 45% above that. Bands are expressed
// here as cumulative taxable-income thresholds (after the Personal
// Allowance is subtracted) so the same `progressiveTax` helper used for
// the taper-adjusted Personal Allowance at high incomes still works
// correctly, rather than hard-coding the gross-income breakpoints GOV.UK
// publishes for the common full-allowance case.
// ---------------------------------------------------------------------------

const UK_BANDS_2026: { rate: number; upTo: number }[] = [
  { rate: 0.2, upTo: 37700 },
  { rate: 0.4, upTo: 112570 },
  { rate: 0.45, upTo: Infinity },
];

const ukIncomeTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));

  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;

  // Wages actually subject to Income Tax and National Insurance, after
  // pre-tax deductions (e.g. pension contributions taken via salary
  // sacrifice) come out — the same simplification used throughout this
  // project's US calculators: pre-tax deductions are assumed to reduce
  // pay for both alike.
  const taxableAnnualWages = Math.max(0, annualSalary - annualPreTax);

  const personalAllowance = personalAllowanceFor(taxableAnnualWages);
  const taxableIncome = Math.max(0, taxableAnnualWages - personalAllowance);
  const annualIncomeTax = progressiveTax(taxableIncome, UK_BANDS_2026);

  const annualNationalInsurance = nationalInsurance(taxableAnnualWages);

  const annualTotalDeductions = annualIncomeTax + annualNationalInsurance + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    nationalInsurance: annualNationalInsurance / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Scotland Income Tax Calculator — 2026/27 bands confirmed via GOV.UK
// (gov.uk/scottish-income-tax and gov.scot's technical factsheet): SIX
// bands rather than the rest-of-UK's three, most recently widened by the
// "Advanced rate" band introduced in April 2024. The same £12,570 Personal
// Allowance (and its taper above £100,000) applies in Scotland — only the
// rates/bands ABOVE the allowance differ. Bands below are expressed as
// cumulative taxable-income thresholds (after the Personal Allowance),
// derived from GOV.UK's published gross-income breakpoints: Starter
// £12,571–£16,537 (19%), Basic £16,538–£29,526 (20%), Intermediate
// £29,527–£43,662 (21%), Higher £43,663–£75,000 (42%), Advanced
// £75,001–£125,140 (45%), Top over £125,140 (48%).
// National Insurance is NOT devolved — Scotland uses the identical
// `nationalInsurance()` calculation as the rest of the UK above.
// ---------------------------------------------------------------------------

const SCOTLAND_BANDS_2026: { rate: number; upTo: number }[] = [
  { rate: 0.19, upTo: 3967 }, // Starter
  { rate: 0.2, upTo: 16956 }, // Basic
  { rate: 0.21, upTo: 31092 }, // Intermediate
  { rate: 0.42, upTo: 62430 }, // Higher
  { rate: 0.45, upTo: 112570 }, // Advanced
  { rate: 0.48, upTo: Infinity }, // Top
];

const scotlandIncomeTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));

  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;

  const taxableAnnualWages = Math.max(0, annualSalary - annualPreTax);

  const personalAllowance = personalAllowanceFor(taxableAnnualWages);
  const taxableIncome = Math.max(0, taxableAnnualWages - personalAllowance);
  const annualIncomeTax = progressiveTax(taxableIncome, SCOTLAND_BANDS_2026);

  const annualNationalInsurance = nationalInsurance(taxableAnnualWages);

  const annualTotalDeductions = annualIncomeTax + annualNationalInsurance + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    nationalInsurance: annualNationalInsurance / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const ukCustomCalculators: Record<string, CustomCalculator> = {
  "uk-income-tax-calculator": ukIncomeTaxCalculator,
  "scotland-income-tax-calculator": scotlandIncomeTaxCalculator,
};
