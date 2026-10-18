// One-time (but safe to re-run) batch setup script: creates 29 leave, severance, notice,
// workplace-claim and safety calculators (Law & Government Calculators > Employment & Wage Law
// Calculators). Rules live in src/lib/calc-engine-law-work.ts; the examples below are computed
// from that engine so they always match the calculator. Date fields and results use the
// widget's date support (day numbers).
// Merged keywords (covered here, no separate page): Waiting Time Penalty → final-paycheck-penalty;
// Holiday Accrual, Holiday Allowance, Time Off Calculator Hours → annual-leave; Holiday Calculator
// UK / zero-hours holiday pay → uk-holiday-pay; LSL Calculator → nsw-long-service-leave; Sick
// Hours → california-sick-leave; Sick Pay → statutory-sick-pay; Severence Pay / Severence →
// severance-pay; Dubai Severance / UAE gratuity → uae-gratuity; Two Weeks Notice, 30 / 60 Day
// Notice, Notice Calculator → notice-period; I-9 Calculator / I 9 Retention → i-9-retention;
// Employment Settlement → wrongful-termination; Adverse Impact / Disparate Impact are not built
// (4/5ths rule tool goes to review); Wage Gap / Gender Pay Gap → pay-gap; DART Rate, Lost
// Workday Case Rate → osha-incident-rate; Split Sleeper / 8/2 Split → dot-hours-of-service; PTU
// Salary → mexico-ptu. India Severance is covered by the existing gratuity-calculator.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-work-calculators.ts
// or
//   npm run db:create-law-work-calculators

import * as E from "../src/lib/calc-engine-law-work";

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

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100, step: opts.step ?? 0.5 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

function dateField(key: string, label: string, def: number | string = "today") {
  return { key, label, type: "date", required: true, default: def };
}

interface ToolDef {
  slug: string;
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

const CAT = "employment-wage-law-calculators";
const DISCLAIMER = "Estimates only, not legal advice — your contract, the employer's records and the relevant agency or court decide the final figure.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const gbp = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const D0 = 20600; // 27 May 2026, a fixed example date (day number)
const fmtDay = (d: number) => new Date(d * 86400000).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });

const exFp = r(E.finalPaycheckPenalty, { hourlyRate: 25, hoursPerDay: 8, daysLate: 12 });
const exAl = r(E.annualLeave, { daysPerYear: 20, monthsWorkedThisYear: 9, carriedOver: 3, daysTaken: 8, hoursPerDay: 8, hourlyRate: 30 });
const exPto = r(E.ptoPayout, { unusedPtoHours: 64, hourlyRate: 32, annualSalary: 0, supplementalTaxPercent: 22, stateTaxPercent: 5 });
const exUkh = r(E.ukHolidayPay, { workPattern: 0, daysPerWeek: 5, hoursWorkedInPeriod: 0, averageWeeklyPay: 600, hourlyRate: 0 });
const exUkh2 = r(E.ukHolidayPay, { workPattern: 1, daysPerWeek: 3, hoursWorkedInPeriod: 160, averageWeeklyPay: 0, hourlyRate: 12.5 });
const exLsl = r(E.nswLongService, { yearsOfService: 12, ordinaryWeeklyPay: 1800, weeksAlreadyTaken: 0 });
const exCsl = r(E.californiaSickLeave, { hoursWorkedThisYear: 1500, carriedOverHours: 20, employerCaps: 1, hoursUsed: 8 });
const exSlc = r(E.sickLeaveConversion, { unusedSickHours: 1200, system: 0, ageAtRetirement: 62, yearsOfService: 25, high3Salary: 95000 });
const exSsp = r(E.statutorySickPay, { averageWeeklyEarnings: 450, qualifyingDaysPerWeek: 5, sickDays: 8 });
const exNhs = r(E.nhsSickPay, { yearsOfService: 3, monthlyPay: 2600 });
const exSev = r(E.severancePay, { annualSalary: 78000, yearsOfService: 6, weeksPerYear: 2, minimumWeeks: 4, maxWeeks: 26, ptoPayout: 1500, bonusOrOther: 0, withholdingPercent: 30 });
const exKsa = r(E.saudiEndOfService, { monthlyWage: 12000, yearsOfService: 7, reason: 0 });
const exKsa2 = r(E.saudiEndOfService, { monthlyWage: 12000, yearsOfService: 7, reason: 1 });
const exUae = r(E.uaeGratuity, { monthlyBasicSalary: 10000, yearsOfService: 7 });
const exRed = r(E.ukRedundancy, { age: 45, yearsOfService: 10, weeklyPay: 820 });
const exNot = r(E.ukNoticePeriod, { yearsOfService: 6, contractualNoticeWeeks: 0, contractualNoticeMonths: 1, whoGivesNotice: 0, noticeGivenDate: D0, weeklyPay: 700 });
const exOn = r(E.ontarioSeverance, { yearsOfService: 9, weeklyPay: 1500, payrollOver25M: 1 });
const exOs = r(E.ontarioStatPay, { regularWagesLast4Weeks: 4400, vacationPayLast4Weeks: 0, workedTheHoliday: 1, hoursWorkedOnHoliday: 8, hourlyRate: 27.5 });
const exI9 = r(E.i9Retention, { hireDate: 18500, stillEmployed: 0, terminationDate: D0 });
const exNp = r(E.noticePeriod, { noticeDate: D0, noticeLength: 14, unit: 0 });
const CLAIM = { annualSalary: 85000, monthsUnemployed: 8, interimEarnings: 12000, frontPayMonths: 6, emotionalDistressDamages: 40000, punitiveDamages: 50000, employerSize: 150, attorneyFeePercent: 33, chanceOfWinningPercent: 60 };
const exWt = r(E.wrongfulTermination, CLAIM);
const exDs = r(E.discriminationSettlement, CLAIM);
const exPg = r(E.payGap, { higherGroupPay: 72000, lowerGroupPay: 61000, payIsHourly: 0, annualHours: 2080 });
const exOsha = r(E.oshaRates, { recordableCases: 6, dartCases: 3, lostTimeCases: 2, daysAwayTotal: 45, totalHoursWorked: 420000 });
const exSp = r(E.safetyPays, { directCost: 8000, profitMarginPercent: 5 });
const exHos = r(E.hoursOfService, { drivingHoursToday: 6.5, hoursSinceOnDuty: 9, cycle: 1, onDutyHoursInCycle: 58, drivingSinceLastBreak: 5 });
const exSt = r(E.stcwRest, { restHoursLast24: 10, restHoursLast7Days: 74, restPeriodsIn24: 2, longestRestPeriod: 6 });
const exFr = r(E.fringeRate, { annualWages: 60000, healthInsurance: 7800, retirement: 2400, payrollTaxes: 4900, paidLeaveValue: 3500, otherBenefits: 600, annualHours: 2080 });
const exUd = r(E.unionDues, { grossPayPerPeriod: 2400, periodsPerYear: 26, duesPercent: 1.5, hoursPerPeriod: 0, duesPerHour: 0, flatDuesPerPeriod: 5, initiationFee: 100 });
const exLp = r(E.longevityPay, { yearsOfService: 17, startsAfterYears: 5, everyYears: 5, amountPerStep: 600, percentPerStep: 0, annualSalary: 0, periodsPerYear: 26 });
const exPtu = r(E.ptu, { companyTaxableProfit: 20000000, totalDaysAllEmployees: 36500, totalSalariesAllEmployees: 30000000, yourDaysWorked: 365, yourAnnualSalary: 240000, yourMonthlySalary: 20000, yourAveragePtuLast3Years: 0 });

const TOOLS: ToolDef[] = [
  {
    slug: "final-paycheck-penalty-calculator",
    title: "California Final Paycheck Penalty Calculator (Waiting Time)",
    description: "Calculate California's waiting time penalty when a final paycheck is late — a full day's wages for each day it's late, up to 30 days.",
    metaTitle: "Waiting Time Penalty Calculator — California Final Paycheck",
    metaDescription: "Free California waiting time penalty calculator. Daily wage × days the final paycheck was late, up to 30 days (Labor Code §203).",
    calcInputs: [currencyField("hourlyRate", "Hourly Rate", { default: 25, max: 500, step: 0.05 }), numberField("hoursPerDay", "Hours Normally Worked per Day", { default: 8, max: 24, step: 0.5 }), numberField("daysLate", "Calendar Days the Final Pay Was Late", { default: 12, max: 365 })],
    calcResult: { label: "Waiting Time Penalty", format: "currency" },
    calcResults: [
      { key: "waitingTimePenalty", label: "Waiting Time Penalty", format: "currency", highlight: true },
      { key: "dailyWage", label: "Daily Wage", format: "currency" },
      { key: "daysCounted", label: "Days Counted (max 30)", format: "number" },
      { key: "maximumPossiblePenalty", label: "Maximum Possible (30 days)", format: "currency" },
    ],
    instructions: "Final pay is due immediately when you're fired or laid off, and within 72 hours if you quit without notice (on your last day with 72 hours' notice). Count every calendar day after that until you were fully paid.",
    examples: `Example: at $25 an hour for 8 hours a day, final pay 12 days late earns a penalty of ${usd(exFp.waitingTimePenalty)} (up to ${usd(exFp.maximumPossiblePenalty)} for 30 days).`,
    assumptions: "Labor Code §201–203: if the employer willfully fails to pay all final wages on time, wages continue as a penalty at the daily rate for each calendar day late, up to 30 days. A good-faith dispute over wages owed can be a defense. " + DISCLAIMER,
    faq: [
      { question: "When is my final paycheck due in California?", answer: "Immediately on termination; within 72 hours if you quit without notice; on your last day if you gave at least 72 hours' notice." },
      { question: "How do I claim waiting time penalties?", answer: "File a wage claim with the Labor Commissioner (DLSE) or include it in a lawsuit within 3 years." },
    ],
  },
  {
    slug: "annual-leave-calculator",
    title: "Annual Leave Calculator (PTO Accrual)",
    description: "Work out your annual leave or PTO balance — days accrued for the part of the year worked, carry-over, days taken — plus the hours and cash value of what's left.",
    metaTitle: "Annual Leave Calculator — PTO Accrual & Balance",
    metaDescription: "Free annual leave calculator. Pro-rata leave accrued, carry-over and days taken, with the hours and payout value of your balance.",
    calcInputs: [
      numberField("daysPerYear", "Leave Days per Year", { default: 20, max: 60, step: 0.5 }),
      numberField("monthsWorkedThisYear", "Months Worked This Leave Year", { default: 9, max: 12, step: 0.5 }),
      numberField("carriedOver", "Days Carried Over", { default: 3, max: 60, step: 0.5 }),
      numberField("daysTaken", "Days Already Taken", { default: 8, max: 100, step: 0.5 }),
      numberField("hoursPerDay", "Hours per Workday", { default: 8, max: 24, step: 0.5 }),
      currencyField("hourlyRate", "Hourly Rate (for the payout value)", { default: 30, max: 500, step: 0.05 }),
    ],
    calcResult: { label: "Leave Balance (days)", format: "number" },
    calcResults: [
      { key: "leaveBalanceDays", label: "Leave Balance (days)", format: "number", highlight: true },
      { key: "accruedDays", label: "Days Accrued incl. Carry-Over", format: "number" },
      { key: "balanceHours", label: "Balance in Hours", format: "number" },
      { key: "payoutValue", label: "Cash Value of the Balance", format: "currency" },
      { key: "accrualPerMonth", label: "Days Accrued per Month", format: "number" },
    ],
    instructions: "Enter your yearly leave entitlement, how many months of the leave year you've worked, any days carried over and days already taken.",
    examples: `Example: 20 days a year, 9 months worked, 3 days carried over and 8 taken leaves ${exAl.leaveBalanceDays} days — ${exAl.balanceHours} hours, worth ${usd(exAl.payoutValue)} at $30 an hour.`,
    assumptions: "Accrual is pro rata by months worked (entitlement ÷ 12 per month). Employers may accrue per pay period or per hour worked instead, cap balances, or round differently — check your policy. Whether unused leave is paid out depends on state law and policy. " + DISCLAIMER,
    faq: [
      { question: "How is annual leave calculated for part of a year?", answer: "Usually pro rata: your yearly entitlement × the months worked ÷ 12." },
      { question: "Do I get paid for unused leave when I leave?", answer: "In states like California, Colorado, Massachusetts, Montana, Nebraska and North Dakota, accrued vacation must be paid out; elsewhere it depends on policy." },
    ],
  },
  {
    slug: "pto-payout-calculator",
    title: "PTO Payout Calculator",
    description: "Calculate your PTO payout when you leave a job — unused hours × your rate — and an estimate of what you'll take home after supplemental tax withholding.",
    metaTitle: "PTO Payout Calculator — Unused Vacation Pay After Taxes",
    metaDescription: "Free PTO payout calculator. Unused PTO hours × hourly rate (or salary ÷ 2,080), with federal supplemental, state and FICA withholding.",
    calcInputs: [
      numberField("unusedPtoHours", "Unused PTO Hours", { default: 64, max: 2000, step: 0.5 }),
      currencyField("hourlyRate", "Hourly Rate (0 = use salary)", { default: 32, max: 500, step: 0.05 }),
      currencyField("annualSalary", "Annual Salary (if no hourly rate)", { default: 0, max: 1000000, step: 500 }),
      percentField("supplementalTaxPercent", "Federal Supplemental Withholding", { default: 22, max: 37 }),
      percentField("stateTaxPercent", "State Withholding", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Gross PTO Payout", format: "currency" },
    calcResults: [
      { key: "grossPtoPayout", label: "Gross PTO Payout", format: "currency", highlight: true },
      { key: "estimatedNetPayout", label: "Estimated Take-Home", format: "currency" },
      { key: "hourlyRateUsed", label: "Hourly Rate Used", format: "currency" },
      { key: "estimatedWithholding", label: "Estimated Withholding (incl. 7.65% FICA)", format: "currency" },
    ],
    instructions: "Enter your unused PTO hours from your last paystub and your hourly rate — or your annual salary, which is converted at 2,080 hours a year.",
    examples: `Example: 64 unused hours at $32 is ${usd(exPto.grossPtoPayout)} gross, about ${usd(exPto.estimatedNetPayout)} after 22% federal, 5% state and FICA.`,
    assumptions: "PTO payouts are supplemental wages, often withheld at the 22% federal flat rate, plus Social Security and Medicare (7.65%) and state tax. Final tax depends on your annual income. States requiring payout of earned vacation include California, Colorado, Illinois (if earned), Massachusetts, Montana, Nebraska, North Dakota and Rhode Island (after a year). " + DISCLAIMER,
    faq: [
      { question: "Is PTO payout taxed more?", answer: "It's withheld at the supplemental rate (often 22% federal), but it's taxed like other wages when you file." },
      { question: "Does my employer have to pay out PTO?", answer: "It depends on your state and the employer's written policy — some states require it, others allow 'use it or lose it' policies." },
    ],
  },
  {
    slug: "uk-holiday-pay-calculator",
    title: "UK Holiday Pay Calculator",
    description: "Work out UK statutory holiday entitlement and holiday pay — 5.6 weeks a year for regular hours, or 12.07% of hours worked for irregular-hours and part-year workers.",
    metaTitle: "UK Holiday Pay Calculator — 5.6 Weeks or 12.07% Accrual",
    metaDescription: "Free UK holiday pay calculator. Statutory 5.6 weeks (28 days max) for regular hours, 12.07% accrual for irregular and zero-hours workers, and daily holiday pay.",
    calcInputs: [
      dropdown("workPattern", "Work Pattern", [["Regular hours", 0], ["Irregular / zero hours / part-year (12.07%)", 1]], 0),
      numberField("daysPerWeek", "Days Worked per Week", { default: 5, max: 7, step: 0.5 }),
      currencyField("averageWeeklyPay", "Average Weekly Pay (last 52 paid weeks, £)", { default: 600, max: 10000, step: 5 }),
      numberField("hoursWorkedInPeriod", "Hours Worked in the Pay Period (irregular)", { default: 0, max: 1000, step: 0.5 }),
      currencyField("hourlyRate", "Hourly Rate (irregular, £)", { default: 0, max: 500, step: 0.05 }),
    ],
    calcResult: { label: "Holiday Entitlement", format: "number" },
    calcResults: [
      { key: "holidayEntitlement", label: "Holiday Entitlement (days a year, or hours accrued)", format: "number", highlight: true },
      { key: "entitlementIsHours", label: "Shown in Hours? (1 = yes)", format: "number" },
      { key: "holidayPayPerDay", label: "Holiday Pay per Day", format: "currency", currency: "GBP" },
      { key: "annualHolidayPayValue", label: "Value of the Entitlement", format: "currency", currency: "GBP" },
      { key: "accrualRatePercent", label: "Irregular-Hours Accrual Rate", format: "percentage" },
    ],
    instructions: "For regular hours, enter the days you work each week and your average weekly pay including regular overtime and commission. For irregular hours or zero-hours contracts, enter the hours worked in the pay period and your hourly rate.",
    examples: `Example: a 5-day worker on ${gbp(600)} a week gets ${exUkh.holidayEntitlement} days a year at ${gbp(exUkh.holidayPayPerDay)} a day. An irregular-hours worker who works 160 hours accrues ${exUkh2.holidayEntitlement} hours of holiday.`,
    assumptions: "Working Time Regulations 1998: 5.6 weeks a year (capped at 28 days), bank holidays can be included. For leave years from 1 April 2024, irregular-hours and part-year workers accrue 12.07% of hours worked and can be paid rolled-up holiday pay. Holiday pay uses average weekly pay over the last 52 paid weeks. " + DISCLAIMER,
    faq: [
      { question: "How much holiday am I entitled to in the UK?", answer: "5.6 weeks a year — 28 days for a five-day week (bank holidays can count)." },
      { question: "How is holiday calculated for zero-hours workers?", answer: "At 12.07% of the hours actually worked in each pay period." },
    ],
  },
  {
    slug: "nsw-long-service-leave-calculator",
    title: "NSW Long Service Leave Calculator",
    description: "Calculate long service leave in New South Wales — 2 months (8⅔ weeks) after 10 years with the same employer, pro rata after 5 years if employment ends — and what it's worth.",
    metaTitle: "NSW Long Service Leave Calculator — Weeks & Value",
    metaDescription: "Free NSW long service leave calculator. 8.67 weeks after 10 years, pro rata after 5 years, and the value at your ordinary weekly pay.",
    calcInputs: [numberField("yearsOfService", "Years of Continuous Service", { default: 12, max: 60, step: 0.25 }), currencyField("ordinaryWeeklyPay", "Ordinary Weekly Pay (AUD)", { default: 1800, max: 20000, step: 10 }), numberField("weeksAlreadyTaken", "Long Service Leave Already Taken (weeks)", { default: 0, max: 60, step: 0.5 })],
    calcResult: { label: "Long Service Leave (weeks)", format: "number" },
    calcResults: [
      { key: "longServiceLeaveWeeks", label: "Long Service Leave Available (weeks)", format: "number", highlight: true },
      { key: "totalAccruedWeeks", label: "Total Accrued (weeks)", format: "number" },
      { key: "leaveValue", label: "Value of Available Leave", format: "currency", currency: "AUD" },
      { key: "entitledToTakeLeave", label: "10+ Years — Can Take It? (1 = yes)", format: "number" },
      { key: "proRataOnTermination", label: "Pro Rata if Employment Ends (5+ yrs)? (1 = yes)", format: "number" },
      { key: "accruedValueBeforeTaken", label: "Value of All Accrued Leave", format: "currency", currency: "AUD" },
    ],
    instructions: "Enter your years of continuous service with the employer, your ordinary weekly pay (excluding overtime) and any long service leave already taken.",
    examples: `Example: 12 years of service gives ${exLsl.totalAccruedWeeks} weeks of long service leave — worth about $${exLsl.leaveValue.toLocaleString("en-AU")} at $1,800 a week.`,
    assumptions: "Long Service Leave Act 1955 (NSW): 2 months (8⅔ weeks) after 10 years, then 1 month for each further 5 years (0.8667 weeks per year); pro rata after 5 years if you resign due to illness or domestic necessity, are dismissed (not for serious misconduct) or die. Other states and some awards differ. " + DISCLAIMER,
    faq: [
      { question: "How much long service leave do I get in NSW?", answer: "8.67 weeks after 10 years of continuous service, then 4.33 weeks for every further 5 years." },
      { question: "Do I get long service leave if I resign after 7 years?", answer: "Only in limited cases — for example illness, incapacity or domestic necessity; otherwise pro rata leave starts at 10 years." },
    ],
  },
  {
    slug: "california-sick-leave-calculator",
    title: "California Sick Leave Calculator",
    description: "Calculate California paid sick leave — 1 hour for every 30 hours worked, the 80-hour accrual cap and the 40-hour yearly use limit employers may set — and how much you can still use.",
    metaTitle: "California Sick Leave Accrual Calculator — 1 Hour per 30",
    metaDescription: "Free California paid sick leave calculator. 1 hour per 30 worked, 80-hour accrual cap, 40 hours/5 days usable per year (SB 616).",
    calcInputs: [
      numberField("hoursWorkedThisYear", "Hours Worked This Year", { default: 1500, max: 4000 }),
      numberField("carriedOverHours", "Hours Carried Over from Last Year", { default: 20, max: 200, step: 0.5 }),
      dropdown("employerCaps", "Employer Uses the Legal Caps (80 accrual / 40 use)?", [["Yes", 1], ["No caps", 0]], 1),
      numberField("hoursUsed", "Sick Hours Already Used This Year", { default: 8, max: 200, step: 0.5 }),
    ],
    calcResult: { label: "Usable Sick Hours Left This Year", format: "number" },
    calcResults: [
      { key: "usableThisYear", label: "Usable Sick Hours Left This Year", format: "number", highlight: true },
      { key: "sickHoursAccrued", label: "Hours Accrued This Year", format: "number" },
      { key: "balanceHours", label: "Total Balance (after cap)", format: "number" },
      { key: "hoursToNextSickHour", label: "Hours to Work for the Next Sick Hour", format: "number" },
    ],
    instructions: "Enter the hours you've worked this year, the sick hours carried over, and whether your employer applies the legal caps. Employers can instead front-load at least 40 hours (5 days) at the start of each year.",
    examples: `Example: 1,500 hours worked accrues ${exCsl.sickHoursAccrued} hours; with 20 carried over and the 40-hour use limit, you can still use ${exCsl.usableThisYear} hours this year after using 8.`,
    assumptions: "Labor Code §245–249 as amended by SB 616 (from 2024): accrual of at least 1 hour per 30 worked; employers may cap accrual at 80 hours (10 days) and yearly use at 40 hours (5 days). Some cities (San Francisco, Los Angeles, Oakland…) require more. Unused sick leave doesn't have to be paid out. " + DISCLAIMER,
    faq: [
      { question: "How much sick leave do I get in California?", answer: "At least 40 hours (5 days) a year, accrued at 1 hour per 30 hours worked or front-loaded." },
      { question: "Does unused sick leave get paid out in California?", answer: "No — unless it's combined into a PTO policy, which must then be paid out like vacation." },
    ],
  },
  {
    slug: "sick-leave-conversion-calculator",
    title: "Sick Leave Conversion Calculator (FERS / CSRS)",
    description: "Convert unused federal sick leave into retirement service credit — 2,087 hours equals one year — and see how much it adds to your FERS or CSRS annuity.",
    metaTitle: "Sick Leave Conversion Calculator — FERS Service Credit",
    metaDescription: "Free federal sick leave conversion calculator. Unused hours ÷ 2,087 = service credit in years, months and days, and the extra annuity.",
    calcInputs: [
      numberField("unusedSickHours", "Unused Sick Leave Hours at Retirement", { default: 1200, max: 10000 }),
      dropdown("system", "Retirement System", [["FERS", 0], ["CSRS", 1]], 0),
      numberField("ageAtRetirement", "Age at Retirement", { default: 62, min: 50, max: 80 }),
      numberField("yearsOfService", "Years of Service (before sick leave)", { default: 25, max: 50 }),
      currencyField("high3Salary", "High-3 Average Salary", { default: 95000, max: 500000, step: 500 }),
    ],
    calcResult: { label: "Service Credit (years)", format: "number" },
    calcResults: [
      { key: "serviceCreditYears", label: "Service Credit (years)", format: "number", highlight: true },
      { key: "serviceCreditMonths", label: "Whole Months Credited", format: "number" },
      { key: "serviceCreditExtraDays", label: "Extra Days", format: "number" },
      { key: "addedAnnualAnnuity", label: "Added Annual Annuity", format: "currency" },
      { key: "addedMonthlyAnnuity", label: "Added Monthly Annuity", format: "currency" },
    ],
    instructions: "Enter your unused sick leave hours, your system, age and years of service at retirement, and your high-3 salary.",
    examples: `Example: 1,200 unused hours add ${exSlc.serviceCreditMonths} months and ${exSlc.serviceCreditExtraDays} days of credit — about ${usd(exSlc.addedAnnualAnnuity)} a year more FERS annuity at a $95,000 high-3.`,
    assumptions: "OPM chart: 2,087 hours = 1 year (174 hours ≈ 1 month); sick leave counts for computing the annuity but not for retirement eligibility. FERS multiplier 1% (1.1% at 62+ with 20 years); CSRS approximated at 2%. " + DISCLAIMER,
    faq: [
      { question: "Does unused sick leave count toward FERS retirement?", answer: "Yes — 100% of unused sick leave is added to service for computing your annuity (not for eligibility)." },
      { question: "How many hours of sick leave equal a month?", answer: "About 174 hours on OPM's conversion chart (2,087 hours = one year)." },
    ],
  },
  {
    slug: "statutory-sick-pay-calculator",
    title: "Statutory Sick Pay (SSP) Calculator",
    description: "Calculate UK Statutory Sick Pay from April 2026 — £123.25 a week or 80% of your average weekly earnings if lower, paid from the first day of sickness for up to 28 weeks.",
    metaTitle: "Statutory Sick Pay Calculator 2026/27 — SSP from Day One",
    metaDescription: "Free SSP calculator for 2026/27. £123.25 a week or 80% of earnings, paid from day one of sickness, with daily rate and weeks remaining.",
    calcInputs: [
      currencyField("averageWeeklyEarnings", "Average Weekly Earnings (£, last 8 weeks)", { default: 450, max: 10000, step: 5 }),
      numberField("qualifyingDaysPerWeek", "Qualifying (Working) Days per Week", { default: 5, min: 1, max: 7 }),
      numberField("sickDays", "Qualifying Days Off Sick", { default: 8, max: 196 }),
    ],
    calcResult: { label: "Total SSP", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "totalSsp", label: "Total SSP", format: "currency", currency: "GBP", highlight: true },
      { key: "weeklySsp", label: "Weekly SSP", format: "currency", currency: "GBP" },
      { key: "dailySsp", label: "Daily SSP", format: "currency", currency: "GBP" },
      { key: "weeksRemainingOf28", label: "Weeks Left of the 28-Week Limit", format: "number" },
    ],
    instructions: "Enter your average gross weekly earnings over the 8 weeks before you went sick, the days you normally work, and the working days you've been off.",
    examples: `Example: earning ${gbp(450)} a week and off sick for 8 working days on a 5-day week: SSP is ${gbp(exSsp.weeklySsp)} a week (${gbp(exSsp.dailySsp)} a day) — ${gbp(exSsp.totalSsp)} in total.`,
    assumptions: "From 6 April 2026 (Employment Rights Act 2025): SSP is paid from the first qualifying day with no waiting days and no lower earnings limit, at £123.25 a week or 80% of average weekly earnings, whichever is lower, for up to 28 weeks. Many employers pay more under contractual sick pay. " + DISCLAIMER,
    faq: [
      { question: "How much is SSP in 2026?", answer: "£123.25 a week, or 80% of your average weekly earnings if that's less, from 6 April 2026." },
      { question: "Is SSP paid from the first day?", answer: "Yes — from April 2026 the three waiting days were removed." },
    ],
  },
  {
    slug: "nhs-sick-pay-calculator",
    title: "NHS Sick Pay Calculator",
    description: "Check your NHS Agenda for Change sick pay entitlement — months on full pay and half pay by length of NHS service — and what it's worth.",
    metaTitle: "NHS Sick Pay Calculator — Agenda for Change Entitlement",
    metaDescription: "Free NHS sick pay calculator. Full-pay and half-pay months by years of service (AfC section 14) and the value of your entitlement.",
    calcInputs: [numberField("yearsOfService", "Years of Reckonable NHS Service", { default: 3, max: 50, step: 0.25 }), currencyField("monthlyPay", "Monthly Pay (£)", { default: 2600, max: 20000, step: 10 })],
    calcResult: { label: "Total Sick Pay Entitlement", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "totalSickPayEntitlement", label: "Total Sick Pay Entitlement", format: "currency", currency: "GBP", highlight: true },
      { key: "fullPayMonths", label: "Months on Full Pay", format: "number" },
      { key: "halfPayMonths", label: "Months on Half Pay", format: "number" },
      { key: "fullPayValue", label: "Full-Pay Value", format: "currency", currency: "GBP" },
      { key: "halfPayValue", label: "Half-Pay Value", format: "currency", currency: "GBP" },
    ],
    instructions: "Enter your reckonable NHS service (previous NHS employment usually counts) and your monthly pay.",
    examples: `Example: with 3 years' service you get ${exNhs.fullPayMonths} months on full pay and ${exNhs.halfPayMonths} on half pay — worth about ${gbp(exNhs.totalSickPayEntitlement)} at ${gbp(2600)} a month.`,
    assumptions: "NHS Terms and Conditions (Agenda for Change) section 14: first year 1 month full + 2 half; second year 2 + 2; third year 4 + 4; fourth and fifth year 5 + 5; after 5 years 6 + 6, in any rolling 12 months. SSP is included within it. " + DISCLAIMER,
    faq: [
      { question: "How long do NHS staff get full sick pay?", answer: "From 1 month in the first year up to 6 months full pay and 6 months half pay after 5 years' service." },
      { question: "Does NHS sick pay include SSP?", answer: "Yes — statutory sick pay is part of (not on top of) NHS occupational sick pay." },
    ],
  },
  {
    slug: "severance-pay-calculator",
    title: "Severance Pay Calculator",
    description: "Estimate a severance package — weeks of pay per year of service, minimum and maximum weeks, PTO payout and bonus — and what you'd take home after withholding.",
    metaTitle: "Severance Pay Calculator — Weeks per Year & Package Value",
    metaDescription: "Free severance pay calculator. Weeks of pay per year of service with minimum/maximum, PTO payout and after-tax estimate.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 78000, max: 2000000, step: 500 }),
      numberField("yearsOfService", "Years of Service", { default: 6, max: 50, step: 0.5 }),
      numberField("weeksPerYear", "Weeks of Pay per Year of Service", { default: 2, max: 8, step: 0.5 }),
      numberField("minimumWeeks", "Minimum Weeks", { default: 4, max: 52 }),
      numberField("maxWeeks", "Maximum Weeks (0 = none)", { default: 26, max: 104 }),
      currencyField("ptoPayout", "Unused PTO Payout", { default: 1500, max: 100000, step: 50 }),
      currencyField("bonusOrOther", "Bonus / Other Payments", { default: 0, max: 1000000, step: 50 }),
      percentField("withholdingPercent", "Estimated Withholding", { default: 30, max: 60 }),
    ],
    calcResult: { label: "Severance Pay", format: "currency" },
    calcResults: [
      { key: "severancePay", label: "Severance Pay", format: "currency", highlight: true },
      { key: "totalPackage", label: "Total Package", format: "currency" },
      { key: "weeksOfPay", label: "Weeks of Pay", format: "number" },
      { key: "afterTaxEstimate", label: "After-Tax Estimate", format: "currency" },
      { key: "weeklyPay", label: "Weekly Pay", format: "currency" },
    ],
    instructions: "Enter your salary and years of service and the formula your employer's plan uses (1–2 weeks per year is common, often with a minimum and maximum). Add accrued PTO and any bonus in the package.",
    examples: `Example: ${usd(78000)} with 6 years at 2 weeks per year is ${exSev.weeksOfPay} weeks — ${usd(exSev.severancePay)}, or ${usd(exSev.totalPackage)} with PTO, about ${usd(exSev.afterTaxEstimate)} after withholding.`,
    assumptions: "US law doesn't require severance (except some WARN Act notice pay); amounts come from company plans and negotiation, often in exchange for a release of claims. Severance is taxable as supplemental wages. " + DISCLAIMER,
    faq: [
      { question: "How much severance is normal?", answer: "Often 1–2 weeks of pay per year of service, with more for senior roles or when negotiating a release of claims." },
      { question: "Is severance taxed differently?", answer: "It's ordinary wage income, often withheld at the 22% supplemental rate plus FICA." },
    ],
  },
  {
    slug: "saudi-end-of-service-calculator",
    title: "Saudi End of Service Calculator (EOSB)",
    description: "Calculate end of service benefits in Saudi Arabia — half a month's wage per year for the first 5 years and a full month after — with the reductions that apply when you resign.",
    metaTitle: "End of Service Calculator — Saudi Labor Law EOSB",
    metaDescription: "Free Saudi end of service benefit calculator. Half-month per year (first 5 years), one month after, and the 1/3, 2/3 resignation rules.",
    calcInputs: [currencyField("monthlyWage", "Last Monthly Wage (basic + housing + fixed allowances, SAR)", { default: 12000, max: 1000000, step: 100 }), numberField("yearsOfService", "Years of Service", { default: 7, max: 50, step: 0.25 }), dropdown("reason", "Reason for Leaving", [["Contract ended / terminated by employer", 0], ["Resigned", 1]], 0)],
    calcResult: { label: "End of Service Award", format: "number" },
    calcResults: [
      { key: "endOfServiceAward", label: "End of Service Award (SAR)", format: "number", highlight: true },
      { key: "fullAwardIfTerminated", label: "Full Award (SAR)", format: "number" },
      { key: "resignationFactorPercent", label: "Share Paid", format: "percentage" },
      { key: "monthsOfWage", label: "Months of Wage", format: "number" },
    ],
    instructions: "Enter your last wage (basic plus housing and other fixed allowances), your years of service and whether you resigned or your contract ended/was terminated.",
    examples: `Example: 7 years on SAR 12,000 a month gives SAR ${exKsa.endOfServiceAward.toLocaleString()} when the contract ends; resigning would pay 2/3 — SAR ${exKsa2.endOfServiceAward.toLocaleString()}.`,
    assumptions: "Saudi Labor Law art. 84: half a month's wage for each of the first five years and one month for each year after, pro rata for part years. Art. 85 (resignation): nothing under 2 years, one third for 2–5 years, two thirds for 5–10 years, the full award after 10 years. Women resigning within 6 months of marriage or 3 months of childbirth, and force majeure cases, get the full award. " + DISCLAIMER,
    faq: [
      { question: "How is end of service calculated in Saudi Arabia?", answer: "Half a month's wage per year for the first 5 years and a full month for each year after, based on your last wage." },
      { question: "Do I get end of service if I resign?", answer: "After 2 years — one third (2–5 years), two thirds (5–10 years) or the full amount after 10 years." },
    ],
  },
  {
    slug: "uae-gratuity-calculator",
    title: "UAE Gratuity Calculator (End of Service)",
    description: "Calculate end of service gratuity in the UAE (Dubai, Abu Dhabi) under the 2021 Labour Law — 21 days' basic salary per year for the first 5 years and 30 days after, capped at 2 years' wages.",
    metaTitle: "UAE Gratuity Calculator 2026 — Dubai End of Service",
    metaDescription: "Free UAE gratuity calculator. 21 days' basic pay per year for 5 years, 30 days after, capped at two years' wages (Decree-Law 33/2021).",
    calcInputs: [currencyField("monthlyBasicSalary", "Last Monthly Basic Salary (AED)", { default: 10000, max: 1000000, step: 100 }), numberField("yearsOfService", "Years of Service", { default: 7, max: 50, step: 0.25 })],
    calcResult: { label: "Gratuity", format: "currency", currency: "AED" },
    calcResults: [
      { key: "gratuity", label: "End of Service Gratuity", format: "currency", currency: "AED", highlight: true },
      { key: "daysOfWage", label: "Days of Basic Wage", format: "number" },
      { key: "dailyBasicWage", label: "Daily Basic Wage", format: "currency", currency: "AED" },
      { key: "cappedAtTwoYears", label: "Capped at 2 Years' Wages? (1 = yes)", format: "number" },
    ],
    instructions: "Enter your last basic monthly salary (excluding housing and other allowances) and your total years of continuous service (at least 1 year is required).",
    examples: `Example: 7 years on an AED 10,000 basic salary is ${exUae.daysOfWage} days' wages — AED ${exUae.gratuity.toLocaleString()} gratuity.`,
    assumptions: "Federal Decree-Law 33/2021 art. 51 (private sector): 21 days' basic wage per year for the first 5 years, 30 days per year after, pro rata for part years, total capped at 2 years' wages; no reduction for resignation under the new law. Daily wage = basic × 12 ÷ 365. DIFC/ADGM and government employees use different schemes. " + DISCLAIMER,
    faq: [
      { question: "How is gratuity calculated in the UAE?", answer: "21 days of basic salary for each of the first 5 years and 30 days for each year after, up to a maximum of two years' wages." },
      { question: "Do I lose gratuity if I resign in Dubai?", answer: "Not under the 2021 Labour Law — the old resignation reductions were removed." },
    ],
  },
  {
    slug: "uk-redundancy-pay-calculator",
    title: "UK Statutory Redundancy Pay Calculator",
    description: "Calculate UK statutory redundancy pay from April 2026 — half a week, a week or a week and a half per year of service by age, on weekly pay capped at £751, up to 20 years.",
    metaTitle: "UK Redundancy Pay Calculator 2026 — Statutory Entitlement",
    metaDescription: "Free UK redundancy pay calculator. 0.5/1/1.5 weeks per year by age, £751 weekly cap from April 2026, maximum £22,530.",
    calcInputs: [numberField("age", "Age at Redundancy", { default: 45, min: 16, max: 80 }), numberField("yearsOfService", "Complete Years of Service", { default: 10, max: 50 }), currencyField("weeklyPay", "Weekly Gross Pay (£)", { default: 820, max: 10000, step: 5 })],
    calcResult: { label: "Statutory Redundancy Pay", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "statutoryRedundancyPay", label: "Statutory Redundancy Pay", format: "currency", currency: "GBP", highlight: true },
      { key: "weeksOfPay", label: "Weeks of Pay", format: "number" },
      { key: "weeklyPayUsed", label: "Weekly Pay Used (capped)", format: "currency", currency: "GBP" },
      { key: "eligible", label: "2+ Years' Service? (1 = yes)", format: "number" },
      { key: "maximumPossible", label: "Maximum Statutory Payment", format: "currency", currency: "GBP" },
    ],
    instructions: "Enter your age on the date you're made redundant, complete years of continuous service and your gross weekly pay.",
    examples: `Example: aged 45 with 10 years' service on ${gbp(820)} a week (capped at ${gbp(751)}): ${exRed.weeksOfPay} weeks — ${gbp(exRed.statutoryRedundancyPay)}.`,
    assumptions: "Employment Rights Act 1996: for each complete year — 0.5 week's pay under 22, 1 week at 22–40, 1.5 weeks at 41+; maximum 20 years counted; week's pay capped at £751 from 6 April 2026 (max £22,530). Needs 2 years' service. The first £30,000 of redundancy pay is tax-free. Northern Ireland's cap differs. " + DISCLAIMER,
    faq: [
      { question: "How much is statutory redundancy pay in 2026?", answer: "Up to 1.5 weeks' pay per year of service depending on age, with weekly pay capped at £751 — a maximum of £22,530." },
      { question: "Is redundancy pay taxed in the UK?", answer: "The first £30,000 of genuine redundancy pay is tax-free; notice pay is taxed as normal pay." },
    ],
  },
  {
    slug: "uk-notice-period-calculator",
    title: "UK Notice Period Calculator",
    description: "Work out your UK notice period and last day of employment — the statutory minimum (1 week per year up to 12) or your contractual notice such as one month, whichever is longer — and pay in lieu.",
    metaTitle: "UK Notice Period Calculator — Last Day & Statutory Notice",
    metaDescription: "Free UK notice period calculator. Statutory notice (1 week per year, max 12), contractual notice (e.g. 1 month), last working day and pay in lieu.",
    calcInputs: [
      dateField("noticeGivenDate", "Date Notice Is Given"),
      numberField("yearsOfService", "Years of Service", { default: 6, max: 50, step: 0.25 }),
      dropdown("whoGivesNotice", "Who Gives Notice?", [["Employer (dismissal / redundancy)", 0], ["Employee (resignation)", 1]], 0),
      numberField("contractualNoticeMonths", "Contractual Notice — Months", { default: 1, max: 12 }),
      numberField("contractualNoticeWeeks", "Contractual Notice — Weeks", { default: 0, max: 52 }),
      currencyField("weeklyPay", "Weekly Pay (£, for pay in lieu)", { default: 700, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Last Day of Employment", format: "date" },
    calcResults: [
      { key: "lastDayOfEmployment", label: "Last Day of Employment", format: "date", highlight: true },
      { key: "noticeWeeks", label: "Notice Length (weeks)", format: "number" },
      { key: "statutoryMinimumWeeks", label: "Statutory Minimum (weeks)", format: "number" },
      { key: "payInLieuValue", label: "Pay in Lieu of Notice", format: "currency", currency: "GBP" },
    ],
    instructions: "Pick the date notice is given, your length of service, who is giving notice and the notice in your contract (enter 0 if there's none).",
    examples: `Example: an employer giving notice on ${fmtDay(D0)} to someone with 6 years' service and a 1-month contractual notice must give 6 weeks (the statutory minimum is longer) — last day ${fmtDay(exNot.lastDayOfEmployment)}.`,
    assumptions: "Employment Rights Act 1996 s.86: employers must give at least 1 week's notice after 1 month's service, then 1 week per complete year up to 12 weeks; employees must give at least 1 week. Longer contractual notice applies when it's more. Notice usually runs from the day after it's given. " + DISCLAIMER,
    faq: [
      { question: "What is the statutory notice period in the UK?", answer: "From the employer, 1 week per complete year of service (minimum 1, maximum 12); from the employee, at least 1 week." },
      { question: "Can my employer pay me instead of notice?", answer: "Yes, if the contract allows pay in lieu of notice (PILON); it's taxed like normal pay." },
    ],
  },
  {
    slug: "ontario-severance-pay-calculator",
    title: "Ontario Severance Pay Calculator (ESA)",
    description: "Calculate minimum Ontario termination pay and severance pay under the Employment Standards Act — 1 week per year up to 8 weeks' termination pay, plus 1 week per year up to 26 weeks' severance for 5+ years with a large employer.",
    metaTitle: "Ontario Severance Pay Calculator — ESA Termination & Severance",
    metaDescription: "Free Ontario severance calculator. ESA termination pay (up to 8 weeks) and severance pay (up to 26 weeks) for 5+ years with a $2.5M payroll employer.",
    calcInputs: [numberField("yearsOfService", "Years of Service", { default: 9, max: 50, step: 0.25 }), currencyField("weeklyPay", "Regular Weekly Wages (CAD)", { default: 1500, max: 50000, step: 10 }), dropdown("payrollOver25M", "Employer Payroll $2.5M+ (or 50+ laid off)?", [["Yes", 1], ["No", 0]], 1)],
    calcResult: { label: "Total ESA Entitlement", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "totalEsaEntitlement", label: "Total ESA Entitlement", format: "currency", currency: "CAD", highlight: true },
      { key: "terminationPay", label: "Termination Pay", format: "currency", currency: "CAD" },
      { key: "severancePay", label: "Severance Pay", format: "currency", currency: "CAD" },
      { key: "terminationWeeks", label: "Termination Weeks", format: "number" },
      { key: "severanceWeeks", label: "Severance Weeks", format: "number" },
    ],
    instructions: "Enter your years of service, regular weekly wages and whether the employer's global payroll is at least $2.5 million (or it's a mass severance of 50+ employees in 6 months).",
    examples: `Example: 9 years on $1,500 a week with a large employer: ${exOn.terminationWeeks} weeks' termination pay and ${exOn.severanceWeeks} weeks' severance — $${exOn.totalEsaEntitlement.toLocaleString("en-CA")} minimum.`,
    assumptions: "Employment Standards Act, 2000: termination pay (or notice) 1 week per year of service from 3 months, max 8 weeks; severance pay 1 week per year including partial years, max 26 weeks, for 5+ years if the payroll test is met. These are minimums — common-law 'reasonable notice' is often much higher. " + DISCLAIMER,
    faq: [
      { question: "How much severance pay do you get in Ontario?", answer: "Under the ESA, one week per year of service up to 26 weeks if you have 5+ years and the employer has a $2.5M payroll, plus up to 8 weeks' termination pay." },
      { question: "Is ESA severance all I'm entitled to?", answer: "It's the minimum — unless your contract validly limits it, common-law reasonable notice can be several months' pay per year of service." },
    ],
  },
  {
    slug: "ontario-stat-holiday-pay-calculator",
    title: "Ontario Stat Holiday Pay Calculator",
    description: "Calculate Ontario public holiday pay — regular wages plus vacation pay earned in the 4 work weeks before the holiday, divided by 20 — and premium pay if you work the holiday.",
    metaTitle: "Ontario Stat Holiday Pay Calculator — Public Holiday Pay",
    metaDescription: "Free Ontario public holiday pay calculator. Wages and vacation pay in the 4 weeks before ÷ 20, plus 1.5× premium pay for working the holiday.",
    calcInputs: [
      currencyField("regularWagesLast4Weeks", "Regular Wages in the 4 Work Weeks Before (CAD)", { default: 4400, max: 100000, step: 10 }),
      currencyField("vacationPayLast4Weeks", "Vacation Pay in Those Weeks", { default: 0, max: 20000, step: 10 }),
      dropdown("workedTheHoliday", "Working the Holiday?", YESNO, 1),
      numberField("hoursWorkedOnHoliday", "Hours Worked on the Holiday", { default: 8, max: 24, step: 0.25 }),
      currencyField("hourlyRate", "Regular Hourly Rate", { default: 27.5, max: 500, step: 0.05 }),
    ],
    calcResult: { label: "Total for the Holiday", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "totalForTheHoliday", label: "Total for the Holiday", format: "currency", currency: "CAD", highlight: true },
      { key: "publicHolidayPay", label: "Public Holiday Pay", format: "currency", currency: "CAD" },
      { key: "premiumForWorking", label: "Premium Pay for Working (1.5×)", format: "currency", currency: "CAD" },
    ],
    instructions: "Add up regular wages (not overtime) and vacation pay earned in the 4 work weeks before the holiday's work week. If you work the holiday, enter the hours.",
    examples: `Example: $4,400 of wages in the 4 weeks before gives $${exOs.publicHolidayPay.toLocaleString("en-CA")} holiday pay; working 8 hours that day adds $${exOs.premiumForWorking.toLocaleString("en-CA")} premium pay.`,
    assumptions: "ESA s.24: public holiday pay = (regular wages + vacation pay payable in the 4 work weeks before the work week of the holiday) ÷ 20. Working the holiday: either regular wages + a substitute day off, or holiday pay + premium pay at 1.5 × (modelled). Ontario has 9 public holidays. " + DISCLAIMER,
    faq: [
      { question: "How is stat holiday pay calculated in Ontario?", answer: "Total regular wages and vacation pay earned in the 4 work weeks before the holiday week, divided by 20." },
      { question: "Do part-time workers get stat holiday pay in Ontario?", answer: "Yes — the same formula applies, so it reflects what they actually earned." },
    ],
  },
  {
    slug: "i-9-retention-calculator",
    title: "I-9 Retention Calculator",
    description: "Find out how long to keep a Form I-9 — the later of 3 years after the hire date or 1 year after employment ends — and the exact date you can destroy it.",
    metaTitle: "I-9 Retention Calculator — When Can I Destroy an I-9?",
    metaDescription: "Free Form I-9 retention calculator. Later of 3 years after hire or 1 year after termination — get the exact destruction date.",
    calcInputs: [dateField("hireDate", "Date of Hire (first day of work)", "today-1500"), dropdown("stillEmployed", "Employee Status", [["No longer employed", 0], ["Still employed", 1]], 0), dateField("terminationDate", "Termination Date")],
    calcResult: { label: "Destroy After", format: "date" },
    calcResults: [
      { key: "destroyAfterDate", label: "Keep Until (destroy after)", format: "date", highlight: true },
      { key: "threeYearsAfterHire", label: "3 Years After Hire", format: "date" },
      { key: "oneYearAfterTermination", label: "1 Year After Termination", format: "date" },
      { key: "mustKeepWhileEmployed", label: "Still Employed — Keep It? (1 = yes)", format: "number" },
    ],
    instructions: "Enter the first day of work (not the offer date) and, if the person has left, the termination date.",
    examples: `Example: hired ${fmtDay(18500)} and terminated ${fmtDay(D0)}: keep the I-9 until ${fmtDay(exI9.destroyAfterDate)}.`,
    assumptions: "8 CFR §274a.2(b)(2): employers must keep Form I-9 for current employees, and after employment ends for the later of 3 years after the date of hire or 1 year after the termination date. Penalties apply for missing forms on inspection. " + DISCLAIMER,
    faq: [
      { question: "How long do I keep I-9 forms?", answer: "As long as the person works for you, then until the later of 3 years after hire or 1 year after they leave." },
      { question: "Can I keep I-9s electronically?", answer: "Yes, if the system meets DHS electronic storage requirements (integrity, indexing and audit trail)." },
    ],
  },
  {
    slug: "notice-period-calculator",
    title: "Notice Period Calculator (Two Weeks, 30 & 60 Days)",
    description: "Find the last day of a notice period — two weeks' notice, 30 or 60 days, a number of business days or months — from the date you give notice.",
    metaTitle: "Notice Period Calculator — Two Weeks, 30 & 60 Day Notice",
    metaDescription: "Free notice period calculator. Count calendar days, business days, weeks or months from your notice date to find your last day.",
    calcInputs: [dateField("noticeDate", "Date Notice Is Given"), numberField("noticeLength", "Notice Length", { default: 14, max: 365 }), dropdown("unit", "Counted In", [["Calendar days", 0], ["Business days (Mon–Fri)", 1], ["Weeks", 2], ["Months", 3]], 0)],
    calcResult: { label: "Last Day", format: "date" },
    calcResults: [
      { key: "lastDay", label: "Last Day of the Notice Period", format: "date", highlight: true },
      { key: "calendarDays", label: "Calendar Days", format: "number" },
      { key: "weeksOfNotice", label: "Weeks", format: "number" },
    ],
    instructions: "Pick the day you give (or receive) notice and the length — 14 calendar days for two weeks' notice, 30 or 60 days for lease or WARN notices, or business days if your contract counts working days only.",
    examples: `Example: two weeks' notice given on ${fmtDay(D0)} ends on ${fmtDay(exNp.lastDay)}.`,
    assumptions: "Counting starts the day after notice is given. Business-day counting skips Saturdays and Sundays but not public holidays. Your contract, lease or statute (e.g. the WARN Act's 60 days) decides how notice is counted and delivered. " + DISCLAIMER,
    faq: [
      { question: "Does two weeks' notice include weekends?", answer: "Usually it means 14 calendar days, so weekends count; some employers mean 10 working days." },
      { question: "Is two weeks' notice required by law?", answer: "Not in at-will US employment — it's a courtesy unless your contract requires it." },
    ],
  },
  {
    slug: "wrongful-termination-settlement-calculator",
    title: "Wrongful Termination Settlement Calculator",
    description: "Estimate the value of a wrongful termination claim — lost wages (back pay) after other earnings, front pay, emotional distress and punitive damages — adjusted for your chances and attorney fees.",
    metaTitle: "Wrongful Termination Settlement Calculator — Claim Value",
    metaDescription: "Free wrongful termination settlement estimator. Back pay, front pay, emotional distress and punitive damages, risk-adjusted, after attorney fees.",
    calcInputs: [
      currencyField("annualSalary", "Annual Pay When Fired", { default: 85000, max: 5000000, step: 500 }),
      numberField("monthsUnemployed", "Months Out of Work (or to trial)", { default: 8, max: 120 }),
      currencyField("interimEarnings", "Earnings from Other Work Since", { default: 12000, max: 5000000, step: 100 }),
      numberField("frontPayMonths", "Front Pay Months (future lost pay)", { default: 6, max: 120 }),
      currencyField("emotionalDistressDamages", "Emotional Distress Damages (estimate)", { default: 40000, max: 10000000, step: 1000 }),
      currencyField("punitiveDamages", "Punitive Damages (if any)", { default: 50000, max: 100000000, step: 1000 }),
      percentField("attorneyFeePercent", "Attorney Contingency Fee", { default: 33, max: 50 }),
      percentField("chanceOfWinningPercent", "Chance of Winning", { default: 60, step: 5 }),
    ],
    calcResult: { label: "Estimated Settlement Value", format: "currency" },
    calcResults: [
      { key: "estimatedSettlementValue", label: "Risk-Adjusted Settlement Value", format: "currency", highlight: true },
      { key: "backPay", label: "Back Pay", format: "currency" },
      { key: "frontPay", label: "Front Pay", format: "currency" },
      { key: "compensatoryAndPunitive", label: "Emotional Distress + Punitive", format: "currency" },
      { key: "attorneyFees", label: "Attorney Fees (risk-adjusted)", format: "currency" },
      { key: "netToYou", label: "Net to You (risk-adjusted)", format: "currency" },
    ],
    instructions: "Enter your pay, how long you've been out of work and what you've earned since (you must look for work to mitigate). Emotional distress and punitive damages vary hugely — use conservative numbers. The chance of winning turns the full-trial value into a realistic settlement range.",
    examples: `Example: ${usd(85000)} pay, 8 months out of work with ${usd(12000)} earned elsewhere, 6 months of front pay, ${usd(40000)} distress and ${usd(50000)} punitive at a 60% chance: about ${usd(exWt.estimatedSettlementValue)} — ${usd(exWt.netToYou)} after a 33% fee.`,
    assumptions: "Back pay = lost pay − interim earnings; front pay = future lost pay. State-law claims (e.g. retaliation, public policy) often have no damages cap, unlike federal discrimination claims. Most cases settle below the full trial value; taxes on settlements aren't deducted. " + DISCLAIMER,
    faq: [
      { question: "What is the average wrongful termination settlement?", answer: "Most settle for a few months to a year or two of pay; cases with strong evidence or punitive damages can be much higher." },
      { question: "Is a wrongful termination settlement taxable?", answer: "Back and front pay are taxed as wages; emotional distress damages are usually taxable unless tied to a physical injury." },
    ],
  },
  {
    slug: "discrimination-settlement-calculator",
    title: "Discrimination Lawsuit Settlement Calculator",
    description: "Estimate an employment discrimination settlement — back pay, front pay, and compensatory and punitive damages limited by the Title VII caps for your employer's size — adjusted for risk and fees.",
    metaTitle: "Discrimination Settlement Calculator — Title VII Damages Caps",
    metaDescription: "Free discrimination lawsuit settlement estimator. Back pay, front pay and capped compensatory/punitive damages ($50k–$300k by employer size).",
    calcInputs: [
      currencyField("annualSalary", "Annual Pay", { default: 85000, max: 5000000, step: 500 }),
      numberField("monthsUnemployed", "Months of Lost Pay So Far", { default: 8, max: 120 }),
      currencyField("interimEarnings", "Earnings from Other Work Since", { default: 12000, max: 5000000, step: 100 }),
      numberField("frontPayMonths", "Front Pay Months", { default: 6, max: 120 }),
      currencyField("emotionalDistressDamages", "Compensatory (emotional distress) Damages", { default: 40000, max: 10000000, step: 1000 }),
      currencyField("punitiveDamages", "Punitive Damages", { default: 50000, max: 100000000, step: 1000 }),
      numberField("employerSize", "Employer's Number of Employees", { default: 150, min: 1, max: 1000000 }),
      percentField("attorneyFeePercent", "Attorney Contingency Fee", { default: 33, max: 50 }),
      percentField("chanceOfWinningPercent", "Chance of Winning", { default: 60, step: 5 }),
    ],
    calcResult: { label: "Estimated Settlement Value", format: "currency" },
    calcResults: [
      { key: "estimatedSettlementValue", label: "Risk-Adjusted Settlement Value", format: "currency", highlight: true },
      { key: "backPay", label: "Back Pay", format: "currency" },
      { key: "frontPay", label: "Front Pay", format: "currency" },
      { key: "compensatoryAndPunitive", label: "Compensatory + Punitive (after cap)", format: "currency" },
      { key: "damagesCap", label: "Title VII Damages Cap", format: "currency" },
      { key: "netToYou", label: "Net to You (risk-adjusted)", format: "currency" },
    ],
    instructions: "Enter your lost pay, other earnings since, and estimates of emotional distress and punitive damages. The employer's size sets the federal cap on compensatory plus punitive damages.",
    examples: `Example: with an employer of 150 people the cap on compensatory and punitive damages is ${usd(exDs.damagesCap)}, so the same facts as above settle for about ${usd(exDs.estimatedSettlementValue)} risk-adjusted.`,
    assumptions: "42 U.S.C. §1981a(b)(3) caps compensatory + punitive damages for Title VII and ADA claims: 15–100 employees $50,000; 101–200 $100,000; 201–500 $200,000; 500+ $300,000 (back pay and front pay aren't capped). Claims under §1981 (race) and many state laws aren't capped. You must file with the EEOC (180/300 days) first. " + DISCLAIMER,
    faq: [
      { question: "What are the damages caps for discrimination?", answer: "Under Title VII and the ADA, compensatory plus punitive damages are capped at $50,000–$300,000 depending on employer size; lost wages aren't capped." },
      { question: "How long do I have to file a discrimination charge?", answer: "180 days from the discrimination, or 300 days in states with their own fair employment agency." },
    ],
  },
  {
    slug: "pay-gap-calculator",
    title: "Pay Gap Calculator (Gender & Wage Gap)",
    description: "Calculate the pay gap between two groups — percentage gap, cents on the dollar, the yearly difference and how many days a year the lower-paid group effectively works for free.",
    metaTitle: "Pay Gap Calculator — Gender Pay Gap & Cents on the Dollar",
    metaDescription: "Free pay gap calculator. Compare average or median pay of two groups: % gap, cents per dollar, annual difference and 'days worked for free'.",
    calcInputs: [currencyField("higherGroupPay", "Higher-Paid Group — Average or Median Pay", { default: 72000, max: 10000000, step: 100 }), currencyField("lowerGroupPay", "Lower-Paid Group — Average or Median Pay", { default: 61000, max: 10000000, step: 100 }), dropdown("payIsHourly", "Pay Entered As", [["Annual", 0], ["Hourly", 1]], 0), numberField("annualHours", "Hours per Year (hourly pay)", { default: 2080, max: 4000 })],
    calcResult: { label: "Pay Gap", format: "percentage" },
    calcResults: [
      { key: "payGapPercent", label: "Pay Gap", format: "percentage", highlight: true },
      { key: "centsPerDollar", label: "Cents Earned per Dollar", format: "number" },
      { key: "annualDifference", label: "Yearly Difference", format: "currency" },
      { key: "daysWorkedForFreePerYear", label: "Workdays 'for Free' per Year", format: "number" },
    ],
    instructions: "Enter the average or median pay for each group (for example men and women in the same role). For an equal-pay comparison use the same job, level and hours.",
    examples: `Example: ${usd(72000)} vs ${usd(61000)} is a ${exPg.payGapPercent}% gap — ${exPg.centsPerDollar} cents on the dollar, ${usd(exPg.annualDifference)} a year.`,
    assumptions: "Pay gap = (higher − lower) ÷ higher. UK gender pay gap reporting uses both mean and median hourly pay; the US Equal Pay Act requires equal pay for substantially equal work. A raw gap isn't proof of discrimination — job, experience and hours explain part of it. " + DISCLAIMER,
    faq: [
      { question: "What is the gender pay gap in the US?", answer: "Women working full time earn roughly 81–84 cents for each dollar men earn, depending on the measure." },
      { question: "Is a pay gap illegal?", answer: "Paying different wages for substantially equal work because of sex is illegal under the Equal Pay Act; gaps from different jobs or hours are not by themselves." },
    ],
  },
  {
    slug: "osha-incident-rate-calculator",
    title: "OSHA Incident Rate Calculator (TRIR & DART)",
    description: "Calculate OSHA incident rates — total recordable (TRIR), days away, restricted or transferred (DART), lost time and severity rates — per 200,000 hours worked.",
    metaTitle: "OSHA Incident Rate Calculator — TRIR, DART & LTIR",
    metaDescription: "Free OSHA incident rate calculator. TRIR, DART, lost time and severity rates per 200,000 hours from your OSHA 300 log.",
    calcInputs: [
      numberField("recordableCases", "Total Recordable Cases (OSHA 300 log)", { default: 6, max: 10000 }),
      numberField("dartCases", "DART Cases (days away, restricted, transferred)", { default: 3, max: 10000 }),
      numberField("lostTimeCases", "Lost Time (days away) Cases", { default: 2, max: 10000 }),
      numberField("daysAwayTotal", "Total Days Away from Work", { default: 45, max: 1000000 }),
      numberField("totalHoursWorked", "Total Hours Worked by All Employees", { default: 420000, min: 1, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "TRIR", format: "number" },
    calcResults: [
      { key: "trir", label: "TRIR (Total Recordable Incident Rate)", format: "number", highlight: true },
      { key: "dartRate", label: "DART Rate", format: "number" },
      { key: "lostTimeRate", label: "Lost Time Incident Rate", format: "number" },
      { key: "severityRate", label: "Severity Rate (days away per 200,000 h)", format: "number" },
      { key: "equivalentFullTimeWorkers", label: "Equivalent Full-Time Workers", format: "number" },
    ],
    instructions: "Count cases from your OSHA 300 log for the year and total hours actually worked (from payroll — exclude vacation and sick time).",
    examples: `Example: 6 recordables, 3 DART cases and 2 lost-time cases over 420,000 hours give a TRIR of ${exOsha.trir} and a DART rate of ${exOsha.dartRate}.`,
    assumptions: "Rate = cases × 200,000 ÷ hours worked (200,000 = 100 full-time workers × 2,000 hours). Compare with the BLS average for your NAICS code. " + DISCLAIMER,
    faq: [
      { question: "What is a good TRIR?", answer: "It depends on the industry — the private-industry average is around 2.4; construction is around 2.3–2.8 and office work much lower." },
      { question: "Why 200,000 hours?", answer: "It's 100 full-time employees working 40 hours a week for 50 weeks, so rates are per 100 workers." },
    ],
  },
  {
    slug: "osha-safety-pays-calculator",
    title: "OSHA Safety Pays Calculator (Cost of an Injury)",
    description: "Estimate the true cost of a workplace injury with OSHA's Safety Pays method — direct costs plus indirect costs — and the extra sales needed to cover it at your profit margin.",
    metaTitle: "Safety Pays Calculator — Direct & Indirect Injury Costs",
    metaDescription: "Free OSHA Safety Pays calculator. Indirect cost multiplier, total cost of an injury and the sales needed to pay for it.",
    calcInputs: [currencyField("directCost", "Direct Cost (workers' comp medical + indemnity)", { default: 8000, max: 10000000, step: 100 }), percentField("profitMarginPercent", "Profit Margin", { default: 5, max: 60, step: 0.5 })],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost of the Injury", format: "currency", highlight: true },
      { key: "indirectCost", label: "Indirect Cost", format: "currency" },
      { key: "indirectMultiplier", label: "Indirect Cost Multiplier", format: "number" },
      { key: "salesNeededToCover", label: "Sales Needed to Cover It", format: "currency" },
    ],
    instructions: "Enter the direct cost of the injury (workers' compensation medical and indemnity payments) and your company's profit margin.",
    examples: `Example: an injury with ${usd(8000)} in direct costs has about ${usd(exSp.indirectCost)} in indirect costs — ${usd(exSp.totalCost)} in total, needing ${usd(exSp.salesNeededToCover)} of sales at a 5% margin.`,
    assumptions: "OSHA $afety Pays indirect cost ratios: direct costs under $3,000 × 4.5; $3,000–$4,999 × 1.6; $5,000–$9,999 × 1.2; $10,000+ × 1.1 (lost productivity, training, investigation, damage). " + DISCLAIMER,
    faq: [
      { question: "What are indirect costs of an injury?", answer: "Lost productivity, overtime to cover, training a replacement, investigation time, equipment damage and morale." },
      { question: "Why calculate sales needed?", answer: "Because injury costs come out of profit, a low-margin business needs many times the cost in extra sales to recover it." },
    ],
  },
  {
    slug: "dot-hours-of-service-calculator",
    title: "DOT Hours of Service Calculator (FMCSA)",
    description: "Check how many hours you can still drive under FMCSA hours-of-service rules — the 11-hour driving limit, 14-hour window, 60/70-hour cycle and 30-minute break.",
    metaTitle: "DOT Hours of Service Calculator — 11/14/70 Hour Rules",
    metaDescription: "Free FMCSA hours of service calculator. Remaining driving time under the 11-hour, 14-hour and 60/70-hour limits, plus the 30-minute break.",
    calcInputs: [
      numberField("drivingHoursToday", "Driving Hours Since Last 10-Hour Break", { default: 6.5, max: 24, step: 0.25 }),
      numberField("hoursSinceOnDuty", "Hours Since Coming On Duty (14-hour window)", { default: 9, max: 24, step: 0.25 }),
      dropdown("cycle", "Cycle", [["60 hours / 7 days", 0], ["70 hours / 8 days", 1]], 1),
      numberField("onDutyHoursInCycle", "On-Duty Hours in the Current 7/8 Days", { default: 58, max: 100, step: 0.25 }),
      numberField("drivingSinceLastBreak", "Driving Since Last 30-Minute Break", { default: 5, max: 24, step: 0.25 }),
    ],
    calcResult: { label: "Driving Hours Left", format: "number" },
    calcResults: [
      { key: "drivingHoursLeft", label: "Driving Hours Left Today", format: "number", highlight: true },
      { key: "elevenHourLimitLeft", label: "Left on the 11-Hour Limit", format: "number" },
      { key: "fourteenHourWindowLeft", label: "Left in the 14-Hour Window", format: "number" },
      { key: "cycleHoursLeft", label: "Left in the 60/70-Hour Cycle", format: "number" },
      { key: "breakNeededWithinHours", label: "30-Minute Break Needed Within (hours)", format: "number" },
    ],
    instructions: "Enter your hours from your ELD. Split sleeper berth (7/3 or 8/2) periods pause the 14-hour clock — enter the window hours after excluding the qualifying sleeper period.",
    examples: `Example: after 6.5 hours driving, 9 hours into the window with 58 hours on a 70/8 cycle, you can drive ${exHos.drivingHoursLeft} more hours (the cycle is the limit), and need a 30-minute break within ${exHos.breakNeededWithinHours} hours.`,
    assumptions: "49 CFR Part 395 (property carriers): 11 hours driving after 10 consecutive hours off; no driving after the 14th hour on duty; 60 hours in 7 days or 70 in 8; 30-minute break after 8 cumulative hours of driving; 34-hour restart resets the cycle; split sleeper pairs of at least 7 + 2 hours (totalling 10) exclude the qualifying period from the 14-hour window. Passenger carriers have different limits. " + DISCLAIMER,
    faq: [
      { question: "What is the 14-hour rule?", answer: "You can't drive after the 14th hour since coming on duty, even if you've driven less than 11 hours." },
      { question: "How does the 8/2 split sleeper work?", answer: "An 8-hour sleeper period plus a separate 2+ hour off-duty period count as your 10 hours off, and the 8-hour period doesn't count against the 14-hour window." },
    ],
  },
  {
    slug: "stcw-hours-of-rest-calculator",
    title: "STCW Hours of Rest Calculator",
    description: "Check seafarer hours of rest against STCW and MLC rules — at least 10 hours in any 24, 77 hours in any 7 days, split into no more than two periods with one of at least 6 hours.",
    metaTitle: "STCW Hours of Rest Calculator — 10 in 24, 77 in 7 Days",
    metaDescription: "Free STCW / MLC hours of rest checker. Verify 10 hours in 24, 77 in 7 days and the two-period split with one 6-hour rest.",
    calcInputs: [
      numberField("restHoursLast24", "Rest Hours in the Last 24 Hours", { default: 10, max: 24, step: 0.25 }),
      numberField("restHoursLast7Days", "Rest Hours in the Last 7 Days", { default: 74, max: 168, step: 0.25 }),
      numberField("restPeriodsIn24", "Number of Rest Periods in 24 Hours", { default: 2, min: 1, max: 6 }),
      numberField("longestRestPeriod", "Longest Single Rest Period (hours)", { default: 6, max: 24, step: 0.25 }),
    ],
    calcResult: { label: "Compliant? (1 = yes)", format: "number" },
    calcResults: [
      { key: "compliant", label: "Compliant? (1 = yes)", format: "number", highlight: true },
      { key: "restShortfall24h", label: "Shortfall in 24 Hours", format: "number" },
      { key: "restShortfall7Days", label: "Shortfall in 7 Days", format: "number" },
      { key: "restSplitOk", label: "Rest Split OK? (1 = yes)", format: "number" },
    ],
    instructions: "Enter rest hours from your hours-of-rest record for the last 24 hours and the last 7 days, and how the 24-hour rest was split.",
    examples: `Example: 10 hours' rest in two periods (one of 6 hours) but only 74 hours in 7 days isn't compliant — ${exSt.restShortfall7Days} hours short of 77.`,
    assumptions: "STCW Regulation VIII/1 and MLC 2006 Standard A2.3: minimum 10 hours of rest in any 24-hour period and 77 hours in any 7-day period; rest may be divided into no more than two periods, one at least 6 hours long, with no more than 14 hours between them. Drills and emergencies have exceptions. Not affiliated with the IMO or any flag state. " + DISCLAIMER,
    faq: [
      { question: "What are the STCW rest hour rules?", answer: "At least 10 hours of rest in any 24 hours and 77 hours in any 7 days, in no more than two periods, one of at least 6 hours." },
      { question: "Do drills count as rest?", answer: "No — musters and drills should minimise disturbance of rest, and compensatory rest is required if rest is interrupted." },
    ],
  },
  {
    slug: "fringe-benefit-rate-calculator",
    title: "Fringe Benefit Rate Calculator",
    description: "Calculate an employee's fringe benefit rate — health insurance, retirement, payroll taxes, paid leave and other benefits as a percentage of wages — and the total cost of employment.",
    metaTitle: "Fringe Benefit Rate Calculator — Benefits as % of Wages",
    metaDescription: "Free fringe benefit rate calculator. Add health, retirement, payroll taxes and paid leave to find the fringe rate, total compensation and fringe per hour.",
    calcInputs: [
      currencyField("annualWages", "Annual Wages", { default: 60000, max: 10000000, step: 500 }),
      currencyField("healthInsurance", "Employer Health Insurance", { default: 7800, max: 1000000, step: 100 }),
      currencyField("retirement", "Retirement Contributions", { default: 2400, max: 1000000, step: 100 }),
      currencyField("payrollTaxes", "Employer Payroll Taxes (FICA, FUTA, SUTA)", { default: 4900, max: 1000000, step: 100 }),
      currencyField("paidLeaveValue", "Paid Leave & Holidays Value", { default: 3500, max: 1000000, step: 100 }),
      currencyField("otherBenefits", "Other Benefits (life, disability, workers' comp)", { default: 600, max: 1000000, step: 100 }),
      numberField("annualHours", "Annual Paid Hours", { default: 2080, max: 5000 }),
    ],
    calcResult: { label: "Fringe Benefit Rate", format: "percentage" },
    calcResults: [
      { key: "fringeBenefitRate", label: "Fringe Benefit Rate", format: "percentage", highlight: true },
      { key: "totalBenefitsCost", label: "Total Benefits Cost", format: "currency" },
      { key: "totalCompensation", label: "Total Compensation", format: "currency" },
      { key: "fringePerHour", label: "Fringe per Hour", format: "currency" },
    ],
    instructions: "Enter the employee's annual wages and the employer's yearly cost for each benefit. Government contracts and grants often require a fringe rate in proposals.",
    examples: `Example: ${usd(60000)} of wages with ${usd(exFr.totalBenefitsCost)} of benefits is a ${exFr.fringeBenefitRate}% fringe rate — ${usd(exFr.totalCompensation)} total compensation.`,
    assumptions: "Fringe rate = total employer benefit costs ÷ wages. Whether paid leave is counted as fringe or wages varies by organization — be consistent. Typical private-sector fringe rates are 25–40%. " + DISCLAIMER,
    faq: [
      { question: "What is a typical fringe benefit rate?", answer: "Around 25–40% of wages in the private sector; public employers are often higher." },
      { question: "Are payroll taxes part of fringe benefits?", answer: "Usually yes — employer FICA, unemployment taxes and workers' comp are included in most fringe rates." },
    ],
  },
  {
    slug: "union-dues-calculator",
    title: "Union Dues Calculator",
    description: "Calculate union dues per paycheck and per year — a percentage of pay, an hourly assessment, flat dues and the initiation fee — and dues as a share of your pay.",
    metaTitle: "Union Dues Calculator — Per Paycheck & Yearly Dues",
    metaDescription: "Free union dues calculator. Percentage, hourly and flat dues per paycheck plus initiation fee, and the yearly total.",
    calcInputs: [
      currencyField("grossPayPerPeriod", "Gross Pay per Paycheck", { default: 2400, max: 100000, step: 10 }),
      numberField("periodsPerYear", "Paychecks per Year", { default: 26, min: 1, max: 52 }),
      percentField("duesPercent", "Dues as % of Pay", { default: 1.5, max: 10, step: 0.05 }),
      numberField("hoursPerPeriod", "Hours per Paycheck (hourly dues)", { default: 0, max: 200 }),
      currencyField("duesPerHour", "Dues per Hour Worked", { default: 0, max: 10, step: 0.01 }),
      currencyField("flatDuesPerPeriod", "Flat Dues per Paycheck", { default: 5, max: 500, step: 0.5 }),
      currencyField("initiationFee", "One-Time Initiation Fee", { default: 100, max: 5000, step: 5 }),
    ],
    calcResult: { label: "Dues per Paycheck", format: "currency" },
    calcResults: [
      { key: "duesPerPaycheck", label: "Dues per Paycheck", format: "currency", highlight: true },
      { key: "annualDues", label: "First-Year Dues incl. Initiation", format: "currency" },
      { key: "percentOfPay", label: "Dues as % of Pay", format: "percentage" },
    ],
    instructions: "Enter your pay per paycheck and your local's dues formula — many combine a percentage of pay with a flat amount, while building trades often use an hourly work assessment.",
    examples: `Example: 1.5% of ${usd(2400)} plus $5 is ${usd(exUd.duesPerPaycheck)} a paycheck — ${usd(exUd.annualDues)} in the first year with a $100 initiation fee.`,
    assumptions: "Dues formulas are set by each union local's bylaws. Union dues aren't deductible on federal returns for employees (2018–2025 rules continue under current law); some states allow a deduction. Public employees can't be required to pay dues (Janus v. AFSCME). " + DISCLAIMER,
    faq: [
      { question: "How much are union dues?", answer: "Commonly 1–2% of pay or a flat monthly amount of $30–$100, depending on the union." },
      { question: "Are union dues tax deductible?", answer: "Not for most employees on federal returns; a few states allow a deduction." },
    ],
  },
  {
    slug: "longevity-pay-calculator",
    title: "Longevity Pay Calculator",
    description: "Calculate longevity pay — the extra pay many public employers and unions give for years of service — as a flat amount or percentage per step, yearly and per paycheck.",
    metaTitle: "Longevity Pay Calculator — Years of Service Pay",
    metaDescription: "Free longevity pay calculator. Steps by years of service, flat or percentage amounts, yearly longevity pay and per paycheck.",
    calcInputs: [
      numberField("yearsOfService", "Years of Service", { default: 17, max: 50, step: 0.5 }),
      numberField("startsAfterYears", "Longevity Starts After (years)", { default: 5, max: 30 }),
      numberField("everyYears", "New Step Every (years)", { default: 5, min: 1, max: 20 }),
      currencyField("amountPerStep", "Flat Amount per Step (yearly)", { default: 600, max: 50000, step: 10 }),
      percentField("percentPerStep", "Or % of Salary per Step", { default: 0, max: 20, step: 0.25 }),
      currencyField("annualSalary", "Annual Salary (if %)", { default: 0, max: 1000000, step: 500 }),
      numberField("periodsPerYear", "Paychecks per Year", { default: 26, min: 1, max: 52 }),
    ],
    calcResult: { label: "Annual Longevity Pay", format: "currency" },
    calcResults: [
      { key: "annualLongevityPay", label: "Annual Longevity Pay", format: "currency", highlight: true },
      { key: "longevitySteps", label: "Longevity Steps Earned", format: "number" },
      { key: "perPaycheck", label: "Per Paycheck", format: "currency" },
    ],
    instructions: "Enter your years of service and the longevity schedule from your contract or pay plan — when it starts, how often it steps up and the amount per step.",
    examples: `Example: 17 years with steps every 5 years from year 5 at $600 a step earns ${exLp.longevitySteps} steps — ${usd(exLp.annualLongevityPay)} a year.`,
    assumptions: "Longevity schedules vary by employer (Texas state employees, many cities, counties and school districts use them). Longevity pay is taxable and may or may not count toward pension calculations. " + DISCLAIMER,
    faq: [
      { question: "What is longevity pay?", answer: "Extra pay rewarding years of service, paid as a lump sum or added to each paycheck." },
      { question: "Is longevity pay included in overtime?", answer: "Usually yes — under the FLSA it's typically part of the regular rate." },
    ],
  },
  {
    slug: "mexico-ptu-calculator",
    title: "Mexico PTU Calculator (Profit Sharing)",
    description: "Calculate your PTU (participación de los trabajadores en las utilidades) in Mexico — 10% of the company's taxable profit split by days worked and salary — with the 2021 cap.",
    metaTitle: "PTU Calculator — Mexico Employee Profit Sharing",
    metaDescription: "Free PTU calculator for Mexico. 10% of taxable profit, half by days worked and half by salary, capped at 3 months' salary or the 3-year average.",
    calcInputs: [
      currencyField("companyTaxableProfit", "Company Taxable Profit (MXN)", { default: 20000000, max: 100000000000, step: 10000 }),
      numberField("totalDaysAllEmployees", "Total Days Worked by All Employees", { default: 36500, min: 1, max: 100000000 }),
      currencyField("totalSalariesAllEmployees", "Total Salaries of All Employees (MXN)", { default: 30000000, max: 100000000000, step: 10000 }),
      numberField("yourDaysWorked", "Your Days Worked in the Year", { default: 365, max: 366 }),
      currencyField("yourAnnualSalary", "Your Annual Salary (MXN, capped base)", { default: 240000, max: 100000000, step: 1000 }),
      currencyField("yourMonthlySalary", "Your Monthly Salary (MXN)", { default: 20000, max: 10000000, step: 100 }),
      currencyField("yourAveragePtuLast3Years", "Your Average PTU, Last 3 Years (MXN)", { default: 0, max: 100000000, step: 100 }),
    ],
    calcResult: { label: "Your PTU", format: "currency", currency: "MXN" },
    calcResults: [
      { key: "yourPtu", label: "Your PTU", format: "currency", currency: "MXN", highlight: true },
      { key: "shareByDaysWorked", label: "Share by Days Worked", format: "currency", currency: "MXN" },
      { key: "shareBySalary", label: "Share by Salary", format: "currency", currency: "MXN" },
      { key: "companyPtuPool", label: "Company PTU Pool (10%)", format: "currency", currency: "MXN" },
      { key: "cappedAmount", label: "Cap Applied? (1 = yes)", format: "number" },
    ],
    instructions: "Use the company's taxable profit from its annual tax return and the totals in the PTU distribution notice, plus your own days worked and salary.",
    examples: `Example: a MXN 20 million profit creates a MXN 2 million pool; an employee with a full year on MXN 240,000 gets about MXN ${exPtu.yourPtu.toLocaleString("es-MX")}.`,
    assumptions: "Ley Federal del Trabajo art. 117–131: 10% of taxable profit; half distributed equally by days worked, half in proportion to salaries (salary base capped for higher earners); since 2021 each worker's PTU is capped at the greater of 3 months' salary or the average PTU of the last 3 years. Paid by 30 May (companies) or 29 June (individuals). " + DISCLAIMER,
    faq: [
      { question: "When is PTU paid in Mexico?", answer: "Companies pay by 30 May and individual employers by 29 June, within 60 days of the tax return deadline." },
      { question: "What is the PTU cap?", answer: "The greater of 3 months of your salary or the average PTU you received in the last 3 years." },
    ],
  },
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-law-government-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cat.id,
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
