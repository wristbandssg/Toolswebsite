// One-time (but safe to re-run) batch setup script: creates 67 unemployment, paid leave and
// workers' comp calculators (Law & Government Calculators > Unemployment, Workers' Comp & Paid
// Leave Calculators): 37 state unemployment calculators (DOL July 2026 formulas), 11 state paid
// family / disability leave programs, FMLA, 12 state workers' comp calculators and 7 general
// workers' comp tools. Data lives in src/lib/calc-engine-law-ui.ts; copy and examples are
// generated from it so they always match the calculator.
// Merged keywords (covered here, no separate page): Paid Family Leave / SDI / CASDI / Short Term
// Disability California / Disability Calculator CA / California SSDI → california-paid-family-
// leave; NJ maternity leave / NJ disability → new-jersey-paid-family-leave; NY PFL / Nypfl → new-
// york-paid-family-leave; MA PFML → massachusetts; FAMLI → colorado; RI TDI → rhode-island; UI
// Calculator / UI Benefit / federal unemployment → the existing unemployment-benefit-calculator;
// Workman's Comp / Workmens Compensation / WC Settlement / Work Injury Settlement / Work Injury /
// Workplace Injury Compensation / Work Compensation → workers-comp-settlement or workers-comp;
// Ohio BWC Settlement / PPD Ohio → ohio; Texas / Tennessee / South Carolina / North Carolina /
// Kansas / Colorado / Arkansas / Georgia "impairment rating payout" → that state; Florida
// Impairment Benefit / Florida Impairment Rating → florida; AWW → average-weekly-wage; TPD →
// temporary-partial-disability; Scheduled Award / Scheduled Loss of Use → schedule-loss-of-use;
// Mod Rate → experience-mod; TTD → workers-comp. Pennsylvania, Kentucky, Nevada, Wisconsin,
// Washington, Michigan, Idaho and Indiana (PPI) workers' comp keywords use the general
// workers-comp-calculator (editable rate, weeks and maximum).
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-ui-calculators.ts
// or
//   npm run db:create-law-ui-calculators

import * as E from "../src/lib/calc-engine-law-ui";

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

const CAT = "unemployment-workers-comp-leave-calculators";
const DISCLAIMER = "Estimate only — the state agency or insurer calculates the official amount from your wage records and decides eligibility.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];

function methodText(s: E.UiState): string {
  const k = s.k;
  switch (s.method) {
    case "hq": return `${s.name === "California" ? "about " : ""}1/${k} of your highest-quarter wages${s.sub ? ` minus $${s.sub}` : ""}${s.name === "New York" ? " (1/25 if the high quarter is $3,575 or less)" : ""}`;
    case "avg2": return `1/${k} of the average of your two highest quarters`;
    case "two": return s.name === "Virginia" ? "the statutory table, about 1/50 of your two highest quarters' wages" : s.name === "North Carolina" ? "the last two quarters of the base period divided by 52" : `1/${k} of the wages in your two highest quarters`;
    case "pctHQ": return `${(k * 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}% of your highest-quarter wages`;
    case "pctAvg2": return `${(k * 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}% of the average of your two highest quarters`;
    case "pctBPW": return `${(k * 100).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}% of your total base-period wages`;
    case "awwHQ": return `${Math.round(k * 1000) / 10}% of your average weekly wage in the high quarter`;
    case "aww2": return `${Math.round(k * 1000) / 10}% of your average weekly wage in the two highest quarters`;
    case "awwBP": return s.name === "West Virginia" ? "about 55% of your average weekly wage (the state's wage-class table)" : `${Math.round(k * 1000) / 10}% of your average weekly wage in the base period`;
    case "avg4": return `1/${k} of the average of the four base-period quarters`;
    case "pa": return "(4% of high-quarter wages + $2) × 0.98, plus a dependent allowance";
    case "mn": return "the higher of 50% of your high-quarter weekly wage (up to $611) or 50% of your base-period weekly wage (up to $948)";
  }
}

const uiEx = { highestQuarterWages: 13000, secondHighestQuarterWages: 12000, baseYearWages: 48000, dependents: 0, withholdingPercent: 10 };

function uiTool(s: E.UiState): ToolDef {
  const ex = r(E.stateUnemployment(s), uiEx);
  const maxShown = s.maxWithDeps && s.maxWithDeps < 99999 ? `${usd(s.max)} (${usd(s.maxWithDeps)} with dependents)` : s.maxWithDeps ? `${usd(s.max)} plus dependent allowances` : usd(s.max);
  return {
    slug: E.uiSlug(s),
    title: `${s.name} Unemployment Calculator`,
    description: `Estimate your ${s.name} unemployment benefits for 2026 — the weekly benefit amount from your base-period wages, up to the state maximum of ${usd(s.max)} a week, and the total over ${s.weeks} weeks.`,
    metaTitle: `${s.name} Unemployment Calculator 2026 — Weekly Benefit`.slice(0, 70),
    metaDescription: `Free ${s.name} unemployment benefits calculator. Estimate your weekly benefit (max ${usd(s.max)}) and total benefits from your highest-quarter and base-period wages.`,
    calcInputs: [
      currencyField("highestQuarterWages", "Highest-Quarter Wages (base period)", { default: 13000, max: 500000, step: 100 }),
      currencyField("secondHighestQuarterWages", "Second-Highest Quarter Wages", { default: 12000, max: 500000, step: 100 }),
      currencyField("baseYearWages", "Total Base-Period Wages (4 quarters)", { default: 48000, max: 2000000, step: 100 }),
      ...(s.dep || ["Pennsylvania", "Rhode Island"].includes(s.name) ? [numberField("dependents", "Dependents", { default: 0, max: 10 })] : []),
      percentField("withholdingPercent", "Federal Withholding (10% optional)", { default: 10, max: 30, step: 1 }),
    ],
    calcResult: { label: "Weekly Benefit Amount", format: "currency" },
    calcResults: [
      { key: "weeklyBenefitAmount", label: "Weekly Benefit Amount", format: "currency", highlight: true },
      { key: "maximumTotalBenefits", label: "Maximum Total Benefits", format: "currency" },
      { key: "weeksAvailable", label: "Weeks Available (up to)", format: "number" },
      { key: "weeklyAfterWithholding", label: "Weekly After Withholding", format: "currency" },
      { key: "stateMaximumWeekly", label: "State Maximum Weekly", format: "currency" },
      { key: "likelyEligible", label: "Meets the Minimum Benefit? (1 = yes)", format: "number" },
      { key: "replacementRatePercent", label: "Share of Your Weekly Wage Replaced", format: "percentage" },
    ],
    instructions: `Your base period is usually the first four of the last five completed calendar quarters before you file. Enter the gross wages in your highest quarter, your second-highest quarter and the total for all four quarters (from your pay stubs or W-2). ${s.name} also has earnings and work-search requirements.`,
    examples: `Example: with ${usd(13000)} in the highest quarter, ${usd(12000)} in the next and ${usd(48000)} in the base period, the estimated ${s.name} weekly benefit is ${usd(ex.weeklyBenefitAmount)} — up to ${usd(ex.maximumTotalBenefits)} over ${s.weeks} weeks.`,
    assumptions: `${s.name} computes the weekly benefit as ${methodText(s)}, with a minimum of ${s.min ? usd(s.min) : "a small amount"} and a maximum of ${maxShown} a week (U.S. DOL Significant Provisions, July 2026). Benefits are taxable; ${s.weeks} weeks is the maximum (some states pay fewer when unemployment is low or base-period wages are limited). Part-time earnings reduce the weekly payment. ${DISCLAIMER}`,
    faq: [
      { question: `What is the maximum unemployment benefit in ${s.name}?`, answer: `${maxShown} a week in 2026.` },
      { question: `How is ${s.name} unemployment calculated?`, answer: `The weekly amount is ${methodText(s)}, capped at the state maximum.` },
    ],
  };
}

const pflEx = (p: E.PflProgram): Record<string, number> => (p.basis === "hq" ? { highestQuarterWages: 18000, dependents: 0, weeksOfLeave: p.weeks } : { averageWeeklyWage: 1400, weeksOfLeave: p.weeks });
const PFL_NOTES: Record<string, string> = {
  "california-paid-family-leave-calculator": "California SDI (disability) and PFL (bonding/caregiving) pay 90% of your weekly wage up to 70% of the state average weekly wage and 70% above it, using your highest base-period quarter ÷ 13, up to $1,765 a week in 2026; PFL lasts up to 8 weeks, disability up to 52.",
  "new-jersey-paid-family-leave-calculator": "New Jersey Family Leave Insurance and Temporary Disability pay 85% of your average weekly wage up to $1,119 a week in 2026; FLI up to 12 weeks, TDI up to 26.",
  "new-york-paid-family-leave-calculator": "New York PFL pays 67% of your average weekly wage up to 67% of the state average ($1,228.53 a week in 2026), for up to 12 weeks.",
  "new-york-short-term-disability-calculator": "New York disability benefits (DBL) pay 50% of your average weekly wage up to $170 a week, for up to 26 weeks in a 52-week period, after a 7-day waiting period.",
  "massachusetts-paid-family-leave-calculator": "Massachusetts PFML pays 80% of wages up to 50% of the state average weekly wage plus 50% above, up to $1,230.39 a week in 2026; 12 weeks family, 20 weeks medical (26 combined).",
  "connecticut-paid-family-leave-calculator": "Connecticut Paid Leave pays 95% of wages up to 40 × the CT minimum wage ($677.60) and 60% above, up to $1,016.40 a week (60 × minimum wage), for up to 12 weeks.",
  "colorado-paid-family-leave-calculator": "Colorado FAMLI pays 90% of wages up to 50% of the state average weekly wage plus 50% above, up to $1,381.45 a week in 2026, for up to 12 weeks (16 for pregnancy complications).",
  "washington-paid-family-leave-calculator": "Washington PFML pays 90% of wages up to 50% of the state average weekly wage plus 50% above, up to $1,647 a week in 2026, for up to 12 weeks (16–18 combined).",
  "oregon-paid-family-leave-calculator": "Paid Leave Oregon pays 100% of wages for earnings up to 65% of the state average weekly wage, plus 50% of earnings above that, up to $1,692.16 a week (from July 2026), for up to 12 weeks.",
  "rhode-island-paid-family-leave-calculator": "Rhode Island TCI and TDI pay 4.62% of your highest-quarter wages (about 60%) up to $1,103 a week in 2026, plus a dependent allowance; TCI up to 8 weeks, TDI up to 30.",
  "minnesota-paid-family-leave-calculator": "Minnesota Paid Leave (benefits from 1 January 2026) pays 90% of wages up to 50% of the state average weekly wage, 66% from 50–100% and 55% above, up to $1,423 a week; 12 weeks family or medical, 20 combined.",
};

function pflTool(p: E.PflProgram): ToolDef {
  const ex = r(E.paidLeave(p), pflEx(p));
  const shortName = p.name.split(" ")[0] === "Paid" ? "Oregon" : p.name.replace(/ (SDI|Family|Paid|PFML|FAMLI|TCI|Short).*/, "");
  return {
    slug: p.slug,
    title: `${p.slug.startsWith("new-york-short") ? "New York Short-Term Disability" : `${shortName} Paid Family Leave`} Calculator`,
    description: `Estimate your weekly benefit from ${p.name} in 2026 — the replacement rate on your wages, the program maximum of ${usd(p.max)} a week, and the total for your leave.`,
    metaTitle: `${p.name} Calculator 2026 — Weekly Benefit`.slice(0, 70),
    metaDescription: `Free ${p.name} calculator. Estimate weekly benefits (up to ${usd(p.max)}) and total leave pay from your wages.`,
    calcInputs: [
      ...(p.basis === "hq"
        ? [currencyField("highestQuarterWages", "Highest-Quarter Wages (base period)", { default: 18000, max: 500000, step: 100 })]
        : [currencyField("averageWeeklyWage", "Average Weekly Wage", { default: 1400, max: 20000, step: 10 })]),
      ...(p.slug.startsWith("rhode-island") ? [numberField("dependents", "Dependents (under 18 or disabled)", { default: 0, max: 10 })] : []),
      numberField("weeksOfLeave", "Weeks of Leave", { default: p.weeks, min: 1, max: 52, unit: "weeks" }),
    ],
    calcResult: { label: "Weekly Benefit", format: "currency" },
    calcResults: [
      { key: "weeklyBenefit", label: "Weekly Benefit", format: "currency", highlight: true },
      { key: "totalBenefit", label: "Total for Your Leave", format: "currency" },
      { key: "replacementRatePercent", label: "Share of Wages Replaced", format: "percentage" },
      { key: "weeklyWageUsed", label: "Weekly Wage Used", format: "currency" },
      { key: "programMaximumWeekly", label: "Program Maximum Weekly", format: "currency" },
    ],
    instructions: p.basis === "hq" ? "Enter the gross wages in your highest quarter of the base period (the 12 months ending 4–7 months before your claim) and the weeks of leave you plan to take." : "Enter your average weekly wage (gross pay over the last 8 weeks or base period, as the program defines it) and the weeks of leave.",
    examples: `Example: ${p.basis === "hq" ? `${usd(18000)} in the highest quarter (${usd(18000 / 13)} a week)` : `an average weekly wage of ${usd(1400)}`} gives about ${usd(ex.weeklyBenefit)} a week — ${usd(ex.totalBenefit)} over ${p.weeks} weeks.`,
    assumptions: `${PFL_NOTES[p.slug]} The state average weekly wage used is derived from the published 2026 maximum. Benefits may be taxable. ${DISCLAIMER}`,
    faq: [
      { question: `How much does ${p.name} pay?`, answer: PFL_NOTES[p.slug].split(";")[0] + "." },
      { question: "Is my job protected while I'm on leave?", answer: "Most state paid leave programs include job protection after a minimum period of employment, and federal FMLA may also apply; check the program's rules." },
    ],
  };
}

const WC_NOTES: Record<string, string> = {
  California: "Temporary disability is 2/3 of the average weekly wage, between $264.61 and $1,764.11 a week for 2026 injuries. Permanent disability uses the PD rating table (LC 4658: weeks rise from 4 per percent below 10% to 16 per percent above 70%) at 2/3 of AWW, $160–$290 a week (up to $435 at 70%+).",
  Texas: "Temporary income benefits are 70% of the AWW (75% for low-wage workers) up to $1,314 a week from 1 October 2026. Impairment income benefits pay 3 weeks for each percent of whole-body impairment at 70% of the AWW.",
  Florida: "Temporary total disability is 66⅔% of the AWW up to the state maximum. Impairment income benefits: 2 weeks per percent for 1–10%, 3 for 11–15%, 4 for 16–20% and 6 above 20%, at 75% of the TTD rate (50% once you return to work at your pre-injury wage).",
  Tennessee: "TTD is 66⅔% of the AWW up to the state maximum. Permanent partial disability = impairment rating × 450 weeks × the comp rate (an increased award may follow if you don't return to work at the same pay).",
  "South Carolina": "TTD is 66⅔% of the AWW up to the state maximum. Permanent disability to the body as a whole = rating × 500 weeks × the comp rate; scheduled members have their own weeks.",
  "North Carolina": "TTD is 66⅔% of the AWW up to the state maximum. Permanent partial disability uses the §97-31 schedule (back 300 weeks, arm 240, leg and hand 200, foot 144, eye 120…) × rating × comp rate.",
  Kansas: "TTD is 66⅔% of the AWW up to the state maximum. Body-as-a-whole functional impairment = rating × 415 weeks × the comp rate (work disability can increase it).",
  Colorado: "TTD is 66⅔% of the AWW up to the state maximum. Whole-person impairment = rating × 400 weeks × the comp rate (subject to statutory caps); scheduled injuries use their own schedule.",
  Georgia: "TTD is 66⅔% of the AWW up to $800 a week. Permanent partial disability to the body as a whole = rating × 300 weeks × the comp rate.",
  Arkansas: "TTD is 66⅔% of the AWW up to the state maximum. Body-as-a-whole permanent partial disability = rating × 450 weeks × the PPD rate.",
  Ohio: "TTD is 72% of the full weekly wage for the first 12 weeks, then 66⅔% of the AWW, up to the state maximum. Permanent partial disability = % × 200 weeks (the PPD rate is capped at 1/3 of the state average — this estimate uses the comp rate).",
  "New York": "Temporary total disability is 2/3 of the AWW up to $1,281.50 a week for injuries from 1 July 2026. Schedule loss of use awards pay a set number of weeks per body part (arm 312, leg 288, hand 244, foot 205, eye 160…) × loss-of-use % × the comp rate.",
};

const wcEx = { averageWeeklyWage: 1200, stateMaximumWeekly: 0, weeksOffWork: 12, impairmentRating: 10, returnedToWork: 1, bodyPart: 0, futureMedicalEstimate: 0 };
function wcTool(s: E.WcState): ToolDef {
  const ex = r(E.stateWorkersComp(s), wcEx);
  const sched = s.name === "New York" ? E.NY_SCHEDULE : E.NC_SCHEDULE;
  return {
    slug: s.slug,
    title: `${s.name} Workers' Comp Calculator`,
    description: `Estimate ${s.name} workers' compensation benefits — weekly temporary disability pay, the permanent impairment award from your rating, and a total claim value — under ${s.law}.`,
    metaTitle: `${s.name} Workers' Comp Calculator — Impairment Rating Payout`.slice(0, 70),
    metaDescription: `Free ${s.name} workers' comp calculator. Weekly TTD rate, impairment rating payout and total benefits from your average weekly wage.`,
    calcInputs: [
      currencyField("averageWeeklyWage", "Average Weekly Wage Before the Injury", { default: 1200, max: 10000, step: 10 }),
      currencyField("stateMaximumWeekly", `State Maximum Weekly Rate (0 = use ${usd(s.max)})`, { default: 0, max: 10000, step: 1 }),
      numberField("weeksOffWork", "Weeks Off Work (temporary disability)", { default: 12, max: 520, step: 0.5 }),
      percentField("impairmentRating", s.ppd === "ca" ? "Permanent Disability Rating" : "Impairment Rating", { default: 10, step: 1 }),
      ...(s.ppd === "nc" ? [dropdown("bodyPart", "Injured Body Part", sched.map(([n, w], i) => [`${n} (${w} weeks)`, i] as [string, number]), 0)] : []),
      ...(s.ppd === "fl" ? [dropdown("returnedToWork", "Back at Work at Your Pre-Injury Wage?", YESNO, 1)] : []),
      currencyField("futureMedicalEstimate", "Future Medical (for settlement value, optional)", { default: 0, max: 5000000, step: 500 }),
    ],
    calcResult: { label: "Weekly TTD Benefit", format: "currency" },
    calcResults: [
      { key: "weeklyTtdBenefit", label: "Weekly Temporary Disability Benefit", format: "currency", highlight: true },
      { key: "temporaryDisabilityTotal", label: "Temporary Disability Total", format: "currency" },
      { key: "permanentDisabilityAward", label: "Permanent Impairment Award", format: "currency" },
      { key: "permanentDisabilityWeeks", label: "Award Weeks", format: "number" },
      { key: "estimatedTotalBenefits", label: "Estimated Total Benefits", format: "currency" },
      { key: "ttdCappedAtMaximum", label: "Capped at the State Maximum? (1 = yes)", format: "number" },
    ],
    instructions: `Enter your average weekly wage (usually gross pay in the 13 or 52 weeks before the injury), the weeks you've been or expect to be off work, and the impairment rating from the doctor (MMI). The state maximum is pre-filled where ${s.name} has published its 2026 rate — check your notice and enter a different figure if it applies.`,
    examples: `Example: a ${usd(1200)} AWW gives ${usd(ex.weeklyTtdBenefit)} a week; 12 weeks off and a 10% rating add a permanent award of about ${usd(ex.permanentDisabilityAward)} — ${usd(ex.estimatedTotalBenefits)} in total.`,
    assumptions: `${WC_NOTES[s.name]} Medical bills are paid separately; settlements also weigh future medical care and disputes. ${DISCLAIMER}`,
    faq: [
      { question: `How much does workers' comp pay in ${s.name}?`, answer: WC_NOTES[s.name].split(".")[0] + "." },
      { question: "What is an impairment rating?", answer: "A percentage assigned by the doctor at maximum medical improvement (MMI) for the permanent loss of function; it drives the permanent disability award." },
    ],
  };
}

const exFmla = r(E.fmla, { monthsEmployed: 18, hoursLast12Months: 1700, employer50Within75Miles: 1, reason: 0, weeksUsedLast12Months: 3, hoursPerWeek: 40 });
const exWc = r(E.workersCompGeneral, { averageWeeklyWage: 1100, benefitRatePercent: 66.67, stateMaximumWeekly: 0, weeksOffWork: 10, impairmentRating: 8, weeksForBodyPart: 500, futureMedicalEstimate: 0 });
const exSet = r(E.workersCompSettlement, { weeklyCompRate: 700, weeksOfBenefitsRemaining: 40, permanentDisabilityValue: 25000, futureMedicalCosts: 30000, closeMedical: 1, negotiationDiscountPercent: 20, attorneyFeePercent: 15 });
const exAww = r(E.averageWeeklyWage, { grossWagesInPeriod: 58500, weeksInPeriod: 52, weeklyValueOfBenefits: 0, benefitRatePercent: 66.67 });
const exTpd = r(E.temporaryPartialDisability, { preInjuryAww: 1200, currentWeeklyEarnings: 700, benefitRatePercent: 66.67, stateMaximumWeekly: 0, weeks: 10 });
const exSlu = r(E.nySlu, { bodyPart: 2, lossOfUsePercent: 20, averageWeeklyWage: 1200, stateMaximumWeekly: 0 });
const exMod = r(E.experienceMod, { actualLosses: 48000, expectedLosses: 60000, credibilityWeightPercent: 30, manualPremium: 85000 });
const exDba = r(E.defenseBaseAct, { averageWeeklyWage: 3000, maximumWeekly: 3859.62, weeksOffWork: 20, impairmentRating: 10, scheduleWeeks: 312, futureMedicalEstimate: 0 });

const TOOLS: ToolDef[] = [
  ...E.UI_STATES.map(uiTool),
  ...E.PFL.map(pflTool),
  {
    slug: "fmla-calculator",
    title: "FMLA Calculator — Eligibility & Weeks Left",
    description: "Check whether you qualify for FMLA job-protected leave (12 months, 1,250 hours, 50 employees within 75 miles) and how many of your 12 weeks — or 26 for military caregiver leave — remain.",
    metaTitle: "FMLA Calculator — Eligibility & Leave Remaining",
    metaDescription: "Free FMLA calculator. Check the 12-month / 1,250-hour / 50-employee eligibility rules and see the weeks and hours of FMLA leave you have left.",
    calcInputs: [
      numberField("monthsEmployed", "Months Worked for This Employer", { default: 18, max: 600 }),
      numberField("hoursLast12Months", "Hours Worked in the Last 12 Months", { default: 1700, max: 4000 }),
      dropdown("employer50Within75Miles", "50+ Employees Within 75 Miles?", [["Yes", 1], ["No", 0]], 1),
      dropdown("reason", "Type of Leave", [["Standard (birth, adoption, serious health condition, family care)", 0], ["Military caregiver leave", 1]], 0),
      numberField("weeksUsedLast12Months", "FMLA Weeks Already Used (12-month period)", { default: 3, max: 26, step: 0.2 }),
      numberField("hoursPerWeek", "Usual Hours per Week", { default: 40, max: 80 }),
    ],
    calcResult: { label: "Weeks Available", format: "number" },
    calcResults: [
      { key: "weeksAvailable", label: "FMLA Weeks Available", format: "number", highlight: true },
      { key: "eligible", label: "Eligible? (1 = yes)", format: "number" },
      { key: "hoursAvailable", label: "FMLA Hours Available", format: "number" },
      { key: "hoursShortOf1250", label: "Hours Short of 1,250", format: "number" },
    ],
    instructions: "Enter your length of employment, hours actually worked in the last 12 months (paid leave doesn't count), whether the employer has 50+ employees within 75 miles, and the FMLA leave you've used in the employer's 12-month period.",
    examples: `Example: 18 months on the job, 1,700 hours worked and 3 weeks used leaves ${exFmla.weeksAvailable} weeks (${exFmla.hoursAvailable} hours) of FMLA leave.`,
    assumptions: "29 CFR Part 825: eligible employees get up to 12 workweeks of unpaid, job-protected leave in a 12-month period (26 weeks for military caregiver leave). Employers choose the 12-month method (calendar, fixed, forward or rolling back). Paid leave and state paid family leave can run at the same time. " + DISCLAIMER,
    faq: [
      { question: "Is FMLA leave paid?", answer: "No — FMLA protects your job and health insurance; pay comes from PTO or a state paid leave program if available." },
      { question: "Can FMLA be taken intermittently?", answer: "Yes, when medically necessary, in blocks as small as the employer's smallest increment for other leave." },
    ],
  },
  ...E.WC_STATES.map(wcTool),
  {
    slug: "workers-comp-calculator",
    title: "Workers' Comp Calculator",
    description: "Estimate workers' compensation benefits in any state — weekly temporary total disability (usually 2/3 of your average weekly wage), the permanent disability award from your impairment rating, and the total.",
    metaTitle: "Workers' Comp Calculator 2026 — TTD & Impairment Payout",
    metaDescription: "Free workers' comp calculator. Weekly TTD benefit, impairment rating payout (rating × weeks × rate) and total benefits, with your state's maximum.",
    calcInputs: [
      currencyField("averageWeeklyWage", "Average Weekly Wage", { default: 1100, max: 10000, step: 10 }),
      percentField("benefitRatePercent", "State Benefit Rate (% of AWW)", { default: 66.67, max: 100, step: 0.01 }),
      currencyField("stateMaximumWeekly", "State Maximum Weekly Rate (0 = no cap)", { default: 0, max: 10000, step: 1 }),
      numberField("weeksOffWork", "Weeks Off Work", { default: 10, max: 520, step: 0.5 }),
      percentField("impairmentRating", "Impairment Rating", { default: 8, step: 1 }),
      numberField("weeksForBodyPart", "Weeks for the Body Part / Whole Body (state schedule)", { default: 500, max: 1000 }),
      currencyField("futureMedicalEstimate", "Future Medical (optional)", { default: 0, max: 5000000, step: 500 }),
    ],
    calcResult: { label: "Weekly TTD Benefit", format: "currency" },
    calcResults: [
      { key: "weeklyTtdBenefit", label: "Weekly Temporary Disability Benefit", format: "currency", highlight: true },
      { key: "temporaryDisabilityTotal", label: "Temporary Disability Total", format: "currency" },
      { key: "permanentDisabilityAward", label: "Permanent Disability Award", format: "currency" },
      { key: "permanentDisabilityWeeks", label: "Award Weeks", format: "number" },
      { key: "estimatedTotalBenefits", label: "Estimated Total Benefits", format: "currency" },
      { key: "ttdCappedAtMaximum", label: "Capped at the Maximum? (1 = yes)", format: "number" },
    ],
    instructions: "Enter your AWW, your state's benefit rate and maximum, weeks off work, your impairment rating and the number of weeks your state's schedule assigns to the injured body part (or the whole body). States with their own calculators in this category apply their rules automatically.",
    examples: `Example: a ${usd(1100)} AWW at 66.67% is ${usd(exWc.weeklyTtdBenefit)} a week; 10 weeks off and an 8% rating on a 500-week schedule add ${usd(exWc.permanentDisabilityAward)} — ${usd(exWc.estimatedTotalBenefits)} in total.`,
    assumptions: "Most states pay temporary total disability at 66⅔% of the average weekly wage up to a maximum (often 100–200% of the state average weekly wage) and permanent partial disability as rating × schedule weeks × rate. Pennsylvania, Michigan and others use wage-loss systems instead. Benefits aren't taxable. " + DISCLAIMER,
    faq: [
      { question: "How much does workers' comp pay?", answer: "Usually two-thirds of your average weekly wage while you can't work, up to your state's maximum, plus a permanent disability award if you have lasting impairment." },
      { question: "Are workers' comp benefits taxable?", answer: "No — workers' compensation benefits aren't taxable income." },
    ],
  },
  {
    slug: "workers-comp-settlement-calculator",
    title: "Workers' Comp Settlement Calculator",
    description: "Estimate a workers' compensation settlement — remaining weekly benefits, the permanent disability value and future medical costs, the usual negotiation discount and attorney fees.",
    metaTitle: "Workers' Comp Settlement Calculator — Estimate Your Payout",
    metaDescription: "Free workers' comp settlement calculator. Remaining indemnity + PPD + future medical, minus the negotiation discount and attorney fee.",
    calcInputs: [
      currencyField("weeklyCompRate", "Weekly Comp Rate", { default: 700, max: 5000, step: 5 }),
      numberField("weeksOfBenefitsRemaining", "Weeks of Benefits Remaining", { default: 40, max: 1000 }),
      currencyField("permanentDisabilityValue", "Permanent Disability Award Value", { default: 25000, max: 5000000, step: 500 }),
      currencyField("futureMedicalCosts", "Future Medical Costs", { default: 30000, max: 10000000, step: 500 }),
      dropdown("closeMedical", "Settlement Closes Future Medical?", [["Yes", 1], ["No — medical stays open", 0]], 1),
      percentField("negotiationDiscountPercent", "Negotiation Discount", { default: 20, max: 50, step: 1 }),
      percentField("attorneyFeePercent", "Attorney Fee", { default: 15, max: 25, step: 1 }),
    ],
    calcResult: { label: "Estimated Settlement", format: "currency" },
    calcResults: [
      { key: "estimatedSettlement", label: "Estimated Settlement", format: "currency", highlight: true },
      { key: "netToYou", label: "Net to You", format: "currency" },
      { key: "remainingIndemnity", label: "Remaining Weekly Benefits", format: "currency" },
      { key: "attorneyFees", label: "Attorney Fees", format: "currency" },
      { key: "futureMedicalIncluded", label: "Future Medical Included", format: "currency" },
    ],
    instructions: "Use your weekly comp rate, how many weeks of benefits you'd still be owed, the value of your permanent disability award and an estimate of future medical care. Insurers usually pay less than the full value to avoid litigation risk.",
    examples: `Example: 40 weeks at ${usd(700)}, a ${usd(25000)} PPD award and ${usd(30000)} of future medical at a 20% discount settle for about ${usd(exSet.estimatedSettlement)} — ${usd(exSet.netToYou)} after a 15% fee.`,
    assumptions: "Settlements (compromise and release, clincher, lump-sum) trade future rights for cash; Medicare's interests must be protected with a set-aside for Medicare beneficiaries. Attorney fees are capped by state law (often 10–25%) and need judge approval. " + DISCLAIMER,
    faq: [
      { question: "What is the average workers' comp settlement?", answer: "It varies widely — often tens of thousands of dollars, depending mainly on wages, the impairment rating and future medical needs." },
      { question: "Is a workers' comp settlement taxable?", answer: "Generally no, though it can affect Social Security Disability benefits unless structured correctly." },
    ],
  },
  {
    slug: "average-weekly-wage-calculator",
    title: "Average Weekly Wage (AWW) Calculator",
    description: "Calculate your average weekly wage for workers' compensation — gross wages over the weeks in the period plus the weekly value of benefits — and the resulting weekly comp rate.",
    metaTitle: "Average Weekly Wage Calculator — Workers' Comp AWW",
    metaDescription: "Free AWW calculator for workers' comp. Gross wages ÷ weeks + benefits, and the comp rate at 2/3 (or your state's rate).",
    calcInputs: [
      currencyField("grossWagesInPeriod", "Gross Wages in the Period (incl. overtime)", { default: 58500, max: 5000000, step: 100 }),
      numberField("weeksInPeriod", "Weeks in the Period (52 or 13 typical)", { default: 52, min: 1, max: 104 }),
      currencyField("weeklyValueOfBenefits", "Weekly Value of Lost Benefits (if your state counts them)", { default: 0, max: 5000, step: 5 }),
      percentField("benefitRatePercent", "Comp Rate (% of AWW)", { default: 66.67, max: 100, step: 0.01 }),
    ],
    calcResult: { label: "Average Weekly Wage", format: "currency" },
    calcResults: [
      { key: "averageWeeklyWage", label: "Average Weekly Wage", format: "currency", highlight: true },
      { key: "weeklyCompRate", label: "Weekly Comp Rate", format: "currency" },
      { key: "monthlyEquivalent", label: "Monthly Equivalent", format: "currency" },
      { key: "annualEquivalent", label: "Annual Equivalent", format: "currency" },
    ],
    instructions: "Add up gross wages (including overtime and concurrent jobs where allowed) for the period your state uses — usually the 52 or 13 weeks before the injury — and the number of weeks actually worked.",
    examples: `Example: ${usd(58500)} over 52 weeks is an AWW of ${usd(exAww.averageWeeklyWage)} and a comp rate of ${usd(exAww.weeklyCompRate)}.`,
    assumptions: "AWW rules vary: many states use 52 weeks, others 13 or 26 weeks, the highest quarter, or a similar employee's wages if you worked less. Some include employer-paid health insurance and other benefits. " + DISCLAIMER,
    faq: [
      { question: "What is the average weekly wage in workers' comp?", answer: "Your average gross weekly earnings before the injury — the base for your weekly benefit, usually paid at two-thirds." },
      { question: "Does overtime count in my AWW?", answer: "In most states, yes — regular overtime is included." },
    ],
  },
  {
    slug: "temporary-partial-disability-calculator",
    title: "Temporary Partial Disability (TPD) Calculator",
    description: "Calculate temporary partial disability benefits when you return to light duty at lower pay — 2/3 of the difference between your pre-injury wage and current earnings, up to the state maximum.",
    metaTitle: "TPD Calculator — Workers' Comp Partial Disability Pay",
    metaDescription: "Free temporary partial disability calculator. Two-thirds of your wage loss on light duty, weekly and for the period.",
    calcInputs: [
      currencyField("preInjuryAww", "Pre-Injury Average Weekly Wage", { default: 1200, max: 10000, step: 10 }),
      currencyField("currentWeeklyEarnings", "Current Weekly Earnings (light duty)", { default: 700, max: 10000, step: 10 }),
      percentField("benefitRatePercent", "Benefit Rate", { default: 66.67, max: 100, step: 0.01 }),
      currencyField("stateMaximumWeekly", "State Maximum (0 = no cap)", { default: 0, max: 10000, step: 1 }),
      numberField("weeks", "Weeks on Reduced Pay", { default: 10, max: 520 }),
    ],
    calcResult: { label: "Weekly TPD Benefit", format: "currency" },
    calcResults: [
      { key: "weeklyTpdBenefit", label: "Weekly TPD Benefit", format: "currency", highlight: true },
      { key: "weeklyWageLoss", label: "Weekly Wage Loss", format: "currency" },
      { key: "totalForPeriod", label: "Total for the Period", format: "currency" },
      { key: "totalWeeklyIncome", label: "Total Weekly Income (wages + TPD)", format: "currency" },
    ],
    instructions: "Enter your average weekly wage before the injury, what you're earning now on light duty or reduced hours, and how long it lasts.",
    examples: `Example: earning ${usd(700)} instead of ${usd(1200)} gives ${usd(exTpd.weeklyTpdBenefit)} a week in TPD — ${usd(exTpd.totalForPeriod)} over 10 weeks.`,
    assumptions: "Most states pay TPD at 2/3 of the wage loss (Florida pays 80% of the loss above 80% of AWW; others differ), for a limited number of weeks. " + DISCLAIMER,
    faq: [
      { question: "What is temporary partial disability?", answer: "Benefits paid when you can work but earn less while recovering — usually two-thirds of the difference." },
      { question: "How long can I get TPD?", answer: "It depends on the state — often up to 300–500 weeks combined with other benefits, or until MMI." },
    ],
  },
  {
    slug: "schedule-loss-of-use-calculator",
    title: "Schedule Loss of Use (SLU) Calculator — New York",
    description: "Calculate a New York schedule loss of use award — the weeks for the injured body part × the loss-of-use percentage × your comp rate (2/3 of AWW up to the maximum).",
    metaTitle: "Schedule Loss of Use Calculator — NY SLU Award",
    metaDescription: "Free NY schedule loss of use calculator. Weeks per body part × loss of use % × comp rate for arms, legs, hands, feet, eyes and hearing.",
    calcInputs: [
      dropdown("bodyPart", "Body Part", E.NY_SCHEDULE.map(([n, w], i) => [`${n} (${w} weeks)`, i] as [string, number]), 2),
      percentField("lossOfUsePercent", "Loss of Use", { default: 20, step: 1 }),
      currencyField("averageWeeklyWage", "Average Weekly Wage", { default: 1200, max: 10000, step: 10 }),
      currencyField("stateMaximumWeekly", "Maximum Weekly Rate (0 = $1,281.50)", { default: 0, max: 10000, step: 1 }),
    ],
    calcResult: { label: "SLU Award", format: "currency" },
    calcResults: [
      { key: "sluAward", label: "Schedule Loss of Use Award", format: "currency", highlight: true },
      { key: "awardWeeks", label: "Award Weeks", format: "number" },
      { key: "weeklyRate", label: "Weekly Rate", format: "currency" },
      { key: "scheduleWeeksForBodyPart", label: "Schedule Weeks for the Body Part", format: "number" },
    ],
    instructions: "Pick the body part and the loss-of-use percentage from the doctor's report under the NYS Impairment Guidelines, and your AWW.",
    examples: `Example: a 20% loss of use of the hand (244 weeks) at a ${usd(1200)} AWW is ${exSlu.awardWeeks} weeks × ${usd(exSlu.weeklyRate)} = ${usd(exSlu.sluAward)}.`,
    assumptions: "Workers' Compensation Law §15(3): fixed weeks per member (arm 312, leg 288, hand 244, foot 205, eye 160, thumb 75, index finger 46, hearing one ear 60 / both 150). Weeks of temporary total disability already paid may be credited against the award. " + DISCLAIMER,
    faq: [
      { question: "How is a schedule loss of use award calculated?", answer: "Weeks for the body part × loss-of-use percentage × your weekly comp rate." },
      { question: "Is an SLU award paid as a lump sum?", answer: "Often yes, after deducting any awards already paid at the temporary rate." },
    ],
  },
  {
    slug: "experience-mod-calculator",
    title: "Workers' Comp Experience Mod Calculator",
    description: "Estimate your workers' compensation experience modification rate (EMR) from actual vs expected losses and see how it raises or lowers your premium.",
    metaTitle: "Experience Mod Calculator — Workers' Comp EMR",
    metaDescription: "Free experience mod (EMR) calculator. Actual vs expected losses with a credibility weight, and the effect on your workers' comp premium.",
    calcInputs: [
      currencyField("actualLosses", "Actual Losses (3 experience years)", { default: 48000, max: 100000000, step: 500 }),
      currencyField("expectedLosses", "Expected Losses", { default: 60000, max: 100000000, step: 500 }),
      percentField("credibilityWeightPercent", "Credibility Weight", { default: 30, max: 100, step: 1 }),
      currencyField("manualPremium", "Manual Premium", { default: 85000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Experience Mod", format: "number" },
    calcResults: [
      { key: "experienceMod", label: "Experience Mod (EMR)", format: "number", highlight: true },
      { key: "modifiedPremium", label: "Modified Premium", format: "currency" },
      { key: "premiumDifference", label: "Premium Change", format: "currency" },
      { key: "lossRatioPercent", label: "Actual / Expected Losses", format: "percentage" },
    ],
    instructions: "Enter actual and expected losses from your rating worksheet (NCCI or state bureau) and a credibility weight (larger employers get more weight on their own experience).",
    examples: `Example: ${usd(48000)} of actual losses against ${usd(60000)} expected with 30% weight gives a mod of ${exMod.experienceMod} — ${usd(Math.abs(exMod.premiumDifference))} off an ${usd(85000)} premium.`,
    assumptions: "Simplified EMR = weight × (actual ÷ expected) + (1 − weight). The real NCCI formula splits losses into primary and excess, uses ballast and discount ratios, and limits large claims. 1.00 is average. " + DISCLAIMER,
    faq: [
      { question: "What is a good experience mod?", answer: "Below 1.00 — fewer or smaller claims than expected for your industry, which lowers your premium." },
      { question: "How long do claims affect my mod?", answer: "Three policy years, excluding the most recent year." },
    ],
  },
  {
    slug: "defense-base-act-calculator",
    title: "Defense Base Act (DBA) Compensation Calculator",
    description: "Estimate Defense Base Act benefits for overseas contractors — 2/3 of the average weekly wage up to the federal maximum, temporary disability and a scheduled permanent award.",
    metaTitle: "Defense Base Act Calculator — DBA Claim Benefits",
    metaDescription: "Free Defense Base Act calculator. Two-thirds of AWW up to the maximum (200% of the national average weekly wage), TTD and scheduled awards.",
    calcInputs: [
      currencyField("averageWeeklyWage", "Average Weekly Wage (incl. overseas pay)", { default: 3000, max: 20000, step: 10 }),
      currencyField("maximumWeekly", "Maximum Weekly Rate (200% of NAWW)", { default: 3859.62, max: 10000, step: 0.01 }),
      numberField("weeksOffWork", "Weeks of Temporary Total Disability", { default: 20, max: 520 }),
      percentField("impairmentRating", "Impairment / Loss of Use", { default: 10, step: 1 }),
      numberField("scheduleWeeks", "Schedule Weeks (arm 312, leg 288, hand 244…)", { default: 312, max: 1000 }),
      currencyField("futureMedicalEstimate", "Future Medical (optional)", { default: 0, max: 5000000, step: 500 }),
    ],
    calcResult: { label: "Weekly Compensation", format: "currency" },
    calcResults: [
      { key: "weeklyCompensation", label: "Weekly Compensation", format: "currency", highlight: true },
      { key: "temporaryDisabilityTotal", label: "Temporary Disability Total", format: "currency" },
      { key: "scheduledAward", label: "Scheduled Permanent Award", format: "currency" },
      { key: "estimatedClaimValue", label: "Estimated Claim Value", format: "currency" },
    ],
    instructions: "Enter your average weekly wage including overseas premiums and allowances, the federal maximum for your injury date (from the DOL's yearly table), weeks off work and any scheduled loss.",
    examples: `Example: a ${usd(3000)} AWW pays ${usd(exDba.weeklyCompensation)} a week; 20 weeks off and a 10% arm award (312 weeks) total about ${usd(exDba.estimatedClaimValue)}.`,
    assumptions: "Defense Base Act (42 U.S.C. §1651) applies the Longshore Act: 66⅔% of AWW, minimum 50% and maximum 200% of the national average weekly wage set each 1 October (the default is an estimate — check the DOL table for your injury date); scheduled awards under 33 U.S.C. §908(c). " + DISCLAIMER,
    faq: [
      { question: "Who is covered by the Defense Base Act?", answer: "Civilian employees of US government contractors working overseas, on military bases or on public-works contracts outside the US." },
      { question: "Are DBA benefits taxable?", answer: "No — like other workers' compensation, they're tax-free." },
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
