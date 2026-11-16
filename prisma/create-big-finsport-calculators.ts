// One-time (but safe to re-run) batch setup script: 10 tools from the big generic keyword check
// (16 Nov 2026 — Claude outputs/Big_Generic_Keyword_Check.md): intrinsic value, CAPM, MIRR,
// profitability index, book value, race time predictor, arrow speed, bowling average, poker
// odds and roulette. Formulas: src/lib/calc-engine-big-finsport.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-big-finsport-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-big-finsport";
import { mk, num, dd, tx, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.bigFinSportCustomCalculators;
const INV = "For education only — not investment advice.";

const STOCK: ToolDef[] = [
  mk({
    slug: "intrinsic-value-calculator", title: "Intrinsic Value Calculator (DCF & Graham Fair Value per Share)",
    meta: "Intrinsic Value Calculator — DCF & Graham Stock Valuation",
    desc: "Estimate a stock's intrinsic value per share with a two-stage discounted cash flow (DCF) model, the Graham number or Benjamin Graham's growth formula, and compare it with the share price for a margin of safety.",
    inputs: [dd("method", "Method", E.IV_METHODS, 0), num("fcf", "Free Cash Flow, Last Year ($, DCF)", 1e9, -1e13, 1e13, 1000, "$"), num("shares", "Shares Outstanding (DCF)", 1e8, 0, 1e12, 1), num("g1", "Growth Years 1–5 (%)", 10, -50, 100, 0.1), num("g2", "Growth Years 6–10 (%)", 5, -50, 100, 0.1), num("tg", "Terminal Growth (%)", 2.5, -5, 10, 0.1), num("rate", "Discount Rate / WACC (%)", 9, 0, 50, 0.1), num("netDebt", "Net Debt ($, DCF; negative = net cash)", 0, -1e13, 1e13, 1000, "$"), num("eps", "EPS ($, Graham)", 6, -1000, 10000, 0.01, "$"), num("bvps", "Book Value per Share ($, Graham number)", 25, 0, 100000, 0.01, "$"), num("growth", "Expected Growth g (%, Graham formula)", 8, -20, 50, 0.1), num("aaa", "AAA Bond Yield Y (%, Graham formula)", 5, 0.1, 20, 0.01), num("price", "Current Share Price ($)", 150, 0, 1e6, 0.01, "$")],
    results: [["value", "Intrinsic Value", "t"], ["mos", "Margin of Safety", "t"], ["verdict", "Verdict", "t"], ["working", "Working", "t"]],
    fn: C["intrinsic-value-calculator"], ex: { method: 0, fcf: 1e9, shares: 1e8, g1: 10, g2: 5, tg: 2.5, rate: 9, netDebt: 0, eps: 6, bvps: 25, growth: 8, aaa: 5, price: 150 },
    exText: (o) => `Example: $1 billion of free cash flow growing 10% then 5%, discounted at 9% with 100 million shares, is worth about ${o.value}. ${o.verdict} at $150.`,
    how: "DCF: project free cash flow for 10 years (two growth stages), add a terminal value FCF₁₁ ÷ (r − g), discount everything to today at your required return, subtract net debt and divide by shares.\n\nGraham number = √(22.5 × EPS × book value per share). Graham's formula: V = EPS × (8.5 + 2g) × 4.4 ÷ Y, where Y is today's AAA bond yield.",
    assume: `Results are very sensitive to growth and discount rates — try several. ${INV}`,
    faq: [["What is intrinsic value?", "An estimate of what a business is worth from its future cash flows, regardless of the market price."], ["What is a good margin of safety?", "Graham wanted 30–50%."], ["What discount rate should I use?", "Often the company's WACC, or your required return (8–10% for many investors)."]],
  }),
  mk({
    slug: "book-value-calculator", title: "Book Value Calculator (Book Value per Share & P/B Ratio)",
    meta: "Book Value per Share Calculator — BVPS, Tangible BV & P/B",
    desc: "Calculate a company's book value, book value per share, tangible book value per share and price-to-book (P/B) ratio from total assets, liabilities, preferred equity, intangibles and shares outstanding.",
    inputs: [num("assets", "Total Assets ($)", 5e9, 0, 1e14, 1000, "$"), num("liabilities", "Total Liabilities ($)", 3e9, 0, 1e14, 1000, "$"), num("preferred", "Preferred Equity ($)", 0, 0, 1e14, 1000, "$"), num("intangibles", "Goodwill & Intangibles ($)", 4e8, 0, 1e14, 1000, "$"), num("shares", "Shares Outstanding", 1e8, 0, 1e12, 1), num("price", "Share Price ($)", 30, 0, 1e6, 0.01, "$")],
    results: [["bvps", "Book Value per Share", "t"], ["bv", "Book Value (Equity)", "t"], ["tbv", "Tangible Book Value", "t"], ["pb", "Price-to-Book", "t"], ["note", "Note", "t"]],
    fn: C["book-value-calculator"], ex: { assets: 5e9, liabilities: 3e9, preferred: 0, intangibles: 4e8, shares: 1e8, price: 30 },
    exText: (o) => `Example: $5 billion of assets and $3 billion of liabilities over 100 million shares is ${o.bvps}; at $30 the P/B is ${String(o.pb).split(" (")[0]}.`,
    how: "Book value = total assets − total liabilities − preferred equity (common shareholders' equity). Book value per share = book value ÷ shares outstanding. Tangible book value also removes goodwill and intangible assets.\n\nP/B = share price ÷ book value per share. Below 1 can signal value (or trouble).",
    assume: `Uses balance-sheet (accounting) values, not market values. ${INV}`,
    faq: [["How do you calculate book value per share?", "(Equity − preferred) ÷ shares outstanding."], ["What is a good P/B ratio?", "It depends on the industry; under 1–3 is often called value territory."], ["What is tangible book value?", "Book value without goodwill and intangibles."]],
  }),
];

const RETURNS: ToolDef[] = [
  mk({
    slug: "capm-calculator", title: "CAPM Calculator (Expected Return, Beta & Alpha)",
    meta: "CAPM Calculator — Expected Return = rf + β(Rm − rf)",
    desc: "Calculate a stock's expected (required) return with the Capital Asset Pricing Model from the risk-free rate, beta and expected market return, plus the market risk premium and Jensen's alpha.",
    inputs: [num("rf", "Risk-Free Rate (%)", 4.2, -5, 30, 0.01), num("beta", "Beta (β)", 1.2, -5, 10, 0.01), num("rm", "Expected Market Return (%)", 10, -50, 100, 0.01), num("actual", "Actual Return (%, optional, for alpha)", 0, -100, 1000, 0.01)],
    results: [["er", "Expected Return", "t"], ["premium", "Risk Premium", "t"], ["alpha", "Alpha", "t"], ["beta", "Beta", "t"], ["formula", "Working", "t"]],
    fn: C["capm-calculator"], ex: { rf: 4.2, beta: 1.2, rm: 10, actual: 0 },
    exText: (o) => `Example: with a 4.2% risk-free rate, beta 1.2 and a 10% market return, CAPM gives an expected return of ${o.er}.`,
    how: "CAPM: expected return = risk-free rate + β × (market return − risk-free rate). The bracket is the market risk premium; beta scales it for how much the stock moves with the market.\n\nUse the 10-year Treasury yield as the risk-free rate. Jensen's alpha = actual return − CAPM return.",
    assume: INV,
    faq: [["What is the CAPM formula?", "E(R) = rf + β(Rm − rf)."], ["What is a typical market risk premium?", "About 4–6% a year."], ["What does a beta of 1.5 mean?", "The stock tends to move 1.5× as much as the market."]],
  }),
  mk({
    slug: "mirr-calculator", title: "MIRR Calculator (Modified Internal Rate of Return)",
    meta: "MIRR Calculator — Modified IRR with Finance & Reinvest Rates",
    desc: "Calculate the modified internal rate of return (MIRR) of a series of cash flows with separate finance and reinvestment rates, alongside the regular IRR and NPV.",
    inputs: [tx("flows", "Cash Flows, Year 0 First (e.g. -10000, 3000, 4000, 5000)", "-10000, 3000, 4000, 5000, 2000"), num("finance", "Finance Rate (%)", 8, -50, 100, 0.01), num("reinvest", "Reinvestment Rate (%)", 10, -50, 100, 0.01)],
    results: [["mirr", "MIRR", "t"], ["irr", "IRR", "t"], ["npv", "NPV", "t"], ["parts", "Working", "t"], ["formula", "Formula", "t"]],
    fn: C["mirr-calculator"], ex: { ...T("flows", "-10000, 3000, 4000, 5000, 2000"), finance: 8, reinvest: 10 },
    exText: (o) => `Example: −$10,000 then $3,000, $4,000, $5,000 and $2,000 has a MIRR of ${o.mirr} (IRR ${o.irr}).`,
    how: "MIRR = (future value of positive cash flows at the reinvestment rate ÷ present value of negative cash flows at the finance rate)^(1/n) − 1, where n is the number of periods.\n\nUnlike IRR, MIRR assumes cash flows are reinvested at a realistic rate and always gives a single answer.",
    assume: `Equal periods (usually years). ${INV}`,
    faq: [["What is the difference between IRR and MIRR?", "MIRR uses a chosen reinvestment rate; IRR assumes reinvestment at the IRR itself."], ["Is MIRR usually lower than IRR?", "Yes, when the reinvestment rate is below the IRR."], ["What does Excel use?", "=MIRR(values, finance_rate, reinvest_rate) — the same formula."]],
  }),
  mk({
    slug: "profitability-index-calculator", title: "Profitability Index Calculator (PI = PV ÷ Initial Investment)",
    meta: "Profitability Index Calculator — PI, NPV & Decision",
    desc: "Calculate the profitability index (PI) of a project — the present value of future cash flows divided by the initial investment — with the NPV and an accept/reject decision.",
    inputs: [num("investment", "Initial Investment ($)", 100000, 0, 1e13, 1, "$"), num("rate", "Discount Rate (%)", 10, -50, 100, 0.01), tx("flows", "Future Cash Flows, Year 1 First", "30000, 35000, 40000, 45000")],
    results: [["pi", "Profitability Index", "t"], ["decision", "Decision", "t"], ["pv", "PV of Cash Flows", "t"], ["npv", "NPV", "t"], ["formula", "Working", "t"]],
    fn: C["profitability-index-calculator"], ex: { investment: 100000, rate: 10, ...T("flows", "30000, 35000, 40000, 45000") },
    exText: (o) => `Example: $100,000 invested for $30k, $35k, $40k and $45k over four years at 10% has a PI of ${o.pi} — ${o.decision}.`,
    how: "PI = present value of future cash flows ÷ initial investment. PV = Σ CFₜ ÷ (1 + r)ᵗ.\n\nA PI above 1 means the project returns more than it costs at your discount rate (NPV > 0). Use PI to rank projects when capital is limited.",
    assume: INV,
    faq: [["What is a good profitability index?", "Anything above 1.0."], ["How is PI related to NPV?", "PI = 1 + NPV ÷ initial investment."], ["What if PI is below 1?", "The project destroys value at that discount rate."]],
  }),
];

const RUN: ToolDef[] = [mk({
  slug: "race-time-predictor-calculator", title: "Race Time Predictor (Riegel Formula for 5K to Marathon)",
  meta: "Race Time Predictor — Predict Your Marathon from a 5K",
  desc: "Predict your race times for the mile, 5K, 10K, 15K, 10 miles, half marathon and marathon from a recent race result with the Riegel formula, with the pace for each distance.",
  inputs: [dd("dist", "Recent Race Distance", E.RT_LABELS, 1), num("km", "Custom Distance (km)", 8, 0.1, 500, 0.01), tx("time", "Your Time (mm:ss or h:mm:ss)", "25:00"), num("target", "Predict a Custom Distance (km, 0 = skip)", 0, 0, 500, 0.01), num("exp", "Fatigue Exponent", 1.06, 1, 1.2, 0.01)],
  results: [["marathon", "Marathon", "t"], ["half", "Half Marathon", "t"], ["tenk", "10K", "t"], ["fivek", "5K", "t"], ["all", "All Distances", "t"], ["target", "Custom Distance", "t"], ["formula", "Formula", "t"]],
  fn: C["race-time-predictor-calculator"], ex: { dist: 1, km: 8, ...T("time", "25:00"), target: 0, exp: 1.06 },
  exText: (o) => `Example: a 25:00 5K predicts about ${o.tenk} for 10K, ${o.half} for a half marathon and ${o.marathon} for a marathon.`,
  how: "Pete Riegel's formula: T₂ = T₁ × (D₂ ÷ D₁)^1.06. The exponent 1.06 reflects how pace slows as races get longer; use 1.07–1.08 if you're not trained for long distances.\n\nPredictions are best from a race between half and double the target distance.",
  assume: "Assumes proper training for the longer distance; marathon predictions from short races are often optimistic.",
  faq: [["How accurate is the Riegel formula?", "Usually within 2–5% for trained runners."], ["What marathon time does a 20-minute 5K predict?", "About 3:11."], ["What is a good fatigue exponent?", "1.06 for most; 1.08 for beginners."]],
})];

const OTHER: ToolDef[] = [
  mk({
    slug: "arrow-speed-calculator", title: "Arrow Speed Calculator (Real FPS from IBO, KE & Momentum)",
    meta: "Arrow Speed Calculator — Real FPS from Your Bow's IBO",
    desc: "Estimate your real arrow speed in feet per second from the bow's IBO rating, your draw length, draw weight, arrow weight and string accessories, with kinetic energy, momentum and grains per pound.",
    inputs: [num("ibo", "IBO Speed Rating (fps)", 340, 100, 500, 1), num("drawLength", "Draw Length (in)", 29, 20, 34, 0.5), num("drawWeight", "Draw Weight (lb)", 70, 10, 100, 1), num("arrow", "Total Arrow Weight (grains)", 425, 100, 1500, 1), num("string", "Weight on the String (grains: peep, loop, silencers)", 10, 0, 200, 1)],
    results: [["fps", "Arrow Speed", "t"], ["ke", "Kinetic Energy", "t"], ["momentum", "Momentum", "t"], ["gpp", "Grains per Pound", "t"], ["formula", "Working", "t"]],
    fn: C["arrow-speed-calculator"], ex: { ibo: 340, drawLength: 29, drawWeight: 70, arrow: 425, string: 10 },
    exText: (o) => `Example: a 340 IBO bow at 29 in and 70 lb shooting a 425-grain arrow flies about ${o.fps}, with ${o.ke}.`,
    how: "IBO speed is measured at 30 in draw, 70 lb and a 350-grain arrow (5 grains per pound). Subtract about 10 fps per inch of draw under 30 in, 1 fps for every 3 grains of arrow weight above 5 grains per pound of draw weight, and 1 fps per 3 grains on the string.\n\nKinetic energy = grains × fps² ÷ 450,800; momentum = grains × fps ÷ 225,400.",
    assume: "A rule-of-thumb estimate; a chronograph gives the true speed.",
    faq: [["How fast does an arrow fly?", "Most compound bows shoot 260–320 fps with hunting arrows."], ["How much KE do I need for deer?", "About 25–41 ft·lb."], ["What is IBO speed?", "A standard test speed at 70 lb, 30 in draw and a 350-grain arrow."]],
  }),
  mk({
    slug: "bowling-average-calculator", title: "Bowling Average Calculator (League Average & Handicap)",
    meta: "Bowling Average Calculator — Average, Series & Handicap",
    desc: "Calculate your bowling average from your game scores (truncated, the way leagues do), total pins, high and low games, average series and your league handicap.",
    inputs: [tx("scores", "Game Scores (comma separated)", "165, 182, 157, 201, 174, 169"), num("basis", "Handicap Basis", 220, 0, 300, 1), num("pct", "Handicap Percentage (%)", 90, 0, 100, 1)],
    results: [["average", "Bowling Average", "t"], ["games", "Games", "t"], ["high", "High / Low", "t"], ["handicap", "Handicap", "t"], ["series", "Series", "t"]],
    fn: C["bowling-average-calculator"], ex: { ...T("scores", "165, 182, 157, 201, 174, 169"), basis: 220, pct: 90 },
    exText: (o) => `Example: games of 165, 182, 157, 201, 174 and 169 give an average of ${o.average} and a handicap of ${o.handicap}.`,
    how: "Bowling average = total pins ÷ games, with the decimals dropped (USBC rule). Handicap = (basis − average) × percentage, also rounded down — for example (220 − 174) × 90% = 41.",
    assume: "Your league sets the basis (200–230) and percentage (80–100%).",
    faq: [["How is a bowling average calculated?", "Total pins divided by games bowled, dropping any fraction."], ["What is a good bowling average?", "150 is decent for recreational bowlers; 200+ is very good."], ["How many games set a league average?", "Usually 9–21 games."]],
  }),
];

const BETTING: ToolDef[] = [
  mk({
    slug: "poker-odds-calculator", title: "Poker Odds Calculator (Texas Hold'em Equity & Pot Odds)",
    meta: "Poker Odds Calculator — Hold'em Equity, Pot & Implied Odds",
    desc: "Calculate your Texas Hold'em equity — your chance of winning — against 1 to 9 opponents from your hole cards and the board, plus pot odds, implied odds and whether a call is profitable.",
    inputs: [tx("hole", "Your Hole Cards (e.g. As Kd)", "As Ks"), tx("board", "Board (flop/turn/river, optional)", "Qs 7h 2s"), num("opponents", "Opponents", 1, 1, 9, 1), num("pot", "Pot Before Your Call ($)", 100, 0, 1e9, 1, "$"), num("call", "Amount to Call ($)", 20, 0, 1e9, 1, "$")],
    results: [["equity", "Equity", "t"], ["win", "Win / Tie", "t"], ["potOdds", "Pot Odds", "t"], ["decision", "Decision", "t"], ["hands", "Final Hand", "t"], ["method", "Method", "t"]],
    fn: C["poker-odds-calculator"], ex: { ...T("hole", "As Ks"), ...T("board", "Qs 7h 2s"), opponents: 1, pot: 100, call: 20 },
    exText: (o) => `Example: A♠K♠ on a Q♠ 7♥ 2♠ flop has about ${o.equity}. Calling $20 into $100 needs ${String(o.potOdds).split(" —")[0]} — ${String(o.decision).toLowerCase()}.`,
    how: "Your equity is the share of the pot you'd win on average if the hand were dealt out many times; here it's found by simulating thousands of random boards and opponent hands.\n\nPot odds = call ÷ (pot + call). If your equity is higher, calling makes money in the long run. Implied odds add the money you expect to win on later streets.",
    assume: "Opponents hold random hands (no ranges); results vary by about ±1% from simulation.",
    faq: [["What are pot odds?", "The share of the final pot you must put in: call ÷ (pot + call)."], ["What is the rule of 2 and 4?", "Outs × 4 ≈ % to hit by the river from the flop; outs × 2 from the turn."], ["What are the odds of AA winning preflop heads-up?", "About 85%."]],
  }),
  mk({
    slug: "roulette-calculator", title: "Roulette Calculator (Odds, Payouts & House Edge)",
    meta: "Roulette Odds Calculator — Payouts & House Edge",
    desc: "Find the odds, payout and house edge of every roulette bet on European and American wheels, the expected loss per spin and over many spins, and the chance of at least one win.",
    inputs: [dd("wheel", "Wheel", E.RO_WHEELS, 1), dd("bet", "Bet", E.RO_LABELS, 0), num("stake", "Stake per Spin ($)", 10, 0, 1e7, 0.01, "$"), num("spins", "Number of Spins", 100, 1, 1e6, 1)],
    results: [["prob", "Chance of Winning", "t"], ["payout", "Payout", "t"], ["edge", "House Edge", "t"], ["spins", "Over Many Spins", "t"], ["bet", "Bet", "t"]],
    fn: C["roulette-calculator"], ex: { wheel: 1, bet: 0, stake: 10, spins: 100 },
    exText: (o) => `Example: a $10 straight-up bet on an American wheel wins ${o.prob} of the time, pays ${String(o.payout).split(" —")[0]} and has a ${String(o.edge).split(" (")[0]}.`,
    how: "Chance = numbers covered ÷ pockets (37 European, 38 American). Every bet pays as if there were no zeros, which creates the house edge: 2.70% on a European wheel and 5.26% on an American wheel (7.89% for the five-number bet).\n\nNo betting system changes the edge — each spin is independent.",
    assume: "Standard payouts; no 'la partage' or 'en prison' rules.",
    faq: [["What are the odds of hitting a number in roulette?", "1 in 37 (European) or 1 in 38 (American)."], ["What does 35 to 1 mean?", "A $1 bet wins $35 plus your $1 back."], ["Which roulette has better odds?", "European (single zero)."]],
  }),
];

async function main() {
  const all = [...STOCK, ...RETURNS, ...RUN, ...OTHER, ...BETTING];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); for (const t of all) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("stock-options-calculators", STOCK);
  await upsertTools("investment-returns-planning-calculators", RETURNS);
  await upsertTools("running-calculators", RUN);
  await upsertTools("other-sports-calculators", OTHER);
  await upsertTools("sports-betting-racing-calculators", BETTING);
}
main().catch((e) => { console.error(e); process.exit(1); });
