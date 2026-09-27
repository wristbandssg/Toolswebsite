/**
 * Batch: "Salary & Income Calculators" (7 new tools — Take-Home Pay
 * Calculator already existed and was skipped). Part of the
 * Finance_Calculators_Topical_SEO_Master.xlsx build-out (see
 * calc-engine-finance-credit-debt.ts for the full batch list/context).
 *
 * These are deliberately GROSS-PAY / no-tax calculators — pure pay-period
 * and pay-rate conversions. This site already has federal-tax-aware
 * siblings with very similar names (salary-tax-calculator,
 * paycheck-tax-calculator, overtime-tax-calculator, bonus-tax-calculator,
 * commission-tax-calculator in calc-engine-us-tax-salary-calculators.ts) —
 * those net out federal income tax and FICA from a paycheck. The tools
 * here answer the simpler, very commonly searched "what does this convert
 * to" question with no tax involved at all, which is a genuinely distinct
 * search intent (see each tool's FAQ for an explicit note pointing to its
 * tax-aware sibling). Self-contained: no imports from that file or any
 * other batch, per this project's established per-batch convention.
 *
 * See prisma/create-finance-salary-income-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

const STANDARD_HOURS_PER_YEAR = 2080; // 40 hours/week x 52 weeks — the common full-time-equivalent baseline.

// Pay-frequency dropdown value -> periods per year (matches the field's own options).
function periodsPerYear(payFrequency: number): number {
  const known = [52, 26, 24, 12, 1];
  return known.includes(payFrequency) ? payFrequency : 26;
}

// --- 1. Salary Calculator -----------------------------------------------------
export const salaryCalculator: CustomCalculator = (values) => {
  const annualSalary = safeNumber(values.annualSalary);
  const periods = periodsPerYear(safeNumber(values.payFrequency, 26));
  const grossPayPerPeriod = annualSalary / periods;
  return {
    grossPayPerPeriod: Math.round(grossPayPerPeriod * 100) / 100,
    weeklyEquivalent: Math.round((annualSalary / 52) * 100) / 100,
    monthlyEquivalent: Math.round((annualSalary / 12) * 100) / 100,
    hourlyEquivalent: Math.round((annualSalary / STANDARD_HOURS_PER_YEAR) * 100) / 100,
  };
};

// --- 2. Hourly to Salary Calculator -------------------------------------------
export const hourlyToSalaryCalculator: CustomCalculator = (values) => {
  const hourlyRate = safeNumber(values.hourlyRate);
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));
  const weeksPerYear = Math.max(0, safeNumber(values.weeksPerYear, 52));
  const annualSalary = hourlyRate * hoursPerWeek * weeksPerYear;
  return {
    annualSalary: Math.round(annualSalary * 100) / 100,
    monthlySalary: Math.round((annualSalary / 12) * 100) / 100,
    weeklySalary: Math.round((hourlyRate * hoursPerWeek) * 100) / 100,
  };
};

// --- 3. Salary to Hourly Calculator -------------------------------------------
export const salaryToHourlyCalculator: CustomCalculator = (values) => {
  const annualSalary = safeNumber(values.annualSalary);
  const hoursPerWeek = Math.max(1, safeNumber(values.hoursPerWeek, 40));
  const weeksPerYear = Math.max(1, safeNumber(values.weeksPerYear, 52));
  const totalHours = hoursPerWeek * weeksPerYear;
  const hourlyRate = annualSalary / totalHours;
  return {
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    dailyRate: Math.round(hourlyRate * (hoursPerWeek / 5) * 100) / 100,
    weeklyRate: Math.round(hourlyRate * hoursPerWeek * 100) / 100,
  };
};

// --- 4. Overtime Calculator (gross only) --------------------------------------
export const overtimeCalculator: CustomCalculator = (values) => {
  const hourlyRate = safeNumber(values.hourlyRate);
  const regularHours = Math.max(0, safeNumber(values.regularHours, 40));
  const overtimeHours = Math.max(0, safeNumber(values.overtimeHours));
  const overtimeMultiplier = Math.max(1, safeNumber(values.overtimeMultiplier, 1.5));

  const regularPay = hourlyRate * regularHours;
  const overtimePay = hourlyRate * overtimeMultiplier * overtimeHours;
  const totalGrossPay = regularPay + overtimePay;
  const totalHours = regularHours + overtimeHours;

  return {
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    totalGrossPay: Math.round(totalGrossPay * 100) / 100,
    effectiveHourlyRate: totalHours > 0 ? Math.round((totalGrossPay / totalHours) * 100) / 100 : 0,
  };
};

// --- 5. Paycheck Calculator (gross + common pre-tax deductions, no income tax) --
export const paycheckCalculator: CustomCalculator = (values) => {
  const annualSalary = safeNumber(values.annualSalary);
  const periods = periodsPerYear(safeNumber(values.payFrequency, 26));
  const grossPayPerPeriod = annualSalary / periods;

  const retirementPercent = Math.max(0, safeNumber(values.retirement401kPercent)) / 100;
  const healthInsurancePerPeriod = Math.max(0, safeNumber(values.healthInsurancePerPeriod));
  const otherPreTaxPerPeriod = Math.max(0, safeNumber(values.otherPreTaxPerPeriod));

  const retirementContribution = grossPayPerPeriod * retirementPercent;
  const totalPreTaxDeductions = retirementContribution + healthInsurancePerPeriod + otherPreTaxPerPeriod;
  const payAfterPreTaxDeductions = Math.max(0, grossPayPerPeriod - totalPreTaxDeductions);

  return {
    grossPayPerPeriod: Math.round(grossPayPerPeriod * 100) / 100,
    retirementContribution: Math.round(retirementContribution * 100) / 100,
    totalPreTaxDeductions: Math.round(totalPreTaxDeductions * 100) / 100,
    payAfterPreTaxDeductions: Math.round(payAfterPreTaxDeductions * 100) / 100,
  };
};

// --- 6. Commission Calculator (gross only) ------------------------------------
export const commissionCalculator: CustomCalculator = (values) => {
  const salesAmount = Math.max(0, safeNumber(values.salesAmount));
  const commissionRate = Math.max(0, safeNumber(values.commissionRate)) / 100;
  const basePayPerPeriod = Math.max(0, safeNumber(values.basePayPerPeriod));

  const commissionEarned = salesAmount * commissionRate;
  const totalGrossPay = basePayPerPeriod + commissionEarned;

  return {
    commissionEarned: Math.round(commissionEarned * 100) / 100,
    totalGrossPay: Math.round(totalGrossPay * 100) / 100,
  };
};

// --- 7. Bonus Calculator (gross-up: desired NET -> required GROSS) -----------
// Distinct from this site's Bonus Tax Calculator (which nets a KNOWN gross
// bonus down to take-home pay). This solves the reverse, very commonly
// searched problem: "I want the employee to receive $X after standard
// withholding — what gross bonus do I need to pay?" Uses the same standard
// flat withholding assumption most employers apply to bonuses below the
// $1,000,000 year-to-date supplemental-wage threshold: the 22% federal
// flat supplemental rate plus FICA (6.2% Social Security + 1.45%
// Medicare) — 29.65% combined. State and local tax are not included (this
// is a general/global tool); see this site's state-specific tools for a
// state-inclusive figure.
const FEDERAL_FLAT_SUPPLEMENTAL_RATE = 0.22;
const SOCIAL_SECURITY_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const COMBINED_STANDARD_WITHHOLDING_RATE = FEDERAL_FLAT_SUPPLEMENTAL_RATE + SOCIAL_SECURITY_RATE + MEDICARE_RATE;

export const bonusCalculator: CustomCalculator = (values) => {
  const desiredNetBonus = Math.max(0, safeNumber(values.desiredNetBonus));
  const requiredGrossBonus = desiredNetBonus / (1 - COMBINED_STANDARD_WITHHOLDING_RATE);
  const federalWithholding = requiredGrossBonus * FEDERAL_FLAT_SUPPLEMENTAL_RATE;
  const ficaWithholding = requiredGrossBonus * (SOCIAL_SECURITY_RATE + MEDICARE_RATE);
  const totalWithholding = federalWithholding + ficaWithholding;

  return {
    requiredGrossBonus: Math.round(requiredGrossBonus * 100) / 100,
    federalWithholding: Math.round(federalWithholding * 100) / 100,
    ficaWithholding: Math.round(ficaWithholding * 100) / 100,
    totalWithholding: Math.round(totalWithholding * 100) / 100,
  };
};

export const financeSalaryIncomeCustomCalculators: Record<string, CustomCalculator> = {
  "salary-calculator": salaryCalculator,
  "hourly-to-salary-calculator": hourlyToSalaryCalculator,
  "salary-to-hourly-calculator": salaryToHourlyCalculator,
  "overtime-calculator": overtimeCalculator,
  "paycheck-calculator": paycheckCalculator,
  "commission-calculator": commissionCalculator,
  "bonus-calculator": bonusCalculator,
};
