// One-time (but safe to re-run) batch setup script: creates 22 wage, garnishment, overtime-rule
// and pay-schedule calculators (Law & Government Calculators > Employment & Wage Law
// Calculators). Rates and rules live in src/lib/calc-engine-law-wage.ts; the examples below are
// computed from that engine so they always match the calculator.
// State policy (user decision): separate garnishment pages only for states whose limits differ
// from the federal rule (CA, IL, NJ, FL, MA, MD, AZ, VA); Ohio, Michigan, Indiana and Kentucky
// wage garnishment keywords are covered by the general (federal) calculator. Also merged: Minimum
// Salary, Wage Calculator Nevada / NM, California Wages / Hourly Wage, Illinois / Georgia Hourly
// Pay → minimum-wage; Regular Rate of Pay California → weighted-overtime; Retro Check /
// Retroactive → retro-pay; IHSS Hours → ihss-timesheet; Meal & Rest Break / California Meal Break
// → california-meal-rest-break. Texas, Florida, Nevada, Georgia, North Carolina, Pennsylvania and
// New York overtime keywords are covered by the existing overtime-calculator (FLSA rules).
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-wage-calculators.ts
// or
//   npm run db:create-law-wage-calculators

import * as E from "../src/lib/calc-engine-law-wage";

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
const DISCLAIMER = "Estimates only, not legal advice — the employer, court order or labor agency applies the exact rules, which can change; check your state labor department for current figures.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const FREQ = dropdown("payFrequency", "Pay Frequency", [["Weekly", 0], ["Every two weeks", 1], ["Twice a month", 2], ["Monthly", 3]], 1);

const GARNISH_RESULTS = [
  { key: "maximumGarnishmentPerPaycheck", label: "Maximum Garnishment per Paycheck", format: "currency", highlight: true },
  { key: "takeHomeAfterGarnishment", label: "Take-Home After Garnishment", format: "currency" },
  { key: "percentOfDisposable", label: "Share of Disposable Earnings", format: "percentage" },
  { key: "garnishedPerYear", label: "Garnished per Year", format: "currency" },
  { key: "disposableEarnings", label: "Disposable Earnings per Paycheck", format: "currency" },
];

interface GarnishSpec { state: string; rule: string; law: string; extra?: Record<string, unknown>[]; faq: { question: string; answer: string }[] }
const GARNISH: GarnishSpec[] = [
  { state: "California", law: "Code of Civil Procedure §706.050", rule: "the lesser of 20% of disposable earnings or 40% of the amount by which weekly disposable earnings exceed 48 × the state minimum wage ($16.90 → $811.20 a week)", faq: [{ question: "How much can be garnished from wages in California?", answer: "No more than 20% of disposable earnings, or 40% of what you earn above 48 times the state minimum wage each week — whichever is less." }, { question: "Can I claim a larger exemption in California?", answer: "Yes — you can file a claim of exemption if the amount is needed to support you or your family." }] },
  { state: "Illinois", law: "735 ILCS 5/12-803", rule: "the lesser of 15% of gross wages or the amount by which disposable earnings exceed 45 × the Illinois minimum wage ($15 → $675 a week)", faq: [{ question: "What percentage can be garnished in Illinois?", answer: "Up to 15% of gross wages, as long as you keep at least 45 times the Illinois minimum wage each week." }, { question: "Does Illinois follow the federal 25% rule?", answer: "Illinois is stricter — the 15%-of-gross limit usually applies first." }] },
  { state: "New Jersey", law: "N.J.S.A. 2A:17-56", rule: "10% of gross wages if your income is at or below 250% of the federal poverty guideline; above that, a court can allow up to 25% of disposable earnings (always leaving 30 × the federal minimum wage)", extra: [numberField("householdSize", "Household Size (for the poverty line)", { default: 1, min: 1, max: 15 })], faq: [{ question: "How much can be garnished from wages in New Jersey?", answer: "Usually 10% of gross pay for lower incomes (at or below 250% of the poverty line); higher earners can face up to 25% of disposable earnings." }, { question: "Is Social Security protected in New Jersey?", answer: "Yes — federal benefits like Social Security are generally protected from creditor garnishment." }] },
  { state: "Florida", law: "Florida Statutes §222.11", rule: "a head of family (providing more than half the support of a child or dependent) earning $750 or less a week in disposable earnings is fully exempt; above $750 the wages are still exempt unless the head of family agreed in writing; everyone else follows the federal 25% limit", extra: [dropdown("headOfFamily", "Head of Family?", YESNO, 1), dropdown("agreedInWriting", "Agreed in Writing to Garnishment?", YESNO, 0)], faq: [{ question: "Can wages be garnished in Florida?", answer: "Yes, but a head of family earning $750 a week or less is fully exempt, and above that is exempt unless they agreed in writing." }, { question: "How do I claim the Florida head of family exemption?", answer: "File a claim of exemption with the court (Form 1.907) soon after you're served with the writ." }] },
  { state: "Massachusetts", law: "M.G.L. c.246 §28", rule: "the exempt amount is the greater of 85% of gross wages or 50 × the Massachusetts minimum wage ($15 → $750 a week), so at most 15% of gross can be taken", faq: [{ question: "How much can be garnished in Massachusetts?", answer: "At most 15% of gross wages, and nothing below 50 times the state minimum wage ($750 a week)." }, { question: "Is Massachusetts stricter than federal law?", answer: "Yes — it protects 85% of gross pay instead of 75% of disposable pay." }] },
  { state: "Maryland", law: "Md. Code, Com. Law §15-601.1", rule: "the exempt amount is the greater of 75% of disposable wages or 30 × the Maryland minimum wage ($15 → $450 a week)", faq: [{ question: "How much can be garnished in Maryland?", answer: "Up to 25% of disposable wages, while keeping at least 30 times the state minimum wage each week." }, { question: "Does Maryland use the state minimum wage for garnishment?", answer: "Yes — the protected floor uses Maryland's higher minimum wage, not the federal $7.25." }] },
  { state: "Arizona", law: "A.R.S. §33-1131 (Proposition 209)", rule: "the lesser of 10% of disposable earnings (5% on a hardship finding) or the amount by which weekly disposable earnings exceed 60 × the Arizona minimum wage ($15.15 → $909 a week)", extra: [dropdown("hardship", "Court Reduced to 5% for Hardship?", YESNO, 0)], faq: [{ question: "How much can be garnished in Arizona?", answer: "Since Proposition 209, at most 10% of disposable earnings (5% with a hardship order) for consumer debts." }, { question: "Does the Arizona limit apply to child support?", answer: "No — support orders have their own, higher limits." }] },
  { state: "Virginia", law: "Va. Code §34-29", rule: "the lesser of 25% of disposable earnings or the amount by which weekly disposable earnings exceed 40 × the federal minimum wage ($290 a week)", faq: [{ question: "How much can be garnished in Virginia?", answer: "Up to 25% of disposable earnings, but you keep at least 40 times the federal minimum wage ($290) each week." }, { question: "Can I request a hearing on a Virginia garnishment?", answer: "Yes — you can request an exemption hearing using the form served with the garnishment summons." }] },
];

const garnishInputs = (extra: Record<string, unknown>[] = []) => [
  currencyField("grossPay", "Gross Pay per Paycheck", { default: 2000, max: 100000, step: 10 }),
  currencyField("mandatoryDeductions", "Required Deductions (taxes, FICA, mandatory retirement)", { default: 420, max: 50000, step: 5 }),
  FREQ,
  ...extra,
];
const gEx = { grossPay: 2000, mandatoryDeductions: 420, payFrequency: 1, householdSize: 1, headOfFamily: 1, agreedInWriting: 0, hardship: 0 };

function garnishTool(s: GarnishSpec): ToolDef {
  const ex = r(E.stateGarnishment(s.state), gEx);
  return {
    slug: `${s.state.toLowerCase().replace(/ /g, "-")}-wage-garnishment-calculator`,
    title: `${s.state} Wage Garnishment Calculator`,
    description: `Calculate the most a creditor can garnish from your paycheck in ${s.state} under ${s.law} — and what you'll take home — for weekly, biweekly, semi-monthly or monthly pay.`,
    metaTitle: `${s.state} Wage Garnishment Calculator — Maximum per Paycheck`.slice(0, 70),
    metaDescription: `Free ${s.state} wage garnishment calculator. See the maximum garnishment per paycheck for consumer debts under ${s.law} and your take-home pay.`,
    calcInputs: garnishInputs(s.extra),
    calcResult: { label: "Maximum Garnishment per Paycheck", format: "currency" },
    calcResults: GARNISH_RESULTS,
    instructions: "Enter your gross pay for one paycheck and the deductions required by law (federal, state and local income tax, Social Security, Medicare, state disability and mandatory retirement — not health insurance or voluntary 401(k)). Choose how often you're paid.",
    examples: `Example: ${usd(2000)} gross every two weeks with ${usd(420)} of required deductions leaves ${usd(1580)} disposable; the ${s.state} limit allows at most ${usd(ex.maximumGarnishmentPerPaycheck)} a paycheck.`,
    assumptions: `For ordinary creditor judgments ${s.state} limits garnishment to ${s.rule}. The federal CCPA limit (25% of disposable earnings, keeping 30 × $7.25 a week) also applies, and the stricter of the two is used. Child support, taxes and federal student loans follow different rules. ${DISCLAIMER}`,
    faq: s.faq,
  };
}

const exG = r(E.wageGarnishment, { grossPay: 2000, mandatoryDeductions: 420, payFrequency: 1, orderType: 0, supportsOtherFamily: 0, arrears12Weeks: 0 });
const exMin = r(E.minimumWage, { state: E.MIN_WAGE_2026.findIndex(([n]) => n === "California"), hoursPerWeek: 40, yourHourlyRate: 16 });
const exQ = r(E.qualifiedOvertime, { overtimeHours: 400, regularRate: 30, filingStatus: 0, magi: 90000, marginalRatePercent: 22 });
const exEx = r(E.exemptTest, { rule: 1, annualSalary: 65000, hoursPerWeek: 45, customWeeklyThreshold: 0 });
const exW = r(E.weightedOvertime, { hours1: 30, rate1: 20, hours2: 15, rate2: 26, hours3: 0, rate3: 0, nondiscretionaryBonus: 100 });
const exP = r(E.pieceRate, { piecesCompleted: 900, ratePerPiece: 0.85, otherHourlyPay: 0, hoursWorked: 45, minimumWage: 16.9 });
const exC = r(E.compressedSchedule, { schedule: 1, hourlyRate: 35, dailyOvertimeState: 1, adoptedAws: 0 });
const exS = r(E.splitShift, { hourlyRate: 17.5, hoursWorked: 8, minimumWage: 16.9, unpaidBreakOverOneHour: 1, splitShiftDays: 10 });
const ex48 = r(E.schedule4896, { hourlyRate: 28, cycleDays: 24 });
const exD = r(E.davisBacon, { basicHourlyRate: 42.5, fringeRate: 24.1, hoursWorked: 45, bonaFideFringePerHour: 18 });
const ex22 = r(E.prop22, { engagedHours: 25, engagedMiles: 300, earningsExcludingTips: 480, localMinimumWage: 16.9, perMileRate: 0.37 });
const exR = r(E.retroPay, { oldRate: 24, newRate: 25.5, hoursPerPeriod: 80, overtimeHoursPerPeriod: 4, periodsOwed: 6, withholdingPercent: 30 });
const exI = r(E.ihss, { hoursPerWeek: 50, hourlyRate: 19.5, travelHoursPerWeek: 2, monthlyAuthorizedHours: 216 });
const exM = r(E.mealRestBreaks, { shiftHours: 10.5, mealsMissed: 1, restBreaksMissed: 1, regularRate: 22, daysWithViolations: 12 });

const TOOLS: ToolDef[] = [
  {
    slug: "wage-garnishment-calculator",
    title: "Wage Garnishment Calculator",
    description: "Calculate the maximum wage garnishment per paycheck under federal law — 25% of disposable earnings for creditors, 50–65% for child support, 15% for federal student loans — and your take-home pay.",
    metaTitle: "Wage Garnishment Calculator — Federal Limits per Paycheck",
    metaDescription: "Free wage garnishment calculator. Federal CCPA limits for creditor judgments, child support and student loans, per weekly, biweekly or monthly paycheck.",
    calcInputs: [
      ...garnishInputs(),
      dropdown("orderType", "Type of Garnishment", [["Creditor judgment (consumer debt)", 0], ["Child support / alimony", 1], ["Federal student loan (AWG)", 2]], 0),
      dropdown("supportsOtherFamily", "Child support: supporting another spouse or child?", YESNO, 0),
      dropdown("arrears12Weeks", "Child support: arrears more than 12 weeks old?", YESNO, 0),
    ],
    calcResult: { label: "Maximum Garnishment per Paycheck", format: "currency" },
    calcResults: GARNISH_RESULTS,
    instructions: "Enter gross pay and the deductions required by law for one paycheck, how often you're paid and the type of garnishment. States with their own stricter limits (California, Illinois, New Jersey, Florida, Massachusetts, Maryland, Arizona, Virginia) have their own calculators in this category.",
    examples: `Example: ${usd(2000)} every two weeks with ${usd(420)} of required deductions: a creditor can take at most ${usd(exG.maximumGarnishmentPerPaycheck)} a paycheck (25% of ${usd(1580)} disposable).`,
    assumptions: `Consumer Credit Protection Act (15 U.S.C. §1673): the lesser of 25% of disposable earnings or the amount above 30 × $7.25 ($217.50) a week; child support up to 50% (supporting another family) or 60%, plus 5% if arrears are over 12 weeks old; federal student loan administrative garnishment 15%. Multiple garnishments share the same limit. ${DISCLAIMER}`,
    faq: [
      { question: "How much of my paycheck can be garnished?", answer: "For most debts, up to 25% of disposable earnings — less if you earn close to the minimum wage or live in a state with stricter limits." },
      { question: "What counts as disposable earnings?", answer: "Pay after legally required deductions — taxes, Social Security, Medicare and mandatory retirement — not voluntary deductions like health insurance or 401(k)." },
    ],
  },
  ...GARNISH.map(garnishTool),
  {
    slug: "minimum-wage-calculator",
    title: "Minimum Wage Calculator (2026 by State)",
    description: "Look up the 2026 minimum wage in your state and see weekly and yearly pay at minimum wage — and how much you're owed if you're paid less.",
    metaTitle: "Minimum Wage Calculator 2026 — State Rates & Annual Pay",
    metaDescription: "Free 2026 minimum wage calculator for every state and DC. See the hourly rate, weekly and yearly pay at minimum wage, and any underpayment.",
    calcInputs: [
      dropdown("state", "State", E.MIN_WAGE_2026.map(([n], i) => [n, i] as [string, number]), E.MIN_WAGE_2026.findIndex(([n]) => n === "California")),
      numberField("hoursPerWeek", "Hours per Week", { default: 40, max: 80, unit: "hours" }),
      currencyField("yourHourlyRate", "Your Hourly Rate (optional)", { default: 16, max: 200, step: 0.05 }),
    ],
    calcResult: { label: "Minimum Wage", format: "currency" },
    calcResults: [
      { key: "minimumWage", label: "2026 Minimum Wage (per hour)", format: "currency", highlight: true },
      { key: "weeklyPayAtMinimum", label: "Weekly Pay at Minimum Wage", format: "currency" },
      { key: "annualPayAtMinimum", label: "Yearly Pay at Minimum Wage", format: "currency" },
      { key: "amountYouAreUnder", label: "Your Rate Below the Minimum (per hour)", format: "currency" },
      { key: "owedPerWeekIfUnderpaid", label: "Owed per Week if Underpaid", format: "currency" },
      { key: "aboveFederalMinimum", label: "Above the Federal $7.25", format: "currency" },
    ],
    instructions: "Pick your state (New York and Oregon have regional rates) and your usual weekly hours. Cities and counties can set higher local minimums — Seattle, Denver, Chicago, Los Angeles and many California cities do.",
    examples: `Example: California's 2026 minimum wage is ${usd(exMin.minimumWage)} an hour — ${usd(exMin.annualPayAtMinimum)} a year full time. Someone paid $16 an hour is owed ${usd(exMin.owedPerWeekIfUnderpaid)} a week.`,
    assumptions: "2026 state minimum wages in effect October 2026 (Florida rose to $15.00 on 30 September 2026; Alaska to $14.00 on 1 July 2026). Where a state's rate is below $7.25, the federal minimum applies to FLSA-covered employers. Tipped, youth, training and small-employer rates differ, and Oregon/DC/some states adjust each July. " + DISCLAIMER,
    faq: [
      { question: "What is the highest state minimum wage in 2026?", answer: "Washington's $17.13 an hour is the highest state rate; Washington, DC is $17.95." },
      { question: "Which states use the federal $7.25 minimum wage?", answer: "About 20 states, including Texas, Pennsylvania, Georgia, North Carolina, Tennessee, Indiana and Wisconsin." },
    ],
  },
  {
    slug: "qualified-overtime-deduction-calculator",
    title: "Qualified Overtime Deduction Calculator (No Tax on Overtime)",
    description: "Estimate the new federal deduction for qualified overtime pay (2025–2028) — the premium half of time-and-a-half, up to $12,500 ($25,000 joint), with the income phase-out — and your tax savings.",
    metaTitle: "No Tax on Overtime Calculator — Qualified Overtime Deduction",
    metaDescription: "Free qualified overtime deduction calculator for 2025–2028. Deductible OT premium up to $12,500/$25,000, phase-out over $150,000/$300,000 MAGI, tax saved.",
    calcInputs: [
      numberField("overtimeHours", "FLSA Overtime Hours in the Year", { default: 400, max: 3000, unit: "hours" }),
      currencyField("regularRate", "Regular Hourly Rate", { default: 30, max: 500, step: 0.25 }),
      dropdown("filingStatus", "Filing Status", [["Single / head of household", 0], ["Married filing jointly", 1]], 0),
      currencyField("magi", "Modified Adjusted Gross Income", { default: 90000, max: 1000000, step: 500 }),
      percentField("marginalRatePercent", "Your Federal Tax Bracket", { default: 22, max: 37, step: 1 }),
    ],
    calcResult: { label: "Overtime Deduction", format: "currency" },
    calcResults: [
      { key: "overtimeDeduction", label: "Qualified Overtime Deduction", format: "currency", highlight: true },
      { key: "qualifiedOvertimePremium", label: "Qualified Overtime Premium (the 'half')", format: "currency" },
      { key: "estimatedTaxSavings", label: "Estimated Federal Tax Saved", format: "currency" },
      { key: "phaseOutReduction", label: "Phase-Out Reduction", format: "currency" },
      { key: "deductionCap", label: "Deduction Cap", format: "currency" },
    ],
    instructions: "Enter the overtime hours that were paid at time-and-a-half because you worked over 40 hours in a week (FLSA overtime only), your regular rate, filing status and MAGI. The amount should also appear separately on your W-2.",
    examples: `Example: 400 overtime hours at a $30 regular rate gives a ${usd(exQ.qualifiedOvertimePremium)} premium — fully deductible at ${usd(90000)} MAGI, saving about ${usd(exQ.estimatedTaxSavings)} in the 22% bracket.`,
    assumptions: "One Big Beautiful Bill Act (2025), tax years 2025–2028: only the premium portion above the regular rate of FLSA-required overtime qualifies (not state-only daily overtime or contractual double time beyond the FLSA premium), up to $12,500 ($25,000 married filing jointly), reduced by $100 for each $1,000 of MAGI over $150,000 ($300,000 joint). Married filing separately can't claim it. It's a deduction from income tax only — Social Security and Medicare still apply. " + DISCLAIMER,
    faq: [
      { question: "Is all my overtime tax-free now?", answer: "No — only the extra 'half' of time-and-a-half is deductible, up to $12,500 ($25,000 joint), and only for federal income tax." },
      { question: "Do I need to itemize to get the overtime deduction?", answer: "No, you can claim it whether you itemize or take the standard deduction." },
    ],
  },
  {
    slug: "exempt-vs-non-exempt-calculator",
    title: "Exempt vs Non-Exempt Salary Calculator",
    description: "Check whether a salary meets the exempt salary threshold under federal, California or Washington rules — and the overtime a non-exempt employee would be owed for the same hours.",
    metaTitle: "Exempt vs Non-Exempt Calculator — 2026 Salary Thresholds",
    metaDescription: "Free exempt vs non-exempt calculator. Compare a salary with the 2026 FLSA ($684/week), California ($1,352/week) and Washington thresholds and see overtime owed.",
    calcInputs: [
      dropdown("rule", "Salary Test", E.EXEMPT_TESTS.map(([n, t], i) => [t ? `${n} — $${t.toLocaleString()}/week` : n, i] as [string, number]), 1),
      currencyField("annualSalary", "Annual Salary", { default: 65000, max: 1000000, step: 500 }),
      numberField("hoursPerWeek", "Hours Worked per Week", { default: 45, max: 100, unit: "hours" }),
      currencyField("customWeeklyThreshold", "Custom Weekly Threshold", { default: 0, max: 10000, step: 1 }),
    ],
    calcResult: { label: "Meets the Salary Test? (1 = yes)", format: "number" },
    calcResults: [
      { key: "meetsSalaryTest", label: "Meets the Salary Test? (1 = yes)", format: "number", highlight: true },
      { key: "weeklySalary", label: "Weekly Salary", format: "currency" },
      { key: "weeklyThreshold", label: "Weekly Threshold", format: "currency" },
      { key: "annualThreshold", label: "Annual Threshold", format: "currency" },
      { key: "overtimeOwedPerWeekIfNonExempt", label: "Overtime per Week if Non-Exempt", format: "currency" },
    ],
    instructions: "Pick the rule for where you work, enter the salary and your usual weekly hours. Exemption also needs a duties test (executive, administrative, professional, computer or outside sales) — salary alone isn't enough.",
    examples: `Example: ${usd(65000)} in California is ${usd(exEx.weeklySalary)} a week — below the ${usd(1352)} threshold, so the job must be non-exempt and 45 hours a week would earn about ${usd(exEx.overtimeOwedPerWeekIfNonExempt)} in overtime.`,
    assumptions: "Federal: $684 a week ($35,568) after the 2024 rule was vacated; California: 2 × state minimum wage × 40 hours ($1,352 a week, $70,304 a year in 2026); Washington: 2.5 × state minimum × 40 ($1,712.50). Other states (New York, Colorado, Alaska…) set their own — use the custom field. Overtime here assumes FLSA weekly overtime at 1.5 × the salary's hourly equivalent. " + DISCLAIMER,
    faq: [
      { question: "What is the minimum salary to be exempt in 2026?", answer: "$684 a week federally; $1,352 a week ($70,304 a year) in California; higher in some other states." },
      { question: "Can a salaried employee get overtime?", answer: "Yes — if the salary is below the threshold or the job doesn't pass the duties test, they're non-exempt and owed overtime." },
    ],
  },
  {
    slug: "weighted-overtime-calculator",
    title: "Weighted Overtime Calculator (Blended Rate)",
    description: "Calculate overtime when you work at more than one pay rate or earn a non-discretionary bonus — the FLSA weighted-average regular rate, the half-time premium and total pay.",
    metaTitle: "Weighted Overtime Calculator — Blended Regular Rate (FLSA)",
    metaDescription: "Free weighted average overtime calculator. Multiple pay rates and bonuses combined into the FLSA regular rate, with the overtime premium.",
    calcInputs: [
      numberField("hours1", "Hours at Rate 1", { default: 30, max: 100 }), currencyField("rate1", "Rate 1", { default: 20, max: 500, step: 0.25 }),
      numberField("hours2", "Hours at Rate 2", { default: 15, max: 100 }), currencyField("rate2", "Rate 2", { default: 26, max: 500, step: 0.25 }),
      numberField("hours3", "Hours at Rate 3", { default: 0, max: 100 }), currencyField("rate3", "Rate 3", { default: 0, max: 500, step: 0.25 }),
      currencyField("nondiscretionaryBonus", "Non-Discretionary Bonus for the Week", { default: 100, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Total Pay", format: "currency" },
    calcResults: [
      { key: "totalPay", label: "Total Pay for the Week", format: "currency", highlight: true },
      { key: "regularRate", label: "Regular (Weighted) Rate", format: "currency" },
      { key: "overtimeHours", label: "Overtime Hours", format: "number" },
      { key: "overtimePremium", label: "Overtime Premium (½ × regular rate)", format: "currency" },
      { key: "straightTimePay", label: "Straight-Time Pay incl. Bonus", format: "currency" },
    ],
    instructions: "Enter the hours worked at each rate during one workweek and any non-discretionary bonus (production, attendance or shift bonuses) earned that week.",
    examples: `Example: 30 hours at $20 and 15 at $26 plus a $100 bonus gives a regular rate of ${usd(exW.regularRate)}; the 5 overtime hours add ${usd(exW.overtimePremium)}, for ${usd(exW.totalPay)} in total.`,
    assumptions: "29 CFR §778.115 and §778.209: total straight-time pay (all rates plus non-discretionary bonuses) ÷ total hours = regular rate; overtime hours over 40 earn an extra 0.5 × the regular rate because straight time is already paid. California's regular rate also counts daily overtime over 8 hours, which isn't modelled. " + DISCLAIMER,
    faq: [
      { question: "How is overtime calculated with two pay rates?", answer: "Average the rates by hours worked (including bonuses), then pay half that average for each overtime hour on top of straight time." },
      { question: "Do bonuses count toward overtime?", answer: "Non-discretionary bonuses (promised for production, attendance, etc.) do; truly discretionary gifts don't." },
    ],
  },
  {
    slug: "piece-rate-calculator",
    title: "Piece Rate Pay Calculator",
    description: "Calculate piece-rate pay for a week — piece earnings, the regular rate, the overtime premium and any minimum wage top-up the employer owes.",
    metaTitle: "Piece Rate Calculator — Pay, Overtime & Minimum Wage Check",
    metaDescription: "Free piece rate calculator. Pieces × rate, regular rate, overtime premium over 40 hours and the minimum wage top-up.",
    calcInputs: [
      numberField("piecesCompleted", "Pieces Completed", { default: 900, max: 100000 }),
      currencyField("ratePerPiece", "Rate per Piece", { default: 0.85, max: 1000, step: 0.01 }),
      currencyField("otherHourlyPay", "Other Pay That Week (hourly work, bonuses)", { default: 0, max: 10000, step: 5 }),
      numberField("hoursWorked", "Total Hours Worked", { default: 45, max: 100, step: 0.25 }),
      currencyField("minimumWage", "Applicable Minimum Wage", { default: 16.9, max: 30, step: 0.01 }),
    ],
    calcResult: { label: "Total Pay", format: "currency" },
    calcResults: [
      { key: "totalPay", label: "Total Pay", format: "currency", highlight: true },
      { key: "regularRate", label: "Regular Rate", format: "currency" },
      { key: "overtimePremium", label: "Overtime Premium", format: "currency" },
      { key: "minimumWageTopUp", label: "Minimum Wage Top-Up", format: "currency" },
      { key: "pieceEarnings", label: "Piece Earnings", format: "currency" },
    ],
    instructions: "Enter the pieces completed and the rate, any other pay for the week, your total hours and the minimum wage where you work.",
    examples: `Example: 900 pieces at $0.85 over 45 hours is ${usd(exP.pieceEarnings)}, a regular rate of ${usd(exP.regularRate)}, plus ${usd(exP.overtimePremium)} of overtime premium — ${usd(exP.totalPay)} in total.`,
    assumptions: "FLSA (29 CFR §778.111): piece earnings ÷ hours = regular rate; overtime adds 0.5 × regular rate per hour over 40; pay must average at least the minimum wage. California also requires separate pay for rest and recovery periods and other non-productive time (Labor Code §226.2), not included here. " + DISCLAIMER,
    faq: [
      { question: "Do piece-rate workers get overtime?", answer: "Yes — the regular rate is piece earnings divided by hours, and each overtime hour earns half that rate extra." },
      { question: "Can piece-rate pay be below minimum wage?", answer: "No — the employer must top up the week's pay to at least minimum wage for all hours worked." },
    ],
  },
  {
    slug: "compressed-work-schedule-calculator",
    title: "Compressed Work Schedule Calculator (4/10, 9/80, 3/12)",
    description: "Compare compressed schedules — 4/10, 9/80 and 3/12 — days off per year, hours per day, and the daily overtime cost in states like California without an adopted alternative workweek.",
    metaTitle: "Compressed Hours Calculator — 9/80, 4/10 & 3/12 Schedules",
    metaDescription: "Free compressed work schedule calculator. Extra days off, hours per day and daily overtime cost for 4/10, 9/80 and 3/12 schedules.",
    calcInputs: [
      dropdown("schedule", "Schedule", [["4/10 (four 10-hour days)", 0], ["9/80 (nine days in two weeks)", 1], ["3/12 (three 12-hour days)", 2]], 1),
      currencyField("hourlyRate", "Hourly Rate", { default: 35, max: 500, step: 0.25 }),
      dropdown("dailyOvertimeState", "Daily Overtime State (e.g. California)?", YESNO, 1),
      dropdown("adoptedAws", "Alternative Workweek Schedule Properly Adopted?", YESNO, 0),
    ],
    calcResult: { label: "Extra Days Off per Year", format: "number" },
    calcResults: [
      { key: "extraDaysOffPerYear", label: "Extra Days Off per Year", format: "number", highlight: true },
      { key: "hoursPerDay", label: "Hours per Workday", format: "number" },
      { key: "workdaysPerYear", label: "Workdays per Year", format: "number" },
      { key: "dailyOvertimeHoursPerYear", label: "Daily Overtime Hours per Year", format: "number" },
      { key: "dailyOvertimeCostPerYear", label: "Daily Overtime Premium per Year", format: "currency" },
    ],
    instructions: "Pick a schedule and enter the hourly rate. In California, hours over 8 in a day are overtime unless the employer adopted an alternative workweek schedule by a secret-ballot election.",
    examples: `Example: a 9/80 schedule gives ${exC.extraDaysOffPerYear} extra days off a year; without an adopted AWS in California it would cost about ${usd(exC.dailyOvertimeCostPerYear)} a year in daily overtime premium at $35 an hour.`,
    assumptions: "4/10 = 4 × 10 hours a week; 9/80 = eight 9-hour days and one 8-hour day every two weeks (averaged as 8.9 hours here); 3/12 = three 12-hour shifts a week. Daily overtime premium = 0.5 × rate for hours over 8 (12-hour shifts also trigger double time over 12 in California, not shown). " + DISCLAIMER,
    faq: [
      { question: "Is a 9/80 schedule legal in California?", answer: "Yes, if adopted through a valid alternative workweek election; otherwise hours over 8 in a day are overtime." },
      { question: "Do compressed schedules change weekly overtime?", answer: "No — 40 hours a week is still the FLSA threshold; a 9/80 week must be defined so neither week exceeds 40." },
    ],
  },
  {
    slug: "california-split-shift-calculator",
    title: "California Split Shift Premium Calculator",
    description: "Calculate California's split shift premium — one hour at minimum wage when your workday is split by an unpaid break of more than an hour, reduced by what you earn above minimum wage that day.",
    metaTitle: "California Split Shift Calculator — Premium Owed",
    metaDescription: "Free California split shift premium calculator. One hour of minimum wage, minus earnings above minimum wage, for each split shift day.",
    calcInputs: [
      currencyField("hourlyRate", "Your Hourly Rate", { default: 17.5, max: 200, step: 0.05 }),
      numberField("hoursWorked", "Hours Worked That Day", { default: 8, max: 16, step: 0.25 }),
      currencyField("minimumWage", "Applicable Minimum Wage", { default: 16.9, max: 30, step: 0.01 }),
      dropdown("unpaidBreakOverOneHour", "Unpaid Break Longer Than One Hour (not a meal break)?", YESNO, 1),
      numberField("splitShiftDays", "Split Shift Days in the Period", { default: 10, max: 31 }),
    ],
    calcResult: { label: "Premium for the Period", format: "currency" },
    calcResults: [
      { key: "premiumForPeriod", label: "Split Shift Premium for the Period", format: "currency", highlight: true },
      { key: "premiumPerDay", label: "Premium per Day", format: "currency" },
      { key: "dayEarnings", label: "Day's Earnings", format: "currency" },
      { key: "earningsAboveMinimum", label: "Earnings Above Minimum Wage", format: "currency" },
    ],
    instructions: "Enter your hourly rate, hours worked on a split-shift day and the minimum wage that applies (local minimums count). A bona fide rest or meal period of up to an hour isn't a split.",
    examples: `Example: 8 hours at $17.50 on a split-shift day earns ${usd(exS.earningsAboveMinimum)} above minimum wage, so the premium is ${usd(exS.premiumPerDay)} a day — ${usd(exS.premiumForPeriod)} over 10 days.`,
    assumptions: "IWC Wage Orders §4(C) and 8 CCR §11040: one additional hour at minimum wage for each split-shift day, offset by any wages paid above minimum wage for that day (Securitas, DLSE guidance). " + DISCLAIMER,
    faq: [
      { question: "What is a split shift in California?", answer: "A work schedule interrupted by an unpaid, non-working period longer than a bona fide rest or meal break (more than an hour)." },
      { question: "Do high earners get split shift pay?", answer: "Usually not — if you earn at least one hour of minimum wage more than minimum wage for the day, the premium is fully offset." },
    ],
  },
  {
    slug: "48-96-schedule-pay-calculator",
    title: "48/96 Schedule Pay Calculator (Firefighters)",
    description: "Calculate firefighter pay on a 48/96 schedule — hours per FLSA 7(k) work period, overtime above the threshold and annual pay.",
    metaTitle: "48/96 Schedule Pay Calculator — Firefighter FLSA 7(k) Overtime",
    metaDescription: "Free 48/96 schedule calculator for firefighters. Hours per work period, 7(k) overtime threshold and annual pay with overtime.",
    calcInputs: [currencyField("hourlyRate", "Base Hourly Rate", { default: 28, max: 200, step: 0.05 }), numberField("cycleDays", "FLSA 7(k) Work Period (days, 7–28)", { default: 24, min: 7, max: 28 })],
    calcResult: { label: "Annual Pay", format: "currency" },
    calcResults: [
      { key: "annualPay", label: "Annual Pay incl. FLSA Overtime", format: "currency", highlight: true },
      { key: "hoursPerCycle", label: "Hours per Work Period", format: "number" },
      { key: "overtimeHoursPerCycle", label: "FLSA Overtime Hours per Period", format: "number" },
      { key: "payPerCycle", label: "Pay per Work Period", format: "currency" },
      { key: "annualHours", label: "Annual Hours", format: "number" },
    ],
    instructions: "Enter your base hourly rate and your department's 7(k) work period (24 days fits the 48/96 rotation exactly; 28 days is also common).",
    examples: `Example: at $28 an hour on a 24-day work period, a 48/96 schedule is ${ex48.hoursPerCycle} hours per period with ${ex48.overtimeHoursPerCycle} FLSA overtime hours — about ${usd(ex48.annualPay)} a year.`,
    assumptions: "48 hours on, 96 off = an average of 8 hours a day (56 a week, 2,920 a year). FLSA 7(k) allows 212 hours per 28 days (prorated: 7.57 hours per day) before overtime at 1.5 ×. Union contracts often pay more overtime (e.g. FLSA plus contractual). " + DISCLAIMER,
    faq: [
      { question: "How many hours a year is a 48/96 schedule?", answer: "About 2,920 hours — 56 hours a week on average." },
      { question: "When do firefighters get overtime under the FLSA?", answer: "Under the 7(k) exemption, after 212 hours in a 28-day work period (or the prorated amount for shorter periods)." },
    ],
  },
  {
    slug: "davis-bacon-wage-calculator",
    title: "Davis-Bacon Prevailing Wage Calculator",
    description: "Calculate Davis-Bacon prevailing wage pay for a week — the basic hourly rate plus fringe benefits, overtime on the base rate only, and the fringe you must pay in cash if plan contributions are lower.",
    metaTitle: "Davis-Bacon Wage Calculator — Prevailing Wage & Fringe",
    metaDescription: "Free Davis-Bacon calculator. Base rate + fringe for all hours, overtime premium on the base rate only, and cash in lieu of fringe benefits.",
    calcInputs: [
      currencyField("basicHourlyRate", "Basic Hourly Rate (wage determination)", { default: 42.5, max: 500, step: 0.01 }),
      currencyField("fringeRate", "Fringe Benefit Rate per Hour", { default: 24.1, max: 200, step: 0.01 }),
      numberField("hoursWorked", "Hours Worked This Week", { default: 45, max: 100, step: 0.25 }),
      currencyField("bonaFideFringePerHour", "Employer's Plan Contributions per Hour", { default: 18, max: 200, step: 0.01 }),
    ],
    calcResult: { label: "Total Weekly Compensation", format: "currency" },
    calcResults: [
      { key: "totalWeeklyCompensation", label: "Total Weekly Compensation", format: "currency", highlight: true },
      { key: "cashWagesPaid", label: "Cash Wages on the Paycheck", format: "currency" },
      { key: "overtimePremium", label: "Overtime Premium (base rate only)", format: "currency" },
      { key: "totalHourlyPackage", label: "Total Hourly Package", format: "currency" },
      { key: "fringeCashInLieu", label: "Fringe Paid in Cash", format: "currency" },
    ],
    instructions: "Use the basic hourly rate and fringe rate for your craft from the wage determination on the contract (SAM.gov), the hours worked, and what the employer actually contributes to bona fide benefit plans per hour.",
    examples: `Example: $42.50 + $24.10 fringe for 45 hours with $18 an hour in plan contributions: total compensation ${usd(exD.totalWeeklyCompensation)}, of which ${usd(exD.cashWagesPaid)} is cash wages (including ${usd(exD.fringeCashInLieu)} of fringe paid in cash).`,
    assumptions: "29 CFR Part 5: the prevailing rate = basic hourly rate + fringe; fringe can be paid into bona fide plans or in cash; Contract Work Hours and Safety Standards Act overtime is 1.5 × the basic rate (fringe isn't included in the overtime premium). " + DISCLAIMER,
    faq: [
      { question: "Is overtime on Davis-Bacon jobs based on the fringe too?", answer: "No — the overtime premium is calculated on the basic hourly rate only; fringe stays at straight time." },
      { question: "Can fringe benefits be paid in cash?", answer: "Yes — any part of the fringe not contributed to a bona fide plan must be paid in cash on the paycheck." },
    ],
  },
  {
    slug: "prop-22-calculator",
    title: "Prop 22 Earnings Guarantee Calculator",
    description: "Check California's Prop 22 earnings guarantee for app-based drivers — 120% of minimum wage for engaged time plus a per-mile amount — and the top-up owed if you earned less.",
    metaTitle: "Prop 22 Calculator 2026 — Gig Driver Earnings Guarantee",
    metaDescription: "Free Prop 22 calculator. 120% of minimum wage ($20.28 in 2026) for engaged time plus 37¢ per engaged mile, and the top-up you're owed.",
    calcInputs: [
      numberField("engagedHours", "Engaged Hours (accept to drop-off)", { default: 25, max: 200, step: 0.25 }),
      numberField("engagedMiles", "Engaged Miles", { default: 300, max: 5000 }),
      currencyField("earningsExcludingTips", "Earnings Excluding Tips", { default: 480, max: 20000, step: 5 }),
      currencyField("localMinimumWage", "Minimum Wage Used (state or local)", { default: 16.9, max: 30, step: 0.01 }),
      currencyField("perMileRate", "Per-Mile Rate", { default: 0.37, max: 2, step: 0.01 }),
    ],
    calcResult: { label: "Guaranteed Minimum", format: "currency" },
    calcResults: [
      { key: "guaranteedMinimum", label: "Guaranteed Minimum for the Period", format: "currency", highlight: true },
      { key: "topUpOwed", label: "Top-Up Owed", format: "currency" },
      { key: "hourlyFloor", label: "Engaged-Time Hourly Floor", format: "currency" },
      { key: "yourEngagedHourly", label: "Your Earnings per Engaged Hour", format: "currency" },
    ],
    instructions: "Enter your engaged time and miles (from accepting a request to completing it) for the pay period, and what the app paid you excluding tips.",
    examples: `Example: 25 engaged hours and 300 engaged miles guarantee ${usd(ex22.guaranteedMinimum)}; if you earned ${usd(480)} before tips, the app owes a top-up of ${usd(ex22.topUpOwed)}.`,
    assumptions: "Business & Professions Code §7453: 120% of the applicable minimum wage for engaged time (state $16.90 → $20.28 an hour in 2026; some cities are higher) plus a per-mile amount set yearly by the State Treasurer ($0.37 for 2026 — check the current figure). Waiting time between requests isn't covered; tips don't count toward the guarantee. " + DISCLAIMER,
    faq: [
      { question: "How much does Prop 22 guarantee in 2026?", answer: "$20.28 per engaged hour at the state minimum wage, plus a per-mile payment for engaged miles." },
      { question: "Does Prop 22 count waiting time?", answer: "No — only engaged time, from accepting an order or ride to completing it." },
    ],
  },
  {
    slug: "retro-pay-calculator",
    title: "Retro Pay Calculator (Retroactive Raise)",
    description: "Calculate retroactive (retro) pay owed when a raise should have started earlier — the rate difference for regular and overtime hours across the pay periods missed.",
    metaTitle: "Retro Pay Calculator — Retroactive Raise Back Pay",
    metaDescription: "Free retro pay calculator. Rate difference × regular and overtime hours × pay periods owed, with an after-tax estimate.",
    calcInputs: [
      currencyField("oldRate", "Old Hourly Rate", { default: 24, max: 500, step: 0.01 }),
      currencyField("newRate", "New Hourly Rate", { default: 25.5, max: 500, step: 0.01 }),
      numberField("hoursPerPeriod", "Regular Hours per Pay Period", { default: 80, max: 400, step: 0.5 }),
      numberField("overtimeHoursPerPeriod", "Overtime Hours per Pay Period", { default: 4, max: 200, step: 0.5 }),
      numberField("periodsOwed", "Pay Periods Owed", { default: 6, max: 260 }),
      percentField("withholdingPercent", "Estimated Withholding", { default: 30, max: 60 }),
    ],
    calcResult: { label: "Gross Retro Pay", format: "currency" },
    calcResults: [
      { key: "grossRetroPay", label: "Gross Retro Pay", format: "currency", highlight: true },
      { key: "netRetroPayEstimate", label: "After-Tax Estimate", format: "currency" },
      { key: "differencePerHour", label: "Difference per Hour", format: "currency" },
      { key: "retroPerPeriod", label: "Retro per Pay Period", format: "currency" },
    ],
    instructions: "Enter the old and new rates, your usual regular and overtime hours per pay period, and how many pay periods passed between the raise's effective date and when it started on your paycheck.",
    examples: `Example: a raise from $24 to $25.50 that was 6 biweekly paychecks late, with 80 regular and 4 overtime hours each, is ${usd(exR.grossRetroPay)} of retro pay (about ${usd(exR.netRetroPayEstimate)} after withholding).`,
    assumptions: "Retro pay = rate difference × (regular hours + 1.5 × overtime hours) × periods. Retro pay is usually taxed as supplemental wages (22% federal flat rate) — adjust the withholding. Union contracts may also adjust shift differentials and benefits. " + DISCLAIMER,
    faq: [
      { question: "How is retroactive pay calculated?", answer: "Multiply the difference between the new and old rates by the hours worked since the raise should have started, including 1.5× for overtime." },
      { question: "Is retro pay taxed more?", answer: "It's often withheld at the 22% supplemental rate, but your final tax depends on your total income for the year." },
    ],
  },
  {
    slug: "ihss-timesheet-calculator",
    title: "IHSS Timesheet & Overtime Calculator",
    description: "Calculate California IHSS provider pay from your timesheet — weekly hours, overtime over 40 hours, travel time and the 66-hour weekly maximum — and your monthly pay.",
    metaTitle: "IHSS Timesheet Calculator — Hours, Overtime & Pay",
    metaDescription: "Free IHSS calculator. Weekly hours up to the 66-hour maximum, overtime at 1.5× over 40 hours, travel time and monthly pay for IHSS providers.",
    calcInputs: [
      numberField("hoursPerWeek", "Hours Worked per Week", { default: 50, max: 80, step: 0.25 }),
      currencyField("hourlyRate", "County IHSS Hourly Rate", { default: 19.5, max: 50, step: 0.01 }),
      numberField("travelHoursPerWeek", "Travel Hours Between Recipients (max 7)", { default: 2, max: 7, step: 0.25 }),
      numberField("monthlyAuthorizedHours", "Recipient's Authorized Monthly Hours", { default: 216, max: 283, step: 1 }),
    ],
    calcResult: { label: "Weekly Pay", format: "currency" },
    calcResults: [
      { key: "weeklyPay", label: "Weekly Pay", format: "currency", highlight: true },
      { key: "monthlyPay", label: "Monthly Pay (average)", format: "currency" },
      { key: "overtimeHoursPerWeek", label: "Overtime Hours per Week", format: "number" },
      { key: "weeklyMaxFromAuthorization", label: "Weekly Hours from Authorization (÷ 4)", format: "number" },
      { key: "overtimePay", label: "Overtime Pay per Week", format: "currency" },
    ],
    instructions: "Enter the hours you work each week (all recipients combined), your county's IHSS hourly rate, travel time between recipients and the recipient's authorized monthly hours from the notice of action.",
    examples: `Example: 50 hours a week at $19.50 with 2 travel hours pays ${usd(exI.weeklyPay)} a week (${usd(exI.overtimePay)} of it overtime) — about ${usd(exI.monthlyPay)} a month.`,
    assumptions: "IHSS rules: providers may work up to 66 hours a week across recipients; hours over 40 in a workweek are paid at 1.5 ×; travel between recipients up to 7 hours a week is paid but doesn't count toward the 66. Weekly authorized hours are the monthly hours ÷ 4 (adjustable). County rates differ. " + DISCLAIMER,
    faq: [
      { question: "What is the maximum hours for an IHSS provider?", answer: "66 hours a week for all recipients combined, plus up to 7 hours of travel time." },
      { question: "Do IHSS providers get overtime?", answer: "Yes — hours over 40 in a workweek are paid at time-and-a-half." },
    ],
  },
  {
    slug: "california-meal-rest-break-calculator",
    title: "California Meal & Rest Break Calculator",
    description: "Find the meal and rest breaks required for a California shift and the premium pay owed when breaks are missed — one extra hour of pay per day for each type of violation.",
    metaTitle: "California Meal & Rest Break Calculator — Premiums Owed",
    metaDescription: "Free California meal and rest break calculator. Breaks required by shift length and the one-hour premiums owed for missed or late breaks.",
    calcInputs: [
      numberField("shiftHours", "Shift Length (hours worked)", { default: 10.5, max: 24, step: 0.25 }),
      numberField("mealsMissed", "Meal Breaks Missed, Late or Short That Day", { default: 1, max: 3 }),
      numberField("restBreaksMissed", "Rest Breaks Missed That Day", { default: 1, max: 6 }),
      currencyField("regularRate", "Regular Rate of Pay", { default: 22, max: 500, step: 0.05 }),
      numberField("daysWithViolations", "Days with These Violations", { default: 12, max: 365 }),
    ],
    calcResult: { label: "Premiums Owed", format: "currency" },
    calcResults: [
      { key: "premiumsOwed", label: "Premium Pay Owed", format: "currency", highlight: true },
      { key: "restBreaksRequired", label: "Rest Breaks Required", format: "number" },
      { key: "mealBreaksRequired", label: "Meal Breaks Required", format: "number" },
      { key: "premiumHoursPerDay", label: "Premium Hours per Day (max 2)", format: "number" },
      { key: "premiumPerDay", label: "Premium per Day", format: "currency" },
    ],
    instructions: "Enter a typical shift length and the breaks missed that day, your regular rate and the number of days with the same violations.",
    examples: `Example: a 10.5-hour shift requires ${exM.restBreaksRequired} rest breaks and ${exM.mealBreaksRequired} meal breaks. Missing a meal and a rest break on 12 days at $22 means ${usd(exM.premiumsOwed)} in premiums.`,
    assumptions: "Labor Code §226.7 and §512: a 30-minute meal break before the end of the 5th hour (waivable if the shift is 6 hours or less) and a second before the end of the 10th (waivable up to 12 hours if the first wasn't waived); a paid 10-minute rest break per 4 hours or major fraction (from 3.5 hours). One hour of pay at the regular rate per workday for meal violations and one for rest violations (Naranjo — premiums are wages). " + DISCLAIMER,
    faq: [
      { question: "How many breaks do I get for a 10-hour shift in California?", answer: "Two meal breaks (the second can be waived for shifts up to 12 hours) and three 10-minute rest breaks." },
      { question: "What do I get if my employer misses my break?", answer: "One additional hour of pay at your regular rate for each workday with a meal violation, and one for a rest violation." },
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
