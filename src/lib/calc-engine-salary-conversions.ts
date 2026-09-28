/**
 * Batch: "Salary & Income Calculators" sub-batch A (Pay Conversions, 11
 * tools). Part of the Salary & Income tool-list build-out — 91 tools in the
 * source list, 8 skipped as exact-slug duplicates (salary-calculator,
 * take-home-pay-calculator, hourly-to-salary-calculator, salary-to-hourly-
 * calculator, overtime-calculator, paycheck-calculator, bonus-calculator,
 * commission-calculator), 83 built across 9 sub-batches, all filed under
 * Finance Calculators > Salary & Income Calculators (salary-income-
 * calculators):
 *  - calc-engine-salary-conversions.ts (this file)
 *  - calc-engine-salary-period-conversions.ts
 *  - calc-engine-salary-hours-overtime.ts
 *  - calc-engine-salary-premiums-commission.ts
 *  - calc-engine-salary-raises.ts
 *  - calc-engine-salary-income-sources.ts
 *  - calc-engine-salary-self-employed.ts
 *  - calc-engine-salary-rates.ts
 *  - calc-engine-salary-deductions-net.ts
 *
 * Like the existing salary tools, these are GROSS-pay conversions unless a
 * tool asks for a tax rate. Every near-namesake answers a different
 * question (none repeats salary-calculator, which converts an annual salary
 * into a per-period gross):
 *  - monthlySalaryCalculator: monthly base, monthly including a yearly
 *    bonus, and monthly after a tax rate you enter.
 *  - weeklySalaryCalculator: weekly pay when you're only paid for the weeks
 *    you work (seasonal/unpaid time off) vs the 52-week average.
 *  - biweeklySalaryCalculator: 26 paychecks — and the two "extra" 3-check
 *    months a year.
 *  - semiMonthlySalaryCalculator: 24 paychecks vs biweekly, and the hours
 *    each semi-monthly check covers.
 *  - dailySalaryCalculator: pay per WORKING day after holidays and PTO, vs
 *    per paid day.
 *  - hourlyWageCalculator: the hourly wage behind any pay over any period.
 *  - annualSalaryCalculator: annual salary from one paycheck at any pay
 *    frequency.
 *  - salaryConversionCalculator: one amount at any frequency converted to
 *    EVERY other frequency at once.
 *  - hourlyToMonthlySalaryCalculator: the correct 52-weeks÷12 monthly figure
 *    vs the common "× 4 weeks" mistake.
 *  - hourlyToWeeklySalaryCalculator: a week's pay including overtime hours.
 *  - hourlyToAnnualSalaryCalculator: annual pay with paid vs unpaid time off.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-salary-conversions-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Monthly Salary Calculator ----------------------------------------------
export const monthlySalaryCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 60000));
  const annualBonus = Math.max(0, safeNumber(values.annualBonus, 5000));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 22)));

  const base = annualSalary / 12;
  const withBonus = (annualSalary + annualBonus) / 12;

  return {
    monthlyBaseSalary: round2(base),
    monthlyIncludingBonus: round2(withBonus),
    monthlyAfterTax: round2(withBonus * (1 - taxRatePercent / 100)),
    annualTotal: round2(annualSalary + annualBonus),
  };
};

// --- 2. Weekly Salary Calculator (weeks actually paid) ---------------------
export const weeklySalaryCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 52000));
  const paidWeeks = Math.min(53, Math.max(1, safeNumber(values.paidWeeks, 48)));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));

  const perPaidWeek = annualSalary / paidWeeks;

  return {
    weeklyPayWhenWorking: round2(perPaidWeek),
    averagePerCalendarWeek: round2(annualSalary / 52),
    hourlyEquivalent: hoursPerWeek > 0 ? round2(perPaidWeek / hoursPerWeek) : 0,
    unpaidWeeks: round2(Math.max(0, 52 - paidWeeks)),
  };
};

// --- 3. Biweekly Salary Calculator (3-paycheck months) -----------------------
export const biweeklySalaryCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 65000));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 20)));

  const perCheck = annualSalary / 26;
  const net = perCheck * (1 - taxRatePercent / 100);

  return {
    grossPerPaycheck: round2(perCheck),
    netPerPaycheck: round2(net),
    annualNet: round2(net * 26),
    // Budgeting on 2 checks a month leaves the 2 "extra" checks as a bonus.
    extraFromThreePaycheckMonths: round2(net * 2),
    averageMonthlyNet: round2((net * 26) / 12),
  };
};

// --- 4. Semi-Monthly Salary Calculator (24 checks) --------------------------
export const semiMonthlySalaryCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 72000));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));

  const semi = annualSalary / 24;
  const biweekly = annualSalary / 26;
  const hoursPerCheck = (hoursPerWeek * 52) / 24;

  return {
    semiMonthlyPaycheck: round2(semi),
    biweeklyPaycheckForComparison: round2(biweekly),
    differencePerCheck: round2(semi - biweekly),
    hoursCoveredPerCheck: round2(hoursPerCheck),
    hourlyEquivalent: hoursPerCheck > 0 ? round2(semi / hoursPerCheck) : 0,
  };
};

// --- 5. Daily Salary Calculator (per working day) -------------------------
export const dailySalaryCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 60000));
  const workDaysPerWeek = Math.min(7, Math.max(1, safeNumber(values.workDaysPerWeek, 5)));
  const paidHolidays = Math.max(0, safeNumber(values.paidHolidays, 10));
  const paidTimeOffDays = Math.max(0, safeNumber(values.paidTimeOffDays, 15));

  const paidDays = workDaysPerWeek * 52;
  const workedDays = Math.max(1, paidDays - paidHolidays - paidTimeOffDays);

  return {
    payPerDayWorked: round2(annualSalary / workedDays),
    payPerPaidDay: round2(annualSalary / paidDays),
    daysActuallyWorked: round2(workedDays),
    valueOfPaidDaysOff: round2((annualSalary / paidDays) * (paidHolidays + paidTimeOffDays)),
  };
};

// --- 6. Hourly Wage Calculator (from any pay and hours) -------------------
export const hourlyWageCalculator: CustomCalculator = (values) => {
  const grossPay = Math.max(0, safeNumber(values.grossPay, 2400));
  const hoursWorked = Math.max(0, safeNumber(values.hoursWorked, 80));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));

  const hourly = hoursWorked > 0 ? grossPay / hoursWorked : 0;

  return {
    hourlyWage: round2(hourly),
    weeklyAtThisRate: round2(hourly * hoursPerWeek),
    annualAtThisRate: round2(hourly * hoursPerWeek * 52),
    minutesPerDollar: hourly > 0 ? round2(60 / hourly) : 0,
  };
};

// --- 7. Annual Salary Calculator (from one paycheck) ----------------------
export const annualSalaryCalculator: CustomCalculator = (values) => {
  const payPerPeriod = Math.max(0, safeNumber(values.payPerPeriod, 2500));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 26));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));

  const annual = payPerPeriod * periodsPerYear;

  return {
    annualSalary: round2(annual),
    monthlyEquivalent: round2(annual / 12),
    weeklyEquivalent: round2(annual / 52),
    hourlyEquivalent: hoursPerWeek > 0 ? round2(annual / (hoursPerWeek * 52)) : 0,
  };
};

// --- 8. Salary Conversion Calculator (any frequency → all) ----------------
export const salaryConversionCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 25));
  // Periods per year of the amount entered: 0 = hourly, −1 = daily, else N a year (1 = yearly).
  const frequency = safeNumber(values.frequency, 0);
  const hoursPerWeek = Math.max(0.1, safeNumber(values.hoursPerWeek, 40));
  const daysPerWeek = Math.min(7, Math.max(1, safeNumber(values.daysPerWeek, 5)));

  const annual =
    frequency === 0 ? amount * hoursPerWeek * 52 : frequency === -1 ? amount * daysPerWeek * 52 : amount * Math.max(1, frequency);

  return {
    annual: round2(annual),
    monthly: round2(annual / 12),
    semiMonthly: round2(annual / 24),
    biweekly: round2(annual / 26),
    weekly: round2(annual / 52),
    daily: round2(annual / (daysPerWeek * 52)),
    hourly: round2(annual / (hoursPerWeek * 52)),
  };
};

// --- 9. Hourly to Monthly Salary Calculator (the ×4 mistake) -------------
export const hourlyToMonthlySalaryCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 20));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));

  const correct = (hourlyRate * hoursPerWeek * 52) / 12;
  const naive = hourlyRate * hoursPerWeek * 4;

  return {
    monthlySalary: round2(correct),
    fourWeekEstimate: round2(naive),
    underestimatedBy: round2(correct - naive),
    averageHoursPerMonth: round2((hoursPerWeek * 52) / 12),
  };
};

// --- 10. Hourly to Weekly Salary Calculator (with overtime) --------------
export const hourlyToWeeklySalaryCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 22));
  const regularHours = Math.max(0, safeNumber(values.regularHours, 40));
  const overtimeHours = Math.max(0, safeNumber(values.overtimeHours, 5));
  const overtimeMultiplier = Math.max(1, safeNumber(values.overtimeMultiplier, 1.5));

  const regular = hourlyRate * regularHours;
  const overtime = hourlyRate * overtimeMultiplier * overtimeHours;

  return {
    weeklyPay: round2(regular + overtime),
    regularPay: round2(regular),
    overtimePay: round2(overtime),
    annualIfEveryWeek: round2((regular + overtime) * 52),
  };
};

// --- 11. Hourly to Annual Salary Calculator (paid vs unpaid time off) ----
export const hourlyToAnnualSalaryCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 25));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));
  const paidWeeksOff = Math.max(0, safeNumber(values.paidWeeksOff, 2));
  const unpaidWeeksOff = Math.max(0, safeNumber(values.unpaidWeeksOff, 1));

  const full = hourlyRate * hoursPerWeek * 52;
  const paidWeeks = Math.max(0, 52 - unpaidWeeksOff);
  const annual = hourlyRate * hoursPerWeek * paidWeeks;

  return {
    annualSalary: round2(annual),
    fullYearAt52Weeks: round2(full),
    lostToUnpaidTime: round2(full - annual),
    valueOfPaidTimeOff: round2(hourlyRate * hoursPerWeek * Math.min(paidWeeksOff, paidWeeks)),
  };
};

export const salaryConversionsCustomCalculators: Record<string, CustomCalculator> = {
  "monthly-salary-calculator": monthlySalaryCalculator,
  "weekly-salary-calculator": weeklySalaryCalculator,
  "biweekly-salary-calculator": biweeklySalaryCalculator,
  "semi-monthly-salary-calculator": semiMonthlySalaryCalculator,
  "daily-salary-calculator": dailySalaryCalculator,
  "hourly-wage-calculator": hourlyWageCalculator,
  "annual-salary-calculator": annualSalaryCalculator,
  "salary-conversion-calculator": salaryConversionCalculator,
  "hourly-to-monthly-salary-calculator": hourlyToMonthlySalaryCalculator,
  "hourly-to-weekly-salary-calculator": hourlyToWeeklySalaryCalculator,
  "hourly-to-annual-salary-calculator": hourlyToAnnualSalaryCalculator,
};
