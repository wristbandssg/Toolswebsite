// One-time (but safe to re-run) batch setup script: creates 11 military pay & allowance
// calculators (Law & Government Calculators > Military & Veterans Calculators). The 2026 pay
// table, BAS and poverty-guideline figures live in src/lib/calc-engine-law-mil-pay.ts; the
// examples below are computed from that engine so they always match the calculator.
// Merged keywords (covered here, no separate page): Military Monthly Pay, Enlisted Pay,
// Navy Salary, Marine Corps Pay, Army Income / Officer Salary / Compensation, DOD Compensation
// → military-pay; Civilian Salary Equivalent, Military Total Compensation → rmc; National
// Guard Calculator → drill-pay; How Much Will I Make on Deployment → deployment-pay; Army BNA /
// BNA → basic-needs-allowance; Army Bonus → srb; Military Severance Pay → separation-pay;
// SDP / Military SDP → savings-deposit-program.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-mil-pay-calculators.ts
// or
//   npm run db:create-law-mil-pay-calculators

import * as E from "../src/lib/calc-engine-law-mil-pay";
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

const CAT = "military-veterans-calculators";
const DISCLAIMER = "Estimates only, based on the published 2026 rates (pay table rounded to the dollar) — your Leave and Earnings Statement (LES) and your finance office are the final word. Not affiliated with DFAS or the Department of Defense.";

const GRADES: [string, number][] = E.MIL_PAY_2026.map(([label], i) => [label, i]);
const g = (label: string) => GRADES.find(([l]) => l === label)![1];
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;

const exPay = r(E.militaryPay, { grade: g("E-5"), yearsOfService: 4, monthlyBah: 2100, otherMonthlyPay: 0 });
const exBas = r(E.basAllowance, { memberType: 0, months: 12 });
const exRmc = r(E.rmc, { monthlyBasicPay: 4110, monthlyBah: 2100, monthlyBas: 476.95, taxRatePercent: 12 });
const exDrill = r(E.drillPay, { grade: g("E-4"), yearsOfService: 3, drillsPerMonth: 4, annualTrainingDays: 14 });
const exDeploy = r(E.deploymentPay, { months: 9, monthlyBasicPay: 3815, hostileFire: 1, familySeparation: 1, hardshipDutyPay: 100, otherMonthlyPay: 0, combatZone: 1, officer: 0, taxRatePercent: 12 });
const exBna = r(E.basicNeedsAllowance, { householdSize: 5, region: 0, grossHouseholdIncome: 55000 });
const exSrb = r(E.srb, { monthlyBasicPay: 4236, multiple: 3, yearsReenlisting: 4, capAmount: 100000, upfrontPercent: 50, taxRatePercent: 22 });
const exCp = r(E.continuationPay, { grade: g("O-3"), multiple: 2.5, installments: 1, taxRatePercent: 22 });
const exSep = r(E.separationPay, { monthlyBasicPay: 5194, yearsOfService: 10, payType: 0, taxRatePercent: 22 });
const exRec = r(E.bonusRecoupment, { bonusAmount: 20000, obligationMonths: 48, monthsServed: 30, amountPaidSoFar: 20000 });
const exSdp = r(E.savingsDepositProgram, { initialDeposit: 0, monthlyDeposit: 1000, deploymentMonths: 9, monthsAfterReturn: 3 });

const TAX_RATE = percentField("taxRatePercent", "Your Federal Income Tax Rate", { default: 12, max: 37 });

const TOOLS: ToolDef[] = [
  {
    slug: "military-pay-calculator",
    title: "Military Pay Calculator",
    description: "Estimate your monthly and yearly military pay for 2026 — basic pay by rank and years of service, plus BAH, BAS and any special pays.",
    metaTitle: "Military Pay Calculator 2026 — Basic Pay, BAH & BAS",
    metaDescription: "Free 2026 military pay calculator. Pick your pay grade and years of service to see basic pay, BAS, BAH and total monthly and annual pay.",
    calcInputs: [
      dropdown("grade", "Pay Grade", GRADES, g("E-5")),
      numberField("yearsOfService", "Years of Service", { default: 4, max: 40, unit: "years" }),
      currencyField("monthlyBah", "Monthly BAH (from your duty station)", { default: 2100, max: 10000, step: 10 }),
      currencyField("otherMonthlyPay", "Other Monthly Special Pays", { default: 0, max: 10000, step: 10 }),
    ],
    calcResult: { label: "Total Monthly Pay", format: "currency" },
    calcResults: [
      { key: "totalMonthlyPay", label: "Total Monthly Pay", format: "currency", highlight: true },
      { key: "monthlyBasicPay", label: "Monthly Basic Pay (2026)", format: "currency" },
      { key: "monthlyBas", label: "Monthly BAS", format: "currency" },
      { key: "annualPay", label: "Annual Pay", format: "currency" },
      { key: "annualBasicPay", label: "Annual Basic Pay", format: "currency" },
      { key: "taxFreeAllowancesPerYear", label: "Tax-Free Allowances per Year (BAH + BAS)", format: "currency" },
      { key: "payPerCheck", label: "Pay per Check (twice a month)", format: "currency" },
    ],
    instructions: "Choose your pay grade (E-1 to E-9, W-1 to W-5, O-1 to O-10, or O-1E to O-3E for officers with over 4 years of enlisted or warrant service) and enter your completed years of service. Add your BAH from the DoD BAH lookup for your duty station ZIP code (enter 0 if you live in government quarters) and any special or incentive pays.\n\nBAS is added automatically at the 2026 enlisted or officer rate.",
    examples: `Example: an E-5 with 4 years of service gets ${usd(exPay.monthlyBasicPay)} basic pay a month in 2026. With ${usd(2100)} BAH and ${usd(exPay.monthlyBas)} BAS, that's ${usd(exPay.totalMonthlyPay)} a month, or ${usd(exPay.annualPay)} a year. ${usd(exPay.taxFreeAllowancesPerYear)} of it (BAH and BAS) is tax-free.`,
    assumptions: `Uses the 2026 basic pay table (3.8% raise from 1 January 2026), with O-7 to O-10 capped at Executive Schedule Level II. BAS is ${usd(E.BAS_2026.enlisted)} for enlisted members and ${usd(E.BAS_2026.officer)} for officers. Federal and state taxes, FICA, TSP and SGLI deductions aren't subtracted. ${DISCLAIMER}`,
    faq: [
      { question: "How much did military pay go up in 2026?", answer: "Basic pay rose 3.8% for all grades on 1 January 2026." },
      { question: "Is BAH taxable?", answer: "No. BAH and BAS are tax-free allowances; basic pay and most special pays are taxable." },
      { question: "When does my pay go up for years of service?", answer: "On the date you complete 2, 3, 4, 6, 8 years and so on — the 'over' columns of the pay table." },
    ],
  },
  {
    slug: "bas-calculator",
    title: "BAS Calculator",
    description: "Find your 2026 Basic Allowance for Subsistence (BAS) — the monthly food allowance for enlisted members, officers and BAS II — and the total for any number of months.",
    metaTitle: "BAS Calculator 2026 — Basic Allowance for Subsistence",
    metaDescription: "Free BAS calculator with 2026 rates: $476.95 a month enlisted, $328.48 officer, $953.90 BAS II. See daily, monthly and yearly BAS.",
    calcInputs: [
      dropdown("memberType", "Member Type", [["Enlisted", 0], ["Officer / Warrant Officer", 1], ["Enlisted — BAS II", 2]], 0),
      numberField("months", "Months of BAS", { default: 12, min: 1, max: 12, unit: "months" }),
    ],
    calcResult: { label: "Monthly BAS", format: "currency" },
    calcResults: [
      { key: "monthlyBas", label: "Monthly BAS", format: "currency", highlight: true },
      { key: "dailyBas", label: "Daily BAS", format: "currency" },
      { key: "basForPeriod", label: "BAS for the Period", format: "currency" },
      { key: "annualBas", label: "Annual BAS", format: "currency" },
    ],
    instructions: "Pick enlisted, officer, or BAS II and the number of months. BAS is the same for every grade within each group, at every location, with or without dependents.",
    examples: `Example: an enlisted member receives ${usd(exBas.monthlyBas)} a month in 2026 — ${usd(exBas.annualBas)} a year, tax-free.`,
    assumptions: `2026 rates: ${usd(E.BAS_2026.enlisted)} enlisted, ${usd(E.BAS_2026.officer)} officer, ${usd(E.BAS_2026.basII)} BAS II (paid only when authorized because no government dining facility is available). Daily rate shown as monthly ÷ 30. Members eating in a dining facility may have meal deductions. ${DISCLAIMER}`,
    faq: [
      { question: "What is BAS II?", answer: "Double BAS for enlisted members assigned where government meals aren't available. It has to be authorized by your command." },
      { question: "Is BAS taxable?", answer: "No, BAS is a non-taxable allowance." },
    ],
  },
  {
    slug: "rmc-calculator",
    title: "RMC Calculator — Military vs Civilian Pay",
    description: "Work out your Regular Military Compensation (RMC) and the civilian salary you'd need to match it, including the tax advantage of tax-free BAH and BAS.",
    metaTitle: "RMC Calculator — Military to Civilian Salary Equivalent",
    metaDescription: "Free RMC calculator. Add basic pay, BAH and BAS, include the tax advantage, and see the civilian salary that equals your military pay.",
    calcInputs: [
      currencyField("monthlyBasicPay", "Monthly Basic Pay", { default: 4110, max: 20000, step: 10 }),
      currencyField("monthlyBah", "Monthly BAH", { default: 2100, max: 10000, step: 10 }),
      currencyField("monthlyBas", "Monthly BAS", { default: 476.95, max: 1000, step: 0.01 }),
      TAX_RATE,
    ],
    calcResult: { label: "Civilian Salary Equivalent", format: "currency" },
    calcResults: [
      { key: "civilianSalaryEquivalent", label: "Civilian Salary Equivalent", format: "currency", highlight: true },
      { key: "annualRmc", label: "Annual RMC (Cash)", format: "currency" },
      { key: "taxAdvantage", label: "Tax Advantage", format: "currency" },
      { key: "taxFreeAllowances", label: "Tax-Free Allowances per Year", format: "currency" },
      { key: "monthlyRmc", label: "Monthly RMC", format: "currency" },
    ],
    instructions: "Enter your monthly basic pay, BAH and BAS (from your LES or the Military Pay Calculator) and your federal income tax bracket. The tax advantage is the extra taxable salary a civilian would need to keep the same amount after tax.",
    examples: `Example: ${usd(4110)} basic pay, ${usd(2100)} BAH and ${usd(476.95)} BAS is an RMC of ${usd(exRmc.annualRmc)} a year. Because ${usd(exRmc.taxFreeAllowances)} of it is tax-free, in the 12% bracket a civilian job would have to pay about ${usd(exRmc.civilianSalaryEquivalent)} to match it.`,
    assumptions: `RMC = basic pay + BAH + BAS + the federal tax advantage, the DoD definition. Tax advantage = tax-free allowances × rate ÷ (1 − rate). Doesn't count health care (TRICARE), retirement, TSP matching, commissary savings or state tax — add those for a full total-compensation comparison. ${DISCLAIMER}`,
    faq: [
      { question: "What does RMC include?", answer: "Basic pay, BAH, BAS and the federal tax advantage from the allowances being tax-free." },
      { question: "Why is the civilian equivalent higher than my pay?", answer: "A civilian pays income tax on the whole salary, so they need more gross pay to keep what you keep tax-free." },
    ],
  },
  {
    slug: "drill-pay-calculator",
    title: "Drill Pay Calculator — National Guard & Reserve",
    description: "Estimate National Guard and Reserve drill pay for 2026 — pay per drill, per drill weekend, per month and per year including annual training.",
    metaTitle: "Drill Pay Calculator 2026 — National Guard & Reserve Pay",
    metaDescription: "Free drill pay calculator for the National Guard and Reserve. 2026 pay per drill, per weekend and per year with annual training.",
    calcInputs: [
      dropdown("grade", "Pay Grade", GRADES, g("E-4")),
      numberField("yearsOfService", "Years of Service (pay date)", { default: 3, max: 40, unit: "years" }),
      numberField("drillsPerMonth", "Drills per Month (one weekend = 4)", { default: 4, max: 16 }),
      numberField("annualTrainingDays", "Annual Training Days", { default: 14, max: 60, unit: "days" }),
    ],
    calcResult: { label: "Annual Drill & Training Pay", format: "currency" },
    calcResults: [
      { key: "annualDrillAndTrainingPay", label: "Annual Drill & Training Pay", format: "currency", highlight: true },
      { key: "payPerDrill", label: "Pay per Drill (4 hours)", format: "currency" },
      { key: "payPerDrillWeekend", label: "Pay per Drill Weekend (4 drills)", format: "currency" },
      { key: "monthlyDrillPay", label: "Monthly Drill Pay", format: "currency" },
      { key: "annualTrainingPay", label: "Annual Training Pay", format: "currency" },
    ],
    instructions: "Choose your pay grade and years of service, then the number of drills you do each month (a standard drill weekend is 4 drill periods) and your days of annual training.",
    examples: `Example: an E-4 with 3 years earns ${usd(exDrill.payPerDrill)} per drill, ${usd(exDrill.payPerDrillWeekend)} per drill weekend, and about ${usd(exDrill.annualDrillAndTrainingPay)} a year with 14 days of annual training.`,
    assumptions: `One drill period = 1/30 of the 2026 monthly basic pay; annual training is paid per day at the same rate (BAH and BAS for training of 30 days or less aren't included). ${DISCLAIMER}`,
    faq: [
      { question: "How much is one drill weekend?", answer: "Four drill periods — four days of basic pay — for a standard Saturday-and-Sunday weekend." },
      { question: "Do Guard members get BAH on drill weekends?", answer: "Not for inactive duty training; BAH Reserve Component/Transit applies on active duty orders, at full BAH for orders over 30 days." },
    ],
  },
  {
    slug: "deployment-pay-calculator",
    title: "Deployment Pay Calculator",
    description: "Estimate how much extra you'll make on deployment — hostile fire / imminent danger pay, family separation allowance, hardship duty pay and the combat zone tax exclusion.",
    metaTitle: "Deployment Pay Calculator — How Much Will I Make Deployed?",
    metaDescription: "Free deployment pay calculator. Add IDP/HFP, FSA, hardship duty pay and the combat zone tax break to see your total pay for a deployment.",
    calcInputs: [
      numberField("months", "Deployment Length", { default: 9, min: 1, max: 24, unit: "months" }),
      currencyField("monthlyBasicPay", "Monthly Basic Pay", { default: 3815, max: 20000, step: 10 }),
      dropdown("hostileFire", "Hostile Fire / Imminent Danger Pay ($225)", [["Yes", 1], ["No", 0]], 1),
      dropdown("familySeparation", "Family Separation Allowance ($250)", [["Yes — dependents at home", 1], ["No", 0]], 1),
      dropdown("hardshipDutyPay", "Hardship Duty Pay — Location", [["None", 0], ["$50 a month", 50], ["$100 a month", 100], ["$150 a month", 150]], 100),
      currencyField("otherMonthlyPay", "Other Monthly Special Pays", { default: 0, max: 10000, step: 10 }),
      dropdown("combatZone", "In a Combat Zone (tax-free pay)?", [["Yes", 1], ["No", 0]], 1),
      dropdown("officer", "Rank Type", [["Enlisted / Warrant Officer", 0], ["Commissioned Officer", 1]], 0),
      TAX_RATE,
    ],
    calcResult: { label: "Extra Pay for the Deployment", format: "currency" },
    calcResults: [
      { key: "extraPayForDeployment", label: "Extra Pay for the Deployment", format: "currency", highlight: true },
      { key: "extraPayPerMonth", label: "Extra Pay per Month", format: "currency" },
      { key: "taxFreeIncomePerMonth", label: "Tax-Free Income per Month (CZTE)", format: "currency" },
      { key: "estimatedTaxSavings", label: "Estimated Federal Tax Saved", format: "currency" },
      { key: "totalPayForDeployment", label: "Total Pay for the Deployment (excl. BAH/BAS)", format: "currency" },
    ],
    instructions: "Enter how long you'll be deployed and your monthly basic pay, then which deployment pays apply to your location and orders. Choose whether the area is a designated combat zone, which makes your pay federal-tax-free.",
    examples: `Example: an E-4 earning ${usd(3815)} basic pay on a 9-month deployment with IDP, FSA and $100 hardship duty pay gets ${usd(exDeploy.extraPayPerMonth)} extra a month — ${usd(exDeploy.extraPayForDeployment)} over the deployment — and saves about ${usd(exDeploy.estimatedTaxSavings)} in federal tax in a combat zone.`,
    assumptions: `HFP/IDP $225 a month, FSA $250 a month (dependents and 30+ days away), HDP-L $50–$150 by location. Combat zone tax exclusion: all pay for enlisted and warrant officers; commissioned officers up to ${usd(E.CZTE_OFFICER_CAP_2026)} a month (top enlisted basic pay of $11,166.90 + $225). BAH and BAS continue as normal and aren't included in the totals. ${DISCLAIMER}`,
    faq: [
      { question: "Is deployment pay tax-free?", answer: "In a designated combat zone or qualified hazardous duty area, yes — every month you spend at least one day there is excluded from federal income tax (officers up to a cap)." },
      { question: "Can I get FSA if I'm single?", answer: "No — Family Separation Allowance is for members with dependents who are separated from them for more than 30 days." },
    ],
  },
  {
    slug: "basic-needs-allowance-calculator",
    title: "Basic Needs Allowance (BNA) Calculator",
    description: "Check if you qualify for the military Basic Needs Allowance in 2026 and how much it pays — the monthly amount that brings household income up to 200% of the poverty guideline.",
    metaTitle: "Basic Needs Allowance Calculator 2026 — Military BNA",
    metaDescription: "Free BNA calculator. Compare your gross household income with 200% of the 2026 poverty guideline to see if you qualify and your monthly BNA.",
    calcInputs: [
      numberField("householdSize", "Household Size", { default: 5, min: 1, max: 15, unit: "people" }),
      dropdown("region", "Duty Location", [["48 contiguous states & DC", 0], ["Alaska", 1], ["Hawaii", 2]], 0),
      currencyField("grossHouseholdIncome", "Gross Household Income (last year, excl. BAH)", { default: 55000, max: 300000, step: 100 }),
    ],
    calcResult: { label: "Monthly BNA", format: "currency" },
    calcResults: [
      { key: "monthlyBna", label: "Monthly BNA", format: "currency", highlight: true },
      { key: "annualBna", label: "Annual BNA", format: "currency" },
      { key: "incomeThreshold", label: "Income Limit (200% of Poverty Guideline)", format: "currency" },
      { key: "incomeAsPercentOfThreshold", label: "Your Income as % of the Limit", format: "percentage" },
      { key: "eligible", label: "Under the Limit? (1 = yes)", format: "number" },
    ],
    instructions: "Enter everyone in your household and your gross household income for the previous calendar year — basic pay, special pays and your spouse's income, but not BAH or OHA. If it's below the limit you may qualify; you still have to apply through your command.",
    examples: `Example: a household of 5 in the lower 48 has a 2026 limit of ${usd(exBna.incomeThreshold)}. With ${usd(55000)} gross income, BNA would be about ${usd(exBna.monthlyBna)} a month (${usd(exBna.annualBna)} a year).`,
    assumptions: `Limit = 200% of the 2026 HHS poverty guideline ($15,960 + $5,680 per extra person; Alaska $19,950 + $7,100; Hawaii $18,360 + $6,530). BNA = (limit − gross household income) ÷ 12. Members overseas and those with certain incomes are excluded; DoD may use a different guideline year depending on when you apply. ${DISCLAIMER}`,
    faq: [
      { question: "Is BAH counted for BNA?", answer: "No. BAH (or OHA) is left out of gross household income for BNA." },
      { question: "Is BNA taxable?", answer: "Yes, BNA is taxable income." },
    ],
  },
  {
    slug: "srb-calculator",
    title: "SRB Calculator — Selective Reenlistment Bonus",
    description: "Estimate your Selective Reenlistment Bonus — the multiple × monthly basic pay × years you reenlist for — with the upfront payment and yearly installments.",
    metaTitle: "SRB Calculator — Selective Reenlistment Bonus Estimate",
    metaDescription: "Free SRB calculator. Enter your monthly basic pay, SRB multiple and years of reenlistment to see your total bonus, upfront payment and installments.",
    calcInputs: [
      currencyField("monthlyBasicPay", "Monthly Basic Pay on Reenlistment Date", { default: 4236, max: 20000, step: 10 }),
      numberField("multiple", "SRB Multiple (award level)", { default: 3, max: 15, step: 0.5 }),
      numberField("yearsReenlisting", "Years of Reenlistment", { default: 4, min: 1, max: 6, unit: "years" }),
      currencyField("capAmount", "Bonus Cap (0 = none)", { default: 100000, max: 360000, step: 1000 }),
      percentField("upfrontPercent", "Paid Upfront", { default: 50, step: 5 }),
      percentField("taxRatePercent", "Tax Withheld on the Upfront Payment", { default: 22, max: 37 }),
    ],
    calcResult: { label: "Total Bonus", format: "currency" },
    calcResults: [
      { key: "totalBonus", label: "Total Bonus", format: "currency", highlight: true },
      { key: "upfrontPayment", label: "Upfront Payment", format: "currency" },
      { key: "annualInstallment", label: "Each Yearly Installment", format: "currency" },
      { key: "bonusBeforeCap", label: "Bonus Before Cap", format: "currency" },
      { key: "afterTaxUpfront", label: "Upfront Payment After Withholding", format: "currency" },
    ],
    instructions: "Use your monthly basic pay on the day you reenlist, the multiple for your rating/MOS/AFSC from your service's current bonus message, and the number of additional years. Set the cap and upfront share your service uses (the Navy pays 50% upfront and the rest in yearly installments).",
    examples: `Example: ${usd(4236)} basic pay × a multiple of 3 × 4 years = ${usd(exSrb.totalBonus)}. Half upfront is ${usd(exSrb.upfrontPayment)} (${usd(exSrb.afterTaxUpfront)} after 22% withholding), then ${usd(exSrb.annualInstallment)} on each of the next 3 anniversaries.`,
    assumptions: `SRB = monthly basic pay × multiple × years of additional obligated service (up to 6), limited by the service's cap. Remaining installments are spread evenly over the remaining years. Bonuses earned in a combat zone are tax-free. ${DISCLAIMER}`,
    faq: [
      { question: "Is the SRB tax-free if I reenlist while deployed?", answer: "Yes — if you reenlist while serving in a combat zone, the bonus is excluded from federal income tax (officers up to the CZTE cap)." },
      { question: "Where do I find my SRB multiple?", answer: "In your service's current SRB/retention bonus message (NAVADMIN, MARADMIN, ALARACT or AFPC list) for your specialty and zone." },
    ],
  },
  {
    slug: "continuation-pay-calculator",
    title: "Continuation Pay Calculator (BRS)",
    description: "Estimate your Blended Retirement System continuation pay — a multiple of 2.5 to 13 times your monthly basic pay at 12 years of service — and what you'll keep after tax.",
    metaTitle: "Continuation Pay Calculator — BRS Mid-Career Bonus",
    metaDescription: "Free BRS continuation pay calculator. Uses 2026 basic pay at 12 years of service × your service's multiple to estimate the payment and after-tax amount.",
    calcInputs: [
      dropdown("grade", "Pay Grade at 12 Years", GRADES, g("O-3")),
      numberField("multiple", "Continuation Pay Multiple (2.5–13)", { default: 2.5, min: 2.5, max: 13, step: 0.5 }),
      dropdown("installments", "Payment", [["Lump sum", 1], ["4 yearly installments", 4]], 1),
      percentField("taxRatePercent", "Tax Withheld", { default: 22, max: 37 }),
    ],
    calcResult: { label: "Continuation Pay", format: "currency" },
    calcResults: [
      { key: "continuationPay", label: "Continuation Pay", format: "currency", highlight: true },
      { key: "monthlyBasicPayAt12", label: "Monthly Basic Pay at 12 Years (2026)", format: "currency" },
      { key: "afterTaxAmount", label: "After Withholding", format: "currency" },
      { key: "perInstallment", label: "Per Installment", format: "currency" },
      { key: "installments", label: "Number of Payments", format: "number" },
    ],
    instructions: "Pick the grade you'll hold at 12 years of service and the multiple your service offers (Army and Air Force usually 2.5; some specialties more). In return you agree to serve 3 more years.",
    examples: `Example: an O-3 at 12 years earns ${usd(exCp.monthlyBasicPayAt12)} a month. A 2.5× multiple pays ${usd(exCp.continuationPay)} — about ${usd(exCp.afterTaxAmount)} after 22% withholding.`,
    assumptions: `Continuation pay = 2.5 to 13 × monthly basic pay (active component; Reserve 0.5 to 6 ×) for BRS members with 8–12 years of service who commit to 3 more years. Uses the 2026 pay table at "over 12". ${DISCLAIMER}`,
    faq: [
      { question: "Who gets continuation pay?", answer: "Members in the Blended Retirement System between 8 and 12 years of service who agree to serve at least 3 more years." },
      { question: "Can I take it in installments?", answer: "Yes — services allow a lump sum or up to 4 annual installments." },
    ],
  },
  {
    slug: "military-separation-pay-calculator",
    title: "Military Separation Pay Calculator",
    description: "Estimate involuntary separation pay (full or half) — 10% or 5% of 12 months of basic pay times your years of active service — and the amount after federal withholding.",
    metaTitle: "Military Separation Pay Calculator — Full & Half ISP",
    metaDescription: "Free involuntary separation pay calculator. 10% (full) or 5% (half) × 12 × monthly basic pay × years of service, with after-tax amount.",
    calcInputs: [
      currencyField("monthlyBasicPay", "Monthly Basic Pay at Separation", { default: 5194, max: 20000, step: 10 }),
      numberField("yearsOfService", "Years of Active Service", { default: 10, min: 0, max: 20, step: 0.5, unit: "years" }),
      dropdown("payType", "Separation Pay Type", [["Full (10%)", 0], ["Half (5%)", 1]], 0),
      percentField("taxRatePercent", "Federal Withholding", { default: 22, max: 37 }),
    ],
    calcResult: { label: "Separation Pay", format: "currency" },
    calcResults: [
      { key: "separationPay", label: "Separation Pay", format: "currency", highlight: true },
      { key: "afterTaxSeparationPay", label: "After Federal Withholding", format: "currency" },
      { key: "federalWithholding", label: "Federal Withholding", format: "currency" },
      { key: "meetsSixYearMinimum", label: "Meets 6-Year Minimum? (1 = yes)", format: "number" },
    ],
    instructions: "Enter your monthly basic pay on the day you separate and your years of active service (count six months or more as half a year). Choose full or half pay as stated on your separation orders.",
    examples: `Example: an E-6 with 10 years (${usd(5194)} a month) receives full separation pay of ${usd(exSep.separationPay)} — about ${usd(exSep.afterTaxSeparationPay)} after 22% withholding.`,
    assumptions: `Full separation pay = 10% × 12 × monthly basic pay × years of active service; half pay = 5%. Requires at least 6 and fewer than 20 years and an honorable/general characterization; it's taxable. If you later get VA disability compensation, the VA recovers the after-tax amount from it. ${DISCLAIMER}`,
    faq: [
      { question: "Do I have to pay separation pay back?", answer: "Not to DoD, but if you receive VA disability compensation for the same service, the VA withholds it until the after-tax separation pay is recouped." },
      { question: "What's the difference between full and half separation pay?", answer: "Full (10%) is for members fully qualified for retention but separated involuntarily; half (5%) applies to some other involuntary separations, such as certain misconduct or failure to meet standards." },
    ],
  },
  {
    slug: "bonus-recoupment-calculator",
    title: "Military Bonus Recoupment Calculator",
    description: "Work out how much of a military bonus you'd have to repay if you leave early — the unearned share for the months of your obligation you won't serve.",
    metaTitle: "Military Bonus Recoupment Calculator — Unearned Portion",
    metaDescription: "Free bonus recoupment calculator. Enter the bonus, the obligation and months served to see the earned and unearned portions and the amount to repay.",
    calcInputs: [
      currencyField("bonusAmount", "Total Bonus Amount", { default: 20000, max: 500000, step: 500 }),
      numberField("obligationMonths", "Service Obligation", { default: 48, min: 1, max: 120, unit: "months" }),
      numberField("monthsServed", "Months of the Obligation Served", { default: 30, max: 120, unit: "months" }),
      currencyField("amountPaidSoFar", "Amount Already Paid to You", { default: 20000, max: 500000, step: 500 }),
    ],
    calcResult: { label: "Amount to Repay", format: "currency" },
    calcResults: [
      { key: "amountToRepay", label: "Amount to Repay", format: "currency", highlight: true },
      { key: "earnedPortion", label: "Earned Portion", format: "currency" },
      { key: "unearnedPortion", label: "Unearned Portion", format: "currency" },
      { key: "percentEarned", label: "Obligation Completed", format: "percentage" },
      { key: "monthsRemaining", label: "Months Remaining", format: "number" },
    ],
    instructions: "Enter the full bonus, the months of service it obligated you to, how many of those months you've served, and how much has actually been paid to you (all of it for a lump sum, less for installments).",
    examples: `Example: a ${usd(20000)} bonus for a 48-month obligation, paid in full, with 30 months served: ${usd(exRec.earnedPortion)} is earned and ${usd(exRec.amountToRepay)} would be recouped.`,
    assumptions: `Pro-rata recoupment: unearned = bonus × months not served ÷ obligation months; you repay what you've received beyond the earned share. Recoupment can be waived for separations due to injury, disability or other approved reasons — check DoDI 1304.31 and your service's rules. ${DISCLAIMER}`,
    faq: [
      { question: "Will I always have to pay back a bonus if I separate early?", answer: "Usually the unearned part, but medical separations and some other situations can be waived or exempt." },
      { question: "Can recoupment be taken from my final pay?", answer: "Yes — it's often collected from final pay first, then as a debt to DFAS." },
    ],
  },
  {
    slug: "savings-deposit-program-calculator",
    title: "Savings Deposit Program (SDP) Calculator",
    description: "See how much the military Savings Deposit Program pays on a deployment — 10% annual interest, compounded quarterly, on up to $10,000 deposited.",
    metaTitle: "SDP Calculator — Military Savings Deposit Program 10%",
    metaDescription: "Free Savings Deposit Program calculator. Deposit up to $10,000 while deployed and see your 10% interest and final balance.",
    calcInputs: [
      currencyField("initialDeposit", "Initial Deposit", { default: 0, max: 10000, step: 100 }),
      currencyField("monthlyDeposit", "Monthly Deposit (allotment)", { default: 1000, max: 10000, step: 50 }),
      numberField("deploymentMonths", "Months Deployed", { default: 9, min: 1, max: 36, unit: "months" }),
      numberField("monthsAfterReturn", "Months Interest Continues After Return (up to 3)", { default: 3, max: 3, unit: "months" }),
    ],
    calcResult: { label: "Final Balance", format: "currency" },
    calcResults: [
      { key: "finalBalance", label: "Final Balance", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest Earned", format: "currency" },
      { key: "totalDeposited", label: "Total Deposited (max $10,000)", format: "currency" },
      { key: "effectiveReturn", label: "Return on Deposits", format: "percentage" },
    ],
    instructions: "Enter what you'll deposit and for how long you'll be in the eligible area (at least 30 consecutive days, or one day in each of three consecutive months). Interest keeps accruing for up to 90 days after you leave.",
    examples: `Example: depositing ${usd(1000)} a month for a 9-month deployment (${usd(exSdp.totalDeposited)} in total, under the ${usd(10000)} cap) grows to about ${usd(exSdp.finalBalance)} — ${usd(exSdp.totalInterest)} of interest.`,
    assumptions: `10% a year, accrued monthly and credited quarterly here; deposits are limited to $10,000 total. Interest is taxable; your deposits are not. Funds are paid out within 120 days after you leave the area (earlier only for emergencies). ${DISCLAIMER}`,
    faq: [
      { question: "Is SDP interest taxable?", answer: "Yes, the interest is taxable even though deposits made from combat-zone pay are tax-free." },
      { question: "Can I deposit more than $10,000?", answer: "No — $10,000 is the maximum that earns the 10% rate." },
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
