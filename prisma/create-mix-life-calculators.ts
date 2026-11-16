// One-time (but safe to re-run) batch setup script: 6 tools from the mixed keyword check
// (16 Nov 2026 — Claude outputs/Mixed_Keyword_Check.md): chronological (testing) age, age
// difference, generation, miles to steps, day trading and surface feet per minute.
// Formulas: src/lib/calc-engine-mix-life.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-mix-life-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-mix-life";
import { mk, num, dd, pct, date, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.mixLifeCustomCalculators;

const SCHOOL: ToolDef[] = [
  mk({
    slug: "chronological-age-calculator", title: "Chronological Age Calculator (Testing Age, Years;Months;Days)",
    meta: "Chronological Age Calculator for Testing — Years;Months;Days",
    desc: "Work out a child's chronological age on the test date in years;months;days for psychological, speech and educational tests (WISC, WIAT, CELF, Bayley, WJ). It uses the test-manual 30-day borrowing rule, optional rounding and age corrected for prematurity.",
    inputs: [date("birth", "Date of Birth", 17532), date("test", "Test Date", "today"), dd("method", "Subtraction Method", E.CA_METHODS, 0), dd("round", "Rounding", E.CA_ROUND, 0), num("gestation", "Weeks Gestation at Birth (40 = full term)", 40, 22, 42, 1)],
    results: [["ca", "Chronological Age (y;m;d)", "t"], ["words", "In Words", "t"], ["months", "Total Months", "n", 0], ["decimal", "Decimal Age", "t"], ["rounded", "Rounded Age", "t"], ["corrected", "Corrected Age (Prematurity)", "t"], ["working", "Working", "t"]],
    fn: C["chronological-age-calculator"], ex: { birth: 17532, test: 20408, method: 0, round: 0, gestation: 40 },
    exText: (o) => `Example: a child born on 1 January 2018 and tested on 16 November 2025 has a chronological age of ${o.ca} (${o.words}).`,
    how: "Write the test date as year, month, day and the birth date underneath, then subtract days, months and years in that order. If the days are negative, borrow one month and add 30 days. If the months are negative, borrow one year and add 12 months. This is how most test record forms (Pearson, WPS, Riverside) teach it, and it gives the age used to look up norms.\n\nChoose Calendar-exact to borrow the real length of the previous month instead. The two can differ by a day or two.\n\nFor babies born before 37 weeks, enter the weeks of gestation. The corrected (adjusted) age subtracts the weeks born early; Bayley and most infant tests use it until 24 months.",
    assume: "Always follow the scoring rules in your test's manual. Most current tests (WISC-V, WIAT-4, KTEA-3, CELF-5) don't round, and a few older ones round 15 or more days up to the next month. Corrected age = chronological age − (40 − gestational weeks) weeks.",
    faq: [["How do you calculate chronological age?", "Subtract the birth date from the test date (year, month, day), borrowing 30 days or 12 months when needed. Born 2015-08-25 and tested 2025-03-10: 10 days − 25 days → borrow a month: 40 − 25 = 15 days, 2 − 8 months → borrow a year: 14 − 8 = 6 months, 2024 − 2015 = 9 years. The age is 9;6;15."], ["What does 7;10;15 mean?", "7 years, 10 months and 15 days."], ["When should I use corrected age?", "For children born before 37 weeks, usually until age 2 (24 months chronological age)."], ["Does Pearson round chronological age?", "Q-global and most current Pearson tests don't round; check your test's manual."]],
  }),
];

const MATH: ToolDef[] = [
  mk({
    slug: "age-difference-calculator", title: "Age Difference Calculator (Age Gap Between Two People)",
    meta: "Age Difference Calculator — Age Gap in Years, Months, Days",
    desc: "Find the exact age difference between two people from their birth dates in years, months and days, plus total months, weeks and days, who is older, their ages today and the half-your-age-plus-seven rule.",
    inputs: [date("a", "Person A's Date of Birth", 7305), date("b", "Person B's Date of Birth", 8766), date("asof", "Ages as of", "today")],
    results: [["gap", "Age Difference", "t"], ["older", "Who Is Older", "t"], ["years", "In Decimal Years", "t"], ["months", "In Months", "t"], ["weeks", "In Weeks", "t"], ["days", "In Days", "t"], ["ages", "Their Ages", "t"], ["rule", "Half-Plus-Seven Rule", "t"]],
    fn: C["age-difference-calculator"], ex: { a: 7305, b: 8766, asof: 20454 },
    exText: (o) => `Example: someone born on 1 January 1990 and someone born on 1 January 1994 are ${o.gap} apart (${o.days} days).`,
    how: "Enter both birth dates. The calculator counts whole years, then whole months, then the days left from the earlier birthday to the later one, so leap years and month lengths are handled exactly.\n\nThe gap between two people never changes, but their ages do. Pick an \"as of\" date to see how old each was then.",
    assume: "Gregorian calendar, whole days. The half-your-age-plus-seven rule is a popular rule of thumb, not a scientific standard.",
    faq: [["How do I calculate the age difference between two people?", "Subtract the earlier birth date from the later one in years, months and days. 1 March 1988 to 15 July 1992 is 4 years, 4 months, 14 days."], ["What is the half-your-age-plus-seven rule?", "A rule of thumb that the youngest partner age that is \"socially acceptable\" is half your age plus seven. 40 → 27."], ["Does an age gap change over time?", "No. The gap in years stays the same, but it becomes a smaller share of both ages."]],
  }),
];

const FUN: ToolDef[] = [
  mk({
    slug: "generation-calculator", title: "Generation Calculator (What Generation Am I?)",
    meta: "What Generation Am I? Generation Calculator by Birth Year",
    desc: "Find which generation you belong to from your birth year: Boomer, Gen X, Millennial, Gen Z, Gen Alpha or Gen Beta. It also shows the year range, whether you're on a cusp (Xennial, Zillennial) and your age this year.",
    inputs: [num("year", "Birth Year", 1990, 1883, 2039, 1)],
    results: [["generation", "Your Generation", "t"], ["years", "Born", "t"], ["about", "About", "t"], ["cusp", "Cusp", "t"], ["age", "Age", "t"], ["neighbours", "Neighbouring Generations", "t"]],
    fn: C["generation-calculator"], ex: { year: 1990 },
    exText: (o) => `Example: someone born in 1990 is a ${String(o.generation).replace(/s \(Gen Y\)$/, "")} (${o.years}).`,
    how: "Enter the year you were born. Generations are groups of birth years that grew up at the same time:\n\nSilent 1928–1945, Baby Boomers 1946–1964, Gen X 1965–1980, Millennials 1981–1996, Gen Z 1997–2012, Gen Alpha 2013–2024 and Gen Beta 2025–2039.",
    assume: "Ranges from Boomers to Gen Z follow the Pew Research Center. Pew hasn't defined Gen Alpha, so Alpha (2013–2024) and Beta (2025–2039) use McCrindle's widely quoted dates; some sources start Alpha in 2010. Generation boundaries are conventions, not hard lines.",
    faq: [["What years are Millennials?", "1981–1996 (Pew Research Center)."], ["What years are Gen Z?", "1997–2012."], ["What generation is 1980?", "Generation X, the last Gen X year. It's also in the Xennial cusp (1977–1983)."], ["What generation is born in 2025?", "Generation Beta (2025–2039)."]],
  }),
];

const HIKING: ToolDef[] = [
  mk({
    slug: "miles-to-steps-calculator", title: "Miles to Steps Calculator (How Many Steps in a Mile?)",
    meta: "Miles to Steps Calculator — Steps per Mile by Height",
    desc: "Convert miles or kilometres to steps from your height, sex and pace (walking, brisk walking, jogging or running), or from your own step length, with steps per mile, steps per km and the time it takes.",
    inputs: [num("distance", "Distance", 1, 0.01, 1000, 0.01), dd("unit", "Distance Unit", E.MS_UNITS, 0), num("height", "Height", 69, 20, 250, 0.5), dd("hunit", "Height Unit", E.MS_HUNITS, 0), dd("sex", "Sex", E.MS_SEX, 0), dd("pace", "Pace", E.MS_PACE_LABELS, 0), num("step", "Your Step Length (same unit as height; 0 = estimate)", 0, 0, 100, 0.1)],
    results: [["steps", "Steps", "n", 0], ["perMile", "Steps per Mile", "t"], ["perKm", "Steps per Kilometre", "t"], ["stepLength", "Step Length", "t"], ["time", "Time", "t"], ["goal", "10,000 Steps Is", "t"]],
    fn: C["miles-to-steps-calculator"], ex: { distance: 1, unit: 0, height: 69, hunit: 0, sex: 0, pace: 0, step: 0 },
    exText: (o) => `Example: a 5′ 9″ man walking 1 mile takes about ${o.steps} steps (${o.stepLength}).`,
    how: "Steps = distance ÷ step length. Your walking step is about 41.5% of your height for men and 41.3% for women, so a 5′ 9″ (175 cm) man steps about 72.7 cm and takes about 2,200 steps per mile. Steps get longer as you speed up: about 55% of height jogging and 65% running.\n\nFor the best result, measure your own step: walk 20 steps, measure the distance and divide by 20.",
    assume: "Height-based step lengths are averages; leg length, terrain and fitness change them. Times assume 20, 16, 11 and 8 minutes per mile for the four paces.",
    faq: [["How many steps are in a mile?", "About 2,000–2,400 walking, and 1,400–1,800 running, depending on height."], ["How many steps is 5 km?", "About 6,500–7,000 walking for an average adult."], ["How many miles is 10,000 steps?", "About 4–5 miles walking."]],
  }),
];

const STOCKS: ToolDef[] = [
  mk({
    slug: "day-trading-calculator", title: "Day Trading Calculator (Position Size, Risk & Profit)",
    meta: "Day Trading Calculator — Position Size, Risk/Reward & P/L",
    desc: "Plan a stock day trade: shares to buy from your account size, risk % and stop-loss, then the profit at target and loss at stop after commissions. It also shows the risk/reward ratio, the win rate needed to break even and a daily-compounding projection.",
    inputs: [num("account", "Account Size ($)", 30000, 1, 1e10, 1, "$"), pct("risk", "Risk per Trade", 1), dd("side", "Direction", E.DT_SIDE, 0), num("entry", "Entry Price ($)", 50, 0.0001, 1e7, 0.01, "$"), num("stop", "Stop-Loss Price ($)", 49, 0, 1e7, 0.01, "$"), num("target", "Target Price ($)", 52.5, 0, 1e7, 0.01, "$"), num("commission", "Commission per Order ($)", 0, 0, 1000, 0.01, "$"), dd("leverage", "Buying Power", E.DT_LEV, 0), pct("daily", "Daily Gain Goal (for projection)", 0.5, 50), num("days", "Trading Days (for projection)", 20, 1, 2520, 1)],
    results: [["shares", "Shares to Trade", "t"], ["position", "Position Value", "t"], ["profit", "Profit at Target", "t"], ["loss", "Loss at Stop", "t"], ["rr", "Risk : Reward", "t"], ["breakeven", "Break-Even Win Rate", "t"], ["compound", "Compounding Projection", "t"], ["pdt", "Pattern Day Trader Rule", "t"]],
    fn: C["day-trading-calculator"], ex: { account: 30000, risk: 1, side: 0, entry: 50, stop: 49, target: 52.5, commission: 0, leverage: 0, daily: 0.5, days: 20 },
    exText: (o) => `Example: risking 1% of a $30,000 account on a $50 entry with a $49 stop gives ${o.shares} shares. At the $52.50 target that makes ${o.profit}; the stop loses ${String(o.loss).replace(/^−/, "")} (risk : reward ${o.rr}).`,
    how: "Decide how much of your account you'll lose if the stop is hit (1–2% is a common rule). Shares = risk amount ÷ (entry − stop), rounded down and capped by your buying power.\n\nRisk : reward compares the loss at the stop with the gain at the target. The break-even win rate is 1 ÷ (1 + reward/risk): with 1 : 2.5, you only need to win more than 28.6% of trades.",
    assume: "Ignores slippage, gaps through your stop, borrow fees on shorts and taxes. Commissions are charged on the entry and exit orders. The compounding projection is arithmetic, not a forecast; most day traders lose money.",
    faq: [["How many shares should I buy day trading?", "Shares = (account × risk %) ÷ (entry − stop). $30,000 × 1% = $300; ÷ $1 stop distance = 300 shares."], ["What is a good risk/reward ratio?", "Many traders want at least 1 : 2, so winners are twice the size of losers."], ["What is the pattern day trader rule?", "In the US, margin accounts under $25,000 are limited to 3 day trades in 5 business days. Check your broker for the current rule."]],
  }),
];

const MFG: ToolDef[] = [
  mk({
    slug: "surface-feet-per-minute-calculator", title: "Surface Feet per Minute Calculator (SFM ↔ RPM)",
    meta: "SFM Calculator — Surface Feet per Minute to RPM",
    desc: "Convert spindle RPM and tool or part diameter to surface feet per minute (SFM), or SFM to RPM, for milling, drilling and turning. It also suggests starting speeds for aluminium, steel, stainless, cast iron, titanium, plastics and wood with HSS or carbide tools.",
    inputs: [dd("mode", "Calculate", E.SFM_MODES, 1), num("diameter", "Tool / Part Diameter", 0.5, 0.0001, 1000, 0.001), dd("dunit", "Diameter Unit", E.SFM_DUNITS, 0), num("rpm", "Spindle Speed (RPM)", 3000, 0, 1e6, 1), num("sfm", "Cutting Speed (SFM)", 400, 0, 1e5, 1), dd("material", "Material", E.SFM_MAT_LABELS, 2), dd("tool", "Tool Material", E.SFM_TOOLS, 1)],
    results: [["result", "Answer", "t"], ["sfm", "Surface Speed", "t"], ["rpm", "Spindle Speed", "t"], ["metric", "Metric Cutting Speed", "t"], ["diameter", "Diameter", "t"], ["suggested", "Suggested Starting SFM", "t"]],
    fn: C["surface-feet-per-minute-calculator"], ex: { mode: 1, diameter: 0.5, dunit: 0, rpm: 3000, sfm: 400, material: 2, tool: 1 },
    exText: (o) => `Example: a 1/2 in carbide end mill in mild steel at 400 SFM runs at ${o.result}.`,
    how: "Surface feet per minute is how fast the cutting edge moves past the material. SFM = π × diameter (in) × RPM ÷ 12, and RPM = 12 × SFM ÷ (π × diameter). A shortcut is RPM ≈ 3.82 × SFM ÷ diameter.\n\nFor milling and drilling, use the tool's diameter. For turning on a lathe, use the part's diameter at the cut.",
    assume: "Suggested SFM values are mid-range starting points; always check your tooling maker's chart and adjust for coolant, rigidity and depth of cut. 1 SFM = 0.3048 m/min.",
    faq: [["What is SFM in machining?", "Surface feet per minute, the speed of the cutting edge over the work."], ["How do I convert SFM to RPM?", "RPM = 3.82 × SFM ÷ diameter in inches. 400 SFM with a 1/2 in tool ≈ 3,056 RPM."], ["What SFM should I use for aluminium?", "Roughly 250 SFM with HSS and 800+ with carbide."]],
  }),
];

async function main() {
  const all = [...SCHOOL, ...MATH, ...FUN, ...HIKING, ...STOCKS, ...MFG];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); for (const t of all) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("school-age-classroom-calculators", SCHOOL);
  await upsertTools("math-calculators", MATH);
  await upsertTools("tarot-astrology-fun-calculators", FUN);
  await upsertTools("hiking-calculators", HIKING);
  await upsertTools("stock-options-calculators", STOCKS);
  await upsertTools("manufacturing-metals-engineering-calculators", MFG);
}
main().catch((e) => { console.error(e); process.exit(1); });
