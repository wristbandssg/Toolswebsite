// One-time (but safe to re-run) batch setup script: creates 19 calculators in Travel Calculators >
// Flight, Baggage & Airfare Calculators (airline baggage fees, excess baggage, luggage size).
// Formulas and fee presets live in src/lib/calc-engine-trv-bag.ts; examples are computed from it.
//
// HOW TO RUN (after prisma/setup-travel-category.ts --apply)
//   npx tsx prisma/create-trv-bag-calculators.ts        (TRV_DRY=1 → check only, no database)
// or
//   npm run db:create-trv-bag-calculators

import * as E from "../src/lib/calc-engine-trv-bag";
import { mk, num, money, dd, runBatch, type ToolDef } from "./trv-tool-kit";
import { TRV_FLIGHT } from "./setup-travel-category";

const RT = dd("rt", "Trip", ["One way", "Round trip"], 0);
const PAX = num("pax", "Travellers", 1, 1, 50, 1);
const CHECK = "Fees are typical published prices (late 2026) and change often — elite status, co-branded credit cards, fare brand and military orders can waive them. Always confirm on the airline's baggage page before you fly.";

function piece(slug: string, airline: string, p: E.PiecePreset, ex: { zone: number; bags: number; weight: number }, extra: { desc?: string; faq: [string, string][]; note?: string }): ToolDef {
  const wu = p.unit === "lb" ? 1 : 0;
  return mk({
    slug, title: `${airline} Baggage Fee Calculator`,
    desc: extra.desc ?? `Calculate ${airline} checked bag fees — extra bags, overweight and oversize charges — by route, for one way or a round trip and every traveller.`,
    inputs: [dd("zone", "Route / Fare", p.zones.map((z) => z.name), ex.zone), num("bags", "Checked Bags per Person", ex.bags, 0, 10, 1), num("extra", "Extra Free Bags (status, card, military)", 0, 0, 5, 1), dd("online", "Pay Online in Advance", ["No", "Yes"], 1), num("weight", "Heaviest Bag Weight", ex.weight, 0, 200, 0.1), dd("wu", "Weight Unit", E.WU, wu), num("heavy", "Number of Overweight Bags (min. 1 if heaviest is over)", 0, 0, 10, 1), dd("big", "Any Bag Oversize?", ["No", "Yes"], 0), money("override", `Fee per Extra Bag Override (0 = typical)`, 0, p.sym), RT, PAX],
    results: [["total", "Total Baggage Fees", "c", p.cur], ["one", "Per Person, One Way", "c", p.cur], ["bags", "Extra Bag Fees", "c", p.cur], ["ow", "Overweight Fees", "c", p.cur], ["os", "Oversize Fee", "c", p.cur], ["detail", "Breakdown", "t"], ["zone", "Allowance Used", "t"]],
    fn: E.trvBagCustomCalculators[slug], ex: { zone: ex.zone, bags: ex.bags, extra: 0, online: 1, weight: ex.weight, wu, heavy: 0, big: 0, override: 0, rt: 0, pax: 1 },
    exText: (o) => `Example: ${ex.bags} checked bag(s) on ${p.zones[ex.zone].name}, paid online → ${o.one} one way.`,
    how: `${airline} uses a piece allowance: each bag beyond the free allowance pays the fee for that bag number (1st, 2nd, 3rd and later). Bags over the weight limit (${p.unit === "lb" ? "50 lb / 23 kg" : "23 kg"} in economy) pay an overweight charge per bag; bags over 62 linear inches (158 cm) pay an oversize fee.${extra.note ? `\n\n${extra.note}` : ""}`,
    assume: CHECK,
    faq: extra.faq,
  });
}

function weight(slug: string, airline: string, title: string, p: E.WeightPreset, ex: { cabin: number; zone: number; weight: number }, faq: [string, string][]): ToolDef {
  return mk({
    slug, title,
    desc: `Calculate ${airline} excess baggage charges — your free kg allowance by cabin and fare, the excess weight and the per-kg rate for your route, with the online prepay discount.`,
    inputs: [dd("cabin", "Cabin / Fare", p.cabins.map((c) => `${c.name} (${c.kg} kg)`), ex.cabin), dd("zone", "Route Zone", p.zones.map((z) => z.name), ex.zone), num("weight", "Total Checked Weight", ex.weight, 0, 500, 0.1), dd("wu", "Weight Unit", E.WU, 0), num("allow", "Allowance Override (kg, 0 = fare default)", 0, 0, 200, 1), dd("online", "Prepay Online", ["No (airport rate)", "Yes"], 1), money("override", "Per-kg Rate Override (0 = typical)", 0, p.sym), RT, PAX],
    results: [["total", "Total Excess Charge", "c", p.cur], ["one", "Per Person, One Way", "c", p.cur], ["excess", "Excess Weight (kg)", "n", 1], ["allow", "Free Allowance (kg)", "n", 1], ["rate", "Rate per kg", "c", p.cur], ["zone", "Rule Used", "t"]],
    fn: E.trvBagCustomCalculators[slug], ex: { cabin: ex.cabin, zone: ex.zone, weight: ex.weight, wu: 0, allow: 0, online: 1, override: 0, rt: 0, pax: 1 },
    exText: (o) => `Example: ${p.cabins[ex.cabin].name}, ${ex.weight} kg checked on a ${p.zones[ex.zone].name} route, prepaid → ${o.excess} kg over, ${o.one}.`,
    how: `${airline} uses the weight concept on most routes: all checked bags together may weigh up to the allowance for your cabin and fare. Each kg above it is charged at the zone rate; buying extra kg online before the flight is cheaper than at the airport. No single bag may exceed 32 kg. Flights to and from the Americas usually use a piece allowance (2 × 23 kg in economy) instead.`,
    assume: CHECK,
    faq,
  });
}

const TOOLS: ToolDef[] = [
  piece("united-baggage-fee-calculator", "United Airlines", E.UNITED, { zone: 0, bags: 2, weight: 45 }, { faq: [["How much is United's first checked bag?", "$40 at the airport or $35 if you prepay online on most domestic flights."], ["Is the first bag free with a United credit card?", "Yes — the United Explorer card gives the cardholder and one companion a free first checked bag."]] }),
  piece("american-airlines-baggage-fee-calculator", "American Airlines", E.AMERICAN, { zone: 0, bags: 2, weight: 45 }, { faq: [["How much is American's first checked bag?", "$40 at the airport or $35 online on domestic flights; the second bag is $45."]] }),
  piece("delta-baggage-fee-calculator", "Delta", E.DELTA, { zone: 0, bags: 2, weight: 45 }, { faq: [["How much does Delta charge for bags?", "$35 for the first and $45 for the second checked bag on domestic flights."], ["Delta overweight fee?", "$100 for 51–70 lb and $200 for 71–100 lb."]] }),
  piece("allegiant-baggage-fee-calculator", "Allegiant", E.ALLEGIANT, { zone: 0, bags: 1, weight: 38 }, { note: "Allegiant's limit is 40 lb per checked bag, and prices rise the later you buy — cheapest when booked with the ticket.", faq: [["Why are Allegiant bag fees different on each flight?", "Allegiant prices bags dynamically by route and date; this tool uses typical amounts."]] }),
  piece("air-canada-baggage-fee-calculator", "Air Canada", E.AIR_CANADA, { zone: 0, bags: 1, weight: 22 }, { faq: [["Does Air Canada include a free bag?", "Not on Basic or Standard fares within North America; long-haul economy usually includes one 23 kg bag."]] }),
  piece("lufthansa-baggage-fee-calculator", "Lufthansa", E.LUFTHANSA, { zone: 0, bags: 2, weight: 22 }, { faq: [["Can I add a bag to Economy Light?", "Yes, for a fee — it's cheaper when added online before check-in."]] }),
  piece("swiss-baggage-fee-calculator", "SWISS", E.SWISS, { zone: 0, bags: 2, weight: 22 }, { faq: [["Does SWISS use the same rules as Lufthansa?", "Yes, SWISS follows Lufthansa Group piece rules, priced in Swiss francs from Switzerland."]] }),
  piece("austrian-airlines-baggage-calculator", "Austrian Airlines", E.AUSTRIAN, { zone: 0, bags: 2, weight: 22 }, { faq: [["Is Austrian part of Lufthansa Group?", "Yes, so baggage rules match Lufthansa and SWISS."]] }),
  piece("air-france-baggage-calculator", "Air France", E.AIR_FRANCE, { zone: 0, bags: 2, weight: 22 }, { faq: [["How much is an extra bag on Air France?", "Typically €45–€75 within Europe and €100–€125 on long-haul flights, cheaper online."]] }),
  piece("klm-baggage-calculator", "KLM", E.KLM, { zone: 0, bags: 2, weight: 22 }, { faq: [["Is KLM's baggage policy the same as Air France?", "Yes, both follow the Air France-KLM piece system."]] }),
  piece("cathay-pacific-baggage-calculator", "Cathay Pacific", E.CATHAY, { zone: 2, bags: 3, weight: 22 }, { faq: [["Does Cathay Pacific use pieces or weight?", "Cathay moved to a piece allowance on most routes; the number of free 23 kg pieces depends on fare and route."]] }),
  weight("emirates-excess-baggage-calculator", "Emirates", "Emirates Excess Baggage Calculator", E.EMIRATES, { cabin: 1, zone: 2, weight: 32 }, [["How much is Emirates excess baggage per kg?", "Roughly $15–$90 per kg depending on route; prepaying online in blocks of 5 kg saves money."], ["Do Skywards members get more?", "Silver, Gold and Platinum members get an extra 12, 16 or 20 kg on weight-concept routes."]]),
  weight("qatar-airways-excess-baggage-calculator", "Qatar Airways", "Qatar Airways Excess Baggage Calculator", E.QATAR, { cabin: 1, zone: 2, weight: 30 }, [["Is Qatar's extra baggage cheaper online?", "Yes — buying extra kg online before the flight is usually much cheaper than at the airport."]]),
  weight("etihad-baggage-calculator", "Etihad", "Etihad Baggage Calculator", E.ETIHAD, { cabin: 1, zone: 2, weight: 30 }, [["How much luggage can I take on Etihad?", "It depends on your fare: Economy Basic 20 kg up to Deluxe 35 kg; Business 40 kg."]]),
  weight("turkish-airlines-baggage-calculator", "Turkish Airlines", "Turkish Airlines Baggage Calculator", E.TURKISH, { cabin: 0, zone: 1, weight: 26 }, [["How much is Turkish Airlines excess baggage?", "Per-kg rates are lowest on domestic and European routes and highest on long-haul; flights to the Americas charge per extra piece."], ["Miles&Smiles bonus allowance?", "Elite and Elite Plus members get extra baggage allowance."]]),
  weight("singapore-airlines-excess-baggage-calculator", "Singapore Airlines", "Singapore Airlines Excess Baggage Calculator", E.SIA, { cabin: 1, zone: 3, weight: 34 }, [["Does KrisFlyer status add baggage?", "Elite Silver adds 10 kg, Elite Gold and PPS Club add 20 kg or an extra piece."]]),
  weight("air-india-baggage-calculator", "Air India", "Air India Baggage Calculator", E.AIR_INDIA, { cabin: 0, zone: 0, weight: 20 }, [["What is Air India's domestic baggage allowance?", "Typically 15 kg on Economy Comfort and 20–25 kg on higher fares; excess is charged per kg."]]),
  mk({
    slug: "excess-baggage-calculator", title: "Excess Baggage Calculator (Extra Bag & Overweight Fees)",
    desc: "Calculate excess baggage charges for any airline — weight concept (per kg over your allowance) or piece concept (fees per extra bag) — and see whether an extra bag beats paying excess.",
    inputs: [dd("model", "Airline's Baggage System", ["Piece concept (pay per bag)", "Weight concept (pay per kg)"], 0), num("bags", "Checked Bags", 2, 0, 10, 1), num("free", "Free Bags Included", 1, 0, 5, 1), money("f1", "1st Extra Bag Fee", 40), money("f2", "2nd Extra Bag Fee", 50), money("f3", "3rd+ Extra Bag Fee", 150), money("owfee", "Overweight Fee per Bag", 100), num("heavy", "Overweight Bags", 0, 0, 10, 1), num("weight", "Total Checked Weight (kg or lb)", 30, 0, 500, 0.1), num("allow", "Free Allowance (same unit)", 23, 0, 500, 0.1), money("perkg", "Excess Rate per kg/lb", 20), money("piece", "Price of an Extra Bag Instead", 75), RT, PAX],
    results: [["total", "Total Excess Charges", "c"], ["one", "Per Person, One Way", "c"], ["extra", "Excess", "t"], ["cheaper", "Cheaper Option", "t"], ["model", "System", "t"]],
    fn: E.excessBaggage, ex: { model: 0, bags: 2, free: 1, f1: 40, f2: 50, f3: 150, owfee: 100, heavy: 0, weight: 30, allow: 23, perkg: 20, piece: 75, rt: 0, pax: 1 },
    exText: (o) => `Example: 2 bags with 1 free and a $40 second-bag fee → ${o.one} one way.`,
    how: "Piece concept: each bag above the free number pays its fee, plus any overweight fees. Weight concept: (total weight − allowance) × the rate per kg. Compare the excess cost with buying an extra bag — when a bag is cheaper, split the weight.",
    assume: CHECK,
    faq: [["How can I avoid excess baggage fees?", "Prepay online, use a co-branded card, wear heavy items, or ship bulky items separately."]],
  }),
  mk({
    slug: "luggage-size-calculator", title: "Luggage Size Calculator (Carry-On & Checked Bag Limits)",
    desc: "Check if your suitcase or backpack fits carry-on, personal item or checked bag limits — dimensions, linear inches/cm, volume in litres and weight.",
    inputs: [num("l", "Length", 22, 0, 500, 0.1), num("w", "Width", 14, 0, 500, 0.1), num("h", "Height / Depth", 9, 0, 500, 0.1), dd("su", "Size Unit", ["Inches", "Centimetres"], 0), num("kg", "Weight (0 = skip)", 0, 0, 200, 0.1), dd("wu", "Weight Unit", E.WU, 0), dd("rule", "Check Against", E.SIZE_RULE, 0)],
    results: [["fit", "Result", "t"], ["lin_in", "Linear Size (in)", "n", 1], ["lin_cm", "Linear Size (cm)", "n", 1], ["vol", "Volume (litres)", "n", 1], ["dims", "Your Bag", "t"]],
    fn: E.luggageSize, ex: { l: 22, w: 14, h: 9, su: 0, kg: 0, wu: 0, rule: 0 },
    exText: (o) => `Example: a 22 × 14 × 9 in bag against the US carry-on limit → ${o.fit} (${o.vol} litres).`,
    how: "Linear size = length + width + height (wheels and handles included). Carry-on rules check each side; checked bags use the 62-inch (158 cm) linear limit. The sides are compared longest-to-longest, so it doesn't matter which way you measure.",
    assume: "Airlines' own sizers decide at the gate — soft bags squeeze, hard cases don't.",
    faq: [["What size is a carry-on?", "22 × 14 × 9 in (56 × 36 × 23 cm) on most US airlines; 55 × 40 × 23 cm on many European airlines."], ["How many litres is a carry-on?", "About 35–45 litres."]],
  }),
];

runBatch(TRV_FLIGHT, TOOLS);
