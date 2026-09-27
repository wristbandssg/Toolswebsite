// One-time (but safe to re-run) batch setup script: creates 16 US state
// Business Tax Tools inside the existing "Tax & Paycheck Calculators"
// category — fourth batch of the 50-state audit.
//
// See src/lib/calc-engine-us-other-business-tax.ts for the actual math and
// that file's header for which states have a genuine SECOND state-level
// business levy beyond their corporate income tax (or its substitute).
//
// HOW TO RUN
//   npx tsx prisma/create-us-other-business-tax-calculators.ts
// or
//   npm run db:create-us-other-business-tax-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p}</p>`).join("");
}
function currencyField(key: string, label: string, opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", unit: opts.unit, required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 5_000_000, step: opts.step ?? 1_000 };
}
function numberField(key: string, label: string, opts: { min?: number; max?: number; default?: number; step?: number } = {}) {
  return { key, label, type: "number", required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1_000_000, step: opts.step ?? 1 };
}
function dropdownField(key: string, label: string, options: { label: string; value: number }[], defaultValue = 0) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}
function currencyResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "currency", highlight: opts.highlight };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. Business entity taxes depend on precise definitions (net worth, capital stock, allocated capital, " +
  "and similar terms) that vary by state — consult your accountant or the state's own Secretary of State / " +
  "Department of Revenue for an exact figure.";

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

const TOOLS: ToolDef[] = [
  {
    slug: "alabama-business-tax-calculator",
    title: "Alabama Business Tax Calculator",
    description: "Estimate Alabama's Business Privilege Tax — a net-worth-based tax with rates from $0.25 to $1.75 per $1,000, a $100 minimum, and a $15,000 maximum.",
    metaTitle: "Alabama Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Alabama Business Privilege Tax calculator. Net-worth-based, $100 minimum, $15,000 maximum.",
    calcInputs: [currencyField("netWorth", "Business Net Worth", { max: 50_000_000, step: 10_000 })],
    calcResults: [currencyResult("businessPrivilegeTax", "Alabama Business Privilege Tax", { highlight: true })],
    instructions:
      "Alabama's Business Privilege Tax is based on a business's net worth, at rates that rise from $0.25 to " +
      "$1.75 per $1,000 of net worth as the business gets larger, with a $100 minimum tax and a $15,000 " +
      "maximum. Enter your business's net worth to see an estimate.",
    assumptions:
      "This calculator models Alabama's rate as rising smoothly from $0.25 to $1.75 per $1,000 as net worth " +
      "increases toward $10 million (rather than reproducing the state's exact published rate brackets, which " +
      "actually depend on a business's federal taxable-income ratio, not net worth alone) — a disclosed " +
      "approximation. The $100 minimum and $15,000 maximum are applied exactly.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: a business with $2,000,000 in net worth. Estimated Business Privilege Tax: roughly $700-$1,000, well under the $15,000 cap.",
    faq: [{ question: "Is there a minimum Alabama Business Privilege Tax?", answer: "Yes, $100 — every registered business owes at least this much, even at very low net worth." }],
  },
  {
    slug: "arkansas-business-tax-calculator",
    title: "Arkansas Business Tax Calculator",
    description: "Estimate Arkansas's franchise tax: a per-$1,000-of-capital-stock rate for stock corporations, or a flat fee for non-stock corporations and LLCs.",
    metaTitle: "Arkansas Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Arkansas franchise tax calculator. Stock corporations pay by capital stock; non-stock corps and LLCs pay a flat fee.",
    calcInputs: [
      dropdownField("entityType", "Entity Type", [
        { label: "Stock Corporation", value: 0 },
        { label: "Non-Stock Corporation", value: 1 },
        { label: "LLC", value: 2 },
      ]),
      currencyField("capitalStock", "Capital Stock (stock corporations only)", { required: false, default: 0, max: 20_000_000 }),
    ],
    calcResults: [currencyResult("franchiseTax", "Arkansas Franchise Tax", { highlight: true })],
    instructions:
      "Arkansas's franchise tax depends on your entity type. Stock corporations pay based on capital stock " +
      "(a minimum of $150). Non-stock corporations pay a flat $300. LLCs pay a flat $150. Select your entity " +
      "type — and, if you're a stock corporation, enter your capital stock — to see your estimated tax.",
    assumptions: "This calculator uses Arkansas's published $150 minimum / per-$1,000 rate for stock corporations, and flat $300/$150 fees for non-stock corporations and LLCs.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: a stock corporation with $500,000 in capital stock. Estimated franchise tax: $1,350.",
    faq: [{ question: "Do LLCs pay the same franchise tax as corporations in Arkansas?", answer: "No — LLCs pay a flat $150, regardless of size, while stock corporations pay based on their capital stock." }],
  },
  {
    slug: "california-business-tax-calculator",
    title: "California Business Tax Calculator",
    description: "Estimate California's $800 minimum franchise tax, plus the extra LLC gross-receipts fee (up to $11,790) that applies only to LLCs.",
    metaTitle: "California Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free California business tax calculator. $800 minimum franchise tax for all corps/LLCs, plus a tiered LLC gross-receipts fee up to $11,790.",
    calcInputs: [
      dropdownField("entityType", "Entity Type", [
        { label: "Corporation", value: 0 },
        { label: "LLC", value: 1 },
      ]),
      currencyField("californiaReceipts", "Total California Receipts (LLCs only)", { required: false, default: 0, max: 20_000_000 }),
    ],
    calcResults: [
      currencyResult("minimumFranchiseTax", "Minimum Franchise Tax"),
      currencyResult("llcGrossReceiptsFee", "LLC Gross Receipts Fee (if applicable)"),
      currencyResult("totalBusinessTax", "Total California Business Tax", { highlight: true }),
    ],
    instructions:
      "Every California corporation and LLC owes an $800 minimum franchise tax, regardless of profit. LLCs owe " +
      "an ADDITIONAL tiered fee based on total California receipts, ranging from $0 (under $250,000) up to " +
      "$11,790 (at $5 million or more). Select your entity type and, if an LLC, enter your total California " +
      "receipts.",
    assumptions: "This calculator uses California's current $800 minimum franchise tax and its published LLC gross-receipts fee tiers.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: an LLC with $600,000 in California receipts. $800 minimum franchise tax + $2,500 LLC fee (the $500,000-$999,999 tier) = $3,300 total.",
    faq: [{ question: "Do corporations pay the LLC gross receipts fee too?", answer: "No — only LLCs pay that additional fee; corporations owe just the $800 minimum franchise tax (plus regular corporate income tax on any profit)." }],
  },
  {
    slug: "delaware-business-tax-calculator",
    title: "Delaware Business Tax Calculator",
    description: "Estimate Delaware's Gross Receipts Tax (rate varies by business activity, 0.0945%-1.9914%) plus its Franchise Tax under the authorized-shares method.",
    metaTitle: "Delaware Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Delaware business tax calculator. Combines Gross Receipts Tax (activity-based rate) and Franchise Tax (authorized-shares method).",
    calcInputs: [
      currencyField("grossReceipts", "Gross Receipts", { max: 20_000_000 }),
      numberField("grtRatePercent", "Your Gross Receipts Tax Rate (%, per your business activity)", { min: 0.0945, max: 1.9914, default: 0.0945, step: 0.01 }),
      numberField("authorizedShares", "Authorized Shares", { min: 0, max: 10_000_000, default: 10_000, step: 1_000 }),
    ],
    calcResults: [
      currencyResult("grossReceiptsTax", "Gross Receipts Tax"),
      currencyResult("franchiseTax", "Franchise Tax (Authorized-Shares Method)"),
      currencyResult("totalBusinessTax", "Total Delaware Business Tax", { highlight: true }),
    ],
    instructions:
      "Delaware businesses can owe two separate levies. The Gross Receipts Tax rate depends on your specific " +
      "business activity, ranging from 0.0945% up to 1.9914% — check your published rate with the Delaware " +
      "Division of Revenue and enter it here. The Franchise Tax, under the simpler \"authorized shares\" " +
      "method, starts at $175 for up to 10,000 authorized shares and adds $85 per additional 10,000 shares, " +
      "capped at $200,000. Enter your figures to see both, plus the combined total.",
    assumptions:
      "This calculator uses the authorized-shares method for Delaware's franchise tax, which is the simpler of " +
      "two methods Delaware offers (the alternative \"assumed par value capital\" method can produce a lower " +
      "figure for some corporations — check both with your accountant). You must supply your own specific " +
      "Gross Receipts Tax rate, since it varies by exact business activity.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: $1,000,000 gross receipts at a 0.3% rate, 30,000 authorized shares. GRT: $3,000. Franchise tax: $175 + 2 x $85 = $345. Total: $3,345.",
    faq: [{ question: "Is the authorized-shares method always the cheapest for franchise tax?", answer: "Not necessarily — Delaware also offers an alternative \"assumed par value capital\" method that can produce a lower bill for some corporations with high-value stock; compare both with your accountant." }],
  },
  {
    slug: "georgia-business-tax-calculator",
    title: "Georgia Business Tax Calculator",
    description: "Estimate Georgia's Net Worth Tax — exempt below $100,000 of net worth, capped at $5,000 above $22 million.",
    metaTitle: "Georgia Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Georgia Net Worth Tax calculator. Exempt under $100,000 net worth; capped at $5,000 above $22 million.",
    calcInputs: [currencyField("netWorth", "Business Net Worth", { max: 30_000_000, step: 10_000 })],
    calcResults: [currencyResult("netWorthTax", "Georgia Net Worth Tax", { highlight: true })],
    instructions:
      "Georgia's Net Worth Tax exempts businesses with net worth of $100,000 or less, then rises through a " +
      "series of published fee brackets up to a maximum of $5,000 for net worth above $22 million. Enter your " +
      "net worth to see an estimate.",
    assumptions:
      "This calculator approximates Georgia's stepped fee table (a series of specific dollar amounts per " +
      "bracket, rather than a smooth rate) as rising in a straight line between a low bracket fee just above " +
      "the $100,000 exemption and the $5,000 maximum at $22 million — a disclosed simplification, since the " +
      "audit behind this tool could not independently re-confirm every exact bracket boundary against a live, " +
      "current source. Verify with the Georgia Department of Revenue for an exact figure.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: a business with $5,000,000 in net worth. Estimated Net Worth Tax: roughly $1,100-$1,200.",
    faq: [{ question: "Is there a Georgia business with $0 net worth tax?", answer: "Yes — businesses with net worth of $100,000 or less owe nothing." }],
  },
  {
    slug: "illinois-business-tax-calculator",
    title: "Illinois Business Tax Calculator",
    description: "Estimate Illinois's franchise tax — 0.1% of allocated paid-in capital, with a $25 minimum and $2 million cap.",
    metaTitle: "Illinois Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Illinois franchise tax calculator. 0.1% of allocated paid-in capital, $25 minimum, $2M cap.",
    calcInputs: [currencyField("allocatedPaidInCapital", "Allocated Paid-In Capital", { max: 500_000_000, step: 10_000 })],
    calcResults: [currencyResult("franchiseTax", "Illinois Franchise Tax", { highlight: true })],
    instructions:
      "Illinois still levies a franchise tax on corporations at 0.1% of allocated paid-in capital (repeal bills " +
      "have stalled in the legislature, so it remains in effect), with a $25 minimum and a $2 million cap for " +
      "very large corporations. Enter your allocated paid-in capital to see an estimate.",
    assumptions: "This calculator uses Illinois's current 0.1% rate, $25 minimum, and $2,000,000 cap — verify that franchise tax repeal legislation hasn't since passed, given it has been actively debated.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $5,000,000 in allocated paid-in capital. Franchise tax: $5,000,000 x 0.1% = $5,000.",
    faq: [{ question: "Is Illinois's franchise tax being repealed?", answer: "Repeal bills have been proposed and stalled in the legislature as of this tool's last review — it remains in effect for now, but check for updates." }],
  },
  {
    slug: "kentucky-business-tax-calculator",
    title: "Kentucky Business Tax Calculator",
    description: "Estimate Kentucky's Limited Liability Entity Tax (LLET) — the LESSER of 0.095% of gross receipts or 0.75% of gross profits, with a $175 minimum.",
    metaTitle: "Kentucky Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Kentucky LLET calculator. Pays the lesser of 0.095% of gross receipts or 0.75% of gross profits, $175 minimum.",
    calcInputs: [
      currencyField("grossReceipts", "Gross Receipts", { max: 50_000_000, step: 10_000 }),
      currencyField("grossProfits", "Gross Profits", { max: 20_000_000, step: 10_000 }),
    ],
    calcResults: [currencyResult("lletTax", "Kentucky LLET Tax", { highlight: true })],
    instructions:
      "Kentucky's Limited Liability Entity Tax (LLET) applies to most corporations and LLCs, and it's " +
      "calculated TWO ways — 0.095% of gross receipts, and 0.75% of gross profits — with the LOWER of the two " +
      "results owed, subject to a $175 minimum. Enter both figures to see your estimated tax.",
    assumptions: "This calculator uses Kentucky's published 0.095%/0.75% rates and $175 minimum, taking the lesser of the two calculations exactly as the law specifies.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $10,000,000 gross receipts, $500,000 gross profits. Receipts basis: $9,500. Profits basis: $3,750. The lesser, $3,750, is owed.",
    faq: [{ question: "Why does Kentucky calculate this tax two different ways?", answer: "To let businesses with thin profit margins (high receipts, low profits) pay based on the lower profits-based figure instead of an unfavorable receipts-based one." }],
  },
  {
    slug: "massachusetts-business-tax-calculator",
    title: "Massachusetts Business Tax Calculator",
    description: "Estimate the non-income portion of Massachusetts's corporate excise tax — $2.60 per $1,000 of tangible property or net worth.",
    metaTitle: "Massachusetts Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Massachusetts business tax calculator. Corporate excise non-income measure: $2.60 per $1,000 of tangible property or net worth.",
    calcInputs: [currencyField("tangiblePropertyOrNetWorth", "Tangible Property or Net Worth (whichever applies)", { max: 50_000_000, step: 10_000 })],
    calcResults: [currencyResult("corporateExciseNonIncomeTax", "Massachusetts Corporate Excise (Non-Income Measure)", { highlight: true })],
    instructions:
      "Massachusetts's corporate excise tax has two parts: an income-based measure (already covered by our " +
      "Massachusetts Corporate Tax Calculator) and a separate NON-income measure, based on either tangible " +
      "property or net worth (whichever applies to your corporation), at $2.60 per $1,000. Enter that figure " +
      "to see this second, non-income portion.",
    assumptions: "This calculator covers only the non-income (property/net worth) measure of Massachusetts's corporate excise tax, at its published $2.60-per-$1,000 rate.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $2,000,000 in tangible property. Non-income excise: $2,000,000 x 0.26% = $5,200.",
    faq: [{ question: "Is this instead of Massachusetts's income-based corporate tax?", answer: "No — this is a SEPARATE, additional measure. Massachusetts corporations generally owe both the income-based excise and this non-income measure." }],
  },
  {
    slug: "minnesota-business-tax-calculator",
    title: "Minnesota Business Tax Calculator",
    description: "Estimate Minnesota's unique state-administered General Property Tax on commercial-industrial or seasonal-recreational property.",
    metaTitle: "Minnesota Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Minnesota business tax calculator. State General Property Tax: 28.313% (commercial-industrial) or 9.203% (seasonal-recreational) of net tax capacity.",
    calcInputs: [
      numberField("netTaxCapacity", "Net Tax Capacity (from your county assessment)", { min: 0, max: 10_000_000, default: 0, step: 100 }),
      dropdownField("propertyClass", "Property Class", [
        { label: "Commercial / Industrial", value: 0 },
        { label: "Seasonal-Recreational", value: 1 },
      ]),
    ],
    calcResults: [currencyResult("stateGeneralPropertyTax", "Minnesota State General Property Tax", { highlight: true })],
    instructions:
      "Minnesota is unusual: on top of ordinary locally-administered property tax, it levies its own genuine " +
      "STATE-level property tax on commercial-industrial and seasonal-recreational property, based on the " +
      "property's \"net tax capacity\" (a Minnesota-specific figure your county assessor calculates from market " +
      "value and property class — not the same as market value itself). Enter your property's net tax " +
      "capacity and select its class to see this state-level tax.",
    assumptions:
      "This calculator requires your property's NET TAX CAPACITY figure, not its market value — get this from " +
      "your county assessment notice. It uses Minnesota's published 28.313% (commercial-industrial) and " +
      "9.203% (seasonal-recreational) state rates.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: a commercial property with a net tax capacity of $50,000. State tax: $50,000 x 28.313% = $14,156.50.",
    faq: [{ question: "Is this the same as ordinary local property tax?", answer: "No — this is Minnesota's own separate STATE-level property tax layered on top of ordinary locally-administered property tax, and it applies only to commercial-industrial and seasonal-recreational property." }],
  },
  {
    slug: "mississippi-business-tax-calculator",
    title: "Mississippi Business Tax Calculator",
    description: "Estimate Mississippi's franchise tax — $0.50 per $1,000 of capital, currently being phased down to $0 by 2028.",
    metaTitle: "Mississippi Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Mississippi franchise tax calculator. Currently $0.50 per $1,000 of capital, phasing to $0 by 2028.",
    calcInputs: [currencyField("capital", "Capital", { max: 20_000_000, step: 10_000 })],
    calcResults: [currencyResult("franchiseTax", "Mississippi Franchise Tax", { highlight: true })],
    instructions:
      "Mississippi's franchise tax is being phased out entirely — it will reach $0 by 2028. In the meantime, " +
      "it's currently levied at $0.50 per $1,000 of capital, with a $25 minimum. Enter your capital to see this " +
      "year's estimated tax.",
    assumptions: "This calculator uses Mississippi's current (2026) $0.50-per-$1,000 rate and $25 minimum — the exact rate for years between now and its full 2028 phase-out to $0 wasn't independently confirmed by this tool's research; verify the current-year rate with the Mississippi Department of Revenue.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $1,000,000 in capital. Franchise tax: $1,000,000 x 0.05% = $500.",
    faq: [{ question: "Is Mississippi eliminating this tax?", answer: "Yes — it's being phased down year by year, reaching $0 by 2028." }],
  },
  {
    slug: "nevada-business-tax-calculator",
    title: "Nevada Business Tax Calculator",
    description: "Estimate Nevada's Modified Business Tax (a payroll-based tax) — an estimated 1.378% (or 1.554% for financial institutions) above a $50,000 quarterly exemption.",
    metaTitle: "Nevada Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Nevada Modified Business Tax calculator. Payroll-based, ~1.378% (1.554% for financial institutions) above a quarterly exemption.",
    calcInputs: [
      currencyField("quarterlyPayroll", "Quarterly Gross Payroll", { max: 5_000_000, step: 5_000 }),
      dropdownField("businessType", "Business Type", [
        { label: "General Business", value: 0 },
        { label: "Financial Institution", value: 1 },
      ]),
    ],
    calcResults: [currencyResult("quarterlyExemption", "Quarterly Exemption"), currencyResult("modifiedBusinessTax", "Nevada Modified Business Tax", { highlight: true })],
    instructions:
      "Nevada has no corporate or personal income tax, but it does levy a Modified Business Tax based on total " +
      "quarterly payroll, at roughly 1.378% for general businesses (1.554% for financial institutions), above " +
      "an exemption on the first portion of quarterly payroll. Enter your quarterly payroll and business type " +
      "to see an estimate.",
    assumptions:
      "This calculator uses an approximate $50,000 quarterly payroll exemption and a flat 1.378%/1.554% rate " +
      "above it — Nevada's published rate is described as a range (1.17%-1.378%) that may vary by payroll size " +
      "or industry in ways this tool's research couldn't fully pin down; verify the precise current rate and " +
      "exemption with the Nevada Department of Taxation.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: $200,000 in quarterly payroll, general business. Taxable: $150,000. Tax: $150,000 x 1.378% = $2,067.",
    faq: [{ question: "Does every Nevada business owe this tax?", answer: "Only if quarterly payroll exceeds the exemption threshold — smaller employers below it owe nothing." }],
  },
  {
    slug: "new-hampshire-business-tax-calculator",
    title: "New Hampshire Business Tax Calculator",
    description: "Estimate New Hampshire's Business Enterprise Tax (BET) — 0.55% of a value-added-style base (compensation + interest + dividends paid).",
    metaTitle: "New Hampshire Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free New Hampshire BET calculator. 0.55% of compensation + interest + dividends paid.",
    calcInputs: [
      currencyField("compensationPaid", "Total Compensation Paid", { max: 20_000_000, step: 10_000 }),
      currencyField("interestPaid", "Total Interest Paid", { required: false, default: 0, max: 5_000_000 }),
      currencyField("dividendsPaid", "Total Dividends Paid", { required: false, default: 0, max: 5_000_000 }),
    ],
    calcResults: [currencyResult("valueAddedBase", "Value-Added Base"), currencyResult("businessEnterpriseTax", "New Hampshire Business Enterprise Tax", { highlight: true })],
    instructions:
      "New Hampshire's Business Enterprise Tax (BET) is separate from its Business Profits Tax (which we cover " +
      "under Corporate Tax). BET applies a value-added approach: 0.55% of the sum of compensation, interest, " +
      "and dividends a business pays out. Enter each figure to see your estimated BET.",
    assumptions: "This calculator uses New Hampshire's published 0.55% BET rate applied to the sum of compensation, interest, and dividends paid, as the law describes the base.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $1,000,000 in compensation, $20,000 in interest, $10,000 in dividends paid. Base: $1,030,000. BET: $1,030,000 x 0.55% = $5,665.",
    faq: [{ question: "Is BET the same as New Hampshire's Business Profits Tax?", answer: "No — they're two separate taxes. BET is based on compensation/interest/dividends paid; the Business Profits Tax (7.5%) is based on business profit and is covered by our New Hampshire Corporate Tax Calculator." }],
  },
  {
    slug: "north-carolina-business-tax-calculator",
    title: "North Carolina Business Tax Calculator",
    description: "Estimate North Carolina's franchise tax — $1.50 per $1,000 of the franchise tax base, with a $200 minimum.",
    metaTitle: "North Carolina Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free North Carolina franchise tax calculator. $1.50 per $1,000 of tax base, $200 minimum.",
    calcInputs: [currencyField("franchiseTaxBase", "Franchise Tax Base (capital stock, surplus & undivided profits)", { max: 50_000_000, step: 10_000 })],
    calcResults: [currencyResult("franchiseTax", "North Carolina Franchise Tax", { highlight: true })],
    instructions:
      "North Carolina's franchise tax is based on a corporation's capital stock, surplus, and undivided " +
      "profits (its \"franchise tax base\"), at $1.50 per $1,000, with a $200 minimum. Enter your franchise " +
      "tax base to see an estimate.",
    assumptions: "This calculator uses North Carolina's published $1.50-per-$1,000 rate and $200 minimum.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: a $2,000,000 franchise tax base. Franchise tax: $2,000,000 x 0.15% = $3,000.",
    faq: [{ question: "What counts toward North Carolina's franchise tax base?", answer: "Generally your capital stock, surplus, and undivided profits — a figure your accountant calculates from your balance sheet, not simply your revenue." }],
  },
  {
    slug: "oregon-business-tax-calculator",
    title: "Oregon Business Tax Calculator",
    description: "Estimate Oregon's Corporate Activity Tax (CAT) — a $250 base tax plus 0.57% of gross commercial activity above $1 million, stacked on top of Oregon's regular corporate tax.",
    metaTitle: "Oregon Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Oregon CAT calculator. $250 base + 0.57% of gross commercial activity above $1M — separate from Oregon's regular corporate tax.",
    calcInputs: [currencyField("taxableCommercialActivity", "Taxable Commercial Activity", { max: 50_000_000, step: 50_000 })],
    calcResults: [currencyResult("corporateActivityTax", "Oregon Corporate Activity Tax (CAT)", { highlight: true })],
    instructions:
      "Oregon is one of the few states to stack TWO separate business taxes: its regular corporate income tax " +
      "(covered by our Oregon Corporate Tax Calculator) AND a separate Corporate Activity Tax (CAT) — a $250 " +
      "base tax plus 0.57% of gross commercial activity above $1 million. Enter your taxable commercial " +
      "activity to see your estimated CAT.",
    assumptions:
      "This calculator uses Oregon's published $250 base and 0.57% rate above the $1 million threshold. It " +
      "doesn't model Oregon's cost-of-goods-sold deduction (up to 35% of certain costs may reduce the taxable " +
      "activity figure) — your actual CAT could be lower if that deduction applies to you.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: $3,000,000 in taxable commercial activity. CAT: $250 + ($2,000,000 x 0.57%) = $11,650.",
    faq: [{ question: "Is CAT instead of Oregon's corporate income tax?", answer: "No — Oregon stacks both. CAT is a separate, additional tax on top of the regular corporate excise/income tax." }],
  },
  {
    slug: "south-carolina-business-tax-calculator",
    title: "South Carolina Business Tax Calculator",
    description: "Estimate South Carolina's Corporate License Fee — 0.1% of capital plus a flat $15, with a $25 minimum.",
    metaTitle: "South Carolina Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free South Carolina Corporate License Fee calculator. 0.1% of capital plus $15, $25 minimum.",
    calcInputs: [currencyField("capital", "Capital", { max: 20_000_000, step: 10_000 })],
    calcResults: [currencyResult("corporateLicenseFee", "South Carolina Corporate License Fee", { highlight: true })],
    instructions:
      "South Carolina's Corporate License Fee is 0.1% of a corporation's capital, plus a flat $15, with a $25 " +
      "minimum overall. Enter your capital to see an estimate.",
    assumptions: "This calculator uses South Carolina's published 0.1% rate, $15 flat addition, and $25 minimum.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $500,000 in capital. Fee: ($500,000 x 0.1%) + $15 = $515.",
    faq: [{ question: "Is there a minimum South Carolina Corporate License Fee?", answer: "Yes, $25 — every corporation owes at least this much." }],
  },
  {
    slug: "west-virginia-business-tax-calculator",
    title: "West Virginia Business Tax Calculator",
    description: "Estimate West Virginia's severance tax on coal, natural gas, or oil production — 5% of gross value (coal has an additional per-ton minimum floor).",
    metaTitle: "West Virginia Business Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free West Virginia severance tax calculator. 5% of gross value for coal, natural gas, or oil — coal also has a per-ton minimum.",
    calcInputs: [
      dropdownField("productionType", "Production Type", [
        { label: "Coal", value: 0 },
        { label: "Natural Gas or Oil", value: 1 },
      ]),
      currencyField("grossValue", "Gross Value of Production", { max: 50_000_000, step: 10_000 }),
      numberField("tonsProduced", "Tons Produced (coal only)", { min: 0, max: 10_000_000, default: 0, step: 100 }),
    ],
    calcResults: [currencyResult("severanceTax", "West Virginia Severance Tax", { highlight: true })],
    instructions:
      "West Virginia levies a severance tax on extracting coal, natural gas, and oil — generally 5% of gross " +
      "value. For coal specifically, there's also a per-ton minimum floor ($0.75/ton) that applies when it " +
      "would produce a higher tax than the straight 5% calculation. Select your production type and enter the " +
      "relevant figures.",
    assumptions: "This calculator uses West Virginia's published 5% ad valorem severance rate and, for coal, the $0.75/ton minimum floor, taking the higher of the two calculations.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: coal production with a gross value of $500,000 and 8,000 tons produced. Ad valorem: $25,000. Ton floor: $6,000. The higher figure, $25,000, is owed.",
    faq: [{ question: "Does West Virginia tax natural gas and oil the same as coal?", answer: "The base 5% ad valorem rate is similar, but coal has an additional per-ton minimum floor that gas and oil don't." }],
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
