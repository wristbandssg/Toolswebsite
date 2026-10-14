// One-time (but safe to re-run) batch setup script: creates 18 import duty
// tools from the user's shopping list (Shopping Calculators > Sales Tax, VAT &
// Import Duty Calculators): a generic import duty calculator, 16 country
// calculators and a landed cost calculator. Merged into these from the list:
// HS Code Duty -> import-duty; Germany and France Import Duty -> eu-import-duty
// (VAT rate by country). See src/lib/calc-engine-shopping-import-duty.ts.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-import-duty-calculators.ts
// or
//   npm run db:create-shopping-import-duty-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Sales Tax, VAT & Import Duty Calculators", slug: "sales-tax-vat-import-duty-calculators" };

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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
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

const TOOLS: ToolDef[] = [
  {
    slug: "import-duty-calculator",
    title: "Import Duty Calculator",
    description: "Estimate import duty and VAT or GST on goods you bring into any country, from the goods value, shipping, the duty rate and the valuation basis — plus your total landed cost.",
    metaTitle: "Import Duty Calculator — Duty, VAT & Landed Cost",
    metaDescription: "Free import duty calculator. Estimate customs duty, import VAT or GST and total landed cost for any country from the goods value, shipping and rates.",
    calcInputs: [
      currencyField("goodsValue", "Value of Goods", { default: 2000, max: 100000000, step: 1 }),
      currencyField("shipping", "International Shipping", { default: 250, max: 100000000, step: 1, required: false }),
      currencyField("insurance", "Insurance", { default: 20, max: 100000000, step: 1, required: false }),
      percentField("dutyRate", "Duty Rate", { default: 12, max: 100, step: 0.01 }),
      dropdown("valuationBasis", "Duty Charged On", [["CIF — goods + shipping + insurance (EU, UK, most of Asia & Africa)", 0], ["FOB — goods only (US, Canada, Australia)", 1]], 0),
      percentField("vatRate", "Import VAT / GST Rate", { default: 20, max: 50, step: 0.01 }),
      currencyField("dutyFreeThreshold", "Duty-Free Threshold (0 = None)", { default: 0, max: 100000, step: 1, required: false }),
      currencyField("brokerageFee", "Brokerage / Courier Handling Fee", { default: 35, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges", format: "currency" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges", format: "currency", highlight: true },
      { key: "importDuty", label: "Import Duty", format: "currency" },
      { key: "importTax", label: "Import VAT / GST", format: "currency" },
      { key: "otherFees", label: "Other Fees & Levies", format: "currency" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges)", format: "currency" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter what you paid for the goods, the international shipping and any insurance. Look up the duty rate for your product's HS code in the destination country's tariff, and choose whether that country charges duty on CIF or FOB value.\n\nAdd the import VAT or GST rate, any duty-free threshold and the broker's or courier's handling fee.",
    examples: "Example: $2,000 of goods with $250 shipping and $20 insurance, a 12% duty rate on CIF value and 20% import VAT. Duty is $272.40, VAT on the value plus duty is $508.48, and with a $35 handling fee the total import charges are $815.88 — a landed cost of $3,085.88.",
    assumptions: "Duty = duty rate × customs value (CIF or FOB). Import VAT/GST = rate × (customs value + duty). Excise taxes, anti-dumping duties and quotas aren't included, and free trade agreements can cut the duty to zero if the goods qualify. Rates change; confirm the HS code and rate with the destination country's customs service.",
    faq: [
      { question: "How is import duty calculated?", answer: "Customs takes the value of the goods (with shipping and insurance in CIF countries), multiplies it by the duty rate for the product's HS code, then charges VAT or GST on the value plus duty." },
      { question: "What is the difference between CIF and FOB?", answer: "CIF includes the cost of the goods, insurance and freight to the destination; FOB is just the goods' value at the port of export. Most countries charge duty on CIF; the US, Canada and Australia use FOB." },
      { question: "Who pays import duty?", answer: "The importer of record — usually the buyer. Under DDP shipping terms the seller pays it and builds it into the price." },
    ],
  },
  {
    slug: "canada-import-duty-calculator",
    title: "Canada Import Duty Calculator",
    description: "Estimate Canadian customs duty, GST/HST and PST on goods shipped to Canada — with CUSMA duty-free treatment, de minimis thresholds and the broker's fee.",
    metaTitle: "Canada Import Duty Calculator — Duty & GST/HST",
    metaDescription: "Free Canada import duty calculator. Estimate duty, GST, HST or PST and brokerage on goods shipped to Canada, with CUSMA and de minimis rules.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "CAD", default: 500, max: 1000000000, step: 1 }),
      numberField("shipping", "Shipping to Canada", { unit: "CAD", default: 40, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Duty Rate (Most Favoured Nation)", { default: 18, max: 50, step: 0.01 }),
      dropdown("cusma", "Made in the US or Mexico (CUSMA)?", [["No", 0], ["Yes — qualifies for duty-free", 1]], 0),
      dropdown("salesTaxRate", "Province (GST/HST/PST)", [["Ontario — 13% HST", 13], ["Nova Scotia — 14% HST", 14], ["New Brunswick, Newfoundland, PEI — 15% HST", 15], ["Quebec — 5% GST + 9.975% QST", 14.975], ["British Columbia — 5% GST + 7% PST", 12], ["Manitoba — 5% GST + 7% PST", 12], ["Saskatchewan — 5% GST + 6% PST", 11], ["Alberta, territories — 5% GST", 5]], 13),
      numberField("dutyFreeThreshold", "Duty-Free Up To", { unit: "CAD", default: 150, max: 1000000000, step: 1, required: false }),
      numberField("taxFreeThreshold", "Tax-Free Up To", { unit: "CAD", default: 40, max: 1000000000, step: 1, required: false }),
      numberField("brokerageFee", "Brokerage Fee", { unit: "CAD", default: 25, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges", format: "currency", currency: "CAD", highlight: true },
      { key: "importDuty", label: "Customs Duty", format: "currency", currency: "CAD" },
      { key: "importTax", label: "GST / HST / PST", format: "currency", currency: "CAD" },
      { key: "otherFees", label: "Brokerage Fee", format: "currency", currency: "CAD" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges)", format: "currency", currency: "CAD" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the value of the goods and the shipping cost in Canadian dollars, the duty rate for the product, and whether it qualifies under CUSMA (made in the US or Mexico).\n\nPick your province for the sales tax. Courier shipments from the US or Mexico are duty-free up to C$150 and tax-free up to C$40; for other countries and postal shipments, set both to C$20.",
    examples: "Example: a C$500 jacket made outside North America with C$40 shipping to Ontario. Duty at 18% is C$90.00, 13% HST on the value plus duty is C$76.70, and with a C$25 brokerage fee the total is C$191.70.",
    assumptions: "Value for duty is the price paid; shipping to Canada is not dutiable. GST/HST/PST is charged on the value plus duty. De minimis: C$150 duty and C$40 tax for courier shipments from the US or Mexico under CUSMA; C$20 otherwise. Couriers often charge more than the default brokerage fee. Rates are 2026 values; check the Canadian Customs Tariff for your item.",
    faq: [
      { question: "Do I pay duty on items from the US to Canada?", answer: "Not if they're made in the US or Mexico and qualify under CUSMA, but you still pay GST/HST on courier shipments over C$40." },
      { question: "What is the de minimis for Canada?", answer: "C$20 for postal shipments and goods from outside North America. For courier shipments from the US or Mexico, C$40 for taxes and C$150 for duty." },
      { question: "Why did the courier charge a fee?", answer: "Couriers clear customs for you and charge a brokerage fee on top of the duty and tax. Canada Post charges a smaller flat handling fee." },
    ],
  },
  {
    slug: "uk-import-duty-calculator",
    title: "UK Import Duty Calculator",
    description: "Estimate UK import duty, import VAT and courier fees on goods shipped to Britain — including the £135 low-value rule and the £39 gift allowance.",
    metaTitle: "UK Import Duty Calculator — Duty & Import VAT",
    metaDescription: "Free UK import duty calculator. Estimate customs duty, 20% import VAT and handling fees on parcels and goods shipped to the UK, with the £135 rule.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "GBP", default: 400, max: 1000000000, step: 1 }),
      numberField("shipping", "Shipping to the UK", { unit: "GBP", default: 30, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "GBP", default: 0, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Duty Rate", { default: 12, max: 50, step: 0.01 }),
      dropdown("vatRate", "VAT Rate", [["Standard — 20%", 20], ["Reduced — 5%", 5], ["Zero-rated (books, children's clothes) — 0%", 0]], 20),
      dropdown("isGift", "Is It a Gift?", [["No", 0], ["Yes — a gift from a person", 1]], 0),
      numberField("handlingFee", "Courier Handling Fee", { unit: "GBP", default: 12, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges", format: "currency", currency: "GBP", highlight: true },
      { key: "importDuty", label: "Customs Duty", format: "currency", currency: "GBP" },
      { key: "importTax", label: "Import VAT", format: "currency", currency: "GBP" },
      { key: "otherFees", label: "Courier Handling Fee", format: "currency", currency: "GBP" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges)", format: "currency", currency: "GBP" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the value of the goods, the shipping and insurance in pounds, and the duty rate for your product from the UK Trade Tariff. Choose the VAT rate and whether the parcel is a gift.\n\nAdd the handling fee your courier or Royal Mail charges to collect the tax.",
    examples: "Example: £400 of goods with £30 shipping and a 12% duty rate. Duty on £430 is £51.60, 20% VAT on the value plus duty is £96.32, and with a £12 handling fee you pay £159.92 on arrival.",
    assumptions: "Duty and VAT are charged on CIF value (goods + shipping + insurance). Goods worth £135 or less: no duty is collected and the seller charges VAT at checkout. Gifts from one person to another worth £39 or less are free of VAT and duty. Goods made in the EU may be duty-free under the UK–EU trade agreement. Check your item's commodity code at gov.uk/trade-tariff.",
    faq: [
      { question: "Do I pay import tax on items under £135?", answer: "There's no customs duty, but VAT is still due — the seller should add it at checkout instead of you paying on delivery." },
      { question: "How much is import VAT in the UK?", answer: "20% for most goods, charged on the value of the goods plus shipping, insurance and any duty." },
      { question: "Do I pay duty on goods from the EU?", answer: "Not if they meet the rules of origin under the UK–EU Trade and Cooperation Agreement, but import VAT still applies." },
    ],
  },
  {
    slug: "eu-import-duty-calculator",
    title: "EU Import Duty Calculator",
    description: "Estimate EU customs duty and import VAT for goods shipped into Germany, France, Italy, Spain, the Netherlands or any EU country — with the low-value parcel rules.",
    metaTitle: "EU Import Duty Calculator — Customs & Import VAT",
    metaDescription: "Free EU import duty calculator for Germany, France, Italy, Spain and more. Estimate customs duty and import VAT on goods shipped into the EU.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "EUR", default: 800, max: 100000000, step: 1 }),
      numberField("shipping", "Shipping to the EU", { unit: "EUR", default: 50, max: 1000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "EUR", default: 0, max: 1000000, step: 1, required: false }),
      percentField("dutyRate", "Duty Rate (EU Common Tariff)", { default: 12, max: 50, step: 0.01 }),
      dropdown("vatRate", "Destination Country (VAT)", [["Germany — 19%", 19], ["France — 20%", 20], ["Italy — 22%", 22], ["Spain — 21%", 21], ["Netherlands — 21%", 21], ["Belgium — 21%", 21], ["Ireland — 23%", 23], ["Poland — 23%", 23], ["Austria — 20%", 20], ["Sweden — 25%", 25], ["Portugal — 23%", 23], ["Denmark — 25%", 25]], 19),
      numberField("dutyFreeThreshold", "Low-Value Threshold", { unit: "EUR", default: 150, max: 10000, step: 1, required: false }),
      numberField("lowValueFlatDuty", "Flat Duty on Low-Value Parcels", { unit: "EUR", default: 3, max: 1000, step: 0.5, required: false }),
      numberField("handlingFee", "Courier Handling Fee", { unit: "EUR", default: 15, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges (EUR)", format: "number" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges (EUR)", format: "number", highlight: true },
      { key: "importDuty", label: "Customs Duty (EUR)", format: "number" },
      { key: "importTax", label: "Import VAT (EUR)", format: "number" },
      { key: "otherFees", label: "Courier Handling Fee (EUR)", format: "number" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges) (EUR)", format: "number" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, shipping and insurance in euros and the duty rate for your product from the EU TARIC database. Pick the country it's going to for the VAT rate.\n\nParcels worth up to the low-value threshold (€150) skip the normal duty rate; enter the flat per-parcel duty that now applies to them, or 0.",
    examples: "Example: €800 of goods with €50 shipping into Germany at a 12% duty rate. Duty on €850 is 102 EUR, 19% import VAT is 180.88 EUR, and with a €15 handling fee the total charges are 297.88 EUR.",
    assumptions: "The EU charges duty on CIF value (goods + shipping + insurance) using one common tariff, then each country's import VAT on the value plus duty. Parcels up to €150 have been duty-free; the EU is replacing that with a flat per-item duty, so check the current amount. VAT on low-value parcels is often charged by the seller through IOSS at checkout. Goods from countries with an EU trade agreement may have lower or zero duty.",
    faq: [
      { question: "Is import duty the same in every EU country?", answer: "Yes — the EU uses one customs tariff. What changes from country to country is the import VAT rate, from 17% to 27%." },
      { question: "How much is import VAT in Germany and France?", answer: "19% in Germany and 20% in France, charged on the goods plus shipping, insurance and duty." },
      { question: "What is IOSS?", answer: "The Import One-Stop Shop lets sellers charge EU VAT at checkout on parcels up to €150, so you don't pay VAT or a handling fee on delivery." },
    ],
  },
  {
    slug: "india-import-duty-calculator",
    title: "India Import Duty Calculator",
    description: "Estimate Indian customs duty on imports — basic customs duty (BCD), social welfare surcharge (SWS) and IGST on the assessable value — and your landed cost.",
    metaTitle: "India Import Duty Calculator — BCD, SWS & IGST",
    metaDescription: "Free India import duty calculator. Estimate basic customs duty, 10% social welfare surcharge and IGST on goods imported into India, and the landed cost.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "INR", default: 100000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "INR", default: 8000, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "INR", default: 1000, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Basic Customs Duty (BCD)", { default: 20, max: 150, step: 0.01 }),
      percentField("surchargeRate", "Social Welfare Surcharge (% of BCD)", { default: 10, max: 100, step: 0.01 }),
      dropdown("igstRate", "IGST Rate", [["0%", 0], ["5%", 5], ["18%", 18], ["40%", 40]], 18),
      numberField("clearingFee", "Clearing / Courier Charges", { unit: "INR", default: 1500, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges", format: "currency", currency: "INR" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges", format: "currency", currency: "INR", highlight: true },
      { key: "importDuty", label: "Customs Duty (BCD + SWS)", format: "currency", currency: "INR" },
      { key: "importTax", label: "IGST", format: "currency", currency: "INR" },
      { key: "otherFees", label: "Clearing Charges", format: "currency", currency: "INR" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges)", format: "currency", currency: "INR" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, freight and insurance in rupees (the assessable value is their total). Enter the basic customs duty for your product's tariff heading, the social welfare surcharge (usually 10% of BCD) and the IGST rate.\n\nAdd the courier's or clearing agent's charges.",
    examples: "Example: ₹1,00,000 of goods with ₹8,000 freight and ₹1,000 insurance at 20% BCD. BCD plus the 10% surcharge is ₹23,980.00, 18% IGST on the value plus duties is ₹23,936.40, and with ₹1,500 clearing the total is ₹49,416.40.",
    assumptions: "Assessable value = CIF (goods + freight + insurance). SWS = 10% of BCD for most goods (some items are exempt). IGST = rate × (assessable value + BCD + SWS); businesses can usually claim IGST back as input tax credit. Some goods also pay an agriculture cess (AIDC) instead of part of the BCD. IGST rates follow the GST rate for the item. Check the Customs Tariff and any FTA concessions with your customs broker.",
    faq: [
      { question: "How is customs duty calculated in India?", answer: "BCD is charged on the assessable value (CIF), a 10% social welfare surcharge is charged on the BCD, then IGST is charged on the value plus both duties." },
      { question: "Can I claim IGST paid on imports?", answer: "Yes, a GST-registered business can usually claim the IGST as input tax credit. Basic customs duty and SWS can't be claimed back." },
      { question: "What is the duty-free limit for personal imports to India?", answer: "Gifts by post or courier up to ₹10,000 are generally exempt; most purchases are fully dutiable." },
    ],
  },
  {
    slug: "mexico-import-duty-calculator",
    title: "Mexico Import Duty Calculator",
    description: "Estimate Mexican import charges — the general import tax (IGI), customs processing fee (DTA) and 16% IVA — on goods shipped into Mexico.",
    metaTitle: "Mexico Import Duty Calculator — IGI, DTA & IVA",
    metaDescription: "Free Mexico import duty calculator. Estimate IGI duty, the DTA customs processing fee and 16% IVA on goods imported into Mexico, plus landed cost.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "MXN", default: 50000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "MXN", default: 4000, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "MXN", default: 500, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Import Duty (IGI)", { default: 15, max: 50, step: 0.01 }),
      percentField("dtaRate", "Customs Processing Fee (DTA)", { default: 0.8, max: 5, step: 0.01 }),
      percentField("ivaRate", "IVA", { default: 16, max: 20, step: 0.01 }),
      numberField("brokerageFee", "Customs Broker Fee", { unit: "MXN", default: 2500, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges (MXN)", format: "number" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges (MXN)", format: "number", highlight: true },
      { key: "importDuty", label: "Import Duty (IGI) (MXN)", format: "number" },
      { key: "importTax", label: "IVA (MXN)", format: "number" },
      { key: "otherFees", label: "DTA + Broker Fee (MXN)", format: "number" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges) (MXN)", format: "number" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, freight and insurance in pesos, the IGI duty rate for the product (0% for goods qualifying under the USMCA/T-MEC), the DTA rate and IVA.\n\nAdd your customs broker's fee (agente aduanal).",
    examples: "Example: MXN 50,000 of goods with MXN 4,500 freight and insurance at 15% IGI. Duty is 8,175 MXN, the DTA plus a MXN 2,500 broker fee is 2,936 MXN, and 16% IVA is 10,097.76 MXN — 21,208.76 MXN in total.",
    assumptions: "Customs value = CIF. DTA (derecho de trámite aduanero) is 0.8% of customs value for most definitive imports. IVA is 16% of (customs value + IGI + DTA) and can be credited by registered businesses. Courier shipments under the simplified regime use a single global rate instead. Goods qualifying under USMCA (T-MEC) or other trade agreements may enter with 0% IGI.",
    faq: [
      { question: "How much is IVA on imports to Mexico?", answer: "16% of the customs value plus the import duty and DTA." },
      { question: "What is the DTA?", answer: "Mexico's customs processing fee, usually 0.8% of the customs value." },
      { question: "Do goods from the US pay duty in Mexico?", answer: "Goods that meet USMCA (T-MEC) origin rules enter duty-free, but IVA still applies." },
    ],
  },
  {
    slug: "china-import-duty-calculator",
    title: "China Import Duty Calculator",
    description: "Estimate US import duty and tariffs on goods from China — the regular duty rate, Section 301 tariffs, other tariffs, and customs fees (MPF and HMF).",
    metaTitle: "China Import Duty Calculator — US Tariffs & Fees",
    metaDescription: "Free China import duty calculator. Estimate US duty, Section 301 and other tariffs, MPF and HMF on goods imported from China, and your landed cost.",
    calcInputs: [
      currencyField("goodsValue", "Value of Goods (FOB China)", { default: 10000, max: 100000000, step: 1 }),
      currencyField("shipping", "Freight to the US", { default: 1500, max: 100000000, step: 1, required: false }),
      currencyField("insurance", "Insurance", { default: 50, max: 100000000, step: 1, required: false }),
      percentField("dutyRate", "Regular (MFN) Duty Rate", { default: 5, max: 100, step: 0.01 }),
      percentField("section301Rate", "Section 301 Tariff", { default: 25, max: 100, step: 0.01 }),
      percentField("otherTariffRate", "Other Additional Tariffs", { default: 20, max: 200, step: 0.01 }),
      dropdown("byOcean", "Shipped By", [["Ocean freight (adds HMF)", 1], ["Air or courier", 0]], 1),
      currencyField("brokerageFee", "Customs Broker Fee", { default: 150, max: 100000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges", format: "currency" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges", format: "currency", highlight: true },
      { key: "importDuty", label: "Duty & Tariffs", format: "currency" },
      { key: "otherFees", label: "MPF, HMF & Broker Fee", format: "currency" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges)", format: "currency" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the factory (FOB) price of the goods and the freight and insurance to the US. Look up the regular duty for the product's HTS code, the Section 301 list it's on (7.5% or 25% for most goods, higher for some), and any other tariffs in force when you import.\n\nPick ocean or air freight and add your customs broker's fee.",
    examples: "Example: $10,000 of goods from China with 5% regular duty, a 25% Section 301 tariff and 20% in other tariffs. Duty and tariffs total $5,000.00, MPF, HMF and a $150 broker fee add $197.14, so you pay $5,197.14 — a landed cost of $16,747.14.",
    assumptions: "US customs value is the FOB price; freight and insurance are not dutiable. Tariffs stack on the same value. MPF is 0.3464% of value (minimum $33.58, maximum $651.50 for formal entries); HMF is 0.125% on ocean shipments. The US no longer has a de minimis exemption for Chinese goods. Tariff rates on Chinese goods have changed often — check the current HTS and Federal Register notices before you order.",
    faq: [
      { question: "How much is the tariff on goods from China?", answer: "It depends on the product: the regular HTS duty, plus the Section 301 tariff (usually 7.5% or 25%), plus any other tariffs in force. Add them all together and multiply by the value." },
      { question: "Is shipping included in US customs value?", answer: "No. The US charges duty on the FOB value — the price paid to the seller, without international freight and insurance." },
      { question: "Is there still a $800 de minimis for China?", answer: "No. The exemption for low-value parcels from China ended in 2025, so every shipment is dutiable." },
    ],
  },
  {
    slug: "japan-import-duty-calculator",
    title: "Japan Import Duty Calculator",
    description: "Estimate Japanese customs duty and 10% consumption tax on goods imported into Japan, with the ¥10,000 duty-free rule.",
    metaTitle: "Japan Import Duty Calculator — Duty & Consumption Tax",
    metaDescription: "Free Japan import duty calculator. Estimate customs duty and 10% import consumption tax on goods shipped to Japan, with the ¥10,000 exemption.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "JPY", default: 80000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "JPY", default: 6000, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "JPY", default: 0, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Duty Rate", { default: 5, max: 50, step: 0.01 }),
      dropdown("consumptionTaxRate", "Consumption Tax", [["Standard — 10%", 10], ["Reduced (food) — 8%", 8]], 10),
      numberField("handlingFee", "Courier Handling Fee", { unit: "JPY", default: 1000, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges (JPY)", format: "number" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges (JPY)", format: "number", highlight: true },
      { key: "importDuty", label: "Customs Duty (JPY)", format: "number" },
      { key: "importTax", label: "Consumption Tax (JPY)", format: "number" },
      { key: "otherFees", label: "Courier Handling Fee (JPY)", format: "number" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges) (JPY)", format: "number" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, shipping and insurance in yen and the duty rate for your item (many goods are duty-free in Japan). Choose standard or reduced consumption tax.\n\nAdd the courier's customs handling fee.",
    examples: "Example: ¥80,000 of goods with ¥6,000 shipping at a 5% duty rate. Duty is 4,300 JPY, 10% consumption tax on the value plus duty is 9,030 JPY, and with a ¥1,000 fee the total is 14,330 JPY.",
    assumptions: "Duty and tax are charged on CIF value. Shipments with a total value of ¥10,000 or less are generally free of duty and consumption tax. For personal imports, customs often values goods at 60% of the retail price, which this calculator doesn't apply. Leather goods, footwear and some foods have high or specific duties. Check Japan Customs' tariff schedule.",
    faq: [
      { question: "Do I pay tax on items shipped to Japan?", answer: "Yes, 10% consumption tax (8% for food) plus any duty, unless the total value is ¥10,000 or less." },
      { question: "Are most goods duty-free in Japan?", answer: "Many industrial goods and electronics are, but clothing, leather, shoes and some foods carry duty." },
    ],
  },
  {
    slug: "thailand-import-duty-calculator",
    title: "Thailand Import Duty Calculator",
    description: "Estimate Thai import duty, excise and 7% VAT on goods shipped into Thailand, and the total landed cost.",
    metaTitle: "Thailand Import Duty Calculator — Duty & 7% VAT",
    metaDescription: "Free Thailand import duty calculator. Estimate customs duty, excise tax and 7% VAT on goods imported into Thailand, plus courier fees and landed cost.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "THB", default: 30000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "THB", default: 2500, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "THB", default: 0, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Import Duty Rate", { default: 20, max: 80, step: 0.01 }),
      percentField("exciseRate", "Excise Tax (If Any)", { default: 0, max: 100, step: 0.01 }),
      percentField("vatRate", "VAT", { default: 7, max: 10, step: 0.01 }),
      numberField("handlingFee", "Courier Handling Fee", { unit: "THB", default: 300, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges (THB)", format: "number" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges (THB)", format: "number", highlight: true },
      { key: "importDuty", label: "Duty & Excise (THB)", format: "number" },
      { key: "importTax", label: "VAT (THB)", format: "number" },
      { key: "otherFees", label: "Courier Handling Fee (THB)", format: "number" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges) (THB)", format: "number" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, shipping and insurance in baht, the import duty rate for the product (often 0–30%), any excise tax (for example on cars, alcohol or perfume) and VAT.\n\nAdd the courier's handling fee.",
    examples: "Example: ฿30,000 of goods with ฿2,500 shipping at 20% duty. Duty is 6,500 THB, 7% VAT on the value plus duty is 2,730 THB, and with a ฿300 fee the total is 9,530 THB.",
    assumptions: "Duty is charged on CIF value; excise on CIF + duty; VAT at 7% on CIF + duty + excise. Thailand now collects VAT on low-value imports too. Goods from ASEAN or FTA partners may have reduced duty. Check the Thai Customs tariff for your item.",
    faq: [
      { question: "What is the VAT on imports to Thailand?", answer: "7% of the CIF value plus duty and any excise." },
      { question: "Are small parcels to Thailand tax-free?", answer: "Thailand used to exempt parcels under ฿1,500, but VAT is now collected on low-value imports." },
    ],
  },
  {
    slug: "turkey-import-duty-calculator",
    title: "Turkey Import Duty Calculator",
    description: "Estimate Turkish customs duty, additional customs duty, special consumption tax (ÖTV) and 20% VAT (KDV) on goods imported into Türkiye.",
    metaTitle: "Turkey Import Duty Calculator — Duty, ÖTV & KDV",
    metaDescription: "Free Turkey import duty calculator. Estimate customs duty, additional duty, ÖTV and 20% KDV on goods imported into Türkiye, plus landed cost.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "TRY", default: 50000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "TRY", default: 3000, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "TRY", default: 0, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Customs Duty Rate", { default: 12, max: 100, step: 0.01 }),
      percentField("additionalDutyRate", "Additional Customs Duty (İGV)", { default: 10, max: 100, step: 0.01 }),
      percentField("otvRate", "Special Consumption Tax (ÖTV)", { default: 0, max: 300, step: 0.01 }),
      percentField("kdvRate", "VAT (KDV)", { default: 20, max: 30, step: 0.01 }),
      numberField("handlingFee", "Broker / Courier Fee", { unit: "TRY", default: 1500, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges (TRY)", format: "number" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges (TRY)", format: "number", highlight: true },
      { key: "importDuty", label: "Customs Duty + İGV (TRY)", format: "number" },
      { key: "importTax", label: "ÖTV + KDV (TRY)", format: "number" },
      { key: "otherFees", label: "Broker / Courier Fee (TRY)", format: "number" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges) (TRY)", format: "number" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, shipping and insurance in lira, the customs duty and any additional customs duty (İGV) for goods from outside the EU and FTA partners, the ÖTV rate if the product is subject to it (phones, cars, cosmetics), and KDV.\n\nAdd the broker's or courier's fee.",
    examples: "Example: TRY 50,000 of goods with TRY 3,000 shipping at 12% duty and 10% additional duty. Duties come to 11,660 TRY, 20% KDV on the value plus duties is 12,932 TRY, and with a TRY 1,500 fee the total is 26,092 TRY.",
    assumptions: "Duty and additional duty are charged on CIF value; ÖTV on CIF + duties; KDV on CIF + duties + ÖTV. Personal online orders use a separate flat-rate regime with low limits, which isn't modelled here. Goods from the EU usually have no customs duty under the customs union. Check the Turkish customs tariff (GTİP) for your item.",
    faq: [
      { question: "What taxes apply to imports in Turkey?", answer: "Customs duty, often an additional customs duty for non-EU goods, ÖTV on some products, and 20% KDV (VAT) on top." },
      { question: "Is there duty on goods from the EU to Turkey?", answer: "Most industrial goods from the EU are duty-free under the customs union, but KDV still applies." },
    ],
  },
  {
    slug: "australia-import-duty-calculator",
    title: "Australia Import Duty Calculator",
    description: "Estimate Australian customs duty and 10% GST on imports over A$1,000, with the import processing charge — and GST on low-value goods.",
    metaTitle: "Australia Import Duty Calculator — Duty & GST",
    metaDescription: "Free Australia import duty calculator. Estimate 5% customs duty, 10% GST and import processing charges on goods over A$1,000 shipped to Australia.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods (FOB)", { unit: "AUD", default: 3000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "AUD", default: 200, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "AUD", default: 30, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Customs Duty Rate", { default: 5, max: 20, step: 0.01 }),
      percentField("gstRate", "GST", { default: 10, max: 15, step: 0.01 }),
      numberField("processingCharge", "Import Processing Charge + Broker", { unit: "AUD", default: 150, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges", format: "currency", currency: "AUD" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges", format: "currency", currency: "AUD", highlight: true },
      { key: "importDuty", label: "Customs Duty", format: "currency", currency: "AUD" },
      { key: "importTax", label: "GST", format: "currency", currency: "AUD" },
      { key: "otherFees", label: "Processing Charge + Broker", format: "currency", currency: "AUD" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges)", format: "currency", currency: "AUD" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, shipping and insurance in Australian dollars and the duty rate (5% for most goods, 0% for many items or goods from FTA partners).\n\nAdd the import processing charge and your broker's fee. Goods worth A$1,000 or less have no duty, and the seller charges 10% GST at checkout.",
    examples: "Example: A$3,000 of goods with A$230 shipping and insurance at 5% duty. Duty on the FOB value is A$150.00, 10% GST on the value of the taxable importation is A$338.00, and with A$150 in charges the total is A$638.00.",
    assumptions: "Customs value = FOB. GST is 10% of the value of the taxable importation: customs value + duty + international transport and insurance. Goods of A$1,000 or less: no duty or border GST — the seller collects GST. Goods from countries with an Australian FTA (e.g. the US, China, Japan, UK) are often duty-free. Check the Australian Border Force tariff.",
    faq: [
      { question: "Do I pay GST on items under $1,000 in Australia?", answer: "Yes, but the overseas seller charges it at checkout. There's no duty and no customs charge on arrival." },
      { question: "What is the customs duty rate in Australia?", answer: "Usually 5%, and many goods are duty-free under free trade agreements." },
    ],
  },
  {
    slug: "south-africa-import-duty-calculator",
    title: "South Africa Import Duty Calculator",
    description: "Estimate South African customs duty and 15% import VAT (on the uplifted value) on goods shipped to South Africa, including the flat rate for small postal parcels.",
    metaTitle: "South Africa Import Duty Calculator — Duty & VAT",
    metaDescription: "Free South Africa import duty calculator. Estimate customs duty and 15% VAT on the value plus 10% uplift, and the flat rate for small parcels.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods (FOB)", { unit: "ZAR", default: 8000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "ZAR", default: 900, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "ZAR", default: 0, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Customs Duty Rate", { default: 20, max: 60, step: 0.01 }),
      dropdown("postal", "Sent By", [["Courier or freight", 0], ["Post (flat 20% for parcels up to R500)", 1]], 0),
      percentField("vatRate", "VAT", { default: 15, max: 20, step: 0.01 }),
      numberField("handlingFee", "Courier Clearance Fee", { unit: "ZAR", default: 450, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges", format: "currency", currency: "ZAR" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges", format: "currency", currency: "ZAR", highlight: true },
      { key: "importDuty", label: "Customs Duty", format: "currency", currency: "ZAR" },
      { key: "importTax", label: "Import VAT", format: "currency", currency: "ZAR" },
      { key: "otherFees", label: "Clearance Fee", format: "currency", currency: "ZAR" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges)", format: "currency", currency: "ZAR" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the value of the goods (FOB), shipping and insurance in rand and the duty rate for the product. Choose courier or post — small postal parcels up to R500 pay a flat 20% duty.\n\nAdd the courier's clearance fee.",
    examples: "Example: R8,000 of goods by courier at 20% duty. Duty is R1,600.00, 15% VAT on the value plus a 10% uplift plus duty is R1,560.00, and with a R450 clearance fee the total is R3,610.00.",
    assumptions: "Customs value = FOB. VAT = 15% × (customs value × 1.10 + duty) — the 10% uplift stands in for freight and insurance. Postal parcels up to R500 pay a flat-rate duty of 20%. Goods from SADC or EU/UK trade partners may have lower duty. Check SARS's tariff book for your item.",
    faq: [
      { question: "Why is South African import VAT charged on more than the price?", answer: "SARS adds a 10% uplift to the customs value before charging VAT, so VAT is on 110% of the value plus duty." },
      { question: "What is the flat rate for small parcels in South Africa?", answer: "Postal parcels worth up to R500 pay a flat 20% duty instead of the tariff rate, plus VAT." },
    ],
  },
  {
    slug: "nigeria-import-duty-calculator",
    title: "Nigeria Import Duty Calculator",
    description: "Estimate Nigerian import duty and charges — duty, 7% surcharge, CISS, ETLS and 7.5% VAT — on goods cleared through Nigeria Customs.",
    metaTitle: "Nigeria Import Duty Calculator — Duty, Levies & VAT",
    metaDescription: "Free Nigeria import duty calculator. Estimate customs duty, surcharge, CISS, ETLS and 7.5% VAT on goods imported into Nigeria, and the landed cost.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "NGN", default: 5000000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "NGN", default: 600000, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "NGN", default: 50000, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Import Duty Rate (ECOWAS CET)", { default: 20, max: 70, step: 0.01 }),
      percentField("vatRate", "VAT", { default: 7.5, max: 20, step: 0.01 }),
      numberField("clearingFee", "Clearing Agent & Port Charges", { unit: "NGN", default: 250000, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges (NGN)", format: "number" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges (NGN)", format: "number", highlight: true },
      { key: "importDuty", label: "Duty + 7% Surcharge (NGN)", format: "number" },
      { key: "importTax", label: "VAT (NGN)", format: "number" },
      { key: "otherFees", label: "CISS, ETLS & Clearing (NGN)", format: "number" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges) (NGN)", format: "number" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value (FOB), freight and insurance in naira — or convert from dollars at the Customs exchange rate — and the ECOWAS CET duty rate for the item (5%, 10%, 20% or 35%).\n\nAdd your clearing agent's and port charges.",
    examples: "Example: ₦5,000,000 of goods with ₦650,000 freight and insurance at 20% duty. Duty plus the 7% surcharge is 1,209,100 NGN, CISS, ETLS and ₦250,000 clearing are 328,250 NGN, and 7.5% VAT is 520,301.25 NGN — 2,057,651.25 NGN in all.",
    assumptions: "Duty is charged on CIF. Surcharge = 7% of duty; CISS = 1% of FOB; ETLS (ECOWAS levy) = 0.5% of CIF; VAT = 7.5% of CIF plus duty, surcharge, CISS and ETLS. Some goods add levies or excise. Customs converts foreign values at its own exchange rate. Check the Nigeria Customs Service tariff for your item.",
    faq: [
      { question: "What is CISS in Nigeria?", answer: "The Comprehensive Import Supervision Scheme charge — 1% of the FOB value of imports." },
      { question: "How is Nigerian import duty calculated?", answer: "Duty on the CIF value, a 7% surcharge on the duty, 1% CISS on FOB, a 0.5% ECOWAS levy on CIF, and 7.5% VAT on the total." },
    ],
  },
  {
    slug: "kenya-import-duty-calculator",
    title: "Kenya Import Duty Calculator",
    description: "Estimate Kenyan import charges — EAC import duty, excise, 16% VAT, the import declaration fee (IDF) and railway development levy (RDL).",
    metaTitle: "Kenya Import Duty Calculator — Duty, VAT, IDF & RDL",
    metaDescription: "Free Kenya import duty calculator. Estimate EAC import duty, excise, 16% VAT, IDF and RDL on goods imported into Kenya, and the landed cost.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "KES", default: 1000000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "KES", default: 120000, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "KES", default: 10000, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Import Duty (EAC CET)", { default: 25, max: 100, step: 0.01 }),
      percentField("exciseRate", "Excise Duty (If Any)", { default: 0, max: 100, step: 0.01 }),
      percentField("vatRate", "VAT", { default: 16, max: 20, step: 0.01 }),
      percentField("idfRate", "Import Declaration Fee (IDF)", { default: 2.5, max: 10, step: 0.01 }),
      percentField("rdlRate", "Railway Development Levy (RDL)", { default: 2, max: 10, step: 0.01 }),
      numberField("clearingFee", "Clearing Agent Fee", { unit: "KES", default: 30000, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges (KES)", format: "number" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges (KES)", format: "number", highlight: true },
      { key: "importDuty", label: "Import Duty + Excise (KES)", format: "number" },
      { key: "importTax", label: "VAT (KES)", format: "number" },
      { key: "otherFees", label: "IDF, RDL & Clearing (KES)", format: "number" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges) (KES)", format: "number" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, freight and insurance in shillings, the EAC Common External Tariff rate (0%, 10%, 25% or 35%), any excise duty, and the VAT, IDF and RDL rates.\n\nAdd your clearing agent's fee.",
    examples: "Example: KES 1,000,000 of goods with KES 130,000 freight and insurance at 25% duty. Duty is 282,500 KES, IDF, RDL and KES 30,000 clearing add 80,850 KES, and 16% VAT is 226,000 KES — 589,350 KES in total.",
    assumptions: "Duty, IDF and RDL are charged on CIF value; excise on CIF + duty; VAT on CIF + duty + excise. Rates change with each Finance Act — check KRA's current IDF and RDL rates. Goods from EAC partner states are duty-free if they meet the rules of origin.",
    faq: [
      { question: "What is IDF in Kenya?", answer: "The Import Declaration Fee, a percentage of the CIF value charged on most imports." },
      { question: "What is the VAT on imports into Kenya?", answer: "16% of the CIF value plus import duty and any excise." },
    ],
  },
  {
    slug: "malaysia-import-duty-calculator",
    title: "Malaysia Import Duty Calculator",
    description: "Estimate Malaysian import duty and sales tax on goods shipped to Malaysia, with the 10% low-value goods (LVG) tax on online orders up to RM500.",
    metaTitle: "Malaysia Import Duty Calculator — Duty & SST",
    metaDescription: "Free Malaysia import duty calculator. Estimate customs duty and sales tax on imports, and the 10% LVG tax on online purchases up to RM500.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "MYR", default: 2000, max: 1000000000, step: 1 }),
      numberField("shipping", "Shipping to Malaysia", { unit: "MYR", default: 150, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "MYR", default: 0, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Import Duty Rate", { default: 20, max: 60, step: 0.01 }),
      dropdown("salesTaxRate", "Sales Tax", [["10% (most goods)", 10], ["5% (selected goods)", 5], ["Exempt", 0]], 10),
      numberField("handlingFee", "Courier Handling Fee", { unit: "MYR", default: 30, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges", format: "currency", currency: "MYR" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges", format: "currency", currency: "MYR", highlight: true },
      { key: "importDuty", label: "Import Duty", format: "currency", currency: "MYR" },
      { key: "importTax", label: "Sales Tax", format: "currency", currency: "MYR" },
      { key: "otherFees", label: "Courier Handling Fee", format: "currency", currency: "MYR" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges)", format: "currency", currency: "MYR" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, shipping and insurance in ringgit, the import duty rate for the product and the sales tax rate.\n\nOnline purchases of RM500 or less are low-value goods: no duty, and the seller charges 10% LVG tax.",
    examples: "Example: RM2,000 of goods with RM150 shipping at 20% duty. Duty is RM430.00, 10% sales tax on the value plus duty is RM258.00, and with a RM30 fee the total is RM718.00.",
    assumptions: "Duty and sales tax are charged on CIF value (sales tax on CIF + duty). Low-value goods up to RM500 sold online by registered sellers carry 10% LVG tax instead of duty and import sales tax. Goods from ASEAN or FTA partners may be duty-free. Check the Royal Malaysian Customs tariff.",
    faq: [
      { question: "What is the LVG tax in Malaysia?", answer: "A 10% tax on low-value goods (RM500 or less) bought online from overseas sellers, charged at checkout." },
      { question: "Is there duty on items under RM500 in Malaysia?", answer: "Low-value goods bought online up to RM500 aren't charged import duty, only the 10% LVG tax." },
    ],
  },
  {
    slug: "vietnam-import-duty-calculator",
    title: "Vietnam Import Duty Calculator",
    description: "Estimate Vietnamese import duty, special consumption tax and VAT on goods imported into Vietnam, and the landed cost.",
    metaTitle: "Vietnam Import Duty Calculator — Duty, SCT & VAT",
    metaDescription: "Free Vietnam import duty calculator. Estimate import duty, special consumption tax and VAT on goods imported into Vietnam, plus landed cost.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "VND", default: 50000000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "VND", default: 4000000, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "VND", default: 200000, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Import Duty Rate", { default: 15, max: 100, step: 0.01 }),
      percentField("sctRate", "Special Consumption Tax (If Any)", { default: 0, max: 150, step: 0.01 }),
      dropdown("vatRate", "VAT", [["10%", 10], ["8% (reduced)", 8], ["5%", 5], ["0%", 0]], 10),
      numberField("handlingFee", "Customs Clearance Fee", { unit: "VND", default: 1500000, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges (VND)", format: "number" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges (VND)", format: "number", highlight: true },
      { key: "importDuty", label: "Import Duty + SCT (VND)", format: "number" },
      { key: "importTax", label: "VAT (VND)", format: "number" },
      { key: "otherFees", label: "Clearance Fee (VND)", format: "number" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges) (VND)", format: "number" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, freight and insurance in dong, the import duty rate (preferential MFN or a lower FTA rate), any special consumption tax and the VAT rate.\n\nAdd the clearance agent's fee.",
    examples: "Example: VND 50,000,000 of goods with VND 4,200,000 freight and insurance at 15% duty. Duty is 8,130,000 VND, 10% VAT on the value plus duty is 6,233,000 VND, and with a VND 1,500,000 fee the total is 15,863,000 VND.",
    assumptions: "Duty is charged on CIF value; SCT on CIF + duty; VAT on CIF + duty + SCT. Vietnam ended the VAT exemption for low-value express parcels in 2025. Goods from ASEAN or FTA partners (EVFTA, CPTPP, RCEP) may have lower duty with a certificate of origin.",
    faq: [
      { question: "What is VAT on imports to Vietnam?", answer: "Usually 10% (8% for goods covered by the temporary reduction) of the CIF value plus duty and any special consumption tax." },
      { question: "Are small parcels to Vietnam tax-free?", answer: "Not any more for VAT — the low-value exemption for express shipments was removed in 2025." },
    ],
  },
  {
    slug: "ghana-import-duty-calculator",
    title: "Ghana Import Duty Calculator",
    description: "Estimate Ghana import duty, levies (ECOWAS, AU, EXIM, processing fee), 15% VAT and NHIL/GETFund on goods cleared through Ghana Customs.",
    metaTitle: "Ghana Import Duty Calculator — Duty, Levies & VAT",
    metaDescription: "Free Ghana import duty calculator. Estimate import duty, ECOWAS, AU and EXIM levies, 15% VAT and NHIL/GETFund on goods imported into Ghana.",
    calcInputs: [
      numberField("goodsValue", "Value of Goods", { unit: "GHS", default: 50000, max: 1000000000, step: 1 }),
      numberField("shipping", "International Shipping", { unit: "GHS", default: 6000, max: 1000000000, step: 1, required: false }),
      numberField("insurance", "Insurance", { unit: "GHS", default: 500, max: 1000000000, step: 1, required: false }),
      percentField("dutyRate", "Import Duty Rate", { default: 20, max: 60, step: 0.01 }),
      percentField("leviesRate", "ECOWAS, AU, EXIM Levies + Processing Fee", { default: 2.45, max: 10, step: 0.01 }),
      percentField("vatRate", "VAT", { default: 15, max: 20, step: 0.01 }),
      percentField("nhilGetfundRate", "NHIL + GETFund Levy", { default: 5, max: 10, step: 0.01 }),
      numberField("clearingFee", "Clearing Agent Fee", { unit: "GHS", default: 2000, max: 1000000000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Import Charges (GHS)", format: "number" },
    calcResults: [
      { key: "totalImportCharges", label: "Total Import Charges (GHS)", format: "number", highlight: true },
      { key: "importDuty", label: "Import Duty (GHS)", format: "number" },
      { key: "importTax", label: "VAT + NHIL/GETFund (GHS)", format: "number" },
      { key: "otherFees", label: "Levies & Clearing (GHS)", format: "number" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Charges) (GHS)", format: "number" },
      { key: "effectiveRate", label: "Charges as % of Goods Value", format: "percentage" },
    ],
    instructions: "Enter the goods value, freight and insurance in cedis, the import duty rate for the item (0%, 5%, 10%, 20% or 35%), the combined levies and the VAT and NHIL/GETFund rates.\n\nAdd your clearing agent's fee.",
    examples: "Example: GHS 50,000 of goods with GHS 6,500 freight and insurance at 20% duty. Duty is 11,300 GHS, levies and a GHS 2,000 clearing fee are 3,384.25 GHS, and VAT with NHIL and GETFund is 13,560 GHS — 28,244.25 GHS in total.",
    assumptions: "Duty and levies are charged on CIF value: ECOWAS levy 0.5%, AU levy 0.2%, EXIM levy 0.75% and the processing fee 1% (2.45% together by default). VAT 15% plus NHIL 2.5% and GETFund 2.5% are charged on CIF + duty. Ghana changes levies in its budgets, so check the current rates with GRA Customs.",
    faq: [
      { question: "What levies apply to imports in Ghana?", answer: "The ECOWAS levy, African Union levy, EXIM levy and a processing fee — each a percentage of the CIF value." },
      { question: "What is the VAT on imports in Ghana?", answer: "15% VAT plus 2.5% NHIL and 2.5% GETFund levy, on the CIF value plus duty." },
    ],
  },
  {
    slug: "landed-cost-calculator",
    title: "Landed Cost Calculator",
    description: "Calculate the true landed cost per unit of imported products — product cost, freight, insurance, duty, customs fees and inland delivery — to price them profitably.",
    metaTitle: "Landed Cost Calculator — Cost per Unit Imported",
    metaDescription: "Free landed cost calculator. Add freight, insurance, duty, customs fees and delivery to your product cost to find the landed cost per unit.",
    calcInputs: [
      currencyField("unitCost", "Product Cost per Unit", { default: 8, max: 1000000, step: 0.01 }),
      numberField("units", "Units in the Shipment", { default: 1000, min: 1, max: 10000000 }),
      currencyField("shipping", "International Freight", { default: 1200, max: 10000000, step: 1, required: false }),
      currencyField("insurance", "Cargo Insurance", { default: 60, max: 1000000, step: 1, required: false }),
      percentField("dutyRate", "Duty Rate (All Tariffs)", { default: 12, max: 200, step: 0.01 }),
      dropdown("valuationBasis", "Duty Charged On", [["FOB — product cost only (US, Canada, Australia)", 1], ["CIF — product + freight + insurance", 0]], 1),
      currencyField("customsFees", "Customs Broker & Fees", { default: 250, max: 100000, step: 1, required: false }),
      currencyField("inlandFreight", "Inland Delivery to Warehouse", { default: 400, max: 100000, step: 1, required: false }),
    ],
    calcResult: { label: "Landed Cost per Unit", format: "currency" },
    calcResults: [
      { key: "landedCostPerUnit", label: "Landed Cost per Unit", format: "currency", highlight: true },
      { key: "totalLandedCost", label: "Total Landed Cost", format: "currency" },
      { key: "productCost", label: "Product Cost", format: "currency" },
      { key: "importDuty", label: "Import Duty", format: "currency" },
      { key: "freightAndFees", label: "Freight, Insurance & Fees", format: "currency" },
      { key: "markupOverProduct", label: "Landed Cost Above Product Cost", format: "percentage" },
    ],
    instructions: "Enter the supplier's price per unit and the number of units in the shipment, then the freight, insurance and the total duty rate including any tariffs.\n\nAdd the customs broker's fees and the cost to truck the goods to your warehouse.",
    examples: "Example: 1,000 units at $8 with $1,200 freight, $60 insurance, 12% duty on FOB value, $250 in customs fees and $400 inland delivery. Duty is $960.00 and the total landed cost is $10,870.00 — $10.87 a unit, 35.88% more than the factory price.",
    assumptions: "Landed cost = product + freight + insurance + duty + fees + inland delivery, spread evenly over the units. Import VAT/GST isn't included because businesses usually reclaim it; add it to fees if you can't. Allocating by value or weight instead of evenly gives slightly different per-unit costs for mixed shipments.",
    faq: [
      { question: "What is landed cost?", answer: "The total cost of getting a product to your door: the purchase price plus shipping, insurance, duties, taxes you can't reclaim and fees." },
      { question: "Why does landed cost matter for pricing?", answer: "Pricing on the factory price alone ignores freight and duty, which often add 15–40%, so your real margin ends up much lower than planned." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

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
