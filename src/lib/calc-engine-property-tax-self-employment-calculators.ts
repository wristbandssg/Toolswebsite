/**
 * Third "Tax Calculators" batch — Property Tax (11 tools) and
 * Self-Employment Tax (13 tools), both filed directly under the Tax
 * Calculators category alongside the two earlier batches
 * (calc-engine-us-tax-salary-calculators.ts and
 * calc-engine-capital-gains-sales-vat-calculators.ts) and the 12
 * country/state sub-categories.
 *
 * Property Tax is jurisdiction-agnostic (US property tax has no federal
 * rate — it's set by county/municipality — so the visitor supplies their
 * own assessed value and rate, same design philosophy as the earlier
 * Sales Tax and VAT families). Self-Employment Tax continues this
 * category's established US-federal-only scope, reusing the same SECA
 * (Self-Employment Contributions Act) mechanics already implemented once
 * for calc-engine-us-tax-salary-calculators.ts's
 * `selfEmploymentTaxCalculator` — duplicated and narrowed here (this
 * family's version returns ONLY the SE/payroll-style tax breakdown, not a
 * combined income-tax figure, to match its distinct tool framing).
 *
 * 2026 figures used below (Social Security wage base, SE tax rates,
 * Additional Medicare thresholds, and the SEP-IRA/Solo 401(k) contribution
 * limits) were cross-checked against IRS.gov directly — see this file's
 * SEP/Solo 401(k) section for the specific constants and sources.
 */

import type { CalcInputValues, CustomCalculator } from "./calc-engine-types";
import { safeNumber, CalculationError } from "./calc-engine-types";

// ---------------------------------------------------------------------------
// Shared constants (2026)
// ---------------------------------------------------------------------------

type FilingStatus = 0 | 1 | 2 | 3; // 0=Single, 1=MFJ, 2=MFS, 3=HoH

function normalizeFilingStatus(raw: number | undefined): FilingStatus {
  const n = safeNumber(raw, 0);
  return (n === 1 || n === 2 || n === 3 ? n : 0) as FilingStatus;
}

// Same wage base/rates as calc-engine-us-tax-salary-calculators.ts and
// calc-engine-capital-gains-sales-vat-calculators.ts — kept in sync
// manually (see this codebase's established one-file-per-family pattern).
const SOCIAL_SECURITY_WAGE_BASE_2026 = 184500;
const SOCIAL_SECURITY_RATE_COMBINED = 0.124; // self-employed pays both halves
const MEDICARE_RATE_COMBINED = 0.029; // self-employed pays both halves
const ADDITIONAL_MEDICARE_RATE = 0.009;
const SE_NET_EARNINGS_FACTOR = 0.9235;

// Additional Medicare Tax (0.9%) MAGI-style thresholds — not indexed for
// inflation by law, same figures used in the two earlier batches.
const ADDITIONAL_MEDICARE_THRESHOLD_2026: Record<FilingStatus, number> = {
  0: 200000, // Single
  1: 250000, // MFJ
  2: 125000, // MFS
  3: 200000, // HoH
};

/** Full SECA self-employment tax on a given net profit, stacked on top of
 * any other Social-Security-taxed wages the filer already has this year
 * (so the 12.4% Social Security portion correctly respects the shared
 * annual wage base, and the 0.9% Additional Medicare threshold correctly
 * accounts for other income). */
function computeSelfEmploymentTax(
  netProfit: number,
  otherSsWages: number,
  otherMedicareWages: number,
  filingStatus: FilingStatus
) {
  const seNetEarnings = Math.max(0, netProfit) * SE_NET_EARNINGS_FACTOR;

  // Social Security portion: 12.4% on the SE net earnings that still fit
  // under the annual wage base, after other SS-taxed wages already used
  // some of it up.
  const ssRoomLeft = Math.max(0, SOCIAL_SECURITY_WAGE_BASE_2026 - Math.max(0, otherSsWages));
  const ssTaxableSe = Math.min(seNetEarnings, ssRoomLeft);
  const socialSecurityTax = ssTaxableSe * SOCIAL_SECURITY_RATE_COMBINED;

  // Medicare portion: 2.9%, uncapped.
  const medicareTax = seNetEarnings * MEDICARE_RATE_COMBINED;

  // Additional Medicare: 0.9% on combined SE + other Medicare wages above
  // the filing-status threshold, applied to the SE portion above the line.
  const threshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
  const combinedMedicareWages = Math.max(0, otherMedicareWages) + seNetEarnings;
  const additionalMedicareTax =
    Math.max(0, combinedMedicareWages - Math.max(threshold, Math.max(0, otherMedicareWages))) *
    ADDITIONAL_MEDICARE_RATE;

  const totalSeTax = socialSecurityTax + medicareTax + additionalMedicareTax;
  // Only the "regular" (non-Additional-Medicare) portion of SE tax gets the
  // above-the-line half deduction — Additional Medicare Tax is never
  // deductible, matching Schedule SE's actual mechanics.
  const deductibleHalf = (socialSecurityTax + medicareTax) / 2;

  return {
    seNetEarnings,
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    totalSeTax,
    deductibleHalf,
  };
}

// ---------------------------------------------------------------------------
// Property Tax family (6 functions, 11 tools)
// ---------------------------------------------------------------------------

/** rateType: 0 = percent of assessed value, 1 = mill rate (dollars per
 * $1,000 of assessed value) — the two ways US property tax bills are
 * actually quoted. */
function computePropertyTax(assessedValue: number, rate: number, rateType: number) {
  const annualTax = rateType === 1 ? assessedValue * (rate / 1000) : assessedValue * (rate / 100);
  return {
    annualTax,
    monthlyTax: annualTax / 12,
    effectiveRatePercent: assessedValue > 0 ? (annualTax / assessedValue) * 100 : 0,
  };
}

function readPropertyTaxCore(values: CalcInputValues) {
  const assessedValue = safeNumber(values.assessedValue);
  const rate = safeNumber(values.rate);
  const rateType = safeNumber(values.rateType, 0);
  if (assessedValue <= 0) {
    throw new CalculationError("Enter your property's assessed value.");
  }
  return computePropertyTax(assessedValue, rate, rateType);
}

const propertyTaxCalculator: CustomCalculator = (values) => {
  const r = readPropertyTaxCore(values);
  return {
    annualTax: r.annualTax,
    monthlyTax: r.monthlyTax,
    effectiveRate: r.effectiveRatePercent,
  };
};

const monthlyPropertyTaxCalculator: CustomCalculator = (values) => {
  const r = readPropertyTaxCore(values);
  return {
    monthlyTax: r.monthlyTax,
    annualTax: r.annualTax,
    effectiveRate: r.effectiveRatePercent,
  };
};

const propertyTaxRateCalculator: CustomCalculator = (values) => {
  const assessedValue = safeNumber(values.assessedValue);
  const annualTaxPaid = safeNumber(values.annualTaxPaid);
  if (assessedValue <= 0) {
    throw new CalculationError("Enter your property's assessed value.");
  }
  const effectiveRatePercent = (annualTaxPaid / assessedValue) * 100;
  const millRate = (annualTaxPaid / assessedValue) * 1000;
  return {
    effectiveRatePercent,
    millRate,
    monthlyTax: annualTaxPaid / 12,
  };
};

const rentalPropertyTaxCalculator: CustomCalculator = (values) => {
  const r = readPropertyTaxCore(values);
  const annualRentalIncome = safeNumber(values.annualRentalIncome);
  const taxAsPercentOfRent = annualRentalIncome > 0 ? (r.annualTax / annualRentalIncome) * 100 : 0;
  return {
    annualTax: r.annualTax,
    monthlyTax: r.monthlyTax,
    taxAsPercentOfRent,
  };
};

const transferTaxCalculator: CustomCalculator = (values) => {
  const salePrice = safeNumber(values.salePrice);
  const transferTaxRate = safeNumber(values.transferTaxRate);
  if (salePrice <= 0) {
    throw new CalculationError("Enter the property's sale price.");
  }
  const transferTax = salePrice * (transferTaxRate / 100);
  return {
    transferTax,
    totalWithTax: salePrice + transferTax,
  };
};

const landTaxCalculator: CustomCalculator = (values) => {
  const landValue = safeNumber(values.landValue);
  const taxRate = safeNumber(values.taxRate);
  const taxFreeThreshold = safeNumber(values.taxFreeThreshold);
  if (landValue <= 0) {
    throw new CalculationError("Enter the land's assessed value.");
  }
  const taxableValue = Math.max(0, landValue - taxFreeThreshold);
  const landTax = taxableValue * (taxRate / 100);
  return {
    taxableValue,
    landTax,
  };
};

// ---------------------------------------------------------------------------
// Self-Employment Tax family (5 functions, 13 tools)
// ---------------------------------------------------------------------------

const selfEmploymentTaxCalculator: CustomCalculator = (values) => {
  const netProfit = safeNumber(values.netProfit);
  const otherWages = safeNumber(values.otherWages);
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  if (netProfit <= 0) {
    throw new CalculationError("Enter your net self-employment profit.");
  }
  const r = computeSelfEmploymentTax(netProfit, otherWages, otherWages, filingStatus);
  return {
    socialSecurityTax: r.socialSecurityTax,
    medicareTax: r.medicareTax,
    additionalMedicareTax: r.additionalMedicareTax,
    totalSeTax: r.totalSeTax,
    deductibleHalf: r.deductibleHalf,
  };
};

const selfEmployedSocialSecurityCalculator: CustomCalculator = (values) => {
  const netProfit = safeNumber(values.netProfit);
  const otherWages = safeNumber(values.otherWages);
  if (netProfit <= 0) {
    throw new CalculationError("Enter your net self-employment profit.");
  }
  const seNetEarnings = netProfit * SE_NET_EARNINGS_FACTOR;
  const ssRoomLeft = Math.max(0, SOCIAL_SECURITY_WAGE_BASE_2026 - Math.max(0, otherWages));
  const ssTaxableSe = Math.min(seNetEarnings, ssRoomLeft);
  const socialSecurityTax = ssTaxableSe * SOCIAL_SECURITY_RATE_COMBINED;
  return {
    seNetEarnings,
    ssTaxableAmount: ssTaxableSe,
    socialSecurityTax,
  };
};

const selfEmployedMedicareCalculator: CustomCalculator = (values) => {
  const netProfit = safeNumber(values.netProfit);
  const otherWages = safeNumber(values.otherWages);
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  if (netProfit <= 0) {
    throw new CalculationError("Enter your net self-employment profit.");
  }
  const seNetEarnings = netProfit * SE_NET_EARNINGS_FACTOR;
  const medicareTax = seNetEarnings * MEDICARE_RATE_COMBINED;
  const threshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
  const combinedMedicareWages = Math.max(0, otherWages) + seNetEarnings;
  const additionalMedicareTax =
    Math.max(0, combinedMedicareWages - Math.max(threshold, Math.max(0, otherWages))) * ADDITIONAL_MEDICARE_RATE;
  return {
    medicareTax,
    additionalMedicareTax,
    totalMedicareTax: medicareTax + additionalMedicareTax,
  };
};

// SEP-IRA / Solo 401(k) constants for 2026, cross-checked directly against
// IRS Notice 2025-67 (irs.gov/pub/irs-drop/n-25-67.pdf):
//  - Overall IRC §415(c)(1)(A) defined-contribution limit: $72,000
//  - 401(a)(17) annual compensation limit: $360,000
//  - 402(g)(1) elective deferral limit: $24,500
//  - 414(v)(2)(B)(i) age-50+ catch-up: $8,000 (on top of the above; catch-up
//    doesn't count against the $72,000 combined limit)
// SEP-IRA employer-contribution mechanics (the "20% of net earnings from
// self-employment" figure, standing in for the plan's stated 25% rate) per
// IRS Publication 560, ch. 5 ("Rate Table/Worksheet for Self-Employed"):
// a self-employed person's own net earnings for retirement-contribution
// purposes are net profit minus the deductible half of SE tax, and a plan
// contribution rate of 25% of compensation works out to 20% of that
// adjusted net-earnings figure once you solve the circular
// compensation-includes-the-contribution-itself definition.
const SEP_SOLO401K_LIMIT_2026 = 72000;
const SOLO401K_CATCHUP_2026 = 8000;
const ELECTIVE_DEFERRAL_LIMIT_2026 = 24500;
const SEP_EMPLOYER_EFFECTIVE_RATE = 0.2; // stands in for the plan's 25% stated rate

const selfEmployedPensionCalculator: CustomCalculator = (values) => {
  const netProfit = safeNumber(values.netProfit);
  const catchUpEligible = safeNumber(values.catchUpEligible) === 1;
  if (netProfit <= 0) {
    throw new CalculationError("Enter your net self-employment profit.");
  }

  // Step 1: SE tax on this profit (regular portion only — Additional
  // Medicare isn't part of the deductible-half calculation here).
  const seNetEarnings = netProfit * SE_NET_EARNINGS_FACTOR;
  const ssTaxableSe = Math.min(seNetEarnings, SOCIAL_SECURITY_WAGE_BASE_2026);
  const regularSeTax = ssTaxableSe * SOCIAL_SECURITY_RATE_COMBINED + seNetEarnings * MEDICARE_RATE_COMBINED;
  const deductibleHalf = regularSeTax / 2;

  // Step 2: "net earnings from self-employment" for retirement-plan
  // purposes (IRC 401(c)(2)) = net profit minus the deductible half of SE
  // tax, capped at the 2026 compensation limit.
  const adjustedNetEarnings = Math.max(0, Math.min(netProfit - deductibleHalf, 360000));

  // Step 3: SEP-IRA maximum (no catch-up allowed for SEP-IRAs).
  const sepIraMax = Math.min(adjustedNetEarnings * SEP_EMPLOYER_EFFECTIVE_RATE, SEP_SOLO401K_LIMIT_2026);

  // Step 4: Solo 401(k) maximum — employee elective deferral (capped at
  // compensation) plus a 20%-of-adjusted-earnings employer contribution,
  // combined capped at the $72,000 base limit; the catch-up amount for
  // 50+ savers sits on top and isn't counted against that base limit.
  const employeeDeferral = Math.min(ELECTIVE_DEFERRAL_LIMIT_2026, adjustedNetEarnings);
  const employerContribution = Math.min(
    adjustedNetEarnings * SEP_EMPLOYER_EFFECTIVE_RATE,
    Math.max(0, SEP_SOLO401K_LIMIT_2026 - employeeDeferral)
  );
  const catchUpContribution = catchUpEligible
    ? Math.min(SOLO401K_CATCHUP_2026, Math.max(0, adjustedNetEarnings - employeeDeferral - employerContribution))
    : 0;
  const solo401kMax = employeeDeferral + employerContribution + catchUpContribution;

  return {
    adjustedNetEarnings,
    sepIraMax,
    solo401kMax,
    solo401kEmployeeDeferral: employeeDeferral + catchUpContribution,
    solo401kEmployerContribution: employerContribution,
  };
};

const selfEmployedIndirectTaxCalculator: CustomCalculator = (values) => {
  const taxableSales = safeNumber(values.taxableSales);
  const taxRate = safeNumber(values.taxRate);
  if (taxableSales <= 0) {
    throw new CalculationError("Enter your taxable sales/revenue amount.");
  }
  const taxCollected = taxableSales * (taxRate / 100);
  return {
    taxCollected,
    totalWithTax: taxableSales + taxCollected,
  };
};

// ---------------------------------------------------------------------------
// Slug -> function map
// ---------------------------------------------------------------------------

export const propertyTaxSelfEmploymentCustomCalculators: Record<string, CustomCalculator> = {
  // Property Tax (11 slugs, 6 functions)
  "property-tax-calculator": propertyTaxCalculator,
  "property-tax-rate-calculator": propertyTaxRateCalculator,
  "annual-property-tax-calculator": propertyTaxCalculator,
  "monthly-property-tax-calculator": monthlyPropertyTaxCalculator,
  "rental-property-tax-calculator": rentalPropertyTaxCalculator,
  "property-transfer-tax-calculator": transferTaxCalculator,
  "stamp-duty-calculator": transferTaxCalculator,
  "land-tax-calculator": landTaxCalculator,
  "real-estate-tax-calculator": propertyTaxCalculator,
  "property-purchase-tax-calculator": transferTaxCalculator,
  "property-sale-tax-calculator": transferTaxCalculator,

  // Self-Employment Tax (13 slugs, 5 functions)
  "self-employment-tax-calculator": selfEmploymentTaxCalculator,
  "self-employment-tax-estimator": selfEmploymentTaxCalculator,
  "freelancer-tax-calculator": selfEmploymentTaxCalculator,
  "contractor-tax-calculator": selfEmploymentTaxCalculator,
  "gig-worker-tax-calculator": selfEmploymentTaxCalculator,
  "side-hustle-tax-calculator": selfEmploymentTaxCalculator,
  "independent-contractor-tax-calculator": selfEmploymentTaxCalculator,
  "sole-trader-tax-calculator": selfEmploymentTaxCalculator,
  "self-employed-social-security-calculator": selfEmployedSocialSecurityCalculator,
  "self-employed-medicare-calculator": selfEmployedMedicareCalculator,
  "self-employed-pension-calculator": selfEmployedPensionCalculator,
  "self-employed-vat-calculator": selfEmployedIndirectTaxCalculator,
  "self-employed-gst-calculator": selfEmployedIndirectTaxCalculator,
};
