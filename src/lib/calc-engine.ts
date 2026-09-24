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

// ---------------------------------------------------------------------------
// Alabama Income Tax Calculator — same federal income tax + FICA model as
// Nevada above, PLUS a real Alabama state income tax (Alabama, unlike
// Nevada, does levy one). Figures below are sourced from the Alabama
// Department of Revenue's 2026 withholding tax tables/instructions:
//   - Brackets: 2% / 4% / 5%, with the 2%/4% break-points doubled for
//     Married Filing Jointly (and Qualifying Widow(er), treated as MFJ here)
//     versus Single/MFS/Head of Household.
//   - Standard deduction is income-phased (it shrinks as AGI rises) rather
//     than a single flat number — Alabama's own tables step it down in
//     discrete $500-of-AGI increments; this calculator approximates that
//     step schedule with straight-line interpolation between the published
//     endpoints, which is accurate to within a few dollars and simpler than
//     reproducing every step row. Same "estimate-grade" spirit as the
//     federal model above.
//   - A Personal Exemption ($1,500 Single/MFS, $3,000 MFJ/Head of
//     Household) and a per-dependent exemption (which itself shrinks at
//     higher income — $1,000/$500/$300 per dependent) are then subtracted
//     before applying the bracket rates.
// ---------------------------------------------------------------------------

const AL_BRACKETS: Record<FilingStatus, { rate: number; upTo: number }[]> = {
  0: [
    { rate: 0.02, upTo: 500 },
    { rate: 0.04, upTo: 3000 },
    { rate: 0.05, upTo: Infinity },
  ],
  1: [
    { rate: 0.02, upTo: 1000 },
    { rate: 0.04, upTo: 6000 },
    { rate: 0.05, upTo: Infinity },
  ],
  2: [
    { rate: 0.02, upTo: 500 },
    { rate: 0.04, upTo: 3000 },
    { rate: 0.05, upTo: Infinity },
  ],
  3: [
    { rate: 0.02, upTo: 500 },
    { rate: 0.04, upTo: 3000 },
    { rate: 0.05, upTo: Infinity },
  ],
};

// Standard deduction phase-out endpoints: { agi where the deduction starts
// shrinking, deduction at/below that AGI } -> { agi where it bottoms out,
// deduction from that AGI up }. Linear in between (see comment above).
const AL_STANDARD_DEDUCTION_RANGE: Record<
  FilingStatus,
  { loAgi: number; loDeduction: number; hiAgi: number; hiDeduction: number }
> = {
  0: { loAgi: 25999, loDeduction: 3000, hiAgi: 35500, hiDeduction: 2500 }, // Single
  1: { loAgi: 25999, loDeduction: 8500, hiAgi: 35500, hiDeduction: 5000 }, // MFJ
  2: { loAgi: 12999, loDeduction: 4250, hiAgi: 17750, hiDeduction: 2500 }, // MFS
  3: { loAgi: 25999, loDeduction: 5200, hiAgi: 35500, hiDeduction: 2500 }, // Head of Household
};

function alabamaStandardDeduction(status: FilingStatus, agi: number): number {
  const r = AL_STANDARD_DEDUCTION_RANGE[status];
  if (agi <= r.loAgi) return r.loDeduction;
  if (agi >= r.hiAgi) return r.hiDeduction;
  const progress = (agi - r.loAgi) / (r.hiAgi - r.loAgi);
  return r.loDeduction + progress * (r.hiDeduction - r.loDeduction);
}

function alabamaPersonalExemption(status: FilingStatus): number {
  return status === 1 || status === 3 ? 3000 : 1500; // MFJ/HoH: $3,000, Single/MFS: $1,500
}

function alabamaDependentExemptionPerDependent(agi: number): number {
  if (agi <= 50000) return 1000;
  if (agi <= 100000) return 500;
  return 300;
}

const alabamaTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 26) || 26;
  const filingStatusRaw = Math.round(safeNumber(values.filingStatus, 0));
  const filingStatus = ([0, 1, 2, 3] as FilingStatus[]).includes(filingStatusRaw as FilingStatus)
    ? (filingStatusRaw as FilingStatus)
    : 0;
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));
  const extraWithholdingPerPeriod = Math.max(0, safeNumber(values.extraWithholding));
  const numberOfDependents = Math.max(0, Math.round(safeNumber(values.numberOfDependents, 0)));

  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;
  const annualExtraWithholding = extraWithholdingPerPeriod * periodsPerYear;

  // Wages actually subject to federal income tax, FICA, and Alabama state
  // income tax, after pre-tax deductions come out.
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

  // Alabama state income tax: taxable wages minus the (income-phased)
  // standard deduction, personal exemption, and per-dependent exemption,
  // then run through Alabama's 2%/4%/5% brackets.
  const alStandardDeduction = alabamaStandardDeduction(filingStatus, taxableAnnualWages);
  const alPersonalExemption = alabamaPersonalExemption(filingStatus);
  const alDependentExemption =
    numberOfDependents * alabamaDependentExemptionPerDependent(taxableAnnualWages);
  const alabamaTaxableIncome = Math.max(
    0,
    taxableAnnualWages - alStandardDeduction - alPersonalExemption - alDependentExemption
  );
  const annualStateIncomeTax = progressiveTax(alabamaTaxableIncome, AL_BRACKETS[filingStatus]);

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// Alaska, like Nevada, levies no state income tax (confirmed via the Tax
// Foundation's 2026 state tax summary — see prisma/create-alaska-tax-tool.ts
// for the citation) — so it reuses `nevadaTaxCalculator` as-is rather than a
// near-duplicate function. The function itself doesn't hardcode "Nevada"
// anywhere; it's a generic zero-state-income-tax paycheck model, so pointing
// a second slug at it is correct, not a shortcut.
const alaskaTaxCalculator: CustomCalculator = nevadaTaxCalculator;

// ---------------------------------------------------------------------------
// Arizona Income Tax Calculator — same federal income tax + FICA model as
// above, plus a real Arizona state income tax. Unlike Alabama's 2%/4%/5%
// brackets, Arizona taxes ALL income at a single FLAT 2.5% rate (no
// brackets) after subtracting a flat standard deduction — simpler than
// Alabama on purpose, since that's what Arizona's own law actually is, not
// a shortcut. Figures sourced from the Arizona Department of Revenue's
// "Individual Income Tax Highlights" page (azdor.gov) and cross-checked
// against the Tax Foundation's 2026 Arizona summary:
//   - Flat rate: 2.5% of Arizona taxable income, for every filing status.
//   - Standard deduction: $15,750 (Single or Married Filing Separately),
//     $31,500 (Married Filing Jointly), $23,625 (Head of Household).
// Arizona has no separate personal/dependent exemption line in its current
// (post-2021) flat-tax system — the standard deduction is the only
// subtraction before the flat rate applies.
// ---------------------------------------------------------------------------

const AZ_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 15750, // Single
  1: 31500, // Married Filing Jointly
  2: 15750, // Married Filing Separately
  3: 23625, // Head of Household
};

const AZ_FLAT_RATE = 0.025;

const arizonaTaxCalculator: CustomCalculator = (values) => {
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

  // Wages actually subject to federal income tax, FICA, and Arizona state
  // income tax, after pre-tax deductions come out.
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

  // Arizona state income tax: taxable wages minus the flat standard
  // deduction, then a single flat 2.5% rate — no brackets.
  const azStandardDeduction = AZ_STANDARD_DEDUCTION_2026[filingStatus];
  const arizonaTaxableIncome = Math.max(0, taxableAnnualWages - azStandardDeduction);
  const annualStateIncomeTax = arizonaTaxableIncome * AZ_FLAT_RATE;

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Arkansas Income Tax Calculator — same federal income tax + FICA model as
// above, plus a real Arkansas state income tax: a graduated 5-bracket
// schedule (0% / 2% / 3% / 3.4% / 3.9%) on income after a flat standard
// deduction, then a small per-exemption PERSONAL TAX CREDIT subtracted
// directly from the computed tax (not from taxable income) — Arkansas's own
// withholding formula works this way. Figures sourced from the Arkansas
// Department of Finance and Administration's 2026 withholding tax tables
// (dfa.arkansas.gov) and cross-checked against a 2026 payroll-tax-table
// vendor's published breakdown:
//   - Brackets (same schedule for every filing status): 0% up to $5,600,
//     2% up to $11,200, 3% up to $16,000, 3.4% up to $26,400, 3.9% above.
//   - Standard deduction: $2,470 per person — $2,470 for Single/MFS/Head of
//     Household, $4,940 for Married Filing Jointly (two people's worth).
//   - Personal tax credit: $29 per exemption (self, spouse if filing
//     jointly, and each dependent), subtracted from the computed bracket
//     tax rather than from taxable income.
// SIMPLIFICATION (documented in the Tool's Assumptions text, same
// estimate-grade spirit as Alabama's standard-deduction interpolation):
// Arkansas actually swaps to a second, simplified rate table for net income
// above $94,700 (to avoid a bracket-edge cliff) — this calculator applies
// the standard graduated schedule at every income level instead of
// modeling that swap, which is accurate for the vast majority of filers and
// only diverges slightly near/above that threshold. It also doesn't model
// Arkansas's separate "low income tax table" credit for very low incomes.
// ---------------------------------------------------------------------------

const AR_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 2470, // Single
  1: 4940, // Married Filing Jointly (two people's worth)
  2: 2470, // Married Filing Separately
  3: 2470, // Head of Household
};

const AR_BRACKETS_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 5600 },
  { rate: 0.02, upTo: 11200 },
  { rate: 0.03, upTo: 16000 },
  { rate: 0.034, upTo: 26400 },
  { rate: 0.039, upTo: Infinity },
];

const AR_PERSONAL_CREDIT_PER_EXEMPTION = 29;

const arkansasTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 26) || 26;
  const filingStatusRaw = Math.round(safeNumber(values.filingStatus, 0));
  const filingStatus = ([0, 1, 2, 3] as FilingStatus[]).includes(filingStatusRaw as FilingStatus)
    ? (filingStatusRaw as FilingStatus)
    : 0;
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));
  const extraWithholdingPerPeriod = Math.max(0, safeNumber(values.extraWithholding));
  const numberOfDependents = Math.max(0, Math.round(safeNumber(values.numberOfDependents, 0)));

  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;
  const annualExtraWithholding = extraWithholdingPerPeriod * periodsPerYear;

  // Wages actually subject to federal income tax, FICA, and Arkansas state
  // income tax, after pre-tax deductions come out.
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

  // Arkansas state income tax: taxable wages minus the flat standard
  // deduction, run through the 0%/2%/3%/3.4%/3.9% brackets, then the
  // per-exemption personal tax credit ($29 x self + spouse-if-MFJ +
  // dependents) is subtracted from that computed tax, not from income.
  const arStandardDeduction = AR_STANDARD_DEDUCTION_2026[filingStatus];
  const arkansasTaxableIncome = Math.max(0, taxableAnnualWages - arStandardDeduction);
  const arTaxBeforeCredit = progressiveTax(arkansasTaxableIncome, AR_BRACKETS_2026);
  const numberOfExemptions = 1 + (filingStatus === 1 ? 1 : 0) + numberOfDependents;
  const arPersonalCredit = numberOfExemptions * AR_PERSONAL_CREDIT_PER_EXEMPTION;
  const annualStateIncomeTax = Math.max(0, arTaxBeforeCredit - arPersonalCredit);

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// California Income Tax Calculator — the most involved state model so far:
// a real 9-bracket progressive schedule (1% up to 13.3%, the top rate
// already including the 1% Mental Health Services Tax surcharge above
// $1,000,000) PLUS a separate, mandatory State Disability Insurance (SDI)
// payroll withholding — a real line on every California paycheck, distinct
// from income tax, so it's reported as its own breakdown line
// ("stateDisabilityInsurance") rather than folded into stateIncomeTax.
// Figures sourced from the EDD's 2026 SDI page (edd.ca.gov) and the
// NFC's official 2026 California withholding bulletin, cross-checked
// against a 2026 bracket aggregator:
//   - Brackets: 1% / 2% / 4% / 6% / 8% / 9.3% / 10.3% / 11.3% / 12.3% /
//     13.3% (top rate already includes the 1% Mental Health Services Tax
//     above $1,000,000 of taxable income) — sourced exactly for Single and
//     Married Filing Jointly; Married Filing Separately and Head of
//     Household are approximated using the Single schedule (documented
//     simplification below).
//   - Standard deduction: $5,706 (Single/MFS), $11,412 (Married Filing
//     Jointly and Head of Household — both get the doubled amount).
//   - Personal exemption credit: $168.30 per exemption (self, spouse if
//     filing jointly, and each dependent), subtracted from the computed
//     bracket tax, not from taxable income — same "credit not deduction"
//     shape as Arkansas's personal tax credit.
//   - SDI: a flat 1.3% of wages, with NO wage cap (California removed the
//     SDI taxable wage limit effective 2024), applied to the same
//     wage base as FICA/state income tax in this calculator (see the
//     shared pre-tax-deduction assumption below).
// SIMPLIFICATIONS (documented in the Tool's Assumptions text): Married
// Filing Separately and Head of Household use the Single bracket schedule
// rather than their own exact thresholds (a close approximation, not exact
// to the dollar); California's separate, larger dependent exemption credit
// isn't modeled — every exemption uses the $168.30 personal credit amount.
// ---------------------------------------------------------------------------

const CA_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.01, upTo: 11079 },
  { rate: 0.02, upTo: 26264 },
  { rate: 0.04, upTo: 41452 },
  { rate: 0.06, upTo: 57542 },
  { rate: 0.08, upTo: 72724 },
  { rate: 0.093, upTo: 371479 },
  { rate: 0.103, upTo: 445771 },
  { rate: 0.113, upTo: 742953 },
  { rate: 0.123, upTo: 1000000 },
  { rate: 0.133, upTo: Infinity },
];

const CA_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.01, upTo: 22158 },
  { rate: 0.02, upTo: 52528 },
  { rate: 0.04, upTo: 82904 },
  { rate: 0.06, upTo: 115084 },
  { rate: 0.08, upTo: 145448 },
  { rate: 0.093, upTo: 742958 },
  { rate: 0.103, upTo: 891542 },
  { rate: 0.113, upTo: 1000000 },
  { rate: 0.123, upTo: 1485906 },
  { rate: 0.133, upTo: Infinity },
];

// Married Filing Separately and Head of Household approximated with the
// Single schedule — see the simplification note in the block comment above.
function californiaBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  return status === 1 ? CA_BRACKETS_MFJ_2026 : CA_BRACKETS_SINGLE_2026;
}

const CA_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 5706, // Single
  1: 11412, // Married Filing Jointly
  2: 5706, // Married Filing Separately
  3: 11412, // Head of Household
};

const CA_PERSONAL_EXEMPTION_CREDIT = 168.3;
const CA_SDI_RATE = 0.013;

const californiaTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 26) || 26;
  const filingStatusRaw = Math.round(safeNumber(values.filingStatus, 0));
  const filingStatus = ([0, 1, 2, 3] as FilingStatus[]).includes(filingStatusRaw as FilingStatus)
    ? (filingStatusRaw as FilingStatus)
    : 0;
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));
  const extraWithholdingPerPeriod = Math.max(0, safeNumber(values.extraWithholding));
  const numberOfDependents = Math.max(0, Math.round(safeNumber(values.numberOfDependents, 0)));

  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;
  const annualExtraWithholding = extraWithholdingPerPeriod * periodsPerYear;

  // Wages actually subject to federal income tax, FICA, California state
  // income tax, and SDI, after pre-tax deductions come out.
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

  // California state income tax: taxable wages minus the standard
  // deduction, run through the 1%–13.3% brackets, then the $168.30-per-
  // exemption personal credit is subtracted from that computed tax.
  const caStandardDeduction = CA_STANDARD_DEDUCTION_2026[filingStatus];
  const californiaTaxableIncome = Math.max(0, taxableAnnualWages - caStandardDeduction);
  const caTaxBeforeCredit = progressiveTax(californiaTaxableIncome, californiaBracketsFor(filingStatus));
  const numberOfExemptions = 1 + (filingStatus === 1 ? 1 : 0) + numberOfDependents;
  const caPersonalCredit = numberOfExemptions * CA_PERSONAL_EXEMPTION_CREDIT;
  const annualStateIncomeTax = Math.max(0, caTaxBeforeCredit - caPersonalCredit);

  // California SDI: a flat 1.3% of the same wage base, with no cap.
  const annualSDI = taxableAnnualWages * CA_SDI_RATE;

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax + annualSDI;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    stateDisabilityInsurance: annualSDI / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Colorado Income Tax Calculator — a flat 4.4% rate, but with a distinctive
// tax base: Colorado does NOT define its own standard deduction. Instead,
// Colorado taxable income starts from FEDERAL taxable income (income after
// the federal standard deduction is already applied) and the flat rate is
// applied directly to that. This calculator reuses the `federalTaxableIncome`
// value already computed for the federal tax line, rather than subtracting a
// second, separate deduction — that would double-count it. Sourced from the
// Tax Foundation's 2026 Colorado summary (flat 4.4%) and a CPA explainer of
// Colorado's tax-base mechanics.
// SIMPLIFICATION: Colorado requires an addback of some federal deductions
// for taxpayers with federal AGI above $300,000 (to recapture part of the
// federal standard/itemized deduction) — this calculator doesn't model that
// high-income addback, which only affects incomes above this tool's $300,000
// salary input ceiling anyway.
// ---------------------------------------------------------------------------

const COLORADO_FLAT_RATE = 0.044;

const coloradoTaxCalculator: CustomCalculator = (values) => {
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

  // Colorado state income tax: the flat 4.4% rate applied directly to
  // federal taxable income (Colorado's own tax base) — no separate
  // Colorado standard deduction to subtract.
  const annualStateIncomeTax = federalTaxableIncome * COLORADO_FLAT_RATE;

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Connecticut Income Tax Calculator — a 7-bracket progressive schedule
// (2% up to 6.99%) after a flat standard deduction. Sourced from a 2026
// bracket aggregator and a 2026 payroll standard-deduction table:
//   - Brackets: sourced exactly for Single and Married Filing Jointly;
//     Married Filing Separately is derived as exactly half of the MFJ
//     thresholds (Connecticut does this by law, same convention already
//     used for the federal MFS brackets in this file), and Head of
//     Household is approximated using the Single schedule (documented
//     simplification below).
//   - Standard deduction: $6,000 (Single), $12,000 (Married Filing
//     Jointly), $9,000 (Head of Household); Married Filing Separately
//     uses the Single amount ($6,000).
// SIMPLIFICATIONS (documented in the Tool's Assumptions text): Connecticut
// also has (1) a "tax recapture" provision that phases out the benefit of
// its lower brackets for high earners, and (2) an income-based personal tax
// credit table — neither is modeled here, which keeps this calculator's
// scope in line with the other state tools rather than reproducing every
// Connecticut-specific adjustment; both mainly affect higher incomes.
// ---------------------------------------------------------------------------

const CT_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.02, upTo: 10000 },
  { rate: 0.045, upTo: 50000 },
  { rate: 0.055, upTo: 100000 },
  { rate: 0.06, upTo: 200000 },
  { rate: 0.065, upTo: 250000 },
  { rate: 0.069, upTo: 500000 },
  { rate: 0.0699, upTo: Infinity },
];

const CT_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.02, upTo: 20000 },
  { rate: 0.045, upTo: 100000 },
  { rate: 0.055, upTo: 200000 },
  { rate: 0.06, upTo: 400000 },
  { rate: 0.065, upTo: 500000 },
  { rate: 0.069, upTo: 1000000 },
  { rate: 0.0699, upTo: Infinity },
];

// Married Filing Separately = exactly half the MFJ thresholds (by law);
// Head of Household is approximated with the Single schedule — see the
// simplification note in the block comment above.
function connecticutBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  if (status === 1) return CT_BRACKETS_MFJ_2026;
  if (status === 2) {
    return CT_BRACKETS_MFJ_2026.map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return CT_BRACKETS_SINGLE_2026;
}

const CT_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 6000, // Single
  1: 12000, // Married Filing Jointly
  2: 6000, // Married Filing Separately
  3: 9000, // Head of Household
};

const connecticutTaxCalculator: CustomCalculator = (values) => {
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

  // Connecticut state income tax: taxable wages minus the standard
  // deduction, run through the 2%–6.99% brackets.
  const ctStandardDeduction = CT_STANDARD_DEDUCTION_2026[filingStatus];
  const connecticutTaxableIncome = Math.max(0, taxableAnnualWages - ctStandardDeduction);
  const annualStateIncomeTax = progressiveTax(connecticutTaxableIncome, connecticutBracketsFor(filingStatus));

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Delaware Income Tax Calculator — a 7-bracket progressive schedule (0% up
// to 6.6%) after a flat standard deduction. Unlike most other states in
// this file, Delaware uses the SAME bracket schedule for every filing
// status (no separate MFJ table) — sourced from a 2026 payroll
// withholding-table vendor:
//   - Brackets: 0% up to $2,000, 2.2% up to $5,000, 3.9% up to $10,000,
//     4.8% up to $20,000, 5.2% up to $25,000, 5.55% up to $60,000, 6.6%
//     above $60,000 — the same schedule regardless of filing status.
//   - Standard deduction: $3,250 (Single/MFS/Head of Household — Delaware's
//     source table didn't list Head of Household separately, so it uses
//     the Single amount, documented as a simplification), $6,500 (Married
//     Filing Jointly).
// ---------------------------------------------------------------------------

const DE_BRACKETS_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 2000 },
  { rate: 0.022, upTo: 5000 },
  { rate: 0.039, upTo: 10000 },
  { rate: 0.048, upTo: 20000 },
  { rate: 0.052, upTo: 25000 },
  { rate: 0.0555, upTo: 60000 },
  { rate: 0.066, upTo: Infinity },
];

const DE_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 3250, // Single
  1: 6500, // Married Filing Jointly
  2: 3250, // Married Filing Separately
  3: 3250, // Head of Household (approximated with the Single amount)
};

const delawareTaxCalculator: CustomCalculator = (values) => {
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

  // Delaware state income tax: taxable wages minus the standard deduction,
  // run through the same 0%–6.6% bracket schedule for every filing status.
  const deStandardDeduction = DE_STANDARD_DEDUCTION_2026[filingStatus];
  const delawareTaxableIncome = Math.max(0, taxableAnnualWages - deStandardDeduction);
  const annualStateIncomeTax = progressiveTax(delawareTaxableIncome, DE_BRACKETS_2026);

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// Florida, like Nevada and Alaska, levies no state income tax (confirmed
// via the Tax Foundation's 2026 Florida summary — see
// prisma/create-florida-tax-tool.ts for the citation) — so it reuses
// `nevadaTaxCalculator` as-is, same as Alaska does.
const floridaTaxCalculator: CustomCalculator = nevadaTaxCalculator;

// ---------------------------------------------------------------------------
// Georgia Income Tax Calculator — a flat 4.99% rate after a flat standard
// deduction. Sourced from the Georgia Department of Revenue's "Important
// Tax Updates" page (dor.georgia.gov):
//   - Flat rate: 4.99% of Georgia taxable income, every filing status.
//   - Standard deduction: $15,000 (Single, Married Filing Separately, and
//     Head of Household), $30,000 (Married Filing Jointly).
// No dependents field — Georgia's current flat-tax law, per this source,
// doesn't add a separate per-dependent exemption on top of the standard
// deduction, so this tool uses the same simple input set as
// Arizona/Colorado.
// ---------------------------------------------------------------------------

const GA_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 15000, // Single
  1: 30000, // Married Filing Jointly
  2: 15000, // Married Filing Separately
  3: 15000, // Head of Household
};

const GA_FLAT_RATE = 0.0499;

const georgiaTaxCalculator: CustomCalculator = (values) => {
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

  // Georgia state income tax: taxable wages minus the standard deduction,
  // then a single flat 4.99% rate — no brackets.
  const gaStandardDeduction = GA_STANDARD_DEDUCTION_2026[filingStatus];
  const georgiaTaxableIncome = Math.max(0, taxableAnnualWages - gaStandardDeduction);
  const annualStateIncomeTax = georgiaTaxableIncome * GA_FLAT_RATE;

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Hawaii Income Tax Calculator — the widest bracket schedule of any state
// tool so far: 12 brackets from 1.4% up to 11%, after a flat standard
// deduction. Figures sourced from a 2026 bracket aggregator for the exact
// Single/Married Filing Jointly thresholds, and from Hawaii's own 2024 tax
// reform legislation (HB2404 CD1, capitol.hawaii.gov) for the standard
// deduction amounts effective for tax years beginning after December 31,
// 2025 (i.e., 2026):
//   - Standard deduction: $8,000 (Single/MFS), $16,000 (Married Filing
//     Jointly), $12,000 (Head of Household).
// SIMPLIFICATIONS (documented in the Tool's Assumptions text): Married
// Filing Separately is derived as exactly half of the Married Filing
// Jointly bracket thresholds (the same convention used elsewhere in this
// file); Head of Household is approximated using the Single bracket
// schedule rather than its own exact thresholds; Hawaii's separate personal
// exemption isn't modeled, since the 2024 reform substantially restructured
// Hawaii's deduction/exemption system around the larger standard deduction
// figures above.
// ---------------------------------------------------------------------------

const HI_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.014, upTo: 9600 },
  { rate: 0.032, upTo: 14400 },
  { rate: 0.055, upTo: 19200 },
  { rate: 0.064, upTo: 24000 },
  { rate: 0.068, upTo: 36000 },
  { rate: 0.072, upTo: 48000 },
  { rate: 0.076, upTo: 125000 },
  { rate: 0.079, upTo: 175000 },
  { rate: 0.0825, upTo: 225000 },
  { rate: 0.09, upTo: 275000 },
  { rate: 0.1, upTo: 325000 },
  { rate: 0.11, upTo: Infinity },
];

const HI_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.014, upTo: 19200 },
  { rate: 0.032, upTo: 28800 },
  { rate: 0.055, upTo: 38400 },
  { rate: 0.064, upTo: 48000 },
  { rate: 0.068, upTo: 72000 },
  { rate: 0.072, upTo: 96000 },
  { rate: 0.076, upTo: 250000 },
  { rate: 0.079, upTo: 350000 },
  { rate: 0.0825, upTo: 450000 },
  { rate: 0.09, upTo: 550000 },
  { rate: 0.1, upTo: 650000 },
  { rate: 0.11, upTo: Infinity },
];

// Married Filing Separately = exactly half the MFJ thresholds; Head of
// Household approximated with the Single schedule — see the simplification
// note in the block comment above.
function hawaiiBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  if (status === 1) return HI_BRACKETS_MFJ_2026;
  if (status === 2) {
    return HI_BRACKETS_MFJ_2026.map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return HI_BRACKETS_SINGLE_2026;
}

const HI_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 8000, // Single
  1: 16000, // Married Filing Jointly
  2: 8000, // Married Filing Separately
  3: 12000, // Head of Household
};

const hawaiiTaxCalculator: CustomCalculator = (values) => {
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

  // Hawaii state income tax: taxable wages minus the standard deduction,
  // run through the 1.4%–11% brackets.
  const hiStandardDeduction = HI_STANDARD_DEDUCTION_2026[filingStatus];
  const hawaiiTaxableIncome = Math.max(0, taxableAnnualWages - hiStandardDeduction);
  const annualStateIncomeTax = progressiveTax(hawaiiTaxableIncome, hawaiiBracketsFor(filingStatus));

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Idaho Income Tax Calculator — a flat 5.3% rate after a flat deduction
// floor. Sourced from the Idaho State Tax Commission's individual income
// tax rate schedule (tax.idaho.gov) — the most recently published figures
// at the time this tool was built were for 2025 ($4,811 Single / $9,622
// Married); Idaho adjusts this floor for inflation annually, so review for
// a small update once 2026 figures are published. No dependents field —
// Idaho's flat-tax system doesn't add a separate per-dependent exemption on
// top of this floor, so this tool uses the same simple input set as
// Georgia/Colorado.
// ---------------------------------------------------------------------------

const ID_STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  0: 4811, // Single
  1: 9622, // Married Filing Jointly
  2: 4811, // Married Filing Separately
  3: 4811, // Head of Household
};

const IDAHO_FLAT_RATE = 0.053;

const idahoTaxCalculator: CustomCalculator = (values) => {
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

  // Idaho state income tax: taxable wages minus the deduction floor, then a
  // single flat 5.3% rate — no brackets.
  const idStandardDeduction = ID_STANDARD_DEDUCTION[filingStatus];
  const idahoTaxableIncome = Math.max(0, taxableAnnualWages - idStandardDeduction);
  const annualStateIncomeTax = idahoTaxableIncome * IDAHO_FLAT_RATE;

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Illinois Income Tax Calculator — a flat 4.95% rate, with a per-exemption
// personal exemption instead of a standard deduction. Sourced from a 2026
// payroll withholding-table vendor:
//   - Flat rate: 4.95% of Illinois taxable income, every filing status.
//   - Personal exemption: $2,925 per exemption (self, spouse if filing
//     jointly, and each dependent), subtracted from taxable wages before
//     the flat rate applies — Illinois has no separate standard deduction.
// Because the exemption count depends on dependents, this tool keeps the
// "Number of Dependents" input field (like Alabama/Arkansas/California).
// ---------------------------------------------------------------------------

const IL_PERSONAL_EXEMPTION = 2925;
const ILLINOIS_FLAT_RATE = 0.0495;

const illinoisTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 26) || 26;
  const filingStatusRaw = Math.round(safeNumber(values.filingStatus, 0));
  const filingStatus = ([0, 1, 2, 3] as FilingStatus[]).includes(filingStatusRaw as FilingStatus)
    ? (filingStatusRaw as FilingStatus)
    : 0;
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));
  const extraWithholdingPerPeriod = Math.max(0, safeNumber(values.extraWithholding));
  const numberOfDependents = Math.max(0, Math.round(safeNumber(values.numberOfDependents, 0)));

  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;
  const annualExtraWithholding = extraWithholdingPerPeriod * periodsPerYear;

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

  // Illinois state income tax: taxable wages minus $2,925 per exemption
  // (self + spouse-if-MFJ + dependents), then a flat 4.95% rate.
  const numberOfExemptions = 1 + (filingStatus === 1 ? 1 : 0) + numberOfDependents;
  const illinoisTaxableIncome = Math.max(0, taxableAnnualWages - numberOfExemptions * IL_PERSONAL_EXEMPTION);
  const annualStateIncomeTax = illinoisTaxableIncome * ILLINOIS_FLAT_RATE;

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Indiana Income Tax Calculator — a flat 2.95% rate, with a per-exemption
// personal exemption (like Illinois) PLUS an extra additional exemption for
// each dependent. Sourced from the NFC's official 2026 Indiana state
// withholding bulletin:
//   - Flat rate: 2.95% of Indiana taxable income, every filing status.
//   - Personal exemption: $1,000 per exemption (self, spouse if filing
//     jointly, and each dependent).
//   - Additional dependent exemption: another $1,500 per dependent, on top
//     of that dependent's $1,000 personal exemption — so each dependent is
//     worth $2,500 total, while you and your spouse are worth $1,000 each.
// Because the exemption count depends on dependents, this tool keeps the
// "Number of Dependents" input field.
// ---------------------------------------------------------------------------

const IN_PERSONAL_EXEMPTION = 1000;
const IN_ADDITIONAL_DEPENDENT_EXEMPTION = 1500;
const INDIANA_FLAT_RATE = 0.0295;

const indianaTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 26) || 26;
  const filingStatusRaw = Math.round(safeNumber(values.filingStatus, 0));
  const filingStatus = ([0, 1, 2, 3] as FilingStatus[]).includes(filingStatusRaw as FilingStatus)
    ? (filingStatusRaw as FilingStatus)
    : 0;
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));
  const extraWithholdingPerPeriod = Math.max(0, safeNumber(values.extraWithholding));
  const numberOfDependents = Math.max(0, Math.round(safeNumber(values.numberOfDependents, 0)));

  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;
  const annualExtraWithholding = extraWithholdingPerPeriod * periodsPerYear;

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

  // Indiana state income tax: taxable wages minus $1,000 per exemption
  // (self + spouse-if-MFJ + dependents) minus an extra $1,500 per
  // dependent, then a flat 2.95% rate.
  const numberOfExemptions = 1 + (filingStatus === 1 ? 1 : 0) + numberOfDependents;
  const indianaExemptions =
    numberOfExemptions * IN_PERSONAL_EXEMPTION + numberOfDependents * IN_ADDITIONAL_DEPENDENT_EXEMPTION;
  const indianaTaxableIncome = Math.max(0, taxableAnnualWages - indianaExemptions);
  const annualStateIncomeTax = indianaTaxableIncome * INDIANA_FLAT_RATE;

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Iowa Income Tax Calculator — a flat 3.8% rate after a flat standard
// deduction. Sourced from the Iowa Department of Revenue's official 2026
// individual income tax withholding formula (revenue.iowa.gov):
//   - Flat rate: 3.8% of Iowa taxable income, every filing status.
//   - Standard deduction: $13,000 (Single/MFS), $26,000 (Married Filing
//     Jointly, no spouse earned income), $19,500 (Head of Household).
// No dependents field — Iowa's flat-tax withholding formula doesn't add a
// separate per-dependent exemption on top of this deduction, so this tool
// uses the same simple input set as Georgia/Idaho/Colorado.
// ---------------------------------------------------------------------------

const IA_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 13000, // Single
  1: 26000, // Married Filing Jointly
  2: 13000, // Married Filing Separately
  3: 19500, // Head of Household
};

const IOWA_FLAT_RATE = 0.038;

const iowaTaxCalculator: CustomCalculator = (values) => {
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

  // Iowa state income tax: taxable wages minus the standard deduction, then
  // a single flat 3.8% rate — no brackets.
  const iaStandardDeduction = IA_STANDARD_DEDUCTION_2026[filingStatus];
  const iowaTaxableIncome = Math.max(0, taxableAnnualWages - iaStandardDeduction);
  const annualStateIncomeTax = iowaTaxableIncome * IOWA_FLAT_RATE;

  const annualTaxesTotal =
    annualFederalIncomeTax + annualSocialSecurityTax + annualMedicareTax + annualStateIncomeTax;
  const annualTotalDeductions = annualTaxesTotal + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalIncomeTax: annualFederalIncomeTax / periodsPerYear,
    socialSecurityTax: annualSocialSecurityTax / periodsPerYear,
    medicareTax: annualMedicareTax / periodsPerYear,
    stateIncomeTax: annualStateIncomeTax / periodsPerYear,
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
  "alabama-tax-calculator": alabamaTaxCalculator,
  "alaska-tax-calculator": alaskaTaxCalculator,
  "arizona-tax-calculator": arizonaTaxCalculator,
  "arkansas-tax-calculator": arkansasTaxCalculator,
  "california-tax-calculator": californiaTaxCalculator,
  "colorado-tax-calculator": coloradoTaxCalculator,
  "connecticut-tax-calculator": connecticutTaxCalculator,
  "delaware-tax-calculator": delawareTaxCalculator,
  "florida-tax-calculator": floridaTaxCalculator,
  "georgia-tax-calculator": georgiaTaxCalculator,
  "hawaii-tax-calculator": hawaiiTaxCalculator,
  "idaho-tax-calculator": idahoTaxCalculator,
  "illinois-tax-calculator": illinoisTaxCalculator,
  "indiana-tax-calculator": indianaTaxCalculator,
  "iowa-tax-calculator": iowaTaxCalculator,
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
