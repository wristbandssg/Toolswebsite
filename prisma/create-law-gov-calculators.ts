// One-time (but safe to re-run) batch setup script: creates 60 government fee and public finance
// calculators (Law & Government Calculators > Government Fees & Public Finance Calculators). Pay
// tables, vehicle fee formulas and fee schedules live in src/lib/calc-engine-law-gov.ts; examples
// are computed from the engine so they always match.
// Merged keywords (covered here or by existing tools, no separate page): Government Pay Scale,
// Government Salary → gs-pay; Federal Budget → taxpayer-receipt; VSIP → vera-vsip; Vehicle Registration
// Fee (general) → existing car-registration-fee; Vehicle License Tax Arizona → arizona-vehicle-
// registration-fee; Maine Vehicle Registration → maine-vehicle-excise-tax; Georgia Vehicle Excise Tax,
// GA Avalon Tax → existing georgia-car-sales-tax (TAVT); Massachusetts Vehicle Sales Tax → existing
// massachusetts-car-sales-tax; DC Vehicle Sales Tax, DC Auto Tax → dc-vehicle-excise-tax; Tax and
// License, Taxes Title and Fees, Title and Tax, Car Title, Tags → tax-title-license; Tax and Licensing
// WA → washington-tax-and-licensing; Building Permit Fee, Texas Building Permit Fee → existing
// building-permit-cost; Recording Fee & Transfer Tax → florida-recording-fee-transfer-tax; Fire
// Occupancy, NC Maximum Occupancy → fire-code-occupancy; DFVC, Dfvcp, DFVC / Dfvcp Penalty →
// dfvc-penalty; VFCP, DOL VFCP, DOL Calculator, Department of Labor Lost Earnings → vfcp-lost-
// earnings; Legal Due Date, Date Calculator Legal / Federal Court, Best Case Date → court-deadline;
// Fine, Traffic Fine, Speed Fine → speeding-ticket-cost.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-gov-calculators.ts
// or
//   npm run db:create-law-gov-calculators

import * as E from "../src/lib/calc-engine-law-gov";

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


const CAT = "government-fees-public-finance-calculators";
const NOTE = "This is an estimate — government fees, tax rates and pay tables change, so confirm with the agency before you pay or plan.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const yn = (key: string, label: string, def = 0) => dropdown(key, label, YESNO, def);
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
    metaTitle: (s.meta ?? `${s.title} — Free & Up to Date`).slice(0, 70),
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

const GRADES = E.GS_2026.map((_, i) => [`GS-${i + 1}`, i] as [string, number]);
const STEPS = Array.from({ length: 10 }, (_, i) => [`Step ${i + 1}`, i] as [string, number]);
const LOCS = E.LOCALITIES.map(([n, p], i) => [`${n} (${p}%)`, i] as [string, number]);
const DC = LOCS.findIndex(([l]) => l.startsWith("Washington-Baltimore"));

const TOOLS: ToolDef[] = [
  mk({
    slug: "gs-pay-calculator", title: "GS Pay Calculator 2026",
    desc: "Calculate 2026 General Schedule pay by grade, step and locality — base pay, locality pay, biweekly and hourly rates from the official OPM tables.",
    meta: "GS Pay Calculator 2026 — Federal Salary by Grade, Step & Locality",
    inputs: [dropdown("grade", "Grade", GRADES, 10), dropdown("step", "Step", STEPS, 0), dropdown("locality", "Locality Pay Area", LOCS, DC)],
    results: [["annualSalary", "Annual Salary (with locality)", "c"], ["basePay", "Base Pay", "c"], ["localityPay", "Locality Pay", "c"], ["biweeklyPay", "Biweekly Pay", "c"], ["hourlyRate", "Hourly Rate", "c"], ["localityPercent", "Locality Percent", "p"], ["cappedAtExIV", "Capped at $197,200? (1 = yes)", "n"]],
    fn: E.gsPay, ex: { grade: 10, step: 0, locality: DC },
    exText: (o) => `Example: a GS-11 step 1 in the Washington-Baltimore area earns ${usd(o.annualSalary)} in 2026 — ${usd(o.basePay)} base plus ${usd(o.localityPay)} locality pay (${usd(o.biweeklyPay)} every two weeks).`,
    how: "Choose your grade, step and the locality pay area of your duty station.",
    assume: "OPM Salary Table 2026-GS (1% across-the-board increase effective the first pay period of January 2026) and the 2026 locality percentages for all 58 areas. Locality rates are capped at Executive Schedule level IV ($197,200). Hourly rate = annual ÷ 2,087 hours. Special rates (IT, medical, law enforcement) can be higher.",
    faq: [["How much did GS pay increase in 2026?", "1% across the board, with locality percentages set for each pay area (for example 33.94% for Washington-Baltimore and 17.06% for the Rest of U.S.)."], ["How long between GS steps?", "Steps 1–4 take 1 year each, steps 4–7 take 2 years each, and steps 7–10 take 3 years each (18 years from step 1 to 10)."]],
  }),
  mk({
    slug: "two-step-promotion-rule-calculator", title: "Two-Step Promotion Rule Calculator",
    desc: "Find your new GS step after a promotion under the two-step rule — the lowest step in the new grade that's at least two within-grade increases above your current pay.",
    inputs: [dropdown("currentGrade", "Current Grade", GRADES, 8), dropdown("currentStep", "Current Step", STEPS, 3), dropdown("newGrade", "Promoted To", GRADES, 10), dropdown("locality", "Locality Pay Area", LOCS, DC)],
    results: [["newStep", "New Step", "n"], ["newSalaryWithLocality", "New Salary (with locality)", "c"], ["raiseAmount", "Raise", "c"], ["newBasePay", "New Base Pay", "c"], ["minimumRequiredBase", "Minimum Base Pay Required", "c"]],
    fn: E.twoStepPromotion, ex: { currentGrade: 8, currentStep: 3, newGrade: 10, locality: DC },
    exText: (o) => `Example: promotion from GS-9 step 4 to GS-11 requires at least ${usd(o.minimumRequiredBase)} base pay, so you land on GS-11 step ${o.newStep} — ${usd(o.newSalaryWithLocality)} in Washington-Baltimore, a ${usd(o.raiseAmount)} raise.`,
    how: "Choose your current grade and step and the grade you're being promoted to.",
    assume: "5 CFR 531.214: your new rate is the lowest step of the higher grade that equals or exceeds your current rate plus two within-grade increases of your current grade (computed on the 2026 GS base table; agencies compare the highest applicable rate, which can differ for special rates).",
    faq: [["What is the two-step promotion rule?", "When promoted, your new pay must be at least two step increases of your old grade higher than your current pay."], ["Does a promotion reset my step waiting period?", "Yes — the waiting period for your next within-grade increase starts over."]],
  }),
  mk({
    slug: "fers-retirement-calculator", title: "FERS Retirement Calculator",
    desc: "Estimate your FERS basic annuity — high-3 salary × years of service × 1% (1.1% at 62 with 20 years), MRA+10 reductions, special provisions and the FERS supplement.",
    meta: "FERS Retirement Calculator — Federal Pension Estimate",
    inputs: [cur("high3Salary", "High-3 Average Salary", 95000, 500000, 100), num("yearsOfService", "Creditable Years of Service", 25, 50, 0.25), num("sickLeaveHours", "Unused Sick Leave (hours)", 1000, 10000), num("retirementAge", "Age at Retirement", 60, 80, 1, 40), num("birthYear", "Birth Year", 1968, 2010, 1, 1940), yn("specialProvisions", "Law Enforcement / Firefighter / ATC (special provisions)?"), yn("earlyOutOffer", "Retiring Under a VERA Early-Out Offer?"), cur("socialSecurityAt62", "Estimated Social Security at 62 (monthly, for the supplement)", 1800, 10000, 10)],
    results: [["annualAnnuity", "Annual FERS Annuity", "c"], ["monthlyAnnuity", "Monthly Annuity", "c"], ["fersSupplementMonthly", "FERS Supplement (monthly, to 62)", "c"], ["eligibleToRetire", "Eligible to Retire? (1 = yes)", "n"], ["minimumRetirementAge", "Your MRA", "n"], ["multiplierPercent", "Multiplier", "p"], ["reductionPercent", "Age Reduction", "p"], ["creditableYears", "Creditable Years (incl. sick leave)", "n"]],
    fn: E.fersRetirement, ex: { high3Salary: 95000, yearsOfService: 25, sickLeaveHours: 1000, retirementAge: 60, birthYear: 1968, specialProvisions: 0, earlyOutOffer: 0, socialSecurityAt62: 1800 },
    exText: (o) => `Example: retiring at 60 with 25 years plus 1,000 hours of sick leave (${o.creditableYears} years) and a ${usd(95000)} high-3 pays about ${usd(o.monthlyAnnuity)} a month, plus a FERS supplement of ${usd(o.fersSupplementMonthly)} until 62.`,
    how: "Enter your highest 3 consecutive years' average basic pay, creditable service, unused sick leave and retirement age.",
    assume: "5 U.S.C. 8415: 1% of high-3 per year (1.1% if retiring at 62+ with 20+ years); special provisions 1.7% for the first 20 years + 1% after. Immediate unreduced retirement: MRA + 30, 60 + 20, 62 + 5; MRA + 10 is reduced 5% per year under 62. Sick leave counts toward service (2,087 hours = 1 year). The supplement approximates Social Security earned under FERS (paid to 62, subject to an earnings test). COLAs and survivor reductions aren't included.",
    faq: [["How is FERS pension calculated?", "High-3 average salary × years of service × 1% (or 1.1% if you retire at 62 or older with 20+ years)."], ["What is the FERS MRA?", "Your minimum retirement age — between 55 and 57 depending on birth year (57 for 1970 and later)."]],
  }),
  mk({
    slug: "vera-vsip-calculator", title: "VERA / VSIP Calculator",
    desc: "Estimate a federal Voluntary Separation Incentive Payment (up to $25,000 or your severance pay) and check VERA early retirement eligibility and annuity.",
    inputs: [cur("annualBasePay", "Annual Basic Pay", 110000, 500000, 100), num("yearsOfService", "Years of Service", 22, 50, 0.25), num("age", "Age", 52, 80), cur("high3Salary", "High-3 Average Salary", 105000, 500000, 100), cur("vsipCap", "VSIP Maximum (agency)", 25000, 100000, 500), pct("taxRatePercent", "Estimated Tax Rate on VSIP", 32, 60, 1)],
    results: [["vsipPayment", "VSIP Payment", "c"], ["vsipAfterTax", "VSIP After Tax", "c"], ["severanceEquivalent", "Severance Pay Formula Amount", "c"], ["veraEligible", "VERA Eligible? (1 = yes)", "n"], ["veraAnnualAnnuity", "Estimated VERA Annuity (annual)", "c"]],
    fn: E.veraVsip, ex: { annualBasePay: 110000, yearsOfService: 22, age: 52, high3Salary: 105000, vsipCap: 25000, taxRatePercent: 32 },
    exText: (o) => `Example: at 52 with 22 years and ${usd(110000)} pay, the severance formula gives ${usd(o.severanceEquivalent)}, so VSIP is capped at ${usd(o.vsipPayment)}; you're VERA-eligible with an unreduced annuity of about ${usd(o.veraAnnualAnnuity)} a year.`,
    how: "Enter your basic pay, service and age. VSIP is only available when your agency offers it.",
    assume: "VSIP (5 U.S.C. 3521–3525) is the lesser of $25,000 (or a higher agency limit if authorized) and the severance pay formula: 1 week's pay per year for the first 10 years, 2 weeks per year after, plus 2.5% for each full quarter over age 40, capped at 52 weeks. VERA: age 50 + 20 years or any age + 25 years, with no age reduction. Accepting VSIP and returning to federal work within 5 years requires repaying it.",
    faq: [["How much is VSIP?", "Up to $25,000 (before taxes), or your severance pay amount if lower."], ["What is VERA?", "Voluntary Early Retirement Authority — an agency offer letting employees retire at 50 with 20 years or at any age with 25 years."]],
  }),
  mk({
    slug: "government-pension-calculator", title: "Government Pension Calculator",
    desc: "Estimate a state, local or federal government pension — final average salary × years of service × multiplier, with early-retirement and survivor reductions.",
    inputs: [cur("finalAverageSalary", "Final Average Salary", 80000, 1000000, 100), num("yearsOfService", "Years of Service", 25, 50, 0.25), pct("multiplierPercent", "Multiplier per Year (e.g. 2% at 62)", 2, 5, 0.05), pct("earlyReductionPercent", "Early Retirement Reduction", 0, 100, 0.5), pct("maxPercentOfSalary", "Maximum Benefit (% of salary)", 100, 100, 1), pct("survivorReductionPercent", "Survivor Option Reduction", 0, 50, 0.5)],
    results: [["annualPension", "Annual Pension", "c"], ["monthlyPension", "Monthly Pension", "c"], ["replacementRatePercent", "Income Replacement Rate", "p"], ["pensionBeforeSurvivorOption", "Before Survivor Option", "c"], ["valueAt4PercentRule", "Savings Needed to Match (4% rule)", "c"]],
    fn: E.governmentPension, ex: { finalAverageSalary: 80000, yearsOfService: 25, multiplierPercent: 2, earlyReductionPercent: 0, maxPercentOfSalary: 100, survivorReductionPercent: 0 },
    exText: (o) => `Example: 25 years at a 2% multiplier on an ${usd(80000)} final average salary pays ${usd(o.annualPension)} a year (${usd(o.monthlyPension)} a month) — the same income would take about ${usd(o.valueAt4PercentRule)} in savings.`,
    how: "Find your plan's multiplier (CalPERS Classic 2% at 55, PEPRA 2% at 62, NYSLRS Tier 6 1.75%–2%, many teacher plans 2–2.5%) and enter your final average salary period's pay.",
    assume: "Defined-benefit formula: final average salary × service × multiplier, less early-retirement and joint-and-survivor reductions, limited to the plan's maximum. COLAs, Social Security offsets (state plans) and taxes aren't included.",
    faq: [["How are government pensions calculated?", "Most use final average salary × years of service × a multiplier, such as 2% per year."], ["What is a good pension replacement rate?", "Around 50–60% of final pay from a pension, plus Social Security or savings, is a common retirement target."]],
  }),
  mk({
    slug: "federal-employee-total-compensation-calculator", title: "Federal Employee Total Compensation Calculator",
    desc: "See the full value of a federal job — salary plus FERS agency contributions, TSP match, FEHB share, FICA, FEGLI and the value of paid leave and holidays.",
    inputs: [cur("annualSalary", "Annual Salary", 95000, 500000, 100), pct("yourTspPercent", "Your TSP Contribution", 5, 100, 0.5), pct("agencyFersPercent", "Agency FERS Normal Cost", 18.4, 40, 0.1), cur("annualFehbPremium", "Total Annual FEHB Premium", 18000, 60000, 100), pct("governmentSharePercent", "Government Share of FEHB", 72, 75, 0.5), num("annualLeaveDays", "Annual Leave Days", 20, 40), num("sickLeaveDays", "Sick Leave Days", 13, 30)],
    results: [["totalCompensation", "Total Compensation", "c"], ["benefitsValue", "Benefits Value", "c"], ["benefitsPercentOfSalary", "Benefits as % of Salary", "p"], ["fersAgencyContribution", "FERS Agency Contribution", "c"], ["tspAgencyContribution", "TSP Automatic + Match", "c"], ["healthInsuranceShare", "FEHB Government Share", "c"], ["socialSecurityMedicare", "Employer Social Security & Medicare", "c"], ["paidLeaveValue", "Value of Paid Leave & Holidays (included in salary)", "c"]],
    fn: E.totalCompensation, ex: { annualSalary: 95000, yourTspPercent: 5, agencyFersPercent: 18.4, annualFehbPremium: 18000, governmentSharePercent: 72, annualLeaveDays: 20, sickLeaveDays: 13 },
    exText: (o) => `Example: a ${usd(95000)} salary with 5% to the TSP and family FEHB is worth about ${usd(o.totalCompensation)} a year — ${usd(o.benefitsValue)} (${o.benefitsPercentOfSalary}%) on top of pay.`,
    how: "Enter your salary, TSP contribution, your FEHB plan's total premium and your leave accrual (annual leave rises to 26 days after 15 years).",
    assume: "TSP: 1% automatic + 100% match on the first 3% and 50% on the next 2%. FERS agency normal cost about 18.4% of pay for regular employees (higher for special provisions). FEHB government share up to 72% of the plan premium (75% cap). Employer FICA 6.2% to $184,500 + 1.45%. FEGLI Basic agency share $0.08 per $1,000 biweekly. Leave value = daily pay × (annual + sick + 11 holidays) — already part of salary, shown for comparison with private jobs.",
    faq: [["How much are federal benefits worth?", "Often 30–45% of salary once FERS, TSP matching and health insurance are counted."], ["How much does the government pay toward FEHB?", "About 72% of the average premium, up to 75% of any plan's premium."]],
  }),
  mk({
    slug: "taxpayer-receipt-calculator", title: "Taxpayer Receipt Calculator",
    desc: "See where your federal taxes go — your income and payroll taxes split across Social Security, Medicare, health, interest on the debt, defense and more.",
    inputs: [cur("federalIncomeTax", "Federal Income Tax You Paid", 9000, 10000000, 50), cur("payrollTax", "Social Security & Medicare Tax You Paid", 5700, 1000000, 50), pct("deficitPercentOfSpending", "Share of Spending Financed by Borrowing", 25, 60, 1)],
    results: [["totalFederalTaxes", "Your Federal Taxes", "c"], ["socialSecurity", "Social Security", "c"], ["medicare", "Medicare", "c"], ["health", "Medicaid & Other Health", "c"], ["netInterest", "Interest on the Debt", "c"], ["defense", "National Defense", "c"], ["incomeSecurity", "Income Security", "c"], ["veterans", "Veterans' Benefits", "c"], ["education", "Education & Training", "c"], ["transportation", "Transportation", "c"], ["other", "Everything Else", "c"], ["deficitShareBorrowed", "Matching Amount Borrowed", "c"]],
    fn: E.taxpayerReceipt, ex: { federalIncomeTax: 9000, payrollTax: 5700, deficitPercentOfSpending: 25 },
    exText: (o) => `Example: of ${usd(o.totalFederalTaxes)} in federal taxes, about ${usd(o.socialSecurity)} goes to Social Security, ${usd(o.netInterest)} to interest on the debt and ${usd(o.defense)} to defense.`,
    how: "Enter the federal income tax from your Form 1040 and the Social Security and Medicare tax from your W-2s.",
    assume: `Shares of FY2025 federal outlays by function (rounded, from CBO / Treasury monthly statements): ${E.OUTLAY_SHARES.map(([n, p]) => `${n} ${p}%`).join(", ")}. Payroll taxes legally fund Social Security and Medicare trust funds; this receipt spreads all taxes across total spending.`,
    faq: [["Where do my federal taxes go?", "The biggest shares go to Social Security, Medicare, health programs, interest on the national debt and defense."], ["How much of the budget is interest on the debt?", "About 14% of federal spending in FY2025 — more than defense."]],
  }),
  mk({
    slug: "sprs-score-calculator", title: "SPRS Score Calculator (NIST SP 800-171)",
    desc: "Calculate your DoD SPRS score for NIST SP 800-171 — start at 110 and subtract 5, 3 or 1 point for each requirement not met (minimum −203).",
    meta: "SPRS Score Calculator — NIST 800-171 DoD Assessment",
    inputs: [num("unmetFivePoint", "Unmet 5-Point Requirements", 2, 50), num("unmetThreePoint", "Unmet 3-Point Requirements", 3, 20), num("unmetOnePoint", "Unmet 1-Point Requirements", 6, 60), num("partialMfaOrFips", "Partially Implemented MFA (3.5.3) / FIPS Encryption (3.13.11) (−3 instead of −5)", 0, 2)],
    results: [["sprsScore", "SPRS Score", "n"], ["pointsDeducted", "Points Deducted", "n"], ["meetsCmmcConditional88", "Meets 88-Point CMMC Level 2 Conditional Minimum? (1 = yes)", "n"], ["requirementsUnmet", "Requirements Not Met", "n"], ["perfectScore", "Perfect 110? (1 = yes)", "n"]],
    fn: E.sprsScore, ex: { unmetFivePoint: 2, unmetThreePoint: 3, unmetOnePoint: 6, partialMfaOrFips: 0 },
    exText: (o) => `Example: 2 unmet 5-point, 3 unmet 3-point and 6 unmet 1-point requirements give an SPRS score of ${o.sprsScore}.`,
    how: "Go through your System Security Plan and count unmet requirements by their DoD Assessment Methodology weight. Count partially implemented MFA or FIPS-validated encryption in the last box instead of the 5-point box.",
    assume: "DoD Assessment Methodology v1.2.1: 110 − (5, 3 or 1 per unmet requirement); MFA and FIPS encryption deduct 3 if partially implemented; no SSP means no score. CMMC Level 2 conditional status needs at least 88 with no 5-point items on POA&M (most), closed within 180 days.",
    faq: [["What is a good SPRS score?", "110 is perfect; CMMC Level 2 conditional certification requires at least 88 (80%)."], ["Can an SPRS score be negative?", "Yes — the lowest possible score is −203."]],
  }),
  mk({
    slug: "wrap-rate-calculator", title: "Wrap Rate Calculator",
    desc: "Calculate a government contractor wrap rate — direct labor × fringe × overhead × G&A × fee — and the fully burdened bill rate.",
    inputs: [cur("directLaborRate", "Direct Labor Rate ($/hour)", 50, 1000, 0.5), pct("fringePercent", "Fringe Rate", 30, 100, 0.5), pct("overheadPercent", "Overhead Rate", 25, 200, 0.5), pct("gaPercent", "G&A Rate", 12, 100, 0.5), pct("feePercent", "Fee / Profit", 8, 50, 0.5)],
    results: [["wrapRate", "Wrap Rate (multiplier)", "n"], ["billRate", "Bill Rate ($/hour)", "c"], ["fullyBurdenedCost", "Fully Burdened Cost ($/hour)", "c"], ["profitPerHour", "Profit per Hour", "c"], ["wrapRateWithoutFee", "Wrap Rate Without Fee", "n"]],
    fn: E.wrapRate, ex: { directLaborRate: 50, fringePercent: 30, overheadPercent: 25, gaPercent: 12, feePercent: 8 },
    exText: (o) => `Example: $50 an hour with 30% fringe, 25% overhead, 12% G&A and 8% fee is a wrap rate of ${o.wrapRate} — a bill rate of ${usd(o.billRate)}.`,
    how: "Enter the employee's direct labor rate and your indirect rates as applied in your cost structure (fringe on labor, overhead on labor + fringe, G&A on total cost).",
    assume: "Wrap = (1 + fringe) × (1 + overhead) × (1 + G&A) × (1 + fee). Some contractors apply fringe inside overhead or use a total cost input base; adjust the rates to match your disclosed accounting practices.",
    faq: [["What is a typical wrap rate?", "Often 1.8–2.5 for government services contractors, depending on overhead and fringe."], ["What's the difference between wrap rate and bill rate?", "The wrap rate is the multiplier; the bill rate is the direct labor rate times that multiplier."]],
  }),
  mk({
    slug: "weighted-guidelines-calculator", title: "Weighted Guidelines Calculator (DFARS Profit)",
    desc: "Estimate a DoD prenegotiation profit objective with the DFARS 215.404-71 weighted guidelines — performance risk, contract type risk, working capital and facilities.",
    inputs: [cur("totalCostsExcludingFacilities", "Total Costs (excluding facilities capital cost of money)", 1000000, 1000000000, 1000), pct("technicalRiskValue", "Technical Risk Value (normal 4%, 2–6%; up to 10% with incentive)", 4, 10, 0.25), pct("managementRiskValue", "Management / Cost Control Value (normal 4%, 2–6%)", 4, 6, 0.25), pct("technicalWeightPercent", "Technical Weight (management gets the rest)", 60, 100, 5), dropdown("contractType", "Contract Type", E.CONTRACT_TYPE_RISK.map(([l], i) => [l, i] as [string, number]), 0), pct("contractTypeValue", "Contract Type Risk Value (0 = normal)", 0, 6, 0.25), pct("workingCapitalPercent", "Working Capital Adjustment (fixed-price, % of cost)", 0, 4, 0.1), cur("facilitiesCapitalEmployed", "Equipment Facilities Capital Employed", 0, 1000000000, 1000), cur("landAndBuildings", "Buildings Facilities Capital Employed", 0, 1000000000, 1000)],
    results: [["profitObjective", "Profit Objective", "c"], ["profitRatePercent", "Profit Rate on Cost", "p"], ["performanceRiskProfit", "Performance Risk Profit", "c"], ["contractTypeRiskProfit", "Contract Type Risk Profit", "c"], ["facilitiesProfit", "Facilities Capital Profit", "c"], ["totalPrice", "Total Price", "c"]],
    fn: E.weightedGuidelines, ex: { totalCostsExcludingFacilities: 1000000, technicalRiskValue: 4, managementRiskValue: 4, technicalWeightPercent: 60, contractType: 0, contractTypeValue: 0, workingCapitalPercent: 0, facilitiesCapitalEmployed: 0, landAndBuildings: 0 },
    exText: (o) => `Example: ${usd(1000000)} of cost with normal 4% performance risk on an FFP contract with no financing gives a profit objective of ${usd(o.profitObjective)} (${o.profitRatePercent}%).`,
    how: "Enter total allowable costs, then assign values within the DFARS ranges for technical and management risk and contract type risk. Add facilities capital employed from DD Form 1861 if applicable.",
    assume: "DFARS 215.404-71: performance risk = cost × weighted technical/management values (normal 4%, range 2–6%, technology incentive up to 10%); contract type risk ranges by type (FFP no financing 4–6%, progress payments 2–4%, CPIF 0–2%, CPFF 0–1%); facilities capital employed: equipment 17.5% normal and buildings 10% (simplified). Working capital adjustment applies to fixed-price contracts with financing.",
    faq: [["What is the weighted guidelines method?", "The DoD structured approach (DD Form 1547) for setting a profit objective based on risk, contract type and capital employed."], ["What is a typical DoD profit rate?", "Often 8–12% of cost on fixed-price contracts and lower on cost-type contracts."]],
  }),
];

// --- State vehicle registration ----------------------------------------------------------------------
const FUEL = dropdown("fuelType", "Fuel Type", [["Gas / diesel", 0], ["Hybrid", 1], ["Electric", 2]], 0);
const REG_RESULTS: Line[] = [["totalRegistrationCost", "Estimated Registration Cost", "c"], ["registrationFee", "Registration Fee", "c"], ["valueBasedTax", "Value / Age-Based Tax or Fee", "c"], ["weightFee", "Weight Fee", "c"], ["otherFees", "Other / Local Fees", "c"], ["monthlyEquivalent", "Per Month", "c"]];
const LOCAL_DEF: Record<string, number> = { California: 20, Arizona: 32, Colorado: 75, "New York": 30, Indiana: 25, Nebraska: 20, Montana: 12, Nevada: 8 };
TOOLS.push(
  ...E.REG_STATES.map((s) => {
    const inputs: Record<string, unknown>[] = [];
    if (s.inputs.includes("value")) inputs.push(cur("vehicleValue", s.valueLabel, s.defaults.value, 1000000, 500));
    if (s.inputs.includes("age")) inputs.push(num("vehicleAge", "Vehicle Age (years since model year; 0 = new)", s.defaults.age, 40));
    if (s.inputs.includes("weight")) inputs.push(num("vehicleWeight", "Vehicle Weight (lb)", s.defaults.weight, 20000, 50));
    if (s.inputs.includes("mpg")) inputs.push(num("mpg", "Combined MPG Rating", 25, 150));
    if (s.inputs.includes("fuel")) inputs.push(FUEL);
    if (s.inputs.includes("mill")) inputs.push(num("millageRate", "Local Mill Levy (mills)", s.name === "Kansas" ? 130 : 45, 400, 0.5));
    if (s.name === "Arkansas") inputs.push(yn("includePropertyTax", "Include Personal Property Tax?", 1));
    if (s.inputs.includes("purchase")) inputs.push(yn("isPurchase", "Just Bought the Vehicle (include one-time tax)?", 1));
    if (s.name === "Delaware") inputs.push(pct("docFeePercent", "Document Fee Rate", 4.25, 10, 0.05));
    if (s.name === "New York") inputs.push(yn("mctdCounty", "Live in the MCTD (NYC & nearby counties)?", 1));
    if (s.name === "Florida") inputs.push(yn("newToFlorida", "First Florida Registration (no plate to transfer)?"));
    if (s.inputs.includes("local")) inputs.push(cur("localFees", "County / Local Fees", LOCAL_DEF[s.name] ?? 0, 5000, 1));
    inputs.push(cur("registrationFeeOverride", "Registration Fee From Your Notice (0 = estimate)", 0, 5000, 1));
    const ex: Record<string, number> = { vehicleValue: s.defaults.value, vehicleAge: s.defaults.age, vehicleWeight: s.defaults.weight, mpg: 25, fuelType: 0, millageRate: s.name === "Kansas" ? 130 : 45, includePropertyTax: 1, isPurchase: 0, docFeePercent: 4.25, mctdCounty: 1, newToFlorida: 0, localFees: LOCAL_DEF[s.name] ?? 0, registrationFeeOverride: 0 };
    const two = s.name === "New York" || s.name === "Oregon";
    const parts = [s.inputs.includes("value") ? `a ${usd(s.defaults.value)} vehicle` : "a typical passenger car", s.inputs.includes("age") ? `${s.defaults.age} years old` : "", s.inputs.includes("weight") ? `${s.defaults.weight.toLocaleString()} lb` : ""].filter(Boolean).join(", ");
    return mk({
      slug: s.slug, title: `${s.name} Vehicle Registration Fee Calculator`,
      desc: `Estimate ${s.name} car registration fees for 2026 — ${s.inputs.includes("value") ? "value- and age-based taxes, " : ""}${s.inputs.includes("weight") ? "weight fees, " : ""}the registration fee and local fees.`,
      meta: `${s.name} Car Registration Fee Calculator 2026`,
      inputs, results: REG_RESULTS, fn: E.stateRegistration(s), ex,
      exText: (o) => `Example: ${parts} — about ${usd(o.totalRegistrationCost)} ${two ? "for a two-year registration" : "a year"}${o.valueBasedTax ? `, including ${usd(o.valueBasedTax)} of value- or age-based tax` : ""}${s.inputs.includes("purchase") ? `, plus the one-time ${s.name === "Georgia" ? "7% TAVT" : "document fee"} (${usd(r(E.stateRegistration(s), { ...ex, isPurchase: 1 }).valueBasedTax)}) in the year you buy` : ""}.`,
      how: `Enter your vehicle's details${s.inputs.includes("value") ? ` (${s.valueLabel})` : ""}. If you have your renewal notice, enter its registration fee to replace the estimate.`,
      assume: `${s.rule}${s.estimated ? " Some fixed amounts are typical figures, not official — your renewal notice or the state's fee estimator is authoritative." : ""}`,
      faq: [[`How much is car registration in ${s.name}?`, `For a typical car it's about ${usd(r(E.stateRegistration(s), ex).totalRegistrationCost)} ${two ? "every two years" : "a year"}, but it depends on ${s.inputs.includes("value") ? "the vehicle's value and age" : s.inputs.includes("weight") ? "the vehicle's weight" : "the vehicle type and age"} and local fees.`], [`Where do I renew my registration in ${s.name}?`, `Online through the state motor vehicle agency, by mail, or at a local office or county tag agency.`]],
    });
  }),
);

TOOLS.push(
  mk({
    slug: "vehicle-excise-tax-calculator", title: "Vehicle Excise Tax Calculator (Massachusetts)",
    desc: "Calculate the Massachusetts motor vehicle excise tax — $25 per $1,000 of value, using the MSRP and the state's depreciation schedule.",
    inputs: [cur("msrp", "Manufacturer's List Price (MSRP)", 40000, 1000000, 500), dropdown("yearIndex", "Vehicle Year (relative to the tax year)", [["Year before model year (50%)", 0], ["Model year (90%)", 1], ["Second year (60%)", 2], ["Third year (40%)", 3], ["Fourth year (25%)", 4], ["Fifth year and older (10%)", 5]], 2), num("monthsRegistered", "Months Registered This Year", 12, 12, 1, 1)],
    results: [["exciseTax", "Excise Tax", "c"], ["assessedValue", "Excise Value", "c"], ["percentOfMsrp", "Percent of MSRP", "p"]],
    fn: E.massExcise, ex: { msrp: 40000, yearIndex: 2, monthsRegistered: 12 },
    exText: (o) => `Example: a ${usd(40000)} MSRP car in its second year is valued at ${usd(o.assessedValue)} — an excise bill of ${usd(o.exciseTax)}.`,
    how: "Enter the MSRP (not what you paid) and where the vehicle is in the schedule for the calendar year being billed.",
    assume: "M.G.L. c.60A §1: $25 per $1,000 of value; value = MSRP × 50% (year before the model year), 90% (model year), 60%, 40%, 25%, then 10%. Prorated by month for vehicles registered part of the year; minimum $5. Other states with vehicle excise taxes use different formulas.",
    faq: [["How is Massachusetts excise tax calculated?", "$25 per $1,000 of the vehicle's value, where value is a percentage of MSRP based on age."], ["Do I pay excise tax if I sell my car?", "You can get an abatement for the months after you cancel the registration."]],
  }),
  mk({
    slug: "maine-vehicle-excise-tax-calculator", title: "Maine Vehicle Excise Tax Calculator",
    desc: "Calculate the Maine vehicle excise tax paid to your town at registration — MSRP × the mill rate for the vehicle's year (24 mills new down to 4 mills).",
    inputs: [cur("msrp", "MSRP (Manufacturer's Suggested Retail Price)", 40000, 1000000, 500), dropdown("yearIndex", "Vehicle Year", [["Year 1 — current model year (24 mills)", 0], ["Year 2 (17.5 mills)", 1], ["Year 3 (13.5 mills)", 2], ["Year 4 (10 mills)", 3], ["Year 5 (6.5 mills)", 4], ["Year 6 and older (4 mills)", 5]], 2)],
    results: [["exciseTax", "Excise Tax", "c"], ["totalWithRegistration", "Total With $35 Registration", "c"], ["millRate", "Mill Rate", "n"]],
    fn: E.maineExcise, ex: { msrp: 40000, yearIndex: 2 },
    exText: (o) => `Example: a ${usd(40000)} MSRP vehicle in its third year owes ${usd(o.exciseTax)} of excise tax — ${usd(o.totalWithRegistration)} with the state registration fee.`,
    how: "Use the MSRP for the vehicle when new (not the price you paid) and choose its year.",
    assume: "36 M.R.S. §1482: MSRP × 0.024 (year 1), 0.0175, 0.0135, 0.010, 0.0065, then 0.004; minimum $5. Paid to the municipality before the $35 state registration fee.",
    faq: [["Why is Maine excise tax so high?", "It's based on the original MSRP and replaces property tax on vehicles, so newer and more expensive vehicles pay the most."], ["Does Maine excise tax go down each year?", "Yes — the mill rate falls each year until year 6."]],
  }),
  mk({
    slug: "dc-vehicle-excise-tax-calculator", title: "DC Vehicle Excise Tax Calculator",
    desc: "Estimate the Washington, DC excise (titling) tax on a vehicle purchase, plus registration and title fees, by vehicle weight class.",
    inputs: [cur("fairMarketValue", "Fair Market Value / Purchase Price", 35000, 1000000, 500), dropdown("weightClass", "Weight Class", [["Under 3,500 lb (6%)", 0], ["3,500–4,999 lb (7%)", 1], ["5,000 lb and over (8%)", 2]], 1), pct("rateOverride", "Excise Rate Override (0 = by weight)", 0, 10, 0.25)],
    results: [["totalDue", "Total Due at Titling", "c"], ["exciseTax", "Excise Tax", "c"], ["ratePercent", "Excise Rate", "p"], ["estimatedRegistration", "Estimated Registration", "c"]],
    fn: E.dcExcise, ex: { fairMarketValue: 35000, weightClass: 1, rateOverride: 0 },
    exText: (o) => `Example: a ${usd(35000)} vehicle weighing 3,500–4,999 lb owes ${usd(o.exciseTax)} of excise tax — about ${usd(o.totalDue)} with registration and the $26 title fee.`,
    how: "Enter the purchase price or NADA fair market value and the vehicle's weight class.",
    assume: "DC charges a one-time excise tax when a vehicle is titled, by weight class (6%, 7%, 8%); DC DMV also applies fuel-economy-based rates and exemptions for some vehicles, so use the override if your vehicle's rate differs. Registration is by weight ($72 / $115 / $155 estimated); title $26.",
    faq: [["What is the DC vehicle excise tax?", "A one-time titling tax of 6–8% of the vehicle's value, based on weight class."], ["Do I pay DC excise tax when moving to DC?", "Yes, unless you titled the vehicle in another state and owned it there — check DC DMV for exemptions."]],
  }),
  mk({
    slug: "tax-title-license-calculator", title: "Tax, Title & License Calculator",
    desc: "Estimate TTL — the sales tax, title, registration and dealer fees you'll pay when you buy a car — and your out-the-door price.",
    meta: "Tax Title and License Calculator — Car TTL Fees",
    inputs: [cur("purchasePrice", "Vehicle Price", 30000, 1000000, 100), cur("tradeInValue", "Trade-In Value", 5000, 1000000, 100), yn("tradeInReducesTax", "Trade-In Reduces Taxable Price (most states)?", 1), cur("rebates", "Rebates / Incentives", 0, 100000, 100), pct("salesTaxPercent", "Sales Tax Rate (state + local)", 6.25, 15, 0.05), cur("titleFee", "Title Fee", 33, 1000, 1), cur("registrationFee", "Registration / Plate Fee", 75, 5000, 1), cur("docFee", "Dealer Documentation Fee", 150, 5000, 5), cur("plateFee", "Other Fees (inspection, tire, etc.)", 0, 5000, 1)],
    results: [["totalTaxTitleLicense", "Total Tax, Title & License", "c"], ["salesTax", "Sales Tax", "c"], ["fees", "Title, Registration & Fees", "c"], ["outTheDoorPrice", "Out-the-Door Price", "c"], ["taxableAmount", "Taxable Amount", "c"]],
    fn: E.ttl, ex: { purchasePrice: 30000, tradeInValue: 5000, tradeInReducesTax: 1, rebates: 0, salesTaxPercent: 6.25, titleFee: 33, registrationFee: 75, docFee: 150, plateFee: 0 },
    exText: (o) => `Example: a ${usd(30000)} car with a ${usd(5000)} trade-in at 6.25% tax owes ${usd(o.salesTax)} of sales tax and ${usd(o.fees)} in fees — TTL of ${usd(o.totalTaxTitleLicense)}.`,
    how: "Enter the price, trade-in and your state and local sales tax rate. Check your state's title and registration fees (or use the state registration calculators in this category).",
    assume: "Most states tax the price after trade-in; California, Hawaii, Kentucky, Maryland, Michigan (partially), Montana and Virginia limit or don't allow the trade-in credit. Some states tax rebates. Dealer doc fees are capped in some states (for example California $85–$100, New York $175).",
    faq: [["What does TTL mean on a car?", "Tax, title and license — the sales tax, title fee and registration fees added to a vehicle's price."], ["How much is TTL usually?", "Typically 7–10% of the vehicle's price, mostly sales tax."]],
  }),
  mk({
    slug: "oklahoma-tax-title-license-calculator", title: "Oklahoma Tax, Title & License Calculator",
    desc: "Calculate Oklahoma vehicle excise tax (3.25%, or $20 + 3.25% over $1,500 for used), the 1.25% sales tax, tag fee and title fees.",
    inputs: [cur("purchasePrice", "Purchase Price", 30000, 1000000, 100), yn("usedVehicle", "Used Vehicle?"), num("vehicleAge", "Vehicle Age (years)", 0, 40), cur("otherFees", "Other Fees (lien, mail, tag agent)", 10, 500, 1)],
    results: [["totalTaxTitleLicense", "Total Tax, Title & License", "c"], ["exciseTax", "Excise Tax", "c"], ["salesTax", "Sales Tax (1.25%)", "c"], ["registration", "Tag / Registration", "c"], ["titleAndOtherFees", "Title & Other Fees", "c"]],
    fn: E.oklahomaTtl, ex: { purchasePrice: 30000, usedVehicle: 0, vehicleAge: 0, otherFees: 10 },
    exText: (o) => `Example: a new ${usd(30000)} vehicle owes ${usd(o.exciseTax)} excise + ${usd(o.salesTax)} sales tax + ${usd(o.registration)} tag — ${usd(o.totalTaxTitleLicense)} with fees.`,
    how: "Enter the purchase price and whether the vehicle is new or used.",
    assume: "68 O.S. §2103: excise 3.25% of the price on new vehicles; used vehicles $20 on the first $1,500 plus 3.25% of the rest; plus 1.25% sales tax on vehicle sales. Tag $96 for years 1–4 and $86 for years 5–8; title $11 and $2 other state fees; tag agent fees vary.",
    faq: [["What is the Oklahoma excise tax on a car?", "3.25% of the purchase price for new vehicles; $20 on the first $1,500 plus 3.25% of the rest for used."], ["Does Oklahoma charge sales tax on cars?", "Yes, 1.25% on top of the excise tax."]],
  }),
  mk({
    slug: "washington-tax-and-licensing-calculator", title: "Washington Tax and Licensing Calculator",
    desc: "Estimate Washington State vehicle tax and licensing — sales or use tax, the Sound Transit RTA excise tax, weight fees, EV fees and registration.",
    inputs: [cur("purchasePrice", "Purchase Price", 35000, 1000000, 100), pct("salesTaxPercent", "Local Sales Tax Rate", 10.35, 12, 0.05), yn("soundTransitArea", "Live in the Sound Transit (RTA) District?", 1), cur("msrp", "MSRP (for RTA tax)", 38000, 1000000, 500), num("vehicleAge", "Vehicle Age (years)", 0, 30), num("vehicleWeight", "Vehicle Weight (lb)", 4000, 20000, 50), dropdown("fuelType", "Fuel Type", [["Gas / diesel", 0], ["Hybrid", 1], ["Electric", 2]], 0), cur("localFees", "Transportation Benefit District / Local Fees", 20, 500, 1)],
    results: [["totalTaxAndLicensing", "Total Tax & Licensing", "c"], ["salesUseTax", "Sales / Use Tax", "c"], ["rtaExciseTax", "RTA Motor Vehicle Excise Tax", "c"], ["registrationAndWeightFees", "Registration, Weight & Other Fees", "c"]],
    fn: E.waTaxLicensing, ex: { purchasePrice: 35000, salesTaxPercent: 10.35, soundTransitArea: 1, msrp: 38000, vehicleAge: 0, vehicleWeight: 4000, fuelType: 0, localFees: 20 },
    exText: (o) => `Example: a new ${usd(35000)} car in Seattle owes ${usd(o.salesUseTax)} of sales tax, ${usd(o.rtaExciseTax)} of RTA excise tax and ${usd(o.registrationAndWeightFees)} of licensing fees.`,
    how: "Enter the price, your local sales tax rate (the dealer's location for dealer sales, your address for private sales) and the vehicle details.",
    assume: "Washington sales/use tax on vehicles is the local rate plus 0.3% motor vehicle sales tax. Sound Transit RTA excise is 1.1% of the depreciated MSRP (Sound Transit's schedule) each year in the district. Licensing: about $30 basic fee, $25–$65+ weight fee, $150 EV fee + $75 transportation electrification fee ($75 for hybrids), filing and service fees.",
    faq: [["What is the RTA tax in Washington?", "A Sound Transit motor vehicle excise tax of 1.1% of the vehicle's depreciated value, charged in King, Pierce and Snohomish County RTA areas."], ["How much is the EV fee in Washington?", "$150 plus a $75 transportation electrification fee each year."]],
  }),
  mk({
    slug: "title-transfer-calculator", title: "Title Transfer Calculator",
    desc: "Estimate the cost to transfer a vehicle title — title fee, sales or use tax, registration transfer, notary and lien fees.",
    inputs: [cur("salePrice", "Sale Price", 12000, 1000000, 100), yn("salesTaxApplies", "Sales / Use Tax Applies (not a gift or family transfer)?", 1), pct("salesTaxPercent", "Sales / Transfer Tax Rate", 6, 15, 0.05), cur("titleFee", "Title Fee (e.g. CA $28, TX $33, FL $75.25, NY $50, PA $67, IL $165)", 30, 500, 0.25), cur("registrationTransferFee", "Registration / Plate Transfer Fee", 15, 500, 1), cur("notaryFee", "Notary Fee", 10, 100, 1), cur("lienFee", "Lien Recording Fee", 0, 200, 1)],
    results: [["totalTransferCost", "Total Title Transfer Cost", "c"], ["salesTaxOrTransferTax", "Sales / Use Tax", "c"], ["fees", "Title & Other Fees", "c"]],
    fn: E.titleTransfer, ex: { salePrice: 12000, salesTaxApplies: 1, salesTaxPercent: 6, titleFee: 30, registrationTransferFee: 15, notaryFee: 10, lienFee: 0 },
    exText: (o) => `Example: a private sale for ${usd(12000)} at 6% tax plus a $30 title fee and $25 of other fees costs ${usd(o.totalTransferCost)} to transfer.`,
    how: "Enter the sale price and your state's title fee and tax rate. Gifts between family members are often exempt from sales tax.",
    assume: "Most states charge sales or use tax on private sales (some on book value if the price is unusually low) plus a title fee. Transfers between spouses, parents and children are often tax-exempt.",
    faq: [["How much does it cost to transfer a car title?", "Usually $15–$100 for the title fee, plus sales tax on the price unless the transfer is exempt."], ["Do I pay sales tax on a gifted car?", "Often not for transfers between close family members, but rules vary by state."]],
  }),
  mk({
    slug: "irp-fee-calculator", title: "IRP Fee Calculator",
    desc: "Estimate International Registration Plan apportioned registration fees for a commercial truck — each jurisdiction's full fee × its share of your fleet miles.",
    inputs: [...[1, 2, 3, 4, 5].flatMap((i) => [num(`miles${i}`, `Jurisdiction ${i}${i === 1 ? " (base)" : ""} — Miles`, [60000, 25000, 15000, 0, 0][i - 1], 1000000, 100), cur(`fullFee${i}`, `Jurisdiction ${i} — Full-Year Fee for Your Weight`, [1800, 1500, 2100, 0, 0][i - 1], 50000, 10)]), num("trucks", "Number of Trucks", 1, 1000, 1, 1), cur("adminFee", "Base State Admin / Plate Fees", 50, 5000, 1)],
    results: [["apportionedFeePerTruck", "Apportioned Fee per Truck", "c"], ["fleetTotal", "Fleet Total", "c"], ["baseJurisdictionPercent", "Base Jurisdiction Share of Miles", "p"], ["totalMiles", "Total Fleet Miles", "n"]],
    fn: E.irpFee, ex: { miles1: 60000, fullFee1: 1800, miles2: 25000, fullFee2: 1500, miles3: 15000, fullFee3: 2100, miles4: 0, fullFee4: 0, miles5: 0, fullFee5: 0, trucks: 1, adminFee: 50 },
    exText: (o) => `Example: 100,000 miles split 60/25/15 across three states with full fees of $1,800, $1,500 and $2,100 gives an apportioned fee of about ${usd(o.apportionedFeePerTruck)} per truck.`,
    how: "Enter the distance traveled in each IRP jurisdiction during the reporting period and each jurisdiction's full annual fee for your registered weight (from your base state's IRP fee schedule).",
    assume: "IRP Articles: each member jurisdiction's fee is apportioned by its percentage of total fleet distance in the reporting period; jurisdictions where you haven't traveled can be added at estimated distance. Base state admin fees, plates and Canadian provinces' currency conversions vary.",
    faq: [["What is IRP?", "The International Registration Plan lets interstate commercial vehicles register in one base state and pay fees apportioned to every state and province they drive in."], ["Who needs IRP plates?", "Vehicles over 26,000 lb or with 3+ axles that travel in two or more jurisdictions."]],
  }),
  mk({
    slug: "spartanburg-county-vehicle-tax-calculator", title: "Spartanburg County Vehicle Tax Calculator",
    desc: "Estimate South Carolina vehicle property tax in Spartanburg County — 6% assessment of the vehicle's value × your district's millage, plus road fees.",
    inputs: [cur("assessedMarketValue", "Vehicle Value (SCDOR schedule)", 25000, 1000000, 100), num("millageRate", "Millage for Your Tax District", 330, 800, 0.5), cur("roadFee", "Road Maintenance & Other Fees", 25, 500, 1)],
    results: [["annualVehicleTax", "Annual Vehicle Tax", "c"], ["propertyTax", "Property Tax", "c"], ["assessedValue", "Assessed Value (6%)", "c"], ["roadAndOtherFees", "Road & Other Fees", "c"]],
    fn: E.scVehicleTax, ex: { assessedMarketValue: 25000, millageRate: 330, roadFee: 25 },
    exText: (o) => `Example: a vehicle valued at ${usd(25000)} is assessed at ${usd(o.assessedValue)}; at 330 mills the tax is ${usd(o.propertyTax)} — about ${usd(o.annualVehicleTax)} with fees.`,
    how: "Use the value from your tax notice (SCDOR's depreciated value) and the millage for your city or fire district (on the Spartanburg County auditor's site).",
    assume: "S.C. Code §12-43-220: personal vehicles are assessed at 6% of value; tax = assessed value × millage ÷ 1,000. Millage differs by city, school and fire district. You must pay the tax before renewing your registration with SCDMV.",
    faq: [["How is car tax calculated in South Carolina?", "Vehicle value × 6% assessment ratio × your local millage."], ["Why is my SC car tax so high?", "Local millage is high in some districts, and newer vehicles have higher values."]],
  }),
  mk({
    slug: "california-boat-registration-fee-calculator", title: "California Boat Registration Fee Calculator",
    desc: "Estimate California vessel registration costs — the DMV registration fee and the Quagga and Zebra Mussel Fee for boats used in fresh water.",
    inputs: [cur("boatValue", "Boat Value", 25000, 5000000, 500), yn("originalRegistration", "Original (first) Registration?"), yn("freshwaterUse", "Used in Fresh Water (Quagga & Zebra Mussel Fee)?", 1)],
    results: [["totalRegistrationCost", "Total for the 2-Year Registration", "c"], ["registrationFee", "Registration Fee", "c"], ["otherFees", "Mussel Fee & Other", "c"], ["perYear", "Per Year", "c"]],
    fn: E.boatRegistration("CA"), ex: { boatValue: 25000, originalRegistration: 0, freshwaterUse: 1 },
    exText: (o) => `Example: renewing a powerboat used on lakes costs about ${usd(o.totalRegistrationCost)} for two years.`,
    how: "Choose whether this is an original registration or a renewal and whether the boat goes in fresh water.",
    assume: "California vessels are registered with DMV for 2 years (odd-year renewals); the fee shown is an estimate — check DMV's vessel fee schedule. The Quagga and Zebra Mussel Fee applies to vessels used in fresh water. County unsecured property tax on boats is billed separately by the assessor.",
    faq: [["How much does it cost to register a boat in California?", "Typically $40–$80 every two years plus the mussel fee for freshwater boats."], ["Do I need to register a kayak in California?", "No — non-motorized boats like kayaks and canoes are exempt; motorized vessels and sailboats over 8 feet must be registered."]],
  }),
  mk({
    slug: "washington-boat-registration-fee-calculator", title: "Washington Boat Registration Fee Calculator",
    desc: "Estimate Washington boat registration — the annual registration fee, the 0.5% watercraft excise tax on value, and other fees.",
    inputs: [cur("boatValue", "Boat Value", 25000, 5000000, 500), yn("originalRegistration", "First Registration in Washington (title & filing fees)?")],
    results: [["totalRegistrationCost", "Total First-Year Cost", "c"], ["valueTax", "Watercraft Excise Tax (0.5%)", "c"], ["registrationFee", "Registration Fee", "c"], ["otherFees", "Other Fees", "c"], ["perYear", "Annual Renewal Estimate", "c"]],
    fn: E.boatRegistration("WA"), ex: { boatValue: 25000, originalRegistration: 0 },
    exText: (o) => `Example: a ${usd(25000)} boat owes ${usd(o.valueTax)} of watercraft excise tax plus registration — about ${usd(o.totalRegistrationCost)} a year.`,
    how: "Enter the boat's current value (the Department of Licensing uses a depreciation schedule from the purchase price).",
    assume: "RCW 82.49: watercraft excise tax 0.5% of fair market value each year (minimum $5), plus the registration fee (about $30.50), derelict vessel and invasive species fees; first-time registration adds title and filing fees. Sales or use tax applies when you buy the boat.",
    faq: [["How much is the boat excise tax in Washington?", "0.5% of the boat's value each year."], ["Do I need to register my boat in Washington?", "Yes for most motorized boats and sailboats over 16 feet."]],
  }),
);

// --- Permits, records, safety, taxes --------------------------------------------------------------
TOOLS.push(
  mk({
    slug: "passport-fee-calculator", title: "Passport Fee Calculator",
    desc: "Add up US passport fees — the application fee for a book, card or both, the $35 acceptance fee, expedited service and 1–2 day delivery — for one person or a family.",
    meta: "Passport Fee Calculator 2026 — US Passport Costs",
    inputs: [dropdown("applicationType", "Application", [["First adult passport / in person (DS-11)", 0], ["Adult renewal by mail or online (DS-82)", 1], ["Child under 16 (DS-11)", 2]], 0), dropdown("product", "Product", [["Passport book", 0], ["Passport card", 1], ["Book + card", 2]], 0), yn("expedite", "Expedited Service (+$60)?"), yn("oneTwoDayDelivery", "1–2 Day Return Delivery (+$22.05)?"), num("applicants", "Number of People", 1, 20, 1, 1), cur("photoCost", "Passport Photo Cost", 15, 100, 1)],
    results: [["totalCost", "Total Cost", "c"], ["feePerPerson", "Per Person", "c"], ["applicationFee", "Application Fee", "c"], ["executionFee", "Acceptance (Execution) Fee", "c"], ["expediteFee", "Expedite Fee", "c"]],
    fn: E.passportFee, ex: { applicationType: 0, product: 0, expedite: 0, oneTwoDayDelivery: 0, applicants: 1, photoCost: 15 },
    exText: (o) => `Example: a first adult passport book costs ${usd(o.applicationFee)} + ${usd(o.executionFee)} acceptance fee + a $15 photo = ${usd(o.totalCost)}.`,
    how: "Choose the application type and product for each person. Renewals by mail or online don't pay the acceptance fee.",
    assume: "Department of State fees: adult book $130, card $30, book + card $160; under-16 book $100, card $15; $35 execution fee at an acceptance facility; expedite $60; 1–2 day delivery $22.05. The application fee is paid to the Department of State and the execution fee to the facility.",
    faq: [["How much does a US passport cost in 2026?", "$165 for a first adult passport book ($130 + $35 acceptance fee); $130 to renew by mail or online."], ["How much is a passport for a child?", "$135 for a passport book for a child under 16 ($100 + $35)."]],
  }),
  mk({
    slug: "florida-recording-fee-transfer-tax-calculator", title: "Florida Recording Fee & Transfer Tax Calculator",
    desc: "Calculate Florida documentary stamp tax on deeds and mortgages, intangible tax and county recording fees for a home purchase or refinance.",
    inputs: [cur("salePrice", "Sale Price (deed consideration)", 400000, 100000000, 1000), cur("mortgageAmount", "Mortgage Amount", 320000, 100000000, 1000), yn("miamiDade", "Property in Miami-Dade County?"), yn("singleFamily", "Single-Family Home?", 1), num("deedPages", "Deed Pages", 3, 100), num("mortgagePages", "Mortgage Pages", 15, 200)],
    results: [["totalGovernmentFees", "Total Taxes & Recording Fees", "c"], ["deedDocStamps", "Deed Documentary Stamp Tax", "c"], ["mortgageDocStamps", "Mortgage Documentary Stamp Tax", "c"], ["intangibleTax", "Intangible Tax (0.2%)", "c"], ["recordingFees", "Recording Fees", "c"]],
    fn: E.floridaRecording, ex: { salePrice: 400000, mortgageAmount: 320000, miamiDade: 0, singleFamily: 1, deedPages: 3, mortgagePages: 15 },
    exText: (o) => `Example: a ${usd(400000)} purchase with a ${usd(320000)} mortgage owes ${usd(o.deedDocStamps)} in deed stamps, ${usd(o.mortgageDocStamps)} in mortgage stamps and ${usd(o.intangibleTax)} intangible tax — ${usd(o.totalGovernmentFees)} with recording.`,
    how: "Enter the price and loan amount. In Florida the seller customarily pays deed stamps and the buyer pays mortgage stamps and intangible tax (negotiable).",
    assume: "F.S. 201.02: $0.70 per $100 (or fraction) of consideration on deeds ($0.60 in Miami-Dade, plus $0.45 surtax on property other than single-family homes); F.S. 201.08: $0.35 per $100 on mortgages and notes; F.S. 199.133: 0.2% non-recurring intangible tax on mortgages; F.S. 28.24: recording $10 for the first page and $8.50 for each additional page.",
    faq: [["How much are doc stamps in Florida?", "$0.70 per $100 of the sale price on the deed ($0.60 in Miami-Dade) and $0.35 per $100 on the mortgage."], ["Who pays doc stamps in Florida?", "By custom, sellers pay deed stamps and buyers pay mortgage stamps and intangible tax, though contracts can change this."]],
  }),
  mk({
    slug: "local-law-97-calculator", title: "Local Law 97 Calculator (NYC)",
    desc: "Estimate your NYC Local Law 97 carbon emissions, limit and annual penalty ($268 per ton over) for 2024–2029 or 2030–2034 by occupancy group.",
    meta: "Local Law 97 Calculator — NYC Carbon Penalty Estimate",
    inputs: [num("grossFloorArea", "Gross Floor Area (sq ft)", 100000, 10000000, 100), dropdown("occupancy", "Occupancy Group", E.LL97_LIMITS.map(([l], i) => [l, i] as [string, number]), 11), dropdown("period", "Compliance Period", [["2024–2029", 0], ["2030–2034", 1]], 0), num("electricityKwh", "Annual Electricity (kWh)", 1200000, 1000000000, 1000), num("naturalGasKbtu", "Annual Natural Gas (kBtu)", 6000000, 1000000000, 1000), num("fuelOil2Kbtu", "Annual #2 Fuel Oil (kBtu)", 0, 1000000000, 1000), num("districtSteamKbtu", "Annual District Steam (kBtu)", 0, 1000000000, 1000)],
    results: [["annualPenalty", "Estimated Annual Penalty", "c"], ["buildingEmissions", "Building Emissions (tCO2e)", "n"], ["emissionsLimit", "Emissions Limit (tCO2e)", "n"], ["excessEmissions", "Excess Emissions (tCO2e)", "n"], ["percentOverLimit", "Over / Under Limit", "p"]],
    fn: E.localLaw97, ex: { grossFloorArea: 100000, occupancy: 11, period: 0, electricityKwh: 1200000, naturalGasKbtu: 6000000, fuelOil2Kbtu: 0, districtSteamKbtu: 0 },
    exText: (o) => `Example: a 100,000 sq ft multifamily building using 1.2 million kWh and 6 million kBtu of gas emits ${o.buildingEmissions} tCO2e against a ${o.emissionsLimit} limit for 2024–2029 — ${o.annualPenalty > 0 ? `a penalty of about ${usd(o.annualPenalty)} a year` : "no penalty"}.`,
    how: "Enter gross floor area and annual energy use from your benchmarking report (Energy Star Portfolio Manager). For mixed-use buildings, the limit is a floor-area-weighted blend of each use.",
    assume: "NYC Admin. Code §28-320 and 1 RCNY §103-14: limits per sq ft by occupancy group for 2024–2029 and 2030–2034; coefficients for 2024–2029: electricity 0.000288962 tCO2e/kWh, natural gas 0.00005311 tCO2e/kBtu, #2 oil 0.00007421, steam 0.00004493. Penalty $268 per tCO2e over the limit each year (plus reporting penalties). Article 321 buildings and good-faith-effort pathways differ.",
    faq: [["What is the Local Law 97 penalty?", "$268 per metric ton of CO2e above your building's annual limit."], ["Which buildings does Local Law 97 cover?", "Most NYC buildings over 25,000 sq ft, and multiple buildings on one lot totaling over 50,000 sq ft."]],
  }),
  mk({
    slug: "fire-code-occupancy-calculator", title: "Fire Code Occupancy Calculator",
    desc: "Calculate the maximum occupancy (occupant load) of a room or building from its floor area and use, using IBC / IFC occupant load factors, plus exits needed.",
    meta: "Fire Code Occupancy Calculator — Maximum Room Capacity",
    inputs: [num("floorArea", "Floor Area (sq ft — net or gross as noted)", 2000, 10000000, 10), dropdown("useType", "Use of the Space", E.OCCUPANT_LOADS.map(([l], i) => [l, i] as [string, number]), 2)],
    results: [["maximumOccupancy", "Maximum Occupancy", "n"], ["occupantLoadFactor", "Occupant Load Factor (sq ft per person)", "n"], ["exitsRequired", "Minimum Exits Required", "n"], ["minimumExitWidthInches", "Minimum Total Exit Width (inches)", "n"]],
    fn: E.occupancy, ex: { floorArea: 2000, useType: 2 },
    exText: (o) => `Example: a 2,000 sq ft banquet room with tables and chairs (15 sq ft net per person) holds ${o.maximumOccupancy} people and needs ${o.exitsRequired} exits.`,
    how: "Measure the floor area. 'Net' areas exclude walls, corridors, restrooms and fixed equipment; 'gross' areas include them.",
    assume: "IBC / IFC Table 1004.5 occupant load factors; exits per IBC 1006.3 (2 exits above 49 occupants, 3 above 500, 4 above 1,000); exit width 0.2 inch per occupant (sprinklered buildings may use 0.15). Your fire marshal sets the posted capacity, and state amendments (e.g. North Carolina) may differ.",
    faq: [["How is maximum occupancy calculated?", "Floor area divided by the occupant load factor for the space's use — for example 15 sq ft per person for tables and chairs."], ["What is the occupancy for a 1,000 sq ft room?", "About 142 people standing-room chairs-only (7 sq ft each), 66 at tables, or 6–7 in office use (150 sq ft each)."]],
  }),
  mk({
    slug: "ada-ramp-slope-calculator", title: "ADA Ramp Slope Calculator",
    desc: "Calculate the ADA-compliant ramp length for a given rise — 1:12 maximum slope, 30-inch maximum rise per run and 60-inch landings — and check an existing ramp's slope.",
    inputs: [num("totalRiseInches", "Total Rise (inches)", 24, 300, 0.5), num("availableRunInches", "Actual Ramp Run to Check (inches, 0 = skip)", 0, 10000, 1)],
    results: [["minimumRampRunFeet", "Minimum Ramp Run (feet)", "n"], ["totalLengthWithLandingsFeet", "Total Length With Landings (feet)", "n"], ["rampSegments", "Ramp Segments", "n"], ["landingsRequired", "Landings Required", "n"], ["slopePercent", "Slope", "p"], ["compliant", "Compliant Slope? (1 = yes)", "n"]],
    fn: E.adaRamp, ex: { totalRiseInches: 24, availableRunInches: 0 },
    exText: (o) => `Example: a 24-inch rise needs ${o.minimumRampRunFeet} feet of ramp at 1:12 — ${o.totalLengthWithLandingsFeet} feet with top and bottom landings.`,
    how: "Measure the vertical rise from the lower surface to the upper landing.",
    assume: "2010 ADA Standards §405: maximum running slope 1:12 (8.33%), maximum rise 30 inches per run, level landings at least 60 inches long at the top and bottom of each run, minimum clear width 36 inches, handrails on both sides when the rise exceeds 6 inches.",
    faq: [["What is the ADA ramp slope?", "1:12 — one inch of rise for every 12 inches (1 foot) of ramp."], ["How long does a wheelchair ramp need to be?", "One foot of ramp for every inch of rise, plus 5-foot landings."]],
  }),
  mk({
    slug: "sainte-lague-calculator", title: "Sainte-Laguë Calculator",
    desc: "Allocate seats with the Sainte-Laguë method (or modified Sainte-Laguë and D'Hondt) from party vote totals, with an optional threshold.",
    inputs: [num("seats", "Seats to Allocate", 10, 1000, 1, 1), dropdown("method", "Method", [["Sainte-Laguë (1, 3, 5, 7…)", 0], ["Modified Sainte-Laguë (1.4, 3, 5…)", 1], ["D'Hondt (1, 2, 3, 4…)", 2]], 0), pct("thresholdPercent", "Electoral Threshold", 0, 20, 0.5), ...[1, 2, 3, 4, 5, 6].map((i) => num(`party${i}Votes`, `Party ${i} Votes`, [42000, 31000, 15000, 8000, 4000, 0][i - 1], 1000000000))],
    results: [["party1Seats", "Party 1 Seats", "n"], ["party2Seats", "Party 2 Seats", "n"], ["party3Seats", "Party 3 Seats", "n"], ["party4Seats", "Party 4 Seats", "n"], ["party5Seats", "Party 5 Seats", "n"], ["party6Seats", "Party 6 Seats", "n"], ["totalVotes", "Total Votes", "n"]],
    fn: E.sainteLague, ex: { seats: 10, method: 0, thresholdPercent: 0, party1Votes: 42000, party2Votes: 31000, party3Votes: 15000, party4Votes: 8000, party5Votes: 4000, party6Votes: 0 },
    exText: (o) => `Example: 10 seats with 42,000 / 31,000 / 15,000 / 8,000 / 4,000 votes split ${o.party1Seats} / ${o.party2Seats} / ${o.party3Seats} / ${o.party4Seats} / ${o.party5Seats} under Sainte-Laguë.`,
    how: "Enter the number of seats and each party's votes. Parties below the threshold get no seats.",
    assume: "Highest-averages methods: each seat goes to the party with the highest quotient votes ÷ divisor; Sainte-Laguë divisors 1, 3, 5, 7…; modified Sainte-Laguë starts at 1.4 (Norway, Sweden); D'Hondt uses 1, 2, 3… and favors larger parties. Ties go to the party listed first.",
    faq: [["How does the Sainte-Laguë method work?", "Each party's votes are divided by 1, 3, 5, 7…, and seats go to the highest quotients."], ["Is Sainte-Laguë fairer than D'Hondt?", "It's closer to proportional for small parties; D'Hondt gives larger parties a slight advantage."]],
  }),
  mk({
    slug: "cumulative-voting-calculator", title: "Cumulative Voting Calculator",
    desc: "Calculate how many shares you need to elect directors under cumulative voting — and how many directors your shares can elect.",
    inputs: [num("sharesVoting", "Total Shares Voting", 1000000, 10000000000), num("directorsToElect", "Directors to Be Elected", 7, 100, 1, 1), num("directorsYouWant", "Directors You Want to Elect", 2, 100, 1, 1), num("yourShares", "Your Shares", 300000, 10000000000)],
    results: [["sharesNeededForYourDirectors", "Shares Needed to Elect Your Directors", "n"], ["directorsYouCanElect", "Directors Your Shares Can Elect", "n"], ["percentOfSharesNeeded", "Percent of Shares Needed", "p"], ["yourTotalVotes", "Your Total Votes (shares × seats)", "n"]],
    fn: E.cumulativeVoting, ex: { sharesVoting: 1000000, directorsToElect: 7, directorsYouWant: 2, yourShares: 300000 },
    exText: (o) => `Example: with 1,000,000 shares voting for 7 seats, electing 2 directors takes ${o.sharesNeededForYourDirectors.toLocaleString()} shares (${o.percentOfSharesNeeded}%); 300,000 shares can elect ${o.directorsYouCanElect}.`,
    how: "Enter the total shares that will vote, the number of board seats up for election and your shares.",
    assume: "Shares needed = (shares voting × directors desired) ÷ (seats + 1) + 1. Under cumulative voting each share gets one vote per seat and votes can be concentrated on one candidate. Staggered boards reduce the seats per election.",
    faq: [["How does cumulative voting work?", "Each share gets as many votes as there are seats, and you can put all your votes on one candidate."], ["Which states require cumulative voting?", "A few states allow or require it (for example California for some corporations, and in some states' constitutions); most make it optional."]],
  }),
  mk({
    slug: "fcc-rf-exposure-calculator", title: "FCC RF Exposure Calculator",
    desc: "Check RF exposure against FCC limits (47 CFR 1.1310) for amateur radio and antennas — power density at a distance and the minimum safe distance.",
    inputs: [num("frequencyMhz", "Frequency (MHz)", 146, 100000, 0.1, 0.3), num("powerWatts", "Transmitter Power at Antenna (watts)", 100, 100000, 1), num("antennaGainDbi", "Antenna Gain (dBi)", 6, 40, 0.1, -10), pct("dutyCyclePercent", "Duty Cycle × Time Averaging", 50, 100, 1), num("distanceFeet", "Distance to People (feet)", 10, 10000, 0.5), yn("groundReflection", "Include Ground Reflection (×2.56)?", 1), yn("occupational", "Controlled / Occupational Environment?")],
    results: [["compliant", "Within the Limit? (1 = yes)", "n"], ["minimumSafeDistanceFeet", "Minimum Safe Distance (feet)", "n"], ["powerDensityMwCm2", "Power Density (mW/cm²)", "n"], ["mpeLimitMwCm2", "MPE Limit (mW/cm²)", "n"], ["percentOfLimit", "Percent of Limit", "p"]],
    fn: E.rfExposure, ex: { frequencyMhz: 146, powerWatts: 100, antennaGainDbi: 6, dutyCyclePercent: 50, distanceFeet: 10, groundReflection: 1, occupational: 0 },
    exText: (o) => `Example: 100 W at 146 MHz into a 6 dBi antenna at 50% duty cycle needs ${o.minimumSafeDistanceFeet} feet for the general public (limit ${o.mpeLimitMwCm2} mW/cm²).`,
    how: "Enter the frequency, power at the antenna (after feedline loss), antenna gain, a combined duty-cycle and averaging factor (FM voice about 50%, SSB 20%) and the distance to the nearest person.",
    assume: "47 CFR 1.1310 MPE limits (general population / occupational): 0.3–3 MHz 100; 3–30 MHz 180/f² / 900/f²; 30–300 MHz 0.2 / 1.0; 300–1,500 MHz f/1500 / f/300; 1,500–100,000 MHz 1.0 / 5.0 mW/cm². Far-field estimate per OET Bulletin 65 (S = 2.56 × EIRP ÷ 4πR² with ground reflection); near-field exposure needs modeling. Amateur stations must evaluate under 47 CFR 1.1307(b).",
    faq: [["Do ham radio operators need to do an RF exposure evaluation?", "Yes — since 2021 all amateur stations must evaluate exposure unless they're exempt by low power and distance."], ["What is the FCC RF exposure limit?", "It depends on frequency — 0.2 mW/cm² for the general public at 30–300 MHz, up to 1.0 mW/cm² above 1.5 GHz."]],
  }),
  mk({
    slug: "seattle-sugar-tax-calculator", title: "Seattle Sugar Tax Calculator",
    desc: "Calculate the Seattle sweetened beverage tax — 1.75 cents per ounce — per drink, per week and per year.",
    inputs: [num("ouncesPerUnit", "Ounces per Drink", 12, 200, 0.5), num("unitsPerWeek", "Drinks per Week", 7, 500)],
    results: [["annualTax", "Annual Sweetened Beverage Tax", "c"], ["taxPerUnit", "Tax per Drink", "c"], ["weeklyTax", "Weekly Tax", "c"], ["twoLiterBottleTax", "Tax on a 2-Liter Bottle", "c"]],
    fn: E.sugarTax, ex: { ouncesPerUnit: 12, unitsPerWeek: 7 },
    exText: (o) => `Example: one 12-ounce can a day carries ${usd(o.taxPerUnit)} of tax each — ${usd(o.annualTax)} a year.`,
    how: "Enter the size of the drink and how many you buy each week.",
    assume: "Seattle Municipal Code 5.53: 1.75¢ per fluid ounce on sweetened beverages distributed in Seattle (since January 2018), paid by distributors and typically passed through in prices. Diet drinks, 100% juice, milk-based drinks and baby formula are exempt.",
    faq: [["How much is the Seattle soda tax?", "1.75 cents per ounce — 21 cents on a 12-ounce can and about $1.18 on a 2-liter bottle."], ["Does the Seattle sugar tax apply to diet soda?", "No, only beverages with added caloric sweeteners."]],
  }),
  mk({
    slug: "futa-calculator", title: "FUTA Calculator",
    desc: "Calculate federal unemployment (FUTA) tax — 6.0% on the first $7,000 per employee less the 5.4% state credit (0.6% net), with credit reduction states.",
    meta: "FUTA Tax Calculator 2026 — Federal Unemployment Tax",
    inputs: [num("employees", "Number of Employees", 10, 1000000), cur("wagesPerEmployee", "FUTA Wages per Employee (max $7,000)", 7000, 7000, 100), yn("paidStateUnemployment", "Paid State Unemployment Tax on Time?", 1), pct("creditReductionPercent", "Credit Reduction (e.g. California 1.2%)", 0, 5.4, 0.3)],
    results: [["annualFutaTax", "Annual FUTA Tax", "c"], ["perEmployee", "FUTA per Employee", "c"], ["effectiveRatePercent", "Effective FUTA Rate", "p"], ["quarterlyDepositRequired", "Quarterly Deposits Required? (1 = yes, over $500)", "n"]],
    fn: E.futa, ex: { employees: 10, wagesPerEmployee: 7000, paidStateUnemployment: 1, creditReductionPercent: 0 },
    exText: (o) => `Example: 10 employees each earning at least $7,000 cost ${usd(o.annualFutaTax)} in FUTA tax (${usd(o.perEmployee)} each) at the standard 0.6% net rate.`,
    how: "Enter the number of employees and wages subject to FUTA (the first $7,000 per employee). Add any credit reduction for your state from the Department of Labor's November list.",
    assume: "IRC §3301: 6.0% on the first $7,000 of each employee's wages; employers that pay state unemployment tax on time get up to a 5.4% credit, leaving 0.6% ($42 per employee). States with outstanding federal loans have their credit reduced (California 1.2% and the U.S. Virgin Islands 4.5% for 2025). Deposit quarterly once the liability exceeds $500.",
    faq: [["What is the FUTA rate for 2026?", "6.0% on the first $7,000 of wages, usually 0.6% after the state credit — $42 per employee."], ["Who pays FUTA tax?", "Employers only — it's never withheld from employee pay."]],
  }),
  mk({
    slug: "section-184-loan-calculator", title: "Section 184 Loan Calculator",
    desc: "Estimate a HUD Section 184 Indian Home Loan payment — low down payment (2.25%), 1% upfront guarantee fee and 0.25% annual fee.",
    inputs: [cur("homePrice", "Home Price", 250000, 2000000, 1000), cur("downPayment", "Down Payment (minimum applied automatically)", 0, 2000000, 500), pct("interestRatePercent", "Interest Rate", 6.5, 15, 0.125), num("termYears", "Loan Term (years)", 30, 30, 1, 10), yn("financeUpfrontFee", "Finance the Upfront Guarantee Fee?", 1), cur("annualTaxesInsurance", "Annual Property Taxes & Insurance", 3600, 100000, 50)],
    results: [["monthlyPayment", "Monthly Payment", "c"], ["principalAndInterest", "Principal & Interest", "c"], ["annualGuaranteeFeeMonthly", "Annual Guarantee Fee (monthly)", "c"], ["upfrontGuaranteeFee", "Upfront Guarantee Fee (1%)", "c"], ["minimumDownPayment", "Minimum Down Payment", "c"], ["loanAmount", "Loan Amount", "c"]],
    fn: E.section184, ex: { homePrice: 250000, downPayment: 0, interestRatePercent: 6.5, termYears: 30, financeUpfrontFee: 1, annualTaxesInsurance: 3600 },
    exText: (o) => `Example: a ${usd(250000)} home with the minimum ${usd(o.minimumDownPayment)} down at 6.5% costs about ${usd(o.monthlyPayment)} a month including the 0.25% annual guarantee fee and taxes and insurance.`,
    how: "Enter the price, rate and your taxes and insurance. Section 184 is for enrolled members of federally recognized tribes and Alaska Natives in eligible areas.",
    assume: "HUD Section 184: minimum investment 2.25% for loans over $50,000 (1.25% at $50,000 or less); upfront loan guarantee fee 1% (may be financed); annual fee 0.25% of the principal balance (estimated on the original balance here). Loan limits follow FHA limits in eligible areas.",
    faq: [["What is a Section 184 loan?", "A HUD-guaranteed mortgage for Native American and Alaska Native borrowers with low down payments and no PMI."], ["How much is the Section 184 guarantee fee?", "1% upfront and 0.25% a year."]],
  }),
  mk({
    slug: "dfvc-penalty-calculator", title: "DFVC Penalty Calculator",
    desc: "Calculate the DOL Delinquent Filer Voluntary Compliance (DFVCP) penalty for late Form 5500 filings — $10 a day, capped per filing and per plan.",
    inputs: [num("daysLate", "Days Late (per filing)", 200, 10000), num("lateYears", "Number of Late Annual Reports", 1, 30, 1, 1), yn("largePlan", "Large Plan (100+ participants)?"), yn("small501c3", "Small Plan Sponsored by a 501(c)(3)?")],
    results: [["dfvcPenalty", "DFVC Penalty", "c"], ["perFilingPenalty", "Penalty per Filing", "c"], ["perFilingCap", "Per-Filing Cap", "c"], ["perPlanCap", "Per-Plan Cap", "c"], ["irsPenaltyAvoided", "IRS Penalty Exposure Avoided (up to)", "c"]],
    fn: E.dfvc, ex: { daysLate: 200, lateYears: 1, largePlan: 0, small501c3: 0 },
    exText: (o) => `Example: a small plan filing 200 days late pays ${usd(o.dfvcPenalty)} under DFVCP (capped at ${usd(o.perFilingCap)} per filing) instead of facing up to ${usd(o.irsPenaltyAvoided)} in IRS penalties.`,
    how: "Count days late from the original due date (including extensions) to the date you file through DFVCP. Enter how many years' filings are delinquent.",
    assume: "DFVCP (2013 notice): $10 per day; small plans capped at $750 per filing and $1,500 per plan; large plans $2,000 per filing and $4,000 per plan; small plans of 501(c)(3) sponsors $750 per plan. The IRS generally waives its penalties ($250/day up to $150,000) for DFVCP filers.",
    faq: [["How much is the DFVC penalty?", "$10 per day late, up to $750 per filing for small plans or $2,000 for large plans."], ["Is DFVC worth it?", "Usually — it's far cheaper than the DOL and IRS penalties for late Form 5500 filings."]],
  }),
  mk({
    slug: "form-5500-late-filing-penalty-calculator", title: "Form 5500 Late Filing Penalty Calculator",
    desc: "Estimate the IRS and DOL penalties for a late Form 5500 — $250 a day up to $150,000 from the IRS and up to $2,739 a day from the DOL — versus the DFVC program.",
    inputs: [num("daysLate", "Days Late", 120, 10000), cur("dolPerDayPenalty", "DOL Maximum Penalty per Day", 2739, 5000, 1), yn("largePlan", "Large Plan (100+ participants)?")],
    results: [["totalPotentialPenalty", "Total Potential Penalty", "c"], ["irsPenalty", "IRS Penalty", "c"], ["maximumDolPenalty", "Maximum DOL Penalty", "c"], ["dfvcAlternative", "DFVC Program Alternative", "c"]],
    fn: E.form5500Penalty, ex: { daysLate: 120, dolPerDayPenalty: 2739, largePlan: 0 },
    exText: (o) => `Example: filing 120 days late risks ${usd(o.irsPenalty)} from the IRS and up to ${usd(o.maximumDolPenalty)} from the DOL — compared with ${usd(o.dfvcAlternative)} through DFVCP.`,
    how: "Enter the number of days the filing is late. The DOL per-day maximum is adjusted for inflation each January.",
    assume: "IRC §6652(e) (SECURE Act): $250 per day, up to $150,000 per return. ERISA §502(c)(2): up to $2,739 per day (2025 inflation-adjusted maximum; DOL usually assesses less). One-participant plans (Form 5500-EZ) can use the IRS late filer relief program instead.",
    faq: [["What is the penalty for filing Form 5500 late?", "Up to $250 a day from the IRS (max $150,000) and up to about $2,700 a day from the DOL."], ["How can I reduce Form 5500 late penalties?", "File through the DOL's Delinquent Filer Voluntary Compliance Program before the DOL contacts you."]],
  }),
  mk({
    slug: "vfcp-lost-earnings-calculator", title: "VFCP Lost Earnings Calculator",
    desc: "Calculate lost earnings for a DOL Voluntary Fiduciary Correction Program correction — like late 401(k) deposits — using the IRS underpayment rate compounded daily.",
    inputs: [cur("principal", "Principal Amount (e.g. late deferrals)", 10000, 100000000, 10), num("daysLateToRecovery", "Days From Loss Date to Recovery Date", 45, 36500), num("daysRecoveryToPayment", "Days From Recovery Date to Payment of Lost Earnings", 0, 36500), pct("underpaymentRatePercent", "IRC §6621(a)(2) Underpayment Rate", 7, 20, 0.5)],
    results: [["totalLostEarningsAndInterest", "Lost Earnings + Interest", "c"], ["lostEarnings", "Lost Earnings", "c"], ["interestOnLostEarnings", "Interest on Lost Earnings", "c"], ["totalToRestore", "Total to Restore to the Plan", "c"]],
    fn: E.vfcpLostEarnings, ex: { principal: 10000, daysLateToRecovery: 45, daysRecoveryToPayment: 0, underpaymentRatePercent: 7 },
    exText: (o) => `Example: ${usd(10000)} of 401(k) deferrals deposited 45 days late at a 7% underpayment rate owes ${usd(o.lostEarnings)} in lost earnings.`,
    how: "Enter the principal, the days from the date of the loss (when deferrals should have been deposited) to the recovery date (when they were deposited), and the underpayment rate for the period.",
    assume: "VFCP (71 FR 20262) uses the IRC §6621(a)(2) underpayment rate (federal short-term rate + 3%, set quarterly), compounded daily. If lost earnings are paid after the principal, interest accrues on them too. Use the DOL's online VFCP calculator for multi-quarter rate changes; amounts under $1,000 may use the self-correction component.",
    faq: [["How do I calculate lost earnings on late 401(k) deposits?", "Apply the IRS underpayment rate, compounded daily, from the date the money should have been deposited to the date it was."], ["What is the VFCP Self-Correction Component?", "A streamlined option for late deposits with lost earnings of $1,000 or less, filed online without a full application."]],
  }),
  mk({
    slug: "california-late-payment-penalty-calculator", title: "California Late Payment Penalty Calculator",
    desc: "Estimate California FTB late payment and late filing penalties and interest on unpaid state income tax.",
    inputs: [cur("unpaidTax", "Unpaid Tax", 5000, 10000000, 50), num("monthsLate", "Months Paid Late", 6, 120, 0.5), yn("filedLate", "Return Also Filed Late?"), num("monthsFiledLate", "Months the Return Was Late", 0, 60, 0.5), pct("interestRatePercent", "FTB Interest Rate", 7, 20, 0.5)],
    results: [["totalOwed", "Total Owed", "c"], ["latePaymentPenalty", "Late Payment Penalty", "c"], ["lateFilingPenalty", "Late Filing Penalty", "c"], ["interest", "Interest", "c"], ["penaltyPercent", "Penalties as % of Tax", "p"]],
    fn: E.caLatePayment, ex: { unpaidTax: 5000, monthsLate: 6, filedLate: 0, monthsFiledLate: 0, interestRatePercent: 7 },
    exText: (o) => `Example: ${usd(5000)} paid 6 months late owes a ${usd(o.latePaymentPenalty)} late payment penalty plus about ${usd(o.interest)} of interest.`,
    how: "Enter the unpaid tax and how many months late it was paid. If the return was also late, enter the months late.",
    assume: "R&TC §19132: 5% of the unpaid tax plus 0.5% per month (up to 40 months), maximum 25%. R&TC §19131: late filing 5% per month up to 25%, with a minimum of $135 or 100% of the tax (if less) for returns over 60 days late. Interest uses the FTB's semiannual rate, compounded daily (simplified here).",
    faq: [["What is California's late payment penalty?", "5% of the unpaid tax plus 0.5% for each month it remains unpaid, up to 25%."], ["Can the FTB waive penalties?", "Yes, for reasonable cause, and there's a one-time first-time abatement for individuals for tax years 2022 and later."]],
  }),
  mk({
    slug: "medicare-fee-schedule-calculator", title: "Medicare Fee Schedule Calculator",
    desc: "Calculate a Medicare physician fee schedule payment from RVUs and GPCIs with the CY2026 conversion factor — allowed amount, 80% Medicare share and patient coinsurance.",
    inputs: [num("workRvu", "Work RVU", 1.3, 200, 0.01), num("workGpci", "Work GPCI", 1, 2, 0.001), num("peRvu", "Practice Expense RVU (facility or non-facility)", 1.4, 200, 0.01), num("peGpci", "Practice Expense GPCI", 1, 2, 0.001), num("mpRvu", "Malpractice RVU", 0.1, 50, 0.01), num("mpGpci", "Malpractice GPCI", 1, 3, 0.001), yn("qualifyingApm", "Qualifying APM Participant ($33.5675 CF)?"), yn("nonParticipating", "Non-Participating Provider (95%)?")],
    results: [["allowedAmount", "Medicare Allowed Amount", "c"], ["medicarePays80", "Medicare Pays (80%)", "c"], ["patientCoinsurance20", "Patient Coinsurance (20%)", "c"], ["totalRvus", "Total Geographically Adjusted RVUs", "n"], ["conversionFactor", "Conversion Factor", "c"], ["limitingCharge", "Limiting Charge (non-par)", "c"]],
    fn: E.medicareFee, ex: { workRvu: 1.3, workGpci: 1, peRvu: 1.4, peGpci: 1, mpRvu: 0.1, mpGpci: 1, qualifyingApm: 0, nonParticipating: 0 },
    exText: (o) => `Example: 2.8 total RVUs at the 2026 conversion factor of $33.4009 gives an allowed amount of ${usd(o.allowedAmount)} — Medicare pays ${usd(o.medicarePays80)} after the deductible and the patient owes ${usd(o.patientCoinsurance20)}.`,
    how: "Look up the CPT code's RVUs and your locality's GPCIs in the CMS Physician Fee Schedule Look-Up Tool or RVU file.",
    assume: "CY2026 Medicare Physician Fee Schedule: payment = (work RVU × work GPCI + PE RVU × PE GPCI + MP RVU × MP GPCI) × CF; CF $33.4009 (non-qualifying APM) or $33.5675 (qualifying APM participants), including the one-year 2.5% OBBBA increase. Non-participating providers get 95% and may bill up to 115% (limiting charge). Sequestration (2%) and MIPS adjustments aren't included.",
    faq: [["What is the 2026 Medicare conversion factor?", "$33.4009, or $33.5675 for qualifying APM participants."], ["How are Medicare fees calculated?", "RVUs for work, practice expense and malpractice are adjusted by geographic indices and multiplied by the conversion factor."]],
  }),
  mk({
    slug: "land-registry-fee-calculator", title: "Land Registry Fee Calculator (UK)",
    desc: "Find the HM Land Registry fee for registering a property purchase (Scale 1) or a mortgage or remortgage (Scale 2) in England and Wales.",
    inputs: [cur("propertyValue", "Property Value / Price (£)", 300000, 100000000, 1000), dropdown("scale", "Application", [["Scale 1 — transfer for value (purchase)", 0], ["Scale 2 — mortgage / remortgage / transfer not for value", 1]], 0), yn("paperApplication", "Paper Application (not portal)?")],
    results: [["landRegistryFee", "Land Registry Fee (£)", "c"], ["portalFee", "Portal / Business e-services Fee (£)", "c"], ["paperFee", "Paper Fee (£)", "c"], ["saving", "Saving Online (£)", "c"]],
    fn: E.landRegistry, ex: { propertyValue: 300000, scale: 0, paperApplication: 0 }, currency: "GBP",
    exText: (o) => `Example: registering a £300,000 purchase costs £${o.landRegistryFee} through the portal (£${o.paperFee} on paper).`,
    how: "Enter the price paid (Scale 1) or the amount of the mortgage charge (Scale 2).",
    assume: "HM Land Registry Fee Order: Scale 1 — up to £80,000 £20 / £45; £80,001–£100,000 £40 / £95; £100,001–£200,000 £100 / £230; £200,001–£500,000 £150 / £330; £500,001–£1m £295 / £655; over £1m £500 / £1,105 (portal / paper). Scale 2 — £20 to £105 portal. Stamp Duty Land Tax is separate.",
    faq: [["How much is the Land Registry fee for a £300,000 house?", "£150 if your conveyancer applies online, £330 on paper."], ["Who pays the Land Registry fee?", "The buyer, usually through their conveyancer as a disbursement."]],
  }),
  mk({
    slug: "legal-practice-management-software-roi-calculator", title: "Legal Practice Management Software ROI Calculator",
    desc: "Estimate the return on law practice management software — billable hours recovered, subscription cost, net benefit, ROI and payback period.",
    inputs: [num("lawyers", "Lawyers / Timekeepers", 5, 10000, 1, 1), num("hoursSavedPerWeek", "Hours Saved per Person per Week", 3, 40, 0.25), cur("billingRate", "Average Billing Rate", 300, 2000, 5), pct("percentBilled", "Share of Saved Time That Becomes Billed Work", 50, 100, 5), cur("costPerUserMonth", "Software Cost per User per Month", 89, 1000, 1), cur("setupCost", "Setup / Migration Cost", 2000, 1000000, 100), cur("otherSavingsPerYear", "Other Savings per Year (paper, software replaced)", 1500, 1000000, 100)],
    results: [["annualNetBenefit", "Annual Net Benefit", "c"], ["roiPercent", "ROI", "p"], ["annualGain", "Annual Gain", "c"], ["annualCost", "Annual Cost", "c"], ["paybackMonths", "Payback (months)", "n"]],
    fn: E.softwareRoi, ex: { lawyers: 5, hoursSavedPerWeek: 3, billingRate: 300, percentBilled: 50, costPerUserMonth: 89, setupCost: 2000, otherSavingsPerYear: 1500 },
    exText: (o) => `Example: 5 lawyers saving 3 hours a week at $300 an hour (half billed) gain ${usd(o.annualGain)} a year against ${usd(o.annualCost)} of cost — an ROI of ${o.roiPercent}%.`,
    how: "Estimate the time saved on intake, time entry, billing and document work, and how much of it turns into billable work.",
    assume: "Gain = timekeepers × hours saved × 48 weeks × rate × share billed + other savings; cost = subscription × 12 + setup (first year). Clio's Legal Trends data suggests lawyers bill only about 2.9 hours of an 8-hour day, so recovered time is valuable but not all billable.",
    faq: [["Is legal practice management software worth it?", "Usually, if it recovers even an hour or two of billable time per lawyer each week."], ["How much does law practice management software cost?", "Typically $40–$150 per user per month."]],
  }),
);

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
