/**
 * Canada extended batch — 15 more Canada-specific tools filed under the
 * existing "Canada Tax & Salary Calculators" category (slug
 * "canada-tax-salary-calculators", created by the provincial income tax
 * tool scripts, e.g. create-alberta-tax-tool.ts), alongside the 13
 * province/territory income tax calculators in calc-engine-canada.ts.
 *
 * This file deliberately does NOT import anything from calc-engine-
 * canada.ts — same per-file constant/helper duplication convention used
 * everywhere else on this site — so touching this file can never break
 * any of the 13 existing provincial calculators, and vice versa.
 *
 * SCOPE: every tool here that involves income tax (Capital Gains,
 * Dividend, Self Employment, Rental Income, Refund, Owing) is FEDERAL TAX
 * ONLY — same "national baseline" scope as calc-engine-us-tax-salary-
 * calculators.ts is to the US state calculators. Canada has 13 different
 * provincial/territorial bracket tables (see calc-engine-canada.ts), so a
 * single generic "Canada" tool can't correctly add provincial tax without
 * asking which province — visitors who want their exact combined
 * federal+provincial figure should use their own province's income tax
 * calculator instead; every tool below says so explicitly.
 *
 * FIGURES — 2026, each sourced directly from canada.ca/CRA (or the
 * relevant provincial government site where noted):
 *   - Federal brackets/BPA: same figures as calc-engine-canada.ts, this
 *     file's own copy per convention (source: CRA).
 *   - CPP: 5.95% employee/employer (11.90% self-employed) up to the
 *     $74,600 Year's Maximum Pensionable Earnings, $3,500 basic exemption;
 *     CPP2 second tier 4% employee/employer (8% self-employed) between
 *     $74,600 and the $85,000 Year's Additional Maximum Pensionable
 *     Earnings: canada.ca CPP contribution rates/maximums pages.
 *   - EI: 1.63% employee (2.28% employer, the standard 1.4× multiplier),
 *     $68,900 Maximum Insurable Earnings: canada.ca EI premium rate pages.
 *   - Capital gains inclusion rate: 50% (the proposed two-thirds increase
 *     from Budget 2024 was cancelled in March 2025 and is NOT in effect):
 *     canada.ca CRA T4037 "Capital Gains" guide.
 *   - Dividend gross-up: 38% eligible / 15% non-eligible; federal dividend
 *     tax credit: 15.0198% eligible / 9.0301% non-eligible of the
 *     grossed-up amount (longstanding enacted federal rates): canada.ca
 *     Line 12000 / Line 40425 guidance.
 *   - GST 5% (federal, all provinces); HST (Ontario 13%, Nova Scotia 14%,
 *     New Brunswick/PEI/Newfoundland & Labrador 15%); PST (British
 *     Columbia 7%, Saskatchewan 6%, Manitoba 7%): canada.ca GST/HST rate
 *     page, provincial finance ministry pages.
 *   - RRSP withdrawal / retiring allowance withholding tax (residents
 *     outside Quebec): 10% up to $5,000, 20% from $5,001–$15,000, 30%
 *     above $15,000: canada.ca lump-sum payment withholding page.
 *   - BC Property Transfer Tax (used as a representative example — PTT
 *     varies by province and some cities layer their own tax on top, e.g.
 *     Toronto's Municipal Land Transfer Tax): 1% to $200,000, 2% to $2m,
 *     3% above $2m, plus 2% further property tax on the residential
 *     portion above $3m: gov.bc.ca.
 *
 * Same "estimate-grade" model as every other calculator on this site —
 * see each tool's own Assumptions text for the full disclaimer shown to
 * visitors.
 */

import type { CustomCalculator } from "./calc-engine-types";
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

/** Tax on a SLICE of income stacking on top of `floor` — same stacking-
 * rule helper duplicated throughout this project's other tax families. */
function stackedTax(floor: number, amount: number, bands: TaxBand[]): number {
  let tax = 0;
  let remaining = Math.max(0, amount);
  let cursor = Math.max(0, floor);
  for (const band of bands) {
    if (remaining <= 0) break;
    if (cursor >= band.upTo) continue;
    const roomInBand = band.upTo - cursor;
    const amountHere = Math.min(remaining, roomInBand);
    tax += amountHere * band.rate;
    cursor += amountHere;
    remaining -= amountHere;
  }
  return tax;
}

const FEDERAL_BRACKETS_2026: TaxBand[] = [
  { rate: 0.14, upTo: 58523 },
  { rate: 0.205, upTo: 117045 },
  { rate: 0.26, upTo: 181440 },
  { rate: 0.29, upTo: 258482 },
  { rate: 0.33, upTo: Infinity },
];

const FEDERAL_LOWEST_RATE = 0.14;
const FEDERAL_BPA_MAX_2026 = 16452;
const FEDERAL_BPA_MIN_2026 = 14829;
const FEDERAL_BPA_TAPER_START_2026 = 181440;
const FEDERAL_BPA_TAPER_END_2026 = 258482;

function federalBpaFor(taxableIncome: number): number {
  if (taxableIncome <= FEDERAL_BPA_TAPER_START_2026) return FEDERAL_BPA_MAX_2026;
  if (taxableIncome >= FEDERAL_BPA_TAPER_END_2026) return FEDERAL_BPA_MIN_2026;
  const span = FEDERAL_BPA_TAPER_END_2026 - FEDERAL_BPA_TAPER_START_2026;
  const reduction =
    ((FEDERAL_BPA_MAX_2026 - FEDERAL_BPA_MIN_2026) * (taxableIncome - FEDERAL_BPA_TAPER_START_2026)) / span;
  return FEDERAL_BPA_MAX_2026 - reduction;
}

/** Federal tax payable — bracket tax minus the BPA credit, floored at $0.
 * (Canada's BPA is a non-refundable CREDIT, not a deduction from taxable
 * income — see calc-engine-canada.ts's header for why that distinction
 * matters and is modeled this way throughout this project.) */
function federalIncomeTax(taxableIncome: number): number {
  const grossTax = progressiveTax(taxableIncome, FEDERAL_BRACKETS_2026);
  const credit = federalBpaFor(taxableIncome) * FEDERAL_LOWEST_RATE;
  return Math.max(0, grossTax - credit);
}

const CPP_BASIC_EXEMPTION_2026 = 3500;
const CPP_MAX_PENSIONABLE_2026 = 74600;
const CPP_RATE_2026 = 0.0595;
const CPP2_MAX_PENSIONABLE_2026 = 85000;
const CPP2_RATE_2026 = 0.04;
const CPP_SELF_EMPLOYED_RATE_2026 = 0.119;
const CPP2_SELF_EMPLOYED_RATE_2026 = 0.08;

function cppBase(annualPay: number): number {
  return Math.max(0, Math.min(annualPay, CPP_MAX_PENSIONABLE_2026) - CPP_BASIC_EXEMPTION_2026);
}
function cpp2Base(annualPay: number): number {
  return Math.max(0, Math.min(annualPay, CPP2_MAX_PENSIONABLE_2026) - CPP_MAX_PENSIONABLE_2026);
}

const EI_MAX_INSURABLE_2026 = 68900;
const EI_RATE_EMPLOYEE_2026 = 0.0163;
const EI_RATE_EMPLOYER_2026 = 0.0228; // 1.4x employee, standard rule

function periodsFrom(raw: number | undefined): number {
  return safeNumber(raw, 12) || 12;
}

// ---------------------------------------------------------------------------
// 1. Canada CPP Calculator — the employee CPP contribution alone
//    (base tier + CPP2), standalone.
// ---------------------------------------------------------------------------

const canadaCppCalculator: CustomCalculator = (values) => {
  const annualEmploymentIncome = Math.max(0, safeNumber(values.annualEmploymentIncome));
  const periods = periodsFrom(values.payFrequency);

  const base = cppBase(annualEmploymentIncome);
  const cpp2Amount = cpp2Base(annualEmploymentIncome);
  const cppContribution = base * CPP_RATE_2026 + cpp2Amount * CPP2_RATE_2026;

  return {
    cppBaseContribution: base * CPP_RATE_2026,
    cpp2Contribution: cpp2Amount * CPP2_RATE_2026,
    totalCppContribution: cppContribution,
    perPeriodContribution: cppContribution / periods,
  };
};

// ---------------------------------------------------------------------------
// 2. Canada EI Calculator — the employee EI premium alone.
// ---------------------------------------------------------------------------

const canadaEiCalculator: CustomCalculator = (values) => {
  const annualEmploymentIncome = Math.max(0, safeNumber(values.annualEmploymentIncome));
  const periods = periodsFrom(values.payFrequency);

  const eiPremium = Math.min(annualEmploymentIncome, EI_MAX_INSURABLE_2026) * EI_RATE_EMPLOYEE_2026;

  return {
    eiPremium,
    perPeriodPremium: eiPremium / periods,
    insurableEarnings: Math.min(annualEmploymentIncome, EI_MAX_INSURABLE_2026),
  };
};

// ---------------------------------------------------------------------------
// 3. Canada Payroll Tax Calculator — the EMPLOYER's side: matching CPP
//    (base + CPP2) plus the 1.4x EI employer premium, on top of salary.
// ---------------------------------------------------------------------------

const canadaPayrollTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));

  const employerCpp = cppBase(annualSalary) * CPP_RATE_2026 + cpp2Base(annualSalary) * CPP2_RATE_2026;
  const employerEi = Math.min(annualSalary, EI_MAX_INSURABLE_2026) * EI_RATE_EMPLOYER_2026;
  const totalEmployerPayrollTax = employerCpp + employerEi;
  const totalEmploymentCost = annualSalary + totalEmployerPayrollTax;

  return {
    employerCpp,
    employerEi,
    totalEmployerPayrollTax,
    totalEmploymentCost,
  };
};

// ---------------------------------------------------------------------------
// 4. Canada Capital Gains Tax Calculator — 50% inclusion rate, taxed at
//    federal marginal rate, stacked on top of other income. FEDERAL ONLY.
// ---------------------------------------------------------------------------

const CAPITAL_GAINS_INCLUSION_RATE = 0.5;

const canadaCapitalGainsTaxCalculator: CustomCalculator = (values) => {
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const gainAmount = Math.max(0, safeNumber(values.gainAmount));

  const taxableGain = gainAmount * CAPITAL_GAINS_INCLUSION_RATE;
  const federalTaxOnGain = stackedTax(otherIncome, taxableGain, FEDERAL_BRACKETS_2026);
  const netProceeds = Math.max(0, gainAmount - federalTaxOnGain);
  const effectiveRate = gainAmount > 0 ? (federalTaxOnGain / gainAmount) * 100 : 0;

  return {
    taxableGain,
    federalTaxOnGain,
    netProceeds,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 5. Canada Dividend Tax Calculator — eligible vs non-eligible dividends,
//    gross-up + federal dividend tax credit. FEDERAL ONLY.
// ---------------------------------------------------------------------------

const ELIGIBLE_GROSSUP = 0.38;
const NON_ELIGIBLE_GROSSUP = 0.15;
const ELIGIBLE_FEDERAL_DTC_RATE = 0.150198; // of the grossed-up amount
const NON_ELIGIBLE_FEDERAL_DTC_RATE = 0.090301; // of the grossed-up amount

const canadaDividendTaxCalculator: CustomCalculator = (values) => {
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const eligibleDividends = Math.max(0, safeNumber(values.eligibleDividends));
  const nonEligibleDividends = Math.max(0, safeNumber(values.nonEligibleDividends));

  const eligibleGrossedUp = eligibleDividends * (1 + ELIGIBLE_GROSSUP);
  const nonEligibleGrossedUp = nonEligibleDividends * (1 + NON_ELIGIBLE_GROSSUP);
  const totalGrossedUp = eligibleGrossedUp + nonEligibleGrossedUp;

  const taxOnGrossedUp = stackedTax(otherIncome, totalGrossedUp, FEDERAL_BRACKETS_2026);
  const federalDividendTaxCredit =
    eligibleGrossedUp * ELIGIBLE_FEDERAL_DTC_RATE + nonEligibleGrossedUp * NON_ELIGIBLE_FEDERAL_DTC_RATE;
  const netDividendTax = Math.max(0, taxOnGrossedUp - federalDividendTaxCredit);

  const totalDividends = eligibleDividends + nonEligibleDividends;
  const effectiveRate = totalDividends > 0 ? (netDividendTax / totalDividends) * 100 : 0;

  return {
    totalGrossedUp,
    taxOnGrossedUp,
    federalDividendTaxCredit,
    netDividendTax,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 6. Canada Self Employment Tax Calculator — CPP self-employed (both
//    portions, 11.90% base + 8% CPP2). No EI unless voluntarily opted in
//    (not modeled — see this tool's FAQ).
// ---------------------------------------------------------------------------

const canadaSelfEmploymentTaxCalculator: CustomCalculator = (values) => {
  const netProfit = Math.max(0, safeNumber(values.netProfit));

  const base = cppBase(netProfit);
  const cpp2Amount = cpp2Base(netProfit);
  const cppBaseContribution = base * CPP_SELF_EMPLOYED_RATE_2026;
  const cpp2Contribution = cpp2Amount * CPP2_SELF_EMPLOYED_RATE_2026;
  const totalCppContribution = cppBaseContribution + cpp2Contribution;

  return {
    cppBaseContribution,
    cpp2Contribution,
    totalCppContribution,
    netProfitAfterCpp: Math.max(0, netProfit - totalCppContribution),
  };
};

// ---------------------------------------------------------------------------
// 7. Canada GST Calculator — 5% federal, forward or reverse.
// ---------------------------------------------------------------------------

const GST_RATE = 0.05;

const canadaGstCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const isGstInclusive = safeNumber(values.isGstInclusive) === 1;

  let netAmount: number;
  let gstAmount: number;
  let grossAmount: number;

  if (isGstInclusive) {
    netAmount = amount / (1 + GST_RATE);
    gstAmount = amount - netAmount;
    grossAmount = amount;
  } else {
    netAmount = amount;
    gstAmount = amount * GST_RATE;
    grossAmount = amount + gstAmount;
  }

  return { netAmount, gstAmount, grossAmount };
};

// ---------------------------------------------------------------------------
// 8. Canada HST Calculator — Ontario 13%, Nova Scotia 14%, New Brunswick/
//    PEI/Newfoundland & Labrador 15%, forward or reverse.
// ---------------------------------------------------------------------------

const HST_RATES: Record<number, number> = {
  0: 0.13, // Ontario
  1: 0.14, // Nova Scotia
  2: 0.15, // New Brunswick
  3: 0.15, // Prince Edward Island
  4: 0.15, // Newfoundland and Labrador
};

const canadaHstCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const province = Math.round(safeNumber(values.province, 0));
  const isHstInclusive = safeNumber(values.isHstInclusive) === 1;
  const rate = HST_RATES[province] ?? HST_RATES[0];

  let netAmount: number;
  let hstAmount: number;
  let grossAmount: number;

  if (isHstInclusive) {
    netAmount = amount / (1 + rate);
    hstAmount = amount - netAmount;
    grossAmount = amount;
  } else {
    netAmount = amount;
    hstAmount = amount * rate;
    grossAmount = amount + hstAmount;
  }

  return { netAmount, hstAmount, grossAmount, rateUsed: rate * 100 };
};

// ---------------------------------------------------------------------------
// 9. Canada PST Calculator — British Columbia 7%, Saskatchewan 6%,
//    Manitoba 7%, forward or reverse (charged alongside, not instead of,
//    the 5% GST in these provinces — see the GST Calculator for that).
// ---------------------------------------------------------------------------

const PST_RATES: Record<number, number> = {
  0: 0.07, // British Columbia
  1: 0.06, // Saskatchewan
  2: 0.07, // Manitoba
};

const canadaPstCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const province = Math.round(safeNumber(values.province, 0));
  const isPstInclusive = safeNumber(values.isPstInclusive) === 1;
  const rate = PST_RATES[province] ?? PST_RATES[0];

  let netAmount: number;
  let pstAmount: number;
  let grossAmount: number;

  if (isPstInclusive) {
    netAmount = amount / (1 + rate);
    pstAmount = amount - netAmount;
    grossAmount = amount;
  } else {
    netAmount = amount;
    pstAmount = amount * rate;
    grossAmount = amount + pstAmount;
  }

  return { netAmount, pstAmount, grossAmount, rateUsed: rate * 100 };
};

// ---------------------------------------------------------------------------
// 10. Canada Rental Income Tax Calculator — rental profit stacked on top
//     of other income at federal marginal rates. FEDERAL ONLY.
// ---------------------------------------------------------------------------

const canadaRentalIncomeTaxCalculator: CustomCalculator = (values) => {
  const annualRentalIncome = Math.max(0, safeNumber(values.annualRentalIncome));
  const allowableExpenses = Math.max(0, safeNumber(values.allowableExpenses));
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));

  const rentalProfit = Math.max(0, annualRentalIncome - allowableExpenses);
  const federalTaxOnRental = stackedTax(otherIncome, rentalProfit, FEDERAL_BRACKETS_2026);
  const netRentalIncome = Math.max(0, rentalProfit - federalTaxOnRental);

  return {
    rentalProfit,
    federalTaxOnRental,
    netRentalIncome,
  };
};

// ---------------------------------------------------------------------------
// 11. Canada Property Transfer Tax Calculator — modeled on British
//     Columbia's tiered PTT as a representative example (see this tool's
//     Assumptions for why PTT can't be one generic Canada-wide figure).
// ---------------------------------------------------------------------------

const PTT_BANDS_BC: TaxBand[] = [
  { rate: 0.01, upTo: 200000 },
  { rate: 0.02, upTo: 2000000 },
  { rate: 0.03, upTo: Infinity },
];
const PTT_FURTHER_TAX_THRESHOLD = 3000000;
const PTT_FURTHER_TAX_RATE = 0.02;

const canadaPropertyTransferTaxCalculator: CustomCalculator = (values) => {
  const propertyPrice = Math.max(0, safeNumber(values.propertyPrice));

  const baseTax = stackedTax(0, propertyPrice, PTT_BANDS_BC);
  const furtherTax = Math.max(0, propertyPrice - PTT_FURTHER_TAX_THRESHOLD) * PTT_FURTHER_TAX_RATE;
  const totalTransferTax = baseTax + furtherTax;
  const effectiveRate = propertyPrice > 0 ? (totalTransferTax / propertyPrice) * 100 : 0;

  return {
    baseTax,
    furtherTax,
    totalTransferTax,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 12. Canada Tax Refund Calculator — for employment income WITH source
//     withholding: compares tax already withheld against estimated
//     federal liability. FEDERAL ONLY.
// ---------------------------------------------------------------------------

const canadaTaxRefundCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const taxWithheldToDate = Math.max(0, safeNumber(values.taxWithheldToDate));

  const estimatedFederalTax = federalIncomeTax(annualSalary);
  const refundOrBalance = taxWithheldToDate - estimatedFederalTax;

  return {
    estimatedFederalTax,
    taxWithheldToDate,
    refundOrBalance,
  };
};

// ---------------------------------------------------------------------------
// 13. Canada Tax Owing Calculator — for income WITHOUT source withholding
//     (self-employment, investment income): estimated liability minus any
//     installments already paid. FEDERAL ONLY.
// ---------------------------------------------------------------------------

const canadaTaxOwingCalculator: CustomCalculator = (values) => {
  const totalIncome = Math.max(0, safeNumber(values.totalIncome));
  const installmentsPaid = Math.max(0, safeNumber(values.installmentsPaid));

  const estimatedFederalTax = federalIncomeTax(totalIncome);
  const balanceOwing = Math.max(0, estimatedFederalTax - installmentsPaid);

  return {
    estimatedFederalTax,
    installmentsPaid,
    balanceOwing,
  };
};

// ---------------------------------------------------------------------------
// 14. Canada Pension Tax Calculator — withholding tax on an RRSP
//     withdrawal (tiered by withdrawal size).
// ---------------------------------------------------------------------------

function lumpSumWithholdingRate(amount: number): number {
  if (amount <= 5000) return 0.1;
  if (amount <= 15000) return 0.2;
  return 0.3;
}

const canadaPensionTaxCalculator: CustomCalculator = (values) => {
  const withdrawalAmount = Math.max(0, safeNumber(values.withdrawalAmount));

  const withholdingRate = lumpSumWithholdingRate(withdrawalAmount);
  const withholdingTax = withdrawalAmount * withholdingRate;
  const netWithdrawal = withdrawalAmount - withholdingTax;

  return {
    withholdingRate: withholdingRate * 100,
    withholdingTax,
    netWithdrawal,
  };
};

// ---------------------------------------------------------------------------
// 15. Canada Severance Tax Calculator — a retiring allowance is subject to
//     the SAME tiered withholding as an RRSP withdrawal; a portion earned
//     for service before 1996 can be rolled into an RRSP tax-free.
// ---------------------------------------------------------------------------

const ELIGIBLE_ROLLOVER_PER_YEAR_PRE_1996 = 2000;

const canadaSeveranceTaxCalculator: CustomCalculator = (values) => {
  const severanceAmount = Math.max(0, safeNumber(values.severanceAmount));
  const yearsServicePre1996 = Math.max(0, safeNumber(values.yearsServicePre1996));

  const eligibleRolloverRoom = Math.min(severanceAmount, yearsServicePre1996 * ELIGIBLE_ROLLOVER_PER_YEAR_PRE_1996);
  const taxableNow = Math.max(0, severanceAmount - eligibleRolloverRoom);
  const withholdingRate = lumpSumWithholdingRate(taxableNow);
  const withholdingTax = taxableNow * withholdingRate;
  const netSeverance = severanceAmount - withholdingTax;

  return {
    eligibleRolloverRoom,
    taxableNow,
    withholdingTax,
    netSeverance,
  };
};

export const canadaExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "canada-cpp-calculator": canadaCppCalculator,
  "canada-ei-calculator": canadaEiCalculator,
  "canada-payroll-tax-calculator": canadaPayrollTaxCalculator,
  "canada-capital-gains-tax-calculator": canadaCapitalGainsTaxCalculator,
  "canada-dividend-tax-calculator": canadaDividendTaxCalculator,
  "canada-self-employment-tax-calculator": canadaSelfEmploymentTaxCalculator,
  "canada-gst-calculator": canadaGstCalculator,
  "canada-hst-calculator": canadaHstCalculator,
  "canada-pst-calculator": canadaPstCalculator,
  "canada-rental-income-tax-calculator": canadaRentalIncomeTaxCalculator,
  "canada-property-transfer-tax-calculator": canadaPropertyTransferTaxCalculator,
  "canada-tax-refund-calculator": canadaTaxRefundCalculator,
  "canada-tax-owing-calculator": canadaTaxOwingCalculator,
  "canada-pension-tax-calculator": canadaPensionTaxCalculator,
  "canada-severance-tax-calculator": canadaSeveranceTaxCalculator,
};
