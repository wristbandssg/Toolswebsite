/**
 * Pakistan income tax calculator — a single national tool, like India,
 * Australia, and South Africa: Pakistan's provinces don't levy income tax
 * on salary (they tax agricultural income and services separately under
 * their own provincial laws), so there's one national tool here, not one
 * per province.
 *
 * See calc-engine.ts for how this file's `pakistanCustomCalculators` map
 * merges into the app-wide `customCalculators` registry.
 *
 * Structural note: unlike India (EPF, two regimes, Section 87A rebate) or
 * South Africa (age-based rebate stack, UIF), Pakistan's Income Tax
 * Ordinance, 2001 doesn't give a standard deduction or let a typical
 * Provident Fund contribution reduce taxable salary the way a 401(k)/EPF/
 * RRSP does elsewhere — the 0% band up to Rs 600,000 IS the effective
 * tax-free allowance for a salaried person. Tax credits for things like the
 * Voluntary Pension System (Section 63) exist but depend on the taxpayer's
 * own investment choices and aren't modeled here — see the Tool's
 * Assumptions text. That's why this file's `otherDeductions` input only
 * ever reduces take-home pay, never taxable income (matching how India's
 * `epfContribution` is treated in calc-engine-india.ts).
 *
 * Figures are for FY 2026-27 (1 July 2026 – 30 June 2027) under the
 * Finance Act 2026 — confirmed via FBR's own Budget 2026-27 salient
 * features (fbr.gov.pk) and cross-checked against multiple published
 * post-budget slab tables. The headline changes from FY 2025-26: more
 * intermediate slabs were introduced, the threshold for the top 35% rate
 * rose from Rs 4,100,000 to Rs 7,000,000, and the 9% surcharge that used to
 * apply above Rs 10,000,000 of taxable income has been fully abolished —
 * see the Tool's own Instructions/Assumptions text for the full disclaimer
 * shown to visitors.
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
// Salaried individual slabs — FY 2026-27 (Finance Act 2026), confirmed via
// fbr.gov.pk's Budget 2026-27 salient features and cross-checked against
// multiple published post-budget slab tables: 0% up to Rs 600,000, then
// seven more bands (1%, 11%, 20%, 25%, 29%, 32%, 35%) up to 35% above
// Rs 7,000,000. Each band's cumulative fixed amount below was verified to
// match the published "Rs X + Y% of the amount exceeding Rs Z" formulas.
// ---------------------------------------------------------------------------

const PK_BRACKETS_2026: TaxBand[] = [
  { rate: 0, upTo: 600000 },
  { rate: 0.01, upTo: 1200000 },
  { rate: 0.11, upTo: 2200000 },
  { rate: 0.2, upTo: 3200000 },
  { rate: 0.25, upTo: 4100000 },
  { rate: 0.29, upTo: 5600000 },
  { rate: 0.32, upTo: 7000000 },
  { rate: 0.35, upTo: Infinity },
];

const pakistanIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const otherDeductionsPerPeriod = Math.max(0, safeNumber(values.otherDeductions));
  const annualOtherDeductions = otherDeductionsPerPeriod * periodsPerYear;

  // No standard deduction/exemption reduces taxable salary under the
  // Income Tax Ordinance the way a US/UK/India standard deduction does —
  // see file header. The 0% band up to Rs 600,000 is the only relief.
  const taxableIncome = annualSalary;
  const annualIncomeTax = progressiveTax(taxableIncome, PK_BRACKETS_2026);

  const annualTotalDeductions = annualIncomeTax + annualOtherDeductions;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    otherDeductions: annualOtherDeductions / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const pakistanCustomCalculators: Record<string, CustomCalculator> = {
  "pakistan-income-tax-calculator": pakistanIncomeTaxCalculator,
};
