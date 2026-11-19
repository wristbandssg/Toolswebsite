/**
 * Batch: big generic keyword check (16 Nov 2026) — eight lifestyle tools: DRI (Food & Drink >
 * Diet), net carbs (Diet), glycemic load (Food Nutrition), unit price (Shopping > Discount, Tip &
 * Unit Price), face shape (Shopping > Clothing), weighted blanket (Shopping > Lifestyle), quilt
 * backing & binding and circle skirt (House & Garden > Flooring, Tile, Paint & Interior).
 *
 * Near-namesakes kept apart on purpose:
 *  - dri = full Dietary Reference Intake list (vitamins, minerals, fibre, water, protein) by age,
 *    sex and pregnancy. protein-intake / fiber-intake / water-intake (existing) each do one nutrient.
 *  - net-carbs = total carbs − fibre − sugar alcohols for a food label. carb-intake and keto
 *    (existing) set daily targets.
 *  - unit-price = compares 2–4 items in any weight, volume or count unit. price-per-ounce /
 *    price-per-pound (existing) do one item in one unit.
 *  - quilt-backing = backing yardage with seams + binding strips. fabric-yardage (existing) is
 *    general fabric for a cut list; quilt-pricing (existing) is what to charge.
 *  - circle-skirt = waist radius and fabric for full/half/quarter circle skirts. skirt-size
 *    (existing) is a clothing size chart.
 */

import { type TrvCalculator as Calc, InputError, num, pick, nfmt, sig } from "./trv-core";

const show = (x: number, s = 4) => (Number.isFinite(x) ? nfmt(sig(x, s), 6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : "—");
const usd = (x: number, dp = 2) => `$${x.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const LB = 0.45359237;
type Row = { prot: number; fib: number; water: number; ca: number; fe: number; d: number; c: number; a: number; b12: number; fol: number; mg: number; zn: number; k: number };
function driRow(age: number, male: boolean, stage: number): Row {
  if (age < 14) throw new InputError("This calculator covers ages 14 and up.");
  const teen = age < 19;
  let r: Row;
  if (male) r = teen ? { prot: 52, fib: 38, water: 3.3, ca: 1300, fe: 11, d: 600, c: 75, a: 900, b12: 2.4, fol: 400, mg: 410, zn: 11, k: 3000 }
    : { prot: 56, fib: age < 51 ? 38 : 30, water: 3.7, ca: age < 71 ? 1000 : 1200, fe: 8, d: age < 71 ? 600 : 800, c: 90, a: 900, b12: 2.4, fol: 400, mg: age < 31 ? 400 : 420, zn: 11, k: 3400 };
  else r = teen ? { prot: 46, fib: 26, water: 2.3, ca: 1300, fe: 15, d: 600, c: 65, a: 700, b12: 2.4, fol: 400, mg: 360, zn: 9, k: 2300 }
    : { prot: 46, fib: age < 51 ? 25 : 21, water: 2.7, ca: age < 51 ? 1000 : 1200, fe: age < 51 ? 18 : 8, d: age < 71 ? 600 : 800, c: 75, a: 700, b12: 2.4, fol: 400, mg: age < 31 ? 310 : 320, zn: 8, k: 2600 };
  if (!male && stage === 1) Object.assign(r, { prot: 71, fib: 28, water: 3.0, fe: 27, c: teen ? 80 : 85, a: teen ? 750 : 770, b12: 2.6, fol: 600, mg: teen ? 400 : age < 31 ? 350 : 360, zn: teen ? 12 : 11, k: teen ? 2600 : 2900, ca: teen ? 1300 : 1000 });
  if (!male && stage === 2) Object.assign(r, { prot: 71, fib: 29, water: 3.8, fe: teen ? 10 : 9, c: teen ? 115 : 120, a: teen ? 1200 : 1300, b12: 2.8, fol: 500, mg: teen ? 360 : age < 31 ? 310 : 320, zn: teen ? 13 : 12, k: teen ? 2500 : 2800, ca: teen ? 1300 : 1000 });
  return r;
}
export const dri: Calc = (v) => {
  const age = Math.round(num(v.age, 30)), male = pick(v.sex, 2) === 0, stage = male ? 0 : pick(v.stage, 3), wkg = num(v.weight, 0) * (pick(v.wunit, 2) === 1 ? LB : 1), smoker = pick(v.smoker, 2) === 1;
  const r = driRow(age, male, stage);
  const protein = wkg > 0 ? Math.max(r.prot, Math.round(wkg * (stage ? 1.1 : 0.8))) : r.prot;
  return {
    protein: `${protein} g a day${wkg > 0 ? ` (${stage ? "1.1" : "0.8"} g per kg)` : ""}`,
    fiber: `${r.fib} g`,
    water: `${show(r.water, 3)} L total water (food + drinks), about ${show(r.water * 0.8, 2)} L from drinks`,
    calcium: `${nfmt(r.ca)} mg`, iron: `${r.fe} mg`, vitd: `${r.d} IU (${r.d / 40} µg)`,
    vitc: `${r.c + (smoker ? 35 : 0)} mg${smoker ? " (+35 mg for smokers)" : ""}`,
    vita: `${nfmt(r.a)} µg RAE`, b12: `${r.b12} µg`, folate: `${r.fol} µg DFE`, magnesium: `${r.mg} mg`, zinc: `${r.zn} mg`,
    potassium: `${nfmt(r.k)} mg`, sodium: "Less than 2,300 mg (chronic disease risk reduction)",
  };
};
export const netCarbs: Calc = (v) => {
  const total = num(v.carbs, 25), fib = Math.max(0, num(v.fiber, 8)), sa = Math.max(0, num(v.sa, 0)), t = pick(v.saType, 3), region = pick(v.region, 2), sv = num(v.servings, 1);
  if (total < 0 || !(sv > 0)) throw new InputError("Enter the total carbs and servings.");
  const saSub = t === 0 ? sa : sa / 2, fibSub = region === 0 ? fib : 0;
  const per = Math.max(0, total - fibSub - saSub), all = per * sv;
  return {
    net: `${show(per, 4)} g per serving`,
    total: `${show(all, 4)} g for ${show(sv)} serving${sv === 1 ? "" : "s"}`,
    working: `${show(total)} g carbs${region === 0 ? ` − ${show(fib)} g fibre` : " (fibre already excluded)"}${sa ? ` − ${show(saSub)} g sugar alcohols` : ""} = ${show(per, 4)} g`,
    calories: `${show(per * 4, 4)} kcal from net carbs per serving`,
    keto: all <= 20 ? "Fits a strict keto day (20 g) on its own" : all <= 50 ? "Fits a moderate low-carb day (≤ 50 g)" : "More than a typical keto day (20–50 g)",
  };
};

// ------------------------------------------------------------------ glycemic load
export const GL_FOODS: [string, number, number][] = [
  ["Enter my own GI", 0, 0], ["White bread (1 slice, 30 g)", 75, 14], ["Whole-wheat bread (1 slice)", 74, 12], ["White rice, boiled (150 g)", 73, 43], ["Brown rice, boiled (150 g)", 68, 33],
  ["Rolled oats porridge (250 g)", 55, 21], ["Cornflakes (30 g)", 81, 26], ["Potato, boiled (150 g)", 78, 21], ["Sweet potato, boiled (150 g)", 63, 25], ["Spaghetti, white (180 g)", 49, 48],
  ["Quinoa (150 g)", 53, 25], ["Couscous (150 g)", 65, 35], ["Sweet corn (80 g)", 52, 17], ["Lentils (150 g)", 32, 18], ["Chickpeas (150 g)", 28, 30], ["Kidney beans (150 g)", 24, 25],
  ["Apple (120 g)", 36, 15], ["Banana (120 g)", 51, 25], ["Orange (120 g)", 43, 11], ["Grapes (120 g)", 59, 18], ["Mango (120 g)", 51, 17], ["Pineapple (120 g)", 59, 13], ["Watermelon (120 g)", 76, 7],
  ["Carrots, boiled (80 g)", 39, 4], ["Milk, full fat (250 mL)", 39, 12], ["Yogurt, plain (200 g)", 41, 9], ["Honey (1 tbsp, 21 g)", 61, 17], ["Table sugar (1 tbsp, 12 g)", 65, 12],
  ["Popcorn (20 g)", 65, 11], ["Dark chocolate (50 g)", 40, 16], ["Glucose (reference, 50 g)", 100, 50],
];
export const glycemicLoad: Calc = (v) => {
  const i = pick(v.food, GL_FOODS.length), f = GL_FOODS[i];
  const gi = i === 0 ? num(v.gi, 55) : f[1], carbs = num(v.carbs, 0) > 0 ? num(v.carbs, 0) : f[2], sv = num(v.servings, 1);
  if (!(gi > 0) || !(carbs > 0) || !(sv > 0)) throw new InputError("Enter the GI and the available carbs per serving (carbs − fibre).");
  const gl = (gi * carbs * sv) / 100;
  return {
    gl: show(gl, 3),
    band: gl <= 10 ? "Low GL (10 or less)" : gl < 20 ? "Medium GL (11–19)" : "High GL (20 or more)",
    gi: `${show(gi, 3)} — ${gi <= 55 ? "low GI (55 or less)" : gi < 70 ? "medium GI (56–69)" : "high GI (70 or more)"}`,
    carbs: `${show(carbs * sv, 4)} g available carbs`,
    working: `${show(gi, 3)} × ${show(carbs * sv, 4)} g ÷ 100 = ${show(gl, 3)}`,
    day: "A whole day's GL under about 100 is considered low.",
  };
};
const UP_BASE: [number, number][] = [[0, 1], [0, 16], [0, 1 / 28.3495], [0, 35.274], [1, 1], [1, 1 / 29.5735], [1, 33.814], [1, 128], [2, 1], [2, 1]];
const UP_GROUP = ["oz", "fl oz", "item"];
export const unitPrice: Calc = (v) => {
  const items: { n: number; price: number; per: number; g: number }[] = [];
  for (const n of [1, 2, 3, 4]) {
    const p = num(v[`p${n}`], 0), q = num(v[`q${n}`], 0);
    if (p > 0 && q > 0) { const [g, f] = UP_BASE[pick(v[`u${n}`], UP_BASE.length)]; items.push({ n, price: p, per: p / (q * f), g }); }
  }
  if (items.length < 1) throw new InputError("Enter a price and quantity for at least one item.");
  const g = items[0].g;
  if (items.some((i) => i.g !== g)) throw new InputError("Compare like with like: all items must be weights, all volumes, or all counts.");
  const best = items.reduce((a, b) => (b.per < a.per ? b : a)), worst = items.reduce((a, b) => (b.per > a.per ? b : a));
  const alt = g === 0 ? (x: number) => ` (${usd(x / 0.0283495 / 10, 3)} per 100 g, ${usd(x * 16)} per lb)` : g === 1 ? (x: number) => ` (${usd(x * 33.814)} per L)` : () => "";
  const line = (i: (typeof items)[number]) => `Item ${i.n}: ${usd(i.per, 4)} per ${UP_GROUP[g]}${alt(i.per)}`;
  return {
    best: `Item ${best.n} — ${usd(best.per, 4)} per ${UP_GROUP[g]}`,
    list: items.map(line).join("; "),
    save: items.length > 1 ? `${show((1 - best.per / worst.per) * 100, 3)}% cheaper per ${UP_GROUP[g]} than item ${worst.n}` : "Add another item to compare",
    unit: `Prices compared per ${UP_GROUP[g]}`,
  };
};
const FS_TIPS: Record<string, [string, string]> = {
  Oval: ["Most frame shapes suit you — try wide rectangular or geometric frames.", "Almost any cut works; avoid heavy fringes that hide the balance."],
  Round: ["Angular, rectangular or square frames add definition.", "Height on top, long layers and side parts lengthen the face."],
  Square: ["Round or oval frames soften a strong jaw.", "Soft layers, waves and side-swept fringes."],
  Oblong: ["Tall, oversized or round frames shorten the face.", "Volume at the sides, fringes and chin-length cuts."],
  Heart: ["Bottom-heavy, oval or rimless frames balance a wider forehead.", "Chin-length bobs and side-swept fringes."],
  Diamond: ["Cat-eye, oval or rimless frames.", "Fringes and fullness at the forehead and chin."],
  Triangle: ["Top-heavy, browline or cat-eye frames widen the forehead.", "Volume at the crown and temples."],
};
export const faceShape: Calc = (v) => {
  const fh = num(v.forehead, 5.5), ck = num(v.cheek, 5.8), jw = num(v.jaw, 4.8), ln = num(v.length, 7.5);
  if (!(fh > 0) || !(ck > 0) || !(jw > 0) || !(ln > 0)) throw new InputError("Enter all four measurements.");
  const L = ln / ck, f = fh / ck, j = jw / ck;
  let shape: string;
  if (j > f * 1.05 && j >= 0.95) shape = "Triangle";
  else if (f < 0.9 && j < 0.9 && Math.abs(f - j) < 0.12) shape = "Diamond";
  else if (f >= 0.93 && j < 0.85 && f > j * 1.1) shape = "Heart";
  else if (L >= 1.5) shape = Math.abs(f - j) < 0.1 ? "Oblong" : "Oval";
  else if (L >= 1.3) shape = "Oval";
  else shape = j >= 0.9 ? "Square" : "Round";
  const [glasses, hair] = FS_TIPS[shape];
  return {
    shape,
    ratios: `Length ÷ cheekbones ${show(L, 3)}; forehead ${show(f * 100, 3)}% and jaw ${show(j * 100, 3)}% of cheekbone width`,
    glasses,
    hair,
    note: "Measurements can't see jaw angles, so round vs square and oval vs oblong are best checked in a mirror too.",
  };
};
export const WB_BED = ["Throw / single sleeper (48×72 in)", "Twin (60×80 in)", "Full/Queen top of bed (60×80 in)", "Queen/King shared (80×87 in)"];
const WB_SIZES = [5, 7, 10, 12, 15, 17, 20, 22, 25, 30];
export const weightedBlanket: Calc = (v) => {
  const w = num(v.weight, 150), lb = pick(v.unit, 2) === 0 ? w : w / LB, kid = pick(v.who, 2) === 1, bed = pick(v.bed, 4);
  if (!(lb > 0)) throw new InputError("Enter body weight.");
  if (kid && lb < 50) return { rec: "Not recommended", range: "Under 50 lb: weighted blankets aren't recommended without a paediatrician's or OT's advice (and never for babies under 2).", size: WB_BED[bed], note: "Suffocation and overheating risk for small children." };
  const ideal = lb * 0.1 + (kid ? 1 : 0), pickSize = WB_SIZES.reduce((a, b) => (Math.abs(b - ideal) < Math.abs(a - ideal) ? b : a));
  return {
    rec: `${pickSize} lb blanket (${show(pickSize * LB, 3)} kg)`,
    range: `${show(lb * 0.08, 3)}–${show(lb * 0.12, 3)} lb (8–12% of body weight; 10% = ${show(ideal, 3)} lb)`,
    size: bed === 3 ? `${WB_BED[bed]} — for two people, use the lighter person's weight or two separate blankets` : WB_BED[bed],
    note: "Choose lighter if you're new to weighted blankets or sleep hot. You should be able to move it off easily.",
  };
};
const QB_W = [40, 58, 106];
const yd = (inch: number) => `${show(Math.ceil((inch / 36) * 8) / 8, 4)} yd (${show(inch * 0.0254, 3)} m)`;
export const quiltBacking: Calc = (v) => {
  const qw = num(v.width, 60), ql = num(v.length, 72), oh = Math.max(0, num(v.overhang, 4)), fw = QB_W[pick(v.fabric, 3)], sw = num(v.strip, 2.5);
  if (!(qw > 0) || !(ql > 0)) throw new InputError("Enter the quilt top's width and length in inches.");
  const W = qw + 2 * oh, L = ql + 2 * oh;
  const opts: [number, string][] = [];
  if (fw >= W) opts.push([L, "one piece, no seams"]);
  if (fw >= L) opts.push([W, "one piece turned sideways, no seams"]);
  const nV = Math.ceil((W - 0.5) / (fw - 0.5)), nH = Math.ceil((L - 0.5) / (fw - 0.5));
  if (nV > 1) opts.push([nV * L, `${nV} panels with ${nV - 1} vertical seam${nV > 2 ? "s" : ""}`]);
  if (nH > 1) opts.push([nH * W, `${nH} panels with ${nH - 1} horizontal seam${nH > 2 ? "s" : ""}`]);
  const best = opts.reduce((a, b) => (b[0] < a[0] ? b : a));
  const per = 2 * (qw + ql) + 12, strips = Math.ceil(per / 40), binding = strips * (sw > 0 ? sw : 2.5);
  return {
    backing: yd(best[0]),
    layout: `${best[1]} — backing cut ${show(W)} × ${show(L)} in`,
    others: opts.filter((o) => o !== best).map((o) => `${o[1]}: ${yd(o[0])}`).join("; ") || "—",
    binding: `${yd(binding)} — ${strips} strips of ${show(sw)} in × width of fabric`,
    length: `${show(per)} in of binding (perimeter + 12 in)`,
  };
};
export const circleSkirt: Calc = (v) => {
  const t = pick(v.type, 3), cm = pick(v.unit, 2) === 1, waist = num(v.waist, 28), len = num(v.length, 22), hem = Math.max(0, num(v.hem, 1)), fw = num(v.fabricWidth, cm ? 150 : 58);
  if (!(waist > 0) || !(len > 0)) throw new InputError("Enter waist and skirt length.");
  const k = [1, 0.5, 0.25][t], r = waist / (2 * Math.PI * k), R = r + len + hem, u = cm ? "cm" : "in";
  let need: number, how: string;
  if (t === 0) { if (fw >= 2 * R) { need = 2 * R; how = "Cut the full circle in one piece"; } else if (fw >= R) { need = 4 * R; how = "Cut two half circles and sew two side seams"; } else { need = NaN; how = "Fabric is too narrow — use quarter-circle panels"; } }
  else if (t === 1) { if (fw >= 2 * R) { need = R; how = "Cut on the cross grain in one piece"; } else if (fw >= R) { need = 2 * R; how = "Cut on the fold"; } else { need = NaN; how = "Fabric is too narrow — cut in two quarter panels"; } }
  else { if (fw >= R) { need = R; how = "Cut one quarter circle with the corner at the fold"; } else { need = NaN; how = "Fabric is narrower than the radius"; } }
  const toYd = (x: number) => (cm ? `${show(x / 100, 3)} m` : `${show(Math.ceil((x / 36) * 8) / 8, 4)} yd`);
  return {
    radius: `${show(r, 4)} ${u}`,
    outer: `${show(R, 4)} ${u} outer radius (incl. ${show(hem)} ${u} hem)`,
    fabric: Number.isFinite(need) ? toYd(need) : "—",
    how,
    hemLength: `${show(2 * Math.PI * k * (r + len), 4)} ${u} around the hem`,
  };
};

export const bigLifeCustomCalculators: Record<string, Calc> = {
  "dri-calculator": dri,
  "net-carbs-calculator": netCarbs,
  "glycemic-load-calculator": glycemicLoad,
  "unit-price-calculator": unitPrice,
  "face-shape-calculator": faceShape,
  "weighted-blanket-calculator": weightedBlanket,
  "quilt-backing-calculator": quiltBacking,
  "circle-skirt-calculator": circleSkirt,
};
