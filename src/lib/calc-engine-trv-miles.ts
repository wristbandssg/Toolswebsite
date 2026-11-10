/**
 * Batch: "Travel Calculators" → Airline Miles, Hotel Points & Rewards (earning half, 22 tools).
 *
 * Two earning models, matching how programmes work in 2026:
 *  - Revenue-based (United, Delta, American, Southwest, JetBlue, Flying Blue, Miles & More,
 *    Aeroplan, Air India, Air New Zealand): points = eligible spend (base fare + carrier
 *    surcharges, not government taxes) × rate per currency unit for the fare/status, plus card
 *    and booking bonuses.
 *  - Distance-based (Qantas, Qatar, Emirates, KrisFlyer, Asia Miles, Etihad, Virgin, Miles&Smiles,
 *    Mabuhay, EVA, ANA, generic): miles = great-circle flown miles × the fare-class earn
 *    percentage × (1 + elite tier bonus). Some programmes use fixed points per distance band
 *    instead; the percentages here are typical equivalents, editable through the custom % input.
 * Values use typical 2026 cents-per-point valuations (editable). Programme rules change often —
 * every tool says to confirm with the airline's own earning calculator.
 * See prisma/create-trv-miles-calculators.ts.
 */

import { type TrvCalculator, type Vals, txt, pos, pick, findPlace, gcKm, r0, r2, KM_PER_MI, nfmt } from "./trv-core";

export interface DistPreset { unit: string; fares: [string, number][]; tiers: [string, number][]; cpp: number; min?: number }
export interface RevPreset { unit: string; cur: string; sym: string; fares: [string, number][]; tiers: [string, number][]; tierMode: "rate" | "add" | "bonus"; cpp: number; booking?: number }

const flownMi = (v: Vals, def: number) => {
  if (pick(v.how, 2) === 0) { const a = findPlace(txt(v, "from"), "airport"), b = findPlace(txt(v, "to"), "airport"); return { mi: gcKm(a, b) / KM_PER_MI, label: `${a.code ?? a.name} → ${b.code ?? b.name}` }; }
  return { mi: pos(v.dist, def), label: "entered distance" };
};

export function distEarn(p: DistPreset, v: Vals) {
  const { mi, label } = flownMi(v, 3000), fare = p.fares[pick(v.fare, p.fares.length)], tier = p.tiers[pick(v.tier, p.tiers.length)];
  const pctE = pos(v.custom, 0) || fare[1], legs = pick(v.rt, 2) === 1 ? 2 : 1;
  const base = Math.max(p.min ?? 0, (mi * pctE) / 100) * legs, bonus = (base * tier[1]) / 100, total = base + bonus + pos(v.partner, 0);
  const cpp = pos(v.cpp, 0) || p.cpp, flights = pos(v.goal, 0) > 0 ? Math.ceil(pos(v.goal, 0) / Math.max(1, total)) : 0;
  return { total: r0(total), base: r0(base), bonus: r0(bonus), value: r2((total * cpp) / 100), flown: r0(mi * legs), rule: `${fare[0]}: ${pctE}% of ${nfmt(r0(mi))} flown miles${legs === 2 ? " each way" : ""} · ${tier[0]} bonus ${tier[1]}% · ${label}`, goal: flights ? `${flights} similar trips to reach ${nfmt(pos(v.goal, 0))} ${p.unit}` : "—" };
}

export function revEarn(p: RevPreset, v: Vals) {
  const spend = pos(v.spend, 500), fare = p.fares[pick(v.fare, p.fares.length)], tier = p.tiers[pick(v.tier, p.tiers.length)];
  const rate = p.tierMode === "rate" ? tier[1] * fare[1] : p.tierMode === "add" ? fare[1] + tier[1] : fare[1] * (1 + tier[1] / 100);
  const base = spend * rate, card = spend * pos(v.card, 0), book = pick(v.direct, 2) === 1 ? spend * (p.booking ?? 0) : 0, total = base + card + book;
  const cpp = pos(v.cpp, 0) || p.cpp, flights = pos(v.goal, 0) > 0 ? Math.ceil(pos(v.goal, 0) / Math.max(1, total)) : 0;
  return { total: r0(total), base: r0(base), bonus: r0(card + book), value: r2((total * cpp) / 100), flown: r2(rate), rule: `${fare[0]} · ${tier[0]}: ${rate} ${p.unit} per ${p.sym.trim()}1 of eligible spend${card ? ` + card ${pos(v.card, 0)}/${p.sym.trim()}` : ""}`, goal: flights ? `${flights} similar trips to reach ${nfmt(pos(v.goal, 0))} ${p.unit}` : "—" };
}

// --------------------------------------------------------------- presets
const ONE = (fares: string[]): [string, number][] => fares.map((f) => [f, 1]);
export const UNITED: RevPreset = { unit: "miles", cur: "USD", sym: "$", tierMode: "rate", cpp: 1.3, fares: ONE(["Any United-ticketed fare (excl. Basic Economy on some routes)"]), tiers: [["General member", 5], ["Premier Silver", 7], ["Premier Gold", 8], ["Premier Platinum", 9], ["Premier 1K", 11]] };
export const DELTA: RevPreset = { unit: "miles", cur: "USD", sym: "$", tierMode: "rate", cpp: 1.2, fares: ONE(["Any Delta-ticketed fare (Basic Economy earns too)"]), tiers: [["SkyMiles member", 5], ["Silver Medallion", 7], ["Gold Medallion", 8], ["Platinum Medallion", 9], ["Diamond Medallion", 11]] };
export const AMERICAN: RevPreset = { unit: "miles", cur: "USD", sym: "$", tierMode: "rate", cpp: 1.6, fares: ONE(["Any American-ticketed fare (Basic Economy earns 2/$ for members)"]), tiers: [["AAdvantage member", 5], ["Gold", 7], ["Platinum", 8], ["Platinum Pro", 9], ["Executive Platinum", 11]] };
export const SOUTHWEST: RevPreset = { unit: "points", cur: "USD", sym: "$", tierMode: "bonus", cpp: 1.35, fares: [["Basic", 2], ["Choice", 6], ["Choice Preferred", 8], ["Choice Extra", 10]], tiers: [["Member", 0], ["A-List (+25%)", 25], ["A-List Preferred (+100%)", 100]] };
export const JETBLUE: RevPreset = { unit: "points", cur: "USD", sym: "$", tierMode: "add", cpp: 1.3, booking: 3, fares: [["Blue Basic", 1], ["Blue / Blue Extra / Mint", 3]], tiers: [["TrueBlue member", 0], ["Mosaic (+3/$)", 3]] };
export const FLYING_BLUE: RevPreset = { unit: "miles", cur: "EUR", sym: "€", tierMode: "rate", cpp: 1.3, fares: ONE(["Air France / KLM fare"]), tiers: [["Explorer", 4], ["Silver", 6], ["Gold", 7], ["Platinum / Ultimate", 8]] };
export const MILES_MORE: RevPreset = { unit: "miles", cur: "EUR", sym: "€", tierMode: "rate", cpp: 1.1, fares: ONE(["Lufthansa Group fare"]), tiers: [["Member", 4], ["Frequent Traveller", 6], ["Senator", 7], ["HON Circle", 8]] };
export const AEROPLAN: RevPreset = { unit: "points", cur: "CAD", sym: "C$", tierMode: "add", cpp: 1.5, fares: [["Basic", 1], ["Standard", 2], ["Flex", 3], ["Comfort", 3], ["Latitude", 4], ["Premium Economy", 5], ["Business", 6]], tiers: [["Member", 0], ["25K (+1/$)", 1], ["35K (+2/$)", 2], ["50K (+3/$)", 3], ["75K (+4/$)", 4], ["Super Elite (+6/$)", 6]] };
export const AIR_INDIA: RevPreset = { unit: "points", cur: "INR", sym: "₹", tierMode: "rate", cpp: 1.0, fares: [["Economy Comfort", 0.05], ["Economy Flex", 0.07], ["Premium Economy", 0.08], ["Business", 0.1]], tiers: [["Red", 1], ["Silver (+25%)", 1.25], ["Gold (+50%)", 1.5], ["Platinum (+75%)", 1.75]] };
export const AIRPOINTS: RevPreset = { unit: "Airpoints Dollars", cur: "NZD", sym: "NZ$", tierMode: "rate", cpp: 100, fares: ONE(["Air New Zealand fare"]), tiers: [["Airpoints member", 0.025], ["Silver", 0.03], ["Gold", 0.035], ["Elite", 0.04]] };

const STD: [string, number][] = [["Discount economy", 50], ["Standard economy", 75], ["Flexible economy", 100], ["Premium economy", 125], ["Business", 150], ["Business (flexible)", 200], ["First", 300]];
export const QANTAS: DistPreset = { unit: "Qantas Points", cpp: 0.8, min: 400, fares: [["Economy Sale", 50], ["Economy Saver", 75], ["Economy Flex", 100], ["Premium Economy", 125], ["Business Saver", 150], ["Business Flex", 200], ["First", 300]], tiers: [["Member / Bronze", 0], ["Silver (+50%)", 50], ["Gold (+75%)", 75], ["Platinum / Platinum One (+100%)", 100]] };
export const QATAR: DistPreset = { unit: "Avios", cpp: 1.3, fares: [["Economy Lite", 25], ["Economy Classic", 50], ["Economy Convenience", 75], ["Economy Comfort", 100], ["Business Classic", 125], ["Business Comfort", 175], ["First", 250]], tiers: [["Burgundy", 0], ["Silver (+25%)", 25], ["Gold (+50%)", 50], ["Platinum (+75%)", 75]] };
export const EMIRATES: DistPreset = { unit: "Skywards Miles", cpp: 1.2, fares: [["Economy Special", 25], ["Economy Saver", 50], ["Economy Flex", 75], ["Economy Flex Plus", 100], ["Premium Economy", 125], ["Business Saver", 125], ["Business Flex", 175], ["First", 250]], tiers: [["Blue", 0], ["Silver (+25%)", 25], ["Gold (+50%)", 50], ["Platinum (+75%)", 75]] };
export const KRISFLYER: DistPreset = { unit: "KrisFlyer miles", cpp: 1.4, fares: [["Economy Lite", 10], ["Economy Standard", 50], ["Economy Flexi", 100], ["Premium Economy Standard", 100], ["Premium Economy Flexi", 110], ["Business Lite", 115], ["Business Standard", 125], ["Business Flexi", 150], ["Suites / First", 175]], tiers: [["KrisFlyer member", 0], ["Elite Silver (+25%)", 25], ["Elite Gold (+25%)", 25], ["PPS Club (+25%)", 25]] };
export const ASIA_MILES: DistPreset = { unit: "Asia Miles", cpp: 1.2, fares: [["Economy Light", 25], ["Economy Essential", 50], ["Economy Flex", 100], ["Premium Economy", 110], ["Business Essential", 125], ["Business Flex", 150], ["First", 200]], tiers: [["Green", 0], ["Silver (+25%)", 25], ["Gold (+50%)", 50], ["Diamond (+75%)", 75]] };
export const ETIHAD: DistPreset = { unit: "Etihad Guest Miles", cpp: 1.3, fares: [["Economy Basic", 25], ["Economy Value", 50], ["Economy Comfort", 75], ["Economy Deluxe", 100], ["Business Value", 125], ["Business Comfort", 150], ["First", 200]], tiers: [["Guest", 0], ["Silver (+25%)", 25], ["Gold (+50%)", 50], ["Platinum (+100%)", 100]] };
export const VIRGIN: DistPreset = { unit: "Virgin Points", cpp: 1.3, fares: [["Economy Light", 25], ["Economy Classic", 50], ["Economy Delight", 100], ["Premium", 150], ["Upper Class", 250]], tiers: [["Red", 0], ["Silver (+30%)", 30], ["Gold (+60%)", 60]] };
export const SMILES: DistPreset = { unit: "Miles&Smiles miles", cpp: 1.2, fares: [["EcoFly", 25], ["ExtraFly", 50], ["PrimeFly", 100], ["Business (discount)", 125], ["Business (flexible)", 150]], tiers: [["Classic", 0], ["Classic Plus", 0], ["Elite (+25%)", 25], ["Elite Plus (+25%)", 25]] };
export const MABUHAY: DistPreset = { unit: "Mabuhay Miles", cpp: 1.0, fares: [["Economy Supersaver", 25], ["Economy Saver", 50], ["Economy Value", 75], ["Economy Flex", 100], ["Business Value", 125], ["Business Flex", 150]], tiers: [["Classic", 0], ["Elite (+25%)", 25], ["Premier Elite (+50%)", 50], ["Million Miler (+50%)", 50]] };
export const EVA: DistPreset = { unit: "EVA miles", cpp: 1.2, fares: [["Economy Basic", 25], ["Economy Standard", 50], ["Economy Flex", 100], ["Premium Economy", 110], ["Royal Laurel Business (discount)", 125], ["Royal Laurel Business (full)", 150]], tiers: [["Green", 0], ["Silver", 0], ["Gold (+25%)", 25], ["Diamond (+50%)", 50]] };
export const ANA: DistPreset = { unit: "ANA miles", cpp: 1.4, fares: [["Economy (discount)", 30], ["Economy (standard)", 70], ["Economy (full fare)", 100], ["Premium Economy", 100], ["Business (discount)", 125], ["Business (full)", 150], ["First", 150]], tiers: [["Member", 0], ["Bronze (+40%)", 40], ["Platinum (+90%)", 90], ["Diamond (+115%)", 115]] };
export const GENERIC: DistPreset = { unit: "miles", cpp: 1.2, fares: STD, tiers: [["No status", 0], ["Tier 1 (+25%)", 25], ["Tier 2 (+50%)", 50], ["Tier 3 (+75%)", 75], ["Top tier (+100%)", 100]] };

const D = (p: DistPreset): TrvCalculator => (v) => distEarn(p, v);
const R = (p: RevPreset): TrvCalculator => (v) => revEarn(p, v);

export const trvMilesCustomCalculators: Record<string, TrvCalculator> = {
  "united-mileageplus-calculator": R(UNITED),
  "delta-skymiles-calculator": R(DELTA),
  "aadvantage-miles-calculator": R(AMERICAN),
  "southwest-rapid-rewards-calculator": R(SOUTHWEST),
  "jetblue-trueblue-points-calculator": R(JETBLUE),
  "flying-blue-miles-calculator": R(FLYING_BLUE),
  "miles-and-more-calculator": R(MILES_MORE),
  "aeroplan-points-calculator": R(AEROPLAN),
  "air-india-maharaja-club-calculator": R(AIR_INDIA),
  "air-new-zealand-airpoints-calculator": R(AIRPOINTS),
  "qantas-points-calculator": D(QANTAS),
  "qatar-airways-avios-calculator": D(QATAR),
  "emirates-skywards-miles-calculator": D(EMIRATES),
  "krisflyer-miles-calculator": D(KRISFLYER),
  "asia-miles-calculator": D(ASIA_MILES),
  "etihad-guest-miles-calculator": D(ETIHAD),
  "virgin-points-calculator": D(VIRGIN),
  "miles-and-smiles-calculator": D(SMILES),
  "mabuhay-miles-calculator": D(MABUHAY),
  "eva-air-infinity-mileagelands-calculator": D(EVA),
  "ana-mileage-club-calculator": D(ANA),
  "frequent-flyer-miles-calculator": D(GENERIC),
};

