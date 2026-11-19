/**
 * Hong Kong extra tax calculator (Hong Kong Tax & Salary Calculators category).
 *
 * Holds one live tool: hong-kong-profits-tax-calculator — the two-tier Profits
 * Tax for corporations and unincorporated businesses. The main Hong Kong
 * salaries-tax tool lives in calc-engine-hongkong.ts.
 *
 * The map at the bottom (hongKongExtendedCustomCalculators) is merged into the
 * app-wide registry in calc-engine.ts — key = the tool's slug in the database.
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
