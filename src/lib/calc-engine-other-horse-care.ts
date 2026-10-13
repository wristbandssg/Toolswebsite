/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-horse-care (9 tools). See calc-engine-other-football.ts for the
 * full list of other-* sub-batches.
 *
 * Merged: stallion calculator -> horse color (sire x dam colour odds).
 *
 * Near-namesakes, and how each is deliberately different:
 *  - horseCalorieCalculator: daily energy need (Mcal DE) by work /
 *    breeding status.
 *  - horseFeedCalculator: a daily ration — hay plus concentrate to meet
 *    that energy need.
 *  - horseForageCalculator: hay bales and tons for a period, with pasture
 *    and waste.
 *  - horseGestationCalculator vs horseHeatCycleCalculator: foaling date
 *    from breeding vs next heat / ovulation window.
 *  - horseWeightCalculator vs horseHeightCalculator: tape weight vs hands
 *    and mature-height prediction.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-horse-care-calculators.ts for the copy.
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
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Weight: unit 1 = lb, 2 = kg -> kg. */
const kgOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v : v * 0.45359237);

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const dayOfYear = (month: number, day: number) => MONTH_START[clamp(whole(month, 1), 1, 12) - 1] + clamp(whole(day, 1), 1, 31);
function dateOf(doy: number): [number, number] {
  const d = ((Math.round(doy) - 1) % 365 + 365) % 365 + 1;
  let m = 11;
  while (m > 0 && MONTH_START[m] >= d) m--;
  return [m + 1, d - MONTH_START[m]];
}

// --- 1. Horse colour (sire x dam) -----------------------------------------------
/** Probability the parent passes the recessive / dilution allele: genotype 1 = homozygous dominant, 2 = het, 3 = homozygous recessive. */
const passRecessive = (g: number) => (whole(g, 2) === 1 ? 0 : whole(g, 2) === 2 ? 0.5 : 1);
/** Cream / grey: 1 = none, 2 = one copy, 3 = two copies -> probability of passing it. */
const passDilute = (g: number) => (whole(g, 1) === 1 ? 0 : whole(g, 1) === 2 ? 0.5 : 1);

export const horseColorCalculator: CustomCalculator = (values) => {
  const pChestnut = passRecessive(values.sireExtension) * passRecessive(values.damExtension);
  const pBlackBase = (1 - pChestnut) * passRecessive(values.sireAgouti) * passRecessive(values.damAgouti);
  const pBayBase = 1 - pChestnut - pBlackBase;
  const cs = passDilute(values.sireCream);
  const cd = passDilute(values.damCream);
  const c0 = (1 - cs) * (1 - cd);
  const c2 = cs * cd;
  const c1 = 1 - c0 - c2;
  const grey = 1 - (1 - passDilute(values.sireGrey)) * (1 - passDilute(values.damGrey));
  const pc = (x: number) => round2(x * 100);

  return {
    chestnutPct: pc(pChestnut * c0),
    bayPct: pc(pBayBase * c0),
    blackPct: pc(pBlackBase * c0),
    palominoPct: pc(pChestnut * c1),
    buckskinPct: pc(pBayBase * c1),
    smokyBlackPct: pc(pBlackBase * c1),
    doubleDilutePct: pc(c2),
    greyPct: pc(grey),
  };
};

// --- 2. Gestation (foaling date) ------------------------------------------------------
export const horseGestationCalculator: CustomCalculator = (values) => {
  const bred = dayOfYear(values.month, values.day);
  const days = clamp(nonNeg(values.gestationDays, 340), 300, 400);
  const [dm, dd] = dateOf(bred + days);
  const [em, ed] = dateOf(bred + 320);
  const [lm, ld] = dateOf(bred + 370);
  const [um, ud] = dateOf(bred + 15);

  return { dueMonth: dm, dueDay: dd, earliestMonth: em, earliestDay: ed, latestMonth: lm, latestDay: ld, ultrasoundMonth: um, ultrasoundDay: ud };
};

// --- 3. Heat (estrous) cycle -------------------------------------------------------------
export const horseHeatCycleCalculator: CustomCalculator = (values) => {
  const start = dayOfYear(values.month, values.day);
  const cycle = clamp(nonNeg(values.cycleLength, 21), 18, 26);
  const heat = clamp(nonNeg(values.heatLength, 6), 3, 10);
  const ovulation = start + heat - 1.5; // 24–48 h before the end of heat
  const [nm, nd] = dateOf(start + cycle);
  const [om, od] = dateOf(ovulation);
  const [bm, bd] = dateOf(ovulation - 2);
  const [em, ed] = dateOf(start + heat - 1);

  return { nextHeatMonth: nm, nextHeatDay: nd, ovulationMonth: om, ovulationDay: od, breedFromMonth: bm, breedFromDay: bd, heatEndsMonth: em, heatEndsDay: ed };
};

// --- 4. Horse years to human years ------------------------------------------------------------
const FIRST_YEARS = [0, 6.5, 13, 18, 20.5, 24];

export const horseYearsToHumanYearsCalculator: CustomCalculator = (values) => {
  const age = nonNeg(values.horseAge, 15);
  const i = Math.floor(age);
  const human = age <= 5 ? FIRST_YEARS[i] + (age - i) * ((FIRST_YEARS[Math.min(5, i + 1)] ?? 24) - FIRST_YEARS[i]) : 24 + 2.5 * (age - 5);

  return { humanYears: round2(human), lifeStage: age < 1 ? 1 : age < 4 ? 2 : age < 15 ? 3 : age < 20 ? 4 : 5 };
};

// --- 5. Horse weight (heart girth tape) -----------------------------------------------------------
const DIVISOR_IN: Record<number, number> = { 1: 330, 2: 301, 3: 280 };

export const horseWeightCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 2;
  const girth = nonNeg(values.heartGirth, 72) / (metric ? 2.54 : 1);
  const length = nonNeg(values.bodyLength, 66) / (metric ? 2.54 : 1);
  const lb = div(girth * girth * length, DIVISOR_IN[whole(values.age, 1)] ?? 330);

  return { weightLb: Math.round(lb), weightKg: Math.round(lb * 0.45359237), dewormerDoseLb: Math.ceil(lb / 50) * 50 };
};

// --- 6. Horse height (hands) -------------------------------------------------------------------------
const MATURE_SHARE: [number, number][] = [[0, 0.62], [6, 0.83], [12, 0.9], [18, 0.94], [24, 0.96], [36, 0.99], [48, 1]];
const toHands = (inches: number) => Math.floor(inches / 4) + Math.round((inches % 4) * 10) / 100;

export const horseHeightCalculator: CustomCalculator = (values) => {
  const mode = whole(values.unit, 1); // 1 inches, 2 cm, 3 hands (e.g. 15.2)
  const raw = nonNeg(values.height, 60);
  const inches = mode === 2 ? raw / 2.54 : mode === 3 ? Math.floor(raw) * 4 + Math.round((raw - Math.floor(raw)) * 10) : raw;
  const months = nonNeg(values.ageMonths, 48);
  let share = 1;
  for (let i = 1; i < MATURE_SHARE.length; i++) {
    if (months <= MATURE_SHARE[i][0]) {
      const [m0, s0] = MATURE_SHARE[i - 1];
      const [m1, s1] = MATURE_SHARE[i];
      share = s0 + ((months - m0) / (m1 - m0)) * (s1 - s0);
      break;
    }
  }
  const mature = inches / share;

  return {
    hands: round2(Math.floor(inches / 4) + (inches % 4) / 10),
    inches: round2(inches),
    centimetres: round2(inches * 2.54),
    predictedMatureHands: toHands(Math.round(mature)),
    isPony: inches <= 58 ? 1 : 0,
  };
};

// --- 7. Horse calories (DE requirement) -----------------------------------------------------------------
// NRC 2007: maintenance 33.3 kcal DE / kg BW / day (average), × work or status factor.
const STATUS_FACTOR: Record<number, number> = { 1: 0.91, 2: 1, 3: 1.2, 4: 1.4, 5: 1.6, 6: 1.9, 7: 1.3, 8: 1.7 };

export const horseCalorieCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 1100), values.weightUnit);
  const mcal = (0.0333 * kg) * (STATUS_FACTOR[whole(values.status, 2)] ?? 1);
  const hayMcalPerKg = Math.max(0.5, nonNeg(values.hayEnergy, 2));

  return { mcalPerDay: round2(mcal), hayKgToMeetNeed: round2(mcal / hayMcalPerKg), hayLbToMeetNeed: round2(mcal / hayMcalPerKg / 0.45359237), hayPctBodyWeight: round2((mcal / hayMcalPerKg / kg) * 100) };
};

// --- 8. Horse feed (hay + concentrate ration) ------------------------------------------------------------
export const horseFeedCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 1100), values.weightUnit);
  const need = 0.0333 * kg * (STATUS_FACTOR[whole(values.status, 4)] ?? 1.4);
  const hayKg = (kg * clamp(nonNeg(values.hayPct, 2), 1, 3)) / 100;
  const hayMcal = hayKg * Math.max(0.5, nonNeg(values.hayEnergy, 2));
  const grainKg = Math.max(0, need - hayMcal) / Math.max(1, nonNeg(values.grainEnergy, 3.2));
  const lb = (x: number) => round2(x / 0.45359237);

  return {
    hayLbPerDay: lb(hayKg),
    concentrateLbPerDay: lb(grainKg),
    hayKgPerDay: round2(hayKg),
    concentrateKgPerDay: round2(grainKg),
    totalIntakePctBw: round2(((hayKg + grainKg) / kg) * 100),
    energyNeedMcal: round2(need),
  };
};

// --- 9. Horse forage (hay for a period) ----------------------------------------------------------------------
export const horseForageCalculator: CustomCalculator = (values) => {
  const lbBw = nonNeg(values.weight, 1100) * (whole(values.weightUnit, 1) === 2 ? 2.20462 : 1);
  const horses = Math.max(1, whole(values.horses, 1));
  const pasture = clamp(nonNeg(values.pasturePct, 0), 0, 100) / 100;
  const waste = clamp(nonNeg(values.wastePct, 10), 0, 60) / 100;
  const dailyEaten = (lbBw * clamp(nonNeg(values.foragePct, 2), 1, 3)) / 100 * (1 - pasture);
  const dailyFed = dailyEaten / (1 - waste);
  const days = nonNeg(values.days, 180);
  const totalLb = dailyFed * days * horses;
  const bales = Math.ceil(totalLb / Math.max(1, nonNeg(values.baleWeight, 50)));

  return { hayLbPerDayPerHorse: round2(dailyFed), totalHayTons: round2(totalLb / 2000), balesNeeded: bales, balesPerMonth: round2((bales / Math.max(1, days)) * 30.44), totalCost: round2(bales * nonNeg(values.balePrice, 12)) };
};

export const otherHorseCareCustomCalculators: Record<string, CustomCalculator> = {
  "horse-color-calculator": horseColorCalculator,
  "horse-gestation-calculator": horseGestationCalculator,
  "horse-heat-cycle-calculator": horseHeatCycleCalculator,
  "horse-years-to-human-years-calculator": horseYearsToHumanYearsCalculator,
  "horse-weight-calculator": horseWeightCalculator,
  "horse-height-calculator": horseHeightCalculator,
  "horse-calorie-calculator": horseCalorieCalculator,
  "horse-feed-calculator": horseFeedCalculator,
  "horse-forage-calculator": horseForageCalculator,
};
