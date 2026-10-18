/**
 * Batch: "Law & Government Calculators" → Military & Veterans Calculators —
 * service time, deployment countdown, WWII draft & sea service (4 tools).
 *
 *  - military-time-in-service-calculator: adds up to three service periods
 *    (years/months/days, 30-day months as DFAS counts them) and shows the next
 *    pay-table step and months to ETS.
 *  - deployment-countdown-calculator: days left → weeks, months, paychecks
 *    and percentage complete.
 *  - ww2-draft-calculator: Selective Service rules 1940–45 — registration
 *    21–35 (Oct 1940), 18–64 registration from 1942, induction ages 18–37
 *    from Nov 1942 until the end of the war.
 *  - uscg-sea-service-calculator: USCG (NMC) sea service credit — an 8-hour
 *    day = 1 day; on vessels on a two-watch system a 12-hour day can count
 *    as 1.5 days (46 CFR 10.232); 360 days = 1 year of sea time.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-mil-misc-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

const PAY_STEPS = [2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 30, 34, 38, 40];

export const timeInService: CustomCalculator = (v) => {
  let days = 0;
  for (const p of [1, 2, 3]) days += nonNeg(v[`years${p}`]) * 360 + nonNeg(v[`months${p}`]) * 30 + nonNeg(v[`days${p}`]);
  const years = Math.floor(days / 360);
  const months = Math.floor((days - years * 360) / 30);
  const rem = days - years * 360 - months * 30;
  const totalYears = days / 360;
  const next = PAY_STEPS.find((s) => s > totalYears + 1e-9);
  const contract = nonNeg(v.contractYears) * 12;
  const servedMonths = days / 30;
  return {
    totalYears: years,
    totalMonths: months,
    totalDays: Math.round(rem),
    totalYearsDecimal: round2(totalYears),
    monthsToNextPayRaise: next ? round2((next - totalYears) * 12) : 0,
    monthsToEts: contract > 0 ? round2(Math.max(0, contract - servedMonths)) : 0,
  };
};

export const deploymentCountdown: CustomCalculator = (v) => {
  const total = Math.max(1, nonNeg(v.totalDays, 270));
  const left = Math.min(total, nonNeg(v.daysLeft, 180));
  return {
    daysLeft: Math.round(left),
    weeksLeft: round2(left / 7),
    monthsLeft: round2(left / 30.44),
    percentComplete: round2(((total - left) / total) * 100),
    paychecksLeft: Math.ceil(left / 15.22),
    weekendsLeft: Math.floor(left / 7),
  };
};

export const ww2Draft: CustomCalculator = (v) => {
  const y = nonNeg(v.birthYear, 1922);
  const m = Math.min(12, Math.max(1, Math.round(nonNeg(v.birthMonth, 6))));
  const born = y + (m - 0.5) / 12;
  const ageAt = (t: number) => t - born;
  const pearl = ageAt(1941 + 11.25 / 12);
  // Induction window for 18–37-year-olds: 13 Nov 1942 to 15 Aug 1945.
  const start = 1942 + 10.4 / 12;
  const end = 1945 + 7.5 / 12;
  const from = Math.max(start, born + 18);
  const to = Math.min(end, born + 38);
  // First peacetime draft (16 Oct 1940 – Nov 1942): ages 21–35.
  const early = Math.max(0, Math.min(start, born + 36) - Math.max(1940.79, born + 21));
  const years = Math.max(0, to - from) + early;
  const registered = ageAt(end) >= 18 && ageAt(1942.3) < 65 ? 1 : 0;
  const eligible1940 = early > 0 ? 1 : 0;
  return {
    yearsEligibleForInduction: round2(years),
    ageOnPearlHarborDay: round2(Math.floor(pearl)),
    mustRegister: registered,
    eligibleInFirstDraft1940: eligible1940,
    eligibleOneYearOrMore: years >= 1 ? 1 : 0,
  };
};

export const uscgSeaService: CustomCalculator = (v) => {
  const eight = nonNeg(v.eightHourDays);
  const twelve = nonNeg(v.twelveHourDays);
  const credit = Math.round(safeNumber(v.twoWatchCredit)) === 1 ? 1.5 : 1;
  const total = eight + twelve * credit;
  const need = nonNeg(v.daysRequired, 360);
  return {
    creditedSeaDays: round2(total),
    seaTimeYears: round2(total / 360),
    daysStillNeeded: round2(Math.max(0, need - total)),
    percentOfRequirement: round2(need > 0 ? Math.min(100, (total / need) * 100) : 0),
  };
};

export const lawMilMiscCustomCalculators: Record<string, CustomCalculator> = {
  "military-time-in-service-calculator": timeInService,
  "deployment-countdown-calculator": deploymentCountdown,
  "ww2-draft-calculator": ww2Draft,
  "uscg-sea-service-calculator": uscgSeaService,
};
