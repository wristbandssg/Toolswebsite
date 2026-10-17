// One-time (but safe to re-run) batch setup script: creates 14 SAT, ACT and K-12 test tools
// from the user's jobs & education list (Jobs & Education Calculators > SAT, ACT & School Test
// Calculators). "SSAT Percentile Calculator" is merged into ssat-score-calculator. Examples are
// computed from src/lib/calc-engine-edu-tests.ts so the copy always matches the calculator.
//
// HOW TO RUN (after prisma/setup-jobs-education-category.ts --apply)
//   npx tsx prisma/create-edu-tests-calculators.ts
// or
//   npm run db:create-edu-tests-calculators

import * as E from "../src/lib/calc-engine-edu-tests";
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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
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

const CAT = "sat-act-school-test-calculators";
const run = (fn: E.CustomCalculator, values: Record<string, number>) => fn(values) as Record<string, number>;
const n = (key: string, label: string, def: number, max: number, required = true, step = 1, min = 0) => numberField(key, label, { default: def, max, required, step, min });

const V = {
  sat: { rwModule1: 22, rwModule2: 19, mathModule1: 18, mathModule2: 15 },
  psat: { rwModule1: 21, rwModule2: 18, mathModule1: 17, mathModule2: 14 },
  act: { englishCorrect: 40, mathCorrect: 33, readingCorrect: 28, scienceCorrect: 30 },
  sup: { english1: 27, math1: 25, reading1: 29, science1: 26, english2: 30, math2: 24, reading2: 27, science2: 28, english3: 0, math3: 0, reading3: 0, science3: 0 },
  a2s: { score: 29, satToAct: 0 },
  p2s: { psatScore: 1180, monthsUntilSat: 8, prepHours: 30 },
  nmsi: { readingWriting: 720, math: 740, commendedCutoff: 207, stateCutoff: 216 },
  shsat: { elaCorrect: 49, mathCorrect: 48, targetCutoff: 561 },
  ssat: { level: 0, quantCorrect: 38, quantTotal: 50, verbalCorrect: 44, verbalTotal: 60, readingCorrect: 28, readingTotal: 40 },
  isee: { verbalCorrect: 32, verbalTotal: 40, quantCorrect: 28, quantTotal: 37, readingCorrect: 27, readingTotal: 36, mathCorrect: 36, mathTotal: 47 },
  eoc: { courseGrade: 84, eocScore: 72, eocWeight: 30, targetGrade: 80 },
  sol: { correct: 36, totalQuestions: 50, passPercent: 60, advancedPercent: 85 },
  reg: { part1Correct: 19, part2Essay: 4, part3Analysis: 3 },
  schol: { actScore: 29, gpa: 3.6, tuition: 12000 },
};
const X = {
  sat: run(E.satScore, V.sat), psat: run(E.psatScore, V.psat), act: run(E.actScore, V.act), sup: run(E.actSuperscore, V.sup),
  a2s: run(E.actToSat, V.a2s), p2s: run(E.psatToSat, V.p2s), nmsi: run(E.nationalMeritIndex, V.nmsi), shsat: run(E.shsatScore, V.shsat),
  ssat: run(E.ssatScore, V.ssat), isee: run(E.iseeScore, V.isee), eoc: run(E.eocScore, V.eoc), sol: run(E.solScore, V.sol),
  reg: run(E.englishRegentsScore, V.reg), schol: run(E.actScholarship, V.schol),
};

const satInputs = (d: typeof V.sat) => [
  n("rwModule1", "Reading & Writing Module 1 Correct (of 27)", d.rwModule1, 27),
  n("rwModule2", "Reading & Writing Module 2 Correct (of 27)", d.rwModule2, 27),
  n("mathModule1", "Math Module 1 Correct (of 22)", d.mathModule1, 22),
  n("mathModule2", "Math Module 2 Correct (of 22)", d.mathModule2, 22),
];

const TOOLS: ToolDef[] = [
  {
    slug: "sat-score-calculator",
    title: "SAT Score Calculator",
    category: CAT,
    description: "Estimate your digital SAT score from a practice test — correct answers in each Reading & Writing and Math module, with the adaptive second module — plus your total score and percentile.",
    metaTitle: "SAT Score Calculator — Digital SAT Score & Percentile",
    metaDescription: "Free SAT score calculator for the digital SAT. Estimate your section scores, total (400–1600) and percentile from correct answers per module.",
    calcInputs: satInputs(V.sat),
    calcResult: { label: "SAT Total Score", format: "number" },
    calcResults: [
      { key: "totalScore", label: "Estimated SAT Total (400–1600)", format: "number", highlight: true },
      { key: "readingWritingScore", label: "Reading & Writing (200–800)", format: "number" },
      { key: "mathScore", label: "Math (200–800)", format: "number" },
      { key: "estimatedPercentile", label: "Estimated Percentile", format: "number" },
      { key: "harderSecondModules", label: "Harder Second Modules Reached (0–2)", format: "number" },
    ],
    instructions: "Enter how many questions you got right in each module of a full-length practice SAT (27 per Reading & Writing module, 22 per Math module). Doing well on module 1 routes you to a harder module 2, which is needed for top scores.",
    examples: `Example: 22 + 19 correct in Reading & Writing and 18 + 15 in Math (both harder second modules) estimate to ${X.sat.readingWritingScore} + ${X.sat.mathScore} = ${X.sat.totalScore}, about the ${X.sat.estimatedPercentile}th percentile.`,
    assumptions: "The digital SAT is adaptive and scored with item response theory, so the same number of correct answers can give different scores; some questions are unscored pretest items. This uses a calibrated approximation: an easier module 2 caps a section around the mid-600s. Bluebook practice tests give official estimates. Not affiliated with the College Board.",
    faq: [
      { question: "How is the digital SAT scored?", answer: "Each section is scored 200–800 from the questions you answer and their difficulty; your module 1 performance decides whether module 2 is harder or easier." },
      { question: "What is a good SAT score?", answer: "About 1050 is average; 1350+ is around the 90th percentile and competitive for selective colleges." },
    ],
  },
  {
    slug: "psat-score-calculator",
    title: "PSAT Score Calculator",
    category: CAT,
    description: "Estimate your PSAT/NMSQT or PSAT 10 score from a practice test — section scores on the 160–760 scale, total (320–1520), the National Merit Selection Index and percentile.",
    metaTitle: "PSAT Score Calculator — PSAT/NMSQT Score & Selection Index",
    metaDescription: "Free PSAT score calculator. Estimate your PSAT section scores, total (320–1520), Selection Index and percentile from correct answers.",
    calcInputs: satInputs(V.psat),
    calcResult: { label: "PSAT Total", format: "number" },
    calcResults: [
      { key: "totalScore", label: "Estimated PSAT Total (320–1520)", format: "number", highlight: true },
      { key: "readingWritingScore", label: "Reading & Writing (160–760)", format: "number" },
      { key: "mathScore", label: "Math (160–760)", format: "number" },
      { key: "selectionIndex", label: "National Merit Selection Index", format: "number" },
      { key: "estimatedPercentile", label: "Estimated Percentile", format: "number" },
    ],
    instructions: "Enter your correct answers in each module of a practice PSAT (27 per Reading & Writing module, 22 per Math module).",
    examples: `Example: 21 + 18 in Reading & Writing and 17 + 14 in Math estimate to ${X.psat.totalScore} (${X.psat.readingWritingScore} RW, ${X.psat.mathScore} Math) with a Selection Index of ${X.psat.selectionIndex}.`,
    assumptions: "The PSAT is the same adaptive format as the SAT with a 160–760 section scale. Only the PSAT/NMSQT taken in 11th grade counts for National Merit. Percentiles are estimates.",
    faq: [
      { question: "What is a good PSAT score?", answer: "Around 1000 is average for juniors; 1350+ is a strong score and 1400+ is often in National Merit range." },
      { question: "Is the PSAT the same as the SAT?", answer: "Very similar in format and content, scored on a slightly lower scale (320–1520)." },
    ],
  },
  {
    slug: "act-score-calculator",
    title: "ACT Score Calculator",
    category: CAT,
    description: "Estimate your ACT scores from a practice test — English, Math, Reading and optional Science on the 1–36 scale, your composite (English, Math and Reading), STEM score and percentile, for the enhanced ACT.",
    metaTitle: "ACT Score Calculator — Enhanced ACT Composite & Percentile",
    metaDescription: "Free ACT score calculator for the enhanced ACT. Estimate section scores, composite, STEM score and percentile from correct answers.",
    calcInputs: [
      n("englishCorrect", "English Correct (of 50)", V.act.englishCorrect, 50),
      n("mathCorrect", "Math Correct (of 45)", V.act.mathCorrect, 45),
      n("readingCorrect", "Reading Correct (of 36)", V.act.readingCorrect, 36),
      n("scienceCorrect", "Science Correct (of 40, Optional — 0 If Not Taken)", V.act.scienceCorrect, 40, false),
    ],
    calcResult: { label: "ACT Composite", format: "number" },
    calcResults: [
      { key: "compositeScore", label: "Composite Score (1–36)", format: "number", highlight: true },
      { key: "englishScore", label: "English", format: "number" },
      { key: "mathScore", label: "Math", format: "number" },
      { key: "readingScore", label: "Reading", format: "number" },
      { key: "scienceScore", label: "Science", format: "number" },
      { key: "stemScore", label: "STEM Score", format: "number" },
      { key: "estimatedPercentile", label: "Estimated Percentile", format: "number" },
    ],
    instructions: "Enter your correct answers in each section of a practice ACT. Science is optional on the enhanced ACT; enter 0 if you skipped it.",
    examples: `Example: 40/50 English, 33/45 Math and 28/36 Reading estimate to ${X.act.englishScore}, ${X.act.mathScore} and ${X.act.readingScore} — a ${X.act.compositeScore} composite (about the ${X.act.estimatedPercentile}th percentile).`,
    assumptions: "Since 2025 the ACT is shorter (English 50, Math 45, Reading 36 questions; Science 40, optional) and the composite averages English, Math and Reading. Raw-to-scale conversion varies by test form; this uses an even mapping. Not affiliated with ACT, Inc.",
    faq: [
      { question: "How is the ACT composite calculated?", answer: "On the enhanced ACT, it's the average of English, Math and Reading, rounded to the nearest whole number." },
      { question: "What is a good ACT score?", answer: "About 20 is average; 28+ is around the top 12%, and 33+ is in the top 2%." },
    ],
  },
  {
    slug: "act-superscore-calculator",
    title: "ACT Superscore Calculator",
    category: CAT,
    description: "Calculate your ACT superscore — your best English, Math and Reading scores across up to three test dates averaged into one composite — and how much it beats your best single sitting.",
    metaTitle: "ACT Superscore Calculator — Best Sections Across Tests",
    metaDescription: "Free ACT superscore calculator. Combine your best English, Math and Reading scores from up to three test dates into your superscore.",
    calcInputs: [1, 2, 3].flatMap((i) => [
      n(`english${i}`, `Test ${i}: English`, V.sup[`english${i}` as keyof typeof V.sup], 36, i === 1),
      n(`math${i}`, `Test ${i}: Math`, V.sup[`math${i}` as keyof typeof V.sup], 36, i === 1),
      n(`reading${i}`, `Test ${i}: Reading`, V.sup[`reading${i}` as keyof typeof V.sup], 36, i === 1),
      n(`science${i}`, `Test ${i}: Science (Optional)`, V.sup[`science${i}` as keyof typeof V.sup], 36, false),
    ]),
    calcResult: { label: "ACT Superscore", format: "number" },
    calcResults: [
      { key: "superscore", label: "ACT Superscore", format: "number", highlight: true },
      { key: "bestSingleComposite", label: "Best Single-Test Composite", format: "number" },
      { key: "superscoreGain", label: "Gain from Superscoring", format: "number" },
      { key: "bestEnglish", label: "Best English", format: "number" },
      { key: "bestMath", label: "Best Math", format: "number" },
      { key: "bestReading", label: "Best Reading", format: "number" },
      { key: "bestScience", label: "Best Science", format: "number" },
    ],
    instructions: "Enter your section scores from each ACT you took (leave a third test at 0 if you only took two).",
    examples: `Example: a 27-25-29 sitting and a 30-24-27 sitting superscore to ${X.sup.superscore} (best English 30, Math 25, Reading 29) — ${X.sup.superscoreGain} point above the best single composite of ${X.sup.bestSingleComposite}.`,
    assumptions: "ACT reports a superscore when you've tested more than once. With the enhanced ACT, the composite (and superscore) uses English, Math and Reading. Many colleges accept superscores, but some still use your best single sitting — check each college's policy.",
    faq: [
      { question: "Do colleges accept ACT superscores?", answer: "Many do, including most selective colleges, but policies vary." },
      { question: "Does ACT calculate the superscore for me?", answer: "Yes, if you've taken the test more than once since September 2016, ACT can send a superscore report." },
    ],
  },
  {
    slug: "act-to-sat-conversion-calculator",
    title: "ACT to SAT Conversion Calculator",
    category: CAT,
    description: "Convert an ACT composite to an SAT total score — or an SAT score to the equivalent ACT — using the official ACT/College Board concordance tables.",
    metaTitle: "ACT to SAT Conversion Calculator — Concordance Table",
    metaDescription: "Free ACT to SAT conversion calculator. Convert ACT composite to SAT total (and SAT to ACT) with the official concordance.",
    calcInputs: [
      dropdown("satToAct", "Convert", [["ACT → SAT", 0], ["SAT → ACT", 1]], 0),
      n("score", "Your Score (ACT 1–36 or SAT 400–1600)", 29, 1600, true, 1, 1),
    ],
    calcResult: { label: "Converted Score", format: "number" },
    calcResults: [
      { key: "convertedScore", label: "Equivalent Score", format: "number", highlight: true },
      { key: "satEquivalentRange", label: "SAT Concordance Point", format: "number" },
      { key: "estimatedPercentile", label: "Estimated Percentile", format: "number" },
    ],
    instructions: "Pick the direction and enter your ACT composite or SAT total.",
    examples: `Example: an ACT composite of 29 corresponds to an SAT of about ${X.a2s.convertedScore}.`,
    assumptions: "Uses the 2018 ACT/SAT concordance (the most recent joint table). The enhanced ACT's composite may compare slightly differently; colleges use concordance to compare applicants who took different tests.",
    faq: [
      { question: "What SAT score is a 30 ACT?", answer: "About 1370 on the SAT." },
      { question: "Should I take the ACT or SAT?", answer: "Take a practice test of each and compare your converted scores — focus on the one where you score higher." },
    ],
  },
  {
    slug: "psat-to-sat-score-calculator",
    title: "PSAT to SAT Score Calculator",
    category: CAT,
    description: "Predict your SAT score from your PSAT — the same-scale equivalent plus typical growth from more months of school and the hours of prep you plan.",
    metaTitle: "PSAT to SAT Score Calculator — Predict Your SAT Score",
    metaDescription: "Free PSAT to SAT calculator. Predict your SAT score from your PSAT, months until the SAT and planned prep hours.",
    calcInputs: [
      n("psatScore", "PSAT Total Score (320–1520)", V.p2s.psatScore, 1520, true, 10, 320),
      n("monthsUntilSat", "Months Until Your SAT", V.p2s.monthsUntilSat, 36),
      n("prepHours", "Hours of Focused Prep Planned", V.p2s.prepHours, 300, false),
    ],
    calcResult: { label: "Projected SAT", format: "number" },
    calcResults: [
      { key: "projectedSat", label: "Projected SAT Score", format: "number", highlight: true },
      { key: "expectedGrowth", label: "Expected Growth", format: "number" },
      { key: "sameDayEquivalent", label: "SAT Equivalent Today", format: "number" },
      { key: "estimatedPercentile", label: "Estimated SAT Percentile", format: "number" },
    ],
    instructions: "Enter your PSAT total, how many months until your SAT and how many hours of prep you'll do (practice tests, Khan Academy or tutoring).",
    examples: `Example: a 1180 PSAT with the SAT 8 months away and 30 hours of prep projects to about ${X.p2s.projectedSat} (+${X.p2s.expectedGrowth}).`,
    assumptions: "PSAT scores are on the same scale as the SAT, so a PSAT score predicts the SAT you'd get that day. Growth (about 5 points per month of schooling plus diminishing returns from prep) is a typical-pattern estimate — individual results vary widely.",
    faq: [
      { question: "Does PSAT predict SAT score?", answer: "Yes — the PSAT uses the same scale, so it's a good estimate of the SAT you'd score at the same time." },
      { question: "How much do scores go up from PSAT to SAT?", answer: "Students often gain 30–100 points with extra months of school and practice." },
    ],
  },
  {
    slug: "national-merit-selection-index-calculator",
    title: "National Merit Selection Index Calculator",
    category: CAT,
    description: "Calculate your National Merit Selection Index from your PSAT/NMSQT section scores — (2 × Reading & Writing + Math) ÷ 10 — and compare it with the Commended cutoff and your state's Semifinalist cutoff.",
    metaTitle: "National Merit Selection Index Calculator — PSAT Cutoffs",
    metaDescription: "Free National Merit Selection Index calculator. Compute your PSAT/NMSQT Selection Index and compare it with Commended and state Semifinalist cutoffs.",
    calcInputs: [
      n("readingWriting", "PSAT Reading & Writing Score (160–760)", V.nmsi.readingWriting, 760, true, 10, 160),
      n("math", "PSAT Math Score (160–760)", V.nmsi.math, 760, true, 10, 160),
      n("commendedCutoff", "Commended Cutoff", V.nmsi.commendedCutoff, 228, false),
      n("stateCutoff", "Your State's Semifinalist Cutoff", V.nmsi.stateCutoff, 228),
    ],
    calcResult: { label: "Selection Index", format: "number" },
    calcResults: [
      { key: "selectionIndex", label: "Selection Index (48–228)", format: "number", highlight: true },
      { key: "commended", label: "At or Above Commended? (1 = Yes)", format: "number" },
      { key: "semifinalist", label: "At or Above State Cutoff? (1 = Yes)", format: "number" },
      { key: "pointsVsStateCutoff", label: "Points Above (+) / Below (−) State Cutoff", format: "number" },
      { key: "psatTotal", label: "PSAT Total", format: "number" },
    ],
    instructions: "Enter your PSAT/NMSQT section scores and your state's most recent Semifinalist cutoff (they range from about 207 to 223; high-scoring states like New Jersey, Massachusetts and California are at the top).",
    examples: `Example: 720 Reading & Writing and 740 Math give a Selection Index of ${X.nmsi.selectionIndex} — ${X.nmsi.pointsVsStateCutoff >= 0 ? "above" : "below"} a 216 state cutoff by ${Math.abs(X.nmsi.pointsVsStateCutoff)}.`,
    assumptions: "Selection Index = (2 × RW + Math) ÷ 10 on the digital PSAT/NMSQT, so Reading & Writing counts double. Only the junior-year PSAT/NMSQT counts. Cutoffs change every year and are announced in September; Commended is a single national cutoff. Not affiliated with National Merit Scholarship Corporation.",
    faq: [
      { question: "How is the National Merit Selection Index calculated?", answer: "Double your Reading & Writing score, add your Math score, and divide by 10." },
      { question: "What Selection Index do you need for National Merit?", answer: "About 207–208 for Commended nationally, and 207–223 for Semifinalist depending on your state." },
    ],
  },
  {
    slug: "shsat-score-calculator",
    title: "SHSAT Score Calculator",
    category: CAT,
    description: "Estimate your SHSAT composite score for NYC specialized high schools — scaled ELA and Math from raw scores — and compare it with a school's admission cutoff such as Stuyvesant, Bronx Science or Brooklyn Tech.",
    metaTitle: "SHSAT Score Calculator — NYC Specialized High School Cutoffs",
    metaDescription: "Free SHSAT score calculator. Estimate your scaled ELA, Math and composite SHSAT score and compare it with specialized high school cutoffs.",
    calcInputs: [
      n("elaCorrect", "ELA Correct (of 57 Scored)", V.shsat.elaCorrect, 57),
      n("mathCorrect", "Math Correct (of 57 Scored)", V.shsat.mathCorrect, 57),
      n("targetCutoff", "Target School's Cutoff (e.g. Stuyvesant ~561, Brooklyn Tech ~498)", V.shsat.targetCutoff, 800),
    ],
    calcResult: { label: "SHSAT Composite", format: "number" },
    calcResults: [
      { key: "compositeScore", label: "Estimated Composite Score", format: "number", highlight: true },
      { key: "elaScaled", label: "ELA Scaled Score", format: "number" },
      { key: "mathScaled", label: "Math Scaled Score", format: "number" },
      { key: "meetsTargetCutoff", label: "Meets Target Cutoff? (1 = Yes)", format: "number" },
      { key: "pointsVsTarget", label: "Points Above (+) / Below (−) Cutoff", format: "number" },
    ],
    instructions: "Enter your correct answers in each section of a practice SHSAT (57 scored questions each) and the cutoff for the school you want from the most recent admissions results.",
    examples: `Example: 49 ELA and 48 Math correct estimate to ${X.shsat.elaScaled} + ${X.shsat.mathScaled} = ${X.shsat.compositeScore} — ${Math.abs(X.shsat.pointsVsTarget)} points ${X.shsat.pointsVsTarget >= 0 ? "above" : "below"} a 561 Stuyvesant cutoff.`,
    assumptions: "SHSAT scaling is non-linear — each extra correct answer near the top is worth more — and is set per test form. This uses an approximate curve. Cutoffs change yearly; seats are filled by rank and student choice order. Not affiliated with the NYC Department of Education.",
    faq: [
      { question: "What SHSAT score do you need for Stuyvesant?", answer: "Recently around 560 composite, the highest of the specialized high schools." },
      { question: "How is the SHSAT scored?", answer: "Raw ELA and Math scores are converted to scaled scores and added into a composite out of about 800." },
    ],
  },
  {
    slug: "ssat-score-calculator",
    title: "SSAT Score Calculator",
    category: CAT,
    description: "Estimate your SSAT scaled scores — Quantitative, Verbal and Reading — and your total and percentile for the Upper, Middle or Elementary Level test. Also works as an SSAT percentile calculator.",
    metaTitle: "SSAT Score Calculator — Scaled Score & Percentile",
    metaDescription: "Free SSAT score calculator. Estimate SSAT scaled section scores, total score and percentile for Upper, Middle or Elementary Level.",
    calcInputs: [
      dropdown("level", "SSAT Level", [["Upper Level (Grades 8–11, 500–800)", 0], ["Middle Level (Grades 5–7, 440–710)", 1], ["Elementary Level (Grades 3–4, 300–600)", 2]], 0),
      n("quantCorrect", "Quantitative Correct", V.ssat.quantCorrect, 100),
      n("quantTotal", "Quantitative Questions", V.ssat.quantTotal, 100, false, 1, 1),
      n("verbalCorrect", "Verbal Correct", V.ssat.verbalCorrect, 100),
      n("verbalTotal", "Verbal Questions", V.ssat.verbalTotal, 100, false, 1, 1),
      n("readingCorrect", "Reading Correct", V.ssat.readingCorrect, 100),
      n("readingTotal", "Reading Questions", V.ssat.readingTotal, 100, false, 1, 1),
    ],
    calcResult: { label: "Total Scaled Score", format: "number" },
    calcResults: [
      { key: "totalScaledScore", label: "Total Scaled Score", format: "number", highlight: true },
      { key: "quantitativeScore", label: "Quantitative", format: "number" },
      { key: "verbalScore", label: "Verbal", format: "number" },
      { key: "readingScore", label: "Reading", format: "number" },
      { key: "estimatedPercentile", label: "Estimated Percentile", format: "number" },
    ],
    instructions: "Pick the level, then enter the questions correct and the number of questions in each section of your practice test (question counts differ between paper, computer and newer shorter versions — use the ones on your test).",
    examples: `Example: on the Upper Level, 38/50 Quant, 44/60 Verbal and 28/40 Reading estimate to a ${X.ssat.totalScaledScore} total — about the ${X.ssat.estimatedPercentile}th percentile.`,
    assumptions: "Scaled ranges: Upper 500–800 per section (1500–2400 total), Middle 440–710, Elementary 300–600. SSAT percentiles compare you only with same-grade students who tested in the last three years, so they're much tougher than national percentiles. This is an even raw-to-scaled mapping; the official scale is equated per form. Not affiliated with The Enrollment Management Association.",
    faq: [
      { question: "What is a good SSAT score?", answer: "Competitive boarding and day schools often look for the 70th–90th percentile or higher." },
      { question: "Does the SSAT penalize wrong answers?", answer: "The current SSAT no longer deducts for wrong answers, so answer every question." },
    ],
  },
  {
    slug: "isee-score-calculator",
    title: "ISEE Score Calculator",
    category: CAT,
    description: "Estimate your ISEE scaled scores, percentiles and stanines for Verbal Reasoning, Quantitative Reasoning, Reading Comprehension and Math Achievement — and your stanine total for private school admissions.",
    metaTitle: "ISEE Score Calculator — Stanine & Scaled Score Estimate",
    metaDescription: "Free ISEE score calculator. Estimate ISEE scaled scores, percentiles and stanines for each section and your stanine total.",
    calcInputs: [
      n("verbalCorrect", "Verbal Reasoning Correct", V.isee.verbalCorrect, 60), n("verbalTotal", "Verbal Reasoning Questions", V.isee.verbalTotal, 60, false, 1, 1),
      n("quantCorrect", "Quantitative Reasoning Correct", V.isee.quantCorrect, 60), n("quantTotal", "Quantitative Reasoning Questions", V.isee.quantTotal, 60, false, 1, 1),
      n("readingCorrect", "Reading Comprehension Correct", V.isee.readingCorrect, 60), n("readingTotal", "Reading Comprehension Questions", V.isee.readingTotal, 60, false, 1, 1),
      n("mathCorrect", "Math Achievement Correct", V.isee.mathCorrect, 60), n("mathTotal", "Math Achievement Questions", V.isee.mathTotal, 60, false, 1, 1),
    ],
    calcResult: { label: "Stanine Total", format: "number" },
    calcResults: [
      { key: "stanineTotal", label: "Stanine Total (4–36)", format: "number", highlight: true },
      { key: "verbalStanine", label: "Verbal Reasoning Stanine", format: "number" },
      { key: "quantStanine", label: "Quantitative Reasoning Stanine", format: "number" },
      { key: "readingStanine", label: "Reading Comprehension Stanine", format: "number" },
      { key: "mathStanine", label: "Math Achievement Stanine", format: "number" },
      { key: "averageScaledScore", label: "Average Scaled Score (760–940)", format: "number" },
    ],
    instructions: "Enter your correct answers and the number of questions in each section of a practice ISEE (Upper Level: 40, 37, 36 and 47).",
    examples: `Example: 32/40, 28/37, 27/36 and 36/47 estimate to stanines of ${X.isee.verbalStanine}, ${X.isee.quantStanine}, ${X.isee.readingStanine} and ${X.isee.mathStanine} — a stanine total of ${X.isee.stanineTotal}.`,
    assumptions: "ISEE scaled scores run 760–940 and are converted to percentiles against same-grade students, then to stanines (1–9). Section scaling is form-specific; this is an estimate. Many schools look for stanines of 5–6+, and top schools 7+. Not affiliated with ERB.",
    faq: [
      { question: "What is a good ISEE stanine?", answer: "Stanines of 5–6 are average for private-school applicants; competitive schools often look for 7 or higher." },
      { question: "How are ISEE stanines calculated?", answer: "Your percentile rank against same-grade test takers is grouped into nine bands — 1 (lowest 4%) to 9 (top 4%)." },
    ],
  },
  {
    slug: "eoc-score-calculator",
    title: "EOC Score Calculator",
    category: CAT,
    description: "See how your end-of-course (EOC) exam affects your final course grade — the EOC usually counts 20–30% — and the EOC score you need to reach your target grade.",
    metaTitle: "EOC Score Calculator — End-of-Course Exam & Final Grade",
    metaDescription: "Free EOC score calculator. See how the end-of-course exam changes your final grade and the EOC score you need for your target.",
    calcInputs: [
      percentField("courseGrade", "Course Grade Before the EOC", { default: 84, max: 110, step: 0.1 }),
      percentField("eocScore", "EOC Score (Percent)", { default: 72, max: 100, step: 0.1 }),
      percentField("eocWeight", "EOC Weight in the Final Grade", { default: 30, max: 100, step: 1 }),
      percentField("targetGrade", "Final Grade You Want", { default: 80, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Final Course Grade", format: "percentage" },
    calcResults: [
      { key: "finalCourseGrade", label: "Final Course Grade", format: "percentage", highlight: true },
      { key: "eocScoreNeeded", label: "EOC Score Needed for Your Target", format: "percentage" },
      { key: "eocPointsInGrade", label: "Points the EOC Adds", format: "number" },
    ],
    instructions: "Enter your course grade before the EOC, your EOC score as a percentage (your state may convert the scale score for you) and how much the EOC counts — Florida uses 30%, many states 20–25%.",
    examples: `Example: an 84% course grade with a 72% EOC worth 30% gives a ${X.eoc.finalCourseGrade}% final grade; to finish at 80% you need ${X.eoc.eocScoreNeeded}% on the EOC.`,
    assumptions: "Final grade = course grade × (1 − EOC weight) + EOC × weight. States convert EOC scale scores to percentages differently, and some also require a passing EOC to graduate (for example Florida's Algebra 1 and Grade 10 ELA). Check your district's policy.",
    faq: [
      { question: "How much does the EOC count in Florida?", answer: "30% of the final course grade for courses with a state EOC." },
      { question: "Do you have to pass the EOC to graduate?", answer: "In some states, for certain courses — for example Florida requires a passing Algebra 1 EOC (or a concordant score)." },
    ],
  },
  {
    slug: "sol-score-calculator",
    title: "SOL Score Calculator",
    category: CAT,
    description: "Estimate your Virginia SOL test scaled score (0–600) from the number of questions you got right — whether you pass (400) or pass advanced (500) — and how many more questions you need.",
    metaTitle: "SOL Score Calculator — Virginia SOL Scaled Score",
    metaDescription: "Free SOL score calculator. Estimate your Virginia SOL scaled score, pass (400) and pass advanced (500) from questions correct.",
    calcInputs: [
      n("correct", "Questions Correct", V.sol.correct, 100),
      n("totalQuestions", "Scored Questions on the Test", V.sol.totalQuestions, 100, true, 1, 1),
      percentField("passPercent", "Percent Correct Needed to Pass (Varies by Test)", { default: 60, max: 90, step: 1 }),
      percentField("advancedPercent", "Percent Correct for Pass Advanced", { default: 85, max: 99, step: 1 }),
    ],
    calcResult: { label: "SOL Scaled Score", format: "number" },
    calcResults: [
      { key: "scaledScore", label: "Estimated SOL Scaled Score", format: "number", highlight: true },
      { key: "passed", label: "Pass/Proficient (400+)? (1 = Yes)", format: "number" },
      { key: "passAdvanced", label: "Pass/Advanced (500+)? (1 = Yes)", format: "number" },
      { key: "percentCorrect", label: "Percent Correct", format: "percentage" },
      { key: "questionsToPass", label: "More Questions Needed to Pass", format: "number" },
    ],
    instructions: "Enter how many questions you answered correctly and how many were scored. The percentage needed to pass differs by subject and test form (often 55–70%); adjust it if your released test's scoring table shows a different number.",
    examples: `Example: 36 of 50 correct (72%) with a 60% pass point estimates to ${X.sol.scaledScore} — passing, but short of pass advanced.`,
    assumptions: "SOL scaled scores run 0–600: 400 = pass/proficient, 500 = pass/advanced. Virginia converts raw to scaled with a separate table for each test form; computer-adaptive math and reading tests are scored differently. Not affiliated with the Virginia Department of Education.",
    faq: [
      { question: "What score do you need to pass the SOL?", answer: "A scaled score of 400 out of 600; 500 or more is pass/advanced." },
      { question: "How many questions can you miss on an SOL test?", answer: "It varies by test, but passing often takes about 60% of the scored questions." },
    ],
  },
  {
    slug: "english-regents-score-calculator",
    title: "English Regents Score Calculator",
    category: CAT,
    description: "Estimate your New York English Language Arts Regents score — weighted raw score from Part 1 multiple choice, the Part 2 argument essay and the Part 3 text analysis — converted to the 0–100 scale with pass and mastery checks.",
    metaTitle: "English Regents Score Calculator — ELA Regents Conversion",
    metaDescription: "Free English Regents score calculator. Convert your ELA Regents multiple choice, essay and text-analysis scores to a 0–100 scale score.",
    calcInputs: [
      n("part1Correct", "Part 1 Multiple Choice Correct (of 24)", V.reg.part1Correct, 24),
      n("part2Essay", "Part 2 Argument Essay Score (0–6)", V.reg.part2Essay, 6),
      n("part3Analysis", "Part 3 Text Analysis Score (0–4)", V.reg.part3Analysis, 4),
    ],
    calcResult: { label: "Scale Score", format: "number" },
    calcResults: [
      { key: "scaleScore", label: "Estimated Scale Score (0–100)", format: "number", highlight: true },
      { key: "weightedRawScore", label: "Weighted Raw Score (of 56)", format: "number" },
      { key: "passed", label: "Passed (65+)? (1 = Yes)", format: "number" },
      { key: "mastery", label: "Mastery (85+)? (1 = Yes)", format: "number" },
      { key: "performanceLevel", label: "Performance Level (1–5)", format: "number" },
    ],
    instructions: "Enter your Part 1 multiple-choice correct answers and the rubric scores for the Part 2 essay and Part 3 response from your teacher or a practice exam.",
    examples: `Example: 19 multiple choice, a 4 on the essay and a 3 on the text analysis give ${X.reg.weightedRawScore} weighted raw points — about a ${X.reg.scaleScore} scale score, passing.`,
    assumptions: "Weighted raw = Part 1 + Part 2 × 4 + Part 3 × 2 (out of 56). Each exam has its own conversion chart, published after the test; this approximation places 65 at about 32 raw points and 85 at about 46. New York is phasing in a redesigned ELA Regents — check the conversion chart for your exam.",
    faq: [
      { question: "What do you need to pass the English Regents?", answer: "A scale score of 65; 85 or more is mastery." },
      { question: "How is the English Regents scored?", answer: "Multiple-choice and rubric scores are weighted into a raw score, then converted to 0–100 with that exam's chart." },
    ],
  },
  {
    slug: "act-scholarship-calculator",
    title: "ACT Scholarship Calculator",
    category: CAT,
    description: "Estimate the merit scholarship your ACT score and GPA could earn — typical automatic-award tiers at public universities — as a yearly amount, share of tuition and four-year value, and how many ACT points reach the next tier.",
    metaTitle: "ACT Scholarship Calculator — Merit Aid by ACT & GPA",
    metaDescription: "Free ACT scholarship calculator. Estimate merit aid from your ACT and GPA, the four-year value and the ACT points to the next scholarship tier.",
    calcInputs: [
      n("actScore", "ACT Composite", V.schol.actScore, 36, true, 1, 1),
      numberField("gpa", "Unweighted GPA", { default: 3.6, max: 4, step: 0.01 }),
      currencyField("tuition", "Yearly Tuition at the College", { default: 12000, max: 100000, step: 100 }),
    ],
    calcResult: { label: "Estimated Yearly Award", format: "currency" },
    calcResults: [
      { key: "estimatedYearlyAward", label: "Estimated Yearly Merit Award", format: "currency", highlight: true },
      { key: "fourYearValue", label: "Four-Year Value", format: "currency" },
      { key: "shareOfTuition", label: "Share of Tuition", format: "percentage" },
      { key: "actPointsToNextTier", label: "ACT Points to the Next Tier", format: "number" },
    ],
    instructions: "Enter your ACT composite (or superscore if the college accepts it), your unweighted GPA and the college's yearly tuition. For an exact figure, use the college's own automatic scholarship chart.",
    examples: `Example: a 29 ACT and 3.6 GPA at a $12,000-tuition college estimate to a ${X.schol.shareOfTuition}% award — $${X.schol.estimatedYearlyAward.toLocaleString("en-US")} a year, $${X.schol.fourYearValue.toLocaleString("en-US")} over four years. One more ACT point would reach the next tier.`,
    assumptions: "Tiers are a typical pattern for automatic merit scholarships (for example 34+ and 3.8 → full tuition; 30+ and 3.5 → half; 24+ and 3.0 → 15%) — every college sets its own, many have deadlines, and test-optional colleges may use GPA alone. Need-based aid isn't included.",
    faq: [
      { question: "What ACT score gets scholarships?", answer: "Many public universities start automatic merit awards around 24–26, with larger awards at 30+." },
      { question: "Is it worth retaking the ACT for scholarships?", answer: "Often yes — one or two points can move you into a tier worth thousands of dollars a year." },
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
