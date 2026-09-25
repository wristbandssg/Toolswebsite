/**
 * India Extended tax calculators — 10 more India tools filed under the
 * EXISTING "India Tax & Salary Calculators" category (created by
 * calc-engine-india.ts's income tax tool), covering GST (post-reform
 * slabs), TDS, three distinct Capital Gains tools, Dividend Tax, Property
 * Tax, Stamp Duty, Professional Tax, and presumptive-taxation Self
 * Employment.
 *
 * See calc-engine.ts for how this file's `indiaExtendedCustomCalculators`
 * map merges into the app-wide `customCalculators` registry.
 *
 * Structural notes worth calling out (see each tool's own Assumptions text
 * for the full visitor-facing version):
 *  - "GST 2.0" took effect 22 September 2025 (56th GST Council meeting),
 *    replacing the old 5%/12%/18%/28%+cess structure with 0%/5%/18%/40%
 *    (plus a legacy 3% for gold/silver jewellery, untouched by the
 *    reform). The GST Calculator uses the NEW structure.
 *  - Budget 2024 rewrote capital gains, effective 23 July 2024: equity
 *    STCG 15%→20%, equity LTCG 10%→12.5% (exemption ₹1L→₹1.25L),
 *    indexation withdrawn economy-wide EXCEPT a grandfathered choice for
 *    resident individuals/HUFs on property acquired BEFORE 23 July 2024
 *    (lower of 12.5% no-indexation or 20% with indexation). Three
 *    separate tools cover this: a general/combined classifier, a
 *    short-term-focused tool, and a long-term-focused tool that models
 *    the pre-2024-property indexation choice explicitly — genuinely
 *    different mechanics, not the same tool three times.
 *  - Property Tax and Stamp Duty are MUNICIPAL/STATE taxes with no single
 *    national rate. Property Tax uses Mumbai's (BMC) Capital Value System
 *    methodology as a representative model, with the tax RATE itself
 *    taken as a user input (ward/year-specific rates aren't reliably
 *    published outside the live MCGM portal). Stamp Duty uses Maharashtra
 *    as a representative state. Professional Tax also uses Maharashtra's
 *    slabs as a representative state (many states don't levy this tax at
 *    all), respecting the ₹2,500/year constitutional cap (Article 276(2)).
 *  - India has no separate US-FICA-style "self-employment tax" — the
 *    Self Employment Tax Calculator instead models the presumptive
 *    taxation schemes (Sections 44AD/44ADA, renumbered 45/46 under the
 *    Income-tax Act 2025) self-employed/professional taxpayers actually
 *    use, with their real 2023-set turnover/receipt thresholds.
 *
 * Figures are for FY 2026-27 (AY 2027-28), confirmed via
 * incometaxindia.gov.in / cbic-gst.gov.in and cross-checked against
 * published secondary summaries — see each tool's own Assumptions text
 * for the full disclaimer shown to visitors and source notes.
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
 * lower bands — used for slab-rate short-term gains, dividend income,
 * and non-equity gain scenarios. */
function stackedTax(otherIncome: number, amount: number, bands: TaxBand[]): number {
  if (amount <= 0) return 0;
  const taxOnCombined = progressiveTax(otherIncome + amount, bands);
  const taxOnOtherAlone = progressiveTax(otherIncome, bands);
  return Math.max(0, taxOnCombined - taxOnOtherAlone);
}

// ---------------------------------------------------------------------------
// New/Old Regime brackets — FY2026-27 (matches calc-engine-india.ts).
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

const OLD_REGIME_BRACKETS_2026: TaxBand[] = [
  { rate: 0, upTo: 250000 },
  { rate: 0.05, upTo: 500000 },
  { rate: 0.2, upTo: 1000000 },
  { rate: 0.3, upTo: Infinity },
];

const REBATE_NEW_THRESHOLD_2026 = 1200000;
const REBATE_NEW_MAX_2026 = 60000;
const REBATE_OLD_THRESHOLD_2026 = 500000;
const REBATE_OLD_MAX_2026 = 12500;
const CESS_RATE_2026 = 0.04;

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

// GST — "GST 2.0" structure, live since 22 September 2025.
const GST_RATE_BY_SLAB: Record<number, number> = {
  0: 0,
  1: 0.05,
  2: 0.18,
  3: 0.4,
  4: 0.03, // legacy gold/silver jewellery rate, untouched by the reform
};

// Capital gains — Budget 2024, effective 23 July 2024.
const EQUITY_LTCG_EXEMPTION_2026 = 125000;
const EQUITY_LTCG_RATE_2026 = 0.125;
const EQUITY_STCG_RATE_2026 = 0.2;
const PROPERTY_OTHER_LTCG_RATE_NO_INDEX_2026 = 0.125;
const PROPERTY_LTCG_RATE_WITH_INDEX_2026 = 0.2;
const EQUITY_HOLDING_MONTHS = 12;
const OTHER_HOLDING_MONTHS = 24;

// TDS sections — rate/threshold lookup (see file header).
interface TdsRule {
  rate: number;
  threshold: number;
}

const TDS_RULES: Record<number, TdsRule> = {
  1: { rate: 0.1, threshold: 50000 }, // 194A interest, non-senior
  2: { rate: 0.1, threshold: 100000 }, // 194A interest, senior citizen
  3: { rate: 0.01, threshold: 30000 }, // 194C contractor, individual/HUF payee
  4: { rate: 0.02, threshold: 30000 }, // 194C contractor, other payee
  5: { rate: 0.02, threshold: 20000 }, // 194H commission/brokerage
  6: { rate: 0.1, threshold: 600000 }, // 194-I rent, land/building/furniture
  7: { rate: 0.02, threshold: 600000 }, // 194-I rent, plant/machinery
  8: { rate: 0.1, threshold: 50000 }, // 194J professional fees/royalty
  9: { rate: 0.02, threshold: 50000 }, // 194J technical services/call centre
  10: { rate: 0.01, threshold: 5000000 }, // 194-IA sale of immovable property
  11: { rate: 0.1, threshold: 10000 }, // 194 dividend
};

// Presumptive taxation (Sections 44AD/44ADA, renumbered 45/46).
const PRESUMPTIVE_BUSINESS_THRESHOLD_STANDARD = 20000000;
const PRESUMPTIVE_BUSINESS_THRESHOLD_ENHANCED = 30000000;
const PRESUMPTIVE_PROFESSIONAL_THRESHOLD_STANDARD = 5000000;
const PRESUMPTIVE_PROFESSIONAL_THRESHOLD_ENHANCED = 7500000;
const PRESUMPTIVE_DIGITAL_RATE = 0.06;
const PRESUMPTIVE_CASH_RATE = 0.08;
const PRESUMPTIVE_PROFESSIONAL_RATE = 0.5;
const CASH_RECEIPTS_ENHANCED_THRESHOLD_PERCENT = 5; // enhanced limit applies when cash receipts <=5%

// ---------------------------------------------------------------------------
// 1. India GST Calculator
// ---------------------------------------------------------------------------

const indiaGstCalculator: CustomCalculator = (values: CalcInputValues) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const gstSlab = safeNumber(values.gstSlab, 1);
  const isGstInclusive = safeNumber(values.isGstInclusive) === 1;

  const gstRate = GST_RATE_BY_SLAB[gstSlab] ?? 0.18;
  const netAmount = isGstInclusive ? amount / (1 + gstRate) : amount;
  const gstAmount = netAmount * gstRate;
  const grossAmount = netAmount + gstAmount;

  return { netAmount, gstAmount, grossAmount, gstRateUsed: gstRate * 100 };
};

// ---------------------------------------------------------------------------
// 2. India TDS Calculator
// ---------------------------------------------------------------------------

const indiaTdsCalculator: CustomCalculator = (values: CalcInputValues) => {
  const paymentAmount = Math.max(0, safeNumber(values.paymentAmount));
  const tdsSection = safeNumber(values.tdsSection, 8);

  const rule = TDS_RULES[tdsSection] ?? TDS_RULES[8];
  const thresholdExceeded = paymentAmount >= rule.threshold;
  const tdsAmount = thresholdExceeded ? paymentAmount * rule.rate : 0;
  const netPayment = paymentAmount - tdsAmount;

  return {
    thresholdExceeded: thresholdExceeded ? 1 : 0,
    tdsRateApplied: rule.rate * 100,
    tdsAmount,
    netPayment,
  };
};

// ---------------------------------------------------------------------------
// 3. India Capital Gains Tax Calculator (general/combined classifier)
// ---------------------------------------------------------------------------

const indiaCapitalGainsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const assetType = safeNumber(values.assetType, 0); // 0=equity, 1=property, 2=other
  const monthsHeld = Math.max(0, safeNumber(values.monthsHeld));
  const saleValue = Math.max(0, safeNumber(values.saleValue));
  const costOfAcquisition = Math.max(0, safeNumber(values.costOfAcquisition));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));

  const gain = saleValue - costOfAcquisition;
  const holdingThreshold = assetType === 0 ? EQUITY_HOLDING_MONTHS : OTHER_HOLDING_MONTHS;
  const isLongTerm = monthsHeld >= holdingThreshold;

  let tax = 0;
  if (gain > 0) {
    if (assetType === 0) {
      // Equity / equity-oriented mutual funds (STT paid).
      tax = isLongTerm ? Math.max(0, gain - EQUITY_LTCG_EXEMPTION_2026) * EQUITY_LTCG_RATE_2026 : gain * EQUITY_STCG_RATE_2026;
    } else {
      // Property or other assets.
      tax = isLongTerm ? gain * PROPERTY_OTHER_LTCG_RATE_NO_INDEX_2026 : stackedTax(otherTaxableIncome, gain, NEW_REGIME_BRACKETS_2026);
    }
  }

  const netSaleProceeds = saleValue - tax;
  const effectiveRate = gain > 0 ? (tax / gain) * 100 : 0;

  return {
    gain: Math.max(0, gain),
    isLongTerm: isLongTerm ? 1 : 0,
    taxOnGain: tax,
    netSaleProceeds,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 4. India Short Term Capital Gains Tax Calculator
// ---------------------------------------------------------------------------

const indiaShortTermCapitalGainsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const assetCategory = safeNumber(values.assetCategory, 0); // 0=equity STT-paid, 1=other assets
  const saleValue = Math.max(0, safeNumber(values.saleValue));
  const costOfAcquisition = Math.max(0, safeNumber(values.costOfAcquisition));
  const expenses = Math.max(0, safeNumber(values.expenses));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));

  const stcg = Math.max(0, saleValue - costOfAcquisition - expenses);

  let tax = 0;
  let marginalRate = 0;
  if (stcg > 0) {
    if (assetCategory === 0) {
      tax = stcg * EQUITY_STCG_RATE_2026;
      marginalRate = EQUITY_STCG_RATE_2026 * 100;
    } else {
      tax = stackedTax(otherTaxableIncome, stcg, NEW_REGIME_BRACKETS_2026);
      const combinedIncome = otherTaxableIncome + stcg;
      marginalRate =
        (NEW_REGIME_BRACKETS_2026.find((b) => combinedIncome <= b.upTo)?.rate ?? NEW_REGIME_BRACKETS_2026[NEW_REGIME_BRACKETS_2026.length - 1].rate) * 100;
    }
  }

  const netProceeds = saleValue - tax;

  return {
    stcgAmount: stcg,
    marginalRate,
    taxOnStcg: tax,
    netProceeds,
  };
};

// ---------------------------------------------------------------------------
// 5. India Long Term Capital Gains Tax Calculator
// ---------------------------------------------------------------------------

const indiaLongTermCapitalGainsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  // 0=equity, 1=property acquired on/after 23 Jul 2024, 2=property acquired
  // before 23 Jul 2024 (grandfathered choice), 3=other assets.
  const assetCategory = safeNumber(values.assetCategory, 0);
  const saleValue = Math.max(0, safeNumber(values.saleValue));
  const costOfAcquisition = Math.max(0, safeNumber(values.costOfAcquisition));
  const indexedCostOfAcquisition = Math.max(0, safeNumber(values.indexedCostOfAcquisition));

  const ltcg = Math.max(0, saleValue - costOfAcquisition);

  let taxWithoutIndexation = 0;
  let taxWithIndexation = 0;
  let recommendedTax = 0;

  if (assetCategory === 0) {
    const taxableGain = Math.max(0, ltcg - EQUITY_LTCG_EXEMPTION_2026);
    taxWithoutIndexation = taxableGain * EQUITY_LTCG_RATE_2026;
    recommendedTax = taxWithoutIndexation;
  } else if (assetCategory === 2) {
    // Grandfathered property — taxpayer picks the lower of the two.
    taxWithoutIndexation = ltcg * PROPERTY_OTHER_LTCG_RATE_NO_INDEX_2026;
    if (indexedCostOfAcquisition > 0) {
      const ltcgIndexed = Math.max(0, saleValue - indexedCostOfAcquisition);
      taxWithIndexation = ltcgIndexed * PROPERTY_LTCG_RATE_WITH_INDEX_2026;
      recommendedTax = Math.min(taxWithoutIndexation, taxWithIndexation);
    } else {
      recommendedTax = taxWithoutIndexation;
    }
  } else {
    // Property acquired on/after 23 Jul 2024, or other assets — no choice.
    taxWithoutIndexation = ltcg * PROPERTY_OTHER_LTCG_RATE_NO_INDEX_2026;
    recommendedTax = taxWithoutIndexation;
  }

  // Only meaningful for the grandfathered-property comparison — the gap
  // between the higher (unchosen) option and the lower one actually used.
  const savingsFromChoice =
    assetCategory === 2 && indexedCostOfAcquisition > 0 ? Math.max(taxWithoutIndexation, taxWithIndexation) - recommendedTax : 0;
  const netProceeds = saleValue - recommendedTax;

  return {
    ltcgAmount: ltcg,
    taxWithoutIndexation,
    taxWithIndexation,
    recommendedTax,
    savingsFromChoice,
    netProceeds,
  };
};

// ---------------------------------------------------------------------------
// 6. India Dividend Tax Calculator
// ---------------------------------------------------------------------------

const indiaDividendTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const dividendAmount = Math.max(0, safeNumber(values.dividendAmount));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));

  const taxOnDividend = stackedTax(otherTaxableIncome, dividendAmount, NEW_REGIME_BRACKETS_2026);
  const tdsDeducted = dividendAmount > 10000 ? dividendAmount * 0.1 : 0;
  const netDividendAfterTax = dividendAmount - taxOnDividend;
  const balanceTaxAfterTds = Math.max(0, taxOnDividend - tdsDeducted);

  return {
    taxOnDividend,
    tdsDeducted,
    balanceTaxAfterTds,
    netDividendAfterTax,
  };
};

// ---------------------------------------------------------------------------
// 7. India Property Tax Calculator (Mumbai/BMC Capital Value System model)
// ---------------------------------------------------------------------------

const indiaPropertyTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const carpetAreaSqFt = Math.max(0, safeNumber(values.carpetAreaSqFt));
  const capitalValuePerSqFt = Math.max(0, safeNumber(values.capitalValuePerSqFt));
  const usageWeight = safeNumber(values.usageWeight, 1);
  const ageFactor = safeNumber(values.ageFactor, 1);
  const taxRatePercent = Math.max(0, safeNumber(values.taxRatePercent));

  const capitalValue = carpetAreaSqFt * capitalValuePerSqFt * usageWeight * ageFactor;
  // BMC exemption: residential units up to 500 sq ft carpet area.
  const isExempt = carpetAreaSqFt <= 500 && usageWeight === 1;
  const annualPropertyTax = isExempt ? 0 : capitalValue * (taxRatePercent / 100);

  return {
    capitalValue,
    isExempt: isExempt ? 1 : 0,
    annualPropertyTax,
  };
};

// ---------------------------------------------------------------------------
// 8. India Stamp Duty Calculator (Maharashtra representative)
// ---------------------------------------------------------------------------

const STAMP_DUTY_RATE_TABLE: Record<number, Record<number, number>> = {
  0: { 0: 0.06, 1: 0.05 }, // Mumbai: male, female-sole
  1: { 0: 0.07, 1: 0.06 }, // Pune/Thane/Nagpur
  2: { 0: 0.04, 1: 0.03 }, // Rural
};

const indiaStampDutyCalculator: CustomCalculator = (values: CalcInputValues) => {
  const agreementValue = Math.max(0, safeNumber(values.agreementValue));
  const readyReckonerValue = Math.max(0, safeNumber(values.readyReckonerValue));
  const location = safeNumber(values.location, 0);
  const buyerGender = safeNumber(values.buyerGender, 0);

  const dutiableValue = Math.max(agreementValue, readyReckonerValue);
  const rate = STAMP_DUTY_RATE_TABLE[location]?.[buyerGender] ?? STAMP_DUTY_RATE_TABLE[0][0];
  const stampDuty = dutiableValue * rate;
  const registrationFee = Math.min(dutiableValue * 0.01, 30000);
  const totalCost = stampDuty + registrationFee;

  return {
    dutiableValue,
    stampDuty,
    registrationFee,
    totalCost,
  };
};

// ---------------------------------------------------------------------------
// 9. India Professional Tax Calculator (Maharashtra representative)
// ---------------------------------------------------------------------------

function monthlyProfessionalTax(monthlySalary: number, isWomanExempt: boolean): number {
  if (isWomanExempt && monthlySalary <= 25000) return 0;
  if (monthlySalary <= 7500) return 0;
  if (monthlySalary <= 10000) return 175;
  return 200;
}

const indiaProfessionalTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const monthlySalary = Math.max(0, safeNumber(values.monthlySalary));
  const isWomanExempt = safeNumber(values.isWomanExempt) === 1;

  const monthlyTax = monthlyProfessionalTax(monthlySalary, isWomanExempt);
  // February carries the top-up (₹300 instead of ₹200) so 11×200+300=2,500
  // hits the constitutional annual cap exactly.
  const februaryTax = monthlyTax === 200 ? 300 : monthlyTax;
  const annualTax = monthlyTax * 11 + februaryTax;

  return {
    monthlyTax,
    februaryTax,
    annualTax,
  };
};

// ---------------------------------------------------------------------------
// 10. India Self Employment Tax Calculator (presumptive taxation)
// ---------------------------------------------------------------------------

const indiaSelfEmploymentTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const turnoverOrReceipts = Math.max(0, safeNumber(values.turnoverOrReceipts));
  const isProfessional = safeNumber(values.isProfessional) === 1;
  const digitalReceiptsPercent = Math.max(0, Math.min(100, safeNumber(values.digitalReceiptsPercent, 100)));
  const isNewRegime = safeNumber(values.taxRegime, 1) !== 0;

  const cashReceiptsPercent = 100 - digitalReceiptsPercent;
  const enhancedLimitApplies = cashReceiptsPercent <= CASH_RECEIPTS_ENHANCED_THRESHOLD_PERCENT;

  let threshold: number;
  let presumptiveRate: number;
  if (isProfessional) {
    threshold = enhancedLimitApplies ? PRESUMPTIVE_PROFESSIONAL_THRESHOLD_ENHANCED : PRESUMPTIVE_PROFESSIONAL_THRESHOLD_STANDARD;
    presumptiveRate = PRESUMPTIVE_PROFESSIONAL_RATE;
  } else {
    threshold = enhancedLimitApplies ? PRESUMPTIVE_BUSINESS_THRESHOLD_ENHANCED : PRESUMPTIVE_BUSINESS_THRESHOLD_STANDARD;
    presumptiveRate = enhancedLimitApplies ? PRESUMPTIVE_DIGITAL_RATE : PRESUMPTIVE_CASH_RATE;
  }

  const isEligible = turnoverOrReceipts <= threshold;
  const presumptiveIncome = turnoverOrReceipts * presumptiveRate;

  const brackets = isNewRegime ? NEW_REGIME_BRACKETS_2026 : OLD_REGIME_BRACKETS_2026;
  const slabTax = progressiveTax(presumptiveIncome, brackets);
  const taxAfterRebate = applyRebate(presumptiveIncome, slabTax, isNewRegime);
  const cess = taxAfterRebate * CESS_RATE_2026;
  const totalTax = taxAfterRebate + cess;
  const netIncome = presumptiveIncome - totalTax;

  return {
    isEligible: isEligible ? 1 : 0,
    thresholdApplicable: threshold,
    presumptiveIncome,
    incomeTax: taxAfterRebate,
    cess,
    totalTax,
    netIncome,
  };
};

export const indiaExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "india-gst-calculator": indiaGstCalculator,
  "india-tds-calculator": indiaTdsCalculator,
  "india-capital-gains-tax-calculator": indiaCapitalGainsTaxCalculator,
  "india-short-term-capital-gains-tax-calculator": indiaShortTermCapitalGainsTaxCalculator,
  "india-long-term-capital-gains-tax-calculator": indiaLongTermCapitalGainsTaxCalculator,
  "india-dividend-tax-calculator": indiaDividendTaxCalculator,
  "india-property-tax-calculator": indiaPropertyTaxCalculator,
  "india-stamp-duty-calculator": indiaStampDutyCalculator,
  "india-professional-tax-calculator": indiaProfessionalTaxCalculator,
  "india-self-employment-tax-calculator": indiaSelfEmploymentTaxCalculator,
};
