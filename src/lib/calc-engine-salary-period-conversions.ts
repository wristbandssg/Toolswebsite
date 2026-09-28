/**
 * Batch: "Salary & Income Calculators" sub-batch B (Period Conversions &
 * Rates, 10 tools). Part of the Salary & Income build-out — see
 * calc-engine-salary-conversions.ts for the full list of 9 sub-batches.
 * Filed under Finance Calculators > Salary & Income Calculators.
 *
 * Each "X to Y" tool carries the real-world wrinkle that makes that
 * particular conversion tricky, so none is a copy of another:
 *  - monthlyToAnnualSalaryCalculator: 12, 13 or 14 monthly salaries a year
 *    (13th/14th-month pay is standard in many countries).
 *  - weeklyToAnnualSalaryCalculator: only the weeks you actually work
 *    (seasonal or contract work).
 *  - biweeklyToAnnualSalaryCalculator: 26 checks — or 27 in years with an
 *    extra payday.
 *  - annualToMonthlySalaryCalculator: splitting a salary into 12, 13 or 14
 *    payments.
 *  - annualToWeeklySalaryCalculator: weekly pay when the year has 52 or 53
 *    paydays.
 *  - annualToBiweeklySalaryCalculator: what each check shrinks to if your
 *    employer divides the salary by 27 in a 27-payday year.
 *  - salaryPerDayCalculator: daily rate for a given month's working days,
 *    and the deduction for unpaid days off.
 *  - salaryPerHourCalculator: the real hourly rate for a salaried worker
 *    who works longer than contracted hours.
 *  - equivalentSalaryCalculator: the salary needed in another city with a
 *    different cost of living.
 *  - annualIncomeCalculator: yearly income for an application — monthly
 *    pay plus other regular income and one-off yearly amounts.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-salary-period-conversions-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Monthly to Annual Salary (12/13/14 salaries) ---------------------
export const monthlyToAnnualSalaryCalculator: CustomCalculator = (values) => {
  const monthlySalary = Math.max(0, safeNumber(values.monthlySalary, 4000));
  const salariesPerYear = Math.max(12, safeNumber(values.salariesPerYear, 14));

  const annual = monthlySalary * salariesPerYear;

  return {
    annualSalary: round2(annual),
    extraFrom13thAnd14thMonth: round2(monthlySalary * (salariesPerYear - 12)),
    averagePerCalendarMonth: round2(annual / 12),
    weeklyEquivalent: round2(annual / 52),
  };
};

// --- 2. Weekly to Annual Salary (weeks actually worked) -------------------
export const weeklyToAnnualSalaryCalculator: CustomCalculator = (values) => {
  const weeklyPay = Math.max(0, safeNumber(values.weeklyPay, 900));
  const weeksWorked = Math.min(53, Math.max(0, safeNumber(values.weeksWorked, 48)));

  const annual = weeklyPay * weeksWorked;

  return {
    annualIncome: round2(annual),
    fullYearAt52Weeks: round2(weeklyPay * 52),
    averageMonthlyIncome: round2(annual / 12),
    averagePerCalendarWeek: round2(annual / 52),
  };
};

// --- 3. Biweekly to Annual Salary (26 or 27 paydays) ----------------------
export const biweeklyToAnnualSalaryCalculator: CustomCalculator = (values) => {
  const biweeklyPay = Math.max(0, safeNumber(values.biweeklyPay, 2300));
  const paydaysThisYear = safeNumber(values.paydaysThisYear, 26) >= 27 ? 27 : 26;

  const annual = biweeklyPay * paydaysThisYear;

  return {
    annualIncome: round2(annual),
    monthlyAverage: round2(annual / 12),
    twoCheckMonthIncome: round2(biweeklyPay * 2),
    extraFromTheExtraPayday: round2(paydaysThisYear === 27 ? biweeklyPay : 0),
  };
};

// --- 4. Annual to Monthly Salary (12/13/14 payments) ----------------------
export const annualToMonthlySalaryCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 54000));
  const paymentsPerYear = Math.max(12, safeNumber(values.paymentsPerYear, 14));

  const perPayment = annualSalary / paymentsPerYear;

  return {
    regularMonthlyPayment: round2(perPayment),
    monthlyIfPaidIn12: round2(annualSalary / 12),
    differencePerMonth: round2(annualSalary / 12 - perPayment),
    extraPaymentsTotal: round2(perPayment * (paymentsPerYear - 12)),
  };
};

// --- 5. Annual to Weekly Salary (52 vs 53 paydays) ------------------------
export const annualToWeeklySalaryCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 52000));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));

  const weekly = annualSalary / 52;

  return {
    weeklyPay: round2(weekly),
    weeklyIfSplitOver53: round2(annualSalary / 53),
    extraIfPaid53Weeks: round2(weekly),
    hourlyEquivalent: hoursPerWeek > 0 ? round2(weekly / hoursPerWeek) : 0,
  };
};

// --- 6. Annual to Biweekly Salary (26 vs 27 paydays) ----------------------
export const annualToBiweeklySalaryCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 78000));

  const on26 = annualSalary / 26;
  const on27 = annualSalary / 27;

  return {
    biweeklyPaycheck: round2(on26),
    paycheckIfDividedBy27: round2(on27),
    smallerByPerCheck: round2(on26 - on27),
    paidOver27ChecksAt26Rate: round2(on26 * 27),
  };
};

// --- 7. Salary per Day Calculator (month's working days) -----------------
export const salaryPerDayCalculator: CustomCalculator = (values) => {
  const monthlySalary = Math.max(0, safeNumber(values.monthlySalary, 4500));
  const workingDaysInMonth = Math.max(1, Math.round(safeNumber(values.workingDaysInMonth, 22)));
  const unpaidDaysOff = Math.max(0, Math.round(safeNumber(values.unpaidDaysOff, 2)));

  const daily = monthlySalary / workingDaysInMonth;
  const deduction = daily * Math.min(unpaidDaysOff, workingDaysInMonth);

  return {
    dailyRateThisMonth: round2(daily),
    deductionForUnpaidDays: round2(deduction),
    payThisMonth: round2(monthlySalary - deduction),
    calendarDayRate: round2((monthlySalary * 12) / 365),
  };
};

// --- 8. Salary per Hour Calculator (real hours worked) -------------------
export const salaryPerHourCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 75000));
  const contractedHoursPerWeek = Math.max(0.1, safeNumber(values.contractedHoursPerWeek, 40));
  const actualHoursPerWeek = Math.max(0.1, safeNumber(values.actualHoursPerWeek, 48));
  const weeksWorked = Math.max(1, safeNumber(values.weeksWorked, 48));

  const contracted = annualSalary / (contractedHoursPerWeek * 52);
  const real = annualSalary / (actualHoursPerWeek * weeksWorked);

  return {
    realHourlyRate: round2(real),
    contractedHourlyRate: round2(contracted),
    differencePerHour: round2(contracted - real),
    unpaidExtraHoursPerYear: round2(Math.max(0, actualHoursPerWeek - contractedHoursPerWeek) * weeksWorked),
  };
};

// --- 9. Equivalent Salary Calculator (cost of living) --------------------
export const equivalentSalaryCalculator: CustomCalculator = (values) => {
  const currentSalary = Math.max(0, safeNumber(values.currentSalary, 70000));
  const currentCityIndex = Math.max(1, safeNumber(values.currentCityIndex, 100));
  const newCityIndex = Math.max(1, safeNumber(values.newCityIndex, 125));
  const offeredSalary = Math.max(0, safeNumber(values.offeredSalary, 82000));

  const equivalent = (currentSalary * newCityIndex) / currentCityIndex;

  return {
    equivalentSalary: round2(equivalent),
    costOfLivingChangePercent: round2((newCityIndex / currentCityIndex - 1) * 100),
    offerAboveOrBelowEquivalent: round2(offeredSalary - equivalent),
    offerWorthInCurrentCity: round2((offeredSalary * currentCityIndex) / newCityIndex),
  };
};

// --- 10. Annual Income Calculator (for applications) ---------------------
export const annualIncomeCalculator: CustomCalculator = (values) => {
  const monthlyGrossPay = Math.max(0, safeNumber(values.monthlyGrossPay, 5000));
  const otherMonthlyIncome = Math.max(0, safeNumber(values.otherMonthlyIncome, 400));
  const yearlyBonusOrOneOffs = Math.max(0, safeNumber(values.yearlyBonusOrOneOffs, 3000));

  const fromPay = monthlyGrossPay * 12;
  const other = otherMonthlyIncome * 12;
  const total = fromPay + other + yearlyBonusOrOneOffs;

  return {
    annualIncome: round2(total),
    fromEmployment: round2(fromPay + yearlyBonusOrOneOffs),
    fromOtherSources: round2(other),
    averageMonthlyIncome: round2(total / 12),
  };
};

export const salaryPeriodConversionsCustomCalculators: Record<string, CustomCalculator> = {
  "monthly-to-annual-salary-calculator": monthlyToAnnualSalaryCalculator,
  "weekly-to-annual-salary-calculator": weeklyToAnnualSalaryCalculator,
  "biweekly-to-annual-salary-calculator": biweeklyToAnnualSalaryCalculator,
  "annual-to-monthly-salary-calculator": annualToMonthlySalaryCalculator,
  "annual-to-weekly-salary-calculator": annualToWeeklySalaryCalculator,
  "annual-to-biweekly-salary-calculator": annualToBiweeklySalaryCalculator,
  "salary-per-day-calculator": salaryPerDayCalculator,
  "salary-per-hour-calculator": salaryPerHourCalculator,
  "equivalent-salary-calculator": equivalentSalaryCalculator,
  "annual-income-calculator": annualIncomeCalculator,
};
