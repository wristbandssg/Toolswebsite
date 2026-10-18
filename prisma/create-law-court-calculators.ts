// One-time (but safe to re-run) batch setup script: creates 80 court, criminal and legal fee
// calculators (Law & Government Calculators > Court, Criminal & Legal Fee Calculators). Court
// calendars, sentencing tables, means-test medians and fee rules live in
// src/lib/calc-engine-law-court.ts; examples are computed from the engine so they always match.
// Merged keywords (covered here, no separate page): Court Date, Legal Deadline, Days to Respond,
// Response Deadline, Answer Deadline, FRCP / Federal Rules Deadline, Date of Service, Court Days,
// Business Days (court sense) → court-deadline; CCP / California Court Days, CRC → california-court-
// deadline; TRCP → texas-court-deadline; Florida Rules → florida-court-deadline; Speedy Trial Act,
// Speedy Trial Clock → speedy-trial; SOL, Filing Deadline → statute-of-limitations; TILA / Mortgage
// Rescission → right-of-rescission; 3 Day Notice To Pay Rent → california-3-day-notice; Inmate /
// Jail Time / Sentence / Good Time / Time Served / Out Date → jail-release; BOP, GCT, First Step
// Act, FSA Credits, RDAP → federal-prison-release; USSG, Federal Sentence, Offense Level, Criminal
// History Points / Category → federal-sentencing; Florida CPC, Lowest Permissible Sentence →
// florida-scoresheet; Means Test, Chapter 7 Eligibility, Median Income Bankruptcy → bankruptcy-
// means-test; Chapter 13 Plan / Trustee → chapter-13-payment; Post-Judgment / Pre-Judgment
// Interest, Statutory Interest → judgment-interest; NYS Interest, CPLR 5004 → new-york-judgment-
// interest; CDA Interest → prompt-payment-interest; Late Payment of Commercial Debts → uk-late-
// payment; Bail, Bond Cost, Bondsman Fee → bail-bond; Notary Fee, Loan Signing → mobile-notary;
// USPTO / Trademark Registration Cost → trademark-filing-fee; Patent Cost / USPTO Fee → patent-
// filing-fee; Patent Term, PTA → patent-expiration-date; National Phase → pct-deadline; Copyright
// Expiration → public-domain; Relief from Royalty, Patent Valuation → ip-valuation; Crime Per
// Capita → crime-rate; Prop 19 Parent-Child Exclusion → prop-19; AB 1482, Rent Increase CA →
// california-rent-cap; Land Contract → contract-for-deed; Pre-Settlement Funding, Lawsuit Cash
// Advance → lawsuit-loan; OIC, IRS Settlement, RCP → offer-in-compromise; Speeding Fine, Ticket
// Cost, Speeding Points → speeding-ticket-cost (plus 11 state pages with their own schedules).
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-court-calculators.ts
// or
//   npm run db:create-law-court-calculators

import * as E from "../src/lib/calc-engine-law-court";

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


const CAT = "court-criminal-legal-fee-calculators";
const NOT_ADVICE = "This is an estimate for planning, not legal advice — always confirm deadlines, sentences and fees against the current rules, your court's local rules and a lawyer.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const dn = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000);
const fd = (d: number) => new Date(d * 86400000).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
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
}
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [mainKey, mainLabel, mainFmt] = s.results[0];
  void mainKey;
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free & Accurate`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt] },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOT_ADVICE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

// --- Court deadlines -----------------------------------------------------------------------------
const COUNT = dropdown("countMethod", "Count", [["Calendar days", 0], ["Court (business) days", 1]], 0);
const DIR = dropdown("direction", "Direction", [["Forward (days after the trigger)", 0], ["Backward (days before a hearing)", 1]], 0);
const DEADLINE_RESULTS: Line[] = [["deadline", "Deadline", "d"], ["calendarDaysFromTrigger", "Calendar Days from Trigger Date", "n"], ["rolledForwardDays", "Days Added for Weekend / Holiday", "n"]];
interface DeadlineSpec { slug: string; title: string; where: string; fn: E.CustomCalculator; service: [string, number][]; holidays?: boolean; rules: string; faq: [string, string][]; extraResults?: Line[]; exDays?: number }
const DEADLINES: DeadlineSpec[] = [
  { slug: "court-deadline-calculator", title: "Court Deadline Calculator", where: "federal court (FRCP 6) or any court using calendar- or court-day counting", fn: E.courtDeadline(undefined, "frcp"), holidays: true, service: [["Personal / electronic service", 0], ["Mail (+3 days, FRCP 6(d))", 1]], rules: "FRCP 6(a): exclude the trigger day, count every day, and if the last day is a weekend or legal holiday the deadline moves to the next court day. FRCP 6(d) adds 3 days after service by mail (electronic service no longer gets the extra 3 days since 2016).", faq: [["How do you count days for a court deadline?", "Skip the day of the event, count every calendar day (including weekends), and if the last day falls on a weekend or court holiday, the deadline is the next court day."], ["How many days do I have to answer a federal complaint?", "21 days after service of the summons and complaint (60 days if you waived service, FRCP 12(a))."]] },
  { slug: "california-court-deadline-calculator", title: "California Court Deadline Calculator", where: "California state court (CCP §§12, 12a, 1013 and 1010.6)", fn: E.courtDeadline("california", "ca"), service: [["Personal service", 0], ["Mail within California (+5 calendar days)", 1], ["Mail outside California (+10 calendar days)", 2], ["Electronic / overnight delivery (+2 court days)", 3]], rules: "CCP §12 excludes the first day and includes the last; §12a extends a deadline falling on a weekend or judicial holiday (including Lincoln's Birthday, César Chávez Day, Native American Day and the day after Thanksgiving). CCP §1013 adds 5 days for mail in California, 10 outside the state, and 2 court days for e-service or overnight delivery.", faq: [["How many days to respond to a complaint in California?", "30 calendar days after personal service of the summons (more if served by substitute service or by mail with acknowledgment)."], ["What are California court holidays?", "Federal holidays (except Columbus Day) plus Lincoln's Birthday, César Chávez Day, Native American Day and the day after Thanksgiving."]] },
  { slug: "texas-court-deadline-calculator", title: "Texas Court Deadline Calculator", where: "Texas state court (TRCP 4 and 99)", fn: E.texasDeadline, service: [["Personal / electronic service", 0], ["Mail (+3 days, TRCP 21a)", 1]], rules: "TRCP 4 excludes the trigger day and extends a deadline that falls on a weekend or legal holiday. TRCP 99(b): an answer is due by 10:00 a.m. on the Monday next after the expiration of 20 days from service. TRCP 21a adds 3 days after mail service.", extraResults: [["answerDueDate", "Answer Due (10 a.m., Monday after 20 days)", "d"]], exDays: 20, faq: [["How long do I have to answer a lawsuit in Texas?", "By 10:00 a.m. on the Monday after 20 days have passed from the day you were served (justice court: 14 days)."], ["Does Texas count weekends in court deadlines?", "Yes for periods over 5 days; a deadline that ends on a weekend or holiday moves to the next business day."]] },
  { slug: "florida-court-deadline-calculator", title: "Florida Court Deadline Calculator", where: "Florida state court (Fla. R. Gen. Prac. & Jud. Admin. 2.514)", fn: E.courtDeadline("florida", "fl"), service: [["Personal / e-mail service", 0], ["Mail (+5 days, Rule 2.514(b))", 1]], rules: "Rule 2.514(a) excludes the trigger day, counts every day and moves a deadline off weekends and legal holidays (including the day after Thanksgiving). Rule 2.514(b) adds 5 days for service by mail; e-mail service gets no extra days.", faq: [["How many days to answer a complaint in Florida?", "20 days after service of process (Fla. R. Civ. P. 1.140)."], ["Does Florida add days for mail service?", "Yes — 5 days when a document is served by mail; nothing extra for e-mail service."]] },
  { slug: "michigan-court-deadline-calculator", title: "Michigan Court Deadline Calculator", where: "Michigan state court (MCR 1.108)", fn: E.courtDeadline("michigan"), service: [["Personal / electronic service", 0], ["Mail (+3 days)", 1]], rules: "MCR 1.108: exclude the trigger day, include the last day unless it's a weekend, legal holiday or a day the court is closed (including the day after Thanksgiving). Service by mail adds 3 days (MCR 2.107(C)(3)).", faq: [["How long to answer a complaint in Michigan?", "21 days after personal service, or 28 days if served by mail or outside Michigan (MCR 2.108)."], ["How long do I have to appeal in Michigan?", "21 days from the judgment for a claim of appeal to the Court of Appeals in civil cases (MCR 7.204)."]] },
];
function deadlineTool(d: DeadlineSpec): ToolDef {
  const days = d.exDays ?? 21;
  const ex = { triggerDate: dn("2026-11-02"), daysAllowed: days, countMethod: 0, serviceMethod: 0, direction: 0, holidaySet: 0 };
  return mk({
    slug: d.slug,
    title: d.title,
    desc: `Calculate filing and response deadlines for ${d.where} — calendar or court days, service extensions, and weekend and holiday roll-over.`,
    meta: `${d.title} — Response & Filing Dates`,
    inputs: [dateField("triggerDate", "Trigger Date (service, filing or hearing date)"), numberField("daysAllowed", "Number of Days", { default: days, max: 3650 }), COUNT, dropdown("serviceMethod", "Service Method", d.service, 0), DIR, ...(d.holidays ? [dropdown("holidaySet", "Court Holidays", [["US federal", 0], ["California", 1], ["Texas", 2], ["Florida", 3], ["Michigan", 4], ["None (weekends only)", 5]], 0)] : [])],
    results: [...(d.extraResults ?? []), ...DEADLINE_RESULTS],
    fn: d.fn,
    ex,
    exText: (o) => `Example: served on ${fd(ex.triggerDate)} with ${days} days to respond → the deadline is ${fd(o.answerDueDate ?? o.deadline)}${o.rolledForwardDays ? ` (moved ${o.rolledForwardDays} day(s) off a weekend or holiday)` : ""}.`,
    how: "Enter the date of the triggering event (service, filing, entry of order) and the number of days the rule gives you. Choose calendar or court days, how the document was served, and whether you're counting forward from an event or backward from a hearing.",
    assume: d.rules,
    faq: d.faq,
  });
}

const EXR = dn("2026-12-04");
const TOOLS: ToolDef[] = [
  ...DEADLINES.map(deadlineTool),
  mk({
    slug: "new-jersey-motion-date-calculator", title: "New Jersey Motion Date Calculator",
    desc: "Find New Jersey motion filing, opposition and reply dates from the return date — 16 days to file, 8 days for opposition and 4 days for reply under R. 1:6-3.",
    inputs: [dateField("returnDate", "Motion Return Date", "today+30")],
    results: [["fileAndServeBy", "File & Serve Motion By", "d"], ["oppositionDue", "Opposition Due", "d"], ["replyDue", "Reply Due", "d"]],
    fn: E.njMotionDates, ex: { returnDate: EXR },
    exText: (o) => `Example: for a ${fd(EXR)} return date, file and serve by ${fd(o.fileAndServeBy)}, opposition is due ${fd(o.oppositionDue)} and reply ${fd(o.replyDue)}.`,
    how: "Enter the motion day (return date). New Jersey civil motions are heard on Fridays in most vicinages.",
    assume: "N.J. Court Rule 1:6-3: motions are filed and served at least 16 days before the return date, opposition 8 days before, and reply 4 days before. A date landing on a weekend or court holiday is moved earlier.",
    faq: [["When are motions heard in New Jersey?", "Civil motions are generally heard on Fridays (motion days) set by each vicinage."], ["Can I file a reply in New Jersey?", "Yes, reply papers are due 4 days before the return date and may only respond to the opposition."]],
  }),
  mk({
    slug: "new-york-motion-return-date-calculator", title: "New York Motion Return Date Calculator",
    desc: "Calculate when to serve a New York motion and when answering and reply papers are due under CPLR 2214(b) — 8 or 16 days' notice, plus 5 days for mail.",
    inputs: [dateField("returnDate", "Return Date", "today+30"), dropdown("demandAnsweringPapers", "Demand Answering Papers 7 Days Early (16-day notice)?", YESNO, 1), dropdown("serviceMethod", "Service Method", [["Personal / NYSCEF", 0], ["Mail (+5 days)", 1], ["Overnight delivery (+1 day)", 2]], 0)],
    results: [["serveMotionBy", "Serve Motion By", "d"], ["answeringPapersDue", "Answering Papers Due", "d"], ["replyPapersDue", "Reply Papers Due", "d"], ["noticeDaysRequired", "Days' Notice Required", "n"]],
    fn: E.nyMotionDates, ex: { returnDate: EXR, demandAnsweringPapers: 1, serviceMethod: 0 },
    exText: (o) => `Example: with a ${fd(EXR)} return date and a demand for answering papers, serve the motion by ${fd(o.serveMotionBy)}; answering papers are due ${fd(o.answeringPapersDue)} and reply ${fd(o.replyPapersDue)}.`,
    how: "Enter the return date, whether your notice of motion demands answering papers 7 days early, and how you'll serve.",
    assume: "CPLR 2214(b): at least 8 days' notice; 16 days if answering papers are demanded 7 days before the return date, with reply papers due 1 day before. CPLR 2103(b)(2) adds 5 days for mail and 1 day for overnight delivery. Many judges' part rules change these dates.",
    faq: [["How much notice is required for a motion in New York?", "At least 8 days, or 16 days if you demand that answering papers be served 7 days before the return date."], ["Do NYSCEF filings get extra days?", "No — e-filing service through NYSCEF adds no extra days."]],
  }),
  mk({
    slug: "speedy-trial-calculator", title: "Speedy Trial Calculator",
    desc: "Calculate federal Speedy Trial Act deadlines — 30 days from arrest to indictment and 70 days to trial — with excludable delay added.",
    inputs: [dateField("arrestDate", "Arrest or Summons Date", "today-20"), numberField("excludableBeforeIndictment", "Excludable Days Before Indictment", { default: 0, max: 3650 }), dateField("indictmentOrAppearanceDate", "Indictment or First Appearance Date (whichever is later)", "today"), numberField("excludableDays", "Excludable Days (motions, continuances)", { default: 0, max: 3650 })],
    results: [["trialDeadline", "Trial Must Start By", "d"], ["indictmentDeadline", "Indictment Deadline", "d"], ["earliestTrialWithoutConsent", "Earliest Trial Without Defendant's Consent", "d"], ["daysAllowedForTrial", "Days on the Trial Clock (70 + excludable)", "n"]],
    fn: E.speedyTrial, ex: { arrestDate: dn("2026-03-02"), excludableBeforeIndictment: 0, indictmentOrAppearanceDate: dn("2026-03-25"), excludableDays: 14 },
    exText: (o) => `Example: arrested March 2, 2026 and indicted March 25 with 14 excludable days → indictment deadline ${fd(o.indictmentDeadline)}, trial must start by ${fd(o.trialDeadline)}.`,
    how: "Enter the arrest date, the indictment or first appearance date, and the days excluded under 18 U.S.C. §3161(h) — pretrial motions, continuances granted in the interests of justice, competency exams and similar delays.",
    assume: "18 U.S.C. §3161: an indictment within 30 days of arrest, and trial within 70 days of the later of the indictment or first appearance; trial can't start sooner than 30 days after first appearance without the defendant's consent. State speedy trial rules differ.",
    faq: [["What is the 70-day speedy trial rule?", "Federal trials must start within 70 non-excludable days of the indictment or first appearance, whichever is later."], ["What happens if the speedy trial deadline passes?", "The defendant can move to dismiss; the court decides whether dismissal is with or without prejudice."]],
  }),
  mk({
    slug: "statute-of-limitations-calculator", title: "Statute of Limitations Calculator",
    desc: "Calculate the last day to file a lawsuit or claim — enter the incident or discovery date, the limitation period and any tolling days.",
    inputs: [dateField("eventDate", "Date of Injury, Breach or Discovery", "today-400"), numberField("years", "Limitation Period (years)", { default: 2, max: 50 }), numberField("months", "Additional Months", { default: 0, max: 11 }), numberField("tollingDays", "Tolling Days (minority, absence, bankruptcy stay)", { default: 0, max: 20000 }), dateField("todayDate", "Today's Date")],
    results: [["filingDeadline", "Last Day to File", "d"], ["daysRemaining", "Days Remaining", "n"], ["expired", "Already Expired? (1 = yes)", "n"]],
    fn: E.statuteOfLimitations, ex: { eventDate: dn("2025-06-15"), years: 2, months: 0, tollingDays: 0, todayDate: dn("2026-10-18") },
    exText: (o) => `Example: an injury on June 15, 2025 with a 2-year limit must be filed by ${fd(o.filingDeadline)} — ${o.daysRemaining} days from October 18, 2026.`,
    how: "Look up the limitation period for your claim and state (for example 2 years for personal injury in California and Texas, 3 in New York, 2 in Florida since 2023; contracts often 4–6 years). Enter the date the clock started and any tolling.",
    assume: "The period runs to the same calendar date in the deadline year; if that's a weekend or federal holiday, it moves to the next business day. Discovery rules, minority tolling and notice-of-claim deadlines for government defendants (often 30–180 days) can change the date.",
    faq: [["What is the statute of limitations for personal injury?", "Usually 2–3 years, but it ranges from 1 year (Kentucky, Louisiana, Tennessee) to 6 years (Maine, North Dakota)."], ["When does the statute of limitations start?", "Usually on the date of the injury or breach, but the discovery rule can start it when you knew or should have known of the harm."]],
  }),
  mk({
    slug: "right-of-rescission-calculator", title: "Right of Rescission Calculator",
    desc: "Calculate the TILA 3-day right of rescission deadline for a refinance or HELOC — business days exclude Sundays and federal holidays.",
    inputs: [dateField("signingDate", "Loan Signing (Consummation) Date"), dateField("disclosuresDate", "Date Final Disclosures Delivered"), dateField("noticeOfRightDate", "Date Notice of Right to Cancel Delivered")],
    results: [["rescissionDeadline", "Rescind by Midnight on", "d"], ["loanFundsNoEarlierThan", "Loan Can Fund On", "d"], ["calendarDaysCounted", "Calendar Days in the Window", "n"]],
    fn: E.rescission, ex: { signingDate: dn("2026-11-25"), disclosuresDate: dn("2026-11-25"), noticeOfRightDate: dn("2026-11-25") },
    exText: (o) => `Example: signing on Wednesday, November 25, 2026 → Thanksgiving and Sunday don't count, so you can cancel until midnight on ${fd(o.rescissionDeadline)} and the loan funds ${fd(o.loanFundsNoEarlierThan)}.`,
    how: "Enter the closing date and the dates you received the Closing Disclosure and two copies of the Notice of Right to Cancel. The 3 days start after the last of the three.",
    assume: "Regulation Z §1026.23: three business days, counting every day except Sundays and federal public holidays (Saturdays count). If required disclosures weren't given, the right can last up to 3 years. Applies to refinances and home equity loans on a primary residence, not purchase loans.",
    faq: [["Does Saturday count for the right of rescission?", "Yes — for rescission, business days include Saturdays but exclude Sundays and federal holidays."], ["Does the right of rescission apply to a home purchase?", "No, only to refinances and home equity loans or lines secured by your principal dwelling."]],
  }),
  mk({
    slug: "california-3-day-notice-calculator", title: "California 3-Day Notice Calculator",
    desc: "Calculate the deadline on a California 3-day notice to pay rent or quit — weekends and judicial holidays don't count (CCP §1161).",
    inputs: [dateField("serviceDate", "Date the Notice Was Served")],
    results: [["lastDayToPayOrComply", "Last Day to Pay or Comply", "d"], ["earliestDayToFileUnlawfulDetainer", "Earliest Day to File Eviction", "d"], ["calendarDays", "Calendar Days Allowed", "n"]],
    fn: E.californiaThreeDayNotice, ex: { serviceDate: dn("2026-11-25") },
    exText: (o) => `Example: a notice served Wednesday, November 25, 2026 skips Thanksgiving, the day after and the weekend — the tenant has until ${fd(o.lastDayToPayOrComply)}, and the landlord can file on ${fd(o.earliestDayToFileUnlawfulDetainer)}.`,
    how: "Enter the date the notice was personally served (substituted or posted-and-mailed service may add days — see the assumptions).",
    assume: "Since AB 2343 (2019), CCP §1161 excludes Saturdays, Sundays and judicial holidays from the 3 days; counting starts the day after service. Under the COVID-era rules some notices required 15 days; substituted service and post-and-mail may be argued to need extra mailing time.",
    faq: [["Do weekends count in a California 3-day notice?", "No — Saturdays, Sundays and judicial holidays are excluded, so a 3-day notice often gives 5 or more calendar days."], ["Can a landlord refuse rent after the 3 days?", "Yes, after the notice expires a landlord may refuse partial or full payment and file an unlawful detainer."]],
  }),
  mk({
    slug: "lease-end-date-calculator", title: "Lease End Date Calculator",
    desc: "Find when a lease ends from its start date and term, plus the date you must give notice to move out or not renew.",
    inputs: [dateField("startDate", "Lease Start Date", "today-200"), numberField("termMonths", "Lease Term (months)", { default: 12, max: 600 }), numberField("extensionMonths", "Extension / Renewal Months", { default: 0, max: 600 }), numberField("noticeDays", "Notice Required (days before end)", { default: 30, max: 365 })],
    results: [["leaseEndDate", "Lease Ends On", "d"], ["noticeDeadline", "Give Notice By", "d"], ["totalDays", "Total Lease Days", "n"], ["totalMonths", "Total Months", "n"]],
    fn: E.leaseEndDate, ex: { startDate: dn("2026-03-01"), termMonths: 12, extensionMonths: 0, noticeDays: 60 },
    exText: (o) => `Example: a 12-month lease starting March 1, 2026 ends ${fd(o.leaseEndDate)}; with a 60-day notice clause, give notice by ${fd(o.noticeDeadline)}.`,
    how: "Enter the start date, term in months and the notice period in your lease.",
    assume: "A lease ends the day before the same date in the final month (a March 1 start ends the last day of February). Your lease or state law may require notice on a rent due date or in writing.",
    faq: [["When does a 12-month lease end?", "The day before the anniversary of the start date — a lease starting on the 1st ends on the last day of the month before."], ["How much notice to end a lease?", "Commonly 30 or 60 days; check the lease and your state's law for month-to-month tenancies."]],
  }),
  mk({
    slug: "csed-calculator", title: "CSED Calculator (IRS Collection Statute Expiration Date)",
    desc: "Calculate the IRS Collection Statute Expiration Date — 10 years from assessment, extended by tolling for offers, bankruptcy, CDP hearings and time abroad.",
    meta: "CSED Calculator — IRS 10-Year Collection Statute",
    inputs: [dateField("assessmentDate", "Tax Assessment Date (from your account transcript)", "today-2000"), numberField("tollingDays", "Tolling Days (OIC pending, bankruptcy + 6 months, CDP, abroad)", { default: 0, max: 20000 }), dateField("todayDate", "Today's Date")],
    results: [["collectionExpirationDate", "IRS Collection Deadline (CSED)", "d"], ["daysRemaining", "Days Remaining", "n"], ["yearsRemaining", "Years Remaining", "n"], ["expired", "Expired? (1 = yes)", "n"]],
    fn: E.csed, ex: { assessmentDate: dn("2019-05-27"), tollingDays: 180, todayDate: dn("2026-10-18") },
    exText: (o) => `Example: a balance assessed May 27, 2019 with 180 days of tolling (a pending offer) expires ${fd(o.collectionExpirationDate)} — ${o.yearsRemaining} years from now.`,
    how: "Find the assessment date on your IRS account transcript (code 150 for the original return; each later assessment has its own CSED). Add days the clock was paused.",
    assume: "IRC §6502: 10 years from assessment. Tolling: pending offer in compromise (+30 days after rejection), pending installment agreement request, CDP hearing, bankruptcy (stay period + 6 months), and continuous absence from the US for 6+ months.",
    faq: [["Does IRS debt go away after 10 years?", "Generally yes — the IRS can't collect after the CSED unless it has sued and obtained a judgment or the clock was extended."], ["What stops the IRS 10-year clock?", "Offers in compromise, bankruptcy, collection due process hearings, installment agreement requests and living abroad."]],
  }),
  mk({
    slug: "legal-age-calculator", title: "Legal Age Calculator",
    desc: "Check your exact age and when you reach the age of majority (18, or 19/21 in some states) and turn 21 — for contracts, voting, drinking and court purposes.",
    inputs: [dateField("birthDate", "Date of Birth", "today-6000"), dateField("todayDate", "As of Date"), dropdown("ageOfMajority", "Age of Majority", [["18 (most states)", 18], ["19 (Alabama, Nebraska)", 19], ["21 (Mississippi)", 21]], 18)],
    results: [["currentAge", "Current Age", "n"], ["reachesMajorityOn", "Legal Adult On", "d"], ["turns21On", "Turns 21 On", "d"], ["isAdult", "Legal Adult Now? (1 = yes)", "n"], ["ageInDays", "Age in Days", "n"]],
    fn: E.legalAge, ex: { birthDate: dn("2009-02-14"), todayDate: dn("2026-10-18"), ageOfMajority: 18 },
    exText: (o) => `Example: someone born February 14, 2009 is ${o.currentAge} on October 18, 2026, becomes a legal adult on ${fd(o.reachesMajorityOn)} and turns 21 on ${fd(o.turns21On)}.`,
    how: "Enter the birth date, the date to check, and your state's age of majority.",
    assume: "Age is counted in completed years. Age of majority is 18 in most states, 19 in Alabama and Nebraska, and 21 in Mississippi; drinking age is 21 nationwide.",
    faq: [["What is the age of majority?", "The age you become a legal adult — 18 in most US states."], ["Can a minor sign a contract?", "Most contracts signed by minors are voidable by the minor until shortly after they reach majority."]],
  }),
];

// --- Release dates -------------------------------------------------------------------------------
const SENT_IN = [dateField("startDate", "Sentence Start Date", "today-90"), numberField("sentenceYears", "Sentence — Years", { default: 2, max: 99 }), numberField("sentenceMonths", "Sentence — Months", { default: 0, max: 11 }), numberField("sentenceDays", "Sentence — Days", { default: 0, max: 365 }), numberField("jailCreditDays", "Jail Credit (days already served)", { default: 0, max: 20000 })];
const REL_RESULTS: Line[] = [["estimatedReleaseDate", "Estimated Release Date", "d"], ["fullTermDate", "Full-Term Date (no good time)", "d"], ["daysToServe", "Days Left to Serve From Start", "n"], ["percentOfSentence", "Percent of Sentence Served", "p"]];
const relEx = { startDate: dn("2026-01-05"), sentenceYears: 2, sentenceMonths: 0, sentenceDays: 0, jailCreditDays: 30 };
interface StateRel { state: string; inputs: Record<string, unknown>[]; ex: Record<string, number>; rule: string; faq: [string, string][] }
const STATE_RELS: StateRel[] = [
  { state: "Florida", inputs: [], ex: {}, rule: "Florida's truth-in-sentencing law (§944.275(4)(b)3) requires state prisoners to serve at least 85% of the sentence; gain time can't reduce it below that. County jail sentences may earn different gain time.", faq: [["Do Florida inmates serve 85%?", "Yes — offenses committed after October 1, 1995 require serving at least 85% of the sentence."]] },
  { state: "Indiana", inputs: [dropdown("creditClass", "Credit Time Class", [["Level 6 / misdemeanor — Class A (1 day per 1 served, 50%)", 0], ["Class B (1 day per 3, 75%)", 1], ["Class C — Level 1–2 / murder (1 per 6, ~85.7%)", 2], ["Class D (no credit, 100%)", 3]], 0)], ex: { creditClass: 0 }, rule: "IC 35-50-6-3.1: Class A earns one day of credit for each day served (50%), Class B one for every three (75%), Class C one for every six (~85.7%, required for Level 1 and 2 felonies and murder) and Class D none.", faq: [["How much time do you serve in Indiana?", "It depends on the credit class: 50% for Class A (most Level 6 and misdemeanor), 75% for Class B, about 85.7% for Class C."]] },
  { state: "Kentucky", inputs: [dropdown("violentOffense", "Violent Offender (KRS 439.3401)?", YESNO, 0), numberField("goodTimeDaysPerMonth", "Statutory Good Time (days per month)", { default: 10, max: 30 })], ex: { violentOffense: 0, goodTimeDaysPerMonth: 10 }, rule: "KRS 197.045: 10 days of statutory good time per month served (plus meritorious and educational credit); violent offenders must serve 85% before parole eligibility.", faq: [["How does good time work in Kentucky?", "Inmates generally earn 10 days of sentence credit for each month served, plus extra for education and meritorious work."]] },
  { state: "Ohio", inputs: [numberField("earnedCreditDays", "Earned Credit Days (programs, max 8% of term)", { default: 30, max: 3650 })], ex: { earnedCreditDays: 30 }, rule: "Ohio sentences are mostly definite; ORC 2967.193 earned credit (1–5 days per month for programs) is capped at 8% of the stated term. Reagan Tokes indefinite sentences add a maximum term and possible earned reduction not modeled here.", faq: [["Is there good time in Ohio?", "Ohio abolished traditional good time in 1996; inmates can earn limited program credit up to 8% of the term."]] },
  { state: "California", inputs: [dropdown("creditType", "Conduct Credit Type", [["Standard county jail — PC 4019 (50%)", 0], ["Violent felony — PC 2933.1 (85%)", 1], ["State prison — non-violent (~66%)", 2], ["No credits (100%)", 3]], 0)], ex: { creditType: 0 }, rule: "Penal Code §4019 gives county jail inmates 2 days of credit for every 2 days served (serve 50%); violent felonies under PC 2933.1 are limited to 15% credit (serve 85%); state prison non-violent credits under Prop 57 are roughly one-third off.", faq: [["Do California inmates serve half their time?", "Most county jail and many non-violent sentences are served at 50% with PC 4019 credits; violent felonies at 85%."]] },
  { state: "Texas", inputs: [dropdown("offenseType", "Offense / Release Type", [["Non-aggravated felony — parole eligible at 1/4 (est. 50%)", 0], ["3g / aggravated offense (parole at 1/2, est. 100% if denied)", 1], ["Parole eligibility only — 25% (non-aggravated)", 2], ["State jail felony — county jail (50% with credit)", 3]], 0)], ex: { offenseType: 0 }, rule: "Texas parole eligibility is when calendar time plus good time equals one-fourth of the sentence (Gov't Code §508.145) — 3g offenses need half in flat time; actual release often comes later. State jail felony and county jail good time vary by sheriff.", faq: [["How much time do you serve in Texas?", "Non-aggravated offenders become parole eligible at one-quarter of the sentence (with good time); 3g offenders must serve half in flat time."]] },
];
TOOLS.push(
  mk({
    slug: "jail-release-date-calculator", title: "Jail Release Date Calculator",
    desc: "Estimate an inmate's release date from the sentence, jail credit and either a percent-to-serve rule or good time earned per month.",
    meta: "Jail Release Date Calculator — Good Time & Credit",
    inputs: [...SENT_IN, percentField("percentToServe", "Percent of Sentence to Serve", { default: 50, step: 1 }), numberField("goodTimeDaysPerMonth", "Or Good Time Days per Month (0 = use percent)", { default: 0, max: 30 })],
    results: REL_RESULTS, fn: E.jailRelease, ex: { ...relEx, percentToServe: 50, goodTimeDaysPerMonth: 0 },
    exText: (o) => `Example: a 2-year sentence starting January 5, 2026, served at 50% with 30 days of jail credit, points to release around ${fd(o.estimatedReleaseDate)}.`,
    how: "Enter the sentence start date, the length of the sentence and any credit for time already served. Use the percent rule for your state or the good-time days per month.",
    assume: "Release = start + (sentence × percent served) − jail credit; with good time, days served = sentence ÷ (1 + good-time days per 30.44 days). Lost good time, detainers and program credits change the real date.",
    faq: [["How do I find an inmate's release date?", "Search the state DOC or county jail inmate locator — this calculator only estimates it."], ["What is jail credit?", "Days already spent in custody before sentencing, which are subtracted from the sentence."]],
  }),
  mk({
    slug: "federal-prison-release-date-calculator", title: "Federal Prison Release Date Calculator",
    desc: "Estimate a federal (BOP) release date with good conduct time (54 days per year), First Step Act time credits and the RDAP sentence reduction.",
    meta: "Federal Release Date Calculator — GCT, FSA & RDAP",
    inputs: [...SENT_IN, numberField("programmingDays", "Days in Eligible Programming (FSA)", { default: 365, max: 20000 }), dropdown("minimumOrLowRisk", "PATTERN Risk Level", [["Medium / high (10 days per 30)", 0], ["Minimum / low for 2 assessments (15 days per 30)", 1]], 1), dropdown("rdapCompleted", "Completed RDAP (and eligible)?", YESNO, 0), numberField("rdapReductionDays", "RDAP Reduction (days, up to 365)", { default: 365, max: 365 })],
    results: [...REL_RESULTS, ["goodConductTime", "Good Conduct Time (days)", "n"], ["firstStepActCredits", "First Step Act Credits Applied (days)", "n"], ["rdapReduction", "RDAP Reduction (days)", "n"]],
    fn: E.federalRelease, ex: { ...relEx, sentenceYears: 5, programmingDays: 730, minimumOrLowRisk: 1, rdapCompleted: 0, rdapReductionDays: 365 },
    exText: (o) => `Example: a 5-year federal sentence starting January 5, 2026 earns ${o.goodConductTime} days of good conduct time and ${o.firstStepActCredits} days of FSA credits toward release (capped at 365) — estimated release ${fd(o.estimatedReleaseDate)}.`,
    how: "Enter the sentence imposed (more than 1 year earns good conduct time), credit for presentence custody, days in eligible recidivism-reduction programming and your PATTERN risk level.",
    assume: "18 U.S.C. §3624(b): up to 54 days of good conduct time per year of the sentence imposed. First Step Act §3632(d)(4): 10 days per 30 days of programming (15 for minimum/low risk), applied to release up to 12 months; extra credits go toward prerelease custody. RDAP (§3621(e)) can cut up to 1 year for non-violent offenders.",
    faq: [["How much good time do federal inmates get?", "Up to 54 days for every year of the sentence imposed, so most serve about 85%."], ["How do First Step Act credits work?", "Eligible inmates earn 10–15 days per 30 days of programming; up to 365 days can move up release to supervised release."]],
  }),
  ...STATE_RELS.map((s) =>
    mk({
      slug: `${s.state.toLowerCase()}-jail-release-date-calculator`, title: `${s.state} Jail Release Date Calculator`,
      desc: `Estimate a ${s.state} inmate's release date from the sentence, jail credit and ${s.state}'s good time or percent-to-serve rules.`,
      meta: `${s.state} Jail Release Date Calculator — Time to Serve`,
      inputs: [...SENT_IN, ...s.inputs],
      results: REL_RESULTS, fn: E.stateRelease(s.state), ex: { ...relEx, ...s.ex },
      exText: (o) => `Example: a 2-year ${s.state} sentence starting January 5, 2026 with 30 days of jail credit → estimated release ${fd(o.estimatedReleaseDate)} (${o.percentOfSentence}% of the sentence).`,
      how: `Enter the sentence start date, length, credit for time already served${s.inputs.length ? " and the credit rule that applies" : ""}.`,
      assume: s.rule,
      faq: [...s.faq, [`How do I look up an inmate's release date in ${s.state}?`, `Use the ${s.state} Department of Corrections offender search or the county jail's inmate lookup.`]],
    }),
  ),
);

// --- Sentencing ----------------------------------------------------------------------------------
TOOLS.push(
  mk({
    slug: "federal-sentencing-guidelines-calculator", title: "Federal Sentencing Guidelines Calculator",
    desc: "Find the USSG guideline range in months — base offense level, adjustments, acceptance of responsibility and criminal history points (Nov 1, 2025 table).",
    meta: "Federal Sentencing Guidelines Calculator — USSG Range",
    inputs: [numberField("baseOffenseLevel", "Base Offense Level (Chapter 2)", { default: 20, min: 1, max: 43 }), numberField("specificOffenseAdjustments", "Specific Offense Characteristics (+/−)", { default: 0, min: -20, max: 40 }), numberField("adjustments", "Chapter 3 Adjustments (role, obstruction, victim)", { default: 0, min: -10, max: 20 }), dropdown("acceptanceOfResponsibility", "Acceptance of Responsibility", [["None", 0], ["−2 levels", 1], ["−3 levels (level 16+ and timely plea)", 2]], 2), numberField("criminalHistoryPoints", "Criminal History Points", { default: 2, max: 40 })],
    results: [["guidelineMinimumMonths", "Guideline Range — Minimum (months)", "n"], ["guidelineMaximumMonths", "Guideline Range — Maximum (months, 0 = life)", "n"], ["totalOffenseLevel", "Total Offense Level", "n"], ["criminalHistoryCategory", "Criminal History Category (1–6)", "n"], ["zone", "Sentencing Zone (1 = A … 4 = D)", "n"], ["lifeAtTop", "Life at Top of Range? (1 = yes)", "n"]],
    fn: E.federalSentencing, ex: { baseOffenseLevel: 24, specificOffenseAdjustments: 2, adjustments: 0, acceptanceOfResponsibility: 2, criminalHistoryPoints: 3 },
    exText: (o) => `Example: base level 24 with a +2 specific offense characteristic and −3 for acceptance gives total offense level ${o.totalOffenseLevel}; 3 criminal history points is category II, so the range is ${o.guidelineMinimumMonths}–${o.guidelineMaximumMonths} months (Zone D).`,
    how: "Start with the base offense level for the guideline that covers the offense, add specific offense characteristics and Chapter 3 adjustments, then choose acceptance of responsibility. Add up criminal history points from Chapter 4.",
    assume: "Sentencing Table, Guidelines Manual effective November 1, 2025. Criminal history category: 0–1 points = I, 2–3 = II, 4–6 = III, 7–9 = IV, 10–12 = V, 13+ = VI. Zone A = 0–6 months; B = minimum 1–9; C = minimum 10–12; D = minimum 15+. Statutory minimums and maximums override the range, and the guidelines are advisory after Booker.",
    faq: [["How are federal sentencing guidelines calculated?", "The total offense level and criminal history category intersect on the Sentencing Table to give a range in months."], ["Are federal sentencing guidelines mandatory?", "No — since United States v. Booker (2005) they're advisory, but judges must calculate and consider them."]],
  }),
  mk({
    slug: "florida-scoresheet-calculator", title: "Florida Scoresheet Calculator",
    desc: "Score a Florida Criminal Punishment Code scoresheet — total sentence points and the lowest permissible prison sentence ((points − 28) × 0.75 months).",
    inputs: [numberField("primaryOffensePoints", "Primary Offense Points (by offense level)", { default: 56, max: 200 }), numberField("additionalOffensePoints", "Additional Offense Points", { default: 0, max: 500 }), numberField("victimInjuryPoints", "Victim Injury Points", { default: 0, max: 500 }), numberField("priorRecordPoints", "Prior Record Points", { default: 10, max: 500 }), numberField("otherPoints", "Other (legal status, violations, enhancements)", { default: 0, max: 500 }), numberField("multiplier", "Multiplier (gang, domestic violence etc., 1 = none)", { default: 1, min: 1, max: 2, step: 0.1 }), dropdown("primaryDegree", "Primary Offense Degree", [["Third degree (max 5 years)", 0], ["Second degree (max 15 years)", 1], ["First degree (max 30 years)", 2], ["Life felony", 3]], 1)],
    results: [["lowestPermissibleSentenceMonths", "Lowest Permissible Sentence (months)", "n"], ["lowestPermissibleYears", "Lowest Permissible Sentence (years)", "n"], ["totalSentencePoints", "Total Sentence Points", "n"], ["prisonRequired", "Prison Required? (1 = over 44 points)", "n"], ["statutoryMaximumMonths", "Statutory Maximum (months, 0 = life)", "n"]],
    fn: E.floridaScoresheet, ex: { primaryOffensePoints: 56, additionalOffensePoints: 0, victimInjuryPoints: 0, priorRecordPoints: 10, otherPoints: 0, multiplier: 1, primaryDegree: 1 },
    exText: (o) => `Example: a level 7 primary offense (56 points) plus 10 prior record points totals ${o.totalSentencePoints} points → lowest permissible sentence ${o.lowestPermissibleSentenceMonths} months (${o.lowestPermissibleYears} years) in state prison.`,
    how: "Enter the points from each section of the scoresheet: the primary offense (level 1 = 4 points up to level 10 = 116), additional offenses, victim injury, prior record and other enhancements.",
    assume: "§921.0024: if total sentence points exceed 44, the lowest permissible sentence is (points − 28) × 0.75 months; at 44 or below a non-prison sanction is permitted. The judge may sentence up to the statutory maximum or depart downward for listed mitigators.",
    faq: [["What is the lowest permissible sentence in Florida?", "Total sentence points minus 28, times 0.75, in months — when the score is over 44 points."], ["What happens if I score under 44 points in Florida?", "The lowest permissible sentence is a non-state-prison sanction, like probation or county jail."]],
  }),
  mk({
    slug: "indiana-sentencing-calculator", title: "Indiana Sentencing Calculator",
    desc: "See Indiana felony sentencing ranges and advisory sentences by level (IC 35-50-2), the habitual offender enhancement and the estimated time served with credit.",
    inputs: [dropdown("offenseLevel", "Offense Level", E.INDIANA_LEVELS.map(([l, mn, mx, a], i) => [`${l} (${mn}–${mx} years, advisory ${a})`, i] as [string, number]), 4), numberField("sentenceYears", "Sentence Imposed (years, 0 = advisory)", { default: 0, max: 100, step: 0.5 }), dropdown("habitualOffender", "Habitual Offender Enhancement?", YESNO, 0), dropdown("creditClass", "Credit Class", [["Class A (50%)", 0], ["Class B (75%)", 1], ["Class C (~85.7%)", 2], ["Class D (100%)", 3]], 0)],
    results: [["estimatedYearsToServe", "Estimated Years to Serve", "n"], ["sentenceYears", "Total Sentence (years)", "n"], ["advisoryYears", "Advisory Sentence (years)", "n"], ["minimumYears", "Minimum (years)", "n"], ["maximumYears", "Maximum (years)", "n"]],
    fn: E.indianaSentencing, ex: { offenseLevel: 4, sentenceYears: 0, habitualOffender: 0, creditClass: 0 },
    exText: (o) => `Example: a Level 4 felony carries 2–12 years with a ${o.advisoryYears}-year advisory sentence; at Class A credit that's about ${o.estimatedYearsToServe} years served.`,
    how: "Pick the felony level, the sentence imposed (or leave 0 for the advisory sentence), whether the habitual offender enhancement applies and the credit class.",
    assume: "IC 35-50-2-3 to -7 ranges; habitual offender enhancement 6–20 years for Level 1–4 (10 used for Levels 1–2, 6 for 3–5 here) and 2–6 years for Level 5–6 (2 used). Level 1 and 2 felonies and murder are Class C credit (serve ~85%) for crimes after July 1, 2014.",
    faq: [["What is the sentence for a Level 6 felony in Indiana?", "6 months to 2½ years, with a 1-year advisory sentence; it may be entered as a misdemeanor in some cases."], ["What is an advisory sentence in Indiana?", "The guideline sentence the court starts from before weighing aggravating and mitigating factors."]],
  }),
  mk({
    slug: "missouri-sentencing-calculator", title: "Missouri Sentencing Calculator",
    desc: "See Missouri felony sentence ranges by class and when parole eligibility starts under the minimum prison term rules (§558.019) — 40%, 50%, 80% or 85%.",
    inputs: [dropdown("felonyClass", "Felony Class", E.MISSOURI_CLASSES.map(([l], i) => [l, i] as [string, number]), 3), numberField("sentenceYears", "Sentence Imposed (years, 0 = midpoint)", { default: 4, max: 99, step: 0.5 }), numberField("priorPrisonCommitments", "Prior Prison Commitments", { default: 0, max: 10 }), dropdown("dangerousFelony", "Dangerous Felony (§556.061)?", YESNO, 0)],
    results: [["yearsBeforeParoleEligibility", "Years Before Parole Eligibility", "n"], ["minimumPrisonTermPercent", "Minimum Prison Term (%)", "p"], ["sentenceYears", "Sentence (years)", "n"], ["minimumYears", "Class Minimum (years)", "n"], ["maximumYears", "Class Maximum (years)", "n"]],
    fn: E.missouriSentencing, ex: { felonyClass: 2, sentenceYears: 7, priorPrisonCommitments: 1, dangerousFelony: 0 },
    exText: (o) => `Example: a 7-year Class C sentence with one prior prison commitment must serve ${o.minimumPrisonTermPercent}% — about ${o.yearsBeforeParoleEligibility} years before parole eligibility.`,
    how: "Choose the felony class and sentence, then the number of previous prison commitments and whether the offense is a dangerous felony.",
    assume: "§558.011 ranges: A 10–30 years or life, B 5–15, C 3–10, D up to 7, E up to 4. §558.019: one prior commitment = 40% minimum, two = 50%, three or more = 80%; dangerous felonies 85%. First-time offenders without priors have no statutory minimum percent (parole board decides).",
    faq: [["How much time do you serve on a Missouri sentence?", "It depends on prior prison commitments — 40%, 50% or 80% — and 85% for dangerous felonies."], ["What is a Class D felony in Missouri?", "A felony punishable by up to 7 years in prison."]],
  }),
);

// --- Bankruptcy ----------------------------------------------------------------------------------
const STATE_OPTS = E.MEANS_MEDIANS.map(([s], i) => [s, i] as [string, number]);
const MEANS_RESULTS: Line[] = [["passesMeansTest", "Qualifies for Chapter 7? (1 = yes)", "n"], ["belowStateMedian", "Below State Median? (1 = yes)", "n"], ["annualizedIncome", "Your Annualized Income", "c"], ["stateMedianIncome", "State Median Income for Household", "c"], ["monthlyDisposableIncome", "Monthly Disposable Income", "c"], ["sixtyMonthDisposableIncome", "60-Month Disposable Income", "c"]];
const meansInputs = (state: boolean) => [
  ...(state ? [dropdown("state", "State", STATE_OPTS, STATE_OPTS.findIndex(([s]) => s === "California"))] : []),
  numberField("householdSize", "Household Size", { default: 3, min: 1, max: 15 }),
  currencyField("currentMonthlyIncome", "Average Monthly Income (last 6 months, gross)", { default: 6500, max: 1000000, step: 50 }),
  currencyField("allowedMonthlyExpenses", "Allowed Monthly Expenses (IRS standards, taxes)", { default: 5200, max: 1000000, step: 50 }),
  currencyField("securedDebtPayments", "Secured Debt Payments (monthly avg)", { default: 900, max: 1000000, step: 50 }),
  currencyField("priorityDebtPayments", "Priority Debt Payments (monthly avg)", { default: 0, max: 1000000, step: 50 }),
  currencyField("unsecuredDebt", "Total Unsecured Debt", { default: 40000, max: 100000000, step: 500 }),
];
const MEANS_STATES = ["Texas", "Florida", "California", "Ohio", "Illinois", "Tennessee"];
const meansEx = { state: STATE_OPTS.findIndex(([s]) => s === "California"), householdSize: 3, currentMonthlyIncome: 6500, allowedMonthlyExpenses: 5200, securedDebtPayments: 900, priorityDebtPayments: 0, unsecuredDebt: 40000 };
const meansTool = (state?: string): ToolDef => {
  const idx = state ? STATE_OPTS.findIndex(([s]) => s === state) : undefined;
  const fn = E.meansTest(idx);
  const med3 = E.meansMedian(idx ?? meansEx.state, 3);
  return mk({
    slug: state ? `${state.toLowerCase()}-bankruptcy-means-test-calculator` : "bankruptcy-means-test-calculator",
    title: `${state ? `${state} ` : ""}Bankruptcy Means Test Calculator`,
    desc: `Check if you qualify for Chapter 7 bankruptcy${state ? ` in ${state}` : ""} — compare your income with the ${state ?? "state"} median for your household size, then test disposable income over 60 months.`,
    meta: `${state ? `${state} ` : ""}Means Test Calculator — Chapter 7 Eligibility 2026`,
    inputs: meansInputs(!state),
    results: MEANS_RESULTS, fn, ex: meansEx,
    exText: (o) => `Example: a household of 3 averaging ${usd(6500)} a month (${usd(78000)} a year) against the ${state ?? "California"} median of ${usd(med3)} is ${o.belowStateMedian ? "below the median and qualifies for Chapter 7 without the full test" : `above the median; disposable income of ${usd(o.monthlyDisposableIncome)} a month (${usd(o.sixtyMonthDisposableIncome)} over 60 months) ${o.passesMeansTest ? "still passes" : "raises the presumption of abuse"}`}.`,
    how: "Average your gross household income over the 6 full months before filing (Form 122A-1). If you're above the median, enter the expenses allowed on Form 122A-2 (IRS national and local standards, taxes, insurance) and your secured and priority debt payments.",
    assume: `Census median family income for cases filed on or after July 15, 2026${state ? ` (${state}: 1 person ${usd(E.meansMedian(idx!, 1))}, 2 people ${usd(E.meansMedian(idx!, 2))}, 3 people ${usd(E.meansMedian(idx!, 3))}, 4 people ${usd(E.meansMedian(idx!, 4))})` : ""}, plus $11,100 for each person over 4. Above the median, abuse is presumed if 60 months of disposable income is $17,150 or more, or at least $10,275 and 25% of unsecured debt. Disabled veterans and mostly business debt are exempt.`,
    faq: [[`What is the median income for bankruptcy${state ? ` in ${state}` : ""}?`, state ? `For a household of 3 in ${state} it's ${usd(E.meansMedian(idx!, 3))} for cases filed on or after July 15, 2026.` : "It depends on your state and household size; the US Trustee updates the figures periodically (most recently for cases filed on or after July 15, 2026)."], ["What if I fail the means test?", "You may still qualify after deducting allowed expenses, or file Chapter 13 and repay part of your debts over 3–5 years."]],
  });
};
TOOLS.push(
  meansTool(),
  ...MEANS_STATES.map(meansTool),
  mk({
    slug: "chapter-13-payment-calculator", title: "Chapter 13 Payment Calculator",
    desc: "Estimate your Chapter 13 bankruptcy plan payment — disposable income, priority debts, secured arrears, the liquidation test and the trustee fee.",
    inputs: [currencyField("monthlyDisposableIncome", "Monthly Disposable Income (Form 122C-2)", { default: 400, max: 100000, step: 10 }), numberField("planMonths", "Plan Length (months)", { default: 60, min: 36, max: 60 }), currencyField("priorityDebts", "Priority Debts (taxes, support arrears)", { default: 8000, max: 10000000, step: 100 }), currencyField("securedArrears", "Secured Arrears Paid Through Plan (mortgage, car)", { default: 6000, max: 10000000, step: 100 }), currencyField("nonExemptAssetValue", "Non-Exempt Assets (liquidation value)", { default: 0, max: 10000000, step: 100 }), percentField("trusteeFeePercent", "Trustee Fee", { default: 10, max: 10, step: 0.5 })],
    results: [["monthlyPlanPayment", "Monthly Plan Payment", "c"], ["totalPlanPayments", "Total Plan Payments", "c"], ["trusteeFees", "Trustee Fees", "c"], ["toUnsecuredCreditors", "Paid to Unsecured Creditors", "c"]],
    fn: E.chapter13, ex: { monthlyDisposableIncome: 400, planMonths: 60, priorityDebts: 8000, securedArrears: 6000, nonExemptAssetValue: 0, trusteeFeePercent: 10 },
    exText: (o) => `Example: ${usd(400)} a month of disposable income over 60 months, with ${usd(8000)} of priority taxes and ${usd(6000)} of mortgage arrears, means a plan payment of about ${usd(o.monthlyPlanPayment)} including the trustee's fee.`,
    how: "Enter disposable income from the means test, plan length (36 months if below median, 60 if above), debts that must be paid in full, and the value of non-exempt property (unsecured creditors must get at least that much).",
    assume: "The plan must pay the greater of all disposable income over the commitment period or the liquidation value, and in full any priority claims and arrears paid through the plan. The trustee fee (up to 10%) is added on top. Ongoing mortgage payments made inside the plan, attorney fees and interest on secured claims aren't included.",
    faq: [["How is a Chapter 13 payment calculated?", "From your disposable income, debts that must be paid in full, the value of non-exempt property and the trustee's percentage fee."], ["How long is a Chapter 13 plan?", "3 years if your income is below the state median, 5 years if above."]],
  }),
  mk({
    slug: "consumer-proposal-calculator", title: "Consumer Proposal Calculator",
    desc: "Estimate a Canadian consumer proposal payment — offer a percentage of your unsecured debt, paid over up to 60 months, and see how much is forgiven.",
    inputs: [currencyField("unsecuredDebt", "Total Unsecured Debt (CAD)", { default: 45000, max: 10000000, step: 500 }), percentField("offerPercent", "Proposal Offer (% of debt)", { default: 30, step: 1 }), numberField("months", "Payment Term (months, max 60)", { default: 60, min: 1, max: 60 }), currencyField("surplusIncomeBankruptcyMonthly", "Bankruptcy Surplus Income Payment (for comparison)", { default: 0, max: 100000, step: 10 })],
    results: [["monthlyPayment", "Monthly Proposal Payment", "c"], ["totalRepaid", "Total Repaid", "c"], ["debtForgiven", "Debt Forgiven", "c"], ["bankruptcyComparisonMonthly", "Bankruptcy Surplus Income Payment", "c"]],
    fn: E.consumerProposal, ex: { unsecuredDebt: 45000, offerPercent: 30, months: 60, surplusIncomeBankruptcyMonthly: 0 },
    exText: (o) => `Example: offering 30% of $45,000 over 60 months means about ${usd(o.monthlyPayment)} a month, with ${usd(o.debtForgiven)} forgiven.`,
    how: "Enter your unsecured debts, the percentage you expect creditors to accept (often 25–40%, based on what they'd get in bankruptcy) and the term.",
    assume: "Under the Bankruptcy and Insolvency Act, a consumer proposal covers up to $250,000 of debt (excluding a home mortgage), lasts up to 5 years, and needs creditors holding a majority of the debt to accept. Trustee fees are paid from your payments.",
    faq: [["How much do you pay in a consumer proposal?", "Usually 25–40% of unsecured debt, but it must give creditors more than they'd receive in bankruptcy."], ["Is a consumer proposal better than bankruptcy?", "It lets you keep assets and avoid surplus income payments, but you repay more than in a simple bankruptcy."]],
  }),
);

// --- Interest ------------------------------------------------------------------------------------
const JI_RESULTS: Line[] = [["totalInterest", "Total Judgment Interest", "c"], ["payoffAmount", "Payoff Amount (judgment + interest − payments)", "c"], ["dailyInterest", "Daily Interest", "c"], ["daysOfInterest", "Days of Interest", "n"]];
interface JiSpec { slug: string; title: string; who: string; rate?: number; defRate: number; rule: string; faq: [string, string][] }
const JIS: JiSpec[] = [
  { slug: "judgment-interest-calculator", title: "Judgment Interest Calculator", who: "any court judgment", defRate: 6, rule: "Simple interest = judgment × rate × days ÷ 365. Federal post-judgment interest uses the weekly 1-year Treasury yield for the week before judgment (28 U.S.C. §1961), compounded annually; state rates vary from fixed statutory rates to floating rates tied to the prime or Treasury rate.", faq: [["How is judgment interest calculated?", "Usually as simple interest — the judgment amount × the annual rate × days elapsed ÷ 365 — at the rate set by statute."], ["What is pre-judgment interest?", "Interest on damages from the date of loss until judgment, allowed for some claims (often contract or liquidated damages)."]] },
  { slug: "california-judgment-interest-calculator", title: "California Judgment Interest Calculator", who: "a California state court judgment", rate: 10, defRate: 10, rule: "CCP §685.010: 10% simple interest per year on the principal amount of a money judgment (5% for certain unpaid consumer debt judgments under $200,000 after 2023, and the federal rate applies to federal judgments).", faq: [["What is the interest rate on a California judgment?", "10% per year, simple interest, from entry of judgment."], ["Does California judgment interest compound?", "No — it's simple interest on the principal, though costs and interest can be added when the judgment is renewed."]] },
  { slug: "new-york-judgment-interest-calculator", title: "New York Judgment Interest Calculator", who: "a New York judgment (CPLR 5004)", rate: 9, defRate: 9, rule: "CPLR 5004: 9% per year simple interest (2% for consumer debt judgments since 2022, and lower rates for some public entities). Prejudgment interest on contract claims also runs at 9% under CPLR 5001.", faq: [["What is the statutory interest rate in New York?", "9% per year on judgments and most prejudgment interest."], ["Is the NY consumer debt judgment rate different?", "Yes — since April 2022, consumer debt judgments accrue at 2%."]] },
  { slug: "north-carolina-judgment-interest-calculator", title: "North Carolina Judgment Interest Calculator", who: "a North Carolina judgment", rate: 8, defRate: 8, rule: "N.C.G.S. 24-1 and 24-5: the legal rate is 8% per year; contract judgments carry the contract rate if specified.", faq: [["What is the legal interest rate in North Carolina?", "8% per year."], ["Does interest run before judgment in North Carolina?", "Yes, in contract cases from the breach date and in non-contract cases from the filing date."]] },
  { slug: "florida-judgment-interest-calculator", title: "Florida Judgment Interest Calculator", who: "a Florida judgment", defRate: 9.09, rule: "§55.03: the CFO sets the rate each quarter (averaging the discount rate + 4%); the rate in effect on the judgment date applies for the first year, then resets each January 1. Enter the current published rate.", faq: [["What is the Florida judgment interest rate?", "It's set quarterly by Florida's Chief Financial Officer — check the CFO's website for the current rate."], ["Does the Florida rate change after judgment?", "It's fixed for the first calendar year, then adjusts every January 1 to the new rate."]] },
  { slug: "texas-judgment-interest-calculator", title: "Texas Judgment Interest Calculator", who: "a Texas judgment", defRate: 7.5, rule: "Texas Finance Code §304.003: post-judgment interest equals the prime rate published by the Consumer Credit Commissioner, with a floor of 5% and a ceiling of 15% (contract rate if lower). Prejudgment interest in injury cases uses the same rate.", faq: [["What is the Texas post-judgment interest rate?", "The prime rate set monthly by the Texas Consumer Credit Commissioner, between 5% and 15%."], ["Does Texas judgment interest compound?", "Yes — post-judgment interest compounds annually under Finance Code §304.006."]] },
  { slug: "louisiana-judicial-interest-calculator", title: "Louisiana Judicial Interest Calculator", who: "a Louisiana judgment (judicial interest)", defRate: 7.25, rule: "La. R.S. 13:4202: judicial interest is reset each January 1 by the Commissioner of Financial Institutions (Federal Reserve discount rate + 3.25%) and runs from the date of judicial demand in tort cases.", faq: [["What is the Louisiana judicial interest rate?", "It's set annually — the discount rate on January 1 plus 3.25%."], ["When does judicial interest start in Louisiana?", "In tort cases, from the date the lawsuit was filed (judicial demand)."]] },
];
TOOLS.push(
  ...JIS.map((j) =>
    mk({
      slug: j.slug, title: j.title,
      desc: `Calculate interest on ${j.who} — ${j.rate ? `${j.rate}% simple interest` : "enter the current rate"} from the judgment date to payoff, with daily interest and the payoff amount.`,
      inputs: [currencyField("judgmentAmount", "Judgment Amount", { default: 50000, max: 100000000, step: 100 }), ...(j.rate ? [] : [percentField("annualRatePercent", "Annual Interest Rate", { default: j.defRate, max: 30, step: 0.01 })]), dateField("judgmentDate", "Judgment Date", "today-365"), dateField("payoffDate", "Payoff Date"), currencyField("paymentsMade", "Payments Already Made", { default: 0, max: 100000000, step: 100 }), dropdown("compound", "Interest Method", [["Simple", 0], ["Compounded monthly", 1]], 0)],
      results: JI_RESULTS, fn: E.judgmentInterest(j.rate), ex: { judgmentAmount: 50000, annualRatePercent: j.defRate, judgmentDate: dn("2025-03-01"), payoffDate: dn("2026-10-01"), paymentsMade: 0, compound: 0 },
      exText: (o) => `Example: a ${usd(50000)} judgment entered March 1, 2025 at ${j.defRate}% accrues ${usd(o.dailyInterest)} a day — ${usd(o.totalInterest)} by October 1, 2026, for a payoff of ${usd(o.payoffAmount)}.`,
      how: "Enter the judgment amount, dates and any payments. Interest stops accruing when the judgment is fully paid.",
      assume: j.rule,
      faq: j.faq,
    }),
  ),
  mk({
    slug: "prompt-payment-interest-calculator", title: "Prompt Payment Interest Calculator",
    desc: "Calculate Prompt Payment Act interest on a late federal invoice (and Contract Disputes Act interest) at the Treasury rate, compounded every 30 days.",
    inputs: [currencyField("invoiceAmount", "Invoice Amount", { default: 100000, max: 1000000000, step: 100 }), dateField("dueDate", "Payment Due Date", "today-60"), dateField("paymentDate", "Payment Date"), percentField("treasuryRatePercent", "Prompt Payment / CDA Rate", { default: 4.625, max: 20, step: 0.125 })],
    results: [["latePaymentInterest", "Late Payment Interest", "c"], ["daysLate", "Days Late", "n"], ["totalDue", "Total Due", "c"]],
    fn: E.promptPayment, ex: { invoiceAmount: 100000, dueDate: dn("2026-06-01"), paymentDate: dn("2026-08-30"), treasuryRatePercent: 4.625 },
    exText: (o) => `Example: a ${usd(100000)} invoice paid ${o.daysLate} days late at 4.625% earns ${usd(o.latePaymentInterest)} of interest.`,
    how: "Enter the invoice amount, the due date (usually 30 days after a proper invoice) and when it was paid, plus the Treasury rate in effect (published every January 1 and July 1).",
    assume: "31 U.S.C. §3902 and 5 CFR 1315.10: interest accrues from the day after the due date at the Treasury-set rate and compounds every 30 days; the same semiannual rate applies to Contract Disputes Act claims. Interest under $1 isn't paid.",
    faq: [["What is the Prompt Payment Act interest rate?", "The Treasury sets it every six months (January 1 and July 1) — check the Bureau of the Fiscal Service."], ["When is a federal invoice late?", "Generally 30 days after the government receives a proper invoice or accepts the goods or services, whichever is later."]],
  }),
  mk({
    slug: "uk-late-payment-interest-calculator", title: "UK Late Payment Interest Calculator",
    desc: "Calculate statutory interest on a late B2B invoice in the UK — 8% plus the Bank of England base rate — and the fixed £40, £70 or £100 compensation.",
    inputs: [currencyField("debtAmount", "Invoice Amount (£)", { default: 5000, max: 100000000, step: 10 }), percentField("bankOfEnglandBaseRatePercent", "Bank of England Base Rate", { default: 4, max: 20, step: 0.25 }), dateField("dueDate", "Payment Due Date", "today-90"), dateField("paymentDate", "Payment / Calculation Date")],
    results: [["totalClaim", "Total Claim (£)", "c"], ["statutoryInterest", "Statutory Interest (£)", "c"], ["fixedCompensation", "Fixed Compensation (£)", "c"], ["dailyInterest", "Daily Interest (£)", "c"], ["rateUsed", "Interest Rate (%)", "p"]],
    fn: E.ukLatePayment, ex: { debtAmount: 5000, bankOfEnglandBaseRatePercent: 4, dueDate: dn("2026-06-30"), paymentDate: dn("2026-09-28") },
    exText: (o) => `Example: a £5,000 invoice paid 90 days late at 12% (8% + 4% base rate) earns ${usd(o.statutoryInterest).replace("$", "£")} of interest plus £${o.fixedCompensation} compensation — ${usd(o.totalClaim).replace("$", "£")} in total.`,
    how: "Enter the invoice amount, the base rate on the reference date (31 December or 30 June before the debt became late) and the dates.",
    assume: "Late Payment of Commercial Debts (Interest) Act 1998: simple interest at 8% over the reference base rate, plus fixed compensation of £40 (under £1,000), £70 (£1,000–£9,999.99) or £100 (£10,000+). Business-to-business only.",
    faq: [["Can I charge interest on late payments in the UK?", "Yes — for business-to-business debts you can claim 8% plus the base rate unless your contract sets a substantial alternative."], ["What is the late payment compensation in the UK?", "£40, £70 or £100 per invoice depending on the amount owed."]],
  }),
);

// --- Bail & legal fees -----------------------------------------------------------------------------
const BAIL_RESULTS: Line[] = [["bondPremium", "Bond Premium (non-refundable)", "c"], ["nonRefundableCost", "Total Non-Refundable Cost", "c"], ["collateralMayBeRequired", "Balance Collateral May Secure", "c"], ["premiumPercent", "Effective Premium Rate", "p"]];
TOOLS.push(
  mk({
    slug: "bail-bond-calculator", title: "Bail Bond Calculator",
    desc: "Estimate what a bail bond costs — the bondsman's premium (usually 10%), minimum fees and the collateral that may secure the rest of the bail.",
    inputs: [currencyField("bailAmount", "Bail Amount", { default: 25000, max: 100000000, step: 500 }), percentField("premiumPercent", "Premium Rate (10% CA/FL/TX typical; 15% some states)", { default: 10, max: 25, step: 0.5 }), currencyField("minimumPremium", "Minimum Premium", { default: 100, max: 10000, step: 10 }), currencyField("otherFees", "Other Fees (filing, travel, monitoring)", { default: 0, max: 100000, step: 10 })],
    results: BAIL_RESULTS, fn: E.bailBond(), ex: { bailAmount: 25000, premiumPercent: 10, minimumPremium: 100, otherFees: 0 },
    exText: (o) => `Example: ${usd(25000)} bail at 10% costs ${usd(o.bondPremium)} that you won't get back; the bondsman may require collateral for the other ${usd(o.collateralMayBeRequired)}.`,
    how: "Enter the bail set by the court and your state's premium rate. California and Texas are commonly 10% (8% with discounts), Florida 10% with a $100 minimum, Nevada 15%.",
    assume: "Premiums are set or filed with state insurance regulators; Illinois, Kentucky, Oregon and Wisconsin don't allow commercial bail. Paying full cash bail to the court is refundable (less fees) if the defendant appears.",
    faq: [["How much does a bail bond cost?", "Typically 10% of the bail amount, which is a non-refundable fee to the bondsman."], ["Do you get bail bond money back?", "Not the premium. Cash bail paid directly to the court is returned after the case if the defendant makes all appearances."]],
  }),
  mk({
    slug: "louisiana-bail-bond-calculator", title: "Louisiana Bail Bond Calculator",
    desc: "Estimate Louisiana bail bond costs — the 12% premium (10% bondsman plus 2% state fees) on a commercial surety bond.",
    inputs: [currencyField("bailAmount", "Bail Amount", { default: 25000, max: 100000000, step: 500 }), currencyField("otherFees", "Other Fees", { default: 0, max: 100000, step: 10 })],
    results: BAIL_RESULTS, fn: E.bailBond("LA"), ex: { bailAmount: 25000, otherFees: 0 },
    exText: (o) => `Example: a ${usd(25000)} Louisiana bond costs about ${usd(o.bondPremium)} (12%).`,
    how: "Enter the bail amount set by the judge.",
    assume: "Louisiana bail premiums are 12% of the bond (La. R.S. 22:822 sets the premium up to 12%, including fees to the sheriff, court and district attorney). Parish fees can add a little.",
    faq: [["How much is a bail bond in Louisiana?", "Generally 12% of the bail amount."], ["Can I pay a Louisiana bail bond in installments?", "Many bondsmen offer payment plans, but the full premium is still owed."]],
  }),
  mk({
    slug: "connecticut-bail-bond-calculator", title: "Connecticut Bail Bond Calculator",
    desc: "Estimate Connecticut surety bail bond premiums — 10% of the first $5,000 and 7% of the balance (Conn. regulations).",
    inputs: [currencyField("bailAmount", "Bail Amount", { default: 20000, max: 100000000, step: 500 }), currencyField("otherFees", "Other Fees", { default: 0, max: 100000, step: 10 })],
    results: BAIL_RESULTS, fn: E.bailBond("CT"), ex: { bailAmount: 20000, otherFees: 0 },
    exText: (o) => `Example: a ${usd(20000)} bond costs ${usd(500)} on the first $5,000 plus ${usd(1050)} on the rest — ${usd(o.bondPremium)} in total.`,
    how: "Enter the bail amount set by the court.",
    assume: "Connecticut's maximum surety premium: 10% of the first $5,000 and 7% of any amount over $5,000; discounts below the filed rate aren't allowed.",
    faq: [["How much is a bail bond in Connecticut?", "10% of the first $5,000 plus 7% of anything above it."], ["Does Connecticut allow cash bail?", "Yes, and it's refundable after the case if all conditions are met."]],
  }),
  mk({
    slug: "expert-witness-fee-calculator", title: "Expert Witness Fee Calculator",
    desc: "Budget expert witness costs — case review and report hours, deposition time, trial days, travel and how far a retainer goes.",
    inputs: [currencyField("hourlyRate", "Hourly Rate (review / report)", { default: 450, max: 5000, step: 25 }), numberField("reviewHours", "Review & Report Hours", { default: 20, max: 2000 }), currencyField("depositionRate", "Deposition Hourly Rate (0 = same)", { default: 600, max: 5000, step: 25 }), numberField("depositionHours", "Deposition Hours", { default: 4, max: 200 }), currencyField("dailyTrialRate", "Trial Day Rate", { default: 5000, max: 50000, step: 100 }), numberField("trialDays", "Trial Days", { default: 1, max: 60 }), currencyField("travelExpenses", "Travel Expenses", { default: 800, max: 100000, step: 50 }), currencyField("retainer", "Retainer Paid", { default: 5000, max: 1000000, step: 100 })],
    results: [["totalExpertCost", "Total Expert Cost", "c"], ["reviewAndReport", "Review & Report", "c"], ["depositionFees", "Deposition", "c"], ["trialFees", "Trial Testimony", "c"], ["retainerCoverage", "Balance Beyond Retainer", "c"]],
    fn: E.expertWitness, ex: { hourlyRate: 450, reviewHours: 20, depositionRate: 600, depositionHours: 4, dailyTrialRate: 5000, trialDays: 1, travelExpenses: 800, retainer: 5000 },
    exText: (o) => `Example: 20 review hours at ${usd(450)}, a 4-hour deposition at ${usd(600)} and one trial day at ${usd(5000)} plus travel total ${usd(o.totalExpertCost)}.`,
    how: "Enter the expert's fee schedule and your estimate of hours for each phase.",
    assume: "Medical and engineering experts commonly charge $300–$800 an hour, often more for depositions and a daily trial rate. Under FRCP 26(b)(4)(E) the party taking a deposition usually pays the opposing expert's reasonable fee for that time.",
    faq: [["How much do expert witnesses charge?", "Typically $200–$800 an hour, with medical specialists at the top end; trial days often cost $3,000–$10,000."], ["Who pays for an expert's deposition?", "In federal court, the side that takes the deposition usually pays the expert's reasonable fee for the time."]],
  }),
  mk({
    slug: "arbitration-cost-calculator", title: "Arbitration Cost Calculator",
    desc: "Estimate arbitration costs — filing fees, arbitrator compensation and hearing costs — and your share for consumer or commercial cases.",
    inputs: [dropdown("caseType", "Case Type", [["Consumer / employment (AAA consumer fee $225)", 0], ["Commercial", 1]], 1), currencyField("filingFee", "Filing Fee (commercial)", { default: 925, max: 100000, step: 25 }), currencyField("arbitratorHourlyRate", "Arbitrator Hourly Rate", { default: 450, max: 3000, step: 25 }), numberField("hearingAndStudyHours", "Arbitrator Hours (study, hearing, award)", { default: 20, max: 2000 }), currencyField("hearingRoomCosts", "Hearing Room & Other Costs", { default: 0, max: 100000, step: 50 }), percentField("yourSharePercent", "Your Share of Costs", { default: 50, step: 5 })],
    results: [["totalArbitrationCost", "Total Arbitration Cost", "c"], ["yourShare", "Your Share", "c"], ["arbitratorCompensation", "Arbitrator Compensation", "c"], ["filingFee", "Filing Fee", "c"]],
    fn: E.arbitrationCost, ex: { caseType: 1, filingFee: 925, arbitratorHourlyRate: 450, hearingAndStudyHours: 20, hearingRoomCosts: 0, yourSharePercent: 50 },
    exText: (o) => `Example: a commercial arbitration with a ${usd(925)} filing fee and 20 arbitrator hours at ${usd(450)} costs ${usd(o.totalArbitrationCost)}, or ${usd(o.yourShare)} for each side.`,
    how: "Choose the case type, enter the filing fee from the provider's schedule (AAA commercial fees rise with the claim amount), the arbitrator's rate and expected hours.",
    assume: "AAA consumer rules cap the consumer's filing fee at $225 and the business pays the rest, including arbitrator compensation. Commercial filing fees range from about $925 to $10,000+ depending on the claim; arbitrators charge $300–$1,000+ an hour.",
    faq: [["How much does arbitration cost?", "Simple consumer cases cost the consumer about $225; commercial cases commonly run several thousand to tens of thousands of dollars."], ["Who pays for arbitration?", "It depends on the agreement and rules — in consumer and employment arbitration the business usually pays most costs."]],
  }),
  mk({
    slug: "mobile-notary-fee-calculator", title: "Mobile Notary Fee Calculator",
    desc: "Calculate a mobile notary's charge — the state's maximum fee per signature plus travel, mileage and after-hours fees.",
    inputs: [dropdown("state", "State (maximum fee per signature)", E.NOTARY_MAX.map(([l], i) => [l, i] as [string, number]), 0), currencyField("customFeePerSignature", "Custom Fee per Signature (Other)", { default: 10, max: 100, step: 1 }), numberField("notarizedSignatures", "Notarized Signatures", { default: 4, max: 500 }), currencyField("travelFee", "Flat Travel Fee", { default: 50, max: 1000, step: 5 }), numberField("miles", "Miles Driven", { default: 0, max: 1000 }), currencyField("perMileRate", "Rate per Mile", { default: 0, max: 5, step: 0.05 }), currencyField("afterHoursFee", "After-Hours / Rush Fee", { default: 0, max: 1000, step: 5 })],
    results: [["totalCharge", "Total Charge", "c"], ["notaryFees", "Notary Fees", "c"], ["travelCharges", "Travel Charges", "c"], ["maxFeePerSignature", "Maximum Fee per Signature", "c"]],
    fn: E.mobileNotary, ex: { state: 0, customFeePerSignature: 10, notarizedSignatures: 4, travelFee: 50, miles: 0, perMileRate: 0, afterHoursFee: 0 },
    exText: (o) => `Example: 4 signatures in California at $15 each plus a $50 travel fee comes to ${usd(o.totalCharge)}.`,
    how: "Choose the state for its maximum notarial fee, the number of signatures notarized and the travel charges agreed in advance.",
    assume: "State maximum fees per notarial act: California $15, Texas $10, Florida $10, New York $2, Pennsylvania $5, Illinois $5, Georgia $2. Travel fees are usually separate and must be agreed in advance; loan signing agents often charge a flat $75–$200 package fee.",
    faq: [["How much does a mobile notary charge?", "The state fee per signature plus a travel fee, usually $25–$100 locally."], ["Can a notary charge for travel?", "In most states yes, if the fee is agreed beforehand and stated separately."]],
  }),
);

// --- IP --------------------------------------------------------------------------------------------
TOOLS.push(
  mk({
    slug: "trademark-filing-fee-calculator", title: "Trademark Filing Fee Calculator",
    desc: "Calculate USPTO trademark application fees — $350 per class base fee plus surcharges for missing information, free-form descriptions and long descriptions.",
    meta: "Trademark Filing Fee Calculator — USPTO 2026 Fees",
    inputs: [numberField("classes", "Number of Classes", { default: 1, min: 1, max: 45 }), dropdown("insufficientInfo", "Missing Required Information (+$100/class)?", YESNO, 0), dropdown("freeFormDescription", "Free-Form Description, Not ID Manual (+$200/class)?", YESNO, 0), numberField("descriptionCharacters", "Description Length (characters; +$200 per extra 1,000)", { default: 0, max: 50000 }), dropdown("intentToUse", "Intent-to-Use Application?", YESNO, 0)],
    results: [["totalFilingFee", "Total Filing Fee", "c"], ["baseFee", "Base Application Fee", "c"], ["surcharges", "Surcharges", "c"], ["statementOfUseLater", "Statement of Use Fee Later (ITU)", "c"]],
    fn: E.trademarkFee, ex: { classes: 2, insufficientInfo: 0, freeFormDescription: 1, descriptionCharacters: 0, intentToUse: 1 },
    exText: (o) => `Example: 2 classes with free-form descriptions cost ${usd(o.totalFilingFee)} up front; as an intent-to-use filing, a ${usd(o.statementOfUseLater)} statement of use fee follows.`,
    how: "Enter the number of classes of goods and services and whether your description comes from the ID Manual.",
    assume: "USPTO fees effective January 18, 2025: base application $350 per class; insufficient information surcharge $100 per class; free-form text $200 per class; each additional 1,000 characters $200 per class; statement of use $150 per class.",
    faq: [["How much does it cost to file a trademark?", "$350 per class at the USPTO, plus surcharges if you don't use pre-approved ID Manual descriptions."], ["What happened to TEAS Plus and TEAS Standard?", "They were replaced in January 2025 by a single base application with surcharges."]],
  }),
  mk({
    slug: "patent-filing-fee-calculator", title: "Patent Filing Fee Calculator",
    desc: "Calculate USPTO utility patent filing, search and examination fees — with small entity (60% off) and micro entity (80% off) discounts and excess claims fees.",
    meta: "Patent Filing Fee Calculator — USPTO Fees 2026",
    inputs: [dropdown("entitySize", "Entity Status", [["Large entity", 0], ["Small entity (60% discount)", 1], ["Micro entity (80% discount)", 2]], 1), numberField("totalClaims", "Total Claims", { default: 20, min: 1, max: 500 }), numberField("independentClaims", "Independent Claims", { default: 3, min: 1, max: 100 })],
    results: [["totalFilingFees", "Total Filing Fees", "c"], ["basicFilingSearchExam", "Filing + Search + Examination", "c"], ["excessClaimFees", "Excess Claims Fees", "c"], ["issueFeeLater", "Issue Fee (when allowed)", "c"]],
    fn: E.patentFee, ex: { entitySize: 1, totalClaims: 24, independentClaims: 4 },
    exText: (o) => `Example: a small entity filing 24 claims (4 independent) pays ${usd(o.totalFilingFees)}, then ${usd(o.issueFeeLater)} at issue.`,
    how: "Choose your entity status (micro entity requires income and application limits) and enter the claim count.",
    assume: "USPTO utility fees effective January 19, 2025 (large entity): basic filing $350, search $770, examination $880; each claim over 20 $200; each independent claim over 3 $600; issue fee $1,290. Small entities pay 40%, micro entities 20%. Multiple dependent claims, size and late fees not included.",
    faq: [["How much does it cost to file a patent?", "About $2,000 in USPTO fees for a large entity, $800 for a small entity and $400 for a micro entity, before attorney fees."], ["Who qualifies as a micro entity?", "Applicants with gross income under about 3× the median household income and no more than four prior applications."]],
  }),
  mk({
    slug: "patent-expiration-date-calculator", title: "Patent Expiration Date Calculator",
    desc: "Calculate when a patent expires — 20 years from filing for utility patents or 15 years from grant for design patents, plus patent term adjustment.",
    inputs: [dropdown("patentType", "Patent Type", [["Utility (20 years from filing)", 0], ["Design (15 years from grant)", 1]], 0), dateField("filingDate", "Earliest Non-Provisional Filing Date", "today-3000"), dateField("grantDate", "Grant Date (design patents)", "today-1000"), numberField("ptaDays", "Patent Term Adjustment / Extension (days)", { default: 0, max: 5000 }), numberField("terminalDisclaimerDays", "Terminal Disclaimer Reduction (days)", { default: 0, max: 10000 })],
    results: [["expirationDate", "Patent Expires", "d"], ["baseExpiration", "Base Expiration (before PTA)", "d"], ["adjustmentDays", "Net Adjustment (days)", "n"]],
    fn: E.patentTerm, ex: { patentType: 0, filingDate: dn("2015-03-10"), grantDate: dn("2018-01-02"), ptaDays: 214, terminalDisclaimerDays: 0 },
    exText: (o) => `Example: a utility patent filed March 10, 2015 with 214 days of PTA expires ${fd(o.expirationDate)}.`,
    how: "Enter the earliest US non-provisional filing date (not the provisional) and the PTA days printed on the patent. Maintenance fees must be paid at 3.5, 7.5 and 11.5 years.",
    assume: "35 U.S.C. §154: utility patents run 20 years from the earliest non-provisional filing date (applications filed after June 8, 1995) plus PTA under §154(b); design patents filed after May 13, 2015 run 15 years from grant. Terminal disclaimers can shorten the term.",
    faq: [["When does a patent expire?", "20 years from the filing date for utility patents (plus adjustments) and 15 years from grant for design patents."], ["Does a provisional application count toward the patent term?", "No — the 20 years starts from the non-provisional filing date."]],
  }),
  mk({
    slug: "pct-deadline-calculator", title: "PCT Deadline Calculator",
    desc: "Calculate PCT international patent deadlines from the priority date — 12-month filing, 18-month publication, 22-month Chapter II demand and 30/31-month national phase.",
    inputs: [dateField("priorityDate", "Priority Date (first filing)", "today-200")],
    results: [["nationalPhase30Months", "National Phase Entry (30 months)", "d"], ["nationalPhase31Months", "National Phase — 31-Month Countries (EPO etc.)", "d"], ["pctFilingDeadline12Months", "PCT Filing Deadline (12 months)", "d"], ["internationalPublication18Months", "International Publication (18 months)", "d"], ["demandForChapterII22Months", "Chapter II Demand (22 months)", "d"]],
    fn: E.pctDeadlines, ex: { priorityDate: dn("2026-01-15") },
    exText: (o) => `Example: from a January 15, 2026 priority date, the PCT application is due ${fd(o.pctFilingDeadline12Months)} and US national phase entry by ${fd(o.nationalPhase30Months)} (EPO: ${fd(o.nationalPhase31Months)}).`,
    how: "Enter the date of the earliest application you're claiming priority from.",
    assume: "PCT Articles 8, 21, 22 and 39 and Paris Convention: 12 months to claim priority; publication at 18 months; Chapter II demand by 22 months (or 3 months from the search report); national phase at 30 months (31 for EPO, Australia, Korea and others). Deadlines falling on a weekend or office closure roll to the next working day.",
    faq: [["What is the PCT national phase deadline?", "30 months from the priority date for most countries, 31 months for the EPO and some others."], ["Can I miss the 12-month PCT deadline?", "Restoration of priority is available within 14 months in many offices if the delay was unintentional or occurred despite due care."]],
  }),
  mk({
    slug: "public-domain-calculator", title: "Public Domain Calculator",
    desc: "Find when a US work enters the public domain — 95 years after publication for older works, or 70 years after the author's death for works created since 1978.",
    inputs: [dropdown("workType", "Author Type", [["Individual author", 0], ["Work for hire / anonymous", 1]], 0), numberField("publicationYear", "Year First Published (0 = unpublished)", { default: 1931, max: 2100 }), dropdown("renewedOrNotice", "For 1931–1977 works: Published with Notice (and Renewed if before 1964)?", YESNO, 1), numberField("authorDeathYear", "Author's Death Year (0 = living / unknown)", { default: 0, max: 2100 }), numberField("creationYear", "Year Created (unpublished works)", { default: 0, max: 2100 }), numberField("currentYear", "Current Year", { default: 2026, min: 1900, max: 2200 })],
    results: [["publicDomainYear", "Enters Public Domain on Jan 1", "n"], ["inPublicDomainNow", "Public Domain Now? (1 = yes)", "n"], ["yearsUntilPublicDomain", "Years Until Public Domain", "n"]],
    fn: E.publicDomain, ex: { workType: 0, publicationYear: 1931, renewedOrNotice: 1, authorDeathYear: 0, creationYear: 0, currentYear: 2026 },
    exText: (o) => `Example: a book published in 1931 with a renewed copyright enters the US public domain on January 1, ${o.publicDomainYear}.`,
    how: "Enter the year of first publication and, for works created after 1977, the author's death year or whether it's a work for hire.",
    assume: "US Copyright Act: works published before 1931 are public domain as of 2026; 1931–1977 works with notice (and renewal for 1931–1963) last 95 years from publication; works since 1978 last life + 70 years, or 95 years from publication / 120 from creation for works for hire. Terms run to December 31. Other countries differ (usually life + 70).",
    faq: [["When does a copyright expire?", "For works created since 1978, 70 years after the author dies; older published works generally after 95 years."], ["What entered the public domain in 2026?", "Works published in 1930 (including the first Nancy Drew and early Blondie and Betty Boop appearances)."]],
  }),
  mk({
    slug: "intellectual-property-valuation-calculator", title: "Intellectual Property Valuation Calculator",
    desc: "Value a patent, trademark or other IP with the relief-from-royalty method — the present value of after-tax royalties you'd avoid paying.",
    inputs: [currencyField("annualRevenue", "Annual Revenue Using the IP", { default: 2000000, max: 10000000000, step: 10000 }), percentField("royaltyRatePercent", "Market Royalty Rate", { default: 5, max: 50, step: 0.25 }), percentField("taxRatePercent", "Tax Rate", { default: 25, max: 60, step: 1 }), percentField("growthPercent", "Annual Revenue Growth", { default: 3, max: 50, step: 0.5 }), percentField("discountRatePercent", "Discount Rate", { default: 15, max: 50, step: 0.5 }), numberField("remainingLifeYears", "Remaining Useful Life (years)", { default: 10, min: 1, max: 50 })],
    results: [["ipValue", "Estimated IP Value", "c"], ["firstYearAfterTaxRoyalty", "Year-1 After-Tax Royalty Savings", "c"], ["yearsValued", "Years Valued", "n"]],
    fn: E.ipValuation, ex: { annualRevenue: 2000000, royaltyRatePercent: 5, taxRatePercent: 25, growthPercent: 3, discountRatePercent: 15, remainingLifeYears: 10 },
    exText: (o) => `Example: ${usd(2000000)} of revenue at a 5% royalty saves ${usd(o.firstYearAfterTaxRoyalty)} a year after tax; over 10 years at a 15% discount rate the IP is worth about ${usd(o.ipValue)}.`,
    how: "Enter revenue tied to the IP, a royalty rate from comparable licenses, tax rate, growth, a risk-adjusted discount rate and the remaining life (for patents, years to expiration).",
    assume: "Relief-from-royalty: value = Σ revenue × royalty × (1 − tax) ÷ (1 + discount)^year. A tax amortization benefit and terminal value for indefinite-life trademarks aren't included.",
    faq: [["How do you value intellectual property?", "Common methods are relief-from-royalty, cost to recreate, and the market approach using comparable sales or licenses."], ["What royalty rate should I use?", "Rates from comparable license agreements in your industry — often 1–10% of sales."]],
  }),
);

// --- Property, contracts, misc --------------------------------------------------------------------
TOOLS.push(
  mk({
    slug: "crime-rate-calculator", title: "Crime Rate Calculator",
    desc: "Calculate a crime rate per 100,000 people (and per 1,000) from the number of crimes and the population, and compare it to another area.",
    inputs: [numberField("crimes", "Number of Crimes", { default: 380, max: 100000000 }), numberField("population", "Population", { default: 100000, min: 1, max: 10000000000 }), numberField("comparisonRate", "Comparison Rate per 100k (e.g. national, 0 = none)", { default: 0, max: 100000, step: 0.1 })],
    results: [["crimeRatePer100k", "Crime Rate per 100,000", "n"], ["crimeRatePer1000", "Crime Rate per 1,000", "n"], ["oneInHowManyPeople", "1 Crime for Every … People", "n"], ["comparedToAveragePercent", "Compared to Benchmark (%)", "p"]],
    fn: E.crimeRate, ex: { crimes: 380, population: 100000, comparisonRate: 0 },
    exText: (o) => `Example: 380 violent crimes in a city of 100,000 is a rate of ${o.crimeRatePer100k} per 100,000 — one for every ${o.oneInHowManyPeople} residents.`,
    how: "Enter the number of reported offenses for a year and the population. Use FBI or state crime data for benchmarks.",
    assume: "Crime rate = crimes ÷ population × 100,000. Rates for cities with many commuters or tourists can look high because visitors aren't counted in the population.",
    faq: [["How is crime rate calculated?", "Number of crimes divided by population, times 100,000."], ["What is the US violent crime rate?", "Roughly 350–400 per 100,000 people in recent FBI data."]],
  }),
  mk({
    slug: "prop-19-calculator", title: "Prop 19 Calculator",
    desc: "Estimate California property tax after a parent-to-child transfer under Prop 19 — the exclusion amount, new assessed value and annual tax savings.",
    meta: "Prop 19 Calculator — Parent-Child Transfer Property Tax",
    inputs: [currencyField("marketValue", "Market Value at Transfer", { default: 1800000, max: 100000000, step: 10000 }), currencyField("factoredBaseYearValue", "Parent's Factored Base Year Value (assessed value)", { default: 400000, max: 100000000, step: 1000 }), currencyField("exclusionAmount", "Prop 19 Exclusion Amount", { default: 1044586, max: 5000000, step: 1 }), dropdown("childMovesIn", "Child Moves In as Principal Residence Within 1 Year?", YESNO, 1), percentField("taxRatePercent", "Property Tax Rate", { default: 1.1, max: 5, step: 0.01 })],
    results: [["newAssessedValue", "New Assessed Value", "c"], ["annualPropertyTax", "Annual Property Tax", "c"], ["taxWithoutExclusion", "Tax at Full Market Value", "c"], ["annualSavings", "Annual Savings", "c"]],
    fn: E.prop19, ex: { marketValue: 1800000, factoredBaseYearValue: 400000, exclusionAmount: 1044586, childMovesIn: 1, taxRatePercent: 1.1 },
    exText: (o) => `Example: a home worth ${usd(1800000)} with a ${usd(400000)} assessed value is reassessed to ${usd(o.newAssessedValue)} (market value minus the ${usd(1044586)} exclusion) — tax of ${usd(o.annualPropertyTax)} instead of ${usd(o.taxWithoutExclusion)}.`,
    how: "Enter the market value at the date of transfer, the parent's current assessed value from the tax bill, and confirm the child will make it their principal residence.",
    assume: "Prop 19 (Feb 16, 2021+): the parent's base value carries over only if the child uses the home as their principal residence (homeowners' exemption within 1 year). If market value exceeds base value + the exclusion ($1,044,586 for transfers from Feb 16, 2025 to Feb 15, 2027), the excess is added. Other property is reassessed at market value.",
    faq: [["How does Prop 19 work for inherited homes?", "The child keeps the parent's tax base only if they move in, and only up to the base value plus about $1 million."], ["Does Prop 19 apply to rental property?", "No — only a family home that becomes the child's principal residence (and some family farms)."]],
  }),
  mk({
    slug: "tenants-in-common-calculator", title: "Tenants in Common Calculator",
    desc: "Split sale proceeds between tenants in common by ownership share, with credits for unequal contributions to the mortgage, taxes or improvements.",
    inputs: [currencyField("salePrice", "Sale Price", { default: 600000, max: 100000000, step: 1000 }), currencyField("mortgageBalance", "Mortgage Balance", { default: 250000, max: 100000000, step: 1000 }), currencyField("sellingCosts", "Selling Costs", { default: 36000, max: 10000000, step: 500 }), percentField("yourOwnershipPercent", "Your Ownership Share", { default: 50, step: 1 }), currencyField("yourExtraContributions", "Your Extra Contributions (beyond your share)", { default: 20000, max: 10000000, step: 500 }), currencyField("othersExtraContributions", "Others' Extra Contributions", { default: 0, max: 10000000, step: 500 })],
    results: [["yourShareOfProceeds", "Your Share of Proceeds", "c"], ["otherOwnersShare", "Other Owners' Share", "c"], ["netProceeds", "Net Sale Proceeds", "c"], ["equalizationAdjustment", "Contribution Credit", "c"]],
    fn: E.tenantsInCommon, ex: { salePrice: 600000, mortgageBalance: 250000, sellingCosts: 36000, yourOwnershipPercent: 50, yourExtraContributions: 20000, othersExtraContributions: 0 },
    exText: (o) => `Example: net proceeds of ${usd(o.netProceeds)} split 50/50, with a credit for ${usd(20000)} of extra mortgage payments you made, gives you ${usd(o.yourShareOfProceeds)}.`,
    how: "Enter the sale price, mortgage payoff, costs, your ownership percentage and any payments one owner made beyond their share.",
    assume: "Each co-owner's share = net proceeds × ownership % plus a credit for the other owners' share of any excess contributions (the usual partition accounting). Courts may also charge rent to an owner in exclusive possession.",
    faq: [["How are proceeds split between tenants in common?", "By ownership percentages on the deed, with accounting credits for unequal payments of mortgage, taxes and improvements."], ["Can a tenant in common force a sale?", "Yes, through a partition action if the owners can't agree."]],
  }),
  mk({
    slug: "easement-value-calculator", title: "Easement Value Calculator",
    desc: "Estimate compensation for an easement — the land value affected, the percentage of rights taken and severance damages to the remaining property.",
    inputs: [currencyField("landValuePerAcre", "Land Value per Acre", { default: 20000, max: 100000000, step: 500 }), numberField("easementAcres", "Easement Area (acres)", { default: 2.5, max: 100000, step: 0.1 }), percentField("percentOfValueTaken", "Percent of Value Taken (e.g. 50% pipeline, 90% road)", { default: 50, step: 5 }), currencyField("severanceDamages", "Severance Damages to the Remainder", { default: 0, max: 100000000, step: 500 })],
    results: [["easementCompensation", "Estimated Easement Compensation", "c"], ["landValueAffected", "Full Value of Easement Area", "c"], ["percentUsed", "Percent of Value Taken", "p"]],
    fn: E.easementValue, ex: { landValuePerAcre: 20000, easementAcres: 2.5, percentOfValueTaken: 50, severanceDamages: 0 },
    exText: (o) => `Example: a 2.5-acre pipeline easement on land worth ${usd(20000)} an acre, taking 50% of the rights, is worth about ${usd(o.easementCompensation)}.`,
    how: "Enter the land value, the size of the easement area and how much of the owner's use it takes. Add damage to the rest of the property if the easement reduces its value.",
    assume: "Appraisers often value an easement as a percentage of fee value (10–25% for light utility easements, 50% for buried pipelines, 75–100% for exclusive access roads) plus severance damages. A before-and-after appraisal is the legal standard in eminent domain.",
    faq: [["How much is an easement worth?", "Typically a percentage of the land value of the easement area, depending on how much it restricts your use."], ["Do I get paid for a utility easement?", "If it's taken by eminent domain or negotiated, yes — just compensation is required."]],
  }),
  mk({
    slug: "rera-delay-interest-calculator", title: "RERA Delay Interest Calculator",
    desc: "Calculate interest owed by a builder for delayed possession under India's RERA — SBI MCLR + 2% on the amount paid for each month of delay.",
    inputs: [currencyField("amountPaid", "Amount Paid to Builder (₹)", { default: 5000000, max: 10000000000, step: 10000 }), percentField("interestRatePercent", "Interest Rate (SBI MCLR + 2%)", { default: 10.85, max: 30, step: 0.05 }), dateField("promisedPossessionDate", "Promised Possession Date", "today-400"), dateField("actualPossessionDate", "Actual / Expected Possession Date")],
    results: [["delayInterest", "Delay Interest (₹)", "c"], ["monthsDelayed", "Months Delayed", "n"], ["monthlyInterest", "Interest per Month (₹)", "c"]],
    fn: E.reraInterest, ex: { amountPaid: 5000000, interestRatePercent: 10.85, promisedPossessionDate: dn("2025-06-30"), actualPossessionDate: dn("2026-09-30") },
    exText: (o) => `Example: ₹50 lakh paid and possession delayed ${o.monthsDelayed} months at 10.85% means delay interest of about ₹${Math.round(o.delayInterest).toLocaleString("en-IN")}.`,
    how: "Enter the amount you've paid, the possession date in your agreement for sale and the actual handover date.",
    assume: "RERA Section 18 and state rules: the promoter pays interest for every month of delay until handover at SBI's highest MCLR + 2% (rates vary by state rule). Allottees can instead withdraw and claim a refund with interest. Compensation is decided by the authority or adjudicating officer.",
    faq: [["What interest does a builder pay for delayed possession?", "Under RERA, generally SBI's highest MCLR plus 2% per year on the amount paid, for each month of delay."], ["Can I get a refund for a delayed flat?", "Yes — under Section 18 you can withdraw and get your money back with interest."]],
  }),
  mk({
    slug: "lease-valuation-calculator", title: "Lease Valuation Calculator",
    desc: "Value a lease as the present value of its remaining payments — the lease liability for ASC 842 / IFRS 16 or the worth of an above- or below-market lease.",
    inputs: [currencyField("monthlyPayment", "Monthly Lease Payment", { default: 8000, max: 100000000, step: 100 }), numberField("remainingMonths", "Remaining Months", { default: 60, min: 1, max: 1200 }), percentField("discountRatePercent", "Discount Rate (incremental borrowing rate)", { default: 6, max: 30, step: 0.25 }), dropdown("paymentsInAdvance", "Payments Made", [["In arrears (end of month)", 0], ["In advance (start of month)", 1]], 1)],
    results: [["leaseLiabilityPresentValue", "Present Value of Lease", "c"], ["totalPaymentsRemaining", "Total Remaining Payments", "c"], ["impliedInterest", "Implied Interest", "c"]],
    fn: E.leaseValuation, ex: { monthlyPayment: 8000, remainingMonths: 60, discountRatePercent: 6, paymentsInAdvance: 1 },
    exText: (o) => `Example: ${usd(8000)} a month for 60 months, paid in advance and discounted at 6%, is worth ${usd(o.leaseLiabilityPresentValue)} today.`,
    how: "Enter the fixed payment, months left and your discount rate (the rate implicit in the lease, or your incremental borrowing rate).",
    assume: "Present value of an annuity (annuity due if paid in advance). Variable payments, options reasonably certain to be exercised and initial direct costs aren't included.",
    faq: [["How do you value a lease?", "Discount the remaining lease payments to today at an appropriate interest rate."], ["What discount rate is used for ASC 842?", "The rate implicit in the lease if known; otherwise the lessee's incremental borrowing rate."]],
  }),
  mk({
    slug: "land-lease-calculator", title: "Land Lease Calculator",
    desc: "Estimate land lease income for farmland, pasture or hunting — acres times rent per acre, plus other use payments.",
    inputs: [numberField("acres", "Acres Leased", { default: 160, max: 1000000, step: 1 }), currencyField("rentPerAcre", "Cash Rent per Acre", { default: 150, max: 10000, step: 5 }), currencyField("huntingOrOtherIncomePerAcre", "Hunting / Other Use per Acre", { default: 15, max: 10000, step: 1 })],
    results: [["annualLeaseIncome", "Annual Lease Income", "c"], ["baseCropOrPastureRent", "Crop / Pasture Rent", "c"], ["otherUseIncome", "Other Use Income", "c"], ["monthlyEquivalent", "Monthly Equivalent", "c"]],
    fn: E.landLease, ex: { acres: 160, rentPerAcre: 150, huntingOrOtherIncomePerAcre: 15 },
    exText: (o) => `Example: 160 acres at ${usd(150)} cash rent plus ${usd(15)} an acre for hunting earns ${usd(o.annualLeaseIncome)} a year.`,
    how: "Enter the leased acres and the rent per acre. USDA NASS publishes average cash rents by state and county.",
    assume: "USDA NASS 2025 averages: cropland about $160 per acre nationally (Iowa and Illinois $250+), pasture about $15. Hunting leases commonly add $10–$40 per acre.",
    faq: [["How much does farmland rent for per acre?", "About $160 per acre on average for cropland in the US, far more in the Corn Belt."], ["How much is a hunting lease per acre?", "Typically $10–$40 per acre per year, depending on game and region."]],
  }),
  mk({
    slug: "contract-for-deed-calculator", title: "Contract for Deed Calculator",
    desc: "Calculate the monthly payment, total interest and balloon payment on a contract for deed (land contract) owner-financed sale.",
    inputs: [currencyField("purchasePrice", "Purchase Price", { default: 250000, max: 100000000, step: 1000 }), currencyField("downPayment", "Down Payment", { default: 25000, max: 100000000, step: 1000 }), percentField("interestRatePercent", "Interest Rate", { default: 8, max: 30, step: 0.125 }), numberField("amortizationYears", "Amortization (years)", { default: 30, min: 1, max: 40 }), numberField("balloonYears", "Balloon Due After (years, 0 = none)", { default: 5, max: 40 })],
    results: [["monthlyPayment", "Monthly Payment", "c"], ["balloonPaymentDue", "Balloon Payment Due", "c"], ["amountFinanced", "Amount Financed", "c"], ["totalInterest", "Total Interest Paid", "c"]],
    fn: E.contractForDeed, ex: { purchasePrice: 250000, downPayment: 25000, interestRatePercent: 8, amortizationYears: 30, balloonYears: 5 },
    exText: (o) => `Example: ${usd(225000)} financed at 8% on a 30-year schedule is ${usd(o.monthlyPayment)} a month, with a balloon of ${usd(o.balloonPaymentDue)} due after 5 years.`,
    how: "Enter the agreed price, down payment, interest rate, amortization period and when the balloon payment (if any) is due.",
    assume: "Standard amortization; the balloon is the remaining balance on the due date. The seller keeps legal title until the contract is paid, and several states (e.g. Texas Prop. Code §5.061+) add disclosure and forfeiture protections.",
    faq: [["How does a contract for deed work?", "The buyer pays the seller in installments and gets the deed when the contract is paid off or refinanced."], ["What is the risk of a contract for deed?", "If the buyer defaults, they can lose the property and all payments made in many states."]],
  }),
  mk({
    slug: "breach-of-contract-damages-calculator", title: "Breach of Contract Damages Calculator",
    desc: "Estimate damages for breach of contract — expectation damages (benefit of the bargain) plus incidental and consequential losses, less mitigation.",
    inputs: [currencyField("contractValueToYou", "Value You Were Promised", { default: 80000, max: 1000000000, step: 500 }), currencyField("valueReceived", "Value Actually Received", { default: 20000, max: 1000000000, step: 500 }), currencyField("costsAvoided", "Costs You Saved Because of the Breach", { default: 5000, max: 1000000000, step: 500 }), currencyField("mitigationEarnings", "Earned by Mitigating (replacement deal)", { default: 10000, max: 1000000000, step: 500 }), currencyField("incidentalCosts", "Incidental Costs (finding a replacement)", { default: 2000, max: 1000000000, step: 100 }), currencyField("consequentialLosses", "Foreseeable Consequential Losses", { default: 0, max: 1000000000, step: 500 }), currencyField("liquidatedDamagesClause", "Liquidated Damages in Contract (0 = none)", { default: 0, max: 1000000000, step: 500 })],
    results: [["recoverable", "Estimated Recoverable Damages", "c"], ["expectationDamages", "Expectation Damages", "c"], ["netLostBenefit", "Net Lost Benefit", "c"], ["liquidatedDamagesApply", "Liquidated Damages Apply? (1 = yes)", "n"]],
    fn: E.breachOfContract, ex: { contractValueToYou: 80000, valueReceived: 20000, costsAvoided: 5000, mitigationEarnings: 10000, incidentalCosts: 2000, consequentialLosses: 0, liquidatedDamagesClause: 0 },
    exText: (o) => `Example: a promised ${usd(80000)} contract where you received ${usd(20000)}, saved ${usd(5000)} and earned ${usd(10000)} on a replacement deal, plus ${usd(2000)} of incidental costs, supports about ${usd(o.recoverable)} in damages.`,
    how: "Enter what full performance was worth to you, what you got, what you saved by not performing, what you earned by mitigating and any extra costs the breach caused.",
    assume: "Restatement (Second) of Contracts §347: loss in value + incidental and consequential losses − cost or loss avoided; recovery is reduced by what you could reasonably earn mitigating. Enforceable liquidated damages clauses replace actual damages. Punitive damages generally aren't available for breach of contract.",
    faq: [["How are breach of contract damages calculated?", "Usually as the benefit you expected minus what you received and saved, plus foreseeable extra losses."], ["Do I have to mitigate damages?", "Yes — you can't recover losses you could reasonably have avoided."]],
  }),
  mk({
    slug: "lawsuit-loan-calculator", title: "Lawsuit Loan Calculator",
    desc: "See what a pre-settlement lawsuit loan really costs — simple or compounding monthly rates, fees, the effective annual rate and what's left from your settlement.",
    inputs: [currencyField("advanceAmount", "Advance Amount", { default: 10000, max: 10000000, step: 500 }), percentField("monthlyRatePercent", "Monthly Rate", { default: 3, max: 10, step: 0.25 }), dropdown("compounding", "Interest Type", [["Simple", 0], ["Compounding monthly", 1]], 1), numberField("monthsUntilSettlement", "Months Until Settlement", { default: 18, min: 1, max: 120 }), currencyField("fees", "Application / Processing Fees", { default: 500, max: 100000, step: 50 }), numberField("capMultiple", "Cap (× advance, 0 = none)", { default: 0, max: 10, step: 0.5 }), currencyField("expectedNetSettlement", "Your Expected Net Settlement", { default: 60000, max: 100000000, step: 1000 })],
    results: [["amountOwedAtSettlement", "Amount Owed at Settlement", "c"], ["costOfFunding", "Cost of the Advance", "c"], ["effectiveAnnualRatePercent", "Effective Annual Rate", "p"], ["leftFromSettlement", "Left From Your Settlement", "c"]],
    fn: E.lawsuitLoan, ex: { advanceAmount: 10000, monthlyRatePercent: 3, compounding: 1, monthsUntilSettlement: 18, fees: 500, capMultiple: 0, expectedNetSettlement: 60000 },
    exText: (o) => `Example: a ${usd(10000)} advance at 3% a month compounding for 18 months costs ${usd(o.costOfFunding)} — you'd owe ${usd(o.amountOwedAtSettlement)} (an effective ${o.effectiveAnnualRatePercent}% a year).`,
    how: "Enter the advance, the funder's monthly rate, whether it compounds and how long the case may take.",
    assume: "Pre-settlement funding is non-recourse (owed only if you win) and often isn't regulated as a loan; some states cap rates or require disclosures. Rates of 2–4% a month (27–60%+ a year) are typical.",
    faq: [["How much do lawsuit loans cost?", "Commonly 2–4% per month, which can double the amount owed within 2–3 years if it compounds."], ["Do I repay a lawsuit loan if I lose?", "No — pre-settlement funding is usually non-recourse."]],
  }),
  mk({
    slug: "offer-in-compromise-calculator", title: "Offer in Compromise Calculator",
    desc: "Estimate the minimum IRS offer in compromise — net equity in assets plus future disposable income × 12 (lump sum) or × 24 (periodic payments).",
    inputs: [currencyField("cashAndBank", "Cash & Bank Accounts", { default: 3000, max: 100000000, step: 100 }), currencyField("assetValue", "Market Value of Other Assets (home, car, investments)", { default: 30000, max: 100000000, step: 500 }), currencyField("loansOnAssets", "Loans Against Those Assets", { default: 22000, max: 100000000, step: 500 }), currencyField("monthlyIncome", "Monthly Gross Household Income", { default: 6000, max: 10000000, step: 50 }), currencyField("allowableExpenses", "Allowable Monthly Expenses (IRS standards)", { default: 5700, max: 10000000, step: 50 })],
    results: [["minimumLumpSumOffer", "Minimum Lump Sum Offer", "c"], ["minimumPeriodicOffer", "Minimum Periodic Payment Offer", "c"], ["monthlyDisposableIncome", "Monthly Disposable Income", "c"], ["lumpSumDownPayment20Percent", "20% Payment With Lump Sum Application", "c"]],
    fn: E.offerInCompromise, ex: { cashAndBank: 3000, assetValue: 30000, loansOnAssets: 22000, monthlyIncome: 6000, allowableExpenses: 5700 },
    exText: (o) => `Example: ${usd(3000)} in the bank, ${usd(2000)} of quick-sale equity and ${usd(300)} a month of disposable income → a minimum lump sum offer of about ${usd(o.minimumLumpSumOffer)}, or ${usd(o.minimumPeriodicOffer)} paid over 6–24 months.`,
    how: "Enter your assets at market value with the loans against them, and income and expenses as on Form 433-A (OIC) using IRS collection standards.",
    assume: "Form 656-B: reasonable collection potential = net realizable equity (80% of market value minus loans; some exclusions apply) + monthly disposable income × 12 for a lump sum offer (5 or fewer payments within 5 months) or × 24 for a periodic offer. The $205 application fee and 20% down payment are waived for low-income applicants. Your offer must be at least the RCP unless special circumstances apply.",
    faq: [["How much should I offer in an offer in compromise?", "At least your reasonable collection potential — equity in assets plus 12 or 24 months of disposable income."], ["What is the OIC application fee?", "$205 plus a 20% initial payment for lump sum offers, waived for low-income taxpayers."]],
  }),
  mk({
    slug: "california-rent-cap-calculator", title: "California Rent Cap Calculator",
    desc: "Calculate the maximum allowed rent increase under California's Tenant Protection Act (AB 1482) — 5% plus regional CPI, capped at 10%.",
    meta: "California Rent Cap Calculator — AB 1482 Max Increase",
    inputs: [currencyField("currentRent", "Lowest Rent Charged in the Past 12 Months", { default: 2400, max: 100000, step: 10 }), percentField("regionalCpiPercent", "Regional CPI Change (April–April)", { default: 3.3, max: 15, step: 0.1 }), currencyField("proposedRent", "Proposed New Rent", { default: 2600, max: 100000, step: 10 })],
    results: [["maximumLegalRent", "Maximum Legal Rent", "c"], ["allowedIncreasePercent", "Allowed Increase", "p"], ["allowedIncrease", "Allowed Increase ($)", "c"], ["proposedIsOverCap", "Proposed Rent Over the Cap? (1 = yes)", "n"]],
    fn: E.californiaRentCap, ex: { currentRent: 2400, regionalCpiPercent: 3.3, proposedRent: 2600 },
    exText: (o) => `Example: with 3.3% regional CPI the cap is ${o.allowedIncreasePercent}%, so ${usd(2400)} rent can rise to at most ${usd(o.maximumLegalRent)} — a ${usd(2600)} increase would be over the limit.`,
    how: "Enter the lowest rent charged at any time in the prior 12 months and the CPI change for your region (Los Angeles, San Francisco, San Diego, Riverside, or California statewide). Check local rent control first — it's often stricter.",
    assume: "Civil Code §1947.12: annual increases capped at 5% + the percentage change in regional CPI (April to April), or 10%, whichever is lower; no more than two increases in 12 months. Exempt: single-family homes and condos (with notice) not owned by a corporation, buildings under 15 years old and owner-occupied duplexes.",
    faq: [["How much can a landlord raise rent in California?", "Up to 5% plus local inflation, never more than 10% a year, for units covered by AB 1482."], ["Is my unit exempt from AB 1482?", "Single-family homes not owned by corporations (with the required notice), units built in the last 15 years and owner-occupied duplexes are exempt."]],
  }),
);

// --- Speeding tickets ------------------------------------------------------------------------------
const SPEED_RESULTS: Line[] = [["totalTicketCost", "Total Ticket Cost", "c"], ["fineAndFees", "Fine & Fees", "c"], ["pointsOnRecord", "Points on Your Record", "n"], ["estimatedInsuranceIncrease3Years", "Estimated Insurance Increase (3 years)", "c"], ["trueCostIncludingInsurance", "True Cost Including Insurance", "c"]];
const speedIn = (def: number, extra: Record<string, unknown>[] = []) => [numberField("yourSpeed", "Your Speed (mph)", { default: 80, max: 200 }), numberField("speedLimit", "Speed Limit (mph)", { default: 65, max: 85 }), currencyField("baseFine", `Base Fine (0 = typical ${usd(def)})`, { default: 0, max: 10000, step: 5 }), ...extra, currencyField("courtCosts", "Court Costs / County Fees", { default: 0, max: 5000, step: 5 }), currencyField("annualInsurancePremium", "Your Annual Car Insurance Premium", { default: 2400, max: 50000, step: 50 })];
const INS_NOTE = "The insurance estimate assumes a 20–45% surcharge for 3 years depending on points (national studies put the average at about 20–25% after one speeding ticket).";
TOOLS.push(
  mk({
    slug: "speeding-ticket-cost-calculator", title: "Speeding Ticket Cost Calculator",
    desc: "Estimate the real cost of a speeding ticket — the fine, court costs, points and how much your car insurance may rise over 3 years.",
    meta: "Speeding Ticket Cost Calculator — Fine, Points & Insurance",
    inputs: [numberField("yourSpeed", "Your Speed (mph)", { default: 80, max: 200 }), numberField("speedLimit", "Speed Limit (mph)", { default: 65, max: 85 }), currencyField("baseFine", "Fine on the Ticket (0 = estimate)", { default: 0, max: 10000, step: 5 }), dropdown("workOrSchoolZone", "Work or School Zone (double fine)?", YESNO, 0), numberField("points", "Points Assessed (estimate if unsure)", { default: 3, max: 20 }), currencyField("courtCosts", "Court Costs", { default: 0, max: 5000, step: 5 }), currencyField("annualInsurancePremium", "Your Annual Car Insurance Premium", { default: 2400, max: 50000, step: 50 })],
    results: SPEED_RESULTS, fn: E.genericSpeeding, ex: { yourSpeed: 80, speedLimit: 65, baseFine: 0, workOrSchoolZone: 0, points: 3, courtCosts: 0, annualInsurancePremium: 2400 },
    exText: (o) => `Example: 80 in a 65 with an estimated ${usd(o.fineAndFees)} fine and 3 points could raise a ${usd(2400)} premium by ${usd(o.estimatedInsuranceIncrease3Years)} over 3 years — a true cost of about ${usd(o.trueCostIncludingInsurance)}.`,
    how: "Enter your speed, the limit and the fine on the ticket if you have it. Use the state calculators in this category for state-specific points and surcharges.",
    assume: `Without a fine, $50 + $10 per mph over is used as a rough national estimate. ${INS_NOTE} Traffic school or deferral can keep points off your record in many states.`,
    faq: [["How much does a speeding ticket cost?", "The fine is often $100–$300, but the insurance increase over 3 years usually costs more than the ticket."], ["How long does a speeding ticket affect insurance?", "Usually 3 years, sometimes 5."]],
  }),
  ...E.SPEED_STATES.map((s) =>
    mk({
      slug: s.slug, title: `${s.name} Speeding Ticket Cost Calculator`,
      desc: `Estimate a ${s.name} speeding ticket's cost — the fine, ${s.name} points and surcharges, and the insurance increase over 3 years.`,
      meta: `${s.name} Speeding Ticket Calculator — Fine, Points & Cost`,
      inputs: speedIn(s.baseFine, s.name === "Georgia" ? [dropdown("twoLaneRoad", "Two-Lane Road?", YESNO, 0)] : []),
      results: SPEED_RESULTS, fn: E.stateSpeeding(s), ex: { yourSpeed: 80, speedLimit: 65, baseFine: 0, twoLaneRoad: 0, courtCosts: 0, annualInsurancePremium: 2400 },
      exText: (o) => `Example: 80 in a 65 in ${s.name} — about ${usd(o.fineAndFees)} in fines and fees${o.pointsOnRecord ? `, ${o.pointsOnRecord} point${o.pointsOnRecord === 1 ? "" : "s"}` : ""}, and roughly ${usd(o.estimatedInsuranceIncrease3Years)} more for insurance over 3 years.`,
      how: `Enter your speed, the posted limit and the fine on your citation (fines vary by county and court). ${s.note}`,
      assume: `${s.note} ${s.baseFine ? `When no fine is entered, a typical ${usd(s.baseFine)} base fine is used.` : ""} ${INS_NOTE}`,
      faq: [[`How many points is a speeding ticket in ${s.name}?`, s.name === "Texas" || s.name === "Mississippi" ? `${s.name} doesn't add driver license points for speeding, though convictions stay on your record.` : `It depends on how fast you were going — see the points shown for your speed. ${s.note}`], [`Can I take traffic school in ${s.name}?`, "Many courts offer defensive driving or deferral to dismiss the ticket or keep points off your record — ask the court before the due date."]],
    }),
  ),
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
