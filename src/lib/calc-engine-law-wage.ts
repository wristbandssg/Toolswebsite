/**
 * Batch: "Law & Government Calculators" → Employment & Wage Law Calculators —
 * wages, garnishment, overtime rules and pay schedules (24 tools).
 *
 * Data (2026):
 *  - MIN_WAGE_2026: state minimum wages in effect October 2026 (federal $7.25;
 *    Florida $15.00 from 30 Sep 2026, Alaska $14.00 from 1 Jul 2026; New York
 *    and Oregon have regional rates — the standard rate is used).
 *  - Garnishment: federal CCPA (lesser of 25% of disposable earnings or the
 *    amount over 30 × $7.25 a week); California CCP §706.050 (lesser of 20% or
 *    40% of the amount over 48 × state minimum wage); Illinois 735 ILCS
 *    5/12-803 (lesser of 15% of gross or the amount over 45 × state minimum);
 *    New Jersey 2A:17-56 (10% of gross up to 250% of the poverty line, else up
 *    to 25% of disposable); Florida §222.11 (head of family exempt up to $750 a
 *    week); Massachusetts c.246 §28 (exempt the greater of 85% of gross or 50 ×
 *    state minimum); Maryland §15-601.1 (exempt the greater of 75% or 30 ×
 *    state minimum); Arizona (Prop 209: lesser of 10% or the amount over 60 ×
 *    state minimum); Virginia §34-29 (lesser of 25% or the amount over 40 ×
 *    federal minimum). Child support 50–65%, federal student loans 15%.
 *  - Qualified overtime deduction (2025–2028): the premium half of FLSA
 *    overtime, up to $12,500 ($25,000 joint), reduced by $100 per $1,000 of
 *    MAGI over $150,000 ($300,000 joint).
 *  - Exempt salary tests: federal $684 a week; California 2 × state minimum ×
 *    40 = $1,352; Washington 2.5 × state minimum × 40 = $1,712.50.
 *  - Prop 22: 120% of the state minimum wage for engaged time + $0.37 per
 *    engaged mile (2026).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-wage-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

export const FEDERAL_MIN = 7.25;
export const MIN_WAGE_2026: [string, number][] = [
  ["Alabama", 7.25], ["Alaska", 14], ["Arizona", 15.15], ["Arkansas", 11], ["California", 16.9], ["Colorado", 15.16], ["Connecticut", 16.94],
  ["Delaware", 15], ["District of Columbia", 17.95], ["Florida", 15], ["Georgia", 7.25], ["Hawaii", 16], ["Idaho", 7.25], ["Illinois", 15],
  ["Indiana", 7.25], ["Iowa", 7.25], ["Kansas", 7.25], ["Kentucky", 7.25], ["Louisiana", 7.25], ["Maine", 15.1], ["Maryland", 15],
  ["Massachusetts", 15], ["Michigan", 13.73], ["Minnesota", 11.41], ["Mississippi", 7.25], ["Missouri", 15], ["Montana", 10.85], ["Nebraska", 15],
  ["Nevada", 12], ["New Hampshire", 7.25], ["New Jersey", 15.92], ["New Mexico", 12], ["New York (NYC, Long Island, Westchester)", 17], ["New York (rest of state)", 16],
  ["North Carolina", 7.25], ["North Dakota", 7.25], ["Ohio", 11], ["Oklahoma", 7.25], ["Oregon (standard)", 15.05], ["Oregon (Portland metro)", 16.3],
  ["Oregon (non-urban)", 14.05], ["Pennsylvania", 7.25], ["Rhode Island", 16], ["South Carolina", 7.25], ["South Dakota", 11.85], ["Tennessee", 7.25],
  ["Texas", 7.25], ["Utah", 7.25], ["Vermont", 14.42], ["Virginia", 12.77], ["Washington", 17.13], ["West Virginia", 8.75], ["Wisconsin", 7.25], ["Wyoming", 7.25],
];
const minWageFor = (name: string) => MIN_WAGE_2026.find(([n]) => n === name)![1];

/** Pay periods per year and weekly conversion. */
const PERIODS: Record<number, number> = { 0: 52, 1: 26, 2: 24, 3: 12 };
const weeksPer = (freq: number) => 52 / (PERIODS[Math.round(safeNumber(freq))] ?? 52);

interface GarnishOut {
  max: number;
  disposable: number;
  note?: number;
}

function garnishResult(out: GarnishOut, periodsPerYear: number) {
  const g = Math.max(0, Math.min(out.max, out.disposable));
  return {
    maximumGarnishmentPerPaycheck: round2(g),
    takeHomeAfterGarnishment: round2(out.disposable - g),
    percentOfDisposable: round2(out.disposable > 0 ? (g / out.disposable) * 100 : 0),
    garnishedPerYear: round2(g * periodsPerYear),
    disposableEarnings: round2(out.disposable),
  };
}

function federalCap(disposable: number, wk: number, minWage = FEDERAL_MIN, multiple = 30, pct = 0.25) {
  return Math.min(disposable * pct, Math.max(0, disposable - multiple * minWage * wk));
}

/** General (federal CCPA) garnishment with the order type. */
export const wageGarnishment: CustomCalculator = (v) => {
  const gross = nonNeg(v.grossPay);
  const disposable = Math.max(0, gross - nonNeg(v.mandatoryDeductions));
  const wk = weeksPer(v.payFrequency);
  const type = Math.round(safeNumber(v.orderType));
  let max = federalCap(disposable, wk);
  if (type === 1) max = disposable * (Math.round(safeNumber(v.supportsOtherFamily)) === 1 ? 0.5 : 0.6) + (Math.round(safeNumber(v.arrears12Weeks)) === 1 ? disposable * 0.05 : 0);
  if (type === 2) max = Math.min(disposable * 0.15, Math.max(0, disposable - 30 * FEDERAL_MIN * wk));
  return garnishResult({ max, disposable }, PERIODS[Math.round(safeNumber(v.payFrequency))] ?? 52);
};

type StateRule = (disposable: number, gross: number, wk: number, v: Record<string, number>) => number;
export const STATE_GARNISH: Record<string, StateRule> = {
  California: (d, _g, wk) => Math.min(0.2 * d, 0.4 * Math.max(0, d - 48 * minWageFor("California") * wk)),
  Illinois: (d, g, wk) => Math.min(0.15 * g, Math.max(0, d - 45 * minWageFor("Illinois") * wk)),
  "New Jersey": (d, g, wk, v) => {
    const annual = g * (52 / wk);
    const fpg250 = 2.5 * (15960 + 5680 * (Math.max(1, Math.round(nonNeg(v.householdSize, 1))) - 1));
    const base = annual <= fpg250 ? 0.1 * g : 0.25 * d;
    return Math.min(base, Math.max(0, d - 30 * FEDERAL_MIN * wk));
  },
  Florida: (d, _g, wk, v) => {
    const head = Math.round(safeNumber(v.headOfFamily)) === 1;
    if (head && d <= 750 * wk) return 0;
    if (head && Math.round(safeNumber(v.agreedInWriting)) !== 1) return 0;
    return federalCap(d, wk);
  },
  Massachusetts: (_d, g, wk) => Math.max(0, g - Math.max(0.85 * g, 50 * minWageFor("Massachusetts") * wk)),
  Maryland: (d, _g, wk) => Math.max(0, d - Math.max(0.75 * d, 30 * minWageFor("Maryland") * wk)),
  Arizona: (d, _g, wk, v) => Math.min((Math.round(safeNumber(v.hardship)) === 1 ? 0.05 : 0.1) * d, Math.max(0, d - 60 * minWageFor("Arizona") * wk)),
  Virginia: (d, _g, wk) => Math.min(0.25 * d, Math.max(0, d - 40 * FEDERAL_MIN * wk)),
};

export const stateGarnishment = (state: string): CustomCalculator => (v) => {
  const gross = nonNeg(v.grossPay);
  const disposable = Math.max(0, gross - nonNeg(v.mandatoryDeductions));
  const wk = weeksPer(v.payFrequency);
  const max = STATE_GARNISH[state](disposable, gross, wk, v);
  // Federal limit always applies as a ceiling for ordinary creditor garnishments.
  return garnishResult({ max: Math.min(max, federalCap(disposable, wk)), disposable }, PERIODS[Math.round(safeNumber(v.payFrequency))] ?? 52);
};

/** Minimum wage by state. */
export const minimumWage: CustomCalculator = (v) => {
  const idx = Math.min(MIN_WAGE_2026.length - 1, Math.max(0, Math.round(safeNumber(v.state))));
  const rate = Math.max(MIN_WAGE_2026[idx][1], FEDERAL_MIN);
  const hours = nonNeg(v.hoursPerWeek, 40);
  const yours = nonNeg(v.yourHourlyRate);
  return {
    minimumWage: rate,
    weeklyPayAtMinimum: round2(rate * hours),
    annualPayAtMinimum: round2(rate * hours * 52),
    amountYouAreUnder: round2(Math.max(0, rate - yours)),
    owedPerWeekIfUnderpaid: round2(Math.max(0, rate - yours) * hours),
    aboveFederalMinimum: round2(rate - FEDERAL_MIN),
  };
};

/** Qualified overtime deduction (2025–2028). */
export const qualifiedOvertime: CustomCalculator = (v) => {
  const premium = nonNeg(v.overtimeHours) * nonNeg(v.regularRate) * 0.5;
  const joint = Math.round(safeNumber(v.filingStatus)) === 1;
  const cap = joint ? 25000 : 12500;
  const threshold = joint ? 300000 : 150000;
  const reduction = Math.ceil(Math.max(0, nonNeg(v.magi) - threshold) / 1000) * 100;
  const deduction = Math.max(0, Math.min(premium, cap) - reduction);
  const rate = Math.min(37, nonNeg(v.marginalRatePercent, 22)) / 100;
  return {
    overtimeDeduction: round2(deduction),
    qualifiedOvertimePremium: round2(premium),
    estimatedTaxSavings: round2(deduction * rate),
    phaseOutReduction: round2(Math.min(reduction, Math.min(premium, cap))),
    deductionCap: cap,
  };
};

/** Exempt vs non-exempt salary test. */
export const EXEMPT_TESTS: [string, number][] = [["Federal (FLSA)", 684], ["California", 1352], ["Washington", 1712.5], ["Custom threshold", 0]];
export const exemptTest: CustomCalculator = (v) => {
  const idx = Math.min(EXEMPT_TESTS.length - 1, Math.max(0, Math.round(safeNumber(v.rule))));
  const threshold = idx === 3 ? nonNeg(v.customWeeklyThreshold) : EXEMPT_TESTS[idx][1];
  const weekly = nonNeg(v.annualSalary) / 52;
  const passes = weekly >= threshold;
  const hourly = nonNeg(v.annualSalary) / (52 * Math.max(1, nonNeg(v.hoursPerWeek, 40)));
  const ot = Math.max(0, nonNeg(v.hoursPerWeek, 40) - 40);
  return {
    meetsSalaryTest: passes ? 1 : 0,
    weeklySalary: round2(weekly),
    weeklyThreshold: round2(threshold),
    annualThreshold: round2(threshold * 52),
    overtimeOwedPerWeekIfNonExempt: round2(passes ? 0 : ot * hourly * 1.5),
  };
};

/** Weighted (blended) regular rate for multiple pay rates, plus bonuses. */
export const weightedOvertime: CustomCalculator = (v) => {
  let pay = 0;
  let hours = 0;
  for (const i of [1, 2, 3]) {
    pay += nonNeg(v[`hours${i}`]) * nonNeg(v[`rate${i}`]);
    hours += nonNeg(v[`hours${i}`]);
  }
  pay += nonNeg(v.nondiscretionaryBonus);
  const regular = hours > 0 ? pay / hours : 0;
  const ot = Math.max(0, hours - 40);
  const premium = ot * regular * 0.5;
  return {
    totalPay: round2(pay + premium),
    regularRate: round2(regular),
    overtimeHours: round2(ot),
    overtimePremium: round2(premium),
    straightTimePay: round2(pay),
  };
};

/** Piece-rate pay: regular rate, overtime premium and minimum wage check. */
export const pieceRate: CustomCalculator = (v) => {
  const pieces = nonNeg(v.piecesCompleted) * nonNeg(v.ratePerPiece);
  const other = nonNeg(v.otherHourlyPay);
  const hours = Math.max(0.01, nonNeg(v.hoursWorked, 40));
  const productive = pieces + other;
  const regular = productive / hours;
  const ot = Math.max(0, nonNeg(v.hoursWorked) - 40);
  const premium = ot * regular * 0.5;
  const minWage = nonNeg(v.minimumWage, 7.25);
  const topUp = Math.max(0, minWage * nonNeg(v.hoursWorked) - productive);
  return {
    totalPay: round2(productive + premium + topUp),
    regularRate: round2(regular),
    overtimePremium: round2(premium),
    minimumWageTopUp: round2(topUp),
    pieceEarnings: round2(pieces),
  };
};

/** Compressed work week (4/10, 9/80, 3/12). */
export const compressedSchedule: CustomCalculator = (v) => {
  const type = Math.round(safeNumber(v.schedule));
  const [daysPer2Weeks, hoursPerDay] = type === 0 ? [8, 10] : type === 1 ? [9, 80 / 9] : [6, 12];
  const daysOffPerYear = 26 * (10 - daysPer2Weeks);
  const rate = nonNeg(v.hourlyRate);
  const dailyOt = Math.round(safeNumber(v.dailyOvertimeState)) === 1 && Math.round(safeNumber(v.adoptedAws)) !== 1 ? Math.max(0, hoursPerDay - 8) * daysPer2Weeks * 26 : 0;
  return {
    extraDaysOffPerYear: daysOffPerYear,
    hoursPerDay: round2(hoursPerDay),
    workdaysPerYear: daysPer2Weeks * 26,
    dailyOvertimeHoursPerYear: round2(dailyOt),
    dailyOvertimeCostPerYear: round2(dailyOt * rate * 0.5),
  };
};

/** California split shift premium (8 CCR 11040 §4(C)). */
export const splitShift: CustomCalculator = (v) => {
  const minWage = nonNeg(v.minimumWage, minWageFor("California"));
  const hours = nonNeg(v.hoursWorked);
  const earned = hours * nonNeg(v.hourlyRate);
  const excess = Math.max(0, earned - hours * minWage);
  const premium = Math.round(safeNumber(v.unpaidBreakOverOneHour, 1)) === 1 ? Math.max(0, minWage - excess) : 0;
  const days = nonNeg(v.splitShiftDays);
  return {
    premiumPerDay: round2(premium),
    premiumForPeriod: round2(premium * days),
    dayEarnings: round2(earned),
    earningsAboveMinimum: round2(excess),
  };
};

/** Firefighter 48/96 schedule pay under FLSA 7(k). */
export const schedule4896: CustomCalculator = (v) => {
  const rate = nonNeg(v.hourlyRate);
  const cycleDays = Math.min(28, Math.max(7, Math.round(nonNeg(v.cycleDays, 24))));
  const threshold = (212 / 28) * cycleDays;
  const hours = 8 * cycleDays; // 48 on / 96 off = 8 hours a day on average
  const ot = Math.max(0, hours - threshold);
  const cycles = 365 / cycleDays;
  const regular = Math.min(hours, threshold) * rate;
  const otPay = ot * rate * 1.5;
  return {
    annualPay: round2((regular + otPay) * cycles),
    hoursPerCycle: round2(hours),
    overtimeHoursPerCycle: round2(ot),
    payPerCycle: round2(regular + otPay),
    annualHours: round2(hours * cycles),
  };
};

/** Davis-Bacon prevailing wage with fringe and overtime on the base rate only. */
export const davisBacon: CustomCalculator = (v) => {
  const base = nonNeg(v.basicHourlyRate);
  const fringe = nonNeg(v.fringeRate);
  const hours = nonNeg(v.hoursWorked, 40);
  const ot = Math.max(0, hours - 40);
  const pay = hours * (base + fringe) + ot * base * 0.5;
  const plan = Math.min(fringe, nonNeg(v.bonaFideFringePerHour));
  return {
    totalWeeklyCompensation: round2(pay),
    cashWagesPaid: round2(pay - plan * hours),
    overtimePremium: round2(ot * base * 0.5),
    totalHourlyPackage: round2(base + fringe),
    fringeCashInLieu: round2((fringe - plan) * hours),
  };
};

/** Prop 22 earnings guarantee for app-based drivers. */
export const prop22: CustomCalculator = (v) => {
  const minWage = nonNeg(v.localMinimumWage, minWageFor("California"));
  const floor = 1.2 * minWage * nonNeg(v.engagedHours) + nonNeg(v.perMileRate, 0.37) * nonNeg(v.engagedMiles);
  const earned = nonNeg(v.earningsExcludingTips);
  return {
    guaranteedMinimum: round2(floor),
    topUpOwed: round2(Math.max(0, floor - earned)),
    hourlyFloor: round2(1.2 * minWage),
    yourEngagedHourly: round2(nonNeg(v.engagedHours) > 0 ? earned / nonNeg(v.engagedHours) : 0),
  };
};

/** Retro (back) pay for a raise that should have started earlier. */
export const retroPay: CustomCalculator = (v) => {
  const diff = Math.max(0, nonNeg(v.newRate) - nonNeg(v.oldRate));
  const hours = nonNeg(v.hoursPerPeriod);
  const periods = nonNeg(v.periodsOwed);
  const otHours = nonNeg(v.overtimeHoursPerPeriod);
  const gross = diff * (hours + otHours * 1.5) * periods;
  return {
    grossRetroPay: round2(gross),
    netRetroPayEstimate: round2(gross * (1 - Math.min(60, nonNeg(v.withholdingPercent, 30)) / 100)),
    differencePerHour: round2(diff),
    retroPerPeriod: round2(periods > 0 ? gross / periods : 0),
  };
};

/** IHSS timesheet: weekly hours, overtime over 40 and the 66-hour cap. */
export const ihss: CustomCalculator = (v) => {
  const rate = nonNeg(v.hourlyRate);
  const weekly = Math.min(66, nonNeg(v.hoursPerWeek));
  const travel = Math.min(7, nonNeg(v.travelHoursPerWeek));
  const ot = Math.max(0, weekly - 40);
  const weeklyPay = (weekly - ot) * rate + ot * rate * 1.5 + travel * rate;
  const authorized = nonNeg(v.monthlyAuthorizedHours);
  return {
    weeklyPay: round2(weeklyPay),
    monthlyPay: round2(weeklyPay * (52 / 12)),
    overtimeHoursPerWeek: round2(ot),
    weeklyMaxFromAuthorization: round2(authorized > 0 ? authorized / 4 : 0),
    overtimePay: round2(ot * rate * 1.5),
  };
};

/** California meal and rest breaks owed for a shift, and premiums. */
export const mealRestBreaks: CustomCalculator = (v) => {
  const h = nonNeg(v.shiftHours);
  const rest = h < 3.5 ? 0 : Math.floor((h + 2) / 4);
  const meals = h > 10 ? 2 : h > 5 ? 1 : 0;
  const missedMeal = Math.round(nonNeg(v.mealsMissed)) > 0 ? 1 : 0;
  const missedRest = Math.round(nonNeg(v.restBreaksMissed)) > 0 ? 1 : 0;
  const premiumPerDay = (missedMeal + missedRest) * nonNeg(v.regularRate);
  const days = nonNeg(v.daysWithViolations, 1);
  return {
    premiumsOwed: round2(premiumPerDay * days),
    restBreaksRequired: rest,
    mealBreaksRequired: meals,
    premiumHoursPerDay: missedMeal + missedRest,
    premiumPerDay: round2(premiumPerDay),
  };
};

export const lawWageCustomCalculators: Record<string, CustomCalculator> = {
  "wage-garnishment-calculator": wageGarnishment,
  "california-wage-garnishment-calculator": stateGarnishment("California"),
  "illinois-wage-garnishment-calculator": stateGarnishment("Illinois"),
  "new-jersey-wage-garnishment-calculator": stateGarnishment("New Jersey"),
  "florida-wage-garnishment-calculator": stateGarnishment("Florida"),
  "massachusetts-wage-garnishment-calculator": stateGarnishment("Massachusetts"),
  "maryland-wage-garnishment-calculator": stateGarnishment("Maryland"),
  "arizona-wage-garnishment-calculator": stateGarnishment("Arizona"),
  "virginia-wage-garnishment-calculator": stateGarnishment("Virginia"),
  "minimum-wage-calculator": minimumWage,
  "qualified-overtime-deduction-calculator": qualifiedOvertime,
  "exempt-vs-non-exempt-calculator": exemptTest,
  "weighted-overtime-calculator": weightedOvertime,
  "piece-rate-calculator": pieceRate,
  "compressed-work-schedule-calculator": compressedSchedule,
  "california-split-shift-calculator": splitShift,
  "48-96-schedule-pay-calculator": schedule4896,
  "davis-bacon-wage-calculator": davisBacon,
  "prop-22-calculator": prop22,
  "retro-pay-calculator": retroPay,
  "ihss-timesheet-calculator": ihss,
  "california-meal-rest-break-calculator": mealRestBreaks,
};
