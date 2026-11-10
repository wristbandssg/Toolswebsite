// One-time (but safe to re-run) batch setup script: creates 29 calculators in Travel Calculators >
// Taxi & Rideshare Fare Calculators. Tariffs and formulas live in src/lib/calc-engine-trv-taxi.ts;
// examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-travel-category.ts --apply)
//   npx tsx prisma/create-trv-taxi-calculators.ts        (TRV_DRY=1 → check only, no database)
// or
//   npm run db:create-trv-taxi-calculators

import * as E from "../src/lib/calc-engine-trv-taxi";
import { mk, num, money, dd, runBatch, type ToolDef } from "./trv-tool-kit";
import { TRV_TAXI } from "./setup-travel-category";

const C = E.trvTaxiCustomCalculators;
const CHECK = "Tariffs are the regulator's published rates (2025–26), rounded. Traffic, route choice, tolls and surcharges change the real fare — the meter is final. Tipping customs vary by country.";

function city(slug: string, cityName: string, t: E.Tariff, dist: number, faq: [string, string][], opts: { title?: string; time?: number; ap?: number; tip?: number; note?: string } = {}): ToolDef {
  const u = t.unit;
  const inputs: Record<string, unknown>[] = [num("dist", `Trip Distance (${u})`, dist, 0, 1000, 0.1), num("wait", "Minutes Stuck in Slow Traffic / Waiting", 5, 0, 600, 1), dd("time", "Time / Tariff", t.times.map((x) => x[0]), opts.time ?? 0)];
  if (t.airports.length > 1) inputs.push(dd("ap", "Airport Trip", t.airports.map((a) => a[0]), opts.ap ?? 0));
  if (t.extra) inputs.push(num("bags", `${t.extra[0]} (count)`, 0, 0, 10, 1));
  if (t.booking) inputs.push(dd("book", `Booked by Phone / App (+${t.sym}${t.booking})`, ["No (street hail / rank)", "Yes"], 0));
  inputs.push(money("tolls", "Tolls (if any)", 0, t.sym), num("tip", "Tip (%)", opts.tip ?? 0, 0, 50, 1), num("pax", "Passengers Splitting the Fare", 1, 1, 8, 1), money("flag", "Flag Fall Override (0 = official)", 0, t.sym), money("rate", `Rate per ${u} Override (0 = official)`, 0, t.sym));
  return mk({
    slug, title: opts.title ?? `${cityName} Taxi Fare Calculator`,
    desc: `Estimate a ${cityName} taxi fare from the distance, time of day, waiting time and airport surcharges using the official meter tariff — with tip and per-person split.`,
    inputs,
    results: [["total", "Estimated Total Fare", "c", t.cur], ["fare", "Meter / Flat Fare", "c", t.cur], ["extras", "Surcharges, Tolls & Fees", "c", t.cur], ["tip", "Tip", "c", t.cur], ["per", "Per Person", "c", t.cur], ["perUnit", `Cost per ${u}`, "c", t.cur], ["how", "How It's Worked Out", "t"]],
    fn: C[slug], ex: { dist, wait: 5, time: opts.time ?? 0, ap: opts.ap ?? 0, bags: 0, book: 0, tolls: 0, tip: opts.tip ?? 0, pax: 1, flag: 0, rate: 0 },
    exText: (o) => `Example: ${dist} ${u} in ${cityName} with 5 minutes in slow traffic → about ${o.total}.`,
    how: `${cityName} meters start at ${t.sym}${t.flag}${t.incl ? ` (covering the first ${t.incl} ${u})` : ""}, then charge ${t.tiers.map(([up, r], i) => `${t.sym}${r}/${u}${up !== Infinity ? ` up to ${up} ${u}` : i ? " after that" : ""}`).join(", ")} plus about ${t.sym}${t.wait} per minute when stopped or crawling.${t.min ? ` Minimum fare ${t.sym}${t.min}.` : ""}${opts.note ? `\n\n${opts.note}` : ""}`,
    assume: CHECK,
    faq,
  });
}

function rideTool(slug: string, title: string, brand: string, c: E.RideCard, cur = "USD", sym = "$", unit = "mi"): ToolDef {
  return mk({
    slug, title,
    desc: `Estimate a ${brand} fare from distance and time — base fare, per-${unit} and per-minute rates, booking fee, surge pricing, tolls and tip.`,
    inputs: [num("dist", `Trip Distance (${unit})`, 8, 0, 1000, 0.1), num("mins", "Trip Time (min)", 20, 0, 1000, 1), num("surge", "Surge / Demand Multiplier", 1, 1, 10, 0.1), money("tolls", "Tolls", 0, sym), num("tip", "Tip (%)", 15, 0, 50, 1), money("base", "Base Fare", c.base, sym), money("mile", `Rate per ${unit}`, c.mile, sym), money("min", "Rate per Minute", c.min, sym), money("fee", "Booking / Service Fee", c.fee, sym), money("minf", "Minimum Fare", c.minFare, sym)],
    results: [["total", "Estimated Total", "c", cur], ["fare", "Fare Before Tip", "c", cur], ["ride", "Distance & Time Charge", "c", cur], ["fee", "Booking Fee", "c", cur], ["tip", "Tip", "c", cur], ["perUnit", `Cost per ${unit}`, "c", cur], ["how", "Formula", "t"]],
    fn: C[slug], ex: { dist: 8, mins: 20, surge: 1, tolls: 0, tip: 15, base: c.base, mile: c.mile, min: c.min, fee: c.fee, minf: c.minFare },
    exText: (o) => `Example: 8 ${unit}, 20 minutes, no surge, 15% tip → about ${o.total}.`,
    how: `${brand} prices = (base fare + distance × rate + minutes × rate) × surge multiplier + booking fee, with a minimum fare. Rates differ by city and ride type (the defaults are typical standard-ride rates) — the app shows the upfront price before you book.`,
    assume: "Upfront prices also reflect demand, route and time of day, so treat this as an estimate.",
    faq: [[`Why does ${brand} cost more at some times?`, "Surge or demand pricing raises fares when many people request rides."], ["Do drivers get the tip?", "Yes, 100% of in-app tips go to the driver."]],
  });
}

const TOOLS: ToolDef[] = [
  mk({
    slug: "taxi-fare-calculator", title: "Taxi Fare Calculator (Cab Fare Estimate)",
    meta: "Taxi Fare Calculator — Estimate Your Cab Fare",
    desc: "Estimate a taxi or cab fare anywhere — flag fall, rate per km or mile, waiting time, night surcharge, airport fee, minimum fare, tolls and tip.",
    inputs: [num("dist", "Trip Distance (km or miles)", 10, 0, 2000, 0.1), num("wait", "Minutes Waiting / in Slow Traffic", 5, 0, 600, 1), money("flag", "Flag Fall / Starting Fare", 3.5, ""), num("incl", "Distance Included in the Flag", 0, 0, 10, 0.01), money("rate", "Rate per km / mile", 2, ""), money("wpm", "Waiting Rate per Minute", 0.5, ""), money("minf", "Minimum Fare", 0, ""), dd("time", "Time", ["Standard", "Night / weekend surcharge"], 0), num("night", "Night Surcharge (%)", 20, 0, 200, 1), dd("ap", "Airport / Booking Surcharge", ["None", "Yes"], 0), money("airfee", "Airport / Booking Surcharge Amount", 5, ""), money("tolls", "Tolls", 0, ""), num("tip", "Tip (%)", 10, 0, 50, 1), num("pax", "Passengers Splitting", 1, 1, 8, 1)],
    results: [["total", "Estimated Total Fare", "n", 2], ["fare", "Meter Fare", "n", 2], ["extras", "Surcharges & Tolls", "n", 2], ["tip", "Tip", "n", 2], ["per", "Per Person", "n", 2], ["perUnit", "Cost per km / mile", "n", 2], ["how", "How It's Worked Out", "t"]],
    fn: C["taxi-fare-calculator"], ex: { dist: 10, wait: 5, flag: 3.5, incl: 0, rate: 2, wpm: 0.5, minf: 0, time: 0, night: 20, ap: 0, airfee: 5, tolls: 0, tip: 10, pax: 1 },
    exText: (o) => `Example: 10 km at a 3.50 flag and 2.00 per km with 5 minutes waiting and a 10% tip → about ${o.total}.`,
    how: "Fare = flag fall + (distance − included distance) × rate + waiting minutes × waiting rate, × night surcharge, + airport/booking fee and tolls, at least the minimum fare, then the tip. Enter your city's posted tariff (on the taxi window or the regulator's website); amounts are in your local currency.",
    assume: CHECK,
    faq: [["How do I find my city's taxi rates?", "They're usually printed inside the cab and on the city taxi regulator's website."], ["Is a taxi cheaper than Uber?", "Often at night or in surge times; in normal hours rideshare can be cheaper for longer trips."]],
  }),
  city("nyc-taxi-fare-calculator", "NYC", E.NYC, 4, [["How much is a taxi from JFK to Manhattan?", "A $70 flat fare plus the airport fee, surcharges, tolls and tip — usually $90–$100 in total."], ["What are the NYC taxi surcharges?", "$1 improvement and $0.50 MTA surcharges on every trip, $2.50 rush hour (4–8 pm weekdays) or $1 overnight, $2.50 congestion surcharge below 96th Street and $0.75 for the Manhattan congestion zone."]], { title: "NYC Taxi Fare Calculator (New York Yellow Cab)", tip: 20, note: "The meter adds 70¢ per 1/5 mile when moving above 12 mph, or 70¢ per minute in slow traffic. Fixed surcharges are added by time of day; Manhattan congestion surcharges are entered under the extra option." }),
  city("london-taxi-fare-calculator", "London", E.LONDON, 3, [["How much is a black cab across central London?", "Typically £11–£18 for 2 miles and £19–£25 for 4 miles on Tariff 1."], ["Do London cabs take cards?", "Yes — all licensed black cabs must accept card and contactless payments."]], { title: "London Taxi Fare Calculator (Black Cab)", tip: 10, note: "Tariff 2 and 3 apply in the evenings, at weekends and at night; journeys over 6 miles use the higher Tariff 4 rate for the extra distance." }),
  mk({
    slug: "japan-taxi-fare-calculator", title: "Japan Taxi Fare Calculator (Tokyo, Osaka & Kyoto)",
    meta: "Japan Taxi Fare Calculator — Tokyo, Osaka, Kyoto Fares",
    desc: "Estimate taxi fares in Japan — Tokyo, Osaka, Kyoto and other cities — with the late-night 20% surcharge, app booking fees (GO, DiDi, Uber, S.RIDE) and expressway tolls.",
    inputs: [dd("city", "City", E.JAPAN_CITY, 0), num("dist", "Trip Distance (km)", 5, 0, 500, 0.1), num("wait", "Minutes in Slow Traffic", 5, 0, 600, 1), dd("time", "Time", ["Daytime", "Late night 10 pm–5 am (+20%)"], 0), dd("ap", "Airport Flat Fare (Tokyo only)", E.JAPAN[0].airports.map((a) => a[0]), 0), money("app", "App Booking / Pickup Fee", 0, "¥"), money("tolls", "Expressway Tolls", 0, "¥"), num("tip", "Tip (%) — not customary in Japan", 0, 0, 50, 1), num("pax", "Passengers Splitting", 1, 1, 8, 1), money("flag", "Flag Fall Override (0 = official)", 0, "¥"), money("rate", "Rate per km Override (0 = official)", 0, "¥")],
    results: [["total", "Estimated Total Fare", "c", "JPY"], ["fare", "Meter / Flat Fare", "c", "JPY"], ["extras", "App Fee & Tolls", "c", "JPY"], ["tip", "Tip", "c", "JPY"], ["per", "Per Person", "c", "JPY"], ["perUnit", "Cost per km", "c", "JPY"], ["how", "How It's Worked Out", "t"]],
    fn: C["japan-taxi-fare-calculator"], ex: { city: 0, dist: 5, wait: 5, time: 0, ap: 0, app: 0, tolls: 0, tip: 0, pax: 1, flag: 0, rate: 0 },
    exText: (o) => `Example: 5 km in Tokyo by day with 5 minutes in traffic → about ${o.total}.`,
    how: "Tokyo: ¥500 for the first 1.096 km, then ¥100 every 255 m (≈ ¥392/km) and ¥100 per 95 seconds when crawling. Osaka starts at ¥600 for 1.3 km; Kyoto at ¥500 for 1 km. From 10 pm to 5 am fares are 20% higher. Taxi apps (GO, DiDi, Uber, S.RIDE, and Lyft/Bolt/Grab/Ola through partner apps) charge the meter fare plus a booking fee of about ¥0–¥500.",
    assume: CHECK,
    faq: [["Do you tip taxis in Japan?", "No — tipping isn't expected."], ["Can I use Uber in Japan?", "Yes, Uber in Japan books licensed taxis at meter prices plus a booking fee; GO is the biggest local app."]],
  }),
  city("dubai-taxi-fare-calculator", "Dubai", E.DUBAI, 15, [["How much is a taxi from Dubai Airport to Downtown?", "Roughly AED 60–90 including the AED 25 airport flag."], ["Is there a minimum taxi fare in Dubai?", "Yes, AED 12."]], { tip: 0 }),
  city("abu-dhabi-taxi-fare-calculator", "Abu Dhabi", E.ABU_DHABI, 15, [["What's the minimum fare in Abu Dhabi?", "AED 12."]], { tip: 0 }),
  city("hong-kong-taxi-fare-calculator", "Hong Kong", E.HONG_KONG, 8, [["How much is a taxi from Hong Kong Airport to Central?", "About HK$300–HK$400 in a red urban taxi including tolls."], ["Do Hong Kong taxis charge for luggage?", "Yes, HK$6 per piece in the boot."]], { note: "Red urban taxis charge HK$2.10 per 200 m until the meter reaches HK$102.50, then HK$1.40 per 200 m. Green (New Territories) and blue (Lantau) taxis are cheaper. Cross-harbour tunnel tolls are added." }),
  city("singapore-taxi-fare-calculator", "Singapore", E.SINGAPORE, 12, [["What is the Changi Airport taxi surcharge?", "S$6, or S$8 on Friday to Sunday from 5 pm to midnight."], ["Are there peak surcharges?", "Yes — +25% at weekday peaks and +50% from midnight to 6 am."]]),
  city("paris-taxi-fare-calculator", "Paris", E.PARIS, 8, [["How much is a taxi from CDG to Paris?", "A flat €56 to the right bank or €65 to the left bank."], ["Is there a minimum fare?", "Yes, €8."]], { tip: 5, note: "Airport journeys between CDG/Orly and Paris use fixed prices set by law." }),
  city("rome-taxi-fare-calculator", "Rome", E.ROME, 6, [["How much is a taxi from Fiumicino to Rome?", "A flat €55 to anywhere inside the Aurelian Walls."], ["Is there a night supplement?", "Yes — the starting fare rises to €7.50 from 10 pm to 6 am."]]),
  city("barcelona-taxi-fare-calculator", "Barcelona", E.BARCELONA, 7, [["How much is a taxi from Barcelona Airport to the centre?", "Roughly €35–€45 including the €4.50 airport supplement."]]),
  city("dublin-taxi-fare-calculator", "Dublin", E.DUBLIN, 10, [["How much is a taxi from Dublin Airport to the city centre?", "About €30–€40 depending on traffic and the time."]], { tip: 10 }),
  city("istanbul-taxi-fare-calculator", "Istanbul", E.ISTANBUL, 12, [["How much is a taxi in Istanbul?", "Fares change several times a year with inflation; expect the opening fare plus about ₺40 per km in a yellow taxi."], ["Do Istanbul taxis add tolls?", "Yes — Bosphorus bridge and Eurasia Tunnel tolls are added to the fare."]], { note: "Istanbul fares are revised often because of inflation — check the latest UKOME tariff and override the rates if needed." }),
  city("bangkok-taxi-fare-calculator", "Bangkok", E.BANGKOK, 15, [["How much is a taxi from Suvarnabhumi to central Bangkok?", "About ฿300–฿450 on the meter, plus the ฿50 airport surcharge and expressway tolls."]], { note: "Always ask for the meter ('meter, please'); a ฿3 per minute charge applies in very slow traffic." }),
  city("taipei-taxi-fare-calculator", "Taipei", E.TAIPEI, 6, [["Is there a night surcharge in Taipei?", "Yes, NT$20 from 11 pm to 6 am."]]),
  city("mumbai-taxi-fare-calculator", "Mumbai", E.MUMBAI, 8, [["What is the minimum taxi fare in Mumbai?", "₹31 for the first 1.5 km in a black-and-yellow taxi."], ["Is there a night charge?", "Yes, 25% extra from midnight to 5 am."]]),
  city("melbourne-taxi-fare-calculator", "Melbourne", E.MELBOURNE, 15, [["How much is a taxi from Melbourne Airport to the CBD?", "About A$60–A$75 including the airport fee and CityLink tolls."]]),
  city("sydney-taxi-fare-calculator", "Sydney", E.SYDNEY, 12, [["How much is a taxi from Sydney Airport to the CBD?", "Roughly A$50–A$65 including the airport fee and tolls."]]),
  city("toronto-taxi-fare-calculator", "Toronto", E.TORONTO, 10, [["How much is a Toronto taxi per km?", "About C$1.75 per km after the C$4.44 starting fare."]], { tip: 15 }),
  city("chicago-taxi-fare-calculator", "Chicago", E.CHICAGO, 5, [["How much is a taxi from O'Hare to downtown?", "Around $50–$65 plus tip, including the airport departure tax."]], { tip: 15 }),
  city("las-vegas-taxi-fare-calculator", "Las Vegas", E.LAS_VEGAS, 4, [["How much is a taxi from the airport to the Strip?", "Usually $20–$35 depending on the hotel and route."]], { tip: 15 }),
  city("los-angeles-taxi-fare-calculator", "Los Angeles", E.LOS_ANGELES, 8, [["Is there a flat fare from LAX?", "Yes, LAX ↔ Downtown LA has a flat fare plus the airport fee."]], { tip: 15 }),
  city("boston-taxi-fare-calculator", "Boston", E.BOSTON, 4, [["How much is a taxi from Logan to downtown Boston?", "About $25–$35 including the airport fee and tunnel toll."]], { tip: 15 }),
  rideTool("uber-fare-calculator", "Uber Fare Calculator (Uber Price Estimate)", "Uber", E.UBER),
  rideTool("lyft-fare-calculator", "Lyft Fare Calculator (Lyft Price Estimate)", "Lyft", E.LYFT),
  rideTool("grab-fare-calculator-malaysia", "Grab Fare Calculator Malaysia", "Grab (GrabCar Economy)", E.GRAB, "MYR", "RM", "km"),
  mk({
    slug: "uber-vs-lyft-price-calculator", title: "Uber vs Lyft Price Calculator",
    desc: "Compare Uber and Lyft prices for the same trip — base fare, per-mile and per-minute rates, booking fees and surge — and see which is cheaper.",
    inputs: [num("dist", "Trip Distance (mi)", 8, 0, 1000, 0.1), num("mins", "Trip Time (min)", 20, 0, 1000, 1), num("surge", "Surge Multiplier (both)", 1, 1, 10, 0.1), num("tip", "Tip (%)", 0, 0, 50, 1), money("ubase", "Uber Base Fare", E.UBER.base), money("umile", "Uber per Mile", E.UBER.mile), money("umin", "Uber per Minute", E.UBER.min), money("ufee", "Uber Booking Fee", E.UBER.fee), money("uminf", "Uber Minimum Fare", E.UBER.minFare), money("lbase", "Lyft Base Fare", E.LYFT.base), money("lmile", "Lyft per Mile", E.LYFT.mile), money("lmin", "Lyft per Minute", E.LYFT.min), money("lfee", "Lyft Service Fee", E.LYFT.fee), money("lminf", "Lyft Minimum Fare", E.LYFT.minFare)],
    results: [["cheaper", "Cheaper Option", "t"], ["uber", "Uber Estimate", "c"], ["lyft", "Lyft Estimate", "c"], ["diff", "Difference", "c"], ["detail", "Details", "t"]],
    fn: C["uber-vs-lyft-price-calculator"], ex: { dist: 8, mins: 20, surge: 1, tip: 0, ubase: E.UBER.base, umile: E.UBER.mile, umin: E.UBER.min, ufee: E.UBER.fee, uminf: E.UBER.minFare, lbase: E.LYFT.base, lmile: E.LYFT.mile, lmin: E.LYFT.min, lfee: E.LYFT.fee, lminf: E.LYFT.minFare },
    exText: (o) => `Example: 8 miles, 20 minutes → ${o.cheaper} (Uber ${o.uber}, Lyft ${o.lyft}).`,
    how: "Each fare = (base + miles × rate + minutes × rate) × surge + fee, at least the minimum. Enter the rate cards for your city (both apps publish them in their help pages) for the best comparison.",
    assume: "Upfront prices in the apps can differ from rate-card estimates — compare both apps before booking.",
    faq: [["Is Lyft usually cheaper than Uber?", "It depends on the city and the hour — surge timing differs, so checking both often saves 10–20%."]],
  }),
  mk({
    slug: "uber-driver-earnings-calculator", title: "Uber Driver Earnings Calculator (Hourly Pay After Costs)",
    desc: "Calculate what you really earn driving for Uber or Lyft — payout after the platform fee, plus tips, minus fuel and wear — per hour and per mile.",
    inputs: [money("gross", "Gross Fares Charged to Riders (week)", 1200), num("fee", "Platform Share Kept by Uber/Lyft (%)", 25, 0, 80, 0.5), money("tips", "Tips (week)", 120), money("bonus", "Bonuses / Quests (week)", 0), num("miles", "Miles Driven Incl. Dead Miles (week)", 600, 0, 10000, 1), num("hrs", "Hours Online (week)", 35, 0.1, 168, 0.5), num("mpg", "Fuel Economy (mpg)", 30, 1, 200, 0.5), money("gas", "Fuel Price per Gallon", 3.4), money("cpm", "Maintenance & Depreciation per Mile", 0.12), money("other", "Other Costs (week: phone, car wash, insurance extra)", 0)],
    results: [["hour", "Net Earnings per Hour", "c"], ["net", "Net Earnings (week)", "c"], ["payout", "Payout From the App", "c"], ["costs", "Vehicle Costs", "c"], ["mile", "Net per Mile", "c"], ["irs", "IRS Mileage Deduction (70¢/mi)", "c"], ["tax", "Tax Note", "t"]],
    fn: C["uber-driver-earnings-calculator"], ex: { gross: 1200, fee: 25, tips: 120, bonus: 0, miles: 600, hrs: 35, mpg: 30, gas: 3.4, cpm: 0.12, other: 0 },
    exText: (o) => `Example: $1,200 in fares, 25% platform share, $120 tips, 600 miles in 35 hours → ${o.hour} per hour after costs.`,
    how: "Payout = fares × (1 − platform share) + tips + bonuses. Net = payout − fuel (miles ÷ mpg × price) − maintenance/depreciation per mile − other costs. Hourly = net ÷ hours online (waiting time counts).",
    assume: "Platform share varies trip by trip; check your weekly statement for the real figure.",
    faq: [["How much do Uber drivers make per hour?", "Often $15–$25 per hour after vehicle costs in US cities, before tax."]],
  }),
  mk({
    slug: "uber-vs-owning-a-car-calculator", title: "Uber vs Owning a Car Calculator",
    desc: "Compare the monthly cost of using Uber or Lyft with owning a car — loan, insurance, fuel, parking, maintenance and depreciation — and the break-even number of rides.",
    inputs: [num("rides", "Rides per Month", 40, 0, 1000, 1), money("fare", "Average Fare incl. Tip", 18), money("other", "Other Transport (transit, rentals) per Month", 0), money("pay", "Car Payment / Lease", 450), money("ins", "Insurance per Month", 160), money("fuel", "Fuel per Month", 150), money("park", "Parking per Month", 50), money("maint", "Maintenance & Repairs per Month", 80), money("dep", "Depreciation per Month", 200), money("reg", "Registration & Taxes per Month", 15)],
    results: [["verdict", "Verdict", "t"], ["ride", "Rideshare Cost per Month", "c"], ["car", "Car Cost per Month", "c"], ["year", "Yearly Difference", "c"], ["breakeven", "Break-Even Rides per Month", "n", 0]],
    fn: C["uber-vs-owning-a-car-calculator"], ex: { rides: 40, fare: 18, other: 0, pay: 450, ins: 160, fuel: 150, park: 50, maint: 80, dep: 200, reg: 15 },
    exText: (o) => `Example: 40 rides a month at $18 vs a car costing about $1,105 a month → ${o.verdict}.`,
    how: "Rideshare cost = rides × average fare + other transport. Car cost = payment + insurance + fuel + parking + maintenance + depreciation + registration. Break-even rides = car cost ÷ average fare.",
    assume: "Leave depreciation in even if the car is paid off — it's a real cost of owning.",
    faq: [["When is going car-free cheaper?", "Usually when you take fewer than about 50–70 rides a month in a city with good transit."]],
  }),
];

runBatch(TRV_TAXI, TOOLS);
