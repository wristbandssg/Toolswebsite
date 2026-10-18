/**
 * Batch: "Law & Government Calculators" → Military & Veterans Calculators —
 * PCS moves, travel & housing allowances (8 tools).
 *
 * Data:
 *  - DLA_2026: dislocation allowance by grade from 1 Jan 2026 (MAP 72-25(I)),
 *    [without dependents, with dependents]; partial DLA $1,002.71.
 *  - MALT: $0.235 a mile per authorized POV for travel starting on or after
 *    1 Jul 2026 ($0.205 before).
 *  - Standard CONUS per diem FY2027 (from 1 Oct 2026): lodging $113, M&IE $68
 *    ($181). PCS flat per diem: member 100%, dependents 12+ 75%, under 12 50%.
 *    First/last day of TDY travel: 75% of M&IE.
 *  - PCS travel days (JTR 050202): 1 day for up to 400 miles, then 1 day per
 *    additional 350 miles; a remainder of 51+ miles adds a day.
 *  - TLE: actual lodging up to the locality lodging rate × family percentage,
 *    plus M&IE × the same percentage, capped at $290 a day (member alone 65%,
 *    member + 1 dependent 100%, each extra dependent 12+ 35%, under 12 25%).
 *  - HHG_WEIGHT: JTR Table 5-37 weight allowances [without, with dependents].
 *
 * Near-namesakes, kept distinct on purpose:
 *  - military-travel-pay-calculator: mileage + per diem for one trip (PCS
 *    leg or ETS travel home) — no DLA, no TLE.
 *  - pcs-move-calculator: the whole PCS package (DLA + travel pay + TLE).
 *  - per-diem-calculator: TDY per diem by days at a GSA locality rate.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-mil-moves-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

/** [grade, DLA without dependents, DLA with dependents, HHG lbs without, HHG lbs with]. Index = dropdown value. */
export const MOVE_GRADES: [string, number, number, number, number][] = [
  ["E-1", 1870.58, 3548.02, 5000, 8000],
  ["E-2", 2025.0, 3548.02, 5000, 8000],
  ["E-3", 2355.0, 3548.02, 5000, 8000],
  ["E-4", 2389.42, 3548.02, 7000, 8000],
  ["E-5", 2389.42, 3548.02, 7000, 9000],
  ["E-6", 2389.42, 3548.02, 8000, 11000],
  ["E-7", 2468.19, 3551.31, 11000, 13000],
  ["E-8", 2889.0, 3825.0, 12000, 14000],
  ["E-9", 3147.54, 4149.51, 13000, 15000],
  ["W-1", 2395.0, 3151.0, 10000, 12000],
  ["W-2", 2860.7, 3643.75, 12500, 13500],
  ["W-3", 3221.0, 3961.0, 13000, 14500],
  ["W-4", 3832.0, 4323.0, 14000, 17000],
  ["W-5", 4316.0, 4716.0, 16000, 17500],
  ["O-1", 2273.82, 3085.23, 10000, 12000],
  ["O-2", 2700.0, 3451.0, 12500, 13500],
  ["O-3", 3404.11, 4041.88, 13000, 14500],
  ["O-4", 4248.0, 4885.0, 14000, 17000],
  ["O-5", 4583.51, 5542.06, 16000, 17500],
  ["O-6", 4758.96, 5749.63, 18000, 18000],
  ["O-7 to O-10", 5187.33, 6385.58, 18000, 18000],
  ["O-1E", 2687.0, 3621.0, 10000, 12000],
  ["O-2E", 3125.0, 3919.0, 12500, 13500],
  ["O-3E", 3676.0, 4344.0, 13000, 14500],
];

export const PARTIAL_DLA = 1002.71;
export const MALT_PER_MILE = 0.235;
export const STD_LODGING = 113;
export const STD_MIE = 68;
export const STD_PER_DIEM = STD_LODGING + STD_MIE;
export const TLE_DAILY_CAP = 290;

const gradeRow = (g: number) => MOVE_GRADES[Math.min(MOVE_GRADES.length - 1, Math.max(0, Math.round(safeNumber(g))))];
const withDeps = (v: number) => Math.round(safeNumber(v)) === 1;

/** Authorized PCS travel days for a distance (JTR 050202). */
export function pcsTravelDays(miles: number): number {
  const m = nonNeg(miles);
  if (m <= 0) return 0;
  if (m <= 400) return 1;
  const rest = m - 400;
  const full = Math.floor(rest / 350);
  return 1 + full + (rest - full * 350 >= 51 ? 1 : 0);
}

function travelPay(miles: number, vehicles: number, deps12: number, depsUnder12: number, perDiem = STD_PER_DIEM) {
  const days = pcsTravelDays(miles);
  const cars = Math.min(2, Math.max(1, Math.round(nonNeg(vehicles, 1))));
  const malt = nonNeg(miles) * MALT_PER_MILE * cars;
  const dailyFamily = perDiem * (1 + 0.75 * nonNeg(deps12) + 0.5 * nonNeg(depsUnder12));
  const pd = days * dailyFamily;
  return { days, malt, perDiem: pd, total: malt + pd };
}

/** Dislocation Allowance. */
export const dislocationAllowance: CustomCalculator = (v) => {
  const [, without, withD] = gradeRow(v.grade);
  const partial = Math.round(safeNumber(v.moveType)) === 1;
  const amount = partial ? PARTIAL_DLA : withDeps(v.dependents) ? withD : without;
  return {
    dlaAmount: amount,
    dlaWithoutDependents: without,
    dlaWithDependents: withD,
    differenceWithDependents: round2(withD - without),
  };
};

/** Military travel pay (MALT + flat per diem) for a PCS leg or ETS travel home. */
export const militaryTravelPay: CustomCalculator = (v) => {
  const t = travelPay(v.miles, v.vehicles, v.dependents12Plus, v.dependentsUnder12);
  return {
    totalTravelPay: round2(t.total),
    authorizedTravelDays: t.days,
    maltMileagePay: round2(t.malt),
    perDiemPay: round2(t.perDiem),
    perDiemPerDay: round2(t.days > 0 ? t.perDiem / t.days : 0),
  };
};

/** TLE for a CONUS PCS. */
export function tleDaily(lodgingRate: number, mieRate: number, actualLodging: number, deps12: number, depsUnder12: number, hasDeps: boolean) {
  const d12 = nonNeg(deps12);
  const dU = nonNeg(depsUnder12);
  const totalDeps = d12 + dU;
  let pct = 0.65;
  if (hasDeps && totalDeps > 0) {
    // First dependent brings it to 100%; then 35% per extra 12+, 25% per extra under-12.
    const extra12 = d12 > 0 ? d12 - 1 : 0;
    const extraU = d12 > 0 ? dU : dU - 1;
    pct = 1 + 0.35 * extra12 + 0.25 * Math.max(0, extraU);
  }
  const lodging = Math.min(nonNeg(actualLodging), nonNeg(lodgingRate) * pct);
  const mie = nonNeg(mieRate) * pct;
  return { pct, daily: Math.min(TLE_DAILY_CAP, lodging + mie), lodging, mie };
}

export const tle: CustomCalculator = (v) => {
  const days = Math.min(21, nonNeg(v.days, 10));
  const t = tleDaily(v.lodgingRate, v.mieRate, v.actualLodgingPerNight, v.dependents12Plus, v.dependentsUnder12, nonNeg(v.dependents12Plus) + nonNeg(v.dependentsUnder12) > 0);
  return {
    totalTle: round2(t.daily * days),
    tlePerDay: round2(t.daily),
    familyPercentage: round2(t.pct * 100),
    lodgingPortionPerDay: round2(Math.min(t.lodging, t.daily)),
    capped: t.lodging + t.mie > TLE_DAILY_CAP ? 1 : 0,
  };
};

/** Whole PCS package: DLA + travel pay + TLE at origin/destination. */
export const pcsMove: CustomCalculator = (v) => {
  const [, without, withD] = gradeRow(v.grade);
  const deps = nonNeg(v.dependents12Plus) + nonNeg(v.dependentsUnder12);
  const dla = deps > 0 ? withD : without;
  const t = travelPay(v.miles, v.vehicles, v.dependents12Plus, v.dependentsUnder12);
  const tleDays = Math.min(21, nonNeg(v.tleDays));
  const td = tleDaily(STD_LODGING, STD_MIE, nonNeg(v.lodgingPerNight, STD_LODGING), v.dependents12Plus, v.dependentsUnder12, deps > 0);
  const tleTotal = td.daily * tleDays;
  const total = dla + t.total + tleTotal;
  return {
    totalPcsEntitlements: round2(total),
    dislocationAllowance: dla,
    travelPay: round2(t.total),
    tlePay: round2(tleTotal),
    authorizedTravelDays: t.days,
    netAfterMovingCosts: round2(total - nonNeg(v.outOfPocketCosts)),
  };
};

/** PPM (DITY) incentive: 100% of the government constructed cost, pro-rated if over the weight allowance. */
export const ppmMove: CustomCalculator = (v) => {
  const [, , , wNo, wWith] = gradeRow(v.grade);
  const allowance = withDeps(v.dependents) ? wWith : wNo;
  const weight = nonNeg(v.weightMoved);
  const gcc = nonNeg(v.governmentConstructedCost);
  const share = weight > 0 ? Math.min(1, allowance / weight) : 1;
  const incentive = gcc * share;
  const expenses = nonNeg(v.movingExpenses);
  const taxable = Math.max(0, incentive - expenses);
  const tax = taxable * (Math.min(60, nonNeg(v.taxRatePercent, 22)) / 100);
  return {
    profitAfterTaxAndCosts: round2(incentive - expenses - tax),
    ppmIncentive: round2(incentive),
    weightAllowance: allowance,
    taxWithheld: round2(tax),
    incentivePerPound: round2(weight > 0 ? incentive / weight : 0),
  };
};

/** Household goods weight estimate vs the JTR allowance. */
export const hhgWeight: CustomCalculator = (v) => {
  const [, , , wNo, wWith] = gradeRow(v.grade);
  const allowance = withDeps(v.dependents) ? wWith : wNo;
  const estimate =
    nonNeg(v.bedrooms) * 1500 +
    nonNeg(v.otherRooms) * 1000 +
    nonNeg(v.garageOrStorage) * 1200 +
    nonNeg(v.extraHeavyItems) * 300 +
    nonNeg(v.boxes) * 40;
  const excess = Math.max(0, estimate - allowance);
  return {
    estimatedWeight: round2(estimate),
    weightAllowance: allowance,
    excessWeight: round2(excess),
    estimatedExcessCost: round2(excess * nonNeg(v.costPerExcessPound, 1)),
    percentOfAllowance: round2(allowance > 0 ? (estimate / allowance) * 100 : 0),
  };
};

/** TDY per diem: lodging (actual up to the rate) + M&IE, 75% M&IE on first and last day. */
export const perDiem: CustomCalculator = (v) => {
  const nights = Math.round(nonNeg(v.nights, 4));
  const days = nights + 1;
  const lodgingRate = nonNeg(v.lodgingRate, STD_LODGING);
  const mie = nonNeg(v.mieRate, STD_MIE);
  const lodging = Math.min(nonNeg(v.actualLodgingPerNight, lodgingRate), lodgingRate) * nights;
  const mieTotal = days <= 1 ? mie * 0.75 : mie * 0.75 * 2 + mie * (days - 2);
  return {
    totalPerDiem: round2(lodging + mieTotal),
    lodgingReimbursement: round2(lodging),
    mieTotal: round2(mieTotal),
    firstAndLastDayMie: round2(mie * 0.75),
    maxDailyRate: round2(lodgingRate + mie),
  };
};

/** OHA: rent up to the ceiling + utility/maintenance allowance (+ one-time MIHA). */
export const oha: CustomCalculator = (v) => {
  const rent = nonNeg(v.monthlyRent);
  const ceiling = nonNeg(v.rentCeiling);
  const rentPortion = Math.min(rent, ceiling);
  const utility = nonNeg(v.utilityAllowance);
  const monthly = rentPortion + utility;
  return {
    monthlyOha: round2(monthly),
    rentPortion: round2(rentPortion),
    outOfPocketRent: round2(rent - rentPortion),
    annualOha: round2(monthly * 12),
    firstYearWithMoveIn: round2(monthly * 12 + nonNeg(v.moveInAllowance)),
  };
};

export const lawMilMovesCustomCalculators: Record<string, CustomCalculator> = {
  "dislocation-allowance-calculator": dislocationAllowance,
  "military-travel-pay-calculator": militaryTravelPay,
  "tle-calculator": tle,
  "pcs-move-calculator": pcsMove,
  "ppm-move-calculator": ppmMove,
  "household-goods-weight-calculator": hhgWeight,
  "per-diem-calculator": perDiem,
  "oha-calculator": oha,
};
