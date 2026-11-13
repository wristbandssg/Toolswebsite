// One-time (but safe to re-run) batch setup script: creates the 26 technical tools from the vehicle
// keyword check (13 Nov 2026 — Claude outputs/Vehicle_Build_Plan.json) in their existing
// sub-categories (Sports > Motorsports / Cycling / Other, Shopping > Vehicle, Business & Industrial
// > Freight, Science > Mechanical & Structural, Arts > Tarot, Astrology & Fun). Formulas live in
// src/lib/calc-engine-veh-tech.ts; examples are computed from the engine. All tools are Published.
//
// HOW TO RUN
//   npx tsx prisma/create-veh-tech-calculators.ts        (VEH_DRY=1 → check only, no database)
// or
//   npm run db:create-veh-tech-calculators

import * as E from "../src/lib/calc-engine-veh-tech";
import { mk, num, money, dd, tx, date, T, upsertTools, type ToolDef } from "./trv-tool-kit";
import { money as money$, nfmt } from "../src/lib/trv-core";

const C = E.vehTechCustomCalculators;
const nf = (x: unknown, dp = 0) => nfmt(Number(x), dp);
const usd = (x: unknown) => money$(Number(x), "$", Number.isInteger(Number(x)) ? 0 : 2);
const ENG = "Rules of thumb and textbook formulas — real engines, cams and fuels vary. Use the result as a starting point and confirm with measurements, a dyno or a professional builder.";

const MOTOR: ToolDef[] = [
  mk({
    slug: "dynamic-compression-ratio-calculator", title: "Dynamic Compression Ratio Calculator",
    meta: "Dynamic Compression Ratio Calculator — DCR From Intake Closing",
    desc: "Calculate dynamic compression ratio from bore, stroke, rod length, static compression and the intake valve closing point — plus estimated cranking pressure and a pump-gas check.",
    inputs: [num("bore", "Bore (in)", 4.03, 1, 8, 0.001), num("stroke", "Stroke (in)", 3.48, 1, 8, 0.001), num("rod", "Rod Length (in)", 5.7, 2, 12, 0.001), num("scr", "Static Compression Ratio (:1)", 10, 6, 20, 0.01), num("ivc", "Intake Closing (° ABDC at 0.050\" or advertised)", 65, 0, 120, 0.5), num("adv", "Cam Installed Advance (°, + = advanced)", 0, -10, 10, 0.5), num("alt", "Altitude (ft)", 0, 0, 15000, 100)],
    results: [["dcr", "Dynamic Compression Ratio (:1)", "n", 2], ["verdict", "Pump-Gas Check", "t"], ["psi", "Estimated Cranking Pressure (psi)", "n", 0], ["eff", "Effective Stroke (in)", "n", 3], ["pct", "Effective Stroke (% of stroke)", "n", 1], ["close", "Intake Closes (° BTDC)", "n", 1]],
    fn: C["dynamic-compression-ratio-calculator"], ex: { bore: 4.03, stroke: 3.48, rod: 5.7, scr: 10, ivc: 65, adv: 0, alt: 0 },
    exText: (o) => `Example: a 4.030" × 3.48" small-block with 5.7" rods, 10:1 static compression and intake closing at 65° ABDC → a dynamic ratio of ${o.dcr}:1 (about ${o.psi} psi cranking).`,
    how: "The piston doesn't start compressing until the intake valve closes, so the real (dynamic) compression ratio uses only the stroke left after that point. Enter the intake closing angle from the cam card — the advertised (seat-to-seat) figure plus about 15° is a common way to use 0.050\" timing.\n\nFor pump gas, 7.5–8.5:1 dynamic is the usual target with iron heads (up to ~8.8 with aluminum heads).",
    assume: `Piston position uses exact slider-crank geometry. Cranking pressure ≈ atmospheric × DCR^1.2 (polytropic), less atmospheric. ${ENG}`,
    faq: [["What is a good dynamic compression ratio?", "About 7.5:1 to 8.5:1 for 91–93 octane pump gas; race fuel allows more."], ["Why is dynamic compression lower than static?", "Because the cylinder can't build pressure until the intake valve closes, partway up the compression stroke."]],
  }),
  mk({
    slug: "carburetor-jet-size-calculator", title: "Carburetor Jet Size Calculator (Altitude & Temperature)",
    meta: "Carburetor Jetting Calculator — Rejet for Altitude & Temperature",
    desc: "Work out the main jet size after a change in altitude or temperature — Holley jet numbers or Mikuni/Keihin sizes — from the change in air density.",
    inputs: [dd("type", "Carburetor / Jet Type", ["Holley (jet numbers)", "Mikuni / Keihin (flow-numbered jets)"], 0), num("jet", "Current Main Jet", 72, 1, 1000, 0.5), num("alt0", "Altitude Where It Was Jetted (ft)", 0, 0, 15000, 100), num("t0", "Temperature Then (°F)", 70, -40, 130, 1), num("alt1", "New Altitude (ft)", 5000, 0, 15000, 100), num("t1", "New Temperature (°F)", 70, -40, 130, 1)],
    results: [["jet", "Suggested Main Jet", "n", 1], ["change", "Change", "n", 1], ["flow", "Fuel Flow Change Needed (%)", "n", 1], ["density", "Air Density vs Before (%)", "n", 1], ["how", "Rule Used", "t"]],
    fn: C["carburetor-jet-size-calculator"], ex: { type: 0, jet: 72, alt0: 0, t0: 70, alt1: 5000, t1: 70 },
    exText: (o) => `Example: a Holley jetted with #72s at sea level, taken to 5,000 ft → about #${o.jet} (${o.change} jet sizes; fuel flow ${o.flow}%).`,
    how: "Thinner air (higher, hotter) needs less fuel to keep the same air-fuel ratio. Fuel flow through a jet scales with the square root of air density, so the jet area should change by √(new density ÷ old density).\n\nHolley's rule of thumb is about one jet number leaner per 2,000 ft of climb; check plugs or a wideband after any change.",
    assume: `Air density from the standard-atmosphere pressure and absolute temperature (humidity ignored). Holley jets change flow by roughly 3% per number in the common range. ${ENG}`,
    faq: [["How much do you jet down for altitude?", "About one Holley jet number (or 2–3% smaller on flow-rated jets) per 2,000 ft."], ["Does cold weather need bigger jets?", "Yes — cold air is denser, so it needs a slightly richer jet."]],
  }),
  mk({
    slug: "valve-shim-calculator", title: "Valve Shim Calculator",
    desc: "Calculate the new valve shim thickness from your measured valve clearance, the spec range and the current shim — for shim-under-bucket and shim-over-bucket engines.",
    inputs: [num("meas", "Measured Clearance (mm)", 0.15, 0, 2, 0.001), num("lo", "Spec Clearance Minimum (mm)", 0.2, 0, 2, 0.001), num("hi", "Spec Clearance Maximum (mm)", 0.25, 0, 2, 0.001), num("cur", "Current Shim Thickness (mm)", 2.5, 0.5, 6, 0.005), num("step", "Shim Sizes Come in Steps of (mm)", 0.025, 0.005, 0.1, 0.005)],
    results: [["shim", "New Shim Thickness (mm)", "n", 3], ["status", "Clearance", "t"], ["ideal", "Exact Shim for Mid-Spec (mm)", "n", 3], ["after", "Clearance With the New Shim (mm)", "n", 3], ["diff", "Change in Shim (mm)", "n", 3]],
    fn: C["valve-shim-calculator"], ex: { meas: 0.15, lo: 0.2, hi: 0.25, cur: 2.5, step: 0.025 },
    exText: (o) => `Example: 0.15 mm measured with a 0.20–0.25 mm spec and a 2.500 mm shim → fit a ${o.shim} mm shim (about ${o.after} mm clearance).`,
    how: "New shim = current shim + (measured clearance − target clearance). The calculator aims for the middle of the spec and rounds to the shim steps you can buy.\n\nMeasure with the engine cold and the cam lobe pointing away from the bucket.",
    assume: "Clearance and shim thickness change one-for-one. Shim kits usually come in 0.025 mm or 0.05 mm steps; motorcycle shims are often 0.025 mm.",
    faq: [["How do I calculate the valve shim size?", "Add the measured clearance to the old shim and subtract the clearance you want."], ["What happens if valve clearance is too tight?", "The valve may not seal fully, burning the valve and seat — tight clearances get tighter as valves wear."]],
  }),
  mk({
    slug: "crawl-ratio-calculator", title: "Crawl Ratio Calculator",
    desc: "Calculate your 4x4's crawl ratio — first gear × transfer case low range × axle ratio — and how slowly it crawls at idle on your tire size.",
    inputs: [num("first", "First Gear Ratio", 4.17, 1, 10, 0.01), num("tc", "Transfer Case Low Range", 2.72, 1, 6, 0.01), num("axle", "Axle Ratio", 4.1, 2, 7, 0.01), num("conv", "Torque Converter Multiplication (1 = manual)", 1, 1, 3, 0.05), num("tire", "Tire Diameter (in)", 33, 20, 54, 0.5), num("rpm", "Idle / Crawl RPM", 700, 400, 3000, 50)],
    results: [["cr", "Crawl Ratio (:1)", "n", 1], ["verdict", "Rating", "t"], ["mph", "Crawl Speed at That RPM (mph)", "n", 2], ["kmh", "Crawl Speed (km/h)", "n", 2], ["torque", "Approx. Torque Multiplication at the Wheels (×)", "n", 1]],
    fn: C["crawl-ratio-calculator"], ex: { first: 4.17, tc: 2.72, axle: 4.1, conv: 1, tire: 33, rpm: 700 },
    exText: (o) => `Example: 4.17 first gear, 2.72 low range and 4.10 axles → a ${o.cr}:1 crawl ratio, about ${o.mph} mph at 700 rpm on 33" tires.`,
    how: "Multiply the first-gear ratio, the transfer case low-range ratio and the axle ratio. Bigger tires lower the effective gearing, so many owners regear the axles after a tire upgrade.\n\nAutomatics gain extra multiplication from the torque converter at stall (about 2:1); enter it for a stall-condition figure.",
    assume: "Crawl speed = rpm × tire circumference ÷ crawl ratio. Torque multiplication assumes ~85% drivetrain efficiency.",
    faq: [["What is a good crawl ratio?", "40:1 to 60:1 for trail rigs, 60:1 to 100:1 for serious rock crawlers."], ["How do I increase my crawl ratio?", "Lower (numerically higher) axle gears, a lower transfer case range or a gearbox with a deeper first gear."]],
  }),
  mk({
    slug: "driveline-angle-calculator", title: "Driveline & Pinion Angle Calculator",
    meta: "Driveshaft & Pinion Angle Calculator — U-Joint Working Angles",
    desc: "Check driveshaft and pinion angles: calculate the U-joint working angles for a single-cardan or double-cardan (CV) driveshaft and see whether they cancel to avoid vibration.",
    inputs: [dd("type", "Driveshaft Type", ["Single cardan (U-joint each end)", "Double cardan / CV at the transmission"], 0), num("trans", "Transmission Output Angle (° down at the rear)", 3, -15, 15, 0.1), num("shaft", "Driveshaft Angle (° down at the rear)", 5, -20, 30, 0.1), num("pinion", "Pinion Angle (° up at the front)", 3, -15, 20, 0.1)],
    results: [["verdict", "Result", "t"], ["front", "Front Working Angle (°)", "n", 1], ["rear", "Rear Working Angle (°)", "n", 1], ["cancel", "Difference (°)", "n", 1], ["pinionSet", "Target Pinion Angle (°)", "n", 1]],
    fn: C["driveline-angle-calculator"], ex: { type: 0, trans: 3, shaft: 5, pinion: 3 },
    exText: (o) => `Example: transmission 3°, driveshaft 5°, pinion 3° → working angles of ${o.front}° and ${o.rear}° (${String(o.verdict).toLowerCase()}).`,
    how: "Measure each angle with a digital angle finder on a level surface, with the vehicle at ride height. A single-cardan shaft needs the transmission and pinion parallel, so the two U-joint working angles are equal and cancel; a double-cardan shaft needs the pinion pointed straight at the driveshaft.\n\nUnder power, leaf springs wrap and lift the pinion, so drag cars often set the pinion a degree or two lower.",
    assume: "Working angle = difference between the shaft and the component it connects to. Keep working angles under about 3° for road use and within 0.5–1° of each other.",
    faq: [["What should my pinion angle be?", "Parallel to the transmission output (single cardan) or pointed at the driveshaft (double cardan)."], ["What causes driveshaft vibration?", "Unequal or large U-joint working angles, an out-of-balance shaft, or worn U-joints."]],
  }),
  mk({
    slug: "power-to-weight-ratio-calculator", title: "Power-to-Weight Ratio Calculator",
    meta: "Power to Weight Ratio Calculator — HP per Ton, lb/hp, W/kg",
    desc: "Calculate a car's power-to-weight ratio in hp per tonne, lb per hp, kg per hp and W/kg — and estimate its quarter-mile time and trap speed.",
    inputs: [num("power", "Power", 300, 1, 5000, 1), dd("pu", "Power Unit", ["hp", "kW"], 0), num("weight", "Weight (with driver)", 3500, 50, 100000, 1), dd("wu", "Weight Unit", ["lb", "kg"], 0)],
    results: [["hpton", "Horsepower per Tonne", "n", 1], ["lbhp", "Pounds per Horsepower", "n", 2], ["kghp", "kg per Horsepower", "n", 2], ["wkg", "Watts per kg", "n", 1], ["et", "Estimated Quarter-Mile (s)", "n", 2], ["trap", "Estimated Trap Speed (mph)", "n", 1]],
    fn: C["power-to-weight-ratio-calculator"], ex: { power: 300, pu: 0, weight: 3500, wu: 0 },
    exText: (o) => `Example: 300 hp in a 3,500 lb car → ${o.hpton} hp per tonne (${o.lbhp} lb/hp) — about a ${o.et}-second quarter mile.`,
    how: "Divide the power by the weight (or the weight by the power for lb/hp). Use the weight with a driver and fuel for a fair comparison. Quarter-mile estimates use Hale's formulas, which assume good traction and launch.",
    assume: "ET = 5.825 × (lb/hp)^(1/3); trap speed = 234 × (hp/lb)^(1/3) (flywheel hp). 1 hp = 0.7457 kW.",
    faq: [["What is a good power-to-weight ratio for a car?", "Over 100 hp per tonne feels quick; sports cars are 200–300 and supercars 400+."], ["Is lb per hp the same as power-to-weight?", "It's the inverse — lower lb/hp means a better ratio."]],
  }),
  mk({
    slug: "volumetric-efficiency-calculator", title: "Volumetric Efficiency Calculator",
    desc: "Calculate an engine's volumetric efficiency (VE) from displacement, RPM and measured airflow (CFM) — and the theoretical airflow it should move at 100% VE.",
    inputs: [num("disp", "Displacement", 350, 0.05, 1000, 0.1), dd("du", "Displacement Unit", ["cubic inches", "litres"], 0), num("rpm", "Engine RPM", 5500, 500, 20000, 50), num("cfm", "Measured Airflow (CFM)", 480, 1, 5000, 1)],
    results: [["ve", "Volumetric Efficiency (%)", "n", 1], ["verdict", "Rating", "t"], ["theo", "Airflow at 100% VE (CFM)", "n", 0], ["cfm", "Measured Airflow (CFM)", "n", 0], ["carb", "Suggested Carb Size at ~90% VE (CFM)", "n", 0]],
    fn: C["volumetric-efficiency-calculator"], ex: { disp: 350, du: 0, rpm: 5500, cfm: 480 },
    exText: (o) => `Example: a 350 ci engine flowing 480 CFM at 5,500 rpm → ${o.ve}% volumetric efficiency (100% would be ${o.theo} CFM).`,
    how: "A four-stroke engine ideally fills its displacement every two revolutions: CFM at 100% = cubic inches × rpm ÷ 3,456. VE is the measured airflow as a percentage of that. Get airflow from a MAF reading (g/s × 1.6 ≈ CFM at sea level) or a dyno's air meter.",
    assume: "Four-stroke engine, standard air density. Forced-induction engines exceed 100%.",
    faq: [["What is a good volumetric efficiency?", "Stock street engines run 75–85%; well-built naturally aspirated race engines 95–110%."], ["How does VE affect horsepower?", "Power is roughly proportional to the air the engine moves, so higher VE at an RPM means more power there."]],
  }),
  mk({
    slug: "exhaust-pipe-size-calculator", title: "Exhaust Pipe Size Calculator",
    desc: "Find the right exhaust pipe diameter for your horsepower — single or dual exhaust — with inside diameter, pipe area and the next standard tube size.",
    inputs: [num("hp", "Engine Horsepower (flywheel)", 400, 20, 3000, 5), dd("dual", "Exhaust Layout", ["Single exhaust", "Dual exhaust"], 1), num("wall", "Tube Wall Thickness (in)", 0.065, 0.02, 0.2, 0.001), num("k", "Horsepower per Square Inch of Pipe Area", 45, 20, 80, 1)],
    results: [["od", "Recommended Pipe Size (in OD)", "n", 2], ["mm", "Pipe Size (mm)", "n", 0], ["id", "Minimum Inside Diameter (in)", "n", 2], ["area", "Pipe Area per Side (sq in)", "n", 2], ["total", "Total Pipe Area (sq in)", "n", 2], ["how", "How It's Worked Out", "t"]],
    fn: C["exhaust-pipe-size-calculator"], ex: { hp: 400, dual: 1, wall: 0.065, k: 45 },
    exText: (o) => `Example: 400 hp with dual exhaust → about ${o.od}" pipes (${o.area} sq in per side).`,
    how: "Exhaust flow grows with power, so the pipe needs enough area to keep backpressure low without slowing gas velocity too much. A common rule is about 45 hp per square inch of pipe area for a street engine; race engines with free-flowing mufflers can use a little less pipe.\n\nTurbo engines need bigger pipe after the turbo (about 3\" for 300–400 hp, 3.5–4\" beyond).",
    assume: "Rule of thumb from common street/strip practice (single 3\" ≈ 300 hp; dual 2.5\" ≈ 400 hp). Primary header tube sizing depends on rpm and displacement per cylinder and isn't covered.",
    faq: [["What size exhaust for 400 hp?", "About 2.5\" dual or a single 3.5\"."], ["Is a bigger exhaust always better?", "No — too big a pipe slows the gas and can cost low-rpm torque."]],
  }),
  mk({
    slug: "pie-cut-calculator", title: "Pie Cut Exhaust Calculator",
    meta: "Pie Cut Calculator — Exhaust & Intercooler Pipe Bends",
    desc: "Calculate pie cuts for a fabricated exhaust or intercooler bend — the cut angle, segment angle and the heel, throat and centerline length of each piece.",
    inputs: [num("bend", "Total Bend Angle (°)", 90, 1, 180, 1), num("pieces", "Number of Pieces (segments)", 6, 1, 30, 1), num("od", "Pipe Outside Diameter (in)", 2.5, 0.25, 12, 0.01), num("clr", "Centerline Radius (in)", 4, 0.5, 60, 0.05)],
    results: [["cut", "Cut Angle on Each End (°)", "n", 2], ["seg", "Angle per Piece (°)", "n", 2], ["center", "Piece Length at Centerline (in)", "n", 3], ["heel", "Long Side (heel) Length (in)", "n", 3], ["throat", "Short Side (throat) Length (in)", "n", 3], ["welds", "Welds", "n", 0], ["how", "How It's Worked Out", "t"]],
    fn: C["pie-cut-calculator"], ex: { bend: 90, pieces: 6, od: 2.5, clr: 4 },
    exText: (o) => `Example: a 90° bend in 6 pieces of 2.5" tube on a 4" radius → cut each end ${o.cut}° and make each piece ${o.heel}" on the heel and ${o.throat}" on the throat.`,
    how: "Each piece turns the bend angle ÷ the number of pieces, and both of its ends are cut at half that angle. Mark the heel and throat lengths on the tube, cut, and rotate every other piece 180° as you tack them together.\n\nMore pieces make a smoother bend but more welds.",
    assume: "Lengths are measured along the outside (heel), inside (throat) and centerline arcs for each segment.",
    faq: [["How do you calculate pie cuts?", "Angle per piece = bend ÷ pieces; cut each end at half of that."], ["How many pie cuts for a 90-degree bend?", "Commonly 5–9 pieces; 6 pieces at 7.5° per cut is a popular choice."]],
  }),
  mk({
    slug: "scrub-radius-calculator", title: "Scrub Radius Calculator",
    desc: "Calculate front-wheel scrub radius from kingpin inclination, the steering-axis offset at the hub and tire loaded radius — and see how a wheel offset change moves it.",
    inputs: [num("kpi", "Kingpin / Steering Axis Inclination (°)", 12, 0, 25, 0.1), num("d", "Steering Axis to Wheel Center at Hub Height (mm)", 60, -100, 250, 0.5), num("rr", "Tire Loaded Radius (mm)", 330, 150, 700, 1), num("doff", "Wheel Offset Change (mm, + = more positive offset)", 0, -100, 100, 1)],
    results: [["scrub", "Scrub Radius (mm)", "n", 1], ["verdict", "What It Means", "t"], ["scrubIn", "Scrub Radius (in)", "n", 2], ["ground", "Axis Moves Out at the Ground By (mm)", "n", 1]],
    fn: C["scrub-radius-calculator"], ex: { kpi: 12, d: 60, rr: 330, doff: 0 },
    exText: (o) => `Example: 12° KPI with the steering axis 60 mm inboard of the wheel center at the hub and a 330 mm loaded radius → ${o.scrub} mm scrub radius.`,
    how: "Scrub radius is the distance at the ground between the center of the tire's contact patch and the point where the steering axis hits the ground. Measure the lateral distance from the steering axis (through the ball joints) to the wheel centerline at hub height; KPI then brings the axis outward by loaded radius × tan(KPI) at the ground.\n\nLower-offset (more dished) wheels move the tire outward and increase positive scrub one-for-one.",
    assume: "Front view geometry only; caster and camber are ignored. Positive = contact patch outboard of the steering axis.",
    faq: [["Is positive or negative scrub radius better?", "Small positive or slightly negative is typical; negative scrub keeps FWD cars straight under uneven braking."], ["Does wheel offset change scrub radius?", "Yes — every millimetre of lower offset adds a millimetre of positive scrub."]],
  }),
  mk({
    slug: "4-link-suspension-calculator", title: "4-Link Suspension Calculator",
    meta: "4-Link Calculator — Instant Center & Anti-Squat",
    desc: "Calculate a 4-link rear suspension's instant center and anti-squat percentage from the link mounting points, wheelbase and center-of-gravity height.",
    inputs: [num("lax", "Lower Link — Axle End X (in forward of axle)", 0, -20, 20, 0.1), num("lay", "Lower Link — Axle End Height (in)", 12, 0, 40, 0.1), num("lfx", "Lower Link — Frame End X (in)", 30, 0, 120, 0.1), num("lfy", "Lower Link — Frame End Height (in)", 14, 0, 40, 0.1), num("uax", "Upper Link — Axle End X (in)", 0, -20, 20, 0.1), num("uay", "Upper Link — Axle End Height (in)", 20, 0, 50, 0.1), num("ufx", "Upper Link — Frame End X (in)", 24, 0, 120, 0.1), num("ufy", "Upper Link — Frame End Height (in)", 19, 0, 50, 0.1), num("wb", "Wheelbase (in)", 110, 40, 300, 0.5), num("cg", "Center of Gravity Height (in)", 22, 5, 80, 0.5)],
    results: [["as", "Anti-Squat (%)", "n", 1], ["verdict", "What It Means", "t"], ["icx", "Instant Center — Forward of Axle (in)", "n", 1], ["icy", "Instant Center — Height (in)", "n", 1], ["line", "Anti-Squat Line Height at the Front Axle (in)", "n", 1]],
    fn: C["4-link-suspension-calculator"], ex: { lax: 0, lay: 12, lfx: 30, lfy: 14, uax: 0, uay: 20, ufx: 24, ufy: 19, wb: 110, cg: 22 },
    exText: (o) => `Example: lower links rising from 12" to 14" over 30", uppers falling from 20" to 19" over 24", 110" wheelbase and a 22" CG → instant center ${o.icx}" ahead at ${o.icy}" high, ${o.as}% anti-squat.`,
    how: "Measure each link pivot in side view: X forward from the rear axle centerline and height above the ground. Extending the upper and lower links until they cross gives the instant center (IC). A line from the rear tire contact patch through the IC, measured at the front axle, compared with the CG height gives anti-squat.\n\n100% means the rear neither squats nor rises under acceleration.",
    assume: "Side-view 2D geometry, rigid links, rear tire contact patch at the axle centerline. CG height can be estimated at about 18–22\" for a typical car.",
    faq: [["What anti-squat should a drag car have?", "Usually 100–130%, tuned to the track and tire."], ["What is the instant center on a 4-link?", "The point where lines through the upper and lower links meet; it acts as the axle's pivot under load."]],
  }),
];

const CYCLE: ToolDef[] = [
  mk({
    slug: "skid-patch-calculator", title: "Skid Patch Calculator (Fixed Gear)",
    desc: "Calculate how many skid patches your fixed-gear bike has from the chainring and cog — for single-leg and ambidextrous skidders — and the gear inches.",
    inputs: [num("ring", "Chainring Teeth", 48, 20, 70, 1), num("cog", "Rear Cog Teeth", 17, 9, 30, 1)],
    results: [["single", "Skid Patches (single-leg)", "n", 0], ["amb", "Skid Patches (ambidextrous)", "n", 0], ["verdict", "Tire Wear", "t"], ["ratio", "Gear Ratio", "n", 2], ["gi", "Gear Inches (700c)", "n", 1]],
    fn: C["skid-patch-calculator"], ex: { ring: 48, cog: 17 },
    exText: (o) => `Example: 48 × 17 → ${o.single} skid patches (${o.amb} if you skid with either foot), ${o.gi} gear inches.`,
    how: "Skid patches = cog teeth ÷ the greatest common divisor of the chainring and cog. If the reduced chainring number is odd, ambidextrous skidders get twice as many.\n\nMore patches spread tire wear; 48×16 has only one patch, which wears a flat spot fast.",
    assume: "Gear inches use a 27\" (700c × 23–28 mm) wheel diameter.",
    faq: [["What is a good number of skid patches?", "At least 7–10 to spread the wear."], ["What gear ratio has the most skid patches?", "Ratios where the chainring and cog share no common factor, like 47×17 (17 patches)."]],
  }),
  mk({
    slug: "uk-cycle-to-work-scheme-calculator", title: "UK Cycle to Work Scheme Calculator",
    meta: "Cycle to Work Calculator UK — Salary Sacrifice Savings",
    desc: "Calculate how much you save on a bike through the UK Cycle to Work scheme — income tax and National Insurance relief by tax band — and your monthly salary sacrifice.",
    inputs: [money("cost", "Bike & Equipment Package", 1000, "£", 20000), dd("band", "Your Tax Band", E.UK_BANDS.map((b) => b[0]), 0), num("months", "Salary Sacrifice Period (months)", 12, 1, 60, 1), num("fee", "End-of-Hire Ownership Fee (%)", 3, 0, 20, 0.5)],
    results: [["saving", "You Save", "c", "GBP"], ["net", "Net Cost of the Bike", "c", "GBP"], ["pct", "Saving (%)", "n", 1], ["monthly", "Monthly Salary Sacrifice", "c", "GBP"], ["netMonthly", "Monthly Cost After Tax Relief", "c", "GBP"], ["endFee", "Ownership Fee at the End", "c", "GBP"]],
    fn: C["uk-cycle-to-work-scheme-calculator"], ex: { cost: 1000, band: 0, months: 12, fee: 3 },
    exText: (o) => `Example: a £1,000 bike for a basic-rate taxpayer over 12 months → save about ${money$(Number(o.saving), "£")} (${o.pct}%).`,
    how: "You hire the bike from your employer through salary sacrifice, so the payments come out of your pay before income tax and National Insurance. At the end you usually pay a small fee to own it (often 3% after an extended hire, or up to 7%).\n\nYour pay after the sacrifice must stay above the National Minimum Wage.",
    assume: "2025–26 rates: rUK income tax 20/40/45%, employee NI 8% (main rate) and 2% above the upper earnings limit; Scottish bands shown for intermediate and higher rates. Pension contributions and student loan repayments can change the exact saving.",
    faq: [["How much do you save with Cycle to Work?", "About 28% for basic-rate taxpayers and 42% for higher-rate taxpayers, before the ownership fee."], ["Is there a limit on the Cycle to Work scheme?", "The tax rules have no limit, but many employers cap packages at £1,000–£5,000."]],
  }),
];

const BOAT: ToolDef[] = [
  mk({
    slug: "boat-propeller-slip-calculator", title: "Boat Propeller Slip Calculator",
    meta: "Prop Slip Calculator — Boat Propeller Slip, Speed & Pitch",
    desc: "Calculate boat propeller slip from pitch, engine RPM, gear ratio and GPS speed — plus the theoretical speed and the pitch to reach your target RPM.",
    inputs: [num("pitch", "Propeller Pitch (in)", 19, 5, 40, 0.5), num("rpm", "Engine RPM at Wide Open Throttle", 5500, 1000, 10000, 50), num("gear", "Lower Unit Gear Ratio (:1)", 1.85, 1, 4, 0.01), num("speed", "Actual Speed (GPS, mph)", 42, 1, 150, 0.1), num("target", "Target WOT RPM (0 = skip)", 0, 0, 10000, 50)],
    results: [["slip", "Propeller Slip (%)", "n", 1], ["verdict", "Rating", "t"], ["theo", "Theoretical Speed With No Slip (mph)", "n", 1], ["knots", "Actual Speed (knots)", "n", 1], ["newPitch", "Pitch for Target RPM (in)", "n", 1], ["how", "How It's Worked Out", "t"]],
    fn: C["boat-propeller-slip-calculator"], ex: { pitch: 19, rpm: 5500, gear: 1.85, speed: 42, target: 0 },
    exText: (o) => `Example: a 19" pitch prop at 5,500 rpm through a 1.85:1 gearcase at 42 mph GPS → ${o.slip}% slip (no-slip speed ${o.theo} mph).`,
    how: "Theoretical speed = pitch × engine RPM ÷ (gear ratio × 1,056) in mph. Slip is how far below that the boat actually goes. Use a GPS speed, not the speedometer.\n\nIf the engine doesn't reach the manufacturer's WOT range, drop pitch; as a rule each inch of pitch changes WOT by about 150–200 rpm.",
    assume: "1,056 converts inches per minute to mph. Typical slip: 10–15% for runabouts, 5–10% for fast bass boats, 15–25% for pontoons and heavy boats.",
    faq: [["What is normal prop slip?", "About 10–15% for most recreational boats."], ["How do I reduce prop slip?", "Correct the engine height and trim, fix a spun hub, or try a prop with more blade area or cup."]],
  }),
  mk({
    slug: "boat-motor-size-calculator", title: "Boat Motor Size (HP) Calculator",
    meta: "Boat Motor Size Calculator — Outboard HP for Your Boat",
    desc: "Estimate the outboard horsepower your boat needs for a target speed from its loaded weight and hull type — and check it against the USCG capacity formula.",
    inputs: [num("weight", "Boat Weight With Engine & Fuel (lb)", 2000, 50, 50000, 10), num("people", "Number of People", 2, 0, 30, 1), num("gear", "Gear, Coolers & Water (lb)", 200, 0, 10000, 10), dd("hull", "Hull Type", E.HULLS.map((h) => h[0]), 1), num("mph", "Target Top Speed (mph)", 35, 5, 120, 1), num("len", "Boat Length (ft)", 18, 6, 60, 0.5), num("beam", "Transom Width (ft)", 6.5, 2, 15, 0.1)],
    results: [["hp", "Horsepower Needed", "n", 0], ["uscg", "USCG Maximum HP Estimate", "n", 0], ["ok", "Capacity Check", "t"], ["speed", "Speed at the Usable HP (mph)", "n", 1], ["w", "Loaded Weight Used (lb)", "n", 0]],
    fn: C["boat-motor-size-calculator"], ex: { weight: 2000, people: 2, gear: 200, hull: 1, mph: 35, len: 18, beam: 6.5 },
    exText: (o) => `Example: a 2,000 lb runabout with two people and 200 lb of gear wanting 35 mph needs about ${o.hp} hp; the USCG formula allows about ${o.uscg} hp for an 18 × 6.5 ft boat.`,
    how: "Crouch's planing formula links speed, horsepower and weight: speed = C × √(hp ÷ weight), with C set by the hull type. The calculator solves it for horsepower at your target speed and loaded weight.\n\nNever exceed the maximum horsepower on the boat's capacity plate; the USCG figure here is only an estimate for boats with remote steering.",
    assume: "Crouch constants: 120 displacement/cruiser, 140 pontoon, 150 average runabout, 190 fast sport/bass, 210 race. USCG max hp (33 CFR 183.53) for length × transom width over 52: 2 × factor − 90, rounded up to the next 5.",
    faq: [["How much horsepower do I need for my boat?", "Roughly 1 hp per 25–40 lb of loaded weight for a planing runabout; check the capacity plate maximum."], ["Can I put a bigger motor than the capacity plate?", "No — it's illegal in many places and can void insurance."]],
  }),
];

const SHOP: ToolDef[] = [
  mk({
    slug: "tire-stretch-calculator", title: "Tire Stretch Calculator",
    desc: "Check how much a tire is stretched on a wheel — compare the tire's section width with the rim width and the approved rim range, from no stretch to aggressive.",
    inputs: [num("width", "Tire Section Width (mm, e.g. 215)", 215, 100, 400, 5), num("rim", "Rim Width (in)", 8.5, 3, 15, 0.5)],
    results: [["level", "Stretch Level", "t"], ["stretch", "Rim Width Beyond the Approved Range (mm)", "n", 1], ["lo", "Approved Rim Width — Narrowest (in)", "n", 1], ["hi", "Approved Rim Width — Widest (in)", "n", 1], ["ratio", "Rim Width ÷ Tire Width", "n", 3], ["rimMm", "Rim Width (mm)", "n", 0]],
    fn: C["tire-stretch-calculator"], ex: { width: 215, rim: 8.5 },
    exText: (o) => `Example: a 215 tire on an 8.5" wheel → ${String(o.level).toLowerCase()} (approved rims about ${o.lo}–${o.hi}").`,
    how: "Every tire has an approved rim width range, roughly 75–89% of its section width. A rim wider than that pulls the sidewalls inward — a stretch. Mild stretch is common on aftermarket wheels; heavy stretch reduces sidewall protection and can unseat the bead.",
    assume: "Approved range approximated from ETRTO/TRA rim charts (about 0.75–0.89 × section width); check the tire maker's data for the exact range. Heavy stretch may be illegal or void insurance in some places.",
    faq: [["Is tire stretch safe?", "Mild stretch within about 0.5–1\" of the approved range is generally fine; aggressive stretch risks bead failure."], ["What rim width for a 225 tire?", "About 6.5–7.5\" is approved for most 225 tires."]],
  }),
  mk({
    slug: "tongue-weight-calculator", title: "Trailer Tongue Weight Calculator",
    desc: "Calculate the right trailer tongue weight — 10–15% of the trailer (15–25% for fifth wheels) — check a measured tongue weight and whether your hitch class can carry it.",
    inputs: [num("trailer", "Loaded Trailer Weight (lb)", 5000, 100, 40000, 50), dd("type", "Trailer Type", ["Bumper-pull / ball hitch", "Fifth wheel / gooseneck"], 0), num("meas", "Measured Tongue Weight (lb, 0 = skip)", 0, 0, 10000, 5), dd("hitch", "Hitch Class", E.HITCH.map((h) => h[0]), 2)],
    results: [["lo", "Minimum Tongue Weight (lb)", "n", 0], ["hi", "Maximum Tongue Weight (lb)", "n", 0], ["state", "Your Load", "t"], ["pct", "Measured Tongue Weight (% of trailer)", "n", 1], ["hitch", "Hitch Check", "t"]],
    fn: C["tongue-weight-calculator"], ex: { trailer: 5000, type: 0, meas: 0, hitch: 2 },
    exText: (o) => `Example: a 5,000 lb travel trailer should put ${nf(o.lo)}–${nf(o.hi)} lb on the hitch ball.`,
    how: "Too little tongue weight makes a trailer sway; too much overloads the tow vehicle's rear axle and lightens the steering. Weigh the tongue at a CAT scale, with a tongue weight scale, or with a bathroom scale and a lever for light trailers.\n\nMove cargo forward of the trailer axle to add tongue weight, or back to reduce it.",
    assume: "Industry guidance (SAE J2807 practice, RV and hitch makers): 10–15% for conventional trailers, 15–25% for fifth wheels and goosenecks. Hitch class ratings shown are typical maximums.",
    faq: [["How much tongue weight should a trailer have?", "10–15% of its loaded weight for a bumper-pull trailer."], ["What happens if tongue weight is too light?", "The trailer is prone to dangerous sway at speed."]],
  }),
  mk({
    slug: "vin-check-digit-calculator", title: "VIN Check Digit Calculator",
    meta: "VIN Check Digit Calculator — Validate a 17-Digit VIN",
    desc: "Check whether a 17-character VIN is valid by recalculating its 9th-digit check digit — and decode the model year and the region of manufacture.",
    inputs: [tx("vin", "VIN (17 characters)", "1M8GDM9AXKP042788")],
    results: [["valid", "VIN Check", "t"], ["digit", "Correct Check Digit", "t"], ["year", "Model Year (10th character)", "t"], ["region", "Region of Manufacture", "t"], ["wmi", "World Manufacturer Identifier", "t"], ["sum", "Weighted Sum", "n", 0]],
    fn: C["vin-check-digit-calculator"], ex: { ...T("vin", "1M8GDM9AXKP042788") },
    exText: (o) => `Example: 1M8GDM9AXKP042788 (the NHTSA sample VIN) → ${o.valid}; check digit ${o.digit}.`,
    how: "Each VIN character is converted to a number (letters by a fixed table), multiplied by a weight for its position, and the total is divided by 11. The remainder is the check digit (10 is written X) and must match position 9.\n\nA failed check usually means a typo — or a fake VIN plate. It does not tell you a car's history; use an NMVTIS or carfax-type report for that.",
    assume: "Check digit algorithm per 49 CFR 565.15 (mandatory for North American vehicles; many European and Asian VINs don't use a check digit). Model year cycle per 49 CFR 565: a digit in position 7 means 1980–2009, a letter 2010–2039.",
    faq: [["Which digit of the VIN is the check digit?", "The 9th character."], ["Can I find a car's year from the VIN?", "Yes — the 10th character encodes the model year."]],
  }),
  mk({
    slug: "engine-hours-to-miles-calculator", title: "Engine Hours to Miles Calculator",
    desc: "Convert engine hours to equivalent miles for cars, fleet and police vehicles, trucks, boats and tractors — useful when buying a used vehicle with an hour meter.",
    inputs: [num("hours", "Engine Hours", 1000, 0, 200000, 1), dd("use", "Vehicle / Use", E.HOUR_USE.map((h) => `${h[0]}${h[1] ? ` — ${h[1]} mph avg` : ""}`), 0), num("mph", "Custom Average Speed (mph, 0 = preset)", 0, 0, 200, 1), num("idle", "Share of Hours Idling (%)", 0, 0, 100, 1), num("years", "Vehicle Age (years, 0 = skip)", 0, 0, 100, 0.5)],
    results: [["miles", "Equivalent Miles", "n", 0], ["km", "Equivalent Kilometres", "n", 0], ["idleMiles", "Of Which From Idling (miles)", "n", 0], ["perYear", "Hours per Year", "n", 0], ["how", "Conversion", "t"]],
    fn: C["engine-hours-to-miles-calculator"], ex: { hours: 1000, use: 0, mph: 0, idle: 0, years: 0 },
    exText: (o) => `Example: 1,000 engine hours on a car or light truck ≈ ${nf(o.miles)} miles of engine wear.`,
    how: "An engine hour is an hour of running, whether driving or idling. Multiply hours by the average speed for that kind of use: about 33 mph for mixed driving, less for fleet vehicles that idle a lot, and much less for tractors.\n\nFor boats, around 1,500 hours on an outboard is often treated as high.",
    assume: "Average speeds are commonly used equivalences (e.g. Ford's police/fleet guidance of 33 miles per engine hour). Idle time wears engines differently from driving, so treat the result as a rough guide.",
    faq: [["How many miles is 1,000 engine hours?", "About 30,000–35,000 miles for a typical car or pickup."], ["What is high engine hours for a boat?", "Over about 1,500 hours for an outboard, depending on maintenance."]],
  }),
  mk({
    slug: "tire-age-calculator", title: "Tire Age Calculator (DOT Date Code)",
    meta: "Tire Age Calculator — Read the DOT Date Code",
    desc: "Find out how old your tires are from the 4-digit DOT date code (week and year) on the sidewall — and whether they're due for replacement.",
    inputs: [num("week", "Week (first 2 digits of the date code)", 12, 1, 53, 1), num("year", "Year (last 2 digits)", 21, 0, 99, 1), date("today", "Today", "today")],
    results: [["age", "Tire Age (years)", "n", 1], ["made", "Manufactured", "t"], ["advice", "Advice", "t"], ["left", "Years Until 6 Years Old", "n", 1], ["code", "Date Code", "t"]],
    fn: C["tire-age-calculator"], ex: { week: 12, year: 21, today: 20770 },
    exText: (o) => `Example: date code 1221 means week 12 of 2021 (${o.made}) — about ${o.age} years old in November 2026.`,
    how: "Find the oval at the end of the DOT code on the sidewall: the last four digits are the week and year it was made (\"1221\" = 12th week of 2021). Tires made before 2000 have a 3-digit code.\n\nRubber ages even if the tread looks good, especially in hot climates and on spares and trailers.",
    assume: "Most carmakers recommend replacing tires 6 years after manufacture; tire makers say 10 years at the latest. Inspect annually after 5 years.",
    faq: [["How do I read a tire's date code?", "The last 4 digits of the DOT code: week then year, e.g. 3423 = week 34 of 2023."], ["How old is too old for tires?", "Replace at 6 years in most cases and never use tires over 10 years old."]],
  }),
  mk({
    slug: "tire-balancing-beads-calculator", title: "Tire Balancing Beads Calculator",
    desc: "Find how many ounces (and grams) of balancing beads to put in each tire, by tire diameter and vehicle type — passenger, light truck, motorcycle or semi.",
    inputs: [dd("type", "Vehicle", ["Passenger car / light truck / SUV", "Motorcycle", "Semi truck / bus", "RV / large off-road"], 0), num("dia", "Tire Overall Diameter (in)", 31, 10, 60, 0.5), dd("pos", "Semi Wheel Position", ["Steer", "Drive", "Trailer"], 0), num("n", "Number of Tires", 4, 1, 18, 1)],
    results: [["oz", "Beads per Tire (oz)", "n", 1], ["g", "Beads per Tire (g)", "n", 0], ["total", "Total for All Tires (oz)", "n", 1], ["totalG", "Total (g)", "n", 0]],
    fn: C["tire-balancing-beads-calculator"], ex: { type: 0, dia: 31, pos: 0, n: 4 },
    exText: (o) => `Example: four 31" light-truck tires → ${o.oz} oz (${o.g} g) of beads per tire, ${o.total} oz in all.`,
    how: "Balancing beads ride inside the tire and settle opposite the heavy spot as the wheel turns. The amount scales with the tire's size and weight. Use a valve core with a filter so beads don't clog it.",
    assume: "Amounts follow typical bead makers' charts (e.g. 2 oz for 26–27\" tires, 4 oz for 31\", 6 oz for 35\"). Check your bead brand's chart; slightly more is better than too little.",
    faq: [["How many ounces of balancing beads per tire?", "About 2–3 oz for cars, 4–6 oz for light trucks with 31–35\" tires and 8 oz for semi steer tires."], ["Do balancing beads really work?", "They work well on trucks and off-road tires; most car tires are still balanced with weights."]],
  }),
  mk({
    slug: "car-tire-pressure-calculator", title: "Car Tire Pressure Calculator (Load & Temperature)",
    meta: "Car Tire Pressure Calculator — Correct PSI for Temperature",
    desc: "Work out the right tire pressure for your car or truck — corrected for the temperature where you fill up versus where you drive, hot tires and heavy loads.",
    inputs: [num("placard", "Recommended Cold Pressure (door placard, psi)", 35, 15, 120, 0.5), num("now", "Temperature Where You're Filling (°F)", 70, -40, 130, 1), num("drive", "Temperature You'll Drive In (°F)", 40, -40, 130, 1), dd("hot", "Tires Are…", ["Cold (parked 3+ hours)", "Hot (just driven)"], 0), dd("load", "Load", ["Normal", "Heavy load / full car", "Towing or max load (check placard)"], 0), num("max", "Max Pressure on the Sidewall (psi)", 51, 20, 150, 1)],
    results: [["set", "Set the Gauge To (psi)", "n", 1], ["coldAt", "Target Cold Pressure (psi)", "n", 1], ["change", "Temperature Correction (psi)", "n", 1], ["kpa", "Set Pressure (kPa)", "n", 0], ["bar", "Set Pressure (bar)", "n", 2], ["how", "How It's Worked Out", "t"]],
    fn: C["car-tire-pressure-calculator"], ex: { placard: 35, now: 70, drive: 40, hot: 0, load: 0, max: 51 },
    exText: (o) => `Example: a 35 psi placard, filling in a 70°F garage before driving at 40°F → set the gauge to ${o.set} psi so the tires are at 35 psi when cold outside.`,
    how: "Use the pressure on the driver's door placard (not the sidewall maximum). Tire pressure changes by about 1 psi for every 10°F, so if you fill up somewhere warmer than you'll drive, add a little; if the tires are hot from driving, they read about 4 psi high.\n\nFor heavy loads and towing, follow the placard's loaded pressure if it lists one.",
    assume: "Gay-Lussac's law approximation (1 psi per 10°F at typical car pressures). Never exceed the sidewall maximum.",
    faq: [["What should my tire pressure be?", "The cold pressure on the driver's door placard — usually 32–36 psi for cars."], ["Should I lower tire pressure in hot weather?", "No — set the placard pressure when the tires are cold; it's normal for it to rise while driving."]],
  }),
];

const FREIGHT: ToolDef[] = [
  mk({
    slug: "ifta-fuel-tax-calculator", title: "IFTA Fuel Tax Calculator",
    meta: "IFTA Calculator — Quarterly Fuel Tax by State",
    desc: "Calculate your IFTA quarterly fuel tax: fleet MPG, taxable gallons by jurisdiction, tax-paid gallons bought and the net tax due or credit for each state.",
    inputs: [num("m1", "Jurisdiction 1 — Miles", 4000, 0, 1e6, 1), num("g1", "Jurisdiction 1 — Tax-Paid Gallons Bought", 500, 0, 1e6, 1), money("r1", "Jurisdiction 1 — Tax Rate per Gallon", 0.2), num("m2", "Jurisdiction 2 — Miles", 3000, 0, 1e6, 1), num("g2", "Jurisdiction 2 — Gallons Bought", 800, 0, 1e6, 1), money("r2", "Jurisdiction 2 — Tax Rate per Gallon", 0.19), num("m3", "Jurisdiction 3 — Miles", 2000, 0, 1e6, 1), num("g3", "Jurisdiction 3 — Gallons Bought", 0, 0, 1e6, 1), money("r3", "Jurisdiction 3 — Tax Rate per Gallon", 0.285), num("m4", "Jurisdiction 4 — Miles", 1000, 0, 1e6, 1), num("g4", "Jurisdiction 4 — Gallons Bought", 300, 0, 1e6, 1), money("r4", "Jurisdiction 4 — Tax Rate per Gallon", 0.2), num("mOther", "Other Miles (non-IFTA / not listed)", 0, 0, 1e6, 1), num("gOther", "Other Gallons", 0, 0, 1e6, 1)],
    results: [["due", "Net IFTA Tax Due (− = credit)", "c"], ["mpg", "Fleet MPG", "n", 2], ["j1", "Jurisdiction 1 Net", "c"], ["j2", "Jurisdiction 2 Net", "c"], ["j3", "Jurisdiction 3 Net", "c"], ["j4", "Jurisdiction 4 Net", "c"], ["how", "Breakdown", "t"]],
    fn: C["ifta-fuel-tax-calculator"], ex: { m1: 4000, g1: 500, r1: 0.2, m2: 3000, g2: 800, r2: 0.19, m3: 2000, g3: 0, r3: 0.285, m4: 1000, g4: 300, r4: 0.2, mOther: 0, gOther: 0 },
    exText: (o) => `Example: 10,000 miles across four states on 1,600 gallons (${o.mpg} MPG) → net IFTA tax of ${usd(o.due)} for the quarter.`,
    how: "IFTA charges each state's fuel tax on the fuel you burned there, not where you bought it. Fleet MPG = total miles ÷ total gallons; taxable gallons in a state = its miles ÷ fleet MPG. You get credit for tax-paid gallons bought there, so the net per state is (taxable − purchased) × that state's rate.\n\nEnter each state's current quarterly rate from the IFTA tax matrix (diesel rates shown are examples).",
    assume: "Uses the standard IFTA method; surcharges (e.g. Indiana, Kentucky, Virginia) and rounding rules aren't modelled. Rates change every quarter — use the IFTA, Inc. tax rate matrix for your filing period.",
    faq: [["How is IFTA calculated?", "Taxable gallons per state = miles there ÷ fleet MPG; tax due = (taxable − tax-paid gallons bought there) × the state rate."], ["When is IFTA due?", "The last day of the month after each quarter: April 30, July 31, October 31 and January 31."]],
  }),
  mk({
    slug: "axle-weight-calculator", title: "Axle Weight Distribution Calculator",
    meta: "Axle Weight Calculator — Truck Load & DOT Axle Limits",
    desc: "Calculate front and rear axle weights when you add a load at a given position, check them against federal axle limits, and find where to place a trailer axle for the right tongue weight.",
    inputs: [num("wb", "Wheelbase (front axle to rear axle / tandem center, in)", 200, 50, 400, 1), num("front0", "Empty Front Axle Weight (lb)", 9000, 0, 30000, 50), num("rear0", "Empty Rear Axle Weight (lb)", 7000, 0, 40000, 50), num("load", "Load Weight (lb)", 20000, 0, 80000, 50), num("d", "Load Center Behind the Front Axle (in)", 150, 0, 400, 1), dd("rearType", "Rear Axle", ["Single axle (20,000 lb limit)", "Tandem axle (34,000 lb limit)"], 1), num("flim", "Steer Axle Limit (lb)", 12000, 1000, 30000, 100), num("box", "Trailer Box Length (ft, for axle placement)", 16, 4, 60, 0.5), num("tongue", "Tongue Length — Box Front to Ball (ft)", 4, 0, 15, 0.5), num("tpct", "Target Tongue Weight (%)", 12, 5, 25, 0.5)],
    results: [["front", "Front Axle Weight (lb)", "n", 0], ["rear", "Rear Axle Weight (lb)", "n", 0], ["status", "Federal Limit Check", "t"], ["gross", "Gross Vehicle Weight (lb)", "n", 0], ["frontPct", "Weight on the Front Axle (%)", "n", 1], ["axle", "Trailer Axle Position From Box Front (ft)", "n", 2]],
    fn: C["axle-weight-calculator"], ex: { wb: 200, front0: 9000, rear0: 7000, load: 20000, d: 150, rearType: 1, flim: 12000, box: 16, tongue: 4, tpct: 12 },
    exText: (o) => `Example: a 20,000 lb load centred 150" behind the front axle of a 200" wheelbase truck → ${nf(o.front)} lb front and ${nf(o.rear)} lb rear (${String(o.status).toLowerCase()}).`,
    how: "A load splits between the axles by leverage: the rear axle carries load × (distance from the front axle ÷ wheelbase), the front carries the rest. Add these to the empty axle weights from a scale ticket.\n\nFor a trailer with an evenly spread load, the axle must sit behind the middle of the box to put the target percentage on the tongue; the last line gives that position.",
    assume: "Federal limits (23 U.S.C. 127): 20,000 lb single axle, 34,000 lb tandem, 80,000 lb gross, plus the bridge formula (not checked here). Steer axle limits vary by tire rating and state. Trailer placement assumes a uniform load over the box.",
    faq: [["What is the legal axle weight limit?", "20,000 lb on a single axle and 34,000 lb on a tandem on US Interstates."], ["How do I calculate axle weight?", "Rear share = load × distance from front axle ÷ wheelbase; front share = load − rear share."]],
  }),
];

const SCI: ToolDef[] = [mk({
  slug: "vertical-curve-calculator", title: "Vertical Curve Calculator",
  meta: "Vertical Curve Calculator — PVC, PVT, High/Low Point & K Value",
  desc: "Calculate a parabolic vertical curve for road design: PVC and PVT stations and elevations, the high or low point, K value and the elevation at any station.",
  inputs: [num("g1", "Entry Grade g1 (%)", 3, -20, 20, 0.01), num("g2", "Exit Grade g2 (%)", -2, -20, 20, 0.01), num("L", "Curve Length L (ft or m)", 600, 1, 10000, 1), num("pvi", "PVI Station (ft or m, e.g. 5000 for 50+00)", 5000, -1e6, 1e7, 0.01), num("elev", "PVI Elevation", 100, -1000, 10000, 0.001), num("sta", "Station to Find the Elevation", 5100, -1e6, 1e7, 0.01)],
  results: [["kind", "Curve Type", "t"], ["at", "Elevation at the Chosen Station", "n", 3], ["pvc", "PVC Station", "n", 2], ["ePvc", "PVC Elevation", "n", 3], ["pvt", "PVT Station", "n", 2], ["ePvt", "PVT Elevation", "n", 3], ["turnSta", "High / Low Point Station (0 = none on the curve)", "n", 2], ["turnElev", "High / Low Point Elevation", "n", 3], ["k", "K Value (L ÷ |A|)", "n", 1], ["e", "Middle Ordinate e", "n", 3]],
  fn: C["vertical-curve-calculator"], ex: { g1: 3, g2: -2, L: 600, pvi: 5000, elev: 100, sta: 5100 },
  exText: (o) => `Example: +3% to −2% over 600 ft with the PVI at 50+00, elevation 100 → a crest with its high point at station ${o.turnSta} (elevation ${o.turnElev}), K = ${o.k}.`,
  how: "A symmetrical vertical curve is a parabola from the PVC (L/2 before the PVI) to the PVT (L/2 after). Elevation at distance x from the PVC = E(PVC) + g1·x + (g2 − g1)·x² ÷ 2L. The high or low point is at x = −g1·L ÷ (g2 − g1) when it falls within the curve.\n\nK is the length per percent of grade change, used to check sight distance against AASHTO tables.",
  assume: "Equal-tangent (symmetrical) parabolic curve; grades in percent, stations and length in the same unit. Unsymmetrical curves need a different method.",
  faq: [["How do you calculate a vertical curve?", "y = E(PVC) + g1·x + (g2 − g1)x²/(2L), with grades as decimals."], ["What is the K value of a vertical curve?", "Curve length divided by the absolute grade change in percent."]],
})];

const ARTS: ToolDef[] = [mk({
  slug: "lucky-vehicle-number-calculator", title: "Lucky Vehicle Number Calculator",
  meta: "Lucky Vehicle Number Calculator — Number Plate Numerology",
  desc: "Find the numerology number of your car's registration plate and see whether it matches your life path number — a fun lucky number plate check.",
  inputs: [tx("plate", "Number Plate / Registration", "WXY 1234"), date("dob", "Your Date of Birth", 7305)],
  results: [["n", "Plate Number", "n", 0], ["meaning", "What It Means", "t"], ["match", "Match With You", "t"], ["lifePath", "Your Life Path Number", "n", 0], ["digits", "Digits-Only Number", "n", 0], ["plate", "Plate Read As", "t"]],
  fn: C["lucky-vehicle-number-calculator"], ex: { ...T("plate", "WXY 1234"), dob: 7305 },
  exText: (o) => `Example: plate WXY 1234 adds up to ${o.n} (${String(o.meaning).split(" — ")[0].toLowerCase()}); for someone born 1 January 1990 (life path ${o.lifePath}): ${String(o.match).toLowerCase()}.`,
  how: "Numerology adds up the plate's digits and the letters (with the Chaldean letter values) and reduces the total to a single digit. Your life path number comes from your full date of birth. Traditionally some numbers are said to suit each other.\n\nIn many Asian traditions people simply avoid 4 and prefer 8 and 9.",
  assume: "For entertainment only — there's no evidence a number plate affects luck or safety. Drive carefully whatever the number.",
  faq: [["How do I calculate my car number numerology?", "Add all the digits (and letter values) of the plate and reduce to one digit."], ["Which car number is lucky?", "In numerology 1, 3, 5, 6 and 9 are usually called lucky for cars, but it depends on your own number."]],
})];

export const VEH_TECH: [string, ToolDef[]][] = [
  ["motorsports-racing-calculators", MOTOR],
  ["cycling-calculators", CYCLE],
  ["other-sports-calculators", BOAT],
  ["vehicle-resale-collectibles-calculators", SHOP],
  ["freight-logistics-warehouse-calculators", FREIGHT],
  ["mechanical-structural-engineering-calculators", SCI],
  ["tarot-astrology-fun-calculators", ARTS],
];

async function main() {
  const all = VEH_TECH.flatMap(([, t]) => t);
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.VEH_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  for (const [cat, tools] of VEH_TECH) await upsertTools(cat, tools);
}
main().catch((e) => { console.error(e); process.exit(1); });
