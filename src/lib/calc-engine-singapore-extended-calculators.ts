/**
 * Singapore Extended tax calculators — 10 more Singapore tools filed under
 * the EXISTING "Singapore Tax & Salary Calculators" category (created by
 * calc-engine-singapore.ts's income tax tool), covering GST, CPF (general
 * and detailed contribution), self-employment MediSave, corporate tax,
 * property tax, stamp duty, and the two "no tax" structural facts —
 * capital gains and dividends — plus rental income.
 *
 * See calc-engine.ts for how this file's `singaporeExtendedCustomCalculators`
 * map merges into the app-wide `customCalculators` registry.
 *
 * Structural notes worth calling out (see each tool's own Assumptions text
 * for the full visitor-facing version):
 *  - Singapore has NO general capital gains tax. Gains from selling
 *    property, shares, and financial instruments are "generally not
 *    taxable," EXCEPT when IRAS considers the activity "trading in
 *    properties/shares" as a business rather than a personal investment —
 *    the Capital Gains Tax Calculator models that narrow exception rather
 *    than inventing a general CGT rate.
 *  - Dividends paid by a Singapore resident company are tax-EXEMPT to
 *    shareholders under the one-tier corporate tax system (the company's
 *    own tax is treated as final) — the Dividend Tax Calculator confirms
 *    this rather than computing a tax that doesn't exist. Foreign-sourced
 *    dividends are also generally exempt, except when received through a
 *    Singapore partnership.
 *  - Self-employed persons contribute to MediSave only (not the full
 *    CPF Ordinary/Special Account split), at a rate that GRADUATES between
 *    $6,000 and $18,000 of annual Net Trade Income. This file uses a
 *    disclosed LINEAR approximation of that graduated band — see the
 *    Self Employed Tax Calculator's Assumptions for the exact-figure
 *    caveat (IRAS/CPF Board publish an official self-employed MediSave
 *    calculator for a precise figure).
 *  - Budget 2026 granted a one-off 50%-of-tax-payable Corporate Income Tax
 *    Rebate (capped at $40,000 combined with a cash grant) for YA2026
 *    specifically — modeled as a rebate line, not folded into the
 *    permanent 17% rate.
 *
 * Figures are for Year of Assessment 2026 unless noted, confirmed via
 * iras.gov.sg / cpf.gov.sg — see each tool's own Assumptions text for the
 * full disclaimer shown to visitors and source notes.
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

/** Tax on `amount` stacked on top of `otherIncome` already using up the
 * lower bands — used for rental profit, trading gains, and partnership
 * foreign dividends. */
function stackedTax(otherIncome: number, amount: number, bands: TaxBand[]): number {
  if (amount <= 0) return 0;
  const taxOnCombined = progressiveTax(otherIncome + amount, bands);
  const taxOnOtherAlone = progressiveTax(otherIncome, bands);
  return Math.max(0, taxOnCombined - taxOnOtherAlone);
}

// ---------------------------------------------------------------------------
// Resident individual tax bands — YA 2026 (matches calc-engine-singapore.ts).
// ---------------------------------------------------------------------------

const SG_BRACKETS_2026: TaxBand[] = [
  { rate: 0, upTo: 20000 },
  { rate: 0.02, upTo: 30000 },
  { rate: 0.035, upTo: 40000 },
  { rate: 0.07, upTo: 80000 },
  { rate: 0.115, upTo: 120000 },
  { rate: 0.15, upTo: 160000 },
  { rate: 0.18, upTo: 200000 },
  { rate: 0.19, upTo: 240000 },
  { rate: 0.195, upTo: 280000 },
  { rate: 0.2, upTo: 320000 },
  { rate: 0.22, upTo: 500000 },
  { rate: 0.23, upTo: 1000000 },
  { rate: 0.24, upTo: Infinity },
];

const GST_RATE_2026 = 0.09;

// CPF — 1 Jan 2026 figures.
const OW_CEILING_MONTHLY_2026 = 8000;
const AW_CEILING_ANNUAL_BASE_2026 = 102000; // AW ceiling = 102,000 − total OW for the year
// (The $37,740 CPF Annual Limit is 102,000 × the <=55 band's 37% combined
// rate — it isn't applied as a separate cap here because the AW ceiling
// above already keeps OW + AW within the $102,000 wage ceiling, which
// enforces the same limit by construction. See the CPF Contribution
// Calculator below.)

interface CpfRateBand {
  maxAge: number; // inclusive upper bound of the age band
  employerRate: number;
  employeeRate: number;
}

// Citizen/PR (3rd year and above) rates, effective 1 Jan 2026.
const CPF_RATE_BANDS_2026: CpfRateBand[] = [
  { maxAge: 55, employerRate: 0.17, employeeRate: 0.2 },
  { maxAge: 60, employerRate: 0.16, employeeRate: 0.18 },
  { maxAge: 65, employerRate: 0.125, employeeRate: 0.125 },
  { maxAge: 70, employerRate: 0.09, employeeRate: 0.075 },
  { maxAge: Infinity, employerRate: 0.075, employeeRate: 0.05 },
];

function cpfRatesFor(age: number): CpfRateBand {
  for (const band of CPF_RATE_BANDS_2026) {
    if (age <= band.maxAge) return band;
  }
  return CPF_RATE_BANDS_2026[CPF_RATE_BANDS_2026.length - 1];
}

// MediSave for self-employed persons — max rate/cap by age band (2025 NTI
// figures, current for YA2026 filing). Below $6,000 NTI: no contribution.
// $6,000–$18,000: this file uses a disclosed LINEAR approximation of
// IRAS's graduated formula (see file header). Above $18,000: flat max
// rate, capped at the max annual contribution.
interface MedisaveBand {
  maxAge: number;
  maxRate: number;
  maxAnnual: number;
}

const MEDISAVE_BANDS_2025: MedisaveBand[] = [
  { maxAge: 35, maxRate: 0.08, maxAnnual: 7104 },
  { maxAge: 45, maxRate: 0.09, maxAnnual: 7992 },
  { maxAge: 50, maxRate: 0.1, maxAnnual: 8880 },
  { maxAge: Infinity, maxRate: 0.105, maxAnnual: 9324 },
];

function medisaveBandFor(age: number): MedisaveBand {
  for (const band of MEDISAVE_BANDS_2025) {
    if (age <= band.maxAge) return band;
  }
  return MEDISAVE_BANDS_2025[MEDISAVE_BANDS_2025.length - 1];
}

function medisaveContribution(nti: number, age: number): number {
  const band = medisaveBandFor(age);
  if (nti <= 6000) return 0;
  if (nti > 18000) return Math.min(nti * band.maxRate, band.maxAnnual);
  // Linear approximation between $0 at $6,000 NTI and the max annual
  // contribution at $18,000 NTI — see file header.
  const fraction = (nti - 6000) / (18000 - 6000);
  return fraction * band.maxAnnual;
}

// Corporate tax.
const CORPORATE_TAX_RATE_2026 = 0.17;
const PTE_FIRST_TIER = 10000;
const PTE_FIRST_TIER_EXEMPT_RATE = 0.75;
const PTE_SECOND_TIER = 190000;
const PTE_SECOND_TIER_EXEMPT_RATE = 0.5;
const SUTE_FIRST_TIER = 100000;
const SUTE_FIRST_TIER_EXEMPT_RATE = 0.75;
const SUTE_SECOND_TIER = 100000;
const SUTE_SECOND_TIER_EXEMPT_RATE = 0.5;
const CIT_REBATE_RATE_YA2026 = 0.5;
const CIT_REBATE_CAP_YA2026 = 40000;

// Property tax — Annual Value bands, owner-occupied (1 Jan 2025) vs
// non-owner-occupied (1 Jan 2024) residential, and flat non-residential.
interface AvBand {
  rate: number;
  upTo: number; // width of this band above the running floor, Infinity for the top band
}

const OWNER_OCCUPIED_AV_BANDS: AvBand[] = [
  { rate: 0, upTo: 12000 },
  { rate: 0.04, upTo: 28000 },
  { rate: 0.06, upTo: 10000 },
  { rate: 0.1, upTo: 25000 },
  { rate: 0.14, upTo: 10000 },
  { rate: 0.2, upTo: 15000 },
  { rate: 0.26, upTo: 40000 },
  { rate: 0.32, upTo: Infinity },
];

const NON_OWNER_OCCUPIED_AV_BANDS: AvBand[] = [
  { rate: 0.12, upTo: 30000 },
  { rate: 0.2, upTo: 15000 },
  { rate: 0.28, upTo: 15000 },
  { rate: 0.36, upTo: Infinity },
];

const NON_RESIDENTIAL_RATE = 0.1;

function avBandedTax(av: number, bands: AvBand[]): number {
  let tax = 0;
  let remaining = av;
  for (const band of bands) {
    if (remaining <= 0) break;
    const widthTaxed = Math.min(remaining, band.upTo);
    tax += widthTaxed * band.rate;
    remaining -= widthTaxed;
  }
  return tax;
}

// Stamp duty — BSD progressive bands (residential, effective 15 Feb 2023).
const BSD_BANDS: AvBand[] = [
  { rate: 0.01, upTo: 180000 },
  { rate: 0.02, upTo: 180000 },
  { rate: 0.03, upTo: 640000 },
  { rate: 0.04, upTo: 500000 },
  { rate: 0.05, upTo: 1500000 },
  { rate: 0.06, upTo: Infinity },
];

// ABSD flat rates by buyer profile.
const ABSD_RATE_BY_PROFILE: Record<number, number> = {
  0: 0, // SC 1st property
  1: 0.2, // SC 2nd property
  2: 0.3, // SC 3rd+ property
  3: 0.05, // PR 1st property
  4: 0.3, // PR 2nd property
  5: 0.35, // PR 3rd+ property
  6: 0.6, // Foreigner
  7: 0.65, // Entity
};

// ---------------------------------------------------------------------------
// 1. Singapore GST Calculator
// ---------------------------------------------------------------------------

const singaporeGstCalculator: CustomCalculator = (values: CalcInputValues) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const isGstInclusive = safeNumber(values.isGstInclusive) === 1;

  const netAmount = isGstInclusive ? amount / (1 + GST_RATE_2026) : amount;
  const gstAmount = netAmount * GST_RATE_2026;
  const grossAmount = netAmount + gstAmount;

  return { netAmount, gstAmount, grossAmount };
};

// ---------------------------------------------------------------------------
// 2. Singapore CPF Calculator (general/quick monthly estimate)
// ---------------------------------------------------------------------------

const singaporeCpfCalculator: CustomCalculator = (values: CalcInputValues) => {
  const monthlyWage = Math.max(0, safeNumber(values.monthlyWage));
  const age = Math.max(16, safeNumber(values.age, 30));

  const cappedOw = Math.min(monthlyWage, OW_CEILING_MONTHLY_2026);
  const rates = cpfRatesFor(age);

  const employeeContribution = cappedOw * rates.employeeRate;
  const employerContribution = cappedOw * rates.employerRate;
  const totalContribution = employeeContribution + employerContribution;
  const takeHomePay = monthlyWage - employeeContribution;

  return {
    ordinaryWageUsed: cappedOw,
    employeeContribution,
    employerContribution,
    totalContribution,
    takeHomePay,
  };
};

// ---------------------------------------------------------------------------
// 3. Singapore CPF Contribution Calculator (detailed, with Additional Wage)
// ---------------------------------------------------------------------------

const singaporeCpfContributionCalculator: CustomCalculator = (values: CalcInputValues) => {
  const monthlyOrdinaryWage = Math.max(0, safeNumber(values.monthlyOrdinaryWage));
  const annualAdditionalWage = Math.max(0, safeNumber(values.annualAdditionalWage));
  const age = Math.max(16, safeNumber(values.age, 30));

  const rates = cpfRatesFor(age);
  const cappedMonthlyOw = Math.min(monthlyOrdinaryWage, OW_CEILING_MONTHLY_2026);
  const annualOw = cappedMonthlyOw * 12;

  const awCeiling = Math.max(0, AW_CEILING_ANNUAL_BASE_2026 - annualOw);
  const cappedAw = Math.min(annualAdditionalWage, awCeiling);

  const employeeOwContribution = annualOw * rates.employeeRate;
  const employerOwContribution = annualOw * rates.employerRate;
  const employeeAwContribution = cappedAw * rates.employeeRate;
  const employerAwContribution = cappedAw * rates.employerRate;

  // No separate cap needed here: the AW ceiling above already keeps
  // annualOw + cappedAw at or below the $102,000 wage ceiling, so total
  // mandatory contributions (at the <=55 band's 37% combined rate) can
  // never exceed the $37,740 CPF Annual Limit by construction.
  const totalEmployeeContribution = employeeOwContribution + employeeAwContribution;
  const totalEmployerContribution = employerOwContribution + employerAwContribution;
  const totalAnnualContribution = totalEmployeeContribution + totalEmployerContribution;

  return {
    annualOrdinaryWageUsed: annualOw,
    additionalWageCeiling: awCeiling,
    additionalWageUsed: cappedAw,
    employeeOwContribution,
    employerOwContribution,
    employeeAwContribution,
    employerAwContribution,
    totalAnnualContribution,
  };
};

// ---------------------------------------------------------------------------
// 4. Singapore Self Employed Tax Calculator
// ---------------------------------------------------------------------------

const singaporeSelfEmploymentTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const netTradeIncome = Math.max(0, safeNumber(values.netTradeIncome));
  const age = Math.max(16, safeNumber(values.age, 30));

  const incomeTax = progressiveTax(netTradeIncome, SG_BRACKETS_2026);
  const medisave = medisaveContribution(netTradeIncome, age);
  const totalTaxAndMedisave = incomeTax + medisave;
  const netIncomeAfterTax = netTradeIncome - totalTaxAndMedisave;

  return {
    incomeTax,
    medisaveContribution: medisave,
    totalTaxAndMedisave,
    netIncomeAfterTax,
  };
};

// ---------------------------------------------------------------------------
// 5. Singapore Corporate Tax Calculator
// ---------------------------------------------------------------------------

const singaporeCorporateTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const chargeableIncome = Math.max(0, safeNumber(values.chargeableIncome));
  const isFirstThreeYears = safeNumber(values.isFirstThreeYears) === 1;

  let exemptAmount: number;
  if (isFirstThreeYears) {
    const firstTier = Math.min(chargeableIncome, SUTE_FIRST_TIER) * SUTE_FIRST_TIER_EXEMPT_RATE;
    const secondTier = Math.min(Math.max(chargeableIncome - SUTE_FIRST_TIER, 0), SUTE_SECOND_TIER) * SUTE_SECOND_TIER_EXEMPT_RATE;
    exemptAmount = firstTier + secondTier;
  } else {
    const firstTier = Math.min(chargeableIncome, PTE_FIRST_TIER) * PTE_FIRST_TIER_EXEMPT_RATE;
    const secondTier = Math.min(Math.max(chargeableIncome - PTE_FIRST_TIER, 0), PTE_SECOND_TIER) * PTE_SECOND_TIER_EXEMPT_RATE;
    exemptAmount = firstTier + secondTier;
  }

  const taxableAfterExemption = Math.max(0, chargeableIncome - exemptAmount);
  const taxPayable = taxableAfterExemption * CORPORATE_TAX_RATE_2026;
  const citRebate = Math.min(taxPayable * CIT_REBATE_RATE_YA2026, CIT_REBATE_CAP_YA2026);
  const netTaxPayable = taxPayable - citRebate;

  return {
    exemptAmount,
    taxableAfterExemption,
    taxPayable,
    citRebate,
    netTaxPayable,
  };
};

// ---------------------------------------------------------------------------
// 6. Singapore Property Tax Calculator
// ---------------------------------------------------------------------------

const singaporePropertyTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualValue = Math.max(0, safeNumber(values.annualValue));
  const propertyType = safeNumber(values.propertyType, 0);

  let tax: number;
  if (propertyType === 0) {
    tax = avBandedTax(annualValue, OWNER_OCCUPIED_AV_BANDS);
  } else if (propertyType === 1) {
    tax = avBandedTax(annualValue, NON_OWNER_OCCUPIED_AV_BANDS);
  } else {
    tax = annualValue * NON_RESIDENTIAL_RATE;
  }

  const effectiveRate = annualValue > 0 ? (tax / annualValue) * 100 : 0;

  return {
    annualPropertyTax: tax,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 7. Singapore Stamp Duty Calculator (BSD + ABSD)
// ---------------------------------------------------------------------------

const singaporeStampDutyCalculator: CustomCalculator = (values: CalcInputValues) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice));
  const buyerProfile = safeNumber(values.buyerProfile, 0);

  const bsd = avBandedTax(purchasePrice, BSD_BANDS);
  const absdRate = ABSD_RATE_BY_PROFILE[buyerProfile] ?? 0;
  const absd = purchasePrice * absdRate;
  const totalStampDuty = bsd + absd;
  const effectiveRate = purchasePrice > 0 ? (totalStampDuty / purchasePrice) * 100 : 0;

  return {
    buyersStampDuty: bsd,
    additionalBuyersStampDuty: absd,
    totalStampDuty,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 8. Singapore Capital Gains Tax Calculator
// ---------------------------------------------------------------------------

const singaporeCapitalGainsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const gainAmount = Math.max(0, safeNumber(values.gainAmount));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));
  const isConsideredTrading = safeNumber(values.isConsideredTrading) === 1;

  const taxableGain = isConsideredTrading ? gainAmount : 0;
  const taxOnGain = stackedTax(otherTaxableIncome, taxableGain, SG_BRACKETS_2026);
  const netProceeds = gainAmount - taxOnGain;

  return {
    taxableGain,
    taxOnGain,
    netProceeds,
  };
};

// ---------------------------------------------------------------------------
// 9. Singapore Dividend Tax Calculator
// ---------------------------------------------------------------------------

const singaporeDividendTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const sgCompanyDividend = Math.max(0, safeNumber(values.sgCompanyDividend));
  const foreignSourcedDividend = Math.max(0, safeNumber(values.foreignSourcedDividend));
  const receivedViaPartnership = safeNumber(values.receivedViaPartnership) === 1;
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));

  // SG resident company dividends are always exempt (one-tier system).
  const taxOnSgDividend = 0;
  // Foreign-sourced dividends are generally exempt too, UNLESS received
  // through a Singapore partnership.
  const taxableForeignDividend = receivedViaPartnership ? foreignSourcedDividend : 0;
  const taxOnForeignDividend = stackedTax(otherTaxableIncome, taxableForeignDividend, SG_BRACKETS_2026);

  const totalDividendIncome = sgCompanyDividend + foreignSourcedDividend;
  const totalTax = taxOnSgDividend + taxOnForeignDividend;

  return {
    taxOnSgDividend,
    taxableForeignDividend,
    taxOnForeignDividend,
    totalDividendIncome,
    totalTax,
  };
};

// ---------------------------------------------------------------------------
// 10. Singapore Rental Income Tax Calculator
// ---------------------------------------------------------------------------

const singaporeRentalIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const grossRent = Math.max(0, safeNumber(values.grossRent));
  const mortgageInterest = Math.max(0, safeNumber(values.mortgageInterest));
  const useDeemedExpenses = safeNumber(values.useDeemedExpenses, 1) === 1;
  const actualExpenses = Math.max(0, safeNumber(values.actualExpenses));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));

  const deductibleExpenses = useDeemedExpenses ? grossRent * 0.15 + mortgageInterest : actualExpenses + mortgageInterest;
  const rentalProfit = Math.max(0, grossRent - deductibleExpenses);
  const taxOnRental = stackedTax(otherTaxableIncome, rentalProfit, SG_BRACKETS_2026);
  const netRentalIncome = rentalProfit - taxOnRental;

  return {
    deductibleExpenses,
    rentalProfit,
    taxOnRental,
    netRentalIncome,
  };
};

export const singaporeExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "singapore-gst-calculator": singaporeGstCalculator,
  "singapore-cpf-calculator": singaporeCpfCalculator,
  "singapore-cpf-contribution-calculator": singaporeCpfContributionCalculator,
  "singapore-self-employment-tax-calculator": singaporeSelfEmploymentTaxCalculator,
  "singapore-corporate-tax-calculator": singaporeCorporateTaxCalculator,
  "singapore-property-tax-calculator": singaporePropertyTaxCalculator,
  "singapore-stamp-duty-calculator": singaporeStampDutyCalculator,
  "singapore-capital-gains-tax-calculator": singaporeCapitalGainsTaxCalculator,
  "singapore-dividend-tax-calculator": singaporeDividendTaxCalculator,
  "singapore-rental-income-tax-calculator": singaporeRentalIncomeTaxCalculator,
};
