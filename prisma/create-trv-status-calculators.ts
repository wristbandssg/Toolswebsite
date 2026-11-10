// One-time (but safe to re-run) batch setup script: creates 29 calculators in Travel Calculators >
// Airline Miles, Hotel Points & Rewards Calculators (elite status, award charts & upgrades, points
// value, hotel programmes). Formulas live in src/lib/calc-engine-trv-status.ts; examples are
// computed from the engine.
//
// HOW TO RUN (after prisma/setup-travel-category.ts --apply)
//   npx tsx prisma/create-trv-status-calculators.ts        (TRV_DRY=1 → check only, no database)
// or
//   npm run db:create-trv-status-calculators

import * as E from "../src/lib/calc-engine-trv-status";
import { mk, num, money, tx, dd, T, runBatch, type ToolDef } from "./trv-tool-kit";
import { TRV_MILES } from "./setup-travel-category";

const C = E.trvStatusCustomCalculators;
const CHECK = "Charts and thresholds are summarised from published 2026 programme terms and rounded; airlines change them and many now use dynamic pricing. Confirm on the programme's own site.";
const ROUTE = (a: string, b: string) => [dd("how", "Distance From", ["Two airports", "A distance I enter (miles)"], 0), tx("from", "From Airport", a), tx("to", "To Airport", b), num("dist", "Flown Miles (if entering)", 3000, 0, 30000, 1)];
const RX = (a: string, b: string) => ({ how: 0, dist: 3000, ...T("from", a), ...T("to", b) });

function band(slug: string, title: string, prog: string, p: E.BandPreset, a: string, b: string, cabin: number, faq: [string, string][], note = ""): ToolDef {
  return mk({
    slug, title,
    desc: `Calculate ${prog} ${p.unit} earned per flight — by distance band and cabin — and how many more you need for ${p.tiers.map((t) => t[0]).join(", ")}.`,
    inputs: [...ROUTE(a, b), dd("band", "Distance Band", ["Work it out from the distance", ...p.bands], 0), dd("cabin", "Cabin / Fare", p.cabins, cabin), num("flights", "Number of Flights (one-way segments)", 2, 1, 500, 1), num("have", `${p.unit} Already Earned This Year`, 0, 0, 1e7, 1)],
    results: [["earned", `${p.unit} From These Flights`, "n", 0], ["per", "Per Flight", "n", 0], ["total", "New Total", "n", 0], ["tier", "Tier Reached", "t"], ["next", "Next Tier", "t"], ["rule", "Rule Used", "t"]],
    fn: C[slug], ex: { ...RX(a, b), band: 0, cabin, flights: 2, have: 0 },
    exText: (o) => `Example: ${a}–${b} return (2 flights) in ${p.cabins[cabin]} → ${o.earned} ${p.unit}; ${o.next}.`,
    how: `${prog} gives a fixed number of ${p.unit} for each one-way flight, set by the distance band and the cabin/fare. Thresholds: ${p.tiers.map(([n, x]) => `${n} ${x.toLocaleString("en-US")}`).join(", ")}.${note ? `\n\n${note}` : ""}`,
    assume: CHECK,
    faq,
  });
}
function revS(slug: string, title: string, prog: string, p: E.RevStatus, spend: number, faq: [string, string][], note = "", cardt = 0): ToolDef {
  const inputs: Record<string, unknown>[] = [money("spend", "Eligible Flight Spend (base fare + carrier charges)", spend, p.sym)];
  if (p.rate) inputs.push(dd("rate", "Earning Rate (your status)", p.rate.map((r) => r[0]), 0));
  if (p.cards && p.cards.length > 1) inputs.push(dd("cardt", "Co-branded Card", p.cards.map((c) => c[0]), cardt), money("cardspend", "Card Spend This Year", 0, p.sym));
  inputs.push(num("partner", `Other ${p.unit} (partners, promos)`, 0, 0, 1e7, 1), num("have", `${p.unit} Already Earned`, 0, 0, 1e7, 1));
  return mk({
    slug, title,
    desc: `Calculate ${prog} ${p.unit} from your flight spend${p.cards && p.cards.length > 1 ? " and credit card" : ""}, and how far you are from ${p.tiers.map((t) => t[0]).join(", ")}.`,
    inputs,
    results: [["earned", `${p.unit} Earned`, "n", 0], ["per", "From Flights", "n", 0], ["total", "New Total", "n", 0], ["tier", "Tier Reached", "t"], ["next", "Next Tier", "t"], ["rule", "Rule Used", "t"]],
    fn: C[slug], ex: { spend, rate: 0, cardt, cardspend: 0, partner: 0, have: 0 },
    exText: (o) => `Example: ${p.sym}${spend.toLocaleString("en-US")} of flights → ${o.earned} ${p.unit}; ${o.next}.`,
    how: `${prog}: ${p.unit} are earned from eligible spend (base fare plus carrier-imposed charges; government taxes excluded). Thresholds: ${p.tiers.map(([n, x]) => `${n} ${x.toLocaleString("en-US")}`).join(", ")}.${note ? `\n\n${note}` : ""}`,
    assume: CHECK,
    faq,
  });
}
function upg(slug: string, title: string, prog: string, p: E.AwardPreset, a: string, b: string, faq: [string, string][]): ToolDef {
  return mk({
    slug, title,
    desc: `Estimate how many ${p.unit} you need to upgrade a ${prog} flight — economy to premium economy, business or first — by route distance, with the value per point.`,
    inputs: [...ROUTE(a, b), dd("cfrom", "Booked Cabin", E.CABINS.slice(0, 3), 0), dd("cto", "Upgrade To", E.CABINS, 2), dd("peak", "Travel Dates", ["Off-peak / standard", "Peak"], 0), dd("rt", "Trip", ["One way", "Round trip"], 0), num("pax", "Passengers", 1, 1, 9, 1), money("cash", "Cash Price of the Upgrade (0 = skip)", 0)],
    results: [["pts", `${p.unit} Needed`, "n", 0], ["one", "Per Person, One Way", "n", 0], ["cpp", "Value (¢ per point)", "n", 2], ["fare", "Upgrade", "t"], ["band", "Zone", "t"], ["rule", "Pricing Rule", "t"]],
    fn: C[slug], ex: { ...RX(a, b), cfrom: 0, cto: 2, peak: 0, rt: 0, pax: 1, cash: 0 },
    exText: (o) => `Example: ${a}–${b} economy to business, one way → about ${o.pts} ${p.unit}.`,
    how: `${prog} upgrades are priced by distance zone and the cabins involved. ${p.mode === "difference" ? "The cost is the difference between the reward prices of the two cabins." : "Only eligible paid fares can be upgraded, subject to upgrade-seat availability; cheaper fares need more points."} Value per point = cash upgrade price ÷ points × 100.`,
    assume: CHECK,
    faq,
  });
}
function hotel(slug: string, title: string, prog: string, p: E.HotelPreset, spend: number, card: number, faq: [string, string][]): ToolDef {
  return mk({
    slug, title,
    desc: `Calculate ${prog} points earned on a hotel stay — base points, elite bonus and credit card points — what they're worth and how many free nights they buy.`,
    inputs: [money("spend", "Eligible Room Spend (before taxes)", spend, p.sym), dd("brand", "Hotel Brand", p.base.map((b) => b[0]), 0), dd("tier", "Elite Status", p.tiers.map((t) => t[0]), 0), num("card", `Card Points per ${p.sym}1 at the Hotel`, card, 0, 30, 0.5), num("promo", "Promotion Bonus Points", 0, 0, 1e7, 1), dd("cat", "Reward Night Type", p.night.map((n) => n[0]), 1), num("cpp", "Value per Point (cents, 0 = typical)", 0, 0, 100, 0.01)],
    results: [["total", "Total Points Earned", "n", 0], ["base", "Base Points", "n", 0], ["bonus", "Elite Bonus", "n", 0], ["card", "Card & Promo Points", "n", 0], ["value", "Estimated Value", "c", p.cur], ["night", "Free Nights", "t"]],
    fn: C[slug], ex: { spend, brand: 0, tier: 0, card, promo: 0, cat: 1, cpp: 0 },
    exText: (o) => `Example: ${p.sym}${spend} of room spend as a base member${card ? " with the co-branded card" : ""} → ${o.total} points (about ${o.value}).`,
    how: `${prog}: base points per ${p.sym}1 of eligible room rate (and on-property spend charged to the room) by brand, plus the elite bonus as a percentage of base points. Free-night prices are typical standard-room amounts — many hotels now price dynamically.`,
    assume: CHECK,
    faq,
  });
}

const TOOLS: ToolDef[] = [
  band("flying-blue-xp-calculator", "Flying Blue XP Calculator (Air France & KLM Status)", "Flying Blue", E.FLYING_BLUE_XP, "CDG", "JFK", 0, [["How many XP do I need for Gold?", "180 XP in your qualifying period (Silver 100, Platinum 300)."], ["Do partner flights earn XP?", "Yes, SkyTeam partners earn XP using the same distance bands."]]),
  band("qantas-status-credits-calculator", "Qantas Status Credits Calculator", "Qantas Frequent Flyer", E.QANTAS_SC, "SYD", "LAX", 0, [["How many status credits for Gold?", "700 (Silver 300, Platinum 1,400, Platinum One 3,600) in a membership year."], ["Do Loyalty Bonus status credits count?", "Yes — they're added on top; enter them in 'already earned'."]]),
  band("qatar-qpoints-calculator", "Qatar Airways Qpoints Calculator", "Qatar Airways Privilege Club", E.QPOINTS, "DOH", "LHR", 1, [["How many Qpoints for Gold?", "300 Qpoints in 12 months (Silver 150, Platinum 600)."]]),
  band("cathay-status-points-calculator", "Cathay Status Points Calculator", "Cathay (Marco Polo)", E.CATHAY_SP, "HKG", "LHR", 1, [["How many status points for Gold?", "600 in a membership year (Silver 300, Diamond 1,200)."]]),
  band("virgin-atlantic-tier-points-calculator", "Virgin Atlantic Tier Points Calculator", "Virgin Atlantic Flying Club", E.VIRGIN_TP, "LHR", "JFK", 1, [["How many tier points for Gold?", "1,000 (Silver 400) in your membership year."]]),
  band("air-new-zealand-status-points-calculator", "Air New Zealand Status Points Calculator", "Air New Zealand Airpoints", E.AIRNZ_SP, "AKL", "SYD", 1, [["How many status points for Gold?", "About 900 (Silver 450, Elite 1,500) within your 12-month review period."]]),
  band("emirates-skywards-tier-miles-calculator", "Emirates Skywards Tier Miles Calculator", "Emirates Skywards", E.EK_TIER, "DXB", "LHR", 1, [["How many tier miles for Gold?", "50,000 in 12 months (Silver 25,000, Platinum 150,000)."]]),
  revS("ba-tier-points-calculator", "BA Tier Points Calculator (British Airways Executive Club)", "British Airways Executive Club", E.BA_TP, 3000, [["How do BA tier points work since 2025?", "You earn 1 tier point per £1 spent on BA flights and holidays (plus partner flights), and need 3,500 for Bronze, 7,500 for Silver and 20,000 for Gold."]], "Partner flights (oneworld) still earn by fare and distance — add them under 'other'."),
  revS("united-pqp-calculator", "United PQP Calculator (Premier Qualifying Points)", "United MileagePlus Premier", E.UNITED_PQP, 4000, [["Can I qualify with segments?", "Yes — fewer PQP plus a minimum number of Premier qualifying flights (e.g. Silver 5,000 PQP + 15 PQF); this tool shows the PQP-only path."]], "PQP-only thresholds; the PQF path needs fewer PQP."),
  revS("delta-mqd-calculator", "Delta MQD Calculator (Medallion Qualification Dollars)", "Delta Medallion", E.DELTA_MQD, 3000, [["Are MQMs gone?", "Yes — since 2024 Delta Medallion status is based only on MQDs."], ["How do I get the MQD Headstart?", "Delta Reserve Amex cardholders get $2,500 MQDs each year."]], "Delta retired MQMs in 2024 — status is based on MQDs only.", 2),
  revS("aa-loyalty-points-calculator", "AA Loyalty Points Calculator (AAdvantage Status)", "American AAdvantage", E.AA_LP, 3000, [["What earns Loyalty Points?", "Every base and bonus mile from flights, plus 1 point per $1 on AAdvantage credit cards and miles from shopping and dining partners."]], "", 1),
  mk({
    slug: "avios-calculator", title: "Avios Calculator (British Airways Reward Flight Calculator)",
    meta: "Avios Calculator — BA Reward Flight Avios Needed",
    desc: "Calculate how many Avios you need for a British Airways reward flight — by distance zone, cabin and peak/off-peak — with taxes and the value you get per Avios.",
    inputs: [...ROUTE("LHR", "JFK"), dd("cabin", "Cabin", E.CABINS, 0), dd("peak", "Travel Dates", ["Off-peak", "Peak"], 0), dd("rt", "Trip", ["One way", "Return"], 1), num("pax", "Passengers", 1, 1, 9, 1), money("cash", "Cash Price of the Same Flight per Person (0 = skip)", 0, "£")],
    results: [["pts", "Avios Needed", "n", 0], ["tax", "Taxes, Fees & Charges (about)", "c", "GBP"], ["cpp", "Value (pence per Avios)", "n", 2], ["worth", "Is It Worth It?", "t"], ["band", "Zone", "t"]],
    fn: C["avios-calculator"], ex: { ...RX("LHR", "JFK"), cabin: 0, peak: 0, rt: 1, pax: 1, cash: 0 },
    exText: (o) => `Example: London Heathrow–New York JFK return in economy, off-peak → about ${o.pts} Avios plus ${o.tax} in charges.`,
    how: "British Airways prices reward flights by distance zone (based on flown miles), cabin and peak/off-peak date. Iberia, Aer Lingus and Qatar use their own Avios charts — use the Qatar Airways Avios Calculator for Qatar. Value per Avios = (cash price − charges on the reward) ÷ Avios.",
    assume: CHECK,
    faq: [["How much is an Avios worth?", "Roughly 1–1.5p; long-haul business class redemptions often give the most."], ["Do I pay taxes on reward flights?", "Yes — UK Air Passenger Duty and carrier charges, much higher in premium cabins."]],
  }),
  upg("avios-upgrade-calculator", "Avios Upgrade Calculator (British Airways)", "British Airways", E.AVIOS, "LHR", "JFK", [["Which BA fares can be upgraded with Avios?", "Most paid fares except the lowest economy and some sale fares; the cost is the difference between the two cabins' Avios prices."]]),
  upg("qatar-airways-upgrade-calculator", "Qatar Airways Upgrade Calculator (Avios)", "Qatar Airways", E.QATAR_AW, "DOH", "LHR", [["Can I upgrade a Qatar Economy Lite fare?", "No — Lite fares are not upgradeable; Classic and higher fares usually are."]]),
  upg("qantas-upgrade-calculator", "Qantas Upgrade Calculator (Classic Upgrade Points)", "Qantas", E.QANTAS_UP, "SYD", "LAX", [["How do I bid for a Qantas upgrade?", "Request a Classic Upgrade Reward with points; upgrades clear by status priority when seats are available."]]),
  upg("emirates-upgrade-calculator", "Emirates Upgrade Calculator (Skywards Miles)", "Emirates", E.EMIRATES_UP, "DXB", "LHR", [["Can I upgrade Emirates Special or Saver fares?", "Special fares can't be upgraded with miles; Saver and above usually can."]]),
  upg("singapore-airlines-upgrade-calculator", "Singapore Airlines Upgrade Calculator (KrisFlyer)", "Singapore Airlines", E.SIA_UP, "SIN", "LHR", [["Which Singapore Airlines fares can be upgraded?", "Economy Flexi and Standard and higher fares; Lite fares can't be upgraded with miles."]]),
  upg("cathay-pacific-upgrade-calculator", "Cathay Pacific Upgrade Calculator (Asia Miles)", "Cathay Pacific", E.CATHAY_UP, "HKG", "LHR", [["Can I upgrade Economy Light?", "No — upgradeable fares are typically Economy Flex and higher."]]),
  upg("etihad-upgrade-calculator", "Etihad Upgrade Calculator (Etihad Guest Miles)", "Etihad", E.ETIHAD_UP, "AUH", "LHR", [["How else can I upgrade on Etihad?", "Etihad also sells upgrades by bidding (Etihad Upgrade bids) and at check-in."]]),
  mk({
    slug: "miles-to-dollars-calculator", title: "Miles to Dollars Calculator (Points Value)",
    desc: "Convert airline miles, hotel points or credit card points to their dollar value with typical 2026 cents-per-point valuations — and compare two programmes.",
    inputs: [dd("prog", "Programme", E.PROGRAMS.map(([n, c]) => `${n} (~${c}¢)`), 0), num("pts", "Points / Miles", 50000, 0, 1e9, 1), num("cpp", "Your Own Value (cents, 0 = typical)", 0, 0, 100, 0.01), dd("vs", "Compare With", E.PROGRAMS.map((p) => p[0]), 7)],
    results: [["value", "Estimated Value", "c"], ["cpp", "Cents per Point Used", "n", 2], ["cash", "Value at 1¢ (cash back)", "c"], ["vs", "Comparison", "t"], ["rule", "Based On", "t"]],
    fn: C["miles-to-dollars-calculator"], ex: { prog: 0, pts: 50000, cpp: 0, vs: 7 },
    exText: (o) => `Example: 50,000 American AAdvantage miles → about ${o.value}.`,
    how: "Value = points × cents per point ÷ 100. Valuations are typical averages for good flight or hotel redemptions; cash-back or gift-card redemptions are usually worth less (often 0.5–1¢).",
    assume: "A point is only worth what you redeem it for — use the Cash vs Miles Calculator for a specific booking.",
    faq: [["What is a good value per mile?", "Above about 1.2–1.5¢ for airline miles and 0.5–0.8¢ for most hotel points (1.5¢+ for Hyatt)."]],
  }),
  mk({
    slug: "cash-vs-miles-calculator", title: "Cash vs Miles Calculator (Should I Use Points?)",
    desc: "Decide whether to pay cash or use miles for a flight or hotel — value per point after fees and the miles you'd give up earning, versus your benchmark.",
    inputs: [money("cash", "Cash Price", 450), num("pts", "Points / Miles Required", 25000, 1, 1e8, 1), money("fees", "Taxes & Fees on the Award", 5.6), num("earn", "Points You'd Earn Paying Cash (per $)", 5, 0, 30, 0.5), num("ecpp", "Value of Those Points (cents)", 1.3, 0, 10, 0.01), num("bench", "Your Benchmark Value (cents per point)", 1.3, 0, 10, 0.01)],
    results: [["cpp", "Value per Point (cents)", "n", 2], ["verdict", "Verdict", "t"], ["saved", "Cash Saved by Using Points", "c"], ["forgone", "Value of Miles Not Earned", "c"], ["breakeven", "Break-Even Points Price", "n", 0]],
    fn: C["cash-vs-miles-calculator"], ex: { cash: 450, pts: 25000, fees: 5.6, earn: 5, ecpp: 1.3, bench: 1.3 },
    exText: (o) => `Example: a $450 flight for 25,000 miles + $5.60 → ${o.cpp}¢ per mile: ${o.verdict}.`,
    how: "Value per point = (cash price − award fees − value of the miles you'd earn on a cash ticket) ÷ points × 100. If it beats your benchmark (what you could get elsewhere), use points.",
    assume: "Ignores refund and change-fee differences between cash and award tickets.",
    faq: [["What benchmark should I use?", "Around 1.2–1.5¢ for most airline miles and 0.5–0.8¢ for most hotel points."]],
  }),
  mk({
    slug: "amex-points-transfer-calculator", title: "Amex Points Transfer Calculator (Membership Rewards to Miles)",
    desc: "Calculate how many airline miles or hotel points you get when transferring Amex Membership Rewards — partner ratios, transfer bonuses and the US excise fee.",
    inputs: [dd("partner", "Transfer Partner", E.AMEX_PARTNERS.map((p) => p[0]), 0), num("mr", "Membership Rewards Points", 50000, 1000, 1e8, 1000), num("bonus", "Transfer Bonus (%)", 0, 0, 100, 1), num("need", "Miles Needed for an Award (0 = skip)", 0, 0, 1e8, 1)],
    results: [["got", "Partner Miles / Points Received", "n", 0], ["fee", "Excise Tax Offset Fee", "c"], ["ratio", "Transfer Ratio", "t"], ["need", "To Reach Your Award", "t"], ["note", "Before You Transfer", "t"]],
    fn: C["amex-points-transfer-calculator"], ex: { partner: 0, mr: 50000, bonus: 0, need: 0 },
    exText: (o) => `Example: 50,000 MR to Delta SkyMiles → ${o.got} miles, ${o.fee} excise fee.`,
    how: "Miles = MR points × the partner ratio × (1 + any transfer bonus). Transfers to US airlines carry a federal excise tax offset of $0.0006 per point (max $99). Transfers go in 1,000-point steps.",
    assume: "US Amex ratios; other countries' Amex programmes have different partners and ratios.",
    faq: [["Are Amex transfer bonuses worth waiting for?", "Often — 15–40% bonuses to BA, Flying Blue or Virgin come up a few times a year."]],
  }),
  mk({
    slug: "hotel-points-value-calculator", title: "Hotel Points Value Calculator (Points vs Cash)",
    desc: "Work out what your hotel points are worth on a specific stay — cents per point versus paying cash, including taxes, resort fees and the 5th-night-free benefit.",
    inputs: [dd("prog", "Hotel Programme", E.HOTEL_PROGS.map(([n, c]) => `${n} (~${c}¢)`), 0), money("cash", "Cash Rate per Night", 250), money("taxes", "Taxes per Night", 30), num("pts", "Points per Night", 50000, 1, 1e7, 1), num("nights", "Nights", 1, 1, 60, 1), dd("fifth", "5th Night Free on Points?", ["No", "Yes (Hilton, Marriott, IHG cardholders)"], 0), money("resfee", "Resort Fee Still Paid on Award, per Night", 0)],
    results: [["cpp", "Value per Point (cents)", "n", 2], ["verdict", "Verdict", "t"], ["used", "Points Used", "n", 0], ["saved", "Cash You Avoid Paying", "c"], ["typical", "Typical Value of Those Points", "c"], ["free", "Free Nights", "t"]],
    fn: C["hotel-points-value-calculator"], ex: { prog: 0, cash: 250, taxes: 30, pts: 50000, nights: 1, fifth: 0, resfee: 0 },
    exText: (o) => `Example: a $250 + $30 tax Hilton night for 50,000 points → ${o.cpp}¢ per point.`,
    how: "Value per point = (cash rate + taxes − fees still payable on the award) × nights ÷ points used × 100. With 5th-night-free, every fifth award night costs no points.",
    assume: "Award nights usually waive taxes but not always resort fees.",
    faq: [["Which hotel points are worth the most?", "World of Hyatt (around 1.5–2¢); Hilton and IHG points are worth around 0.4–0.6¢."]],
  }),
  hotel("hilton-honors-points-calculator", "Hilton Honors Points Calculator", "Hilton Honors", E.HILTON, 400, 12, [["How many Hilton points per dollar?", "10 base points per $1 at most brands, +20% Silver, +80% Gold, +100% Diamond, plus 12–14 per $1 with Hilton Amex cards."]]),
  hotel("marriott-bonvoy-points-calculator", "Marriott Bonvoy Points Calculator", "Marriott Bonvoy", E.MARRIOTT, 400, 6, [["How many Bonvoy points per dollar?", "10 per $1 at most brands (5 at extended-stay brands) plus a 10–75% elite bonus."]]),
  hotel("world-of-hyatt-points-calculator", "World of Hyatt Points Calculator", "World of Hyatt", E.HYATT, 400, 4, [["How many points for a free night at Hyatt?", "Standard rooms cost about 5,000 (Category 1) to 40,000+ (Category 8) points; off-peak and peak dates differ."]]),
  hotel("ihg-one-rewards-points-calculator", "IHG One Rewards Points Calculator", "IHG One Rewards", E.IHG, 400, 10, [["How many IHG points per dollar?", "10 base points per $1 (5 at Staybridge and Candlewood) plus a 20–100% elite bonus."]]),
  hotel("accor-live-limitless-points-calculator", "ALL Accor Points Calculator (Accor Live Limitless)", "ALL – Accor Live Limitless", E.ACCOR, 400, 0, [["What are Accor points worth?", "2,000 points = €40 off a stay, so each point is worth €0.02."]]),
  hotel("best-western-rewards-calculator", "Best Western Rewards Points Calculator", "Best Western Rewards", E.BEST_WESTERN, 300, 0, [["How many Best Western points for a free night?", "Roughly 8,000–36,000 points depending on the hotel."]]),
];

runBatch(TRV_MILES, TOOLS);
