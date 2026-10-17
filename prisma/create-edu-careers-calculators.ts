// One-time (but safe to re-run) batch setup script: creates 16 salary and career tools from the
// user's jobs & education list (Jobs & Education Calculators > Salary, Income & Career
// Calculators — the moved Salary & Income sub-category). "Market Salary" is merged into
// am-i-underpaid. Brand-name keywords (Indeed, Glassdoor, Payscale, Robert Half, OMNI, GitLab)
// were dropped; Salary Difference, Hourly to Annual, Contractor to Full-Time and Freelance
// Hourly Rate already exist. Examples are computed from src/lib/calc-engine-edu-careers.ts.
//
// HOW TO RUN (after prisma/setup-jobs-education-category.ts --apply)
//   npx tsx prisma/create-edu-careers-calculators.ts
// or
//   npm run db:create-edu-careers-calculators

import * as E from "../src/lib/calc-engine-edu-careers";
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

const CAT = "salary-income-calculators";
const run = (fn: E.CustomCalculator, values: Record<string, number>) => fn(values) as Record<string, number>;
const n = (key: string, label: string, def: number, max: number, required = true, step = 1, min = 0) => numberField(key, label, { default: def, max, required, step, min });
const money = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;
const LOCATION = () => percentField("locationIndex", "Local Pay Level (100 = US Average)", { default: 100, min: 60, max: 200, step: 5 });

/** [slug, title, description intro, assumptions notes, faq answers]. */
const JOB_COPY: Record<string, { title: string; who: string; data: string; faqQ: string; faqA: string }> = {
  "nurse-salary-calculator": { title: "Nurse Salary Calculator", who: "registered nurses, LPNs, travel nurses, nurse practitioners and CRNAs", data: "BLS May 2024 median for registered nurses ($93,600); other roles scaled from BLS medians (LPN ≈ $62,000, NP ≈ $129,000, CRNA ≈ $214,000). Hospital shift differentials and overtime come on top.", faqQ: "How much do nurses make?", faqA: "Registered nurses earn a median of about $93,600 a year in the US; California, Hawaii and Oregon pay the most." },
  "teacher-salary-calculator": { title: "Teacher Salary Calculator", who: "elementary, middle, high school, special education, preschool and private school teachers", data: "Based on BLS May 2024 medians for K–12 teachers (about $63,000–$66,000); public schools pay by district salary schedule (steps for years, columns for degrees and credits).", faqQ: "How much do teachers make?", faqA: "K–12 public school teachers earn a median of about $65,000 a year; New York, California and Massachusetts pay the most." },
  "doctor-salary-calculator": { title: "Doctor Salary Calculator", who: "physicians by specialty, from family medicine and pediatrics to cardiology and orthopedic surgery", data: "Base figure reflects recent physician compensation surveys (primary care ≈ $270,000–$290,000; specialists often $400,000–$560,000); residents earn about $65,000–$75,000 instead. Private practice, call pay and productivity bonuses vary.", faqQ: "How much do doctors make?", faqA: "US physicians typically earn $250,000–$300,000 in primary care and $400,000+ in many specialties." },
  "ceo-salary-calculator": { title: "CEO Salary Calculator", who: "chief executives by company size, from small businesses to large enterprises and nonprofits", data: "BLS May 2024 median for chief executives (about $206,700) scaled by company size; large public companies pay far more, mostly in stock and bonuses (S&P 500 CEO pay averages over $15 million).", faqQ: "How much do CEOs make?", faqA: "The median US chief executive earns about $207,000 in salary; pay rises steeply with company size." },
  "social-media-manager-salary-calculator": { title: "Social Media Manager Salary Calculator", who: "social media coordinators, managers, senior managers and heads of social, plus freelancers", data: "Base reflects recent US salary surveys for social media managers (about $60,000–$75,000); agency, in-house and industry differences are large, and paid-media skills earn a premium.", faqQ: "How much does a social media manager make?", faqA: "Typically $55,000–$80,000 a year in the US, more at senior levels or in large companies." },
  "aapc-medical-coding-salary-calculator": { title: "AAPC Medical Coding Salary Calculator", who: "medical coders — outpatient, inpatient, risk adjustment, auditing and management — with or without AAPC certification", data: "BLS May 2024 median for medical records specialists ($50,250); certified coders typically earn notably more, as AAPC's annual salary survey reports. Not affiliated with AAPC.", faqQ: "How much do certified medical coders make?", faqA: "Certified coders often earn about $55,000–$65,000, with auditors and managers higher." },
  "asce-salary-calculator": { title: "ASCE Salary Calculator", who: "civil engineers — structural, transportation, geotechnical, water resources and construction — with or without a PE license", data: "BLS May 2024 median for civil engineers ($99,590); a PE license typically adds about 10–15%, in line with the ASCE salary survey. Not affiliated with ASCE.", faqQ: "How much do civil engineers make?", faqA: "About $100,000 median in the US, with licensed PEs and structural engineers earning more." },
};

function jobTool(slug: string): ToolDef {
  const job = E.JOB_SALARIES[slug];
  const c = JOB_COPY[slug];
  const defaultRole = job.options.reduce((best, [, m], i) => (Math.abs(m - 1) < Math.abs(job.options[best][1] - 1) ? i : best), 0);
  const ex = run(E.jobSalary(job), { role: defaultRole, yearsExperience: 8, locationIndex: 100, credential: 1 });
  return {
    slug,
    title: c.title,
    category: CAT,
    description: `Estimate ${job.name} pay — for ${c.who} — from experience, location and credentials, with a typical range, monthly pay and hourly equivalent.`,
    metaTitle: `${c.title} — Estimate Your Pay`.slice(0, 70),
    metaDescription: `Free ${c.title.toLowerCase()}. Estimate ${job.name} salary by role, experience, location and credentials, with a typical range and hourly pay.`,
    calcInputs: [
      dropdown("role", job.optionLabel, job.options.map(([l], i): [string, number] => [l, i]), defaultRole),
      n("yearsExperience", "Years of Experience", 8, 45, true, 0.5),
      LOCATION(),
      YN("credential", job.credentialLabel, 1),
    ],
    calcResult: { label: "Estimated Salary", format: "currency" },
    calcResults: [
      { key: "estimatedSalary", label: "Estimated Yearly Salary", format: "currency", highlight: true },
      { key: "typicalLow", label: "Typical Range — Low", format: "currency" },
      { key: "typicalHigh", label: "Typical Range — High", format: "currency" },
      { key: "monthlyPay", label: "Monthly Gross Pay", format: "currency" },
      { key: "hourlyEquivalent", label: "Hourly Equivalent", format: "currency" },
    ],
    instructions: "Pick the role, enter your years of experience and how local pay compares with the US average (big coastal metros are often 115–140, rural areas 80–95), and whether you hold the credential.",
    examples: `Example: a ${job.options[defaultRole][0].toLowerCase()} with 8 years of experience and the credential, in an average-pay area, can expect about ${money(ex.estimatedSalary)} (typically ${money(ex.typicalLow)}–${money(ex.typicalHigh)}), or ${money(ex.hourlyEquivalent)} an hour.`,
    assumptions: `${c.data} Experience moves pay from about 80% of the median at entry to 130% after 20 years. Estimates are before tax and benefits.`,
    faq: [
      { question: c.faqQ, answer: c.faqA },
      { question: `How can a ${job.name} earn more?`, answer: `Gain experience and the credential, move into a higher-paying role or specialty, or work in a higher-paying region.` },
    ],
  };
}

const V = {
  range: { midpoint: 85000, rangeSpread: 40, currentSalary: 78000 },
  under: { marketMedian: 80000, yearsExperience: 6, locationIndex: 110, credentialPremium: 0, companySize: 1, currentSalary: 72000 },
  yoe: { start1Year: 2016, start1Month: 6, end1Year: 2019, end1Month: 8, load1: 100, start2Year: 2019, start2Month: 9, end2Year: 0, end2Month: 0, load2: 100, start3Year: 2014, start3Month: 1, end3Year: 2016, end3Month: 5, load3: 50, start4Year: 0, start4Month: 1, end4Year: 0, end4Month: 0, load4: 100, start5Year: 0, start5Month: 1, end5Year: 0, end5Month: 0, load5: 100, currentYear: 2026, currentMonth: 10 },
  uft: { column: 2, yearsExperience: 7, perSessionHours: 60, perSessionRate: 58 },
  lausd: { column: 2, yearsExperience: 10, stipends: 1500 },
  nanny: { baseRate: 22, children: 2, extraPerChild: 2, housekeeping: 1, tutoring: 0, yearsExperience: 5, locationIndex: 100, hoursPerWeek: 45, liveIn: 0, unemploymentTaxRate: 3 },
  ai: { routineDigitalWork: 50, physicalWork: 5, peopleWork: 20, creativeStrategicWork: 25, licensedOrAccountable: 0, aiSkillLevel: 2 },
  career: { startingSalary: 55000, annualRaise: 3, promotionEveryYears: 6, promotionRaise: 8, careerYears: 35, retirementContribution: 6, employerMatch: 4, investmentReturn: 6 },
  ats: { jobKeywords: 25, keywordsMatched: 17, requiredSkills: 6, requiredMatched: 5, yearsRequired: 5, yourYears: 4, educationMatch: 1, formattingIssues: 1 },
};
const X = {
  range: run(E.salaryRange, V.range), under: run(E.amIUnderpaid, V.under), yoe: run(E.yearsOfExperience, V.yoe), uft: run(E.uftSalary, V.uft), lausd: run(E.lausdSalary, V.lausd),
  nanny: run(E.nannyRate, V.nanny), ai: run(E.willAiTakeMyJob, V.ai), career: run(E.careerEarnings, V.career), ats: run(E.atsScore, V.ats),
};

const TOOLS: ToolDef[] = [
  {
    slug: "salary-range-calculator",
    title: "Salary Range Calculator",
    category: CAT,
    description: "Build a salary range from its midpoint and range spread — minimum, midpoint and maximum — and see where a salary sits with its compa-ratio and range penetration.",
    metaTitle: "Salary Range Calculator — Min, Midpoint, Max & Compa-Ratio",
    metaDescription: "Free salary range calculator. Get the minimum, midpoint and maximum of a pay range and a salary's compa-ratio and range penetration.",
    calcInputs: [currencyField("midpoint", "Range Midpoint (Market Rate)", { default: 85000, max: 2000000, step: 500 }), percentField("rangeSpread", "Range Spread (Max ÷ Min − 1)", { default: 40, max: 200, step: 5 }), currencyField("currentSalary", "Salary to Compare (Optional)", { default: 78000, max: 2000000, step: 500, required: false })],
    calcResult: { label: "Range", format: "currency" },
    calcResults: [
      { key: "rangeMinimum", label: "Range Minimum", format: "currency", highlight: true },
      { key: "rangeMidpoint", label: "Range Midpoint", format: "currency" },
      { key: "rangeMaximum", label: "Range Maximum", format: "currency", highlight: true },
      { key: "compaRatio", label: "Compa-Ratio (Salary ÷ Midpoint)", format: "percentage" },
      { key: "rangePenetration", label: "Range Penetration", format: "percentage" },
    ],
    instructions: "Enter the midpoint (usually the market rate for the role) and the range spread — about 30–40% for professional roles, 50%+ for senior roles. Add a salary to see where it falls.",
    examples: `Example: an $85,000 midpoint with a 40% spread runs from ${money(X.range.rangeMinimum)} to ${money(X.range.rangeMaximum)}. A $78,000 salary has a ${X.range.compaRatio}% compa-ratio and sits ${X.range.rangePenetration}% into the range.`,
    assumptions: "Minimum = midpoint ÷ (1 + spread ÷ 2); maximum = minimum × (1 + spread). Many US states and cities now require salary ranges in job postings.",
    faq: [
      { question: "What is a compa-ratio?", answer: "Salary divided by the range midpoint — 100% means paid at the market rate." },
      { question: "What is a typical salary range spread?", answer: "About 30–40% for professional jobs and 50–60% for executive roles." },
    ],
  },
  {
    slug: "am-i-underpaid-calculator",
    title: "Am I Underpaid Calculator",
    category: CAT,
    description: "Find out if you're underpaid — your market salary for the role adjusted for experience, location, credentials and company size, the pay gap and your estimated percentile. Works as a market salary calculator.",
    metaTitle: "Am I Underpaid Calculator — Market Salary Check",
    metaDescription: "Free am I underpaid calculator. Compare your pay with the market salary for your role, experience and location, and see the gap.",
    calcInputs: [
      currencyField("marketMedian", "Market Median for Your Role (e.g. BLS or Salary Surveys)", { default: 80000, max: 2000000, step: 500 }),
      n("yearsExperience", "Years of Experience", V.under.yearsExperience, 45, true, 0.5), LOCATION(),
      percentField("credentialPremium", "Premium for Degrees / Certifications", { default: 0, max: 50, step: 1, required: false }),
      dropdown("companySize", "Employer Size", [["Small", 0], ["Mid-Size", 1], ["Large", 2]], 1),
      currencyField("currentSalary", "Your Current Salary", { default: 72000, max: 2000000, step: 500 }),
    ],
    calcResult: { label: "Market Salary", format: "currency" },
    calcResults: [
      { key: "marketSalary", label: "Your Market Salary", format: "currency", highlight: true },
      { key: "payGap", label: "Pay Gap (+ = Underpaid)", format: "currency" },
      { key: "payGapPercent", label: "Gap as % of Market", format: "percentage" },
      { key: "yourPercentile", label: "Your Estimated Pay Percentile", format: "number" },
      { key: "underpaid", label: "More Than 10% Below Market? (1 = Yes)", format: "number" },
    ],
    instructions: "Find the median pay for your job title (BLS Occupational Employment data, salary surveys or posted ranges), then enter your experience, local pay level, credentials, employer size and your salary.",
    examples: `Example: with an $80,000 market median, 6 years of experience in a 110 pay-level area, the market rate is about ${money(X.under.marketSalary)}; at $72,000 you're about ${X.under.payGapPercent}% below — roughly the ${Math.round(X.under.yourPercentile)}th percentile.`,
    assumptions: "Experience moves pay from 80% of the median at entry to about 130% after 20 years; percentiles assume a typical spread of pay within an occupation. Bonuses, equity and benefits matter too. Use the gap to research and negotiate, with posted ranges for similar jobs as evidence.",
    faq: [
      { question: "How do I know if I'm underpaid?", answer: "Compare your pay with the market median for your role, adjusted for experience and location; more than 10% below is worth raising." },
      { question: "How do I ask for a raise?", answer: "Bring market data, your results and a specific number, and time it before budget decisions or after a big win." },
    ],
  },
  {
    slug: "years-of-experience-calculator",
    title: "Years of Experience Calculator",
    category: CAT,
    description: "Add up your total years and months of work experience across up to five jobs — with part-time jobs counted at their share of full time — for résumés, job applications and pay scales.",
    metaTitle: "Years of Experience Calculator — Total Work Experience",
    metaDescription: "Free years of experience calculator. Add up work experience across jobs in years and months, with part-time jobs as full-time equivalent.",
    calcInputs: [
      ...[1, 2, 3, 4, 5].flatMap((i) => [
        n(`start${i}Year`, `Job ${i}: Start Year (0 = Skip)`, (V.yoe as Record<string, number>)[`start${i}Year`], 2100, i === 1),
        n(`start${i}Month`, `Job ${i}: Start Month`, (V.yoe as Record<string, number>)[`start${i}Month`], 12, false, 1, 1),
        n(`end${i}Year`, `Job ${i}: End Year (0 = Current Job)`, (V.yoe as Record<string, number>)[`end${i}Year`], 2100, false),
        n(`end${i}Month`, `Job ${i}: End Month`, (V.yoe as Record<string, number>)[`end${i}Month`], 12, false),
        percentField(`load${i}`, `Job ${i}: Share of Full Time`, { default: (V.yoe as Record<string, number>)[`load${i}`], max: 100, step: 5, required: false }),
      ]),
      n("currentYear", "Today — Year", V.yoe.currentYear, 2100, true, 1, 2000), n("currentMonth", "Today — Month", V.yoe.currentMonth, 12, true, 1, 1),
    ],
    calcResult: { label: "Total Years", format: "number" },
    calcResults: [
      { key: "decimalYears", label: "Total Experience (Years)", format: "number", highlight: true },
      { key: "totalYears", label: "Whole Years", format: "number" },
      { key: "extraMonths", label: "Plus Months", format: "number" },
      { key: "fullTimeEquivalentYears", label: "Full-Time Equivalent Years", format: "number" },
    ],
    instructions: "Enter the start and end month and year of each job (leave the end year at 0 for your current job), and the share of full time for part-time work. Don't enter overlapping jobs twice.",
    examples: `Example: a part-time job (50%) from 2014–2016, a full-time job from June 2016 to August 2019 and a current job since September 2019 add up to ${X.yoe.decimalYears} years — ${X.yoe.fullTimeEquivalentYears} full-time-equivalent years.`,
    assumptions: "Each job counts from its start month through its end month. Overlapping jobs are added together, so enter concurrent jobs only if an employer counts both. Some employers and salary schedules count internships, military service or part-time work differently.",
    faq: [
      { question: "How do I calculate years of experience?", answer: "Add the months worked in each job and divide by 12; part-time work is often counted at its share of full time." },
      { question: "Does part-time work count as experience?", answer: "Usually yes — many employers count it at its full-time equivalent." },
    ],
  },
  ...Object.keys(E.JOB_SALARIES).map(jobTool),
  {
    slug: "uft-salary-calculator",
    title: "UFT Salary Calculator",
    category: CAT,
    description: "Estimate a New York City public school teacher's salary on the UFT/DOE schedule — by years of service and salary differential (BA, BA+30, MA, MA+30) — plus per-session pay and the gap to the top of the schedule.",
    metaTitle: "UFT Salary Calculator — NYC Teacher Salary Schedule",
    metaDescription: "Free UFT salary calculator. Estimate NYC teacher pay by years and differential (BA, MA, MA+30), with per-session pay.",
    calcInputs: [
      dropdown("column", "Salary Differential", [["BA", 0], ["BA + 30 / C1 + PD", 1], ["MA", 2], ["MA + 30", 3]], 2),
      n("yearsExperience", "Years of Service", V.uft.yearsExperience, 40, true, 0.5),
      n("perSessionHours", "Per-Session Hours per Year", V.uft.perSessionHours, 2000, false),
      currencyField("perSessionRate", "Per-Session Hourly Rate", { default: 58, max: 200, step: 0.5, required: false }),
    ],
    calcResult: { label: "Base Salary", format: "currency" },
    calcResults: [
      { key: "baseSalary", label: "Estimated Base Salary", format: "currency", highlight: true },
      { key: "withPerSession", label: "With Per-Session Pay", format: "currency" },
      { key: "monthlyGross", label: "Monthly Gross", format: "currency" },
      { key: "perSessionPay", label: "Per-Session Pay", format: "currency" },
      { key: "toTopOfSchedule", label: "Increase Still Ahead to Top of Schedule", format: "currency" },
    ],
    instructions: "Pick your salary differential and enter your years of service. Add per-session (after-school) hours and the current per-session rate if you work them.",
    examples: `Example: an MA teacher with 7 years of service earns about ${money(X.uft.baseSalary)}, or ${money(X.uft.withPerSession)} with 60 per-session hours.`,
    assumptions: "An approximation of the 2023–2027 UFT contract schedule (starting around $66,500 BA to about $151,000 at the top of MA+30 after 22 years, with longevity steps) — the real schedule moves in steps, not a smooth curve. Check the UFT's published salary schedule for your exact step. Not affiliated with the UFT or NYC DOE.",
    faq: [
      { question: "How much do NYC teachers make?", answer: "Roughly $66,000–$75,000 to start, rising to about $150,000 at the top of the schedule with a master's plus 30 credits." },
      { question: "How do UFT salary differentials work?", answer: "Extra credits and degrees move you to a higher-paying column — BA+30, MA, MA+30 — on top of yearly steps." },
    ],
  },
  {
    slug: "lausd-salary-calculator",
    title: "LAUSD Salary Calculator",
    category: CAT,
    description: "Estimate a Los Angeles Unified teacher's salary on the LAUSD schedule — by years of service and salary class (degree and units) — with stipends and the raise still ahead to the top of the schedule.",
    metaTitle: "LAUSD Salary Calculator — LAUSD Teacher Salary Schedule",
    metaDescription: "Free LAUSD salary calculator. Estimate LAUSD teacher pay by years of service and salary class, with stipends.",
    calcInputs: [
      dropdown("column", "Salary Class", [["Class I — BA", 0], ["Class II", 1], ["Class III", 2], ["Class IV", 3], ["Class V — MA + Units", 4], ["Class VI — Doctorate / Max Units", 5]], 2),
      n("yearsExperience", "Years of Service", V.lausd.yearsExperience, 40, true, 0.5),
      currencyField("stipends", "Yearly Stipends (Bilingual, NBCT, Coaching)", { default: 1500, max: 50000, step: 100, required: false }),
    ],
    calcResult: { label: "Base Salary", format: "currency" },
    calcResults: [
      { key: "baseSalary", label: "Estimated Base Salary", format: "currency", highlight: true },
      { key: "withStipends", label: "With Stipends", format: "currency" },
      { key: "monthlyGross", label: "Monthly Gross", format: "currency" },
      { key: "toTopOfSchedule", label: "Increase Still Ahead to Top of Schedule", format: "currency" },
    ],
    instructions: "Pick your salary class (based on degree and post-BA units) and years of service, and add stipends you receive.",
    examples: `Example: a Class III teacher with 10 years of service earns about ${money(X.lausd.baseSalary)}, or ${money(X.lausd.withStipends)} with $1,500 of stipends.`,
    assumptions: "An approximation of LAUSD's 2025–26 certificated salary schedule after the 2023 UTLA agreement (starting near $69,000 and reaching about $124,000 at the top). The real schedule moves in steps; check LAUSD's published schedule. Not affiliated with LAUSD or UTLA.",
    faq: [
      { question: "How much do LAUSD teachers make?", answer: "Roughly $69,000 to start, rising past $110,000–$120,000 with experience and units." },
      { question: "How do I move up the LAUSD salary schedule?", answer: "Through years of service (steps) and completed post-BA units or degrees (classes)." },
    ],
  },
  {
    slug: "nanny-rate-calculator",
    title: "Nanny Rate Calculator",
    category: CAT,
    description: "Work out a fair nanny rate — hourly pay for the number of kids, experience and extra duties — plus weekly and yearly pay with overtime and the employer's payroll tax cost.",
    metaTitle: "Nanny Rate Calculator — Hourly Pay, Overtime & Taxes",
    metaDescription: "Free nanny rate calculator. Find an hourly nanny rate by kids, experience and duties, with overtime and employer taxes.",
    calcInputs: [
      currencyField("baseRate", "Local Base Rate for One Child (Hourly)", { default: 22, max: 100, step: 0.5 }), n("children", "Number of Children", V.nanny.children, 8, true, 1, 1),
      currencyField("extraPerChild", "Extra per Additional Child (Hourly)", { default: 2, max: 20, step: 0.5 }), YN("housekeeping", "Light Housekeeping / Cooking", 1), YN("tutoring", "Tutoring / Homework Help", 0),
      n("yearsExperience", "Nanny's Years of Experience", V.nanny.yearsExperience, 40), LOCATION(),
      n("hoursPerWeek", "Hours per Week", V.nanny.hoursPerWeek, 80), YN("liveIn", "Live-In (Federal Overtime Exemption)", 0),
      percentField("unemploymentTaxRate", "State + Federal Unemployment Tax Rate", { default: 3, max: 10, step: 0.1, required: false }),
    ],
    calcResult: { label: "Hourly Rate", format: "currency" },
    calcResults: [
      { key: "hourlyRate", label: "Suggested Hourly Rate", format: "currency", highlight: true },
      { key: "weeklyGrossPay", label: "Weekly Gross Pay (with Overtime)", format: "currency" },
      { key: "yearlyGrossPay", label: "Yearly Gross Pay", format: "currency" },
      { key: "employerWeeklyCost", label: "Your Weekly Cost with Employer Taxes", format: "currency" },
      { key: "overtimeHours", label: "Overtime Hours per Week", format: "number" },
    ],
    instructions: "Start from your area's typical rate for one child (local agencies and parent groups know it), then add children, duties and experience. Enter weekly hours; live-out nannies earn time-and-a-half over 40 hours.",
    examples: `Example: a $22 base with two kids, light housekeeping and 5 years' experience suggests ${money(X.nanny.hourlyRate)}/hour. For 45 hours (5 of overtime) that's ${money(X.nanny.weeklyGrossPay)} a week; with employer taxes the family pays about ${money(X.nanny.employerWeeklyCost)}.`,
    assumptions: "Nannies are household employees, not contractors: families paying $2,800+ a year (2025 threshold) owe Social Security and Medicare (7.65% employer share) and usually federal and state unemployment tax. Live-out nannies get overtime under the FLSA; some states (e.g. California, New York) also cover live-in nannies.",
    faq: [
      { question: "How much should I pay a nanny?", answer: "Commonly $20–$30 an hour in the US, more in big cities and for multiple children or extra duties." },
      { question: "Do I have to pay nanny taxes?", answer: "Yes, if you pay a household employee more than the yearly threshold ($2,800 for 2025)." },
    ],
  },
  {
    slug: "will-ai-take-my-job-calculator",
    title: "Will AI Take My Job Calculator",
    category: CAT,
    description: "Gauge how exposed your job is to AI automation from how you spend your time — routine digital work, hands-on physical work, people-facing work and creative or strategic work — and how well you use AI tools.",
    metaTitle: "Will AI Take My Job Calculator — AI Exposure Score",
    metaDescription: "Free will AI take my job calculator. Estimate your job's AI exposure from your task mix and see which work is most protected.",
    calcInputs: [
      percentField("routineDigitalWork", "Time on Routine Computer Work (Data, Documents, Email, Code)", { default: 50, max: 100, step: 5 }),
      percentField("physicalWork", "Time on Hands-On / Physical Work", { default: 5, max: 100, step: 5 }),
      percentField("peopleWork", "Time on Face-to-Face Care, Sales, Teaching or Leadership", { default: 20, max: 100, step: 5 }),
      percentField("creativeStrategicWork", "Time on Creative or Strategic Work", { default: 25, max: 100, step: 5 }),
      YN("licensedOrAccountable", "Licensed or Legally Accountable Role (e.g. Nurse, Engineer, Lawyer)", 0),
      dropdown("aiSkillLevel", "How Well You Use AI Tools", [["Not at All", 0], ["A Little", 1], ["Regularly", 2], ["Expert / Build With AI", 4]], 2),
    ],
    calcResult: { label: "AI Exposure", format: "number" },
    calcResults: [
      { key: "aiExposureScore", label: "AI Exposure Score (0–100)", format: "number", highlight: true },
      { key: "riskLevel", label: "Exposure (3 High, 2 Moderate, 1 Low)", format: "number" },
      { key: "tasksLikelyAutomatable", label: "Share of Your Time Likely to Be Automated", format: "percentage" },
      { key: "protectedShare", label: "Share of Your Time in Physical or People Work", format: "percentage" },
    ],
    instructions: "Estimate how a typical week splits across the four kinds of work (they don't need to add to exactly 100%), and how much you already use AI tools.",
    examples: `Example: half your time on routine computer work, a quarter creative and a fifth with people gives an exposure score of ${X.ai.aiExposureScore} — moderate: about ${X.ai.tasksLikelyAutomatable}% of your time is likely to be automated or reshaped.`,
    assumptions: "A rough self-assessment inspired by task-based research on AI exposure: routine digital tasks are most exposed, while physical, interpersonal and accountable work is least. High exposure often means a job changes rather than disappears — people who use AI well tend to gain. It isn't a forecast for any specific job.",
    faq: [
      { question: "Which jobs are safest from AI?", answer: "Jobs mixing physical skill, human care or relationships and real-world accountability — such as nursing, skilled trades and teaching." },
      { question: "How can I protect my job from AI?", answer: "Learn to use AI tools in your work and shift time toward judgment, relationships and work AI can't do alone." },
    ],
  },
  {
    slug: "career-calculator",
    title: "Career Calculator",
    category: CAT,
    description: "Project your career earnings — lifetime pay from your starting salary, yearly raises and promotions — plus your final and average salary and the retirement savings you'd build along the way.",
    metaTitle: "Career Calculator — Lifetime Earnings & Final Salary",
    metaDescription: "Free career calculator. Project lifetime earnings, final salary and retirement savings from your starting pay, raises and promotions.",
    calcInputs: [
      currencyField("startingSalary", "Starting Salary", { default: 55000, max: 1000000, step: 500 }), percentField("annualRaise", "Yearly Raise", { default: 3, max: 15, step: 0.25 }),
      n("promotionEveryYears", "Promotion Every (Years, 0 = Never)", V.career.promotionEveryYears, 20, false), percentField("promotionRaise", "Raise at Each Promotion", { default: 8, max: 50, step: 1, required: false }),
      n("careerYears", "Career Length (Years)", V.career.careerYears, 50, true, 1, 1),
      percentField("retirementContribution", "Your Retirement Contribution", { default: 6, max: 50, step: 0.5, required: false }), percentField("employerMatch", "Employer Match", { default: 4, max: 20, step: 0.5, required: false }),
      percentField("investmentReturn", "Investment Return", { default: 6, max: 12, step: 0.25, required: false }),
    ],
    calcResult: { label: "Lifetime Earnings", format: "currency" },
    calcResults: [
      { key: "lifetimeEarnings", label: "Lifetime Earnings", format: "currency", highlight: true },
      { key: "finalSalary", label: "Final Salary", format: "currency" },
      { key: "averageSalary", label: "Average Salary", format: "currency" },
      { key: "retirementSavings", label: "Retirement Savings at the End", format: "currency" },
    ],
    instructions: "Enter your starting salary, the typical yearly raise and how often you expect a promotion and how big it is, then your retirement savings rate and expected return.",
    examples: `Example: starting at $55,000 with 3% raises and an 8% promotion every 6 years for 35 years earns about ${money(X.career.lifetimeEarnings)}, ending near ${money(X.career.finalSalary)}; saving 10% with the match builds about ${money(X.career.retirementSavings)}.`,
    assumptions: "Figures are in nominal dollars (not adjusted for inflation) and before tax. Real careers include job changes (often the biggest raises), breaks and market swings.",
    faq: [
      { question: "How much will I earn in my lifetime?", answer: "A typical US worker earns roughly $1.5–$3 million over a career, more with a degree and steady raises." },
      { question: "How much do promotions add over a career?", answer: "Promotions compound — an 8% bump every few years can add hundreds of thousands of dollars by retirement." },
    ],
  },
  {
    slug: "ats-score-calculator",
    title: "ATS Score Calculator",
    category: CAT,
    description: "Score how well your résumé matches a job posting the way applicant tracking systems (ATS) screen — keyword and required-skill matches, experience, education and formatting issues — and how many keywords to add.",
    metaTitle: "ATS Score Calculator — Résumé Match Score",
    metaDescription: "Free ATS score calculator. Score your résumé against a job posting by keywords, required skills, experience and formatting.",
    calcInputs: [
      n("jobKeywords", "Key Terms in the Job Posting", V.ats.jobKeywords, 200, true, 1, 1), n("keywordsMatched", "Of Those, Terms in Your Résumé", V.ats.keywordsMatched, 200),
      n("requiredSkills", "Required Skills / Qualifications Listed", V.ats.requiredSkills, 50), n("requiredMatched", "Required Skills You Clearly Show", V.ats.requiredMatched, 50),
      n("yearsRequired", "Years of Experience Required", V.ats.yearsRequired, 30, false), n("yourYears", "Your Relevant Years", V.ats.yourYears, 50, false, 0.5),
      YN("educationMatch", "Meets the Education Requirement", 1), n("formattingIssues", "Formatting Issues (Tables, Images, Headers, Unusual Fonts)", V.ats.formattingIssues, 10, false),
    ],
    calcResult: { label: "ATS Match Score", format: "number" },
    calcResults: [
      { key: "atsMatchScore", label: "ATS Match Score (0–100)", format: "number", highlight: true },
      { key: "keywordMatch", label: "Keyword Match", format: "percentage" },
      { key: "requiredSkillsMatch", label: "Required Skills Match", format: "percentage" },
      { key: "keywordsToAdd", label: "Keywords to Add for an 80% Match", format: "number" },
      { key: "likelyToPassScreen", label: "Likely to Pass a Keyword Screen? (1 = Yes)", format: "number" },
    ],
    instructions: "List the important skills, tools and titles in the job posting, count how many appear (in the same words) in your résumé, and do the same for the required qualifications. Count formatting elements ATS often misread.",
    examples: `Example: 17 of 25 key terms, 5 of 6 required skills, 4 of 5 years and one formatting issue give an ATS score of ${X.ats.atsMatchScore} — adding about ${X.ats.keywordsToAdd} more relevant keywords would strengthen it.`,
    assumptions: "A heuristic, not any vendor's algorithm: ATS products (Workday, Greenhouse, iCIMS and others) parse résumés and let recruiters filter by keywords and qualifications. Use the posting's exact wording where it's true for you, simple formatting and standard section headings. Never add skills you don't have.",
    faq: [
      { question: "What is a good ATS score?", answer: "Around 75–80% or higher is a common target for keyword-match tools." },
      { question: "How do I beat the ATS?", answer: "Mirror the posting's key terms honestly, use a simple single-column format and standard headings." },
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
