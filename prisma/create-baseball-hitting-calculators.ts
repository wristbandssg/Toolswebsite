// One-time (but safe to re-run) batch setup script: creates the 13 tools of
// the baseball sub-batch A (Hitting Stats). See
// src/lib/calc-engine-baseball-hitting.ts for the full list
// of 3 sub-batches (31 tools under Sports Calculators > Baseball & Softball
// Calculators), and src/lib/calc-engine-baseball-hitting.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-baseball-hitting-calculators.ts
// or
//   npm run db:create-baseball-hitting-calculators

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
const AB = stat("atBats", "At Bats (AB)", 500);
const H = stat("hits", "Hits (H)", 150);
const D2 = stat("doubles", "Doubles (2B)", 30, 200);
const D3 = stat("triples", "Triples (3B)", 3, 100);
const HR = stat("homeRuns", "Home Runs (HR)", 25, 200);
const BB = stat("walks", "Walks (BB)", 60, 500);
const HBP = stat("hitByPitch", "Hit By Pitch (HBP)", 5, 200);
const SF = stat("sacFlies", "Sacrifice Flies (SF)", 5, 100);
const LINE = [AB, H, D2, D3, HR, BB, HBP, SF];
const d3 = (key: string, label: string, highlight = false) => num(key, label, highlight, 3);

const TOOLS: ToolDef[] = [
  {
    slug: "batting-average-calculator",
    title: "Batting Average Calculator",
    description: "Calculate batting average (AVG) from hits and at bats — and how many hits you need to reach a target like .300.",
    metaTitle: "Batting Average Calculator — AVG from Hits & At Bats",
    metaDescription: "Free batting average calculator for baseball and softball. Get AVG from hits and at bats and the hits needed to reach .300.",
    calcInputs: [H, AB, numberField("targetAverage", "Target Average (e.g. 0.300)", { default: 0.3, max: 1, step: 0.001 })],
    calcResult: { label: "Batting Average", format: "number", decimals: 3 },
    calcResults: [d3("battingAverage", "Batting Average (AVG)", true), num("hitsNeededForTarget", "More Hits Needed for Target (Same AB)"), num("outsMade", "At Bats Without a Hit"), d3("vsLeagueAverage", "vs 2024 MLB Average (.243)")],
    instructions: "Enter hits and official at bats (walks, hit-by-pitches, sacrifices and catcher's interference are not at bats).",
    examples: "Example: 150 hits in 500 at bats is a .300 average — 57 points above the 2024 MLB average of .243.",
    assumptions: "AVG = H ÷ AB, shown to three decimals. 'Hits needed' assumes the same number of at bats. " + DISCLAIMER,
    faq: [
      { question: "What is a good batting average?", answer: "Around .250 is average in modern MLB; .280+ is very good and .300+ excellent." },
      { question: "Do walks count against batting average?", answer: "No — walks, HBP and sacrifices aren't at bats, so they don't change AVG (they do raise OBP)." },
    ],
  },
  {
    slug: "on-base-percentage-calculator",
    title: "On-Base Percentage (OBP) Calculator",
    description: "Calculate on-base percentage (OBP) from hits, walks, hit-by-pitches, at bats and sacrifice flies.",
    metaTitle: "On-Base Percentage (OBP) Calculator",
    metaDescription: "Free OBP calculator. Get on-base percentage from hits, walks, HBP, at bats and sacrifice flies for baseball or softball.",
    calcInputs: [H, BB, HBP, AB, SF],
    calcResult: { label: "OBP", format: "number", decimals: 3 },
    calcResults: [d3("onBasePercentage", "On-Base Percentage (OBP)", true), num("timesOnBase", "Times on Base"), num("plateAppearancesUsed", "Plate Appearances Counted"), d3("vsLeagueAverage", "vs 2024 MLB Average (.312)")],
    instructions: "Enter hits, walks, hit-by-pitches, at bats and sacrifice flies.",
    examples: "Example: 150 H, 60 BB and 5 HBP in 500 AB with 5 SF is a .377 OBP.",
    assumptions: "OBP = (H + BB + HBP) ÷ (AB + BB + HBP + SF). Reaching on an error or fielder's choice doesn't count; sacrifice bunts are excluded. " + DISCLAIMER,
    faq: [
      { question: "What is a good OBP?", answer: "About .320 is average; .360+ is very good and .400+ elite." },
      { question: "Why do sacrifice flies count in OBP but not AVG?", answer: "OBP's denominator includes sacrifice flies, so a sac fly slightly lowers OBP while leaving AVG unchanged." },
    ],
  },
  {
    slug: "slugging-percentage-calculator",
    title: "Slugging Percentage Calculator",
    description: "Calculate slugging percentage (SLG) from hits, doubles, triples, home runs and at bats — plus isolated power (ISO).",
    metaTitle: "Slugging Percentage Calculator — SLG & ISO",
    metaDescription: "Free slugging percentage calculator. Get SLG, total bases and isolated power (ISO) from hits, extra-base hits and at bats.",
    calcInputs: [AB, H, D2, D3, HR],
    calcResult: { label: "SLG", format: "number", decimals: 3 },
    calcResults: [d3("sluggingPercentage", "Slugging Percentage (SLG)", true), num("totalBases", "Total Bases"), d3("isolatedPower", "Isolated Power (ISO)"), d3("battingAverage", "Batting Average"), num("singles", "Singles")],
    instructions: "Enter at bats, total hits and the doubles, triples and home runs included in those hits.",
    examples: "Example: 150 hits (30 doubles, 3 triples, 25 home runs) in 500 at bats is 261 total bases — a .522 SLG and .222 ISO.",
    assumptions: "SLG = total bases ÷ AB; singles = H − 2B − 3B − HR; ISO = SLG − AVG. 2024 MLB average SLG was .399. " + DISCLAIMER,
    faq: [
      { question: "What is a good slugging percentage?", answer: "About .400 is average; .500+ is excellent power." },
      { question: "What does ISO measure?", answer: "Raw power — extra bases per at bat. .200+ is strong power." },
    ],
  },
  {
    slug: "ops-calculator",
    title: "OPS Calculator",
    description: "Calculate OPS (on-base plus slugging) from a full batting line — with OBP, SLG and AVG along the way.",
    metaTitle: "OPS Calculator — On-Base Plus Slugging",
    metaDescription: "Free OPS calculator. Get on-base plus slugging from AB, hits, doubles, triples, homers, walks, HBP and sac flies.",
    calcInputs: LINE,
    calcResult: { label: "OPS", format: "number", decimals: 3 },
    calcResults: [d3("ops", "OPS", true), d3("onBasePercentage", "OBP"), d3("sluggingPercentage", "SLG"), d3("battingAverage", "AVG"), num("rating", "Rating (1 Excellent, 2 Very Good, 3 Average, 4 Below)")],
    instructions: "Enter the hitter's season line. Doubles, triples and homers are part of the hits total.",
    examples: "Example: a .300 hitter with 30 doubles, 3 triples, 25 homers and 60 walks in 500 AB has a .377 OBP and .522 SLG — a .899 OPS.",
    assumptions: "OPS = OBP + SLG. Rough scale: .900+ excellent, .800+ very good, .700+ average, below .700 below average (2024 MLB average ≈ .711). " + DISCLAIMER,
    faq: [
      { question: "What is a good OPS?", answer: "About .710 is league average; .800 is very good and .900+ is All-Star level." },
      { question: "Is OPS better than batting average?", answer: "Yes — it includes walks and power, so it tracks run scoring much more closely than AVG." },
    ],
  },
  {
    slug: "ops-plus-calculator",
    title: "OPS+ Calculator",
    description: "Calculate OPS+ — OPS adjusted for the league and ballpark, where 100 is league average.",
    metaTitle: "OPS+ Calculator — Adjusted OPS",
    metaDescription: "Free OPS+ calculator. Adjust a hitter's OBP and SLG for league and park, where 100 is average and 150 is 50% better.",
    calcInputs: [numberField("obp", "Player OBP", { default: 0.377, max: 1, step: 0.001 }), numberField("slg", "Player SLG", { default: 0.522, max: 4, step: 0.001 }), numberField("leagueObp", "League OBP", { default: 0.312, max: 1, step: 0.001 }), numberField("leagueSlg", "League SLG", { default: 0.399, max: 4, step: 0.001 }), numberField("parkFactor", "Park Factor (100 = Neutral)", { default: 100, min: 50, max: 150 })],
    calcResult: { label: "OPS+", format: "number" },
    calcResults: [num("opsPlus", "OPS+", true), num("opsPlusBeforePark", "OPS+ Before Park Adjustment"), d3("ops", "Player OPS"), d3("leagueOps", "League OPS")],
    instructions: "Enter the player's OBP and SLG, the league's OBP and SLG (2024 MLB: .312 / .399) and the home park factor.",
    examples: "Example: a .377 OBP and .522 SLG against a .312 / .399 league in a neutral park is an OPS+ of 152 — 52% better than average.",
    assumptions: "OPS+ = 100 × (OBP ÷ lgOBP + SLG ÷ lgSLG − 1) ÷ park factor (a simplified version of Baseball-Reference's method, which also removes pitchers and uses multi-year park factors). " + DISCLAIMER,
    faq: [
      { question: "What is a good OPS+?", answer: "100 is average; 120+ very good, 140+ excellent and 160+ MVP-level." },
      { question: "Why adjust for the park?", answer: "Hitter-friendly parks like Coors Field inflate OPS; dividing by the park factor puts everyone on the same footing." },
    ],
  },
  {
    slug: "total-bases-calculator",
    title: "Total Bases Calculator",
    description: "Calculate total bases from singles, doubles, triples and home runs — plus extra-base hits and slugging percentage.",
    metaTitle: "Total Bases Calculator — TB from Hits",
    metaDescription: "Free total bases calculator. Get total bases, extra-base hits and slugging from singles, doubles, triples and home runs.",
    calcInputs: [stat("singles", "Singles (1B)", 92), D2, D3, HR, AB],
    calcResult: { label: "Total Bases", format: "number" },
    calcResults: [num("totalBases", "Total Bases (TB)", true), num("hits", "Total Hits"), num("extraBaseHits", "Extra-Base Hits"), d3("sluggingPercentage", "Slugging Percentage")],
    instructions: "Enter singles, doubles, triples and home runs. Add at bats to get slugging percentage.",
    examples: "Example: 92 singles, 30 doubles, 3 triples and 25 home runs are 261 total bases — a .522 SLG over 500 at bats.",
    assumptions: "TB = 1B + 2 × 2B + 3 × 3B + 4 × HR. Walks, HBP and reaching on errors don't count. Useful for 'total bases' player props too. " + DISCLAIMER,
    faq: [
      { question: "Does a walk count as a total base?", answer: "No — total bases only count bases from hits." },
      { question: "Who holds the single-season total bases record?", answer: "Babe Ruth, with 457 in 1921." },
    ],
  },
  {
    slug: "babip-calculator",
    title: "BABIP Calculator",
    description: "Calculate BABIP (batting average on balls in play) for a hitter or pitcher — a key sign of luck and contact quality.",
    metaTitle: "BABIP Calculator — Batting Average on Balls in Play",
    metaDescription: "Free BABIP calculator. Get batting average on balls in play from hits, home runs, at bats, strikeouts and sac flies.",
    calcInputs: [H, HR, AB, stat("strikeouts", "Strikeouts (K)", 110, 500), SF],
    calcResult: { label: "BABIP", format: "number", decimals: 3 },
    calcResults: [d3("babip", "BABIP", true), num("ballsInPlay", "Balls in Play"), num("hitsInPlay", "Hits in Play"), d3("vsLeagueTypical", "vs Typical League BABIP (.291)")],
    instructions: "Enter hits, home runs, at bats, strikeouts and sacrifice flies — for a hitter, or allowed by a pitcher.",
    examples: "Example: 150 hits with 25 homers in 500 AB, 110 strikeouts and 5 sac flies is a .338 BABIP — about 47 points above the usual league level.",
    assumptions: "BABIP = (H − HR) ÷ (AB − K − HR + SF). League BABIP sits near .290–.300 most years. Hitters can sustain higher BABIPs with speed and hard contact; pitchers usually regress toward league average. " + DISCLAIMER,
    faq: [
      { question: "Is a high BABIP just luck?", answer: "Partly — for pitchers it's mostly luck and defence; for hitters, line drives, hard contact and speed also matter." },
      { question: "What is a normal BABIP?", answer: "Around .290–.300 for MLB as a whole." },
    ],
  },
  {
    slug: "woba-calculator",
    title: "wOBA Calculator",
    description: "Calculate wOBA (weighted on-base average) from a batting line using FanGraphs 2024 linear weights — and the runs above average it represents.",
    metaTitle: "wOBA Calculator — Weighted On-Base Average",
    metaDescription: "Free wOBA calculator using 2024 linear weights. Get weighted on-base average and weighted runs above average (wRAA).",
    calcInputs: [...LINE, stat("intentionalWalks", "Intentional Walks (IBB, Included in BB)", 5, 200)],
    calcResult: { label: "wOBA", format: "number", decimals: 3 },
    calcResults: [d3("woba", "wOBA", true), d3("vsLeagueAverage", "vs 2024 League wOBA (.310)"), num("weightedRunsAboveAverage", "Weighted Runs Above Average (wRAA)"), num("plateAppearances", "Plate Appearances")],
    instructions: "Enter the hitter's full line, including how many of the walks were intentional.",
    examples: "Example: a .300 / .377 / .522 line (500 AB, 30 2B, 3 3B, 25 HR, 60 BB with 5 intentional, 5 HBP, 5 SF) is a .383 wOBA — about 33 runs above average.",
    assumptions: "wOBA = (0.689 uBB + 0.720 HBP + 0.882 1B + 1.254 2B + 1.590 3B + 2.050 HR) ÷ (AB + BB − IBB + SF + HBP), with FanGraphs 2024 weights; wRAA = (wOBA − .310) ÷ 1.242 × PA. Weights change slightly every season. " + DISCLAIMER,
    faq: [
      { question: "What is a good wOBA?", answer: "League average is about .310–.320; .340 is above average, .370 great and .400+ excellent." },
      { question: "Why is wOBA better than OPS?", answer: "It weights each way of reaching base by its actual run value, and it's on the same scale as OBP." },
    ],
  },
  {
    slug: "wrc-plus-calculator",
    title: "wRC+ Calculator",
    description: "Calculate wRC+ (weighted runs created plus) from wOBA and plate appearances — adjusted for league and park, where 100 is average.",
    metaTitle: "wRC+ Calculator — Weighted Runs Created Plus",
    metaDescription: "Free wRC+ calculator. Turn wOBA and PA into wRC+, wRAA and wRC, adjusted for league run environment and park.",
    calcInputs: [numberField("woba", "Player wOBA", { default: 0.38, max: 1, step: 0.001 }), stat("plateAppearances", "Plate Appearances (PA)", 600, 1000), numberField("leagueWoba", "League wOBA", { default: 0.31, max: 1, step: 0.001 }), numberField("wobaScale", "wOBA Scale", { default: 1.242, min: 0.1, max: 2, step: 0.001 }), numberField("leagueRunsPerPa", "League Runs per PA", { default: 0.117, max: 1, step: 0.001 }), numberField("parkFactor", "Park Factor (100 = Neutral)", { default: 100, min: 50, max: 150 })],
    calcResult: { label: "wRC+", format: "number" },
    calcResults: [num("wrcPlus", "wRC+", true), num("weightedRunsAboveAverage", "wRAA (Runs Above Average)"), num("weightedRunsCreated", "wRC (Runs Created)")],
    instructions: "Enter the player's wOBA (use the wOBA Calculator) and plate appearances. League constants default to 2024 MLB values.",
    examples: "Example: a .380 wOBA over 600 PA with 2024 constants in a neutral park is a 148 wRC+ — 48% better than league average, worth about 34 runs above average.",
    assumptions: "wRAA = (wOBA − lgwOBA) ÷ scale × PA; wRC+ = ((wRAA/PA + lgR/PA) + (lgR/PA − PF × lgR/PA)) ÷ lgR/PA × 100. FanGraphs also compares against non-pitcher league wRC/PA and uses its own park factors, so official values can differ by a few points. " + DISCLAIMER,
    faq: [
      { question: "What is a good wRC+?", answer: "100 is average; 115 above average, 130 great and 160+ elite." },
      { question: "wRC+ or OPS+?", answer: "Both are park- and league-adjusted; wRC+ uses run-based weights, so it's slightly more accurate." },
    ],
  },
  {
    slug: "runs-created-calculator",
    title: "Runs Created Calculator",
    description: "Calculate Bill James' Runs Created — basic and technical versions — plus runs created per 27 outs.",
    metaTitle: "Runs Created Calculator — Bill James RC",
    metaDescription: "Free runs created calculator. Get Bill James' basic and technical Runs Created and RC/27 from a full batting line.",
    calcInputs: [...LINE, stat("intentionalWalks", "Intentional Walks (IBB)", 5, 200), stat("stolenBases", "Stolen Bases (SB)", 10, 200), stat("caughtStealing", "Caught Stealing (CS)", 3, 100), stat("sacHits", "Sacrifice Hits / Bunts (SH)", 0, 100), stat("groundedIntoDp", "Grounded Into Double Plays (GIDP)", 10, 100)],
    calcResult: { label: "Runs Created", format: "number" },
    calcResults: [num("runsCreatedTechnical", "Runs Created (Technical)", true), num("runsCreatedBasic", "Runs Created (Basic)"), num("runsCreatedPer27Outs", "Runs Created per 27 Outs"), num("outsMade", "Outs Made")],
    instructions: "Enter the season batting line, including baserunning and situational stats for the technical version.",
    examples: "Example: the default .300 / .377 / .522 line with 10 SB, 3 CS and 10 GIDP creates about 101 runs (technical) or 98 (basic) — about 7.4 runs per 27 outs.",
    assumptions: "Basic RC = (H + BB) × TB ÷ (AB + BB). Technical RC = (H + BB + HBP − CS − GIDP) × (TB + 0.26 (BB − IBB + HBP) + 0.52 (SH + SF + SB)) ÷ (AB + BB + HBP + SH + SF). Outs = AB − H + CS + SH + SF + GIDP. " + DISCLAIMER,
    faq: [
      { question: "What is a good Runs Created total?", answer: "100+ in a full season is excellent; league-average regulars land around 70–80." },
      { question: "What does RC/27 mean?", answer: "Runs a team of nine of this hitter would score per game (27 outs). MLB average is roughly 4.5." },
    ],
  },
  {
    slug: "expected-batting-average-calculator",
    title: "Expected Batting Average (xBA) Calculator",
    description: "Estimate expected batting average (xBA) from a hitter's quality of contact — barrels, solid contact, flares, topped, under and weak — and compare it with actual AVG.",
    metaTitle: "Expected Batting Average (xBA) Calculator",
    metaDescription: "Free xBA calculator. Estimate expected batting average from Statcast quality-of-contact counts and compare with actual AVG.",
    calcInputs: [AB, H, stat("barrels", "Barrels", 40, 500), stat("solidContact", "Solid Contact", 30, 500), stat("flaresBurners", "Flares & Burners", 100, 500), stat("topped", "Topped", 130, 500), stat("under", "Hit Under", 70, 500), stat("weak", "Weak", 20, 500)],
    calcResult: { label: "xBA", format: "number", decimals: 3 },
    calcResults: [d3("expectedBattingAverage", "Expected Batting Average (xBA)", true), num("expectedHits", "Expected Hits"), d3("actualAverage", "Actual Batting Average"), d3("luckDifference", "Actual − Expected (+ Lucky, − Unlucky)"), num("battedBalls", "Batted Balls Entered"), pct("barrelRate", "Barrel Rate (per Batted Ball)")],
    instructions: "Enter at bats and hits, then the hitter's batted balls in each Statcast quality-of-contact category (from Baseball Savant). Strikeouts count as at bats with zero hit chance.",
    examples: "Example: in 500 AB, 40 barrels, 30 solid, 100 flares/burners, 130 topped, 70 under and 20 weak contacts are worth about 154 expected hits — an xBA of .308 against an actual .300.",
    assumptions: "Each category is credited with its typical MLB batting average (barrel ≈ .810, solid ≈ .491, flare/burner ≈ .661, topped ≈ .240, under ≈ .080, weak ≈ .190). Statcast's official xBA uses exit velocity, launch angle and sprint speed per batted ball, so this is an approximation. " + DISCLAIMER,
    faq: [
      { question: "What does xBA tell you?", answer: "What a hitter's average 'should' be from the quality of contact — a big gap from actual AVG often signals luck that will even out." },
      { question: "What is a barrel?", answer: "A batted ball with an exit velocity and launch angle that historically produce at least a .500 average and 1.500 SLG — 98+ mph at about 26–30°." },
    ],
  },
  {
    slug: "strikeout-rate-calculator",
    title: "Strikeout Rate Calculator",
    description: "Calculate strikeout rate (K%) — strikeouts per plate appearance for hitters or per batter faced for pitchers.",
    metaTitle: "Strikeout Rate Calculator — K% for Hitters & Pitchers",
    metaDescription: "Free strikeout rate calculator. Get K% from strikeouts and plate appearances (or batters faced) and compare with MLB average.",
    calcInputs: [stat("strikeouts", "Strikeouts (K)", 110, 1000), stat("plateAppearances", "Plate Appearances / Batters Faced", 600, 2000)],
    calcResult: { label: "K%", format: "percentage" },
    calcResults: [pct("strikeoutRate", "Strikeout Rate (K%)", true), num("vsLeagueAverage", "vs 2024 MLB K% (22.6%), Points"), num("plateAppearancesPerStrikeout", "Plate Appearances per Strikeout"), num("kPctDecimal", "K% as Decimal", false, 4)],
    instructions: "Enter strikeouts and plate appearances (hitters) or total batters faced (pitchers).",
    examples: "Example: 110 strikeouts in 600 plate appearances is an 18.3% K rate — 4.3 points better than the 2024 MLB average for a hitter.",
    assumptions: "K% = K ÷ PA. For hitters lower is better; for pitchers higher is better. 2024 MLB K% was about 22.6%. K% is more reliable than K/9 because it isn't affected by hits and walks allowed. " + DISCLAIMER,
    faq: [
      { question: "What is a good strikeout rate for a hitter?", answer: "Under 18% is good contact; above 27% is high." },
      { question: "What is a good K% for a pitcher?", answer: "Around 22% is average; 28%+ is excellent swing-and-miss stuff." },
    ],
  },
  {
    slug: "walk-rate-calculator",
    title: "Walk Rate Calculator",
    description: "Calculate walk rate (BB%) — walks per plate appearance for hitters or per batter faced for pitchers — plus BB/K and BB% − K%.",
    metaTitle: "Walk Rate Calculator — BB% for Hitters & Pitchers",
    metaDescription: "Free walk rate calculator. Get BB% from walks and plate appearances, plus walk-to-strikeout ratio and BB−K%.",
    calcInputs: [stat("walks", "Walks (BB)", 60, 1000), stat("intentionalWalks", "Intentional Walks to Exclude (Optional)", 0, 500), stat("plateAppearances", "Plate Appearances / Batters Faced", 600, 2000), stat("strikeouts", "Strikeouts (K)", 110, 1000)],
    calcResult: { label: "BB%", format: "percentage" },
    calcResults: [pct("walkRate", "Walk Rate (BB%)", true), num("vsLeagueAverage", "vs 2024 MLB BB% (8.2%), Points"), num("walkToStrikeoutRatio", "Walk-to-Strikeout Ratio (BB/K)"), num("bbMinusKPercent", "BB% − K% (Points)")],
    instructions: "Enter walks, plate appearances (or batters faced) and strikeouts. Optionally exclude intentional walks.",
    examples: "Example: 60 walks in 600 plate appearances is a 10.0% walk rate — 1.8 points above the 2024 MLB average.",
    assumptions: "BB% = (BB − excluded IBB) ÷ PA. For hitters higher is better; for pitchers lower is better. 2024 MLB BB% was about 8.2%. " + DISCLAIMER,
    faq: [
      { question: "What is a good walk rate?", answer: "For hitters 10%+ is very good; for pitchers under 6% is excellent control." },
      { question: "BB% or BB/9 for pitchers?", answer: "BB% is per batter faced, so it isn't distorted by how many hitters reach base — analysts generally prefer it." },
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
