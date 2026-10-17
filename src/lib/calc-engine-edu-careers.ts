/**
 * Batch: "Jobs & Education Calculators" → Salary, Income & Career (16 tools):
 *  - salaryRange: min / midpoint / max from a range spread, compa-ratio and
 *    range penetration.
 *  - amIUnderpaid (covers "market salary"): market median adjusted for
 *    experience, location and credentials vs your pay, with a percentile.
 *  - yearsOfExperience: up to five jobs (part-time weighted).
 *  - jobSalary family — nurse, teacher, doctor (by specialty), CEO (by
 *    company size), social media manager, medical coder (AAPC
 *    certifications), civil engineer (ASCE / PE): BLS May 2024 medians and
 *    published specialty / size figures (JOB_SALARIES), adjusted for
 *    experience, location and credentials.
 *  - uftSalary (NYC DOE / UFT teacher schedule) and lausdSalary (LAUSD
 *    teacher schedule): approximate step-and-column schedules.
 *  - nannyRate: hourly rate, overtime and the employer's tax cost.
 *  - willAiTakeMyJob: a task-mix exposure score.
 *  - careerEarnings ("career calculator"): lifetime earnings, final salary
 *    and retirement savings.
 *  - atsScore: résumé match score against a job posting.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-edu-careers-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const yes = (v: number) => Math.round(safeNumber(v)) === 1;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Standard-normal CDF approximation. */
function normCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** Experience multiplier: 0.8 at entry, 1.0 around 8 years, up to 1.3 at 20+. */
const expFactor = (years: number) => 0.8 + Math.min(20, nonNeg(years)) * 0.025;

export const salaryRange: CustomCalculator = (v) => {
  const mid = nonNeg(v.midpoint);
  const spread = nonNeg(v.rangeSpread, 40) / 100;
  const min = mid / (1 + spread / 2);
  const max = min * (1 + spread);
  const pay = nonNeg(v.currentSalary);
  return {
    rangeMinimum: round2(min),
    rangeMidpoint: round2(mid),
    rangeMaximum: round2(max),
    compaRatio: mid > 0 && pay > 0 ? round2((pay / mid) * 100) : 0,
    rangePenetration: max > min && pay > 0 ? round2(((pay - min) / (max - min)) * 100) : 0,
  };
};

export const amIUnderpaid: CustomCalculator = (v) => {
  const market =
    nonNeg(v.marketMedian) * expFactor(v.yearsExperience) * (nonNeg(v.locationIndex, 100) / 100) * (1 + nonNeg(v.credentialPremium) / 100) * [0.92, 1, 1.08][clamp(Math.round(nonNeg(v.companySize, 1)), 0, 2)];
  const pay = nonNeg(v.currentSalary);
  const z = market > 0 && pay > 0 ? Math.log(pay / market) / 0.25 : 0;
  return {
    marketSalary: round2(market),
    payGap: round2(market - pay),
    payGapPercent: market > 0 ? round2(((market - pay) / market) * 100) : 0,
    yourPercentile: round2(clamp(normCdf(z) * 100, 1, 99)),
    underpaid: pay < market * 0.9 ? 1 : 0,
  };
};

export const yearsOfExperience: CustomCalculator = (v) => {
  const now = Math.round(nonNeg(v.currentYear, 2026)) * 12 + Math.round(clamp(nonNeg(v.currentMonth, 1), 1, 12));
  let total = 0;
  let fte = 0;
  for (let i = 1; i <= 5; i++) {
    const sy = nonNeg(v[`start${i}Year`]);
    if (sy <= 0) continue;
    const s = Math.round(sy) * 12 + Math.round(clamp(nonNeg(v[`start${i}Month`], 1), 1, 12));
    const ey = nonNeg(v[`end${i}Year`]);
    const e = ey > 0 ? Math.round(ey) * 12 + Math.round(clamp(nonNeg(v[`end${i}Month`], 12), 1, 12)) : now;
    const months = Math.max(0, e - s + (ey > 0 ? 1 : 0));
    total += months;
    fte += (months * clamp(nonNeg(v[`load${i}`], 100), 0, 100)) / 100;
  }
  return { totalYears: Math.floor(total / 12), extraMonths: total % 12, decimalYears: round2(total / 12), fullTimeEquivalentYears: round2(fte / 12) };
};

export interface JobSalary {
  name: string;
  median: number;
  /** Specialty / level options: [label, multiplier]. */
  options: [string, number][];
  optionLabel: string;
  credentialLabel: string;
  credentialPremium: number;
  hoursPerYear: number;
}

export const JOB_SALARIES: Record<string, JobSalary> = {
  "nurse-salary-calculator": {
    name: "registered nurse", median: 93_600, optionLabel: "Nursing Role",
    options: [["Registered Nurse (Hospital)", 1], ["RN — Clinic / School / Outpatient", 0.9], ["Travel Nurse", 1.35], ["LPN / LVN", 0.66], ["Nurse Practitioner", 1.38], ["CRNA", 2.28]],
    credentialLabel: "BSN or Specialty Certification", credentialPremium: 5, hoursPerYear: 1872,
  },
  "teacher-salary-calculator": {
    name: "teacher", median: 65_000, optionLabel: "Teaching Level",
    options: [["Elementary", 0.98], ["Middle School", 1], ["High School", 1.02], ["Special Education", 1.03], ["Preschool", 0.58], ["Private School", 0.85]],
    credentialLabel: "Master's Degree", credentialPremium: 8, hoursPerYear: 1440,
  },
  "doctor-salary-calculator": {
    name: "physician", median: 277_000, optionLabel: "Specialty",
    options: [["Family Medicine", 0.97], ["Pediatrics", 0.94], ["Internal Medicine", 1.05], ["Psychiatry", 1.19], ["Emergency Medicine", 1.37], ["Anesthesiology", 1.7], ["General Surgery", 1.62], ["Cardiology", 1.88], ["Dermatology", 1.73], ["Radiology", 1.88], ["Orthopedic Surgery", 2.02]],
    credentialLabel: "Board Certification / Fellowship", credentialPremium: 5, hoursPerYear: 2600,
  },
  "ceo-salary-calculator": {
    name: "chief executive", median: 206_680, optionLabel: "Company Size",
    options: [["Small Business (Under 50 Employees)", 0.75], ["Mid-Size (50–500)", 1.2], ["Large (500–5,000)", 2.2], ["Enterprise (5,000+)", 5], ["Nonprofit", 0.8]],
    credentialLabel: "MBA / Prior CEO Role", credentialPremium: 10, hoursPerYear: 2600,
  },
  "social-media-manager-salary-calculator": {
    name: "social media manager", median: 68_000, optionLabel: "Role Level",
    options: [["Social Media Coordinator", 0.7], ["Social Media Manager", 1], ["Senior Social Media Manager", 1.3], ["Head of Social / Director", 1.75], ["Freelance (Annualized)", 0.9]],
    credentialLabel: "Paid-Ads / Analytics Certifications", credentialPremium: 5, hoursPerYear: 2080,
  },
  "aapc-medical-coding-salary-calculator": {
    name: "medical coder", median: 50_250, optionLabel: "Role",
    options: [["Outpatient / Physician Coder", 1], ["Inpatient Facility Coder", 1.12], ["Risk Adjustment Coder", 1.08], ["Coding Auditor", 1.3], ["Coding Manager", 1.5]],
    credentialLabel: "AAPC Certification (CPC, CIC, CRC, CPMA)", credentialPremium: 18, hoursPerYear: 2080,
  },
  "asce-salary-calculator": {
    name: "civil engineer", median: 99_590, optionLabel: "Specialty",
    options: [["Structural", 1.03], ["Transportation", 1], ["Geotechnical", 1.02], ["Water Resources / Environmental", 0.98], ["Construction Management", 1.05], ["Public Sector", 0.94]],
    credentialLabel: "PE License", credentialPremium: 12, hoursPerYear: 2080,
  },
};

export const jobSalary = (job: JobSalary): CustomCalculator => (v) => {
  const opt = job.options[clamp(Math.round(nonNeg(v.role)), 0, job.options.length - 1)][1];
  const salary = job.median * opt * expFactor(v.yearsExperience) * (nonNeg(v.locationIndex, 100) / 100) * (yes(v.credential) ? 1 + job.credentialPremium / 100 : 1);
  return {
    estimatedSalary: round2(salary),
    typicalLow: round2(salary * 0.82),
    typicalHigh: round2(salary * 1.22),
    monthlyPay: round2(salary / 12),
    hourlyEquivalent: round2(salary / job.hoursPerYear),
  };
};

/** Step-and-column schedule: start and top salary per column; top reached at `topYears`. */
function schedule(starts: number[], tops: number[], topYears: number, column: number, years: number) {
  const c = clamp(Math.round(column), 0, starts.length - 1);
  const f = Math.pow(clamp(years / topYears, 0, 1), 0.85);
  return starts[c] + (tops[c] - starts[c]) * f;
}

// Approximate NYC DOE / UFT 2025–26 schedule: BA, BA+30 / C1+PD, MA, MA+30 — top at about 22 years.
export const uftSalary: CustomCalculator = (v) => {
  const pay = schedule([66_500, 71_800, 74_500, 80_000], [118_000, 128_000, 138_000, 151_000], 22, v.column, nonNeg(v.yearsExperience));
  const extra = nonNeg(v.perSessionHours) * nonNeg(v.perSessionRate, 58);
  return { baseSalary: round2(pay), withPerSession: round2(pay + extra), monthlyGross: round2(pay / 12), perSessionPay: round2(extra), toTopOfSchedule: round2(Math.max(0, [118_000, 128_000, 138_000, 151_000][clamp(Math.round(nonNeg(v.column)), 0, 3)] - pay)) };
};

// Approximate LAUSD 2025–26 teacher schedule: Class I (BA) … Class VI (MA + units / doctorate) — top at about 30 years.
export const lausdSalary: CustomCalculator = (v) => {
  const tops = [96_000, 104_000, 110_000, 116_000, 120_000, 124_000];
  const pay = schedule([69_000, 71_000, 73_500, 76_000, 78_500, 81_000], tops, 30, v.column, nonNeg(v.yearsExperience));
  const stipends = nonNeg(v.stipends);
  return { baseSalary: round2(pay), withStipends: round2(pay + stipends), monthlyGross: round2(pay / 12), toTopOfSchedule: round2(Math.max(0, tops[clamp(Math.round(nonNeg(v.column)), 0, 5)] - pay)) };
};

export const nannyRate: CustomCalculator = (v) => {
  const kids = Math.max(1, Math.round(nonNeg(v.children, 1)));
  const rate =
    (nonNeg(v.baseRate) + (kids - 1) * nonNeg(v.extraPerChild, 2) + (yes(v.housekeeping) ? 1.5 : 0) + (yes(v.tutoring) ? 2 : 0) + Math.min(10, nonNeg(v.yearsExperience)) * 0.4) *
    (nonNeg(v.locationIndex, 100) / 100);
  const hours = nonNeg(v.hoursPerWeek);
  const ot = yes(v.liveIn) ? 0 : Math.max(0, hours - 40);
  const weekly = rate * (hours - ot) + rate * 1.5 * ot;
  const employerTaxes = weekly * 0.0765 + weekly * nonNeg(v.unemploymentTaxRate, 3) / 100;
  return { hourlyRate: round2(rate), weeklyGrossPay: round2(weekly), yearlyGrossPay: round2(weekly * 52), employerWeeklyCost: round2(weekly + employerTaxes), overtimeHours: round2(ot) };
};

export const willAiTakeMyJob: CustomCalculator = (v) => {
  const routine = clamp(nonNeg(v.routineDigitalWork), 0, 100);
  const physical = clamp(nonNeg(v.physicalWork), 0, 100);
  const people = clamp(nonNeg(v.peopleWork), 0, 100);
  const creative = clamp(nonNeg(v.creativeStrategicWork), 0, 100);
  const regulated = yes(v.licensedOrAccountable);
  const raw = 0.85 * routine + 0.35 * creative - 0.45 * physical - 0.4 * people + 25 - (regulated ? 12 : 0) - Math.min(20, nonNeg(v.aiSkillLevel) * 5);
  const score = Math.round(clamp(raw, 2, 95));
  return { aiExposureScore: score, riskLevel: score >= 60 ? 3 : score >= 35 ? 2 : 1, tasksLikelyAutomatable: round2((routine * score) / 100), protectedShare: round2(clamp(physical + people, 0, 100)) };
};

export const careerEarnings: CustomCalculator = (v) => {
  const years = Math.max(1, Math.round(nonNeg(v.careerYears, 40)));
  const raise = nonNeg(v.annualRaise) / 100;
  const every = Math.round(nonNeg(v.promotionEveryYears));
  const bump = nonNeg(v.promotionRaise) / 100;
  const save = (nonNeg(v.retirementContribution) + nonNeg(v.employerMatch)) / 100;
  const r = nonNeg(v.investmentReturn) / 100;
  let salary = nonNeg(v.startingSalary);
  let total = 0;
  let nest = 0;
  for (let y = 1; y <= years; y++) {
    total += salary;
    nest = nest * (1 + r) + salary * save;
    salary *= 1 + raise;
    if (every > 0 && y % every === 0) salary *= 1 + bump;
  }
  return { lifetimeEarnings: round2(total), finalSalary: round2(salary / (1 + raise)), averageSalary: round2(total / years), retirementSavings: round2(nest) };
};

export const atsScore: CustomCalculator = (v) => {
  const kw = nonNeg(v.jobKeywords) > 0 ? clamp(nonNeg(v.keywordsMatched) / nonNeg(v.jobKeywords), 0, 1) : 0;
  const req = nonNeg(v.requiredSkills) > 0 ? clamp(nonNeg(v.requiredMatched) / nonNeg(v.requiredSkills), 0, 1) : 1;
  const exp = nonNeg(v.yearsRequired) > 0 ? clamp(nonNeg(v.yourYears) / nonNeg(v.yearsRequired), 0, 1) : 1;
  const score = Math.round(clamp(45 * kw + 30 * req + 10 * exp + (yes(v.educationMatch) ? 10 : 0) + 5 - 4 * nonNeg(v.formattingIssues), 0, 100));
  return { atsMatchScore: score, keywordMatch: round2(kw * 100), requiredSkillsMatch: round2(req * 100), keywordsToAdd: Math.max(0, Math.ceil(nonNeg(v.jobKeywords) * 0.8 - nonNeg(v.keywordsMatched))), likelyToPassScreen: score >= 75 ? 1 : 0 };
};

export const eduCareersCustomCalculators: Record<string, CustomCalculator> = {
  "salary-range-calculator": salaryRange,
  "am-i-underpaid-calculator": amIUnderpaid,
  "years-of-experience-calculator": yearsOfExperience,
  ...Object.fromEntries(Object.entries(JOB_SALARIES).map(([slug, job]) => [slug, jobSalary(job)])),
  "uft-salary-calculator": uftSalary,
  "lausd-salary-calculator": lausdSalary,
  "nanny-rate-calculator": nannyRate,
  "will-ai-take-my-job-calculator": willAiTakeMyJob,
  "career-calculator": careerEarnings,
  "ats-score-calculator": atsScore,
};
