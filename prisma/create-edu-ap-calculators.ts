// One-time (but safe to re-run) batch setup script: creates 23 AP score calculators from the
// user's jobs & education list (Jobs & Education Calculators > AP Score Calculators). Each
// exam's format and cut-points live in AP_EXAMS in src/lib/calc-engine-edu-ap.ts; the copy
// and examples are generated from that data so they always match the calculator.
// "Albert AP Lit Score Calculator" is built as the brand-neutral AP Lit calculator.
//
// HOW TO RUN (after prisma/setup-jobs-education-category.ts --apply)
//   npx tsx prisma/create-edu-ap-calculators.ts
// or
//   npm run db:create-edu-ap-calculators

import * as E from "../src/lib/calc-engine-edu-ap";
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

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return { key, label, type: "number", unit: opts.unit, required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

interface ToolDef {
  slug: string;
  title: string;
  category: string;
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

const CAT = "ap-score-calculators";

/** [slug, page title, short name used in copy]. */
const PAGES: [string, string, string][] = [
  ["ap-lang-score-calculator", "AP Lang Score Calculator", "AP Lang"],
  ["ap-lit-score-calculator", "AP Lit Score Calculator", "AP Lit"],
  ["ap-world-score-calculator", "AP World Score Calculator", "AP World History"],
  ["ap-us-history-grade-calculator", "AP US History Score Calculator", "APUSH"],
  ["ap-euro-calculator", "AP Euro Score Calculator", "AP Euro"],
  ["apes-score-calculator", "APES Score Calculator", "APES"],
  ["ap-stats-calculator", "AP Stats Score Calculator", "AP Statistics"],
  ["ap-csp-score-calculator", "AP CSP Score Calculator", "AP CSP"],
  ["ap-csa-score-calculator", "AP CSA Score Calculator", "AP CSA"],
  ["ap-chinese-score-calculator", "AP Chinese Score Calculator", "AP Chinese"],
  ["ap-seminar-score-calculator", "AP Seminar Score Calculator", "AP Seminar"],
  ["ap-government-score-calculator", "AP Government Score Calculator", "AP Gov"],
  ["ap-comparative-government-score-calculator", "AP Comparative Government Score Calculator", "AP Comp Gov"],
  ["ap-spanish-language-and-culture-score-calculator", "AP Spanish Language and Culture Score Calculator", "AP Spanish Language"],
  ["ap-french-calculator", "AP French Score Calculator", "AP French"],
  ["ap-german-score-calculator", "AP German Score Calculator", "AP German"],
  ["ap-japanese-score-calculator", "AP Japanese Score Calculator", "AP Japanese"],
  ["ap-biology-calculator", "AP Biology Score Calculator", "AP Bio"],
  ["ap-african-american-studies-score-calculator", "AP African American Studies Score Calculator", "AP African American Studies"],
  ["ap-psych-test-calculator", "AP Psych Score Calculator", "AP Psych"],
  ["ap-hug-calculator-score", "AP HUG Score Calculator", "AP Human Geography"],
  ["apah-score-calculator", "APAH Score Calculator", "AP Art History"],
];

const RESULTS = [
  { key: "predictedApScore", label: "Predicted AP Score (1–5)", format: "number", highlight: true },
  { key: "compositePercent", label: "Composite Score", format: "percentage" },
  { key: "multipleChoicePercent", label: "Multiple-Choice Correct", format: "percentage" },
  { key: "freeResponsePercent", label: "Free-Response Points Earned", format: "percentage" },
  { key: "compositePointsToNextScore", label: "Composite Points to the Next Score", format: "number" },
];

const pctW = (w: number) => `${Math.round(w * 1000) / 10}%`;

function apTool([slug, title, short]: [string, string, string]): ToolDef {
  const exam = E.AP_EXAMS[slug];
  if (!exam) throw new Error(`No AP config for ${slug}`);
  const values: Record<string, number> = { mcCorrect: exam.example[0] };
  exam.frqs.forEach((_, i) => (values[`frq${i + 1}`] = exam.example[i + 1]));
  const ex = E.apExamScore(exam)(values) as Record<string, number>;
  const hasMc = exam.mcCount > 0;
  const format = [
    hasMc ? `${exam.mcCount} multiple-choice questions (${pctW(exam.mcWeight)})` : null,
    ...exam.frqs.map(([l, max, w]) => `${l} (${max} points, ${pctW(w)})`),
  ].filter(Boolean).join("; ");
  const exampleParts = [hasMc ? `${exam.example[0]} of ${exam.mcCount} multiple choice right` : null, ...exam.frqs.map(([l, max], i) => `${exam.example[i + 1]}/${max} on ${l}`)].filter(Boolean);
  return {
    slug,
    title,
    category: CAT,
    description: `Predict your ${exam.name} exam score — enter your ${hasMc ? "multiple-choice correct and " : ""}${hasMc ? "free-response" : "component"} scores to estimate your composite and whether you're on track for a 3, 4 or 5.`,
    metaTitle: `${title} — Predict Your 1–5 Score`.slice(0, 70),
    metaDescription: `Free ${short} score calculator. Estimate your ${exam.name} composite score and predicted AP score from your ${hasMc ? "multiple-choice and FRQ" : "component"} scores.`,
    calcInputs: [
      ...(hasMc ? [numberField("mcCorrect", `Multiple-Choice Correct (out of ${exam.mcCount})`, { default: exam.example[0], max: exam.mcCount })] : []),
      ...exam.frqs.map(([l, max], i) => numberField(`frq${i + 1}`, `${l} (out of ${max})`, { default: exam.example[i + 1], max, step: max >= 100 ? 1 : 0.5 })),
    ],
    calcResult: { label: "Predicted AP Score", format: "number" },
    calcResults: RESULTS,
    instructions: `Score a practice exam or released questions: enter ${hasMc ? "how many multiple-choice questions you got right and " : ""}your points on each ${hasMc ? "free-response question" : "component"} using the College Board scoring guidelines. There's no penalty for wrong answers on AP multiple choice.`,
    examples: `Example: ${exampleParts.join(", ")} gives a composite of about ${ex.compositePercent}% — a predicted ${ex.predictedApScore}${ex.predictedApScore < 5 ? `, ${ex.compositePointsToNextScore} composite points short of a ${ex.predictedApScore + 1}` : ""}.`,
    assumptions: `Exam format used: ${format}. Cut-points (composite % for a 5 / 4 / 3 / 2): ${exam.cuts.join(" / ")} — estimates from past score distributions; the College Board sets the real curve each year after scoring. Not affiliated with the College Board.`,
    faq: [
      { question: `What percentage do you need for a 5 on ${short}?`, answer: `Roughly ${exam.cuts[0]}% of the composite in this model, and about ${exam.cuts[2]}% for a 3 — the exact curve changes slightly every year.` },
      { question: `How is the ${short} exam scored?`, answer: `${hasMc ? `Multiple choice is worth ${pctW(exam.mcWeight)} and the free-response section the rest` : "The three components are combined by their weights"}; the weighted composite is converted to a 1–5 score.` },
    ],
  };
}

const generic = E.apScoreAnyExam({ mcCorrect: 42, mcTotal: 60, mcWeightPercent: 50, frqEarned: 24, frqPossible: 36 }) as Record<string, number>;

const TOOLS: ToolDef[] = [
  ...PAGES.map(apTool),
  {
    slug: "ap-score-calculator",
    title: "AP Score Calculator",
    category: CAT,
    description: "Predict your score on any AP exam — enter your multiple-choice and free-response results and the section weights to estimate your composite and 1–5 AP score.",
    metaTitle: "AP Score Calculator — Predict Any AP Exam Score",
    metaDescription: "Free AP score calculator for any AP exam. Enter multiple-choice and free-response scores and weights to predict your 1–5 AP score.",
    calcInputs: [
      numberField("mcCorrect", "Multiple-Choice Correct", { default: 42, max: 200 }),
      numberField("mcTotal", "Multiple-Choice Questions", { default: 60, min: 1, max: 200 }),
      percentField("mcWeightPercent", "Multiple-Choice Weight", { default: 50, max: 100, step: 5 }),
      numberField("frqEarned", "Free-Response Points Earned", { default: 24, max: 500, step: 0.5 }),
      numberField("frqPossible", "Free-Response Points Possible", { default: 36, min: 1, max: 500 }),
    ],
    calcResult: { label: "Predicted AP Score", format: "number" },
    calcResults: RESULTS,
    instructions: "Enter your multiple-choice result, the section's weight (usually 40–60%), and your total free-response points out of the points possible. For a subject-specific estimate, use that exam's own calculator.",
    examples: `Example: 42/60 on multiple choice (50%) and 24/36 free-response points give a ${generic.compositePercent}% composite — a predicted ${generic.predictedApScore}.`,
    assumptions: "Uses generic cut-points of about 70% for a 5, 57% for a 4, 44% for a 3 and 31% for a 2; individual exams vary by several points. AP scores: 5 extremely well qualified, 4 well qualified, 3 qualified — many colleges give credit for 3s or 4s.",
    faq: [
      { question: "Is a 3 a good AP score?", answer: "A 3 is 'qualified' and earns credit at many colleges; selective colleges often require a 4 or 5." },
      { question: "When do AP scores come out?", answer: "In early July each year." },
    ],
  },
];

async function main() {
  const categoryIds = new Map<string, string>();
  for (const slug of new Set(TOOLS.map((t) => t.category))) {
    const c = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!c) throw new Error(`The "${slug}" category doesn't exist — run "npx tsx prisma/restructure-real-estate-main-category.ts --apply" first.`);
    categoryIds.set(slug, c.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: categoryIds.get(def.category)!,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
