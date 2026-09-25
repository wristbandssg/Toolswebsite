// One-time (but safe to re-run) batch setup script: creates 10 more Tools
// under the EXISTING "New Zealand Tax & Salary Calculators" category (slug
// "new-zealand-tax-salary-calculators", created by
// create-new-zealand-tax-tool.ts — this script does NOT create the
// category; it fails loudly if it's missing).
//
// See src/lib/calc-engine-newzealand-extended-calculators.ts for the
// actual math and which of its exported functions each of these 10 slugs
// maps to, and that file's header for the ird.govt.nz/acc.co.nz source of
// every 2026/27 figure used — including why "Capital Gains Tax" and
// "Payroll Tax" are honestly reframed (NZ has no general CGT and no
// separate payroll tax) rather than inventing either.
//
// HOW TO RUN
//   npx tsx prisma/create-new-zealand-extended-calculators.ts
// or
//   npm run db:create-new-zealand-extended-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "new-zealand-tax-salary-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function nzdField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit ?? "NZD",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 300000,
    step: opts.step ?? 500,
  };
}

function nzdResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", currency: "NZD", unit: opts.unit, highlight: opts.highlight };
}

function percentResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "percentage", highlight: opts.highlight };
}

function yesNoField(key: string, label: string, opts: { defaultYes?: boolean } = {}) {
  return {
    key,
    label,
    type: "dropdown",
    required: true,
    default: opts.defaultYes ? 1 : 0,
    options: [
      { label: "No", value: 0 },
      { label: "Yes", value: 1 },
    ],
  };
}

const industryTierField = {
  key: "industryTier",
  label: "Industry Risk Level (ACC Classification)",
  type: "dropdown",
  required: true,
  default: 0,
  options: [
    { label: "Low risk (e.g. office administration)", value: 0 },
    { label: "Medium risk (e.g. hairdressing/personal services)", value: 1 },
    { label: "High risk (e.g. building/construction)", value: 2 },
  ],
};

const NZ_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified accountant or Inland Revenue (IRD).";

const NO_CGT_NOTE =
  "New Zealand has no general capital gains tax. The bright-line test is a narrow, date-based exception for " +
  "residential property only — it doesn't apply to shares, most other investments, or property held outside " +
  "the bright-line window.";

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
  // -------------------------------------------------------------------
  // 1. New Zealand PAYE Calculator (secondary income)
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-paye-calculator",
    title: "New Zealand PAYE Calculator",
    description: "Calculate PAYE on a main job plus secondary (second job) income, using the correct secondary tax code rate.",
    metaTitle: "New Zealand PAYE Calculator — Free & Instant",
    metaDescription:
      "Free NZ PAYE calculator for a second job. Enter your main and secondary income to see the correct " +
      "secondary tax code rate and total PAYE.",
    calcInputs: [
      nzdField("mainJobIncome", "Main Job Annual Income", { unit: "NZD/year", max: 250000 }),
      nzdField("secondaryJobIncome", "Secondary (Second Job) Annual Income", { unit: "NZD/year", max: 150000 }),
      {
        key: "payFrequency",
        label: "Pay Frequency (Secondary Job)",
        type: "dropdown",
        required: true,
        default: 26,
        options: [
          { label: "Weekly (52 payments/year)", value: 52 },
          { label: "Fortnightly (26 payments/year)", value: 26 },
          { label: "Monthly (12 payments/year)", value: 12 },
        ],
      },
    ],
    calcResult: { label: "Total PAYE (Both Jobs)", format: "currency", currency: "NZD" },
    calcResults: [
      nzdResult("primaryTaxAnnual", "PAYE on Main Job"),
      percentResult("secondaryTaxRate", "Secondary Tax Code Rate"),
      nzdResult("secondaryTaxAnnual", "PAYE on Secondary Job"),
      nzdResult("totalTaxAnnual", "Total PAYE (Both Jobs)", { highlight: true }),
      nzdResult("totalNetAnnual", "Total Net Annual Income"),
    ],
    instructions:
      "Enter your main job's annual income and your secondary (second) job's annual income. When you have more " +
      "than one job, IRD requires your secondary employer to withhold tax at a FLAT rate — the \"secondary tax " +
      "code\" rate — based on your COMBINED income from both jobs, since your main job's PAYE already uses up " +
      "the lower tax brackets.\n\n" +
      "This calculator works out your combined income, determines the correct secondary rate (SB 10.5%, S " +
      "17.5%, SH 30%, ST 33%, or SA 39%), and shows PAYE on each job plus your total net income.",
    examples:
      "Example: a $70,000 main job plus a $20,000 secondary job ($90,000 combined) falls in the ST/33% " +
      "secondary band — $13,220.50 PAYE on the main job plus $6,600.00 on the secondary job (33% flat) — " +
      "$19,820.50 total tax, leaving $70,179.50 net for the year, or $2,699.21 net per fortnight on the " +
      "secondary job's pay.",
    assumptions:
      "This calculator uses confirmed 2026/27 PAYE brackets and secondary tax code thresholds from ird.govt.nz. " +
      "It assumes you've correctly notified your secondary employer of the right tax code (using an IR330) — " +
      "using the WRONG secondary code (or no code at all, which defaults to a higher no-notification rate) can " +
      "result in over- or under-withholding, settled when you file. It doesn't include ACC earner levy, " +
      "KiwiSaver, or student loan repayments — see the ACC Levy and KiwiSaver Tax Calculators on this site for " +
      "those separately.\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "Why is my secondary job taxed at a flat rate instead of progressively?",
        answer:
          "Because your main employer already applies the progressive brackets up to your main job's income " +
          "level — if your secondary employer used the same progressive brackets independently, you'd be taxed " +
          "as if each job were your only income, under-withholding significantly. The flat secondary rate " +
          "approximates the marginal rate your combined income actually sits in.",
      },
      {
        question: "What if I don't tell my secondary employer my tax code?",
        answer:
          "Your secondary employer must withhold at a higher \"no notification\" rate (45%) if you don't provide " +
          "a correctly completed IR330 — always notify your secondary employer of your correct tax code to avoid " +
          "over-withholding.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 2. New Zealand GST Calculator
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-gst-calculator",
    title: "New Zealand GST Calculator",
    description: "Add or extract New Zealand's 15% Goods and Services Tax (GST) from a price.",
    metaTitle: "New Zealand GST Calculator — Free & Instant",
    metaDescription: "Free NZ GST calculator. Add 15% GST to a price or extract it from a GST-inclusive price.",
    calcInputs: [
      nzdField("amount", "Amount", { unit: "NZD", max: 500000, step: 10 }),
      yesNoField("isGstInclusive", "Is the Amount Already GST-Inclusive?"),
    ],
    calcResult: { label: "GST Amount", format: "currency", currency: "NZD" },
    calcResults: [
      nzdResult("netAmount", "Net Amount (Excluding GST)"),
      nzdResult("gstAmount", "GST Amount (15%)", { highlight: true }),
      nzdResult("grossAmount", "Gross Amount (Including GST)"),
    ],
    instructions:
      "Enter an amount and say whether it already includes GST. New Zealand charges a single flat 15% GST rate " +
      "on almost all goods and services, with no reduced rates or multiple bands.",
    examples: "Example: a $1,000 price with 15% GST added owes $150.00 in GST, for a $1,150.00 GST-inclusive total.",
    assumptions:
      "This calculator uses the current flat 15% GST rate confirmed via ird.govt.nz, with no change identified " +
      "for 2026/27. GST registration is compulsory once your turnover exceeds $60,000 in a 12-month period.\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "Are there reduced GST rates for anything?",
        answer:
          "No — unlike many countries, New Zealand applies one flat 15% rate to nearly everything, with only a " +
          "small number of specific exemptions (like financial services and residential rent), not a reduced " +
          "rate band.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 3. New Zealand ACC Levy Calculator
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-acc-levy-calculator",
    title: "New Zealand ACC Levy Calculator",
    description: "Calculate your ACC Earner Levy, and Work Levy if self-employed, for the 2026/27 year.",
    metaTitle: "New Zealand ACC Levy Calculator — Free & Instant",
    metaDescription:
      "Free NZ ACC levy calculator. Enter your earnings to see your 2026/27 ACC Earner Levy and, if " +
      "self-employed, your Work Levy.",
    calcInputs: [
      nzdField("annualEarnings", "Annual Earnings", { unit: "NZD/year", max: 250000 }),
      yesNoField("isSelfEmployed", "Are You Self-Employed?"),
      industryTierField,
    ],
    calcResult: { label: "Total ACC Levy", format: "currency", currency: "NZD" },
    calcResults: [
      nzdResult("liableEarnings", "Liable Earnings"),
      nzdResult("earnerLevy", "Earner Levy (1.52%)"),
      nzdResult("workLevy", "Work Levy (Self-Employed Only)"),
      nzdResult("workingSaferLevy", "Working Safer Levy"),
      nzdResult("totalLevy", "Total ACC Levy", { highlight: true }),
    ],
    instructions:
      "Enter your annual earnings and say whether you're self-employed. Every earner pays the ACC Earner Levy — " +
      "1.52% of earnings, capped at $156,641 of liable earnings for 2026/27. If you're self-employed, you also " +
      "pay a Work Levy (set by your industry's ACC Classification Unit) and the Working Safer Levy, both " +
      "invoiced by ACC after you file — an employee's equivalent Work Levy is instead paid by their EMPLOYER, " +
      "not deducted from their own pay.\n\n" +
      "The Work Levy varies hugely by industry (hundreds of published rates) — pick the risk tier closest to " +
      "your actual industry classification for a rough estimate, or check your exact rate in ACC's Levy " +
      "Guidebook.",
    examples:
      "Example: a self-employed earner with $90,000 of liable earnings in a medium-risk industry (e.g. " +
      "hairdressing) owes $1,368.00 Earner Levy, $1,107.00 Work Levy, and $72.00 Working Safer Levy — " +
      "$2,547.00 total.",
    assumptions:
      "This calculator uses confirmed 2026/27 ACC figures from the ACC Levy Guidebook and acc.co.nz: 1.52% " +
      "Earner Levy rate, $156,641 liable earnings cap, $50,501 minimum liable earnings for self-employed " +
      "standard cover, and $0.08 per $100 Working Safer Levy. Work Levy rates shown are REPRESENTATIVE examples " +
      "for three broad risk tiers, not your exact Classification Unit rate — self-employed visitors should " +
      "confirm their own CU rate with ACC for an exact figure.\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "Why don't employees pay a Work Levy?",
        answer:
          "An employee's Work Levy is paid by their EMPLOYER, based on the business's total payroll and industry " +
          "classification — not deducted from the employee's own pay, unlike the Earner Levy, which every worker " +
          "(employee or self-employed) pays themselves. See the New Zealand Payroll Tax Calculator on this site " +
          "for the employer side.",
        },
      {
        question: "What's my exact Work Levy rate?",
        answer:
          "It depends on your specific ACC Classification Unit (CU), of which there are hundreds, each with its " +
          "own published rate based on industry risk. Check ACC's current Levy Guidebook or your ACC invoice for " +
          "your exact CU and rate — this calculator's three tiers are illustrative examples only.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 4. New Zealand Self Employed Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-self-employed-tax-calculator",
    title: "New Zealand Self Employed Tax Calculator",
    description: "Calculate income tax plus ACC levies on your self-employed net profit.",
    metaTitle: "New Zealand Self Employed Tax Calculator — Free & Instant",
    metaDescription:
      "Free NZ self-employed tax calculator. Enter your net profit to see combined income tax and ACC levies " +
      "for 2026/27.",
    calcInputs: [
      nzdField("netProfit", "Net Profit (After Business Expenses)", { unit: "NZD/year", max: 250000 }),
      industryTierField,
    ],
    calcResult: { label: "Total Tax & Levies", format: "currency", currency: "NZD" },
    calcResults: [
      nzdResult("incomeTax", "Income Tax"),
      nzdResult("totalAccLevies", "Total ACC Levies"),
      nzdResult("totalTaxAndLevies", "Total Tax & Levies", { highlight: true }),
      nzdResult("netProfitAfterTax", "Net Profit After Tax & Levies"),
    ],
    instructions:
      "Enter your net self-employment profit for the year and your industry's rough risk tier. Self-employed " +
      "income is taxed at the same progressive rates as PAYE (10.5% to 39%), filed via an IR3, PLUS ACC's " +
      "Earner Levy, Work Levy, and Working Safer Levy — invoiced separately by ACC, not withheld automatically " +
      "like an employee's PAYE.",
    examples:
      "Example: $90,000 net profit in a medium-risk industry owes $19,577.50 income tax plus $2,547.00 in " +
      "combined ACC levies — $22,124.50 total, leaving $67,875.50 after tax and levies.",
    assumptions:
      "This calculator uses confirmed 2026/27 PAYE brackets and ACC figures (see the ACC Levy Calculator's " +
      "Assumptions for the Work Levy tier caveat). It doesn't include provisional tax timing (self-employed " +
      "taxpayers generally pay in installments throughout the year, not as one lump sum) or GST if you're " +
      "GST-registered — see the New Zealand GST Calculator for that separately.\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "Do I pay this all at once?",
        answer:
          "Not usually — once your residual income tax exceeds $60,000, IRD generally requires provisional tax " +
          "paid in installments throughout the year (usually three), based on your prior year's income, rather " +
          "than one lump sum at year-end. This calculator shows your total annual liability, not the payment " +
          "schedule.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 5. New Zealand Contractor Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-contractor-tax-calculator",
    title: "New Zealand Contractor Tax Calculator",
    description: "Calculate withholding tax on a schedular payment to a contractor, using your IR330C-elected rate.",
    metaTitle: "New Zealand Contractor Tax Calculator — Free & Instant",
    metaDescription:
      "Free NZ contractor tax calculator. Enter a contract payment to see withholding tax at your elected " +
      "IR330C rate, or the 45% no-notification rate.",
    calcInputs: [
      nzdField("contractPayment", "Contract Payment", { unit: "NZD", max: 200000, step: 500 }),
      yesNoField("hasFiledIr330c", "Have You Filed an IR330C With the Payer?", { defaultYes: true }),
      {
        key: "electedRate",
        label: "Elected Withholding Rate (If IR330C Filed)",
        type: "dropdown",
        required: true,
        default: 20,
        options: [
          { label: "10% (minimum elected rate)", value: 10 },
          { label: "15% (agricultural/horticultural contracts)", value: 15 },
          { label: "20% (standard rate — most contracting)", value: 20 },
          { label: "25%", value: 25 },
          { label: "30%", value: 30 },
          { label: "33% (company directors' fees)", value: 33 },
        ],
      },
    ],
    calcResult: { label: "Withheld Tax", format: "currency", currency: "NZD" },
    calcResults: [
      percentResult("withholdingRate", "Withholding Rate Applied"),
      nzdResult("withheldTax", "Withheld Tax", { highlight: true }),
      nzdResult("netPayment", "Net Payment to You"),
    ],
    instructions:
      "Enter your contract payment amount and say whether you've filed an IR330C tax rate notification with the " +
      "person paying you. Schedular payments (most contractor income) have withholding tax deducted at source, " +
      "like an employee's PAYE — but the RATE depends on whether you've told the payer your rate.\n\n" +
      "If you've filed an IR330C, choose your elected rate (20% is standard for most general contracting). If " +
      "you HAVEN'T filed one, payers must withhold at the higher 45% \"no notification\" rate — this calculator " +
      "applies that automatically when you select \"No\" above.",
    examples:
      "Example: a $15,000 contract payment with a 20% elected rate has $3,000.00 withheld, for $12,000.00 net — " +
      "the same $15,000 payment with NO IR330C on file has $6,750.00 withheld at the 45% no-notification rate, " +
      "for just $8,250.00 net.",
    assumptions:
      "This calculator uses confirmed IR330C schedular payment rates from ird.govt.nz, including the 45% " +
      "no-notification default. Withholding tax on schedular payments is an ADVANCE toward your final tax bill, " +
      "not necessarily your final liability — your actual tax is settled when you file, based on your total " +
      "annual income and expenses. It doesn't include ACC levies — see the ACC Levy Calculator for those " +
      "separately.\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "What's the minimum rate I can elect?",
        answer:
          "10% for most resident contractors (15% for certain non-resident contractors and some specific " +
          "activity types) — you can't elect a rate below that minimum, even if your actual tax liability would " +
          "be lower once your expenses are deducted.",
      },
      {
        question: "Is the withheld amount my final tax?",
        answer:
          "No — it's credited against your income tax liability when you file your IR3. If your allowable " +
          "business expenses bring your actual taxable profit below what was withheld on, you may get a refund; " +
          "if your total income across all sources is higher, you may owe more.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 6. New Zealand Rental Income Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-rental-income-tax-calculator",
    title: "New Zealand Rental Income Tax Calculator",
    description: "Calculate tax on your rental profit, with mortgage interest fully deductible for 2026/27.",
    metaTitle: "New Zealand Rental Income Tax Calculator — Free & Instant",
    metaDescription:
      "Free NZ rental income tax calculator. Enter your rental income and expenses to see tax on your rental " +
      "profit for 2026/27.",
    calcInputs: [
      nzdField("annualRentalIncome", "Annual Rental Income", { unit: "NZD/year", max: 150000 }),
      nzdField("mortgageInterest", "Mortgage Interest Paid", { unit: "NZD/year", max: 100000 }),
      nzdField("otherExpenses", "Other Allowable Expenses", { unit: "NZD/year", max: 50000 }),
      nzdField("otherTaxableIncome", "Other Taxable Income", { unit: "NZD/year", max: 250000 }),
    ],
    calcResult: { label: "Tax on Rental Profit", format: "currency", currency: "NZD" },
    calcResults: [
      nzdResult("rentalProfit", "Rental Profit (or Loss)"),
      nzdResult("taxOnRental", "Tax on Rental Profit", { highlight: true }),
      nzdResult("netRentalIncome", "Net Rental Income After Tax"),
      nzdResult("lossCarriedForward", "Loss Carried Forward (Ring-Fenced)"),
    ],
    instructions:
      "Enter your annual rental income, mortgage interest, other allowable expenses, and your other taxable " +
      "income. Mortgage interest on residential rental property is FULLY deductible again for 2026/27 — fully " +
      "restored from 1 April 2025 after being phased out and back in over 2021–2025.\n\n" +
      "Rental profit is added to your other income and taxed at your regular marginal rate. If expenses exceed " +
      "income, the resulting loss is \"ring-fenced\" — it can't reduce tax on your other income, only carry " +
      "forward against future rental profit.",
    examples:
      "Example: $24,000 rental income with $10,000 mortgage interest and $4,000 other expenses (against " +
      "$70,000 other income) has $10,000.00 rental profit, taxed at $3,057.00, leaving $6,943.00 net rental " +
      "income. A loss-making year instead ($18,000 income, $15,000 interest, $6,000 expenses) shows a " +
      "$3,000.00 loss carried forward, with $0.00 tax now.",
    assumptions:
      "This calculator uses the confirmed 2026/27 mortgage interest deductibility (100%, fully restored) and " +
      "residential loss ring-fencing rules, both from ird.govt.nz. It doesn't model the bright-line test on " +
      "eventual sale (see the New Zealand Capital Gains Tax Calculator) or depreciation on chattels/fit-out.\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "Can I use a rental loss to reduce tax on my salary?",
        answer:
          "No — residential rental losses are ring-fenced by IRD, meaning they can only be carried forward and " +
          "offset against FUTURE rental profit (from any residential property you own), not against your salary " +
          "or other income in the same year.",
      },
      {
        question: "Is mortgage interest fully deductible now?",
        answer:
          "Yes — after being phased down to 0% between 2021 and 2024 and then phased back in (80% for 2024/25), " +
          "mortgage interest on residential rental property has been 100% deductible again since 1 April 2025, " +
          "and remains so for the full 2026/27 year.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 7. New Zealand Dividend Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-dividend-tax-calculator",
    title: "New Zealand Dividend Tax Calculator",
    description: "Calculate tax on a dividend using New Zealand's imputation credit system.",
    metaTitle: "New Zealand Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free NZ dividend tax calculator. Enter your dividend and other income to see tax after imputation " +
      "credits.",
    calcInputs: [
      nzdField("cashDividend", "Cash Dividend Received", { unit: "NZD", max: 100000 }),
      nzdField("otherTaxableIncome", "Other Taxable Income", { unit: "NZD/year", max: 250000 }),
      yesNoField("isFullyImputed", "Is the Dividend Fully Imputed?", { defaultYes: true }),
    ],
    calcResult: { label: "Net Tax on Dividend", format: "currency", currency: "NZD" },
    calcResults: [
      nzdResult("grossedUpDividend", "Grossed-Up Dividend"),
      nzdResult("imputationCredit", "Imputation Credit Attached"),
      nzdResult("taxOnGrossedUp", "Tax on Grossed-Up Amount"),
      nzdResult("netTax", "Net Tax on Dividend", { highlight: true }),
      nzdResult("excessCreditForfeited", "Excess Credit Forfeited (Non-Refundable)"),
    ],
    instructions:
      "Enter your cash dividend, your other taxable income, and whether the dividend is fully imputed (check " +
      "your dividend statement). New Zealand companies pay 28% company tax, then can attach an imputation " +
      "credit to dividends reflecting that tax already paid — the dividend is \"grossed up\" to the pre-tax " +
      "amount, taxed at your marginal rate, and the imputation credit is subtracted.\n\n" +
      "Unlike Australia's franking credit system, NZ imputation credits are NOT refundable — if your credit " +
      "exceeds the tax the dividend generated (common for lower-income shareholders), the excess is simply " +
      "forfeited, not paid out in cash.",
    examples:
      "Example: a $5,000 fully-imputed cash dividend against $70,000 other income grosses up to $6,944.44, " +
      "taxed at $2,083.33 — minus a $1,944.44 imputation credit — for just $138.89 net tax. Against a lower " +
      "$10,000 other income instead, the $1,944.44 credit exceeds the $823.28 tax generated, forfeiting " +
      "$1,121.17 of unused credit (no cash refund).",
    assumptions:
      "This calculator uses the confirmed 28% company tax rate and 28:72 maximum imputation ratio from " +
      "ird.govt.nz. It assumes the dividend is fully imputed at the maximum ratio when you select \"Yes\" — a " +
      "partially imputed dividend would attach a smaller credit than shown here. It doesn't model Resident " +
      "Withholding Tax (RWT) deducted at source, which is a separate payment mechanism, not an additional tax.\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "Can I get a refund if my imputation credit is more than my tax?",
        answer:
          "No — unlike Australia's franking credit refund system, New Zealand's imputation credits can only " +
          "offset tax liability generated by that income. Any excess is forfeited, not refunded in cash, which " +
          "matters most for lower-income shareholders and retirees living on dividend income.",
      },
      {
        question: "What does \"fully imputed\" mean?",
        answer:
          "It means the company attached the maximum imputation credit allowed (28 cents per dollar of grossed-up " +
          "dividend), fully reflecting the 28% company tax already paid on the underlying profit. Some companies " +
          "attach less (a \"partially imputed\" dividend), especially if they have overseas income that wasn't " +
          "taxed in New Zealand.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 8. New Zealand Capital Gains Tax Calculator (bright-line test)
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-capital-gains-tax-calculator",
    title: "New Zealand Capital Gains Tax Calculator",
    description: "Check whether the bright-line test applies to a residential property sale — New Zealand has no general capital gains tax.",
    metaTitle: "New Zealand Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free NZ capital gains calculator. New Zealand has no general CGT — check whether the 2-year bright-line " +
      "test applies to your property sale.",
    calcInputs: [
      {
        key: "monthsHeld",
        label: "Months Held (Purchase to Sale)",
        type: "number",
        required: true,
        default: 24,
        min: 0,
        max: 240,
        step: 1,
      },
      nzdField("gainAmount", "Gain on Sale", { unit: "NZD", max: 1000000 }),
      nzdField("otherTaxableIncome", "Other Taxable Income", { unit: "NZD/year", max: 250000 }),
      yesNoField("isMainHome", "Was This Your Main Home?"),
    ],
    calcResult: { label: "Tax on Gain", format: "currency", currency: "NZD" },
    calcResults: [
      { key: "brightLineApplies", label: "Bright-Line Test Applies?", format: "number" },
      nzdResult("taxableGain", "Taxable Gain"),
      nzdResult("taxOnGain", "Tax on Gain", { highlight: true }),
      nzdResult("netProceeds", "Net Proceeds After Tax"),
      percentResult("effectiveRate", "Effective Rate on Gain"),
    ],
    instructions:
      "New Zealand has no general capital gains tax. The one major exception for everyday sellers is the " +
      "\"bright-line test\": if you sell residential property (that isn't your main home) within 2 years of " +
      "buying it, the gain is taxed as ORDINARY income, stacked on your other income at your marginal rate — " +
      "sell outside that window, or sell your main home, and the gain is untaxed.\n\n" +
      "Enter how many months you held the property, the gain, your other income, and whether it was your main " +
      "home, to see whether the bright-line test applies and, if so, the tax.",
    examples:
      "Example: a $100,000 gain sold after just 18 months (within the bright-line window), against $70,000 " +
      "other income, owes $32,757.00 tax (a 32.76% effective rate) — the SAME sale held for 36 months instead " +
      "(outside the window) owes $0.00 tax.",
    assumptions:
      "This calculator uses the confirmed current bright-line period — 2 years, effective for property sold on " +
      "or after 1 July 2024 (down from up to 10 years under the prior rules) — from ird.govt.nz. It doesn't " +
      "model the other bright-line exceptions (inherited property, relationship property transfers, disaster-" +
      "relief sales to the Crown) or the separate \"intention to sell\"/property-trading rules that can tax a " +
      "gain as ordinary income even OUTSIDE the bright-line window for property dealers and developers.\n\n" +
      NO_CGT_NOTE +
      "\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "Does New Zealand have a general capital gains tax?",
        answer:
          "No. Aside from the narrow bright-line test on residential property, and specific rules for property " +
          "dealers/developers and share traders operating as a business, most capital gains in New Zealand — on " +
          "shares, KiwiSaver growth, most investment property held long-term, and personal assets — are not " +
          "taxed at all.",
      },
      {
        question: "What if I bought before 1 July 2024?",
        answer:
          "The bright-line period that applied when you PURCHASED generally governs your sale — properties " +
          "bought before 1 July 2024 may fall under the longer 5-year or 10-year bright-line rules that applied " +
          "at the time, not the current 2-year period. Check ird.govt.nz's bright-line guidance for the rules " +
          "that applied when you bought.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 9. New Zealand Payroll Tax Calculator (Employer PAYE & Payroll
  //    Obligations — NZ has no separate payroll tax)
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-payroll-tax-calculator",
    title: "New Zealand Payroll Tax Calculator",
    description: "New Zealand has no separate payroll tax — calculate what KiwiSaver, ESCT, and ACC levies actually cost an employer.",
    metaTitle: "New Zealand Payroll Tax Calculator — Free & Instant",
    metaDescription:
      "Free NZ employer payroll cost calculator. New Zealand has no separate payroll tax — see your real " +
      "employer KiwiSaver, ESCT, and ACC cost on top of a salary.",
    calcInputs: [
      nzdField("annualSalary", "Employee's Annual Salary", { unit: "NZD/year", max: 250000, step: 1000 }),
      {
        key: "employerKiwiSaverRate",
        label: "Employer KiwiSaver Contribution Rate",
        type: "dropdown",
        required: true,
        default: 3.5,
        options: [
          { label: "3.5% (minimum, from 1 April 2026)", value: 3.5 },
          { label: "4%", value: 4 },
          { label: "6%", value: 6 },
          { label: "8%", value: 8 },
          { label: "10%", value: 10 },
        ],
      },
      industryTierField,
    ],
    calcResult: { label: "Total Employer Cost Above Salary", format: "currency", currency: "NZD" },
    calcResults: [
      nzdResult("employerKiwiSaverContribution", "Employer KiwiSaver Contribution"),
      nzdResult("esctAmount", "ESCT on Employer Contribution"),
      nzdResult("accWorkLevy", "ACC Work Levy"),
      nzdResult("accWorkingSaferLevy", "ACC Working Safer Levy"),
      nzdResult("totalEmployerObligations", "Total Employer Cost Above Salary", { highlight: true }),
      nzdResult("totalEmploymentCost", "Total Annual Employment Cost"),
    ],
    instructions:
      "New Zealand has NO separate \"payroll tax\" the way Australian states do — this calculator instead shows " +
      "the real cost of employing someone beyond their gross salary: your minimum KiwiSaver contribution " +
      "(3.5% from 1 April 2026), the ESCT (Employer Superannuation Contribution Tax) withheld from that " +
      "contribution before it reaches the employee's account, and your ACC Work Levy and Working Safer Levy, " +
      "based on your industry.\n\n" +
      "Enter the employee's salary, your KiwiSaver contribution rate, and your rough industry risk tier.",
    examples:
      "Example: a $70,000 salary with the 3.5% minimum KiwiSaver rate in a medium-risk industry costs an extra " +
      "$2,450.00 employer KiwiSaver contribution, $735.00 ESCT, $861.00 ACC Work Levy, and $56.00 Working Safer " +
      "Levy — $4,102.00 total on top of salary, for a $74,102.00 total annual employment cost.",
    assumptions:
      "This calculator uses the confirmed 3.5% minimum employer KiwiSaver rate (raised from 3% effective 1 " +
      "April 2026), current ESCT bands, and 2026/27 ACC Work Levy/Working Safer Levy figures, all from " +
      "ird.govt.nz and the ACC Levy Guidebook. Work Levy rates shown are representative examples only (see the " +
      "ACC Levy Calculator's Assumptions). It doesn't include FBT (Fringe Benefit Tax) on non-cash benefits.\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "Does New Zealand really have no payroll tax?",
        answer:
          "Correct — unlike Australian states (which each levy their own payroll tax above a threshold), New " +
          "Zealand has no equivalent tax on total payroll. What employers DO pay on top of salary is KiwiSaver, " +
          "ESCT, and ACC levies, which this calculator adds up instead.",
      },
      {
        question: "Why does ESCT apply to the employer's own contribution?",
        answer:
          "Because an employer KiwiSaver contribution is effectively extra remuneration, and ESCT ensures it's " +
          "taxed roughly in line with what the employee would have paid had they received it as salary instead — " +
          "it's withheld and paid to IRD before the net amount reaches the employee's KiwiSaver account.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 10. New Zealand KiwiSaver Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "new-zealand-kiwisaver-tax-calculator",
    title: "New Zealand KiwiSaver Tax Calculator",
    description: "Calculate what actually lands in your KiwiSaver account after ESCT is withheld from the employer contribution.",
    metaTitle: "New Zealand KiwiSaver Tax Calculator — Free & Instant",
    metaDescription:
      "Free NZ KiwiSaver tax calculator. Enter your salary and contribution rates to see your net employee and " +
      "employer KiwiSaver contributions after ESCT.",
    calcInputs: [
      nzdField("annualSalary", "Annual Salary", { unit: "NZD/year", max: 250000, step: 1000 }),
      {
        key: "employeeContributionRate",
        label: "Your KiwiSaver Contribution Rate",
        type: "dropdown",
        required: true,
        default: 3.5,
        options: [
          { label: "3.5% (minimum, from 1 April 2026)", value: 3.5 },
          { label: "4%", value: 4 },
          { label: "6%", value: 6 },
          { label: "8%", value: 8 },
          { label: "10%", value: 10 },
        ],
      },
      {
        key: "employerContributionRate",
        label: "Employer KiwiSaver Contribution Rate",
        type: "dropdown",
        required: true,
        default: 3.5,
        options: [
          { label: "3.5% (minimum, from 1 April 2026)", value: 3.5 },
          { label: "4%", value: 4 },
          { label: "6%", value: 6 },
          { label: "8%", value: 8 },
          { label: "10%", value: 10 },
        ],
      },
    ],
    calcResult: { label: "Total Into Your KiwiSaver Account", format: "currency", currency: "NZD" },
    calcResults: [
      nzdResult("employeeContribution", "Your Contribution (From Pay)"),
      nzdResult("employerContributionGross", "Employer Contribution (Before ESCT)"),
      nzdResult("esctWithheld", "ESCT Withheld From Employer Contribution"),
      nzdResult("employerContributionNet", "Employer Contribution (After ESCT)"),
      nzdResult("totalIntoAccount", "Total Into Your KiwiSaver Account", { highlight: true }),
    ],
    instructions:
      "Enter your salary and your own and your employer's KiwiSaver contribution rates (3.5% is the minimum " +
      "for both, from 1 April 2026). Your own contribution comes straight out of your take-home pay, in full — " +
      "but your EMPLOYER's contribution has ESCT (Employer Superannuation Contribution Tax) withheld first, so " +
      "less than the full employer rate actually reaches your account.",
    examples:
      "Example: a $70,000 salary with 3.5% employee and 3.5% employer rates deducts $2,450.00 from your pay, " +
      "while the $2,450.00 gross employer contribution has $735.00 ESCT withheld — only $1,715.00 net reaches " +
      "your account, for $4,165.00 total going into your KiwiSaver for the year.",
    assumptions:
      "This calculator uses the confirmed 3.5% minimum contribution rate (from 1 April 2026) and current ESCT " +
      "bands from ird.govt.nz. ESCT bands are based on your total income (salary plus gross employer " +
      "contribution) and are DIFFERENT from — don't assume they match — the regular PAYE income tax brackets. " +
      "It doesn't model employer contributions above the compulsory minimum being subject to a different " +
      "\"total remuneration\" structuring some employers use.\n\n" +
      NZ_DISCLAIMER,
    faq: [
      {
        question: "Why is my employer's contribution taxed but not mine?",
        answer:
          "Your own contribution comes from money you've already been taxed on through PAYE — taxing it again " +
          "would be double taxation. Your employer's contribution is NEW money on top of your salary, so ESCT " +
          "taxes it once, at the point it's paid into your KiwiSaver account, roughly matching what you'd have " +
          "paid in PAYE had you received it as salary instead.",
      },
      {
        question: "Are the ESCT bands the same as my income tax brackets?",
        answer:
          "No — ESCT has its own separate threshold table, set independently by IRD and not automatically " +
          "updated in lockstep with PAYE brackets. Always check the current ESCT table rather than assuming it " +
          "matches your income tax rate.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:create-new-zealand-tool" first, ` +
        `then re-run this script.`
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
        data: {
          ...toolContent,
          seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } },
        },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: {
          slug: def.slug,
          status: "draft",
          ...toolContent,
          seoMeta: { create: seoMetaContent },
        },
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
