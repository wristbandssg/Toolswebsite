// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// finance expansion 2 sub-batch "workforce". See
// src/lib/calc-engine-fin2-investing.ts for the full list of 9 sub-batches,
// and src/lib/calc-engine-fin2-workforce.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin2-workforce-calculators.ts
// or
//   npm run db:create-fin2-workforce-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];

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
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  category: { name: string; slug: string };
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
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });


// Tool categories follow the 14 Oct 2026 consolidation of the Finance sub-categories
// (see prisma/consolidate-finance-subcategories.ts).
const BUSINESS_CATEGORY = { name: "Business Finance Calculators", slug: "business-calculators" };

const HR_NOTE = "HR benchmarks vary by industry, country and company size — compare against your own history and local rules.";

const TOOLS: ToolDef[] = [
  {
    slug: "absence-percentage-calculator",
    category: BUSINESS_CATEGORY,
    title: "Absence Percentage Calculator",
    description: "Calculate the absence percentage (absenteeism rate) for an employee or team — days lost as a share of working days — and what the absence costs.",
    metaTitle: "Absence Percentage Calculator — Absenteeism Rate",
    metaDescription: "Free absence percentage calculator. Work out the absenteeism rate for one employee or a team from days absent and working days, plus the cost of absence.",
    calcInputs: [numberField("daysAbsent", "Total Days Absent", { default: 45, max: 10000000, step: 0.5 }), numberField("workingDays", "Working Days in the Period (per person)", { default: 250, min: 1, max: 366 }), numberField("employees", "Number of Employees", { default: 10, min: 1, max: 10000000 }), currencyField("dailyPay", "Average Daily Pay (optional)", { default: 0, max: 100000, step: 1, required: false })],
    calcResult: { label: "Absence %", format: "percentage" },
    calcResults: [num("possibleWorkdays", "Possible Workdays"), pct("absencePercentage", "Absence Percentage", true), pct("attendanceRate", "Attendance Rate"), num("daysLostPerEmployee", "Days Lost per Employee"), cur("costOfAbsence", "Pay Cost of Absence")],
    instructions: "Enter the days lost to unplanned absence (sickness, unauthorised leave — not booked holiday), the working days in the period and the headcount.",
    examples: "Example: a 10-person team with 250 working days each and 45 days of absence has an absence rate of 1.8% — 4.5 days lost per employee.",
    assumptions: "Absence % = days absent ÷ (working days × employees) × 100. UK employers average about 2–3% (around 6–8 days a person a year). " + HR_NOTE,
    faq: [
      { question: "Should holidays count as absence?", answer: "No — only unplanned or unauthorised time off. Planned leave is already taken out of working days." },
      { question: "What is a high absence rate?", answer: "Above about 4% usually prompts a closer look at workload, wellbeing or management." },
    ],
  },
  {
    slug: "bradford-factor-calculator",
    category: BUSINESS_CATEGORY,
    title: "Bradford Factor Calculator",
    description: "Calculate an employee's Bradford Factor score from the number of absence spells and total days absent, and see which common trigger point it reaches.",
    metaTitle: "Bradford Factor Calculator — Absence Score & Triggers",
    metaDescription: "Free Bradford Factor calculator. Score absence with S² × D from spells and days off, and see the usual trigger points from informal review to dismissal.",
    calcInputs: [numberField("spells", "Separate Spells of Absence (last 52 weeks)", { default: 4, max: 365 }), numberField("totalDays", "Total Days Absent", { default: 6, max: 366, step: 0.5 })],
    calcResult: { label: "Bradford Score", format: "number" },
    calcResults: [num("bradfordScore", "Bradford Factor Score", true), num("triggerLevel", "Trigger (0 None, 1 Informal, 2 Written, 3 Final, 4 Dismissal review)"), num("sameDaysInOneSpell", "Score if Taken as One Spell")],
    instructions: "Count each separate period of absence as one spell, however long it lasted, over a rolling 52 weeks. The Bradford Factor gives frequent short absences more weight than one long absence.",
    examples: "Example: 4 separate absences totalling 6 days score 4² × 6 = 96 — enough for an informal conversation under common triggers. The same 6 days taken in one spell would score just 6.",
    assumptions: "Bradford Factor = S² × D. Trigger points differ between employers; 51 / 201 / 401 / 651 are common UK examples. Absences linked to disability, pregnancy or protected reasons should be excluded or treated with care under equality law. " + HR_NOTE,
    faq: [
      { question: "Why does the Bradford Factor square the spells?", answer: "Frequent short absences are more disruptive than one long one, so the number of spells is weighted heavily." },
      { question: "Is the Bradford Factor fair?", answer: "It's a prompt for a conversation, not an automatic sanction — employers should look at the reasons behind absence." },
    ],
  },
  {
    slug: "turnover-rate-calculator",
    category: BUSINESS_CATEGORY,
    title: "Turnover Rate Calculator",
    description: "Calculate employee turnover rate and attrition rate from headcount and separations, the annualised rate, voluntary turnover and the cost of replacing leavers.",
    metaTitle: "Employee Turnover Rate Calculator — Attrition & Cost",
    metaDescription: "Free employee turnover and attrition rate calculator. Get turnover from separations and average headcount, annualise it and estimate replacement cost.",
    calcInputs: [numberField("employeesStart", "Employees at Start", { default: 200, max: 10000000 }), numberField("employeesEnd", "Employees at End", { default: 210, max: 10000000 }), numberField("separations", "Employees Who Left", { default: 24, max: 10000000 }), numberField("notReplaced", "Leavers Not Replaced (for attrition)", { default: 6, max: 10000000, required: false }), numberField("voluntarySeparations", "Voluntary Leavers (resigned)", { default: 0, max: 10000000, required: false }), numberField("periodMonths", "Period Length (months)", { default: 12, min: 1, max: 120 }), currencyField("averageSalary", "Average Salary (optional)", { default: 0, max: 100000000, step: 100, required: false }), percentField("replacementCostPct", "Replacement Cost (% of salary)", { default: 33, max: 300, step: 1, required: false })],
    calcResult: { label: "Turnover Rate", format: "percentage" },
    calcResults: [num("averageHeadcount", "Average Headcount"), pct("turnoverRate", "Turnover Rate (period)", true), pct("annualizedTurnover", "Annualised Turnover"), pct("attritionRate", "Attrition Rate"), pct("voluntaryTurnover", "Voluntary Turnover"), cur("replacementCost", "Estimated Replacement Cost")],
    instructions: "Enter headcount at the start and end of the period and how many people left. Attrition counts only roles left unfilled; turnover counts every leaver, replaced or not.",
    examples: "Example: average headcount of 205 and 24 leavers is 11.71% turnover for the year. 6 roles weren't refilled, so attrition is 2.93%.",
    assumptions: "Turnover = separations ÷ average headcount; annualised by 12 ÷ months. Replacement cost often runs 33% of salary (Work Institute) and much more for senior roles. " + HR_NOTE,
    faq: [
      { question: "What's the difference between turnover and attrition?", answer: "Turnover counts every leaver; attrition counts leavers whose roles you don't refill, so headcount shrinks." },
      { question: "What is a normal turnover rate?", answer: "US private-sector turnover is often 40% a year or more including hourly jobs; around 10–15% is typical for professional roles." },
    ],
  },
  {
    slug: "fte-calculator",
    category: BUSINESS_CATEGORY,
    title: "FTE Calculator",
    description: "Calculate full-time equivalents (FTE) from full-time and part-time staff, and your ACA full-time employee count to check applicable large employer status.",
    metaTitle: "FTE Calculator — Full-Time Equivalent & ACA Count",
    metaDescription: "Free FTE calculator. Convert part-time hours to full-time equivalents and count full-time employees under the ACA to see if you're an ALE (50+).",
    calcInputs: [numberField("fullTimeEmployees", "Full-Time Employees", { default: 40, max: 10000000 }), numberField("fullTimeHours", "Full-Time Hours per Week", { default: 40, min: 1, max: 80 }), numberField("partTimeEmployees", "Part-Time Employees", { default: 20, max: 10000000 }), numberField("partTimeHours", "Average Part-Time Hours per Week", { default: 20, max: 80, step: 0.5 })],
    calcResult: { label: "FTE", format: "number" },
    calcResults: [num("totalWeeklyHours", "Total Hours per Week"), num("fte", "Full-Time Equivalents (FTE)", true), num("partTimeFte", "FTE from Part-Timers"), num("acaEmployeeCount", "ACA Full-Time Employee Count"), num("acaLargeEmployer", "ACA Applicable Large Employer (1 = yes)")],
    instructions: "Enter your full-time staff and standard week, then part-time staff and their average weekly hours. FTE is used for budgeting, staffing ratios and grant or loan applications.",
    examples: "Example: 40 full-timers on 40 hours plus 20 part-timers on 20 hours is 50 FTE. For the ACA, part-time hours (about 1,733 a month) ÷ 120 add 14.44, so the count is 54.44 — an applicable large employer.",
    assumptions: "FTE = total hours ÷ full-time hours. ACA: employees averaging 30+ hours a week are full-time; part-time hours per month ÷ 120 give full-time equivalents; 50+ (fractions dropped) makes an applicable large employer. " + HR_NOTE,
    faq: [
      { question: "Is 32 hours full-time?", answer: "For the ACA, 30 hours a week or more counts as full-time; many employers define full-time as 35–40 hours." },
      { question: "What does 0.5 FTE mean?", answer: "Half of a full-time workload — 20 hours in a 40-hour week." },
    ],
  },
  {
    slug: "man-hours-calculator",
    category: BUSINESS_CATEGORY,
    title: "Man-Hours Calculator",
    description: "Calculate man-hours (labor hours) for a crew, the labor cost, and how many days or workers a job needs.",
    metaTitle: "Man-Hours Calculator — Labor Hours, Cost & Crew Size",
    metaDescription: "Free man-hours calculator. Multiply workers × hours × days, price the labor, and see how long a job takes or how many workers you need.",
    calcInputs: [numberField("workers", "Number of Workers", { default: 5, max: 1000000 }), numberField("hoursPerDay", "Hours per Day", { default: 8, max: 24, step: 0.5 }), numberField("days", "Number of Days", { default: 10, max: 10000, step: 0.5 }), currencyField("hourlyCost", "Labor Cost per Hour", { default: 30, max: 100000, step: 0.5, required: false }), numberField("taskManHours", "Man-Hours a Job Needs (optional)", { default: 0, max: 100000000, required: false })],
    calcResult: { label: "Man-Hours", format: "number" },
    calcResults: [num("manHours", "Man-Hours", true), num("manDays", "Man-Days"), cur("laborCost", "Labor Cost"), num("daysToFinishTask", "Days to Finish the Job with This Crew"), num("workersForTaskInDays", "Workers Needed to Finish in Those Days")],
    instructions: "Enter crew size, hours worked per day and days on the job. If you know the man-hours a job needs (from an estimate), enter it to see how long this crew takes or how many workers you'd need to finish in the days entered.",
    examples: "Example: 5 workers × 8 hours × 10 days = 400 man-hours (50 man-days), costing $12,000 at $30 an hour. A 600-man-hour job would take this crew 15 days, or 8 workers to finish in 10 days.",
    assumptions: "Assumes every worker is equally productive and adding people scales linearly — in practice coordination overhead means it doesn't quite (Brooks's law).",
    faq: [
      { question: "What is a man-hour?", answer: "One person working for one hour — also called a labor hour or person-hour." },
      { question: "How many man-hours in a work year?", answer: "About 2,080 for a 40-hour week, or roughly 1,800–1,900 after holidays and leave." },
    ],
  },
  {
    slug: "days-off-calculator",
    category: BUSINESS_CATEGORY,
    title: "Days Off Calculator",
    description: "Calculate how many days off you get in a year — weekends, public holidays, vacation and sick days — and how many days you actually work.",
    metaTitle: "Days Off Calculator — Working Days & Days Off per Year",
    metaDescription: "Free days off calculator. Count weekends for any year, add holidays, PTO and sick days, and see your working days and the share of the year you're off.",
    calcInputs: [numberField("year", "Year", { default: 2026, min: 1900, max: 2200 }), dropdown("weekendType", "Weekly Days Off", [["2 (Saturday & Sunday)", 1], ["1 (Sunday only)", 2]], 1), numberField("holidays", "Public Holidays on Workdays", { default: 11, max: 60 }), numberField("ptoDays", "Vacation / PTO Days", { default: 15, max: 100 }), numberField("sickDays", "Sick Days", { default: 5, max: 100, required: false })],
    calcResult: { label: "Total Days Off", format: "number" },
    calcResults: [num("daysInYear", "Days in the Year"), num("weekendDays", "Weekend Days"), num("workingDaysBeforeLeave", "Working Days (before leave)"), num("daysActuallyWorked", "Days Actually Worked"), num("totalDaysOff", "Total Days Off", true), pct("percentOfYearOff", "Share of the Year Off")],
    instructions: "Pick the year so weekends are counted from the real calendar, then enter holidays that fall on workdays (US federal: 11), your paid time off and sick days.",
    examples: "Example: 2026 has 104 Saturdays and Sundays. With 11 holidays, 15 PTO days and 5 sick days, there are 250 working days, you work 230 of them and have 135 days off — 37% of the year.",
    assumptions: "Holidays falling on a weekend are assumed to be moved to a weekday or not counted; enter the number that actually lands on your workdays.",
    faq: [
      { question: "How many working days are in a year?", answer: "Usually 250–252 in the US after weekends and federal holidays." },
      { question: "How many vacation days are normal?", answer: "US private employers average about 10–15 days after a few years; the EU minimum is 20 days." },
    ],
  },
  {
    slug: "tenure-calculator",
    category: BUSINESS_CATEGORY,
    title: "Tenure Calculator",
    description: "Calculate an employee's length of service (tenure) in years and months between two dates, and your team's average tenure.",
    metaTitle: "Tenure Calculator — Length of Service & Average Tenure",
    metaDescription: "Free tenure calculator. Work out years and months of service between a start and end date, and the average employee tenure for a team.",
    calcInputs: [numberField("startYear", "Start Year", { default: 2019, min: 1900, max: 2200 }), numberField("startMonth", "Start Month (1–12)", { default: 3, min: 1, max: 12 }), numberField("endYear", "End Year (or this year)", { default: 2026, min: 1900, max: 2200 }), numberField("endMonth", "End Month (1–12)", { default: 10, min: 1, max: 12 }), numberField("teamTotalYears", "Team — Total Years of Service (optional)", { default: 0, max: 10000000, step: 0.1, required: false }), numberField("teamHeadcount", "Team — Headcount (optional)", { default: 0, max: 1000000, required: false })],
    calcResult: { label: "Tenure (years)", format: "number" },
    calcResults: [num("tenureYears", "Years"), num("tenureMonthsExtra", "Plus Months"), num("tenureInMonths", "Tenure in Months"), num("tenureDecimalYears", "Tenure in Years (decimal)", true), num("averageTeamTenure", "Average Team Tenure (years)")],
    instructions: "Enter the month and year the person started and the month and year to measure to. For a team average, add up everyone's years of service and divide by headcount.",
    examples: "Example: from March 2019 to October 2026 is 7 years and 7 months — 91 months or 7.58 years.",
    assumptions: "Counts whole calendar months from the start month to the end month. Median US employee tenure is about 3.9 years (BLS, 2024). " + HR_NOTE,
    faq: [
      { question: "Why does tenure matter?", answer: "It affects severance, vesting, seniority and benefits — and average tenure is a key retention metric." },
      { question: "Does unpaid leave count toward tenure?", answer: "It depends on your employer's policy and local law; many count protected leave such as parental leave." },
    ],
  },
  {
    slug: "smokers-ctc-calculator",
    category: BUSINESS_CATEGORY,
    title: "Smoker's CTC Calculator",
    description: "Estimate the extra cost to company (CTC) of employees who smoke — time lost to smoke breaks, absence, lower productivity and higher health-care costs.",
    metaTitle: "Smoker's Cost to Company Calculator — Employer Cost",
    metaDescription: "Free smoker's CTC calculator. Estimate what smoking employees cost a business each year in smoke breaks, absence, presenteeism and health care.",
    calcInputs: [numberField("smokers", "Employees Who Smoke", { default: 10, max: 1000000 }), numberField("breaksPerDay", "Smoke Breaks per Day", { default: 4, max: 30 }), numberField("minutesPerBreak", "Minutes per Break", { default: 10, max: 60 }), currencyField("hourlyCost", "Hourly Labor Cost", { default: 30, max: 10000, step: 0.5 }), numberField("workdays", "Workdays per Year", { default: 230, max: 366 }), currencyField("excessHealthCost", "Extra Health Care per Smoker per Year", { default: 2056, max: 100000, step: 1, required: false }), currencyField("excessAbsenceCost", "Extra Absence Cost per Smoker", { default: 517, max: 100000, step: 1, required: false }), currencyField("presenteeismCost", "Lost Productivity (presenteeism)", { default: 462, max: 100000, step: 1, required: false })],
    calcResult: { label: "Total Yearly Cost", format: "currency" },
    calcResults: [num("hoursLostPerSmoker", "Hours Lost to Breaks per Smoker"), cur("breakCostPerSmoker", "Break Cost per Smoker"), cur("totalCostPerSmoker", "Total Extra Cost per Smoker", true), cur("totalCostAllSmokers", "Total Extra Cost — All Smokers"), cur("monthlyCostAllSmokers", "Per Month")],
    instructions: "Enter how many employees smoke, their typical breaks and your loaded hourly labor cost. The health, absence and presenteeism defaults come from a 2014 Ohio State University study of US private employers — adjust them to your own data.",
    examples: "Example: 10 smokers taking four 10-minute breaks on 230 workdays lose 153 hours each — $4,600 at $30 an hour. With the study's other costs that's $7,635 per smoker, or $76,350 a year.",
    assumptions: "Berman et al. (Tobacco Control, 2014) estimated about $5,816 extra per smoker a year, including $3,077 for breaks (excluded here because breaks are calculated from your inputs) and a $296 pension offset (ignored). Figures are 2014 US dollars. Workplace smoking policies must follow local employment law.",
    faq: [
      { question: "Are smoke breaks legally required?", answer: "Not in most US states; breaks are set by employer policy and state law, and non-smokers may get equal breaks." },
      { question: "Do smoking cessation programs pay off?", answer: "Often yes — studies show savings within a few years from lower health costs and absence." },
    ],
  },
  {
    slug: "burndown-chart-calculator",
    category: BUSINESS_CATEGORY,
    title: "Burndown Chart Calculator",
    description: "Calculate where your sprint stands on a burndown chart — ideal vs actual remaining work, whether you're ahead or behind, the velocity needed and the projected finish day.",
    metaTitle: "Burndown Chart Calculator — Sprint Progress & Velocity",
    metaDescription: "Free burndown chart calculator. Compare ideal and actual remaining story points, see if the sprint is on track and the daily velocity needed to finish.",
    calcInputs: [numberField("totalPoints", "Total Story Points (or hours) in Sprint", { default: 80, min: 1, max: 100000 }), numberField("sprintDays", "Sprint Length (working days)", { default: 10, min: 1, max: 365 }), numberField("daysElapsed", "Days Elapsed", { default: 6, max: 365 }), numberField("pointsCompleted", "Points Completed So Far", { default: 40, max: 100000 })],
    calcResult: { label: "Ahead (+) / Behind (−)", format: "number" },
    calcResults: [num("idealRemaining", "Ideal Remaining"), num("actualRemaining", "Actual Remaining"), num("aheadBehind", "Ahead (+) / Behind (−) in Points", true), num("currentVelocityPerDay", "Current Velocity per Day"), num("requiredVelocityPerDay", "Velocity Needed per Day"), num("projectedFinishDay", "Projected Finish Day at This Pace")],
    instructions: "Enter the sprint's total work, its length in working days, how many days have passed and how much is done. The ideal line falls evenly from the total to zero by the last day.",
    examples: "Example: 80 points over 10 days, 6 days in with 40 done. The ideal line says 32 should remain, but 40 do — 8 points behind. You need 10 points a day to finish, against 6.67 so far; at this pace you'd finish on day 12.",
    assumptions: "A straight-line ideal burndown with work completed at an even rate. Scope added mid-sprint should be added to the total.",
    faq: [
      { question: "What does a flat burndown line mean?", answer: "Work isn't being completed (or isn't being updated) — often a sign of blockers or stories that are too large." },
      { question: "Burndown or burnup chart?", answer: "A burnup chart shows completed work and total scope separately, so scope changes are easier to see." },
    ],
  },
];

// Every sub-category here hangs directly under Finance Calculators and is
// created on first use.
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) throw new Error(`The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first.`);
  console.log(`Creating sub-category "${cat.name}" under "${finance.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const category = await ensureCategory(def.category);
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
