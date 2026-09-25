/**
 * A second batch of "Tax Calculators" tools (32 this time), also filed
 * directly under the "Tax Calculators" category alongside the 12
 * country/state sub-categories and the 30 US-federal income/salary tools in
 * calc-engine-us-tax-salary-calculators.ts. Three families, from one
 * spreadsheet the admin supplied:
 *   - Capital Gains Tax (11 tools) — US federal only, continuing the same
 *     "national-baseline, federal-only" scope already established for this
 *     category's other US tools.
 *   - Sales Tax (11 tools) — country/jurisdiction-agnostic: the visitor
 *     supplies their own rate(s), since US sales tax varies by state,
 *     county, and city with no single national rate.
 *   - VAT (10 tools) — likewise jurisdiction-agnostic: the visitor supplies
 *     their own VAT rate, since VAT varies by country (20% UK, 19% Germany,
 *     ...) with no single rate to hard-code.
 *
 * FEDERAL FIGURES USED (2026, Capital Gains family only — Sales Tax and VAT
 * need no jurisdiction-specific constants at all):
 *   - Ordinary tax brackets + standard deduction: same IRS Rev. Proc.
 *     2025-32 figures as calc-engine-us-tax-salary-calculators.ts (kept in
 *     sync by hand, same as every other file in this family).
 *   - Long-term capital gains brackets (0%/15%/20%): IRS Rev. Proc. 2025-32.
 *   - Net Investment Income Tax (3.8%): IRC §1411, thresholds fixed by
 *     statute (not inflation-adjusted) — $200,000 Single/HoH, $250,000 MFJ,
 *     $125,000 MFS. Coincidentally the same dollar thresholds as the
 *     Additional Medicare Tax (both introduced by the same 2013 law), but
 *     it's a separate 3.8% tax on net investment income, not payroll tax.
 *   - Section 121 primary-residence exclusion ($250,000 Single/MFS/HoH,
 *     $500,000 MFJ): IRC §121, a fixed statutory amount, not
 *     inflation-adjusted.
 *   - Unrecaptured Section 1250 gain (depreciation recapture on real
 *     property): taxed at ordinary rates, capped at a 25% maximum rate —
 *     IRC §1(h).
 *
 * Every capital gains calculator here is the same "estimate-grade" model
 * already documented across the site: standard deduction only, no state
 * tax, no itemizing, no every-situation nuance (like wash sales, Qualified
 * Opportunity Zones, or 1031 exchanges) — a solid planning estimate, not a
 * substitute for a tax professional.
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

// ---------------------------------------------------------------------------
// Shared federal constants (Capital Gains family only) — see
// calc-engine-us-tax-salary-calculators.ts for the same figures used by
// that file; duplicated here by the same one-file-per-family convention.
// ---------------------------------------------------------------------------

type FilingStatus = 0 | 1 | 2 | 3; // 0=Single 1=MFJ 2=MFS 3=HoH

const ORDINARY_BRACKETS_2026: Record<0 | 1 | 3, { rate: number; upTo: number }[]> = {
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

const LTCG_BRACKETS_2026: Record<0 | 1 | 3, { rate: number; upTo: number }[]> = {
  0: [
    { rate: 0, upTo: 49450 },
    { rate: 0.15, upTo: 545500 },
    { rate: 0.2, upTo: Infinity },
  ],
  1: [
    { rate: 0, upTo: 98900 },
    { rate: 0.15, upTo: 613700 },
    { rate: 0.2, upTo: Infinity },
  ],
  3: [
    { rate: 0, upTo: 66200 },
    { rate: 0.15, upTo: 579600 },
    { rate: 0.2, upTo: Infinity },
  ],
};

const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 16100,
  1: 32200,
  2: 16100,
  3: 24150,
};

// Net Investment Income Tax thresholds — IRC §1411, fixed by statute (not
// inflation-adjusted, unlike the brackets/deduction above).
const NIIT_THRESHOLD: Record<FilingStatus, number> = {
  0: 200000,
  1: 250000,
  2: 125000,
  3: 200000,
};
const NIIT_RATE = 0.038;

// Section 121 primary-residence exclusion — IRC §121, fixed by statute.
const SECTION_121_EXCLUSION: Record<FilingStatus, number> = {
  0: 250000,
  1: 500000,
  2: 250000,
  3: 250000,
};

// Unrecaptured Section 1250 gain (depreciation recapture) is taxed at
// ordinary rates, capped at this maximum rate — IRC §1(h)(1)(E).
const DEPRECIATION_RECAPTURE_MAX_RATE = 0.25;

const FILING_STATUS_VALUES: FilingStatus[] = [0, 1, 2, 3];

function normalizeFilingStatus(raw: number | undefined): FilingStatus {
  const rounded = Math.round(safeNumber(raw, 0));
  return (FILING_STATUS_VALUES as number[]).includes(rounded) ? (rounded as FilingStatus) : 0;
}

/** MFS brackets are, by law/convention, exactly half of MFJ's dollar
 * thresholds — derived rather than hand-copied, same approach used
 * throughout this site's other US calculators. Applies to both the
 * ordinary brackets and the LTCG brackets. */
function halveForMfs(brackets: { rate: number; upTo: number }[]) {
  return brackets.map((b) => ({ rate: b.rate, upTo: b.upTo === Infinity ? Infinity : b.upTo / 2 }));
}

function ordinaryBracketsFor(status: FilingStatus) {
  if (status === 2) return halveForMfs(ORDINARY_BRACKETS_2026[1]);
  return ORDINARY_BRACKETS_2026[status] ?? ORDINARY_BRACKETS_2026[0];
}

function ltcgBracketsFor(status: FilingStatus) {
  if (status === 2) return halveForMfs(LTCG_BRACKETS_2026[1]);
  return LTCG_BRACKETS_2026[status] ?? LTCG_BRACKETS_2026[0];
}

/** Tax on a SLICE of income of size `amount` that stacks starting at
 * `floor` (typically "taxable income before this gain"), run through
 * `brackets`. This is the standard way both ordinary "stacked on top of
 * other income" tax AND the capital-gains bracket "stacking rule" (Schedule
 * D Tax Worksheet) are modeled: the gain doesn't start from $0, it starts
 * wherever the filer's other taxable income already put them. */
function stackedTax(floor: number, amount: number, brackets: { rate: number; upTo: number }[]): number {
  let tax = 0;
  let remaining = Math.max(0, amount);
  let cursor = Math.max(0, floor);
  for (const band of brackets) {
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

function marginalRateAtFloor(floor: number, brackets: { rate: number; upTo: number }[]): number {
  for (const band of brackets) {
    if (floor < band.upTo) return band.rate;
  }
  return brackets[brackets.length - 1]?.rate ?? 0;
}

function niitOn(gainAmount: number, otherIncome: number, filingStatus: FilingStatus): number {
  // Approximates MAGI as other income + the gain itself (NIIT's actual MAGI
  // definition has its own adjustments this "estimate-grade" model doesn't
  // reproduce, same spirit as every other simplification on this site).
  const magi = otherIncome + gainAmount;
  const threshold = NIIT_THRESHOLD[filingStatus];
  const excessOverThreshold = Math.max(0, magi - threshold);
  return NIIT_RATE * Math.min(gainAmount, excessOverThreshold);
}

function otherTaxableIncome(otherIncome: number, filingStatus: FilingStatus): number {
  return Math.max(0, otherIncome - STANDARD_DEDUCTION_2026[filingStatus]);
}

// ---------------------------------------------------------------------------
// Capital Gains Tax family
// ---------------------------------------------------------------------------

function computeCapitalGains(
  otherIncome: number,
  gainAmount: number,
  isLongTerm: boolean,
  filingStatus: FilingStatus
) {
  const floor = otherTaxableIncome(otherIncome, filingStatus);
  const brackets = isLongTerm ? ltcgBracketsFor(filingStatus) : ordinaryBracketsFor(filingStatus);
  const capitalGainsTax = stackedTax(floor, gainAmount, brackets);
  const niit = niitOn(gainAmount, otherIncome, filingStatus);
  const totalTax = capitalGainsTax + niit;
  const netProceeds = Math.max(0, gainAmount - totalTax);
  const effectiveRate = gainAmount > 0 ? (totalTax / gainAmount) * 100 : 0;
  return { capitalGainsTax, niit, totalTax, netProceeds, effectiveRate };
}

function readCapitalGainsInputs(values: Record<string, number>) {
  return {
    otherIncome: Math.max(0, safeNumber(values.otherIncome)),
    gainAmount: Math.max(0, safeNumber(values.gainAmount)),
    filingStatus: normalizeFilingStatus(values.filingStatus),
  };
}

const capitalGainsCalculator: CustomCalculator = (values) => {
  const { otherIncome, gainAmount, filingStatus } = readCapitalGainsInputs(values);
  const isLongTerm = Math.round(safeNumber(values.holdingPeriod, 1)) === 1;
  const r = computeCapitalGains(otherIncome, gainAmount, isLongTerm, filingStatus);
  return {
    capitalGainsTax: r.capitalGainsTax,
    niit: r.niit,
    totalTax: r.totalTax,
    netProceeds: r.netProceeds,
    effectiveRate: r.effectiveRate,
  };
};

const longTermCapitalGainsCalculator: CustomCalculator = (values) => {
  const { otherIncome, gainAmount, filingStatus } = readCapitalGainsInputs(values);
  const r = computeCapitalGains(otherIncome, gainAmount, true, filingStatus);
  return {
    capitalGainsTax: r.capitalGainsTax,
    niit: r.niit,
    totalTax: r.totalTax,
    netProceeds: r.netProceeds,
    effectiveRate: r.effectiveRate,
  };
};

const shortTermCapitalGainsCalculator: CustomCalculator = (values) => {
  const { otherIncome, gainAmount, filingStatus } = readCapitalGainsInputs(values);
  const r = computeCapitalGains(otherIncome, gainAmount, false, filingStatus);
  return {
    capitalGainsTax: r.capitalGainsTax,
    niit: r.niit,
    totalTax: r.totalTax,
    netProceeds: r.netProceeds,
    effectiveRate: r.effectiveRate,
  };
};

// Real Estate — same core math, plus an optional Section 121
// primary-residence exclusion that shields the first $250k/$500k of gain.
const realEstateCapitalGainsCalculator: CustomCalculator = (values) => {
  const { otherIncome, gainAmount, filingStatus } = readCapitalGainsInputs(values);
  const isLongTerm = Math.round(safeNumber(values.holdingPeriod, 1)) === 1;
  const claimExclusion = Math.round(safeNumber(values.claimHomeSaleExclusion, 0)) === 1;
  const exclusionAvailable = claimExclusion ? SECTION_121_EXCLUSION[filingStatus] : 0;
  const exclusionApplied = Math.min(exclusionAvailable, gainAmount);
  const taxableGain = Math.max(0, gainAmount - exclusionApplied);
  const r = computeCapitalGains(otherIncome, taxableGain, isLongTerm, filingStatus);
  return {
    exclusionApplied,
    taxableGain,
    capitalGainsTax: r.capitalGainsTax,
    niit: r.niit,
    totalTax: r.totalTax,
    netProceeds: Math.max(0, gainAmount - r.totalTax),
    effectiveRate: gainAmount > 0 ? (r.totalTax / gainAmount) * 100 : 0,
  };
};

// Rental Property — no Section 121 exclusion (not a primary residence), but
// the portion of the gain attributable to depreciation taken
// ("unrecaptured Section 1250 gain") is taxed at ordinary rates capped at
// 25%, with any remaining gain taxed as regular long-term capital gains.
const rentalPropertyCapitalGainsCalculator: CustomCalculator = (values) => {
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const totalGain = Math.max(0, safeNumber(values.totalGain));
  const depreciationRecaptureInput = Math.max(0, safeNumber(values.depreciationRecapture));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const recaptureAmount = Math.min(depreciationRecaptureInput, totalGain);
  const remainingGain = totalGain - recaptureAmount;
  const floor = otherTaxableIncome(otherIncome, filingStatus);

  const cappedOrdinaryBrackets = ordinaryBracketsFor(filingStatus).map((b) => ({
    rate: Math.min(b.rate, DEPRECIATION_RECAPTURE_MAX_RATE),
    upTo: b.upTo,
  }));
  const recaptureTax = stackedTax(floor, recaptureAmount, cappedOrdinaryBrackets);
  const remainingGainTax = stackedTax(floor + recaptureAmount, remainingGain, ltcgBracketsFor(filingStatus));
  const capitalGainsTax = recaptureTax + remainingGainTax;
  const niit = niitOn(totalGain, otherIncome, filingStatus);
  const totalTax = capitalGainsTax + niit;

  return {
    recaptureAmount,
    recaptureTax,
    remainingGainTax,
    niit,
    totalTax,
    netProceeds: Math.max(0, totalGain - totalTax),
  };
};

// Inherited Asset — stepped-up basis (cost basis reset to fair market value
// at date of death) and gain is ALWAYS treated as long-term, regardless of
// how long the heir actually held it before selling (IRC §1223(9)).
const inheritedAssetCapitalGainsCalculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice));
  const steppedUpBasis = Math.max(0, safeNumber(values.steppedUpBasis));
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const gainAmount = Math.max(0, salePrice - steppedUpBasis);
  const r = computeCapitalGains(otherIncome, gainAmount, true, filingStatus);
  return {
    gainAmount,
    capitalGainsTax: r.capitalGainsTax,
    niit: r.niit,
    totalTax: r.totalTax,
    netProceeds: r.netProceeds,
  };
};

// Gifted Asset — carryover basis (the recipient generally keeps the
// DONOR's original cost basis and holding period, IRC §1015/§1223(2)), so
// holding period is asked rather than assumed, unlike the inherited-asset
// case above.
const giftedAssetCapitalGainsCalculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice));
  const donorBasis = Math.max(0, safeNumber(values.donorBasis));
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const isLongTerm = Math.round(safeNumber(values.holdingPeriod, 1)) === 1;
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const gainAmount = Math.max(0, salePrice - donorBasis);
  const r = computeCapitalGains(otherIncome, gainAmount, isLongTerm, filingStatus);
  return {
    gainAmount,
    capitalGainsTax: r.capitalGainsTax,
    niit: r.niit,
    totalTax: r.totalTax,
    netProceeds: r.netProceeds,
  };
};

// Cost Basis — no tax rate math at all, just the arithmetic every gain
// calculation above depends on: adjusted cost basis and the resulting
// gain (or loss).
const costBasisCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice));
  const purchaseFees = Math.max(0, safeNumber(values.purchaseFees));
  const improvements = Math.max(0, safeNumber(values.improvements));
  const salePrice = Math.max(0, safeNumber(values.salePrice));
  const sellingCosts = Math.max(0, safeNumber(values.sellingCosts));

  const adjustedCostBasis = purchasePrice + purchaseFees + improvements;
  const netSaleProceeds = Math.max(0, salePrice - sellingCosts);
  const capitalGain = netSaleProceeds - adjustedCostBasis;

  return { adjustedCostBasis, netSaleProceeds, capitalGain };
};

// Rate lookup — which LTCG bracket (0/15/20%) applies given other taxable
// income, plus how much more room is left before the next rate kicks in.
const capitalGainsRateCalculator: CustomCalculator = (values) => {
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const floor = otherTaxableIncome(otherIncome, filingStatus);
  const brackets = ltcgBracketsFor(filingStatus);
  const rate = marginalRateAtFloor(floor, brackets) * 100;

  let roomAtThisRate = Infinity;
  for (const band of brackets) {
    if (floor < band.upTo) {
      roomAtThisRate = band.upTo === Infinity ? 0 : band.upTo - floor;
      break;
    }
  }

  return {
    yourLtcgRate: rate,
    roomAtThisRate: Number.isFinite(roomAtThisRate) ? roomAtThisRate : 0,
  };
};

// ---------------------------------------------------------------------------
// Sales Tax family — jurisdiction-agnostic (the visitor supplies the rate).
// ---------------------------------------------------------------------------

// One core forward/reverse engine: `priceIncludesTax` decides whether the
// entered price is treated as pre-tax (add tax to reach the total) or
// already tax-inclusive (extract the tax out of it). Every "core family"
// and most "distinct sub-intent" sales tax tools share this exact function
// — only the field's default value and the surrounding copy differ.
const coreSalesTaxCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price));
  const taxRate = Math.max(0, safeNumber(values.taxRate)) / 100;
  const priceIncludesTax = Math.round(safeNumber(values.priceIncludesTax, 0)) === 1;

  let preTaxPrice: number;
  let taxAmount: number;
  let totalPrice: number;
  if (priceIncludesTax) {
    totalPrice = price;
    preTaxPrice = price / (1 + taxRate);
    taxAmount = totalPrice - preTaxPrice;
  } else {
    preTaxPrice = price;
    taxAmount = price * taxRate;
    totalPrice = preTaxPrice + taxAmount;
  }

  return { preTaxPrice, taxAmount, totalPrice };
};

// Combined-rate engine — sums up to four separately-entered rate
// components (state + county + city + special district, or whichever
// subset a given tool asks for) into one effective rate before computing
// tax. Reused by City/County/Combined Sales Tax Calculators with different
// field labels but the same underlying keys.
const combinedRateSalesTaxCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price));
  const rateA = Math.max(0, safeNumber(values.stateRate));
  const rateB = Math.max(0, safeNumber(values.rateB));
  const rateC = Math.max(0, safeNumber(values.rateC));
  const rateD = Math.max(0, safeNumber(values.rateD));
  const combinedRatePercent = rateA + rateB + rateC + rateD;
  const taxAmount = price * (combinedRatePercent / 100);
  const totalPrice = price + taxAmount;

  return { combinedRatePercent, taxAmount, totalPrice };
};

// ---------------------------------------------------------------------------
// VAT family — jurisdiction-agnostic (the visitor supplies the rate).
// ---------------------------------------------------------------------------

const coreVatCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price));
  const vatRate = Math.max(0, safeNumber(values.vatRate)) / 100;
  const priceIncludesVat = Math.round(safeNumber(values.priceIncludesVat, 0)) === 1;

  let netPrice: number;
  let vatAmount: number;
  let grossPrice: number;
  if (priceIncludesVat) {
    grossPrice = price;
    netPrice = price / (1 + vatRate);
    vatAmount = grossPrice - netPrice;
  } else {
    netPrice = price;
    vatAmount = price * vatRate;
    grossPrice = netPrice + vatAmount;
  }

  return { netPrice, vatAmount, grossPrice };
};

// VAT Payable — the core business-accounting question: output VAT
// (collected on sales) minus input VAT (paid on purchases, reclaimable) —
// positive means owed to the tax authority, negative means a refund is due.
const vatPayableCalculator: CustomCalculator = (values) => {
  const outputVat = Math.max(0, safeNumber(values.outputVat));
  const inputVat = Math.max(0, safeNumber(values.inputVat));
  const net = outputVat - inputVat;
  const vatPayable = Math.max(0, net);
  const vatRefundDue = Math.max(0, -net);

  return { outputVat, inputVat, vatPayable, vatRefundDue };
};

// VAT Refund — for tourist/traveler VAT refund schemes: extracts the VAT
// from a gross purchase amount, then applies the refund service's handling
// fee (most tourist refund schemes deduct a percentage before paying out).
const vatRefundCalculator: CustomCalculator = (values) => {
  const grossPurchaseAmount = Math.max(0, safeNumber(values.grossPurchaseAmount));
  const vatRate = Math.max(0, safeNumber(values.vatRate)) / 100;
  const refundServiceFeeRate = Math.max(0, safeNumber(values.refundServiceFee)) / 100;

  const netPrice = grossPurchaseAmount / (1 + vatRate);
  const vatAmount = grossPurchaseAmount - netPrice;
  const serviceFeeDeducted = vatAmount * refundServiceFeeRate;
  const netRefund = Math.max(0, vatAmount - serviceFeeDeducted);

  return { vatAmount, serviceFeeDeducted, netRefund };
};

// VAT Rate — reverse-solves the effective VAT rate from a known net and
// gross price pair (handy when you know what something cost before and
// after VAT but not the rate itself).
const vatRateCalculator: CustomCalculator = (values) => {
  const netPrice = Math.max(0.01, safeNumber(values.netPrice, 0.01));
  const grossPrice = Math.max(0, safeNumber(values.grossPrice));
  const vatAmount = Math.max(0, grossPrice - netPrice);
  const effectiveVatRate = (vatAmount / netPrice) * 100;

  return { vatAmount, effectiveVatRate };
};

// VAT Registration Threshold — the visitor supplies their own country's
// threshold (these vary enormously — the UK's is very different from most
// EU countries'), so this stays a general-purpose comparison rather than a
// hard-coded number for one country.
const vatRegistrationThresholdCalculator: CustomCalculator = (values) => {
  const annualTaxableTurnover = Math.max(0, safeNumber(values.annualTaxableTurnover));
  const registrationThreshold = Math.max(0, safeNumber(values.registrationThreshold));
  const amountOverThreshold = Math.max(0, annualTaxableTurnover - registrationThreshold);
  const amountUntilThreshold = Math.max(0, registrationThreshold - annualTaxableTurnover);
  const mustRegister = annualTaxableTurnover >= registrationThreshold && registrationThreshold > 0 ? 1 : 0;

  return { mustRegister, amountOverThreshold, amountUntilThreshold };
};

// ---------------------------------------------------------------------------
// Registry — keyed by slug (see
// prisma/create-capital-gains-sales-vat-calculators.ts, which must stay in
// sync with these keys). As with the income/salary batch, several slugs
// intentionally point at the exact same function where the underlying math
// genuinely is identical.
// ---------------------------------------------------------------------------

export const capitalGainsSalesVatCustomCalculators: Record<string, CustomCalculator> = {
  // Capital Gains Tax family
  "capital-gains-tax-calculator": capitalGainsCalculator,
  "stock-capital-gains-calculator": capitalGainsCalculator,
  "crypto-capital-gains-calculator": capitalGainsCalculator,
  "long-term-capital-gains-calculator": longTermCapitalGainsCalculator,
  "short-term-capital-gains-calculator": shortTermCapitalGainsCalculator,
  "real-estate-capital-gains-calculator": realEstateCapitalGainsCalculator,
  "rental-property-capital-gains-calculator": rentalPropertyCapitalGainsCalculator,
  "inherited-asset-capital-gains-calculator": inheritedAssetCapitalGainsCalculator,
  "gifted-asset-capital-gains-calculator": giftedAssetCapitalGainsCalculator,
  "capital-gains-cost-basis-calculator": costBasisCalculator,
  "capital-gains-rate-calculator": capitalGainsRateCalculator,

  // Sales Tax family
  "sales-tax-calculator": coreSalesTaxCalculator,
  "sales-tax-exclusive-calculator": coreSalesTaxCalculator,
  "post-tax-price-calculator": coreSalesTaxCalculator,
  "use-tax-calculator": coreSalesTaxCalculator,
  "consumer-use-tax-calculator": coreSalesTaxCalculator,
  "reverse-sales-tax-calculator": coreSalesTaxCalculator,
  "sales-tax-inclusive-calculator": coreSalesTaxCalculator,
  "pre-tax-price-calculator": coreSalesTaxCalculator,
  "city-sales-tax-calculator": combinedRateSalesTaxCalculator,
  "county-sales-tax-calculator": combinedRateSalesTaxCalculator,
  "combined-sales-tax-calculator": combinedRateSalesTaxCalculator,

  // VAT family
  "vat-calculator": coreVatCalculator,
  "vat-exclusive-calculator": coreVatCalculator,
  "output-vat-calculator": coreVatCalculator,
  "reverse-vat-calculator": coreVatCalculator,
  "vat-inclusive-calculator": coreVatCalculator,
  "input-vat-calculator": coreVatCalculator,
  "vat-payable-calculator": vatPayableCalculator,
  "vat-refund-calculator": vatRefundCalculator,
  "vat-rate-calculator": vatRateCalculator,
  "vat-registration-threshold-calculator": vatRegistrationThresholdCalculator,
};
