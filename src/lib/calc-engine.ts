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

// ---------------------------------------------------------------------------
// Nevada Paycheck Calculator — federal income tax (2026 IRS brackets/standard
// deduction) + FICA (Social Security + Medicare). Nevada itself levies no
// state income tax, so that line is always $0 — shown explicitly rather than
// omitted, since every competing paycheck calculator highlights it too.
//
// This is a simplified, estimate-grade model (same spirit as the public
// paycheck calculators it's modeled after): it uses the standard deduction
// only (no itemizing, no Child Tax Credit or other credits), and treats
// "Pre-Tax Deductions" as reducing wages for federal income tax AND FICA
// alike (the common case — a cafeteria-plan/Section 125 style deduction).
// Figures are sourced from the IRS's 2026 inflation adjustments and the 2026
// Social Security wage base; see the Tool's own Instructions text for the
// full disclaimer shown to visitors.
// ---------------------------------------------------------------------------

type FilingStatus = 0 | 1 | 2 | 3; // 0=Single 1=MFJ 2=MFS 3=HoH

const FEDERAL_BRACKETS_2026: Record<0 | 1 | 3, { rate: number; upTo: number }[]> = {
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

const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 16100, // Single
  1: 32200, // Married Filing Jointly
  2: 16100, // Married Filing Separately
  3: 24150, // Head of Household
};

const ADDITIONAL_MEDICARE_THRESHOLD_2026: Record<FilingStatus, number> = {
  0: 200000,
  1: 250000,
  2: 125000,
  3: 200000,
};

const SOCIAL_SECURITY_WAGE_BASE_2026 = 184500;
const SOCIAL_SECURITY_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;

/** Married Filing Separately brackets are, by law, exactly half of MFJ's
 * dollar thresholds — so they're derived rather than hand-copied (avoids a
 * second, easy-to-desync set of numbers). */
function federalBracketsFor(status: FilingStatus) {
  if (status === 2) {
    return FEDERAL_BRACKETS_2026[1].map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return FEDERAL_BRACKETS_2026[status] ?? FEDERAL_BRACKETS_2026[0];
}

function progressiveTax(taxableIncome: number, brackets: { rate: number; upTo: number }[]): number {
  let tax = 0;
  let bandFloor = 0;
  for (const band of brackets) {
    if (taxableIncome <= bandFloor) break;
    const amountInBand = Math.min(taxableIncome, band.upTo) - bandFloor;
    if (amountInBand > 0) tax += amountInBand * band.rate;
    bandFloor = band.upTo;
    if (taxableIncome <= band.upTo) break;
  }
  return tax;
}

const nevadaTaxCalculator: CustomCalculator = (values) => {
    const annualSalary = Math.max(0, safeNumber(values.annualSalary));
    const periodsPerYear = safeNumber(values.payFrequency, 26) || 26;
    const filingStatusRaw = Math.round(safeNumber(values.filingStatus, 0));
    const filingStatus = ([0, 1, 2, 3] as FilingStatus[]).includes(filingStatusRaw as FilingStatus)
      ? (filingStatusRaw as FilingStatus)
      : 0;
    const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
    const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));
    const extraWithholdingPerPeriod = Math.max(0, safeNumber(values.extraWithholding));

    const annualPreTax = preTaxPerPeriod * periodsPerYear;
    const annualPostTax = postTaxPerPeriod * periodsPerYear;
    const annualExtraWithholding = extraWithholdingPerPeriod * periodsPerYear;

    // Wages actually subject to federal income tax and FICA, after pre-tax
    // deductions come out.
    const taxableAnnualWages = Math.max(0, annualSalary - annualPreTax);

    const standardDeduction = STANDARD_DEDUCTION_2026[filingStatus];
    const federalTaxableIncome = Math.max(0, taxableAnnualWages - standardDeduction);
    const annualFederalIncomeTax =
      progressiveTax(federalTaxableIncome, federalBracketsFor(filingStatus)) + annualExtraWithholding;

    const socialSecurityWages = Math.min(taxableAnnualWages, SOCIAL_SECURITY_WAGE_BASE_2026);
    const annualSocialSecurityTax = socialSecurityWages * SOCIAL_SECURITY_RATE;

    const additionalMedicareThreshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
    const annualMedicareTax =
      taxableAnnualWages * MEDICARE_RATE +
      Math.max(0, taxableAnnualWages - additionalMedicareThreshold) * ADDITIONAL_MEDICARE_RATE;

    // Nevada has no state income tax — always $0, shown explicitly.
    const annualStateIncomeTax = 0;

    const annualTaxesTotal = annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
    const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
    const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

    return {
      grossPayPerPeriod: annualSalary / periodsPerYear,
      federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
      socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
      medicareTax: annualMedicareTax / periodsPerYear,
      stateIncomeTax: 0,
      totalDeductions: annualTotalDeductions / periodsPerYear,
      netPayPerPeriod: annualNetPay / periodsPerYear,
      annualNetPay,
    };
};

export const customCalculators: Record<string, CustomCalculator> = {
  // Keyed by the tool's slug — this must stay in sync with the `slug` set in
  // prisma/create-nevada-paycheck-tool.ts. Registered under BOTH the current
  // slug ("nevada-tax-calculator") and the original one
  // ("nevada-paycheck-calculator", kept as an alias) on purpose: the DB slug
  // and this file deploy separately (a script run vs. a git push), so for a
  // short window one can be renamed while the other still has the old value.
  // Keeping both keys pointed at the same function means the calculator
  // never 404s during that window. If you rename the slug again, add the
  // new key here rather than replacing the old one.
  "nevada-tax-calculator": nevadaTaxCalculator,
  "nevada-paycheck-calculator": nevadaTaxCalculator,
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
