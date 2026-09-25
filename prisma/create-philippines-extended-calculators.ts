// One-time (but safe to re-run) batch setup script: creates 10 more Tools
// under the EXISTING "Philippines Tax & Salary Calculators" category (slug
// "philippines-tax-salary-calculators", created by
// create-philippines-tax-tool.ts — this script does NOT create the
// category; it fails loudly if it's missing).
//
// See src/lib/calc-engine-philippines-extended-calculators.ts for the
// actual math and which of its exported functions each of these 10 slugs
// maps to, and that file's header for the bir.gov.ph source notes —
// including why the Capital Gains Tax tool models two genuinely different
// mechanisms (6% on real property vs 15% on unlisted shares) as one tool,
// and why the Real Property Tax tool uses only the national statutory caps
// rather than a specific city's rates.
//
// HOW TO RUN
//   npx tsx prisma/create-philippines-extended-calculators.ts
// or
//   npm run db:create-philippines-extended-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "philippines-tax-salary-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function phpField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit ?? "PHP",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 50000000,
    step: opts.step ?? 1000,
  };
}

function phpResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", currency: "PHP", unit: opts.unit, highlight: opts.highlight };
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

const PH_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified tax adviser or the Bureau of Internal " +
  "Revenue (BIR).";

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
  // 1. Philippines VAT Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-vat-calculator",
    title: "Philippines VAT Calculator",
    description: "Add or extract 12% VAT from an amount, or confirm a zero-rated/exempt transaction.",
    metaTitle: "Philippines VAT Calculator — Free & Instant",
    metaDescription:
      "Free Philippines VAT calculator using the current 12% standard rate. Add or extract VAT, or check zero-" +
      "rated/exempt transactions.",
    calcInputs: [
      phpField("amount", "Amount", { unit: "PHP", max: 50000000, step: 100 }),
      yesNoField("isZeroRatedOrExempt", "Is This Transaction Zero-Rated or VAT-Exempt?"),
      yesNoField("isInclusive", "Is the Amount Already VAT-Inclusive?"),
    ],
    calcResult: { label: "VAT Amount", format: "currency", currency: "PHP" },
    calcResults: [
      phpResult("netAmount", "Net Amount (Excluding VAT)"),
      phpResult("vatAmount", "VAT Amount", { highlight: true }),
      phpResult("grossAmount", "Gross Amount (Including VAT)"),
    ],
    instructions:
      "Enter an amount, say whether the transaction is zero-rated or VAT-exempt, and whether the amount already " +
      "includes VAT. The Philippines charges a standard 12% VAT on most goods and services, with businesses " +
      "required to register once gross annual sales/receipts exceed PHP3,000,000.\n\n" +
      "Certain transactions are zero-rated (mainly qualifying exports) or exempt (basic agricultural food " +
      "products, residential leases at or below PHP15,000/month, house-and-lot sales at or below PHP3,600,000, " +
      "and purchases by senior citizens/PWDs on covered categories, among others) — select that option to see " +
      "PHP0.00 VAT.",
    examples: "Example: a PHP10,000 price (not exempt) owes PHP1,200.00 VAT, for a PHP11,200.00 VAT-inclusive total.",
    assumptions:
      "This calculator uses the confirmed current 12% standard VAT rate and PHP3,000,000 VAT registration " +
      "threshold from the NIRC as amended by RA 10963 (TRAIN). It doesn't classify a specific transaction as " +
      "zero-rated/exempt for you — the exact rules (especially for export-oriented enterprises, whose zero-" +
      "rating mechanics were reshaped by the CREATE MORE Act, RA 12066) are still receiving BIR implementing " +
      "guidance as of 2026 — confirm your specific transaction's treatment with BIR or a tax adviser.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "What transactions are VAT-exempt?",
        answer:
          "Common exemptions include basic agricultural/marine food products in their original state, " +
          "residential leases at or below PHP15,000/month, sales of house-and-lot residential dwellings at or " +
          "below PHP3,600,000, and purchases by senior citizens and PWDs on covered categories like medicines " +
          "and medical services — among several others under Section 109 of the NIRC.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 2. Philippines Withholding Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-withholding-tax-calculator",
    title: "Philippines Withholding Tax Calculator",
    description: "Calculate Expanded Withholding Tax (EWT) for common income payment types.",
    metaTitle: "Philippines Withholding Tax Calculator (EWT) — Free & Instant",
    metaDescription:
      "Free Philippines Expanded Withholding Tax calculator. Choose your payment type to see the applicable " +
      "EWT rate and net payment.",
    calcInputs: [
      phpField("paymentAmount", "Payment Amount", { unit: "PHP", max: 50000000 }),
      {
        key: "paymentType",
        label: "Payment Type",
        type: "dropdown",
        required: true,
        default: 1,
        options: [
          { label: "Professional Fees — Individual, Non-VAT/Gross ≤ PHP3M (5%)", value: 0 },
          { label: "Professional Fees — Individual, VAT-Registered/Gross > PHP3M (10%)", value: 1 },
          { label: "Professional Fees — Corporate, Gross ≤ PHP720K (10%)", value: 2 },
          { label: "Professional Fees — Corporate, Gross > PHP720K (15%)", value: 3 },
          { label: "Rental (Real/Personal Property) (5%)", value: 4 },
          { label: "Contractors — General Engineering/Building/Specialty (2%)", value: 5 },
          { label: "Top Withholding Agent Payments to Suppliers of Goods (1%)", value: 6 },
          { label: "Top Withholding Agent Payments to Suppliers of Services (2%)", value: 7 },
          { label: "Purchases of Agricultural Products, Cumulative > PHP300,000 (1%)", value: 8 },
        ],
      },
    ],
    calcResult: { label: "Withholding Tax", format: "currency", currency: "PHP" },
    calcResults: [
      percentResult("rateApplied", "EWT Rate Applied"),
      phpResult("withholdingTax", "Withholding Tax", { highlight: true }),
      phpResult("netPayment", "Net Payment After Withholding"),
    ],
    instructions:
      "Enter the payment amount and select the payment type. Expanded Withholding Tax (EWT) requires the PAYER " +
      "to withhold tax before paying, remitting it directly to BIR on the payee's behalf — the rate depends on " +
      "the specific type of income payment, following BIR's Alphanumeric Tax Code (ATC) classification.",
    examples: "Example: a PHP500,000 contractor payment owes 2% EWT (PHP10,000.00), for a PHP490,000.00 net payment.",
    assumptions:
      "This calculator covers a REPRESENTATIVE SUBSET of common EWT categories confirmed via RR 11-2018 (the " +
      "TRAIN-era withholding tax regulations) — not the full BIR Alphanumeric Tax Code table, which has dozens " +
      "of narrower categories (commissions, income distributions from estates/trusts, sale of real property as " +
      "ordinary asset, mineral/quarry resources, and more). Confirm the exact ATC and rate for your specific " +
      "payment type against BIR's current published table.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "Is EWT my final tax?",
        answer:
          "No — like most withholding taxes, EWT is an advance credit toward the payee's total income tax " +
          "liability for the year, reconciled when they file their annual return. It's the payer's " +
          "responsibility to withhold and remit it, not a separate final tax.",
      },
      {
        question: "Does this cover every payment type?",
        answer:
          "No — this tool models the most common categories individuals and small businesses encounter. BIR's " +
          "full Alphanumeric Tax Code table has many more specific categories with their own rates; check the " +
          "official table if your payment type isn't listed here.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 3. Philippines Capital Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-capital-gains-tax-calculator",
    title: "Philippines Capital Gains Tax Calculator",
    description: "Calculate Capital Gains Tax on real property (6%) or unlisted shares (15%) — two distinct mechanisms.",
    metaTitle: "Philippines Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free Philippines CGT calculator covering both mechanisms: 6% final tax on real property capital assets, " +
      "and 15% on unlisted shares.",
    calcInputs: [
      {
        key: "assetType",
        label: "Asset Type",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Real Property (Capital Asset)", value: 0 },
          { label: "Shares of Stock Not Traded on the Exchange", value: 1 },
        ],
      },
      phpField("grossSellingPrice", "Gross Selling Price (Real Property Only)", { unit: "PHP", max: 100000000, required: false }),
      phpField("fairMarketValue", "Fair Market/Zonal Value (Real Property Only)", { unit: "PHP", max: 100000000, required: false }),
      phpField("netCapitalGain", "Net Capital Gain (Unlisted Shares Only)", { unit: "PHP", max: 100000000, required: false }),
    ],
    calcResult: { label: "Tax on Gain", format: "currency", currency: "PHP" },
    calcResults: [
      phpResult("taxBase", "Tax Base"),
      phpResult("taxOnGain", "Tax on Gain", { highlight: true }),
      phpResult("netProceeds", "Net Proceeds After Tax"),
    ],
    instructions:
      "Choose your asset type. Real property classified as a capital asset owes a flat 6% final tax on the " +
      "HIGHER of the gross selling price or the fair market/zonal value — not simply the actual sale price, so " +
      "under-declaring the price doesn't reduce the tax. Shares of stock NOT traded through the local stock " +
      "exchange instead owe a flat 15% final tax on the net capital gain (sale price minus cost basis and " +
      "selling expenses) — a completely different base and rate.",
    examples:
      "Example: real property sold for PHP5,000,000 (higher than its PHP4,500,000 zonal value) owes " +
      "PHP300,000.00 CGT (6% of the PHP5,000,000 selling price). Unlisted shares with a PHP1,000,000 net gain " +
      "instead owe PHP150,000.00 CGT (15% of the net gain).",
    assumptions:
      "This calculator uses the confirmed current rates — 6% on real property capital assets (base: higher of " +
      "gross selling price or FMV/zonal value) and 15% on unlisted shares (base: net capital gain, a flat rate " +
      "since TRAIN replaced the old tiered 5%/10% structure) — under Section 24(C)/(D) of the NIRC as amended. " +
      "It doesn't classify whether your real property is genuinely a capital asset versus an ordinary asset " +
      "(used in trade/business), which affects whether CGT or regular income tax/withholding applies instead.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "Why is real property CGT based on the higher of two values?",
        answer:
          "To prevent under-declaring the sale price to reduce tax — the government's own fair market/zonal " +
          "value acts as a floor, so the 6% tax always applies to at least that amount regardless of what price " +
          "is stated in the deed of sale.",
      },
      {
        question: "What if my real property isn't a capital asset?",
        answer:
          "Property used in your trade or business (an \"ordinary asset\") doesn't qualify for the 6% capital " +
          "gains treatment — it's instead subject to regular income tax and/or a 6% creditable withholding tax " +
          "depending on the seller type, a different calculation not covered by this tool.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 4. Philippines Estate Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-estate-tax-calculator",
    title: "Philippines Estate Tax Calculator",
    description: "Calculate estate tax at the flat 6% TRAIN-law rate, with standard and family home deductions.",
    metaTitle: "Philippines Estate Tax Calculator — Free & Instant",
    metaDescription:
      "Free Philippines estate tax calculator using the flat 6% TRAIN-law rate, PHP5,000,000 standard " +
      "deduction, and PHP10,000,000 family home deduction cap.",
    calcInputs: [
      phpField("grossEstate", "Gross Estate Value", { unit: "PHP", max: 500000000 }),
      phpField("familyHomeValue", "Family Home Fair Market Value", { unit: "PHP", max: 100000000, required: false }),
      phpField("otherDeductions", "Other Deductions (Claims, Unpaid Mortgages/Taxes, etc.)", { unit: "PHP", max: 100000000, required: false }),
      yesNoField("isNonResidentAlien", "Was the Decedent a Non-Resident Alien?"),
    ],
    calcResult: { label: "Estate Tax", format: "currency", currency: "PHP" },
    calcResults: [
      phpResult("standardDeduction", "Standard Deduction"),
      phpResult("familyHomeDeduction", "Family Home Deduction"),
      phpResult("netEstate", "Net Taxable Estate"),
      phpResult("estateTax", "Estate Tax", { highlight: true }),
    ],
    instructions:
      "Enter the gross estate value, the family home's fair market value, any other deductions, and whether the " +
      "decedent was a non-resident alien. Estate tax is a flat 6% of the net estate (gross estate minus " +
      "deductions). Resident citizens get a PHP5,000,000 standard deduction (no substantiation needed) plus a " +
      "family home deduction up to PHP10,000,000 of the home's fair market value; non-resident aliens get only " +
      "a PHP500,000 standard deduction and no family home deduction.",
    examples:
      "Example: a resident citizen's PHP20,000,000 estate, with an PHP8,000,000 family home and PHP1,000,000 " +
      "other deductions, has a PHP6,000,000.00 net taxable estate (after the PHP5,000,000 standard + " +
      "PHP8,000,000 family home + PHP1,000,000 other deductions) — PHP360,000.00 estate tax.",
    assumptions:
      "This calculator uses the confirmed flat 6% rate, PHP5,000,000/PHP500,000 standard deductions, and " +
      "PHP10,000,000 family home deduction cap from RA 10963 (TRAIN) and RR 12-2018, unchanged since 2018. It " +
      "doesn't model the vanishing deduction (for property previously taxed within 5 years), claims against " +
      "insolvent persons, or the net share of a surviving spouse in conjugal/community property — all separate " +
      "deductions that could further reduce a specific estate's tax.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "Do I need receipts for the PHP5,000,000 standard deduction?",
        answer:
          "No — the standard deduction for resident citizens/resident aliens is automatic and requires no " +
          "substantiation, unlike most other estate tax deductions (claims against the estate, unpaid " +
          "mortgages, etc.), which do require documentation.",
      },
      {
        question: "What if the family home is worth more than PHP10,000,000?",
        answer:
          "Only the first PHP10,000,000 of the family home's fair market value is deductible — any value above " +
          "that cap remains part of the taxable net estate. You'll also need certification (typically from the " +
          "Barangay Captain) confirming it was the decedent's actual family residence at the time of death.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 5. Philippines Donor's Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-donors-tax-calculator",
    title: "Philippines Donor's Tax Calculator",
    description: "Calculate donor's tax at the flat 6% TRAIN-law rate, with the PHP250,000 annual exemption.",
    metaTitle: "Philippines Donor's Tax Calculator — Free & Instant",
    metaDescription:
      "Free Philippines donor's tax calculator using the flat 6% TRAIN-law rate and PHP250,000 annual " +
      "exemption, accounting for prior gifts in the same year.",
    calcInputs: [
      phpField("giftValue", "This Gift's Value", { unit: "PHP", max: 100000000 }),
      phpField("priorGiftsThisYear", "Prior Gifts Already Made This Calendar Year", { unit: "PHP", max: 100000000, required: false }),
    ],
    calcResult: { label: "Donor's Tax on This Gift", format: "currency", currency: "PHP" },
    calcResults: [
      phpResult("netGiftsAfterExemption", "Total Net Gifts This Year (After Exemption)"),
      phpResult("donorsTax", "Donor's Tax on This Gift", { highlight: true }),
    ],
    instructions:
      "Enter this gift's value and the total of any other gifts you've already made this calendar year. Donor's " +
      "Tax is a flat 6% on net gifts exceeding PHP250,000 PER CALENDAR YEAR (cumulative across all your gifts, " +
      "not per gift or per recipient) — under TRAIN, the relationship between donor and donee (relative or " +
      "stranger) no longer affects the rate, unlike pre-2018 law.",
    examples:
      "Example: a first PHP1,000,000 gift this year owes PHP45,000.00 donor's tax (6% of the PHP750,000 above " +
      "the PHP250,000 exemption). A SECOND PHP500,000 gift later the same year owes PHP30,000.00 more — " +
      "calculated on the cumulative PHP1,500,000 total, minus tax already paid on the first gift.",
    assumptions:
      "This calculator uses the confirmed flat 6% rate and PHP250,000 annual exemption from RA 10963 (TRAIN) " +
      "and RR 12-2018, unchanged since 2018. Donor's tax returns are due within 30 days of each gift — this " +
      "tool computes the incremental tax owed on the CURRENT gift given what you've already given this year, " +
      "matching how cumulative computation works in practice.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "Is the PHP250,000 exemption per gift or per year?",
        answer:
          "Per calendar year, cumulative across ALL your gifts to anyone during that year — not a separate " +
          "PHP250,000 exemption for each individual gift or each recipient.",
      },
      {
        question: "Does it matter if I'm gifting to a relative or a stranger?",
        answer:
          "Not anymore — before TRAIN, gifts to \"strangers\" (non-relatives) were taxed at a flat 30% while " +
          "gifts to relatives used graduated rates. TRAIN replaced both with a single flat 6% rate regardless of " +
          "the relationship between donor and donee.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 6. Philippines Percentage Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-percentage-tax-calculator",
    title: "Philippines Percentage Tax Calculator",
    description: "Calculate the 3% percentage tax for non-VAT-registered businesses under the VAT threshold.",
    metaTitle: "Philippines Percentage Tax Calculator — Free & Instant",
    metaDescription:
      "Free Philippines percentage tax calculator using the current 3% rate (reverted from the temporary 1% " +
      "COVID-era rate on 1 July 2023).",
    calcInputs: [phpField("grossSales", "Gross Sales/Receipts", { unit: "PHP/year", max: 10000000 })],
    calcResult: { label: "Percentage Tax", format: "currency", currency: "PHP" },
    calcResults: [
      { key: "isEligible", label: "Within the PHP3,000,000 Threshold?", format: "number" },
      phpResult("percentageTax", "Percentage Tax", { highlight: true }),
    ],
    instructions:
      "Enter your gross sales/receipts. Businesses and self-employed individuals with gross sales/receipts NOT " +
      "exceeding PHP3,000,000/year, who aren't VAT-registered, pay a flat 3% Percentage Tax under Section 116 " +
      "instead of VAT.\n\n" +
      "Note: a temporary 1% rate applied from July 2020 through June 2023 under the CREATE Act's COVID relief " +
      "measures — this REVERTED to the standard 3% rate effective 1 July 2023, confirmed via BIR's RMC No. 69-" +
      "2023, and 3% is the current rate used here.",
    examples: "Example: PHP2,000,000 gross sales owes PHP60,000.00 percentage tax (3%) — you're within the PHP3,000,000 eligibility threshold.",
    assumptions:
      "This calculator uses the confirmed current 3% Percentage Tax rate, reverted from the temporary 1% COVID-" +
      "era rate effective 1 July 2023 per BIR RMC No. 69-2023. If your gross sales/receipts are within the " +
      "PHP3,000,000 threshold, you may also be eligible to elect the 8% flat income tax option instead (which " +
      "replaces BOTH graduated income tax AND this percentage tax) — see the Self Employed Tax Calculator to " +
      "compare.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "Is percentage tax still 1%?",
        answer:
          "No — the 1% rate was a temporary COVID-19 relief measure under the CREATE Act, in effect from July " +
          "2020 through June 2023 only. It reverted to the standard 3% rate on 1 July 2023, and 3% remains " +
          "current.",
      },
      {
        question: "Can I choose VAT instead even if I'm under the threshold?",
        answer:
          "Yes — a business can voluntarily register for VAT even below the PHP3,000,000 threshold, which then " +
          "makes it subject to 12% VAT instead of 3% Percentage Tax. This is sometimes done to reclaim input " +
          "VAT on purchases, though it comes with more compliance requirements.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 7. Philippines Documentary Stamp Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-documentary-stamp-tax-calculator",
    title: "Philippines Documentary Stamp Tax Calculator",
    description: "Calculate Documentary Stamp Tax (DST) on real property sales, loan agreements, or lease agreements.",
    metaTitle: "Philippines Documentary Stamp Tax Calculator — Free & Instant",
    metaDescription:
      "Free Philippines DST calculator covering real property conveyances (1.5%), loan agreements (~0.75%), " +
      "and lease agreements.",
    calcInputs: [
      {
        key: "instrumentType",
        label: "Instrument Type",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Real Property Sale/Conveyance", value: 0 },
          { label: "Loan Agreement / Debt Instrument", value: 1 },
          { label: "Lease Agreement", value: 2 },
        ],
      },
      phpField("amount", "Amount (Consideration, Loan Amount, or Annual Rent)", { unit: "PHP", max: 50000000 }),
      {
        key: "leaseYears",
        label: "Lease Term (Years, Lease Agreements Only)",
        type: "number",
        required: false,
        default: 1,
        min: 0,
        max: 50,
        step: 1,
      },
    ],
    calcResult: { label: "Documentary Stamp Tax", format: "currency", currency: "PHP" },
    calcResults: [phpResult("documentaryStampTax", "Documentary Stamp Tax", { highlight: true })],
    instructions:
      "Choose the instrument type and enter the relevant amount. Real property sales/conveyances owe PHP15 per " +
      "PHP1,000 (or fraction) of the higher of consideration or fair market value — effectively 1.5%. Loan " +
      "agreements/debt instruments owe PHP1.50 per PHP200 (or fraction) of the issue price — effectively about " +
      "0.75%. Lease agreements owe PHP6 for the first PHP2,000 of annual rent, plus PHP2 per PHP1,000 (or " +
      "fraction) above that, PER YEAR of the lease term — enter the lease term in years to see the total across " +
      "the full lease.",
    examples:
      "Example: a PHP5,000,000 real property sale owes PHP75,000.00 DST (1.5%). A PHP1,000,000 loan agreement " +
      "instead owes PHP7,500.00 DST (~0.75%). A 3-year lease at PHP50,000/year rent owes PHP306.00 total DST " +
      "across the term.",
    assumptions:
      "This calculator uses the confirmed DST rates under NIRC Title VII as amended by RA 10963 (TRAIN, which " +
      "doubled most DST rates effective 1 January 2018) for these three common instrument categories. Personal " +
      "installment purchases of PHP250,000 or less for individual use are exempt from the loan-instrument DST " +
      "under Section 199(d), not modeled here since this tool assumes a standard loan/financing agreement.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "Why does the lease calculation multiply by years?",
        answer:
          "Documentary Stamp Tax on a lease agreement is charged PER YEAR of the lease term, not just once for " +
          "the whole agreement — so a longer lease term accumulates more total DST, computed year by year on " +
          "the same annual rent formula.",
      },
      {
        question: "Are small personal loans exempt from DST?",
        answer:
          "Yes — personal installment purchases of PHP250,000 or less for individual (non-business) use are " +
          "specifically exempt under Section 199(d) of the NIRC. This calculator assumes a standard loan/" +
          "financing agreement and doesn't apply that exemption automatically.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 8. Philippines Real Property Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-real-property-tax-calculator",
    title: "Philippines Real Property Tax Calculator",
    description: "Estimate Real Property Tax using the national statutory rate caps — actual rates vary by LGU.",
    metaTitle: "Philippines Real Property Tax Calculator — Free & Instant",
    metaDescription:
      "Free Philippines Real Property Tax calculator using the national statutory caps (1% province, 2% city/" +
      "Metro Manila, plus 1% SEF levy).",
    calcInputs: [
      phpField("fairMarketValue", "Property Fair Market Value", { unit: "PHP", max: 100000000 }),
      {
        key: "assessmentLevelPercent",
        label: "Assessment Level (%) — Check Your LGU's Ordinance",
        type: "percentage",
        required: true,
        default: 20,
        min: 0,
        max: 80,
        step: 1,
      },
      {
        key: "isProvince",
        label: "Location",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "City / Metro Manila Municipality", value: 0 },
          { label: "Province", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Total Real Property Tax", format: "currency", currency: "PHP" },
    calcResults: [
      phpResult("assessedValue", "Assessed Value"),
      phpResult("basicRpt", "Basic RPT"),
      phpResult("sefLevy", "Special Education Fund (SEF) Levy (1%)"),
      phpResult("totalRpt", "Total Real Property Tax", { highlight: true }),
    ],
    instructions:
      "Enter the property's fair market value, the assessment level percentage that applies to it (check your " +
      "Local Government Unit's current ordinance — this varies by property class and location), and whether " +
      "it's in a province or a city/Metro Manila municipality. Real Property Tax is fundamentally a LOCAL " +
      "GOVERNMENT tax under the Local Government Code (RA 7160) — the NATIONAL STATUTORY CAPS are 1% of assessed " +
      "value for provinces and 2% for cities/Metro Manila, plus an additional 1% Special Education Fund levy " +
      "shared with DepEd.\n\n" +
      "Assessed Value = Fair Market Value × Assessment Level — the assessment level itself is capped by property " +
      "class (residential, commercial, agricultural, etc.) under Section 218, but the EXACT percentage your " +
      "specific property gets is set by your own city/municipality's ordinance.",
    examples:
      "Example: a PHP5,000,000 property in Metro Manila with a 20% assessment level has a PHP1,000,000.00 " +
      "assessed value, owing PHP20,000.00 basic RPT (2%) plus PHP10,000.00 SEF (1%) — PHP30,000.00 total. The " +
      "SAME property in a province instead owes PHP10,000.00 basic RPT (1%) plus the same PHP10,000.00 SEF — " +
      "PHP20,000.00 total.",
    assumptions:
      "This calculator applies ONLY the national statutory rate caps (1% province / 2% city-Metro Manila, plus " +
      "1% SEF) from RA 7160 (Local Government Code) to a user-supplied assessment level — it does NOT use any " +
      "specific city's (such as Quezon City or Manila) actual current ordinance rates or assessment-level " +
      "schedule, since those vary by LGU and change independently of national law, and a current one couldn't " +
      "be confirmed against a live official source at the time of writing. Enter YOUR property's actual " +
      "assessment level (from your municipal/city assessor's office) for an accurate estimate — the 20% default " +
      "shown is illustrative only, not a specific LGU's real figure.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "Where do I find my property's actual assessment level?",
        answer:
          "Your city or municipal Assessor's Office sets and publishes assessment levels by property class " +
          "(residential, commercial, agricultural, etc.), within the maximums set by Section 218 of the Local " +
          "Government Code — check your Tax Declaration or ask your local Assessor's Office for the exact " +
          "figure that applies to your property.",
      },
      {
        question: "Does every city charge the full 2%?",
        answer:
          "2% is the STATUTORY MAXIMUM for cities and Metro Manila municipalities — some LGUs may set a lower " +
          "actual rate within that cap. Always confirm your specific LGU's current ordinance rate rather than " +
          "assuming the maximum applies.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 9. Philippines Dividend Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-dividend-tax-calculator",
    title: "Philippines Dividend Tax Calculator",
    description: "Calculate final withholding tax on dividends from a domestic corporation, by recipient type.",
    metaTitle: "Philippines Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free Philippines dividend tax calculator covering citizen/resident (10%), non-resident alien (20%/25%), " +
      "and exempt inter-corporate dividends.",
    calcInputs: [
      phpField("dividendAmount", "Dividend Amount", { unit: "PHP", max: 10000000 }),
      {
        key: "recipientType",
        label: "Recipient",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Citizen / Resident Alien", value: 0 },
          { label: "Non-Resident Alien, Engaged in Trade/Business (NRA-ETB)", value: 1 },
          { label: "Non-Resident Alien, NOT Engaged in Trade/Business (NRA-NETB)", value: 2 },
          { label: "Domestic Corporation (Inter-Corporate — Exempt)", value: 3 },
        ],
      },
    ],
    calcResult: { label: "Withholding Tax", format: "currency", currency: "PHP" },
    calcResults: [
      percentResult("rateApplied", "Rate Applied"),
      phpResult("withholdingTax", "Withholding Tax", { highlight: true }),
      phpResult("netDividend", "Net Dividend After Tax"),
    ],
    instructions:
      "Enter the dividend amount and select the recipient type. Cash/property dividends from a domestic " +
      "corporation to a citizen or resident alien owe a 10% final withholding tax. Non-resident aliens engaged " +
      "in trade/business in the Philippines owe 20%, while those NOT engaged in trade/business owe 25%. " +
      "Dividends paid between domestic corporations (inter-corporate dividends) are exempt entirely, avoiding " +
      "double taxation within a corporate structure.",
    examples: "Example: a PHP100,000 dividend to a citizen owes PHP10,000.00 withholding tax (10%), for PHP90,000.00 net — the SAME dividend to a domestic corporation instead owes PHP0.00, fully exempt.",
    assumptions:
      "This calculator reflects long-standing NIRC dividend withholding tax provisions (Sections 24(B)(2), 25, " +
      "27(D)(4)) that were NOT amended by TRAIN or CREATE — these figures are standing law rather than recently " +
      "reconfirmed, so if you're relying on this for a specific high-value transaction, independently confirm " +
      "the current rate with BIR or a tax adviser first.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "Why are inter-corporate dividends exempt?",
        answer:
          "To avoid taxing the same underlying corporate profit multiple times as it passes through a chain of " +
          "domestic corporations — the exemption applies specifically to dividends paid BETWEEN domestic " +
          "corporations, not to dividends paid to individual shareholders.",
      },
      {
        question: "What's the difference between NRA-ETB and NRA-NETB?",
        answer:
          "A non-resident alien engaged in trade or business (NRA-ETB) has a business presence or performs " +
          "services in the Philippines and is taxed at 20% on dividends; one NOT engaged in trade or business " +
          "(NRA-NETB) has no such presence and is taxed at the higher 25% flat rate instead.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 10. Philippines Self Employed Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "philippines-self-employment-tax-calculator",
    title: "Philippines Self Employed Tax Calculator",
    description: "Compare the 8% flat tax option against graduated rates + percentage tax for self-employed individuals.",
    metaTitle: "Philippines Self Employed Tax Calculator — Free & Instant",
    metaDescription:
      "Free Philippines self-employment tax calculator. Compare the 8% flat option against graduated income " +
      "tax + 3% percentage tax, and see which is lower.",
    calcInputs: [
      phpField("grossSalesOrReceipts", "Annual Gross Sales/Receipts", { unit: "PHP/year", max: 10000000 }),
      yesNoField("elect8PercentOption", "Force the 8% Option? (Otherwise, Both Are Compared)"),
    ],
    calcResult: { label: "Recommended Tax", format: "currency", currency: "PHP" },
    calcResults: [
      { key: "isEligibleFor8Percent", label: "Eligible for 8% Option?", format: "number" },
      phpResult("taxUnder8PercentOption", "Tax Under 8% Flat Option"),
      phpResult("taxUnderGraduatedOption", "Tax Under Graduated Rates + Percentage Tax"),
      phpResult("recommendedTax", "Recommended (Lower) Tax", { highlight: true }),
      phpResult("netIncome", "Net Income After Tax"),
    ],
    instructions:
      "Enter your annual gross sales/receipts. Purely self-employed individuals and professionals with gross " +
      "sales/receipts not exceeding the PHP3,000,000 VAT threshold can elect an 8% flat tax on the amount " +
      "ABOVE PHP250,000 — in lieu of BOTH the graduated income tax rates AND the 3% Percentage Tax. Leave " +
      "\"Force the 8% option\" unchecked to compare both routes and see which is lower; the PHP250,000 " +
      "deduction under the 8% option only applies to PURELY self-employed individuals, not mixed-income earners " +
      "(whose compensation income already has its own graduated-rate treatment).",
    examples:
      "Example: PHP500,000 gross receipts owes PHP20,000.00 under the 8% option (8% of the PHP250,000 above the " +
      "deduction) versus PHP57,500.00 under graduated rates + percentage tax — the 8% option is recommended, " +
      "saving PHP37,500.00.",
    assumptions:
      "This calculator uses the confirmed 8% rate, PHP250,000 deduction, and PHP3,000,000 eligibility threshold " +
      "from Section 24(A)(2)(b) of the NIRC as amended by RA 10963 (TRAIN), and RMO 23-2018/RR 8-2018 " +
      "confirming the 8% option replaces BOTH graduated tax and Percentage Tax. The election is per-taxable-" +
      "year and must be affirmatively made (typically at first-quarter filing) — it isn't automatic. Exceeding " +
      "PHP3,000,000 gross sales/receipts during the year triggers mandatory VAT registration and reversion to " +
      "graduated rates for the remainder of that year, not modeled here.\n\n" +
      PH_DISCLAIMER,
    faq: [
      {
        question: "Is the 8% option always better?",
        answer:
          "Not necessarily — it depends on your specific gross receipts and whether you have significant " +
          "deductible business expenses that would reduce your graduated-rate taxable income further (the 8% " +
          "option doesn't allow itemized expense deductions beyond the flat PHP250,000). This calculator " +
          "compares both to show which is lower for your numbers, but if you have substantial legitimate " +
          "business expenses, the graduated-rate route with itemized deductions might work out better despite " +
          "the higher headline rate.",
      },
      {
        question: "Do I need to re-elect the 8% option every year?",
        answer:
          "Yes — the election applies per taxable year and must be affirmatively signified, typically when " +
          "filing your first quarterly return of the year. It doesn't automatically carry over from a prior " +
          "year.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:create-philippines-tool" first, ` +
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
