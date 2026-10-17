// One-time (but safe to re-run) batch setup script: creates 7 college admissions tools
// (Jobs & Education Calculators > College Admissions Calculators) and 9 college cost & aid
// tools (> College Cost & Financial Aid Calculators) from the user's jobs & education list.
// School-specific net price and tuition keywords (Harvard, MIT, NYU, TAMU …) are covered by the
// net price and tuition calculators (user decision 17 Oct 2026). "Lecom AIS" was dropped — the
// formula isn't public. Examples are computed from src/lib/calc-engine-edu-college.ts.
//
// HOW TO RUN (after prisma/setup-jobs-education-category.ts --apply)
//   npx tsx prisma/create-edu-college-calculators.ts
// or
//   npm run db:create-edu-college-calculators

import * as E from "../src/lib/calc-engine-edu-college";
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

const YN = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);

const ADMIT = "college-admissions-calculators";
const COST = "college-cost-financial-aid-calculators";
const run = (fn: E.CustomCalculator, values: Record<string, number>) => fn(values) as Record<string, number>;
const n = (key: string, label: string, def: number, max: number, required = true, step = 1, min = 0) => numberField(key, label, { default: def, max, required, step, min });
const money = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;
const RATING = (key: string, label: string) => dropdown(key, label, [["1 — Weak", 1], ["2 — Below Average", 2], ["3 — Typical", 3], ["4 — Strong", 4], ["5 — Exceptional", 5]], 3);
const CATEGORY_LINE = { key: "category", label: "Category (1 = Reach, 2 = Target, 3 = Likely)", format: "number" };

const V = {
  chances: { schoolPreset: 0, admitRate: 25, sat25: 1300, sat75: 1480, schoolGpa: 3.8, sat: 1450, gpa: 3.85, extracurriculars: 4, essays: 3, earlyDecision: 0, hook: 0 },
  harvard: { schoolPreset: 1, admitRate: 0, sat25: 0, sat75: 0, schoolGpa: 0, sat: 1540, gpa: 3.95, extracurriculars: 4, essays: 4, earlyDecision: 0, hook: 0 },
  law: { lsat: 168, gpa: 3.7, medianLsat: 166, medianGpa: 3.8, admitRate: 25, earlyDecision: 0 },
  lawsch: { lsat: 168, gpa: 3.75, lsat25: 160, lsat50: 164, lsat75: 167, gpa25: 3.5, gpa50: 3.7, gpa75: 3.85, tuition: 60000 },
  med: { mcat: 514, gpa: 3.75, inStateApplicant: 1, schoolsApplied: 25, experienceStrength: 3 },
  mba: { gmat: 665, gpa: 3.5, workYears: 5, programGmat: 675, programGpa: 3.6, admitRate: 20, profileStrength: 3 },
  ai: { satMath: 760, satReadingWriting: 730, gpa: 3.92 },
  lizzy: { gpa: 3.8, mcat: 515, schoolGpa: 3.85, schoolMcat: 517 },
  npc: { tuitionFees: 32000, housingFood: 14000, booksSupplies: 1200, otherCosts: 3000, sai: 12000, needMetPercent: 80, stateGrant: 2000, meritScholarship: 5000, federalLoans: 5500, yearlyIncrease: 3 },
  tuit: { creditsPerTerm: 15, perCreditRate: 420, flatRateFrom: 12, feesPerTerm: 900, termsPerYear: 2, years: 4, yearlyIncrease: 3 },
  sai: { familySize: 4, parentAgi: 95000, untaxedIncome: 0, parentTaxesPaid: 8000, lowerEarnerIncome: 35000, parentNetWorth: 50000, studentIncome: 6000, studentAssets: 2000 },
  osap: { tuitionFees: 7500, booksEquipment: 1500, livingCosts: 1500, studyMonths: 8, familyContribution: 3000, studentContribution: 1500, federalGrant: 4200, yearsOfStudy: 4, repaymentRate: 7.45 },
  roi: { netPricePerYear: 22000, yearsToDegree: 4, salaryWithDegree: 70000, salaryWithoutDegree: 42000, loanAmount: 27000, loanRate: 6.39, countForgoneEarnings: 1, careerYears: 40, salaryGrowth: 2 },
  stip: { annualStipend: 38000, standardDeduction: 16100, taxRate: 10, universityFees: 1200, monthlyRent: 1300, otherMonthlyCosts: 900, hoursPerWeek: 50 },
  edc: { householdSize: 4, householdIncome: 160000, highSchool: 0, tuition: 9000 },
  trans: { creditsEarned: 60, creditsAccepted: 54, creditsApplicable: 48, degreeCredits: 120, creditsPerTerm: 15, costPerCredit: 350 },
  sap: { creditsAttempted: 48, creditsCompleted: 30, cumulativeGpa: 2.4, minimumGpa: 2, minimumPace: 67, programCredits: 120 },
};
const X = {
  chances: run(E.collegeChances, V.chances), harvard: run(E.collegeChances, V.harvard), law: run(E.lawSchoolAdmissions, V.law), lawsch: run(E.lawSchoolScholarship, V.lawsch),
  med: run(E.medSchoolAdmissions, V.med), mba: run(E.mbaAdmissions, V.mba), ai: run(E.academicIndex, V.ai), lizzy: run(E.lizzyM, V.lizzy), npc: run(E.netPrice, V.npc),
  tuit: run(E.tuition, V.tuit), sai: run(E.sai, V.sai), osap: run(E.osap, V.osap), roi: run(E.collegeRoi, V.roi), stip: run(E.stipend, V.stip), edc: run(E.edChoice, V.edc),
  trans: run(E.transferCredit, V.trans), sap: run(E.sap, V.sap),
};

const CHANCE_NOTE = "This is a transparent statistical estimate: the school's admit rate sets the starting point and your numbers relative to its medians shift it. Real decisions weigh essays, recommendations, context, major and institutional priorities that no calculator can see.";

const TOOLS: ToolDef[] = [
  {
    slug: "college-admissions-chances-calculator",
    title: "College Admissions Chances Calculator",
    category: ADMIT,
    description: "Estimate your chances of getting into a college — your GPA and SAT/ACT against the school's middle 50% and admit rate, plus extracurriculars, essays, Early Decision and hooks. Includes a Harvard preset for Harvard admissions chances.",
    metaTitle: "College Admissions Chances Calculator — Reach, Target, Likely",
    metaDescription: "Free college chances calculator. Estimate your admission odds from GPA, SAT, the school's admit rate and middle 50%, essays and Early Decision.",
    calcInputs: [
      dropdown("schoolPreset", "School", [["Enter the School's Numbers", 0], ["Harvard (≈3.6% Admit Rate)", 1]], 0),
      percentField("admitRate", "School's Admit Rate", { default: 25, max: 100, step: 0.1 }),
      n("sat25", "School's SAT 25th Percentile", V.chances.sat25, 1600, true, 10, 400),
      n("sat75", "School's SAT 75th Percentile", V.chances.sat75, 1600, true, 10, 400),
      numberField("schoolGpa", "School's Average Unweighted GPA", { default: 3.8, max: 4, step: 0.01 }),
      n("sat", "Your SAT (or ACT Converted; 0 If Test-Optional)", V.chances.sat, 1600, false, 10),
      numberField("gpa", "Your Unweighted GPA", { default: 3.85, max: 4, step: 0.01 }),
      RATING("extracurriculars", "Extracurriculars & Awards"),
      RATING("essays", "Essays & Recommendations"),
      YN("earlyDecision", "Applying Early Decision", 0),
      dropdown("hook", "Hook", [["None", 0], ["First-Generation / Underrepresented Background", 1], ["Legacy", 2], ["Recruited Athlete", 3]], 0),
    ],
    calcResult: { label: "Admission Chance", format: "percentage" },
    calcResults: [
      { key: "admissionChance", label: "Estimated Admission Chance", format: "percentage", highlight: true },
      { key: "schoolAdmitRate", label: "School's Overall Admit Rate", format: "percentage" },
      CATEGORY_LINE,
      { key: "testScorePosition", label: "Test Score vs School (SDs)", format: "number" },
      { key: "gpaPosition", label: "GPA vs School (SDs)", format: "number" },
    ],
    instructions: "Find the school's admit rate, SAT middle 50% and average GPA in its Common Data Set (sections C1, C9 and C12), then enter your own numbers and an honest rating of your activities and essays. Choose the Harvard preset to use Harvard's figures.",
    examples: `Example: a 1450 SAT and 3.85 GPA at a school with a 25% admit rate and a 1300–1480 middle 50% give about a ${X.chances.admissionChance}% chance — a target. With strong activities and essays, the Harvard preset gives about ${X.harvard.admissionChance}% for a 1540 and 3.95.`,
    assumptions: `${CHANCE_NOTE} At schools admitting under about 15%, treat every school as a reach regardless of stats.`,
    faq: [
      { question: "What are my chances of getting into Harvard?", answer: "Harvard admits about 3–4% of applicants; even with top stats, most applicants' chances are in the single digits." },
      { question: "What makes a college a reach, target or safety?", answer: "Reach: under ~25% chance; target: roughly 25–60%; likely/safety: above 60% with stats above the school's middle 50%." },
    ],
  },
  {
    slug: "law-school-admissions-calculator",
    title: "Law School Admissions Calculator",
    category: ADMIT,
    description: "Estimate your chances at a law school from your LSAT and GPA versus the school's medians and admit rate — and see if you're a 'splitter' (high LSAT, low GPA or the reverse).",
    metaTitle: "Law School Admissions Calculator — LSAT & GPA Chances",
    metaDescription: "Free law school admissions calculator. Estimate your chances from your LSAT and GPA vs the school's medians and admit rate.",
    calcInputs: [
      n("lsat", "Your LSAT", V.law.lsat, 180, true, 1, 120), numberField("gpa", "Your LSAC GPA", { default: 3.7, max: 4.33, step: 0.01 }),
      n("medianLsat", "School's Median LSAT", V.law.medianLsat, 180, true, 1, 120), numberField("medianGpa", "School's Median GPA", { default: 3.8, max: 4.33, step: 0.01 }),
      percentField("admitRate", "School's Admit Rate", { default: 25, max: 100, step: 0.1 }), YN("earlyDecision", "Binding Early Decision", 0),
    ],
    calcResult: { label: "Admission Chance", format: "percentage" },
    calcResults: [
      { key: "admissionChance", label: "Estimated Admission Chance", format: "percentage", highlight: true },
      { key: "lsatVsMedian", label: "LSAT vs Median", format: "number" },
      { key: "gpaVsMedian", label: "GPA vs Median", format: "number" },
      { key: "splitter", label: "Splitter? (1 = Yes)", format: "number" },
      CATEGORY_LINE,
    ],
    instructions: "Use the school's ABA Standard 509 disclosure for its median LSAT, median GPA and acceptance rate, and your LSAC-calculated GPA.",
    examples: `Example: a 168 LSAT and 3.70 GPA at a school with 166 / 3.80 medians and a 25% admit rate is about a ${X.law.admissionChance}% chance.`,
    assumptions: `LSAT counts more than GPA in this model, as it does at most schools. ${CHANCE_NOTE}`,
    faq: [
      { question: "What matters most for law school admissions?", answer: "LSAT and GPA relative to the school's medians, then personal statement, work experience and recommendations." },
      { question: "What is a splitter?", answer: "An applicant with one number above a school's median and the other well below it." },
    ],
  },
  {
    slug: "law-school-scholarship-calculator",
    title: "Law School Scholarship Calculator",
    category: ADMIT,
    description: "Estimate the merit scholarship a law school may offer — your LSAT and GPA against its 25th, median and 75th percentiles — as a share of tuition, a yearly amount and a three-year value.",
    metaTitle: "Law School Scholarship Calculator — Merit Aid Estimate",
    metaDescription: "Free law school scholarship calculator. Estimate merit aid from your LSAT and GPA vs a school's 25th/50th/75th percentiles.",
    calcInputs: [
      n("lsat", "Your LSAT", V.lawsch.lsat, 180, true, 1, 120), numberField("gpa", "Your LSAC GPA", { default: 3.75, max: 4.33, step: 0.01 }),
      n("lsat25", "School LSAT 25th", V.lawsch.lsat25, 180, true, 1, 120), n("lsat50", "School LSAT Median", V.lawsch.lsat50, 180, true, 1, 120), n("lsat75", "School LSAT 75th", V.lawsch.lsat75, 180, true, 1, 120),
      numberField("gpa25", "School GPA 25th", { default: 3.5, max: 4.33, step: 0.01 }), numberField("gpa50", "School GPA Median", { default: 3.7, max: 4.33, step: 0.01 }), numberField("gpa75", "School GPA 75th", { default: 3.85, max: 4.33, step: 0.01 }),
      currencyField("tuition", "Yearly Tuition", { default: 60000, max: 120000, step: 500 }),
    ],
    calcResult: { label: "Estimated Scholarship", format: "currency" },
    calcResults: [
      { key: "estimatedYearlyScholarship", label: "Estimated Yearly Scholarship", format: "currency", highlight: true },
      { key: "estimatedSharePercent", label: "Share of Tuition", format: "percentage" },
      { key: "threeYearValue", label: "Three-Year Value", format: "currency" },
      { key: "netTuitionPerYear", label: "Net Tuition per Year", format: "currency" },
    ],
    instructions: "Enter your LSAT and GPA and the school's 25th / median / 75th percentiles from its ABA 509 report, plus tuition.",
    examples: `Example: a 168 / 3.75 applicant at a school with a 160–164–167 LSAT and 3.50–3.70–3.85 GPA spread could expect about ${X.lawsch.estimatedSharePercent}% of tuition — ${money(X.lawsch.estimatedYearlyScholarship)} a year, ${money(X.lawsch.threeYearValue)} over three years.`,
    assumptions: "Schools use merit aid to recruit applicants above their medians; the farther above, the larger the award. This mapping is an estimate — negotiate with competing offers, and check stipulations (minimum GPA or class rank to keep the scholarship).",
    faq: [
      { question: "How do law school scholarships work?", answer: "Most are merit-based on LSAT and GPA; applicants above a school's medians often receive the largest awards." },
      { question: "Can you negotiate law school scholarships?", answer: "Often yes — schools frequently increase offers when shown a better offer from a peer school." },
    ],
  },
  {
    slug: "medical-school-admissions-calculator",
    title: "Medical School Admissions Calculator",
    category: ADMIT,
    description: "Estimate your chance of acceptance to at least one US MD program from your MCAT and GPA — modeled on AAMC applicant–acceptance patterns — with in-state status, number of schools and experience strength.",
    metaTitle: "Medical School Admissions Calculator — MCAT & GPA Chances",
    metaDescription: "Free medical school admissions calculator. Estimate your chance of acceptance to an MD program from MCAT, GPA and application factors.",
    calcInputs: [
      n("mcat", "MCAT Total (472–528)", V.med.mcat, 528, true, 1, 472), numberField("gpa", "Cumulative GPA", { default: 3.75, max: 4, step: 0.01 }),
      YN("inStateApplicant", "Applying to Your In-State Public Schools", 1), n("schoolsApplied", "Number of Schools Applied To", V.med.schoolsApplied, 60, true, 1, 1),
      RATING("experienceStrength", "Clinical, Research & Service Experience"),
    ],
    calcResult: { label: "Acceptance Chance", format: "percentage" },
    calcResults: [
      { key: "acceptanceChance", label: "Estimated Chance of At Least One Acceptance", format: "percentage", highlight: true },
      { key: "mcatVsMatriculantAverage", label: "MCAT vs Matriculant Average (512)", format: "number" },
      { key: "gpaVsMatriculantAverage", label: "GPA vs Matriculant Average (3.77)", format: "number" },
      CATEGORY_LINE,
    ],
    instructions: "Enter your MCAT and cumulative GPA, whether you're applying to in-state public schools, how many schools you'll apply to and an honest rating of your experiences.",
    examples: `Example: a 514 MCAT and 3.75 GPA with in-state options and 25 schools estimate about a ${X.med.acceptanceChance}% chance of at least one MD acceptance.`,
    assumptions: `Shaped on the AAMC's MCAT × GPA acceptance grid, where acceptance rises steeply above a 510 MCAT and 3.6 GPA. ${CHANCE_NOTE} DO programs and school mission fit change the picture.`,
    faq: [
      { question: "What MCAT and GPA do you need for medical school?", answer: "MD matriculants average about a 512 MCAT and 3.77 GPA; 510+ and 3.6+ give much better odds." },
      { question: "How many medical schools should I apply to?", answer: "Applicants commonly apply to 15–30 schools, depending on competitiveness and state residency." },
    ],
  },
  {
    slug: "mba-admissions-calculator",
    title: "MBA Admissions Calculator",
    category: ADMIT,
    description: "Estimate your chances at an MBA program from your GMAT (or GRE equivalent), GPA and years of work experience versus the program's averages and admit rate.",
    metaTitle: "MBA Admissions Calculator — GMAT, GPA & Work Experience",
    metaDescription: "Free MBA admissions calculator. Estimate your MBA chances from GMAT, GPA and work experience vs the program's class profile.",
    calcInputs: [
      n("gmat", "Your GMAT Focus Score (205–805)", V.mba.gmat, 805, true, 10, 205), numberField("gpa", "Undergraduate GPA", { default: 3.5, max: 4, step: 0.01 }),
      numberField("workYears", "Years of Full-Time Work Experience", { default: 5, max: 20, step: 0.5 }),
      n("programGmat", "Program's Average GMAT Focus", V.mba.programGmat, 805, true, 10, 205), numberField("programGpa", "Program's Average GPA", { default: 3.6, max: 4, step: 0.01 }),
      percentField("admitRate", "Program's Admit Rate", { default: 20, max: 100, step: 0.5 }), RATING("profileStrength", "Career Progression, Leadership & Essays"),
    ],
    calcResult: { label: "Admission Chance", format: "percentage" },
    calcResults: [
      { key: "admissionChance", label: "Estimated Admission Chance", format: "percentage", highlight: true },
      { key: "gmatVsAverage", label: "GMAT vs Program Average", format: "number" },
      { key: "gpaVsAverage", label: "GPA vs Program Average", format: "number" },
      CATEGORY_LINE,
    ],
    instructions: "Use the program's class profile for its average GMAT, GPA and admit rate. Work experience around 4–6 years is typical for full-time MBAs.",
    examples: `Example: a 665 GMAT Focus and 3.5 GPA with five years' experience at a program averaging 675 / 3.6 with a 20% admit rate is about a ${X.mba.admissionChance}% chance.`,
    assumptions: `GMAT counts most in this model, then GPA; experience far from the typical 4–6 years lowers the estimate slightly. ${CHANCE_NOTE}`,
    faq: [
      { question: "What GMAT score do you need for a top MBA?", answer: "Top programs' averages on GMAT Focus are roughly 655–705." },
      { question: "How much work experience do you need for an MBA?", answer: "Most full-time MBA students have about 4–6 years." },
    ],
  },
  {
    slug: "academic-index-calculator",
    title: "Academic Index Calculator",
    category: ADMIT,
    description: "Calculate your Academic Index (AI) — the Ivy League-style score out of 240 that combines SAT section scores with a converted GPA/class rank score, used notably for recruited athletes.",
    metaTitle: "Academic Index Calculator — Ivy League AI Score",
    metaDescription: "Free Academic Index calculator. Calculate your Ivy League-style AI out of 240 from SAT scores and GPA.",
    calcInputs: [
      n("satMath", "SAT Math", V.ai.satMath, 800, true, 10, 200), n("satReadingWriting", "SAT Reading & Writing", V.ai.satReadingWriting, 800, true, 10, 200),
      numberField("gpa", "Unweighted GPA", { default: 3.92, max: 4, step: 0.01 }),
    ],
    calcResult: { label: "Academic Index", format: "number" },
    calcResults: [
      { key: "academicIndex", label: "Academic Index (60–240)", format: "number", highlight: true },
      { key: "testScorePart", label: "Test Score Part (SAT ÷ 10)", format: "number" },
      { key: "convertedRankScore", label: "Converted Rank Score (20–80)", format: "number" },
      { key: "aboveRecruitedFloor", label: "Above the ~176 Recruited-Athlete Floor? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter your SAT section scores (convert an ACT first) and unweighted GPA.",
    examples: `Example: 760 Math, 730 Reading & Writing and a 3.92 GPA give an Academic Index of about ${X.ai.academicIndex}.`,
    assumptions: "AI = SAT Math ÷ 10 + SAT Reading/Writing ÷ 10 + a converted rank score (CRS, 20–80). Schools convert class rank or GPA with their own tables; this uses a simple GPA-based CRS. Ivy League athletic recruiting requires an AI floor around 176 and a team average near the student body's. Not an official Ivy League tool.",
    faq: [
      { question: "What is a good Academic Index?", answer: "Typical admitted Ivy League students are around 220–230; the recruited-athlete minimum is about 176." },
      { question: "Is the Academic Index still used?", answer: "Yes, mainly for recruited athletes in the Ivy League; some schools use similar internal ratings." },
    ],
  },
  {
    slug: "lizzym-score-calculator",
    title: "LizzyM Score Calculator",
    category: ADMIT,
    description: "Calculate your LizzyM score — the pre-med rule of thumb that combines GPA and MCAT (GPA × 10 + MCAT on the old scale) — and compare it with a medical school's to see if you're competitive.",
    metaTitle: "LizzyM Score Calculator — Compare with Med Schools",
    metaDescription: "Free LizzyM score calculator. Combine your GPA and MCAT into a LizzyM score and compare it with a medical school's average.",
    calcInputs: [
      numberField("gpa", "Your GPA", { default: 3.8, max: 4, step: 0.01 }), n("mcat", "Your MCAT (472–528)", V.lizzy.mcat, 528, true, 1, 472),
      numberField("schoolGpa", "School's Median GPA (Optional)", { default: 3.85, max: 4, step: 0.01, required: false }), n("schoolMcat", "School's Median MCAT (Optional)", V.lizzy.schoolMcat, 528, false, 1, 0),
    ],
    calcResult: { label: "LizzyM Score", format: "number" },
    calcResults: [
      { key: "lizzyMScore", label: "Your LizzyM Score", format: "number", highlight: true },
      { key: "schoolLizzyM", label: "School's LizzyM Score", format: "number" },
      { key: "difference", label: "Difference (+ = Above School)", format: "number" },
      { key: "competitive", label: "At or Above the School? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter your GPA and MCAT, and the school's median GPA and MCAT (from MSAR) to compare.",
    examples: `Example: a 3.80 GPA and 515 MCAT give a LizzyM of ${X.lizzy.lizzyMScore}; a school with a 3.85 / 517 median scores ${X.lizzy.schoolLizzyM}, so you're ${Math.abs(X.lizzy.difference)} points below.`,
    assumptions: "LizzyM = GPA × 10 + MCAT on the pre-2015 scale; current MCAT scores are converted with (MCAT − 472) × 45/56. Popular on pre-med forums, it's a rough screen — a score within about 2 points of the school's suggests a reasonable fit. Not an official AAMC metric.",
    faq: [
      { question: "What is a LizzyM score?", answer: "A pre-med rule of thumb: GPA × 10 plus the MCAT (old scale), used to compare yourself with schools' medians." },
      { question: "What is a good LizzyM score?", answer: "Around the school's own LizzyM or higher — top-tier schools are typically 75+." },
    ],
  },
  {
    slug: "college-net-price-calculator",
    title: "College Net Price Calculator",
    category: COST,
    description: "Estimate what a college will really cost you — cost of attendance minus a Pell Grant from your SAI, state grants, need-based institutional aid and merit scholarships. Use it with any school's published costs, from Harvard, MIT and Stanford to Penn State, USC or UF.",
    metaTitle: "College Net Price Calculator — Real Cost After Aid",
    metaDescription: "Free college net price calculator. Estimate any college's net price after Pell, state, institutional and merit aid using your SAI.",
    calcInputs: [
      currencyField("tuitionFees", "Tuition & Fees", { default: 32000, max: 100000, step: 100 }), currencyField("housingFood", "Housing & Food", { default: 14000, max: 50000, step: 100 }),
      currencyField("booksSupplies", "Books & Supplies", { default: 1200, max: 10000, step: 50 }), currencyField("otherCosts", "Transportation & Personal", { default: 3000, max: 20000, step: 50 }),
      numberField("sai", "Your Student Aid Index (SAI)", { default: 12000, min: -1500, max: 999999, step: 100 }),
      percentField("needMetPercent", "Share of Need the College Meets", { default: 80, max: 100, step: 1 }),
      currencyField("stateGrant", "State Grant", { default: 2000, max: 50000, step: 100, required: false }), currencyField("meritScholarship", "Merit Scholarship", { default: 5000, max: 100000, step: 100, required: false }),
      currencyField("federalLoans", "Federal Direct Loans You'll Take", { default: 5500, max: 20500, step: 100, required: false }), percentField("yearlyIncrease", "Yearly Cost Increase", { default: 3, max: 10, step: 0.5, required: false }),
    ],
    calcResult: { label: "Net Price per Year", format: "currency" },
    calcResults: [
      { key: "netPrice", label: "Estimated Net Price per Year", format: "currency", highlight: true },
      { key: "costOfAttendance", label: "Cost of Attendance", format: "currency" },
      { key: "totalGrants", label: "Total Grants & Scholarships", format: "currency" },
      { key: "pellGrant", label: "Federal Pell Grant", format: "currency" },
      { key: "institutionalGrant", label: "Estimated Institutional Grant", format: "currency" },
      { key: "afterFederalLoans", label: "Cash Needed After Federal Loans", format: "currency" },
      { key: "fourYearNetPrice", label: "Four-Year Net Price", format: "currency" },
    ],
    instructions: "Enter the college's published cost of attendance and your SAI (from the FAFSA or the SAI calculator). For the share of need met, use the school's Common Data Set (section H2) — many private colleges such as Harvard, MIT and Stanford meet 100% of need; many public universities meet less.",
    examples: `Example: a ${money(X.npc.costOfAttendance)} cost of attendance with a 12,000 SAI, 80% of need met, a $2,000 state grant and a $5,000 merit award gives a net price of about ${money(X.npc.netPrice)} a year.`,
    assumptions: "Pell for 2026–27: up to $7,395, reduced by SAI (minimum award $740). Every college must post its own net price calculator, and its institutional aid formula (including home equity or business assets at some private schools) can differ a lot from this estimate — always check the school's official calculator. Loans aren't grants: they reduce cash needed, not the price.",
    faq: [
      { question: "What is a college net price?", answer: "The cost of attendance minus grants and scholarships — what you actually pay from savings, income and loans." },
      { question: "How accurate are net price calculators?", answer: "Fairly accurate for straightforward finances; less so for divorced parents, business owners or large assets." },
    ],
  },
  {
    slug: "college-tuition-calculator",
    title: "College Tuition Calculator",
    category: COST,
    description: "Calculate a college's tuition from its per-credit rate or flat-rate band plus mandatory fees — per term, per year and for the whole degree with yearly increases. Works for TAMU, UT Austin, NYU, Purdue, ASU Online, Dallas College and any school's published rates.",
    metaTitle: "College Tuition Calculator — Per Credit & Flat Rate",
    metaDescription: "Free college tuition calculator. Calculate tuition from per-credit or flat-rate pricing plus fees, per term, per year and for the degree.",
    calcInputs: [
      numberField("creditsPerTerm", "Credits per Term", { default: 15, min: 1, max: 30 }), currencyField("perCreditRate", "Tuition per Credit", { default: 420, max: 10000, step: 5 }),
      numberField("flatRateFrom", "Flat-Rate Tuition Starts At (Credits, 0 = No Flat Rate)", { default: 12, max: 30, required: false }),
      currencyField("feesPerTerm", "Mandatory Fees per Term", { default: 900, max: 20000, step: 10 }),
      dropdown("termsPerYear", "Terms per Year", [["2 Semesters", 2], ["3 Quarters / Trimesters", 3]], 2),
      numberField("years", "Years to Degree", { default: 4, min: 1, max: 8 }), percentField("yearlyIncrease", "Yearly Tuition Increase", { default: 3, max: 15, step: 0.5, required: false }),
    ],
    calcResult: { label: "Yearly Tuition & Fees", format: "currency" },
    calcResults: [
      { key: "yearlyTuitionAndFees", label: "Yearly Tuition & Fees", format: "currency", highlight: true },
      { key: "perTermCost", label: "Per Term", format: "currency" },
      { key: "tuitionPerTerm", label: "Tuition Only per Term", format: "currency" },
      { key: "totalForDegree", label: "Total for the Degree", format: "currency" },
      { key: "effectivePerCredit", label: "Effective Cost per Credit", format: "currency" },
    ],
    instructions: "Find the school's tuition and fee schedule (bursar or student accounts page) for your residency and program — in-state, out-of-state or online. If tuition is flat above a number of credits, enter it; extra credits are then free.",
    examples: `Example: 15 credits at $420 with a flat rate from 12 credits and $900 of fees cost ${money(X.tuit.perTermCost)} a term — ${money(X.tuit.yearlyTuitionAndFees)} a year, or about ${money(X.tuit.totalForDegree)} over four years with 3% increases (an effective ${money(X.tuit.effectivePerCredit)} per credit).`,
    assumptions: "Tuition doesn't include housing, food, books or travel. Many universities charge differential tuition for engineering, business or nursing, and some (e.g. UT Austin, Texas A&M) guarantee or fix rates for four years. Use the school's published schedule for exact figures.",
    faq: [
      { question: "How is college tuition calculated?", answer: "Either per credit hour or as a flat rate for a full-time load, plus mandatory fees each term." },
      { question: "What is flat-rate tuition?", answer: "One price for a range of credits (for example 12–18), so taking more credits costs nothing extra." },
    ],
  },
  {
    slug: "efc-sai-calculator",
    title: "EFC / SAI Calculator",
    category: COST,
    description: "Estimate your Student Aid Index (SAI) — the FAFSA number that replaced the EFC — for a dependent student using simplified 2026–27 formulas, and the Pell Grant it could bring.",
    metaTitle: "SAI Calculator (EFC) — 2026–27 FAFSA Student Aid Index",
    metaDescription: "Free SAI / EFC calculator. Estimate your 2026–27 FAFSA Student Aid Index and Pell Grant from parent and student income and assets.",
    calcInputs: [
      dropdown("familySize", "Family Size (Household)", [["2", 2], ["3", 3], ["4", 4], ["5", 5], ["6+", 6]], 4),
      currencyField("parentAgi", "Parents' Adjusted Gross Income (2024 Taxes)", { default: 95000, max: 2000000, step: 500 }),
      currencyField("untaxedIncome", "Parents' Untaxed Income (e.g. Tax-Free Pension)", { default: 0, max: 500000, step: 100, required: false }),
      currencyField("parentTaxesPaid", "Parents' Federal Income Tax Paid", { default: 8000, max: 500000, step: 100 }),
      currencyField("lowerEarnerIncome", "Lower-Earning Parent's Wages", { default: 35000, max: 1000000, step: 500, required: false }),
      currencyField("parentNetWorth", "Parents' Reportable Net Worth (Savings, Investments, Business)", { default: 50000, max: 10000000, step: 1000, required: false }),
      currencyField("studentIncome", "Student's Income", { default: 6000, max: 200000, step: 100, required: false }),
      currencyField("studentAssets", "Student's Assets", { default: 2000, max: 1000000, step: 100, required: false }),
    ],
    calcResult: { label: "Student Aid Index", format: "number" },
    calcResults: [
      { key: "studentAidIndex", label: "Estimated Student Aid Index (SAI)", format: "number", highlight: true },
      { key: "parentContribution", label: "Parent Contribution", format: "number" },
      { key: "studentContribution", label: "Student Contribution", format: "number" },
      { key: "estimatedPellGrant", label: "Estimated Pell Grant", format: "currency" },
      { key: "maximumPell", label: "Maximum Pell? (1 = Yes)", format: "number" },
    ],
    instructions: "Use the tax year the FAFSA asks for (2024 taxes for 2026–27). Don't include the home you live in or retirement accounts in net worth; do include small businesses and farms since the FAFSA Simplification Act.",
    examples: `Example: a family of four with $95,000 AGI, $8,000 of federal tax and $50,000 of net worth, and a student earning $6,000, has an estimated SAI of about ${X.sai.studentAidIndex.toLocaleString("en-US")} — above the Pell range.`,
    assumptions: "Simplified 2026–27 dependent-student formula: parent income protection allowance ($44,880 for a family of four), payroll taxes and an employment allowance; 12% of net worth added; 22–47% assessment; student income above $11,770 assessed at 50% and assets at 20%; SAI can go as low as −1,500. Families below 175–225% of the poverty line may qualify for automatic maximum Pell. Use the official FAFSA estimator for a precise number.",
    faq: [
      { question: "What replaced the EFC?", answer: "The Student Aid Index (SAI), starting with the 2024–25 FAFSA; it can be negative (down to −1,500)." },
      { question: "What SAI qualifies for a Pell Grant?", answer: "In 2026–27, an SAI below about $6,655 gives at least the $740 minimum Pell; a 0 or negative SAI gets the maximum $7,395." },
    ],
  },
  {
    slug: "osap-calculator",
    title: "OSAP Calculator",
    category: COST,
    description: "Estimate your OSAP funding in Ontario for 2026–27 — assessed costs minus expected contributions, the Canada Student Grant, and the new split where at most 25% of Ontario's portion is a grant and at least 75% a loan.",
    metaTitle: "OSAP Calculator 2026–27 — Grants vs Loans Estimate",
    metaDescription: "Free OSAP calculator. Estimate your Ontario student aid for 2026–27 with the 25% grant / 75% loan split and Canada Student Grant.",
    calcInputs: [
      currencyField("tuitionFees", "Tuition & Compulsory Fees (CAD)", { default: 7500, max: 60000, step: 100 }), currencyField("booksEquipment", "Books & Equipment (CAD)", { default: 1500, max: 10000, step: 50 }),
      currencyField("livingCosts", "Monthly Living Allowance (CAD)", { default: 1500, max: 5000, step: 50 }), numberField("studyMonths", "Months of Study", { default: 8, min: 1, max: 12 }),
      currencyField("familyContribution", "Expected Parent / Spouse Contribution (CAD)", { default: 3000, max: 100000, step: 100, required: false }),
      currencyField("studentContribution", "Expected Student Contribution (CAD)", { default: 1500, max: 50000, step: 100, required: false }),
      currencyField("federalGrant", "Canada Student Grant You Qualify For (CAD)", { default: 4200, max: 10000, step: 100, required: false }),
      numberField("yearsOfStudy", "Years of Study", { default: 4, min: 1, max: 8 }), percentField("repaymentRate", "Expected Repayment Interest Rate", { default: 7.45, max: 15, step: 0.05, required: false }),
    ],
    calcResult: { label: "Total Aid", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "totalAid", label: "Estimated OSAP Funding per Year", format: "currency", currency: "CAD", highlight: true },
      { key: "totalGrants", label: "Grants (Don't Repay)", format: "currency", currency: "CAD" },
      { key: "totalLoans", label: "Loans (Repay)", format: "currency", currency: "CAD" },
      { key: "ontarioGrant", label: "Ontario Grant (Max 25% of Ontario Portion)", format: "currency", currency: "CAD" },
      { key: "canadaStudentGrant", label: "Canada Student Grant", format: "currency", currency: "CAD" },
      { key: "assessedCosts", label: "Assessed Costs", format: "currency", currency: "CAD" },
      { key: "monthlyRepaymentAfterSchool", label: "Monthly Repayment After Graduation (10 Years)", format: "currency", currency: "CAD" },
    ],
    instructions: "Enter your tuition, books and monthly living costs, your family's and your own expected contribution, and the Canada Student Grant amount for your income level. OSAP's estimator uses your actual tax data.",
    examples: `Example: $21,000 of assessed costs minus $4,500 of contributions leaves ${"$"}${X.osap.totalAid.toLocaleString("en-US")} of aid: ${"$"}${X.osap.totalGrants.toLocaleString("en-US")} in grants and ${"$"}${X.osap.totalLoans.toLocaleString("en-US")} in loans.`,
    assumptions: "For programs starting on or after August 1, 2026, Ontario provides at most 25% of its portion as grants (previously up to 85%). The remaining need is split roughly evenly between the federal and Ontario portions here. Federal student loans are interest-free; the Ontario portion charges interest after a six-month grace period. Official OSAP results depend on your tax filings and program.",
    faq: [
      { question: "Is OSAP changing in 2026?", answer: "Yes — from fall 2026, at most 25% of Ontario's student aid is a grant and at least 75% a loan." },
      { question: "Do you have to pay back OSAP?", answer: "Grants no; loans yes, starting six months after you finish school." },
    ],
  },
  {
    slug: "college-roi-calculator",
    title: "College ROI Calculator",
    category: COST,
    description: "Work out the return on investment of a college degree — total cost (and forgone earnings), the earnings premium over a career, payback years, ROI and your student loan payment as a share of pay.",
    metaTitle: "College ROI Calculator — Is a Degree Worth It?",
    metaDescription: "Free college ROI calculator. Compare degree costs and forgone earnings with the lifetime earnings premium, payback period and loan burden.",
    calcInputs: [
      currencyField("netPricePerYear", "Net Price per Year", { default: 22000, max: 100000, step: 100 }), numberField("yearsToDegree", "Years to Degree", { default: 4, min: 1, max: 8, step: 0.5 }),
      currencyField("salaryWithDegree", "Expected Starting Salary with the Degree", { default: 70000, max: 500000, step: 500 }), currencyField("salaryWithoutDegree", "Salary Without the Degree", { default: 42000, max: 300000, step: 500 }),
      YN("countForgoneEarnings", "Count Earnings Given Up While in School", 1), currencyField("loanAmount", "Student Loans Borrowed", { default: 27000, max: 300000, step: 500, required: false }),
      percentField("loanRate", "Loan Interest Rate", { default: 6.39, max: 15, step: 0.01, required: false }), numberField("careerYears", "Working Years After Graduation", { default: 40, max: 50 }),
      percentField("salaryGrowth", "Real Salary Growth per Year", { default: 2, max: 10, step: 0.25, required: false }),
    ],
    calcResult: { label: "Lifetime Earnings Gain", format: "currency" },
    calcResults: [
      { key: "lifetimeEarningsGain", label: "Net Lifetime Earnings Gain", format: "currency", highlight: true },
      { key: "yearsToPayBack", label: "Years to Pay Back the Investment", format: "number" },
      { key: "totalInvestment", label: "Total Investment (Cost + Forgone Pay)", format: "currency" },
      { key: "returnOnInvestment", label: "Return on Investment", format: "percentage" },
      { key: "monthlyLoanPayment", label: "Monthly Loan Payment (10 Years)", format: "currency" },
      { key: "loanPaymentShareOfPay", label: "Loan Payment as % of Starting Pay", format: "percentage" },
    ],
    instructions: "Enter the degree's net price, expected starting salary for your major (from the College Scorecard or the school's outcomes report) and what you'd earn without it, plus any loans.",
    examples: `Example: $22,000 a year for four years with $168,000 of forgone pay is a ${money(X.roi.totalInvestment)} investment; a $28,000 earnings premium pays it back in about ${X.roi.yearsToPayBack} years and adds about ${money(X.roi.lifetimeEarningsGain)} over a 40-year career.`,
    assumptions: "Earnings premium = degree salary − non-degree salary, growing at the real growth rate; loan interest is subtracted. Forgone earnings matter most for older or working students. Major and completion matter more than the school: an unfinished degree adds cost without the premium. 2026–27 undergraduate federal loan rate: 6.39% (set each July).",
    faq: [
      { question: "Is college worth it financially?", answer: "On average yes — bachelor's degree holders earn far more over a career — but returns vary widely by major, cost and completion." },
      { question: "How do you calculate college ROI?", answer: "Compare the total cost (including forgone earnings) with the extra lifetime earnings the degree brings." },
    ],
  },
  {
    slug: "stipend-calculator",
    title: "Stipend Calculator",
    category: COST,
    description: "See what a graduate school or fellowship stipend leaves you each month — after estimated income tax and university fees — your rent burden and what's left after living costs, plus an effective hourly rate.",
    metaTitle: "Stipend Calculator — Grad School Stipend After Tax & Rent",
    metaDescription: "Free stipend calculator. See your monthly grad stipend after tax and fees, rent burden and money left after living costs.",
    calcInputs: [
      currencyField("annualStipend", "Yearly Stipend", { default: 38000, max: 200000, step: 500 }), currencyField("standardDeduction", "Standard Deduction", { default: 16100, max: 50000, step: 100 }),
      percentField("taxRate", "Federal + State Tax Rate on Taxable Stipend", { default: 10, max: 40, step: 0.5 }), currencyField("universityFees", "University Fees per Year", { default: 1200, max: 20000, step: 50, required: false }),
      currencyField("monthlyRent", "Monthly Rent", { default: 1300, max: 10000, step: 25 }), currencyField("otherMonthlyCosts", "Other Monthly Costs", { default: 900, max: 10000, step: 25, required: false }),
      numberField("hoursPerWeek", "Hours Worked per Week", { default: 50, max: 100, required: false }),
    ],
    calcResult: { label: "Monthly Take-Home", format: "currency" },
    calcResults: [
      { key: "monthlyAfterTaxAndFees", label: "Monthly After Tax & Fees", format: "currency", highlight: true },
      { key: "leftAfterRentAndCosts", label: "Left After Rent & Living Costs", format: "currency" },
      { key: "rentBurden", label: "Rent Burden", format: "percentage" },
      { key: "estimatedIncomeTax", label: "Estimated Yearly Income Tax", format: "currency" },
      { key: "effectiveHourly", label: "Effective Hourly Rate", format: "currency" },
    ],
    instructions: "Enter your yearly stipend, a combined tax rate (most grad stipends are taxable but have no FICA withheld), fees the stipend doesn't cover, rent and other monthly costs.",
    examples: `Example: a $38,000 stipend leaves about ${money(X.stip.monthlyAfterTaxAndFees)} a month after tax and fees; $1,300 rent is a ${X.stip.rentBurden}% rent burden, with about ${money(X.stip.leftAfterRentAndCosts)} left after other costs.`,
    assumptions: "Fellowship and stipend income is generally taxable (tuition remission for qualified tuition usually isn't); taxes often aren't withheld, so you may need quarterly estimated payments. Teaching and research assistantships are wages subject to withholding. Spending over 30% of income on rent is considered rent-burdened.",
    faq: [
      { question: "Are grad school stipends taxable?", answer: "Generally yes for federal income tax, though often without withholding; FICA usually doesn't apply to students." },
      { question: "What is a livable PhD stipend?", answer: "One where rent stays under about 30% of take-home pay — which in expensive cities can mean $45,000+." },
    ],
  },
  {
    slug: "ohio-edchoice-calculator",
    title: "Ohio EdChoice Calculator",
    category: COST,
    description: "Estimate your Ohio EdChoice Expansion scholarship for private school — the full $6,166 (K–8) or $8,408 (9–12) at or below 450% of the poverty level, prorated above it — and the tuition gap left.",
    metaTitle: "Ohio EdChoice Calculator — EdChoice Expansion Scholarship",
    metaDescription: "Free Ohio EdChoice calculator. Estimate your EdChoice Expansion scholarship from household size and income, and the tuition left to pay.",
    calcInputs: [
      numberField("householdSize", "Household Size", { default: 4, min: 1, max: 15 }), currencyField("householdIncome", "Household Adjusted Gross Income", { default: 160000, max: 2000000, step: 1000 }),
      dropdown("highSchool", "Grade Level", [["K–8", 0], ["9–12", 1]], 0), currencyField("tuition", "Private School Tuition", { default: 9000, max: 60000, step: 100, required: false }),
    ],
    calcResult: { label: "Estimated Scholarship", format: "currency" },
    calcResults: [
      { key: "estimatedScholarship", label: "Estimated EdChoice Scholarship", format: "currency", highlight: true },
      { key: "percentOfPovertyLevel", label: "Household Income as % of Poverty Level", format: "percentage" },
      { key: "shareOfMaximum", label: "Share of the Maximum Award", format: "percentage" },
      { key: "maximumAward", label: "Maximum Award", format: "currency" },
      { key: "gapToTuition", label: "Tuition Left to Pay", format: "currency" },
    ],
    instructions: "Enter your household size and adjusted gross income, your child's grade level and the school's tuition.",
    examples: `Example: a family of four with $160,000 of income is at ${X.edc.percentOfPovertyLevel}% of the poverty level, so a K–8 student would get about ${money(X.edc.estimatedScholarship)} (${X.edc.shareOfMaximum}% of the maximum), leaving ${money(X.edc.gapToTuition)} of a $9,000 tuition.`,
    assumptions: "2025–26 EdChoice Expansion: full award ($6,166 K–8, $8,408 high school) at or below 450% of the Federal Poverty Level ($144,675 for a family of four), prorated above it with a minimum of about 10%. The proration here is a straight-line approximation of the state's award schedule. Amounts are updated each school year.",
    faq: [
      { question: "Who qualifies for Ohio EdChoice?", answer: "Since 2023 every Ohio K–12 student can receive an EdChoice Expansion scholarship; the amount depends on household income." },
      { question: "How much is the EdChoice scholarship?", answer: "For 2025–26, up to $6,166 for K–8 and $8,408 for high school." },
    ],
  },
  {
    slug: "transfer-credit-calculator",
    title: "Transfer Credit Calculator",
    category: COST,
    description: "See how your credits transfer — credits accepted and applied to your new degree, credits lost, how many credits and semesters you'll have left and the tuition you save. Works for UTSA, Liberty University and any school's transfer evaluation.",
    metaTitle: "Transfer Credit Calculator — Credits Left After Transferring",
    metaDescription: "Free transfer credit calculator. See credits accepted and applied, credits lost, semesters left and tuition saved when you transfer.",
    calcInputs: [
      numberField("creditsEarned", "Credits Earned at Your Old School(s)", { default: 60, max: 300, step: 0.5 }), numberField("creditsAccepted", "Credits the New School Accepts", { default: 54, max: 300, step: 0.5 }),
      numberField("creditsApplicable", "Accepted Credits That Count Toward Your Degree (0 = All)", { default: 48, max: 300, step: 0.5, required: false }),
      numberField("degreeCredits", "Credits Required for the Degree", { default: 120, min: 1, max: 300 }), numberField("creditsPerTerm", "Credits per Term You'll Take", { default: 15, min: 1, max: 30 }),
      currencyField("costPerCredit", "New School's Cost per Credit", { default: 350, max: 5000, step: 5, required: false }),
    ],
    calcResult: { label: "Credits Remaining", format: "number" },
    calcResults: [
      { key: "creditsRemaining", label: "Credits Left to Graduate", format: "number", highlight: true },
      { key: "termsRemaining", label: "Terms Left", format: "number" },
      { key: "creditsLost", label: "Credits Not Accepted", format: "number" },
      { key: "acceptanceRate", label: "Credits Accepted", format: "percentage" },
      { key: "tuitionSaved", label: "Tuition Saved by Transferring Credits", format: "currency" },
    ],
    instructions: "Use the new school's transfer evaluation (or its transfer equivalency tool) for credits accepted, and your degree audit for how many apply to your major. Accepted credits can still count only as general electives.",
    examples: `Example: 54 of 60 credits accepted and 48 applied to a 120-credit degree leave ${X.trans.creditsRemaining} credits — ${X.trans.termsRemaining} semesters at 15 credits — and save about ${money(X.trans.tuitionSaved)} at $350 a credit.`,
    assumptions: "Most schools accept C or better grades from regionally accredited colleges and cap transfer credit (often 60–90 credits) with a residency requirement for the last 30 credits. State articulation agreements (for example Texas Core Curriculum) make public-to-public transfers smoother.",
    faq: [
      { question: "How many credits can you transfer?", answer: "Commonly up to 60 from a community college and up to 90 from a four-year school, depending on the university." },
      { question: "Do transfer grades affect my GPA?", answer: "Usually not — transfer credits count toward the degree, but most schools start your GPA fresh." },
    ],
  },
  {
    slug: "sap-calculator",
    title: "SAP Calculator",
    category: COST,
    description: "Check Satisfactory Academic Progress (SAP) for federal financial aid — your completion rate (pace), the 2.0 GPA requirement and the 150% maximum timeframe — and how many credits you need to pass to get back on track.",
    metaTitle: "SAP Calculator — Satisfactory Academic Progress & Pace",
    metaDescription: "Free SAP calculator. Check your financial aid completion rate (67% pace), GPA and 150% maximum timeframe, and credits needed to recover.",
    calcInputs: [
      numberField("creditsAttempted", "Credits Attempted (Including W, F, Repeats, Transfer)", { default: 48, max: 400, step: 0.5 }), numberField("creditsCompleted", "Credits Completed (Passed)", { default: 30, max: 400, step: 0.5 }),
      numberField("cumulativeGpa", "Cumulative GPA", { default: 2.4, max: 4, step: 0.01 }), numberField("minimumGpa", "Minimum GPA Required", { default: 2, max: 4, step: 0.05 }),
      percentField("minimumPace", "Minimum Completion Rate (Pace)", { default: 67, max: 100, step: 1 }), numberField("programCredits", "Credits Required for Your Program", { default: 120, min: 1, max: 300 }),
    ],
    calcResult: { label: "Meets SAP", format: "number" },
    calcResults: [
      { key: "meetsSap", label: "Meets SAP? (1 = Yes)", format: "number", highlight: true },
      { key: "completionRate", label: "Completion Rate (Pace)", format: "percentage" },
      { key: "gpaRequirementMet", label: "GPA Requirement Met? (1 = Yes)", format: "number" },
      { key: "maxTimeframeCredits", label: "Maximum Timeframe (150%)", format: "number" },
      { key: "creditsLeftBeforeMaxTimeframe", label: "Credits Left Before Max Timeframe", format: "number" },
      { key: "creditsToPassToReachPace", label: "Credits to Pass in a Row to Reach Pace", format: "number" },
    ],
    instructions: "Enter attempted and completed credits from your transcript (withdrawals, incompletes and failed courses count as attempted but not completed), your cumulative GPA and your school's SAP standards.",
    examples: `Example: 30 of 48 attempted credits completed is a ${X.sap.completionRate}% pace — below 67%, so SAP isn't met even with a 2.4 GPA; passing about ${X.sap.creditsToPassToReachPace} more credits in a row restores the pace.`,
    assumptions: "Federal rules require schools to check GPA (usually 2.0 for undergraduates), pace (usually 67%) and maximum timeframe (150% of program length). Students who fall short typically get a warning term, then can appeal for probation with an academic plan. Your school's policy is final.",
    faq: [
      { question: "What is SAP for financial aid?", answer: "Satisfactory Academic Progress — the GPA, completion-rate and timeframe standards you must meet to keep federal aid." },
      { question: "How do you calculate completion rate?", answer: "Divide credits completed by credits attempted — 30 of 48 is 62.5%." },
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
