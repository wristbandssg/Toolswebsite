// One-time (but safe to re-run) batch setup script: creates 34 immigration and visa calculators
// (Law & Government Calculators > Immigration & Visa Calculators). Points grids, residence rules
// and the USCIS fee schedule live in src/lib/calc-engine-law-immig.ts; examples are computed from
// the engine so they always match.
// Merged keywords (covered here, no separate page): Express Entry, CEC, CIC Points, Canadian
// Immigration (Points) Calculator, Canadian Points, Canadian Permanent Residency Points, Canada
// Score, Immigration Points Calculator, Points Based Calculator, British Columbia CRS → canada-crs;
// 67 Points Calculator → federal-skilled-worker-points; IELTS CLB, CELPIP CLB, CLB Score → clb;
// 189 Points, Skillselect, EOI Points → australia-pr-points; NZ Points → new-zealand-skilled-
// migrant-points; Japan Permanent Residency (Points) → japan-permanent-residency-points; Permanent
// Residence / Residency, Residence, Resident Calculator → canada-pr-residency-obligation; Residency,
// Resident Alien, Presence Test, 183-Day Rule → substantial-presence-test; Physical Presence
// Calculator USA → naturalization-physical-presence; Green Card (to citizenship), N-400 Early
// Filing → citizenship-eligibility; EAD Extension → ead-automatic-extension; Visa Calculator →
// schengen-90-180; I-485 Fee, N-400 Fee, I-130 Fee → uscis-fee; H1 Wage, California H-1B
// Prevailing Wage → h-1b-prevailing-wage; H1 Tax → h-1b-tax.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-immig-calculators.ts
// or
//   npm run db:create-law-immig-calculators

import * as E from "../src/lib/calc-engine-law-immig";

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

function dateField(key: string, label: string, def: number | string = "today") {
  return { key, label, type: "date", required: true, default: def };
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


const CAT = "immigration-visa-calculators";
const NOT_ADVICE = "This is an estimate, not legal advice — immigration rules and fees change often, so confirm with the official government source or an immigration lawyer before you file.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const eur = (n: number) => usd(n).replace("$", "€");
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const dn = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000);
const fd = (d: number) => new Date(d * 86400000).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const yn = (key: string, label: string, def = 0) => dropdown(key, label, YESNO, def);
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

interface Spec {
  slug: string;
  title: string;
  desc: string;
  meta?: string;
  inputs: Record<string, unknown>[];
  results: Line[];
  fn: E.CustomCalculator;
  ex: Record<string, number>;
  exText: (o: Record<string, number>) => string;
  how: string;
  assume: string;
  faq: [string, string][];
  currency?: string;
}
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt] = s.results[0];
  const cur = s.currency ? { currency: s.currency } : {};
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free & Up to Date`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainFmt === "c" ? cur : {}) },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(f === "c" ? cur : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOT_ADVICE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const CLB_OPTS: [string, number][] = [["Below CLB 4 / none", 0], ["CLB 4", 4], ["CLB 5", 5], ["CLB 6", 6], ["CLB 7", 7], ["CLB 8", 8], ["CLB 9", 9], ["CLB 10+", 10]];
const clb = (key: string, label: string, def: number) => dropdown(key, label, CLB_OPTS, def);
const CRS_EDU: [string, number][] = [["Less than secondary school", 0], ["Secondary diploma (high school)", 1], ["One-year post-secondary program", 2], ["Two-year post-secondary program", 3], ["Bachelor's degree or 3+ year program", 4], ["Two or more credentials (one 3+ years)", 5], ["Master's or professional degree", 6], ["Doctoral (PhD)", 7]];
const ABIL = ["Listening", "Reading", "Writing", "Speaking"];
const four = (prefix: string, label: string, def: number) => ABIL.map((a) => clb(`${prefix}${a}`, `${label} — ${a}`, def));
const crsEx = { age: 29, spouseAccompanying: 0, education: 4, firstListening: 9, firstReading: 9, firstWriting: 9, firstSpeaking: 9, secondListening: 0, secondReading: 0, secondWriting: 0, secondSpeaking: 0, canadianWorkYears: 1, foreignWorkYears: 3, certificateOfQualification: 0, provincialNomination: 0, canadianStudy: 0, siblingInCanada: 0, frenchListening: 0, frenchReading: 0, frenchWriting: 0, frenchSpeaking: 0, firstLanguageIsFrench: 0, spouseEducation: 0, spouseListening: 0, spouseReading: 0, spouseWriting: 0, spouseSpeaking: 0, spouseCanadianWorkYears: 0 };

const TRIP_INPUTS = (n: number, a: string, b: string, defs: [string, string][] = []) => [
  numberField("tripCount", `Number of Trips to Count (up to ${n})`, { default: defs.length, max: n }),
  ...Array.from({ length: n }, (_, i) => [dateField(`entry${i + 1}`, `Trip ${i + 1} — ${a}`, defs[i]?.[0] ?? 0), dateField(`exit${i + 1}`, `Trip ${i + 1} — ${b}`, defs[i]?.[1] ?? 0)]).flat(),
];
const TRIP_EX = (pairs: [string, string][], n: number) => ({ tripCount: pairs.length, ...Object.fromEntries(Array.from({ length: n }, (_, i) => [[`entry${i + 1}`, pairs[i] ? dn(pairs[i][0]) : 0], [`exit${i + 1}`, pairs[i] ? dn(pairs[i][1]) : 0]]).flat()) });

const exUscis = r(E.uscisFee, { form1: 3, form2: 6, form3: 7, form4: -1, fileOnline: 0, applicants: 1, premium: 0 });

const TOOLS: ToolDef[] = [
  mk({
    slug: "canada-crs-calculator", title: "Canada CRS Calculator (Express Entry)",
    desc: "Calculate your Comprehensive Ranking System (CRS) score for Express Entry — core human capital, spouse, skill transferability and additional points, with the 2025 job-offer change.",
    meta: "CRS Calculator 2026 — Canada Express Entry Score",
    inputs: [
      numberField("age", "Your Age", { default: 29, min: 17, max: 60 }), yn("spouseAccompanying", "Spouse or Partner Coming With You?"), dropdown("education", "Your Highest Education", CRS_EDU, 4),
      ...four("first", "First Official Language (CLB)", 9), ...four("second", "Second Official Language (CLB)", 0),
      numberField("canadianWorkYears", "Canadian Skilled Work Experience (years)", { default: 1, max: 10 }), numberField("foreignWorkYears", "Foreign Skilled Work Experience (years)", { default: 3, max: 20 }), yn("certificateOfQualification", "Canadian Certificate of Qualification (trade)?"),
      yn("provincialNomination", "Provincial Nomination (PNP)?"), dropdown("canadianStudy", "Post-Secondary Education in Canada", [["None", 0], ["1–2 year credential", 1], ["3+ year credential", 2]], 0), yn("siblingInCanada", "Sibling in Canada (citizen or PR)?"),
      ...four("french", "French (NCLC) — for additional points", 0), yn("firstLanguageIsFrench", "Is French Your First Official Language Above?"),
      dropdown("spouseEducation", "Spouse's Education", CRS_EDU, 0), ...four("spouse", "Spouse's First Language (CLB)", 0), numberField("spouseCanadianWorkYears", "Spouse's Canadian Work Experience (years)", { default: 0, max: 10 }),
    ],
    results: [["totalCrsScore", "Total CRS Score", "n"], ["coreHumanCapital", "Core / Human Capital", "n"], ["spouseFactors", "Spouse Factors", "n"], ["skillTransferability", "Skill Transferability", "n"], ["additionalPoints", "Additional Points", "n"], ["agePoints", "Age Points", "n"], ["educationPoints", "Education Points", "n"], ["firstLanguagePoints", "First Language Points", "n"], ["canadianExperiencePoints", "Canadian Work Experience Points", "n"]],
    fn: E.crs, ex: crsEx,
    exText: (o) => `Example: a single 29-year-old with a bachelor's degree, CLB 9 in all four English abilities, 1 year of Canadian and 3 years of foreign experience scores ${o.totalCrsScore} (core ${o.coreHumanCapital} + transferability ${o.skillTransferability}).`,
    how: "Enter your age, education, official language test results converted to CLB levels (use the CLB calculator if you have IELTS, CELPIP or PTE scores), skilled work experience and any additional factors. If your spouse is coming with you, add their details.",
    assume: "IRCC CRS grid (maximum 1,200): core human capital up to 500 (460 with a spouse), spouse factors up to 40, skill transferability up to 100, additional points up to 600. Arranged-employment points (50/200) were removed for profiles from March 25, 2025. Canadian education counts only if earned in Canada; French bonus needs NCLC 7 in all four abilities. Recent draw cut-offs vary by category.",
    faq: [["What is a good CRS score?", "General Canadian Experience Class draws in 2025–2026 have mostly needed about 515–550; category-based draws (French, healthcare, trades) go lower."], ["How can I increase my CRS score?", "Improve language scores (CLB 9+ unlocks large transferability points), learn French, gain Canadian experience, or get a provincial nomination (+600)."]],
  }),
  mk({
    slug: "federal-skilled-worker-points-calculator", title: "Federal Skilled Worker Points Calculator (67 Points)",
    desc: "Check whether you pass the 67-point Federal Skilled Worker selection grid — language, education, experience, age, arranged employment and adaptability.",
    meta: "FSW 67 Points Calculator — Canada Federal Skilled Worker",
    inputs: [...ABIL.map((a) => clb(a.toLowerCase(), `First Official Language — ${a}`, 8)), yn("secondLanguageClb5", "Second Official Language CLB 5+ in All Abilities?"), dropdown("education", "Education", [["None", 0], ["Secondary diploma", 1], ["One-year post-secondary", 2], ["Two-year post-secondary", 3], ["Bachelor's or 3+ year program", 4], ["Two or more credentials (one 3+ years)", 5], ["Master's or professional degree", 6], ["Doctoral (PhD)", 7]], 4), numberField("workYears", "Skilled Work Experience (years, last 10)", { default: 3, max: 20 }), numberField("age", "Age", { default: 30, min: 16, max: 60 }), yn("arrangedEmployment", "Valid Arranged Employment in Canada?"),
      yn("spouseLanguageClb4", "Adaptability: Spouse CLB 4+ in All Abilities?"), yn("pastStudyInCanada", "Adaptability: You Studied 2+ Years in Canada?"), yn("spousePastStudy", "Adaptability: Spouse Studied in Canada?"), yn("pastWorkInCanada", "Adaptability: You Worked 1+ Year in Canada?"), yn("spousePastWork", "Adaptability: Spouse Worked 1+ Year in Canada?"), yn("relativeInCanada", "Adaptability: Relative in Canada?")],
    results: [["totalPoints", "Total Points (of 100)", "n"], ["passes67", "Passes 67 Points? (1 = yes)", "n"], ["languagePoints", "Language", "n"], ["educationPoints", "Education", "n"], ["experiencePoints", "Experience", "n"], ["agePoints", "Age", "n"], ["arrangedEmploymentPoints", "Arranged Employment", "n"], ["adaptabilityPoints", "Adaptability", "n"]],
    fn: E.fsw67, ex: { listening: 8, reading: 8, writing: 8, speaking: 8, secondLanguageClb5: 0, education: 4, workYears: 3, age: 30, arrangedEmployment: 0, spouseLanguageClb4: 0, pastStudyInCanada: 0, spousePastStudy: 0, pastWorkInCanada: 0, spousePastWork: 0, relativeInCanada: 1 },
    exText: (o) => `Example: CLB 8 in all abilities, a bachelor's degree, 3 years of experience, age 30 and a relative in Canada gives ${o.totalPoints} points — ${o.passes67 ? "a pass" : "below the 67-point pass mark"}.`,
    how: "Score your first official language by CLB level, then your education, years of continuous full-time skilled experience, age and adaptability factors.",
    assume: "FSW selection factors: language up to 28 (CLB 7 = 4, 8 = 5, 9+ = 6 per ability, second language 4), education up to 25, experience up to 15, age up to 12 (18–35 = 12, minus 1 per year to 46), arranged employment 10, adaptability up to 10. You need 67 of 100, CLB 7 in all abilities and 1 year of continuous skilled experience. Passing makes you eligible for Express Entry — invitations still depend on CRS.",
    faq: [["What is the 67-point rule?", "Federal Skilled Worker applicants must score at least 67 of 100 on six selection factors to be eligible for the program."], ["Is the 67-point score the same as CRS?", "No — 67 points decides eligibility; the CRS score (out of 1,200) ranks you in the Express Entry pool."]],
  }),
  mk({
    slug: "clb-calculator", title: "CLB Calculator (IELTS, CELPIP, PTE to CLB)",
    desc: "Convert IELTS General Training, CELPIP-General or PTE Core scores to Canadian Language Benchmark (CLB) levels for Express Entry, PNP and citizenship.",
    meta: "CLB Calculator — IELTS / CELPIP / PTE Score to CLB",
    inputs: [dropdown("testType", "Test", [["IELTS General Training", 0], ["CELPIP-General", 1], ["PTE Core", 2]], 0), numberField("listening", "Listening Score", { default: 8, max: 90, step: 0.5 }), numberField("reading", "Reading Score", { default: 7, max: 90, step: 0.5 }), numberField("writing", "Writing Score", { default: 7, max: 90, step: 0.5 }), numberField("speaking", "Speaking Score", { default: 7, max: 90, step: 0.5 })],
    results: [["overallClb", "Overall CLB (lowest ability)", "n"], ["listeningClb", "Listening CLB", "n"], ["readingClb", "Reading CLB", "n"], ["writingClb", "Writing CLB", "n"], ["speakingClb", "Speaking CLB", "n"], ["meetsClb7", "Meets CLB 7? (1 = yes)", "n"], ["meetsClb9", "Meets CLB 9? (1 = yes)", "n"]],
    fn: E.clbCalc, ex: { testType: 0, listening: 8, reading: 7, writing: 7, speaking: 7 },
    exText: (o) => `Example: IELTS General 8 listening, 7 reading, 7 writing and 7 speaking is CLB ${o.overallClb} in every ability — enough for the CLB 9 transferability points.`,
    how: "Choose the test and enter your band or score for each ability. CELPIP levels map one-to-one to CLB.",
    assume: "IRCC equivalency tables. IELTS General — CLB 10: L 8.5, R 8, W 7.5, S 7.5; CLB 9: 8 / 7 / 7 / 7; CLB 8: 7.5 / 6.5 / 6.5 / 6.5; CLB 7: 6 / 6 / 6 / 6; CLB 6: 5.5 / 5 / 5.5 / 5.5; CLB 5: 5 / 4 / 5 / 5; CLB 4: 4.5 / 3.5 / 4 / 4. PTE Core thresholds from IRCC's PTE table. Your CLB for most programs is the lowest of the four abilities. IELTS Academic isn't accepted for Express Entry.",
    faq: [["What IELTS score is CLB 7?", "6.0 in each of listening, reading, writing and speaking (General Training)."], ["What IELTS score is CLB 9?", "Listening 8, reading 7, writing 7 and speaking 7."]],
  }),
  mk({
    slug: "sinp-points-calculator", title: "SINP Points Calculator (Saskatchewan)",
    desc: "Score yourself on the Saskatchewan Immigrant Nominee Program International Skilled Worker grid — 60 of 110 points needed.",
    meta: "SINP Points Calculator — Saskatchewan PNP Score",
    inputs: [dropdown("education", "Education", [["None / secondary", 0], ["One-year post-secondary certificate", 1], ["Two-year diploma / certificate", 2], ["Trade certification (journeyperson)", 3], ["Bachelor's or 3+ year degree", 4], ["Master's or Doctorate", 5]], 4), numberField("experienceLast5Years", "Skilled Work Experience in the Last 5 Years", { default: 4, max: 5 }), numberField("experience6To10YearsAgo", "Skilled Work Experience 6–10 Years Ago", { default: 0, max: 5 }), clb("firstLanguageClb", "First Official Language (lowest CLB)", 7), clb("secondLanguageClb", "Second Official Language (lowest CLB)", 0), numberField("age", "Age", { default: 30, min: 16, max: 60 }), yn("jobOffer", "High-Skilled Job Offer from a Saskatchewan Employer?"), yn("closeRelative", "Close Relative in Saskatchewan?"), yn("pastWorkInSask", "Past Work in Saskatchewan (1+ year)?"), yn("pastStudyInSask", "Past Study in Saskatchewan (1+ year)?")],
    results: [["totalPoints", "Total SINP Points (of 110)", "n"], ["meetsMinimum60", "Meets 60-Point Minimum? (1 = yes)", "n"], ["educationPoints", "Education", "n"], ["experiencePoints", "Work Experience", "n"], ["languagePoints", "Language", "n"], ["agePoints", "Age", "n"], ["connectionPoints", "Connections to Saskatchewan", "n"]],
    fn: E.sinp, ex: { education: 4, experienceLast5Years: 4, experience6To10YearsAgo: 0, firstLanguageClb: 7, secondLanguageClb: 0, age: 30, jobOffer: 0, closeRelative: 0, pastWorkInSask: 0, pastStudyInSask: 0 },
    exText: (o) => `Example: a bachelor's degree, 4 recent years of experience, CLB 7 and age 30 scores ${o.totalPoints} points — ${o.meetsMinimum60 ? "at or above" : "below"} the 60-point minimum.`,
    how: "Enter your education, skilled work experience, language level, age and connections to Saskatchewan.",
    assume: "SINP International Skilled Worker grid: education up to 23, experience up to 15 (10 for the last 5 years + 5 for years 6–10), language up to 30 (first language CLB 4 = 12 … CLB 8+ = 20; second language up to 10), age up to 12, connections up to 30 (high-skilled job offer 30 for the Employment Offer stream; close relative 20; past work or study 5 each). Occupation In-Demand and Express Entry draws rank candidates by score.",
    faq: [["How many points do I need for SINP?", "At least 60 of 110 to submit an Expression of Interest; draws usually invite higher scores."], ["Do I need a job offer for SINP?", "No — the Occupation In-Demand and Saskatchewan Express Entry streams don't require one."]],
  }),
  mk({
    slug: "canada-pr-residency-obligation-calculator", title: "Canada PR Residency Obligation Calculator",
    desc: "Check if you meet Canada's permanent resident residency obligation — 730 days in Canada in the last 5 years — and how many more days you can spend abroad.",
    meta: "Canada PR Residency Calculator — 730 Days in 5 Years",
    inputs: [dateField("prDate", "Date You Became a Permanent Resident", "today-1200"), dateField("checkDate", "Date to Check (today or return date)"), numberField("daysOutsideCanada", "Days Outside Canada in the Period", { default: 300, max: 2000 }), numberField("daysAbroadWithCitizenSpouse", "Days Abroad Accompanying a Canadian Citizen Spouse (count as in Canada)", { default: 0, max: 2000 })],
    results: [["daysCounted", "Days Counted Toward 730", "n"], ["meetsObligation", "Meets the Obligation? (1 = yes)", "n"], ["daysStillNeeded", "Days Still Needed", "n"], ["canStillMeetIt", "Can Still Meet It? (1 = yes)", "n"], ["daysYouCanStillBeAway", "Days You Can Still Spend Abroad", "n"]],
    fn: E.canadaPrResidency, ex: { prDate: dn("2023-06-01"), checkDate: dn("2026-10-18"), daysOutsideCanada: 300, daysAbroadWithCitizenSpouse: 0 },
    exText: (o) => `Example: a PR since June 1, 2023 who spent 300 days abroad has ${o.daysCounted} days in Canada by October 18, 2026 — ${o.meetsObligation ? "already meeting" : "not yet meeting"} the 730-day obligation, with ${o.daysYouCanStillBeAway} days of travel room left in the 5-year window.`,
    how: "Enter when you became a PR, the date to check (for example the day you'll re-enter Canada), and the days you were outside Canada since then (or in the last 5 years if you've been a PR longer).",
    assume: "IRPA s.28: 730 days physically present in Canada in any rolling 5-year period (counted from landing if you've been a PR for less than 5 years). Days abroad accompanying a Canadian-citizen spouse or common-law partner, or working full-time for a Canadian business or government abroad, count as days in Canada.",
    faq: [["How many days do I need in Canada to keep PR?", "730 days (2 years) in every 5-year period — they don't need to be continuous."], ["What happens if I don't meet the residency obligation?", "You can lose PR status if an officer finds you in breach, though humanitarian factors can be considered on appeal."]],
  }),
  mk({
    slug: "canada-citizenship-calculator", title: "Canada Citizenship Calculator",
    desc: "Calculate whether you meet the 1,095-day physical presence requirement for Canadian citizenship, including half-day credit for time before PR.",
    meta: "Canada Citizenship Calculator — 1,095 Days Presence",
    inputs: [numberField("daysAsPermanentResident", "Days in Canada as a PR (last 5 years)", { default: 900, max: 1826 }), numberField("daysAsTemporaryResident", "Days in Canada Before PR as a Temporary Resident or Protected Person (last 5 years)", { default: 400, max: 1826 }), dateField("todayDate", "Today's Date")],
    results: [["eligibleDays", "Eligible Days (of 1,095)", "n"], ["eligible", "Eligible to Apply? (1 = yes)", "n"], ["daysShort", "Days Still Needed", "n"], ["earliestApplicationDate", "Earliest Application Date (if you stay)", "d"], ["preprCredit", "Credit for Pre-PR Days (max 365)", "n"]],
    fn: E.canadaCitizenship, ex: { daysAsPermanentResident: 900, daysAsTemporaryResident: 400, todayDate: dn("2026-10-18") },
    exText: (o) => `Example: 900 days as a PR plus 400 days on a work permit before PR (counted as ${o.preprCredit}) gives ${o.eligibleDays} days — ${o.eligible ? "enough to apply" : `${o.daysShort} days short`}.`,
    how: "Count days physically present in Canada in the 5 years before you apply, split between time as a PR and time before PR on a work or study permit or as a protected person.",
    assume: "Citizenship Act s.5(1)(c): 1,095 days in the 5 years before applying; each day before PR counts as half a day, up to 365 days of credit. You must also have filed taxes for 3 of the 5 years, and adults 18–54 need CLB 4 and the knowledge test. Use IRCC's official presence calculator before applying.",
    faq: [["How long do I have to live in Canada to become a citizen?", "1,095 days (3 years) of physical presence in the 5 years before you apply."], ["Does time on a work permit count for citizenship?", "Yes — each day before PR counts as half a day, up to a maximum of 365 days."]],
  }),
  mk({
    slug: "australia-pr-points-calculator", title: "Australia PR Points Calculator",
    desc: "Calculate your Australian skilled migration points for subclass 189, 190 and 491 visas — age, English, work experience, education, partner and nomination points.",
    meta: "Australia PR Points Calculator — 189 / 190 / 491 SkillSelect",
    inputs: [numberField("age", "Age at Invitation", { default: 30, min: 16, max: 50 }), dropdown("englishLevel", "English Level", [["Competent (IELTS 6 each)", 0], ["Proficient (IELTS 7 each)", 1], ["Superior (IELTS 8 each)", 2]], 1), numberField("overseasExperienceYears", "Overseas Skilled Employment (years, last 10)", { default: 5, max: 20 }), numberField("australianExperienceYears", "Australian Skilled Employment (years, last 10)", { default: 0, max: 20 }), dropdown("education", "Highest Qualification", [["None recognised", 0], ["Diploma or trade qualification", 1], ["Award recognised by assessing authority", 2], ["Bachelor's or Master's degree", 3], ["Doctorate", 4]], 3),
      yn("specialistEducation", "Australian STEM Master's by Research or PhD (+10)?"), yn("australianStudy", "Australian Study Requirement (+5)?"), yn("professionalYear", "Professional Year in Australia (+5)?"), yn("communityLanguage", "Credentialled Community Language / NAATI (+5)?"), yn("regionalStudy", "Study in Regional Australia (+5)?"), dropdown("partnerStatus", "Partner", [["Single, or partner is a citizen / PR (+10)", 0], ["Partner has skills assessment + competent English (+10)", 1], ["Partner has competent English only (+5)", 2], ["Partner doesn't qualify (0)", 3]], 0), dropdown("visaSubclass", "Visa", [["Subclass 189 (no nomination)", 0], ["Subclass 190 state nomination (+5)", 1], ["Subclass 491 regional nomination (+15)", 2]], 0)],
    results: [["totalPoints", "Total Points", "n"], ["meetsPassMark65", "Meets 65-Point Pass Mark? (1 = yes)", "n"], ["agePoints", "Age", "n"], ["englishPoints", "English", "n"], ["employmentPoints", "Skilled Employment (max 20)", "n"], ["educationPoints", "Education", "n"], ["otherPoints", "Partner & Other", "n"], ["nominationPoints", "Nomination", "n"]],
    fn: E.australiaPoints, ex: { age: 30, englishLevel: 1, overseasExperienceYears: 5, australianExperienceYears: 0, education: 3, specialistEducation: 0, australianStudy: 0, professionalYear: 0, communityLanguage: 0, regionalStudy: 0, partnerStatus: 0, visaSubclass: 0 },
    exText: (o) => `Example: a single 30-year-old with proficient English, 5 years of overseas experience and a bachelor's degree scores ${o.totalPoints} points for a subclass 189 visa.`,
    how: "Enter your details at the time of invitation. Experience must be in your nominated or closely related occupation after the skill level was met.",
    assume: "Migration Regulations Schedule 6D: age 18–24 = 25, 25–32 = 30, 33–39 = 25, 40–44 = 15; English proficient 10, superior 20; overseas employment 3/5/8 years = 5/10/15 and Australian 1/3/5/8 years = 5/10/15/20, combined maximum 20; doctorate 20, bachelor's 15, diploma/trade 10. Pass mark 65, but 189 invitations in recent rounds often needed 85–95+.",
    faq: [["How many points do I need for Australian PR?", "The pass mark is 65, but invitation rounds for subclass 189 usually require much higher scores depending on the occupation."], ["How do I get 20 points for English?", "Superior English — IELTS 8 in each band, PTE 79 in each, or equivalent."]],
  }),
  mk({
    slug: "new-zealand-skilled-migrant-points-calculator", title: "New Zealand Skilled Migrant Points Calculator",
    desc: "Check the New Zealand Skilled Migrant Category points pathway (from 24 August 2026) — 6 points from qualification, income or registration plus NZ work experience.",
    meta: "NZ Skilled Migrant Points Calculator 2026 — SMC 6 Points",
    inputs: [dropdown("qualification", "Highest Qualification", [["None that earns points", 0], ["Overseas bachelor's (Level 7) — 4", 1], ["NZ bachelor's (Level 7) — 5", 2], ["NZ master's — 5", 3], ["Overseas master's + bachelor's — 5", 4], ["NZ master's + bachelor's — 6", 5], ["Doctorate (Level 10) — 6", 6]], 1), currencyField("hourlyWage", "Hourly Wage (NZ$)", { default: 55, max: 1000, step: 0.5 }), currencyField("medianWage", "NZ Median Wage (NZ$/hour)", { default: 35, max: 100, step: 0.01 }), numberField("registrationPoints", "NZ Occupational Registration Points (0–6)", { default: 0, max: 6 }), numberField("nzSkilledWorkYears", "NZ Skilled Work Experience (years)", { default: 1, max: 10, step: 0.5 }), yn("anzscoLevel4or5", "ANZSCO Skill Level 4 or 5 / Not in ANZSCO?"), numberField("age", "Age", { default: 32, min: 16, max: 70 })],
    results: [["totalPoints", "Total Points", "n"], ["eligible", "Eligible for the Points Pathway? (1 = yes)", "n"], ["meetsSixPoints", "Has 6 Points? (1 = yes)", "n"], ["skillCategoryPoints", "Skills Points (best of qualification / income / registration)", "n"], ["nzWorkExperiencePoints", "NZ Work Experience Points", "n"], ["wageFloor", "Minimum Wage for Your Job (NZ$/h)", "c"], ["pointsShort", "Points Short of 6", "n"]],
    fn: E.nzSmc, ex: { qualification: 1, hourlyWage: 55, medianWage: 35, registrationPoints: 0, nzSkilledWorkYears: 1, anzscoLevel4or5: 0, age: 32 }, currency: "NZD",
    exText: (o) => `Example: an overseas bachelor's (4 points) earning NZ$55 an hour (1.5× the median, 3 points) with 1 year of NZ experience counts the best skills category (${o.skillCategoryPoints}) plus ${o.nzWorkExperiencePoints} for experience — ${o.totalPoints} points, ${o.meetsSixPoints ? "enough" : "not enough"} for the 6-point pathway.`,
    how: "Choose your qualification, enter your hourly pay in an accredited job and your NZ registration and skilled work experience. Points come from one skills category plus NZ experience.",
    assume: "SMC points pathway from 24 August 2026: 6 points needed from one skills category — qualification (4–6), income (1.5× median = 3, 2× = 4, 3× = 6 using the NZ$35.00 median from 9 March 2026) or occupational registration (3–6) — plus up to 3 for NZ skilled work (1 / 1.5 / 2 years = 1 / 2 / 3). Pay must be at least the median (1.5× for ANZSCO 4–5). You must be 55 or under with an accredited employer and meet English, health and character rules. The Skilled Work Experience and Trades & Technician pathways have different rules.",
    faq: [["How many points do I need for New Zealand residence?", "6 points under the Skilled Migrant Category points pathway."], ["What is the NZ median wage for visas?", "NZ$35.00 an hour from 9 March 2026."]],
  }),
  mk({
    slug: "germany-opportunity-card-points-calculator", title: "Germany Opportunity Card Points Calculator (Chancenkarte)",
    desc: "Check if you qualify for Germany's Opportunity Card (Chancenkarte) — you need 6 points from qualification recognition, German, experience, age and other factors.",
    meta: "Chancenkarte Points Calculator — Germany Opportunity Card",
    inputs: [yn("fullRecognition", "Qualification Fully Recognised in Germany (no points needed)?"), yn("meetsBasicRequirements", "Have a 2-Year Vocational or University Degree + German A1 or English B2?", 1), yn("partialRecognition", "Partial Recognition of Your Qualification (+4)?"), dropdown("germanLevel", "German Level", [["None", 0], ["A1 (0 points)", 1], ["A2 (+1)", 2], ["B1 (+2)", 3], ["B2 or higher (+3)", 4]], 1), dropdown("experience", "Work Experience in Your Field", [["Less than 2 years in the last 5", 0], ["2+ years in the last 5 (+2)", 1], ["5+ years in the last 7 (+3)", 2]], 1), numberField("age", "Age", { default: 32, min: 16, max: 70 }), yn("shortageOccupation", "Qualification in a Shortage Occupation (+1)?"), yn("englishC1", "English C1 or Native (+1)?"), yn("priorStayInGermany", "Previous Legal Stay in Germany of 6+ Months (+1)?"), yn("spouseQualifies", "Spouse Also Meets Opportunity Card Requirements (+1)?")],
    results: [["totalPoints", "Total Points", "n"], ["qualifies", "Qualifies? (1 = yes)", "n"], ["pointsShort", "Points Short of 6", "n"], ["recognitionPoints", "Recognition", "n"], ["languagePoints", "Language", "n"], ["experiencePoints", "Experience", "n"], ["agePoints", "Age", "n"]],
    fn: E.opportunityCard, ex: { fullRecognition: 0, meetsBasicRequirements: 1, partialRecognition: 0, germanLevel: 3, experience: 2, age: 32, shortageOccupation: 1, englishC1: 0, priorStayInGermany: 0, spouseQualifies: 0 },
    exText: (o) => `Example: B1 German (2), 5 years of experience (3), age 32 (2) and a shortage occupation (1) gives ${o.totalPoints} points — ${o.qualifies ? "enough" : "not enough"} for the Opportunity Card.`,
    how: "If your qualification is fully recognised you qualify without points. Otherwise check the basic requirements and add the points that apply to you.",
    assume: "§20a AufenthG points: partial recognition 4; German A2 1, B1 2, B2+ 3; experience 2 years in last 5 = 2, 5 years in last 7 = 3; age under 35 = 2, 35–39 = 1; shortage occupation 1; English C1 1; previous 6-month stay 1; qualifying spouse 1. You need 6 points plus proof of funds (blocked account about €1,091 a month in 2026).",
    faq: [["How many points do I need for the Chancenkarte?", "6 points, unless your qualification is fully recognised in Germany."], ["Can I work on the Opportunity Card?", "Yes — up to 20 hours a week and trial jobs of up to two weeks while you look for skilled work."]],
  }),
  mk({
    slug: "japan-permanent-residency-points-calculator", title: "Japan Permanent Residency Points Calculator (HSP)",
    desc: "Score the Japan Highly Skilled Professional points table — 70 points for HSP status and PR after 3 years, 80 points for PR after just 1 year.",
    meta: "Japan PR Points Calculator — Highly Skilled Professional",
    inputs: [numberField("age", "Age", { default: 32, min: 18, max: 70 }), numberField("annualSalaryManYen", "Annual Salary (10,000 yen units, e.g. 700 = ¥7M)", { default: 700, max: 10000 }), dropdown("academic", "Highest Degree", [["None / other", 0], ["Bachelor's (+10)", 1], ["Master's / professional (+20)", 2], ["Doctorate (+30)", 3]], 2), yn("multipleDegrees", "Degrees in Two or More Fields (+5)?"), numberField("experienceYears", "Relevant Work Experience (years)", { default: 7, max: 40 }), dropdown("japaneseLevel", "Japanese Ability", [["None", 0], ["JLPT N2 (+10)", 1], ["JLPT N1 or Japanese-major degree (+15)", 2]], 0), yn("japaneseUniversity", "Graduated from a Japanese University (+10)?"), yn("researchAchievements", "Research Achievements / Patents (+15)?"), yn("topUniversity", "Graduated from a Top-Ranked University (+10)?"), yn("innovativeEmployer", "Employer Receives Innovation Support / Is an SME (+10)?"), yn("nationalLicense", "Japanese National License (+5)?")],
    results: [["totalPoints", "Total HSP Points", "n"], ["qualifiesHsp70", "Qualifies for HSP (70+)? (1 = yes)", "n"], ["prAfterYears", "PR Possible After (years)", "n"], ["salaryPoints", "Salary", "n"], ["academicPoints", "Academic", "n"], ["experiencePoints", "Experience", "n"], ["agePoints", "Age", "n"], ["bonusPoints", "Bonus Points", "n"]],
    fn: E.japanHsp, ex: { age: 32, annualSalaryManYen: 700, academic: 2, multipleDegrees: 0, experienceYears: 7, japaneseLevel: 0, japaneseUniversity: 0, researchAchievements: 0, topUniversity: 0, innovativeEmployer: 0, nationalLicense: 0 },
    exText: (o) => `Example: a 32-year-old with a master's degree, 7 years of experience and a ¥7 million salary scores ${o.totalPoints} points — ${o.totalPoints >= 80 ? "eligible for PR after 1 year" : o.totalPoints >= 70 ? "HSP status, with PR possible after 3 years" : "below the 70-point HSP threshold"}.`,
    how: "This uses the table for advanced specialised / technical activities (engineers, specialists — category (i)(b)). Enter your annual salary in man-yen (¥10,000 units).",
    assume: "Immigration Services Agency points table: salary ¥4M–¥10M = 10–40 points depending on age (¥4M only under 30, ¥5M under 35, ¥6–7M under 40, ¥8M+ any age), minimum ¥3M; doctorate 30, master's 20, bachelor's 10; experience 3/5/7/10 years = 5/10/15/20; age under 30 = 15, 30–34 = 10, 35–39 = 5; bonuses for Japanese ability, Japanese degrees, research, top universities and innovative employers. 70 points = HSP and PR after 3 years; 80 = PR after 1 year. The J-Skip route has separate salary rules.",
    faq: [["How many points do I need for Japan PR?", "70 points for PR after 3 years of HSP residence, or 80 points for PR after 1 year."], ["What salary is needed for Japan HSP?", "At least ¥3 million a year for category (i)(b), but salary points start at ¥4 million (under 30)."]],
  }),
  mk({
    slug: "nitaqat-calculator", title: "Nitaqat Calculator (Saudization %)",
    desc: "Calculate your company's Saudization percentage under Nitaqat — Saudis below the minimum wage count as half and disabled Saudis count as four.",
    inputs: [numberField("saudisFullWage", "Saudi Employees Earning SAR 4,000+", { default: 6, max: 100000 }), numberField("saudisBelowMinimumWage", "Saudi Employees Earning Under SAR 4,000", { default: 2, max: 100000 }), numberField("disabledSaudis", "Saudi Employees With Disabilities", { default: 0, max: 10000 }), numberField("expatEmployees", "Expatriate Employees", { default: 30, max: 1000000 }), percentField("requiredPercent", "Required Saudization for Your Band / Activity", { default: 20, step: 0.5 })],
    results: [["saudizationPercent", "Saudization Rate", "p"], ["countedSaudis", "Saudis Counted (weighted)", "n"], ["totalEmployees", "Total Employees", "n"], ["meetsRequired", "Meets Required Rate? (1 = yes)", "n"], ["additionalSaudisNeeded", "Additional Full-Wage Saudis Needed", "n"]],
    fn: E.nitaqat, ex: { saudisFullWage: 6, saudisBelowMinimumWage: 2, disabledSaudis: 0, expatEmployees: 30, requiredPercent: 20 },
    exText: (o) => `Example: 6 full-wage Saudis, 2 earning under SAR 4,000 and 30 expatriates gives a Saudization rate of ${o.saudizationPercent}% — ${o.meetsRequired ? "meeting" : `below`} a 20% requirement${o.additionalSaudisNeeded ? `; hire ${o.additionalSaudisNeeded} more full-wage Saudi employee(s) to reach it` : ""}.`,
    how: "Count your registered employees in GOSI/Qiwa and enter the required percentage for your activity and size band (shown in your Qiwa Nitaqat dashboard).",
    assume: "Under Nitaqat Mutawar, a Saudi earning at least SAR 4,000 a month counts as one, below that as half; a Saudi with a disability counts as four (capped in practice at 10% of the workforce). Required percentages depend on the economic activity, company size and the band (Platinum, High/Medium/Low Green, Red) and are set by the HRSD equations.",
    faq: [["How is Nitaqat calculated?", "Weighted Saudi employees divided by total employees, compared with the threshold for your activity and size."], ["Does a Saudi earning SAR 3,000 count in Nitaqat?", "Yes, but only as half a Saudi employee."]],
  }),
  mk({
    slug: "netherlands-30-percent-ruling-calculator", title: "Netherlands 30% Ruling Calculator",
    desc: "Calculate your net salary in the Netherlands with and without the 30% ruling (2026 salary norms and box 1 rates), and see the annual tax saving.",
    meta: "30% Ruling Calculator 2026 — Net Salary Netherlands",
    inputs: [currencyField("annualGrossSalary", "Annual Gross Salary (€)", { default: 75000, max: 2000000, step: 500 }), yn("under30WithMasters", "Under 30 With a Master's Degree (lower norm)?"), dropdown("rulingYear", "Year", [["2026 (30%)", 0], ["2027+ (27% for new rulings)", 1]], 0), currencyField("taxCredits", "Estimated Tax Credits (heffingskortingen, €)", { default: 0, max: 20000, step: 50 })],
    results: [["netSalaryWithRuling", "Net Salary With 30% Ruling (€/yr)", "c"], ["netSalaryWithoutRuling", "Net Salary Without the Ruling (€/yr)", "c"], ["annualTaxSaving", "Annual Tax Saving (€)", "c"], ["taxFreeAllowance", "Tax-Free Allowance (€)", "c"], ["taxableSalary", "Taxable Salary (€)", "c"], ["eligible", "Meets the Salary Norm? (1 = yes)", "n"], ["salaryNorm", "Taxable Salary Norm (€)", "c"], ["monthlyNetWithRuling", "Monthly Net With Ruling (€)", "c"]],
    fn: E.thirtyPercentRuling, ex: { annualGrossSalary: 75000, under30WithMasters: 0, rulingYear: 0, taxCredits: 0 }, currency: "EUR",
    exText: (o) => `Example: on ${eur(75000)}, the ruling makes ${eur(o.taxFreeAllowance)} tax-free, cutting tax by ${eur(o.annualTaxSaving)} a year — net ${eur(o.netSalaryWithRuling)} versus ${eur(o.netSalaryWithoutRuling)} (before tax credits).`,
    how: "Enter your gross annual salary including holiday allowance. Add your estimated general tax credit and labour tax credit if you want a closer net figure.",
    assume: "2026: up to 30% of salary can be paid tax-free if the remaining taxable salary is at least €48,013 (€36,497 if under 30 with a master's), on salary up to the €262,000 WNT cap (max allowance €78,600). From 2027 the percentage falls to 27% for new recipients. Box 1 2026 (below AOW age): 35.75% to €38,883, 37.56% to €78,426, 49.50% above. The ruling lasts up to 5 years; you must be recruited from more than 150 km from the Dutch border.",
    faq: [["How much do you save with the 30% ruling?", "Roughly 30% × salary × your marginal tax rate — often €8,000–€15,000 a year for salaries of €60,000–€100,000."], ["What is the 30% ruling salary requirement for 2026?", "Taxable salary of at least €48,013, or €36,497 for under-30s with a master's degree."]],
  }),
  mk({
    slug: "schengen-90-180-calculator", title: "Schengen 90/180 Calculator",
    desc: "Count your days in the Schengen Area over the rolling 180-day window — days used, days left and the latest date you can stay if you enter on a given day.",
    meta: "Schengen 90/180 Day Calculator — Days Left in Europe",
    inputs: [dateField("referenceDate", "Check Date (entry or control date)", "today+30"), ...TRIP_INPUTS(6, "Entry Date", "Exit Date", [["today-120", "today-100"], ["today-40", "today-20"]])],
    results: [["daysRemaining", "Days You Can Still Stay", "n"], ["daysUsedInLast180", "Days Used in the 180-Day Window", "n"], ["latestExitIfEnteringOnDate", "Latest Exit if You Enter on the Check Date", "d"], ["windowStart", "Window Starts", "d"], ["overstay", "Over 90 Days? (1 = yes)", "n"]],
    fn: E.schengen, ex: { referenceDate: dn("2026-11-15"), ...TRIP_EX([["2026-06-10", "2026-07-09"], ["2026-09-01", "2026-09-25"]], 6) },
    exText: (o) => `Example: with trips from June 10 to July 9 and September 1 to 25, 2026, on November 15, 2026 you've used ${o.daysUsedInLast180} days and have ${o.daysRemaining} left — entering that day you could stay until ${fd(o.latestExitIfEnteringOnDate)}.`,
    how: "Enter each past stay in the Schengen Area (entry and exit dates — both count as days in) and the date you plan to enter or be checked.",
    assume: "Schengen Borders Code art. 6: a maximum of 90 days in any 180-day period, counting back from each day of stay (the day of entry and exit both count). Long-stay national visas and residence permits don't count against it; Bulgaria and Romania are counted as Schengen since 2025. The EES automated system now records entries and exits.",
    faq: [["How does the Schengen 90/180 rule work?", "On any day, look back 180 days — you can't have spent more than 90 of them in the Schengen Area."], ["Do the 90 days reset after 180 days?", "Not all at once — it's a rolling window, so days drop off one at a time as they pass 180 days ago."]],
  }),
  mk({
    slug: "substantial-presence-test-calculator", title: "Substantial Presence Test Calculator",
    desc: "Find out if you're a US tax resident under the substantial presence test — 183 weighted days over 3 years with at least 31 days this year.",
    meta: "Substantial Presence Test Calculator — 183-Day Rule",
    inputs: [numberField("daysCurrentYear", "Days in the US This Year", { default: 150, max: 366 }), numberField("exemptDaysCurrentYear", "Exempt Days This Year (F/J/M student, teacher, etc.)", { default: 0, max: 366 }), numberField("daysLastYear", "Days in the US Last Year (non-exempt)", { default: 120, max: 366 }), numberField("daysTwoYearsAgo", "Days in the US Two Years Ago (non-exempt)", { default: 90, max: 366 })],
    results: [["meetsSubstantialPresence", "US Tax Resident? (1 = yes)", "n"], ["weightedDays", "Weighted Days (need 183)", "n"], ["daysNeededThisYear", "More Days Needed This Year", "n"], ["countedCurrentYearDays", "Counted Days This Year", "n"]],
    fn: E.substantialPresence, ex: { daysCurrentYear: 150, exemptDaysCurrentYear: 0, daysLastYear: 120, daysTwoYearsAgo: 90 },
    exText: (o) => `Example: 150 days this year, 120 last year and 90 the year before = 150 + 40 + 15 = ${o.weightedDays} weighted days — ${o.meetsSubstantialPresence ? "you're a US resident for tax purposes" : "not over 183"}.`,
    how: "Count every day you were physically present in the US (any part of a day counts), excluding exempt days: F, J, M or Q students (usually the first 5 calendar years), teachers and trainees on J/Q (2 of 6 years), diplomats, and days in transit.",
    assume: "IRC §7701(b)(3): at least 31 days this year and current-year days + ⅓ of last year's + ⅙ of the year before's ≥ 183. You may still be treated as a nonresident under the closer-connection exception (Form 8840) if under 183 days this year, or under a tax treaty tie-breaker.",
    faq: [["What is the 183-day rule in the US?", "The substantial presence test — 183 weighted days over 3 years (with at least 31 this year) makes you a US tax resident."], ["Do F-1 student days count?", "Generally not for your first 5 calendar years in the US — they're exempt days."]],
  }),
  mk({
    slug: "physical-presence-test-calculator", title: "Physical Presence Test Calculator (FEIE)",
    desc: "Check the IRS physical presence test — 330 full days abroad in 12 months — and calculate your 2026 foreign earned income ($132,900) and housing exclusions.",
    meta: "Physical Presence Test Calculator — FEIE 2026 $132,900",
    inputs: [numberField("fullDaysAbroadIn12Months", "Full Days in Foreign Countries in a 12-Month Period", { default: 340, max: 366 }), numberField("qualifyingDaysInTaxYear", "Qualifying Days Falling in the Tax Year", { default: 365, max: 366 }), currencyField("foreignEarnedIncome", "Foreign Earned Income", { default: 150000, max: 10000000, step: 500 }), currencyField("housingExpenses", "Foreign Housing Expenses (rent, utilities)", { default: 30000, max: 1000000, step: 500 }), currencyField("housingCapOverride", "Housing Cap for Your City (0 = $39,870 default)", { default: 0, max: 500000, step: 100 })],
    results: [["meetsPhysicalPresenceTest", "Meets the 330-Day Test? (1 = yes)", "n"], ["incomeExclusion", "Foreign Earned Income Exclusion", "c"], ["housingExclusion", "Foreign Housing Exclusion", "c"], ["totalExcluded", "Total Excluded", "c"], ["taxableForeignIncome", "Foreign Income Still Taxable", "c"], ["daysShortOf330", "Days Short of 330", "n"]],
    fn: E.feiePhysicalPresence, ex: { fullDaysAbroadIn12Months: 340, qualifyingDaysInTaxYear: 365, foreignEarnedIncome: 150000, housingExpenses: 30000, housingCapOverride: 0 },
    exText: (o) => `Example: 340 full days abroad and ${usd(150000)} of foreign wages → exclude ${usd(o.incomeExclusion)} plus a ${usd(o.housingExclusion)} housing exclusion, leaving ${usd(o.taxableForeignIncome)} taxable (at the higher stacked rates).`,
    how: "Count full 24-hour days outside the US (days in transit over international waters don't count) in any consecutive 12-month period. If that period spans two tax years, enter the qualifying days in this tax year to prorate.",
    assume: "IRC §911 and Rev. Proc. 2025-32: 2026 exclusion $132,900 per qualifying person; housing base amount $21,264 (16%) and default cap $39,870 (30%; higher in listed high-cost cities); both prorated by qualifying days. The exclusion doesn't reduce self-employment tax, and remaining income is taxed at the rates that would apply without the exclusion.",
    faq: [["What is the physical presence test?", "Being physically present in a foreign country for at least 330 full days during any period of 12 consecutive months."], ["What is the foreign earned income exclusion for 2026?", "$132,900 per person."]],
  }),
  mk({
    slug: "naturalization-physical-presence-calculator", title: "Naturalization Physical Presence Calculator",
    desc: "Count your days in the US for naturalization — 913 days (30 months) in 5 years, or 548 days for spouses of citizens — and flag trips that break continuous residence.",
    meta: "Physical Presence Calculator USA — N-400 Days in the US",
    inputs: [dateField("applicationDate", "Planned N-400 Filing Date"), yn("marriedToCitizen", "Filing Under the 3-Year Rule (married to a citizen)?"), ...TRIP_INPUTS(8, "Departure Date", "Return Date", [["today-700", "today-670"], ["today-300", "today-280"]])],
    results: [["daysPresent", "Days Physically Present", "n"], ["daysRequired", "Days Required", "n"], ["meetsPhysicalPresence", "Meets Physical Presence? (1 = yes)", "n"], ["daysOutside", "Days Outside the US", "n"], ["longestTripDays", "Longest Trip (days)", "n"], ["continuousResidenceRisk", "Continuous Residence (0 OK, 1 trip over 6 months, 2 over 1 year)", "n"]],
    fn: E.naturalizationPresence, ex: { applicationDate: dn("2026-10-18"), marriedToCitizen: 0, ...TRIP_EX([["2024-12-15", "2025-01-20"], ["2026-03-01", "2026-04-10"]], 8) },
    exText: (o) => `Example: two trips abroad (37 and 41 days) in the 5 years before October 18, 2026 leave ${o.daysPresent} days in the US — well over the ${o.daysRequired} required.`,
    how: "List every trip outside the US during the statutory period (the 5 or 3 years before you file). Days you leave and return count as days in the US.",
    assume: "INA 316(a)/319(a): physically present at least half the statutory period — 30 months (913 days) of 5 years, or 18 months (548 days) of 3 years. A trip over 6 months presumes a break in continuous residence; 1 year or more breaks it (unless Form N-470 was approved).",
    faq: [["How many days do I need in the US to become a citizen?", "At least 913 days in the 5 years before filing (548 days if married to a US citizen for 3 years)."], ["Do departure and return days count?", "Yes — USCIS counts the days you leave and return as days in the US."]],
  }),
  mk({
    slug: "continuous-residence-calculator", title: "Continuous Residence Calculator",
    desc: "Check whether trips abroad break continuous residence for US naturalization — trips over 6 months create a presumption and 1 year breaks it.",
    inputs: TRIP_INPUTS(8, "Departure Date", "Return Date", [["today-500", "today-300"]]),
    results: [["status", "Continuous Residence (0 OK, 1 presumed broken, 2 broken)", "n"], ["longestTripDays", "Longest Trip (days)", "n"], ["tripsOver6Months", "Trips Over 6 Months", "n"], ["totalDaysAbroad", "Total Days Abroad", "n"]],
    fn: E.continuousResidence, ex: TRIP_EX([["2025-03-01", "2025-09-20"]], 8),
    exText: (o) => `Example: a trip from March 1 to September 20, 2025 lasted ${o.longestTripDays} days — over 6 months, so continuous residence is presumed broken and you'd need evidence you kept your US job, home and taxes.`,
    how: "Enter each trip outside the US during the statutory period.",
    assume: "8 CFR 316.5(c): an absence of more than 6 months but less than 1 year disrupts continuous residence unless you rebut the presumption (kept your job, home, family, taxes); 1 year or more breaks it, unless an N-470 was approved for qualifying work abroad. Green card holders who stay out over 1 year generally need a reentry permit.",
    faq: [["How long can a green card holder stay outside the US?", "Under 6 months is safe for naturalization; 6–12 months creates a presumption of broken residence; over a year usually requires starting the clock again."], ["Does a reentry permit preserve continuous residence?", "No — it protects your green card, but not continuous residence for naturalization."]],
  }),
  mk({
    slug: "citizenship-eligibility-calculator", title: "Citizenship Eligibility Calculator (N-400 Early Filing)",
    desc: "Find the earliest date you can file Form N-400 — 90 days before your 5-year (or 3-year marriage) green card anniversary.",
    meta: "N-400 Early Filing Calculator — Citizenship Eligibility Date",
    inputs: [dateField("greenCardDate", "Green Card 'Resident Since' Date", "today-1600"), yn("marriedToCitizen", "Married to and Living With a US Citizen for 3 Years?"), dateField("birthDate", "Your Date of Birth", "today-12000"), dateField("todayDate", "Today's Date")],
    results: [["earliestFilingDate", "Earliest N-400 Filing Date", "d"], ["residenceAnniversary", "Residence Anniversary", "d"], ["daysUntilYouCanFile", "Days Until You Can File", "n"], ["canFileNow", "Can File Now? (1 = yes)", "n"], ["physicalPresenceDaysRequired", "Physical Presence Days Required", "n"]],
    fn: E.n400, ex: { greenCardDate: dn("2022-03-15"), marriedToCitizen: 0, birthDate: dn("1990-01-01"), todayDate: dn("2026-10-18") },
    exText: (o) => `Example: a green card dated March 15, 2022 reaches 5 years on ${fd(o.residenceAnniversary)} — you can file the N-400 from ${fd(o.earliestFilingDate)}.`,
    how: "Enter the 'Resident Since' date on your green card and choose the 3-year rule if you've been married to and living with your US-citizen spouse (who has been a citizen) for the whole period.",
    assume: "INA 334(a): you may file up to 90 days before meeting the continuous residence requirement. You also need physical presence (913 or 548 days), 3 months' residence in your state or USCIS district, good moral character, and the English and civics tests. Fee $760 paper / $710 online.",
    faq: [["Can I apply for citizenship before 5 years?", "Yes, up to 90 days before your 5-year anniversary (or 3-year anniversary if married to a US citizen)."], ["What if I file too early?", "USCIS will deny the application and keep the fee — use the exact Resident Since date."]],
  }),
  mk({
    slug: "i-751-filing-date-calculator", title: "I-751 Filing Date Calculator",
    desc: "Find your Form I-751 filing window to remove conditions on a 2-year green card — it opens 90 days before the card expires.",
    inputs: [dateField("conditionalResidenceDate", "Conditional Green Card 'Resident Since' Date", "today-640"), dateField("todayDate", "Today's Date")],
    results: [["filingWindowOpens", "Filing Window Opens", "d"], ["lastDayToFile", "Last Day to File (before expiry)", "d"], ["cardExpires", "Conditional Card Expires", "d"], ["daysUntilWindowOpens", "Days Until the Window Opens", "n"], ["extendedStatusUntil", "Status Extended Until (48 months after expiry, with receipt)", "d"]],
    fn: E.i751, ex: { conditionalResidenceDate: dn("2025-01-10"), todayDate: dn("2026-10-18") },
    exText: (o) => `Example: conditional residence from January 10, 2025 → the card expires ${fd(o.cardExpires)}, and you can file the I-751 from ${fd(o.filingWindowOpens)}.`,
    how: "Enter the 'Resident Since' date from your 2-year conditional green card.",
    assume: "8 CFR 216.4: file jointly during the 90 days before the second anniversary of conditional residence (waiver petitions can be filed any time). The receipt notice extends your status for 48 months past the card's expiration. Fee $750.",
    faq: [["When should I file the I-751?", "Within the 90 days before your conditional green card expires."], ["What if I miss the I-751 deadline?", "Your status terminates; you can file late with a written explanation of good cause."]],
  }),
  mk({
    slug: "cspa-age-calculator", title: "CSPA Age Calculator",
    desc: "Calculate a child's age under the Child Status Protection Act — age when a visa becomes available minus the time the petition was pending.",
    inputs: [dateField("birthDate", "Child's Date of Birth", "today-7800"), dateField("petitionFiledDate", "Petition Filed (priority date)", "today-3000"), dateField("petitionApprovedDate", "Petition Approved Date", "today-2600"), dateField("visaAvailableDate", "Date the Visa Became Available (Final Action Date current)")],
    results: [["cspaAgeYears", "CSPA Age (years)", "n"], ["protectedUnder21", "Protected as a Child (under 21)? (1 = yes)", "n"], ["pendingDaysSubtracted", "Pending Days Subtracted", "n"], ["biologicalAgeAtAvailability", "Actual Age When Visa Available", "n"], ["seekToAcquireBy", "Must Seek to Acquire by", "d"]],
    fn: E.cspa, ex: { birthDate: dn("2005-02-01"), petitionFiledDate: dn("2018-05-01"), petitionApprovedDate: dn("2019-09-01"), visaAvailableDate: dn("2026-04-01") },
    exText: (o) => `Example: a child born February 1, 2005 is ${o.biologicalAgeAtAvailability} when the visa becomes available on April 1, 2026, but subtracting ${o.pendingDaysSubtracted} days the petition was pending gives a CSPA age of ${o.cspaAgeYears} — ${o.protectedUnder21 ? "still a child" : "aged out"}.`,
    how: "Enter the child's birth date, the petition's filing and approval dates, and the date the priority date became current (first day of the visa bulletin month, or the approval date if later).",
    assume: "INA 203(h): CSPA age = age on the date a visa becomes available − the days the petition was pending. The child must seek to acquire permanent residence within 1 year of availability. Since the 2023 policy change, USCIS uses the Dates for Filing chart when it applies; immediate relatives freeze age at filing.",
    faq: [["How is CSPA age calculated?", "Age when the visa becomes available minus the number of days the I-130 or I-140 was pending."], ["What does aging out mean?", "Turning 21 (CSPA age) before getting a green card as a derivative child, which can force a new category or petition."]],
  }),
  ...[
    { slug: "visa-bulletin-priority-date-calculator", title: "Visa Bulletin Priority Date Calculator", who: "any family or employment category", pd: "2019-06-15", cutoff: "2017-01-01", move: 180, note: "Movement varies widely — EB-2 Rest of World has moved roughly 6–12 months a year recently, while family F4 categories crawl. Check the latest Department of State visa bulletin for your category's Final Action Date." },
    { slug: "india-visa-bulletin-priority-date-calculator", title: "India Visa Bulletin Priority Date Calculator", who: "India-born applicants (EB-2, EB-3 and family)", pd: "2019-06-15", cutoff: "2013-01-01", move: 120, note: "India EB-2 and EB-3 have the longest backlogs because of the 7% per-country cap; historical Final Action Date movement has averaged only a few months a year, with retrogressions." },
  ].map((b) =>
    mk({
      slug: b.slug, title: b.title,
      desc: `Estimate when your priority date will become current for ${b.who} — compare it with the visa bulletin cut-off and the cut-off's yearly movement.`,
      inputs: [dateField("priorityDate", "Your Priority Date", "today-2000"), dateField("currentCutoffDate", "Current Final Action Date for Your Category", "today-3500"), numberField("cutoffMovementDaysPerYear", "Cut-off Movement per Year (days)", { default: b.move, max: 3650 }), dateField("todayDate", "Today's Date")],
      results: [["estimatedCurrentDate", "Estimated Date Your PD Becomes Current", "d"], ["yearsToWait", "Estimated Years to Wait", "n"], ["daysBehindCutoff", "Days Behind the Cut-off", "n"], ["currentNow", "Current Now? (1 = yes)", "n"], ["yearsWaitedSoFar", "Years Waited So Far", "n"]],
      fn: E.visaBulletin, ex: { priorityDate: dn(b.pd), currentCutoffDate: dn(b.cutoff), cutoffMovementDaysPerYear: b.move, todayDate: dn("2026-10-18") },
      exText: (o) => `Example: a priority date of ${fd(dn(b.pd))} with the cut-off at ${fd(dn(b.cutoff))} is ${o.daysBehindCutoff} days behind; at ${b.move} days of movement a year that's about ${o.yearsToWait} more years (around ${fd(o.estimatedCurrentDate)}).`,
      how: "Enter your priority date (from the I-130, I-140 or PERM receipt), the current Final Action Date for your category and country from the visa bulletin, and how far the cut-off has moved per year recently.",
      assume: `Straight-line projection: wait = days behind the cut-off ÷ movement per year. ${b.note} Bulletins can retrogress, so treat this as a rough guide.`,
      faq: [["What does it mean when my priority date is current?", "Your priority date is earlier than the Final Action Date in the visa bulletin, so a visa number can be issued."], ["What is the difference between Final Action and Dates for Filing?", "Dates for Filing lets you submit your application early; Final Action is when the green card can actually be approved."]],
    }),
  ),
  mk({
    slug: "immigration-processing-time-calculator", title: "Immigration Processing Time Calculator",
    desc: "Estimate when your USCIS case will be decided from the receipt date and the published processing time — and whether it's outside normal processing.",
    inputs: [dateField("receiptDate", "Receipt Date (on Form I-797C)", "today-150"), numberField("processingMonths", "Processing Time (months, from USCIS)", { default: 8, max: 120, step: 0.5 }), dateField("todayDate", "Today's Date")],
    results: [["estimatedDecisionDate", "Estimated Decision Date", "d"], ["daysRemaining", "Days Remaining", "n"], ["percentComplete", "Percent of Processing Time Elapsed", "p"], ["daysElapsed", "Days Since Receipt", "n"], ["outsideNormalProcessing", "Outside Normal Processing Time? (1 = yes)", "n"]],
    fn: E.processingTime, ex: { receiptDate: dn("2026-04-01"), processingMonths: 8, todayDate: dn("2026-10-18") },
    exText: (o) => `Example: a case received April 1, 2026 with an 8-month processing time should be decided around ${fd(o.estimatedDecisionDate)} — ${o.percentComplete}% of the way there.`,
    how: "Look up your form, category and office on the USCIS 'Check Case Processing Times' page and enter the time shown (80% of cases are completed within it).",
    assume: "USCIS posts the time within which 80% of cases were completed over the prior 6 months. When today is after the 'receipt date for a case inquiry', you can submit an outside-normal-processing-time service request.",
    faq: [["How long does USCIS take to process?", "It varies by form and office — from a few weeks (premium processing) to several years for some petitions."], ["When can I contact USCIS about a delayed case?", "Once your case is outside the posted normal processing time."]],
  }),
  mk({
    slug: "asylum-clock-calculator", title: "Asylum Clock Calculator",
    desc: "Track your asylum EAD clock — you can apply for a work permit 150 days after filing asylum, and it can be granted after 180 days, minus applicant-caused delays.",
    inputs: [dateField("asylumFiledDate", "Asylum Application (I-589) Filed Date", "today-120"), numberField("clockStoppedDays", "Days the Clock Was Stopped (applicant-caused delays)", { default: 0, max: 3650 }), dateField("todayDate", "Today's Date")],
    results: [["clockDays", "Days on the Asylum Clock", "n"], ["canFileEadOn", "Can File I-765 On", "d"], ["eadCanBeGrantedOn", "EAD Can Be Granted On", "d"], ["canFileEadNow", "Can File Now? (1 = yes)", "n"], ["daysUntil150", "Days Until 150", "n"]],
    fn: E.asylumClock, ex: { asylumFiledDate: dn("2026-06-01"), clockStoppedDays: 10, todayDate: dn("2026-10-18") },
    exText: (o) => `Example: asylum filed June 1, 2026 with a 10-day clock stop → you can file the (c)(8) work permit on ${fd(o.canFileEadOn)}, and it can be approved from ${fd(o.eadCanBeGrantedOn)}.`,
    how: "Enter the date USCIS or the immigration court received your I-589 and any days the clock was stopped (for example a rescheduled interview you requested).",
    assume: "8 CFR 208.7 and 1208.7: the application for a (c)(8) EAD may be filed 150 days after the asylum application, and the EAD can't be granted before 180 days on the clock. Delays you request or cause stop the clock. Initial (c)(8) EADs carry a $570 Pub. L. 119-21 fee from October 16, 2026, and an annual asylum fee applies while the case is pending.",
    faq: [["When can asylum seekers get a work permit?", "They can apply 150 days after filing for asylum, and USCIS can grant it once 180 days are on the clock."], ["What stops the asylum clock?", "Applicant-caused delays like requesting to reschedule an interview or a continuance in court."]],
  }),
  mk({
    slug: "ead-automatic-extension-calculator", title: "EAD Automatic Extension Calculator",
    desc: "Check whether your work permit is automatically extended while a renewal is pending — 540 days for renewals filed before October 30, 2025; none for most filed after.",
    inputs: [dateField("cardExpirationDate", "Current EAD Expiration Date", "today+60"), dateField("renewalFiledDate", "Renewal I-765 Filed Date"), dropdown("category", "EAD Category", [["Eligible category (e.g. (c)(9), (c)(8), (a)(5), (c)(26) H-4, (c)(10))", 0], ["TPS (extension by Federal Register notice)", 1], ["Not eligible (e.g. (c)(3) OPT / STEM OPT, (c)(14))", 2]], 0), numberField("tpsExtensionDays", "TPS Extension Days in the Federal Register Notice", { default: 365, max: 1000 })],
    results: [["workAuthorizedUntil", "Work Authorization Until", "d"], ["extensionDays", "Automatic Extension (days)", "n"], ["autoExtended", "Automatically Extended? (1 = yes)", "n"], ["filedBeforeRuleChange", "Filed Before Oct 30, 2025? (1 = yes)", "n"], ["timelyFiled", "Filed Before Expiry? (1 = yes)", "n"]],
    fn: E.eadExtension, ex: { cardExpirationDate: dn("2025-12-31"), renewalFiledDate: dn("2025-09-15"), category: 0, tpsExtensionDays: 365 },
    exText: (o) => `Example: a (c)(9) EAD expiring December 31, 2025 with a renewal filed September 15, 2025 (before the rule change) is extended ${o.extensionDays} days — to ${fd(o.workAuthorizedUntil)}.`,
    how: "Enter your card's expiration date, the date USCIS received your renewal (on the I-797C), and your category.",
    assume: "DHS interim final rule (effective October 30, 2025) ended automatic extensions for renewal EADs filed on or after that date, except where provided by law or Federal Register notice (such as TPS). Renewals filed before it in eligible categories keep up to 540 days from expiration (2024 final rule). The renewal must be filed before the card expires and in the same category. Employers use the I-797C plus the expired card as proof.",
    faq: [["Are EAD renewals still automatically extended?", "Not for most renewals filed on or after October 30, 2025 — file as early as allowed (up to 180 days before expiry)."], ["Is OPT automatically extended?", "Not under this rule; STEM OPT extensions filed on time get their own 180-day extension under the student rules."]],
  }),
  mk({
    slug: "opt-unemployment-days-calculator", title: "OPT Unemployment Days Calculator",
    desc: "Track your F-1 OPT unemployment days — 90 days allowed on post-completion OPT and 150 in total with the STEM extension.",
    inputs: [yn("stemExtension", "On the STEM OPT Extension?"), numberField("daysUnemployedSoFar", "Unemployment Days Used So Far", { default: 45, max: 400 }), yn("currentlyUnemployed", "Currently Unemployed?", 1), dateField("todayDate", "Today's Date")],
    results: [["daysRemaining", "Unemployment Days Remaining", "n"], ["allowedDays", "Total Days Allowed", "n"], ["exhaustedOn", "Days Run Out On (if still unemployed)", "d"], ["overLimit", "Over the Limit? (1 = yes)", "n"]],
    fn: E.optUnemployment, ex: { stemExtension: 0, daysUnemployedSoFar: 45, currentlyUnemployed: 1, todayDate: dn("2026-10-18") },
    exText: (o) => `Example: 45 days used on post-completion OPT leaves ${o.daysRemaining} days — if you stay unemployed they run out on ${fd(o.exhaustedOn)}.`,
    how: "Count every calendar day without qualifying employment (20+ hours a week in your field) since your EAD start date, including weekends.",
    assume: "8 CFR 214.2(f)(10)(ii)(E): 90 days of unemployment during post-completion OPT; STEM OPT adds 60 more (150 total). Days count from the EAD start date even if you haven't received the card. Exceeding the limit can lead to SEVIS termination.",
    faq: [["How many unemployment days are allowed on OPT?", "90 days on post-completion OPT, 150 in total with the STEM extension."], ["Do weekends count as unemployment days?", "Yes — every calendar day without qualifying employment counts."]],
  }),
  mk({
    slug: "uscis-fee-calculator", title: "USCIS Fee Calculator",
    desc: "Add up USCIS filing fees for a green card, citizenship or work permit package — current Form G-1055 fees with online-filing discounts.",
    meta: "USCIS Fee Calculator 2026 — I-485, I-130, N-400 Fees",
    inputs: [...[1, 2, 3, 4].map((i) => dropdown(`form${i}`, `Form ${i}`, [["None", -1], ...E.USCIS_FORMS.map(([l, p, o], idx) => [`${l} — ${usd(p)}${o && o !== p ? ` paper / ${usd(o)} online` : ""}`, idx] as [string, number])], i === 1 ? 3 : i === 2 ? 6 : i === 3 ? 7 : -1)), yn("fileOnline", "File Online Where Available?"), numberField("applicants", "Number of Applicants (same forms)", { default: 1, min: 1, max: 20 }), yn("premium", "Premium Processing ($2,965, I-129 / I-140)?")],
    results: [["grandTotal", "Total USCIS Fees", "c"], ["totalFees", "Filing Fees", "c"], ["perApplicant", "Per Applicant", "c"], ["onlineSavings", "Online Filing Savings", "c"], ["premiumProcessing", "Premium Processing", "c"]],
    fn: E.uscisFee, ex: { form1: 3, form2: 6, form3: 7, form4: -1, fileOnline: 0, applicants: 1, premium: 0 },
    exText: () => `Example: adjustment of status with a work permit and advance parole — I-485 ($1,440) + I-765 ($260 with a pending I-485) + I-131 ($630) — costs ${usd(exUscis.grandTotal)} per applicant.`,
    how: "Pick each form in your filing package. The I-765 and I-131 filed with a pending I-485 have their own lines.",
    assume: "USCIS Form G-1055, Fee Schedule, edition 10/16/26 (fees from the April 1, 2024 fee rule plus Pub. L. 119-21 fees indexed for FY2027). Biometrics are included in the filing fee. Online filing is $50 cheaper for many forms. The $340 NVC affidavit fee and $325 State Department immigrant visa fee aren't USCIS fees. Fee waivers (I-912) and reduced fees apply to some forms.",
    faq: [["How much does a green card cost in 2026?", "Adjustment of status costs $1,440 for the I-485, plus $260 for a work permit and $630 for advance parole if you file them with it — and $675 for the I-130 if you're a family case."], ["How much is the N-400 fee?", "$760 by mail or $710 online, with a reduced $380 fee for households at or below 400% of the poverty guidelines."]],
  }),
  mk({
    slug: "i-765-fee-calculator", title: "I-765 Fee Calculator",
    desc: "Find the Form I-765 work permit fee for your category — $520 paper / $470 online, $260 with a pending I-485, and the Pub. L. 119-21 fees for asylum, TPS and parole EADs.",
    meta: "I-765 Fee Calculator — Work Permit Fee 2026",
    inputs: [dropdown("category", "EAD Category", E.I765_CATS.map(([l], i) => [l, i] as [string, number]), 0), yn("fileOnline", "File Online?")],
    results: [["totalFee", "Total I-765 Fee", "c"], ["filingFee", "USCIS Filing Fee", "c"], ["publicLawFee", "Pub. L. 119-21 Fee (non-waivable)", "c"], ["onlineSavings", "Online Savings", "c"]],
    fn: E.i765Fee, ex: { category: 6, fileOnline: 0 },
    exText: (o) => `Example: an initial TPS or parole work permit filed by mail costs ${usd(o.filingFee)} plus the ${usd(o.publicLawFee)} Pub. L. 119-21 fee — ${usd(o.totalFee)} in total.`,
    how: "Choose your eligibility category (from Part 2 of the I-765) and how you'll file.",
    assume: "Form G-1055 Appendix C (edition 10/16/26, effective October 16, 2026): general $520 paper / $470 online; $260 with a pending I-485 paid on/after April 1, 2024; initial asylum (c)(8) $0 + $570; asylum renewal + $275; TPS/parole initial + $570 and renewal + $280. The Pub. L. 119-21 fees must be paid separately and can't be waived.",
    faq: [["How much is the I-765 fee?", "$520 by mail or $470 online for most categories; less or free for some."], ["Is the work permit free with a green card application?", "Not anymore — it's $260 if your I-485 was filed with a fee on or after April 1, 2024."]],
  }),
  mk({
    slug: "i-131-fee-calculator", title: "I-131 Fee Calculator",
    desc: "Find the Form I-131 fee for advance parole, a reentry permit or a refugee travel document — current USCIS fees, online discounts and family totals.",
    inputs: [dropdown("documentType", "Travel Document", E.I131_TYPES.map(([l], i) => [l, i] as [string, number]), 0), yn("fileOnline", "File Online?"), numberField("applicants", "Number of Applicants", { default: 1, min: 1, max: 20 })],
    results: [["totalFee", "Total I-131 Fees", "c"], ["feePerApplicant", "Fee per Applicant", "c"], ["onlineSavings", "Online Savings", "c"]],
    fn: E.i131Fee, ex: { documentType: 0, fileOnline: 0, applicants: 2 },
    exText: (o) => `Example: advance parole for two family members with pending green card applications costs ${usd(o.totalFee)} by mail (${usd(o.feePerApplicant)} each).`,
    how: "Choose the document you're applying for and how many people are filing.",
    assume: "Form G-1055 Appendix B (edition 10/16/26): advance parole $630 paper / $580 online; reentry permit $630; refugee travel document $165 (16+) or $135 (under 16), free for current refugees. Parole-related I-131 filings may owe an additional Pub. L. 119-21 immigration parole fee if approved. Biometrics included.",
    faq: [["How much is advance parole?", "$630 by mail or $580 online, even when filed with an I-485."], ["How much is a reentry permit?", "$630."]],
  }),
  mk({
    slug: "i-129-fee-calculator", title: "I-129 Fee Calculator",
    desc: "Calculate total I-129 petition fees for H-1B, L-1, O-1, TN, H-2A and H-2B — filing fee, Asylum Program Fee, fraud and ACWIA fees, the 114-113 fee and premium processing.",
    meta: "I-129 Fee Calculator — H-1B, L-1, O-1 Petition Costs",
    inputs: [dropdown("classification", "Classification", E.I129_TYPES.map(([l], i) => [l, i] as [string, number]), 0), dropdown("employerType", "Employer", [["Regular employer", 0], ["Small employer (25 or fewer FTE)", 1], ["Nonprofit", 2]], 0), yn("fileOnline", "File Online?"), yn("initialOrNewEmployer", "Initial Petition or Change of Employer (fraud fee)?", 1), numberField("usEmployees", "US Full-Time Employees", { default: 30, max: 1000000 }), yn("acwiaExempt", "ACWIA Exempt (university, nonprofit research, etc.)?"), yn("over50PercentHL", "50+ Employees and Over 50% on H-1B / L?"), yn("proclamationFeeApplies", "H-1B $100,000 Proclamation Payment Applies?"), yn("premium", "Premium Processing ($2,965)?")],
    results: [["totalFees", "Total Petition Fees", "c"], ["filingFee", "I-129 Filing Fee", "c"], ["asylumProgramFee", "Asylum Program Fee", "c"], ["fraudFee", "Fraud Prevention & Detection Fee", "c"], ["acwiaFee", "ACWIA Fee", "c"], ["publicLaw114113Fee", "Pub. L. 114-113 Fee", "c"], ["proclamationPayment", "Proclamation Payment", "c"], ["premiumProcessing", "Premium Processing", "c"]],
    fn: E.i129Fee, ex: { classification: 0, employerType: 0, fileOnline: 0, initialOrNewEmployer: 1, usEmployees: 30, acwiaExempt: 0, over50PercentHL: 0, proclamationFeeApplies: 0, premium: 0 },
    exText: (o) => `Example: a new H-1B petition from a 30-employee company costs ${usd(o.filingFee)} + ${usd(o.asylumProgramFee)} Asylum Program Fee + ${usd(o.fraudFee)} fraud fee + ${usd(o.acwiaFee)} ACWIA — ${usd(o.totalFees)} before premium processing.`,
    how: "Choose the visa classification and employer type, then answer the fee questions for H-1B and L petitions.",
    assume: "Form G-1055 Appendix A (edition 10/16/26). H-1B: $780 paper / $730 online ($460 small employer or nonprofit); Asylum Program Fee $600 / $300 / $0; fraud fee $500; ACWIA $750 (1–25 employees) or $1,500; Pub. L. 114-113 $4,000 (L: $4,500); H-2B fraud fee $150. The $100,000 proclamation payment for certain new H-1B petitions has been blocked by a court order since mid-2026 — tick it only if it applies. Premium processing $2,965.",
    faq: [["How much does an H-1B petition cost?", "Typically $2,380–$3,380 in USCIS fees for a regular employer before premium processing and attorney fees."], ["Who pays H-1B fees?", "The employer must pay the ACWIA and fraud fees — they can't be passed to the worker."]],
  }),
  mk({
    slug: "affidavit-of-support-calculator", title: "Affidavit of Support Calculator (I-864)",
    desc: "Check if your income meets the I-864 affidavit of support requirement — 125% of the 2026 poverty guidelines for your household size, with assets counted.",
    meta: "I-864 Affidavit of Support Calculator 2026 — Income Requirement",
    inputs: [numberField("householdSize", "Household Size (you, dependents, immigrants sponsored, prior I-864s)", { default: 3, min: 2, max: 20 }), dropdown("region", "Where You Live", [["48 states, DC, territories", 0], ["Alaska", 1], ["Hawaii", 2]], 0), yn("activeDutySponsoringSpouseOrChild", "Active-Duty Military Sponsoring Spouse or Child (100%)?"), currencyField("sponsorIncome", "Your Annual Income", { default: 38000, max: 10000000, step: 500 }), currencyField("householdMemberIncome", "Household Member Income (with I-864A)", { default: 0, max: 10000000, step: 500 }), currencyField("jointSponsorIncome", "Joint Sponsor's Income (if they meet it alone, leave 0 here)", { default: 0, max: 10000000, step: 500 }), currencyField("assets", "Net Assets (cash, investments, home equity)", { default: 20000, max: 100000000, step: 1000 }), dropdown("relationship", "Immigrant Is Your", [["Other relative (assets ÷ 5)", 0], ["Spouse or child 18+ of a US citizen (assets ÷ 3)", 1], ["Orphan adopted abroad (assets ÷ 1)", 2]], 1)],
    results: [["meetsRequirement", "Meets the Requirement? (1 = yes)", "n"], ["minimumIncomeRequired", "Minimum Income Required", "c"], ["yourCountedIncome", "Your Counted Income", "c"], ["incomeShortfall", "Income Shortfall", "c"], ["assetsNeededToCoverShortfall", "Assets Needed to Cover the Shortfall", "c"], ["povertyGuideline", "2026 Poverty Guideline", "c"]],
    fn: E.affidavitOfSupport, ex: { householdSize: 3, region: 0, activeDutySponsoringSpouseOrChild: 0, sponsorIncome: 38000, householdMemberIncome: 0, jointSponsorIncome: 0, assets: 20000, relationship: 1 },
    exText: (o) => `Example: sponsoring a spouse in a household of 3 requires ${usd(o.minimumIncomeRequired)} (125% of the ${usd(o.povertyGuideline)} guideline) — ${usd(38000)} of income ${o.meetsRequirement ? "meets it" : `is ${usd(o.incomeShortfall)} short`}. If income were ${usd(30000)}, the ${usd(4150)} shortfall would need ${usd(12450)} of assets.`,
    how: "Count your household: you, your spouse, dependent children, other dependents on your tax return, the immigrants you're sponsoring, and anyone you previously sponsored whose I-864 is still in force.",
    assume: "Form I-864P (2026 HHS poverty guidelines: $15,960 + $5,680 per person; Alaska $19,950 + $7,100; Hawaii $18,360 + $6,530) × 125% (100% for active-duty military sponsoring a spouse or child). Assets can cover a shortfall at 5× (3× for a citizen's spouse or adult child, 1× for an orphan). A joint sponsor must meet the requirement on their own household.",
    faq: [["How much income do I need to sponsor a spouse in 2026?", "125% of the poverty guideline — $27,050 for a household of 2 in the 48 states."], ["Can I use assets for the affidavit of support?", "Yes — assets worth 3 times the shortfall (5 times for most relatives) can make up the difference."]],
  }),
  mk({
    slug: "h-1b-prevailing-wage-calculator", title: "H-1B Prevailing Wage Calculator",
    desc: "Find which OFLC prevailing wage level your H-1B salary meets (Level I–IV) — and how many entries you'd get in the wage-weighted H-1B lottery.",
    inputs: [currencyField("offeredAnnualWage", "Offered Annual Salary", { default: 115000, max: 2000000, step: 500 }), currencyField("level1Wage", "Level I Wage (from FLC Data Center)", { default: 88000, max: 2000000, step: 100 }), currencyField("level2Wage", "Level II Wage", { default: 105000, max: 2000000, step: 100 }), currencyField("level3Wage", "Level III Wage", { default: 122000, max: 2000000, step: 100 }), currencyField("level4Wage", "Level IV Wage", { default: 139000, max: 2000000, step: 100 }), dropdown("requiredLevel", "Level Required for the Job", [["Level I", 0], ["Level II", 1], ["Level III", 2], ["Level IV", 3]], 1)],
    results: [["wageLevel", "Your Wage Level (0 = below Level I)", "n"], ["meetsRequiredWage", "Meets the Required Prevailing Wage? (1 = yes)", "n"], ["shortfallToRequired", "Shortfall to Required Level", "c"], ["lotteryEntries", "Weighted Lottery Entries", "n"], ["hourlyEquivalent", "Hourly Equivalent", "c"]],
    fn: E.prevailingWage, ex: { offeredAnnualWage: 115000, level1Wage: 88000, level2Wage: 105000, level3Wage: 122000, level4Wage: 139000, requiredLevel: 1 },
    exText: (o) => `Example: a ${usd(115000)} offer against Level II of ${usd(105000)} and Level III of ${usd(122000)} is Level ${o.wageLevel} — it meets a Level II job and gets ${o.lotteryEntries} entries in the weighted lottery.`,
    how: "Look up the four wage levels for the occupation (SOC code) and worksite area on the FLC Data Center (flcdatacenter.com) — for example California metro areas — and enter your offered salary.",
    assume: "The employer must pay at least the higher of the actual wage or the prevailing wage for the level the job requires (20 CFR 655.731). Under DHS's wage-weighted selection rule, registrations are entered once per wage level (Level IV = 4 entries, Level I = 1). OFLC wages update each July 1.",
    faq: [["What is the H-1B prevailing wage?", "The minimum wage DOL sets for an occupation and area at four skill levels; the employer must pay at least the required level."], ["How does the weighted H-1B lottery work?", "Higher wage levels get more entries — a Level IV registration is entered four times, Level I once."]],
  }),
  mk({
    slug: "h-1b-tax-calculator", title: "H-1B Tax Calculator",
    desc: "Estimate take-home pay on an H-1B salary — 2026 federal income tax, Social Security and Medicare, and state tax, as a resident or nonresident alien.",
    meta: "H-1B Tax Calculator 2026 — Take-Home Pay",
    inputs: [currencyField("annualSalary", "Annual Salary", { default: 120000, max: 5000000, step: 500 }), dropdown("taxResidency", "Tax Status", [["Nonresident alien (first partial year, no standard deduction)", 0], ["Resident alien (passed substantial presence test)", 1]], 1), yn("marriedFilingJointly", "Married Filing Jointly (resident only)?"), currencyField("itemizedDeductions", "Itemized Deductions (nonresident: state tax, charity)", { default: 0, max: 1000000, step: 100 }), currencyField("pretax401k", "Pre-Tax 401(k) Contributions", { default: 0, max: 24500, step: 100 }), percentField("stateTaxPercent", "State Income Tax (effective %)", { default: 5, max: 15, step: 0.25 })],
    results: [["takeHomePay", "Annual Take-Home Pay", "c"], ["monthlyTakeHome", "Monthly Take-Home", "c"], ["federalIncomeTax", "Federal Income Tax", "c"], ["socialSecurity", "Social Security", "c"], ["medicare", "Medicare", "c"], ["stateIncomeTax", "State Income Tax", "c"], ["effectiveTaxRatePercent", "Effective Tax Rate", "p"]],
    fn: E.h1bTax, ex: { annualSalary: 120000, taxResidency: 1, marriedFilingJointly: 0, itemizedDeductions: 0, pretax401k: 0, stateTaxPercent: 5 },
    exText: (o) => `Example: ${usd(120000)} as a single resident alien with 5% state tax leaves about ${usd(o.takeHomePay)} a year (${usd(o.monthlyTakeHome)} a month) after ${usd(o.federalIncomeTax)} federal tax and FICA.`,
    how: "Choose resident if you meet the substantial presence test (most H-1B workers after their first year). Use your state's effective rate.",
    assume: "2026 federal brackets and $16,100 / $32,200 standard deduction (Rev. Proc. 2025-32); Social Security 6.2% to $184,500, Medicare 1.45% + 0.9% over $200,000. H-1B workers pay FICA (unlike F-1 students). Nonresidents can't take the standard deduction (Indian nationals can under the treaty) or file jointly.",
    faq: [["Do H-1B workers pay Social Security tax?", "Yes — H-1B holders pay Social Security and Medicare like US citizens."], ["Am I a resident or nonresident on H-1B?", "Usually a resident once you meet the substantial presence test (183 weighted days)."]],
  }),
  mk({
    slug: "h-2a-tax-calculator", title: "H-2A Tax Calculator",
    desc: "Estimate taxes on H-2A farmworker wages — exempt from Social Security, Medicare and FUTA, but subject to federal income tax at 2026 rates.",
    inputs: [currencyField("h2aWages", "H-2A Wages for the Year", { default: 28000, max: 500000, step: 100 }), dropdown("taxResidency", "Tax Status", [["Nonresident alien (most H-2A workers)", 0], ["Resident alien (183+ days, substantial presence)", 1]], 0), currencyField("itemizedDeductions", "Itemized Deductions (state tax paid, etc.)", { default: 0, max: 100000, step: 50 }), percentField("stateTaxPercent", "State Income Tax (effective %)", { default: 0, max: 15, step: 0.25 }), currencyField("federalWithheld", "Federal Tax Withheld (if you requested withholding)", { default: 0, max: 100000, step: 50 })],
    results: [["federalIncomeTax", "Federal Income Tax", "c"], ["takeHomePay", "Take-Home Pay", "c"], ["refundOrOwed", "Refund (+) or Owed (−)", "c"], ["stateIncomeTax", "State Income Tax", "c"], ["socialSecurityAndMedicare", "Social Security & Medicare", "c"], ["ficaSavedVsOtherWorkers", "FICA Not Owed (vs. regular workers)", "c"]],
    fn: E.h2aTax, ex: { h2aWages: 28000, taxResidency: 0, itemizedDeductions: 0, stateTaxPercent: 0, federalWithheld: 0 },
    exText: (o) => `Example: ${usd(28000)} of H-2A wages as a nonresident alien owes about ${usd(o.federalIncomeTax)} of federal income tax and no FICA (saving ${usd(o.ficaSavedVsOtherWorkers)}).`,
    how: "Enter your H-2A wages from Form W-2 (Box 1) and any federal tax you asked your employer to withhold (Form W-4).",
    assume: "H-2A wages are exempt from Social Security, Medicare (IRC §3121(b)(1)) and FUTA, and employers don't have to withhold income tax unless the worker requests it — but the income is still taxable. 2026 brackets (10% to $12,400, 12% to $50,400, 22% to $105,700…); nonresident aliens get no standard deduction (Form 1040-NR); residents of Mexico and Canada may claim certain dependents.",
    faq: [["Do H-2A workers pay taxes?", "They owe federal income tax (and sometimes state tax) but not Social Security, Medicare or FUTA."], ["Do H-2A workers get a W-2?", "Yes, if they earned $600 or more — and they file Form 1040-NR (or 1040 if resident)."]],
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
