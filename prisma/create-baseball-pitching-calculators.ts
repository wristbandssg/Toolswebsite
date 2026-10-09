// One-time (but safe to re-run) batch setup script: creates the 11 tools of
// the baseball sub-batch B (Pitching, Velocity & Equipment). See
// src/lib/calc-engine-baseball-hitting.ts for the full list
// of 3 sub-batches (31 tools under Sports Calculators > Baseball & Softball
// Calculators), and src/lib/calc-engine-baseball-pitching.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-baseball-pitching-calculators.ts
// or
//   npm run db:create-baseball-pitching-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Baseball & Softball Calculators", slug: "baseball-softball-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for analysis, coaching and fan use. League constants (2024 MLB) change every season and official sites such as FanGraphs and Baseball-Reference may use slightly different adjustments. Follow your league's rules for equipment and pitching.";

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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });

const stat = (key: string, label: string, def: number, max = 2000) => numberField(key, label, { default: def, max });
const IP = [numberField("inningsPitched", "Innings Pitched (Whole Innings)", { default: 180, max: 500 }), dropdown("extraOuts", "Plus Extra Outs (.1 = 1, .2 = 2)", [["None (.0)", 0], ["1 out (.1)", 1], ["2 outs (.2)", 2]], 0)];
const BB = stat("walks", "Walks (BB)", 50, 500);
const K = stat("strikeouts", "Strikeouts (K)", 190, 600);
const IP_NOTE = "Innings pitched like 180.1 mean 180 innings plus 1 out (180⅓) — enter 180 and choose 1 extra out.";

const TOOLS: ToolDef[] = [
  {
    slug: "era-calculator",
    title: "ERA Calculator",
    description: "Calculate a pitcher's earned run average (ERA) from earned runs and innings pitched — for 9-inning baseball or 7- and 6-inning softball and youth games.",
    metaTitle: "ERA Calculator — Earned Run Average",
    metaDescription: "Free ERA calculator for baseball and softball. Get earned run average from earned runs and innings pitched (9, 7 or 6-inning games).",
    calcInputs: [stat("earnedRuns", "Earned Runs (ER)", 60, 500), ...IP, dropdown("gameLength", "Game Length", [["9 innings (MLB, college, pro)", 1], ["7 innings (softball, high school)", 2], ["6 innings (Little League)", 3]], 1)],
    calcResult: { label: "ERA", format: "number", decimals: 2 },
    calcResults: [num("era", "Earned Run Average (ERA)", true), num("earnedRunsPerInning", "Earned Runs per Inning", false, 3), num("inningsPitched", "Innings Pitched (Decimal)"), num("vsMlbAverage", "vs 2024 MLB ERA (4.08)")],
    instructions: "Enter earned runs and innings pitched, then the regulation game length. " + IP_NOTE,
    examples: "Example: 60 earned runs in 180 innings is a 3.00 ERA — over a run better than the 2024 MLB average of 4.08.",
    assumptions: "ERA = earned runs × game innings ÷ innings pitched. Unearned runs (after errors or passed balls that should have ended the inning) are excluded. " + DISCLAIMER,
    faq: [
      { question: "What is a good ERA?", answer: "In MLB, under 3.00 is excellent, 3.00–4.00 good and around 4.00–4.10 average." },
      { question: "How do I count partial innings?", answer: "Each out is a third of an inning — 6.2 innings means 6⅔, not 6.2." },
    ],
  },
  {
    slug: "era-plus-calculator",
    title: "ERA+ Calculator",
    description: "Calculate ERA+ — a pitcher's ERA adjusted for league and ballpark, where 100 is league average and higher is better.",
    metaTitle: "ERA+ Calculator — Adjusted ERA",
    metaDescription: "Free ERA+ calculator. Adjust ERA for league and park, where 100 is average and 150 means 50% better than league.",
    calcInputs: [numberField("era", "Pitcher ERA", { default: 3, max: 50, step: 0.01 }), numberField("leagueEra", "League ERA", { default: 4.08, max: 20, step: 0.01 }), numberField("parkFactor", "Park Factor (100 = Neutral)", { default: 100, min: 50, max: 150 })],
    calcResult: { label: "ERA+", format: "number" },
    calcResults: [num("eraPlus", "ERA+", true), num("percentBetterThanLeague", "Percent Better Than League"), num("parkAdjustedLeagueEra", "Park-Adjusted League ERA")],
    instructions: "Enter the pitcher's ERA, the league ERA (2024 MLB: 4.08) and the home park factor (above 100 favours hitters).",
    examples: "Example: a 3.00 ERA in a 4.08 league and a neutral park is an ERA+ of 136 — 36% better than average.",
    assumptions: "ERA+ = 100 × league ERA × park factor ÷ ERA (Baseball-Reference style). Because ERA is in the denominator, ERA+ rises quickly for very low ERAs. " + DISCLAIMER,
    faq: [
      { question: "What is a good ERA+?", answer: "100 is average; 125+ is very good and 150+ is Cy Young level." },
      { question: "Why does a hitter's park raise ERA+?", answer: "Allowing the same ERA in a hitter-friendly park is harder, so the pitcher gets extra credit." },
    ],
  },
  {
    slug: "whip-calculator",
    title: "WHIP Calculator",
    description: "Calculate WHIP (walks plus hits per inning pitched) — how many baserunners a pitcher allows each inning.",
    metaTitle: "WHIP Calculator — Walks + Hits per Inning",
    metaDescription: "Free WHIP calculator. Get walks plus hits per inning pitched, baserunners per 9 and a rating for any pitcher.",
    calcInputs: [BB, stat("hits", "Hits Allowed (H)", 160, 600), ...IP],
    calcResult: { label: "WHIP", format: "number", decimals: 2 },
    calcResults: [num("whip", "WHIP", true), num("baserunnersAllowed", "Walks + Hits Allowed"), num("baserunnersPer9", "Walks + Hits per 9 Innings"), num("rating", "Rating (1 Excellent, 2 Great, 3 Average, 4 Below)")],
    instructions: "Enter walks and hits allowed and innings pitched. " + IP_NOTE,
    examples: "Example: 50 walks and 160 hits in 180 innings is a 1.17 WHIP — great.",
    assumptions: "WHIP = (BB + H) ÷ IP. Hit batters and errors aren't included. Scale: under 1.00 excellent, under 1.20 great, about 1.30 average. " + DISCLAIMER,
    faq: [
      { question: "What is a good WHIP?", answer: "Around 1.30 is average in MLB; under 1.10 is excellent." },
      { question: "Does WHIP include hit batters?", answer: "No — only walks and hits." },
    ],
  },
  {
    slug: "fip-calculator",
    title: "FIP Calculator",
    description: "Calculate FIP (fielding independent pitching) from home runs, walks, hit batters, strikeouts and innings — the ERA a pitcher 'deserves' regardless of defence.",
    metaTitle: "FIP Calculator — Fielding Independent Pitching",
    metaDescription: "Free FIP calculator with the 2024 FIP constant. Get fielding independent pitching from HR, BB, HBP, K and innings, and compare with ERA.",
    calcInputs: [stat("homeRuns", "Home Runs Allowed (HR)", 20, 200), BB, stat("hitByPitch", "Hit Batters (HBP)", 5, 100), K, ...IP, numberField("fipConstant", "FIP Constant", { default: 3.166, min: 2, max: 5, step: 0.001 }), numberField("era", "Pitcher ERA (to Compare)", { default: 3, max: 50, step: 0.01 })],
    calcResult: { label: "FIP", format: "number", decimals: 2 },
    calcResults: [num("fip", "FIP", true), num("fipWithoutConstant", "FIP Before Constant"), num("eraMinusFip", "ERA − FIP (+ Unlucky, − Lucky)"), num("constantUsed", "Constant Used", false, 3)],
    instructions: "Enter home runs, walks, hit batters and strikeouts allowed, innings pitched and optionally the ERA. The constant defaults to 2024 MLB (3.166). " + IP_NOTE,
    examples: "Example: 20 HR, 50 BB, 5 HBP and 190 K over 180 innings is a 3.42 FIP — the 3.00 ERA has been about 0.4 runs better than the peripherals suggest.",
    assumptions: "FIP = (13 HR + 3 (BB + HBP) − 2 K) ÷ IP + FIP constant (FanGraphs). The constant scales FIP to league ERA and changes each season. " + DISCLAIMER,
    faq: [
      { question: "Why use FIP instead of ERA?", answer: "It strips out defence and batted-ball luck, so it predicts future ERA better than ERA itself." },
      { question: "What is a good FIP?", answer: "Like ERA — about 4.00–4.10 is average, under 3.20 excellent." },
    ],
  },
  {
    slug: "k-9-calculator",
    title: "K/9 Calculator",
    description: "Calculate strikeouts per nine innings (K/9) for a pitcher, plus strikeouts per inning and strikeout-to-walk ratio.",
    metaTitle: "K/9 Calculator — Strikeouts per 9 Innings",
    metaDescription: "Free K/9 calculator. Get strikeouts per nine innings, strikeouts per inning and K/BB ratio for any pitcher.",
    calcInputs: [K, ...IP, BB],
    calcResult: { label: "K/9", format: "number", decimals: 2 },
    calcResults: [num("strikeoutsPer9", "Strikeouts per 9 Innings (K/9)", true), num("strikeoutsPerInning", "Strikeouts per Inning", false, 3), num("strikeoutToWalkRatio", "Strikeout-to-Walk Ratio (K/BB)")],
    instructions: "Enter strikeouts, innings pitched and walks. " + IP_NOTE,
    examples: "Example: 190 strikeouts in 180 innings is 9.5 K/9, with a 3.8 K/BB ratio against 50 walks.",
    assumptions: "K/9 = K × 9 ÷ IP. MLB averages are about 8.5–9.0 K/9. K/9 is inflated for pitchers who face more batters — K% (Strikeout Rate Calculator) is the cleaner measure. " + DISCLAIMER,
    faq: [
      { question: "What is a good K/9?", answer: "About 8.5 is average for a starter; 10+ is elite." },
      { question: "What is a good K/BB ratio?", answer: "3.0 is good and 4.0+ is excellent command." },
    ],
  },
  {
    slug: "bb-9-calculator",
    title: "BB/9 Calculator",
    description: "Calculate walks per nine innings (BB/9) to measure a pitcher's control.",
    metaTitle: "BB/9 Calculator — Walks per 9 Innings",
    metaDescription: "Free BB/9 calculator. Get walks per nine innings and walks per inning to rate a pitcher's control.",
    calcInputs: [BB, ...IP],
    calcResult: { label: "BB/9", format: "number", decimals: 2 },
    calcResults: [num("walksPer9", "Walks per 9 Innings (BB/9)", true), num("walksPerInning", "Walks per Inning", false, 3), num("rating", "Control (1 Excellent, 2 Good, 3 Average, 4 Poor)")],
    instructions: "Enter walks and innings pitched. " + IP_NOTE,
    examples: "Example: 50 walks in 180 innings is 2.5 BB/9 — good control.",
    assumptions: "BB/9 = BB × 9 ÷ IP. Scale: under 2.0 excellent, 2.0–3.0 good, 3.0–4.0 average, above 4.0 poor. Intentional walks are usually included. " + DISCLAIMER,
    faq: [
      { question: "What is a good BB/9?", answer: "Under 2.5 is good; MLB average is around 3.0–3.3." },
      { question: "BB/9 or BB%?", answer: "BB% (per batter faced) is more precise; BB/9 is the traditional rate." },
    ],
  },
  {
    slug: "strike-percentage-calculator",
    title: "Strike Percentage Calculator",
    description: "Calculate a pitcher's strike percentage from strikes and total pitches — plus first-pitch strike percentage.",
    metaTitle: "Strike Percentage Calculator — Strike % & FPS%",
    metaDescription: "Free strike percentage calculator for pitchers. Get strike %, balls, strike-to-ball ratio and first-pitch strike %.",
    calcInputs: [stat("strikes", "Strikes Thrown", 1900, 10000), stat("totalPitches", "Total Pitches", 3000, 20000), stat("firstPitchStrikes", "First-Pitch Strikes (Optional)", 0, 2000), stat("battersFaced", "Batters Faced (Optional)", 0, 2000)],
    calcResult: { label: "Strike %", format: "percentage" },
    calcResults: [pct("strikePercentage", "Strike Percentage", true), num("balls", "Balls"), pct("firstPitchStrikePercentage", "First-Pitch Strike %"), num("strikesToBallsRatio", "Strikes per Ball")],
    instructions: "Enter strikes and total pitches from a pitch count. For first-pitch strike %, add first-pitch strikes and batters faced.",
    examples: "Example: 1,900 strikes in 3,000 pitches is a 63.3% strike rate — right at MLB norms.",
    assumptions: "Strike % = strikes ÷ pitches; strikes include called and swinging strikes, fouls and balls put in play. MLB averages about 63–64%; aim for 60%+ in youth baseball. " + DISCLAIMER,
    faq: [
      { question: "What is a good strike percentage?", answer: "60%+ is solid; 65%+ is excellent." },
      { question: "Why does first-pitch strike % matter?", answer: "Getting ahead 0-1 sharply lowers what hitters produce in the at bat." },
    ],
  },
  {
    slug: "pitch-speed-calculator",
    title: "Pitch Speed Calculator",
    description: "Calculate pitch speed in mph and km/h from the distance the ball travels and its flight time (e.g. from video or a stopwatch).",
    metaTitle: "Pitch Speed Calculator — MPH from Distance & Time",
    metaDescription: "Free pitch speed calculator. Get pitch velocity in mph and km/h from distance and time, for baseball or softball.",
    calcInputs: [dropdown("unit", "Distance Unit", [["Feet", 1], ["Metres", 2]], 1), numberField("distance", "Distance from Release to Catch", { default: 55, min: 1, max: 200, step: 0.1 }), numberField("timeSeconds", "Flight Time (s)", { default: 0.42, min: 0.01, max: 5, step: 0.001 })],
    calcResult: { label: "Pitch Speed", format: "number" },
    calcResults: [num("speedMph", "Average Speed (mph)", true), num("speedKmh", "Average Speed (km/h)"), num("feetPerSecond", "Feet per Second"), num("metresPerSecond", "Metres per Second")],
    instructions: "Measure the time from release to the catcher's glove (video frame counting works well) and enter the distance it travelled — the release point is a few feet in front of the rubber.",
    examples: "Example: a pitch released 55 ft from the plate that arrives in 0.42 s averages about 89.3 mph (143.7 km/h).",
    assumptions: "Speed = distance ÷ time — the average speed. Radar guns read release (peak) speed, which is about 8–10% higher than the average because the ball slows in flight. At 30 fps video each frame is 0.033 s, so time carefully. " + DISCLAIMER,
    faq: [
      { question: "Why is my calculated speed lower than the radar gun?", answer: "Radar reads speed at release; the ball loses roughly 1 mph every 7 ft, so the average over the flight is lower." },
      { question: "How far is the release point from home plate?", answer: "About 54–55 ft for MLB pitchers (60.5 ft rubber minus a 5.5–6.5 ft stride extension)." },
    ],
  },
  {
    slug: "pitch-speed-equivalent-calculator",
    title: "Pitch Speed Equivalent Calculator",
    description: "Convert a pitch speed at a shorter distance (Little League, softball) into the MLB-equivalent speed that gives the hitter the same reaction time.",
    metaTitle: "Pitch Speed Equivalent Calculator — MLB Equivalent",
    metaDescription: "Free pitch speed equivalent calculator. Convert Little League or softball pitch speed to the MLB-equivalent reaction time speed.",
    calcInputs: [numberField("speedMph", "Pitch Speed (mph)", { default: 70, max: 120, step: 0.5 }), numberField("distanceFt", "Pitching Distance (ft)", { default: 46, min: 1, max: 100, step: 0.5 }), numberField("compareDistanceFt", "Compare to Distance (ft, MLB = 60.5)", { default: 60.5, min: 1, max: 100, step: 0.5 })],
    calcResult: { label: "Equivalent Speed", format: "number" },
    calcResults: [num("equivalentSpeedMph", "Equivalent Speed (mph)", true), num("reactionTimeSeconds", "Hitter's Reaction Time (s)", false, 3), num("equivalentSpeedKmh", "Equivalent Speed (km/h)")],
    instructions: "Enter the pitch speed and the pitching distance (Little League 46 ft, 13U 50–54 ft, fastpitch softball 40–43 ft) and the distance to compare against.",
    examples: "Example: a 70 mph fastball from 46 ft (Little League) gives the hitter the same time as a 92 mph pitch from 60.5 ft — about 0.45 seconds.",
    assumptions: "Equivalent speed = speed × compare distance ÷ pitching distance (equal time to the plate). It ignores release extension and the ball slowing in flight, which affect both distances similarly. " + DISCLAIMER,
    faq: [
      { question: "Is a 65 mph softball pitch like a 90+ mph fastball?", answer: "From 43 ft, 65 mph gives about the same reaction time as roughly 91 mph from 60.5 ft." },
      { question: "How far is the Little League mound?", answer: "46 ft for Little League Major division and below; 50 ft in Intermediate (50/70) and 60.5 ft for Junior and up." },
    ],
  },
  {
    slug: "exit-velocity-calculator",
    title: "Exit Velocity / Home Run Distance Calculator",
    description: "Estimate how far a batted ball travels from its exit velocity and launch angle — with elevation and temperature — plus hang time and whether it's a barrel (also a home run distance calculator).",
    metaTitle: "Exit Velocity & Home Run Distance Calculator",
    metaDescription: "Free exit velocity calculator. Estimate home run distance, hang time and apex from exit velocity, launch angle, elevation and temperature.",
    calcInputs: [numberField("exitVelocityMph", "Exit Velocity (mph)", { default: 103, max: 125, step: 0.5 }), numberField("launchAngle", "Launch Angle (°)", { default: 28, min: -10, max: 80 }), numberField("elevationFt", "Ballpark Elevation (ft)", { default: 0, min: -500, max: 10000, step: 10 }), numberField("temperatureF", "Temperature (°F)", { default: 70, min: 20, max: 120 })],
    calcResult: { label: "Distance", format: "number" },
    calcResults: [num("distanceFt", "Projected Distance (ft)", true), num("distanceM", "Projected Distance (m)"), num("hangTimeSeconds", "Hang Time (s)"), num("apexFt", "Apex Height (ft)"), num("evFor400Ft", "Exit Velocity Needed for 400 ft (mph)"), num("barrel", "Barrel (1 Yes, 0 No)")],
    instructions: "Enter the exit velocity and launch angle (from Statcast, a HitTrax/Rapsodo session or a radar gun), plus elevation and temperature.",
    examples: "Example: a 103 mph drive at 28° carries about 414 ft at sea level on a 70 °F day — and about 440 ft at Coors Field's 5,200 ft.",
    assumptions: "A physics model of the ball's flight with air drag and typical backspin lift, calibrated so that 100 mph at 28° travels about 400 ft at sea level. Wind, spin rate and the ball itself can change real distance by 20+ ft. Barrel flag follows Statcast's rule (98+ mph at about 26–30°, widening with more speed). " + DISCLAIMER,
    faq: [
      { question: "What exit velocity hits a home run?", answer: "Most home runs leave at 95+ mph with launch angles of 25–35°; 100 mph at 28° is roughly a 400 ft drive." },
      { question: "Why does the ball carry farther at Coors Field?", answer: "Air at 5,200 ft is about 17% thinner, so there's less drag — fly balls go roughly 5–10% farther." },
    ],
  },
  {
    slug: "bat-size-calculator",
    title: "Bat Size Calculator",
    description: "Find the right baseball or softball bat length from height and weight, and the right bat weight (drop) for the league — also a bat weight calculator.",
    metaTitle: "Bat Size Calculator — Bat Length & Weight",
    metaDescription: "Free bat size calculator. Get baseball or softball bat length from height and weight, plus bat weight and drop for your league.",
    calcInputs: [numberField("heightIn", "Player Height (in)", { default: 60, min: 30, max: 90 }), numberField("weightLb", "Player Weight (lb)", { default: 100, min: 30, max: 350 }), dropdown("league", "League / Bat Type", [["Tee ball (−12)", 1], ["Youth USA Baseball (−10)", 2], ["Youth USSSA / travel (−8)", 3], ["Older youth / senior league (−5)", 4], ["High school & college BBCOR (−3)", 5], ["Fastpitch softball (−10)", 6], ["Fastpitch softball, stronger (−9)", 7]], 3)],
    calcResult: { label: "Bat Length", format: "number" },
    calcResults: [num("batLengthIn", "Recommended Bat Length (in)", true), num("batWeightOz", "Bat Weight (oz)"), num("dropUsed", "Drop (Length − Weight)"), num("lengthCm", "Bat Length (cm)")],
    instructions: "Enter the player's height and weight and choose the league or bat type. Check your league's bat rules (USA, USSSA, BBCOR) before buying.",
    examples: "Example: a 5 ft (60 in), 100 lb travel-ball player suits a 31 in bat; with a −8 drop it weighs 23 oz.",
    assumptions: "Length follows common manufacturer height charts (about 26 in under 3 ft tall up to 34 in for 6 ft+), one inch shorter for very light and longer for heavy players. Weight = length + drop (e.g. 31 in, −8 = 23 oz). Test it: the player should hold the bat out at arm's length by the handle for 20–30 seconds without it dropping. " + DISCLAIMER,
    faq: [
      { question: "What does bat drop mean?", answer: "Length minus weight — a 32 in, 29 oz bat is a −3 drop. Bigger drops are lighter and easier to swing." },
      { question: "Should my child use a longer bat to grow into?", answer: "No — a bat that's too long or heavy slows the swing and builds bad habits." },
    ],
  },
];
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_SLUG } });
  if (!parent) throw new Error(`The "${PARENT_SLUG}" category doesn't exist yet — create it in /admin first.`);
  console.log(`Creating sub-category "${cat.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory(CATEGORY);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
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
