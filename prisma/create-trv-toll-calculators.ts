// One-time (but safe to re-run) batch setup script: creates 22 calculators in Travel Calculators >
// Toll Calculators. Formulas and average rates live in src/lib/calc-engine-trv-toll.ts; examples
// are computed from the engine.
//
// HOW TO RUN (after prisma/setup-travel-category.ts --apply)
//   npx tsx prisma/create-trv-toll-calculators.ts        (TRV_DRY=1 → check only, no database)
// or
//   npm run db:create-trv-toll-calculators

import * as E from "../src/lib/calc-engine-trv-toll";
import { mk, num, money, dd, runBatch, type ToolDef } from "./trv-tool-kit";
import { TRV_TOLL } from "./setup-travel-category";

const C = E.trvTollCustomCalculators;
const CHECK = "Average per-mile rates from the operator's 2026 toll schedule, rounded. Exact tolls depend on your entry and exit points, time of day and vehicle — confirm with the operator's official toll calculator before you travel. Rates usually rise each January.";
const RT = dd("rt", "Trip", ["One way", "Round trip"], 0);
const RESULTS = (cur: string): [string, string, "c" | "t", string?][] => [["one", "Toll for This Trip", "c", cur], ["each", "One-Way Toll", "c", cur], ["month", "Monthly Toll Cost", "c", cur], ["save", "Saving With the Cheapest Payment Method", "c", cur], ["rate", "Rate Used", "t"]];

function road(slug: string, title: string, name: string, p: E.MileRoad, dist: number, faq: [string, string][], note = ""): ToolDef {
  const classes = p.classes ?? E.CLASSES;
  return mk({
    slug, title,
    desc: `Estimate ${name} tolls by distance, payment method (${p.methods.map((m) => m[0]).join(" vs ")}) and vehicle class — one way, round trip and monthly commuting cost.`,
    inputs: [num("dist", `Distance on the ${name} (${p.unit})`, dist, 0, 5000, 0.1), dd("method", "Payment Method", p.methods.map(([n, r]) => `${n} (~${p.sym}${r}/${p.unit})`), 0), dd("cls", "Vehicle", classes.map((c) => c[0]), 0), money("rate", `Your Rate per ${p.unit} (0 = average)`, 0, p.sym), RT, num("trips", "Trips per Month (for commuting cost)", 0, 0, 200, 1)],
    results: RESULTS(p.cur),
    fn: C[slug], ex: { dist, method: 0, cls: 0, rate: 0, rt: 0, trips: 0 },
    exText: (o) => `Example: ${dist} ${p.unit} by car with ${p.methods[0][0]} → about ${o.each} one way.`,
    how: `Toll ≈ distance × the average rate per ${p.unit} for your payment method × the vehicle-class multiplier. The full ${name} is about ${p.full} ${p.unit} long.${note ? `\n\n${note}` : ""}`,
    assume: CHECK,
    faq,
  });
}
function plaza(slug: string, title: string, name: string, p: E.PlazaRoad, ex: number[], faq: [string, string][], note = ""): ToolDef {
  return mk({
    slug, title,
    desc: `Calculate ${name} tolls from the toll plazas or crossings on your trip — E-ZPass versus pay-by-plate — for one way, round trip and monthly.`,
    inputs: [...p.plazas.map(([n, ez, pl], i) => num(`p${i}`, `${n} (E-ZPass ${p.sym}${ez} / plate ${p.sym}${pl})`, ex[i] ?? 0, 0, 50, 1)), dd("method", "Payment", ["E-ZPass", "Pay by plate / toll by mail"], 0), dd("cls", "Vehicle", E.CLASSES.map((c) => c[0]), 0), RT, num("trips", "Trips per Month", 0, 0, 200, 1)],
    results: RESULTS(p.cur),
    fn: C[slug], ex: { ...Object.fromEntries(p.plazas.map((_, i) => [`p${i}`, ex[i] ?? 0])), method: 0, cls: 0, rt: 0, trips: 0 },
    exText: (o) => `Example: the plazas shown with E-ZPass by car → ${o.each} one way.`,
    how: `${name} charges a fixed toll at each plaza or crossing you pass. Enter how many of each you go through; trucks and trailers pay more by axle.${note ? `\n\n${note}` : ""}`,
    assume: CHECK,
    faq,
  });
}

const TOOLS: ToolDef[] = [
  road("pa-turnpike-toll-calculator", "PA Turnpike Toll Calculator (Pennsylvania Turnpike)", "PA Turnpike", E.PA, 100, [["Is the PA Turnpike cashless?", "Yes — it's all-electronic: E-ZPass or Toll By Plate, which costs about twice as much."], ["How much is the PA Turnpike end to end?", "Roughly $45–$50 by car with E-ZPass for the ~360 miles from Ohio to New Jersey."]]),
  road("nj-turnpike-toll-calculator", "NJ Turnpike Toll Calculator (New Jersey Turnpike)", "New Jersey Turnpike", E.NJTP, 60, [["Are NJ Turnpike tolls higher at peak times?", "Yes — E-ZPass peak rates (weekday rush hours and weekends) are slightly higher than off-peak."], ["How much is the NJ Turnpike from end to end?", "About $19–$25 by car for the 117 miles depending on payment and time."]]),
  road("ny-thruway-toll-calculator", "NY Thruway Toll Calculator (New York State Thruway)", "New York State Thruway", E.NYT, 150, [["Is the NY Thruway cashless?", "Yes. NY E-ZPass is cheapest; non-NY E-ZPass costs about 50% more and Tolls by Mail about double."], ["Are bridges included?", "The Mario Cuomo Bridge and MTA crossings are tolled separately."]]),
  road("ohio-turnpike-toll-calculator", "Ohio Turnpike Toll Calculator", "Ohio Turnpike", E.OHIO, 100, [["How much is the Ohio Turnpike end to end?", "About $16–$17 by car with E-ZPass for 241 miles."]]),
  road("mass-pike-toll-calculator", "Mass Pike Toll Calculator (Massachusetts Turnpike)", "Mass Pike (I-90)", E.MASS, 60, [["Is the Mass Pike all-electronic?", "Yes — E-ZPass or Pay By Plate MA bills; plate billing costs more."], ["Are Boston tunnels extra?", "The Ted Williams and Sumner/Callahan tunnels and Tobin Bridge add separate tolls."]]),
  road("illinois-tollway-calculator", "Illinois Tollway Calculator (I-PASS Tolls)", "Illinois Tollway", E.ILL, 40, [["What happens if I don't have I-PASS?", "Pay By Plate online within 14 days at roughly double the I-PASS rate, or get an invoice with fees."]], "Illinois charges at plazas and ramps; the per-mile figure averages those tolls."),
  road("indiana-toll-road-calculator", "Indiana Toll Road Calculator", "Indiana Toll Road", E.IND, 156, [["How much is the Indiana Toll Road end to end?", "About $12 by car with E-ZPass for 156 miles; cash/video is higher."]]),
  road("florida-toll-calculator", "Florida Toll Calculator (SunPass & Florida's Turnpike)", "Florida's Turnpike and toll roads", E.FLA, 100, [["Does E-ZPass work in Florida?", "Yes, E-ZPass and E-PASS work on Florida toll roads, including Orlando's expressways."], ["Is Toll-By-Plate more expensive?", "Yes — around 25–40% more plus an admin fee per invoice."]]),
  road("texas-toll-calculator", "Texas Toll Calculator (NTTA, HCTRA & TxTag)", "Texas toll roads", E.TEX, 20, [["Is ZipCash more expensive?", "Yes — NTTA ZipCash is about 50% higher than TollTag rates."], ["Do TxTag, TollTag and EZ TAG work across Texas?", "Yes, they're interoperable on all Texas toll roads (and Oklahoma and Kansas)."]], "Choose your region as the payment method — Dallas–Fort Worth (NTTA), Houston (HCTRA) or Austin/statewide (TxTag)."),
  road("kansas-turnpike-toll-calculator", "Kansas Turnpike Toll Calculator", "Kansas Turnpike", E.KAN, 100, [["Is the Kansas Turnpike cashless?", "Yes, since 2023 — drivers without a tag are billed by plate at about double the rate."]]),
  road("oklahoma-toll-calculator", "Oklahoma Toll Calculator (PikePass & PlatePay)", "Oklahoma turnpikes", E.OKL, 50, [["What is PlatePay?", "Oklahoma's cashless plate billing; it costs about twice the PikePass rate."]]),
  road("maine-turnpike-toll-calculator", "Maine Turnpike Toll Calculator", "Maine Turnpike", E.MAINE, 60, [["Where are the Maine Turnpike tolls?", "Mainline plazas at York, New Gloucester and Gardiner plus ramp tolls; the per-mile figure averages them."]]),
  road("france-toll-calculator", "France Toll Calculator (French Autoroute Tolls)", "French autoroutes", E.FRANCE, 465, [["How much are tolls from Paris to Nice?", "About €80–€95 by car for roughly 930 km of autoroute."], ["Do I need a toll tag in France?", "No — barriers take cards; a badge (Bip&Go, Ulys) just saves time, and some new free-flow sections bill by plate."]], "Distances in km. Paris–Lyon is about 465 km of autoroute."),
  road("italy-toll-calculator", "Italy Toll Calculator (Autostrade Tolls)", "Italian autostrade", E.ITALY, 570, [["How much is Rome to Milan by autostrada?", "Around €45–€50 by car for about 570 km."], ["Can I pay Italian tolls by card?", "Yes — the 'Carte' lanes take bank cards; Telepass lanes are for tag holders."]], "Distances in km."),
  mk({
    slug: "407-etr-toll-calculator", title: "407 ETR Toll Calculator (Highway 407 Toronto)",
    desc: "Estimate 407 ETR tolls in Toronto by km, time of day and vehicle — with the trip toll charge, camera charge without a transponder and monthly commuting cost.",
    inputs: [num("dist", "Distance on the 407 ETR (km)", 30, 0, 151, 0.1), dd("time", "Time of Travel", E.E407_TIME, 1), dd("cls", "Vehicle", ["Light vehicle (car, SUV, pickup)", "Heavy single-unit truck", "Heavy multiple-unit truck"], 0), dd("tag", "Transponder", ["No — billed by camera", "Yes"], 1), money("rate", "Your Rate per km (0 = average)", 0, "C$"), RT, num("trips", "Trips per Month", 0, 0, 200, 1)],
    results: RESULTS("CAD"),
    fn: C["407-etr-toll-calculator"], ex: { dist: 30, time: 1, cls: 0, tag: 1, rate: 0, rt: 0, trips: 0 },
    exText: (o) => `Example: 30 km mid-day with a transponder → about ${o.each}.`,
    how: "407 ETR charges per km by zone, direction and time (peak, mid-peak, off-peak), plus a trip toll charge. Without a transponder a camera charge is added to each trip. Heavy vehicles pay double or triple.",
    assume: CHECK,
    faq: [["Is the 407 ETR worth it?", "For a 30 km rush-hour trip it can save 20–40 minutes; compare toll ÷ minutes saved."], ["What's Highway 407 East?", "The eastern extension (Brock Rd to Hwy 35/115) is provincially owned with lower tolls."]],
  }),
  plaza("garden-state-parkway-toll-calculator", "Garden State Parkway Toll Calculator", "Garden State Parkway", E.GSP, [3, 1], [["Does the Garden State Parkway take cash?", "The Parkway is converting to all-electronic tolling; drivers without E-ZPass are billed by mail."]]),
  plaza("atlantic-city-expressway-toll-calculator", "Atlantic City Expressway Toll Calculator", "Atlantic City Expressway", E.ACE, [1, 1, 0], [["How much is the toll to Atlantic City?", "About $5–$6 by car through both mainline plazas with E-ZPass."]]),
  plaza("maryland-toll-calculator", "Maryland Toll Calculator (Bay Bridge, I-95 & Tunnels)", "Maryland toll facilities", E.MD, [1, 0, 1, 0, 0, 0, 0], [["Is the Bay Bridge toll each way?", "No — it's collected eastbound only."], ["Is Video Tolling more expensive?", "Yes — Video Tolling costs roughly 50% more than E-ZPass Maryland."]], "Enter the number of times you pass each facility (most are tolled in one direction only). ICC / MD 200: enter miles in that line."),
  plaza("new-hampshire-toll-calculator", "New Hampshire Toll Calculator", "New Hampshire turnpikes", E.NH, [1, 1, 0, 0, 0], [["Do NH E-ZPass holders get a discount?", "Yes — NH-issued E-ZPass gets a 30% discount at NH plazas."]]),
  mk({
    slug: "europe-toll-calculator", title: "Europe Toll & Vignette Calculator (Road Trip Tolls)",
    desc: "Estimate motorway tolls and vignette costs for a European road trip across up to four countries — per-km tolls in France, Italy and Spain plus vignettes in Austria, Switzerland and more.",
    inputs: [dd("veh", "Vehicle", ["Car", "Van / car + trailer / motorhome", "Motorcycle"], 0), num("days", "Days in Each Vignette Country (max)", 7, 1, 365, 1), ...[1, 2, 3, 4].flatMap((i) => [dd(`c${i}`, `Country ${i}`, E.EU_COUNTRIES, [1, 10, 9, 0][i - 1]), num(`k${i}`, `Motorway km in Country ${i}`, [700, 300, 250, 0][i - 1], 0, 10000, 1)]), money("extra", "Bridges, Tunnels & Ferries (e.g. Mont Blanc, Øresund)", 0, "€")],
    results: [["total", "Total Tolls & Vignettes", "c", "EUR"], ["toll", "Distance Tolls", "c", "EUR"], ["vig", "Vignettes", "c", "EUR"], ["extra", "Bridges & Tunnels", "c", "EUR"], ["detail", "By Country", "t"]],
    fn: C["europe-toll-calculator"], ex: { veh: 0, days: 7, c1: 1, k1: 700, c2: 10, k2: 300, c3: 9, k3: 250, c4: 0, k4: 0, extra: 0 },
    exText: (o) => `Example: 700 km in France, then Switzerland and Austria for a week → ${o.total} (${o.detail}).`,
    how: "Per-km countries: km × average car rate (France €0.095, Italy €0.085, Spain and Portugal €0.10, Croatia €0.08, Greece €0.07, Poland €0.05, Norway €0.10). Vignette countries: the cheapest vignette that covers your stay (10-day, 1-month or annual). Germany, Belgium, the Netherlands and Luxembourg have no car motorway tolls.",
    assume: "Vignette prices are 2026 approximations; Switzerland only sells an annual vignette. Buy vignettes from the official e-vignette sites.",
    faq: [["Do I need a vignette in Austria?", "Yes, on motorways and expressways — 1-day, 10-day, 2-month and annual digital vignettes are sold online."], ["Is there a toll in Germany?", "No for cars — only trucks pay the Maut."]],
  }),
  mk({
    slug: "e-zpass-toll-calculator", title: "E-ZPass Toll Calculator (E-ZPass vs Toll by Plate Savings)",
    desc: "Compare E-ZPass and toll-by-plate costs for your regular trips — monthly and yearly savings, the discount and whether an E-ZPass is worth it.",
    inputs: [money("ez", "E-ZPass Toll per Trip", 4.5), money("plate", "Toll-by-Plate / Mail Toll per Trip", 7.5), num("trips", "Toll Trips per Month", 40, 1, 500, 1), money("fee", "E-ZPass Monthly Account Fee", 1), num("disc", "Extra Commuter / Resident Discount (%)", 0, 0, 100, 1)],
    results: [["save", "Yearly Saving With E-ZPass", "c"], ["ezm", "Monthly Cost With E-ZPass", "c"], ["plm", "Monthly Cost by Plate", "c"], ["month", "Monthly Saving", "c"], ["pct", "E-ZPass Discount (%)", "n", 1], ["verdict", "Verdict", "t"]],
    fn: C["e-zpass-toll-calculator"], ex: { ez: 4.5, plate: 7.5, trips: 40, fee: 1, disc: 0 },
    exText: (o) => `Example: 40 trips a month at $4.50 with E-ZPass vs $7.50 by plate → save ${o.save} a year.`,
    how: "Monthly cost = toll per trip × trips (+ account fee for E-ZPass). E-ZPass works in 19 states; plate billing is typically 30–100% more expensive, and some agencies add invoice fees.",
    assume: "Use the tolls for your own road; many states also offer commuter or resident plans.",
    faq: [["Which states take E-ZPass?", "Most of the Northeast and Midwest plus Florida, North Carolina, Virginia, West Virginia, Kentucky and Minnesota."]],
  }),
  mk({
    slug: "virginia-i-66-toll-calculator", title: "Virginia I-66 Toll Calculator (Express Lanes)",
    desc: "Estimate I-66 Express Lanes costs in Northern Virginia — dynamic posted tolls, HOV-3 free travel with E-ZPass Flex, monthly cost and price per minute saved.",
    inputs: [money("toll", "Posted Toll per Trip", 8.5), num("trips", "Trips per Month", 20, 0, 200, 1), dd("hov", "Occupancy", ["Solo", "HOV-2", "HOV-3+ with E-ZPass Flex (free)"], 0), dd("tag", "Payment", ["E-ZPass", "Pay by plate"], 0), money("admin", "Pay-by-Plate Fee per Trip", 1.5), num("mins", "Minutes Saved per Trip", 15, 0, 300, 1)],
    results: [["each", "Cost per Trip", "c"], ["month", "Monthly Cost", "c"], ["year", "Yearly Cost", "c"], ["perMin", "Cost per Minute Saved", "c"], ["note", "Note", "t"]],
    fn: C["virginia-i-66-toll-calculator"], ex: { toll: 8.5, trips: 20, hov: 0, tag: 0, admin: 1.5, mins: 15 },
    exText: (o) => `Example: $8.50 posted toll, 20 trips a month solo → ${o.month} a month.`,
    how: "I-66 Inside and Outside the Beltway use dynamic tolls that change with traffic; the price shown at the entrance is locked in for your trip. HOV-3+ vehicles with an E-ZPass Flex in HOV mode ride free.",
    assume: "Peak tolls can exceed $40 on the worst days; check posted prices.",
    faq: [["When is I-66 tolled inside the Beltway?", "Weekday rush hours eastbound in the morning and westbound in the evening."]],
  }),
];

runBatch(TRV_TOLL, TOOLS);
