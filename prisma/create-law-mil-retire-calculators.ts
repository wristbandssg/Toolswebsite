// One-time (but safe to re-run) batch setup script: creates 11 military retirement
// calculators (Law & Government Calculators > Military & Veterans Calculators). Rates and the
// 2026 pay table live in src/lib/calc-engine-law-mil-retire.ts; the examples below are
// computed from that engine so they always match the calculator.
// Merged keywords (covered here, no separate page): AF / USAF / Air Force, Coast Guard / USCG,
// Department of Defense / DOD / DFAS, Armed Forces Pension, MIL Retirement, Military / Army /
// DFAS High 3 → military-retirement; Reservist Retirement, National Guard Pension, Gray Area
// Retirement → reserve-guard-retirement; National Guard Points → reserve-retirement-points;
// Military Disability, Permanent Disability Retired List (PDRL) → military-medical-retirement;
// RCSBP → survivor-benefit-plan; Combat Related Special Compensation → crsc-crdp; Creditable
// Military Service → military-buyback.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-mil-retire-calculators.ts
// or
//   npm run db:create-law-mil-retire-calculators

import * as E from "../src/lib/calc-engine-law-mil-retire";

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
const DISCLAIMER = "Estimates only, based on the published 2026 rates and the current rules — DFAS, your service's retirement office (and the VA or OPM where noted) make the official calculation. Not affiliated with DFAS, the VA or the Department of Defense.";

const GRADES: [string, number][] = E.MIL_PAY_2026.map(([label], i) => [label, i]);
const g = (label: string) => GRADES.find(([l]) => l === label)![1];
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const SYSTEMS: [string, number][] = [["High-3 (legacy, 2.5%)", 0], ["Blended Retirement System (BRS, 2.0%)", 1], ["REDUX / Career Status Bonus", 2], ["Final Pay (entered before 8 Sep 1980)", 3]];
const RESERVE_SYSTEMS: [string, number][] = [["High-3 (2.5%)", 0], ["BRS (2.0%)", 1]];
const RATINGS: [string, number][] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((x) => [`${x}%`, x]);
const HIGH3_FIELD = currencyField("high3Monthly", "Your High-3 Average Monthly Basic Pay (0 = estimate from grade)", { default: 0, max: 25000, step: 10 });

const exRet = r(E.militaryRetirement, { system: 0, grade: g("E-7"), yearsOfService: 20, high3Monthly: 0, retirementAge: 38, lifeExpectancyAge: 85, colaPercent: 2.8 });
const exBrs = r(E.brsComparison, { grade: g("E-7"), yearsOfService: 20, high3Monthly: 0, yourTspPercent: 5, annualReturnPercent: 6, retirementAge: 38 });
const exRes = r(E.reserveRetirement, { totalPoints: 4200, system: 0, high3Monthly: 0, grade: g("E-7"), yearsOfService: 22, qualifyingActiveDutyDays: 360, currentAge: 44 });
const exPts = r(E.reservePoints, { drillPeriods: 48, otherInactivePoints: 0, activeDutyDays: 14 });
const exMed = r(E.medicalRetirement, { disabilityRating: 60, yearsOfService: 12, listType: 0, high3Monthly: 0, grade: g("E-6") });
const exSbp = r(E.survivorBenefitPlan, { monthlyRetiredPay: 3000, baseAmount: 3000, yearsPaying: 25 });
const exDiv = r(E.militaryRetirementDivorce, { high3AtDivorce: 5200, colaPercent: 2.8, yearsDivorceToRetirement: 8, yearsOfServiceAtDivorce: 12, system: 0, yearsMarriedDuringService: 10, spousePercentOfMarital: 50 });
const exCola = r(E.retirementCola, { monthlyRetiredPay: 3000, system: 0, colaPercent: 2.8, futureColaPercent: 2.5, years: 10 });
const exCc = r(E.crscCrdp, { monthlyRetiredPay: 3000, vaRating: 70, combatRelatedRating: 40, yearsOfService: 22 });
const exBuy = r(E.militaryBuyback, { militaryBasicPayEarned: 150000, system: 0, yearsSinceInterestStarted: 3, interestRatePercent: 4.25, expectedHigh3Salary: 90000, ageAtRetirement: 62, militaryYears: 4 });
const exSs = r(E.specialMilitarySsCredits, { quartersServed1957to1977: 8, yearsServed1978to2001: 4, averageAnnualBasicPay1978to2001: 18000 });

const TOOLS: ToolDef[] = [
  {
    slug: "military-retirement-calculator",
    title: "Military Retirement Calculator",
    description: "Estimate your military retired pay after 20+ years — High-3, BRS, REDUX or Final Pay — from your pay grade and years of service or your own high-3, with a lifetime total including COLA.",
    metaTitle: "Military Retirement Calculator 2026 — High-3, BRS & REDUX",
    metaDescription: "Free military retirement calculator. Estimate monthly retired pay for High-3, BRS, REDUX or Final Pay using the 2026 pay table and 2.8% COLA.",
    calcInputs: [
      dropdown("system", "Retirement System", SYSTEMS, 0),
      dropdown("grade", "Pay Grade at Retirement", GRADES, g("E-7")),
      numberField("yearsOfService", "Years of Service at Retirement", { default: 20, min: 20, max: 40, step: 0.5, unit: "years" }),
      HIGH3_FIELD,
      numberField("retirementAge", "Your Age at Retirement", { default: 38, min: 30, max: 70, unit: "years" }),
      numberField("lifeExpectancyAge", "Plan Until Age", { default: 85, min: 50, max: 105, unit: "years" }),
      percentField("colaPercent", "Yearly COLA", { default: 2.8, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Monthly Retired Pay", format: "currency" },
    calcResults: [
      { key: "monthlyRetiredPay", label: "Monthly Retired Pay", format: "currency", highlight: true },
      { key: "annualRetiredPay", label: "Annual Retired Pay", format: "currency" },
      { key: "retiredPayBase", label: "Retired Pay Base (High-3 or Final Pay)", format: "currency" },
      { key: "multiplierPercent", label: "Multiplier", format: "percentage" },
      { key: "estimatedLifetimePay", label: "Estimated Lifetime Retired Pay (before tax)", format: "currency" },
    ],
    instructions: "Pick your retirement system, the grade you'll retire at and your years of service. Leave the high-3 at 0 to estimate it from the 2026 pay table (36 months in your current grade), or enter your own average of your highest 36 months of basic pay for a closer figure. Works for every branch — Army, Navy, Air Force, Marine Corps, Space Force and Coast Guard use the same formulas.",
    examples: `Example: an E-7 retiring at 20 years under High-3 has an estimated high-3 of ${usd(exRet.retiredPayBase)}. At ${exRet.multiplierPercent}% that's ${usd(exRet.monthlyRetiredPay)} a month (${usd(exRet.annualRetiredPay)} a year) — about ${usd(exRet.estimatedLifetimePay)} from age 38 to 85 with 2.8% yearly COLAs.`,
    assumptions: `High-3 and Final Pay: 2.5% × years (max 75%); BRS: 2.0% × years; REDUX: 40% at 20 years + 3.5% for each extra year, with COLA at CPI − 1% (a one-time catch-up at 62 isn't modelled). Requires at least 20 years of active service. Retired pay is taxable; SBP premiums, VA offsets and the BRS lump-sum option aren't included. ${DISCLAIMER}`,
    faq: [
      { question: "How much is military retirement after 20 years?", answer: "50% of your high-3 average basic pay under the legacy system, or 40% under BRS (which adds TSP matching)." },
      { question: "Is military retirement taxed?", answer: "Yes, federally — many states exempt it fully or partly." },
      { question: "What was the 2026 military retiree COLA?", answer: "2.8%, effective with the pay received in January 2026." },
    ],
  },
  {
    slug: "brs-calculator",
    title: "BRS Calculator — Blended Retirement vs High-3",
    description: "Compare the Blended Retirement System with the legacy High-3 pension — monthly pension under each, the government TSP contributions you'd build up, and which comes out ahead.",
    metaTitle: "BRS Calculator — Blended Retirement vs Legacy High-3",
    metaDescription: "Free BRS vs High-3 calculator. Compare the 2.0% and 2.5% pensions and estimate the government TSP match (1% + up to 4%) at retirement.",
    calcInputs: [
      dropdown("grade", "Pay Grade at Retirement", GRADES, g("E-7")),
      numberField("yearsOfService", "Years of Service at Retirement", { default: 20, min: 1, max: 40, unit: "years" }),
      HIGH3_FIELD,
      percentField("yourTspPercent", "Your TSP Contribution (% of basic pay)", { default: 5, max: 100, step: 1 }),
      percentField("annualReturnPercent", "Expected TSP Return per Year", { default: 6, max: 15, step: 0.5 }),
      numberField("retirementAge", "Your Age at Retirement", { default: 38, min: 30, max: 70, unit: "years" }),
    ],
    calcResult: { label: "BRS Advantage (to age 85)", format: "currency" },
    calcResults: [
      { key: "brsAdvantage", label: "BRS Advantage to Age 85 (negative = High-3 better)", format: "currency", highlight: true },
      { key: "legacyMonthlyPension", label: "High-3 Monthly Pension", format: "currency" },
      { key: "brsMonthlyPension", label: "BRS Monthly Pension", format: "currency" },
      { key: "governmentTspBalance", label: "Government TSP Contributions + Growth", format: "currency" },
      { key: "pensionDifferencePerMonth", label: "Pension Difference per Month", format: "currency" },
    ],
    instructions: "Choose your expected retirement grade and years of service, how much of your basic pay you put into the TSP, and an expected return. To get the full BRS match you must contribute at least 5%.",
    examples: `Example: an E-7 retiring at 20 years gets ${usd(exBrs.legacyMonthlyPension)} a month under High-3 or ${usd(exBrs.brsMonthlyPension)} under BRS. Contributing 5% with a 6% return, the government's TSP money grows to about ${usd(exBrs.governmentTspBalance)}; over a retirement to age 85 the BRS difference is ${usd(exBrs.brsAdvantage)}.`,
    assumptions: `BRS: 1% automatic contribution plus a match of up to 4% (dollar for dollar on the first 3%, 50¢ on the next 2%) from the start of year 3 through year 26. Pay grows only with years of service on the 2026 table (no promotions or future raises); pensions aren't discounted or COLA-adjusted in the comparison. Members who leave before 20 years keep the BRS TSP money but get no pension under either system. ${DISCLAIMER}`,
    faq: [
      { question: "Is BRS better than High-3?", answer: "For members who leave before 20 years, BRS is almost always better because they keep the TSP match. For full 20-year careers, the legacy pension is often worth more unless TSP returns are strong." },
      { question: "Can I still switch to BRS?", answer: "No — the opt-in window closed on 31 December 2018. Everyone who joined from 2018 on is in BRS automatically." },
    ],
  },
  {
    slug: "reserve-guard-retirement-calculator",
    title: "Reserve & National Guard Retirement Calculator",
    description: "Estimate National Guard and Reserve retired pay from your retirement points — equivalent years of service, monthly pension, the age it starts (early with qualifying active duty) and your gray-area years.",
    metaTitle: "National Guard & Reserve Retirement Calculator — Points to Pay",
    metaDescription: "Free Guard & Reserve retirement calculator. Convert retirement points to equivalent years and estimate monthly retired pay starting at 60 or earlier.",
    calcInputs: [
      numberField("totalPoints", "Total Retirement Points", { default: 4200, max: 15000, step: 10, unit: "points" }),
      dropdown("system", "Retirement System", RESERVE_SYSTEMS, 0),
      dropdown("grade", "Highest Pay Grade Held", GRADES, g("E-7")),
      numberField("yearsOfService", "Years of Service for Pay at Age 60", { default: 22, max: 40, unit: "years" }),
      HIGH3_FIELD,
      numberField("qualifyingActiveDutyDays", "Qualifying Active Duty Days Since 28 Jan 2008", { default: 360, max: 3650, unit: "days" }),
      numberField("currentAge", "Age When You Stop Drilling", { default: 44, min: 30, max: 70, unit: "years" }),
    ],
    calcResult: { label: "Monthly Retired Pay", format: "currency" },
    calcResults: [
      { key: "monthlyRetiredPay", label: "Monthly Retired Pay", format: "currency", highlight: true },
      { key: "equivalentYears", label: "Equivalent Years of Service", format: "number" },
      { key: "annualRetiredPay", label: "Annual Retired Pay", format: "currency" },
      { key: "payStartAge", label: "Retired Pay Starts at Age", format: "number" },
      { key: "grayAreaYears", label: "Gray-Area Years (waiting for pay)", format: "number" },
    ],
    instructions: "Enter your total retirement points from your points statement (it must include at least 20 good years), your highest grade and the years of service that will count for pay at retirement. Add days of qualifying active duty (contingency or mobilization orders) after 28 January 2008 to see how much earlier your pay can start.",
    examples: `Example: 4,200 points equals ${exRes.equivalentYears} years. With an E-7 high-3 of about ${usd(Math.round(E.estimateHigh3(g("E-7"), 22)))}, retired pay would be about ${usd(exRes.monthlyRetiredPay)} a month, starting at age ${exRes.payStartAge} thanks to 360 days of qualifying active duty.`,
    assumptions: `Equivalent years = points ÷ 360; pay = 2.5% (BRS 2.0%) × equivalent years × high-3 average basic pay. Pay starts at 60, reduced by 3 months for each 90 days of qualifying active duty after 28 Jan 2008 (not below 50). High-3 is estimated from the 2026 pay table at your grade and years of service for pay. ${DISCLAIMER}`,
    faq: [
      { question: "What is the gray area?", answer: "The years between finishing your 20 good years and the age your retired pay starts (usually 60)." },
      { question: "How many points do I need?", answer: "At least 50 points in each of 20 qualifying years — total points then set the amount." },
    ],
  },
  {
    slug: "reserve-retirement-points-calculator",
    title: "National Guard Retirement Points Calculator",
    description: "Count your Guard or Reserve retirement points for the year — 15 membership points, drill periods, other inactive points (capped at 130) and active duty days — and see if it's a good year.",
    metaTitle: "Retirement Points Calculator — National Guard & Reserve",
    metaDescription: "Free Guard & Reserve points calculator. Add membership, drill, course and active duty points, apply the 130-point cap and check for a good year.",
    calcInputs: [
      numberField("drillPeriods", "Drill Periods (1 point each)", { default: 48, max: 200 }),
      numberField("otherInactivePoints", "Other Inactive Points (courses, funeral honors…)", { default: 0, max: 200 }),
      numberField("activeDutyDays", "Active Duty Days (AT, ADOS, orders)", { default: 14, max: 365, unit: "days" }),
    ],
    calcResult: { label: "Total Retirement Points", format: "number" },
    calcResults: [
      { key: "totalRetirementPoints", label: "Total Retirement Points", format: "number", highlight: true },
      { key: "inactiveDutyPoints", label: "Inactive Duty Points (incl. 15 membership)", format: "number" },
      { key: "activeDutyPoints", label: "Active Duty Points", format: "number" },
      { key: "goodYear", label: "Good Year (50+ points)? (1 = yes)", format: "number" },
      { key: "pointsOverInactiveCap", label: "Inactive Points Lost to the 130 Cap", format: "number" },
      { key: "equivalentDaysOfService", label: "Equivalent Days of Service", format: "number" },
    ],
    instructions: "Enter the drill periods you attend in your retirement year (a drill weekend is 4), any other inactive-duty points such as correspondence courses, and your days on active duty.",
    examples: `Example: 48 drill periods + 15 membership points + 14 days of annual training = ${exPts.totalRetirementPoints} points — a good year.`,
    assumptions: `15 membership points a year; inactive points (membership, drills, courses) are capped at 130 per retirement year; each day of active duty is 1 point; a retirement year counts at most 365 points. A good year needs 50. ${DISCLAIMER}`,
    faq: [
      { question: "How many points is a drill weekend?", answer: "Four — one for each 4-hour drill period." },
      { question: "Is there a cap on retirement points?", answer: "Inactive duty points are capped at 130 a year; active duty points aren't capped below 365." },
    ],
  },
  {
    slug: "military-medical-retirement-calculator",
    title: "Military Medical Retirement Calculator",
    description: "Estimate military disability (medical) retired pay for the PDRL or TDRL — the higher of your DoD rating or 2.5% per year of service times your high-3 — and how VA compensation affects it.",
    metaTitle: "Military Medical Retirement Calculator — PDRL & TDRL Pay",
    metaDescription: "Free military disability retirement calculator. Rating or years-of-service method, 75% cap, TDRL 50% minimum and the VA offset.",
    calcInputs: [
      dropdown("disabilityRating", "DoD Disability Rating", RATINGS.filter(([, x]) => x >= 30), 60),
      numberField("yearsOfService", "Years of Service", { default: 12, max: 40, step: 0.5, unit: "years" }),
      dropdown("listType", "Retirement List", [["Permanent (PDRL)", 0], ["Temporary (TDRL)", 1]], 0),
      dropdown("grade", "Pay Grade", GRADES, g("E-6")),
      HIGH3_FIELD,
    ],
    calcResult: { label: "Monthly Retired Pay", format: "currency" },
    calcResults: [
      { key: "monthlyRetiredPay", label: "Monthly Disability Retired Pay", format: "currency", highlight: true },
      { key: "retiredPayPercent", label: "Retired Pay Percentage", format: "percentage" },
      { key: "usedRatingMethod", label: "Rating Method Used? (1 = rating, 0 = years)", format: "number" },
      { key: "vaCompensationAlone", label: "VA Compensation at the Same Rating (vet alone)", format: "currency" },
      { key: "totalMonthlyAfterVaOffset", label: "Estimated Total After the VA Offset", format: "currency" },
    ],
    instructions: "Enter the disability rating from your Physical Evaluation Board (30% or more for medical retirement), your years of service and the list you're placed on. Leave the high-3 at 0 to estimate it from your grade.",
    examples: `Example: an E-6 with 12 years rated 60% gets ${exMed.retiredPayPercent}% of high-3 — about ${usd(exMed.monthlyRetiredPay)} a month. VA pays ${usd(exMed.vaCompensationAlone)} at 60%; with under 20 years the two offset, so the total is about ${usd(exMed.totalMonthlyAfterVaOffset)}.`,
    assumptions: `Retired pay = high-3 × the greater of the rating % or 2.5% × years, capped at 75%; TDRL pays at least 50%. Under 20 years (or under 50% VA), retired pay is reduced dollar for dollar by VA compensation, so you receive about the larger of the two — the VA part tax-free. With 20+ years and 50%+, CRDP restores both. Combat-related disabilities may qualify for CRSC instead. ${DISCLAIMER}`,
    faq: [
      { question: "What's the difference between PDRL and TDRL?", answer: "TDRL is temporary (re-examined, up to 3 years) with at least 50% pay; PDRL is permanent." },
      { question: "Can I get military disability retired pay and VA compensation?", answer: "With fewer than 20 years, generally not both in full — VA pay offsets retired pay, unless CRSC applies." },
    ],
  },
  {
    slug: "survivor-benefit-plan-calculator",
    title: "Survivor Benefit Plan (SBP) Calculator",
    description: "Estimate the military Survivor Benefit Plan — the 55% monthly annuity your spouse would receive, the 6.5% premium taken from your retired pay, and how long the annuity takes to repay the premiums.",
    metaTitle: "SBP Calculator — Military Survivor Benefit Plan Cost",
    metaDescription: "Free SBP calculator. 6.5% premium and 55% spouse annuity on your chosen base amount, with total premiums and break-even years.",
    calcInputs: [
      currencyField("monthlyRetiredPay", "Monthly Retired Pay", { default: 3000, max: 25000, step: 10 }),
      currencyField("baseAmount", "SBP Base Amount (≥ $300; full = retired pay)", { default: 3000, max: 25000, step: 10 }),
      numberField("yearsPaying", "Years You Expect to Pay Premiums (max 30)", { default: 25, max: 40, unit: "years" }),
    ],
    calcResult: { label: "Monthly Survivor Annuity", format: "currency" },
    calcResults: [
      { key: "monthlySurvivorAnnuity", label: "Monthly Survivor Annuity", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "netRetiredPayAfterPremium", label: "Retired Pay After Premium", format: "currency" },
      { key: "totalPremiumsPaid", label: "Total Premiums Paid", format: "currency" },
      { key: "yearsOfAnnuityToBreakEven", label: "Years of Annuity to Recover Premiums", format: "number" },
    ],
    instructions: "Enter your retired pay and the base amount you'll elect — full coverage uses your whole retired pay; a reduced base amount (at least $300) lowers both the premium and the annuity.",
    examples: `Example: full SBP on ${usd(3000)} retired pay costs ${usd(exSbp.monthlyPremium)} a month and pays a surviving spouse ${usd(exSbp.monthlySurvivorAnnuity)} a month (rising with COLAs). After 25 years of premiums the annuity repays them in about ${exSbp.yearsOfAnnuityToBreakEven} years.`,
    assumptions: `Spouse coverage: premium 6.5% of the base amount, annuity 55% of it; premiums stop after 30 years and you reach 70 (paid-up SBP). Premiums are pre-tax. Child-only, former-spouse and RCSBP options (A, B, C for Reserve retirees) cost different amounts. ${DISCLAIMER}`,
    faq: [
      { question: "How much does SBP cost?", answer: "For spouse coverage, 6.5% of the base amount you choose, taken from your retired pay before tax." },
      { question: "What is RCSBP?", answer: "The Reserve Component version — you choose whether coverage starts immediately (Option C), at 60 (Option B) or not before retirement (Option A); B and C cost extra." },
    ],
  },
  {
    slug: "military-retirement-divorce-calculator",
    title: "Military Retirement Divorce Calculator",
    description: "Estimate a former spouse's share of military retired pay under the frozen benefit rule — the retired pay frozen at the divorce date, the marital fraction, and whether DFAS can pay it directly (10/10 rule).",
    metaTitle: "Military Retirement Divorce Calculator — Frozen Benefit Rule",
    metaDescription: "Free military pension divorce calculator. Frozen benefit rule, marital fraction and former-spouse share of military retired pay, plus the 10/10 rule.",
    calcInputs: [
      currencyField("high3AtDivorce", "High-3 at the Date of Divorce", { default: 5200, max: 25000, step: 10 }),
      numberField("yearsOfServiceAtDivorce", "Years of Service at Divorce", { default: 12, max: 40, step: 0.5, unit: "years" }),
      numberField("yearsMarriedDuringService", "Years of Marriage Overlapping Service", { default: 10, max: 40, step: 0.5, unit: "years" }),
      percentField("spousePercentOfMarital", "Former Spouse's Share of the Marital Part", { default: 50, step: 5 }),
      dropdown("system", "Retirement System", RESERVE_SYSTEMS, 0),
      numberField("yearsDivorceToRetirement", "Years from Divorce to Retirement", { default: 8, max: 30, unit: "years" }),
      percentField("colaPercent", "Average Yearly COLA", { default: 2.8, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Former Spouse's Monthly Share", format: "currency" },
    calcResults: [
      { key: "formerSpouseMonthlyShare", label: "Former Spouse's Monthly Share", format: "currency", highlight: true },
      { key: "frozenRetiredPay", label: "Frozen Retired Pay (with COLAs)", format: "currency" },
      { key: "maritalFractionPercent", label: "Marital Fraction", format: "percentage" },
      { key: "formerSpouseAnnualShare", label: "Former Spouse's Annual Share", format: "currency" },
      { key: "dfasDirectPayment", label: "Meets 10/10 Rule for DFAS Payment? (1 = yes)", format: "number" },
    ],
    instructions: "Enter the high-3 and years of service on the date of divorce, the years the marriage overlapped military service, and the share of the marital portion the court awards (often 50%). The frozen amount grows only by retiree COLAs between divorce and retirement.",
    examples: `Example: a ${usd(5200)} high-3 and 12 years at divorce, 10 years married during service, retiring 8 years later: frozen retired pay ≈ ${usd(exDiv.frozenRetiredPay)}; 50% of the ${exDiv.maritalFractionPercent}% marital part gives the former spouse about ${usd(exDiv.formerSpouseMonthlyShare)} a month.`,
    assumptions: `Frozen benefit rule (10 U.S.C. 1408, divorces after 23 Dec 2016): disposable retired pay is computed with the high-3 and years of service at the divorce date, increased by COLAs to retirement. The Uniformed Services Former Spouses' Protection Act caps payments through DFAS at 50% of disposable retired pay; direct DFAS payment needs 10 years of marriage overlapping 10 years of service. State law and the court order decide the actual award. ${DISCLAIMER}`,
    faq: [
      { question: "What is the 10/10 rule?", answer: "If the marriage overlapped at least 10 years of creditable service, DFAS can pay the former spouse's share directly. It isn't a requirement to receive a share." },
      { question: "Does the former spouse share in promotions after divorce?", answer: "Not under the frozen benefit rule — the share is based on the grade and years at the divorce date, plus COLAs." },
    ],
  },
  {
    slug: "military-retirement-cola-calculator",
    title: "Military Retirement COLA Calculator",
    description: "See how the cost-of-living adjustment changes your military retired pay — the 2.8% COLA for 2026 (CPI − 1% under REDUX) and a projection for future years.",
    metaTitle: "Military Retiree COLA Calculator — 2026 Increase 2.8%",
    metaDescription: "Free military retiree COLA calculator. Apply the 2026 2.8% COLA (REDUX CPI − 1%) to your retired pay and project future increases.",
    calcInputs: [
      currencyField("monthlyRetiredPay", "Current Monthly Retired Pay", { default: 3000, max: 25000, step: 10 }),
      dropdown("system", "COLA Type", [["Full CPI (High-3, BRS, Final Pay)", 0], ["REDUX (CPI − 1%)", 1]], 0),
      percentField("colaPercent", "This Year's COLA", { default: 2.8, max: 15, step: 0.1 }),
      percentField("futureColaPercent", "Expected Future COLA per Year", { default: 2.5, max: 10, step: 0.1 }),
      numberField("years", "Years to Project", { default: 10, min: 1, max: 40, unit: "years" }),
    ],
    calcResult: { label: "New Monthly Retired Pay", format: "currency" },
    calcResults: [
      { key: "newMonthlyRetiredPay", label: "New Monthly Retired Pay", format: "currency", highlight: true },
      { key: "monthlyIncrease", label: "Monthly Increase", format: "currency" },
      { key: "appliedColaPercent", label: "COLA Applied", format: "percentage" },
      { key: "projectedMonthlyPay", label: "Projected Monthly Pay at End of Period", format: "currency" },
      { key: "projectedAnnualPay", label: "Projected Annual Pay at End of Period", format: "currency" },
    ],
    instructions: "Enter your current monthly retired pay before the increase and pick full CPI or REDUX. The 2026 COLA of 2.8% is filled in; change the future rate to test other assumptions.",
    examples: `Example: ${usd(3000)} a month rises to ${usd(exCola.newMonthlyRetiredPay)} with the 2.8% COLA, and to about ${usd(exCola.projectedMonthlyPay)} after 10 years of 2.5% increases.`,
    assumptions: `Retiree COLA follows the CPI-W change used for Social Security (2.8% for 2026). REDUX retirees get CPI − 1% (the one-time catch-up at 62 isn't modelled). Members in their first year of retirement may get a partial COLA. ${DISCLAIMER}`,
    faq: [
      { question: "When does the military COLA take effect?", answer: "It's effective 1 December and first shows up in the payment received in early January." },
      { question: "Do VA disability payments get the same COLA?", answer: "Yes — VA compensation also rose 2.8% from 1 December 2025." },
    ],
  },
  {
    slug: "crsc-crdp-calculator",
    title: "CRSC vs CRDP Calculator",
    description: "Compare Combat-Related Special Compensation (CRSC) and Concurrent Retirement and Disability Pay (CRDP) — how much of your retired pay each restores alongside VA compensation, and which is better.",
    metaTitle: "CRSC vs CRDP Calculator — Concurrent Receipt Comparison",
    metaDescription: "Free CRSC/CRDP calculator. See your VA offset, the CRDP and CRSC amounts and your total monthly pay with the better option, using 2026 VA rates.",
    calcInputs: [
      currencyField("monthlyRetiredPay", "Monthly Military Retired Pay (before VA offset)", { default: 3000, max: 25000, step: 10 }),
      dropdown("vaRating", "VA Combined Rating", RATINGS, 70),
      dropdown("combatRelatedRating", "Combat-Related Part of the Rating", RATINGS, 40),
      numberField("yearsOfService", "Years of Service", { default: 22, max: 40, unit: "years" }),
    ],
    calcResult: { label: "Total Monthly with the Better Option", format: "currency" },
    calcResults: [
      { key: "totalMonthlyWithBestOption", label: "Total Monthly Pay with the Better Option", format: "currency", highlight: true },
      { key: "crdpAmount", label: "CRDP Amount", format: "currency" },
      { key: "crscAmount", label: "CRSC Amount (tax-free)", format: "currency" },
      { key: "vaCompensation", label: "VA Compensation (vet alone)", format: "currency" },
      { key: "retiredPayOffset", label: "Retired Pay Waived for VA", format: "currency" },
      { key: "crscIsBetter", label: "CRSC Better? (1 = yes)", format: "number" },
    ],
    instructions: "Enter your gross retired pay, your VA combined rating and how much of it the service's CRSC board found combat-related. CRDP needs a 50%+ rating and 20 years (or a Reserve retirement); CRSC needs a combat-related disability rated 10% or more.",
    examples: `Example: ${usd(3000)} retired pay and a 70% VA rating (${usd(exCc.vaCompensation)}): CRDP restores ${usd(exCc.crdpAmount)}, CRSC (40% combat-related) would restore ${usd(exCc.crscAmount)}. With CRDP you'd get about ${usd(exCc.totalMonthlyWithBestOption)} a month in total.`,
    assumptions: `VA rates for a veteran alone from 1 Dec 2025 (dependents raise VA pay and the offset). CRDP = the waived retired pay, for 50%+ ratings with 20 years; CRSC = the VA rate for the combat-related rating, up to the waived retired pay, and is tax-free. You can't receive both — DFAS pays the better one, and you can switch at the annual open season. Chapter 61 retirees with under 20 years have reduced CRSC. ${DISCLAIMER}`,
    faq: [
      { question: "Can I get both CRSC and CRDP?", answer: "No. If you qualify for both, DFAS pays whichever is higher, and you can change your choice each January open season." },
      { question: "Is CRSC taxable?", answer: "No, CRSC is tax-free; CRDP is taxable because it is restored retired pay." },
    ],
  },
  {
    slug: "military-buyback-calculator",
    title: "Military Buyback Calculator (FERS Military Deposit)",
    description: "Estimate the cost of buying back military service for a federal civilian pension — the 3% FERS (7% CSRS) deposit on your military basic pay, interest, and the extra annuity it earns.",
    metaTitle: "Military Buyback Calculator — FERS Military Deposit",
    metaDescription: "Free military buyback calculator. 3% FERS deposit on military basic pay, 2026 interest rate 4.25%, added annuity and break-even years.",
    calcInputs: [
      currencyField("militaryBasicPayEarned", "Total Military Basic Pay Earned", { default: 150000, max: 2000000, step: 100 }),
      dropdown("system", "Civilian Retirement System", [["FERS (3%)", 0], ["CSRS (7%)", 1]], 0),
      numberField("militaryYears", "Years of Military Service to Credit", { default: 4, max: 30, step: 0.5, unit: "years" }),
      numberField("yearsSinceInterestStarted", "Years Since Interest Began (2 years after hire)", { default: 3, max: 40, step: 0.5, unit: "years" }),
      percentField("interestRatePercent", "Interest Rate", { default: 4.25, max: 10, step: 0.125 }),
      currencyField("expectedHigh3Salary", "Expected Civilian High-3 Salary", { default: 90000, max: 500000, step: 500 }),
      numberField("ageAtRetirement", "Age at Civilian Retirement", { default: 62, min: 50, max: 80, unit: "years" }),
    ],
    calcResult: { label: "Total Deposit Due", format: "currency" },
    calcResults: [
      { key: "totalDepositDue", label: "Total Deposit Due", format: "currency", highlight: true },
      { key: "depositBeforeInterest", label: "Deposit Before Interest", format: "currency" },
      { key: "interest", label: "Interest", format: "currency" },
      { key: "addedAnnualAnnuity", label: "Extra Annual Annuity", format: "currency" },
      { key: "yearsToBreakEven", label: "Years of Retirement to Break Even", format: "number" },
    ],
    instructions: "Get your total military basic pay from your service's finance center (it's on the earnings estimate you request through your HR office). Enter the years you want to credit and, if you started your civilian job more than 2 years ago, how long interest has been building.",
    examples: `Example: ${usd(150000)} of military basic pay costs ${usd(exBuy.depositBeforeInterest)} to buy back under FERS, or about ${usd(exBuy.totalDepositDue)} with 3 years of interest. At 62 with a ${usd(90000)} high-3, 4 years add ${usd(exBuy.addedAnnualAnnuity)} a year — paid back in about ${exBuy.yearsToBreakEven} years.`,
    assumptions: `Deposit = 3% (FERS) or 7% (CSRS) of military basic pay for post-1956 service; interest starts 2 years after your civilian hire and compounds yearly (OPM uses a variable rate — 4.25% for 2026). FERS annuity: 1% of high-3 per year (1.1% if you retire at 62+ with 20 years); CSRS approximated at 2%. If you receive military retired pay you generally must waive it to credit the service. ${DISCLAIMER}`,
    faq: [
      { question: "Is the military buyback worth it?", answer: "Usually yes — the extra annuity typically repays the deposit within a few years of retirement, and it can let you retire sooner." },
      { question: "When does interest start?", answer: "Two years after you start your civilian federal job; pay before then to avoid interest." },
    ],
  },
  {
    slug: "special-military-social-security-credit-calculator",
    title: "Special Military Social Security Rate Calculator",
    description: "Estimate the special extra Social Security earnings credits for active duty from 1957 to 2001 — $300 per quarter through 1977 and up to $1,200 a year from 1978 to 2001.",
    metaTitle: "Special Military Social Security Rate (Wage Credit) Calculator",
    metaDescription: "Free calculator for the special extra Social Security wage credits for military service 1957–2001 — $300 a quarter, then $100 per $300 of pay.",
    calcInputs: [
      numberField("quartersServed1957to1977", "Calendar Quarters of Active Duty 1957–1977", { default: 8, max: 84, unit: "quarters" }),
      numberField("yearsServed1978to2001", "Years of Active Duty 1978–2001", { default: 4, max: 24, unit: "years" }),
      currencyField("averageAnnualBasicPay1978to2001", "Average Yearly Basic Pay 1978–2001", { default: 18000, max: 200000, step: 100 }),
    ],
    calcResult: { label: "Total Extra Wage Credits", format: "currency" },
    calcResults: [
      { key: "totalExtraWageCredits", label: "Total Extra Wage Credits", format: "currency", highlight: true },
      { key: "credits1957to1977", label: "Credits for 1957–1977", format: "currency" },
      { key: "credits1978to2001", label: "Credits for 1978–2001", format: "currency" },
      { key: "creditPerYear1978to2001", label: "Credit per Year 1978–2001", format: "currency" },
    ],
    instructions: "Count the calendar quarters in which you received active duty basic pay from 1957 to 1977, and the years you served from 1978 to 2001 with your average yearly basic pay in that period.",
    examples: `Example: 8 quarters in 1957–1977 and 4 years in 1978–2001 at ${usd(18000)} a year earn ${usd(exSs.totalExtraWageCredits)} of extra credited earnings (${usd(exSs.creditPerYear1978to2001)} a year for the later period).`,
    assumptions: `Social Security adds these "special extra earnings" when it computes your benefit: $300 per quarter of active duty basic pay 1957–1977; $100 for each $300 of basic pay up to $1,200 a year 1978–2001. No credits are added for service from 2002 on. The effect on your monthly benefit depends on your whole earnings record. ${DISCLAIMER}`,
    faq: [
      { question: "Do I need to apply for the extra credits?", answer: "No — Social Security adds them automatically when you apply for benefits, but bring your DD-214 to make sure the service is on record." },
      { question: "Do I get credits for service after 2001?", answer: "No. The special extra earnings ended on 1 January 2002." },
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
