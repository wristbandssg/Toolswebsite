/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-horse-costs (horse ownership, riding & facilities, 8 tools). See
 * calc-engine-other-football.ts for the full list of other-* sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - costOfOwningAHorseCalculator: monthly / yearly running costs;
 *    horseValueCalculator: what the horse itself is worth.
 *  - saddleSizeCalculator: rider seat size; whatSizeHorseShouldIRide
 *    Calculator: horse weight and height that suit the rider.
 *  - horseArenaSandCalculator vs horseFenceCalculator: footing volume and
 *    tons vs posts, boards and wire for a paddock.
 *  - horseShippingCostCalculator vs horseTrailerWeightCalculator: paying a
 *    hauler vs towing your own trailer safely.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-horse-costs-calculators.ts for the copy.
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
const toHands = (inches: number) => Math.floor(inches / 4) + (Math.round(inches) % 4) / 10;

// --- 1. Arena sand ----------------------------------------------------------------
const SAND_TONS_PER_YD3 = 1.35;
const BASE_TONS_PER_YD3 = 1.4;

export const horseArenaSandCalculator: CustomCalculator = (values) => {
  const area = nonNeg(values.length, 120) * nonNeg(values.width, 60);
  const sandYd3 = (area * nonNeg(values.sandDepth, 3)) / 12 / 27;
  const baseYd3 = (area * nonNeg(values.baseDepth, 0)) / 12 / 27;
  const sandTons = sandYd3 * SAND_TONS_PER_YD3;
  const baseTons = baseYd3 * BASE_TONS_PER_YD3;

  return {
    sandTons: round2(sandTons),
    sandCubicYards: round2(sandYd3),
    baseTons: round2(baseTons),
    truckloads: Math.ceil((sandTons + baseTons) / Math.max(1, nonNeg(values.truckTons, 20))),
    materialCost: round2(sandTons * nonNeg(values.sandPrice, 35) + baseTons * nonNeg(values.basePrice, 30)),
  };
};

// --- 2. Horse shipping cost -----------------------------------------------------------
export const horseShippingCostCalculator: CustomCalculator = (values) => {
  const horses = Math.max(1, whole(values.horses, 1));
  const haul = Math.max(nonNeg(values.miles, 500) * nonNeg(values.ratePerMile, 1.75) * horses, nonNeg(values.minimumCharge, 300));
  const extras = (nonNeg(values.layoverNights, 0) * nonNeg(values.layoverFee, 75) + nonNeg(values.paperwork, 150)) * horses;
  const total = haul + extras;

  return { totalCost: round2(total), costPerHorse: round2(total / horses), haulingCost: round2(haul), drivingDays: Math.max(1, Math.ceil(nonNeg(values.miles, 500) / 500)) };
};

// --- 3. Saddle size ---------------------------------------------------------------------
/** Thigh (back of buttock to knee, seated) in inches -> English seat size. */
function englishSeat(thigh: number): number {
  if (thigh <= 16.5) return 15;
  if (thigh <= 18.5) return 16;
  if (thigh <= 20) return 17;
  if (thigh <= 21.5) return 17.5;
  if (thigh <= 23.5) return 18;
  return 18.5;
}

export const saddleSizeCalculator: CustomCalculator = (values) => {
  const thigh = nonNeg(values.thighLength, 19) / (whole(values.unit, 1) === 2 ? 2.54 : 1);
  const english = englishSeat(thigh) + (whole(values.build, 2) === 3 ? 0.5 : 0);

  return { englishSeat: english, westernSeat: english - 2, thighInches: round2(thigh) };
};

// --- 4. What size horse should I ride ----------------------------------------------------
/** Rider height (in) -> suitable horse height range in inches. */
function horseRange(h: number): [number, number] {
  if (h < 60) return [54, 58];
  if (h < 64) return [58, 62];
  if (h < 68) return [60, 64];
  if (h < 72) return [62, 66];
  return [64, 68];
}

export const whatSizeHorseShouldIRideCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 2;
  const riderLb = nonNeg(values.riderWeight, 170) * (metric ? 2.20462 : 1) + nonNeg(values.tackWeight, 30) * (metric ? 2.20462 : 1);
  const heightIn = nonNeg(values.riderHeight, 66) / (metric ? 2.54 : 1);
  const [lo, hi] = horseRange(heightIn);
  const horseLb = nonNeg(values.horseWeight, 0) * (metric ? 2.20462 : 1);

  return {
    minHorseWeightLb: Math.round(riderLb / 0.2),
    idealHorseWeightLb: Math.round(riderLb / 0.15),
    horseHeightFromHands: toHands(lo),
    horseHeightToHands: toHands(hi),
    loadPctOfYourHorse: round2(div(riderLb, horseLb) * 100),
  };
};

// --- 5. Cost of owning a horse ------------------------------------------------------------
export const costOfOwningAHorseCalculator: CustomCalculator = (values) => {
  const v = (k: string, d: number) => nonNeg(values[k], d);
  const monthly =
    v("board", 600) + v("feedSupplements", 50) + (v("farrierPerVisit", 60) * 52) / Math.max(4, v("farrierWeeks", 7)) / 12 +
    v("vetPerYear", 600) / 12 + v("dentalPerYear", 150) / 12 + v("dewormingPerYear", 80) / 12 + (v("horseValue", 8000) * v("insurancePct", 3.5)) / 100 / 12 + v("tackSupplies", 40) + v("lessonsShows", 100);
  const years = v("years", 1);

  return { monthlyCost: round2(monthly), annualCost: round2(monthly * 12), totalOverYears: round2(monthly * 12 * years), farrierPerYear: round2((v("farrierPerVisit", 60) * 52) / Math.max(4, v("farrierWeeks", 7))) };
};

// --- 6. Horse value ---------------------------------------------------------------------------
function ageFactor(age: number): number {
  if (age < 4) return 0.7;
  if (age <= 12) return 1;
  if (age <= 16) return 0.75;
  if (age <= 20) return 0.5;
  return 0.25;
}
const TRAINING: Record<number, number> = { 1: 0.6, 2: 0.8, 3: 1, 4: 1.5 };
const SOUNDNESS: Record<number, number> = { 1: 1, 2: 0.7, 3: 0.2 };

export const horseValueCalculator: CustomCalculator = (values) => {
  const value = nonNeg(values.comparablePrice, 10000) * ageFactor(nonNeg(values.age, 9)) * (TRAINING[whole(values.training, 3)] ?? 1) * (SOUNDNESS[whole(values.soundness, 1)] ?? 1) * (whole(values.registered, 1) === 1 ? 1 : 0.8);

  return { estimatedValue: Math.round(value / 50) * 50, lowEstimate: Math.round((value * 0.8) / 50) * 50, highEstimate: Math.round((value * 1.2) / 50) * 50 };
};

// --- 7. Horse fence -------------------------------------------------------------------------------
export const horseFenceCalculator: CustomCalculator = (values) => {
  const perimeter = whole(values.shape, 1) === 2 ? nonNeg(values.perimeter, 1000) : 2 * (nonNeg(values.length, 300) + nonNeg(values.width, 150));
  const gateFt = whole(values.gates, 1) * nonNeg(values.gateWidth, 12);
  const fenceFt = Math.max(0, perimeter - gateFt);
  const spacing = Math.max(4, nonNeg(values.postSpacing, 10));
  const posts = Math.ceil(fenceFt / spacing) + whole(values.gates, 1) * 2;
  const rails = Math.max(1, whole(values.rails, 3));
  const boardLen = Math.max(8, nonNeg(values.boardLength, 16));

  return {
    fenceLengthFt: round2(fenceFt),
    posts,
    boards: Math.ceil((fenceFt * rails) / boardLen),
    wireOrTapeFt: Math.round(fenceFt * rails),
    acresEnclosed: whole(values.shape, 1) === 2 ? 0 : round2((nonNeg(values.length, 300) * nonNeg(values.width, 150)) / 43560),
  };
};

// --- 8. Horse trailer weight ----------------------------------------------------------------------
export const horseTrailerWeightCalculator: CustomCalculator = (values) => {
  const loaded = nonNeg(values.trailerEmpty, 3500) + nonNeg(values.horseWeight, 1100) * whole(values.horses, 2) + nonNeg(values.cargo, 400);
  const gooseneck = whole(values.hitch, 1) === 2;
  const tonguePct = gooseneck ? 0.2 : 0.12;
  const capacity = nonNeg(values.towCapacity, 10000);

  return {
    loadedWeightLb: Math.round(loaded),
    tongueWeightLb: Math.round(loaded * tonguePct),
    pctOfTowCapacity: round2(div(loaded, capacity) * 100),
    withinEightyPctRule: loaded <= capacity * 0.8 ? 1 : 0,
    spareCapacityLb: Math.round(capacity - loaded),
  };
};

export const otherHorseCostsCustomCalculators: Record<string, CustomCalculator> = {
  "horse-arena-sand-calculator": horseArenaSandCalculator,
  "horse-shipping-cost-calculator": horseShippingCostCalculator,
  "saddle-size-calculator": saddleSizeCalculator,
  "what-size-horse-should-i-ride-calculator": whatSizeHorseShouldIRideCalculator,
  "cost-of-owning-a-horse-calculator": costOfOwningAHorseCalculator,
  "horse-value-calculator": horseValueCalculator,
  "horse-fence-calculator": horseFenceCalculator,
  "horse-trailer-weight-calculator": horseTrailerWeightCalculator,
};

