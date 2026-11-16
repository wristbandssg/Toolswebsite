// One-time (but safe to re-run) batch setup script: 10 Arts & Entertainment > Tarot, Astrology &
// Fun tools from the big generic keyword check (16 Nov 2026 — Claude outputs/
// Big_Generic_Keyword_Check.md): gematria, D&D point buy, D&D HP, D&D encounter XP, K/D ratio,
// Minecraft stacks, Minecraft circle, Korean age, half birthday and US flag dimensions.
// Formulas: src/lib/calc-engine-big-fun.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-big-fun-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-big-fun";
import { mk, num, dd, tx, date, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.bigFunCustomCalculators;
const NOW = 20772; // 15 Nov 2026
const B1990 = 7468; // 13 Jun 1990

const TOOLS: ToolDef[] = [
  mk({
    slug: "gematria-calculator", title: "Gematria Calculator (English, Hebrew, Jewish & Greek Values)",
    meta: "Gematria Calculator — English, Hebrew, Simple & Jewish",
    desc: "Find the gematria value of a word, name or phrase in English Ordinal (simple), Full Reduction, Reverse Ordinal, English (×6) and the Jewish/Latin table, plus Hebrew Mispar Hechrachi and Greek isopsephy when you type those letters.",
    inputs: [tx("word", "Word, Name or Phrase", "Gematria")],
    results: [["ordinal", "English Ordinal (Simple)", "t"], ["reduction", "Full Reduction", "t"], ["reverse", "Reverse Ordinal", "t"], ["english", "English Gematria (×6)", "t"], ["jewish", "Jewish (Latin Table)", "t"], ["hebrew", "Hebrew (Mispar Hechrachi)", "t"], ["greek", "Greek (Isopsephy)", "t"], ["letters", "Letters", "t"]],
    fn: C["gematria-calculator"], ex: T("word", "Gematria"),
    exText: (o) => `Example: "Gematria" is ${o.ordinal} in English Ordinal, ${o.reduction} in Full Reduction and ${o.english} in English Gematria.`,
    how: "Each letter has a number and the values are added up. English Ordinal: A = 1 … Z = 26. Full Reduction: each letter's ordinal reduced to one digit (A = 1 … I = 9, J = 1 …). Reverse Ordinal: Z = 1 … A = 26. English Gematria multiplies the ordinal sum by 6.\n\nHebrew gematria (Mispar Hechrachi) uses א = 1 … ת = 400, and Greek isopsephy uses α = 1 … ω = 800. Type the word in Hebrew or Greek letters for those.",
    assume: "Spaces, digits and punctuation are ignored; accents and Hebrew vowel points are removed. For entertainment and study — numbers have no proven predictive meaning.",
    faq: [["What is gematria?", "A system of giving letters numbers and adding them up, best known from Hebrew tradition."], ["What does 18 mean in gematria?", "18 is חי (chai, \"life\") in Hebrew — 8 + 10."], ["What is English Ordinal gematria?", "A = 1, B = 2 … Z = 26."]],
  }),
  mk({
    slug: "dnd-point-buy-calculator", title: "D&D 5e Point Buy Calculator (27-Point Ability Scores)",
    meta: "5e Point Buy Calculator — 27 Points Ability Scores",
    desc: "Plan D&D 5e ability scores with the 27-point buy: enter scores from 8 to 15, see points spent and left, then add racial or background bonuses for final scores and modifiers.",
    inputs: [num("budget", "Point Budget", 27, 0, 60, 1), ...["STR", "DEX", "CON", "INT", "WIS", "CHA"].flatMap((a, i) => [num(a.toLowerCase(), `${a} (8–15)`, [15, 14, 13, 12, 10, 8][i], 8, 15, 1), num(`b${a.toLowerCase()}`, `${a} Bonus`, [2, 0, 1, 0, 0, 0][i], -2, 4, 1)])],
    results: [["left", "Points Left", "t"], ["spent", "Points Spent", "t"], ["scores", "Final Scores", "t"], ["total", "Modifiers", "t"], ["costs", "Point Costs", "t"]],
    fn: C["dnd-point-buy-calculator"], ex: { budget: 27, str: 15, bstr: 2, dex: 14, bdex: 0, con: 13, bcon: 1, int: 12, bint: 0, wis: 10, bwis: 0, cha: 8, bcha: 0 },
    exText: (o) => `Example: 15, 14, 13, 12, 10, 8 spends ${String(o.spent).replace(" spent", "")} (${o.left}). With +2 STR and +1 CON the final scores are ${o.scores}.`,
    how: "Every score starts at 8. Raising it costs points: 9 = 1, 10 = 2, 11 = 3, 12 = 4, 13 = 5, 14 = 7, 15 = 9. You have 27 points and can't buy above 15 before bonuses.\n\nThen add +2/+1 (or three +1s) from your race (2014 PHB), Tasha's custom origin or 2024 background. The modifier is (score − 10) ÷ 2, rounded down.",
    assume: "Player's Handbook point-buy rules; your DM may allow a different budget.",
    faq: [["What is the 5e point buy standard array?", "15, 14, 13, 12, 10, 8 — it costs exactly 27 points."], ["Can you get an 18 with point buy?", "No — the max is 15 + 2 = 17 at level 1."], ["How many points is point buy?", "27."]],
  }),
  mk({
    slug: "dnd-hp-calculator", title: "D&D 5e HP Calculator (Hit Points by Class & Level)",
    meta: "5e HP Calculator — Hit Points by Class, Level & CON",
    desc: "Calculate D&D 5e hit points for any class and level 1–20 from your Constitution score, using the fixed average (PHB) or maximum per level, with the rolled range and hit dice.",
    inputs: [dd("cls", "Class", E.HP_CLASS_LABELS, 1), num("level", "Level", 5, 1, 20, 1), num("con", "Constitution Score", 14, 1, 30, 1), dd("method", "HP per Level", E.HP_METHODS, 0), num("extra", "Extra HP per Level (Tough +2, Hill Dwarf +1)", 0, 0, 5, 1)],
    results: [["hp", "Hit Points", "t"], ["per", "How It Adds Up", "t"], ["range", "Rolled Range", "t"], ["dice", "Hit Dice", "t"], ["con", "Constitution", "t"]],
    fn: C["dnd-hp-calculator"], ex: { cls: 1, level: 5, con: 14, method: 0, extra: 0 },
    exText: (o) => `Example: a level 5 Fighter with 14 Constitution has ${o.hp}.`,
    how: "At level 1 you get the maximum of your hit die + your CON modifier. Each level after that adds the fixed average (half the die + 1) + CON, or a roll of the die + CON.\n\nBarbarians use d12; Fighters, Paladins and Rangers d10; Bards, Clerics, Druids, Monks, Rogues, Warlocks and Artificers d8; Sorcerers and Wizards d6.",
    assume: "5e (2014 and 2024) hit point rules; a level always gives at least 1 HP.",
    faq: [["How much HP does a level 1 Wizard have?", "6 + CON modifier."], ["What is the average HP per level for a d10?", "6 (+ CON)."], ["Does CON increase retroactively raise HP?", "Yes — a higher CON modifier adds 1 HP per level, including past levels."]],
  }),
  mk({
    slug: "dnd-encounter-xp-calculator", title: "D&D 5e Encounter Calculator (Difficulty & XP Budget)",
    meta: "5e Encounter Calculator — Easy, Medium, Hard or Deadly?",
    desc: "Check how hard a D&D 5e combat is: enter the party size and level and up to three groups of monsters by CR to get the adjusted XP, the difficulty (easy, medium, hard, deadly) and XP per player.",
    inputs: [num("party", "Party Size", 4, 1, 12, 1), num("level", "Average Character Level", 5, 1, 20, 1), num("n1", "Group 1 — Number", 1, 0, 50, 1), dd("cr1", "Group 1 — CR", E.CR_LABELS, 9), num("n2", "Group 2 — Number", 4, 0, 50, 1), dd("cr2", "Group 2 — CR", E.CR_LABELS, 4), num("n3", "Group 3 — Number", 0, 0, 50, 1), dd("cr3", "Group 3 — CR", E.CR_LABELS, 0)],
    results: [["difficulty", "Difficulty", "t"], ["adjusted", "Adjusted XP", "t"], ["base", "XP Reward", "t"], ["thresholds", "Party Thresholds", "t"], ["rule", "Rules", "t"]],
    fn: C["dnd-encounter-xp-calculator"], ex: { party: 4, level: 5, n1: 1, cr1: 9, n2: 4, cr2: 4, n3: 0, cr3: 0 },
    exText: (o) => `Example: four level 5 characters against a CR 5 monster and four CR ½ minions is ${o.difficulty} — ${o.adjusted}.`,
    how: "Add up the monsters' XP, then multiply by the number of monsters: ×1 for one, ×1.5 for two, ×2 for 3–6, ×2.5 for 7–10, ×3 for 11–14, ×4 for 15+. Use the next multiplier up for parties under 3 and the next one down for parties of 6 or more.\n\nCompare the adjusted XP with the party's thresholds (each player's threshold for their level, added up). The XP reward uses the unadjusted total.",
    assume: "Dungeon Master's Guide (2014) chapter 3 rules; the 2024 DMG uses a simpler XP budget without multipliers.",
    faq: [["How do I calculate encounter difficulty in 5e?", "Total monster XP × the group multiplier, compared with the party's XP thresholds."], ["How much XP is a CR 1 monster?", "200 XP."], ["What is a deadly encounter?", "Adjusted XP at or above the party's deadly threshold — someone may die."]],
  }),
  mk({
    slug: "kd-ratio-calculator", title: "K/D Ratio Calculator (KD, KDA & Kills Needed)",
    meta: "K/D Ratio Calculator — KD, KDA & Kills to Reach a Target",
    desc: "Calculate your kill/death ratio (K/D), KDA with assists and how many kills in a row you need to reach a target K/D, for Call of Duty, Fortnite, Valorant, CS2, Apex, LoL and other games.",
    inputs: [num("kills", "Kills", 150, 0, 1e7, 1), num("deaths", "Deaths", 100, 0, 1e7, 1), num("assists", "Assists", 60, 0, 1e7, 1), num("target", "Target K/D (0 = skip)", 2, 0, 100, 0.01)],
    results: [["kd", "K/D Ratio", "t"], ["kda", "KDA", "t"], ["kdaHalf", "KDA (half assists)", "t"], ["need", "To Reach Your Target", "t"], ["rate", "Fight Win Rate", "t"]],
    fn: C["kd-ratio-calculator"], ex: { kills: 150, deaths: 100, assists: 60, target: 2 },
    exText: (o) => `Example: 150 kills, 100 deaths and 60 assists is a ${o.kd} K/D and a ${String(o.kda).split(" ")[0]} KDA. ${o.need}.`,
    how: "K/D = kills ÷ deaths. KDA = (kills + assists) ÷ deaths, the League of Legends and Dota style. Some shooters count assists as half a kill.\n\nKills needed for a target K/D without dying = target × deaths − kills.",
    assume: "With zero deaths, the K/D is shown as your kills (as most games do).",
    faq: [["What is a good K/D ratio?", "1.0 is average; 2.0+ is very good in most shooters."], ["How is KDA calculated?", "(Kills + assists) ÷ deaths."], ["How many kills to get a 2 K/D?", "2 × deaths − kills, without dying."]],
  }),
  mk({
    slug: "minecraft-stack-calculator", title: "Minecraft Stack Calculator (Items to Stacks, Shulkers & Chests)",
    meta: "Minecraft Stack Calculator — Stacks, Shulker Boxes & Chests",
    desc: "Convert a number of Minecraft items to stacks of 64 (or 16), inventory slots, shulker boxes, chests and double chests — handy for farms, builds and trading.",
    inputs: [num("items", "Number of Items", 1000, 0, 1e9, 1), dd("stack", "Stack Size", E.MC_STACK, 0)],
    results: [["stacks", "Stacks", "t"], ["slots", "Slots", "t"], ["shulker", "Shulker Boxes", "t"], ["chest", "Chests", "t"], ["inventory", "Inventories", "t"], ["shulkerChest", "Chests of Shulkers", "t"]],
    fn: C["minecraft-stack-calculator"], ex: { items: 1000, stack: 0 },
    exText: (o) => `Example: 1,000 cobblestone is ${o.stacks}, or ${o.shulker}.`,
    how: "Most items stack to 64; eggs, snowballs, signs, buckets of snow and ender pearls stack to 16; tools, armour and potions don't stack.\n\nA chest and a shulker box hold 27 slots, a double chest 54 and your inventory 36 (plus the hotbar counted in).",
    assume: "Java and Bedrock Edition stack sizes.",
    faq: [["How many items is a stack in Minecraft?", "64 for most items."], ["How many items fit in a shulker box?", "27 stacks = 1,728 items of a 64-stack item."], ["How many items in a double chest?", "54 stacks = 3,456 items."]],
  }),
  mk({
    slug: "minecraft-circle-calculator", title: "Minecraft Circle Calculator (Pixel Circle Block Layout)",
    meta: "Minecraft Circle Generator — Block Layout by Diameter",
    desc: "Plan a circle in Minecraft: enter a diameter in blocks to get the row-by-row block widths, the number of blocks for a filled circle or a one-block outline, and stacks needed.",
    inputs: [num("diameter", "Diameter (blocks)", 15, 3, 301, 1), dd("mode", "Circle", E.MCC_MODES, 1)],
    results: [["blocks", "Blocks Needed", "t"], ["rows", "Row Widths", "t"], ["both", "Filled vs Outline", "t"], ["stacks", "Stacks", "t"], ["sphere", "Sphere", "t"]],
    fn: C["minecraft-circle-calculator"], ex: { diameter: 15, mode: 1 },
    exText: (o) => `Example: a 15-block circle outline takes ${o.blocks}. ${o.rows}.`,
    how: "The circle is drawn on the block grid: a block is part of the circle when its centre is within the radius of the circle's centre. The row widths tell you how many blocks wide each row is, starting from the top edge.\n\nOdd diameters have a single centre block; even diameters have a 2×2 centre.",
    assume: "One common pixel-circle method; other generators can differ by a block on some rows.",
    faq: [["How do you make a circle in Minecraft?", "Place each row with the widths shown, centred on the same line."], ["How many blocks in a 21 block circle?", "About 345 filled."], ["Odd or even diameter?", "Odd diameters are easier to centre."]],
  }),
  mk({
    slug: "korean-age-calculator", title: "Korean Age Calculator (Korean & Chinese Age vs International Age)",
    meta: "Korean Age Calculator — How Old Am I in Korea?",
    desc: "Find your traditional Korean age, international age (South Korea's official age since 2023), year age and approximate Chinese nominal age (xūsuì) from your date of birth.",
    inputs: [date("birth", "Date of Birth", B1990), date("asof", "As of", "today")],
    results: [["korean", "Korean Age", "t"], ["international", "International Age", "t"], ["year", "Year Age", "t"], ["chinese", "Chinese Age", "t"], ["next", "Next Increase", "t"]],
    fn: C["korean-age-calculator"], ex: { birth: B1990, asof: NOW },
    exText: (o) => `Example: someone born on 13 June 1990 is ${String(o.international).split(" ")[0]} internationally on 15 November 2026, but ${String(o.korean).split(" ")[0]} in traditional Korean age.`,
    how: "Traditional Korean age: you're 1 at birth and everyone gets a year older on 1 January. So Korean age = current year − birth year + 1.\n\nSince June 2023 South Korea officially uses international age, but year age (current year − birth year) is still used for school, alcohol and military rules.",
    assume: "Chinese nominal age adds a year at Lunar New Year; this calculator uses 1 January, so it can be one year high between January and Lunar New Year.",
    faq: [["How do you calculate Korean age?", "Current year − birth year + 1."], ["Does Korea still use Korean age?", "Officially no since 28 June 2023, but it's still common in everyday life."], ["Why are Koreans 1 at birth?", "Time in the womb is counted, and age rises at the new year."]],
  }),
  mk({
    slug: "half-birthday-calculator", title: "Half Birthday Calculator (When Is My Half Birthday?)",
    meta: "Half Birthday Calculator — Your Next Half Birthday",
    desc: "Find your next half birthday — six months after your birthday — how many days away it is and how old you'll be, with the end-of-month rule for birthdays on the 29th–31st.",
    inputs: [date("birth", "Date of Birth", B1990), date("asof", "As of", "today")],
    results: [["next", "Next Half Birthday", "t"], ["until", "Countdown", "t"], ["age", "Age", "t"], ["rule", "Rule", "t"], ["days", "By 182.5 Days", "t"]],
    fn: C["half-birthday-calculator"], ex: { birth: B1990, asof: NOW },
    exText: (o) => `Example: with a birthday on 13 June 1990, the next half birthday after 15 November 2026 is ${o.next}. ${o.age}.`,
    how: "A half birthday is the same day of the month six months after your birthday: 13 June → 13 December. Birthdays on 29–31 August move to the end of February.\n\nSome people count exactly 182.5 days instead; that date is shown too.",
    assume: "Gregorian calendar.",
    faq: [["When is my half birthday if I was born on August 31?", "February 28 (29 in leap years)."], ["What is a half birthday?", "The day exactly six months after your birthday."], ["Are half birthdays celebrated?", "Often for kids with summer birthdays, so they can celebrate at school."]],
  }),
  mk({
    slug: "flag-dimensions-calculator", title: "US Flag Dimensions Calculator (Official American Flag Proportions)",
    meta: "American Flag Dimensions Calculator — Official Proportions",
    desc: "Get the official US flag dimensions for any height: fly length, stripe height, union (blue field) size, star diameter and star spacing, from the 1 : 1.9 proportions of Executive Order 10834.",
    inputs: [num("hoist", "Flag Height (Hoist)", 36, 0, 10000, 0.1), dd("unit", "Units", E.FL_UNITS, 0)],
    results: [["fly", "Flag Length (Fly)", "t"], ["stripe", "Stripe Height", "t"], ["union", "Union (Blue Field)", "t"], ["star", "Star Size", "t"], ["spacing", "Star Spacing", "t"], ["ratio", "Ratio", "t"]],
    fn: C["flag-dimensions-calculator"], ex: { hoist: 36, unit: 0 },
    exText: (o) => `Example: a 36 in tall flag is ${o.fly} long, with ${String(o.stripe).split(" each")[0]} stripes and a ${String(o.union).split(" (")[0]} union.`,
    how: "Executive Order 10834 sets the flag's proportions relative to the hoist (height) A = 1.0: fly B = 1.9, union height C = 7/13, union width D = 0.76, stripe width L = 1/13 and star diameter K = 0.0616.\n\nStars are in 9 rows of 6 and 5, spaced E = F = 0.054 vertically and G = H = 0.063 horizontally.",
    assume: "Official government proportions; most commercial flags (3 × 5 ft, 4 × 6 ft) use a shorter fly.",
    faq: [["What are the official dimensions of the US flag?", "Height 1, length 1.9."], ["How tall is each stripe?", "1/13 of the flag's height."], ["How big is the blue field?", "7/13 of the height by 0.76 of the height."]],
  }),
];

async function main() {
  if (new Set(TOOLS.map((t) => t.slug)).size !== TOOLS.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${TOOLS.length} tool definitions`); for (const t of TOOLS) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("tarot-astrology-fun-calculators", TOOLS);
}
main().catch((e) => { console.error(e); process.exit(1); });
