/**
 * Hong Kong Extended tax calculators — 7 more Hong Kong tools filed under
 * the EXISTING "Hong Kong Tax & Salary Calculators" category (created by
 * calc-engine-hongkong.ts's income tax tool), covering Profits Tax,
 * Property Tax, Stamp Duty (AVD), Rental Income (Property Tax vs Personal
 * Assessment), and the two "no tax" structural facts — Capital Gains and
 * Dividends — plus MPF.
 *
 * A "Hong Kong Salaries Tax Calculator" row was deliberately SKIPPED from
 * this batch — Salaries Tax is exactly what calc-engine-hongkong.ts's
 * existing "hong-kong-income-tax-calculator" already computes (Hong Kong
 * calls its income tax "Salaries Tax"), so a second tool with that name
 * would be a true duplicate, not a distinct calculator — same reasoning
 * already applied earlier in this project (e.g. skipping a second Capital
 * Gains tool for the US FICA batch).
 *
 * See calc-engine.ts for how this file's `hongKongExtendedCustomCalculators`
 * map merges into the app-wide `customCalculators` registry.
 *
 * Structural notes worth calling out (see each tool's own Assumptions text
 * for the full visitor-facing version):
 *  - Hong Kong has NO general capital gains tax and NO dividend tax —
 *    gains are only taxed (as Profits Tax, not CGT) when IRD's "badges of
 *    trade" test finds the activity is really trading, not investment.
 *  - Ad Valorem Stamp Duty (AVD) on property was drastically simplified on
 *    28 February 2024 — Special/Buyer's/New-Residential Stamp Duty were
 *    all ABOLISHED, so every residential buyer now pays the same "Scale 2"
 *    table regardless of residency or how many properties they already
 *    own. The 2026-27 Budget then added a new 6.5% top band above
 *    HK$100,000,000 — this file models the confirmed table up to $100M
 *    and applies a flat 6.5% above it (the exact marginal-relief
 *    breakpoint just above $100M wasn't independently confirmed against
 *    an updated official rate table at the time of writing).
 *  - Rental income has a genuine choice: flat 15% Property Tax (on 80% of
 *    net rent, no mortgage interest deduction) versus electing Personal
 *    Assessment (pools rental with salary, applies progressive/standard
 *    Salaries Tax treatment AND allowances, and DOES allow a mortgage
 *    interest deduction) — the Rental Income Tax Calculator computes both
 *    and recommends the lower, the same "IRD computes both, charges
 *    whichever is lower" logic already used for Salaries Tax itself.
 *  - Salaries Tax allowances were RAISED for 2026/27 (Budget, effective
 *    this year): Basic HK$132,000→$145,000, Married HK$264,000→$290,000.
 *    This file uses the current 2026/27 figures for its own Personal
 *    Assessment comparison — calc-engine-hongkong.ts's existing income
 *    tax tool still uses the superseded 2025/26 figures and should be
 *    updated separately.
 *
 * Figures are for the 2026/27 year of assessment (1 April 2026 – 31 March
 * 2027) unless noted, confirmed via ird.gov.hk / mpfa.gov.hk — see each
 * tool's own Assumptions text for the full disclaimer shown to visitors
 * and source notes.
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

// Profits Tax — two-tiered, confirmed unchanged.
const PROFITS_TAX_TIER1_CEILING = 2000000;
const UNINCORPORATED_RATE_TIER1 = 0.075;
const UNINCORPORATED_RATE_TIER2 = 0.15;
const CORPORATION_RATE_TIER1 = 0.0825;
const CORPORATION_RATE_TIER2 = 0.165;

function twoTieredTax(profits: number, tier1Rate: number, tier2Rate: number): number {
  if (profits <= PROFITS_TAX_TIER1_CEILING) return profits * tier1Rate;
  return PROFITS_TAX_TIER1_CEILING * tier1Rate + (profits - PROFITS_TAX_TIER1_CEILING) * tier2Rate;
}

// Property Tax — flat rate on Net Assessable Value after 20% statutory allowance.
const PROPERTY_TAX_RATE = 0.15;
const PROPERTY_TAX_STATUTORY_ALLOWANCE = 0.2;

// Salaries Tax (for the Personal Assessment comparison) — 2026/27 figures,
// updated from the superseded 2025/26 figures in calc-engine-hongkong.ts
// (see file header).
const HK_PROGRESSIVE_BANDS_2026: TaxBand[] = [
  { rate: 0.02, upTo: 50000 },
  { rate: 0.06, upTo: 100000 },
  { rate: 0.1, upTo: 150000 },
  { rate: 0.14, upTo: 200000 },
  { rate: 0.17, upTo: Infinity },
];
const STANDARD_RATE_TIER1_2026 = 0.15;
const STANDARD_RATE_TIER1_CEILING_2026 = 5000000;
const STANDARD_RATE_TIER2_2026 = 0.16;
const BASIC_ALLOWANCE_2026 = 145000;
const MARRIED_ALLOWANCE_2026 = 290000;

function standardRateTax(netIncome: number): number {
  if (netIncome <= STANDARD_RATE_TIER1_CEILING_2026) return netIncome * STANDARD_RATE_TIER1_2026;
  return (
    STANDARD_RATE_TIER1_CEILING_2026 * STANDARD_RATE_TIER1_2026 +
    (netIncome - STANDARD_RATE_TIER1_CEILING_2026) * STANDARD_RATE_TIER2_2026
  );
}

// AVD (Ad Valorem Stamp Duty) — "Scale 2" table, applies to all residential
// buyers since 28 Feb 2024. Marginal-relief bands modeled explicitly; flat
// 6.5% applied above $100M (see file header for the caveat on the exact
// transition point just above that threshold).
function avdStampDuty(value: number): number {
  if (value <= 4000000) return 100;
  if (value <= 4323780) return 100 + 0.2 * (value - 4000000);
  if (value <= 4500000) return value * 0.015;
  if (value <= 4935480) return 67500 + 0.1 * (value - 4500000);
  if (value <= 6000000) return value * 0.0225;
  if (value <= 6642860) return 135000 + 0.1 * (value - 6000000);
  if (value <= 9000000) return value * 0.03;
  if (value <= 10080000) return 270000 + 0.1 * (value - 9000000);
  if (value <= 20000000) return value * 0.0375;
  if (value <= 21739120) return 750000 + 0.1 * (value - 20000000);
  if (value <= 100000000) return value * 0.0425;
  return value * 0.065;
}

// MPF.
const MPF_RATE = 0.05;
const MPF_MIN_RELEVANT_INCOME_MONTHLY = 7100;
const MPF_MAX_RELEVANT_INCOME_MONTHLY = 30000;

// ---------------------------------------------------------------------------
// 1. Hong Kong Profits Tax Calculator
// ---------------------------------------------------------------------------

const hongKongProfitsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const assessableProfits = Math.max(0, safeNumber(values.assessableProfits));
  const isCorporation = safeNumber(values.isCorporation) === 1;

  const tax = isCorporation
    ? twoTieredTax(assessableProfits, CORPORATION_RATE_TIER1, CORPORATION_RATE_TIER2)
    : twoTieredTax(assessableProfits, UNINCORPORATED_RATE_TIER1, UNINCORPORATED_RATE_TIER2);
  const netProfitsAfterTax = assessableProfits - tax;
  const effectiveRate = assessableProfits > 0 ? (tax / assessableProfits) * 100 : 0;

  return { profitsTax: tax, netProfitsAfterTax, effectiveRate };
};

// ---------------------------------------------------------------------------
// 2. Hong Kong Property Tax Calculator
// ---------------------------------------------------------------------------

const hongKongPropertyTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const grossRent = Math.max(0, safeNumber(values.grossRent));
  const ratesPaidByOwner = Math.max(0, safeNumber(values.ratesPaidByOwner));
  const irrecoverableRent = Math.max(0, safeNumber(values.irrecoverableRent));

  const netAssessableValue = Math.max(0, grossRent - ratesPaidByOwner - irrecoverableRent);
  const statutoryAllowance = netAssessableValue * PROPERTY_TAX_STATUTORY_ALLOWANCE;
  const taxableValue = netAssessableValue - statutoryAllowance;
  const propertyTax = taxableValue * PROPERTY_TAX_RATE;

  return { netAssessableValue, statutoryAllowance, propertyTax };
};

// ---------------------------------------------------------------------------
// 3. Hong Kong Stamp Duty Calculator (AVD)
// ---------------------------------------------------------------------------

const hongKongStampDutyCalculator: CustomCalculator = (values: CalcInputValues) => {
  const propertyValue = Math.max(0, safeNumber(values.propertyValue));

  const stampDuty = avdStampDuty(propertyValue);
  const effectiveRate = propertyValue > 0 ? (stampDuty / propertyValue) * 100 : 0;

  return { stampDuty, effectiveRate };
};

// ---------------------------------------------------------------------------
// 4. Hong Kong Rental Income Tax Calculator (Property Tax vs Personal Assessment)
// ---------------------------------------------------------------------------

const hongKongRentalIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const grossRent = Math.max(0, safeNumber(values.grossRent));
  const ratesPaidByOwner = Math.max(0, safeNumber(values.ratesPaidByOwner));
  const mortgageInterest = Math.max(0, safeNumber(values.mortgageInterest));
  const otherSalaryIncome = Math.max(0, safeNumber(values.otherSalaryIncome));
  const isMarried = safeNumber(values.isMarried) === 1;

  // Property Tax route — no mortgage interest deduction allowed.
  const netAssessableValue = Math.max(0, grossRent - ratesPaidByOwner);
  const propertyTaxAmount = netAssessableValue * (1 - PROPERTY_TAX_STATUTORY_ALLOWANCE) * PROPERTY_TAX_RATE;

  // Personal Assessment route — rental (after rates AND mortgage interest)
  // pooled with salary, taxed progressively (or standard rate if lower),
  // after the personal allowance.
  const rentalProfitForPA = Math.max(0, grossRent - ratesPaidByOwner - mortgageInterest);
  const totalIncomePA = otherSalaryIncome + rentalProfitForPA;
  const allowance = isMarried ? MARRIED_ALLOWANCE_2026 : BASIC_ALLOWANCE_2026;
  const netChargeableIncomePA = Math.max(0, totalIncomePA - allowance);
  const progressivePA = progressiveTax(netChargeableIncomePA, HK_PROGRESSIVE_BANDS_2026);
  const standardPA = standardRateTax(totalIncomePA);
  const personalAssessmentTotalTax = Math.min(progressivePA, standardPA);
  // Isolate the rental-attributable share of the Personal Assessment bill
  // by comparing against tax on salary alone.
  const taxOnSalaryAlonePA = Math.min(
    progressiveTax(Math.max(0, otherSalaryIncome - allowance), HK_PROGRESSIVE_BANDS_2026),
    standardRateTax(otherSalaryIncome)
  );
  const personalAssessmentRentalTax = Math.max(0, personalAssessmentTotalTax - taxOnSalaryAlonePA);

  const recommendedRoute = propertyTaxAmount <= personalAssessmentRentalTax ? 0 : 1; // 0=Property Tax, 1=Personal Assessment
  const recommendedTax = Math.min(propertyTaxAmount, personalAssessmentRentalTax);

  return {
    propertyTaxAmount,
    personalAssessmentRentalTax,
    recommendedRoute,
    recommendedTax,
  };
};

// ---------------------------------------------------------------------------
// 5. Hong Kong Capital Gains Tax Calculator
// ---------------------------------------------------------------------------

const hongKongCapitalGainsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const gainAmount = Math.max(0, safeNumber(values.gainAmount));
  const isConsideredTrading = safeNumber(values.isConsideredTrading) === 1;
  const isCorporation = safeNumber(values.isCorporation) === 1;

  const taxableGain = isConsideredTrading ? gainAmount : 0;
  const tax = isConsideredTrading
    ? isCorporation
      ? twoTieredTax(taxableGain, CORPORATION_RATE_TIER1, CORPORATION_RATE_TIER2)
      : twoTieredTax(taxableGain, UNINCORPORATED_RATE_TIER1, UNINCORPORATED_RATE_TIER2)
    : 0;

  return { taxableGain, taxOnGain: tax, netProceeds: gainAmount - tax };
};

// ---------------------------------------------------------------------------
// 6. Hong Kong Dividend Tax Calculator
// ---------------------------------------------------------------------------

const hongKongDividendTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const dividendAmount = Math.max(0, safeNumber(values.dividendAmount));

  return { dividendAmount, taxOnDividend: 0, netDividend: dividendAmount };
};

// ---------------------------------------------------------------------------
// 7. Hong Kong MPF Calculator
// ---------------------------------------------------------------------------

const hongKongMpfCalculator: CustomCalculator = (values: CalcInputValues) => {
  const monthlyRelevantIncome = Math.max(0, safeNumber(values.monthlyRelevantIncome));
  const isSelfEmployed = safeNumber(values.isSelfEmployed) === 1;

  const cappedIncome = Math.min(monthlyRelevantIncome, MPF_MAX_RELEVANT_INCOME_MONTHLY);
  const belowMinimum = monthlyRelevantIncome < MPF_MIN_RELEVANT_INCOME_MONTHLY;

  // Below the minimum: employee/self-employed side isn't required, but an
  // EMPLOYEE's employer still must contribute 5% (self-employed have no
  // employer side at all).
  const employeeContribution = belowMinimum ? 0 : cappedIncome * MPF_RATE;
  const employerContribution = isSelfEmployed ? 0 : belowMinimum ? monthlyRelevantIncome * MPF_RATE : cappedIncome * MPF_RATE;
  const totalMonthlyContribution = employeeContribution + employerContribution;

  return {
    employeeContribution,
    employerContribution,
    totalMonthlyContribution,
    belowMinimumThreshold: belowMinimum ? 1 : 0,
  };
};

export const hongKongExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "hong-kong-profits-tax-calculator": hongKongProfitsTaxCalculator,
  "hong-kong-property-tax-calculator": hongKongPropertyTaxCalculator,
  "hong-kong-stamp-duty-calculator": hongKongStampDutyCalculator,
  "hong-kong-rental-income-tax-calculator": hongKongRentalIncomeTaxCalculator,
  "hong-kong-capital-gains-tax-calculator": hongKongCapitalGainsTaxCalculator,
  "hong-kong-dividend-tax-calculator": hongKongDividendTaxCalculator,
  "hong-kong-mpf-calculator": hongKongMpfCalculator,
};
