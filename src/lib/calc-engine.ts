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

// ---------------------------------------------------------------------------
// Kansas Income Tax Calculator — a real 2-bracket progressive schedule
// (5.2% then 5.58%), PLUS a personal exemption ($9,160 Single/MFS/HoH,
// $18,320 MFJ) and a $2,320-per-dependent exemption on top of the standard
// deduction — so, unlike most 2026 additions so far, Kansas needs the
// "Number of Dependents" field back (like Alabama/Arkansas/California).
// Figures sourced from a 2026 bracket aggregator (ustax.tools) and a
// Kansas-specific tax-law explainer (legalclarity.org), both citing Kansas
// Department of Revenue figures.
// SIMPLIFICATIONS: Married Filing Separately and Head of Household are
// approximated using the Single bracket schedule (Kansas's own MFS
// threshold of $23,000 happens to already match Single exactly; Head of
// Household's exact bracket thresholds weren't cleanly sourced, so it's
// approximated the same way) — documented in the Tool's Assumptions text.
// ---------------------------------------------------------------------------

const KS_BRACKETS_SINGLE: { rate: number; upTo: number }[] = [
  { rate: 0.052, upTo: 23000 },
  { rate: 0.0558, upTo: Infinity },
];

const KS_BRACKETS_MFJ: { rate: number; upTo: number }[] = [
  { rate: 0.052, upTo: 46000 },
  { rate: 0.0558, upTo: Infinity },
];

// Married Filing Separately and Head of Household approximated with the
// Single schedule — see the simplification note in the block comment above.
function kansasBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  return status === 1 ? KS_BRACKETS_MFJ : KS_BRACKETS_SINGLE;
}

const KS_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 3605, // Single
  1: 8240, // Married Filing Jointly
  2: 4120, // Married Filing Separately
  3: 6180, // Head of Household
};

const KS_PERSONAL_EXEMPTION_2026: Record<FilingStatus, number> = {
  0: 9160, // Single
  1: 18320, // Married Filing Jointly
  2: 9160, // Married Filing Separately
  3: 9160, // Head of Household
};

const KS_DEPENDENT_EXEMPTION = 2320;

const kansasTaxCalculator: CustomCalculator = (values) => {
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

  // Kansas state income tax: taxable wages minus the standard deduction,
  // the personal exemption, and $2,320 per dependent, run through the
  // two-bracket 5.2%/5.58% schedule.
  const ksStandardDeduction = KS_STANDARD_DEDUCTION_2026[filingStatus];
  const ksPersonalExemption = KS_PERSONAL_EXEMPTION_2026[filingStatus];
  const ksDependentExemption = numberOfDependents * KS_DEPENDENT_EXEMPTION;
  const kansasTaxableIncome = Math.max(
    0,
    taxableAnnualWages - ksStandardDeduction - ksPersonalExemption - ksDependentExemption
  );
  const annualStateIncomeTax = progressiveTax(kansasTaxableIncome, kansasBracketsFor(filingStatus));

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
// Kentucky Income Tax Calculator — a flat 3.5% rate for 2026 (down from 4.0%
// after Kentucky's multi-year phase-down), applied after a flat $3,360
// standard deduction per filer. No dependents field: Kentucky's 2018 tax
// reform eliminated the old dependent/personal exemption system, leaving
// only the standard deduction. Figures sourced from the Kentucky Department
// of Revenue's official 2026 withholding formula and standard-deduction
// announcement (revenue.ky.gov).
// ASSUMPTION: for Married Filing Jointly, this calculator doubles the
// per-filer standard deduction ($6,720 total) — Kentucky's standard
// deduction is defined per taxpayer, so a jointly-filing couple is treated
// as claiming one each, which is the common case.
// ---------------------------------------------------------------------------

const KY_FLAT_RATE = 0.035;
const KY_STANDARD_DEDUCTION_PER_FILER_2026 = 3360;

const kentuckyTaxCalculator: CustomCalculator = (values) => {
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

  // Kentucky state income tax: taxable wages minus the standard deduction
  // (doubled for MFJ — see the assumption note above), then a flat 3.5%.
  const kyStandardDeduction =
    filingStatus === 1 ? KY_STANDARD_DEDUCTION_PER_FILER_2026 * 2 : KY_STANDARD_DEDUCTION_PER_FILER_2026;
  const kentuckyTaxableIncome = Math.max(0, taxableAnnualWages - kyStandardDeduction);
  const annualStateIncomeTax = kentuckyTaxableIncome * KY_FLAT_RATE;

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
// Louisiana Income Tax Calculator — a flat 3% rate (Louisiana's 2025 reform
// repealed the old 1.85%–4.25% graduated brackets entirely), applied after a
// standard deduction of $12,875 (Single/MFS) or $25,750 (MFJ/HoH/Qualifying
// Surviving Spouse) — the first CPI-inflation-adjusted 2026 figures under
// the new law. No dependents field: Louisiana's reform also repealed the
// old additional exemptions for dependents, blindness, and age 65+.
// Figures sourced from the Louisiana Department of Revenue's official
// Revenue Information Bulletin 25-012 and its individual income tax FAQ
// (revenue.louisiana.gov).
// ---------------------------------------------------------------------------

const LA_FLAT_RATE = 0.03;
const LA_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 12875, // Single
  1: 25750, // Married Filing Jointly
  2: 12875, // Married Filing Separately
  3: 25750, // Head of Household
};

const louisianaTaxCalculator: CustomCalculator = (values) => {
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

  // Louisiana state income tax: taxable wages minus the standard deduction,
  // then a single flat 3% rate — no brackets.
  const laStandardDeduction = LA_STANDARD_DEDUCTION_2026[filingStatus];
  const louisianaTaxableIncome = Math.max(0, taxableAnnualWages - laStandardDeduction);
  const annualStateIncomeTax = louisianaTaxableIncome * LA_FLAT_RATE;

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
// Maine Income Tax Calculator — a real 3-bracket progressive schedule
// (5.8% / 6.75% / 7.15%), sourced exactly for Single, Married Filing
// Jointly, and Head of Household from Maine Revenue Services' 2026 rate
// schedule announcement; Married Filing Separately is derived as exactly
// half of MFJ's thresholds (Maine law sets it that way, same shape as the
// federal MFS derivation above). PLUS a $5,300 personal exemption for the
// filer, one more if filing jointly, and one per dependent — so this tool
// keeps the "Number of Dependents" field.
// Figures sourced from a Thomson Reuters summary of Maine Revenue Services'
// official 2026 rate schedule, personal exemption, and standard deduction
// announcement.
// ---------------------------------------------------------------------------

const ME_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.058, upTo: 27400 },
  { rate: 0.0675, upTo: 64850 },
  { rate: 0.0715, upTo: Infinity },
];

const ME_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.058, upTo: 54850 },
  { rate: 0.0675, upTo: 129750 },
  { rate: 0.0715, upTo: Infinity },
];

const ME_BRACKETS_HOH_2026: { rate: number; upTo: number }[] = [
  { rate: 0.058, upTo: 41100 },
  { rate: 0.0675, upTo: 97300 },
  { rate: 0.0715, upTo: Infinity },
];

function maineBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  if (status === 1) return ME_BRACKETS_MFJ_2026;
  if (status === 3) return ME_BRACKETS_HOH_2026;
  if (status === 2) {
    return ME_BRACKETS_MFJ_2026.map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return ME_BRACKETS_SINGLE_2026;
}

const ME_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 15300, // Single
  1: 30600, // Married Filing Jointly
  2: 15300, // Married Filing Separately (half of MFJ)
  3: 22950, // Head of Household
};

const ME_PERSONAL_EXEMPTION_2026 = 5300;

const maineTaxCalculator: CustomCalculator = (values) => {
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

  // Maine state income tax: taxable wages minus the standard deduction and
  // $5,300 per exemption (self, spouse if MFJ, each dependent), run through
  // the 5.8%/6.75%/7.15% brackets.
  const meStandardDeduction = ME_STANDARD_DEDUCTION_2026[filingStatus];
  const numberOfExemptions = 1 + (filingStatus === 1 ? 1 : 0) + numberOfDependents;
  const meExemptions = numberOfExemptions * ME_PERSONAL_EXEMPTION_2026;
  const maineTaxableIncome = Math.max(0, taxableAnnualWages - meStandardDeduction - meExemptions);
  const annualStateIncomeTax = progressiveTax(maineTaxableIncome, maineBracketsFor(filingStatus));

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
// Maryland Income Tax Calculator — a 10-bracket progressive schedule (2% up
// to 6.5%) sourced EXACTLY for all four filing statuses: Maryland groups
// Single with Married Filing Separately (one schedule) and Married Filing
// Jointly with Head of Household (a second, wider schedule) — confirmed
// directly from the Maryland Comptroller's own 2025-legislative-session tax
// alert, not an approximation. PLUS a standard deduction ($3,350
// Single/MFS, $6,700 MFJ/HoH) and a $3,200-per-exemption personal exemption
// (self, spouse if MFJ, each dependent) — so this tool keeps the "Number of
// Dependents" field.
// SIMPLIFICATIONS (documented in the Tool's Assumptions text): Maryland's
// mandatory county/Baltimore City "piggyback" local income tax (roughly
// 2.25%–3.30% depending on where you live, on top of the state tax modeled
// here) is NOT included — it varies by county and this is a statewide
// calculator, the same scope limitation as Indiana's county tax. Maryland's
// personal exemption phase-out above $100,000 of federal AGI also isn't
// modeled — every filer gets the full $3,200 per exemption here.
// Figures sourced from the Maryland Comptroller's official tax alert PDF and
// 2026 withholding tax facts sheet (marylandcomptroller.gov).
// ---------------------------------------------------------------------------

const MD_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.02, upTo: 1000 },
  { rate: 0.03, upTo: 2000 },
  { rate: 0.04, upTo: 3000 },
  { rate: 0.0475, upTo: 100000 },
  { rate: 0.05, upTo: 125000 },
  { rate: 0.0525, upTo: 150000 },
  { rate: 0.055, upTo: 250000 },
  { rate: 0.0575, upTo: 500000 },
  { rate: 0.0625, upTo: 1000000 },
  { rate: 0.065, upTo: Infinity },
];

const MD_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.02, upTo: 1000 },
  { rate: 0.03, upTo: 2000 },
  { rate: 0.04, upTo: 3000 },
  { rate: 0.0475, upTo: 150000 },
  { rate: 0.05, upTo: 175000 },
  { rate: 0.0525, upTo: 225000 },
  { rate: 0.055, upTo: 300000 },
  { rate: 0.0575, upTo: 600000 },
  { rate: 0.0625, upTo: 1200000 },
  { rate: 0.065, upTo: Infinity },
];

// Maryland groups Single with MFS, and MFJ with Head of Household — this is
// Maryland's actual statutory grouping, not an approximation.
function marylandBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  return status === 1 || status === 3 ? MD_BRACKETS_MFJ_2026 : MD_BRACKETS_SINGLE_2026;
}

const MD_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 3350, // Single
  1: 6700, // Married Filing Jointly
  2: 3350, // Married Filing Separately
  3: 6700, // Head of Household
};

const MD_PERSONAL_EXEMPTION_2026 = 3200;

const marylandTaxCalculator: CustomCalculator = (values) => {
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

  // Maryland STATE income tax only (see the county/local-tax simplification
  // note above): taxable wages minus the standard deduction and $3,200 per
  // exemption (self, spouse if MFJ, each dependent), run through the
  // 2%–6.5% brackets.
  const mdStandardDeduction = MD_STANDARD_DEDUCTION_2026[filingStatus];
  const numberOfExemptions = 1 + (filingStatus === 1 ? 1 : 0) + numberOfDependents;
  const mdExemptions = numberOfExemptions * MD_PERSONAL_EXEMPTION_2026;
  const marylandTaxableIncome = Math.max(0, taxableAnnualWages - mdStandardDeduction - mdExemptions);
  const annualStateIncomeTax = progressiveTax(marylandTaxableIncome, marylandBracketsFor(filingStatus));

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
// Massachusetts Income Tax Calculator — a flat 5% rate on wages, PLUS the
// "Millionaire's Tax": an additional 4% surtax on taxable income above
// $1,107,750 for 2026 (sourced from mass.gov's official tax-rates page).
// The surtax is modeled but, since this tool's salary input caps at
// $300,000 like every other state calculator here, it will never actually
// trigger for a typical user — included for completeness/future-proofing
// rather than because it usually matters. Massachusetts has no separate
// standard deduction; instead it uses a personal exemption ($4,400
// Single/MFS, $6,800 HoH, $8,800 MFJ) plus $1,000 per dependent — so this
// tool keeps the "Number of Dependents" field.
// Figures sourced from mass.gov's official Massachusetts tax rates page and
// a Massachusetts personal-exemption explainer (legalclarity.org).
// ---------------------------------------------------------------------------

const MA_FLAT_RATE = 0.05;
const MA_SURTAX_RATE = 0.04;
const MA_SURTAX_THRESHOLD_2026 = 1107750;

const MA_PERSONAL_EXEMPTION_2026: Record<FilingStatus, number> = {
  0: 4400, // Single
  1: 8800, // Married Filing Jointly
  2: 4400, // Married Filing Separately
  3: 6800, // Head of Household
};

const MA_DEPENDENT_EXEMPTION = 1000;

const massachusettsTaxCalculator: CustomCalculator = (values) => {
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

  // Massachusetts state income tax: taxable wages minus the personal
  // exemption (self, spouse if MFJ, each dependent) — no separate standard
  // deduction — at a flat 5%, plus a 4% surtax on any amount over
  // $1,107,750.
  const maPersonalExemption = MA_PERSONAL_EXEMPTION_2026[filingStatus];
  const maExemptions = maPersonalExemption + numberOfDependents * MA_DEPENDENT_EXEMPTION;
  const massachusettsTaxableIncome = Math.max(0, taxableAnnualWages - maExemptions);
  const annualStateIncomeTax =
    massachusettsTaxableIncome * MA_FLAT_RATE +
    Math.max(0, massachusettsTaxableIncome - MA_SURTAX_THRESHOLD_2026) * MA_SURTAX_RATE;

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
// Michigan Income Tax Calculator — a flat 4.25% rate (Michigan Treasury
// confirmed the rate stays at 4.25% for 2026 — the statutory revenue
// trigger for a rate cut wasn't met), applied after a $5,900-per-exemption
// personal exemption (self, spouse if MFJ, each dependent) — Michigan has
// no separate standard deduction. This tool keeps the "Number of
// Dependents" field. Figures sourced from the Michigan Department of
// Treasury's official 2026 rate announcement and 2026 withholding guide
// (michigan.gov).
// ---------------------------------------------------------------------------

const MI_FLAT_RATE = 0.0425;
const MI_PERSONAL_EXEMPTION_2026 = 5900;

const michiganTaxCalculator: CustomCalculator = (values) => {
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

  // Michigan state income tax: taxable wages minus $5,900 per exemption
  // (self, spouse if MFJ, each dependent) — no separate standard deduction
  // — at a flat 4.25%.
  const numberOfExemptions = 1 + (filingStatus === 1 ? 1 : 0) + numberOfDependents;
  const miExemptions = numberOfExemptions * MI_PERSONAL_EXEMPTION_2026;
  const michiganTaxableIncome = Math.max(0, taxableAnnualWages - miExemptions);
  const annualStateIncomeTax = michiganTaxableIncome * MI_FLAT_RATE;

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
// Minnesota Income Tax Calculator — a real 4-bracket progressive schedule
// (5.35% / 6.80% / 7.85% / 9.85%) sourced EXACTLY for all four filing
// statuses (Single, MFJ, MFS, and Head of Household each have their own
// published thresholds — no approximation needed) directly from the
// Minnesota Department of Revenue's official December 2025 press release
// announcing 2026 figures. PLUS a standard deduction and a $5,300
// per-dependent exemption (Minnesota, unlike most states here, only grants
// this exemption for dependents — there's no exemption for the filer or
// spouse, consistent with Minnesota decoupling from the suspended federal
// personal exemption). This tool keeps the "Number of Dependents" field.
// ---------------------------------------------------------------------------

const MN_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0535, upTo: 33310 },
  { rate: 0.068, upTo: 109430 },
  { rate: 0.0785, upTo: 203150 },
  { rate: 0.0985, upTo: Infinity },
];

const MN_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0535, upTo: 48700 },
  { rate: 0.068, upTo: 193480 },
  { rate: 0.0785, upTo: 337930 },
  { rate: 0.0985, upTo: Infinity },
];

const MN_BRACKETS_MFS_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0535, upTo: 24350 },
  { rate: 0.068, upTo: 96740 },
  { rate: 0.0785, upTo: 168965 },
  { rate: 0.0985, upTo: Infinity },
];

const MN_BRACKETS_HOH_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0535, upTo: 41010 },
  { rate: 0.068, upTo: 164800 },
  { rate: 0.0785, upTo: 270060 },
  { rate: 0.0985, upTo: Infinity },
];

function minnesotaBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  if (status === 1) return MN_BRACKETS_MFJ_2026;
  if (status === 2) return MN_BRACKETS_MFS_2026;
  if (status === 3) return MN_BRACKETS_HOH_2026;
  return MN_BRACKETS_SINGLE_2026;
}

const MN_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 15300, // Single
  1: 30600, // Married Filing Jointly
  2: 15300, // Married Filing Separately
  3: 23000, // Head of Household
};

const MN_DEPENDENT_EXEMPTION_2026 = 5300;

const minnesotaTaxCalculator: CustomCalculator = (values) => {
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

  // Minnesota state income tax: taxable wages minus the standard deduction
  // and $5,300 per dependent (no exemption for the filer/spouse), run
  // through the 5.35%–9.85% brackets.
  const mnStandardDeduction = MN_STANDARD_DEDUCTION_2026[filingStatus];
  const mnDependentExemption = numberOfDependents * MN_DEPENDENT_EXEMPTION_2026;
  const minnesotaTaxableIncome = Math.max(
    0,
    taxableAnnualWages - mnStandardDeduction - mnDependentExemption
  );
  const annualStateIncomeTax = progressiveTax(minnesotaTaxableIncome, minnesotaBracketsFor(filingStatus));

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
// Mississippi Income Tax Calculator — a flat 4% rate, but with a 0% bracket
// on the first $10,000 of Mississippi taxable income (a holdover from
// Mississippi's pre-reform bracket system, kept as a de facto zero-bracket
// even after the move to a single flat rate) — so the 4% only applies to
// taxable income above that $10,000 floor. PLUS a personal exemption
// ($6,000 Single/MFS, $12,000 MFJ, $8,000 HoH) and a $1,500-per-dependent
// exemption, on top of a standard deduction. This tool keeps the "Number of
// Dependents" field. Mississippi is also in the middle of a multi-year
// phase-down toward 3% by 2030, documented in this tool's Assumptions text
// as something to watch for future updates.
// ---------------------------------------------------------------------------

const MS_FLAT_RATE = 0.04;
const MS_ZERO_BRACKET_THRESHOLD_2026 = 10000;

const MS_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 2300, // Single
  1: 4600, // Married Filing Jointly
  2: 2300, // Married Filing Separately
  3: 3400, // Head of Household
};

const MS_PERSONAL_EXEMPTION_2026: Record<FilingStatus, number> = {
  0: 6000, // Single
  1: 12000, // Married Filing Jointly
  2: 6000, // Married Filing Separately
  3: 8000, // Head of Household
};

const MS_DEPENDENT_EXEMPTION = 1500;

const mississippiTaxCalculator: CustomCalculator = (values) => {
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

  // Mississippi state income tax: taxable wages minus the standard
  // deduction and personal/dependent exemptions, then the first $10,000 of
  // what's left is taxed at 0% and the rest at a flat 4%.
  const msStandardDeduction = MS_STANDARD_DEDUCTION_2026[filingStatus];
  const msPersonalExemption = MS_PERSONAL_EXEMPTION_2026[filingStatus];
  const msDependentExemption = numberOfDependents * MS_DEPENDENT_EXEMPTION;
  const mississippiTaxableIncome = Math.max(
    0,
    taxableAnnualWages - msStandardDeduction - msPersonalExemption - msDependentExemption
  );
  const annualStateIncomeTax =
    Math.max(0, mississippiTaxableIncome - MS_ZERO_BRACKET_THRESHOLD_2026) * MS_FLAT_RATE;

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
// Missouri Income Tax Calculator — an 8-bracket progressive schedule (0% up
// to 4.7%) sourced from a 2026 bracket aggregator (ustax.tools), with the
// SAME dollar thresholds for every filing status — Missouri's brackets
// aren't doubled for Married Filing Jointly the way most progressive-bracket
// states here are, confirmed directly from the source rather than assumed.
// Missouri's standard deduction matches the federal amount exactly (Tax
// Foundation's 2026 state comparison table confirms this), so this
// calculator reuses the same `STANDARD_DEDUCTION_2026` constant used for the
// federal tax line rather than a separate Missouri-specific figure. No
// dependents field: no current Missouri dependent exemption was found tied
// to this bracket structure.
// SIMPLIFICATION (documented in the Tool's Assumptions text): Missouri also
// allows a deduction for a portion of federal income taxes paid, subject to
// income-based caps — a real reduction to Missouri tax that isn't modeled
// here, so this calculator's Missouri tax figure runs slightly higher than
// what many filers will actually owe.
// ---------------------------------------------------------------------------

const MO_BRACKETS_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 1348 },
  { rate: 0.02, upTo: 2696 },
  { rate: 0.025, upTo: 4044 },
  { rate: 0.03, upTo: 5392 },
  { rate: 0.035, upTo: 6740 },
  { rate: 0.04, upTo: 8088 },
  { rate: 0.045, upTo: 9436 },
  { rate: 0.047, upTo: Infinity },
];

const missouriTaxCalculator: CustomCalculator = (values) => {
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

  // Missouri state income tax: taxable wages minus the (federal-matching)
  // standard deduction, run through the 0%-4.7% brackets — the same
  // thresholds regardless of filing status.
  const missouriTaxableIncome = Math.max(0, taxableAnnualWages - standardDeduction);
  const annualStateIncomeTax = progressiveTax(missouriTaxableIncome, MO_BRACKETS_2026);

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
// Montana Income Tax Calculator — a flat-feeling 2-bracket schedule (4.7%
// then 5.65%, per HB 337's 2026 rate cut), but like Colorado, Montana does
// NOT define its own separate standard deduction: Montana's 2021 tax
// simplification (SB 399, effective 2024) made federal taxable income
// Montana's own starting point, "automatically incorporating the federal
// standard deduction" (Tax Foundation). So this calculator reuses the
// `federalTaxableIncome` value already computed for the federal tax line,
// the same pattern as Colorado, rather than subtracting a second deduction.
// SIMPLIFICATION: Married Filing Separately is derived as exactly half of
// MFJ's threshold (which happens to already equal the Single threshold);
// Head of Household uses the Single schedule — Montana's exact Head of
// Household bracket wasn't cleanly sourced, so it's approximated the same
// way as several other states here (documented in the Tool's Assumptions
// text).
// ---------------------------------------------------------------------------

const MT_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.047, upTo: 47500 },
  { rate: 0.0565, upTo: Infinity },
];

const MT_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.047, upTo: 95000 },
  { rate: 0.0565, upTo: Infinity },
];

function montanaBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  return status === 1 ? MT_BRACKETS_MFJ_2026 : MT_BRACKETS_SINGLE_2026;
}

const montanaTaxCalculator: CustomCalculator = (values) => {
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

  // Montana state income tax: the 4.7%/5.65% brackets applied directly to
  // federal taxable income (Montana's own tax base since 2024) — no
  // separate Montana standard deduction to subtract.
  const annualStateIncomeTax = progressiveTax(federalTaxableIncome, montanaBracketsFor(filingStatus));

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
// Nebraska Income Tax Calculator — a real 3-bracket progressive schedule
// (2.46% / 3.51% / 4.55%), sourced exactly for Single and Married Filing
// Jointly from a 2026 bracket aggregator, PLUS a standard deduction sourced
// from Nebraska's 2026 income tax tables (Single $8,600, MFJ $17,200, MFS
// $8,600, Head of Household $12,600). No dependents field: no current
// Nebraska per-dependent deduction (as opposed to a small nonrefundable
// credit) was found tied to this bracket structure.
// SIMPLIFICATION: Married Filing Separately is derived as exactly half of
// MFJ's thresholds; Head of Household uses the Single schedule — Nebraska's
// exact Head of Household bracket thresholds weren't cleanly sourced, so
// it's approximated the same way as several other states here (documented
// in the Tool's Assumptions text).
// ---------------------------------------------------------------------------

const NE_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0246, upTo: 4130 },
  { rate: 0.0351, upTo: 24760 },
  { rate: 0.0455, upTo: Infinity },
];

const NE_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0246, upTo: 8250 },
  { rate: 0.0351, upTo: 49530 },
  { rate: 0.0455, upTo: Infinity },
];

function nebraskaBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  if (status === 1) return NE_BRACKETS_MFJ_2026;
  if (status === 2) {
    return NE_BRACKETS_MFJ_2026.map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return NE_BRACKETS_SINGLE_2026;
}

const NE_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 8600, // Single
  1: 17200, // Married Filing Jointly
  2: 8600, // Married Filing Separately
  3: 12600, // Head of Household
};

const nebraskaTaxCalculator: CustomCalculator = (values) => {
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

  // Nebraska state income tax: taxable wages minus Nebraska's own standard
  // deduction, run through the 2.46%/3.51%/4.55% brackets.
  const neStandardDeduction = NE_STANDARD_DEDUCTION_2026[filingStatus];
  const nebraskaTaxableIncome = Math.max(0, taxableAnnualWages - neStandardDeduction);
  const annualStateIncomeTax = progressiveTax(nebraskaTaxableIncome, nebraskaBracketsFor(filingStatus));

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
// New Hampshire — like Nevada, Alaska, and Florida, New Hampshire has no
// state income tax on wages. New Hampshire did tax interest and dividend
// income (the "I&D Tax"), but that tax was fully repealed for taxable
// periods beginning after December 31, 2024 — confirmed directly from the
// New Hampshire Department of Revenue Administration. So as of 2026, New
// Hampshire has NO state-level income tax of any kind, and this calculator
// is a direct alias of the Nevada federal+FICA-only model.
// ---------------------------------------------------------------------------

const newHampshireTaxCalculator: CustomCalculator = nevadaTaxCalculator;

// ---------------------------------------------------------------------------
// New Jersey Income Tax Calculator — the most bracket-heavy state modeled
// so far: 7 brackets for Single/MFS (1.4% up to 10.75%) and 8 for Married
// Filing Jointly, sourced exactly from a 2026 bracket aggregator. New
// Jersey has NO standard deduction at all — instead it uses a $1,000
// personal exemption (self, and again if filing jointly) plus $1,500 per
// dependent, sourced from the NJ Division of Taxation's own exemptions
// page — so this tool keeps the "Number of Dependents" input field.
// SIMPLIFICATIONS (documented in the Tool's Assumptions text): Married
// Filing Separately and Head of Household use the Single bracket schedule
// — New Jersey's own MFS thresholds already match Single exactly in the
// lower brackets, and Head of Household isn't separately scheduled in the
// sources used here. New Jersey's separate additional exemptions for age
// 65+, blindness/disability, and dependents in college aren't modeled.
// ---------------------------------------------------------------------------

const NJ_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.014, upTo: 20000 },
  { rate: 0.0175, upTo: 35000 },
  { rate: 0.035, upTo: 40000 },
  { rate: 0.0553, upTo: 75000 },
  { rate: 0.0637, upTo: 500000 },
  { rate: 0.0897, upTo: 1000000 },
  { rate: 0.1075, upTo: Infinity },
];

const NJ_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.014, upTo: 20000 },
  { rate: 0.0175, upTo: 50000 },
  { rate: 0.0245, upTo: 70000 },
  { rate: 0.035, upTo: 80000 },
  { rate: 0.0553, upTo: 150000 },
  { rate: 0.0637, upTo: 500000 },
  { rate: 0.0897, upTo: 1000000 },
  { rate: 0.1075, upTo: Infinity },
];

function newJerseyBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  return status === 1 ? NJ_BRACKETS_MFJ_2026 : NJ_BRACKETS_SINGLE_2026;
}

const NJ_PERSONAL_EXEMPTION = 1000;
const NJ_DEPENDENT_EXEMPTION = 1500;

const newJerseyTaxCalculator: CustomCalculator = (values) => {
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

  // New Jersey state income tax: taxable wages minus $1,000 per personal
  // exemption (self, again if MFJ) and $1,500 per dependent — no standard
  // deduction — run through the 1.4%-10.75% brackets.
  const numberOfPersonalExemptions = 1 + (filingStatus === 1 ? 1 : 0);
  const njExemptions = numberOfPersonalExemptions * NJ_PERSONAL_EXEMPTION + numberOfDependents * NJ_DEPENDENT_EXEMPTION;
  const newJerseyTaxableIncome = Math.max(0, taxableAnnualWages - njExemptions);
  const annualStateIncomeTax = progressiveTax(newJerseyTaxableIncome, newJerseyBracketsFor(filingStatus));

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
// New Mexico Income Tax Calculator — a real 6-bracket progressive schedule
// (1.5% up to 5.9%), sourced exactly for Single and Married Filing Jointly
// from a 2026 bracket aggregator. New Mexico's personal income tax starts
// from Federal Adjusted Gross Income, and its standard deduction matches
// the federal amount exactly (confirmed via the Tax Foundation's 2026
// state-by-state comparison table), so this calculator reuses the same
// `STANDARD_DEDUCTION_2026` constant used for the federal tax line. No
// dependents field: no New Mexico dependent-count-based deduction was
// found tied to this bracket structure.
// SIMPLIFICATION: Married Filing Separately is derived as exactly half of
// MFJ's thresholds; Head of Household uses the Single schedule — New
// Mexico's exact Head of Household bracket thresholds weren't cleanly
// sourced, so it's approximated the same way as several other states here
// (documented in the Tool's Assumptions text).
// ---------------------------------------------------------------------------

const NM_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.015, upTo: 5500 },
  { rate: 0.032, upTo: 16500 },
  { rate: 0.043, upTo: 33500 },
  { rate: 0.047, upTo: 66500 },
  { rate: 0.049, upTo: 210000 },
  { rate: 0.059, upTo: Infinity },
];

const NM_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.015, upTo: 8000 },
  { rate: 0.032, upTo: 25000 },
  { rate: 0.043, upTo: 50000 },
  { rate: 0.047, upTo: 100000 },
  { rate: 0.049, upTo: 315000 },
  { rate: 0.059, upTo: Infinity },
];

function newMexicoBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  if (status === 1) return NM_BRACKETS_MFJ_2026;
  if (status === 2) {
    return NM_BRACKETS_MFJ_2026.map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return NM_BRACKETS_SINGLE_2026;
}

const newMexicoTaxCalculator: CustomCalculator = (values) => {
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

  // New Mexico state income tax: taxable wages minus the (federal-matching)
  // standard deduction, run through the 1.5%-5.9% brackets.
  const newMexicoTaxableIncome = Math.max(0, taxableAnnualWages - standardDeduction);
  const annualStateIncomeTax = progressiveTax(newMexicoTaxableIncome, newMexicoBracketsFor(filingStatus));

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
// New York Income Tax Calculator — the widest bracket range in this series
// so far: 8 brackets from 3.9% up to 10.9% at $25,000,000+, sourced exactly
// for Single and Married Filing Jointly from a 2026 bracket aggregator.
// PLUS a standard deduction (Single $8,000, MFJ $16,050, Head of Household
// $11,200) sourced from a 2026 state standard-deduction roundup. IMPORTANT:
// this is STATE tax only — New York City (and Yonkers) levy their own
// additional local income tax on top of state tax, NOT modeled here, the
// same scope limitation as Indiana's county tax and Maryland's county
// piggyback tax, documented in the Assumptions text below.
// SIMPLIFICATIONS: Married Filing Separately is derived as exactly half of
// MFJ's thresholds and uses the Single standard deduction; Head of
// Household uses the Single bracket schedule (with its own $11,200
// standard deduction) — New York's exact Head of Household bracket
// thresholds weren't cleanly sourced, so it's approximated the same way as
// several other states here.
// ---------------------------------------------------------------------------

const NY_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.039, upTo: 8500 },
  { rate: 0.044, upTo: 11700 },
  { rate: 0.0515, upTo: 13900 },
  { rate: 0.054, upTo: 80650 },
  { rate: 0.059, upTo: 215400 },
  { rate: 0.0685, upTo: 1077550 },
  { rate: 0.0965, upTo: 5000000 },
  { rate: 0.103, upTo: 25000000 },
  { rate: 0.109, upTo: Infinity },
];

const NY_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.039, upTo: 17150 },
  { rate: 0.044, upTo: 23600 },
  { rate: 0.0515, upTo: 27900 },
  { rate: 0.054, upTo: 161550 },
  { rate: 0.059, upTo: 323200 },
  { rate: 0.0685, upTo: 2155350 },
  { rate: 0.0965, upTo: 5000000 },
  { rate: 0.103, upTo: 25000000 },
  { rate: 0.109, upTo: Infinity },
];

function newYorkBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  if (status === 1) return NY_BRACKETS_MFJ_2026;
  if (status === 2) {
    return NY_BRACKETS_MFJ_2026.map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return NY_BRACKETS_SINGLE_2026;
}

const NY_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 8000, // Single
  1: 16050, // Married Filing Jointly
  2: 8000, // Married Filing Separately
  3: 11200, // Head of Household
};

const newYorkTaxCalculator: CustomCalculator = (values) => {
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

  // New York STATE income tax only (NYC/Yonkers local tax not modeled —
  // see the note above): taxable wages minus New York's own standard
  // deduction, run through the 3.9%-10.9% brackets.
  const nyStandardDeduction = NY_STANDARD_DEDUCTION_2026[filingStatus];
  const newYorkTaxableIncome = Math.max(0, taxableAnnualWages - nyStandardDeduction);
  const annualStateIncomeTax = progressiveTax(newYorkTaxableIncome, newYorkBracketsFor(filingStatus));

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
// North Carolina Income Tax Calculator — a flat 3.99% rate, applied after a
// standard deduction sourced from North Carolina's own 2025/2026 figures
// (Single $12,750, MFJ $25,500, Head of Household $19,125, Married Filing
// Separately $12,750) — these amounts are fixed by statute for both the
// 2025 and 2026 tax years, not inflation-adjusted annually. No dependents
// field: North Carolina's flat tax has no separate per-dependent deduction.
// SIMPLIFICATION: North Carolina reduces a Married-Filing-Separately
// spouse's standard deduction to $0 if the other spouse itemizes — a
// real-but-uncommon edge case this calculator doesn't model.
// ---------------------------------------------------------------------------

const NC_FLAT_RATE = 0.0399;
const NC_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 12750, // Single
  1: 25500, // Married Filing Jointly
  2: 12750, // Married Filing Separately
  3: 19125, // Head of Household
};

const northCarolinaTaxCalculator: CustomCalculator = (values) => {
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

  // North Carolina state income tax: taxable wages minus North Carolina's
  // own standard deduction, then a single flat 3.99% rate.
  const ncStandardDeduction = NC_STANDARD_DEDUCTION_2026[filingStatus];
  const northCarolinaTaxableIncome = Math.max(0, taxableAnnualWages - ncStandardDeduction);
  const annualStateIncomeTax = northCarolinaTaxableIncome * NC_FLAT_RATE;

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
// North Dakota Income Tax Calculator — like Colorado and Montana, North
// Dakota does NOT define its own separate standard deduction: North Dakota
// "uses federal taxable income as the starting point" (confirmed from the
// ND Office of State Tax Commissioner), so this calculator reuses the
// `federalTaxableIncome` value already computed for the federal tax line.
// On top of that base, North Dakota applies a 3-tier schedule that is
// mostly a 0% bracket — 0% up to $49,575 (Single) / $82,800 (MFJ), 1.95%
// on the next slice, and 2.5% above that — sourced exactly for Single and
// Married Filing Jointly from a 2026 bracket aggregator.
// SIMPLIFICATION: Married Filing Separately is derived as exactly half of
// MFJ's thresholds; Head of Household uses the Single schedule — North
// Dakota's exact Head of Household bracket thresholds weren't cleanly
// sourced, so it's approximated the same way as several other states here
// (documented in the Tool's Assumptions text).
// ---------------------------------------------------------------------------

const ND_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 49575 },
  { rate: 0.0195, upTo: 250400 },
  { rate: 0.025, upTo: Infinity },
];

const ND_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 82800 },
  { rate: 0.0195, upTo: 304850 },
  { rate: 0.025, upTo: Infinity },
];

function northDakotaBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  if (status === 1) return ND_BRACKETS_MFJ_2026;
  if (status === 2) {
    return ND_BRACKETS_MFJ_2026.map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return ND_BRACKETS_SINGLE_2026;
}

const northDakotaTaxCalculator: CustomCalculator = (values) => {
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

  // North Dakota state income tax: the 0%/1.95%/2.5% brackets applied
  // directly to federal taxable income (North Dakota's own tax base) — no
  // separate North Dakota standard deduction to subtract.
  const annualStateIncomeTax = progressiveTax(federalTaxableIncome, northDakotaBracketsFor(filingStatus));

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
// Ohio Income Tax Calculator — a 2-tier schedule that's mostly a 0%
// bracket: 0% on the first $26,050 of Ohio taxable income, then a single
// flat 2.75% rate above that — the SAME threshold for every filing status
// (confirmed directly from a 2026 bracket aggregator, not doubled for
// Married Filing Jointly). No separate Ohio standard deduction: the
// $26,050 zero-bracket serves that role. No dependents field: Ohio's
// current flat-above-the-floor structure has no separate per-dependent
// deduction modeled here.
// ---------------------------------------------------------------------------

const OH_BRACKETS_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 26050 },
  { rate: 0.0275, upTo: Infinity },
];

const ohioTaxCalculator: CustomCalculator = (values) => {
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

  // Ohio state income tax: 0% on the first $26,050 of taxable wages, then
  // 2.75% above that — no separate standard deduction to subtract first.
  const annualStateIncomeTax = progressiveTax(taxableAnnualWages, OH_BRACKETS_2026);

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
// Oklahoma Income Tax Calculator — a 4-bracket progressive schedule (0% up
// to 4.5%) sourced exactly for both filing-status groupings: Oklahoma
// groups Single with Married Filing Separately (one schedule) and Married
// Filing Jointly with Head of Household (a wider schedule) — confirmed
// directly from the source, not an approximation, the same grouping shape
// Maryland uses. PLUS a standard deduction (Single/MFS $6,350, Head of
// Household $9,350, MFJ $12,700). No dependents field: Oklahoma's current
// bracket structure has no separate per-dependent deduction modeled here.
// ---------------------------------------------------------------------------

const OK_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 3750 },
  { rate: 0.025, upTo: 4900 },
  { rate: 0.035, upTo: 7200 },
  { rate: 0.045, upTo: Infinity },
];

const OK_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 7500 },
  { rate: 0.025, upTo: 9800 },
  { rate: 0.035, upTo: 14400 },
  { rate: 0.045, upTo: Infinity },
];

// Oklahoma groups Single with MFS, and MFJ with Head of Household — this is
// Oklahoma's actual statutory grouping, not an approximation.
function oklahomaBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  return status === 1 || status === 3 ? OK_BRACKETS_MFJ_2026 : OK_BRACKETS_SINGLE_2026;
}

const OK_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 6350, // Single
  1: 12700, // Married Filing Jointly
  2: 6350, // Married Filing Separately
  3: 9350, // Head of Household
};

const oklahomaTaxCalculator: CustomCalculator = (values) => {
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

  // Oklahoma state income tax: taxable wages minus Oklahoma's own standard
  // deduction, run through the 0%-4.5% brackets.
  const okStandardDeduction = OK_STANDARD_DEDUCTION_2026[filingStatus];
  const oklahomaTaxableIncome = Math.max(0, taxableAnnualWages - okStandardDeduction);
  const annualStateIncomeTax = progressiveTax(oklahomaTaxableIncome, oklahomaBracketsFor(filingStatus));

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
// Oregon Income Tax Calculator — a real 4-bracket progressive schedule
// (4.75% up to 9.9%, one of the highest top rates in the country), sourced
// exactly for Single and Married Filing Jointly from a 2026 bracket
// aggregator. PLUS Oregon's own, much smaller standard deduction (Single/
// MFS $2,835, Head of Household $4,560, MFJ $5,670) — sourced from a 2026
// standard-deduction roundup. No dependents field: Oregon's current
// bracket structure has no separate per-dependent deduction modeled here
// (Oregon does have its own personal exemption CREDIT, a small flat-dollar
// credit rather than a deduction, which isn't modeled).
// SIMPLIFICATION: Married Filing Separately is derived as exactly half of
// MFJ's thresholds; Head of Household uses the Single bracket schedule
// (with its own $4,560 standard deduction) — Oregon's exact Head of
// Household bracket thresholds weren't cleanly sourced, so it's
// approximated the same way as several other states here (documented in
// the Tool's Assumptions text).
// ---------------------------------------------------------------------------

const OR_BRACKETS_SINGLE_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0475, upTo: 4550 },
  { rate: 0.0675, upTo: 11400 },
  { rate: 0.0875, upTo: 125000 },
  { rate: 0.099, upTo: Infinity },
];

const OR_BRACKETS_MFJ_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0475, upTo: 9100 },
  { rate: 0.0675, upTo: 22800 },
  { rate: 0.0875, upTo: 250000 },
  { rate: 0.099, upTo: Infinity },
];

function oregonBracketsFor(status: FilingStatus): { rate: number; upTo: number }[] {
  if (status === 1) return OR_BRACKETS_MFJ_2026;
  if (status === 2) {
    return OR_BRACKETS_MFJ_2026.map((b) => ({
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : b.upTo / 2,
    }));
  }
  return OR_BRACKETS_SINGLE_2026;
}

const OR_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 2835, // Single
  1: 5670, // Married Filing Jointly
  2: 2835, // Married Filing Separately
  3: 4560, // Head of Household
};

const oregonTaxCalculator: CustomCalculator = (values) => {
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

  // Oregon state income tax: taxable wages minus Oregon's own (much
  // smaller than federal) standard deduction, run through the 4.75%-9.9%
  // brackets.
  const orStandardDeduction = OR_STANDARD_DEDUCTION_2026[filingStatus];
  const oregonTaxableIncome = Math.max(0, taxableAnnualWages - orStandardDeduction);
  const annualStateIncomeTax = progressiveTax(oregonTaxableIncome, oregonBracketsFor(filingStatus));

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
// Pennsylvania Income Tax Calculator — the simplest model in this entire
// series: a flat 3.07% rate (in effect since 2004, per the Pennsylvania
// Department of Revenue) applied directly to taxable wages, with NO
// standard deduction and NO personal exemption of any kind — Pennsylvania's
// personal income tax doesn't have either. No dependents field for the
// same reason. This tool's Instructions and Assumptions text calls out
// Philadelphia's separate local Wage Tax explicitly, since it's a large,
// well-known addition many Pennsylvania workers actually pay.
// ---------------------------------------------------------------------------

const PA_FLAT_RATE = 0.0307;

const pennsylvaniaTaxCalculator: CustomCalculator = (values) => {
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

  // Pennsylvania state income tax: a flat 3.07% of taxable wages — no
  // standard deduction or personal exemption to subtract first.
  const annualStateIncomeTax = taxableAnnualWages * PA_FLAT_RATE;

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
// Rhode Island Income Tax Calculator — a real 3-bracket progressive
// schedule (3.75% / 4.75% / 5.99%), with the SAME dollar thresholds for
// every filing status ($0-$82,050-$186,450, not doubled for Married Filing
// Jointly) — confirmed directly from the Rhode Island Division of
// Taxation's own official 2026 inflation-adjustment bulletin, not an
// approximation. PLUS a standard deduction (Single/MFS $11,200, Head of
// Household $16,800, MFJ $22,400) sourced from the same official bulletin.
// No dependents field: Rhode Island's current bracket structure has no
// separate per-dependent deduction modeled here.
// ---------------------------------------------------------------------------

const RI_BRACKETS_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0375, upTo: 82050 },
  { rate: 0.0475, upTo: 186450 },
  { rate: 0.0599, upTo: Infinity },
];

const RI_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 11200, // Single
  1: 22400, // Married Filing Jointly
  2: 11200, // Married Filing Separately
  3: 16800, // Head of Household
};

const rhodeIslandTaxCalculator: CustomCalculator = (values) => {
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

  // Rhode Island state income tax: taxable wages minus Rhode Island's own
  // standard deduction, run through the 3.75%/4.75%/5.99% brackets (the
  // same thresholds for every filing status).
  const riStandardDeduction = RI_STANDARD_DEDUCTION_2026[filingStatus];
  const rhodeIslandTaxableIncome = Math.max(0, taxableAnnualWages - riStandardDeduction);
  const annualStateIncomeTax = progressiveTax(rhodeIslandTaxableIncome, RI_BRACKETS_2026);

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
// South Carolina Income Tax Calculator — freshly reformed for 2026 under
// H.4216 (Act 110): a 2-bracket schedule (1.99% under $30,000, 5.21%
// above), with the SAME $30,000 threshold for every filing status —
// confirmed directly from the South Carolina Department of Revenue's own
// H.4216 explainer, not an approximation — replacing South Carolina's old
// six-bracket system topping out at 6.4%. H.4216 also replaced the old
// federal-conformity standard deduction with a new, South-Carolina-only
// "SCIAD" deduction: $15,000 (Single/MFS), $22,500 (Head of Household),
// $30,000 (MFJ/Qualifying Surviving Spouse). No dependents field: SCIAD is
// not dependent-count-based.
// SIMPLIFICATION: SCIAD "may be reduced based on income levels" at higher
// incomes per H.4216 (a phase-out) — not modeled here, since the exact
// phase-out schedule wasn't cleanly sourced; documented in the Tool's
// Assumptions text.
// ---------------------------------------------------------------------------

const SC_BRACKETS_2026: { rate: number; upTo: number }[] = [
  { rate: 0.0199, upTo: 30000 },
  { rate: 0.0521, upTo: Infinity },
];

const SC_SCIAD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 15000, // Single
  1: 30000, // Married Filing Jointly
  2: 15000, // Married Filing Separately
  3: 22500, // Head of Household
};

const southCarolinaTaxCalculator: CustomCalculator = (values) => {
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

  // South Carolina state income tax: taxable wages minus the SCIAD
  // deduction, run through the 1.99%/5.21% brackets (the same $30,000
  // threshold for every filing status).
  const sciadDeduction = SC_SCIAD_DEDUCTION_2026[filingStatus];
  const southCarolinaTaxableIncome = Math.max(0, taxableAnnualWages - sciadDeduction);
  const annualStateIncomeTax = progressiveTax(southCarolinaTaxableIncome, SC_BRACKETS_2026);

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
  "kansas-tax-calculator": kansasTaxCalculator,
  "kentucky-tax-calculator": kentuckyTaxCalculator,
  "louisiana-tax-calculator": louisianaTaxCalculator,
  "maine-tax-calculator": maineTaxCalculator,
  "maryland-tax-calculator": marylandTaxCalculator,
  "massachusetts-tax-calculator": massachusettsTaxCalculator,
  "michigan-tax-calculator": michiganTaxCalculator,
  "minnesota-tax-calculator": minnesotaTaxCalculator,
  "mississippi-tax-calculator": mississippiTaxCalculator,
  "missouri-tax-calculator": missouriTaxCalculator,
  "montana-tax-calculator": montanaTaxCalculator,
  "nebraska-tax-calculator": nebraskaTaxCalculator,
  "new-hampshire-tax-calculator": newHampshireTaxCalculator,
  "new-jersey-tax-calculator": newJerseyTaxCalculator,
  "new-mexico-tax-calculator": newMexicoTaxCalculator,
  "new-york-tax-calculator": newYorkTaxCalculator,
  "north-carolina-tax-calculator": northCarolinaTaxCalculator,
  "north-dakota-tax-calculator": northDakotaTaxCalculator,
  "ohio-tax-calculator": ohioTaxCalculator,
  "oklahoma-tax-calculator": oklahomaTaxCalculator,
  "oregon-tax-calculator": oregonTaxCalculator,
  "pennsylvania-tax-calculator": pennsylvaniaTaxCalculator,
  "rhode-island-tax-calculator": rhodeIslandTaxCalculator,
  "south-carolina-tax-calculator": southCarolinaTaxCalculator,
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
