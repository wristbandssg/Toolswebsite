// One-time (but safe to re-run) batch setup script: creates the Tax, Custody, Security & Speculation tools
// (10) of the Crypto Calculators expansion, filed under Crypto
// Calculators > Crypto Market, Tax & Security Calculators (both categories are created on first run).
// See src/lib/calc-engine-crypto-tax-security.ts for the math and
// src/lib/calc-engine-crypto-trading.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-crypto-tax-security-calculators.ts
// or
//   npm run db:create-crypto-tax-security-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Crypto Calculators", slug: "crypto-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Crypto Market, Tax & Security Calculators", slug: "crypto-market-tax-security-calculators" };

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
    slug: "crypto-tax-loss-harvesting-calculator",
    title: "Crypto Tax-Loss Harvesting Calculator",
    description: "Estimate the tax you save by selling crypto at a loss to offset gains and up to $3,000 of income — and whether the wash sale rule applies to what you hold.",
    metaTitle: "Crypto Tax-Loss Harvesting Calculator — Wash Sale Rule",
    metaDescription: "Free crypto tax-loss harvesting calculator. Estimate tax savings from crypto losses and check the wash sale rule for 2026.",
    calcInputs: [
      currencyField("unrealizedLoss", "Loss If You Sell Now", { default: 8000, max: 100000000, step: 100 }),
      currencyField("realizedGains", "Capital Gains Already Realized This Year", { default: 5000, max: 100000000, step: 100 }),
      percentField("gainsRatePercent", "Tax Rate on Those Gains", { default: 24, max: 50, step: 1 }),
      percentField("ordinaryRatePercent", "Ordinary Income Tax Rate", { default: 24, max: 50, step: 1 }),
      {
        key: "assetType", label: "What You're Selling", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Crypto Coins or Tokens", value: 1 },
          { label: "Crypto ETF or Crypto Stock", value: 2 },
        ],
      },
      {
        key: "rebuyWithin30Days", label: "Buying It Back Within 30 Days?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Tax Saved This Year", format: "currency" },
    calcResults: [
      { key: "lossAllowedNow", label: "Loss Allowed Now", format: "currency" },
      { key: "gainsOffset", label: "Gains Offset", format: "currency" },
      { key: "ordinaryIncomeOffset", label: "Ordinary Income Offset", format: "currency" },
      { key: "carryforward", label: "Loss Carried Forward", format: "currency" },
      { key: "taxSavedThisYear", label: "Tax Saved This Year", format: "currency", highlight: true },
      { key: "lossDisallowedByWashSale", label: "Loss Disallowed by Wash Sale Rule", format: "currency" },
    ],
    instructions:
      "Selling crypto that's down locks in a capital loss, which first offsets your capital gains, then up to $3,000 of " +
      "ordinary income a year; the rest carries forward to future years.\n\n" +
      "As of October 2026 the US wash sale rule applies to stocks and securities — including crypto ETFs — but not to " +
      "crypto coins themselves, so you can sell and buy back right away and keep the loss. Congress has proposed changing " +
      "this, so check the rules for the year you sell.",
    examples:
      "Example: selling crypto at an $8,000 loss offsets $5,000 of gains and $3,000 of income, saving about " +
      "$1,920 in tax this year — even if you buy the coins straight back.",
    assumptions:
      "Single tax rate per type; short- vs long-term netting simplified. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does buying back crypto reset my cost basis?",
        answer: "Yes — the new purchase has a new, lower basis, so you'll owe more tax later if the price recovers. Harvesting defers tax rather than erasing it.",
      },
    ],
  },
  {
    slug: "crypto-donation-tax-calculator",
    title: "Crypto Donation Tax Value Calculator",
    description: "Estimate the tax benefit of donating appreciated crypto to charity — the deduction plus capital gains tax avoided — under 2026 rules, and how it compares with selling first.",
    metaTitle: "Crypto Donation Tax Calculator — Donate Bitcoin to Charity",
    metaDescription: "Free crypto donation calculator. Estimate the 2026 deduction and capital gains tax avoided by donating crypto to charity.",
    calcInputs: [
      currencyField("cryptoValue", "Value of Crypto Donated", { default: 10000, max: 100000000, step: 100 }),
      currencyField("costBasis", "Your Cost Basis", { default: 2000, max: 100000000, step: 100 }),
      {
        key: "longTerm", label: "Held More Than One Year?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        key: "itemizes", label: "Do You Itemize Deductions?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      percentField("marginalRatePercent", "Your Income Tax Bracket", { default: 32, max: 37, step: 1 }),
      percentField("capitalGainsRatePercent", "Long-Term Capital Gains Rate", { default: 15, max: 23.8, step: 0.1 }),
      currencyField("agi", "Adjusted Gross Income", { default: 200000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Total Tax Benefit", format: "currency" },
    calcResults: [
      { key: "deductionAmount", label: "Charitable Deduction", format: "currency" },
      { key: "taxSavedByDeduction", label: "Tax Saved by the Deduction", format: "currency" },
      { key: "capitalGainsTaxAvoided", label: "Capital Gains Tax Avoided", format: "currency" },
      { key: "totalTaxBenefit", label: "Total Tax Benefit", format: "currency", highlight: true },
      { key: "effectiveCostOfGift", label: "Effective Cost of Your Gift", format: "currency" },
      { key: "extraBenefitVsSellingFirst", label: "Extra Benefit vs Selling and Donating Cash", format: "currency" },
    ],
    instructions:
      "Donating crypto held over a year directly to a qualified charity lets you deduct its full market value (up to " +
      "30% of AGI for public charities) and never pay tax on the gain. Short-term holdings deduct only their cost basis. " +
      "From 2026, itemizers can deduct only giving above 0.5% of AGI.\n\n" +
      "Donations of crypto over $5,000 need a qualified appraisal. Non-itemizers' new $1,000/$2,000 deduction covers " +
      "cash gifts, not crypto.",
    examples:
      "Example: donating $10,000 of crypto bought for $2,000 gives a $9,000 deduction (saving $2,880) and avoids " +
      "$1,200 of capital gains tax — $4,080 in all, so the gift effectively costs you $5,920.",
    assumptions:
      "Gift to a public charity; the 35% benefit cap for the top bracket and state taxes not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I donate crypto that has lost value?",
        answer: "No — sell it first to claim the capital loss, then donate the cash.",
      },
    ],
  },
  {
    slug: "crypto-tax-software-savings-calculator",
    title: "Crypto Tax Software Cost Savings Calculator",
    description: "Compare crypto tax software with reconciling transactions by hand or through an accountant, including the time saved and extra losses the software finds.",
    metaTitle: "Crypto Tax Software Calculator — Is It Worth It",
    metaDescription: "Free calculator comparing crypto tax software with manual or CPA reconciliation, including time saved and losses found.",
    calcInputs: [
      currencyField("softwareCost", "Software Plan Cost", { default: 199, max: 10000, step: 10 }),
      currencyField("cpaRate", "Accountant's Hourly Rate", { default: 200, max: 2000, step: 10 }),
      numberField("cpaHoursManual", "Accountant Hours Without Software", { default: 10, min: 0, max: 500, step: 1 }),
      currencyField("yourHourlyValue", "Value of Your Time per Hour", { default: 40, max: 1000, step: 5 }),
      numberField("yourHoursManual", "Your Hours Without Software", { default: 15, min: 0, max: 500, step: 1 }),
      numberField("yourHoursWithSoftware", "Your Hours with Software", { default: 2, min: 0, max: 500, step: 0.5 }),
      currencyField("extraLossesFound", "Extra Losses the Software Finds", { default: 500, max: 10000000, step: 50, required: false }),
      percentField("taxRatePercent", "Tax Rate", { default: 24, max: 50, step: 1 }),
    ],
    calcResult: { label: "Total Benefit", format: "currency" },
    calcResults: [
      { key: "manualCost", label: "Cost Without Software", format: "currency" },
      { key: "softwareRouteCost", label: "Cost with Software", format: "currency" },
      { key: "timeAndFeeSavings", label: "Time & Fee Savings", format: "currency" },
      { key: "taxSavedFromLossesFound", label: "Tax Saved from Losses Found", format: "currency" },
      { key: "totalBenefit", label: "Total Benefit", format: "currency", highlight: true },
    ],
    instructions:
      "Every trade, swap, staking reward and transfer must be tracked with its cost basis. Tax software imports exchange " +
      "and wallet data, matches transfers and produces Form 8949, which takes far less time than reconciling by hand. " +
      "From 2025, US brokers report sales on Form 1099-DA, but transfers between wallets still need matching.\n\n" +
      "Plans are priced by number of transactions.",
    examples:
      "Example: reconciling by hand would cost about $2,600 in accountant fees and your time, versus $279 with software — saving " +
      "$2,321, plus $120 from losses it finds.",
    assumptions:
      "Your time valued at the hourly rate entered. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is crypto tax software tax-deductible?",
        answer: "For individuals, tax preparation costs generally aren't deductible federally; for a business, they usually are.",
      },
    ],
  },
  {
    slug: "crypto-cold-storage-cost-calculator",
    title: "Crypto Cold Storage Setup Cost Calculator",
    description: "Estimate the cost of a cold storage setup — hardware wallets, multi-signature devices, seed backups and service fees — compare wallet prices, and weigh it against exchange risk.",
    metaTitle: "Crypto Cold Storage Cost Calculator — Hardware & Multisig",
    metaDescription: "Free cold storage calculator. Cost out hardware wallets, multisig setups and backups, and compare with exchange risk.",
    calcInputs: [
      currencyField("devicePrice", "Hardware Wallet Price", { default: 149, max: 5000, step: 1 }),
      numberField("devices", "Number of Devices (e.g., 3 for 2-of-3 Multisig)", { default: 1, min: 1, max: 15, step: 1 }),
      currencyField("backupPerDevice", "Seed Backup per Device (Steel Plate)", { default: 50, max: 1000, step: 5 }),
      currencyField("setupFee", "Multisig Setup / Concierge Fee", { default: 0, max: 50000, step: 50, required: false }),
      currencyField("yearlyServiceFee", "Yearly Multisig Service Fee", { default: 0, max: 50000, step: 50, required: false }),
      currencyField("cheaperDevicePrice", "Cheaper Wallet Price (for Comparison)", { default: 79, max: 5000, step: 1 }),
      currencyField("holdingsValue", "Value of Crypto to Store", { default: 50000, max: 1e12, step: 1000 }),
      percentField("exchangeRiskPercent", "Yearly Chance of Losing Coins on an Exchange", { default: 1, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Upfront Cost", format: "currency" },
    calcResults: [
      { key: "upfrontCost", label: "Upfront Cost", format: "currency", highlight: true },
      { key: "firstYearCost", label: "First-Year Cost", format: "currency" },
      { key: "costAsShareOfHoldings", label: "Cost as % of Holdings", format: "percentage" },
      { key: "expectedYearlyLossAvoided", label: "Expected Yearly Loss Avoided", format: "currency" },
      { key: "paybackMonths", label: "Payback (Months)", format: "number" },
      { key: "savingsWithCheaperDevice", label: "Savings with the Cheaper Wallet", format: "currency" },
    ],
    instructions:
      "Cold storage keeps your private keys offline on hardware wallets, out of reach of exchange failures and most " +
      "hacks. A multi-signature setup needs several keys (such as 2 of 3) to move funds, so losing or compromising one " +
      "device isn't fatal. Back up each seed phrase on durable material and store it safely.\n\n" +
      "Buy hardware wallets only from the maker or authorized sellers — never second-hand.",
    examples:
      "Example: one $149 hardware wallet with a steel backup costs $199 — 0.40% of $50,000 — and pays for itself " +
      "in about 4.78 months against a 1% yearly exchange risk.",
    assumptions:
      "Exchange risk is a simple yearly expected loss. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if my hardware wallet breaks?",
        answer: "Your coins are safe if you have the seed phrase — restore it on a new device. Without the seed phrase, they may be lost forever.",
      },
    ],
  },
  {
    slug: "crypto-custody-fee-calculator",
    title: "Crypto Custody Fee Cost Calculator",
    description: "Compare the long-run cost of a crypto custodian's fees with self-custody and a spot crypto ETF for the same holdings.",
    metaTitle: "Crypto Custody Fee Calculator — Custodian vs Self-Custody",
    metaDescription: "Free crypto custody fee calculator. Compare custodian fees with self-custody and spot ETF expense ratios over time.",
    calcInputs: [
      currencyField("holdingsValue", "Value of Holdings", { default: 1000000, max: 1e12, step: 10000 }),
      percentField("custodyFeePercent", "Custodian Fee per Year", { default: 0.5, max: 5, step: 0.05 }),
      numberField("years", "Years", { default: 5, min: 0, max: 50, step: 1 }),
      currencyField("selfCustodySetup", "Self-Custody Setup Cost", { default: 1500, max: 1000000, step: 100 }),
      currencyField("selfCustodyYearly", "Self-Custody Yearly Cost", { default: 500, max: 1000000, step: 50 }),
      percentField("etfExpensePercent", "Spot ETF Expense Ratio", { default: 0.25, max: 3, step: 0.01 }),
    ],
    calcResult: { label: "Savings with Self-Custody", format: "currency" },
    calcResults: [
      { key: "yearlyCustodyFee", label: "Yearly Custody Fee", format: "currency" },
      { key: "custodianTotal", label: "Custodian Total", format: "currency" },
      { key: "selfCustodyTotal", label: "Self-Custody Total", format: "currency" },
      { key: "spotEtfTotal", label: "Spot ETF Total", format: "currency" },
      { key: "savingsWithSelfCustody", label: "Savings with Self-Custody", format: "currency", highlight: true },
    ],
    instructions:
      "Qualified custodians hold crypto for funds, companies and wealthy individuals, usually for a yearly fee based on " +
      "assets, with insurance and audits. Self-custody costs little but puts security entirely on you. A spot Bitcoin or " +
      "Ether ETF is another way to hold exposure without managing keys.\n\n" +
      "Fees are based on today's value; if holdings grow, percentage fees grow too.",
    examples:
      "Example: holding $1,000,000 with a 0.50% custodian costs $25,000 over 5 years, versus $4,000 to self-custody " +
      "and $12,500 in a spot ETF.",
    assumptions:
      "Holdings value constant. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a crypto custodian insured?",
        answer: "Many carry crime insurance, but coverage limits are often far below total assets held — read the details.",
      },
    ],
  },
  {
    slug: "crypto-exchange-custodial-risk-calculator",
    title: "Crypto Exchange Custodial Risk Calculator",
    description: "Estimate the expected loss of keeping crypto on an exchange — the chance it fails, how much bankruptcy recovery and insurance funds might return — and the case for self-custody.",
    metaTitle: "Crypto Exchange Risk Calculator — Expected Loss",
    metaDescription: "Free crypto exchange risk calculator. Estimate expected loss from exchange failure after recovery and insurance coverage.",
    calcInputs: [
      currencyField("balance", "Balance on the Exchange", { default: 20000, max: 1e12, step: 500 }),
      percentField("failureChancePercent", "Yearly Chance the Exchange Fails", { default: 2, max: 100, step: 0.25 }),
      percentField("recoveryPercent", "Share Recovered in Bankruptcy", { default: 30, max: 100, step: 5 }),
      percentField("insuranceCoveragePercent", "Share Covered by an Insurance Fund", { default: 0, max: 100, step: 5, required: false }),
      numberField("years", "Years", { default: 3, min: 0, max: 50, step: 1 }),
      currencyField("selfCustodyCost", "Self-Custody Cost (Hardware Wallet)", { default: 150, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Expected Loss over the Years", format: "currency" },
    calcResults: [
      { key: "lossIfExchangeFails", label: "Loss If the Exchange Fails", format: "currency" },
      { key: "chanceOfFailureOverYears", label: "Chance of Failure over the Years", format: "percentage" },
      { key: "expectedLossPerYear", label: "Expected Loss per Year", format: "currency" },
      { key: "expectedLossOverYears", label: "Expected Loss over the Years", format: "currency", highlight: true },
      { key: "benefitOfSelfCustody", label: "Benefit of Self-Custody", format: "currency" },
    ],
    instructions:
      "Coins left on an exchange are an IOU from that exchange. Mt. Gox and FTX showed that customers can wait years and " +
      "recover only part of their funds. Some exchanges keep insurance funds or proof-of-reserves, which help but don't " +
      "guarantee repayment. Crypto on exchanges isn't FDIC- or SIPC-insured.\n\n" +
      "Your own probability estimate drives the result — choose regulated, transparent exchanges and withdraw what you don't trade.",
    examples:
      "Example: keeping $20,000 on an exchange with a 2% yearly failure risk and 30% recovery means an expected loss of " +
      "$823.31 over 3 years — far more than a $150 hardware wallet.",
    assumptions:
      "Independent yearly failure chance; hacks of your own accounts not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is proof of reserves?",
        answer: "An exchange's cryptographic evidence that it holds customer assets — useful, but it may not show its liabilities in full.",
      },
    ],
  },
  {
    slug: "crypto-scam-loss-calculator",
    title: "Crypto Scam Loss Estimate Calculator",
    description: "Estimate your yearly exposure to crypto scams — phishing and wallet drainers, dust attacks and rug pulls — from what you hold and how risky your activity is.",
    metaTitle: "Crypto Scam Loss Calculator — Phishing, Dust & Rug Pulls",
    metaDescription: "Free crypto scam risk calculator. Estimate expected losses from phishing, dust attacks and rug pulls on your holdings.",
    calcInputs: [
      currencyField("hotWalletValue", "Value in Hot Wallets", { default: 15000, max: 1e12, step: 500 }),
      percentField("phishingChancePercent", "Yearly Chance of a Phishing / Drainer Attack", { default: 2, max: 100, step: 0.5 }),
      percentField("dustScamChancePercent", "Yearly Chance of Falling for a Dust-Attack Follow-Up", { default: 0.5, max: 100, step: 0.25 }),
      currencyField("newTokenHoldings", "Value in New or Unaudited Tokens", { default: 3000, max: 1e12, step: 100 }),
      percentField("rugPullChancePercent", "Chance Those Tokens Rug Pull", { default: 20, max: 100, step: 5 }),
      percentField("rugPullLossPercent", "Value Lost in a Rug Pull", { default: 95, max: 100, step: 5 }),
    ],
    calcResult: { label: "Total Expected Yearly Loss", format: "currency" },
    calcResults: [
      { key: "expectedPhishingLoss", label: "Expected Phishing Loss", format: "currency" },
      { key: "expectedDustAttackLoss", label: "Expected Dust-Attack Loss", format: "currency" },
      { key: "expectedRugPullLoss", label: "Expected Rug-Pull Loss", format: "currency" },
      { key: "totalExpectedYearlyLoss", label: "Total Expected Yearly Loss", format: "currency", highlight: true },
      { key: "worstCaseLoss", label: "Worst-Case Loss", format: "currency" },
    ],
    instructions:
      "Phishing sites and malicious approvals can drain a wallet in one signature. Dust attacks send tiny amounts to " +
      "track you or lure you to scam sites. Rug pulls are new tokens whose creators vanish with the liquidity.\n\n" +
      "Cut the risk by keeping most funds in cold storage, checking every URL and approval, revoking old token approvals " +
      "and never sharing a seed phrase. In the US, personal scam and theft losses are generally not tax-deductible.",
    examples:
      "Example: with $15,000 in hot wallets and $3,000 in new tokens, the expected yearly loss is about $945 — mostly " +
      "$570 from rug-pull risk.",
    assumptions:
      "Your probability estimates; each risk is independent. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I move dust I received?",
        answer: "No — leave unknown tokens alone and never visit links or sites they point to; interacting is how the scam starts.",
      },
    ],
  },
  {
    slug: "crypto-wallet-recovery-cost-calculator",
    title: "Crypto Wallet Recovery Cost Estimate Calculator",
    description: "Estimate whether paying a wallet recovery service to regain a lost password or partial seed is worth it — their success fee, the chance of success and your expected value.",
    metaTitle: "Crypto Wallet Recovery Cost Calculator — Is It Worth It",
    metaDescription: "Free wallet recovery calculator. Weigh a recovery service's fee and success chance against your locked wallet's value.",
    calcInputs: [
      currencyField("walletValue", "Value Locked in the Wallet", { default: 40000, max: 1e12, step: 500 }),
      percentField("successFeePercent", "Recovery Service Success Fee", { default: 20, max: 100, step: 1 }),
      percentField("successChancePercent", "Chance of Successful Recovery", { default: 30, max: 100, step: 5 }),
      currencyField("upfrontFee", "Upfront Fee (Avoid Services That Require One)", { default: 0, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Expected Value of Trying", format: "currency" },
    calcResults: [
      { key: "feeIfSuccessful", label: "Fee If Successful", format: "currency" },
      { key: "youKeepIfSuccessful", label: "You Keep If Successful", format: "currency" },
      { key: "expectedValueOfTrying", label: "Expected Value of Trying", format: "currency", highlight: true },
    ],
    instructions:
      "Legitimate recovery services can sometimes brute-force a forgotten wallet password or reconstruct a seed phrase " +
      "with a few missing or wrong words, usually charging 10–20% only if they succeed. They can't recover coins sent to " +
      "the wrong address or stolen by scammers.\n\n" +
      "\"Recovery\" offers that promise to get back stolen crypto, or demand upfront fees, are almost always scams.",
    examples:
      "Example: recovering a $40,000 wallet for a 20% fee leaves you $32,000. With a 30% chance, trying is worth " +
      "about $9,600 on average.",
    assumptions:
      "Your estimate of the success chance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I recover crypto sent to the wrong address?",
        answer: "Generally no — blockchain transactions can't be reversed unless the recipient sends it back.",
      },
    ],
  },
  {
    slug: "crypto-sports-betting-payout-calculator",
    title: "Crypto Sports Betting Payout Comparison Calculator",
    description: "Compare the payout of a bet at a crypto sportsbook with a regular sportsbook at their American odds, after crypto deposit and withdrawal costs.",
    metaTitle: "Crypto Sports Betting Calculator — Payout Comparison",
    metaDescription: "Free crypto sports betting calculator. Compare payouts and implied odds at crypto and regular sportsbooks after fees.",
    calcInputs: [
      currencyField("stake", "Stake", { default: 100, max: 1000000, step: 5 }),
      numberField("cryptoOdds", "Crypto Sportsbook Odds (American)", { default: 150, min: -10000, max: 10000, step: 5 }),
      numberField("regularOdds", "Regular Sportsbook Odds (American)", { default: 140, min: -10000, max: 10000, step: 5 }),
      percentField("depositFeePercent", "Crypto Deposit & Conversion Cost", { default: 1, max: 10, step: 0.1 }),
      currencyField("withdrawalFee", "Crypto Withdrawal Fee", { default: 5, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Difference If You Win", format: "currency" },
    calcResults: [
      { key: "cryptoBookNetProfit", label: "Crypto Sportsbook Net Profit", format: "currency" },
      { key: "regularBookProfit", label: "Regular Sportsbook Profit", format: "currency" },
      { key: "differenceIfYouWin", label: "Difference If You Win", format: "currency", highlight: true },
      { key: "cryptoImpliedProbability", label: "Crypto Odds Implied Probability", format: "percentage" },
      { key: "regularImpliedProbability", label: "Regular Odds Implied Probability", format: "percentage" },
    ],
    instructions:
      "American odds of +150 pay $150 profit on a $100 stake; −150 means you stake $150 to win $100. Better odds at one " +
      "book can be wiped out by crypto deposit, conversion and withdrawal costs.\n\n" +
      "Many crypto sportsbooks are offshore and unlicensed where you live, which can leave you without protection if " +
      "they refuse to pay. Gambling winnings are taxable. If gambling stops being fun, call 1-800-GAMBLER.",
    examples:
      "Example: a $100 bet at +150 at a crypto book nets $144 after fees, versus $140 at +140 — $4 more if it wins.",
    assumptions:
      "Coin price unchanged while the bet is open. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is betting with crypto legal in the US?",
        answer: "Only through sportsbooks licensed in your state; most crypto sportsbooks aren't licensed in the US.",
      },
    ],
  },
  {
    slug: "prediction-market-return-calculator",
    title: "Prediction Market Return Calculator",
    description: "Calculate the payout, profit and expected value of a prediction market position from the share price, your own probability estimate and fees.",
    metaTitle: "Prediction Market Calculator — Payout & Expected Value",
    metaDescription: "Free prediction market calculator. Find shares, profit if right, loss if wrong and expected value at your probability.",
    calcInputs: [
      currencyField("sharePrice", "Share Price (Pays $1 If Right)", { default: 0.4, max: 0.99, step: 0.01 }),
      currencyField("amount", "Amount Invested", { default: 400, max: 100000000, step: 10 }),
      percentField("feeOnProfitPercent", "Fee on Winnings", { default: 2, max: 20, step: 0.5, required: false }),
      percentField("yourProbabilityPercent", "Your Probability It Happens", { default: 55, max: 100, step: 1 }),
      numberField("days", "Days Until Resolution", { default: 90, min: 1, max: 3650, step: 1 }),
    ],
    calcResult: { label: "Expected Value", format: "currency" },
    calcResults: [
      { key: "shares", label: "Shares Bought", format: "number" },
      { key: "impliedProbability", label: "Market's Implied Probability", format: "percentage" },
      { key: "profitIfRight", label: "Profit If Right", format: "currency" },
      { key: "lossIfWrong", label: "Loss If Wrong", format: "currency" },
      { key: "expectedValue", label: "Expected Value", format: "currency", highlight: true },
      { key: "expectedReturnPercent", label: "Expected Return", format: "percentage" },
      { key: "annualizedExpectedReturn", label: "Annualized Expected Return", format: "percentage" },
    ],
    instructions:
      "In a prediction market, each share pays $1 if an event happens and nothing if it doesn't, so the price is the " +
      "market's implied probability. You have an edge only if your own probability is better informed than the market's.\n\n" +
      "Positive expected value can still lose — it's an average over many bets. Availability and regulation vary by " +
      "country and state.",
    examples:
      "Example: $400 at $0.40 a share buys 1,000 shares. If right, you profit $588; if wrong, you lose $400. At your " +
      "55% estimate the expected value is $143.40.",
    assumptions:
      "Held to resolution; fees charged on winnings. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I sell before the market resolves?",
        answer: "Usually yes — at whatever price other traders will pay, which lets you take profits or cut losses early.",
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
