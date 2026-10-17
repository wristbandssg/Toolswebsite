// One-time (but safe to re-run) batch setup script: creates 16 graduate & professional exam
// tools from the user's jobs & education list (Jobs & Education Calculators > Graduate &
// Professional Exam Calculators). "CA Bar Exam Score Calculator" is merged into the California
// Bar tool. Examples are computed from src/lib/calc-engine-edu-pro-exams.ts.
//
// HOW TO RUN (after prisma/setup-jobs-education-category.ts --apply)
//   npx tsx prisma/create-edu-pro-exams-calculators.ts
// or
//   npm run db:create-edu-pro-exams-calculators

import * as E from "../src/lib/calc-engine-edu-pro-exams";
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

const CAT = "graduate-professional-exam-calculators";
const run = (fn: E.CustomCalculator, values: Record<string, number>) => fn(values) as Record<string, number>;
const n = (key: string, label: string, def: number, max: number, required = true, step = 1, min = 0) => numberField(key, label, { default: def, max, required, step, min });
const pc = (key: string, label: string, def: number, required = true) => percentField(key, label, { default: def, max: 100, step: 0.5, required });

const V = {
  lsat: { correct: 58, totalQuestions: 76, targetScore: 165 },
  mcat: { chemPhysCorrect: 44, carsCorrect: 38, bioBiochemCorrect: 46, psychSocCorrect: 47 },
  gmat: { quant: 82, verbal: 84, dataInsights: 79 },
  gre: { verbal: 158, quant: 162, writing: 4.5 },
  dat: { biologyCorrect: 30, genChemCorrect: 23, orgoCorrect: 22, patCorrect: 68, readingCorrect: 38, quantCorrect: 28 },
  praxis: { percentCorrect: 62, passingScore: 156 },
  mbe: { rawCorrect: 120, targetScaled: 135 },
  mpre: { rawCorrect: 32, passingScore: 85 },
  naplex: { percentCorrect: 68 },
  ube: { mbeScaled: 138, meeAverage: 3.8, mptAverage: 4, passingScore: 266 },
  ca: { mbeScaled: 145, essay1: 65, essay2: 60, essay3: 65, essay4: 70, essay5: 60, performanceTest: 65 },
  hesi: { math: 88, reading: 84, vocabulary: 80, grammar: 82, anatomyPhysiology: 76, biology: 0, chemistry: 0, programMinimum: 80 },
  teas: { readingCorrect: 32, mathCorrect: 26, scienceCorrect: 31, englishCorrect: 25 },
  nbme: { percentCorrect: 66, step2: 0 },
  clep: { percentCorrect: 62, creditsOffered: 3 },
  acca: { qualification: 1, knowledgeExemptionFee: 90, skillsExemptionFee: 130, examFee: 180, monthsPerExam: 3 },
};
const X = {
  lsat: run(E.lsat, V.lsat), mcat: run(E.mcat, V.mcat), gmat: run(E.gmat, V.gmat), gre: run(E.grePercentile, V.gre), dat: run(E.dat, V.dat),
  praxis: run(E.praxis, V.praxis), mbe: run(E.mbe, V.mbe), mpre: run(E.mpre, V.mpre), naplex: run(E.naplex, V.naplex), ube: run(E.barExam, V.ube),
  ca: run(E.californiaBar, V.ca), hesi: run(E.hesi, V.hesi), teas: run(E.atiTeas, V.teas), nbme: run(E.nbme, V.nbme), clep: run(E.clep, V.clep), acca: run(E.accaExemption, V.acca),
};

const TOOLS: ToolDef[] = [
  {
    slug: "lsat-score-calculator",
    title: "LSAT Score Calculator",
    category: CAT,
    description: "Convert your LSAT raw score to the 120–180 scaled score and percentile — for the current LSAT with two Logical Reasoning sections and one Reading Comprehension section — and see how many correct answers you need for your target.",
    metaTitle: "LSAT Score Calculator — Raw to Scaled Score & Percentile",
    metaDescription: "Free LSAT score calculator. Convert raw score to the 120–180 LSAT scale, see your percentile and the questions you need for a target score.",
    calcInputs: [n("correct", "Questions Correct", V.lsat.correct, 110), n("totalQuestions", "Scored Questions (Usually 75–78)", V.lsat.totalQuestions, 110, true, 1, 1), n("targetScore", "Target Score (Optional)", V.lsat.targetScore, 180, false)],
    calcResult: { label: "LSAT Score", format: "number" },
    calcResults: [
      { key: "lsatScore", label: "Estimated LSAT Score (120–180)", format: "number", highlight: true },
      { key: "percentile", label: "Percentile", format: "number" },
      { key: "percentCorrect", label: "Percent Correct", format: "percentage" },
      { key: "correctNeededForTarget", label: "Correct Answers Needed for Your Target", format: "number" },
    ],
    instructions: "Enter how many questions you answered correctly across the scored sections of a practice LSAT and the number of scored questions on that test. There's no penalty for wrong answers.",
    examples: `Example: 58 of 76 correct is about a ${X.lsat.lsatScore} (${X.lsat.percentile}th percentile); a 165 would take about ${X.lsat.correctNeededForTarget} correct.`,
    assumptions: "Since August 2024 the LSAT has two scored Logical Reasoning sections and one Reading Comprehension section (no Logic Games) plus an unscored section. Each test has its own conversion chart; this uses a typical curve. Percentiles are approximate three-year figures. Not affiliated with LSAC.",
    faq: [
      { question: "What is a good LSAT score?", answer: "The median is about 152; 160+ is the top 20%, and T14 law schools' medians are around 170." },
      { question: "How many questions can you miss for a 170?", answer: "Usually around 9–11 questions, depending on the test's curve." },
    ],
  },
  {
    slug: "mcat-score-calculator",
    title: "MCAT Score Calculator",
    category: CAT,
    description: "Estimate your MCAT score from a practice exam — each section's 118–132 score from the questions you got right, your total (472–528) and percentile.",
    metaTitle: "MCAT Score Calculator — Section Scores, Total & Percentile",
    metaDescription: "Free MCAT score calculator. Estimate section scores (118–132), your total MCAT score (472–528) and percentile from correct answers.",
    calcInputs: [
      n("chemPhysCorrect", "Chem/Phys Correct (of 59)", V.mcat.chemPhysCorrect, 59),
      n("carsCorrect", "CARS Correct (of 53)", V.mcat.carsCorrect, 53),
      n("bioBiochemCorrect", "Bio/Biochem Correct (of 59)", V.mcat.bioBiochemCorrect, 59),
      n("psychSocCorrect", "Psych/Soc Correct (of 59)", V.mcat.psychSocCorrect, 59),
    ],
    calcResult: { label: "MCAT Total", format: "number" },
    calcResults: [
      { key: "totalScore", label: "Estimated MCAT Total (472–528)", format: "number", highlight: true },
      { key: "chemPhysScore", label: "Chem/Phys", format: "number" },
      { key: "carsScore", label: "CARS", format: "number" },
      { key: "bioBiochemScore", label: "Bio/Biochem", format: "number" },
      { key: "psychSocScore", label: "Psych/Soc", format: "number" },
      { key: "percentile", label: "Percentile", format: "number" },
    ],
    instructions: "Enter your correct answers in each of the four MCAT sections from a full-length practice exam.",
    examples: `Example: 44, 38, 46 and 47 correct estimate to ${X.mcat.chemPhysScore}/${X.mcat.carsScore}/${X.mcat.bioBiochemScore}/${X.mcat.psychSocScore} — a ${X.mcat.totalScore} total, about the ${Math.round(X.mcat.percentile)}th percentile.`,
    assumptions: "Each section is scaled 118–132 (midpoint 125) and the total is 472–528 (midpoint 500). The real conversion varies by test form; AAMC practice exams give the closest prediction. Not affiliated with the AAMC.",
    faq: [
      { question: "What is a good MCAT score?", answer: "About 511+ is competitive for many MD programs; the average for matriculants is about 512." },
      { question: "How many questions can you miss on the MCAT?", answer: "For a 130 in a section, typically around 5–8 misses, depending on the test." },
    ],
  },
  {
    slug: "gmat-score-calculator",
    title: "GMAT Score Calculator",
    category: CAT,
    description: "Calculate your GMAT Focus Edition total score (205–805) from your Quantitative, Verbal and Data Insights section scores (60–90), with the percentile.",
    metaTitle: "GMAT Score Calculator — GMAT Focus Edition Total & Percentile",
    metaDescription: "Free GMAT Focus score calculator. Turn your Quant, Verbal and Data Insights scores into a 205–805 total and percentile.",
    calcInputs: [n("quant", "Quantitative Reasoning (60–90)", V.gmat.quant, 90, true, 1, 60), n("verbal", "Verbal Reasoning (60–90)", V.gmat.verbal, 90, true, 1, 60), n("dataInsights", "Data Insights (60–90)", V.gmat.dataInsights, 90, true, 1, 60)],
    calcResult: { label: "GMAT Total", format: "number" },
    calcResults: [
      { key: "totalScore", label: "GMAT Focus Total (205–805)", format: "number", highlight: true },
      { key: "percentile", label: "Percentile", format: "number" },
      { key: "sectionAverage", label: "Section Average", format: "number" },
    ],
    instructions: "Enter your three section scores from a practice test or score report.",
    examples: `Example: Quant 82, Verbal 84 and Data Insights 79 total about ${X.gmat.totalScore} — roughly the ${X.gmat.percentile}th percentile.`,
    assumptions: "GMAT Focus totals run 205–805 in steps of 10 with all three sections weighted equally; GMAC's exact mapping isn't a simple formula, so this is a close linear approximation. Focus scores aren't comparable to the old 200–800 GMAT. Not affiliated with GMAC.",
    faq: [
      { question: "What is a good GMAT Focus score?", answer: "About 645+ is around the 85th percentile; top business schools' medians are roughly 675–705." },
      { question: "How is the GMAT Focus total calculated?", answer: "From your Quant, Verbal and Data Insights scores, each weighted equally." },
    ],
  },
  {
    slug: "gre-percentile-calculator",
    title: "GRE Percentile Calculator",
    category: CAT,
    description: "Find your GRE percentiles — Verbal Reasoning and Quantitative Reasoning (130–170) and Analytical Writing (0–6) — from ETS's percentile tables, plus your combined score.",
    metaTitle: "GRE Percentile Calculator — Verbal, Quant & Writing",
    metaDescription: "Free GRE percentile calculator. Turn your Verbal, Quant and Analytical Writing scores into percentiles using ETS data.",
    calcInputs: [n("verbal", "Verbal Reasoning (130–170)", V.gre.verbal, 170, true, 1, 130), n("quant", "Quantitative Reasoning (130–170)", V.gre.quant, 170, true, 1, 130), numberField("writing", "Analytical Writing (0–6)", { default: V.gre.writing, max: 6, step: 0.5 })],
    calcResult: { label: "Verbal Percentile", format: "number" },
    calcResults: [
      { key: "verbalPercentile", label: "Verbal Percentile", format: "number", highlight: true },
      { key: "quantPercentile", label: "Quant Percentile", format: "number" },
      { key: "writingPercentile", label: "Analytical Writing Percentile", format: "number" },
      { key: "combinedScore", label: "Combined Verbal + Quant (260–340)", format: "number" },
    ],
    instructions: "Enter your GRE section scores from a score report or practice test.",
    examples: `Example: Verbal 158 and Quant 162 are about the ${Math.round(X.gre.verbalPercentile)}th and ${Math.round(X.gre.quantPercentile)}th percentiles (combined ${X.gre.combinedScore}); a 4.5 in writing is about the ${Math.round(X.gre.writingPercentile)}st.`,
    assumptions: "Percentiles interpolate ETS's published tables (test takers over recent years); the same Quant score ranks lower than the same Verbal score because so many test takers score high in Quant. Since September 2023 the GRE is shorter but uses the same scales. Not affiliated with ETS.",
    faq: [
      { question: "What is a good GRE score?", answer: "Around 155+ Verbal and 160+ Quant is competitive for many programs; top STEM programs often look for 165+ Quant." },
      { question: "Why is my Quant percentile lower than Verbal?", answer: "Many test takers score highly in Quant, so each Quant score ranks lower." },
    ],
  },
  {
    slug: "dat-score-calculator",
    title: "DAT Score Calculator",
    category: CAT,
    description: "Estimate your Dental Admission Test scores — each section on the 1–30 scale, your Academic Average, Total Science score and percentile — from a practice test.",
    metaTitle: "DAT Score Calculator — Academic Average & Total Science",
    metaDescription: "Free DAT score calculator. Estimate DAT section scores, your Academic Average, Total Science score and percentile from correct answers.",
    calcInputs: [
      n("biologyCorrect", "Biology Correct (of 40)", V.dat.biologyCorrect, 40), n("genChemCorrect", "General Chemistry Correct (of 30)", V.dat.genChemCorrect, 30),
      n("orgoCorrect", "Organic Chemistry Correct (of 30)", V.dat.orgoCorrect, 30), n("patCorrect", "Perceptual Ability Correct (of 90)", V.dat.patCorrect, 90),
      n("readingCorrect", "Reading Comprehension Correct (of 50)", V.dat.readingCorrect, 50), n("quantCorrect", "Quantitative Reasoning Correct (of 40)", V.dat.quantCorrect, 40),
    ],
    calcResult: { label: "Academic Average", format: "number" },
    calcResults: [
      { key: "academicAverage", label: "Academic Average (1–30)", format: "number", highlight: true },
      { key: "totalScience", label: "Total Science", format: "number" },
      { key: "perceptualAbility", label: "Perceptual Ability", format: "number" },
      { key: "biology", label: "Biology", format: "number" },
      { key: "generalChemistry", label: "General Chemistry", format: "number" },
      { key: "organicChemistry", label: "Organic Chemistry", format: "number" },
      { key: "readingComprehension", label: "Reading Comprehension", format: "number" },
      { key: "quantitativeReasoning", label: "Quantitative Reasoning", format: "number" },
      { key: "academicAveragePercentile", label: "Academic Average Percentile", format: "number" },
    ],
    instructions: "Enter your correct answers in each DAT section from a practice test.",
    examples: `Example: 30/40 Bio, 23/30 General Chem, 22/30 Orgo, 38/50 Reading and 28/40 QR estimate to an Academic Average of ${X.dat.academicAverage} (about the ${X.dat.academicAveragePercentile}th percentile).`,
    assumptions: "The Academic Average averages Biology, General Chemistry, Organic Chemistry, Reading Comprehension and Quantitative Reasoning (not PAT); Total Science averages the three sciences. Conversion varies by form. Dental school matriculants average around 20–21. Not affiliated with the ADA.",
    faq: [
      { question: "What is a good DAT score?", answer: "An Academic Average of 20 is about the 80th percentile; competitive dental schools often look for 21+." },
      { question: "Does PAT count in the Academic Average?", answer: "No — PAT is reported separately." },
    ],
  },
  {
    slug: "praxis-score-calculator",
    title: "Praxis Score Calculator",
    category: CAT,
    description: "Estimate your Praxis scaled score (100–200) from the percent of questions you got right and check it against your state's passing score for that test.",
    metaTitle: "Praxis Score Calculator — Scaled Score & Passing Check",
    metaDescription: "Free Praxis score calculator. Estimate your Praxis scaled score from percent correct and compare it with your state's passing score.",
    calcInputs: [pc("percentCorrect", "Percent of Questions Correct", V.praxis.percentCorrect), n("passingScore", "Your State's Passing Score for This Test", V.praxis.passingScore, 200, true, 1, 100)],
    calcResult: { label: "Praxis Scaled Score", format: "number" },
    calcResults: [
      { key: "scaledScore", label: "Estimated Scaled Score (100–200)", format: "number", highlight: true },
      { key: "passed", label: "Meets Passing Score? (1 = Yes)", format: "number" },
      { key: "pointsVsPassing", label: "Points Above (+) / Below (−) Passing", format: "number" },
      { key: "percentCorrectNeeded", label: "Approximate Percent Correct Needed", format: "percentage" },
    ],
    instructions: "Enter your percent correct on a practice test and the passing score your state requires for that Praxis test (each state sets its own — for example 150–162 on Core tests).",
    examples: `Example: 62% correct estimates to ${X.praxis.scaledScore}, ${X.praxis.pointsVsPassing} points above a 156 passing score.`,
    assumptions: "Most Praxis tests report scaled scores of 100–200; the raw-to-scaled conversion is set per test and form, so this linear estimate is a guide. Some tests use different scales. Not affiliated with ETS.",
    faq: [
      { question: "What is a passing Praxis score?", answer: "It depends on the test and state — Core Math is commonly 150, Core Reading 156 and Core Writing 162." },
      { question: "What percentage do you need to pass the Praxis?", answer: "Often about 55–65% of questions correct, depending on the test." },
    ],
  },
  {
    slug: "mbe-score-calculator",
    title: "MBE Score Calculator",
    category: CAT,
    description: "Estimate your Multistate Bar Exam scaled score from your raw score out of 175 scored questions, the raw score you need for your target, and the written score you'd need for a 266 UBE.",
    metaTitle: "MBE Score Calculator — Raw to Scaled MBE Score",
    metaDescription: "Free MBE score calculator. Convert MBE raw score (of 175) to a scaled score and see the raw score and written score you need.",
    calcInputs: [n("rawCorrect", "MBE Questions Correct (of 175 Scored)", V.mbe.rawCorrect, 175), n("targetScaled", "Target MBE Scaled Score", V.mbe.targetScaled, 200, false)],
    calcResult: { label: "MBE Scaled Score", format: "number" },
    calcResults: [
      { key: "mbeScaledScore", label: "Estimated MBE Scaled Score", format: "number", highlight: true },
      { key: "percentCorrect", label: "Percent Correct", format: "percentage" },
      { key: "rawNeededForTarget", label: "Raw Score Needed for Your Target", format: "number" },
      { key: "writtenNeededFor266", label: "Written Scaled Score Needed for a 266 UBE", format: "number" },
    ],
    instructions: "Enter your correct answers out of the 175 scored MBE questions (the exam has 200; 25 are unscored) from a practice exam or NCBE score report.",
    examples: `Example: 120 of 175 correct (${X.mbe.percentCorrect}%) estimates to about a ${X.mbe.mbeScaledScore} scaled score; you'd need about ${X.mbe.writtenNeededFor266} on the written portion for a 266 UBE.`,
    assumptions: "NCBE equates the MBE each administration; this linear estimate approximates recent conversions (national mean around 140). Jurisdictions on the NextGen bar exam (from July 2026) use a different format. Not affiliated with NCBE.",
    faq: [
      { question: "What MBE score do you need to pass?", answer: "Around 133–135 scaled is typical for a 266–270 UBE, but your written score matters equally." },
      { question: "How many MBE questions are scored?", answer: "175 of the 200 questions." },
    ],
  },
  {
    slug: "mpre-score-calculator",
    title: "MPRE Score Calculator",
    category: CAT,
    description: "Estimate your MPRE scaled score (50–150) from your raw score on the 50 scored questions and check it against your jurisdiction's passing score (75–86).",
    metaTitle: "MPRE Score Calculator — Scaled Score & Passing",
    metaDescription: "Free MPRE score calculator. Estimate your MPRE scaled score from raw correct answers and check your state's passing score.",
    calcInputs: [n("rawCorrect", "Questions Correct (of 50 Scored)", V.mpre.rawCorrect, 50), n("passingScore", "Your Jurisdiction's Passing Score", V.mpre.passingScore, 150, true, 1, 50)],
    calcResult: { label: "MPRE Scaled Score", format: "number" },
    calcResults: [
      { key: "mpreScaledScore", label: "Estimated MPRE Scaled Score", format: "number", highlight: true },
      { key: "passed", label: "Meets Passing Score? (1 = Yes)", format: "number" },
      { key: "rawNeededToPass", label: "Raw Score Needed to Pass", format: "number" },
      { key: "percentCorrect", label: "Percent Correct", format: "percentage" },
    ],
    instructions: "Enter how many of the 50 scored questions you got right (the MPRE has 60; 10 are unscored) and your jurisdiction's passing score.",
    examples: `Example: 32 of 50 correct estimates to about ${X.mpre.mpreScaledScore} — passing in a jurisdiction that requires 85 (about ${X.mpre.rawNeededToPass} correct needed).`,
    assumptions: "MPRE scores are equated per administration; this curve is an estimate. Most jurisdictions require 85, California 86, and some 75–80. Not affiliated with NCBE.",
    faq: [
      { question: "What MPRE score do you need?", answer: "85 in most jurisdictions; between 75 and 86 elsewhere." },
      { question: "How many questions can you miss on the MPRE?", answer: "Roughly 18–20 of the 50 scored questions for an 85, depending on the test." },
    ],
  },
  {
    slug: "naplex-score-calculator",
    title: "NAPLEX Score Calculator",
    category: CAT,
    description: "Estimate your NAPLEX scaled score (0–150) from your percent correct on a practice exam and see whether you're above the 75 needed to pass.",
    metaTitle: "NAPLEX Score Calculator — Scaled Score Estimate",
    metaDescription: "Free NAPLEX score calculator. Estimate your NAPLEX scaled score from percent correct and compare it with the 75 passing score.",
    calcInputs: [pc("percentCorrect", "Percent of Questions Correct", V.naplex.percentCorrect)],
    calcResult: { label: "NAPLEX Scaled Score", format: "number" },
    calcResults: [
      { key: "naplexScaledScore", label: "Estimated Scaled Score (0–150)", format: "number", highlight: true },
      { key: "passed", label: "Passing (75+)? (1 = Yes)", format: "number" },
      { key: "pointsVsPassing", label: "Points Above (+) / Below (−) 75", format: "number" },
    ],
    instructions: "Enter your percent correct on a full-length practice NAPLEX.",
    examples: `Example: 68% correct estimates to about ${X.naplex.naplexScaledScore} — ${X.naplex.pointsVsPassing} points above the passing score.`,
    assumptions: "The NAPLEX (225 questions, 200 scored) is computer-adaptive and scored with item difficulty, so percent correct doesn't map exactly to a scaled score; passing usually needs roughly 60–65% correct. Not affiliated with NABP.",
    faq: [
      { question: "What score do you need to pass the NAPLEX?", answer: "A scaled score of 75 out of 150." },
      { question: "How many questions are on the NAPLEX?", answer: "225 questions, 200 of them scored." },
    ],
  },
  {
    slug: "bar-exam-calculator",
    title: "Bar Exam Calculator",
    category: CAT,
    description: "Estimate your Uniform Bar Exam (UBE) score — MBE scaled score plus the written MEE and MPT portion out of 400 — and whether it meets your jurisdiction's passing score (260–270).",
    metaTitle: "Bar Exam Calculator — UBE Score Estimate",
    metaDescription: "Free bar exam calculator. Combine your MBE scaled score with MEE and MPT grades to estimate your UBE score and compare it with passing scores.",
    calcInputs: [
      n("mbeScaled", "MBE Scaled Score", V.ube.mbeScaled, 200, true, 0.1),
      numberField("meeAverage", "Average MEE Essay Grade (1–6)", { default: V.ube.meeAverage, min: 1, max: 6, step: 0.1 }),
      numberField("mptAverage", "Average MPT Grade (1–6)", { default: V.ube.mptAverage, min: 1, max: 6, step: 0.1 }),
      n("passingScore", "Jurisdiction Passing Score (260–270)", V.ube.passingScore, 300, true, 1, 200),
    ],
    calcResult: { label: "UBE Score", format: "number" },
    calcResults: [
      { key: "ubeScore", label: "Estimated UBE Score (of 400)", format: "number", highlight: true },
      { key: "mbeScaled", label: "MBE Scaled Score", format: "number" },
      { key: "writtenScaled", label: "Written (MEE + MPT) Scaled Score", format: "number" },
      { key: "passed", label: "Meets Passing Score? (1 = Yes)", format: "number" },
      { key: "pointsVsPassing", label: "Points Above (+) / Below (−) Passing", format: "number" },
    ],
    instructions: "Enter your MBE scaled score and the average grade on your six MEE essays and two MPT tasks (on the common 1–6 scale), then your jurisdiction's passing score — for example 260 (Minnesota), 266 (New York, Illinois) or 270 (Alaska).",
    examples: `Example: a 138 MBE with 3.8 MEE and 4.0 MPT averages gives about ${X.ube.writtenScaled} written and a ${X.ube.ubeScore} UBE — ${X.ube.pointsVsPassing} points over a 266.`,
    assumptions: "The UBE weights the MBE 50%, MEE 30% and MPT 20%; written scores are scaled to the MBE, which this approximates (a 4 on the written portion ≈ 140). Jurisdictions moving to the NextGen bar exam from July 2026 use a new scoring scale. Not affiliated with NCBE.",
    faq: [
      { question: "What is a passing UBE score?", answer: "Between 260 and 270 depending on the jurisdiction; 266 is common." },
      { question: "How is the UBE scored?", answer: "MBE 50%, MEE 30% and MPT 20%, combined on a 400-point scale." },
    ],
  },
  {
    slug: "california-bar-exam-score-calculator",
    title: "California Bar Exam Score Calculator",
    category: CAT,
    description: "Estimate your California Bar Exam score on the 2,000-point scale from your MBE scaled score and your five essay and performance test grades, and see how far you are from the 1,390 passing score. Also works as a CA bar exam score calculator.",
    metaTitle: "California Bar Exam Score Calculator — 1390 to Pass",
    metaDescription: "Free California Bar Exam score calculator. Combine your MBE and written scores on the 2,000-point scale and compare with the 1,390 passing score.",
    calcInputs: [
      n("mbeScaled", "MBE Scaled Score", V.ca.mbeScaled, 200, true, 0.1),
      ...[1, 2, 3, 4, 5].map((i) => n(`essay${i}`, `Essay ${i} Grade (40–100)`, (V.ca as Record<string, number>)[`essay${i}`], 100, true, 5)),
      n("performanceTest", "Performance Test Grade (40–100, Counts Double)", V.ca.performanceTest, 100, true, 5),
    ],
    calcResult: { label: "California Bar Score", format: "number" },
    calcResults: [
      { key: "totalScaledScore", label: "Estimated Total Scaled Score (of 2,000)", format: "number", highlight: true },
      { key: "passed", label: "Passing (1,390+)? (1 = Yes)", format: "number" },
      { key: "pointsVsPassing", label: "Points Above (+) / Below (−) 1,390", format: "number" },
      { key: "mbePortion", label: "MBE Portion", format: "number" },
      { key: "writtenPortion", label: "Written Portion", format: "number" },
      { key: "writtenRawScore", label: "Written Raw Score (of 700)", format: "number" },
    ],
    instructions: "Enter your MBE scaled score and the grade for each of the five essays and the performance test (California grades in steps of 5, usually 55–75).",
    examples: `Example: a 145 MBE with essays of 65, 60, 65, 70 and 60 and a 65 performance test give about ${X.ca.totalScaledScore} — ${Math.abs(X.ca.pointsVsPassing)} points ${X.ca.pointsVsPassing >= 0 ? "above" : "below"} 1,390.`,
    assumptions: "California weights the written section (five essays + a double-weighted performance test, 700 raw points) and the MBE equally on a 2,000-point scale; 1,390 passes. The conversion factors here approximate recent exams. After the February 2025 exam problems, California returned to the MBE from July 2025; check the State Bar for current exam format. Not affiliated with the State Bar of California.",
    faq: [
      { question: "What score do you need to pass the California Bar?", answer: "1,390 on the 2,000-point scale." },
      { question: "How is the California Bar Exam scored?", answer: "The written section and the MBE each count 50%; the performance test counts double within the written section." },
    ],
  },
  {
    slug: "hesi-score-calculator",
    title: "HESI Score Calculator",
    category: CAT,
    description: "Calculate your HESI A2 cumulative score from the sections your nursing program requires — Math, Reading, Vocabulary, Grammar, Anatomy & Physiology, Biology and Chemistry — and check it against the program minimum.",
    metaTitle: "HESI Score Calculator — HESI A2 Cumulative Score",
    metaDescription: "Free HESI A2 score calculator. Average your section scores into the cumulative HESI score and check your nursing program's minimum.",
    calcInputs: [
      pc("math", "Math (%)", V.hesi.math), pc("reading", "Reading Comprehension (%)", V.hesi.reading), pc("vocabulary", "Vocabulary & General Knowledge (%)", V.hesi.vocabulary),
      pc("grammar", "Grammar (%)", V.hesi.grammar), pc("anatomyPhysiology", "Anatomy & Physiology (%, 0 If Not Taken)", V.hesi.anatomyPhysiology, false),
      pc("biology", "Biology (%, 0 If Not Taken)", V.hesi.biology, false), pc("chemistry", "Chemistry (%, 0 If Not Taken)", V.hesi.chemistry, false),
      pc("programMinimum", "Program Minimum Score", V.hesi.programMinimum),
    ],
    calcResult: { label: "Cumulative HESI Score", format: "percentage" },
    calcResults: [
      { key: "cumulativeScore", label: "Cumulative HESI A2 Score", format: "percentage", highlight: true },
      { key: "meetsProgramMinimum", label: "Meets Program Minimum? (1 = Yes)", format: "number" },
      { key: "sectionsTaken", label: "Sections Counted", format: "number" },
      { key: "sectionsBelowMinimum", label: "Sections Below the Minimum", format: "number" },
      { key: "lowestSection", label: "Lowest Section Score", format: "percentage" },
    ],
    instructions: "Enter your score on each HESI A2 section your program requires (leave others at 0) and the program's minimum cumulative score — commonly 75–80%.",
    examples: `Example: Math 88, Reading 84, Vocabulary 80, Grammar 82 and A&P 76 give a ${X.hesi.cumulativeScore}% cumulative score — above an 80% minimum, though A&P is below it.`,
    assumptions: "The cumulative score averages the sections a school requires; some programs also set minimums for each section or weight English and math more. Not affiliated with Elsevier.",
    faq: [
      { question: "What is a good HESI A2 score?", answer: "80% or higher is a common target, and 90%+ is competitive." },
      { question: "How is the HESI cumulative score calculated?", answer: "By averaging the scores of the sections your program requires." },
    ],
  },
  {
    slug: "ati-teas-score-calculator",
    title: "ATI TEAS Score Calculator",
    category: CAT,
    description: "Calculate your ATI TEAS 7 adjusted individual total score and proficiency level (Developmental to Exemplary) from correct answers in Reading, Math, Science and English.",
    metaTitle: "ATI TEAS Score Calculator — TEAS 7 Total & Level",
    metaDescription: "Free ATI TEAS score calculator. Calculate your TEAS 7 adjusted total score, section percentages and proficiency level.",
    calcInputs: [n("readingCorrect", "Reading Correct (of 39 Scored)", V.teas.readingCorrect, 39), n("mathCorrect", "Math Correct (of 34 Scored)", V.teas.mathCorrect, 34), n("scienceCorrect", "Science Correct (of 44 Scored)", V.teas.scienceCorrect, 44), n("englishCorrect", "English Correct (of 33 Scored)", V.teas.englishCorrect, 33)],
    calcResult: { label: "Adjusted Total", format: "percentage" },
    calcResults: [
      { key: "adjustedIndividualTotal", label: "Adjusted Individual Total Score", format: "percentage", highlight: true },
      { key: "proficiencyLevel", label: "Level (5 Exemplary, 4 Advanced, 3 Proficient, 2 Basic, 1 Developmental)", format: "number" },
      { key: "readingPercent", label: "Reading", format: "percentage" },
      { key: "mathPercent", label: "Math", format: "percentage" },
      { key: "sciencePercent", label: "Science", format: "percentage" },
      { key: "englishPercent", label: "English", format: "percentage" },
    ],
    instructions: "Enter your correct answers on the scored items in each TEAS 7 section (the test has 170 questions; 150 are scored).",
    examples: `Example: 32, 26, 31 and 25 correct give a ${X.teas.adjustedIndividualTotal}% adjusted total — Proficient.`,
    assumptions: "TEAS 7 levels: Exemplary 90.7–100%, Advanced 78.7–90%, Proficient 58.7–78%, Basic 41.3–58%, Developmental below. ATI's adjusted score equates for form difficulty, so it can differ slightly from raw percent. Not affiliated with ATI.",
    faq: [
      { question: "What is a good TEAS score?", answer: "Many nursing programs want Proficient (58.7%+); competitive programs often look for Advanced (78.7%+)." },
      { question: "How many questions are on the TEAS 7?", answer: "170, of which 150 are scored." },
    ],
  },
  {
    slug: "nbme-score-calculator",
    title: "NBME Score Calculator",
    category: CAT,
    description: "Convert your NBME self-assessment percent correct into an estimated three-digit score and your chance of passing USMLE Step 1 or Step 2 CK.",
    metaTitle: "NBME Score Calculator — Step 1 & Step 2 CK Prediction",
    metaDescription: "Free NBME score calculator. Estimate your three-digit equivalent score and pass probability for USMLE Step 1 or Step 2 CK.",
    calcInputs: [pc("percentCorrect", "Percent Correct on the Self-Assessment", V.nbme.percentCorrect), dropdown("step2", "Exam", [["USMLE Step 1 (Pass/Fail, 196)", 0], ["USMLE Step 2 CK (218 to Pass)", 1]], 0)],
    calcResult: { label: "Three-Digit Equivalent", format: "number" },
    calcResults: [
      { key: "threeDigitEquivalent", label: "Estimated Three-Digit Equivalent", format: "number", highlight: true },
      { key: "passProbability", label: "Estimated Pass Probability", format: "percentage" },
      { key: "pointsVsPassing", label: "Points Above (+) / Below (−) Passing", format: "number" },
    ],
    instructions: "Enter your percent correct on an NBME self-assessment (CBSSA or CCSSA) and choose the exam.",
    examples: `Example: 66% on a Step 1 self-assessment is about a ${X.nbme.threeDigitEquivalent} equivalent — roughly a ${Math.round(X.nbme.passProbability)}% chance of passing.`,
    assumptions: "Step 1 is pass/fail with a passing standard equivalent to 196; Step 2 CK passes at 218. NBME's own score report gives the official equivalent and probability; this percent-to-score estimate is a guide. Not affiliated with NBME or USMLE.",
    faq: [
      { question: "What NBME score do you need to pass Step 1?", answer: "An equivalent of about 196, which is often around 60–65% correct on recent forms." },
      { question: "Are NBME practice exams accurate?", answer: "They're among the best predictors, especially the most recent forms taken close to test day." },
    ],
  },
  {
    slug: "clep-score-calculator",
    title: "CLEP Score Calculator",
    category: CAT,
    description: "Estimate your CLEP scaled score (20–80) from your percent correct and see whether you've reached the 50 most colleges need to award credit.",
    metaTitle: "CLEP Score Calculator — Scaled Score & Credit",
    metaDescription: "Free CLEP score calculator. Estimate your CLEP scaled score from percent correct and check the 50 needed for college credit.",
    calcInputs: [pc("percentCorrect", "Percent of Questions Correct", V.clep.percentCorrect), n("creditsOffered", "College Credits Your School Awards", V.clep.creditsOffered, 12, false)],
    calcResult: { label: "CLEP Scaled Score", format: "number" },
    calcResults: [
      { key: "clepScaledScore", label: "Estimated Scaled Score (20–80)", format: "number", highlight: true },
      { key: "passed", label: "Credit-Granting Score (50+)? (1 = Yes)", format: "number" },
      { key: "collegeCredits", label: "College Credits Earned", format: "number" },
      { key: "percentCorrectToPass", label: "Approximate Percent Correct Needed", format: "percentage" },
    ],
    instructions: "Enter your percent correct on a practice CLEP exam and the credits your college awards for that exam.",
    examples: `Example: 62% correct estimates to about ${X.clep.clepScaledScore} — enough for ${X.clep.collegeCredits} credits at a college that uses the ACE-recommended 50.`,
    assumptions: "CLEP scaled scores run 20–80, and ACE recommends 50 for credit (some language exams award more credit at higher scores). Raw-to-scaled conversion varies by exam form. Not affiliated with the College Board.",
    faq: [
      { question: "What score do you need to pass a CLEP exam?", answer: "50 on the 20–80 scale at most colleges." },
      { question: "How many questions do you need right on CLEP?", answer: "Usually around 50–60% of the questions." },
    ],
  },
  {
    slug: "acca-exemption-calculator",
    title: "ACCA Exemption Calculator",
    category: CAT,
    description: "Estimate how many ACCA exam exemptions your qualification could earn, how many of the 13 exams you'd still sit, the exemption fees and the exam fees and months you save.",
    metaTitle: "ACCA Exemption Calculator — Exemptions & Fees Saved",
    metaDescription: "Free ACCA exemption calculator. Estimate ACCA exemptions for your degree or qualification, exams remaining and fees saved.",
    calcInputs: [
      dropdown("qualification", "Your Qualification", [
        ["ACCA-Accredited Accounting Degree (Up to 9)", 0], ["Other Accounting / Finance Degree (About 4)", 1], ["Business / Commerce Degree (About 3)", 2],
        ["Unrelated Degree (About 1)", 3], ["Other Professional Body Member, e.g. CIMA, CPA (Up to 9)", 4], ["School-Leaver / No Degree (0)", 5],
      ], 1),
      numberField("knowledgeExemptionFee", "Exemption Fee per Applied Knowledge Exam (£)", { default: 90, max: 500 }),
      numberField("skillsExemptionFee", "Exemption Fee per Applied Skills Exam (£)", { default: 130, max: 500 }),
      numberField("examFee", "Average Exam Fee You'd Otherwise Pay (£)", { default: 180, max: 1000 }),
      numberField("monthsPerExam", "Study Months per Exam", { default: 3, max: 12, step: 0.5 }),
    ],
    calcResult: { label: "Exemptions", format: "number" },
    calcResults: [
      { key: "exemptions", label: "Estimated Exemptions", format: "number", highlight: true },
      { key: "examsRemaining", label: "Exams Left to Sit (of 13)", format: "number" },
      { key: "exemptionFees", label: "Exemption Fees", format: "currency", currency: "GBP" },
      { key: "examFeesSaved", label: "Net Exam Fees Saved", format: "currency", currency: "GBP" },
      { key: "monthsSaved", label: "Study Months Saved", format: "number" },
    ],
    instructions: "Pick the qualification closest to yours and enter current fees from ACCA's website. Your exact exemptions depend on your university and year of study — check ACCA's exemptions directory.",
    examples: `Example: a non-accredited accounting degree typically earns about ${X.acca.exemptions} exemptions, leaving ${X.acca.examsRemaining} exams; at these fees that saves about £${X.acca.examFeesSaved} and ${X.acca.monthsSaved} months of study.`,
    assumptions: "ACCA's 13 exams: 3 Applied Knowledge, 6 Applied Skills, 2 Strategic Professional essentials and 2 options. Strategic Professional exams can't be exempted. Typical exemptions are shown; ACCA confirms yours by institution and course. Not affiliated with ACCA.",
    faq: [
      { question: "How many ACCA exemptions can I get?", answer: "Up to 9 with an ACCA-accredited accounting degree; usually 3–4 with other business or accounting degrees." },
      { question: "Do I have to pay for ACCA exemptions?", answer: "Yes — an exemption fee per paper, usually less than the exam fee." },
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
