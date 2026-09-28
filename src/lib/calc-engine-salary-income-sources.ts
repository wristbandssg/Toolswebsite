/**
 * Batch: "Salary & Income Calculators" sub-batch F (Income Totals &
 * Averages, 12 tools). Part of the Salary & Income build-out — see
 * calc-engine-salary-conversions.ts for the full list of 9 sub-batches.
 * Filed under Finance Calculators > Salary & Income Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - incomeCalculator: total income from salary, bonus and other income —
 *    gross AND after an average tax rate, per year/month/week.
 *  - monthlyIncomeCalculator: turns income paid on DIFFERENT schedules
 *    (weekly, biweekly, twice-monthly, monthly, yearly) into one monthly
 *    figure.
 *  - weeklyIncomeCalculator: an hourly job's weekly income including tips.
 *  - dailyIncomeCalculator: income per working day vs per calendar day.
 *  - householdIncomeCalculator: everyone in the household — total and per
 *    person.
 *  - combinedIncomeCalculator: two applicants' combined income and their
 *    debt-to-income ratio (for a loan or lease).
 *  - partTimeIncomeCalculator: part-time pay and how it compares with the
 *    same job full-time.
 *  - fullTimeIncomeCalculator: full-time salary PLUS the value of benefits.
 *  - multipleIncomeStreamsCalculator: up to four income streams — total,
 *    blended hourly rate and dependence on the biggest one.
 *  - yearToDateIncomeCalculator: projecting the full year from year-to-date
 *    pay.
 *  - averageMonthlyIncomeCalculator: average, lowest and highest of six
 *    months of irregular income, and a safe budget figure.
 *  - averageAnnualIncomeCalculator: multi-year average (lenders often use 2
 *    years for self-employed income) and the trend.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-salary-income-sources-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Income Calculator ------------------------------------------------------
export const incomeCalculator: CustomCalculator = (values) => {
  const salary = Math.max(0, safeNumber(values.salary, 58000));
  const bonus = Math.max(0, safeNumber(values.bonus, 3000));
  const otherIncome = Math.max(0, safeNumber(values.otherIncome, 2400));
  const averageTaxRatePercent = Math.min(100, Math.max(0, safeNumber(values.averageTaxRatePercent, 18)));

  const gross = salary + bonus + otherIncome;
  const net = gross * (1 - averageTaxRatePercent / 100);

  return {
    grossAnnualIncome: round2(gross),
    netAnnualIncome: round2(net),
    grossMonthly: round2(gross / 12),
    netMonthly: round2(net / 12),
    netWeekly: round2(net / 52),
  };
};

// --- 2. Monthly Income Calculator (mixed pay schedules) -----------------
export const monthlyIncomeCalculator: CustomCalculator = (values) => {
  const weeklyIncome = Math.max(0, safeNumber(values.weeklyIncome, 0));
  const biweeklyIncome = Math.max(0, safeNumber(values.biweeklyIncome, 1800));
  const semiMonthlyIncome = Math.max(0, safeNumber(values.semiMonthlyIncome, 0));
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 600));
  const yearlyIncome = Math.max(0, safeNumber(values.yearlyIncome, 1200));

  const monthly =
    (weeklyIncome * 52) / 12 + (biweeklyIncome * 26) / 12 + semiMonthlyIncome * 2 + monthlyIncome + yearlyIncome / 12;

  return {
    totalMonthlyIncome: round2(monthly),
    annualIncome: round2(monthly * 12),
    weeklyAverage: round2((monthly * 12) / 52),
  };
};

// --- 3. Weekly Income Calculator (hourly + tips) ----------------------------
export const weeklyIncomeCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 15));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 32));
  const tipsPerWeek = Math.max(0, safeNumber(values.tipsPerWeek, 180));
  const otherWeekly = Math.max(0, safeNumber(values.otherWeekly, 0));

  const weekly = hourlyRate * hoursPerWeek + tipsPerWeek + otherWeekly;

  return {
    weeklyIncome: round2(weekly),
    monthlyIncome: round2((weekly * 52) / 12),
    annualIncome: round2(weekly * 52),
    effectiveHourlyIncludingTips: hoursPerWeek > 0 ? round2(weekly / hoursPerWeek) : 0,
  };
};

// --- 4. Daily Income Calculator ------------------------------------------------
export const dailyIncomeCalculator: CustomCalculator = (values) => {
  const annualIncome = Math.max(0, safeNumber(values.annualIncome, 65000));
  const workDaysPerYear = Math.max(1, safeNumber(values.workDaysPerYear, 235));

  return {
    incomePerWorkDay: round2(annualIncome / workDaysPerYear),
    incomePerCalendarDay: round2(annualIncome / 365),
    incomePerWeekday: round2(annualIncome / 260),
    incomePerMonth: round2(annualIncome / 12),
  };
};

// --- 5. Household Income Calculator ---------------------------------------------
export const householdIncomeCalculator: CustomCalculator = (values) => {
  const earner1 = Math.max(0, safeNumber(values.earner1, 62000));
  const earner2 = Math.max(0, safeNumber(values.earner2, 48000));
  const otherEarners = Math.max(0, safeNumber(values.otherEarners, 0));
  const otherHouseholdIncome = Math.max(0, safeNumber(values.otherHouseholdIncome, 3000));
  const householdSize = Math.max(1, Math.round(safeNumber(values.householdSize, 4)));

  const total = earner1 + earner2 + otherEarners + otherHouseholdIncome;

  return {
    totalHouseholdIncome: round2(total),
    monthlyHouseholdIncome: round2(total / 12),
    incomePerPerson: round2(total / householdSize),
    largestEarnerSharePercent: total > 0 ? round2((Math.max(earner1, earner2, otherEarners) / total) * 100) : 0,
  };
};

// --- 6. Combined Income Calculator (with DTI) -------------------------------
export const combinedIncomeCalculator: CustomCalculator = (values) => {
  const applicant1Monthly = Math.max(0, safeNumber(values.applicant1Monthly, 4800));
  const applicant2Monthly = Math.max(0, safeNumber(values.applicant2Monthly, 3600));
  const otherMonthly = Math.max(0, safeNumber(values.otherMonthly, 0));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 900));
  const plannedNewPayment = Math.max(0, safeNumber(values.plannedNewPayment, 1800));

  const combined = applicant1Monthly + applicant2Monthly + otherMonthly;

  return {
    combinedMonthlyIncome: round2(combined),
    combinedAnnualIncome: round2(combined * 12),
    debtToIncomeNowPercent: combined > 0 ? round2((monthlyDebtPayments / combined) * 100) : 0,
    debtToIncomeWithNewPaymentPercent: combined > 0 ? round2(((monthlyDebtPayments + plannedNewPayment) / combined) * 100) : 0,
  };
};

// --- 7. Part-Time Income Calculator (vs full-time) ------------------------
export const partTimeIncomeCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 17));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 20));
  const weeksPerYear = Math.min(53, Math.max(0, safeNumber(values.weeksPerYear, 50)));
  const fullTimeHours = Math.max(1, safeNumber(values.fullTimeHours, 40));

  const annual = hourlyRate * hoursPerWeek * weeksPerYear;
  const fullTime = hourlyRate * fullTimeHours * weeksPerYear;

  return {
    annualPartTimeIncome: round2(annual),
    monthlyAverage: round2(annual / 12),
    fullTimeEquivalentPercent: round2((hoursPerWeek / fullTimeHours) * 100),
    sameJobFullTime: round2(fullTime),
    lessThanFullTime: round2(fullTime - annual),
  };
};

// --- 8. Full-Time Income Calculator (with benefits) ----------------------
export const fullTimeIncomeCalculator: CustomCalculator = (values) => {
  const salary = Math.max(0, safeNumber(values.salary, 60000));
  const employerHealthCoverage = Math.max(0, safeNumber(values.employerHealthCoverage, 7000));
  const retirementMatchPercent = Math.max(0, safeNumber(values.retirementMatchPercent, 4));
  const otherBenefits = Math.max(0, safeNumber(values.otherBenefits, 1500));
  const paidDaysOff = Math.max(0, safeNumber(values.paidDaysOff, 25));

  const match = (salary * retirementMatchPercent) / 100;
  const pto = (salary / 260) * paidDaysOff;
  const benefits = employerHealthCoverage + match + otherBenefits;
  const total = salary + benefits;

  return {
    totalCompensation: round2(total),
    benefitsValue: round2(benefits),
    benefitsSharePercent: total > 0 ? round2((benefits / total) * 100) : 0,
    valueOfPaidTimeOff: round2(pto),
    hourlyValueOfTotalPackage: round2(total / 2080),
  };
};

// --- 9. Multiple Income Streams Calculator --------------------------------------
export const multipleIncomeStreamsCalculator: CustomCalculator = (values) => {
  const streams = [1, 2, 3, 4].map((k) => ({
    income: Math.max(0, safeNumber(values[`stream${k}Income`], [55000, 9000, 4800, 1200][k - 1])),
    hours: Math.max(0, safeNumber(values[`stream${k}HoursPerWeek`], [40, 8, 3, 0][k - 1])),
  }));

  const total = streams.reduce((a, s) => a + s.income, 0);
  const hours = streams.reduce((a, s) => a + s.hours, 0);
  const biggest = Math.max(...streams.map((s) => s.income));

  return {
    totalAnnualIncome: round2(total),
    totalMonthlyIncome: round2(total / 12),
    blendedHourlyRate: hours > 0 ? round2(total / (hours * 52)) : 0,
    shareFromBiggestStreamPercent: total > 0 ? round2((biggest / total) * 100) : 0,
    incomeOutsideMainStream: round2(total - biggest),
  };
};

// --- 10. Year-to-Date Income Calculator (full-year projection) ----------------
export const yearToDateIncomeCalculator: CustomCalculator = (values) => {
  const ytdIncome = Math.max(0, safeNumber(values.ytdIncome, 41000));
  const periodsSoFar = Math.max(1, safeNumber(values.periodsSoFar, 18));
  const periodsPerYear = Math.max(periodsSoFar, safeNumber(values.periodsPerYear, 26));
  const expectedOneOffs = Math.max(0, safeNumber(values.expectedOneOffs, 2000));

  const perPeriod = ytdIncome / periodsSoFar;
  const projected = perPeriod * periodsPerYear + expectedOneOffs;

  return {
    projectedAnnualIncome: round2(projected),
    averagePerPayPeriod: round2(perPeriod),
    stillToEarnThisYear: round2(projected - ytdIncome),
    shareOfYearEarnedPercent: projected > 0 ? round2((ytdIncome / projected) * 100) : 0,
  };
};

// --- 11. Average Monthly Income Calculator (irregular income) --------------
export const averageMonthlyIncomeCalculator: CustomCalculator = (values) => {
  const months = [1, 2, 3, 4, 5, 6].map((k) => Math.max(0, safeNumber(values[`month${k}`], [3200, 4100, 2600, 5200, 3800, 2900][k - 1])));

  const avg = months.reduce((a, b) => a + b, 0) / months.length;
  const low = Math.min(...months);
  const high = Math.max(...months);

  return {
    averageMonthlyIncome: round2(avg),
    lowestMonth: round2(low),
    highestMonth: round2(high),
    swingPercent: avg > 0 ? round2(((high - low) / avg) * 100) : 0,
    // A cautious figure to budget on: the lowest month.
    safeMonthlyBudget: round2(low),
  };
};

// --- 12. Average Annual Income Calculator (multi-year) ----------------------
export const averageAnnualIncomeCalculator: CustomCalculator = (values) => {
  const years = [1, 2, 3, 4, 5]
    .map((k) => Math.max(0, safeNumber(values[`year${k}`], [48000, 52000, 61000, 0, 0][k - 1])))
    .filter((v) => v > 0);

  const n = years.length;
  const avg = n > 0 ? years.reduce((a, b) => a + b, 0) / n : 0;
  const last2 = n >= 2 ? (years[n - 1] + years[n - 2]) / 2 : avg;
  const trend = n >= 2 && years[0] > 0 ? (Math.pow(years[n - 1] / years[0], 1 / (n - 1)) - 1) * 100 : 0;

  return {
    averageAnnualIncome: round2(avg),
    averageOfLastTwoYears: round2(last2),
    averageMonthlyIncome: round2(avg / 12),
    yearlyTrendPercent: round2(trend),
    yearsCounted: n,
  };
};

export const salaryIncomeSourcesCustomCalculators: Record<string, CustomCalculator> = {
  "income-calculator": incomeCalculator,
  "monthly-income-calculator": monthlyIncomeCalculator,
  "weekly-income-calculator": weeklyIncomeCalculator,
  "daily-income-calculator": dailyIncomeCalculator,
  "household-income-calculator": householdIncomeCalculator,
  "combined-income-calculator": combinedIncomeCalculator,
  "part-time-income-calculator": partTimeIncomeCalculator,
  "full-time-income-calculator": fullTimeIncomeCalculator,
  "multiple-income-streams-calculator": multipleIncomeStreamsCalculator,
  "year-to-date-income-calculator": yearToDateIncomeCalculator,
  "average-monthly-income-calculator": averageMonthlyIncomeCalculator,
  "average-annual-income-calculator": averageAnnualIncomeCalculator,
};
