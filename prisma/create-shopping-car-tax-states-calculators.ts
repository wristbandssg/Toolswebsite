// One-time (but safe to re-run) batch setup script: creates the 29 state car
// sales tax calculators from the user's shopping list (Shopping Calculators >
// Sales Tax, VAT & Import Duty Calculators). Each one runs the shared state
// engine with that state's rules — see src/lib/calc-engine-shopping-car-tax-states.ts.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-car-tax-states-calculators.ts
// or
//   npm run db:create-shopping-car-tax-states-calculators

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
    slug: "missouri-car-sales-tax-calculator",
    title: "Missouri Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Missouri — 4.225% state tax plus your local rate — and your out-the-door price.",
    metaTitle: "Missouri Car Sales Tax Calculator 2026",
    metaDescription: "Free Missouri car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 4, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 500, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Missouri Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Missouri Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Missouri's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 4% local rate, a $500 doc fee and $400 in title and registration fees: Missouri tax comes to $2,097.38 on a taxable price of $25,500.00. The out-the-door price after the trade-in is $27,997.38, and the trade-in saves $822.50 in tax.",
    assumptions:
      "Missouri charges 4.225% state sales tax plus the city and county rate where you live, not where you buy. You pay it to the Department of Revenue when you title the car (within 30 days). A trade-in — or a car you sold yourself within 180 days before or after the purchase — is taken off the taxable price." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Missouri's motor vehicle office before you buy.",
    faq: [
      { question: "Is Missouri car sales tax based on where I live?", answer: "Yes. The local part is the rate for the address where the car will be titled, so two buyers at the same dealer can pay different tax." },
      { question: "How do I calculate car sales tax in Missouri?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Missouri allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "california-car-sales-tax-calculator",
    title: "California Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in California — 7.25% statewide rate plus district taxes, with no trade-in credit — and your out-the-door price.",
    metaTitle: "California Car Sales Tax Calculator 2026",
    metaDescription: "Free California car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 1.5, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 85, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "California Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "California Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies California's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 1.5% local rate, a $85 doc fee and $400 in title and registration fees: California tax comes to $3,069.94 on a taxable price of $35,085.00. The out-the-door price after the trade-in is $28,554.94, and the trade-in saves $0.00 in tax.",
    assumptions:
      "California charges the 7.25% statewide rate plus district taxes for the place you register the car, so most buyers pay between 7.25% and 10.75%. Unlike most states, California taxes the full price: a trade-in does not lower the tax, and manufacturer rebates are taxed too. The dealer doc fee is capped by law and is taxable." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or California's motor vehicle office before you buy.",
    faq: [
      { question: "Does a trade-in reduce sales tax in California?", answer: "No. California charges sales tax on the full selling price before the trade-in, so the trade-in only lowers what you finance." },
      { question: "How do I calculate car sales tax in California?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where California allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "arkansas-car-sales-tax-calculator",
    title: "Arkansas Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Arkansas — 6.5% state rate, reduced for cheaper used cars, plus local tax on the first $2,500 — and your out-the-door price.",
    metaTitle: "Arkansas Car Sales Tax Calculator 2026",
    metaDescription: "Free Arkansas car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      dropdown("condition", "New or Used", [["New", 0], ["Used", 1]], 0),
      percentField("localRate", "Local Tax Rate", { default: 2, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 129, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Arkansas Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Arkansas Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Arkansas's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 2% local rate, a $129 doc fee and $400 in title and registration fees: Arkansas tax comes to $1,683.39 on a taxable price of $25,129.00. The out-the-door price after the trade-in is $27,212.39, and the trade-in saves $650.00 in tax.",
    assumptions:
      "Arkansas charges 6.5% state tax. Used vehicles selling for under $4,000 are exempt and those from $4,000 to $10,000 pay a reduced 3.5%. City and county taxes apply only to the first $2,500 of the price. The trade-in is deducted." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Arkansas's motor vehicle office before you buy.",
    faq: [
      { question: "Are cheap used cars tax-free in Arkansas?", answer: "Used cars sold for under $4,000 pay no state sales tax, and those from $4,000 to $10,000 pay a reduced 3.5% rate." },
      { question: "How do I calculate car sales tax in Arkansas?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Arkansas allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "texas-car-sales-tax-calculator",
    title: "Texas Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Texas — 6.25% motor vehicle sales tax with no local tax — and your out-the-door price.",
    metaTitle: "Texas Car Sales Tax Calculator 2026",
    metaDescription: "Free Texas car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      dropdown("privateSale", "Where You're Buying", [["Dealer", 0], ["Private seller", 1]], 0),
      currencyField("marketValue", "Standard Presumptive Value (SPV)", { default: 30000, max: 2000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 150, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Texas Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Texas Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Texas's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $150 doc fee and $400 in title and registration fees: Texas tax comes to $1,571.88 on a taxable price of $25,150.00. The out-the-door price after the trade-in is $27,121.88, and the trade-in saves $625.00 in tax.",
    assumptions:
      "Texas charges a flat 6.25% motor vehicle sales tax, with no city or county add-on. Buying from a dealer, the trade-in is deducted. On a private sale, the tax is based on the higher of the price you paid and 80% of the car's standard presumptive value (SPV) from the DMV — unless you have a certified appraisal." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Texas's motor vehicle office before you buy.",
    faq: [
      { question: "What is standard presumptive value in Texas?", answer: "It's the DMV's value for a used car based on similar sales. On a private sale you pay tax on at least 80% of it, even if you paid less." },
      { question: "How do I calculate car sales tax in Texas?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Texas allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "florida-car-sales-tax-calculator",
    title: "Florida Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Florida — 6% state tax plus a county surtax on the first $5,000 — and your out-the-door price.",
    metaTitle: "Florida Car Sales Tax Calculator 2026",
    metaDescription: "Free Florida car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 1, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 999, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Florida Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Florida Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Florida's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 1% local rate, a $999 doc fee and $400 in title and registration fees: Florida tax comes to $1,609.94 on a taxable price of $25,999.00. The out-the-door price after the trade-in is $28,008.94, and the trade-in saves $600.00 in tax.",
    assumptions:
      "Florida charges 6% state sales tax plus the county discretionary surtax for where you live (0% to 1.5%), but the county surtax applies only to the first $5,000 of the price. The trade-in is deducted. Dealer fees are taxable." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Florida's motor vehicle office before you buy.",
    faq: [
      { question: "Why is the county tax so small on a Florida car purchase?", answer: "Florida's county surtax only applies to the first $5,000 of a single item, so it adds at most $75 at a 1.5% county rate." },
      { question: "How do I calculate car sales tax in Florida?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Florida allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "ohio-car-sales-tax-calculator",
    title: "Ohio Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Ohio — 5.75% state tax plus county tax, with trade-in credit only on new cars — and your out-the-door price.",
    metaTitle: "Ohio Car Sales Tax Calculator 2026",
    metaDescription: "Free Ohio car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      dropdown("condition", "New or Used", [["New", 0], ["Used", 1]], 0),
      percentField("localRate", "Local Tax Rate", { default: 1.5, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 387, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Ohio Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Ohio Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Ohio's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 1.5% local rate, a $387 doc fee and $400 in title and registration fees: Ohio tax comes to $1,840.56 on a taxable price of $25,387.00. The out-the-door price after the trade-in is $27,627.56, and the trade-in saves $725.00 in tax.",
    assumptions:
      "Ohio charges 5.75% state tax plus your county's permissive tax, for a total of about 6.5% to 8%. It is based on the county where you live. A trade-in is deducted only when you buy a new car from a dealer; on a used car, tax is charged on the full price." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Ohio's motor vehicle office before you buy.",
    faq: [
      { question: "Does Ohio give a trade-in credit on used cars?", answer: "No. Ohio only deducts the trade-in when you buy a new vehicle from a dealer." },
      { question: "How do I calculate car sales tax in Ohio?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Ohio allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "virginia-car-sales-tax-calculator",
    title: "Virginia Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Virginia — 4.15% motor vehicle sales and use tax, with no trade-in credit — and your out-the-door price.",
    metaTitle: "Virginia Car Sales Tax Calculator 2026",
    metaDescription: "Free Virginia car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 900, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Virginia Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Virginia Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Virginia's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $900 doc fee and $400 in title and registration fees: Virginia tax comes to $1,489.85 on a taxable price of $35,900.00. The out-the-door price after the trade-in is $27,789.85, and the trade-in saves $0.00 in tax.",
    assumptions:
      "Virginia charges a 4.15% motor vehicle sales and use tax (minimum $75) on the gross sale price, with no local add-on. The trade-in is not deducted. Virginia also charges a yearly personal property tax on cars, which is separate." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Virginia's motor vehicle office before you buy.",
    faq: [
      { question: "Does a trade-in lower Virginia car sales tax?", answer: "No. Virginia's 4.15% tax is charged on the gross price before the trade-in." },
      { question: "How do I calculate car sales tax in Virginia?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Virginia allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "tennessee-car-sales-tax-calculator",
    title: "Tennessee Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Tennessee — 7% state tax plus local tax on the first $1,600 and a single-article tax — and your out-the-door price.",
    metaTitle: "Tennessee Car Sales Tax Calculator 2026",
    metaDescription: "Free Tennessee car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 2.25, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 699, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Tennessee Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Tennessee Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Tennessee's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 2.25% local rate, a $699 doc fee and $400 in title and registration fees: Tennessee tax comes to $1,878.93 on a taxable price of $25,699.00. The out-the-door price after the trade-in is $27,977.93, and the trade-in saves $700.00 in tax.",
    assumptions:
      "Tennessee charges 7% state tax on the whole price, plus local tax (up to 2.75%) on the first $1,600 and the state single-article tax of 2.75% on the next $1,600 ($1,600.01 to $3,200). The trade-in is deducted." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Tennessee's motor vehicle office before you buy.",
    faq: [
      { question: "What is the Tennessee single article tax?", answer: "An extra 2.75% state tax on the portion of one item's price between $1,600 and $3,200 — at most $44 on a car." },
      { question: "How do I calculate car sales tax in Tennessee?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Tennessee allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "oklahoma-car-sales-tax-calculator",
    title: "Oklahoma Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Oklahoma — 3.25% excise tax plus 1.25% sales tax — and your out-the-door price.",
    metaTitle: "Oklahoma Car Sales Tax Calculator 2026",
    metaDescription: "Free Oklahoma car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      dropdown("condition", "New or Used", [["New", 0], ["Used", 1]], 0),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 499, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Oklahoma Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Oklahoma Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Oklahoma's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $499 doc fee and $400 in title and registration fees: Oklahoma tax comes to $1,597.46 on a taxable price of $35,499.00. The out-the-door price after the trade-in is $27,496.46, and the trade-in saves $0.00 in tax.",
    assumptions:
      "Oklahoma charges a vehicle excise tax instead of regular sales tax: 3.25% of the price for a new car, or $20 on the first $1,500 plus 3.25% of the rest for a used car. A 1.25% sales tax is added on top. The trade-in is not deducted." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Oklahoma's motor vehicle office before you buy.",
    faq: [
      { question: "How is Oklahoma used car tax calculated?", answer: "A flat $20 on the first $1,500, 3.25% excise on the remainder, plus 1.25% sales tax on the full price." },
      { question: "How do I calculate car sales tax in Oklahoma?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Oklahoma allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "illinois-car-sales-tax-calculator",
    title: "Illinois Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Illinois — 6.25% state tax plus local tax, with the trade-in credit capped at $10,000 — and your out-the-door price.",
    metaTitle: "Illinois Car Sales Tax Calculator 2026",
    metaDescription: "Free Illinois car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 2.5, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 377, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Illinois Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Illinois Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Illinois's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 2.5% local rate, a $377 doc fee and $400 in title and registration fees: Illinois tax comes to $2,220.49 on a taxable price of $25,377.00. The out-the-door price after the trade-in is $27,997.49, and the trade-in saves $875.00 in tax.",
    assumptions:
      "Illinois charges 6.25% state tax plus local taxes where the dealer is (Chicago totals about 10.25%). Since 2022 the trade-in credit is capped at $10,000, so a more valuable trade-in still saves tax on only $10,000. Private sales pay a separate private party vehicle use tax by price and age." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Illinois's motor vehicle office before you buy.",
    faq: [
      { question: "Is there a limit on the Illinois trade-in tax credit?", answer: "Yes. Since January 2022 only the first $10,000 of a trade-in's value reduces the taxable price." },
      { question: "How do I calculate car sales tax in Illinois?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Illinois allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "colorado-car-sales-tax-calculator",
    title: "Colorado Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Colorado — 2.9% state tax plus county, city and district taxes — and your out-the-door price.",
    metaTitle: "Colorado Car Sales Tax Calculator 2026",
    metaDescription: "Free Colorado car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 4.5, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 699, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Colorado Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Colorado Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Colorado's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 4.5% local rate, a $699 doc fee and $400 in title and registration fees: Colorado tax comes to $1,901.73 on a taxable price of $25,699.00. The out-the-door price after the trade-in is $28,000.73, and the trade-in saves $740.00 in tax.",
    assumptions:
      "Colorado's state rate is just 2.9%, but county, city and special district taxes (like RTD in Denver) are added for the address where you register the car, so totals are often 7% to 9%. The trade-in is deducted." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Colorado's motor vehicle office before you buy.",
    faq: [
      { question: "Why does Colorado car tax vary so much?", answer: "The 2.9% state rate is low, but local and special district taxes are charged by where you live, so totals range from about 3% to over 10%." },
      { question: "How do I calculate car sales tax in Colorado?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Colorado allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "minnesota-car-sales-tax-calculator",
    title: "Minnesota Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Minnesota — 6.875% motor vehicle sales tax — and your out-the-door price.",
    metaTitle: "Minnesota Car Sales Tax Calculator 2026",
    metaDescription: "Free Minnesota car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 375, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Minnesota Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Minnesota Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Minnesota's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $375 doc fee and $400 in title and registration fees: Minnesota tax comes to $1,744.53 on a taxable price of $25,375.00. The out-the-door price after the trade-in is $27,519.53, and the trade-in saves $687.50 in tax.",
    assumptions:
      "Minnesota charges a 6.875% motor vehicle sales tax on the price minus the trade-in, paid when you title the car. Some older, low-value cars and collector vehicles pay a small flat in-lieu tax instead." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Minnesota's motor vehicle office before you buy.",
    faq: [
      { question: "What is Minnesota's car sales tax rate?", answer: "6.875% statewide since July 2023, with no extra local sales tax on vehicles." },
      { question: "How do I calculate car sales tax in Minnesota?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Minnesota allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "alabama-car-sales-tax-calculator",
    title: "Alabama Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Alabama — 2% state automotive rate plus local tax — and your out-the-door price.",
    metaTitle: "Alabama Car Sales Tax Calculator 2026",
    metaDescription: "Free Alabama car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 1.5, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 499, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Alabama Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Alabama Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Alabama's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 1.5% local rate, a $499 doc fee and $400 in title and registration fees: Alabama tax comes to $892.47 on a taxable price of $25,499.00. The out-the-door price after the trade-in is $26,791.46, and the trade-in saves $350.00 in tax.",
    assumptions:
      "Alabama taxes vehicles at a reduced 2% state automotive rate, plus city and county rates (often 1% to 3%). The trade-in is deducted. You pay the tax when you register the car at the county office." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Alabama's motor vehicle office before you buy.",
    faq: [
      { question: "Is Alabama's car sales tax lower than its regular sales tax?", answer: "Yes. Vehicles pay a 2% state rate instead of the general 4%, plus local automotive rates." },
      { question: "How do I calculate car sales tax in Alabama?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Alabama allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "kansas-car-sales-tax-calculator",
    title: "Kansas Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Kansas — 6.5% state tax plus local tax — and your out-the-door price.",
    metaTitle: "Kansas Car Sales Tax Calculator 2026",
    metaDescription: "Free Kansas car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 2.2, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 399, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Kansas Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Kansas Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Kansas's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 2.2% local rate, a $399 doc fee and $400 in title and registration fees: Kansas tax comes to $2,209.71 on a taxable price of $25,399.00. The out-the-door price after the trade-in is $28,008.71, and the trade-in saves $870.00 in tax.",
    assumptions:
      "Kansas charges 6.5% state sales tax plus city and county taxes for where you live, paid at the county treasurer when you register. The trade-in is deducted." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Kansas's motor vehicle office before you buy.",
    faq: [
      { question: "When do I pay sales tax on a car in Kansas?", answer: "When you title and register it at your county treasurer's office, usually within 60 days." },
      { question: "How do I calculate car sales tax in Kansas?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Kansas allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "utah-car-sales-tax-calculator",
    title: "Utah Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Utah — 4.85% state tax plus local tax — and your out-the-door price.",
    metaTitle: "Utah Car Sales Tax Calculator 2026",
    metaDescription: "Free Utah car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 2.4, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 399, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Utah Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Utah Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Utah's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 2.4% local rate, a $399 doc fee and $400 in title and registration fees: Utah tax comes to $1,841.43 on a taxable price of $25,399.00. The out-the-door price after the trade-in is $27,640.43, and the trade-in saves $725.00 in tax.",
    assumptions:
      "Utah charges 4.85% state tax plus local option taxes, for totals of about 6.1% to 8.35%. The trade-in is deducted. Utah also charges an age-based uniform fee at registration, which is separate." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Utah's motor vehicle office before you buy.",
    faq: [
      { question: "What is the total car sales tax rate in Utah?", answer: "Usually between about 6.1% and 8.35%, depending on where you live." },
      { question: "How do I calculate car sales tax in Utah?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Utah allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "georgia-car-sales-tax-calculator",
    title: "Georgia Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Georgia — 7% title ad valorem tax (TAVT) on the car's value — and your out-the-door price.",
    metaTitle: "Georgia Car Sales Tax Calculator 2026",
    metaDescription: "Free Georgia car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("marketValue", "Fair Market Value (DOR Value)", { default: 35000, max: 2000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 799, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Georgia Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Georgia Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Georgia's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $799 doc fee and $400 in title and registration fees: Georgia tax comes to $1,805.93 on a taxable price of $25,799.00. The out-the-door price after the trade-in is $28,004.93, and the trade-in saves $700.00 in tax.",
    assumptions:
      "Georgia charges a one-time Title Ad Valorem Tax (TAVT) instead of sales tax and yearly car tax. It is 7% of the car's fair market value — the Department of Revenue's value or the price, whichever is higher — less the trade-in on a dealer purchase. New Georgia residents pay 3%." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Georgia's motor vehicle office before you buy.",
    faq: [
      { question: "Do you pay sales tax on a car in Georgia?", answer: "No. Georgia charges a one-time 7% title ad valorem tax (TAVT) when you title the car instead of sales tax and annual property tax." },
      { question: "How do I calculate car sales tax in Georgia?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Georgia allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "new-york-car-sales-tax-calculator",
    title: "New York Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in New York — 4% state tax plus county and city tax — and your out-the-door price.",
    metaTitle: "New York Car Sales Tax Calculator 2026",
    metaDescription: "Free New York car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 4, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 175, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "New York Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "New York Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies New York's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 4% local rate, a $175 doc fee and $400 in title and registration fees: New York tax comes to $2,014.00 on a taxable price of $25,175.00. The out-the-door price after the trade-in is $27,589.00, and the trade-in saves $800.00 in tax.",
    assumptions:
      "New York charges 4% state tax plus the county and city rate where you register the car (New York City totals 8.875%). The trade-in is deducted. Dealer doc fees are capped by law." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or New York's motor vehicle office before you buy.",
    faq: [
      { question: "Is New York car sales tax based on where I buy or where I live?", answer: "Where you live and register the car." },
      { question: "How do I calculate car sales tax in New York?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where New York allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "new-jersey-car-sales-tax-calculator",
    title: "New Jersey Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in New Jersey — 6.625% state sales tax — and your out-the-door price.",
    metaTitle: "New Jersey Car Sales Tax Calculator 2026",
    metaDescription: "Free New Jersey car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 699, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "New Jersey Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "New Jersey Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies New Jersey's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $699 doc fee and $400 in title and registration fees: New Jersey tax comes to $1,702.56 on a taxable price of $25,699.00. The out-the-door price after the trade-in is $27,801.56, and the trade-in saves $662.50 in tax.",
    assumptions:
      "New Jersey charges 6.625% sales tax on the price minus the trade-in, with no local add-on for cars." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or New Jersey's motor vehicle office before you buy.",
    faq: [
      { question: "What is the New Jersey car sales tax rate?", answer: "6.625% statewide." },
      { question: "How do I calculate car sales tax in New Jersey?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where New Jersey allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "washington-car-sales-tax-calculator",
    title: "Washington Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Washington — 6.5% state tax plus a 0.3% motor vehicle tax and local tax — and your out-the-door price.",
    metaTitle: "Washington Car Sales Tax Calculator 2026",
    metaDescription: "Free Washington car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 3.5, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 200, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Washington Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Washington Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Washington's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 3.5% local rate, a $200 doc fee and $400 in title and registration fees: Washington tax comes to $2,595.60 on a taxable price of $25,200.00. The out-the-door price after the trade-in is $28,195.60, and the trade-in saves $1,030.00 in tax.",
    assumptions:
      "Washington charges 6.5% state tax plus a 0.3% motor vehicle sales tax and local rates where you live — often 9% to 10.6% in total. The trade-in is deducted. Regional transit (RTA) taxes are part of registration, not sales tax." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Washington's motor vehicle office before you buy.",
    faq: [
      { question: "Why is Washington car sales tax so high?", answer: "The 6.5% state rate, an extra 0.3% vehicle tax and high local rates add up to around 10% in many areas." },
      { question: "How do I calculate car sales tax in Washington?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Washington allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "arizona-car-sales-tax-calculator",
    title: "Arizona Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Arizona — 5.6% state tax plus county and city tax — and your out-the-door price.",
    metaTitle: "Arizona Car Sales Tax Calculator 2026",
    metaDescription: "Free Arizona car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 2.8, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 499, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Arizona Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Arizona Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Arizona's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 2.8% local rate, a $499 doc fee and $400 in title and registration fees: Arizona tax comes to $2,141.92 on a taxable price of $25,499.00. The out-the-door price after the trade-in is $28,040.92, and the trade-in saves $840.00 in tax.",
    assumptions:
      "Arizona charges a 5.6% state transaction privilege tax plus county and city rates, often 8% to 9% in total. The trade-in is deducted. Some cities cap their tax on single items over a set amount." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Arizona's motor vehicle office before you buy.",
    faq: [
      { question: "Does Arizona tax a trade-in?", answer: "No. The trade-in value is taken off before tax is charged." },
      { question: "How do I calculate car sales tax in Arizona?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Arizona allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "massachusetts-car-sales-tax-calculator",
    title: "Massachusetts Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Massachusetts — 6.25% state sales tax — and your out-the-door price.",
    metaTitle: "Massachusetts Car Sales Tax Calculator 2026",
    metaDescription: "Free Massachusetts car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 499, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Massachusetts Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Massachusetts Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Massachusetts's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $499 doc fee and $400 in title and registration fees: Massachusetts tax comes to $1,593.69 on a taxable price of $25,499.00. The out-the-door price after the trade-in is $27,492.69, and the trade-in saves $625.00 in tax.",
    assumptions:
      "Massachusetts charges a flat 6.25% sales tax with no local add-on. Buying from a dealer, the trade-in is deducted. On a private sale, tax is based on the higher of the price and the car's clean trade-in book value." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Massachusetts's motor vehicle office before you buy.",
    faq: [
      { question: "What is the Massachusetts car sales tax?", answer: "6.25% of the price minus the trade-in, paid to the RMV or dealer." },
      { question: "How do I calculate car sales tax in Massachusetts?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Massachusetts allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "louisiana-car-sales-tax-calculator",
    title: "Louisiana Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Louisiana — 5% state tax plus parish tax — and your out-the-door price.",
    metaTitle: "Louisiana Car Sales Tax Calculator 2026",
    metaDescription: "Free Louisiana car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 5, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 425, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Louisiana Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Louisiana Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Louisiana's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 5% local rate, a $425 doc fee and $400 in title and registration fees: Louisiana tax comes to $2,542.50 on a taxable price of $25,425.00. The out-the-door price after the trade-in is $28,367.50, and the trade-in saves $1,000.00 in tax.",
    assumptions:
      "Louisiana raised its state sales tax to 5% in 2025. Parish and city taxes for where you live are added, so totals are often 9% to 11%. The trade-in is deducted." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Louisiana's motor vehicle office before you buy.",
    faq: [
      { question: "What is Louisiana's car sales tax rate?", answer: "5% state plus local parish rates, usually about 9% to 11% in total." },
      { question: "How do I calculate car sales tax in Louisiana?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Louisiana allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "nebraska-car-sales-tax-calculator",
    title: "Nebraska Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Nebraska — 5.5% state tax plus local tax — and your out-the-door price.",
    metaTitle: "Nebraska Car Sales Tax Calculator 2026",
    metaDescription: "Free Nebraska car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 1.5, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 299, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Nebraska Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Nebraska Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Nebraska's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 1.5% local rate, a $299 doc fee and $400 in title and registration fees: Nebraska tax comes to $1,770.93 on a taxable price of $25,299.00. The out-the-door price after the trade-in is $27,469.93, and the trade-in saves $700.00 in tax.",
    assumptions:
      "Nebraska charges 5.5% state tax plus up to 2% local tax where you live. The trade-in is deducted. You pay the tax at the county treasurer when you register." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Nebraska's motor vehicle office before you buy.",
    faq: [
      { question: "What local tax applies to cars in Nebraska?", answer: "City and county sales tax of up to 2% for the place where the car is registered." },
      { question: "How do I calculate car sales tax in Nebraska?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Nebraska allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "maine-car-sales-tax-calculator",
    title: "Maine Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Maine — 5.5% state sales tax — and your out-the-door price.",
    metaTitle: "Maine Car Sales Tax Calculator 2026",
    metaDescription: "Free Maine car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 499, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Maine Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Maine Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Maine's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $499 doc fee and $400 in title and registration fees: Maine tax comes to $1,402.45 on a taxable price of $25,499.00. The out-the-door price after the trade-in is $27,301.45, and the trade-in saves $550.00 in tax.",
    assumptions:
      "Maine charges a flat 5.5% sales tax on cars, with no local tax. The trade-in is deducted." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Maine's motor vehicle office before you buy.",
    faq: [
      { question: "What is Maine's car sales tax?", answer: "5.5% of the price after the trade-in." },
      { question: "How do I calculate car sales tax in Maine?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Maine allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "michigan-car-sales-tax-calculator",
    title: "Michigan Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Michigan — 6% sales tax with a capped trade-in credit — and your out-the-door price.",
    metaTitle: "Michigan Car Sales Tax Calculator 2026",
    metaDescription: "Free Michigan car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("tradeCap", "This Year's Trade-In Credit Cap", { default: 8500, max: 1000000, step: 500 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 280, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Michigan Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Michigan Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Michigan's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $280 doc fee and $400 in title and registration fees: Michigan tax comes to $1,606.80 on a taxable price of $26,780.00. The out-the-door price after the trade-in is $27,286.80, and the trade-in saves $510.00 in tax.",
    assumptions:
      "Michigan charges a flat 6% sales or use tax. Only part of a trade-in is deducted: the credit cap rises by $500 every year until it becomes unlimited in 2039, so enter this year's cap from the Michigan Department of Treasury." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Michigan's motor vehicle office before you buy.",
    faq: [
      { question: "Is there a trade-in tax credit limit in Michigan?", answer: "Yes. Michigan caps the trade-in credit and raises the cap $500 each year until the full trade-in is deductible in 2039." },
      { question: "How do I calculate car sales tax in Michigan?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Michigan allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "indiana-car-sales-tax-calculator",
    title: "Indiana Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Indiana — 7% state sales tax — and your out-the-door price.",
    metaTitle: "Indiana Car Sales Tax Calculator 2026",
    metaDescription: "Free Indiana car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 250, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Indiana Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Indiana Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Indiana's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $250 doc fee and $400 in title and registration fees: Indiana tax comes to $1,767.50 on a taxable price of $25,250.00. The out-the-door price after the trade-in is $27,417.50, and the trade-in saves $700.00 in tax.",
    assumptions:
      "Indiana charges a flat 7% sales tax with no local tax. The trade-in is deducted. You pay the dealer, or the BMV on a private sale." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Indiana's motor vehicle office before you buy.",
    faq: [
      { question: "What is Indiana's car sales tax?", answer: "7% of the price after the trade-in." },
      { question: "How do I calculate car sales tax in Indiana?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Indiana allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "iowa-car-sales-tax-calculator",
    title: "Iowa Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Iowa — 5% one-time registration fee instead of sales tax — and your out-the-door price.",
    metaTitle: "Iowa Car Sales Tax Calculator 2026",
    metaDescription: "Free Iowa car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 180, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Iowa Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Iowa Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Iowa's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $180 doc fee and $400 in title and registration fees: Iowa tax comes to $1,259.00 on a taxable price of $25,180.00. The out-the-door price after the trade-in is $26,839.00, and the trade-in saves $500.00 in tax.",
    assumptions:
      "Iowa doesn't charge regular sales tax on cars. Instead it charges a one-time 5% Fee for New Registration on the price minus the trade-in, paid at the county treasurer." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Iowa's motor vehicle office before you buy.",
    faq: [
      { question: "Is there sales tax on cars in Iowa?", answer: "No, but Iowa charges a 5% one-time registration fee that works the same way." },
      { question: "How do I calculate car sales tax in Iowa?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Iowa allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "nevada-car-sales-tax-calculator",
    title: "Nevada Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Nevada — 6.85% state tax plus county tax — and your out-the-door price.",
    metaTitle: "Nevada Car Sales Tax Calculator 2026",
    metaDescription: "Free Nevada car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      percentField("localRate", "Local Tax Rate", { default: 1.525, max: 10, step: 0.001 }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 499, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Nevada Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Nevada Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value, then the local rate for the city or county where you'll register the car." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Nevada's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in and a 1.525% local rate, a $499 doc fee and $400 in title and registration fees: Nevada tax comes to $2,135.54 on a taxable price of $25,499.00. The out-the-door price after the trade-in is $28,034.54, and the trade-in saves $837.50 in tax.",
    assumptions:
      "Nevada charges 6.85% plus county tax where you live (Clark County totals 8.375%). The trade-in is deducted. Private sales between individuals are not taxed." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Nevada's motor vehicle office before you buy.",
    faq: [
      { question: "Do you pay sales tax on a private car sale in Nevada?", answer: "No. Nevada only charges sales tax on vehicles bought from dealers." },
      { question: "How do I calculate car sales tax in Nevada?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Nevada allows it, then apply the state rate and your local rate. Title and registration fees are added afterwards without tax." },
    ],
  },
  {
    slug: "maryland-car-sales-tax-calculator",
    title: "Maryland Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car in Maryland — 6.5% vehicle excise (titling) tax — and your out-the-door price.",
    metaTitle: "Maryland Car Sales Tax Calculator 2026",
    metaDescription: "Free Maryland car sales tax calculator. Work out the tax on a vehicle purchase with your trade-in, local rate and dealer fees.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 35000, max: 2000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 10000, max: 1000000, step: 100, required: false }),
      currencyField("docFee", "Dealer Doc Fee (Taxable)", { default: 800, max: 10000, step: 1, required: false }),
      currencyField("otherFees", "Title, Registration & Plate Fees", { default: 400, max: 20000, step: 1, required: false }),
    ],
    calcResult: { label: "Maryland Car Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Maryland Car Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "taxablePrice", label: "Taxable Price", format: "currency" },
      { key: "tradeInTaxSavings", label: "Tax Saved by the Trade-In", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Car Price", format: "percentage" },
    ],
    instructions:
      "Enter the car's price and your trade-in value." +
      "\n\n" +
      "Add the dealer's doc fee, which is taxed, and the title and registration fees, which aren't. The calculator applies Maryland's rules for the trade-in and any caps.",
    examples:
      "Example: a $35,000 car with a $10,000 trade-in, a $800 doc fee and $400 in title and registration fees: Maryland tax comes to $1,677.00 on a taxable price of $25,800.00. The out-the-door price after the trade-in is $27,877.00, and the trade-in saves $650.00 in tax.",
    assumptions:
      "Maryland charges a vehicle excise (titling) tax of 6.5% since July 2025 instead of regular sales tax. On a dealer purchase the trade-in is deducted." +
      " Rates are those in effect in 2026; check the exact local rate and fees with your dealer or Maryland's motor vehicle office before you buy.",
    faq: [
      { question: "What is the Maryland vehicle excise tax?", answer: "6.5% of the price after the trade-in, paid when you title the car." },
      { question: "How do I calculate car sales tax in Maryland?", answer: "Start with the price plus taxable dealer fees, take off the trade-in where Maryland allows it, then apply the state rate. Title and registration fees are added afterwards without tax." },
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
