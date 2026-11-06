// One-time (but safe to re-run) batch setup script: creates 45 HR, marketing and business operations
// calculators (Business & Industrial Calculators > HR, Marketing & Business Operations Calculators).
// Formulas live in src/lib/calc-engine-biz-ops.ts; examples are computed from the engine. Merged keywords
// (no separate page): Cost to Hire Employee → cost-per-hire; Service Level → call-center-staffing;
// Venue Capacity → event-space; Event Toilet → portable-restroom; Sales REP Field Sales → sales-
// compensation-plan; Web Page Cost → website-design-price; PPC Online, Ecommerce PPC ROI → ppc-profit.
// Existing tools reused instead of new pages: labor-cost, employee-cost, fte, turnover-rate, bradford-
// factor (moved into this sub-category), tip-split, hours-worked, bonus, food-cost, catering-cost.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-ops-calculators.ts
// or
//   npm run db:create-biz-ops-calculators

import * as E from "../src/lib/calc-engine-biz-ops";

import { foodMovedCategoryId } from "./setup-food-drink-category";
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

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const yn = (key: string, label: string, def = 0) => dropdown(key, label, YESNO, def);
const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const cur = (key: string, label: string, def: number, max = 10000000, step = 1) => currencyField(key, label, { default: def, max, step });
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const pct = (key: string, label: string, def: number, max = 100, step = 0.1) => percentField(key, label, { default: def, max, step });
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][]; currency?: string }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt] = s.results[0];
  const c = s.currency ? { currency: s.currency } : {};
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Online Estimator`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainFmt === "c" ? c : {}) },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(f === "c" ? c : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const CAT = "hr-marketing-business-operations-calculators";
const NOTE = "Planning estimates only — confirm payroll, tax and legal figures with a qualified adviser and use your own quotes and data where you have them.";

const dateField = (key: string, label: string, def: number | string = "today") => ({ key, label, type: "date", required: true, default: def });
const region = pct("regionAdjust", "Local Price Adjustment (+/− %)", 0, 100, 1);

const TOOLS: ToolDef[] = [
  mk({
    slug: "labor-burden-calculator", title: "Labor Burden Calculator",
    desc: "Calculate labor burden and the fully burdened hourly rate — FICA, FUTA, SUTA, workers' comp, health insurance, retirement match, other benefits and paid time off.",
    meta: "Labor Burden Calculator — Fully Burdened Labor Rate",
    inputs: [cur("hourlyWage", "Hourly Wage", 25, 500, 0.25), num("paidHours", "Paid Hours per Year", 2080, 4000, 1), num("ptoHours", "Paid Non-Working Hours (PTO, holidays)", 120, 1000, 1), pct("sutaRate", "State Unemployment (SUTA) Rate", 2.7, 15, 0.05), cur("sutaWageBase", "SUTA Wage Base", 9000, 100000, 100), cur("workersCompRate", "Workers' Comp per $100 of Payroll", 2.5, 50, 0.05), cur("healthInsurance", "Employer Health Insurance per Year", 8500, 50000, 50), pct("retirementMatch", "Retirement Match (% of wages)", 3, 20, 0.5), cur("otherBenefits", "Other Benefits per Year", 600, 50000, 10)],
    results: [["fullyBurdenedHourly", "Fully Burdened Cost per Productive Hour", "c"], ["burdenPercent", "Labor Burden (% of wages)", "p"], ["annualBurden", "Annual Burden", "c"], ["totalAnnualCost", "Total Annual Cost", "c"], ["payrollTaxes", "Payroll Taxes", "c"], ["workersComp", "Workers' Comp", "c"], ["benefits", "Benefits", "c"], ["productiveHours", "Productive Hours", "n"]],
    fn: E.laborBurden, ex: { hourlyWage: 25, paidHours: 2080, ptoHours: 120, sutaRate: 2.7, sutaWageBase: 9000, workersCompRate: 2.5, healthInsurance: 8500, retirementMatch: 3, otherBenefits: 600 },
    exText: (o) => `Example: a $25/hour employee carries ${o.burdenPercent}% burden (${usd(o.annualBurden)} a year), so each productive hour actually costs ${usd(o.fullyBurdenedHourly)}.`,
    how: "Enter wage, hours and your actual tax rates and benefit costs. Your SUTA rate is on your state unemployment notice; workers' comp is per $100 of payroll by class code.",
    assume: "FICA 7.65% (Social Security 6.2% to the 2026 wage base + Medicare 1.45%); FUTA 0.6% on the first $7,000 after the state credit. Productive hours exclude PTO and holidays.",
    faq: [["What is a typical labor burden rate?", "Usually 25–40% of wages for full-time staff with health benefits."]],
  }),
  mk({
    slug: "restaurant-labor-cost-calculator", title: "Restaurant Labor Cost Calculator",
    desc: "Calculate restaurant labor cost percentage — front and back of house hours and wages, management, payroll taxes and benefits — with prime cost, target labor budget and sales per labor hour.",
    meta: "Restaurant Labor Cost Calculator — Labor % & Prime Cost",
    inputs: [cur("weeklySales", "Weekly Sales", 30000, 10000000, 10), num("fohHours", "Front-of-House Hours per Week", 320, 100000, 1), cur("fohWage", "Average FOH Wage", 9, 100, 0.05), num("bohHours", "Back-of-House Hours per Week", 280, 100000, 1), cur("bohWage", "Average BOH Wage", 18, 100, 0.05), cur("managementWeekly", "Salaried Management per Week", 2200, 100000, 10), pct("payrollTaxRate", "Payroll Taxes", 10, 30, 0.1), cur("benefitsWeekly", "Benefits per Week", 400, 100000, 10), pct("foodCostPercent", "Food & Beverage Cost", 30, 60, 0.1), pct("targetLaborPercent", "Target Labor %", 30, 60, 0.5)],
    results: [["laborCostPercent", "Labor Cost (% of sales)", "p"], ["weeklyLaborCost", "Weekly Labor Cost", "c"], ["primeCostPercent", "Prime Cost (% of sales)", "p"], ["laborBudgetAtTarget", "Labor Budget at Target", "c"], ["overUnderTarget", "Over (+) / Under (−) Target", "c"], ["salesPerLaborHour", "Sales per Labor Hour", "c"], ["payrollTaxes", "Payroll Taxes", "c"]],
    fn: E.restaurantLabor, ex: { weeklySales: 30000, fohHours: 320, fohWage: 9, bohHours: 280, bohWage: 18, managementWeekly: 2200, payrollTaxRate: 10, benefitsWeekly: 400, foodCostPercent: 30, targetLaborPercent: 30 },
    exText: (o) => `Example: $30,000 of weekly sales with 600 staff hours and $2,200 of management is a ${o.laborCostPercent}% labor cost; with 30% food cost, prime cost is ${o.primeCostPercent}%.`,
    how: "Enter a week's sales and hours from your POS and scheduling reports, average wages (tipped FOH at the cash wage you pay) and management salaries.",
    assume: "Labor = wages + payroll taxes + benefits. Full-service restaurants usually target 30–35% labor and under 65% prime cost.",
    faq: [["What is a good labor cost percentage for a restaurant?", "Around 25–30% for quick service and 30–35% for full service."]],
  }),
  mk({
    slug: "hvac-labor-rate-calculator", title: "HVAC Labor Rate Calculator",
    desc: "Set your HVAC hourly labor rate — technician wage and burden, billable efficiency, overhead and vehicle cost per billable hour and profit margin — with break-even and service call fee.",
    meta: "HVAC Hourly Rate Calculator — What to Charge per Hour",
    inputs: [cur("techWage", "Technician Wage per Hour", 32, 200, 0.25), pct("burdenPercent", "Labor Burden", 30, 100, 1), pct("billablePercent", "Billable Hours (% of paid)", 60, 100, 1), num("technicians", "Technicians", 4, 1000, 1, 1), cur("annualOverhead", "Annual Overhead (office, insurance, software…)", 280000, 100000000, 100), cur("vehicleCostPerYear", "Truck & Fuel Cost per Tech per Year", 14000, 200000, 100), pct("profitMargin", "Target Net Profit Margin", 20, 60, 0.5), num("callFeeHours", "Hours Included in Service Call", 1, 4, 0.25)],
    results: [["billableHourlyRate", "Billable Hourly Rate", "c"], ["breakEvenRate", "Break-Even Rate", "c"], ["burdenedWage", "Burdened Wage", "c"], ["overheadPerBillableHour", "Overhead per Billable Hour", "c"], ["billableHoursPerTech", "Billable Hours per Tech per Year", "n"], ["serviceCallFee", "Service Call Fee", "c"]],
    fn: E.hvacLaborRate, ex: { techWage: 32, burdenPercent: 30, billablePercent: 60, technicians: 4, annualOverhead: 280000, vehicleCostPerYear: 14000, profitMargin: 20, callFeeHours: 1 },
    exText: (o) => `Example: a $32/h tech billing 60% of the time in a 4-tech shop with $280,000 overhead breaks even at ${usd(o.breakEvenRate)}; a 20% margin needs ${usd(o.billableHourlyRate)} per hour.`,
    how: "Enter your actual wages, overhead and how much of paid time is billed to customers. Most shops bill only 50–65% of paid hours.",
    assume: "Rate = (burdened wage × 2,080 ÷ billable hours + overhead and vehicle per billable hour) ÷ (1 − margin).",
    faq: [["How much do HVAC companies charge per hour?", "Typically $90–200 per hour in 2026, depending on market and whether it's flat-rate or time-and-materials."]],
  }),
  mk({
    slug: "outsourcing-cost-calculator", title: "Outsourcing Cost Calculator",
    desc: "Compare doing work in-house versus outsourcing — salaries, benefits, overhead, management and recruiting against vendor rates, oversight and transition — with annual and multi-year savings.",
    inputs: [num("employees", "In-House Employees for This Work", 3, 10000, 0.5), cur("salary", "Average Salary", 55000, 1000000, 100), pct("benefitsPercent", "Benefits & Taxes", 30, 100, 1), cur("overheadPerEmployee", "Overhead per Employee (space, IT, equipment)", 9000, 100000, 100), cur("managementCost", "Management Time Cost per Year", 15000, 10000000, 100), cur("recruitingTraining", "Recruiting & Training per Year", 6000, 10000000, 100), dropdown("pricing", "Vendor Pricing", opts(["Hourly", "Monthly retainer"]), 0), cur("vendorRate", "Vendor Hourly Rate", 28, 500, 0.25), num("hoursPerYear", "Hours Needed per Year", 6000, 1000000, 10), cur("vendorMonthly", "Vendor Monthly Fee", 12000, 10000000, 50), pct("oversightPercent", "Vendor Management Overhead", 10, 50, 1), cur("transitionCost", "One-Time Transition Cost", 10000, 10000000, 100), num("years", "Comparison Period (years)", 3, 10, 1, 1)],
    results: [["annualSavings", "Annual Savings from Outsourcing", "c"], ["inHouseAnnualCost", "In-House Annual Cost", "c"], ["outsourcedAnnualCost", "Outsourced Annual Cost", "c"], ["savingsPercent", "Savings", "p"], ["multiYearSavings", "Savings over Period", "c"], ["betterOption", "Better Option (1 = outsource, 2 = in-house)", "n"]],
    fn: E.outsourcing, ex: { employees: 3, salary: 55000, benefitsPercent: 30, overheadPerEmployee: 9000, managementCost: 15000, recruitingTraining: 6000, pricing: 0, vendorRate: 28, hoursPerYear: 6000, vendorMonthly: 12000, oversightPercent: 10, transitionCost: 10000, years: 3 },
    exText: (o) => `Example: three in-house staff cost ${usd(o.inHouseAnnualCost)} a year; outsourcing 6,000 hours at $28 costs ${usd(o.outsourcedAnnualCost)} — saving ${usd(o.annualSavings)} (${o.savingsPercent}%).`,
    how: "Enter the fully loaded cost of doing it yourself and the vendor's quote, including your time to manage the vendor.",
    assume: "Transition cost is spread over the comparison period. Quality, control and risk aren't priced in.",
    faq: [["How much can outsourcing save?", "Commonly 20–50% for transactional work such as support, bookkeeping or data entry."]],
  }),
  mk({
    slug: "eor-cost-calculator", title: "EOR Cost Calculator (Employer of Record)",
    desc: "Estimate the cost of hiring abroad through an employer of record — salary, country employer contributions, EOR fee, benefits and equipment — monthly, annually and as a deposit.",
    meta: "EOR Calculator — International Employer of Record Cost",
    inputs: [dropdown("country", "Country", opts(E.EOR_COUNTRIES.map(([n, r]) => (r >= 0 ? `${n} (~${r}% employer cost)` : n))), 0), pct("customEmployerCost", "Custom Employer Cost %", 20, 100, 0.5), cur("salary", "Annual Gross Salary (USD)", 60000, 5000000, 100), cur("eorFeeMonthly", "EOR Fee per Month", 599, 5000, 1), cur("benefitsAnnual", "Supplemental Benefits per Year", 2400, 100000, 10), cur("equipment", "Equipment & Onboarding", 1500, 50000, 10), num("depositMonths", "Security Deposit (months of payroll)", 1, 3, 0.5)],
    results: [["annualTotalCost", "Total Annual Cost", "c"], ["monthlyCost", "Monthly Cost", "c"], ["employerContributions", "Employer Contributions", "c"], ["eorFees", "EOR Fees", "c"], ["costAboveSalaryPercent", "Cost Above Salary", "p"], ["depositEstimate", "Security Deposit (refundable)", "c"]],
    fn: E.eor, ex: { country: 0, customEmployerCost: 20, salary: 60000, eorFeeMonthly: 599, benefitsAnnual: 2400, equipment: 1500, depositMonths: 1 },
    exText: (o) => `Example: a $60,000 UK hire through an EOR costs about ${usd(o.annualTotalCost)} a year — ${o.costAboveSalaryPercent}% above salary.`,
    how: "Choose the country (or enter its employer cost), the salary and the EOR's quoted monthly fee.",
    assume: "Employer contributions are typical 2026 averages (social security, pension, mandatory insurance) and depend on salary caps; 13th-month pay and mandatory bonuses add more in some countries.",
    faq: [["How much does an employer of record cost?", "EOR fees usually run $400–1,000 per employee per month on top of salary and statutory costs."]],
  }),
  mk({
    slug: "peo-cost-calculator", title: "PEO Cost Calculator",
    desc: "Estimate professional employer organization (PEO) fees — percent of payroll or per employee per month — against savings on health insurance, workers' comp and admin time.",
    inputs: [num("employees", "Employees", 25, 100000, 1), cur("averageSalary", "Average Salary", 55000, 1000000, 100), dropdown("pricing", "PEO Pricing", opts(["% of payroll", "Per employee per month (PEPM)"]), 1), pct("percentOfPayroll", "Fee (% of payroll)", 3, 15, 0.1), cur("pepm", "Fee per Employee per Month", 125, 1000, 1), cur("healthCostPerEmployee", "Current Health Cost per Employee per Year", 9000, 50000, 50), pct("healthSavings", "Health Insurance Savings via PEO", 10, 50, 1), pct("wcSavingsPercent", "Workers' Comp Savings (% of payroll)", 0.3, 5, 0.05), num("adminHoursSaved", "HR Admin Hours Saved per Month", 30, 2000, 1), cur("adminRate", "Value of Admin Time per Hour", 40, 500, 0.5)],
    results: [["annualPeoFee", "Annual PEO Fee", "c"], ["feePerEmployeeMonth", "Fee per Employee per Month", "c"], ["feeAsPercentOfPayroll", "Fee as % of Payroll", "p"], ["estimatedSavings", "Estimated Savings", "c"], ["netCost", "Net Cost after Savings", "c"], ["worthIt", "Savings Cover Fee (1 = yes)", "n"]],
    fn: E.peo, ex: { employees: 25, averageSalary: 55000, pricing: 1, percentOfPayroll: 3, pepm: 125, healthCostPerEmployee: 9000, healthSavings: 10, wcSavingsPercent: 0.3, adminHoursSaved: 30, adminRate: 40 },
    exText: (o) => `Example: 25 employees at $125 PEPM pay ${usd(o.annualPeoFee)} a year; estimated savings of ${usd(o.estimatedSavings)} leave a net cost of ${usd(o.netCost)}.`,
    how: "Enter your headcount and the PEO's quote, then realistic savings on benefits and workers' comp.",
    assume: "PEO pricing in 2026 typically runs $90–175 PEPM or 2–12% of payroll; bundled pricing may include benefits costs.",
    faq: [["Is a PEO worth it for a small business?", "Often for 10–100 employees, when better health plan rates and saved admin time exceed the fee."]],
  }),
  mk({
    slug: "truck-driver-mileage-pay-calculator", title: "Truck Driver Mileage Pay Calculator",
    desc: "Calculate a truck driver's weekly and annual pay — cents per mile, stop pay, detention, bonuses and tax-free per diem — with effective hourly rate.",
    inputs: [num("milesPerWeek", "Paid Miles per Week", 2500, 7000, 10), num("centsPerMile", "Pay Rate (cents per mile)", 60, 200, 0.5), num("stops", "Extra Stops per Week", 2, 50), cur("stopPay", "Pay per Stop", 25, 200, 1), num("detentionHours", "Paid Detention Hours per Week", 2, 60, 0.5), cur("detentionRate", "Detention Pay per Hour", 20, 100, 0.5), cur("weeklyBonus", "Weekly Bonus (safety, fuel)", 50, 2000, 5), num("daysOut", "Days Away from Home", 5, 7, 1), cur("perDiemRate", "Per Diem per Day (non-taxable)", 69, 100, 1), num("weeksPerYear", "Weeks Worked per Year", 50, 52, 1, 1), num("hoursPerWeek", "On-Duty Hours per Week", 60, 70, 1)],
    results: [["weeklyGrossPay", "Weekly Pay incl. Per Diem", "c"], ["mileagePay", "Mileage Pay", "c"], ["accessorialPay", "Stops, Detention & Bonus", "c"], ["perDiemPay", "Per Diem (non-taxable)", "c"], ["taxableWeekly", "Taxable Weekly Pay", "c"], ["annualPay", "Annual Pay", "c"], ["effectiveHourly", "Effective Hourly Rate", "c"]],
    fn: E.truckerPay, ex: { milesPerWeek: 2500, centsPerMile: 60, stops: 2, stopPay: 25, detentionHours: 2, detentionRate: 20, weeklyBonus: 50, daysOut: 5, perDiemRate: 69, weeksPerYear: 50, hoursPerWeek: 60 },
    exText: (o) => `Example: 2,500 miles at 60¢ plus stops, detention, a bonus and 5 days of per diem pays ${usd(o.weeklyGrossPay)} a week — about ${usd(o.annualPay)} a year, ${usd(o.effectiveHourly)} per on-duty hour.`,
    how: "Enter paid miles and rates from your pay settlement. Per diem is often paid by carriers at a set daily amount in place of part of mileage pay.",
    assume: "Per diem is non-taxable to the driver if paid under an accountable plan (IRS special transportation rate for 2025–26 is $80/day; carriers often pay less).",
    faq: [["How much do truck drivers make per mile?", "Company drivers typically earn 55–75¢ per mile in 2026; owner-operators gross much more but pay expenses."]],
  }),
  mk({
    slug: "cost-per-hire-calculator", title: "Cost per Hire Calculator",
    desc: "Calculate cost per hire with the SHRM/ANSI formula — internal recruiting costs plus external costs (job boards, agencies, checks, travel, relocation, tools) divided by hires.",
    meta: "Cost per Hire Calculator — Cost to Hire an Employee",
    inputs: [num("hires", "Hires in the Period", 20, 100000, 1, 1), cur("recruiterCosts", "Recruiter / Talent Team Cost", 85000, 100000000, 100), cur("hiringManagerTime", "Hiring Manager Time (value)", 20000, 100000000, 100), cur("referralBonuses", "Referral Bonuses", 6000, 10000000, 100), cur("internalOther", "Other Internal Costs", 2000, 10000000, 100), cur("jobBoards", "Job Boards & Ads", 9000, 10000000, 100), cur("agencyFees", "Agency Fees", 30000, 100000000, 100), cur("backgroundChecks", "Background Checks & Assessments", 2000, 10000000, 10), cur("travel", "Candidate Travel", 3000, 10000000, 10), cur("relocation", "Relocation", 5000, 10000000, 100), cur("tools", "Recruiting Software (ATS) Share", 6000, 10000000, 100), cur("externalOther", "Other External Costs", 1000, 10000000, 10), cur("averageSalary", "Average Salary of Hires", 65000, 10000000, 100)],
    results: [["costPerHire", "Cost per Hire", "c"], ["totalRecruitingCost", "Total Recruiting Cost", "c"], ["internalCost", "Internal Costs", "c"], ["externalCost", "External Costs", "c"], ["costAsPercentOfSalary", "Cost per Hire as % of Salary", "p"]],
    fn: E.costPerHire, ex: { hires: 20, recruiterCosts: 85000, hiringManagerTime: 20000, referralBonuses: 6000, internalOther: 2000, jobBoards: 9000, agencyFees: 30000, backgroundChecks: 2000, travel: 3000, relocation: 5000, tools: 6000, externalOther: 1000, averageSalary: 65000 },
    exText: (o) => `Example: ${usd(o.totalRecruitingCost)} of recruiting costs for 20 hires is ${usd(o.costPerHire)} per hire — ${o.costAsPercentOfSalary}% of a $65,000 salary.`,
    how: "Add up all recruiting costs for a period (quarter or year) and the number of hires who started in it.",
    assume: "ANSI/SHRM 06001: cost per hire = (internal + external costs) ÷ total hires. SHRM benchmarks put the US average near $4,700.",
    faq: [["What is the average cost per hire?", "About $4,000–5,000 on average in the US, and far more for executive roles."]],
  }),
  mk({
    slug: "hr-analytics-roi-calculator", title: "HR Analytics ROI Calculator",
    desc: "Estimate ROI from an HR analytics or people-analytics platform — reduced turnover, productivity gains and HR time saved against subscription and implementation cost.",
    inputs: [num("employees", "Employees", 500, 1000000), cur("averageSalary", "Average Salary", 60000, 1000000, 100), pct("turnoverRate", "Annual Turnover", 18, 100, 0.5), pct("turnoverReduction", "Turnover Reduction from Better Insight", 10, 100, 1), pct("costPerLeaverPercent", "Cost per Leaver (% of salary)", 33, 200, 1), pct("productivityGain", "Productivity Gain", 0.5, 20, 0.1), num("hrHoursSavedPerMonth", "HR Reporting Hours Saved per Month", 60, 10000, 1), cur("hrHourlyRate", "HR Hourly Cost", 45, 500, 0.5), cur("annualCost", "Platform Annual Cost", 60000, 10000000, 100), cur("implementation", "Implementation Cost", 30000, 10000000, 100)],
    results: [["roiPercent", "Annual ROI", "p"], ["annualBenefit", "Annual Benefit", "c"], ["netAnnualValue", "Net Annual Value", "c"], ["turnoverSavings", "Turnover Savings", "c"], ["leaversAvoided", "Leavers Avoided per Year", "n"], ["productivityValue", "Productivity Value", "c"], ["paybackMonths", "Payback (months)", "n"]],
    fn: E.hrAnalyticsRoi, ex: { employees: 500, averageSalary: 60000, turnoverRate: 18, turnoverReduction: 10, costPerLeaverPercent: 33, productivityGain: 0.5, hrHoursSavedPerMonth: 60, hrHourlyRate: 45, annualCost: 60000, implementation: 30000 },
    exText: (o) => `Example: 500 employees with 18% turnover — cutting turnover 10% avoids ${o.leaversAvoided} leavers, and with productivity and HR time the platform returns ${usd(o.annualBenefit)} a year (${o.roiPercent}% ROI).`,
    how: "Enter workforce data and conservative improvement assumptions, then the vendor's pricing.",
    assume: "Replacing an employee commonly costs one-third of salary (Work Institute); implementation is spread over three years for ROI.",
    faq: [["What is the ROI of HR analytics?", "Most value comes from reducing regrettable turnover; even a few retained employees can pay for a platform."]],
  }),
  mk({
    slug: "annual-compensation-review-calculator", title: "Annual Compensation Review (Merit Budget) Calculator",
    desc: "Plan an annual compensation review — merit increase budget, promotions, market adjustments and payroll burden — with total cost, new payroll and average raise.",
    inputs: [num("employees", "Employees", 200, 1000000), cur("averageSalary", "Average Salary", 65000, 10000000, 100), pct("meritPercent", "Merit Budget (% of payroll)", 3.5, 20, 0.1), pct("promotionShare", "Employees Promoted", 8, 100, 0.5), pct("promotionIncrease", "Average Promotion Increase", 10, 50, 0.5), cur("marketAdjustments", "Market / Equity Adjustments", 40000, 100000000, 100), pct("burdenPercent", "Payroll Tax & Benefit Load on Increases", 20, 60, 0.5)],
    results: [["totalIncreaseCost", "Total Increase Cost", "c"], ["totalWithBurden", "Total incl. Burden", "c"], ["increaseAsPercentOfPayroll", "Increase as % of Payroll", "p"], ["meritCost", "Merit Increases", "c"], ["promotionCost", "Promotions", "c"], ["newPayroll", "New Annual Payroll", "c"], ["averageRaisePerEmployee", "Average Raise per Employee", "c"]],
    fn: E.compReview, ex: { employees: 200, averageSalary: 65000, meritPercent: 3.5, promotionShare: 8, promotionIncrease: 10, marketAdjustments: 40000, burdenPercent: 20 },
    exText: (o) => `Example: a 3.5% merit budget plus 8% of staff promoted at 10% and $40,000 of market adjustments on a $13M payroll costs ${usd(o.totalIncreaseCost)} — ${o.increaseAsPercentOfPayroll}% of payroll.`,
    how: "Enter headcount, payroll and the budget percentages you're considering.",
    assume: "US salary increase budgets for 2026 average about 3.5% merit (WorldatWork / Mercer surveys), with promotion budgets of 1–1.5% of payroll on top.",
    faq: [["What is a typical merit increase budget?", "About 3–4% of payroll in 2026."]],
  }),
  mk({
    slug: "employee-onboarding-roi-calculator", title: "Employee Onboarding ROI Calculator",
    desc: "Estimate the return on a better onboarding program — faster time to productivity and lower early turnover — against program cost, per hire and per year.",
    inputs: [num("hiresPerYear", "Hires per Year", 100, 1000000), cur("averageSalary", "Average Salary", 60000, 10000000, 100), num("currentRampMonths", "Current Time to Full Productivity (months)", 6, 36, 0.5), num("improvedRampMonths", "Improved Time to Productivity (months)", 4.5, 36, 0.5), pct("currentEarlyTurnover", "Current First-Year Turnover", 25, 100, 0.5), pct("improvedEarlyTurnover", "Improved First-Year Turnover", 18, 100, 0.5), pct("costPerLeaverPercent", "Cost per Leaver (% of salary)", 33, 200, 1), cur("programCost", "Onboarding Program Cost per Year", 60000, 10000000, 100)],
    results: [["roiPercent", "ROI", "p"], ["annualBenefit", "Annual Benefit", "c"], ["netValue", "Net Value", "c"], ["fasterRampValue", "Value of Faster Ramp-Up", "c"], ["retentionValue", "Value of Better Retention", "c"], ["benefitPerHire", "Benefit per Hire", "c"]],
    fn: E.onboardingRoi, ex: { hiresPerYear: 100, averageSalary: 60000, currentRampMonths: 6, improvedRampMonths: 4.5, currentEarlyTurnover: 25, improvedEarlyTurnover: 18, costPerLeaverPercent: 33, programCost: 60000 },
    exText: (o) => `Example: 100 hires a year ramping 1.5 months faster with first-year turnover down from 25% to 18% is worth ${usd(o.annualBenefit)} — a ${o.roiPercent}% return on a $60,000 program.`,
    how: "Use your current ramp time and first-year turnover, and conservative improvement targets.",
    assume: "New hires are assumed to be about 50% productive during ramp-up; leavers cost one-third of salary to replace.",
    faq: [["Why does onboarding matter?", "Strong onboarding improves new-hire retention and gets people productive months sooner."]],
  }),
  mk({
    slug: "internal-pay-equity-calculator", title: "Internal Pay Equity Calculator (Compa-Ratio)",
    desc: "Check internal pay equity — an employee's compa-ratio and range penetration against the salary range, the gap to midpoint, and the average pay gap between two groups.",
    inputs: [cur("salary", "Employee Salary", 72000, 10000000, 100), cur("rangeMin", "Range Minimum", 64000, 10000000, 100), cur("rangeMid", "Range Midpoint", 80000, 10000000, 100), cur("rangeMax", "Range Maximum", 96000, 10000000, 100), cur("groupAAverage", "Group A Average Pay (comparison)", 82000, 10000000, 100), cur("groupBAverage", "Group B Average Pay", 78000, 10000000, 100)],
    results: [["compaRatio", "Compa-Ratio", "n"], ["rangePenetrationPercent", "Range Penetration", "p"], ["gapToMidpoint", "Gap to Midpoint", "c"], ["increaseToMidPercent", "Increase Needed to Reach Midpoint", "p"], ["groupPayGapPercent", "Group A vs B Pay Gap", "p"], ["belowRange", "Below Range Minimum (1 = yes)", "n"]],
    fn: E.payEquity, ex: { salary: 72000, rangeMin: 64000, rangeMid: 80000, rangeMax: 96000, groupAAverage: 82000, groupBAverage: 78000 },
    exText: (o) => `Example: $72,000 in a $64k–$96k range is a compa-ratio of ${o.compaRatio} (${o.rangePenetrationPercent}% into the range); the two groups differ by ${o.groupPayGapPercent}%.`,
    how: "Enter the employee's pay and the range for their grade, plus average pay for two comparable groups doing similar work.",
    assume: "Compa-ratio = salary ÷ midpoint; range penetration = (salary − min) ÷ (max − min). A raw group gap isn't proof of inequity — compare like roles, levels and tenure (regression analysis).",
    faq: [["What is a good compa-ratio?", "0.90–1.10 is typical for fully competent employees; new hires sit lower and experts higher."]],
  }),
  mk({
    slug: "procurement-savings-calculator", title: "Procurement Savings Calculator",
    desc: "Estimate procurement savings — negotiated savings on addressable spend, realization rate, team and software cost — with net savings, ROI and the revenue needed to earn the same profit.",
    meta: "Procurement Calculator — Savings, ROI & Revenue Equivalent",
    inputs: [cur("addressableSpend", "Addressable Annual Spend", 20000000, 100000000000, 1000), pct("savingsRate", "Negotiated Savings Rate", 6, 50, 0.1), pct("realization", "Savings Realized (compliance)", 70, 100, 1), cur("teamCost", "Procurement Team Cost per Year", 350000, 1000000000, 1000), cur("softwareCost", "Procurement Software per Year", 60000, 100000000, 100), pct("profitMargin", "Company Net Profit Margin", 8, 100, 0.1)],
    results: [["netAnnualSavings", "Net Annual Savings", "c"], ["realizedSavings", "Realized Savings", "c"], ["negotiatedSavings", "Negotiated Savings", "c"], ["roiPercent", "ROI on Procurement Cost", "p"], ["equivalentRevenue", "Equivalent Sales Needed", "c"], ["savingsPercentOfSpend", "Savings as % of Spend", "p"]],
    fn: E.procurement, ex: { addressableSpend: 20000000, savingsRate: 6, realization: 70, teamCost: 350000, softwareCost: 60000, profitMargin: 8 },
    exText: (o) => `Example: 6% savings on $20M of spend with 70% realization nets ${usd(o.netAnnualSavings)} after team and software costs — the same profit as ${usd(o.equivalentRevenue)} of new sales at an 8% margin.`,
    how: "Enter the spend procurement can influence, expected savings and how much of it actually reaches the bottom line.",
    assume: "Realization reflects maverick spend and contract leakage; best-in-class teams realize 80%+.",
    faq: [["What is a good procurement savings rate?", "Typically 3–10% of addressable spend a year, higher in the first sourcing waves."]],
  }),
  mk({
    slug: "call-center-staffing-calculator", title: "Call Center Staffing Calculator (Erlang C)",
    desc: "Calculate how many agents a call center needs with Erlang C — calls per hour, average handle time, service level target (e.g. 80/20) and shrinkage — with ASA and occupancy.",
    meta: "Outbound / Inbound Call Center Staffing Calculator — Erlang C",
    inputs: [num("callsPerHour", "Calls per Hour", 200, 100000, 1), num("ahtSeconds", "Average Handle Time (s)", 300, 3600, 1, 10), pct("serviceLevel", "Target Service Level", 80, 99, 1), num("targetSeconds", "Answer Within (s)", 20, 600, 1), pct("shrinkage", "Shrinkage (breaks, training, absence)", 30, 80, 1)],
    results: [["agentsScheduled", "Agents to Schedule (with shrinkage)", "n"], ["agentsOnPhones", "Agents Needed on Phones", "n"], ["serviceLevelPercent", "Achieved Service Level", "p"], ["averageSpeedOfAnswerSec", "Average Speed of Answer (s)", "n"], ["occupancyPercent", "Agent Occupancy", "p"], ["trafficErlangs", "Traffic (Erlangs)", "n"], ["probabilityOfWaitPercent", "Probability a Caller Waits", "p"]],
    fn: E.callCenter, ex: { callsPerHour: 200, ahtSeconds: 300, serviceLevel: 80, targetSeconds: 20, shrinkage: 30 },
    exText: (o) => `Example: 200 calls an hour at a 5-minute handle time is ${o.trafficErlangs} Erlangs; hitting 80/20 needs ${o.agentsOnPhones} agents on the phones — ${o.agentsScheduled} scheduled with 30% shrinkage.`,
    how: "Enter forecast calls for the interval, handle time (talk + hold + wrap-up) and your service level goal. For outbound, use dials per hour and connect handle time.",
    assume: "Erlang C assumes callers wait (no abandonment) and random arrivals; it tends to overstate staff slightly when abandonment is high.",
    faq: [["What does 80/20 service level mean?", "80% of calls answered within 20 seconds."]],
  }),
  mk({
    slug: "on-call-pay-calculator", title: "On-Call Pay Calculator",
    desc: "Calculate on-call pay — standby pay per hour or as a percentage of base, callback pay with minimum guaranteed hours and overtime multiplier — and the effective rate.",
    inputs: [cur("baseRate", "Base Hourly Rate", 40, 500, 0.25), num("onCallHours", "On-Call (Standby) Hours", 60, 744, 1), dropdown("standbyMode", "Standby Pay", opts(["Flat $ per hour", "% of base rate"]), 0), cur("standbyRate", "Standby Pay per Hour", 3, 100, 0.25), pct("standbyPercent", "Standby % of Base", 15, 100, 1), num("callbacks", "Callbacks", 3, 100), num("avgCallbackHours", "Average Callback Duration (h)", 1, 24, 0.25), num("minimumHours", "Minimum Guaranteed Hours per Callback", 2, 8, 0.5), num("callbackMultiplier", "Callback Pay Multiplier", 1.5, 3, 0.1, 1)],
    results: [["totalOnCallPay", "Total On-Call Pay", "c"], ["standbyPay", "Standby Pay", "c"], ["callbackPay", "Callback Pay", "c"], ["paidCallbackHours", "Paid Callback Hours", "n"], ["effectiveRatePerOnCallHour", "Effective Pay per On-Call Hour", "c"]],
    fn: E.onCallPay, ex: { baseRate: 40, onCallHours: 60, standbyMode: 0, standbyRate: 3, standbyPercent: 15, callbacks: 3, avgCallbackHours: 1, minimumHours: 2, callbackMultiplier: 1.5 },
    exText: (o) => `Example: 60 standby hours at $3 plus three callbacks paid at a 2-hour minimum and time-and-a-half on a $40 base totals ${usd(o.totalOnCallPay)}.`,
    how: "Enter your on-call policy's standby rate and callback rules.",
    assume: "Under the FLSA, on-call time is generally not hours worked if employees can use the time for their own purposes; time spent responding is. Some states require reporting-time pay.",
    faq: [["Do you have to pay employees for being on call?", "Not always under federal law, but calls worked must be paid and many employers pay a standby stipend."]],
  }),
  mk({
    slug: "employee-engagement-calculator", title: "Employee Engagement Cost Calculator",
    desc: "Estimate what low employee engagement costs — actively disengaged and not-engaged employees as lost productivity — and the savings from improving engagement.",
    inputs: [num("employees", "Employees", 250, 10000000), cur("averageSalary", "Average Salary", 60000, 10000000, 100), pct("activelyDisengaged", "Actively Disengaged", 17, 100, 0.5), pct("notEngaged", "Not Engaged", 50, 100, 0.5), pct("notEngagedCost", "Productivity Loss for Not Engaged (% of salary)", 9, 50, 0.5), pct("improvement", "Expected Improvement", 20, 100, 1)],
    results: [["annualDisengagementCost", "Annual Cost of Disengagement", "c"], ["activelyDisengagedCost", "Actively Disengaged Cost", "c"], ["notEngagedCost", "Not-Engaged Cost", "c"], ["costPerEmployee", "Cost per Employee", "c"], ["percentOfPayroll", "Cost as % of Payroll", "p"], ["savingsFromImprovement", "Savings from Improvement", "c"]],
    fn: E.engagementCost, ex: { employees: 250, averageSalary: 60000, activelyDisengaged: 17, notEngaged: 50, notEngagedCost: 9, improvement: 20 },
    exText: (o) => `Example: in a 250-person company with 17% actively disengaged and half not engaged, lost productivity costs about ${usd(o.annualDisengagementCost)} a year (${o.percentOfPayroll}% of payroll).`,
    how: "Use your engagement survey results (or Gallup averages) and payroll data.",
    assume: "Gallup estimates actively disengaged employees cost about 18% of their salary; not-engaged staff are estimated here at 9% (adjustable).",
    faq: [["How much does disengagement cost?", "Gallup estimates low engagement costs the global economy about 9% of GDP."]],
  }),
  mk({
    slug: "biweekly-pay-schedule-calculator", title: "Biweekly Pay Schedule Calculator 2026",
    desc: "Map a biweekly pay schedule for any year — number of paydays (26 or 27), first and last payday, next payday, the months with three paychecks and gross pay per check.",
    meta: "Biweekly Pay Schedule 2026 — Paydays & 3-Paycheck Months",
    inputs: [dateField("firstPayDate", "Any Known Payday", 20455), num("year", "Year", 2026, 2100, 1, 2000), cur("annualSalary", "Annual Salary", 65000, 10000000, 100), dropdown("divisor", "Salary Split Over", opts(["26 paychecks (standard)", "Actual paydays in year"]), 0)],
    results: [["paydaysInYear", "Paydays in Year", "n"], ["firstPaydayOfYear", "First Payday", "d"], ["lastPaydayOfYear", "Last Payday", "d"], ["nextPayday", "Next Payday from Today", "d"], ["firstThreePaycheckMonthDate", "First 3-Paycheck Month (3rd payday)", "d"], ["secondThreePaycheckMonthDate", "Second 3-Paycheck Month (3rd payday)", "d"], ["grossPerPaycheck", "Gross per Paycheck", "c"]],
    fn: E.biweeklySchedule, ex: { firstPayDate: 20455, year: 2026, annualSalary: 65000, divisor: 0 },
    exText: (o) => `Example: with paydays every other Friday starting 2 Jan 2026 there are ${o.paydaysInYear} paydays in 2026, and a $65,000 salary pays ${usd(o.grossPerPaycheck)} gross per check.`,
    how: "Enter any one payday on your schedule (for example the first Friday payday of the year) and the year.",
    assume: "Paydays repeat every 14 days. In years with 27 paydays, employers either divide salary by 26 (and pay an extra check) or by 27.",
    faq: [["How many pay periods are in 2026?", "26 for most biweekly schedules; it depends on which day the first payday falls."], ["Which months have three paychecks?", "Two months a year on a biweekly schedule — the calculator shows the dates."]],
  }),
  mk({
    slug: "long-term-incentive-plan-calculator", title: "Long-Term Incentive Plan (LTIP) Calculator",
    desc: "Value an LTIP grant — RSUs, performance shares or stock options — at vesting from grant value or units, share price growth, performance multiplier and strike price, with tax estimate.",
    inputs: [dropdown("grantType", "Award Type", opts(["RSUs (time-based)", "Performance shares (PSUs)", "Stock options"]), 0), cur("grantValue", "Grant Value at Grant (0 = use units)", 60000, 100000000, 100), num("units", "Units / Options Granted", 1000, 100000000, 1), cur("sharePrice", "Share Price at Grant", 60, 100000, 0.01), cur("strikePrice", "Option Strike Price", 60, 100000, 0.01), pct("annualGrowth", "Expected Share Price Growth per Year", 8, 100, 0.5), num("vestYears", "Vesting Period (years)", 3, 10, 1, 1), pct("performanceMultiplier", "PSU Performance Payout (% of target)", 100, 200, 5), pct("taxRate", "Tax Rate at Vest / Exercise", 37, 60, 0.5)],
    results: [["valueAtVest", "Value at Vest", "c"], ["grantDateValue", "Grant-Date Value", "c"], ["annualizedValue", "Annualized Value", "c"], ["unitsVesting", "Units Vesting", "n"], ["projectedSharePrice", "Projected Share Price", "c"], ["estimatedTax", "Estimated Tax", "c"]],
    fn: E.ltip, ex: { grantType: 0, grantValue: 60000, units: 1000, sharePrice: 60, strikePrice: 60, annualGrowth: 8, vestYears: 3, performanceMultiplier: 100, taxRate: 37 },
    exText: (o) => `Example: a $60,000 RSU grant at $60 a share (1,000 units) growing 8% a year is worth about ${usd(o.valueAtVest)} when it vests in 3 years.`,
    how: "Enter the award from your grant letter, today's share price and a growth assumption.",
    assume: "Cliff vesting at the end of the period for simplicity; RSUs and PSUs are taxed as ordinary income at vest, options at exercise (NSOs).",
    faq: [["How is an LTIP valued?", "Units vesting × share price at vest (minus strike for options), times any performance payout factor."]],
  }),
  mk({
    slug: "b2b-ecommerce-business-case-calculator", title: "B2B Ecommerce Business Case Calculator",
    desc: "Build the business case for B2B ecommerce — revenue lift from online ordering, order processing savings and sales time freed against platform and implementation costs — with 3-year ROI and payback.",
    meta: "Business Case Calculator for B2B Ecommerce — ROI & Payback",
    inputs: [cur("b2bRevenue", "Annual B2B Revenue", 25000000, 100000000000, 1000), pct("shareOnline", "Share of Orders Moving Online", 40, 100, 1), pct("revenueLift", "Revenue Lift on Online Customers", 8, 100, 0.5), pct("grossMargin", "Gross Margin", 30, 100, 0.5), num("ordersPerYear", "Orders per Year", 20000, 100000000), cur("offlineOrderCost", "Cost to Process an Offline Order", 18, 500, 0.25), cur("onlineOrderCost", "Cost to Process an Online Order", 4, 500, 0.25), num("repHoursSaved", "Sales Rep Hours Freed per Year", 3000, 1000000, 10), cur("repRate", "Sales Rep Hourly Cost", 45, 500, 0.5), cur("platformAnnual", "Platform Cost per Year", 120000, 100000000, 100), cur("implementation", "Implementation Cost", 200000, 100000000, 100)],
    results: [["threeYearRoiPercent", "3-Year ROI", "p"], ["annualBenefit", "Annual Benefit", "c"], ["threeYearNet", "3-Year Net Value", "c"], ["paybackMonths", "Payback (months)", "n"], ["incrementalGrossProfit", "Incremental Gross Profit", "c"], ["orderProcessingSavings", "Order Processing Savings", "c"], ["salesTimeSavings", "Sales Time Value", "c"]],
    fn: E.b2bEcommerce, ex: { b2bRevenue: 25000000, shareOnline: 40, revenueLift: 8, grossMargin: 30, ordersPerYear: 20000, offlineOrderCost: 18, onlineOrderCost: 4, repHoursSaved: 3000, repRate: 45, platformAnnual: 120000, implementation: 200000 },
    exText: (o) => `Example: moving 40% of a $25M B2B business online with an 8% lift returns ${usd(o.annualBenefit)} a year — a 3-year ROI of ${o.threeYearRoiPercent}% and payback in ${o.paybackMonths} months.`,
    how: "Enter current revenue and order data, realistic adoption and lift, and platform quotes.",
    assume: "Benefits are steady from year 1 (real adoption ramps up — consider a lower year-1 share).",
    faq: [["What ROI does B2B ecommerce deliver?", "Most comes from cheaper order processing, larger online order values and freeing reps to sell rather than take orders."]],
  }),
  mk({
    slug: "commercial-kitchen-cost-calculator", title: "Commercial Kitchen Cost Calculator",
    desc: "Estimate the cost to build a commercial kitchen — build-out and equipment by kitchen type, hood and fire suppression per foot, walk-in cooler, grease interceptor and permits.",
    inputs: [num("sqFt", "Kitchen Area (sq ft)", 800, 100000, 10), dropdown("tier", "Kitchen Type", opts(E.KITCHEN_TIERS.map(([n, c]) => `${n} (~$${c}/sq ft)`)), 1), num("hoodFeet", "Hood Length (ft)", 12, 200, 0.5), cur("hoodPerFoot", "Hood + Fire Suppression per ft", 1500, 10000, 10), yn("walkIn", "Walk-In Cooler / Freezer?", 1), cur("walkInCost", "Walk-In Cost", 15000, 200000, 100), yn("greaseInterceptor", "Grease Interceptor (~$8,000)?", 1), cur("permitsDesign", "Permits & Design", 12000, 1000000, 100), region],
    results: [["totalCost", "Estimated Total Cost", "c"], ["buildOutAndEquipment", "Build-Out & Equipment", "c"], ["hoodSystem", "Hood System", "c"], ["extras", "Walk-In, Interceptor & Permits", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.commercialKitchen, ex: { sqFt: 800, tier: 1, hoodFeet: 12, hoodPerFoot: 1500, walkIn: 1, walkInCost: 15000, greaseInterceptor: 1, permitsDesign: 12000, regionAdjust: 0 },
    exText: (o) => `Example: an 800 sq ft full-service kitchen with a 12 ft hood, walk-in and interceptor costs about ${usd(o.totalCost)} (${usd(o.lowEstimate)}–${usd(o.highEstimate)}).`,
    how: "Choose the kitchen type and size, hood length and major items. Used equipment can cut equipment cost 40–60%.",
    assume: "2026 US typical build-out plus equipment: $100–400 per sq ft of kitchen. Hood systems ~$1,000–2,500 per linear foot installed.",
    faq: [["How much does a commercial kitchen cost?", "Usually $100,000–300,000 for a typical restaurant kitchen including equipment."]],
  }),
  mk({
    slug: "portable-restroom-calculator", title: "Portable Restroom Calculator",
    desc: "Work out how many portable toilets you need for an event or a construction site — by guests and hours (alcohol and gender mix) or by workers — with ADA units, handwash stations and rental cost.",
    meta: "Portable Restroom & Event Toilet Calculator — How Many Units",
    inputs: [dropdown("mode", "Use", opts(["Event", "Construction / job site"]), 0), num("guests", "Guests (peak attendance)", 250, 1000000), num("hours", "Event Length (hours)", 6, 72, 0.5, 1), yn("alcohol", "Alcohol Served (+20%)?", 1), pct("womenShare", "Women Attendees", 50, 100, 1), num("workers", "Workers on Site", 30, 100000), num("hoursPerWeek", "Work Hours per Week", 40, 84, 1, 10), cur("unitPrice", "Standard Unit per Event / Month", 175, 2000, 5), cur("adaPrice", "ADA Unit per Event / Month", 275, 3000, 5), cur("sinkPrice", "Handwash Station per Event / Month", 125, 2000, 5), num("rentalPeriods", "Rental Periods (events or months)", 1, 60, 1, 1)],
    results: [["unitsNeeded", "Portable Toilets Needed", "n"], ["adaUnits", "ADA-Accessible Units (included)", "n"], ["handwashStations", "Handwash Stations", "n"], ["rentalCost", "Estimated Rental Cost", "c"], ["guestsPerUnit", "People per Unit", "n"]],
    fn: E.portableRestroom, ex: { mode: 0, guests: 250, hours: 6, alcohol: 1, womenShare: 50, workers: 30, hoursPerWeek: 40, unitPrice: 175, adaPrice: 275, sinkPrice: 125, rentalPeriods: 1 },
    exText: (o) => `Example: 250 guests for 6 hours with alcohol need about ${o.unitsNeeded} portable toilets (${o.adaUnits} ADA) and ${o.handwashStations} handwash station — roughly ${usd(o.rentalCost)}.`,
    how: "For events, enter peak guests and duration; for job sites, the number of workers.",
    assume: "Event rule of thumb: 1 unit per 50 guests per 4 hours, +20% with alcohol, more when women are the majority. OSHA 1926.51: 1 toilet for up to 20 workers, then 1 seat + 1 urinal per 40. ADA requires at least 5% accessible units (minimum one).",
    faq: [["How many porta potties for 100 guests?", "About 2 for a 4-hour event, 3 if alcohol is served or the event runs longer."]],
  }),
  mk({
    slug: "event-space-calculator", title: "Event Space & Venue Capacity Calculator",
    desc: "Find how many guests a room holds for receptions, theater, banquet, classroom, conference or cabaret layouts — after stage, dance floor and buffet — checked against fire-code occupant load.",
    meta: "Venue Capacity Calculator — Event Space by Layout",
    inputs: [num("sqFt", "Room Area (sq ft)", 3000, 1000000, 10), dropdown("layout", "Layout", opts(E.LAYOUTS.map(([n, s]) => `${n} (~${s} sq ft/guest)`)), 2), num("stage", "Stage / AV Area (sq ft)", 200, 100000), num("danceFloor", "Dance Floor (sq ft)", 400, 100000), num("buffetBar", "Buffet & Bars (sq ft)", 200, 100000), num("guests", "Planned Guests", 150, 1000000)],
    results: [["recommendedCapacity", "Recommended Capacity", "n"], ["comfortableCapacity", "Comfortable Capacity (layout)", "n"], ["fireCodeMaximum", "Fire-Code Occupant Load", "n"], ["netUsableSqFt", "Net Seating Area (sq ft)", "n"], ["sqFtNeededForGuests", "Space Needed for Your Guests (sq ft)", "n"], ["fits", "Your Guest Count Fits (1 = yes)", "n"]],
    fn: E.eventSpace, ex: { sqFt: 3000, layout: 2, stage: 200, danceFloor: 400, buffetBar: 200, guests: 150 },
    exText: (o) => `Example: a 3,000 sq ft room set banquet-style with a stage, dance floor and buffet seats about ${o.recommendedCapacity} guests, so 150 ${o.fits ? "fits" : "doesn't fit"}.`,
    how: "Enter the room's area, the layout and space taken by stage, dance floor and food stations.",
    assume: "Planner space factors per guest; fire-code check uses IBC net occupant load factors (5 sq ft standing, 7 chairs only, 15 tables and chairs). The posted occupancy certificate always governs.",
    faq: [["How much space do you need per guest?", "About 10–12 sq ft per guest for a seated banquet and 8 sq ft for a standing reception."]],
  }),
  mk({
    slug: "office-space-calculator", title: "Office Space Calculator",
    desc: "Calculate how much office space you need — square feet per person by office style, meeting rooms, growth and load factor — with rentable area and annual rent.",
    meta: "Office Space Calculator — Square Feet per Employee",
    inputs: [num("employees", "Employees", 40, 100000), pct("growth", "Growth to Plan For", 20, 200, 1), dropdown("style", "Office Style", opts(E.OFFICE_STYLES.map(([n, s]) => `${n} (~${s} sq ft/person)`)), 1), num("meetingRooms", "Meeting Rooms (~250 sq ft each)", 3, 1000), num("extraSqFt", "Other Space (reception, storage, labs)", 600, 1000000, 10), pct("loadFactor", "Building Load Factor", 15, 40, 0.5), cur("rentPerSqFtYear", "Rent per Sq Ft per Year", 38, 300, 0.25)],
    results: [["rentableSqFt", "Rentable Sq Ft to Lease", "n"], ["usableSqFt", "Usable Sq Ft", "n"], ["annualRent", "Annual Rent", "c"], ["monthlyRent", "Monthly Rent", "c"], ["sqFtPerPerson", "Rentable Sq Ft per Person", "n"], ["plannedHeadcount", "Planned Headcount", "n"]],
    fn: E.officeSpace, ex: { employees: 40, growth: 20, style: 1, meetingRooms: 3, extraSqFt: 600, loadFactor: 15, rentPerSqFtYear: 38 },
    exText: (o) => `Example: 40 people planning for 20% growth in a mixed layout need about ${fmt(o.rentableSqFt, 0)} rentable sq ft — ${usd(o.annualRent)} a year at $38/sq ft.`,
    how: "Enter today's headcount, how much growth to plan for, the layout and local asking rent.",
    assume: "US office leases quote rentable area, which adds a load factor for common areas; 2026 averages run about $30–45 per sq ft per year (much higher in prime CBDs).",
    faq: [["How much office space per employee?", "About 125–250 sq ft per person depending on layout, plus shared rooms."]],
  }),
  mk({
    slug: "office-supply-budget-calculator", title: "Office Supply Budget Calculator",
    desc: "Set an office supply budget per employee — general supplies, printing by pages and cost per page, breakroom and coffee — monthly and annually.",
    meta: "Office Supply Calculator — Budget per Employee",
    inputs: [num("employees", "Employees", 25, 100000), cur("suppliesPerEmployeeYear", "General Supplies per Employee per Year", 220, 5000, 5), num("pagesPerEmployeeMonth", "Printed Pages per Employee per Month", 150, 5000, 5), cur("costPerPage", "Cost per Page (toner + paper)", 0.04, 1, 0.005), cur("breakroomPerEmployeeMonth", "Breakroom / Coffee per Employee per Month", 25, 500, 1), cur("otherAnnual", "Other (mailing, cleaning supplies) per Year", 1500, 1000000, 10)],
    results: [["annualBudget", "Annual Budget", "c"], ["monthlyBudget", "Monthly Budget", "c"], ["perEmployeeYear", "Per Employee per Year", "c"], ["generalSupplies", "General Supplies", "c"], ["printing", "Printing", "c"], ["breakroom", "Breakroom", "c"]],
    fn: E.officeSupplies, ex: { employees: 25, suppliesPerEmployeeYear: 220, pagesPerEmployeeMonth: 150, costPerPage: 0.04, breakroomPerEmployeeMonth: 25, otherAnnual: 1500 },
    exText: (o) => `Example: a 25-person office spends about ${usd(o.annualBudget)} a year (${usd(o.perEmployeeYear)} per employee) on supplies, printing and the breakroom.`,
    how: "Enter headcount and your typical spend rates, or start from the defaults.",
    assume: "Typical office supply spend is $200–500 per employee per year before printing and breakroom costs.",
    faq: [["How much should a business spend on office supplies?", "Roughly $200–500 per employee per year for basic supplies."]],
  }),
  mk({
    slug: "cdn-cost-calculator", title: "CDN Cost Calculator",
    desc: "Estimate content delivery network (CDN) cost — tiered per-GB data transfer pricing, HTTPS request charges and fixed fees — monthly, annually and effective cost per GB.",
    inputs: [num("tbPerMonth", "Data Transfer per Month (TB)", 50, 100000, 0.1), num("millionRequests", "Requests per Month (millions)", 300, 1000000, 1), cur("pricePerMillionRequests", "Price per Million Requests", 1, 10, 0.01), pct("priceAdjust", "Price Adjustment vs List (+/−)", 0, 100, 1), cur("fixedMonthly", "Fixed Monthly Fees (plan, shield, WAF)", 0, 100000, 1)],
    results: [["monthlyCost", "Monthly Cost", "c"], ["annualCost", "Annual Cost", "c"], ["dataTransferCost", "Data Transfer", "c"], ["requestCost", "Requests", "c"], ["effectivePerGb", "Effective Cost per GB", "c"], ["totalGb", "Total GB", "n"]],
    fn: E.cdnCost, ex: { tbPerMonth: 50, millionRequests: 300, pricePerMillionRequests: 1, priceAdjust: 0, fixedMonthly: 0 },
    exText: (o) => `Example: 50 TB a month and 300 million requests on list tiered pricing costs about ${usd(o.monthlyCost)} a month — ${o.effectivePerGb} $/GB.`,
    how: "Enter monthly egress and requests from your analytics. Use the adjustment for committed-use discounts or a different provider's rates.",
    assume: "Tiers modelled on typical North America list pricing: first 10 TB $0.085/GB, next 40 TB $0.08, next 100 TB $0.06, next 350 TB $0.04, above $0.03; HTTPS requests ~$1 per million. Other regions cost more.",
    faq: [["How much does a CDN cost per GB?", "Roughly $0.02–0.09 per GB at list prices, falling with volume and commitments."]],
  }),
  mk({
    slug: "effective-labor-rate-calculator", title: "Effective Labor Rate (ELR) Calculator",
    desc: "Calculate your shop's effective labor rate — labor sales per billed hour — versus the posted door rate, revenue lost to discounts and warranty, technician efficiency and gross profit per hour.",
    meta: "ELR Calculator — Effective Labor Rate for Repair Shops",
    inputs: [cur("laborSales", "Labor Sales for the Period", 96000, 100000000, 10), num("billedHours", "Billed / Flagged Hours", 820, 1000000, 0.1), cur("postedRate", "Posted Door Labor Rate", 145, 1000, 0.5), num("clockedHours", "Technician Clocked Hours", 900, 1000000, 0.1), cur("techPayroll", "Technician Payroll for the Period", 34000, 100000000, 10)],
    results: [["effectiveLaborRate", "Effective Labor Rate", "c"], ["rateRealizationPercent", "Rate Realization", "p"], ["lostPerHour", "Lost per Billed Hour", "c"], ["monthlyRevenueGap", "Revenue Gap for the Period", "c"], ["technicianEfficiencyPercent", "Technician Efficiency", "p"], ["grossProfitPerBilledHour", "Labor Gross Profit per Billed Hour", "c"]],
    fn: E.elr, ex: { laborSales: 96000, billedHours: 820, postedRate: 145, clockedHours: 900, techPayroll: 34000 },
    exText: (o) => `Example: $96,000 of labor on 820 billed hours is an ELR of ${usd(o.effectiveLaborRate)} — ${o.rateRealizationPercent}% of the $145 door rate, a ${usd(o.monthlyRevenueGap)} gap.`,
    how: "Pull labor sales and billed hours from your shop management system for a month, plus clocked hours and tech payroll.",
    assume: "ELR = labor sales ÷ billed hours. Discounts, warranty and internal work at lower rates pull ELR below the door rate.",
    faq: [["What is a good effective labor rate?", "Within 90–95% of your posted rate is a common target for independent repair shops."]],
  }),
  mk({
    slug: "spa-revenue-calculator", title: "Spa Revenue Calculator",
    desc: "Project spa or med-spa revenue — treatment rooms, opening hours, utilization, service length, average ticket and retail attach — monthly, annually, per room and per available hour.",
    inputs: [num("rooms", "Treatment Rooms", 6, 500), num("hoursPerDay", "Open Hours per Day", 10, 24, 0.5), num("daysPerWeek", "Days Open per Week", 7, 7, 1, 1), pct("utilization", "Room Utilization", 55, 100, 1), num("serviceHours", "Average Service incl. Turnover (h)", 1.25, 4, 0.05, 0.25), cur("averageTicket", "Average Service Ticket", 135, 5000, 1), pct("retailAttach", "Guests Buying Retail", 30, 100, 1), cur("averageRetail", "Average Retail Purchase", 55, 2000, 1)],
    results: [["monthlyRevenue", "Monthly Revenue", "c"], ["annualRevenue", "Annual Revenue", "c"], ["serviceRevenue", "Service Revenue (monthly)", "c"], ["retailRevenue", "Retail Revenue (monthly)", "c"], ["treatmentsPerMonth", "Treatments per Month", "n"], ["revenuePerRoomMonth", "Revenue per Room per Month", "c"], ["revenuePerAvailableHour", "Revenue per Available Treatment Hour", "c"]],
    fn: E.spaRevenue, ex: { rooms: 6, hoursPerDay: 10, daysPerWeek: 7, utilization: 55, serviceHours: 1.25, averageTicket: 135, retailAttach: 30, averageRetail: 55 },
    exText: (o) => `Example: 6 rooms open 10 hours a day at 55% utilization deliver about ${fmt(o.treatmentsPerMonth, 0)} treatments and ${usd(o.monthlyRevenue)} a month (${usd(o.annualRevenue)} a year).`,
    how: "Enter capacity, realistic utilization and your average service and retail tickets.",
    assume: "Day spas commonly run 50–65% treatment-room utilization; retail is often 10–20% of revenue.",
    faq: [["How much revenue does a spa make?", "Small day spas typically gross $500,000–1.5M a year; revenue per available treatment hour is the key metric."]],
  }),
  mk({
    slug: "sales-compensation-plan-calculator", title: "Sales Compensation Plan Calculator",
    desc: "Model a sales rep's compensation plan — base, OTE and quota give the commission rate; see pay at any attainment with thresholds and accelerators, pay mix and cost of sales.",
    meta: "Compensation Plan Calculator — Sales Rep OTE, Quota & Commission",
    inputs: [cur("baseSalary", "Base Salary", 70000, 10000000, 100), cur("ote", "On-Target Earnings (OTE)", 140000, 10000000, 100), cur("quota", "Annual Quota", 1000000, 1000000000, 1000), pct("attainment", "Quota Attainment", 120, 400, 1), pct("threshold", "Minimum Attainment Before Commission", 0, 100, 1), num("accelerator", "Accelerator Above 100% (× rate)", 1.5, 5, 0.1, 1)],
    results: [["totalPay", "Total Pay at This Attainment", "c"], ["commission", "Commission", "c"], ["commissionRatePercent", "Commission Rate (on bookings)", "p"], ["payMix", "Base Share of OTE (pay mix)", "p"], ["costOfSalesPercent", "Cost of Sales (% of bookings)", "p"], ["salesClosed", "Sales Closed", "c"], ["quotaToOteRatio", "Quota-to-OTE Ratio", "n"]],
    fn: E.compPlan, ex: { baseSalary: 70000, ote: 140000, quota: 1000000, attainment: 120, threshold: 0, accelerator: 1.5 },
    exText: (o) => `Example: a $70k base / $140k OTE plan on a $1M quota pays ${o.commissionRatePercent}% commission; at 120% attainment with a 1.5× accelerator the rep earns ${usd(o.totalPay)}.`,
    how: "Enter base, OTE and quota, then test attainment levels and accelerators.",
    assume: "Commission rate = variable pay ÷ quota; accelerated rate applies only above 100%. A 50/50 pay mix and quota of 5–8× OTE are common in SaaS.",
    faq: [["How do I set a sales commission rate?", "Divide the target variable pay by the quota — $70,000 on a $1M quota is 7%."]],
  }),
  mk({
    slug: "par-level-calculator", title: "Par Level Calculator",
    desc: "Calculate inventory par levels for restaurants, bars and supply rooms — daily usage, delivery frequency, lead time and safety stock — plus how much to order today.",
    inputs: [num("dailyUsage", "Average Daily Usage (units)", 12, 1000000, 0.1), num("daysBetweenDeliveries", "Days Between Deliveries", 7, 90, 0.5), num("leadTimeDays", "Lead Time (days)", 2, 90, 0.5), pct("safetyStock", "Safety Stock", 20, 200, 1), num("onHand", "Currently On Hand (units)", 40, 1000000, 0.1), num("unitsPerCase", "Units per Case", 6, 10000, 1, 1), cur("unitCost", "Cost per Unit", 4.5, 100000, 0.01)],
    results: [["parLevel", "Par Level (units)", "n"], ["orderQuantity", "Order Quantity (units)", "n"], ["casesToOrder", "Cases to Order", "n"], ["daysOfStockOnHand", "Days of Stock on Hand", "n"], ["orderValue", "Order Value", "c"]],
    fn: E.parLevel, ex: { dailyUsage: 12, daysBetweenDeliveries: 7, leadTimeDays: 2, safetyStock: 20, onHand: 40, unitsPerCase: 6, unitCost: 4.5 },
    exText: (o) => `Example: using 12 a day with weekly deliveries, a 2-day lead time and 20% safety stock sets par at ${o.parLevel}; with 40 on hand, order ${o.orderQuantity} (${o.casesToOrder} cases).`,
    how: "Use average daily usage from recent weeks, your delivery schedule and supplier lead time.",
    assume: "Par = daily usage × (days between deliveries + lead time) × (1 + safety stock).",
    faq: [["How do you calculate par level?", "Multiply average daily usage by the days until the next delivery arrives, then add a safety buffer."]],
  }),
  mk({
    slug: "saas-tco-calculator", title: "SaaS TCO Calculator (Total Cost of Ownership)",
    desc: "Calculate the total cost of ownership of SaaS software over several years — per-user subscriptions with renewal increases, implementation, training, integrations, migration, admin time and add-ons.",
    inputs: [num("users", "Users", 100, 1000000), cur("pricePerUserMonth", "Price per User per Month", 45, 10000, 0.5), pct("renewalIncrease", "Annual Renewal Increase", 5, 50, 0.5), num("years", "Years", 3, 10, 1, 1), cur("implementation", "Implementation", 25000, 100000000, 100), cur("training", "Training", 8000, 10000000, 100), cur("integration", "Integrations", 15000, 10000000, 100), cur("migration", "Data Migration", 6000, 10000000, 100), pct("adminFteShare", "Admin Time (% of one FTE)", 25, 1000, 1), cur("adminSalary", "Admin Loaded Salary", 95000, 1000000, 100), cur("addOnsAnnual", "Add-Ons & Support per Year", 5000, 10000000, 100)],
    results: [["totalCostOfOwnership", "Total Cost of Ownership", "c"], ["perUserPerMonth", "TCO per User per Month", "c"], ["annualAverage", "Average per Year", "c"], ["subscriptionCost", "Subscriptions", "c"], ["oneTimeCosts", "One-Time Costs", "c"], ["adminCost", "Admin Cost", "c"]],
    fn: E.saasTco, ex: { users: 100, pricePerUserMonth: 45, renewalIncrease: 5, years: 3, implementation: 25000, training: 8000, integration: 15000, migration: 6000, adminFteShare: 25, adminSalary: 95000, addOnsAnnual: 5000 },
    exText: (o) => `Example: 100 users at $45 a month over 3 years with implementation and a quarter-time admin cost ${usd(o.totalCostOfOwnership)} — really ${usd(o.perUserPerMonth)} per user per month.`,
    how: "Enter the subscription quote and every one-time and ongoing internal cost.",
    assume: "Admin time often dominates TCO for complex platforms; price escalators of 3–7% at renewal are common.",
    faq: [["What is SaaS TCO?", "All costs of using the software over its life, not just the subscription."]],
  }),
  mk({
    slug: "it-support-cost-calculator", title: "IT Support Cost Calculator",
    desc: "Compare in-house IT support with a managed service provider (MSP) — IT staff needed by user ratio, salaries and tools versus per-user MSP pricing and projects.",
    meta: "IT Support Calculator — In-House vs MSP Cost",
    inputs: [num("users", "Users", 60, 1000000), num("usersPerTech", "Users per IT Technician", 70, 500, 1, 10), cur("itSalary", "IT Technician Salary", 72000, 1000000, 100), pct("benefitsPercent", "Benefits & Taxes", 30, 100, 1), cur("toolsPerUserYear", "Tools & Security Software per User per Year", 240, 10000, 5), cur("otherInHouse", "Other In-House Costs per Year", 6000, 10000000, 100), cur("mspPerUserMonth", "MSP Price per User per Month", 150, 1000, 1), yn("mspIncludesTools", "MSP Price Includes Tools?", 1), cur("projectsAnnual", "MSP Project Work per Year", 8000, 10000000, 100)],
    results: [["inHouseAnnual", "In-House Annual Cost", "c"], ["mspAnnual", "MSP Annual Cost", "c"], ["savingsWithMsp", "Savings with MSP", "c"], ["itStaffNeeded", "IT Staff Needed In-House", "n"], ["inHousePerUserMonth", "In-House per User per Month", "c"], ["betterOption", "Cheaper Option (1 = in-house, 2 = MSP)", "n"]],
    fn: E.itSupport, ex: { users: 60, usersPerTech: 70, itSalary: 72000, benefitsPercent: 30, toolsPerUserYear: 240, otherInHouse: 6000, mspPerUserMonth: 150, mspIncludesTools: 1, projectsAnnual: 8000 },
    exText: (o) => `Example: 60 users need one in-house tech (${usd(o.inHouseAnnual)} a year with tools) versus about ${usd(o.mspAnnual)} with an MSP at $150 per user per month.`,
    how: "Enter your users and either salary data or MSP quotes.",
    assume: "Typical ratios: 1 IT support tech per 50–100 users; 2026 MSP pricing $100–250 per user per month for fully managed support.",
    faq: [["How much does IT support cost per user?", "Usually $100–250 per user per month for a managed service provider."]],
  }),
  mk({
    slug: "influencer-marketing-calculator", title: "Influencer Marketing Calculator",
    desc: "Estimate influencer campaign cost and ROI — fee per post by platform and followers (or your quote), reach, engagements, cost per engagement, clicks, orders and revenue.",
    meta: "Influencer Marketing Calculator — Rates, Reach & ROI",
    inputs: [dropdown("platform", "Platform", opts(E.PLATFORM_RATE.map(([n, r]) => `${n} (~$${r} per 1k followers)`)), 0), num("followers", "Followers", 50000, 1000000000, 100), num("posts", "Posts", 3, 100, 1, 1), cur("feePerPost", "Quoted Fee per Post (0 = estimate)", 0, 10000000, 10), cur("productCost", "Product Seeding / Other Costs", 200, 1000000, 10), pct("reachRate", "Reach (% of followers per post)", 30, 100, 1), pct("engagementRate", "Engagement Rate", 3, 30, 0.1), pct("ctr", "Click-Through Rate (of reach)", 1, 20, 0.05), pct("conversionRate", "Conversion Rate", 2.5, 50, 0.1), cur("aov", "Average Order Value", 60, 100000, 0.5), pct("margin", "Gross Margin", 50, 100, 1)],
    results: [["campaignCost", "Campaign Cost", "c"], ["estimatedFeePerPost", "Estimated Fee per Post", "c"], ["reach", "Total Reach", "n"], ["engagements", "Engagements", "n"], ["costPerEngagement", "Cost per Engagement", "c"], ["orders", "Orders", "n"], ["revenue", "Revenue", "c"], ["roiPercent", "ROI (on gross profit)", "p"]],
    fn: E.influencer, ex: { platform: 0, followers: 50000, posts: 3, feePerPost: 0, productCost: 200, reachRate: 30, engagementRate: 3, ctr: 1, conversionRate: 2.5, aov: 60, margin: 50 },
    exText: (o) => `Example: three Instagram posts by a 50k-follower creator cost about ${usd(o.campaignCost)}, reaching ${fmt(o.reach, 0)} people with ${fmt(o.engagements, 0)} engagements (${usd(o.costPerEngagement)} each).`,
    how: "Enter the creator's audience and engagement, the quote (or let the tool estimate), and your conversion data.",
    assume: "Rule-of-thumb rates of roughly $10 per 1,000 Instagram followers; micro-influencers often deliver higher engagement for less.",
    faq: [["How much do influencers charge?", "Roughly $100 per 10,000 Instagram followers per post, more on YouTube."]],
  }),
  mk({
    slug: "share-of-voice-calculator", title: "Share of Voice Calculator",
    desc: "Calculate your brand's share of voice from mentions, impressions or ad spend versus competitors — plus excess share of voice (ESOV) and the market share growth it predicts.",
    inputs: [num("yourMentions", "Your Mentions / Impressions / Spend", 1200, 1000000000, 1), num("competitor1", "Competitor 1", 2000, 1000000000, 1), num("competitor2", "Competitor 2", 900, 1000000000, 1), num("competitor3", "Competitor 3", 600, 1000000000, 1), num("competitor4", "Competitor 4", 0, 1000000000, 1), num("others", "All Others", 300, 1000000000, 1), pct("marketShare", "Your Market Share", 15, 100, 0.1)],
    results: [["shareOfVoicePercent", "Share of Voice", "p"], ["excessShareOfVoice", "Excess Share of Voice (points)", "n"], ["predictedShareChangePerYear", "Predicted Share Change per Year (points)", "n"], ["leaderSharePercent", "Category Leader's Share of Voice", "p"], ["totalCategoryVoice", "Total Category Voice", "n"]],
    fn: E.shareOfVoice, ex: { yourMentions: 1200, competitor1: 2000, competitor2: 900, competitor3: 600, competitor4: 0, others: 300, marketShare: 15 },
    exText: (o) => `Example: 1,200 of 5,000 category mentions is a ${o.shareOfVoicePercent}% share of voice; against a 15% market share that's ${o.excessShareOfVoice} points of ESOV — about +${o.predictedShareChangePerYear} share points a year.`,
    how: "Use one consistent metric for everyone — media spend, impressions, social mentions or search volume.",
    assume: "Binet & Field (IPA): each 10 points of ESOV is associated with roughly 0.5 points of annual market share growth for established brands.",
    faq: [["How do you calculate share of voice?", "Your brand's mentions (or spend) ÷ the total for all brands in the category × 100."]],
  }),
  mk({
    slug: "facebook-ads-calculator", title: "Facebook Ads Calculator",
    desc: "Forecast Facebook and Instagram ad results — impressions from CPM, clicks and CPC, conversions, cost per acquisition, revenue, ROAS, profit and break-even ROAS.",
    meta: "Facebook Ad Calculator — CPM, CPC, CPA & ROAS",
    inputs: [cur("budget", "Ad Budget", 3000, 100000000, 10), cur("cpm", "CPM (cost per 1,000 impressions)", 14, 200, 0.1), pct("ctr", "Link Click-Through Rate", 1.2, 20, 0.05), pct("conversionRate", "Conversion Rate", 3, 50, 0.1), cur("aov", "Average Order Value", 65, 100000, 0.5), pct("margin", "Gross Margin", 45, 100, 0.5)],
    results: [["roas", "ROAS", "n"], ["conversions", "Conversions", "n"], ["costPerAcquisition", "Cost per Acquisition", "c"], ["revenue", "Revenue", "c"], ["profit", "Profit after Ad Spend", "c"], ["impressions", "Impressions", "n"], ["clicks", "Clicks", "n"], ["costPerClick", "Cost per Click", "c"], ["breakEvenRoas", "Break-Even ROAS", "n"]],
    fn: E.facebookAds, ex: { budget: 3000, cpm: 14, ctr: 1.2, conversionRate: 3, aov: 65, margin: 45 },
    exText: (o) => `Example: $3,000 at a $14 CPM buys ${fmt(o.impressions, 0)} impressions and ${fmt(o.clicks, 0)} clicks; at 3% conversion that's ${o.conversions} sales (${usd(o.costPerAcquisition)} CPA) and a ${o.roas}× ROAS versus ${o.breakEvenRoas}× break-even.`,
    how: "Use CPM and CTR from past campaigns or industry averages, your site conversion rate and margin.",
    assume: "2026 US Meta CPMs typically $8–20; break-even ROAS = 1 ÷ gross margin.",
    faq: [["What is a good ROAS for Facebook ads?", "Anything above your break-even ROAS (1 ÷ margin) is profitable; 2–4× is common for ecommerce."]],
  }),
  mk({
    slug: "overhead-rate-calculator", title: "Overhead Rate Calculator",
    desc: "Calculate a predetermined overhead rate from indirect costs and an allocation base — labor hours, labor dollars, machine hours or revenue — and apply it to a job.",
    inputs: [cur("indirectCosts", "Total Indirect (Overhead) Costs", 480000, 10000000000, 100), dropdown("baseType", "Allocation Base", opts(["Direct labor hours", "Direct labor dollars", "Machine hours", "Revenue dollars"]), 0), num("allocationBase", "Total Allocation Base (hours or $)", 24000, 10000000000, 1), num("jobBaseUnits", "Job's Base Units (hours or $)", 120, 10000000, 0.1), cur("jobDirectCost", "Job's Direct Costs", 9000, 100000000, 10), cur("revenue", "Annual Revenue (for comparison)", 3000000, 100000000000, 1000)],
    results: [["overheadRate", "Overhead Rate (per base unit)", "n"], ["overheadRatePercent", "Overhead Rate (%, for $ bases)", "n"], ["appliedToJob", "Overhead Applied to Job", "c"], ["jobTotalCost", "Job Total Cost", "c"], ["overheadShareOfRevenue", "Overhead as % of Revenue", "p"]],
    fn: E.overheadRate, ex: { indirectCosts: 480000, baseType: 0, allocationBase: 24000, jobBaseUnits: 120, jobDirectCost: 9000, revenue: 3000000 },
    exText: (o) => `Example: $480,000 of overhead over 24,000 labor hours is $${o.overheadRate} per hour; a job using 120 hours absorbs ${usd(o.appliedToJob)} of overhead for a total cost of ${usd(o.jobTotalCost)}.`,
    how: "Total your indirect costs for the year and choose the base that best drives them (labor hours for labor-heavy work, machine hours for automated plants).",
    assume: "Overhead rate = indirect costs ÷ allocation base. For dollar bases, the rate is also shown as a percentage.",
    faq: [["How do you calculate overhead rate?", "Divide total overhead by an allocation base such as direct labor hours."]],
  }),
  mk({
    slug: "tam-sam-som-calculator", title: "TAM SAM SOM Calculator",
    desc: "Size your market bottom-up — total addressable market (TAM) from potential customers × annual value, serviceable available market (SAM) and serviceable obtainable market (SOM).",
    meta: "TAM SAM SOM Calculator — Market Size Bottom-Up",
    inputs: [num("totalCustomers", "Total Potential Customers", 500000, 10000000000, 1), cur("annualValuePerCustomer", "Annual Revenue per Customer", 1200, 10000000, 1), pct("serviceablePercent", "Serviceable Share (SAM %)", 30, 100, 0.5), pct("obtainablePercent", "Obtainable Share of SAM (SOM %)", 5, 100, 0.1)],
    results: [["tam", "TAM", "c"], ["sam", "SAM", "c"], ["som", "SOM", "c"], ["somCustomers", "SOM Customers", "n"], ["somShareOfTamPercent", "SOM as % of TAM", "p"]],
    fn: E.tamSamSom, ex: { totalCustomers: 500000, annualValuePerCustomer: 1200, serviceablePercent: 30, obtainablePercent: 5 },
    exText: (o) => `Example: 500,000 potential customers at $1,200 a year is a ${usd(o.tam)} TAM; 30% serviceable gives a ${usd(o.sam)} SAM and 5% of that a ${usd(o.som)} SOM (${fmt(o.somCustomers, 0)} customers).`,
    how: "Count potential customers in your category, the annual value of each, the share you can actually serve (geography, segment, product fit) and a realistic share you can win in 3–5 years.",
    assume: "Bottom-up sizing is more credible to investors than top-down percentages of a big industry number.",
    faq: [["What's the difference between TAM, SAM and SOM?", "TAM is everyone who could buy; SAM is the part you can serve; SOM is the part you can realistically win."]],
  }),
  mk({
    slug: "lead-generation-calculator", title: "Lead Generation Calculator",
    desc: "Work backwards from a revenue goal — deals, opportunities, SQLs, leads and website visits needed through your funnel conversion rates — and the marketing budget at your cost per lead.",
    meta: "Lead Calculator — Leads Needed to Hit Revenue Goal",
    inputs: [cur("revenueGoal", "Annual New Revenue Goal", 1000000, 10000000000, 1000), cur("dealSize", "Average Deal Size", 20000, 100000000, 10), pct("closeRate", "Opportunity Close Rate", 20, 100, 0.5), pct("sqlToOpp", "SQL → Opportunity Rate", 50, 100, 0.5), pct("leadToSql", "Lead → SQL Rate", 15, 100, 0.5), pct("visitToLead", "Visit → Lead Rate", 2, 100, 0.1), cur("costPerLead", "Cost per Lead", 80, 10000, 0.5)],
    results: [["leadsNeeded", "Leads Needed per Year", "n"], ["leadsPerMonth", "Leads per Month", "n"], ["dealsNeeded", "Deals Needed", "n"], ["opportunitiesNeeded", "Opportunities", "n"], ["sqlsNeeded", "Sales-Qualified Leads", "n"], ["websiteVisitsNeeded", "Website Visits", "n"], ["marketingBudget", "Marketing Budget for Leads", "c"]],
    fn: E.leadFunnel, ex: { revenueGoal: 1000000, dealSize: 20000, closeRate: 20, sqlToOpp: 50, leadToSql: 15, visitToLead: 2, costPerLead: 80 },
    exText: (o) => `Example: $1M of new revenue at $20,000 per deal needs ${o.dealsNeeded} deals — ${fmt(o.leadsNeeded, 0)} leads a year (${o.leadsPerMonth} a month) and about ${usd(o.marketingBudget)} of lead spend at $80 per lead.`,
    how: "Enter your revenue target and average deal size, then conversion rates from your CRM.",
    assume: "Each stage divides by its conversion rate; results are rounded up.",
    faq: [["How many leads do I need?", "Divide deals needed by your close rate and each earlier conversion rate in turn."]],
  }),
  mk({
    slug: "ppc-profit-calculator", title: "PPC Profit & ROI Calculator",
    desc: "Calculate pay-per-click profit and ROI — clicks from budget and CPC, conversions, revenue, gross profit, ROAS, cost per conversion and break-even CPC — for Google Ads, Bing or ecommerce PPC.",
    meta: "PPC Calculator — Profit, ROI & Break-Even CPC",
    inputs: [dropdown("mode", "Start From", opts(["Ad budget", "Number of clicks"]), 0), cur("adSpend", "Ad Spend", 5000, 100000000, 10), num("clicks", "Clicks", 2500, 100000000, 1), cur("cpc", "Average CPC", 2, 1000, 0.01), pct("conversionRate", "Conversion Rate", 3, 100, 0.05), cur("aov", "Average Order Value", 120, 1000000, 0.5), pct("margin", "Gross Margin", 40, 100, 0.5), cur("managementFee", "Agency / Management Fee", 500, 1000000, 10)],
    results: [["profit", "Profit after Ad Spend & Fees", "c"], ["roiPercent", "ROI", "p"], ["roas", "ROAS", "n"], ["revenue", "Revenue", "c"], ["grossProfit", "Gross Profit", "c"], ["conversions", "Conversions", "n"], ["costPerConversion", "Cost per Conversion", "c"], ["breakEvenCpc", "Break-Even CPC", "c"], ["adSpend", "Ad Spend", "c"]],
    fn: E.ppcProfit, ex: { mode: 0, adSpend: 5000, clicks: 2500, cpc: 2, conversionRate: 3, aov: 120, margin: 40, managementFee: 500 },
    exText: (o) => `Example: $5,000 at $2 CPC buys 2,500 clicks; 3% convert at $120, for ${usd(o.revenue)} in sales and ${usd(o.profit)} profit after a $500 fee. Break-even CPC is ${usd(o.breakEvenCpc)}.`,
    how: "Enter your budget (or clicks), average CPC from the ad platform, conversion rate, order value and margin.",
    assume: "Break-even CPC = AOV × margin × conversion rate. Lifetime value from repeat customers isn't included.",
    faq: [["What is a good ROI for PPC?", "Positive profit after ad spend and fees; many advertisers target 2–4× ROAS depending on margin."]],
  }),
  mk({
    slug: "website-design-price-calculator", title: "Website Design Price Calculator",
    desc: "Estimate website design and development cost — pages by design tier, ecommerce, blog, booking, multilingual, custom integrations, copywriting and SEO setup — with maintenance and hosting.",
    meta: "Website Design Price Calculator — Web Page Cost",
    inputs: [num("pages", "Number of Pages", 10, 1000), dropdown("tier", "Design Tier", opts(E.WEB_TIERS.map(([n, c]) => `${n} (~$${c}/page)`)), 1), cur("minimum", "Minimum Project Price", 2500, 1000000, 50), yn("ecommerce", "Online Store?"), num("products", "Products to Load", 0, 100000), yn("blog", "Blog (+$800)?", 1), yn("booking", "Booking / Scheduling (+$1,200)?"), yn("multilingual", "Multilingual (+$120/page)?"), num("customIntegrations", "Custom Integrations (+$2,500 each)", 0, 50), yn("copywriting", "Professional Copywriting?", 1), cur("copyPerPage", "Copywriting per Page", 150, 2000, 5), yn("seoSetup", "SEO Setup (+$1,200)?", 1), cur("maintenanceMonthly", "Maintenance per Month", 100, 10000, 5), cur("hostingAnnual", "Hosting & Domain per Year", 300, 100000, 5)],
    results: [["projectPrice", "Project Price", "c"], ["designAndBuild", "Design & Build", "c"], ["features", "Features", "c"], ["copywriting", "Copywriting", "c"], ["seoSetup", "SEO Setup", "c"], ["monthlyMaintenance", "Monthly Maintenance", "c"], ["firstYearTotal", "First-Year Total", "c"]],
    fn: E.websitePrice, ex: { pages: 10, tier: 1, minimum: 2500, ecommerce: 0, products: 0, blog: 1, booking: 0, multilingual: 0, customIntegrations: 0, copywriting: 1, copyPerPage: 150, seoSetup: 1, maintenanceMonthly: 100, hostingAnnual: 300 },
    exText: (o) => `Example: a 10-page custom small-business site with a blog, copywriting and SEO setup costs about ${usd(o.projectPrice)}, or ${usd(o.firstYearTotal)} in the first year with maintenance and hosting.`,
    how: "Choose the number of pages and design level and add the features you need.",
    assume: "2026 typical US agency/freelancer pricing; offshore and template builds can cost far less, enterprise builds much more.",
    faq: [["How much does a website cost?", "Typically $3,000–15,000 for a custom small-business site and $10,000–50,000+ for ecommerce."]],
  }),
  mk({
    slug: "engagement-rate-calculator", title: "Social Media Engagement Rate Calculator",
    desc: "Calculate engagement rate by followers and by reach from likes, comments, shares and saves — compared with typical benchmarks for the account's size, like Collabstr-style influencer checks.",
    meta: "Engagement Rate Calculator — Instagram & TikTok (Collabstr-Style)",
    inputs: [num("followers", "Followers", 25000, 1000000000, 1), num("likes", "Average Likes per Post", 800, 100000000, 1), num("comments", "Average Comments per Post", 40, 10000000, 1), num("shares", "Average Shares per Post", 25, 10000000, 1), num("saves", "Average Saves per Post", 35, 10000000, 1), num("reach", "Average Reach per Post (optional)", 9000, 1000000000, 1)],
    results: [["engagementRatePercent", "Engagement Rate (by followers)", "p"], ["engagementByReachPercent", "Engagement Rate (by reach)", "p"], ["totalEngagements", "Engagements per Post", "n"], ["benchmarkPercent", "Typical Benchmark for This Size (%)", "n"], ["aboveBenchmark", "Above Benchmark (1 = yes)", "n"], ["commentToLikeRatio", "Comment-to-Like Ratio", "n"]],
    fn: E.engagementRate, ex: { followers: 25000, likes: 800, comments: 40, shares: 25, saves: 35, reach: 9000 },
    exText: (o) => `Example: 900 engagements per post on 25,000 followers is a ${o.engagementRatePercent}% engagement rate — above the ~${o.benchmarkPercent}% typical for that account size.`,
    how: "Average the last 10–12 posts' likes, comments, shares and saves. Very low comment-to-like ratios can indicate bought engagement. Independent tool — not affiliated with Collabstr.",
    assume: "Engagement rate = interactions ÷ followers × 100. Benchmarks fall as accounts grow (≈ 4% under 10k, 2.4% at 10–100k, 1.7% at 100k–1M, 1.1% above).",
    faq: [["What is a good engagement rate on Instagram?", "Around 1–3% is typical; small creators often reach 3–6%."]],
  }),
  mk({
    slug: "foot-traffic-calculator", title: "Foot Traffic Calculator",
    desc: "Turn store foot traffic into sales — visitors from counts or passersby capture rate, conversion rate and average transaction — with sales per visitor, sales per square foot and traffic needed for a goal.",
    inputs: [dropdown("mode", "Visitors From", opts(["Door counter (visitors per day)", "Passersby × capture rate"]), 0), num("visitorsPerDay", "Visitors per Day", 400, 1000000, 1), num("passersbyPerDay", "Passersby per Day", 5000, 10000000, 1), pct("captureRate", "Capture Rate (passersby who enter)", 8, 100, 0.1), pct("conversionRate", "Conversion Rate (visitors who buy)", 22, 100, 0.1), cur("averageTransaction", "Average Transaction", 48, 100000, 0.5), num("daysOpen", "Days Open per Month", 30, 31, 1, 1), num("sqFt", "Sales Floor (sq ft)", 2500, 10000000, 10), cur("monthlyGoal", "Monthly Sales Goal", 180000, 1000000000, 100)],
    results: [["dailySales", "Daily Sales", "c"], ["monthlySales", "Monthly Sales", "c"], ["buyersPerDay", "Buyers per Day", "n"], ["salesPerVisitor", "Sales per Visitor", "c"], ["salesPerSqFtYear", "Sales per Sq Ft per Year", "c"], ["visitorsNeededForGoal", "Visitors per Day Needed for Goal", "n"], ["visitorsPerDay", "Visitors per Day", "n"]],
    fn: E.footTraffic, ex: { mode: 0, visitorsPerDay: 400, passersbyPerDay: 5000, captureRate: 8, conversionRate: 22, averageTransaction: 48, daysOpen: 30, sqFt: 2500, monthlyGoal: 180000 },
    exText: (o) => `Example: 400 visitors a day converting at 22% with a $48 average sale bring in ${usd(o.dailySales)} a day (${usd(o.monthlySales)} a month); hitting $180,000 needs about ${o.visitorsNeededForGoal} visitors a day.`,
    how: "Use door-counter data (or passersby and capture rate) with POS transaction counts to get conversion.",
    assume: "Sales = visitors × conversion × average transaction. Specialty retail conversion commonly runs 20–40%.",
    faq: [["How do you calculate retail conversion rate?", "Transactions ÷ visitors × 100 for the same period."]],
  }),
  mk({
    slug: "uae-business-setup-cost-calculator", title: "UAE Business Setup Cost Calculator",
    desc: "Estimate the cost to set up a company in the UAE — free zone, mainland or offshore — license, establishment card, visas, office, PRO and bank costs, first year and renewal, in AED and USD.",
    inputs: [dropdown("jurisdiction", "Company Type", opts(E.UAE_TYPES.map(([n, l]) => `${n} (license ~AED ${l.toLocaleString("en-US")})`)), 0), num("visas", "Residence Visas", 2, 100), cur("officeRent", "Office / Flexi-Desk per Year (AED, 0 = default)", 0, 10000000, 100), cur("pro", "PRO / Agent Services (AED)", 3000, 1000000, 50), cur("bankAndOther", "Bank Account, Attestations & Other (AED)", 2500, 1000000, 50), num("aedPerUsd", "Exchange Rate (AED per USD)", 3.6725, 10, 0.0001, 1)],
    results: [["firstYearAed", "First-Year Cost (AED)", "n"], ["firstYearUsd", "First-Year Cost (USD)", "c"], ["annualRenewalAed", "Annual Renewal (AED)", "n"], ["annualRenewalUsd", "Annual Renewal (USD)", "c"], ["licenseAed", "License (AED)", "n"], ["visaCostsAed", "Visa Costs (AED)", "n"], ["officeAed", "Office (AED)", "n"]],
    fn: E.uaeSetup, ex: { jurisdiction: 0, visas: 2, officeRent: 0, pro: 3000, bankAndOther: 2500, aedPerUsd: 3.6725 },
    exText: (o) => `Example: a free zone company with two visas costs about AED ${fmt(o.firstYearAed, 0)} (${usd(o.firstYearUsd)}) in the first year, and roughly AED ${fmt(o.annualRenewalAed, 0)} a year to renew.`,
    how: "Choose the company type, number of residence visas and any office you'll rent. Free zone packages vary widely between zones.",
    assume: "Typical 2025–2026 costs: free zone packages AED 12,000–20,000, mainland LLC licenses AED 15,000–35,000, ~AED 4,000–5,500 per visa (entry permit, medical, Emirates ID). Offshore companies can't sponsor visas. The USD peg is 3.6725.",
    faq: [["How much does it cost to start a business in the UAE?", "Roughly AED 15,000–50,000 in the first year for a small company with a couple of visas."]],
  }),
  mk({
    slug: "rpa-roi-calculator", title: "RPA ROI Calculator (Robotic Process Automation)",
    desc: "Estimate robotic process automation ROI — manual hours automated, FTEs freed, error savings, bot licenses, development and maintenance — with payback and 3-year ROI.",
    meta: "RPA Calculator — Automation ROI & Payback",
    inputs: [num("processes", "Processes to Automate", 5, 1000, 1, 1), num("hoursPerMonth", "Manual Hours per Process per Month", 80, 10000, 1), pct("automatable", "Share of Work Automatable", 80, 100, 1), cur("hourlyCost", "Loaded Hourly Cost of Staff", 38, 500, 0.5), cur("errorSavings", "Annual Error / Rework Savings", 20000, 100000000, 100), num("botLicenses", "Bot Licenses", 2, 1000, 1), cur("licensePerBot", "License per Bot per Year", 8000, 100000, 100), cur("developmentPerProcess", "Development per Process", 15000, 1000000, 100), pct("maintenancePercent", "Annual Maintenance (% of development)", 20, 100, 1), cur("platformSetup", "Platform Setup / CoE", 20000, 10000000, 100)],
    results: [["annualNetSavings", "Annual Net Savings", "c"], ["paybackMonths", "Payback (months)", "n"], ["threeYearRoiPercent", "3-Year ROI", "p"], ["hoursFreedPerYear", "Hours Freed per Year", "n"], ["fteEquivalent", "FTEs Freed", "n"], ["upfrontCost", "Upfront Cost", "c"], ["annualRunningCost", "Annual Running Cost", "c"]],
    fn: E.rpaRoi, ex: { processes: 5, hoursPerMonth: 80, automatable: 80, hourlyCost: 38, errorSavings: 20000, botLicenses: 2, licensePerBot: 8000, developmentPerProcess: 15000, maintenancePercent: 20, platformSetup: 20000 },
    exText: (o) => `Example: automating 5 processes of 80 hours a month frees ${fmt(o.hoursFreedPerYear, 0)} hours (${o.fteEquivalent} FTEs) and nets ${usd(o.annualNetSavings)} a year — payback in ${o.paybackMonths} months.`,
    how: "List candidate processes with their manual hours, then vendor licensing and development estimates.",
    assume: "1 FTE ≈ 1,800 productive hours a year. Savings only materialize if freed time is redeployed or headcount growth avoided.",
    faq: [["What is a good RPA ROI?", "Many programs report 30–200% first-year ROI on well-chosen, rules-based, high-volume processes."]],
  }),
  mk({
    slug: "employee-advocacy-calculator", title: "Employee Advocacy Calculator",
    desc: "Estimate the value of an employee advocacy program — participants, shares, network size and organic reach — as monthly reach, engagements, clicks, earned media value, leads and ROI.",
    inputs: [num("participants", "Participating Employees", 100, 1000000), num("sharesPerMonth", "Shares per Employee per Month", 4, 100, 0.5), num("averageNetwork", "Average Connections / Followers", 500, 100000, 1), pct("organicReach", "Organic Reach (% of network per post)", 5, 100, 0.1), pct("engagementRate", "Engagement Rate (of reach)", 2, 50, 0.1), pct("ctr", "Click-Through Rate (of reach)", 1, 50, 0.05), cur("equivalentCpm", "Equivalent Paid CPM", 12, 200, 0.5), pct("leadRate", "Clicks That Become Leads", 2, 100, 0.1), cur("valuePerLead", "Value per Lead", 150, 100000, 1), cur("programCostAnnual", "Program Cost per Year (platform, admin)", 25000, 10000000, 100)],
    results: [["roiPercent", "Program ROI", "p"], ["annualValue", "Annual Value", "c"], ["earnedMediaValueAnnual", "Earned Media Value per Year", "c"], ["leadsPerYear", "Leads per Year", "n"], ["monthlyReach", "Monthly Reach", "n"], ["monthlyEngagements", "Monthly Engagements", "n"], ["monthlyClicks", "Monthly Clicks", "n"]],
    fn: E.advocacy, ex: { participants: 100, sharesPerMonth: 4, averageNetwork: 500, organicReach: 5, engagementRate: 2, ctr: 1, equivalentCpm: 12, leadRate: 2, valuePerLead: 150, programCostAnnual: 25000 },
    exText: (o) => `Example: 100 employees sharing 4 posts a month to 500 connections reach about ${fmt(o.monthlyReach, 0)} people a month; with leads valued at $150 the program returns ${usd(o.annualValue)} a year (${o.roiPercent}% ROI).`,
    how: "Enter realistic participation (often 10–20% of staff), network sizes and engagement from pilot data.",
    assume: "Earned media value = reach ÷ 1,000 × equivalent paid CPM; leads valued at your average pipeline value per lead.",
    faq: [["Is employee advocacy worth it?", "Content shared by employees typically gets far higher engagement than brand posts, so even modest programs can return more than they cost."]],
  }),
  mk({
    slug: "rfid-roi-calculator", title: "RFID ROI Calculator",
    desc: "Estimate the return on an RFID inventory program — shrink reduction, faster cycle counts, recovered stockout sales — against tag costs, readers, software and implementation.",
    inputs: [cur("inventoryValue", "Average Inventory Value", 5000000, 100000000000, 1000), pct("shrinkRate", "Current Shrink Rate", 1.6, 20, 0.05), pct("shrinkReduction", "Shrink Reduction", 30, 100, 1), num("countHoursPerMonth", "Cycle Count Labor Hours per Month", 400, 1000000, 1), pct("countTimeReduction", "Count Time Reduction", 80, 100, 1), cur("laborRate", "Labor Rate per Hour", 22, 500, 0.25), cur("annualSales", "Annual Sales", 20000000, 100000000000, 1000), pct("stockoutSalesRecovered", "Sales Recovered from Fewer Stockouts", 2, 20, 0.1), pct("margin", "Gross Margin", 40, 100, 0.5), num("itemsTaggedPerYear", "Items Tagged per Year", 1500000, 10000000000, 100), cur("tagCost", "Cost per Tag", 0.06, 5, 0.005), cur("hardware", "Readers & Hardware", 120000, 100000000, 100), cur("implementation", "Implementation", 60000, 100000000, 100), cur("softwareAnnual", "Software per Year", 40000, 100000000, 100)],
    results: [["annualNetBenefit", "Annual Net Benefit", "c"], ["paybackMonths", "Payback (months)", "n"], ["threeYearRoiPercent", "3-Year ROI", "p"], ["grossAnnualBenefit", "Gross Annual Benefit", "c"], ["shrinkSavings", "Shrink Savings", "c"], ["laborSavings", "Counting Labor Savings", "c"], ["recoveredSalesProfit", "Profit on Recovered Sales", "c"], ["annualTagCost", "Annual Tag Cost", "c"]],
    fn: E.rfidRoi, ex: { inventoryValue: 5000000, shrinkRate: 1.6, shrinkReduction: 30, countHoursPerMonth: 400, countTimeReduction: 80, laborRate: 22, annualSales: 20000000, stockoutSalesRecovered: 2, margin: 40, itemsTaggedPerYear: 1500000, tagCost: 0.06, hardware: 120000, implementation: 60000, softwareAnnual: 40000 },
    exText: (o) => `Example: a $20M retailer tagging 1.5 million items a year nets about ${usd(o.annualNetBenefit)} a year after tag and software costs, paying back hardware and implementation in ${o.paybackMonths} months.`,
    how: "Enter current shrink, counting effort and sales, then tag volume and system quotes.",
    assume: "Retail RFID studies (e.g. Auburn University RFID Lab) report inventory accuracy rising from ~65% to 95%+ and sales lifts of 1.5–5% from better availability.",
    faq: [["How much does an RFID tag cost?", "Passive UHF retail tags cost roughly $0.04–0.10 each in volume in 2026."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-business-industrial-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: (await foodMovedCategoryId(prisma, def.slug)) ?? cat.id, // moved by setup-food-drink-category.ts
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
