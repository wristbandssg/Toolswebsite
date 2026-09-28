/**
 * Batch: "Salary & Income Calculators" sub-batch D (Premium Pay, Bonus,
 * Commission & Paychecks, 10 tools). Part of the Salary & Income build-out
 * — see calc-engine-salary-conversions.ts for the full list of 9
 * sub-batches. Filed under Finance Calculators > Salary & Income.
 *
 * 2026 US payroll figures used by bonusAfterTaxCalculator: federal
 * supplemental withholding 22% (37% on supplemental wages over $1 million),
 * Social Security 6.2% up to the $184,500 wage base (SSA), Medicare 1.45%
 * plus 0.9% Additional Medicare withholding on wages over $200,000.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - shiftDifferentialCalculator: a differential in dollars OR percent on
 *    some of your hours.
 *  - nightShiftPayCalculator: a night differential that ALSO raises your
 *    overtime rate (FLSA "regular rate" rule).
 *  - weekendPayCalculator: separate Saturday and Sunday rates.
 *  - holidayPayCalculator: holiday hours worked at a premium plus paid
 *    holiday hours not worked.
 *  - bonusAfterTaxCalculator: what you keep from a bonus under US
 *    supplemental withholding. (bonus-calculator works backwards from the
 *    net you want; bonus-tax-calculator is under Tax Calculators.)
 *  - commissionRateCalculator: the rate you earned, and the sales needed to
 *    hit a commission target.
 *  - baseSalaryPlusCommissionCalculator: a yearly pay package — base + commission
 *    on annual sales — and the share of pay that's at risk.
 *  - salesCommissionCalculator: TIERED commission with an accelerator above
 *    quota.
 *  - grossPayCalculator: one pay period's gross from regular, overtime,
 *    tips and commission. (salary-calculator starts from a salary.)
 *  - netPayCalculator: a paycheck's net after the dollar deductions on your
 *    pay stub.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-salary-premiums-commission-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const SUPPLEMENTAL_RATE_2026 = 0.22;
const SUPPLEMENTAL_RATE_OVER_1M = 0.37;
const SS_RATE = 0.062;
const SS_WAGE_BASE_2026 = 184500;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLD = 200000;

// --- 1. Shift Differential Calculator ($ or %) ---------------------------
export const shiftDifferentialCalculator: CustomCalculator = (values) => {
  const baseRate = Math.max(0, safeNumber(values.baseRate, 20));
  // 1 = dollars per hour, 2 = percent of base
  const differentialType = Math.round(safeNumber(values.differentialType, 1)) === 2 ? 2 : 1;
  const differential = Math.max(0, safeNumber(values.differential, 2));
  const differentialHours = Math.max(0, safeNumber(values.differentialHours, 24));
  const totalHours = Math.max(differentialHours, safeNumber(values.totalHours, 40));

  const premium = differentialType === 1 ? differential : (baseRate * differential) / 100;
  const extra = premium * differentialHours;

  return {
    shiftRate: round2(baseRate + premium),
    extraPerWeek: round2(extra),
    totalWeeklyPay: round2(baseRate * totalHours + extra),
    extraPerYear: round2(extra * 52),
  };
};

// --- 2. Night Shift Pay Calculator (differential raises OT rate) ---------
export const nightShiftPayCalculator: CustomCalculator = (values) => {
  const baseRate = Math.max(0, safeNumber(values.baseRate, 21));
  const nightDifferential = Math.max(0, safeNumber(values.nightDifferential, 3));
  const nightHours = Math.max(0, safeNumber(values.nightHours, 30));
  const totalHours = Math.max(nightHours, safeNumber(values.totalHours, 45));

  // Straight-time pay for all hours, then the regular rate is that ÷ hours;
  // overtime owes an extra half of the regular rate for hours over 40.
  const straight = baseRate * totalHours + nightDifferential * nightHours;
  const regularRate = totalHours > 0 ? straight / totalHours : 0;
  const otPremium = Math.max(0, totalHours - 40) * regularRate * 0.5;

  return {
    totalWeeklyPay: round2(straight + otPremium),
    nightDifferentialPay: round2(nightDifferential * nightHours),
    regularRateForOvertime: round2(regularRate),
    overtimePremium: round2(otPremium),
    extraNightPayPerYear: round2(nightDifferential * nightHours * 52),
  };
};

// --- 3. Weekend Pay Calculator (Saturday / Sunday rates) -------------------
export const weekendPayCalculator: CustomCalculator = (values) => {
  const baseRate = Math.max(0, safeNumber(values.baseRate, 18));
  const weekdayHours = Math.max(0, safeNumber(values.weekdayHours, 32));
  const saturdayHours = Math.max(0, safeNumber(values.saturdayHours, 8));
  const saturdayPremiumPercent = Math.max(0, safeNumber(values.saturdayPremiumPercent, 25));
  const sundayHours = Math.max(0, safeNumber(values.sundayHours, 4));
  const sundayPremiumPercent = Math.max(0, safeNumber(values.sundayPremiumPercent, 50));

  const sat = saturdayHours * baseRate * (1 + saturdayPremiumPercent / 100);
  const sun = sundayHours * baseRate * (1 + sundayPremiumPercent / 100);
  const total = weekdayHours * baseRate + sat + sun;
  const extra = sat + sun - (saturdayHours + sundayHours) * baseRate;

  return {
    totalWeeklyPay: round2(total),
    saturdayPay: round2(sat),
    sundayPay: round2(sun),
    extraFromWeekendRates: round2(extra),
    extraPerYear: round2(extra * 52),
  };
};

// --- 4. Holiday Pay Calculator -----------------------------------------------
export const holidayPayCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 22));
  const holidayHoursWorked = Math.max(0, safeNumber(values.holidayHoursWorked, 8));
  const holidayMultiplier = Math.max(1, safeNumber(values.holidayMultiplier, 1.5));
  const paidHolidayHoursNotWorked = Math.max(0, safeNumber(values.paidHolidayHoursNotWorked, 8));

  const worked = holidayHoursWorked * hourlyRate * holidayMultiplier;
  const paidOff = paidHolidayHoursNotWorked * hourlyRate;

  return {
    totalHolidayPay: round2(worked + paidOff),
    payForHoursWorked: round2(worked),
    paidHolidayOffPay: round2(paidOff),
    premiumAboveNormalRate: round2(holidayHoursWorked * hourlyRate * (holidayMultiplier - 1)),
  };
};

// --- 5. Bonus After Tax Calculator (2026 US supplemental method) ----------
export const bonusAfterTaxCalculator: CustomCalculator = (values) => {
  const bonus = Math.max(0, safeNumber(values.bonus, 10000));
  const wagesSoFarThisYear = Math.max(0, safeNumber(values.wagesSoFarThisYear, 60000));
  const stateRatePercent = Math.max(0, safeNumber(values.stateRatePercent, 5));

  const federal = SUPPLEMENTAL_RATE_2026 * Math.min(bonus, 1e6) + SUPPLEMENTAL_RATE_OVER_1M * Math.max(0, bonus - 1e6);
  const socialSecurity = SS_RATE * Math.max(0, Math.min(bonus, SS_WAGE_BASE_2026 - wagesSoFarThisYear));
  const additionalBase = Math.max(0, wagesSoFarThisYear + bonus - Math.max(ADDITIONAL_MEDICARE_THRESHOLD, wagesSoFarThisYear));
  const medicare = MEDICARE_RATE * bonus + ADDITIONAL_MEDICARE_RATE * additionalBase;
  const state = (bonus * stateRatePercent) / 100;
  const net = bonus - federal - socialSecurity - medicare - state;

  return {
    bonusAfterTax: round2(net),
    federalWithholding: round2(federal),
    socialSecurity: round2(socialSecurity),
    medicare: round2(medicare),
    stateWithholding: round2(state),
    keepPercent: bonus > 0 ? round2((net / bonus) * 100) : 0,
  };
};

// --- 6. Commission Rate Calculator --------------------------------------------
export const commissionRateCalculator: CustomCalculator = (values) => {
  const commissionEarned = Math.max(0, safeNumber(values.commissionEarned, 4500));
  const salesAmount = Math.max(0, safeNumber(values.salesAmount, 90000));
  const targetCommission = Math.max(0, safeNumber(values.targetCommission, 6000));

  const rate = salesAmount > 0 ? commissionEarned / salesAmount : 0;

  return {
    commissionRatePercent: round2(rate * 100),
    salesNeededForTarget: rate > 0 ? round2(targetCommission / rate) : 0,
    commissionPer1000Sold: round2(rate * 1000),
    extraSalesNeeded: rate > 0 ? round2(Math.max(0, targetCommission / rate - salesAmount)) : 0,
  };
};

// --- 7. Base Salary Plus Commission Calculator ----------------------------
export const baseSalaryPlusCommissionCalculator: CustomCalculator = (values) => {
  const baseSalary = Math.max(0, safeNumber(values.baseSalary, 45000));
  const annualSales = Math.max(0, safeNumber(values.annualSales, 600000));
  const commissionRatePercent = Math.max(0, safeNumber(values.commissionRatePercent, 5));

  const commission = (annualSales * commissionRatePercent) / 100;
  const total = baseSalary + commission;

  return {
    totalAnnualPay: round2(total),
    annualCommission: round2(commission),
    monthlyAverage: round2(total / 12),
    shareFromCommissionPercent: total > 0 ? round2((commission / total) * 100) : 0,
  };
};

// --- 8. Sales Commission Calculator (tiered, accelerator) ------------------
export const salesCommissionCalculator: CustomCalculator = (values) => {
  const sales = Math.max(0, safeNumber(values.sales, 150000));
  const quota = Math.max(0, safeNumber(values.quota, 100000));
  const rateUpToQuotaPercent = Math.max(0, safeNumber(values.rateUpToQuotaPercent, 6));
  const rateAboveQuotaPercent = Math.max(0, safeNumber(values.rateAboveQuotaPercent, 10));

  const below = Math.min(sales, quota) * (rateUpToQuotaPercent / 100);
  const above = Math.max(0, sales - quota) * (rateAboveQuotaPercent / 100);
  const total = below + above;

  return {
    totalCommission: round2(total),
    commissionUpToQuota: round2(below),
    commissionAboveQuota: round2(above),
    quotaAttainmentPercent: quota > 0 ? round2((sales / quota) * 100) : 0,
    effectiveRatePercent: sales > 0 ? round2((total / sales) * 100) : 0,
  };
};

// --- 9. Gross Pay Calculator (one pay period) --------------------------------
export const grossPayCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 20));
  const regularHours = Math.max(0, safeNumber(values.regularHours, 80));
  const overtimeHours = Math.max(0, safeNumber(values.overtimeHours, 6));
  const tips = Math.max(0, safeNumber(values.tips, 150));
  const commissionOrBonus = Math.max(0, safeNumber(values.commissionOrBonus, 0));

  const regular = hourlyRate * regularHours;
  const overtime = hourlyRate * 1.5 * overtimeHours;
  const gross = regular + overtime + tips + commissionOrBonus;

  return {
    grossPay: round2(gross),
    regularPay: round2(regular),
    overtimePay: round2(overtime),
    otherPay: round2(tips + commissionOrBonus),
  };
};

// --- 10. Net Pay Calculator (pay-stub deductions) ---------------------------
export const netPayCalculator: CustomCalculator = (values) => {
  const grossPay = Math.max(0, safeNumber(values.grossPay, 2500));
  const federalTax = Math.max(0, safeNumber(values.federalTax, 250));
  const stateTax = Math.max(0, safeNumber(values.stateTax, 100));
  const socialSecurityAndMedicare = Math.max(0, safeNumber(values.socialSecurityAndMedicare, 191.25));
  const retirement = Math.max(0, safeNumber(values.retirement, 125));
  const healthInsurance = Math.max(0, safeNumber(values.healthInsurance, 90));
  const otherDeductions = Math.max(0, safeNumber(values.otherDeductions, 20));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 26));

  const deductions = federalTax + stateTax + socialSecurityAndMedicare + retirement + healthInsurance + otherDeductions;
  const net = grossPay - deductions;

  return {
    netPay: round2(net),
    totalDeductions: round2(deductions),
    takeHomePercent: grossPay > 0 ? round2((net / grossPay) * 100) : 0,
    netPayPerYear: round2(net * periodsPerYear),
    taxesPerYear: round2((federalTax + stateTax + socialSecurityAndMedicare) * periodsPerYear),
  };
};

export const salaryPremiumsCommissionCustomCalculators: Record<string, CustomCalculator> = {
  "shift-differential-calculator": shiftDifferentialCalculator,
  "night-shift-pay-calculator": nightShiftPayCalculator,
  "weekend-pay-calculator": weekendPayCalculator,
  "holiday-pay-calculator": holidayPayCalculator,
  "bonus-after-tax-calculator": bonusAfterTaxCalculator,
  "commission-rate-calculator": commissionRateCalculator,
  "base-salary-plus-commission-calculator": baseSalaryPlusCommissionCalculator,
  "sales-commission-calculator": salesCommissionCalculator,
  "gross-pay-calculator": grossPayCalculator,
  "net-pay-calculator": netPayCalculator,
};
