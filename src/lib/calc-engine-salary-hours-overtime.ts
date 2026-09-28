/**
 * Batch: "Salary & Income Calculators" sub-batch C (Work Hours & Overtime,
 * 11 tools). Part of the Salary & Income build-out — see
 * calc-engine-salary-conversions.ts for the full list of 9 sub-batches.
 * Filed under Finance Calculators > Salary & Income Calculators.
 *
 * Near-namesakes, and how each is deliberately different (overtime-
 * calculator already pays a given number of overtime hours at a
 * multiplier):
 *  - workHoursCalculator: hours between a start and end time (overnight
 *    shifts too), minus an unpaid break.
 *  - hoursWorkedCalculator: a 7-day timesheet → total, regular and
 *    overtime hours under the 40-hour weekly rule.
 *  - weeklyHoursCalculator: shifts × shift length − breaks, and full-time
 *    equivalent (FTE).
 *  - monthlyWorkHoursCalculator: hours in a particular month (its working
 *    days) vs the average month.
 *  - annualWorkHoursCalculator: hours actually worked in a year after
 *    vacation, holidays and sick days, vs the 2,080 standard.
 *  - overtimePayCalculator: overtime worked out from TOTAL hours and a
 *    weekly threshold, split into straight time and the overtime premium.
 *  - timeAndAHalfCalculator: the 1.5× rate and pay for hours at it.
 *  - doubleTimeCalculator: the 2× rate, and how it compares with 1.5×.
 *  - overtimeHoursCalculator: overtime hours needed to take home a target
 *    amount after tax.
 *  - overtimeRateCalculator: overtime for a salaried NON-exempt worker,
 *    with a non-discretionary bonus folded into the regular rate (FLSA).
 *  - regularAndOvertimePayCalculator: daily AND weekly overtime rules
 *    (California-style: over 8 hours a day at 1.5×, over 12 at 2×).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-salary-hours-overtime-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

// --- 1. Work Hours Calculator (start → end time) ------------------------
export const workHoursCalculator: CustomCalculator = (values) => {
  const startHour = Math.min(23, Math.max(0, safeNumber(values.startHour, 9)));
  const startMinute = Math.min(59, Math.max(0, safeNumber(values.startMinute, 0)));
  const endHour = Math.min(23, Math.max(0, safeNumber(values.endHour, 17)));
  const endMinute = Math.min(59, Math.max(0, safeNumber(values.endMinute, 30)));
  const breakMinutes = Math.max(0, safeNumber(values.breakMinutes, 30));
  const daysPerWeek = Math.min(7, Math.max(0, safeNumber(values.daysPerWeek, 5)));

  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 24 * 60; // shift runs past midnight
  const worked = Math.max(0, minutes - breakMinutes);

  return {
    hoursPerDay: round2(worked / 60),
    wholeHours: Math.floor(worked / 60),
    extraMinutes: Math.round(worked % 60),
    hoursPerWeek: round2((worked / 60) * daysPerWeek),
  };
};

// --- 2. Hours Worked Calculator (weekly timesheet) ----------------------
export const hoursWorkedCalculator: CustomCalculator = (values) => {
  const hours = DAYS.map((d, k) => Math.min(24, Math.max(0, safeNumber(values[d], k < 5 ? [8, 9, 8, 10, 8][k] : 0))));
  const threshold = Math.max(0, safeNumber(values.weeklyThreshold, 40));

  const total = hours.reduce((a, b) => a + b, 0);
  const daysWorked = hours.filter((h) => h > 0).length;

  return {
    totalHours: round2(total),
    regularHours: round2(Math.min(total, threshold)),
    overtimeHours: round2(Math.max(0, total - threshold)),
    daysWorked,
    averageHoursPerDayWorked: daysWorked > 0 ? round2(total / daysWorked) : 0,
  };
};

// --- 3. Weekly Hours Calculator (shifts) ----------------------------------
export const weeklyHoursCalculator: CustomCalculator = (values) => {
  const shiftsPerWeek = Math.max(0, safeNumber(values.shiftsPerWeek, 4));
  const shiftLengthHours = Math.max(0, safeNumber(values.shiftLengthHours, 10));
  const unpaidBreakMinutes = Math.max(0, safeNumber(values.unpaidBreakMinutes, 30));
  const fullTimeHours = Math.max(1, safeNumber(values.fullTimeHours, 40));

  const weekly = shiftsPerWeek * Math.max(0, shiftLengthHours - unpaidBreakMinutes / 60);

  return {
    paidHoursPerWeek: round2(weekly),
    fullTimeEquivalentPercent: round2((weekly / fullTimeHours) * 100),
    hoursPerYear: round2(weekly * 52),
    unpaidBreakHoursPerWeek: round2((shiftsPerWeek * unpaidBreakMinutes) / 60),
  };
};

// --- 4. Monthly Work Hours Calculator ----------------------------------------
export const monthlyWorkHoursCalculator: CustomCalculator = (values) => {
  const hoursPerDay = Math.max(0, safeNumber(values.hoursPerDay, 8));
  const workingDaysInMonth = Math.max(0, safeNumber(values.workingDaysInMonth, 22));
  const daysPerWeek = Math.min(7, Math.max(1, safeNumber(values.daysPerWeek, 5)));

  const thisMonth = hoursPerDay * workingDaysInMonth;
  const average = (hoursPerDay * daysPerWeek * 52) / 12;

  return {
    hoursThisMonth: round2(thisMonth),
    averageMonthlyHours: round2(average),
    differenceFromAverage: round2(thisMonth - average),
    hoursPerWeek: round2(hoursPerDay * daysPerWeek),
  };
};

// --- 5. Annual Work Hours Calculator ----------------------------------------
export const annualWorkHoursCalculator: CustomCalculator = (values) => {
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));
  const daysPerWeek = Math.min(7, Math.max(1, safeNumber(values.daysPerWeek, 5)));
  const vacationDays = Math.max(0, safeNumber(values.vacationDays, 15));
  const holidays = Math.max(0, safeNumber(values.holidays, 10));
  const sickDays = Math.max(0, safeNumber(values.sickDays, 3));

  const hoursPerDay = hoursPerWeek / daysPerWeek;
  const scheduled = hoursPerWeek * 52;
  const off = (vacationDays + holidays + sickDays) * hoursPerDay;
  const worked = Math.max(0, scheduled - off);

  return {
    hoursActuallyWorked: round2(worked),
    scheduledHours: round2(scheduled),
    hoursOff: round2(off),
    daysActuallyWorked: round2(Math.max(0, daysPerWeek * 52 - vacationDays - holidays - sickDays)),
  };
};

// --- 6. Overtime Pay Calculator (from total hours) -------------------------
export const overtimePayCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 24));
  const totalHours = Math.max(0, safeNumber(values.totalHours, 47));
  const weeklyThreshold = Math.max(0, safeNumber(values.weeklyThreshold, 40));
  const multiplier = Math.max(1, safeNumber(values.multiplier, 1.5));

  const ot = Math.max(0, totalHours - weeklyThreshold);
  const regular = Math.min(totalHours, weeklyThreshold) * hourlyRate;
  const otPay = ot * hourlyRate * multiplier;

  return {
    overtimePay: round2(otPay),
    overtimeHours: round2(ot),
    overtimePremiumOnly: round2(ot * hourlyRate * (multiplier - 1)),
    regularPay: round2(regular),
    totalWeeklyPay: round2(regular + otPay),
  };
};

// --- 7. Time and a Half Calculator ------------------------------------------
export const timeAndAHalfCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 20));
  const hours = Math.max(0, safeNumber(values.hours, 8));

  const rate = hourlyRate * 1.5;

  return {
    timeAndAHalfRate: round2(rate),
    payForThoseHours: round2(rate * hours),
    extraOverNormalPay: round2(hourlyRate * 0.5 * hours),
    normalPayForThoseHours: round2(hourlyRate * hours),
  };
};

// --- 8. Double Time Calculator ------------------------------------------------
export const doubleTimeCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 20));
  const hours = Math.max(0, safeNumber(values.hours, 6));

  const rate = hourlyRate * 2;

  return {
    doubleTimeRate: round2(rate),
    payForThoseHours: round2(rate * hours),
    moreThanTimeAndAHalf: round2(hourlyRate * 0.5 * hours),
    extraOverNormalPay: round2(hourlyRate * hours),
  };
};

// --- 9. Overtime Hours Calculator (hours for a target) ---------------------
export const overtimeHoursCalculator: CustomCalculator = (values) => {
  const targetTakeHome = Math.max(0, safeNumber(values.targetTakeHome, 1000));
  const hourlyRate = Math.max(0.01, safeNumber(values.hourlyRate, 25));
  const multiplier = Math.max(1, safeNumber(values.multiplier, 1.5));
  const taxRatePercent = Math.min(99, Math.max(0, safeNumber(values.taxRatePercent, 25)));

  const netPerOtHour = hourlyRate * multiplier * (1 - taxRatePercent / 100);
  const hours = targetTakeHome / netPerOtHour;

  return {
    overtimeHoursNeeded: round2(hours),
    grossOvertimePay: round2(hours * hourlyRate * multiplier),
    takeHomePerOvertimeHour: round2(netPerOtHour),
    // 8-hour days of overtime.
    extraWorkdays: round2(hours / 8),
  };
};

// --- 10. Overtime Rate Calculator (salaried non-exempt + bonus) -----------
export const overtimeRateCalculator: CustomCalculator = (values) => {
  const weeklySalary = Math.max(0, safeNumber(values.weeklySalary, 1000));
  const salaryCoversHours = Math.max(1, safeNumber(values.salaryCoversHours, 40));
  const weeklyBonus = Math.max(0, safeNumber(values.weeklyBonus, 100));
  const hoursWorked = Math.max(0, safeNumber(values.hoursWorked, 46));

  // FLSA: a non-discretionary bonus is spread over ALL hours worked that week.
  const baseRate = weeklySalary / salaryCoversHours;
  const bonusRate = hoursWorked > 0 ? weeklyBonus / hoursWorked : 0;
  const regularRate = baseRate + bonusRate;
  const otHours = Math.max(0, hoursWorked - 40);
  // Hours between the salaried hours and 40 are owed at straight time; the
  // bonus already covers straight time for every hour, so over 40 it adds half.
  const straightExtra = Math.max(0, Math.min(hoursWorked, 40) - salaryCoversHours) * baseRate;
  const otPay = otHours * (baseRate * 1.5 + bonusRate * 0.5);

  return {
    regularRate: round2(regularRate),
    overtimeRate: round2(regularRate * 1.5),
    overtimePay: round2(otPay),
    totalWeeklyPay: round2(weeklySalary + weeklyBonus + straightExtra + otPay),
  };
};

// --- 11. Regular and Overtime Pay (daily + weekly rules) -------------------
export const regularAndOvertimePayCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 22));
  const hours = DAYS.map((d, k) => Math.min(24, Math.max(0, safeNumber(values[d], [10, 8, 13, 8, 9, 0, 0][k]))));
  const dailyThreshold = Math.max(0, safeNumber(values.dailyThreshold, 8));
  const doubleTimeAfter = Math.max(dailyThreshold, safeNumber(values.doubleTimeAfter, 12));

  // Daily rule first: over the daily threshold is 1.5×, over the double-time
  // line is 2×. Then any straight-time hours beyond 40 in the week become
  // 1.5× too (weekly rule) — without counting any hour twice.
  let regular = 0;
  let ot = 0;
  let dt = 0;
  for (const h of hours) {
    regular += Math.min(h, dailyThreshold);
    ot += Math.max(0, Math.min(h, doubleTimeAfter) - dailyThreshold);
    dt += Math.max(0, h - doubleTimeAfter);
  }
  const weeklyShift = Math.max(0, regular - 40);
  regular -= weeklyShift;
  ot += weeklyShift;
  const pay = regular * hourlyRate + ot * hourlyRate * 1.5 + dt * hourlyRate * 2;
  const total = regular + ot + dt;

  return {
    totalPay: round2(pay),
    regularHours: round2(regular),
    overtimeHours: round2(ot),
    doubleTimeHours: round2(dt),
    effectiveHourlyRate: total > 0 ? round2(pay / total) : 0,
  };
};

export const salaryHoursOvertimeCustomCalculators: Record<string, CustomCalculator> = {
  "work-hours-calculator": workHoursCalculator,
  "hours-worked-calculator": hoursWorkedCalculator,
  "weekly-hours-calculator": weeklyHoursCalculator,
  "monthly-work-hours-calculator": monthlyWorkHoursCalculator,
  "annual-work-hours-calculator": annualWorkHoursCalculator,
  "overtime-pay-calculator": overtimePayCalculator,
  "time-and-a-half-calculator": timeAndAHalfCalculator,
  "double-time-calculator": doubleTimeCalculator,
  "overtime-hours-calculator": overtimeHoursCalculator,
  "overtime-rate-calculator": overtimeRateCalculator,
  "regular-and-overtime-pay-calculator": regularAndOvertimePayCalculator,
};
