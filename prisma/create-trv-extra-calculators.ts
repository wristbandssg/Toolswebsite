// One-time (but safe to re-run) batch setup script: creates the 16 Travel Calculators from keyword
// batch 2 (12 Nov 2026), each in its own existing sub-category. Formulas and presets live in
// src/lib/calc-engine-trv-extra.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-travel-category.ts --apply)
//   npx tsx prisma/create-trv-extra-calculators.ts        (TRV_DRY=1 → check only, no database)
// or
//   npm run db:create-trv-extra-calculators

import * as E from "../src/lib/calc-engine-trv-extra";
import { type Tariff } from "../src/lib/calc-engine-trv-taxi";
import { type DistPreset } from "../src/lib/calc-engine-trv-miles";
import { WU, type PiecePreset } from "../src/lib/calc-engine-trv-bag";
import { mk, num, money, tx, dd, pct, T, upsertTools, type ToolDef } from "./trv-tool-kit";
import { TRV_DIST, TRV_FLIGHT, TRV_MILES, TRV_TAXI, TRV_RAIL, TRV_TRIP } from "./setup-travel-category";

const C = E.trvExtraCustomCalculators;
const TAXI_CHECK = "Tariffs are the regulator's published rates (2025–26), rounded. Traffic, route choice, tolls and surcharges change the real fare — the meter is final. Tipping customs vary by country.";
const MILES_CHECK = "Earning rules are summarised from each programme's published 2026 terms and rounded — partner airlines, promotions and fare buckets can earn differently. Check the programme's own calculator before you rely on a number.";
const BAG_CHECK = "Fees are typical 2026 published prices, rounded; they change often and depend on fare brand, status and card benefits. Confirm on the airline's website before you fly. Fees are per direction.";
const EST = "Costs are typical 2026 averages, rounded, to plan with. Prices change with season, exchange rates and how you book — replace any default with your own quotes.";
const RT = dd("rt", "Trip", ["One way", "Round trip"], 0);
const PAX = num("pax", "Travellers", 1, 1, 50, 1);

function city(slug: string, cityName: string, t: Tariff, dist: number, faq: [string, string][], opts: { title?: string; tip?: number; note?: string } = {}): ToolDef {
  const u = t.unit;
  const inputs: Record<string, unknown>[] = [num("dist", `Trip Distance (${u})`, dist, 0, 1000, 0.1), num("wait", "Minutes Stuck in Slow Traffic / Waiting", 5, 0, 600, 1), dd("time", "Time / Tariff", t.times.map((x) => x[0]), 0)];
  if (t.airports.length > 1) inputs.push(dd("ap", "Airport Trip", t.airports.map((a) => a[0]), 0));
  if (t.extra) inputs.push(num("bags", `${t.extra[0]} (count)`, 0, 0, 10, 1));
  if (t.booking) inputs.push(dd("book", `Booked by Phone / App (+${t.sym}${t.booking})`, ["No (street hail / rank)", "Yes"], 0));
  inputs.push(money("tolls", "Tolls (if any)", 0, t.sym), num("tip", "Tip (%)", opts.tip ?? 15, 0, 50, 1), num("pax", "Passengers Splitting the Fare", 1, 1, 8, 1), money("flag", "Flag Fall Override (0 = official)", 0, t.sym), money("rate", `Rate per ${u} Override (0 = official)`, 0, t.sym));
  return mk({
    slug, title: opts.title ?? `${cityName} Taxi Fare Calculator`,
    desc: `Estimate a ${cityName} taxi fare from the distance, waiting time and airport fees using the official meter tariff — with tip and per-person split.`,
    inputs,
    results: [["total", "Estimated Total Fare", "c", t.cur], ["fare", "Meter / Flat Fare", "c", t.cur], ["extras", "Surcharges, Tolls & Fees", "c", t.cur], ["tip", "Tip", "c", t.cur], ["per", "Per Person", "c", t.cur], ["perUnit", `Cost per ${u}`, "c", t.cur], ["how", "How It's Worked Out", "t"]],
    fn: C[slug], ex: { dist, wait: 5, time: 0, ap: 0, bags: 0, book: 0, tolls: 0, tip: opts.tip ?? 15, pax: 1, flag: 0, rate: 0 },
    exText: (o) => `Example: ${dist} ${u} in ${cityName} with 5 minutes in slow traffic and a ${opts.tip ?? 15}% tip → about ${o.total}.`,
    how: `${cityName} meters start at ${t.sym}${t.flag}, then charge ${t.sym}${t.tiers[0][1]} per ${u} plus about ${t.sym}${t.wait} per minute when stopped or crawling.${opts.note ? `\n\n${opts.note}` : ""}`,
    assume: TAXI_CHECK,
    faq,
  });
}

function dist(o: { slug: string; title: string; prog: string; p: DistPreset; from: string; to: string; fare: number; desc?: string; faq: [string, string][]; note?: string }): ToolDef {
  return mk({
    slug: o.slug, title: o.title,
    desc: o.desc ?? `Calculate how many ${o.p.unit} you earn on a flight with ${o.prog} — by route distance, fare class and elite tier — and what they're worth.`,
    inputs: [dd("how", "Distance From", ["Two airports", "A distance I enter (miles)"], 0), tx("from", "From Airport", o.from), tx("to", "To Airport", o.to), num("dist", "Flown Miles (if entering)", 3000, 0, 30000, 1), dd("fare", "Fare / Cabin", o.p.fares.map(([n, x]) => `${n} (${x}%)`), o.fare), num("custom", "Custom Earn % (0 = fare default)", 0, 0, 500, 1), dd("tier", "Elite Tier", o.p.tiers.map((t) => t[0]), 0), dd("rt", "Trip", ["One way", "Round trip"], 1), num("partner", `Other ${o.p.unit} (card, promos)`, 0, 0, 1e7, 1), num("cpp", "Value per Point (cents, 0 = typical)", 0, 0, 100, 0.01), num("goal", "Target Balance (0 = skip)", 0, 0, 1e8, 1)],
    results: [["total", `Total ${o.p.unit} Earned`, "n", 0], ["base", "Base Earn", "n", 0], ["bonus", "Tier Bonus", "n", 0], ["value", "Estimated Value", "c", "USD"], ["flown", "Miles Flown", "n", 0], ["rule", "Earning Rule", "t"], ["goal", "Trips to Target", "t"]],
    fn: C[o.slug], ex: { how: 0, dist: 3000, fare: o.fare, custom: 0, tier: 0, rt: 1, partner: 0, cpp: 0, goal: 0, ...T("from", o.from), ...T("to", o.to) },
    exText: (r) => `Example: ${o.from}–${o.to} round trip in ${o.p.fares[o.fare][0]} → about ${r.total} ${o.p.unit} (worth roughly ${r.value}).`,
    how: `${o.prog} awards ${o.p.unit} as a percentage of the great-circle miles flown, set by the fare class, plus any elite bonus on top. Miles flown come from the airports you enter.${o.note ? `\n\n${o.note}` : ""}`,
    assume: MILES_CHECK,
    faq: o.faq,
  });
}

function piece(slug: string, airline: string, p: PiecePreset, ex: { zone: number; bags: number; weight: number }, faq: [string, string][], note?: string): ToolDef {
  return mk({
    slug, title: `${airline} Baggage Calculator (Extra Bag Fees)`,
    meta: `${airline} Baggage Calculator — Extra & Overweight Bag Fees`,
    desc: `Calculate ${airline} checked baggage fees — free allowance, extra bags, overweight and oversize charges — by route, one way or round trip, for every traveller.`,
    inputs: [dd("zone", "Route / Fare", p.zones.map((z) => z.name), ex.zone), num("bags", "Checked Bags per Person", ex.bags, 0, 10, 1), num("extra", "Extra Free Bags (status, card, military)", 0, 0, 5, 1), dd("online", "Pay Online in Advance", ["No", "Yes"], 1), num("weight", "Heaviest Bag Weight", ex.weight, 0, 200, 0.1), dd("wu", "Weight Unit", WU, 0), num("heavy", "Number of Overweight Bags (min. 1 if heaviest is over)", 0, 0, 10, 1), dd("big", "Any Bag Oversize?", ["No", "Yes"], 0), money("override", "Fee per Extra Bag Override (0 = typical)", 0, p.sym), RT, PAX],
    results: [["total", "Total Baggage Fees", "c", p.cur], ["one", "Per Person, One Way", "c", p.cur], ["bags", "Extra Bag Fees", "c", p.cur], ["ow", "Overweight Fees", "c", p.cur], ["os", "Oversize Fee", "c", p.cur], ["detail", "Breakdown", "t"], ["zone", "Allowance Used", "t"]],
    fn: C[slug], ex: { zone: ex.zone, bags: ex.bags, extra: 0, online: 1, weight: ex.weight, wu: 0, heavy: 0, big: 0, override: 0, rt: 0, pax: 1 },
    exText: (o) => `Example: ${ex.bags} checked bags on ${p.zones[ex.zone].name}, paid online → ${o.one} one way.`,
    how: `${airline} uses a piece allowance: each bag beyond the free allowance pays the fee for that bag number (1st, 2nd, 3rd and later). Bags over 23 kg (50 lb) in economy pay an overweight charge per bag, and bags over 158 cm (62 in) in length + width + height pay an oversize fee.${note ? `\n\n${note}` : ""}`,
    assume: BAG_CHECK,
    faq,
  });
}

const TAXI: ToolDef[] = [
  city("seattle-taxi-fare-calculator", "Seattle", E.SEATTLE, 6, [["How much is a taxi from Sea-Tac to downtown Seattle?", "About $40 flat plus tip from the airport taxi rank; the metered fare is similar."], ["Do Seattle taxis take cards?", "Yes, all licensed King County taxis must accept credit and debit cards."]], { note: "Seattle and King County share one taxi rate: $2.60 to start, $2.70 per mile and $0.50 per minute of waiting." }),
  city("vancouver-taxi-fare-calculator", "Vancouver", E.VANCOUVER, 8, [["How much is a taxi from YVR to downtown Vancouver?", "Taxis from YVR use zone rates — about C$40 to downtown and C$25 to Richmond, before tip."], ["How much do you tip a taxi in Vancouver?", "10–15% is usual."]], { note: "Vancouver taxis are metered at about C$3.95 to start and C$2.18 per km. Trips from YVR airport use fixed zone rates." }),
  city("washington-dc-taxi-fare-calculator", "Washington DC", E.WASHINGTON_DC, 4, [["How much is a taxi from Reagan National (DCA) to downtown DC?", "About $20–$30 including the airport fee, before tip."], ["Is there a charge for extra passengers in DC taxis?", "Yes, $1 for each extra passenger."]], { title: "Washington DC Taxi Fare Calculator (incl. DCA Airport)", note: "DC taxis start at $3.50 and charge $2.16 a mile, $35 an hour waiting, $1 per extra passenger and $2 for phone/app dispatch. Taxis at DCA and Dulles add an airport fee." }),
  mk({
    slug: "aruba-taxi-fare-calculator", title: "Aruba Taxi Fare Calculator (Airport & Hotel Fares)",
    desc: "Look up the fixed Aruba taxi fare from the airport or cruise terminal to Oranjestad, Eagle Beach, Palm Beach and other areas — with night and Sunday surcharges and tip.",
    inputs: [dd("route", "Route", E.ARUBA_ROUTES.map(([n, f]) => `${n} ($${f})`), 2), num("pax", "Passengers", 2, 1, 8, 1), dd("night", "Between 11 pm and 6 am?", ["No", "Yes (+$5)"], 0), dd("sun", "Sunday or Public Holiday?", ["No", "Yes (+$5)"], 0), num("wait", "Waiting Minutes", 0, 0, 240, 1), num("tip", "Tip (%)", 10, 0, 50, 1), money("override", "Fare Override (0 = fixed fare)", 0)],
    results: [["total", "Estimated Total", "c"], ["fare", "Fixed Fare", "c"], ["extras", "Surcharges", "c"], ["tip", "Tip", "c"], ["per", "Per Person", "c"], ["how", "How It's Worked Out", "t"]],
    fn: C["aruba-taxi-fare-calculator"], ex: { route: 2, pax: 2, night: 0, sun: 0, wait: 0, tip: 10, override: 0 },
    exText: (o) => `Example: two people from the airport to the Palm Beach hotels in the daytime with a 10% tip → ${o.total}.`,
    how: "Aruba taxis have no meters. Fares are fixed by destination zone, set by the government and quoted in US dollars, for up to 4 passengers. About $5 is added between 11 pm and 6 am and on Sundays and holidays, plus a small charge for a 5th passenger and for waiting.",
    assume: "Fixed fares are approximate 2026 rates, rounded. Agree the fare with the driver before you set off — US dollars and Aruban florins are both accepted.",
    faq: [["How much is a taxi from Aruba airport to Palm Beach?", "About $35 for up to 4 people, before tip."], ["Do Aruba taxis use meters?", "No — fares are fixed by zone, so ask the driver to confirm the price before you leave."]],
  }),
  mk({
    slug: "grab-fare-calculator-thailand", title: "Grab Fare Calculator Thailand (Bangkok, Phuket)",
    desc: "Estimate a GrabCar fare in Thailand from distance and time — base fare, per km, per minute, booking fee, surge, airport pickup fee and expressway tolls, in baht.",
    inputs: [num("dist", "Trip Distance (km)", 10, 0, 500, 0.1), num("mins", "Trip Time (min)", 25, 0, 600, 1), num("surge", "Surge / Demand Multiplier", 1, 1, 5, 0.1), dd("ap", "Airport Pickup (+฿50)", ["No", "Yes"], 0), money("tolls", "Expressway Tolls", 0, "฿"), num("tip", "Tip (%)", 0, 0, 50, 1), money("base", "Base Fare", E.GRAB_TH.base, "฿"), money("rate", "Rate per km", E.GRAB_TH.km, "฿"), money("min", "Rate per Minute", E.GRAB_TH.min, "฿"), money("fee", "Booking / Platform Fee", E.GRAB_TH.fee, "฿"), money("minf", "Minimum Fare", E.GRAB_TH.minFare, "฿")],
    results: [["total", "Estimated Total", "c", "THB"], ["fare", "Fare Before Tip & Tolls", "c", "THB"], ["ride", "Distance & Time Charge", "c", "THB"], ["fee", "Booking & Airport Fees", "c", "THB"], ["tip", "Tip", "c", "THB"], ["perUnit", "Cost per km", "c", "THB"], ["how", "Formula", "t"]],
    fn: C["grab-fare-calculator-thailand"], ex: { dist: 10, mins: 25, surge: 1, ap: 0, tolls: 0, tip: 0, base: E.GRAB_TH.base, rate: E.GRAB_TH.km, min: E.GRAB_TH.min, fee: E.GRAB_TH.fee, minf: E.GRAB_TH.minFare },
    exText: (o) => `Example: 10 km across Bangkok in 25 minutes, no surge → about ${o.total}.`,
    how: "Grab prices = (base fare + km × rate + minutes × rate) × surge + booking fee, with a minimum fare. Airport pickups add about ฿50 and expressway tolls are paid on top. The defaults are typical standard GrabCar rates in Bangkok — the app shows the fixed price before you book.",
    assume: "Grab sets upfront prices from demand, route and time of day, so treat this as an estimate. Phuket, Chiang Mai and Pattaya rates are usually a little higher than Bangkok.",
    faq: [["Is Grab cheaper than a metered taxi in Bangkok?", "Usually a little more expensive than the meter, but the price is fixed and drivers don't refuse short trips."], ["Do you tip Grab drivers in Thailand?", "It's optional — rounding up or ฿20–฿50 is common."]],
  }),
];

const MILES: ToolDef[] = [
  dist({ slug: "korean-air-skypass-miles-calculator", title: "Korean Air SKYPASS Miles Calculator", prog: "Korean Air SKYPASS", p: E.SKYPASS, from: "ICN", to: "LAX", fare: 1, note: "SKYPASS doesn't give elite bonus miles: Morning Calm and Million Miler status bring lounge and baggage benefits instead.", faq: [["How many SKYPASS miles do I earn?", "A percentage of the miles flown set by your booking class — roughly 50–100% in economy, 125–135% in Prestige and 165% or more in First."], ["Do SKYPASS miles expire?", "Miles earned since 2008 are valid for 10 years."]] }),
  dist({ slug: "alaska-airlines-miles-calculator", title: "Alaska Airlines Miles Calculator (Atmos Rewards Points)", prog: "Alaska Airlines Atmos Rewards (formerly Mileage Plan)", p: E.ATMOS, from: "SEA", to: "JFK", fare: 1, desc: "Calculate how many Alaska Airlines Atmos Rewards points (formerly Mileage Plan miles) you earn on a flight — by distance flown, fare type and elite tier — and what they're worth.", note: "Each flight earns at least 500 points. Mileage Plan became Atmos Rewards in 2025 when Alaska and Hawaiian combined their programmes.", faq: [["Is Alaska Mileage Plan now Atmos Rewards?", "Yes — Mileage Plan miles became Atmos points at 1:1 in 2025."], ["How many points do Saver fares earn?", "About 30% of the distance flown, against 100% for Main fares."]] }),
  dist({ slug: "royal-jordanian-royal-club-miles-calculator", title: "Royal Jordanian Royal Club Miles Calculator", prog: "Royal Jordanian Royal Club", p: E.ROYAL_CLUB, from: "AMM", to: "LHR", fare: 2, faq: [["Is Royal Jordanian in oneworld?", "Yes, so you can also earn Royal Club miles on other oneworld airlines."], ["Do Royal Club miles expire?", "Miles are valid for 3 years."]] }),
  mk({
    slug: "buy-miles-calculator", title: "Buy Miles Calculator (Is Buying Miles Worth It?)",
    desc: "Work out what buying airline miles really costs — price per mile, bonus offers and the miles you're short for an award — and whether it beats paying cash. Presets for AA, United, Delta, Alaska, Avios and Aeroplan.",
    inputs: [dd("prog", "Programme", E.BUY_PROGRAMS.map(([n, p]) => `${n} (${p}¢ a mile)`), 0), num("miles", "Miles to Buy (0 = work it out from the award)", 0, 0, 1e7, 1000), num("award", "Award Price in Miles", 60000, 0, 1e7, 500), num("bal", "Miles You Already Have", 40000, 0, 1e8, 1), pct("bonus", "Purchase Bonus (%)", 0, 300), num("price", "Price per Mile in Cents (0 = typical)", 0, 0, 20, 0.01), num("cap", "Annual Purchase Limit (0 = none)", 150000, 0, 1e7, 1000), num("value", "Value per Mile When Redeemed (cents, 0 = typical)", 0, 0, 20, 0.01)],
    results: [["cost", "Cost to Buy", "c"], ["got", "Miles You Receive", "n", 0], ["eff", "Effective Cost per Mile (cents)", "n", 2], ["worth", "Typical Value of Those Miles", "c"], ["verdict", "Is It Worth It?", "t"], ["how", "How It's Worked Out", "t"]],
    fn: C["buy-miles-calculator"], ex: { prog: 0, miles: 0, award: 60000, bal: 40000, bonus: 0, price: 0, cap: 150000, value: 0 },
    exText: (o) => `Example: 40,000 AAdvantage miles saved for a 60,000-mile award → buy ${o.got} miles for ${o.cost} (${o.eff}¢ each).`,
    how: "Cost = miles bought × price per mile (taxes and fees included in the typical prices). A purchase bonus adds miles without adding cost, so the effective price per mile = cost ÷ miles received. Buying is worth it when that price is below the cents per mile you get back on the award — usually only to top up a balance for a specific premium-cabin award, or during a 50–100% bonus sale.",
    assume: "Typical 2026 non-sale prices, rounded; programmes run bonus sales several times a year and cap purchases each year. Award prices change with demand, so check the award is available before you buy.",
    faq: [["How much does it cost to buy AA miles?", "About 3.76¢ a mile at full price including fees, and often 2–2.5¢ during bonus sales."], ["Is buying miles ever worth it?", "Yes, when you're a few thousand short of a valuable award, or when a big bonus brings the price below what the miles are worth to you."]],
  }),
];

const FLIGHT: ToolDef[] = [
  piece("korean-air-baggage-calculator", "Korean Air", E.KOREAN_AIR, { zone: 3, bags: 3, weight: 22 }, [["How many free bags does Korean Air allow?", "Economy usually includes one 23 kg bag, or two to and from the Americas; Prestige includes two 32 kg bags."], ["How much is an extra bag on Korean Air?", "About $70–$200 depending on the region, more for the third bag."]], "Korean Air domestic flights use a 20 kg weight allowance in economy."),
  piece("brussels-airlines-baggage-calculator", "Brussels Airlines", E.BRUSSELS, { zone: 0, bags: 2, weight: 22 }, [["Is Brussels Airlines part of Lufthansa Group?", "Yes, so its baggage rules are close to Lufthansa, SWISS and Austrian."], ["Do Africa flights get more baggage?", "Yes — economy to most African destinations includes two 23 kg bags."]]),
  mk({
    slug: "turkish-airlines-pet-fee-calculator", title: "Turkish Airlines Pet Fee Calculator (Cabin & Hold)",
    desc: "Calculate the Turkish Airlines fee for flying with a cat, dog or bird — in the cabin (PETC) or the hold (AVIH) — by route, weight and number of pets, one way or round trip.",
    inputs: [dd("zone", "Route", E.TK_PET.map((z) => z[0]), 1), dd("where", "Where Will the Pet Travel?", ["In the cabin (up to 8 kg with carrier)", "In the hold (checked)"], 0), num("kg", "Pet + Carrier Weight (kg)", 6, 0, 100, 0.1), num("pets", "Number of Pets", 1, 1, 4, 1), RT, money("override", "Fee per Pet Override (0 = typical)", 0, "€")],
    results: [["total", "Total Pet Fees", "c", "EUR"], ["one", "One Way, All Pets", "c", "EUR"], ["fee", "Fee per Pet, One Way", "c", "EUR"], ["rule", "Rule Used", "t"], ["note", "Before You Book", "t"]],
    fn: C["turkish-airlines-pet-fee-calculator"], ex: { zone: 1, where: 0, kg: 6, pets: 1, rt: 0, override: 0 },
    exText: (o) => `Example: a 6 kg cat in the cabin from Istanbul to Europe → ${o.total} one way.`,
    how: "Turkish Airlines charges a fixed fee per pet for each flight direction, set by the route zone and whether the pet flies in the cabin (PETC, pet and carrier up to 8 kg) or in the hold (AVIH). Heavier pets go in the hold, and very large crates go as cargo.",
    assume: "Fees are rounded 2026 estimates in euros; Turkish Airlines charges in local currency and changes fees often. Entry rules (microchip, rabies vaccine, health certificate) depend on the destination country.",
    faq: [["Can I take my dog in the cabin on Turkish Airlines?", "Yes, if the dog and its carrier weigh no more than 8 kg; heavier dogs travel in the hold."], ["How do I book a pet on Turkish Airlines?", "Through the call centre or a ticket office at least 48 hours before the flight — space per flight is limited."]],
  }),
];

const DIST: ToolDef[] = [
  mk({
    slug: "closest-airport-calculator", title: "Closest Airport Calculator (Nearest Airport to Me)",
    desc: "Find the closest airports to any city, address area or coordinates — straight-line and estimated road distance, plus driving time to the nearest one, from a built-in list of 176 major airports.",
    inputs: [tx("from", "Your Location (city or lat, lon)", "Orlando Walt Disney World, FL"), num("n", "How Many Airports to List", 3, 1, 8, 1), dd("unit", "Units", ["Kilometres", "Miles"], 1), num("road", "Road Factor (road ÷ straight line)", 1.25, 1, 3, 0.01), num("speed", "Average Driving Speed (km/h or mph)", 45, 5, 130, 1)],
    results: [["name", "Closest Airport", "t"], ["dist", "Straight-Line Distance", "n", 1], ["road", "Estimated Road Distance", "n", 1], ["time", "Estimated Driving Time (min)", "n", 0], ["list", "Nearest Airports", "t"], ["from", "Location Used", "t"]],
    fn: C["closest-airport-calculator"], ex: { n: 3, unit: 1, road: 1.25, speed: 45, ...T("from", "Orlando Walt Disney World, FL") },
    exText: (o) => `Example: from Walt Disney World → ${o.name}, about ${o.road} miles by road (${o.time} minutes).`,
    how: "The calculator measures the great-circle distance from your location to every airport in its built-in list and sorts them. Road distance = straight line × the road factor (1.25 is typical), and driving time = road distance ÷ your average speed.",
    assume: "The list covers 176 major commercial airports, so small regional airfields don't appear. There is no live map: distances are estimates, and the closest airport isn't always the cheapest one to fly from.",
    faq: [["How do I find the nearest airport to me?", "Type your city or your coordinates (e.g. 40.71, -74.01) and the tool lists the closest major airports."], ["Should I always fly from the closest airport?", "Not always — a larger airport a little further away often has cheaper fares and more direct flights."]],
  }),
];

const RAIL: ToolDef[] = [
  mk({
    slug: "seoul-subway-fare-calculator", title: "Seoul Subway Fare Calculator (T-money & Climate Card)",
    desc: "Calculate Seoul Metro subway fares by distance with a T-money card or single-journey ticket — adult, youth and child — and see whether a tourist Climate Card unlimited pass saves money.",
    inputs: [num("km", "Ride Distance (km)", 12, 0, 120, 0.1), dd("rider", "Rider / Payment", E.SEOUL_RIDER, 0), num("rides", "Rides per Day", 4, 1, 30, 1), num("days", "Days", 3, 1, 60, 1)],
    results: [["fare", "Fare per Ride", "c", "KRW"], ["payg", "Pay-As-You-Go Total", "c", "KRW"], ["best", "Best Option", "t"], ["band", "Fare Breakdown", "t"]],
    fn: C["seoul-subway-fare-calculator"], ex: { km: 12, rider: 0, rides: 4, days: 3 },
    exText: (o) => `Example: four 12 km rides a day for 3 days with T-money → ${o.payg}; ${o.best}.`,
    how: "The adult base fare is ₩1,550 with a T-money card (₩1,650 for a single-journey ticket) and covers the first 10 km. From 10 to 50 km, ₩100 is added for every 5 km, and beyond 50 km ₩100 for every 8 km. Youth pay ₩900 and children ₩550. The Climate Card gives unlimited subway and bus rides in Seoul — tourist versions cost ₩5,000 (1 day) to ₩15,000 (5 days), plus the card itself.",
    assume: "Fares are the Seoul Metropolitan Government rates after the 2025 increase, rounded. Transfers to buses within 30 minutes are free or discounted with T-money, which this tool doesn't count.",
    faq: [["How much is the Seoul subway?", "₩1,550 for an adult with T-money for up to 10 km, a little more for longer trips."], ["Is the Climate Card worth it for tourists?", "Usually, if you take 3 or more rides a day — the tourist card costs ₩5,000 a day or less on longer passes."]],
  }),
];

const TIER = ["Budget (hostels, street food)", "Mid-range (3–4★ hotels, restaurants)", "Comfort (4–5★ hotels, fine dining)"];
const TRIP: ToolDef[] = [
  mk({
    slug: "south-korea-trip-cost-calculator", title: "South Korea Trip Cost Calculator (Korea Travel Budget)",
    desc: "Estimate the cost of a trip to South Korea — accommodation, food, local transport, KTX trains or a KORAIL PASS, activities, SIM card and flights — in won and US dollars.",
    inputs: [dd("tier", "Travel Style", TIER, 1), num("days", "Days in Korea", 7, 1, 120, 1), num("pax", "Travellers", 2, 1, 20, 1), money("act", "Activities & Entry Fees per Person per Day", 25000, "₩"), dd("rail", "Intercity Trains", ["None / Seoul only", "KORAIL PASS (5 days, approx. ₩160,000)", "Individual KTX tickets"], 2), money("railamt", "KTX Tickets per Person", 120000, "₩"), money("sim", "SIM / eSIM per Person", 30000, "₩"), money("flight", "Return Flight per Person (USD)", 1000), num("fx", "Exchange Rate (₩ per $1)", 1380, 500, 3000, 1)],
    results: [["total", "Total Trip Cost", "c", "KRW"], ["usd", "Total in US Dollars", "c"], ["per", "Per Person", "c", "KRW"], ["stay", "Accommodation", "c", "KRW"], ["food", "Food", "c", "KRW"], ["move", "Transport", "c", "KRW"], ["act", "Activities & SIM", "c", "KRW"], ["flights", "Flights", "c", "KRW"]],
    fn: C["south-korea-trip-cost-calculator"], ex: { tier: 1, days: 7, pax: 2, act: 25000, rail: 2, railamt: 120000, sim: 30000, flight: 1000, fx: 1380 },
    exText: (o) => `Example: two people, 7 days, mid-range with a Seoul–Busan KTX return → about ${o.total} (${o.usd}).`,
    how: "Accommodation per room per night (two people a room): budget ₩70,000, mid-range ₩150,000, comfort ₩400,000. Food per person per day: ₩35,000 / ₩70,000 / ₩180,000. Local transport ₩8,000–₩30,000 a day. A Seoul–Busan KTX return is about ₩120,000.",
    assume: EST,
    faq: [["How much is a week in South Korea?", "Roughly ₩1–1.5 million per person mid-range, plus flights."], ["Is the KORAIL PASS worth it?", "Only if you take two or more long KTX trips; for one Seoul–Busan return, single tickets are usually cheaper."]],
  }),
  mk({
    slug: "cruise-cost-calculator", title: "Cruise Cost Calculator (Total Cruise Budget)",
    desc: "Add up the real cost of a cruise — fare, taxes and port fees, daily gratuities by cruise line (incl. Disney Cruise Line), drink package, Wi-Fi, excursions, flights and insurance — per person and per night.",
    inputs: [dd("line", "Cruise Line", E.CRUISE_LINES.map(([n, g]) => (g ? `${n} ($${g}/night tips)` : n)), 1), num("nights", "Nights", 7, 1, 180, 1), num("pax", "Guests in the Cabin", 2, 1, 8, 1), money("fare", "Cruise Fare per Person", 900), money("port", "Taxes & Port Fees per Person", 200), money("grat", "Gratuity per Person per Night (0 = line default)", 0), money("drink", "Drink Package per Person per Day (0 = none)", 0), num("drinkers", "Guests Buying the Drink Package", 0, 0, 8, 1), money("wifi", "Wi-Fi per Day (cabin)", 0), money("exc", "Shore Excursions per Person", 250), money("travel", "Flights / Travel to Port per Person", 400), money("hotel", "Pre-Cruise Hotel & Parking", 200), money("onboard", "Other Onboard Spending (spa, dining, casino)", 200), pct("ins", "Travel Insurance (% of fare)", 6, 20)],
    results: [["total", "Total Cruise Cost", "c"], ["per", "Per Person", "c"], ["night", "Per Person per Night", "c"], ["base", "Fare, Taxes & Port Fees", "c"], ["onboard", "Gratuities & Onboard Extras", "c"], ["shore", "Excursions, Travel & Insurance", "c"], ["how", "How It's Worked Out", "t"]],
    fn: C["cruise-cost-calculator"], ex: { line: 1, nights: 7, pax: 2, fare: 900, port: 200, grat: 0, drink: 0, drinkers: 0, wifi: 0, exc: 250, travel: 400, hotel: 200, onboard: 200, ins: 6 },
    exText: (o) => `Example: two guests on a 7-night Royal Caribbean cruise at $900 each with excursions, flights and a hotel night → ${o.total} (${o.night} per person per night).`,
    how: "Total = (fare + taxes and port fees) × guests + daily gratuities × nights × guests + drink packages (with the 18% service charge) + Wi-Fi + excursions + travel to the port + other onboard spending + insurance. Default gratuities: Carnival $16, Royal Caribbean $18, NCL $20, MSC $16, Celebrity $19, Princess $17 and Disney Cruise Line $14.50 per guest per night.",
    assume: "Gratuities and package prices are typical 2026 standard-cabin rates, rounded; suites pay higher gratuities. Most lines require every adult in a cabin to buy the drink package if one does.",
    faq: [["How much does a 7-night cruise really cost?", "Often 1.5–2 times the advertised fare once taxes, gratuities, drinks, excursions and flights are added."], ["How much are Disney Cruise Line gratuities?", "About $14.50 per guest per night, added to your onboard account."]],
  }),
];

const BATCHES: [string, ToolDef[]][] = [[TRV_TAXI, TAXI], [TRV_MILES, MILES], [TRV_FLIGHT, FLIGHT], [TRV_DIST, DIST], [TRV_RAIL, RAIL], [TRV_TRIP, TRIP]];
const all = BATCHES.flatMap((b) => b[1]);
if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
for (const t of all) if (!C[t.slug]) throw new Error(`No engine for ${t.slug}`);
if (process.env.TRV_DRY) {
  console.log(`DRY RUN OK: ${all.length} tool definitions`);
} else {
  (async () => { for (const [cat, tools] of BATCHES) await upsertTools(cat, tools); })().catch((e) => { console.error(e); process.exit(1); });
}
