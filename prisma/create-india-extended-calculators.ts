// One-time (but safe to re-run) batch setup script: creates 10 more Tools
// under the EXISTING "India Tax & Salary Calculators" category (slug
// "india-tax-salary-calculators", created by create-india-tax-tool.ts —
// this script does NOT create the category; it fails loudly if it's
// missing).
//
// See src/lib/calc-engine-india-extended-calculators.ts for the actual
// math and which of its exported functions each of these 10 slugs maps
// to, and that file's header for the incometaxindia.gov.in/cbic-gst.gov.in
// source of every FY2026-27 figure used — including why the three Capital
// Gains tools model genuinely different mechanics (general classifier,
// short-term slab-stacking, and the pre-23-Jul-2024 property indexation
// choice), rather than repeating the same tool three times.
//
// HOW TO RUN
//   npx tsx prisma/create-india-extended-calculators.ts
// or
//   npm run db:create-india-extended-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "india-tax-salary-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function inrField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit ?? "INR",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 10000000,
    step: opts.step ?? 1000,
  };
}

function inrResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", currency: "INR", unit: opts.unit, highlight: opts.highlight };
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

const IN_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified chartered accountant or the Income Tax " +
  "Department.";

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
  // 1. India GST Calculator
  // -------------------------------------------------------------------
  {
    slug: "india-gst-calculator",
    title: "India GST Calculator",
    description: "Add or extract GST using India's post-reform 0%/5%/18%/40% slab structure.",
    metaTitle: "India GST Calculator — Free & Instant",
    metaDescription:
      "Free India GST calculator using the current 2026 GST slabs (0%/5%/18%/40%, plus 3% for gold/silver). " +
      "Add or extract GST from a price.",
    calcInputs: [
      inrField("amount", "Amount", { unit: "INR", max: 10000000, step: 100 }),
      {
        key: "gstSlab",
        label: "GST Slab",
        type: "dropdown",
        required: true,
        default: 2,
        options: [
          { label: "0% (Nil-rated — essentials)", value: 0 },
          { label: "5% (Merit rate — daily use, packaged food)", value: 1 },
          { label: "18% (Standard rate — most goods/services)", value: 2 },
          { label: "40% (Demerit rate — large cars, tobacco-adjacent, betting)", value: 3 },
          { label: "3% (Gold/Silver Jewellery — untouched by reform)", value: 4 },
        ],
      },
      yesNoField("isGstInclusive", "Is the Amount Already GST-Inclusive?"),
    ],
    calcResult: { label: "GST Amount", format: "currency", currency: "INR" },
    calcResults: [
      inrResult("netAmount", "Net Amount (Excluding GST)"),
      inrResult("gstAmount", "GST Amount", { highlight: true }),
      inrResult("grossAmount", "Gross Amount (Including GST)"),
      percentResult("gstRateUsed", "GST Rate Used"),
    ],
    instructions:
      "Enter an amount, choose the GST slab that applies, and say whether the amount already includes GST. " +
      "India's \"GST 2.0\" reform (effective 22 September 2025) replaced the old 5%/12%/18%/28%+cess structure " +
      "with a simpler 0%/5%/18%/40% system — the 40% \"demerit\" rate absorbs what used to be 28%+compensation " +
      "cess for large cars, tobacco-adjacent products, and betting/gambling. Gold and silver jewellery keep " +
      "their own separate 3% rate, untouched by the reform.",
    examples: "Example: a ₹10,000 price at the 18% standard rate owes ₹1,800.00 GST, for an ₹11,800.00 GST-inclusive total.",
    assumptions:
      "This calculator uses the confirmed \"GST 2.0\" slab structure, live since 22 September 2025 (CBIC " +
      "Notifications 09–17/2025-Central Tax (Rate), 56th GST Council meeting). Tobacco and pan masala remain on " +
      "their pre-reform rates temporarily, pending a separate notification, and aren't covered by the slabs " +
      "here.\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "What happened to the old 12% and 28% slabs?",
        answer:
          "They were eliminated by the September 2025 GST reform — most items that were at 12% moved to 5% or " +
          "18%, and items that were at 28%+compensation cess moved to the new 40% demerit rate, which is now " +
          "the effective replacement for that combined burden.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 2. India TDS Calculator
  // -------------------------------------------------------------------
  {
    slug: "india-tds-calculator",
    title: "India TDS Calculator",
    description: "Calculate TDS (Tax Deducted at Source) for common payment types — interest, contractor, rent, professional fees, and more.",
    metaTitle: "India TDS Calculator — Free & Instant",
    metaDescription:
      "Free India TDS calculator. Choose your payment type to see the correct TDS rate, threshold, and net " +
      "payment for FY 2026-27.",
    calcInputs: [
      inrField("paymentAmount", "Payment Amount", { unit: "INR", max: 10000000 }),
      {
        key: "tdsSection",
        label: "Payment Type (TDS Section)",
        type: "dropdown",
        required: true,
        default: 8,
        options: [
          { label: "Interest, non-senior citizen (194A) — 10%, ₹50,000 threshold", value: 1 },
          { label: "Interest, senior citizen (194A) — 10%, ₹1,00,000 threshold", value: 2 },
          { label: "Contractor payment, individual/HUF payee (194C) — 1%, ₹30,000 threshold", value: 3 },
          { label: "Contractor payment, other payee (194C) — 2%, ₹30,000 threshold", value: 4 },
          { label: "Commission/Brokerage (194H) — 2%, ₹20,000 threshold", value: 5 },
          { label: "Rent — Land/Building/Furniture (194-I) — 10%, ₹6,00,000/year threshold", value: 6 },
          { label: "Rent — Plant/Machinery (194-I) — 2%, ₹6,00,000/year threshold", value: 7 },
          { label: "Professional Fees/Royalty (194J) — 10%, ₹50,000 threshold", value: 8 },
          { label: "Technical Services/Call Centre (194J) — 2%, ₹50,000 threshold", value: 9 },
          { label: "Sale of Immovable Property (194-IA) — 1%, ₹50,00,000 threshold", value: 10 },
          { label: "Dividend (194) — 10%, ₹10,000 threshold", value: 11 },
        ],
      },
    ],
    calcResult: { label: "TDS Amount", format: "currency", currency: "INR" },
    calcResults: [
      { key: "thresholdExceeded", label: "Threshold Exceeded?", format: "number" },
      percentResult("tdsRateApplied", "TDS Rate Applied"),
      inrResult("tdsAmount", "TDS Amount", { highlight: true }),
      inrResult("netPayment", "Net Payment After TDS"),
    ],
    instructions:
      "Enter the payment amount and choose the payment type. TDS (Tax Deducted at Source) requires the PAYER to " +
      "deduct tax before paying you, and remit it directly to the Income Tax Department — the rate and the " +
      "threshold below which no TDS applies both depend on the specific section and payment type.\n\n" +
      "From 1 April 2026, these provisions sit under Section 393 of the Income-tax Act, 2025 rather than the " +
      "old Act's numbered sections (194A, 194C, etc.) — this tool keeps the familiar old section labels since " +
      "that's still how most payers and banks refer to them.",
    examples:
      "Example: an ₹80,000 professional fee (194J) exceeds the ₹50,000 threshold, so 10% TDS (₹8,000.00) is " +
      "deducted, for ₹72,000.00 net payment.",
    assumptions:
      "This calculator uses confirmed FY2026-27 TDS rates and thresholds from incometaxindia.gov.in, including " +
      "the Budget 2025 threshold increases (effective 1 April 2025) for interest, commission, rent, professional " +
      "fees, and dividend TDS. TDS deducted is an ADVANCE toward your final tax liability, not itself your final " +
      "tax — it's credited against your total tax bill when you file your return.\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "Is TDS my final tax on this income?",
        answer:
          "No — TDS is deducted in advance and credited against your total income tax liability for the year " +
          "when you file your return. If your actual tax liability (considering all your income and deductions) " +
          "is lower than the TDS deducted, you can claim a refund; if higher, you'll owe the balance.",
      },
      {
        question: "What changed with the Income-tax Act 2025?",
        answer:
          "The whole Act was renumbered effective 1 April 2026 — familiar sections like 194J and 194C are now " +
          "sub-clauses of the new Act's Section 393, but the actual rates and thresholds carried over unchanged " +
          "from the Finance Act 2025 amendments.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 3. India Capital Gains Tax Calculator (general classifier)
  // -------------------------------------------------------------------
  {
    slug: "india-capital-gains-tax-calculator",
    title: "India Capital Gains Tax Calculator",
    description: "Calculate capital gains tax on any asset — automatically classifies short-term vs long-term and applies the right rate.",
    metaTitle: "India Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free India capital gains tax calculator. Enter your asset type and holding period to see whether it's " +
      "short-term or long-term, and the tax owed.",
    calcInputs: [
      {
        key: "assetType",
        label: "Asset Type",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Equity / Equity Mutual Funds (STT Paid)", value: 0 },
          { label: "Immovable Property (Land/Building)", value: 1 },
          { label: "Other Assets (Gold, Unlisted Shares, Debt)", value: 2 },
        ],
      },
      {
        key: "monthsHeld",
        label: "Months Held",
        type: "number",
        required: true,
        default: 12,
        min: 0,
        max: 480,
        step: 1,
      },
      inrField("saleValue", "Sale Value", { unit: "INR", max: 20000000 }),
      inrField("costOfAcquisition", "Cost of Acquisition", { unit: "INR", max: 20000000 }),
      inrField("otherTaxableIncome", "Other Taxable Income (For Short-Term Non-Equity Only)", { unit: "INR/year", max: 10000000 }),
    ],
    calcResult: { label: "Tax on Gain", format: "currency", currency: "INR" },
    calcResults: [
      inrResult("gain", "Capital Gain"),
      { key: "isLongTerm", label: "Long-Term?", format: "number" },
      inrResult("taxOnGain", "Tax on Gain", { highlight: true }),
      inrResult("netSaleProceeds", "Net Sale Proceeds"),
      percentResult("effectiveRate", "Effective Rate on Gain"),
    ],
    instructions:
      "Enter your asset type, how long you held it, the sale value, and cost of acquisition. This calculator " +
      "automatically classifies your holding as short-term or long-term (12 months for equity, 24 months for " +
      "property/other assets) and applies the current post-Budget-2024 rate: equity gets a flat rate either " +
      "way (20% short-term, 12.5% above a ₹1.25 lakh annual exemption long-term); property/other assets get " +
      "12.5% flat (no indexation) if long-term, or your regular slab rate if short-term.\n\n" +
      "For a deeper short-term-only or long-term-only breakdown — including the special indexation choice for " +
      "property bought before 23 July 2024 — use the Short Term or Long Term Capital Gains Tax Calculators.",
    examples:
      "Example: equity held 24 months with a ₹2,00,000 gain owes ₹9,375.00 tax (12.5% on the ₹75,000 above the " +
      "₹1,25,000 exemption) — the SAME gain held just 6 months instead owes ₹40,000.00 (20% flat short-term).",
    assumptions:
      "This calculator uses the confirmed post-23-July-2024 capital gains rules from incometaxindia.gov.in: " +
      "20% equity STCG, 12.5% equity LTCG above ₹1.25L exemption, 12.5% no-indexation LTCG for property/other " +
      "assets. For property specifically, it does NOT model the special indexation-choice option available for " +
      "assets acquired BEFORE 23 July 2024 — use the Long Term Capital Gains Tax Calculator for that comparison. " +
      "Short-term non-equity gains are taxed using New Regime slab rates (the default regime).\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "Why does equity have a different holding period than property?",
        answer:
          "Equity and equity-oriented mutual funds (with Securities Transaction Tax paid) use a 12-month " +
          "threshold for long-term classification — the shortest in the tax code. Property, gold, unlisted " +
          "shares, and most other assets use 24 months instead.",
      },
      {
        question: "What if I bought my property before 23 July 2024?",
        answer:
          "You may have a choice between the new 12.5% no-indexation rate and the old 20%-with-indexation rate, " +
          "picking whichever gives you the lower tax — this general calculator doesn't model that comparison; " +
          "use the Long Term Capital Gains Tax Calculator instead, which does.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 4. India Short Term Capital Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "india-short-term-capital-gains-tax-calculator",
    title: "India Short Term Capital Gains Tax Calculator",
    description: "Calculate short-term capital gains tax, with your effective marginal rate shown for non-equity assets.",
    metaTitle: "India Short Term Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free India STCG calculator. Enter your sale details to see short-term capital gains tax — 20% flat for " +
      "equity, slab rate for other assets.",
    calcInputs: [
      {
        key: "assetCategory",
        label: "Asset Category",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Equity / Equity Mutual Funds (STT Paid)", value: 0 },
          { label: "Other Assets (Property, Gold, Debt, Unlisted Shares)", value: 1 },
        ],
      },
      inrField("saleValue", "Sale Value", { unit: "INR", max: 20000000 }),
      inrField("costOfAcquisition", "Cost of Acquisition", { unit: "INR", max: 20000000 }),
      inrField("expenses", "Transfer Expenses", { unit: "INR", max: 500000 }),
      inrField("otherTaxableIncome", "Other Taxable Income (Non-Equity Only)", { unit: "INR/year", max: 10000000 }),
    ],
    calcResult: { label: "Tax on STCG", format: "currency", currency: "INR" },
    calcResults: [
      inrResult("stcgAmount", "Short-Term Capital Gain"),
      percentResult("marginalRate", "Rate Applied"),
      inrResult("taxOnStcg", "Tax on STCG", { highlight: true }),
      inrResult("netProceeds", "Net Sale Proceeds"),
    ],
    instructions:
      "Enter your asset category, sale value, cost of acquisition, transfer expenses, and (for non-equity " +
      "assets) your other taxable income. Assume this asset is ALREADY confirmed short-term (held under 12 " +
      "months for equity, under 24 months for other assets) — this tool focuses on the short-term calculation " +
      "itself rather than classifying it for you.\n\n" +
      "Equity STCG (with Securities Transaction Tax paid) is taxed at a flat 20% regardless of your other " +
      "income. Non-equity short-term gains, by contrast, are added to your other income and taxed at your slab " +
      "rate — shown here stacked on your other income to reveal your actual marginal rate.",
    examples:
      "Example: a ₹2,00,000 equity STCG owes a flat ₹40,000.00 (20%) — the SAME ₹2,00,000 gain on a non-equity " +
      "asset instead, stacked on ₹10,00,000 other income, owes ₹20,000.00 at a 10% marginal rate (New Regime " +
      "slab).",
    assumptions:
      "This calculator uses the confirmed 20% equity STCG rate (up from 15%, effective 23 July 2024) from " +
      "incometaxindia.gov.in, and New Regime slab rates for non-equity STCG (the default regime — if you've " +
      "elected the Old Regime, your actual rate will differ). It doesn't classify holding period for you — " +
      "confirm your asset genuinely qualifies as short-term before using this tool.\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "Why is equity taxed flat but other assets at slab rate?",
        answer:
          "Equity STCG has its own dedicated rate under Section 111A specifically because Securities Transaction " +
          "Tax is already paid on the transaction — a policy choice to keep the calculation simple and " +
          "consistent regardless of the investor's income level. Other short-term gains don't have this special " +
          "treatment and fall back to ordinary slab-rate taxation.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 5. India Long Term Capital Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "india-long-term-capital-gains-tax-calculator",
    title: "India Long Term Capital Gains Tax Calculator",
    description: "Calculate long-term capital gains tax, including the indexation-vs-no-indexation choice for property bought before 23 July 2024.",
    metaTitle: "India Long Term Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free India LTCG calculator. Compare the 12.5% no-indexation rate against the grandfathered 20%-with-" +
      "indexation option for pre-2024 property.",
    calcInputs: [
      {
        key: "assetCategory",
        label: "Asset Category",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Equity / Equity Mutual Funds (STT Paid)", value: 0 },
          { label: "Property Acquired ON/AFTER 23 July 2024", value: 1 },
          { label: "Property Acquired BEFORE 23 July 2024", value: 2 },
          { label: "Other Assets (Gold, Unlisted Shares)", value: 3 },
        ],
      },
      inrField("saleValue", "Sale Value", { unit: "INR", max: 50000000 }),
      inrField("costOfAcquisition", "Cost of Acquisition", { unit: "INR", max: 50000000 }),
      inrField("indexedCostOfAcquisition", "Indexed Cost of Acquisition (Pre-2024 Property Only)", { unit: "INR", max: 50000000, required: false }),
    ],
    calcResult: { label: "Tax on LTCG", format: "currency", currency: "INR" },
    calcResults: [
      inrResult("ltcgAmount", "Long-Term Capital Gain"),
      inrResult("taxWithoutIndexation", "Tax Without Indexation (12.5%)"),
      inrResult("taxWithIndexation", "Tax With Indexation (20%, If Eligible)"),
      inrResult("recommendedTax", "Recommended (Lower) Tax", { highlight: true }),
      inrResult("savingsFromChoice", "Savings From Choosing the Lower Option"),
      inrResult("netProceeds", "Net Sale Proceeds"),
    ],
    instructions:
      "Enter your asset category, sale value, and cost of acquisition. Equity gets 12.5% tax above a ₹1.25 " +
      "lakh annual exemption, with no indexation option (never had one). Property acquired ON OR AFTER 23 July " +
      "2024, and other assets, get a flat 12.5% with no indexation, no choice.\n\n" +
      "Property acquired BEFORE 23 July 2024 is different: resident individuals and HUFs can choose the LOWER " +
      "of 12.5% without indexation OR 20% WITH indexation. To compare, also enter the Indexed Cost of " +
      "Acquisition (your original cost adjusted for inflation using the Cost Inflation Index — look this up via " +
      "the Income Tax Department's published CII table) — leave it blank to see only the no-indexation option.",
    examples:
      "Example: equity with a ₹15,00,000 gain owes ₹1,71,875.00 tax (12.5% on the amount above the ₹1,25,000 " +
      "exemption). A pre-2024 property with a ₹50,00,000 no-indexation gain, but a ₹40,00,000 indexed gain, " +
      "compares ₹6,25,000.00 (12.5%, no indexation) against ₹4,00,000.00 (20%, with indexation) — the lower " +
      "₹4,00,000.00 option saves ₹2,25,000.00 versus the other.",
    assumptions:
      "This calculator uses the confirmed post-Budget-2024 LTCG rules from incometaxindia.gov.in, including the " +
      "grandfathering proviso for pre-23-July-2024 property that lets RESIDENT INDIVIDUALS AND HUFs ONLY choose " +
      "the lower of the two calculations (companies, firms, and NRIs don't get this choice, and always use the " +
      "12.5% no-indexation rate). It doesn't calculate your Indexed Cost of Acquisition for you — that requires " +
      "the Cost Inflation Index for your purchase and sale years, published annually by the Income Tax " +
      "Department.\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "Who can use the indexation choice?",
        answer:
          "Only RESIDENT INDIVIDUALS and resident HUFs, and only for property acquired before 23 July 2024 — " +
          "companies, partnership firms, and non-resident Indians don't get this choice under the grandfathering " +
          "proviso, and always use the 12.5% no-indexation rate regardless of when the property was acquired.",
      },
      {
        question: "How do I find my Indexed Cost of Acquisition?",
        answer:
          "Multiply your original cost by (Cost Inflation Index for the year of sale ÷ Cost Inflation Index for " +
          "the year of purchase) — both published annually by the Income Tax Department. This calculator asks " +
          "you to supply the already-indexed figure directly, since the CII table changes each year.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 6. India Dividend Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "india-dividend-tax-calculator",
    title: "India Dividend Tax Calculator",
    description: "Calculate income tax on dividend income, added to your other income at slab rate, plus TDS already deducted.",
    metaTitle: "India Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free India dividend tax calculator. Enter your dividend and other income to see tax at your slab rate, " +
      "and TDS already deducted.",
    calcInputs: [
      inrField("dividendAmount", "Dividend Income", { unit: "INR/year", max: 5000000 }),
      inrField("otherTaxableIncome", "Other Taxable Income", { unit: "INR/year", max: 10000000 }),
    ],
    calcResult: { label: "Tax on Dividend", format: "currency", currency: "INR" },
    calcResults: [
      inrResult("taxOnDividend", "Tax on Dividend", { highlight: true }),
      inrResult("tdsDeducted", "TDS Already Deducted (10%, Above ₹10,000)"),
      inrResult("balanceTaxAfterTds", "Balance Tax Due (After TDS Credit)"),
      inrResult("netDividendAfterTax", "Net Dividend After Tax"),
    ],
    instructions:
      "Enter your dividend income and your other taxable income. Since the Dividend Distribution Tax was " +
      "abolished in 2020, dividends are taxed in YOUR hands — added to your other income and taxed at your " +
      "regular slab rate, stacked on top.\n\n" +
      "The company paying the dividend also deducts 10% TDS if your dividend from them exceeds ₹10,000 in the " +
      "year — that's an advance credit toward your final liability, not a separate tax, shown here alongside " +
      "your actual slab-rate tax.",
    examples:
      "Example: ₹50,000 dividend against ₹10,00,000 other income owes ₹5,000.00 tax (10% marginal slab), with " +
      "₹5,000.00 already deducted as TDS — leaving ₹0.00 balance due, for ₹45,000.00 net dividend after tax.",
    assumptions:
      "This calculator uses New Regime slab rates (the default regime — an Old Regime filer's actual rate will " +
      "differ) and the confirmed 10% TDS rate with a ₹10,000 threshold (raised from ₹5,000 by Budget 2025), " +
      "both from incometaxindia.gov.in. It doesn't model deduction of interest expense incurred to earn the " +
      "dividend, which is separately allowable up to 20% of dividend income under the Income-tax Act.\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "Is dividend tax-free in India?",
        answer:
          "No — that was true only while the company-level Dividend Distribution Tax existed, before it was " +
          "abolished in April 2020. Since then, dividends are fully taxable in the shareholder's hands at their " +
          "own slab rate, exactly like any other income.",
      },
      {
        question: "Why was TDS deducted if I still owe tax?",
        answer:
          "TDS is only an ADVANCE payment toward your total tax bill — if your actual marginal rate on the " +
          "dividend (once stacked on your other income) is higher than the flat 10% TDS rate, you'll owe the " +
          "difference when you file; if lower, you may get a refund.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 7. India Property Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "india-property-tax-calculator",
    title: "India Property Tax Calculator",
    description: "Estimate municipal property tax using Mumbai's (BMC) Capital Value System as a representative model.",
    metaTitle: "India Property Tax Calculator — Free & Instant",
    metaDescription:
      "Free India property tax calculator using Mumbai's Capital Value System as a representative model for " +
      "municipal property tax.",
    calcInputs: [
      inrField("carpetAreaSqFt", "Carpet Area", { unit: "sq ft", max: 10000, step: 10 }),
      inrField("capitalValuePerSqFt", "Capital Value per Sq Ft (Ready Reckoner-Based)", { unit: "INR/sq ft", max: 100000 }),
      {
        key: "usageWeight",
        label: "Usage Type",
        type: "dropdown",
        required: true,
        default: 1,
        options: [
          { label: "Residential", value: 1 },
          { label: "Commercial", value: 2 },
        ],
      },
      {
        key: "ageFactor",
        label: "Building Age",
        type: "dropdown",
        required: true,
        default: 1,
        options: [
          { label: "Under 10 Years", value: 1 },
          { label: "10–20 Years", value: 0.9 },
          { label: "Over 20 Years", value: 0.8 },
        ],
      },
      {
        key: "taxRatePercent",
        label: "Applicable Property Tax Rate (Check Your Municipal Corporation)",
        type: "percentage",
        required: true,
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.05,
      },
    ],
    calcResult: { label: "Annual Property Tax", format: "currency", currency: "INR" },
    calcResults: [
      inrResult("capitalValue", "Capital Value"),
      { key: "isExempt", label: "Exempt (≤500 sq ft residential)?", format: "number" },
      inrResult("annualPropertyTax", "Annual Property Tax", { highlight: true }),
    ],
    instructions:
      "Property tax in India is a MUNICIPAL tax with no single national rate — this calculator models Mumbai's " +
      "(BMC/MCGM) Capital Value System as a representative example, widely used by large Indian cities. Enter " +
      "your carpet area, the Ready Reckoner-based capital value per square foot for your locality, your " +
      "property's usage and age, and the tax rate your municipal corporation currently applies.\n\n" +
      "Capital Value = Carpet Area × Rate per Sq Ft × Usage Weight × Age Factor, and BMC exempts residential " +
      "units up to 500 sq ft carpet area from general tax entirely.",
    examples:
      "Example: an 800 sq ft residential unit (10–20 years old) with a ₹25,000/sq ft capital value rate and a " +
      "0.5% tax rate has an ₹1,80,00,000.00 capital value, owing ₹90,000.00 annual property tax — the SAME " +
      "calculation for a 450 sq ft unit instead is fully EXEMPT (₹0.00), under BMC's small-unit exemption.",
    assumptions:
      "This calculator models the Capital Value System METHODOLOGY (confirmed via BMC/MCGM sources) as a " +
      "representative example for Indian metros that use similar systems — it does NOT use live, ward-specific " +
      "BMC rates, since those are only reliably published on the live portal.mcgm.gov.in portal and change " +
      "periodically. Enter your OWN municipal corporation's current tax rate and locality-specific capital " +
      "value for an accurate estimate — this tool's building-age and usage weight factors are illustrative, not " +
      "an exact BMC-published table.\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "Does this give my exact BMC property tax bill?",
        answer:
          "No — for an exact figure, use BMC's own online property tax calculator at portal.mcgm.gov.in, which " +
          "has the live, ward-specific rates and precise weight factors. This tool models the same general " +
          "methodology for estimation and for cities without their own dedicated calculator.",
      },
      {
        question: "What if my city isn't Mumbai?",
        answer:
          "Many large Indian cities use a similar Capital Value or Unit Area System, but with their own rates " +
          "and factors — check your own municipal corporation's website for its exact method and current rates, " +
          "using this tool's structure as a general guide.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 8. India Stamp Duty Calculator
  // -------------------------------------------------------------------
  {
    slug: "india-stamp-duty-calculator",
    title: "India Stamp Duty Calculator",
    description: "Estimate stamp duty and registration fee on a property purchase using Maharashtra's rates as a representative example.",
    metaTitle: "India Stamp Duty Calculator — Free & Instant",
    metaDescription:
      "Free India stamp duty calculator using Maharashtra's current rates as a representative example, " +
      "including the female-buyer concession.",
    calcInputs: [
      inrField("agreementValue", "Agreement Value", { unit: "INR", max: 50000000, step: 10000 }),
      inrField("readyReckonerValue", "Ready Reckoner Value (Government Valuation)", { unit: "INR", max: 50000000, step: 10000 }),
      {
        key: "location",
        label: "Location",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Mumbai", value: 0 },
          { label: "Pune / Thane / Nagpur", value: 1 },
          { label: "Rural Areas", value: 2 },
        ],
      },
      {
        key: "buyerGender",
        label: "Buyer",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Male / Joint Ownership", value: 0 },
          { label: "Female (Sole Ownership, Residential)", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Total Stamp Duty & Registration", format: "currency", currency: "INR" },
    calcResults: [
      inrResult("dutiableValue", "Dutiable Value (Higher of Agreement/Ready Reckoner)"),
      inrResult("stampDuty", "Stamp Duty"),
      inrResult("registrationFee", "Registration Fee"),
      inrResult("totalCost", "Total Stamp Duty & Registration", { highlight: true }),
    ],
    instructions:
      "Enter the agreement value, the government Ready Reckoner value for the property, your location, and " +
      "buyer profile — this calculator uses Maharashtra's rates as a representative example. Stamp duty is " +
      "charged on the HIGHER of the agreement value or Ready Reckoner value, not simply what you agreed to pay, " +
      "so under-declaring the price doesn't reduce your duty.\n\n" +
      "A sole female buyer of residential property gets a 1% concession off the standard rate in Maharashtra — " +
      "this concession doesn't apply to joint male+female ownership, only sole female ownership.",
    examples:
      "Example: a ₹1,00,00,000 Mumbai purchase (agreement value higher than Ready Reckoner) by a male buyer " +
      "owes ₹6,00,000.00 stamp duty (6%) plus a capped ₹30,000.00 registration fee — ₹6,30,000.00 total. The " +
      "SAME purchase by a sole female buyer instead owes ₹5,00,000.00 stamp duty (5%) plus ₹30,000.00 " +
      "registration — ₹5,30,000.00 total.",
    assumptions:
      "This calculator uses Maharashtra's current stamp duty rates and the 1% (capped at ₹30,000) registration " +
      "fee, confirmed via multiple current Maharashtra-focused sources, as a REPRESENTATIVE EXAMPLE ONLY — every " +
      "Indian state sets its own stamp duty rates independently, and even within Maharashtra, rates can include " +
      "additional local cess/surcharge (like Mumbai's Metro Cess) beyond the headline rate shown here.\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "Does this apply outside Maharashtra?",
        answer:
          "Not exactly — stamp duty is a state subject in India, and every state sets its own rates " +
          "independently, often quite different from Maharashtra's. This calculator is a representative example " +
          "of how the calculation works; check your own state's stamp duty schedule for an accurate figure.",
      },
      {
        question: "Why is stamp duty based on the higher of two values?",
        answer:
          "To prevent buyers and sellers from under-declaring the agreement value to reduce stamp duty — the " +
          "government's own Ready Reckoner (guidance) value acts as a floor, so duty is always charged on at " +
          "least that amount, regardless of what price is written in the sale agreement.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 9. India Professional Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "india-professional-tax-calculator",
    title: "India Professional Tax Calculator",
    description: "Calculate monthly and annual professional tax using Maharashtra's slabs as a representative example.",
    metaTitle: "India Professional Tax Calculator — Free & Instant",
    metaDescription:
      "Free India professional tax calculator using Maharashtra's slabs as a representative example, capped at " +
      "the constitutional ₹2,500/year limit.",
    calcInputs: [
      inrField("monthlySalary", "Monthly Gross Salary", { unit: "INR/month", max: 500000 }),
      yesNoField("isWomanExempt", "Are You a Woman Earning ≤₹25,000/Month? (Maharashtra Exemption)"),
    ],
    calcResult: { label: "Annual Professional Tax", format: "currency", currency: "INR" },
    calcResults: [
      inrResult("monthlyTax", "Monthly Professional Tax"),
      inrResult("februaryTax", "February Tax (Top-Up Month)"),
      inrResult("annualTax", "Annual Professional Tax", { highlight: true }),
    ],
    instructions:
      "Enter your monthly gross salary — this calculator uses Maharashtra's slabs as a representative example, " +
      "one of several states (along with Karnataka, West Bengal, Tamil Nadu, and others) that levy Professional " +
      "Tax on salaried income; many other states, including Delhi, Uttar Pradesh, and Haryana, don't levy it at " +
      "all. Every state's Professional Tax is capped at ₹2,500/year under Article 276(2) of the Constitution — " +
      "Maharashtra hits this exactly with an extra ₹100 charged in February.\n\n" +
      "Maharashtra also fully exempts women earning ₹25,000/month or less.",
    examples: "Example: a ₹15,000 monthly salary owes ₹200.00/month (₹300.00 in February) — ₹2,500.00 total for the year, exactly the constitutional cap.",
    assumptions:
      "This calculator uses Maharashtra's current Professional Tax slabs as a REPRESENTATIVE EXAMPLE — every " +
      "state that levies this tax sets its own slabs, and many states don't levy it at all. Confirm whether " +
      "your own state levies Professional Tax, and its actual slabs, before relying on this figure.\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "Why is February different from other months?",
        answer:
          "Maharashtra charges ₹200/month for 11 months plus ₹300 in February specifically so the annual total " +
          "hits exactly ₹2,500 — the maximum allowed under Article 276(2) of the Constitution — rather than a " +
          "flat ₹200 × 12 = ₹2,400, which would leave ₹100 of the constitutional headroom unused.",
      },
      {
        question: "Does every state charge Professional Tax?",
        answer:
          "No — it's levied only by states that have chosen to, including Maharashtra, Karnataka, West Bengal, " +
          "Tamil Nadu, Andhra Pradesh, Telangana, Gujarat, and several others. States like Delhi, Uttar Pradesh, " +
          "Haryana, Rajasthan, and Punjab don't levy it at all.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 10. India Self Employment Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "india-self-employment-tax-calculator",
    title: "India Self Employment Tax Calculator",
    description: "Calculate income tax on presumptive business or professional income under Sections 44AD/44ADA.",
    metaTitle: "India Self Employment Tax Calculator — Free & Instant",
    metaDescription:
      "Free India self-employment tax calculator. India has no separate self-employment tax — see your " +
      "presumptive income tax under Sections 44AD/44ADA instead.",
    calcInputs: [
      inrField("turnoverOrReceipts", "Annual Turnover or Gross Receipts", { unit: "INR/year", max: 30000000, step: 10000 }),
      {
        key: "isProfessional",
        label: "Business or Profession?",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Business (Section 44AD)", value: 0 },
          { label: "Specified Profession (Section 44ADA)", value: 1 },
        ],
      },
      {
        key: "digitalReceiptsPercent",
        label: "% of Receipts via Digital/Banking Channels",
        type: "percentage",
        required: true,
        default: 100,
        min: 0,
        max: 100,
        step: 1,
      },
      {
        key: "taxRegime",
        label: "Tax Regime",
        type: "dropdown",
        required: true,
        default: 1,
        options: [
          { label: "New Regime (Default)", value: 1 },
          { label: "Old Regime", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Total Tax", format: "currency", currency: "INR" },
    calcResults: [
      { key: "isEligible", label: "Eligible for Presumptive Scheme?", format: "number" },
      inrResult("thresholdApplicable", "Applicable Turnover/Receipts Threshold"),
      inrResult("presumptiveIncome", "Presumptive Income"),
      inrResult("incomeTax", "Income Tax (After Rebate)"),
      inrResult("cess", "Health & Education Cess (4%)"),
      inrResult("totalTax", "Total Tax", { highlight: true }),
      inrResult("netIncome", "Net Income After Tax"),
    ],
    instructions:
      "India has no separate US-style \"self-employment tax\" — self-employed people and professionals just pay " +
      "regular income tax on their business/professional profit, often using a PRESUMPTIVE taxation scheme that " +
      "estimates profit as a percentage of turnover, without needing detailed expense records.\n\n" +
      "Enter your turnover/receipts, whether you run a business (Section 44AD, presumptive income 8% of " +
      "turnover, or 6% if at least 95% is received digitally) or a specified profession (Section 44ADA, " +
      "presumptive income 50% of gross receipts), and what share of receipts are digital/banked — that " +
      "determines both your rate and your eligible turnover ceiling.",
    examples:
      "Example: a business with ₹15,00,000 turnover, fully digital, has ₹90,000.00 presumptive income (6%) — " +
      "well within the New Regime's rebate threshold, so it owes ₹0.00 tax. A profession with ₹20,00,000 " +
      "receipts, fully digital, has ₹10,00,000.00 presumptive income (50%) — also under the ₹12,00,000 New " +
      "Regime rebate threshold, owing ₹0.00 tax as well.",
    assumptions:
      "This calculator uses the confirmed presumptive taxation thresholds from Budget 2023 (Finance Act 2023, " +
      "unchanged since, and NOT touched by Budget 2025's TDS threshold changes): ₹2 crore standard / ₹3 crore " +
      "enhanced turnover limit for business (44AD), ₹50 lakh standard / ₹75 lakh enhanced for professionals " +
      "(44ADA), with the enhanced limit requiring cash receipts of 5% or less. From 1 April 2026 these sit " +
      "under Sections 45/46 of the Income-tax Act, 2025 rather than the old 44AD/44ADA numbering, with no rate " +
      "change from the renumbering itself. It doesn't apply the salaried-employee standard deduction (not " +
      "available against presumptive business/professional income) or surcharge for very high presumptive " +
      "income.\n\n" +
      IN_DISCLAIMER,
    faq: [
      {
        question: "Do I have to keep detailed expense records under this scheme?",
        answer:
          "No — that's the whole point of presumptive taxation. Instead of deducting your actual business " +
          "expenses one by one, you simply declare a fixed percentage of turnover/receipts as taxable profit, " +
          "with far less bookkeeping and audit requirement, as long as you stay within the eligible turnover " +
          "ceiling.",
      },
      {
        question: "Were the thresholds raised in Budget 2025?",
        answer:
          "No — a common point of confusion. The ₹3 crore/₹75 lakh enhanced limits came from Budget 2023 " +
          "(Finance Act 2023), effective FY2023-24, and remain unchanged through FY2026-27. Budget 2025's " +
          "changes were to TDS thresholds (a separate, unrelated set of provisions) — see the India TDS " +
          "Calculator for those.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:create-india-tool" first, then ` +
        `re-run this script.`
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
