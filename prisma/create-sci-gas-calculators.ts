// One-time (but safe to re-run) batch setup script: creates 12 calculators in Science Calculators >
// Chemistry Calculators (gas laws & chemical thermodynamics). Formulas live in
// src/lib/calc-engine-sci-gas.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-science-category.ts --apply)
//   npx tsx prisma/create-sci-gas-calculators.ts        (SCI_DRY=1 → check only, no database)
// or
//   npm run db:create-sci-gas-calculators

import * as E from "../src/lib/calc-engine-sci-gas";
import { mk, num, pn, tx, dd, T, runBatch, type ToolDef } from "./sci-tool-kit";

const CAT = "chemistry-calculators";
const BIG = 1e40;
const TC = (key: string, label: string, def: number) => num(key, label, def, -273.15, 1e6, 0.1, "°C");

const TOOLS: ToolDef[] = [
  mk({
    slug: "combined-gas-law-calculator", title: "Combined Gas Law Calculator (Boyle's, Charles's & Gay-Lussac's)",
    desc: "Solve the combined gas law P₁V₁/T₁ = P₂V₂/T₂ for final pressure, volume or temperature — it also covers Boyle's, Charles's and Gay-Lussac's laws.",
    meta: "Combined Gas Law Calculator — Boyle's Law & Charles's Law",
    inputs: [dd("solve", "Solve For", E.CGL_SOLVE, 1), pn("p1", "Initial Pressure P₁", 100, "kPa", BIG), pn("v1", "Initial Volume V₁", 10, "L", BIG), TC("t1", "Initial Temperature T₁", 25), pn("p2", "Final Pressure P₂", 200, "kPa", BIG), pn("v2", "Final Volume V₂", 6, "L", BIG), TC("t2", "Final Temperature T₂", 25)],
    results: [["result", "Result", "n", 10], ["kelvin", "Temperature (K)", "n", 10], ["law", "Law Applied", "t"], ["constant", "P·V/T", "n", 8]],
    fn: E.combinedGas, ex: { solve: 1, p1: 100, v1: 10, t1: 25, p2: 200, v2: 6, t2: 25 },
    exText: (o) => `Example: 10 L at 100 kPa compressed to 200 kPa at constant temperature → ${o.result} L.`,
    how: "P₁V₁/T₁ = P₂V₂/T₂ with T in kelvin. Constant T gives Boyle's law, constant P Charles's law, constant V Gay-Lussac's law.",
    assume: "Fixed amount of ideal gas; any pressure and volume units, used consistently.",
    faq: [["Why must temperature be in kelvin?", "Gas laws are proportional to absolute temperature — °C would give wrong ratios."]],
  }),
  mk({
    slug: "enthalpy-calculator", title: "Enthalpy Change Calculator (ΔH, Hess's Law, Bond Energies)",
    desc: "Calculate the enthalpy change of a reaction from heats of formation (Hess's law), from bond energies, or from calorimetry data.",
    inputs: [dd("mode", "Method", E.ENTH_MODE, 0), tx("hp", "Products ΔHf° (kJ/mol)", "-393.5 -285.8"), tx("np", "Products Coefficients", "1 2"), tx("hr", "Reactants ΔHf° (kJ/mol)", "-74.8 0"), tx("nr", "Reactants Coefficients", "1 2"), tx("broken", "Bond Energies Broken (kJ/mol)", "413 413 413 413 498 498"), tx("formed", "Bond Energies Formed (kJ/mol)", "799 799 463 463 463 463"), pn("mass", "Solution Mass", 100, "g", BIG), pn("c", "Specific Heat", 4.184, "J/(g·°C)", 100), num("dT", "Temperature Rise ΔT", 5.5, -1e4, 1e4, 0.01, "°C"), pn("n", "Moles Reacted", 0.05, "mol", BIG)],
    results: [["dH", "ΔH (kJ or kJ/mol)", "n", 8], ["kind", "Reaction", "t"], ["detail", "Calculation", "t"]],
    fn: E.enthalpy, ex: { mode: 0, mass: 100, c: 4.184, dT: 5.5, n: 0.05, ...T("hp", "-393.5 -285.8"), ...T("np", "1 2"), ...T("hr", "-74.8 0"), ...T("nr", "1 2"), ...T("broken", "413 413 413 413 498 498"), ...T("formed", "799 799 463 463 463 463") },
    exText: (o) => `Example: CH₄ + 2O₂ → CO₂ + 2H₂O → ΔH = ${o.dH} kJ.`,
    how: "Hess: ΔH = ΣnΔHf(products) − ΣnΔHf(reactants). Bonds: ΔH = Σ broken − Σ formed. Calorimetry: ΔH = −mcΔT/n.",
    assume: "Elements in their standard state have ΔHf° = 0. Bond energies are averages.",
    faq: [["Negative ΔH means?", "Exothermic — heat is released."]],
  }),
  mk({
    slug: "ideal-gas-law-calculator", title: "Ideal Gas Law Calculator (PV = nRT)",
    desc: "Solve PV = nRT for pressure, volume, moles or temperature — with gas mass and density when you give a formula or molar mass.",
    meta: "Ideal Gas Law Calculator — PV = nRT for P, V, n or T",
    inputs: [dd("solve", "Solve For", E.IG_SOLVE, 1), pn("P", "Pressure P", 101.325, "kPa", BIG), pn("V", "Volume V", 22.4, "L", BIG), pn("n", "Amount n", 1, "mol", BIG), TC("T", "Temperature T", 0), tx("formula", "Gas Formula (optional)", "CO2"), pn("mw", "Molar Mass (if no formula)", 0, "g/mol", 1e6)],
    results: [["result", "Result", "n", 10], ["kelvin", "Temperature (K)", "n", 10], ["atm", "Pressure (atm)", "n", 8], ["mass", "Mass of Gas (g)", "n", 8], ["density", "Density (g/L)", "n", 8]],
    fn: E.idealGas, ex: { solve: 1, P: 101.325, V: 22.4, n: 1, T: 0, mw: 0, ...T("formula", "CO2") },
    exText: (o) => `Example: 1 mol of CO₂ at 0 °C and 1 atm → V = ${o.result} L (${o.mass} g).`,
    how: "PV = nRT with R = 8.314 L·kPa/(mol·K). Density = PM/(RT).",
    assume: "Ideal gas; for high pressure use the van der Waals calculator.",
    faq: [["R in other units?", "0.08206 L·atm/(mol·K), 8.314 J/(mol·K), 62.36 L·mmHg/(mol·K)."]],
  }),
  mk({
    slug: "stp-calculator", title: "STP Gas Volume Calculator (Molar Volume)",
    desc: "Convert moles of gas to volume at STP and back, or correct a measured gas volume to standard temperature and pressure.",
    inputs: [dd("mode", "Calculate", E.STP_MODE, 0), dd("std", "STP Definition", E.STP_STD, 0), pn("n", "Moles", 1, "mol", BIG), pn("V", "Volume", 10, "L", BIG), pn("P", "Measured Pressure", 95, "kPa", BIG), TC("T", "Measured Temperature", 25)],
    results: [["result", "Result", "n", 10], ["note", "Unit", "t"], ["moles", "Moles", "n", 10], ["Vm", "Molar Volume (L/mol)", "n", 8]],
    fn: E.stp, ex: { mode: 0, std: 0, n: 1, V: 10, P: 95, T: 25 },
    exText: (o) => `Example: 1 mol of gas at STP → ${o.result} L.`,
    how: "V = n × V_m; V_STP = V·(P/P_std)·(273.15/T).",
    assume: "Ideal gas behaviour.",
    faq: [["22.4 or 22.7 L?", "22.414 L at 1 atm (old STP), 22.711 L at 100 kPa (IUPAC since 1982)."]],
  }),
  mk({
    slug: "specific-heat-calculator", title: "Specific Heat & Calorimetry Calculator (q = mcΔT)",
    desc: "Solve q = mcΔT for heat, mass, specific heat capacity or temperature change — with common materials built in.",
    inputs: [dd("solve", "Solve For", E.HEAT_SOLVE, 0), dd("material", "Material", E.MATERIAL_NAMES, 1), pn("c", "Specific Heat c (custom)", 4.184, "J/(g·°C)", 1e4), num("q", "Heat q", 20920, -BIG, BIG, 0.01, "J"), pn("m", "Mass m", 100, "g", BIG), num("dT", "Temperature Change ΔT", 50, -1e6, 1e6, 0.01, "°C")],
    results: [["result", "Result", "n", 10], ["kj", "Heat (kJ)", "n", 8], ["kcal", "Heat (kcal)", "n", 8], ["kwh", "Heat (kWh)", "n", 8], ["cUsed", "Specific Heat (J/(g·°C))", "n", 6]],
    fn: E.specificHeat, ex: { solve: 0, material: 1, c: 4.184, q: 20920, m: 100, dT: 50 },
    exText: (o) => `Example: heating 100 g of water by 50 °C → q = ${o.result} J.`,
    how: "q = m·c·ΔT. Solve for c = q/(mΔT) from a calorimetry experiment.",
    assume: "No phase change; c constant over the range.",
    faq: [["Why does water heat slowly?", "Its specific heat (4.18 J/g°C) is unusually high."]],
  }),
  mk({
    slug: "partial-pressure-calculator", title: "Partial Pressure Calculator (Dalton's Law)",
    desc: "Calculate each gas's partial pressure and mole fraction from moles and total pressure — or the total pressure from partial pressures.",
    inputs: [tx("moles", "Moles of Each Gas", "0.78 0.21 0.01"), pn("P", "Total Pressure", 101.325, "kPa", BIG), tx("pressures", "Or Partial Pressures (optional)", "")],
    results: [["table", "Partial Pressures", "t"], ["total", "Total Pressure", "n", 10], ["first", "Partial Pressure of Gas 1", "n", 10]],
    fn: E.partialPressure, ex: { P: 101.325, ...T("moles", "0.78 0.21 0.01"), ...T("pressures", "") },
    exText: (o) => `Example: air at 101.325 kPa → N₂ partial pressure ${o.first} kPa.`,
    how: "Dalton: P_total = ΣPᵢ; Pᵢ = χᵢ·P_total with χᵢ = nᵢ/Σn.",
    assume: "Ideal gas mixture.",
    faq: [["Partial pressure of O₂ at sea level?", "About 21 kPa (0.21 atm)."]],
  }),
  mk({
    slug: "entropy-calculator", title: "Entropy Change Calculator (ΔS)",
    desc: "Calculate entropy change for reversible heat flow, heating, phase changes, reactions from standard entropies, or ideal gas expansion.",
    inputs: [dd("mode", "Process", E.ENTROPY_MODE, 2), num("q", "Heat q", 1000, -BIG, BIG, 0.01, "J"), TC("T", "Temperature (or initial T)", 100), TC("T2", "Final Temperature", 80), pn("m", "Mass", 100, "g", BIG), pn("c", "Specific Heat", 4.184, "J/(g·°C)", 1e4), num("dH", "Enthalpy of Phase Change", 40.65, -1e6, 1e6, 0.01, "kJ/mol"), tx("sp", "Products S° (J/(mol·K))", "213.8 69.9"), tx("np", "Products Coefficients", "1 2"), tx("sr", "Reactants S°", "186.3 205.2"), tx("nr", "Reactants Coefficients", "1 2"), pn("n", "Moles of Gas", 1, "mol", BIG), pn("V1", "Initial Volume", 1, "L", BIG), pn("V2", "Final Volume", 2, "L", BIG)],
    results: [["dS", "ΔS (J/K or J/(mol·K))", "n", 8], ["kj", "ΔS (kJ/K)", "n", 8], ["sign", "Meaning", "t"]],
    fn: E.entropy, ex: { mode: 2, q: 1000, T: 100, T2: 80, m: 100, c: 4.184, dH: 40.65, n: 1, V1: 1, V2: 2, ...T("sp", "213.8 69.9"), ...T("np", "1 2"), ...T("sr", "186.3 205.2"), ...T("nr", "1 2") },
    exText: (o) => `Example: boiling water at 100 °C (ΔHvap 40.65 kJ/mol) → ΔS = ${o.dS} J/(mol·K).`,
    how: "ΔS = q_rev/T; heating ΔS = mc·ln(T₂/T₁); phase change ΔS = ΔH/T; reaction ΔS° = ΣnS°(products) − ΣnS°(reactants); gas ΔS = nR ln(V₂/V₁).",
    assume: "Temperatures converted to kelvin.",
    faq: [["Can entropy decrease?", "Locally yes, but the total entropy of system + surroundings never decreases."]],
  }),
  mk({
    slug: "boiling-point-calculator", title: "Boiling Point Calculator (Altitude & Pressure)",
    desc: "Find the boiling point of water at any altitude or pressure, or of any liquid at a new pressure using the Clausius-Clapeyron equation.",
    meta: "Boiling Point Calculator — Water at Altitude & Pressure",
    inputs: [dd("mode", "Calculate", E.BP_MODE, 0), num("alt", "Altitude", 1500, -500, 40000, 1, "m"), pn("P", "Pressure", 101.325, "kPa", 1e5), TC("Tb", "Normal Boiling Point (liquid)", 78.37), pn("dH", "Enthalpy of Vaporisation", 38.56, "kJ/mol", 1e4)],
    results: [["T", "Boiling Point (°C)", "n", 6], ["F", "Boiling Point (°F)", "n", 6], ["P", "Pressure (kPa)", "n", 6], ["drop", "Lower Than at Sea Level by (°C)", "n", 6]],
    fn: E.boilingPoint, ex: { mode: 0, alt: 1500, P: 101.325, Tb: 78.37, dH: 38.56 },
    exText: (o) => `Example: at 1,500 m water boils at ${o.T} °C.`,
    how: "Altitude → pressure with the standard atmosphere; water's boiling point from the Antoine equation; other liquids: 1/T₂ = 1/T₁ − R·ln(P₂/P₁)/ΔHvap.",
    assume: "Weather changes pressure by a few kPa (±1 °C).",
    faq: [["Why does pasta take longer in the mountains?", "Water boils at a lower temperature, so food cooks more slowly."]],
  }),
  mk({
    slug: "gas-density-calculator", title: "Gas Density Calculator (Natural Gas, Air, CO₂)",
    desc: "Calculate the density of air, natural gas, propane, CO₂ or any gas at a temperature and pressure — with specific gravity relative to air.",
    inputs: [dd("gas", "Gas", E.GAS_NAMES, 1), tx("formula", "Formula (custom gas)", ""), pn("mw", "Molar Mass (custom)", 28.965, "g/mol", 1e5), TC("T", "Temperature", 15), pn("P", "Absolute Pressure", 101.325, "kPa", 1e6), pn("Z", "Compressibility Factor Z", 1, "", 10)],
    results: [["rho", "Density (kg/m³)", "n", 8], ["sg", "Specific Gravity (air = 1)", "n", 8], ["lbft3", "Density (lb/ft³)", "n", 8], ["Vm", "Molar Volume (L/mol)", "n", 8], ["M", "Molar Mass (g/mol)", "n", 8]],
    fn: E.gasDensity, ex: { gas: 1, mw: 28.965, T: 15, P: 101.325, Z: 1, ...T("formula", "") },
    exText: (o) => `Example: methane at 15 °C, 1 atm → ${o.rho} kg/m³ (SG ${o.sg}).`,
    how: "ρ = PM/(ZRT). Specific gravity = M_gas/M_air (28.965).",
    assume: "Z = 1 is ideal; real natural gas at high pressure has Z ≈ 0.85–0.95.",
    faq: [["Is natural gas lighter than air?", "Yes, SG ≈ 0.55–0.7, so it rises."]],
  }),
  mk({
    slug: "vapor-pressure-calculator", title: "Vapor Pressure Calculator (Antoine Equation)",
    desc: "Calculate the vapor pressure of water, ethanol, acetone and other liquids at any temperature with the Antoine equation — or use your own A, B, C constants.",
    inputs: [dd("sub", "Substance", E.VP_SUBSTANCES, 0), TC("T", "Temperature", 25), num("A", "Antoine A (custom)", 8.07131, -100, 100, 0.00001), num("B", "Antoine B (custom)", 1730.63, -1e5, 1e5, 0.01), num("C", "Antoine C (custom)", 233.426, -1e4, 1e4, 0.001), pn("pp", "Actual Water Vapour Pressure (for RH, optional)", 0, "kPa", 1e4)],
    results: [["mmHg", "Vapor Pressure (mmHg)", "n", 8], ["kPa", "Vapor Pressure (kPa)", "n", 8], ["atm", "Vapor Pressure (atm)", "n", 8], ["bp", "Normal Boiling Point (°C)", "n", 6], ["rh", "Relative Humidity (%)", "n", 6]],
    fn: E.vaporPressure, ex: { sub: 0, T: 25, A: 8.07131, B: 1730.63, C: 233.426, pp: 0 },
    exText: (o) => `Example: water at 25 °C → ${o.kPa} kPa (${o.mmHg} mmHg).`,
    how: "log₁₀P(mmHg) = A − B/(C + T°C).",
    assume: "Constants valid near each liquid's normal range.",
    faq: [["Why does vapour pressure matter?", "A liquid boils when its vapour pressure equals the surrounding pressure."]],
  }),
  mk({
    slug: "gibbs-free-energy-calculator", title: "Gibbs Free Energy Calculator (ΔG = ΔH − TΔS)",
    desc: "Calculate Gibbs free energy from ΔH, ΔS and temperature — or from the equilibrium constant — with spontaneity, K and the crossover temperature.",
    inputs: [dd("mode", "Calculate", E.GIBBS_MODE, 0), num("dH", "ΔH", -92.2, -1e7, 1e7, 0.01, "kJ/mol"), num("dS", "ΔS", -198.7, -1e7, 1e7, 0.01, "J/(mol·K)"), TC("T", "Temperature", 25), pn("K", "Equilibrium Constant K", 1e5, "", BIG)],
    results: [["dG", "ΔG (kJ/mol)", "n", 8], ["spont", "Spontaneity", "t"], ["K", "Equilibrium Constant K", "n", 8], ["crossover", "Crossover Temperature", "t"]],
    fn: E.gibbs, ex: { mode: 0, dH: -92.2, dS: -198.7, T: 25, K: 1e5 },
    exText: (o) => `Example: ammonia synthesis at 25 °C → ΔG = ${o.dG} kJ/mol.`,
    how: "ΔG = ΔH − TΔS (ΔS converted to kJ); ΔG° = −RT ln K; crossover at T = ΔH/ΔS.",
    assume: "ΔH and ΔS taken as constant with temperature.",
    faq: [["Spontaneous means fast?", "No — it says nothing about the rate."]],
  }),
  mk({
    slug: "van-der-waals-calculator", title: "Van der Waals Equation & Compressibility Factor Calculator",
    desc: "Calculate real-gas pressure with the van der Waals equation, compare with the ideal gas law, and find the compressibility factor Z.",
    inputs: [dd("gas", "Gas", E.VDW_GASES, 5), pn("a", "a (custom)", 1.37, "L²·bar/mol²", 1e4), pn("b", "b (custom)", 0.0387, "L/mol", 100), pn("n", "Moles", 1, "mol", BIG), pn("V", "Volume", 1, "L", BIG), TC("T", "Temperature", 25)],
    results: [["P", "Real Pressure (bar)", "n", 8], ["ideal", "Ideal Gas Pressure (bar)", "n", 8], ["Z", "Compressibility Factor Z", "n", 8], ["dev", "Deviation from Ideal (%)", "n", 6], ["Tb", "Critical Temperature (°C)", "n", 6]],
    fn: E.vanDerWaals, ex: { gas: 5, a: 1.37, b: 0.0387, n: 1, V: 1, T: 25 },
    exText: (o) => `Example: 1 mol CO₂ in 1 L at 25 °C → ${o.P} bar vs ${o.ideal} bar ideal (Z = ${o.Z}).`,
    how: "(P + an²/V²)(V − nb) = nRT; Z = PV/(nRT); critical temperature T_c = 8a/(27Rb).",
    assume: "a and b from standard tables; van der Waals is approximate near condensation.",
    faq: [["What does Z < 1 mean?", "Attractions dominate — the gas is more compressible than ideal."]],
  }),
];

runBatch(CAT, TOOLS);
