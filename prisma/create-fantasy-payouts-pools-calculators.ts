// One-time (but safe to re-run) batch setup script: creates the 5 tools of
// the fantasy sports sub-batch C (Fantasy Payouts + Bracket & Survivor
// Pools). See prisma/create-fantasy-trade-scoring-calculators.ts for the
// full list of 3 sub-batches, and src/lib/calc-engine-fantasy-payouts-pools.ts
// for the math and how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-fantasy-payouts-pools-calculators.ts
// or
//   npm run db:create-fantasy-payouts-pools-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Fantasy Sports Calculators", slug: "fantasy-sports-calculators" };

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
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "For estimates and entertainment only — not betting advice. Payout multipliers and contest rules change and vary by " +
  "state; always confirm them in the app before you enter. Play responsibly, and only with money you can afford to lose.";

const PICKS: [string, number][] = [
  ["2 picks", 2],
  ["3 picks", 3],
  ["4 picks", 4],
  ["5 picks", 5],
  ["6 picks", 6],
];

interface ToolDef {
  slug: string;  title: string;
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

const PICKEM_RESULTS = [
  { key: "maxPayout", label: "Payout if All Picks Hit", format: "currency", highlight: true },
  { key: "maxProfit", label: "Profit if All Picks Hit", format: "currency" },
  { key: "expectedValue", label: "Expected Return (EV)", format: "currency" },
  { key: "expectedProfit", label: "Expected Profit", format: "currency" },
  { key: "breakEvenHitRate", label: "Break-Even Win Rate per Pick", format: "percentage" },
  { key: "chanceAllCorrect", label: "Chance All Picks Hit", format: "percentage" },
];

const TOOLS: ToolDef[] = [
  {
    slug: "prizepicks-payout-calculator",    title: "PrizePicks Payout Calculator",
    description: "Calculate PrizePicks payouts for Power Play and Flex Play entries of 2 to 6 picks, with expected value and the win rate you need per pick to break even.",
    metaTitle: "PrizePicks Payout Calculator — Power & Flex",
    metaDescription: "Free PrizePicks payout calculator. See Power Play and Flex Play payouts for 2–6 picks, expected value and the break-even win rate per pick.",
    calcInputs: [
      currencyField("entryFee", "Entry Amount", { default: 10, max: 10000 }),
      dropdown("playType", "Play Type", [["Power Play (all must hit)", 1], ["Flex Play (partial payouts, 3+ picks)", 2]], 1),
      dropdown("picks", "Number of Picks", PICKS, 3),
      percentField("pickWinChance", "Your Chance to Win Each Pick", { default: 55, min: 1, max: 99 }),
      numberField("customMultiplier", "All-Correct Multiplier Shown in App (0 = Use Typical)", { default: 0, max: 1000, step: 0.25, required: false }),
    ],
    calcResult: { label: "Payout if All Picks Hit", format: "currency" },
    calcResults: PICKEM_RESULTS,
    instructions:
      "Enter your entry amount, choose Power Play or Flex Play and the number of picks, and estimate how often each pick wins. If the app shows a different all-correct multiplier for your entry (promos and special lines change it), enter it to override the typical one.",
    examples:
      "Example: a $10, 3-pick Power Play at 5x pays $50. At a 55% win rate per pick, all three hit 16.6% of the time, so the entry is worth $8.32 on average — a $1.68 expected loss. You need to win 58.5% of picks to break even. A 5-pick Flex Play at the same 55% is worth $10.50, a small edge.",
    assumptions:
      "Typical multipliers — Power Play: 2 picks 3x, 3 picks 5x, 4 picks 10x, 5 picks 20x, 6 picks 37.5x. Flex Play: 3 picks 2.25x (3/3) and 1.25x (2/3); 4 picks 5x and 1.5x; 5 picks 10x, 2x and 0.4x; 6 picks 25x, 2x and 0.4x. " +
      "Picks are treated as independent, and ties, pushes and reboots (which drop an entry to fewer picks) aren't modelled. " + DISCLAIMER,
    faq: [
      { question: "What win rate do I need on PrizePicks?", answer: "Around 54–59% per pick depending on the entry. 5- and 6-pick Flex Plays usually have the lowest break-even rate; 2- and 3-pick Power Plays the highest." },
      { question: "Is Power Play or Flex Play better?", answer: "Power Play pays more but needs every pick to hit. Flex Play pays less at the top but softens a miss, so its expected value is often better if you're a solid picker." },
    ],
  },
  {
    slug: "underdog-fantasy-payout-calculator",    title: "Underdog Fantasy Payout Calculator",
    description: "Calculate Underdog Fantasy Pick'em payouts for Standard and Insured entries, including Underdog's boosted or discounted pick multipliers, expected value and break-even rate.",
    metaTitle: "Underdog Fantasy Payout Calculator — Pick'em",
    metaDescription: "Free Underdog Fantasy payout calculator. Standard and Insured Pick'em payouts, pick multipliers, expected value and break-even win rate.",
    calcInputs: [
      currencyField("entryFee", "Entry Amount", { default: 10, max: 10000 }),
      dropdown("entryType", "Entry Type", [["Standard (all must hit)", 1], ["Insured (partial payouts, 3+ picks)", 2]], 1),
      dropdown("picks", "Number of Picks", PICKS, 3),
      percentField("pickWinChance", "Your Chance to Win Each Pick", { default: 55, min: 1, max: 99 }),
      numberField("pickMultiplierProduct", "Combined Pick Multiplier (e.g. 1.1 × 0.9 = 0.99; 1 = None)", { default: 1, min: 0.1, max: 10, step: 0.01 }),
      numberField("customMultiplier", "All-Correct Multiplier Shown in App (0 = Use Typical)", { default: 0, max: 1000, step: 0.25, required: false }),
    ],
    calcResult: { label: "Payout if All Picks Hit", format: "currency" },
    calcResults: PICKEM_RESULTS,
    instructions:
      "Enter your entry amount, the entry type and the number of picks, and your chance of winning each pick. Some Underdog picks carry their own multiplier (for example 1.1x or 0.85x) — multiply them together and enter the result. If the app shows a different payout, enter it as the all-correct multiplier.",
    examples:
      "Example: a $10, 3-pick Standard entry at 6x pays $60. At 55% per pick it's worth $9.98 on average — almost break-even, which needs 55.0% per pick. Adding a 1.1x boosted pick raises the top payout to $66.",
    assumptions:
      "Typical multipliers — Standard: 2 picks 3x, 3 picks 6x, 4 picks 10x, 5 picks 20x, 6 picks 35x. Insured: 3 picks 3x (3/3) and 1x (2/3); 4 picks 6x and 1.5x; 5 picks 10x and 2.5x; 6 picks 25x, 2.6x and 0.25x. " +
      "Pick multipliers apply to the all-correct payout. Picks are treated as independent; pushes and voided picks aren't modelled. " + DISCLAIMER,
    faq: [
      { question: "What are Underdog pick multipliers?", answer: "Underdog adjusts the payout on some picks — a boosted pick might be 1.1x, a heavy favourite 0.8x. They multiply into your entry's top payout." },
      { question: "Is an Insured entry worth it?", answer: "It pays less when everything hits but still pays when you miss one. If your hit rate is well above 50%, insured 5- and 6-pick entries often have the better expected value." },
    ],
  },
  {
    slug: "fantasy-football-payout-calculator",    title: "Fantasy Football Payout Calculator",
    description: "Split your fantasy football league's prize pool: buy-ins, platform fees, weekly high-score prizes, a points-champion prize and the top-place payouts.",
    metaTitle: "Fantasy Football Payout Calculator — League",
    metaDescription: "Free fantasy football payout calculator. Split the league pot into 1st, 2nd, 3rd and 4th place, weekly high scores and a points champion.",
    calcInputs: [
      numberField("teams", "Teams in League", { default: 12, min: 2, max: 32 }),
      currencyField("buyIn", "Buy-In per Team", { default: 100, max: 100000 }),
      currencyField("leagueFees", "Platform / League Fees (Total)", { default: 0, max: 100000, required: false }),
      dropdown(
        "payoutStructure",
        "Place Payout Split",
        [
          ["Top 3: 60% / 30% / 10%", 1],
          ["Top 3: 50% / 30% / 20%", 2],
          ["Top 4: 50% / 25% / 15% / 10%", 3],
          ["Top 2: 70% / 30%", 4],
          ["Winner takes all", 5],
        ],
        1
      ),
      currencyField("weeklyPrize", "Weekly High-Score Prize", { default: 10, max: 10000, required: false }),
      numberField("weeklyPrizeWeeks", "Weeks with a High-Score Prize", { default: 14, max: 18, required: false }),
      percentField("pointsChampionPercent", "Points-Champion Prize (% of Pot After Weekly Prizes)", { default: 0, max: 50 }),
    ],
    calcResult: { label: "1st Place Payout", format: "currency" },
    calcResults: [
      { key: "firstPlace", label: "1st Place", format: "currency", highlight: true },
      { key: "secondPlace", label: "2nd Place", format: "currency" },
      { key: "thirdPlace", label: "3rd Place", format: "currency" },
      { key: "fourthPlace", label: "4th Place", format: "currency" },
      { key: "totalPot", label: "Total Pot After Fees", format: "currency" },
      { key: "weeklyPrizePool", label: "Weekly High-Score Prizes (Total)", format: "currency" },
      { key: "pointsChampionPrize", label: "Points-Champion Prize", format: "currency" },
    ],
    instructions: "Enter your league size, buy-in and any fees, then choose how the place money is split and set any weekly high-score or points-champion prizes.",
    examples:
      "Example: 12 teams at $100 is a $1,200 pot. A $10 weekly high-score prize for 14 weeks uses $140, leaving $1,060 for places: $636 for 1st, $318 for 2nd and $106 for 3rd on a 60/30/10 split.",
    assumptions: "Weekly prizes come out of the pot first, then the points-champion prize, then the place payouts. Amounts aren't rounded to whole dollars. " + DISCLAIMER,
    faq: [
      { question: "What's a fair fantasy football payout structure?", answer: "60/30/10 for the top three is the most common. Many leagues add weekly high-score prizes so teams out of contention still have something to play for." },
      { question: "Should the regular-season points leader get paid?", answer: "It's a popular way to reward the best team when the playoffs go another way — 5% to 10% of the pot is typical." },
    ],
  },
  {
    slug: "bracket-odds-calculator",    title: "Bracket Odds Calculator",
    description: "Calculate the odds of a perfect bracket — March Madness or any knockout bracket — from the number of games and how often you pick winners correctly.",
    metaTitle: "Bracket Odds Calculator — Perfect Bracket",
    metaDescription: "Free bracket odds calculator. Find the odds of a perfect March Madness bracket from games and pick accuracy, for one or many brackets.",
    calcInputs: [
      numberField("games", "Games in the Bracket", { default: 63, min: 1, max: 127 }),
      percentField("pickAccuracy", "Your Average Chance of Picking Each Game Right", { default: 66, min: 1, max: 99 }),
      numberField("brackets", "Number of Brackets You Fill Out", { default: 1, min: 1, max: 1000000 }),
    ],
    calcResult: { label: "Odds of a Perfect Bracket (1 in …)", format: "number" },
    calcResults: [
      { key: "oddsOneIn", label: "Odds of a Perfect Bracket (1 in …)", format: "number", decimals: 0, highlight: true },
      { key: "coinFlipOddsOneIn", label: "Odds Picking at Random (1 in …)", format: "number", decimals: 0 },
      { key: "expectedCorrectPicks", label: "Expected Correct Picks", format: "number" },
      { key: "oddsDigits", label: "Digits in the Odds (log10)", format: "number" },
      { key: "chanceAnyPerfect", label: "Chance at Least One Bracket Is Perfect", format: "percentage", decimals: 12 },
    ],
    instructions: "Enter how many games the bracket has (63 for March Madness, 67 with the First Four), your average chance of getting each game right, and how many brackets you'll fill out.",
    examples:
      "Example: picking all 63 March Madness games at random is 1 in 9.2 quintillion (2⁶³). A good bracket picker who gets about 66% of games right still faces odds of about 1 in 234 billion.",
    assumptions:
      "Each game is treated as independent with the same chance of a correct pick. Multiple brackets are treated as independent tries, which overstates the chance a little because real brackets share many picks. " + DISCLAIMER,
    faq: [
      { question: "Has anyone ever filled out a perfect bracket?", answer: "No verified perfect March Madness bracket has ever been recorded. The longest known streaks have ended in the second round." },
      { question: "What is a realistic pick accuracy?", answer: "Strong bracket pickers average about 65–70% across the tournament. First-round favourites win roughly 70–75% of the time." },
    ],
  },
  {
    slug: "survivor-pool-calculator",    title: "Survivor Pool Calculator",
    description: "Estimate your chance of winning a survivor (last man standing) pool and your expected share of the pot, from your weekly picks and the rest of the field.",
    metaTitle: "Survivor Pool Calculator — Odds & EV",
    metaDescription: "Free survivor pool calculator. Your chance of outlasting the field, expected survivors and expected winnings from weekly pick win rates.",
    calcInputs: [
      numberField("entriesAlive", "Entries Still Alive (Including Yours)", { default: 100, min: 1, max: 1000000 }),
      numberField("weeksRemaining", "Weeks Left in the Pool", { default: 10, max: 18 }),
      percentField("yourPickWinChance", "Your Average Weekly Pick Win Chance", { default: 70, min: 1, max: 99 }),
      percentField("fieldPickWinChance", "Field's Average Weekly Pick Win Chance", { default: 68, min: 1, max: 99 }),
      currencyField("pot", "Prize Pot", { default: 1000, max: 10000000 }),
    ],
    calcResult: { label: "Survival Chance", format: "percentage" },
    calcResults: [
      { key: "survivalChance", label: "Chance You Survive Every Week", format: "percentage", highlight: true },
      { key: "expectedWinnings", label: "Expected Winnings", format: "currency" },
      { key: "fairShareOfPot", label: "Equal Share of the Pot (Pot ÷ Entries)", format: "currency" },
      { key: "expectedOtherSurvivors", label: "Expected Other Survivors", format: "number" },
      { key: "chanceNoOneSurvives", label: "Chance Nobody Survives", format: "percentage" },
    ],
    instructions:
      "Enter the entries still alive, the weeks left, the average win chance of the teams you plan to pick (from betting lines or win probability models) and what the rest of the field will likely pick.",
    examples:
      "Example: 100 entries are left with 10 weeks to go. If your picks win 70% of the time you survive all 10 weeks 2.8% of the time. The field, at 68%, leaves about 2.1 other survivors to split with, so a $1,000 pot is worth $11.79 to you — more than the $10 equal share, thanks to your stronger picks.",
    assumptions:
      "Weeks are independent. If several entries survive, the pot is split equally between them. Pools that roll over or use tiebreakers when everyone is eliminated aren't modelled. " + DISCLAIMER,
    faq: [
      { question: "Should I pick the biggest favourite every week?", answer: "Not always. Saving strong teams for later weeks and avoiding the most popular pick can raise your expected winnings, because when a popular team loses, much of the field goes out with it." },
      { question: "What's a typical weekly win chance?", answer: "Survivor picks are usually 70–85% favourites early on, but you can use each team only once, so the average often drops to 65–70% later in the season." },
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
