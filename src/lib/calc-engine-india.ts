/**
 * India income tax calculator — New Tax Regime vs. Old Tax Regime.
 *
 * See calc-engine.ts for how this file's `indiaCustomCalculators` map
 * merges into the app-wide `customCalculators` registry, and
 * calc-engine-uk.ts's header for how the per-country file split works in
 * general.
 *
 * India is a SINGLE national tool, not one per state — unlike the US or
 * Canada, India has no state-level income tax; the only real choice a
 * taxpayer makes is which of the two regimes to be taxed under (since
 * Budget 2023/2025, the New Regime is the default; the Old Regime must be
 * explicitly elected). That's why this file exports only one tool,
 * selected via a `taxRegime` input field rather than by URL/slug the way
 * UK's "rest of UK vs Scotland" split works.
 *
 * Structural differences from every other country in this project worth
 * calling out:
 *  - The two regimes aren't just different rate tables (like UK's "rest of
 *    UK" vs Scotland) — the New Regime disallows almost every deduction/
 *    exemption the Old Regime allows (Section 80C investments, 80D health
 *    insurance, HRA, etc.), in exchange for lower rates and a bigger
 *    Section 87A rebate. So `oldRegimeDeductionsAnnual` below is applied
 *    ONLY when the Old Regime is selected — under the New Regime it's
 *    ignored entirely, which is correct behavior, not a bug.
 *  - Employee Provident Fund (EPF) contributions reduce take-home pay but,
 *    unlike a US/UK/Canada "pre-tax deduction," do NOT themselves reduce
 *    taxable salary under Indian tax law (an employee can separately
 *    choose to claim EPF contributions toward the Section 80C limit under
 *    the Old Regime, which is exactly what `oldRegimeDeductionsAnnual` is
 *    for) — so `epfMonthly` below is subtracted from take-home pay only,
 *    never from taxable income.
 *  - Section 87A gives a rebate large enough to fully zero out tax up to a
 *    threshold (₹12,00,000 taxable income under the New Regime, ₹5,00,000
 *    under the Old Regime), with "marginal relief" for a narrow band just
 *    above the New Regime threshold so a taxpayer never pays more tax than
 *    the amount by which their income exceeds ₹12,00,000 — implemented
 *    below in `applyRebate` since it materially affects a large share of
 *    salaried taxpayers right around that threshold, unlike the simpler
 *    treatment given to the (much rarer) high-income Surcharge case — see
 *    that section's own comment for why.
 *
 * Figures are for FY 2026-27 (AY 2027-28), confirmed via the Income Tax
 * Department (incometaxindia.gov.in) and cross-checked against ClearTax's
 * published FY 2026-27 slab tables (see each constant's comment) — see the
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
// New Tax Regime (Section 115BAC, the default regime) — FY 2026-27 slabs
// confirmed via the Income Tax Department and ClearTax: ₹0–4L nil, 5% up to
// ₹8L, 10% up to ₹12L, 15% up to ₹16L, 20% up to ₹20L, 25% up to ₹24L, 30%
// above. Standard deduction ₹75,000 for salaried taxpayers.
// ---------------------------------------------------------------------------

const NEW_REGIME_BRACKETS_2026: TaxBand[] = [
  { rate: 0, upTo: 400000 },
  { rate: 0.05, upTo: 800000 },
  { rate: 0.1, upTo: 1200000 },
  { rate: 0.15, upTo: 1600000 },
  { rate: 0.2, upTo: 2000000 },
  { rate: 0.25, upTo: 2400000 },
  { rate: 0.3, upTo: Infinity },
];

const STANDARD_DEDUCTION_NEW_2026 = 75000;
const REBATE_NEW_THRESHOLD_2026 = 1200000;
const REBATE_NEW_MAX_2026 = 60000;

// ---------------------------------------------------------------------------
// Old Tax Regime — slabs unchanged for several years: ₹0–2.5L nil, 5% up to
// ₹5L, 20% up to ₹10L, 30% above. Standard deduction ₹50,000.
// ---------------------------------------------------------------------------

const OLD_REGIME_BRACKETS_2026: TaxBand[] = [
  { rate: 0, upTo: 250000 },
  { rate: 0.05, upTo: 500000 },
  { rate: 0.2, upTo: 1000000 },
  { rate: 0.3, upTo: Infinity },
];

const STANDARD_DEDUCTION_OLD_2026 = 50000;
const REBATE_OLD_THRESHOLD_2026 = 500000;
const REBATE_OLD_MAX_2026 = 12500;

/** Section 87A rebate, including the New Regime's "marginal relief" band
 * just above its ₹12L threshold (so tax payable never exceeds the amount
 * by which taxable income exceeds ₹12,00,000 in that narrow band). The Old
 * Regime's rebate is a hard cliff at ₹5,00,000 — no published marginal
 * relief mechanism applies there. */
function applyRebate(taxableIncome: number, slabTax: number, isNewRegime: boolean): number {
  if (isNewRegime) {
    if (taxableIncome <= REBATE_NEW_THRESHOLD_2026) {
      return Math.max(0, slabTax - REBATE_NEW_MAX_2026);
    }
    const excessIncome = taxableIncome - REBATE_NEW_THRESHOLD_2026;
    return slabTax > excessIncome ? excessIncome : slabTax;
  }
  if (taxableIncome <= REBATE_OLD_THRESHOLD_2026) {
    return Math.max(0, slabTax - REBATE_OLD_MAX_2026);
  }
  return slabTax;
}

// ---------------------------------------------------------------------------
// Surcharge — applies only above ₹50 lakh of taxable income, so it affects
// a small fraction of this calculator's users. Confirmed slabs: 10% above
// ₹50L, 15% above ₹1Cr, 25% above ₹2Cr, and (New Regime only) capped at
// 25% even above ₹5Cr — the Old Regime's 37% top slab above ₹5Cr was
// removed for the New Regime by Budget 2023. SIMPLIFICATION: real surcharge
// also has its own "marginal relief" at each threshold (so crossing ₹50L
// by ₹1 doesn't jump the whole amount into the 10% bracket) — this
// calculator applies the flat percentage without that relief, since it
// only affects taxpayers already well above ₹50L of income; documented in
// the tool's Assumptions text.
// ---------------------------------------------------------------------------

function surchargeRate(taxableIncome: number, isNewRegime: boolean): number {
  if (taxableIncome > 50000000) return isNewRegime ? 0.25 : 0.37;
  if (taxableIncome > 20000000) return 0.25;
  if (taxableIncome > 10000000) return 0.15;
  if (taxableIncome > 5000000) return 0.1;
  return 0;
}

const CESS_RATE_2026 = 0.04;

const indiaIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const isNewRegime = safeNumber(values.taxRegime, 1) !== 0;
  const epfMonthly = Math.max(0, safeNumber(values.epfContribution));
  const annualEpf = epfMonthly * periodsPerYear;
  // Entered as one annual figure (Section 80C/80D-style limits are annual
  // declarations in India, not a per-payslip amount) — NOT scaled by
  // periodsPerYear, and applied only under the Old Regime (see file header).
  const oldRegimeDeductionsAnnual = Math.max(0, safeNumber(values.oldRegimeDeductions));

  const standardDeduction = isNewRegime ? STANDARD_DEDUCTION_NEW_2026 : STANDARD_DEDUCTION_OLD_2026;
  const otherDeductions = isNewRegime ? 0 : oldRegimeDeductionsAnnual;
  const taxableIncome = Math.max(0, annualSalary - standardDeduction - otherDeductions);

  const brackets = isNewRegime ? NEW_REGIME_BRACKETS_2026 : OLD_REGIME_BRACKETS_2026;
  const slabTax = progressiveTax(taxableIncome, brackets);
  const taxAfterRebate = applyRebate(taxableIncome, slabTax, isNewRegime);

  const annualSurcharge = taxAfterRebate * surchargeRate(taxableIncome, isNewRegime);
  const annualCess = (taxAfterRebate + annualSurcharge) * CESS_RATE_2026;

  const annualTotalDeductions = taxAfterRebate + annualSurcharge + annualCess + annualEpf;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: taxAfterRebate / periodsPerYear,
    surcharge: annualSurcharge / periodsPerYear,
    cess: annualCess / periodsPerYear,
    epfContribution: annualEpf / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const indiaCustomCalculators: Record<string, CustomCalculator> = {
  "india-income-tax-calculator": indiaIncomeTaxCalculator,
};
