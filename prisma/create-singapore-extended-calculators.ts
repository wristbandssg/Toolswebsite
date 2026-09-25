// One-time (but safe to re-run) batch setup script: creates 10 more Tools
// under the EXISTING "Singapore Tax & Salary Calculators" category (slug
// "singapore-tax-salary-calculators", created by
// create-singapore-tax-tool.ts — this script does NOT create the
// category; it fails loudly if it's missing).
//
// See src/lib/calc-engine-singapore-extended-calculators.ts for the
// actual math and which of its exported functions each of these 10 slugs
// maps to, and that file's header for the iras.gov.sg/cpf.gov.sg source of
// every figure used — including why "Capital Gains Tax" and "Dividend
// Tax" are honestly framed around Singapore's real "generally not taxed"
// rules rather than inventing rates that don't exist.
//
// HOW TO RUN
//   npx tsx prisma/create-singapore-extended-calculators.ts
// or
//   npm run db:create-singapore-extended-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "singapore-tax-salary-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function sgdField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit ?? "SGD",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 300000,
    step: opts.step ?? 500,
  };
}

function sgdResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", currency: "SGD", unit: opts.unit, highlight: opts.highlight };
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

const ageField = {
  key: "age",
  label: "Age",
  type: "number",
  required: true,
  default: 30,
  min: 16,
  max: 80,
  step: 1,
};

const SG_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified accountant or IRAS/CPF Board.";

const NO_CGT_NOTE =
  "Singapore has no general capital gains tax. Gains from selling property, shares, and financial instruments " +
  "are generally not taxable, unless IRAS considers the activity to be \"trading\" rather than a personal " +
  "investment.";

const NO_DIVIDEND_TAX_NOTE =
  "Dividends paid by Singapore resident companies are tax-exempt to shareholders under the one-tier corporate " +
  "tax system — the company's own tax is treated as final.";

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
  // 1. Singapore GST Calculator
  // -------------------------------------------------------------------
  {
    slug: "singapore-gst-calculator",
    title: "Singapore GST Calculator",
    description: "Add or extract Singapore's 9% Goods and Services Tax (GST) from a price.",
    metaTitle: "Singapore GST Calculator — Free & Instant",
    metaDescription: "Free Singapore GST calculator. Add 9% GST to a price or extract it from a GST-inclusive price.",
    calcInputs: [
      sgdField("amount", "Amount", { unit: "SGD", max: 500000, step: 10 }),
      yesNoField("isGstInclusive", "Is the Amount Already GST-Inclusive?"),
    ],
    calcResult: { label: "GST Amount", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("netAmount", "Net Amount (Excluding GST)"),
      sgdResult("gstAmount", "GST Amount (9%)", { highlight: true }),
      sgdResult("grossAmount", "Gross Amount (Including GST)"),
    ],
    instructions:
      "Enter an amount and say whether it already includes GST. Singapore's GST rate is a flat 9%, reached on " +
      "1 January 2024 after a two-step increase from 7%, with no further rise announced since.",
    examples: "Example: a $1,000 price with 9% GST added owes $90.00 in GST, for a $1,090.00 GST-inclusive total.",
    assumptions:
      "This calculator uses the current 9% GST rate confirmed via iras.gov.sg. GST registration is compulsory " +
      "once your taxable turnover exceeds $1,000,000 in a 12-month period (assessed on a calendar-year basis).\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "Will GST rise further?",
        answer:
          "No further increase has been announced — 9% has been the confirmed rate since 1 January 2024, and " +
          "remains current for 2026.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 2. Singapore CPF Calculator (general)
  // -------------------------------------------------------------------
  {
    slug: "singapore-cpf-calculator",
    title: "Singapore CPF Calculator",
    description: "Quickly estimate your monthly CPF contribution from your Ordinary Wage and age.",
    metaTitle: "Singapore CPF Calculator — Free & Instant",
    metaDescription:
      "Free Singapore CPF calculator. Enter your monthly wage and age to see your employee and employer CPF " +
      "contribution.",
    calcInputs: [
      sgdField("monthlyWage", "Monthly Wage (Ordinary Wage)", { unit: "SGD/month", max: 30000 }),
      ageField,
    ],
    calcResult: { label: "Total CPF Contribution", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("ordinaryWageUsed", "Ordinary Wage Used (Capped)"),
      sgdResult("employeeContribution", "Your CPF Contribution"),
      sgdResult("employerContribution", "Employer CPF Contribution"),
      sgdResult("totalContribution", "Total CPF Contribution", { highlight: true }),
      sgdResult("takeHomePay", "Take-Home Pay"),
    ],
    instructions:
      "Enter your monthly wage and age. This is a quick estimate on your Ordinary Wage (regular monthly salary) " +
      "alone, capped at the $8,000/month OW Ceiling (reached its final 2026 level from 1 January 2026) — for a " +
      "detailed breakdown that also includes bonuses (Additional Wage), use the Singapore CPF Contribution " +
      "Calculator instead.",
    examples:
      "Example: a $6,000 monthly wage at age 30 (under-55 band, 37% combined rate) contributes $1,200.00 " +
      "(employee, 20%) plus $1,020.00 (employer, 17%) — $2,220.00 total, leaving $4,800.00 take-home pay.",
    assumptions:
      "This calculator uses confirmed CPF contribution rates effective 1 January 2026 for Singapore Citizens " +
      "and Permanent Residents in their 3rd year and beyond, from cpf.gov.sg, and the $8,000/month Ordinary " +
      "Wage Ceiling. It doesn't apply to Employment Pass holders or other foreign employees, who don't " +
      "contribute to CPF, or to PRs in their 1st/2nd year (graduated rates).\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "What is the Ordinary Wage Ceiling?",
        answer:
          "The maximum monthly wage CPF contributions are calculated on — $8,000 from 1 January 2026, the final " +
          "step of a phased increase from $6,000 (pre-September 2023). Wages above this ceiling don't attract " +
          "additional CPF contribution.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 3. Singapore CPF Contribution Calculator (detailed, with bonus)
  // -------------------------------------------------------------------
  {
    slug: "singapore-cpf-contribution-calculator",
    title: "Singapore CPF Contribution Calculator",
    description: "Calculate detailed annual CPF contributions including your Additional Wage (bonus), using the AW ceiling formula.",
    metaTitle: "Singapore CPF Contribution Calculator — Free & Instant",
    metaDescription:
      "Free Singapore CPF contribution calculator. Enter your monthly wage and bonus to see detailed annual " +
      "CPF, using the Additional Wage ceiling formula.",
    calcInputs: [
      sgdField("monthlyOrdinaryWage", "Monthly Ordinary Wage", { unit: "SGD/month", max: 30000 }),
      sgdField("annualAdditionalWage", "Annual Additional Wage (Bonus)", { unit: "SGD/year", max: 200000 }),
      ageField,
    ],
    calcResult: { label: "Total Annual CPF Contribution", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("annualOrdinaryWageUsed", "Annual Ordinary Wage Used (Capped)"),
      sgdResult("additionalWageCeiling", "Additional Wage Ceiling"),
      sgdResult("additionalWageUsed", "Additional Wage Used (Capped)"),
      sgdResult("employeeOwContribution", "Your CPF on Ordinary Wage"),
      sgdResult("employerOwContribution", "Employer CPF on Ordinary Wage"),
      sgdResult("employeeAwContribution", "Your CPF on Additional Wage"),
      sgdResult("employerAwContribution", "Employer CPF on Additional Wage"),
      sgdResult("totalAnnualContribution", "Total Annual CPF Contribution", { highlight: true }),
    ],
    instructions:
      "Enter your monthly Ordinary Wage, your annual Additional Wage (bonus/commission), and your age. Unlike " +
      "Ordinary Wage, Additional Wage doesn't have a simple monthly cap — instead, the Additional Wage Ceiling " +
      "is calculated as $102,000 MINUS your capped Ordinary Wage for the year, so a higher regular salary " +
      "leaves LESS room for CPF-attracting bonus.",
    examples:
      "Example: an $8,000 monthly Ordinary Wage (at the $8,000 cap, $96,000/year) with a $20,000 bonus, at age " +
      "30, has just $6,000.00 of Additional Wage Ceiling room (since $102,000 − $96,000 = $6,000) — contributing " +
      "$19,200.00 + $1,200.00 = $20,400.00 (yours) and $16,320.00 + $1,020.00 = $17,340.00 (employer's), for " +
      "$37,740.00 total — exactly the CPF Annual Limit.",
    assumptions:
      "This calculator uses the confirmed $8,000/month OW Ceiling and $102,000 annual wage ceiling (the basis " +
      "for the AW Ceiling formula) from cpf.gov.sg, effective 1 January 2026, for Citizens/PRs in their 3rd year " +
      "and beyond. It assumes one employer for the full year — the AW Ceiling is actually shared and " +
      "coordinated across multiple employers in a year, which this single-employer calculator doesn't model.\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "Why is my Additional Wage Ceiling lower than expected?",
        answer:
          "Because it's calculated as $102,000 minus your CPF-attracting Ordinary Wage for the year — the " +
          "higher your regular monthly salary (up to the $8,000 OW Ceiling), the less of your bonus attracts " +
          "CPF contribution, by design.",
      },
      {
        question: "What is the CPF Annual Limit?",
        answer:
          "$37,740 for 2026 — the maximum combined (employee + employer) mandatory CPF contribution in a year, " +
          "which is exactly $102,000 (the wage ceiling) times the under-55 combined rate (37%). The Ordinary " +
          "Wage and Additional Wage ceilings work together to naturally cap contributions at this figure.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 4. Singapore Self Employed Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "singapore-self-employment-tax-calculator",
    title: "Singapore Self Employed Tax Calculator",
    description: "Calculate income tax plus your compulsory MediSave contribution on self-employed trade income.",
    metaTitle: "Singapore Self Employed Tax Calculator — Free & Instant",
    metaDescription:
      "Free Singapore self-employed tax calculator. Enter your Net Trade Income and age to see income tax and " +
      "MediSave contribution.",
    calcInputs: [
      sgdField("netTradeIncome", "Net Trade Income (NTI)", { unit: "SGD/year", max: 300000 }),
      ageField,
    ],
    calcResult: { label: "Total Tax & MediSave", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("incomeTax", "Income Tax"),
      sgdResult("medisaveContribution", "MediSave Contribution"),
      sgdResult("totalTaxAndMedisave", "Total Tax & MediSave", { highlight: true }),
      sgdResult("netIncomeAfterTax", "Net Income After Tax & MediSave"),
    ],
    instructions:
      "Enter your Net Trade Income (business profit) and age. Self-employed persons in Singapore pay ordinary " +
      "resident income tax on their trade income, PLUS a compulsory MediSave contribution (unlike employees, " +
      "who contribute to the full CPF Ordinary/Special/MediSave split) — mandatory once NTI exceeds $6,000/year, " +
      "at a rate that graduates up between $6,000 and $18,000 of NTI before reaching its maximum.",
    examples:
      "Example: $80,000 Net Trade Income at age 30 owes $3,350.00 income tax plus $6,400.00 MediSave (8% of " +
      "NTI, at the under-35 maximum rate) — $9,750.00 total, leaving $70,250.00 net.",
    assumptions:
      "This calculator uses confirmed YA2026 resident tax brackets and 2025 MediSave contribution rates/caps " +
      "(current for YA2026 filing) from iras.gov.sg. The $6,000–$18,000 graduated MediSave band uses a " +
      "SIMPLIFIED LINEAR approximation of IRAS's official graduated formula — for an exact figure in that range, " +
      "use the CPF Board's own Self-Employed MediSave calculator. Below $6,000 NTI, MediSave is not compulsory " +
      "(shown as $0 here); above $18,000, the flat maximum rate applies, capped at the maximum annual amount for " +
      "your age band.\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "Do self-employed people get the full CPF, or just MediSave?",
        answer:
          "Just MediSave — self-employed persons in Singapore are only required to contribute to their MediSave " +
          "Account (for healthcare), not the Ordinary or Special Accounts employees also build up. Voluntary " +
          "contributions to OA/SA are possible but not compulsory.",
      },
      {
        question: "Why is my MediSave rate different in the $6,000–$18,000 range?",
        answer:
          "IRAS phases the MediSave rate up gradually in that band rather than jumping straight to the maximum " +
          "rate, so someone just over the $6,000 threshold isn't hit with a large contribution all at once. This " +
          "calculator approximates that graduation with a straight line between $6,000 and $18,000 — check the " +
          "CPF Board's own calculator for your exact figure in that range.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 5. Singapore Corporate Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "singapore-corporate-tax-calculator",
    title: "Singapore Corporate Tax Calculator",
    description: "Calculate corporate tax after partial or start-up tax exemption and the YA2026 CIT Rebate.",
    metaTitle: "Singapore Corporate Tax Calculator — Free & Instant",
    metaDescription:
      "Free Singapore corporate tax calculator. Enter chargeable income to see tax after exemption and the " +
      "YA2026 Corporate Income Tax Rebate.",
    calcInputs: [
      sgdField("chargeableIncome", "Chargeable Income", { unit: "SGD/year", max: 2000000, step: 1000 }),
      yesNoField("isFirstThreeYears", "Is This One of the Company's First 3 YAs?"),
    ],
    calcResult: { label: "Net Tax Payable", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("exemptAmount", "Exempt Amount"),
      sgdResult("taxableAfterExemption", "Taxable After Exemption"),
      sgdResult("taxPayable", "Tax Payable (17%)"),
      sgdResult("citRebate", "YA2026 CIT Rebate"),
      sgdResult("netTaxPayable", "Net Tax Payable", { highlight: true }),
    ],
    instructions:
      "Enter your company's chargeable income and say whether this is one of its first 3 Years of Assessment. " +
      "Singapore's corporate tax rate is a flat 17%, but most companies pay an effective rate well below that " +
      "thanks to two exemption schemes: the ongoing Partial Tax Exemption (75% exempt on the first $10,000, 50% " +
      "on the next $190,000), or, for qualifying companies in their first 3 YAs only, the larger Start-Up Tax " +
      "Exemption (75% on the first $100,000, 50% on the next $100,000).\n\n" +
      "This calculator also applies the one-off YA2026 Corporate Income Tax Rebate — 50% of tax payable, capped " +
      "at $40,000.",
    examples:
      "Example: $300,000 chargeable income for an established company gets $102,500.00 exempt, leaving " +
      "$197,500.00 taxable at 17% ($33,575.00) — minus a $16,787.50 CIT Rebate (50%, under the $40,000 cap) — " +
      "for $16,787.50 net tax payable.",
    assumptions:
      "This calculator uses the confirmed flat 17% corporate tax rate, current Partial Tax Exemption and " +
      "Start-Up Tax Exemption thresholds, and the YA2026-specific 50%-of-tax-payable CIT Rebate (capped at " +
      "$40,000), all from iras.gov.sg. The YA2026 rebate is a ONE-OFF measure (Budget 2026), not a permanent " +
      "rate — don't assume it applies in future years without checking. It doesn't include the separate CIT " +
      "Rebate Cash Grant for companies with local employees.\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "Will the CIT Rebate apply next year too?",
        answer:
          "Not automatically — the Budget 2026 CIT Rebate is a one-off measure specific to YA2026, introduced " +
          "(and later enhanced) as cost-of-living/business support. Whether a similar rebate applies in future " +
          "years depends on each year's Budget announcement.",
      },
      {
        question: "Do I qualify for the Start-Up Tax Exemption?",
        answer:
          "Generally, yes, if your company is incorporated in Singapore, is a tax resident, and has no more " +
          "than 20 shareholders (with at least one individual holding 10%+) — check IRAS's full qualifying " +
          "conditions, as certain company types (like investment holding companies) are excluded.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 6. Singapore Property Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "singapore-property-tax-calculator",
    title: "Singapore Property Tax Calculator",
    description: "Calculate annual property tax from your property's Annual Value and owner-occupation status.",
    metaTitle: "Singapore Property Tax Calculator — Free & Instant",
    metaDescription:
      "Free Singapore property tax calculator. Enter your property's Annual Value to see tax for owner-" +
      "occupied, non-owner-occupied, or non-residential property.",
    calcInputs: [
      sgdField("annualValue", "Annual Value (AV)", { unit: "SGD/year", max: 300000, step: 1000 }),
      {
        key: "propertyType",
        label: "Property Type",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Owner-Occupied Residential", value: 0 },
          { label: "Non-Owner-Occupied Residential", value: 1 },
          { label: "Non-Residential (Commercial/Industrial)", value: 2 },
        ],
      },
    ],
    calcResult: { label: "Annual Property Tax", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("annualPropertyTax", "Annual Property Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate on AV"),
    ],
    instructions:
      "Enter your property's Annual Value (the estimated annual rent it could fetch, shown on your IRAS " +
      "property tax notice) and its type. Owner-occupied residential property gets the most generous " +
      "progressive bands (starting at 0%), non-owner-occupied residential property is taxed more heavily at " +
      "every band, and non-residential property (commercial/industrial) is a flat 10% of AV.",
    examples:
      "Example: a $50,000 Annual Value owner-occupied home owes $1,720.00 (3.44% effective rate) — the SAME " +
      "property as non-owner-occupied instead owes $8,000.00 (16% effective rate).",
    assumptions:
      "This calculator uses the confirmed owner-occupied residential bands (effective 1 January 2025) and " +
      "non-owner-occupied residential bands (effective 1 January 2024), both from iras.gov.sg. It doesn't " +
      "include the separate one-off property tax rebate announced for all owner-occupied residential " +
      "properties in 2026 — check your actual IRAS notice for that rebate applied on top of this estimate.\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "Where do I find my property's Annual Value?",
        answer:
          "On your annual property tax bill from IRAS, or by checking the myTax Portal — AV is IRAS's estimate " +
          "of the property's annual market rental value, reviewed periodically as market rents change.",
      },
      {
        question: "Is there a 2026 rebate on top of this?",
        answer:
          "Yes — IRAS announced a one-off property tax rebate for ALL owner-occupied residential properties in " +
          "2026, on top of the standard rates this calculator computes. Check your actual tax bill, since this " +
          "calculator shows the standard rate before that rebate.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 7. Singapore Stamp Duty Calculator
  // -------------------------------------------------------------------
  {
    slug: "singapore-stamp-duty-calculator",
    title: "Singapore Stamp Duty Calculator",
    description: "Calculate Buyer's Stamp Duty and Additional Buyer's Stamp Duty on a property purchase.",
    metaTitle: "Singapore Stamp Duty Calculator — Free & Instant",
    metaDescription:
      "Free Singapore stamp duty calculator. Enter a property price and buyer profile to see BSD and ABSD.",
    calcInputs: [
      sgdField("purchasePrice", "Purchase Price", { unit: "SGD", max: 10000000, step: 10000 }),
      {
        key: "buyerProfile",
        label: "Buyer Profile",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Singapore Citizen — 1st property", value: 0 },
          { label: "Singapore Citizen — 2nd property", value: 1 },
          { label: "Singapore Citizen — 3rd+ property", value: 2 },
          { label: "Permanent Resident — 1st property", value: 3 },
          { label: "Permanent Resident — 2nd property", value: 4 },
          { label: "Permanent Resident — 3rd+ property", value: 5 },
          { label: "Foreigner — any property", value: 6 },
          { label: "Entity (company/trust)", value: 7 },
        ],
      },
    ],
    calcResult: { label: "Total Stamp Duty", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("buyersStampDuty", "Buyer's Stamp Duty (BSD)"),
      sgdResult("additionalBuyersStampDuty", "Additional Buyer's Stamp Duty (ABSD)"),
      sgdResult("totalStampDuty", "Total Stamp Duty", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate on Price"),
    ],
    instructions:
      "Enter the property's purchase price and your buyer profile. EVERY buyer pays Buyer's Stamp Duty (BSD) at " +
      "progressive rates from 1% to 6%. On top of that, most buyers other than a Singapore Citizen buying their " +
      "FIRST property also pay Additional Buyer's Stamp Duty (ABSD) — a flat percentage that rises steeply with " +
      "each additional property and for non-citizens, up to 65% for entities.",
    examples:
      "Example: a $1,500,000 purchase by a Singapore Citizen buying their 1st property owes $44,600.00 BSD and " +
      "$0.00 ABSD — the SAME purchase by a Foreigner instead owes $44,600.00 BSD PLUS $900,000.00 ABSD (60%) — " +
      "$944,600.00 total, a 62.97% effective rate.",
    assumptions:
      "This calculator uses the confirmed BSD bands (effective 15 February 2023) and ABSD rates by buyer " +
      "profile (effective 27 April 2023), both from iras.gov.sg, with no later revision found. It doesn't model " +
      "ABSD remission for certain scenarios (like a Singaporean married couple selling their first home within " +
      "6 months of buying their second) or the Housing Developer's specific ABSD/remission regime.\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "Do Permanent Residents pay ABSD on their first property?",
        answer:
          "Yes — unlike a Singapore Citizen's first property (0% ABSD), a Permanent Resident pays 5% ABSD even " +
          "on their FIRST Singapore property purchase, rising to 30% for a second and 35% for a third or more.",
      },
      {
        question: "Why is the entity/company rate so high?",
        answer:
          "ABSD for entities (companies, trusts) is set at 65% specifically to discourage corporate structuring " +
          "around individual ABSD rates — buying residential property through a company doesn't reduce your " +
          "stamp duty exposure, it substantially increases it.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 8. Singapore Capital Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "singapore-capital-gains-tax-calculator",
    title: "Singapore Capital Gains Tax Calculator",
    description: "Check whether a gain is taxable \"trading\" income — Singapore has no general capital gains tax.",
    metaTitle: "Singapore Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free Singapore capital gains calculator. Singapore has no general CGT — check whether your gain counts " +
      "as taxable trading income instead.",
    calcInputs: [
      sgdField("gainAmount", "Gain on Sale", { unit: "SGD", max: 2000000 }),
      sgdField("otherTaxableIncome", "Other Taxable Income", { unit: "SGD/year", max: 500000 }),
      yesNoField("isConsideredTrading", "Would IRAS Likely Consider This \"Trading\" (Not a Personal Investment)?"),
    ],
    calcResult: { label: "Tax on Gain", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("taxableGain", "Taxable Gain"),
      sgdResult("taxOnGain", "Tax on Gain", { highlight: true }),
      sgdResult("netProceeds", "Net Proceeds"),
    ],
    instructions:
      "Singapore has no general capital gains tax. Gains from selling property, shares, or financial " +
      "instruments (including crypto) are generally NOT taxable at all, treated as personal investment gains. " +
      "The one real exception: if IRAS considers your activity a \"trade\" — assessed on facts like transaction " +
      "frequency, your reasons for buying/selling, and your financial means to hold long-term — the gain is " +
      "taxed as ordinary income instead.\n\n" +
      "Enter your gain, other income, and your honest best guess at whether IRAS would view this as trading, " +
      "to see the likely tax either way.",
    examples:
      "Example: a $200,000 gain treated as a personal investment (against $100,000 other income) owes $0.00 " +
      "tax — the SAME gain, if considered \"trading,\" is taxed as ordinary income stacked on your other " +
      "income, owing $34,900.00.",
    assumptions:
      "This calculator reflects IRAS's confirmed position that gains from selling property, shares, and " +
      "financial instruments are generally not taxable, with \"trading\" as the narrow exception, both from " +
      "iras.gov.sg. Whether a specific transaction counts as \"trading\" is a FACTS-AND-CIRCUMSTANCES " +
      "determination IRAS makes case by case — this calculator can't make that determination for you, only show " +
      "the tax difference if it applies.\n\n" +
      NO_CGT_NOTE +
      "\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "What makes a gain count as \"trading\"?",
        answer:
          "IRAS looks at the whole picture: how frequently you buy and sell, whether you have the financial " +
          "means to hold the asset long-term, your stated purpose when acquiring it, and the circumstances of " +
          "the sale. A single sale of a long-held personal investment is very unlikely to be treated as trading; " +
          "frequent, short-holding-period transactions are more likely to be scrutinized.",
      },
      {
        question: "Does this apply to selling my own home?",
        answer:
          "Yes — selling your own residential property is generally treated as a non-taxable capital gain, the " +
          "same as shares or other investments, unless IRAS's facts-and-circumstances test points to property " +
          "trading (common for someone who buys and sells multiple properties in short succession).",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 9. Singapore Dividend Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "singapore-dividend-tax-calculator",
    title: "Singapore Dividend Tax Calculator",
    description: "Confirm your dividends are tax-exempt — Singapore's one-tier system exempts most dividend income.",
    metaTitle: "Singapore Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free Singapore dividend tax calculator. See why Singapore company dividends, and most foreign " +
      "dividends, are tax-exempt to shareholders.",
    calcInputs: [
      sgdField("sgCompanyDividend", "Dividend From a Singapore Resident Company", { unit: "SGD/year", max: 500000 }),
      sgdField("foreignSourcedDividend", "Foreign-Sourced Dividend", { unit: "SGD/year", max: 500000 }),
      yesNoField("receivedViaPartnership", "Was the Foreign Dividend Received Through a Singapore Partnership?"),
      sgdField("otherTaxableIncome", "Other Taxable Income", { unit: "SGD/year", max: 500000 }),
    ],
    calcResult: { label: "Total Tax on Dividends", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("taxOnSgDividend", "Tax on Singapore Company Dividend"),
      sgdResult("taxableForeignDividend", "Taxable Foreign Dividend"),
      sgdResult("taxOnForeignDividend", "Tax on Foreign Dividend"),
      sgdResult("totalDividendIncome", "Total Dividend Income Received"),
      sgdResult("totalTax", "Total Tax on Dividends", { highlight: true }),
    ],
    instructions:
      "Enter your dividends from Singapore resident companies and any foreign-sourced dividends separately. " +
      "Under Singapore's one-tier corporate tax system, dividends from Singapore resident companies are ALWAYS " +
      "tax-exempt to you — the company's own 17% corporate tax is treated as final, so there's no further tax " +
      "on the dividend itself.\n\n" +
      "Foreign-sourced dividends are ALSO generally exempt, with one exception: if received through a Singapore " +
      "partnership (rather than directly or through a company), they're taxable at your marginal rate.",
    examples:
      "Example: $20,000 from a Singapore company plus $5,000 foreign-sourced, received directly (not through a " +
      "partnership), owes $0.00 tax on both — receiving that SAME $5,000 foreign dividend through a Singapore " +
      "partnership instead owes $575.00 tax on it, stacked on $100,000 other income.",
    assumptions:
      "This calculator confirms Singapore's one-tier exemption for resident company dividends and the general " +
      "exemption for foreign-sourced dividends, both from iras.gov.sg, current as of 2026. It doesn't model the " +
      "specific conditions for the Foreign-Sourced Income exemption scheme (which can affect other foreign " +
      "income types, like branch profits or service income) beyond the dividend/partnership rule shown here.\n\n" +
      NO_DIVIDEND_TAX_NOTE +
      "\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "Why are Singapore dividends tax-exempt?",
        answer:
          "Singapore uses a \"one-tier\" corporate tax system — the company already pays 17% corporate tax on " +
          "its profits before distributing dividends, and that tax is treated as final. Taxing the dividend " +
          "again in the shareholder's hands would be double taxation, which the one-tier system is specifically " +
          "designed to avoid.",
      },
      {
        question: "Are REIT distributions taxed the same way?",
        answer:
          "Generally yes — REIT income distributions to individual investors are typically not taxable, with " +
          "similar exceptions for income received through a partnership or from carrying on a trade/business in " +
          "REITs, mirroring the ordinary dividend treatment shown here.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 10. Singapore Rental Income Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "singapore-rental-income-tax-calculator",
    title: "Singapore Rental Income Tax Calculator",
    description: "Calculate tax on rental profit using the 15% deemed rental expense scheme or actual expenses.",
    metaTitle: "Singapore Rental Income Tax Calculator — Free & Instant",
    metaDescription:
      "Free Singapore rental income tax calculator. Enter your rental income and expenses to see tax on your " +
      "rental profit.",
    calcInputs: [
      sgdField("grossRent", "Gross Annual Rent", { unit: "SGD/year", max: 300000 }),
      sgdField("mortgageInterest", "Mortgage Interest Paid", { unit: "SGD/year", max: 150000 }),
      yesNoField("useDeemedExpenses", "Use the 15% Deemed Rental Expense Scheme?", { defaultYes: true }),
      sgdField("actualExpenses", "Actual Expenses (If Not Using Deemed Scheme)", { unit: "SGD/year", max: 150000 }),
      sgdField("otherTaxableIncome", "Other Taxable Income", { unit: "SGD/year", max: 500000 }),
    ],
    calcResult: { label: "Tax on Rental Profit", format: "currency", currency: "SGD" },
    calcResults: [
      sgdResult("deductibleExpenses", "Total Deductible Expenses"),
      sgdResult("rentalProfit", "Rental Profit"),
      sgdResult("taxOnRental", "Tax on Rental Profit", { highlight: true }),
      sgdResult("netRentalIncome", "Net Rental Income After Tax"),
    ],
    instructions:
      "Enter your gross rent, mortgage interest, and your other taxable income. Rental income is added to your " +
      "other income and taxed at ordinary resident rates. For expenses, you can either use the 15% deemed " +
      "rental expense scheme — a simple flat deduction pre-filled on your tax return, in lieu of tracking " +
      "actual costs — or claim actual expenses instead; either way, mortgage interest is claimed IN FULL on " +
      "top, separately.",
    examples:
      "Example: $36,000 gross rent with $8,000 mortgage interest, using the 15% deemed scheme (against $80,000 " +
      "other income), deducts $13,400.00 total ($5,400 deemed + $8,000 interest), leaving $22,600.00 rental " +
      "profit taxed at $2,599.00, for $20,001.00 net rental income.",
    assumptions:
      "This calculator uses the confirmed 15% deemed rental expense scheme (still available, pre-filled by " +
      "IRAS) and the rule that mortgage interest is claimed in full on top of either the deemed or actual " +
      "expense figure, both from iras.gov.sg. It doesn't model the conditions that disqualify the deemed scheme " +
      "(income via a partnership, property held in trust, non-residential planning permission) — check " +
      "iras.gov.sg if any of those apply to you.\n\n" +
      SG_DISCLAIMER,
    faq: [
      {
        question: "Can I claim my full mortgage payment?",
        answer:
          "No — only the INTEREST portion of your mortgage payment is deductible, whether you use the deemed " +
          "expense scheme or claim actual expenses. The principal repayment portion isn't a deductible expense.",
      },
      {
        question: "Which scheme should I use — deemed or actual?",
        answer:
          "The 15% deemed scheme is simpler and often favorable if your genuine non-interest expenses (repairs, " +
          "maintenance, agent fees, etc.) are below 15% of your gross rent — if your actual costs are higher, " +
          "claiming actual expenses may reduce your tax further. You must apply the same choice consistently " +
          "across all residential properties you own in the same Year of Assessment.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:create-singapore-tool" first, then ` +
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
