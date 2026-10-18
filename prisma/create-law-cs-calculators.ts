// One-time (but safe to re-run) batch setup script: creates 61 child support calculators
// (Law & Government Calculators > Child Support Calculators): one per US state, a general
// calculator, Canada + Ontario / Alberta / British Columbia, the UK Child Maintenance Service,
// the Philippines, arrears, parenting time and the age support ends. Each state's model, income
// basis and shared-parenting rule live in CS_STATES in src/lib/calc-engine-law-cs.ts; the copy
// and examples are generated from that config so they always match the calculator.
// Merged keywords (covered here, no separate page): every "<State> Child Support & Alimony",
// "<State> 50/50 Custody Child Support" and "joint/shared custody" keyword → that state's page
// (the overnights input handles shared custody); Joy Rosenthal, CSSA, NYS 50/50 → new-york;
// Melson Formula → delaware; Ncchildsupport → north-carolina; Njchildsupport → new-jersey;
// CA Guideline / California Guideline / California Support / CA Support → california; PA Support
// → pennsylvania; Virginia Support → virginia; Illinois Income Shares → illinois; Shared Placement
// Wisconsin → wisconsin; Child Support / Children Support / Family Support / Child Payment and the
// misspellings (Child Suppoet, Child Suppor, Child Suppot, CILD Support) → child-support; 50/50
// Custody Child Support → child-support; Every Other Weekend, Parenting Plan, Parenting Schedule,
// Parent Time, Parenting Percentage and California/Minnesota/Oregon Custody & Parenting Time →
// custody-parenting-time; Back Child Support → arrears; Date of Emancipation → end date; CSA
// Calculator UK / UK child maintenance → uk-child-maintenance.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-cs-calculators.ts
// or
//   npm run db:create-law-cs-calculators

import * as E from "../src/lib/calc-engine-law-cs";

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

const CAT = "child-support-calculators";
const DISCLAIMER = "This is an estimate for planning, not legal advice — the court or child support agency applies the official worksheet, may deviate from the guideline, and decides the order.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const KIDS = (max = 6): [string, number][] => Array.from({ length: max }, (_, i) => [`${i + 1}${i + 1 === max && max === 6 ? "+" : ""}`, i + 1]);
const PAID_BY: [string, number][] = [["Paying parent", 0], ["Receiving parent", 1]];

const RESULTS = [
  { key: "monthlyChildSupport", label: "Estimated Monthly Child Support", format: "currency", highlight: true },
  { key: "basicObligationTotal", label: "Basic Obligation (before split)", format: "currency" },
  { key: "payingParentIncomeShare", label: "Paying Parent's Income Share", format: "percentage" },
  { key: "addOnsPayingParentShare", label: "Paying Parent's Share of Add-Ons", format: "currency" },
  { key: "annualChildSupport", label: "Annual Child Support", format: "currency" },
  { key: "perChildPerMonth", label: "Per Child per Month", format: "currency" },
  { key: "sharedParentingApplied", label: "Shared-Parenting Rule Applied? (1 = yes)", format: "number" },
  { key: "lowIncomeAdjustmentApplied", label: "Low-Income Limit Applied? (1 = yes)", format: "number" },
];

function stateInputs(s: E.CsState) {
  const basis = s.basis === "net" ? "Net" : "Gross";
  const inputs: Record<string, unknown>[] = [
    currencyField("payingParentIncome", `Paying Parent's Monthly ${basis} Income`, { default: s.basis === "net" ? 4700 : 6000, max: 100000, step: 50 }),
  ];
  if (s.model !== "tx") inputs.push(currencyField("otherParentIncome", `Other Parent's Monthly ${basis} Income`, { default: s.basis === "net" ? 2900 : 3500, max: 100000, step: 50 }));
  inputs.push(dropdown("children", "Number of Children", KIDS(s.model === "ca" ? 10 : 6), 2));
  if (s.model !== "tx" && s.model !== "ny" && s.model !== "ms" && s.model !== "nd")
    inputs.push(numberField("payingParentOvernights", "Paying Parent's Overnights per Year", { default: 80, max: 365, unit: "nights" }));
  inputs.push(currencyField("healthInsurance", "Children's Health Insurance Premium (monthly)", { default: 250, max: 5000, step: 10 }));
  inputs.push(dropdown("healthInsurancePaidBy", "Health Insurance Paid By", PAID_BY, 0));
  if (s.model !== "tx") {
    inputs.push(currencyField("childcare", "Work-Related Child Care (monthly)", { default: 600, max: 10000, step: 10 }));
    inputs.push(dropdown("childcarePaidBy", "Child Care Paid By", PAID_BY, 1));
  }
  if (s.model === "shares") inputs.push(currencyField("basicObligationOverride", "Basic Obligation from the State Schedule (optional, 0 = estimate)", { default: 0, max: 50000, step: 1 }));
  if (s.model === "ny") inputs.push(dropdown("applyAboveCap", "Apply % to Income Above the $193,000 Cap?", [["No — cap at $193,000", 0], ["Yes — use all income", 1]], 0));
  return inputs;
}

const exampleValues = (s: E.CsState): Record<string, number> => ({
  payingParentIncome: s.basis === "net" ? 4700 : 6000,
  otherParentIncome: s.basis === "net" ? 2900 : 3500,
  children: 2,
  payingParentOvernights: 80,
  healthInsurance: 250,
  healthInsurancePaidBy: 0,
  childcare: s.model === "tx" ? 0 : 600,
  childcarePaidBy: 1,
  basicObligationOverride: 0,
  applyAboveCap: 0,
});

function modelSummary(s: E.CsState): string {
  switch (s.model) {
    case "tx":
      return `a percentage of the paying parent's net resources — 20% for one child, 25% for two, 30% for three, 35% for four and 40% for five or more — on net resources up to ${usd(E.TX_CAP)} a month`;
    case "ny":
      return `the Child Support Standards Act: 17% of combined parental income for one child, 25% for two, 29% for three, 31% for four and 35% for five or more, on income up to ${usd(E.NY_CAP)}, split by each parent's share`;
    case "wi":
      return "a percentage of the paying parent's gross income — 17% for one child, 25% for two, 29% for three, 31% for four and 34% for five or more, with lower rates on income above $7,000 and $12,500 a month";
    case "nv":
      return "a tiered percentage of the paying parent's gross monthly income — for one child 16% of the first $6,000, 8% of the next $4,000 and 4% above $10,000";
    case "ms":
      return "a percentage of the paying parent's adjusted gross income (after taxes and Social Security) — 14% for one child, 20% for two, 22% for three, 24% for four and 26% for five or more";
    case "ak":
      return "a percentage of the paying parent's adjusted annual income — 20% for one child, 27% for two, 33% for three and 3% more for each extra child";
    case "nd":
      return "a percentage of the paying parent's net income only, from the state's guideline schedule";
    case "ca":
      return "the statewide formula CS = K × [HN − (H%)(TN)], which uses both parents' net disposable incomes and the higher earner's share of parenting time";
    default:
      return `the income shares model: both parents' monthly ${s.basis} incomes are added, the basic child support obligation for that combined income and number of children is found, and each parent pays their percentage share`;
  }
}

function sharedNote(s: E.CsState): string {
  if (s.model === "ca") return "Parenting time is built into the formula through H%, so every overnight counts.";
  if (s.model === "wi") return "Shared placement (at least 92 overnights, 25%) uses the 1.5 formula: each parent's obligation × 150% × the other parent's time, then the two are offset.";
  if (s.model === "nv") return "Joint physical custody (each parent at least 40%, about 146 overnights) offsets the two parents' obligations.";
  if (s.model === "ak") return "Shared custody (at least 30%, 110 overnights) uses the 1.5 formula on each parent's percentage.";
  if (s.shared) return `Shared parenting: when the paying parent has at least ${s.shared[0]} overnights a year, the basic obligation is multiplied by ${s.shared[1]}, each parent's share is multiplied by the other parent's time, and the two amounts are offset.`;
  return `${s.name} doesn't use a simple overnight threshold in this model — parenting-time credits or deviations are applied on the official worksheet, so the estimate assumes the standard schedule.`;
}

function stateTool(s: E.CsState): ToolDef {
  const ex = r(E.stateChildSupport(s), exampleValues(s));
  const basis = s.basis === "net" ? "net" : "gross";
  const estimated = s.model === "shares";
  const exVals = exampleValues(s);
  return {
    slug: s.slug,
    title: `${s.name} Child Support Calculator`,
    description: `Estimate ${s.name} child support for 2026 under ${s.law} — enter both parents' incomes, the number of children, overnights, health insurance and child care to see the monthly amount.`,
    metaTitle: `${s.name} Child Support Calculator 2026 — Guideline Estimate`.slice(0, 70),
    metaDescription: `Free ${s.name} child support calculator. Estimate guideline support from ${basis} income, number of children, parenting time, health insurance and child care.`,
    calcInputs: stateInputs(s),
    calcResult: { label: "Estimated Monthly Child Support", format: "currency" },
    calcResults: RESULTS,
    instructions: `Enter each parent's monthly ${basis} income${s.model === "tx" ? " (Texas uses net resources: income after federal income tax, Social Security and Medicare, and the child's health insurance)" : ""}, the number of children you're calculating support for, and ${s.model === "tx" || s.model === "ny" || s.model === "ms" || s.model === "nd" ? "" : "how many overnights a year the children spend with the paying parent, "}plus the children's health insurance premium and work-related child care with who pays them.${estimated ? ` If you have ${s.name}'s official schedule, type the basic obligation for your combined income into the optional box to replace the estimate.` : ""}`,
    examples: `Example: the paying parent earns ${usd(exVals.payingParentIncome)} a month ${basis}${s.model !== "tx" ? ` and the other parent ${usd(exVals.otherParentIncome)}` : ""}, with 2 children${s.model === "tx" || s.model === "ny" || s.model === "ms" || s.model === "nd" ? "" : " and 80 overnights a year with the paying parent"}, a ${usd(250)} health premium paid by the paying parent${s.model !== "tx" ? ` and ${usd(600)} of child care paid by the other parent` : ""}. Estimated ${s.name} child support: about ${usd(ex.monthlyChildSupport)} a month (${usd(ex.annualChildSupport)} a year).`,
    assumptions: `${s.name} calculates guideline child support with ${modelSummary(s)}. ${sharedNote(s)} Health insurance and child care are split by income share, with a credit for the parent who pays them.${estimated ? " The basic obligation is estimated from a typical income-shares schedule (percentages that fall as income rises); the official schedule can differ by 5–15%, so enter the exact figure if you have it." : ""} A low-income limit leaves the paying parent at least about ${s.basis === "net" ? "$1,330" : "$1,700"} a month (the state's own self-support reserve may differ). Support usually ends at ${s.endAge}${s.endAge === 18 ? " (later if the child is still in high school, depending on the order)" : ""}. ${DISCLAIMER}`,
    faq: [
      { question: `How is child support calculated in ${s.name}?`, answer: `${s.name} uses ${modelSummary(s)}. Health insurance and child care are then added and divided between the parents.` },
      { question: `Does 50/50 custody mean no child support in ${s.name}?`, answer: s.model === "tx" || s.model === "ny" || s.model === "ms" || s.model === "nd" ? `Not necessarily — ${s.name}'s guideline doesn't have an automatic shared-custody formula, so a parent with more income can still owe support; the court may deviate for equal time.` : `Not necessarily — with equal time the higher-earning parent usually still pays the difference between the two parents' shares, just a smaller amount.` },
      { question: `When does child support end in ${s.name}?`, answer: `Usually at age ${s.endAge}; orders can continue while a child finishes high school or for a disabled child, depending on the order and ${s.name} law.` },
    ],
  };
}

// --- General and international pages ---------------------------------------------------------
const genVals = { payingParentIncome: 6000, otherParentIncome: 3500, children: 2, payingParentOvernights: 80, healthInsurance: 250, healthInsurancePaidBy: 0, childcare: 600, childcarePaidBy: 1, basicObligationOverride: 0 };
const exGen = r(E.generalChildSupport, genVals);
const exGen50 = r(E.generalChildSupport, { ...genVals, payingParentOvernights: 182 });
const PROVINCES: [string, number][] = Object.entries(E.PROVINCE_FACTORS).map(([k, [n]]) => [n, Number(k)]);
const caVals = (p: number) => ({ payingParentAnnualIncome: 75000, otherParentAnnualIncome: 45000, children: 2, province: p, section7Expenses: 400, payingParentOvernights: 70 });
const canadaTool = (slug: string, place: string, prov: number | null): ToolDef => {
  const ex = r(E.canadaChildSupport(prov ?? undefined), caVals(prov ?? 0));
  return {
    slug,
    title: `${place} Child Support Calculator`,
    description: `Estimate ${place === "Canada" ? "Canadian" : place} child support under the Federal Child Support Guidelines — the table amount from the paying parent's income, special (section 7) expenses and shared-parenting set-off.`,
    metaTitle: `${place} Child Support Calculator — Federal Guidelines Table`,
    metaDescription: `Free ${place} child support calculator. Estimate the federal table amount by income and number of children, section 7 expenses and the 40% shared parenting set-off.`,
    calcInputs: [
      currencyField("payingParentAnnualIncome", "Paying Parent's Annual Gross Income (CAD)", { default: 75000, max: 1000000, step: 500 }),
      currencyField("otherParentAnnualIncome", "Other Parent's Annual Gross Income (CAD)", { default: 45000, max: 1000000, step: 500 }),
      dropdown("children", "Number of Children", KIDS(), 2),
      ...(prov === null ? [dropdown("province", "Province (where the paying parent lives)", PROVINCES, 0)] : []),
      currencyField("section7Expenses", "Section 7 Special Expenses per Month (child care, extracurricular…)", { default: 400, max: 10000, step: 10 }),
      numberField("payingParentOvernights", "Paying Parent's Overnights per Year", { default: 70, max: 365, unit: "nights" }),
    ],
    calcResult: { label: "Monthly Child Support", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "monthlyChildSupport", label: "Estimated Monthly Child Support", format: "currency", currency: "CAD", highlight: true },
      { key: "tableAmount", label: "Table Amount", format: "currency", currency: "CAD" },
      { key: "section7Share", label: "Paying Parent's Share of Section 7 Expenses", format: "currency", currency: "CAD" },
      { key: "annualChildSupport", label: "Annual Child Support", format: "currency", currency: "CAD" },
      { key: "sharedParentingSetOff", label: "Shared Parenting Set-Off (40%+)? (1 = yes)", format: "number" },
    ],
    instructions: "Enter each parent's annual gross income (line 15000 of the tax return), the number of children and special or extraordinary expenses under section 7. If the paying parent has the children at least 40% of the time (about 146 overnights), the two parents' table amounts are set off.",
    examples: `Example: a paying parent earning $75,000 with 2 children${prov === null ? " in Ontario" : ""} pays a table amount of about $${ex.tableAmount.toLocaleString("en-CA")} a month, plus $${ex.section7Share.toLocaleString("en-CA")} as their share of $400 in section 7 expenses — about $${ex.monthlyChildSupport.toLocaleString("en-CA")} a month.`,
    assumptions: "Approximates the Federal Child Support Tables (which differ slightly by province because of provincial tax): around 11% of gross income for one child, 18% for two, 23–24% for three and 28% for four at middle incomes, lower above $150,000. Section 7 expenses are shared in proportion to income. Quebec uses its own guidelines when both parents live there. Use the official Department of Justice lookup for the exact table amount. " + DISCLAIMER,
    faq: [
      { question: "How much is child support in Canada for one child?", answer: "Roughly 10–11% of the paying parent's gross income at middle incomes, from the federal table for the province where they live." },
      { question: "What are section 7 expenses?", answer: "Special or extraordinary expenses such as child care, health costs over $100 a year, extracurricular activities and post-secondary education, shared in proportion to income." },
    ],
  };
};

const exUk = r(E.ukChildMaintenance, { grossWeeklyIncome: 600, children: 2, otherChildrenInHousehold: 0, overnightsPerYear: 60, onBenefits: 0 });
const exPh = r(E.proportionalSupport, { payingParentIncome: 50000, otherParentIncome: 30000, childMonthlyNeeds: 15000, children: 1 });
const exArr = r(E.childSupportArrears, { monthlySupportOrdered: 800, monthsUnpaid: 18, totalPaid: 3000, interestRatePercent: 9, extraMonthlyPayment: 200 });
const exPt = r(E.parentingTime, { schedule: 2, summerWeeks: 4, extraHolidayNights: 7 });
const exEnd = r(E.emancipation, { childAgeYears: 11, childAgeMonths: 4, endAge: 18, highSchoolExtension: 1, extensionMonths: 12, monthlySupport: 900 });

const TOOLS: ToolDef[] = [
  ...E.CS_STATES.map(stateTool),
  {
    slug: "child-support-calculator",
    title: "Child Support Calculator",
    description: "Estimate child support with the income shares method used by most US states — both parents' incomes, number of children, parenting time (including 50/50 custody), health insurance and child care.",
    metaTitle: "Child Support Calculator 2026 — Estimate Monthly Payments",
    metaDescription: "Free child support calculator. Estimate monthly support from both parents' incomes, number of children, overnights (50/50 custody), health insurance and child care.",
    calcInputs: [
      currencyField("payingParentIncome", "Paying Parent's Monthly Gross Income", { default: 6000, max: 100000, step: 50 }),
      currencyField("otherParentIncome", "Other Parent's Monthly Gross Income", { default: 3500, max: 100000, step: 50 }),
      dropdown("children", "Number of Children", KIDS(), 2),
      numberField("payingParentOvernights", "Paying Parent's Overnights per Year", { default: 80, max: 365, unit: "nights" }),
      currencyField("healthInsurance", "Children's Health Insurance Premium (monthly)", { default: 250, max: 5000, step: 10 }),
      dropdown("healthInsurancePaidBy", "Health Insurance Paid By", PAID_BY, 0),
      currencyField("childcare", "Work-Related Child Care (monthly)", { default: 600, max: 10000, step: 10 }),
      dropdown("childcarePaidBy", "Child Care Paid By", PAID_BY, 1),
      currencyField("basicObligationOverride", "Basic Obligation from Your State's Schedule (optional)", { default: 0, max: 50000, step: 1 }),
    ],
    calcResult: { label: "Estimated Monthly Child Support", format: "currency" },
    calcResults: RESULTS,
    instructions: "Enter both parents' monthly gross incomes, the number of children, how many nights a year the children stay with the paying parent, and the health insurance and child care costs. For your state's exact rules, use its own calculator in this category.",
    examples: `Example: incomes of ${usd(6000)} and ${usd(3500)} with 2 children and 80 overnights give about ${usd(exGen.monthlyChildSupport)} a month. With 50/50 custody (182 overnights) it drops to about ${usd(exGen50.monthlyChildSupport)}.`,
    assumptions: "Income shares: combined income → estimated basic obligation from a typical schedule (about 20% of combined income for one child at low incomes, falling to under 10% at very high incomes; ×1.45 for two children, ×1.7 for three), split by income share. With 110+ overnights (30%) the common 1.5 cross-credit formula is applied. A few states use a percentage of the paying parent's income instead (e.g. Texas, New York, Wisconsin, Nevada). " + DISCLAIMER,
    faq: [
      { question: "How is child support calculated?", answer: "Most states add both parents' incomes, look up the basic support for that income and number of children, and have each parent pay their share; parenting time, health insurance and child care then adjust it." },
      { question: "Do you pay child support with 50/50 custody?", answer: "Often yes — the higher earner usually pays a reduced amount to balance the children's living standard in both homes." },
    ],
  },
  canadaTool("canada-child-support-calculator", "Canada", null),
  canadaTool("ontario-child-support-calculator", "Ontario", 0),
  canadaTool("alberta-child-support-calculator", "Alberta", 1),
  canadaTool("british-columbia-child-support-calculator", "British Columbia", 2),
  {
    slug: "uk-child-maintenance-calculator",
    title: "UK Child Maintenance Calculator (CMS)",
    description: "Estimate UK child maintenance with the Child Maintenance Service rates — the paying parent's gross weekly income, number of children, other children at home and shared care nights.",
    metaTitle: "UK Child Maintenance Calculator — CMS Rates & Shared Care",
    metaDescription: "Free UK child maintenance calculator. CMS flat, reduced, basic and basic plus rates with shared care reductions — weekly, monthly and yearly amounts.",
    calcInputs: [
      currencyField("grossWeeklyIncome", "Paying Parent's Gross Weekly Income (£)", { default: 600, max: 10000, step: 5 }),
      dropdown("children", "Children Maintenance Is For", [["1", 1], ["2", 2], ["3 or more", 3]], 2),
      dropdown("otherChildrenInHousehold", "Other Children the Paying Parent Supports at Home", [["None", 0], ["1", 1], ["2", 2], ["3 or more", 3]], 0),
      numberField("overnightsPerYear", "Nights a Year the Children Stay with the Paying Parent", { default: 60, max: 365, unit: "nights" }),
      dropdown("onBenefits", "Paying Parent on Qualifying Benefits?", [["No", 0], ["Yes", 1]], 0),
    ],
    calcResult: { label: "Weekly Child Maintenance", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "weeklyChildMaintenance", label: "Weekly Child Maintenance", format: "currency", currency: "GBP", highlight: true },
      { key: "monthlyChildMaintenance", label: "Monthly Equivalent", format: "currency", currency: "GBP" },
      { key: "annualChildMaintenance", label: "Yearly Total", format: "currency", currency: "GBP" },
      { key: "sharedCareReductionPercent", label: "Shared Care Reduction", format: "percentage" },
      { key: "rateBand", label: "Rate Band (0 nil, 1 flat, 2 reduced, 3 basic, 4 basic plus)", format: "number" },
    ],
    instructions: "Enter the paying parent's gross weekly income (before tax, after pension contributions), how many children the maintenance is for, other children living with the paying parent, and the average number of nights a year the children stay with them.",
    examples: `Example: £600 a week gross for 2 children with 60 nights of shared care is about £${exUk.weeklyChildMaintenance} a week (£${exUk.monthlyChildMaintenance} a month) after a ${exUk.sharedCareReductionPercent}% shared care reduction.`,
    assumptions: "CMS rates: nil under £7 a week; flat £7 (income £7–£100 or certain benefits); reduced rate £7 + 17/25/31% of income between £100 and £200; basic rate 12/16/19% of gross weekly income up to £800; basic plus adds 9/12/15% on income from £800 to £3,000. Other children at home reduce income by 11/14/16%. Shared care: 52–103 nights −1/7, 104–155 −2/7, 156–174 −3/7, 175+ −1/2 and £7 per child. Collect & Pay adds fees. " + DISCLAIMER,
    faq: [
      { question: "How much child maintenance should I pay in the UK?", answer: "On the basic rate, 12% of gross weekly income for one child, 16% for two and 19% for three or more, reduced for shared care." },
      { question: "Does shared care reduce child maintenance?", answer: "Yes — from one seventh off at 52 nights a year up to half (plus £7 per child) at 175 nights or more." },
    ],
  },
  {
    slug: "philippines-child-support-calculator",
    title: "Philippines Child Support Calculator",
    description: "Estimate child support in the Philippines under the Family Code — the child's monthly needs shared between the parents in proportion to their income.",
    metaTitle: "Philippines Child Support Calculator — Family Code Estimate",
    metaDescription: "Free Philippines child support calculator. Share the child's monthly needs (food, school, medical, shelter) between parents in proportion to income.",
    calcInputs: [
      currencyField("payingParentIncome", "Paying Parent's Monthly Income (₱)", { default: 50000, max: 2000000, step: 500 }),
      currencyField("otherParentIncome", "Other Parent's Monthly Income (₱)", { default: 30000, max: 2000000, step: 500 }),
      currencyField("childMonthlyNeeds", "Monthly Needs per Child (₱)", { default: 15000, max: 500000, step: 500 }),
      numberField("children", "Number of Children", { default: 1, min: 1, max: 10 }),
    ],
    calcResult: { label: "Monthly Child Support", format: "currency", currency: "PHP" },
    calcResults: [
      { key: "monthlyChildSupport", label: "Estimated Monthly Support", format: "currency", currency: "PHP", highlight: true },
      { key: "payingParentSharePercent", label: "Paying Parent's Share", format: "percentage" },
      { key: "totalChildNeeds", label: "Total Children's Needs", format: "currency", currency: "PHP" },
      { key: "percentOfPayerIncome", label: "Support as % of Payer's Income", format: "percentage" },
    ],
    instructions: "Add up what each child needs per month — food, shelter, clothing, schooling, medical care and transport — and enter both parents' monthly incomes.",
    examples: `Example: ₱15,000 a month of needs with parents earning ₱50,000 and ₱30,000 means the paying parent's share is about ₱${exPh.monthlyChildSupport.toLocaleString("en-PH")} (${exPh.payingParentSharePercent}%).`,
    assumptions: "Articles 194–201 of the Family Code: support covers what is indispensable for sustenance, dwelling, clothing, medical care, education and transport, in proportion to the giver's resources and the recipient's needs. There's no fixed percentage table; courts weigh both. RA 9262 cases may add other relief. " + DISCLAIMER,
    faq: [
      { question: "How much is child support in the Philippines?", answer: "There's no fixed percentage — it's proportionate to the parent's means and the child's needs, and can be increased or reduced as either changes." },
      { question: "Can child support be demanded without a court case?", answer: "A written demand can start the obligation, but enforcement usually requires a petition in court." },
    ],
  },
  {
    slug: "child-support-arrears-calculator",
    title: "Child Support Arrears Calculator",
    description: "Calculate back child support owed — missed payments, payments made, interest on the arrears, and how long it takes to pay off with an extra monthly payment.",
    metaTitle: "Child Support Arrears Calculator — Back Child Support & Interest",
    metaDescription: "Free back child support calculator. Add up unpaid support, subtract payments, add interest and see the payoff time with an extra monthly amount.",
    calcInputs: [
      currencyField("monthlySupportOrdered", "Monthly Support Ordered", { default: 800, max: 20000, step: 10 }),
      numberField("monthsUnpaid", "Months Covered", { default: 18, max: 360, unit: "months" }),
      currencyField("totalPaid", "Total Paid During Those Months", { default: 3000, max: 2000000, step: 10 }),
      percentField("interestRatePercent", "State Interest Rate on Arrears", { default: 9, max: 20, step: 0.25 }),
      currencyField("extraMonthlyPayment", "Extra Monthly Payment Toward Arrears", { default: 200, max: 10000, step: 10 }),
    ],
    calcResult: { label: "Total Arrears", format: "currency" },
    calcResults: [
      { key: "totalArrears", label: "Total Arrears (with interest)", format: "currency", highlight: true },
      { key: "unpaidSupport", label: "Unpaid Support", format: "currency" },
      { key: "interest", label: "Interest", format: "currency" },
      { key: "monthsToPayOff", label: "Months to Pay Off", format: "number" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment (current + arrears)", format: "currency" },
    ],
    instructions: "Enter the monthly amount in the order, how many months you're checking, and what was actually paid. Set the interest rate your state charges on child support debt (0 in states that don't charge it).",
    examples: `Example: ${usd(800)} a month for 18 months with ${usd(3000)} paid leaves ${usd(exArr.unpaidSupport)} unpaid; at 9% interest the total is about ${usd(exArr.totalArrears)}, paid off in ${exArr.monthsToPayOff} months at ${usd(200)} extra a month.`,
    assumptions: "Simple interest from each missed month's due date (average half the period). States differ: some charge none, others 6–12% a year, and payments are usually applied to current support first. The agency's ledger is the official balance; arrears can't be discharged in bankruptcy. " + DISCLAIMER,
    faq: [
      { question: "Does child support arrears accrue interest?", answer: "In many states yes — often 6% to 12% a year — while others charge none." },
      { question: "Is there a time limit to collect back child support?", answer: "Most states allow collection for many years after the child turns 18, and some have no limit at all." },
    ],
  },
  {
    slug: "custody-parenting-time-calculator",
    title: "Custody & Parenting Time Calculator",
    description: "Work out each parent's overnights and parenting time percentage from a custody schedule — every other weekend, midweek visits, 50/50, 60/40 or 70/30 — plus summer and holidays.",
    metaTitle: "Parenting Time Calculator — Overnights & Custody Percentage",
    metaDescription: "Free parenting time calculator. Pick a custody schedule (every other weekend, 2-2-3, 60/40, 70/30), add summer and holidays, and get overnights and %.",
    calcInputs: [
      dropdown("schedule", "Regular Schedule for This Parent", E.SCHEDULES.map(([l], i) => [l, i] as [string, number]), 2),
      numberField("summerWeeks", "Extra Summer Weeks with This Parent", { default: 4, max: 12, unit: "weeks" }),
      numberField("extraHolidayNights", "Extra Holiday Overnights per Year", { default: 7, max: 60, unit: "nights" }),
    ],
    calcResult: { label: "Overnights per Year", format: "number" },
    calcResults: [
      { key: "overnightsPerYear", label: "Overnights per Year", format: "number", highlight: true },
      { key: "parentingTimePercent", label: "Parenting Time", format: "percentage" },
      { key: "otherParentOvernights", label: "Other Parent's Overnights", format: "number" },
      { key: "regularScheduleOvernights", label: "From the Regular Schedule", format: "number" },
      { key: "overnightsPerMonth", label: "Overnights per Month (average)", format: "number" },
    ],
    instructions: "Pick the regular schedule for the parent you're checking, then add the summer weeks and extra holiday nights they get beyond the regular schedule. Use the overnights in your state's child support calculator.",
    examples: `Example: every other weekend plus one midweek overnight, 4 summer weeks and 7 holiday nights is about ${exPt.overnightsPerYear} overnights — ${exPt.parentingTimePercent}% parenting time.`,
    assumptions: "Every other weekend = 26 weekends a year; a weekly midweek overnight = 52 nights. Summer weeks replace the regular schedule for those weeks. Many states use overnights to apply shared-parenting adjustments (for example 73 in Florida, 92 in Wisconsin, 128 in Maryland, 146 in Illinois). " + DISCLAIMER,
    faq: [
      { question: "How many overnights is every other weekend?", answer: "About 52 a year for Friday–Sunday, or 78 if the weekend runs to Monday morning." },
      { question: "What percentage is 50/50 custody?", answer: "182 or 183 overnights a year — 50% for each parent." },
    ],
  },
  {
    slug: "child-support-end-date-calculator",
    title: "When Does Child Support End? Calculator",
    description: "Find out when child support ends — years and months left until the child reaches the age of emancipation in your state (18, 19 or 21), with an optional high school extension, and the total still due.",
    metaTitle: "When Does Child Support End? — Emancipation Date Calculator",
    metaDescription: "Free calculator for when child support stops. Enter the child's age and your state's emancipation age (18, 19 or 21) to see the months and total left.",
    calcInputs: [
      numberField("childAgeYears", "Child's Age — Years", { default: 11, max: 25 }),
      numberField("childAgeMonths", "Child's Age — Months", { default: 4, max: 11 }),
      dropdown("endAge", "Age Support Ends in Your State", [["18 (most states)", 18], ["19 (Alabama, Colorado, Indiana, Nebraska)", 19], ["21 (Mississippi, Missouri, New York, DC)", 21]], 18),
      dropdown("highSchoolExtension", "Extend While Still in High School?", [["No", 0], ["Yes", 1]], 1),
      numberField("extensionMonths", "Months of Extension", { default: 12, max: 24, unit: "months" }),
      currencyField("monthlySupport", "Monthly Support Amount", { default: 900, max: 20000, step: 10 }),
    ],
    calcResult: { label: "Years Until Support Ends", format: "number" },
    calcResults: [
      { key: "yearsUntilSupportEnds", label: "Years Until Support Ends", format: "number", highlight: true },
      { key: "monthsUntilSupportEnds", label: "Months Until Support Ends", format: "number" },
      { key: "supportEndAge", label: "Age Support Ends", format: "number" },
      { key: "remainingSupportTotal", label: "Total Support Still to Pay", format: "currency" },
    ],
    instructions: "Enter the child's current age, your state's age of emancipation and whether support continues while the child finishes high school (many states continue to 19 or graduation).",
    examples: `Example: a child aged 11 years 4 months in an 18 state with a high school extension: support ends at ${exEnd.supportEndAge}, in about ${exEnd.monthsUntilSupportEnds} months — ${usd(exEnd.remainingSupportTotal)} more at ${usd(900)} a month.`,
    assumptions: "Most states end support at 18 (often extended to graduation, typically no later than 19); Alabama, Colorado (19), Indiana (19), Nebraska (19), Mississippi, Missouri, New York and DC (21) differ, and support for a disabled child or college can continue by order. Arrears remain owed after support ends. " + DISCLAIMER,
    faq: [
      { question: "Does child support end automatically at 18?", answer: "Not always — many orders run to high school graduation, and the paying parent may need to ask the agency or court to close the case." },
      { question: "Do I still owe back support after the child turns 18?", answer: "Yes. Arrears stay due until they're paid, often with interest." },
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
