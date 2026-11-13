/**
 * Batch: Fitness keyword check (13 Nov 2026, Claude outputs/Fitness_Build_Plan.json), misc part —
 * 12 tools: Sports > Cycling (TSS), Running (maximal aerobic speed), Other Sports (rowing split,
 * StairMaster calories); Shopping > Clothing (body shape), Lifestyle (tattoo removal, hair transplant grafts, hair growth, laser hair removal, plastic
 * surgery, breast implant size, sunscreen).
 *
 * Methods:
 *  - TSS = hours × IF² × 100, IF = NP ÷ FTP (Coggan / TrainingPeaks).
 *  - MAS = average speed of a 5–7 minute effort (5-min test, 6-min run, 1,500–2,000 m time trial);
 *    VO2max ≈ 3.5 × MAS km/h (Léger).
 *  - Concept2: watts = 2.80 ÷ (pace in s/m)³; calories/h = 4 × watts × 0.8604 + 300.
 *  - Stair climbing METs from the 2011 Compendium (17133 4.0, 17134 8.8, 02065 9.0, 17140 15.0).
 *  - Body shape: FFIT for Apparel rules (Simmons et al. 2004) for women; chest ÷ waist for men.
 *  - Tattoo removal sessions: Kirby-Desai scale (sum of six factors, ±2.5).
 *  - tattoo-tip-calculator already existed (create-shopping-deal-tips), so it is not rebuilt here.
 *  - Plastic surgery: ASPS 2023 average surgeon fees (breast augmentation $4,875, tummy tuck
 *    $8,174, facelift $11,395, rhinoplasty $7,637, chin/neck liposuction $3,194).
 *  - Sunscreen: 2 mg/cm² (FDA test dose) × exposed body surface (Mosteller BSA, rule of nines);
 *    time to burn from MED by Fitzpatrick skin type and UV index (1 UVI ≈ 0.9 SED per hour).
 */

import { type TrvCalculator as Calc, InputError, pos, pick, r0, r1, r2, nfmt, money } from "./trv-core";

const IN = 2.54, LB = 0.45359237;
const mmss = (sec: number) => { const s = Math.max(0, Math.round(sec * 10) / 10), m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? "0" : ""}${nfmt(r, r % 1 ? 1 : 0)}`; };
const hms = (sec: number) => { const s = Math.round(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`; };
const usd = (x: number) => money(Math.round(x), "$", 0);

// ------------------------------------------------------------------------ TSS
export const tssCalc: Calc = (v) => {
  const min = pos(v.minutes, 90), np = pos(v.np, 200), ftp = pos(v.ftp, 250), avg = pos(v.avgPower, 0);
  if (!(ftp > 0) || !(np > 0) || !(min > 0)) throw new InputError("Enter the ride time, normalized power and FTP.");
  const IF = np / ftp, tss = (min / 60) * IF * IF * 100;
  return { tss: r0(tss), if: r2(IF), kj: r0(((avg > 0 ? avg : np) * min * 60) / 1000), recovery: tss < 150 ? "Low — recovered by the next day" : tss < 300 ? "Medium — some fatigue the next day, gone by day 2" : tss < 450 ? "High — some residual fatigue even after 2 days" : "Very high — fatigue lasting several days", perHour: r0(IF * IF * 100) };
};

// ---------------------------------------------------------------- MAS
export const MAS_TESTS = ["5-minute test (distance)", "6-minute run (distance)", "1,500 m time trial", "2 km time trial", "Custom distance and time"];
export const masCalc: Calc = (v) => {
  const t = pick(v.test, 5);
  const fixedT = [300, 360, 0, 0, 0][t], fixedD = [0, 0, 1500, 2000, 0][t];
  const dist = fixedD || pos(v.distance, 1400), sec = fixedT || pos(v.minutes, 0) * 60 + pos(v.seconds, 0);
  if (!(dist > 0) || !(sec > 0)) throw new InputError("Enter the distance and/or time of your test.");
  if (sec < 120 || sec > 900) throw new InputError("MAS tests should last about 4–10 minutes (2–15 minutes accepted).");
  const ms = dist / sec, kmh = ms * 3.6;
  return { kmh: r2(kmh), ms: r2(ms), pace: `${mmss(1000 / ms)} per km · ${mmss(1609.344 / ms)} per mile`, vo2: r1(kmh * 3.5), i100: r0(ms * 15), i110: r0(ms * 1.1 * 15), i120: r0(ms * 1.2 * 15), t400: mmss(400 / ms) };
};

// ------------------------------------------------------------ rowing split
export const ROW_MODES = ["Split → finish time", "Finish time → split", "Watts → split"];
export const rowingSplit: Calc = (v) => {
  const mode = pick(v.mode, 3), dist = pos(v.distance, 2000);
  if (!(dist > 0)) throw new InputError("Enter the distance in metres.");
  let split: number;
  if (mode === 0) split = pos(v.splitMin, 2) * 60 + pos(v.splitSec, 0);
  else if (mode === 1) split = ((pos(v.timeMin, 8) * 60 + pos(v.timeSec, 0)) / dist) * 500;
  else { const w = pos(v.watts, 200); if (!(w > 0)) throw new InputError("Enter watts."); split = 500 * (2.8 / w) ** (1 / 3); }
  if (!(split > 30)) throw new InputError("Enter a realistic split (over 0:30 per 500 m).");
  const pace = split / 500, watts = 2.8 / pace ** 3, total = pace * dist;
  return { split: mmss(split), time: hms(total), watts: r0(watts), calHr: r0(4 * watts * 0.8604 + 300), kmh: r2((500 / split) * 3.6), t2k: hms(pace * 2000), t5k: hms(pace * 5000) };
};

// ------------------------------------------------------------ stair climbing
export const STAIR = [["Climbing stairs, slow pace", 4.0], ["Climbing stairs, fast pace", 8.8], ["StairMaster / stair stepper, general", 9.0], ["Running up stairs", 15.0]] as const;
export const stairCalories: Calc = (v) => {
  const us = pick(v.units, 2) === 0, kg = pos(v.weight, us ? 180 : 80) * (us ? LB : 1) + pos(v.load, 0) * (us ? LB : 1), min = pos(v.minutes, 30), met = STAIR[pick(v.intensity, 4)][1], spm = pos(v.stepsPerMin, 0);
  if (!(kg > 20) || !(min > 0)) throw new InputError("Enter your weight and workout time.");
  const total = (met * 3.5 * kg * min) / 200;
  return { total: r0(total), perMin: r1(total / min), net: r0(((met - 1) * 3.5 * kg * min) / 200), met, floors: spm > 0 ? r0((spm * min) / 16) : 0, perHour: r0((total / min) * 60) };
};

// ---------------------------------------------------------------- body shape
const SHAPE_TIPS: Record<string, string> = {
  Hourglass: "Bust and hips balanced with a defined waist — wrap dresses, belted styles and fitted tailoring show it off.",
  "Bottom hourglass": "Hips a little fuller than bust with a defined waist — high-rise bottoms and fitted tops work well.",
  "Top hourglass": "Bust a little fuller than hips with a defined waist — V-necks and A-line skirts balance the look.",
  Spoon: "Hips noticeably fuller with a shelf at the high hip — A-line skirts, boot-cut jeans and detail on top.",
  Triangle: "Hips wider than bust (pear) — structured shoulders, bright tops and dark, straight or flared bottoms.",
  "Inverted triangle": "Shoulders/bust wider than hips — V-necks, wide-leg trousers and fuller skirts add balance.",
  Rectangle: "Bust, waist and hips similar — belts, peplums and layering create curves.",
  "Between shapes": "Your measurements sit between the standard shapes — mix the advice for the two closest ones.",
  "Inverted triangle (V-shape)": "Broad chest and shoulders with a trim waist — most cuts work; slim-fit shirts show the V.",
  Trapezoid: "Shoulders a little wider than the waist — the most common 'athletic' build; fitted shirts suit you.",
  "Rectangle (straight)": "Chest, waist and hips similar — layered jackets and structured shoulders add shape.",
  Oval: "Waist fuller than chest — vertical lines, single-breasted jackets and darker tops are flattering.",
  "Triangle (pear)": "Hips wider than chest — structured shoulders and lighter tops balance the frame.",
};
export const bodyShape: Calc = (v) => {
  const cm = pick(v.units, 2) === 1, k = cm ? 1 / IN : 1, male = pick(v.sex, 2) === 0;
  const bust = pos(v.bust, 36) * k, waist = pos(v.waist, 28) * k, hips = pos(v.hips, 38) * k, hh = pos(v.highHip, 0) * k;
  if (!(bust > 0 && waist > 0 && hips > 0)) throw new InputError("Enter bust/chest, waist and hip measurements.");
  let shape: string;
  if (male) {
    const r = bust / waist;
    shape = waist >= bust ? "Oval" : hips > bust ? "Triangle (pear)" : r >= 1.25 ? "Inverted triangle (V-shape)" : r >= 1.1 ? "Trapezoid" : "Rectangle (straight)";
  } else {
    const bh = bust - hips, hb = hips - bust, bw = bust - waist, hw = hips - waist, hhw = hh > 0 ? hh / waist : 0; // no high hip: bottom hourglass still possible, spoon needs it
    if (bh <= 1 && hb < 3.6 && (bw >= 9 || hw >= 10)) shape = "Hourglass";
    else if (hb >= 3.6 && hb < 10 && hw >= 9 && (hh === 0 || hhw >= 1.193)) shape = "Bottom hourglass";
    else if (bh > 1 && bh < 10 && bw >= 9) shape = "Top hourglass";
    else if (hb > 2 && hw >= 7 && hhw >= 1.193) shape = "Spoon";
    else if (hb >= 3.6 && hw < 9) shape = "Triangle";
    else if (bh >= 3.6 && bw < 9) shape = "Inverted triangle";
    else if (hb < 3.6 && bh < 3.6 && bw < 9 && hw < 10) shape = "Rectangle";
    else shape = "Between shapes";
  }
  return { shape, tips: SHAPE_TIPS[shape], whr: r2(waist / hips), bustWaist: r1((bust - waist) * (cm ? IN : 1)), hipWaist: r1((hips - waist) * (cm ? IN : 1)) };
};

// --------------------------------------------------------- tattoo removal (Kirby-Desai)
export const TR_SIZES: [string, number][] = [["Small (under 4 sq in)", 200], ["Medium (4–16 sq in)", 325], ["Large (16–36 sq in)", 475], ["Very large (36+ sq in)", 650]];
export const tattooRemoval: Calc = (v) => {
  const score = [1, 2, 3, 4, 5, 6][pick(v.skin, 6)] + [1, 2, 3, 4, 5][pick(v.location, 5)] + [1, 2, 3, 4][pick(v.color, 4)] + [1, 2, 3, 4][pick(v.ink, 4)] + [0, 1, 3, 5][pick(v.scarring, 4)] + [0, 2][pick(v.layering, 2)];
  const price = pos(v.price, 0) > 0 ? pos(v.price, 0) : TR_SIZES[pick(v.size, 4)][1], lo = Math.max(1, score - 2.5), hi = score + 2.5;
  return { sessions: score, low: lo, high: hi, cost: r0(score * price), range: `${usd(lo * price)} – ${usd(hi * price)}`, perSession: r0(price), months: r0((score * 7) / 4.345) };
};

// ---------------------------------------------------------- hair transplant grafts
export const NORWOOD: [string, number, number][] = [["Norwood 2", 500, 1000], ["Norwood 3", 1000, 2000], ["Norwood 3 vertex", 1500, 2200], ["Norwood 4", 2000, 2800], ["Norwood 5", 2500, 3500], ["Norwood 6", 3500, 4500], ["Norwood 7", 4500, 6000]];
export const HT_REGIONS: [string, number][] = [["USA", 6], ["UK", 4.5], ["Canada / Australia", 5], ["Mexico", 2.5], ["India", 0.8], ["Turkey", 0.9], ["Thailand", 1.8]];
export const hairTransplant: Calc = (v) => {
  const byArea = pick(v.method, 2) === 1, density = pos(v.density, 45);
  let lo: number, hi: number;
  if (byArea) { const a = pos(v.area, 60); if (!(a > 0)) throw new InputError("Enter the area in cm²."); lo = a * density * 0.85; hi = a * density * 1.15; }
  else { const n = NORWOOD[pick(v.stage, NORWOOD.length)]; lo = n[1]; hi = n[2]; }
  const mid = (lo + hi) / 2, ppg = pos(v.pricePerGraft, 0) > 0 ? pos(v.pricePerGraft, 0) : HT_REGIONS[pick(v.region, HT_REGIONS.length)][1];
  return { grafts: r0(mid), low: r0(lo), high: r0(hi), hairs: r0(mid * 2.2), cost: r0(mid * ppg), range: `${usd(lo * ppg)} – ${usd(hi * ppg)}`, sessions: mid > 4000 ? "Usually 2 sessions (about 3,000–4,000 grafts per session max)" : "Usually 1 session", ppg: r2(ppg) };
};

// ---------------------------------------------------------------- hair growth
export const hairGrowth: Calc = (v) => {
  const cur = pos(v.current, 2), target = pos(v.target, 8), rate = pos(v.rate, 0.5), trimEvery = pos(v.trimWeeks, 0), trim = pos(v.trimAmount, 0);
  if (target <= cur) throw new InputError("Target length must be longer than your current length.");
  if (!(rate > 0)) throw new InputError("Enter a growth rate.");
  const trimPerMonth = trimEvery > 0 ? (trim * 4.345) / trimEvery : 0, net = rate - trimPerMonth;
  if (net <= 0) throw new InputError("Your trims remove as much as your hair grows — trim less often or less.");
  const months = (target - cur) / net;
  return { months: r1(months), weeks: r0(months * 4.345), net: r2(net), year: r1(cur + net * 12), years: r1(months / 12) };
};

// ---------------------------------------------------------- laser hair removal
export const LASER_AREAS: [string, number][] = [["Upper lip", 75], ["Chin", 75], ["Full face", 200], ["Underarms", 150], ["Bikini line", 175], ["Brazilian", 275], ["Half arms", 200], ["Full arms", 300], ["Half legs", 300], ["Full legs", 450], ["Chest", 300], ["Back", 400], ["Full body", 1200]];
export const laserHair: Calc = (v) => {
  const price = pos(v.price, 0) > 0 ? pos(v.price, 0) : LASER_AREAS[pick(v.area, LASER_AREAS.length)][1], n = Math.max(1, Math.round(pos(v.sessions, 7))), disc = pos(v.discount, 0), maint = pos(v.maintenance, 1);
  const course = price * n * (1 - disc / 100), yearly = price * maint;
  return { total: r0(course), perSession: r0(price * (1 - disc / 100)), yearly: r0(yearly), five: r0(course + yearly * 4), sessions: n, saved: r0(price * n - course) };
};

// ---------------------------------------------------------- plastic surgery
export const SURGERY: [string, number, number][] = [["Breast augmentation", 4875, 2], ["Tummy tuck (abdominoplasty)", 8174, 3], ["Facelift", 11395, 4], ["Rhinoplasty (nose job)", 7637, 2.5], ["Chin / neck liposuction", 3194, 1], ["Other procedure (enter fee)", 0, 2]];
export const surgeryCost: Calc = (v) => {
  const p = SURGERY[pick(v.procedure, SURGERY.length)], feeIn = pos(v.fee, 0), base = feeIn > 0 ? feeIn : p[1];
  if (!(base > 0)) throw new InputError("Enter the surgeon's fee for this procedure.");
  const f = [1, 1.25, 0.85][pick(v.region, 3)], fee = feeIn > 0 ? feeIn : base * f, hours = pos(v.hours, 0) > 0 ? pos(v.hours, 0) : p[2];
  const anesthesia = hours * pos(v.anesthesiaRate, 600), facility = hours * pos(v.facilityRate, 900), extras = pos(v.extras, 400);
  const total = fee + anesthesia + facility + extras;
  return { total: r0(total), fee: r0(fee), anesthesia: r0(anesthesia), facility: r0(facility), extras: r0(extras), monthly: r0((total * (0.1 / 12)) / (1 - (1 + 0.1 / 12) ** -36)) };
};

// ---------------------------------------------------------- breast implant size
export const CUPS = ["AA", "A", "B", "C", "D", "DD", "DDD/F", "G"];
export const implantSize: Calc = (v) => {
  const band = pos(v.band, 34), cur = pick(v.current, CUPS.length), want = pick(v.desired, CUPS.length);
  if (want <= cur) throw new InputError("Choose a desired cup larger than your current cup.");
  if (band < 28 || band > 48) throw new InputError("Band size must be 28–48.");
  const perCup = 150 + (band - 32) * 12.5, cc = (want - cur) * perCup, rounded = Math.round(cc / 25) * 25;
  return { cc: rounded, low: Math.round((cc * 0.85) / 25) * 25, high: Math.round((cc * 1.15) / 25) * 25, perCup: r0(perCup), cups: want - cur, note: "Your surgeon chooses the final size from your chest width, tissue and the implant profile — use this only as a starting point." };
};

// ---------------------------------------------------------------- sunscreen
export const AREAS: [string, number][] = [["Face and neck", 0.09], ["Face, neck, arms (T-shirt and shorts)", 0.36], ["Swimsuit (most of the body)", 0.85], ["Whole body", 1]];
export const MED_SED = [2, 2.5, 3.5, 4.5, 6, 10];
export const sunscreen: Calc = (v) => {
  const us = pick(v.units, 2) === 0, cm = pos(v.height, us ? 66 : 168) * (us ? IN : 1), kg = pos(v.weight, us ? 150 : 68) * (us ? LB : 1);
  const bsa = Math.sqrt((cm * kg) / 3600), area = AREAS[pick(v.area, AREAS.length)][1], hours = pos(v.hours, 4), spf = pos(v.spf, 30), uvi = Math.max(1, pos(v.uvi, 7));
  const ml = (bsa * 10000 * area * 2) / 1000, apps = 1 + Math.floor(Math.max(0, hours - 0.01) / 2), total = ml * apps, bottle = pos(v.bottle, 177);
  const burn = (MED_SED[pick(v.skin, 6)] / (0.9 * uvi)) * 60;
  return { ml: r1(ml), tsp: r1(ml / 4.93), oz: r2(ml / 29.57), apps, total: r0(total), bottles: r2(total / bottle), burn: r0(burn), protected: r0(Math.min(burn * spf, 600)), realistic: r0(Math.min(burn * Math.sqrt(spf), 600)), bsa: r2(bsa) };
};

export const fitMiscCustomCalculators: Record<string, Calc> = {
  "tss-calculator": tssCalc,
  "maximal-aerobic-speed-calculator": masCalc,
  "rowing-split-calculator": rowingSplit,
  "stair-climbing-calorie-calculator": stairCalories,
  "body-shape-calculator": bodyShape,
  "tattoo-removal-cost-calculator": tattooRemoval,
  "hair-transplant-cost-calculator": hairTransplant,
  "hair-growth-calculator": hairGrowth,
  "laser-hair-removal-cost-calculator": laserHair,
  "cosmetic-surgery-cost-calculator": surgeryCost,
  "breast-implant-size-calculator": implantSize,
  "sunscreen-calculator": sunscreen,
};
