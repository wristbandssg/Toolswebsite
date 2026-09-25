// One-time (but safe to re-run) batch setup script: creates all 24 of the
// third "Tax Calculators" batch — Property Tax (11) and Self-Employment
// Tax (13) — filed DIRECTLY under the "Tax Calculators" category, alongside
// its 12 country/state sub-categories and the two earlier batches
// (create-us-tax-salary-calculators.ts, 30 tools; and
// create-capital-gains-sales-vat-calculators.ts, 32 tools).
//
// See src/lib/calc-engine-property-tax-self-employment-calculators.ts for
// the actual math and which of its exported functions each of these 24
// slugs maps to. Property Tax is jurisdiction-agnostic (the visitor
// supplies their own assessed value and rate — US property tax has no
// federal rate); Self-Employment Tax continues this category's
// US-federal-only scope, reusing the same 2026 SECA figures as the other
// two batches (Social Security wage base $184,500, combined 12.4%/2.9%
// rates, 0.9% Additional Medicare over the filing-status threshold), plus
// 2026 SEP-IRA/Solo 401(k) contribution limits cross-checked directly
// against IRS Notice 2025-67.
//
// HOW TO RUN
//   npx tsx prisma/create-property-tax-self-employment-calculators.ts
// or
//   npm run db:create-property-self-employment-tools
//
// Every tool is created with status "draft" (or left as-is if it already
// exists and was published) — review each one in /admin/tools and publish
// when you're happy with it, same as every other calculator on this site.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

// ---------------------------------------------------------------------------
// Shared field building blocks
// ---------------------------------------------------------------------------

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
    max: opts.max ?? 1000000,
    step: opts.step ?? 500,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 30,
    step: opts.step ?? 0.05,
  };
}

const filingStatusField = {
  key: "filingStatus",
  label: "Filing Status",
  type: "dropdown",
  required: true,
  default: 0,
  options: [
    { label: "Single", value: 0 },
    { label: "Married Filing Jointly", value: 1 },
    { label: "Married Filing Separately", value: 2 },
    { label: "Head of Household", value: 3 },
  ],
};

const otherWagesField = currencyField("otherWages", "Other W-2 Wages This Year (if any)", {
  unit: "per year",
  required: false,
  max: 400000,
  step: 500,
});

const rateTypeField = (defaultValue: 0 | 1 = 0) => ({
  key: "rateType",
  label: "Rate Is Given As...",
  type: "dropdown",
  required: true,
  default: defaultValue,
  options: [
    { label: "A percentage of assessed value", value: 0 },
    { label: "A mill rate ($ per $1,000 of assessed value)", value: 1 },
  ],
});

const assessedValueField = currencyField("assessedValue", "Assessed Value", { max: 2000000, step: 1000 });
const rateField = percentField("rate", "Tax Rate", { max: 5, step: 0.01, default: 1 });

// ---------------------------------------------------------------------------
// Shared copy blocks
// ---------------------------------------------------------------------------

const PROPERTY_TAX_ASSUMPTIONS =
  "US property tax has no single national (or even statewide) rate — it's set locally by your county, city, " +
  "township, and school district, and billed against an \"assessed value\" that's often different from market " +
  "value, so this calculator asks for your own assessed value and rate rather than assuming one. Look up your " +
  "property's current assessed value and combined tax rate from your county assessor's office or a recent tax " +
  "bill for an accurate result.\n\n" +
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your property, consult your local assessor's office or a qualified " +
  "professional.";

const PROPERTY_TAX_FAQ = [
  {
    question: "Why do I have to enter my own rate and assessed value?",
    answer:
      "Because US property tax is set locally — by county, city, township, and school district — with no single " +
      "national or statewide rate. Your county assessor's office (or your most recent property tax bill) has " +
      "both your current assessed value and the combined rate that applies to it.",
  },
  {
    question: "What's the difference between a percentage rate and a mill rate?",
    answer:
      "Both describe the same thing two different ways. A percentage rate (like 1.25%) is applied directly to " +
      "assessed value. A mill rate is dollars of tax per $1,000 of assessed value (a mill rate of 12.5 means " +
      "$12.50 per $1,000, which is also 1.25%) — many US counties quote rates this way on tax bills. This " +
      "calculator accepts either.",
  },
  {
    question: "Is assessed value the same as market value?",
    answer:
      "Often not. Many jurisdictions assess property below full market value (using a fixed assessment ratio), " +
      "cap annual increases, or reassess only periodically — so your assessed value can lag or differ from what " +
      "the property would actually sell for. Use the assessed value from your tax bill or assessor's office, not " +
      "an estimated market value, for an accurate result here.",
  },
];

const SE_TAX_ASSUMPTIONS =
  "This calculator uses 2026 federal Self-Employment Contributions Act (SECA) figures: a $184,500 Social " +
  "Security wage base, combined 12.4% Social Security and 2.9% Medicare rates on 92.35% of your net profit " +
  "(the self-employed \"net earnings\" adjustment), and the 0.9% Additional Medicare Tax above your filing " +
  "status's threshold. It's federal-only — this is separate from federal or state income tax on the same " +
  "profit, which is calculated independently (see the Self-Employment Tax Calculator under this site's US " +
  "federal income/salary tools for a combined income-tax view).\n\n" +
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified tax professional or the IRS.";

const SE_TAX_FAQ = [
  {
    question: "Is self-employment tax the same as income tax?",
    answer:
      "No — self-employment tax is your Social Security and Medicare contribution (the self-employed equivalent " +
      "of the FICA tax a W-2 employer and employee split), calculated separately from and in addition to federal " +
      "(and often state) income tax on the same profit.",
  },
  {
    question: "Why is the tax calculated on 92.35% of my net profit, not the full amount?",
    answer:
      "This adjustment (multiplying net profit by 92.35%) roughly accounts for the fact that a traditional " +
      "employee's Social Security and Medicare wages don't include the employer's matching share — it's a " +
      "long-standing feature of how self-employment tax is calculated, built into IRS Schedule SE.",
  },
  {
    question: "Can I deduct any of this on my income tax return?",
    answer:
      "Yes — you can deduct half of your self-employment tax (the employer-equivalent portion) as an " +
      "above-the-line adjustment to income on your federal return, which this calculator shows as the " +
      "\"deductible half.\"",
  },
];

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  // ---------------------------------------------------------------------
  // Property Tax family
  // ---------------------------------------------------------------------
  {
    slug: "property-tax-calculator",
    title: "Property Tax Calculator",
    description:
      "Calculate your annual property tax from your property's assessed value and your local tax rate — as a " +
      "percentage or a mill rate.",
    metaTitle: "Property Tax Calculator — Free & Instant",
    metaDescription:
      "Free property tax calculator. Enter your assessed value and local rate (percentage or mill rate) to find " +
      "your annual and monthly property tax.",
    calcInputs: [assessedValueField, rateField, rateTypeField(0)],
    calcResult: { label: "Annual Property Tax", format: "currency" },
    calcResults: [
      { key: "annualTax", label: "Annual Property Tax", format: "currency", highlight: true },
      { key: "monthlyTax", label: "Monthly Equivalent", format: "currency" },
      { key: "effectiveRate", label: "Effective Rate (% of Assessed Value)", format: "percentage" },
    ],
    instructions:
      "Enter your property's assessed value (from your tax bill or county assessor, not necessarily market " +
      "value) and your local tax rate. Choose whether that rate is quoted as a percentage of assessed value " +
      "(like 1.25%) or as a mill rate — dollars per $1,000 of assessed value (like 12.5) — since US counties use " +
      "both formats on tax bills.\n\n" +
      "The result shows your annual property tax bill, its monthly equivalent (handy for budgeting or comparing " +
      "against an escrow estimate), and the effective rate as a clean percentage either way.",
    examples:
      "Example: a home assessed at $350,000 with a 1.25% combined local rate owes about $4,375 a year in " +
      "property tax, or roughly $364.58 a month.",
    assumptions: PROPERTY_TAX_ASSUMPTIONS,
    faq: [
      {
        question: "What if my tax bill includes multiple line items (county, school, city)?",
        answer:
          "Add them together into one combined rate before entering it here — most property tax bills already " +
          "show a combined total rate, or you can sum the individual line-item rates yourself.",
      },
      ...PROPERTY_TAX_FAQ,
    ],
  },
  {
    slug: "property-tax-rate-calculator",
    title: "Property Tax Rate Calculator",
    description:
      "Work out your effective property tax rate — as both a percentage and a mill rate — from your assessed " +
      "value and the tax you actually paid.",
    metaTitle: "Property Tax Rate Calculator — Find Your Effective Rate",
    metaDescription:
      "Free property tax rate calculator. Find your effective property tax rate (percentage and mill rate) from " +
      "your assessed value and annual tax paid.",
    calcInputs: [
      assessedValueField,
      currencyField("annualTaxPaid", "Annual Property Tax Paid", { max: 100000, step: 100 }),
    ],
    calcResult: { label: "Effective Tax Rate", format: "percentage" },
    calcResults: [
      { key: "effectiveRatePercent", label: "Effective Tax Rate", format: "percentage", highlight: true },
      { key: "millRate", label: "Equivalent Mill Rate", format: "number", unit: "per $1,000" },
      { key: "monthlyTax", label: "Monthly Equivalent", format: "currency" },
    ],
    instructions:
      "If you already know your assessed value and how much property tax you actually paid last year, enter " +
      "both to work backward to your effective rate — shown as both a percentage and a mill rate, since bills " +
      "and comparisons use either format.\n\n" +
      "Useful for comparing your actual rate against a county average, checking a tax bill for errors, or " +
      "estimating next year's bill if your assessed value changes but the rate stays roughly the same.",
    examples:
      "Example: a property assessed at $400,000 with a $6,000 annual tax bill has an effective rate of 1.5%, " +
      "equivalent to a mill rate of 15.",
    assumptions: PROPERTY_TAX_ASSUMPTIONS,
    faq: PROPERTY_TAX_FAQ,
  },
  {
    slug: "annual-property-tax-calculator",
    title: "Annual Property Tax Calculator",
    description:
      "Find your total annual property tax bill from your assessed value and local rate — the full-year figure " +
      "most county tax bills are based on.",
    metaTitle: "Annual Property Tax Calculator — Full-Year Estimate",
    metaDescription:
      "Free annual property tax calculator. Enter your assessed value and rate to find your total property tax " +
      "for the year.",
    calcInputs: [assessedValueField, rateField, rateTypeField(0)],
    calcResult: { label: "Annual Property Tax", format: "currency" },
    calcResults: [
      { key: "annualTax", label: "Annual Property Tax", format: "currency", highlight: true },
      { key: "monthlyTax", label: "Monthly Equivalent", format: "currency" },
      { key: "effectiveRate", label: "Effective Rate (% of Assessed Value)", format: "percentage" },
    ],
    instructions:
      "Enter your property's assessed value and local tax rate (percentage or mill rate) to see the total " +
      "property tax due for the full year — the figure your county actually bills, whether you pay it in one " +
      "lump sum, two installments, or through a mortgage escrow account.\n\n" +
      "This is the same calculation as the general Property Tax Calculator on this site, framed around the " +
      "full-year total for budgeting and comparison purposes.",
    examples:
      "Example: a property assessed at $275,000 with a 0.98% combined local rate owes about $2,695 for the year.",
    assumptions: PROPERTY_TAX_ASSUMPTIONS,
    faq: PROPERTY_TAX_FAQ,
  },
  {
    slug: "monthly-property-tax-calculator",
    title: "Monthly Property Tax Calculator",
    description:
      "Break your annual property tax down into a monthly figure — handy for budgeting or checking a mortgage " +
      "escrow estimate.",
    metaTitle: "Monthly Property Tax Calculator — Budget by Month",
    metaDescription:
      "Free monthly property tax calculator. Enter your assessed value and rate to find your monthly property " +
      "tax cost, plus the full annual total.",
    calcInputs: [assessedValueField, rateField, rateTypeField(0)],
    calcResult: { label: "Monthly Property Tax", format: "currency" },
    calcResults: [
      { key: "monthlyTax", label: "Monthly Property Tax", format: "currency", highlight: true },
      { key: "annualTax", label: "Annual Property Tax", format: "currency" },
      { key: "effectiveRate", label: "Effective Rate (% of Assessed Value)", format: "percentage" },
    ],
    instructions:
      "Most counties bill property tax once or twice a year, but budgeting month-to-month (or checking what a " +
      "mortgage lender is setting aside in escrow) is easier with a monthly figure. Enter your assessed value " +
      "and rate to see both the monthly amount and the full annual total it's based on.\n\n" +
      "If your mortgage servicer's escrow estimate looks different from this calculator's monthly figure, it may " +
      "be using a different (older or newer) assessed value or rate — worth checking against your latest tax " +
      "bill.",
    examples:
      "Example: a property assessed at $320,000 with a 1.1% combined local rate owes about $3,520 a year, or " +
      "roughly $293.33 a month.",
    assumptions: PROPERTY_TAX_ASSUMPTIONS,
    faq: PROPERTY_TAX_FAQ,
  },
  {
    slug: "rental-property-tax-calculator",
    title: "Rental Property Tax Calculator",
    description:
      "Calculate property tax on a rental property and see it as a share of your annual rental income.",
    metaTitle: "Rental Property Tax Calculator — Tax vs. Rental Income",
    metaDescription:
      "Free rental property tax calculator. Find your annual property tax and see it as a percentage of your " +
      "rental income.",
    calcInputs: [
      assessedValueField,
      rateField,
      rateTypeField(0),
      currencyField("annualRentalIncome", "Annual Rental Income", { max: 300000, step: 500, required: false }),
    ],
    calcResult: { label: "Annual Property Tax", format: "currency" },
    calcResults: [
      { key: "annualTax", label: "Annual Property Tax", format: "currency", highlight: true },
      { key: "monthlyTax", label: "Monthly Equivalent", format: "currency" },
      { key: "taxAsPercentOfRent", label: "Tax as % of Rental Income", format: "percentage" },
    ],
    instructions:
      "Enter your rental property's assessed value and local tax rate the same way as the general Property Tax " +
      "Calculator, plus your annual rental income (optional). This adds one useful landlord-specific figure: " +
      "property tax as a percentage of the rent you collect — a quick sanity check on whether your rent covers " +
      "this recurring cost.\n\n" +
      "Property tax on a rental is generally a deductible business expense against rental income on your tax " +
      "return, separate from this calculator (which estimates the tax itself, not its tax treatment).",
    examples:
      "Example: a rental assessed at $250,000 with a 1.4% local rate owes about $3,500 a year in property tax — " +
      "against $24,000 in annual rental income, that's roughly 14.6% of the rent collected.",
    assumptions:
      PROPERTY_TAX_ASSUMPTIONS +
      "\n\nRental income is only used here to compute a simple percentage — this calculator doesn't model " +
      "depreciation, other rental expenses, or the tax deductibility of property tax against rental income.",
    faq: [
      {
        question: "Is property tax on a rental property deductible?",
        answer:
          "Generally yes — property tax on a rental you own is typically a deductible business expense against " +
          "your rental income, separate from what this calculator shows (which is just the tax amount itself). " +
          "Consult a tax professional for how it applies to your specific return.",
      },
      ...PROPERTY_TAX_FAQ,
    ],
  },
  {
    slug: "property-transfer-tax-calculator",
    title: "Property Transfer Tax Calculator",
    description:
      "Calculate the transfer tax due when a property changes hands, from the sale price and your local transfer " +
      "tax rate.",
    metaTitle: "Property Transfer Tax Calculator — Free & Instant",
    metaDescription:
      "Free property transfer tax calculator. Enter the sale price and your local rate to find the transfer tax " +
      "due on a property sale.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { max: 2000000, step: 1000 }),
      percentField("transferTaxRate", "Transfer Tax Rate", { max: 5, step: 0.05, default: 1 }),
    ],
    calcResult: { label: "Transfer Tax", format: "currency" },
    calcResults: [
      { key: "transferTax", label: "Transfer Tax", format: "currency", highlight: true },
      { key: "totalWithTax", label: "Sale Price + Transfer Tax", format: "currency" },
    ],
    instructions:
      "Enter the property's sale price and your city/county/state's transfer tax rate (sometimes called a " +
      "\"deed transfer tax\" or \"conveyance tax\") to calculate the one-time tax due when ownership changes " +
      "hands — separate from ongoing annual property tax.\n\n" +
      "Transfer tax rates and who pays them (buyer, seller, or split) vary enormously by state and even by city, " +
      "so check your local recorder's office or closing disclosure for the exact rate and responsible party.",
    examples: "Example: a $450,000 sale with a 1% local transfer tax rate owes $4,500 in transfer tax.",
    assumptions:
      "Transfer tax rates and rules (who pays, exemptions for first-time buyers, tiered rates by price) vary by " +
      "state, county, and sometimes city, so this calculator asks for your local rate directly. It performs a " +
      "single flat-rate calculation and doesn't model tiered or bracketed transfer tax systems that some " +
      "jurisdictions use.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice. For guidance specific to your transaction, consult a real estate attorney, title company, or your " +
      "local recorder's office.",
    faq: [
      {
        question: "Who pays property transfer tax — the buyer or the seller?",
        answer:
          "It depends on your state and local custom — sometimes the seller, sometimes the buyer, sometimes " +
          "split. Check your local rules or ask your real estate agent or closing attorney.",
      },
      {
        question: "Is transfer tax the same as stamp duty?",
        answer:
          "They're closely related concepts — a one-time tax charged when a property changes hands — though the " +
          "exact name, rate structure, and rules vary by jurisdiction. See the Stamp Duty Calculator on this " +
          "site if that's the term used where you're transacting.",
      },
    ],
  },
  {
    slug: "stamp-duty-calculator",
    title: "Stamp Duty Calculator",
    description:
      "Calculate stamp duty (or an equivalent property transfer tax) due on a property purchase from its price " +
      "and your local rate.",
    metaTitle: "Stamp Duty Calculator — Free & Instant",
    metaDescription:
      "Free stamp duty calculator. Enter the property price and your local rate to find the stamp duty (or " +
      "transfer tax) due on a purchase.",
    calcInputs: [
      currencyField("salePrice", "Property Price", { max: 2000000, step: 1000 }),
      percentField("transferTaxRate", "Stamp Duty Rate", { max: 10, step: 0.05, default: 2 }),
    ],
    calcResult: { label: "Stamp Duty", format: "currency" },
    calcResults: [
      { key: "transferTax", label: "Stamp Duty", format: "currency", highlight: true },
      { key: "totalWithTax", label: "Price + Stamp Duty", format: "currency" },
    ],
    instructions:
      "\"Stamp duty\" is the common name for a property transfer tax in many countries (the UK, Australia, " +
      "India, and others use this term). Enter the property price and your jurisdiction's rate — a flat " +
      "percentage here, though many real-world stamp duty systems use tiered/bracketed rates by price band — to " +
      "estimate the duty owed.\n\n" +
      "For a jurisdiction with tiered stamp duty bands (common in the UK and elsewhere), calculate each band's " +
      "portion separately and enter the resulting effective rate, or check your local tax authority's official " +
      "calculator for an exact tiered figure.",
    examples: "Example: a $600,000 property purchase with a 1.5% flat stamp duty rate owes $9,000 in stamp duty.",
    assumptions:
      "This is a flat-rate calculator — many countries (the UK included) actually use tiered/bracketed stamp " +
      "duty rates that increase by price band, which this simplified version doesn't model directly. Use your " +
      "jurisdiction's official stamp duty calculator for an exact tiered figure, or enter an effective " +
      "(blended) rate here for a quick estimate.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice.",
    faq: [
      {
        question: "Does this handle tiered stamp duty bands (like the UK's system)?",
        answer:
          "Not directly — this calculator applies one flat rate to the full price. For a tiered system, either " +
          "compute the blended effective rate yourself and enter that, or use your country's official stamp duty " +
          "calculator for an exact figure.",
      },
      {
        question: "Are there stamp duty exemptions or reliefs I should know about?",
        answer:
          "Many jurisdictions offer reduced rates or exemptions for first-time buyers, certain property values, " +
          "or specific buyer categories — this calculator doesn't apply any, so check your local tax authority " +
          "for reliefs that might apply to your purchase.",
      },
    ],
  },
  {
    slug: "land-tax-calculator",
    title: "Land Tax Calculator",
    description:
      "Calculate land tax from your land's assessed value, your local rate, and any tax-free threshold that " +
      "applies.",
    metaTitle: "Land Tax Calculator — Free & Instant",
    metaDescription:
      "Free land tax calculator. Enter your land value, tax rate, and tax-free threshold to find the land tax " +
      "owed.",
    calcInputs: [
      currencyField("landValue", "Assessed Land Value", { max: 3000000, step: 1000 }),
      percentField("taxRate", "Land Tax Rate", { max: 5, step: 0.05, default: 1 }),
      currencyField("taxFreeThreshold", "Tax-Free Threshold (if any)", {
        max: 1000000,
        step: 1000,
        required: false,
      }),
    ],
    calcResult: { label: "Land Tax", format: "currency" },
    calcResults: [
      { key: "taxableValue", label: "Taxable Land Value (After Threshold)", format: "currency" },
      { key: "landTax", label: "Land Tax Owed", format: "currency", highlight: true },
    ],
    instructions:
      "Land tax (distinct from general property tax in some jurisdictions, notably Australia's state land tax " +
      "systems) is charged on the value of land you own, sometimes with a tax-free threshold before any tax " +
      "applies. Enter your land's assessed value, the applicable rate, and any tax-free threshold your " +
      "jurisdiction offers (enter 0 if none applies).\n\n" +
      "The calculator subtracts the threshold from your land value first, then applies the rate only to the " +
      "remainder — matching how most threshold-based land tax systems actually work.",
    examples:
      "Example: land assessed at $500,000 with a 1.6% tax rate and a $100,000 tax-free threshold has $400,000 in " +
      "taxable value, for $6,400 in land tax owed.",
    assumptions:
      "Land tax systems vary significantly by jurisdiction — some use flat rates above a single threshold (as " +
      "modeled here), while others use progressive/tiered rates that increase at higher land values, aggregate " +
      "land value across multiple properties you own, or offer exemptions for a primary residence. This " +
      "calculator models the simpler flat-rate-above-a-threshold case; check your local revenue office for your " +
      "jurisdiction's exact rules.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice.",
    faq: [
      {
        question: "Is land tax the same as property tax?",
        answer:
          "They're related but not always identical — some jurisdictions (like several Australian states) levy " +
          "a separate land tax based only on land value, often with a tax-free threshold and different rules " +
          "than general municipal property tax. Others use the terms interchangeably. Check your local revenue " +
          "office for how it applies where you are.",
      },
      {
        question: "What if my jurisdiction has no tax-free threshold?",
        answer:
          "Leave that field at 0 (or blank) — the calculator will apply the rate to your full land value, which " +
          "is how flat-rate land tax systems without a threshold work.",
      },
    ],
  },
  {
    slug: "real-estate-tax-calculator",
    title: "Real Estate Tax Calculator",
    description:
      "Calculate real estate (property) tax from your property's assessed value and your local tax rate.",
    metaTitle: "Real Estate Tax Calculator — Free & Instant",
    metaDescription:
      "Free real estate tax calculator. Enter your assessed value and local rate to find your annual real " +
      "estate tax.",
    calcInputs: [assessedValueField, rateField, rateTypeField(0)],
    calcResult: { label: "Annual Real Estate Tax", format: "currency" },
    calcResults: [
      { key: "annualTax", label: "Annual Real Estate Tax", format: "currency", highlight: true },
      { key: "monthlyTax", label: "Monthly Equivalent", format: "currency" },
      { key: "effectiveRate", label: "Effective Rate (% of Assessed Value)", format: "percentage" },
    ],
    instructions:
      "\"Real estate tax\" and \"property tax\" refer to the same thing in most of the US — an annual tax billed " +
      "against your property's assessed value by your county or municipality. Enter your assessed value and " +
      "local rate (percentage or mill rate) to see your annual and monthly totals.\n\n" +
      "This is the same underlying calculation as the general Property Tax Calculator on this site, offered " +
      "under this alternate, equally common name for search convenience.",
    examples:
      "Example: a property assessed at $425,000 with a 1.05% combined local rate owes about $4,462.50 a year in " +
      "real estate tax.",
    assumptions: PROPERTY_TAX_ASSUMPTIONS,
    faq: PROPERTY_TAX_FAQ,
  },
  {
    slug: "property-purchase-tax-calculator",
    title: "Property Purchase Tax Calculator",
    description:
      "Calculate the one-time tax due when purchasing a property, from the purchase price and your local " +
      "transfer/purchase tax rate.",
    metaTitle: "Property Purchase Tax Calculator — Free & Instant",
    metaDescription:
      "Free property purchase tax calculator. Enter the purchase price and local rate to find the one-time tax " +
      "due when buying a property.",
    calcInputs: [
      currencyField("salePrice", "Purchase Price", { max: 2000000, step: 1000 }),
      percentField("transferTaxRate", "Purchase Tax Rate", { max: 8, step: 0.05, default: 2 }),
    ],
    calcResult: { label: "Purchase Tax", format: "currency" },
    calcResults: [
      { key: "transferTax", label: "Purchase Tax", format: "currency", highlight: true },
      { key: "totalWithTax", label: "Price + Purchase Tax", format: "currency" },
    ],
    instructions:
      "Many jurisdictions charge a one-time tax on the buyer when a property is purchased — whether it's called " +
      "a transfer tax, purchase tax, or (in some countries) a form of stamp duty. Enter the purchase price and " +
      "your jurisdiction's rate to estimate this closing-cost item, separate from ongoing annual property tax.\n\n" +
      "Check your closing disclosure or a local title company for the exact rate and whether it's charged to the " +
      "buyer, seller, or split between both in your area.",
    examples: "Example: a $380,000 property purchase with a 2% purchase tax rate owes $7,600 in purchase tax.",
    assumptions:
      PROPERTY_TAX_ASSUMPTIONS.replace(
        "your own assessed value and rate rather than assuming one",
        "your own purchase price and rate rather than assuming one"
      ),
    faq: [
      {
        question: "Is property purchase tax a one-time or recurring cost?",
        answer:
          "One-time — it's charged once, at the time of purchase, as part of your closing costs. It's separate " +
          "from ongoing annual property tax, which recurs every year you own the property.",
      },
      {
        question: "Who typically pays property purchase tax — the buyer or seller?",
        answer:
          "As the name suggests, it's most commonly charged to the buyer, though local custom varies — check " +
          "your closing disclosure or ask your real estate agent or attorney.",
      },
    ],
  },
  {
    slug: "property-sale-tax-calculator",
    title: "Property Sale Tax Calculator",
    description:
      "Calculate the transfer tax a seller owes at closing, from the sale price and your local sale/transfer tax " +
      "rate.",
    metaTitle: "Property Sale Tax Calculator — Free & Instant",
    metaDescription:
      "Free property sale tax calculator. Enter the sale price and local rate to find the transfer tax due when " +
      "selling a property.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { max: 2000000, step: 1000 }),
      percentField("transferTaxRate", "Sale/Transfer Tax Rate", { max: 5, step: 0.05, default: 0.75 }),
    ],
    calcResult: { label: "Sale Tax", format: "currency" },
    calcResults: [
      { key: "transferTax", label: "Sale Tax", format: "currency", highlight: true },
      { key: "totalWithTax", label: "Sale Price + Sale Tax", format: "currency" },
    ],
    instructions:
      "In many US jurisdictions, the seller (rather than the buyer) is responsible for a transfer tax at closing " +
      "— sometimes called a \"sale tax\" locally. Enter the sale price and your jurisdiction's rate to estimate " +
      "this cost, which is typically deducted from seller proceeds at closing.\n\n" +
      "This is the same type of calculation as the Property Transfer Tax Calculator on this site, framed around " +
      "the seller's side of the transaction — check your local rules for which party actually owes it where " +
      "you're selling.",
    examples: "Example: a $525,000 sale with a 0.75% local sale tax rate owes $3,937.50 in sale tax.",
    assumptions:
      "Whether the buyer or seller owes this tax (and the exact rate) varies by state and locality — this " +
      "calculator estimates the tax amount itself using whichever rate you enter, without assuming who's " +
      "responsible for paying it.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice.",
    faq: [
      {
        question: "Is this the same as the buyer's transfer tax?",
        answer:
          "It's the same type of tax (a percentage of the sale price), but framed for whichever party owes it in " +
          "your area — in many US states, sellers pay this at closing, deducted from their proceeds. See the " +
          "Property Transfer Tax Calculator on this site for the general version.",
      },
      {
        question: "Is sale tax deducted from my proceeds automatically at closing?",
        answer:
          "Typically yes — your closing/escrow agent calculates and withholds it as part of settling the " +
          "transaction, so you receive net proceeds after this (and other closing costs) are already deducted.",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // Self-Employment Tax family
  // ---------------------------------------------------------------------
  {
    slug: "self-employment-tax-calculator",
    title: "Self-Employment Tax Calculator",
    description:
      "Calculate your 2026 federal self-employment tax (Social Security + Medicare) from your net " +
      "self-employment profit.",
    metaTitle: "Self-Employment Tax Calculator (2026) — SECA Estimate",
    metaDescription:
      "Free self-employment tax calculator. Estimate your 2026 federal SECA tax (Social Security + Medicare) " +
      "from your net self-employment profit.",
    calcInputs: [currencyField("netProfit", "Net Self-Employment Profit", { max: 500000, step: 500 }), otherWagesField, filingStatusField],
    calcResult: { label: "Total Self-Employment Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Portion (12.4%)", format: "currency" },
      { key: "medicareTax", label: "Medicare Portion (2.9%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%, if applicable)", format: "currency" },
      { key: "totalSeTax", label: "Total Self-Employment Tax", format: "currency", highlight: true },
      { key: "deductibleHalf", label: "Deductible Half (Above-the-Line Deduction)", format: "currency" },
    ],
    instructions:
      "Enter your net self-employment profit (Schedule C net profit, or your share of partnership self-employment " +
      "earnings), any other W-2 wages you had this year (so the Social Security wage base and Additional Medicare " +
      "threshold are applied correctly), and your filing status.\n\n" +
      "This calculator applies the 92.35% net earnings adjustment, then the combined 12.4% Social Security rate " +
      "(up to the annual wage base, shared with any other wages) and 2.9% Medicare rate (uncapped), plus the " +
      "0.9% Additional Medicare Tax if your combined income crosses your filing status's threshold — giving you " +
      "a full breakdown plus the amount you can deduct on your income tax return.",
    examples:
      "Example: a Single filer with $80,000 in net self-employment profit and no other wages owes about " +
      "$9,161.12 in Social Security tax and $2,142.52 in Medicare tax — a total of $11,303.64 in self-employment " +
      "tax, half of which ($5,651.82) is deductible above the line.",
    assumptions: SE_TAX_ASSUMPTIONS,
    faq: SE_TAX_FAQ,
  },
  {
    slug: "self-employment-tax-estimator",
    title: "Self Employment Tax Calculator",
    description:
      "Estimate your 2026 federal self-employment tax bill from your net profit, filing status, and any other " +
      "wages you earn.",
    metaTitle: "Self Employment Tax Estimator (2026) — SECA Breakdown",
    metaDescription:
      "Free self employment tax estimator. See your 2026 federal Social Security and Medicare tax breakdown " +
      "from your net self-employment profit.",
    calcInputs: [currencyField("netProfit", "Net Self-Employment Profit", { max: 500000, step: 500 }), otherWagesField, filingStatusField],
    calcResult: { label: "Total Self-Employment Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Portion (12.4%)", format: "currency" },
      { key: "medicareTax", label: "Medicare Portion (2.9%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%, if applicable)", format: "currency" },
      { key: "totalSeTax", label: "Total Self-Employment Tax", format: "currency", highlight: true },
      { key: "deductibleHalf", label: "Deductible Half (Above-the-Line Deduction)", format: "currency" },
    ],
    instructions:
      "A quick way to estimate what you'll owe in self-employment tax before filing — enter your projected net " +
      "self-employment profit for the year, any other W-2 wages, and your filing status to get a full breakdown " +
      "you can use for quarterly estimated tax planning.\n\n" +
      "Because self-employment tax isn't withheld the way payroll tax is for employees, many self-employed " +
      "filers use an estimate like this one to set aside money throughout the year or calculate quarterly " +
      "estimated payments (see the Quarterly Tax Calculator and Estimated Tax Calculator elsewhere on this site).",
    examples:
      "Example: a Married Filing Jointly filer with $120,000 in net self-employment profit and no other wages " +
      "owes about $13,741.68 in Social Security tax and $3,213.78 in Medicare tax — a total of $16,955.46 in " +
      "self-employment tax.",
    assumptions: SE_TAX_ASSUMPTIONS,
    faq: SE_TAX_FAQ,
  },
  {
    slug: "freelancer-tax-calculator",
    title: "Freelancer Tax Calculator",
    description:
      "Calculate the self-employment (Social Security + Medicare) tax freelancers owe on their 2026 net freelance " +
      "income.",
    metaTitle: "Freelancer Tax Calculator (2026) — Self-Employment Tax",
    metaDescription:
      "Free freelancer tax calculator. Estimate 2026 federal self-employment tax on your net freelance income, " +
      "with a full Social Security and Medicare breakdown.",
    calcInputs: [currencyField("netProfit", "Net Freelance Income", { max: 500000, step: 500 }), otherWagesField, filingStatusField],
    calcResult: { label: "Total Self-Employment Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Portion (12.4%)", format: "currency" },
      { key: "medicareTax", label: "Medicare Portion (2.9%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%, if applicable)", format: "currency" },
      { key: "totalSeTax", label: "Total Self-Employment Tax", format: "currency", highlight: true },
      { key: "deductibleHalf", label: "Deductible Half (Above-the-Line Deduction)", format: "currency" },
    ],
    instructions:
      "As a freelancer, the IRS treats your net freelance income the same way as any other self-employment " +
      "profit — subject to self-employment tax on top of regular income tax. Enter your net freelance income " +
      "(after business expenses), any other W-2 wages, and your filing status for a full breakdown.\n\n" +
      "Since clients don't withhold tax from freelance payments (unlike a traditional paycheck), this figure is " +
      "one you're generally responsible for setting aside yourself throughout the year.",
    examples:
      "Example: a Single freelancer with $65,000 in net freelance income and no other wages owes about " +
      "$7,443.41 in Social Security tax and $1,740.80 in Medicare tax — a total of $9,184.21 in self-employment " +
      "tax.",
    assumptions: SE_TAX_ASSUMPTIONS,
    faq: SE_TAX_FAQ,
  },
  {
    slug: "contractor-tax-calculator",
    title: "Contractor Tax Calculator",
    description:
      "Calculate the self-employment (Social Security + Medicare) tax independent contractors owe on their 2026 " +
      "net contracting income.",
    metaTitle: "Contractor Tax Calculator (2026) — Self-Employment Tax",
    metaDescription:
      "Free contractor tax calculator. Estimate 2026 federal self-employment tax on your net contracting income, " +
      "with a full Social Security and Medicare breakdown.",
    calcInputs: [currencyField("netProfit", "Net Contracting Income", { max: 500000, step: 500 }), otherWagesField, filingStatusField],
    calcResult: { label: "Total Self-Employment Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Portion (12.4%)", format: "currency" },
      { key: "medicareTax", label: "Medicare Portion (2.9%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%, if applicable)", format: "currency" },
      { key: "totalSeTax", label: "Total Self-Employment Tax", format: "currency", highlight: true },
      { key: "deductibleHalf", label: "Deductible Half (Above-the-Line Deduction)", format: "currency" },
    ],
    instructions:
      "If you receive 1099 income as an independent contractor (rather than W-2 wages from an employer), your " +
      "net contracting profit is subject to self-employment tax. Enter your net contracting income, any other " +
      "W-2 wages, and your filing status for a full Social Security/Medicare breakdown.\n\n" +
      "This is calculated the same way regardless of industry — construction, consulting, IT contracting, and " +
      "every other 1099 arrangement all use the same SECA formula on net profit.",
    examples:
      "Example: a Single contractor with $95,000 in net contracting income and no other wages owes about " +
      "$10,878.83 in Social Security tax and $2,544.24 in Medicare tax — a total of $13,423.07 in self-employment " +
      "tax.",
    assumptions: SE_TAX_ASSUMPTIONS,
    faq: SE_TAX_FAQ,
  },
  {
    slug: "gig-worker-tax-calculator",
    title: "Gig Worker Tax Calculator",
    description:
      "Calculate the self-employment tax gig workers (rideshare, delivery, task-based platforms) owe on their " +
      "2026 net gig income.",
    metaTitle: "Gig Worker Tax Calculator (2026) — Self-Employment Tax",
    metaDescription:
      "Free gig worker tax calculator. Estimate 2026 federal self-employment tax on your net gig platform " +
      "income, with a full Social Security and Medicare breakdown.",
    calcInputs: [currencyField("netProfit", "Net Gig Income", { max: 300000, step: 250 }), otherWagesField, filingStatusField],
    calcResult: { label: "Total Self-Employment Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Portion (12.4%)", format: "currency" },
      { key: "medicareTax", label: "Medicare Portion (2.9%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%, if applicable)", format: "currency" },
      { key: "totalSeTax", label: "Total Self-Employment Tax", format: "currency", highlight: true },
      { key: "deductibleHalf", label: "Deductible Half (Above-the-Line Deduction)", format: "currency" },
    ],
    instructions:
      "Rideshare driving, food delivery, task-based platforms, and similar gig work are all self-employment for " +
      "tax purposes — even if it's part-time or supplemental income. Enter your net gig income (earnings after " +
      "deductible expenses like mileage), any other W-2 wages, and your filing status for a breakdown.\n\n" +
      "Gig platforms typically don't withhold any tax from your payouts, so this self-employment tax (plus " +
      "regular income tax) is generally your own responsibility to plan for.",
    examples:
      "Example: a Single gig worker with $40,000 in net gig income and no other wages owes about $4,580.56 in " +
      "Social Security tax and $1,071.26 in Medicare tax — a total of $5,651.82 in self-employment tax.",
    assumptions: SE_TAX_ASSUMPTIONS,
    faq: SE_TAX_FAQ,
  },
  {
    slug: "side-hustle-tax-calculator",
    title: "Side Hustle Tax Calculator",
    description:
      "Calculate the self-employment tax owed on side hustle income, on top of a regular W-2 job's wages.",
    metaTitle: "Side Hustle Tax Calculator (2026) — Self-Employment Tax",
    metaDescription:
      "Free side hustle tax calculator. Estimate 2026 federal self-employment tax on side income earned " +
      "alongside a W-2 job.",
    calcInputs: [
      currencyField("netProfit", "Net Side Hustle Profit", { max: 200000, step: 250 }),
      currencyField("otherWages", "Your W-2 Job's Annual Wages", { unit: "per year", max: 400000, step: 500 }),
      filingStatusField,
    ],
    calcResult: { label: "Total Self-Employment Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Portion (12.4%)", format: "currency" },
      { key: "medicareTax", label: "Medicare Portion (2.9%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%, if applicable)", format: "currency" },
      { key: "totalSeTax", label: "Total Self-Employment Tax", format: "currency", highlight: true },
      { key: "deductibleHalf", label: "Deductible Half (Above-the-Line Deduction)", format: "currency" },
    ],
    instructions:
      "Built specifically for someone with a regular W-2 job who also earns self-employment income on the side " +
      "(freelancing, a small shop, consulting, and so on). Enter your net side hustle profit and your W-2 job's " +
      "annual wages so the calculator correctly shares the Social Security wage base and Additional Medicare " +
      "threshold between both income sources — this matters because your W-2 wages already use up part of the " +
      "annual Social Security wage base before your side hustle income is added.\n\n" +
      "Your employer already withholds Social Security and Medicare tax from your W-2 wages separately — this " +
      "calculator only covers the additional self-employment tax on the side income itself.",
    examples:
      "Example: someone with $70,000 in W-2 wages and $15,000 in net side hustle profit (Single) owes about " +
      "$1,717.71 in Social Security tax and $401.72 in Medicare tax on the side income — a total of $2,119.43 in " +
      "self-employment tax.",
    assumptions: SE_TAX_ASSUMPTIONS,
    faq: [
      {
        question: "Why does my W-2 job's wages matter for calculating side hustle tax?",
        answer:
          "Because the 12.4% Social Security portion only applies up to an annual wage base ($184,500 for 2026) " +
          "shared across ALL your earnings — W-2 wages and self-employment income combined. If your W-2 wages " +
          "already reach or exceed that base, your side hustle income owes only the 2.9% Medicare portion, not " +
          "the full 15.3% combined rate.",
      },
      ...SE_TAX_FAQ,
    ],
  },
  {
    slug: "independent-contractor-tax-calculator",
    title: "Independent Contractor Tax Calculator",
    description:
      "Calculate the 2026 federal self-employment tax independent contractors owe on their net 1099 income.",
    metaTitle: "Independent Contractor Tax Calculator (2026)",
    metaDescription:
      "Free independent contractor tax calculator. Estimate 2026 federal self-employment tax on your net 1099 " +
      "contracting income.",
    calcInputs: [currencyField("netProfit", "Net 1099 Income", { max: 500000, step: 500 }), otherWagesField, filingStatusField],
    calcResult: { label: "Total Self-Employment Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Portion (12.4%)", format: "currency" },
      { key: "medicareTax", label: "Medicare Portion (2.9%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%, if applicable)", format: "currency" },
      { key: "totalSeTax", label: "Total Self-Employment Tax", format: "currency", highlight: true },
      { key: "deductibleHalf", label: "Deductible Half (Above-the-Line Deduction)", format: "currency" },
    ],
    instructions:
      "As an independent contractor, you're responsible for self-employment tax that a traditional employer " +
      "would otherwise split with you through payroll withholding. Enter your net 1099 income, any other W-2 " +
      "wages, and your filing status for a full breakdown.\n\n" +
      "This figure is separate from and in addition to your federal (and often state) income tax on the same " +
      "net income — plan for both when setting aside money or calculating quarterly estimated payments.",
    examples:
      "Example: a Single independent contractor with $150,000 in net 1099 income and no other wages owes about " +
      "$17,177.10 in Social Security tax and $4,017.23 in Medicare tax — a total of $21,194.32 in self-employment " +
      "tax.",
    assumptions: SE_TAX_ASSUMPTIONS,
    faq: SE_TAX_FAQ,
  },
  {
    slug: "sole-trader-tax-calculator",
    title: "Sole Trader Tax Calculator",
    description:
      "Calculate the 2026 federal self-employment tax a sole trader (sole proprietor) owes on their net business " +
      "profit.",
    metaTitle: "Sole Trader Tax Calculator (2026) — Self-Employment Tax",
    metaDescription:
      "Free sole trader tax calculator. Estimate 2026 federal self-employment tax on your net sole " +
      "proprietorship profit.",
    calcInputs: [currencyField("netProfit", "Net Business Profit", { max: 500000, step: 500 }), otherWagesField, filingStatusField],
    calcResult: { label: "Total Self-Employment Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Portion (12.4%)", format: "currency" },
      { key: "medicareTax", label: "Medicare Portion (2.9%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%, if applicable)", format: "currency" },
      { key: "totalSeTax", label: "Total Self-Employment Tax", format: "currency", highlight: true },
      { key: "deductibleHalf", label: "Deductible Half (Above-the-Line Deduction)", format: "currency" },
    ],
    instructions:
      "\"Sole trader\" (common outside the US) and \"sole proprietor\" (the US term) both mean an unincorporated " +
      "business owned and run by one person — taxed the same way as any other self-employment income in the US " +
      "federal system. Enter your net business profit, any other W-2 wages, and your filing status for a full " +
      "breakdown.\n\n" +
      "If you're outside the US, note this calculator uses US federal SECA rules specifically — your own " +
      "country's self-employed social insurance contributions will follow different rates and rules.",
    examples:
      "Example: a Head of Household sole trader with $55,000 in net business profit and no other wages owes " +
      "about $6,298.27 in Social Security tax and $1,472.98 in Medicare tax — a total of $7,771.25 in " +
      "self-employment tax.",
    assumptions:
      SE_TAX_ASSUMPTIONS +
      "\n\nThis calculator specifically uses US federal self-employment tax (SECA) rules. If you're a sole " +
      "trader outside the United States, your own country's self-employed social insurance/contribution system " +
      "will use different rates.",
    faq: SE_TAX_FAQ,
  },
  {
    slug: "self-employed-social-security-calculator",
    title: "Self Employed Social Security Calculator",
    description:
      "Calculate just the Social Security portion (12.4%) of self-employment tax, up to the 2026 annual wage " +
      "base.",
    metaTitle: "Self Employed Social Security Calculator (2026)",
    metaDescription:
      "Free self employed Social Security calculator. Estimate just the 12.4% Social Security portion of your " +
      "2026 self-employment tax, up to the annual wage base.",
    calcInputs: [currencyField("netProfit", "Net Self-Employment Profit", { max: 500000, step: 500 }), otherWagesField],
    calcResult: { label: "Social Security Tax", format: "currency" },
    calcResults: [
      { key: "seNetEarnings", label: "Net Earnings From Self-Employment (92.35%)", format: "currency" },
      { key: "ssTaxableAmount", label: "Amount Subject to Social Security Tax", format: "currency" },
      { key: "socialSecurityTax", label: "Social Security Tax (12.4%)", format: "currency", highlight: true },
    ],
    instructions:
      "Isolates just the Social Security portion of self-employment tax — 12.4% (the combined employee and " +
      "employer share) on your net earnings from self-employment, up to the annual Social Security wage base " +
      "($184,500 for 2026). Enter your net self-employment profit and any other W-2 wages, since both share the " +
      "same annual wage base.\n\n" +
      "Unlike the Medicare portion, Social Security tax stops once you hit the wage base for the year — this " +
      "calculator shows exactly how much of your earnings were actually taxable.",
    examples:
      "Example: $200,000 in net self-employment profit with no other wages produces $184,700 in net earnings " +
      "from self-employment, but only $184,500 of that is subject to Social Security tax (the 2026 wage base " +
      "cap) — for $22,878 in Social Security tax.",
    assumptions: SE_TAX_ASSUMPTIONS,
    faq: [
      {
        question: "What happens to self-employment income above the Social Security wage base?",
        answer:
          "It stops owing the 12.4% Social Security portion entirely once your combined wages and net earnings " +
          "from self-employment for the year reach the annual wage base ($184,500 for 2026) — though the 2.9% " +
          "Medicare portion (and potentially the 0.9% Additional Medicare Tax) still applies with no cap. See " +
          "the Self Employed Medicare Calculator on this site for that portion.",
      },
      ...SE_TAX_FAQ.slice(1),
    ],
  },
  {
    slug: "self-employed-medicare-calculator",
    title: "Self Employed Medicare Calculator",
    description:
      "Calculate the Medicare portion (2.9%) of self-employment tax, plus the 0.9% Additional Medicare Tax where " +
      "it applies.",
    metaTitle: "Self Employed Medicare Calculator (2026)",
    metaDescription:
      "Free self employed Medicare calculator. Estimate your 2026 Medicare (2.9%) and Additional Medicare Tax " +
      "(0.9%) on self-employment income.",
    calcInputs: [currencyField("netProfit", "Net Self-Employment Profit", { max: 500000, step: 500 }), otherWagesField, filingStatusField],
    calcResult: { label: "Total Medicare Tax", format: "currency" },
    calcResults: [
      { key: "medicareTax", label: "Medicare Tax (2.9%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%, if applicable)", format: "currency" },
      { key: "totalMedicareTax", label: "Total Medicare Tax", format: "currency", highlight: true },
    ],
    instructions:
      "Isolates just the Medicare-related portion of self-employment tax — the uncapped 2.9% base Medicare rate " +
      "on all your net earnings from self-employment, plus the additional 0.9% Additional Medicare Tax on income " +
      "above your filing status's threshold. Enter your net self-employment profit, any other W-2 wages, and " +
      "your filing status.\n\n" +
      "Unlike the Social Security portion, there's no wage base cap here — Medicare tax applies to every dollar " +
      "of net earnings from self-employment, and the Additional Medicare Tax only makes it apply MORE once " +
      "you're above the threshold.",
    examples:
      "Example: a Single filer with $250,000 in net self-employment profit and no other wages owes about " +
      "$6,695.38 in base Medicare tax plus $277.88 in Additional Medicare Tax (since their $230,875 in net " +
      "earnings from self-employment crosses the $200,000 threshold) — a total of $6,973.25 in Medicare-related " +
      "tax.",
    assumptions: SE_TAX_ASSUMPTIONS,
    faq: [
      {
        question: "Is there a cap on Medicare tax the way there is for Social Security?",
        answer:
          "No — the 2.9% base Medicare rate applies to all your net earnings from self-employment with no upper " +
          "limit, unlike Social Security's annual wage base cap. The Additional Medicare Tax (0.9%) then adds " +
          "further tax once you're above your filing status's threshold, with no cap either.",
      },
      ...SE_TAX_FAQ.slice(1),
    ],
  },
  {
    slug: "self-employed-pension-calculator",
    title: "Self Employed Pension Calculator",
    description:
      "Estimate your 2026 maximum SEP-IRA and Solo 401(k) retirement contribution as a self-employed person, " +
      "from your net profit.",
    metaTitle: "Self Employed Pension Calculator (2026) — SEP-IRA & Solo 401(k)",
    metaDescription:
      "Free self employed pension calculator. Estimate your 2026 maximum SEP-IRA and Solo 401(k) contribution " +
      "from your net self-employment profit.",
    calcInputs: [
      currencyField("netProfit", "Net Self-Employment Profit", { max: 500000, step: 500 }),
      {
        key: "catchUpEligible",
        label: "Are You Age 50 or Older?",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes (eligible for catch-up contributions)", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Solo 401(k) Maximum Contribution", format: "currency" },
    calcResults: [
      { key: "adjustedNetEarnings", label: "Adjusted Net Earnings (for Plan Purposes)", format: "currency" },
      { key: "sepIraMax", label: "SEP-IRA Maximum Contribution", format: "currency" },
      { key: "solo401kEmployeeDeferral", label: "Solo 401(k) Employee Deferral", format: "currency" },
      { key: "solo401kEmployerContribution", label: "Solo 401(k) Employer Contribution", format: "currency" },
      { key: "solo401kMax", label: "Solo 401(k) Total Maximum", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your net self-employment profit and whether you're age 50 or older (which unlocks Solo 401(k) " +
      "catch-up contributions — SEP-IRAs don't offer a catch-up option). This calculator first works out your " +
      "\"adjusted net earnings\" for retirement-plan purposes (your net profit minus half of your " +
      "self-employment tax, capped at the 2026 compensation limit), then estimates your maximum contribution " +
      "under both a SEP-IRA and a Solo 401(k) side by side so you can compare.\n\n" +
      "A SEP-IRA allows only an employer-style contribution (about 20% of your adjusted net earnings, up to " +
      "$72,000 for 2026). A Solo 401(k) allows BOTH an employee elective deferral ($24,500 for 2026, plus an " +
      "$8,000 catch-up if you're 50+) AND that same employer-style contribution, which is usually why a Solo " +
      "401(k) allows a higher total contribution at lower income levels.",
    examples:
      "Example: someone under 50 with $150,000 in net self-employment profit has about $139,402.84 in adjusted " +
      "net earnings, giving a SEP-IRA maximum of about $27,880.57, versus a Solo 401(k) maximum of about " +
      "$52,380.57 ($24,500 employee deferral plus $27,880.57 employer contribution).",
    assumptions:
      "This calculator uses 2026 IRS figures cross-checked directly against IRS Notice 2025-67: a $72,000 " +
      "overall defined-contribution limit (§415(c)(1)(A)), a $360,000 compensation limit (§401(a)(17)), a " +
      "$24,500 elective deferral limit (§402(g)(1)), and an $8,000 age-50+ catch-up limit (§414(v)(2)(B)(i)). " +
      "The SEP-IRA and Solo 401(k) employer-contribution math (roughly 20% of adjusted net earnings, standing in " +
      "for a plan's stated 25%-of-compensation rate) follows IRS Publication 560's approach for self-employed " +
      "filers.\n\n" +
      "This is a simplified estimate — it doesn't account for multiple businesses, SIMPLE IRA rules, defined " +
      "benefit plans, or every edge case in the interdependent self-employed contribution formula. It also " +
      "assumes you have no other employer-sponsored retirement plan contributions this year that would share " +
      "the same annual limits.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice. For guidance specific to your situation, consult a qualified financial advisor, tax professional, " +
      "or your retirement plan provider.",
    faq: [
      {
        question: "Should I choose a SEP-IRA or a Solo 401(k)?",
        answer:
          "A Solo 401(k) usually allows a higher contribution at the same income level (because it adds the " +
          "employee elective deferral on top of the employer contribution), and it may offer catch-up " +
          "contributions and a Roth option a SEP-IRA doesn't. A SEP-IRA is simpler to set up and administer. " +
          "This calculator shows both maximums so you can compare — a financial advisor can help weigh the " +
          "trade-offs for your situation.",
      },
      {
        question: "Why is my SEP-IRA maximum roughly 20% of my earnings, not 25%?",
        answer:
          "A SEP-IRA plan's stated rate (up to 25% of compensation) and a self-employed person's own contribution " +
          "are interdependent — your contribution reduces your own compensation figure, which reduces your " +
          "contribution, and so on. The IRS resolves this by converting the 25% stated rate to an effective 20% " +
          "rate applied to your net earnings after half of your self-employment tax is subtracted (see IRS " +
          "Publication 560's Rate Table for Self-Employed).",
      },
      {
        question: "Can I contribute the full $72,000 even at a modest income?",
        answer:
          "No — your maximum is always the LOWER of the dollar limit ($72,000 for 2026, or $80,000 with " +
          "catch-up) and the percentage-of-earnings calculation. At lower income levels, the percentage " +
          "calculation is almost always the binding limit, not the dollar cap.",
      },
    ],
  },
  {
    slug: "self-employed-vat-calculator",
    title: "Self Employed VAT Calculator",
    description:
      "Calculate the VAT a self-employed person or freelancer owes on their taxable sales, from their revenue " +
      "and VAT rate.",
    metaTitle: "Self Employed VAT Calculator — Free & Instant",
    metaDescription:
      "Free self employed VAT calculator. Enter your taxable sales and VAT rate to find the VAT owed on your " +
      "freelance or self-employed income.",
    calcInputs: [
      currencyField("taxableSales", "Taxable Sales/Revenue", { max: 500000, step: 500 }),
      percentField("taxRate", "VAT Rate", { max: 27, step: 0.5, default: 20 }),
    ],
    calcResult: { label: "VAT Collected", format: "currency" },
    calcResults: [
      { key: "taxCollected", label: "VAT Collected", format: "currency", highlight: true },
      { key: "totalWithTax", label: "Total Invoiced (Sales + VAT)", format: "currency" },
    ],
    instructions:
      "Once a self-employed person or freelancer is VAT-registered (required above their country's registration " +
      "threshold, or voluntary below it), they must charge VAT on taxable sales and remit it to the tax " +
      "authority. Enter your taxable sales/revenue and your country's VAT rate to see the VAT you've collected " +
      "and owe.\n\n" +
      "This calculates output VAT on your sales only — your actual VAT liability to the tax authority is this " +
      "amount minus any input VAT you've paid on business purchases (see the VAT Payable Calculator elsewhere on " +
      "this site for that combined calculation).",
    examples:
      "Example: a VAT-registered freelancer with $18,000 in taxable sales for the quarter at a 20% VAT rate has " +
      "collected $3,600 in VAT, for $21,600 in total invoiced amount.",
    assumptions:
      "VAT rates, registration thresholds, and rules for the self-employed vary significantly by country, so " +
      "this calculator asks for your rate directly. It calculates output VAT on sales only and doesn't net " +
      "against input VAT paid on business purchases.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice.",
    faq: [
      {
        question: "Do I have to register for VAT as a self-employed person?",
        answer:
          "Generally only once your taxable turnover crosses your country's VAT registration threshold — below " +
          "that, registration is often voluntary. See the VAT Registration Threshold Calculator elsewhere on " +
          "this site to check where you stand.",
      },
      {
        question: "Is this the same as the general VAT Calculator on this site?",
        answer:
          "It's the same underlying VAT math, framed specifically around a self-employed person's taxable sales " +
          "— for VAT on individual purchases or invoices, the general VAT Calculator works too.",
      },
    ],
  },
  {
    slug: "self-employed-gst-calculator",
    title: "Self Employed GST Calculator",
    description:
      "Calculate the GST a self-employed person or freelancer owes on their taxable sales, from their revenue " +
      "and GST rate.",
    metaTitle: "Self Employed GST Calculator — Free & Instant",
    metaDescription:
      "Free self employed GST calculator. Enter your taxable sales and GST rate to find the GST owed on your " +
      "freelance or self-employed income.",
    calcInputs: [
      currencyField("taxableSales", "Taxable Sales/Revenue", { max: 500000, step: 500 }),
      percentField("taxRate", "GST Rate", { max: 20, step: 0.5, default: 10 }),
    ],
    calcResult: { label: "GST Collected", format: "currency" },
    calcResults: [
      { key: "taxCollected", label: "GST Collected", format: "currency", highlight: true },
      { key: "totalWithTax", label: "Total Invoiced (Sales + GST)", format: "currency" },
    ],
    instructions:
      "In countries that use Goods and Services Tax (GST) instead of or alongside VAT — including Australia, " +
      "Canada, New Zealand, Singapore, and India — a self-employed person registered for GST must charge it on " +
      "taxable sales. Enter your taxable sales/revenue and your country's GST rate to see the GST collected and " +
      "owed.\n\n" +
      "As with VAT, this calculates output GST on your sales only — your net GST liability to the tax authority " +
      "is this amount minus any input GST credits you've claimed on business purchases.",
    examples:
      "Example: a GST-registered freelancer with $25,000 in taxable sales for the period at a 10% GST rate has " +
      "collected $2,500 in GST, for $27,500 in total invoiced amount.",
    assumptions:
      "GST rates and registration rules vary by country (10% in Australia, 5% federal GST in Canada often " +
      "combined with provincial tax, 15% in New Zealand, and so on), so this calculator asks for your rate " +
      "directly. It calculates output GST on sales only and doesn't net against input GST credits.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice.",
    faq: [
      {
        question: "What's the difference between GST and VAT?",
        answer:
          "They're conceptually the same type of consumption tax — GST is simply the name used in Australia, " +
          "Canada, New Zealand, India, Singapore, and several other countries, while VAT is the name used in the " +
          "UK, EU, and elsewhere. The math this calculator performs is identical either way.",
      },
      {
        question: "Do I need to register for GST as a self-employed person?",
        answer:
          "Generally only once your turnover crosses your country's GST registration threshold (for example, " +
          "AUD $75,000 in Australia) — check your specific country's tax authority for the current threshold and " +
          "rules.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:setup-finance-categories" first, ` +
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
