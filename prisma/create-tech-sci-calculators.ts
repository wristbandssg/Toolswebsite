// One-time (but safe to re-run) batch setup script: 5 science & engineering tools from the tech keyword
// check (15 Nov 2026 — Claude outputs/Tech_Keyword_Check.md): Science > Biology & Lab (1), Mechanical
// & Structural Engineering (3), Earth, Weather & Environment (1). Formulas: calc-engine-tech-sci.ts.
//
// HOW TO RUN
//   npm run db:create-tech-sci-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-tech-sci";
import { mk, num, dd, tx, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.techSciCustomCalculators;

const BIO: ToolDef[] = [
  mk({
    slug: "primer-tm-calculator", title: "Primer Tm Calculator (Melting Temperature, Nearest-Neighbour)",
    meta: "Primer Tm Calculator — PCR Primer Melting Temperature",
    desc: "Calculate a PCR primer's melting temperature (Tm) with the SantaLucia nearest-neighbour method, corrected for Na⁺, Mg²⁺, dNTPs and primer concentration. Also gives the basic Wallace and salt-adjusted Tm, GC content, ΔG, a starting annealing temperature and design warnings.",
    inputs: [tx("seq", "Primer Sequence (5′ → 3′)", "AGCGGATAACAATTTCACACAGG"), num("na", "Na⁺ / K⁺ (mM)", 50, 0, 2000, 1, "mM"), num("mg", "Mg²⁺ (mM)", 1.5, 0, 100, 0.1, "mM"), num("dntp", "dNTPs (mM total)", 0.2, 0, 50, 0.01, "mM"), num("conc", "Primer Concentration (nM)", 250, 0.1, 1e6, 1, "nM")],
    results: [["tm", "Tm — Nearest-Neighbour (°C)", "n", 1], ["ta", "Suggested Annealing Temperature", "t"], ["gc", "GC Content (%)", "n", 1], ["length", "Length (nt)", "n", 0], ["salt", "Tm — Salt-Adjusted Formula (°C)", "n", 1], ["wallace", "Tm — Wallace Rule (°C)", "n", 1], ["dg", "ΔG at 37 °C (kcal/mol)", "n", 2], ["notes", "Primer Checks", "t"]],
    fn: C["primer-tm-calculator"], ex: { ...T("seq", "AGCGGATAACAATTTCACACAGG"), na: 50, mg: 1.5, dntp: 0.2, conc: 250 },
    exText: (o) => `Example: the M13 reverse primer (23 nt, ${o.gc}% GC) has a nearest-neighbour Tm of about ${o.tm} °C in a standard PCR buffer, so start annealing near ${String(o.ta).split(" ")[0]} °C.`,
    how: "Paste the primer from 5′ to 3′. The nearest-neighbour method adds up the stacking energy of each base pair with its neighbour, which is more accurate than simple GC counting. Salt stabilises DNA and Mg²⁺ has a strong effect, so enter your buffer's real concentrations.\n\nGood primers are usually 18–30 nt with 40–60% GC, a Tm of 55–65 °C and the pair within 2–5 °C of each other.",
    assume: "SantaLucia (1998) unified parameters, von Ahsen Mg²⁺ correction and Tm = ΔH/(ΔS + R ln(Ct/4)). Polymerase vendors (e.g. NEB for Q5/Phusion) use their own buffer-specific rules, so their Tm can differ by a few degrees. A, C, G, T only.",
    faq: [["How do I calculate primer Tm?", "For short primers, Tm ≈ 2 × (A+T) + 4 × (G+C). For accuracy, use nearest-neighbour thermodynamics with salt correction, as here."], ["What annealing temperature should I use?", "Start about 5 °C below the lower primer Tm and optimise with a gradient PCR."]],
  }),
];

const MECH: ToolDef[] = [
  mk({
    slug: "tolerance-stack-up-calculator", title: "Tolerance Stack-Up Calculator (Worst Case & RSS)",
    meta: "Tolerance Stack-Up Calculator — Worst Case vs RSS Gap",
    desc: "Add up a chain of dimensions and their ± tolerances to get the nominal gap, the worst-case range and the statistical root-sum-square (RSS) range. Shows the share of assemblies likely to fall below a minimum gap and the biggest contributor.",
    inputs: [tx("dims", "Dimensions with Sign & ± Tolerance (separate with ;)", "+50 ±0.1; -20 ±0.05; -29.8 ±0.08"), num("min", "Minimum Allowed Gap", 0, -1e6, 1e6, 0.001)],
    results: [["nominal", "Nominal Gap", "n", 6], ["worst", "Worst-Case Range", "t"], ["rss", "RSS (Statistical) Range", "t"], ["wcOk", "Worst-Case Check", "t"], ["fail", "Statistical Fallout", "t"], ["biggest", "Biggest Contributor", "t"], ["count", "Dimensions", "n", 0]],
    fn: C["tolerance-stack-up-calculator"], ex: { ...T("dims", "+50 ±0.1; -20 ±0.05; -29.8 ±0.08"), min: 0 },
    exText: (o) => `Example: a 50 ±0.1 housing holding parts of 20 ±0.05 and 29.8 ±0.08 leaves a nominal gap of ${o.nominal}. Worst case ${o.worst}; RSS ${o.rss}.`,
    how: "Walk round the loop from one side of the gap to the other. Dimensions that increase the gap are +, ones that reduce it are −. Worst case adds every tolerance, so every part is assumed at its limit at the same time. RSS assumes the variations are random and independent, so they partly cancel: ±√(t₁² + t₂² + …).\n\nUse worst case for safety-critical or low-volume parts, and RSS for high-volume production with capable processes.",
    assume: "RSS treats each tolerance as ±3σ of a centred normal distribution. Geometric tolerances (position, flatness) need converting into equivalent ± values first.",
    faq: [["What is the difference between worst case and RSS?", "Worst case is guaranteed but often too strict. RSS is a statistical estimate that's usually much tighter for 4+ parts."]],
  }),
  mk({
    slug: "bearing-fault-frequency-calculator", title: "Bearing Fault Frequency Calculator (BPFO, BPFI, BSF & FTF)",
    meta: "Bearing Frequency Calculator — BPFO, BPFI, BSF, FTF",
    desc: "Calculate rolling-bearing defect frequencies (outer race BPFO, inner race BPFI, ball spin BSF and cage FTF) from shaft speed and bearing geometry, in Hz, CPM and orders of running speed, for vibration analysis.",
    inputs: [num("rpm", "Shaft Speed (rpm)", 1780, 1, 1e6, 1, "rpm"), num("balls", "Number of Rolling Elements", 9, 3, 200, 1), num("bd", "Ball / Roller Diameter (mm)", 7.94, 0.01, 1000, 0.01, "mm"), num("pd", "Pitch Diameter (mm)", 39.04, 0.1, 10000, 0.01, "mm"), num("angle", "Contact Angle (°)", 0, 0, 60, 0.5, "°")],
    results: [["bpfo", "BPFO — Outer Race (Hz)", "n", 3], ["bpfi", "BPFI — Inner Race (Hz)", "n", 3], ["bsf", "BSF — Ball Spin (Hz)", "n", 3], ["ftf", "FTF — Cage (Hz)", "n", 3], ["shaft", "Shaft Frequency (Hz)", "n", 3], ["detail", "All Frequencies", "t"]],
    fn: C["bearing-fault-frequency-calculator"], ex: { rpm: 1780, balls: 9, bd: 7.94, pd: 39.04, angle: 0 },
    exText: (o) => `Example: a 9-ball bearing (7.94 mm balls on a 39.04 mm pitch circle) at 1,780 rpm has BPFO = ${o.bpfo} Hz and BPFI = ${o.bpfi} Hz.`,
    how: "Get the ball count, ball diameter, pitch diameter (the circle through the ball centres) and contact angle from the bearing maker. Each damaged part produces its own repeating impact frequency.\n\nLook for these frequencies and their harmonics in an FFT or envelope spectrum. Inner-race defects often show sidebands spaced at shaft speed; ball defects show at 2 × BSF with cage sidebands.",
    assume: "Pure rolling with no slip. Real peaks can sit 1–2% from the calculated values. The contact angle is 0° for deep-groove ball bearings under radial load.",
    faq: [["What is BPFO?", "Ball pass frequency outer: how often a rolling element passes a fixed point on the outer race. It's about 0.4 × number of balls × shaft speed."], ["Why is BPFI higher than BPFO?", "The inner race turns with the shaft, so the balls pass a given point on it more often."]],
  }),
  mk({
    slug: "vibration-conversion-calculator", title: "Vibration Conversion Calculator (Displacement, Velocity & Acceleration)",
    meta: "Vibration Calculator — Convert mm/s, in/s, g & µm pk-pk",
    desc: "Convert vibration amplitude between displacement (µm or mils peak-to-peak), velocity (mm/s or in/s, RMS or peak) and acceleration (g or m/s²) at a given frequency, with an ISO 10816 severity zone.",
    inputs: [num("value", "Value", 4.5, 0, 1e9, 0.0001), dd("unit", "Measured As", E.VIB_UNITS.map(([l]) => l), 3), num("hz", "Frequency (Hz)", 29.67, 0.01, 1e6, 0.01, "Hz")],
    results: [["vel", "Velocity", "t"], ["disp", "Displacement", "t"], ["acc", "Acceleration", "t"], ["vrms", "Velocity (mm/s RMS)", "n", 3], ["zone", "ISO 10816-3 Zone (group 2, rigid)", "t"], ["cpm", "Frequency (CPM)", "n", 1]],
    fn: C["vibration-conversion-calculator"], ex: { value: 4.5, unit: 3, hz: 29.67 },
    exText: (o) => `Example: 4.5 mm/s RMS at 29.67 Hz (1,780 rpm) is ${o.disp} and ${o.acc}.`,
    how: "For a sine wave, velocity = 2πf × displacement and acceleration = (2πf)² × displacement. So the same machine reads very differently depending on what you measure and at what frequency. Low frequencies show up best as displacement, and high frequencies as acceleration.\n\nRMS = peak ÷ √2 and peak-to-peak = 2 × peak.",
    assume: "Single-frequency (sinusoidal) vibration. The zone uses ISO 10816-3 boundaries for medium machines (15–300 kW) on rigid foundations; other classes differ.",
    faq: [["How do I convert g to mm/s?", "v (mm/s) = a (m/s²) ÷ (2πf) × 1000. 1 g at 100 Hz is about 15.6 mm/s peak."], ["What vibration level is acceptable?", "For a medium machine on a rigid base, below 2.8 mm/s RMS is fine for continuous running, and above 4.5 mm/s is severe."]],
  }),
];

const EARTH: ToolDef[] = [
  mk({
    slug: "e6b-flight-calculator", title: "E6B Flight Calculator (Wind Triangle, Heading, Time & Fuel)",
    meta: "E6B Flight Computer — Wind Correction, Ground Speed & Fuel",
    desc: "An online E6B flight computer for flight planning: from true airspeed, true course and wind, get the wind correction angle, true, magnetic and compass heading, ground speed, time en route and fuel burn for each nav log leg.",
    inputs: [num("tas", "True Airspeed (kt)", 120, 1, 2000, 1, "kt"), num("tc", "True Course (°)", 90, 0, 360, 1, "°"), num("wd", "Wind Direction — From (° true)", 30, 0, 360, 1, "°"), num("ws", "Wind Speed (kt)", 20, 0, 500, 1, "kt"), num("dist", "Leg Distance (nm)", 150, 0, 20000, 0.1, "nm"), num("burn", "Fuel Burn (gal/h)", 9, 0, 10000, 0.1, "gph"), num("var", "Magnetic Variation (° East +, West −)", 0, -180, 180, 0.1, "°"), num("dev", "Compass Deviation (°)", 0, -30, 30, 0.1, "°")],
    results: [["gs", "Ground Speed (kt)", "n", 1], ["th", "True Heading (°)", "n", 1], ["wca", "Wind Correction Angle (°)", "n", 1], ["mh", "Magnetic Heading (°)", "n", 1], ["ch", "Compass Heading (°)", "n", 1], ["time", "Time En Route", "t"], ["fuel", "Fuel Required (gal)", "n", 1], ["comps", "Wind Components", "t"]],
    fn: C["e6b-flight-calculator"], ex: { tas: 120, tc: 90, wd: 30, ws: 20, dist: 150, burn: 9, var: 0, dev: 0 },
    exText: (o) => `Example: 120 kt TAS on a 090° course with wind 030° at 20 kt needs a heading of ${o.th}° (WCA ${o.wca}°). Ground speed is ${o.gs} kt, so 150 nm takes ${o.time} and ${o.fuel} gal.`,
    how: "Enter the wind as reported: the direction it blows FROM, relative to true north. The calculator solves the wind triangle: the angle to point into the wind, and the resulting speed over the ground.\n\nThen apply variation (east is least: subtract east, add west) for the magnetic heading, and deviation for the compass heading. Repeat for each leg of your nav log.",
    assume: "Steady wind for the leg. Fuel excludes taxi, climb and the legally required reserve. This is a planning aid only; always cross-check with official tools.",
    faq: [["How do I calculate wind correction angle?", "WCA = arcsin(wind speed × sin(wind angle) ÷ TAS). The calculator does it for you, with the sign for left or right."], ["East is least, west is best?", "Subtract easterly variation and add westerly variation when converting true to magnetic."]],
  }),
];

async function main() {
  const all = [...BIO, ...MECH, ...EARTH];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  await upsertTools("biology-lab-calculators", BIO);
  await upsertTools("mechanical-structural-engineering-calculators", MECH);
  await upsertTools("earth-weather-environment-calculators", EARTH);
}
main().catch((e) => { console.error(e); process.exit(1); });
