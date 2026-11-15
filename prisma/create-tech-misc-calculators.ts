// One-time (but safe to re-run) batch setup script: the last 13 tools from the tech keyword check
// (15 Nov 2026 — Claude outputs/Tech_Keyword_Check.md): Arts & Entertainment > Tarot, Astrology & Fun
// (7), Jobs & Education > School Age, Calendar & Classroom (typing speed) and > Salary, Income &
// Career (time card), Finance > Investment Returns & Planning (financial calculator), Travel >
// Distance, Route & Travel Time (time zone meeting, GPS distance) and Law & Government > Government
// Fees & Public Finance (ranked-choice voting). Formulas: src/lib/calc-engine-tech-misc.ts.
//
// HOW TO RUN
//   npm run db:create-tech-misc-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-tech-misc";
import { mk, num, dd, tx, date, money, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.techMiscCustomCalculators;

const FUN: ToolDef[] = [
  mk({
    slug: "cs2-trade-up-calculator", title: "CS2 Trade Up Calculator (Output Float & Wear)",
    meta: "CS2 Trade Up Calculator — Predict Output Float & Wear",
    desc: "Predict the float value and wear (Factory New to Battle-Scarred) of a Counter-Strike 2 trade-up contract from your 10 input skins' floats and the output skin's float range. Supports the CS2 normalised formula and the classic CS:GO average.",
    inputs: [tx("floats", "Input Floats (10, comma-separated; add @min-max for ranges)", "0.06, 0.07, 0.08, 0.05, 0.09, 0.10, 0.07, 0.06, 0.08, 0.07"), dd("method", "Formula", E.TU_METHODS, 0), num("omin", "Output Skin Min Float", 0, 0, 1, 0.001), num("omax", "Output Skin Max Float", 0.8, 0, 1, 0.001), num("target", "Target Float (e.g. 0.07 for FN)", 0.07, 0, 1, 0.001)],
    results: [["float", "Output Float", "n", 6], ["wear", "Output Wear", "t"], ["avg", "Average Input (used)", "n", 6], ["need", "To Reach Target", "t"], ["count", "Inputs", "n", 0]],
    fn: C["cs2-trade-up-calculator"], ex: { ...T("floats", "0.06, 0.07, 0.08, 0.05, 0.09, 0.10, 0.07, 0.06, 0.08, 0.07"), method: 1, omin: 0, omax: 0.8, target: 0.07 },
    exText: (o) => `Example: ten inputs averaging ${o.avg} into a skin with a 0.00–0.80 range give an output float of ${o.float} (${o.wear}).`,
    how: "Output float = output min + average input × (output max − output min). Since 2024, CS2 first converts each input to its position within its own float range (normalised), so low-float inputs from narrow-range skins count for more. Add each input's range after @ (e.g. 0.12@0.06-0.8) for that method; plain numbers assume 0–1.\n\nTo get Factory New (< 0.07) from a wide-range skin, you need very low-float inputs.",
    assume: "Doesn't calculate outcome odds or prices. Check each skin's exact float range on a market or inspect site before buying inputs.",
    faq: [["How is the trade-up float calculated?", "The average of the inputs' (normalised) floats is mapped into the output skin's own float range."], ["How many skins does a trade-up need?", "10 of the same rarity, or 5 Covert skins for a knife or glove trade-up."]],
  }),
  mk({
    slug: "dnd-dpr-calculator", title: "D&D Damage Per Round Calculator (DPR, Hit Chance & Crits)",
    meta: "D&D DPR Calculator — 5e Damage per Round vs AC",
    desc: "Calculate expected damage per round (DPR) in D&D 5e from your attack bonus, the target's AC, number of attacks, damage dice and crit range, with advantage or disadvantage and once-per-turn extra damage like Sneak Attack or Smite. Also rounds to defeat a monster.",
    inputs: [num("bonus", "Attack Bonus", 7, -5, 30, 1), num("ac", "Target AC", 15, 1, 40, 1), num("attacks", "Attacks per Round", 2, 1, 20, 1), tx("damage", "Damage per Hit (dice)", "1d8+4"), num("crit", "Crit On (19 for Champion)", 20, 2, 20, 1), dd("adv", "Roll", E.ADV, 0), tx("rider", "Once-per-Turn Extra Damage (e.g. 3d6, optional)", ""), num("hp", "Target Hit Points (optional)", 60, 0, 10000, 1)],
    results: [["dpr", "Damage per Round", "n", 2], ["hit", "Hit Chance (%)", "n", 1], ["crit", "Crit Chance (%)", "n", 1], ["perAttack", "Expected per Attack", "n", 2], ["perHit", "Average Damage on a Hit", "n", 2], ["rider", "Extra Damage", "t"], ["rounds", "Rounds to Defeat", "t"]],
    fn: C["dnd-dpr-calculator"], ex: { bonus: 7, ac: 15, attacks: 2, ...T("damage", "1d8+4"), crit: 20, adv: 0, ...T("rider", ""), hp: 60 },
    exText: (o) => `Example: two longsword attacks at +7 (1d8+4) against AC 15 hit ${o.hit}% of the time for ${o.dpr} damage per round, defeating a 60 HP foe in about ${String(o.rounds).split(" ")[0]} rounds.`,
    how: "You hit when d20 + bonus ≥ AC, so hit chance = (21 − (AC − bonus)) ÷ 20, capped at 5–95% (a natural 1 always misses, a natural 20 always hits). Critical hits roll the damage dice twice but not the modifier.\n\nAdvantage turns a hit chance p into 1 − (1 − p)². Once-per-turn damage is added if at least one attack lands.",
    assume: "Damage resistances, Great Weapon Fighting rerolls and multiple riders aren't modelled. Use average dice values.",
    faq: [["What is a good DPR at level 5?", "About 15–20 against AC 15 is strong for a martial character."], ["How much does advantage help?", "It's worth roughly +3 to +5 on the attack roll, depending on your hit chance."]],
  }),
  mk({
    slug: "minecraft-nether-portal-calculator", title: "Nether Portal Calculator (Minecraft Coordinates)",
    meta: "Nether Portal Calculator — Overworld to Nether Coordinates",
    desc: "Convert Minecraft coordinates between the Overworld and the Nether (÷ 8 or × 8) to link nether portals correctly and build fast nether highways.",
    inputs: [dd("mode", "Convert", E.NP_MODES, 0), num("x", "X", 800, -3e7, 3e7, 1), num("y", "Y", 64, -64, 320, 1), num("z", "Z", -1200, -3e7, 3e7, 1)],
    results: [["coords", "Build the Portal At", "t"], ["dim", "Dimension", "t"], ["exact", "Exact (before rounding)", "t"], ["travel", "Travel Distance", "t"], ["note", "Linking Tip", "t"]],
    fn: C["minecraft-nether-portal-calculator"], ex: { mode: 0, x: 800, y: 64, z: -1200 },
    exText: (o) => `Example: an Overworld portal at X 800, Z −1200 links to a Nether portal at ${o.coords}.`,
    how: "One block in the Nether equals 8 blocks in the Overworld for X and Z, so divide Overworld coordinates by 8 to find where to build in the Nether (or multiply by 8 going the other way). Y doesn't scale.\n\nPortals link to the nearest portal within range, so build the second portal at these coordinates to stop it linking to the wrong one.",
    assume: "Java and Bedrock Edition. Nether portals must be below the bedrock roof (Y 128).",
    faq: [["How do I link two nether portals?", "Build the Nether portal at your Overworld X and Z divided by 8."], ["Why does my portal go to the wrong place?", "It linked to an existing portal nearby. Build one at the exact converted coordinates."]],
  }),
  mk({
    slug: "minecraft-xp-calculator", title: "Minecraft XP Calculator (Levels, Points & Bottles)",
    meta: "Minecraft XP Calculator — XP Points to Level & Level to XP",
    desc: "Work out how many experience points you need to go from one Minecraft level to another (such as 0 to 30 for enchanting), or what level a number of XP points gives you, plus the Bottles o' Enchanting needed.",
    inputs: [dd("mode", "Calculate", E.XP_MODES, 0), num("from", "Current Level", 0, 0, 10000, 1), num("to", "Target Level", 30, 0, 10000, 1), num("points", "Total XP Points", 1395, 0, 1e9, 1)],
    results: [["xp", "Experience Points", "n", 0], ["level", "Level", "n", 0], ["progress", "Progress", "t"], ["bottles", "Bottles o' Enchanting (≈ 7 XP each)", "n", 0], ["next", "XP for the Next Level", "n", 0]],
    fn: C["minecraft-xp-calculator"], ex: { mode: 0, from: 0, to: 30, points: 1395 },
    exText: (o) => `Example: level 0 to 30 takes ${o.xp} XP points, about ${o.bottles} Bottles o' Enchanting.`,
    how: "Each level needs more XP than the last: 7 points for level 1, then +2 per level up to 16, +5 per level up to 31 and +9 after that. Total XP to reach level 30 is 1,395 points.\n\nEnchanting costs levels, not points, and anvil work costs more at high levels. Spend XP before it climbs past 30.",
    assume: "Java Edition formulas (Bedrock is the same).",
    faq: [["How much XP is level 30?", "1,395 points from zero."], ["How many bottles of enchanting for level 30?", "About 200 (each gives 3–11 XP, 7 on average)."]],
  }),
  mk({
    slug: "mee6-level-calculator", title: "MEE6 Level Calculator (Discord XP & Messages Needed)",
    meta: "MEE6 Level Calculator — XP & Messages to Reach a Level",
    desc: "Calculate how much XP and how many messages you need to reach a MEE6 level on a Discord server, from your current level and XP, including how much chatting time that takes.",
    inputs: [num("level", "Current Level", 5, 0, 1000, 1), num("xp", "XP Into Current Level", 0, 0, 1e9, 1), num("target", "Target Level", 20, 1, 1000, 1)],
    results: [["need", "XP Needed", "t"], ["msgs", "Messages Needed (average 20 XP)", "t"], ["range", "Range (15–25 XP per message)", "t"], ["time", "Time", "t"], ["total", "Total XP for Target Level from 0", "t"], ["nextStep", "XP for Your Next Level", "t"]],
    fn: C["mee6-level-calculator"], ex: { level: 5, xp: 0, target: 20 },
    exText: (o) => `Example: from level 5 to 20 you need ${o.need} XP, about ${o.msgs} messages.`,
    how: "MEE6 gives 15–25 XP (20 on average) for a message, at most once a minute, so spamming doesn't help. Going from level L to L + 1 needs 5L² + 50L + 100 XP.\n\nUse /rank on the server to see your current level and XP.",
    assume: "Default MEE6 settings. Servers can change the XP rate or use XP boosts (premium), which change the message count.",
    faq: [["How much XP is MEE6 level 10?", "4,675 XP in total from level 0."], ["How do you level up fast in MEE6?", "Chat regularly. Only one message per minute earns XP."]],
  }),
  mk({
    slug: "love-calculator", title: "Love Calculator (Name Compatibility Test)",
    meta: "Love Calculator — Fun Name Compatibility Percentage",
    desc: "A fun love calculator: type two names to get a compatibility percentage and a playful message. The same names always give the same result.",
    inputs: [tx("a", "Your Name", "Romeo"), tx("b", "Their Name", "Juliet")],
    results: [["pct", "Love Score (%)", "n", 0], ["msg", "Verdict", "t"], ["shared", "Shared Letters", "t"], ["note", "Note", "t"]],
    fn: C["love-calculator"], ex: { ...T("a", "Romeo"), ...T("b", "Juliet") },
    exText: (o) => `Example: Romeo + Juliet = ${o.pct}% — "${o.msg}"`,
    how: "Enter two first names (or full names). The calculator turns the letters into a score from 35% to 100%. Swapping the order gives the same answer.\n\nIt's a party game, so don't make life decisions with it.",
    assume: "Entertainment only. The score comes from the letters of the names, not from any real compatibility research.",
    faq: [["Is the love calculator accurate?", "No. It's just for fun."], ["Why does it always give the same result?", "The score is calculated from the names, so the same pair always matches."]],
  }),
  mk({
    slug: "scrabble-score-calculator", title: "Scrabble Score Calculator (Word Points with Bonus Squares)",
    meta: "Scrabble Score Calculator — Word Points, DL, TL, DW & Bingo",
    desc: "Score a Scrabble word with official English letter values, including double/triple letter and word squares, blank tiles and the 50-point bingo for using all seven tiles.",
    inputs: [tx("word", "Word (use ? for a blank)", "QUIZ"), tx("squares", "Letter Bonus Squares (e.g. 1:TL, 3:DL)", "1:TL"), dd("wordMult", "Word Bonus", E.WORD_MULT, 1), dd("bingo", "Used All 7 Tiles?", ["No", "Yes (+50)"], 0), dd("lower", "Lower-Case Letters Are Blanks?", ["No", "Yes"], 0)],
    results: [["score", "Score", "n", 0], ["letters", "Letters", "t"], ["base", "Face Value", "n", 0], ["wm", "Word Multiplier", "t"], ["bingo", "Bingo", "t"], ["length", "Tiles", "n", 0]],
    fn: C["scrabble-score-calculator"], ex: { ...T("word", "QUIZ"), ...T("squares", "1:TL"), wordMult: 1, bingo: 0, lower: 0 },
    exText: (o) => `Example: QUIZ with the Q on a triple-letter and the word on a double-word square scores ${o.score} points.`,
    how: "Add the letter values, multiply any letter on a DL (×2) or TL (×3) square, then multiply the whole word by any DW (×2) or TW (×3) squares it covers. Blanks score 0. Using all seven tiles in one turn adds 50.\n\nBonus squares only count when you place a new tile on them.",
    assume: "Standard English Scrabble tile values. Words made at the same time (cross-words) need scoring separately.",
    faq: [["How many points is Q in Scrabble?", "10, the same as Z."], ["What is a bingo?", "Playing all seven tiles in one turn, which earns a 50-point bonus."]],
  }),
];

const SCHOOL: ToolDef[] = [
  mk({
    slug: "typing-speed-calculator", title: "Typing Speed Calculator (WPM, Accuracy & KPH)",
    meta: "Typing Speed Calculator — Words per Minute & Accuracy",
    desc: "Work out your typing speed in words per minute (gross and net WPM), accuracy, characters per minute and keystrokes per hour (KPH) from a typing test's characters or words, time and errors.",
    inputs: [dd("mode", "You Typed", E.TYPE_MODES, 0), num("count", "Characters (or Words) Typed", 250, 0, 1e7, 1), num("seconds", "Time (seconds)", 60, 1, 1e6, 1, "s"), num("errors", "Uncorrected Errors", 3, 0, 1e6, 1)],
    results: [["net", "Net WPM", "n", 1], ["gross", "Gross WPM", "n", 1], ["acc", "Accuracy (%)", "n", 1], ["cpm", "Characters per Minute", "n", 0], ["kph", "Keystrokes per Hour", "t"], ["level", "Level", "t"]],
    fn: C["typing-speed-calculator"], ex: { mode: 0, count: 250, seconds: 60, errors: 3 },
    exText: (o) => `Example: 250 characters in 60 seconds with 3 errors is ${o.net} net WPM at ${o.acc}% accuracy.`,
    how: "Typing tests count a \"word\" as 5 characters, including spaces, so speeds compare fairly. Gross WPM = characters ÷ 5 ÷ minutes. Net WPM subtracts one word per minute for each uncorrected error.\n\nData-entry jobs often ask for keystrokes per hour (KPH): 10,000+ KPH is typical for 10-key or alphanumeric roles.",
    assume: "Standard 5-character word. Different test sites penalise errors slightly differently.",
    faq: [["What is a good typing speed?", "About 40 WPM is average; 60–80 is fast; 100+ is professional."], ["What typing speed do jobs require?", "Usually 40–50 WPM for office roles and 60–80 WPM for transcription."]],
  }),
];

const SALARY: ToolDef[] = [
  mk({
    slug: "time-card-calculator", title: "Time Card Calculator (Weekly Timesheet with Lunch Breaks)",
    meta: "Time Card Calculator — Weekly Hours, Breaks, Overtime & Pay",
    desc: "Enter clock-in and clock-out times for each day, with lunch or unpaid breaks and split shifts, to total the week's hours in hours:minutes and decimal, split regular, overtime and double time, and work out gross pay.",
    inputs: [tx("mon", "Monday (e.g. 9:00-17:30 L30)", "9:00-17:30 L30"), tx("tue", "Tuesday", "8:30am-5:15pm L30"), tx("wed", "Wednesday", "9:00-12:00, 12:30-18:00"), tx("thu", "Thursday", "9:00-17:00 L60"), tx("fri", "Friday", "9:00-19:00 L30"), tx("sat", "Saturday", ""), tx("sun", "Sunday", ""), dd("rounding", "Round Punches", E.ROUNDING, 0), dd("otRule", "Overtime Rule", ["Over 40 h a week (FLSA)", "California daily (8 h / 12 h) + weekly", "No overtime"], 0), money("rate", "Hourly Rate", 20), num("mult", "Overtime Multiplier", 1.5, 1, 3, 0.05)],
    results: [["total", "Total Hours (h:mm)", "t"], ["decimal", "Total Hours (decimal)", "n", 2], ["regular", "Regular Hours", "n", 2], ["ot", "Overtime Hours", "n", 2], ["dt", "Double-Time Hours", "n", 2], ["pay", "Gross Pay", "c"], ["days", "By Day", "t"]],
    fn: C["time-card-calculator"], ex: { ...T("mon", "9:00-17:30 L30"), ...T("tue", "8:30am-5:15pm L30"), ...T("wed", "9:00-12:00, 12:30-18:00"), ...T("thu", "9:00-17:00 L60"), ...T("fri", "9:00-19:00 L30"), ...T("sat", ""), ...T("sun", ""), rounding: 0, otRule: 0, rate: 20, mult: 1.5 },
    exText: (o) => `Example: this week adds up to ${o.total} (${o.decimal} hours): 40 regular plus ${o.ot} overtime, so $20/hour pays $${Number(o.pay).toFixed(2)} gross.`,
    how: "For each day, type the start and end times (9:00-17:30 or 9am-5:30pm) and add \"L30\" for a 30-minute unpaid lunch. For split shifts, separate the parts with a comma. Overnight shifts that end after midnight are handled automatically.\n\nDecimal hours are what payroll uses: 7 h 45 min = 7.75 h. For a two-week pay period, total each week separately, because overtime is usually counted per week.",
    assume: "FLSA overtime is paid over 40 hours a week. The California option pays 1.5× over 8 h a day and 2× over 12 h a day, plus 1.5× for weekly hours over 40 (simplified: no seventh-day rule). Rounding follows the 7-minute rule when set to 15 minutes. Gross pay is before tax.",
    faq: [["How do I convert minutes to decimal hours?", "Divide by 60: 15 min = 0.25, 30 = 0.5, 45 = 0.75."], ["Is lunch paid?", "Usually not if it's 30 minutes or more and you're fully relieved of duty. Short breaks of 5–20 minutes are paid under federal law."]],
  }),
];

const FIN: ToolDef[] = [
  mk({
    slug: "financial-calculator", title: "Financial Calculator (TVM Solver like the BA II Plus & HP 12C)",
    meta: "Financial Calculator — Solve N, I/Y, PV, PMT, FV (BA II Plus)",
    desc: "An online time-value-of-money calculator that works like a BA II Plus or HP 12C: solve for future value, present value, payment, number of periods or interest rate from the other four, with payments per year and beginning/end timing.",
    inputs: [dd("solve", "Solve For", E.TVM_SOLVE, 2), num("n", "N — Number of Payments", 360, 0, 1e5, 1), num("iy", "I/Y — Annual Interest Rate (%)", 6, -99, 1000, 0.0001, "%"), num("pv", "PV — Present Value", 200000, -1e12, 1e12, 0.01), num("pmt", "PMT — Payment per Period", 0, -1e12, 1e12, 0.01), num("fv", "FV — Future Value", 0, -1e12, 1e12, 0.01), num("py", "P/Y — Payments per Year", 12, 1, 365, 1), dd("timing", "Payment Timing", ["END (ordinary annuity)", "BGN (annuity due)"], 0)],
    results: [["result", "Answer", "t"], ["n", "N", "n", 2], ["iy", "I/Y (%)", "n", 6], ["pv", "PV", "n", 2], ["pmt", "PMT", "n", 2], ["fv", "FV", "n", 2], ["totals", "Totals", "t"], ["years", "Years", "n", 2]],
    fn: C["financial-calculator"], ex: { solve: 2, n: 360, iy: 6, pv: 200000, pmt: 0, fv: 0, py: 12, timing: 0 },
    exText: (o) => `Example: a $200,000 loan at 6% over 360 months has PMT = ${o.result} (negative because you pay it). ${o.totals}.`,
    how: "Fill in four of the five TVM values and choose the one to solve. Use cash-flow signs as on a BA II Plus: money you receive (a loan) is positive, money you pay out (payments, a deposit) is negative. For savings: PV = −10,000 (deposit), solve FV.\n\nI/Y is the annual rate; P/Y sets how many payments per year (12 for monthly). Choose BGN for leases and annuities due.",
    assume: "Compounding frequency equals payment frequency (C/Y = P/Y). Interest-rate solving uses a numerical search. For uneven cash flows, use the NPV or IRR calculators.",
    faq: [["Why is my payment negative?", "It's money flowing out. The BA II Plus shows it the same way."], ["How do I find the interest rate on a loan?", "Enter N, PV (loan amount, positive), PMT (negative) and FV = 0, then solve I/Y."]],
  }),
];

const TRAVEL: ToolDef[] = [
  mk({
    slug: "time-zone-meeting-calculator", title: "Time Zone Meeting Planner (Best Time Across Cities)",
    meta: "Time Zone Meeting Calculator — Find a Time That Works for All",
    desc: "Plan a meeting across time zones: see what a time in one city is in all the others (with daylight saving for your date) and find the hours that fall inside everyone's working day.",
    inputs: [tx("cities", "Cities (first one is the organiser)", "New York, London, Dhaka"), date("date", "Meeting Date", "today"), tx("time", "Meeting Time in the First City", "09:00"), num("start", "Working Day Starts (hour)", 8, 0, 23, 0.5), num("end", "Working Day Ends (hour)", 18, 1, 24, 0.5)],
    results: [["times", "Local Times", "t"], ["overlap", "Times That Work for Everyone", "t"], ["best", "Suggested Time", "t"], ["date", "Date", "t"]],
    fn: C["time-zone-meeting-calculator"], ex: { ...T("cities", "New York, London, Berlin"), date: 20454, ...T("time", "09:00"), start: 8, end: 18 },
    exText: (o) => `Example: 9:00 in New York on 1 January 2026 is ${String(o.times).split("\n").slice(1).map((x) => x.split(" (")[0]).join(" and ")}. Everyone's working hours overlap ${o.overlap}.`,
    how: "List the cities separated by commas, with the organiser first. You can also use IANA zones (Europe/Paris) or fixed offsets (UTC+5:30). Daylight-saving time is applied for the date you pick, because the US and Europe change clocks on different weekends.\n\nIf there's no overlap, widen the working hours or rotate meeting times so the same people aren't always on early or late.",
    assume: "Covers about 70 major cities plus any IANA zone name. Uses the IANA time-zone database, checked at midday on the chosen date.",
    faq: [["What time is 9 am New York in London?", "2 pm for most of the year (1 pm for a few weeks in March and in late October/early November when the clocks change on different dates)."], ["What's the best time for a US–Europe–Asia meeting?", "Often early morning in the US, afternoon in Europe and evening in Asia; one region usually has to stretch."]],
  }),
  mk({
    slug: "gps-coordinates-distance-calculator", title: "GPS Coordinates Distance Calculator (Lat/Long Distance & Bearing)",
    meta: "GPS Distance Calculator — Distance Between Two Coordinates",
    desc: "Calculate the great-circle distance between two GPS coordinates (decimal degrees or degrees-minutes-seconds) or two cities, in km, miles and nautical miles, with the initial and final bearing and the midpoint.",
    inputs: [tx("a", "Point A (lat, long — or a city)", "40.7128, -74.0060"), tx("b", "Point B", "51.5074, -0.1278")],
    results: [["km", "Distance (km)", "n", 2], ["mi", "Distance (miles)", "n", 2], ["nm", "Distance (nautical miles)", "n", 2], ["bearing", "Initial Bearing", "t"], ["final", "Final Bearing", "t"], ["mid", "Midpoint", "t"], ["from", "Route", "t"]],
    fn: C["gps-coordinates-distance-calculator"], ex: { ...T("a", "40.7128, -74.0060"), ...T("b", "51.5074, -0.1278") },
    exText: (o) => `Example: New York (40.7128, −74.0060) to London (51.5074, −0.1278) is ${o.km} km (${o.mi} mi). Head out on ${o.bearing}.`,
    how: "Enter coordinates as decimal degrees (40.7128, −74.0060): north and east positive, south and west negative. Or use degrees-minutes-seconds like 51°30'26\"N 0°7'39\"W, or a major city name.\n\nThe haversine formula gives the shortest path over the Earth's surface (great circle). The bearing changes along the way, which is why initial and final bearings differ.",
    assume: "Spherical Earth (mean radius 6,371 km); accurate to about 0.5% compared with the ellipsoid. Straight-line distance, not road distance.",
    faq: [["How do I calculate distance between two coordinates?", "Use the haversine formula, or this calculator, which does it for you."], ["How far is 1 degree of latitude?", "About 111 km (69 miles)."]],
  }),
];

const LAW: ToolDef[] = [
  mk({
    slug: "ranked-choice-voting-calculator", title: "Ranked Choice Voting Calculator (Instant-Runoff Tally)",
    meta: "Ranked Choice Voting Calculator — Instant-Runoff Rounds",
    desc: "Count a ranked-choice (instant-runoff) election round by round: eliminate the last-place candidate, transfer those ballots to their next choice, and repeat until someone has a majority. Shows each round and compares with a plurality vote.",
    inputs: [tx("ballots", "Ballots: count: first > second > … (separate with ;)", "8: A > B > C; 7: B > C > A; 6: C > B > A")],
    results: [["winner", "Winner", "t"], ["rounds", "Rounds", "t"], ["plurality", "Compared with Plurality", "t"], ["ballots", "Ballots", "n", 0], ["candidates", "Candidates", "n", 0]],
    fn: C["ranked-choice-voting-calculator"], ex: T("ballots", "8: A > B > C; 7: B > C > A; 6: C > B > A"),
    exText: (o) => `Example: A leads the first round with 8 of 21 votes, but when C is eliminated those voters' second choice is B, so ${o.winner} wins with a majority.`,
    how: "Group identical ballots with a count, e.g. 12: Smith > Lee > Patel. In each round every ballot counts for its highest-ranked candidate still in the race. If nobody has more than half of the continuing ballots, the last-place candidate is eliminated and their ballots move on.\n\nBallots that rank no remaining candidates are exhausted and drop out of the count.",
    assume: "Single-winner instant-runoff voting. Last-place ties are broken by fewer first-round votes, then alphabetically. Real elections follow their own statutory tie-break rules.",
    faq: [["How does ranked-choice voting work?", "Voters rank candidates; the weakest candidate is eliminated round by round and their votes transfer until someone has a majority."], ["Can the first-round leader lose?", "Yes, if more voters prefer another candidate once lower preferences are counted."]],
  }),
];

async function main() {
  const all = [...FUN, ...SCHOOL, ...SALARY, ...FIN, ...TRAVEL, ...LAW];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  await upsertTools("tarot-astrology-fun-calculators", FUN);
  await upsertTools("school-age-classroom-calculators", SCHOOL);
  await upsertTools("salary-income-calculators", SALARY);
  await upsertTools("investment-returns-planning-calculators", FIN);
  await upsertTools("distance-route-travel-time-calculators", TRAVEL);
  await upsertTools("government-fees-public-finance-calculators", LAW);
}
main().catch((e) => { console.error(e); process.exit(1); });
