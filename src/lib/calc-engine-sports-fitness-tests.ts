/**
 * Batch: "Sports Calculators" > Sports Performance Calculators, sub-batch F
 * (Fitness Tests, 11 tools). See calc-engine-sports-strength-programming.ts
 * for the full list.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - beepTestCalculator: 20 m multistage shuttle run (also the PACER test):
 *    level + shuttle, or PACER laps → VO2 max, distance and speed.
 *  - cooper15MileCalculator: the 1.5-mile run test time → VO2 max and pace.
 *  - harvardStepTestCalculator: Harvard fitness index (long and short form)
 *    and the Queens College step test VO2 (also the step test calculator).
 *  - lactateThresholdCalculator: threshold heart rate and pace from a
 *    30-minute time trial, with Friel's heart-rate zones.
 *  - pushUpTestCalculator / sitUpTestCalculator / sitAndReachCalculator /
 *    gripStrengthCalculator: age- and sex-based norms → rating.
 *  - plankTestCalculator: hold time → rating.
 *  - broadJumpTestCalculator / verticalJumpCalculator: jump norms; the
 *    vertical jump tool adds reach, rim clearance (dunk) and power.
 *
 * Ratings use 1 (lowest) to 5 or 7 (highest) as noted on each tool.
 * Self-contained: no imports from any other batch.
 * See prisma/create-sports-fitness-tests-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));
const isFemale = (v: number) => whole(v, 1) === 2;

/**
 * Rating from descending lower bounds: thresholds[0] is the minimum for the
 * top category. Returns categories.length…1 (top … bottom).
 */
function rateDesc(value: number, thresholds: number[]): number {
  const i = thresholds.findIndex((t) => value >= t);
  return i < 0 ? 1 : thresholds.length + 1 - i;
}

/** Age band index for the CSEP norms: 15–19, 20–29, 30–39, 40–49, 50–59, 60–69. */
const csepBand = (age: number) => (age < 20 ? 0 : age < 30 ? 1 : age < 40 ? 2 : age < 50 ? 3 : age < 60 ? 4 : 5);

// --- 1. Lactate Threshold ---------------------------------------------------
export const lactateThresholdCalculator: CustomCalculator = (values) => {
  // Friel: the average HR of the last 20 minutes of a solo 30-minute effort.
  const lthr = nonNeg(values.avgHrLast20, 165);
  const km = nonNeg(values.distanceKm, 7.2);
  const paceSec = km > 0 ? 1800 / km : 0;
  const z = (p: number) => Math.round(lthr * p);

  return {
    lactateThresholdHr: Math.round(lthr),
    thresholdPaceMinPerKm: Math.floor(paceSec / 60),
    thresholdPaceSecPerKm: Math.round(paceSec % 60),
    zone2Low: z(0.85),
    zone2High: z(0.89),
    zone3Low: z(0.9),
    zone3High: z(0.94),
    zone4Low: z(0.95),
    zone4High: z(0.99),
    zone5Low: z(1.0),
  };
};

// --- 2. Cooper 1.5-Mile Run -------------------------------------------------
export const cooper15MileCalculator: CustomCalculator = (values) => {
  const t = Math.max(5, nonNeg(values.minutes, 12) + nonNeg(values.seconds, 0) / 60);
  const vo2 = 3.5 + 483 / t;
  const pace = t / 1.5;

  return {
    vo2Max: round2(vo2),
    paceMinPerMile: Math.floor(pace),
    paceSecPerMile: Math.round((pace % 1) * 60) % 60,
    speedMph: round2(1.5 / (t / 60)),
    mets: round2(vo2 / 3.5),
  };
};

// --- 3. Beep Test (20 m multistage shuttle / PACER) -------------------------
// Shuttles in each level (levels 1–21), 20 m each.
const SHUTTLES = [7, 8, 8, 9, 9, 10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16];

export const beepTestCalculator: CustomCalculator = (values) => {
  let level = Math.min(21, Math.max(1, whole(values.level, 8)));
  let shuttle = whole(values.shuttle, 4);
  const laps = whole(values.pacerLaps, 0);
  if (laps > 0) {
    // PACER laps → level and shuttle.
    let left = laps;
    level = 1;
    while (level < 21 && left > SHUTTLES[level - 1]) left -= SHUTTLES[level - 1], level++;
    shuttle = left;
  }
  shuttle = Math.min(SHUTTLES[level - 1], Math.max(0, shuttle));
  const total = SHUTTLES.slice(0, level - 1).reduce((a, b) => a + b, 0) + shuttle;
  // Flouris et al. (2005) prediction.
  const vo2 = 3.46 * (level + shuttle / (level * 0.4325 + 7.0048)) + 12.2;

  return {
    vo2Max: round2(vo2),
    totalShuttles: total,
    distanceMeters: total * 20,
    finalSpeedKmh: round2(8.5 + 0.5 * (level - 1)),
    level,
    shuttle,
  };
};

// --- 4. Harvard Step Test ---------------------------------------------------
export const harvardStepTestCalculator: CustomCalculator = (values) => {
  const dur = Math.min(300, nonNeg(values.durationSeconds, 300));
  const h1 = Math.max(1, nonNeg(values.hr1, 70));
  const h2 = Math.max(1, nonNeg(values.hr2, 60));
  const h3 = Math.max(1, nonNeg(values.hr3, 55));
  const long = (100 * dur) / (2 * (h1 + h2 + h3));
  const short = (100 * dur) / (5.5 * h1);
  const q = nonNeg(values.queensHr, 0);
  // Queens College step test (HR counted 5–20 s after, × 4).
  const queens = q > 0 ? (isFemale(values.sex) ? 65.81 - 0.1847 * q : 111.33 - 0.42 * q) : 0;

  return {
    fitnessIndex: round2(long),
    // 1 poor <55, 2 low average 55–64, 3 high average 65–79, 4 good 80–89, 5 excellent 90+.
    rating: rateDesc(long, [90, 80, 65, 55]),
    shortFormIndex: round2(short),
    queensCollegeVo2: round2(Math.max(0, queens)),
  };
};

// --- 5. Push-Up Test (CSEP norms) -------------------------------------------
// [Excellent, Very good, Good, Fair] minimums; below Fair = Needs improvement.
const PUSHUP = {
  M: [[39, 29, 23, 18], [36, 29, 22, 17], [30, 22, 17, 12], [25, 17, 13, 10], [21, 13, 10, 7], [18, 11, 8, 5]],
  F: [[33, 25, 18, 12], [30, 21, 15, 10], [27, 20, 13, 8], [24, 15, 11, 5], [21, 11, 7, 2], [17, 12, 5, 2]],
};

function normRating(table: { M: number[][]; F: number[][] }, female: boolean, age: number, value: number) {
  const row = (female ? table.F : table.M)[csepBand(age)];
  const rating = rateDesc(value, row);
  const next = row.slice().reverse().find((t) => t > value);
  return { rating, next: next ?? 0, excellent: row[0] };
}

export const pushUpTestCalculator: CustomCalculator = (values) => {
  const reps = whole(values.reps, 25);
  const r = normRating(PUSHUP, isFemale(values.sex), nonNeg(values.age, 30), reps);
  return { rating: r.rating, repsForNextRating: r.next, repsForExcellent: r.excellent };
};

// --- 6. Sit-Up Test (1 minute) ----------------------------------------------
// Age bands 18–25, 26–35, 36–45, 46–55, 56–65, 65+; minimums for
// Excellent, Good, Above average, Average, Below average, Poor.
const SITUP = {
  M: [[49, 44, 39, 35, 31, 25], [45, 40, 35, 31, 29, 22], [41, 35, 30, 27, 23, 17], [35, 29, 25, 22, 18, 13], [31, 25, 21, 17, 13, 9], [28, 22, 19, 15, 11, 7]],
  F: [[43, 37, 33, 29, 25, 18], [39, 33, 29, 25, 21, 13], [33, 27, 23, 19, 15, 7], [27, 22, 18, 14, 10, 5], [24, 18, 13, 10, 7, 3], [23, 17, 14, 11, 6, 2]],
};

export const sitUpTestCalculator: CustomCalculator = (values) => {
  const age = nonNeg(values.age, 30);
  const band = age < 26 ? 0 : age < 36 ? 1 : age < 46 ? 2 : age < 56 ? 3 : age < 66 ? 4 : 5;
  const row = (isFemale(values.sex) ? SITUP.F : SITUP.M)[band];
  const reps = whole(values.reps, 35);
  const next = row.slice().reverse().find((t) => t > reps);
  // 7 excellent … 1 very poor.
  return { rating: rateDesc(reps, row), repsForNextRating: next ?? 0, repsForExcellent: row[0] };
};

// --- 7. Plank Test ----------------------------------------------------------
export const plankTestCalculator: CustomCalculator = (values) => {
  const s = nonNeg(values.minutes, 1) * 60 + nonNeg(values.seconds, 30);
  // 5 excellent (2:00+), 4 good (1:30), 3 average (1:00), 2 fair (0:30), 1 poor.
  const rating = rateDesc(s, [120, 90, 60, 30]);
  const next = [30, 60, 90, 120].find((t) => t > s);
  return { rating, holdSeconds: Math.round(s), secondsToNextRating: next ? Math.round(next - s) : 0 };
};

// --- 8. Sit and Reach (CSEP, box with feet at 26 cm) ------------------------
const SIT_REACH = {
  M: [[39, 34, 29, 24], [40, 34, 30, 25], [38, 33, 28, 23], [35, 29, 24, 18], [35, 28, 24, 16], [33, 25, 20, 15]],
  F: [[43, 38, 34, 29], [41, 37, 33, 28], [41, 36, 32, 27], [38, 34, 30, 25], [39, 33, 30, 25], [35, 31, 27, 23]],
};

export const sitAndReachCalculator: CustomCalculator = (values) => {
  const inches = whole(values.unit, 1) === 2;
  // Reach can be negative when measured from the toes.
  const raw = safeNumber(values.reach, 30) * (inches ? 2.54 : 1);
  // Convert to the CSEP box scale (feet at 26 cm).
  const zero = { 1: 26, 2: 23, 3: 0 }[whole(values.boxType, 1)] ?? 26;
  const csep = raw - zero + 26;
  const r = normRating(SIT_REACH, isFemale(values.sex), nonNeg(values.age, 30), csep);
  return { rating: r.rating, csepScoreCm: round2(csep), cmForNextRating: r.next ? round2(r.next - csep) : 0, reachPastToesCm: round2(csep - 26) };
};

// --- 9. Grip Strength (CSEP, both hands combined, kg) -----------------------
const GRIP = {
  M: [[113, 103, 95, 84], [124, 113, 106, 97], [123, 113, 105, 97], [119, 110, 102, 94], [110, 102, 96, 87], [102, 93, 86, 79]],
  F: [[71, 64, 59, 54], [71, 65, 61, 55], [73, 66, 61, 56], [73, 65, 59, 51], [65, 59, 55, 51], [60, 54, 51, 48]],
};

export const gripStrengthCalculator: CustomCalculator = (values) => {
  const k = whole(values.unit, 1) === 2 ? 0.45359237 : 1;
  const right = nonNeg(values.rightHand, 55) * k;
  const left = nonNeg(values.leftHand, 50) * k;
  const combined = right + left;
  const r = normRating(GRIP, isFemale(values.sex), nonNeg(values.age, 30), combined);
  const strong = Math.max(right, left);

  return {
    rating: r.rating,
    combinedKg: round2(combined),
    asymmetryPercent: strong > 0 ? round2((Math.abs(right - left) / strong) * 100) : 0,
    kgForNextRating: r.next ? round2(r.next - combined) : 0,
  };
};

// --- 10. Broad Jump ---------------------------------------------------------
// Adult standing long jump (cm): Excellent, Very good, Above avg, Average,
// Below avg, Poor minimums.
const BROAD = { M: [250, 241, 231, 221, 211, 191], F: [200, 191, 181, 171, 161, 141] };

export const broadJumpTestCalculator: CustomCalculator = (values) => {
  const cm = nonNeg(values.distance, 230) * (whole(values.unit, 1) === 2 ? 2.54 : 1);
  const row = isFemale(values.sex) ? BROAD.F : BROAD.M;
  const next = row.slice().reverse().find((t) => t > cm);
  const h = nonNeg(values.height, 0) * (whole(values.unit, 1) === 2 ? 2.54 : 1);

  return {
    rating: rateDesc(cm, row),
    distanceMeters: round2(cm / 100),
    distanceFeet: round2(cm / 30.48),
    cmForNextRating: next ? round2(next - cm) : 0,
    jumpToHeightRatio: h > 0 ? round2(cm / h) : 0,
  };
};

// --- 11. Vertical Jump / Dunk -----------------------------------------------
// Rating minimums (cm): Excellent … Poor (7 levels).
const VERT = { M: [70, 61, 51, 41, 31, 21], F: [60, 51, 41, 31, 21, 11] };

export const verticalJumpCalculator: CustomCalculator = (values) => {
  const toCm = whole(values.unit, 1) === 2 ? 2.54 : 1;
  const reach = nonNeg(values.standingReach, 230) * toCm;
  const touch = nonNeg(values.jumpTouch, 0) * toCm;
  const jump = touch > reach ? touch - reach : nonNeg(values.verticalJump, 70) * toCm;
  const maxTouch = reach + jump;
  const rim = 304.8;
  // A dunk needs the hand about 15 cm (6 in) above the rim.
  const toDunk = Math.max(0, rim + 15.24 - reach);
  const kgW = nonNeg(values.bodyweight, 80) * (whole(values.unit, 1) === 2 ? 0.45359237 : 1);
  const out = (cm: number) => round2(cm / toCm);

  return {
    verticalJump: out(jump),
    maxTouchHeight: out(maxTouch),
    aboveRim: out(maxTouch - rim),
    verticalNeededToDunk: out(toDunk),
    canDunk: maxTouch >= rim + 15.24 ? 1 : 0,
    rating: rateDesc(jump, isFemale(values.sex) ? VERT.F : VERT.M),
    // Sayers peak power (W).
    peakPowerWatts: kgW > 0 ? Math.round(60.7 * jump + 45.3 * kgW - 2055) : 0,
  };
};

export const sportsFitnessTestsCustomCalculators: Record<string, CustomCalculator> = {
  "lactate-threshold-calculator": lactateThresholdCalculator,
  "cooper-1-5-mile-calculator": cooper15MileCalculator,
  "beep-test-calculator": beepTestCalculator,
  "harvard-step-test-calculator": harvardStepTestCalculator,
  "push-up-test-calculator": pushUpTestCalculator,
  "sit-up-test-calculator": sitUpTestCalculator,
  "plank-test-calculator": plankTestCalculator,
  "sit-and-reach-calculator": sitAndReachCalculator,
  "grip-strength-calculator": gripStrengthCalculator,
  "broad-jump-test-calculator": broadJumpTestCalculator,
  "vertical-jump-calculator": verticalJumpCalculator,
};
