// One-time (but safe to re-run) batch setup script: creates 54 state and city closing cost
// tools plus a USDA closing cost tool from the user's real estate list
// (Real Estate Calculators > Closing Cost Calculators). The math and each place's tax rules
// live in src/lib/calc-engine-re-closing.ts; every example below is computed from that
// engine, so the copy always matches what the calculator shows.
//
// HOW TO RUN (after prisma/restructure-real-estate-main-category.ts --apply)
//   npx tsx prisma/create-re-closing-calculators.ts
// or
//   npm run db:create-re-closing-calculators

import { CLOSING_LOCATIONS, closingCostFor, usdaClosingCosts } from "../src/lib/calc-engine-re-closing";
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

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return { key, label, type: "number", unit: opts.unit, required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
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
  category: string;
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

const YN = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);

const CAT = "closing-cost-calculators";

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** [slug, title, typical price for the example, the place's own rules]. */
const PLACES: [string, string, number, string][] = [
  ["florida-closing-cost-calculator", "Florida Closing Cost Calculator", 400000, "Florida's documentary stamp tax on the deed is 0.70%, paid by the seller. Buyers pay 0.35% doc stamps on the mortgage note and a 0.2% intangible tax on the loan. Title insurance rates are set by the state, and in most counties the seller buys the owner's policy."],
  ["miami-closing-cost-calculator", "Miami Closing Cost Calculator", 600000, "Miami-Dade's deed doc stamps are 0.60% for single-family homes (plus a 0.45% surtax on other property types), paid by the seller. Buyers pay 0.35% note stamps and the 0.2% intangible tax, and — unlike most of Florida — the buyer usually pays for the owner's title policy in Miami-Dade."],
  ["texas-closing-cost-calculator", "Texas Closing Cost Calculator", 340000, "Texas has no transfer tax and no mortgage tax. Title insurance premiums are set by the Texas Department of Insurance, and the seller customarily pays for the owner's policy. Escrow fees are usually split."],
  ["houston-closing-cost-calculator", "Houston Closing Cost Calculator", 330000, "Like the rest of Texas, Houston has no transfer or mortgage tax, the seller usually buys the owner's title policy at the state-set rate, and the escrow fee is split. Harris County's combined property tax rate (about 2.1%) makes the escrow deposit for taxes larger than in most states."],
  ["san-antonio-closing-cost-calculator", "San Antonio Closing Cost Calculator", 300000, "San Antonio has no transfer or mortgage tax; the seller usually pays the state-set owner's title premium and the escrow fee is split. Bexar County's combined property tax rate (about 2.2%) drives a large tax escrow at closing."],
  ["nyc-closing-cost-calculator", "NYC Closing Cost Calculator", 900000, "Sellers pay the NYC Real Property Transfer Tax (1% up to $500,000, 1.425% above) plus New York State's 0.4% transfer tax (0.65% from $3 million). Buyers pay the mansion tax from $1 million (1% rising to 3.9%) and the mortgage recording tax — 1.8% of loans under $500,000 and 1.925% above. Both sides usually hire attorneys. Co-op purchases have no mortgage recording tax but add flip taxes and fees."],
  ["ny-closing-cost-calculator", "NY Closing Cost Calculator", 350000, "New York State's transfer tax is 0.4%, paid by the seller, and buyers pay a 1% mansion tax on homes of $1 million or more. Buyers also pay the mortgage recording tax (about 0.75% of the loan for 1–2 family homes in most upstate counties; more in the MTA region). Attorneys handle closings on both sides."],
  ["long-island-closing-costs-calculator", "Long Island Closing Costs Calculator", 700000, "On Long Island (Nassau and Suffolk), sellers pay New York's 0.4% transfer tax, buyers pay the 1% mansion tax from $1 million, and borrowers pay a mortgage recording tax of about 0.8% (1.05% total, with the lender paying 0.25% on 1–2 family homes). East End towns add a 2% Peconic Bay tax for buyers over set exemptions — add it separately. Both sides use attorneys."],
  ["nj-closing-cost-calculator", "NJ Closing Cost Calculator", 500000, "New Jersey's realty transfer fee is paid by the seller on graduated brackets (0.4% up to $150,000 rising to about 1.3% at the top). Since July 2025 the seller also pays the graduated mansion tax on sales of $1 million or more (1% to 3.5%). Buyers usually pay for title insurance and both sides hire attorneys."],
  ["pa-closing-cost-calculator", "PA Closing Cost Calculator", 300000, "Pennsylvania's realty transfer tax is 1% to the state plus usually 1% to the local municipality and school district — 2% in total, customarily split between buyer and seller. Title insurance rates are filed with the state and the buyer pays for the owner's policy."],
  ["philadelphia-closing-cost-calculator", "Philadelphia Closing Cost Calculator", 300000, "Philadelphia charges a 3.578% city realty transfer tax on top of Pennsylvania's 1% — 4.578% in total, one of the highest in the US — normally split 50/50 between buyer and seller. The buyer pays for the owner's title policy."],
  ["pittsburgh-closing-cost-calculator", "Pittsburgh Closing Cost Calculator", 250000, "Pittsburgh's realty transfer tax is 5% in total — 1% state, 3% city and 1% Pittsburgh Public Schools — customarily split between buyer and seller. Suburbs in Allegheny County are usually 2%. The buyer pays for the owner's title policy."],
  ["georgia-closing-cost-calculator", "Georgia Closing Cost Calculator", 350000, "Georgia's transfer tax is $1 per $1,000 (0.1%), paid by the seller. Buyers pay the intangible recording tax of $3 per $1,000 of the loan (0.3%). Georgia is an attorney-closing state, and the buyer usually pays for the owner's title policy."],
  ["atlanta-closing-cost-calculator", "Atlanta Closing Cost Calculator", 425000, "Atlanta follows Georgia's rules: a 0.1% transfer tax paid by the seller, a 0.3% intangible tax on the buyer's loan and a closing attorney. Fulton and DeKalb property taxes (about 1% or more of value) add to the escrow deposit."],
  ["maryland-closing-cost-calculator", "Maryland Closing Cost Calculator", 400000, "Maryland charges a 0.5% state transfer tax plus county transfer and recordation taxes — together often 1.5–2% of the price — usually split between buyer and seller. First-time buyers pay no state transfer tax (the seller pays a reduced 0.25%) and get a recordation tax break in some counties. The total used here is 1.7%."],
  ["michigan-closing-cost-calculator", "Michigan Closing Cost Calculator", 260000, "Michigan's state transfer tax is $3.75 per $500 (0.75%) and the county tax $0.55 per $500 (0.11%), both paid by the seller. The seller also buys the owner's title policy. New buyers lose the previous owner's capped taxable value, so taxes often rise after a sale."],
  ["indiana-closing-cost-calculator", "Indiana Closing Cost Calculator", 260000, "Indiana has no real estate transfer tax or mortgage tax — only small recording and sales disclosure fees. The seller customarily pays for the owner's title policy."],
  ["north-carolina-closing-cost-calculator", "North Carolina Closing Cost Calculator", 350000, "North Carolina's excise tax (revenue stamps) is $1 per $500 (0.2%), paid by the seller. It's an attorney-closing state; the buyer's attorney handles the closing and the buyer pays for title insurance, which costs less here than in most states."],
  ["tn-closing-cost-calculator", "TN Closing Cost Calculator", 350000, "Tennessee's transfer tax is $0.37 per $100 (0.37%) and is customarily paid by the buyer, along with a mortgage tax of $0.115 per $100 on loans over $2,000. The buyer usually pays for the owner's title policy."],
  ["ohio-buyer-closing-costs-calculator", "Ohio Buyer Closing Costs Calculator", 230000, "Ohio counties charge a conveyance fee of 0.1% to 0.4% of the price (0.4% in many large counties), paid by the seller. Buyers pay lender fees, the lender's title policy and, in many areas, half of the owner's title policy. There's no state mortgage tax."],
  ["arkansas-closing-cost-calculator", "Arkansas Closing Cost Calculator", 220000, "Arkansas's real property transfer tax is $3.30 per $1,000 (0.33%); state law makes buyer and seller equally liable, so it's commonly split. The seller usually pays for the owner's title policy. Insurance runs high because of storm risk."],
  ["california-closing-cost-calculator", "California Closing Cost Calculator", 750000, "California counties charge a documentary transfer tax of $1.10 per $1,000 (0.11%), usually paid by the seller; some cities add their own. In Southern California the seller usually buys the owner's title policy, in Northern California the buyer. Escrow fees are typically split."],
  ["los-angeles-closing-cost-calculator", "Los Angeles Closing Cost Calculator", 950000, "Sellers in the City of Los Angeles pay the county's 0.11% plus the city's 0.45% transfer tax, and Measure ULA adds 4% on sales of $5.3 million or more and 5.5% from $10.6 million (thresholds reset each July). The seller usually buys the owner's title policy and escrow is split."],
  ["san-francisco-closing-cost-calculator", "San Francisco Closing Cost Calculator", 1350000, "San Francisco's transfer tax applies one rate to the whole price: 0.5% up to $250,000, 0.68% to $1 million, 0.75% to $5 million, 2.25% to $10 million, 5.5% to $25 million and 6% above — customarily paid by the seller. In San Francisco the buyer usually pays for the owner's title policy."],
  ["san-diego-closing-cost-calculator", "San Diego Closing Cost Calculator", 900000, "San Diego County's documentary transfer tax is 0.11%, usually paid by the seller, and the City of San Diego adds no city tax. The seller usually buys the owner's title policy and escrow fees are split."],
  ["mn-closing-cost-calculator", "MN Closing Cost Calculator", 330000, "Minnesota's deed tax is 0.33% of the price, paid by the seller, and the buyer pays a 0.24% mortgage registry tax on the loan. Buyers usually pay for the owner's title policy."],
  ["oklahoma-closing-cost-calculator", "Oklahoma Closing Cost Calculator", 220000, "Oklahoma's documentary stamp tax is $0.75 per $500 (0.15%), paid by the seller. Title work usually runs through an abstract company, with the buyer paying for the owner's policy. Home insurance is among the highest in the US because of hail and tornadoes."],
  ["wisconsin-closing-costs-calculator", "Wisconsin Closing Costs Calculator", 300000, "Wisconsin's real estate transfer fee is $3 per $1,000 (0.3%), paid by the seller, and the seller also buys the owner's title policy. There's no mortgage tax."],
  ["virginia-closing-costs-calculator", "Virginia Closing Costs Calculator", 400000, "In Virginia the seller pays the grantor's tax (0.1%), and the buyer pays the recordation tax — about $0.25 per $100 to the state plus a third of that locally (about 0.33% in total). Northern Virginia and Hampton Roads add a congestion-relief grantor fee not included here. The buyer pays for title insurance."],
  ["south-carolina-closing-costs-calculator", "South Carolina Closing Costs Calculator", 320000, "South Carolina's deed recording fee is $3.70 per $500 (0.37%) — state plus county — paid by the seller. It's an attorney-closing state, and the buyer pays for the closing attorney and title insurance."],
  ["arizona-closing-cost-calculator", "Arizona Closing Cost Calculator", 430000, "Arizona has no transfer tax — only a $2 affidavit fee — and no mortgage tax. The seller customarily buys the owner's title policy and escrow fees are split."],
  ["oregon-closing-cost-calculator", "Oregon Closing Cost Calculator", 480000, "Oregon's constitution bars new transfer taxes, so there's none statewide (Washington County keeps a 0.1% tax). The seller customarily pays for the owner's title policy and escrow is split."],
  ["alabama-closing-cost-calculator", "Alabama Closing Cost Calculator", 250000, "Alabama's deed tax is $1 per $1,000 (0.1%) and the mortgage tax $1.50 per $1,000 (0.15%) — both customarily paid by the buyer. Property taxes are among the lowest in the US."],
  ["colorado-closing-cost-calculator", "Colorado Closing Cost Calculator", 550000, "Colorado's documentary fee is only $0.01 per $100 (0.01%), paid by the buyer, though some mountain towns (such as Aspen, Telluride and Breckenridge) add their own transfer taxes. The seller customarily pays for the owner's title policy."],
  ["delaware-closing-cost-calculator", "Delaware Closing Cost Calculator", 380000, "Delaware's realty transfer tax is 4% — 2.5% state and 1.5% local in most areas — customarily split 50/50. First-time buyers get a state break on their half. It's an attorney-closing state."],
  ["illinois-closing-cost-calculator", "Illinois Closing Cost Calculator", 280000, "Illinois charges $1 per $1,000 in state transfer tax and $0.50 per $1,000 in county tax (0.15% in total), paid by the seller, and some cities add their own. Both sides usually hire real estate attorneys, and the seller pays for the owner's title policy."],
  ["chicago-closing-cost-calculator", "Chicago Closing Cost Calculator", 350000, "In Chicago the buyer pays the city's transfer tax of $3.75 per $500 (0.75%) and the seller pays the city's CTA portion of $1.50 per $500 (0.3%) plus the 0.15% state and Cook County tax. Both sides use attorneys, and the seller buys the owner's title policy."],
  ["louisiana-closing-cost-calculator", "Louisiana Closing Cost Calculator", 230000, "Louisiana has no state transfer tax (New Orleans charges a small flat fee). Closings are handled by a notary or attorney, and the buyer usually pays for the owner's title policy. Insurance is very high because of hurricane risk."],
  ["massachusetts-closing-cost-calculator", "Massachusetts Closing Cost Calculator", 600000, "Massachusetts's deed excise tax is $4.56 per $1,000 (0.456%), paid by the seller ($6.12 in Barnstable County). The buyer pays the lender's attorney, who handles the closing, and buys the owner's title policy."],
  ["missouri-closing-cost-calculator", "Missouri Closing Cost Calculator", 250000, "Missouri's constitution bans real estate transfer taxes, so there's none, and there's no mortgage tax. The seller customarily pays for the owner's title policy."],
  ["utah-closing-cost-calculator", "Utah Closing Cost Calculator", 520000, "Utah has no transfer tax and no mortgage tax. The seller customarily buys the owner's title policy and escrow fees are split."],
  ["iowa-closing-cost-calculator", "Iowa Closing Cost Calculator", 220000, "Iowa's transfer tax is $0.80 per $500 above the first $500 (0.16%), paid by the seller. Iowa doesn't allow private title insurance; buyers get a low-cost state Iowa Title Guaranty certificate instead, and the seller pays to update the abstract."],
  ["ky-closing-cost-calculator", "KY Closing Cost Calculator", 250000, "Kentucky's real estate transfer tax is $0.50 per $500 (0.1%), paid by the seller. The buyer usually pays for the owner's title policy."],
  ["nevada-closing-cost-calculator", "Nevada Closing Cost Calculator", 450000, "Nevada's real property transfer tax is $1.95 per $500 (0.39%) in most counties — $2.55 in Clark County and $2.07 in Washoe — customarily paid by the seller. The seller also buys the owner's title policy and escrow is split."],
  ["las-vegas-closing-cost-calculator", "Las Vegas Closing Cost Calculator", 450000, "In Las Vegas (Clark County) the transfer tax is $2.55 per $500 (0.51%), customarily paid by the seller. The seller also buys the owner's title policy and escrow fees are split. Nevada has no mortgage tax."],
  ["nebraska-closing-cost-calculator", "Nebraska Closing Cost Calculator", 260000, "Nebraska's documentary stamp tax is $2.25 per $1,000 (0.225%), paid by the seller, and owner's title insurance is often split. Home insurance is high because of hail."],
  ["connecticut-closing-cost-calculator", "Connecticut Closing Cost Calculator", 400000, "Connecticut's state conveyance tax is 0.75% on the first $800,000, 1.25% up to $2.5 million and 2.25% above, plus a local tax of 0.25% in most towns — all paid by the seller. It's an attorney-closing state and the buyer pays for title insurance."],
  ["idaho-closing-costs-calculator", "Idaho Closing Costs Calculator", 460000, "Idaho has no transfer tax and no mortgage tax. The seller customarily buys the owner's title policy and escrow fees are split."],
  ["kansas-closing-cost-calculator", "Kansas Closing Cost Calculator", 240000, "Kansas has no transfer tax and ended its mortgage registration tax in 2019. Owner's title insurance is commonly split, and home insurance is high because of storms."],
  ["maine-closing-costs-calculator", "Maine Closing Costs Calculator", 380000, "Maine's real estate transfer tax is $2.20 per $500 for each side — 0.44% in total, split equally between buyer and seller. The buyer usually pays for the owner's title policy."],
  ["mississippi-closing-cost-calculator", "Mississippi Closing Cost Calculator", 200000, "Mississippi has no transfer tax and no mortgage tax. Closings are usually handled by an attorney, and the buyer pays for the owner's title policy."],
  ["new-hampshire-closing-cost-calculator", "New Hampshire Closing Cost Calculator", 450000, "New Hampshire's real estate transfer tax is $0.75 per $100 from each side — 1.5% in total, split equally. The buyer usually pays for the owner's title policy. New Hampshire has no income or sales tax but high property taxes."],
  ["new-mexico-closing-cost-calculator", "New Mexico Closing Cost Calculator", 300000, "New Mexico has no transfer tax and no mortgage tax. Title insurance rates are set by the state and the seller usually pays for the owner's policy."],
  ["rhode-island-closing-cost-calculator", "Rhode Island Closing Cost Calculator", 450000, "Rhode Island's real estate conveyance tax is $2.30 per $500 (0.46%), doubling to 0.92% on the part of a residential sale above $800,000, paid by the seller. It's an attorney-closing state and the buyer pays for title insurance."],
];

const CLOSING_RESULTS = [
  { key: "buyerClosingCosts", label: "Buyer Closing Costs", format: "currency", highlight: true },
  { key: "buyerCashWithPrepaids", label: "Buyer Costs Including Prepaids & Escrow", format: "currency" },
  { key: "buyerClosingPercent", label: "Buyer Closing Costs as % of Price", format: "percentage" },
  { key: "transferAndMortgageTaxesBuyer", label: "Transfer & Mortgage Taxes (Buyer)", format: "currency" },
  { key: "sellerClosingCosts", label: "Seller Closing Costs (incl. Commission)", format: "currency" },
  { key: "transferTaxesSeller", label: "Transfer Taxes (Seller)", format: "currency" },
  { key: "sellerClosingPercent", label: "Seller Costs as % of Price", format: "percentage" },
  { key: "prepaidsAndEscrow", label: "Prepaids & Escrow (Buyer)", format: "currency" },
];

function placeTool([slug, title, price, rules]: [string, string, number, string]): ToolDef {
  const loc = CLOSING_LOCATIONS[slug];
  if (!loc) throw new Error(`No closing data for ${slug}`);
  const place = loc.name;
  const ex = closingCostFor(loc)({
    homePrice: price, downPaymentPercent: 20, interestRate: 6.5, originationPercent: 0.5, otherLenderFees: 1800,
    commissionPercent: 5.5, propertyTaxRate: loc.taxRate, annualInsurance: loc.insurance, escrowMonths: 3,
  }) as Record<string, number>;
  return {
    slug,
    title,
    category: CAT,
    description: `Estimate closing costs in ${place} for buyers and sellers — ${place}'s transfer and mortgage taxes, title insurance, lender and settlement fees, prepaids and the seller's commission.`,
    metaTitle: `${title} — Buyer & Seller Costs`.slice(0, 70),
    metaDescription: `Free ${place} closing cost calculator. Estimate buyer and seller closing costs with ${place} transfer taxes, title insurance, lender fees and prepaids.`,
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: price, max: 50000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment (100% = Cash Purchase)", { default: 20, max: 100, step: 0.5 }),
      percentField("interestRate", "Mortgage Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      percentField("originationPercent", "Lender Origination / Points", { default: 0.5, max: 5, step: 0.125, required: false }),
      currencyField("otherLenderFees", "Appraisal, Credit, Underwriting & Other Lender Fees", { default: 1800, max: 20000, step: 50, required: false }),
      percentField("commissionPercent", "Seller-Paid Agent Commission", { default: 5.5, max: 10, step: 0.25, required: false }),
      percentField("propertyTaxRate", `${place} Property Tax Rate (for Escrow)`, { default: loc.taxRate, max: 5, step: 0.01, required: false }),
      currencyField("annualInsurance", "Homeowners Insurance per Year", { default: loc.insurance, max: 50000, step: 50, required: false }),
      numberField("escrowMonths", "Escrow Reserve Months", { default: 3, max: 12, required: false }),
    ],
    calcResult: { label: "Buyer Closing Costs", format: "currency" },
    calcResults: CLOSING_RESULTS,
    instructions: `Enter the price, your down payment and rate, and the lender's fees from your Loan Estimate. ${place}'s transfer and mortgage taxes and who customarily pays them are built in; adjust the commission, tax rate and insurance to match your deal. For a cash purchase, set the down payment to 100%.`,
    examples: `Example: on a ${round(price)} home in ${place} with 20% down, the buyer's closing costs come to about ${money(ex.buyerClosingCosts)} (${ex.buyerClosingPercent}% of the price), or ${money(ex.buyerCashWithPrepaids)} with prepaids and escrow. The seller pays about ${money(ex.sellerClosingCosts)} including a 5.5% commission and ${money(ex.transferTaxesSeller)} of transfer tax.`,
    assumptions: `${rules}\n\nTitle premiums, attorney or escrow fees and recording charges are typical estimates; your Loan Estimate and Closing Disclosure show the real numbers. Who pays what is a custom, not a law, in most places and can be negotiated in the contract. Commission is negotiable and buyer-agent pay may be split differently since the 2024 NAR settlement.`,
    faq: [
      { question: `How much are closing costs in ${place}?`, answer: `Buyers typically pay about ${Math.round(ex.buyerClosingPercent * 10) / 10}% of the price before prepaids in this example; sellers usually pay 6–10% including commission, depending on ${place}'s transfer taxes.` },
      { question: `Who pays transfer tax in ${place}?`, answer: rules.split(". ").slice(0, 2).join(". ").replace(/\.?$/, ".") },
      { question: "Can closing costs be negotiated?", answer: "Yes — shop lenders and title companies, ask for seller credits, and compare Loan Estimates line by line." },
    ],
  };
}

const TOOLS: ToolDef[] = [
  ...PLACES.map(placeTool),
  (() => {
    const ex = usdaClosingCosts({ homePrice: 250000, appraisedValue: 258000, closingCostPercent: 3, prepaids: 2500, sellerCredit: 3000, financeClosingCosts: 1, downPayment: 0 }) as Record<string, number>;
    return {
      slug: "usda-closing-costs-calculator",
      title: "USDA Closing Costs Calculator",
      category: CAT,
      description: "Estimate closing costs on a USDA loan — the 1% upfront guarantee fee, closing costs and prepaids, seller credits up to 6%, and how much you can roll into the loan when the home appraises above the price.",
      metaTitle: "USDA Closing Costs Calculator — Guarantee Fee & Cash Needed",
      metaDescription: "Free USDA closing costs calculator. See the 1% guarantee fee, closing costs you can finance, seller credits and the cash you need at closing.",
      calcInputs: [
        currencyField("homePrice", "Home Price", { default: 250000, max: 2000000, step: 1000 }),
        currencyField("appraisedValue", "Appraised Value", { default: 258000, max: 2000000, step: 1000 }),
        percentField("closingCostPercent", "Closing Costs (% of Price)", { default: 3, max: 8, step: 0.1 }),
        currencyField("prepaids", "Prepaids & Escrow", { default: 2500, max: 50000, step: 50 }),
        currencyField("sellerCredit", "Seller Credit (Up to 6%)", { default: 3000, max: 120000, step: 100, required: false }),
        YN("financeClosingCosts", "Finance Closing Costs Up to the Appraised Value", 1),
        currencyField("downPayment", "Optional Down Payment", { default: 0, max: 500000, step: 500, required: false }),
      ],
      calcResult: { label: "Cash to Close", format: "currency" },
      calcResults: [
        { key: "cashToClose", label: "Cash Needed at Closing", format: "currency", highlight: true },
        { key: "totalClosingCosts", label: "Closing Costs + Prepaids", format: "currency" },
        { key: "upfrontGuaranteeFee", label: "Upfront Guarantee Fee (1%, Financed)", format: "currency" },
        { key: "closingCostsFinanced", label: "Closing Costs Rolled into the Loan", format: "currency" },
        { key: "sellerCreditApplied", label: "Seller Credit Applied", format: "currency" },
        { key: "totalLoanAmount", label: "Total Loan Amount", format: "currency" },
        { key: "monthlyAnnualFee", label: "Monthly Annual Fee (0.35%)", format: "currency" },
      ],
      instructions: "Enter the price, the appraised value, your estimated closing costs and prepaids, and any seller credit. USDA lets you borrow up to the appraised value, so if the home appraises above the price you can roll closing costs into the loan.",
      examples: `Example: a $250,000 home that appraises at $258,000 has ${money(ex.totalClosingCosts)} of closing costs and prepaids. A $3,000 seller credit and ${money(ex.closingCostsFinanced)} financed into the gap leave ${money(ex.cashToClose)} to bring. The 1% guarantee fee (${money(ex.upfrontGuaranteeFee)}) is added to the loan, for a total of ${money(ex.totalLoanAmount)}.`,
      assumptions: "USDA Guaranteed loans charge a 1% upfront guarantee fee (usually financed) and a 0.35% annual fee paid monthly. No down payment is required; sellers can contribute up to 6% of the price toward closing costs. Financing closing costs is limited to the appraised value. Income and location limits apply.",
      faq: [
        { question: "Can you roll closing costs into a USDA loan?", answer: "Yes, up to the appraised value — if the home appraises above the price, the difference can cover closing costs." },
        { question: "How much is the USDA guarantee fee?", answer: "1% of the loan up front plus 0.35% a year, paid monthly." },
      ],
    } satisfies ToolDef;
  })(),
];

async function main() {
  const categoryIds = new Map<string, string>();
  for (const slug of new Set(TOOLS.map((t) => t.category))) {
    const c = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!c) throw new Error(`The "${slug}" category doesn't exist — run "npx tsx prisma/restructure-real-estate-main-category.ts --apply" first.`);
    categoryIds.set(slug, c.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: categoryIds.get(def.category)!,
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
