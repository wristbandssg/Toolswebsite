/**
 * Batch: "Jobs & Education Calculators" → AP Score Calculators (23 tools).
 *
 * One engine, one config per exam (AP_EXAMS): the multiple-choice count and
 * weight, each free-response question's points and weight, and the
 * composite cut-points for a 5/4/3/2. Composite % = MC share × MC weight +
 * Σ FRQ share × FRQ weight. Formats follow the College Board course and
 * exam descriptions in use for the 2025–26 exams (AP Psychology's 2025
 * redesign, AP CSA's 2025 format, AP Seminar's three components); cut-points
 * are estimates from released scoring distributions, so the predicted score
 * is a guide, not College Board's curve for a given year.
 * "ap-score-calculator" is the any-exam version with a custom format.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-edu-ap-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

export interface ApExam {
  name: string;
  mcCount: number;
  mcWeight: number;
  /** [label, max points, weight]. Weights (with mcWeight) add up to 1. */
  frqs: [string, number, number][];
  /** Composite % needed for a 5, 4, 3, 2. */
  cuts: [number, number, number, number];
  /** Example raw scores: MC correct and each FRQ. */
  example: number[];
}

const even = (labels: string[], max: number, total: number): [string, number, number][] => labels.map((l) => [l, max, total / labels.length]);
const byPoints = (items: [string, number][], total: number): [string, number, number][] => {
  const pts = items.reduce((s, [, m]) => s + m, 0);
  return items.map(([l, m]) => [l, m, (total * m) / pts]);
};
const HISTORY_FRQS = (): [string, number, number][] => [
  ["Short Answer 1", 3, 0.2 / 3], ["Short Answer 2", 3, 0.2 / 3], ["Short Answer 3", 3, 0.2 / 3], ["Document-Based Question (DBQ)", 7, 0.25], ["Long Essay (LEQ)", 6, 0.15],
];
const LANGUAGE_FRQS = (): [string, number, number][] =>
  even(["Email Reply", "Argumentative Essay", "Conversation", "Cultural Comparison"], 5, 0.5);

export const AP_EXAMS: Record<string, ApExam> = {
  "ap-lang-score-calculator": { name: "AP English Language and Composition", mcCount: 45, mcWeight: 0.45, frqs: even(["Synthesis Essay", "Rhetorical Analysis Essay", "Argument Essay"], 6, 0.55), cuts: [71, 58, 45, 31], example: [33, 4, 4, 5] },
  "ap-lit-score-calculator": { name: "AP English Literature and Composition", mcCount: 55, mcWeight: 0.45, frqs: even(["Poetry Analysis", "Prose Fiction Analysis", "Literary Argument"], 6, 0.55), cuts: [68, 56, 43, 30], example: [38, 4, 4, 4] },
  "ap-world-score-calculator": { name: "AP World History: Modern", mcCount: 55, mcWeight: 0.4, frqs: HISTORY_FRQS(), cuts: [70, 58, 46, 33], example: [40, 2, 3, 2, 5, 4] },
  "ap-us-history-grade-calculator": { name: "AP United States History", mcCount: 55, mcWeight: 0.4, frqs: HISTORY_FRQS(), cuts: [72, 59, 46, 33], example: [40, 2, 3, 2, 5, 4] },
  "ap-euro-calculator": { name: "AP European History", mcCount: 55, mcWeight: 0.4, frqs: HISTORY_FRQS(), cuts: [70, 58, 45, 33], example: [38, 2, 2, 3, 4, 4] },
  "apes-score-calculator": { name: "AP Environmental Science", mcCount: 80, mcWeight: 0.6, frqs: even(["FRQ 1 — Design an Investigation", "FRQ 2 — Analyze an Environmental Problem", "FRQ 3 — Analyze a Problem with Calculations"], 10, 0.4), cuts: [69, 58, 47, 35], example: [58, 7, 6, 6] },
  "ap-stats-calculator": {
    name: "AP Statistics", mcCount: 40, mcWeight: 0.5,
    frqs: [...even(["FRQ 1", "FRQ 2", "FRQ 3", "FRQ 4", "FRQ 5"], 4, 0.375), ["FRQ 6 — Investigative Task", 4, 0.125]],
    cuts: [70, 57, 44, 32], example: [29, 3, 3, 2, 3, 2, 2],
  },
  "ap-csp-score-calculator": { name: "AP Computer Science Principles", mcCount: 70, mcWeight: 0.7, frqs: [["Create Performance Task (Written Response)", 6, 0.3]], cuts: [76, 62, 47, 33], example: [52, 5] },
  "ap-csa-score-calculator": { name: "AP Computer Science A", mcCount: 42, mcWeight: 0.55, frqs: even(["FRQ 1 — Methods and Control", "FRQ 2 — Class Design", "FRQ 3 — Data Analysis with ArrayList", "FRQ 4 — 2D Array"], 9, 0.45), cuts: [72, 58, 45, 33], example: [30, 7, 6, 6, 5] },
  "ap-chinese-score-calculator": { name: "AP Chinese Language and Culture", mcCount: 65, mcWeight: 0.5, frqs: even(["Story Narration", "Email Response", "Conversation", "Cultural Presentation"], 6, 0.5), cuts: [70, 57, 45, 32], example: [50, 5, 5, 4, 4] },
  "ap-seminar-score-calculator": {
    name: "AP Seminar", mcCount: 0, mcWeight: 0,
    frqs: [["Team Project & Presentation (%)", 100, 0.2], ["Individual Research Report & IWA (%)", 100, 0.35], ["End-of-Course Exam (%)", 100, 0.45]],
    cuts: [73, 60, 46, 32], example: [0, 80, 66, 62],
  },
  "ap-government-score-calculator": {
    name: "AP United States Government and Politics", mcCount: 55, mcWeight: 0.5,
    frqs: [["Concept Application", 3, 0.125], ["Quantitative Analysis", 4, 0.125], ["SCOTUS Comparison", 4, 0.125], ["Argument Essay", 6, 0.125]],
    cuts: [70, 57, 45, 33], example: [40, 3, 3, 3, 4],
  },
  "ap-comparative-government-score-calculator": { name: "AP Comparative Government and Politics", mcCount: 55, mcWeight: 0.5, frqs: even(["Conceptual Analysis", "Quantitative Analysis", "Comparative Analysis", "Argument Essay"], 5, 0.5), cuts: [68, 55, 43, 31], example: [38, 4, 3, 4, 3] },
  "ap-spanish-language-and-culture-score-calculator": { name: "AP Spanish Language and Culture", mcCount: 65, mcWeight: 0.5, frqs: LANGUAGE_FRQS(), cuts: [70, 58, 46, 33], example: [48, 4, 4, 4, 4] },
  "ap-french-calculator": { name: "AP French Language and Culture", mcCount: 65, mcWeight: 0.5, frqs: LANGUAGE_FRQS(), cuts: [70, 57, 45, 33], example: [46, 4, 4, 4, 3] },
  "ap-german-score-calculator": { name: "AP German Language and Culture", mcCount: 65, mcWeight: 0.5, frqs: LANGUAGE_FRQS(), cuts: [70, 57, 45, 33], example: [46, 4, 4, 3, 4] },
  "ap-japanese-score-calculator": { name: "AP Japanese Language and Culture", mcCount: 65, mcWeight: 0.5, frqs: even(["Text Chat", "Story Narration", "Conversation", "Cultural Perspective Presentation"], 6, 0.5), cuts: [72, 58, 45, 32], example: [50, 5, 4, 5, 4] },
  "ap-biology-calculator": {
    name: "AP Biology", mcCount: 60, mcWeight: 0.5,
    frqs: byPoints([["Long FRQ 1 — Interpreting an Experiment", 9], ["Long FRQ 2 — Data Analysis", 9], ["Short FRQ 3", 4], ["Short FRQ 4", 4], ["Short FRQ 5", 4], ["Short FRQ 6", 4]], 0.5),
    cuts: [70, 58, 46, 34], example: [44, 6, 6, 3, 3, 2, 3],
  },
  "ap-african-american-studies-score-calculator": { name: "AP African American Studies", mcCount: 60, mcWeight: 0.5, frqs: even(["Short Answer 1", "Short Answer 2", "Document-Based 1", "Document-Based 2"], 4, 0.5), cuts: [70, 58, 46, 34], example: [44, 3, 3, 3, 3] },
  "ap-psych-test-calculator": { name: "AP Psychology", mcCount: 75, mcWeight: 2 / 3, frqs: [["Article Analysis Question (AAQ)", 7, 1 / 6], ["Evidence-Based Question (EBQ)", 7, 1 / 6]], cuts: [72, 60, 47, 35], example: [56, 5, 5] },
  "ap-hug-calculator-score": { name: "AP Human Geography", mcCount: 60, mcWeight: 0.5, frqs: even(["FRQ 1 — No Stimulus", "FRQ 2 — One Stimulus", "FRQ 3 — Two Stimuli"], 7, 0.5), cuts: [70, 58, 45, 33], example: [44, 5, 5, 4] },
  "apah-score-calculator": {
    name: "AP Art History", mcCount: 80, mcWeight: 0.5,
    frqs: byPoints([["Long Essay — Comparison", 8], ["Long Essay — Visual / Contextual", 6], ["Short Essay 3", 5], ["Short Essay 4", 5], ["Short Essay 5", 5], ["Short Essay 6", 5]], 0.5),
    cuts: [68, 57, 45, 33], example: [56, 6, 4, 4, 3, 4, 3],
  },
};

function score(exam: ApExam, mc: number, frq: number[]) {
  const mcPart = exam.mcCount > 0 ? (Math.min(exam.mcCount, nonNeg(mc)) / exam.mcCount) * exam.mcWeight * 100 : 0;
  const frqPart = exam.frqs.reduce((s, [, max, w], i) => s + (Math.min(max, nonNeg(frq[i])) / max) * w * 100, 0);
  const composite = mcPart + frqPart;
  const level = exam.cuts.findIndex((c) => composite >= c);
  const predicted = level === -1 ? 1 : 5 - level;
  const nextCut = predicted < 5 ? exam.cuts[4 - predicted] : 0;
  const frqWeight = exam.frqs.reduce((s, [, , w]) => s + w, 0);
  return {
    predictedApScore: predicted,
    compositePercent: round2(composite),
    multipleChoicePercent: exam.mcCount > 0 ? round2((nonNeg(mc) / exam.mcCount) * 100) : 0,
    freeResponsePercent: frqWeight > 0 ? round2((frqPart / (frqWeight * 100)) * 100) : 0,
    compositePointsToNextScore: predicted < 5 ? round2(nextCut - composite) : 0,
  };
}

export const apExamScore = (exam: ApExam): CustomCalculator => (v) => score(exam, v.mcCorrect, exam.frqs.map((_, i) => v[`frq${i + 1}`]));

export const apScoreAnyExam: CustomCalculator = (v) => {
  const mcTotal = Math.max(1, nonNeg(v.mcTotal, 1));
  const frqTotal = Math.max(1, nonNeg(v.frqPossible, 1));
  const w = Math.min(100, nonNeg(v.mcWeightPercent)) / 100;
  const exam: ApExam = { name: "AP", mcCount: mcTotal, mcWeight: w, frqs: [["Free Response", frqTotal, 1 - w]], cuts: [70, 57, 44, 31], example: [] };
  return score(exam, v.mcCorrect, [v.frqEarned]);
};

export const eduApCustomCalculators: Record<string, CustomCalculator> = {
  ...Object.fromEntries(Object.entries(AP_EXAMS).map(([slug, exam]) => [slug, apExamScore(exam)])),
  "ap-score-calculator": apScoreAnyExam,
};
