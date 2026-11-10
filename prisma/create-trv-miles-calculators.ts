// One-time (but safe to re-run) batch setup script: creates 22 airline miles-earning calculators in
// Travel Calculators > Airline Miles, Hotel Points & Rewards Calculators. Formulas and programme
// presets live in src/lib/calc-engine-trv-miles.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-travel-category.ts --apply)
//   npx tsx prisma/create-trv-miles-calculators.ts        (TRV_DRY=1 → check only, no database)
// or
//   npm run db:create-trv-miles-calculators

import * as E from "../src/lib/calc-engine-trv-miles";
import { mk, num, money, tx, dd, T, runBatch, type ToolDef } from "./trv-tool-kit";
import { TRV_MILES } from "./setup-travel-category";

const C = E.trvMilesCustomCalculators;
const CHECK = "Earning rules are summarised from each programme's published 2026 terms and rounded — partner airlines, promotions and fare buckets can earn differently. Check the programme's own calculator before you rely on a number.";

interface DistOpts { slug: string; title: string; prog: string; p: E.DistPreset; from: string; to: string; fare: number; cur?: string; desc?: string; faq: [string, string][]; note?: string }
function dist(o: DistOpts): ToolDef {
  const cur = o.cur ?? "USD";
  return mk({
    slug: o.slug, title: o.title,
    desc: o.desc ?? `Calculate how many ${o.p.unit} you earn on a flight with ${o.prog} — by route distance, fare class and elite tier — and what they're worth.`,
    inputs: [dd("how", "Distance From", ["Two airports", "A distance I enter (miles)"], 0), tx("from", "From Airport", o.from), tx("to", "To Airport", o.to), num("dist", "Flown Miles (if entering)", 3000, 0, 30000, 1), dd("fare", "Fare / Cabin", o.p.fares.map(([n, x]) => `${n} (${x}%)`), o.fare), num("custom", "Custom Earn % (0 = fare default)", 0, 0, 500, 1), dd("tier", "Elite Tier", o.p.tiers.map((t) => t[0]), 0), dd("rt", "Trip", ["One way", "Round trip"], 1), num("partner", `Other ${o.p.unit} (card, promos)`, 0, 0, 1e7, 1), num("cpp", "Value per Point (cents, 0 = typical)", 0, 0, 100, 0.01), num("goal", "Target Balance (0 = skip)", 0, 0, 1e8, 1)],
    results: [["total", `Total ${o.p.unit} Earned`, "n", 0], ["base", "Base Earn", "n", 0], ["bonus", "Tier Bonus", "n", 0], ["value", "Estimated Value", "c", cur], ["flown", "Miles Flown", "n", 0], ["rule", "Earning Rule", "t"], ["goal", "Trips to Target", "t"]],
    fn: C[o.slug], ex: { how: 0, dist: 3000, fare: o.fare, custom: 0, tier: 0, rt: 1, partner: 0, cpp: 0, goal: 0, ...T("from", o.from), ...T("to", o.to) },
    exText: (r) => `Example: ${o.from}–${o.to} round trip in ${o.p.fares[o.fare][0]} → about ${r.total} ${o.p.unit} (worth roughly ${r.value}).`,
    how: `${o.prog} awards ${o.p.unit} as a percentage of the great-circle miles flown, set by the fare class, plus an elite bonus on top. Miles flown come from the airports you enter.${o.note ? `\n\n${o.note}` : ""}`,
    assume: CHECK,
    faq: o.faq,
  });
}

interface RevOpts { slug: string; title: string; prog: string; p: E.RevPreset; spend: number; fare?: number; card?: number; desc?: string; faq: [string, string][]; note?: string }
function rev(o: RevOpts): ToolDef {
  return mk({
    slug: o.slug, title: o.title,
    desc: o.desc ?? `Calculate how many ${o.p.unit} you earn with ${o.prog} from the ticket price, fare type and elite status — plus credit card bonuses — and what they're worth.`,
    inputs: [money("spend", "Eligible Ticket Spend (base fare + carrier charges)", o.spend, o.p.sym), dd("fare", "Fare Type", o.p.fares.map((f) => f[0]), o.fare ?? 0), dd("tier", "Status", o.p.tiers.map((t) => t[0]), 0), num("card", `Co-branded Card Earn per ${o.p.sym.trim()}1 (0 = none)`, o.card ?? 0, 0, 20, 0.5), dd("direct", "Booked Direct With the Airline", ["No", "Yes"], 1), num("cpp", "Value per Point (cents, 0 = typical)", 0, 0, 1000, 0.01), num("goal", "Target Balance (0 = skip)", 0, 0, 1e8, 1)],
    results: [["total", `Total ${o.p.unit} Earned`, "n", 0], ["base", "Flight Earn", "n", 0], ["bonus", "Card & Booking Bonus", "n", 0], ["value", "Estimated Value", "c", o.p.cur], ["flown", `${o.p.unit} per ${o.p.sym.trim()}1`, "n", 3], ["rule", "Earning Rule", "t"], ["goal", "Trips to Target", "t"]],
    fn: C[o.slug], ex: { spend: o.spend, fare: o.fare ?? 0, tier: 0, card: o.card ?? 0, direct: 1, cpp: 0, goal: 0 },
    exText: (r) => `Example: ${o.p.sym}${o.spend} of eligible spend as a base member${o.card ? ` with a co-branded card` : ""} → ${r.total} ${o.p.unit} (about ${r.value}).`,
    how: `${o.prog} is revenue-based: you earn ${o.p.unit} per ${o.p.sym.trim()}1 of the base fare and carrier-imposed surcharges (government taxes don't count). Higher status earns more per ${o.p.sym.trim()}1.${o.note ? `\n\n${o.note}` : ""}`,
    assume: CHECK,
    faq: o.faq,
  });
}

const TOOLS: ToolDef[] = [
  rev({ slug: "united-mileageplus-calculator", title: "United MileagePlus Miles Calculator", prog: "United MileagePlus", p: E.UNITED, spend: 400, card: 2, faq: [["How many miles do I earn on United?", "5 miles per $1 as a general member, up to 11 per $1 as Premier 1K, on United-marketed flights."], ["Do partner flights earn the same?", "No — Star Alliance partners earn by distance and fare class."]] }),
  rev({ slug: "delta-skymiles-calculator", title: "Delta SkyMiles Calculator", prog: "Delta SkyMiles", p: E.DELTA, spend: 400, card: 2, faq: [["How many SkyMiles per dollar?", "5 per $1 for members, 7–11 for Medallions, plus 2–3 per $1 on Delta purchases with a Delta Amex card."]] }),
  rev({ slug: "aadvantage-miles-calculator", title: "AAdvantage Miles Calculator (American Airlines)", prog: "American AAdvantage", p: E.AMERICAN, spend: 400, card: 2, faq: [["How do I earn AAdvantage miles?", "On American flights, 5–11 miles per $1 by status; on partners, by distance and fare class."], ["Do miles also count as Loyalty Points?", "Yes — every base and bonus mile earned also gives a Loyalty Point; see the AA Loyalty Points Calculator."]] }),
  rev({ slug: "southwest-rapid-rewards-calculator", title: "Southwest Rapid Rewards Points Calculator", prog: "Southwest Rapid Rewards", p: E.SOUTHWEST, spend: 300, fare: 1, faq: [["How much are Southwest points worth?", "About 1.3–1.4 cents each when redeemed for flights."], ["How many points per dollar?", "Basic 2, Choice 6, Choice Preferred 8 and Choice Extra 10 points per $1 of base fare, plus A-List bonuses."]] }),
  rev({ slug: "jetblue-trueblue-points-calculator", title: "JetBlue TrueBlue Points Calculator", prog: "JetBlue TrueBlue", p: E.JETBLUE, spend: 300, fare: 1, note: "Booking on jetblue.com adds 3 points per $1.", faq: [["How many TrueBlue points per dollar?", "3 per $1 of base fare plus 3 more when you book on jetblue.com; Mosaic adds 3 more."]] }),
  rev({ slug: "flying-blue-miles-calculator", title: "Flying Blue Miles Calculator (Air France & KLM)", prog: "Flying Blue", p: E.FLYING_BLUE, spend: 600, faq: [["How many Flying Blue miles per euro?", "Explorer 4, Silver 6, Gold 7 and Platinum 8 miles per €1 on Air France, KLM and Transavia tickets."], ["Do Flying Blue miles expire?", "They stay valid as long as you earn or spend miles at least once every 24 months."]] }),
  rev({ slug: "miles-and-more-calculator", title: "Miles & More Calculator (Lufthansa Group)", prog: "Lufthansa Miles & More", p: E.MILES_MORE, spend: 600, faq: [["How many Miles & More miles do I earn?", "On Lufthansa Group tickets, about 4 miles per €1 for members and up to 8 for HON Circle."]] }),
  rev({ slug: "aeroplan-points-calculator", title: "Aeroplan Points Calculator (Air Canada)", prog: "Air Canada Aeroplan", p: E.AEROPLAN, spend: 700, fare: 2, faq: [["How many Aeroplan points per dollar?", "1–6 points per C$1 depending on the fare (Basic to Business), plus 1–6 more with Aeroplan Elite Status."]] }),
  rev({ slug: "air-india-maharaja-club-calculator", title: "Air India Maharaja Club Points Calculator", prog: "Air India Maharaja Club", p: E.AIR_INDIA, spend: 25000, faq: [["How do I earn Maharaja Club points?", "On Air India flights you earn points per ₹ of base fare and carrier charges, more on higher fares and tiers."]] }),
  rev({ slug: "air-new-zealand-airpoints-calculator", title: "Air New Zealand Airpoints Calculator", prog: "Air New Zealand Airpoints", p: E.AIRPOINTS, spend: 800, faq: [["What is an Airpoints Dollar worth?", "1 Airpoints Dollar = NZ$1 towards Air New Zealand flights."]] }),
  dist({ slug: "qantas-points-calculator", title: "Qantas Points Calculator (Qantas Frequent Flyer)", prog: "Qantas Frequent Flyer", p: E.QANTAS, from: "SYD", to: "MEL", fare: 1, cur: "AUD", note: "Qantas publishes fixed points per distance band for each fare type; the percentages here approximate those bands. A minimum of 400 points applies per flight in this tool.", faq: [["How much is a Qantas Point worth?", "Around 0.6–1.5 Australian cents depending on how you redeem."], ["Do I earn on Jetstar?", "Yes, on eligible Jetstar fares with a Qantas Frequent Flyer number."]] }),
  dist({ slug: "qatar-airways-avios-calculator", title: "Qatar Airways Avios Calculator (Privilege Club)", prog: "Qatar Airways Privilege Club", p: E.QATAR, from: "DOH", to: "LHR", fare: 1, note: "Qatar Airways' Privilege Club uses Avios (formerly Qmiles), which can be moved to British Airways and Iberia at 1:1.", faq: [["Are Qmiles the same as Avios?", "Yes — Qmiles became Avios in 2022 and transfer 1:1 with British Airways Executive Club."]] }),
  dist({ slug: "emirates-skywards-miles-calculator", title: "Emirates Skywards Miles Calculator", prog: "Emirates Skywards", p: E.EMIRATES, from: "DXB", to: "LHR", fare: 1, faq: [["Do Skywards Miles expire?", "Skywards Miles expire after 3 years (at the end of the month they were earned)."], ["Can I earn on flydubai?", "Yes, flydubai flights earn Skywards Miles."]] }),
  dist({ slug: "krisflyer-miles-calculator", title: "KrisFlyer Miles Calculator (Singapore Airlines)", prog: "Singapore Airlines KrisFlyer", p: E.KRISFLYER, from: "SIN", to: "LHR", fare: 1, faq: [["Do KrisFlyer miles expire?", "Yes, 3 years after the month they were earned (PPS members can extend)."]] }),
  dist({ slug: "asia-miles-calculator", title: "Asia Miles Calculator (Cathay Pacific)", prog: "Cathay Pacific (Asia Miles)", p: E.ASIA_MILES, from: "HKG", to: "LHR", fare: 1, faq: [["Do Asia Miles expire?", "They stay valid as long as you have earning or spending activity every 18 months."]] }),
  dist({ slug: "etihad-guest-miles-calculator", title: "Etihad Guest Miles Calculator", prog: "Etihad Guest", p: E.ETIHAD, from: "AUH", to: "LHR", fare: 1, faq: [["How long do Etihad Guest miles last?", "Miles expire after 18 months without activity."]] }),
  dist({ slug: "virgin-points-calculator", title: "Virgin Points Calculator (Virgin Atlantic Flying Club)", prog: "Virgin Atlantic Flying Club", p: E.VIRGIN, from: "LHR", to: "JFK", fare: 1, cur: "GBP", faq: [["What are Virgin Points worth?", "About 1–1.5p each when redeemed for flights; Upper Class rewards give the best value."]] }),
  dist({ slug: "miles-and-smiles-calculator", title: "Turkish Airlines Miles&Smiles Calculator", prog: "Turkish Airlines Miles&Smiles", p: E.SMILES, from: "IST", to: "JFK", fare: 1, faq: [["Do Miles&Smiles miles expire?", "Miles expire 3 years after they were earned, at the end of that year."]] }),
  dist({ slug: "mabuhay-miles-calculator", title: "Mabuhay Miles Calculator (Philippine Airlines)", prog: "Philippine Airlines Mabuhay Miles", p: E.MABUHAY, from: "MNL", to: "LAX", fare: 2, faq: [["Do Mabuhay Miles expire?", "Miles are valid for 3 years from the flight month."]] }),
  dist({ slug: "eva-air-infinity-mileagelands-calculator", title: "EVA Air Miles Calculator (Infinity MileageLands)", prog: "EVA Air Infinity MileageLands", p: E.EVA, from: "TPE", to: "LAX", fare: 1, faq: [["Do EVA miles expire?", "Miles expire 3 years after the flight date (longer for higher tiers)."]] }),
  dist({ slug: "ana-mileage-club-calculator", title: "ANA Mileage Club Calculator", prog: "ANA Mileage Club", p: E.ANA, from: "HND", to: "LAX", fare: 1, faq: [["How long are ANA miles valid?", "3 years from the month earned (Diamond members' miles don't expire)."]] }),
  dist({ slug: "frequent-flyer-miles-calculator", title: "Frequent Flyer Miles Calculator (Air Miles Earned)", prog: "a distance-based frequent flyer programme", p: E.GENERIC, from: "JFK", to: "LHR", fare: 1, desc: "Estimate frequent flyer miles or points earned on any airline — miles flown × fare class earn rate + elite bonus — and their cash value.", faq: [["How are air miles calculated?", "Distance-based programmes give a percentage of the miles flown (25–300%) by fare class; revenue-based ones give points per dollar spent."]] }),
];

runBatch(TRV_MILES, TOOLS);
