// One-time (but safe to re-run) batch setup script: creates 15 more Tools
// under the EXISTING "Australia Tax & Salary Calculators" category (slug
// "australia-tax-salary-calculators", created by create-australia-tax-
// tool.ts — this script does NOT create the category; it fails loudly if
// it's missing).
//
// See src/lib/calc-engine-australia-extended-calculators.ts for the
// actual math and which of its exported functions each of these 15 slugs
// maps to, and that file's header for the ato.gov.au source of every
// FY2026-27 figure used.
//
// HOW TO RUN
//   npx tsx prisma/create-australia-extended-calculators.ts
// or
//   npm run db:create-australia-extended-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "australia-tax-salary-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function audField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit ?? "AUD",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 300000,
    step: opts.step ?? 500,
  };
}

function audResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", currency: "AUD", unit: opts.unit, highlight: opts.highlight };
}

function percentResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "percentage", highlight: opts.highlight };
}

const yesNoField = (key: string, label: string, defaultValue: 0 | 1 = 0) => ({
  key,
  label,
  type: "dropdown",
  required: true,
  default: defaultValue,
  options: [
    { label: "No", value: 0 },
    { label: "Yes", value: 1 },
  ],
});

const AU_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a registered tax agent or the ATO.";

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
  // 1. Australia Medicare Levy Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-medicare-levy-calculator",
    title: "Australia Medicare Levy Calculator",
    description: "Calculate your Medicare Levy from your taxable income, including the low-income shade-in range.",
    metaTitle: "Australia Medicare Levy Calculator — Free & Instant",
    metaDescription:
      "Free Australia Medicare Levy calculator. Enter your taxable income to see your 2% Medicare Levy, " +
      "including the low-income shade-in range.",
    calcInputs: [audField("taxableIncome", "Taxable Income", { unit: "AUD/year", max: 250000 })],
    calcResult: { label: "Medicare Levy", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("medicareLevy", "Medicare Levy", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter your taxable income. The Medicare Levy is a flat 2% of taxable income for most taxpayers — but " +
      "below $35,013 it \"shades in\" gradually: no levy at all below $28,011, then a reduced 10 cents per " +
      "dollar above that (rather than the full 2%) until the two formulas meet exactly at $35,013, above which " +
      "the ordinary flat 2% applies.",
    examples: "Example: $80,000 of taxable income owes $1,600.00 in Medicare Levy — the full flat 2% rate, since $80,000 is well above the $35,013 shade-in ceiling.",
    assumptions:
      "This calculator uses the confirmed Medicare Levy shade-in thresholds ($28,011/$35,013) and 2% rate, " +
      "sourced from ato.gov.au, using the SINGLE thresholds — family thresholds (higher, and increased per " +
      "dependent) aren't modeled since this tool doesn't collect household information. It doesn't include the " +
      "Medicare Levy Surcharge (a separate extra levy for those without private hospital cover — see the " +
      "Medicare Levy Surcharge Calculator for that) or the Medicare Levy exemption some taxpayers qualify for.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "Is the Medicare Levy the same as the Medicare Levy Surcharge?",
        answer:
          "No — the Medicare Levy is a near-universal 2% charge almost every taxpayer pays, funding Medicare. " +
          "The Medicare Levy Surcharge is a SEPARATE, additional charge only for higher earners who don't hold " +
          "private hospital cover — see the Medicare Levy Surcharge Calculator for that one.",
      },
      {
        question: "Who is exempt from the Medicare Levy?",
        answer:
          "Certain low-income earners below the shade-in threshold, some Medicare-ineligible visa holders, and " +
          "a few other specific categories the ATO lists — this calculator doesn't check exemption eligibility, " +
          "so check ato.gov.au if you think you might qualify.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 2. Australia Medicare Levy Surcharge Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-medicare-levy-surcharge-calculator",
    title: "Australia Medicare Levy Surcharge Calculator",
    description:
      "Calculate the extra Medicare Levy Surcharge you may owe if you don't hold private hospital cover.",
    metaTitle: "Australia Medicare Levy Surcharge Calculator — Free & Instant",
    metaDescription:
      "Free Medicare Levy Surcharge calculator. Enter your income and private hospital cover status to see " +
      "your 2026-27 MLS.",
    calcInputs: [
      audField("taxableIncome", "Taxable Income (Approx. — Includes Some Add-Backs)", { unit: "AUD/year", max: 400000 }),
      yesNoField("hasPrivateCover", "Do You Hold Private Hospital Cover?"),
    ],
    calcResult: { label: "Medicare Levy Surcharge", format: "currency", currency: "AUD" },
    calcResults: [
      percentResult("surchargeRate", "Surcharge Rate"),
      audResult("medicareLevySurcharge", "Medicare Levy Surcharge", { highlight: true }),
    ],
    instructions:
      "Enter your income and whether you hold an appropriate level of private hospital cover. If you don't, " +
      "and your income crosses the relevant threshold, the ATO charges an EXTRA levy on top of the standard " +
      "Medicare Levy — 1%, 1.25%, or 1.5% depending on how high your income is, designed to encourage higher " +
      "earners to take out private cover instead of relying solely on Medicare.\n\n" +
      "Hold appropriate private hospital cover for the full year and this surcharge doesn't apply at all, " +
      "whatever your income.",
    examples: "Example: $130,000 of income with no private hospital cover falls in the second tier ($123,001–$164,000), owing a 1.25% surcharge — $1,625.00 for the year.",
    assumptions:
      "This calculator uses the confirmed FY2026-27 single-person MLS thresholds and rates from ato.gov.au: 0% " +
      "up to $105,000, 1% to $123,000, 1.25% to $164,000, 1.5% above. It doesn't use the higher family " +
      "thresholds (which also increase per dependent child after the first) — a household should use those " +
      "instead. \"Income for MLS purposes\" also technically includes certain add-backs (reportable fringe " +
      "benefits, net investment losses) this calculator doesn't compute — use your taxable income as a close " +
      "approximation.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "What counts as \"appropriate\" private hospital cover?",
        answer:
          "A hospital (not just \"extras\"/ancillary) policy with an excess of $750 or less (single) or $1,500 " +
          "or less (family/couple) for the full income year, from a registered health insurer — a basic extras-" +
          "only policy doesn't avoid the surcharge.",
      },
      {
        question: "Why does this surcharge exist?",
        answer:
          "To encourage higher-income earners to take out private hospital cover, easing pressure on the " +
          "public Medicare system — it only applies above the base threshold and only if you go without cover.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 3. Australia GST Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-gst-calculator",
    title: "Australia GST Calculator",
    description: "Add or extract Australia's 10% Goods and Services Tax (GST) from a price.",
    metaTitle: "Australia GST Calculator — Free & Instant",
    metaDescription: "Free Australia GST calculator. Add 10% GST to a price or extract it from a GST-inclusive price.",
    calcInputs: [
      audField("amount", "Amount", { unit: "AUD", max: 500000, step: 10 }),
      {
        key: "isGstInclusive",
        label: "Is the Amount Already GST-Inclusive?",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "No — add GST to this price", value: 0 },
          { label: "Yes — extract GST from this price", value: 1 },
        ],
      },
    ],
    calcResult: { label: "GST Amount", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("netAmount", "Net Amount (Excluding GST)"),
      audResult("gstAmount", "GST Amount (10%)", { highlight: true }),
      audResult("grossAmount", "Gross Amount (Including GST)"),
    ],
    instructions:
      "Enter an amount and say whether it already includes GST. Australia's GST is a flat 10%, applied " +
      "uniformly nationwide with no state-by-state variation (unlike US sales tax or Canadian PST) — most " +
      "goods and services are taxable, with a specific list of GST-free items (basic food, health, education, " +
      "and a few others).",
    examples: "Example: a $1,000 price with 10% GST added owes $100.00 in GST, for a $1,100.00 GST-inclusive total.",
    assumptions:
      "This calculator uses the current 10% GST rate (unchanged since introduction), confirmed via ato.gov.au. " +
      "It doesn't check whether specific goods/services are GST-free or input-taxed — always confirm your " +
      "specific supply's GST treatment separately if you're unsure.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "Is GST the same everywhere in Australia?",
        answer:
          "Yes — unlike some countries, Australia's GST is a single flat national rate with no state or " +
          "territory variation, though revenue is distributed to the states under a separate formula.",
      },
      {
        question: "What items are GST-free?",
        answer:
          "Most basic food, many health and medical services, education courses, and a handful of other " +
          "specific categories the ATO lists — everything else is generally taxable at the standard 10% unless " +
          "specifically exempted or input-taxed (like most financial services and residential rent).",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 4. Australia Capital Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-capital-gains-tax-calculator",
    title: "Australia Capital Gains Tax Calculator",
    description:
      "Calculate tax on a capital gain, with the 50% CGT discount for assets held over 12 months, added to " +
      "your taxable income.",
    metaTitle: "Australia Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free Australia capital gains tax calculator. Enter your income and gain to see tax including the 50% " +
      "CGT discount.",
    calcInputs: [
      audField("otherTaxableIncome", "Other Taxable Income (Before This Gain)", { unit: "AUD/year", max: 250000 }),
      audField("gainAmount", "Capital Gain", { unit: "AUD", max: 500000 }),
      yesNoField("heldOverTwelveMonths", "Held the Asset for 12+ Months?", 1),
    ],
    calcResult: { label: "Total Tax on Gain", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("discountedGain", "Taxable Gain (After Any Discount)"),
      audResult("incomeTaxOnGain", "Income Tax on Gain"),
      audResult("medicareLevyOnGain", "Medicare Levy on Gain"),
      audResult("totalTaxOnGain", "Total Tax on Gain", { highlight: true }),
      audResult("netProceeds", "Gain After Tax"),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter your other taxable income, the size of your gain, and whether you held the asset for 12 months " +
      "or more. Australia has no separate capital gains tax regime — a gain is simply added to your assessable " +
      "income and taxed at your regular marginal rate, plus the Medicare Levy.\n\n" +
      "The one special rule: individuals who held the asset for at least 12 months get a 50% CGT discount — " +
      "only HALF the gain is actually taxable. Hold for under 12 months and the full gain counts.",
    examples:
      "Example: $90,000 of other income with a $40,000 gain held over 12 months has $20,000.00 (50%) taxable, " +
      "owing $6,000.00 income tax and $400.00 Medicare Levy — $6,400.00 total, a 16.00% effective rate on the " +
      "full gain.",
    assumptions:
      "This calculator uses FY2026-27 income tax brackets and the standard 2% Medicare Levy, plus the " +
      "confirmed 50% CGT discount for assets held 12+ months. It doesn't model the Low Income Tax Offset " +
      "interaction in detail beyond the standard formula, small business CGT concessions, or the main residence " +
      "exemption (which generally makes gains on your own home tax-free).\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "Does selling my home count?",
        answer:
          "Usually not — the main residence exemption generally makes a gain on the home you actually live in " +
          "completely tax-free (with some conditions around the 6-year absence rule and partial use for " +
          "business). This calculator is for gains where no such exemption applies.",
      },
      {
        question: "Why does holding period matter so much?",
        answer:
          "The 50% CGT discount, introduced to encourage long-term investment, effectively halves the taxable " +
          "portion of a gain once you've held the asset for at least 12 months — a significant incentive not " +
          "to sell just short of the anniversary if you can reasonably wait.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 5. Australia Superannuation Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-superannuation-tax-calculator",
    title: "Australia Superannuation Tax Calculator",
    description:
      "Calculate the 15% contributions tax on your super contributions, plus the extra Division 293 tax for " +
      "high income earners.",
    metaTitle: "Australia Superannuation Tax Calculator — Free & Instant",
    metaDescription:
      "Free Australia superannuation tax calculator. Enter your income and contributions to see your 15% " +
      "contributions tax and any Division 293 tax.",
    calcInputs: [
      audField("taxableIncome", "Taxable Income (Before Super)", { unit: "AUD/year", max: 400000 }),
      audField("concessionalContributions", "Concessional (Before-Tax) Super Contributions", { unit: "AUD/year", max: 30000 }),
    ],
    calcResult: { label: "Total Super Tax", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("standardContributionsTax", "Standard Contributions Tax (15%)"),
      audResult("division293Tax", "Division 293 Tax (Extra 15%)"),
      audResult("totalSuperTax", "Total Super Tax", { highlight: true }),
      audResult("netContributionAfterTax", "Net Contribution After Tax"),
    ],
    instructions:
      "Enter your taxable income (before super) and your concessional (before-tax) super contributions for " +
      "the year — employer Superannuation Guarantee payments plus any salary-sacrificed amounts. Your super " +
      "fund charges a standard 15% contributions tax on these.\n\n" +
      "If your combined income plus concessional contributions exceeds $250,000, an EXTRA 15% Division 293 tax " +
      "applies on top — on the lesser of your contributions or the amount you're over the threshold — bringing " +
      "your effective rate on that portion to 30%.",
    examples:
      "Example: $260,000 of taxable income with $20,000 of concessional contributions owes $3,000.00 standard " +
      "contributions tax plus $3,000.00 Division 293 tax (the full $20,000 falls above the $250,000 combined " +
      "threshold) — $6,000.00 total, leaving $14,000.00 net in your super fund.",
    assumptions:
      "This calculator uses the confirmed 15% standard contributions tax rate and the $250,000 (unindexed) " +
      "Division 293 threshold and 15% extra rate, both from ato.gov.au. It doesn't check the $30,000/year " +
      "concessional contributions cap itself (contributions above the cap face different, additional tax " +
      "consequences not modeled here) or non-concessional (after-tax) contributions, which aren't taxed on the " +
      "way in at all.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between concessional and non-concessional contributions?",
        answer:
          "Concessional contributions are made BEFORE tax (employer Super Guarantee, salary sacrifice, or a " +
          "personal contribution you claim as a tax deduction) and are taxed at 15% (or more, under Division " +
          "293) going into your fund. Non-concessional contributions are made from money you've already paid " +
          "income tax on, and aren't taxed again going in — this calculator covers concessional contributions " +
          "only.",
      },
      {
        question: "Is Division 293 tax the same as the contributions tax?",
        answer:
          "No — it's an ADDITIONAL 15% on top of the standard 15% contributions tax, applying only to " +
          "high-income earners above the $250,000 combined threshold, effectively bringing their marginal " +
          "super tax rate to 30% instead of 15% on the affected portion.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 6. Australia PAYG Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-payg-calculator",
    title: "Australia PAYG Calculator",
    description: "Estimate the PAYG withholding taken from a single pay period, from your annual salary.",
    metaTitle: "Australia PAYG Calculator — Free & Instant",
    metaDescription:
      "Free Australia PAYG calculator. Enter your annual salary and pay frequency to estimate PAYG withholding " +
      "and net pay per period.",
    calcInputs: [
      audField("annualSalary", "Annual Salary", { unit: "AUD/year", max: 300000, step: 1000 }),
      {
        key: "payFrequency",
        label: "Pay Frequency",
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
    calcResult: { label: "PAYG Withholding Per Period", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("annualIncomeTax", "Estimated Annual Income Tax"),
      audResult("annualMedicareLevy", "Estimated Annual Medicare Levy"),
      audResult("totalAnnualWithholding", "Total Annual Withholding"),
      audResult("paygPerPeriod", "PAYG Withholding Per Period", { highlight: true }),
      audResult("netPayPerPeriod", "Estimated Net Pay Per Period"),
    ],
    instructions:
      "Enter your annual salary and how often you're paid. This calculator estimates your annual income tax " +
      "(after the Low Income Tax Offset) and Medicare Levy, then divides the total evenly across your pay " +
      "periods to show roughly how much PAYG (Pay As You Go) withholding comes out of each payment, and what's " +
      "left as net pay.",
    examples:
      "Example: a $90,000 salary paid fortnightly has an estimated $17,520.00 annual income tax and $1,800.00 " +
      "Medicare Levy — $19,320.00 total — withholding about $743.08 per fortnightly pay, leaving roughly " +
      "$2,718.46 net.",
    assumptions:
      "This calculator smooths your ANNUAL estimated tax evenly across every pay period — actual ATO PAYG " +
      "withholding tables can differ slightly period to period due to rounding and specific withholding " +
      "schedules, and don't account for the tax-free threshold being claimed at only one employer if you have " +
      "more than one job. It uses FY2026-27 income tax brackets, the Low Income Tax Offset, and the standard " +
      "Medicare Levy.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "Why might this differ from what my employer actually withholds?",
        answer:
          "Your employer uses the ATO's official PAYG withholding schedules, which are tuned per pay period " +
          "(not just your annual figure divided evenly) and account for things like whether you've claimed the " +
          "tax-free threshold on your TFN declaration. This calculator gives a close annual-average estimate, " +
          "not the exact per-period ATO schedule figure.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 7. Australia Payroll Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-payroll-tax-calculator",
    title: "Australia Payroll Tax Calculator",
    description:
      "Estimate state payroll tax on your total wages bill, using New South Wales's rate and threshold as a " +
      "representative example.",
    metaTitle: "Australia Payroll Tax Calculator — Free & Instant",
    metaDescription:
      "Free Australia payroll tax calculator. Enter your annual taxable wages to estimate payroll tax using " +
      "NSW's current rate and threshold.",
    calcInputs: [audField("annualTaxableWages", "Annual Taxable Wages", { unit: "AUD/year", max: 5000000, step: 10000 })],
    calcResult: { label: "Payroll Tax", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("wagesOverThreshold", "Wages Over the Threshold"),
      audResult("payrollTax", "Payroll Tax", { highlight: true }),
    ],
    instructions:
      "Enter your business's total annual taxable wages (salaries, wages, and certain other payments to " +
      "employees and some contractors). Payroll tax is a STATE tax with no single national rate — this " +
      "calculator uses New South Wales's current rate and threshold as a representative example: 5.45% on " +
      "wages above a $1,200,000 annual threshold.\n\n" +
      "If your business operates in a different state or territory, check that jurisdiction's own current rate " +
      "and threshold — every state sets its own independently.",
    examples: "Example: $1,500,000 of annual taxable wages has $300,000.00 over the NSW threshold, owing $16,350.00 in payroll tax.",
    assumptions:
      "This calculator uses New South Wales's confirmed FY2026-27 payroll tax rate (5.45%) and threshold " +
      "($1,200,000), sourced from revenue.nsw.gov.au, as a REPRESENTATIVE EXAMPLE ONLY. Every Australian state " +
      "and territory sets its own payroll tax rate and threshold independently — Victoria, Queensland, Western " +
      "Australia, South Australia, Tasmania, the ACT, and the Northern Territory all differ from NSW's figures " +
      "and from each other. Businesses with payrolls across multiple states also face grouping rules that can " +
      "reduce the effective threshold — not modeled here.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "Does this apply in my state?",
        answer:
          "Only if you're in New South Wales — it's used here as a representative example of how a threshold-" +
          "based payroll tax works. Every other state and territory sets its own rate and threshold; check your " +
          "own state revenue office (e.g., State Revenue Office Victoria, Queensland Revenue Office) for the " +
          "figures that actually apply to your business.",
      },
      {
        question: "What if I employ people across multiple states?",
        answer:
          "Grouping and apportionment rules generally require you to combine wages across related entities and " +
          "states when working out how much of each state's threshold you can use — a real complexity this " +
          "simple calculator doesn't model. Consult a tax professional if this applies to you.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 8. Australia Dividend Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-dividend-tax-calculator",
    title: "Australia Dividend Tax Calculator",
    description: "Calculate tax on a franked dividend using Australia's dividend imputation (franking credit) system.",
    metaTitle: "Australia Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free Australia dividend tax calculator. Enter your income and franked dividend to see tax after " +
      "franking credits.",
    calcInputs: [
      audField("otherTaxableIncome", "Other Taxable Income (Before This Dividend)", { unit: "AUD/year", max: 250000 }),
      audField("frankedDividend", "Franked Dividend Received", { unit: "AUD/year", max: 100000 }),
      {
        key: "frankingPercentage",
        label: "Franking Percentage",
        type: "percentage",
        unit: "%",
        required: true,
        default: 100,
        min: 0,
        max: 100,
        step: 5,
      },
    ],
    calcResult: { label: "Net Tax Payable on Dividend", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("grossedUpDividend", "Grossed-Up Dividend (Including Franking Credit)"),
      audResult("frankingCredit", "Franking Credit"),
      audResult("taxOnDividend", "Tax on Grossed-Up Dividend"),
      audResult("netTaxPayable", "Net Tax Payable (If Your Rate Is Above 30%)", { highlight: true }),
      audResult("refundableCredit", "Refundable Credit (If Your Rate Is Below 30%)"),
    ],
    instructions:
      "Enter your other taxable income, the franked dividend amount you actually received (in cash), and the " +
      "franking percentage (100% for a fully franked dividend — check your dividend statement). Australia's " +
      "imputation system grosses your dividend back up to include the company tax (30%) already paid on it, " +
      "taxes the grossed-up amount at your marginal rate, then credits back the company tax already paid as a " +
      "franking credit.\n\n" +
      "If your marginal rate is above the 30% company rate, you owe the difference. If it's below 30% (common " +
      "for lower-income earners or retirees), the excess franking credit is REFUNDABLE — you can get cash back " +
      "even beyond what you'd otherwise owe.",
    examples:
      "Example: $150,000 of other income (a 37% marginal bracket) receiving a $7,000 fully franked dividend " +
      "grosses up to $10,000.00 (including a $3,000.00 franking credit), taxed at $3,700.00 — minus the " +
      "$3,000.00 credit — for $700.00 net tax payable, since 37% is above the 30% company rate already paid.",
    assumptions:
      "This calculator uses the 30% company tax rate for grossing up franking credits (the standard rate — " +
      "some smaller \"base rate entity\" companies pay 25% instead, which would change the franking credit " +
      "slightly if that's your dividend's source) and FY2026-27 income tax brackets/Medicare Levy for the " +
      "marginal rate. It doesn't include the Medicare Levy on the dividend itself for simplicity, and assumes " +
      "the dividend is genuinely franked at the percentage you enter.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "What if my marginal rate is below 30%?",
        answer:
          "Then this calculator would show a refundable credit instead of tax payable — the franking credit " +
          "exceeds the tax actually due on the grossed-up dividend at your lower rate, and the ATO refunds you " +
          "the difference in cash, a distinctive feature of Australia's full imputation system.",
      },
      {
        question: "What does \"franking percentage\" mean?",
        answer:
          "How much of the dividend has had company tax already paid on it and passed through as a credit — " +
          "100% (\"fully franked\") is most common for larger companies; some pay partly franked dividends " +
          "(say 50%), where only that portion carries a franking credit and the rest is treated as an " +
          "unfranked, ordinary dividend.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 9. Australia Rental Income Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-rental-income-tax-calculator",
    title: "Australia Rental Income Tax Calculator",
    description:
      "Calculate the tax impact of your rental property — profit or loss (\"negative gearing\") — stacked on " +
      "your other income.",
    metaTitle: "Australia Rental Income Tax Calculator — Free & Instant",
    metaDescription:
      "Free Australia rental income tax calculator. Enter your rental income and expenses to see the tax " +
      "impact, including negative gearing.",
    calcInputs: [
      audField("annualRentalIncome", "Annual Rental Income", { unit: "AUD/year", max: 150000 }),
      audField("allowableExpenses", "Allowable Expenses (Incl. Mortgage Interest)", { unit: "AUD/year", max: 150000 }),
      audField("otherTaxableIncome", "Other Taxable Income", { unit: "AUD/year", max: 250000 }),
    ],
    calcResult: { label: "Tax Impact", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("rentalResult", "Rental Result (Profit or Loss)"),
      audResult("taxImpact", "Tax Impact (Negative = Saving)", { highlight: true }),
      { key: "isNegativelyGeared", label: "Negatively Geared?", format: "number" },
    ],
    instructions:
      "Enter your annual rental income, your allowable expenses (including mortgage interest, which — unlike " +
      "the UK — IS fully deductible in Australia with no restriction), and your other taxable income. A rental " +
      "PROFIT is added to your other income and taxed at your marginal rate; a rental LOSS (\"negative " +
      "gearing,\" when expenses exceed rental income) is deducted from your other income, reducing your overall " +
      "tax bill.\n\n" +
      "This calculator shows the tax IMPACT either way — a positive number is extra tax from a rental profit, " +
      "a negative number is a tax saving from a deductible loss.",
    examples:
      "Example: $20,000 rental income with $28,000 of allowable expenses (against $100,000 other income) " +
      "produces an $8,000.00 loss — reducing your tax bill by $2,400.00 compared to having no rental property " +
      "at all.",
    assumptions:
      "This calculator uses FY2026-27 income tax brackets and the standard Medicare Levy. It doesn't model " +
      "Capital Works deductions (building depreciation) or the Capital Gains Tax consequences of eventually " +
      "selling a negatively geared property (a loss claimed now can effectively increase the taxable gain " +
      "later) — see the Capital Gains Tax Calculator separately for that side of the picture.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "What is negative gearing?",
        answer:
          "The situation where your rental property's expenses (mortgage interest, rates, repairs, etc.) " +
          "exceed its rental income, creating a loss — Australia allows this loss to be deducted against your " +
          "OTHER income (salary, etc.), reducing your overall tax bill, a well-known feature of the Australian " +
          "property tax system.",
      },
      {
        question: "Can I deduct my full mortgage payment?",
        answer:
          "Only the INTEREST portion, not the principal repayment (which is building equity, not an expense) — " +
          "enter just the interest portion of your mortgage payments in \"Allowable Expenses,\" along with your " +
          "other genuine costs like rates, insurance, agent fees, and repairs.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 10. Australia Self Employment Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-self-employment-tax-calculator",
    title: "Australia Self Employment Tax Calculator",
    description:
      "Calculate income tax and Medicare Levy on your self-employment profit — Australia has no separate " +
      "self-employment tax.",
    metaTitle: "Australia Self Employment Tax Calculator — Free & Instant",
    metaDescription:
      "Free Australia self-employment tax calculator. Enter your net profit to see your income tax and " +
      "Medicare Levy.",
    calcInputs: [audField("netProfit", "Net Profit (After Business Expenses)", { unit: "AUD/year", max: 300000 })],
    calcResult: { label: "Total Tax", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("incomeTax", "Income Tax"),
      audResult("medicareLevyAmount", "Medicare Levy"),
      audResult("totalTax", "Total Tax", { highlight: true }),
      audResult("netProfitAfterTax", "Net Profit After Tax"),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter your net self-employment/sole trader profit for the year — your total income after deducting " +
      "allowable business expenses. Unlike the US (FICA/SECA) or Canada (CPP), Australia has NO separate " +
      "self-employment payroll tax — a sole trader simply pays ordinary income tax and the Medicare Levy on " +
      "their business profit, exactly the same brackets an employee's salary would use.\n\n" +
      "Superannuation is voluntary (not compulsory) for the self-employed — many choose to contribute to their " +
      "own super for retirement and the tax deduction, but nothing forces it the way the Superannuation " +
      "Guarantee does for employees. See this tool's FAQ.",
    examples: "Example: $90,000 of net profit owes $17,520.00 income tax and $1,800.00 Medicare Levy — $19,320.00 total, a 21.47% effective rate, leaving $70,680.00 after tax.",
    assumptions:
      "This calculator uses FY2026-27 income tax brackets, the Low Income Tax Offset, and the standard Medicare " +
      "Levy. It doesn't include GST (a separate consumption tax on your sales, once registered — see the " +
      "Australia GST Calculator) or voluntary superannuation contributions, which would reduce taxable profit " +
      "if made and claimed as a deduction.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "Why is there no separate self-employment tax like in the US?",
        answer:
          "Australia funds Medicare through general income tax and the Medicare Levy rather than a dedicated " +
          "payroll tax like US Social Security/Medicare (FICA) — and unlike CPP or National Insurance, " +
          "superannuation contributions aren't compulsory for the self-employed, so there's no equivalent " +
          "mandatory \"self-employment tax\" charge at all beyond ordinary income tax.",
      },
      {
        question: "Should I still pay myself superannuation?",
        answer:
          "Many self-employed Australians choose to, voluntarily — personal super contributions can be claimed " +
          "as a tax deduction (subject to the concessional cap) and build retirement savings you'd otherwise " +
          "miss out on without an employer's compulsory Super Guarantee payments.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 11. Australia Contractor Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-contractor-tax-calculator",
    title: "Australia Contractor Tax Calculator",
    description:
      "Calculate income tax and Medicare Levy on your contracting income, with a Personal Services Income " +
      "(PSI) flag.",
    metaTitle: "Australia Contractor Tax Calculator — Free & Instant",
    metaDescription:
      "Free Australia contractor tax calculator. Enter your net contracting income to see tax and a " +
      "suggested withholding rate, with PSI rules noted.",
    calcInputs: [
      audField("netContractingIncome", "Net Contracting Income", { unit: "AUD/year", max: 300000 }),
      yesNoField("psiRulesApply", "Do the PSI (Personal Services Income) Rules Apply to You?"),
    ],
    calcResult: { label: "Total Tax", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("incomeTax", "Income Tax"),
      audResult("medicareLevyAmount", "Medicare Levy"),
      audResult("totalTax", "Total Tax", { highlight: true }),
      audResult("netIncomeAfterTax", "Net Income After Tax"),
      percentResult("suggestedWithholdingRate", "Suggested Set-Aside Rate Per Invoice"),
    ],
    instructions:
      "Enter your net contracting income for the year and whether the ATO's Personal Services Income (PSI) " +
      "rules apply to you. This calculator computes your income tax and Medicare Levy the same way regardless " +
      "— PSI mainly restricts WHICH DEDUCTIONS you can claim (closer to an employee's limited deductions) " +
      "rather than changing the tax rate itself, so make sure \"Net Contracting Income\" already reflects " +
      "PSI-compliant deductions if the rules apply to you.\n\n" +
      "The suggested set-aside rate shows roughly what percentage of each invoice to hold back for tax.",
    examples: "Example: $120,000 of net contracting income owes $26,520.00 income tax and $2,400.00 Medicare Levy — $28,920.00 total, suggesting you set aside about 24.10% of each invoice.",
    assumptions:
      "This calculator uses FY2026-27 income tax brackets, the Low Income Tax Offset, and the standard Medicare " +
      "Levy — the same underlying tax calculation as the Self Employment Tax Calculator, since PSI doesn't " +
      "change the RATE structure, only which expenses can reduce your income before you get to this figure. It " +
      "doesn't determine whether the PSI rules actually apply to your situation (the ATO's \"results test\" and " +
      "other tests decide that) or model GST.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "What are the PSI rules, in plain terms?",
        answer:
          "A set of ATO tests that determine whether income you earn mainly from your own personal skills or " +
          "effort (rather than from a genuine business with its own assets, employees, or multiple clients) " +
          "gets taxed more like an employee's — limiting deductions to roughly what an employee could claim, " +
          "and sometimes requiring the income to be attributed directly to you rather than split with a " +
          "company or associate.",
      },
      {
        question: "How do I know if PSI applies to me?",
        answer:
          "The ATO's \"results test\" and several supporting tests look at things like whether you're paid for " +
          "a specific result vs. hours worked, whether you supply your own tools/equipment, and whether you " +
          "work for multiple unrelated clients — check ato.gov.au's PSI guidance or ask a tax agent if you're " +
          "not sure.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 12. Australia Fringe Benefits Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-fringe-benefits-tax-calculator",
    title: "Australia Fringe Benefits Tax Calculator",
    description: "Calculate FBT payable on a benefit's taxable value, using the correct Type 1 or Type 2 gross-up rate.",
    metaTitle: "Australia Fringe Benefits Tax Calculator — Free & Instant",
    metaDescription:
      "Free Australia FBT calculator. Enter a benefit's taxable value and type to see the grossed-up value " +
      "and FBT payable.",
    calcInputs: [
      audField("taxableValueOfBenefit", "Taxable Value of the Benefit", { unit: "AUD", max: 100000 }),
      {
        key: "benefitType",
        label: "Gross-Up Type",
        type: "dropdown",
        required: true,
        default: 1,
        options: [
          { label: "Type 1 (GST Credits Claimable)", value: 1 },
          { label: "Type 2 (No GST Credits Claimable)", value: 2 },
        ],
      },
    ],
    calcResult: { label: "FBT Payable", format: "currency", currency: "AUD" },
    calcResults: [
      { key: "grossUpRateUsed", label: "Gross-Up Rate Used", format: "number" },
      audResult("grossedUpValue", "Grossed-Up Taxable Value"),
      audResult("fbtPayable", "FBT Payable", { highlight: true }),
    ],
    instructions:
      "Enter the benefit's taxable value (as worked out under the specific FBT valuation rule for that type of " +
      "benefit — a car, entertainment, a loan, etc.) and whether you (the employer) could claim GST credits on " +
      "it. Fringe Benefits Tax grosses the taxable value up first (to represent the pre-tax salary an employee " +
      "would need to buy the same benefit themselves), then applies a flat 47% rate.\n\n" +
      "Type 1 benefits (where GST credits CAN be claimed) use the higher gross-up rate; Type 2 benefits (where " +
      "they can't, e.g. GST-free or input-taxed benefits) use the lower one.",
    examples: "Example: a $5,000 Type 1 benefit grosses up to $10,401.00, owing $4,888.47 in FBT — paid by the EMPLOYER, not the employee.",
    assumptions:
      "This calculator uses the confirmed FBT rate (47%) and gross-up rates (Type 1: 2.0802, Type 2: 1.8868), " +
      "unchanged across FBT years ending 31 March 2023 through 2027, sourced from ato.gov.au. It doesn't " +
      "calculate the taxable value itself (that depends entirely on the specific benefit type's own valuation " +
      "method — statutory formula or operating cost for cars, for example) — you supply that figure directly.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "Who pays FBT — the employer or the employee?",
        answer:
          "The EMPLOYER pays FBT directly to the ATO — it's not deducted from the employee's pay or reported " +
          "on their individual tax return (though a \"reportable fringe benefits amount\" above a threshold " +
          "does show on the employee's income statement and can affect some other income tests, like the " +
          "Medicare Levy Surcharge).",
      },
      {
        question: "Why does the FBT year run April to March?",
        answer:
          "It predates and is independent of the standard July–June income tax year — a long-standing quirk of " +
          "the FBT system rather than any recent change.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 13. Australia HELP Repayment Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-help-repayment-calculator",
    title: "Australia HELP Repayment Calculator",
    description: "Calculate your compulsory HELP loan repayment using the 2026-27 marginal repayment method.",
    metaTitle: "Australia HELP Repayment Calculator — Free & Instant",
    metaDescription:
      "Free Australia HELP repayment calculator. Enter your repayment income to see your 2026-27 compulsory " +
      "HELP repayment.",
    calcInputs: [audField("repaymentIncome", "Repayment Income", { unit: "AUD/year", max: 300000 })],
    calcResult: { label: "Compulsory Repayment", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("compulsoryRepayment", "Compulsory Repayment", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter your repayment income (broadly, your taxable income plus certain add-backs like reportable fringe " +
      "benefits and net investment losses — your taxable income is a close approximation for most people). " +
      "Since 1 July 2025, HELP repayments use a MARGINAL method: no repayment below $69,528, then an increasing " +
      "rate charged only on the SLICE of income above each threshold — not a flat percentage of your entire " +
      "income the way the old system worked.",
    examples: "Example: $100,000 of repayment income falls in the second tier, owing 15c for every dollar over $69,528 — a $4,570.80 compulsory repayment, a 4.57% effective rate.",
    assumptions:
      "This calculator uses the confirmed 2026-27 marginal HELP repayment thresholds and rates from ato.gov.au: " +
      "nil to $69,528; 15% of the slice from $69,529–$129,717; $9,028 plus 17% of the slice from " +
      "$129,718–$186,050; 10% of total repayment income above $186,051. It applies identically to every study " +
      "and training support loan type (HELP, HECS-HELP, VSL, SSL, and others), which all share one threshold " +
      "table.\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "What changed about HELP repayments recently?",
        answer:
          "From 1 July 2025, the government moved from a system where crossing a threshold meant a flat " +
          "percentage applied to your ENTIRE income, to a marginal system where the higher rate only applies to " +
          "the income ABOVE each threshold — removing the old \"cliff\" effect where a small pay rise could " +
          "increase your repayment by more than the raise itself.",
      },
      {
        question: "Is HECS-HELP calculated differently from HELP?",
        answer:
          "No — HECS-HELP (for Commonwealth-supported university places) and every other HELP loan type " +
          "(FEE-HELP, VET Student Loans, and others) all share the exact same repayment income thresholds and " +
          "rates each year, confirmed via ato.gov.au. See the HECS Repayment Calculator on this site for a " +
          "version that also tracks your outstanding loan balance and annual indexation.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 14. Australia HECS Repayment Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-hecs-repayment-calculator",
    title: "Australia HECS Repayment Calculator",
    description:
      "Calculate this year's compulsory HECS-HELP repayment AND track your outstanding loan balance after " +
      "indexation.",
    metaTitle: "Australia HECS Repayment Calculator — Free & Instant",
    metaDescription:
      "Free Australia HECS repayment calculator. Enter your income and loan balance to see this year's " +
      "repayment and your new balance after indexation.",
    calcInputs: [
      audField("repaymentIncome", "Repayment Income", { unit: "AUD/year", max: 300000 }),
      audField("currentLoanBalance", "Current HECS-HELP Loan Balance", { unit: "AUD", max: 150000, step: 500 }),
      {
        key: "indexationRate",
        label: "Expected Indexation Rate",
        type: "percentage",
        unit: "%",
        required: true,
        default: 3,
        min: 0,
        max: 10,
        step: 0.1,
      },
    ],
    calcResult: { label: "New Loan Balance", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("compulsoryRepayment", "This Year's Compulsory Repayment"),
      audResult("indexationAmount", "Indexation Added to Your Balance"),
      audResult("newLoanBalance", "New Loan Balance", { highlight: true }),
    ],
    instructions:
      "Enter your repayment income, your current outstanding HECS-HELP balance, and the indexation rate you " +
      "expect this year (check the ATO's published rate once confirmed, usually announced mid-year). This " +
      "calculator shows both your compulsory repayment for the year (same marginal method as the HELP " +
      "Repayment Calculator) AND how your loan balance actually changes once indexation is added and this " +
      "year's repayment is subtracted.\n\n" +
      "Since June 2023, indexation is applied BEFORE your compulsory repayment is deducted for the year — this " +
      "calculator follows that order.",
    examples:
      "Example: $100,000 of repayment income with a $30,000 balance and 3% expected indexation owes " +
      "$4,570.80 in compulsory repayment, while $900.00 of indexation is added first — a $26,329.20 new " +
      "balance overall (down from $30,000, since the repayment outpaces indexation here).",
    assumptions:
      "This calculator uses the confirmed 2026-27 marginal HELP repayment thresholds and rates for the " +
      "compulsory repayment portion. The indexation rate is NOT built in as a fixed figure — you enter your own " +
      "estimate, since the ATO's actual rate for a given year is announced separately and changes annually " +
      "(it was notably high in 2023 before a 2024 law capped future indexation to the lower of CPI or the Wage " +
      "Price Index — check the ATO's current confirmed rate rather than relying on a guess for anything " +
      "beyond rough planning).\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "Why do I have to enter my own indexation rate?",
        answer:
          "Because it's set annually by the ATO based on inflation (capped since a 2024 law change to the " +
          "lower of CPI or the Wage Price Index) and isn't known in advance for a future year — enter the " +
          "ATO's most recently confirmed rate, or your own estimate, for planning purposes.",
      },
      {
        question: "Does indexation apply before or after my repayment?",
        answer:
          "Since the 1 June 2023 indexation date, indexation is applied to your balance FIRST, and your " +
          "compulsory repayment for the year is deducted afterward — this calculator follows that same order, " +
          "which matters slightly for the exact dollar figures involved.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 15. Australia Working Holiday Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "australia-working-holiday-tax-calculator",
    title: "Australia Working Holiday Tax Calculator",
    description: "Calculate tax for a Working Holiday Maker — a flat 15% with no tax-free threshold, up to $45,000.",
    metaTitle: "Australia Working Holiday Tax Calculator — Free & Instant",
    metaDescription:
      "Free Australia Working Holiday Maker tax calculator. Enter your income to see tax at the special 15% " +
      "WHM rate.",
    calcInputs: [audField("annualIncome", "Annual Income (417/462 Visa)", { unit: "AUD/year", max: 200000 })],
    calcResult: { label: "Total Tax", format: "currency", currency: "AUD" },
    calcResults: [
      audResult("taxOnFlatPortion", "Tax on First $45,000 (15%)"),
      audResult("taxAboveThreshold", "Tax Above $45,000 (Ordinary Rates)"),
      audResult("totalTax", "Total Tax", { highlight: true }),
      audResult("netIncome", "Net Income"),
    ],
    instructions:
      "Enter your annual income while on a 417 or 462 Working Holiday visa. Working Holiday Makers are taxed " +
      "differently from residents and other foreign workers: there's NO tax-free threshold at all — every " +
      "dollar up to $45,000 is taxed at a flat 15%. Above $45,000, ordinary marginal rates apply (30%, 37%, " +
      "45%) to the income above that point.",
    examples: "Example: $60,000 of WHM income owes $6,750.00 on the first $45,000 (15%) plus $4,500.00 on the remaining $15,000 (30%) — $11,250.00 total, leaving $48,750.00 net.",
    assumptions:
      "This calculator uses the confirmed Working Holiday Maker tax rates from ato.gov.au: a flat 15% up to " +
      "$45,000 (this threshold is a fixed statutory figure, unindexed since it was introduced), then ordinary " +
      "marginal rates above. It doesn't include the Medicare Levy (WHM visa holders are generally exempt, since " +
      "they're not eligible for Medicare) or superannuation (compulsory Super Guarantee contributions still " +
      "apply and can usually be claimed back as a Departing Australia Superannuation Payment, taxed separately, " +
      "when leaving).\n\n" +
      AU_DISCLAIMER,
    faq: [
      {
        question: "Why is there no tax-free threshold for working holiday makers?",
        answer:
          "A 2016-17 law change specifically removed the ordinary resident tax-free threshold for 417/462 visa " +
          "holders, introducing the flat 15% starting rate instead — a deliberate policy difference from how " +
          "residents and other visa categories are taxed, upheld by the courts after some early legal " +
          "challenges.",
      },
      {
        question: "Do I still get superannuation?",
        answer:
          "Yes — employers must still pay the compulsory 12% Superannuation Guarantee on top of your wages, " +
          "the same as for any other employee. When you permanently leave Australia, you can generally claim " +
          "this back as a Departing Australia Superannuation Payment (DASP), though it's taxed at its own " +
          "separate (fairly high) rate on the way out.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:create-australia-tax-tool" first, ` +
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
