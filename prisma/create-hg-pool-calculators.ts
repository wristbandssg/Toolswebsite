// One-time (but safe to re-run) batch setup script: creates 26 calculators in House & Garden
// Calculators > Pool, Pond & Water Calculators (pool chemistry, volumes, pumps, heating, ponds and pool costs). Formulas live in src/lib/calc-engine-hg-pool.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-pool-calculators.ts
// or
//   npm run db:create-hg-pool-calculators

import * as E from "../src/lib/calc-engine-hg-pool";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; labels?: string[] };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

/** Number input: key, label, default, max, step, min, unit. */
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0, unit?: string) => ({ key, label, type: "number", ...(unit ? { unit } : {}), required: true, default: def, min, max, step });
/** Dollar input. */
const usd = (key: string, label: string, def: number, max = 10000000, step = 1) => ({ key, label, type: "currency", required: true, default: def, min: 0, max, step });
/** Percent input. */
const pct = (key: string, label: string, def: number, max = 100, step = 0.5) => ({ key, label, type: "percentage", required: true, default: def, min: 0, max, step });
const opts = (labels: string[]) => labels.map((l, i) => ({ label: l, value: i }));
/** Dropdown with index values. */
const dd = (key: string, label: string, labels: string[], def = 0) => ({ key, label, type: "dropdown", required: true, default: def, options: opts(labels) });
const FMT = { n: "number", l: "label", c: "currency", p: "percentage", d: "date" } as const;
/** [key, label, format, labels for "l" lines]. */
type Line = [key: string, label: string, fmt: keyof typeof FMT, labels?: string[]];
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const n2 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][] }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt, mainLabels] = s.results[0];
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? s.title).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainLabels ? { labels: mainLabels } : {}) },
    calcResults: s.results.map(([key, label, f, labels], i) => ({ key, label, format: FMT[f], ...(labels ? { labels } : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: NOTE ? `${s.assume}\n\n${NOTE}` : s.assume,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const CAT = "pool-pond-water-calculators";
const NOTE = "";
const CHEM_NOTE = "Add chemicals one at a time with the pump running, in steps, and retest before adding more. Never mix chemicals together, and always add chemicals to water — not water to chemicals.";
const COST_NOTE = "Prices are typical 2026 US costs and vary by region — get local quotes.";
const GAL = num("gallons", "Pool Volume", 15000, 1000000, 100, 100, "gal");

const TOOLS: ToolDef[] = [
  mk({
    slug: "pool-chlorine-calculator", title: "Pool Chlorine Calculator (Liquid, Bleach, Cal-Hypo, Dichlor & Trichlor)",
    desc: "Work out how much chlorine to add to a pool to raise free chlorine — liquid chlorine, bleach, cal-hypo, dichlor or trichlor — in ounces, cups, quarts and gallons.",
    meta: "Pool Chlorine Calculator — How Much Chlorine to Add to a Pool",
    inputs: [GAL, num("current", "Current Free Chlorine", 1, 40, 0.5, 0, "ppm"), num("target", "Target Free Chlorine", 4, 40, 0.5, 0, "ppm"), dd("product", "Product", E.CHLORINE_PRODUCTS)],
    results: [["amount", "Amount (fl oz or oz)", "n"], ["cups", "Cups", "n"], ["quarts", "Quarts", "n"], ["gallonsProduct", "Gallons", "n"], ["pounds", "Pounds (dry products)", "n"]],
    fn: E.poolChlorine, ex: { gallons: 15000, current: 1, target: 4, product: 0 },
    exText: (o) => `Example: raising a 15,000 gallon pool from 1 to 4 ppm takes about ${o.amount} fl oz (${o.quarts} quarts) of 12.5% liquid chlorine.`,
    how: "Test free chlorine first. Keep FC at about 7.5% of your stabilizer (CYA) level — e.g. 3 ppm with 40 ppm CYA. Trichlor and dichlor add stabilizer every time you use them; cal-hypo adds calcium.",
    assume: `Per 1 ppm in 10,000 gal: 12.5% liquid 10.7 fl oz, 10% 12.8, 8.25% bleach 15.5, 6% bleach 21.3; cal-hypo 65% 2.0 oz, dichlor 2.4 oz, trichlor 1.5 oz by weight. ${CHEM_NOTE}`,
    faq: [["How much liquid chlorine for a 15,000 gallon pool?", "About 16 fl oz (half a quart) of 12.5% chlorine raises FC 1 ppm."]],
  }),
  mk({
    slug: "pool-shock-calculator", title: "Pool Shock Calculator (Regular Shock & SLAM)",
    desc: "Calculate how much pool shock to add — to reach 10 ppm, the SLAM level of 40% of your CYA for algae, or a custom target — with liquid chlorine, bleach or granular shock.",
    inputs: [GAL, num("current", "Current Free Chlorine", 1, 40, 0.5, 0, "ppm"), dd("goal", "Shock Goal", E.SHOCK_GOALS), num("cya", "Stabilizer (CYA)", 40, 150, 5, 0, "ppm"), num("customTarget", "Custom Target", 10, 50, 0.5, 0, "ppm"), dd("product", "Product", E.CHLORINE_PRODUCTS)],
    results: [["amount", "Shock Needed (fl oz or oz)", "n"], ["targetFc", "Target FC (ppm)", "n"], ["gallonsProduct", "Gallons (liquid)", "n"], ["pounds", "Pounds (granular)", "n"]],
    fn: E.poolShock, ex: { gallons: 15000, current: 1, goal: 0, cya: 40, customTarget: 10, product: 0 },
    exText: (o) => `Example: shocking a 15,000 gallon pool from 1 to 10 ppm takes about ${o.amount} fl oz (${o.gallonsProduct} gal) of 12.5% liquid chlorine.`,
    how: "Shock in the evening so the sun doesn't burn off chlorine. For algae, hold the SLAM level (FC ≈ 40% of CYA) until the water is clear, overnight chlorine loss is under 1 ppm and the combined chlorine is 0.5 or less.",
    assume: `SLAM target = 40% of CYA (Trouble Free Pool method), at least 10 ppm. Product strengths as in the chlorine calculator. ${CHEM_NOTE}`,
    faq: [["How much shock for a 20,000 gallon pool?", "About 1–2 gallons of 12.5% liquid chlorine to reach 10 ppm, depending on current FC."]],
  }),
  mk({
    slug: "pool-alkalinity-calculator", title: "Pool Alkalinity Calculator (Baking Soda & Acid)",
    desc: "Calculate how much baking soda raises total alkalinity — or how much muriatic acid lowers it — for your pool's volume and current and target TA.",
    inputs: [GAL, num("current", "Current Total Alkalinity", 70, 300, 5, 0, "ppm"), num("target", "Target Total Alkalinity", 90, 200, 5, 0, "ppm")],
    results: [["bakingSodaLb", "Baking Soda to Add (lb)", "n"], ["acidFlOz", "Or Muriatic Acid to Add (fl oz)", "n"], ["change", "Change (ppm)", "n"]],
    fn: E.poolAlkalinity, ex: { gallons: 15000, current: 70, target: 90 },
    exText: (o) => `Example: raising a 15,000 gallon pool's alkalinity from 70 to 90 ppm takes about ${o.bakingSodaLb} lb of baking soda.`,
    how: "Typical targets: 60–80 ppm for saltwater and plaster pools with low CYA, 80–120 ppm otherwise. Lowering TA takes acid plus aeration over several days, because acid also lowers pH.",
    assume: `Baking soda ≈ 1.4 lb per 10,000 gal raises TA 10 ppm; 31.45% muriatic acid ≈ 25.6 fl oz per 10,000 gal lowers TA 10 ppm. ${CHEM_NOTE}`,
    faq: [["How much baking soda raises alkalinity 10 ppm?", "About 1.4 lb per 10,000 gallons."]],
  }),
  mk({
    slug: "pool-ph-calculator", title: "Pool pH Calculator (Muriatic Acid & Soda Ash)",
    desc: "Estimate how much muriatic acid lowers pool pH — or soda ash raises it — from your pool's volume, current and target pH and total alkalinity.",
    inputs: [GAL, num("current", "Current pH", 7.8, 8.5, 0.1, 6.8), num("target", "Target pH", 7.5, 8.2, 0.1, 7), num("ta", "Total Alkalinity", 90, 200, 5, 20, "ppm")],
    results: [["acidFlOz", "Muriatic Acid 31.45% (fl oz)", "n"], ["sodaAshOz", "Or Soda Ash (oz)", "n"], ["change", "pH Change", "n"]],
    fn: E.poolPh, ex: { gallons: 15000, current: 7.8, target: 7.5, ta: 90 },
    exText: (o) => `Example: lowering a 15,000 gallon pool with 90 ppm TA from pH 7.8 to 7.5 takes roughly ${o.acidFlOz} fl oz of muriatic acid — add half, circulate and retest.`,
    how: "Pour acid slowly in front of a return jet with the pump running. Higher alkalinity makes pH harder to move. Dry acid (sodium bisulfate) works too — about 1.25 lb per 10 fl oz of muriatic acid.",
    assume: `Rough estimates: 31.45% acid ≈ 12.8 fl oz and soda ash ≈ 6 oz per 10,000 gal per 0.2 pH at 100 ppm TA, scaled by TA. Borate and CYA change the response. ${CHEM_NOTE}`,
    faq: [["How much muriatic acid lowers pH?", "Roughly 12–16 fl oz per 10,000 gallons lowers pH about 0.2 at normal alkalinity."]],
  }),
  mk({
    slug: "pool-calcium-hardness-calculator", title: "Pool Calcium Hardness Calculator",
    desc: "Calculate how much calcium chloride raises pool calcium hardness — or what share of water to drain and replace to lower it.",
    inputs: [GAL, num("current", "Current Calcium Hardness", 200, 1000, 10, 0, "ppm"), num("target", "Target Calcium Hardness", 300, 600, 10, 0, "ppm")],
    results: [["calciumChlorideLb", "Calcium Chloride 77% (lb)", "n"], ["drainPercent", "Or Drain & Refill (%)", "n"]],
    fn: E.poolCalcium, ex: { gallons: 15000, current: 200, target: 300 },
    exText: (o) => `Example: raising a 15,000 gallon pool from 200 to 300 ppm hardness takes about ${o.calciumChlorideLb} lb of calcium chloride.`,
    how: "Plaster and pebble pools need 250–450 ppm to avoid etching; vinyl and fiberglass can run lower. Pre-dissolve calcium chloride in a bucket of pool water — it gets hot.",
    assume: `Calcium chloride (77%) ≈ 1.2 lb per 10,000 gal raises CH 10 ppm. Lowering needs dilution with low-calcium water. ${CHEM_NOTE}`,
    faq: [["How much calcium chloride per 10,000 gallons?", "About 1.2 lb raises hardness 10 ppm."]],
  }),
  mk({
    slug: "pool-stabilizer-calculator", title: "Pool Stabilizer (CYA) Calculator",
    desc: "Calculate how much cyanuric acid (stabilizer, conditioner) raises CYA — or how much to drain to lower it — plus the minimum free chlorine for your CYA level.",
    inputs: [GAL, num("current", "Current CYA", 20, 200, 5, 0, "ppm"), num("target", "Target CYA", 40, 100, 5, 0, "ppm")],
    results: [["cyaLb", "Stabilizer to Add (lb)", "n"], ["cyaOz", "Stabilizer (oz)", "n"], ["drainPercent", "Or Drain & Refill (%)", "n"], ["minFc", "Minimum FC at Target CYA (ppm)", "n"]],
    fn: E.poolStabilizer, ex: { gallons: 15000, current: 20, target: 40 },
    exText: (o) => `Example: raising a 15,000 gallon pool from 20 to 40 ppm CYA takes about ${o.cyaLb} lb of stabilizer; then keep FC at least ${o.minFc} ppm.`,
    how: "Target 30–50 ppm for chlorine pools and 60–80 for saltwater pools. Stabilizer dissolves slowly — put it in a sock in the skimmer or in front of a return and don't backwash for a week.",
    assume: `Cyanuric acid ≈ 13 oz per 10,000 gal raises CYA 10 ppm; minimum FC ≈ 7.5% of CYA. ${CHEM_NOTE}`,
    faq: [["How much stabilizer for 10,000 gallons?", "About 13 oz raises CYA 10 ppm."]],
  }),
  mk({
    slug: "pool-salt-calculator", title: "Pool Salt Calculator (Pounds & Bags)",
    desc: "Calculate how much salt to add to a saltwater pool — pounds, 40 lb bags and kilograms — to reach your chlorinator's target ppm (Pentair, Hayward and others).",
    meta: "Pool Salt Calculator — How Much Salt to Add to a Pool",
    inputs: [GAL, num("current", "Current Salt", 0, 10000, 100, 0, "ppm"), num("target", "Target Salt", 3200, 6000, 100, 0, "ppm")],
    results: [["saltLb", "Salt to Add (lb)", "n"], ["bags40lb", "40 lb Bags", "n"], ["kg", "Kilograms", "n"], ["drainPercent", "Drain & Refill if Too High (%)", "n"]],
    fn: E.poolSalt, ex: { gallons: 15000, current: 0, target: 3200 },
    exText: (o) => `Example: bringing a new 15,000 gallon pool to 3,200 ppm takes about ${o.saltLb} lb — ${o.bags40lb} bags of 40 lb.`,
    how: "Use pool-grade salt (99%+ sodium chloride, no anti-caking agents). Check your cell's ideal range (often 2,700–3,400 ppm) and add salt in stages, brushing it until it dissolves.",
    assume: "Salt lb = gallons × Δppm × 8.34 ÷ 1,000,000.",
    faq: [["How much salt for a 15,000 gallon pool?", "About 400 lb to reach 3,200 ppm from fresh water."]],
  }),
  mk({
    slug: "pond-salt-calculator", title: "Pond Salt Calculator (Koi Pond Salinity)",
    desc: "Calculate how much salt to add to a koi or garden pond for a target salinity — pounds, kilograms and how much per day when adding it gradually.",
    inputs: [num("gallons", "Pond Volume", 1000, 100000, 10, 10, "gal"), num("salinity", "Target Salinity", 0.1, 0.6, 0.05, 0.05, "%"), num("days", "Add Over (days)", 3, 7, 1, 1)],
    results: [["saltLb", "Salt (lb)", "n"], ["saltKg", "Salt (kg)", "n"], ["perDayLb", "Per Day (lb)", "n"], ["ppm", "Salinity (ppm)", "n"]],
    fn: E.pondSalt, ex: { gallons: 1000, salinity: 0.1, days: 3 },
    exText: (o) => `Example: a 1,000 gallon koi pond at 0.1% salinity needs about ${o.saltLb} lb of salt — ${o.perDayLb} lb a day over three days.`,
    how: "Use non-iodized pond or pure salt. 0.1% is a general tonic; 0.3% is a short-term treatment level. Salt kills many plants — move them out first — and only water changes remove it.",
    assume: "Salt lb = gallons × 8.34 × salinity % ÷ 100.",
    faq: [["How much salt per 1,000 gallons for a koi pond?", "About 8.3 lb for 0.1% salinity."]],
  }),
  mk({
    slug: "lsi-calculator", title: "LSI Calculator (Langelier Saturation Index for Pools)",
    desc: "Calculate a pool's Langelier Saturation Index from pH, water temperature, calcium hardness, alkalinity, CYA and TDS (including salt) — and whether the water is corrosive, balanced or scaling.",
    inputs: [num("ph", "pH", 7.5, 8.5, 0.1, 6.5), num("temp", "Water Temperature", 82, 104, 1, 32, "°F"), num("ch", "Calcium Hardness", 300, 1000, 10, 10, "ppm"), num("ta", "Total Alkalinity", 90, 300, 5, 10, "ppm"), num("cya", "Stabilizer (CYA)", 40, 200, 5, 0, "ppm"), num("tds", "TDS (without salt)", 1000, 5000, 50, 0, "ppm"), num("salt", "Salt", 0, 6000, 100, 0, "ppm")],
    results: [["lsi", "LSI", "n"], ["status", "Water Is", "l", E.LSI_STATUS]],
    fn: E.lsi, ex: { ph: 7.5, temp: 82, ch: 300, ta: 90, cya: 40, tds: 1000, salt: 0 },
    exText: (o) => `Example: pH 7.5, 82 °F, 300 ppm hardness, 90 ppm TA and 40 ppm CYA give an LSI of ${o.lsi} — ${E.LSI_STATUS[o.status].split(" (")[0].toLowerCase()}.`,
    how: "Keep LSI between −0.3 and +0.3 to protect plaster and equipment. Cold water and low calcium push LSI negative (corrosive); high pH, heat and hard water push it positive (scale) — salt cells and heaters scale first.",
    assume: "LSI = pH − pHs using the standard A, B, C and D factors; carbonate alkalinity = TA − CYA ÷ 3.",
    faq: [["What is a good LSI for a pool?", "Between −0.3 and +0.3, ideally close to 0."]],
  }),
  mk({
    slug: "pool-chemical-calculator", title: "Pool Chemical Calculator (All-in-One Water Balance)",
    desc: "Balance your pool in one place — liquid chlorine, muriatic acid or soda ash, baking soda, calcium chloride and stabilizer from your test results and targets — with the resulting LSI.",
    meta: "Pool Chemical Calculator — Balance Chlorine, pH, Alkalinity & More",
    inputs: [GAL, num("fc", "Free Chlorine", 2, 40, 0.5, 0, "ppm"), num("fcTarget", "Target FC", 4, 40, 0.5, 0, "ppm"), num("ph", "pH", 7.8, 8.5, 0.1, 6.8), num("phTarget", "Target pH", 7.5, 8.2, 0.1, 7), num("ta", "Total Alkalinity", 70, 300, 5, 0, "ppm"), num("taTarget", "Target TA", 90, 200, 5, 0, "ppm"), num("ch", "Calcium Hardness", 250, 1000, 10, 0, "ppm"), num("chTarget", "Target CH", 300, 600, 10, 0, "ppm"), num("cya", "CYA", 30, 200, 5, 0, "ppm"), num("cyaTarget", "Target CYA", 40, 100, 5, 0, "ppm"), num("temp", "Water Temperature", 82, 104, 1, 32, "°F")],
    results: [["liquidChlorineFlOz", "Liquid Chlorine 12.5% (fl oz)", "n"], ["acidFlOz", "Muriatic Acid (fl oz)", "n"], ["sodaAshOz", "Soda Ash (oz)", "n"], ["bakingSodaLb", "Baking Soda (lb)", "n"], ["calciumChlorideLb", "Calcium Chloride (lb)", "n"], ["stabilizerLb", "Stabilizer (lb)", "n"], ["targetLsi", "LSI at Targets", "n"]],
    fn: E.poolChemical, ex: { gallons: 15000, fc: 2, fcTarget: 4, ph: 7.8, phTarget: 7.5, ta: 70, taTarget: 90, ch: 250, chTarget: 300, cya: 30, cyaTarget: 40, temp: 82 },
    exText: (o) => `Example: for a 15,000 gallon pool, add about ${o.liquidChlorineFlOz} fl oz of liquid chlorine, ${o.bakingSodaLb} lb of baking soda and ${o.calciumChlorideLb} lb of calcium chloride — then the LSI sits near ${o.targetLsi}.`,
    how: "Order matters: adjust alkalinity first, then pH, then calcium, then stabilizer, then chlorine. Give each chemical a few hours of circulation before the next. Phone apps such as Pool Math do the same sums.",
    assume: `Uses the same dose factors as the single-chemical calculators (12.5% liquid chlorine, 31.45% acid). ${CHEM_NOTE}`,
    faq: [["What order should I add pool chemicals?", "Alkalinity, pH, calcium, stabilizer, then chlorine — one at a time."]],
  }),
  mk({
    slug: "hot-tub-chemical-calculator", title: "Hot Tub & Spa Chemical Calculator",
    desc: "Calculate hot tub chemicals — dichlor or bromine to raise the sanitizer, baking soda for alkalinity and pH down — for your spa's gallons.",
    inputs: [num("gallons", "Spa Volume", 400, 1500, 10, 50, "gal"), num("current", "Current Sanitizer (as chlorine)", 1, 20, 0.5, 0, "ppm"), num("target", "Target Sanitizer", 4, 20, 0.5, 0, "ppm"), num("ta", "Total Alkalinity", 60, 300, 5, 0, "ppm"), num("taTarget", "Target TA", 80, 150, 5, 0, "ppm"), num("ph", "pH", 7.6, 8.5, 0.1, 6.8)],
    results: [["dichlorOz", "Dichlor Granules (oz)", "n"], ["bromineOz", "Or Bromine Granules (oz)", "n"], ["bakingSodaOz", "Baking Soda (oz)", "n"], ["phDownOz", "pH Down (oz)", "n"]],
    fn: E.hotTubChemical, ex: { gallons: 400, current: 1, target: 4, ta: 60, taTarget: 80, ph: 7.6 },
    exText: (o) => `Example: raising a 400 gallon spa from 1 to 4 ppm takes about ${o.dichlorOz} oz of dichlor; ${o.bakingSodaOz} oz of baking soda lifts TA from 60 to 80.`,
    how: "Spas are small and hot, so doses are tiny — use a measuring spoon. Add chemicals with the jets on and the cover open for 20 minutes. Drain and refill every 3–4 months.",
    assume: `Dichlor 56% and bromine granules (≈ 2.25 ppm bromine per 1 ppm chlorine equivalent). ${CHEM_NOTE}`,
    faq: [["How much chlorine do I put in a hot tub?", "About ½ oz of dichlor in 400 gallons raises chlorine roughly 4 ppm."]],
  }),
  mk({
    slug: "water-volume-calculator", title: "Water Volume Calculator (Gallons & Liters)",
    desc: "Calculate water volume in gallons, liters, cubic feet and cubic meters — and the water's weight — for rectangular, round, oval or irregular containers, pools, tanks and hot tubs.",
    inputs: [dd("shape", "Shape", E.SHAPES), num("length", "Length (or diameter)", 10, 1000, 0.25, 0, "ft"), num("width", "Width", 5, 1000, 0.25, 0, "ft"), num("depth", "Average Depth / Height", 4, 100, 0.25, 0, "ft")],
    results: [["gallons", "Gallons", "n"], ["liters", "Liters", "n"], ["cubicFeet", "Cubic Feet", "n"], ["cubicMeters", "Cubic Meters", "n"], ["weightLb", "Water Weight (lb)", "n"]],
    fn: E.waterVolume, ex: { shape: 0, length: 10, width: 5, depth: 4 },
    exText: (o) => `Example: a 10 × 5 ft container filled 4 ft deep holds ${n2(o.gallons)} gallons (${n2(o.liters)} L) and weighs ${n2(o.weightLb)} lb.`,
    how: "Use the average water depth. For a round shape enter the diameter as the length. Water weighs about 8.34 lb per gallon — check floors and decks before filling big containers.",
    assume: "1 cu ft = 7.48 gal = 28.32 L; kidney/irregular ≈ 75% of the bounding rectangle.",
    faq: [["How many gallons in a cubic foot?", "7.48 gallons."]],
  }),
  mk({
    slug: "pond-volume-calculator", title: "Pond Volume Calculator (Gallons, Liters & Koi)",
    desc: "Calculate a pond's volume — gallons and liters for rectangular, round, oval or irregular ponds, with average or sloped depth — plus a koi stocking guide and pump size.",
    inputs: [dd("shape", "Pond Shape", E.SHAPES, 3), num("length", "Length (or diameter)", 12, 1000, 0.25, 0, "ft"), num("width", "Width", 8, 1000, 0.25, 0, "ft"), num("avgDepth", "Average Depth (0 = use shallow/deep)", 0, 30, 0.25, 0, "ft"), num("shallowDepth", "Shallow End Depth", 1.5, 30, 0.25, 0, "ft"), num("deepDepth", "Deep End Depth", 3, 30, 0.25, 0, "ft")],
    results: [["gallons", "Pond Volume (gal)", "n"], ["liters", "Liters", "n"], ["surfaceSqFt", "Surface Area (sq ft)", "n"], ["koi", "Koi Capacity (~250 gal each)", "n"], ["pumpGph", "Pump for 1 Turnover/Hour (gph)", "n"]],
    fn: E.pondVolume, ex: { shape: 3, length: 12, width: 8, avgDepth: 0, shallowDepth: 1.5, deepDepth: 3 },
    exText: (o) => `Example: an irregular 12 × 8 ft pond sloping from 1.5 to 3 ft holds about ${n2(o.gallons)} gallons — room for about ${o.koi} adult koi.`,
    how: "Measure the longest length and widest width and average the depth. The most accurate way is to read your water meter while filling.",
    assume: "Irregular ponds ≈ 75% of the bounding rectangle; koi ≈ 250 gallons per adult fish; pump at one turnover per hour.",
    faq: [["How many gallons is my pond?", "Length × width × average depth (ft) × 7.48, adjusted for shape."]],
  }),
  mk({
    slug: "water-tank-capacity-calculator", title: "Water Tank Capacity Calculator (Gallons & Liters)",
    desc: "Calculate the capacity of a vertical or horizontal cylinder or rectangular water tank — and how much water is in it at the current fill height.",
    inputs: [dd("shape", "Tank Shape", E.TANK_SHAPES), num("diameter", "Diameter (cylinders)", 48, 600, 0.5, 1, "in"), num("length", "Length (horizontal / rectangular)", 60, 1200, 0.5, 1, "in"), num("width", "Width (rectangular)", 48, 600, 0.5, 1, "in"), num("height", "Height (vertical / rectangular)", 60, 1200, 0.5, 1, "in"), num("fillHeight", "Current Water Depth", 30, 1200, 0.5, 0, "in")],
    results: [["capacityGallons", "Full Capacity (gal)", "n"], ["currentGallons", "Water Now (gal)", "n"], ["capacityLiters", "Capacity (L)", "n"], ["percentFull", "Percent Full (%)", "n"]],
    fn: E.waterTank, ex: { shape: 0, diameter: 48, length: 60, width: 48, height: 60, fillHeight: 30 },
    exText: (o) => `Example: a 48 in diameter, 60 in tall vertical tank holds about ${o.capacityGallons} gallons; at 30 in deep it has ${o.currentGallons} gallons.`,
    how: "Measure inside dimensions if you can. Horizontal cylinders hold less per inch near the top and bottom, so the percent full isn't the same as the depth ratio.",
    assume: "231 cu in per gallon; horizontal cylinders use the circular-segment formula.",
    faq: [["How many gallons in a 4 ft round tank, 5 ft tall?", "About 470 gallons."]],
  }),
  mk({
    slug: "pond-liner-calculator", title: "Pond Liner Size Calculator",
    desc: "Calculate pond liner size — length and width in feet with depth and edge overlap — and the matching underlayment.",
    inputs: [num("length", "Pond Length", 12, 200, 0.5, 1, "ft"), num("width", "Pond Width", 8, 200, 0.5, 1, "ft"), num("maxDepth", "Maximum Depth", 3, 15, 0.25, 0.5, "ft"), num("overlap", "Edge Overlap Each Side", 1.5, 3, 0.25, 0.5, "ft")],
    results: [["linerLengthFt", "Liner Length (ft)", "n"], ["linerWidthFt", "Liner Width (ft)", "n"], ["linerSqFt", "Liner Area (sq ft)", "n"], ["underlaymentSqFt", "Underlayment (sq ft)", "n"]],
    fn: E.pondLiner, ex: { length: 12, width: 8, maxDepth: 3, overlap: 1.5 },
    exText: (o) => `Example: a 12 × 8 ft pond 3 ft deep with 1.5 ft overlap needs a ${o.linerLengthFt} × ${o.linerWidthFt} ft liner.`,
    how: "Use the longest length, widest width and deepest point. Shelves and curves don't change the formula. 45 mil EPDM is the common choice for fish ponds.",
    assume: "Liner = length (or width) + 2 × max depth + 2 × overlap, rounded up.",
    faq: [["What size liner for a 10x10 pond 3 feet deep?", "About 19 × 19 ft with 1.5 ft overlap."]],
  }),
  mk({
    slug: "pool-turnover-calculator", title: "Pool Turnover Rate Calculator (Flow Rate)",
    desc: "Calculate pool turnover — hours for the pump to move the whole pool once — turnovers per day, and the GPM needed for an 8-hour or custom turnover.",
    inputs: [GAL, num("gpm", "Pump Flow Rate", 40, 500, 1, 1, "gpm"), num("targetHours", "Target Turnover Time", 8, 24, 0.5, 1, "hr"), num("runHours", "Pump Run Time per Day", 8, 24, 0.5, 0, "hr")],
    results: [["turnoverHours", "Turnover Time (hr)", "n"], ["turnoversPerDay", "Turnovers per Day", "n"], ["gpmFor8Hours", "GPM for an 8-Hour Turnover", "n"], ["gpmForTarget", "GPM for Your Target", "n"]],
    fn: E.poolTurnover, ex: { gallons: 15000, gpm: 40, targetHours: 8, runHours: 8 },
    exText: (o) => `Example: a 40 gpm pump turns over a 15,000 gallon pool every ${o.turnoverHours} hours — ${o.turnoversPerDay} turnovers in 8 hours.`,
    how: "Most residential pools need about one turnover a day. Public pools are required to turn over every 6 hours (often less). Flow drops as the filter gets dirty — check the filter pressure.",
    assume: "Turnover hours = gallons ÷ (gpm × 60).",
    faq: [["What is a good pool turnover rate?", "Once every 6–8 hours of run time for most home pools."]],
  }),
  mk({
    slug: "pool-pump-run-time-calculator", title: "Pool Pump Run Time Calculator (and Electricity Cost)",
    desc: "Work out how many hours a day to run your pool pump for one or more turnovers — and what it costs each month, compared with a variable-speed pump.",
    inputs: [GAL, num("gpm", "Pump Flow", 45, 500, 1, 1, "gpm"), num("turnovers", "Turnovers per Day", 1, 3, 0.5, 0.5), num("watts", "Pump Power (W, 0 = use hp)", 0, 5000, 10, 0), num("hp", "Or Pump Size", 1.5, 5, 0.25, 0.25, "hp"), usd("kwhPrice", "Electricity per kWh", 0.17, 1, 0.005), num("months", "Swim Months per Year", 6, 12, 1, 1)],
    results: [["hoursPerDay", "Run Time (hr/day)", "n"], ["monthlyCost", "Monthly Cost (single speed)", "c"], ["variableSpeedMonthly", "Monthly Cost (variable speed)", "c"], ["yearlySavingsVs", "Yearly Savings With Variable Speed", "c"]],
    fn: E.poolPumpRunTime, ex: { gallons: 15000, gpm: 45, turnovers: 1, watts: 0, hp: 1.5, kwhPrice: 0.17, months: 6 },
    exText: (o) => `Example: a 1.5 hp single-speed pump moving 45 gpm runs about ${o.hoursPerDay} hours a day for one turnover — about ${money(o.monthlyCost)} a month, or ${money(o.variableSpeedMonthly)} with a variable-speed pump.`,
    how: "Run longer in hot weather and after heavy use. Variable-speed pumps (required for most replacements under DOE rules since 2021) save the most by running longer at low speed.",
    assume: "≈ 1,000 W per pump hp (single speed); variable speed at half speed uses about ¼ the energy for the same turnover (affinity laws).",
    faq: [["How long should I run my pool pump?", "Long enough for one turnover a day — often 6–10 hours."]],
  }),
  mk({
    slug: "pool-filter-sand-calculator", title: "Pool Filter Sand Calculator",
    desc: "Find how much sand a pool sand filter needs from the tank diameter — pounds and 50 lb bags — plus glass media or filter balls instead.",
    inputs: [num("diameter", "Filter Tank Diameter", 22, 36, 0.5, 12, "in"), num("customLb", "Filter Label Says (0 = estimate)", 0, 1000, 5, 0, "lb")],
    results: [["sandLb", "#20 Silica Sand (lb)", "n"], ["bags50lb", "50 lb Bags", "n"], ["glassMediaLb", "Or Glass Media (lb)", "n"], ["filterBallsLb", "Or Filter Balls (lb)", "n"]],
    fn: E.poolFilterSand, ex: { diameter: 22, customLb: 0 },
    exText: (o) => `Example: a 22 in sand filter takes about ${o.sandLb} lb of #20 silica sand — ${o.bags50lb} bags — or ${o.glassMediaLb} lb of glass media.`,
    how: "The label on the filter tank lists the exact amount — enter it if you have it. Replace sand every 5–7 years. Cover the laterals with water before pouring sand in.",
    assume: "Typical charts: 16 in 100 lb, 18 in 150 lb, 22 in 250 lb, 24 in 300 lb, 30 in 600 lb; glass media ≈ 80% of the sand weight; filter balls ≈ 1.4 lb per 50 lb of sand.",
    faq: [["How much sand for a 24 inch pool filter?", "About 300 lb."]],
  }),
  mk({
    slug: "pool-evaporation-calculator", title: "Pool Evaporation Calculator (Water Loss)",
    desc: "Estimate how much water a pool loses to evaporation — inches per day and week and gallons per month — from water and air temperature, humidity, wind and whether it's covered.",
    inputs: [num("area", "Pool Surface Area", 450, 10000, 1, 10, "sq ft"), num("waterTemp", "Water Temperature", 82, 104, 1, 40, "°F"), num("airTemp", "Air Temperature", 85, 120, 1, 30, "°F"), pct("humidity", "Relative Humidity", 50, 100, 1), num("wind", "Wind Speed at the Pool", 5, 30, 1, 0, "mph"), dd("cover", "Covered When Not in Use?", ["No", "Yes"])],
    results: [["inchesPerDay", "Evaporation (in/day)", "n"], ["inchesPerWeek", "Per Week (in)", "n"], ["gallonsPerDay", "Gallons per Day", "n"], ["gallonsPerMonth", "Gallons per Month", "n"]],
    fn: E.poolEvaporation, ex: { area: 450, waterTemp: 82, airTemp: 85, humidity: 50, wind: 5, cover: 0 },
    exText: (o) => `Example: a 450 sq ft pool at 82 °F on an 85 °F, 50% humidity day with a light breeze loses about ${o.inchesPerDay} in a day (${o.gallonsPerDay} gallons).`,
    how: "Losing much more than this suggests a leak — try the bucket test: set a bucket of water on the step, mark both levels and compare after 24 hours with the pump on its normal schedule.",
    assume: "Evaporation = (0.097 + 0.038 × wind) × (water vapor pressure − air vapor pressure); a cover cuts it by about 90%.",
    faq: [["How much water does a pool lose to evaporation?", "About ¼–½ in a day in hot, dry or windy weather — roughly 2–3 in a week."]],
  }),
  mk({
    slug: "pond-pump-size-calculator", title: "Pond & Waterfall Pump Size Calculator",
    desc: "Size a pond or waterfall pump — gallons per hour for turnover and for your waterfall's width — at the head height, plus an air pump size.",
    inputs: [num("gallons", "Pond Volume", 1000, 100000, 10, 10, "gal"), num("turnoverHours", "Turnover Every", 1, 4, 0.5, 0.5, "hr"), num("waterfallWidth", "Waterfall / Spillway Width (0 if none)", 12, 120, 1, 0, "in"), num("gphPerInch", "Flow per Inch of Spillway", 150, 300, 10, 50, "gph"), num("height", "Height From Pond to Waterfall Top", 3, 30, 0.5, 0, "ft"), num("pipeLength", "Pipe Run", 20, 300, 1, 0, "ft")],
    results: [["gphAtHead", "Pump Flow Needed at Head (gph)", "n"], ["turnoverGph", "For Turnover (gph)", "n"], ["waterfallGph", "For the Waterfall (gph)", "n"], ["headFt", "Total Head (ft, approx.)", "n"], ["airPumpLph", "Air Pump (L/hr)", "n"]],
    fn: E.pondPumpSize, ex: { gallons: 1000, turnoverHours: 1, waterfallWidth: 12, gphPerInch: 150, height: 3, pipeLength: 20 },
    exText: (o) => `Example: a 1,000 gallon pond with a 12 in waterfall needs about ${n2(o.gphAtHead)} gph at roughly ${o.headFt} ft of head.`,
    how: "Read the pump's flow at your head height from its performance chart — not the maximum flow on the box. Use 150 gph per inch for a light sheet of water, 200–300 for a heavy, noisy fall.",
    assume: "Turnover = volume ÷ hours; spillway flow = width × gph per inch; head ≈ height + 1 ft per 10 ft of pipe; air pump ≈ 4 L/hr per gallon-hour volume rate.",
    faq: [["What size pump for a 1,000 gallon pond?", "About 1,000–2,000 gph at your head height, more for a wide waterfall."]],
  }),
  mk({
    slug: "pool-heating-cost-calculator", title: "Pool Heating Cost & Time Calculator",
    desc: "Calculate how long it takes to heat a pool and what it costs — with a gas heater, heat pump or electric heater — plus the daily cost to hold the temperature with or without a cover.",
    inputs: [GAL, num("area", "Pool Surface Area", 450, 10000, 1, 10, "sq ft"), num("waterTemp", "Current Water Temperature", 70, 100, 1, 40, "°F"), num("targetTemp", "Target Temperature", 82, 104, 1, 40, "°F"), num("airTemp", "Average Air Temperature", 70, 110, 1, 20, "°F"), dd("heater", "Heater", E.HEATERS), num("heaterBtu", "Heater Rating (input for gas, output otherwise)", 250000, 500000, 5000, 10000, "BTU/hr"), usd("gasPrice", "Gas per Therm", 1.4, 10, 0.01), usd("kwhPrice", "Electricity per kWh", 0.17, 1, 0.005), dd("cover", "Solar / Thermal Cover at Night?", ["No", "Yes"], 1)],
    results: [["hoursToHeat", "Hours to Heat Up", "n"], ["costToHeat", "Cost to Heat Up", "c"], ["dailyCostToMaintain", "Daily Cost to Maintain", "c"], ["monthlyCost", "Monthly Cost to Maintain", "c"]],
    fn: E.poolHeatingCost, ex: { gallons: 15000, area: 450, waterTemp: 70, targetTemp: 82, airTemp: 70, heater: 0, heaterBtu: 250000, gasPrice: 1.4, kwhPrice: 0.17, cover: 1 },
    exText: (o) => `Example: heating a 15,000 gallon pool from 70 to 82 °F with a 250,000 BTU gas heater takes about ${o.hoursToHeat} hours and ${money(o.costToHeat)}.`,
    how: "A cover is the cheapest way to save — most heat leaves through the surface. Heat pumps cost far less to run but heat slowly and lose output when the air drops below about 50 °F.",
    assume: "Heat-up = gallons × 8.34 × ΔT × 1.2 (losses); gas 84% efficient; heat pump COP 5; surface loss ≈ 12 BTU/hr per sq ft per °F of water–air difference, halved with a cover.",
    faq: [["How long does it take to heat a pool?", "About 1 °F per hour for a large gas heater on a typical pool; heat pumps take a day or two."]],
  }),
  mk({
    slug: "pool-fill-time-calculator", title: "Pool Fill Time Calculator (How Long to Fill a Pool)",
    desc: "Calculate how long it takes to fill a pool with one or more garden hoses — hours and days — the water cost, and how many water trucks it would take instead.",
    inputs: [GAL, num("hoseGpm", "Flow per Hose", 9, 20, 0.5, 1, "gpm"), num("hoses", "Hoses", 1, 4, 1, 1), usd("pricePer1000", "Water Price per 1,000 Gal", 10, 50, 0.25)],
    results: [["hours", "Fill Time (hr)", "n"], ["days", "Fill Time (days)", "n"], ["waterCost", "Water Cost", "c"], ["trucks", "Water Trucks (6,000 gal)", "n"]],
    fn: E.poolFillTime, ex: { gallons: 15000, hoseGpm: 9, hoses: 1, pricePer1000: 10 },
    exText: (o) => `Example: filling a 15,000 gallon pool with one hose at 9 gpm takes about ${o.hours} hours (${o.days} days) and ${money(o.waterCost)} of water.`,
    how: "Time how long your hose takes to fill a 5-gallon bucket to get its real flow. Some utilities give a sewer credit for pool fills — ask before you start.",
    assume: "Hours = gallons ÷ (gpm × 60 × hoses).",
    faq: [["How long does it take to fill a pool with a hose?", "About a day per 10,000–15,000 gallons per hose."]],
  }),
  mk({
    slug: "pool-resurfacing-cost-calculator", title: "Pool Resurfacing Cost Calculator",
    desc: "Estimate the cost to resurface or replaster a pool — plaster, quartz, pebble finishes such as PebbleTec or Diamond Brite, fiberglass gelcoat or a new vinyl liner — with waterline tile.",
    inputs: [num("length", "Pool Length", 32, 100, 0.5, 5, "ft"), num("width", "Pool Width", 16, 50, 0.5, 5, "ft"), num("avgDepth", "Average Depth", 5, 10, 0.25, 2, "ft"), dd("finish", "Finish", E.POOL_FINISHES), num("tileFeet", "Waterline Tile to Replace", 0, 300, 1, 0, "ft")],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["interiorSqFt", "Interior Surface (sq ft)", "n"]],
    fn: E.poolResurfacingCost, ex: { length: 32, width: 16, avgDepth: 5, finish: 0, tileFeet: 0 },
    exText: (o) => `Example: replastering a 16 × 32 ft pool (${n2(o.interiorSqFt)} sq ft of surface) costs about ${money(o.totalCost)}.`,
    how: "Plaster lasts about 7–12 years, quartz 10–15 and pebble 15–20. Resurfacing is a good time to replace waterline tile and lights.",
    assume: `Typical prices per sq ft of interior: plaster $6, quartz $8.50, pebble $12, fiberglass refinish $8, vinyl liner $4; tile $25 per ft; drain and acid wash $350. ${COST_NOTE}`,
    faq: [["How much does it cost to resurface a pool?", "About $5,000–8,000 for plaster and $10,000–15,000+ for pebble."]],
  }),
  mk({
    slug: "pool-maintenance-cost-calculator", title: "Pool Maintenance Cost Calculator",
    desc: "Estimate monthly and yearly pool upkeep — DIY or weekly service, chemicals, pump electricity, opening and closing, and a repair fund.",
    inputs: [dd("service", "Cleaning", ["DIY", "Weekly service (chemicals extra)", "Weekly full service"], 1), usd("chemicals", "Chemicals per Month", 50, 500, 1), usd("electricity", "Pump Electricity per Month", 60, 500, 1), num("months", "Months in Use", 12, 12, 1, 1), num("openClose", "Openings + Closings per Year", 0, 2, 1, 0), usd("repairs", "Yearly Repair Fund", 500, 10000, 25)],
    results: [["monthlyCost", "Monthly Cost", "c"], ["yearlyCost", "Yearly Cost", "c"]],
    fn: E.poolMaintenanceCost, ex: { service: 1, chemicals: 50, electricity: 60, months: 12, openClose: 0, repairs: 500 },
    exText: (o) => `Example: weekly service plus chemicals and electricity costs about ${money(o.monthlyCost)} a month — ${money(o.yearlyCost)} a year with a repair fund.`,
    how: "Seasonal pools add opening and closing visits. Budget for equipment: pumps last 8–12 years, heaters 10, salt cells 3–7.",
    assume: `Typical weekly service $150 a month (chemicals extra) or $200 full service; opening or closing $300 each. ${COST_NOTE}`,
    faq: [["How much does pool maintenance cost per year?", "About $1,500–4,000 including service, chemicals and electricity."]],
  }),
  mk({
    slug: "pool-removal-cost-calculator", title: "Pool Removal Cost Calculator",
    desc: "Estimate the cost to remove a pool — above-ground removal, inground partial fill-in or full removal — with fill dirt and permit.",
    inputs: [dd("type", "Removal Type", E.POOL_REMOVALS, 1), num("area", "Pool Surface Area", 512, 3000, 1, 50, "sq ft"), num("depth", "Average Depth", 5, 10, 0.5, 2, "ft"), usd("fillPerYard", "Fill Dirt per Cubic Yard (delivered)", 30, 100, 1), usd("permit", "Permit", 400, 3000, 10)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["fillCost", "Fill Dirt", "c"]],
    fn: E.poolRemovalCost, ex: { type: 1, area: 512, depth: 5, fillPerYard: 30, permit: 400 },
    exText: (o) => `Example: a partial fill-in of a 16 × 32 ft inground pool costs about ${money(o.totalCost)}, including ${money(o.fillCost)} of fill.`,
    how: "Partial removal (break the floor, bury the top) is cheaper, but buyers and building departments may treat the area as non-buildable. Full removal with compaction testing lets you build there later.",
    assume: `Typical prices for a 512 sq ft pool: above-ground $1,500, partial fill-in $6,000 plus fill, full removal $12,000 plus fill. ${COST_NOTE}`,
    faq: [["How much does it cost to fill in a pool?", "About $7,000–12,000 for a partial fill-in; full removal costs $15,000–25,000."]],
  }),
  mk({
    slug: "pond-cost-calculator", title: "Pond Construction Cost Calculator (Backyard & Farm Pond)",
    desc: "Estimate the cost to build a pond — a backyard liner pond with pump and filter, or an excavated farm or stock pond by cubic yards — with spillway and clay.",
    inputs: [dd("type", "Pond Type", E.POND_TYPES), num("area", "Surface Area", 200, 1000000, 10, 10, "sq ft"), num("depth", "Maximum Depth", 3, 20, 0.5, 1, "ft"), usd("backyardPerSqFt", "Backyard Pond per Sq Ft", 20, 100, 0.5), usd("perYard", "Excavation per Cubic Yard (farm pond)", 3, 20, 0.25), usd("spillway", "Spillway / Overflow (farm pond)", 2500, 50000, 50), usd("clay", "Clay or Bentonite Liner (farm pond)", 0, 100000, 100)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["cubicYards", "Excavation (cu yd)", "n"]],
    fn: E.pondCost, ex: { type: 0, area: 200, depth: 3, backyardPerSqFt: 20, perYard: 3, spillway: 2500, clay: 0 },
    exText: (o) => `Example: a 200 sq ft backyard pond with liner, pump and filter costs about ${money(o.totalCost)} installed.`,
    how: "Farm ponds need an engineered dam and spillway and often a permit (and NRCS cost-share may help). An acre is 43,560 sq ft — a 1-acre farm pond averaging 8 ft deep moves roughly 7,700 cubic yards of dirt.",
    assume: `Backyard ponds $10–30 per sq ft installed; farm pond excavation $2–5 per cubic yard (average depth ≈ 60% of the maximum). ${COST_NOTE}`,
    faq: [["How much does it cost to build a 1 acre pond?", "Often $15,000–50,000+ depending on soil, dam and spillway."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-house-garden-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cat.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      // Published straight away (user, 6 Nov 2026: no tool should stay Draft).
      await prisma.tool.create({
        data: { slug: def.slug, status: "published", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all published.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
