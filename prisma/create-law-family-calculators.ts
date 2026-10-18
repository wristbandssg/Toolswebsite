// One-time (but safe to re-run) batch setup script: creates 31 alimony, divorce and probate
// calculators (Law & Government Calculators > Alimony, Divorce & Probate Calculators).
// Formulas live in src/lib/calc-engine-law-family.ts; the examples below are computed from that
// engine so they always match the calculator.
// State policy (user decision): separate alimony pages only for states with a guideline formula
// (IL, CO, NY, MA, PA, TX, CA, FL, NH, VA); every other state's alimony keyword is covered by the
// general alimony-calculator (Ohio, North Carolina, Utah, Arizona, New Jersey, Maryland, Nevada,
// Oregon, Georgia, Wisconsin, Michigan, Minnesota, Washington, Tennessee, Connecticut, South
// Carolina, Kansas, Iowa, Alabama, New Mexico, Louisiana, Kentucky, Missouri, Oklahoma, Maine,
// Indiana, Idaho, Nebraska, West Virginia, Arkansas, Mississippi, Delaware, Montana, South Dakota,
// Rhode Island). Also merged: Child Support & Alimony, Spousal / Spouse Support / Spousal.support,
// X Spouse, Maintanance, NC Post Separation Support → alimony; Illinois Maintenance → illinois;
// Temporary Maintenance NY → new-york; Arizona Spousal Maintenance → alimony; every state Divorce
// Settlement keyword, Divorce Calculator and Equitable Distribution → divorce-settlement; Coverture
// Fraction, Majauskas Formula, Nelson Formula → qdro; How Long Have You Been Married → length of
// marriage; Statutory Fee → california-probate; Probate & Estate (generic) → probate; Wirasat →
// islamic-inheritance; Illinois Probate & Estate (estate tax) is the existing illinois-estate-tax.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-family-calculators.ts
// or
//   npm run db:create-law-family-calculators

import * as E from "../src/lib/calc-engine-law-family";

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

const CAT = "alimony-divorce-probate-calculators";
const DISCLAIMER = "This is an estimate for planning, not legal advice — courts and probate offices apply the law to your facts and can deviate from any guideline.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];

const ALIMONY_RESULTS = (extra: Record<string, unknown>[] = []) => [
  { key: "monthlyAlimony", label: "Estimated Monthly Alimony", format: "currency", highlight: true },
  { key: "annualAlimony", label: "Annual Alimony", format: "currency" },
  { key: "suggestedTermMonths", label: "Suggested Duration (months)", format: "number" },
  { key: "totalOverTerm", label: "Total Over the Term", format: "currency" },
  { key: "percentOfPayorIncome", label: "Share of Payor's Income", format: "percentage" },
  ...extra,
];

interface AlimonySpec {
  slug: string;
  state: string;
  basis: "gross" | "net";
  fn: E.CustomCalculator;
  law: string;
  formula: string;
  duration: string;
  extraInputs?: Record<string, unknown>[];
  extraResults?: Record<string, unknown>[];
  exampleExtra?: Record<string, number>;
  faq: { question: string; answer: string }[];
}

function alimonyTool(s: AlimonySpec): ToolDef {
  const basis = s.basis === "net" ? "Net" : "Gross";
  const ex = r(s.fn, { payorIncome: s.basis === "net" ? 7000 : 9000, payeeIncome: s.basis === "net" ? 2500 : 3000, marriageYears: 12, ...(s.exampleExtra ?? {}) });
  const isGeneral = s.state === "General";
  return {
    slug: s.slug,
    title: isGeneral ? "Alimony Calculator" : `${s.state} Alimony Calculator`,
    description: isGeneral
      ? "Estimate alimony (spousal support) with the formula used as a starting point in many states — the monthly amount from both spouses' incomes and a suggested duration from the length of the marriage."
      : `Estimate ${s.state} alimony (spousal support / maintenance) under ${s.law} — the guideline monthly amount from both spouses' incomes and the suggested duration for your length of marriage.`,
    metaTitle: (isGeneral ? "Alimony Calculator 2026 — Spousal Support Estimate" : `${s.state} Alimony Calculator — Spousal Support Guideline`).slice(0, 70),
    metaDescription: isGeneral
      ? "Free alimony calculator. Estimate monthly spousal support and how long it lasts from both incomes and the length of the marriage."
      : `Free ${s.state} alimony calculator. Estimate guideline spousal support from both incomes and the length of the marriage under ${s.law}.`,
    calcInputs: [
      currencyField("payorIncome", `Higher-Earning Spouse's Monthly ${basis} Income`, { default: s.basis === "net" ? 7000 : 9000, max: 200000, step: 50 }),
      currencyField("payeeIncome", `Lower-Earning Spouse's Monthly ${basis} Income`, { default: s.basis === "net" ? 2500 : 3000, max: 200000, step: 50 }),
      numberField("marriageYears", "Length of Marriage (years, to filing)", { default: 12, max: 60, step: 0.5, unit: "years" }),
      ...(s.extraInputs ?? []),
    ],
    calcResult: { label: "Estimated Monthly Alimony", format: "currency" },
    calcResults: ALIMONY_RESULTS(s.extraResults),
    instructions: `Enter each spouse's monthly ${basis.toLowerCase()} income and how long you were married${isGeneral ? "" : ` (${s.state} measures it to the date the divorce was filed)`}. Alimony isn't automatic — the court first decides whether support is appropriate, then uses the guideline as a starting point.`,
    examples: `Example: monthly ${basis.toLowerCase()} incomes of ${usd(s.basis === "net" ? 7000 : 9000)} and ${usd(s.basis === "net" ? 2500 : 3000)} after a 12-year marriage give about ${usd(ex.monthlyAlimony)} a month for about ${ex.suggestedTermMonths} months.`,
    assumptions: `${s.formula} ${s.duration} Since 2019, alimony isn't deductible for the payer or taxable for the recipient on federal returns (for divorces finalized after 2018). ${DISCLAIMER}`,
    faq: s.faq,
  };
}

const CS_PAID = dropdown("childSupportPaid", "Is Child Support Also Being Paid?", YESNO, 0);
const SHORTFALL = currencyField("payeeMonthlyShortfall", "Lower Earner's Reasonable Monthly Need Not Covered (0 = not limited)", { default: 0, max: 100000, step: 50 });

const ALIMONY: AlimonySpec[] = [
  {
    slug: "alimony-calculator", state: "General", basis: "gross", fn: E.alimonyGeneral, law: "the AAML formula",
    formula: "Uses the American Academy of Matrimonial Lawyers recommendation: 30% of the payer's gross income minus 20% of the recipient's, capped so the recipient ends up with no more than 40% of the couple's combined gross income. Most states have no fixed formula, so this is a common starting point.",
    duration: "Suggested term: marriage length × 30% (under 3 years), 40% (3–10), 60% (10–20) or 80% (20+ — often open-ended).",
    extraResults: [{ key: "cappedAt40Percent", label: "40% Cap Applied? (1 = yes)", format: "number" }],
    faq: [
      { question: "How is alimony calculated?", answer: "Most states weigh need, ability to pay, the length of the marriage and the standard of living; a few use formulas. A common starting point is 30% of the payer's income minus 20% of the recipient's." },
      { question: "How long does alimony last?", answer: "Often 30–50% of the marriage length for medium marriages, longer or open-ended after 20 years." },
    ],
  },
  {
    slug: "illinois-alimony-calculator", state: "Illinois", basis: "net", fn: E.alimonyIllinois, law: "750 ILCS 5/504(b-1)",
    formula: "Illinois guideline maintenance (combined gross income under $500,000, payer not already paying another family): 33.33% of the payer's net income minus 25% of the recipient's net income, limited so the recipient's net income plus maintenance doesn't exceed 40% of the combined net income.",
    duration: "Duration = marriage length × a factor from .20 (under 5 years) rising .04 a year to .80 (19–20 years); 20+ years: permanent or equal to the length of the marriage.",
    extraResults: [{ key: "cappedAt40Percent", label: "40% Cap Applied? (1 = yes)", format: "number" }, { key: "durationFactorPercent", label: "Duration Factor", format: "percentage" }],
    faq: [
      { question: "How is maintenance calculated in Illinois?", answer: "33.33% of the payer's net income minus 25% of the recipient's net, capped so the recipient doesn't exceed 40% of combined net income." },
      { question: "How long is maintenance in Illinois?", answer: "A percentage of the marriage length — 20% for marriages under 5 years up to 80% at 19–20 years; at 20 years or more it can be permanent." },
    ],
  },
  {
    slug: "colorado-alimony-calculator", state: "Colorado", basis: "gross", fn: E.alimonyColorado, law: "C.R.S. §14-10-114",
    formula: "Colorado's advisory guideline (marriages of 3+ years, combined adjusted gross income up to $240,000 a year): 40% of the combined monthly adjusted gross income minus the lower earner's income.",
    duration: "Term from the statute's table: about 31% of the months married at 3 years, rising to 50% at 20 years (interpolated here); over 20 years the court can set a term or leave it open.",
    extraResults: [{ key: "guidelineApplies", label: "Guideline Applies (≤ $240k combined)? (1 = yes)", format: "number" }, { key: "termPercentOfMarriage", label: "Term as % of Marriage", format: "percentage" }],
    faq: [
      { question: "How is spousal maintenance calculated in Colorado?", answer: "40% of the couple's combined monthly gross income minus the lower earner's income, for combined incomes up to $240,000 a year." },
      { question: "Is there maintenance for short marriages in Colorado?", answer: "The guideline doesn't apply to marriages under 3 years, though the court can still award maintenance." },
    ],
  },
  {
    slug: "new-york-alimony-calculator", state: "New York", basis: "gross", fn: E.alimonyNewYork, law: "DRL §236(B)(6)",
    formula: `New York post-divorce maintenance (income after FICA and NYC tax): with child support, 20% of the payer's income minus 25% of the recipient's; without, 30% minus 20%. That's compared with 40% of combined income minus the recipient's income, and the lower figure is used. Payer income counts up to the ${usd(E.NY_MAINT_CAP)} cap (from 1 March 2026). Temporary maintenance uses the same formula.`,
    duration: "Advisory duration: 15–30% of the marriage length for marriages up to 15 years, 30–40% for 15–20 years, 35–50% over 20 years (the midpoint is shown).",
    extraInputs: [CS_PAID],
    extraResults: [{ key: "shortestTermMonths", label: "Shortest Advisory Term (months)", format: "number" }, { key: "longestTermMonths", label: "Longest Advisory Term (months)", format: "number" }],
    faq: [
      { question: "What is the maintenance cap in New York?", answer: `${usd(E.NY_MAINT_CAP)} of the payer's income from 1 March 2026; the court may consider income above it.` },
      { question: "Is temporary maintenance different from post-divorce maintenance in NY?", answer: "The formula is the same; temporary maintenance runs during the case, and post-divorce maintenance follows the advisory duration schedule." },
    ],
  },
  {
    slug: "massachusetts-alimony-calculator", state: "Massachusetts", basis: "gross", fn: E.alimonyMassachusetts, law: "the Alimony Reform Act (G.L. c.208 §53)",
    formula: "Massachusetts general term alimony should generally not exceed the recipient's need or 30–35% of the difference between the spouses' gross incomes.",
    duration: "Durational limits: up to 50% of the months married for marriages of 5 years or less, 60% for 5–10 years, 70% for 10–15 and 80% for 15–20; over 20 years it can be indefinite. Alimony generally ends at full retirement age.",
    extraInputs: [percentField("percentOfDifference", "Percent of Income Difference (30–35%)", { default: 33, max: 35, step: 0.5 })],
    extraResults: [{ key: "lowEndOfRange", label: "Low End (30%)", format: "currency" }, { key: "highEndOfRange", label: "High End (35%)", format: "currency" }, { key: "indefiniteTerm", label: "Indefinite Term Possible? (1 = yes)", format: "number" }],
    exampleExtra: { percentOfDifference: 33 },
    faq: [
      { question: "How is alimony calculated in Massachusetts?", answer: "Generally no more than 30–35% of the difference between the spouses' gross incomes, and not more than the recipient's need." },
      { question: "Does alimony end at retirement in Massachusetts?", answer: "General term alimony generally ends when the payer reaches full Social Security retirement age." },
    ],
  },
  {
    slug: "pennsylvania-alimony-calculator", state: "Pennsylvania", basis: "net", fn: E.alimonyPennsylvania, law: "Pa.R.C.P. 1910.16-4",
    formula: "Pennsylvania spousal support and alimony pendente lite: 40% of the difference between the spouses' monthly net incomes, or — when child support is also paid — 30% of the difference after subtracting the child support.",
    duration: "Post-divorce alimony has no formula; a common rule of thumb is about half the length of the marriage, shown here.",
    extraInputs: [currencyField("childSupport", "Monthly Child Support Paid by the Higher Earner (0 if none)", { default: 0, max: 50000, step: 10 })],
    extraResults: [{ key: "childSupportDeducted", label: "Child Support Version Used? (1 = yes)", format: "number" }],
    exampleExtra: { childSupport: 0 },
    faq: [
      { question: "How is spousal support calculated in Pennsylvania?", answer: "40% of the difference in net incomes without children, or 30% of the difference after child support when there are children." },
      { question: "What is alimony pendente lite?", answer: "Support paid while the divorce is pending, calculated with the same guideline formula." },
    ],
  },
  {
    slug: "texas-alimony-calculator", state: "Texas", basis: "gross", fn: E.alimonyTexas, law: "Texas Family Code §8.055",
    formula: "Texas spousal maintenance is capped at the lesser of $5,000 a month or 20% of the payer's average monthly gross income, and can't exceed the recipient's minimum reasonable needs. It's generally available only after 10+ years of marriage (or family violence, or a disability).",
    duration: "Maximum duration: 5 years for 10–20-year marriages, 7 years for 20–30 and 10 years for 30+.",
    extraInputs: [SHORTFALL, dropdown("otherGround", "Family Violence or Disability Ground?", YESNO, 0)],
    extraResults: [{ key: "eligible", label: "Eligible? (1 = yes)", format: "number" }, { key: "statutoryCap", label: "Statutory Cap", format: "currency" }],
    exampleExtra: { payeeMonthlyShortfall: 0, otherGround: 0 },
    faq: [
      { question: "How much is alimony in Texas?", answer: "At most the lesser of $5,000 a month or 20% of the payer's average monthly gross income." },
      { question: "Do you have to be married 10 years for alimony in Texas?", answer: "Usually yes, unless there was family violence or the spouse has a disability or cares for a disabled child." },
    ],
  },
  {
    slug: "california-alimony-calculator", state: "California", basis: "net", fn: E.alimonyCalifornia, law: "the Santa Clara temporary support guideline",
    formula: "California temporary (pendente lite) spousal support is commonly estimated as 40% of the higher earner's net income minus 50% of the lower earner's, after child support. Long-term support has no formula and is set under Family Code §4320 factors.",
    duration: "Rule of thumb for marriages under 10 years: half the length of the marriage; marriages of 10+ years are 'long duration' with no set end date.",
    extraInputs: [currencyField("childSupport", "Monthly Child Support Paid by the Higher Earner (0 if none)", { default: 0, max: 50000, step: 10 })],
    extraResults: [{ key: "longMarriageNoSetEnd", label: "Long-Duration Marriage (10+ yrs)? (1 = yes)", format: "number" }],
    exampleExtra: { childSupport: 0 },
    faq: [
      { question: "How is spousal support calculated in California?", answer: "Temporary support often uses 40% of the higher earner's net minus 50% of the lower earner's net; permanent support is decided by the §4320 factors." },
      { question: "How long does spousal support last in California?", answer: "Generally about half the length of marriages under 10 years; for longer marriages the court keeps jurisdiction with no set end." },
    ],
  },
  {
    slug: "florida-alimony-calculator", state: "Florida", basis: "net", fn: E.alimonyFlorida, law: "Florida Statutes §61.08 (2023 reform)",
    formula: "Florida durational alimony is limited to the lesser of the recipient's reasonable need or 35% of the difference between the spouses' net incomes. Permanent alimony was abolished in 2023.",
    duration: "Maximum duration: 50% of the marriage for 3–10 years, 60% for 10–20 years and 75% for 20+ years; no durational alimony for marriages under 3 years.",
    extraInputs: [SHORTFALL],
    extraResults: [{ key: "maxDurationPercent", label: "Maximum Duration (% of marriage)", format: "percentage" }],
    exampleExtra: { payeeMonthlyShortfall: 0 },
    faq: [
      { question: "Is there permanent alimony in Florida?", answer: "No — the 2023 law ended permanent alimony; durational alimony is capped by the length of the marriage." },
      { question: "How much is alimony in Florida?", answer: "No more than the recipient's reasonable need or 35% of the difference in net incomes, whichever is less." },
    ],
  },
  {
    slug: "new-hampshire-alimony-calculator", state: "New Hampshire", basis: "gross", fn: E.alimonyNewHampshire, law: "RSA 458:19-a",
    formula: "New Hampshire term alimony is the lesser of the recipient's reasonable need or 23% of the difference between the spouses' gross incomes.",
    duration: "Term alimony can last up to 50% of the length of the marriage.",
    extraInputs: [SHORTFALL],
    exampleExtra: { payeeMonthlyShortfall: 0 },
    faq: [
      { question: "How is alimony calculated in New Hampshire?", answer: "23% of the difference between the spouses' gross incomes, but not more than the recipient's reasonable need." },
      { question: "How long does alimony last in New Hampshire?", answer: "Up to half the length of the marriage, unless the court finds a reason to deviate." },
    ],
  },
  {
    slug: "virginia-alimony-calculator", state: "Virginia", basis: "gross", fn: E.alimonyVirginia, law: "Va. Code §16.1-278.17:1 (pendente lite guideline)",
    formula: "Virginia temporary spousal support (combined income up to $10,000 a month): 28% of the payer's gross income minus 58% of the recipient's; when child support is also paid, 26% minus 50%. Final support is set by the §20-107.1 factors.",
    duration: "No statutory duration — a common rule of thumb is about half the length of the marriage for marriages under 20 years.",
    extraInputs: [CS_PAID],
    extraResults: [{ key: "childSupportVersion", label: "Child Support Version Used? (1 = yes)", format: "number" }],
    faq: [
      { question: "How is spousal support calculated in Virginia?", answer: "Temporary support uses 28% of the payer's gross minus 58% of the recipient's (26% − 50% with child support); final support is based on statutory factors." },
      { question: "Does Virginia have a formula for permanent alimony?", answer: "No — the guideline is for temporary support; the final award weighs the factors in §20-107.1." },
    ],
  },
];

// --- Examples for the other tools -------------------------------------------------------------
const exDiv = r(E.divorceSettlement, { maritalAssets: 620000, maritalDebts: 140000, propertyRegime: 1, spouseAPercent: 55, assetsKeptBySpouseA: 380000, debtsTakenBySpouseA: 60000, separatePropertyA: 25000 });
const exMm = r(E.mooreMarsden, { purchasePrice: 400000, valueAtMarriage: 450000, valueNow: 750000, principalPaidDuringMarriage: 60000, loanBalanceNow: 240000 });
const exQ = r(E.coverture, { monthlyPensionBenefit: 3200, monthsServiceDuringMarriage: 180, totalMonthsOfService: 300, percentAwarded: 50 });
const exSo = r(E.smithOstler, { grossBonus: 30000, taxRatePercent: 38, childSupportPercent: 12, spousalSupportPercent: 15 });
const exMl = r(E.marriageLength, { marriageYears: 8, marriageMonths: 5 });
const exPc = r(E.probateCost, { estateValue: 500000, attorneyBilling: 0, attorneyPercent: 3, attorneyHours: 0, hourlyRate: 0, executorPercent: 2, courtFees: 1200, appraisalAndOther: 2500, bondPremiumPercent: 0 });
const exEf = r(E.executorFeeGeneral, { estateValue: 750000, state: 1, reasonablePercent: 3, numberOfExecutors: 1 });
const exCa = r(E.californiaProbate, { grossEstateValue: 900000, attorneyToo: 1, courtCosts: 1500 });
const exTr = r(E.californiaTrusteeFee, { trustAssets: 1500000, annualFeePercent: 1, yearsAdministering: 2 });
const exFl = r(E.floridaAttorney, { inventoryValue: 600000 });
const exFlpr = r(E.floridaPr, { estateValue: 600000 });
const exNy = r(E.newYorkExecutor, { estateValue: 1200000, numberOfExecutors: 1 });
const exNj = r(E.newJerseyExecutor, { estateValue: 800000, incomeCollected: 20000, numberOfExecutors: 1 });
const exOr = r(E.oregonPr, { estateValue: 450000, nonProbateTaxableProperty: 0 });
const exPa = r(E.pennsylvaniaExecutor, { estateValue: 600000, numberOfExecutors: 1 });
const exVa = r(E.virginiaProbateTax, { estateValue: 400000, localTax: 1, clerkFees: 0 });
const exMi = r(E.michiganInventory, { inventoryValue: 300000, liensOnRealEstate: 50000 });
const exNyi = r(E.newYorkIntestacy, { estateValue: 450000, spouse: 1, children: 2, livingParents: 0, siblings: 0 });
const exIs = r(E.islamicInheritance, { netEstate: 120000, spouse: 2, numberOfWives: 1, sons: 1, daughters: 2, father: 0, mother: 1 });
const exCb = r(E.conservatorshipBond, { personalProperty: 300000, annualIncome: 40000, annualPublicBenefits: 18000, cushionPercent: 10, premiumRatePercent: 0.5, minimumPremium: 250 });

const ESTATE = (key = "estateValue", label = "Estate Value", def = 500000) => currencyField(key, label, { default: def, max: 100000000, step: 1000 });
const FEE_RESULTS = [
  { key: "executorFee", label: "Executor / Personal Representative Fee", format: "currency", highlight: true },
  { key: "percentOfEstate", label: "Fee as % of the Estate", format: "percentage" },
  { key: "perExecutor", label: "Per Executor", format: "currency" },
  { key: "estateAfterFee", label: "Estate After the Fee", format: "currency" },
];
const EXECUTORS = numberField("numberOfExecutors", "Number of Executors", { default: 1, min: 1, max: 5 });

const TOOLS: ToolDef[] = [
  ...ALIMONY.map(alimonyTool),
  {
    slug: "divorce-settlement-calculator",
    title: "Divorce Settlement Calculator",
    description: "Estimate a divorce property settlement — the marital estate after debts, each spouse's share under community property (50/50) or equitable distribution, and the equalization payment one spouse owes the other.",
    metaTitle: "Divorce Settlement Calculator — Property Division & Buyout",
    metaDescription: "Free divorce settlement calculator. Split marital assets and debts 50/50 (community property) or by an equitable percentage and find the equalization payment.",
    calcInputs: [
      currencyField("maritalAssets", "Total Marital Assets (home equity, accounts, retirement, vehicles)", { default: 620000, max: 50000000, step: 1000 }),
      currencyField("maritalDebts", "Total Marital Debts", { default: 140000, max: 50000000, step: 1000 }),
      dropdown("propertyRegime", "Your State's System", [["Community property (CA, TX, AZ, NV, NM, WA, ID, LA, WI) — 50/50", 0], ["Equitable distribution (all other states)", 1]], 1),
      percentField("spouseAPercent", "Spouse A's Share (equitable states)", { default: 55, step: 1 }),
      currencyField("assetsKeptBySpouseA", "Marital Assets Spouse A Keeps", { default: 380000, max: 50000000, step: 1000 }),
      currencyField("debtsTakenBySpouseA", "Marital Debts Spouse A Takes", { default: 60000, max: 50000000, step: 1000 }),
      currencyField("separatePropertyA", "Spouse A's Separate Property (not divided)", { default: 25000, max: 50000000, step: 1000 }),
    ],
    calcResult: { label: "Spouse A's Share", format: "currency" },
    calcResults: [
      { key: "spouseAShare", label: "Spouse A's Share of the Marital Estate", format: "currency", highlight: true },
      { key: "spouseBShare", label: "Spouse B's Share", format: "currency" },
      { key: "netMaritalEstate", label: "Net Marital Estate", format: "currency" },
      { key: "equalizationPayment", label: "Equalization Payment A → B (negative = B pays A)", format: "currency" },
      { key: "spouseATotalWithSeparate", label: "Spouse A's Total incl. Separate Property", format: "currency" },
    ],
    instructions: "List everything acquired during the marriage — home equity, bank and retirement accounts, vehicles, business value — and all marital debts. Then enter what Spouse A would keep. The equalization payment is what Spouse A pays Spouse B (or receives) to reach the agreed split.",
    examples: `Example: ${usd(620000)} of assets and ${usd(140000)} of debt in an equitable state split 55/45: Spouse A's share is ${usd(exDiv.spouseAShare)}. If A keeps ${usd(380000)} of assets and ${usd(60000)} of debt, A owes B ${usd(exDiv.equalizationPayment)}.`,
    assumptions: "Community property states generally divide community property equally; equitable distribution states divide fairly (not always equally) based on factors like income, contributions and length of marriage. Separate property (owned before marriage, gifts, inheritances) usually isn't divided. Taxes on retirement accounts and sale costs aren't deducted. " + DISCLAIMER,
    faq: [
      { question: "Is everything split 50/50 in a divorce?", answer: "Only in community property states as a rule; most states use equitable distribution, which can be 50/50 or another fair split." },
      { question: "What is an equalization payment?", answer: "A payment from one spouse to the other so each ends up with their agreed share when they keep different assets." },
    ],
  },
  {
    slug: "moore-marsden-calculator",
    title: "Moore-Marsden Calculator",
    description: "Calculate the community and separate property interests in a California home bought before marriage with the Moore/Marsden formula — community principal paydown plus its share of appreciation during the marriage.",
    metaTitle: "Moore-Marsden Calculator — California Separate Property Home",
    metaDescription: "Free Moore/Marsden calculator. Split a premarital home into community and separate interests from principal paid during marriage and appreciation.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 400000, max: 50000000, step: 1000 }),
      currencyField("valueAtMarriage", "Value on the Date of Marriage", { default: 450000, max: 50000000, step: 1000 }),
      currencyField("valueNow", "Value at Division (trial/separation)", { default: 750000, max: 50000000, step: 1000 }),
      currencyField("principalPaidDuringMarriage", "Loan Principal Paid with Community Funds", { default: 60000, max: 50000000, step: 500 }),
      currencyField("loanBalanceNow", "Loan Balance Now", { default: 240000, max: 50000000, step: 500 }),
    ],
    calcResult: { label: "Community Interest", format: "currency" },
    calcResults: [
      { key: "communityInterest", label: "Community Property Interest", format: "currency", highlight: true },
      { key: "separateInterest", label: "Separate Property Interest", format: "currency" },
      { key: "eachSpouseCommunityShare", label: "Each Spouse's Half of the Community Interest", format: "currency" },
      { key: "communityPercent", label: "Community Percentage", format: "percentage" },
      { key: "totalEquity", label: "Total Equity", format: "currency" },
    ],
    instructions: "Enter the original purchase price, the home's value when you married and now, the principal (not interest) paid on the mortgage with marital earnings, and today's loan balance.",
    examples: `Example: a ${usd(400000)} home worth ${usd(450000)} at marriage and ${usd(750000)} now, with ${usd(60000)} of principal paid during the marriage: the community interest is ${usd(exMm.communityInterest)} (${usd(exMm.eachSpouseCommunityShare)} each) and the separate interest ${usd(exMm.separateInterest)}.`,
    assumptions: "In re Marriage of Moore (1980) and Marsden (1982): community % = community principal reduction ÷ purchase price; community interest = that principal + community % × appreciation during marriage; pre-marriage appreciation stays separate. Refinancing, Epstein/Watts credits and improvements can change the result. " + DISCLAIMER,
    faq: [
      { question: "What is a Moore-Marsden interest?", answer: "The community's share in one spouse's separate-property home, earned when marital money paid down the mortgage principal." },
      { question: "Does mortgage interest paid during marriage count?", answer: "No — only principal reduction creates a Moore/Marsden interest." },
    ],
  },
  {
    slug: "qdro-calculator",
    title: "QDRO & Coverture Fraction Calculator",
    description: "Estimate a former spouse's share of a pension in divorce — the coverture (marital) fraction of service during the marriage times the percentage awarded, as used in QDROs (Majauskas and Nelson formulas).",
    metaTitle: "QDRO Calculator — Pension Coverture Fraction in Divorce",
    metaDescription: "Free QDRO / coverture fraction calculator. Months of service during the marriage ÷ total service × percent awarded = the former spouse's monthly pension share.",
    calcInputs: [
      currencyField("monthlyPensionBenefit", "Monthly Pension Benefit at Retirement", { default: 3200, max: 100000, step: 10 }),
      numberField("monthsServiceDuringMarriage", "Months of Service During the Marriage", { default: 180, max: 600, unit: "months" }),
      numberField("totalMonthsOfService", "Total Months of Service at Retirement", { default: 300, min: 1, max: 600, unit: "months" }),
      percentField("percentAwarded", "Percent of the Marital Portion Awarded", { default: 50, step: 5 }),
    ],
    calcResult: { label: "Former Spouse's Monthly Share", format: "currency" },
    calcResults: [
      { key: "formerSpouseMonthlyShare", label: "Former Spouse's Monthly Share", format: "currency", highlight: true },
      { key: "covertureFractionPercent", label: "Coverture Fraction", format: "percentage" },
      { key: "maritalPortion", label: "Marital Portion of the Pension", format: "currency" },
      { key: "employeeKeepsMonthly", label: "Employee Keeps per Month", format: "currency" },
      { key: "formerSpouseAnnualShare", label: "Former Spouse's Yearly Share", format: "currency" },
    ],
    instructions: "Enter the expected monthly pension, the months of credited service between marriage and the cut-off date (separation or divorce, depending on your state), and the total months of service at retirement.",
    examples: `Example: a ${usd(3200)} pension with 180 of 300 months earned during the marriage has a ${exQ.covertureFractionPercent}% coverture fraction; 50% of that is ${usd(exQ.formerSpouseMonthlyShare)} a month.`,
    assumptions: "Coverture fraction = marital months of service ÷ total months of service (Majauskas v. Majauskas in New York, In re Marriage of Nelson and similar 'time rule' cases elsewhere). Defined-contribution plans (401k) are usually divided by account balance instead. Survivor benefits and COLAs depend on the QDRO wording. " + DISCLAIMER,
    faq: [
      { question: "What is a QDRO?", answer: "A Qualified Domestic Relations Order — the court order that tells a retirement plan to pay part of a member's benefit to a former spouse." },
      { question: "What is the coverture fraction?", answer: "The share of the pension earned during the marriage: months of service while married divided by total months of service." },
    ],
  },
  {
    slug: "smith-ostler-calculator",
    title: "Smith-Ostler Calculator (Bonus Support)",
    description: "Estimate Smith-Ostler support on bonuses and variable income in California — the percentage of each net bonus paid as additional child and spousal support.",
    metaTitle: "Smith-Ostler Calculator — Support on Bonus Income",
    metaDescription: "Free Smith-Ostler calculator. Apply child and spousal support percentages to net bonus income to see the additional support due.",
    calcInputs: [
      currencyField("grossBonus", "Gross Bonus / Variable Income", { default: 30000, max: 10000000, step: 500 }),
      percentField("taxRatePercent", "Tax Withheld on the Bonus", { default: 38, max: 70 }),
      percentField("childSupportPercent", "Child Support % of Net Bonus (from your order)", { default: 12, step: 0.5 }),
      percentField("spousalSupportPercent", "Spousal Support % of Net Bonus (from your order)", { default: 15, step: 0.5 }),
    ],
    calcResult: { label: "Additional Support Due", format: "currency" },
    calcResults: [
      { key: "additionalSupportDue", label: "Additional Support Due", format: "currency", highlight: true },
      { key: "childSupportFromBonus", label: "Child Support from the Bonus", format: "currency" },
      { key: "spousalSupportFromBonus", label: "Spousal Support from the Bonus", format: "currency" },
      { key: "netBonus", label: "Net Bonus", format: "currency" },
      { key: "payorKeeps", label: "Payer Keeps", format: "currency" },
    ],
    instructions: "Enter the bonus before tax, the tax withheld, and the Smith-Ostler percentages in your order (often listed as a table by bonus amount — use the rate that applies).",
    examples: `Example: a ${usd(30000)} bonus with 38% withheld leaves ${usd(exSo.netBonus)}; at 12% child support and 15% spousal support, ${usd(exSo.additionalSupportDue)} more support is due.`,
    assumptions: "In re Marriage of Ostler & Smith (1990): support on irregular income is ordered as a percentage of each payment received rather than averaged into base support. Percentages usually step down for larger bonuses and are set by your order or DissoMaster schedule. " + DISCLAIMER,
    faq: [
      { question: "What is a Smith-Ostler order?", answer: "A California order requiring a percentage of bonuses, commissions or other variable income to be paid as extra support when received." },
      { question: "How often is Smith-Ostler support paid?", answer: "Usually within a set number of days after each bonus is received, with a yearly reconciliation." },
    ],
  },
  {
    slug: "length-of-marriage-calculator",
    title: "Length of Marriage Calculator",
    description: "Find how long you've been married in years and months and how close you are to the 10- and 20-year marks that matter in divorce — Social Security spousal benefits, military 10/10 and 20/20/20 rules, and alimony duration.",
    metaTitle: "How Long Have You Been Married? — Marriage Length Calculator",
    metaDescription: "Free length of marriage calculator. See years and months married and how long until the 10-year (Social Security, military 10/10) and 20-year marks.",
    calcInputs: [
      numberField("marriageYears", "Years Married", { default: 8, max: 80 }),
      numberField("marriageMonths", "Plus Months", { default: 5, max: 11 }),
    ],
    calcResult: { label: "Years Married", format: "number" },
    calcResults: [
      { key: "yearsMarried", label: "Years Married (decimal)", format: "number", highlight: true },
      { key: "monthsMarried", label: "Months Married", format: "number" },
      { key: "monthsToTenYears", label: "Months to the 10-Year Mark", format: "number" },
      { key: "monthsToTwentyYears", label: "Months to the 20-Year Mark", format: "number" },
      { key: "reachedTenYears", label: "Reached 10 Years? (1 = yes)", format: "number" },
    ],
    instructions: "Enter how long you've been married up to the date that matters for your question (usually the divorce filing or final decree date).",
    examples: `Example: married 8 years and 5 months — ${exMl.monthsToTenYears} months short of 10 years, the minimum for divorced-spouse Social Security benefits.`,
    assumptions: "Key marks: 10 years for divorced-spouse Social Security benefits and the military 10/10 direct-payment rule; 10 years for Texas maintenance eligibility; 20 years of marriage, service and overlap for military 20/20/20 benefits. States measure marriage length to separation, filing or decree differently. " + DISCLAIMER,
    faq: [
      { question: "Why does 10 years of marriage matter?", answer: "After 10 years a divorced spouse can claim Social Security on the ex's record, and DFAS can pay a military pension share directly." },
      { question: "Does separation stop the clock?", answer: "In some states (like California) the date of separation ends the marriage for property purposes; in others it's the filing or decree." },
    ],
  },
  {
    slug: "probate-calculator",
    title: "Probate Calculator — Cost of Probate",
    description: "Estimate the cost of probate — attorney fees (percentage or hourly), executor fees, court filing fees, appraisals and bond — and what's left for the heirs.",
    metaTitle: "Probate Calculator — Estimate Probate Costs & Fees",
    metaDescription: "Free probate cost calculator. Add attorney, executor, court, appraisal and bond costs to see total probate cost and the net to heirs.",
    calcInputs: [
      ESTATE(),
      dropdown("attorneyBilling", "Attorney Billing", [["Percentage of estate", 0], ["Hourly", 1]], 0),
      percentField("attorneyPercent", "Attorney Fee %", { default: 3, max: 10, step: 0.25 }),
      numberField("attorneyHours", "Attorney Hours (if hourly)", { default: 0, max: 1000 }),
      currencyField("hourlyRate", "Attorney Hourly Rate", { default: 0, max: 2000, step: 5 }),
      percentField("executorPercent", "Executor Fee %", { default: 2, max: 10, step: 0.25 }),
      currencyField("courtFees", "Court Filing & Publication Fees", { default: 1200, max: 50000, step: 50 }),
      currencyField("appraisalAndOther", "Appraisal, Accounting & Other Costs", { default: 2500, max: 500000, step: 50 }),
      percentField("bondPremiumPercent", "Probate Bond Premium % (0 if waived)", { default: 0, max: 5, step: 0.1 }),
    ],
    calcResult: { label: "Total Probate Cost", format: "currency" },
    calcResults: [
      { key: "totalProbateCost", label: "Total Probate Cost", format: "currency", highlight: true },
      { key: "attorneyFees", label: "Attorney Fees", format: "currency" },
      { key: "executorFees", label: "Executor Fees", format: "currency" },
      { key: "courtAndOtherCosts", label: "Court & Other Costs", format: "currency" },
      { key: "percentOfEstate", label: "Cost as % of the Estate", format: "percentage" },
      { key: "netToHeirs", label: "Net to Heirs", format: "currency" },
    ],
    instructions: "Enter the gross value of the probate estate (assets in the deceased's name alone — not joint accounts, life insurance or accounts with beneficiaries). For states with fee schedules (California, Florida, New York…) use their calculators in this category.",
    examples: `Example: a ${usd(500000)} estate with a 3% attorney fee, 2% executor fee and ${usd(3700)} of court and other costs costs about ${usd(exPc.totalProbateCost)} (${exPc.percentOfEstate}%) to probate.`,
    assumptions: "Probate typically costs 3–8% of the estate. Executors can waive their fee; a will can waive the bond. Estate and inheritance taxes, debts and the time value of a 9–18-month process aren't included. " + DISCLAIMER,
    faq: [
      { question: "How much does probate cost?", answer: "Usually 3–8% of the estate's value in fees and costs, more in states with statutory fee schedules or contested estates." },
      { question: "Which assets avoid probate?", answer: "Assets in a living trust, joint accounts with survivorship, and accounts or policies with named beneficiaries pass outside probate." },
    ],
  },
  {
    slug: "executor-fee-calculator",
    title: "Executor Fee Calculator",
    description: "Estimate an executor's fee (personal representative commission) using the statutory schedule for California, New York, Florida, New Jersey, Oregon or Pennsylvania's Johnson schedule — or a reasonable percentage elsewhere.",
    metaTitle: "Executor Fee Calculator — Commission by State Schedule",
    metaDescription: "Free executor fee calculator. Statutory commissions for CA, NY, FL, NJ, OR and PA, or a reasonable-fee percentage for other states.",
    calcInputs: [ESTATE("estateValue", "Estate Value", 750000), dropdown("state", "State / Fee Rule", E.EXECUTOR_STATES, 1), percentField("reasonablePercent", "Reasonable Fee % (other states)", { default: 3, max: 10, step: 0.25 }), EXECUTORS],
    calcResult: { label: "Executor Fee", format: "currency" },
    calcResults: FEE_RESULTS,
    instructions: "Enter the value of the estate the executor administers and pick the state whose rule applies. In states without a schedule, courts allow 'reasonable compensation' — often 2–5% depending on size and work.",
    examples: `Example: a ${usd(750000)} estate in New York pays a commission of about ${usd(exEf.executorFee)} (${exEf.percentOfEstate}%).`,
    assumptions: "Schedules: California 4/3/2/1/0.5%; New York SCPA 2307 5/4/3/2.5/2%; Florida 3/2.5/2/1.5%; New Jersey 5/3.5/2% of corpus; Oregon 7/4/3/2%; Pennsylvania Johnson schedule 5% of the first $100,000 declining. Executor fees are taxable income to the executor. " + DISCLAIMER,
    faq: [
      { question: "How much does an executor get paid?", answer: "Depends on the state — commonly 2–5% of the estate, set by statute in some states and by 'reasonableness' in others." },
      { question: "Can a family member executor refuse the fee?", answer: "Yes. Many family executors waive the fee because it's taxable income while an inheritance usually isn't." },
    ],
  },
  {
    slug: "california-probate-calculator",
    title: "California Probate Calculator (Statutory Fees)",
    description: "Calculate California's statutory probate fees for the executor and the attorney — 4% of the first $100,000, 3% of the next $100,000, 2% of the next $800,000 and so on — and the total cost of probate.",
    metaTitle: "California Probate Calculator — Statutory Executor & Attorney Fees",
    metaDescription: "Free California probate fee calculator. Statutory fees under Probate Code §10800 and §10810 for the executor and attorney, plus court costs.",
    calcInputs: [ESTATE("grossEstateValue", "Gross Probate Estate Value (no debts subtracted)", 900000), dropdown("attorneyToo", "Attorney Paid the Statutory Fee Too?", [["Yes", 1], ["No", 0]], 1), currencyField("courtCosts", "Court Filing, Publication & Referee Costs", { default: 1500, max: 100000, step: 50 })],
    calcResult: { label: "Total Probate Cost", format: "currency" },
    calcResults: [
      { key: "totalProbateCost", label: "Total Probate Cost", format: "currency", highlight: true },
      { key: "executorStatutoryFee", label: "Executor Statutory Fee", format: "currency" },
      { key: "attorneyStatutoryFee", label: "Attorney Statutory Fee", format: "currency" },
      { key: "percentOfEstate", label: "Total as % of the Estate", format: "percentage" },
      { key: "aboveScheduleCourtSetsFee", label: "Estate Over $25M (court sets fee)? (1 = yes)", format: "number" },
    ],
    instructions: "Enter the gross value of the probate estate as appraised — California fees are based on gross value, so the mortgage on a house isn't subtracted. Executor and attorney each receive the same statutory amount.",
    examples: `Example: a ${usd(900000)} estate pays ${usd(exCa.executorStatutoryFee)} to the executor and the same to the attorney — about ${usd(exCa.totalProbateCost)} with court costs (${exCa.percentOfEstate}%).`,
    assumptions: "Probate Code §10800 (executor) and §10810 (attorney): 4% of the first $100,000, 3% of the next $100,000, 2% of the next $800,000, 1% of the next $9 million, 0.5% of the next $15 million; above $25 million the court sets a reasonable amount. Extraordinary services can be paid extra. Assets passing outside probate don't count. " + DISCLAIMER,
    faq: [
      { question: "Are California probate fees based on gross or net value?", answer: "Gross — a $900,000 house with a $600,000 mortgage still counts as $900,000." },
      { question: "Can the executor waive the statutory fee?", answer: "Yes, and many family executors do; the attorney's fee can't be raised above the statute without court approval for extraordinary services." },
    ],
  },
  {
    slug: "california-trustee-fee-calculator",
    title: "California Trustee Fee Calculator",
    description: "Estimate a reasonable trustee fee for a California trust — an annual percentage of trust assets (often about 1%) — and compare it with California's statutory probate fee.",
    metaTitle: "California Trustee Fee Calculator — Reasonable Compensation",
    metaDescription: "Free California trustee fee calculator. Estimate yearly trustee compensation as a % of trust assets and compare it with statutory probate fees.",
    calcInputs: [currencyField("trustAssets", "Trust Assets", { default: 1500000, max: 100000000, step: 1000 }), percentField("annualFeePercent", "Annual Fee % (often 0.75–1.5%)", { default: 1, max: 5, step: 0.05 }), numberField("yearsAdministering", "Years Administering", { default: 2, min: 0, max: 50, step: 0.5, unit: "years" })],
    calcResult: { label: "Annual Trustee Fee", format: "currency" },
    calcResults: [
      { key: "annualTrusteeFee", label: "Annual Trustee Fee", format: "currency", highlight: true },
      { key: "totalTrusteeFee", label: "Total Over the Period", format: "currency" },
      { key: "monthlyEquivalent", label: "Monthly Equivalent", format: "currency" },
      { key: "compareStatutoryExecutorFee", label: "Statutory Probate Executor Fee (for comparison)", format: "currency" },
    ],
    instructions: "Enter the value of the trust assets, the annual percentage the trust document sets (or a reasonable rate if it's silent) and how long the trust will be administered.",
    examples: `Example: a ${usd(1500000)} trust at 1% a year pays ${usd(exTr.annualTrusteeFee)} a year — ${usd(exTr.totalTrusteeFee)} over 2 years, compared with a ${usd(exTr.compareStatutoryExecutorFee)} statutory probate fee.`,
    assumptions: "California has no statutory trustee fee: Probate Code §15681 allows the fee set in the trust, otherwise 'reasonable compensation' (§15681(b)); professional trustees often charge about 1% a year, family trustees often less or hourly. Beneficiaries can challenge unreasonable fees. " + DISCLAIMER,
    faq: [
      { question: "How much should a trustee be paid in California?", answer: "Whatever the trust says; if it's silent, a reasonable fee — commonly around 1% of assets a year for professional trustees." },
      { question: "Is a trustee fee taxable?", answer: "Yes, trustee compensation is taxable income to the trustee." },
    ],
  },
  {
    slug: "florida-probate-attorney-fee-calculator",
    title: "Florida Probate Attorney Fee Calculator",
    description: "Calculate the presumed reasonable Florida probate attorney fee under §733.6171 — $1,500 to $3,000 for small estates and 3% declining to 1% for larger ones — plus the personal representative's fee.",
    metaTitle: "Florida Probate Attorney Fee Calculator — §733.6171 Schedule",
    metaDescription: "Free Florida probate attorney fee calculator. Presumed reasonable attorney fee and personal representative commission from the estate's inventory value.",
    calcInputs: [ESTATE("inventoryValue", "Inventory Value + Income Earned", 600000)],
    calcResult: { label: "Attorney Fee", format: "currency" },
    calcResults: [
      { key: "attorneyFee", label: "Presumed Attorney Fee", format: "currency", highlight: true },
      { key: "personalRepresentativeFee", label: "Personal Representative Fee", format: "currency" },
      { key: "combinedFees", label: "Combined Fees", format: "currency" },
      { key: "percentOfEstate", label: "Combined as % of the Estate", format: "percentage" },
    ],
    instructions: "Enter the inventory value of the probate estate plus income the estate earned during administration (exempt homestead isn't included).",
    examples: `Example: a ${usd(600000)} estate has a presumed attorney fee of ${usd(exFl.attorneyFee)} and a personal representative fee of ${usd(exFl.personalRepresentativeFee)} — ${usd(exFl.combinedFees)} in total.`,
    assumptions: "§733.6171: $1,500 up to $40,000; $2,250 to $70,000; $3,000 to $100,000; 3% of the value from $100,000 to $1 million, plus 2.5% of value from $1–3 million, 2% from $3–5 million, 1.5% from $5–10 million and 1% above $10 million. Extraordinary services can be billed extra. PR fee from §733.617. " + DISCLAIMER,
    faq: [
      { question: "How much does a probate attorney cost in Florida?", answer: "The presumed reasonable fee is $1,500–$3,000 for estates up to $100,000 and 3% of estates from $100,000 to $1 million." },
      { question: "Is the Florida attorney fee mandatory?", answer: "It's a presumed reasonable fee — the attorney and personal representative can agree to a different fee." },
    ],
  },
  {
    slug: "florida-personal-representative-fee-calculator",
    title: "Florida Personal Representative Fee Calculator",
    description: "Calculate a Florida personal representative's (executor's) fee under §733.617 — 3% of the first $1 million, 2.5% of the next $4 million, 2% of the next $5 million and 1.5% above $10 million.",
    metaTitle: "Florida Executor Fee Calculator — Personal Representative §733.617",
    metaDescription: "Free Florida personal representative fee calculator using the §733.617 schedule (3%, 2.5%, 2%, 1.5%).",
    calcInputs: [ESTATE("estateValue", "Inventory Value + Income Earned", 600000)],
    calcResult: { label: "Personal Representative Fee", format: "currency" },
    calcResults: FEE_RESULTS,
    instructions: "Enter the inventory value of the probate estate plus income earned during administration. Co-representatives share the fee unless the estate is over $100,000, where each may get the full fee.",
    examples: `Example: a ${usd(600000)} estate pays the personal representative ${usd(exFlpr.executorFee)} (${exFlpr.percentOfEstate}%).`,
    assumptions: "§733.617: 3% of the first $1,000,000; 2.5% of the next $4,000,000; 2% of the next $5,000,000; 1.5% above $10,000,000; extra for extraordinary services. Fees are taxable to the personal representative. " + DISCLAIMER,
    faq: [
      { question: "How much does an executor get in Florida?", answer: "3% of the first $1 million of the probate estate, less on larger estates." },
      { question: "Can two personal representatives each get the full fee?", answer: "For estates over $100,000, each of two representatives may receive the full statutory fee; more than two share two fees." },
    ],
  },
  {
    slug: "new-york-executor-fee-calculator",
    title: "New York Executor Fee Calculator",
    description: "Calculate New York executor commissions under SCPA §2307 — 5% of the first $100,000, 4% of the next $200,000, 3% of the next $700,000, 2.5% of the next $4 million and 2% above $5 million.",
    metaTitle: "New York Executor Fee Calculator — SCPA 2307 Commissions",
    metaDescription: "Free NY executor commission calculator using SCPA §2307 rates, including full commissions for up to three executors on estates over $300,000.",
    calcInputs: [ESTATE("estateValue", "Value of Property Received and Paid Out", 1200000), EXECUTORS],
    calcResult: { label: "Executor Commission", format: "currency" },
    calcResults: [...FEE_RESULTS, { key: "commissionPerFullShare", label: "One Full Commission", format: "currency" }],
    instructions: "Enter the value of the property the executor receives and pays out (not real estate that passes directly unless sold). For estates over $300,000, up to three executors can each receive a full commission.",
    examples: `Example: a ${usd(1200000)} estate pays one executor ${usd(exNy.executorFee)} (${exNy.percentOfEstate}%).`,
    assumptions: "SCPA §2307: 5% on the first $100,000, 4% on the next $200,000, 3% on the next $700,000, 2.5% on the next $4,000,000 and 2% above $5,000,000. Estates of $300,000+ pay full commissions to up to three fiduciaries; a will can set different terms. " + DISCLAIMER,
    faq: [
      { question: "How much is an executor fee in NY?", answer: "Under SCPA 2307 it's 5% of the first $100,000, declining to 2% for amounts over $5 million." },
      { question: "Does real estate count toward the NY commission?", answer: "Generally only if the executor sells it or collects its rents; real property that passes directly to heirs is excluded." },
    ],
  },
  {
    slug: "new-jersey-executor-fee-calculator",
    title: "New Jersey Executor Fee Calculator",
    description: "Calculate New Jersey executor commissions under N.J.S.A. 3B:18-14 — 5% of the first $200,000 of corpus, 3.5% up to $1 million and 2% above — plus 6% of income collected.",
    metaTitle: "New Jersey Executor Fee Calculator — N.J.S.A. 3B:18-14",
    metaDescription: "Free NJ executor commission calculator. Corpus commission (5%, 3.5%, 2%) plus the 6% income commission.",
    calcInputs: [ESTATE("estateValue", "Corpus (estate principal)", 800000), currencyField("incomeCollected", "Income Collected by the Estate", { default: 20000, max: 10000000, step: 100 }), EXECUTORS],
    calcResult: { label: "Executor Commission", format: "currency" },
    calcResults: [...FEE_RESULTS, { key: "corpusCommission", label: "Corpus Commission", format: "currency" }, { key: "incomeCommission", label: "Income Commission (6%)", format: "currency" }],
    instructions: "Enter the value of the estate's principal (corpus) and the income the estate collected during administration (interest, dividends, rents).",
    examples: `Example: an ${usd(800000)} estate with ${usd(20000)} of income pays commissions of about ${usd(exNj.executorFee)} (${usd(exNj.corpusCommission)} corpus + ${usd(exNj.incomeCommission)} income).`,
    assumptions: "N.J.S.A. 3B:18-14: corpus commission 5% on the first $200,000, 3.5% on the excess up to $1,000,000, 2% above $1,000,000; income commission 6%. Co-executors share the commission unless the will or court provides otherwise. " + DISCLAIMER,
    faq: [
      { question: "How much does an executor get in New Jersey?", answer: "5% of the first $200,000 of the estate, 3.5% up to $1 million and 2% above, plus 6% of income collected." },
      { question: "Is the NJ commission automatic?", answer: "It's the statutory maximum — beneficiaries can agree to it or the court approves it in an accounting." },
    ],
  },
  {
    slug: "oregon-personal-representative-fee-calculator",
    title: "Oregon Personal Representative Fee Calculator",
    description: "Calculate an Oregon personal representative's fee under ORS 116.173 — 7% of the first $1,000, 4% to $10,000, 3% to $50,000 and 2% above — plus 1% of taxable nonprobate property.",
    metaTitle: "Oregon Personal Representative Fee Calculator — ORS 116.173",
    metaDescription: "Free Oregon executor fee calculator using the ORS 116.173 schedule, including 1% of non-probate property reportable for estate tax.",
    calcInputs: [ESTATE("estateValue", "Probate Estate (incl. income and gains)", 450000), currencyField("nonProbateTaxableProperty", "Non-Probate Property Reportable for Estate Tax (excl. life insurance)", { default: 0, max: 100000000, step: 1000 })],
    calcResult: { label: "Personal Representative Fee", format: "currency" },
    calcResults: [...FEE_RESULTS, { key: "nonProbateCommission", label: "Commission on Non-Probate Property (1%)", format: "currency" }],
    instructions: "Enter the probate estate's value including income and realized gains, and any non-probate property that must be reported for Oregon or federal estate tax (life insurance excluded).",
    examples: `Example: a ${usd(450000)} probate estate pays the personal representative about ${usd(exOr.executorFee)} (${exOr.percentOfEstate}%).`,
    assumptions: "ORS 116.173: 7% of the first $1,000; 4% from $1,000 to $10,000; 3% from $10,000 to $50,000; 2% above $50,000; plus 1% of non-probate property reportable for estate tax. The court can allow more for extraordinary services, and a will can set other terms. " + DISCLAIMER,
    faq: [
      { question: "How much does an executor get paid in Oregon?", answer: "By statute: 7% of the first $1,000, 4% of the next $9,000, 3% of the next $40,000 and 2% of the rest, plus 1% of certain non-probate property." },
      { question: "Can an Oregon PR be paid hourly instead?", answer: "Yes — ORS 113.038 lets the court approve a different method if the statutory fee would be inadequate." },
    ],
  },
  {
    slug: "pennsylvania-executor-fee-calculator",
    title: "Pennsylvania Executor Fee Calculator",
    description: "Estimate a Pennsylvania executor's commission with the Johnson Estate guideline courts use — 5% of the first $100,000 declining to 0.5% — and compare it with a flat 3%.",
    metaTitle: "Pennsylvania Executor Fee Calculator — Johnson Estate Schedule",
    metaDescription: "Free PA executor fee calculator using the Johnson Estate guideline (5%, 4%, 3%, 2% …) and a 3% comparison for reasonable compensation.",
    calcInputs: [ESTATE("estateValue", "Gross Estate Value", 600000), EXECUTORS],
    calcResult: { label: "Executor Commission", format: "currency" },
    calcResults: [...FEE_RESULTS, { key: "threePercentAlternative", label: "Flat 3% for Comparison", format: "currency" }],
    instructions: "Enter the gross value of the estate the executor administers. Pennsylvania law only requires 'reasonable and just' compensation, so the Johnson schedule is a starting point.",
    examples: `Example: a ${usd(600000)} estate gives a Johnson-schedule commission of about ${usd(exPa.executorFee)} (${exPa.percentOfEstate}%), versus ${usd(exPa.threePercentAlternative)} at 3%.`,
    assumptions: "20 Pa.C.S. §3537 allows reasonable compensation; the In re Johnson's Estate guideline is 5% on the first $100,000, 4% on the next $100,000, 3% on the next $800,000, 2% on the next $1 million, 1.5% on the next $1.5 million, 1% on the next $1 million and 0.5% above. Courts have also treated 3% as prima facie reasonable (Estate of Harper). " + DISCLAIMER,
    faq: [
      { question: "What is a reasonable executor fee in Pennsylvania?", answer: "Courts look at the work done; the Johnson schedule (5% of the first $100,000, declining) and about 3% of the estate are common benchmarks." },
      { question: "Does Pennsylvania have a statutory executor fee?", answer: "No fixed statutory schedule — only 'reasonable and just' compensation under §3537." },
    ],
  },
  {
    slug: "virginia-probate-tax-calculator",
    title: "Virginia Probate Tax Calculator",
    description: "Calculate Virginia's probate tax — 10 cents per $100 of estate value over $15,000, plus the local probate tax of one third of the state tax — when a will is probated or an administrator qualifies.",
    metaTitle: "Virginia Probate Tax Calculator — State & Local §58.1-1712",
    metaDescription: "Free Virginia probate tax calculator: $0.10 per $100 over $15,000 plus the local one-third tax, with the effective rate.",
    calcInputs: [ESTATE("estateValue", "Probate Estate Value", 400000), dropdown("localTax", "Locality Charges the Local Probate Tax?", [["Yes", 1], ["No", 0]], 1), currencyField("clerkFees", "Clerk Filing Fees (optional)", { default: 0, max: 10000, step: 5 })],
    calcResult: { label: "Total Probate Tax", format: "currency" },
    calcResults: [
      { key: "totalProbateTax", label: "Total Probate Tax", format: "currency", highlight: true },
      { key: "stateProbateTax", label: "State Probate Tax", format: "currency" },
      { key: "localProbateTax", label: "Local Probate Tax", format: "currency" },
      { key: "effectiveRatePercent", label: "Effective Rate", format: "percentage" },
    ],
    instructions: "Enter the value of the estate passing through probate (not jointly owned property or assets with beneficiaries). The tax is paid to the circuit court clerk when the executor or administrator qualifies.",
    examples: `Example: a ${usd(400000)} probate estate owes ${usd(exVa.stateProbateTax)} state tax and ${usd(exVa.localProbateTax)} local tax — ${usd(exVa.totalProbateTax)} in total.`,
    assumptions: "Va. Code §58.1-1712: 10¢ for each $100 (or fraction) of the estate when it exceeds $15,000; §58.1-3805 lets cities and counties add up to one third of the state tax. Clerk recording fees are separate. " + DISCLAIMER,
    faq: [
      { question: "Is there a probate tax in Virginia?", answer: "Yes — $0.10 per $100 of probate estate value over $15,000, plus a local tax of one third of that in most localities." },
      { question: "Is the Virginia probate tax the same as estate tax?", answer: "No — Virginia has no estate tax; the probate tax is a small fee on the probate estate." },
    ],
  },
  {
    slug: "michigan-probate-inventory-fee-calculator",
    title: "Michigan Probate Inventory Fee Calculator",
    description: "Calculate the Michigan probate inventory fee under MCL 600.871 — the sliding fee on the estate's inventory value, less liens on real estate — due before the estate closes.",
    metaTitle: "Michigan Probate Inventory Fee Calculator — MCL 600.871",
    metaDescription: "Free Michigan inventory fee calculator. Apply the MCL 600.871 sliding schedule to the estate's inventory value after real estate liens.",
    calcInputs: [ESTATE("inventoryValue", "Inventory Value (date of death)", 300000), currencyField("liensOnRealEstate", "Liens / Mortgages on Real Estate in the Inventory", { default: 50000, max: 100000000, step: 1000 })],
    calcResult: { label: "Inventory Fee", format: "currency" },
    calcResults: [
      { key: "inventoryFee", label: "Inventory Fee", format: "currency", highlight: true },
      { key: "valueCounted", label: "Value Counted", format: "currency" },
      { key: "percentOfEstate", label: "Fee as % of Value", format: "percentage" },
    ],
    instructions: "Enter the total inventory value from the estate's inventory (Kent, Oakland, Wayne and every other Michigan county use the same state schedule) and any mortgages on real estate listed in it.",
    examples: `Example: a ${usd(300000)} inventory with a ${usd(50000)} mortgage counts ${usd(exMi.valueCounted)}; the inventory fee is ${usd(exMi.inventoryFee)}.`,
    assumptions: "MCL 600.871: $5 + 1% over $500 (under $1,000); $25 ($1,000–$3,000); $25 + 0.625% over $3,000; $68.75 + 0.5% over $10,000; $143.75 + 0.375% over $25,000; $237.50 + 0.25% over $50,000; $362.50 + 0.125% over $100,000 up to $500,000; then $62.50 per extra $100,000 to $1 million and $31.25 per $100,000 above. For deaths after 28 March 2013 liens on a parcel reduce its value (not below zero). Pay before closing or within a year of filing. " + DISCLAIMER,
    faq: [
      { question: "What is the Michigan probate inventory fee?", answer: "A one-time court fee on the value of the probate estate, from a sliding scale in MCL 600.871." },
      { question: "When is the inventory fee due?", answer: "Before the estate is closed or within one year after the probate proceeding is filed." },
    ],
  },
  {
    slug: "new-york-intestacy-calculator",
    title: "New York Intestacy Calculator",
    description: "See who inherits in New York when someone dies without a will — the spouse's $50,000 plus half, children's shares, and then parents or siblings — under EPTL 4-1.1.",
    metaTitle: "New York Intestacy Calculator — Who Inherits Without a Will",
    metaDescription: "Free NY intestate succession calculator under EPTL 4-1.1: spouse $50,000 + half, children, parents and siblings' shares.",
    calcInputs: [ESTATE("estateValue", "Net Probate Estate", 450000), dropdown("spouse", "Surviving Spouse?", [["Yes", 1], ["No", 0]], 1), numberField("children", "Number of Children (or their lines)", { default: 2, max: 20 }), numberField("livingParents", "Living Parents", { default: 0, max: 2 }), numberField("siblings", "Siblings (or their lines)", { default: 0, max: 20 })],
    calcResult: { label: "Spouse Inherits", format: "currency" },
    calcResults: [
      { key: "spouseInherits", label: "Spouse Inherits", format: "currency", highlight: true },
      { key: "eachChildInherits", label: "Each Child Inherits", format: "currency" },
      { key: "eachParentInherits", label: "Each Parent Inherits", format: "currency" },
      { key: "eachSiblingInherits", label: "Each Sibling Inherits", format: "currency" },
      { key: "passesToMoreDistantRelatives", label: "Passes to More Distant Relatives", format: "currency" },
    ],
    instructions: "Enter the estate passing without a will and the closest surviving relatives. A deceased child's share goes to that child's children (by representation).",
    examples: `Example: a ${usd(450000)} estate with a spouse and 2 children: the spouse gets ${usd(exNyi.spouseInherits)} and each child ${usd(exNyi.eachChildInherits)}.`,
    assumptions: "EPTL 4-1.1: spouse and children — spouse $50,000 plus half the rest, children share the other half; spouse only — all; children only — all; then parents, then siblings and their descendants. Joint accounts, trusts and beneficiary designations pass outside intestacy. " + DISCLAIMER,
    faq: [
      { question: "Does the spouse get everything in New York?", answer: "Only if there are no children; with children, the spouse gets $50,000 plus half of the rest." },
      { question: "Do stepchildren inherit under NY intestacy?", answer: "No, unless they were legally adopted." },
    ],
  },
  {
    slug: "islamic-inheritance-calculator",
    title: "Islamic Inheritance Calculator (Faraid / Wirasat)",
    description: "Calculate Islamic inheritance shares (Faraid / Mirath) for the closest heirs — husband or wife, sons, daughters, father and mother — with the Quranic fixed shares, residue, 'awl and radd.",
    metaTitle: "Islamic Inheritance Calculator — Faraid & Wirasat Shares",
    metaDescription: "Free Islamic inheritance calculator. Quranic shares for spouse, sons, daughters, father and mother — son receives twice a daughter's share.",
    calcInputs: [
      currencyField("netEstate", "Net Estate (after debts, funeral costs and bequests up to 1/3)", { default: 120000, max: 100000000, step: 500 }),
      dropdown("spouse", "Surviving Spouse", [["None", 0], ["Husband", 1], ["Wife / wives", 2]], 2),
      numberField("numberOfWives", "Number of Wives (if wives survive)", { default: 1, min: 1, max: 4 }),
      numberField("sons", "Sons", { default: 1, max: 20 }),
      numberField("daughters", "Daughters", { default: 2, max: 20 }),
      dropdown("father", "Father Alive?", [["No", 0], ["Yes", 1]], 0),
      dropdown("mother", "Mother Alive?", [["No", 0], ["Yes", 1]], 1),
    ],
    calcResult: { label: "Each Son's Share", format: "currency" },
    calcResults: [
      { key: "spouseShareTotal", label: "Spouse's Share (total)", format: "currency" },
      { key: "eachWifeShare", label: "Each Wife's Share", format: "currency" },
      { key: "eachSonShare", label: "Each Son's Share", format: "currency", highlight: true },
      { key: "eachDaughterShare", label: "Each Daughter's Share", format: "currency" },
      { key: "fatherShare", label: "Father's Share", format: "currency" },
      { key: "motherShare", label: "Mother's Share", format: "currency" },
      { key: "unallocatedToOtherRelatives", label: "Left for Other Relatives", format: "currency" },
    ],
    instructions: "Enter the estate left after paying debts, funeral costs and any bequests (wasiyyah, up to one third), and the surviving spouse, children and parents.",
    examples: `Example: ${usd(120000)} left to a wife, 1 son, 2 daughters and the mother: wife ${usd(exIs.spouseShareTotal)} (1/8), mother ${usd(exIs.motherShare)} (1/6), the son ${usd(exIs.eachSonShare)} and each daughter ${usd(exIs.eachDaughterShare)}.`,
    assumptions: "Sunni (Hanafi-style) rules for the closest heirs: husband 1/2 (1/4 with children); wife or wives 1/4 (1/8 with children) shared; mother 1/6 with children, otherwise 1/3 (a third of the remainder when only spouse and father share with her); father 1/6 with children plus any residue; one daughter 1/2, two or more 2/3; with sons, children share the residue 2:1. 'Awl reduces shares proportionally if they exceed the estate; radd returns a surplus to blood heirs. Siblings, grandchildren and other relatives aren't modelled. Consult a scholar for your case. " + DISCLAIMER,
    faq: [
      { question: "Why does a son get twice a daughter's share?", answer: "The Quran (4:11) sets the son's share at twice the daughter's, reflecting the son's financial responsibility to support family." },
      { question: "How much can be left in a will under Islamic law?", answer: "Up to one third of the estate, and not to an heir who already receives a fixed share (in most schools)." },
    ],
  },
  {
    slug: "conservatorship-bond-calculator",
    title: "Conservatorship Bond Calculator",
    description: "Estimate the bond a court will require for a conservatorship or guardianship of the estate — personal property plus a year's income and benefits, with a cushion — and the yearly bond premium.",
    metaTitle: "Conservatorship Bond Calculator — Bond Amount & Premium",
    metaDescription: "Free conservatorship bond calculator. Estimate the court bond amount from personal property and annual income, and the yearly premium.",
    calcInputs: [
      currencyField("personalProperty", "Value of Personal Property (cash, investments, vehicles)", { default: 300000, max: 100000000, step: 1000 }),
      currencyField("annualIncome", "Annual Income from the Estate (incl. real estate rents)", { default: 40000, max: 10000000, step: 500 }),
      currencyField("annualPublicBenefits", "Annual Public Benefits (Social Security, pensions)", { default: 18000, max: 1000000, step: 500 }),
      percentField("cushionPercent", "Cushion for Recovery Costs", { default: 10, max: 50, step: 1 }),
      percentField("premiumRatePercent", "Bond Premium Rate", { default: 0.5, max: 5, step: 0.05 }),
      currencyField("minimumPremium", "Minimum Premium", { default: 250, max: 5000, step: 10 }),
    ],
    calcResult: { label: "Estimated Bond Amount", format: "currency" },
    calcResults: [
      { key: "estimatedBondAmount", label: "Estimated Bond Amount", format: "currency", highlight: true },
      { key: "annualBondPremium", label: "Annual Bond Premium", format: "currency" },
      { key: "baseBondBeforeCushion", label: "Base Before Cushion", format: "currency" },
      { key: "premiumPerThousand", label: "Premium per $1,000 of Bond", format: "currency" },
    ],
    instructions: "Enter the conservatee's personal property, a year's income from the estate, and a year's public benefits. Real estate itself usually isn't bonded because it can't be sold without court approval.",
    examples: `Example: ${usd(300000)} of personal property, ${usd(40000)} of income and ${usd(18000)} of benefits with a 10% cushion give a bond of about ${usd(exCb.estimatedBondAmount)} — roughly ${usd(exCb.annualBondPremium)} a year in premium.`,
    assumptions: "Modelled on California Probate Code §2320 and Rule of Court 7.207: personal property + annual income from real and personal property + annual public benefits, plus a cushion (commonly 10%) for recovery costs. Premiums are often 0.5–1% a year depending on credit and size; blocked accounts can reduce the bond. Other states use similar rules. " + DISCLAIMER,
    faq: [
      { question: "Who pays the conservatorship bond premium?", answer: "The conservatorship estate pays it as an expense of administration." },
      { question: "Can the bond be reduced?", answer: "Yes — putting assets in blocked accounts that need a court order to withdraw usually removes them from the bond amount." },
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
