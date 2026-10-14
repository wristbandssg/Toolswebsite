/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 2 of 10
 * — Pay, Income & Benefits (8 tools). See calc-engine-fin3-derivatives-tax.ts
 * for the full batch context.
 *
 *  - twelveHourShiftPay: 12-hour shifts under the federal weekly rule
 *    (1.5× over 40 h) or California's daily rule (1.5× after 8 h, 2× after
 *    12 h, plus weekly 40 h). Different from the existing night-shift and
 *    shift-differential tools (premiums for hours worked at night).
 *  - billableHours: utilisation, billable revenue and the hours needed
 *    for a revenue goal. Different from the existing billable-hour-rate-
 *    calculator (which sets the rate).
 *  - proratedSalary: pay for part of a month by calendar or working days,
 *    and an FTE-adjusted salary.
 *  - sellingLeaveDays: cash value of unused leave at a daily rate, with
 *    supplemental-wage withholding.
 *  - lifetimeEarnings: total pay from now to retirement with raises,
 *    nominal and in today's dollars.
 *  - unpaidWork: replacement-cost value of household work and care.
 *  - usIncomePercentile: 2025 US household income percentiles (Census CPS
 *    ASEC 2026: 20th $35,800, 40th $68,600, median $87,460, 60th $110,300,
 *    80th $182,400, 95th $354,000) — linear between anchors, Pareto tail
 *    above the 95th (α fitted from the 80th→95th).
 *  - unemploymentBenefit (incl. the CARES / HEALS / HEROES / LWA keywords,
 *    whose federal supplements have ended): a state weekly benefit from
 *    high-quarter wages ÷ 26 or a % of average weekly wage, capped at the
 *    state maximum.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-pay-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- 1. 12-Hour Shift Pay Calculator ---------------------------------------------------
export const twelveHourShiftPayCalculator: CustomCalculator = (values) => {
  const rate = pos(values.hourlyRate, 25);
  const shifts = pos(values.shiftsPerWeek, 4);
  const length = pos(values.shiftLength, 12);
  const california = num(values.overtimeRule, 1) === 2;
  const diff = pos(values.shiftDifferential, 0);
  let reg: number;
  let ot: number;
  let dt: number;
  const hours = shifts * length;
  if (california) {
    reg = shifts * Math.min(length, 8);
    ot = shifts * clamp(length - 8, 0, 4);
    dt = shifts * Math.max(0, length - 12);
    if (reg > 40) {
      ot += reg - 40;
      reg = 40;
    }
  } else {
    reg = Math.min(hours, 40);
    ot = Math.max(0, hours - 40);
    dt = 0;
  }
  const base = rate + diff;
  const weekly = reg * base + ot * base * 1.5 + dt * base * 2;
  return {
    hoursPerWeek: round2(hours),
    regularHours: round2(reg),
    overtimeHours: round2(ot),
    doubleTimeHours: round2(dt),
    weeklyPay: round2(weekly),
    biweeklyPay: round2(weekly * 2),
    yearlyPay: round2(weekly * 52),
    effectiveHourlyRate: round2(hours > 0 ? weekly / hours : 0),
  };
};

// --- 2. Billable Hours Calculator ------------------------------------------------------
export const billableHoursCalculator: CustomCalculator = (values) => {
  const worked = pos(values.hoursWorkedPerWeek, 45);
  const billable = Math.min(worked, pos(values.billableHoursPerWeek, 30));
  const rate = pos(values.billingRate, 150);
  const weeks = pos(values.weeksPerYear, 48);
  const goal = pos(values.revenueGoal, 0);
  const yearly = billable * rate * weeks;
  return {
    utilizationRate: round2(worked > 0 ? (billable / worked) * 100 : 0),
    weeklyBillings: round2(billable * rate),
    yearlyBillings: round2(yearly),
    effectiveRatePerHourWorked: round2(worked > 0 ? (billable * rate) / worked : 0),
    billableHoursForGoalPerWeek: round2(goal > 0 && rate * weeks > 0 ? goal / (rate * weeks) : 0),
  };
};

// --- 3. Prorated Salary Calculator -----------------------------------------------------
export const proratedSalaryCalculator: CustomCalculator = (values) => {
  const annual = pos(values.annualSalary, 72000);
  const worked = pos(values.daysWorked, 12);
  const period = Math.max(1, pos(values.daysInPeriod, 22));
  const fte = clamp(pos(values.ftePercent, 100), 0, 200) / 100;
  const monthly = (annual * fte) / 12;
  const daily = monthly / period;
  return {
    fteAdjustedSalary: round2(annual * fte),
    monthlySalary: round2(monthly),
    dailyRate: round2(daily),
    proratedPay: round2(daily * Math.min(worked, period)),
    unpaidDeduction: round2(monthly - daily * Math.min(worked, period)),
  };
};

// --- 4. Selling Leave Days Calculator --------------------------------------------------
export const sellingLeaveDaysCalculator: CustomCalculator = (values) => {
  const days = pos(values.leaveDays, 10);
  const salary = pos(values.annualSalary, 65000);
  const workdays = Math.max(1, pos(values.workdaysPerYear, 260));
  const payout = pos(values.payoutPercent, 100) / 100;
  const tax = pos(values.withholdingRate, 22) / 100 + pos(values.stateAndFicaRate, 7.65) / 100;
  const daily = salary / workdays;
  const gross = days * daily * payout;
  return {
    dailyRate: round2(daily),
    grossPayout: round2(gross),
    withholding: round2(gross * tax),
    netPayout: round2(gross * (1 - tax)),
  };
};

// --- 5. Lifetime Earnings Calculator ---------------------------------------------------
export const lifetimeEarningsCalculator: CustomCalculator = (values) => {
  const age = pos(values.currentAge, 30);
  const retire = Math.max(age, pos(values.retirementAge, 67));
  const salary = pos(values.currentSalary, 65000);
  const raise = num(values.annualRaise, 3) / 100;
  const infl = num(values.inflation, 2.5) / 100;
  const years = Math.round(retire - age);
  let total = 0;
  let real = 0;
  let pay = salary;
  for (let y = 0; y < years; y++) {
    total += pay;
    real += pay / Math.pow(1 + infl, y);
    pay *= 1 + raise;
  }
  return {
    workingYearsLeft: years,
    lifetimeEarnings: round2(total),
    lifetimeEarningsTodaysDollars: round2(real),
    finalYearSalary: round2(years > 0 ? salary * Math.pow(1 + raise, years - 1) : 0),
    averageYearlyPay: round2(years > 0 ? total / years : 0),
  };
};

// --- 6. Unpaid Work Calculator ---------------------------------------------------------
export const unpaidWorkCalculator: CustomCalculator = (values) => {
  const parts: [string, string, number, number][] = [
    ["cookingHours", "cookingRate", 7, 16],
    ["cleaningHours", "cleaningRate", 6, 17],
    ["childcareHours", "childcareRate", 10, 15],
    ["caregivingHours", "caregivingRate", 0, 18],
    ["errandsHours", "errandsRate", 3, 15],
    ["repairsHours", "repairsRate", 2, 25],
  ];
  let weekly = 0;
  let hours = 0;
  for (const [h, r, dh, dr] of parts) {
    const hh = pos(values[h], dh);
    hours += hh;
    weekly += hh * pos(values[r], dr);
  }
  return {
    hoursPerWeek: round2(hours),
    weeklyValue: round2(weekly),
    monthlyValue: round2((weekly * 52) / 12),
    yearlyValue: round2(weekly * 52),
    averageHourlyValue: round2(hours > 0 ? weekly / hours : 0),
  };
};

// --- 7. US Income Percentile Calculator ------------------------------------------------
const ANCHORS: [number, number][] = [[0, 0], [35800, 20], [68600, 40], [87460, 50], [110300, 60], [182400, 80], [354000, 95]];
const ALPHA = Math.log(4) / Math.log(354000 / 182400);

export const usIncomePercentileCalculator: CustomCalculator = (values) => {
  const income = pos(values.householdIncome, 100000);
  let pct: number;
  if (income >= 354000) pct = 100 - 5 * Math.pow(354000 / income, ALPHA);
  else {
    pct = 0;
    for (let i = 1; i < ANCHORS.length; i++) {
      const [x0, p0] = ANCHORS[i - 1];
      const [x1, p1] = ANCHORS[i];
      if (income <= x1) {
        pct = p0 + ((income - x0) / (x1 - x0)) * (p1 - p0);
        break;
      }
    }
  }
  pct = Math.min(99.99, pct);
  return {
    percentile: round2(pct),
    topPercent: round2(100 - pct),
    vsMedian: round2((income / 87460 - 1) * 100),
    incomeForTop20: 182400,
    incomeForTop5: 354000,
  };
};

// --- 8. Unemployment Benefit Calculator ------------------------------------------------
export const unemploymentBenefitCalculator: CustomCalculator = (values) => {
  const method = num(values.method, 1); // 1 high quarter ÷ 26, 2 % of average weekly wage
  const hq = pos(values.highQuarterWages, 15000);
  const aww = pos(values.averageWeeklyWage, 1150);
  const pct = pos(values.replacementPercent, 50) / 100;
  const max = pos(values.stateMaxWeekly, 600);
  const min = pos(values.stateMinWeekly, 50);
  const weeks = pos(values.weeks, 26);
  const raw = method === 2 ? aww * pct : hq / 26;
  const weekly = Math.max(min, max > 0 ? Math.min(raw, max) : raw);
  const withhold = num(values.withholdTax, 1) === 2 ? 0.1 : 0;
  return {
    uncappedWeeklyBenefit: round2(raw),
    weeklyBenefit: round2(weekly),
    weeklyAfterWithholding: round2(weekly * (1 - withhold)),
    totalBenefit: round2(weekly * weeks),
    replacementOfWage: round2(aww > 0 ? (weekly / aww) * 100 : 0),
  };
};

export const fin3PayCustomCalculators: Record<string, CustomCalculator> = {
  "12-hour-shift-pay-calculator": twelveHourShiftPayCalculator,
  "billable-hours-calculator": billableHoursCalculator,
  "prorated-salary-calculator": proratedSalaryCalculator,
  "selling-leave-days-calculator": sellingLeaveDaysCalculator,
  "lifetime-earnings-calculator": lifetimeEarningsCalculator,
  "unpaid-work-calculator": unpaidWorkCalculator,
  "us-income-percentile-calculator": usIncomePercentileCalculator,
  "unemployment-benefit-calculator": unemploymentBenefitCalculator,
};
