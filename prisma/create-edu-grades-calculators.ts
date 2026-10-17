// One-time (but safe to re-run) batch setup script: creates 9 grade tools from the user's
// jobs & education list (Jobs & Education Calculators > Grade Calculators). School- and
// district-specific grade calculator keywords are covered by weighted-, semester- and
// online-gradebook calculators (user decision 17 Oct 2026: consolidate school pages).
// Examples are computed from src/lib/calc-engine-edu-grades.ts.
//
// HOW TO RUN (after prisma/setup-jobs-education-category.ts --apply)
//   npx tsx prisma/create-edu-grades-calculators.ts
// or
//   npm run db:create-edu-grades-calculators

import * as E from "../src/lib/calc-engine-edu-grades";
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

const CAT = "grade-calculators";
const run = (fn: E.CustomCalculator, values: Record<string, number>) => fn(values) as Record<string, number>;
const pct = (key: string, label: string, def: number, required = true) => percentField(key, label, { default: def, max: 120, step: 0.1, required });

const ex = {
  final: run(E.finalGrade, { currentGrade: 86, finalWeight: 25, targetGrade: 90, expectedFinalScore: 82 }),
  weighted: run(E.weightedGrade, { score1: 92, weight1: 40, score2: 85, weight2: 30, score3: 78, weight3: 20, score4: 100, weight4: 10 }),
  semester: run(E.semesterGrade, { split: 0, quarter1: 88, quarter2: 82, examScore: 75, targetGrade: 85, quarterWeight: 40 }),
  teacher: run(E.teacherGrading, { totalQuestions: 25, numberWrong: 4, extraCredit: 0 }),
  rubric: run(E.rubricScore, { criterion1: 4, max1: 4, criterion2: 3, max2: 4, criterion3: 3, max3: 4, criterion4: 2, max4: 4, levels: 4 }),
  pctg: run(E.collegePercentage, { gpa: 8.2, formula: 0 }),
  credits: run(E.creditHours, { creditsCompleted: 54, creditsRequired: 120, creditsPerTerm: 15, termsPerYear: 2, studyHoursPerCredit: 2 }),
  uni: run(E.uniGrade, { year2Average: 64, year3Average: 0, year2Weight: 40, year3Weight: 60 }),
  lms: run(E.onlineGradebook, { pointsEarned: 412, pointsPossible: 480, assignmentScore: 45, assignmentPossible: 50, targetGrade: 90 }),
};

const TOOLS: ToolDef[] = [
  {
    slug: "final-grade-calculator",
    title: "Final Grade Calculator",
    category: CAT,
    description: "Find the score you need on your final exam to get the class grade you want — and see what your grade will be with the final score you expect.",
    metaTitle: "Final Grade Calculator — What Do I Need on My Final?",
    metaDescription: "Free final grade calculator. Find the final exam score you need for a target class grade and the grade your expected final score gives you.",
    calcInputs: [
      pct("currentGrade", "Current Grade in the Class", 86),
      percentField("finalWeight", "Final Exam Weight", { default: 25, max: 100, step: 1 }),
      pct("targetGrade", "Grade You Want", 90),
      pct("expectedFinalScore", "Final Score You Expect (Optional)", 82, false),
    ],
    calcResult: { label: "Score Needed on Final", format: "percentage" },
    calcResults: [
      { key: "scoreNeededOnFinal", label: "Score You Need on the Final", format: "percentage", highlight: true },
      { key: "gradeWithExpectedScore", label: "Class Grade with Your Expected Score", format: "percentage" },
      { key: "gradeIfYouGet100", label: "Class Grade If You Score 100%", format: "percentage" },
      { key: "gradeIfYouGetZero", label: "Class Grade If You Skip the Final", format: "percentage" },
      { key: "targetReachable", label: "Target Reachable? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter your current grade before the final, how much the final is worth (from the syllabus) and the grade you want. Add the score you expect to see where you'll end up.",
    examples: `Example: with an 86% now and a final worth 25%, you need ${ex.final.scoreNeededOnFinal}% on the final for a 90% in the class. Scoring 82% would leave you at ${ex.final.gradeWithExpectedScore}%.`,
    assumptions: "Required final = (target − current × (1 − final weight)) ÷ final weight. Assumes your current grade already reflects everything except the final. If the final can replace a lower test score or there's a curve, the real number will differ.",
    faq: [
      { question: "How do I calculate what I need on my final?", answer: "Subtract the part of your grade already earned (current grade × weight of everything else) from your target, then divide by the final's weight." },
      { question: "Can I still pass if I fail the final?", answer: "Check 'Class Grade If You Skip the Final' — if it's above passing, a low final won't sink you." },
    ],
  },
  {
    slug: "weighted-grade-calculator",
    title: "Weighted Grade Calculator",
    category: CAT,
    description: "Calculate your course grade from weighted categories — homework, quizzes, tests, labs, projects and the final — the way syllabi at UF, UIUC, Purdue, Rutgers, UCLA and most schools weight them.",
    metaTitle: "Weighted Grade Calculator — Course Grade by Category",
    metaDescription: "Free weighted grade calculator. Enter category scores and weights (homework, tests, labs, final) to get your course grade.",
    calcInputs: [1, 2, 3, 4, 5, 6].flatMap((i) => [
      pct(`score${i}`, `Category ${i} Score`, [92, 85, 78, 100, 0, 0][i - 1], i === 1),
      percentField(`weight${i}`, `Category ${i} Weight (0 = Skip)`, { default: [40, 30, 20, 10, 0, 0][i - 1], max: 100, step: 0.5, required: i === 1 }),
    ]),
    calcResult: { label: "Weighted Grade", format: "percentage" },
    calcResults: [
      { key: "weightedGrade", label: "Weighted Course Grade", format: "percentage", highlight: true },
      { key: "gradePoints", label: "Grade Points (4.0 Scale)", format: "number" },
      { key: "weightsEntered", label: "Total Weight Entered", format: "percentage" },
      { key: "pointsToNextTen", label: "Points to the Next 10% Band", format: "number" },
    ],
    instructions: "Enter each grading category's average score and its weight from your syllabus. If you've only completed some categories, enter just those — the calculator scales the weights so your current grade is correct.",
    examples: `Example: tests 92% (40%), quizzes 85% (30%), labs 78% (20%) and homework 100% (10%) make a ${ex.weighted.weightedGrade}% course grade.`,
    assumptions: "Weighted grade = Σ(score × weight) ÷ Σ(weights), so weights don't have to add up to 100%. Grade points use the 10-point scale with plus/minus (93+ A, 90 A-, 87 B+ …). Your instructor's rounding and drop-lowest rules aren't included.",
    faq: [
      { question: "How do you calculate a weighted grade?", answer: "Multiply each category's average by its weight, add them up and divide by the total weight." },
      { question: "What if my weights don't add up to 100%?", answer: "Enter only the categories you have grades for; the calculator divides by the weights you entered." },
    ],
  },
  {
    slug: "semester-grade-calculator",
    title: "Semester Grade Calculator",
    category: CAT,
    description: "Calculate a high school semester grade from two quarter (nine-week) grades and the semester exam — with common district splits used in Broward, Palm Beach, Howard County (HCPSS) and other districts — and the exam score you need.",
    metaTitle: "Semester Grade Calculator — Quarters + Semester Exam",
    metaDescription: "Free semester grade calculator. Combine two quarter grades and the semester exam with your district's weights, and find the exam score you need.",
    calcInputs: [
      pct("quarter1", "Quarter 1 Grade", 88),
      pct("quarter2", "Quarter 2 Grade", 82),
      pct("examScore", "Semester Exam Score", 75, false),
      dropdown("split", "Weighting", [["40% / 40% / 20% Exam", 0], ["37.5% / 37.5% / 25% Exam", 1], ["45% / 45% / 10% Exam", 2], ["50% / 50% (No Exam)", 3], ["Custom", 4]], 0),
      percentField("quarterWeight", "Custom: Weight of Each Quarter", { default: 40, max: 50, step: 0.5, required: false }),
      pct("targetGrade", "Semester Grade You Want", 85, false),
    ],
    calcResult: { label: "Semester Grade", format: "percentage" },
    calcResults: [
      { key: "semesterGrade", label: "Semester Grade", format: "percentage", highlight: true },
      { key: "examScoreNeeded", label: "Exam Score Needed for Your Target", format: "percentage" },
      { key: "quartersOnly", label: "Quarter Average", format: "percentage" },
      { key: "examWeight", label: "Exam Weight", format: "percentage" },
      { key: "semesterGradePoints", label: "Grade Points (4.0 Scale)", format: "number" },
    ],
    instructions: "Enter both quarter grades and the semester exam score (or leave the exam blank to see what you need). Pick the weighting your district or teacher uses — check the student handbook — or choose Custom.",
    examples: `Example: quarters of 88% and 82% with a 75% exam at 40/40/20 give a ${ex.semester.semesterGrade}% semester grade. To finish at 85%, you'd need ${ex.semester.examScoreNeeded}% on the exam.`,
    assumptions: "Splits differ by district and change over time; some districts average letter-grade points instead of percentages or cap the exam's effect. Use the handbook's exact rule if yours differs.",
    faq: [
      { question: "How are semester grades calculated?", answer: "Usually as a weighted average of the two quarter grades and the semester exam — for example 40% + 40% + 20%." },
      { question: "How much does a semester exam count?", answer: "Commonly 10–25% of the semester grade, depending on the district." },
    ],
  },
  {
    slug: "teacher-grading-calculator",
    title: "Teacher Grading Calculator (Easy Grader)",
    category: CAT,
    description: "Grade tests and quizzes in seconds like an easy grader chart — enter the number of questions and the number wrong to get the percentage score, with extra credit and grade points.",
    metaTitle: "Easy Grader — Teacher Grading Calculator",
    metaDescription: "Free easy grader for teachers. Enter total questions and number wrong to get the percentage score, points per question and grade points.",
    calcInputs: [
      numberField("totalQuestions", "Total Questions / Points", { default: 25, min: 1, max: 500 }),
      numberField("numberWrong", "Number Wrong", { default: 4, max: 500, step: 0.5 }),
      numberField("extraCredit", "Extra Credit Points", { default: 0, max: 100, step: 0.5, required: false }),
    ],
    calcResult: { label: "Percent Score", format: "percentage" },
    calcResults: [
      { key: "percentScore", label: "Score", format: "percentage", highlight: true },
      { key: "numberCorrect", label: "Number Correct", format: "number" },
      { key: "pointsPerQuestion", label: "Percent per Question", format: "number" },
      { key: "gradePoints", label: "Grade Points (4.0 Scale)", format: "number" },
    ],
    instructions: "Enter the number of questions (or total points) and how many the student missed. Half points are allowed. Add extra credit if you give it.",
    examples: `Example: 4 wrong out of 25 is ${ex.teacher.percentScore}% — each question is worth ${ex.teacher.pointsPerQuestion} points.`,
    assumptions: "Score = (questions − wrong + extra credit) ÷ questions. Grade points use the common 10-point scale with plus/minus; your school's scale may differ.",
    faq: [
      { question: "How does an easy grader work?", answer: "It divides the number correct by the total questions and shows the percentage — the same chart many teachers keep on their desk." },
      { question: "How much is each question worth?", answer: "100 divided by the number of questions — 4 points each on a 25-question test." },
    ],
  },
  {
    slug: "rubric-score-calculator",
    title: "Rubric Score Calculator",
    category: CAT,
    description: "Convert rubric scores to a percentage grade — add up points across up to six criteria, then see the straight percentage and a fairer 50–100 converted grade used by many teachers.",
    metaTitle: "Rubric Score Calculator — Rubric to Percentage Grade",
    metaDescription: "Free rubric score calculator. Convert rubric points into a percentage and a 50–100 adjusted grade across up to six criteria.",
    calcInputs: [
      numberField("levels", "Rubric Levels (e.g. 4 for a 1–4 Rubric)", { default: 4, min: 2, max: 10 }),
      ...[1, 2, 3, 4, 5, 6].flatMap((i) => [
        numberField(`criterion${i}`, `Criterion ${i} Score`, { default: [4, 3, 3, 2, 0, 0][i - 1], max: 100, step: 0.5, required: i === 1 }),
        numberField(`max${i}`, `Criterion ${i} Max Points (0 = Skip)`, { default: [4, 4, 4, 4, 0, 0][i - 1], max: 100, step: 0.5, required: i === 1 }),
      ]),
    ],
    calcResult: { label: "Straight Percentage", format: "percentage" },
    calcResults: [
      { key: "straightPercent", label: "Straight Percentage", format: "percentage", highlight: true },
      { key: "adjustedPercent", label: "Adjusted Grade (50–100 Scale)", format: "percentage" },
      { key: "pointsEarned", label: "Points Earned", format: "number" },
      { key: "pointsPossible", label: "Points Possible", format: "number" },
      { key: "averageLevel", label: "Average Rubric Level", format: "number" },
    ],
    instructions: "Enter the score and maximum points for each rubric criterion (weight a criterion by giving it more points). The adjusted grade maps the lowest level to 50% instead of 0%, which many schools use so rubrics don't punish too hard.",
    examples: `Example: 4, 3, 3 and 2 on four 4-point criteria is 12/16 — ${ex.rubric.straightPercent}% straight, or ${ex.rubric.adjustedPercent}% on the 50–100 conversion.`,
    assumptions: "Straight percentage = earned ÷ possible. Adjusted = 50 + straight ÷ 2. Rubrics measure levels of mastery, so a straight percentage can understate performance (a 2 out of 4 'developing' isn't failing work) — follow your school's conversion policy.",
    faq: [
      { question: "How do you convert a rubric score to a grade?", answer: "Divide points earned by points possible for a straight percentage, or use a conversion table that maps rubric levels to grade ranges." },
      { question: "Is a 3 out of 4 on a rubric a B?", answer: "On a straight percentage it's 75% (C), but many conversion tables treat a 3 as proficient — about 85% (B)." },
    ],
  },
  {
    slug: "college-percentage-calculator",
    title: "College Percentage Calculator",
    category: CAT,
    description: "Convert your college CGPA or GPA to a percentage — CBSE/AICTE (× 9.5), Mumbai and VTU ((CGPA − 0.75) × 10), × 10 and (CGPA − 0.5) × 10 formulas, or a US 4.0 GPA.",
    metaTitle: "College Percentage Calculator — CGPA to Percentage",
    metaDescription: "Free college percentage calculator. Convert CGPA to percentage with CBSE, AICTE, Mumbai University, VTU formulas, or a US GPA to percent.",
    calcInputs: [
      numberField("gpa", "Your CGPA / GPA", { default: 8.2, max: 10, step: 0.01 }),
      dropdown("formula", "Conversion Formula", [["CGPA × 9.5 (CBSE, AICTE, Many Universities)", 0], ["(CGPA − 0.75) × 10 (Mumbai University, VTU)", 1], ["CGPA × 10", 2], ["(CGPA − 0.5) × 10 (AKTU, Some Universities)", 3], ["US 4.0 GPA → Percentage", 4]], 0),
    ],
    calcResult: { label: "Percentage", format: "percentage" },
    calcResults: [
      { key: "percentage", label: "Equivalent Percentage", format: "percentage", highlight: true },
      { key: "gpaEntered", label: "GPA Entered", format: "number" },
    ],
    instructions: "Enter your CGPA or GPA and choose the formula your university prints on its grade card — the conversion formula is usually stated on the back of the marksheet.",
    examples: `Example: a CGPA of 8.2 × 9.5 = ${ex.pctg.percentage}%.`,
    assumptions: "Always use your own university's official formula when one exists. The US 4.0 option is a rough guide (percentage ≈ 55 + GPA × 10) — US colleges don't publish a single conversion.",
    faq: [
      { question: "How do I convert CGPA to percentage?", answer: "Most Indian universities and CBSE multiply CGPA by 9.5; Mumbai University and VTU use (CGPA − 0.75) × 10." },
      { question: "What percentage is an 8 CGPA?", answer: "76% with the × 9.5 formula, or 72.5% with (CGPA − 0.75) × 10." },
    ],
  },
  {
    slug: "credit-hours-calculator",
    title: "Credit Hours Calculator",
    category: CAT,
    description: "Work out how many credit hours you have left to graduate, how many semesters or quarters that takes at your course load, whether you're full-time and how many study hours a week to plan for.",
    metaTitle: "Credit Hours Calculator — Credits Left to Graduate",
    metaDescription: "Free credit hours calculator. See credits remaining, semesters to graduation, full-time status and weekly study hours for your course load.",
    calcInputs: [
      numberField("creditsCompleted", "Credits Completed", { default: 54, max: 300, step: 0.5 }),
      numberField("creditsRequired", "Credits Required to Graduate", { default: 120, min: 1, max: 300 }),
      numberField("creditsPerTerm", "Credits per Term You Plan to Take", { default: 15, min: 1, max: 30 }),
      dropdown("termsPerYear", "Terms per Year", [["2 (Semesters)", 2], ["3 (Quarters or Summer Term)", 3]], 2),
      numberField("studyHoursPerCredit", "Study Hours per Credit per Week", { default: 2, max: 4, step: 0.5 }),
    ],
    calcResult: { label: "Credits Remaining", format: "number" },
    calcResults: [
      { key: "creditsRemaining", label: "Credits Remaining", format: "number", highlight: true },
      { key: "termsRemaining", label: "Terms Remaining", format: "number" },
      { key: "yearsToGraduate", label: "Years to Graduate", format: "number" },
      { key: "percentComplete", label: "Degree Progress", format: "percentage" },
      { key: "weeklyStudyHours", label: "Weekly Study Hours Outside Class", format: "number" },
      { key: "fullTime", label: "Full-Time Load (12+)? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the credits you've completed (including transfer and AP credit), the credits your degree requires and how many you plan to take each term.",
    examples: `Example: with 54 of 120 credits done and 15 credits a semester, you have ${ex.credits.creditsRemaining} credits left — ${ex.credits.termsRemaining} semesters, or ${ex.credits.yearsToGraduate} years — and should plan about ${ex.credits.weeklyStudyHours} study hours a week.`,
    assumptions: "One credit hour is typically one hour of class plus about two hours of study per week for a 15-week semester (the federal definition). Most bachelor's degrees need 120 semester credits (180 quarter credits). Full-time is usually 12+ credits per term for undergraduates.",
    faq: [
      { question: "How many credit hours do you need to graduate?", answer: "Usually 120 semester credits for a bachelor's degree and 60 for an associate degree." },
      { question: "How many hours a week is 15 credits?", answer: "About 15 hours in class plus 30 hours of study — roughly 45 hours a week." },
    ],
  },
  {
    slug: "uni-grade-calculator",
    title: "Uni Grade Calculator",
    category: CAT,
    description: "Work out your UK university degree classification — First, 2:1, 2:2 or Third — from your second- and final-year averages and how your university weights them, and the final-year average you need for each class.",
    metaTitle: "Uni Grade Calculator — UK Degree Classification",
    metaDescription: "Free uni grade calculator. Find your UK degree classification from year averages and weights, and the final-year mark you need for a First or 2:1.",
    calcInputs: [
      pct("year2Average", "Second-Year Average", 64),
      pct("year3Average", "Final-Year Average So Far (0 If None Yet)", 0, false),
      percentField("year2Weight", "Second-Year Weight", { default: 40, max: 100, step: 5 }),
      percentField("year3Weight", "Final-Year Weight", { default: 60, max: 100, step: 5 }),
    ],
    calcResult: { label: "Degree Average", format: "percentage" },
    calcResults: [
      { key: "degreeAverage", label: "Weighted Degree Average", format: "percentage", highlight: true },
      { key: "classification", label: "Classification (4 = First, 3 = 2:1, 2 = 2:2, 1 = Third)", format: "number" },
      { key: "year3NeededForFirst", label: "Final-Year Average Needed for a First", format: "percentage" },
      { key: "year3NeededFor21", label: "Final-Year Average Needed for a 2:1", format: "percentage" },
      { key: "year3NeededFor22", label: "Final-Year Average Needed for a 2:2", format: "percentage" },
    ],
    instructions: "Enter your second-year average and, if you have one, your final-year average so far. Set the weights from your course handbook — common splits are 40/60, 33/67, 25/75 and 50/50.",
    examples: `Example: a 64% second-year average weighted 40/60 needs ${ex.uni.year3NeededForFirst}% in final year for a First and ${ex.uni.year3NeededFor21}% for a 2:1.`,
    assumptions: "UK classes: First 70%+, 2:1 60–69%, 2:2 50–59%, Third 40–49%. Many universities also use 'borderline' rules (for example a mark of 68–69% with most credits at First level) or discount your lowest modules — check your regulations.",
    faq: [
      { question: "What percentage is a First in the UK?", answer: "70% or more overall." },
      { question: "Does first year count toward my degree?", answer: "At most UK universities it doesn't; second and final year usually do." },
    ],
  },
  {
    slug: "canvas-grade-calculator",
    title: "Canvas Grade Calculator",
    category: CAT,
    description: "Calculate your grade in Canvas, Schoology, Skyward, Infinite Campus, Focus and other online gradebooks — points earned and possible, a 'what-if' score on your next assignment, and the points you need to reach your target.",
    metaTitle: "Canvas Grade Calculator — What-If Grade (Schoology, Skyward)",
    metaDescription: "Free grade calculator for Canvas, Schoology, Skyward, Infinite Campus and Focus. Test a what-if assignment score and see the points you need.",
    calcInputs: [
      numberField("pointsEarned", "Points Earned So Far", { default: 412, max: 100000, step: 0.5 }),
      numberField("pointsPossible", "Points Possible So Far", { default: 480, min: 0, max: 100000, step: 0.5 }),
      numberField("assignmentScore", "What-If Score on the Next Assignment", { default: 45, max: 10000, step: 0.5 }),
      numberField("assignmentPossible", "Points Possible on That Assignment", { default: 50, max: 10000, step: 0.5 }),
      pct("targetGrade", "Grade You Want", 90),
    ],
    calcResult: { label: "Grade After Assignment", format: "percentage" },
    calcResults: [
      { key: "gradeAfterAssignment", label: "Grade After the What-If Assignment", format: "percentage", highlight: true },
      { key: "currentGrade", label: "Current Grade", format: "percentage" },
      { key: "change", label: "Change in Grade (Points)", format: "number" },
      { key: "pointsNeededForTarget", label: "Points You Need on It for Your Target", format: "number" },
      { key: "targetReachable", label: "Target Reachable on This Assignment? (1 = Yes)", format: "number" },
    ],
    instructions: "Copy the total points earned and possible from your gradebook (for a points-based course), then enter a what-if score for an upcoming assignment. For courses with weighted categories, use the Weighted Grade Calculator instead.",
    examples: `Example: 412 of 480 points is ${ex.lms.currentGrade}%. Scoring 45/50 on the next assignment raises it to ${ex.lms.gradeAfterAssignment}%; reaching 90% would need ${ex.lms.pointsNeededForTarget} points — ${ex.lms.targetReachable ? "possible" : "more than the assignment is worth"}.`,
    assumptions: "For points-based gradebooks, grade = total earned ÷ total possible. Ungraded or excused work, drops and weighted categories change the result — Canvas's own 'What-If Scores' feature shows your teacher's exact setup. Not affiliated with Instructure, PowerSchool, Skyward, Infinite Campus or Focus.",
    faq: [
      { question: "How does Canvas calculate my grade?", answer: "Either by total points (earned ÷ possible) or by weighted assignment groups, depending on how your teacher set up the course." },
      { question: "How do I see a what-if grade?", answer: "Enter a hypothetical score here, or use Canvas's What-If Scores on the Grades page." },
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
