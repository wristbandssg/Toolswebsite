/**
 * Batch: "Sports Calculators" > Winter Sports Calculators, sub-batch A
 * (Ski, Snowboard & Snowshoe Sizing, 13 tools). The 22-tool winter list is
 * built across 2 sub-batches:
 *   calc-engine-winter-gear.ts (13)
 *   calc-engine-winter-conditions.ts (9)
 *
 * Near-namesakes, and how each is deliberately different:
 *  - skiLengthCalculator: alpine ski length by height, weight, ability and
 *    terrain (also kids ski size).
 *  - crossCountrySkiLengthCalculator: Nordic ski length by style.
 *  - skiPoleLengthCalculator: pole length for alpine, Nordic or touring.
 *  - skiBootSizeCalculator / snowboardBootSizeCalculator: foot length →
 *    mondopoint and US/UK/EU sizes, with ski-boot fit rounding.
 *  - skiBootFlexCalculator: flex index by ability, gender and weight.
 *  - skiDinCalculator: ISO 11088 indicative release setting.
 *  - skiRadiusCalculator: sidecut turn radius from tip/waist/tail widths.
 *  - snowboardSizeCalculator: board length (also kids and splitboard).
 *  - snowboardBindingSizeCalculator: S/M/L binding from boot size.
 *  - snowboardStanceWidthCalculator: stance width and binding angles.
 *  - snowboardWaistWidthCalculator: minimum waist width for boot size.
 *  - snowshoeSizeCalculator: snowshoe length by total load and snow.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-winter-gear-calculators.ts for the copy.
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
const IN_CM = 2.54;
const LB_KG = 0.45359237;
/** Unit system 1 = metric (cm, kg), 2 = imperial (in, lb). */
const cm = (v: number, units: number) => (whole(units, 1) === 2 ? v * IN_CM : v);
const kg = (v: number, units: number) => (whole(units, 1) === 2 ? v * LB_KG : v);
const round5 = (n: number) => Math.round(n / 5) * 5;
const half = (n: number) => Math.round(n * 2) / 2;

// --- 1. Ski Length (and kids ski size) --------------------------------------
export const skiLengthCalculator: CustomCalculator = (values) => {
  const u = values.units;
  const h = cm(nonNeg(values.height, 175), u);
  const w = kg(nonNeg(values.weight, 70), u);
  const kid = whole(values.skier, 1) === 2;
  const ability = whole(values.ability, 2);
  // Offset from height (cm): adults beginner chin, intermediate nose, advanced head height.
  const offset = kid ? ({ 1: -20, 2: -12, 3: -5 } as Record<number, number>)[ability] ?? -12 : ({ 1: -15, 2: -7, 3: 0 } as Record<number, number>)[ability] ?? -7;
  const terrain = ({ 1: 0, 2: -5, 3: 5 } as Record<number, number>)[whole(values.terrain, 1)] ?? 0;
  // Heavier-than-typical skiers go longer, lighter go shorter (typical BMI 22).
  const typical = 22 * (h / 100) ** 2;
  const weightAdj = !kid && h > 0 ? (w > typical * 1.15 ? 5 : w < typical * 0.85 ? -5 : 0) : 0;
  const len = Math.max(60, h + offset + terrain + weightAdj);

  return { skiLengthCm: Math.round(len), rangeLowCm: Math.round(len - 5), rangeHighCm: Math.round(len + 5), skiLengthIn: round2(len / IN_CM) };
};

// --- 2. Cross Country Ski Length --------------------------------------------
export const crossCountrySkiLengthCalculator: CustomCalculator = (values) => {
  const h = cm(nonNeg(values.height, 175), values.units);
  // Classic +20 cm, skate +10 cm, backcountry/touring +10 cm.
  const add = ({ 1: 20, 2: 10, 3: 10 } as Record<number, number>)[whole(values.style, 1)] ?? 20;
  const len = h + add;

  return { skiLengthCm: Math.round(len), rangeLowCm: Math.round(len - 5), rangeHighCm: Math.round(len + 5), skiLengthIn: round2(len / IN_CM) };
};

// --- 3. Ski Pole Length -----------------------------------------------------
// Pole length as a share of body height.
const POLE: Record<number, number> = { 1: 0.68, 2: 0.84, 3: 0.89, 4: 0.7, 5: 0.68 };

export const skiPoleLengthCalculator: CustomCalculator = (values) => {
  const h = cm(nonNeg(values.height, 175), values.units);
  const exact = h * (POLE[whole(values.discipline, 1)] ?? 0.68);

  return { poleLengthCm: round5(exact), exactLengthCm: round2(exact), poleLengthIn: Math.round(round5(exact) / IN_CM) };
};

// --- 4. Ski Boot Size -------------------------------------------------------
/** Mondopoint (cm) → US men's, US women's, UK and EU sizes. */
const sizes = (mondo: number) => ({ usMens: half(mondo - 18), usWomens: half(mondo - 17), uk: half(mondo - 19), eu: half(1.5 * (mondo + 1.5)) });

export const skiBootSizeCalculator: CustomCalculator = (values) => {
  const foot = nonNeg(values.footLength, 26.7) * (whole(values.unit, 1) === 2 ? IN_CM : 1);
  const fit = whole(values.fit, 1); // 1 comfort, 2 performance, 3 race
  const mondo = fit === 1 ? Math.ceil(foot * 2) / 2 : fit === 2 ? Math.floor(foot * 2) / 2 : Math.floor(foot * 2) / 2 - 0.5;

  return { mondopoint: mondo, ...sizes(mondo), shellSizeCm: Math.floor(mondo) };
};

// --- 5. Ski Boot Flex -------------------------------------------------------
const FLEX: Record<number, number[]> = { 1: [70, 90, 110, 130], 2: [60, 80, 95, 115], 3: [50, 60, 70, 80] };
const FLEX_REF_KG: Record<number, number> = { 1: 80, 2: 65, 3: 40 };

export const skiBootFlexCalculator: CustomCalculator = (values) => {
  const g = whole(values.gender, 1); // 1 men, 2 women, 3 junior
  const ability = Math.min(4, Math.max(1, whole(values.ability, 2)));
  const w = kg(nonNeg(values.weight, 80), values.units);
  const base = (FLEX[g] ?? FLEX[1])[ability - 1];
  // ±5 flex per 10 kg away from a reference weight, capped at ±20.
  const adj = Math.max(-20, Math.min(20, ((w - (FLEX_REF_KG[g] ?? 80)) / 10) * 5));
  const flex = Math.max(40, round5(base + adj));

  return { flexIndex: flex, flexLow: flex - 10, flexHigh: flex + 10 };
};

// --- 6. Ski DIN (ISO 11088) ---------------------------------------------------
// ISO 11088 table rows A–O plus the row after O, by boot sole length bracket
// (≤230, 231–250, 251–270, 271–290, 291–310, 311–330, 331–350, ≥351 mm).
// Values from the tomahawkins/din model of ISO 11088:2018; null = blank cell.
const DIN: (number | null)[][] = [
  [0.75, 0.75, 0.75, null, null, null, null, null], // A
  [1.0, 0.75, 0.75, 0.75, null, null, null, null], // B
  [1.5, 1.25, 1.25, 1.0, null, null, null, null], // C
  [2.0, 1.75, 1.5, 1.5, 1.25, null, null, null], // D
  [2.5, 2.25, 2.0, 1.75, 1.5, 1.5, null, null], // E
  [3.0, 2.75, 2.5, 2.25, 2.0, 1.75, 1.75, null], // F
  [null, 3.5, 3.0, 2.75, 2.5, 2.25, 2.0, null], // G
  [null, null, 3.5, 3.0, 3.0, 2.75, 2.5, null], // H
  [null, null, 4.5, 4.0, 3.5, 3.5, 3.0, null], // I
  [null, null, 5.5, 5.0, 4.5, 4.0, 3.5, 3.0], // J
  [null, null, 6.5, 6.0, 5.5, 5.0, 4.5, 4.0], // K
  [null, null, 7.5, 7.0, 6.5, 6.0, 5.5, 5.0], // L
  [null, null, null, 8.5, 8.0, 7.0, 6.5, 6.0], // M
  [null, null, null, 10.0, 9.5, 8.5, 8.0, 7.5], // N
  [null, null, null, 11.5, 11.0, 10.0, 9.5, 9.0], // O
  [null, null, null, null, null, 12.0, 11.0, 10.5], // beyond O
];
const DIN_WEIGHT_MAX = [13, 17, 21, 25, 30, 35, 41, 48, 57, 66, 78, 94]; // kg, codes A–L; heavier = M
const DIN_HEIGHT_MAX = [148, 157, 166, 178, 194]; // cm → codes H–L; taller = M
const DIN_BSL_MAX = [230, 250, 270, 290, 310, 330, 350];

export const skiDinCalculator: CustomCalculator = (values) => {
  const u = values.units;
  const w = kg(nonNeg(values.weight, 75), u);
  const h = cm(nonNeg(values.height, 178), u);
  const age = nonNeg(values.age, 35);
  const type = whole(values.skierType, 2); // 0 = type -1, 1, 2, 3, 4 = 3+
  const bsl = nonNeg(values.bootSoleLength, 305);
  const wCode = DIN_WEIGHT_MAX.findIndex((m) => w <= m);
  const weightCode = wCode === -1 ? 12 : wCode;
  const hCode = DIN_HEIGHT_MAX.findIndex((m) => h <= m);
  const heightCode = hCode === -1 ? 12 : hCode + 7;
  // The code nearer A (lighter/shorter) wins.
  const skierCode = Math.min(weightCode, heightCode);
  let row = skierCode + (Math.min(4, type) - 1);
  if (age <= 9 || age >= 50) row -= 1;
  // The lightest band (A) is never adjusted for type or age.
  if (weightCode === 0) row = 0;
  row = Math.max(0, Math.min(DIN.length - 1, row));
  const col = (() => {
    const i = DIN_BSL_MAX.findIndex((m) => bsl <= m);
    return i === -1 ? 7 : i;
  })();
  const cells = DIN[row];
  let din = cells[col];
  const inChart = din !== null ? 1 : 0;
  if (din === null) {
    // Blank cell: take the nearest filled cell in the same row.
    for (let d = 1; d < 8 && din === null; d++) din = cells[col - d] ?? cells[col + d] ?? null;
  }

  return { dinSetting: din ?? 0, skierCode: skierCode + 1, adjustedCode: row + 1, inStandardChart: inChart };
};

// --- 7. Ski Radius (sidecut) --------------------------------------------------
export const skiRadiusCalculator: CustomCalculator = (values) => {
  const tip = nonNeg(values.tipWidth, 125);
  const waist = nonNeg(values.waistWidth, 85);
  const tail = nonNeg(values.tailWidth, 110);
  const contact = nonNeg(values.contactLengthMm, 0) || nonNeg(values.skiLengthCm, 170) * 10 * 0.85;
  // Sidecut depth (each edge) and the radius of the arc through tip, waist and tail.
  const depth = ((tip + tail) / 2 - waist) / 2;
  const r = depth > 0 ? (contact * contact) / (8 * depth) + depth / 2 : 0;
  const m = r / 1000;

  return { turnRadiusM: round2(m), sidecutDepthMm: round2(depth), contactLengthMm: Math.round(contact), turnType: m === 0 ? 0 : m < 15 ? 1 : m <= 20 ? 2 : 3 };
};

// --- 8. Snowboard Size (also kids and splitboard) ---------------------------
export const snowboardSizeCalculator: CustomCalculator = (values) => {
  const u = values.units;
  const h = cm(nonNeg(values.height, 175), u);
  const w = kg(nonNeg(values.weight, 70), u);
  const kid = whole(values.rider, 1) === 2;
  const style = ({ 1: 0, 2: -3, 3: 4, 4: 4 } as Record<number, number>)[whole(values.style, 1)] ?? 0;
  const ability = ({ 1: -3, 2: 0, 3: 2 } as Record<number, number>)[whole(values.ability, 2)] ?? 0;
  // Adults: average of a height rule (0.88 × height) and a weight rule.
  const base = kid ? h * 0.82 : (h * 0.88 + (118 + 0.5 * w)) / 2;
  const len = Math.max(80, base + style + ability);

  return { boardLengthCm: Math.round(len), rangeLowCm: Math.round(len - 3), rangeHighCm: Math.round(len + 3), heightRuleCm: Math.round(h * (kid ? 0.82 : 0.88)) };
};

// --- 9. Snowboard Boot Size -------------------------------------------------
export const snowboardBootSizeCalculator: CustomCalculator = (values) => {
  const foot = nonNeg(values.footLength, 26.7) * (whole(values.unit, 1) === 2 ? IN_CM : 1);
  // Snowboard boots are fitted snug: round to the nearest half mondo.
  const mondo = half(foot);
  const s = sizes(mondo);

  return { mondopoint: mondo, recommendedUs: whole(values.gender, 1) === 2 ? s.usWomens : s.usMens, ...s };
};

// --- 10. Snowboard Binding Size ---------------------------------------------
export const snowboardBindingSizeCalculator: CustomCalculator = (values) => {
  const women = whole(values.gender, 1) === 2;
  const boot = nonNeg(values.bootSize, 9);
  // Men: S ≤ 7.5, M 8–10.5, L ≥ 11. Women: S ≤ 6.5, M 7–9.5, L ≥ 10.
  const [sMax, mMax] = women ? [6.5, 9.5] : [7.5, 10.5];
  const size = boot <= sMax ? 1 : boot <= mMax ? 2 : 3;
  // Boots right at a size break: try both sizes with your boot.
  const edge = [sMax, sMax + 0.5, mMax, mMax + 0.5].includes(half(boot)) ? 1 : 0;

  return { bindingSize: size, nearSizeBoundary: edge, mensEquivalent: women ? boot - 1 : boot };
};

// --- 11. Snowboard Stance Width ---------------------------------------------
// [stance adjustment cm, front angle, back angle]
const STANCE: Record<number, number[]> = { 1: [0, 15, -6], 2: [2, 12, -12], 3: [-1, 21, 6] };

export const snowboardStanceWidthCalculator: CustomCalculator = (values) => {
  const h = cm(nonNeg(values.height, 175), values.units);
  const [add, front, back] = STANCE[whole(values.style, 1)] ?? STANCE[1];
  const stance = h * 0.3 + add;

  return { stanceWidthCm: round2(stance), stanceWidthIn: round2(stance / IN_CM), frontAngle: front, backAngle: back };
};

// --- 12. Snowboard Waist Width ----------------------------------------------
export const snowboardWaistWidthCalculator: CustomCalculator = (values) => {
  const women = whole(values.gender, 1) === 2;
  const us = nonNeg(values.bootSize, 9) - (women ? 1 : 0); // men's equivalent
  const front = Math.abs(safeNumber(values.frontAngle, 15));
  const back = Math.abs(safeNumber(values.backAngle, -6));
  // Base: 250 mm for a men's 9, +5 mm per size; steeper angles need less width.
  const avg = (front + back) / 2;
  const waist = 240 + (us - 7) * 5 - Math.max(0, avg - 10.5) * 0.4;

  return { minimumWaistMm: Math.round(waist), widthCategory: waist < 253 ? 1 : waist < 260 ? 2 : 3, mensEquivalentSize: round2(us) };
};

// --- 13. Snowshoe Size ------------------------------------------------------
const SHOE_IN = [17, 21, 25, 30, 36];
const SHOE_MAX_LB = [90, 175, 225, 275, Infinity];

export const snowshoeSizeCalculator: CustomCalculator = (values) => {
  const imperial = whole(values.units, 1) === 2;
  const body = nonNeg(values.weight, 70);
  const pack = nonNeg(values.packWeight, 7);
  const load = imperial ? body + pack : (body + pack) / LB_KG;
  let i = SHOE_MAX_LB.findIndex((m) => load <= m);
  // Packed trails: a size smaller is fine; deep powder: go up a size.
  const snow = whole(values.snow, 2);
  i = Math.max(0, Math.min(SHOE_IN.length - 1, i + (snow === 1 ? -1 : snow === 3 ? 1 : 0)));

  return { snowshoeLengthIn: SHOE_IN[i], snowshoeLengthCm: Math.round(SHOE_IN[i] * IN_CM), totalLoadLb: Math.round(load), totalLoadKg: Math.round(load * LB_KG) };
};

export const winterGearCustomCalculators: Record<string, CustomCalculator> = {
  "ski-length-calculator": skiLengthCalculator,
  "cross-country-ski-length-calculator": crossCountrySkiLengthCalculator,
  "ski-pole-length-calculator": skiPoleLengthCalculator,
  "ski-boot-size-calculator": skiBootSizeCalculator,
  "ski-boot-flex-calculator": skiBootFlexCalculator,
  "ski-din-calculator": skiDinCalculator,
  "ski-radius-calculator": skiRadiusCalculator,
  "snowboard-size-calculator": snowboardSizeCalculator,
  "snowboard-boot-size-calculator": snowboardBootSizeCalculator,
  "snowboard-binding-size-calculator": snowboardBindingSizeCalculator,
  "snowboard-stance-width-calculator": snowboardStanceWidthCalculator,
  "snowboard-waist-width-calculator": snowboardWaistWidthCalculator,
  "snowshoe-size-calculator": snowshoeSizeCalculator,
};
