/**
 * Batch: "Law & Government Calculators" → Military & Veterans Calculators —
 * body composition, fitness screening & promotion timing (10 tools).
 *
 * Data:
 *  - Army one-site tape (Army Directive 2023-11, the only method since
 *    8 Jun 2024): male %BF = −26.97 − 0.12 × weight(lb) + 1.99 × abdomen(in);
 *    female %BF = −9.15 − 0.015 × weight + 1.27 × abdomen. Standards (AR
 *    600-9): men 20/22/24/26%, women 30/32/34/36% for ages 17–20, 21–27,
 *    28–39, 40+. AR 600-9 Table 3-1 screening weights by height (58–80 in).
 *  - DoD circumference equations (Navy, Marine Corps, Air Force, Coast
 *    Guard): men 86.010·log10(abdomen − neck) − 70.041·log10(height) + 36.76;
 *    women 163.205·log10(waist + hip − neck) − 97.684·log10(height) − 78.387.
 *    Marine Corps maximums (MCO 6110.3A): men 18/19/20/21%, women
 *    26/27/28/29% for ages 17–26, 27–39, 40–45, 46+.
 *  - Air Force body composition: waist-to-height ratio below 0.55 passes.
 *  - Navy SEAL PST minimums and commonly cited competitive scores.
 *  - SrA: 36 months TIS + 20 months TIG, or 28 months TIG, whichever first;
 *    BTZ 6 months earlier.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-mil-fit-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const isFemale = (v: number) => Math.round(safeNumber(v)) === 1;

/** AR 600-9 Table 3-1 — [height in, minimum, male 17–20, 21–27, 28–39, 40+, female 17–20, 21–27, 28–39, 40+]. */
export const ARMY_SCREENING: number[][] = [
  [58, 91, 0, 0, 0, 0, 119, 121, 122, 124],
  [59, 94, 0, 0, 0, 0, 124, 125, 126, 128],
  [60, 97, 132, 136, 139, 141, 128, 129, 131, 133],
  [61, 100, 136, 140, 144, 146, 132, 134, 135, 137],
  [62, 104, 141, 144, 148, 150, 136, 138, 140, 142],
  [63, 107, 145, 149, 153, 155, 141, 143, 144, 146],
  [64, 110, 150, 154, 158, 160, 145, 147, 149, 151],
  [65, 114, 155, 159, 163, 165, 150, 152, 154, 156],
  [66, 117, 160, 163, 168, 170, 155, 156, 158, 161],
  [67, 121, 165, 169, 174, 176, 159, 161, 163, 166],
  [68, 125, 170, 174, 179, 181, 164, 166, 168, 171],
  [69, 128, 175, 179, 184, 186, 169, 171, 173, 176],
  [70, 132, 180, 185, 189, 192, 174, 176, 178, 181],
  [71, 136, 185, 189, 194, 197, 179, 181, 183, 186],
  [72, 140, 190, 195, 200, 203, 184, 186, 188, 191],
  [73, 144, 195, 200, 205, 208, 189, 191, 194, 197],
  [74, 148, 201, 206, 211, 214, 194, 197, 199, 202],
  [75, 152, 206, 212, 217, 220, 200, 202, 204, 208],
  [76, 156, 212, 217, 223, 226, 205, 207, 210, 213],
  [77, 160, 218, 223, 229, 232, 210, 213, 215, 219],
  [78, 164, 223, 229, 235, 238, 216, 218, 221, 225],
  [79, 168, 229, 235, 241, 244, 221, 224, 227, 230],
  [80, 173, 234, 240, 247, 250, 227, 230, 233, 236],
];

const armyAgeCol = (age: number) => (age <= 20 ? 0 : age <= 27 ? 1 : age <= 39 ? 2 : 3);
export const ARMY_BF_MAX = { male: [20, 22, 24, 26], female: [30, 32, 34, 36] };

/** Army screening weight for a height (rounded to the nearest inch) and age. */
export function armyScreening(heightIn: number, age: number, female: boolean): { max: number; min: number } {
  const h = Math.round(nonNeg(heightIn, 68));
  const col = armyAgeCol(nonNeg(age, 25));
  const clampH = Math.min(80, Math.max(female ? 58 : 60, h));
  const row = ARMY_SCREENING.find((r) => r[0] === clampH)!;
  let max = row[(female ? 6 : 2) + col];
  if (h > 80) max += (h - 80) * (female ? 5 : 6);
  return { max, min: row[1] };
}

/** Army one-site tape. */
export function armyOneSite(weight: number, abdomen: number, female: boolean): number {
  const w = nonNeg(weight);
  const a = nonNeg(abdomen);
  const bf = female ? -9.15 - 0.015 * w + 1.27 * a : -26.97 - 0.12 * w + 1.99 * a;
  return Math.max(2, bf);
}

export const armyBodyFat: CustomCalculator = (v) => {
  const female = isFemale(v.sex);
  const age = nonNeg(v.age, 25);
  const bf = armyOneSite(v.weight, v.abdomen, female);
  const max = (female ? ARMY_BF_MAX.female : ARMY_BF_MAX.male)[armyAgeCol(age)];
  const exempt = nonNeg(v.aftScore) >= 465;
  const w = nonNeg(v.weight);
  return {
    bodyFatPercent: round2(Math.round(bf)),
    maximumAllowed: max,
    meetsStandard: exempt || Math.round(bf) <= max ? 1 : 0,
    percentOverStandard: round2(Math.max(0, Math.round(bf) - max)),
    fatMassLb: round2((w * bf) / 100),
    exemptByAftScore: exempt ? 1 : 0,
  };
};

export const armyHeightWeight: CustomCalculator = (v) => {
  const female = isFemale(v.sex);
  const { max, min } = armyScreening(v.heightInches, v.age, female);
  const w = Math.round(nonNeg(v.weight));
  return {
    maximumScreeningWeight: max,
    minimumWeight: min,
    poundsOverScreening: Math.max(0, w - max),
    withinScreeningWeight: w <= max && w >= min ? 1 : 0,
    personalGoalWeight: Math.round(max * 0.95),
  };
};

/** DoD circumference body fat (Navy / Marine Corps / Air Force / Coast Guard). */
export function dodBodyFat(height: number, neck: number, waist: number, hip: number, female: boolean): number {
  const h = Math.max(1, nonNeg(height, 68));
  if (female) {
    const x = Math.max(1, nonNeg(waist) + nonNeg(hip) - nonNeg(neck));
    return 163.205 * Math.log10(x) - 97.684 * Math.log10(h) - 78.387;
  }
  const x = Math.max(1, nonNeg(waist) - nonNeg(neck));
  return 86.01 * Math.log10(x) - 70.041 * Math.log10(h) + 36.76;
}

export const USMC_BF_MAX = { male: [18, 19, 20, 21], female: [26, 27, 28, 29] };
const usmcAgeCol = (age: number) => (age <= 26 ? 0 : age <= 39 ? 1 : age <= 45 ? 2 : 3);

export const usmcBodyFat: CustomCalculator = (v) => {
  const female = isFemale(v.sex);
  const bf = Math.max(2, dodBodyFat(v.heightInches, v.neck, v.waist, v.hips, female));
  const age = nonNeg(v.age, 25);
  const max = (female ? USMC_BF_MAX.female : USMC_BF_MAX.male)[usmcAgeCol(age)];
  const rounded = Math.round(bf);
  return {
    bodyFatPercent: rounded,
    maximumAllowed: max,
    meetsStandard: rounded <= max ? 1 : 0,
    percentOverStandard: Math.max(0, rounded - max),
    waistToHeightRatio: round2(nonNeg(v.waist) / Math.max(1, nonNeg(v.heightInches, 68))),
  };
};

export const militaryBodyFat: CustomCalculator = (v) => {
  const female = isFemale(v.sex);
  const dod = Math.max(2, dodBodyFat(v.heightInches, v.neck, v.waist, v.hips, female));
  const army = armyOneSite(v.weight, v.waist, female);
  const w = nonNeg(v.weight);
  return {
    dodTapeBodyFat: round2(dod),
    armyOneSiteBodyFat: round2(army),
    leanMassLb: round2(w * (1 - dod / 100)),
    fatMassLb: round2((w * dod) / 100),
    waistToHeightRatio: round2(nonNeg(v.waist) / Math.max(1, nonNeg(v.heightInches, 68))),
  };
};

export const airForceBodyComposition: CustomCalculator = (v) => {
  const h = Math.max(1, nonNeg(v.heightInches, 68));
  const waist = nonNeg(v.waist);
  const ratio = waist / h;
  return {
    waistToHeightRatio: round2(Math.floor(ratio * 100) / 100),
    passes: ratio < 0.55 ? 1 : 0,
    waistLimit: round2(h * 0.55),
    inchesOverLimit: round2(Math.max(0, waist - h * 0.55)),
    healthRisk: ratio < 0.5 ? 0 : ratio < 0.55 ? 1 : 2,
  };
};

export const militaryBmi: CustomCalculator = (v) => {
  const h = Math.max(1, nonNeg(v.heightInches, 68));
  const w = nonNeg(v.weight);
  const bmi = (703 * w) / (h * h);
  return {
    bmi: round2(bmi),
    category: bmi < 18.5 ? 0 : bmi < 25 ? 1 : bmi < 30 ? 2 : 3,
    weightAtBmi25: round2((25 * h * h) / 703),
    weightAtBmi27_5: round2((27.5 * h * h) / 703),
    poundsOverBmi25: round2(Math.max(0, w - (25 * h * h) / 703)),
  };
};

/** Navy SEAL PST: [minimum, competitive] for each event (times in seconds). */
export const SEAL_PST = {
  swim: [750, 570],
  pushups: [50, 80],
  situps: [50, 80],
  pullups: [10, 15],
  run: [630, 570],
};
export const sealPst: CustomCalculator = (v) => {
  const swim = nonNeg(v.swimMinutes) * 60 + nonNeg(v.swimSeconds);
  const run = nonNeg(v.runMinutes) * 60 + nonNeg(v.runSeconds);
  const p = nonNeg(v.pushups);
  const s = nonNeg(v.situps);
  const u = nonNeg(v.pullups);
  const mins = [swim <= SEAL_PST.swim[0], p >= SEAL_PST.pushups[0], s >= SEAL_PST.situps[0], u >= SEAL_PST.pullups[0], run <= SEAL_PST.run[0]];
  const comps = [swim <= SEAL_PST.swim[1], p >= SEAL_PST.pushups[1], s >= SEAL_PST.situps[1], u >= SEAL_PST.pullups[1], run <= SEAL_PST.run[1]];
  return {
    eventsAtCompetitiveLevel: comps.filter(Boolean).length,
    passesMinimums: mins.every(Boolean) ? 1 : 0,
    eventsBelowMinimum: mins.filter((x) => !x).length,
    swimSecondsToCompetitive: Math.max(0, swim - SEAL_PST.swim[1]),
    runSecondsToCompetitive: Math.max(0, run - SEAL_PST.run[1]),
  };
};

/** SrA promotion and BTZ timing from current TIS/TIG (months). */
export const btzSra: CustomCalculator = (v) => {
  const tis = nonNeg(v.monthsTimeInService);
  const tig = nonNeg(v.monthsTimeInGradeA1C);
  const normal = Math.max(0, Math.min(Math.max(36 - tis, 20 - tig), 28 - tig));
  const btz = Math.max(0, normal - 6);
  return {
    monthsUntilSra: round2(normal),
    monthsUntilBtzEligible: round2(btz),
    sraTisAtPromotion: round2(tis + normal),
    sraTigAtPromotion: round2(tig + normal),
    alreadyEligible: normal === 0 ? 1 : 0,
  };
};

/** Army overseas service bars: one per 6 months in a hostile fire area. */
export const overseasServiceBars: CustomCalculator = (v) => {
  const months = nonNeg(v.monthsHostileArea);
  const bars = Math.floor(months / 6 + 1e-9);
  return {
    overseasServiceBars: bars,
    monthsToNextBar: round2((bars + 1) * 6 - months),
    monthsCounted: round2(months),
  };
};

/** Navy RSCA and how a trait average compares. */
export const navyRsca: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(nonNeg(v.numberOfReports, 1)));
  const rsca = nonNeg(v.sumOfTraitAverages) / n;
  const ta = nonNeg(v.memberTraitAverage);
  return {
    rsca: round2(rsca),
    memberVsRsca: round2(ta - rsca),
    aboveRsca: ta > rsca ? 1 : 0,
    rscaAfterThisReport: round2((nonNeg(v.sumOfTraitAverages) + ta) / (n + 1)),
  };
};

export const lawMilFitCustomCalculators: Record<string, CustomCalculator> = {
  "army-body-fat-calculator": armyBodyFat,
  "army-height-weight-calculator": armyHeightWeight,
  "usmc-body-fat-calculator": usmcBodyFat,
  "military-body-fat-calculator": militaryBodyFat,
  "air-force-body-composition-calculator": airForceBodyComposition,
  "military-bmi-calculator": militaryBmi,
  "navy-seal-pst-calculator": sealPst,
  "btz-calculator": btzSra,
  "army-overseas-service-bar-calculator": overseasServiceBars,
  "navy-rsca-calculator": navyRsca,
};
