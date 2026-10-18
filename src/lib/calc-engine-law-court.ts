/**
 * Batch: "Law & Government Calculators" → Court, Criminal & Legal Fee
 * Calculators (68 tools).
 *
 * Dates travel as day numbers (days since 1970-01-01 UTC); the calculator
 * widget converts date fields and "date" results.
 *
 * Data:
 *  - Court holidays: US federal holidays (5 U.S.C. §6103, Saturday → Friday,
 *    Sunday → Monday); California judicial holidays (CCP §135: adds Lincoln's
 *    Birthday, César Chávez Day, Native American Day and the day after
 *    Thanksgiving; no Columbus Day); Texas, Florida and Michigan add the day
 *    after Thanksgiving.
 *  - Deadline rules: FRCP 6 (+3 days for mail), CCP §12/12a and §1013 (+5
 *    days mail in CA, +2 court days electronic), TRCP 4 and 99 (answer due the
 *    Monday after 20 days), Fla. R. Gen. Prac. & Jud. Admin. 2.514, MCR 1.108,
 *    N.J. R. 1:6-3 (16 / 8 / 4 days before the return date), CPLR 2214(b)
 *    (8 or 16 days' notice, +5 mail), Speedy Trial Act (30 / 70 days), TILA
 *    rescission (3 business days, Sundays and federal holidays excluded), CA
 *    3-day notice (CCP §1161: weekends and judicial holidays excluded).
 *  - USSG Sentencing Table (Guidelines Manual, Nov 1 2025); Florida Criminal
 *    Punishment Code lowest permissible sentence ((points − 28) × 0.75 months
 *    over 44 points); Indiana IC 35-50-2 ranges and IC 35-50-6 credit classes;
 *    Missouri §558.011 ranges and §558.019 minimum prison terms.
 *  - Means test: Census median family income by family size for cases filed on
 *    or after 15 July 2026 (+$11,100 per person above 4); presumption
 *    thresholds $10,275 / $17,150 over 60 months.
 *  - Judgment interest: California 10% (CCP §685.010), New York 9% (CPLR
 *    5004), North Carolina 8% (G.S. 24-1); Florida, Texas, Louisiana and
 *    federal rates change periodically and are inputs.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-court-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const day = (v: number) => Math.round(safeNumber(v));

// --- Calendar helpers ----------------------------------------------------------------------------
const DAY_MS = 86400000;
const dateOf = (d: number) => new Date(d * DAY_MS);
const dn = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m, d) / DAY_MS);
export const weekday = (d: number) => dateOf(d).getUTCDay();
const nthWeekday = (y: number, m: number, wd: number, n: number) => {
  const first = dn(y, m, 1);
  return first + ((wd - weekday(first) + 7) % 7) + (n - 1) * 7;
};
const lastWeekday = (y: number, m: number, wd: number) => {
  const last = dn(y, m + 1, 0);
  return last - ((weekday(last) - wd + 7) % 7);
};
const observed = (d: number) => (weekday(d) === 6 ? d - 1 : weekday(d) === 0 ? d + 1 : d);

export type HolidaySet = "federal" | "california" | "texas" | "florida" | "michigan" | "none";
const holidayCache = new Map<string, Set<number>>();
export function holidays(year: number, set: HolidaySet): Set<number> {
  const key = `${set}-${year}`;
  if (holidayCache.has(key)) return holidayCache.get(key)!;
  const h = new Set<number>();
  if (set !== "none") {
    const thanksgiving = nthWeekday(year, 10, 4, 4);
    [dn(year, 0, 1), dn(year, 5, 19), dn(year, 6, 4), dn(year, 10, 11), dn(year, 11, 25)].forEach((d) => h.add(observed(d)));
    [nthWeekday(year, 0, 1, 3), nthWeekday(year, 1, 1, 3), lastWeekday(year, 4, 1), nthWeekday(year, 8, 1, 1), thanksgiving].forEach((d) => h.add(d));
    if (set !== "california") h.add(nthWeekday(year, 9, 1, 2)); // Columbus / Indigenous Peoples' Day
    if (set === "california") {
      h.add(observed(dn(year, 1, 12)));
      h.add(observed(dn(year, 2, 31)));
      h.add(nthWeekday(year, 8, 5, 4));
    }
    if (set !== "federal") h.add(thanksgiving + 1);
  }
  holidayCache.set(key, h);
  return h;
}
export const isHoliday = (d: number, set: HolidaySet) => holidays(dateOf(d).getUTCFullYear(), set).has(d);
export const isCourtDay = (d: number, set: HolidaySet) => weekday(d) !== 0 && weekday(d) !== 6 && !isHoliday(d, set);
export const rollForward = (d: number, set: HolidaySet) => {
  let x = d;
  while (!isCourtDay(x, set)) x++;
  return x;
};
export const rollBackward = (d: number, set: HolidaySet) => {
  let x = d;
  while (!isCourtDay(x, set)) x--;
  return x;
};
export function addCourtDays(d: number, n: number, set: HolidaySet): number {
  let x = d;
  let left = Math.round(n);
  const step = left >= 0 ? 1 : -1;
  left = Math.abs(left);
  while (left > 0) {
    x += step;
    if (isCourtDay(x, set)) left--;
  }
  return x;
}
export function addMonths(d: number, months: number): number {
  const dt = dateOf(d);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + Math.round(months);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return dn(y, m, Math.min(dt.getUTCDate(), lastDay));
}

const HOLIDAY_SETS: HolidaySet[] = ["federal", "california", "texas", "florida", "michigan", "none"];
const setOf = (v: number) => HOLIDAY_SETS[Math.min(5, Math.max(0, Math.round(safeNumber(v))))];

/** General deadline: count calendar or court days, add service days, roll off weekends/holidays. */
function computeDeadline(start: number, days: number, courtDays: boolean, set: HolidaySet, serviceExtraCalendar = 0, serviceExtraCourt = 0, backwards = false) {
  let end: number;
  if (courtDays) end = addCourtDays(start, backwards ? -days : days, set);
  else end = start + (backwards ? -Math.round(days) : Math.round(days));
  end += Math.round(serviceExtraCalendar);
  if (serviceExtraCourt) end = addCourtDays(end, serviceExtraCourt, set);
  const final = backwards ? rollBackward(end, set) : rollForward(end, set);
  return { end: final, raw: end };
}

export const courtDeadline = (fixedSet?: HolidaySet, serviceRule?: "frcp" | "ca" | "fl"): CustomCalculator => (v) => {
  const set = fixedSet ?? setOf(v.holidaySet);
  const start = day(v.triggerDate);
  const days = nonNeg(v.daysAllowed, 30);
  const courtDays = Math.round(safeNumber(v.countMethod)) === 1;
  const service = Math.round(safeNumber(v.serviceMethod));
  let extraCal = 0;
  let extraCourt = 0;
  if (service === 1) extraCal = serviceRule === "ca" ? 5 : serviceRule === "fl" ? 5 : 3; // mail
  if (service === 2) extraCal = serviceRule === "ca" ? 10 : serviceRule === "fl" ? 5 : 3; // mail out of state / outside the US (CA +10)
  if (service === 3 && serviceRule === "ca") extraCourt = 2; // electronic / overnight in CA: +2 court days
  const backwards = Math.round(safeNumber(v.direction)) === 1;
  const r = computeDeadline(start, days, courtDays, set, backwards ? -extraCal : extraCal, backwards ? -extraCourt : extraCourt, backwards);
  return {
    deadline: r.end,
    calendarDaysFromTrigger: Math.abs(r.end - start),
    rolledForwardDays: Math.abs(r.end - r.raw),
    deadlineWeekday: weekday(r.end),
  };
};

/** Texas answer date: 10:00 a.m. on the Monday next after 20 days from service (TRCP 99(b)). */
export const texasDeadline: CustomCalculator = (v) => {
  const general = courtDeadline("texas")(v) as Record<string, number>;
  const served = day(v.triggerDate);
  const after20 = served + 20;
  let monday = after20 + ((8 - weekday(after20)) % 7 || 7);
  monday = rollForward(monday, "texas");
  return { ...general, answerDueDate: monday };
};

export const njMotionDates: CustomCalculator = (v) => {
  const ret = day(v.returnDate);
  const set: HolidaySet = "federal";
  return {
    fileAndServeBy: rollBackward(ret - 16, set),
    oppositionDue: rollBackward(ret - 8, set),
    replyDue: rollBackward(ret - 4, set),
    returnDateIsFriday: weekday(ret) === 5 ? 1 : 0,
  };
};

export const nyMotionDates: CustomCalculator = (v) => {
  const ret = day(v.returnDate);
  const demand = Math.round(safeNumber(v.demandAnsweringPapers)) === 1;
  const svc = Math.round(safeNumber(v.serviceMethod));
  const extra = svc === 1 ? 5 : svc === 2 ? 1 : 0;
  const notice = demand ? 16 : 8;
  return {
    serveMotionBy: rollBackward(ret - notice - extra, "federal"),
    answeringPapersDue: demand ? rollBackward(ret - 7, "federal") : 0,
    replyPapersDue: demand ? rollBackward(ret - 1, "federal") : 0,
    noticeDaysRequired: notice + extra,
  };
};

export const speedyTrial: CustomCalculator = (v) => {
  const arrest = day(v.arrestDate);
  const excl = Math.round(nonNeg(v.excludableDays));
  const indictDeadline = arrest + 30 + Math.round(nonNeg(v.excludableBeforeIndictment));
  const indicted = day(v.indictmentOrAppearanceDate) || indictDeadline;
  const trialDeadline = Math.max(indicted, arrest) + 70 + excl;
  return {
    trialDeadline,
    indictmentDeadline: indictDeadline,
    daysAllowedForTrial: 70 + excl,
    earliestTrialWithoutConsent: indicted + 30,
  };
};

export const statuteOfLimitations: CustomCalculator = (v) => {
  const start = day(v.eventDate);
  const years = nonNeg(v.years, 2);
  const months = nonNeg(v.months);
  const end = addMonths(start, Math.round(years * 12 + months)) + Math.round(nonNeg(v.tollingDays));
  const today = day(v.todayDate);
  return {
    filingDeadline: rollForward(end, "federal"),
    daysRemaining: Math.max(0, rollForward(end, "federal") - today),
    expired: today > rollForward(end, "federal") ? 1 : 0,
  };
};

export const rescission: CustomCalculator = (v) => {
  const start = Math.max(day(v.signingDate), day(v.disclosuresDate) || 0, day(v.noticeOfRightDate) || 0);
  let d = start;
  let left = 3;
  while (left > 0) {
    d++;
    if (weekday(d) !== 0 && !isHoliday(d, "federal")) left--;
  }
  return {
    rescissionDeadline: d,
    loanFundsNoEarlierThan: d + 1,
    calendarDaysCounted: d - start,
  };
};

export const californiaThreeDayNotice: CustomCalculator = (v) => {
  const served = day(v.serviceDate);
  const end = addCourtDays(served, 3, "california");
  return {
    lastDayToPayOrComply: end,
    earliestDayToFileUnlawfulDetainer: addCourtDays(end, 1, "california"),
    calendarDays: end - served,
  };
};

export const leaseEndDate: CustomCalculator = (v) => {
  const start = day(v.startDate);
  const months = Math.round(nonNeg(v.termMonths, 12)) + Math.round(nonNeg(v.extensionMonths));
  const end = addMonths(start, months) - 1;
  const notice = Math.round(nonNeg(v.noticeDays, 30));
  return {
    leaseEndDate: end,
    noticeDeadline: end - notice,
    totalDays: end - start + 1,
    totalMonths: months,
  };
};

export const csed: CustomCalculator = (v) => {
  const assessed = day(v.assessmentDate);
  const end = addMonths(assessed, 120) + Math.round(nonNeg(v.tollingDays));
  const today = day(v.todayDate);
  return {
    collectionExpirationDate: end,
    daysRemaining: Math.max(0, end - today),
    yearsRemaining: round2(Math.max(0, end - today) / 365.25),
    expired: today > end ? 1 : 0,
  };
};

export const legalAge: CustomCalculator = (v) => {
  const birth = day(v.birthDate);
  const today = day(v.todayDate);
  const ageDays = today - birth;
  const b = dateOf(birth);
  const t = dateOf(today);
  let age = t.getUTCFullYear() - b.getUTCFullYear();
  if (t.getUTCMonth() < b.getUTCMonth() || (t.getUTCMonth() === b.getUTCMonth() && t.getUTCDate() < b.getUTCDate())) age--;
  const majority = Math.round(nonNeg(v.ageOfMajority, 18));
  return {
    currentAge: age,
    reachesMajorityOn: addMonths(birth, majority * 12),
    turns21On: addMonths(birth, 252),
    isAdult: age >= majority ? 1 : 0,
    ageInDays: ageDays,
  };
};

// --- Release dates -------------------------------------------------------------------------------
function sentenceDays(v: Record<string, number>) {
  return Math.round(nonNeg(v.sentenceYears) * 365.25 + nonNeg(v.sentenceMonths) * 30.44 + nonNeg(v.sentenceDays));
}
function releaseResult(start: number, total: number, served: number, credit: number) {
  const release = start + Math.max(0, Math.round(served - credit));
  return {
    estimatedReleaseDate: release,
    fullTermDate: start + total - Math.round(credit),
    daysToServe: Math.max(0, Math.round(served - credit)),
    percentOfSentence: round2(total > 0 ? (served / total) * 100 : 0),
    creditApplied: Math.round(credit),
  };
}

export const jailRelease: CustomCalculator = (v) => {
  const total = sentenceDays(v);
  const pct = Math.min(100, nonNeg(v.percentToServe, 100)) / 100;
  const goodPerMonth = nonNeg(v.goodTimeDaysPerMonth);
  const servedByPct = total * pct;
  const servedByGood = goodPerMonth > 0 ? total / (1 + goodPerMonth / 30.44) : total;
  return releaseResult(day(v.startDate), total, Math.min(servedByPct, servedByGood), nonNeg(v.jailCreditDays));
};

export const federalRelease: CustomCalculator = (v) => {
  const total = sentenceDays(v);
  const gct = total > 365 ? Math.floor((total / 365) * 54) : 0;
  const fsa = Math.min(365, Math.floor(nonNeg(v.programmingDays) / 30) * (Math.round(safeNumber(v.minimumOrLowRisk, 1)) === 1 ? 15 : 10));
  const rdap = Math.round(safeNumber(v.rdapCompleted)) === 1 ? Math.min(365, nonNeg(v.rdapReductionDays, 365)) : 0;
  const served = Math.max(0, total - gct - fsa - rdap);
  return { ...releaseResult(day(v.startDate), total, served, nonNeg(v.jailCreditDays)), goodConductTime: gct, firstStepActCredits: fsa, rdapReduction: rdap };
};

export const STATE_RELEASE: Record<string, (v: Record<string, number>, total: number) => number> = {
  Florida: (_v, t) => t * 0.85,
  Indiana: (v, t) => t * [0.5, 0.75, 6 / 7, 1][Math.min(3, Math.max(0, Math.round(safeNumber(v.creditClass))))],
  Kentucky: (v, t) => (Math.round(safeNumber(v.violentOffense)) === 1 ? t * 0.85 : t / (1 + nonNeg(v.goodTimeDaysPerMonth, 10) / 30.44)),
  Ohio: (v, t) => t * (1 - Math.min(0.08, (nonNeg(v.earnedCreditDays) || 0) / Math.max(1, t))),
  California: (v, t) => t * [0.5, 0.85, 2 / 3, 1][Math.min(3, Math.max(0, Math.round(safeNumber(v.creditType))))],
  Texas: (v, t) => t * [0.5, 1, 0.25, 0.5][Math.min(3, Math.max(0, Math.round(safeNumber(v.offenseType))))],
};
export const stateRelease = (state: string): CustomCalculator => (v) => {
  const total = sentenceDays(v);
  return releaseResult(day(v.startDate), total, STATE_RELEASE[state](v, total), nonNeg(v.jailCreditDays));
};

// --- Sentencing ---------------------------------------------------------------------------------
/** USSG Sentencing Table, Nov 1 2025: [min, max] months by offense level (1–43) × criminal history category (I–VI); 9999 = life. */
export const USSG: [number, number][][] = [
  [[0, 6], [0, 6], [0, 6], [0, 6], [0, 6], [0, 6]],
  [[0, 6], [0, 6], [0, 6], [0, 6], [0, 6], [1, 7]],
  [[0, 6], [0, 6], [0, 6], [0, 6], [2, 8], [3, 9]],
  [[0, 6], [0, 6], [0, 6], [2, 8], [4, 10], [6, 12]],
  [[0, 6], [0, 6], [1, 7], [4, 10], [6, 12], [9, 15]],
  [[0, 6], [1, 7], [2, 8], [6, 12], [9, 15], [12, 18]],
  [[0, 6], [2, 8], [4, 10], [8, 14], [12, 18], [15, 21]],
  [[0, 6], [4, 10], [6, 12], [10, 16], [15, 21], [18, 24]],
  [[4, 10], [6, 12], [8, 14], [12, 18], [18, 24], [21, 27]],
  [[6, 12], [8, 14], [10, 16], [15, 21], [21, 27], [24, 30]],
  [[8, 14], [10, 16], [12, 18], [18, 24], [24, 30], [27, 33]],
  [[10, 16], [12, 18], [15, 21], [21, 27], [27, 33], [30, 37]],
  [[12, 18], [15, 21], [18, 24], [24, 30], [30, 37], [33, 41]],
  [[15, 21], [18, 24], [21, 27], [27, 33], [33, 41], [37, 46]],
  [[18, 24], [21, 27], [24, 30], [30, 37], [37, 46], [41, 51]],
  [[21, 27], [24, 30], [27, 33], [33, 41], [41, 51], [46, 57]],
  [[24, 30], [27, 33], [30, 37], [37, 46], [46, 57], [51, 63]],
  [[27, 33], [30, 37], [33, 41], [41, 51], [51, 63], [57, 71]],
  [[30, 37], [33, 41], [37, 46], [46, 57], [57, 71], [63, 78]],
  [[33, 41], [37, 46], [41, 51], [51, 63], [63, 78], [70, 87]],
  [[37, 46], [41, 51], [46, 57], [57, 71], [70, 87], [77, 96]],
  [[41, 51], [46, 57], [51, 63], [63, 78], [77, 96], [84, 105]],
  [[46, 57], [51, 63], [57, 71], [70, 87], [84, 105], [92, 115]],
  [[51, 63], [57, 71], [63, 78], [77, 96], [92, 115], [100, 125]],
  [[57, 71], [63, 78], [70, 87], [84, 105], [100, 125], [110, 137]],
  [[63, 78], [70, 87], [78, 97], [92, 115], [110, 137], [120, 150]],
  [[70, 87], [78, 97], [87, 108], [100, 125], [120, 150], [130, 162]],
  [[78, 97], [87, 108], [97, 121], [110, 137], [130, 162], [140, 175]],
  [[87, 108], [97, 121], [108, 135], [121, 151], [140, 175], [151, 188]],
  [[97, 121], [108, 135], [121, 151], [135, 168], [151, 188], [168, 210]],
  [[108, 135], [121, 151], [135, 168], [151, 188], [168, 210], [188, 235]],
  [[121, 151], [135, 168], [151, 188], [168, 210], [188, 235], [210, 262]],
  [[135, 168], [151, 188], [168, 210], [188, 235], [210, 262], [235, 293]],
  [[151, 188], [168, 210], [188, 235], [210, 262], [235, 293], [262, 327]],
  [[168, 210], [188, 235], [210, 262], [235, 293], [262, 327], [292, 365]],
  [[188, 235], [210, 262], [235, 293], [262, 327], [292, 365], [324, 405]],
  [[210, 262], [235, 293], [262, 327], [292, 365], [324, 405], [360, 9999]],
  [[235, 293], [262, 327], [292, 365], [324, 405], [360, 9999], [360, 9999]],
  [[262, 327], [292, 365], [324, 405], [360, 9999], [360, 9999], [360, 9999]],
  [[292, 365], [324, 405], [360, 9999], [360, 9999], [360, 9999], [360, 9999]],
  [[324, 405], [360, 9999], [360, 9999], [360, 9999], [360, 9999], [360, 9999]],
  [[360, 9999], [360, 9999], [360, 9999], [360, 9999], [360, 9999], [360, 9999]],
  [[9999, 9999], [9999, 9999], [9999, 9999], [9999, 9999], [9999, 9999], [9999, 9999]],
];

/** Means test medians (cases filed on or after 15 July 2026): [state, 1 person, 2, 3, 4]. */
export const MEANS_MEDIANS: [string, number, number, number, number][] = [
  ["Alabama", 64321, 77451, 92698, 106740],
  ["Alaska", 85817, 112548, 112548, 142136],
  ["Arizona", 73935, 89027, 104965, 121174],
  ["Arkansas", 58421, 73630, 82329, 97054],
  ["California", 79253, 102797, 116541, 139071],
  ["Colorado", 87940, 109497, 130850, 153501],
  ["Connecticut", 84302, 106224, 134470, 159934],
  ["Delaware", 69515, 94877, 111273, 132244],
  ["District of Columbia", 85391, 161397, 161397, 166598],
  ["Florida", 69876, 86523, 97540, 114761],
  ["Georgia", 68478, 84965, 101479, 123481],
  ["Hawaii", 85254, 106202, 123454, 142181],
  ["Idaho", 73413, 86160, 98381, 119662],
  ["Illinois", 73180, 93934, 113625, 137902],
  ["Indiana", 64461, 81986, 95627, 115656],
  ["Iowa", 67617, 88800, 104133, 126058],
  ["Kansas", 69197, 87441, 103852, 125971],
  ["Kentucky", 61652, 73892, 85212, 109443],
  ["Louisiana", 59447, 72348, 84602, 103628],
  ["Maine", 75892, 90445, 106822, 131577],
  ["Maryland", 86928, 114611, 135949, 166173],
  ["Massachusetts", 88202, 112708, 139411, 178524],
  ["Michigan", 67352, 83432, 103449, 123010],
  ["Minnesota", 77696, 98328, 126487, 149882],
  ["Mississippi", 53978, 70328, 82846, 97464],
  ["Missouri", 64972, 82075, 100228, 118530],
  ["Montana", 71310, 91452, 103285, 121698],
  ["Nebraska", 66922, 90728, 103405, 125074],
  ["Nevada", 72222, 87914, 101638, 114110],
  ["New Hampshire", 87287, 109324, 141531, 155203],
  ["New Jersey", 87173, 106876, 137136, 168127],
  ["New Mexico", 66235, 79574, 88041, 98602],
  ["New York", 73272, 92902, 115579, 139040],
  ["North Carolina", 67117, 84384, 101535, 116737],
  ["North Dakota", 73549, 96352, 106686, 137817],
  ["Ohio", 66239, 83725, 102504, 123702],
  ["Oklahoma", 61180, 77208, 86845, 101798],
  ["Oregon", 79089, 93670, 116729, 140024],
  ["Pennsylvania", 72230, 87534, 110151, 135862],
  ["Rhode Island", 77653, 98736, 119419, 137479],
  ["South Carolina", 64808, 83761, 95672, 116314],
  ["South Dakota", 69190, 89809, 100883, 130738],
  ["Tennessee", 63979, 82846, 97511, 109585],
  ["Texas", 66837, 86714, 99273, 117962],
  ["Utah", 87898, 95757, 112751, 131741],
  ["Vermont", 72461, 96963, 114075, 137583],
  ["Virginia", 78491, 101171, 123159, 144826],
  ["Washington", 88585, 107100, 131737, 156567],
  ["West Virginia", 63908, 68592, 92050, 93672],
  ["Wisconsin", 71168, 90252, 108516, 133384],
  ["Wyoming", 71745, 91502, 98476, 110297],
];

export const chcFromPoints = (pts: number) => {
  const p = Math.round(nonNeg(pts));
  return p <= 1 ? 0 : p <= 3 ? 1 : p <= 6 ? 2 : p <= 9 ? 3 : p <= 12 ? 4 : 5;
};

export const federalSentencing: CustomCalculator = (v) => {
  let level = Math.round(nonNeg(v.baseOffenseLevel, 20) + safeNumber(v.specificOffenseAdjustments) + safeNumber(v.adjustments));
  const accept = Math.round(safeNumber(v.acceptanceOfResponsibility));
  if (accept === 1) level -= 2;
  if (accept === 2) level -= level >= 16 ? 3 : 2;
  level = Math.min(43, Math.max(1, level));
  const chc = chcFromPoints(v.criminalHistoryPoints);
  const [lo, hi] = USSG[level - 1][chc];
  // Zones: A = 0–6 months, B = minimum 1–9, C = minimum 10–12, D = minimum 15+.
  const zone = lo === 0 ? 1 : lo <= 9 ? 2 : lo <= 12 ? 3 : 4;
  return {
    guidelineMinimumMonths: lo,
    guidelineMaximumMonths: hi >= 9999 ? 0 : hi,
    lifeAtTop: hi >= 9999 ? 1 : 0,
    totalOffenseLevel: level,
    criminalHistoryCategory: chc + 1,
    zone,
  };
};

export const floridaScoresheet: CustomCalculator = (v) => {
  const points = nonNeg(v.primaryOffensePoints) + nonNeg(v.additionalOffensePoints) + nonNeg(v.priorRecordPoints) + nonNeg(v.victimInjuryPoints) + nonNeg(v.otherPoints);
  const multiplier = nonNeg(v.multiplier, 1);
  const total = points * Math.max(1, multiplier);
  const lps = total > 44 ? (total - 28) * 0.75 : 0;
  const max = [60, 180, 360, 9999][Math.min(3, Math.max(0, Math.round(safeNumber(v.primaryDegree))))];
  return {
    lowestPermissibleSentenceMonths: round2(Math.min(lps, max)),
    totalSentencePoints: round2(total),
    statutoryMaximumMonths: max >= 9999 ? 0 : max,
    prisonRequired: total > 44 ? 1 : 0,
    lowestPermissibleYears: round2(Math.min(lps, max) / 12),
  };
};

export const INDIANA_LEVELS: [string, number, number, number][] = [
  ["Murder", 45, 65, 55], ["Level 1 felony", 20, 40, 30], ["Level 2 felony", 10, 30, 17.5], ["Level 3 felony", 3, 16, 9], ["Level 4 felony", 2, 12, 6], ["Level 5 felony", 1, 6, 3], ["Level 6 felony", 0.5, 2.5, 1],
];
export const indianaSentencing: CustomCalculator = (v) => {
  const [, min, max, adv] = INDIANA_LEVELS[Math.min(6, Math.max(0, Math.round(safeNumber(v.offenseLevel))))];
  const sentence = nonNeg(v.sentenceYears) > 0 ? Math.min(max, Math.max(min, nonNeg(v.sentenceYears))) : adv;
  const pct = [0.5, 0.75, 6 / 7, 1][Math.min(3, Math.max(0, Math.round(safeNumber(v.creditClass))))];
  const habitual = Math.round(safeNumber(v.habitualOffender)) === 1 ? (Math.round(safeNumber(v.offenseLevel)) <= 2 ? 10 : Math.round(safeNumber(v.offenseLevel)) <= 5 ? 6 : 2) : 0;
  const total = sentence + habitual;
  return {
    sentenceYears: round2(total),
    minimumYears: min,
    maximumYears: max,
    advisoryYears: adv,
    estimatedYearsToServe: round2(total * pct),
  };
};

export const MISSOURI_CLASSES: [string, number, number][] = [["Class A felony (10–30 years or life)", 10, 30], ["Class B felony (5–15 years)", 5, 15], ["Class C felony (3–10 years)", 3, 10], ["Class D felony (up to 7 years)", 0, 7], ["Class E felony (up to 4 years)", 0, 4]];
export const missouriSentencing: CustomCalculator = (v) => {
  const [, min, max] = MISSOURI_CLASSES[Math.min(4, Math.max(0, Math.round(safeNumber(v.felonyClass))))];
  const sentence = nonNeg(v.sentenceYears) > 0 ? Math.min(max, Math.max(min, nonNeg(v.sentenceYears))) : (min + max) / 2;
  const priors = Math.round(nonNeg(v.priorPrisonCommitments));
  const dangerous = Math.round(safeNumber(v.dangerousFelony)) === 1;
  const pct = dangerous ? 0.85 : priors >= 3 ? 0.8 : priors === 2 ? 0.5 : priors === 1 ? 0.4 : 0;
  return {
    sentenceYears: round2(sentence),
    minimumYears: min,
    maximumYears: max,
    minimumPrisonTermPercent: round2(pct * 100),
    yearsBeforeParoleEligibility: round2(sentence * pct),
  };
};

// --- Bankruptcy ----------------------------------------------------------------------------------
export const meansMedian = (stateIdx: number, size: number) => {
  const row = MEANS_MEDIANS[Math.min(MEANS_MEDIANS.length - 1, Math.max(0, Math.round(safeNumber(stateIdx))))];
  const n = Math.max(1, Math.round(nonNeg(size, 1)));
  return n <= 4 ? (row[n] as number) : (row[4] as number) + 11100 * (n - 4);
};
export const meansTest = (fixedState?: number): CustomCalculator => (v) => {
  const cmi = nonNeg(v.currentMonthlyIncome);
  const median = meansMedian(fixedState ?? v.state, v.householdSize);
  const annual = cmi * 12;
  const below = annual <= median;
  const dmi = Math.max(0, cmi - nonNeg(v.allowedMonthlyExpenses) - nonNeg(v.securedDebtPayments) - nonNeg(v.priorityDebtPayments));
  const sixty = dmi * 60;
  const unsecured = nonNeg(v.unsecuredDebt);
  const presumption = below ? 0 : sixty < 10275 ? 0 : sixty >= 17150 ? 1 : sixty >= unsecured * 0.25 ? 1 : 0;
  return {
    passesMeansTest: below || presumption === 0 ? 1 : 0,
    belowStateMedian: below ? 1 : 0,
    annualizedIncome: round2(annual),
    stateMedianIncome: median,
    monthlyDisposableIncome: round2(below ? 0 : dmi),
    sixtyMonthDisposableIncome: round2(below ? 0 : sixty),
  };
};

export const chapter13: CustomCalculator = (v) => {
  const dmi = nonNeg(v.monthlyDisposableIncome);
  const months = nonNeg(v.planMonths, 60);
  const priority = nonNeg(v.priorityDebts);
  const secured = nonNeg(v.securedArrears);
  const liquidation = nonNeg(v.nonExemptAssetValue);
  const base = Math.max(dmi * months, priority + secured + liquidation, priority + secured);
  const trustee = Math.min(10, nonNeg(v.trusteeFeePercent, 10)) / 100;
  const total = base / (1 - trustee);
  const monthly = total / Math.max(1, months);
  return {
    monthlyPlanPayment: round2(monthly),
    totalPlanPayments: round2(total),
    trusteeFees: round2(total - base),
    toUnsecuredCreditors: round2(Math.max(0, base - priority - secured)),
  };
};

export const consumerProposal: CustomCalculator = (v) => {
  const debt = nonNeg(v.unsecuredDebt);
  const pct = Math.min(100, nonNeg(v.offerPercent, 30)) / 100;
  const months = Math.min(60, Math.max(1, nonNeg(v.months, 60)));
  const total = debt * pct;
  return {
    monthlyPayment: round2(total / months),
    totalRepaid: round2(total),
    debtForgiven: round2(debt - total),
    bankruptcyComparisonMonthly: round2(nonNeg(v.surplusIncomeBankruptcyMonthly)),
  };
};

// --- Interest ------------------------------------------------------------------------------------
function interestCalc(principal: number, ratePct: number, startDay: number, endDay: number, compound: boolean, compoundsPerYear = 12) {
  const days = Math.min(36500, Math.max(0, endDay - startDay));
  const r = Math.min(50, ratePct) / 100;
  const interest = compound ? principal * (Math.pow(1 + r / compoundsPerYear, (days / 365) * compoundsPerYear) - 1) : principal * r * (days / 365);
  return { days, interest };
}
export const judgmentInterest = (fixedRate?: number): CustomCalculator => (v) => {
  const p = nonNeg(v.judgmentAmount);
  const rate = fixedRate ?? nonNeg(v.annualRatePercent, 6);
  const { days, interest } = interestCalc(p, rate, day(v.judgmentDate), day(v.payoffDate), Math.round(safeNumber(v.compound)) === 1);
  return {
    totalInterest: round2(interest),
    payoffAmount: round2(p + interest - nonNeg(v.paymentsMade)),
    dailyInterest: round2((p * rate) / 100 / 365),
    daysOfInterest: days,
    rateUsed: rate,
  };
};

export const promptPayment: CustomCalculator = (v) => {
  const p = nonNeg(v.invoiceAmount);
  const due = day(v.dueDate);
  const paid = day(v.paymentDate);
  const rate = Math.min(50, nonNeg(v.treasuryRatePercent, 4.5));
  // Prompt Payment Act interest compounds every 30 days.
  const days = Math.min(36500, Math.max(0, paid - due));
  const periods = days / 30;
  const interest = p * (Math.pow(1 + rate / 100 / 12.1667, periods) - 1);
  return {
    latePaymentInterest: round2(days > 0 ? interest : 0),
    daysLate: days,
    totalDue: round2(p + (days > 0 ? interest : 0)),
    rateUsed: rate,
  };
};

export const ukLatePayment: CustomCalculator = (v) => {
  const p = nonNeg(v.debtAmount);
  const rate = 8 + nonNeg(v.bankOfEnglandBaseRatePercent, 4);
  const days = Math.max(0, day(v.paymentDate) - day(v.dueDate));
  const interest = p * (rate / 100) * (days / 365);
  const comp = p < 1000 ? 40 : p < 10000 ? 70 : 100;
  return {
    statutoryInterest: round2(interest),
    fixedCompensation: comp,
    totalClaim: round2(p + interest + comp),
    dailyInterest: round2((p * rate) / 100 / 365),
    rateUsed: round2(rate),
  };
};

// --- Bail, fees ----------------------------------------------------------------------------------
export const bailBond = (state?: "LA" | "CT"): CustomCalculator => (v) => {
  const bail = nonNeg(v.bailAmount);
  let premium: number;
  if (state === "CT") premium = Math.min(bail, 5000) * 0.1 + Math.max(0, bail - 5000) * 0.07;
  else if (state === "LA") premium = bail * 0.12;
  else premium = bail * (Math.min(25, nonNeg(v.premiumPercent, 10)) / 100);
  premium = Math.max(premium, nonNeg(v.minimumPremium, state ? 0 : 100));
  return {
    bondPremium: round2(premium),
    nonRefundableCost: round2(premium + nonNeg(v.otherFees)),
    collateralMayBeRequired: round2(Math.max(0, bail - premium)),
    premiumPercent: round2(bail > 0 ? (premium / bail) * 100 : 0),
  };
};

export const expertWitness: CustomCalculator = (v) => {
  const review = nonNeg(v.reviewHours) * nonNeg(v.hourlyRate);
  const depo = nonNeg(v.depositionHours) * nonNeg(v.depositionRate || v.hourlyRate);
  const trial = nonNeg(v.trialDays) * nonNeg(v.dailyTrialRate);
  const total = review + depo + trial + nonNeg(v.travelExpenses);
  return {
    totalExpertCost: round2(total),
    reviewAndReport: round2(review),
    depositionFees: round2(depo),
    trialFees: round2(trial),
    retainerCoverage: round2(Math.max(0, total - nonNeg(v.retainer))),
  };
};

export const arbitrationCost: CustomCalculator = (v) => {
  const consumer = Math.round(safeNumber(v.caseType)) === 0;
  const filing = consumer ? 225 : nonNeg(v.filingFee, 925);
  const arbitrator = nonNeg(v.arbitratorHourlyRate, 450) * nonNeg(v.hearingAndStudyHours, 20);
  const room = nonNeg(v.hearingRoomCosts);
  const total = filing + arbitrator + room;
  return {
    totalArbitrationCost: round2(total),
    yourShare: round2(consumer ? 225 : total * (Math.min(100, nonNeg(v.yourSharePercent, 50)) / 100)),
    arbitratorCompensation: round2(arbitrator),
    filingFee: round2(filing),
  };
};

export const NOTARY_MAX: [string, number][] = [["California ($15)", 15], ["Texas ($10)", 10], ["Florida ($10)", 10], ["New York ($2)", 2], ["Pennsylvania ($5)", 5], ["Illinois ($5)", 5], ["Georgia ($2)", 2], ["Other / custom", 0]];
export const mobileNotary: CustomCalculator = (v) => {
  const idx = Math.min(NOTARY_MAX.length - 1, Math.max(0, Math.round(safeNumber(v.state))));
  const per = NOTARY_MAX[idx][1] || nonNeg(v.customFeePerSignature);
  const fees = per * nonNeg(v.notarizedSignatures);
  const travel = nonNeg(v.travelFee) + nonNeg(v.miles) * nonNeg(v.perMileRate);
  return {
    totalCharge: round2(fees + travel + nonNeg(v.afterHoursFee)),
    notaryFees: round2(fees),
    travelCharges: round2(travel),
    maxFeePerSignature: per,
  };
};

export const trademarkFee: CustomCalculator = (v) => {
  const classes = Math.max(1, Math.round(nonNeg(v.classes, 1)));
  const base = 350 * classes;
  const insufficient = Math.round(safeNumber(v.insufficientInfo)) === 1 ? 100 * classes : 0;
  const freeForm = Math.round(safeNumber(v.freeFormDescription)) === 1 ? 200 * classes : 0;
  const extraChars = Math.ceil(Math.max(0, nonNeg(v.descriptionCharacters) - 1000) / 1000) * 200 * classes;
  const later = Math.round(safeNumber(v.intentToUse)) === 1 ? 150 * classes : 0;
  return {
    totalFilingFee: round2(base + insufficient + freeForm + extraChars),
    baseFee: base,
    surcharges: round2(insufficient + freeForm + extraChars),
    statementOfUseLater: later,
  };
};

export const patentFee: CustomCalculator = (v) => {
  const entity = Math.round(safeNumber(v.entitySize));
  const factor = entity === 1 ? 0.4 : entity === 2 ? 0.2 : 1;
  const claims = nonNeg(v.totalClaims);
  const indep = nonNeg(v.independentClaims);
  const filing = 350 + 770 + 880;
  const excess = Math.max(0, claims - 20) * 200 + Math.max(0, indep - 3) * 600;
  const total = (filing + excess) * factor;
  return {
    totalFilingFees: round2(total),
    basicFilingSearchExam: round2(filing * factor),
    excessClaimFees: round2(excess * factor),
    issueFeeLater: round2(1290 * factor),
  };
};

export const patentTerm: CustomCalculator = (v) => {
  const filed = day(v.filingDate);
  const design = Math.round(safeNumber(v.patentType)) === 1;
  const granted = day(v.grantDate);
  const base = design ? addMonths(granted || filed, 180) : addMonths(filed, 240);
  const end = base + Math.round(nonNeg(v.ptaDays)) - Math.round(nonNeg(v.terminalDisclaimerDays));
  return {
    expirationDate: end,
    baseExpiration: base,
    adjustmentDays: Math.round(nonNeg(v.ptaDays) - nonNeg(v.terminalDisclaimerDays)),
  };
};

export const pctDeadlines: CustomCalculator = (v) => {
  const priority = day(v.priorityDate);
  return {
    nationalPhase30Months: addMonths(priority, 30),
    nationalPhase31Months: addMonths(priority, 31),
    pctFilingDeadline12Months: addMonths(priority, 12),
    internationalPublication18Months: addMonths(priority, 18),
    demandForChapterII22Months: addMonths(priority, 22),
  };
};

export const publicDomain: CustomCalculator = (v) => {
  const type = Math.round(safeNumber(v.workType));
  const pub = Math.round(nonNeg(v.publicationYear, 1950));
  const death = Math.round(nonNeg(v.authorDeathYear));
  const created = Math.round(nonNeg(v.creationYear, pub));
  let pdYear: number;
  if (pub && pub < 1931) pdYear = pub + 95 + 1;
  else if (pub && pub < 1978) pdYear = Math.round(safeNumber(v.renewedOrNotice, 1)) === 1 ? pub + 95 + 1 : pub + 1;
  else if (type === 1) pdYear = Math.min(pub + 95, created + 120) + 1;
  else pdYear = (death || created + 70) + 70 + 1;
  return {
    publicDomainYear: pdYear,
    inPublicDomainNow: pdYear <= Math.round(nonNeg(v.currentYear, 2026)) ? 1 : 0,
    yearsUntilPublicDomain: Math.max(0, pdYear - Math.round(nonNeg(v.currentYear, 2026))),
  };
};

export const ipValuation: CustomCalculator = (v) => {
  const rev = nonNeg(v.annualRevenue);
  const roy = nonNeg(v.royaltyRatePercent, 5) / 100;
  const tax = Math.min(60, nonNeg(v.taxRatePercent, 25)) / 100;
  const g = nonNeg(v.growthPercent, 3) / 100;
  const r = Math.max(0.01, nonNeg(v.discountRatePercent, 15) / 100);
  const years = Math.min(50, Math.round(nonNeg(v.remainingLifeYears, 10)));
  let pv = 0;
  for (let y = 1; y <= years; y++) pv += (rev * Math.pow(1 + g, y - 1) * roy * (1 - tax)) / Math.pow(1 + r, y);
  return {
    ipValue: round2(pv),
    firstYearAfterTaxRoyalty: round2(rev * roy * (1 - tax)),
    yearsValued: years,
  };
};

export const crimeRate: CustomCalculator = (v) => {
  const pop = Math.max(1, nonNeg(v.population));
  const crimes = nonNeg(v.crimes);
  const rate = (crimes / pop) * 100000;
  return {
    crimeRatePer100k: round2(rate),
    crimeRatePer1000: round2(rate / 100),
    oneInHowManyPeople: round2(crimes > 0 ? pop / crimes : 0),
    comparedToAveragePercent: round2(nonNeg(v.comparisonRate) > 0 ? (rate / nonNeg(v.comparisonRate)) * 100 : 0),
  };
};

export const prop19: CustomCalculator = (v) => {
  const fmv = nonNeg(v.marketValue);
  const assessed = nonNeg(v.factoredBaseYearValue);
  const exclusion = nonNeg(v.exclusionAmount, 1044586);
  const primary = Math.round(safeNumber(v.childMovesIn, 1)) === 1;
  const newAssessed = primary ? (fmv <= assessed + exclusion ? assessed : fmv - exclusion) : fmv;
  const rate = nonNeg(v.taxRatePercent, 1.1) / 100;
  return {
    newAssessedValue: round2(newAssessed),
    annualPropertyTax: round2(newAssessed * rate),
    taxWithoutExclusion: round2(fmv * rate),
    annualSavings: round2((fmv - newAssessed) * rate),
  };
};

export const tenantsInCommon: CustomCalculator = (v) => {
  const proceeds = nonNeg(v.salePrice) - nonNeg(v.mortgageBalance) - nonNeg(v.sellingCosts);
  const share = Math.min(100, nonNeg(v.yourOwnershipPercent, 50)) / 100;
  const credit = nonNeg(v.yourExtraContributions) - nonNeg(v.othersExtraContributions);
  const yours = proceeds * share + credit * (1 - share);
  return {
    yourShareOfProceeds: round2(yours),
    otherOwnersShare: round2(proceeds - yours),
    netProceeds: round2(proceeds),
    equalizationAdjustment: round2(credit * (1 - share)),
  };
};

export const easementValue: CustomCalculator = (v) => {
  const perAcre = nonNeg(v.landValuePerAcre);
  const acres = nonNeg(v.easementAcres);
  const pct = Math.min(100, nonNeg(v.percentOfValueTaken, 50)) / 100;
  const damages = nonNeg(v.severanceDamages);
  return {
    easementCompensation: round2(perAcre * acres * pct + damages),
    landValueAffected: round2(perAcre * acres),
    percentUsed: round2(pct * 100),
  };
};

export const reraInterest: CustomCalculator = (v) => {
  const paid = nonNeg(v.amountPaid);
  const rate = nonNeg(v.interestRatePercent, 10.85) / 100;
  const days = Math.max(0, day(v.actualPossessionDate) - day(v.promisedPossessionDate));
  const interest = paid * rate * (days / 365);
  return {
    delayInterest: round2(interest),
    monthsDelayed: round2(days / 30.44),
    monthlyInterest: round2((paid * rate) / 12),
  };
};

export const leaseValuation: CustomCalculator = (v) => {
  const pmt = nonNeg(v.monthlyPayment);
  const n = Math.min(1200, Math.round(nonNeg(v.remainingMonths, 60)));
  const r = nonNeg(v.discountRatePercent, 6) / 100 / 12;
  const pv = r > 0 ? (pmt * (1 - Math.pow(1 + r, -n))) / r : pmt * n;
  const due = Math.round(safeNumber(v.paymentsInAdvance)) === 1 ? pv * (1 + r) : pv;
  return {
    leaseLiabilityPresentValue: round2(due),
    totalPaymentsRemaining: round2(pmt * n),
    impliedInterest: round2(pmt * n - due),
  };
};

export const landLease: CustomCalculator = (v) => {
  const acres = nonNeg(v.acres);
  const rate = nonNeg(v.rentPerAcre, 150);
  const base = acres * rate;
  const extra = nonNeg(v.huntingOrOtherIncomePerAcre) * acres;
  return {
    annualLeaseIncome: round2(base + extra),
    baseCropOrPastureRent: round2(base),
    otherUseIncome: round2(extra),
    monthlyEquivalent: round2((base + extra) / 12),
  };
};

export const contractForDeed: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const loan = Math.max(0, price - nonNeg(v.downPayment));
  const r = Math.min(30, nonNeg(v.interestRatePercent, 8)) / 100 / 12;
  const n = Math.max(1, Math.round(Math.min(40, nonNeg(v.amortizationYears, 20)) * 12));
  const pmt = r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n;
  const balloonMonths = Math.round(nonNeg(v.balloonYears) * 12);
  const balance = balloonMonths > 0 && balloonMonths < n ? (r > 0 ? loan * Math.pow(1 + r, balloonMonths) - pmt * ((Math.pow(1 + r, balloonMonths) - 1) / r) : loan - pmt * balloonMonths) : 0;
  return {
    monthlyPayment: round2(pmt),
    balloonPaymentDue: round2(Math.max(0, balance)),
    amountFinanced: round2(loan),
    totalInterest: round2(pmt * (balloonMonths > 0 && balloonMonths < n ? balloonMonths : n) + Math.max(0, balance) - loan),
  };
};

export const breachOfContract: CustomCalculator = (v) => {
  const expected = nonNeg(v.contractValueToYou);
  const received = nonNeg(v.valueReceived);
  const saved = nonNeg(v.costsAvoided);
  const incidental = nonNeg(v.incidentalCosts) + nonNeg(v.consequentialLosses);
  const mitigated = nonNeg(v.mitigationEarnings);
  const damages = Math.max(0, expected - received - saved - mitigated + incidental);
  const liquidated = nonNeg(v.liquidatedDamagesClause);
  return {
    expectationDamages: round2(damages),
    recoverable: round2(liquidated > 0 ? liquidated : damages),
    liquidatedDamagesApply: liquidated > 0 ? 1 : 0,
    netLostBenefit: round2(expected - received - saved),
  };
};

export const lawsuitLoan: CustomCalculator = (v) => {
  const p = nonNeg(v.advanceAmount);
  const months = Math.min(120, nonNeg(v.monthsUntilSettlement, 18));
  const rate = Math.min(10, nonNeg(v.monthlyRatePercent, 3)) / 100;
  const compound = Math.round(safeNumber(v.compounding)) === 1;
  const owed = compound ? p * Math.pow(1 + rate, months) : p * (1 + rate * months);
  const fees = nonNeg(v.fees);
  const capped = nonNeg(v.capMultiple) > 0 ? Math.min(owed + fees, p * nonNeg(v.capMultiple)) : owed + fees;
  return {
    amountOwedAtSettlement: round2(capped),
    costOfFunding: round2(capped - p),
    effectiveAnnualRatePercent: round2(p > 0 && months > 0 ? (Math.pow(capped / p, 12 / months) - 1) * 100 : 0),
    leftFromSettlement: round2(Math.max(0, nonNeg(v.expectedNetSettlement) - capped)),
  };
};

export const offerInCompromise: CustomCalculator = (v) => {
  const equity = Math.max(0, nonNeg(v.assetValue) * 0.8 - nonNeg(v.loansOnAssets)) + nonNeg(v.cashAndBank);
  const monthly = Math.max(0, nonNeg(v.monthlyIncome) - nonNeg(v.allowableExpenses));
  const lump = equity + monthly * 12;
  const periodic = equity + monthly * 24;
  return {
    minimumLumpSumOffer: round2(lump),
    minimumPeriodicOffer: round2(periodic),
    reasonableCollectionPotential: round2(lump),
    monthlyDisposableIncome: round2(monthly),
    lumpSumDownPayment20Percent: round2(lump * 0.2),
  };
};

export const californiaRentCap: CustomCalculator = (v) => {
  const rent = nonNeg(v.currentRent);
  const cpi = nonNeg(v.regionalCpiPercent, 3.3);
  const capPct = Math.min(10, 5 + cpi);
  const proposed = nonNeg(v.proposedRent);
  const max = rent * (1 + capPct / 100);
  return {
    maximumLegalRent: round2(max),
    allowedIncreasePercent: round2(capPct),
    allowedIncrease: round2(max - rent),
    proposedIsOverCap: proposed > max + 0.005 ? 1 : 0,
  };
};

// --- Speeding tickets ----------------------------------------------------------------------------
export interface SpeedState {
  slug: string;
  name: string;
  points: (over: number, speed: number) => number;
  baseFine: number;
  fees: (over: number, speed: number, twoLane: boolean) => number;
  note: string;
}
const S = (name: string, points: SpeedState["points"], baseFine: number, fees: SpeedState["fees"], note: string): SpeedState => ({ slug: `${name.toLowerCase().replace(/ /g, "-")}-speeding-ticket-cost-calculator`, name, points, baseFine, fees, note });
export const SPEED_STATES: SpeedState[] = [
  S("California", (o, s) => (s > 100 ? 2 : 1), 238, (o) => (o > 25 ? 252 : o > 15 ? 129 : 0), "Total bail includes penalty assessments (about 3–4 × the base fine); 100+ mph is 2 points and a possible suspension."),
  S("Georgia", (o) => (o >= 34 ? 6 : o >= 24 ? 4 : o >= 19 ? 3 : o >= 15 ? 2 : 0), 175, (_o, s, two) => (s >= 85 || (two && s >= 75) ? 200 : 0), "Super Speeder: an extra $200 state fee for 75+ mph on a two-lane road or 85+ mph anywhere."),
  S("Ohio", (o) => (o >= 30 ? 4 : 2), 150, () => 0, "Ohio assesses 2 points (4 for 30+ mph over); 12 points in 2 years means a suspension."),
  S("Arkansas", (o) => (o >= 31 ? 8 : o >= 26 ? 7 : o >= 21 ? 6 : o >= 16 ? 5 : o >= 11 ? 4 : 3), 150, () => 0, "Arkansas points rise from 3 to 8 with the speed over the limit; 14 points triggers a suspension hearing."),
  S("Tennessee", (o) => (o >= 46 ? 8 : o >= 36 ? 6 : o >= 26 ? 5 : o >= 16 ? 4 : o >= 6 ? 3 : 1), 150, () => 0, "Tennessee points range from 1 (1–5 mph over) to 8 (46+ over); 12 points in a year means a suspension."),
  S("Texas", () => 0, 200, () => 0, "Texas no longer uses driver points or surcharges (repealed in 2019); court costs vary by county and city."),
  S("Virginia", (o) => (o >= 20 ? 6 : o >= 10 ? 4 : 3), 0, (o, s) => o * 6 + 66 + (o >= 20 || s > 85 ? 1000 : 0), "Virginia fines are about $6 per mph over plus court costs; 20+ over or above 85 mph is reckless driving (a misdemeanor)."),
  S("Mississippi", () => 0, 150, () => 0, "Mississippi doesn't use a points system, but tickets still raise insurance and appear on your record."),
  S("Alabama", (o) => (o >= 26 ? 5 : 2), 150, () => 0, "Alabama: 2 points for up to 25 mph over, 5 points above that; 12 points in 2 years means a suspension."),
  S("Indiana", (o) => (o >= 26 ? 6 : o >= 16 ? 4 : 2), 150, () => 0, "Indiana: 2–6 points by speed; 18 points in 2 years can suspend your license."),
  S("New York", (o) => (o > 40 ? 11 : o > 30 ? 8 : o > 20 ? 6 : o > 10 ? 4 : 3), 150, () => 93, "New York adds a state surcharge (about $88–$93) and a Driver Responsibility Assessment of $300+ for 6+ points in 18 months."),
];

function speedResult(fine: number, fees: number, points: number, premium: number, costs: number) {
  const insurancePct = points >= 6 ? 0.45 : points >= 3 ? 0.25 : points > 0 ? 0.2 : 0.15;
  const insurance = premium * insurancePct * 3;
  const total = fine + fees + costs;
  return {
    totalTicketCost: round2(total),
    fineAndFees: round2(fine + fees),
    pointsOnRecord: points,
    estimatedInsuranceIncrease3Years: round2(insurance),
    trueCostIncludingInsurance: round2(total + insurance),
  };
}

export const stateSpeeding = (s: SpeedState): CustomCalculator => (v) => {
  const speed = nonNeg(v.yourSpeed, 75);
  const limit = nonNeg(v.speedLimit, 60);
  const over = Math.max(0, speed - limit);
  const fine = nonNeg(v.baseFine) > 0 ? nonNeg(v.baseFine) : s.baseFine;
  return speedResult(fine, s.fees(over, speed, Math.round(safeNumber(v.twoLaneRoad)) === 1), s.points(over, speed), nonNeg(v.annualInsurancePremium, 2400), nonNeg(v.courtCosts));
};

export const genericSpeeding: CustomCalculator = (v) => {
  const over = Math.max(0, nonNeg(v.yourSpeed, 75) - nonNeg(v.speedLimit, 60));
  const fine = nonNeg(v.baseFine) > 0 ? nonNeg(v.baseFine) : 50 + over * 10;
  const points = Math.round(nonNeg(v.points, over >= 20 ? 4 : over >= 10 ? 3 : 2));
  return speedResult(fine * (Math.round(safeNumber(v.workOrSchoolZone)) === 1 ? 2 : 1), 0, points, nonNeg(v.annualInsurancePremium, 2400), nonNeg(v.courtCosts));
};

export const lawCourtCustomCalculators: Record<string, CustomCalculator> = {
  "court-deadline-calculator": courtDeadline(undefined, "frcp"),
  "california-court-deadline-calculator": courtDeadline("california", "ca"),
  "texas-court-deadline-calculator": texasDeadline,
  "florida-court-deadline-calculator": courtDeadline("florida", "fl"),
  "michigan-court-deadline-calculator": courtDeadline("michigan"),
  "new-jersey-motion-date-calculator": njMotionDates,
  "new-york-motion-return-date-calculator": nyMotionDates,
  "speedy-trial-calculator": speedyTrial,
  "statute-of-limitations-calculator": statuteOfLimitations,
  "right-of-rescission-calculator": rescission,
  "california-3-day-notice-calculator": californiaThreeDayNotice,
  "lease-end-date-calculator": leaseEndDate,
  "csed-calculator": csed,
  "legal-age-calculator": legalAge,
  "jail-release-date-calculator": jailRelease,
  "federal-prison-release-date-calculator": federalRelease,
  "florida-jail-release-date-calculator": stateRelease("Florida"),
  "indiana-jail-release-date-calculator": stateRelease("Indiana"),
  "kentucky-jail-release-date-calculator": stateRelease("Kentucky"),
  "ohio-jail-release-date-calculator": stateRelease("Ohio"),
  "california-jail-release-date-calculator": stateRelease("California"),
  "texas-jail-release-date-calculator": stateRelease("Texas"),
  "federal-sentencing-guidelines-calculator": federalSentencing,
  "florida-scoresheet-calculator": floridaScoresheet,
  "indiana-sentencing-calculator": indianaSentencing,
  "missouri-sentencing-calculator": missouriSentencing,
  "bankruptcy-means-test-calculator": meansTest(),
  "texas-bankruptcy-means-test-calculator": meansTest(MEANS_MEDIANS.findIndex(([s]) => s === "Texas")),
  "florida-bankruptcy-means-test-calculator": meansTest(MEANS_MEDIANS.findIndex(([s]) => s === "Florida")),
  "california-bankruptcy-means-test-calculator": meansTest(MEANS_MEDIANS.findIndex(([s]) => s === "California")),
  "ohio-bankruptcy-means-test-calculator": meansTest(MEANS_MEDIANS.findIndex(([s]) => s === "Ohio")),
  "illinois-bankruptcy-means-test-calculator": meansTest(MEANS_MEDIANS.findIndex(([s]) => s === "Illinois")),
  "tennessee-bankruptcy-means-test-calculator": meansTest(MEANS_MEDIANS.findIndex(([s]) => s === "Tennessee")),
  "chapter-13-payment-calculator": chapter13,
  "consumer-proposal-calculator": consumerProposal,
  "judgment-interest-calculator": judgmentInterest(),
  "california-judgment-interest-calculator": judgmentInterest(10),
  "new-york-judgment-interest-calculator": judgmentInterest(9),
  "north-carolina-judgment-interest-calculator": judgmentInterest(8),
  "florida-judgment-interest-calculator": judgmentInterest(),
  "texas-judgment-interest-calculator": judgmentInterest(),
  "louisiana-judicial-interest-calculator": judgmentInterest(),
  "prompt-payment-interest-calculator": promptPayment,
  "uk-late-payment-interest-calculator": ukLatePayment,
  "bail-bond-calculator": bailBond(),
  "louisiana-bail-bond-calculator": bailBond("LA"),
  "connecticut-bail-bond-calculator": bailBond("CT"),
  "expert-witness-fee-calculator": expertWitness,
  "arbitration-cost-calculator": arbitrationCost,
  "mobile-notary-fee-calculator": mobileNotary,
  "trademark-filing-fee-calculator": trademarkFee,
  "patent-filing-fee-calculator": patentFee,
  "patent-expiration-date-calculator": patentTerm,
  "pct-deadline-calculator": pctDeadlines,
  "public-domain-calculator": publicDomain,
  "intellectual-property-valuation-calculator": ipValuation,
  "crime-rate-calculator": crimeRate,
  "prop-19-calculator": prop19,
  "tenants-in-common-calculator": tenantsInCommon,
  "easement-value-calculator": easementValue,
  "rera-delay-interest-calculator": reraInterest,
  "lease-valuation-calculator": leaseValuation,
  "land-lease-calculator": landLease,
  "contract-for-deed-calculator": contractForDeed,
  "breach-of-contract-damages-calculator": breachOfContract,
  "lawsuit-loan-calculator": lawsuitLoan,
  "offer-in-compromise-calculator": offerInCompromise,
  "california-rent-cap-calculator": californiaRentCap,
  "speeding-ticket-cost-calculator": genericSpeeding,
  ...Object.fromEntries(SPEED_STATES.map((s) => [s.slug, stateSpeeding(s)])),
};
