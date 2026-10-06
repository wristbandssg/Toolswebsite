// One-time (but safe to re-run) batch setup script: creates the Payments, Rewards & Loans tools
// (5) of the Crypto Calculators expansion, filed under Crypto
// Calculators > Crypto Fees, Payments & Loans Calculators (both categories are created on first run).
// See src/lib/calc-engine-crypto-payments-loans.ts for the math and
// src/lib/calc-engine-crypto-trading.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-crypto-payments-loans-calculators.ts
// or
//   npm run db:create-crypto-payments-loans-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Crypto Calculators", slug: "crypto-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Crypto Fees, Payments & Loans Calculators", slug: "crypto-fees-payments-loans-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't financial, investment or " +
  "tax advice. Crypto assets are highly volatile and can lose all their value; fees, rates and rules vary by " +
  "platform, network and country — check current figures before you act.";

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
    slug: "crypto-merchant-processing-fee-calculator",
    title: "Crypto Merchant Payment Processing Fee Calculator",
    description: "Compare the cost of accepting crypto payments through a processor with credit card processing fees on the same sales, monthly and yearly.",
    metaTitle: "Crypto Payment Processing Fee Calculator — vs Card Fees",
    metaDescription: "Free crypto merchant fee calculator. Compare crypto payment processing fees with credit card fees and see your savings.",
    calcInputs: [
      currencyField("monthlySales", "Monthly Sales", { default: 20000, max: 1000000000, step: 500 }),
      percentField("cryptoSharePercent", "Share Paid in Crypto", { default: 10, max: 100, step: 1 }),
      percentField("cryptoFeePercent", "Crypto Processor Fee", { default: 1, max: 10, step: 0.1 }),
      percentField("cardFeePercent", "Card Processing Rate", { default: 2.9, max: 10, step: 0.05 }),
      currencyField("cardFixedFee", "Card Fee per Transaction", { default: 0.3, max: 5, step: 0.05 }),
      currencyField("averageTicket", "Average Sale Amount", { default: 50, max: 1000000, step: 1 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "cryptoSales", label: "Crypto Sales per Month", format: "currency" },
      { key: "cryptoProcessingFees", label: "Crypto Processing Fees", format: "currency" },
      { key: "cardFeesOnSameSales", label: "Card Fees on the Same Sales", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency", highlight: true },
      { key: "effectiveCardRate", label: "Effective Card Rate", format: "percentage" },
    ],
    instructions:
      "Crypto payment processors typically charge about 0.5–1% and can convert payments to dollars instantly, so you " +
      "don't hold crypto. There are no chargebacks — which protects merchants but means refunds must be handled " +
      "manually.\n\n" +
      "Savings depend on how many customers actually choose to pay with crypto.",
    examples:
      "Example: if 10% of $20,000 in monthly sales is paid in crypto at a 1% fee, fees are $20 " +
      "versus $70 on cards — $600 saved a year.",
    assumptions:
      "Instant conversion to dollars; other card costs (chargebacks, monthly fees) not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I owe tax on crypto I receive as payment?",
        answer: "Yes — it's business income at its dollar value when received; if you hold it and it changes value, that's a separate gain or loss.",
      },
    ],
  },
  {
    slug: "crypto-payroll-calculator",
    title: "Crypto Payroll Payment Value Calculator",
    description: "See what taking part of your salary in crypto is worth — coins received after the conversion fee and their value later — while your wages are still taxed in dollars.",
    metaTitle: "Crypto Payroll Calculator — Salary Paid in Bitcoin",
    metaDescription: "Free crypto payroll calculator. See how many coins part of your salary buys and what they're worth later.",
    calcInputs: [
      currencyField("grossPay", "Gross Pay per Paycheck", { default: 5000, max: 10000000, step: 100 }),
      percentField("cryptoSharePercent", "Share Taken in Crypto", { default: 20, max: 100, step: 5 }),
      currencyField("priceAtPay", "Coin Price on Payday", { default: 60000, max: 10000000, step: 0.01 }),
      currencyField("priceLater", "Coin Price Later", { default: 66000, max: 10000000, step: 0.01 }),
      percentField("conversionFeePercent", "Conversion Fee", { default: 1, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Value at the Later Price", format: "currency" },
    calcResults: [
      { key: "cryptoPortion", label: "Pay Converted to Crypto", format: "currency" },
      { key: "coinsReceived", label: "Coins Received", format: "number", decimals: 8 },
      { key: "valueAtLaterPrice", label: "Value at the Later Price", format: "currency", highlight: true },
      { key: "gainOrLossSincePayday", label: "Gain or Loss Since Payday", format: "currency" },
      { key: "wagesTaxedAs", label: "Wages Taxed As", format: "currency" },
    ],
    instructions:
      "Some employers and payroll apps let you take part of each paycheck in Bitcoin or other crypto. Your full pay is " +
      "still wages, taxed at its dollar value on payday; any change in the coin's value after that is a capital gain or " +
      "loss when you sell.\n\n" +
      "Taking pay in a volatile asset adds risk to money you may need for bills.",
    examples:
      "Example: taking 20% of $5,000 in crypto at $60,000 buys 0.0165 coins. At $66,000 they're worth " +
      "$1,089 — a $99 gain. Your wages are still taxed on $5,000.",
    assumptions:
      "Conversion fee taken from the crypto portion. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can my employer pay my whole salary in crypto?",
        answer: "In the US, minimum wage and overtime must generally be paid in dollars; crypto is usually an optional add-on.",
      },
    ],
  },
  {
    slug: "crypto-card-rewards-calculator",
    title: "Crypto Card Rewards Calculator",
    description: "Estimate rewards from a crypto credit or debit card that pays cashback in crypto, after the token's price change and fees, versus a regular cash-back card.",
    metaTitle: "Crypto Card Rewards Calculator — Crypto Cashback Value",
    metaDescription: "Free crypto card rewards calculator. Value crypto cashback after token price changes and fees vs a regular cashback card.",
    calcInputs: [
      currencyField("monthlySpend", "Monthly Card Spending", { default: 1500, max: 1000000, step: 50 }),
      percentField("rewardRatePercent", "Crypto Reward Rate", { default: 2, max: 20, step: 0.25 }),
      numberField("tokenPriceChangePercent", "Reward Token Price Change over the Year (%)", { default: -10, min: -100, max: 1000, step: 1 }),
      currencyField("annualFee", "Annual Card Fee", { default: 0, max: 10000, step: 5, required: false }),
      percentField("cashbackRatePercent", "Regular Cash-Back Card Rate", { default: 1.5, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "Net Rewards After Fee", format: "currency" },
    calcResults: [
      { key: "rewardsAtIssueValue", label: "Rewards at Value When Earned", format: "currency" },
      { key: "rewardsAfterPriceChange", label: "Rewards After Price Change", format: "currency" },
      { key: "netRewardsAfterFee", label: "Net Rewards After Fee", format: "currency", highlight: true },
      { key: "regularCashbackCard", label: "Regular Cash-Back Card", format: "currency" },
      { key: "advantageOverCashback", label: "Advantage over Cash Back", format: "currency" },
    ],
    instructions:
      "Crypto cards pay rewards in Bitcoin or an exchange's own token instead of cash. Their value rises or falls with the " +
      "token, and the highest tiers often require holding or staking the exchange's token. Watch for annual fees, foreign " +
      "transaction fees and reward caps.\n\n" +
      "Crypto rewards received as purchase rebates generally aren't taxed when earned, but selling them later can trigger a gain.",
    examples:
      "Example: $1,500 a month at 2% earns $360 of crypto a year. If the token falls 10%, it's worth " +
      "$324 — $54 more than a 1.50% cash-back card.",
    assumptions:
      "Price change applied to the whole year's rewards. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are crypto debit cards different from credit cards?",
        answer: "Debit cards spend from your exchange balance (often selling crypto at each purchase, a taxable event); credit cards borrow and pay rewards in crypto.",
      },
    ],
  },
  {
    slug: "crypto-referral-bonus-calculator",
    title: "Crypto Referral Bonus Value Calculator",
    description: "Estimate what crypto exchange referrals are worth: sign-up bonuses plus your share of referees' trading fees, after tax.",
    metaTitle: "Crypto Referral Bonus Calculator — Exchange Referrals",
    metaDescription: "Free crypto referral calculator. Estimate sign-up bonuses and trading-fee commissions from exchange referrals after tax.",
    calcInputs: [
      currencyField("bonusPerReferral", "Bonus per Referral", { default: 50, max: 10000, step: 5 }),
      numberField("referrals", "Number of Referrals", { default: 5, min: 0, max: 100000, step: 1 }),
      currencyField("monthlyVolumePerReferral", "Monthly Trading Volume per Referral", { default: 2000, max: 100000000, step: 100 }),
      percentField("feeRatePercent", "Exchange Trading Fee", { default: 0.1, max: 2, step: 0.01 }),
      percentField("commissionSharePercent", "Your Share of Their Fees", { default: 20, max: 100, step: 5 }),
      numberField("months", "Months", { default: 12, min: 0, max: 120, step: 1 }),
      percentField("taxRatePercent", "Tax Rate", { default: 22, max: 60, step: 1 }),
    ],
    calcResult: { label: "Total Value", format: "currency" },
    calcResults: [
      { key: "signUpBonuses", label: "Sign-Up Bonuses", format: "currency" },
      { key: "commissionIncome", label: "Trading Fee Commission", format: "currency" },
      { key: "totalValue", label: "Total Value", format: "currency", highlight: true },
      { key: "afterTaxValue", label: "After-Tax Value", format: "currency" },
    ],
    instructions:
      "Exchanges pay referral rewards in two ways: a one-time bonus when a friend signs up and trades or deposits, and an " +
      "ongoing share of the trading fees they pay. Bonuses usually require the referee to meet a minimum.\n\n" +
      "Referral rewards are taxable income at their value when you receive them.",
    examples:
      "Example: 5 referrals at $50 each earn $250, plus $24 of fee commission over 12 " +
      "months — $274, or $213.72 after tax.",
    assumptions:
      "Referees keep trading at the same volume. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to report small referral bonuses?",
        answer: "Yes — all income is reportable, even if the exchange doesn't send a tax form.",
      },
    ],
  },
  {
    slug: "crypto-backed-loan-calculator",
    title: "Crypto-Backed Loan Calculator",
    description: "Calculate a loan secured by your crypto: loan-to-value, interest and origination fee, the true borrowing cost, and the coin prices that trigger a margin call or liquidation.",
    metaTitle: "Crypto-Backed Loan Calculator — LTV & Liquidation Price",
    metaDescription: "Free crypto-backed loan calculator. Find LTV, interest, origination fee and the margin call and liquidation prices.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 1000000000, step: 500 }),
      numberField("collateralCoins", "Collateral (Coins)", { default: 0.75, min: 0, max: 1000000, step: 0.01 }),
      currencyField("coinPrice", "Coin Price", { default: 60000, max: 10000000, step: 0.01 }),
      percentField("ratePercent", "Interest Rate (APR)", { default: 11, max: 50, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 1, max: 120, step: 1 }),
      percentField("originationFeePercent", "Origination Fee", { default: 2, max: 10, step: 0.25, required: false }),
      percentField("marginCallLtvPercent", "Margin Call LTV", { default: 70, max: 100, step: 1 }),
      percentField("liquidationLtvPercent", "Liquidation LTV", { default: 83, max: 100, step: 1 }),
    ],
    calcResult: { label: "Liquidation Price", format: "currency" },
    calcResults: [
      { key: "collateralValue", label: "Collateral Value", format: "currency" },
      { key: "loanToValuePercent", label: "Loan-to-Value (LTV)", format: "percentage" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "totalBorrowingCost", label: "Total Borrowing Cost", format: "currency" },
      { key: "effectiveAnnualRate", label: "Effective Annual Cost", format: "percentage" },
      { key: "marginCallPrice", label: "Margin Call Price", format: "currency" },
      { key: "liquidationPrice", label: "Liquidation Price", format: "currency", highlight: true },
      { key: "priceDropToLiquidationPercent", label: "Price Drop to Liquidation", format: "percentage" },
    ],
    instructions:
      "Crypto-backed loans let you borrow cash against your coins without selling them (and without a taxable sale). " +
      "Lenders typically allow a starting LTV of 30–50%. If the coin's price falls and the LTV rises to the margin call " +
      "level, you must add collateral or repay; at the liquidation LTV the lender sells your coins.\n\n" +
      "Some lenders rehypothecate (lend out) your collateral — a risk if the lender fails.",
    examples:
      "Example: borrowing $20,000 against 0.75 coins worth $45,000 is a 44.44% LTV. Interest and the " +
      "origination fee cost $2,600. A margin call comes at $38,095.24 and liquidation at $32,128.51 — a " +
      "46.45% drop.",
    assumptions:
      "Interest-only loan repaid at the end; interest doesn't add to the balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a crypto-backed loan taxable?",
        answer: "Borrowing isn't a taxable event, but a liquidation counts as selling your coins and can create a capital gain or loss.",
      },
    ],
  },
];

// Crypto Calculators (and its sub-categories) are created on first use, under
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
