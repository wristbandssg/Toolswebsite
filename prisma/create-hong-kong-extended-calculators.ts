// One-time (but safe to re-run) batch setup script: creates 7 more Tools
// under the EXISTING "Hong Kong Tax & Salary Calculators" category (slug
// "hong-kong-tax-salary-calculators", created by create-hong-kong-tax-tool.ts
// — this script does NOT create the category; it fails loudly if it's
// missing).
//
// An 8th tool, "Hong Kong Salaries Tax Calculator", was deliberately SKIPPED
// from this batch — Salaries Tax is exactly what the existing
// "hong-kong-income-tax-calculator" already computes (Hong Kong calls its
// income tax "Salaries Tax"), so a second tool with that name would be a
// true duplicate, not a distinct calculator.
//
// See src/lib/calc-engine-hongkong-extended-calculators.ts for the actual
// math and which of its exported functions each of these 7 slugs maps to,
// and that file's header for the ird.gov.hk/mpfa.gov.hk source notes,
// including the 28-Feb-2024 AVD simplification, the 2026/27 Budget's
// allowance increase (used here, ahead of the main income-tax tool which
// still has the older 2025/26 figures), and the honest "no general CGT / no
// dividend tax" framing.
//
// HOW TO RUN
//   npx tsx prisma/create-hong-kong-extended-calculators.ts
// or
//   npm run db:create-hong-kong-extended-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "hong-kong-tax-salary-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function hkdField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit ?? "HKD",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 10000000,
    step: opts.step ?? 1000,
  };
}

function hkdResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", currency: "HKD", unit: opts.unit, highlight: opts.highlight };
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

const HK_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified tax adviser or the Inland Revenue " +
  "Department (IRD).";

const NO_CGT_NOTE =
  "Hong Kong has no general capital gains tax — gains are only taxed (as Profits Tax, not a separate CGT) when " +
  "the Inland Revenue Department's \"badges of trade\" test finds the activity is really trading, not genuine " +
  "long-term investment.";

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
  // 1. Hong Kong Profits Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "hong-kong-profits-tax-calculator",
    title: "Hong Kong Profits Tax Calculator",
    description: "Calculate Hong Kong Profits Tax on business income using the two-tiered rate structure.",
    metaTitle: "Hong Kong Profits Tax Calculator — Free & Instant",
    metaDescription:
      "Free Hong Kong Profits Tax calculator using the current two-tiered rates for unincorporated businesses " +
      "and corporations.",
    calcInputs: [
      hkdField("assessableProfits", "Assessable Profits", { unit: "HKD/year", max: 50000000 }),
      yesNoField("isCorporation", "Is This a Corporation? (vs. Unincorporated Business)"),
    ],
    calcResult: { label: "Profits Tax", format: "currency", currency: "HKD" },
    calcResults: [
      hkdResult("profitsTax", "Profits Tax", { highlight: true }),
      hkdResult("netProfitsAfterTax", "Net Profits After Tax"),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter your assessable profits for the year and say whether you're a corporation or an unincorporated " +
      "business (sole proprietorship or partnership). Hong Kong's Profits Tax uses a two-tiered rate: the first " +
      "HKD2,000,000 of assessable profits is taxed at half the standard rate, and everything above that at the " +
      "full rate.\n\n" +
      "Unincorporated businesses pay 7.5% on the first HKD2,000,000 and 15% above it. Corporations pay 8.25% on " +
      "the first HKD2,000,000 and 16.5% above it. If your business has connected entities, only ONE of them can " +
      "elect the two-tiered rate — this calculator assumes you're eligible for it.",
    examples:
      "Example: a corporation with HKD5,000,000 assessable profits owes HKD660,000.00 Profits Tax " +
      "(HKD2,000,000 × 8.25% + HKD3,000,000 × 16.5%), for a 13.20% effective rate.",
    assumptions:
      "This calculator uses the confirmed two-tiered Profits Tax rates from ird.gov.hk (unchanged for many " +
      "years): 7.5%/15% for unincorporated businesses, 8.25%/16.5% for corporations, with the HKD2,000,000 " +
      "threshold. It assumes your business is eligible for the two-tiered rate (only one entity per connected " +
      "group can elect it) and doesn't model provisional tax payments, which are billed separately during the " +
      "year as an advance against next year's liability.\n\n" +
      HK_DISCLAIMER,
    faq: [
      {
        question: "Can every business use the two-tiered rate?",
        answer:
          "Almost — the main restriction is for connected entities (companies under common control): only ONE " +
          "entity in a connected group can elect the two-tiered rate for a given year, so its related companies " +
          "pay the flat 16.5%/15% rate on all their profits instead.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 2. Hong Kong Property Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "hong-kong-property-tax-calculator",
    title: "Hong Kong Property Tax Calculator",
    description: "Calculate Hong Kong Property Tax at the flat 15% rate on rental income, after the statutory allowance.",
    metaTitle: "Hong Kong Property Tax Calculator — Free & Instant",
    metaDescription:
      "Free Hong Kong Property Tax calculator. Enter your rental income to see tax owed at the flat 15% rate " +
      "after the 20% statutory allowance.",
    calcInputs: [
      hkdField("grossRent", "Gross Rent Received", { unit: "HKD/year", max: 10000000 }),
      hkdField("ratesPaidByOwner", "Government Rates Paid by Owner", { unit: "HKD/year", max: 500000, required: false }),
      hkdField("irrecoverableRent", "Irrecoverable Rent (Written Off)", { unit: "HKD/year", max: 5000000, required: false }),
    ],
    calcResult: { label: "Property Tax", format: "currency", currency: "HKD" },
    calcResults: [
      hkdResult("netAssessableValue", "Net Assessable Value"),
      hkdResult("statutoryAllowance", "Statutory Allowance (20%)"),
      hkdResult("propertyTax", "Property Tax", { highlight: true }),
    ],
    instructions:
      "Enter your gross rent received, any government rates you (the owner) paid, and any irrecoverable rent " +
      "you've written off during the year. Property Tax is charged at a flat 15% on the Net Assessable Value " +
      "(gross rent, less rates paid by the owner and irrecoverable rent) after a fixed 20% statutory allowance " +
      "for repairs and outgoings — no ACTUAL expenses, and critically no mortgage interest, are separately " +
      "deductible under Property Tax.\n\n" +
      "If you also have other income (like a salary), electing Personal Assessment instead may work out cheaper " +
      "— see the Rental Income Tax Calculator, which compares both routes.",
    examples:
      "Example: HKD300,000 gross rent, with HKD12,000 rates and HKD8,000 irrecoverable rent, has a " +
      "HKD280,000.00 Net Assessable Value; after the HKD56,000.00 statutory allowance, HKD224,000.00 taxable " +
      "value owes HKD33,600.00 Property Tax.",
    assumptions:
      "This calculator uses the confirmed flat 15% Property Tax rate and 20% statutory allowance from ird.gov.hk " +
      "— the statutory allowance is fixed and applies regardless of your actual repair/maintenance costs, and " +
      "mortgage interest is NEVER deductible under Property Tax (only under the alternative Personal Assessment " +
      "election).\n\n" +
      HK_DISCLAIMER,
    faq: [
      {
        question: "Can I deduct my mortgage interest under Property Tax?",
        answer:
          "No — mortgage interest is never deductible under standard Property Tax, only the fixed 20% statutory " +
          "allowance is given regardless of actual costs. If you have significant mortgage interest, electing " +
          "Personal Assessment instead may let you deduct it — see the Rental Income Tax Calculator.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 3. Hong Kong Stamp Duty Calculator
  // -------------------------------------------------------------------
  {
    slug: "hong-kong-stamp-duty-calculator",
    title: "Hong Kong Stamp Duty Calculator",
    description: "Calculate Ad Valorem Stamp Duty (AVD) on a Hong Kong property purchase using the current Scale 2 rates.",
    metaTitle: "Hong Kong Stamp Duty Calculator (AVD) — Free & Instant",
    metaDescription:
      "Free Hong Kong stamp duty calculator using the current Scale 2 Ad Valorem Stamp Duty rates, applicable " +
      "to all residential buyers since February 2024.",
    calcInputs: [hkdField("propertyValue", "Property Value", { unit: "HKD", max: 200000000, step: 10000 })],
    calcResult: { label: "Stamp Duty (AVD)", format: "currency", currency: "HKD" },
    calcResults: [
      hkdResult("stampDuty", "Stamp Duty (AVD)", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter the property value to calculate Ad Valorem Stamp Duty (AVD) using the \"Scale 2\" rate table. Since " +
      "28 February 2024, Special Stamp Duty, Buyer's Stamp Duty, and the higher New Residential rate were all " +
      "ABOLISHED — every residential buyer now pays the same Scale 2 rates regardless of residency status or how " +
      "many properties they already own.",
    examples:
      "Example: a HKD6,300,000 property owes HKD165,000.00 AVD (2.62% effective rate) — a HKD50,000,000 " +
      "property instead owes HKD2,125,000.00 (4.25% flat, within the top confirmed band).",
    assumptions:
      "This calculator uses the confirmed Scale 2 AVD rate table from ird.gov.hk, current since the 28 February " +
      "2024 simplification that abolished Special/Buyer's/New-Residential Stamp Duty. The 2026-27 Budget " +
      "introduced a new 6.5% band above HKD100,000,000 — this tool applies that flat 6.5% above HKD100,000,000, " +
      "but the exact marginal-relief calculation immediately above that threshold wasn't independently confirmed " +
      "against an updated official table at the time of writing, so treat figures right at that boundary as " +
      "approximate and verify with IRD or your solicitor before relying on them.\n\n" +
      HK_DISCLAIMER,
    faq: [
      {
        question: "Do I pay extra stamp duty as a non-resident or second-home buyer?",
        answer:
          "Not anymore — since 28 February 2024, the extra Buyer's Stamp Duty (for non-permanent-residents) and " +
          "New Residential Stamp Duty (for second/subsequent properties) were both abolished. Every residential " +
          "buyer now pays the same Scale 2 rate shown here, regardless of residency or how many properties they " +
          "already own.",
      },
      {
        question: "Is this calculator accurate for very high-value properties?",
        answer:
          "For properties above HKD100,000,000, this tool applies a flat 6.5% rate introduced in the 2026-27 " +
          "Budget, but the precise marginal-relief mechanics right at that new threshold weren't independently " +
          "confirmed against an updated official rate table — confirm the exact figure with IRD or your " +
          "solicitor for transactions near that boundary.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 4. Hong Kong Rental Income Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "hong-kong-rental-income-tax-calculator",
    title: "Hong Kong Rental Income Tax Calculator",
    description: "Compare Property Tax against electing Personal Assessment for rental income, and see which costs less.",
    metaTitle: "Hong Kong Rental Income Tax Calculator — Free & Instant",
    metaDescription:
      "Free Hong Kong rental income tax calculator. Compares standard Property Tax against electing Personal " +
      "Assessment, and recommends whichever is lower.",
    calcInputs: [
      hkdField("grossRent", "Gross Rent Received", { unit: "HKD/year", max: 10000000 }),
      hkdField("ratesPaidByOwner", "Government Rates Paid by Owner", { unit: "HKD/year", max: 500000, required: false }),
      hkdField("mortgageInterest", "Mortgage Interest Paid", { unit: "HKD/year", max: 5000000, required: false }),
      hkdField("otherSalaryIncome", "Other Salary Income (For Personal Assessment Comparison)", { unit: "HKD/year", max: 20000000, required: false }),
      yesNoField("isMarried", "Married?"),
    ],
    calcResult: { label: "Recommended Tax", format: "currency", currency: "HKD" },
    calcResults: [
      hkdResult("propertyTaxAmount", "Route A: Standard Property Tax"),
      hkdResult("personalAssessmentRentalTax", "Route B: Personal Assessment (Rental Share)"),
      { key: "recommendedRoute", label: "Recommended Route (0=Property Tax, 1=Personal Assessment)", format: "number" },
      hkdResult("recommendedTax", "Recommended (Lower) Tax", { highlight: true }),
    ],
    instructions:
      "Enter your gross rent, government rates paid, mortgage interest, and (if applicable) your other salary " +
      "income and marital status. Hong Kong gives landlords a genuine choice: pay the standard flat 15% " +
      "Property Tax (no mortgage interest deduction, but simple), or elect Personal Assessment, which pools your " +
      "rental profit with your salary, applies progressive Salaries Tax treatment and your personal allowance, " +
      "and DOES allow a mortgage interest deduction.\n\n" +
      "This calculator computes both routes and recommends whichever costs less — exactly the comparison the IRD " +
      "itself effectively makes when you elect Personal Assessment.",
    examples:
      "Example: HKD360,000 rent with HKD10,000 rates, HKD150,000 mortgage interest, HKD800,000 other salary, " +
      "married, owes HKD42,000.00 under standard Property Tax versus HKD34,000.00 under Personal Assessment — " +
      "Personal Assessment is recommended, saving HKD8,000.00.",
    assumptions:
      "This calculator uses the CURRENT 2026/27 Salaries Tax allowances (Basic HKD145,000, Married HKD290,000), " +
      "raised in the 2026/27 Budget — note this differs from the main Hong Kong Income Tax Calculator elsewhere " +
      "on this site, which still uses the earlier 2025/26 figures. It isolates the rental-attributable share of " +
      "the Personal Assessment bill by comparing total tax against tax on your salary alone; it doesn't model " +
      "other allowances or deductions (child, dependent parent, etc.) that could further reduce the Personal " +
      "Assessment route.\n\n" +
      HK_DISCLAIMER,
    faq: [
      {
        question: "Is Personal Assessment always cheaper?",
        answer:
          "No — it depends on your specific numbers. Personal Assessment helps most when you have significant " +
          "mortgage interest to deduct (not allowed under standard Property Tax) or when pooling with modest " +
          "other income keeps you in a low progressive bracket. With little or no mortgage interest and high " +
          "other income, standard Property Tax's flat 15% can be cheaper.",
      },
      {
        question: "Do I have to elect Personal Assessment every year?",
        answer:
          "Yes — Personal Assessment is an annual election, not a permanent change. You (and your spouse, if " +
          "applicable) can compare both routes each year and elect whichever is more favourable for that " +
          "particular year's numbers.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 5. Hong Kong Capital Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "hong-kong-capital-gains-tax-calculator",
    title: "Hong Kong Capital Gains Tax Calculator",
    description: "See why Hong Kong generally has no capital gains tax, and when the 'badges of trade' exception applies.",
    metaTitle: "Hong Kong Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free Hong Kong capital gains tool. Hong Kong has no general CGT — see when gains are instead taxed as " +
      "Profits Tax under the 'badges of trade' test.",
    calcInputs: [
      hkdField("gainAmount", "Gain Amount", { unit: "HKD", max: 50000000 }),
      yesNoField("isConsideredTrading", "Would IRD Consider This Trading (Not Investment)?"),
      yesNoField("isCorporation", "Is This a Corporation? (vs. Unincorporated)"),
    ],
    calcResult: { label: "Tax on Gain", format: "currency", currency: "HKD" },
    calcResults: [
      hkdResult("taxableGain", "Taxable Gain"),
      hkdResult("taxOnGain", "Tax on Gain", { highlight: true }),
      hkdResult("netProceeds", "Net Proceeds"),
    ],
    instructions:
      `${NO_CGT_NOTE}\n\n` +
      "Enter your gain amount and whether IRD would consider the underlying activity trading rather than " +
      "genuine long-term investment — IRD looks at \"badges of trade\" factors like frequency of transactions, " +
      "holding period, reason for acquisition, and financing method. If it's genuinely investment, the gain is " +
      "entirely tax-free. If it's really trading (common for frequent short-term property flips or active " +
      "securities dealing), the gain is taxed as ordinary Profits Tax instead, at the same two-tiered rates as " +
      "any other business profit.",
    examples:
      "Example: a HKD500,000 gain classified as genuine investment owes HKD0.00 tax — the SAME HKD500,000 gain, " +
      "if IRD instead classifies it as trading (unincorporated), owes HKD37,500.00 Profits Tax (7.5% two-tiered " +
      "rate).",
    assumptions:
      "This calculator reflects Hong Kong's confirmed structural position: no general capital gains tax exists " +
      "(ird.gov.hk), with gains taxed only when IRD's badges-of-trade test finds genuine trading. It doesn't " +
      "apply the badges-of-trade test for you — that's a facts-and-circumstances judgment IRD makes case by " +
      "case, and this tool simply lets you model the tax outcome under each classification.\n\n" +
      HK_DISCLAIMER,
    faq: [
      {
        question: "How does IRD decide if it's trading or investment?",
        answer:
          "IRD weighs several \"badges of trade\" factors together — how often you buy and sell, how long you " +
          "hold assets, your stated intention at acquisition, whether you financed the purchase with a short-" +
          "term loan, and whether you made any improvements before resale. No single factor is decisive; it's " +
          "a judgment based on the overall pattern.",
      },
      {
        question: "Is property investment usually safe from this?",
        answer:
          "Long-term property holding for rental income is generally treated as investment, but frequent buying " +
          "and reselling of properties in short succession — especially without ever renting them out — raises a " +
          "real risk that IRD reclassifies the activity as trading, taxable as Profits Tax.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 6. Hong Kong Dividend Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "hong-kong-dividend-tax-calculator",
    title: "Hong Kong Dividend Tax Calculator",
    description: "Confirm that dividends received in Hong Kong are tax-exempt, with no Dividend Tax to calculate.",
    metaTitle: "Hong Kong Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free Hong Kong dividend tax tool. Dividends received in Hong Kong are tax-exempt — see why, and the " +
      "narrow exceptions that can apply.",
    calcInputs: [hkdField("dividendAmount", "Dividend Amount", { unit: "HKD", max: 10000000 })],
    calcResult: { label: "Tax on Dividend", format: "currency", currency: "HKD" },
    calcResults: [
      hkdResult("dividendAmount", "Dividend Amount"),
      hkdResult("taxOnDividend", "Tax on Dividend", { highlight: true }),
      hkdResult("netDividend", "Net Dividend (After Tax)"),
    ],
    instructions:
      "Enter your dividend amount — Hong Kong dividends received by both individuals and corporations are " +
      "exempt from tax entirely. This isn't a special allowance or exemption threshold; it's a structural " +
      "feature of the territorial tax system, since the underlying company profits were already (or will be) " +
      "taxed once under Profits Tax before distribution, and Hong Kong doesn't tax the same profit again at the " +
      "shareholder level.",
    examples: "Example: a HKD200,000 dividend owes HKD0.00 tax, for a full HKD200,000.00 net dividend — this is always true for dividend income received in Hong Kong.",
    assumptions:
      "This calculator reflects Hong Kong's confirmed structural exemption for dividend income (ird.gov.hk) — " +
      "there is no threshold, cap, or holding-period requirement; ALL dividends received are exempt, regardless " +
      "of amount or source. Note this exemption covers dividends RECEIVED — a company distributing dividends out " +
      "of already-Profits-Tax-paid profits doesn't get a second deduction for the distribution itself.\n\n" +
      HK_DISCLAIMER,
    faq: [
      {
        question: "Is there any limit to the dividend tax exemption?",
        answer:
          "No — unlike many countries with tax-free dividend allowances up to a certain amount, Hong Kong's " +
          "exemption is unlimited and unconditional for dividends received. The company paying the dividend " +
          "already paid Profits Tax on the underlying profit, and Hong Kong's territorial system doesn't tax it " +
          "again at the shareholder level.",
      },
      {
        question: "Does this apply to foreign dividends too?",
        answer:
          "Generally yes for dividends received by Hong Kong individuals and most companies, though foreign-" +
          "sourced dividends received by certain multinational corporate groups can fall under separate foreign-" +
          "sourced income rules introduced in 2023 — this calculator models the standard individual/simple-" +
          "corporate case, not that specific multinational regime.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 7. Hong Kong MPF Calculator
  // -------------------------------------------------------------------
  {
    slug: "hong-kong-mpf-calculator",
    title: "Hong Kong MPF Calculator",
    description: "Calculate mandatory Mandatory Provident Fund (MPF) contributions for employees and self-employed.",
    metaTitle: "Hong Kong MPF Calculator — Free & Instant",
    metaDescription:
      "Free Hong Kong MPF calculator. See your employee and employer Mandatory Provident Fund contributions, " +
      "including the minimum and maximum relevant income thresholds.",
    calcInputs: [
      hkdField("monthlyRelevantIncome", "Monthly Relevant Income", { unit: "HKD/month", max: 200000 }),
      yesNoField("isSelfEmployed", "Self-Employed? (No Employer Contribution)"),
    ],
    calcResult: { label: "Total Monthly MPF Contribution", format: "currency", currency: "HKD" },
    calcResults: [
      hkdResult("employeeContribution", "Employee Contribution (5%)"),
      hkdResult("employerContribution", "Employer Contribution (5%)"),
      hkdResult("totalMonthlyContribution", "Total Monthly Contribution", { highlight: true }),
      { key: "belowMinimumThreshold", label: "Below Minimum Income Threshold?", format: "number" },
    ],
    instructions:
      "Enter your monthly relevant income and whether you're self-employed. Both employee and employer normally " +
      "contribute 5% of relevant income to MPF each, capped at income of HKD30,000/month (so a maximum of " +
      "HKD1,500 each, HKD3,000 total, per month).\n\n" +
      "Below HKD7,100/month, an EMPLOYEE isn't required to contribute their own 5% — but their employer still " +
      "must contribute 5% on their behalf regardless. Self-employed people have no employer side at all, so " +
      "below HKD7,100/month a self-employed person makes no MPF contribution whatsoever that month.",
    examples:
      "Example: an employee earning HKD40,000/month (above the HKD30,000 cap) contributes HKD1,500.00, matched " +
      "by an HKD1,500.00 employer contribution — HKD3,000.00 total. The SAME HKD40,000/month for a self-employed " +
      "person instead contributes only their own HKD1,500.00, with no employer side.",
    assumptions:
      "This calculator uses the confirmed 5%/5% MPF contribution rate, the HKD7,100/month minimum relevant " +
      "income threshold (below which employee contributions aren't required), and the HKD30,000/month maximum " +
      "relevant income level (above which contributions are capped), all from mpfa.gov.hk. It doesn't model " +
      "voluntary contributions above the mandatory minimum, or MPF-exempt persons (such as those covered by " +
      "occupational retirement schemes with an exemption certificate).\n\n" +
      HK_DISCLAIMER,
    faq: [
      {
        question: "Do I still get an employer contribution if I earn below HKD7,100?",
        answer:
          "As an EMPLOYEE, yes — your employer must still contribute their 5% on your actual income even though " +
          "you aren't required to contribute your own share below that threshold. As a SELF-EMPLOYED person, " +
          "there's no employer side at all, so below HKD7,100/month you make no MPF contribution that month.",
      },
      {
        question: "What happens to contributions above the HKD30,000 income cap?",
        answer:
          "Mandatory contributions are capped based on HKD30,000/month relevant income, so the mandatory portion " +
          "tops out at HKD1,500 each side (HKD3,000 total) regardless of how much more you earn. You can " +
          "voluntarily contribute more, but it isn't required and isn't modelled by this calculator.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:create-hong-kong-tool" first, then ` +
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
