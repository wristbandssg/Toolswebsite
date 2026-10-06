// One-time (but safe to re-run) batch setup script: creates the Car Selling & Value tools
// (8) of the Car & Vehicle Cost Calculators expansion, filed under Car & Vehicle
// Cost Calculators > Car Buying & Selling Calculators (both categories are created on first run).
// See src/lib/calc-engine-car-selling.ts for the math and
// src/lib/calc-engine-car-buying.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-car-selling-calculators.ts
// or
//   npm run db:create-car-selling-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Car & Vehicle Cost Calculators", slug: "car-vehicle-cost-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Car Buying & Selling Calculators", slug: "car-buying-selling-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function currencyField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 100000000,
    step: opts.step ?? 100,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    step: opts.step ?? 0.1,
  };
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
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial, tax or legal " +
  "advice. Prices, fees, taxes and rates vary by vehicle, dealer, location and provider — check current " +
  "quotes and your state or local rules for exact figures.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "car-import-duty-calculator",
    title: "Car Import Duty Calculator",
    description: "Estimate import duty, VAT or GST and fees on a car you import, and its total landed cost including shipping.",
    metaTitle: "Car Import Duty Calculator — Landed Cost of an Import",
    metaDescription: "Free car import duty calculator. Estimate customs duty, VAT/GST, shipping and fees to find the landed cost of an imported car.",
    calcInputs: [
      currencyField("vehicleValue", "Purchase Price of the Car", { default: 30000, max: 10000000, step: 500 }),
      currencyField("shippingCost", "Shipping Cost", { default: 2000, max: 100000, step: 100 }),
      currencyField("insuranceCost", "Shipping Insurance", { default: 300, max: 100000, step: 50, required: false }),
      {
        key: "basis", label: "Duty Charged On", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Car + Shipping + Insurance (CIF — Most Countries)", value: 1 },
          { label: "Car Price Only (FOB — United States)", value: 2 },
        ],
      },
      percentField("dutyPercent", "Import Duty Rate", { default: 2.5, max: 300, step: 0.5 }),
      percentField("vatPercent", "VAT / GST on Import", { default: 0, max: 50, step: 0.5, required: false }),
      currencyField("fees", "Port, Broker & Compliance Fees", { default: 1500, max: 100000, step: 100 }),
    ],
    calcResult: { label: "Landed Cost", format: "currency" },
    calcResults: [
      { key: "customsValue", label: "Customs Value", format: "currency" },
      { key: "importDuty", label: "Import Duty", format: "currency" },
      { key: "importVat", label: "Import VAT / GST", format: "currency" },
      { key: "totalTaxesAndFees", label: "Total Duty, Taxes & Fees", format: "currency" },
      { key: "landedCost", label: "Landed Cost", format: "currency", highlight: true },
    ],
    instructions:
      "Import duty is a percentage of the car's customs value. Most countries use the CIF value (car + shipping + " +
      "insurance); the US uses the price paid. The US charges 2.5% on cars and 25% on light trucks, before any additional " +
      "tariffs that may apply by country of origin. Many countries also charge VAT or GST on the value plus duty.\n\n" +
      "Budget for port and broker fees and for modifications to meet safety and emissions rules (EPA and DOT in the US). " +
      "Check your customs agency for current rates.",
    examples:
      "Example: importing a $30,000 car to the US at 2.50% duty costs $750 in duty. With shipping and " +
      "$1,500 of fees, the landed cost is $34,550.",
    assumptions:
      "Single duty rate; extra tariffs, excise or luxury taxes and exchange rates aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I import any car into the US?",
        answer: "Cars 25 years or older are generally exempt from US safety and emissions standards; newer cars must conform or be brought into compliance.",
      },
    ],
  },
  {
    slug: "car-trade-in-value-calculator",
    title: "Car Trade-In Value Calculator",
    description: "Estimate your car's trade-in value from its book value, adjusting for mileage above or below average and condition, and see what you give up versus a private sale.",
    metaTitle: "Car Trade-In Value Calculator — Mileage & Condition",
    metaDescription: "Free car trade-in value calculator. Adjust book value for odometer mileage and condition, and compare trade-in with private sale.",
    calcInputs: [
      currencyField("baseValue", "Book Value at Average Mileage", { default: 18000, max: 1000000, step: 250 }),
      numberField("ageYears", "Car Age (Years)", { default: 5, min: 0, max: 50, step: 1 }),
      numberField("actualMiles", "Odometer Miles", { default: 70000, min: 0, max: 1000000, step: 1000 }),
      numberField("averageMilesPerYear", "Average Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      currencyField("perMile", "Value Adjustment per Mile", { default: 0.1, max: 2, step: 0.01 }),
      {
        key: "condition", label: "Condition", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Excellent", value: 1 },
          { label: "Good", value: 2 },
          { label: "Fair", value: 3 },
          { label: "Poor", value: 4 },
        ],
      },
      percentField("tradeInDiscountPercent", "Trade-In Discount vs Private Sale", { default: 15, max: 50, step: 1 }),
    ],
    calcResult: { label: "Trade-In Value", format: "currency" },
    calcResults: [
      { key: "expectedMiles", label: "Average Miles for Its Age", format: "number" },
      { key: "mileageAdjustment", label: "Mileage Adjustment", format: "currency" },
      { key: "privatePartyValue", label: "Private-Party Value", format: "currency" },
      { key: "tradeInValue", label: "Trade-In Value", format: "currency", highlight: true },
      { key: "gapVsPrivateSale", label: "Given Up vs Private Sale", format: "currency" },
    ],
    instructions:
      "Pricing guides list a value for a car at typical mileage — about 12,000–15,000 miles a year. Higher mileage lowers " +
      "the value and lower mileage raises it, often by roughly 5–25 cents a mile depending on the car. Condition matters too.\n\n" +
      "Dealers pay less on a trade-in than a private buyer would, since they must recondition and resell the car — but " +
      "trading in is quicker and, in most states, cuts the sales tax on your next car.",
    examples:
      "Example: a 5-year-old car with 70,000 miles has 60,000 average miles for its age, so the extra " +
      "mileage changes its value by -$1,000. In good condition it's worth about $17,000 privately or " +
      "$14,450 as a trade-in.",
    assumptions:
      "Straight-line mileage adjustment and a flat condition factor. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I get more for my trade-in?",
        answer: "Get written offers from several dealers and online buyers, clean the car, fix small issues, and negotiate the trade-in separately from the new car price.",
      },
    ],
  },
  {
    slug: "car-loan-payoff-vs-trade-in-calculator",
    title: "Car Loan Payoff vs Trade-In Timing Calculator",
    description: "See whether you owe more than your car is worth (negative equity), how waiting changes it, and how many months until your equity turns positive.",
    metaTitle: "Car Loan Payoff vs Trade-In Calculator — Negative Equity",
    metaDescription: "Free calculator for trading in a car with a loan. See your equity now, after waiting, and when you'll stop being upside down.",
    calcInputs: [
      currencyField("loanBalance", "Loan Payoff Amount", { default: 18000, max: 1000000, step: 250 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 450, max: 100000, step: 10 }),
      percentField("ratePercent", "Loan Interest Rate (APR)", { default: 7, max: 30, step: 0.1 }),
      currencyField("carValue", "Car's Trade-In Value Now", { default: 15000, max: 1000000, step: 250 }),
      percentField("monthlyDepreciationPercent", "Value Drop per Month", { default: 1.2, max: 10, step: 0.1 }),
      numberField("monthsToWait", "Months to Wait Before Trading In", { default: 12, min: 0, max: 120, step: 1 }),
    ],
    calcResult: { label: "Equity After Waiting", format: "currency" },
    calcResults: [
      { key: "equityNow", label: "Equity Now", format: "currency" },
      { key: "balanceAfterWaiting", label: "Loan Balance After Waiting", format: "currency" },
      { key: "valueAfterWaiting", label: "Car Value After Waiting", format: "currency" },
      { key: "equityAfterWaiting", label: "Equity After Waiting", format: "currency", highlight: true },
      { key: "improvementFromWaiting", label: "Improvement from Waiting", format: "currency" },
      { key: "monthsUntilPositiveEquity", label: "Months Until Positive Equity", format: "number" },
    ],
    instructions:
      "If your loan balance is higher than the car's value, you have negative equity — you're \"upside down.\" Trading in " +
      "now usually means rolling that amount into the next loan, making it bigger and more expensive.\n\n" +
      "Each payment lowers the balance while the car keeps losing value. Once the balance falls faster than the value, " +
      "waiting helps. A negative equity figure is the amount you'd still owe after the trade-in.",
    examples:
      "Example: owing $18,000 on a car worth $15,000 leaves -$3,000 of equity. After 12 more " +
      "payments, equity improves to -$747.55, and it turns positive in about 16 months.",
    assumptions:
      "Steady monthly depreciation and on-time payments; capped at 120 months. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I roll negative equity into a new car loan?",
        answer: "Avoid it if you can — you'll start the new loan even further underwater. Paying it down first, or keeping the car longer, is usually cheaper.",
      },
    ],
  },
  {
    slug: "private-party-car-sale-calculator",
    title: "Private Party Car Sale Calculator",
    description: "Compare what you'd net from selling your car privately, through consignment, or trading it in with the sales tax credit on your next car.",
    metaTitle: "Private Party Car Sale Calculator — Sell vs Trade-In",
    metaDescription: "Free private party car sale calculator. Compare private sale, consignment fees and trade-in value with its sales tax credit.",
    calcInputs: [
      currencyField("privatePrice", "Private Sale Price", { default: 20000, max: 1000000, step: 250 }),
      currencyField("sellingCosts", "Selling Costs (Ads, Detailing, Inspection)", { default: 100, max: 10000, step: 25 }),
      percentField("consignmentPercent", "Consignment Fee", { default: 10, max: 50, step: 1 }),
      currencyField("consignmentFlatFee", "Consignment Flat Fee", { default: 0, max: 10000, step: 50, required: false }),
      currencyField("tradeInOffer", "Dealer Trade-In Offer", { default: 16500, max: 1000000, step: 250 }),
      percentField("salesTaxPercent", "Sales Tax Rate on Your Next Car", { default: 7, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Private Sale Advantage", format: "currency" },
    calcResults: [
      { key: "privateSaleNet", label: "Private Sale Net", format: "currency" },
      { key: "consignmentNet", label: "Consignment Net", format: "currency" },
      { key: "tradeInTaxCredit", label: "Trade-In Sales Tax Credit", format: "currency" },
      { key: "tradeInEffectiveValue", label: "Trade-In Effective Value", format: "currency" },
      { key: "privateSaleAdvantage", label: "Private Sale Advantage", format: "currency", highlight: true },
    ],
    instructions:
      "Selling privately usually brings the highest price but takes time: listing, showings, test drives and handling " +
      "payment and paperwork safely. Consignment lets a dealer or service sell it for you for a fee. A trade-in is " +
      "fastest, and in most states it reduces the sales tax on your next car, narrowing the gap.\n\n" +
      "A negative advantage means the trade-in comes out ahead.",
    examples:
      "Example: selling privately for $20,000 nets $19,900. A $16,500 trade-in is effectively worth " +
      "$17,655 with the tax credit, so selling privately puts $2,245 more in your pocket.",
    assumptions:
      "The trade-in tax credit applies only if you buy another car in a state that allows it. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I get paid safely in a private sale?",
        answer: "Meet at your bank or a police station, and accept cash verified by the bank or a cashier's check confirmed with the issuing bank.",
      },
    ],
  },
  {
    slug: "car-auction-fee-calculator",
    title: "Car Auction Fee Calculator",
    description: "Calculate car auction fees for buyers and sellers: buyer's premium, flat fees and transport, and the seller's commission and entry fee.",
    metaTitle: "Car Auction Fee Calculator — Buyer's Premium & Seller Fees",
    metaDescription: "Free car auction fee calculator. Find a buyer's total cost and a seller's net proceeds after auction premiums and fees.",
    calcInputs: [
      currencyField("hammerPrice", "Winning Bid (Hammer Price)", { default: 10000, max: 10000000, step: 100 }),
      percentField("buyerPremiumPercent", "Buyer's Premium", { default: 10, max: 30, step: 0.5 }),
      currencyField("buyerFlatFees", "Buyer Flat Fees (Doc, Gate, Online)", { default: 200, max: 10000, step: 25 }),
      currencyField("transportCost", "Transport Cost", { default: 300, max: 10000, step: 25, required: false }),
      percentField("sellerCommissionPercent", "Seller's Commission", { default: 5, max: 30, step: 0.5 }),
      currencyField("sellerEntryFee", "Seller Entry Fee", { default: 150, max: 10000, step: 25, required: false }),
    ],
    calcResult: { label: "Buyer's Total Cost", format: "currency" },
    calcResults: [
      { key: "buyerPremium", label: "Buyer's Premium", format: "currency" },
      { key: "buyerTotalCost", label: "Buyer's Total Cost", format: "currency", highlight: true },
      { key: "sellerCommission", label: "Seller's Commission", format: "currency" },
      { key: "sellerNetProceeds", label: "Seller's Net Proceeds", format: "currency" },
      { key: "auctionHouseTotalFees", label: "Auction House Total Fees", format: "currency" },
    ],
    instructions:
      "Auctions charge buyers a premium on top of the winning bid (often 5–15%, sometimes on a sliding scale) plus flat " +
      "documentation and gate fees, and charge sellers a commission or flat selling fee. Factor in transport and any " +
      "repairs, since most auction cars are sold as-is.\n\n" +
      "Set your maximum bid with the fees included.",
    examples:
      "Example: a $10,000 winning bid with a 10% buyer's premium and fees costs the buyer $11,500. " +
      "The seller nets $9,350 after a 5% commission.",
    assumptions:
      "Flat-percentage premium and commission. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can anyone buy at a dealer auction?",
        answer: "Many wholesale auctions require a dealer license; public and online auctions are open to everyone.",
      },
    ],
  },
  {
    slug: "car-flipping-profit-calculator",
    title: "Car Flipping Profit Calculator",
    description: "Calculate the profit from buying, fixing and reselling a car: all costs, after-tax profit, ROI and annualized return.",
    metaTitle: "Car Flipping Profit Calculator — Profit & ROI",
    metaDescription: "Free car flipping profit calculator. Add purchase, repairs, fees and holding costs to find your after-tax profit and ROI.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 8000, max: 1000000, step: 100 }),
      currencyField("repairs", "Repairs & Parts", { default: 1200, max: 100000, step: 50 }),
      currencyField("detailing", "Detailing & Cleanup", { default: 200, max: 10000, step: 25 }),
      currencyField("fees", "Title, Registration & Listing Fees", { default: 300, max: 10000, step: 25 }),
      numberField("holdingDays", "Days Until Sold", { default: 30, min: 1, max: 365, step: 1 }),
      currencyField("dailyHoldingCost", "Holding Cost per Day (Insurance, Storage)", { default: 5, max: 1000, step: 1 }),
      currencyField("salePrice", "Sale Price", { default: 11500, max: 1000000, step: 100 }),
      percentField("taxRatePercent", "Tax Rate on Profit", { default: 22, max: 60, step: 1 }),
    ],
    calcResult: { label: "Profit After Tax", format: "currency" },
    calcResults: [
      { key: "totalInvested", label: "Total Invested", format: "currency" },
      { key: "grossProfit", label: "Profit Before Tax", format: "currency" },
      { key: "profitAfterTax", label: "Profit After Tax", format: "currency", highlight: true },
      { key: "roiPercent", label: "Return on Investment", format: "percentage" },
      { key: "annualizedRoiPercent", label: "Annualized Return", format: "percentage" },
      { key: "profitPerDay", label: "Profit per Day Held", format: "currency" },
    ],
    instructions:
      "Car flipping means buying undervalued cars, fixing and cleaning them, and reselling for more. Profit depends on " +
      "buying well, keeping repairs in check and selling quickly — every day held adds insurance, storage and the risk " +
      "of price drops.\n\n" +
      "Most states limit how many cars you can sell a year (often around 3–6) before you need a dealer license, and " +
      "flipping profits are taxable income.",
    examples:
      "Example: buying at $8,000, spending $1,200 on repairs and selling for $11,500 after 30 days " +
      "leaves $1,650 before tax and $1,287 after — a 13.07% return.",
    assumptions:
      "Tax applies to the profit at a flat rate; self-employment tax may also apply if flipping is a business. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need a dealer license to flip cars?",
        answer: "If you sell more than your state's limit in a year, usually yes. Curbstoning — selling cars as a private seller to avoid the rules — is illegal.",
      },
    ],
  },
  {
    slug: "car-diminished-value-calculator",
    title: "Car Diminished Value Calculator",
    description: "Estimate your car's diminished value after an accident with the 17c formula used by many insurers, based on value, damage severity and mileage.",
    metaTitle: "Car Diminished Value Calculator — 17c Formula",
    metaDescription: "Free diminished value calculator. Estimate the loss in your car's value after an accident using the 17c formula.",
    calcInputs: [
      currencyField("preAccidentValue", "Value Before the Accident", { default: 25000, max: 1000000, step: 250 }),
      {
        key: "damage", label: "Damage Severity", type: "dropdown", required: true, default: 3,
        options: [
          { label: "Severe Structural Damage", value: 1 },
          { label: "Major Structural and Panel Damage", value: 2 },
          { label: "Moderate Structural and Panel Damage", value: 3 },
          { label: "Minor Structural and Panel Damage", value: 4 },
          { label: "No Structural Damage / Cosmetic Only", value: 5 },
        ],
      },
      numberField("mileage", "Odometer Miles", { default: 45000, min: 0, max: 1000000, step: 1000 }),
    ],
    calcResult: { label: "Diminished Value", format: "currency" },
    calcResults: [
      { key: "baseLossCap", label: "Base Loss Cap (10% of Value)", format: "currency" },
      { key: "damageMultiplier", label: "Damage Multiplier", format: "number", decimals: 2 },
      { key: "mileageMultiplier", label: "Mileage Multiplier", format: "number", decimals: 2 },
      { key: "diminishedValue", label: "Diminished Value", format: "currency", highlight: true },
      { key: "valueAfterRepair", label: "Value After Repair", format: "currency" },
    ],
    instructions:
      "A car that's been in an accident is worth less than an identical car that hasn't, even after good repairs. You can " +
      "often claim this diminished value from the at-fault driver's insurer.\n\n" +
      "The 17c formula, used by many insurers, caps the loss at 10% of the car's value, then multiplies it by a damage " +
      "factor (1.00 for severe to 0 for none) and a mileage factor (1.0 under 20,000 miles down to 0 at 100,000+). " +
      "It's often criticized as low — an independent appraisal may support a higher claim.",
    examples:
      "Example: a $25,000 car with moderate damage and 45,000 miles has a $2,500 cap × 0.50 × " +
      "0.60 = $750 of diminished value.",
    assumptions:
      "Standard 17c multipliers. Claims usually can't be made against your own insurer. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I claim diminished value if the accident was my fault?",
        answer: "Generally no — diminished value claims are made against the at-fault driver's liability insurance.",
      },
    ],
  },
  {
    slug: "salvage-title-value-calculator",
    title: "Salvage Title Value Calculator",
    description: "Estimate how much a salvage title, rebuilt title or an accident on the vehicle history report lowers a car's value, and the margin on rebuilding a salvage car.",
    metaTitle: "Salvage Title Value Calculator — Rebuilt Title Discount",
    metaDescription: "Free salvage title value calculator. Estimate value loss from salvage, rebuilt or accident history, and rebuild margins.",
    calcInputs: [
      currencyField("cleanValue", "Value with a Clean History", { default: 20000, max: 1000000, step: 250 }),
      {
        key: "titleStatus", label: "Title / History Status", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Clean Title, Accident on History Report", value: 1 },
          { label: "Rebuilt Title", value: 2 },
          { label: "Salvage Title", value: 3 },
          { label: "Clean Title, Clean History", value: 4 },
        ],
      },
      percentField("customDiscountPercent", "Your Discount Estimate (0 = Typical)", { default: 0, max: 100, step: 1, required: false }),
      currencyField("repairCost", "Cost to Repair a Salvage Car", { default: 3000, max: 1000000, step: 100 }),
      currencyField("inspectionFee", "Rebuilt Inspection & Title Fees", { default: 200, max: 10000, step: 25 }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "discountPercentUsed", label: "Discount Used (%)", format: "number" },
      { key: "valueDiscount", label: "Value Lost", format: "currency" },
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "rebuiltTitleValue", label: "Typical Rebuilt Title Value", format: "currency" },
      { key: "salvageTitleValue", label: "Typical Salvage Title Value", format: "currency" },
      { key: "rebuildMargin", label: "Margin on Rebuilding a Salvage Car", format: "currency" },
    ],
    instructions:
      "A salvage title means an insurer declared the car a total loss; it usually can't be driven until repaired and " +
      "inspected, when it gets a rebuilt title. Salvage cars typically sell for about half of clean-title value, and " +
      "rebuilt cars for about 20–40% less. Even with a clean title, an accident on a vehicle history report often " +
      "lowers value by 10–15%.\n\n" +
      "Rebuilt cars can be harder to insure and finance — and harder to sell later.",
    examples:
      "Example: a car worth $20,000 with a clean history might sell for about $14,000 with a rebuilt title " +
      "(30% less). Buying it as salvage for $10,000 and spending $3,000 to rebuild leaves a " +
      "margin of about $800.",
    assumptions:
      "Typical discounts: accident history 12%, rebuilt 30%, salvage 50%. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I insure a rebuilt title car?",
        answer: "Usually for liability, but some insurers limit or refuse collision and comprehensive coverage, or pay less after a claim.",
      },
    ],
  },
];

// Car & Vehicle Cost Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
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
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
