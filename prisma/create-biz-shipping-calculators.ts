// One-time (but safe to re-run) batch setup script: creates 28 shipping, postage & ecommerce
// calculators (Business & Industrial Calculators > Shipping, Postage & Ecommerce Calculators). Rate
// models, surcharges, tariffs and date maths live in src/lib/calc-engine-biz-shipping.ts; examples are
// computed from the engine. Merged keywords (no separate page): Pirate Ship → usps-shipping (commercial
// pricing); Delivery Rates by Distance → delivery-fee; Shipping Box Size, Packaging → shipping-box; Mail
// Delivery Time, Letter Delivery Time → usps-delivery-time; Canada to US Import Fees → canada-to-us-
// import-duty. Near-namesakes kept distinct: canada-to-us-import-duty / uk-to-us-tariff compute US
// duty on goods coming IN to the US, whereas the existing canada-import-duty / uk-import-duty tools
// compute Canadian / UK duty on goods going out of the US.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-shipping-calculators.ts
// or
//   npm run db:create-biz-shipping-calculators

import * as E from "../src/lib/calc-engine-biz-shipping";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100, step: opts.step ?? 0.5 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

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

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const yn = (key: string, label: string, def = 0) => dropdown(key, label, YESNO, def);
const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const cur = (key: string, label: string, def: number, max = 10000000, step = 1) => currencyField(key, label, { default: def, max, step });
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const pct = (key: string, label: string, def: number, max = 100, step = 0.1) => percentField(key, label, { default: def, max, step });
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][]; currency?: string }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt] = s.results[0];
  const c = s.currency ? { currency: s.currency } : {};
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Online Estimator`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainFmt === "c" ? c : {}) },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(f === "c" ? c : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const CAT = "shipping-postage-ecommerce-calculators";
const NOTE = "Carrier prices are planning estimates of 2026 list rates, not live quotes — rates, surcharges and tariffs change, so confirm on the carrier's or agency's official site before you buy a label or import.";

const dateField = (key: string, label: string, def: number | string = "today") => ({ key, label, type: "date", required: true, default: def });
const WEIGHT = (def = 5) => num("weight", "Package Weight (lb)", def, 150, 0.1);
const BOX = [num("length", "Length (in)", 12, 120, 0.5), num("width", "Width (in)", 10, 120, 0.5), num("height", "Height (in)", 8, 120, 0.5)];
const ZONE = dropdown("zone", "Shipping Zone (1 = local, 8 = farthest)", opts(["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8"].map((z, i) => `${z}${i === 1 ? " (≤150 mi)" : i === 4 ? " (601–1,000 mi)" : i === 7 ? " (1,801+ mi)" : ""}`)).map(([l, i]) => [l, i + 1] as [string, number]), 5);
const ADJ = pct("rateAdjust", "Rate Adjustment vs Estimate (+/− %)", 0, 100, 1);
const RES = yn("residential", "Residential Delivery?", 1);
const REGION = dropdown("region", "Destination", opts(E.REGIONS), 2);
const CONTENTS = [cur("contentsValue", "Contents Value (for duty estimate)", 100, 1000000), pct("dutyRate", "Destination Duty + Tax Rate", 20, 100, 0.5)];
const PARCEL: Line[] = [["shippingCost", "Estimated Shipping Cost", "c"], ["baseRate", "Base Rate", "c"], ["fuelSurcharge", "Fuel Surcharge", "c"], ["residentialSurcharge", "Residential Surcharge", "c"], ["handlingSurcharges", "Additional Handling / Large Package", "c"], ["declaredValueFee", "Declared Value Coverage", "c"], ["billableWeightLb", "Billable Weight (lb)", "n"], ["dimWeightLb", "Dimensional Weight (lb)", "n"], ["transitDays", "Transit Days (business)", "n"]];
const INTL: Line[] = [["shippingCost", "Estimated Shipping Cost", "c"], ["baseRate", "Base Rate", "c"], ["fuelSurcharge", "Fuel Surcharge", "c"], ["estimatedDuties", "Estimated Duties & Taxes (paid by recipient)", "c"], ["billableWeightLb", "Billable Weight (lb)", "n"], ["dimWeightLb", "Dimensional Weight (lb)", "n"], ["transitDaysMin", "Transit Days (min)", "n"], ["transitDaysMax", "Transit Days (max)", "n"], ["notAvailable", "Service Not Offered to This Region (1 = yes)", "n"], ["overLimit", "Over Weight Limit (1 = yes)", "n"]];
const DELIVERY: Line[] = [["estimatedDeliveryDate", "Estimated Delivery Date", "d"], ["shipDate", "Ship Date", "d"], ["transitBusinessDays", "Transit (business days)", "n"], ["calendarDays", "Calendar Days", "n"], ["zone", "Zone", "n"]];
const ZONE_OR_MILES = [dropdown("mode", "Distance By", opts(["Zone", "Miles"]), 0), ZONE, num("miles", "Distance (miles)", 900, 6000, 10)];

const TOOLS: ToolDef[] = [
  mk({
    slug: "usps-shipping-calculator", title: "USPS Shipping Calculator",
    desc: "Estimate USPS postage for Ground Advantage, Priority Mail and Priority Mail Express — retail or discounted commercial (Pirate Ship-style) rates — by weight, size and zone.",
    meta: "USPS Shipping Calculator — Ground Advantage & Priority Rates",
    inputs: [dropdown("service", "Service", opts(E.USPS.map(([n]) => n)), 1), dropdown("pricing", "Pricing", opts(["Retail (Post Office counter)", "Commercial (online labels, Pirate Ship, Shopify)"]), 0), WEIGHT(3), ...BOX, ZONE, cur("insuredValue", "Insured Value (0 = none)", 0, 5000), ADJ],
    results: [["postage", "Estimated Postage", "c"], ["labelPrice", "Label Price", "c"], ["retailPrice", "Retail Price", "c"], ["savingsVsRetail", "Savings vs Retail", "c"], ["insurance", "Insurance", "c"], ["billableWeightLb", "Billable Weight (lb)", "n"], ["dimWeightLb", "Dimensional Weight (lb)", "n"], ["transitDays", "Typical Transit (days)", "n"], ["overLimit", "Over USPS Size/Weight Limit (1 = yes)", "n"]],
    fn: E.uspsShipping, ex: { service: 1, pricing: 0, weight: 3, length: 12, width: 10, height: 8, zone: 5, insuredValue: 0, rateAdjust: 0 },
    exText: (o) => `Example: a 3 lb, 12 × 10 × 8 in box by Priority Mail to zone 5 is about ${usd(o.retailPrice)} at the counter; with commercial pricing through an online label service it would be roughly 20% less.`,
    how: "Choose the service and whether you'll pay retail or buy discounted labels online, then enter weight, box size and zone (use the Shipping Zone Calculator if unsure).",
    assume: "Billable weight uses USPS dimensional weight (L × W × H ÷ 166) only for boxes over 1 cu ft. Commercial pricing ≈ 22% off Ground Advantage and 20% off Priority retail — the rates Pirate Ship, Shopify and other label services pass on. Size limit 108 in length + girth (130 in for Ground Advantage), 70 lb.",
    faq: [["Is Pirate Ship cheaper than the Post Office?", "Usually yes — online label services give USPS commercial pricing, often 15–40% below retail."], ["What is the cheapest USPS shipping?", "Ground Advantage for packages, Media Mail for books and media."]],
  }),
  mk({
    slug: "ground-advantage-calculator", title: "USPS Ground Advantage Calculator",
    desc: "Estimate USPS Ground Advantage postage — ounce tiers under 1 lb and pound rates up to 70 lb — at retail or commercial pricing, with transit days by zone.",
    inputs: [dropdown("unit", "Weight Unit", opts(["Ounces", "Pounds"]), 0), num("weight", "Weight", 12, 1120, 0.1), ...BOX, ZONE, dropdown("pricing", "Pricing", opts(["Retail", "Commercial (online labels)"]), 0), ADJ],
    results: [["postage", "Estimated Postage", "c"], ["retailPrice", "Retail Price", "c"], ["commercialPrice", "Commercial Price", "c"], ["billableWeightLb", "Billable Weight (lb)", "n"], ["transitDays", "Typical Transit (days)", "n"], ["overLimit", "Over 70 lb (1 = yes)", "n"]],
    fn: E.groundAdvantage, ex: { unit: 0, weight: 12, length: 10, width: 8, height: 4, zone: 5, pricing: 0, rateAdjust: 0 },
    exText: (o) => `Example: a 12 oz package to zone 5 costs about ${usd(o.retailPrice)} retail or ${usd(o.commercialPrice)} with commercial pricing, arriving in about ${o.transitDays} days.`,
    how: "Enter the weight in ounces or pounds, the box size and the zone. Under 1 lb, USPS prices by 4-ounce tiers.",
    assume: "Ounce tiers: up to 4, 8, 12 and 15.99 oz. Above 1 lb, priced per pound by zone. Commercial pricing ≈ 22% below retail. Ground Advantage delivers in 2–5 business days.",
    faq: [["What replaced First-Class Package Service?", "USPS Ground Advantage replaced First-Class Package, Parcel Select Ground and Retail Ground in July 2023."]],
  }),
  mk({
    slug: "media-mail-calculator", title: "USPS Media Mail Calculator",
    desc: "Estimate USPS Media Mail postage for books, CDs, DVDs and educational media by weight — and see how much you save versus Ground Advantage.",
    meta: "USPS Media Mail Calculator — Book Shipping Rates",
    inputs: [num("weight", "Weight (lb)", 4, 70, 0.1), ZONE, dropdown("pricing", "Pricing", opts(["Retail", "Commercial"]), 0), ADJ],
    results: [["postage", "Estimated Media Mail Postage", "c"], ["groundAdvantageRetail", "Ground Advantage (retail) for Comparison", "c"], ["savingsVsGroundAdvantage", "Savings vs Ground Advantage", "c"], ["billableWeightLb", "Billable Weight (lb)", "n"], ["transitDaysMin", "Transit Days (min)", "n"], ["transitDaysMax", "Transit Days (max)", "n"]],
    fn: E.mediaMail, ex: { weight: 4, zone: 5, pricing: 0, rateAdjust: 0 },
    exText: (o) => `Example: 4 lb of books costs about ${usd(o.postage)} by Media Mail versus ${usd(o.groundAdvantageRetail)} by Ground Advantage to zone 5 — a ${usd(o.savingsVsGroundAdvantage)} saving.`,
    how: "Enter the weight. Media Mail prices don't depend on distance, so the zone is only used for the Ground Advantage comparison.",
    assume: "Estimated 2026 retail: about $4.86 for the first pound plus $0.89 per extra pound. Only books, sound and video recordings, printed music and similar media qualify — no ads, video games or magazines with advertising. Packages may be inspected.",
    faq: [["What can I send by Media Mail?", "Books (8+ pages), CDs, DVDs, printed music, manuscripts and educational media without advertising."], ["How long does Media Mail take?", "Usually 2–8 business days."]],
  }),
  mk({
    slug: "ups-shipping-calculator", title: "UPS Shipping Calculator",
    desc: "Estimate UPS shipping cost for Ground, 3 Day Select, 2nd Day Air and Next Day Air — billable weight, fuel and residential surcharges, large-package fees and declared value.",
    meta: "UPS Shipping Calculator — Ground & Air Rate Estimate",
    inputs: [dropdown("service", "Service", opts(E.UPS.map(([n]) => n)), 0), dropdown("rateType", "Rate Type", opts(["Daily rates (online / account)", "Retail (UPS Store counter)"]), 0), WEIGHT(10), ...BOX.map((f) => ({ ...f, default: (f as { default: number }).default + 4 })), ZONE, RES, cur("declaredValue", "Declared Value", 100, 50000), ADJ],
    results: PARCEL,
    fn: E.upsShipping, ex: { service: 0, rateType: 0, weight: 10, length: 16, width: 14, height: 12, zone: 5, residential: 1, declaredValue: 100, rateAdjust: 0 },
    exText: (o) => `Example: a 10 lb, 16 × 14 × 12 in box by UPS Ground to a home in zone 5 bills at ${o.billableWeightLb} lb (dim weight ${o.dimWeightLb} lb) and costs about ${usd(o.shippingCost)} including fuel and the residential surcharge.`,
    how: "Choose the service and rate type, then enter weight, dimensions and zone. UPS bills the greater of actual and dimensional weight.",
    assume: "Dim weight = L × W × H ÷ 139. Estimated 2026 surcharges: residential $6.15 ground / $6.60 air, fuel ~19% ground / 22% air, additional handling $32, large package $265. Declared value: first $100 free, then about $1.45 per $100 (min $4.25).",
    faq: [["How does UPS calculate shipping cost?", "By billable weight (actual or dimensional, whichever is higher), zone, service and surcharges such as fuel and residential delivery."], ["Is the UPS Store more expensive?", "Yes — retail counter rates are roughly 25–30% above UPS daily rates."]],
  }),
  mk({
    slug: "fedex-shipping-calculator", title: "FedEx Shipping Calculator",
    desc: "Estimate FedEx shipping cost for Ground / Home Delivery, Express Saver, 2Day and Overnight — with dimensional weight, fuel, residential and large-package surcharges.",
    meta: "FedEx Shipping Calculator — Ground & Express Estimate",
    inputs: [dropdown("service", "Service", opts(E.FEDEX.map(([n]) => n)), 0), dropdown("rateType", "Rate Type", opts(["Standard list (online / account)", "Retail (FedEx Office counter)"]), 0), WEIGHT(10), ...BOX.map((f) => ({ ...f, default: (f as { default: number }).default + 4 })), ZONE, RES, cur("declaredValue", "Declared Value", 100, 50000), ADJ],
    results: PARCEL,
    fn: E.fedexShipping, ex: { service: 0, rateType: 0, weight: 10, length: 16, width: 14, height: 12, zone: 5, residential: 1, declaredValue: 100, rateAdjust: 0 },
    exText: (o) => `Example: a 10 lb, 16 × 14 × 12 in box by FedEx Home Delivery to zone 5 bills at ${o.billableWeightLb} lb and costs about ${usd(o.shippingCost)}, arriving in about ${o.transitDays} business days.`,
    how: "Choose the service and rate type, enter the package weight and size, the zone and whether it's going to a home.",
    assume: "Dim weight = L × W × H ÷ 139. Surcharges are 2026 estimates similar to UPS: residential ~$6.15 / $6.60, fuel 19% ground / 22% express, additional handling $32, oversize $265.",
    faq: [["Is FedEx or UPS cheaper?", "Their list rates are very close; the cheaper one usually depends on your negotiated discount and surcharges."]],
  }),
  mk({
    slug: "dhl-shipping-calculator", title: "DHL Express Shipping Calculator",
    desc: "Estimate DHL Express international shipping from the US — Worldwide, 12:00 or 9:00 — by weight, size and destination region, with fuel surcharge and duties.",
    meta: "DHL Shipping Calculator — DHL Express Rates from the US",
    inputs: [dropdown("service", "Service", opts(E.DHL_INTL.map(([n]) => n)), 0), REGION, WEIGHT(4), ...BOX, yn("remoteArea", "Remote Area Delivery (+$35)?"), ...CONTENTS, ADJ],
    results: INTL.filter(([k]) => k !== "notAvailable"),
    fn: E.dhlShipping, ex: { service: 0, region: 2, weight: 4, length: 12, width: 10, height: 8, remoteArea: 0, contentsValue: 100, dutyRate: 20, rateAdjust: 0 },
    exText: (o) => `Example: a 4 lb, 12 × 10 × 8 in box to Europe by DHL Express Worldwide bills at ${o.billableWeightLb} lb and costs about ${usd(o.shippingCost)} including fuel, arriving in ${o.transitDaysMin}–${o.transitDaysMax} business days.`,
    how: "Pick the service and destination region, then enter weight and box size. DHL bills the greater of actual and dimensional weight.",
    assume: "Dim weight = L × W × H ÷ 139 (5,000 cm³/kg). Fuel surcharge ~27%. Duties and VAT are usually paid by the recipient unless you ship DDP.",
    faq: [["Does DHL ship within the US?", "DHL Express is international only from the US; domestic parcels go through partners or DHL eCommerce."]],
  }),
  mk({
    slug: "usps-international-shipping-calculator", title: "USPS International Shipping Calculator",
    desc: "Estimate USPS international postage — First-Class Package International, Priority Mail International and Priority Mail Express International — by destination, weight and size.",
    inputs: [dropdown("service", "Service", opts(E.USPS_INTL.map(([n]) => n)), 1), REGION, WEIGHT(3), ...BOX, ...CONTENTS, ADJ],
    results: INTL.filter(([k]) => k !== "notAvailable"),
    fn: E.uspsInternational, ex: { service: 1, region: 0, weight: 3, length: 12, width: 10, height: 8, contentsValue: 100, dutyRate: 20, rateAdjust: 0 },
    exText: (o) => `Example: a 3 lb box to Canada by Priority Mail International costs about ${usd(o.shippingCost)} and takes ${o.transitDaysMin}–${o.transitDaysMax} business days.`,
    how: "Choose the service and destination region, then enter weight and box size. First-Class Package International is limited to 4 lb and $400 in value.",
    assume: "Estimated 2026 retail prices by price group, priced per pound. USPS applies dimensional weight over 1 cu ft. A customs form (CN22/CN23) is required.",
    faq: [["What's the cheapest way to ship internationally with USPS?", "First-Class Package International for packages up to 4 lb."]],
  }),
  mk({
    slug: "ups-international-shipping-calculator", title: "UPS International Shipping Calculator",
    desc: "Estimate UPS international shipping — Standard to Canada and Mexico, Worldwide Expedited, Saver and Express — by destination, weight and box size, with fuel and duties.",
    inputs: [dropdown("service", "Service", opts(E.UPS_INTL.map(([n]) => n)), 1), REGION, WEIGHT(10), ...BOX, yn("remoteArea", "Remote Area Delivery (+$35)?"), ...CONTENTS, ADJ],
    results: INTL,
    fn: E.upsInternational, ex: { service: 1, region: 2, weight: 10, length: 12, width: 10, height: 8, remoteArea: 0, contentsValue: 100, dutyRate: 20, rateAdjust: 0 },
    exText: (o) => `Example: a 10 lb box to Europe by UPS Worldwide Expedited costs about ${usd(o.shippingCost)} with fuel, arriving in ${o.transitDaysMin}–${o.transitDaysMax} business days.`,
    how: "Choose the service and destination, enter the weight and box size. UPS Standard (ground) only serves Canada and Mexico.",
    assume: "Dim weight ÷ 139; international fuel surcharge ~26%. Brokerage and duties are billed to the receiver unless you choose DDP.",
    faq: [["What is the cheapest UPS international service?", "UPS Standard to Canada or Mexico; elsewhere, Worldwide Expedited."]],
  }),
  mk({
    slug: "fedex-international-shipping-calculator", title: "FedEx International Shipping Calculator",
    desc: "Estimate FedEx international shipping — International Ground to Canada, International Economy, Priority and First — by destination, weight and dimensions, with fuel and duties.",
    inputs: [dropdown("service", "Service", opts(E.FEDEX_INTL.map(([n]) => n)), 1), REGION, WEIGHT(10), ...BOX, yn("remoteArea", "Out-of-Delivery-Area (+$35)?"), ...CONTENTS, ADJ],
    results: INTL,
    fn: E.fedexInternational, ex: { service: 1, region: 3, weight: 10, length: 12, width: 10, height: 8, remoteArea: 0, contentsValue: 100, dutyRate: 20, rateAdjust: 0 },
    exText: (o) => `Example: a 10 lb box to Asia-Pacific by FedEx International Economy costs about ${usd(o.shippingCost)}, taking ${o.transitDaysMin}–${o.transitDaysMax} business days.`,
    how: "Choose the service and destination region, then the weight and box size.",
    assume: "Dim weight ÷ 139; international fuel surcharge ~26%. International Ground serves Canada only.",
    faq: [["How long does FedEx International Economy take?", "Usually 2–5 business days to major markets."]],
  }),
  mk({
    slug: "royal-mail-shipping-calculator", title: "Royal Mail Postage Calculator",
    desc: "Work out Royal Mail postage for letters, large letters, small and medium parcels — 2nd Class, 1st Class, Tracked 48, Tracked 24 and Special Delivery — by weight.",
    meta: "Royal Mail Large Letter & Parcel Price Calculator",
    inputs: [dropdown("format", "Format", opts(["Letter (≤ 100 g, 24 × 16.5 × 0.5 cm)", "Large letter (≤ 750 g, 35.3 × 25 × 2.5 cm)", "Small parcel (≤ 2 kg, 45 × 35 × 16 cm)", "Medium parcel (≤ 20 kg, 61 × 46 × 46 cm)"]), 1), dropdown("service", "Service", opts(["2nd Class", "1st Class", "Tracked 48", "Tracked 24", "Special Delivery Guaranteed by 1pm"]), 0), num("grams", "Weight (g)", 200, 20000, 1), num("quantity", "Number of Items", 1, 10000, 1, 1), ADJ],
    results: [["pricePerItem", "Price per Item (£)", "c"], ["totalPrice", "Total (£)", "c"], ["weightBandGrams", "Weight Band (up to, g)", "n"], ["firstClassStampsEquivalent", "1st Class Stamps Equivalent", "n"], ["notAvailable", "Not Available for This Format/Weight (1 = yes)", "n"]],
    currency: "GBP",
    fn: E.royalMail, ex: { format: 1, service: 0, grams: 200, quantity: 1, rateAdjust: 0 },
    exText: (o) => `Example: a 200 g large letter costs about £${o.pricePerItem.toFixed(2)} by 2nd Class (the ${o.weightBandGrams} g band).`,
    how: "Choose the format by size, the service, and enter the weight in grams.",
    assume: "Approximate 2025/26 Royal Mail online/counter prices for UK delivery; Royal Mail usually changes prices each April and October. Letters over 5 mm thick count as large letters.",
    faq: [["How much is a large letter stamp?", "About £1.55 for 2nd Class and £2.60 for 1st Class up to 100 g."], ["What counts as a large letter?", "Up to 35.3 × 25 cm, 2.5 cm thick and 750 g."]],
  }),
  mk({
    slug: "eddm-postage-calculator", title: "EDDM Postage & Cost Calculator",
    desc: "Estimate an Every Door Direct Mail (EDDM) campaign — postage, printing and design per piece — with expected responses, customers, cost per customer and ROI.",
    meta: "EDDM Cost Calculator — Postage, Printing & ROI",
    inputs: [num("pieces", "Mail Pieces", 5000, 1000000, 100), cur("postagePerPiece", "EDDM Retail Postage per Piece", 0.247, 2, 0.001), cur("printPerPiece", "Printing per Piece", 0.12, 5, 0.005), cur("design", "Design / Setup", 250, 20000), pct("responseRate", "Response Rate", 1, 20, 0.1), pct("conversionRate", "Responses that Become Customers", 25, 100, 1), cur("customerValue", "Value of a New Customer", 300, 100000)],
    results: [["totalCost", "Total Campaign Cost", "c"], ["postageCost", "Postage", "c"], ["printingCost", "Printing", "c"], ["costPerPiece", "Cost per Piece", "c"], ["expectedResponses", "Expected Responses", "n"], ["newCustomers", "New Customers", "n"], ["costPerCustomer", "Cost per Customer", "c"], ["roiPercent", "ROI", "p"], ["bundlesOf100", "Bundles (≈100 pieces)", "n"]],
    fn: E.eddm, ex: { pieces: 5000, postagePerPiece: 0.247, printPerPiece: 0.12, design: 250, responseRate: 1, conversionRate: 25, customerValue: 300 },
    exText: (o) => `Example: 5,000 EDDM postcards cost about ${usd(o.totalCost)} (${usd(o.costPerPiece)} each). At 1% response and 25% conversion that's ${o.newCustomers} customers at ${usd(o.costPerCustomer)} each — an ROI of ${o.roiPercent}%.`,
    how: "Enter how many pieces you'll mail and your postage and printing prices, then your expected response and customer value.",
    assume: "EDDM Retail postage per piece is set by USPS (check the current rate; it changes each July). Pieces must be flats (e.g. 6.25 × 11 in or larger). Response rates for saturation mail typically run 0.5–2%.",
    faq: [["How much does EDDM cost?", "Postage plus printing typically lands at $0.35–0.60 per piece."], ["What is the EDDM retail limit?", "Up to 5,000 pieces per ZIP Code per day at a Post Office."]],
  }),
  mk({
    slug: "delivery-fee-calculator", title: "Delivery Fee Calculator",
    desc: "Set a local delivery fee by distance and weight — base fee, per-mile rate beyond included miles, small-order and peak surcharges, free-delivery threshold — and see profit per delivery.",
    meta: "Delivery Fee Calculator — Rates by Distance",
    inputs: [num("miles", "Delivery Distance (miles)", 12, 1000, 0.1), cur("baseFee", "Base Fee", 5, 1000, 0.25), num("includedMiles", "Miles Included in Base", 5, 100, 0.5), cur("perMile", "Per Additional Mile", 1.25, 50, 0.05), num("weight", "Order Weight (lb)", 20, 10000, 0.5), num("includedWeight", "Weight Included (lb)", 25, 10000), cur("perLb", "Per Extra lb", 0.1, 10, 0.01), cur("orderValue", "Order Value", 60, 1000000, 0.5), cur("smallOrderThreshold", "Small-Order Threshold", 25, 10000), cur("smallOrderFee", "Small-Order Fee", 3, 100, 0.25), pct("peakSurcharge", "Peak / Rush Surcharge", 0, 200, 1), cur("freeOver", "Free Delivery Over (0 = never)", 0, 100000), cur("minimumFee", "Minimum Fee", 5, 1000, 0.25), cur("driverCostPerMile", "Your Driver + Vehicle Cost per Mile", 0.85, 20, 0.01)],
    results: [["deliveryFee", "Delivery Fee to Charge", "c"], ["distanceCharge", "Distance Charge", "c"], ["weightCharge", "Weight Charge", "c"], ["smallOrderFee", "Small-Order Fee", "c"], ["feeAsPercentOfOrder", "Fee as % of Order", "p"], ["yourRoundTripCost", "Your Round-Trip Cost", "c"], ["profitPerDelivery", "Profit per Delivery", "c"]],
    fn: E.deliveryFee, ex: { miles: 12, baseFee: 5, includedMiles: 5, perMile: 1.25, weight: 20, includedWeight: 25, perLb: 0.1, orderValue: 60, smallOrderThreshold: 25, smallOrderFee: 3, peakSurcharge: 0, freeOver: 0, minimumFee: 5, driverCostPerMile: 0.85 },
    exText: (o) => `Example: a 12-mile delivery with a $5 base covering 5 miles and $1.25 a mile after that costs the customer ${usd(o.deliveryFee)}; your round trip costs about ${usd(o.yourRoundTripCost)}, so you make ${usd(o.profitPerDelivery)}.`,
    how: "Set your pricing rules — base fee, per-mile and per-pound rates, surcharges — then test them with a sample order.",
    assume: "Round-trip cost = 2 × distance × your cost per mile (IRS 2026 business mileage is a useful benchmark for vehicle cost).",
    faq: [["How do I set a delivery fee by distance?", "Charge a base fee that covers a local radius, then a per-mile rate beyond it that at least covers your round-trip driving cost."]],
  }),
  mk({
    slug: "shipping-box-calculator", title: "Shipping Box Size Calculator",
    desc: "Find the right shipping box for your items — inside dimensions with padding, items per box, cubic feet, dimensional weight, length + girth and void fill.",
    meta: "Shipping Box Size Calculator — Box Packing & Dim Weight",
    inputs: [num("itemLength", "Item Length (in)", 8, 100, 0.25), num("itemWidth", "Item Width (in)", 6, 100, 0.25), num("itemHeight", "Item Height (in)", 3, 100, 0.25), num("itemWeight", "Item Weight (lb)", 1.5, 150, 0.1), num("across", "Items Side by Side", 2, 20, 1, 1), num("deep", "Items Front to Back", 1, 20, 1, 1), num("layers", "Layers (stacked)", 2, 20, 1, 1), num("padding", "Padding Each Side (in)", 1, 6, 0.25), num("wallThickness", "Box Wall Thickness (in)", 0.25, 1, 0.0625)],
    results: [["innerLengthIn", "Inside Length (in)", "n"], ["innerWidthIn", "Inside Width (in)", "n"], ["innerHeightIn", "Inside Height (in)", "n"], ["itemsPerBox", "Items per Box", "n"], ["boxCubicFeet", "Box Volume (cu ft)", "n"], ["dimWeight139", "Dim Weight UPS/FedEx (lb)", "n"], ["dimWeightUsps166", "Dim Weight USPS (lb)", "n"], ["estimatedPackedWeightLb", "Packed Weight (lb)", "n"], ["lengthPlusGirthIn", "Length + Girth (in)", "n"], ["voidFillCubicIn", "Void Fill Needed (in³)", "n"]],
    fn: E.shippingBox, ex: { itemLength: 8, itemWidth: 6, itemHeight: 3, itemWeight: 1.5, across: 2, deep: 1, layers: 2, padding: 1, wallThickness: 0.25 },
    exText: (o) => `Example: four 8 × 6 × 3 in items packed 2 across and 2 high with 1 in padding need a box about ${o.innerLengthIn} × ${o.innerWidthIn} × ${o.innerHeightIn} in inside — dim weight ${o.dimWeight139} lb for UPS/FedEx.`,
    how: "Enter the item size and weight, how you'll arrange them, and the padding you want on every side. Pick the nearest stock box at or above the inside dimensions.",
    assume: "Inside size = items × arrangement + 2 × padding. Outside adds wall thickness. Corrugated weight ≈ 0.9 lb per cu ft of box. Keep length + girth under 108 in for USPS and 130 in to avoid UPS/FedEx large-package fees.",
    faq: [["How much padding should I leave in a box?", "About 2 in on every side for fragile items, 1 in for sturdy ones."]],
  }),
  mk({
    slug: "length-girth-calculator", title: "Length + Girth Calculator",
    desc: "Calculate a package's length plus girth and check it against USPS, Ground Advantage, UPS and FedEx size limits, large-package and additional-handling thresholds.",
    meta: "Girth Calculator — Length + Girth Shipping Limits",
    inputs: [...BOX.map((f) => ({ ...f, default: (f as { default: number }).default * 2 })), num("weight", "Weight (lb)", 15, 150, 0.1)],
    results: [["lengthPlusGirthIn", "Length + Girth (in)", "n"], ["girthIn", "Girth (in)", "n"], ["longestSideIn", "Length (longest side, in)", "n"], ["uspsOk", "Within USPS 108 in / 70 lb (1 = yes)", "n"], ["uspsGroundAdvantageOk", "Within Ground Advantage 130 in (1 = yes)", "n"], ["upsFedexOk", "Within UPS/FedEx 165 in / 150 lb (1 = yes)", "n"], ["largePackageSurcharge", "UPS/FedEx Large Package Fee Applies (1 = yes)", "n"], ["additionalHandling", "Additional Handling Applies (1 = yes)", "n"], ["cubicFeet", "Cubic Feet", "n"]],
    fn: E.lengthGirth, ex: { length: 24, width: 20, height: 16, weight: 15 },
    exText: (o) => `Example: a 24 × 20 × 16 in box has a girth of ${o.girthIn} in and length + girth of ${o.lengthPlusGirthIn} in — ${o.uspsOk ? "within" : "over"} the USPS limit of 108 in.`,
    how: "Enter the three dimensions in any order; the longest side is treated as the length.",
    assume: "Girth = 2 × (width + height). Large package: length + girth > 130 in or length > 96 in. Additional handling: length > 48 in, second-longest side > 30 in or weight > 50 lb.",
    faq: [["How do you measure girth for shipping?", "Measure around the thickest part: 2 × width + 2 × height. Add the length to get length + girth."]],
  }),
  mk({
    slug: "box-compression-calculator", title: "Box Compression (ECT to BCT) Calculator",
    desc: "Estimate box compression strength (BCT) from edge crush test (ECT) board grade and box size with the McKee formula — safe stacking load and how many boxes you can stack.",
    meta: "Edge Crush Test Calculator — ECT to BCT Stacking Strength",
    inputs: [num("length", "Box Length (in)", 18, 100, 0.25), num("width", "Box Width (in)", 12, 100, 0.25), dropdown("board", "Board Grade", opts(E.BOARDS.map(([n]) => n)), 0), num("boxWeight", "Weight of Each Packed Box (lb)", 20, 500, 0.5), num("safetyFactor", "Safety Factor (humidity, time, pallet)", 4, 10, 0.5, 1), num("stackHeight", "Planned Stack Height (boxes)", 5, 100, 1)],
    results: [["boxCompressionLb", "Box Compression Strength (lb)", "n"], ["safeStackingLoadLb", "Safe Stacking Load (lb)", "n"], ["maxBoxesInStack", "Max Boxes in a Stack", "n"], ["loadOnBottomBoxLb", "Load on Bottom Box (lb)", "n"], ["passes", "Planned Stack OK (1 = yes)", "n"], ["perimeterIn", "Box Perimeter (in)", "n"]],
    fn: E.boxCompression, ex: { length: 18, width: 12, board: 0, boxWeight: 20, safetyFactor: 4, stackHeight: 5 },
    exText: (o) => `Example: an 18 × 12 in box in 32 ECT board has a BCT of about ${fmt(o.boxCompressionLb, 0)} lb; with a safety factor of 4 it safely carries ${fmt(o.safeStackingLoadLb, 0)} lb — up to ${o.maxBoxesInStack} boxes of 20 lb.`,
    how: "Enter the box footprint, the board grade printed on the box certificate, the packed weight and a safety factor (3–5 for warehouse storage, higher in humid conditions).",
    assume: "McKee: BCT = 5.87 × ECT × √(perimeter × caliper). Real strength drops ~40% at high humidity, ~35–45% over months of storage and up to 50% with overhang or misaligned stacking — the safety factor covers these.",
    faq: [["What does 32 ECT mean?", "The board withstands 32 lb per inch of edge in the edge crush test — the most common single-wall grade."]],
  }),
  mk({
    slug: "japan-proxy-shipping-calculator", title: "Japan Proxy Shipping Calculator (Buyee-Style)",
    desc: "Estimate the full cost of buying from Japan through a proxy service like Buyee or ZenMarket — item, domestic shipping, service fees, EMS or airmail, payment fees and US import tariff.",
    meta: "Japan Proxy Shipping Calculator — Buyee & ZenMarket Costs",
    inputs: [cur("itemPriceJpy", "Item Price (¥)", 12000, 100000000, 100), cur("domesticShippingJpy", "Domestic Shipping in Japan (¥)", 800, 100000, 10), cur("serviceFeeJpy", "Proxy Service / Plan Fee (¥)", 500, 100000, 10), cur("optionsJpy", "Options (insurance, packing) (¥)", 300, 100000, 10), dropdown("method", "International Shipping", opts(E.JP_METHODS.map(([n]) => n)), 0), num("weightKg", "Packed Weight (kg)", 1.2, 68, 0.1), num("jpyPerUsd", "Exchange Rate (¥ per $1)", 150, 400, 0.5, 50), pct("paymentFee", "Payment / Card Fee", 3.5, 20, 0.1), pct("tariff", "US Import Tariff on Item", 15, 100, 0.5), cur("brokerFee", "Carrier Brokerage Fee ($)", 0, 500, 0.5), ADJ],
    results: [["totalUsd", "Total Landed Cost ($)", "c"], ["totalJpy", "Total Paid to Proxy (¥)", "n"], ["internationalShippingJpy", "International Shipping (¥)", "n"], ["internationalShippingUsd", "International Shipping ($)", "c"], ["importDutyUsd", "US Import Tariff ($)", "c"], ["feesUsd", "Fees ($)", "c"], ["markupOverItemPercent", "Extra Cost over Item Price", "p"], ["transitDaysMin", "Transit Days (min)", "n"], ["transitDaysMax", "Transit Days (max)", "n"]],
    fn: E.japanProxy, ex: { itemPriceJpy: 12000, domesticShippingJpy: 800, serviceFeeJpy: 500, optionsJpy: 300, method: 0, weightKg: 1.2, jpyPerUsd: 150, paymentFee: 3.5, tariff: 15, brokerFee: 0, rateAdjust: 0 },
    exText: (o) => `Example: a ¥12,000 item shipped by EMS at 1.2 kg costs about ${usd(o.totalUsd)} delivered — ${o.markupOverItemPercent}% more than the item price once shipping, fees and the 15% US tariff are added.`,
    how: "Enter the item price and Japanese domestic shipping, your proxy's fees, the shipping method and estimated packed weight, and today's exchange rate. Independent estimate — not affiliated with any proxy service.",
    assume: "International rates are approximate Japan Post / courier prices to the US per 0.5 kg. Since 29 Aug 2025 US de minimis no longer applies, so Japanese goods generally pay the 15% US–Japan rate; carriers may add brokerage fees.",
    faq: [["Why is my Buyee shipping so expensive?", "You pay domestic shipping, the proxy fee, international shipping by weight, payment fees and now US import duty on every package."]],
  }),
  mk({
    slug: "shopify-shipping-calculator", title: "Shopify Shipping Cost Calculator",
    desc: "Estimate Shopify Shipping label costs for USPS, UPS and DHL Express by plan — discounted label price vs retail, savings, shipping profit and monthly spend.",
    inputs: [dropdown("plan", "Shopify Plan", opts(E.SHOPIFY_DISCOUNT.map(([n]) => n)), 0), dropdown("carrier", "Carrier", opts(["USPS", "UPS", "DHL Express (international)"]), 0), dropdown("speed", "Speed", opts(["Ground / economy", "2-day", "Overnight"]), 0), WEIGHT(2), ...BOX, ZONE, cur("chargedToCustomer", "Shipping Charged to Customer", 8, 1000, 0.25), num("ordersPerMonth", "Orders per Month", 200, 1000000), ADJ],
    results: [["labelCost", "Estimated Label Cost", "c"], ["retailRate", "Retail Rate", "c"], ["savings", "Savings per Label", "c"], ["discountPercent", "Average Discount", "p"], ["shippingProfit", "Shipping Profit / (Loss) per Order", "c"], ["monthlyLabelSpend", "Monthly Label Spend", "c"], ["monthlySavings", "Monthly Savings", "c"]],
    fn: E.shopifyShipping, ex: { plan: 0, carrier: 0, speed: 0, weight: 2, length: 12, width: 10, height: 8, zone: 5, chargedToCustomer: 8, ordersPerMonth: 200, rateAdjust: 0 },
    exText: (o) => `Example: on the Basic plan a 2 lb USPS Ground Advantage label to zone 5 costs about ${usd(o.labelCost)} (vs ${usd(o.retailRate)} retail). Charging customers $8 leaves ${usd(o.shippingProfit)} per order.`,
    how: "Choose your plan and carrier, enter a typical package and zone, and what you charge customers for shipping.",
    assume: "Average discounts vs retail used here (USPS ~20–24%, UPS ~40–50%, DHL ~55–65%) are typical figures; Shopify advertises 'up to' higher maximums on specific services. Independent estimate — not affiliated with Shopify.",
    faq: [["Is Shopify Shipping cheaper than the Post Office?", "Yes — Shopify passes on commercial USPS rates and discounted UPS and DHL rates."]],
  }),
  mk({
    slug: "walmart-wfs-fee-calculator", title: "Walmart WFS Fee Calculator",
    desc: "Calculate Walmart Fulfillment Services (WFS) fees — fulfillment fee by shipping weight, low-price, apparel and hazmat surcharges, referral fee and storage — with profit and margin.",
    meta: "WFS Fee Calculator — Walmart Fulfillment Fees & Profit",
    inputs: [cur("price", "Selling Price", 24.99, 100000, 0.01), cur("cost", "Product Cost", 8, 100000, 0.01), cur("inboundPerUnit", "Inbound Shipping per Unit", 0.5, 100, 0.01), num("weight", "Unit Weight (lb)", 1.2, 500, 0.05), num("length", "Length (in)", 10, 120, 0.25), num("width", "Width (in)", 6, 120, 0.25), num("height", "Height (in)", 3, 120, 0.25), pct("referralRate", "Referral Fee", 15, 20, 0.5), yn("apparel", "Apparel (+$0.50)?"), yn("hazmat", "Hazmat (+$0.50)?"), dropdown("season", "Storage Season", opts(["Jan–Sep ($0.75 / cu ft / month)", "Oct–Dec ($2.25 / cu ft / month)"]), 0), num("monthsStored", "Months in Storage per Unit", 1, 24, 0.5)],
    results: [["totalWfsFees", "Total Walmart Fees per Unit", "c"], ["fulfillmentFee", "WFS Fulfillment Fee", "c"], ["referralFee", "Referral Fee", "c"], ["storageFee", "Storage Fee", "c"], ["shippingWeightLb", "Shipping Weight (lb)", "n"], ["profitPerUnit", "Profit per Unit", "c"], ["profitMarginPercent", "Profit Margin", "p"], ["roiPercent", "ROI on Product Cost", "p"]],
    fn: E.walmartWfs, ex: { price: 24.99, cost: 8, inboundPerUnit: 0.5, weight: 1.2, length: 10, width: 6, height: 3, referralRate: 15, apparel: 0, hazmat: 0, season: 0, monthsStored: 1 },
    exText: (o) => `Example: a $24.99 item weighing 1.2 lb pays a ${usd(o.fulfillmentFee)} WFS fee and ${usd(o.referralFee)} referral fee — ${usd(o.totalWfsFees)} in total, leaving ${usd(o.profitPerUnit)} profit (${o.profitMarginPercent}% margin).`,
    how: "Enter the price, cost, unit weight and packaged dimensions. Shipping weight is the greater of unit weight and dimensional weight.",
    assume: "WFS fulfillment fee: ≤1 lb $3.45, 1–2 lb $4.95, 2–3 lb $5.45, 3–20 lb $5.75 + $0.40/lb above 4 lb (heavier tiers similar); +$1.00 for items under $10. Referral 15% for most categories (6–8% for some). Check Walmart Seller Center for the current schedule.",
    faq: [["Is WFS cheaper than Amazon FBA?", "WFS fees are often a little lower than FBA for small, light items, and storage is cheaper outside peak season."]],
  }),
  mk({
    slug: "amazon-acos-calculator", title: "Amazon ACoS Calculator",
    desc: "Calculate Amazon ACoS, ROAS, break-even ACoS, TACoS and ad profit from ad spend, ad sales, price, cost and Amazon fees — plus the target ACoS for your profit goal.",
    meta: "Amazon ACoS Calculator — Break-Even ACoS & TACoS",
    inputs: [cur("adSpend", "Ad Spend", 1000, 10000000, 1), cur("adSales", "Ad-Attributed Sales", 4000, 100000000, 1), cur("totalSales", "Total Sales (organic + ad)", 12000, 1000000000, 1), cur("price", "Product Price", 29.99, 100000, 0.01), cur("unitCost", "Product + Inbound Cost per Unit", 8, 100000, 0.01), cur("amazonFees", "Amazon Fees per Unit (referral + FBA)", 9.5, 10000, 0.01), pct("targetProfit", "Target Profit Margin After Ads", 10, 100, 0.5)],
    results: [["acosPercent", "ACoS", "p"], ["roas", "ROAS", "n"], ["breakEvenAcosPercent", "Break-Even ACoS", "p"], ["targetAcosForProfitPercent", "Target ACoS for Profit Goal", "p"], ["tacosPercent", "TACoS", "p"], ["profitFromAdSales", "Profit from Ad Sales", "c"], ["costPerOrder", "Ad Cost per Order", "c"]],
    fn: E.acos, ex: { adSpend: 1000, adSales: 4000, totalSales: 12000, price: 29.99, unitCost: 8, amazonFees: 9.5, targetProfit: 10 },
    exText: (o) => `Example: $1,000 of ad spend driving $4,000 of sales is an ACoS of ${o.acosPercent}% (ROAS ${o.roas}). With a break-even ACoS of ${o.breakEvenAcosPercent}%, those ad sales made ${usd(o.profitFromAdSales)}.`,
    how: "Enter ad spend and attributed sales from Campaign Manager, total sales for TACoS, and your per-unit price, cost and Amazon fees.",
    assume: "ACoS = ad spend ÷ ad sales; ROAS = 1 ÷ ACoS; break-even ACoS = profit margin before ads; TACoS = ad spend ÷ total sales.",
    faq: [["What is a good ACoS on Amazon?", "Anything below your break-even ACoS is profitable; many sellers aim for 15–30% depending on margins and launch goals."]],
  }),
  mk({
    slug: "shipping-rate-comparison-calculator", title: "Shipping Rate Comparison Calculator",
    desc: "Compare estimated USPS, UPS and FedEx rates side by side for the same package — ground, 2-day or overnight — and see the cheapest carrier and the price spread.",
    meta: "Shipping Rate Comparison — USPS vs UPS vs FedEx",
    inputs: [dropdown("speed", "Speed", opts(["Ground / economy", "2-day", "Overnight"]), 0), WEIGHT(5), ...BOX, ZONE, RES, dropdown("pricing", "USPS Pricing", opts(["Retail", "Commercial (online labels)"]), 1), ADJ],
    results: [["cheapestPrice", "Cheapest Price", "c"], ["cheapestCarrier", "Cheapest Carrier (1 USPS, 2 UPS, 3 FedEx)", "n"], ["uspsPrice", "USPS", "c"], ["upsPrice", "UPS", "c"], ["fedexPrice", "FedEx", "c"], ["spread", "Difference Highest vs Lowest", "c"], ["billableWeightUsps", "USPS Billable Weight (lb)", "n"], ["billableWeightUpsFedex", "UPS/FedEx Billable Weight (lb)", "n"]],
    fn: E.rateComparison, ex: { speed: 0, weight: 5, length: 12, width: 10, height: 8, zone: 5, residential: 1, pricing: 1, rateAdjust: 0 },
    exText: (o) => `Example: a 5 lb, 12 × 10 × 8 in box to a home in zone 5 by ground — USPS ${usd(o.uspsPrice)}, UPS ${usd(o.upsPrice)}, FedEx ${usd(o.fedexPrice)}. Cheapest: carrier ${o.cheapestCarrier}.`,
    how: "Enter one package and pick a speed. USPS shows 0 if the box is over USPS limits.",
    assume: "Uses the same 2026 estimate models as the USPS, UPS and FedEx calculators on this site (UPS/FedEx daily rates with fuel and residential surcharges). Your negotiated discounts can change the winner.",
    faq: [["Which carrier is cheapest for small packages?", "USPS is usually cheapest under about 5 lb; UPS and FedEx often win for heavier ground packages, especially with discounts."]],
  }),
  mk({
    slug: "canada-to-us-import-duty-calculator", title: "Canada to US Import Duty & Tariff Calculator",
    desc: "Estimate US duties and tariffs on goods imported from Canada — USMCA exemption, IEEPA and Section 232 tariffs, MFN duty, MPF and brokerage — for total landed cost.",
    meta: "Tariff Calculator Canada to US — Import Fees & Landed Cost",
    inputs: [cur("goodsValue", "Customs Value of Goods ($)", 10000, 100000000, 10), dropdown("scenario", "Goods / Tariff Scenario", opts(E.CA_SCENARIOS.map(([n, r]) => (r >= 0 ? `${n} — ${r}%` : n))), 1), pct("customTariff", "Custom Additional Tariff %", 0, 200, 0.5), pct("mfnRate", "Regular (MFN) Duty Rate", 3, 100, 0.1), cur("freight", "Freight to US", 600, 1000000), cur("insurance", "Insurance", 50, 1000000), cur("brokerFee", "Customs Broker Fee", 150, 10000, 5), yn("ocean", "Arrives by Ship (adds HMF)?"), num("units", "Units in Shipment", 100, 10000000, 1, 1)],
    results: [["totalImportCharges", "Total Duties, Tariffs & Fees", "c"], ["additionalTariff", "Additional Tariff", "c"], ["dutyMfn", "Regular Duty", "c"], ["mpf", "Merchandise Processing Fee", "c"], ["hmf", "Harbor Maintenance Fee", "c"], ["landedCost", "Total Landed Cost", "c"], ["landedPerUnit", "Landed Cost per Unit", "c"], ["effectiveRatePercent", "Effective Rate on Goods", "p"]],
    fn: E.canadaToUs, ex: { goodsValue: 10000, scenario: 1, customTariff: 0, mfnRate: 3, freight: 600, insurance: 50, brokerFee: 150, ocean: 0, units: 100 },
    exText: (o) => `Example: $10,000 of non-USMCA Canadian goods with a 3% regular duty pay ${usd(o.additionalTariff)} in IEEPA tariff plus ${usd(o.dutyMfn)} duty and ${usd(o.mpf)} MPF — a landed cost of ${usd(o.landedCost)} (${usd(o.landedPerUnit)} per unit).`,
    how: "Enter the customs value, choose the scenario (goods that qualify under USMCA rules of origin are exempt from the IEEPA tariff), and the HTS duty rate for your product. Use 'Custom' for newer rates.",
    assume: "2026 rates: IEEPA 35% on non-USMCA Canadian goods (10% energy and potash); Section 232 steel, aluminum and copper 50%, autos 25% on non-US content. MPF 0.3464% on formal entries ($33.58–$651.50), $2.69 informal. De minimis duty-free entry ended 29 Aug 2025. Tariff policy is changing quickly — confirm with CBP or your broker.",
    faq: [["Do Canadian goods pay US tariffs?", "Goods that qualify under USMCA are exempt; others pay the IEEPA tariff plus any Section 232 duties."], ["What is the MPF?", "A CBP processing fee of 0.3464% of value on formal entries, with a minimum and maximum."]],
  }),
  mk({
    slug: "uk-to-us-tariff-calculator", title: "UK to US Tariff & Import Duty Calculator",
    desc: "Estimate US import duties on goods from the UK — the 10% UK deal baseline, car quota rate, steel and aluminum rates, regular duty, MPF and brokerage — for landed cost.",
    meta: "Tariff Calculator UK to USA — Duty & Landed Cost",
    inputs: [cur("goodsValue", "Customs Value of Goods ($)", 10000, 100000000, 10), dropdown("scenario", "Goods / Tariff Scenario", opts(E.UK_SCENARIOS.map(([n, r]) => (r >= 0 ? `${n} — ${r}%` : n))), 0), pct("customTariff", "Custom Additional Tariff %", 0, 200, 0.5), pct("mfnRate", "Regular (MFN) Duty Rate", 2.5, 100, 0.1), cur("freight", "Freight to US", 800, 1000000), cur("insurance", "Insurance", 50, 1000000), cur("brokerFee", "Customs Broker Fee", 150, 10000, 5), yn("ocean", "Arrives by Ship (adds HMF)?", 1), num("units", "Units in Shipment", 100, 10000000, 1, 1)],
    results: [["totalImportCharges", "Total Duties, Tariffs & Fees", "c"], ["additionalTariff", "Additional (Reciprocal) Tariff", "c"], ["dutyMfn", "Regular Duty", "c"], ["mpf", "Merchandise Processing Fee", "c"], ["hmf", "Harbor Maintenance Fee", "c"], ["landedCost", "Total Landed Cost", "c"], ["landedPerUnit", "Landed Cost per Unit", "c"], ["effectiveRatePercent", "Effective Rate on Goods", "p"]],
    fn: E.ukToUs, ex: { goodsValue: 10000, scenario: 0, customTariff: 0, mfnRate: 2.5, freight: 800, insurance: 50, brokerFee: 150, ocean: 1, units: 100 },
    exText: (o) => `Example: $10,000 of UK goods with a 2.5% regular duty pay ${usd(o.additionalTariff)} under the 10% baseline plus ${usd(o.dutyMfn)} duty, MPF and HMF — ${usd(o.totalImportCharges)} in total, an effective ${o.effectiveRatePercent}%.`,
    how: "Enter the customs value, choose the scenario and your product's regular HTS duty rate, then freight and broker costs.",
    assume: "Under the 2025 US–UK Economic Prosperity Deal most UK goods pay a 10% additional tariff; cars within the 100,000-unit quota pay a combined 10% (7.5% on top of the 2.5% regular duty); UK steel and aluminum 25%; aerospace parts exempt. Rates change — confirm with CBP or a broker.",
    faq: [["What is the US tariff on UK goods?", "10% on most goods under the US–UK deal, on top of any regular duty."]],
  }),
  mk({
    slug: "perishable-shipping-calculator", title: "Perishable Shipping Calculator",
    desc: "Estimate the cost to ship perishable food overnight or 2-day — carrier rate, insulated box, dry ice or gel packs, dry ice fee — with coolant quantity and cost per pound.",
    meta: "Perishable Shipping Rate Calculator — Dry Ice & Gel Packs",
    inputs: [num("productWeight", "Product Weight (lb)", 8, 150, 0.1), dropdown("service", "Service", opts(["Overnight", "2-day"]), 0), dropdown("coolant", "Coolant", opts(["Gel packs", "Dry ice", "None (shelf-stable)"]), 1), num("transitHours", "Hours in Transit", 24, 96, 1, 12), num("dryIcePerDay", "Dry Ice per 24 h (lb)", 7.5, 30, 0.5), num("boxWeight", "Insulated Box Weight (lb)", 4, 40, 0.5), num("length", "Box Length (in)", 14, 48, 0.5), num("width", "Box Width (in)", 12, 48, 0.5), num("height", "Box Height (in)", 10, 48, 0.5), ZONE, RES, cur("insulatedBoxCost", "Insulated Box Cost", 14, 200, 0.25), cur("gelPackCost", "Gel Pack Cost", 1.25, 20, 0.05), cur("dryIceCostPerLb", "Dry Ice Cost per lb", 2, 10, 0.05), ADJ],
    results: [["totalCost", "Total Cost to Ship", "c"], ["shippingCost", "Carrier Charges", "c"], ["packagingCoolantCost", "Box & Coolant", "c"], ["dryIceLb", "Dry Ice (lb)", "n"], ["gelPacks", "Gel Packs", "n"], ["packedWeightLb", "Packed Weight (lb)", "n"], ["costPerProductLb", "Cost per lb of Product", "c"]],
    fn: E.perishable, ex: { productWeight: 8, service: 0, coolant: 1, transitHours: 24, dryIcePerDay: 7.5, boxWeight: 4, length: 14, width: 12, height: 10, zone: 5, residential: 1, insulatedBoxCost: 14, gelPackCost: 1.25, dryIceCostPerLb: 2, rateAdjust: 0 },
    exText: (o) => `Example: 8 lb of frozen food shipped overnight to zone 5 with ${o.dryIceLb} lb of dry ice costs about ${usd(o.totalCost)} — ${usd(o.costPerProductLb)} per pound of product.`,
    how: "Enter the product weight, service, coolant and transit time (add 12–24 h for weekends and delays), the box size and your packaging costs.",
    assume: "Dry ice sublimates about 5–10 lb per 24 h in a typical cooler; gel packs about 1 per 4 lb of product per day. Dry ice over 5.5 lb by air needs UN1845 labelling and carries a handling fee (~$6.50 est.). Carrier rate uses the FedEx express estimate with fuel.",
    faq: [["How much dry ice do I need to ship frozen food?", "About 5–10 lb per 24 hours in transit, depending on the cooler."]],
  }),
  mk({
    slug: "parcel-audit-roi-calculator", title: "Parcel Audit ROI Calculator",
    desc: "Estimate savings from a parcel audit — late-delivery guaranteed-service refunds and billing-error recovery — net of the audit fee, with ROI and savings as a share of spend.",
    meta: "Parcel Audit ROI Calculator — Savings Estimate",
    inputs: [cur("annualSpend", "Annual Parcel Spend", 500000, 1000000000, 1000), pct("lateRate", "Late Deliveries", 4, 30, 0.1), pct("guaranteedShare", "Spend on Money-Back Guaranteed Services", 40, 100, 1), pct("billingErrorRate", "Billing Errors Recoverable (% of spend)", 1.5, 10, 0.1), dropdown("feeModel", "Audit Fee Model", opts(["Contingency (% of recoveries)", "Flat monthly fee"]), 0), pct("contingencyFee", "Contingency Fee", 50, 100, 1), cur("flatFee", "Flat Monthly Fee", 500, 100000, 10)],
    results: [["netAnnualSavings", "Net Annual Savings", "c"], ["grossRecovery", "Gross Recovery", "c"], ["lateDeliveryRefunds", "Late-Delivery Refunds", "c"], ["billingErrorRecovery", "Billing Error Recovery", "c"], ["auditFee", "Audit Fee", "c"], ["roiPercent", "ROI on Audit Fee", "p"], ["savingsPercentOfSpend", "Net Savings as % of Spend", "p"]],
    fn: E.parcelAudit, ex: { annualSpend: 500000, lateRate: 4, guaranteedShare: 40, billingErrorRate: 1.5, feeModel: 0, contingencyFee: 50, flatFee: 500 },
    exText: (o) => `Example: on $500,000 of parcel spend, an audit could recover about ${usd(o.grossRecovery)}; after a 50% contingency fee you keep ${usd(o.netAnnualSavings)} (${o.savingsPercentOfSpend}% of spend).`,
    how: "Enter your annual spend, how much of it is on time-definite services that carry a guarantee, your late rate and the share of billing errors you expect to recover.",
    assume: "Refunds = spend × guaranteed share × late rate. Many carrier agreements waive the money-back guarantee — check your contract. Typical audits recover 1–5% of spend.",
    faq: [["Is a parcel audit worth it?", "Usually, if you ship a lot of express or time-definite packages and your contract keeps the service guarantee."]],
  }),
  mk({
    slug: "usps-delivery-time-calculator", title: "USPS Delivery Time Calculator",
    desc: "Estimate when USPS mail or packages will arrive — First-Class Mail letters, Ground Advantage, Priority, Express, Media and Marketing Mail — by zone or distance, skipping Sundays and holidays.",
    meta: "USPS Delivery Time Calculator — Mail Days Zip to Zip",
    inputs: [dropdown("service", "Mail Class", opts(E.USPS_DAYS.map(([n]) => n)), 0), ...ZONE_OR_MILES, dateField("shipDate", "Mailing Date"), yn("afterCutoff", "Mailed After Last Pickup / Cutoff?")],
    results: DELIVERY,
    fn: E.uspsDeliveryTime, ex: { service: 0, mode: 0, zone: 5, miles: 900, shipDate: 20759, afterCutoff: 0 },
    exText: (o) => `Example: a First-Class letter mailed on a Monday to a zone 5 address (about 600–1,000 miles) takes about ${o.transitBusinessDays} delivery days.`,
    how: "Choose the mail class, enter the zone (or the distance between ZIP Codes) and the mailing date. Use the Shipping Zone Calculator if you only know the ZIP Codes.",
    assume: "USPS service standards: First-Class Mail 1–5 days, Ground Advantage 2–5, Priority 1–3, Priority Express 1–2, Media Mail 2–8. USPS delivers Monday–Saturday (Express also Sundays); federal holidays are skipped. Standards are targets, not guarantees, except Priority Mail Express.",
    faq: [["How long does a letter take to arrive?", "First-Class Mail takes 1–5 days: about 2 locally and 4–5 across the country."], ["Does USPS deliver on Saturdays?", "Yes, most mail and packages are delivered Monday–Saturday."]],
  }),
  mk({
    slug: "ups-transit-time-calculator", title: "UPS Transit Time Calculator",
    desc: "Estimate UPS delivery date for Ground, 3 Day Select, 2nd Day Air and Next Day Air — by zone or distance — skipping weekends and holidays, with optional Saturday delivery.",
    inputs: [dropdown("service", "Service", opts(E.UPS.map(([n]) => n)), 0), ...ZONE_OR_MILES, dateField("shipDate", "Ship Date"), yn("afterCutoff", "Shipped After Pickup Cutoff?"), yn("saturday", "Saturday Delivery Available?")],
    results: DELIVERY,
    fn: E.upsTransit, ex: { service: 0, mode: 0, zone: 5, miles: 900, shipDate: 20759, afterCutoff: 0, saturday: 0 },
    exText: (o) => `Example: UPS Ground to zone 5 takes about ${o.transitBusinessDays} business days, so a Monday shipment arrives around Thursday.`,
    how: "Choose the service, zone or distance and the ship date.",
    assume: "UPS Ground transit by zone: 1–2: 1 day, 3: 2, 4–5: 3, 6–7: 4, 8: 5 business days. Air services are time-definite. Federal holidays are skipped.",
    faq: [["How long does UPS Ground take?", "1–5 business days in the contiguous US depending on distance."]],
  }),
  mk({
    slug: "fedex-transit-time-calculator", title: "FedEx Transit Time Calculator",
    desc: "Estimate FedEx delivery date for Ground, Home Delivery, Express Saver, 2Day and Overnight — by zone or distance — with weekends, holidays and Saturday delivery handled.",
    meta: "FedEx Shipping Time Calculator — Delivery Date Estimate",
    inputs: [dropdown("service", "Service", opts(E.FEDEX.map(([n]) => n)), 0), ...ZONE_OR_MILES, dateField("shipDate", "Ship Date"), yn("afterCutoff", "Shipped After Pickup Cutoff?"), yn("residential", "Home Delivery (delivers Saturdays)?", 1), yn("saturday", "Express Saturday Delivery?")],
    results: DELIVERY,
    fn: E.fedexTransit, ex: { service: 0, mode: 0, zone: 6, miles: 900, shipDate: 20759, afterCutoff: 0, residential: 1, saturday: 0 },
    exText: (o) => `Example: FedEx Home Delivery to zone 6 takes about ${o.transitBusinessDays} business days.`,
    how: "Choose the service, zone or distance and ship date. FedEx Home Delivery runs Tuesday–Saturday.",
    assume: "FedEx Ground transit by zone mirrors UPS (1–5 days). Express services are time-definite. Federal holidays are skipped.",
    faq: [["Does FedEx deliver on Saturday?", "FedEx Home Delivery does; Express Saturday delivery is an option in many areas."]],
  }),
  mk({
    slug: "shipping-time-calculator", title: "Shipping Time Calculator",
    desc: "Calculate the delivery window for an order — processing days plus transit days — skipping weekends and US holidays, with earliest and latest delivery dates.",
    inputs: [dateField("orderDate", "Order Date"), num("processingDays", "Processing / Handling Days", 2, 60), num("transitMin", "Transit Days (min)", 3, 90), num("transitMax", "Transit Days (max)", 5, 90), yn("skipHolidays", "Skip US Federal Holidays?", 1), yn("saturday", "Carrier Delivers Saturdays?")],
    results: [["earliestDelivery", "Earliest Delivery", "d"], ["latestDelivery", "Latest Delivery", "d"], ["shipDate", "Ships On", "d"], ["totalBusinessDaysMax", "Total Business Days (max)", "n"], ["calendarDaysMax", "Calendar Days (max)", "n"]],
    fn: E.shippingTime, ex: { orderDate: 20759, processingDays: 2, transitMin: 3, transitMax: 5, skipHolidays: 1, saturday: 0 },
    exText: (o) => `Example: an order placed on a Monday with 2 handling days and 3–5 transit days arrives within ${o.calendarDaysMax} calendar days at most.`,
    how: "Enter the order date, your processing time and the carrier's transit range.",
    assume: "Business days are Monday–Friday (Saturday optional); US federal holidays are skipped when selected.",
    faq: [["What's the difference between processing time and shipping time?", "Processing is the time to pack and hand the order to the carrier; shipping time is the carrier's transit."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-business-industrial-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cat.id,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
