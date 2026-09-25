// One-time (but safe to re-run) batch setup script: creates 15 more Tools
// under the EXISTING "UK Tax & Salary Calculators" category (slug
// "uk-tax-salary-calculators", created by create-uk-income-tax-tool.ts —
// this script does NOT create the category; it fails loudly if it's
// missing instead of silently creating a duplicate).
//
// See src/lib/calc-engine-uk-tax-paycheck-calculators.ts for the actual
// math and which of its exported functions each of these 15 slugs maps
// to, and that file's header for the GOV.UK source of every 2026/27
// figure used.
//
// HOW TO RUN
//   npx tsx prisma/create-uk-extended-calculators.ts
// or
//   npm run db:create-uk-extended-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it, same as every other
// calculator on this site.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "uk-tax-salary-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

// ---------------------------------------------------------------------------
// Shared field building blocks — GBP throughout, matching
// create-uk-income-tax-tool.ts's convention (currency + `currency: "GBP"`
// on every result line).
// ---------------------------------------------------------------------------

function gbpField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit ?? "GBP",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 500000,
    step: opts.step ?? 500,
  };
}

function gbpResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", currency: "GBP", unit: opts.unit, highlight: opts.highlight };
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

const otherIncomeField = gbpField("otherIncome", "Other Taxable Income (Before This Amount)", {
  unit: "GBP/year",
  max: 300000,
});
const annualSalaryField = gbpField("annualSalary", "Annual Salary", { unit: "GBP/year", max: 300000, step: 1000 });

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
  calcResult: { label: string; unit?: string; format: string; currency?: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const UK_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified accountant or HMRC.";

const TOOLS: ToolDef[] = [
  // -------------------------------------------------------------------
  // 1. UK National Insurance Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-national-insurance-calculator",
    title: "UK National Insurance Calculator",
    description: "Calculate your Class 1 employee National Insurance from your annual salary, on its own.",
    metaTitle: "UK National Insurance Calculator — Free & Instant",
    metaDescription:
      "Free UK National Insurance calculator. Enter your annual salary to see your Class 1 employee NI " +
      "contributions for 2026/27.",
    calcInputs: [
      annualSalaryField,
      {
        key: "payFrequency",
        label: "Pay Frequency",
        type: "dropdown",
        required: true,
        default: 12,
        options: [
          { label: "Weekly (52 payments/year)", value: 52 },
          { label: "Monthly (12 payments/year)", value: 12 },
          { label: "Annually (1 payment/year)", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Annual National Insurance", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("annualNationalInsurance", "Annual National Insurance", { highlight: true }),
      gbpResult("perPeriodNationalInsurance", "Per Payment"),
      gbpResult("mainRateBand", "Pay Taxed at the 8% Main Rate"),
      gbpResult("upperRateBand", "Pay Taxed at the 2% Upper Rate"),
    ],
    instructions:
      "Enter your annual salary and how often you're paid to see just your National Insurance contribution on " +
      "its own — useful if you already know your Income Tax separately, or just want the NI figure without a " +
      "full payslip breakdown (see the UK Income Tax Calculator for the combined view).\n\n" +
      "Class 1 employee NI is 8% on earnings between the Primary Threshold (£12,570/year) and the Upper " +
      "Earnings Limit (£50,270/year), then 2% above that — the same thresholds and rates apply UK-wide, " +
      "including Scotland, since National Insurance isn't devolved.",
    examples:
      "Example: a £40,000 annual salary owes £2,194.40 in National Insurance for the year, or £182.87 a month " +
      "— all of it at the 8% main rate, since £40,000 doesn't reach the £50,270 Upper Earnings Limit.",
    assumptions:
      "This calculator uses 2026/27 National Insurance thresholds and rates, confirmed via GOV.UK: Primary " +
      "Threshold £12,570/year, Upper Earnings Limit £50,270/year, 8% main rate, 2% above the UEL. It assumes " +
      "one job for the full tax year with no other National Insurance category (Categories other than the " +
      "standard \"A\" aren't modeled).\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Is this the same NI figure as the UK Income Tax Calculator shows?",
        answer:
          "Yes, same calculation — this tool just isolates it on its own, for when you don't need the combined " +
          "Income Tax + NI payslip breakdown that calculator gives you.",
      },
      {
        question: "Does this apply in Scotland too?",
        answer:
          "Yes — National Insurance is set UK-wide by Westminster, not devolved to the Scottish Parliament like " +
          "Income Tax is, so these thresholds and rates are identical whether you're in Scotland or the rest of " +
          "the UK.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 2. UK PAYE Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-paye-calculator",
    title: "UK PAYE Calculator",
    description:
      "Calculate the Income Tax and National Insurance due on a SINGLE payslip, on a Week 1/Month 1 (non-" +
      "cumulative) basis — the way new starters and irregular pay are actually taxed.",
    metaTitle: "UK PAYE Calculator — Free & Instant",
    metaDescription:
      "Free UK PAYE calculator. Enter one payslip's gross pay to see this period's Income Tax, National " +
      "Insurance, and take-home pay on a Week 1/Month 1 basis.",
    calcInputs: [
      gbpField("grossPayThisPeriod", "Gross Pay This Period", { unit: "GBP", max: 50000, step: 100 }),
      {
        key: "payFrequency",
        label: "Pay Frequency",
        type: "dropdown",
        required: true,
        default: 12,
        options: [
          { label: "Weekly", value: 52 },
          { label: "Monthly", value: 12 },
        ],
      },
    ],
    calcResult: { label: "Net Pay This Period", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("incomeTaxThisPeriod", "Income Tax This Period"),
      gbpResult("nationalInsuranceThisPeriod", "National Insurance This Period"),
      gbpResult("totalDeductionsThisPeriod", "Total Deductions"),
      gbpResult("netPayThisPeriod", "Net Pay This Period", { highlight: true }),
    ],
    instructions:
      "Enter what you're actually being paid THIS period (this payslip's gross pay, not your annual salary) " +
      "and how often you're paid. This calculator works out Income Tax and National Insurance the way PAYE " +
      "actually calculates a single payslip on a \"Week 1/Month 1\" basis — giving you 1/12th (or 1/52nd) of " +
      "your annual Personal Allowance and tax bands for THIS period alone, rather than looking at your pay " +
      "for the whole year.\n\n" +
      "This is exactly how a new starter's first payslip (before HMRC has your full tax code history) or " +
      "someone with irregular, non-salaried pay is actually taxed — different from the UK Income Tax " +
      "Calculator, which smooths a known ANNUAL salary evenly across the year instead.",
    examples:
      "Example: £3,000 gross pay this month owes £390.50 in Income Tax and £156.20 in National Insurance this " +
      "period — £546.70 total — leaving £2,453.30 net pay for the month.",
    assumptions:
      "This calculator divides the 2026/27 annual Personal Allowance (£12,570), Income Tax bands, and National " +
      "Insurance thresholds evenly by your pay frequency and applies them to THIS period's pay alone (the " +
      "\"Week 1/Month 1\" or \"non-cumulative\" basis) — it does not account for the Personal Allowance taper " +
      "above £100,000/year, or any tax already paid/refunded earlier in the tax year under a cumulative tax " +
      "code, which is how most ongoing payslips actually work once HMRC has a full year's picture.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Why is this different from the UK Income Tax Calculator?",
        answer:
          "That calculator takes your ANNUAL salary and smooths it evenly across the year (the normal, " +
          "\"cumulative\" way most people are taxed once they've been in a job a while). This tool instead " +
          "takes what you're paid in ONE period and taxes just that period on its own — closer to how a new " +
          "job's first payslip, or genuinely irregular pay, is actually taxed.",
      },
      {
        question: "What does \"Week 1/Month 1 basis\" mean?",
        answer:
          "It's HMRC's term for taxing each pay period in isolation, giving you a fresh slice of your annual " +
          "Personal Allowance and tax bands every period, rather than accumulating them across the tax year. " +
          "It's commonly used for new starters without a P45, or when your tax code has this restriction " +
          "applied for another reason.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 3. UK Employer National Insurance Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-employer-national-insurance-calculator",
    title: "UK Employer National Insurance Calculator",
    description:
      "Calculate the EMPLOYER's own Class 1 (secondary) National Insurance cost of employing someone, on top " +
      "of their salary.",
    metaTitle: "UK Employer National Insurance Calculator — Free & Instant",
    metaDescription:
      "Free UK employer National Insurance calculator. Enter an employee's annual salary to see your employer " +
      "NI cost and total employment cost.",
    calcInputs: [annualSalaryField],
    calcResult: { label: "Employer National Insurance", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("employerNationalInsurance", "Employer National Insurance", { highlight: true }),
      gbpResult("totalEmploymentCost", "Total Annual Employment Cost"),
      gbpResult("thresholdUsed", "Secondary Threshold Used"),
    ],
    instructions:
      "Enter an employee's annual salary to see what YOU, as the employer, pay in Class 1 (secondary) National " +
      "Insurance on top of it — separate from, and in addition to, the employee's own NI that comes out of " +
      "their pay.\n\n" +
      "Employer NI is charged at a flat 15% on salary above the Secondary Threshold (£5,000/year for 2026/27) " +
      "— useful for budgeting the true cost of a new hire or a pay rise, not just the headline salary figure.",
    examples:
      "Example: a £40,000 salary costs an extra £5,250.00 in employer National Insurance, for a total annual " +
      "employment cost of £45,250.00.",
    assumptions:
      "This calculator uses the 2026/27 Secondary Threshold (£5,000/year) and standard 15% employer rate, " +
      "confirmed via GOV.UK's official 2026 to 2027 employer rates and thresholds page. It doesn't model the " +
      "various 0% reliefs available for some employees (apprentices under 25, under-21s, veterans, or roles in " +
      "a Freeport/Investment Zone) — if any of those apply to your employee, your actual employer NI bill will " +
      "be lower than this estimate.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Is this the same as the Employment Allowance?",
        answer:
          "No — the Employment Allowance is a separate relief that lets many small employers reduce their " +
          "TOTAL annual employer NI bill (across all employees) by a fixed amount, currently up to £10,500/year " +
          "for eligible employers. This calculator shows one employee's uncapped employer NI cost; apply the " +
          "Employment Allowance separately against your combined total if you qualify.",
      },
      {
        question: "Why is this different from what comes off my own payslip?",
        answer:
          "Because it's a completely separate charge — employee NI (see the UK National Insurance Calculator) " +
          "comes out of the employee's own pay and is what THEY see deducted; employer NI is an extra cost the " +
          "EMPLOYER pays on top of the salary, never deducted from the employee's pay at all.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 4. UK Dividend Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-dividend-tax-calculator",
    title: "UK Dividend Tax Calculator",
    description:
      "Calculate UK tax on your dividend income after the £500 tax-free Dividend Allowance, at the 2026/27 " +
      "dividend rates.",
    metaTitle: "UK Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free UK dividend tax calculator. Enter your other income and dividend income to see your Dividend " +
      "Allowance and dividend tax for 2026/27.",
    calcInputs: [otherIncomeField, gbpField("dividendIncome", "Dividend Income", { unit: "GBP/year", max: 200000 })],
    calcResult: { label: "Dividend Tax", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("taxFreeAllowanceUsed", "Tax-Free Dividend Allowance Used"),
      gbpResult("taxableDividends", "Taxable Dividends"),
      gbpResult("dividendTax", "Dividend Tax", { highlight: true }),
      gbpResult("netDividends", "Dividends After Tax"),
    ],
    instructions:
      "Enter your other taxable income for the year (salary, self-employment profit, etc. — everything except " +
      "the dividends) and your total dividend income. The first £500 of dividends is tax-free every year (the " +
      "Dividend Allowance); everything above that is taxed at 10.75%, 35.75%, or 39.35% depending on which " +
      "Income Tax band your total income falls into.\n\n" +
      "Your other income is stacked first, then dividends are added on top — so if your other income already " +
      "uses up your basic-rate band, your dividends may span more than one dividend rate.",
    examples:
      "Example: £40,000 of other income with £6,000 of dividends uses the full £500 allowance, leaving " +
      "£5,500.00 taxable — all within the basic-rate band — for £591.25 of dividend tax, leaving £5,408.75 of " +
      "dividends after tax.",
    assumptions:
      "This calculator uses the 2026/27 Dividend Allowance (£500) and dividend tax rates (10.75% basic, " +
      "35.75% higher, 39.35% additional), confirmed via gov.uk/tax-on-dividends — note the basic and higher " +
      "rates rose by 2 percentage points from April 2026. It assumes your other income already uses the " +
      "standard Personal Allowance and rest-of-UK Income Tax bands.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Has the Dividend Allowance always been £500?",
        answer:
          "No — it's been cut sharply over recent years (from £5,000 as recently as 2017/18, down to £1,000 in " +
          "2023/24, then £500 from 2024/25 onward), where it remains frozen for 2026/27.",
      },
      {
        question: "Do I pay this through Self Assessment?",
        answer:
          "Usually yes, if your dividend income is above the £500 allowance — dividend tax isn't deducted at " +
          "source the way employment income is, so you generally need to report it (and pay any tax due) via a " +
          "Self Assessment tax return.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 5. UK Capital Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-capital-gains-tax-calculator",
    title: "UK Capital Gains Tax Calculator",
    description:
      "Calculate UK Capital Gains Tax on a gain after the £3,000 Annual Exempt Amount, at the 2026/27 18%/24% " +
      "rates — now the same for property as any other asset.",
    metaTitle: "UK Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free UK Capital Gains Tax calculator. Enter your other income and gain to see your Annual Exempt " +
      "Amount and CGT for 2026/27.",
    calcInputs: [otherIncomeField, gbpField("gainAmount", "Capital Gain", { unit: "GBP", max: 500000 })],
    calcResult: { label: "Capital Gains Tax", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("exemptAmountUsed", "Annual Exempt Amount Used"),
      gbpResult("taxableGain", "Taxable Gain"),
      gbpResult("capitalGainsTax", "Capital Gains Tax", { highlight: true }),
      gbpResult("netProceeds", "Gain After Tax"),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter your other taxable income for the year and the size of your gain. The first £3,000 of gains is " +
      "tax-free every year (the Annual Exempt Amount); the rest is taxed at 18% within your remaining basic-" +
      "rate band, or 24% once you're into higher-rate territory.\n\n" +
      "Since 30 October 2024, residential property gains are taxed at the SAME 18%/24% rates as any other " +
      "asset — the old higher property-specific rate no longer applies, so this one calculator covers shares, " +
      "property, and other chargeable assets alike.",
    examples:
      "Example: £50,000 of other income with a £20,000 gain uses the full £3,000 exemption, leaving £17,000.00 " +
      "taxable — £270 of it at 18% (the last of the basic-rate band) and the remaining £16,730.00 at 24% — for " +
      "£4,063.80 total Capital Gains Tax, a 20.32% effective rate on the full gain.",
    assumptions:
      "This calculator uses the 2026/27 Annual Exempt Amount (£3,000) and CGT rates (18%/24%, equalised across " +
      "asset types including residential property), confirmed via gov.uk/guidance/capital-gains-tax-rates-" +
      "and-allowances. It doesn't model reliefs like Business Asset Disposal Relief, Private Residence Relief, " +
      "or the £1,500 trustee exemption.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Does selling my main home count?",
        answer:
          "Usually not — selling the home you actually live in is normally fully covered by Private Residence " +
          "Relief and isn't subject to CGT at all. This calculator is for chargeable gains (a second property, " +
          "shares, etc.) where no such relief applies.",
      },
      {
        question: "Why did property CGT rates change?",
        answer:
          "Residential property used to be taxed at a higher rate than other assets (18%/28% vs 10%/20% before " +
          "recent changes). The Autumn Budget 2024 equalised the rates for disposals from 30 October 2024 " +
          "onward, aligning property with the 18%/24% rates this calculator uses.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 6. UK Property Tax Calculator (Council Tax)
  // -------------------------------------------------------------------
  {
    slug: "uk-property-tax-calculator",
    title: "UK Property Tax Calculator",
    description:
      "Calculate your Council Tax — the UK's actual recurring annual property tax — from your local Band D " +
      "charge and your property's Council Tax band.",
    metaTitle: "UK Property Tax Calculator (Council Tax) — Free & Instant",
    metaDescription:
      "Free UK property tax calculator. Enter your local authority's Band D Council Tax charge and your band " +
      "to find your annual Council Tax.",
    calcInputs: [
      gbpField("bandDCharge", "Your Local Authority's Band D Annual Charge", { unit: "GBP/year", max: 5000, step: 10 }),
      {
        key: "councilTaxBand",
        label: "Your Property's Council Tax Band",
        type: "dropdown",
        required: true,
        default: 3,
        options: [
          { label: "Band A", value: 0 },
          { label: "Band B", value: 1 },
          { label: "Band C", value: 2 },
          { label: "Band D", value: 3 },
          { label: "Band E", value: 4 },
          { label: "Band F", value: 5 },
          { label: "Band G", value: 6 },
          { label: "Band H", value: 7 },
        ],
      },
    ],
    calcResult: { label: "Annual Council Tax", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("annualCouncilTax", "Annual Council Tax", { highlight: true }),
      gbpResult("monthlyCouncilTax", "Monthly Equivalent"),
      percentResult("bandMultiplier", "Your Band's Multiplier of Band D"),
    ],
    instructions:
      "The UK doesn't have a US-style property tax based on a percentage of your home's value — the closest " +
      "equivalent is Council Tax, a fixed annual charge set by your local authority and banded by your " +
      "property's estimated value (Bands A to H). Look up your local authority's current Band D charge (on " +
      "your council's website or a recent bill) and your property's band (on GOV.UK or your bill), then enter " +
      "both here.\n\n" +
      "Every band is a fixed fraction of the Band D charge — Band A is 6/9ths of it, all the way up to Band H " +
      "at 18/9ths (double Band D) — so this calculator applies the correct multiplier automatically once you " +
      "pick your band.",
    examples:
      "Example: a local authority with a £2,200/year Band D charge, for a Band D property, owes the full " +
      "£2,200.00 a year — £183.33 a month.",
    assumptions:
      "Council Tax is set entirely locally (over 300 billing authorities in England alone each set their own " +
      "Band D charge, with Scotland and Wales setting theirs separately too), so there's no single UK-wide rate " +
      "— this calculator applies the standard national A–H band multipliers to whatever Band D figure you " +
      "enter for your own council. It doesn't model single-person discounts, exemptions, or local precepts " +
      "(parish/town council top-ups) that can adjust your actual bill.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Where do I find my Band D charge and my own band?",
        answer:
          "Your local authority's website publishes its current Band D charge every April; your property's " +
          "individual band is on GOV.UK's Council Tax band checker (for England and Wales) or the Scottish " +
          "Assessors' website for Scotland, or on a recent Council Tax bill.",
      },
      {
        question: "Why isn't this based on my property's current value, like US property tax?",
        answer:
          "Council Tax bands are still based on property valuations from 1 April 1991 (England and Scotland) " +
          "or 1 April 2003 (Wales) — they haven't been revalued since, so your band reflects your home's " +
          "RELATIVE value at that date, not its current market price.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 7. UK Stamp Duty Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-stamp-duty-calculator",
    title: "UK Stamp Duty Calculator",
    description:
      "Calculate Stamp Duty Land Tax (SDLT) on a residential property purchase in England or Northern Ireland " +
      "— full tiered bands, first-time buyer relief, and the additional-property surcharge.",
    metaTitle: "UK Stamp Duty Calculator (SDLT) — Free & Instant",
    metaDescription:
      "Free UK Stamp Duty (SDLT) calculator for England and Northern Ireland. Full tiered bands, first-time " +
      "buyer relief, and additional-property surcharge.",
    calcInputs: [
      gbpField("propertyPrice", "Property Price", { unit: "GBP", max: 2000000, step: 5000 }),
      yesNoField("isFirstTimeBuyer", "First-Time Buyer?"),
      yesNoField("isAdditionalProperty", "Additional Property (Second Home / Buy-to-Let)?"),
    ],
    calcResult: { label: "Total Stamp Duty", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("baseDuty", "Base Stamp Duty"),
      gbpResult("additionalPropertySurcharge", "Additional-Property Surcharge (5%)"),
      gbpResult("totalStampDuty", "Total Stamp Duty", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter the property price, whether you qualify as a first-time buyer, and whether this is an additional " +
      "property (a second home or buy-to-let, rather than replacing your only/main residence). This calculator " +
      "applies the full tiered SDLT bands rather than a single flat rate — England and Northern Ireland only " +
      "(Scotland has its own Land and Buildings Transaction Tax, and Wales its own Land Transaction Tax, both " +
      "with different bands).\n\n" +
      "First-time buyer relief (0% up to £300,000, then 5% up to £500,000) only applies if the price is " +
      "£500,000 or less — above that, first-time buyers pay the standard rates with no relief at all. The " +
      "additional-property surcharge adds a flat 5% on top of whichever base bands apply.",
    examples:
      "Example: a £350,000 purchase (not a first-time buyer, not an additional property) pays 0% on the first " +
      "£125,000, 2% on the next £125,000 (£2,500.00), and 5% on the remaining £100,000 (£5,000.00) — £7,500.00 " +
      "total, a 2.14% effective rate.",
    assumptions:
      "This calculator uses the current (post-31 March 2025) standard SDLT bands, first-time buyer relief " +
      "thresholds, and the 5% additional-property surcharge (raised from 3% at the Autumn Budget 2024), all " +
      "confirmed via gov.uk/stamp-duty-land-tax/residential-property-rates — England and Northern Ireland only. " +
      "It doesn't model non-resident buyer surcharges, mixed-use/commercial property rates, or Multiple " +
      "Dwellings Relief.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Does this apply in Scotland or Wales?",
        answer:
          "No — Stamp Duty Land Tax only applies in England and Northern Ireland. Scotland charges Land and " +
          "Buildings Transaction Tax (LBTT) and Wales charges Land Transaction Tax (LTT) instead, each with " +
          "their own separate bands and rates.",
      },
      {
        question: "Can the first-time buyer relief and the additional-property surcharge both apply?",
        answer:
          "No — by definition, an additional property (a second home or buy-to-let) isn't a first-time " +
          "buyer's only property, so the two are mutually exclusive. This calculator applies first-time buyer " +
          "relief only when the additional-property option is set to \"No.\"",
      },
      {
        question: "What happened to the higher nil-rate thresholds from the 2022 mini-budget?",
        answer:
          "Those temporary, higher thresholds (0% up to £250,000 standard / £425,000 first-time buyer) were " +
          "always due to expire and reverted on 1 April 2025 back to the lower standard bands this calculator " +
          "uses.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 8. UK Inheritance Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-inheritance-tax-calculator",
    title: "UK Inheritance Tax Calculator",
    description:
      "Estimate UK Inheritance Tax on an estate using the £325,000 nil-rate band, the extra £175,000 " +
      "residence nil-rate band, and the 40% rate above them.",
    metaTitle: "UK Inheritance Tax Calculator — Free & Instant",
    metaDescription:
      "Free UK Inheritance Tax calculator. Enter an estate's value to estimate IHT using the nil-rate band, " +
      "residence nil-rate band, and 40% rate.",
    calcInputs: [
      gbpField("estateValue", "Estate Value", { unit: "GBP", max: 5000000, step: 5000 }),
      yesNoField("passingHomeToDescendants", "Leaving the Home to Children/Grandchildren?", 1),
    ],
    calcResult: { label: "Inheritance Tax", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("totalNilRateBand", "Total Tax-Free Band"),
      gbpResult("taxableEstate", "Taxable Estate"),
      gbpResult("inheritanceTax", "Inheritance Tax", { highlight: true }),
      gbpResult("netEstate", "Estate After Tax"),
    ],
    instructions:
      "Enter the estate's total value and whether the main home is being left to children or grandchildren " +
      "(this unlocks the extra residence nil-rate band). Every estate gets a £325,000 tax-free nil-rate band; " +
      "leaving your home to direct descendants adds another £175,000 on top, for £500,000 tax-free in total. " +
      "Anything above that is taxed at a flat 40%.\n\n" +
      "The extra residence nil-rate band starts shrinking for estates over £2 million (losing £1 of it for " +
      "every £2 over that threshold), disappearing entirely around £2.35 million — this calculator applies " +
      "that taper automatically.",
    examples:
      "Example: a £900,000 estate leaving the home to children gets the full £500,000 tax-free band " +
      "(£325,000 + £175,000), leaving £400,000.00 taxable — £160,000.00 in Inheritance Tax, leaving " +
      "£740,000.00 for the estate.",
    assumptions:
      "This calculator uses the 2026/27 nil-rate band (£325,000, frozen since 2009 and confirmed frozen to " +
      "2031) and residence nil-rate band (£175,000, tapering from £2 million), both confirmed via GOV.UK. It " +
      "doesn't model spousal transfer of unused allowances, charitable-gift rate reductions, gifts made within " +
      "7 years of death, business/agricultural relief, or trusts — all of which can significantly change a " +
      "real estate's actual IHT bill.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "What if I'm leaving everything to my spouse?",
        answer:
          "Transfers between UK-domiciled spouses or civil partners are normally exempt from Inheritance Tax " +
          "entirely, and any UNUSED nil-rate band and residence nil-rate band can be transferred to the " +
          "surviving spouse's estate later — potentially doubling both allowances on the second death. This " +
          "calculator doesn't model that transfer; it estimates a single estate's own allowances only.",
      },
      {
        question: "Does the residence nil-rate band apply if I don't own a home?",
        answer:
          "No — it specifically requires a qualifying residential property that's included in the estate and " +
          "passed to direct descendants (children, grandchildren, and some step/foster/adopted equivalents). " +
          "Without a qualifying home, only the standard £325,000 nil-rate band applies.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 9. UK VAT Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-vat-calculator",
    title: "UK VAT Calculator",
    description: "Add or extract UK VAT (20% standard, 5% reduced, or 0% zero rate) from a price.",
    metaTitle: "UK VAT Calculator — Free & Instant",
    metaDescription:
      "Free UK VAT calculator. Add VAT to a net price or extract it from a VAT-inclusive price, at the 20% " +
      "standard, 5% reduced, or 0% zero rate.",
    calcInputs: [
      gbpField("amount", "Amount", { unit: "GBP", max: 500000, step: 10 }),
      {
        key: "vatRate",
        label: "VAT Rate",
        type: "dropdown",
        required: true,
        default: 20,
        options: [
          { label: "Standard Rate (20%)", value: 20 },
          { label: "Reduced Rate (5%)", value: 5 },
          { label: "Zero Rate (0%)", value: 0 },
        ],
      },
      {
        key: "isVatInclusive",
        label: "Is the Amount Already VAT-Inclusive?",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "No — add VAT to this price", value: 0 },
          { label: "Yes — extract VAT from this price", value: 1 },
        ],
      },
    ],
    calcResult: { label: "VAT Amount", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("netAmount", "Net Amount (Excluding VAT)"),
      gbpResult("vatAmount", "VAT Amount", { highlight: true }),
      gbpResult("grossAmount", "Gross Amount (Including VAT)"),
    ],
    instructions:
      "Enter an amount, choose the VAT rate that applies (standard 20% for most goods and services, reduced 5% " +
      "for things like home energy, or zero rate for most food and children's clothes), and say whether the " +
      "amount you entered already includes VAT.\n\n" +
      "If you're pricing something and want to know what to charge including VAT, choose \"add VAT to this " +
      "price.\" If you have a receipt or invoice total and want to know how much of it was VAT, choose " +
      "\"extract VAT from this price\" instead.",
    examples:
      "Example: a £1,200 price with 20% VAT added (not yet VAT-inclusive) owes £240.00 in VAT, for a £1,440.00 " +
      "VAT-inclusive total.",
    assumptions:
      "This calculator uses the current UK VAT rates confirmed via gov.uk/vat-rates: 20% standard, 5% reduced " +
      "(a specific list of goods/services), 0% zero-rated (a different specific list — not the same as " +
      "VAT-exempt, which is a separate category this tool doesn't cover). Always confirm which rate your " +
      "specific goods or services actually fall under with HMRC's guidance.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between zero-rated and VAT-exempt?",
        answer:
          "Zero-rated goods (most food, books, children's clothes) are technically still VAT taxable, just at " +
          "0% — a VAT-registered business can still reclaim VAT on related costs. Exempt goods/services " +
          "(insurance, some education and health services) are outside the VAT system entirely, and input VAT " +
          "generally can't be reclaimed against them. This calculator only handles the three RATES, not the " +
          "exempt category.",
      },
      {
        question: "Do I need to register for VAT?",
        answer:
          "Once your VAT-taxable turnover (not profit) crosses £90,000 in any rolling 12-month period, " +
          "registration becomes compulsory — see GOV.UK's VAT registration guidance for the exact rules and " +
          "voluntary registration below that threshold.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 10. UK Self Employed Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-self-employed-tax-calculator",
    title: "UK Self Employed Tax Calculator",
    description:
      "Calculate the full picture for a UK sole trader: Income Tax plus Class 4 National Insurance on your " +
      "net profit.",
    metaTitle: "UK Self Employed Tax Calculator — Free & Instant",
    metaDescription:
      "Free UK self-employed tax calculator. Enter your net profit to see your Income Tax, Class 4 National " +
      "Insurance, and take-home profit.",
    calcInputs: [gbpField("netProfit", "Net Profit (After Business Expenses)", { unit: "GBP/year", max: 300000 })],
    calcResult: { label: "Total Tax & NI", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("incomeTax", "Income Tax"),
      gbpResult("class4NationalInsurance", "Class 4 National Insurance"),
      gbpResult("totalTaxAndNi", "Total Tax & NI", { highlight: true }),
      gbpResult("takeHomeProfit", "Take-Home Profit"),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter your net profit for the year — your total self-employment income after deducting allowable " +
      "business expenses (not your turnover). This calculator combines Income Tax (using the Personal " +
      "Allowance and rest-of-UK bands) with Class 4 National Insurance, both charged on the same net profit " +
      "figure, for the full tax-and-NI picture a sole trader actually faces.\n\n" +
      "Class 2 National Insurance is no longer a separate compulsory charge for profits above the Lower " +
      "Profits Limit (£12,570) — HMRC now treats it as automatically paid, protecting your NI record without " +
      "an actual charge — so it isn't added here (see this tool's FAQ for the small-profits exception).",
    examples:
      "Example: £45,000 of net profit owes £6,486.00 in Income Tax and £1,945.80 in Class 4 National Insurance " +
      "— £8,431.80 total, an 18.74% effective rate, leaving £36,568.20 take-home.",
    assumptions:
      "This calculator uses 2026/27 rest-of-UK Income Tax bands and Class 4 National Insurance rates (6% on " +
      "profits £12,570–£50,270, 2% above), both confirmed via GOV.UK, and doesn't charge Class 2 NI (no longer " +
      "compulsory above the Lower Profits Limit). It doesn't estimate quarterly payments on account, which HMRC " +
      "requires for most sole traders under Self Assessment — see the Estimated Tax Calculator and Quarterly " +
      "Tax Calculator under Tax & Paycheck Calculators for that (US-focused; a UK payments-on-account version " +
      "isn't modeled separately here).\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "What if my profit is below £7,105?",
        answer:
          "Below the Small Profits Threshold (£7,105 for 2026/27), Class 4 NI still doesn't apply, and Class 2 " +
          "becomes genuinely voluntary — you can choose to pay a small flat weekly amount to keep your State " +
          "Pension record building, but it's optional rather than charged automatically. This calculator " +
          "doesn't add that voluntary amount.",
      },
      {
        question: "Does this include VAT?",
        answer:
          "No — VAT is a separate tax on your sales (only relevant once you're VAT-registered), not on your " +
          "profit. Use the UK VAT Calculator for that separately if it applies to your business.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 11. UK Freelance Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-freelance-tax-calculator",
    title: "UK Freelance Tax Calculator",
    description:
      "Work out how much to set aside from a freelance payment right now, using your estimated annual profit " +
      "to find the correct rate.",
    metaTitle: "UK Freelance Tax Calculator — Free & Instant",
    metaDescription:
      "Free UK freelance tax calculator. Enter a payment and your estimated annual profit to see how much to " +
      "set aside for tax and NI.",
    calcInputs: [
      gbpField("paymentAmount", "This Payment", { unit: "GBP", max: 50000, step: 50 }),
      gbpField("estimatedAnnualProfit", "Estimated Annual Profit (All Freelance Income)", { unit: "GBP/year", max: 300000 }),
    ],
    calcResult: { label: "Suggested Set-Aside", format: "currency", currency: "GBP" },
    calcResults: [
      percentResult("combinedRate", "Combined Rate to Set Aside"),
      gbpResult("suggestedSetAside", "Suggested Set-Aside", { highlight: true }),
      gbpResult("keepForYourself", "Safe to Spend/Save Separately"),
    ],
    instructions:
      "Enter one payment you've just received (or are about to invoice) and your best estimate of your total " +
      "annual freelance profit for the year — used only to find your correct marginal Income Tax and Class 4 " +
      "NI rate, not to recalculate your whole year's tax. This gives a quick \"set this much aside right now\" " +
      "answer for freelancers paid irregularly throughout the year.\n\n" +
      "For the full annual Income Tax + Class 4 NI picture (rather than a per-payment quick estimate), use the " +
      "UK Self Employed Tax Calculator instead.",
    examples:
      "Example: a £2,000 payment, with an estimated £45,000 annual profit (putting you in the 20% Income Tax " +
      "band + 6% Class 4 NI, a 26.00% combined rate), suggests setting aside £520.00 — leaving £1,480.00 " +
      "free to spend or save separately.",
    assumptions:
      "This calculator applies your MARGINAL combined Income Tax + Class 4 NI rate (based on where your " +
      "estimated annual profit falls in the 2026/27 bands) to this one payment — it's a quick planning " +
      "shortcut, not a precise calculation of the tax on this specific payment alone, since UK tax is actually " +
      "assessed on your whole year's profit together, not payment by payment.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Why does this need my ANNUAL profit estimate, not just this payment?",
        answer:
          "Because UK Income Tax is progressive — the rate on this specific payment depends on how much OTHER " +
          "income you've already got for the year. A rough annual estimate lets this calculator apply the " +
          "right marginal rate instead of guessing.",
      },
      {
        question: "Should I actually move this money to a separate account?",
        answer:
          "Many freelancers find it helpful to transfer the suggested set-aside into a separate savings account " +
          "as soon as they're paid, so it's ready when their Self Assessment tax bill (and any payments on " +
          "account) falls due, rather than having to find it all at once later.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 12. UK Rental Income Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-rental-income-tax-calculator",
    title: "UK Rental Income Tax Calculator",
    description:
      "Calculate UK tax on rental profit, correctly modeling Section 24: mortgage interest gets a 20% tax " +
      "credit instead of being deducted from profit.",
    metaTitle: "UK Rental Income Tax Calculator — Free & Instant",
    metaDescription:
      "Free UK rental income tax calculator. Enter your rental income, expenses, and mortgage interest to see " +
      "tax on your rental profit under Section 24 rules.",
    calcInputs: [
      gbpField("annualRentalIncome", "Annual Rental Income", { unit: "GBP/year", max: 200000 }),
      gbpField("allowableExpenses", "Allowable Expenses (Excluding Mortgage Interest)", { unit: "GBP/year", max: 100000 }),
      gbpField("mortgageInterest", "Mortgage Interest Paid", { unit: "GBP/year", max: 100000 }),
      otherIncomeField,
    ],
    calcResult: { label: "Income Tax on Rental Profit", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("rentalProfit", "Rental Profit (Before Mortgage Relief)"),
      gbpResult("incomeTaxOnRental", "Income Tax on Rental Profit", { highlight: true }),
      gbpResult("mortgageInterestTaxCredit", "Mortgage Interest Tax Credit (20%)"),
      gbpResult("netRentalIncome", "Net Rental Income After Tax & Mortgage"),
    ],
    instructions:
      "Enter your annual rental income, your allowable expenses (letting agent fees, repairs, insurance, etc. " +
      "— NOT mortgage interest, which is entered separately), your mortgage interest paid, and your other " +
      "taxable income for the year.\n\n" +
      "Since the Section 24 changes fully phased in from 2020/21, mortgage interest is no longer deducted from " +
      "your rental profit before tax — instead, you get a flat 20% tax credit on it, regardless of your actual " +
      "Income Tax rate. This means higher and additional-rate taxpayers effectively get LESS relief than the " +
      "40%/45% they'd have gotten under the old rules, which this calculator models correctly.",
    examples:
      "Example: £18,000 rental income with £3,000 of allowable expenses and £6,000 mortgage interest (£50,000 " +
      "other income) has £15,000.00 rental profit, taxed at £5,946.00 before relief — minus a £1,200.00 " +
      "mortgage interest tax credit — for £4,746.00 Income Tax on the rental profit, leaving £4,254.00 net " +
      "after tax and mortgage.",
    assumptions:
      "This calculator uses 2026/27 rest-of-UK Income Tax bands and the Section 24 mortgage interest tax credit " +
      "(20%, regardless of your actual marginal rate), stacking rental profit on top of your other income to " +
      "find the correct band. It applies to individual landlords only — furnished holiday lets and " +
      "company-owned property have different rules not modeled here — and doesn't include Class 4 National " +
      "Insurance (rental income isn't subject to NI at all, unlike self-employment profit).\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "What is Section 24, in plain terms?",
        answer:
          "A change (fully in force since April 2020) to how landlords with a mortgage are taxed: instead of " +
          "deducting mortgage interest as a business expense before working out your taxable rental profit " +
          "(like any other cost), you now pay tax on the FULL rental profit and then get a flat 20% tax credit " +
          "on the interest afterward — a much bigger change for higher and additional-rate taxpayers than for " +
          "basic-rate ones.",
      },
      {
        question: "Does rental income count toward National Insurance?",
        answer:
          "No — rental income from letting property is investment income, not earnings from a trade, so it's " +
          "not subject to Class 2 or Class 4 National Insurance the way self-employment profit is.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 13. UK Pension Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-pension-tax-calculator",
    title: "UK Pension Tax Calculator",
    description:
      "Calculate the tax relief on a pension contribution at your marginal rate, and check it against the " +
      "£60,000 Annual Allowance.",
    metaTitle: "UK Pension Tax Calculator — Free & Instant",
    metaDescription:
      "Free UK pension tax calculator. Enter your income and contribution to see your tax relief and Annual " +
      "Allowance position for 2026/27.",
    calcInputs: [
      gbpField("annualIncome", "Annual Income", { unit: "GBP/year", max: 300000, step: 1000 }),
      gbpField("annualContribution", "Annual Pension Contribution (Gross)", { unit: "GBP/year", max: 80000 }),
    ],
    calcResult: { label: "Tax Relief Received", format: "currency", currency: "GBP" },
    calcResults: [
      percentResult("marginalRate", "Your Marginal Income Tax Rate"),
      gbpResult("taxReliefReceived", "Tax Relief Received", { highlight: true }),
      gbpResult("netCostOfContribution", "Net Cost of This Contribution"),
      gbpResult("excessOverAllowance", "Amount Over the Annual Allowance"),
      gbpResult("annualAllowanceCharge", "Annual Allowance Charge (If Any)"),
    ],
    instructions:
      "Enter your annual income and how much you're contributing to a pension this year (the gross amount, " +
      "before relief is added). This calculator shows the tax relief you get at your marginal Income Tax rate " +
      "— so a higher-rate taxpayer gets more relief per pound contributed than a basic-rate one — and checks " +
      "your contribution against the £60,000 Annual Allowance, the most you can normally contribute in a year " +
      "with tax relief before an extra charge applies.\n\n" +
      "Relief usually reaches your full marginal rate one of two ways: automatically if your employer uses a " +
      "\"net pay\" scheme, or via a claim through Self Assessment if you're on a \"relief at source\" scheme " +
      "(which only adds the basic 20% automatically) and pay a higher rate.",
    examples:
      "Example: £60,000 annual income (a 40% marginal rate) with a £5,000 contribution receives £2,000.00 of " +
      "tax relief, so the contribution effectively costs £3,000.00 out of pocket — well under the £60,000 " +
      "Annual Allowance, so no charge applies.",
    assumptions:
      "This calculator uses the 2026/27 rest-of-UK Income Tax bands to find your marginal rate and the current " +
      "£60,000 Annual Allowance, both confirmed via GOV.UK. It doesn't model the Tapered Annual Allowance " +
      "(which can reduce the £60,000 limit for very high earners above £260,000 threshold income), Carry " +
      "Forward of unused allowance from the previous three years, or the Money Purchase Annual Allowance for " +
      "those already drawing a pension.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "\"Relief at source\" vs \"net pay\" — what's the difference?",
        answer:
          "Under \"relief at source,\" your pension provider automatically claims basic-rate (20%) relief and " +
          "adds it to your pot — if you're a higher or additional-rate taxpayer, you have to claim the EXTRA " +
          "relief yourself via Self Assessment. Under a \"net pay\" workplace scheme, your contribution comes " +
          "out of your salary BEFORE tax is calculated, so you get your full marginal-rate relief automatically " +
          "with nothing to claim.",
      },
      {
        question: "What happens if I go over the Annual Allowance?",
        answer:
          "You may face an Annual Allowance Charge, effectively clawing back the tax relief on the excess at " +
          "your marginal rate — though unused allowance from the previous three tax years (\"Carry Forward\") " +
          "can often be used to avoid it, which this calculator doesn't factor in.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 14. UK Bonus Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-bonus-tax-calculator",
    title: "UK Bonus Tax Calculator",
    description:
      "Calculate the real take-home value of a UK bonus — it stacks on top of your salary, so it's taxed at " +
      "your HIGHEST rate(s), not from zero.",
    metaTitle: "UK Bonus Tax Calculator — Free & Instant",
    metaDescription:
      "Free UK bonus tax calculator. Enter your salary and bonus to see the Income Tax, National Insurance, " +
      "and net bonus you'll actually receive.",
    calcInputs: [annualSalaryField, gbpField("bonusAmount", "Bonus Amount", { unit: "GBP", max: 200000 })],
    calcResult: { label: "Net Bonus", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("incomeTaxOnBonus", "Income Tax on Bonus"),
      gbpResult("niOnBonus", "National Insurance on Bonus"),
      gbpResult("totalDeductions", "Total Deductions"),
      gbpResult("netBonus", "Net Bonus", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate on Bonus"),
    ],
    instructions:
      "Enter your annual salary and your bonus amount. A bonus doesn't get its own fresh set of tax bands — " +
      "it's added ON TOP of your existing salary, so it's taxed at whatever rate(s) your income reaches once " +
      "the bonus is included, which is often higher than your average rate on your regular salary.\n\n" +
      "This calculator works out both the Income Tax and the extra National Insurance the bonus triggers, " +
      "stacked correctly on top of your salary, to show what actually lands in your account.",
    examples:
      "Example: a £45,000 salary with a £5,000 bonus owes £1,000.00 Income Tax and £400.00 National Insurance " +
      "on the bonus — £1,400.00 total, a 28.00% effective rate — leaving £3,600.00 net from the £5,000 bonus.",
    assumptions:
      "This calculator uses 2026/27 rest-of-UK Income Tax bands and Class 1 employee National Insurance, " +
      "stacking the bonus on top of your annual salary to find the correct marginal rate(s) it falls into. It " +
      "doesn't model bonus sacrifice into a pension (which can avoid Income Tax and NI on the sacrificed " +
      "amount entirely) or employer payroll quirks like the \"Month 1\" bonus over-withholding many people see " +
      "on the actual payslip before it corrects later in the year.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Why does my bonus feel like it's taxed so much more than my salary?",
        answer:
          "Because it's stacked on top of income you've already earned that year — if your salary already " +
          "fills your basic-rate band, the bonus lands entirely in the higher-rate band, even though your " +
          "AVERAGE tax rate across salary + bonus together is lower than that. It's not taxed at a special " +
          "\"bonus rate\" — it's just taxed at your top marginal rate(s).",
      },
      {
        question: "Can I reduce the tax on a bonus?",
        answer:
          "Sacrificing some or all of a bonus directly into your pension (before it's paid as cash) is a common " +
          "way to avoid Income Tax and National Insurance on the sacrificed amount entirely — worth discussing " +
          "with your employer's payroll team if you're offered the option, though this calculator doesn't model " +
          "that scenario.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 15. UK Overtime Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "uk-overtime-tax-calculator",
    title: "UK Overtime Tax Calculator",
    description:
      "Calculate the real take-home value of UK overtime pay, stacked on top of your regular salary the same " +
      "way a bonus is.",
    metaTitle: "UK Overtime Tax Calculator — Free & Instant",
    metaDescription:
      "Free UK overtime tax calculator. Enter your salary and overtime pay to see the Income Tax, National " +
      "Insurance, and net overtime you'll actually receive.",
    calcInputs: [annualSalaryField, gbpField("overtimePay", "Overtime Pay", { unit: "GBP", max: 50000 })],
    calcResult: { label: "Net Overtime Pay", format: "currency", currency: "GBP" },
    calcResults: [
      gbpResult("incomeTaxOnOvertime", "Income Tax on Overtime"),
      gbpResult("niOnOvertime", "National Insurance on Overtime"),
      gbpResult("totalDeductions", "Total Deductions"),
      gbpResult("netOvertimePay", "Net Overtime Pay", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate on Overtime"),
    ],
    instructions:
      "Enter your annual salary and the extra overtime pay you've earned. Like a bonus, overtime pay stacks on " +
      "top of your regular salary rather than getting its own tax-free allowance, so it's taxed at whatever " +
      "rate your income reaches once the overtime is added.\n\n" +
      "This calculator works out the Income Tax and extra National Insurance the overtime pay triggers, so you " +
      "can see what you'll actually take home from it rather than assuming it's taxed the same as your average " +
      "hourly rate.",
    examples:
      "Example: a £30,000 salary with £2,000 of overtime pay owes £400.00 Income Tax and £160.00 National " +
      "Insurance on the overtime — £560.00 total, a 28.00% effective rate — leaving £1,440.00 net from the " +
      "£2,000 of overtime.",
    assumptions:
      "This calculator uses 2026/27 rest-of-UK Income Tax bands and Class 1 employee National Insurance, " +
      "stacking overtime pay on top of your annual salary to find the correct marginal rate(s) it falls into — " +
      "the same stacking logic as the UK Bonus Tax Calculator, since HMRC treats both the same way as ordinary " +
      "taxable pay.\n\n" +
      UK_DISCLAIMER,
    faq: [
      {
        question: "Is overtime taxed differently from regular pay?",
        answer:
          "No — there's no special \"overtime tax rate\" in the UK. It's simply added to your total pay for the " +
          "period and taxed at whatever Income Tax and National Insurance rates that total reaches, which can " +
          "feel like a higher rate purely because it's the LAST slice of income added on top.",
      },
      {
        question: "Why is the effective rate the same as the Bonus Tax Calculator's example?",
        answer:
          "Coincidence of the numbers used, not a rule — both bonus pay and overtime pay are taxed with the " +
          "exact same Income Tax and NI stacking logic, so two different people with similar salary-plus-extra " +
          "combinations can land on a similar effective rate. There's no special overtime-specific calculation " +
          "at all — it's genuinely just \"extra pay taxed at your marginal rate.\"",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:create-uk-income-tax-tool" first, ` +
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
