// One-time (but safe to re-run) batch setup script: creates 28 government benefit calculators
// (Law & Government Calculators > Government Benefits Calculators). Rates live in
// src/lib/calc-engine-law-benefits.ts; examples are computed from that engine.
// State policy (user decision): SNAP, Medicaid and TANF are one calculator each (federal formula
// with state inputs) — every "<State> SNAP / Food Stamps", CalFresh, Michigan Bridge Card,
// Foodstamp and Food Benefit keyword → snap-calculator; Illinois / Missouri / Colorado Medicaid →
// medicaid-eligibility; Oregon / New York / Colorado / Missouri / Illinois / Ohio TANF, CalWORKs,
// TAFDC, KTAP, DTA, MFIP, Cash Aid / Cash Assistance → tanf-calculator. Also merged: Supplemental
// Security Income → ssi; Social Security Disability, Disability Benefit / Claim, Michigan / North
// Carolina / Illinois disability benefits, Disability Increase 2025 → ssdi; FPG → federal-poverty-
// level; QMB Income Limits → medicare-savings-program; Housing Voucher → section-8-rent; Bedroom →
// voucher-bedroom-size; USDA Rental Assistance Income Limits → usda-income-eligibility; USA / US /
// America / Government / Federal Debt, Usdebt, US Deficit, Federal Deficit / Budget → national-
// debt; State by State Social Security Cuts → social-security-cuts; WEP, Windfall Elimination,
// Social Security Windfall → wep-gpo-repeal; Health Care Affordability, Safe Harbor → aca-
// affordability; Minimum Value (Standard), HHS Minimum Value → aca-minimum-value; Applicable Large
// Employer, ALE → aca-ale; Long-term Disability Buyout, Lump Sum Disability Settlement / Buyout →
// long-term-disability-buyout; USDA Cost of Raising a Child → cost-of-raising-a-child; CCAP,
// Childcare / Daycare Assistance, Child Care Eligibility, Illinois Action for Children → child-
// care-assistance; UK Benefits, Scotland UK Benefits, Working Families → universal-credit; Canada
// Child Benefit CRA → canada-child-benefit. Obama Care subsidies / ACA → existing marketplace
// subsidy calculator; Stimulus / EIP / Cares Act → existing stimulus-check-calculator.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-benefits-calculators.ts
// or
//   npm run db:create-law-benefits-calculators

import * as E from "../src/lib/calc-engine-law-benefits";

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

const CAT = "government-benefits-calculators";
const DISCLAIMER = "Estimate only — the agency that runs the program decides eligibility and the exact amount after you apply.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const REGION = dropdown("region", "Where You Live", [["48 states & DC", 0], ["Alaska", 1], ["Hawaii", 2]], 0);
const HH = numberField("householdSize", "Household Size", { default: 4, min: 1, max: 20, unit: "people" });
const INCOME = currencyField("annualIncome", "Annual Household Income (gross)", { default: 52000, max: 1000000, step: 500 });
const ADJUNCT = dropdown("receivesSnapMedicaidTanf", "Anyone Gets SNAP, Medicaid or TANF?", YESNO, 0);
const ELIG_RESULTS = (extra: Record<string, unknown>[] = []) => [
  { key: "likelyEligible", label: "Likely Eligible? (1 = yes)", format: "number", highlight: true },
  { key: "percentOfPovertyLevel", label: "Income as % of the Poverty Level", format: "percentage" },
  { key: "annualIncomeLimit", label: "Annual Income Limit", format: "currency" },
  ...extra,
];
const T = (t: ToolDef) => t;

const exSnap = r(E.snap, { householdSize: 4, monthlyEarnedIncome: 2600, monthlyUnearnedIncome: 0, elderlyOrDisabledMember: 0, grossIncomeLimitPercent: 130, dependentCare: 200, childSupportPaid: 0, medicalExpenses: 0, rentOrMortgage: 1400, utilityAllowance: 450 });
const exSsi = r(E.ssi, { livingArrangement: 0, monthlyUnearnedIncome: 300, monthlyEarnedIncome: 400, livesInAnothersHousehold: 0, stateSupplement: 0, countableResources: 1200 });
const exSsdi = r(E.ssdi, { averageIndexedMonthlyEarnings: 5200, averageAnnualEarnings: 0, eligibleDependents: 1 });
const exBack = r(E.ssdiBackPay, { monthlyBenefit: 1650, monthsFromOnsetToApproval: 26, monthsFromApplicationToApproval: 18, hasRepresentative: 1 });
const exFpl = r(E.fpl, { annualIncome: 52000, householdSize: 4, region: 0 });
const exMed = r(E.medicaid, { state: E.STATES.indexOf("Ohio"), annualIncome: 30000, householdSize: 2, applicantType: 0, childLimitPercent: 200, pregnancyLimitPercent: 200, parentLimitNonExpansion: 0 });
const exMsp = r(E.medicareSavings, { married: 0, monthlyIncome: 1450, countableResources: 5000, region: 0 });
const exWic = r(E.wic, { annualIncome: 52000, householdSize: 4, region: 0, receivesSnapMedicaidTanf: 0 });
const exHs = r(E.headStart, { annualIncome: 30000, householdSize: 3, region: 0, receivesSnapMedicaidTanf: 0 });
const exLi = r(E.liheap, { annualIncome: 42000, householdSize: 3, region: 0, stateMedianIncome: 90000, annualEnergyCosts: 2800, receivesSnapMedicaidTanf: 0 });
const exCc = r(E.childCareAssistance, { annualIncome: 48000, stateMedianIncome: 95000, stateLimitPercentOfSmi: 85, annualChildCareCost: 14000 });
const exTanf = r(E.tanf, { stateMaximumGrant: 750, monthlyEarnedIncome: 900, monthlyUnearnedIncome: 0, earnedIncomeDisregard: 90, percentDisregard: 50 });
const exS8 = r(E.section8, { annualIncome: 28000, dependents: 2, elderlyOrDisabled: 0, annualChildCare: 0, unreimbursedMedical: 0, minimumRent: 50, contractRent: 1450, utilityAllowance: 150, paymentStandard: 1650 });
const exVb = r(E.voucherBedrooms, { householdSize: 5, personsPerBedroom: 2, unrelatedAdults: 0, liveInAide: 0 });
const exLt = r(E.lihtcRent, { areaMedianIncomeFamilyOf4: 100000, bedrooms: 2, incomeLimitPercent: 60, utilityAllowance: 120 });
const exUs = r(E.usdaIncome, { program: 0, areaMedianIncome: 98000, annualHouseholdIncome: 112000, childrenUnder18: 2, elderlyOrDisabled: 0, childCareExpenses: 3000, medicalExpenses: 0 });
const exDebt = r(E.nationalDebt, { totalDebtTrillions: 39.8, populationMillions: 343, taxpayersMillions: 160, householdsMillions: 133, annualDeficitTrillions: 1.9, gdpTrillions: 31, annualSurplusToRepayTrillions: 0.5 });
const exCut = r(E.socialSecurityCuts, { monthlyBenefit: 2000, payablePercent: 77 });
const exWep = r(E.wepRepeal, { aime: 3000, yearsOfSubstantialEarnings: 20, monthlyPension: 2500, spousalOrSurvivorBenefit: 0, monthsSinceJan2024: 33 });
const exAff = r(E.acaAffordability, { employeeMonthlyPremium: 320, safeHarbor: 1, boxOneW2Wages: 42000, hourlyRate: 0, householdIncome: 0 });
const exMv = r(E.minimumValue, { totalExpectedClaims: 10000, planPaidClaims: 6600 });
const exAle = r(E.aleTest, { averageFullTimeEmployees: 42, monthlyPartTimeHours: 1200 });
const exHfa = r(E.hospitalFinancialAssistance, { annualIncome: 52000, householdSize: 4, region: 0, freeCareLimitPercent: 200, discountLimitPercent: 400, discountPercent: 60, billAmount: 8000 });
const exNs = r(E.noSurprises, { goodFaithEstimate: 2500, actualBill: 3200 });
const exLtd = r(E.ltdBuyout, { monthlyBenefit: 4000, monthlyOffsets: 1200, currentAge: 48, benefitEndAge: 65, discountRatePercent: 5, probabilityStayingOnClaimPercent: 70 });
const exCrc = r(E.costOfRaisingChild, { incomeGroup: 1, inflationFactor: 1.37, childrenInFamily: 2 });
const exCcb = r(E.canadaChildBenefit, { childrenUnder6: 1, children6To17: 1, adjustedFamilyNetIncome: 90000 });
const exUc = r(E.universalCredit, { relationship: 0, under25: 0, children: 2, firstChildBornBefore2017: 0, monthlyRentEligible: 750, otherElements: 0, scotland: 0, scottishChildPaymentWeekly: 27.15, childrenUnder16: 2, limitedCapabilityForWork: 0, monthlyNetEarnings: 1200, otherMonthlyIncome: 0 });

const TOOLS: ToolDef[] = [
  T({
    slug: "snap-calculator",
    title: "SNAP Calculator (Food Stamps) 2026–27",
    description: "Estimate your SNAP (food stamps) benefit for FY2027 — the gross and net income tests, deductions for earnings, child care, medical costs and shelter, and the monthly benefit for your household size in any state.",
    metaTitle: "SNAP Calculator 2026–27 — How Much Food Stamps Will I Get?",
    metaDescription: "Free SNAP / food stamps calculator with FY2027 rates (from 1 Oct 2026): income tests, deductions, shelter cap $769 and maximum $1,023 for a family of 4.",
    calcInputs: [
      HH,
      currencyField("monthlyEarnedIncome", "Monthly Earned Income (gross wages)", { default: 2600, max: 50000, step: 10 }),
      currencyField("monthlyUnearnedIncome", "Monthly Unearned Income (SSI, child support received, UI…)", { default: 0, max: 50000, step: 10 }),
      dropdown("elderlyOrDisabledMember", "Anyone 60+ or Disabled in the Household?", YESNO, 0),
      dropdown("grossIncomeLimitPercent", "Your State's Gross Income Limit", [["130% of poverty (federal)", 130], ["165%", 165], ["185%", 185], ["200% (most broad-based states)", 200]], 130),
      currencyField("dependentCare", "Monthly Child / Dependent Care Costs", { default: 200, max: 10000, step: 10 }),
      currencyField("childSupportPaid", "Legally Owed Child Support You Pay", { default: 0, max: 10000, step: 10 }),
      currencyField("medicalExpenses", "Monthly Medical Costs (60+ / disabled only)", { default: 0, max: 10000, step: 10 }),
      currencyField("rentOrMortgage", "Monthly Rent or Mortgage (incl. property tax, insurance)", { default: 1400, max: 20000, step: 10 }),
      currencyField("utilityAllowance", "Utilities (your state's standard utility allowance)", { default: 450, max: 2000, step: 5 }),
    ],
    calcResult: { label: "Monthly SNAP Benefit", format: "currency" },
    calcResults: [
      { key: "monthlySnapBenefit", label: "Estimated Monthly SNAP Benefit", format: "currency", highlight: true },
      { key: "maximumAllotment", label: "Maximum for Your Household Size", format: "currency" },
      { key: "netMonthlyIncome", label: "Net Monthly Income (after deductions)", format: "currency" },
      { key: "shelterDeduction", label: "Excess Shelter Deduction", format: "currency" },
      { key: "passesGrossIncomeTest", label: "Passes Gross Income Test? (1 = yes)", format: "number" },
      { key: "passesNetIncomeTest", label: "Passes Net Income Test? (1 = yes)", format: "number" },
      { key: "grossIncomeLimit", label: "Gross Monthly Income Limit", format: "currency" },
    ],
    instructions: "Enter everyone who buys and prepares food together, your monthly income before taxes, and your costs. For utilities, use your state's standard utility allowance (SUA) if you pay heating or cooling — most state SNAP agencies publish it (typically $350–$700). Pick your state's gross income limit: most states use broad-based categorical eligibility up to 165–200%.",
    examples: `Example: a family of 4 earning ${usd(2600)} a month with ${usd(200)} child care, ${usd(1400)} rent and a ${usd(450)} utility allowance gets about ${usd(exSnap.monthlySnapBenefit)} a month (the maximum is ${usd(exSnap.maximumAllotment)}).`,
    assumptions: "FY2027 (1 October 2026 – 30 September 2027), 48 states and DC: maximum allotments $306 (1 person) to $1,841 (8), +$225 each extra person; standard deduction $217–$308; excess shelter cap $769 (no cap with an elderly/disabled member); 20% earned income deduction; benefit = maximum − 30% of net income; $25 minimum for 1–2 person households. Gross limit 130% and net limit 100% of the 2026 poverty guideline. Alaska, Hawaii and territories have higher amounts. Internet costs no longer count as shelter costs, and work rules apply to many adults 18–64. " + DISCLAIMER,
    faq: [
      { question: "How much SNAP will I get for a family of 4?", answer: "Up to $1,023 a month from October 2026; the actual amount is $1,023 minus 30% of your net income after deductions." },
      { question: "Does every state use the same SNAP formula?", answer: "Yes — benefits are federal; states differ in gross income limits (broad-based eligibility), utility allowances and some rules, which you can set here." },
    ],
  }),
  T({
    slug: "ssi-calculator",
    title: "SSI Calculator 2026 (Supplemental Security Income)",
    description: "Estimate your 2026 SSI payment — the $994 federal benefit rate ($1,491 for couples) minus countable income after the $20 and $65 exclusions, in-kind support and your state supplement.",
    metaTitle: "SSI Calculator 2026 — Supplemental Security Income Payment",
    metaDescription: "Free SSI calculator for 2026. $994 / $1,491 federal benefit rate, $20 and $65 income exclusions, half of earnings excluded, and the $2,000 resource limit.",
    calcInputs: [
      dropdown("livingArrangement", "Applying As", [["Individual", 0], ["Eligible couple", 1]], 0),
      currencyField("monthlyUnearnedIncome", "Monthly Unearned Income (Social Security, pension…)", { default: 300, max: 10000, step: 5 }),
      currencyField("monthlyEarnedIncome", "Monthly Gross Earnings", { default: 400, max: 10000, step: 5 }),
      dropdown("livesInAnothersHousehold", "Living in Someone Else's Home Without Paying Your Share?", YESNO, 0),
      currencyField("stateSupplement", "State Supplement (if your state pays one)", { default: 0, max: 2000, step: 1 }),
      currencyField("countableResources", "Countable Resources (bank accounts, cash)", { default: 1200, max: 100000, step: 50 }),
    ],
    calcResult: { label: "Monthly SSI Payment", format: "currency" },
    calcResults: [
      { key: "monthlySsiPayment", label: "Estimated Monthly SSI Payment", format: "currency", highlight: true },
      { key: "federalBenefitRate", label: "2026 Federal Benefit Rate", format: "currency" },
      { key: "countableIncome", label: "Countable Income", format: "currency" },
      { key: "inKindReduction", label: "In-Kind Support Reduction (one-third)", format: "currency" },
      { key: "meetsResourceLimit", label: "Under the Resource Limit? (1 = yes)", format: "number" },
      { key: "annualSsi", label: "Annual SSI", format: "currency" },
    ],
    instructions: "Enter monthly income before deductions. Your home, one car and most household goods don't count as resources.",
    examples: `Example: ${usd(300)} of Social Security and ${usd(400)} of earnings leave ${usd(exSsi.countableIncome)} of countable income, so SSI pays about ${usd(exSsi.monthlySsiPayment)} a month.`,
    assumptions: "2026 federal benefit rate $994 individual / $1,491 couple (2.8% COLA). Countable income = unearned income − $20, plus (earned income − $65 − any unused part of the $20) ÷ 2. Living in another person's household without paying your share reduces SSI by one third; food is no longer counted as in-kind support (since Sept 2024). Resource limit $2,000 / $3,000. " + DISCLAIMER,
    faq: [
      { question: "What is the maximum SSI payment in 2026?", answer: "$994 a month for an individual and $1,491 for an eligible couple, plus any state supplement." },
      { question: "Can I work and get SSI?", answer: "Yes — the first $65 of earnings and half of the rest don't count, so SSI goes down by about $1 for every $2 you earn." },
    ],
  }),
  T({
    slug: "ssdi-calculator",
    title: "SSDI Calculator 2026 (Social Security Disability)",
    description: "Estimate your Social Security Disability Insurance (SSDI) payment for 2026 from your average indexed monthly earnings — the PIA formula with the 2026 bend points — plus family benefits.",
    metaTitle: "SSDI Calculator 2026 — Social Security Disability Payment",
    metaDescription: "Free SSDI calculator. Estimate your monthly disability benefit with the 2026 PIA bend points ($1,286 / $7,749) and the family maximum.",
    calcInputs: [
      currencyField("averageIndexedMonthlyEarnings", "Average Indexed Monthly Earnings (AIME, from your statement)", { default: 5200, max: 15000, step: 10 }),
      currencyField("averageAnnualEarnings", "Or Your Average Yearly Earnings (if AIME unknown)", { default: 0, max: 200000, step: 500 }),
      numberField("eligibleDependents", "Eligible Children / Dependents", { default: 1, max: 4 }),
    ],
    calcResult: { label: "Monthly SSDI Benefit", format: "currency" },
    calcResults: [
      { key: "monthlySsdiBenefit", label: "Estimated Monthly SSDI Benefit", format: "currency", highlight: true },
      { key: "monthlyFamilyBenefit", label: "With Family Benefits", format: "currency" },
      { key: "annualSsdiBenefit", label: "Annual SSDI Benefit", format: "currency" },
      { key: "aimeUsed", label: "AIME Used", format: "currency" },
      { key: "dependentsBenefit", label: "Dependents' Benefits", format: "currency" },
    ],
    instructions: "The most accurate figure is on your my Social Security statement. Otherwise enter your AIME, or your average yearly earnings over your working years (an approximation).",
    examples: `Example: an AIME of ${usd(5200)} gives a primary insurance amount of about ${usd(exSsdi.monthlySsdiBenefit)} a month; with one eligible child the family receives about ${usd(exSsdi.monthlyFamilyBenefit)}.`,
    assumptions: "PIA = 90% of AIME up to $1,286 + 32% up to $7,749 + 15% above (2026 bend points), rounded down to the dime; disability family maximum = the lesser of 85% of AIME or 150% of the PIA (not below the PIA). SSDI benefits rose 2.8% for 2026; the maximum is about $4,152. Workers' comp or public disability benefits can offset SSDI. " + DISCLAIMER,
    faq: [
      { question: "What is the average SSDI payment in 2026?", answer: "About $1,630 a month for disabled workers after the 2.8% COLA; your amount depends on your lifetime earnings." },
      { question: "Can I work while on SSDI?", answer: "Yes, within limits — earnings above the substantial gainful activity level ($1,690 a month in 2026 for non-blind people) can end benefits after a trial work period." },
    ],
  }),
  T({
    slug: "ssdi-back-pay-calculator",
    title: "SSDI Back Pay Calculator",
    description: "Estimate Social Security Disability back pay — monthly benefits from your onset date after the 5-month waiting period, up to 12 months before your application — and the representative's fee.",
    metaTitle: "SSDI Back Pay Calculator — Disability Back Payments",
    metaDescription: "Free SSDI back pay calculator. Waiting period, 12-month retroactive limit and the 25% / $9,200 representative fee cap.",
    calcInputs: [
      currencyField("monthlyBenefit", "Monthly SSDI Benefit", { default: 1650, max: 5000, step: 5 }),
      numberField("monthsFromOnsetToApproval", "Months from Disability Onset to Approval", { default: 26, max: 240 }),
      numberField("monthsFromApplicationToApproval", "Months from Application to Approval", { default: 18, max: 120 }),
      dropdown("hasRepresentative", "Using a Lawyer or Representative?", [["Yes", 1], ["No", 0]], 1),
    ],
    calcResult: { label: "Estimated Back Pay", format: "currency" },
    calcResults: [
      { key: "estimatedBackPay", label: "Estimated Back Pay", format: "currency", highlight: true },
      { key: "monthsOfBackPay", label: "Months of Back Pay", format: "number" },
      { key: "representativeFee", label: "Representative Fee (25%, max $9,200)", format: "currency" },
      { key: "netBackPay", label: "Net Back Pay", format: "currency" },
    ],
    instructions: "Enter your monthly benefit and the months between your established onset date and approval, and between your application and approval.",
    examples: `Example: ${usd(1650)} a month, onset 26 months and application 18 months before approval: ${exBack.monthsOfBackPay} months of back pay — ${usd(exBack.estimatedBackPay)}, or ${usd(exBack.netBackPay)} after the fee.`,
    assumptions: "SSDI starts after a full 5-month waiting period from the onset date and can be paid for up to 12 months before the application month. Representative fees are 25% of past-due benefits, capped at $9,200 (since November 2024). SSI back pay follows different rules (no waiting period, from the application month). " + DISCLAIMER,
    faq: [
      { question: "How far back does SSDI back pay go?", answer: "To your onset date plus 5 months, but no more than 12 months before you applied." },
      { question: "How is SSDI back pay paid?", answer: "Usually as a lump sum within a couple of months of approval." },
    ],
  }),
  T({
    slug: "federal-poverty-level-calculator",
    title: "Federal Poverty Level Calculator 2026",
    description: "Find your income as a percentage of the 2026 federal poverty level (poverty guidelines) for your household size — and the dollar amounts at 138%, 200% and 400% used by Medicaid, SNAP and ACA subsidies.",
    metaTitle: "Federal Poverty Level Calculator 2026 — % of FPL",
    metaDescription: "Free FPL calculator with the 2026 HHS poverty guidelines ($15,960 + $5,680 per person). See your % of FPL and the 138%, 200% and 400% amounts.",
    calcInputs: [INCOME, HH, REGION],
    calcResult: { label: "Percent of Poverty Level", format: "percentage" },
    calcResults: [
      { key: "percentOfPovertyLevel", label: "Your Income as % of the Poverty Level", format: "percentage", highlight: true },
      { key: "povertyGuideline", label: "2026 Poverty Guideline (100%)", format: "currency" },
      { key: "monthlyGuideline", label: "Monthly Guideline", format: "currency" },
      { key: "at138Percent", label: "138% (Medicaid expansion)", format: "currency" },
      { key: "at200Percent", label: "200%", format: "currency" },
      { key: "at400Percent", label: "400%", format: "currency" },
    ],
    instructions: "Enter your household's yearly income before taxes and the number of people in your household (as the program defines it — for ACA and Medicaid, your tax household).",
    examples: `Example: ${usd(52000)} for a family of 4 is ${exFpl.percentOfPovertyLevel}% of the 2026 poverty guideline of ${usd(exFpl.povertyGuideline)}.`,
    assumptions: "2026 HHS poverty guidelines (effective 13 January 2026): $15,960 for one person + $5,680 for each additional person in the 48 states and DC; Alaska $19,950 + $7,100; Hawaii $18,360 + $6,530. Some programs use the prior year's guidelines until a set date. " + DISCLAIMER,
    faq: [
      { question: "What is the 2026 federal poverty level for a family of 4?", answer: "$33,000 a year in the 48 contiguous states and DC." },
      { question: "What is 138% of the poverty level?", answer: "The Medicaid expansion limit — about $22,025 for one person and $45,540 for a family of 4 in 2026." },
    ],
  }),
  T({
    slug: "medicaid-eligibility-calculator",
    title: "Medicaid Eligibility Calculator 2026 (by State)",
    description: "Check if you may qualify for Medicaid in your state — the income limit for adults (138% of poverty in expansion states), children, pregnancy and seniors — using 2026 poverty guidelines.",
    metaTitle: "Medicaid Eligibility Calculator 2026 — Income Limits by State",
    metaDescription: "Free Medicaid eligibility calculator. Compare your income with your state's Medicaid limit (138% FPL in expansion states) for adults, children and pregnancy.",
    calcInputs: [
      dropdown("state", "State", E.STATES.map((s, i) => [s, i] as [string, number]), E.STATES.indexOf("Ohio")),
      INCOME,
      HH,
      dropdown("applicantType", "Who's Applying", [["Adult (19–64)", 0], ["Child (CHIP / Medicaid)", 1], ["Pregnant", 2], ["Age 65+ or disabled", 3]], 0),
      percentField("childLimitPercent", "Child Limit in Your State (% FPL)", { default: 200, max: 400, step: 1 }),
      percentField("pregnancyLimitPercent", "Pregnancy Limit in Your State (% FPL)", { default: 200, max: 400, step: 1 }),
      percentField("parentLimitNonExpansion", "Parent Limit (non-expansion states, % FPL)", { default: 0, max: 200, step: 1 }),
    ],
    calcResult: { label: "Likely Eligible? (1 = yes)", format: "number" },
    calcResults: [
      { key: "likelyEligible", label: "Likely Eligible? (1 = yes)", format: "number", highlight: true },
      { key: "percentOfPovertyLevel", label: "Income as % of the Poverty Level", format: "percentage" },
      { key: "incomeLimitPercent", label: "Income Limit Used (% FPL)", format: "number" },
      { key: "annualIncomeLimit", label: "Annual Income Limit (incl. 5% disregard)", format: "currency" },
      { key: "expansionState", label: "Medicaid Expansion State? (1 = yes)", format: "number" },
    ],
    instructions: "Pick your state, enter your household's annual MAGI income and size, and who is applying. Child and pregnancy limits vary by state (often 200–300%) — change them to your state's figure if you know it.",
    examples: `Example: a 2-person household in Ohio with ${usd(30000)} is at ${exMed.percentOfPovertyLevel}% of poverty — under the 138% adult limit, so likely eligible.`,
    assumptions: "Expansion states cover adults to 138% FPL (133% + a 5-point MAGI disregard). Non-expansion states in 2026: Alabama, Florida, Georgia, Kansas, Mississippi, South Carolina, Tennessee, Texas, Wyoming, and Wisconsin (adults to 100%); parents there may qualify at very low incomes. Seniors and people with disabilities usually face asset tests (~100% FPL here). New Medicaid work requirements for expansion adults start by 2027. " + DISCLAIMER,
    faq: [
      { question: "What is the income limit for Medicaid in 2026?", answer: "In expansion states, 138% of the poverty level — about $22,025 for one person or $45,540 for a family of 4." },
      { question: "What if my income is too high for Medicaid?", answer: "You may qualify for subsidized Marketplace coverage, or your children for CHIP, which has higher limits." },
    ],
  }),
  T({
    slug: "medicare-savings-program-calculator",
    title: "Medicare Savings Program Calculator (QMB, SLMB, QI)",
    description: "Check if you qualify for a Medicare Savings Program in 2026 — QMB (up to 100% of poverty), SLMB (120%) or QI (135%) — which pay your Part B premium and sometimes deductibles and copays.",
    metaTitle: "QMB Income Limits 2026 Calculator — Medicare Savings Programs",
    metaDescription: "Free Medicare Savings Program calculator. 2026 QMB, SLMB and QI income limits (100/120/135% FPL + $20) and resource limits.",
    calcInputs: [dropdown("married", "Status", [["Single", 0], ["Married", 1]], 0), currencyField("monthlyIncome", "Monthly Income (Social Security, pension…)", { default: 1450, max: 20000, step: 5 }), currencyField("countableResources", "Countable Resources", { default: 5000, max: 200000, step: 100 }), REGION],
    calcResult: { label: "Program Level", format: "number" },
    calcResults: [
      { key: "programLevel", label: "Program (0 none, 1 QMB, 2 SLMB, 3 QI)", format: "number", highlight: true },
      { key: "percentOfPovertyLevel", label: "Income as % of Poverty (after $20)", format: "percentage" },
      { key: "qmbIncomeLimit", label: "QMB Monthly Limit", format: "currency" },
      { key: "slmbIncomeLimit", label: "SLMB Monthly Limit", format: "currency" },
      { key: "qiIncomeLimit", label: "QI Monthly Limit", format: "currency" },
      { key: "meetsResourceLimit", label: "Under the Resource Limit? (1 = yes)", format: "number" },
    ],
    instructions: "Enter your gross monthly income and countable resources (bank accounts, stocks — not your home, one car or burial funds). Many states use higher limits or no asset test.",
    examples: `Example: a single person with ${usd(1450)} a month is at ${exMsp.percentOfPovertyLevel}% of poverty after the $20 disregard — SLMB level (program ${exMsp.programLevel}), which pays the Part B premium.`,
    assumptions: "2026 limits: QMB 100%, SLMB 120%, QI 135% of the poverty guideline, plus the $20 general income disregard; resource limits about $9,950 single / $14,910 married. QMB pays Part A/B premiums, deductibles and coinsurance; SLMB and QI pay the Part B premium ($202.90 in 2026). Several states (e.g. NY, CT, AZ) have higher limits or no asset test. " + DISCLAIMER,
    faq: [
      { question: "What are the QMB income limits for 2026?", answer: "About $1,350 a month for a single person and $1,823 for a couple (100% of poverty + $20), higher in some states." },
      { question: "Does QMB qualify me for Extra Help?", answer: "Yes — all Medicare Savings Program enrollees automatically get Extra Help with Part D drug costs." },
    ],
  }),
  T({
    slug: "wic-calculator",
    title: "WIC Income Eligibility Calculator",
    description: "Check if your family meets WIC income limits — 185% of the poverty guideline — or qualifies automatically through SNAP, Medicaid or TANF.",
    metaTitle: "WIC Calculator — Income Eligibility 2026–27",
    metaDescription: "Free WIC eligibility calculator. Income limit 185% of the 2026 poverty guideline, or automatic eligibility with SNAP, Medicaid or TANF.",
    calcInputs: [INCOME, numberField("householdSize", "Household Size (count an unborn baby)", { default: 4, min: 1, max: 20 }), REGION, ADJUNCT],
    calcResult: { label: "Likely Eligible? (1 = yes)", format: "number" },
    calcResults: ELIG_RESULTS([{ key: "monthlyIncomeLimit", label: "Monthly Income Limit", format: "currency" }, { key: "eligibleThroughOtherProgram", label: "Eligible Through SNAP/Medicaid/TANF? (1 = yes)", format: "number" }]),
    instructions: "Enter household income before taxes and household size — a pregnant woman counts as two (or more for multiples). WIC serves pregnant and postpartum women, infants and children under 5 who also have a nutritional risk.",
    examples: `Example: a family of 4 earning ${usd(52000)} is at ${exWic.percentOfPovertyLevel}% of poverty — under the WIC limit of ${usd(exWic.annualIncomeLimit)}.`,
    assumptions: "WIC income guidelines (1 July 2026 – 30 June 2027) = 185% of the 2026 poverty guidelines. Anyone receiving SNAP, Medicaid or TANF (or with a family member on Medicaid/TANF) is adjunctively income-eligible. WIC benefits are food packages and formula, not cash. " + DISCLAIMER,
    faq: [
      { question: "What is the WIC income limit for a family of 4?", answer: "About $61,050 a year ($5,088 a month) — 185% of the 2026 poverty guideline." },
      { question: "How much does WIC give per month?", answer: "WIC provides specific foods; the value is often $50–$100+ per person a month, plus formula for infants." },
    ],
  }),
  T({
    slug: "head-start-eligibility-calculator",
    title: "Head Start Eligibility Calculator",
    description: "Check if your child may qualify for Head Start or Early Head Start — family income at or below the poverty guideline, or categorical eligibility through SNAP, SSI, TANF, foster care or homelessness.",
    metaTitle: "Head Start Eligibility Calculator — 2026 Income Guidelines",
    metaDescription: "Free Head Start income eligibility calculator using the 2026 poverty guidelines, with categorical eligibility through public assistance.",
    calcInputs: [INCOME, HH, REGION, dropdown("receivesSnapMedicaidTanf", "Family Gets TANF, SSI or SNAP (or child in foster care / homeless)?", YESNO, 0)],
    calcResult: { label: "Likely Eligible? (1 = yes)", format: "number" },
    calcResults: ELIG_RESULTS([{ key: "monthlyIncomeLimit", label: "Monthly Income Limit", format: "currency" }, { key: "eligibleThroughOtherProgram", label: "Categorically Eligible? (1 = yes)", format: "number" }]),
    instructions: "Enter your family's gross income for the last 12 months (or the previous calendar year) and family size.",
    examples: `Example: a family of 3 with ${usd(30000)} is at ${exHs.percentOfPovertyLevel}% of poverty — under the 100% Head Start limit.`,
    assumptions: "45 CFR §1302.12: eligible if income is at or below the poverty guideline, or the family receives TANF/SSI/SNAP, the child is in foster care or is homeless. Programs may enroll up to 35% of children from families between 100% and 130% of poverty, and 10% over-income children. " + DISCLAIMER,
    faq: [
      { question: "What is the income limit for Head Start?", answer: "100% of the poverty guideline — $33,000 for a family of 4 in 2026 — though programs can serve some families up to 130%." },
      { question: "Is Head Start free?", answer: "Yes, Head Start and Early Head Start are free for eligible families." },
    ],
  }),
  T({
    slug: "liheap-calculator",
    title: "LIHEAP Eligibility Calculator (Energy Assistance)",
    description: "Check if you may qualify for LIHEAP energy bill help — income up to the greater of 150% of the poverty guideline or 60% of state median income — and your energy burden.",
    metaTitle: "LIHEAP Calculator — Energy Assistance Income Eligibility",
    metaDescription: "Free LIHEAP eligibility calculator. Compare your income with 150% of poverty or 60% of state median income and see your home energy burden.",
    calcInputs: [INCOME, HH, REGION, currencyField("stateMedianIncome", "State Median Income for Your Household Size (optional)", { default: 90000, max: 500000, step: 500 }), currencyField("annualEnergyCosts", "Yearly Heating + Electric Costs", { default: 2800, max: 50000, step: 50 }), ADJUNCT],
    calcResult: { label: "Likely Eligible? (1 = yes)", format: "number" },
    calcResults: [
      { key: "likelyEligible", label: "Likely Eligible? (1 = yes)", format: "number", highlight: true },
      { key: "annualIncomeLimit", label: "Income Limit Used", format: "currency" },
      { key: "percentOfPovertyLevel", label: "Income as % of Poverty", format: "percentage" },
      { key: "energyBurdenPercent", label: "Energy Burden (% of income)", format: "percentage" },
    ],
    instructions: "Enter household income and size, your state's median income for that size (from your state LIHEAP office — leave the default if unknown) and your yearly energy costs.",
    examples: `Example: a family of 3 earning ${usd(42000)} is under the limit of ${usd(exLi.annualIncomeLimit)}, with an energy burden of ${exLi.energyBurdenPercent}%.`,
    assumptions: "Federal LIHEAP rules let states set limits up to the greater of 150% of the poverty guideline or 60% of state median income; many states use lower limits and give priority to the elderly, disabled and families with young children. Households on SNAP, SSI or TANF can be categorically eligible. " + DISCLAIMER,
    faq: [
      { question: "Who qualifies for LIHEAP?", answer: "Households with income up to 150% of the poverty guideline or 60% of state median income (state rules vary)." },
      { question: "Does LIHEAP pay the whole bill?", answer: "Usually not — it's a one-time or seasonal payment to the utility, plus crisis help for shutoffs." },
    ],
  }),
  T({
    slug: "child-care-assistance-calculator",
    title: "Child Care Assistance Calculator (CCAP / CCDF)",
    description: "Check if your family may qualify for subsidized child care — income up to 85% of state median income — and estimate the subsidy with copays capped at 7% of income.",
    metaTitle: "Child Care Assistance Calculator — CCAP Eligibility & Copay",
    metaDescription: "Free child care assistance (CCAP/CCDF) calculator. Income limit up to 85% of state median income, 7% family copay cap and estimated subsidy.",
    calcInputs: [INCOME, currencyField("stateMedianIncome", "State Median Income for Your Family Size", { default: 95000, max: 500000, step: 500 }), percentField("stateLimitPercentOfSmi", "Your State's Limit (% of SMI, max 85%)", { default: 85, max: 85, step: 1 }), currencyField("annualChildCareCost", "Yearly Child Care Cost", { default: 14000, max: 100000, step: 100 })],
    calcResult: { label: "Likely Eligible? (1 = yes)", format: "number" },
    calcResults: [
      { key: "likelyEligible", label: "Likely Eligible? (1 = yes)", format: "number", highlight: true },
      { key: "incomeLimit", label: "Income Limit", format: "currency" },
      { key: "maximumFamilyCopayPerYear", label: "Maximum Family Copay (7%)", format: "currency" },
      { key: "estimatedSubsidyPerYear", label: "Estimated Subsidy per Year", format: "currency" },
      { key: "percentOfStateMedianIncome", label: "Income as % of State Median", format: "percentage" },
    ],
    instructions: "Enter your family income, the state median income for your family size and your state's limit (many states are lower than 85%), and what child care costs.",
    examples: `Example: ${usd(48000)} income against a ${usd(95000)} state median qualifies; with care costing ${usd(14000)} and copays capped at ${usd(exCc.maximumFamilyCopayPerYear)}, the subsidy could be about ${usd(exCc.estimatedSubsidyPerYear)} a year.`,
    assumptions: "Child Care and Development Fund (45 CFR Part 98): federal maximum 85% of state median income, and the 2024 rule caps family copayments at 7% of income. Parents must be working, in school or training. Waiting lists are common. " + DISCLAIMER,
    faq: [
      { question: "Who qualifies for child care assistance?", answer: "Working or studying parents with income under their state's limit (up to 85% of state median income) and children under 13." },
      { question: "How much will I pay with a subsidy?", answer: "Your copay is set on a sliding scale and is capped at 7% of family income under federal rules." },
    ],
  }),
  T({
    slug: "tanf-calculator",
    title: "TANF Cash Assistance Calculator",
    description: "Estimate your monthly TANF cash assistance — your state's maximum grant for your family size minus countable income after the earned income disregards (CalWORKs, TAFDC, KTAP, MFIP and other state programs).",
    metaTitle: "TANF Calculator — Cash Assistance Benefit Estimate",
    metaDescription: "Free TANF / cash assistance calculator. State maximum grant minus countable income after earned income disregards.",
    calcInputs: [currencyField("stateMaximumGrant", "State Maximum Grant for Your Family Size", { default: 750, max: 3000, step: 1 }), currencyField("monthlyEarnedIncome", "Monthly Earnings", { default: 900, max: 10000, step: 5 }), currencyField("monthlyUnearnedIncome", "Monthly Unearned Income (child support, UI…)", { default: 0, max: 10000, step: 5 }), currencyField("earnedIncomeDisregard", "Flat Earned Income Disregard", { default: 90, max: 1000, step: 1 }), percentField("percentDisregard", "Percent of Remaining Earnings Disregarded", { default: 50, max: 100, step: 1 })],
    calcResult: { label: "Monthly TANF Benefit", format: "currency" },
    calcResults: [
      { key: "monthlyTanfBenefit", label: "Estimated Monthly TANF Benefit", format: "currency", highlight: true },
      { key: "countableIncome", label: "Countable Income", format: "currency" },
      { key: "earnedIncomeDisregarded", label: "Earnings Disregarded", format: "currency" },
      { key: "annualBenefit", label: "Annual Benefit", format: "currency" },
    ],
    instructions: "Find your state's maximum monthly grant for your family size (it ranges from about $200 to $1,200+ for a family of 3) and its earned income disregard, then enter your income.",
    examples: `Example: a ${usd(750)} maximum grant with ${usd(900)} of earnings ($90 + 50% disregarded) leaves ${usd(exTanf.countableIncome)} countable — about ${usd(exTanf.monthlyTanfBenefit)} a month.`,
    assumptions: "TANF benefits = state maximum payment − countable income. Disregards, asset limits, time limits (60 months federally) and work requirements are set by each state. Child support you receive is usually assigned to the state. " + DISCLAIMER,
    faq: [
      { question: "How much is TANF a month?", answer: "It depends on the state and family size — for a family of 3, maximum grants range from roughly $200 to over $1,200 a month." },
      { question: "Can I work and get TANF?", answer: "Yes — states disregard part of your earnings, so the grant shrinks gradually as you earn more." },
    ],
  }),
  T({
    slug: "section-8-rent-calculator",
    title: "Section 8 Rent Calculator (Housing Choice Voucher)",
    description: "Estimate your rent with a Section 8 Housing Choice Voucher — total tenant payment (30% of adjusted income), the housing assistance payment and what you pay the landlord.",
    metaTitle: "Section 8 Rent Calculator — Tenant Portion & HAP",
    metaDescription: "Free Section 8 rent calculator. Adjusted income, total tenant payment (30% / 10% rule), HAP, tenant rent and the 40% move-in rule.",
    calcInputs: [
      INCOME,
      numberField("dependents", "Dependents (under 18, disabled, full-time students)", { default: 2, max: 15 }),
      dropdown("elderlyOrDisabled", "Head or Spouse 62+ or Disabled?", YESNO, 0),
      currencyField("annualChildCare", "Yearly Child Care Costs", { default: 0, max: 50000, step: 50 }),
      currencyField("unreimbursedMedical", "Yearly Medical Costs Over 10% of Income (elderly/disabled)", { default: 0, max: 100000, step: 50 }),
      currencyField("minimumRent", "PHA Minimum Rent", { default: 50, max: 50, step: 1 }),
      currencyField("contractRent", "Landlord's Rent", { default: 1450, max: 10000, step: 5 }),
      currencyField("utilityAllowance", "Utility Allowance", { default: 150, max: 1000, step: 1 }),
      currencyField("paymentStandard", "Payment Standard for the Unit Size", { default: 1650, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Your Rent to the Landlord", format: "currency" },
    calcResults: [
      { key: "tenantRentToLandlord", label: "Your Rent to the Landlord", format: "currency", highlight: true },
      { key: "totalTenantPayment", label: "Total Tenant Payment (incl. utilities)", format: "currency" },
      { key: "housingAssistancePayment", label: "Housing Assistance Payment (to landlord)", format: "currency" },
      { key: "adjustedAnnualIncome", label: "Adjusted Annual Income", format: "currency" },
      { key: "rentBurdenPercent", label: "Rent + Utilities as % of Income", format: "percentage" },
      { key: "over40PercentAtMoveIn", label: "Over the 40% Move-In Limit? (1 = yes)", format: "number" },
    ],
    instructions: "Enter gross household income and deductions, the unit's rent, the PHA's utility allowance and the payment standard for the voucher size (on your voucher or PHA website).",
    examples: `Example: ${usd(28000)} income with 2 dependents gives a total tenant payment of ${usd(exS8.totalTenantPayment)}; for a ${usd(1450)} unit you'd pay the landlord about ${usd(exS8.tenantRentToLandlord)} and the PHA ${usd(exS8.housingAssistancePayment)}.`,
    assumptions: "24 CFR §5.628: TTP = the greatest of 30% of monthly adjusted income, 10% of monthly gross income or the minimum rent (up to $50). Adjusted income deducts $480 per dependent, $525 for elderly/disabled families (HOTMA, inflation-adjusted) and qualifying child care and medical costs. If gross rent exceeds the payment standard you pay the difference, but not more than 40% of adjusted monthly income at move-in. " + DISCLAIMER,
    faq: [
      { question: "How much rent do you pay with Section 8?", answer: "Generally 30% of your adjusted monthly income for rent and utilities, plus any amount the unit's rent exceeds the payment standard." },
      { question: "What is the 40% rule?", answer: "At move-in, your share of rent plus utilities can't exceed 40% of your adjusted monthly income." },
    ],
  }),
  T({
    slug: "voucher-bedroom-size-calculator",
    title: "Housing Voucher Bedroom Size Calculator",
    description: "Estimate the voucher bedroom size your public housing agency will assign — usually two people per bedroom — including adults, children and a live-in aide.",
    metaTitle: "Section 8 Bedroom Size Calculator — Voucher Subsidy Standards",
    metaDescription: "Free housing voucher bedroom calculator. Estimate the voucher size from household members using common PHA subsidy standards.",
    calcInputs: [numberField("householdSize", "Household Members", { default: 5, min: 1, max: 20 }), numberField("personsPerBedroom", "PHA Standard — Persons per Bedroom", { default: 2, min: 1, max: 3 }), numberField("unrelatedAdults", "Adults Who Need Their Own Bedroom", { default: 0, max: 10 }), dropdown("liveInAide", "Approved Live-In Aide?", YESNO, 0)],
    calcResult: { label: "Voucher Bedroom Size", format: "number" },
    calcResults: [
      { key: "voucherBedroomSize", label: "Voucher Bedroom Size", format: "number", highlight: true },
      { key: "peopleCounted", label: "People Counted", format: "number" },
      { key: "oneBedroomAllowedForSingle", label: "Single Person (0-BR or 1-BR)? (1 = yes)", format: "number" },
    ],
    instructions: "Count everyone on the lease. Some PHAs give adults or a live-in aide their own bedroom — check your PHA's administrative plan.",
    examples: `Example: a 5-person household at 2 persons per bedroom gets a ${exVb.voucherBedroomSize}-bedroom voucher.`,
    assumptions: "HUD lets each PHA set subsidy standards (24 CFR §982.402); two persons per bedroom is the most common, with reasonable accommodations for disabilities and live-in aides. You can rent a larger unit, but the subsidy is based on the voucher size. " + DISCLAIMER,
    faq: [
      { question: "How many bedrooms will my Section 8 voucher be?", answer: "Usually one bedroom for every two people, set by your local PHA's subsidy standards." },
      { question: "Can I rent a bigger unit than my voucher size?", answer: "Yes, but the payment standard stays at your voucher size, so you'd pay more." },
    ],
  }),
  T({
    slug: "lihtc-rent-calculator",
    title: "LIHTC Rent Calculator (Tax Credit Rent Limits)",
    description: "Calculate maximum Low-Income Housing Tax Credit (LIHTC) rents — 30% of the income limit for the unit's imputed household size (1.5 persons per bedroom) at the 50% or 60% set-aside, minus the utility allowance.",
    metaTitle: "LIHTC Rent Calculator — Maximum Tax Credit Rents",
    metaDescription: "Free LIHTC rent limit calculator. 30% of the AMI-based income limit at 1.5 persons per bedroom, by unit size and set-aside, net of utilities.",
    calcInputs: [currencyField("areaMedianIncomeFamilyOf4", "Area Median Income (family of 4)", { default: 100000, max: 500000, step: 100 }), dropdown("bedrooms", "Unit Size", [["Studio", 0], ["1 bedroom", 1], ["2 bedrooms", 2], ["3 bedrooms", 3], ["4 bedrooms", 4], ["5 bedrooms", 5]], 2), dropdown("incomeLimitPercent", "Set-Aside / Income Limit", [["60% AMI", 60], ["50% AMI", 50], ["80% AMI (income averaging)", 80], ["30% AMI", 30]], 60), currencyField("utilityAllowance", "Utility Allowance", { default: 120, max: 1000, step: 1 })],
    calcResult: { label: "Maximum Tenant Rent", format: "currency" },
    calcResults: [
      { key: "maximumTenantRent", label: "Maximum Tenant-Paid Rent", format: "currency", highlight: true },
      { key: "maximumGrossRent", label: "Maximum Gross Rent (incl. utilities)", format: "currency" },
      { key: "incomeLimitForUnit", label: "Income Limit at Imputed Size", format: "currency" },
      { key: "imputedHouseholdSize", label: "Imputed Household Size", format: "number" },
    ],
    instructions: "Use HUD's Multifamily Tax Subsidy Project (MTSP) median income for your area, the unit size, the set-aside and the utility allowance.",
    examples: `Example: with a ${usd(100000)} AMI, a 2-bedroom 60% unit has a gross rent limit of ${usd(exLt.maximumGrossRent)} — ${usd(exLt.maximumTenantRent)} after a ${usd(120)} utility allowance.`,
    assumptions: "IRC §42(g)(2): gross rent ≤ 30% of the imputed income limitation (1 person for a studio, 1.5 per bedroom). Income limits by household size use HUD's adjustments (1 person 70%, 2 80%, 3 90%, 4 100%, 5 108%, 6 116% of the 4-person figure; half-persons interpolated). " + DISCLAIMER,
    faq: [
      { question: "How are LIHTC rents calculated?", answer: "30% of the income limit for a household of 1.5 people per bedroom, at the project's set-aside (usually 60% of AMI)." },
      { question: "Is LIHTC rent based on my income?", answer: "No — the rent is fixed by the unit's limit, not your actual income (unlike Section 8)." },
    ],
  }),
  T({
    slug: "usda-income-eligibility-calculator",
    title: "USDA Income Eligibility Calculator",
    description: "Check USDA Rural Development income eligibility — adjusted household income against 115% of area median income for guaranteed home loans, 80% for direct loans, or 50% for very-low-income housing and rental assistance.",
    metaTitle: "USDA Income Eligibility Calculator — Rural Development Limits",
    metaDescription: "Free USDA income eligibility calculator. Adjusted income vs 115%, 80% or 50% of area median income for USDA loans and rental assistance.",
    calcInputs: [dropdown("program", "USDA Program", E.USDA_PROGRAMS.map(([n], i) => [n, i] as [string, number]), 0), currencyField("areaMedianIncome", "Area Median Income for Your County / Household Size", { default: 98000, max: 500000, step: 100 }), currencyField("annualHouseholdIncome", "Annual Household Income (all adults)", { default: 112000, max: 1000000, step: 500 }), numberField("childrenUnder18", "Children Under 18 / Full-Time Students", { default: 2, max: 15 }), dropdown("elderlyOrDisabled", "Elderly (62+) or Disabled Household?", YESNO, 0), currencyField("childCareExpenses", "Yearly Child Care (children 12 and under)", { default: 3000, max: 50000, step: 100 }), currencyField("medicalExpenses", "Yearly Medical Costs Over 3% (elderly/disabled)", { default: 0, max: 100000, step: 100 })],
    calcResult: { label: "Under the Limit? (1 = yes)", format: "number" },
    calcResults: [
      { key: "underTheLimit", label: "Under the Income Limit? (1 = yes)", format: "number", highlight: true },
      { key: "adjustedAnnualIncome", label: "Adjusted Annual Income", format: "currency" },
      { key: "incomeLimit", label: "Income Limit", format: "currency" },
      { key: "roomUnderLimit", label: "Room Under the Limit", format: "currency" },
    ],
    instructions: "Find your county's median income (or the USDA limit itself) on the USDA eligibility site, then enter the income of every adult in the household and your deductions.",
    examples: `Example: ${usd(112000)} of income with 2 children and ${usd(3000)} of child care adjusts to ${usd(exUs.adjustedAnnualIncome)} — under the ${usd(exUs.incomeLimit)} guaranteed-loan limit.`,
    assumptions: "7 CFR 3555 / 3560: annual income of all household members, minus $480 per minor or full-time student, $400 for an elderly or disabled family, child care and certain medical costs. The guaranteed loan limit is 115% of AMI; direct loans and rental assistance use low (80%) and very-low (50%) limits. The property must also be in an eligible rural area. " + DISCLAIMER,
    faq: [
      { question: "What is the income limit for a USDA loan?", answer: "115% of the area median income for guaranteed loans — for many areas about $110,000–$140,000 for a family of 1–4." },
      { question: "Does USDA count everyone's income?", answer: "Yes — eligibility uses the income of all adults in the household, even if they're not on the loan." },
    ],
  }),
  T({
    slug: "national-debt-calculator",
    title: "US National Debt Calculator",
    description: "Break down the US national debt — per person, per taxpayer and per household, as a share of GDP, how fast it grows every second, and how long it would take to repay.",
    metaTitle: "US National Debt Calculator — Debt per Person & per Taxpayer",
    metaDescription: "Free US national debt calculator. Debt per citizen, taxpayer and household, debt-to-GDP, growth per second and years to repay.",
    calcInputs: [
      numberField("totalDebtTrillions", "Total Public Debt ($ trillions — check Debt to the Penny)", { default: 39.8, max: 100, step: 0.01 }),
      numberField("annualDeficitTrillions", "Annual Deficit ($ trillions)", { default: 1.9, max: 10, step: 0.01 }),
      numberField("gdpTrillions", "GDP ($ trillions)", { default: 31, min: 1, max: 100, step: 0.1 }),
      numberField("populationMillions", "US Population (millions)", { default: 343, min: 1, max: 1000 }),
      numberField("taxpayersMillions", "Taxpayers (millions of returns)", { default: 160, min: 1, max: 500 }),
      numberField("householdsMillions", "Households (millions)", { default: 133, min: 1, max: 500 }),
      numberField("annualSurplusToRepayTrillions", "Yearly Surplus to Repay ($ trillions, optional)", { default: 0.5, max: 10, step: 0.05 }),
    ],
    calcResult: { label: "Debt per Person", format: "currency" },
    calcResults: [
      { key: "debtPerPerson", label: "Debt per Person", format: "currency", highlight: true },
      { key: "debtPerTaxpayer", label: "Debt per Taxpayer", format: "currency" },
      { key: "debtPerHousehold", label: "Debt per Household", format: "currency" },
      { key: "debtToGdpPercent", label: "Debt to GDP", format: "percentage" },
      { key: "debtGrowthPerSecond", label: "Debt Growth per Second", format: "currency" },
      { key: "deficitPerPerson", label: "This Year's Deficit per Person", format: "currency" },
      { key: "yearsToRepay", label: "Years to Repay at That Surplus", format: "number" },
    ],
    instructions: "Defaults are estimates for late 2026 — update the total public debt from the Treasury's 'Debt to the Penny' and the deficit from the latest CBO or Treasury report.",
    examples: `Example: $39.8 trillion of debt is about ${usd(Math.round(exDebt.debtPerPerson))} per American and ${usd(Math.round(exDebt.debtPerTaxpayer))} per taxpayer — ${exDebt.debtToGdpPercent}% of GDP, growing about ${usd(Math.round(exDebt.debtGrowthPerSecond))} a second.`,
    assumptions: "Total public debt includes debt held by the public (~80%) and intragovernmental holdings such as the Social Security trust funds. Defaults: ~$39.8T debt, ~$1.9T deficit, ~$31T GDP, 343M people, 160M tax returns, 133M households — replace them with the latest figures. " + DISCLAIMER,
    faq: [
      { question: "How much is the national debt per person?", answer: "Roughly $115,000–$120,000 per American at about $40 trillion of total debt." },
      { question: "What's the difference between the debt and the deficit?", answer: "The deficit is one year's shortfall of revenue below spending; the debt is the total of all past deficits (minus surpluses)." },
    ],
  }),
  T({
    slug: "social-security-cuts-calculator",
    title: "Social Security Cuts Calculator (Trust Fund Shortfall)",
    description: "See how an across-the-board Social Security cut would change your benefit if the trust fund runs short — around 23% when the retirement trust fund is projected to be depleted in the 2030s.",
    metaTitle: "Social Security Cuts Calculator — Benefit After a Shortfall",
    metaDescription: "Free calculator for a Social Security benefit cut. Apply the projected payable percentage (about 77%) to your benefit and see the monthly and yearly loss.",
    calcInputs: [currencyField("monthlyBenefit", "Your Monthly Social Security Benefit", { default: 2000, max: 10000, step: 5 }), percentField("payablePercent", "Share of Benefits Payable After Depletion", { default: 77, step: 1 })],
    calcResult: { label: "Benefit After Cut", format: "currency" },
    calcResults: [
      { key: "benefitAfterCut", label: "Monthly Benefit After a Cut", format: "currency", highlight: true },
      { key: "monthlyCut", label: "Monthly Reduction", format: "currency" },
      { key: "annualCut", label: "Yearly Reduction", format: "currency" },
      { key: "cutPercent", label: "Cut", format: "percentage" },
    ],
    instructions: "Enter your current or expected monthly benefit and the payable percentage from the latest Social Security Trustees Report (the default is about 77% for the retirement (OASI) fund; about 81% for the combined funds).",
    examples: `Example: a ${usd(2000)} benefit would fall to ${usd(exCut.benefitAfterCut)} — ${usd(exCut.annualCut)} less a year — if only 77% could be paid.`,
    assumptions: "Trustees projections: the OASI trust fund is projected to be depleted in the early 2030s, after which incoming payroll taxes cover roughly 77% of scheduled benefits (about 81% for OASI and DI combined). The cut would be the same percentage in every state; Congress can change the law before then. " + DISCLAIMER,
    faq: [
      { question: "Will Social Security be cut in 2033?", answer: "Only if Congress doesn't act — current projections show about 77% of retirement benefits payable after the trust fund is depleted." },
      { question: "Would the cut be different by state?", answer: "No — a trust fund shortfall would reduce benefits by the same percentage everywhere; state taxes on benefits differ." },
    ],
  }),
  T({
    slug: "wep-gpo-repeal-calculator",
    title: "WEP & GPO Repeal Calculator (Social Security Fairness Act)",
    description: "Estimate how much your Social Security went up when the Windfall Elimination Provision (WEP) and Government Pension Offset (GPO) were repealed — the monthly increase and retroactive payment back to January 2024.",
    metaTitle: "WEP Repeal Calculator — Social Security Fairness Act Increase",
    metaDescription: "Free WEP/GPO repeal calculator. Estimate the benefit increase and retroactive pay from the Social Security Fairness Act for public pension recipients.",
    calcInputs: [currencyField("aime", "Average Indexed Monthly Earnings (AIME)", { default: 3000, max: 15000, step: 10 }), numberField("yearsOfSubstantialEarnings", "Years of Substantial Social Security Earnings", { default: 20, max: 40 }), currencyField("monthlyPension", "Monthly Non-Covered Government Pension", { default: 2500, max: 20000, step: 10 }), currencyField("spousalOrSurvivorBenefit", "Spousal / Survivor Benefit Before GPO (if any)", { default: 0, max: 5000, step: 5 }), numberField("monthsSinceJan2024", "Months of Benefits Since January 2024", { default: 33, max: 120 })],
    calcResult: { label: "Monthly Increase", format: "currency" },
    calcResults: [
      { key: "monthlyIncreaseFromRepeal", label: "Monthly Increase from the Repeal", format: "currency", highlight: true },
      { key: "wepReductionRemoved", label: "WEP Reduction Removed", format: "currency" },
      { key: "gpoReductionRemoved", label: "GPO Reduction Removed", format: "currency" },
      { key: "retroactivePayment", label: "Retroactive Payment (approx.)", format: "currency" },
      { key: "fullBenefitNow", label: "Your Own Benefit Without WEP", format: "currency" },
    ],
    instructions: "Enter your AIME, your years of substantial Social Security earnings, your monthly pension from non-covered work (teacher, police, firefighter, some federal and state jobs), any spousal or survivor benefit that GPO reduced, and how many months you've received benefits since January 2024.",
    examples: `Example: an AIME of ${usd(3000)}, 20 substantial years and a ${usd(2500)} pension: WEP had cut about ${usd(exWep.wepReductionRemoved)} a month, so the repeal adds that back — about ${usd(exWep.retroactivePayment)} retroactively over 33 months.`,
    assumptions: "Social Security Fairness Act (signed 5 January 2025) ended WEP and GPO for benefits payable after December 2023. WEP had replaced the 90% first bend-point factor with 40% (rising 5% for each year of substantial earnings from 21 to 29), limited to half the pension; GPO had cut spousal/survivor benefits by two-thirds of the government pension. Figures use 2026 bend points; SSA's own recalculation is final. " + DISCLAIMER,
    faq: [
      { question: "Has the WEP been repealed?", answer: "Yes — the Social Security Fairness Act repealed WEP and GPO for benefits payable from January 2024." },
      { question: "Did I get back pay for the WEP repeal?", answer: "Yes — SSA paid retroactive amounts back to January 2024 and increased monthly benefits." },
    ],
  }),
  T({
    slug: "aca-affordability-calculator",
    title: "ACA Affordability Calculator 2026 (Employer Coverage)",
    description: "Check whether employer health coverage is 'affordable' under the ACA for 2026 — the employee's self-only premium at or below 9.96% of income — using household income or the W-2, rate of pay or FPL safe harbors.",
    metaTitle: "ACA Affordability Calculator 2026 — 9.96% Safe Harbors",
    metaDescription: "Free ACA affordability calculator. Test employee premiums against 9.96% of income (2026) with W-2, rate of pay and FPL safe harbors.",
    calcInputs: [currencyField("employeeMonthlyPremium", "Employee's Monthly Self-Only Premium (lowest-cost plan)", { default: 320, max: 5000, step: 1 }), dropdown("safeHarbor", "Method", [["Household income", 0], ["W-2 safe harbor (Box 1)", 1], ["Rate of pay safe harbor (hourly × 130)", 2], ["Federal poverty line safe harbor", 3]], 1), currencyField("boxOneW2Wages", "W-2 Box 1 Wages", { default: 42000, max: 1000000, step: 100 }), currencyField("hourlyRate", "Hourly Rate", { default: 0, max: 500, step: 0.05 }), currencyField("householdIncome", "Household Income", { default: 0, max: 1000000, step: 100 })],
    calcResult: { label: "Affordable? (1 = yes)", format: "number" },
    calcResults: [
      { key: "affordable", label: "Affordable? (1 = yes)", format: "number", highlight: true },
      { key: "premiumPercentOfIncome", label: "Premium as % of Income", format: "percentage" },
      { key: "maximumAffordableMonthlyPremium", label: "Maximum Affordable Monthly Premium", format: "currency" },
      { key: "affordabilityThresholdPercent", label: "2026 Threshold", format: "percentage" },
    ],
    instructions: "Enter the employee's share of the monthly premium for the lowest-cost self-only plan that provides minimum value, and choose a safe harbor (employers) or household income (employees checking Marketplace eligibility).",
    examples: `Example: a ${usd(320)} monthly premium on ${usd(42000)} of W-2 wages is ${exAff.premiumPercentOfIncome}% — ${exAff.affordable ? "affordable" : "not affordable"} (maximum ${usd(exAff.maximumAffordableMonthlyPremium)} a month).`,
    assumptions: "2026 affordability percentage 9.96% (Rev. Proc. 2025-25). Employer safe harbors: Form W-2 Box 1 wages, rate of pay (hourly × 130 hours a month), or the federal poverty line (2026 FPL for one person). Unaffordable coverage can trigger employer shared responsibility penalties if an employee gets a premium tax credit. " + DISCLAIMER,
    faq: [
      { question: "What is the ACA affordability percentage for 2026?", answer: "9.96% of household income (or of the safe-harbor amount) for self-only coverage." },
      { question: "Does family coverage cost count?", answer: "For the employer test, no — only self-only coverage; family members' Marketplace eligibility uses the family premium since the 2023 'family glitch' fix." },
    ],
  }),
  T({
    slug: "aca-minimum-value-calculator",
    title: "ACA Minimum Value Calculator",
    description: "Check if an employer health plan provides minimum value under the ACA — the plan pays at least 60% of the total allowed cost of benefits — and its approximate metal tier.",
    metaTitle: "ACA Minimum Value Calculator — 60% Actuarial Value Test",
    metaDescription: "Free minimum value calculator. Plan-paid share of expected claims vs the 60% ACA minimum value standard, with metal tier equivalent.",
    calcInputs: [currencyField("totalExpectedClaims", "Total Expected Allowed Costs per Member", { default: 10000, max: 1000000, step: 100 }), currencyField("planPaidClaims", "Amount the Plan Pays", { default: 6600, max: 1000000, step: 100 })],
    calcResult: { label: "Actuarial Value", format: "percentage" },
    calcResults: [
      { key: "actuarialValuePercent", label: "Plan's Share of Costs (actuarial value)", format: "percentage", highlight: true },
      { key: "meetsMinimumValue", label: "Meets Minimum Value (60%)? (1 = yes)", format: "number" },
      { key: "shortfallPercentagePoints", label: "Shortfall (percentage points)", format: "number" },
      { key: "metalTierEquivalent", label: "Tier (0 below, 1 bronze, 2 silver, 3 gold, 4 platinum)", format: "number" },
    ],
    instructions: "Use the expected allowed costs for a standard population and the amount the plan pays after deductibles, copays and coinsurance — typically from the HHS/IRS MV Calculator output.",
    examples: `Example: a plan paying ${usd(6600)} of ${usd(10000)} in expected costs has a ${exMv.actuarialValuePercent}% value — meets minimum value (silver-level).`,
    assumptions: "IRC §36B(c)(2)(C)(ii): minimum value = the plan's share of total allowed costs is at least 60% and it covers substantial hospital and physician services. The official test uses the HHS MV Calculator or actuarial certification. Metal tiers: bronze ~60%, silver ~70%, gold ~80%, platinum ~90%. " + DISCLAIMER,
    faq: [
      { question: "What is minimum value under the ACA?", answer: "A plan that pays at least 60% of the total cost of covered benefits for a standard population and covers hospital and physician services." },
      { question: "What happens if a plan isn't minimum value?", answer: "Employees can qualify for Marketplace premium tax credits, and large employers may owe a penalty." },
    ],
  }),
  T({
    slug: "aca-ale-calculator",
    title: "Applicable Large Employer (ALE) Calculator",
    description: "Find out if your business is an Applicable Large Employer under the ACA — 50 or more full-time plus full-time-equivalent employees — and must offer coverage and file Forms 1094-C/1095-C.",
    metaTitle: "ALE Calculator — Are You an Applicable Large Employer?",
    metaDescription: "Free ACA ALE calculator. Count full-time employees plus FTEs (part-time hours ÷ 120) to see if you reach 50.",
    calcInputs: [numberField("averageFullTimeEmployees", "Average Full-Time Employees per Month (30+ hrs/week)", { default: 42, max: 100000, step: 0.5 }), numberField("monthlyPartTimeHours", "Average Monthly Hours of All Part-Time Employees", { default: 1200, max: 10000000, step: 10 })],
    calcResult: { label: "ALE? (1 = yes)", format: "number" },
    calcResults: [
      { key: "applicableLargeEmployer", label: "Applicable Large Employer? (1 = yes)", format: "number", highlight: true },
      { key: "fullTimeEquivalents", label: "Full-Time Equivalents", format: "number" },
      { key: "totalCountedEmployees", label: "Total Counted Employees", format: "number" },
      { key: "employeesUntilAle", label: "Employees Until ALE Status", format: "number" },
    ],
    instructions: "Use averages for the previous calendar year: full-time employees (30+ hours a week or 130 hours a month) and the total monthly hours worked by part-time employees (count no more than 120 hours per person).",
    examples: `Example: 42 full-time employees and 1,200 part-time hours a month (${exAle.fullTimeEquivalents} FTEs) total ${exAle.totalCountedEmployees} — ${exAle.applicableLargeEmployer ? "an ALE" : "not an ALE"}.`,
    assumptions: "IRC §4980H: an ALE had an average of at least 50 full-time employees including FTEs in the prior calendar year; FTEs = part-time hours ÷ 120 per month. Related companies under common ownership are counted together. A seasonal-worker exception may apply. " + DISCLAIMER,
    faq: [
      { question: "What is an ALE?", answer: "An employer with 50 or more full-time and full-time-equivalent employees on average in the prior year." },
      { question: "Do part-time employees count toward 50?", answer: "Yes — their combined hours are converted into full-time equivalents (120 hours = 1 FTE)." },
    ],
  }),
  T({
    slug: "hospital-financial-assistance-calculator",
    title: "Hospital Financial Assistance Calculator (Charity Care)",
    description: "Estimate whether you qualify for hospital financial assistance (charity care) — free care below about 200% of poverty and discounts up to 400% at many nonprofit hospitals — and what you might owe.",
    metaTitle: "Hospital Financial Assistance Calculator — Charity Care",
    metaDescription: "Free hospital financial assistance calculator. Compare your income with typical charity care tiers (200% / 400% of poverty) and estimate your reduced bill.",
    calcInputs: [INCOME, HH, REGION, currencyField("billAmount", "Hospital Bill", { default: 8000, max: 5000000, step: 50 }), percentField("freeCareLimitPercent", "Hospital's Free-Care Limit (% FPL)", { default: 200, max: 600, step: 10 }), percentField("discountLimitPercent", "Hospital's Discount Limit (% FPL)", { default: 400, max: 800, step: 10 }), percentField("discountPercent", "Discount in the Middle Tier", { default: 60, max: 100, step: 5 })],
    calcResult: { label: "Estimated Discount", format: "percentage" },
    calcResults: [
      { key: "estimatedDiscountPercent", label: "Estimated Discount", format: "percentage", highlight: true },
      { key: "amountYouMayOwe", label: "Amount You May Owe", format: "currency" },
      { key: "percentOfPovertyLevel", label: "Income as % of Poverty", format: "percentage" },
      { key: "likelyFreeCare", label: "Likely Free Care? (1 = yes)", format: "number" },
    ],
    instructions: "Check the hospital's financial assistance policy (nonprofits must publish one) for its income tiers, then enter your income, household size and bill.",
    examples: `Example: a family of 4 earning ${usd(52000)} is at ${exHfa.percentOfPovertyLevel}% of poverty — free care at a hospital with a 200% limit, so the ${usd(8000)} bill could be forgiven.`,
    assumptions: "Nonprofit hospitals must have a written financial assistance policy (IRC §501(r)) and can't charge eligible patients more than amounts generally billed. Tiers vary widely (some states such as CA, NY, WA, IL and MD set minimums). You can usually apply up to 240 days after the first bill. " + DISCLAIMER,
    faq: [
      { question: "Can I get my hospital bill forgiven?", answer: "Often, if your income is under the hospital's financial assistance limits — many nonprofit hospitals give free care below 200% of poverty." },
      { question: "Can I apply after the bill goes to collections?", answer: "Generally yes, within 240 days of the first post-discharge bill for nonprofit hospitals." },
    ],
  }),
  T({
    slug: "no-surprises-act-calculator",
    title: "No Surprises Act Calculator (Good Faith Estimate Dispute)",
    description: "Check if you can dispute a medical bill under the No Surprises Act — uninsured or self-pay patients can use patient-provider dispute resolution when the bill is $400 or more above the good faith estimate.",
    metaTitle: "No Surprises Act Calculator — $400 Good Faith Estimate Rule",
    metaDescription: "Free No Surprises Act calculator. Compare your bill with the good faith estimate and see if it's $400+ over — eligible for patient-provider dispute resolution.",
    calcInputs: [currencyField("goodFaithEstimate", "Good Faith Estimate from the Provider", { default: 2500, max: 1000000, step: 10 }), currencyField("actualBill", "Actual Bill from That Provider", { default: 3200, max: 1000000, step: 10 })],
    calcResult: { label: "Amount Over the Estimate", format: "currency" },
    calcResults: [
      { key: "amountOverEstimate", label: "Amount Over the Estimate", format: "currency", highlight: true },
      { key: "canDispute", label: "Can Use Dispute Resolution? (1 = yes)", format: "number" },
      { key: "disputeFee", label: "Dispute Fee", format: "currency" },
      { key: "amountAtStake", label: "Amount at Stake", format: "currency" },
    ],
    instructions: "Compare the good faith estimate for a provider with that same provider's final bill. You must start the dispute within 120 days of receiving the bill.",
    examples: `Example: a ${usd(3200)} bill against a ${usd(2500)} estimate is ${usd(exNs.amountOverEstimate)} over — ${exNs.canDispute ? "eligible" : "not eligible"} for a $25 dispute.`,
    assumptions: "No Surprises Act (from 2022): uninsured/self-pay patients get a good faith estimate; if any provider's bill is at least $400 more than its estimate, the patient can use patient-provider dispute resolution ($25 fee). Separately, insured patients are protected from most surprise out-of-network bills for emergency care and certain in-network facility care. " + DISCLAIMER,
    faq: [
      { question: "What is the $400 rule?", answer: "If you're uninsured or self-pay and a provider bills you $400 or more above its good faith estimate, you can dispute the bill." },
      { question: "Do I have to pay while the dispute is going on?", answer: "The provider can't send the bill to collections while the dispute is pending." },
    ],
  }),
  T({
    slug: "long-term-disability-buyout-calculator",
    title: "Long-Term Disability Buyout Calculator (LTD Settlement)",
    description: "Estimate the value of a long-term disability lump-sum settlement or buyout — the present value of your remaining monthly benefits to the end of the benefit period, adjusted for the risk of benefits stopping.",
    metaTitle: "LTD Buyout Calculator — Long-Term Disability Settlement Value",
    metaDescription: "Free long-term disability buyout calculator. Present value of remaining LTD benefits, risk-adjusted value and the typical 30–70% offer range.",
    calcInputs: [currencyField("monthlyBenefit", "Gross Monthly LTD Benefit", { default: 4000, max: 50000, step: 10 }), currencyField("monthlyOffsets", "Offsets (SSDI, pension…)", { default: 1200, max: 50000, step: 10 }), numberField("currentAge", "Your Age", { default: 48, min: 18, max: 80 }), numberField("benefitEndAge", "Benefits End at Age", { default: 65, min: 18, max: 100 }), percentField("discountRatePercent", "Discount Rate", { default: 5, max: 15, step: 0.25 }), percentField("probabilityStayingOnClaimPercent", "Chance Benefits Continue to the End", { default: 70, step: 5 })],
    calcResult: { label: "Present Value", format: "currency" },
    calcResults: [
      { key: "presentValueOfFutureBenefits", label: "Present Value of Remaining Benefits", format: "currency", highlight: true },
      { key: "riskAdjustedValue", label: "Risk-Adjusted Value", format: "currency" },
      { key: "typicalOfferLow", label: "Typical Offer — Low (30%)", format: "currency" },
      { key: "typicalOfferHigh", label: "Typical Offer — High (70%)", format: "currency" },
      { key: "monthsRemaining", label: "Months Remaining", format: "number" },
    ],
    instructions: "Enter your monthly benefit after offsets, your age and when benefits end under the policy (often 65 or Social Security normal retirement age), a discount rate and how likely benefits are to continue.",
    examples: `Example: a net ${usd(2800)} a month until 65 from age 48 has a present value of about ${usd(Math.round(exLtd.presentValueOfFutureBenefits))}; insurers often offer 30–70% of that.`,
    assumptions: "Present value of a monthly annuity at the discount rate; the risk adjustment reflects the chance the insurer could end benefits (own-occupation changes, recovery, mortality). Buyouts are voluntary; tax treatment depends on who paid the premiums. " + DISCLAIMER,
    faq: [
      { question: "How much is an LTD buyout worth?", answer: "Insurers often offer roughly 30–70% of the present value of the remaining benefits, depending on the claim's strength." },
      { question: "Is a long-term disability settlement taxable?", answer: "If your employer paid the premiums with pre-tax money it's usually taxable; if you paid with after-tax money it's usually not." },
    ],
  }),
  T({
    slug: "cost-of-raising-a-child-calculator",
    title: "Cost of Raising a Child Calculator (USDA)",
    description: "Estimate the cost of raising a child from birth to 17 using the USDA's Expenditures on Children by Families — by family income level and number of children, adjusted for inflation to today's dollars.",
    metaTitle: "Cost of Raising a Child Calculator — USDA Estimate 2026",
    metaDescription: "Free USDA cost of raising a child calculator. Birth-to-17 cost by income group and family size, inflation-adjusted, per year and per month.",
    calcInputs: [dropdown("incomeGroup", "Family Income Group", [["Lower income", 0], ["Middle income", 1], ["Higher income", 2]], 1), numberField("childrenInFamily", "Children in the Family", { default: 2, min: 1, max: 10 }), numberField("inflationFactor", "Inflation Factor from 2015 Dollars", { default: 1.37, min: 1, max: 3, step: 0.01 })],
    calcResult: { label: "Total Cost Birth to 17", format: "currency" },
    calcResults: [
      { key: "totalCostBirthTo17", label: "Total Cost, Birth to 17", format: "currency", highlight: true },
      { key: "averagePerYear", label: "Average per Year", format: "currency" },
      { key: "averagePerMonth", label: "Average per Month", format: "currency" },
      { key: "collegeNotIncluded", label: "College Not Included (1 = true)", format: "number" },
    ],
    instructions: "Pick your income group (USDA's middle group was roughly $60,000–$110,000 in 2015 dollars, about $80,000–$150,000 today) and number of children. The inflation factor converts 2015 dollars to 2026.",
    examples: `Example: a middle-income family with 2 children spends about ${usd(Math.round(exCrc.totalCostBirthTo17))} per child to age 17 — around ${usd(Math.round(exCrc.averagePerYear))} a year.`,
    assumptions: "USDA Expenditures on Children by Families, 2015 (married-couple families, birth through 17): $174,690 lower, $233,610 middle, $372,210 higher income (2015 dollars). One-child families spend about 27% more per child; three or more about 22% less. Default inflation factor 1.37 (CPI 2015 → 2026). Housing, food, child care and education are included; college is not. " + DISCLAIMER,
    faq: [
      { question: "How much does it cost to raise a child?", answer: "Roughly $300,000–$330,000 to age 17 for a middle-income family in 2026 dollars, based on the USDA's estimates." },
      { question: "Is the USDA estimate updated?", answer: "The last full report was for 2015; this calculator adjusts it for inflation." },
    ],
  }),
  T({
    slug: "canada-child-benefit-calculator",
    title: "Canada Child Benefit (CCB) Calculator 2026–27",
    description: "Estimate your Canada Child Benefit for July 2026 – June 2027 — $8,157 per child under 6 and $6,883 per child 6–17, reduced as adjusted family net income rises above $38,237.",
    metaTitle: "Canada Child Benefit Calculator 2026–27 — CCB Payment",
    metaDescription: "Free CCB calculator for July 2026 – June 2027. Maximum $8,157 (under 6) and $6,883 (6–17), income thresholds $38,237 and $82,847.",
    calcInputs: [numberField("childrenUnder6", "Children Under 6", { default: 1, max: 10 }), numberField("children6To17", "Children 6 to 17", { default: 1, max: 10 }), currencyField("adjustedFamilyNetIncome", "2025 Adjusted Family Net Income (CAD)", { default: 90000, max: 1000000, step: 500 })],
    calcResult: { label: "Monthly CCB", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "monthlyCcb", label: "Monthly CCB", format: "currency", currency: "CAD", highlight: true },
      { key: "annualCcb", label: "Annual CCB", format: "currency", currency: "CAD" },
      { key: "maximumBeforeReduction", label: "Maximum Before Income Reduction", format: "currency", currency: "CAD" },
      { key: "incomeReduction", label: "Income Reduction", format: "currency", currency: "CAD" },
    ],
    instructions: "Enter your children's ages in the benefit year and your adjusted family net income from your 2025 tax returns (both spouses' line 23600, adjusted for UCCB/RDSP).",
    examples: `Example: one child under 6 and one aged 6–17 with $90,000 of family income: about $${exCcb.annualCcb.toLocaleString("en-CA")} a year ($${exCcb.monthlyCcb.toLocaleString("en-CA")} a month).`,
    assumptions: "July 2026 – June 2027: maximum $8,157 per child under 6 and $6,883 per child 6–17; reduced by 7% / 13.5% / 19% / 23% (1 / 2 / 3 / 4+ children) of income between $38,237 and $82,847, then 3.2% / 5.7% / 8% / 9.5% above. The Child Disability Benefit and provincial benefits are extra. " + DISCLAIMER,
    faq: [
      { question: "How much is the Canada Child Benefit in 2026?", answer: "Up to $679.75 a month per child under 6 and $573.58 per child 6–17 from July 2026, less for higher incomes." },
      { question: "When is the CCB paid?", answer: "Monthly, usually around the 20th." },
    ],
  }),
  T({
    slug: "universal-credit-calculator",
    title: "Universal Credit Calculator 2026/27 (UK Benefits)",
    description: "Estimate your Universal Credit for 2026/27 — standard allowance, child elements (two-child limit removed), housing costs, the work allowance and the 55% taper on earnings — plus the Scottish Child Payment in Scotland.",
    metaTitle: "Universal Credit Calculator 2026/27 — UK Benefits Estimate",
    metaDescription: "Free UK benefits calculator for 2026/27. Universal Credit standard allowance, child and housing elements, work allowance and 55% taper.",
    calcInputs: [
      dropdown("relationship", "Claim As", [["Single", 0], ["Couple", 1]], 0),
      dropdown("under25", "Age", [["25 or over", 0], ["Under 25", 1]], 0),
      numberField("children", "Children", { default: 2, max: 10 }),
      dropdown("firstChildBornBefore2017", "First Child Born Before 6 April 2017?", YESNO, 0),
      currencyField("monthlyRentEligible", "Monthly Rent Covered (up to your LHA rate, £)", { default: 750, max: 5000, step: 5 }),
      currencyField("otherElements", "Other Elements (LCWRA, carer, childcare 85%…, £)", { default: 0, max: 5000, step: 5 }),
      dropdown("limitedCapabilityForWork", "Limited Capability for Work?", YESNO, 0),
      currencyField("monthlyNetEarnings", "Monthly Take-Home Earnings (£)", { default: 1200, max: 20000, step: 5 }),
      currencyField("otherMonthlyIncome", "Other Unearned Income (£)", { default: 0, max: 10000, step: 5 }),
      dropdown("scotland", "Living in Scotland?", YESNO, 0),
      numberField("childrenUnder16", "Children Under 16 (Scottish Child Payment)", { default: 2, max: 10 }),
      currencyField("scottishChildPaymentWeekly", "Scottish Child Payment per Week (£)", { default: 27.15, max: 100, step: 0.05 }),
    ],
    calcResult: { label: "Monthly Universal Credit", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "monthlyUniversalCredit", label: "Estimated Monthly Universal Credit", format: "currency", currency: "GBP", highlight: true },
      { key: "maximumAward", label: "Maximum Award Before Earnings", format: "currency", currency: "GBP" },
      { key: "earningsReduction", label: "Reduction for Earnings (55%)", format: "currency", currency: "GBP" },
      { key: "workAllowance", label: "Work Allowance", format: "currency", currency: "GBP" },
      { key: "scottishChildPaymentMonthly", label: "Scottish Child Payment (monthly)", format: "currency", currency: "GBP" },
      { key: "totalMonthlySupport", label: "Total Monthly Support", format: "currency", currency: "GBP" },
    ],
    instructions: "Enter your household, eligible rent, take-home pay for the assessment period and any other elements on your statement. Savings over £6,000 reduce UC and over £16,000 stop it.",
    examples: `Example: a single parent (25+) with 2 children, £750 rent and £1,200 take-home pay gets about £${exUc.monthlyUniversalCredit} a month.`,
    assumptions: "2026/27 rates (from April 2026, monthly): standard allowance £424.90 single 25+, £338.58 under 25, £666.97 couple 25+, £528.34 couple under 25; child element £351.88 (first child born before 6 April 2017) or £303.94; work allowance £427 with housing costs or £710 without; taper 55%. The two-child limit was removed from April 2026. Check the current Scottish Child Payment rate. Not affiliated with the DWP. " + DISCLAIMER,
    faq: [
      { question: "How much is Universal Credit in 2026?", answer: "The standard allowance is £424.90 a month for a single person 25 or over, plus elements for children, housing and other needs." },
      { question: "How much does Universal Credit go down when I earn?", answer: "55p for every £1 of take-home pay above your work allowance (if you have one)." },
    ],
  }),
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
