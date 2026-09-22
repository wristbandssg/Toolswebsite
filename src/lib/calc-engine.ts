/**
 * Calculation Logic engine (see plan doc, Section 7: Calculator Tool Builder).
 *
 * Two supported modes:
 *  - "expression": the admin types a formula like "(part / whole) * 100"
 *    referencing the tool's input field keys as variables. Evaluated with
 *    mathjs in a restricted scope — no filesystem/network access, no
 *    assignment to globals. This is what a non-developer uses for the vast
 *    majority of calculators (percentage, EMI, BMI, etc).
 *  - "custom": for tools whose logic can't be expressed as one formula
 *    (multi-step, conditional, loan amortization schedules, ...). Developers
 *    register a function in `customCalculators` keyed by the tool's slug —
 *    isolated per tool, doesn't touch any other tool's code.
 */

import { evaluate } from "mathjs";

export type CalcFieldType =
  | "number"
  | "percentage"
  | "currency"
  | "dropdown"
  | "date"
  | "slider";

export interface CalcInputField {
  key: string; // variable name used inside the formula, e.g. "part"
  label: string;
  type: CalcFieldType;
  unit?: string;
  required?: boolean;
  default?: number | string;
  min?: number;
  max?: number;
  options?: { label: string; value: string | number }[];
}

export interface CalcResultConfig {
  label: string;
  unit?: string;
  format?: "number" | "currency" | "percentage";
}

export type CalcInputValues = Record<string, number>;

export class CalculationError extends Error {}

/** Runs an expression-based calculator formula against submitted input values. */
export function runExpressionCalc(
  formula: string,
  fields: CalcInputField[],
  values: CalcInputValues
): number {
  const scope: Record<string, number> = {};

  for (const field of fields) {
    const raw = values[field.key];
    if (raw === undefined || raw === null || Number.isNaN(raw)) {
      if (field.required !== false) {
        throw new CalculationError(`"${field.label}" আবশ্যক — একটা সংখ্যা দিন।`);
      }
      scope[field.key] = typeof field.default === "number" ? field.default : 0;
      continue;
    }
    if (field.min !== undefined && raw < field.min) {
      throw new CalculationError(`"${field.label}" কমপক্ষে ${field.min} হতে হবে।`);
    }
    if (field.max !== undefined && raw > field.max) {
      throw new CalculationError(`"${field.label}" সর্বোচ্চ ${field.max} হতে পারে।`);
    }
    scope[field.key] = raw;
  }

  try {
    const result = evaluate(formula, scope);
    if (typeof result !== "number" || !Number.isFinite(result)) {
      throw new CalculationError("এই ইনপুটে সঠিক ফলাফল বের করা যায়নি।");
    }
    return result;
  } catch (err) {
    if (err instanceof CalculationError) throw err;
    throw new CalculationError(
      "হিসাব করতে সমস্যা হয়েছে — ইনপুট আবার চেক করুন।"
    );
  }
}

/** Registry for tool-specific custom calculation logic (calc_type = "custom"). */
export type CustomCalculator = (values: CalcInputValues) => number;

export const customCalculators: Record<string, CustomCalculator> = {
  // Example:
  // "loan-amortization": (values) => { ...multi-step logic... },
};

export function runCalculator(
  calcType: "expression" | "custom",
  toolSlug: string,
  formula: string | null,
  fields: CalcInputField[],
  values: CalcInputValues
): number {
  if (calcType === "custom") {
    const fn = customCalculators[toolSlug];
    if (!fn) {
      throw new CalculationError(
        `"${toolSlug}"-এর জন্য কোনো Custom Calculator যুক্ত করা হয়নি।`
      );
    }
    return fn(values);
  }
  if (!formula) {
    throw new CalculationError("এই Tool-এ এখনো কোনো Formula সেট করা হয়নি।");
  }
  return runExpressionCalc(formula, fields, values);
}
