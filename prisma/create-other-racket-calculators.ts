// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the other-sports sub-batch "Tennis, Pickleball & Table Tennis". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-racket.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-racket-calculators.ts
// or
//   npm run db:create-other-racket-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Other Sports Calculators", slug: "other-sports-calculators" };

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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for planning, training and fun. Sizing, ratings and physics models are approximations — check official rules, manufacturer charts and qualified coaches, and treat health figures as general guidance, not medical advice.";

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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });

const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });

const WT = (def = 170) => [numberField("weight", "Body Weight", { default: def, min: 20, max: 500 }), dropdown("weightUnit", "Weight Unit", [["lb", 1], ["kg", 2]], 1)];
const SKILL = (key: string, label: string, def = 4) => numberField(key, `${label} (1 beginner … 7 pro)`, { default: def, min: 1, max: 7, step: 0.5 });
const SURFACES: [string, number][] = [["Asphalt with acrylic surface", 1], ["Post-tensioned concrete", 2], ["Resurface existing slab", 3], ["Cushioned acrylic / premium", 4], ["Clay / Har-Tru", 5]];
const COURT = () => [numberField("courts", "Number of Courts", { default: 1, min: 1, max: 20 }), dropdown("surface", "Surface", SURFACES, 1), numberField("surfacePrice", "Your Price per sq ft (0 = typical)", { default: 0, max: 50, step: 0.25, required: false }), dropdown("fencing", "Perimeter Fencing", [["Yes", 1], ["No", 2]], 1), currencyField("fencePerFt", "Fencing per Linear ft", { default: 35 }), percentField("sitePrepPct", "Site Prep / Grading (% of surface cost)", { default: 15, max: 100 }), currencyField("netPosts", "Net Posts, Net & Lines", { default: 1500 }), currencyField("lighting", "Lighting", { default: 0, required: false })];

const TOOLS: ToolDef[] = [
  {
    slug: "utr-calculator",
    title: "UTR Calculator",
    description: "Estimate a UTR-style tennis rating from match results — games won and lost against rated opponents.",
    metaTitle: "UTR Calculator — Estimate Your Tennis Rating",
    metaDescription: "Free UTR calculator. Estimate a Universal Tennis Rating-style number from games won against rated opponents.",
    calcInputs: [1, 2, 3, 4, 5].flatMap((i) => [numberField(`opp${i}Utr`, `Match ${i} — Opponent UTR (0 = none)`, { default: i === 1 ? 6 : i === 2 ? 7 : 0, max: 16.5, step: 0.01, required: i === 1 }), numberField(`games${i}Won`, `Match ${i} — Games You Won`, { default: i === 1 ? 12 : i === 2 ? 8 : 0, max: 60, required: false }), numberField(`games${i}Lost`, `Match ${i} — Games You Lost`, { default: i === 1 ? 8 : i === 2 ? 12 : 0, max: 60, required: false })]),
    calcResult: { label: "Estimated UTR", format: "number" },
    calcResults: [num("estimatedUtr", "Estimated UTR", true), num("matchesCounted", "Matches Counted"), num("approxNtrp", "Approximate NTRP")],
    instructions: "Enter up to five recent matches: the opponent's UTR and the total games you won and lost.",
    examples: "Example: 12–8 in games against a 6.0 and 8–12 against a 7.0 → match ratings 6.5 and 6.5, so about 6.5 (≈ NTRP 4.0).",
    assumptions: "Each match rating ≈ opponent UTR + 5 × (your share of games − 50%), averaged. The real UTR algorithm (UTR Sports) weights matches by recency, competitiveness and reliability, so treat this as an estimate. Not affiliated with UTR Sports. " + DISCLAIMER,
    faq: [
      { question: "How does UTR work?", answer: "It rates you 1–16.5 from the percentage of games you win against opponents of known level." },
      { question: "Does winning matter in UTR?", answer: "Games won matter more than the result — a close loss to a strong player can raise your rating." },
    ],
  },
  {
    slug: "tennis-rating-calculator",
    title: "Tennis Rating Calculator",
    description: "Find your NTRP tennis rating (1.5–7.0) with a quick self-assessment of your strokes, serve, volleys and game.",
    metaTitle: "Tennis Rating Calculator — NTRP Self-Rating",
    metaDescription: "Free tennis rating calculator. Self-rate forehand, backhand, serve, return, volley and movement to estimate your NTRP level.",
    calcInputs: [SKILL("forehand", "Forehand"), SKILL("backhand", "Backhand", 3), SKILL("serve", "Serve"), SKILL("returnOfServe", "Return of Serve"), SKILL("volley", "Volleys & Net Play", 3), SKILL("movementStrategy", "Movement & Strategy")],
    calcResult: { label: "NTRP", format: "number" },
    calcResults: [num("ntrpRating", "Estimated NTRP Rating", true), num("averageSkill", "Average Skill Score"), num("approxUtr", "Approximate UTR")],
    instructions: "Rate each part of your game from 1 (just starting) to 7 (tournament / pro level). Be honest — compare with players you know.",
    examples: "Example: skills averaging 3.7 → NTRP 4.0 (consistent rallies, dependable strokes with direction, starting to use spin and net play).",
    assumptions: "Average skill (1–7) is mapped linearly to NTRP 1.5–7.0 and rounded to the nearest 0.5. USTA NTRP levels: 2.5 learning to rally, 3.0 consistent medium-pace, 3.5 directional control, 4.0 dependable strokes, 4.5 power and spin, 5.0+ tournament level. Leagues may re-rate you after matches. " + DISCLAIMER,
    faq: [
      { question: "What NTRP is an average club player?", answer: "Most recreational club players are 3.0–4.0." },
      { question: "Is NTRP the same as UTR?", answer: "No — NTRP is a USTA self/computer rating in 0.5 steps; UTR is a 1–16.5 results-based rating." },
    ],
  },
  {
    slug: "tennis-string-tension-calculator",
    title: "Tennis String Tension Calculator",
    description: "Find a good tennis string tension for your racquet's head size, string type and playing style.",
    metaTitle: "Tennis String Tension Calculator — Recommended Tension",
    metaDescription: "Free tennis string tension calculator. Get a recommended tension in lb and kg by head size, string type and goals.",
    calcInputs: [numberField("headSize", "Head Size (sq in)", { default: 100, min: 85, max: 125 }), dropdown("stringType", "String", [["Multifilament / synthetic gut", 1], ["Polyester", 2], ["Natural gut", 3]], 1), dropdown("goal", "You Want", [["More power & comfort", 1], ["Balanced", 2], ["More control", 3]], 2), dropdown("armIssues", "Arm / Elbow Problems?", [["No", 1], ["Yes", 2]], 1)],
    calcResult: { label: "Tension", format: "number" },
    calcResults: [num("tensionLb", "Recommended Tension (lb)", true), num("tensionKg", "Tension (kg)"), num("rangeLowLb", "Range — From (lb)"), num("rangeHighLb", "Range — To (lb)")],
    instructions: "Enter your racquet head size (printed on the frame) and your string and goals.",
    examples: "Example: a 100 sq in racquet with multifilament and a balanced style → about 55 lb; with polyester about 50 lb.",
    assumptions: "Start at 55 lb for 100 sq in, +1 lb per 5 sq in larger head; polyester about 10% lower, natural gut +2 lb; −3 lb for power, +3 lb for control, −4 lb with arm problems. Check the racquet's recommended range. Lower tension = more power and comfort, higher = more control. " + DISCLAIMER,
    faq: [
      { question: "Why string polyester lower?", answer: "Poly is stiff and loses tension fast, so lower tensions play better and are kinder to the arm." },
      { question: "How often should I restring?", answer: "A common rule is as many times a year as you play per week." },
    ],
  },
  {
    slug: "tennis-court-cost-calculator",
    title: "Tennis Court Cost Calculator",
    description: "Estimate the cost to build a tennis court — surface, fencing, site preparation, net and lighting.",
    metaTitle: "Tennis Court Cost Calculator — Build Cost",
    metaDescription: "Free tennis court cost calculator. Estimate the cost of building a tennis court by surface, fencing, site prep and lights.",
    calcInputs: COURT(),
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [cur("totalCost", "Estimated Total Cost", true), cur("surfaceCost", "Surface"), cur("fencingCost", "Fencing"), cur("costPerSqFt", "Cost per sq ft"), num("areaSqFt", "Court Area (sq ft)")],
    instructions: "Choose the number of courts, the surface and options. Enter local prices if you have quotes.",
    examples: "Example: one asphalt court (60 × 120 ft, 7,200 sq ft) at $7/sq ft with 360 ft of fencing at $35/ft, 15% site prep and $1,500 for posts and net → about $72,000.",
    assumptions: "Standard fenced area 60 × 120 ft per court (shared fencing for adjacent courts). Typical surface prices per sq ft: asphalt + acrylic $7, post-tensioned concrete $9, resurfacing $5.50, cushioned $12, clay $6. Lighting often adds $20,000–$60,000. Prices vary a lot by region — get quotes. " + DISCLAIMER,
    faq: [
      { question: "How much does a tennis court cost?", answer: "Commonly $60,000–$120,000 for a new hard court, more with lights." },
      { question: "How long does a hard court last?", answer: "Resurface every 4–8 years; the base can last 25+ years." },
    ],
  },
  {
    slug: "pickleball-court-cost-calculator",
    title: "Pickleball Court Cost Calculator",
    description: "Estimate the cost to build a pickleball court — surface, fencing, site prep, net and lighting.",
    metaTitle: "Pickleball Court Cost Calculator — Build Cost",
    metaDescription: "Free pickleball court cost calculator. Estimate the cost of a backyard or club pickleball court with fencing and lights.",
    calcInputs: COURT(),
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [cur("totalCost", "Estimated Total Cost", true), cur("surfaceCost", "Surface"), cur("fencingCost", "Fencing"), cur("costPerSqFt", "Cost per sq ft"), num("areaSqFt", "Court Area (sq ft)")],
    instructions: "Choose the number of courts, surface and options; use local quotes where you can.",
    examples: "Example: one asphalt pickleball court (30 × 60 ft, 1,800 sq ft) with 180 ft of fencing, 15% site prep and $1,500 for posts and net → about $22,300.",
    assumptions: "Recommended footprint 30 × 60 ft per court (the playing area is 20 × 44 ft). Surface prices as in the Tennis Court Cost Calculator. A tennis court can fit up to 4 pickleball courts. " + DISCLAIMER,
    faq: [
      { question: "How much space do I need for a pickleball court?", answer: "At least 30 × 60 ft is recommended; 34 × 64 ft for tournament play." },
      { question: "Can I paint pickleball lines on a driveway?", answer: "Yes, if it's big and level enough — a cheap way to start." },
    ],
  },
  {
    slug: "tennis-calorie-calculator",
    title: "Tennis Calorie Calculator",
    description: "Calculate calories burned playing tennis — singles, doubles or hitting practice.",
    metaTitle: "Tennis Calorie Calculator — Calories Burned",
    metaDescription: "Free tennis calorie calculator. Estimate calories burned playing singles, doubles or practice by weight and time.",
    calcInputs: [dropdown("play", "Type of Play", [["Hitting / practice", 1], ["Doubles", 2], ["General / mixed", 3], ["Singles", 4]], 4), ...WT(), numberField("minutes", "Minutes", { default: 60, min: 1, max: 600 })],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("met", "MET Value")],
    instructions: "Choose how you played and enter your weight and time on court.",
    examples: "Example: an hour of singles at 170 lb burns about 617 kcal.",
    assumptions: "2011 Compendium METs: singles 8.0, general 7.3, doubles 6.0; practice estimated at 4.5. Breaks between points are included in these values. " + DISCLAIMER,
    faq: [
      { question: "Is tennis good exercise?", answer: "Yes — singles is vigorous interval exercise." },
      { question: "Singles or doubles for fitness?", answer: "Singles burns about a third more." },
    ],
  },
  {
    slug: "pickleball-calories-burned-calculator",
    title: "Pickleball Calories Burned Calculator",
    description: "Calculate calories burned playing pickleball — recreational doubles, singles or competitive play.",
    metaTitle: "Pickleball Calories Burned Calculator",
    metaDescription: "Free pickleball calorie calculator. Estimate calories burned in doubles, singles or competitive pickleball by weight and time.",
    calcInputs: [dropdown("play", "Type of Play", [["Recreational doubles", 1], ["Singles", 2], ["Competitive / tournament", 3]], 1), ...WT(), numberField("minutes", "Minutes", { default: 60, min: 1, max: 600 })],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("met", "MET Value")],
    instructions: "Choose your type of play, enter weight and minutes.",
    examples: "Example: an hour of recreational doubles at 170 lb burns about 347 kcal.",
    assumptions: "METs: recreational doubles 4.5, singles 6.0, competitive 7.5 (Compendium-based estimates). " + DISCLAIMER,
    faq: [
      { question: "Is pickleball good exercise?", answer: "Yes — moderate intensity, social and easy on the joints compared with tennis." },
      { question: "Does pickleball burn as much as tennis?", answer: "Usually a bit less per hour because the court is smaller." },
    ],
  },
  {
    slug: "pickleball-rating-calculator",
    title: "Pickleball Rating Calculator",
    description: "Estimate a DUPR-style pickleball rating (2.0–8.0) from your game scores against rated opponents, for doubles or singles.",
    metaTitle: "Pickleball Rating Calculator — DUPR-Style Rating",
    metaDescription: "Free pickleball rating calculator. Estimate your DUPR-style rating from points won against rated opponents and your partner's rating.",
    calcInputs: [dropdown("format", "Format", [["Doubles", 1], ["Singles", 2]], 1), numberField("partnerRating", "Partner's Rating (doubles)", { default: 3.5, min: 2, max: 8, step: 0.05 }), ...[1, 2, 3, 4, 5].flatMap((i) => [numberField(`opp${i}Rating`, `Game ${i} — Opponents' Average Rating (0 = none)`, { default: i === 1 ? 3.5 : i === 2 ? 3.75 : 0, max: 8, step: 0.05, required: i === 1 }), numberField(`points${i}For`, `Game ${i} — Your Points`, { default: i === 1 ? 11 : i === 2 ? 9 : 0, max: 30, required: false }), numberField(`points${i}Against`, `Game ${i} — Their Points`, { default: i === 1 ? 7 : i === 2 ? 11 : 0, max: 30, required: false })])],
    calcResult: { label: "Rating", format: "number" },
    calcResults: [num("estimatedRating", "Estimated Rating", true), num("gamesCounted", "Games Counted"), num("skillLevel", "Level (1 < 3.0, 2 3.0, 3 3.5, 4 4.0, 5 4.5, 6 5.0+)")],
    instructions: "Enter recent games: the opponents' average rating and the score. For doubles add your partner's rating.",
    examples: "Example (doubles, partner 3.5): won 11–7 against 3.5s and lost 9–11 against 3.75s → about 3.93.",
    assumptions: "Team performance ≈ opponents' rating + 3 × (share of points − 50%); in doubles your rating = 2 × team performance − partner. DUPR's real algorithm weights reliability, recency and scores differently. Not affiliated with DUPR. " + DISCLAIMER,
    faq: [
      { question: "What is a 3.5 pickleball player?", answer: "Consistent dinks and third-shot drops, moving to the net, still working on resets and speed-ups." },
      { question: "Does margin of victory matter?", answer: "In DUPR-style systems, yes — points won count, not just wins." },
    ],
  },
  {
    slug: "table-tennis-rating-calculator",
    title: "Table Tennis Rating Calculator",
    description: "Calculate how many USATT rating points you gain or lose after a table tennis match.",
    metaTitle: "Table Tennis Rating Calculator — USATT Points",
    metaDescription: "Free table tennis rating calculator. See USATT rating points gained or lost from a win or loss against any rated opponent.",
    calcInputs: [numberField("yourRating", "Your Rating", { default: 1500, min: 0, max: 3500 }), numberField("opponentRating", "Opponent's Rating", { default: 1600, min: 0, max: 3500 }), dropdown("result", "Result", [["I won", 1], ["I lost", 2]], 1)],
    calcResult: { label: "Points Change", format: "number" },
    calcResults: [num("pointsChange", "Your Points Change", true), num("newRating", "Your New Rating"), num("opponentNewRating", "Opponent's New Rating"), num("upset", "Upset (1 = yes)")],
    instructions: "Enter both ratings and the result.",
    examples: "Example: a 1500 player beats a 1600 player — a 100-point upset worth +20 points (1520) while the opponent drops to 1580.",
    assumptions: "USATT point-exchange table by rating difference: 0–12 → 8/8, 13–37 → 7/10, 38–62 → 6/13, 63–87 → 5/16, 88–112 → 4/20, 113–137 → 3/25, 138–162 → 2/30, 163–187 → 2/35, 188–212 → 1/40, 213–237 → 1/45, 238+ → 0/50 (expected / upset). Tournament processing adjusts players with very unexpected results. " + DISCLAIMER,
    faq: [
      { question: "What is a good table tennis rating?", answer: "1500+ is a solid club player; 2000+ is very strong; elite players exceed 2600." },
      { question: "Why do I gain nothing beating a much lower player?", answer: "Beyond a 238-point gap the win is expected, so no points change hands." },
    ],
  },
];
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_SLUG } });
  if (!parent) throw new Error(`The "${PARENT_SLUG}" category doesn't exist yet — create it in /admin first.`);
  console.log(`Creating sub-category "${cat.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory(CATEGORY);

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
