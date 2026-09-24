/**
 * South Africa income tax calculator — a single national tool, like India
 * and Australia: South Africa's provinces have no income tax of their own.
 *
 * See calc-engine.ts for how this file's `southAfricaCustomCalculators`
 * map merges into the app-wide `customCalculators` registry.
 *
 * Structural note: like Canada's Basic Personal Amount and Australia's
 * LITO, SARS rebates are a CREDIT subtracted from tax payable, not a
 * deduction from taxable income — but unlike either of those, South Africa
 * has three of them, stacked cumulatively by age: every taxpayer gets the
 * Primary rebate, taxpayers 65 and older ALSO get the Secondary rebate on
 * top of it, and taxpayers 75 and older ALSO get the Tertiary rebate on
 * top of both. That's what produces the three different "tax threshold"
 * figures SARS publishes (the income level below which tax payable is
 * fully offset by rebates) — verified internally below: 18% of R99,000 =
 * R17,820 (exactly the Primary rebate), 18% of R153,250 = R27,585
 * (Primary + Secondary), 18% of R171,300 = R30,834 (all three) — so this
 * file's `ageBand` input exists specifically to pick the right stack.
 *
 * UIF (Unemployment Insurance Fund) is the closest equivalent to US
 * FICA/UK National Insurance/Canada's CPP+EI: 1% of remuneration, but
 * capped at a monthly earnings ceiling (R17,712/month for 2026), so higher
 * earners pay a flat R177.12/month rather than an ever-growing amount.
 *
 * Figures are for the 2026/2027 tax year (1 March 2026 – 28 February
 * 2027), confirmed via the South African Revenue Service (sars.gov.za)
 * for brackets and rebates, and cross-checked for the UIF ceiling (see
 * each constant's comment) — see the Tool's own Instructions/Assumptions
 * text for the full disclaimer shown to visitors.
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
// Individual tax brackets — 2026/2027 tax year, confirmed via sars.gov.za:
// 18% up to R245,100, then 26%/31%/36%/39%/41%/45% through six more bands,
// topping out at 45% above R1,878,600.
// ---------------------------------------------------------------------------

const SA_BRACKETS_2026: TaxBand[] = [
  { rate: 0.18, upTo: 245100 },
  { rate: 0.26, upTo: 383100 },
  { rate: 0.31, upTo: 530200 },
  { rate: 0.36, upTo: 695800 },
  { rate: 0.39, upTo: 887000 },
  { rate: 0.41, upTo: 1878600 },
  { rate: 0.45, upTo: Infinity },
];

// ---------------------------------------------------------------------------
// Rebates — 2026/2027, confirmed via sars.gov.za. Cumulative by age (see
// file header): Primary for everyone, + Secondary from age 65, + Tertiary
// from age 75.
// ---------------------------------------------------------------------------

const PRIMARY_REBATE_2026 = 17820;
const SECONDARY_REBATE_2026 = 9765; // age 65+, on top of Primary
const TERTIARY_REBATE_2026 = 3249; // age 75+, on top of Primary + Secondary

function totalRebate(ageBand: number): number {
  let rebate = PRIMARY_REBATE_2026;
  if (ageBand >= 65) rebate += SECONDARY_REBATE_2026;
  if (ageBand >= 75) rebate += TERTIARY_REBATE_2026;
  return rebate;
}

// ---------------------------------------------------------------------------
// UIF (Unemployment Insurance Fund) — employee contributes 1% of monthly
// remuneration, capped at a R17,712/month earnings ceiling (unchanged
// since 1 June 2021, confirmed still current for 2026), so contributions
// top out at R177.12/month (R2,125.44/year) regardless of how much more
// someone earns above that.
// ---------------------------------------------------------------------------

const UIF_RATE = 0.01;
const UIF_MONTHLY_CEILING_2026 = 17712;
const UIF_ANNUAL_CEILING_2026 = UIF_MONTHLY_CEILING_2026 * 12;

function annualUif(annualRemuneration: number): number {
  return Math.min(annualRemuneration, UIF_ANNUAL_CEILING_2026) * UIF_RATE;
}

const southAfricaIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const ageBand = safeNumber(values.ageBand, 0);
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));
  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;

  const taxableIncome = Math.max(0, annualSalary - annualPreTax);
  const slabTax = progressiveTax(taxableIncome, SA_BRACKETS_2026);
  const annualIncomeTax = Math.max(0, slabTax - totalRebate(ageBand));

  // UIF is charged on remuneration, not taxable income after deductions —
  // calculated on the salary actually paid.
  const annualUifAmount = annualUif(annualSalary);

  const annualTotalDeductions = annualIncomeTax + annualUifAmount + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    uif: annualUifAmount / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const southAfricaCustomCalculators: Record<string, CustomCalculator> = {
  "south-africa-income-tax-calculator": southAfricaIncomeTaxCalculator,
};
