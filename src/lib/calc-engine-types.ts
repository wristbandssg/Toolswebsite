/**
 * Shared types and country-agnostic helpers for the Calculation Logic
 * engine (see plan doc, Section 7: Calculator Tool Builder).
 *
 * Two supported modes:
 *  - "expression": the admin types a formula like "(part / whole) * 100"
 *    referencing the tool's input field keys as variables. Evaluated with
 *    mathjs in a restricted scope — no filesystem/network access, no
 *    assignment to globals. This is what a non-developer uses for the vast
 *    majority of calculators (percentage, EMI, BMI, etc).
 *  - "custom": for tools whose logic can't be expressed as one formula
 *    (multi-step, conditional, loan amortization schedules, ...). Developers
 *    register a function in a country-specific `xxCustomCalculators` map
 *    (e.g. `usCustomCalculators` in calc-engine-us.ts, `ukCustomCalculators`
 *    in calc-engine-uk.ts) keyed by the tool's slug — isolated per tool,
 *    doesn't touch any other tool's code. calc-engine.ts merges every
 *    country's map into the single `customCalculators` registry the rest of
 *    the app looks tools up in.
 *
 * This file holds only what's shared across every country's calculators —
 * nothing US/UK/Canada/India-specific belongs here. Each country's own tax
 * concepts (US filing status + FICA, UK Personal Allowance + National
 * Insurance, Canadian federal/provincial brackets, ...) live in that
 * country's own calc-engine-<country>.ts file instead.
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
  // Step for a range slider. Only used when both `min` and `max` are also
  // set — that's what turns on the slider (see CalculatorWidget). Optional;
  // falls back to a sensible default based on the min/max span.
  step?: number;
  options?: { label: string; value: string | number }[];
}

export interface CalcResultConfig {
  label: string;
  unit?: string;
  format?: "number" | "currency" | "percentage";
  // ISO 4217 currency code (e.g. "USD", "GBP", "CAD", "INR") used when
  // format is "currency" — see CURRENCY_LOCALE/CURRENCY_SYMBOL in
  // CalculatorWidget. Defaults to "USD" when omitted, so every existing
  // US tool (which predates this field) keeps rendering in dollars
  // unchanged.
  currency?: string;
}

/** One line of a multi-line breakdown result (see Tool.calcResults). `key`
 * must match a key in the object a "custom" calculator returns. `highlight`
 * marks the headline number (e.g. "Take-Home Pay") shown larger/bolder than
 * the rest of the breakdown. */
export interface CalcResultLineConfig {
  key: string;
  label: string;
  unit?: string;
  format?: "number" | "currency" | "percentage";
  // See CalcResultConfig.currency above — same default/behavior.
  currency?: string;
  highlight?: boolean;
}

export type CalcInputValues = Record<string, number>;

/** Reads a submitted input value defensively — missing/NaN/negative values
 * (blank optional fields, bad client input) fall back to a safe default
 * instead of poisoning downstream arithmetic with NaN. */
export function safeNumber(value: number | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

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
        throw new CalculationError(`"${field.label}" is required — please enter a number.`);
      }
      scope[field.key] = typeof field.default === "number" ? field.default : 0;
      continue;
    }
    if (field.min !== undefined && raw < field.min) {
      throw new CalculationError(`"${field.label}" must be at least ${field.min}.`);
    }
    if (field.max !== undefined && raw > field.max) {
      throw new CalculationError(`"${field.label}" can be at most ${field.max}.`);
    }
    scope[field.key] = raw;
  }

  try {
    const result = evaluate(formula, scope);
    if (typeof result !== "number" || !Number.isFinite(result)) {
      throw new CalculationError("Could not compute a valid result from this input.");
    }
    return result;
  } catch (err) {
    if (err instanceof CalculationError) throw err;
    throw new CalculationError(
      "Something went wrong while calculating — please check your input and try again."
    );
  }
}

/** Registry for tool-specific custom calculation logic (calc_type = "custom").
 * A custom calculator returns either a single `number` (the legacy,
 * single-output shape — most calculators) or a `Record<string, number>` — a
 * named breakdown (e.g. { grossPay, federalTax, netPay, ... }) for a tool
 * whose Tool.calcResults defines multiple result lines. */
export type CustomCalculatorResult = number | Record<string, number>;
export type CustomCalculator = (values: CalcInputValues) => CustomCalculatorResult;
