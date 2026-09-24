/**
 * Calculation Logic engine (see plan doc, Section 7: Calculator Tool Builder).
 *
 * This file is intentionally thin: it re-exports the shared types every
 * other file in the app imports from "@/lib/calc-engine" (unchanged, so
 * nothing outside this directory needs to change), merges every country's
 * `xxCustomCalculators` map into the single `customCalculators` registry
 * `runCalculator` looks a tool's slug up in, and hosts `runCalculator`
 * itself (country-agnostic — it doesn't know or care which country a
 * "custom" tool's slug belongs to).
 *
 * The actual tax logic lives one file per country:
 *  - calc-engine-us.ts — US federal + all 50 states (see that file's header)
 *  - calc-engine-uk.ts — UK income tax (rest of UK + Scotland)
 *  - calc-engine-canada.ts — Canada federal + all 10 provinces + 3 territories
 *  - calc-engine-india.ts — India, New Regime vs Old Regime (one national tool)
 *  - calc-engine-australia.ts — Australia, one national tool (no state income tax)
 * Adding a new country means adding one more calc-engine-<country>.ts file
 * and one more line below merging its map in — no existing country's file
 * is touched.
 *
 * calc-engine-types.ts holds the shared types/helpers (CalcInputField,
 * CustomCalculator, safeNumber, runExpressionCalc, ...) every country file
 * implements against.
 */

export type {
  CalcFieldType,
  CalcInputField,
  CalcResultConfig,
  CalcResultLineConfig,
  CalcInputValues,
  CustomCalculatorResult,
  CustomCalculator,
} from "./calc-engine-types";
export { safeNumber, CalculationError, runExpressionCalc } from "./calc-engine-types";

import type { CalcInputField, CalcInputValues, CustomCalculator, CustomCalculatorResult } from "./calc-engine-types";
import { CalculationError, runExpressionCalc } from "./calc-engine-types";
import { usCustomCalculators } from "./calc-engine-us";
import { ukCustomCalculators } from "./calc-engine-uk";
import { canadaCustomCalculators } from "./calc-engine-canada";
import { indiaCustomCalculators } from "./calc-engine-india";
import { australiaCustomCalculators } from "./calc-engine-australia";

// Merged in country order (US first, since it was here first) — a slug is
// unique across every country's map (US states use bare state names like
// "alabama-tax-calculator"; UK/Canada/India/Australia use a country/region
// prefix like "uk-income-tax-calculator", "scotland-income-tax-calculator",
// "ontario-income-tax-calculator", "india-income-tax-calculator",
// "australia-income-tax-calculator" — see each country file's header for
// its own slug convention), so a plain spread merge is safe: no two
// countries' keys collide.
export const customCalculators: Record<string, CustomCalculator> = {
  ...usCustomCalculators,
  ...ukCustomCalculators,
  ...canadaCustomCalculators,
  ...indiaCustomCalculators,
  ...australiaCustomCalculators,
};

export function runCalculator(
  calcType: "expression" | "custom",
  toolSlug: string,
  formula: string | null,
  fields: CalcInputField[],
  values: CalcInputValues
): CustomCalculatorResult {
  if (calcType === "custom") {
    const fn = customCalculators[toolSlug];
    if (!fn) {
      throw new CalculationError(
        `No custom calculator has been registered for "${toolSlug}".`
      );
    }
    return fn(values);
  }
  if (!formula) {
    throw new CalculationError("No formula has been set for this tool yet.");
  }
  return runExpressionCalc(formula, fields, values);
}
