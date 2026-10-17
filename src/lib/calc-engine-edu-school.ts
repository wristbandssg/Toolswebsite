/**
 * Batch: "Jobs & Education Calculators" → School Age, Calendar & Classroom
 * Calculators (13 tools). Dates arrive as separate year / month / day numbers
 * (the calculator form has number inputs only).
 *  - schoolAge, kindergartenStartAge, highSchoolGraduationYear: age on the
 *    state's birthday cutoff and the resulting grade / start year / class.
 *  - schoolDays, hundredthDay: weekday counting minus breaks.
 *  - snowDay: a fun logistic estimate from snowfall vs the region's
 *    tolerance, timing, ice, cold, wind and snow days already used.
 *  - runningRecord (accuracy, self-correction ratio, reading level),
 *    oralReadingFluency (WCPM vs Hasbrouck & Tindal 2017 50th percentile),
 *    dibelsComposite (measures vs benchmark goals), brigance (chronological
 *    age for screening), lexileLevel (grade / text level → Lexile band),
 *    fleschKincaid (grade level and reading ease), teaAccountability (Texas
 *    A–F overall score).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-edu-school-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const yes = (v: number) => Math.round(safeNumber(v)) === 1;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const DAY = 86_400_000;
const date = (y: number, m: number, d: number) => new Date(Date.UTC(Math.round(nonNeg(y, 2000)), Math.round(clamp(nonNeg(m, 1), 1, 12)) - 1, Math.round(clamp(nonNeg(d, 1), 1, 31))));

function ageOn(birth: Date, on: Date) {
  let years = on.getUTCFullYear() - birth.getUTCFullYear();
  const before = on.getUTCMonth() < birth.getUTCMonth() || (on.getUTCMonth() === birth.getUTCMonth() && on.getUTCDate() < birth.getUTCDate());
  if (before) years -= 1;
  const last = new Date(Date.UTC(birth.getUTCFullYear() + years, birth.getUTCMonth(), birth.getUTCDate()));
  let months = (on.getUTCFullYear() - last.getUTCFullYear()) * 12 + on.getUTCMonth() - last.getUTCMonth();
  if (on.getUTCDate() < last.getUTCDate()) months -= 1;
  months = clamp(months, 0, 11);
  const monthAnchor = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + months, last.getUTCDate()));
  return { years, months, days: Math.max(0, Math.round((on.getTime() - monthAnchor.getTime()) / DAY)), totalMonths: years * 12 + months };
}

/** First school year (fall of year Y) in which the child is 5 on the cutoff date. */
function kindergartenYear(birth: Date, cutMonth: number, cutDay: number) {
  let y = birth.getUTCFullYear() + 4;
  while (ageOn(birth, date(y, cutMonth, cutDay)).years < 5) y++;
  return y;
}

export const schoolAge: CustomCalculator = (v) => {
  const birth = date(v.birthYear, v.birthMonth, v.birthDay);
  const year = Math.round(nonNeg(v.schoolYear, 2026));
  const a = ageOn(birth, date(year, v.cutoffMonth, v.cutoffDay));
  return { ageOnCutoff: a.years, ageMonths: a.months, gradeLevel: clamp(a.years - 5, -2, 13), ageOnFirstDay: ageOn(birth, date(year, 8, 15)).years };
};

export const kindergartenStartAge: CustomCalculator = (v) => {
  const birth = date(v.birthYear, v.birthMonth, v.birthDay);
  const cm = Math.round(nonNeg(v.cutoffMonth, 9));
  const cd = Math.round(nonNeg(v.cutoffDay, 1));
  const ky = kindergartenYear(birth, cm, cd);
  const startAge = ageOn(birth, date(ky, 8, 15));
  const atCutoff = ageOn(birth, date(ky, cm, cd));
  return { kindergartenYear: ky, ageAtStartYears: startAge.years, ageAtStartMonths: startAge.months, youngestInClass: atCutoff.years === 5 && atCutoff.months < 3 ? 1 : 0, graduationYear: ky + 13 };
};

export const highSchoolGraduationYear: CustomCalculator = (v) => {
  if (yes(v.useCurrentGrade)) {
    const grade = clamp(Math.round(safeNumber(v.currentGrade)), 0, 12);
    const endYear = Math.round(nonNeg(v.schoolYearEnd, 2027));
    return { graduationYear: endYear + (12 - grade), kindergartenYear: endYear - 1 - grade, yearsUntilGraduation: 12 - grade };
  }
  const birth = date(v.birthYear, v.birthMonth, v.birthDay);
  const ky = kindergartenYear(birth, Math.round(nonNeg(v.cutoffMonth, 9)), Math.round(nonNeg(v.cutoffDay, 1)));
  return { graduationYear: ky + 13, kindergartenYear: ky, yearsUntilGraduation: Math.max(0, ky + 13 - Math.round(nonNeg(v.schoolYearEnd, 2027))) };
};

function weekdays(a: Date, b: Date) {
  let n = 0;
  for (let t = a.getTime(); t <= b.getTime(); t += DAY) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) n++;
  }
  return n;
}

export const schoolDays: CustomCalculator = (v) => {
  const a = date(v.startYear, v.startMonth, v.startDay);
  const b = date(v.endYear, v.endMonth, v.endDay);
  if (b < a) return { schoolDays: 0, weekdays: 0, calendarDays: 0, schoolWeeks: 0 };
  const wd = weekdays(a, b);
  const days = Math.max(0, wd - nonNeg(v.daysOff));
  return { schoolDays: days, weekdays: wd, calendarDays: Math.round((b.getTime() - a.getTime()) / DAY) + 1, schoolWeeks: round2(days / 5) };
};

export const hundredthDay: CustomCalculator = (v) => {
  const start = date(v.startYear, v.startMonth, v.startDay);
  const target = Math.max(1, Math.round(nonNeg(v.targetDay, 100)));
  const off = Math.round(nonNeg(v.daysOff));
  let count = 0;
  let t = start.getTime();
  for (let guard = 0; guard < 1000; guard++, t += DAY) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) count++;
    if (count >= target + off) break;
  }
  const r = new Date(t);
  return { year: r.getUTCFullYear(), month: r.getUTCMonth() + 1, day: r.getUTCDate(), weekday: r.getUTCDay(), calendarDaysAfterStart: Math.round((t - start.getTime()) / DAY) };
};

const SNOW_TOLERANCE = [1, 3, 6]; // inches: South, Mid-Atlantic / Midwest, North / Snow Belt

export const snowDay: CustomCalculator = (v) => {
  const snow = nonNeg(v.snowfall);
  const threshold = SNOW_TOLERANCE[clamp(Math.round(nonNeg(v.region, 1)), 0, 2)];
  const timing = [0.8, 0.5, -0.6][clamp(Math.round(nonNeg(v.timing)), 0, 2)];
  const x =
    -1.2 + 0.9 * (snow - threshold) + timing + (yes(v.ice) ? 1.6 : 0) + (safeNumber(v.temperature, 30) < 15 ? 0.4 : 0) + (nonNeg(v.windMph) >= 25 ? 0.4 : 0) - 0.25 * nonNeg(v.snowDaysUsed);
  const p = 1 / (1 + Math.exp(-x));
  return { snowDayChance: round2(p * 100), delayChance: round2(Math.min(99, (1 / (1 + Math.exp(-(x + 1.5)))) * 100)), inchesOverThreshold: round2(snow - threshold) };
};

export const runningRecord: CustomCalculator = (v) => {
  const words = Math.max(1, nonNeg(v.runningWords, 1));
  const e = nonNeg(v.errors);
  const sc = nonNeg(v.selfCorrections);
  const acc = ((words - e) / words) * 100;
  return {
    accuracyRate: round2(acc),
    errorRatio: e > 0 ? round2(words / e) : 0,
    selfCorrectionRatio: sc > 0 ? round2((e + sc) / sc) : 0,
    readingLevel: acc >= 95 ? 3 : acc >= 90 ? 2 : 1,
  };
};

// Hasbrouck & Tindal (2017) 50th percentile WCPM: [fall, winter, spring] for grades 1–6.
const ORF_50 = [[0, 29, 60], [50, 84, 100], [83, 97, 112], [94, 120, 133], [121, 133, 146], [132, 145, 146]];

export const oralReadingFluency: CustomCalculator = (v) => {
  const secs = Math.max(1, nonNeg(v.seconds, 60));
  const words = nonNeg(v.wordsRead);
  const wcpm = Math.max(0, ((words - nonNeg(v.errors)) / secs) * 60);
  const norm = ORF_50[clamp(Math.round(nonNeg(v.grade, 2)), 1, 6) - 1][clamp(Math.round(nonNeg(v.season)), 0, 2)];
  return {
    wcpm: round2(wcpm),
    accuracy: words > 0 ? round2(((words - nonNeg(v.errors)) / words) * 100) : 0,
    gradeNorm50th: norm,
    percentOfNorm: norm > 0 ? round2((wcpm / norm) * 100) : 0,
    status: norm > 0 ? (wcpm >= norm ? 3 : wcpm >= norm - 10 ? 2 : 1) : 0,
  };
};

export const dibelsComposite: CustomCalculator = (v) => {
  let sum = 0;
  let n = 0;
  for (let i = 1; i <= 5; i++) {
    const goal = nonNeg(v[`goal${i}`]);
    if (goal <= 0) continue;
    sum += Math.min(150, (nonNeg(v[`score${i}`]) / goal) * 100);
    n++;
  }
  const index = n ? sum / n : 0;
  return { compositeIndex: round2(index), benchmarkStatus: index >= 100 ? 4 : index >= 90 ? 3 : index >= 75 ? 2 : 1, measuresCounted: n };
};

export const brigance: CustomCalculator = (v) => {
  const a = ageOn(date(v.birthYear, v.birthMonth, v.birthDay), date(v.testYear, v.testMonth, v.testDay));
  const cutoff = nonNeg(v.cutoffScore);
  const score = nonNeg(v.totalScore);
  return { ageYears: a.years, ageMonths: a.months, ageDays: a.days, ageInMonths: a.totalMonths, belowCutoff: cutoff > 0 && score < cutoff ? 1 : 0 };
};

// Typical Lexile midpoints by grade level (text or reader), and CCSS stretch bands.
const LEXILE: [number, number][] = [[0, 0], [1, 190], [2, 420], [3, 620], [4, 740], [5, 850], [6, 925], [7, 970], [8, 1010], [9, 1050], [10, 1120], [11, 1185], [12, 1300], [13, 1385]];
const BANDS: [number, number, number][] = [[1, 190, 530], [3, 420, 820], [5, 740, 1010], [8, 925, 1185], [10, 1050, 1335], [12, 1185, 1385]];

export const lexileLevel: CustomCalculator = (v) => {
  const g = clamp(nonNeg(v.gradeLevel), 0, 13);
  let lex = 0;
  for (let i = 1; i < LEXILE.length; i++) {
    const [g0, l0] = LEXILE[i - 1];
    const [g1, l1] = LEXILE[i];
    if (g <= g1) {
      lex = l0 + ((l1 - l0) * (g - g0)) / (g1 - g0);
      break;
    }
    lex = l1;
  }
  const band = BANDS.find(([upTo]) => g <= upTo) ?? BANDS[BANDS.length - 1];
  return { estimatedLexile: Math.round(lex / 10) * 10, bandLow: band[1], bandHigh: band[2] };
};

export const fleschKincaid: CustomCalculator = (v) => {
  const w = Math.max(1, nonNeg(v.words, 1));
  const s = Math.max(1, nonNeg(v.sentences, 1));
  const syl = nonNeg(v.syllables);
  return {
    gradeLevel: round2(0.39 * (w / s) + 11.8 * (syl / w) - 15.59),
    readingEase: round2(206.835 - 1.015 * (w / s) - 84.6 * (syl / w)),
    wordsPerSentence: round2(w / s),
    syllablesPerWord: round2(syl / w),
  };
};

export const teaAccountability: CustomCalculator = (v) => {
  const d1 = clamp(nonNeg(v.studentAchievement), 0, 100);
  const d2 = Math.max(clamp(nonNeg(v.academicGrowth), 0, 100), clamp(nonNeg(v.relativePerformance), 0, 100));
  const d3 = clamp(nonNeg(v.closingTheGaps), 0, 100);
  const best = Math.max(d1, d2);
  const overall = Math.round(best * 0.7 + d3 * 0.3);
  return { overallScore: overall, rating: overall >= 90 ? 5 : overall >= 80 ? 4 : overall >= 70 ? 3 : overall >= 60 ? 2 : 1, betterOfDomain1And2: best, pointsToNextRating: overall >= 90 ? 0 : (Math.floor(overall / 10) + 1) * 10 - overall };
};

export const eduSchoolCustomCalculators: Record<string, CustomCalculator> = {
  "school-age-calculator": schoolAge,
  "kindergarten-start-age-calculator": kindergartenStartAge,
  "high-school-graduation-year-calculator": highSchoolGraduationYear,
  "school-days-calculator": schoolDays,
  "100th-day-of-school-calculator": hundredthDay,
  "snow-day-calculator": snowDay,
  "running-record-calculator": runningRecord,
  "oral-reading-fluency-wcpm-calculator": oralReadingFluency,
  "dibels-composite-score-calculator": dibelsComposite,
  "brigance-calculator": brigance,
  "lexile-level-calculator": lexileLevel,
  "flesch-kincaid-grade-level-calculator": fleschKincaid,
  "tea-accountability-calculator": teaAccountability,
};
