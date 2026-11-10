// One-time (but safe to re-run) batch setup script: creates 14 calculators in Travel Calculators >
// Flight, Baggage & Airfare Calculators (flights, airfare, compensation, private jets). Formulas
// live in src/lib/calc-engine-trv-flight.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-travel-category.ts --apply)
//   npx tsx prisma/create-trv-flight-calculators.ts        (TRV_DRY=1 → check only, no database)
// or
//   npm run db:create-trv-flight-calculators

import * as E from "../src/lib/calc-engine-trv-flight";
import { mk, num, money, tx, dd, T, runBatch, type ToolDef } from "./trv-tool-kit";
import { TRV_FLIGHT } from "./setup-travel-category";

const HOW = (def = 0) => dd("how", "Distance From", ["Two airports or cities", "A distance I enter"], def);
const FROMTO = (a: string, b: string) => [tx("from", "From (airport code or city)", a), tx("to", "To (airport code or city)", b)];
const DIST = (d: number) => [num("dist", "Distance (if entering one)", d, 0, 30000, 1), dd("du", "Distance Unit", E.DU, 0)];
const AIRPORT_HELP = "Type airport codes (JFK, LHR, DXB, SIN, SYD…) or city names; distances are great-circle (the shortest path over the Earth), which is what airlines use for mileage.";

const TOOLS: ToolDef[] = [
  mk({
    slug: "flight-time-calculator", title: "Flight Time Calculator (Flight Duration Between Airports)",
    meta: "Flight Time Calculator — How Long Is the Flight?",
    desc: "Estimate flight time between two airports or for a distance — block time and air time by aircraft type, with headwind or tailwind.",
    inputs: [HOW(), ...FROMTO("JFK", "LAX"), ...DIST(2475), dd("ac", "Aircraft", E.AIRCRAFT, 0), num("kt", "Custom Cruise Speed (knots)", 450, 50, 700, 1), num("wind", "Wind Component (knots, + tailwind / − headwind)", 0, -200, 200, 1), num("taxi", "Taxi, Climb & Descent Allowance (min)", 30, 0, 120, 1)],
    results: [["block", "Estimated Flight Time (gate to gate)", "t"], ["air", "Time in the Air at Cruise", "t"], ["mi", "Distance (miles)", "n", 0], ["km", "Distance (km)", "n", 0], ["gs", "Ground Speed (knots)", "n", 0], ["route", "Route", "t"]],
    fn: E.flightTime, ex: { how: 0, dist: 2475, du: 0, ac: 0, kt: 450, wind: 0, taxi: 30, ...T("from", "JFK"), ...T("to", "LAX") },
    exText: (o) => `Example: JFK to LAX in a 737/A320 with no wind → about ${o.block} (${o.mi} miles).`,
    how: `${AIRPORT_HELP}\n\nFlight time = great-circle distance ÷ (cruise speed + wind) + 30 minutes for taxi, climb and descent. Westbound flights across the US and Atlantic typically face 50–100 knot headwinds; eastbound get similar tailwinds.`,
    assume: "Airline schedules add extra 'padding' for airport congestion, so timetable durations are often 10–30 minutes longer.",
    faq: [["Why is the flight back shorter?", "The jet stream blows west to east, so eastbound flights get a tailwind."], ["How fast does a 737 fly?", "About 450–460 knots true airspeed (around 840 km/h) at cruise."]],
  }),
  mk({
    slug: "flight-distance-calculator", title: "Flight Distance Calculator (Air Miles Between Airports)",
    meta: "Flight Distance Calculator — Air Miles Between Airports",
    desc: "Calculate the flight distance in miles, km and nautical miles between airports — including multi-leg routes with connections — for mileage earning and planning.",
    inputs: [tx("route", "Airports in Order (separate with ;)", "LHR; JFK")],
    results: [["mi", "Flight Distance (miles)", "n", 0], ["km", "Distance (km)", "n", 0], ["nm", "Distance (nautical miles)", "n", 0], ["legs", "Legs", "t"], ["direct", "Non-Stop Distance (miles)", "n", 0], ["dir", "Heading", "t"], ["mid", "Route Midpoint", "t"]],
    fn: E.flightDistance, ex: T("route", "LHR; JFK"),
    exText: (o) => `Example: London Heathrow to New York JFK → ${o.mi} miles (${o.km} km).`,
    how: `${AIRPORT_HELP} Add connections in order, e.g. "SIN; DXB; LHR". Miles flown = sum of the legs; the non-stop line shows how much the connection adds.`,
    assume: "Great-circle distance on a spherical Earth (accurate to about 0.3%). Actual flight paths add a few percent for airways and weather.",
    faq: [["Is this the distance airlines use for miles?", "Yes — distance-based programmes use great-circle 'flown miles' between airports."], ["What's the difference between miles and nautical miles?", "1 nautical mile = 1.852 km = 1.151 statute miles; pilots and air traffic use nautical miles."]],
  }),
  mk({
    slug: "flight-cost-calculator", title: "Flight Cost Calculator (Airfare Estimate)",
    desc: "Estimate the cost of a flight from the distance, cabin, how far ahead you book and season — with taxes, bag fees and the total for all travellers.",
    inputs: [HOW(), ...FROMTO("ORD", "MIA"), ...DIST(1200), dd("cabin", "Cabin", E.CABIN, 0), dd("book", "Booking Time", E.BOOK, 1), dd("rt", "Trip", ["One way", "Round trip"], 1), num("pax", "Travellers", 1, 1, 500, 1), money("permi", "Economy Fare per Mile", 0.14), money("base", "Base Amount per Ticket", 50), num("peak", "Peak Season / Holiday Uplift (%)", 0, 0, 300, 1), money("tax", "Taxes & Fees per Flight", 40), money("bags", "Bag Fees per Flight", 0)],
    results: [["total", "Estimated Total", "c"], ["per", "Per Traveller", "c"], ["fare", "Base Fare per Traveller", "c"], ["taxes", "Taxes, Fees & Bags per Traveller", "c"], ["cpm", "Cost per Mile Flown", "c"], ["route", "Route", "t"]],
    fn: E.flightCost, ex: { how: 0, dist: 1200, du: 0, cabin: 0, book: 1, rt: 1, pax: 1, permi: 0.14, base: 50, peak: 0, tax: 40, bags: 0, ...T("from", "ORD"), ...T("to", "MIA") },
    exText: (o) => `Example: Chicago O'Hare to Miami, economy round trip booked 1–3 months ahead → about ${o.per}.`,
    how: "Fare = (base + miles × fare per mile) × cabin multiplier (premium economy 1.8×, business 4×, first 6.5×) × booking-time factor × season uplift, plus taxes and bag fees per flight.",
    assume: "Typical averages — real fares depend on competition, demand and sales. Search live fares before booking.",
    faq: [["What does an average flight cost per mile?", "US domestic economy averages around 12–18 cents per mile; short flights cost more per mile."], ["When is the best time to book?", "Usually 1–3 months ahead for domestic and 2–6 months for international trips."]],
  }),
  mk({
    slug: "jet-lag-calculator", title: "Jet Lag Calculator (Recovery Time & Sleep Plan)",
    desc: "Estimate how many days jet lag will last from time zones crossed and direction, with a pre-trip bedtime shift plan and light-exposure tips.",
    inputs: [num("zones", "Time Zones Crossed", 6, 0, 12, 1), dd("dir", "Direction", ["Flying east", "Flying west"], 0), tx("bed", "Usual Bedtime", "23:00"), num("pre", "Days to Shift Before Departure (0–7)", 3, 0, 7, 1), dd("age", "Age", ["Under 60", "60 or over"], 0)],
    results: [["rec", "Expected Recovery", "t"], ["sev", "Jet Lag Severity", "t"], ["plan", "Pre-Trip Bedtime Plan", "t"], ["light", "Light Exposure", "t"], ["tip", "Tip", "t"]],
    fn: E.jetLag, ex: { zones: 6, dir: 0, pre: 3, age: 0, ...T("bed", "23:00") },
    exText: (o) => `Example: 6 time zones east with a 3-day pre-shift → ${o.rec}.`,
    how: "Rule of thumb: the body clock adjusts about 1 time zone per day flying east and about 1.5 per day flying west. Each day you shift your bedtime 1 hour before departure (earlier for east, later for west) removes one zone.",
    assume: "General guidance, not medical advice. Ask a doctor before using melatonin or sleep aids.",
    faq: [["Is jet lag worse flying east?", "Yes — advancing the body clock is harder than delaying it."], ["Does it help to sleep on the plane?", "Sleep when it's night at your destination; stay awake if it's daytime there."]],
  }),
  mk({
    slug: "us-flight-delay-refund-calculator", title: "US Flight Delay & Refund Calculator (DOT Refund Rule)",
    desc: "Check if a US airline owes you a cash refund for a cancelled, significantly delayed or downgraded flight under the DOT rule — plus delayed-bag fee refunds.",
    inputs: [dd("event", "What Happened", E.REFUND_EVENT, 1), dd("intl", "Flight Type", ["Domestic", "International"], 0), num("hrs", "Delay / Schedule Change (hours)", 3.5, 0, 200, 0.25), dd("took", "Did You Accept a Rebooking or Credit?", ["No", "Yes"], 0), money("price", "Ticket Price Paid", 450), num("unused", "Unused Share of Ticket (%)", 100, 0, 100, 1), money("diff", "Fare Difference (downgrade)", 0), money("extras", "Paid Extras Not Received (seats, Wi-Fi)", 0), num("bagh", "Checked Bag Delivered Late By (hours)", 0, 0, 1000, 0.5), dd("long", "International Flight Over 12 Hours?", ["No", "Yes"], 0), money("bagfee", "Bag Fee Paid", 0)],
    results: [["refund", "Refund Owed", "c"], ["status", "Eligibility", "t"], ["fare", "Ticket Refund", "c"], ["extras", "Extras Refund", "c"], ["bag", "Bag Fee Refund", "c"], ["note", "Note", "t"]],
    fn: E.usRefund, ex: { event: 1, intl: 0, hrs: 3.5, took: 0, price: 450, unused: 100, diff: 0, extras: 0, bagh: 0, long: 0, bagfee: 0 },
    exText: (o) => `Example: a domestic flight delayed 3.5 hours, rebooking declined, $450 ticket → refund ${o.refund}.`,
    how: "Since October 2024, US airlines must give an automatic cash refund when a flight is cancelled or 'significantly changed' — departure or arrival moved by 3+ hours (domestic) or 6+ hours (international), a downgrade, an added connection or a different airport — and you decline the alternative. Checked-bag fees are refunded when the bag arrives more than 12 hours late (domestic) or 15/30 hours (international up to/over 12 hours).",
    assume: "Summary of the DOT rule for information only — check the DOT website or the airline's contract of carriage for your case.",
    faq: [["Do US airlines pay compensation for delays?", "Not by law. Some airlines voluntarily offer vouchers or miles; check the DOT dashboard."], ["How fast must the refund come?", "Within 7 business days for card purchases and 20 calendar days for other payments."]],
  }),
  mk({
    slug: "uk261-flight-delay-compensation-calculator", title: "UK261 Flight Delay Compensation Calculator",
    desc: "Work out how much compensation you can claim under UK261 for a delayed, cancelled or overbooked flight — £220, £350 or £520 per passenger by distance.",
    inputs: [HOW(), ...FROMTO("LHR", "MAD"), num("dist", "Distance (if entering one)", 1200, 0, 30000, 1), dd("du", "Distance Unit", E.DU, 1), dd("event", "What Happened", E.UK_EVENT, 0), num("hrs", "Arrival Delay (hours)", 3.5, 0, 200, 0.25), dd("cause", "Cause", E.UK_CAUSE, 0), dd("rer", "Cancelled & Re-routed?", ["No", "Yes"], 0), num("late", "Re-routed Arrival Delay (hours)", 0, 0, 200, 0.25), num("pax", "Passengers", 1, 1, 50, 1)],
    results: [["total", "Total Compensation", "c", "GBP"], ["per", "Per Passenger", "c", "GBP"], ["status", "Result", "t"], ["dist", "Flight Distance", "t"], ["care", "Right to Care", "t"]],
    fn: E.uk261, ex: { how: 0, dist: 1200, du: 1, event: 0, hrs: 3.5, cause: 0, rer: 0, late: 0, pax: 1, ...T("from", "LHR"), ...T("to", "MAD") },
    exText: (o) => `Example: London Heathrow to Madrid arriving 3.5 hours late for a technical fault → ${o.per} per passenger.`,
    how: "UK261 covers flights departing a UK airport, and flights into the UK on a UK or EU airline. Compensation by great-circle distance: up to 1,500 km £220; 1,500–3,500 km £350; over 3,500 km £520. You need to arrive 3+ hours late; cancellations notified under 14 days before departure and overbooking also qualify. If re-routed and you arrive within 2/3/4 hours of the original time, the amount is halved.",
    assume: "Extraordinary circumstances (bad weather, air traffic control restrictions, security) cancel the right to compensation but not to care and a refund. Claims can go back 6 years in England & Wales.",
    faq: [["What's the difference between UK261 and EU261?", "They're the same rules; UK261 pays in pounds and applies to UK departures after Brexit. Use the EU261 calculator for EU departures."], ["Is a technical fault extraordinary?", "Usually not — courts treat most technical problems as within the airline's control."]],
  }),
  mk({
    slug: "flight-tax-calculator", title: "Airline Ticket Tax & Fees Calculator (Flight Taxes)",
    meta: "Flight Tax Calculator — Airline Ticket Taxes & Fees",
    desc: "Break down the taxes and fees on a plane ticket — US excise tax, segment fees, September 11 fee, passenger facility charges, international taxes or UK Air Passenger Duty.",
    inputs: [dd("mode", "Ticket Type", E.TAX_MODE, 0), money("base", "Base Fare (before tax)", 300), dd("rt", "Trip", ["One way", "Round trip"], 1), num("segs", "Flight Segments (take-offs)", 2, 1, 20, 1), num("pax", "Passengers", 1, 1, 500, 1), num("exc", "US Excise Tax (%)", 7.5, 0, 50, 0.1), money("segfee", "Flight Segment Fee", 5.3), money("pfc", "Passenger Facility Charge per Airport", 4.5), money("intlt", "US International Arrival/Departure Tax", 22.9), dd("band", "UK APD Band", E.APD_BAND, 1), dd("cabin", "UK Cabin", ["Economy (reduced rate)", "Premium / business / first (standard rate)"], 0), money("apdo", "APD Override (0 = use band)", 0, "£"), money("other", "Other Taxes & Carrier Charges", 0)],
    results: [["total", "Total Taxes & Fees", "c"], ["excise", "Excise Tax", "c"], ["seg", "Segment Fees", "c"], ["sec", "September 11 Security Fee", "c"], ["pfc", "Passenger Facility Charges", "c"], ["other", "Other / International / APD", "c"], ["all", "Ticket Total incl. Taxes", "c"], ["note", "Note", "t"]],
    fn: E.flightTax, ex: { mode: 0, base: 300, rt: 1, segs: 2, pax: 1, exc: 7.5, segfee: 5.3, pfc: 4.5, intlt: 22.9, band: 1, cabin: 0, apdo: 0, other: 0 },
    exText: (o) => `Example: $300 base fare, US domestic round trip with 2 segments → ${o.total} in taxes and fees, ${o.all} in total.`,
    how: "US domestic: 7.5% excise tax on the base fare, a flight-segment fee per take-off (inflation-adjusted each January), the September 11 security fee of $5.60 per one-way trip (max $11.20 round trip) and up to $4.50 PFC per airport (max 2 airports one way, 4 round trip). International tickets pay an arrival/departure tax instead of the excise tax. UK APD is charged per passenger departing the UK by distance band and cabin (amounts shown are in pounds).",
    assume: "Fee amounts change each year — the defaults are editable. Carrier-imposed surcharges are not taxes; add them under Other.",
    faq: [["Why are taxes so high on award tickets from London?", "UK APD in premium cabins is high, and some airlines add fuel surcharges."]],
  }),
  mk({
    slug: "flight-arrival-time-calculator", title: "Flight Arrival Time Calculator (Time Zones)",
    desc: "Find the local arrival time of a flight from the departure time, flight duration and the time zones of the origin and destination.",
    inputs: [tx("dep", "Departure Time (local)", "19:30"), tx("dur", "Flight Duration (h:mm)", "7:05"), num("otz", "Origin UTC Offset (h)", -4, -12, 14, 0.25), num("dtz", "Destination UTC Offset (h)", 1, -12, 14, 0.25)],
    results: [["arr", "Arrival Time (destination local)", "t"], ["dur", "Flight Duration", "t"], ["diff", "Time Difference", "t"], ["utc", "In UTC", "t"], ["home", "Time Back Home on Landing", "t"]],
    fn: E.flightArrival, ex: { otz: -4, dtz: 1, ...T("dep", "19:30"), ...T("dur", "7:05") },
    exText: (o) => `Example: leave New York (UTC−4) at 19:30 on a 7 h 05 min flight to London (UTC+1) → land ${o.arr}.`,
    how: "Arrival local time = departure + duration + (destination UTC offset − origin UTC offset). Use summer-time offsets when daylight saving applies (e.g. New York −4 in summer, −5 in winter).",
    assume: "Enter the offsets in force on the travel date.",
    faq: [["How do I find a UTC offset?", "Search 'time zone' plus the city — e.g. London is UTC+0 in winter, UTC+1 in summer."]],
  }),
  mk({
    slug: "layover-calculator", title: "Layover Calculator (Connection Time Checker)",
    desc: "Check if a layover is long enough — connection time versus the minimum connection time for domestic, international, terminal changes and separate tickets.",
    inputs: [tx("arr", "First Flight Arrives", "14:20"), tx("dep", "Next Flight Departs", "15:35"), num("days", "Next Flight Is … Days Later", 0, 0, 3, 1), dd("type", "Connection Type", E.CONN, 0), dd("term", "Change Terminal?", ["No", "Yes"], 0), dd("sep", "Separate Tickets / Re-check Bags?", ["No", "Yes"], 0)],
    results: [["lay", "Layover Length", "t"], ["risk", "Verdict", "t"], ["mct", "Minimum Time Needed", "t"], ["spare", "Spare Time", "t"], ["out", "Leave the Airport?", "t"]],
    fn: E.layover, ex: { days: 0, type: 0, term: 0, sep: 0, ...T("arr", "14:20"), ...T("dep", "15:35") },
    exText: (o) => `Example: arrive 14:20, depart 15:35, domestic → ${o.lay} layover: ${o.risk}.`,
    how: "Minimum connection time used: 45 min domestic, 60 min domestic→international, 90 min arriving internationally (customs and bag re-check), 75 min international transit, +20 min for a terminal change, +60 min on separate tickets.",
    assume: "Airports publish their own official minimum connection times; big hubs can need more.",
    faq: [["What if my connection is too short on one ticket?", "On a single booking the airline must rebook you if you miss it; on separate tickets you're on your own."]],
  }),
  mk({
    slug: "aircraft-range-calculator", title: "Aircraft Range Calculator (Fuel, Endurance & Range)",
    desc: "Calculate an aircraft's endurance and range from usable fuel, fuel burn, cruise speed, wind and reserve — in nautical miles, statute miles and km.",
    inputs: [num("fuel", "Usable Fuel", 50, 0, 1e7, 0.1), dd("fu", "Fuel Unit", E.FUEL_U, 0), num("burn", "Fuel Burn per Hour (same unit)", 9, 0, 1e6, 0.1), num("kt", "Cruise True Airspeed (knots)", 120, 1, 700, 1), num("wind", "Wind (knots, + tailwind)", 0, -200, 200, 1), num("res", "Reserve (minutes)", 45, 0, 600, 1)],
    results: [["nm", "Range (nautical miles)", "n", 0], ["mi", "Range (statute miles)", "n", 0], ["km", "Range (km)", "n", 0], ["end", "Total Endurance", "t"], ["usable", "Endurance Less Reserve", "t"], ["gs", "Ground Speed (knots)", "n", 0]],
    fn: E.aircraftRange, ex: { fuel: 50, fu: 0, burn: 9, kt: 120, wind: 0, res: 45 },
    exText: (o) => `Example: 50 gal usable, 9 gal/h at 120 knots with a 45-minute reserve → ${o.nm} nm range.`,
    how: "Endurance = fuel ÷ burn. Range = (endurance − reserve) × ground speed. VFR day flights need 30 minutes' reserve (FAA), night and IFR 45 minutes.",
    assume: "Ignores climb fuel and changing weight — use the aircraft's flight manual for planning.",
    faq: [["What is the range of a Cessna 172?", "About 600–640 nm with full tanks at 75% power and a 45-minute reserve."]],
  }),
  mk({
    slug: "private-jet-charter-cost-calculator", title: "Private Jet Charter Cost Calculator",
    meta: "Private Jet Charter Cost Calculator — Price a Charter",
    desc: "Estimate what a private jet charter costs by jet class — flight hours, repositioning, daily minimum, federal excise tax, landing fees and crew overnights — and the price per passenger.",
    inputs: [HOW(), ...FROMTO("TEB", "PBI"), ...DIST(1000), dd("jet", "Jet Class", E.JET, 2), money("rate", "Hourly Rate Override (0 = typical)", 0), dd("rt", "Trip", ["One way", "Round trip"], 0), num("pax", "Passengers", 4, 1, 20, 1), num("posit", "Repositioning (% of one leg)", 50, 0, 200, 1), num("min", "Daily Minimum (hours)", 1.5, 0, 5, 0.1), dd("us", "US Flight (7.5% Federal Excise Tax)?", ["No", "Yes"], 1), money("fees", "Landing, Handling & Catering per Leg", 1200), num("night", "Crew Overnights", 0, 0, 30, 1), money("nightfee", "Crew Overnight Fee", 1500)],
    results: [["total", "Estimated Charter Cost", "c"], ["per", "Per Passenger", "c"], ["hrs", "Billable Flight Hours", "n", 2], ["flight", "Flight Hours Cost", "c"], ["fet", "Federal Excise Tax", "c"], ["fees", "Fees & Overnights", "c"], ["route", "Route", "t"]],
    fn: E.jetCharter, ex: { how: 1, dist: 1000, du: 0, jet: 2, rate: 0, rt: 0, pax: 4, posit: 50, min: 1.5, us: 1, fees: 1200, night: 0, nightfee: 1500, ...T("from", "TEB"), ...T("to", "PBI") },
    exText: (o) => `Example: 1,000 miles one way in a light jet with 4 passengers → about ${o.total} (${o.per} each).`,
    how: "Flight hours = distance ÷ cruise speed + 18 minutes taxi, plus 45 minutes per fuel stop. Typical 2026 US hourly rates: turboprop $2,200, very light $3,500, light $4,600, midsize $5,900, super-midsize $7,600, heavy $9,800, ultra-long-range $13,500. One-way trips usually pay to reposition the empty jet; round trips with a wait pay crew overnights instead.",
    assume: "Charter prices vary with demand, holidays and empty-leg deals; get a quote from an operator.",
    faq: [["What is an empty leg?", "A repositioning flight sold at a discount — often 30–75% off — when it matches your route."], ["Is jet card or membership cheaper?", "For 25+ hours a year a jet card can lock in hourly rates."]],
  }),
  mk({
    slug: "private-jet-flight-time-calculator", title: "Private Jet Flight Time Calculator",
    desc: "Estimate private jet flight time by jet class — cruise speed, range, fuel stops and wind — between two airports or for a distance.",
    inputs: [HOW(), ...FROMTO("VNY", "TEB"), ...DIST(2000), dd("jet", "Jet Class", E.JET, 3), num("wind", "Wind (knots, + tailwind)", 0, -150, 150, 1)],
    results: [["time", "Estimated Flight Time", "t"], ["air", "Time in the Air", "t"], ["stops", "Fuel Stops", "n", 0], ["range", "Jet Performance", "t"], ["route", "Route", "t"]],
    fn: E.jetTime, ex: { how: 0, dist: 2000, du: 0, jet: 3, wind: 0, ...T("from", "VNY"), ...T("to", "TEB") },
    exText: (o) => `Example: Van Nuys to Teterboro in a midsize jet → ${o.time} with ${o.stops} fuel stop(s).`,
    how: "Time = great-circle nautical miles ÷ (cruise speed + wind) + 18 minutes for taxi, climb and descent, + 45 minutes per fuel stop when the trip exceeds the jet's typical range.",
    assume: "Typical class performance with passengers and a reserve; heavy loads or strong headwinds reduce range.",
    faq: [["Which jets fly coast to coast non-stop?", "Super-midsize jets and larger (about 3,000+ nm range)."]],
  }),
  mk({
    slug: "private-jet-fuel-cost-calculator", title: "Private Jet Fuel Cost Calculator",
    desc: "Calculate the fuel used and fuel cost of a private jet flight from the jet class or burn rate, flight hours and Jet A price per gallon.",
    inputs: [dd("jet", "Jet Class", [...E.JET, "Custom burn rate"], 3), num("gph", "Custom Fuel Burn (gal/h)", 200, 0, 5000, 1), num("hrs", "Flight Hours", 2.5, 0, 24, 0.1), money("price", "Jet A Price per Gallon", 6.5), num("taxi", "Taxi Time (min)", 20, 0, 180, 1)],
    results: [["cost", "Fuel Cost", "c"], ["gal", "Fuel Used (gal)", "n", 0], ["lb", "Fuel Weight (lb)", "n", 0], ["l", "Fuel Used (litres)", "n", 0], ["res", "45-min Reserve (gal)", "n", 0], ["perh", "Fuel Cost per Hour", "c"]],
    fn: E.jetFuel, ex: { jet: 3, gph: 200, hrs: 2.5, price: 6.5, taxi: 20 },
    exText: (o) => `Example: a midsize jet for 2.5 hours at $6.50/gal → ${o.gal} gallons, ${o.cost}.`,
    how: "Fuel = burn rate × (flight hours + taxi time). Typical burn: turboprop 75 gal/h, very light jet 100, light 160, midsize 220, super-midsize 270, heavy 420, ultra-long-range 500. Jet A weighs about 6.7 lb per gallon.",
    assume: "Average burn; the first hour (climb) burns more.",
    faq: [["How much is Jet A?", "US FBO prices commonly run $5.50–$9.00 per gallon in 2026."]],
  }),
  mk({
    slug: "helicopter-charter-cost-calculator", title: "Helicopter Charter Cost Calculator",
    desc: "Estimate helicopter charter cost and travel time by helicopter type — flight hours, ferry time, waiting time and landing fees.",
    inputs: [HOW(1), ...FROMTO("New York, NY", "East Hampton"), ...DIST(95), dd("heli", "Helicopter", E.HELI, 3), money("rate", "Hourly Rate Override (0 = typical)", 0), dd("rt", "Trip", ["One way", "Return"], 0), num("ferry", "Ferry Back (% of one leg, one way only)", 100, 0, 200, 1), num("min", "Minimum Billable Hours", 1, 0, 5, 0.1), num("wait", "Waiting Time (hours)", 0, 0, 72, 0.5), num("waitpct", "Waiting Charge (% of hourly rate)", 25, 0, 100, 1), money("fees", "Landing & Handling Fees", 250)],
    results: [["total", "Estimated Charter Cost", "c"], ["time", "Flight Time One Way", "t"], ["hrs", "Billable Hours", "n", 2], ["wait", "Waiting Charge", "c"], ["route", "Route", "t"]],
    fn: E.heliCharter, ex: { how: 1, dist: 95, du: 0, heli: 3, rate: 0, rt: 0, ferry: 100, min: 1, wait: 0, waitpct: 25, fees: 250, ...T("from", "New York, NY"), ...T("to", "New York, NY") },
    exText: (o) => `Example: 95 miles one way in an H125/AS350 → about ${o.total}, ${o.time} in the air.`,
    how: "Flight time = nautical miles ÷ cruise speed + 9 minutes start-up and landing. Typical hourly rates: R44 $750, R66 $1,100, Bell 206 $1,600, H125 $2,400, Bell 407 $2,800, AW109 $4,500, S-76 $6,500. One-way trips usually pay for the empty ferry flight back to base.",
    assume: "Rates vary by city, fuel price and season.",
    faq: [["Is a helicopter faster than driving?", "For 50–150 mile trips in traffic, usually — but add time to get to and from the helipads."]],
  }),
];

runBatch(TRV_FLIGHT, TOOLS);
