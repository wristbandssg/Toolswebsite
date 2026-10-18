// One-time (but safe to re-run) batch setup script: creates 9 VA benefit, GI Bill and veteran
// property tax calculators (Law & Government Calculators > Military & Veterans Calculators).
// Rates and tables live in src/lib/calc-engine-law-mil-va.ts; the examples below are computed
// from that engine so they always match the calculator.
// Merged keywords (covered here, no separate page): Family Caregiver Pay Rate in PA → caregiver
// stipend (locality input); Special Monthly Compensation → va-smc; VR&E Calculator → vre;
// "veterans property tax exemption ny" (New York VA Disability Rating) → ny exemption;
// "disabled veteran property tax exemption texas" (Texas VA Disability Rating) → texas
// exemption. Service Connected / Disability Calculator Military / VA Disability Pay are covered
// by the existing va-disability-calculator.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-mil-va-calculators.ts
// or
//   npm run db:create-law-mil-va-calculators

import * as E from "../src/lib/calc-engine-law-mil-va";

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
const DISCLAIMER = "Estimates only — the VA (or your county assessor for property tax) makes the official decision. Not affiliated with the Department of Veterans Affairs.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const RATINGS: [string, number][] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((x) => [`${x}%`, x]);
const YESNO: [string, number][] = [["Yes", 1], ["No", 0]];
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

const exBack = r(E.vaBackPay, { rating: 70, priorRating: 30, monthsOwed: 14, dependentAddOn: 0 });
const exCare = r(E.vaCaregiverStipend, { level: 2, localityPercent: 17.06 });
const exCare1 = r(E.vaCaregiverStipend, { level: 1, localityPercent: 17.06 });
const HEAR = { right1000: 30, right2000: 50, right3000: 65, right4000: 70, rightSpeech: 76, left1000: 25, left2000: 45, left3000: 60, left4000: 65, leftSpeech: 84, serviceConnectedEars: 0 };
const exHear = r(E.vaHearingLoss, HEAR);
const exSmc = r(E.vaSmc, { smcLevel: 2, rating: 100, kAwards: 1 });
const exVre = r(E.vreMonthly, { trainingTime: 1, dependents: 2, e5BahWithDependents: 2100 });
const exGi = r(E.giBill, { benefitPercent: 100, tuitionAndFees: 12000, schoolType: 0, yellowRibbonSchool: 0, creditsPerTerm: 12, fullTimeCredits: 12, onlineOnly: 0, e5BahWithDependents: 2100, monthsInSchool: 9, termsPerYear: 2 });
const exMgib = r(E.mgib, { enrollment: 1, monthlyKicker: 0, buyUp: 1, monthsRemaining: 36 });
const exNy = r(E.nyVeteransExemption, { assessedValue: 300000, wartime: 1, combatZone: 1, disabilityRating: 50, capMultiplier: 1, equalizationRatePercent: 100, taxRatePer1000: 25 });
const exTx = r(E.texasDvExemption, { appraisedValue: 320000, disabilityRating: 60, homestead: 1, unemployable: 0, age65OrBlind: 0, taxRatePercent: 2.1 });

const earFields = (side: "right" | "left", label: string, d: number[]) => [
  numberField(`${side}1000`, `${label} — 1000 Hz (dB)`, { default: d[0], max: 120, step: 5, unit: "dB" }),
  numberField(`${side}2000`, `${label} — 2000 Hz (dB)`, { default: d[1], max: 120, step: 5, unit: "dB" }),
  numberField(`${side}3000`, `${label} — 3000 Hz (dB)`, { default: d[2], max: 120, step: 5, unit: "dB" }),
  numberField(`${side}4000`, `${label} — 4000 Hz (dB)`, { default: d[3], max: 120, step: 5, unit: "dB" }),
  percentField(`${side}Speech`, `${label} — Speech Recognition (Maryland CNC)`, { default: d[4], step: 2 }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "va-back-pay-calculator",
    title: "VA Back Pay Calculator",
    description: "Estimate VA disability back pay — the difference between your new and old monthly rate for every month since your effective date, using the 2026 VA compensation rates.",
    metaTitle: "VA Back Pay Calculator 2026 — Retro Disability Pay",
    metaDescription: "Free VA back pay calculator. Enter your new and previous rating and months since the effective date to estimate your retroactive VA payment.",
    calcInputs: [
      dropdown("rating", "New Combined Rating", RATINGS, 70),
      dropdown("priorRating", "Previous Rating (0 if new claim)", RATINGS, 30),
      numberField("monthsOwed", "Months Since the Effective Date", { default: 14, max: 240, unit: "months" }),
      currencyField("dependentAddOn", "Extra Monthly for Dependents (30%+ only)", { default: 0, max: 1500, step: 1 }),
    ],
    calcResult: { label: "Estimated Back Pay", format: "currency" },
    calcResults: [
      { key: "estimatedBackPay", label: "Estimated Back Pay", format: "currency", highlight: true },
      { key: "newMonthlyPayment", label: "New Monthly Payment", format: "currency" },
      { key: "previousMonthlyPayment", label: "Previous Monthly Payment", format: "currency" },
      { key: "monthlyIncrease", label: "Monthly Increase", format: "currency" },
      { key: "annualIncrease", label: "Yearly Increase", format: "currency" },
    ],
    instructions: "Enter your new combined rating, the rating you were paid before (0 for a first claim), and the number of months between your effective date (usually the date VA received your claim or intent to file) and the first month of your new payments. Payments start on the first day of the month after the effective date.",
    examples: `Example: going from 30% to 70% with an effective date 14 months ago raises pay from ${usd(exBack.previousMonthlyPayment)} to ${usd(exBack.newMonthlyPayment)} — about ${usd(exBack.estimatedBackPay)} in back pay.`,
    assumptions: `Uses the veteran-alone rates in effect from 1 December 2025 for every month; earlier months were paid at slightly lower rates before each COLA, so the real figure can be a little less. Add the dependent amount for spouse/children if rated 30% or more. Back pay is tax-free. ${DISCLAIMER}`,
    faq: [
      { question: "How is VA back pay calculated?", answer: "VA pays the monthly difference between the rate you were owed and what you received, for each month from the effective date of the award." },
      { question: "How long does VA back pay take?", answer: "Usually it arrives within a few weeks of the decision letter, as a separate deposit." },
    ],
  },
  {
    slug: "va-caregiver-stipend-calculator",
    title: "VA Caregiver Stipend Calculator",
    description: "Estimate the monthly VA caregiver stipend under the Program of Comprehensive Assistance for Family Caregivers (PCAFC) — 62.5% or 100% of the GS-4 step 1 pay for your locality.",
    metaTitle: "VA Caregiver Stipend Calculator 2026 — PCAFC Level 1 & 2",
    metaDescription: "Free VA caregiver stipend calculator. 2026 GS-4 step 1 with your locality pay × 62.5% (Level 1) or 100% (Level 2) — monthly and yearly amounts.",
    calcInputs: [
      dropdown("level", "Stipend Level", [["Level 1 (62.5%)", 1], ["Level 2 — unable to self-sustain in the community (100%)", 2]], 2),
      percentField("localityPercent", "Locality Pay % for the Veteran's Address (Rest of US 17.06%)", { default: 17.06, max: 60, step: 0.01 }),
    ],
    calcResult: { label: "Monthly Stipend", format: "currency" },
    calcResults: [
      { key: "monthlyStipend", label: "Monthly Stipend", format: "currency", highlight: true },
      { key: "annualStipend", label: "Annual Stipend", format: "currency" },
      { key: "gs4Step1LocalityAnnual", label: "GS-4 Step 1 with Locality (annual)", format: "currency" },
      { key: "levelPercent", label: "Level Percentage", format: "percentage" },
    ],
    instructions: "Pick the stipend level VA assigned and the GS locality pay percentage for the area where the veteran lives (find it on OPM's 2026 locality pay table — for example Washington DC 33.94%, San Francisco 46.34%; everywhere not listed is Rest of US, 17.06%).",
    examples: `Example: in a "Rest of US" area the 2026 stipend is ${usd(exCare1.monthlyStipend)} a month at Level 1 and ${usd(exCare.monthlyStipend)} at Level 2 (${usd(exCare.annualStipend)} a year).`,
    assumptions: `Stipend = GS-4 step 1 annual pay (2026 base ${usd(E.GS4_STEP1_2026)}) × (1 + locality %) ÷ 12 × 62.5% or 100%. Legacy participants keep their previous level until reassessed. The stipend is not taxable. ${DISCLAIMER}`,
    faq: [
      { question: "Is the VA caregiver stipend taxable?", answer: "No, PCAFC stipends are not taxable income." },
      { question: "Does the stipend depend on where the caregiver lives?", answer: "It depends on the veteran's address — the locality pay area where the veteran lives sets the GS-4 rate." },
    ],
  },
  {
    slug: "va-hearing-loss-rating-calculator",
    title: "VA Hearing Loss Rating Calculator",
    description: "Estimate your VA hearing loss rating from an audiogram — puretone averages and speech recognition for each ear, the Table VI/VIa numerals, and the Table VII percentage under 38 CFR 4.85.",
    metaTitle: "VA Hearing Loss Rating Calculator — 38 CFR 4.85 Tables",
    metaDescription: "Free VA hearing loss calculator. Enter audiogram thresholds and Maryland CNC scores for each ear to estimate your VA hearing rating (0–100%).",
    calcInputs: [
      ...earFields("right", "Right Ear", [30, 50, 65, 70, 76]),
      ...earFields("left", "Left Ear", [25, 45, 60, 65, 84]),
      dropdown("serviceConnectedEars", "Service-Connected Ears", [["Both ears", 0], ["Right ear only", 1], ["Left ear only", 2]], 0),
    ],
    calcResult: { label: "Hearing Loss Rating", unit: "%", format: "number" },
    calcResults: [
      { key: "hearingLossRating", label: "Hearing Loss Rating (%)", format: "number", highlight: true },
      { key: "rightEarNumeral", label: "Right Ear Numeral (1–11 = I–XI)", format: "number" },
      { key: "leftEarNumeral", label: "Left Ear Numeral (1–11 = I–XI)", format: "number" },
      { key: "rightPureToneAverage", label: "Right Puretone Average (dB)", format: "number" },
      { key: "leftPureToneAverage", label: "Left Puretone Average (dB)", format: "number" },
      { key: "monthlyPayIfOnlyRating", label: "Monthly Pay if This Were Your Only Rating", format: "currency" },
    ],
    instructions: "From your VA (C&P) audiology exam, enter each ear's thresholds at 1000, 2000, 3000 and 4000 Hz and the Maryland CNC speech recognition score. If only one ear is service-connected, the other ear is treated as normal (numeral I).",
    examples: `Example: right ear 30/50/65/70 dB with 76% speech and left ear 25/45/60/65 dB with 84% give numerals ${ROMAN[exHear.rightEarNumeral]} and ${ROMAN[exHear.leftEarNumeral]} — a ${exHear.hearingLossRating}% rating. Most hearing loss is rated 0–10%; tinnitus is rated separately (10%).`,
    assumptions: `Puretone average = mean of 1000–4000 Hz. Table VI (speech + average) gives each ear a numeral, Table VIa (average only) is used for the exceptional patterns of 38 CFR 4.86 (all four frequencies 55 dB+, or ≤30 dB at 1000 Hz with 70 dB+ at 2000 Hz, which also raises the numeral one step). Table VII combines the better and poorer ear. ${DISCLAIMER}`,
    faq: [
      { question: "Why is my hearing loss rated 0%?", answer: "VA's tables need fairly significant loss in both ears for a compensable rating; a 0% rating still counts as service connection and qualifies you for VA hearing aids." },
      { question: "Is tinnitus included?", answer: "No — tinnitus is a separate 10% rating (the maximum for tinnitus)." },
    ],
  },
  {
    slug: "va-smc-calculator",
    title: "VA SMC Calculator — Special Monthly Compensation",
    description: "Estimate VA Special Monthly Compensation for 2026 — SMC-K added to your rating, or the SMC-S, L, M, N and O/P rates, with the caps that apply.",
    metaTitle: "VA SMC Calculator 2026 — Special Monthly Compensation Rates",
    metaDescription: "Free VA SMC calculator with 2026 rates: SMC-K $139.87, SMC-S $4,408.53, SMC-L $4,900.83 and more. See your monthly payment (veteran alone).",
    calcInputs: [
      dropdown("smcLevel", "SMC Level", [["SMC-K only (with your rating)", 0], ["SMC-S (housebound)", 1], ["SMC-L", 2], ["SMC-M", 3], ["SMC-M½", 4], ["SMC-N", 5], ["SMC-N½", 6], ["SMC-O / P", 7]], 2),
      dropdown("rating", "Combined Schedular Rating", RATINGS, 100),
      numberField("kAwards", "Number of SMC-K Awards (0–3)", { default: 1, max: 3 }),
    ],
    calcResult: { label: "Monthly SMC Payment", format: "currency" },
    calcResults: [
      { key: "monthlySmcPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "baseRate", label: "Base Rate (rating or SMC level)", format: "currency" },
      { key: "smcKAmount", label: "SMC-K Amount", format: "currency" },
      { key: "annualPayment", label: "Annual Payment", format: "currency" },
      { key: "increaseOverBasic", label: "Increase Over Your Basic Rating", format: "currency" },
    ],
    instructions: "Pick the SMC level on your decision letter (or 'SMC-K only' if K is added to your regular rating), your combined rating, and how many SMC-K awards you have (for loss or loss of use of a creative organ, a hand, foot, eye, etc.).",
    examples: `Example: SMC-L with one SMC-K award pays ${usd(exSmc.monthlySmcPayment)} a month in 2026 — ${usd(exSmc.increaseOverBasic)} more than the 100% rate for a veteran alone.`,
    assumptions: `Veteran-alone 2026 rates (from 1 Dec 2025). Up to 3 SMC-K awards; with a regular rating or SMC-S the total can't exceed the L rate, and with L–N½ it can't exceed the O rate; SMC-K isn't added to O, R or T. Dependents add more at 30%+ and with SMC; SMC-R1/R2 (aid and attendance) and SMC-T are not covered. ${DISCLAIMER}`,
    faq: [
      { question: "What is SMC-K?", answer: "An extra $139.87 a month (2026) for each qualifying loss or loss of use, such as of a creative organ, a hand or a foot — added on top of your regular rate." },
      { question: "What does SMC-S pay?", answer: "SMC-S (housebound) pays $4,408.53 a month for a veteran alone in 2026." },
    ],
  },
  {
    slug: "vre-monthly-payment-calculator",
    title: "VR&E Monthly Payment Calculator (Chapter 31)",
    description: "Estimate your VR&E (Veteran Readiness and Employment, Chapter 31) monthly payment — the FY2026 subsistence allowance by training time and dependents, or the Post-9/11 rate if it's higher.",
    metaTitle: "VR&E Monthly Payment Calculator — Chapter 31 Subsistence",
    metaDescription: "Free VR&E calculator. FY2026 Chapter 31 subsistence rates by training time and dependents vs the Post-9/11 GI Bill housing rate.",
    calcInputs: [
      dropdown("trainingTime", "Training Time", [["Full time", 1], ["Three-quarter time", 2], ["Half time", 3], ["Quarter time", 4]], 1),
      numberField("dependents", "Number of Dependents", { default: 2, max: 15 }),
      currencyField("e5BahWithDependents", "E-5 With-Dependents BAH at Your School ZIP (0 if no Post-9/11 entitlement)", { default: 2100, max: 8000, step: 10 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "chapter31Rate", label: "Chapter 31 Subsistence Rate", format: "currency" },
      { key: "post911RateElection", label: "Post-9/11 Rate Election", format: "currency" },
      { key: "usePost911Rate", label: "Post-9/11 Rate Is Higher? (1 = yes)", format: "number" },
      { key: "annualPayment", label: "Annual Payment", format: "currency" },
    ],
    instructions: "Choose how much you're in training, your number of dependents, and — if you have any Post-9/11 GI Bill entitlement left — the E-5 with-dependents BAH for your school's ZIP code. VR&E lets you take the Post-9/11 rate without using up GI Bill entitlement.",
    examples: `Example: full time with 2 dependents, the Chapter 31 rate is ${usd(exVre.chapter31Rate)}; with ${usd(2100)} BAH at the school the Post-9/11 rate would be ${usd(exVre.post911RateElection)}, so you'd elect that.`,
    assumptions: `FY2026 Chapter 31 subsistence (from 1 Oct 2025) for institutional training. Post-9/11 rate = E-5 with-dependents BAH, 80% at three-quarter time, not paid at half time or less (online-only training pays half the national average). Apprenticeship and OJT rates differ. VR&E also pays tuition, fees, books and supplies. ${DISCLAIMER}`,
    faq: [
      { question: "Can I get the GI Bill housing rate through VR&E?", answer: "Yes — if you have Post-9/11 entitlement left, you can elect the P911 subsistence rate without using it up." },
      { question: "Is VR&E subsistence taxable?", answer: "No, it's a non-taxable VA benefit." },
    ],
  },
  {
    slug: "gi-bill-calculator",
    title: "GI Bill Calculator (Post-9/11)",
    description: "Estimate your Post-9/11 GI Bill benefits for the 2026–27 school year — tuition and fees paid, monthly housing allowance, books stipend and Yellow Ribbon, at your benefit level.",
    metaTitle: "GI Bill Calculator 2026–27 — Tuition, Housing & Books",
    metaDescription: "Free Post-9/11 GI Bill calculator. 2026–27 private cap $30,908.34, housing allowance at your school's E-5 BAH, books up to $1,000 and Yellow Ribbon.",
    calcInputs: [
      dropdown("benefitPercent", "Benefit Level", [100, 90, 80, 70, 60, 50].map((x) => [`${x}%`, x] as [string, number]), 100),
      currencyField("tuitionAndFees", "Yearly Tuition & Fees", { default: 12000, max: 100000, step: 100 }),
      dropdown("schoolType", "School Type", [["Public (in-state)", 0], ["Private or foreign", 1]], 0),
      currencyField("yellowRibbonSchool", "School's Yellow Ribbon Contribution (private, 100% only)", { default: 0, max: 50000, step: 100 }),
      numberField("creditsPerTerm", "Credits per Term", { default: 12, max: 30 }),
      numberField("fullTimeCredits", "Full-Time Credits at Your School", { default: 12, min: 1, max: 20 }),
      dropdown("onlineOnly", "All Classes Online?", [["No", 0], ["Yes", 1]], 0),
      currencyField("e5BahWithDependents", "E-5 With-Dependents BAH at the School's ZIP", { default: 2100, max: 8000, step: 10 }),
      numberField("monthsInSchool", "Months in School per Year", { default: 9, max: 12, unit: "months" }),
      numberField("termsPerYear", "Terms per Year", { default: 2, min: 1, max: 4 }),
    ],
    calcResult: { label: "Total Yearly Benefit", format: "currency" },
    calcResults: [
      { key: "totalYearlyBenefit", label: "Total Yearly Benefit", format: "currency", highlight: true },
      { key: "tuitionPaid", label: "Tuition & Fees Paid (incl. Yellow Ribbon)", format: "currency" },
      { key: "monthlyHousingAllowance", label: "Monthly Housing Allowance", format: "currency" },
      { key: "booksStipend", label: "Books & Supplies Stipend", format: "currency" },
      { key: "tuitionYouPay", label: "Tuition Left for You", format: "currency" },
    ],
    instructions: "Enter your benefit percentage from your Certificate of Eligibility, your school's tuition and fees, and your course load. Look up the E-5 with-dependents BAH for your school's campus ZIP code (not where you live) on the DoD BAH lookup.",
    examples: `Example: 100% eligibility at a public school charging ${usd(12000)}, full time with ${usd(2100)} BAH: ${usd(exGi.tuitionPaid)} tuition paid, ${usd(exGi.monthlyHousingAllowance)} a month housing for 9 months and ${usd(exGi.booksStipend)} for books — ${usd(exGi.totalYearlyBenefit)} in total.`,
    assumptions: `2026–27 rates (from 1 August 2026): full in-state public tuition; private/foreign up to ${usd(E.GI_PRIVATE_CAP_2026_27)} a year; Yellow Ribbon matches the school's contribution (100% eligibility only). Housing is paid only above half time, rounded to the nearest tenth of your rate of pursuit; online-only students get ${usd(E.GI_ONLINE_MHA_2026_27)} a month. Books: $41.67 per credit up to $1,000 a year. All amounts × your benefit level. Active-duty members and their spouses don't get the housing allowance. ${DISCLAIMER}`,
    faq: [
      { question: "How much does the GI Bill pay for housing?", answer: "The E-5 with-dependents BAH for your school's ZIP code, if you're more than half time and take at least one class in person." },
      { question: "What is the 2026–27 private school cap?", answer: "$30,908.34 a year; Yellow Ribbon schools can cover more." },
    ],
  },
  {
    slug: "mgib-calculator",
    title: "Montgomery GI Bill (MGIB) Calculator",
    description: "Estimate your Montgomery GI Bill – Active Duty (Chapter 30) monthly payment and remaining benefit — full, three-quarter or half time, plus kickers and the $600 buy-up.",
    metaTitle: "MGIB Calculator — Montgomery GI Bill Active Duty Rates",
    metaDescription: "Free MGIB-AD calculator. Current full-time rate $2,518 a month (3+ years of service), part-time rates, kickers and buy-up, and your total remaining benefit.",
    calcInputs: [
      dropdown("enrollment", "Enrollment", [["Full time", 1], ["Three-quarter time", 2], ["Half time", 3]], 1),
      currencyField("monthlyKicker", "College Fund / Kicker per Month", { default: 0, max: 2000, step: 10 }),
      dropdown("buyUp", "Paid the $600 Buy-Up?", YESNO, 1),
      numberField("monthsRemaining", "Months of Entitlement Left (max 36)", { default: 36, max: 36, unit: "months" }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalRemainingBenefit", label: "Total Remaining Benefit", format: "currency" },
      { key: "baseRate", label: "Base MGIB Rate", format: "currency" },
      { key: "perAcademicYear", label: "Per 9-Month Academic Year", format: "currency" },
    ],
    instructions: "Pick your enrollment level and add any kicker (Army/Navy College Fund) and the $600 buy-up if you paid it. Enter how many months of entitlement you have left.",
    examples: `Example: full time with the buy-up pays ${usd(exMgib.monthlyPayment)} a month — ${usd(exMgib.totalRemainingBenefit)} over 36 months.`,
    assumptions: `MGIB-AD rates from 1 October 2025 for members who served 3+ years: $2,518 full time, $1,888.50 three-quarter, $1,259 half time (lower rates apply for less than 3 years of service). The $600 buy-up adds up to $150 a month. Payments are monthly and not tied to school costs; you can't use MGIB and Post-9/11 for the same months. ${DISCLAIMER}`,
    faq: [
      { question: "Is the Montgomery GI Bill or Post-9/11 better?", answer: "Post-9/11 usually pays more at expensive schools or high-BAH areas; MGIB can be better for cheap online or community-college programs because it pays a flat monthly amount." },
      { question: "Does MGIB pay tuition directly?", answer: "No — MGIB pays you a monthly amount and you pay the school yourself." },
    ],
  },
  {
    slug: "ny-veterans-property-tax-exemption-calculator",
    title: "New York Veterans Property Tax Exemption Calculator",
    description: "Estimate New York's alternative veterans property tax exemption — 15% for wartime service, 10% more for a combat zone, plus your VA disability rating, up to the local caps — and your tax savings.",
    metaTitle: "NY Veterans Property Tax Exemption Calculator (§458-a)",
    metaDescription: "Free New York veterans exemption calculator. Wartime 15%, combat 10% and disability-rating exemptions with caps, and your estimated property tax savings.",
    calcInputs: [
      currencyField("assessedValue", "Assessed Value", { default: 300000, max: 5000000, step: 1000 }),
      dropdown("wartime", "Served During a Period of War?", YESNO, 1),
      dropdown("combatZone", "Served in a Combat Zone?", YESNO, 1),
      dropdown("disabilityRating", "VA Service-Connected Disability Rating", RATINGS, 50),
      dropdown("capMultiplier", "Local Cap Level", [["Basic caps ($12k / $8k / $40k)", 1], ["Higher caps (×1.5)", 1.5], ["Highest caps (×2.25)", 2.25]], 1),
      percentField("equalizationRatePercent", "Equalization Rate", { default: 100, max: 100, step: 0.01 }),
      numberField("taxRatePer1000", "Tax Rate per $1,000 of Assessed Value", { default: 25, max: 300, step: 0.01 }),
    ],
    calcResult: { label: "Total Exemption", format: "currency" },
    calcResults: [
      { key: "totalExemption", label: "Total Exemption (assessed value)", format: "currency", highlight: true },
      { key: "wartimeExemption", label: "Wartime Exemption (15%)", format: "currency" },
      { key: "combatExemption", label: "Combat Zone Exemption (10%)", format: "currency" },
      { key: "disabilityExemption", label: "Disability Exemption", format: "currency" },
      { key: "estimatedTaxSavings", label: "Estimated Yearly Tax Savings", format: "currency" },
    ],
    instructions: "Enter your home's assessed value from your assessment notice, your service details and your VA rating. Check with your assessor which cap level your county, city, town and school district adopted (many school districts don't offer the exemption at all), and the equalization rate for your municipality.",
    examples: `Example: a ${usd(300000)} assessed home, wartime and combat service with a 50% rating at basic caps: ${usd(exNy.totalExemption)} exempt — about ${usd(exNy.estimatedTaxSavings)} a year at $25 per $1,000.`,
    assumptions: `RPTL §458-a: 15% of assessed value (cap $12,000), +10% for combat zone service (cap $8,000), + rating % of assessed value (cap $40,000), with caps scaled by the equalization rate and the local option level. Applies to the primary residence of a wartime veteran (or unremarried surviving spouse). The Cold War exemption (§458-b) is separate. ${DISCLAIMER}`,
    faq: [
      { question: "Does the NY veterans exemption apply to school taxes?", answer: "Only if your school district opted in — many don't, so the savings may only apply to county, city and town taxes." },
      { question: "Do I have to reapply every year?", answer: "No, once granted it continues, but you must file form RP-458-a with your assessor initially." },
    ],
  },
  {
    slug: "texas-disabled-veteran-property-tax-exemption-calculator",
    title: "Texas Disabled Veteran Property Tax Exemption Calculator",
    description: "Estimate the Texas disabled veteran property tax exemption — $5,000 to $12,000 off your home's value by VA rating, or a 100% homestead exemption for 100% or unemployable veterans — and your savings.",
    metaTitle: "Texas Disabled Veteran Property Tax Exemption Calculator",
    metaDescription: "Free Texas DV exemption calculator. §11.22 exemptions by VA rating and the §11.131 total homestead exemption, with estimated property tax savings.",
    calcInputs: [
      currencyField("appraisedValue", "Appraised Value", { default: 320000, max: 5000000, step: 1000 }),
      dropdown("disabilityRating", "VA Disability Rating", RATINGS, 60),
      dropdown("homestead", "Is It Your Homestead?", YESNO, 1),
      dropdown("unemployable", "Rated Individually Unemployable (TDIU)?", [["No", 0], ["Yes", 1]], 0),
      dropdown("age65OrBlind", "Age 65+ or Blind in One or Both Eyes?", [["No", 0], ["Yes", 1]], 0),
      percentField("taxRatePercent", "Combined Property Tax Rate", { default: 2.1, max: 5, step: 0.01 }),
    ],
    calcResult: { label: "Exempt Value", format: "currency" },
    calcResults: [
      { key: "exemptValue", label: "Exempt Value", format: "currency", highlight: true },
      { key: "taxableValue", label: "Taxable Value Left", format: "currency" },
      { key: "estimatedTaxSavings", label: "Estimated Yearly Tax Savings", format: "currency" },
      { key: "fullHomesteadExemption", label: "100% Homestead Exemption? (1 = yes)", format: "number" },
    ],
    instructions: "Enter your appraised value from the appraisal district, your VA rating, and whether the property is your homestead. Use your total tax rate (all taxing units combined) as a percentage.",
    examples: `Example: a ${usd(320000)} homestead with a 60% rating gets ${usd(exTx.exemptValue)} exempt — about ${usd(exTx.estimatedTaxSavings)} a year at a 2.1% tax rate. At 100% (or TDIU) the whole homestead would be exempt.`,
    assumptions: `Texas Tax Code §11.22: 10–29% $5,000; 30–49% $7,500; 50–69% $10,000; 70–100% $12,000 (also $12,000 at 65+ or blind with a 10%+ rating) — can be used on any one property. §11.131: 100% disabled or individually unemployable veterans get their whole homestead exempt. The general homestead exemption ($140,000 school) is separate and isn't included. ${DISCLAIMER}`,
    faq: [
      { question: "Do 100% disabled veterans pay property tax in Texas?", answer: "Not on their homestead — §11.131 exempts the entire value for 100% or individually unemployable veterans." },
      { question: "Can a surviving spouse keep the exemption?", answer: "Yes, an unremarried surviving spouse can keep the 100% homestead exemption." },
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
