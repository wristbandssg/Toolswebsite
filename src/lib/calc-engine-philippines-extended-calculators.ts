/**
 * Philippines Extended tax calculators — 10 more Philippines tools filed
 * under the EXISTING "Philippines Tax & Salary Calculators" category
 * (created by calc-engine-philippines.ts's income tax tool): VAT,
 * Withholding Tax (EWT), Capital Gains Tax (two distinct mechanisms),
 * Estate Tax, Donor's Tax, Percentage Tax, Documentary Stamp Tax, Real
 * Property Tax, Dividend Tax, and Self Employed Tax (8% flat option).
 *
 * See calc-engine.ts for how this file's
 * `philippinesExtendedCustomCalculators` map merges into the app-wide
 * `customCalculators` registry.
 *
 * Structural/accuracy notes worth calling out (see each tool's own
 * Assumptions text for the full visitor-facing version):
 *  - Capital Gains Tax genuinely has TWO separate mechanisms under
 *    Philippine law depending on the asset: 6% final tax on real property
 *    capital assets (base = higher of gross selling price or fair market/
 *    zonal value), versus 15% final tax on unlisted shares (base = net
 *    capital gain) — modeled as two selectable branches of one tool rather
 *    than two tools, since they share almost no other structure.
 *  - Percentage Tax reverted to its standard 3% rate on 1 July 2023, after
 *    a temporary 1% COVID-era rate (RA 11534/CREATE Act) expired —
 *    confirmed via BIR's own RMC No. 69-2023. This tool uses 3%, not 1%.
 *  - Real Property Tax is fundamentally an LGU (local government unit) tax
 *    with rates and assessment levels that vary by locality — this
 *    calculator applies only the NATIONAL STATUTORY CAPS (1% province, 2%
 *    city/Metro Manila, plus 1% Special Education Fund) to a user-supplied
 *    assessed value or assessment level, and does NOT hard-code any
 *    specific city's (e.g. Quezon City, Manila) actual ordinance rates or
 *    assessment-level schedule, since no current one could be confirmed
 *    against a live official source.
 *  - Dividend Tax rates (10% resident/citizen, 20%/25% non-resident alien)
 *    reflect long-standing NIRC provisions not amended by TRAIN or CREATE —
 *    the least-recently-reconfirmed figures in this batch; flagged in the
 *    tool's own Assumptions text as worth an independent check against a
 *    current BIR source before relying on them for a specific transaction.
 *  - Withholding Tax (EWT) models a representative subset of common
 *    Alphanumeric Tax Code (ATC) categories from RR 11-2018 — not the full
 *    ATC table, which has dozens of narrower categories.
 *
 * Figures confirmed via bir.gov.ph (BIR) and the National Internal Revenue
 * Code as amended by RA 10963 (TRAIN) and RA 11534 (CREATE), currently in
 * force as of 2026 unless noted — see each tool's own Assumptions text for
 * the full disclaimer shown to visitors and source notes.
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

// Graduated individual income tax table (same as calc-engine-philippines.ts,
// duplicated per this project's one-file-per-batch convention), used here by
// the Self Employed Tax calculator for the graduated-rate comparison.
const PH_BRACKETS_2023: TaxBand[] = [
  { rate: 0, upTo: 250000 },
  { rate: 0.15, upTo: 400000 },
  { rate: 0.2, upTo: 800000 },
  { rate: 0.25, upTo: 2000000 },
  { rate: 0.3, upTo: 8000000 },
  { rate: 0.35, upTo: Infinity },
];

const VAT_RATE_2026 = 0.12;
const CGT_REAL_PROPERTY_RATE = 0.06;
const CGT_UNLISTED_SHARES_RATE = 0.15;
const ESTATE_TAX_RATE = 0.06;
const ESTATE_STANDARD_DEDUCTION_CITIZEN = 5000000;
const ESTATE_STANDARD_DEDUCTION_NRA = 500000;
const FAMILY_HOME_DEDUCTION_CAP = 10000000;
const DONORS_TAX_RATE = 0.06;
const DONORS_TAX_ANNUAL_EXEMPTION_2026 = 250000;
const PERCENTAGE_TAX_RATE_2026 = 0.03;
const VAT_THRESHOLD_2026 = 3000000;
const SELF_EMPLOYED_8PCT_DEDUCTION = 250000;
const SELF_EMPLOYED_8PCT_RATE = 0.08;
const RPT_SEF_RATE = 0.01;
const RPT_PROVINCE_RATE = 0.01;
const RPT_CITY_METRO_MANILA_RATE = 0.02;

// ---------------------------------------------------------------------------
// 1. Philippines VAT Calculator
// ---------------------------------------------------------------------------

const philippinesVatCalculator: CustomCalculator = (values: CalcInputValues) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const isZeroRatedOrExempt = safeNumber(values.isZeroRatedOrExempt) === 1;
  const isInclusive = safeNumber(values.isInclusive) === 1;

  if (isZeroRatedOrExempt) {
    return { netAmount: amount, vatAmount: 0, grossAmount: amount };
  }

  let netAmount: number;
  let vatAmount: number;
  if (isInclusive) {
    netAmount = amount / (1 + VAT_RATE_2026);
    vatAmount = amount - netAmount;
  } else {
    netAmount = amount;
    vatAmount = amount * VAT_RATE_2026;
  }
  const grossAmount = netAmount + vatAmount;

  return { netAmount, vatAmount, grossAmount };
};

// ---------------------------------------------------------------------------
// 2. Philippines Withholding Tax (EWT) Calculator
// ---------------------------------------------------------------------------

const EWT_RATES: Record<number, number> = {
  0: 0.05, // Professional fees, individual, non-VAT / gross <= 3M
  1: 0.1, // Professional fees, individual, VAT-registered / gross > 3M
  2: 0.1, // Professional fees, corporate, gross <= 720K
  3: 0.15, // Professional fees, corporate, gross > 720K
  4: 0.05, // Rental (real/personal property)
  5: 0.02, // Contractors (general engineering/building/specialty)
  6: 0.01, // Top Withholding Agent payments to suppliers of goods
  7: 0.02, // Top Withholding Agent payments to suppliers of services
  8: 0.01, // Purchases of agricultural products (cumulative > PHP300,000)
};

const philippinesWithholdingTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const paymentAmount = Math.max(0, safeNumber(values.paymentAmount));
  const paymentType = safeNumber(values.paymentType);

  const rate = EWT_RATES[paymentType] ?? 0.1;
  const withholdingTax = paymentAmount * rate;
  const netPayment = paymentAmount - withholdingTax;

  return { rateApplied: rate * 100, withholdingTax, netPayment };
};

// ---------------------------------------------------------------------------
// 3. Philippines Capital Gains Tax Calculator
// ---------------------------------------------------------------------------

const philippinesCapitalGainsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const assetType = safeNumber(values.assetType); // 0=real property, 1=unlisted shares
  const grossSellingPrice = Math.max(0, safeNumber(values.grossSellingPrice));
  const fairMarketValue = Math.max(0, safeNumber(values.fairMarketValue));
  const netCapitalGain = Math.max(0, safeNumber(values.netCapitalGain));

  if (assetType === 1) {
    const taxOnGain = netCapitalGain * CGT_UNLISTED_SHARES_RATE;
    return { taxBase: netCapitalGain, taxOnGain, netProceeds: netCapitalGain - taxOnGain };
  }

  const taxBase = Math.max(grossSellingPrice, fairMarketValue);
  const taxOnGain = taxBase * CGT_REAL_PROPERTY_RATE;
  return { taxBase, taxOnGain, netProceeds: grossSellingPrice - taxOnGain };
};

// ---------------------------------------------------------------------------
// 4. Philippines Estate Tax Calculator
// ---------------------------------------------------------------------------

const philippinesEstateTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const grossEstate = Math.max(0, safeNumber(values.grossEstate));
  const familyHomeValue = Math.max(0, safeNumber(values.familyHomeValue));
  const otherDeductions = Math.max(0, safeNumber(values.otherDeductions));
  const isNonResidentAlien = safeNumber(values.isNonResidentAlien) === 1;

  const standardDeduction = isNonResidentAlien ? ESTATE_STANDARD_DEDUCTION_NRA : ESTATE_STANDARD_DEDUCTION_CITIZEN;
  const familyHomeDeduction = isNonResidentAlien ? 0 : Math.min(familyHomeValue, FAMILY_HOME_DEDUCTION_CAP);

  const totalDeductions = standardDeduction + familyHomeDeduction + otherDeductions;
  const netEstate = Math.max(0, grossEstate - totalDeductions);
  const estateTax = netEstate * ESTATE_TAX_RATE;

  return { standardDeduction, familyHomeDeduction, netEstate, estateTax };
};

// ---------------------------------------------------------------------------
// 5. Philippines Donor's Tax Calculator
// ---------------------------------------------------------------------------

const philippinesDonorsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const giftValue = Math.max(0, safeNumber(values.giftValue));
  const priorGiftsThisYear = Math.max(0, safeNumber(values.priorGiftsThisYear));

  const totalGiftsThisYear = giftValue + priorGiftsThisYear;
  const netGiftsAfterExemption = Math.max(0, totalGiftsThisYear - DONORS_TAX_ANNUAL_EXEMPTION_2026);
  // Tax attributable to this gift = tax on cumulative gifts minus tax already
  // paid on prior gifts this year.
  const taxOnCumulative = netGiftsAfterExemption * DONORS_TAX_RATE;
  const netPriorGiftsAfterExemption = Math.max(0, priorGiftsThisYear - DONORS_TAX_ANNUAL_EXEMPTION_2026);
  const taxOnPrior = netPriorGiftsAfterExemption * DONORS_TAX_RATE;
  const donorsTax = Math.max(0, taxOnCumulative - taxOnPrior);

  return { netGiftsAfterExemption, donorsTax };
};

// ---------------------------------------------------------------------------
// 6. Philippines Percentage Tax Calculator
// ---------------------------------------------------------------------------

const philippinesPercentageTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const grossSales = Math.max(0, safeNumber(values.grossSales));

  const percentageTax = grossSales * PERCENTAGE_TAX_RATE_2026;
  const isEligible = grossSales <= VAT_THRESHOLD_2026 ? 1 : 0;

  return { percentageTax, isEligible };
};

// ---------------------------------------------------------------------------
// 7. Philippines Documentary Stamp Tax (DST) Calculator
// ---------------------------------------------------------------------------

const philippinesDstCalculator: CustomCalculator = (values: CalcInputValues) => {
  const instrumentType = safeNumber(values.instrumentType); // 0=real property, 1=loan, 2=lease
  const amount = Math.max(0, safeNumber(values.amount));
  const leaseYears = Math.max(0, safeNumber(values.leaseYears));

  let dst = 0;
  if (instrumentType === 0) {
    // PHP15 per PHP1,000 or fraction (1.5%)
    dst = Math.ceil(amount / 1000) * 15;
  } else if (instrumentType === 1) {
    // PHP1.50 per PHP200 or fraction (~0.75%)
    dst = Math.ceil(amount / 200) * 1.5;
  } else {
    // Lease: PHP6 for first PHP2,000 + PHP2 per PHP1,000 (or fraction) in
    // excess of PHP2,000, per year of the term.
    const excessOverBase = Math.max(0, amount - 2000);
    const perYearDst = 6 + Math.ceil(excessOverBase / 1000) * 2;
    dst = perYearDst * Math.max(1, leaseYears);
  }

  return { documentaryStampTax: dst };
};

// ---------------------------------------------------------------------------
// 8. Philippines Real Property Tax (RPT) Calculator
// ---------------------------------------------------------------------------

const philippinesRptCalculator: CustomCalculator = (values: CalcInputValues) => {
  const fairMarketValue = Math.max(0, safeNumber(values.fairMarketValue));
  const assessmentLevelPercent = Math.max(0, safeNumber(values.assessmentLevelPercent));
  const isProvince = safeNumber(values.isProvince) === 1;

  const assessedValue = fairMarketValue * (assessmentLevelPercent / 100);
  const basicRptRate = isProvince ? RPT_PROVINCE_RATE : RPT_CITY_METRO_MANILA_RATE;
  const basicRpt = assessedValue * basicRptRate;
  const sefLevy = assessedValue * RPT_SEF_RATE;
  const totalRpt = basicRpt + sefLevy;

  return { assessedValue, basicRpt, sefLevy, totalRpt };
};

// ---------------------------------------------------------------------------
// 9. Philippines Dividend Tax Calculator
// ---------------------------------------------------------------------------

const philippinesDividendTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const dividendAmount = Math.max(0, safeNumber(values.dividendAmount));
  const recipientType = safeNumber(values.recipientType); // 0=citizen/resident, 1=NRA-ETB, 2=NRA-NETB, 3=domestic-corp

  let rate = 0.1;
  if (recipientType === 1) rate = 0.2;
  else if (recipientType === 2) rate = 0.25;
  else if (recipientType === 3) rate = 0;

  const withholdingTax = dividendAmount * rate;
  const netDividend = dividendAmount - withholdingTax;

  return { rateApplied: rate * 100, withholdingTax, netDividend };
};

// ---------------------------------------------------------------------------
// 10. Philippines Self Employed Tax Calculator
// ---------------------------------------------------------------------------

const philippinesSelfEmployedTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const grossSalesOrReceipts = Math.max(0, safeNumber(values.grossSalesOrReceipts));
  const elect8PercentOption = safeNumber(values.elect8PercentOption) === 1;

  const isEligibleFor8Percent = grossSalesOrReceipts <= VAT_THRESHOLD_2026 ? 1 : 0;

  if (elect8PercentOption && isEligibleFor8Percent) {
    const taxableAmount = Math.max(0, grossSalesOrReceipts - SELF_EMPLOYED_8PCT_DEDUCTION);
    const flatTax = taxableAmount * SELF_EMPLOYED_8PCT_RATE;
    return {
      isEligibleFor8Percent,
      taxUnder8PercentOption: flatTax,
      taxUnderGraduatedOption: 0,
      recommendedTax: flatTax,
      netIncome: grossSalesOrReceipts - flatTax,
    };
  }

  const graduatedIncomeTax = progressiveTax(grossSalesOrReceipts, PH_BRACKETS_2023);
  const percentageTax = grossSalesOrReceipts * PERCENTAGE_TAX_RATE_2026;
  const taxUnderGraduatedOption = graduatedIncomeTax + percentageTax;

  const taxableAmountFor8Pct = Math.max(0, grossSalesOrReceipts - SELF_EMPLOYED_8PCT_DEDUCTION);
  const taxUnder8PercentOption = isEligibleFor8Percent ? taxableAmountFor8Pct * SELF_EMPLOYED_8PCT_RATE : 0;

  const recommendedTax =
    isEligibleFor8Percent && taxUnder8PercentOption < taxUnderGraduatedOption
      ? taxUnder8PercentOption
      : taxUnderGraduatedOption;

  return {
    isEligibleFor8Percent,
    taxUnder8PercentOption,
    taxUnderGraduatedOption,
    recommendedTax,
    netIncome: grossSalesOrReceipts - recommendedTax,
  };
};

export const philippinesExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "philippines-vat-calculator": philippinesVatCalculator,
  "philippines-withholding-tax-calculator": philippinesWithholdingTaxCalculator,
  "philippines-capital-gains-tax-calculator": philippinesCapitalGainsTaxCalculator,
  "philippines-estate-tax-calculator": philippinesEstateTaxCalculator,
  "philippines-donors-tax-calculator": philippinesDonorsTaxCalculator,
  "philippines-percentage-tax-calculator": philippinesPercentageTaxCalculator,
  "philippines-documentary-stamp-tax-calculator": philippinesDstCalculator,
  "philippines-real-property-tax-calculator": philippinesRptCalculator,
  "philippines-dividend-tax-calculator": philippinesDividendTaxCalculator,
  "philippines-self-employment-tax-calculator": philippinesSelfEmployedTaxCalculator,
};
