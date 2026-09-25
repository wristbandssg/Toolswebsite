/**
 * US Federal "Tax Calculators" batch — 30 SEO-variant tools filed directly
 * under the "Tax Calculators" category (slug "tax-calculators"), alongside
 * its 12 existing country/state sub-categories (see
 * prisma/reparent-tool-categories-under-finance.ts). These are a
 * NATIONAL-BASELINE complement to the per-state calculators in
 * calc-engine-us.ts: federal income tax + FICA only, no state tax line —
 * for a visitor who wants a generic/federal-only answer without picking a
 * state.
 *
 * Split out of calc-engine-us.ts on purpose: that file is state-by-state
 * payroll math (federal + a specific state's own tax), where every
 * calculator returns the same "paycheck breakdown" shape. This file's 30
 * tools are a much more varied family — some are paycheck breakdowns, some
 * are pure income-tax-return math, some are single-purpose lookups (bracket,
 * effective rate, refund) — so it gets its own file rather than growing
 * calc-engine-us.ts (already 4000+ lines) further.
 *
 * FEDERAL FIGURES (2026, same source and values as calc-engine-us.ts — kept
 * in sync by hand since each country/grouping file owns its own copy of
 * these constants by convention; see that file's header for the same note):
 *   - Tax brackets: IRS Rev. Proc. 2025-32 (2026 inflation adjustments,
 *     including the One Big Beautiful Bill amendments).
 *   - Standard deduction: same source.
 *   - Social Security wage base: SSA's 2026 announcement ($184,500).
 *   - FICA rates: 6.2% Social Security (employee), 1.45% Medicare, +0.9%
 *     Additional Medicare above a filing-status-dependent threshold.
 *   - Self-employment (SECA) tax: 12.4% Social Security + 2.9% Medicare on
 *     92.35% of net self-employment earnings (IRC §1401), same wage base
 *     and Additional Medicare rules as above, with half of SE tax deductible
 *     above the line (IRC §164(f)) before the standard deduction.
 *   - Federal supplemental wage (bonus/commission) withholding: flat 22%
 *     for total supplemental wages up to $1,000,000 in a calendar year, 37%
 *     on the portion above that (IRS Pub. 15, mandatory flat rate method).
 *
 * Every calculator here is the same "estimate-grade" model already
 * documented across the site: standard deduction only (no itemizing, no
 * credits like the Child Tax Credit), no state/local tax, no every-W-4
 * election. Good enough for a quick, free planning estimate — not a
 * substitute for a tax professional, which every tool's assumptions/FAQ
 * content says explicitly.
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

type FilingStatus = 0 | 1 | 2 | 3; // 0=Single 1=MFJ 2=MFS 3=HoH

const FEDERAL_BRACKETS_2026: Record<0 | 1 | 3, { rate: number; upTo: number }[]> = {
  0: [
    { rate: 0.1, upTo: 12400 },
    { rate: 0.12, upTo: 50400 },
    { rate: 0.22, upTo: 105700 },
    { rate: 0.24, upTo: 201775 },
    { rate: 0.32, upTo: 256225 },
    { rate: 0.35, upTo: 640600 },
    { rate: 0.37, upTo: Infinity },
  ],
  1: [
    { rate: 0.1, upTo: 24800 },
    { rate: 0.12, upTo: 100800 },
    { rate: 0.22, upTo: 211400 },
    { rate: 0.24, upTo: 403550 },
    { rate: 0.32, upTo: 512450 },
    { rate: 0.35, upTo: 768700 },
    { rate: 0.37, upTo: Infinity },
  ],
  3: [
    { rate: 0.1, upTo: 17700 },
    { rate: 0.12, upTo: 67450 },
    { rate: 0.22, upTo: 105700 },
    { rate: 0.24, upTo: 201775 },
    { rate: 0.32, upTo: 256200 },
    { rate: 0.35, upTo: 640600 },
    { rate: 0.37, upTo: Infinity },
  ],
};

const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 16100,
  1: 32200,
  2: 16100,
  3: 24150,
};

const ADDITIONAL_MEDICARE_THRESHOLD_2026: Record<FilingStatus, number> = {
  0: 200000,
  1: 250000,
  2: 125000,
  3: 200000,
};

const SOCIAL_SECURITY_WAGE_BASE_2026 = 184500;
const SOCIAL_SECURITY_RATE = 0.062;
const SELF_EMPLOYED_SOCIAL_SECURITY_RATE = 0.124;
const MEDICARE_RATE = 0.0145;
const SELF_EMPLOYED_MEDICARE_RATE = 0.029;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const SE_NET_EARNINGS_FACTOR = 0.9235; // IRC §1402(a)(12) 92.35% factor
const SUPPLEMENTAL_FLAT_RATE = 0.22;
const SUPPLEMENTAL_HIGH_RATE = 0.37;
const SUPPLEMENTAL_HIGH_RATE_THRESHOLD = 1000000;

const FILING_STATUS_VALUES: FilingStatus[] = [0, 1, 2, 3];

function normalizeFilingStatus(raw: number | undefined): FilingStatus {
  const rounded = Math.round(safeNumber(raw, 0));
  return (FILING_STATUS_VALUES as number[]).includes(rounded) ? (rounded as FilingStatus) : 0;
}

/** Married Filing Separately brackets are, by law, exactly half of MFJ's
 * dollar thresholds — derived rather than hand-copied, same as
 * calc-engine-us.ts. */
function federalBracketsFor(status: FilingStatus) {
  if (status === 2) {
    return FEDERAL_BRACKETS_2026[1].map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return FEDERAL_BRACKETS_2026[status] ?? FEDERAL_BRACKETS_2026[0];
}

function progressiveTax(taxableIncome: number, brackets: { rate: number; upTo: number }[]): number {
  let tax = 0;
  let bandFloor = 0;
  for (const band of brackets) {
    if (taxableIncome <= bandFloor) break;
    const amountInBand = Math.min(taxableIncome, band.upTo) - bandFloor;
    if (amountInBand > 0) tax += amountInBand * band.rate;
    bandFloor = band.upTo;
    if (taxableIncome <= band.upTo) break;
  }
  return tax;
}

/** The marginal rate that would apply to the NEXT dollar of taxable income —
 * used by the Tax Bracket / Effective Tax Rate / Second Job calculators. */
function marginalRateAt(taxableIncome: number, brackets: { rate: number; upTo: number }[]): number {
  for (const band of brackets) {
    if (taxableIncome < band.upTo) return band.rate;
  }
  return brackets[brackets.length - 1]?.rate ?? 0;
}

function federalIncomeTax(grossIncome: number, filingStatus: FilingStatus): { tax: number; taxableIncome: number } {
  const taxableIncome = Math.max(0, grossIncome - STANDARD_DEDUCTION_2026[filingStatus]);
  return { tax: progressiveTax(taxableIncome, federalBracketsFor(filingStatus)), taxableIncome };
}

function ficaFor(wages: number, filingStatus: FilingStatus): { socialSecurity: number; medicare: number } {
  const socialSecurityWages = Math.min(wages, SOCIAL_SECURITY_WAGE_BASE_2026);
  const socialSecurity = socialSecurityWages * SOCIAL_SECURITY_RATE;
  const additionalMedicareThreshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
  const medicare = wages * MEDICARE_RATE + Math.max(0, wages - additionalMedicareThreshold) * ADDITIONAL_MEDICARE_RATE;
  return { socialSecurity, medicare };
}

// ---------------------------------------------------------------------------
// Core paycheck breakdown — the shared engine behind the 8 "core family"
// salary/paycheck tools (Salary Tax, Take Home Pay, Net Salary, Annual
// Salary Tax, Paycheck Tax, Payroll Tax, Salary Withholding, Salary After
// Tax Calculators). Same shape/inputs as the Nevada calculator in
// calc-engine-us.ts, minus the (always-zero) state tax line, since this is
// the national-baseline version.
// ---------------------------------------------------------------------------

function computePaycheck(values: {
  annualSalary: number;
  periodsPerYear: number;
  filingStatus: FilingStatus;
  preTaxPerPeriod: number;
  postTaxPerPeriod: number;
  extraWithholdingPerPeriod: number;
}) {
  const annualPreTax = values.preTaxPerPeriod * values.periodsPerYear;
  const annualPostTax = values.postTaxPerPeriod * values.periodsPerYear;
  const annualExtraWithholding = values.extraWithholdingPerPeriod * values.periodsPerYear;

  const taxableAnnualWages = Math.max(0, values.annualSalary - annualPreTax);
  const { tax: baseFederalTax } = federalIncomeTax(taxableAnnualWages, values.filingStatus);
  const annualFederalIncomeTax = baseFederalTax + annualExtraWithholding;
  const { socialSecurity: annualSocialSecurityTax, medicare: annualMedicareTax } = ficaFor(
    taxableAnnualWages,
    values.filingStatus
  );

  const annualTaxesTotal = annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, values.annualSalary - annualTotalDeductions);

  return {
    annualSalary: values.annualSalary,
    grossPayPerPeriod: values.annualSalary / values.periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / values.periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / values.periodsPerYear,
    medicareTax: annualMedicareTax / values.periodsPerYear,
    totalDeductions: annualTotalDeductions / values.periodsPerYear,
    netPayPerPeriod: annualNetPay / values.periodsPerYear,
    annualNetPay,
    annualFederalIncomeTax,
    annualSocialSecurityTax,
    annualMedicareTax,
  };
}

function readPaycheckInputs(values: Record<string, number>) {
  return {
    annualSalary: Math.max(0, safeNumber(values.annualSalary)),
    periodsPerYear: safeNumber(values.payFrequency, 26) || 26,
    filingStatus: normalizeFilingStatus(values.filingStatus),
    preTaxPerPeriod: Math.max(0, safeNumber(values.preTaxDeductions)),
    postTaxPerPeriod: Math.max(0, safeNumber(values.postTaxDeductions)),
    extraWithholdingPerPeriod: Math.max(0, safeNumber(values.extraWithholding)),
  };
}

const paycheckCalculator: CustomCalculator = (values) => {
  const r = computePaycheck(readPaycheckInputs(values));
  return {
    grossPayPerPeriod: r.grossPayPerPeriod,
    federalIncomeTax: r.federalIncomeTax,
    socialSecurityTax: r.socialSecurityTax,
    medicareTax: r.medicareTax,
    totalDeductions: r.totalDeductions,
    netPayPerPeriod: r.netPayPerPeriod,
    annualNetPay: r.annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Period-salary variants (Monthly/Weekly/Biweekly Salary Tax Calculators) —
// same math as the core paycheck engine, but the visitor enters a per-period
// salary (their monthly/weekly/biweekly pay) instead of an annual figure, so
// it's annualized first. A small factory avoids writing the same function
// three times.
// ---------------------------------------------------------------------------

function makePeriodSalaryCalculator(periodsPerYear: number): CustomCalculator {
  return (values) => {
    const periodSalary = Math.max(0, safeNumber(values.periodSalary));
    const r = computePaycheck({
      annualSalary: periodSalary * periodsPerYear,
      periodsPerYear,
      filingStatus: normalizeFilingStatus(values.filingStatus),
      preTaxPerPeriod: Math.max(0, safeNumber(values.preTaxDeductions)),
      postTaxPerPeriod: Math.max(0, safeNumber(values.postTaxDeductions)),
      extraWithholdingPerPeriod: Math.max(0, safeNumber(values.extraWithholding)),
    });
    return {
      grossPayPerPeriod: r.grossPayPerPeriod,
      federalIncomeTax: r.federalIncomeTax,
      socialSecurityTax: r.socialSecurityTax,
      medicareTax: r.medicareTax,
      totalDeductions: r.totalDeductions,
      netPayPerPeriod: r.netPayPerPeriod,
      annualNetPay: r.annualNetPay,
    };
  };
}

const monthlySalaryCalculator = makePeriodSalaryCalculator(12);
const weeklySalaryCalculator = makePeriodSalaryCalculator(52);
const biweeklySalaryCalculator = makePeriodSalaryCalculator(26);

// ---------------------------------------------------------------------------
// Gross Salary Calculator — the reverse problem: the visitor tells us the
// take-home (net) pay they want per paycheck, and this solves for the
// annual gross salary that would produce it. Tax isn't linear (brackets +
// the Additional Medicare threshold), so this bisects rather than inverting
// the formula algebraically — 60 iterations comfortably converges to
// sub-cent precision for any realistic salary.
// ---------------------------------------------------------------------------

const grossSalaryCalculator: CustomCalculator = (values) => {
  const desiredNetPerPeriod = Math.max(0, safeNumber(values.desiredNetPay));
  const periodsPerYear = safeNumber(values.payFrequency, 26) || 26;
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));

  const netForGross = (annualSalary: number) =>
    computePaycheck({
      annualSalary,
      periodsPerYear,
      filingStatus,
      preTaxPerPeriod,
      postTaxPerPeriod,
      extraWithholdingPerPeriod: 0,
    }).netPayPerPeriod;

  let lo = 0;
  let hi = Math.max(desiredNetPerPeriod * periodsPerYear * 3, 50000);
  // Make sure `hi` is actually high enough to bracket the answer before
  // bisecting — gross pay is always >= net pay, so this converges fast.
  for (let guard = 0; guard < 40 && netForGross(hi) < desiredNetPerPeriod; guard++) {
    hi *= 2;
  }
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (netForGross(mid) < desiredNetPerPeriod) lo = mid;
    else hi = mid;
  }
  const requiredAnnualGross = hi;
  const r = computePaycheck({
    annualSalary: requiredAnnualGross,
    periodsPerYear,
    filingStatus,
    preTaxPerPeriod,
    postTaxPerPeriod,
    extraWithholdingPerPeriod: 0,
  });

  return {
    requiredAnnualGross,
    requiredGrossPerPeriod: r.grossPayPerPeriod,
    federalIncomeTax: r.federalIncomeTax,
    socialSecurityTax: r.socialSecurityTax,
    medicareTax: r.medicareTax,
    netPayPerPeriod: r.netPayPerPeriod,
  };
};

// ---------------------------------------------------------------------------
// Bonus / Commission Tax Calculator — supplemental wages, taxed federally
// under the IRS's mandatory flat-rate method (22% up to $1M of supplemental
// wages in the year, 37% on the excess) rather than the regular paycheck
// brackets, plus FICA on the same amount.
// ---------------------------------------------------------------------------

const supplementalWageCalculator: CustomCalculator = (values) => {
  const supplementalAmount = Math.max(0, safeNumber(values.supplementalAmount));
  const priorYtdSupplemental = Math.max(0, safeNumber(values.priorYtdSupplemental));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const alreadyOverThreshold = Math.max(0, priorYtdSupplemental - SUPPLEMENTAL_HIGH_RATE_THRESHOLD);
  const roomAtFlatRate = Math.max(0, SUPPLEMENTAL_HIGH_RATE_THRESHOLD - priorYtdSupplemental);
  const atFlatRate = alreadyOverThreshold > 0 ? 0 : Math.min(supplementalAmount, roomAtFlatRate);
  const atHighRate = supplementalAmount - atFlatRate;

  const federalWithholding = atFlatRate * SUPPLEMENTAL_FLAT_RATE + atHighRate * SUPPLEMENTAL_HIGH_RATE;
  const { socialSecurity, medicare } = ficaFor(supplementalAmount, filingStatus);
  const totalWithholding = federalWithholding + socialSecurity + medicare;
  const netAmount = Math.max(0, supplementalAmount - totalWithholding);

  return {
    grossAmount: supplementalAmount,
    federalWithholding,
    socialSecurityTax: socialSecurity,
    medicareTax: medicare,
    totalWithholding,
    netAmount,
  };
};

// ---------------------------------------------------------------------------
// Overtime Tax Calculator — a weekly hourly-pay breakdown: regular pay for
// up to the entered regular hours, overtime pay at 1.5x for overtime hours,
// and the extra federal tax + FICA the overtime specifically adds (found by
// running the paycheck engine with and without the OT pay and taking the
// difference, since tax is progressive — the OT dollars are the "last"
// dollars earned that week, taxed at the marginal rate).
// ---------------------------------------------------------------------------

const overtimeCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate));
  const regularHours = Math.max(0, safeNumber(values.regularHours, 40));
  const overtimeHours = Math.max(0, safeNumber(values.overtimeHours));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const regularWeeklyPay = hourlyRate * regularHours;
  const overtimeWeeklyPay = hourlyRate * 1.5 * overtimeHours;
  const totalWeeklyPay = regularWeeklyPay + overtimeWeeklyPay;

  const withOvertime = computePaycheck({
    annualSalary: totalWeeklyPay * 52,
    periodsPerYear: 52,
    filingStatus,
    preTaxPerPeriod: 0,
    postTaxPerPeriod: 0,
    extraWithholdingPerPeriod: 0,
  });
  const withoutOvertime = computePaycheck({
    annualSalary: regularWeeklyPay * 52,
    periodsPerYear: 52,
    filingStatus,
    preTaxPerPeriod: 0,
    postTaxPerPeriod: 0,
    extraWithholdingPerPeriod: 0,
  });

  const overtimeTaxWithheld = Math.max(
    0,
    withOvertime.federalIncomeTax +
      withOvertime.socialSecurityTax +
      withOvertime.medicareTax -
      (withoutOvertime.federalIncomeTax + withoutOvertime.socialSecurityTax + withoutOvertime.medicareTax)
  );
  const overtimeNetPay = Math.max(0, overtimeWeeklyPay - overtimeTaxWithheld);

  return {
    regularWeeklyPay,
    overtimeWeeklyPay,
    totalWeeklyPay,
    overtimeTaxWithheld,
    overtimeNetPay,
    totalNetWeeklyPay: withOvertime.netPayPerPeriod,
  };
};

// ---------------------------------------------------------------------------
// Second Job Tax Calculator — the common real-world question: "if I take a
// second job, what tax rate applies to it?" Since federal tax is
// progressive on TOTAL income, the second job's income stacks on top of the
// first and gets taxed starting at the first job's marginal bracket, not
// from $0 again — this finds that marginal rate and the actual extra tax +
// FICA the second job adds.
// ---------------------------------------------------------------------------

const secondJobCalculator: CustomCalculator = (values) => {
  const primaryAnnualIncome = Math.max(0, safeNumber(values.primaryAnnualIncome));
  const secondJobAnnualIncome = Math.max(0, safeNumber(values.secondJobAnnualIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const brackets = federalBracketsFor(filingStatus);
  const deduction = STANDARD_DEDUCTION_2026[filingStatus];
  const primaryTaxableIncome = Math.max(0, primaryAnnualIncome - deduction);
  const combinedTaxableIncome = Math.max(0, primaryAnnualIncome + secondJobAnnualIncome - deduction);

  const taxOnPrimaryAlone = progressiveTax(primaryTaxableIncome, brackets);
  const taxOnCombined = progressiveTax(combinedTaxableIncome, brackets);
  const additionalFederalTax = Math.max(0, taxOnCombined - taxOnPrimaryAlone);
  const marginalRateOnSecondJob = marginalRateAt(primaryTaxableIncome, brackets);

  // Social Security on the second job only applies to whatever room is left
  // under the annual wage base after the primary job's wages.
  const remainingSocialSecurityWageBase = Math.max(0, SOCIAL_SECURITY_WAGE_BASE_2026 - primaryAnnualIncome);
  const secondJobSocialSecurityWages = Math.min(secondJobAnnualIncome, remainingSocialSecurityWageBase);
  const socialSecurityTax = secondJobSocialSecurityWages * SOCIAL_SECURITY_RATE;
  const additionalMedicareThreshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
  const combinedWages = primaryAnnualIncome + secondJobAnnualIncome;
  const medicareTax =
    secondJobAnnualIncome * MEDICARE_RATE +
    Math.max(0, combinedWages - additionalMedicareThreshold) *
      ADDITIONAL_MEDICARE_RATE *
      (secondJobAnnualIncome / Math.max(combinedWages, 1));

  const totalSecondJobTax = additionalFederalTax + socialSecurityTax + medicareTax;
  const netSecondJobIncome = Math.max(0, secondJobAnnualIncome - totalSecondJobTax);

  return {
    marginalRateOnSecondJob: marginalRateOnSecondJob * 100,
    additionalFederalTax,
    socialSecurityTax,
    medicareTax,
    totalSecondJobTax,
    netSecondJobIncome,
  };
};

// ---------------------------------------------------------------------------
// Income Tax family (engine "a") — the shared full-return-style engine
// behind Income Tax, Individual Income Tax, Personal Income Tax, and
// Retirement Income Tax Calculators: gross taxable income (wages, or
// pension/401(k)/IRA withdrawals for the retirement variant) minus the
// standard deduction, run through the 2026 brackets.
// ---------------------------------------------------------------------------

const incomeTaxCalculator: CustomCalculator = (values) => {
  const grossIncome = Math.max(0, safeNumber(values.grossIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const deduction = STANDARD_DEDUCTION_2026[filingStatus];
  const { tax, taxableIncome } = federalIncomeTax(grossIncome, filingStatus);
  const afterTaxIncome = Math.max(0, grossIncome - tax);
  const effectiveRate = grossIncome > 0 ? (tax / grossIncome) * 100 : 0;
  const marginalRate = marginalRateAt(taxableIncome, federalBracketsFor(filingStatus)) * 100;

  return {
    standardDeduction: deduction,
    taxableIncome,
    federalTax: tax,
    effectiveRate,
    marginalRate,
    afterTaxIncome,
  };
};

// ---------------------------------------------------------------------------
// Self-employment family (engine "b") — Business Income Tax and Freelancer
// Income Tax Calculators: net self-employment earnings are subject to BOTH
// self-employment tax (SECA — Social Security + Medicare, since there's no
// employer to split it with) and ordinary federal income tax, with half of
// the SE tax deductible above the line before the standard deduction.
// ---------------------------------------------------------------------------

const selfEmploymentTaxCalculator: CustomCalculator = (values) => {
  const netBusinessIncome = Math.max(0, safeNumber(values.netBusinessIncome));
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const seTaxableEarnings = netBusinessIncome * SE_NET_EARNINGS_FACTOR;
  const socialSecurityBaseUsed = Math.min(seTaxableEarnings, SOCIAL_SECURITY_WAGE_BASE_2026);
  const seSocialSecurityTax = socialSecurityBaseUsed * SELF_EMPLOYED_SOCIAL_SECURITY_RATE;
  const additionalMedicareThreshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
  const combinedEarningsForMedicare = seTaxableEarnings + otherIncome;
  const seMedicareTax =
    seTaxableEarnings * SELF_EMPLOYED_MEDICARE_RATE +
    Math.max(0, combinedEarningsForMedicare - additionalMedicareThreshold) * ADDITIONAL_MEDICARE_RATE;
  const selfEmploymentTax = seSocialSecurityTax + seMedicareTax;

  const deduction = STANDARD_DEDUCTION_2026[filingStatus];
  const halfSeTaxDeduction = selfEmploymentTax / 2;
  const incomeTaxableAmount = Math.max(
    0,
    netBusinessIncome + otherIncome - halfSeTaxDeduction - deduction
  );
  const federalIncomeTaxOwed = progressiveTax(incomeTaxableAmount, federalBracketsFor(filingStatus));

  const totalFederalTax = selfEmploymentTax + federalIncomeTaxOwed;
  const afterTaxIncome = Math.max(0, netBusinessIncome + otherIncome - totalFederalTax);

  return {
    selfEmploymentTax,
    halfSeTaxDeduction,
    federalIncomeTax: federalIncomeTaxOwed,
    totalFederalTax,
    afterTaxIncome,
  };
};

// ---------------------------------------------------------------------------
// Incremental-income family (engine "c") — Rental Income Tax, Foreign
// Income Tax, and Investment Income Tax Calculators: these all answer the
// same real question ("how much extra federal tax does THIS income add on
// top of what I already earn?"), since none of them are a full return by
// themselves. Because federal tax is progressive, the extra income is taxed
// starting at the rate your OTHER income already put you at, not from $0.
// ---------------------------------------------------------------------------

const incrementalIncomeTaxCalculator: CustomCalculator = (values) => {
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const additionalIncome = Math.max(0, safeNumber(values.additionalIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const { tax: taxWithoutAdditional } = federalIncomeTax(otherIncome, filingStatus);
  const { tax: taxWithAdditional } = federalIncomeTax(otherIncome + additionalIncome, filingStatus);
  const additionalFederalTax = Math.max(0, taxWithAdditional - taxWithoutAdditional);
  const effectiveRateOnAdditional = additionalIncome > 0 ? (additionalFederalTax / additionalIncome) * 100 : 0;
  const netAdditionalIncome = Math.max(0, additionalIncome - additionalFederalTax);

  return {
    taxWithoutAdditionalIncome: taxWithoutAdditional,
    taxWithAdditionalIncome: taxWithAdditional,
    additionalFederalTax,
    effectiveRateOnAdditional,
    netAdditionalIncome,
  };
};

// ---------------------------------------------------------------------------
// Single-purpose lookups — Taxable Income, Tax Liability, Tax Refund, Tax
// Bracket, and Effective Tax Rate Calculators. Each is a small, focused
// slice of the same federal math above, exposed as its own tool because
// that's literally what a visitor searches for.
// ---------------------------------------------------------------------------

const taxableIncomeCalculator: CustomCalculator = (values) => {
  const grossIncome = Math.max(0, safeNumber(values.grossIncome));
  const otherAdjustments = Math.max(0, safeNumber(values.otherAdjustments));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const deduction = STANDARD_DEDUCTION_2026[filingStatus];
  const adjustedGrossIncome = Math.max(0, grossIncome - otherAdjustments);
  const taxableIncome = Math.max(0, adjustedGrossIncome - deduction);

  return {
    adjustedGrossIncome,
    standardDeduction: deduction,
    taxableIncome,
  };
};

const taxLiabilityCalculator: CustomCalculator = (values) => {
  const taxableIncome = Math.max(0, safeNumber(values.taxableIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const brackets = federalBracketsFor(filingStatus);
  const federalTax = progressiveTax(taxableIncome, brackets);
  const marginalRate = marginalRateAt(taxableIncome, brackets) * 100;
  const effectiveRate = taxableIncome > 0 ? (federalTax / taxableIncome) * 100 : 0;
  const afterTaxIncome = Math.max(0, taxableIncome - federalTax);

  return { federalTax, marginalRate, effectiveRate, afterTaxIncome };
};

const taxRefundCalculator: CustomCalculator = (values) => {
  const grossIncome = Math.max(0, safeNumber(values.grossIncome));
  const federalTaxWithheld = Math.max(0, safeNumber(values.federalTaxWithheld));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const { tax: actualTaxOwed, taxableIncome } = federalIncomeTax(grossIncome, filingStatus);
  const difference = federalTaxWithheld - actualTaxOwed;
  const refundAmount = Math.max(0, difference);
  const amountOwed = Math.max(0, -difference);

  return {
    taxableIncome,
    actualTaxOwed,
    federalTaxWithheld,
    refundAmount,
    amountOwed,
  };
};

const taxBracketCalculator: CustomCalculator = (values) => {
  const taxableIncome = Math.max(0, safeNumber(values.taxableIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const brackets = federalBracketsFor(filingStatus);
  const marginalRate = marginalRateAt(taxableIncome, brackets) * 100;
  const federalTax = progressiveTax(taxableIncome, brackets);
  const effectiveRate = taxableIncome > 0 ? (federalTax / taxableIncome) * 100 : 0;

  // How much more income fits in the current bracket before crossing into
  // the next one — a genuinely useful number for the "which bracket am I
  // in" search intent.
  let roomInBracket = Infinity;
  let bandFloor = 0;
  for (const band of brackets) {
    if (taxableIncome < band.upTo) {
      roomInBracket = band.upTo === Infinity ? 0 : band.upTo - taxableIncome;
      break;
    }
    bandFloor = band.upTo;
  }
  void bandFloor;

  return {
    marginalRate,
    federalTax,
    effectiveRate,
    roomInBracket: Number.isFinite(roomInBracket) ? roomInBracket : 0,
  };
};

const effectiveTaxRateCalculator: CustomCalculator = (values) => {
  const grossIncome = Math.max(0, safeNumber(values.grossIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const { tax, taxableIncome } = federalIncomeTax(grossIncome, filingStatus);
  const effectiveRate = grossIncome > 0 ? (tax / grossIncome) * 100 : 0;
  const marginalRate = marginalRateAt(taxableIncome, federalBracketsFor(filingStatus)) * 100;

  return {
    federalTax: tax,
    effectiveRate,
    marginalRate,
    afterTaxIncome: Math.max(0, grossIncome - tax),
  };
};

// ---------------------------------------------------------------------------
// Registry — keyed by slug (see prisma/create-us-tax-salary-calculators.ts,
// which must stay in sync with these keys). Several slugs intentionally
// point at the exact same function: the calculators genuinely share math,
// and only the copy/SEO/framing around them differs from tool to tool.
// ---------------------------------------------------------------------------

export const usTaxSalaryCustomCalculators: Record<string, CustomCalculator> = {
  // Income Tax family
  "income-tax-calculator": incomeTaxCalculator,
  "individual-income-tax-calculator": incomeTaxCalculator,
  "personal-income-tax-calculator": incomeTaxCalculator,
  "retirement-income-tax-calculator": incomeTaxCalculator,
  "business-income-tax-calculator": selfEmploymentTaxCalculator,
  "freelancer-income-tax-calculator": selfEmploymentTaxCalculator,
  "rental-income-tax-calculator": incrementalIncomeTaxCalculator,
  "foreign-income-tax-calculator": incrementalIncomeTaxCalculator,
  "investment-income-tax-calculator": incrementalIncomeTaxCalculator,
  "taxable-income-calculator": taxableIncomeCalculator,
  "tax-liability-calculator": taxLiabilityCalculator,
  "tax-refund-calculator": taxRefundCalculator,
  "tax-bracket-calculator": taxBracketCalculator,
  "effective-tax-rate-calculator": effectiveTaxRateCalculator,

  // Salary Tax family
  "salary-tax-calculator": paycheckCalculator,
  "take-home-pay-calculator": paycheckCalculator,
  "net-salary-calculator": paycheckCalculator,
  "annual-salary-tax-calculator": paycheckCalculator,
  "paycheck-tax-calculator": paycheckCalculator,
  "payroll-tax-calculator": paycheckCalculator,
  "salary-withholding-calculator": paycheckCalculator,
  "salary-after-tax-calculator": paycheckCalculator,
  "gross-salary-calculator": grossSalaryCalculator,
  "monthly-salary-tax-calculator": monthlySalaryCalculator,
  "weekly-salary-tax-calculator": weeklySalaryCalculator,
  "biweekly-salary-tax-calculator": biweeklySalaryCalculator,
  "bonus-tax-calculator": supplementalWageCalculator,
  "commission-tax-calculator": supplementalWageCalculator,
  "overtime-tax-calculator": overtimeCalculator,
  "second-job-tax-calculator": secondJobCalculator,
};
