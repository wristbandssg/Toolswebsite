// One-time (but safe to re-run) batch setup script: creates the 12 tools of
// the other-sports sub-batch "Firearms, Airguns & Airsoft". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-shooting.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-shooting-calculators.ts
// or
//   npm run db:create-other-shooting-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Other Sports Calculators", slug: "other-sports-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for planning, training and fun. Sizing, ratings and physics models are approximations — check official rules, manufacturer charts and qualified coaches, and treat health figures as general guidance, not medical advice.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });


const LOAD = (mv = 2600, bc = 0.505, wt = 175) => [numberField("muzzleVelocity", "Muzzle Velocity (fps)", { default: mv, min: 300, max: 5000 }), numberField("bc", "Ballistic Coefficient (G1)", { default: bc, min: 0.05, max: 1.5, step: 0.001 }), numberField("bulletWeight", "Bullet Weight (grains)", { default: wt, min: 1, max: 1000 })];
const SIGHT = () => [numberField("sightHeight", "Sight Height over Bore (in)", { default: 1.5, max: 5, step: 0.05 }), numberField("zeroRange", "Zero Range (yd)", { default: 100, min: 10, max: 1000 })];
const AIR = () => [numberField("altitude", "Altitude (ft)", { default: 0, max: 15000, required: false }), numberField("temperatureF", "Temperature (°F)", { default: 59, min: -40, max: 130 })];
const SAFETY = " Always follow safe firearm handling and local hunting and firearms laws.";

const TOOLS: ToolDef[] = [
  {
    slug: "muzzle-energy-calculator",
    title: "Muzzle Energy Calculator",
    description: "Calculate a bullet's muzzle energy (ft-lb and joules), momentum and Taylor knock-out factor from weight, velocity and calibre.",
    metaTitle: "Muzzle Energy Calculator — ft-lb & Joules",
    metaDescription: "Free muzzle energy calculator. Get bullet energy in ft-lb and joules, momentum and Taylor KO factor from grains and fps.",
    calcInputs: [numberField("bulletWeight", "Bullet Weight (grains)", { default: 150, min: 1, max: 1000 }), numberField("velocity", "Velocity (fps)", { default: 2800, min: 100, max: 5000 }), numberField("diameter", "Bullet Diameter (in, for Taylor KO)", { default: 0.308, min: 0.1, max: 1, step: 0.001 })],
    calcResult: { label: "Muzzle Energy", format: "number" },
    calcResults: [num("energyFtLb", "Energy (ft-lb)", true), num("energyJoules", "Energy (joules)"), num("momentumLbS", "Momentum (lb·s)"), num("taylorKo", "Taylor KO Factor")],
    instructions: "Enter the bullet weight and velocity (from the box or a chronograph), plus the bullet diameter for the Taylor KO factor.",
    examples: "Example: a 150 gr .308 bullet at 2,800 fps carries 2,612 ft-lb (3,541 J) with a Taylor KO factor of 18.5.",
    assumptions: "Energy (ft-lb) = grains × fps² ÷ 450,240; 1 ft-lb = 1.356 J. Taylor KO = grains × fps × diameter ÷ 7,000. Common hunting guides suggest about 1,000 ft-lb at impact for deer and 1,500 for elk — use the Bullet Drop Calculator for energy downrange." + SAFETY + " " + DISCLAIMER,
    faq: [
      { question: "Is more muzzle energy always better?", answer: "No — shot placement and bullet construction matter more for clean, ethical kills." },
      { question: "How does velocity affect energy?", answer: "Energy rises with the square of velocity: 10% more speed gives 21% more energy." },
    ],
  },
  {
    slug: "muzzle-velocity-calculator",
    title: "Muzzle Velocity Calculator",
    description: "Estimate muzzle velocity for your barrel length from the factory figure — or work out velocity from muzzle energy and bullet weight.",
    metaTitle: "Muzzle Velocity Calculator — Barrel Length & Energy",
    metaDescription: "Free muzzle velocity calculator. Adjust factory velocity for a shorter or longer barrel, or get fps from energy and weight.",
    calcInputs: [dropdown("method", "Method", [["Adjust factory velocity for barrel length", 1], ["From energy and bullet weight", 2]], 1), numberField("factoryVelocity", "Factory Velocity (fps)", { default: 2800, min: 100, max: 5000 }), numberField("testBarrel", "Factory Test Barrel (in)", { default: 24, min: 2, max: 34, step: 0.5 }), numberField("yourBarrel", "Your Barrel (in)", { default: 20, min: 2, max: 34, step: 0.5 }), numberField("fpsPerInch", "Velocity Change per Inch (fps)", { default: 25, min: 5, max: 60 }), numberField("energy", "Muzzle Energy (ft-lb)", { default: 2600, max: 10000 }), numberField("bulletWeight", "Bullet Weight (grains)", { default: 150, min: 1, max: 1000 })],
    calcResult: { label: "Velocity", format: "number" },
    calcResults: [num("velocityFps", "Muzzle Velocity (fps)", true), num("velocityMs", "Muzzle Velocity (m/s)"), num("changeFps", "Change from Factory (fps)")],
    instructions: "Pick a method. For barrel length, take the velocity and test-barrel length from the ammo box and enter your barrel length.",
    examples: "Example: ammo rated 2,800 fps from a 24\" test barrel fired from a 20\" barrel loses about 100 fps → about 2,700 fps.",
    assumptions: "Rule of thumb: about 20–30 fps per inch of barrel for most rifle cartridges (less for small cases, 40–50+ for magnums); handguns vary more. From energy: v = √(energy × 450,240 ÷ grains). A chronograph is the only way to know your real velocity." + SAFETY + " " + DISCLAIMER,
    faq: [
      { question: "Does a shorter barrel always lose velocity?", answer: "Usually, because the powder has less time to push the bullet — but the loss per inch shrinks once most powder has burned." },
      { question: "Why does my chronograph differ from the box?", answer: "Barrel length, temperature and the individual rifle all change velocity." },
    ],
  },
  {
    slug: "pellet-energy-calculator",
    title: "Pellet Energy Calculator",
    description: "Calculate an airgun pellet's energy (FPE and joules) from weight and velocity — and the fps that keeps you under a legal limit.",
    metaTitle: "Pellet Energy Calculator — Airgun FPE",
    metaDescription: "Free pellet energy calculator. Get airgun foot-pounds and joules from pellet weight and fps and check the 12 ft-lb limit.",
    calcInputs: [numberField("pelletWeight", "Pellet Weight (grains)", { default: 8.44, min: 1, max: 100, step: 0.01 }), numberField("velocity", "Velocity (fps)", { default: 800, min: 50, max: 2000 }), numberField("legalLimit", "Energy Limit (ft-lb, UK rifle 12, pistol 6)", { default: 12, min: 1, max: 200, step: 0.1 })],
    calcResult: { label: "Pellet Energy", format: "number" },
    calcResults: [num("energyFtLb", "Energy (ft-lb / FPE)", true), num("energyJoules", "Energy (joules)"), num("maxFpsAtLimit", "Max fps with This Pellet at the Limit"), num("withinLimit", "Within the Limit (1 = yes)")],
    instructions: "Enter the pellet weight (on the tin) and the velocity from a chronograph.",
    examples: "Example: an 8.44 gr .177 pellet at 800 fps carries 12.0 ft-lb (16.3 J) — right at the UK 12 ft-lb rifle limit.",
    assumptions: "FPE = grains × fps² ÷ 450,240. UK limits: 12 ft-lb rifles, 6 ft-lb pistols without a firearms certificate; other countries use joule limits (e.g. 7.5 J in Germany). Heavier pellets usually give slightly more energy from springers — test with a chronograph." + SAFETY + " " + DISCLAIMER,
    faq: [
      { question: "What is FPE?", answer: "Foot-pounds of energy — the usual airgun power measure." },
      { question: "How much energy for pest control?", answer: "Many shooters use 12 ft-lb for small pests at short range, with precise head shots." },
    ],
  },
  {
    slug: "airsoft-calculator",
    title: "Airsoft Calculator",
    description: "Convert airsoft fps to joules, compare fps across BB weights and check your gun against field limits.",
    metaTitle: "Airsoft Calculator — FPS to Joules & BB Weight",
    metaDescription: "Free airsoft calculator. Convert fps to joules, find fps with 0.20 g or heavier BBs and check field joule limits.",
    calcInputs: [numberField("bbWeight", "BB Weight Chronographed With (g)", { default: 0.2, min: 0.1, max: 0.6, step: 0.01 }), numberField("fps", "Measured fps", { default: 350, min: 50, max: 800 }), numberField("otherBbWeight", "BB Weight You'll Use (g)", { default: 0.28, min: 0.1, max: 0.6, step: 0.01 }), numberField("fieldLimitJoules", "Field Limit (J — e.g. CQB 1.14, outdoor 1.49, DMR 1.88)", { default: 1.14, min: 0.3, max: 5, step: 0.01 })],
    calcResult: { label: "Joules", format: "number" },
    calcResults: [num("joules", "Energy (joules)", true), num("fpsWithPoint2g", "Equivalent fps with 0.20 g"), num("fpsWithOtherBb", "fps with Your BB Weight"), num("withinFieldLimit", "Within Field Limit (1 = yes)")],
    instructions: "Enter the BB weight and fps from the chrono, the BB weight you'll actually shoot and your field's joule limit.",
    examples: "Example: 350 fps with 0.20 g BBs = 1.14 J — legal for a typical CQB limit. With 0.28 g BBs the same gun shoots about 296 fps.",
    assumptions: "Energy (J) = ½ × mass (kg) × velocity (m/s)². Equal energy is assumed across BB weights (heavier BBs often gain a little energy in real guns). Field rules vary — some limit fps on 0.20 g, others joules; minimum engagement distances apply. Always wear eye protection." + " " + DISCLAIMER,
    faq: [
      { question: "What is 400 fps in joules?", answer: "About 1.49 J with 0.20 g BBs." },
      { question: "Why do fields use joules?", answer: "Because fps on light BBs can hide how hard a gun hits with heavy BBs." },
    ],
  },
  {
    slug: "rifle-recoil-calculator",
    title: "Rifle Recoil Calculator",
    description: "Calculate free recoil energy and velocity for a rifle, handgun or shotgun load (also a shotgun recoil calculator).",
    metaTitle: "Rifle & Shotgun Recoil Calculator — Free Recoil Energy",
    metaDescription: "Free recoil calculator. Get free recoil energy (ft-lb) and velocity for rifle and shotgun loads from gun weight and load.",
    calcInputs: [dropdown("firearm", "Firearm", [["Rifle / handgun", 1], ["Shotgun", 2]], 1), numberField("gunWeight", "Gun Weight incl. Scope (lb)", { default: 8, min: 1, max: 30, step: 0.1 }), numberField("bulletWeight", "Bullet Weight (gr, rifle)", { default: 150, min: 1, max: 1000 }), numberField("payloadOz", "Shot Payload (oz, shotgun)", { default: 1.125, min: 0.25, max: 2.5, step: 0.125 }), numberField("velocity", "Muzzle Velocity (fps)", { default: 2800, min: 300, max: 5000 }), numberField("powderCharge", "Powder Charge (grains)", { default: 50, min: 1, max: 200, step: 0.5 })],
    calcResult: { label: "Recoil Energy", format: "number" },
    calcResults: [num("recoilEnergyFtLb", "Free Recoil Energy (ft-lb)", true), num("recoilVelocityFps", "Recoil Velocity (fps)"), num("recoilImpulseLbS", "Recoil Impulse (lb·s)"), num("energyJoules", "Recoil Energy (J)")],
    instructions: "Choose rifle or shotgun and enter the gun's weight and the load. Factory powder charges are often listed by the maker or in loading manuals.",
    examples: "Example: an 8 lb .308 firing a 150 gr bullet at 2,800 fps with 50 gr of powder recoils with about 15.2 ft-lb. A 7.5 lb 12-gauge with 1⅛ oz at 1,200 fps gives about 19.8 ft-lb.",
    assumptions: "Free recoil: gun velocity = (projectile gr × MV + powder gr × gas velocity) ÷ (7,000 × gun lb); energy = gun lb × velocity² ÷ (2 × 32.174). Gas velocity ≈ 4,000 fps for rifles and ~1.5 × MV for shotguns; shotgun ejecta adds ~40 gr of wad. Muzzle brakes, gas guns and recoil pads reduce felt recoil." + SAFETY + " " + DISCLAIMER,
    faq: [
      { question: "How much recoil is too much?", answer: "Many shooters find 15–20 ft-lb comfortable for practice; 30+ is hard to shoot well." },
      { question: "Does a heavier gun reduce recoil?", answer: "Yes — recoil energy falls in proportion to gun weight." },
    ],
  },
  {
    slug: "scope-height-calculator",
    title: "Scope Height Calculator",
    description: "Work out your scope's sight height over bore and whether the objective bell clears the barrel with your rings.",
    metaTitle: "Scope Height Calculator — Sight Height & Ring Clearance",
    metaDescription: "Free scope height calculator. Get sight height over bore for ballistic apps and check objective clearance for your ring height.",
    calcInputs: [numberField("railToBore", "Top of Rail to Bore Centreline (in)", { default: 0.65, max: 3, step: 0.01 }), numberField("ringHeight", "Ring Height — Rail to Scope Centre (in)", { default: 0.85, max: 3, step: 0.01 }), numberField("objectiveDiameter", "Objective Bell Outside Diameter (mm)", { default: 50, min: 20, max: 80 }), numberField("barrelDiameter", "Barrel Diameter under the Bell (in)", { default: 0.75, min: 0.3, max: 2, step: 0.01 }), numberField("capAllowance", "Lens-Cap Clearance (in)", { default: 0.1, max: 1, step: 0.05 })],
    calcResult: { label: "Sight Height", format: "number" },
    calcResults: [num("sightHeightIn", "Sight Height over Bore (in)", true), num("sightHeightMm", "Sight Height (mm)"), num("objectiveClearanceIn", "Objective Clearance (in)"), num("fits", "Scope Clears the Barrel (1 = yes)")],
    instructions: "Measure from the top of the rail to the bore centreline (bore centre is half the barrel diameter below the barrel top), and use the ring maker's centre height.",
    examples: "Example: 0.65\" rail-to-bore + 0.85\" rings = 1.50\" sight height. A 50 mm objective (outside diameter) over a 0.75\" barrel clears by about 0.04\" after a 0.1\" cap allowance — tight, consider higher rings.",
    assumptions: "Sight height = rail-to-bore + ring centre height. Clearance = sight height − half the objective bell diameter − half the barrel diameter − cap allowance. Use the actual bell outside diameter, which is larger than the lens size. Sight height matters for close-range holds in ballistic calculators. " + DISCLAIMER,
    faq: [
      { question: "What is a typical sight height?", answer: "About 1.5\" for a bolt rifle with a 40–50 mm scope; 2.5–2.8\" on an AR-15." },
      { question: "Are lower rings better?", answer: "As low as possible while clearing the barrel and fitting your cheek weld." },
    ],
  },
  {
    slug: "bullet-drop-calculator",
    title: "Bullet Drop Calculator",
    description: "Calculate bullet drop at any range — inches, MOA and MILs — plus remaining velocity, energy and time of flight.",
    metaTitle: "Bullet Drop Calculator — Drop, MOA & MIL",
    metaDescription: "Free bullet drop calculator. Get drop in inches, MOA and MILs plus velocity, energy and time of flight using a G1 model.",
    calcInputs: [...LOAD(), ...SIGHT(), numberField("range", "Target Range (yd)", { default: 500, min: 10, max: 2500 }), ...AIR()],
    calcResult: { label: "Drop", format: "number" },
    calcResults: [num("dropInches", "Drop vs Line of Sight (in, − = below)", true), num("dropMoa", "Hold / Dial (MOA)"), num("dropMil", "Hold / Dial (MIL)"), num("velocityFps", "Velocity at Range (fps)"), num("energyFtLb", "Energy at Range (ft-lb)"), num("timeOfFlight", "Time of Flight (s)")],
    instructions: "Enter the load (velocity, G1 BC, weight), sight height, zero range, target range and conditions.",
    examples: "Example: a .308 175 gr bullet (G1 0.505) at 2,600 fps, 100-yd zero → about 63\" low at 500 yd (12.1 MOA / 3.5 MIL), still 1,790 fps and 1,250 ft-lb.",
    assumptions: "Point-mass trajectory with the standard G1 drag function, air density from altitude and temperature (standard pressure, no humidity), flat fire. Results match published tables within a few percent; confirm with real dope at range." + SAFETY + " " + DISCLAIMER,
    faq: [
      { question: "What is a ballistic coefficient?", answer: "A measure of how well the bullet keeps its speed — higher BC means less drop and drift." },
      { question: "Why is drop negative?", answer: "It's measured from your line of sight — negative means the bullet strikes low, so hold or dial up." },
    ],
  },
  {
    slug: "ballistic-coefficient-calculator",
    title: "Ballistic Coefficient Calculator",
    description: "Calculate a bullet's G1 ballistic coefficient from two chronograph velocities — or from sectional density and form factor.",
    metaTitle: "Ballistic Coefficient Calculator — G1 BC",
    metaDescription: "Free ballistic coefficient calculator. Find G1 BC from near and far velocities, or from sectional density and form factor.",
    calcInputs: [dropdown("method", "Method", [["Two velocities (chronograph)", 1], ["Sectional density ÷ form factor", 2]], 1), numberField("velocityNear", "Velocity at Muzzle / Near (fps)", { default: 2700, min: 300, max: 5000 }), numberField("velocityFar", "Velocity Downrange (fps)", { default: 2450, min: 100, max: 5000 }), numberField("distance", "Distance Between Readings (yd)", { default: 100, min: 10, max: 1500 }), numberField("bulletWeight", "Bullet Weight (grains)", { default: 168, min: 1, max: 1000 }), numberField("diameter", "Bullet Diameter (in)", { default: 0.308, min: 0.1, max: 1, step: 0.001 }), numberField("formFactor", "Form Factor (i)", { default: 0.55, min: 0.3, max: 2, step: 0.01 }), ...AIR()],
    calcResult: { label: "BC", format: "number" },
    calcResults: [num("ballisticCoefficient", "G1 Ballistic Coefficient", true, 3), num("sectionalDensity", "Sectional Density", false, 3)],
    instructions: "For the velocity method, chronograph at the muzzle and again downrange (or use radar data). Otherwise enter weight, diameter and a form factor.",
    examples: "Example: 2,700 fps falling to 2,450 fps over 100 yd → G1 BC ≈ 0.36. A 168 gr .308 has a sectional density of 0.253; with form factor 0.55, BC ≈ 0.46.",
    assumptions: "Velocity method: solves the G1 point-mass model for the BC that matches the velocity loss. SD = grains ÷ 7,000 ÷ diameter²; BC = SD ÷ form factor. BC varies with velocity — makers often quote several bands. G7 BCs are much smaller numbers and not comparable with G1. " + DISCLAIMER,
    faq: [
      { question: "G1 or G7?", answer: "G7 fits modern boat-tail long-range bullets better; G1 is still most common on boxes." },
      { question: "Why is my measured BC lower than advertised?", answer: "Advertised BCs are often optimistic or measured at different velocities." },
    ],
  },
  {
    slug: "bdc-calculator",
    title: "BDC Calculator",
    description: "Match your BDC reticle's holdover marks to real ranges for your load — including second-focal-plane magnification scaling.",
    metaTitle: "BDC Calculator — Reticle Holdover Ranges",
    metaDescription: "Free BDC calculator. Find the range each bullet drop compensator reticle mark corresponds to for your bullet and velocity.",
    calcInputs: [...LOAD(), ...SIGHT(), numberField("mark1Moa", "Mark 1 Subtension (MOA below centre)", { default: 4, max: 60, step: 0.1 }), numberField("mark2Moa", "Mark 2 Subtension (MOA)", { default: 8, max: 60, step: 0.1 }), numberField("mark3Moa", "Mark 3 Subtension (MOA)", { default: 12, max: 60, step: 0.1, required: false }), numberField("mark4Moa", "Mark 4 Subtension (MOA)", { default: 16, max: 60, step: 0.1, required: false }), numberField("designMagnification", "Reticle Design Magnification (SFP, 0 = FFP)", { default: 0, max: 40, required: false }), numberField("magnification", "Magnification You'll Use", { default: 0, max: 40, required: false }), ...AIR()],
    calcResult: { label: "Mark 1 Range", format: "number" },
    calcResults: [num("mark1Range", "Mark 1 Range (yd)", true), num("mark2Range", "Mark 2 Range (yd)"), num("mark3Range", "Mark 3 Range (yd)"), num("mark4Range", "Mark 4 Range (yd)")],
    instructions: "Get each holdover mark's subtension (in MOA) from the scope manual. For second-focal-plane scopes enter the design magnification and the power you'll use.",
    examples: "Example: .308 175 gr at 2,600 fps with a 100-yd zero → marks at 4, 8, 12 and 16 MOA correspond to about 267, 390, 497 and 592 yd.",
    assumptions: "Uses the same G1 point-mass trajectory as the Bullet Drop Calculator and finds where the drop angle equals each mark. SFP reticles change subtension with magnification (subtension × design ÷ current power). Confirm on paper at each range. Marks out of range show 0." + SAFETY + " " + DISCLAIMER,
    faq: [
      { question: "What is a BDC reticle?", answer: "A reticle with marks below the crosshair for holding over at longer ranges." },
      { question: "Why don't my marks match the box?", answer: "BDCs are designed for one 'typical' load and zero; your velocity, BC and sight height change the ranges." },
    ],
  },
  {
    slug: "point-blank-range-calculator",
    title: "Point Blank Range Calculator",
    description: "Find your maximum point blank range (MPBR) and the best zero so the bullet stays inside the vital zone without holdover.",
    metaTitle: "Point Blank Range Calculator — MPBR & Best Zero",
    metaDescription: "Free maximum point blank range calculator. Get MPBR, the optimal zero range and near zero for any vital-zone size.",
    calcInputs: [numberField("muzzleVelocity", "Muzzle Velocity (fps)", { default: 2900, min: 300, max: 5000 }), numberField("bc", "Ballistic Coefficient (G1)", { default: 0.4, min: 0.05, max: 1.5, step: 0.001 }), numberField("sightHeight", "Sight Height (in)", { default: 1.5, max: 5, step: 0.05 }), numberField("vitalZone", "Vital Zone Diameter (in)", { default: 6, min: 1, max: 20, step: 0.5 }), ...AIR()],
    calcResult: { label: "MPBR", format: "number" },
    calcResults: [num("maxPointBlankRange", "Maximum Point Blank Range (yd)", true), num("bestZeroRange", "Best Zero Range (yd)"), num("nearZero", "Near Zero (yd)"), num("peakHeightAt", "Highest Point At (yd)")],
    instructions: "Enter your load and the size of the target's vital zone (about 6\" for deer, 3–4\" for varmints).",
    examples: "Example: 2,900 fps and G1 0.40 with a 6\" vital zone → MPBR about 280 yd with a 240-yard zero (bullet peaks near 3\" high around 135 yd).",
    assumptions: "Searches zero ranges in 5-yd steps for the longest distance at which the bullet stays within ± half the vital zone of the line of sight. G1 point-mass model, standard conditions. Hold dead-on inside MPBR; beyond it, hold over." + SAFETY + " " + DISCLAIMER,
    faq: [
      { question: "What is point blank range?", answer: "The distance over which you can aim at the centre of the target and still hit the vital zone." },
      { question: "Is MPBR a good hunting zero?", answer: "It's popular for fast shots, but some prefer a 100- or 200-yard zero and known holds." },
    ],
  },
  {
    slug: "zeroing-calculator",
    title: "Zeroing Calculator",
    description: "Calculate how many scope clicks to move your group onto the aim point — elevation and windage in MOA or MIL.",
    metaTitle: "Zeroing Calculator — Scope Clicks to Adjust",
    metaDescription: "Free scope zeroing calculator. Turn group offset and distance into elevation and windage clicks for MOA or MIL turrets.",
    calcInputs: [numberField("distance", "Distance to Target", { default: 100, min: 1, max: 2000 }), dropdown("distanceUnit", "Distance Unit", [["yards", 1], ["metres", 2]], 1), numberField("verticalOffset", "Group Position Vertically (in, + high / − low)", { default: 2, min: -100, max: 100, step: 0.1 }), numberField("horizontalOffset", "Group Position Horizontally (in, + right / − left)", { default: -1.5, min: -100, max: 100, step: 0.1 }), dropdown("clickValue", "Turret Click Value", [["1/4 MOA", 1], ["1/8 MOA", 2], ["1/2 MOA", 3], ["1 MOA", 4], ["0.1 MIL", 5], ["0.05 MIL", 6]], 1)],
    calcResult: { label: "Elevation Clicks", format: "number" },
    calcResults: [num("elevationClicks", "Elevation Clicks (+ up / − down)", true), num("windageClicks", "Windage Clicks (+ right / − left)"), num("elevationAngle", "Elevation Change (MOA or MIL)"), num("windageAngle", "Windage Change (MOA or MIL)")],
    instructions: "Shoot a group, measure how far its centre is from your aim point (in inches) and enter the distance and your turret's click value.",
    examples: "Example: at 100 yd the group is 2\" high and 1.5\" left. With ¼-MOA clicks: 8 clicks down and 6 clicks right.",
    assumptions: "1 MOA = 1.047\" at 100 yd; 1 MIL = 3.6\" at 100 yd. Clicks = offset ÷ (angle size at that distance) ÷ click value, rounded. Move the reticle toward where you want the bullets to go (dial 'up' raises impacts)." + SAFETY + " " + DISCLAIMER,
    faq: [
      { question: "Should I zero at 25 yards?", answer: "A 25-yd zero is handy to get on paper; confirm at your real zero distance." },
      { question: "MOA or MIL?", answer: "Either works — use the same unit for the reticle and turrets." },
    ],
  },
  {
    slug: "windage-calculator",
    title: "Windage Calculator",
    description: "Calculate wind drift for a rifle shot — inches, MOA and MIL to hold or dial for any wind speed and direction.",
    metaTitle: "Windage Calculator — Wind Drift & Hold",
    metaDescription: "Free windage calculator. Get bullet wind drift in inches, MOA and MIL from wind speed, clock direction, range and load.",
    calcInputs: [...LOAD(), ...SIGHT(), numberField("range", "Target Range (yd)", { default: 500, min: 10, max: 2500 }), numberField("windSpeed", "Wind Speed (mph)", { default: 10, max: 60 }), numberField("windClock", "Wind Direction (clock: 3 or 9 = full value)", { default: 3, max: 12, step: 0.5 }), ...AIR()],
    calcResult: { label: "Drift", format: "number" },
    calcResults: [num("driftInches", "Wind Drift (in)", true), num("driftMoa", "Hold (MOA)"), num("driftMil", "Hold (MIL)"), num("crosswindMph", "Crosswind Component (mph)"), num("timeOfFlight", "Time of Flight (s)")],
    instructions: "Enter your load, the range and the wind speed and direction as a clock face (12 = from the target toward you, 3 = from your right).",
    examples: "Example: .308 175 gr at 2,600 fps, 10 mph full-value wind at 500 yd → about 21\" of drift (4.0 MOA / 1.16 MIL).",
    assumptions: "Didion lag rule: drift = crosswind × (time of flight − range ÷ muzzle velocity), with time of flight from the G1 point-mass model. Crosswind = speed × |sin(clock angle)| (1–2 o'clock ≈ half value, 3 o'clock full). Spin drift and Coriolis aren't included." + SAFETY + " " + DISCLAIMER,
    faq: [
      { question: "What does full-value wind mean?", answer: "Wind blowing straight across the bullet's path (3 or 9 o'clock)." },
      { question: "Why do high-BC bullets drift less?", answer: "They lose speed more slowly, so there's less lag time for the wind to act." },
    ],
  },
];
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_SLUG } });
  if (!parent) throw new Error(`The "${PARENT_SLUG}" category doesn't exist yet — create it in /admin first.`);
  console.log(`Creating sub-category "${cat.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory(CATEGORY);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
