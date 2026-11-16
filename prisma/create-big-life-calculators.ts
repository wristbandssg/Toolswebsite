// One-time (but safe to re-run) batch setup script: 8 lifestyle tools from the big generic
// keyword check (16 Nov 2026 — Claude outputs/Big_Generic_Keyword_Check.md): DRI, net carbs,
// glycemic load, unit price, face shape, weighted blanket, quilt backing and circle skirt.
// Formulas: src/lib/calc-engine-big-life.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-big-life-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-big-life";
import { mk, num, dd, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.bigLifeCustomCalculators;

const DIET: ToolDef[] = [
  mk({
    slug: "dri-calculator", title: "DRI Calculator (Daily Vitamins, Minerals & Nutrients by Age)",
    meta: "DRI Calculator — Dietary Reference Intakes by Age & Sex",
    desc: "See your Dietary Reference Intakes (DRI): the RDA or adequate intake of protein, fibre, water, calcium, iron, vitamin D, C, A, B12, folate, magnesium, zinc and potassium for your age, sex, pregnancy or breastfeeding.",
    inputs: [num("age", "Age", 30, 14, 120, 1), dd("sex", "Sex", E.DRI_SEX, 1), dd("stage", "Pregnancy / Breastfeeding (women)", E.DRI_STAGE, 0), num("weight", "Weight (optional, for protein)", 0, 0, 1000, 0.1), dd("wunit", "Weight Unit", ["kg", "lb"], 1), dd("smoker", "Smoker", ["No", "Yes"], 0)],
    results: [["protein", "Protein", "t"], ["fiber", "Fibre", "t"], ["water", "Water", "t"], ["calcium", "Calcium", "t"], ["iron", "Iron", "t"], ["vitd", "Vitamin D", "t"], ["vitc", "Vitamin C", "t"], ["vita", "Vitamin A", "t"], ["b12", "Vitamin B12", "t"], ["folate", "Folate", "t"], ["magnesium", "Magnesium", "t"], ["zinc", "Zinc", "t"], ["potassium", "Potassium", "t"], ["sodium", "Sodium", "t"]],
    fn: C["dri-calculator"], ex: { age: 30, sex: 1, stage: 0, weight: 0, wunit: 1, smoker: 0 },
    exText: (o) => `Example: a 30-year-old woman needs about ${String(o.protein).replace(" a day", "")} of protein, ${o.iron} of iron, ${o.calcium} of calcium and ${o.fiber} of fibre a day.`,
    how: "Dietary Reference Intakes are set by the US National Academies. The RDA covers the needs of 97–98% of healthy people; where there isn't enough evidence for an RDA, an Adequate Intake (AI) is used (fibre, water, potassium).\n\nEnter your weight to base protein on 0.8 g per kg (1.1 g/kg when pregnant or breastfeeding).",
    assume: "National Academies DRI tables (potassium and sodium 2019 update) for ages 14 and up. Needs differ with illness, medicines and very high activity. This isn't medical advice.",
    faq: [["What does DRI stand for?", "Dietary Reference Intake — the set of RDA, AI and upper-limit values for each nutrient."], ["How much iron does a woman need?", "18 mg a day aged 19–50, 8 mg after 50, 27 mg when pregnant."], ["How much vitamin D do I need?", "600 IU a day, 800 IU over 70."]],
  }),
  mk({
    slug: "net-carbs-calculator", title: "Net Carbs Calculator (Total Carbs − Fiber − Sugar Alcohols)",
    meta: "Net Carbs Calculator — Keto Net Carbs from a Food Label",
    desc: "Work out net carbs from a nutrition label: total carbohydrates minus fibre and sugar alcohols (all of erythritol, half of maltitol and others), per serving and for several servings, with a keto check.",
    inputs: [num("carbs", "Total Carbohydrates (g)", 25, 0, 1000, 0.1), num("fiber", "Dietary Fibre (g)", 8, 0, 500, 0.1), num("sa", "Sugar Alcohols (g)", 0, 0, 500, 0.1), dd("saType", "Sugar Alcohol Type", E.NC_SA, 0), dd("region", "Label Type", E.NC_REGION, 0), num("servings", "Servings", 1, 0.1, 100, 0.1)],
    results: [["net", "Net Carbs", "t"], ["total", "For All Servings", "t"], ["working", "Working", "t"], ["calories", "Calories from Net Carbs", "t"], ["keto", "Keto Check", "t"]],
    fn: C["net-carbs-calculator"], ex: { carbs: 25, fiber: 8, sa: 0, saType: 0, region: 0, servings: 1 },
    exText: (o) => `Example: a food with 25 g of carbs and 8 g of fibre has ${o.net}.`,
    how: "Net carbs = total carbohydrates − fibre − sugar alcohols. Erythritol and allulose barely raise blood sugar, so all of them are subtracted; maltitol, sorbitol and xylitol are partly absorbed, so only half is subtracted.\n\nIn the UK, EU and Australia the label's carbohydrate figure already excludes fibre, so don't subtract it again.",
    assume: "Net carbs aren't an official FDA term; individual blood-sugar responses vary.",
    faq: [["How do you calculate net carbs?", "Total carbs − fibre − sugar alcohols. 20 g − 12 g = 8 g net."], ["Should I subtract all sugar alcohols?", "Erythritol, yes; maltitol and most others, about half."], ["How many net carbs on keto?", "Usually 20–50 g a day."]],
  }),
  mk({
    slug: "glycemic-load-calculator", title: "Glycemic Load Calculator (GL from GI & Carbs)",
    meta: "Glycemic Load Calculator — GL = GI × Carbs ÷ 100",
    desc: "Calculate the glycemic load (GL) of a food or meal from its glycemic index and available carbs, or pick from 30 common foods, and see whether it's low, medium or high GL and GI.",
    inputs: [dd("food", "Food", E.GL_FOOD_LABELS, 3), num("gi", "Glycemic Index (if entering your own)", 55, 0, 120, 1), num("carbs", "Available Carbs per Serving, g (0 = typical serving)", 0, 0, 500, 0.1), num("servings", "Servings", 1, 0.1, 20, 0.1)],
    results: [["gl", "Glycemic Load", "t"], ["band", "Rating", "t"], ["gi", "Glycemic Index", "t"], ["carbs", "Carbs Counted", "t"], ["working", "Working", "t"], ["day", "Daily Total", "t"]],
    fn: C["glycemic-load-calculator"], ex: { food: 3, gi: 55, carbs: 0, servings: 1 },
    exText: (o) => `Example: a 150 g serving of boiled white rice (GI 73, 43 g carbs) has a glycemic load of ${o.gl} — ${o.band}.`,
    how: "Glycemic load = glycemic index × grams of available carbohydrate (carbs − fibre) ÷ 100. GI tells you how fast a carb raises blood sugar; GL also counts how much you eat.\n\nWatermelon has a high GI (76) but little carbohydrate per serving, so its GL is only about 5.",
    assume: "GI values are typical published averages (University of Sydney GI database); they vary with ripeness, cooking and what you eat with them.",
    faq: [["What is a low glycemic load?", "10 or less per serving; 20 or more is high."], ["What's the difference between GI and GL?", "GI ranks carbs by speed; GL multiplies GI by the amount of carbs."], ["What is a good daily GL?", "Under about 100."]],
  }),
];

const SHOP_UNIT: ToolDef[] = [
  mk({
    slug: "unit-price-calculator", title: "Unit Price Calculator (Compare Price per Ounce, Pound, Liter or Item)",
    meta: "Unit Price Calculator — Which Size Is the Better Deal?",
    desc: "Compare up to four products by unit price — per ounce, pound, gram, fluid ounce, liter or item — to find the cheapest size, with the percent you save. Units can be mixed (e.g. 16 oz vs 1 kg).",
    inputs: [num("p1", "Item 1 Price ($)", 3.49, 0, 1e6, 0.01, "$"), num("q1", "Item 1 Quantity", 16, 0, 1e6, 0.01), dd("u1", "Item 1 Unit", E.UP_UNITS, 0), num("p2", "Item 2 Price ($)", 5.99, 0, 1e6, 0.01, "$"), num("q2", "Item 2 Quantity", 32, 0, 1e6, 0.01), dd("u2", "Item 2 Unit", E.UP_UNITS, 0), num("p3", "Item 3 Price ($, optional)", 0, 0, 1e6, 0.01, "$"), num("q3", "Item 3 Quantity", 0, 0, 1e6, 0.01), dd("u3", "Item 3 Unit", E.UP_UNITS, 0), num("p4", "Item 4 Price ($, optional)", 0, 0, 1e6, 0.01, "$"), num("q4", "Item 4 Quantity", 0, 0, 1e6, 0.01), dd("u4", "Item 4 Unit", E.UP_UNITS, 0)],
    results: [["best", "Best Value", "t"], ["list", "Unit Prices", "t"], ["save", "Saving", "t"], ["unit", "Compared", "t"]],
    fn: C["unit-price-calculator"], ex: { p1: 3.49, q1: 16, u1: 0, p2: 5.99, q2: 32, u2: 0, p3: 0, q3: 0, u3: 0, p4: 0, q4: 0, u4: 0 },
    exText: (o) => `Example: 16 oz for $3.49 vs 32 oz for $5.99 — the best value is ${o.best}, ${o.save}.`,
    how: "Unit price = price ÷ quantity. Everything is converted to one unit first (ounces for weight, fluid ounces for volume, or per item), so a 500 g pack can be compared with a 1 lb pack.\n\nBigger isn't always cheaper — sale prices on small sizes often beat the bulk size.",
    assume: "1 lb = 16 oz, 1 oz = 28.35 g, 1 fl oz = 29.57 mL, 1 gallon = 128 fl oz.",
    faq: [["How do you calculate unit price?", "Divide the price by the quantity: $4.50 ÷ 18 oz = $0.25 per oz."], ["Is the bigger size always cheaper?", "No — check the unit price, especially when the smaller size is on sale."], ["Can I compare grams and ounces?", "Yes, the calculator converts both to ounces."]],
  }),
];

const SHOP_CLOTH: ToolDef[] = [
  mk({
    slug: "face-shape-calculator", title: "Face Shape Calculator (What Is My Face Shape?)",
    meta: "Face Shape Calculator — Oval, Round, Square, Heart & More",
    desc: "Find your face shape — oval, round, square, oblong, heart, diamond or triangle — from four measurements (forehead, cheekbones, jawline and face length), with the glasses frames and hairstyles that suit it.",
    inputs: [dd("unit", "Units", E.FS_UNITS, 0), num("forehead", "Forehead Width", 5.2, 0, 100, 0.1), num("cheek", "Cheekbone Width", 5.5, 0, 100, 0.1), num("jaw", "Jawline Width", 4.9, 0, 100, 0.1), num("length", "Face Length (hairline to chin)", 7.5, 0, 100, 0.1)],
    results: [["shape", "Face Shape", "t"], ["ratios", "Your Proportions", "t"], ["glasses", "Glasses", "t"], ["hair", "Hairstyles", "t"], ["note", "Note", "t"]],
    fn: C["face-shape-calculator"], ex: { unit: 0, forehead: 5.2, cheek: 5.5, jaw: 4.9, length: 7.5 },
    exText: (o) => `Example: forehead 5.2 in, cheekbones 5.5 in, jaw 4.9 in and length 7.5 in is an ${String(o.shape).toLowerCase()} face.`,
    how: "Measure with a soft tape: forehead across the widest part, cheekbones across the top of the cheeks, jawline from the chin to below the ear and doubled, and length from the hairline to the chin.\n\nOval: longer than wide, gently curved. Round: length ≈ width. Square: wide, strong jaw. Oblong: long with similar widths. Heart: wide forehead, narrow chin. Diamond: widest at the cheekbones. Triangle: jaw wider than forehead.",
    assume: "Ratios-based rules of thumb used by stylists and opticians; many faces are a mix of two shapes.",
    faq: [["How do I measure my face shape?", "Measure forehead, cheekbones, jaw and length, then compare which is widest and how long your face is."], ["What is the most common face shape?", "Oval."], ["What glasses suit a round face?", "Rectangular or angular frames."]],
  }),
];

const SHOP_LIFE: ToolDef[] = [
  mk({
    slug: "weighted-blanket-calculator", title: "Weighted Blanket Calculator (What Weight Should I Get?)",
    meta: "Weighted Blanket Weight Calculator — 10% of Body Weight",
    desc: "Find the right weighted blanket weight for an adult or child from body weight (about 10%), the nearest standard size (5–30 lb) and the blanket dimensions for your bed.",
    inputs: [num("weight", "Body Weight", 150, 0, 1000, 1), dd("unit", "Weight Unit", E.WB_UNITS, 0), dd("who", "For", E.WB_WHO, 0), dd("bed", "Blanket Size", E.WB_BED, 0)],
    results: [["rec", "Recommended Weight", "t"], ["range", "Comfortable Range", "t"], ["size", "Size", "t"], ["note", "Note", "t"]],
    fn: C["weighted-blanket-calculator"], ex: { weight: 150, unit: 0, who: 0, bed: 0 },
    exText: (o) => `Example: a 150 lb adult should look for a ${o.rec}.`,
    how: "Most makers recommend a weighted blanket of about 10% of your body weight, rounded to the nearest size sold (5, 7, 10, 12, 15, 17, 20, 25 or 30 lb). For children, 10% plus 1–2 lb is common.\n\nThe blanket should cover you, not the whole bed, so the weight stays on your body.",
    assume: "Manufacturer guidance; not for babies or toddlers, or for anyone who can't remove it on their own.",
    faq: [["What weight blanket for 150 lb?", "15 lb."], ["Can a weighted blanket be too heavy?", "Yes — above about 12% it can feel restrictive and hot."], ["Are weighted blankets safe for kids?", "Not for under-2s; for children ask a paediatrician or OT and use about 10% + 1 lb."]],
  }),
];

const SEWING: ToolDef[] = [
  mk({
    slug: "quilt-backing-calculator", title: "Quilt Backing Calculator (Backing & Binding Yardage)",
    meta: "Quilt Backing Calculator — Backing & Binding Yardage",
    desc: "Work out how much fabric you need for a quilt backing — with the best seam layout for 42 in, 60 in or 108 in wide fabric and 4 in overhang — plus the binding strips and yardage.",
    inputs: [num("width", "Quilt Top Width (in)", 60, 0, 300, 0.5), num("length", "Quilt Top Length (in)", 72, 0, 300, 0.5), num("overhang", "Extra on Each Side (in)", 4, 0, 12, 0.5), dd("fabric", "Backing Fabric Width", E.QB_FABRIC, 0), num("strip", "Binding Strip Width (in)", 2.5, 1, 5, 0.125)],
    results: [["backing", "Backing Fabric", "t"], ["layout", "Best Layout", "t"], ["others", "Other Layouts", "t"], ["binding", "Binding Fabric", "t"], ["length", "Binding Length", "t"]],
    fn: C["quilt-backing-calculator"], ex: { width: 60, length: 72, overhang: 4, fabric: 0, strip: 2.5 },
    exText: (o) => `Example: a 60 × 72 in quilt with 4 in overhang needs ${o.backing} of 42 in backing (${o.layout}) and ${String(o.binding).split(" — ")[0]} for binding.`,
    how: "Backing = quilt top + 4 in on every side (8 in total each way) for long-arm or hand quilting. If the backing is wider than your fabric, it's pieced from panels; the calculator compares vertical and horizontal seams and picks the one that uses less fabric.\n\nBinding length = the quilt's perimeter + 12 in for joining and corners. Strips are cut across the width of the fabric (40 in usable).",
    assume: "½ in seams; yardage rounded up to the nearest ⅛ yard. Prewash allowance not included.",
    faq: [["How much backing for a queen quilt?", "A 90 × 108 in top needs about 8⅓ yd of 42 in fabric or 3⅛ yd of 108 in backing."], ["How much bigger should backing be?", "4 in on each side (8 in total) is standard for long-arm quilting."], ["How much binding do I need?", "Perimeter + 12 in, cut in 2½ in strips."]],
  }),
  mk({
    slug: "circle-skirt-calculator", title: "Circle Skirt Calculator (Waist Radius & Fabric Needed)",
    meta: "Circle Skirt Calculator — Waist Radius & Yardage",
    desc: "Calculate the waist radius and outer radius for a full, half or quarter circle skirt from your waist and skirt length, plus how much fabric to buy for your fabric width and how to lay it out.",
    inputs: [dd("type", "Skirt Type", E.CS_TYPES, 0), dd("unit", "Units", E.CS_UNITS, 0), num("waist", "Waist Measurement", 28, 0, 300, 0.25), num("length", "Skirt Length", 22, 0, 200, 0.25), num("hem", "Hem Allowance", 1, 0, 10, 0.25), num("fabricWidth", "Fabric Width", 58, 0, 400, 1)],
    results: [["radius", "Waist Radius", "t"], ["outer", "Cutting Radius", "t"], ["fabric", "Fabric Needed", "t"], ["how", "Layout", "t"], ["hemLength", "Hem Circumference", "t"]],
    fn: C["circle-skirt-calculator"], ex: { type: 0, unit: 0, waist: 28, length: 22, hem: 1, fabricWidth: 58 },
    exText: (o) => `Example: a full circle skirt for a 28 in waist, 22 in long, has a waist radius of ${o.radius} and needs ${o.fabric} of 58 in fabric (${String(o.how).toLowerCase()}).`,
    how: "Waist radius = waist ÷ (2π) for a full circle, waist ÷ π for a half circle and 2 × waist ÷ π for a quarter circle. Add the skirt length and hem allowance for the outer cutting radius.\n\nA full circle in one piece needs fabric at least twice the outer radius wide; otherwise cut two half circles.",
    assume: "Seam allowance at the waist isn't included — many sewists subtract 1–2 in from the waist measurement so the bias-cut waist doesn't stretch too big.",
    faq: [["How do I calculate a circle skirt waist radius?", "Waist ÷ 6.283 for a full circle. A 30 in waist → 4.77 in radius."], ["How much fabric for a circle skirt?", "Usually 3–4 yd of 58–60 in fabric for a knee-length full circle."], ["What is a half circle skirt?", "A semicircle with a waist radius of waist ÷ π; less flare and less fabric."]],
  }),
];

async function main() {
  const all = [...DIET, ...SHOP_UNIT, ...SHOP_CLOTH, ...SHOP_LIFE, ...SEWING];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); for (const t of all) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("diet-macro-meal-planning-calculators", DIET.slice(0, 2));
  await upsertTools("food-nutrition-calorie-calculators", DIET.slice(2));
  await upsertTools("discount-tip-unit-price-calculators", SHOP_UNIT);
  await upsertTools("clothing-shoe-ring-size-calculators", SHOP_CLOTH);
  await upsertTools("lifestyle-party-wedding-calculators", SHOP_LIFE);
  await upsertTools("flooring-tile-paint-interior-calculators", SEWING);
}
main().catch((e) => { console.error(e); process.exit(1); });
