// One-time (but safe to re-run) batch setup script: creates 21 GPA tools from the user's
// jobs & education list (Jobs & Education Calculators > GPA Calculators). School-specific GPA
// keywords (ASU, UCLA, Penn State, …) are covered by university-gpa-calculator's scale presets
// (user decision, 17 Oct 2026: consolidate school pages). Examples are computed from
// src/lib/calc-engine-edu-gpa.ts so the copy always matches the calculator.
//
// HOW TO RUN (after prisma/setup-jobs-education-category.ts --apply)
//   npx tsx prisma/create-edu-gpa-calculators.ts
// or
//   npm run db:create-edu-gpa-calculators

import * as E from "../src/lib/calc-engine-edu-gpa";
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

const CAT = "gpa-calculators";
const LETTERS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
const LETTER_OPTIONS: [string, number][] = LETTERS.map((l, i) => [l, i]);
const run = (fn: E.CustomCalculator, values: Record<string, number>) => fn(values) as Record<string, number>;

/** Course rows. `grades` are letter indexes; `extra` adds a per-row dropdown (level, category or retake). */
function courseRows(o: {
  grades: number[];
  credits: number[];
  creditLabel?: string;
  extra?: { key: string; label: string; options: [string, number][]; defaults: number[] };
}) {
  const fields: Record<string, unknown>[] = [];
  for (let i = 1; i <= 8; i++) {
    const req = i === 1;
    fields.push(dropdown(`grade${i}`, `Course ${i}: Grade`, LETTER_OPTIONS, o.grades[i - 1] ?? 1));
    fields.push(numberField(`credits${i}`, `Course ${i}: ${o.creditLabel ?? "Credits"} (0 = Skip)`, { default: o.credits[i - 1] ?? 0, max: 20, step: 0.5, required: req }));
    if (o.extra) fields.push(dropdown(`${o.extra.key}${i}`, `Course ${i}: ${o.extra.label}`, o.extra.options, o.extra.defaults[i - 1] ?? o.extra.options[0][1]));
  }
  return fields;
}
const values = (grades: number[], credits: number[], extra?: { key: string; defaults: number[] }) => {
  const v: Record<string, number> = {};
  for (let i = 1; i <= 8; i++) {
    v[`grade${i}`] = grades[i - 1] ?? 1;
    v[`credits${i}`] = credits[i - 1] ?? 0;
    if (extra) v[`${extra.key}${i}`] = extra.defaults[i - 1] ?? 0;
  }
  return v;
};

const PRIOR = [
  numberField("priorGpa", "Current Cumulative GPA (Optional)", { default: 0, max: 4.33, step: 0.01, required: false }),
  numberField("priorCredits", "Credits Already Completed (Optional)", { default: 0, max: 500, step: 0.5, required: false }),
];

const CATEGORY_OPTIONS: [string, number][] = [["Biology", 0], ["Chemistry", 1], ["Physics", 2], ["Math", 3], ["Other Science", 4], ["Non-Science", 5]];
const LEVEL_OPTIONS: [string, number][] = [["Regular", 0], ["Honors", 1], ["AP / IB / AICE", 2], ["Dual Enrollment", 3]];

// Shared example transcripts.
const G = [1, 3, 4, 2, 0, 5, 6, 1]; // A, B+, B, A-, A+, B-, C+, A
const C3 = [3, 4, 3, 3, 4, 3, 0, 0];
const SCI_G = [4, 2, 3, 1, 6, 4, 1, 3];
const SCI_C = [4, 4, 4, 3, 4, 3, 3, 3];
const SCI_T = [0, 1, 1, 3, 2, 5, 5, 0];

function centralTool(slug: string, title: string, service: string, fn: E.CustomCalculator, results: { key: string; label: string }[], scaleNote: string, extra: string): ToolDef {
  const ex = run(fn, values(SCI_G, SCI_C, { key: "type", defaults: SCI_T }));
  return {
    slug,
    title,
    category: CAT,
    description: `Calculate your ${service} GPAs the way the application service does — overall, science and the other GPA breakdowns ${service} reports — from your transcript grades, credits and course categories.`,
    metaTitle: `${title} — ${service} Science & Overall GPA`.slice(0, 70),
    metaDescription: `Free ${service} GPA calculator. Recalculate your overall and science GPA on ${service}'s grade scale, with courses grouped into its categories.`,
    calcInputs: courseRows({ grades: SCI_G, credits: SCI_C, extra: { key: "type", label: "Course Category", options: CATEGORY_OPTIONS, defaults: SCI_T } }),
    calcResult: { label: "Overall GPA", format: "number", decimals: 3 },
    calcResults: results.map((r, i) => ({ ...r, format: r.key.endsWith("Credits") ? "number" : "number", decimals: r.key.endsWith("Credits") ? 1 : 3, highlight: i === 0 })),
    instructions: `Enter each course's grade and semester credits exactly as they appear on your transcript, and pick its ${service} course category (biology, chemistry, physics, math, other science or non-science). Quarter credits should be converted to semester credits (× 0.667) the way ${service} does. Retaken courses are entered again — ${service} counts every attempt.`,
    examples: `Example: eight courses — four science classes with A-, B+, B and A, a C+ physics course, an A- math course and two non-science courses — give an overall ${service} GPA of ${ex.overallGpa.toFixed(3)} and a science GPA of ${ex.scienceGpa.toFixed(3)}.`,
    assumptions: `${scaleNote} ${extra} This is an estimate of the verified GPA; ${service} recalculates from official transcripts and its own course classification.`,
    faq: [
      { question: `How does ${service} calculate GPA?`, answer: `It converts every grade on every college transcript to its own scale, multiplies by credits and averages them — including repeats and courses from all schools.` },
      { question: `Does ${service} replace retaken grades?`, answer: `No. ${service} includes every attempt, even if your school replaced the original grade.` },
    ],
  };
}

const TOOLS: ToolDef[] = [
  (() => {
    const ex = run(E.gpa, { ...values(G, C3), priorGpa: 3.2, priorCredits: 30 });
    return {
      slug: "gpa-calculator",
      title: "GPA Calculator",
      category: CAT,
      description: "Calculate your GPA for a semester and your new cumulative GPA — enter letter grades and credit hours for each class and your current GPA. Works for college and high school on the standard 4.0 scale.",
      metaTitle: "GPA Calculator — Semester & Cumulative GPA (4.0 Scale)",
      metaDescription: "Free GPA calculator. Enter grades and credits to get your semester GPA and new cumulative GPA on the 4.0 scale, for college or high school.",
      calcInputs: [...courseRows({ grades: G, credits: C3 }), ...PRIOR],
      calcResult: { label: "Term GPA", format: "number", decimals: 3 },
      calcResults: [
        { key: "termGpa", label: "Semester GPA", format: "number", decimals: 3, highlight: true },
        { key: "cumulativeGpa", label: "New Cumulative GPA", format: "number", decimals: 3 },
        { key: "termCredits", label: "Semester Credits", format: "number" },
        { key: "totalCredits", label: "Total Credits", format: "number" },
        { key: "qualityPoints", label: "Semester Quality Points", format: "number" },
      ],
      instructions: "Pick the letter grade and enter the credit hours for each class (leave unused rows at 0 credits). To see your new cumulative GPA, add your current GPA and the credits behind it from your transcript.",
      examples: `Example: six classes (A, B+, B, A-, A+ and B-) worth 20 credits give a ${ex.termGpa.toFixed(3)} semester GPA. Added to a 3.20 GPA over 30 credits, the new cumulative GPA is ${ex.cumulativeGpa.toFixed(3)}.`,
      assumptions: "Standard 4.0 scale: A+ and A = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, B- = 2.7, C+ = 2.3, C = 2.0, C- = 1.7, D+ = 1.3, D = 1.0, D- = 0.7, F = 0. Pass/fail and withdrawn courses don't count. Schools differ on +/- values and retakes — use the University GPA Calculator for other scales and grade replacement.",
      faq: [
        { question: "How do you calculate GPA?", answer: "Multiply each grade's points by the course credits, add them up and divide by total credits." },
        { question: "How do I raise my cumulative GPA?", answer: "Earn high grades in courses with more credits — the more credits you've already completed, the slower the cumulative GPA moves." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const v = { ...values(G, C3, { key: "retake", defaults: [-1, -1, -1, 10, -1, -1, -1, -1] }), scale: 1, priorGpa: 2.9, priorCredits: 45 };
    const ex = run(E.universityGpa, v);
    return {
      slug: "university-gpa-calculator",
      title: "University GPA Calculator",
      category: CAT,
      description: "Calculate your GPA on your university's own grading scale — A- as 3.7 or 3.67, a 4.3 A+, or no plus/minus — with grade replacement for retaken courses. Use it for ASU, UCLA, Penn State, Ohio State, UT Austin, Georgia Tech, Cornell and other colleges.",
      metaTitle: "University GPA Calculator — Any College's Grading Scale",
      metaDescription: "Free university GPA calculator with your school's grading scale (3.7 or 3.67 A-, 4.3 A+, no +/-) and grade replacement for retaken courses.",
      calcInputs: [
        dropdown("scale", "Your University's Grading Scale", [
          ["4.0 Scale, A- = 3.7 (e.g. UCLA, Ohio State, Purdue)", 0],
          ["4.0 Scale, A- = 3.67 (e.g. Penn State, UIUC, UF, UT Austin)", 1],
          ["A+ = 4.3 Scale (e.g. Cornell, ASU, Georgia State)", 2],
          ["4.0 Scale, No Plus/Minus (e.g. Georgia Tech, Texas A&M)", 3],
        ], 0),
        ...courseRows({
          grades: G,
          credits: C3,
          extra: { key: "retake", label: "Retake — Old Grade Replaced", options: [["Not a Retake", -1], ...LETTER_OPTIONS], defaults: [-1, -1, -1, -1, -1, -1, -1, -1] },
        }),
        ...PRIOR,
      ],
      calcResult: { label: "Cumulative GPA", format: "number", decimals: 3 },
      calcResults: [
        { key: "cumulativeGpa", label: "New Cumulative GPA (with Grade Replacement)", format: "number", decimals: 3, highlight: true },
        { key: "termGpa", label: "Semester GPA", format: "number", decimals: 3 },
        { key: "cumulativeWithoutReplacement", label: "Cumulative GPA If Both Attempts Count", format: "number", decimals: 3 },
        { key: "totalCredits", label: "Total Credits", format: "number" },
        { key: "qualityPoints", label: "Total Quality Points", format: "number" },
      ],
      instructions: "Choose the grading scale from your university's catalog or registrar page, then enter this term's grades and credits. If a course is a retake under your school's grade-replacement (forgiveness) policy, pick the old grade so it's removed from your cumulative GPA. Add your current GPA and credits.",
      examples: `Example: on a 3.67 scale, this term's six courses give a ${ex.termGpa.toFixed(3)} GPA. With a prior 2.90 GPA over 45 credits and an A- that replaces an earlier D, the new cumulative GPA is ${ex.cumulativeGpa.toFixed(3)} (vs ${ex.cumulativeWithoutReplacement.toFixed(3)} if both attempts counted).`,
      assumptions: "Scales: most US universities use A- = 3.7 or 3.67 and B+ = 3.3 or 3.33; some count A+ as 4.3; a few don't use plus/minus. Grade-replacement rules vary (limits on how many courses, only the most recent attempt, not for graduate admissions). Check your school's catalog — the examples in the scale list are typical, not guaranteed.",
      faq: [
        { question: "Does every college use the same GPA scale?", answer: "No — plus/minus values, A+ and repeat policies differ, which can change a GPA by a few hundredths." },
        { question: "Does grade replacement remove the old grade?", answer: "At most schools the old grade stays on the transcript but is removed from the GPA; graduate and professional schools usually count both." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const types = [2, 1, 0, 2, 1, 0, 0, 0];
    const ex = run(E.weightedGpa, values([1, 4, 1, 2, 3, 1, 4, 1], [1, 1, 1, 1, 1, 1, 0, 0], { key: "type", defaults: types }));
    return {
      slug: "weighted-gpa-calculator",
      title: "Weighted GPA Calculator",
      category: CAT,
      description: "Calculate your weighted and unweighted high school GPA — honors classes get an extra 0.5 and AP, IB, AICE and dual enrollment classes an extra 1.0 — plus your cumulative weighted GPA. Works with district scales such as FCPS, Broward, Howard County and Katy ISD.",
      metaTitle: "Weighted GPA Calculator — Honors & AP High School GPA",
      metaDescription: "Free weighted GPA calculator. Get your weighted and unweighted high school GPA with honors (+0.5) and AP/IB/dual enrollment (+1.0) bonuses.",
      calcInputs: [
        ...courseRows({ grades: [1, 4, 1, 2, 3, 1, 4, 1], credits: [1, 1, 1, 1, 1, 1, 0, 0], extra: { key: "type", label: "Course Level", options: LEVEL_OPTIONS, defaults: types } }),
        ...PRIOR,
      ],
      calcResult: { label: "Weighted GPA", format: "number", decimals: 3 },
      calcResults: [
        { key: "weightedGpa", label: "Weighted GPA", format: "number", decimals: 3, highlight: true },
        { key: "unweightedGpa", label: "Unweighted GPA", format: "number", decimals: 3 },
        { key: "cumulativeWeightedGpa", label: "Cumulative Weighted GPA", format: "number", decimals: 3 },
        { key: "credits", label: "Credits", format: "number" },
        { key: "advancedCourses", label: "Honors / Advanced Courses", format: "number" },
      ],
      instructions: "For each class, pick the letter grade, enter its credits (1 for a full-year class, 0.5 for a semester) and its level. Add your current weighted GPA and credits to see the cumulative result.",
      examples: `Example: A in AP, B in honors, A, A- in AP, B+ in honors and A gives a ${ex.weightedGpa.toFixed(3)} weighted GPA and a ${ex.unweightedGpa.toFixed(3)} unweighted GPA.`,
      assumptions: "Unweighted: A = 4, B = 3, C = 2, D = 1, F = 0 (plus/minus ignored, as most high schools do). Weighting: honors +0.5, AP/IB/AICE/dual enrollment +1.0, no bonus for an F. Districts set their own rules — some weight honors +1 or use a 5.0 scale; colleges often recalculate.",
      faq: [
        { question: "What's the difference between weighted and unweighted GPA?", answer: "Unweighted GPA treats every class the same on a 4.0 scale; weighted GPA adds points for honors and AP/IB classes, so it can go above 4.0." },
        { question: "Is a 4.5 weighted GPA good?", answer: "Yes — it usually means mostly A's in honors and AP classes." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const types = [3, 3, 2, 0, 1, 0, 0, 0];
    const ex = run(E.dualEnrollmentGpa, { ...values([1, 3, 2, 1, 4, 1], [1, 1, 1, 1, 1, 1, 0, 0], { key: "type", defaults: types }), collegeCreditsPerCourse: 3 });
    return {
      slug: "dual-enrollment-gpa-calculator",
      title: "Dual Enrollment GPA Calculator",
      category: CAT,
      description: "See how dual enrollment college courses affect both of your GPAs — your weighted high school GPA (dual enrollment usually earns an AP-level bonus) and the separate college transcript GPA you'll carry into college.",
      metaTitle: "Dual Enrollment GPA Calculator — High School & College GPA",
      metaDescription: "Free dual enrollment GPA calculator. See your weighted high school GPA and your separate college transcript GPA from dual enrollment courses.",
      calcInputs: [
        ...courseRows({ grades: [1, 3, 2, 1, 4, 1], credits: [1, 1, 1, 1, 1, 1, 0, 0], creditLabel: "High School Credits", extra: { key: "type", label: "Course Type", options: LEVEL_OPTIONS, defaults: types } }),
        numberField("collegeCreditsPerCourse", "College Credits per Dual Enrollment Course", { default: 3, max: 6, step: 0.5 }),
      ],
      calcResult: { label: "High School Weighted GPA", format: "number", decimals: 3 },
      calcResults: [
        { key: "highSchoolWeightedGpa", label: "High School Weighted GPA", format: "number", decimals: 3, highlight: true },
        { key: "highSchoolUnweightedGpa", label: "High School Unweighted GPA", format: "number", decimals: 3 },
        { key: "collegeTranscriptGpa", label: "College Transcript GPA (Dual Enrollment Only)", format: "number", decimals: 3 },
        { key: "collegeCreditsEarned", label: "College Credits Earned", format: "number" },
        { key: "dualEnrollmentCourses", label: "Dual Enrollment Courses", format: "number" },
      ],
      instructions: "Enter all your high school courses with their grades and credits, marking which are dual enrollment. Enter how many college credits each dual enrollment course carries (usually 3).",
      examples: `Example: A and B+ in two dual enrollment courses, an A- in AP and three more classes give a ${ex.highSchoolWeightedGpa.toFixed(3)} weighted high school GPA. The college transcript shows only the two dual enrollment courses: a ${ex.collegeTranscriptGpa.toFixed(3)} GPA over ${ex.collegeCreditsEarned} credits.`,
      assumptions: "Dual enrollment usually gets the same +1.0 weight as AP in high school GPA (some districts give +0.5). Your college GPA is unweighted and starts with these courses — it follows you when you transfer and when you apply to graduate or professional school. Plus/minus follow the college's 4.0 scale here.",
      faq: [
        { question: "Does dual enrollment count toward college GPA?", answer: "Yes — the college keeps a transcript, and most colleges you transfer to and all graduate programs will see those grades." },
        { question: "Is dual enrollment weighted like AP?", answer: "In many districts yes (+1.0); some weight it like honors (+0.5)." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const types = [2, 1, 0, 2, 1, 0, 1, 0];
    const v = { ...values([1, 4, 1, 1, 4, 7, 1, 4], [1, 1, 1, 1, 1, 1, 1, 1], { key: "type", defaults: types }), satScore: 1340, actScore: 0, serviceHours: 100 };
    const ex = run(E.brightFuturesGpa, v);
    return {
      slug: "bright-futures-gpa-calculator",
      title: "Bright Futures GPA Calculator",
      category: CAT,
      description: "Calculate your Florida Bright Futures GPA — the weighted GPA of your 16 core courses with 0.5 extra for honors, AP, IB, AICE and dual enrollment — and check eligibility for the Academic (FAS) and Medallion (FMS) scholarships.",
      metaTitle: "Bright Futures GPA Calculator — FAS & FMS Eligibility",
      metaDescription: "Free Florida Bright Futures GPA calculator. Get your Bright Futures weighted GPA and check FAS and FMS eligibility with test scores and service hours.",
      calcInputs: [
        ...courseRows({ grades: [1, 4, 1, 1, 4, 7, 1, 4], credits: [1, 1, 1, 1, 1, 1, 1, 1], extra: { key: "type", label: "Course Level", options: [["Regular", 0], ["Honors / AP / IB / AICE / DE (+0.5)", 1]], defaults: types.map((t) => (t > 0 ? 1 : 0)) } }),
        numberField("satScore", "Best SAT Total (Superscore)", { default: 1340, max: 1600, step: 10, required: false }),
        numberField("actScore", "Best ACT Composite (Superscore)", { default: 0, max: 36, required: false }),
        numberField("serviceHours", "Volunteer / Service Hours", { default: 100, max: 1000, required: false }),
      ],
      calcResult: { label: "Bright Futures GPA", format: "number", decimals: 3 },
      calcResults: [
        { key: "brightFuturesGpa", label: "Bright Futures Weighted GPA", format: "number", decimals: 3, highlight: true },
        { key: "fasEligible", label: "Florida Academic Scholars Eligible? (1 = Yes)", format: "number" },
        { key: "fmsEligible", label: "Florida Medallion Scholars Eligible? (1 = Yes)", format: "number" },
        { key: "unweightedGpa", label: "Unweighted Core GPA", format: "number", decimals: 3 },
        { key: "weightedCourses", label: "Weighted Courses", format: "number" },
      ],
      instructions: "Enter your 16 core courses (English, math, science, social science and world language) — this form takes eight at a time, so enter them in two passes or one representative year. Mark each honors, AP, IB, AICE or dual enrollment course, then add your best SAT or ACT and service hours.",
      examples: `Example: core grades of A, B, A, A, B, C, A, B with four weighted courses give a ${ex.brightFuturesGpa.toFixed(3)} Bright Futures GPA. With a 1340 SAT and 100 service hours, that ${ex.fasEligible ? "meets" : "doesn't meet"} FAS and ${ex.fmsEligible ? "meets" : "doesn't meet"} FMS requirements.`,
      assumptions: "Bright Futures counts only the 16 core credits, uses A = 4 through D = 1 (no plus/minus) and adds 0.5 per credit for designated advanced courses, with no cap. Requirements for current graduates: FAS 3.50 GPA, 1330 SAT or 29 ACT, 100 service hours; FMS 3.00 GPA, 1210 SAT or 25 ACT, 75 hours. The state's evaluation is final.",
      faq: [
        { question: "What GPA do you need for Bright Futures?", answer: "A 3.50 weighted core GPA for Florida Academic Scholars and 3.00 for Florida Medallion Scholars, plus the test and service requirements." },
        { question: "Does Bright Futures use weighted GPA?", answer: "Yes — 0.5 extra per credit for honors, AP, IB, AICE and dual enrollment core courses." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const ex = run(E.scienceGpa, { ...values([2, 3, 1, 4, 5, 1, 0, 0], [4, 4, 3, 4, 3, 3, 0, 0]), priorScienceGpa: 3.4, priorScienceCredits: 16 });
    return {
      slug: "science-gpa-calculator",
      title: "Science GPA Calculator",
      category: CAT,
      description: "Calculate your science GPA — the GPA of your biology, chemistry, physics and math courses (BCPM) that medical, dental, PA and nursing programs look at — and how new science grades change it.",
      metaTitle: "Science GPA Calculator — BCPM GPA for Pre-Med & Pre-Health",
      metaDescription: "Free science GPA calculator. Calculate your BCPM science GPA for medical, dental, PA and nursing school applications.",
      calcInputs: [
        ...courseRows({ grades: [2, 3, 1, 4, 5, 1, 0, 0], credits: [4, 4, 3, 4, 3, 3, 0, 0] }),
        numberField("priorScienceGpa", "Current Science GPA (Optional)", { default: 3.4, max: 4, step: 0.01, required: false }),
        numberField("priorScienceCredits", "Science Credits Behind It (Optional)", { default: 16, max: 300, step: 0.5, required: false }),
      ],
      calcResult: { label: "Science GPA", format: "number", decimals: 3 },
      calcResults: [
        { key: "scienceGpa", label: "Overall Science GPA", format: "number", decimals: 3, highlight: true },
        { key: "gpaOfTheseCourses", label: "GPA of These Courses", format: "number", decimals: 3 },
        { key: "scienceCredits", label: "Science Credits", format: "number" },
        { key: "scienceQualityPoints", label: "Science Quality Points", format: "number" },
      ],
      instructions: "Enter only your science courses — biology, chemistry, physics and math — with grades and credits (lab sections count). Add your current science GPA and credits to see the combined result.",
      examples: `Example: six new science courses (A-, B+, A, B, B- and A) give a ${ex.gpaOfTheseCourses.toFixed(3)} GPA; combined with a 3.40 science GPA over 16 credits, the science GPA is ${ex.scienceGpa.toFixed(3)}.`,
      assumptions: "Uses the AMCAS-style scale (A = 4.0, A- = 3.7, B+ = 3.3 …). Which courses count as science depends on the application service — biochemistry and statistics often do, psychology and nutrition usually don't. For full service-specific breakdowns use the AMCAS, AACOMAS, CASPA or PTCAS calculators.",
      faq: [
        { question: "What courses count in science GPA?", answer: "Biology, chemistry, physics and math (BCPM) for medical school; PA and other programs may add other sciences." },
        { question: "What is a good science GPA for med school?", answer: "Matriculants to US MD programs average a science GPA of about 3.7." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const ex = run(E.gradSchoolGpa, { ...values([1, 2, 3, 1, 4, 1, 2, 1], [3, 3, 3, 3, 3, 3, 3, 3]), priorGpa: 2.8, priorCredits: 90 });
    return {
      slug: "grad-school-gpa-calculator",
      title: "Grad School GPA Calculator",
      category: CAT,
      description: "Calculate the GPA graduate schools look at — your last 60 credits (junior and senior years) as well as your overall GPA — to see if you meet a program's 3.0 minimum.",
      metaTitle: "Grad School GPA Calculator — Last 60 Credits GPA",
      metaDescription: "Free grad school GPA calculator. Find your last-60-credit GPA and overall GPA and check a 3.0 graduate admission minimum.",
      calcInputs: [
        ...courseRows({ grades: [1, 2, 3, 1, 4, 1, 2, 1], credits: [3, 3, 3, 3, 3, 3, 3, 3] }),
        numberField("priorGpa", "GPA of Your Earlier Credits", { default: 2.8, max: 4.33, step: 0.01, required: false }),
        numberField("priorCredits", "Earlier Credits", { default: 90, max: 500, step: 0.5, required: false }),
      ],
      calcResult: { label: "Last 60 Credits GPA", format: "number", decimals: 3 },
      calcResults: [
        { key: "lastSixtyCreditGpa", label: "GPA of Your Last 60 Credits", format: "number", decimals: 3, highlight: true },
        { key: "overallGpa", label: "Overall GPA", format: "number", decimals: 3 },
        { key: "meetsThreePointZero", label: "Last-60 GPA at 3.0 or Higher? (1 = Yes)", format: "number" },
        { key: "creditsInLastSixty", label: "Credits Counted", format: "number" },
      ],
      instructions: "Enter your most recent courses (newest first) with grades and credits, then the GPA and credit count of everything before them. The calculator fills the rest of the last 60 credits from your earlier record at its average.",
      examples: `Example: 24 recent credits of mostly A's plus 90 earlier credits at 2.80 give a ${ex.lastSixtyCreditGpa.toFixed(3)} last-60 GPA but a ${ex.overallGpa.toFixed(3)} overall GPA — an upward trend that many graduate programs consider.`,
      assumptions: "Many graduate programs set a 3.0 minimum on the last 60 semester credits (90 quarter credits) rather than the overall GPA. Earlier credits that fill the 60 are taken at your earlier average, since exact order isn't known. Post-baccalaureate and graduate courses may count separately.",
      faq: [
        { question: "Do grad schools look at your last 60 credits?", answer: "Many do — especially public universities, which often require a 3.0 on the last 60 semester credits." },
        { question: "Can I get into grad school with a low GPA?", answer: "Yes, with a strong upward trend, test scores, experience or post-bac coursework." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const ex = run(E.nursingGpa, { ...values([2, 3, 1, 4, 1, 5, 0, 0], [4, 4, 3, 3, 3, 3, 0, 0]), programMinimum: 3.0, priorGpa: 3.1, priorCredits: 30 });
    return {
      slug: "nursing-gpa-calculator",
      title: "Nursing GPA Calculator",
      category: CAT,
      description: "Calculate your nursing prerequisite GPA — anatomy and physiology, microbiology, chemistry, statistics, English and psychology — and check it against your nursing program's minimum.",
      metaTitle: "Nursing GPA Calculator — Prerequisite GPA for Nursing School",
      metaDescription: "Free nursing GPA calculator. Calculate your nursing prerequisite GPA and compare it with your BSN or ADN program's minimum.",
      calcInputs: [
        ...courseRows({ grades: [2, 3, 1, 4, 1, 5, 0, 0], credits: [4, 4, 3, 3, 3, 3, 0, 0] }),
        numberField("programMinimum", "Program's Minimum Prerequisite GPA", { default: 3, max: 4, step: 0.05 }),
        ...PRIOR,
      ],
      calcResult: { label: "Prerequisite GPA", format: "number", decimals: 3 },
      calcResults: [
        { key: "prerequisiteGpa", label: "Prerequisite GPA", format: "number", decimals: 3, highlight: true },
        { key: "meetsProgramMinimum", label: "Meets the Program Minimum? (1 = Yes)", format: "number" },
        { key: "pointsAboveMinimum", label: "Above (+) / Below (−) the Minimum", format: "number" },
        { key: "prerequisiteCredits", label: "Prerequisite Credits", format: "number" },
        { key: "cumulativeGpa", label: "Cumulative GPA", format: "number", decimals: 3 },
      ],
      instructions: "Enter your nursing prerequisites with grades and credits, and the minimum prerequisite GPA from your program's admission page (many use 3.0; competitive BSN programs admit higher). Add your overall GPA and credits for the cumulative figure.",
      examples: `Example: A&P I and II (A-, B+), microbiology (A), chemistry (B), statistics (A) and English (B-) give a ${ex.prerequisiteGpa.toFixed(3)} prerequisite GPA — ${ex.pointsAboveMinimum >= 0 ? "above" : "below"} a 3.0 minimum.`,
      assumptions: "Standard 4.0 scale with plus/minus. Programs differ in which prerequisites count, whether science courses must be recent (often within 5–7 years) and whether retakes replace grades. Competitive programs also weigh the TEAS or HESI A2 score.",
      faq: [
        { question: "What GPA do you need for nursing school?", answer: "Most programs require at least a 2.75–3.0 prerequisite GPA; competitive BSN programs often admit students at 3.5 and above." },
        { question: "Which classes are in the nursing prerequisite GPA?", answer: "Usually anatomy and physiology, microbiology, chemistry, statistics, English composition and psychology." },
      ],
    } satisfies ToolDef;
  })(),
  centralTool("amcas-gpa-calculator", "AMCAS GPA Calculator", "AMCAS",
    E.amcasGpa,
    [{ key: "overallGpa", label: "AMCAS Cumulative GPA" }, { key: "scienceGpa", label: "BCPM (Science) GPA" }, { key: "nonScienceGpa", label: "AO (All Other) GPA" }, { key: "scienceCredits", label: "BCPM Credits" }, { key: "totalCredits", label: "Total Credits" }],
    "AMCAS (MD programs) scale: A+ and A = 4.0, A- = 3.7, B+ = 3.3 … F = 0.",
    "BCPM = biology, chemistry, physics and math; everything else (including 'other science') is AO."),
  centralTool("aacomas-gpa-calculator", "AACOMAS GPA Calculator", "AACOMAS",
    E.aacomasGpa,
    [{ key: "overallGpa", label: "AACOMAS Overall GPA" }, { key: "scienceGpa", label: "Science (BCPM) GPA" }, { key: "nonScienceGpa", label: "Non-Science GPA" }, { key: "bcpGpa", label: "BCP GPA (No Math)" }, { key: "totalCredits", label: "Total Credits" }],
    "AACOMAS (DO programs) uses the standard 4.0 scale with A- = 3.7, and since 2019 counts every attempt — no grade replacement.",
    "Science GPA covers biology, chemistry, physics and math; the BCP figure leaves out math."),
  centralTool("caspa-gpa-calculator", "CASPA GPA Calculator", "CASPA",
    E.caspaGpa,
    [{ key: "overallGpa", label: "CASPA Overall GPA" }, { key: "scienceGpa", label: "Science GPA" }, { key: "nonScienceGpa", label: "Non-Science GPA" }, { key: "bcpGpa", label: "BCP GPA (Bio, Chem, Physics)" }, { key: "totalCredits", label: "Total Credits" }],
    "CASPA (PA programs) uses A+ and A = 4.0, A- = 3.7, B+ = 3.3 … F = 0.",
    "CASPA's science GPA includes 'other science' courses such as behavioral and health sciences that it classifies as science; BCP is biology, chemistry and physics only."),
  centralTool("vmcas-gpa-calculator", "VMCAS GPA Calculator", "VMCAS",
    E.vmcasGpa,
    [{ key: "overallGpa", label: "VMCAS Cumulative GPA" }, { key: "scienceGpa", label: "Science GPA" }, { key: "nonScienceGpa", label: "Non-Science GPA" }, { key: "bcpGpa", label: "BCP GPA" }, { key: "totalCredits", label: "Total Credits" }],
    "VMCAS (veterinary programs) uses the standard 4.0 scale with A- = 3.7.",
    "Many vet schools also compute a 'last 45 credits' GPA and a prerequisite GPA themselves."),
  centralTool("nursingcas-gpa-calculator", "NursingCAS GPA Calculator", "NursingCAS",
    E.nursingCasGpa,
    [{ key: "overallGpa", label: "NursingCAS Overall GPA" }, { key: "scienceGpa", label: "Science GPA" }, { key: "nonScienceGpa", label: "Non-Science GPA" }, { key: "bcpGpa", label: "BCP GPA" }, { key: "totalCredits", label: "Total Credits" }],
    "NursingCAS uses the standard 4.0 scale with A- = 3.7.",
    "Nursing programs often add their own prerequisite GPA; use the Nursing GPA Calculator for that."),
  centralTool("ptcas-gpa-calculator", "PTCAS GPA Calculator", "PTCAS",
    E.ptcasGpa,
    [{ key: "overallGpa", label: "PTCAS Overall GPA" }, { key: "scienceGpa", label: "Science GPA (Bio, Chem, Physics, Other Science)" }, { key: "nonScienceGpa", label: "Other GPA" }, { key: "bcpGpa", label: "BCP GPA" }, { key: "totalCredits", label: "Total Credits" }],
    "PTCAS (physical therapy) uses A+ and A = 4.0, A- = 3.67, B+ = 3.33 … F = 0.",
    "PTCAS science GPA covers biology, chemistry, physics and other sciences; math is reported separately (shown here under 'Other')."),
  centralTool("tmdsas-gpa-calculator", "TMDSAS GPA Calculator", "TMDSAS",
    E.tmdsasGpa,
    [{ key: "overallGpa", label: "TMDSAS Overall GPA" }, { key: "scienceGpa", label: "Science (BCPM) GPA" }, { key: "nonScienceGpa", label: "Non-Science GPA" }, { key: "bcpGpa", label: "BCP GPA" }, { key: "totalCredits", label: "Total Credits" }],
    "TMDSAS (Texas medical, dental and veterinary schools) ignores plus and minus: every A = 4, B = 3, C = 2, D = 1, F = 0.",
    "Science courses are biology, chemistry, physics and math; every attempt counts."),
  (() => {
    const ex = run(E.lsacGpa, { ...values([0, 1, 2, 3, 4, 1, 0, 2], [3, 3, 3, 3, 3, 3, 3, 3]), priorGpa: 3.6, priorCredits: 96 });
    return {
      slug: "lsac-gpa-calculator",
      title: "LSAC GPA Calculator",
      category: CAT,
      description: "Calculate your GPA the way LSAC's Credential Assembly Service does for law school — A+ counts as 4.33, every attempt of a retaken course counts and all undergraduate schools are combined.",
      metaTitle: "LSAC GPA Calculator — Law School GPA (A+ = 4.33)",
      metaDescription: "Free LSAC GPA calculator. Recalculate your law school GPA with LSAC's scale (A+ = 4.33) and every repeated course counted.",
      calcInputs: [...courseRows({ grades: [0, 1, 2, 3, 4, 1, 0, 2], credits: [3, 3, 3, 3, 3, 3, 3, 3] }), ...PRIOR],
      calcResult: { label: "LSAC GPA", format: "number", decimals: 3 },
      calcResults: [
        { key: "lsacGpa", label: "LSAC Cumulative GPA", format: "number", decimals: 3, highlight: true },
        { key: "gpaOfTheseCourses", label: "GPA of These Courses", format: "number", decimals: 3 },
        { key: "totalCredits", label: "Total Credits", format: "number" },
        { key: "aPlusCourses", label: "A+ Grades (Count as 4.33)", format: "number" },
      ],
      instructions: "Enter your courses from every undergraduate transcript, including repeated courses and the original grades your school replaced. Add the rest of your record as a GPA and credit count, recalculated on LSAC's scale if possible.",
      examples: `Example: with two A+ grades among these courses and a prior 3.60 over 96 credits, the LSAC GPA is ${ex.lsacGpa.toFixed(3)} — A+ grades at 4.33 can push an LSAC GPA above the 4.0 your school reports.`,
      assumptions: "LSAC conversion: A+ = 4.33, A = 4.0, A- = 3.67, B+ = 3.33, B = 3.0 … D- = 0.67, F = 0; withdrawals with a failing grade count as F. Only work before your first bachelor's degree is included. LSAC's CAS report is final.",
      faq: [
        { question: "Does LSAC count A+ as 4.33?", answer: "Yes, even if your school counts it as 4.0 — which is why LSAC GPAs can exceed 4.0." },
        { question: "Does LSAC count retaken classes?", answer: "Yes, all attempts are included, even when your school replaced the grade." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const marks = { mark1: 78, mark2: 65, mark3: 82, mark4: 58, mark5: 71, mark6: 60, mark7: 0, mark8: 0 };
    const credits = { credits1: 4, credits2: 4, credits3: 3, credits4: 3, credits5: 4, credits6: 2, credits7: 0, credits8: 0 };
    const ex = run(E.wesGpa, { system: 0, ...marks, ...credits });
    const rowsIn: Record<string, unknown>[] = [];
    for (let i = 1; i <= 8; i++) {
      rowsIn.push(numberField(`mark${i}`, `Course ${i}: Mark or Grade Points`, { default: (marks as Record<string, number>)[`mark${i}`], max: 100, step: 0.1, required: i === 1 }));
      rowsIn.push(numberField(`credits${i}`, `Course ${i}: Credits / Weight (0 = Skip)`, { default: (credits as Record<string, number>)[`credits${i}`], max: 20, step: 0.5, required: i === 1 }));
    }
    return {
      slug: "wes-gpa-calculator",
      title: "WES GPA Calculator",
      category: CAT,
      description: "Convert foreign grades to a US 4.0 GPA the way credential evaluators like WES do — Indian and Pakistani percentages, UK marks, Chinese 100-point grades, German 1–5 grades, 10-point CGPA and Nigerian 5-point grades. Also covers Scholaro-style conversions.",
      metaTitle: "WES GPA Calculator — Foreign Grades to US GPA",
      metaDescription: "Free foreign-to-US GPA calculator (WES-style). Convert Indian percentage, CGPA, UK, Chinese, German or Nigerian grades to a US 4.0 GPA.",
      calcInputs: [
        dropdown("system", "Your Country's Grading System", [
          ["India — Percentage", 0], ["Pakistan — Percentage", 1], ["UK — Percentage Marks", 2], ["China — 100-Point Scale", 3],
          ["Germany — 1.0 (Best) to 5.0", 4], ["India — 10-Point Grade Points / CGPA", 5], ["Nigeria — 5-Point Grade Points", 6],
        ], 0),
        ...rowsIn,
      ],
      calcResult: { label: "US GPA", format: "number", decimals: 2 },
      calcResults: [
        { key: "usGpa", label: "Equivalent US GPA (4.0 Scale)", format: "number", decimals: 2, highlight: true },
        { key: "averageMark", label: "Your Credit-Weighted Average Mark", format: "number" },
        { key: "letterEquivalent", label: "Overall US Letter (4 = A, 3 = B, 2 = C, 1 = D)", format: "number" },
        { key: "coursesCounted", label: "Credits Counted", format: "number" },
      ],
      instructions: "Pick your grading system and enter each course's mark (or grade points) with its credits or weight — course-by-course marks give a much more accurate result than your overall average.",
      examples: `Example: Indian marks of 78, 65, 82, 58, 71 and 60 across 20 credits convert to a US GPA of about ${ex.usGpa.toFixed(2)}, because WES treats every Indian mark of 60% or more as an A.`,
      assumptions: "An independent estimate based on published WES-style conversion tables — not an official WES or Scholaro evaluation, and not affiliated with either. India: 60%+ = A, 50–59 = B, 40–49 = C. China: 85+ = A, 75–84 = B, 60–74 = C. Germany: 1.0–1.5 = A, 1.6–2.5 = B, 2.6–3.5 = C. Universities may use other evaluators or their own rules.",
      faq: [
        { question: "How does WES convert Indian percentages to GPA?", answer: "Course by course: marks of 60% and above become A (4.0), 50–59% B (3.0) and 40–49% C (2.0)." },
        { question: "Is 70% in India a good GPA in the US?", answer: "Through WES-style conversion, mostly 60%+ marks translate to an A, so an average of 70% often converts to around 3.7–4.0." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const ex = run(E.gedToGpa, { rla: 165, math: 158, science: 170, socialStudies: 162 });
    return {
      slug: "ged-to-gpa-calculator",
      title: "GED to GPA Calculator",
      category: CAT,
      description: "Convert your GED scores to an approximate high school GPA for college and job applications — from your four subject scores (Reasoning Through Language Arts, Math, Science and Social Studies), with passing and College Ready checks.",
      metaTitle: "GED to GPA Calculator — Convert GED Scores to GPA",
      metaDescription: "Free GED to GPA calculator. Convert your four GED subject scores to an approximate 4.0 GPA and see passing and College Ready levels.",
      calcInputs: [
        numberField("rla", "Reasoning Through Language Arts (100–200)", { default: 165, min: 100, max: 200 }),
        numberField("math", "Mathematical Reasoning (100–200)", { default: 158, min: 100, max: 200 }),
        numberField("science", "Science (100–200)", { default: 170, min: 100, max: 200 }),
        numberField("socialStudies", "Social Studies (100–200)", { default: 162, min: 100, max: 200 }),
      ],
      calcResult: { label: "Estimated GPA", format: "number", decimals: 2 },
      calcResults: [
        { key: "estimatedGpa", label: "Estimated GPA Equivalent", format: "number", decimals: 2, highlight: true },
        { key: "averageScore", label: "Average GED Score", format: "number" },
        { key: "totalScore", label: "Total Score (Out of 800)", format: "number" },
        { key: "passedAllSubjects", label: "Passed All Four (145+)? (1 = Yes)", format: "number" },
        { key: "collegeReadySubjects", label: "Subjects at College Ready (165+)", format: "number" },
      ],
      instructions: "Enter your four GED subject scores from your GED transcript (each is 100–200).",
      examples: `Example: scores of 165, 158, 170 and 162 average ${ex.averageScore}, which corresponds to an estimated ${ex.estimatedGpa.toFixed(2)} GPA; all four subjects pass and ${ex.collegeReadySubjects} reach College Ready.`,
      assumptions: "There's no official GED-to-GPA conversion. This uses the GED score levels: 145–164 passing (≈ 2.0–3.0 GPA), 165–174 College Ready (≈ 3.0–3.5) and 175–200 College Ready + Credit (≈ 3.5–4.0). Many colleges admit GED holders on the GED scores themselves, plus SAT/ACT or placement tests.",
      faq: [
        { question: "What GPA is a GED equivalent to?", answer: "Roughly 2.0–3.0 for passing scores, and higher for College Ready scores, though colleges usually look at the scores directly." },
        { question: "What is a good GED score?", answer: "165 or higher in a subject is College Ready; 175+ may earn college credit." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const subj = { subject1: 94, subject2: 88, subject3: 91, subject4: 79, subject5: 85, subject6: 97, subject7: 0, subject8: 0 };
    const ex = run(E.elementaryGpa, subj);
    return {
      slug: "elementary-gpa-calculator",
      title: "Elementary GPA Calculator",
      category: CAT,
      description: "Turn elementary or middle school percentage grades into a grade average, letter grade and GPA — enter up to eight subjects' grades from the report card.",
      metaTitle: "Elementary & Middle School GPA Calculator",
      metaDescription: "Free elementary and middle school GPA calculator. Convert report card percentages to an average, letter grade and 4.0 GPA.",
      calcInputs: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => numberField(`subject${i}`, `Subject ${i} Grade (%) (0 = Skip)`, { default: (subj as Record<string, number>)[`subject${i}`], max: 110, step: 0.5, required: i === 1 })),
      calcResult: { label: "GPA", format: "number", decimals: 2 },
      calcResults: [
        { key: "gpa", label: "GPA (4.0 Scale)", format: "number", decimals: 2, highlight: true },
        { key: "averagePercent", label: "Average Grade", format: "percentage" },
        { key: "subjectsCounted", label: "Subjects Counted", format: "number" },
      ],
      instructions: "Enter each subject's percentage grade from the report card — reading, writing, math, science, social studies and specials. Leave unused rows at 0.",
      examples: `Example: grades of 94, 88, 91, 79, 85 and 97 average ${ex.averagePercent}% and convert to a ${ex.gpa.toFixed(2)} GPA.`,
      assumptions: "Percentages convert to letters on the common 10-point scale with plus/minus (93–96 A, 90–92 A-, 87–89 B+ …) and then to the standard 4.0 scale. Most elementary schools don't calculate a GPA and many use standards-based marks (1–4 or E/S/N); middle schools usually start GPAs in 6th grade.",
      faq: [
        { question: "Do elementary schools have a GPA?", answer: "Usually not officially, but converting grades to a GPA helps track progress and prepare for middle school." },
        { question: "Does middle school GPA matter?", answer: "It can for selective middle-to-high school programs and for placement in honors classes." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const v = { aGrades: 14, bGrades: 5, cGrades: 1, dGrades: 0, fGrades: 0, honors10th: 4, honors11th: 6 };
    const ex = run(E.ucGpa, v);
    return {
      slug: "uc-gpa-calculator",
      title: "UC GPA Calculator",
      category: CAT,
      description: "Calculate your University of California GPA — unweighted, capped weighted and fully weighted — from your 10th–11th grade A–G semester grades and honors courses, the way UC admissions does. Also works as a UC grade calculator.",
      metaTitle: "UC GPA Calculator — Capped & Weighted UC GPA",
      metaDescription: "Free UC GPA calculator. Calculate your capped weighted, fully weighted and unweighted UC GPA from 10th–11th grade A–G grades.",
      calcInputs: [
        numberField("aGrades", "A Semester Grades (10th–11th, A–G)", { default: 14, max: 40 }),
        numberField("bGrades", "B Semester Grades", { default: 5, max: 40 }),
        numberField("cGrades", "C Semester Grades", { default: 1, max: 40 }),
        numberField("dGrades", "D Semester Grades", { default: 0, max: 40, required: false }),
        numberField("fGrades", "F Semester Grades", { default: 0, max: 40, required: false }),
        numberField("honors10th", "UC-Approved Honors / AP / IB Semesters in 10th Grade (C or Better)", { default: 4, max: 20 }),
        numberField("honors11th", "UC-Approved Honors / AP / IB Semesters in 11th Grade (C or Better)", { default: 6, max: 20 }),
      ],
      calcResult: { label: "UC Capped GPA", format: "number", decimals: 2 },
      calcResults: [
        { key: "ucCappedWeightedGpa", label: "UC Capped Weighted GPA", format: "number", decimals: 2, highlight: true },
        { key: "ucFullyWeightedGpa", label: "UC Fully Weighted GPA", format: "number", decimals: 2 },
        { key: "ucUnweightedGpa", label: "UC Unweighted GPA", format: "number", decimals: 2 },
        { key: "honorsPointsCounted", label: "Honors Points Counted (Capped)", format: "number" },
        { key: "meetsUcMinimum", label: "Meets the 3.0 UC Minimum? (1 = Yes)", format: "number" },
      ],
      instructions: "Count your semester grades in A–G courses taken in the summer after 9th grade through the summer after 11th grade (each semester is one grade). Then count the UC-approved honors, AP and IB semesters with a C or better in 10th and 11th grade.",
      examples: `Example: 14 A's, 5 B's and 1 C with 10 honors semesters (4 in 10th grade) give a ${ex.ucCappedWeightedGpa.toFixed(2)} capped GPA (8 honors points), ${ex.ucFullyWeightedGpa.toFixed(2)} fully weighted and ${ex.ucUnweightedGpa.toFixed(2)} unweighted.`,
      assumptions: "UC adds 1 point per UC-approved honors semester with a C or better; the capped GPA allows at most 8 honors points, no more than 4 from 10th grade, while the fully weighted GPA counts them all. 9th-grade grades don't count in the GPA (but must meet A–G with a C). California residents need at least 3.0, non-residents 3.4.",
      faq: [
        { question: "What is the UC capped GPA?", answer: "Your 10th–11th grade A–G GPA with no more than 8 semesters of honors points (and no more than 4 from 10th grade)." },
        { question: "Does UC count 9th grade?", answer: "No — only grades from the summer after 9th grade through the summer after 11th grade." },
      ],
    } satisfies ToolDef;
  })(),
  (() => {
    const v = { aGrades: 10, bGrades: 8, cGrades: 2, dGrades: 0, fGrades: 0, honors10th: 2, honors11th: 4 };
    const ex = run(E.csuGpa, v);
    return {
      slug: "csu-gpa-calculator",
      title: "CSU GPA Calculator",
      category: CAT,
      description: "Calculate your California State University (CSU) admission GPA — 10th–11th grade A–G semester grades with up to 8 semesters of honors points — and check the 2.5 minimum.",
      metaTitle: "CSU GPA Calculator — Cal State Admission GPA",
      metaDescription: "Free CSU GPA calculator. Calculate your Cal State A–G GPA with up to 8 honors semesters and check the 2.5 CSU minimum.",
      calcInputs: [
        numberField("aGrades", "A Semester Grades (10th–11th, A–G)", { default: 10, max: 40 }),
        numberField("bGrades", "B Semester Grades", { default: 8, max: 40 }),
        numberField("cGrades", "C Semester Grades", { default: 2, max: 40 }),
        numberField("dGrades", "D Semester Grades", { default: 0, max: 40, required: false }),
        numberField("fGrades", "F Semester Grades", { default: 0, max: 40, required: false }),
        numberField("honors10th", "Approved Honors / AP / IB Semesters in 10th Grade", { default: 2, max: 20 }),
        numberField("honors11th", "Approved Honors / AP / IB Semesters in 11th Grade", { default: 4, max: 20 }),
      ],
      calcResult: { label: "CSU GPA", format: "number", decimals: 2 },
      calcResults: [
        { key: "csuGpa", label: "CSU Weighted GPA", format: "number", decimals: 2, highlight: true },
        { key: "csuUnweightedGpa", label: "CSU Unweighted GPA", format: "number", decimals: 2 },
        { key: "honorsPointsCounted", label: "Honors Points Counted (Max 8)", format: "number" },
        { key: "meetsCsuMinimum", label: "Meets the 2.5 CSU Minimum? (1 = Yes)", format: "number" },
        { key: "semesterGrades", label: "Semester Grades Counted", format: "number" },
      ],
      instructions: "Count your A–G semester grades from 10th and 11th grade (and the summers after 9th and 11th) and the approved honors, AP and IB semesters with a C or better.",
      examples: `Example: 10 A's, 8 B's and 2 C's with 6 honors semesters give a ${ex.csuGpa.toFixed(2)} CSU GPA (${ex.csuUnweightedGpa.toFixed(2)} unweighted) — above the 2.5 minimum.`,
      assumptions: "CSU adds 1 point for up to 8 semesters of approved honors-level courses with a C or better (no separate 10th-grade cap). California residents and graduates of California high schools need at least a 2.5; impacted campuses and majors admit much higher. CSU no longer uses SAT/ACT in admission.",
      faq: [
        { question: "What GPA do you need for Cal State?", answer: "At least a 2.5 A–G GPA, but popular campuses like SDSU, Cal Poly SLO and Long Beach admit far higher." },
        { question: "How is CSU GPA different from UC GPA?", answer: "Both use 10th–11th grade A–G grades; CSU caps honors at 8 semesters without UC's 4-from-10th-grade limit and uses a 2.5 minimum." },
      ],
    } satisfies ToolDef;
  })(),
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
