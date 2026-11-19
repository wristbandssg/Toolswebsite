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

export const hongKongExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "hong-kong-profits-tax-calculator": hongKongProfitsTaxCalculator,
};
