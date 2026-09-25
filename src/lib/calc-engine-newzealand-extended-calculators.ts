/**
 * New Zealand Extended tax calculators — 10 more NZ tools filed under the
 * EXISTING "New Zealand Tax & Salary Calculators" category (created by
 * calc-engine-newzealand.ts's income tax tool), covering PAYE secondary
 * income, GST, ACC levies, self-employment, contractor withholding,
 * rental income, dividend imputation, the bright-line property rule,
 * employer payroll obligations, and KiwiSaver.
 *
 * See calc-engine.ts for how this file's `newZealandExtendedCustomCalculators`
 * map merges into the app-wide `customCalculators` registry.
 *
 * Structural notes worth calling out (see each tool's own Assumptions text
 * for the full visitor-facing version):
 *  - New Zealand has NO general capital gains tax. The bright-line test is
 *    a narrow, date-based exception for residential property only — since
 *    1 July 2024 it applies for just 2 years from purchase (down from up
 *    to 10 years under the prior Labour government), and a sale within
 *    that window is taxed as ORDINARY income (stacked on other income at
 *    marginal rates), not at any special CGT rate. Outside the bright-line
 *    window, and for a main home, a residential property sale is untaxed.
 *  - New Zealand has no separate "payroll tax" the way Australian states
 *    do. The "Payroll Tax" tool here is honestly reframed as an Employer
 *    PAYE & Payroll Obligations calculator — what KiwiSaver, ESCT, and ACC
 *    levies actually cost an EMPLOYER on top of a salary.
 *  - ACC's business "Work Levy" is set per Classification Unit (industry),
 *    with hundreds of different published rates — far too granular for one
 *    generic figure. Tools that need it (ACC Levy, Self-Employed Tax,
 *    Payroll Obligations) offer a 3-tier representative-risk dropdown
 *    (Low/Medium/High, based on published 2026/27 Levy Guidebook examples)
 *    with a clear disclosure that a visitor's real CU rate may differ.
 *  - Employer KiwiSaver contributions are taxed via ESCT (Employer
 *    Superannuation Contribution Tax) BEFORE they reach the employee's
 *    account — ESCT bands are independent of, and don't match, the PAYE
 *    income tax bands (see the KiwiSaver Tax Calculator).
 *  - Imputation credits attached to a dividend can only offset an
 *    individual shareholder's tax liability — unlike Australia's franking
 *    credit system, excess NZ imputation credit is NOT refundable in cash.
 *
 * Figures are for the 2026/27 tax year (1 April 2026 – 31 March 2027),
 * confirmed via ird.govt.nz / acc.co.nz — see each tool's own Assumptions
 * text for the full disclaimer shown to visitors and source notes.
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

/** Tax on `amount` that stacks on top of `otherIncome` already using up the
 * lower bands — used for rental profit, dividends, and bright-line gains,
 * which are all added on top of a filer's other income rather than taxed
 * on their own bracket schedule. */
function stackedTax(otherIncome: number, amount: number, bands: TaxBand[]): number {
  if (amount <= 0) return 0;
  const taxOnCombined = progressiveTax(otherIncome + amount, bands);
  const taxOnOtherAlone = progressiveTax(otherIncome, bands);
  return Math.max(0, taxOnCombined - taxOnOtherAlone);
}

// ---------------------------------------------------------------------------
// PAYE income tax bands — 2026/27 (matches calc-engine-newzealand.ts).
// ---------------------------------------------------------------------------

const NZ_BRACKETS_2026: TaxBand[] = [
  { rate: 0.105, upTo: 15600 },
  { rate: 0.175, upTo: 53500 },
  { rate: 0.3, upTo: 78100 },
  { rate: 0.33, upTo: 180000 },
  { rate: 0.39, upTo: Infinity },
];

// Secondary tax code flat rates, matching the PAYE bracket boundaries —
// applied flatly to ALL secondary-job income once combined income crosses
// into that band (confirmed via ird.govt.nz "Tax codes for individuals").
const SECONDARY_CODE_BANDS: { upTo: number; rate: number }[] = [
  { upTo: 15600, rate: 0.105 },
  { upTo: 53500, rate: 0.175 },
  { upTo: 78100, rate: 0.3 },
  { upTo: 180000, rate: 0.33 },
  { upTo: Infinity, rate: 0.39 },
];

function secondaryRateFor(totalIncome: number): number {
  for (const band of SECONDARY_CODE_BANDS) {
    if (totalIncome <= band.upTo) return band.rate;
  }
  return 0.39;
}

const GST_RATE_2026 = 0.15;

const ACC_LEVY_RATE_2026 = 0.0152;
const ACC_LEVY_CAP_2026 = 156641;
const ACC_SELF_EMPLOYED_MIN_LIABLE_2026 = 50501;
const WORKING_SAFER_LEVY_RATE_2026 = 0.0008; // $0.08 per $100

// Representative ACC Work Levy tiers by industry risk — 2026/27 Levy
// Guidebook examples (Office Administration / Hairdressing / Building
// Construction). A visitor's actual Classification Unit rate may differ —
// see this file's header and the tool's own Assumptions text.
const WORK_LEVY_RATE_BY_TIER: Record<number, number> = {
  0: 0.0058, // Low risk (e.g. office administration)
  1: 0.0123, // Medium risk (e.g. hairdressing)
  2: 0.0274, // High risk (e.g. building construction)
};

function accLiableEarnings(earnings: number, isSelfEmployed: boolean): number {
  if (isSelfEmployed) {
    return Math.min(Math.max(earnings, ACC_SELF_EMPLOYED_MIN_LIABLE_2026), ACC_LEVY_CAP_2026);
  }
  return Math.min(earnings, ACC_LEVY_CAP_2026);
}

// ESCT (Employer Superannuation Contribution Tax) bands — independent of
// the PAYE bracket boundaries above (see file header).
const ESCT_BANDS: TaxBand[] = [
  { rate: 0.105, upTo: 18720 },
  { rate: 0.175, upTo: 64200 },
  { rate: 0.3, upTo: 93720 },
  { rate: 0.33, upTo: 216000 },
  { rate: 0.39, upTo: Infinity },
];

function esctRateFor(totalIncome: number): number {
  for (const band of ESCT_BANDS) {
    if (totalIncome <= band.upTo) return band.rate;
  }
  return 0.39;
}

// Contractor schedular-payment withholding rates (IR330C) — 20% is the
// most common standard/elected rate for general contracting; 45% is the
// no-notification default rate when no IR330C is on file.
const CONTRACTOR_NO_NOTIFICATION_RATE = 0.45;

// Bright-line test — 2 years from 1 July 2024 (down from up to 10 years).
const BRIGHT_LINE_MONTHS_2026 = 24;

const KIWISAVER_MIN_RATE_2026 = 0.035;

// ---------------------------------------------------------------------------
// 1. New Zealand PAYE Calculator (secondary income / second job)
// ---------------------------------------------------------------------------

const newZealandPayeCalculator: CustomCalculator = (values: CalcInputValues) => {
  const mainJobIncome = Math.max(0, safeNumber(values.mainJobIncome));
  const secondaryJobIncome = Math.max(0, safeNumber(values.secondaryJobIncome));
  const periodsPerYear = safeNumber(values.payFrequency, 26) || 26;

  const primaryTax = progressiveTax(mainJobIncome, NZ_BRACKETS_2026);
  const totalIncome = mainJobIncome + secondaryJobIncome;
  const secondaryRate = secondaryRateFor(totalIncome);
  const secondaryTax = secondaryJobIncome * secondaryRate;

  const totalTax = primaryTax + secondaryTax;
  const totalNetIncome = totalIncome - totalTax;

  return {
    primaryTaxAnnual: primaryTax,
    secondaryTaxRate: secondaryRate * 100,
    secondaryTaxAnnual: secondaryTax,
    totalTaxAnnual: totalTax,
    totalNetAnnual: totalNetIncome,
    netPerPeriod: totalNetIncome / periodsPerYear,
  };
};

// ---------------------------------------------------------------------------
// 2. New Zealand GST Calculator
// ---------------------------------------------------------------------------

const newZealandGstCalculator: CustomCalculator = (values: CalcInputValues) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const isGstInclusive = safeNumber(values.isGstInclusive) === 1;

  const netAmount = isGstInclusive ? amount / (1 + GST_RATE_2026) : amount;
  const gstAmount = netAmount * GST_RATE_2026;
  const grossAmount = netAmount + gstAmount;

  return { netAmount, gstAmount, grossAmount };
};

// ---------------------------------------------------------------------------
// 3. New Zealand ACC Levy Calculator
// ---------------------------------------------------------------------------

const newZealandAccLevyCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualEarnings = Math.max(0, safeNumber(values.annualEarnings));
  const isSelfEmployed = safeNumber(values.isSelfEmployed) === 1;
  const industryTier = safeNumber(values.industryTier, 0);

  const liableEarnings = accLiableEarnings(annualEarnings, isSelfEmployed);
  const earnerLevy = liableEarnings * ACC_LEVY_RATE_2026;
  const workLevy = isSelfEmployed ? liableEarnings * (WORK_LEVY_RATE_BY_TIER[industryTier] ?? WORK_LEVY_RATE_BY_TIER[0]) : 0;
  const workingSaferLevy = isSelfEmployed ? liableEarnings * WORKING_SAFER_LEVY_RATE_2026 : 0;
  const totalLevy = earnerLevy + workLevy + workingSaferLevy;

  return {
    liableEarnings,
    earnerLevy,
    workLevy,
    workingSaferLevy,
    totalLevy,
  };
};

// ---------------------------------------------------------------------------
// 4. New Zealand Self Employed Tax Calculator
// ---------------------------------------------------------------------------

const newZealandSelfEmployedTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const netProfit = Math.max(0, safeNumber(values.netProfit));
  const industryTier = safeNumber(values.industryTier, 0);

  const incomeTax = progressiveTax(netProfit, NZ_BRACKETS_2026);

  const liableEarnings = accLiableEarnings(netProfit, true);
  const earnerLevy = liableEarnings * ACC_LEVY_RATE_2026;
  const workLevy = liableEarnings * (WORK_LEVY_RATE_BY_TIER[industryTier] ?? WORK_LEVY_RATE_BY_TIER[0]);
  const workingSaferLevy = liableEarnings * WORKING_SAFER_LEVY_RATE_2026;
  const totalAccLevies = earnerLevy + workLevy + workingSaferLevy;

  const totalTaxAndLevies = incomeTax + totalAccLevies;
  const netProfitAfterTax = netProfit - totalTaxAndLevies;

  return {
    incomeTax,
    totalAccLevies,
    totalTaxAndLevies,
    netProfitAfterTax,
  };
};

// ---------------------------------------------------------------------------
// 5. New Zealand Contractor Tax Calculator (schedular payments)
// ---------------------------------------------------------------------------

const newZealandContractorTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const contractPayment = Math.max(0, safeNumber(values.contractPayment));
  const hasFiledIr330c = safeNumber(values.hasFiledIr330c, 1) === 1;
  const electedRatePercent = safeNumber(values.electedRate, 20);

  const withholdingRate = hasFiledIr330c ? electedRatePercent / 100 : CONTRACTOR_NO_NOTIFICATION_RATE;
  const withheldTax = contractPayment * withholdingRate;
  const netPayment = contractPayment - withheldTax;

  return {
    withholdingRate: withholdingRate * 100,
    withheldTax,
    netPayment,
  };
};

// ---------------------------------------------------------------------------
// 6. New Zealand Rental Income Tax Calculator
// ---------------------------------------------------------------------------

const newZealandRentalIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualRentalIncome = Math.max(0, safeNumber(values.annualRentalIncome));
  const mortgageInterest = Math.max(0, safeNumber(values.mortgageInterest));
  const otherExpenses = Math.max(0, safeNumber(values.otherExpenses));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));

  // Mortgage interest is 100% deductible for 2026/27 (fully restored from
  // 1 April 2025) — see file header.
  const rentalProfit = annualRentalIncome - mortgageInterest - otherExpenses;

  // Residential rental losses are ring-fenced — they can't offset other
  // income, only carry forward against future rental profit — so a loss
  // here produces $0 tax now rather than a negative-tax refund.
  const taxableRentalProfit = Math.max(0, rentalProfit);
  const taxOnRental = stackedTax(otherTaxableIncome, taxableRentalProfit, NZ_BRACKETS_2026);
  const netRentalIncome = rentalProfit - taxOnRental;

  return {
    rentalProfit,
    taxOnRental,
    netRentalIncome,
    lossCarriedForward: rentalProfit < 0 ? -rentalProfit : 0,
  };
};

// ---------------------------------------------------------------------------
// 7. New Zealand Dividend Tax Calculator (imputation credits)
// ---------------------------------------------------------------------------

const COMPANY_TAX_RATE_2026 = 0.28;
const IMPUTATION_GROSSUP_DIVISOR = 1 - COMPANY_TAX_RATE_2026; // 0.72

const newZealandDividendTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const cashDividend = Math.max(0, safeNumber(values.cashDividend));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));
  const isFullyImputed = safeNumber(values.isFullyImputed, 1) === 1;

  const grossedUpDividend = isFullyImputed ? cashDividend / IMPUTATION_GROSSUP_DIVISOR : cashDividend;
  const imputationCredit = isFullyImputed ? grossedUpDividend * COMPANY_TAX_RATE_2026 : 0;

  const taxOnGrossedUp = stackedTax(otherTaxableIncome, grossedUpDividend, NZ_BRACKETS_2026);
  const netTax = Math.max(0, taxOnGrossedUp - imputationCredit);
  // Imputation credits are non-refundable to an individual shareholder —
  // any excess over the tax liability they generated is forfeited, not
  // paid out in cash (see file header).
  const excessCreditForfeited = Math.max(0, imputationCredit - taxOnGrossedUp);

  return {
    grossedUpDividend,
    imputationCredit,
    taxOnGrossedUp,
    netTax,
    excessCreditForfeited,
  };
};

// ---------------------------------------------------------------------------
// 8. New Zealand Capital Gains Tax Calculator (bright-line test)
// ---------------------------------------------------------------------------

const newZealandCapitalGainsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const monthsHeld = Math.max(0, safeNumber(values.monthsHeld));
  const gainAmount = Math.max(0, safeNumber(values.gainAmount));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));
  const isMainHome = safeNumber(values.isMainHome) === 1;

  const brightLineApplies = !isMainHome && monthsHeld < BRIGHT_LINE_MONTHS_2026;
  const taxableGain = brightLineApplies ? gainAmount : 0;
  const taxOnGain = stackedTax(otherTaxableIncome, taxableGain, NZ_BRACKETS_2026);
  const netProceeds = gainAmount - taxOnGain;
  const effectiveRate = gainAmount > 0 ? (taxOnGain / gainAmount) * 100 : 0;

  return {
    brightLineApplies: brightLineApplies ? 1 : 0,
    taxableGain,
    taxOnGain,
    netProceeds,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 9. New Zealand Payroll Tax Calculator (Employer PAYE & Payroll Obligations
//    — NZ has no separate "payroll tax"; see file header)
// ---------------------------------------------------------------------------

const newZealandPayrollTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const employerKiwiSaverRatePercent = safeNumber(values.employerKiwiSaverRate, 3.5);
  const industryTier = safeNumber(values.industryTier, 0);

  const employerKiwiSaverRate = Math.max(KIWISAVER_MIN_RATE_2026, employerKiwiSaverRatePercent / 100);
  const employerKiwiSaverContribution = annualSalary * employerKiwiSaverRate;

  const esctRate = esctRateFor(annualSalary + employerKiwiSaverContribution);
  const esctAmount = employerKiwiSaverContribution * esctRate;

  const liableEarnings = Math.min(annualSalary, ACC_LEVY_CAP_2026);
  const accWorkLevy = liableEarnings * (WORK_LEVY_RATE_BY_TIER[industryTier] ?? WORK_LEVY_RATE_BY_TIER[0]);
  const accWorkingSaferLevy = liableEarnings * WORKING_SAFER_LEVY_RATE_2026;

  const totalEmployerObligations = employerKiwiSaverContribution + esctAmount + accWorkLevy + accWorkingSaferLevy;
  const totalEmploymentCost = annualSalary + totalEmployerObligations;

  return {
    employerKiwiSaverContribution,
    esctAmount,
    accWorkLevy,
    accWorkingSaferLevy,
    totalEmployerObligations,
    totalEmploymentCost,
  };
};

// ---------------------------------------------------------------------------
// 10. New Zealand KiwiSaver Tax Calculator
// ---------------------------------------------------------------------------

const newZealandKiwiSaverTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const employeeRatePercent = safeNumber(values.employeeContributionRate, 3.5);
  const employerRatePercent = safeNumber(values.employerContributionRate, 3.5);

  const employeeRate = Math.max(KIWISAVER_MIN_RATE_2026, employeeRatePercent / 100);
  const employerRate = Math.max(KIWISAVER_MIN_RATE_2026, employerRatePercent / 100);

  const employeeContribution = annualSalary * employeeRate;
  const employerContributionGross = annualSalary * employerRate;

  const esctRate = esctRateFor(annualSalary + employerContributionGross);
  const esctWithheld = employerContributionGross * esctRate;
  const employerContributionNet = employerContributionGross - esctWithheld;

  const totalIntoAccount = employeeContribution + employerContributionNet;
  const employeeTakeHomeReduction = employeeContribution;

  return {
    employeeContribution,
    employerContributionGross,
    esctWithheld,
    employerContributionNet,
    totalIntoAccount,
    employeeTakeHomeReduction,
  };
};

export const newZealandExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "new-zealand-paye-calculator": newZealandPayeCalculator,
  "new-zealand-gst-calculator": newZealandGstCalculator,
  "new-zealand-acc-levy-calculator": newZealandAccLevyCalculator,
  "new-zealand-self-employed-tax-calculator": newZealandSelfEmployedTaxCalculator,
  "new-zealand-contractor-tax-calculator": newZealandContractorTaxCalculator,
  "new-zealand-rental-income-tax-calculator": newZealandRentalIncomeTaxCalculator,
  "new-zealand-dividend-tax-calculator": newZealandDividendTaxCalculator,
  "new-zealand-capital-gains-tax-calculator": newZealandCapitalGainsTaxCalculator,
  "new-zealand-payroll-tax-calculator": newZealandPayrollTaxCalculator,
  "new-zealand-kiwisaver-tax-calculator": newZealandKiwiSaverTaxCalculator,
};
