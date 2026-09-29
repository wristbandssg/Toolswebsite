// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Crypto Calculators" sub-batch D (Travel & Everyday Currency). Part of the
// currency, forex & crypto tool-list build-out: 89 tools in the source list,
// 3 already built (currency-converter, forex-profit-loss-calculator,
// forex-position-size-calculator — moved into Crypto Calculators), 86 built
// across 9 sub-batches — all under Finance Calculators > Crypto Calculators
// (the user's chosen name for the whole currency/forex/crypto section):
//   create-currency-conversion-calculators.ts (13 tools)
//   create-currency-rate-changes-calculators.ts (8 tools)
//   create-currency-spreads-fees-calculators.ts (10 tools)
//   create-currency-travel-consumer-calculators.ts (9 tools)
//   create-currency-forex-trade-calculators.ts (12 tools)
//   create-currency-forex-costs-growth-calculators.ts (11 tools)
//   create-currency-forwards-parity-calculators.ts (10 tools)
//   create-currency-business-hedging-calculators.ts (9 tools)
//   create-currency-crypto-metals-calculators.ts (4 tools)
//
// See src/lib/calc-engine-currency-travel-consumer.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-currency-travel-consumer-calculators.ts
// or
//   npm run db:create-currency-travel-consumer-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "crypto-calculators";

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

function dropdownField(key: string, label: string, defaultValue: number, options: { label: string; value: number }[]) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}

// Exchange rates and small prices need more decimal places than money.
function rateField(
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
    default: opts.default ?? 1,
    min: opts.min ?? 0.000001,
    max: opts.max ?? 100000,
    step: opts.step ?? 0.0001,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial, investment, trading " +
  "or tax advice. Exchange rates, crypto and metal prices, fees and interest rates change constantly — enter the " +
  "current quotes from your bank, broker or exchange. Leveraged forex and crypto trading carries a high risk of loss.";

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
    slug: "travel-money-calculator",
    title: "Travel Money Calculator",
    description: "Budget the foreign currency you'll need for a trip — daily spending times the number of days, plus bigger costs and a safety buffer — and what it costs in your currency.",
    metaTitle: "Travel Money Calculator — Trip Currency Budget",
    metaDescription: "Free travel money calculator. Budget foreign currency for a trip from daily spending, extra costs and a buffer, and see the cost in your currency.",
    calcInputs: [
      numberField("days", "Days Away", { unit: "days", default: 10, min: 0, max: 3650, step: 1 }),
      numberField("dailyBudgetForeign", "Daily Spending (Foreign Currency)", { default: 150, min: 0, max: 100000000, step: 5 }),
      numberField("extraCostsForeign", "Extra Costs — Tours, Transport (Foreign)", { default: 400, min: 0, max: 100000000, step: 10 }),
      percentField("bufferPercent", "Safety Buffer", { default: 10, max: 100, step: 1 }),
      rateField("exchangeRate", "Exchange Rate (Foreign per 1 Home)", { default: 0.92 }),
    ],
    calcResult: { label: "Cost in Home Currency", format: "currency" },
    calcResults: [
      { key: "costInHomeCurrency", label: "Cost in Your Currency", format: "currency", highlight: true },
      { key: "foreignCurrencyNeeded", label: "Foreign Currency Needed", format: "number", decimals: 2 },
      { key: "costPerDay", label: "Cost per Day", format: "currency" },
      { key: "bufferAmountForeign", label: "Buffer Included (Foreign)", format: "number", decimals: 2 },
    ],
    instructions: "Enter the number of days, what you expect to spend each day on food, local transport and small purchases, bigger costs like tours or train tickets, a buffer for surprises, and the exchange rate you'll get.",
    examples: "Example: 10 days at 150 euros a day plus 400 euros of extras and a 10% buffer comes to 2,090 euros. At 0.92 euros per dollar that's $2,271.74 — $227.17 a day.",
    assumptions: "Hotels and flights paid in advance are usually left out. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How much cash should I take abroad?", answer: "Enough for a few days and places that don't take cards. Use a card without foreign fees for most spending, and withdraw local cash from bank ATMs as needed." }],
  },
  {
    slug: "travel-currency-converter",
    title: "Travel Currency Converter",
    description: "Find out what a price abroad really costs in your currency — paying by card with a foreign transaction fee vs paying with cash bought at an exchange booth.",
    metaTitle: "Travel Currency Converter — Card vs Cash Cost",
    metaDescription: "Free travel currency converter. See what a price abroad really costs on a card with a foreign fee vs cash from an exchange booth.",
    calcInputs: [
      numberField("priceForeign", "Price in Foreign Currency", { default: 45, min: 0, max: 100000000, step: 1 }),
      rateField("cardNetworkRate", "Card Network Rate (Foreign per 1 Home)", { default: 0.92 }),
      percentField("cardFeePercent", "Card Foreign Transaction Fee", { default: 3, max: 10, step: 0.1 }),
      rateField("cashBoothRate", "Exchange Booth Rate (Foreign per 1 Home)", { default: 0.86 }),
    ],
    calcResult: { label: "Cost on Card", format: "currency" },
    calcResults: [
      { key: "costOnCard", label: "Cost Paying by Card", format: "currency", highlight: true },
      { key: "costWithBoothCash", label: "Cost Paying with Booth Cash", format: "currency" },
      { key: "costAtNetworkRate", label: "Cost at the Network Rate (No Fee)", format: "currency" },
      { key: "cardMinusCash", label: "Card Minus Cash", format: "currency" },
    ],
    instructions: "Enter the price on the menu or tag, the card network's rate (close to mid-market), your card's foreign fee, and the rate the exchange booth gives.",
    examples: "Example: a 45-euro dinner costs $48.91 at the network rate. With a 3% card fee it's $50.38; paying with cash bought at 0.86 costs $52.33 — so the card is $1.95 cheaper.",
    assumptions: "Always choose to pay in the local currency; letting the merchant convert usually costs more. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is it cheaper to pay by card or cash abroad?", answer: "A card with no foreign transaction fee is usually cheapest. Cash from a bank ATM comes next; exchange booths tend to be the most expensive." }],
  },
  {
    slug: "holiday-money-calculator",
    title: "Holiday Money Calculator",
    description: "Split your holiday budget between cash and card, and see how much currency you'd lose by buying your cash at the airport instead of ordering it in advance.",
    metaTitle: "Holiday Money Calculator — Cash vs Airport Rates",
    metaDescription: "Free holiday money calculator. Split a holiday budget into cash and card and see what buying currency at the airport costs vs pre-ordering it.",
    calcInputs: [
      currencyField("budget", "Holiday Spending Budget", { default: 1500, max: 100000000, step: 50 }),
      percentField("cashSharePercent", "Share Taken as Cash", { default: 40, max: 100, step: 5 }),
      rateField("preOrderRate", "Pre-Order Rate (Foreign per 1 Home)", { default: 0.9 }),
      rateField("airportRate", "Airport Rate (Foreign per 1 Home)", { default: 0.82 }),
    ],
    calcResult: { label: "Cash if Pre-Ordered", format: "number", decimals: 2 },
    calcResults: [
      { key: "cashIfPreOrdered", label: "Cash if Pre-Ordered (Foreign)", format: "number", decimals: 2, highlight: true },
      { key: "cashIfBoughtAtAirport", label: "Cash if Bought at the Airport", format: "number", decimals: 2 },
      { key: "airportLossForeign", label: "Currency Lost at the Airport", format: "number", decimals: 2 },
      { key: "airportLossHome", label: "Airport Loss in Your Currency", format: "currency" },
      { key: "cashBudgetHome", label: "Cash Budget", format: "currency" },
      { key: "cardBudgetHome", label: "Card Budget", format: "currency" },
    ],
    instructions: "Enter your total spending budget, how much of it you want as cash, and the rates for ordering currency in advance (online or from a bureau for collection) and at the airport.",
    examples: "Example: taking 40% of a $1,500 budget as cash ($600) gets 540 euros pre-ordered but only 492 at the airport — 48 euros less, worth about $53.33. The other $900 goes on your card.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why are airport exchange rates so poor?", answer: "Travelers are in a hurry with few alternatives, and airport rents are high, so bureaus build a large margin into the rate." }],
  },
  {
    slug: "cash-exchange-calculator",
    title: "Cash Exchange Calculator",
    description: "Work out how much foreign cash a bureau de change gives you after its rate and commission (with a minimum charge), and what you'll lose selling leftover cash back.",
    metaTitle: "Cash Exchange Calculator — Bureau Rate & Commission",
    metaDescription: "Free cash exchange calculator. See the foreign cash you get after a bureau's rate and commission, and what selling leftover cash back loses.",
    calcInputs: [
      currencyField("amount", "Amount to Exchange", { default: 500, max: 100000000, step: 10 }),
      rateField("bureauRate", "Bureau Rate (Foreign per 1 Home)", { default: 0.86 }),
      percentField("commissionPercent", "Commission", { default: 2, max: 20, step: 0.1 }),
      currencyField("minimumCommission", "Minimum Commission", { default: 3, max: 10000, step: 0.5 }),
      numberField("leftoverForeign", "Leftover Cash to Sell Back (Foreign)", { default: 60, min: 0, max: 100000000, step: 5 }),
      rateField("buyBackRate", "Buy-Back Rate (Foreign per 1 Home)", { default: 0.98 }),
    ],
    calcResult: { label: "Foreign Cash Received", format: "number", decimals: 2 },
    calcResults: [
      { key: "foreignCashReceived", label: "Foreign Cash Received", format: "number", decimals: 2, highlight: true },
      { key: "commission", label: "Commission Charged", format: "currency" },
      { key: "effectiveRate", label: "Effective Rate After Commission", format: "number", decimals: 6 },
      { key: "leftoverSoldBackFor", label: "Leftover Cash Sold Back For", format: "currency" },
      { key: "lossOnLeftovers", label: "Loss on Leftovers", format: "currency" },
    ],
    instructions: "Enter the amount, the bureau's rate and commission (with any minimum), plus any leftover foreign cash and the bureau's buy-back rate — the foreign amount it wants for each unit of your currency, which is always higher than its selling rate.",
    examples: "Example: exchanging $500 at 0.86 with a 2% commission ($10) gives 421.40 euros — an effective rate of 0.8428. Selling 60 euros back at 0.98 returns $61.22, a $9.97 loss on those leftovers.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What should I do with leftover foreign cash?", answer: "Keep it for your next trip, spend coins before you leave, or sell notes back — buy-back rates are poor, so only change what you won't use." }],
  },
  {
    slug: "bank-exchange-rate-calculator",
    title: "Bank Exchange Rate Calculator",
    description: "See the rates a bank quotes when you buy and sell a foreign currency, built from the mid-market rate and its margin, and what the margin costs on your amount.",
    metaTitle: "Bank Exchange Rate Calculator — Buy & Sell Rates",
    metaDescription: "Free bank exchange rate calculator. Build a bank's buy and sell rates from the mid-market rate and its margin, and see the cost on your amount.",
    calcInputs: [
      rateField("midMarketRate", "Mid-Market Rate (Foreign per 1 Home)", { default: 0.92 }),
      percentField("bankMarginPercent", "Bank's Margin", { default: 3, max: 50, step: 0.1 }),
      currencyField("amount", "Amount to Convert", { default: 1000, max: 1000000000, step: 10 }),
    ],
    calcResult: { label: "Foreign Currency Received", format: "number", decimals: 2 },
    calcResults: [
      { key: "foreignCurrencyReceived", label: "Foreign Currency You Receive", format: "number", decimals: 2, highlight: true },
      { key: "bankRateWhenYouBuy", label: "Bank Rate When You Buy Foreign", format: "number", decimals: 6 },
      { key: "bankRateWhenYouSell", label: "Bank Rate When You Sell Foreign", format: "number", decimals: 6 },
      { key: "costVsMidMarket", label: "Cost vs Mid-Market", format: "currency" },
    ],
    instructions: "Enter the mid-market rate, the bank's margin (often 2% to 4%), and the amount. Banks give you fewer foreign units per dollar when you buy, and want more when you sell back.",
    examples: "Example: with a 0.92 mid-market rate and a 3% margin, the bank gives you 0.8924 euros per dollar when you buy and wants 0.9476 when you sell back. Converting $1,000 gets 892.40 euros — $30 worse than mid-market.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why don't banks show their fee?", answer: "Many build it into the exchange rate rather than charging it separately. Comparing their rate with the mid-market rate reveals it." }],
  },
  {
    slug: "credit-card-exchange-rate-calculator",
    title: "Credit Card Exchange Rate Calculator",
    description: "Compare paying abroad in the local currency with letting the shop or ATM convert to your currency (dynamic currency conversion), including your card's foreign transaction fee.",
    metaTitle: "Credit Card Exchange Rate Calculator — DCC vs Local",
    metaDescription: "Free credit card exchange rate calculator. Compare paying abroad in local currency vs dynamic currency conversion, with your card's foreign fee.",
    calcInputs: [
      numberField("purchaseForeign", "Purchase in Local Currency", { default: 200, min: 0, max: 100000000, step: 5 }),
      rateField("networkRate", "Card Network Rate (Foreign per 1 Home)", { default: 0.92 }),
      percentField("issuerFeePercent", "Your Card's Foreign Transaction Fee", { default: 3, max: 10, step: 0.1 }),
      percentField("dccMarkupPercent", "Merchant Conversion (DCC) Markup", { default: 5, max: 20, step: 0.5 }),
      dropdownField("issuerFeeOnDcc", "Does Your Card Also Charge Its Fee on DCC?", 1, [
        { label: "Yes — most cards do", value: 1 },
        { label: "No", value: 0 },
      ]),
    ],
    calcResult: { label: "Extra Cost of DCC", format: "currency" },
    calcResults: [
      { key: "extraCostOfDcc", label: "Extra Cost of Letting the Merchant Convert", format: "currency", highlight: true },
      { key: "costPayingInLocalCurrency", label: "Cost Paying in Local Currency", format: "currency" },
      { key: "costWithDcc", label: "Cost with Dynamic Currency Conversion", format: "currency" },
      { key: "costAtNetworkRate", label: "Cost at the Network Rate", format: "currency" },
    ],
    instructions: "Enter the price in local currency, the card network's rate, your card's foreign fee, and the markup a merchant or ATM adds when it offers to charge you in your own currency.",
    examples: "Example: a 200-euro bill is $217.39 at the network rate. Paying in euros with a 3% card fee costs $223.91; accepting the merchant's conversion with a 5% markup costs $235.11 — $11.20 more.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Should I pay in my home currency or local currency abroad?", answer: "Almost always local currency. Dynamic currency conversion looks convenient but typically adds a 3% to 8% markup." }],
  },
  {
    slug: "paypal-currency-conversion-calculator",
    title: "PayPal Currency Conversion Calculator",
    description: "See what PayPal's currency conversion spread costs when you pay or send money in another currency, compared with converting through your bank or card.",
    metaTitle: "PayPal Currency Conversion Calculator — True Cost",
    metaDescription: "Free PayPal currency conversion calculator. See what PayPal's conversion spread costs on a payment, compared with your bank or card's rate.",
    calcInputs: [
      currencyField("amount", "Amount Being Converted", { default: 500, max: 100000000, step: 10 }),
      rateField("baseRate", "Base Exchange Rate (Foreign per 1 Home)", { default: 0.92 }),
      percentField("paypalSpreadPercent", "PayPal Conversion Spread", { default: 4, max: 10, step: 0.1 }),
      percentField("bankSpreadPercent", "Bank or Card Conversion Cost", { default: 1, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Received with PayPal", format: "number", decimals: 2 },
    calcResults: [
      { key: "receivedWithPaypal", label: "Received with PayPal Conversion", format: "number", decimals: 2, highlight: true },
      { key: "receivedWithBank", label: "Received with Bank or Card Conversion", format: "number", decimals: 2 },
      { key: "paypalConversionCost", label: "PayPal Conversion Cost", format: "currency" },
      { key: "extraCostOfPaypal", label: "Extra Cost of PayPal Conversion", format: "currency" },
    ],
    instructions: "Enter the amount, the base (mid-market) rate, PayPal's conversion spread from its current fee page, and what your bank or card charges to convert. PayPal often lets you choose to have your card issuer convert instead.",
    examples: "Example: converting $500 at a 0.92 base rate, a 4% PayPal spread delivers 441.60 euros against 455.40 with a 1% bank conversion — PayPal's conversion costs $20, or $15 more.",
    assumptions: "PayPal's spreads vary by country and transaction type and change over time — check PayPal's fee page for your account. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Can I avoid PayPal's currency conversion fee?", answer: "When paying with a linked card, you can often choose to be billed in the seller's currency so your card converts it instead — cheaper if your card has no foreign fee." }],
  },
  {
    slug: "international-price-converter",
    title: "International Price Converter",
    description: "Check whether it's cheaper to buy something abroad — the foreign price converted to your currency, minus any VAT or sales tax refund, compared with the price at home.",
    metaTitle: "International Price Converter — Buy Abroad or Home?",
    metaDescription: "Free international price converter. Convert a foreign price, subtract a VAT refund, and compare with the home price to see if buying abroad saves money.",
    calcInputs: [
      currencyField("homePrice", "Price at Home", { default: 1200, max: 100000000, step: 10 }),
      numberField("foreignPrice", "Price Abroad (Foreign Currency, Incl. Tax)", { default: 999, min: 0, max: 100000000, step: 1 }),
      rateField("exchangeRate", "Exchange Rate (Foreign per 1 Home)", { default: 0.92 }),
      percentField("taxRefundPercent", "Tax Refund You'll Get Back", { default: 10, max: 30, step: 0.5 }),
      percentField("cardFeePercent", "Card Foreign Fee", { default: 0, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Saving Buying Abroad", format: "currency" },
    calcResults: [
      { key: "savingBuyingAbroad", label: "Saving Buying Abroad (Negative = Costs More)", format: "currency", highlight: true },
      { key: "savingPercent", label: "Saving %", format: "percentage" },
      { key: "foreignPriceInHomeCurrency", label: "Foreign Price in Your Currency", format: "currency" },
      { key: "netCostAbroad", label: "Net Cost Abroad After Refund", format: "currency" },
    ],
    instructions: "Enter the price at home, the price abroad including local tax, the exchange rate, the share of the price you'll get back as a tourist tax refund (after the refund company's cut), and any card fee.",
    examples: "Example: a 999-euro laptop is $1,085.87. With a 10% tax refund it costs $977.28 — $222.72 (18.56%) less than the $1,200 home price.",
    assumptions: "Check warranty coverage and any import duty or tax when you bring the item home. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How does a tourist VAT refund work?", answer: "In many countries visitors can reclaim VAT on goods taken home. You fill out a form in the shop and get it stamped at customs when you leave; refund companies keep a fee." }],
  },
  {
    slug: "foreign-salary-currency-converter",
    title: "Foreign Salary Currency Converter",
    description: "Convert a salary offered abroad into your currency, and adjust it for how expensive the country is to see what it's really worth to live on.",
    metaTitle: "Foreign Salary Converter — Cost-of-Living Adjusted",
    metaDescription: "Free foreign salary currency converter. Convert a salary abroad into your currency and adjust it for the local cost of living to compare offers.",
    calcInputs: [
      numberField("foreignSalary", "Yearly Salary Abroad (Foreign Currency)", { default: 60000, min: 0, max: 100000000000, step: 1000 }),
      rateField("exchangeRate", "Exchange Rate (Home per 1 Foreign)", { default: 1.085 }),
      numberField("priceLevelPercent", "Prices Abroad as % of Home Prices", { unit: "%", default: 85, min: 1, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Cost-of-Living Equivalent", format: "currency" },
    calcResults: [
      { key: "costOfLivingEquivalent", label: "Equivalent Salary at Home Prices", format: "currency", highlight: true },
      { key: "salaryInHomeCurrency", label: "Salary Converted", format: "currency" },
      { key: "monthlyInHomeCurrency", label: "Monthly, Converted", format: "currency" },
      { key: "purchasingPowerGainPercent", label: "Purchasing Power Gain (Loss)", format: "percentage" },
    ],
    instructions: "Enter the salary in the foreign currency, the exchange rate as your currency per 1 unit of theirs, and how expensive that country is compared with home (100 = same prices; cost-of-living indexes like Numbeo give a guide).",
    examples: "Example: a 60,000-euro salary converts to $65,100 ($5,425 a month). If prices there are 85% of home prices, it buys what $76,588.24 would at home — 17.65% more purchasing power.",
    assumptions: "Compares gross pay; taxes, social security and housing costs differ a lot between countries. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why adjust a foreign salary for cost of living?", answer: "A salary that looks lower after conversion can go further where rent, food and transport are cheaper — and a high one can shrink in an expensive city." }],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }

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
