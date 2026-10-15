// One-time (but safe to re-run) batch setup script: creates 11 bra, shapewear and body measurement tools
// from the user's shopping list (Shopping Calculators > Clothing, Shoe & Ring Size Calculators).
// See src/lib/calc-engine-shopping-size-body.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-size-body-calculators.ts
// or
//   npm run db:create-shopping-size-body-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Clothing, Shoe & Ring Size Calculators", slug: "clothing-shoe-ring-size-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
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

const UNIT: [string, number][] = [["Inches", 0], ["Centimetres", 1]];
const CUP_LEGEND = "Cup (0 AA, 1 A, 2 B, 3 C, 4 D, 5 DD/E, 6 DDD/F, 7 G, 8 H, 9 I, 10 J)";
const FIT_NOTE = "Sizing differs between brands; check each brand's own chart and use this as a starting point.";

const TOOLS: ToolDef[] = [
  {
    slug: "bra-size-calculator",
    title: "Bra Size Calculator",
    description: "Find your bra size from underbust and bust measurements — band and cup in US/UK sizes plus the EU band — with your sister sizes, also useful for strapless bras.",
    metaTitle: "Bra Size Calculator — Band & Cup From Measurements",
    metaDescription: "Free bra size calculator. Work out your band and cup size from underbust and bust measurements, with US, UK and EU sizes and sister sizes.",
    calcInputs: [
      numberField("underbust", "Underbust (Snug, Around the Ribcage)", { default: 31.5, max: 80, step: 0.25 }),
      numberField("bust", "Bust (Fullest Part, Level)", { default: 36, max: 90, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Band Size", format: "number" },
    calcResults: [
      { key: "bandSize", label: "Band Size (US/UK)", format: "number", highlight: true },
      { key: "cupCode", label: CUP_LEGEND, format: "number" },
      { key: "euBand", label: "EU Band", format: "number" },
      { key: "sisterUpBand", label: "Sister Size — Band Up (Cup One Smaller)", format: "number" },
      { key: "sisterDownBand", label: "Sister Size — Band Down (Cup One Larger)", format: "number" },
      { key: "bustMinusBand", label: "Bust Minus Band (in)", format: "number" },
    ],
    instructions:
      "Measure snugly around your ribcage just under your bust for the underbust, then loosely around the fullest part of your bust, keeping the tape level. Wear an unpadded bra.\n\n" +
      "For a strapless bra, many people go down one band size (and up one cup) for extra support.",
    examples: "Example: a 31.5 in underbust and 36 in bust give a band of 32 and a cup code of 4 — a 32D (EU 70D).",
    assumptions: "Modern method: band = underbust rounded to the nearest even number; each inch of bust over the band is one cup size. The old '+4 inches' method gives bands that are too big. UK cups go D, DD, E, F; US often D, DD, DDD. " + FIT_NOTE,
    faq: [
      { question: "How do I measure my bra size?", answer: "Measure snugly under your bust for the band, then around the fullest part for the bust. The difference in inches gives the cup: 1 in = A, 2 = B, 3 = C, 4 = D." },
      { question: "What size should a strapless bra be?", answer: "Often one band size smaller than usual (with one cup larger to keep the volume), so it stays up without straps." },
    ],
  },
  {
    slug: "sports-bra-size-calculator",
    title: "Sports Bra Size Calculator",
    description: "Find your sports bra size (XS to XXL) from your underbust and bust measurements, with your bra band and cup for brands that size sports bras by cup.",
    metaTitle: "Sports Bra Size Calculator — XS to XXL",
    metaDescription: "Free sports bra size calculator. Convert underbust and bust measurements to XS–XXL sports bra sizes and band-and-cup sizes.",
    calcInputs: [
      numberField("underbust", "Underbust", { default: 32, max: 80, step: 0.25 }),
      numberField("bust", "Bust", { default: 36, max: 90, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Size", format: "number" },
    calcResults: [
      { key: "sizeCode", label: "Sports Bra Size (1 XS, 2 S, 3 M, 4 L, 5 XL, 6 XXL)", format: "number", highlight: true },
      { key: "bandSize", label: "Band Size", format: "number" },
      { key: "cupCode", label: CUP_LEGEND, format: "number" },
      { key: "highImpactSizeUp", label: "Consider a Cup-Sized Sports Bra? (1 = Yes)", format: "number" },
    ],
    instructions:
      "Measure your underbust and bust as for a regular bra. The result gives an XS–XXL size and your band-and-cup size for brands that sell cup-sized sports bras.",
    examples: "Example: a 32 in underbust and 36 in bust is a 32D, which maps to size 3 (medium) in most letter-sized sports bras.",
    assumptions: "Letter sizes are matched to band and cup volume; a D cup and larger often fits better in band-and-cup sized, encapsulation-style sports bras for running and high-impact exercise. " + FIT_NOTE,
    faq: [
      { question: "Should a sports bra be tighter than a regular bra?", answer: "Snug, yes — the band should stay level and not ride up, but you should still be able to breathe deeply and fit two fingers under the straps." },
      { question: "What size sports bra is a 34C?", answer: "Usually a medium in letter sizing, but check the brand's chart." },
    ],
  },
  {
    slug: "maternity-bra-size-calculator",
    title: "Maternity Bra Size Calculator",
    description: "Find the right maternity or nursing bra size for each stage — first, second and third trimester or nursing — from your current underbust and bust.",
    metaTitle: "Maternity & Nursing Bra Size Calculator",
    metaDescription: "Free maternity bra size calculator. Find the right maternity or nursing bra size for each trimester and for breastfeeding.",
    calcInputs: [
      numberField("underbust", "Underbust Today", { default: 32, max: 80, step: 0.25 }),
      numberField("bust", "Bust Today", { default: 37, max: 90, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
      dropdown("stage", "Stage", [["First trimester", 0], ["Second trimester", 1], ["Third trimester", 2], ["Nursing (after milk comes in)", 3]], 2),
    ],
    calcResult: { label: "Band to Buy", format: "number" },
    calcResults: [
      { key: "buyBandSize", label: "Band Size to Buy", format: "number", highlight: true },
      { key: "buyCupCode", label: "Cup to Buy — " + CUP_LEGEND, format: "number" },
      { key: "currentBandSize", label: "Current Band", format: "number" },
      { key: "currentCupCode", label: "Current Cup Code", format: "number" },
      { key: "useExtender", label: "Use a Band Extender for Now? (1 = Yes)", format: "number" },
    ],
    instructions:
      "Measure your underbust and bust today, then choose your stage. The calculator suggests a size that leaves room for growth — buy stretchy cups and wear the band on the loosest hook at first.",
    examples: "Example: measuring 32 in under and 37 in at the bust in the third trimester, buy about a band 34 with cup code 4, allowing for ribcage and breast growth.",
    assumptions: "The ribcage often expands 1–2 inches by the third trimester and breasts may grow 1–2 cups across pregnancy and when milk comes in. Nursing bras are best bought around 36–38 weeks. Measurements change, so re-measure each trimester. " + FIT_NOTE,
    faq: [
      { question: "When should I buy a maternity bra?", answer: "As soon as your regular bras feel tight — often in the first trimester — and re-measure every trimester." },
      { question: "When should I buy a nursing bra?", answer: "Around 36–38 weeks, when your size is close to what it will be after birth; stretchy nursing bras handle the change when milk comes in." },
    ],
  },
  {
    slug: "sister-size-bra-calculator",
    title: "Sister Size Bra Calculator",
    description: "Find your bra sister sizes — the band one size up with the cup one smaller, and the band one down with the cup one larger — which hold the same cup volume.",
    metaTitle: "Sister Size Bra Calculator — Same Cup Volume",
    metaDescription: "Free sister size bra calculator. Find the sister sizes for any bra size: band up and cup down, or band down and cup up, with the same volume.",
    calcInputs: [
      numberField("bandSize", "Your Band Size", { default: 34, min: 26, max: 54, step: 2 }),
      dropdown("cupCode", "Your Cup", [["AA", 0], ["A", 1], ["B", 2], ["C", 3], ["D", 4], ["DD / E", 5], ["DDD / F", 6], ["G", 7], ["H", 8], ["I", 9], ["J", 10]], 3),
    ],
    calcResult: { label: "Sister Size Up — Band", format: "number" },
    calcResults: [
      { key: "sisterUpBand", label: "Sister Size Up — Band", format: "number", highlight: true },
      { key: "sisterUpCup", label: "Sister Size Up — " + CUP_LEGEND, format: "number" },
      { key: "sisterDownBand", label: "Sister Size Down — Band", format: "number" },
      { key: "sisterDownCup", label: "Sister Size Down — Cup Code", format: "number" },
      { key: "cupVolumeIndex", label: "Cup Volume Index (Same for All Sister Sizes)", format: "number" },
    ],
    instructions:
      "Choose your current band and cup. Go to the band-down sister size if the band feels loose, or the band-up sister size if it's too tight but the cups fit.",
    examples: "Example: a 34C has sister sizes 36B (band up, cup code 2) and 32D (band down, cup code 4).",
    assumptions: "Cup volume depends on band size: a C cup on a 34 band holds about the same as a B on a 36 or a D on a 32. Sister sizes work best one step away; further steps change the fit too much. " + FIT_NOTE,
    faq: [
      { question: "What is a sister size?", answer: "A bra size with the same cup volume but a different band: go up a band and down a cup, or down a band and up a cup." },
      { question: "When should I wear a sister size?", answer: "When your usual size isn't available, or the band is too loose or tight but the cups fit well." },
    ],
  },
  {
    slug: "bralette-size-calculator",
    title: "Bralette Size Calculator",
    description: "Find your bralette size (XS to XXL) from your underbust and bust, with your bra size for reference.",
    metaTitle: "Bralette Size Calculator — XS to XXL",
    metaDescription: "Free bralette size calculator. Find your XS–XXL bralette size from underbust and bust measurements, with your bra size for reference.",
    calcInputs: [
      numberField("underbust", "Underbust", { default: 30, max: 80, step: 0.25 }),
      numberField("bust", "Bust", { default: 34, max: 90, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Bralette Size", format: "number" },
    calcResults: [
      { key: "sizeCode", label: "Bralette Size (1 XS, 2 S, 3 M, 4 L, 5 XL, 6 XXL)", format: "number", highlight: true },
      { key: "bandSize", label: "Bra Band", format: "number" },
      { key: "cupCode", label: CUP_LEGEND, format: "number" },
      { key: "underbustInches", label: "Underbust (in)", format: "number" },
    ],
    instructions:
      "Measure your underbust and bust. Bralettes are sized mainly by bust, with light support best for A–C cups.",
    examples: "Example: a 30 in underbust and 34 in bust (a 30D) is bralette size 2 (small).",
    assumptions: "Typical bralette chart by bust: XS up to 33 in, S 33–35, M 35–37.5, L 37.5–40, XL 40–43, XXL over 43. Larger cups may prefer bralettes sold in band-and-cup sizes. " + FIT_NOTE,
    faq: [
      { question: "Should I size up or down in a bralette?", answer: "If you're between sizes, size up for comfort or down for more support and shape." },
      { question: "Do bralettes work for big busts?", answer: "Look for band-and-cup sized bralettes with a wider band; letter-sized ones give little support above a C or D cup." },
    ],
  },
  {
    slug: "corset-size-calculator",
    title: "Corset Size Calculator",
    description: "Work out your corset size from your natural waist and how many inches of reduction you want — beginner to experienced waist training.",
    metaTitle: "Corset Size Calculator — Waist Training Size",
    metaDescription: "Free corset size calculator. Find your corset size from natural waist and desired reduction, rounded to standard even corset sizes.",
    calcInputs: [
      numberField("waist", "Natural Waist", { default: 30, max: 80, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
      numberField("reduction", "Waist Reduction You Want", { unit: "in", default: 4, max: 8, step: 0.5 }),
    ],
    calcResult: { label: "Corset Size", format: "number" },
    calcResults: [
      { key: "corsetSize", label: "Corset Size (in)", format: "number", highlight: true },
      { key: "actualReduction", label: "Actual Reduction When Closed (in)", format: "number" },
      { key: "naturalWaist", label: "Natural Waist (in)", format: "number" },
      { key: "laceGapInches", label: "Expected Lacing Gap at Your Chosen Reduction (in)", format: "number" },
    ],
    instructions:
      "Measure your natural waist at its narrowest point without sucking in. Beginners usually choose 2–4 inches of reduction; experienced wearers 4–6.\n\n" +
      "Corsets come in even sizes, so the size is rounded down.",
    examples: "Example: a 30 in natural waist with 4 in of reduction calls for a size 26 corset. When it's fully closed you're reduced by 4 in.",
    assumptions: "Corset size = natural waist − reduction, rounded down to an even number. Steel-boned corsets are sized by the corset's closed waist. Season (break in) a new corset gradually over a couple of weeks. " + FIT_NOTE,
    faq: [
      { question: "How do I choose a corset size?", answer: "Subtract 2–4 inches from your natural waist for a first corset (4–6 inches if you're experienced), then round down to an even size." },
      { question: "Should a corset close all the way?", answer: "Not at first — a 2-inch lacing gap at the back is normal while seasoning." },
    ],
  },
  {
    slug: "shapewear-size-calculator",
    title: "Shapewear Size Calculator",
    description: "Find your shapewear size (XS to 3X) from your waist and hips, with advice for when your measurements fall between sizes.",
    metaTitle: "Shapewear Size Calculator — XS to 3X",
    metaDescription: "Free shapewear size calculator. Find your shapewear size from waist and hip measurements, and what to do when you're between sizes.",
    calcInputs: [
      numberField("waist", "Waist", { default: 30, max: 80, step: 0.25 }),
      numberField("hip", "Hips (Fullest Part)", { default: 42, max: 90, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
      dropdown("compression", "Control Level", [["Light", 0], ["Medium", 1], ["Firm", 2]], 1),
    ],
    calcResult: { label: "Shapewear Size", format: "number" },
    calcResults: [
      { key: "sizeCode", label: "Shapewear Size (1 XS, 2 S, 3 M, 4 L, 5 XL, 6 2X, 7 3X)", format: "number", highlight: true },
      { key: "waistSizeCode", label: "Size by Waist", format: "number" },
      { key: "hipSizeCode", label: "Size by Hip", format: "number" },
      { key: "betweenSizes", label: "Between Sizes? (1 = Yes)", format: "number" },
      { key: "firmControlTip", label: "Size Up for Firm Control? (1 = Yes)", format: "number" },
    ],
    instructions:
      "Measure your natural waist and the fullest part of your hips, and choose the control level. If your waist and hips point to different sizes, the larger one is recommended — shapewear that's too small rolls and digs in.",
    examples: "Example: a 30 in waist (size 3) and 42 in hips (size 4) point to size 4 — a large.",
    assumptions: "Chart (in): waist up to 26 XS, 28 S, 31 M, 34 L, 37 XL, 41 2X, 45 3X; hips up to 36, 38, 41, 44, 47, 51, 55. Going down a size doesn't make you look slimmer — it just makes the garment uncomfortable. " + FIT_NOTE,
    faq: [
      { question: "Should I size down in shapewear?", answer: "No — choose your true size. Too-small shapewear rolls, bulges and is uncomfortable." },
      { question: "What if my waist and hips are different sizes?", answer: "Pick the size for the area you want controlled most, usually the larger measurement." },
    ],
  },
  {
    slug: "panty-size-calculator",
    title: "Panty Size Calculator",
    description: "Find your women's underwear size — numeric US panty sizes 4 to 10 and XS to 3X — from your hip measurement.",
    metaTitle: "Panty Size Calculator — US Sizes 4 to 10",
    metaDescription: "Free panty size calculator. Find your women's underwear size from your hip measurement, in numeric US sizes 4–10 and XS–3X.",
    calcInputs: [
      numberField("hip", "Hips (Fullest Part)", { default: 38, max: 90, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "US Panty Size", format: "number" },
    calcResults: [
      { key: "usPantySize", label: "US Panty Size (4–10)", format: "number", highlight: true },
      { key: "letterCode", label: "Letter Size (1 XS, 2 S, 3 M, 4 L, 5 XL, 6 2X, 7 3X)", format: "number" },
      { key: "hipInches", label: "Hips (in)", format: "number" },
    ],
    instructions: "Measure around the fullest part of your hips and bottom with your feet together.",
    examples: "Example: 38 in hips is US panty size 6 (letter code 3, a small).",
    assumptions: "Typical US chart by hips: size 4 (XS) up to 35 in, 5 (S) 36–37, 6 (M) 38–39, 7 (L) 40–42, 8 (XL) 43–45, 9 (2X) 46–48, 10 (3X) 49–51. Thongs and high-cut styles may fit differently. " + FIT_NOTE,
    faq: [
      { question: "What size underwear is a size 6?", answer: "Size 6 is usually a medium, for hips around 38–39 inches." },
      { question: "Is panty size the same as pants size?", answer: "No — panty sizes (4–10) are their own scale based on hips, unlike dress or pants sizes." },
    ],
  },
  {
    slug: "chest-size-calculator",
    title: "Chest Size Calculator",
    description: "Turn your chest measurement into a men's suit jacket size, shirt size (S to 3XL) and EU jacket size.",
    metaTitle: "Chest Size Calculator — Men's Jacket & Shirt Size",
    metaDescription: "Free chest size calculator. Convert men's chest measurement to suit jacket size, shirt letter size and EU jacket size.",
    calcInputs: [
      numberField("chest", "Chest (Fullest Part, Under the Arms)", { default: 41, max: 80, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Jacket Size", format: "number" },
    calcResults: [
      { key: "jacketSize", label: "US/UK Jacket Size", format: "number", highlight: true },
      { key: "shirtCode", label: "Shirt Size (1 S, 2 M, 3 L, 4 XL, 5 XXL, 6 3XL, 7 4XL)", format: "number" },
      { key: "euJacketSize", label: "EU Jacket Size", format: "number" },
      { key: "chestCm", label: "Chest (cm)", format: "number" },
    ],
    instructions: "Measure around the fullest part of your chest, under your arms and over your shoulder blades, with arms relaxed.",
    examples: "Example: a 41 in chest is a size 42 jacket (EU 52) and shirt code 3 — a large.",
    assumptions: "Jacket size ≈ chest in inches, rounded to an even number; EU size ≈ US + 10. Shirt chart (in): S up to 36, M 40, L 44, XL 48, XXL 52, 3XL 56. Choose short, regular or long jackets by height. " + FIT_NOTE,
    faq: [
      { question: "What jacket size is a 40 inch chest?", answer: "A 40 — US and UK suit jackets are sized by chest in inches; that's a 50 in EU sizing." },
      { question: "How should I measure my chest?", answer: "Wrap the tape under your arms around the fullest part of your chest, keeping it level and snug but not tight." },
    ],
  },
  {
    slug: "hip-size-calculator",
    title: "Hip Size Calculator",
    description: "Find your women's dress size from your hip measurement — US, UK and EU — and your waist-to-hip ratio.",
    metaTitle: "Hip Size Calculator — Dress Size by Hips",
    metaDescription: "Free hip size calculator. Find your women's US, UK and EU dress size by hip measurement and your waist-to-hip ratio.",
    calcInputs: [
      numberField("hip", "Hips (Fullest Part)", { default: 40, max: 90, step: 0.25 }),
      numberField("waist", "Waist (Optional)", { default: 30, max: 80, step: 0.25, required: false }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "US Size by Hip", format: "number" },
    calcResults: [
      { key: "usSizeByHip", label: "US Dress Size by Hip", format: "number", highlight: true },
      { key: "ukSize", label: "UK Size", format: "number" },
      { key: "euSize", label: "EU Size", format: "number" },
      { key: "waistToHipRatio", label: "Waist-to-Hip Ratio", format: "number" },
      { key: "hipCm", label: "Hips (cm)", format: "number" },
    ],
    instructions: "Measure around the fullest part of your hips and bottom with feet together. Add your waist for the waist-to-hip ratio. Use this size for skirts, trousers and fitted dresses.",
    examples: "Example: 40 in hips is a US 12 (UK 16, EU 42); with a 30 in waist the waist-to-hip ratio is 0.75.",
    assumptions: "US misses chart by hip (in): 0 = 34.5, 2 = 35.5, 4 = 36.5, 6 = 37.5, 8 = 38.5, 10 = 39.5, 12 = 41, 14 = 42.5, 16 = 44 and up. UK = US + 4; EU ≈ US + 30. " + FIT_NOTE,
    faq: [
      { question: "What dress size is 40 inch hips?", answer: "Around a US 12 (UK 16) on standard charts, though brands vary." },
      { question: "What is a healthy waist-to-hip ratio?", answer: "Health guidelines often cite 0.85 or below for women and 0.90 or below for men." },
    ],
  },
  {
    slug: "body-measurement-calculator",
    title: "Body Measurement Calculator",
    description: "Find your body shape (hourglass, pear, apple, rectangle or inverted triangle) from bust, waist and hip measurements, and the dress size that fits all three.",
    metaTitle: "Body Measurement Calculator — Body Shape & Size",
    metaDescription: "Free body measurement calculator. Find your body shape from bust, waist and hips and the women's dress size that fits your measurements.",
    calcInputs: [
      numberField("bust", "Bust", { default: 38, max: 90, step: 0.25 }),
      numberField("waist", "Waist", { default: 29, max: 80, step: 0.25 }),
      numberField("hip", "Hips", { default: 40, max: 90, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Body Shape", format: "number" },
    calcResults: [
      { key: "bodyShapeCode", label: "Body Shape (1 Hourglass, 2 Pear, 3 Apple, 4 Rectangle, 5 Inverted Triangle)", format: "number", highlight: true },
      { key: "usDressSize", label: "US Dress Size That Fits All Measurements", format: "number" },
      { key: "waistToHipRatio", label: "Waist-to-Hip Ratio", format: "number" },
      { key: "bustToWaistDifference", label: "Bust − Waist (in)", format: "number" },
      { key: "hipToWaistDifference", label: "Hips − Waist (in)", format: "number" },
    ],
    instructions:
      "Measure your bust at its fullest, your natural waist at its narrowest and your hips at their fullest. The calculator classifies your shape and picks the dress size for your largest measurement — tailor the rest.",
    examples: "Example: 38-29-40 in measurements are body shape 1 (hourglass), and a US 12 fits all three.",
    assumptions: "Shapes use common rules: hourglass when bust and hips are within 3.6 in and the waist is clearly defined; pear when hips exceed bust by 3.6+ in; inverted triangle when bust exceeds hips by 3.6+ in; apple when the waist is close to the hips; otherwise rectangle. Shape is about proportion, not size. " + FIT_NOTE,
    faq: [
      { question: "How do I find my body shape?", answer: "Compare your bust, waist and hip measurements: similar bust and hips with a smaller waist is an hourglass; wider hips is a pear; wider shoulders or bust is an inverted triangle." },
      { question: "Which size should I buy if my measurements are in different sizes?", answer: "Buy for your largest measurement in that garment (bust for tops, hips for skirts) and have the rest tailored." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
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
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
