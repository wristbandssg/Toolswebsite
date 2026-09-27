/**
 * US state Estate Tax, Inheritance Tax, and Gift Tax calculators — 18 tools
 * under the existing "Tax & Paycheck Calculators" category, first batch of
 * the 50-state audit (see the state_tax_audit.xlsx delivered to the user
 * 27 Sep 2026 — "Category-family" batching, this is the smallest family).
 *
 *  - Gift Tax:        Connecticut (the ONLY US state with one) — 1 tool
 *  - Inheritance Tax: Kentucky, Maryland, Nebraska, New Jersey,
 *                      Pennsylvania — 5 tools
 *  - Estate Tax:      Connecticut, Hawaii, Illinois, Maine, Maryland,
 *                      Massachusetts, Minnesota, New York, Oregon,
 *                      Rhode Island, Vermont, Washington — 12 tools
 *
 * SHARED APPROXIMATION — read this before touching any function below.
 * Several states publish a graduated rate schedule (many bracket edges)
 * rather than a single flat rate, but the audit's research pass only
 * confirmed the LOW and HIGH end of that schedule (e.g. "0.8%-16%"), not
 * every bracket boundary — reproducing exact brackets from memory would
 * risk quietly-wrong numbers on a live financial-content site. Instead,
 * every graduated schedule here is approximated with `graduatedEstimate()`:
 * the MARGINAL rate is modeled as rising in a straight line from `lowRate`
 * at $0 of taxable amount to `highRate` at `ceiling`, then holding flat at
 * `highRate` beyond the ceiling; the function returns the tax owed as the
 * area under that marginal-rate line (a smooth, monotonic function that
 * matches the two confirmed endpoints exactly and interpolates between
 * them) — the same disclosed-approximation spirit as the Alabama
 * calculator's straight-line standard-deduction interpolation. Every tool
 * built on this helper says so plainly in its Assumptions text and
 * recommends verifying the exact bracket edges with the state's own
 * Department of Revenue for amounts near a threshold.
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

/** Smoothed approximation of a graduated tax schedule whose marginal rate
 * rises linearly from `lowRate` (at taxable = 0) to `highRate` (at
 * taxable = ceiling), then stays flat at `highRate` beyond the ceiling.
 * Returns the total tax owed on `taxable` (never negative). */
function graduatedEstimate(taxable: number, lowRate: number, highRate: number, ceiling: number): number {
  const t = Math.max(0, taxable);
  if (t <= 0) return 0;
  if (t >= ceiling) {
    const areaToCeiling = lowRate * ceiling + ((highRate - lowRate) * ceiling) / 2;
    return areaToCeiling + highRate * (t - ceiling);
  }
  return lowRate * t + ((highRate - lowRate) / ceiling) * ((t * t) / 2);
}

// ---------------------------------------------------------------------------
// Gift Tax — Connecticut (only US state with one)
// ---------------------------------------------------------------------------

const CT_UNIFIED_EXEMPTION = 15_000_000;
const CT_UNIFIED_RATE = 0.12;

function connecticutGiftTaxCalculator(values: Record<string, number>) {
  const giftsThisYear = Math.max(0, safeNumber(values.giftsThisYear));
  const priorTaxableGifts = Math.max(0, safeNumber(values.priorTaxableGifts));

  const totalAfter = priorTaxableGifts + giftsThisYear;
  const excessBefore = Math.max(0, priorTaxableGifts - CT_UNIFIED_EXEMPTION);
  const excessAfter = Math.max(0, totalAfter - CT_UNIFIED_EXEMPTION);
  const newlyTaxableThisYear = Math.max(0, excessAfter - excessBefore);
  const giftTaxOwed = newlyTaxableThisYear * CT_UNIFIED_RATE;
  const remainingExemption = Math.max(0, CT_UNIFIED_EXEMPTION - totalAfter);

  return {
    cumulativeLifetimeGifts: totalAfter,
    newlyTaxableAmount: newlyTaxableThisYear,
    giftTaxOwed,
    remainingLifetimeExemption: remainingExemption,
  };
}

// ---------------------------------------------------------------------------
// Inheritance Tax — Kentucky, Maryland, Nebraska, New Jersey, Pennsylvania
// ---------------------------------------------------------------------------

function kentuckyInheritanceTaxCalculator(values: Record<string, number>) {
  const amount = Math.max(0, safeNumber(values.inheritanceAmount));
  const beneficiaryClass = safeNumber(values.beneficiaryClass); // 0 = Class A (exempt), 1 = Class B/C

  if (beneficiaryClass === 0) {
    return { exemptionApplied: amount, taxableAmount: 0, estimatedTax: 0, effectiveRate: 0 };
  }
  const EXEMPTION = 1_000;
  const taxable = Math.max(0, amount - EXEMPTION);
  const estimatedTax = graduatedEstimate(taxable, 0.04, 0.16, 200_000);
  return {
    exemptionApplied: Math.min(amount, EXEMPTION),
    taxableAmount: taxable,
    estimatedTax,
    effectiveRate: amount > 0 ? estimatedTax / amount : 0,
  };
}

function marylandInheritanceTaxCalculator(values: Record<string, number>) {
  const amount = Math.max(0, safeNumber(values.inheritanceAmount));
  const beneficiaryClass = safeNumber(values.beneficiaryClass); // 0 = exempt relationship, 1 = non-exempt

  if (beneficiaryClass === 0) {
    return { exemptionApplied: amount, taxableAmount: 0, estimatedTax: 0, effectiveRate: 0 };
  }
  const EXEMPTION = 1_000;
  const taxable = Math.max(0, amount - EXEMPTION);
  const estimatedTax = taxable * 0.1; // flat 10%, not graduated
  return {
    exemptionApplied: Math.min(amount, EXEMPTION),
    taxableAmount: taxable,
    estimatedTax,
    effectiveRate: amount > 0 ? estimatedTax / amount : 0,
  };
}

function nebraskaInheritanceTaxCalculator(values: Record<string, number>) {
  const amount = Math.max(0, safeNumber(values.inheritanceAmount));
  const relationship = safeNumber(values.relationship); // 0 spouse, 1 close, 2 remote, 3 other

  const TIERS: Record<number, { exemption: number; rate: number }> = {
    0: { exemption: amount, rate: 0 }, // spouse: fully exempt
    1: { exemption: 100_000, rate: 0.01 },
    2: { exemption: 40_000, rate: 0.11 },
    3: { exemption: 25_000, rate: 0.15 },
  };
  const tier = TIERS[relationship] ?? TIERS[3];
  const taxable = Math.max(0, amount - tier.exemption);
  const estimatedTax = taxable * tier.rate;
  return {
    exemptionApplied: Math.min(amount, tier.exemption),
    taxableAmount: taxable,
    estimatedTax,
    effectiveRate: amount > 0 ? estimatedTax / amount : 0,
  };
}

function newJerseyInheritanceTaxCalculator(values: Record<string, number>) {
  const amount = Math.max(0, safeNumber(values.inheritanceAmount));
  const beneficiaryClass = safeNumber(values.beneficiaryClass); // 0 A/E exempt, 1 Class C, 2 Class D

  if (beneficiaryClass === 0) {
    return { exemptionApplied: amount, taxableAmount: 0, estimatedTax: 0, effectiveRate: 0 };
  }
  if (beneficiaryClass === 1) {
    const EXEMPTION = 25_000;
    const taxable = Math.max(0, amount - EXEMPTION);
    const estimatedTax = graduatedEstimate(taxable, 0.11, 0.16, 1_700_000);
    return {
      exemptionApplied: Math.min(amount, EXEMPTION),
      taxableAmount: taxable,
      estimatedTax,
      effectiveRate: amount > 0 ? estimatedTax / amount : 0,
    };
  }
  // Class D: no exemption
  const estimatedTax = graduatedEstimate(amount, 0.15, 0.16, 700_000);
  return {
    exemptionApplied: 0,
    taxableAmount: amount,
    estimatedTax,
    effectiveRate: amount > 0 ? estimatedTax / amount : 0,
  };
}

function pennsylvaniaInheritanceTaxCalculator(values: Record<string, number>) {
  const amount = Math.max(0, safeNumber(values.inheritanceAmount));
  const beneficiaryClass = safeNumber(values.beneficiaryClass);
  // 0 spouse/minor child from parent (exempt), 1 lineal, 2 sibling, 3 other, 4 charity (exempt)
  const RATES: Record<number, number> = { 0: 0, 1: 0.045, 2: 0.12, 3: 0.15, 4: 0 };
  const rate = RATES[beneficiaryClass] ?? RATES[3];
  const estimatedTax = amount * rate;
  return {
    taxableAmount: amount,
    rateApplied: rate,
    estimatedTax,
    effectiveRate: rate,
  };
}

// ---------------------------------------------------------------------------
// Estate Tax — Connecticut, Hawaii, Illinois, Maine, Maryland, Massachusetts,
// Minnesota, New York, Oregon, Rhode Island, Vermont, Washington
// ---------------------------------------------------------------------------

function connecticutEstateTaxCalculator(values: Record<string, number>) {
  const grossEstate = Math.max(0, safeNumber(values.grossEstate));
  const priorTaxableGifts = Math.max(0, safeNumber(values.priorTaxableGifts));
  const giftTaxAlreadyPaid = Math.max(0, safeNumber(values.giftTaxAlreadyPaid));

  const combined = grossEstate + priorTaxableGifts;
  const excess = Math.max(0, combined - CT_UNIFIED_EXEMPTION);
  const grossLiability = excess * CT_UNIFIED_RATE;
  const estateTaxDue = Math.max(0, grossLiability - giftTaxAlreadyPaid);

  return {
    combinedTaxableAmount: combined,
    exemptionUsed: Math.min(combined, CT_UNIFIED_EXEMPTION),
    grossEstateAndGiftTax: grossLiability,
    giftTaxAlreadyPaid,
    estateTaxDue,
  };
}

function hawaiiEstateTaxCalculator(values: Record<string, number>) {
  return simpleExcessEstateTax(values, 5_490_000, 0.1, 0.2, 10_000_000);
}
function illinoisEstateTaxCalculator(values: Record<string, number>) {
  return simpleExcessEstateTax(values, 4_000_000, 0.008, 0.16, 9_500_000);
}
function maineEstateTaxCalculator(values: Record<string, number>) {
  return simpleExcessEstateTax(values, 7_000_000, 0.08, 0.12, 8_000_000);
}
function marylandEstateTaxCalculator(values: Record<string, number>) {
  return simpleExcessEstateTax(values, 5_000_000, 0.008, 0.16, 9_500_000);
}
function minnesotaEstateTaxCalculator(values: Record<string, number>) {
  return simpleExcessEstateTax(values, 3_000_000, 0.13, 0.16, 2_000_000);
}
function oregonEstateTaxCalculator(values: Record<string, number>) {
  return simpleExcessEstateTax(values, 1_000_000, 0.1, 0.16, 9_500_000);
}
function rhodeIslandEstateTaxCalculator(values: Record<string, number>) {
  return simpleExcessEstateTax(values, 1_838_056, 0.008, 0.16, 9_500_000);
}
function washingtonEstateTaxCalculator(values: Record<string, number>) {
  return simpleExcessEstateTax(values, 3_000_000, 0.1, 0.2, 6_000_000);
}

/** Shared shape for the 8 "excess-over-exemption, graduated, no cliff"
 * estate tax states above. */
function simpleExcessEstateTax(
  values: Record<string, number>,
  exemption: number,
  lowRate: number,
  highRate: number,
  ceiling: number
) {
  const grossEstate = Math.max(0, safeNumber(values.grossEstate));
  const excess = Math.max(0, grossEstate - exemption);
  const estateTaxDue = graduatedEstimate(excess, lowRate, highRate, ceiling);
  return {
    exemptionApplied: Math.min(grossEstate, exemption),
    taxableEstate: excess,
    estateTaxDue,
    effectiveRate: grossEstate > 0 ? estateTaxDue / grossEstate : 0,
  };
}

const MA_ESTATE_THRESHOLD = 2_000_000;
const MA_ESTATE_CREDIT = 99_600;

function massachusettsEstateTaxCalculator(values: Record<string, number>) {
  const grossEstate = Math.max(0, safeNumber(values.grossEstate));
  if (grossEstate <= MA_ESTATE_THRESHOLD) {
    return { thresholdCleared: 0, scheduleTaxBeforeCredit: 0, credit: 0, estateTaxDue: 0, effectiveRate: 0 };
  }
  const scheduleTax = graduatedEstimate(grossEstate, 0.008, 0.16, 9_500_000);
  const estateTaxDue = Math.max(0, scheduleTax - MA_ESTATE_CREDIT);
  return {
    thresholdCleared: 1,
    scheduleTaxBeforeCredit: scheduleTax,
    credit: MA_ESTATE_CREDIT,
    estateTaxDue,
    effectiveRate: grossEstate > 0 ? estateTaxDue / grossEstate : 0,
  };
}

const NY_ESTATE_EXEMPTION = 7_350_000;
const NY_ESTATE_CLIFF = 7_717_500; // 105% of exemption

function newYorkEstateTaxCalculator(values: Record<string, number>) {
  const grossEstate = Math.max(0, safeNumber(values.grossEstate));
  if (grossEstate <= NY_ESTATE_EXEMPTION) {
    return { zone: 0, estateTaxDue: 0, effectiveRate: 0 };
  }
  const fullScheduleTaxAtCliff = graduatedEstimate(NY_ESTATE_CLIFF, 0.0306, 0.16, 10_100_000);
  if (grossEstate >= NY_ESTATE_CLIFF) {
    const estateTaxDue = graduatedEstimate(grossEstate, 0.0306, 0.16, 10_100_000);
    return { zone: 2, estateTaxDue, effectiveRate: grossEstate > 0 ? estateTaxDue / grossEstate : 0 };
  }
  // Between 100% and 105% of the exemption — the exemption phases out, so
  // approximate the phase-in of tax linearly across this narrow band.
  const fraction = (grossEstate - NY_ESTATE_EXEMPTION) / (NY_ESTATE_CLIFF - NY_ESTATE_EXEMPTION);
  const estateTaxDue = fullScheduleTaxAtCliff * fraction;
  return { zone: 1, estateTaxDue, effectiveRate: grossEstate > 0 ? estateTaxDue / grossEstate : 0 };
}

function vermontEstateTaxCalculator(values: Record<string, number>) {
  const grossEstate = Math.max(0, safeNumber(values.grossEstate));
  const EXEMPTION = 5_000_000;
  const excess = Math.max(0, grossEstate - EXEMPTION);
  const estateTaxDue = excess * 0.16; // flat rate, not graduated
  return {
    exemptionApplied: Math.min(grossEstate, EXEMPTION),
    taxableEstate: excess,
    estateTaxDue,
    effectiveRate: grossEstate > 0 ? estateTaxDue / grossEstate : 0,
  };
}

export const usEstateInheritanceGiftCustomCalculators: Record<
  string,
  CustomCalculator
> = {
  "connecticut-gift-tax-calculator": connecticutGiftTaxCalculator,
  "kentucky-inheritance-tax-calculator": kentuckyInheritanceTaxCalculator,
  "maryland-inheritance-tax-calculator": marylandInheritanceTaxCalculator,
  "nebraska-inheritance-tax-calculator": nebraskaInheritanceTaxCalculator,
  "new-jersey-inheritance-tax-calculator": newJerseyInheritanceTaxCalculator,
  "pennsylvania-inheritance-tax-calculator": pennsylvaniaInheritanceTaxCalculator,
  "connecticut-estate-tax-calculator": connecticutEstateTaxCalculator,
  "hawaii-estate-tax-calculator": hawaiiEstateTaxCalculator,
  "illinois-estate-tax-calculator": illinoisEstateTaxCalculator,
  "maine-estate-tax-calculator": maineEstateTaxCalculator,
  "maryland-estate-tax-calculator": marylandEstateTaxCalculator,
  "massachusetts-estate-tax-calculator": massachusettsEstateTaxCalculator,
  "minnesota-estate-tax-calculator": minnesotaEstateTaxCalculator,
  "new-york-estate-tax-calculator": newYorkEstateTaxCalculator,
  "oregon-estate-tax-calculator": oregonEstateTaxCalculator,
  "rhode-island-estate-tax-calculator": rhodeIslandEstateTaxCalculator,
  "vermont-estate-tax-calculator": vermontEstateTaxCalculator,
  "washington-estate-tax-calculator": washingtonEstateTaxCalculator,
};
