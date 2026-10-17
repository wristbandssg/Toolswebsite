// One-time (but safe to re-run) batch setup script: creates 13 school age, calendar and
// classroom tools from the user's jobs & education list (Jobs & Education Calculators >
// School Age, Calendar & Classroom Calculators). "Canvas Calculator" and "Schoology Calculator"
// are covered by canvas-grade-calculator in Grade Calculators. Examples are computed from
// src/lib/calc-engine-edu-school.ts.
//
// HOW TO RUN (after prisma/setup-jobs-education-category.ts --apply)
//   npx tsx prisma/create-edu-school-calculators.ts
// or
//   npm run db:create-edu-school-calculators

import * as E from "../src/lib/calc-engine-edu-school";
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

const CAT = "school-age-classroom-calculators";
const run = (fn: E.CustomCalculator, values: Record<string, number>) => fn(values) as Record<string, number>;
const n = (key: string, label: string, def: number, max: number, required = true, step = 1, min = 0) => numberField(key, label, { default: def, max, required, step, min });
const dateInputs = (prefix: string, label: string, y: number, m: number, d: number) => [
  n(`${prefix}Year`, `${label} — Year`, y, 2100, true, 1, 1900),
  n(`${prefix}Month`, `${label} — Month (1–12)`, m, 12, true, 1, 1),
  n(`${prefix}Day`, `${label} — Day (1–31)`, d, 31, true, 1, 1),
];
const birth = (y: number, m: number, d: number) => [n("birthYear", "Birth Year", y, 2100, true, 1, 1990), n("birthMonth", "Birth Month (1–12)", m, 12, true, 1, 1), n("birthDay", "Birth Day (1–31)", d, 31, true, 1, 1)];
const cutoff = (m = 9, d = 1) => [n("cutoffMonth", "State Birthday Cutoff — Month", m, 12, true, 1, 1), n("cutoffDay", "State Birthday Cutoff — Day", d, 31, true, 1, 1)];
const CUTOFF_NOTE = "Most US states use a September 1 birthday cutoff (the child must be 5 by then for kindergarten); others use August 1 (e.g. Missouri, Iowa), September 30, October 1, or December 1–31 (e.g. Connecticut, Vermont). Many states allow early entry or require testing; check your state and district.";

const V = {
  age: { birthYear: 2019, birthMonth: 10, birthDay: 3, schoolYear: 2026, cutoffMonth: 9, cutoffDay: 1 },
  k: { birthYear: 2021, birthMonth: 8, birthDay: 20, cutoffMonth: 9, cutoffDay: 1 },
  grad: { useCurrentGrade: 0, birthYear: 2012, birthMonth: 4, birthDay: 2, cutoffMonth: 9, cutoffDay: 1, schoolYearEnd: 2027, currentGrade: 9 },
  days: { startYear: 2026, startMonth: 8, startDay: 17, endYear: 2027, endMonth: 5, endDay: 28, daysOff: 27 },
  h100: { startYear: 2026, startMonth: 8, startDay: 17, daysOff: 12, targetDay: 100 },
  snow: { snowfall: 5, region: 1, timing: 0, ice: 0, temperature: 22, windMph: 15, snowDaysUsed: 1 },
  rr: { runningWords: 150, errors: 9, selfCorrections: 3 },
  orf: { wordsRead: 104, errors: 4, seconds: 60, grade: 3, season: 1 },
  dib: { score1: 48, goal1: 52, score2: 40, goal2: 40, score3: 0, goal3: 0, score4: 0, goal4: 0, score5: 0, goal5: 0 },
  brig: { birthYear: 2022, birthMonth: 3, birthDay: 15, testYear: 2026, testMonth: 10, testDay: 17, totalScore: 72, cutoffScore: 68 },
  lex: { gradeLevel: 5 },
  fk: { words: 250, sentences: 15, syllables: 360 },
  tea: { studentAchievement: 78, academicGrowth: 82, relativePerformance: 80, closingTheGaps: 70 },
};
const X = {
  age: run(E.schoolAge, V.age), k: run(E.kindergartenStartAge, V.k), grad: run(E.highSchoolGraduationYear, V.grad), days: run(E.schoolDays, V.days), h100: run(E.hundredthDay, V.h100),
  snow: run(E.snowDay, V.snow), rr: run(E.runningRecord, V.rr), orf: run(E.oralReadingFluency, V.orf), dib: run(E.dibelsComposite, V.dib), brig: run(E.brigance, V.brig),
  lex: run(E.lexileLevel, V.lex), fk: run(E.fleschKincaid, V.fk), tea: run(E.teaAccountability, V.tea),
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TOOLS: ToolDef[] = [
  {
    slug: "school-age-calculator",
    title: "School Age Calculator",
    category: CAT,
    description: "Find what grade a child should be in for a school year — their age on your state's birthday cutoff date and the matching grade, from pre-K to 12th grade.",
    metaTitle: "School Age Calculator — What Grade Should My Child Be In?",
    metaDescription: "Free school age calculator. Find your child's age on the state cutoff date and the grade they belong in for any school year.",
    calcInputs: [...birth(2019, 10, 3), n("schoolYear", "School Year Starting In (Fall of Year)", V.age.schoolYear, 2100, true, 1, 2000), ...cutoff()],
    calcResult: { label: "Grade Level", format: "number" },
    calcResults: [
      { key: "gradeLevel", label: "Grade (0 = Kindergarten, −1 = Pre-K)", format: "number", highlight: true },
      { key: "ageOnCutoff", label: "Age on the Cutoff Date (Years)", format: "number" },
      { key: "ageMonths", label: "Plus Months", format: "number" },
      { key: "ageOnFirstDay", label: "Age on the First Day (Mid-August)", format: "number" },
    ],
    instructions: "Enter the child's date of birth, the school year (the fall it starts) and your state's birthday cutoff.",
    examples: `Example: a child born 3 October 2019 is ${X.age.ageOnCutoff} on 1 September 2026, so they belong in grade ${X.age.gradeLevel} for 2026–27.`,
    assumptions: `${CUTOFF_NOTE} Grade = age on the cutoff − 5. Children who repeated or skipped a grade, or started early, may differ.`,
    faq: [
      { question: "What grade is a 7-year-old in?", answer: "Usually 1st or 2nd grade, depending on whether their birthday falls before the cutoff." },
      { question: "How old are kids in each grade?", answer: "Kindergarteners are 5–6, 1st graders 6–7 and so on up to 17–18 in 12th grade." },
    ],
  },
  {
    slug: "kindergarten-start-age-calculator",
    title: "Kindergarten Start Age Calculator",
    category: CAT,
    description: "Find the year your child can start kindergarten under your state's birthday cutoff, how old they'll be on the first day, whether they'd be one of the youngest in class, and their graduation year.",
    metaTitle: "Kindergarten Start Age Calculator — When Can My Child Start?",
    metaDescription: "Free kindergarten age calculator. Find when your child can start kindergarten, their age on day one and graduation year.",
    calcInputs: [...birth(2021, 8, 20), ...cutoff()],
    calcResult: { label: "Kindergarten Year", format: "number" },
    calcResults: [
      { key: "kindergartenYear", label: "Starts Kindergarten in Fall of", format: "number", highlight: true },
      { key: "ageAtStartYears", label: "Age on the First Day (Years)", format: "number" },
      { key: "ageAtStartMonths", label: "Plus Months", format: "number" },
      { key: "youngestInClass", label: "Among the Youngest in Class? (1 = Yes)", format: "number" },
      { key: "graduationYear", label: "High School Graduation Year", format: "number" },
    ],
    instructions: "Enter your child's date of birth and your state's kindergarten birthday cutoff.",
    examples: `Example: born 20 August 2021 with a 1 September cutoff, the child can start kindergarten in fall ${X.k.kindergartenYear} at ${X.k.ageAtStartYears} years ${X.k.ageAtStartMonths} months — one of the youngest in the class — and graduate in ${X.k.graduationYear}.`,
    assumptions: `${CUTOFF_NOTE} Some parents of summer-birthday children choose to wait a year ("redshirting"). Kindergarten attendance isn't compulsory in every state.`,
    faq: [
      { question: "What age do kids start kindergarten?", answer: "At 5, in the fall after turning 5 by the state's cutoff date." },
      { question: "Should I wait a year to start kindergarten?", answer: "It depends on the child; talk to the preschool teacher and the district about readiness." },
    ],
  },
  {
    slug: "high-school-graduation-year-calculator",
    title: "High School Graduation Year Calculator",
    category: CAT,
    description: "Find a student's high school graduation year (class of …) from their date of birth and the state cutoff, or from their current grade.",
    metaTitle: "High School Graduation Year Calculator — Class of What Year?",
    metaDescription: "Free high school graduation year calculator. Find a student's class year from date of birth or current grade.",
    calcInputs: [
      dropdown("useCurrentGrade", "Calculate From", [["Date of Birth", 0], ["Current Grade", 1]], 0),
      ...birth(2012, 4, 2), ...cutoff(),
      n("currentGrade", "Current Grade (0 = Kindergarten)", V.grad.currentGrade, 12, false),
      n("schoolYearEnd", "Current School Year Ends In", V.grad.schoolYearEnd, 2100, true, 1, 2000),
    ],
    calcResult: { label: "Graduation Year", format: "number" },
    calcResults: [
      { key: "graduationYear", label: "Class Of (Graduation Year)", format: "number", highlight: true },
      { key: "kindergartenYear", label: "Kindergarten Start Year", format: "number" },
      { key: "yearsUntilGraduation", label: "Years Until Graduation", format: "number" },
    ],
    instructions: "Choose whether to calculate from the date of birth (with your state's cutoff) or the current grade, and enter the year the current school year ends.",
    examples: `Example: a student born 2 April 2012 with a 1 September cutoff started kindergarten in ${X.grad.kindergartenYear} and is in the class of ${X.grad.graduationYear}.`,
    assumptions: `Graduation year = kindergarten start year + 13. ${CUTOFF_NOTE}`,
    faq: [
      { question: "What year will a 9th grader graduate?", answer: "Four school years later — a 9th grader in 2026–27 is the class of 2030." },
      { question: "What is a class year?", answer: "The year the student is expected to graduate from high school." },
    ],
  },
  {
    slug: "school-days-calculator",
    title: "School Days Calculator",
    category: CAT,
    description: "Count the school days between two dates — weekdays minus holidays, breaks and teacher workdays — and the number of school weeks; use it for the whole year or the days left.",
    metaTitle: "School Days Calculator — Days Left in the School Year",
    metaDescription: "Free school days calculator. Count school days between two dates minus holidays and breaks, and the school weeks left.",
    calcInputs: [...dateInputs("start", "Start Date", 2026, 8, 17), ...dateInputs("end", "End Date", 2027, 5, 28), n("daysOff", "Weekday Holidays, Breaks & Workdays Off", V.days.daysOff, 200, false)],
    calcResult: { label: "School Days", format: "number" },
    calcResults: [
      { key: "schoolDays", label: "School Days", format: "number", highlight: true },
      { key: "weekdays", label: "Weekdays (Mon–Fri)", format: "number" },
      { key: "calendarDays", label: "Calendar Days", format: "number" },
      { key: "schoolWeeks", label: "School Weeks", format: "number" },
    ],
    instructions: "Enter the start and end dates (use today as the start to count the days left) and the number of weekday holidays, break days and teacher workdays from your district calendar.",
    examples: `Example: 17 August 2026 to 28 May 2027 has ${X.days.weekdays} weekdays; minus 27 days off, that's ${X.days.schoolDays} school days (${X.days.schoolWeeks} weeks).`,
    assumptions: "Both dates are included. Most US states require about 170–180 school days (or an equivalent number of hours). Weekend days aren't counted.",
    faq: [
      { question: "How many school days are in a year?", answer: "Usually 175–180 in the US, set by state law." },
      { question: "How do I count school days left?", answer: "Enter today and the last day of school, then subtract the holidays and breaks still to come." },
    ],
  },
  {
    slug: "100th-day-of-school-calculator",
    title: "100th Day of School Calculator",
    category: CAT,
    description: "Find the date of the 100th day of school from the first day and the holidays before it — perfect for planning 100th-day celebrations (or any other school-day milestone).",
    metaTitle: "100th Day of School Calculator — When Is the 100th Day?",
    metaDescription: "Free 100th day of school calculator. Find the 100th school day's date from the first day of school and days off.",
    calcInputs: [...dateInputs("start", "First Day of School", 2026, 8, 17), n("daysOff", "Weekday Days Off Before It", V.h100.daysOff, 100, false), n("targetDay", "School Day Number", V.h100.targetDay, 200, true, 1, 1)],
    calcResult: { label: "Month", format: "number" },
    calcResults: [
      { key: "month", label: "Month", format: "number", highlight: true },
      { key: "day", label: "Day", format: "number", highlight: true },
      { key: "year", label: "Year", format: "number" },
      { key: "calendarDaysAfterStart", label: "Calendar Days After the First Day", format: "number" },
    ],
    instructions: "Enter the first day of school and count the weekday holidays, breaks and teacher workdays before the milestone from your district calendar (Labor Day, Thanksgiving, winter break …).",
    examples: `Example: starting 17 August 2026 with 12 weekdays off, the 100th day of school is ${MONTHS[X.h100.month - 1]} ${X.h100.day}, ${X.h100.year}.`,
    assumptions: "The first day counts as day 1. Snow days and makeup days move the date — recalculate after any closure.",
    faq: [
      { question: "When is the 100th day of school?", answer: "Usually late January or early February for schools starting in August." },
      { question: "Does the first day count toward the 100 days?", answer: "Yes, it's day 1." },
    ],
  },
  {
    slug: "snow-day-calculator",
    title: "Snow Day Calculator",
    category: CAT,
    description: "Estimate the chance of a snow day or delay tomorrow — forecast snowfall against how much snow your area usually handles, plus timing, ice, cold, wind and snow days already used.",
    metaTitle: "Snow Day Calculator — Will School Be Closed Tomorrow?",
    metaDescription: "Free snow day calculator. Estimate the chance of a school closure or delay from snowfall, timing, ice, temperature and your region.",
    calcInputs: [
      numberField("snowfall", "Forecast Snowfall (Inches)", { default: 5, max: 48, step: 0.5 }),
      dropdown("region", "Where You Live", [["South / Rarely Snows", 0], ["Mid-Atlantic / Midwest", 1], ["North / Snow Belt", 2]], 1),
      dropdown("timing", "When the Snow Falls", [["Overnight", 0], ["During the Morning Commute", 1], ["Afternoon / Evening", 2]], 0),
      YN("ice", "Freezing Rain or Ice Expected", 0),
      numberField("temperature", "Morning Temperature (°F)", { default: 22, min: -40, max: 50 }),
      numberField("windMph", "Wind Speed (mph)", { default: 15, max: 80 }),
      numberField("snowDaysUsed", "Snow Days Already Used This Year", { default: 1, max: 20 }),
    ],
    calcResult: { label: "Snow Day Chance", format: "percentage" },
    calcResults: [
      { key: "snowDayChance", label: "Chance of a Snow Day", format: "percentage", highlight: true },
      { key: "delayChance", label: "Chance of a Delay or Closure", format: "percentage" },
      { key: "inchesOverThreshold", label: "Inches Over What Your Area Usually Handles", format: "number" },
    ],
    instructions: "Use the latest forecast for overnight and morning snow, pick your region and add any ice, cold and wind. Districts that have used many snow days are less likely to close.",
    examples: `Example: 5 inches overnight in a Midwest district at 22°F, with one snow day used, gives about a ${Math.round(X.snow.snowDayChance)}% chance of a snow day.`,
    assumptions: "A just-for-fun estimate. Superintendents also weigh road crews, bus routes, remote-learning days and forecasts that change overnight. Ice is the most common reason for closures in the South.",
    faq: [
      { question: "How much snow for a snow day?", answer: "It depends on the region — an inch can close schools in the South, while northern districts often stay open with 6 inches or more." },
      { question: "When do schools announce snow days?", answer: "Usually between 5 and 6 a.m., sometimes the night before." },
    ],
  },
  {
    slug: "running-record-calculator",
    title: "Running Record Calculator",
    category: CAT,
    description: "Score a reading running record — accuracy rate, error ratio and self-correction ratio — and see whether the text is at the reader's independent, instructional or frustration level.",
    metaTitle: "Running Record Calculator — Accuracy & Self-Correction Rate",
    metaDescription: "Free running record calculator. Calculate accuracy rate, error ratio and self-correction ratio and find the reading level.",
    calcInputs: [n("runningWords", "Running Words in the Passage", V.rr.runningWords, 2000, true, 1, 1), n("errors", "Errors", V.rr.errors, 500), n("selfCorrections", "Self-Corrections", V.rr.selfCorrections, 500, false)],
    calcResult: { label: "Accuracy Rate", format: "percentage" },
    calcResults: [
      { key: "accuracyRate", label: "Accuracy Rate", format: "percentage", highlight: true },
      { key: "readingLevel", label: "Level (3 Independent, 2 Instructional, 1 Frustration)", format: "number" },
      { key: "errorRatio", label: "Error Ratio (1 : X)", format: "number" },
      { key: "selfCorrectionRatio", label: "Self-Correction Ratio (1 : X)", format: "number" },
    ],
    instructions: "Count the running words in the passage (not titles), the errors (substitutions, omissions, insertions, told words) and self-corrections, which aren't errors.",
    examples: `Example: 9 errors and 3 self-corrections on 150 words is ${X.rr.accuracyRate}% accuracy (instructional), an error ratio of 1:${Math.round(X.rr.errorRatio)} and a self-correction ratio of 1:${X.rr.selfCorrectionRatio}.`,
    assumptions: "Accuracy = (running words − errors) ÷ running words. Levels: 95–100% independent, 90–94% instructional, below 90% frustration. A self-correction ratio of 1:4 or better shows the reader is monitoring meaning.",
    faq: [
      { question: "How do you calculate running record accuracy?", answer: "Subtract errors from total words, divide by total words and multiply by 100." },
      { question: "Do self-corrections count as errors?", answer: "No — they count toward the self-correction ratio, not against accuracy." },
    ],
  },
  {
    slug: "oral-reading-fluency-wcpm-calculator",
    title: "Oral Reading Fluency (WCPM) Calculator",
    category: CAT,
    description: "Calculate words correct per minute (WCPM) from a timed reading and compare it with the 50th percentile oral reading fluency norms for grades 1–6 in fall, winter and spring.",
    metaTitle: "WCPM Calculator — Oral Reading Fluency & Grade Norms",
    metaDescription: "Free oral reading fluency calculator. Calculate WCPM and accuracy and compare with Hasbrouck & Tindal grade-level norms.",
    calcInputs: [
      n("wordsRead", "Total Words Read", V.orf.wordsRead, 500), n("errors", "Errors", V.orf.errors, 200), n("seconds", "Time (Seconds)", V.orf.seconds, 600, true, 1, 1),
      dropdown("grade", "Grade", [1, 2, 3, 4, 5, 6].map((g): [string, number] => [`Grade ${g}`, g]), 3),
      dropdown("season", "Time of Year", [["Fall", 0], ["Winter", 1], ["Spring", 2]], 1),
    ],
    calcResult: { label: "WCPM", format: "number" },
    calcResults: [
      { key: "wcpm", label: "Words Correct per Minute", format: "number", highlight: true },
      { key: "accuracy", label: "Accuracy", format: "percentage" },
      { key: "gradeNorm50th", label: "50th Percentile Norm for Grade & Season", format: "number" },
      { key: "percentOfNorm", label: "Percent of Norm", format: "percentage" },
      { key: "status", label: "Status (3 At/Above, 2 Close, 1 Below)", format: "number" },
    ],
    instructions: "Time a one-minute reading of an unpracticed grade-level passage, count the words read and the errors, and pick the grade and season.",
    examples: `Example: a third grader in winter reads 104 words with 4 errors in a minute — ${X.orf.wcpm} WCPM, ${X.orf.percentOfNorm}% of the ${X.orf.gradeNorm50th} WCPM norm.`,
    assumptions: "WCPM = (words read − errors) ÷ minutes. Norms are the 50th percentile from Hasbrouck & Tindal (2017); within about 10 words of the norm is typical, and students below the 25th percentile may need fluency support. Fluency is one part of reading — check comprehension too.",
    faq: [
      { question: "What is a good WCPM for 3rd grade?", answer: "About 83 in fall, 97 in winter and 112 in spring at the 50th percentile." },
      { question: "How do you calculate WCPM?", answer: "Subtract errors from words read and divide by the minutes read." },
    ],
  },
  {
    slug: "dibels-composite-score-calculator",
    title: "DIBELS Composite Score Calculator",
    category: CAT,
    description: "Combine DIBELS 8 measure scores — letter naming, phonemic segmentation, nonsense word fluency, word reading, oral reading fluency or Maze — against their benchmark goals into a composite index and benchmark status.",
    metaTitle: "DIBELS Composite Score Calculator — Benchmark Status",
    metaDescription: "Free DIBELS composite calculator. Compare DIBELS 8 measure scores with benchmark goals for a composite index and benchmark status.",
    calcInputs: [1, 2, 3, 4, 5].flatMap((i) => [
      n(`score${i}`, `Measure ${i} Score`, (V.dib as Record<string, number>)[`score${i}`], 500, i === 1),
      n(`goal${i}`, `Measure ${i} Benchmark Goal (0 = Skip)`, (V.dib as Record<string, number>)[`goal${i}`], 500, i === 1),
    ]),
    calcResult: { label: "Composite Index", format: "percentage" },
    calcResults: [
      { key: "compositeIndex", label: "Composite Index (Score as % of Benchmark)", format: "percentage", highlight: true },
      { key: "benchmarkStatus", label: "Status (4 Above, 3 At, 2 Below, 1 Well Below)", format: "number" },
      { key: "measuresCounted", label: "Measures Counted", format: "number" },
    ],
    instructions: "Enter each DIBELS measure your grade and season uses (for example LNF, PSF, NWF-CLS, WRF, ORF) with the benchmark goal from your district's DIBELS 8 benchmark table.",
    examples: `Example: 48 on a measure with a 52 goal and 40 on one with a 40 goal average to ${X.dib.compositeIndex}% of benchmark — at benchmark overall.`,
    assumptions: "The official DIBELS 8 composite uses grade- and season-specific weights and cut points from the University of Oregon; this index (average percent of each benchmark goal) is a planning estimate, not the official composite. Use your data system's composite for decisions. Not affiliated with the University of Oregon.",
    faq: [
      { question: "What is a DIBELS composite score?", answer: "A combined score from the DIBELS measures for a grade and season, compared with benchmark goals to show risk for reading difficulty." },
      { question: "What does 'below benchmark' mean?", answer: "The student may need strategic support; 'well below' suggests intensive support." },
    ],
  },
  {
    slug: "brigance-calculator",
    title: "Brigance Calculator",
    category: CAT,
    description: "Calculate a child's exact chronological age (years, months, days and total months) on the screening date for the Brigance Early Childhood Screens, and flag a total score below the cutoff for referral.",
    metaTitle: "Brigance Calculator — Chronological Age for Screening",
    metaDescription: "Free Brigance calculator. Find a child's chronological age on the test date for Brigance screening and check the score against the cutoff.",
    calcInputs: [...birth(2022, 3, 15), ...dateInputs("test", "Screening Date", 2026, 10, 17), n("totalScore", "Total Screening Score (Optional)", V.brig.totalScore, 100, false), n("cutoffScore", "Cutoff Score for the Child's Age (Optional)", V.brig.cutoffScore, 100, false)],
    calcResult: { label: "Age in Months", format: "number" },
    calcResults: [
      { key: "ageInMonths", label: "Chronological Age in Months", format: "number", highlight: true },
      { key: "ageYears", label: "Years", format: "number" },
      { key: "ageMonths", label: "Months", format: "number" },
      { key: "ageDays", label: "Days", format: "number" },
      { key: "belowCutoff", label: "Below Cutoff — Consider Referral? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the child's birth date and the screening date to find the age used to choose the right screen. After scoring, enter the total and the cutoff from the screen's manual.",
    examples: `Example: a child born 15 March 2022 screened on 17 October 2026 is ${X.brig.ageYears} years, ${X.brig.ageMonths} months, ${X.brig.ageDays} days (${X.brig.ageInMonths} months); a 72 against a 68 cutoff doesn't indicate referral.`,
    assumptions: "Chronological age counts completed years, months and days. Cutoffs and age bands come from the Brigance manual for each screen (infant/toddler, three-year-old, four-year-old, kindergarten/first grade); adjust for prematurity under age 2 if the manual directs. Not affiliated with Curriculum Associates.",
    faq: [
      { question: "How do you calculate chronological age for testing?", answer: "Subtract the birth date from the test date in years, months and days, borrowing months and days as needed." },
      { question: "What does a Brigance score below the cutoff mean?", answer: "The child may benefit from a full evaluation; a screen alone doesn't diagnose." },
    ],
  },
  {
    slug: "lexile-level-calculator",
    title: "Lexile Level Calculator",
    category: CAT,
    description: "Estimate the Lexile measure that matches a grade level or a text's Flesch-Kincaid grade, plus the grade band's college-and-career-ready Lexile range, to match readers with books.",
    metaTitle: "Lexile Level Calculator — Grade Level to Lexile",
    metaDescription: "Free Lexile level calculator. Convert a grade level or Flesch-Kincaid level to an estimated Lexile measure and the grade band's range.",
    calcInputs: [numberField("gradeLevel", "Grade Level (Reader or Text, e.g. 5 or 7.4)", { default: V.lex.gradeLevel, max: 13, step: 0.1 })],
    calcResult: { label: "Estimated Lexile", format: "number" },
    calcResults: [
      { key: "estimatedLexile", label: "Estimated Lexile Measure (L)", format: "number", highlight: true },
      { key: "bandLow", label: "Grade Band Range — Low (L)", format: "number" },
      { key: "bandHigh", label: "Grade Band Range — High (L)", format: "number" },
    ],
    instructions: "Enter a student's grade level or a text's readability grade (for example from the Flesch-Kincaid calculator).",
    examples: `Example: grade 5 corresponds to about ${X.lex.estimatedLexile}L, within the grades 4–5 stretch band of ${X.lex.bandLow}L–${X.lex.bandHigh}L.`,
    assumptions: "An independent estimate using typical grade-to-Lexile midpoints and the Common Core 'stretch' bands — not an official Lexile measure. The Lexile Framework is a trademark of MetaMetrics; official measures come from MetaMetrics-certified assessments and the Lexile Find a Book tool.",
    faq: [
      { question: "What Lexile level is 5th grade?", answer: "Roughly 740L–1010L for the grades 4–5 band, with typical 5th-grade readers near 850L." },
      { question: "How do I find a book's Lexile?", answer: "Look it up in the Lexile Find a Book database or the publisher's information." },
    ],
  },
  {
    slug: "flesch-kincaid-grade-level-calculator",
    title: "Flesch-Kincaid Grade Level Calculator",
    category: CAT,
    description: "Calculate a text's Flesch-Kincaid Grade Level and Flesch Reading Ease from its words, sentences and syllables, to check if writing suits your readers.",
    metaTitle: "Flesch-Kincaid Grade Level Calculator — Readability Score",
    metaDescription: "Free Flesch-Kincaid calculator. Get the grade level and Flesch Reading Ease of a text from words, sentences and syllables.",
    calcInputs: [n("words", "Number of Words", V.fk.words, 1000000, true, 1, 1), n("sentences", "Number of Sentences", V.fk.sentences, 100000, true, 1, 1), n("syllables", "Number of Syllables", V.fk.syllables, 3000000, true, 1, 1)],
    calcResult: { label: "Grade Level", format: "number" },
    calcResults: [
      { key: "gradeLevel", label: "Flesch-Kincaid Grade Level", format: "number", highlight: true },
      { key: "readingEase", label: "Flesch Reading Ease (0–100)", format: "number" },
      { key: "wordsPerSentence", label: "Words per Sentence", format: "number" },
      { key: "syllablesPerWord", label: "Syllables per Word", format: "number" },
    ],
    instructions: "Count the words, sentences and syllables in a sample of at least 100 words (word processors show word and sentence counts).",
    examples: `Example: 250 words in 15 sentences with 360 syllables is a grade level of ${X.fk.gradeLevel} and a reading ease of ${X.fk.readingEase} (plain English).`,
    assumptions: "Grade level = 0.39 × (words ÷ sentences) + 11.8 × (syllables ÷ words) − 15.59. Reading Ease = 206.835 − 1.015 × (words ÷ sentences) − 84.6 × (syllables ÷ words); 60–70 is plain English, 30 or less is very difficult. Formulas measure sentence and word length only, not vocabulary or ideas.",
    faq: [
      { question: "What is a good Flesch-Kincaid grade level?", answer: "Around 7–8 for general audiences; many style guides aim for 8th grade or lower." },
      { question: "How is Flesch-Kincaid calculated?", answer: "From average sentence length and average syllables per word." },
    ],
  },
  {
    slug: "tea-accountability-calculator",
    title: "TEA Accountability Calculator",
    category: CAT,
    description: "Estimate a Texas school's or district's TEA A–F accountability rating — the better of Student Achievement and School Progress (70%) plus Closing the Gaps (30%) — and the points to the next letter.",
    metaTitle: "TEA Accountability Calculator — Texas A–F Rating",
    metaDescription: "Free TEA accountability calculator. Estimate a Texas school's A–F rating from Student Achievement, School Progress and Closing the Gaps.",
    calcInputs: [
      n("studentAchievement", "Domain 1: Student Achievement Scaled Score", V.tea.studentAchievement, 100),
      n("academicGrowth", "Domain 2A: Academic Growth Scaled Score", V.tea.academicGrowth, 100),
      n("relativePerformance", "Domain 2B: Relative Performance Scaled Score", V.tea.relativePerformance, 100),
      n("closingTheGaps", "Domain 3: Closing the Gaps Scaled Score", V.tea.closingTheGaps, 100),
    ],
    calcResult: { label: "Overall Score", format: "number" },
    calcResults: [
      { key: "overallScore", label: "Overall Scaled Score", format: "number", highlight: true },
      { key: "rating", label: "Rating (5 = A, 4 = B, 3 = C, 2 = D, 1 = F)", format: "number" },
      { key: "betterOfDomain1And2", label: "Better of Domain 1 and Domain 2", format: "number" },
      { key: "pointsToNextRating", label: "Points to the Next Letter", format: "number" },
    ],
    instructions: "Enter the scaled scores (0–100) for each domain from TXschools.gov or your campus's accountability summary.",
    examples: `Example: Student Achievement 78, Academic Growth 82, Relative Performance 80 and Closing the Gaps 70 give ${X.tea.overallScore} overall — a C, ${X.tea.pointsToNextRating} points from a B.`,
    assumptions: "TEA's overall rating takes the better of Domain 1 and the best of Domain 2A/2B (weighted 70%) plus Domain 3 (30%); A = 90+, B = 80–89, C = 70–79, D = 60–69, F < 60. Rules (including 'Not Rated' provisions and the refreshed cut points) change by year. Not affiliated with the Texas Education Agency.",
    faq: [
      { question: "How are Texas school ratings calculated?", answer: "From three domains — Student Achievement, School Progress and Closing the Gaps — combined into a 0–100 score and an A–F letter." },
      { question: "What score is an A in TEA accountability?", answer: "An overall scaled score of 90 or higher." },
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
