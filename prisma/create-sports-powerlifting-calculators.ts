// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the sports performance sub-batch C (Powerlifting & Weightlifting). See
// prisma/create-sports-strength-programming-calculators.ts for the full list
// of 8 sub-batches (76 tools under Sports Calculators > Sports Performance
// Calculators), and src/lib/calc-engine-sports-powerlifting.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-sports-powerlifting-calculators.ts
// or
//   npm run db:create-sports-powerlifting-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Sports Performance Calculators", slug: "sports-performance-calculators" };

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

const DISCLAIMER =
  "Estimates for training planning only, not medical advice. Warm up properly, use a spotter or safety bars for " +
  "heavy sets, and stop if anything hurts. Talk to a doctor before starting a new program if you have a health condition.";

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
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });

const UNIT: [string, number][] = [["kg", 1], ["lb", 2]];
const SEX: [string, number][] = [["Male", 1], ["Female", 2]];

const TOOLS: ToolDef[] = [
  {
    slug: "wilks-score-calculator",
    title: "Wilks Score Calculator",
    description: "Calculate your Wilks score — the classic powerlifting formula for comparing lifters of different bodyweights — from your total and bodyweight.",
    metaTitle: "Wilks Score Calculator — Powerlifting Wilks",
    metaDescription: "Free Wilks score calculator. Enter your powerlifting total and bodyweight (kg or lb) to get your Wilks score and coefficient.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), dropdown("unit", "Unit", UNIT, 1), numberField("bodyweight", "Bodyweight", { default: 83, min: 20, max: 500, step: 0.1 }), numberField("total", "Total (Squat + Bench + Deadlift)", { default: 600, max: 3000, step: 0.5 })],
    calcResult: { label: "Wilks Score", format: "number" },
    calcResults: [num("wilksScore", "Wilks Score", true), num("wilksCoefficient", "Wilks Coefficient", false, 4), num("totalKg", "Total in kg")],
    instructions: "Choose your sex and unit, then enter your bodyweight and your total (best squat + bench + deadlift). For a single lift, enter that lift as the total.",
    examples: "Example: an 83 kg man with a 600 kg total has a Wilks coefficient of 0.6675 and a Wilks score of 400.5.",
    assumptions: "The original Wilks formula (Robert Wilks), used by most federations until 2020. Bodyweights outside the formula's range (men 40–201.9 kg, women 26.5–151 kg) are capped. " + DISCLAIMER,
    faq: [
      { question: "What is a good Wilks score?", answer: "Roughly: 300 is a solid gym lifter, 400 is competitive at local meets, 500+ is national level." },
      { question: "Is Wilks still used?", answer: "The IPF replaced it with IPF GL points in 2020 and many other federations switched to DOTS, but Wilks is still widely quoted." },
    ],
  },
  {
    slug: "dots-score-calculator",
    title: "DOTS Score Calculator",
    description: "Calculate your DOTS score, the bodyweight-adjusted powerlifting score used by many federations, from your total and bodyweight.",
    metaTitle: "DOTS Score Calculator — Powerlifting DOTS",
    metaDescription: "Free DOTS calculator for powerlifting. Get your DOTS score and coefficient from total and bodyweight, in kg or lb.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), dropdown("unit", "Unit", UNIT, 1), numberField("bodyweight", "Bodyweight", { default: 83, min: 20, max: 500, step: 0.1 }), numberField("total", "Total (Squat + Bench + Deadlift)", { default: 600, max: 3000, step: 0.5 })],
    calcResult: { label: "DOTS Score", format: "number" },
    calcResults: [num("dotsScore", "DOTS Score", true), num("dotsCoefficient", "DOTS Coefficient", false, 4), num("totalKg", "Total in kg")],
    instructions: "Choose your sex and unit, then enter bodyweight and total.",
    examples: "Example: an 83 kg man with a 600 kg total has a DOTS coefficient of 0.6751 and a DOTS score of 405.05.",
    assumptions: "DOTS (Dynamic Objective Team Scoring) coefficients from 2019. Bodyweight is limited to 40–210 kg (men) and 40–150 kg (women). " + DISCLAIMER,
    faq: [
      { question: "What is a good DOTS score?", answer: "Around 300 is a decent gym lifter, 400 competitive, 500+ elite." },
      { question: "DOTS vs Wilks — what's the difference?", answer: "DOTS was built from more recent data and treats very light and very heavy lifters more fairly than the original Wilks formula. The numbers are on a similar scale." },
    ],
  },
  {
    slug: "ipf-gl-points-calculator",
    title: "IPF GL Points Calculator",
    description: "Calculate IPF GL (Goodlift) points — the IPF's official formula since 2020 — for classic or equipped lifting, full powerlifting or bench press only.",
    metaTitle: "IPF GL Points Calculator — Goodlift Points",
    metaDescription: "Free IPF GL points calculator. Get Goodlift points for classic or equipped powerlifting and bench-only totals by bodyweight and sex.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("equipment", "Equipment", [["Classic (Raw)", 1], ["Equipped", 2]], 1),
      dropdown("event", "Event", [["Powerlifting (3 Lifts)", 1], ["Bench Press Only", 2]], 1),
      dropdown("unit", "Unit", UNIT, 1),
      numberField("bodyweight", "Bodyweight", { default: 83, min: 20, max: 500, step: 0.1 }),
      numberField("total", "Total (or Bench for Bench-Only)", { default: 600, max: 3000, step: 0.5 }),
    ],
    calcResult: { label: "GL Points", format: "number" },
    calcResults: [num("glPoints", "IPF GL Points", true), num("glCoefficient", "GL Coefficient", false, 5), num("totalKg", "Total in kg")],
    instructions: "Choose sex, equipment and event, then enter your bodyweight and result.",
    examples: "Example: an 83 kg man with a 600 kg classic total scores 83.06 GL points (coefficient 0.13843).",
    assumptions: "GL = result × 100 ÷ (A − B × e^(−C × bodyweight)), with the IPF's published A, B, C for each sex, equipment and event. Not defined below 35 kg bodyweight. " + DISCLAIMER,
    faq: [
      { question: "What is a good IPF GL score?", answer: "Around 70 is a strong local lifter, 90+ national level and 100+ world class." },
      { question: "Why does the IPF use GL points?", answer: "They were built from IPF competition results and give each weight class a fair chance for best-lifter awards." },
    ],
  },
  {
    slug: "sinclair-calculator",
    title: "Sinclair Calculator",
    description: "Calculate your Sinclair total — Olympic weightlifting's bodyweight-adjusted score — from your snatch + clean & jerk total, by Olympic-cycle coefficients.",
    metaTitle: "Sinclair Calculator — Weightlifting Sinclair Total",
    metaDescription: "Free Sinclair calculator for Olympic weightlifting. Turn your total and bodyweight into a Sinclair total and coefficient.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("cycle", "Coefficient Cycle", [["2021–2024 (Paris)", 1], ["2017–2020 (Tokyo)", 2]], 1),
      dropdown("unit", "Unit", UNIT, 1),
      numberField("bodyweight", "Bodyweight", { default: 81, min: 20, max: 500, step: 0.1 }),
      numberField("total", "Total (Snatch + Clean & Jerk)", { default: 300, max: 1000, step: 0.5 }),
    ],
    calcResult: { label: "Sinclair Total", format: "number" },
    calcResults: [num("sinclairTotal", "Sinclair Total", true), num("sinclairCoefficient", "Sinclair Coefficient", false, 4), num("totalKg", "Total in kg")],
    instructions: "Choose sex and coefficient cycle, then enter bodyweight and total.",
    examples: "Example: an 81 kg man with a 300 kg total has a Sinclair coefficient of 1.2691 — a Sinclair total of 380.74 kg.",
    assumptions: "Coefficient = 10^(A × log10(bodyweight ÷ b)²) below b, otherwise 1. 2021–2024: men A 0.722762521, b 193.609; women A 0.787004341, b 153.757. 2017–2020: men 0.75194503 / 175.508; women 0.783497476 / 153.655. " + DISCLAIMER,
    faq: [
      { question: "What is a good Sinclair total?", answer: "About 250 kg is a competitive club lifter for men, 350+ national level and 450+ world class." },
      { question: "Why do the coefficients change?", answer: "They're recalculated each Olympic cycle from the current heavyweight world records." },
    ],
  },
  {
    slug: "powerlifting-total-calculator",
    title: "Powerlifting Total Calculator",
    description: "Add up your powerlifting total (squat + bench + deadlift) in kg and lb, see each lift's share of the total, and get your DOTS score.",
    metaTitle: "Powerlifting Total Calculator — Squat Bench Deadlift",
    metaDescription: "Free powerlifting total calculator. Add squat, bench and deadlift, convert kg/lb, see each lift's share and your DOTS score.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unit", "Unit", UNIT, 1),
      numberField("squat", "Squat", { default: 200, max: 1500, step: 0.5 }),
      numberField("bench", "Bench Press", { default: 130, max: 1500, step: 0.5 }),
      numberField("deadlift", "Deadlift", { default: 240, max: 1500, step: 0.5 }),
      numberField("bodyweight", "Bodyweight (for DOTS)", { default: 90, max: 500, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total", format: "number" },
    calcResults: [num("total", "Powerlifting Total", true), num("totalInOtherUnit", "Total in the Other Unit"), pct("squatShare", "Squat Share"), pct("benchShare", "Bench Share"), pct("deadliftShare", "Deadlift Share"), num("dotsScore", "DOTS Score")],
    instructions: "Enter your best squat, bench and deadlift and your bodyweight.",
    examples: "Example: a 200 kg squat, 130 kg bench and 240 kg deadlift is a 570 kg (1,256.6 lb) total — 35% squat, 23% bench, 42% deadlift. At 90 kg bodyweight that's 368.6 DOTS.",
    assumptions: "Typical shares are about 35% squat, 25% bench and 40% deadlift; a very different split can point to a lagging lift. " + DISCLAIMER,
    faq: [
      { question: "What is a 1,000 lb total?", answer: "A classic milestone — squat, bench and deadlift adding up to 1,000 lb (about 454 kg). The next landmarks are 1,200 and 1,500 lb." },
      { question: "Does the total have to be from one meet?", answer: "Officially yes. Gym totals often combine lifts from different days, which makes them a little higher." },
    ],
  },
  {
    slug: "olympic-weightlifting-total-calculator",
    title: "Olympic Weightlifting Total Calculator",
    description: "Add up your Olympic weightlifting total (snatch + clean & jerk), check your snatch-to-clean & jerk balance and get your Sinclair total.",
    metaTitle: "Olympic Weightlifting Total Calculator",
    metaDescription: "Free weightlifting total calculator. Add snatch and clean & jerk, check the snatch-to-C&J ratio and get your Sinclair total.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unit", "Unit", UNIT, 1),
      numberField("snatch", "Snatch", { default: 100, max: 500, step: 0.5 }),
      numberField("cleanAndJerk", "Clean & Jerk", { default: 125, max: 600, step: 0.5 }),
      numberField("bodyweight", "Bodyweight (for Sinclair)", { default: 81, max: 500, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total", format: "number" },
    calcResults: [num("total", "Weightlifting Total", true), num("totalInOtherUnit", "Total in the Other Unit"), pct("snatchToCleanJerkRatio", "Snatch as % of Clean & Jerk"), num("expectedSnatch", "Snatch at the Typical 80% Ratio"), num("sinclairTotal", "Sinclair Total (2021–2024)")],
    instructions: "Enter your best snatch and clean & jerk, and your bodyweight for the Sinclair total.",
    examples: "Example: a 100 kg snatch and 125 kg clean & jerk is a 225 kg total with a perfectly typical 80% ratio. At 81 kg bodyweight that's a 285.6 kg Sinclair total.",
    assumptions: "Most lifters snatch about 78–83% of their clean & jerk. A much lower ratio usually means snatch technique is holding the total back. " + DISCLAIMER,
    faq: [
      { question: "What is a good snatch to clean & jerk ratio?", answer: "About 80%. Below 75% suggests working on the snatch; above 85% suggests strength or jerk technique is limiting the clean & jerk." },
      { question: "How is a weightlifting total scored at a meet?", answer: "Your best successful snatch plus your best successful clean & jerk, from three attempts each." },
    ],
  },
  {
    slug: "powerlifting-attempt-calculator",
    title: "Powerlifting Attempt Calculator",
    description: "Pick your three meet attempts — opener, second and third — for a lift from your expected max, with a conservative, standard or aggressive strategy.",
    metaTitle: "Powerlifting Attempt Calculator — Meet Attempts",
    metaDescription: "Free powerlifting attempt calculator. Choose your opener, second and third attempts from your expected max and strategy.",
    calcInputs: [
      numberField("expectedMax", "Expected Max on the Day", { default: 200, max: 1500, step: 0.5 }),
      dropdown("strategy", "Strategy", [["Conservative (88% / 94% / 99%)", 1], ["Standard (91% / 96% / 101%)", 2], ["Aggressive (93% / 98% / 103%)", 3]], 2),
      numberField("increment", "Loading Increment (2.5 kg / 5 lb)", { default: 2.5, min: 0.5, max: 10, step: 0.5 }),
    ],
    calcResult: { label: "Opener", format: "number" },
    calcResults: [num("opener", "Opener (1st Attempt)", true), num("secondAttempt", "2nd Attempt"), num("thirdAttempt", "3rd Attempt"), pct("thirdVsMaxPercent", "3rd Attempt vs Expected Max")],
    instructions: "Enter the max you realistically expect on meet day (not your best day ever), choose a strategy, and the loading increment your federation uses.",
    examples: "Example: with a 200 kg expected max and the standard strategy, open at 182.5 kg, take 192.5 kg second and go for 202.5 kg on the third — a 1.25% PR attempt.",
    assumptions: "The opener should be a weight you could triple on a bad day. Adjust the second and third attempts live based on how the previous one moved. Also covers the meet attempt selection calculator. " + DISCLAIMER,
    faq: [
      { question: "What should my opener be?", answer: "About 90–92% of your expected max — heavy enough to count, light enough that you make it even when nervous." },
      { question: "Can I change attempts during the meet?", answer: "Yes. Most federations let you change your next attempt within about a minute of the previous lift, and the third deadlift can usually be changed twice." },
    ],
  },
  {
    slug: "powerlifting-warm-up-calculator",
    title: "Powerlifting Warm-Up Calculator",
    description: "Plan your warm-up sets for a meet or heavy day — from the empty bar up to your opener — with weights and reps for 4, 5 or 6 warm-up sets.",
    metaTitle: "Powerlifting Warm-Up Calculator — Meet Warm-Ups",
    metaDescription: "Free powerlifting warm-up calculator. Get warm-up weights and reps from the bar up to your opener for 4, 5 or 6 sets.",
    calcInputs: [
      numberField("opener", "Opener / Top Set Weight", { default: 180, max: 1500, step: 0.5 }),
      numberField("barWeight", "Bar Weight", { default: 20, max: 100, step: 0.5 }),
      dropdown("warmUpSets", "Number of Warm-Up Sets", [["4 sets", 4], ["5 sets", 5], ["6 sets", 6]], 5),
      numberField("increment", "Loading Increment", { default: 2.5, min: 0.5, max: 10, step: 0.5 }),
    ],
    calcResult: { label: "Opener", format: "number" },
    calcResults: [
      num("opener", "Opener", true),
      num("set1Weight", "Set 1 Weight"),
      num("set1Reps", "Set 1 Reps"),
      num("set2Weight", "Set 2 Weight"),
      num("set2Reps", "Set 2 Reps"),
      num("set3Weight", "Set 3 Weight"),
      num("set3Reps", "Set 3 Reps"),
      num("set4Weight", "Set 4 Weight"),
      num("set4Reps", "Set 4 Reps"),
      num("set5Weight", "Set 5 Weight"),
      num("set5Reps", "Set 5 Reps"),
      num("set6Weight", "Set 6 Weight"),
      num("set6Reps", "Set 6 Reps"),
    ],
    instructions: "Enter your opener (or the top set of the day), your bar weight and how many warm-up sets you like. Unused sets show 0.",
    examples: "Example: for a 180 kg opener with 5 warm-ups: bar × 5, 72.5 × 5, 107.5 × 3, 135 × 2 and 157.5 × 1, then the opener.",
    assumptions: "Warm-ups end around 85–90% of the opener with single reps, so you stay fresh. At meets, time warm-ups so the last one is about 5–10 minutes before your attempt. " + DISCLAIMER,
    faq: [
      { question: "How many warm-up sets before an opener?", answer: "Usually 4–6. Stronger lifters need more steps; lighter lifters can use fewer." },
      { question: "Should I do a warm-up heavier than my opener?", answer: "No — save your energy. The last warm-up is usually about 90% of the opener." },
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
