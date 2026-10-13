// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the other-sports sub-batch "Standings, Ratings & Judging". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-league.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-league-calculators.ts
// or
//   npm run db:create-other-league-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Other Sports Calculators", slug: "other-sports-calculators" };

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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for planning, training and fun. Sizing, ratings and physics models are approximations — check official rules, manufacturer charts and qualified coaches, and treat health figures as general guidance, not medical advice.";

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
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });

const ROUND_OPTS: [string, number][] = [["Not scored", 0], ["A wins 10-9", 1], ["B wins 10-9", 2], ["Even 10-10", 3], ["A wins 10-8 (knockdown)", 4], ["B wins 10-8 (knockdown)", 5], ["A wins 10-7", 6], ["B wins 10-7", 7]];
const ROUND_DEFAULTS = [1, 1, 2, 1, 4, 2, 1, 2, 1, 1, 2, 1];

const TOOLS: ToolDef[] = [
  {
    slug: "win-percentage-calculator",
    title: "Win Percentage Calculator",
    description: "Calculate a team's or player's win percentage from wins, losses and ties — and the wins needed to reach a target percentage.",
    metaTitle: "Win Percentage Calculator — Winning % & Wins Needed",
    metaDescription: "Free win percentage calculator. Get winning % from W-L-T (ties as half, loss or ignored) and the wins needed to hit a target.",
    calcInputs: [numberField("wins", "Wins", { default: 30, max: 10000 }), numberField("losses", "Losses", { default: 20, max: 10000 }), numberField("ties", "Ties / Draws", { default: 0, max: 10000, required: false }), dropdown("tieMode", "How Ties Count", [["Half a win (NFL, most sports)", 1], ["As a loss", 2], ["Ignored", 3]], 1), numberField("gamesLeft", "Games Left", { default: 12, max: 1000, required: false }), percentField("targetPct", "Target Win %", { default: 60 })],
    calcResult: { label: "Win %", format: "percentage" },
    calcResults: [pct("winPct", "Win Percentage", true), num("winPctDecimal", "As a Decimal (.xxx)", false, 3), num("winsNeeded", "Wins Needed for Target"), num("possible", "Possible with Games Left (1 = yes)")],
    instructions: "Enter the record, how your league counts ties and, optionally, games left and a target win percentage.",
    examples: "Example: 30–20 is a .600 (60%) record. To finish at 60% after 12 more games you need 8 more wins.",
    assumptions: "Win % = (wins + ½ ties) ÷ games, or wins ÷ (wins + losses) if ties are ignored. Leagues differ (the NHL uses points, soccer uses 3-1-0 points), so use the setting that matches your competition. " + DISCLAIMER,
    faq: [
      { question: "How do you calculate win percentage?", answer: "Divide wins by games played; a tie usually counts as half a win." },
      { question: "Why is it written as .600?", answer: "US sports show win % as a three-digit decimal." },
    ],
  },
  {
    slug: "elo-rating-calculator",
    title: "Elo Rating Calculator",
    description: "Calculate new Elo ratings after a game — expected score, rating change and both players' or teams' new ratings.",
    metaTitle: "Elo Rating Calculator — Rating Change After a Game",
    metaDescription: "Free Elo rating calculator. Get expected score and new Elo ratings after a win, draw or loss with any K-factor.",
    calcInputs: [numberField("ratingA", "Player / Team A Rating", { default: 1500, min: 0, max: 4000 }), numberField("ratingB", "Player / Team B Rating", { default: 1600, min: 0, max: 4000 }), numberField("kFactor", "K-Factor", { default: 32, min: 1, max: 100 }), dropdown("result", "Result for A", [["A won", 1], ["Draw", 2], ["A lost", 3]], 1)],
    calcResult: { label: "New Rating A", format: "number" },
    calcResults: [pct("expectedScoreA", "A's Expected Score (win chance)"), num("newRatingA", "A's New Rating", true), num("newRatingB", "B's New Rating"), num("changeA", "Rating Change for A")],
    instructions: "Enter both ratings, the K-factor your system uses and the result.",
    examples: "Example: a 1500 player beats a 1600 player with K = 32. A was expected to score 36%, so A gains 20.5 points (to 1520.5) and B drops to 1579.5.",
    assumptions: "Expected score E = 1 ÷ (1 + 10^((Rb − Ra) ÷ 400)); new rating = old + K × (actual − expected), with win = 1, draw = 0.5, loss = 0. FIDE uses K = 40 for new players, 20 for most, 10 for 2400+. Sports models (e.g. FiveThirtyEight) add home advantage and margin of victory. " + DISCLAIMER,
    faq: [
      { question: "What does a 400-point gap mean?", answer: "The higher-rated side is expected to score about 91%." },
      { question: "What K-factor should I use?", answer: "Higher K reacts faster to results; 20–40 is common for games and sports leagues." },
    ],
  },
  {
    slug: "strength-of-schedule-calculator",
    title: "Strength of Schedule Calculator",
    description: "Calculate a team's strength of schedule from its opponents' winning percentages (and their opponents').",
    metaTitle: "Strength of Schedule Calculator — SOS",
    metaDescription: "Free strength of schedule calculator. Get SOS from opponents' win % (OWP) and opponents' opponents' win % (OOWP).",
    calcInputs: [...Array.from({ length: 12 }, (_, i) => percentField(`opp${i + 1}`, `Opponent ${i + 1} Win % (0 = none)`, { default: [60, 45, 55, 70, 40][i] ?? 0 })), percentField("oowp", "Opponents' Opponents' Win % (optional)", { default: 0 })],
    calcResult: { label: "SOS", format: "number" },
    calcResults: [num("strengthOfSchedule", "Strength of Schedule", true, 3), pct("opponentsWinPct", "Opponents' Average Win %"), num("opponentsCounted", "Opponents Counted"), num("rating", "Schedule (1 Soft, 2 Average, 3 Tough)")],
    instructions: "Enter each opponent's winning percentage (play a team twice? enter it twice). Add opponents' opponents' win % if you have it.",
    examples: "Example: opponents at 60%, 45%, 55%, 70% and 40% average 54% — an SOS of .540 (average to slightly tough).",
    assumptions: "SOS = (2 × OWP + OOWP) ÷ 3 (the NCAA RPI-style weighting); if OOWP is blank, OWP is used for both. Opponents' records should exclude games against you where possible. " + DISCLAIMER,
    faq: [
      { question: "What is a good strength of schedule?", answer: "Above .550 is tough; below .450 is soft." },
      { question: "Is SOS used in the NFL?", answer: "Yes — it's a tiebreaker and decides draft order between teams with the same record." },
    ],
  },
  {
    slug: "playing-time-calculator",
    title: "Playing Time Calculator",
    description: "Split playing time fairly — equal minutes per player for basketball, soccer, hockey or any youth team (also a basketball playing time calculator).",
    metaTitle: "Playing Time Calculator — Equal Minutes per Player",
    metaDescription: "Free playing time calculator. Work out equal minutes per player from game length, players on the field and roster size.",
    calcInputs: [numberField("periods", "Periods / Halves / Quarters", { default: 4, min: 1, max: 10 }), numberField("periodLength", "Minutes per Period", { default: 8, min: 1, max: 90 }), numberField("onField", "Players on the Court / Field at Once", { default: 5, min: 1, max: 15 }), numberField("roster", "Players Available", { default: 9, min: 1, max: 40 })],
    calcResult: { label: "Minutes Each", format: "number" },
    calcResults: [num("minutesEach", "Minutes per Player", true), pct("shareOfGamePct", "Share of the Game"), num("sittingAtOnce", "Players Sitting at Any Time"), num("minutesEachPerPeriod", "Minutes per Player per Period"), num("totalPlayerMinutes", "Total Player-Minutes")],
    instructions: "Enter the game format (e.g. youth basketball 4 × 8 min with 5 on court; soccer 2 × 25 min with 7–11 on the field) and how many players you have.",
    examples: "Example: 4 quarters of 8 minutes, 5 on court and 9 players → 160 player-minutes, about 17.8 minutes each (56% of the game), with 4 sitting at any time.",
    assumptions: "Equal minutes = game minutes × players on at once ÷ roster. Goalkeepers or specialists can be handled by reducing the on-field number. Stoppages aren't counted. " + DISCLAIMER,
    faq: [
      { question: "How do I rotate players fairly?", answer: "Plan shifts in advance — e.g. sub in pairs every few minutes so everyone reaches their share." },
      { question: "Should youth players get equal time?", answer: "Many leagues require minimum playing time; equal time helps development and keeps kids engaged." },
    ],
  },
  {
    slug: "tournament-bracket-calculator",
    title: "Tournament Bracket Calculator",
    description: "Work out games, rounds and byes for single-elimination, double-elimination or round-robin tournaments — and any seed's first-round matchup (also a seeding calculator).",
    metaTitle: "Tournament Bracket Calculator — Games, Byes & Seeding",
    metaDescription: "Free tournament bracket calculator. Get number of games, rounds and byes for any bracket, and who each seed plays first.",
    calcInputs: [numberField("teams", "Teams / Players", { default: 12, min: 2, max: 1024 }), dropdown("format", "Format", [["Single elimination", 1], ["Double elimination", 2], ["Round robin", 3]], 1), numberField("seed", "Seed to Check", { default: 6, min: 1, max: 1024 })],
    calcResult: { label: "Games", format: "number" },
    calcResults: [num("games", "Total Games", true), num("rounds", "Rounds"), num("byes", "First-Round Byes"), num("seedFirstOpponent", "That Seed's First Opponent (0 = bye)"), num("seedHasBye", "That Seed Has a Bye (1 = yes)")],
    instructions: "Enter the number of entrants, the format and a seed to see its first-round opponent.",
    examples: "Example: 12 teams single elimination → 11 games over 4 rounds, with 4 byes (seeds 1–4). Seed 6 plays seed 11 first.",
    assumptions: "Single elimination: games = teams − 1; rounds = ⌈log₂ teams⌉; byes = next power of 2 − teams, given to the top seeds. Standard seeding pairs seed s with (bracket size + 1 − s). Double elimination ≈ 2 × teams − 2 games (+1 if the final needs a reset). Round robin: n(n − 1) ÷ 2 games. " + DISCLAIMER,
    faq: [
      { question: "How many games are in a 64-team bracket?", answer: "63 — every game eliminates one team." },
      { question: "Why do top seeds get byes?", answer: "When the field isn't a power of two, byes reward the highest seeds." },
    ],
  },
  {
    slug: "rodeo-payout-calculator",
    title: "Rodeo Payout Calculator",
    description: "Calculate a rodeo or event payout — total purse from entry fees and added money, split across the paying places.",
    metaTitle: "Rodeo Payout Calculator — Purse & Place Money",
    metaDescription: "Free rodeo payout calculator. Work out the purse from entries and added money and split it across 1–6 places.",
    calcInputs: [numberField("entries", "Entries", { default: 40, min: 1, max: 2000 }), currencyField("entryFee", "Entry Fee", { default: 100 }), percentField("deductionPct", "Office / Stock Charge Deducted", { default: 10, max: 100 }), currencyField("addedMoney", "Added Money", { default: 1000 }), numberField("places", "Places Paid", { default: 4, min: 1, max: 6 })],
    calcResult: { label: "First Place", format: "currency" },
    calcResults: [cur("purse", "Total Purse"), cur("first", "1st", true), cur("second", "2nd"), cur("third", "3rd"), cur("fourth", "4th"), cur("fifth", "5th"), cur("sixth", "6th")],
    instructions: "Enter entries, the entry fee, any deductions, added money and how many places pay.",
    examples: "Example: 40 entries at $100 minus 10% plus $1,000 added = $4,600. Paying 4 places (40/30/20/10): $1,840, $1,380, $920 and $460.",
    assumptions: "Common splits: 1 place 100%; 2 places 60/40; 3 places 50/30/20; 4 places 40/30/20/10; 5 places 33/27/20/13/7; 6 places 29/24/19/14/9/5. Sanctioning bodies (PRCA, IPRA, barrel-race 4D formats) have their own schedules — check your rulebook. Ties split the combined places. " + DISCLAIMER,
    faq: [
      { question: "How many places pay at a rodeo?", answer: "It depends on entries — more entries mean more paying places." },
      { question: "What is added money?", answer: "Prize money from the committee or sponsors on top of entry fees." },
    ],
  },
  {
    slug: "boxing-scorecard-calculator",
    title: "Boxing Scorecard Calculator",
    description: "Score a boxing (or MMA) fight with the 10-point must system — round by round, with knockdowns and point deductions.",
    metaTitle: "Boxing Scorecard Calculator — 10-Point Must",
    metaDescription: "Free boxing scorecard calculator. Score up to 12 rounds 10-9, 10-8 or 10-10, add deductions and see the result.",
    calcInputs: [...Array.from({ length: 12 }, (_, i) => dropdown(`round${i + 1}`, `Round ${i + 1}`, ROUND_OPTS, ROUND_DEFAULTS[i])), numberField("deductionsA", "Points Deducted from A", { default: 0, max: 10, required: false }), numberField("deductionsB", "Points Deducted from B", { default: 0, max: 10, required: false })],
    calcResult: { label: "Result", format: "number" },
    calcResults: [num("fighterA", "Fighter A Total", true), num("fighterB", "Fighter B Total", true), num("result", "Winner (1 = A, 2 = B, 0 = draw)"), num("margin", "Margin"), num("roundsScored", "Rounds Scored")],
    instructions: "Score each round as a judge would (leave unused rounds as 'Not scored') and add any point deductions for fouls.",
    examples: "Example: A wins 7 rounds 10-9 plus one 10-8 knockdown round, B wins 4 rounds 10-9 → 116–111 for A.",
    assumptions: "10-point must system: the round winner gets 10, the loser 9 (8 with a knockdown or clear domination, 7 with two). Referee deductions subtract from the total. A real decision uses three judges — majority of cards wins. " + DISCLAIMER,
    faq: [
      { question: "What is a 10-8 round?", answer: "Usually a round with a knockdown, or total domination." },
      { question: "What is a split decision?", answer: "Two judges score for one fighter and the third for the other." },
    ],
  },
  {
    slug: "figure-skating-calculator",
    title: "Figure Skating Calculator",
    description: "Calculate an ISU figure skating segment score — technical score (base value + GOE) plus program components, minus deductions.",
    metaTitle: "Figure Skating Score Calculator — TES + PCS",
    metaDescription: "Free figure skating calculator. Estimate segment score from base value, GOE, program components and deductions (ISU).",
    calcInputs: [dropdown("segment", "Segment", [["Men's / singles short program", 1], ["Men's free skate", 2], ["Women's short program", 3], ["Women's free skate", 4], ["Pairs short program", 5], ["Pairs free skate", 6], ["Ice dance rhythm dance", 7], ["Ice dance free dance", 8]], 1), numberField("baseValue", "Total Base Value of Elements", { default: 45, max: 150, step: 0.01 }), numberField("averageGoe", "Average GOE (−5 to +5)", { default: 1, min: -5, max: 5, step: 0.1 }), numberField("pcsAverage", "Average Component Score (0–10)", { default: 8, max: 10, step: 0.25 }), numberField("deductions", "Deductions (falls etc.)", { default: 0, max: 20, required: false })],
    calcResult: { label: "Segment Score", format: "number" },
    calcResults: [num("segmentScore", "Segment Score", true), num("technicalScore", "Technical Element Score (TES)"), num("componentScore", "Program Component Score (PCS)"), num("goeValue", "Points from GOE")],
    instructions: "Add up the base values of the planned elements (from the ISU Scale of Values), estimate the average GOE and component marks, and enter deductions.",
    examples: "Example: a men's short program with 45.00 base value, +1 average GOE and 8.00 components → TES 49.50 + PCS 40.08 = 89.58.",
    assumptions: "ISU judging: each GOE grade is worth 10% of the element's base value (here applied to the total). PCS = 3 components (Composition, Presentation, Skating Skills since 2022–23) × average mark × segment factor (singles SP men 1.67 / women 1.33; FS 3.33 / 2.67; pairs 1.33 / 2.67; ice dance 1.33 / 2.00). A fall costs 1 point (more for repeat falls). " + DISCLAIMER,
    faq: [
      { question: "What is GOE?", answer: "Grade of Execution — judges' −5 to +5 mark for how well each element was done." },
      { question: "How is the total competition score found?", answer: "Short program score + free skate score." },
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
