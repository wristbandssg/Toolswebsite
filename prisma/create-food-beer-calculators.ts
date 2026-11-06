// One-time (but safe to re-run) batch setup script: creates 15 homebrewing calculators
// (Food & Drink Calculators > Beer & Homebrewing Calculators). Formulas live in
// src/lib/calc-engine-food-beer.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-beer-calculators.ts
// or
//   npm run db:create-food-beer-calculators

import * as E from "../src/lib/calc-engine-food-beer";

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

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100, step: opts.step ?? 0.5 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

function dateField(key: string, label: string, def: string) {
  return { key, label, type: "date", required: true, default: def };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const pct = (key: string, label: string, def: number, max = 100, step = 0.1) => percentField(key, label, { default: def, max, step });
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][] }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt] = s.results[0];
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Homebrew Calculator`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt] },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}
const CAT = "beer-homebrewing-calculators";
const NOTE = "Results are brewing estimates — your equipment, ingredients and measurements decide the real numbers, so take readings and adjust from batch to batch.";

const VOL = dropdown("volumeUnit", "Volume Unit", opts(["US gallons", "Liters"]), 0);
const TEMP = dropdown("tempUnit", "Temperature Unit", opts(["°F", "°C"]), 0);
const DAY0 = 20763; // 6 Nov 2026 as a day number, for the worked example only

const TOOLS: ToolDef[] = [
  mk({
    slug: "beer-gravity-calculator", title: "Beer Gravity Calculator (Hydrometer Temperature Correction)",
    desc: "Correct a hydrometer reading for sample temperature and convert specific gravity to degrees Plato, gravity points and potential ABV.",
    meta: "Beer Gravity Calculator — Hydrometer Temperature Correction & Plato",
    inputs: [num("measuredGravity", "Measured Specific Gravity", 1.05, 1.2, 0.001, 0.98), TEMP, num("sampleTemp", "Sample Temperature", 80, 212, 0.1), num("calibrationTemp", "Hydrometer Calibration Temperature", 60, 100, 0.1)],
    results: [["correctedGravity", "Corrected Specific Gravity", "n"], ["correction", "Correction Added", "n"], ["plato", "Degrees Plato (°P)", "n"], ["gravityPoints", "Gravity Points", "n"], ["potentialAbv", "Potential ABV if It Finishes at 1.010 (%)", "n"]],
    fn: E.beerGravity, ex: { measuredGravity: 1.05, tempUnit: 0, sampleTemp: 80, calibrationTemp: 60 },
    exText: (o) => `Example: a 1.050 reading taken at 80 °F on a 60 °F hydrometer corrects to ${fmt(o.correctedGravity, 4)} (${o.plato} °P).`,
    how: "Enter the reading, the sample temperature and the calibration temperature printed on your hydrometer (usually 60 °F / 15.6 °C, some 68 °F / 20 °C).\n\nWarm samples read low, so the correction is added; cold samples read high.",
    assume: "Uses the standard cubic hydrometer correction for water density versus temperature and the ASBC SG-to-Plato polynomial. Accuracy drops for samples hotter than about 120 °F — cool the sample first.",
    faq: [["Why does temperature change a hydrometer reading?", "Liquid gets less dense as it warms, so the hydrometer sinks deeper and reads lower than the true gravity."], ["How do I convert SG to Plato?", "A quick rule is points ÷ 4 (1.048 ≈ 12 °P); the calculator uses the exact polynomial."]],
  }),
  mk({
    slug: "beer-recipe-calculator", title: "Beer Recipe Calculator (OG, FG, ABV, IBU & SRM)",
    desc: "Design an all-grain or extract beer recipe — up to three fermentables and two hop additions — and get original and final gravity, ABV, bitterness (IBU), colour (SRM/EBC) and BU:GU balance.",
    meta: "Beer Recipe Calculator — OG, FG, ABV, IBU & SRM for Homebrew",
    inputs: [VOL, num("batchSize", "Batch Size (into fermenter)", 5, 1000, 0.1), pct("efficiency", "Brewhouse Efficiency (100 for extract)", 72, 100, 1), pct("attenuation", "Yeast Attenuation", 75, 100, 1),
      num("grain1Lb", "Fermentable 1 Weight (lb)", 10, 500, 0.1), num("grain1Ppg", "Fermentable 1 Potential (PPG)", 37, 46, 1), num("grain1Lovibond", "Fermentable 1 Colour (°L)", 2, 600, 0.5),
      num("grain2Lb", "Fermentable 2 Weight (lb)", 1, 500, 0.1), num("grain2Ppg", "Fermentable 2 Potential (PPG)", 34, 46, 1), num("grain2Lovibond", "Fermentable 2 Colour (°L)", 40, 600, 0.5),
      num("grain3Lb", "Fermentable 3 Weight (lb)", 0, 500, 0.1), num("grain3Ppg", "Fermentable 3 Potential (PPG)", 33, 46, 1), num("grain3Lovibond", "Fermentable 3 Colour (°L)", 0, 600, 0.5),
      num("hop1Oz", "Hop 1 Amount (oz)", 1, 50, 0.1), pct("hop1Alpha", "Hop 1 Alpha Acid", 12, 25, 0.1), num("hop1Minutes", "Hop 1 Boil Time (min)", 60, 120, 1),
      num("hop2Oz", "Hop 2 Amount (oz)", 1, 50, 0.1), pct("hop2Alpha", "Hop 2 Alpha Acid", 5, 25, 0.1), num("hop2Minutes", "Hop 2 Boil Time (min)", 10, 120, 1)],
    results: [["originalGravity", "Original Gravity (OG)", "n"], ["finalGravity", "Final Gravity (FG)", "n"], ["abv", "ABV (%)", "n"], ["ibu", "Bitterness (IBU, Tinseth)", "n"], ["srm", "Colour (SRM)", "n"], ["ebc", "Colour (EBC)", "n"], ["buGuRatio", "BU:GU Ratio", "n"], ["totalGrainLb", "Total Fermentables (lb)", "n"]],
    fn: E.beerRecipe, ex: { volumeUnit: 0, batchSize: 5, efficiency: 72, attenuation: 75, grain1Lb: 10, grain1Ppg: 37, grain1Lovibond: 2, grain2Lb: 1, grain2Ppg: 34, grain2Lovibond: 40, grain3Lb: 0, grain3Ppg: 33, grain3Lovibond: 0, hop1Oz: 1, hop1Alpha: 12, hop1Minutes: 60, hop2Oz: 1, hop2Alpha: 5, hop2Minutes: 10 },
    exText: (o) => `Example: 10 lb of pale malt and 1 lb of crystal 40 in 5 gallons at 72% efficiency gives OG ${o.originalGravity}, FG ${o.finalGravity}, ${o.abv}% ABV, ${fmt(o.ibu, 0)} IBU and ${fmt(o.srm, 1)} SRM — a classic American pale ale.`,
    how: "Enter your batch size and efficiency, then each fermentable's weight, potential (PPG — pale malt ≈ 37, crystal ≈ 34, DME 44, LME 36, table sugar 46) and colour. Add hops with alpha acid and boil time.\n\nUse 100% efficiency for extract-only recipes.",
    assume: "OG points = Σ(lb × PPG × efficiency) ÷ gallons. FG from yeast apparent attenuation. IBU by Tinseth at OG, SRM by Morey. Whirlpool and dry hops are not counted toward IBU.",
    faq: [["What is a good BU:GU ratio?", "About 0.5 is balanced; under 0.4 tastes malty, and 0.8–1.0 is a hop-forward IPA."], ["What efficiency should I use?", "Most home all-grain systems get 65–80%; BIAB is often 65–72%."]],
  }),
  mk({
    slug: "priming-sugar-calculator", title: "Priming Sugar Calculator (Bottle Conditioning)",
    desc: "Find how much corn sugar, table sugar, DME, honey or maple syrup to add at bottling for your target carbonation, from batch volume and beer temperature.",
    meta: "Priming Sugar Calculator — Corn Sugar, Table Sugar & DME for Bottling",
    inputs: [VOL, num("volume", "Beer Volume to Bottle", 5, 1000, 0.1), TEMP, num("beerTemp", "Warmest Temperature the Beer Reached After Fermenting", 68, 100, 0.5), num("targetCo2", "Target Carbonation (volumes of CO₂)", 2.4, 4.5, 0.1), dropdown("sugarType", "Priming Sugar", opts(E.PRIMING_SUGARS.map(([n]) => n)), 0)],
    results: [["sugarGrams", "Priming Sugar (grams)", "n"], ["sugarOunces", "Priming Sugar (ounces)", "n"], ["residualCo2", "CO₂ Already in the Beer (vols)", "n"], ["co2ToAdd", "CO₂ to Add (vols)", "n"], ["gramsPer12ozBottle", "Grams per 12 oz Bottle (if priming each bottle)", "n"], ["dextroseEquivalentGrams", "Corn Sugar Equivalent (g)", "n"]],
    fn: E.primingSugar, ex: { volumeUnit: 0, volume: 5, tempUnit: 0, beerTemp: 68, targetCo2: 2.4, sugarType: 0 },
    exText: (o) => `Example: 5 gallons of ale at 68 °F primed to 2.4 volumes needs ${o.sugarGrams} g (${o.sugarOunces} oz) of corn sugar.`,
    how: "Enter the volume you will bottle (not the fermenter volume before losses) and the warmest temperature the beer reached at the end of fermentation — that sets how much CO₂ is already dissolved.\n\nTypical targets: British ales 1.5–2.0, American ales 2.2–2.7, lagers 2.5–2.8, Belgian and wheat beers 3.0–4.0.",
    assume: "Residual CO₂ = 3.0378 − 0.050062T + 0.00026555T² (°F). Corn sugar grams = 15.195 × gallons × CO₂ to add; other sugars are scaled by their fermentable extract. Above about 3 volumes use heavy Belgian-style bottles.",
    faq: [["How much corn sugar for 5 gallons?", "Usually 3.5–5 oz (100–140 g) for a typical ale, depending on temperature and style."], ["Can I use table sugar instead of corn sugar?", "Yes — use about 9% less by weight; the calculator adjusts it for you."]],
  }),
  mk({
    slug: "ibu-calculator", title: "IBU Calculator (Hop Bitterness, Tinseth)",
    desc: "Calculate the bitterness of your beer in IBUs from up to three hop additions — amount, alpha acid and boil time — using the Tinseth formula at your boil gravity.",
    meta: "IBU Calculator — Hop Bitterness for Homebrew (Tinseth Formula)",
    inputs: [VOL, num("postBoilVolume", "Post-Boil Volume", 5.5, 1000, 0.1), num("boilGravity", "Boil Gravity (use OG)", 1.055, 1.2, 0.001, 1), dropdown("weightUnit", "Hop Weight Unit", opts(["Ounces", "Grams"]), 0),
      num("hop1Oz", "Hop 1 Amount", 1, 2000, 0.1), pct("hop1Alpha", "Hop 1 Alpha Acid", 12, 25, 0.1), num("hop1Minutes", "Hop 1 Boil Time (min)", 60, 120, 1),
      num("hop2Oz", "Hop 2 Amount", 1, 2000, 0.1), pct("hop2Alpha", "Hop 2 Alpha Acid", 6, 25, 0.1), num("hop2Minutes", "Hop 2 Boil Time (min)", 15, 120, 1),
      num("hop3Oz", "Hop 3 Amount", 1, 2000, 0.1), pct("hop3Alpha", "Hop 3 Alpha Acid", 6, 25, 0.1), num("hop3Minutes", "Hop 3 Boil Time (min)", 5, 120, 1)],
    results: [["totalIbu", "Total Bitterness (IBU)", "n"], ["hop1Ibu", "Hop 1 IBU", "n"], ["hop2Ibu", "Hop 2 IBU", "n"], ["hop3Ibu", "Hop 3 IBU", "n"], ["utilization60Min", "Utilisation at 60 min (%)", "n"]],
    fn: E.ibu, ex: { volumeUnit: 0, postBoilVolume: 5.5, boilGravity: 1.055, weightUnit: 0, hop1Oz: 1, hop1Alpha: 12, hop1Minutes: 60, hop2Oz: 1, hop2Alpha: 6, hop2Minutes: 15, hop3Oz: 1, hop3Alpha: 6, hop3Minutes: 5 },
    exText: (o) => `Example: 1 oz of 12% hops at 60 minutes plus 1 oz each of 6% hops at 15 and 5 minutes in 5.5 gallons of 1.055 wort gives about ${fmt(o.totalIbu, 0)} IBU.`,
    how: "Enter the post-boil volume and gravity, then each addition. Set unused additions to 0.\n\nPellet hops give roughly 10% more bitterness than whole-leaf hops; the formula assumes pellets.",
    assume: "Tinseth: utilisation = 1.65 × 0.000125^(G−1) × (1 − e^(−0.04t)) ÷ 4.15; IBU = utilisation × alpha × oz × 7490 ÷ gallons. Flameout, whirlpool and dry-hop additions add little measured IBU and are not modelled.",
    faq: [["How many IBUs is an IPA?", "Usually 40–70 IBU; double IPAs 60–100, lagers 8–25, stouts 25–45."], ["Why does gravity affect IBU?", "Higher-gravity wort holds less dissolved alpha acid, so utilisation drops."]],
  }),
  mk({
    slug: "carbonation-calculator", title: "Keg Carbonation Calculator (Force Carbonation PSI)",
    desc: "Find the CO₂ regulator pressure to force-carbonate a keg to your target volumes at your beer temperature, in PSI and bar.",
    meta: "Carbonation Calculator — Keg PSI for Force Carbonation",
    inputs: [TEMP, num("beerTemp", "Beer Temperature in the Keg", 38, 80, 0.5), num("targetCo2", "Target Carbonation (volumes of CO₂)", 2.5, 4.5, 0.1)],
    results: [["regulatorPsi", "Regulator Pressure (PSI)", "n"], ["regulatorBar", "Regulator Pressure (bar)", "n"], ["co2GramsPerLiter", "CO₂ (grams per liter)", "n"], ["beerTempF", "Beer Temperature (°F)", "n"], ["daysToCarbonate", "Days at Set Pressure (approx.)", "n"]],
    fn: E.carbonation, ex: { tempUnit: 0, beerTemp: 38, targetCo2: 2.5 },
    exText: (o) => `Example: to reach 2.5 volumes at 38 °F set the regulator to about ${o.regulatorPsi} PSI and wait about ${o.daysToCarbonate} days.`,
    how: "Chill the keg first, enter its temperature and your target volumes, then set the regulator to the PSI shown and leave it for a week or so.\n\nTo serve without foaming, balance your beer line length to this pressure.",
    assume: "Uses the standard CO₂ solubility equation for beer (pressure at sea level, gauge PSI). Above about 3,000 ft add about 0.5 PSI per 1,000 ft.",
    faq: [["What PSI should I keg at?", "Around 10–12 PSI at 36–40 °F for most ales and lagers."], ["How do I carbonate faster?", "Burst carbonating at 30–40 PSI for 24 hours works, but it is easy to overshoot — the set-and-forget pressure is safer."]],
  }),
  mk({
    slug: "brix-calculator", title: "Brix Calculator (Brix to SG & Refractometer Correction)",
    desc: "Convert Brix to specific gravity and Plato, and correct a refractometer reading for alcohol to find final gravity and ABV of beer, wine, cider or mead.",
    meta: "Brix Calculator — Brix to Specific Gravity & Refractometer FG",
    inputs: [num("originalBrix", "Original Brix (before fermentation)", 12, 45, 0.1), num("finalBrix", "Current Brix Reading (0 if not fermenting yet)", 6, 45, 0.1), num("correctionFactor", "Wort Correction Factor (1.04 typical; 1.00 for juice)", 1.04, 1.2, 0.01, 1)],
    results: [["originalGravity", "Original Gravity (SG)", "n"], ["finalGravity", "Corrected Final Gravity (SG)", "n"], ["originalPlato", "Original Plato (°P)", "n"], ["abv", "ABV (%)", "n"], ["potentialAbvIfDry", "Potential ABV if Fermented Dry (%)", "n"], ["sugarGramsPerLiter", "Dissolved Solids (g/L, approx.)", "n"]],
    fn: E.brix, ex: { originalBrix: 12, finalBrix: 6, correctionFactor: 1.04 },
    exText: (o) => `Example: a 12 °Bx wort that now reads 6 °Bx is at a true gravity of about ${fmt(o.finalGravity, 3)}, so the beer is about ${o.abv}% ABV.`,
    how: "Enter the original Brix and, once fermentation has started, the current reading. Alcohol bends the refractometer, so the second reading must be corrected — that is what this calculator does.\n\nUse a correction factor of 1.00 for fruit juice and must; most beer wort is 1.02–1.06.",
    assume: "SG = 1 + B ÷ (258.6 − (B ÷ 258.2) × 227.1). Final gravity uses Sean Terrill's cubic correction. Check against a hydrometer once to confirm your factor.",
    faq: [["How do I convert Brix to SG?", "Roughly SG = 1 + Brix × 0.004 (12 °Bx ≈ 1.048); the exact formula is used here."], ["Why does my refractometer read high after fermentation?", "Alcohol has a higher refractive index than water, so uncorrected readings overstate the sugar left."]],
  }),
  mk({
    slug: "brewing-water-calculator", title: "Brewing Water Calculator (Salt Additions & Water Profile)",
    desc: "Add gypsum, calcium chloride, Epsom salt, baking soda and table salt to your brewing water and see the resulting calcium, magnesium, sodium, sulfate, chloride and bicarbonate in ppm, with the sulfate-to-chloride ratio.",
    meta: "Brewing Water Calculator — Salt Additions, Ion ppm & SO4:Cl Ratio",
    inputs: [VOL, num("waterVolume", "Total Water Volume Treated", 8, 2000, 0.1), num("gypsum", "Gypsum (CaSO₄) — grams", 4, 200, 0.1), num("calciumChloride", "Calcium Chloride (CaCl₂) — grams", 2, 200, 0.1), num("epsom", "Epsom Salt (MgSO₄) — grams", 0, 200, 0.1), num("bakingSoda", "Baking Soda (NaHCO₃) — grams", 0, 200, 0.1), num("tableSalt", "Table Salt (NaCl) — grams", 0, 200, 0.1),
      num("startCa", "Starting Calcium (ppm)", 10, 500, 1), num("startMg", "Starting Magnesium (ppm)", 3, 300, 1), num("startNa", "Starting Sodium (ppm)", 10, 500, 1), num("startSo4", "Starting Sulfate (ppm)", 15, 1000, 1), num("startCl", "Starting Chloride (ppm)", 15, 1000, 1), num("startHco3", "Starting Bicarbonate (ppm)", 50, 1000, 1)],
    results: [["calcium", "Calcium (ppm)", "n"], ["magnesium", "Magnesium (ppm)", "n"], ["sodium", "Sodium (ppm)", "n"], ["sulfate", "Sulfate (ppm)", "n"], ["chloride", "Chloride (ppm)", "n"], ["bicarbonate", "Bicarbonate (ppm)", "n"], ["sulfateToChlorideRatio", "Sulfate : Chloride Ratio", "n"]],
    fn: E.brewingWater, ex: { volumeUnit: 0, waterVolume: 8, gypsum: 4, calciumChloride: 2, epsom: 0, bakingSoda: 0, tableSalt: 0, startCa: 10, startMg: 3, startNa: 10, startSo4: 15, startCl: 15, startHco3: 50 },
    exText: (o) => `Example: 4 g gypsum and 2 g calcium chloride in 8 gallons of soft water gives ${fmt(o.calcium, 0)} ppm calcium, ${fmt(o.sulfate, 0)} ppm sulfate and ${fmt(o.chloride, 0)} ppm chloride — a ${o.sulfateToChlorideRatio}:1 ratio that favours hops.`,
    how: "Enter your water report (or 0s for RO/distilled water), the total water you are treating, and the grams of each salt.\n\nAim for 50–150 ppm calcium. A sulfate:chloride ratio of 2–3 or more accentuates hops; 0.5–0.8 suits malty beers and NEIPAs.",
    assume: "Ion contributions per gram per US gallon: gypsum Ca 61.5 / SO₄ 147.4; calcium chloride dihydrate Ca 72 / Cl 127.4; Epsom Mg 26.1 / SO₄ 103; baking soda Na 72.3 / HCO₃ 191.9; salt Na 103.9 / Cl 160.3. Mash pH is not predicted.",
    faq: [["What does gypsum do in beer?", "It adds calcium and sulfate, which sharpen hop bitterness and help the mash."], ["How much calcium chloride should I add?", "Often 1–2 g per 5 gallons for a softer, fuller malt character."]],
  }),
  mk({
    slug: "mash-water-calculator", title: "Mash Water Calculator (Strike & Sparge Volumes)",
    desc: "Work out total brewing water, strike water and sparge water for an all-grain batch from grain weight, mash thickness, boil-off, grain absorption and losses.",
    meta: "Mash Water Calculator — Strike, Sparge & Total Water for All-Grain",
    inputs: [dropdown("unitSystem", "Units", opts(["US (gallons, lb)", "Metric (liters, kg)"]), 0), num("batchSize", "Batch Size into Fermenter", 5.5, 2000, 0.1), num("grainWeight", "Grain Bill Weight", 11, 1000, 0.1), num("mashThickness", "Mash Thickness (quarts per lb)", 1.5, 4, 0.05, 0.75), num("boilMinutes", "Boil Time (minutes)", 60, 180, 5), num("boilOffRate", "Boil-Off Rate (per hour)", 1, 50, 0.05), num("absorption", "Grain Absorption (gal per lb)", 0.125, 0.3, 0.005), num("trubLoss", "Kettle Trub / Chiller Loss", 0.5, 50, 0.05), num("deadspace", "Mash Tun Deadspace", 0.25, 50, 0.05)],
    results: [["totalWater", "Total Water Needed", "n"], ["strikeWater", "Strike (Mash) Water", "n"], ["spargeWater", "Sparge Water", "n"], ["preBoilVolume", "Pre-Boil Volume", "n"], ["grainAbsorption", "Lost to Grain Absorption", "n"], ["boilOff", "Boil-Off", "n"], ["lossesTrubDeadspace", "Trub + Deadspace Losses", "n"], ["mashVolume", "Mash Volume (check tun capacity)", "n"]],
    fn: E.mashWater, ex: { unitSystem: 0, batchSize: 5.5, grainWeight: 11, mashThickness: 1.5, boilMinutes: 60, boilOffRate: 1, absorption: 0.125, trubLoss: 0.5, deadspace: 0.25 },
    exText: (o) => `Example: 11 lb of grain for a 5.5-gallon batch at 1.5 qt/lb needs ${o.totalWater} gallons in total — ${o.strikeWater} gallons of strike water and ${o.spargeWater} gallons of sparge water.`,
    how: "Enter your batch size, grain bill and system losses. Results are in the same units you chose (gallons or liters).\n\nFor BIAB (no sparge), set mash thickness high enough that strike water equals total water.",
    assume: "Strike = grain lb × qt/lb ÷ 4. Total = batch + boil-off + trub + grain absorption + deadspace. Sparge = total − strike. Grain displaces about 0.08 gal per lb in the mash tun.",
    faq: [["How much water does grain absorb?", "About 0.1–0.125 gallons per pound (0.8–1.0 L/kg) after draining; less if you squeeze a BIAB bag."], ["What mash thickness should I use?", "1.25–1.5 qt/lb is typical; thinner mashes are fine and convert well."]],
  }),
  mk({
    slug: "strike-water-calculator", title: "Strike Water Temperature Calculator",
    desc: "Find the temperature to heat your strike water to so the mash settles at your target temperature, from grain temperature, grain weight and mash thickness.",
    meta: "Strike Water Calculator — Strike Water Temperature & Volume",
    inputs: [TEMP, num("targetMashTemp", "Target Mash Temperature", 152, 212, 0.5), num("grainTemp", "Grain Temperature", 68, 120, 0.5), dropdown("weightUnit", "Grain Weight Unit", opts(["Pounds", "Kilograms"]), 0), num("grainWeight", "Grain Weight", 11, 1000, 0.1), num("mashThickness", "Mash Thickness (quarts per lb)", 1.5, 4, 0.05, 0.75)],
    results: [["strikeTemp", "Strike Water Temperature", "n"], ["strikeGallons", "Strike Water (gallons)", "n"], ["strikeLiters", "Strike Water (liters)", "n"], ["strikeQuarts", "Strike Water (quarts)", "n"], ["riseAboveMash", "Degrees Above Mash Target", "n"]],
    fn: E.strikeWater, ex: { tempUnit: 0, targetMashTemp: 152, grainTemp: 68, weightUnit: 0, grainWeight: 11, mashThickness: 1.5 },
    exText: (o) => `Example: to mash 11 lb of 68 °F grain at 152 °F with 1.5 qt/lb, heat ${o.strikeGallons} gallons of water to ${o.strikeTemp} °F.`,
    how: "Enter your target mash temperature, the grain's temperature (usually room temperature) and your water-to-grain ratio.\n\nPreheat the mash tun or add 2–4 °F for an unheated cooler.",
    assume: "Palmer's infusion equation: Tw = (0.2 ÷ r)(T2 − T1) + T2, with r in quarts per pound and 0.2 the grain's relative heat capacity. Equipment heat loss is not included.",
    faq: [["What temperature should strike water be?", "Usually 10–14 °F above the mash target — about 162–166 °F for a 152 °F mash."], ["Does mash temperature matter?", "Yes — 148–150 °F gives a drier beer, 154–158 °F a fuller-bodied one."]],
  }),
  mk({
    slug: "brewing-efficiency-calculator", title: "Brewing Efficiency Calculator (Mash & Brewhouse)",
    desc: "Calculate your mash or brewhouse efficiency from the gravity and volume you collected and the potential of your grain bill.",
    meta: "Brewing Efficiency Calculator — Mash & Brewhouse Efficiency",
    inputs: [VOL, num("volume", "Volume Collected (pre-boil for mash, fermenter for brewhouse)", 6.5, 1000, 0.1), num("measuredGravity", "Measured Gravity of That Volume", 1.046, 1.2, 0.001, 1),
      num("grain1Lb", "Grain 1 Weight (lb)", 10, 500, 0.1), num("grain1Ppg", "Grain 1 Potential (PPG)", 37, 46, 1), num("grain2Lb", "Grain 2 Weight (lb)", 1, 500, 0.1), num("grain2Ppg", "Grain 2 Potential (PPG)", 34, 46, 1), num("grain3Lb", "Grain 3 Weight (lb)", 0, 500, 0.1), num("grain3Ppg", "Grain 3 Potential (PPG)", 33, 46, 1)],
    results: [["efficiency", "Efficiency (%)", "n"], ["measuredPoints", "Gravity Points Collected", "n"], ["potentialPoints", "Maximum Potential Points", "n"], ["gravityAt75", "Gravity You Would Get at 75%", "n"]],
    fn: E.brewingEfficiency, ex: { volumeUnit: 0, volume: 6.5, measuredGravity: 1.046, grain1Lb: 10, grain1Ppg: 37, grain2Lb: 1, grain2Ppg: 34, grain3Lb: 0, grain3Ppg: 33 },
    exText: (o) => `Example: collecting 6.5 gallons at 1.046 from 11 lb of grain is ${o.efficiency}% mash efficiency.`,
    how: "For mash efficiency, use the pre-boil volume and gravity. For brewhouse efficiency, use the volume and gravity that went into the fermenter.\n\nCorrect your gravity reading for temperature first.",
    assume: "Efficiency = (gravity points × volume) ÷ Σ(lb × PPG). Typical PPG: 2-row 37, pilsner 37, Maris Otter 38, Munich 35, crystal 33–34, wheat 38, flaked oats 33.",
    faq: [["What is a good brewing efficiency?", "70–80% mash efficiency is common at home; over 85% is excellent."], ["How can I raise efficiency?", "Finer crush, a proper mash pH, a longer mash and a slower or extra sparge all help."]],
  }),
  mk({
    slug: "pre-boil-gravity-calculator", title: "Pre-Boil Gravity Calculator (and Brewing Dilution)",
    desc: "Find the pre-boil gravity you need to hit your original gravity, predict OG from a pre-boil reading, and work out the water to add (dilution) or DME to add when you miss your target.",
    meta: "Pre-Boil Gravity Calculator — Predict OG & Dilute Wort to Target",
    inputs: [VOL, num("preBoilVolume", "Pre-Boil Volume", 6.5, 1000, 0.1), num("postBoilVolume", "Post-Boil Volume", 5.5, 1000, 0.1), num("targetOg", "Target Original Gravity", 1.05, 1.2, 0.001, 1), num("currentGravity", "Current (Pre-Boil) Gravity Reading", 1.044, 1.2, 0.001, 1)],
    results: [["preBoilGravityNeeded", "Pre-Boil Gravity Needed", "n"], ["predictedOg", "Predicted OG From Your Reading", "n"], ["waterToAdd", "Water to Add After the Boil to Dilute to Target (same units)", "n"], ["dmeToAddLb", "DME to Add if Low (lb)", "n"], ["gravityPointsTarget", "Target Gravity Points", "n"]],
    fn: E.preBoilGravity, ex: { volumeUnit: 0, preBoilVolume: 6.5, postBoilVolume: 5.5, targetOg: 1.05, currentGravity: 1.044 },
    exText: (o) => `Example: to finish 5.5 gallons at 1.050 you need ${fmt(o.preBoilGravityNeeded, 3)} in 6.5 gallons pre-boil. A 1.044 reading predicts an OG of ${fmt(o.predictedOg, 3)}.`,
    how: "Enter your pre- and post-boil volumes and target OG. Add your pre-boil reading to predict where you will land.\n\nIf you will overshoot, add the water shown (or top up the fermenter); if you are low, boil longer or add the DME shown.",
    assume: "Gravity points × volume stay constant through the boil: pre-boil points = target points × post volume ÷ pre volume. Dilution water = current points × volume ÷ target points − volume. DME adds about 44 points per lb per gallon.",
    faq: [["How do I lower my original gravity?", "Add water: the calculator shows how much to reach the target."], ["How much does boiling raise gravity?", "It concentrates sugar in proportion to volume lost — 6.5 to 5.5 gallons raises 44 points to 52."]],
  }),
  mk({
    slug: "beer-attenuation-calculator", title: "Beer Attenuation Calculator (Apparent & Real)",
    desc: "Calculate apparent and real attenuation, ABV and calories per 12 oz from original and final gravity, to check how well your yeast fermented.",
    meta: "Beer Attenuation Calculator — Apparent & Real Attenuation",
    inputs: [num("originalGravity", "Original Gravity", 1.05, 1.2, 0.001, 1), num("finalGravity", "Final Gravity", 1.01, 1.2, 0.001, 0.98)],
    results: [["apparentAttenuation", "Apparent Attenuation (%)", "n"], ["realAttenuation", "Real Attenuation (%)", "n"], ["abv", "ABV (%)", "n"], ["abvAlternate", "ABV, Alternate Formula (%)", "n"], ["realExtractPlato", "Real Extract (°P)", "n"], ["caloriesPer12oz", "Calories per 12 oz", "n"]],
    fn: E.attenuation, ex: { originalGravity: 1.05, finalGravity: 1.01 },
    exText: (o) => `Example: OG 1.050 to FG 1.010 is ${o.apparentAttenuation}% apparent attenuation (${o.realAttenuation}% real), ${o.abv}% ABV and about ${o.caloriesPer12oz} calories per 12 oz.`,
    how: "Enter the gravities before and after fermentation. Compare apparent attenuation with your yeast's rated range — if it is well below, fermentation may be stuck.",
    assume: "Apparent attenuation = (OG − FG) ÷ (OG − 1). Real extract = 0.1808 × OE + 0.8192 × AE (°P). Calories by the standard ASBC-style formula.",
    faq: [["What is a normal attenuation?", "Most ale yeasts attenuate 70–80%; Belgian and saison strains can exceed 85%."], ["Why is real attenuation lower than apparent?", "Alcohol is lighter than water, so the hydrometer makes the beer look drier than it really is."]],
  }),
  mk({
    slug: "beer-colour-calculator", title: "Beer Colour Calculator (SRM & EBC)",
    desc: "Estimate your beer's colour in SRM and EBC from the weight and colour of up to four malts, using the Morey equation.",
    meta: "Beer Colour Calculator — SRM & EBC From Your Grain Bill",
    inputs: [VOL, num("batchSize", "Batch Size", 5, 1000, 0.1), dropdown("weightUnit", "Malt Weight Unit", opts(["Pounds", "Kilograms"]), 0), dropdown("colorUnit", "Malt Colour Unit", opts(["Lovibond (°L)", "EBC"]), 0),
      num("grain1Weight", "Malt 1 Weight", 9, 500, 0.1), num("grain1Color", "Malt 1 Colour", 2, 1500, 0.5), num("grain2Weight", "Malt 2 Weight", 1, 500, 0.1), num("grain2Color", "Malt 2 Colour", 60, 1500, 0.5), num("grain3Weight", "Malt 3 Weight", 0.5, 500, 0.1), num("grain3Color", "Malt 3 Colour", 350, 1500, 0.5), num("grain4Weight", "Malt 4 Weight", 0, 500, 0.1), num("grain4Color", "Malt 4 Colour", 0, 1500, 0.5)],
    results: [["srm", "Colour (SRM)", "n"], ["ebc", "Colour (EBC)", "n"], ["mcu", "Malt Colour Units (MCU)", "n"], ["colourBand", "Colour Band (1 straw … 10 black)", "n"]],
    fn: E.beerColour, ex: { volumeUnit: 0, batchSize: 5, weightUnit: 0, colorUnit: 0, grain1Weight: 9, grain1Color: 2, grain2Weight: 1, grain2Color: 60, grain3Weight: 0.5, grain3Color: 350, grain4Weight: 0, grain4Color: 0 },
    exText: (o) => `Example: 9 lb pale, 1 lb crystal 60 and 0.5 lb chocolate malt in 5 gallons comes out around ${fmt(o.srm, 0)} SRM (${fmt(o.ebc, 0)} EBC) — a brown ale colour.`,
    how: "Enter each malt's weight and colour from the supplier sheet. EBC malt ratings are converted to Lovibond automatically.\n\nBands: 1 straw (≤3 SRM), 2 yellow, 3 gold, 4 amber, 5 deep amber, 6 copper, 7 brown, 8 dark brown, 9 very dark, 10 black (35+).",
    assume: "Morey: SRM = 1.4922 × MCU^0.6859, MCU = Σ(lb × °L) ÷ gallons. EBC = SRM × 1.97. Boil length, kettle caramelisation and dilution can shift real colour by a few SRM.",
    faq: [["What is SRM?", "Standard Reference Method — a light-absorbance colour scale; a pilsner is 2–4, a stout 30–40+."], ["How do I convert SRM to EBC?", "Multiply SRM by 1.97."]],
  }),
  mk({
    slug: "bottling-calculator", title: "Beer Bottling Calculator (How Many Bottles)",
    desc: "Find how many bottles a batch of beer, cider or wine will fill — 12 oz, 16 oz, 22 oz bombers, 330/500/750 mL or growlers — after trub and transfer losses, with caps to buy.",
    meta: "Bottling Calculator — How Many Bottles From a Homebrew Batch",
    inputs: [VOL, num("batchSize", "Batch Size in the Fermenter", 5, 1000, 0.1), pct("lossPercent", "Trub & Transfer Loss", 5, 50, 1), dropdown("bottleSize", "Bottle Size", opts(E.BOTTLES.map(([n]) => n)), 0)],
    results: [["bottles", "Bottles Filled", "n"], ["sixPacks", "Six-Packs", "n"], ["cases24", "24-Bottle Cases", "n"], ["usableOunces", "Usable Beer (fl oz)", "n"], ["capsToBuy", "Caps to Buy (+10%)", "n"], ["leftoverOunces", "Leftover (fl oz)", "n"]],
    fn: E.bottling, ex: { volumeUnit: 0, batchSize: 5, lossPercent: 5, bottleSize: 0 },
    exText: (o) => `Example: a 5-gallon batch with 5% loss fills ${o.bottles} twelve-ounce bottles — about ${o.cases24} cases.`,
    how: "Enter the volume in the fermenter and an allowance for the yeast cake and tubing. A 5-gallon batch usually gives about 48–50 twelve-ounce bottles.",
    assume: "Bottles = usable fluid ounces ÷ bottle size, rounded down. Leave about an inch of headspace — already allowed for in nominal bottle sizes.",
    faq: [["How many bottles do I need for 5 gallons?", "About 50 twelve-ounce bottles or 25–27 twenty-two-ounce bombers."], ["How many bottles for 1 gallon?", "About 10 twelve-ounce bottles."]],
  }),
  mk({
    slug: "beer-expiration-date-calculator", title: "Beer Expiration Date Calculator (Best-By & Freshness)",
    desc: "Estimate when a beer is past its best from its packaging date, style, container and storage — with the best-by date and days of freshness left.",
    meta: "Beer Expiration Date Calculator — How Long Does Beer Last?",
    inputs: [dateField("packagedDate", "Canned / Bottled On (date on the can or bottle)", "today-30"), dateField("today", "Today's Date", "today"), dropdown("style", "Beer Style", opts(E.SHELF.map(([n]) => n)), 1), dropdown("storage", "How It Is Stored", opts(["Refrigerated (35–45 °F)", "Room temperature (65–75 °F)", "Warm (80 °F +)"]), 0), dropdown("container", "Container", opts(["Can or bottle (sealed)", "Crowler (sealed)", "Growler (filled at the bar)"]), 0)],
    results: [["bestByDate", "Best By (estimated)", "d"], ["daysRemaining", "Days of Peak Freshness Left", "n"], ["freshnessDays", "Total Freshness Window (days)", "n"], ["ageDays", "Beer Age Today (days)", "n"]],
    fn: E.beerExpiration, ex: { packagedDate: DAY0 - 30, today: DAY0, style: 1, storage: 0, container: 0 },
    exText: (o) => `Example: an IPA canned 30 days ago and kept cold has about ${o.daysRemaining} days of peak freshness left (a ${o.freshnessDays}-day window).`,
    how: "Find the packaging date on the can bottom or bottle neck (some brewers print a best-by date instead — subtract their window). Choose the style and how it has been stored.\n\nBeer does not become unsafe after this date; hop aroma fades and stale, papery flavours appear.",
    assume: "Typical cold-storage windows: hazy IPA 60 days, IPA 90, lagers and amber beers 180, stouts 270, sours 365, high-ABV beers 2 years. Room temperature roughly halves the window, warm storage cuts it to a third; growlers last only a few days once opened and about a week sealed.",
    faq: [["Does beer expire?", "Sealed beer is safe almost indefinitely, but most beers taste best within 3–6 months."], ["How long does an opened growler last?", "About 24–36 hours before it goes flat."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-food-drink-category.ts --apply" first.`);

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
