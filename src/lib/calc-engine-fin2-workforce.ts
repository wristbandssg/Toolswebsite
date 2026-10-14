/**
 * Batch: "Finance Calculators expansion 2" (14 Oct 2026), sub-batch 3 of 9 —
 * Workforce & Project Planning (9 tools). See calc-engine-fin2-investing.ts
 * for the full batch context.
 *
 *  - absencePercentage: days lost ÷ (working days × employees), its cost.
 *  - bradfordFactor: S² × D (spells², days) with the common UK trigger
 *    points (51 informal, 201 written, 401 final, 651 dismissal review).
 *    Different from absencePercentage: it weights frequent short absences.
 *  - turnoverRate (incl. the "Attrition Rate" keyword): separations ÷
 *    average headcount, annualised; attrition = separations not replaced;
 *    replacement cost.
 *  - fte: (full-time × FT hours + part-time hours) ÷ FT hours, and the ACA
 *    count (30+ h/week full-time + part-time hours per month ÷ 120; 50+ =
 *    applicable large employer).
 *  - manHours: crew × hours × days, labor cost and days to finish a job.
 *  - daysOff: weekends counted for the real calendar year, holidays, PTO
 *    and sick days -> working days and the share of the year off.
 *  - tenure: years and months between two dates (year + month inputs), and
 *    a team's average tenure.
 *  - smokersCtc: an employer's yearly extra cost per smoker — smoke breaks
 *    plus the Ohio State (Berman et al., 2014) estimates for absence,
 *    presenteeism and excess health care.
 *  - burndownChart: sprint ideal vs actual remaining work, ahead/behind,
 *    required daily velocity and projected finish day.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin2-workforce-calculators.ts for the copy.
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

// --- 1. Absence Percentage Calculator --------------------------------------------------
export const absencePercentageCalculator: CustomCalculator = (values) => {
  const absent = pos(values.daysAbsent, 45);
  const workdays = pos(values.workingDays, 250);
  const staff = Math.max(1, pos(values.employees, 10));
  const possible = workdays * staff;
  return {
    possibleWorkdays: possible,
    absencePercentage: round2(possible > 0 ? (absent / possible) * 100 : 0),
    attendanceRate: round2(possible > 0 ? 100 - (absent / possible) * 100 : 0),
    daysLostPerEmployee: round2(absent / staff),
    costOfAbsence: round2(absent * pos(values.dailyPay, 0)),
  };
};

// --- 2. Bradford Factor Calculator -----------------------------------------------------
export const bradfordFactorCalculator: CustomCalculator = (values) => {
  const spells = Math.round(pos(values.spells, 4));
  const days = pos(values.totalDays, 6);
  const score = spells * spells * days;
  return {
    bradfordScore: round2(score),
    // 0 no action, 1 informal (51+), 2 written warning (201+), 3 final (401+), 4 dismissal review (651+)
    triggerLevel: score >= 651 ? 4 : score >= 401 ? 3 : score >= 201 ? 2 : score >= 51 ? 1 : 0,
    sameDaysInOneSpell: round2(days),
  };
};

// --- 3. Turnover Rate Calculator -------------------------------------------------------
export const turnoverRateCalculator: CustomCalculator = (values) => {
  const start = pos(values.employeesStart, 200);
  const end = pos(values.employeesEnd, 210);
  const seps = pos(values.separations, 24);
  const notReplaced = Math.min(seps, pos(values.notReplaced, 6));
  const voluntary = Math.min(seps, pos(values.voluntarySeparations, 0));
  const months = clamp(pos(values.periodMonths, 12), 1, 120);
  const avg = (start + end) / 2;
  const rate = avg > 0 ? seps / avg : 0;
  return {
    averageHeadcount: round2(avg),
    turnoverRate: round2(rate * 100),
    annualizedTurnover: round2(rate * (12 / months) * 100),
    attritionRate: round2(avg > 0 ? (notReplaced / avg) * 100 : 0),
    voluntaryTurnover: round2(avg > 0 ? (voluntary / avg) * 100 : 0),
    replacementCost: round2(seps * pos(values.averageSalary, 0) * (pos(values.replacementCostPct, 33) / 100)),
  };
};

// --- 4. FTE Calculator -----------------------------------------------------------------
export const fteCalculator: CustomCalculator = (values) => {
  const ft = pos(values.fullTimeEmployees, 40);
  const ftHours = Math.max(1, pos(values.fullTimeHours, 40));
  const pt = pos(values.partTimeEmployees, 20);
  const ptHours = pos(values.partTimeHours, 20);
  const ptWeekly = pt * ptHours;
  const fte = ft + ptWeekly / ftHours;
  // ACA: 30+ h/week is full-time; part-time hours per month ÷ 120.
  const acaFtFromPt = ptHours >= 30 ? pt : 0;
  const acaPt = ptHours >= 30 ? 0 : (ptWeekly * 52) / 12 / 120;
  const aca = ft + acaFtFromPt + acaPt;
  return {
    totalWeeklyHours: round2(ft * ftHours + ptWeekly),
    fte: round2(fte),
    partTimeFte: round2(ptWeekly / ftHours),
    acaEmployeeCount: round2(aca),
    acaLargeEmployer: Math.floor(aca + 1e-9) >= 50 ? 1 : 0,
  };
};

// --- 5. Man-Hours Calculator -----------------------------------------------------------
export const manHoursCalculator: CustomCalculator = (values) => {
  const workers = pos(values.workers, 5);
  const hpd = pos(values.hoursPerDay, 8);
  const days = pos(values.days, 10);
  const task = pos(values.taskManHours, 0);
  const mh = workers * hpd * days;
  return {
    manHours: round2(mh),
    manDays: round2(hpd > 0 ? mh / hpd : 0),
    laborCost: round2(mh * pos(values.hourlyCost, 30)),
    daysToFinishTask: round2(task > 0 && workers * hpd > 0 ? task / (workers * hpd) : 0),
    workersForTaskInDays: round2(task > 0 && hpd * days > 0 ? Math.ceil(task / (hpd * days) - 1e-9) : 0),
  };
};

// --- 6. Days Off Calculator ------------------------------------------------------------
export const daysOffCalculator: CustomCalculator = (values) => {
  const year = clamp(Math.round(num(values.year, 2026)), 1900, 2200);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const total = leap ? 366 : 365;
  let weekend = 0;
  const weekendDays = num(values.weekendType, 1) === 2 ? 1 : 2;
  for (let d = 0; d < total; d++) {
    const dow = new Date(Date.UTC(year, 0, 1 + d)).getUTCDay();
    if (dow === 0 || (weekendDays === 2 && dow === 6)) weekend++;
  }
  const holidays = pos(values.holidays, 11);
  const pto = pos(values.ptoDays, 15);
  const sick = pos(values.sickDays, 5);
  const workdays = Math.max(0, total - weekend - holidays);
  const off = Math.min(total, weekend + holidays + pto + sick);
  return {
    daysInYear: total,
    weekendDays: weekend,
    workingDaysBeforeLeave: workdays,
    daysActuallyWorked: Math.max(0, workdays - pto - sick),
    totalDaysOff: off,
    percentOfYearOff: round2((off / total) * 100),
  };
};

// --- 7. Tenure Calculator --------------------------------------------------------------
export const tenureCalculator: CustomCalculator = (values) => {
  const sy = Math.round(num(values.startYear, 2019));
  const sm = clamp(Math.round(num(values.startMonth, 3)), 1, 12);
  const ey = Math.round(num(values.endYear, 2026));
  const em = clamp(Math.round(num(values.endMonth, 10)), 1, 12);
  const months = Math.max(0, (ey - sy) * 12 + (em - sm));
  const totalYearsTeam = pos(values.teamTotalYears, 0);
  const headcount = pos(values.teamHeadcount, 0);
  return {
    tenureYears: Math.floor(months / 12),
    tenureMonthsExtra: months % 12,
    tenureInMonths: months,
    tenureDecimalYears: round2(months / 12),
    averageTeamTenure: round2(headcount > 0 ? totalYearsTeam / headcount : 0),
  };
};

// --- 8. Smoker's CTC Calculator --------------------------------------------------------
export const smokersCtcCalculator: CustomCalculator = (values) => {
  const smokers = pos(values.smokers, 10);
  const breaks = pos(values.breaksPerDay, 4);
  const minutes = pos(values.minutesPerBreak, 10);
  const wage = pos(values.hourlyCost, 30);
  const workdays = pos(values.workdays, 230);
  const hoursLost = (breaks * minutes * workdays) / 60;
  const breakCost = hoursLost * wage;
  const health = pos(values.excessHealthCost, 2056);
  const absence = pos(values.excessAbsenceCost, 517);
  const presenteeism = pos(values.presenteeismCost, 462);
  const per = breakCost + health + absence + presenteeism;
  return {
    hoursLostPerSmoker: round2(hoursLost),
    breakCostPerSmoker: round2(breakCost),
    totalCostPerSmoker: round2(per),
    totalCostAllSmokers: round2(per * smokers),
    monthlyCostAllSmokers: round2((per * smokers) / 12),
  };
};

// --- 9. Burndown Chart Calculator ------------------------------------------------------
export const burndownChartCalculator: CustomCalculator = (values) => {
  const total = pos(values.totalPoints, 80);
  const days = Math.max(1, pos(values.sprintDays, 10));
  const elapsed = clamp(pos(values.daysElapsed, 6), 0, days);
  const done = Math.min(total, pos(values.pointsCompleted, 40));
  const ideal = total * (1 - elapsed / days);
  const remaining = total - done;
  const velocity = elapsed > 0 ? done / elapsed : 0;
  const daysLeft = days - elapsed;
  return {
    idealRemaining: round2(ideal),
    actualRemaining: round2(remaining),
    aheadBehind: round2(ideal - remaining),
    currentVelocityPerDay: round2(velocity),
    requiredVelocityPerDay: round2(daysLeft > 0 ? remaining / daysLeft : remaining),
    projectedFinishDay: round2(velocity > 0 ? total / velocity : 0),
  };
};

export const fin2WorkforceCustomCalculators: Record<string, CustomCalculator> = {
  "absence-percentage-calculator": absencePercentageCalculator,
  "bradford-factor-calculator": bradfordFactorCalculator,
  "turnover-rate-calculator": turnoverRateCalculator,
  "fte-calculator": fteCalculator,
  "man-hours-calculator": manHoursCalculator,
  "days-off-calculator": daysOffCalculator,
  "tenure-calculator": tenureCalculator,
  "smokers-ctc-calculator": smokersCtcCalculator,
  "burndown-chart-calculator": burndownChartCalculator,
};
