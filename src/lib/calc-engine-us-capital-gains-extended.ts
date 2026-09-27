/**
 * US state Capital Gains Tax exceptions — 6 tools under the existing "Tax &
 * Paycheck Calculators" category, second batch of the 50-state audit (see
 * state_tax_audit.xlsx, delivered 27 Sep 2026). Every other US state taxes
 * capital gains as ordinary income (already covered by that state's base
 * income tax calculator) — these 6 states are the genuine, confirmed
 * exceptions:
 *
 *  - Washington — a unique standalone excise tax on long-term capital gains
 *    (no state income tax exists otherwise)
 *  - Hawaii     — an alternative flat-rate cap (7.25%) below its ordinary
 *    top income tax rate (11%)
 *  - Massachusetts — a real rate split: short-term gains at 8.5% vs
 *    long-term gains at 5%, plus the 4% "Millionaires surtax" above
 *    roughly $1.08M
 *  - Montana    — a distinct, lower two-bracket rate schedule for gains
 *    (3.0%/4.1%) than its ordinary income brackets (4.70%/5.65%)
 *  - Maryland   — a NEW (eff. 7/1/2025) 2% surcharge on net capital gains
 *    once federal AGI exceeds $350,000 — layered ON TOP of ordinary MD
 *    income tax on the same gain (see calc-engine-us.ts for that)
 *  - Missouri   — the first US state ever to fully repeal its individual
 *    capital gains tax (2025, retroactive to TY2025) — an honest "$0 owed"
 *    tool, same spirit as the NZ/SG/HK exemption tools already shipped
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

// Washington — excise tax on long-term capital gains only (no other state
// income tax exists). 7% up to $1M of taxable gain, 9.9% above $1M, after a
// standard deduction. Real estate, retirement accounts, and most small
// businesses are statutorily exempt — not modeled here, see assumptions.
const WA_STANDARD_DEDUCTION = 278_000; // 2025 figure; 2026 not yet published
function washingtonCapitalGainsTaxCalculator(values: Record<string, number>) {
  const gains = Math.max(0, safeNumber(values.longTermCapitalGains));
  const taxable = Math.max(0, gains - WA_STANDARD_DEDUCTION);
  const tax = 0.07 * Math.min(taxable, 1_000_000) + 0.099 * Math.max(0, taxable - 1_000_000);
  return {
    standardDeductionApplied: Math.min(gains, WA_STANDARD_DEDUCTION),
    taxableGain: taxable,
    excessOverOneMillion: Math.max(0, taxable - 1_000_000),
    capitalGainsExciseTax: tax,
    effectiveRate: gains > 0 ? tax / gains : 0,
  };
}

// Hawaii — capital gains are capped at a flat 7.25%, below the state's 11%
// ordinary top rate. Presented as the standard rate that applies to any
// taxpayer whose ordinary marginal rate would otherwise exceed it (true for
// nearly everyone with a meaningful gain, given HI's bracket structure).
const HI_CAP_RATE = 0.0725;
function hawaiiCapitalGainsTaxCalculator(values: Record<string, number>) {
  const gains = Math.max(0, safeNumber(values.netCapitalGains));
  const tax = gains * HI_CAP_RATE;
  return {
    ratedApplied: HI_CAP_RATE,
    capitalGainsTax: tax,
  };
}

// Massachusetts — short-term gains at 8.5%, long-term at 5%, plus a 4%
// surtax on income above roughly $1.08M (applied here to the gains portion
// above that threshold as a simplification — see assumptions).
const MA_SURTAX_THRESHOLD = 1_083_150;
function massachusettsCapitalGainsTaxCalculator(values: Record<string, number>) {
  const shortTerm = Math.max(0, safeNumber(values.shortTermGains));
  const longTerm = Math.max(0, safeNumber(values.longTermGains));
  const total = shortTerm + longTerm;
  const shortTermTax = shortTerm * 0.085;
  const longTermTax = longTerm * 0.05;
  const surtaxable = Math.max(0, total - MA_SURTAX_THRESHOLD);
  const surtax = surtaxable * 0.04;
  const totalTax = shortTermTax + longTermTax + surtax;
  return {
    shortTermTax,
    longTermTax,
    surtaxAmount: surtax,
    totalCapitalGainsTax: totalTax,
    effectiveRate: total > 0 ? totalTax / total : 0,
  };
}

// Montana — a distinct, lower 2-bracket rate schedule for capital gains
// (3.0%/4.1%) than its ordinary income tax brackets (4.70%/5.65%).
function montanaCapitalGainsTaxCalculator(values: Record<string, number>) {
  const gains = Math.max(0, safeNumber(values.netCapitalGains));
  const filingStatus = safeNumber(values.filingStatus); // 0 = single, 1 = joint
  const threshold = filingStatus === 1 ? 41_000 : 20_500;
  const tax = 0.03 * Math.min(gains, threshold) + 0.041 * Math.max(0, gains - threshold);
  return {
    bracketThreshold: threshold,
    lowerBracketTax: 0.03 * Math.min(gains, threshold),
    upperBracketTax: 0.041 * Math.max(0, gains - threshold),
    capitalGainsTax: tax,
    effectiveRate: gains > 0 ? tax / gains : 0,
  };
}

// Maryland — a NEW 2% surcharge on net capital gains once federal AGI
// exceeds $350,000, layered on top of ordinary MD income tax on the gain.
const MD_SURCHARGE_AGI_THRESHOLD = 350_000;
function marylandCapitalGainsSurchargeCalculator(values: Record<string, number>) {
  const gains = Math.max(0, safeNumber(values.netCapitalGains));
  const federalAGI = Math.max(0, safeNumber(values.federalAGI));
  const surcharge = federalAGI > MD_SURCHARGE_AGI_THRESHOLD ? gains * 0.02 : 0;
  return {
    thresholdCleared: federalAGI > MD_SURCHARGE_AGI_THRESHOLD ? 1 : 0,
    capitalGainsSurcharge: surcharge,
  };
}

// Missouri — first US state ever to fully repeal individual capital gains
// tax (2025, retroactive to TY2025). Honest "$0 owed" tool.
function missouriCapitalGainsTaxCalculator(values: Record<string, number>) {
  const gains = Math.max(0, safeNumber(values.netCapitalGains));
  return {
    netCapitalGainsEntered: gains,
    capitalGainsTaxOwed: 0,
  };
}

export const usCapitalGainsExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "washington-capital-gains-tax-calculator": washingtonCapitalGainsTaxCalculator,
  "hawaii-capital-gains-tax-calculator": hawaiiCapitalGainsTaxCalculator,
  "massachusetts-capital-gains-tax-calculator": massachusettsCapitalGainsTaxCalculator,
  "montana-capital-gains-tax-calculator": montanaCapitalGainsTaxCalculator,
  "maryland-capital-gains-tax-calculator": marylandCapitalGainsSurchargeCalculator,
  "missouri-capital-gains-tax-calculator": missouriCapitalGainsTaxCalculator,
};
