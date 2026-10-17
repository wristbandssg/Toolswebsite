// One-time (but safe to re-run) batch setup script: creates 9 international exam and admission
// points tools from the user's jobs & education list (Jobs & Education Calculators >
// International Exam & Admission Points Calculators). Examples are computed from
// src/lib/calc-engine-edu-intl.ts.
//
// HOW TO RUN (after prisma/setup-jobs-education-category.ts --apply)
//   npx tsx prisma/create-edu-intl-calculators.ts
// or
//   npm run db:create-edu-intl-calculators

import * as E from "../src/lib/calc-engine-edu-intl";
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

const YN = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);

const CAT = "international-exam-points-calculators";
const run = (fn: E.CustomCalculator, values: Record<string, number>) => fn(values) as Record<string, number>;
const n = (key: string, label: string, def: number, max: number, required = true, step = 1, min = 0) => numberField(key, label, { default: def, max, required, step, min });

const V = {
  atar: { englishScore: 38, subject2: 40, subject3: 36, subject4: 34, subject5: 32, subject6: 30 },
  ib: { subject1: 6, subject2: 6, subject3: 5, subject4: 6, subject5: 5, subject6: 7, tok: 1, ee: 1, casComplete: 1 },
  ucas: { aLevel1: 1, aLevel2: 2, aLevel3: 2, aLevel4: 6, asLevel1: 5, asLevel2: 5, epq: 1, offerPoints: 128 },
  ielts: { listeningCorrect: 31, readingCorrect: 29, writingBand: 6.5, speakingBand: 7, generalTraining: 0, targetBand: 7, minimumSectionBand: 6.5 },
  toefl: { reading: 26, listening: 27, speaking: 24, writing: 25, requiredScore: 100 },
  cao: { subject1: 3, subject2: 1, subject3: 2, subject4: 3, subject5: 2, subject6: 4, subject7: 9, subject8: -1, coursePoints: 500 },
  ucat: { verbal: 640, decision: 670, quant: 700, sjtBand: 2 },
  upsc: { birthYear: 1998, birthMonth: 5, birthDay: 14, examYear: 2027, category: 0 },
  nda: { birthYear: 2009, birthMonth: 3, birthDay: 10, examYear: 2026, ndaTwo: 1 },
};
const X = {
  atar: run(E.atar, V.atar), ib: run(E.ibScore, V.ib), ucas: run(E.ucasPoints, V.ucas), ielts: run(E.ieltsScore, V.ielts), toefl: run(E.toeflScore, V.toefl),
  cao: run(E.caoPoints, V.cao), ucat: run(E.ucatScore, V.ucat), upsc: run(E.upscAge, V.upsc), nda: run(E.ndaAge, V.nda),
};

const birthInputs = (d: { birthYear: number; birthMonth: number; birthDay: number }) => [
  n("birthYear", "Birth Year", d.birthYear, 2030, true, 1, 1950),
  n("birthMonth", "Birth Month (1–12)", d.birthMonth, 12, true, 1, 1),
  n("birthDay", "Birth Day (1–31)", d.birthDay, 31, true, 1, 1),
];
const A_OPTS: [string, number][] = [["A*", 0], ["A", 1], ["B", 2], ["C", 3], ["D", 4], ["E", 5], ["None", 6]];
const AS_OPTS: [string, number][] = [["A", 0], ["B", 1], ["C", 2], ["D", 3], ["E", 4], ["None", 5]];
const GRADE_AE: [string, number][] = [["A", 0], ["B", 1], ["C", 2], ["D", 3], ["E (Failing Condition)", 4]];
const CAO_OPTS: [string, number][] = [
  ...["H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8"].map((g, i): [string, number] => [`Higher ${g}`, i]),
  ...["O1", "O2", "O3", "O4", "O5", "O6", "O7", "O8"].map((g, i): [string, number] => [`Ordinary ${g}`, i + 8]),
  ["Not Taken", -1],
];

const TOOLS: ToolDef[] = [
  {
    slug: "atar-calculator",
    title: "ATAR Calculator",
    category: CAT,
    description: "Estimate your ATAR from your scaled study scores — English plus your best three other subjects, with 10% of your fifth and sixth — the Victorian (VCE) aggregate method, as a guide for other states too.",
    metaTitle: "ATAR Calculator — Estimate Your ATAR from Study Scores",
    metaDescription: "Free ATAR calculator. Estimate your ATAR from scaled VCE study scores: English, best three subjects and 10% increments.",
    calcInputs: [
      n("englishScore", "English Scaled Study Score", V.atar.englishScore, 60, true, 0.5),
      ...[2, 3, 4, 5, 6].map((i) => n(`subject${i}`, `Subject ${i} Scaled Study Score${i > 4 ? " (Optional)" : ""}`, (V.atar as Record<string, number>)[`subject${i}`], 60, i <= 4, 0.5)),
    ],
    calcResult: { label: "Estimated ATAR", format: "number", decimals: 2 },
    calcResults: [
      { key: "estimatedAtar", label: "Estimated ATAR", format: "number", decimals: 2, highlight: true },
      { key: "aggregate", label: "ATAR Aggregate", format: "number" },
      { key: "primaryFour", label: "Primary Four (English + Best Three)", format: "number" },
      { key: "incrementBonus", label: "10% Increments (5th & 6th)", format: "number" },
    ],
    instructions: "Enter your scaled study scores (after VTAC scaling — use last year's scaling report to scale raw study scores). The best three non-English subjects are picked automatically.",
    examples: `Example: English 38 with scaled scores of 40, 36, 34, 32 and 30 give an aggregate of ${X.atar.aggregate} — an estimated ATAR of about ${X.atar.estimatedAtar}.`,
    assumptions: "Uses the VCE aggregate (English + best three + 10% of the next two) and an approximate aggregate-to-ATAR table from recent years; each year's table differs. NSW (HSC), Queensland, WA and SA use different scaling and aggregates, so treat results there as a rough guide. Not affiliated with VTAC or UAC.",
    faq: [
      { question: "How is the ATAR calculated?", answer: "Your scaled subject scores are combined into an aggregate, which is ranked against everyone in your age group and converted to a percentile-style rank from 0 to 99.95." },
      { question: "What is a good ATAR?", answer: "Around 80+ opens most university courses; medicine and law often need 95–99+." },
    ],
  },
  {
    slug: "ib-score-calculator",
    title: "IB Score Calculator",
    category: CAT,
    description: "Calculate your IB Diploma score out of 45 — six subject grades plus up to 3 core points from Theory of Knowledge and the Extended Essay — and check the main conditions for being awarded the diploma.",
    metaTitle: "IB Score Calculator — IB Diploma Points out of 45",
    metaDescription: "Free IB score calculator. Add your six subject grades and TOK/EE core points out of 45 and check if you meet the IB Diploma requirements.",
    calcInputs: [
      ...[1, 2, 3].map((i) => n(`subject${i}`, `HL Subject ${i} Grade (1–7)`, (V.ib as Record<string, number>)[`subject${i}`], 7, true, 1, 1)),
      ...[4, 5, 6].map((i) => n(`subject${i}`, `SL Subject ${i - 3} Grade (1–7)`, (V.ib as Record<string, number>)[`subject${i}`], 7, true, 1, 1)),
      dropdown("tok", "Theory of Knowledge Grade", GRADE_AE, 1),
      dropdown("ee", "Extended Essay Grade", GRADE_AE, 1),
      YN("casComplete", "CAS Requirements Completed", 1),
    ],
    calcResult: { label: "IB Total", format: "number" },
    calcResults: [
      { key: "totalPoints", label: "IB Diploma Total (of 45)", format: "number", highlight: true },
      { key: "subjectPoints", label: "Subject Points (of 42)", format: "number" },
      { key: "corePoints", label: "Core Points (of 3)", format: "number" },
      { key: "higherLevelPoints", label: "HL Points", format: "number" },
      { key: "standardLevelPoints", label: "SL Points", format: "number" },
      { key: "diplomaAwarded", label: "Meets Diploma Conditions? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter your three Higher Level and three Standard Level grades (predicted or final), your TOK and EE grades and whether CAS is complete.",
    examples: `Example: 6, 6, 5 at HL and 6, 5, 7 at SL with B in both TOK and EE give ${X.ib.subjectPoints} + ${X.ib.corePoints} = ${X.ib.totalPoints} points — the diploma conditions are met.`,
    assumptions: "Core points use the IB matrix (A/A = 3 down to C/D = 0; an E in either is a failing condition). Checks: at least 24 points, no grade 1, no more than two 2s, no more than three grades of 3 or below, at least 12 HL and 9 SL points, and CAS complete. Not affiliated with the International Baccalaureate.",
    faq: [
      { question: "What is the maximum IB score?", answer: "45 — 42 from six subjects and 3 core points from TOK and the Extended Essay." },
      { question: "What is a good IB score?", answer: "The worldwide average is about 30; 38+ is competitive for top universities." },
    ],
  },
  {
    slug: "ucas-points-calculator",
    title: "UCAS Points Calculator",
    category: CAT,
    description: "Add up your UCAS Tariff points from A levels, AS levels and the Extended Project (EPQ), and compare them with a university course's points offer.",
    metaTitle: "UCAS Points Calculator — UCAS Tariff for A Levels & EPQ",
    metaDescription: "Free UCAS points calculator. Calculate UCAS Tariff points for A levels, AS levels and the EPQ and compare with a course's offer.",
    calcInputs: [
      ...[1, 2, 3, 4].map((i) => dropdown(`aLevel${i}`, `A Level ${i}`, A_OPTS, (V.ucas as Record<string, number>)[`aLevel${i}`])),
      ...[1, 2].map((i) => dropdown(`asLevel${i}`, `AS Level ${i}`, AS_OPTS, 5)),
      dropdown("epq", "Extended Project (EPQ)", A_OPTS, 1),
      n("offerPoints", "Course's UCAS Points Offer (Optional)", V.ucas.offerPoints, 300, false),
    ],
    calcResult: { label: "UCAS Points", format: "number" },
    calcResults: [
      { key: "ucasTariffPoints", label: "Total UCAS Tariff Points", format: "number", highlight: true },
      { key: "aLevelPoints", label: "A Level Points", format: "number" },
      { key: "asLevelPoints", label: "AS Level Points", format: "number" },
      { key: "epqPoints", label: "EPQ Points", format: "number" },
      { key: "pointsVsOffer", label: "Points Above (+) / Below (−) the Offer", format: "number" },
    ],
    instructions: "Pick your grade (predicted or achieved) for each A level, AS level and the EPQ, and enter the course's points offer if it gives one.",
    examples: `Example: A, B, B at A level plus an A in the EPQ give ${X.ucas.ucasTariffPoints} points — ${X.ucas.pointsVsOffer} above a 128-point offer.`,
    assumptions: "UCAS Tariff: A level A* 56, A 48, B 40, C 32, D 24, E 16; AS A 20 … E 6; EPQ A* 28 … E 8. Many courses make grade offers (e.g. AAB) instead of points; BTECs, Scottish Highers and IB have their own Tariff values.",
    faq: [
      { question: "How many UCAS points is AAB?", answer: "136 points (48 + 48 + 40)." },
      { question: "How many UCAS points is an EPQ worth?", answer: "Up to 28 for an A*, about half an A level." },
    ],
  },
  {
    slug: "ielts-score-calculator",
    title: "IELTS Score Calculator",
    category: CAT,
    description: "Calculate your IELTS band scores — convert Listening and Reading raw scores (Academic or General Training) to bands, add Writing and Speaking, and get your overall band with official IELTS rounding.",
    metaTitle: "IELTS Score Calculator — Band Score & Overall Band",
    metaDescription: "Free IELTS score calculator. Convert Listening and Reading raw scores to bands and calculate your overall IELTS band with official rounding.",
    calcInputs: [
      dropdown("generalTraining", "Test Type", [["Academic", 0], ["General Training", 1]], 0),
      n("listeningCorrect", "Listening Correct (of 40)", V.ielts.listeningCorrect, 40),
      n("readingCorrect", "Reading Correct (of 40)", V.ielts.readingCorrect, 40),
      numberField("writingBand", "Writing Band (0–9)", { default: V.ielts.writingBand, max: 9, step: 0.5 }),
      numberField("speakingBand", "Speaking Band (0–9)", { default: V.ielts.speakingBand, max: 9, step: 0.5 }),
      numberField("targetBand", "Overall Band You Need", { default: V.ielts.targetBand, max: 9, step: 0.5, required: false }),
      numberField("minimumSectionBand", "Minimum Band in Each Section", { default: V.ielts.minimumSectionBand, max: 9, step: 0.5, required: false }),
    ],
    calcResult: { label: "Overall Band", format: "number" },
    calcResults: [
      { key: "overallBand", label: "Overall Band Score", format: "number", highlight: true },
      { key: "listeningBand", label: "Listening Band", format: "number" },
      { key: "readingBand", label: "Reading Band", format: "number" },
      { key: "writingBand", label: "Writing Band", format: "number" },
      { key: "speakingBand", label: "Speaking Band", format: "number" },
      { key: "meetsTarget", label: "Meets Your Requirement? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter your Listening and Reading correct answers (out of 40) from a practice test and your Writing and Speaking bands, and the score your university or visa requires.",
    examples: `Example: 31 Listening (${X.ielts.listeningBand}), 29 Academic Reading (${X.ielts.readingBand}), Writing 6.5 and Speaking 7.0 average 6.75, which rounds up to an overall ${X.ielts.overallBand}.`,
    assumptions: "Raw-to-band tables are the typical published conversions; each test version can vary by about a mark. The overall band is the average of the four sections: a .25 average rounds up to the next half band and .75 up to the next whole band. Not affiliated with IDP, the British Council or Cambridge.",
    faq: [
      { question: "How is the IELTS overall score calculated?", answer: "By averaging the four section bands and rounding to the nearest half band, with .25 and .75 rounding up." },
      { question: "How many correct answers for band 7 in IELTS Listening?", answer: "About 30–31 out of 40." },
    ],
  },
  {
    slug: "toefl-score-calculator",
    title: "TOEFL Score Calculator",
    category: CAT,
    description: "Calculate your TOEFL iBT total (0–120) from your four section scores and see the equivalent on the new 1–6 band scale introduced in January 2026, with the CEFR level.",
    metaTitle: "TOEFL Score Calculator — 0–120 Total & New 1–6 Band",
    metaDescription: "Free TOEFL score calculator. Add up Reading, Listening, Speaking and Writing (0–120) and convert to the new 1–6 TOEFL band and CEFR level.",
    calcInputs: [
      n("reading", "Reading (0–30)", V.toefl.reading, 30), n("listening", "Listening (0–30)", V.toefl.listening, 30),
      n("speaking", "Speaking (0–30)", V.toefl.speaking, 30), n("writing", "Writing (0–30)", V.toefl.writing, 30),
      n("requiredScore", "Score You Need (0–120, Optional)", V.toefl.requiredScore, 120, false),
    ],
    calcResult: { label: "TOEFL Total", format: "number" },
    calcResults: [
      { key: "totalScore", label: "TOEFL iBT Total (0–120)", format: "number", highlight: true },
      { key: "newScaleBand", label: "Equivalent on the 1–6 Scale", format: "number" },
      { key: "cefrLevel", label: "CEFR Level (6 = C2, 5 = C1, 4 = B2, 3 = B1, 2 = A2)", format: "number" },
      { key: "pointsVsRequirement", label: "Points Above (+) / Below (−) Requirement", format: "number" },
    ],
    instructions: "Enter your four section scores on the 0–30 scale (from a practice test or a pre-2026 score report). Enter the minimum your program requires.",
    examples: `Example: 26 + 27 + 24 + 25 = ${X.toefl.totalScore}, which corresponds to about ${X.toefl.newScaleBand} on the 1–6 scale (CEFR C1) — 2 points above a 100 requirement.`,
    assumptions: "Since 21 January 2026, TOEFL iBT reports scores on a 1–6 band scale (with a comparable 0–120 score during a two-year transition). Lower bounds used: 6 = 114+, 5 = 95+, 4 = 72+, 3 = 44+; half bands are interpolated. Not affiliated with ETS.",
    faq: [
      { question: "What is the new TOEFL score scale?", answer: "From January 2026, a 1–6 band scale aligned with CEFR; ETS also shows a comparable 0–120 score until about 2028." },
      { question: "What is a good TOEFL score?", answer: "Around 90–100 (about 4.5–5 on the new scale) for many universities; top programs often want 100–110+." },
    ],
  },
  {
    slug: "cao-points-calculator",
    title: "CAO Points Calculator",
    category: CAT,
    description: "Calculate your CAO points from your Leaving Certificate results — your best six subjects at Higher or Ordinary level, plus the 25-point bonus for Higher Level Maths at H6 or above.",
    metaTitle: "CAO Points Calculator — Leaving Cert Points",
    metaDescription: "Free CAO points calculator. Add your best six Leaving Certificate grades with the Higher Maths bonus and compare with course points.",
    calcInputs: [
      dropdown("subject1", "Mathematics", CAO_OPTS, 3),
      ...[2, 3, 4, 5, 6, 7, 8].map((i) => dropdown(`subject${i}`, `Subject ${i}`, CAO_OPTS, (V.cao as Record<string, number>)[`subject${i}`] ?? -1)),
      n("coursePoints", "Course Points Required (Optional)", V.cao.coursePoints, 625, false),
    ],
    calcResult: { label: "CAO Points", format: "number" },
    calcResults: [
      { key: "caoPoints", label: "CAO Points (Best Six)", format: "number", highlight: true },
      { key: "mathsBonus", label: "Higher Maths Bonus", format: "number" },
      { key: "subjectsCounted", label: "Subjects Counted", format: "number" },
      { key: "pointsVsCourse", label: "Points Above (+) / Below (−) the Course", format: "number" },
    ],
    instructions: "Pick your grade and level for Maths and each other subject (up to eight). The best six are counted automatically.",
    examples: `Example: H4 in Higher Maths (66 + 25 bonus), H2, H3, H4, H3, H5 and an O2 give ${X.cao.caoPoints} points from the best six.`,
    assumptions: "Higher: H1 100, H2 88, H3 77, H4 66, H5 56, H6 46, H7 37, H8 0. Ordinary: O1 56, O2 46, O3 37, O4 28, O5 20, O6 12. +25 for Higher Maths H1–H6. LCVP Link Modules count as a subject (Distinction 66, Merit 46, Pass 28) — enter as the closest grade. Maximum 625. Courses also have minimum subject requirements.",
    faq: [
      { question: "How are CAO points calculated?", answer: "Add the points for your best six Leaving Cert subjects, plus 25 if you got H6 or better in Higher Maths." },
      { question: "What is the maximum CAO points?", answer: "625 — six H1s (600) plus the 25-point maths bonus." },
    ],
  },
  {
    slug: "ucat-score-calculator",
    title: "UCAT Score Calculator",
    category: CAT,
    description: "Calculate your UCAT total from Verbal Reasoning, Decision Making and Quantitative Reasoning (300–900 each), your estimated percentile and decile, and your Situational Judgement band.",
    metaTitle: "UCAT Score Calculator — Total, Percentile & Decile",
    metaDescription: "Free UCAT score calculator. Add your three cognitive subtest scores, see your percentile and decile, and your SJT band.",
    calcInputs: [
      n("verbal", "Verbal Reasoning (300–900)", V.ucat.verbal, 900, true, 10, 300),
      n("decision", "Decision Making (300–900)", V.ucat.decision, 900, true, 10, 300),
      n("quant", "Quantitative Reasoning (300–900)", V.ucat.quant, 900, true, 10, 300),
      dropdown("sjtBand", "Situational Judgement Band", [["Band 1", 1], ["Band 2", 2], ["Band 3", 3], ["Band 4", 4]], 2),
    ],
    calcResult: { label: "UCAT Total", format: "number" },
    calcResults: [
      { key: "totalScore", label: "UCAT Total (900–2700)", format: "number", highlight: true },
      { key: "estimatedPercentile", label: "Estimated Percentile", format: "number" },
      { key: "decile", label: "Estimated Decile (10 = Top)", format: "number" },
      { key: "averageSubtest", label: "Average Subtest Score", format: "number" },
      { key: "sjtBand", label: "SJT Band", format: "number" },
    ],
    instructions: "Enter your three cognitive subtest scores from your UCAT result or practice test, and your SJT band.",
    examples: `Example: 640 VR, 670 DM and 700 QR total ${X.ucat.totalScore} — about the ${Math.round(X.ucat.estimatedPercentile)}th percentile (decile ${X.ucat.decile}).`,
    assumptions: "Since 2025 the UCAT has three cognitive subtests (Abstract Reasoning was removed), so totals run 900–2700. Percentiles are approximated from recent decile tables and change each year. Medical schools use the total, deciles and SJT band differently. Not affiliated with the UCAT Consortium.",
    faq: [
      { question: "What is a good UCAT score?", answer: "Roughly 2000+ is in the top 30% under the three-subtest format; top-decile scores are around 2150+." },
      { question: "Is Abstract Reasoning still in the UCAT?", answer: "No — it was removed from 2025, leaving Verbal Reasoning, Decision Making, Quantitative Reasoning and SJT." },
    ],
  },
  {
    slug: "age-calculator-of-upsc",
    title: "Age Calculator of UPSC",
    category: CAT,
    description: "Check your age eligibility for the UPSC Civil Services Exam — your age on 1 August of the exam year, the upper age limit for your category (General, OBC, SC/ST, PwBD) and the attempts allowed.",
    metaTitle: "UPSC Age Calculator — Civil Services Age Limit Check",
    metaDescription: "Free UPSC age calculator. Find your age on 1 August, the CSE age limit for your category and whether you're eligible, with attempts allowed.",
    calcInputs: [
      ...birthInputs(V.upsc),
      n("examYear", "Exam Year", V.upsc.examYear, 2040, true, 1, 2024),
      dropdown("category", "Category", [["General / EWS", 0], ["OBC", 1], ["SC / ST", 2], ["PwBD (General)", 3], ["PwBD (OBC)", 4], ["PwBD (SC / ST)", 5]], 0),
    ],
    calcResult: { label: "Eligible", format: "number" },
    calcResults: [
      { key: "eligible", label: "Age-Eligible? (1 = Yes)", format: "number", highlight: true },
      { key: "ageYearsOnAugust1", label: "Age on 1 August (Years)", format: "number" },
      { key: "ageExtraMonths", label: "Plus Months", format: "number" },
      { key: "upperAgeLimit", label: "Upper Age Limit for Your Category", format: "number" },
      { key: "yearsLeftToApply", label: "More Years You Can Apply", format: "number" },
      { key: "attemptsAllowed", label: "Attempts Allowed (0 = Unlimited Within Age)", format: "number" },
    ],
    instructions: "Enter your date of birth as on your matriculation certificate, the exam year and your category.",
    examples: `Example: born 14 May 1998, a General candidate is ${X.upsc.ageYearsOnAugust1} years ${X.upsc.ageExtraMonths} months on 1 August 2027 — eligible, with ${X.upsc.yearsLeftToApply} more years before the limit.`,
    assumptions: "UPSC CSE: at least 21 and must not have reached 32 on 1 August of the exam year (General/EWS); relaxation of 3 years for OBC, 5 for SC/ST and 10 for PwBD; ex-servicemen and some others get additional relaxation not modeled. Attempts: 6 General/EWS, 9 OBC and PwBD, unlimited for SC/ST within the age limit. Check the current UPSC notification.",
    faq: [
      { question: "What is the age limit for UPSC?", answer: "21 to 32 for General and EWS candidates, 35 for OBC and 37 for SC/ST, on 1 August of the exam year." },
      { question: "How many attempts are allowed in UPSC?", answer: "6 for General/EWS, 9 for OBC and PwBD, and unlimited (within the age limit) for SC/ST." },
    ],
  },
  {
    slug: "age-calculator-of-nda",
    title: "Age Calculator of NDA",
    category: CAT,
    description: "Check your age eligibility for the NDA & NA exam — your age when the course starts and whether you fall within the 16½ to 19½ year window for NDA (I) or NDA (II).",
    metaTitle: "NDA Age Calculator — NDA Age Limit Eligibility Check",
    metaDescription: "Free NDA age calculator. Check if your date of birth fits the NDA (I) or NDA (II) age limit of 16½ to 19½ years at course start.",
    calcInputs: [
      ...birthInputs(V.nda),
      n("examYear", "Exam Year", V.nda.examYear, 2040, true, 1, 2024),
      dropdown("ndaTwo", "Exam", [["NDA (I) — Course Starts January", 0], ["NDA (II) — Course Starts July", 1]], 1),
    ],
    calcResult: { label: "Eligible", format: "number" },
    calcResults: [
      { key: "eligible", label: "Age-Eligible? (1 = Yes)", format: "number", highlight: true },
      { key: "ageYearsAtCourseStart", label: "Age at Course Start (Years)", format: "number" },
      { key: "ageExtraMonths", label: "Plus Months", format: "number" },
      { key: "monthsTooYoung", label: "Months Too Young", format: "number" },
      { key: "monthsTooOld", label: "Months Too Old", format: "number" },
    ],
    instructions: "Enter your date of birth, the year you'll sit the exam and whether it's NDA (I) or NDA (II).",
    examples: `Example: born 10 March 2009 and sitting NDA (II) 2026, you'd be ${X.nda.ageYearsAtCourseStart} years ${X.nda.ageExtraMonths} months when the course starts in July 2027 — eligible.`,
    assumptions: "NDA admits unmarried candidates aged 16½ to 19½ at course commencement; UPSC's notification states the exact birth-date window (for example 2 January to 1 January three years apart). Courses start around 2 January (NDA I) and 1 July (NDA II) of the following year. Always confirm with the official notification.",
    faq: [
      { question: "What is the age limit for NDA?", answer: "16½ to 19½ years at the start of the course, shown as a birth-date window in each notification." },
      { question: "Can I apply for NDA after 12th?", answer: "Yes — students in or after Class 12 can apply if their date of birth falls in the window." },
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
