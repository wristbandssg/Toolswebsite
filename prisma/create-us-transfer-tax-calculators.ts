// One-time (but safe to re-run) batch setup script: creates 29 US state
// Real Estate Transfer Tax Tools inside the existing "Tax & Paycheck
// Calculators" category — fifth batch of the 50-state audit.
//
// See src/lib/calc-engine-us-transfer-tax.ts for the actual math and that
// file's header for which states have a genuine transfer/conveyance/deed
// tax (the US equivalent of "stamp duty").
//
// HOW TO RUN
//   npx tsx prisma/create-us-transfer-tax-calculators.ts
// or
//   npm run db:create-us-transfer-tax-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p}</p>`).join("");
}
function priceField(opts: { max?: number } = {}) {
  return { key: "propertyPrice", label: "Property Sale Price", type: "currency", required: true, default: 0, min: 0, max: opts.max ?? 3_000_000, step: 5_000 };
}
function currencyField(key: string, label: string, opts: { required?: boolean; default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: opts.required ?? false, default: opts.default ?? 0, min: 0, max: opts.max ?? 3_000_000, step: opts.step ?? 5_000 };
}
function dropdownField(key: string, label: string, options: { label: string; value: number }[], defaultValue = 0) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}
function currencyResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "currency", highlight: opts.highlight };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. Real estate transfer taxes often stack a state rate with a separate county or city rate not shown " +
  "here — check with your title company or closing attorney for the exact combined figure on your specific " +
  "transaction.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

function simpleTool(
  state: string,
  slug: string,
  rateLabel: string,
  instructionsExtra: string,
  assumptionsExtra: string,
  exampleFigure: string
): ToolDef {
  return {
    slug,
    title: `${state} Transfer Tax Calculator`,
    description: `Estimate ${state}'s real estate transfer tax: ${rateLabel}.`,
    metaTitle: `${state} Transfer Tax Calculator (2026) — Free & Instant`,
    metaDescription: `Free ${state} real estate transfer tax calculator. ${rateLabel}.`,
    calcInputs: [priceField()],
    calcResults: [currencyResult("totalTransferTax", `${state} Transfer Tax`, { highlight: true })],
    instructions: `${state} charges a real estate transfer tax of ${rateLabel} on most property sales. ${instructionsExtra} Enter the property's sale price to see your estimated tax.`,
    examples: exampleFigure,
    assumptions: `This calculator uses ${state}'s published transfer tax rate. ${assumptionsExtra}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: `Who pays the ${state} transfer tax — buyer or seller?`, answer: "This varies by local custom and negotiation — check your purchase agreement or ask your closing attorney/title company who's responsible in your transaction." }],
  };
}

const TOOLS: ToolDef[] = [
  {
    slug: "alabama-transfer-tax-calculator",
    title: "Alabama Transfer Tax Calculator",
    description: "Estimate Alabama's deed tax (0.1% of price) plus mortgage tax (0.15% of the loan amount) on a real estate purchase.",
    metaTitle: "Alabama Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Alabama transfer tax calculator. Deed tax 0.1% of price plus mortgage tax 0.15% of the loan amount.",
    calcInputs: [priceField(), currencyField("loanAmount", "Loan Amount (if financed)", { default: 0 })],
    calcResults: [currencyResult("deedTax", "Deed Tax"), currencyResult("mortgageTax", "Mortgage Tax"), currencyResult("totalTransferTax", "Total Alabama Transfer Tax", { highlight: true })],
    instructions: "Alabama charges two separate real estate taxes at closing: a deed tax of $0.50 per $500 of price (0.1%), and — if the purchase is financed — a mortgage tax of $0.15 per $100 of the loan amount (0.15%). Enter the sale price and loan amount (leave the loan amount at $0 for an all-cash purchase) to see both taxes.",
    examples: "Example: a $300,000 home financed with a $250,000 loan. Deed tax: $300. Mortgage tax: $375. Total: $675.",
    assumptions: "This calculator uses Alabama's published $0.50/$500 deed tax and $0.15/$100 mortgage tax rates.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Do I owe mortgage tax on an all-cash purchase?", answer: "No — the mortgage tax only applies to the amount financed; leave the loan amount at $0 for a cash purchase." }],
  },
  simpleTool("Arkansas", "arkansas-transfer-tax-calculator", "$3.30 per $1,000 of price (0.33%)", "", "", "Example: a $300,000 home. Transfer tax: $300,000 x 0.33% = $990."),
  simpleTool("California", "california-transfer-tax-calculator", "a 0.11% state base documentary transfer tax", "Many California cities add their own local transfer tax on top of this state base rate — sometimes substantially more (for example, Los Angeles's Measure ULA on high-value sales) — so your actual total may be higher.", "California's total transfer tax cost is often dominated by local add-ons, which aren't included in this state-base-only estimate.", "Example: a $500,000 home. State base transfer tax: $500,000 x 0.11% = $550 — before any city add-on."),
  {
    slug: "connecticut-transfer-tax-calculator",
    title: "Connecticut Transfer Tax Calculator",
    description: "Estimate Connecticut's conveyance tax — 0.75% up to $2.5 million, 1.25% above that.",
    metaTitle: "Connecticut Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Connecticut conveyance tax calculator. 0.75% up to $2.5M, 1.25% above.",
    calcInputs: [priceField({ max: 10_000_000 })],
    calcResults: [currencyResult("totalTransferTax", "Connecticut Conveyance Tax (state portion)", { highlight: true })],
    instructions: "Connecticut's state conveyance tax is 0.75% on the first $2.5 million of a sale price, and 1.25% on anything above that — plus a separate municipal conveyance tax that varies by town and isn't included here. Enter the sale price to see the state portion.",
    examples: "Example: a $3,000,000 sale. State conveyance tax: ($2,500,000 x 0.75%) + ($500,000 x 1.25%) = $25,000.",
    assumptions: "This calculator covers only Connecticut's STATE conveyance tax — municipalities add their own separate conveyance tax on top, which varies by town.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is there a separate town-level conveyance tax too?", answer: "Yes — this calculator covers only the state portion; check with your town for its additional municipal conveyance tax." }],
  },
  simpleTool("Delaware", "delaware-transfer-tax-calculator", "roughly 4% combined (state + local)", "Delaware's transfer tax is among the highest in the country when state and local portions are combined.", "The exact split between state and local portions can vary; this shows the typical combined total.", "Example: a $400,000 home. Estimated combined transfer tax: $400,000 x 4% = $16,000."),
  simpleTool("Florida", "florida-transfer-tax-calculator", "a 0.70% documentary stamp tax", "Miami-Dade County uses a lower rate for some property types, which isn't modeled here.", "This uses Florida's standard statewide rate; Miami-Dade has its own lower rate for certain property types.", "Example: a $300,000 home. Documentary stamp tax: $300,000 x 0.70% = $2,100."),
  simpleTool("Georgia", "georgia-transfer-tax-calculator", "$0.10 per $100 of price (0.1%)", "", "", "Example: a $300,000 home. Transfer tax: $300,000 x 0.1% = $300."),
  {
    slug: "hawaii-transfer-tax-calculator",
    title: "Hawaii Transfer Tax Calculator",
    description: "Estimate Hawaii's tiered conveyance tax — roughly 0.10% to 1.25%, with a discount for owner-occupants.",
    metaTitle: "Hawaii Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Hawaii conveyance tax calculator. Tiered 0.10%-1.25% by price, reduced for owner-occupants.",
    calcInputs: [priceField({ max: 10_000_000 }), dropdownField("ownerOccupied", "Will you live in this property?", [{ label: "No — investment/second home", value: 0 }, { label: "Yes — owner-occupied", value: 1 }])],
    calcResults: [currencyResult("totalTransferTax", "Hawaii Conveyance Tax", { highlight: true })],
    instructions: "Hawaii's conveyance tax rises from roughly 0.10% to 1.25% as the sale price increases, with a meaningful discount for buyers who will occupy the property as their primary residence. Enter the sale price and whether you'll occupy the property.",
    examples: "Example: a $2,000,000 non-owner-occupied purchase. Estimated conveyance tax: in the range of $15,000-$20,000.",
    assumptions: "This calculator approximates Hawaii's tiered schedule as rising smoothly between its published low and high rates, and applies a 50% owner-occupant discount as a simplification of Hawaii's actual multi-tier owner-occupant discount structure — the exact top-tier bracket boundaries weren't independently reconfirmed by this tool's research.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Do owner-occupants really pay less?", answer: "Yes — Hawaii's conveyance tax offers a real discount for buyers who will occupy the property, modeled here as roughly half the standard rate." }],
  },
  simpleTool("Illinois", "illinois-transfer-tax-calculator", "$0.10 per $100 state + $0.05 per $100 county (0.15% combined baseline)", "Chicago and some other municipalities add much more on top — this covers only the state and standard county portions.", "Chicago's transfer tax can run up to 0.75% additional — not included in this baseline estimate.", "Example: a $300,000 home outside Chicago. Baseline transfer tax: $300,000 x 0.15% = $450."),
  simpleTool("Iowa", "iowa-transfer-tax-calculator", "$0.80 per $500 of price above a $500 exemption (0.16%)", "The first $500 of the sale price is exempt from this tax.", "", "Example: a $100,500 home. Taxable amount: $100,000. Transfer tax: $100,000 x 0.16% = $160."),
  simpleTool("Kentucky", "kentucky-transfer-tax-calculator", "$0.50 per $500 of price (0.10%)", "", "", "Example: a $300,000 home. Transfer tax: $300,000 x 0.1% = $300."),
  {
    slug: "maine-transfer-tax-calculator",
    title: "Maine Transfer Tax Calculator",
    description: "Estimate Maine's real estate transfer tax — $2.20 per $500 of price (0.44%), typically split evenly between buyer and seller.",
    metaTitle: "Maine Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Maine transfer tax calculator. 0.44% total, split evenly between buyer and seller.",
    calcInputs: [priceField()],
    calcResults: [currencyResult("buyerShare", "Buyer's Share"), currencyResult("sellerShare", "Seller's Share"), currencyResult("totalTransferTax", "Total Maine Transfer Tax", { highlight: true })],
    instructions: "Maine's transfer tax is $2.20 per $500 of sale price (0.44% total), and it's customarily split evenly between buyer and seller — each paying half. Enter the sale price to see each party's share and the total.",
    examples: "Example: a $300,000 home. Total transfer tax: $1,320, split $660 buyer / $660 seller.",
    assumptions: "This calculator uses Maine's published 0.44% combined rate, split evenly — the actual split can be negotiated differently in a purchase agreement.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is the 50/50 split mandatory?", answer: "It's customary but can be negotiated differently between buyer and seller in the purchase agreement." }],
  },
  {
    slug: "maryland-transfer-tax-calculator",
    title: "Maryland Transfer Tax Calculator",
    description: "Estimate Maryland's state transfer tax — 0.5% of price, reduced to 0.25% for first-time homebuyers.",
    metaTitle: "Maryland Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Maryland transfer tax calculator. State rate 0.5%, reduced to 0.25% for first-time buyers.",
    calcInputs: [priceField(), dropdownField("firstTimeBuyer", "Are you a first-time homebuyer?", [{ label: "No", value: 0 }, { label: "Yes", value: 1 }])],
    calcResults: [currencyResult("totalTransferTax", "Maryland State Transfer Tax", { highlight: true })],
    instructions: "Maryland's state transfer tax is 0.5% of the sale price, cut in half to 0.25% for qualifying first-time homebuyers. This is the STATE portion only — most Maryland counties (and Baltimore City) add their own separate county transfer tax on top, which isn't included here. Enter the sale price and whether you qualify as a first-time buyer.",
    examples: "Example: a $300,000 home bought by a first-time buyer. State transfer tax: $300,000 x 0.25% = $750 — plus any county transfer tax on top.",
    assumptions: "This calculator covers only Maryland's STATE transfer tax; county and Baltimore City transfer taxes (and recordation tax) are separate and not included.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Does this include my county's transfer tax too?", answer: "No — this is the state portion only. Most Maryland counties (Baltimore City up to 1.5%) add their own separate transfer tax on top." }],
  },
  simpleTool("Massachusetts", "massachusetts-transfer-tax-calculator", "$4.56 per $1,000 of price (0.456%)", "Barnstable County uses a slightly higher rate of $6.12 per $1,000, not modeled here.", "", "Example: a $300,000 home. Deed excise tax: $300,000 x 0.456% = $1,368."),
  simpleTool("Michigan", "michigan-transfer-tax-calculator", "$3.75 per $500 state (0.75%) plus $0.55 per $500 county (0.11%)", "", "", "Example: a $300,000 home. State tax: $2,250. County tax: $330. Total: $2,580."),
  {
    slug: "minnesota-transfer-tax-calculator",
    title: "Minnesota Transfer Tax Calculator",
    description: "Estimate Minnesota's Deed Tax (0.33% of price) and, if financed, its Mortgage Registry Tax (0.23% of the loan amount).",
    metaTitle: "Minnesota Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Minnesota transfer tax calculator. Deed Tax 0.33% of price plus Mortgage Registry Tax 0.23% of the loan amount.",
    calcInputs: [priceField(), currencyField("loanAmount", "Loan Amount (if financed)", { default: 0 })],
    calcResults: [currencyResult("deedTax", "Deed Tax"), currencyResult("mortgageRegistryTax", "Mortgage Registry Tax"), currencyResult("totalTransferTax", "Total Minnesota Transfer Tax", { highlight: true })],
    instructions: "Minnesota charges a Deed Tax of 0.33% of the sale price on every transfer, plus a separate Mortgage Registry Tax of 0.23% on the loan amount if the purchase is financed. Enter the sale price and loan amount (leave the loan amount at $0 for cash purchases).",
    examples: "Example: a $300,000 home financed with a $250,000 loan. Deed Tax: $990. Mortgage Registry Tax: $575. Total: $1,565.",
    assumptions: "This calculator uses Minnesota's published 0.33% Deed Tax and 0.23% Mortgage Registry Tax rates (Hennepin/Ramsey counties use a very slightly higher Deed Tax rate, not modeled here).\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Do I owe Mortgage Registry Tax on a cash purchase?", answer: "No — it only applies to the financed amount; leave the loan amount at $0 for an all-cash purchase." }],
  },
  simpleTool("Nebraska", "nebraska-transfer-tax-calculator", "$3.32 per $1,000 of price (0.332%, raised effective July 2026)", "This rate increased recently (July 2026), so double-check it's still current.", "This reflects a rate increase effective July 18, 2026 — a very recent change.", "Example: a $300,000 home. Documentary Stamp Tax: $300,000 x 0.332% = $996."),
  simpleTool("Nevada", "nevada-transfer-tax-calculator", "$1.95 per $500 of price (0.39%)", "Some Nevada counties add a bit more on top of this state rate.", "", "Example: a $300,000 home. Transfer tax: $300,000 x 0.39% = $1,170."),
  {
    slug: "new-hampshire-transfer-tax-calculator",
    title: "New Hampshire Transfer Tax Calculator",
    description: "Estimate New Hampshire's transfer tax — $0.75 per $100 of price (0.75%), charged to BOTH buyer and seller separately.",
    metaTitle: "New Hampshire Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free New Hampshire transfer tax calculator. 0.75% charged to the buyer AND 0.75% charged to the seller.",
    calcInputs: [priceField()],
    calcResults: [currencyResult("buyerShare", "Buyer's Tax"), currencyResult("sellerShare", "Seller's Tax"), currencyResult("totalTransferTax", "Combined Transaction Total", { highlight: true })],
    instructions: "New Hampshire is unusual: its 0.75% transfer tax rate is charged separately to BOTH the buyer and the seller — it isn't a single amount split between them, but two full 0.75% charges. Enter the sale price to see each party's individual liability and the combined transaction total.",
    examples: "Example: a $300,000 home. Buyer owes $2,250; seller owes $2,250; combined transaction cost: $4,500.",
    assumptions: "This calculator uses New Hampshire's published 0.75% rate charged individually to each party.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is 0.75% the total, or does each party pay that much?", answer: "Each party pays 0.75% individually — it's not a combined 0.75% split between them, making the effective total transaction cost 1.5%." }],
  },
  {
    slug: "new-jersey-transfer-tax-calculator",
    title: "New Jersey Transfer Tax Calculator",
    description: "Estimate New Jersey's graduated Realty Transfer Fee plus its tiered Mansion Tax (1%-3.5%, seller-paid) on sales above $1 million.",
    metaTitle: "New Jersey Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free New Jersey transfer tax calculator. Realty Transfer Fee plus the seller-paid Mansion Tax on sales over $1M.",
    calcInputs: [priceField({ max: 10_000_000 })],
    calcResults: [currencyResult("realtyTransferFee", "Realty Transfer Fee (estimated)"), currencyResult("mansionTax", "Mansion Tax (seller-paid, if applicable)"), currencyResult("totalTransferTax", "Total New Jersey Transfer Tax", { highlight: true })],
    instructions: "New Jersey charges a graduated Realty Transfer Fee on every sale, and — since July 2025 — a separate, seller-paid Mansion Tax on sales above $1 million, tiered from 1% (at $1M-$2M) up to 3.5% (above $3.5M) based on the full sale price. Enter the sale price to see both.",
    examples: "Example: a $1,500,000 sale. Mansion Tax (1% tier): $15,000, paid by the seller — plus the Realty Transfer Fee on top.",
    assumptions: "This calculator approximates New Jersey's graduated Realty Transfer Fee schedule (the audit behind this tool confirmed its general range but not every published bracket boundary) and applies the Mansion Tax using its 2025-reformed seller-paid tiered structure.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Who pays New Jersey's Mansion Tax — buyer or seller?", answer: "Since July 2025, the SELLER pays it — this was changed from the buyer in a recent reform." }],
  },
  {
    slug: "new-york-transfer-tax-calculator",
    title: "New York Transfer Tax Calculator",
    description: "Estimate New York's state Real Estate Transfer Tax (0.4%) plus its 1% \"mansion tax\" on sales of $1 million or more.",
    metaTitle: "New York Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free New York transfer tax calculator. State RETT 0.4% plus a 1% mansion tax on sales of $1M+.",
    calcInputs: [priceField({ max: 10_000_000 })],
    calcResults: [currencyResult("stateRett", "State Real Estate Transfer Tax"), currencyResult("mansionTax", "Mansion Tax (if $1M+)"), currencyResult("totalTransferTax", "Total New York Transfer Tax", { highlight: true })],
    instructions: "New York charges a base state Real Estate Transfer Tax of $2 per $500 (0.4%) on every sale, plus an additional 1% \"mansion tax\" on the FULL sale price for any transaction at $1 million or above (New York City adds its own further supplemental rates for very high-value sales, not modeled here). Enter the sale price to see both.",
    examples: "Example: a $1,200,000 sale. State RETT: $4,800. Mansion tax: $12,000 (1% of the full price, since it's over $1M). Total: $16,800.",
    assumptions: "This calculator covers New York's statewide RETT and mansion tax; New York City's additional supplemental mansion tax rates for very high-value sales (above $2 million) aren't modeled here.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is the mansion tax only on the amount above $1 million?", answer: "No — it applies to the ENTIRE sale price once the price reaches $1 million, not just the excess." }],
  },
  simpleTool("North Carolina", "north-carolina-transfer-tax-calculator", "$1.00 per $500 of price (0.2%)", "Some coastal counties add their own additional local land transfer tax, not included here.", "", "Example: a $300,000 home. Excise stamp tax: $300,000 x 0.2% = $600."),
  simpleTool("Oklahoma", "oklahoma-transfer-tax-calculator", "$0.75 per $500 of price (0.15%)", "", "", "Example: a $300,000 home. Documentary stamp tax: $300,000 x 0.15% = $450."),
  {
    slug: "pennsylvania-transfer-tax-calculator",
    title: "Pennsylvania Transfer Tax Calculator",
    description: "Estimate Pennsylvania's combined transfer tax — a 1% state Realty Transfer Tax plus a typical 1% local portion (more in Philadelphia).",
    metaTitle: "Pennsylvania Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Pennsylvania transfer tax calculator. State 1% plus a typical local 1% (Philadelphia is higher).",
    calcInputs: [priceField()],
    calcResults: [currencyResult("stateTax", "State Realty Transfer Tax"), currencyResult("localTax", "Local Realty Transfer Tax (typical)"), currencyResult("totalTransferTax", "Total Pennsylvania Transfer Tax", { highlight: true })],
    instructions: "Pennsylvania charges a 1% state Realty Transfer Tax, plus a local transfer tax that's typically also around 1% (Philadelphia charges more). Enter the sale price to see the state portion, a typical local estimate, and the combined total.",
    examples: "Example: a $300,000 home outside Philadelphia. State tax: $3,000. Typical local tax: $3,000. Total: $6,000.",
    assumptions: "This calculator uses a TYPICAL 1% local rate as an estimate — your actual local rate varies by municipality and school district, and Philadelphia's combined rate is notably higher (around 4% total).\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is Philadelphia's transfer tax higher?", answer: "Yes — Philadelphia's combined state + local rate runs around 4%, well above the typical 2% this calculator estimates for most of the state." }],
  },
  {
    slug: "rhode-island-transfer-tax-calculator",
    title: "Rhode Island Transfer Tax Calculator",
    description: "Estimate Rhode Island's conveyance tax — $3.75 per $500 (0.75%), plus an extra surcharge on the value above $800,000.",
    metaTitle: "Rhode Island Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Rhode Island conveyance tax calculator. 0.75% base, plus an extra surcharge above $800,000.",
    calcInputs: [priceField()],
    calcResults: [currencyResult("baseTax", "Base Conveyance Tax"), currencyResult("surcharge", "Surcharge (value above $800,000)"), currencyResult("totalTransferTax", "Total Rhode Island Transfer Tax", { highlight: true })],
    instructions: "Rhode Island's conveyance tax is $3.75 per $500 (0.75%) on the full sale price, with an ADDITIONAL surcharge of $7.50 per $500 (1.5%) on the portion of the price above $800,000 — a rate that just increased significantly, effective July 1, 2026. Enter the sale price to see both parts.",
    examples: "Example: a $1,000,000 sale. Base tax: $7,500. Surcharge on the $200,000 above $800,000: $3,000. Total: $10,500.",
    assumptions: "This calculator uses Rhode Island's current (post-July-2026) conveyance tax rate, which rose from a lower prior rate — a very recent change worth double-checking.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Did this rate just change?", answer: "Yes — it rose from $2.30 per $500 to $3.75 per $500, effective July 1, 2026." }],
  },
  {
    slug: "south-carolina-transfer-tax-calculator",
    title: "South Carolina Transfer Tax Calculator",
    description: "Estimate South Carolina's deed recording fee — $1.85 per $500 of price (0.37%), of which $1.30 (0.26%) is the state's portion.",
    metaTitle: "South Carolina Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free South Carolina deed recording fee calculator. 0.37% total, with a 0.26% state portion.",
    calcInputs: [priceField()],
    calcResults: [currencyResult("statePortion", "State Portion"), currencyResult("totalTransferTax", "Total South Carolina Deed Recording Fee", { highlight: true })],
    instructions: "South Carolina's deed recording fee totals $1.85 per $500 of sale price (0.37%), of which $1.30 per $500 (0.26%) goes to the state. Enter the sale price to see the state portion and the full combined fee.",
    examples: "Example: a $300,000 home. State portion: $780. Total recording fee: $1,110.",
    assumptions: "This calculator uses South Carolina's published $1.85/$500 total rate and $1.30/$500 state portion.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is this called a transfer tax in South Carolina?", answer: "It's officially a deed recording fee, but functions the same way as a real estate transfer tax in other states." }],
  },
  {
    slug: "vermont-transfer-tax-calculator",
    title: "Vermont Transfer Tax Calculator",
    description: "Estimate Vermont's Property Transfer Tax, which varies by whether the property is your principal residence.",
    metaTitle: "Vermont Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Vermont transfer tax calculator. Principal residence: 0.5% up to $200K then 1.47%. Non-principal residential: flat 3.62%.",
    calcInputs: [priceField(), dropdownField("propertyType", "Property Type", [{ label: "Principal residence", value: 0 }, { label: "Non-principal residential (second home/investment)", value: 1 }])],
    calcResults: [currencyResult("totalTransferTax", "Vermont Property Transfer Tax", { highlight: true })],
    instructions: "Vermont's Property Transfer Tax depends heavily on how the property will be used. For a principal residence, the first $200,000 is taxed at 0.5%, with 1.47% on the amount above that. Non-principal residential property (a second home or investment) is taxed at a flat 3.62% on the full price — significantly more. Select your property type and enter the sale price.",
    examples: "Example: a $300,000 principal residence. Tax: ($200,000 x 0.5%) + ($100,000 x 1.47%) = $2,470. The same home as a second home: $300,000 x 3.62% = $10,860.",
    assumptions: "This calculator uses Vermont's published rate structure for principal residences and non-principal residential property.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is the tax so much higher for a second home?", answer: "Vermont deliberately taxes non-principal residential property at a much higher flat rate (3.62%) than a primary residence, which gets the lower tiered rate." }],
  },
  simpleTool("Virginia", "virginia-transfer-tax-calculator", "an estimated $0.25 per $100 of price (0.25%) state recordation tax", "This state recordation tax rate wasn't independently reconfirmed against a current, live source — verify with the Virginia Department of Taxation, especially local recordation tax add-ons which vary by locality and aren't included here.", "This rate is presented with lower confidence than most of this batch's other tools — please verify before relying on it.", "Example: a $300,000 home. Estimated state recordation tax: $300,000 x 0.25% = $750 — plus any local recordation tax."),
  {
    slug: "washington-transfer-tax-calculator",
    title: "Washington Transfer Tax Calculator",
    description: "Estimate Washington's graduated state Real Estate Excise Tax (REET) — four tiers from 1.1% up to 3.0%, based on sale price.",
    metaTitle: "Washington Transfer Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Washington REET calculator. Graduated 1.1%/1.28%/2.75%/3.0% tiers based on sale price.",
    calcInputs: [priceField({ max: 10_000_000 })],
    calcResults: [currencyResult("totalTransferTax", "Washington State REET", { highlight: true })],
    instructions: "Washington's Real Estate Excise Tax (REET) is genuinely graduated across four price tiers: 1.1% on the portion up to $525,000, 1.28% from there to $1,525,000, 2.75% from there to $3,025,000, and 3.0% above that — plus a local REET portion added on top, which isn't included here. Enter the sale price to see the state portion.",
    examples: "Example: a $4,000,000 sale. State REET: ($525,000 x 1.1%) + ($1,000,000 x 1.28%) + ($1,500,000 x 2.75%) + ($975,000 x 3.0%) = roughly $89,000.",
    assumptions: "This calculator covers only Washington's STATE REET tiers (which re-index roughly every March) — a separate local REET portion is added on top by the county/city and isn't included here.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is this a true marginal bracket system?", answer: "Yes — each tier's rate applies only to the portion of the price within that tier, similar to how income tax brackets work, not to the whole price at once." }],
  },
];

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: "Tax & Paycheck Calculators" },
    create: { name: "Tax & Paycheck Calculators", slug: CATEGORY_SLUG, templateKey: "category-template-1", viewStyle: "grid" },
  });

  for (const t of TOOLS) {
    const toolContent = {
      title: t.title,
      description: t.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(t.calcInputs),
      calcResult: JSON.stringify({ label: t.title, unit: "", format: "currency" }),
      calcResults: JSON.stringify(t.calcResults),
      instructions: paragraphsToHtml(t.instructions),
      examples: paragraphsToHtml(t.examples),
      assumptions: paragraphsToHtml(t.assumptions),
      faq: JSON.stringify(t.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = { contentType: "tool", metaTitle: t.metaTitle, metaDescription: t.metaDescription, schemaType: "SoftwareApplication" };

    const existing = await prisma.tool.findUnique({ where: { slug: t.slug } });
    if (existing) {
      await prisma.tool.update({ where: { slug: t.slug }, data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } } });
      console.log(`Updated "${t.slug}".`);
    } else {
      await prisma.tool.create({ data: { slug: t.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } } });
      console.log(`Created "${t.slug}" (status: draft).`);
    }
  }

  console.log(`\nDone — ${TOOLS.length} tools created/updated, all status "draft". Review in /admin/tools.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
