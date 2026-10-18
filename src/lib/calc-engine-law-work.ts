/**
 * Batch: "Law & Government Calculators" → Employment & Wage Law Calculators —
 * leave, severance, notice, workplace claims and safety (29 tools).
 *
 * Dates travel as day numbers (days since 1970-01-01 UTC) — the calculator
 * widget converts date fields and "date" results.
 *
 * Data:
 *  - UK (from 6 Apr 2026): SSP £123.25 a week or 80% of average weekly
 *    earnings if lower, payable from day 1; statutory redundancy week's pay cap
 *    £751 (max 20 years: ½ week under 22, 1 week 22–40, 1½ weeks 41+);
 *    statutory notice 1 week (1 month–2 years) then 1 week per year up to 12;
 *    holiday 5.6 weeks / 12.07% for irregular hours.
 *  - NHS Agenda for Change sick pay (section 14) by length of service.
 *  - NSW Long Service Act 1955: 2 months (8⅔ weeks) after 10 years, pro rata.
 *  - California: sick leave 1 hour per 30 worked (use may be capped at 40
 *    hours / 5 days, accrual at 80 hours / 10 days); Labor Code §203 waiting
 *    time penalty (daily wage × days late, max 30).
 *  - Saudi Labor Law art. 84–85; UAE Decree-Law 33/2021 art. 51; Ontario ESA
 *    termination and severance pay; Ontario public holiday pay (wages in the 4
 *    weeks before ÷ 20).
 *  - Title VII damages caps by employer size ($50k/$100k/$200k/$300k).
 *  - OSHA rates per 200,000 hours; OSHA Safety Pays indirect cost multipliers.
 *  - FMCSA hours of service (11 driving, 14-hour window, 60/70-hour cycle,
 *    30-minute break after 8 hours); STCW rest (10 hours in 24, 77 in 7 days).
 *  - FERS sick leave: 2,087 hours = one year of service credit.
 *  - Mexico PTU: 10% of taxable profit, half by days worked and half by salary,
 *    capped at the greater of 3 months' salary or the 3-year average.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-work-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

/** Day number helpers (days since 1970-01-01 UTC). */
const DAY_MS = 86400000;
const weekday = (day: number) => new Date(day * DAY_MS).getUTCDay();
export function addBusinessDays(start: number, n: number): number {
  let d = start;
  let left = Math.round(n);
  while (left > 0) {
    d += 1;
    const w = weekday(d);
    if (w !== 0 && w !== 6) left--;
  }
  return d;
}
export function addMonths(day: number, months: number): number {
  const dt = new Date(day * DAY_MS);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + Math.round(months);
  const target = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return Math.round(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(dt.getUTCDate(), last)) / DAY_MS);
}

/** California waiting time penalty (Labor Code §203). */
export const finalPaycheckPenalty: CustomCalculator = (v) => {
  const daily = nonNeg(v.hourlyRate) * nonNeg(v.hoursPerDay, 8);
  const days = Math.min(30, nonNeg(v.daysLate));
  return {
    waitingTimePenalty: round2(daily * days),
    dailyWage: round2(daily),
    daysCounted: days,
    maximumPossiblePenalty: round2(daily * 30),
  };
};

/** Annual leave / PTO accrual and balance. */
export const annualLeave: CustomCalculator = (v) => {
  const perYear = nonNeg(v.daysPerYear, 20);
  const months = nonNeg(v.monthsWorkedThisYear, 12);
  const accrued = (perYear * Math.min(12, months)) / 12 + nonNeg(v.carriedOver);
  const balance = Math.max(0, accrued - nonNeg(v.daysTaken));
  const hoursPerDay = nonNeg(v.hoursPerDay, 8);
  return {
    leaveBalanceDays: round2(balance),
    accruedDays: round2(accrued),
    balanceHours: round2(balance * hoursPerDay),
    payoutValue: round2(balance * hoursPerDay * nonNeg(v.hourlyRate)),
    accrualPerMonth: round2(perYear / 12),
  };
};

export const ptoPayout: CustomCalculator = (v) => {
  const hours = nonNeg(v.unusedPtoHours);
  const rate = nonNeg(v.hourlyRate) || nonNeg(v.annualSalary) / 2080;
  const gross = hours * rate;
  const tax = Math.min(60, nonNeg(v.supplementalTaxPercent, 22) + nonNeg(v.stateTaxPercent) + 7.65) / 100;
  return {
    grossPtoPayout: round2(gross),
    estimatedNetPayout: round2(gross * (1 - tax)),
    hourlyRateUsed: round2(rate),
    estimatedWithholding: round2(gross * tax),
  };
};

export const ukHolidayPay: CustomCalculator = (v) => {
  const irregular = Math.round(safeNumber(v.workPattern)) === 1;
  const daysPerWeek = Math.min(7, nonNeg(v.daysPerWeek, 5));
  const statutoryDays = Math.min(28, 5.6 * daysPerWeek);
  const hoursThisPeriod = nonNeg(v.hoursWorkedInPeriod);
  const accruedHours = hoursThisPeriod * 0.1207;
  const weekPay = nonNeg(v.averageWeeklyPay);
  const dayRate = daysPerWeek > 0 ? weekPay / daysPerWeek : 0;
  return {
    holidayEntitlement: round2(irregular ? accruedHours : statutoryDays),
    entitlementIsHours: irregular ? 1 : 0,
    holidayPayPerDay: round2(dayRate),
    annualHolidayPayValue: round2(irregular ? accruedHours * (nonNeg(v.hourlyRate) || 0) : statutoryDays * dayRate),
    accrualRatePercent: 12.07,
  };
};

export const nswLongService: CustomCalculator = (v) => {
  const years = nonNeg(v.yearsOfService);
  const weeks = years >= 5 ? years * (8.6667 / 10) : 0;
  const pay = weeks * nonNeg(v.ordinaryWeeklyPay);
  const taken = nonNeg(v.weeksAlreadyTaken);
  return {
    longServiceLeaveWeeks: round2(Math.max(0, weeks - taken)),
    totalAccruedWeeks: round2(weeks),
    leaveValue: round2(Math.max(0, weeks - taken) * nonNeg(v.ordinaryWeeklyPay)),
    entitledToTakeLeave: years >= 10 ? 1 : 0,
    proRataOnTermination: years >= 5 ? 1 : 0,
    accruedValueBeforeTaken: round2(pay),
  };
};

export const californiaSickLeave: CustomCalculator = (v) => {
  const hours = nonNeg(v.hoursWorkedThisYear);
  const accrued = hours / 30;
  const capAccrual = Math.round(safeNumber(v.employerCaps, 1)) === 1;
  const balance = Math.min(capAccrual ? 80 : Infinity, nonNeg(v.carriedOverHours) + accrued);
  const usable = capAccrual ? Math.min(40, balance) : balance;
  return {
    sickHoursAccrued: round2(accrued),
    balanceHours: round2(balance),
    usableThisYear: round2(Math.max(0, usable - nonNeg(v.hoursUsed))),
    hoursToNextSickHour: round2(30 - (hours % 30)),
  };
};

export const sickLeaveConversion: CustomCalculator = (v) => {
  const hours = nonNeg(v.unusedSickHours);
  const yearsCredit = hours / 2087;
  const months = Math.floor(yearsCredit * 12);
  const days = Math.round((yearsCredit * 12 - months) * 30);
  const system = Math.round(safeNumber(v.system));
  const annuityPct = system === 1 ? 0.02 : nonNeg(v.ageAtRetirement, 62) >= 62 && nonNeg(v.yearsOfService) >= 20 ? 0.011 : 0.01;
  const added = nonNeg(v.high3Salary) * annuityPct * yearsCredit;
  return {
    serviceCreditYears: round2(yearsCredit),
    serviceCreditMonths: months,
    serviceCreditExtraDays: days,
    addedAnnualAnnuity: round2(added),
    addedMonthlyAnnuity: round2(added / 12),
  };
};

export const SSP_WEEKLY_2026 = 123.25;
export const statutorySickPay: CustomCalculator = (v) => {
  const awe = nonNeg(v.averageWeeklyEarnings);
  const weekly = Math.min(SSP_WEEKLY_2026, 0.8 * awe);
  const qualifyingDays = Math.min(7, Math.max(1, Math.round(nonNeg(v.qualifyingDaysPerWeek, 5))));
  const daily = weekly / qualifyingDays;
  const sickDays = Math.min(28 * qualifyingDays, nonNeg(v.sickDays));
  return {
    totalSsp: round2(daily * sickDays),
    weeklySsp: round2(weekly),
    dailySsp: round2(daily),
    weeksRemainingOf28: round2(Math.max(0, 28 - sickDays / qualifyingDays)),
  };
};

/** NHS AfC section 14 — [full-pay months, half-pay months] by completed years. */
const NHS: [number, number][] = [[1, 2], [2, 2], [4, 4], [5, 5], [5, 5], [6, 6]];
export const nhsSickPay: CustomCalculator = (v) => {
  const y = Math.min(5, Math.floor(nonNeg(v.yearsOfService)));
  const [full, half] = NHS[y];
  const monthly = nonNeg(v.monthlyPay);
  return {
    fullPayMonths: full,
    halfPayMonths: half,
    fullPayValue: round2(full * monthly),
    halfPayValue: round2(half * monthly * 0.5),
    totalSickPayEntitlement: round2(full * monthly + half * monthly * 0.5),
  };
};

export const severancePay: CustomCalculator = (v) => {
  const weekly = nonNeg(v.annualSalary) / 52;
  const years = nonNeg(v.yearsOfService);
  const weeks = Math.min(nonNeg(v.maxWeeks, 52) || Infinity, Math.max(nonNeg(v.minimumWeeks), years * nonNeg(v.weeksPerYear, 2)));
  const gross = weeks * weekly + nonNeg(v.ptoPayout) + nonNeg(v.bonusOrOther);
  const tax = Math.min(60, nonNeg(v.withholdingPercent, 30)) / 100;
  return {
    severancePay: round2(weeks * weekly),
    totalPackage: round2(gross),
    weeksOfPay: round2(weeks),
    afterTaxEstimate: round2(gross * (1 - tax)),
    weeklyPay: round2(weekly),
  };
};

export const saudiEndOfService: CustomCalculator = (v) => {
  const wage = nonNeg(v.monthlyWage);
  const years = nonNeg(v.yearsOfService);
  const full = wage * 0.5 * Math.min(5, years) + wage * Math.max(0, years - 5);
  const resigned = Math.round(safeNumber(v.reason)) === 1;
  const factor = !resigned ? 1 : years < 2 ? 0 : years < 5 ? 1 / 3 : years < 10 ? 2 / 3 : 1;
  return {
    endOfServiceAward: round2(full * factor),
    fullAwardIfTerminated: round2(full),
    resignationFactorPercent: round2(factor * 100),
    monthsOfWage: round2(wage > 0 ? (full * factor) / wage : 0),
  };
};

export const uaeGratuity: CustomCalculator = (v) => {
  const basic = nonNeg(v.monthlyBasicSalary);
  const years = nonNeg(v.yearsOfService);
  const daily = (basic * 12) / 365;
  const days = years < 1 ? 0 : 21 * Math.min(5, years) + 30 * Math.max(0, years - 5);
  const raw = days * daily;
  const cap = basic * 24;
  return {
    gratuity: round2(Math.min(raw, cap)),
    daysOfWage: round2(days),
    dailyBasicWage: round2(daily),
    cappedAtTwoYears: raw > cap ? 1 : 0,
  };
};

export const UK_REDUNDANCY_CAP = 751;
export const ukRedundancy: CustomCalculator = (v) => {
  const age = Math.floor(nonNeg(v.age, 40));
  const years = Math.min(20, Math.floor(nonNeg(v.yearsOfService)));
  const week = Math.min(UK_REDUNDANCY_CAP, nonNeg(v.weeklyPay));
  let weeks = 0;
  for (let i = 0; i < years; i++) {
    const ageThatYear = age - i - 1;
    weeks += ageThatYear >= 41 ? 1.5 : ageThatYear >= 22 ? 1 : 0.5;
  }
  const eligible = nonNeg(v.yearsOfService) >= 2;
  return {
    statutoryRedundancyPay: round2(eligible ? weeks * week : 0),
    weeksOfPay: round2(eligible ? weeks : 0),
    weeklyPayUsed: round2(week),
    eligible: eligible ? 1 : 0,
    maximumPossible: UK_REDUNDANCY_CAP * 30,
  };
};

export const ukNoticePeriod: CustomCalculator = (v) => {
  const years = Math.floor(nonNeg(v.yearsOfService));
  const months = nonNeg(v.yearsOfService) * 12;
  const statutory = months < 1 ? 0 : years < 2 ? 1 : Math.min(12, years);
  const contractual = nonNeg(v.contractualNoticeWeeks) + nonNeg(v.contractualNoticeMonths) * (52 / 12);
  const byEmployer = Math.round(safeNumber(v.whoGivesNotice)) === 0;
  const weeks = byEmployer ? Math.max(statutory, contractual) : Math.max(months >= 1 ? 1 : 0, contractual);
  const start = Math.round(safeNumber(v.noticeGivenDate));
  const end = nonNeg(v.contractualNoticeMonths) > 0 && contractual >= statutory ? addMonths(start, nonNeg(v.contractualNoticeMonths)) + Math.round(nonNeg(v.contractualNoticeWeeks) * 7) : start + Math.round(weeks * 7);
  return {
    lastDayOfEmployment: end,
    noticeWeeks: round2(weeks),
    statutoryMinimumWeeks: byEmployer ? statutory : months >= 1 ? 1 : 0,
    payInLieuValue: round2(weeks * nonNeg(v.weeklyPay)),
  };
};

export const ontarioSeverance: CustomCalculator = (v) => {
  const years = nonNeg(v.yearsOfService);
  const weekly = nonNeg(v.weeklyPay);
  const termWeeks = nonNeg(v.yearsOfService) * 12 < 3 ? 0 : Math.min(8, Math.max(1, Math.floor(years)));
  const qualifies = years >= 5 && Math.round(safeNumber(v.payrollOver25M, 1)) === 1;
  const sevWeeks = qualifies ? Math.min(26, years) : 0;
  return {
    totalEsaEntitlement: round2((termWeeks + sevWeeks) * weekly),
    terminationPay: round2(termWeeks * weekly),
    severancePay: round2(sevWeeks * weekly),
    terminationWeeks: termWeeks,
    severanceWeeks: round2(sevWeeks),
  };
};

export const ontarioStatPay: CustomCalculator = (v) => {
  const wages = nonNeg(v.regularWagesLast4Weeks) + nonNeg(v.vacationPayLast4Weeks);
  const pay = wages / 20;
  const worked = Math.round(safeNumber(v.workedTheHoliday)) === 1;
  const premium = worked ? nonNeg(v.hoursWorkedOnHoliday) * nonNeg(v.hourlyRate) * 1.5 : 0;
  return {
    publicHolidayPay: round2(pay),
    premiumForWorking: round2(premium),
    totalForTheHoliday: round2(pay + premium),
  };
};

export const i9Retention: CustomCalculator = (v) => {
  const hire = Math.round(safeNumber(v.hireDate));
  const terminated = Math.round(safeNumber(v.stillEmployed)) === 0;
  const term = Math.round(safeNumber(v.terminationDate));
  const threeYears = addMonths(hire, 36);
  const oneAfter = addMonths(term, 12);
  const keepUntil = terminated ? Math.max(threeYears, oneAfter) : 0;
  return {
    destroyAfterDate: keepUntil,
    threeYearsAfterHire: threeYears,
    oneYearAfterTermination: terminated ? oneAfter : 0,
    mustKeepWhileEmployed: terminated ? 0 : 1,
  };
};

export const noticePeriod: CustomCalculator = (v) => {
  const start = Math.round(safeNumber(v.noticeDate));
  const n = nonNeg(v.noticeLength, 14);
  const unit = Math.round(safeNumber(v.unit));
  const end = unit === 0 ? start + Math.round(n) : unit === 1 ? addBusinessDays(start, n) : unit === 2 ? start + Math.round(n * 7) : addMonths(start, n);
  return {
    lastDay: end,
    calendarDays: end - start,
    weeksOfNotice: round2((end - start) / 7),
  };
};

const TITLE_VII_CAP = (employees: number) => (employees < 15 ? 0 : employees <= 100 ? 50000 : employees <= 200 ? 100000 : employees <= 500 ? 200000 : 300000);

function claimEstimate(v: Record<string, number>, capped: boolean) {
  const monthly = nonNeg(v.annualSalary) / 12;
  const back = Math.max(0, monthly * nonNeg(v.monthsUnemployed) - nonNeg(v.interimEarnings));
  const front = monthly * nonNeg(v.frontPayMonths);
  const emotional = nonNeg(v.emotionalDistressDamages);
  const punitive = nonNeg(v.punitiveDamages);
  const cap = capped ? TITLE_VII_CAP(nonNeg(v.employerSize, 501)) : Infinity;
  const comp = Math.min(cap, emotional + punitive);
  const gross = back + front + comp;
  const fees = gross * (Math.min(50, nonNeg(v.attorneyFeePercent, 33)) / 100);
  const likelihood = Math.min(100, nonNeg(v.chanceOfWinningPercent, 100)) / 100;
  return {
    estimatedSettlementValue: round2(gross * likelihood),
    backPay: round2(back),
    frontPay: round2(front),
    compensatoryAndPunitive: round2(comp),
    attorneyFees: round2(fees * likelihood),
    netToYou: round2((gross - fees) * likelihood),
    damagesCap: Number.isFinite(cap) ? cap : 0,
  };
}
export const wrongfulTermination: CustomCalculator = (v) => claimEstimate(v, false);
export const discriminationSettlement: CustomCalculator = (v) => claimEstimate(v, true);

export const payGap: CustomCalculator = (v) => {
  const a = nonNeg(v.higherGroupPay);
  const b = nonNeg(v.lowerGroupPay);
  const gap = a > 0 ? (a - b) / a : 0;
  const hours = nonNeg(v.annualHours, 2080);
  return {
    payGapPercent: round2(gap * 100),
    centsPerDollar: round2(a > 0 ? (b / a) * 100 : 0),
    annualDifference: round2((a - b) * (nonNeg(v.payIsHourly) === 1 ? hours : 1)),
    daysWorkedForFreePerYear: round2(gap * 260),
  };
};

export const oshaRates: CustomCalculator = (v) => {
  const hours = Math.max(1, nonNeg(v.totalHoursWorked, 200000));
  const f = 200000 / hours;
  return {
    trir: round2(nonNeg(v.recordableCases) * f),
    dartRate: round2(nonNeg(v.dartCases) * f),
    lostTimeRate: round2(nonNeg(v.lostTimeCases) * f),
    severityRate: round2(nonNeg(v.daysAwayTotal) * f),
    equivalentFullTimeWorkers: round2(hours / 2000),
  };
};

export const safetyPays: CustomCalculator = (v) => {
  const direct = nonNeg(v.directCost);
  const mult = direct < 3000 ? 4.5 : direct < 5000 ? 1.6 : direct < 10000 ? 1.2 : 1.1;
  const indirect = direct * mult;
  const margin = Math.max(0.1, nonNeg(v.profitMarginPercent, 5)) / 100;
  return {
    totalCost: round2(direct + indirect),
    indirectCost: round2(indirect),
    indirectMultiplier: mult,
    salesNeededToCover: round2((direct + indirect) / margin),
  };
};

export const hoursOfService: CustomCalculator = (v) => {
  const drive = nonNeg(v.drivingHoursToday);
  const window = nonNeg(v.hoursSinceOnDuty);
  const cycleCap = Math.round(safeNumber(v.cycle)) === 1 ? 70 : 60;
  const used = nonNeg(v.onDutyHoursInCycle);
  const sinceBreak = nonNeg(v.drivingSinceLastBreak);
  const left = Math.max(0, Math.min(11 - drive, 14 - window, cycleCap - used));
  return {
    drivingHoursLeft: round2(left),
    elevenHourLimitLeft: round2(Math.max(0, 11 - drive)),
    fourteenHourWindowLeft: round2(Math.max(0, 14 - window)),
    cycleHoursLeft: round2(Math.max(0, cycleCap - used)),
    breakNeededWithinHours: round2(Math.max(0, 8 - sinceBreak)),
  };
};

export const stcwRest: CustomCalculator = (v) => {
  const r24 = nonNeg(v.restHoursLast24);
  const r7 = nonNeg(v.restHoursLast7Days);
  const periods = Math.round(nonNeg(v.restPeriodsIn24, 2));
  const longest = nonNeg(v.longestRestPeriod);
  const ok24 = r24 >= 10;
  const ok7 = r7 >= 77;
  const okSplit = periods <= 2 && longest >= 6;
  return {
    compliant: ok24 && ok7 && okSplit ? 1 : 0,
    restShortfall24h: round2(Math.max(0, 10 - r24)),
    restShortfall7Days: round2(Math.max(0, 77 - r7)),
    restSplitOk: okSplit ? 1 : 0,
  };
};

export const fringeRate: CustomCalculator = (v) => {
  const wages = Math.max(1, nonNeg(v.annualWages));
  const benefits = nonNeg(v.healthInsurance) + nonNeg(v.retirement) + nonNeg(v.payrollTaxes) + nonNeg(v.paidLeaveValue) + nonNeg(v.otherBenefits);
  return {
    fringeBenefitRate: round2((benefits / wages) * 100),
    totalBenefitsCost: round2(benefits),
    totalCompensation: round2(wages + benefits),
    fringePerHour: round2(benefits / Math.max(1, nonNeg(v.annualHours, 2080))),
  };
};

export const unionDues: CustomCalculator = (v) => {
  const gross = nonNeg(v.grossPayPerPeriod);
  const periods = nonNeg(v.periodsPerYear, 26);
  const pctDues = gross * (nonNeg(v.duesPercent) / 100);
  const hourly = nonNeg(v.hoursPerPeriod) * nonNeg(v.duesPerHour);
  const per = pctDues + hourly + nonNeg(v.flatDuesPerPeriod);
  return {
    duesPerPaycheck: round2(per),
    annualDues: round2(per * periods + nonNeg(v.initiationFee)),
    percentOfPay: round2(gross > 0 ? (per / gross) * 100 : 0),
  };
};

export const longevityPay: CustomCalculator = (v) => {
  const years = nonNeg(v.yearsOfService);
  const start = nonNeg(v.startsAfterYears, 5);
  const steps = years >= start ? Math.floor((years - start) / Math.max(1, nonNeg(v.everyYears, 5))) + 1 : 0;
  const amount = steps * nonNeg(v.amountPerStep) + nonNeg(v.annualSalary) * (steps * nonNeg(v.percentPerStep)) / 100;
  return {
    annualLongevityPay: round2(amount),
    longevitySteps: steps,
    perPaycheck: round2(amount / Math.max(1, nonNeg(v.periodsPerYear, 26))),
  };
};

export const ptu: CustomCalculator = (v) => {
  const pool = nonNeg(v.companyTaxableProfit) * 0.1;
  const daysAll = Math.max(1, nonNeg(v.totalDaysAllEmployees));
  const salAll = Math.max(1, nonNeg(v.totalSalariesAllEmployees));
  const byDays = (pool / 2) * (nonNeg(v.yourDaysWorked) / daysAll);
  const bySalary = (pool / 2) * (nonNeg(v.yourAnnualSalary) / salAll);
  const raw = byDays + bySalary;
  const cap = Math.max(nonNeg(v.yourMonthlySalary) * 3, nonNeg(v.yourAveragePtuLast3Years));
  return {
    yourPtu: round2(Math.min(raw, cap)),
    shareByDaysWorked: round2(byDays),
    shareBySalary: round2(bySalary),
    companyPtuPool: round2(pool),
    cappedAmount: raw > cap ? 1 : 0,
  };
};

export const lawWorkCustomCalculators: Record<string, CustomCalculator> = {
  "final-paycheck-penalty-calculator": finalPaycheckPenalty,
  "annual-leave-calculator": annualLeave,
  "pto-payout-calculator": ptoPayout,
  "uk-holiday-pay-calculator": ukHolidayPay,
  "nsw-long-service-leave-calculator": nswLongService,
  "california-sick-leave-calculator": californiaSickLeave,
  "sick-leave-conversion-calculator": sickLeaveConversion,
  "statutory-sick-pay-calculator": statutorySickPay,
  "nhs-sick-pay-calculator": nhsSickPay,
  "severance-pay-calculator": severancePay,
  "saudi-end-of-service-calculator": saudiEndOfService,
  "uae-gratuity-calculator": uaeGratuity,
  "uk-redundancy-pay-calculator": ukRedundancy,
  "uk-notice-period-calculator": ukNoticePeriod,
  "ontario-severance-pay-calculator": ontarioSeverance,
  "ontario-stat-holiday-pay-calculator": ontarioStatPay,
  "i-9-retention-calculator": i9Retention,
  "notice-period-calculator": noticePeriod,
  "wrongful-termination-settlement-calculator": wrongfulTermination,
  "discrimination-settlement-calculator": discriminationSettlement,
  "pay-gap-calculator": payGap,
  "osha-incident-rate-calculator": oshaRates,
  "osha-safety-pays-calculator": safetyPays,
  "dot-hours-of-service-calculator": hoursOfService,
  "stcw-hours-of-rest-calculator": stcwRest,
  "fringe-benefit-rate-calculator": fringeRate,
  "union-dues-calculator": unionDues,
  "longevity-pay-calculator": longevityPay,
  "mexico-ptu-calculator": ptu,
};
