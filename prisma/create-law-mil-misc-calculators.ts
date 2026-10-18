// One-time (but safe to re-run) batch setup script: creates 4 military service-time,
// deployment countdown, WWII draft and sea service calculators (Law & Government Calculators >
// Military & Veterans Calculators). Logic lives in src/lib/calc-engine-law-mil-misc.ts; the
// examples below are computed from that engine so they always match the calculator.
// Merged keywords (covered here, no separate page): TIS / Time in Service Army, TAFMS, SCD,
// Active Duty Service Computation, Active Duty Calculator, ETS Date → military-time-in-service;
// Deployment Calculator, Army Deployment Calculator → deployment-countdown; Would I Have Been
// Drafted in WW2 → ww2-draft; Seatime, USCG Sea Time / Sea Service → uscg-sea-service.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-mil-misc-calculators.ts
// or
//   npm run db:create-law-mil-misc-calculators

import * as E from "../src/lib/calc-engine-law-mil-misc";

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
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;

const exTis = r(E.timeInService, { years1: 4, months1: 2, days1: 10, years2: 1, months2: 6, days2: 0, years3: 0, months3: 0, days3: 0, contractYears: 6 });
const exDep = r(E.deploymentCountdown, { totalDays: 270, daysLeft: 112 });
const exWw2 = r(E.ww2Draft, { birthYear: 1922, birthMonth: 6 });
const exSea = r(E.uscgSeaService, { eightHourDays: 200, twelveHourDays: 150, twoWatchCredit: 1, daysRequired: 540 });

const periodFields = (p: number, d: [number, number, number]) => [
  numberField(`years${p}`, `Period ${p} — Years`, { default: d[0], max: 40 }),
  numberField(`months${p}`, `Period ${p} — Months`, { default: d[1], max: 11 }),
  numberField(`days${p}`, `Period ${p} — Days`, { default: d[2], max: 29 }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "military-time-in-service-calculator",
    title: "Military Time in Service Calculator (TIS / TAFMS)",
    description: "Add up your military service periods into total time in service (TIS / TAFMS) in years, months and days — and see how long until your next pay raise for longevity and your ETS.",
    metaTitle: "Military Time in Service Calculator — TIS, TAFMS & ETS",
    metaDescription: "Free military time in service calculator. Add up to three service periods, get total TIS/TAFMS and months to your next longevity raise and ETS.",
    calcInputs: [...periodFields(1, [4, 2, 10]), ...periodFields(2, [1, 6, 0]), ...periodFields(3, [0, 0, 0]), numberField("contractYears", "Current Contract Length in Years (0 to skip ETS)", { default: 6, max: 30 })],
    calcResult: { label: "Total Years of Service", format: "number" },
    calcResults: [
      { key: "totalYears", label: "Years", format: "number", highlight: true },
      { key: "totalMonths", label: "Months", format: "number" },
      { key: "totalDays", label: "Days", format: "number" },
      { key: "totalYearsDecimal", label: "Total Years (decimal)", format: "number" },
      { key: "monthsToNextPayRaise", label: "Months to Next Longevity Step on the Pay Table", format: "number" },
      { key: "monthsToEts", label: "Months to ETS", format: "number" },
    ],
    instructions: "Enter each period of creditable service (active duty, and Reserve/Guard time that counts toward your pay date) in years, months and days — for example from your DD-214s or your service record. Leave unused periods at 0.",
    examples: `Example: 4 years 2 months 10 days plus 1 year 6 months adds up to ${exTis.totalYears} years, ${exTis.totalMonths} months and ${exTis.totalDays} days — ${exTis.monthsToNextPayRaise} months until the "over 6" pay step, and ${exTis.monthsToEts} months to the end of a 6-year contract.`,
    assumptions: "Uses the DFAS convention of 30-day months and 360-day years. Pay steps follow the basic pay table (over 2, 3, 4, 6, 8 … 40 years). Time lost (AWOL, confinement) and non-creditable periods should be left out; your Pay Entry Base Date (PEBD) on your LES is the official figure.",
    faq: [
      { question: "What's the difference between TIS and TAFMS?", answer: "Time in service counts all creditable service for pay; TAFMS (total active federal military service) counts only active duty — Air Force uses TAFMS for promotion eligibility." },
      { question: "How do I find my official service date?", answer: "Your Pay Entry Base Date (PEBD) or Basic Active Service Date (BASD) is on your LES and service record." },
    ],
  },
  {
    slug: "deployment-countdown-calculator",
    title: "Deployment Countdown Calculator",
    description: "Count down a deployment — days, weeks and months left, how far through you are, and how many paychecks and weekends remain until homecoming.",
    metaTitle: "Deployment Countdown Calculator — Days Until Homecoming",
    metaDescription: "Free deployment countdown calculator. Enter the deployment length and days left to see weeks and months to go, % complete and paychecks left.",
    calcInputs: [
      numberField("totalDays", "Total Deployment Length (days)", { default: 270, min: 1, max: 1000, unit: "days" }),
      numberField("daysLeft", "Days Left Until Homecoming", { default: 112, max: 1000, unit: "days" }),
    ],
    calcResult: { label: "Days Left", format: "number" },
    calcResults: [
      { key: "daysLeft", label: "Days Left", format: "number", highlight: true },
      { key: "weeksLeft", label: "Weeks Left", format: "number" },
      { key: "monthsLeft", label: "Months Left", format: "number" },
      { key: "percentComplete", label: "Deployment Complete", format: "percentage" },
      { key: "paychecksLeft", label: "Paychecks Left (1st and 15th)", format: "number" },
      { key: "weekendsLeft", label: "Weekends Left", format: "number" },
    ],
    instructions: "Enter the planned length of the deployment and the days remaining until the expected return date.",
    examples: `Example: with 112 days left of a 270-day deployment you're ${exDep.percentComplete}% done — ${exDep.weeksLeft} weeks, ${exDep.paychecksLeft} paychecks and ${exDep.weekendsLeft} weekends to go.`,
    assumptions: "Months are 30.44 days; paychecks are twice a month (1st and 15th). Return dates often change — update the days left as you hear more.",
    faq: [
      { question: "How long is a typical deployment?", answer: "Most are 6 to 9 months, though some Army and Navy deployments run 9 to 12 months." },
      { question: "Does deployment pay change when I get back?", answer: "Yes — hostile fire/imminent danger pay, family separation allowance and the combat zone tax exclusion stop when you leave the area." },
    ],
  },
  {
    slug: "ww2-draft-calculator",
    title: "Would I Have Been Drafted in WW2? Calculator",
    description: "Find out if you (or a relative) would have been drafted in World War II — age on Pearl Harbor Day, whether you'd have had to register, and how long you'd have been eligible for induction.",
    metaTitle: "Would I Have Been Drafted in WW2? — Draft Age Calculator",
    metaDescription: "Free WWII draft calculator. Enter a birth year and month to see age on 7 Dec 1941, registration duty and years eligible for induction (1940–45).",
    calcInputs: [
      numberField("birthYear", "Birth Year", { default: 1922, min: 1870, max: 2010 }),
      numberField("birthMonth", "Birth Month (1–12)", { default: 6, min: 1, max: 12 }),
    ],
    calcResult: { label: "Years Eligible for Induction", format: "number" },
    calcResults: [
      { key: "yearsEligibleForInduction", label: "Years Eligible for Induction", format: "number", highlight: true },
      { key: "ageOnPearlHarborDay", label: "Age on 7 December 1941", format: "number" },
      { key: "mustRegister", label: "Would Have Had to Register? (1 = yes)", format: "number" },
      { key: "eligibleInFirstDraft1940", label: "Eligible in the 1940–42 Draft (ages 21–35)? (1 = yes)", format: "number" },
      { key: "eligibleOneYearOrMore", label: "Eligible for a Year or More? (1 = yes)", format: "number" },
    ],
    instructions: "Enter the birth year and month of the man you're checking. This is about draft eligibility — exemptions for farm work, essential jobs, dependents and medical reasons kept many eligible men from being inducted.",
    examples: `Example: a man born in June 1922 was ${exWw2.ageOnPearlHarborDay} on Pearl Harbor Day and eligible for induction for about ${exWw2.yearsEligibleForInduction} years.`,
    assumptions: "Selective Training and Service Act of 1940: men 21–35 registered from 16 October 1940 and could be inducted; after Pearl Harbor all men 18–64 registered (the 'old man's registration' covered 45–64, who weren't inducted); from November 1942 men 18–37 were inducted until the war ended in August 1945. About 10 million men were drafted.",
    faq: [
      { question: "What was the WW2 draft age?", answer: "21 to 35 at first (1940), then 18 to 37 for induction from late 1942; men up to 64 had to register." },
      { question: "Could women be drafted in WW2?", answer: "No — women served as volunteers in units such as the WAC, WAVES and SPARS." },
    ],
  },
  {
    slug: "uscg-sea-service-calculator",
    title: "USCG Sea Service (Sea Time) Calculator",
    description: "Add up Coast Guard merchant mariner sea service — 8-hour days, 12-hour days on two-watch vessels at 1.5 days credit — and see how close you are to the sea time a credential requires.",
    metaTitle: "USCG Sea Time Calculator — Merchant Mariner Sea Service",
    metaDescription: "Free sea service calculator for USCG merchant mariner credentials. 8-hour days, 1.5× credit for 12-hour days on two-watch vessels and days still needed.",
    calcInputs: [
      numberField("eightHourDays", "Days of 8+ Hours on Watch", { default: 200, max: 10000, unit: "days" }),
      numberField("twelveHourDays", "Days of 12 Hours (two-watch system)", { default: 150, max: 10000, unit: "days" }),
      dropdown("twoWatchCredit", "Vessel Eligible for 1.5× Credit?", [["Yes", 1], ["No", 0]], 1),
      numberField("daysRequired", "Sea Days Required for the Credential", { default: 540, max: 5000, unit: "days" }),
    ],
    calcResult: { label: "Credited Sea Days", format: "number" },
    calcResults: [
      { key: "creditedSeaDays", label: "Credited Sea Days", format: "number", highlight: true },
      { key: "seaTimeYears", label: "Sea Time (years of 360 days)", format: "number" },
      { key: "daysStillNeeded", label: "Days Still Needed", format: "number" },
      { key: "percentOfRequirement", label: "Share of Requirement Met", format: "percentage" },
    ],
    instructions: "Enter your days of service from sea service letters or discharges, split into 8-hour days and 12-hour days. 1.5× credit only applies on vessels where the two-watch system is permitted (check 46 CFR 10.232 and your sea service letter).",
    examples: `Example: 200 eight-hour days plus 150 twelve-hour days at 1.5× give ${exSea.creditedSeaDays} days — ${exSea.daysStillNeeded} short of a 540-day requirement.`,
    assumptions: "46 CFR 10.232: a day is 8 hours of watchstanding or day-working; on vessels permitted to use a two-watch system, 12-hour days count as 1.5 days. 360 days = 1 year of sea service. Military sea service is evaluated by the National Maritime Center and may be credited differently. Not affiliated with the US Coast Guard.",
    faq: [
      { question: "Does a 12-hour day count as 1.5 days?", answer: "Only on vessels where a two-watch system is allowed — otherwise each day counts as one." },
      { question: "Can military sea time count toward a USCG license?", answer: "Yes — the National Maritime Center credits military sea service based on your transcript of sea service." },
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
