// One-time (but safe to re-run) batch setup script: creates 12 calculators in Travel Calculators >
// Distance, Route & Travel Time Calculators. Formulas live in src/lib/calc-engine-trv-dist.ts;
// examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-travel-category.ts --apply)
//   npx tsx prisma/create-trv-dist-calculators.ts        (TRV_DRY=1 → check only, no database)
// or
//   npm run db:create-trv-dist-calculators

import * as E from "../src/lib/calc-engine-trv-dist";
import { mk, num, tx, dd, date, T, runBatch, type ToolDef } from "./trv-tool-kit";
import { TRV_DIST } from "./setup-travel-category";

const D = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000);
const UNIT = dd("unit", "Units", E.UNIT, 0);
const PLACE_HELP = "Type a city (\"Chicago\", \"Paris\"), an airport code (\"JFK\") or coordinates (\"40.71, -74.01\").";
const ROAD = "There is no live map routing here: road distance is the straight-line (great-circle) distance multiplied by a road factor — 1.2 suits most intercity trips, use 1.3–1.4 for mountain or coastal roads. For turn-by-turn routes, check a maps app.";

const TOOLS: ToolDef[] = [
  mk({
    slug: "distance-calculator", title: "Distance Calculator (Driving & Straight-Line Distance)",
    meta: "Distance Calculator — Driving Distance Between Two Places",
    desc: "Find the distance between two cities or places — straight-line (as the crow flies) and estimated driving distance in miles or km — with drive time and compass direction.",
    inputs: [tx("from", "From", "New York, NY"), tx("to", "To", "Boston, MA"), UNIT, num("factor", "Road Factor (road ÷ straight line)", 1.2, 1, 3, 0.01), num("speed", "Average Driving Speed (mph or km/h)", 60, 1, 200, 1)],
    results: [["road", "Estimated Driving Distance", "n", 1], ["straight", "Straight-Line Distance", "n", 1], ["other", "In Other Units", "t"], ["time", "Estimated Drive Time", "t"], ["dir", "Direction", "t"], ["route", "Route", "t"]],
    fn: E.distance, ex: { unit: 0, factor: 1.2, speed: 60, ...T("from", "New York, NY"), ...T("to", "Boston, MA") },
    exText: (o) => `Example: New York to Boston → about ${o.road} miles by road (${o.straight} miles straight line), ${o.time} at 60 mph.`,
    how: `${PLACE_HELP}\n\nStraight-line distance uses the haversine formula on the Earth's mean radius (6,371 km). ${ROAD}`,
    assume: "Driving time excludes stops and traffic. Results are estimates, not a route plan.",
    faq: [["What is 'as the crow flies'?", "The shortest distance over the Earth's surface between two points — the straight-line figure shown here."], ["Why is the road distance an estimate?", "Roads curve around terrain and water. On average they are about 20% longer than the straight line, which is the default road factor."], ["Can I use postcodes?", "Use the town name or the coordinates of the postcode instead — the built-in list covers major cities and airports."]],
  }),
  mk({
    slug: "travel-time-calculator", title: "Travel Time Calculator (Drive Time by Distance)",
    desc: "Work out how long a journey takes by car, bus, bike, scooter, train or on foot — from the distance, with traffic delay, rest breaks and stops added.",
    inputs: [num("dist", "Distance", 300, 0, 50000, 0.1), UNIT, dd("mode", "Travel Mode", E.MODE, 0), num("speed", "Custom Speed (mph or km/h)", 60, 1, 1000, 1), num("traffic", "Traffic Delay (%)", 10, 0, 300, 1), num("every", "Break Every (hours, 0 = none)", 2, 0, 24, 0.5), num("brk", "Break Length (min)", 15, 0, 600, 1), num("stops", "Other Stops (min total)", 0, 0, 10000, 1)],
    results: [["total", "Total Travel Time", "t"], ["moving", "Time Moving", "t"], ["breaks", "Breaks & Stops", "t"], ["avg", "Average Moving Speed (mph or km/h)", "n", 1], ["hours", "Total Hours", "n", 2]],
    fn: E.travelTime, ex: { dist: 300, unit: 0, mode: 0, speed: 60, traffic: 10, every: 2, brk: 15, stops: 0 },
    exText: (o) => `Example: 300 miles by car on the highway with 10% traffic and a 15-minute break every 2 hours → ${o.total}.`,
    how: "Moving time = distance ÷ typical speed for the mode (highway car 100 km/h, mixed 75, city 35, coach 70, bicycle 16, e-scooter 18, walking 5, intercity train 110), stretched by the traffic delay. A break is added each time the driving time passes another full break interval.",
    assume: "Typical average speeds, not speed limits. Real traffic varies by hour — raise the delay for rush hour.",
    faq: [["How do I estimate rush-hour time?", "Set the traffic delay to 30–80% for busy urban commutes."], ["Does it include charging or fuel stops?", "Add them to Other Stops."]],
  }),
  mk({
    slug: "sea-distance-calculator", title: "Sea Distance Calculator (Port to Port Nautical Miles)",
    desc: "Estimate the sea distance between two ports in nautical miles, km and miles, with sailing days at your vessel speed.",
    inputs: [tx("from", "From Port", "Rotterdam"), tx("to", "To Port", "New York/New Jersey"), num("factor", "Sea Routing Factor", 1.15, 1, 3, 0.01), num("kn", "Vessel Speed (knots, 0 = skip)", 14, 0, 60, 0.1)],
    results: [["nm", "Estimated Sea Distance (nm)", "n", 0], ["km", "Sea Distance (km)", "n", 0], ["mi", "Sea Distance (statute miles)", "n", 0], ["gc", "Great-Circle Distance (nm)", "n", 0], ["days", "Days at Sea", "n", 2], ["route", "Route", "t"]],
    fn: E.seaDistance, ex: { factor: 1.15, kn: 14, ...T("from", "Rotterdam"), ...T("to", "New York/New Jersey") },
    exText: (o) => `Example: Rotterdam to New York → about ${o.nm} nautical miles, ${o.days} days at 14 knots.`,
    how: "Great-circle distance between the two ports in nautical miles (1 nm = 1.852 km), multiplied by a routing factor for coastlines, traffic separation schemes and weather routing. Days = distance ÷ (speed × 24).",
    assume: "Routes through Suez, Panama or around capes can be much longer than the great circle — raise the factor (1.3–1.6) for those, or enter the canal leg separately. Not for navigation.",
    faq: [["What is a nautical mile?", "1,852 metres — one minute of latitude. 1 nm ≈ 1.151 statute miles."], ["Which ports are included?", "About 85 major container, cruise and ferry ports. You can also type coordinates."]],
  }),
  mk({
    slug: "halfway-point-calculator", title: "Halfway Point Calculator (Midpoint Between Places)",
    desc: "Find the halfway point between two (or up to ten) cities or places — the geographic midpoint, the nearest big city and each person's distance to it.",
    inputs: [tx("places", "Places (separate with ;)", "New York, NY; Washington, DC"), UNIT],
    results: [["mid", "Midpoint Coordinates", "t"], ["near", "Nearest Listed City", "t"], ["each", "Distance From Each Place", "t"], ["far", "Longest Distance to Midpoint", "n", 1], ["map", "Paste Into a Maps App", "t"]],
    fn: E.halfway, ex: { unit: 0, ...T("places", "New York, NY; Washington, DC") },
    exText: (o) => `Example: New York and Washington, DC → midpoint ${o.mid}, nearest listed city ${o.near}.`,
    how: `${PLACE_HELP} The midpoint averages the places as 3-D unit vectors, which is correct on a sphere (a simple average of latitudes and longitudes is not).`,
    assume: "This is the geographic midpoint, not the point that splits the driving time equally — search the coordinates in a maps app to find a town or café nearby.",
    faq: [["Can I find a meeting point for three friends?", "Yes — list all three cities separated by semicolons."], ["Why isn't the midpoint halfway along the road?", "Roads aren't straight; drive-time halfway points shift toward faster roads."]],
  }),
  mk({
    slug: "eta-calculator", title: "ETA Calculator (Estimated Time of Arrival)",
    desc: "Calculate your estimated time of arrival from the departure time, distance, average speed, stops and any time-zone change.",
    inputs: [tx("dep", "Departure Time", "08:30"), num("dist", "Distance", 250, 0, 50000, 0.1), UNIT, num("speed", "Average Speed (mph or km/h)", 60, 1, 1000, 1), num("stops", "Stops (min total)", 30, 0, 10000, 1), num("tz", "Time-Zone Change at Destination (h)", 0, -24, 24, 0.5)],
    results: [["eta", "Estimated Arrival Time", "t"], ["dur", "Journey Duration", "t"], ["move", "Time Moving", "t"], ["local", "Time Zone", "t"], ["unit", "Based On", "t"]],
    fn: E.eta, ex: { dist: 250, unit: 0, speed: 60, stops: 30, tz: 0, ...T("dep", "08:30") },
    exText: (o) => `Example: leave at 08:30, 250 miles at 60 mph with 30 minutes of stops → arrive ${o.eta}.`,
    how: "ETA = departure + distance ÷ average speed + stops, then shifted by the time-zone difference (e.g. −1 h driving from Eastern to Central time).",
    assume: "Average speed should include slowdowns; use the Travel Time Calculator if you only know the road type.",
    faq: [["What average speed should I use?", "About 55–65 mph on interstates including slowdowns, 25–35 mph in cities."], ["Does it handle overnight trips?", "Yes — arrivals after midnight show '+1 day'."]],
  }),
  mk({
    slug: "multi-stop-route-calculator", title: "Multi-Stop Route Calculator (Route Mileage With Stops)",
    desc: "Add up the mileage of a route with multiple stops, see every leg, optionally reorder the stops for a shorter route and estimate total driving time.",
    inputs: [tx("stops", "Stops in Order (separate with ;)", "Chicago, IL; Milwaukee, WI; Madison, WI; Des Moines, IA; Omaha, NE"), UNIT, dd("opt", "Reorder Middle Stops", ["Keep my order", "Shortest order (nearest neighbour)"], 0), dd("ret", "Return to Start", ["No", "Yes"], 0), num("factor", "Road Factor", 1.2, 1, 3, 0.01), num("speed", "Average Speed (mph or km/h)", 55, 1, 200, 1), num("dwell", "Time at Each Stop (min)", 0, 0, 1440, 1)],
    results: [["total", "Total Route Distance", "n", 1], ["time", "Estimated Driving Time", "t"], ["legs", "Legs", "t"], ["order", "Stop Order", "t"], ["n", "Number of Legs", "n", 0]],
    fn: E.multiStop, ex: { unit: 0, opt: 0, ret: 0, factor: 1.2, speed: 55, dwell: 0, ...T("stops", "Chicago, IL; Milwaukee, WI; Madison, WI; Des Moines, IA; Omaha, NE") },
    exText: (o) => `Example: Chicago → Milwaukee → Madison → Des Moines → Omaha → about ${o.total} miles, ${o.time}.`,
    how: `${PLACE_HELP} Up to 12 stops. Each leg = straight-line distance × road factor. 'Shortest order' keeps the first (and last, unless returning) stop fixed and visits the nearest remaining stop each time.\n\n${ROAD}`,
    assume: "Nearest-neighbour ordering is a good quick answer, not always the absolute best order.",
    faq: [["Is this a delivery route optimiser?", "It gives a sensible order for up to 12 stops; professional tools add time windows and live traffic."]],
  }),
  mk({
    slug: "departure-time-calculator", title: "What Time Should I Leave Calculator",
    desc: "Work out what time to leave to arrive on time — from the arrive-by time, distance, speed, rush-hour traffic and a safety buffer.",
    inputs: [tx("arr", "Need to Arrive By", "09:00"), num("dist", "Distance", 30, 0, 50000, 0.1), UNIT, num("speed", "Average Speed (mph or km/h)", 35, 1, 1000, 1), dd("rush", "Traffic", ["Light (+0%)", "Moderate (+25%)", "Heavy / rush hour (+50%)", "Very heavy (+80%)"], 1), num("extra", "Extra Delay (%)", 0, 0, 300, 1), num("buffer", "Safety Buffer (min)", 10, 0, 600, 1)],
    results: [["leave", "Leave By", "t"], ["travel", "Expected Travel Time", "t"], ["buffer", "Buffer", "t"], ["latest", "Latest Possible (no buffer)", "t"], ["note", "Based On", "t"]],
    fn: E.departure, ex: { dist: 30, unit: 0, speed: 35, rush: 1, extra: 0, buffer: 10, ...T("arr", "09:00") },
    exText: (o) => `Example: arrive by 09:00, 30 miles at 35 mph in moderate traffic with a 10-minute buffer → leave by ${o.leave}.`,
    how: "Leave time = arrive-by time − distance ÷ speed × (1 + traffic delay) − buffer.",
    assume: "Traffic percentages are typical, not live. Check a live map on the day.",
    faq: [["What's the best time to leave for a road trip?", "Leaving before 6 am or after the evening rush (after 7 pm) usually avoids the worst city traffic."]],
  }),
  mk({
    slug: "passport-validity-calculator", title: "Passport Validity Calculator (6-Month Rule)",
    desc: "Check whether your passport is valid long enough for a trip — 6-month rule, Schengen 3-month rule or valid-for-stay — and when to renew.",
    inputs: [date("today", "Today", "today"), date("exp", "Passport Expiry Date", "today+200"), date("arr", "Arrival Date", "today+30"), date("dep", "Departure Date", "today+44"), dd("rule", "Destination Rule", E.PP_RULE, 0)],
    results: [["status", "Result", "t"], ["need", "Passport Must Be Valid Until", "t"], ["spare", "Margin", "t"], ["left", "Remaining Validity", "t"], ["renew", "Renew By (9 months before expiry)", "t"], ["note", "Also Check", "t"]],
    fn: E.passport, ex: { today: D("2026-11-10"), exp: D("2027-05-01"), arr: D("2026-12-10"), dep: D("2026-12-24"), rule: 0 },
    exText: (o) => `Example: passport expires 1 May 2027, arriving 10 Dec 2026 under the 6-month rule → ${o.status}; it must be valid until ${o.need}.`,
    how: "6-month rule: valid 6 months after the arrival date. Schengen: valid 3 months after leaving the Schengen Area (and issued in the last 10 years). Valid-for-stay countries only need the passport valid on departure.",
    assume: "Entry rules change and airlines can be stricter — always check the destination government's official site. *Australia and some others require validity for the stay but recommend 6 months.",
    faq: [["Which countries use the 6-month rule?", "Many in Asia, the Middle East and Africa, e.g. Thailand, Indonesia, UAE, China and Singapore."], ["Does the US require 6 months?", "Not for citizens of the 'Six-Month Club' exemption list (most visitors); the passport must be valid for the stay."]],
  }),
  mk({
    slug: "driving-radius-calculator", title: "Driving Radius Calculator (How Far Can I Drive)",
    desc: "Estimate how far you can drive from a place in a set time — the straight-line radius, road distance, covered area — and check whether other towns are within reach.",
    inputs: [tx("from", "Starting Place", "Denver, CO"), num("mins", "Drive Time (min)", 120, 1, 6000, 1), UNIT, num("speed", "Average Speed (mph or km/h)", 55, 1, 200, 1), num("factor", "Road Factor", 1.3, 1, 3, 0.01), tx("check", "Places to Check (separate with ;)", "Colorado Springs, CO; Cheyenne, WY; Salt Lake City, UT")],
    results: [["r", "Straight-Line Radius", "n", 1], ["road", "Road Distance in That Time", "n", 1], ["area", "Area Covered (sq mi or km²)", "n", 0], ["check", "Within Reach?", "t"], ["centre", "Centre", "t"]],
    fn: E.radius, ex: { mins: 120, unit: 0, speed: 55, factor: 1.3, ...T("from", "Denver, CO"), ...T("check", "Colorado Springs, CO; Cheyenne, WY; Salt Lake City, UT") },
    exText: (o) => `Example: 2 hours from Denver at 55 mph → about ${o.r} miles in a straight line. ${o.check}.`,
    how: "Road distance = speed × time. The radius = road distance ÷ road factor (roads wind, so you reach less far as the crow flies). This draws a circle; a real drive-time map (isochrone) follows the road network.",
    assume: "Estimate only — highways stretch the reach in some directions, mountains and water shrink it.",
    faq: [["What is an isochrone?", "A map area reachable within a set time. This tool approximates it with a circle."]],
  }),
  mk({
    slug: "voyage-time-calculator", title: "Voyage Time Calculator (Boat & Ship Travel Time)",
    desc: "Calculate how long a boat or ship takes to cover a distance at a speed in knots, with port time, fuel burned and fuel cost.",
    inputs: [num("dist", "Distance", 1200, 0, 50000, 0.1), dd("du", "Distance Unit", ["Nautical miles", "Kilometres", "Statute miles"], 0), num("kn", "Speed (knots)", 12, 0.1, 60, 0.1), num("port", "Port / Stop Time (hours)", 0, 0, 10000, 0.5), num("burn", "Fuel Burn (litres or gal per hour)", 0, 0, 100000, 0.1), num("price", "Fuel Price (per litre or gal)", 0, 0, 1000, 0.01)],
    results: [["time", "Voyage Time", "t"], ["days", "Days", "n", 2], ["nm", "Distance (nm)", "n", 1], ["fuel", "Fuel Used", "n", 0], ["fuelCost", "Fuel Cost", "c"], ["unit", "Distance Entered In", "t"]],
    fn: E.voyage, ex: { dist: 1200, du: 0, kn: 12, port: 0, burn: 0, price: 0 },
    exText: (o) => `Example: 1,200 nautical miles at 12 knots → ${o.time} (${o.days} days).`,
    how: "Time = distance in nautical miles ÷ speed in knots (1 knot = 1 nm per hour), plus port time. Fuel = sailing hours × burn rate.",
    assume: "Constant speed through the water; currents and weather change real speed over ground.",
    faq: [["How fast is a cruise ship?", "Usually 18–22 knots; container ships 14–20 knots; sailing yachts 5–8 knots."]],
  }),
  mk({
    slug: "when-to-leave-for-airport-calculator", title: "When to Leave for the Airport Calculator",
    desc: "Find what time to leave home for your flight — using the airport arrival rule, drive time, traffic, parking or drop-off and security fast-track.",
    inputs: [tx("dep", "Flight Departure Time", "10:15"), dd("type", "Flight", E.FL_TYPE, 0), num("drive", "Drive Time to Airport (min)", 45, 0, 1000, 1), num("traffic", "Traffic Allowance (%)", 15, 0, 300, 1), num("park", "Parking / Shuttle / Drop-off (min)", 15, 0, 300, 1), dd("pre", "TSA PreCheck / Fast Track", ["No", "Yes"], 0), num("extra", "Extra Buffer (min)", 0, 0, 600, 1)],
    results: [["leave", "Leave Home By", "t"], ["at", "Be at the Terminal By", "t"], ["board", "Boarding Starts About", "t"], ["total", "Total Time Before Departure", "t"], ["rule", "Airport Rule Used", "t"]],
    fn: E.airportLeave, ex: { type: 0, drive: 45, traffic: 15, park: 15, pre: 0, extra: 0, ...T("dep", "10:15") },
    exText: (o) => `Example: domestic flight at 10:15, 45-minute drive → leave home by ${o.leave}.`,
    how: "Terminal arrival = departure − 1.5 h (domestic, carry-on only), 2 h (domestic with bags), 2.5 h (international carry-on) or 3 h (international with bags). Leave time = terminal time − parking/drop-off − drive × (1 + traffic).",
    assume: "Follow your airline's check-in and bag-drop deadlines (often 45–60 minutes before departure) and allow more time at very busy hubs or holidays.",
    faq: [["How early should I get to the airport?", "Airlines recommend 2 hours for domestic and 3 hours for international flights."]],
  }),
  mk({
    slug: "round-trip-mileage-calculator", title: "Round Trip Mileage Calculator",
    desc: "Calculate round-trip mileage between two places (or from a one-way distance) for one or many trips, with the cost or reimbursement at a per-mile rate.",
    inputs: [dd("how", "Distance From", ["Two places", "One-way distance I enter"], 0), tx("from", "From", "Philadelphia, PA"), tx("to", "To", "Harrisburg, PA"), num("dist", "One-Way Distance", 25, 0, 50000, 0.1), UNIT, num("factor", "Road Factor", 1.2, 1, 3, 0.01), num("trips", "Number of Round Trips", 1, 1, 10000, 1), num("side", "Extra Miles per Trip", 0, 0, 10000, 0.1), num("rate", "Rate per Mile/km ($)", 0.7, 0, 100, 0.001)],
    results: [["total", "Total Mileage", "n", 1], ["rt", "Round Trip Distance", "n", 1], ["one", "One-Way Distance", "n", 1], ["cost", "Cost / Reimbursement", "c"], ["desc", "Based On", "t"]],
    fn: E.roundTrip, ex: { how: 0, dist: 25, unit: 0, factor: 1.2, trips: 1, side: 0, rate: 0.7, ...T("from", "Philadelphia, PA"), ...T("to", "Harrisburg, PA") },
    exText: (o) => `Example: Philadelphia ↔ Harrisburg → about ${o.rt} miles round trip; at $0.70/mile that's ${o.cost}.`,
    how: "Round trip = one-way distance × 2 + extra miles, times the number of trips. Cost = total × rate. The IRS business mileage rate was 70¢ per mile for 2025 — enter the current year's rate.",
    assume: `${ROAD}`,
    faq: [["What rate should I use for reimbursement?", "Your employer's rate or the IRS standard mileage rate for the year of travel."]],
  }),
];

runBatch(TRV_DIST, TOOLS);
