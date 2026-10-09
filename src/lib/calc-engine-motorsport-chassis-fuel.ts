/**
 * Batch: "Sports Calculators" > Motorsports & Racing Calculators, sub-batch
 * D (Chassis Setup, Fuel & Strategy, 11 tools). See
 * calc-engine-motorsport-engine.ts for the full list of 5 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - rideHeightCalculator: how ride height changes with a spring or preload
 *    change.
 *  - raceCarSpringRateCalculator: spring rate for a target ride frequency.
 *  - wheelRateCalculator: wheel rate from spring rate, motion ratio and
 *    spring angle, plus the ride frequency it gives.
 *  - camberCalculator / casterCalculator / toeCalculator: alignment from
 *    simple measurements.
 *  - octaneCalculator: octane of a fuel blend, and race gas needed for a
 *    target.
 *  - e85MixCalculator: E85 and pump gas to add for a target ethanol % (also
 *    the ethanol mix calculator).
 *  - twoStrokeOilMixCalculator: oil for a fuel:oil ratio (also premix).
 *  - racingFuelCalculator: fuel load and stops for a race (also sim racing).
 *  - raceStrategyCalculator: best number of pit stops from tyre wear and
 *    pit loss.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-motorsport-chassis-fuel-calculators.ts for the copy.
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
const IN_S2 = 386.09; // g in in/s²

// --- 1. Ride Height ---------------------------------------------------------
export const rideHeightCalculator: CustomCalculator = (values) => {
  const load = nonNeg(values.cornerSprungWeight, 700); // lb on the spring at the wheel
  const mr = Math.max(0.1, nonNeg(values.motionRatio, 0.9)); // spring travel ÷ wheel travel
  const k1 = Math.max(1, nonNeg(values.oldSpringRate, 400));
  const k2 = Math.max(1, nonNeg(values.newSpringRate, 500));
  const preload = safeNumber(values.preloadChangeIn, 0);
  // Wheel rate = k × MR²; static deflection at the wheel = load ÷ wheel rate.
  const defl = (k: number) => load / (k * mr * mr);
  // Spring change: a stiffer spring sits less deep (higher). Preload raises
  // the wheel by preload ÷ MR.
  const change = defl(k1) - defl(k2) + preload / mr;

  return { rideHeightChangeIn: round2(change), rideHeightChangeMm: round2(change * 25.4), oldWheelRate: round2(k1 * mr * mr), newWheelRate: round2(k2 * mr * mr), staticDeflectionNewIn: round2(defl(k2)) };
};

// --- 2. Race Car Spring Rate ------------------------------------------------
export const raceCarSpringRateCalculator: CustomCalculator = (values) => {
  const m = nonNeg(values.cornerSprungWeight, 700) / IN_S2; // lb·s²/in
  const f = nonNeg(values.targetFrequencyHz, 2);
  const mr = Math.max(0.1, nonNeg(values.motionRatio, 0.9));
  const angle = (Math.min(80, nonNeg(values.springAngleDeg, 10)) * Math.PI) / 180;
  const wheelRate = 4 * Math.PI ** 2 * f * f * m;
  const spring = wheelRate / (mr * mr * Math.cos(angle) ** 2);

  return { springRateLbIn: Math.round(spring), springRateNmm: round2(spring * 0.175127), wheelRateLbIn: Math.round(wheelRate), staticDeflectionIn: round2(nonNeg(values.cornerSprungWeight, 700) / Math.max(1, wheelRate)) };
};

// --- 3. Wheel Rate ----------------------------------------------------------
export const wheelRateCalculator: CustomCalculator = (values) => {
  const k = nonNeg(values.springRate, 500);
  const mr = nonNeg(values.motionRatio, 0.9);
  const angle = (Math.min(80, nonNeg(values.springAngleDeg, 10)) * Math.PI) / 180;
  const wr = k * mr * mr * Math.cos(angle) ** 2;
  const m = nonNeg(values.cornerSprungWeight, 700) / IN_S2;

  return { wheelRateLbIn: round2(wr), rideFrequencyHz: m > 0 ? round2(Math.sqrt(wr / m) / (2 * Math.PI)) : 0, effectiveMotionRatio: round2(mr * Math.cos(angle)), wheelRateNmm: round2(wr * 0.175127) };
};

// --- 4. Camber --------------------------------------------------------------
export const camberCalculator: CustomCalculator = (values) => {
  const dia = Math.max(1, nonNeg(values.measureSpan, 17));
  // Top minus bottom distance to a plumb line: negative = top tilts in.
  const diff = safeNumber(values.topMinusBottom, -0.3);
  const deg = (Math.atan(diff / dia) * 180) / Math.PI;

  return { camberDegrees: round2(deg), offsetPerInchOfSpan: round2(diff / dia), offsetFor1Degree: round2(Math.tan(Math.PI / 180) * dia) };
};

// --- 5. Caster (sweep method) -----------------------------------------------
export const casterCalculator: CustomCalculator = (values) => {
  const sweep = (Math.min(30, Math.max(5, nonNeg(values.sweepDeg, 20))) * Math.PI) / 180;
  const outer = safeNumber(values.camberTurnedOut, -2.8); // wheel steered away from the car
  const inner = safeNumber(values.camberTurnedIn, 3.2); // wheel steered toward the car
  // Caster ≈ (camber change across the sweep) ÷ (2 sin sweep).
  const caster = (inner - outer) / (2 * Math.sin(sweep));

  return { casterDegrees: round2(caster), camberChange: round2(inner - outer), multiplierUsed: round2(1 / (2 * Math.sin(sweep))) };
};

// --- 6. Toe -----------------------------------------------------------------
export const toeCalculator: CustomCalculator = (values) => {
  const mm = whole(values.unit, 1) === 2;
  const dia = Math.max(1, nonNeg(values.tireDiameter, 26)) * (mm ? 1 / 25.4 : 1);
  // Total toe: front-of-tyre minus rear-of-tyre spacing difference (positive = toe-in).
  const total = safeNumber(values.totalToe, 0.125) * (mm ? 1 / 25.4 : 1);
  const totalDeg = (Math.atan(total / dia) * 180) / Math.PI;

  return { totalToeDegrees: round2(totalDeg), perWheelDegrees: round2(totalDeg / 2), totalToeMm: round2(total * 25.4), totalToeIn: Math.round(total * 1000) / 1000, perWheelIn: Math.round((total / 2) * 1000) / 1000 };
};

// --- 7. Octane ---------------------------------------------------------------
export const octaneCalculator: CustomCalculator = (values) => {
  const g1 = nonNeg(values.fuel1Gallons, 10);
  const o1 = nonNeg(values.fuel1Octane, 91);
  const g2 = nonNeg(values.fuel2Gallons, 5);
  const o2 = nonNeg(values.fuel2Octane, 110);
  const target = nonNeg(values.targetOctane, 100);
  const blend = g1 + g2 > 0 ? (g1 * o1 + g2 * o2) / (g1 + g2) : 0;
  // Gallons of fuel 2 to add to fuel 1 for the target (linear by volume).
  const need = o2 > target && target > o1 ? (g1 * (target - o1)) / (o2 - target) : 0;

  return { blendOctane: round2(blend), fuel2NeededForTarget: round2(need), totalGallons: round2(g1 + g2), fuel2Share: g1 + g2 > 0 ? round2((g2 / (g1 + g2)) * 100) : 0 };
};

// --- 8. E85 Mix (ethanol mix) -----------------------------------------------
export const e85MixCalculator: CustomCalculator = (values) => {
  const tank = Math.max(0.1, nonNeg(values.tankSize, 16));
  const now = Math.min(tank, nonNeg(values.currentFuel, 4));
  const eNow = nonNeg(values.currentEthanolPercent, 10) / 100;
  const eGas = nonNeg(values.pumpGasEthanolPercent, 10) / 100;
  const eE85 = nonNeg(values.e85EthanolPercent, 85) / 100;
  const target = nonNeg(values.targetEthanolPercent, 40) / 100;
  const room = tank - now;
  // Fill the tank: x of E85 + (room − x) of pump gas hits the target.
  let x = eE85 !== eGas ? (target * tank - now * eNow - room * eGas) / (eE85 - eGas) : 0;
  x = Math.min(room, Math.max(0, x));
  const gas = room - x;
  const result = (now * eNow + x * eE85 + gas * eGas) / tank;

  return { e85ToAdd: round2(x), pumpGasToAdd: round2(gas), resultingEthanolPercent: round2(result * 100), targetReachable: Math.abs(result - target) < 0.005 ? 1 : 0 };
};

// --- 9. 2-Stroke Oil Mix (premix) -------------------------------------------
export const twoStrokeOilMixCalculator: CustomCalculator = (values) => {
  const ratio = Math.max(1, nonNeg(values.ratio, 32));
  const litres = whole(values.fuelUnit, 1) === 2;
  const fuel = nonNeg(values.fuelAmount, 1);
  const ml = ((litres ? fuel * 1000 : fuel * 3785.41) / ratio);

  return { oilMl: round2(ml), oilFlOz: round2(ml / 29.5735), oilPerGallonOz: round2(128 / ratio), oilPerLiterMl: round2(1000 / ratio) };
};

// --- 10. Racing Fuel (and sim racing fuel) ----------------------------------
export const racingFuelCalculator: CustomCalculator = (values) => {
  const timed = whole(values.raceType, 1) === 2;
  const lapTime = Math.max(1, nonNeg(values.lapTimeSeconds, 92));
  const laps = timed ? Math.ceil((nonNeg(values.raceMinutes, 45) * 60) / lapTime) + 1 : whole(values.laps, 30);
  const perLap = nonNeg(values.fuelPerLap, 2.8);
  const extra = nonNeg(values.extraLaps, 1.5);
  const tank = nonNeg(values.tankCapacity, 110);
  const total = perLap * (laps + extra);
  const stops = tank > 0 ? Math.max(0, Math.ceil(total / tank) - 1) : 0;

  return { totalFuelNeeded: round2(total), raceLaps: laps, startingFuel: round2(Math.min(tank, total)), pitStopsForFuel: stops, lapsPerTank: perLap > 0 ? Math.floor(tank / perLap) : 0 };
};

// --- 11. Race Strategy (pit stops) ------------------------------------------
export const raceStrategyCalculator: CustomCalculator = (values) => {
  const laps = Math.max(1, whole(values.laps, 50));
  const base = nonNeg(values.baseLapTime, 90);
  const deg = nonNeg(values.degradationPerLap, 0.08);
  const pit = nonNeg(values.pitLossSeconds, 22);
  // Time for n stops with equal stints: each stint loses deg × k for its k-th lap.
  const time = (stops: number) => {
    const stints = stops + 1;
    let t = laps * base + stops * pit;
    for (let s = 0; s < stints; s++) {
      const len = Math.floor(laps / stints) + (s < laps % stints ? 1 : 0);
      t += (deg * len * (len - 1)) / 2;
    }
    return t;
  };
  const options = [0, 1, 2, 3].map(time);
  const best = options.indexOf(Math.min(...options));

  return {
    bestNumberOfStops: best,
    raceTimeZeroStopsMin: round2(options[0] / 60),
    raceTimeOneStopMin: round2(options[1] / 60),
    raceTimeTwoStopsMin: round2(options[2] / 60),
    raceTimeThreeStopsMin: round2(options[3] / 60),
    gainVsNextBestSeconds: round2([...options].sort((a, b) => a - b)[1] - options[best]),
  };
};

export const motorsportChassisFuelCustomCalculators: Record<string, CustomCalculator> = {
  "ride-height-calculator": rideHeightCalculator,
  "race-car-spring-rate-calculator": raceCarSpringRateCalculator,
  "wheel-rate-calculator": wheelRateCalculator,
  "camber-calculator": camberCalculator,
  "caster-calculator": casterCalculator,
  "toe-calculator": toeCalculator,
  "octane-calculator": octaneCalculator,
  "e85-mix-calculator": e85MixCalculator,
  "2-stroke-oil-mix-calculator": twoStrokeOilMixCalculator,
  "racing-fuel-calculator": racingFuelCalculator,
  "race-strategy-calculator": raceStrategyCalculator,
};
