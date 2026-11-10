/**
 * Batch: "Travel Calculators" → Flight, Baggage & Airfare (baggage half, 19 tools).
 *
 * Two fee models, as airlines use them:
 *  - Piece concept (US, Canadian and European carriers): a number of free bags by route/fare,
 *    a fee for each extra bag (1st / 2nd / 3rd+), overweight tiers and an oversize fee.
 *  - Weight concept (Gulf and many Asian carriers on non-US routes): a free kg allowance by cabin
 *    and fare, and a per-kg excess rate by route zone, with a discount for paying online first.
 * Preset fees are typical published airport/online prices checked for late 2026 and rounded; they
 * change often and vary by fare brand, status and card benefits, so every tool has a fee override
 * and the copy tells users to confirm with the airline. Fees are per direction (one way).
 * Near-namesakes: excess-baggage-calculator is the fully editable generic version; each airline
 * tool carries that airline's own zones and fees; luggage-size-calculator checks dimensions only.
 * See prisma/create-trv-bag-calculators.ts.
 */

import { type TrvCalculator, type Vals, InputError, pos, pick, r1, r2, money, nfmt } from "./trv-core";

const LB_PER_KG = 2.20462;
export const WU = ["kg", "lb"];

export interface PieceZone { name: string; free: number; fees: [number, number, number]; online?: number; ow: [number, number][]; oversize: number }
export interface PiecePreset { cur: string; sym: string; unit: "lb" | "kg"; zones: PieceZone[] }
export interface WeightPreset { cur: string; sym: string; cabins: { name: string; kg: number }[]; zones: { name: string; perKg: number }[]; prepay: number }

/** Piece-concept fee: bags beyond the free allowance pay fees[0], fees[1], fees[2] (3rd and later). */
export function pieceFee(p: PiecePreset, v: Vals) {
  const z = p.zones[pick(v.zone, p.zones.length)], bags = Math.min(20, Math.max(0, Math.round(pos(v.bags, 1)))), free = Math.min(20, z.free + Math.round(pos(v.extra, 0)));
  const online = pick(v.online, 2) === 1 ? z.online ?? 0 : 0, over = pos(v.override, 0), pax = Math.max(1, Math.round(pos(v.pax, 1))), rt = pick(v.rt, 2) === 1 ? 2 : 1;
  let bagFees = 0;
  const lines: string[] = [];
  for (let i = free; i < bags; i++) { const n = i - free, f = over || Math.max(0, z.fees[Math.min(2, n)] - (n < 2 ? online : 0)); bagFees += f; lines.push(`Bag ${i + 1}: ${money(f, p.sym)}`); }
  const wIn = pos(v.weight, 0), wu = pick(v.wu, 2), w = p.unit === "lb" ? (wu === 1 ? wIn : wIn * LB_PER_KG) : wu === 0 ? wIn : wIn / LB_PER_KG;
  let owFee = 0;
  for (const [lim, fee] of z.ow) if (w > lim) owFee = fee;
  const heavy = Math.max(owFee > 0 ? 1 : 0, Math.round(pos(v.heavy, 0)));
  const ow = owFee * Math.min(heavy, bags), os = pick(v.big, 2) === 1 ? z.oversize : 0;
  const one = bagFees + ow + os, total = one * pax * rt;
  if (w > z.ow[z.ow.length - 1][0] + (p.unit === "lb" ? 30 : 13)) lines.push("Too heavy to check — most airlines refuse bags over 100 lb / 45 kg; ship it as cargo");
  return { total: r2(total), one: r2(one), bags: r2(bagFees), ow: r2(ow), os: r2(os), detail: lines.length ? lines.join(" · ") : `All ${bags} bag(s) within the free allowance (${free})`, zone: `${z.name} — ${free} free bag(s), weights in ${p.unit}` };
}

/** Weight-concept fee: kg over the allowance × per-kg rate (prepay discount if paid online). */
export function weightFee(p: WeightPreset, v: Vals) {
  const c = p.cabins[pick(v.cabin, p.cabins.length)], z = p.zones[pick(v.zone, p.zones.length)], wu = pick(v.wu, 2);
  const total = pos(v.weight, 30) / (wu === 1 ? LB_PER_KG : 1), allow = pos(v.allow, 0) || c.kg, excess = Math.max(0, total - allow);
  const rate = pos(v.override, 0) || z.perKg, pre = pick(v.online, 2) === 1 ? p.prepay : 0, pax = Math.max(1, Math.round(pos(v.pax, 1))), rt = pick(v.rt, 2) === 1 ? 2 : 1;
  const one = excess * rate * (1 - pre / 100);
  return { total: r2(one * pax * rt), one: r2(one), excess: r1(excess), allow: r1(allow), rate: r2(rate * (1 - pre / 100)), zone: `${c.name}: ${allow} kg free · ${z.name}: ${money(rate, p.sym)}/kg${pre ? ` (−${pre}% online)` : ""}` };
}

// ---------------------------------------------------------------- presets
const US_OW: [number, number][] = [[50, 100], [70, 200]];
export const UNITED: PiecePreset = { cur: "USD", sym: "$", unit: "lb", zones: [
  { name: "US domestic, Canada, Mexico, Caribbean (economy)", free: 0, fees: [40, 50, 150], online: 5, ow: US_OW, oversize: 200 },
  { name: "Transatlantic / transpacific (economy)", free: 1, fees: [100, 100, 200], ow: US_OW, oversize: 200 },
  { name: "Basic Economy, transatlantic", free: 0, fees: [75, 100, 200], ow: US_OW, oversize: 200 },
] };
export const AMERICAN: PiecePreset = { cur: "USD", sym: "$", unit: "lb", zones: [
  { name: "US domestic, Canada, Mexico, Caribbean (economy)", free: 0, fees: [40, 45, 200], online: 5, ow: US_OW, oversize: 200 },
  { name: "Transatlantic / transpacific (economy)", free: 1, fees: [100, 100, 200], ow: US_OW, oversize: 200 },
  { name: "South America (economy)", free: 1, fees: [100, 100, 200], ow: US_OW, oversize: 200 },
] };
export const DELTA: PiecePreset = { cur: "USD", sym: "$", unit: "lb", zones: [
  { name: "US domestic, Canada, Mexico, Caribbean (Main Cabin)", free: 0, fees: [35, 45, 150], ow: US_OW, oversize: 200 },
  { name: "Transatlantic / transpacific (Main Cabin)", free: 1, fees: [100, 100, 200], ow: US_OW, oversize: 200 },
  { name: "Basic Economy, transatlantic", free: 0, fees: [75, 100, 200], ow: US_OW, oversize: 200 },
] };
export const ALLEGIANT: PiecePreset = { cur: "USD", sym: "$", unit: "lb", zones: [
  { name: "Booked with the ticket (online)", free: 0, fees: [45, 50, 50], ow: [[40, 50], [70, 75]], oversize: 75 },
  { name: "Added later online", free: 0, fees: [55, 60, 60], ow: [[40, 50], [70, 75]], oversize: 75 },
  { name: "Paid at the airport", free: 0, fees: [75, 75, 75], ow: [[40, 50], [70, 75]], oversize: 75 },
] };
const AC_OW: [number, number][] = [[23, 100], [32, 225]];
export const AIR_CANADA: PiecePreset = { cur: "CAD", sym: "C$", unit: "kg", zones: [
  { name: "Canada domestic (Standard fare)", free: 0, fees: [40, 55, 150], ow: AC_OW, oversize: 100 },
  { name: "Canada – US (Standard fare)", free: 0, fees: [40, 55, 150], ow: AC_OW, oversize: 100 },
  { name: "Transatlantic / transpacific (Standard)", free: 1, fees: [100, 100, 225], ow: AC_OW, oversize: 100 },
] };
const LHG = (cur: string, sym: string, k = 1): PiecePreset => ({ cur, sym, unit: "kg", zones: [
  { name: "Within Europe (Economy Classic)", free: 1, fees: [70 * k, 70 * k, 150 * k], online: 15 * k, ow: [[23, 100 * k]], oversize: 150 * k },
  { name: "Within Europe (Economy Light, hand baggage only)", free: 0, fees: [70 * k, 70 * k, 150 * k], online: 15 * k, ow: [[23, 100 * k]], oversize: 150 * k },
  { name: "Intercontinental (Economy)", free: 1, fees: [150 * k, 150 * k, 250 * k], online: 25 * k, ow: [[23, 150 * k]], oversize: 250 * k },
] });
export const LUFTHANSA = LHG("EUR", "€"), SWISS = LHG("CHF", "CHF ", 1), AUSTRIAN = LHG("EUR", "€");
const AFKL = (): PiecePreset => ({ cur: "EUR", sym: "€", unit: "kg", zones: [
  { name: "Within Europe (Standard)", free: 1, fees: [75, 75, 100], online: 30, ow: [[23, 75]], oversize: 150 },
  { name: "Within Europe (Light, hand baggage only)", free: 0, fees: [75, 75, 100], online: 30, ow: [[23, 75]], oversize: 150 },
  { name: "Long-haul (Economy Standard)", free: 1, fees: [125, 125, 200], online: 25, ow: [[23, 100]], oversize: 200 },
] });
export const AIR_FRANCE = AFKL(), KLM = AFKL();
export const CATHAY: PiecePreset = { cur: "USD", sym: "$", unit: "kg", zones: [
  { name: "Within Asia (Economy Essential/Light)", free: 1, fees: [100, 100, 150], online: 20, ow: [[23, 60], [32, 120]], oversize: 100 },
  { name: "Asia – Australia / Middle East / India", free: 1, fees: [150, 150, 200], online: 30, ow: [[23, 80], [32, 160]], oversize: 150 },
  { name: "Long-haul to Europe / North America", free: 2, fees: [200, 200, 250], online: 40, ow: [[23, 100], [32, 200]], oversize: 200 },
] };

export const EMIRATES: WeightPreset = { cur: "USD", sym: "$", prepay: 25, cabins: [{ name: "Economy Special", kg: 20 }, { name: "Economy Saver", kg: 25 }, { name: "Economy Flex", kg: 30 }, { name: "Economy Flex Plus", kg: 35 }, { name: "Premium Economy", kg: 35 }, { name: "Business", kg: 40 }, { name: "First", kg: 50 }], zones: [{ name: "GCC & Middle East", perKg: 15 }, { name: "Indian subcontinent", perKg: 20 }, { name: "Africa & Europe", perKg: 40 }, { name: "Asia & Australasia", perKg: 50 }, { name: "Americas", perKg: 70 }] };
export const QATAR: WeightPreset = { cur: "USD", sym: "$", prepay: 30, cabins: [{ name: "Economy Lite", kg: 20 }, { name: "Economy Classic", kg: 25 }, { name: "Economy Convenience", kg: 30 }, { name: "Economy Comfort", kg: 35 }, { name: "Business", kg: 40 }, { name: "First", kg: 50 }], zones: [{ name: "GCC & Middle East", perKg: 15 }, { name: "Indian subcontinent", perKg: 20 }, { name: "Europe & Africa", perKg: 40 }, { name: "Asia & Australasia", perKg: 45 }, { name: "Americas", perKg: 65 }] };
export const ETIHAD: WeightPreset = { cur: "USD", sym: "$", prepay: 30, cabins: [{ name: "Economy Basic", kg: 20 }, { name: "Economy Value", kg: 25 }, { name: "Economy Comfort", kg: 30 }, { name: "Economy Deluxe", kg: 35 }, { name: "Business", kg: 40 }, { name: "First", kg: 50 }], zones: [{ name: "GCC & Middle East", perKg: 15 }, { name: "Indian subcontinent", perKg: 20 }, { name: "Europe & Africa", perKg: 35 }, { name: "Asia & Australia", perKg: 45 }, { name: "Americas", perKg: 60 }] };
export const TURKISH: WeightPreset = { cur: "USD", sym: "$", prepay: 25, cabins: [{ name: "EcoFly", kg: 20 }, { name: "ExtraFly", kg: 25 }, { name: "PrimeFly", kg: 30 }, { name: "Business", kg: 40 }], zones: [{ name: "Domestic Türkiye", perKg: 4 }, { name: "Europe & North Africa", perKg: 12 }, { name: "Middle East & Central Asia", perKg: 15 }, { name: "Far East, Africa", perKg: 20 }, { name: "Americas (extra piece ≈ $150)", perKg: 30 }] };
export const SIA: WeightPreset = { cur: "USD", sym: "$", prepay: 15, cabins: [{ name: "Economy Lite", kg: 25 }, { name: "Economy Standard", kg: 30 }, { name: "Economy Flexi", kg: 35 }, { name: "Premium Economy", kg: 35 }, { name: "Business", kg: 40 }, { name: "Suites/First", kg: 50 }], zones: [{ name: "Within Southeast Asia", perKg: 15 }, { name: "North Asia & South Asia", perKg: 25 }, { name: "Australia & New Zealand", perKg: 35 }, { name: "Europe & Africa", perKg: 45 }, { name: "Americas", perKg: 55 }] };
export const AIR_INDIA: WeightPreset = { cur: "INR", sym: "₹", prepay: 10, cabins: [{ name: "Economy Comfort (domestic)", kg: 15 }, { name: "Economy Comfort Plus (domestic)", kg: 20 }, { name: "Economy (international)", kg: 25 }, { name: "Premium Economy", kg: 35 }, { name: "Business", kg: 40 }], zones: [{ name: "Domestic India", perKg: 550 }, { name: "Gulf & SAARC", perKg: 1000 }, { name: "Southeast Asia", perKg: 1500 }, { name: "Europe & UK", perKg: 2500 }, { name: "North America & Australia", perKg: 3000 }] };

const mkPiece = (p: PiecePreset): TrvCalculator => (v) => pieceFee(p, v);
const mkWeight = (p: WeightPreset): TrvCalculator => (v) => weightFee(p, v);

// excess-baggage-calculator: fully editable
export const excessBaggage: TrvCalculator = (v) => {
  if (pick(v.model, 2) === 1) {
    const total = pos(v.weight, 30), allow = pos(v.allow, 23), excess = Math.max(0, total - allow), rate = pos(v.perkg, 20), pax = Math.max(1, Math.round(pos(v.pax, 1))), rt = pick(v.rt, 2) === 1 ? 2 : 1;
    return { total: r2(excess * rate * pax * rt), one: r2(excess * rate), extra: `${r1(excess)} kg/lb over a ${allow} allowance`, cheaper: excess > 0 && rate * excess > pos(v.piece, 75) ? `An extra bag at ${money(pos(v.piece, 75))} would be cheaper than paying ${money(rate * excess)} excess` : "Paying excess is the cheaper option", model: "Weight concept" };
  }
  const bags = Math.min(20, Math.round(pos(v.bags, 2))), free = Math.min(20, Math.round(pos(v.free, 1))), f1 = pos(v.f1, 40), f2 = pos(v.f2, 50), f3 = pos(v.f3, 150), pax = Math.max(1, Math.round(pos(v.pax, 1))), rt = pick(v.rt, 2) === 1 ? 2 : 1;
  let one = 0;
  for (let i = free; i < bags; i++) one += [f1, f2, f3][Math.min(2, i - free)];
  one += pos(v.owfee, 0) * Math.round(pos(v.heavy, 0));
  return { total: r2(one * pax * rt), one: r2(one), extra: `${Math.max(0, bags - free)} paid bag(s)`, cheaper: "Prepaying online is often $5–$30 cheaper per bag", model: "Piece concept" };
};

// luggage-size-calculator
export const SIZE_RULE = ["US carry-on 22 × 14 × 9 in", "US personal item 18 × 14 × 8 in", "EU carry-on 55 × 40 × 23 cm, 8 kg", "Ryanair priority cabin bag 55 × 40 × 20 cm, 10 kg", "easyJet large cabin bag 56 × 45 × 25 cm, 15 kg", "Gulf carriers carry-on 55 × 38 × 20 cm, 7 kg", "Checked bag 62 linear in (158 cm), 50 lb (23 kg)", "Checked bag 62 linear in, 70 lb (32 kg) — premium"];
const RULES: { dims?: [number, number, number]; linear?: number; kg?: number }[] = [
  { dims: [55.88, 35.56, 22.86] }, { dims: [45.72, 35.56, 20.32] }, { dims: [55, 40, 23], kg: 8 }, { dims: [55, 40, 20], kg: 10 }, { dims: [56, 45, 25], kg: 15 }, { dims: [55, 38, 20], kg: 7 }, { linear: 158, kg: 23 }, { linear: 158, kg: 32 },
];
export const luggageSize: TrvCalculator = (v) => {
  const cm = pick(v.su, 2) === 0 ? 2.54 : 1, d = [pos(v.l, 22), pos(v.w, 14), pos(v.h, 9)].map((x) => x * cm).sort((a, b) => b - a);
  if (d.some((x) => x <= 0)) throw new InputError("Enter all three dimensions.");
  const kg = pos(v.kg, 0) / (pick(v.wu, 2) === 1 ? LB_PER_KG : 1), rule = RULES[pick(v.rule, RULES.length)], issues: string[] = [];
  const lin = d[0] + d[1] + d[2];
  if (rule.dims) { const lim = [...rule.dims].sort((a, b) => b - a); d.forEach((x, i) => { if (x > lim[i] + 0.01) issues.push(`${["Longest", "Middle", "Shortest"][i]} side is ${r1(x - lim[i])} cm too big`); }); }
  if (rule.linear && lin > rule.linear + 0.01) issues.push(`${r1(lin - rule.linear)} cm over the linear limit`);
  if (rule.kg && kg > rule.kg) issues.push(`${r1(kg - rule.kg)} kg over the weight limit`);
  return { fit: issues.length ? `❌ Doesn't fit: ${issues.join("; ")}` : "✅ Fits this size rule", lin_in: r1(lin / 2.54), lin_cm: r1(lin), vol: r1((d[0] * d[1] * d[2]) / 1000), dims: `${d.map((x) => nfmt(r1(x), 1)).join(" × ")} cm (${d.map((x) => nfmt(r1(x / 2.54), 1)).join(" × ")} in)` };
};

export const trvBagCustomCalculators: Record<string, TrvCalculator> = {
  "united-baggage-fee-calculator": mkPiece(UNITED),
  "american-airlines-baggage-fee-calculator": mkPiece(AMERICAN),
  "delta-baggage-fee-calculator": mkPiece(DELTA),
  "allegiant-baggage-fee-calculator": mkPiece(ALLEGIANT),
  "air-canada-baggage-fee-calculator": mkPiece(AIR_CANADA),
  "lufthansa-baggage-fee-calculator": mkPiece(LUFTHANSA),
  "swiss-baggage-fee-calculator": mkPiece(SWISS),
  "austrian-airlines-baggage-calculator": mkPiece(AUSTRIAN),
  "air-france-baggage-calculator": mkPiece(AIR_FRANCE),
  "klm-baggage-calculator": mkPiece(KLM),
  "cathay-pacific-baggage-calculator": mkPiece(CATHAY),
  "emirates-excess-baggage-calculator": mkWeight(EMIRATES),
  "qatar-airways-excess-baggage-calculator": mkWeight(QATAR),
  "etihad-baggage-calculator": mkWeight(ETIHAD),
  "turkish-airlines-baggage-calculator": mkWeight(TURKISH),
  "singapore-airlines-excess-baggage-calculator": mkWeight(SIA),
  "air-india-baggage-calculator": mkWeight(AIR_INDIA),
  "excess-baggage-calculator": excessBaggage,
  "luggage-size-calculator": luggageSize,
};
