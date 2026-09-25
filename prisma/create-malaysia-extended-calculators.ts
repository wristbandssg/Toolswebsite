// One-time (but safe to re-run) batch setup script: creates 10 more Tools
// under the EXISTING "Malaysia Tax & Salary Calculators" category (slug
// "malaysia-tax-salary-calculators", created by create-malaysia-tax-tool.ts
// — this script does NOT create the category; it fails loudly if it's
// missing).
//
// See src/lib/calc-engine-malaysia-extended-calculators.ts for the actual
// math and which of its exported functions each of these 10 slugs maps to,
// and that file's header for the kwsp.gov.my/perkeso.gov.my/hasil.gov.my/
// mysst.customs.gov.my source notes — including why the "Capital Gains Tax
// Calculator" is an honest explainer (individuals are entirely excluded
// from Malaysia's CGT regime) rather than a duplicate of the Real Property
// Gains Tax tool.
//
// HOW TO RUN
//   npx tsx prisma/create-malaysia-extended-calculators.ts
// or
//   npm run db:create-malaysia-extended-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "malaysia-tax-salary-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function myrField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit ?? "MYR",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 5000000,
    step: opts.step ?? 100,
  };
}

function myrResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", currency: "MYR", unit: opts.unit, highlight: opts.highlight };
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

const MY_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified tax adviser or the Inland Revenue Board " +
  "(LHDN).";

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
  // 1. Malaysia EPF Calculator
  // -------------------------------------------------------------------
  {
    slug: "malaysia-epf-calculator",
    title: "Malaysia EPF Calculator",
    description: "Calculate EPF (KWSP) employee and employer contributions based on citizenship status and age.",
    metaTitle: "Malaysia EPF Calculator (KWSP) — Free & Instant",
    metaDescription:
      "Free Malaysia EPF/KWSP calculator. Enter your monthly wage, category, and age to see your employee and " +
      "employer contribution split.",
    calcInputs: [
      myrField("monthlyWage", "Monthly Wage", { unit: "MYR/month", max: 100000 }),
      {
        key: "employeeCategory",
        label: "Employee Category",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Malaysian Citizen / PR / Non-Malaysian Registered Before 1 Aug 1998", value: 0 },
          { label: "Non-Malaysian Registered On/After 1 Aug 1998", value: 1 },
        ],
      },
      yesNoField("isAge60Plus", "Age 60 or Above?"),
    ],
    calcResult: { label: "Total Monthly EPF Contribution", format: "currency", currency: "MYR" },
    calcResults: [
      myrResult("employeeContribution", "Employee Contribution"),
      myrResult("employerContribution", "Employer Contribution"),
      myrResult("totalContribution", "Total Monthly Contribution", { highlight: true }),
      myrResult("akaunPersaraan", "→ Akaun Persaraan (75%)"),
      myrResult("akaunSejahtera", "→ Akaun Sejahtera (15%)"),
      myrResult("akaunFleksibel", "→ Akaun Fleksibel (10%)"),
    ],
    instructions:
      "Enter your monthly wage, employee category, and whether you're 60 or above. Malaysian citizens under 60 " +
      "contribute 11% (employee) while employers contribute 13% for wages up to RM5,000/month, or 12% above " +
      "that. Citizens 60+ don't need to contribute themselves, but employers still contribute 4%.\n\n" +
      "Non-Malaysian employees registered on or after 1 August 1998 contribute a flat 2% each side, at any age " +
      "— this became MANDATORY only from 1 October 2025 (previously often voluntary/employer-discretionary), so " +
      "if you're a foreign worker whose employer wasn't contributing before, that should now have changed.\n\n" +
      "Every contribution splits automatically into three accounts under the May 2024 restructuring: Akaun " +
      "Persaraan (75%, locked until age 55), Akaun Sejahtera (15%, for pre-retirement needs like housing/" +
      "education/healthcare), and Akaun Fleksibel (10%, withdrawable anytime).",
    examples:
      "Example: a citizen under 60 earning RM4,000/month has an RM440.00 employee and RM520.00 employer " +
      "contribution — RM960.00 total monthly, split RM720.00/RM144.00/RM96.00 across the three accounts.",
    assumptions:
      "This calculator uses the confirmed current EPF contribution rates from kwsp.gov.my, including the newly-" +
      "mandatory 2%/2% rate for non-Malaysian employees registered on/after 1 August 1998 (effective 1 October " +
      "2025). Permanent residents and non-Malaysians registered BEFORE 1 August 1998 who are 60+ actually have a " +
      "slightly different schedule (5.5% employee / 6.5%-or-6% employer) from citizens 60+ (0%/4%) — this tool " +
      "uses the citizen 60+ rates for that first category option as the common case; if you're specifically a " +
      "pre-1998 PR/foreign worker aged 60+, your employer contribution may differ slightly from the figure " +
      "shown. It doesn't apply an upper salary ceiling (none exists for the percentage method above RM20,000/" +
      "month).\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "Do all foreign workers have to contribute to EPF now?",
        answer:
          "As of 1 October 2025, yes — non-Malaysian employees registered on or after 1 August 1998 now have " +
          "MANDATORY 2% employee / 2% employer EPF contributions, a significant change from the earlier system " +
          "where employer contributions for foreign workers were often discretionary.",
      },
      {
        question: "What are the three EPF accounts?",
        answer:
          "Since the May 2024 restructuring, every contribution splits into Akaun Persaraan (75%, locked until " +
          "age 55, for retirement), Akaun Sejahtera (15%, withdrawable for specific pre-retirement needs like " +
          "housing, education, or healthcare), and Akaun Fleksibel (10%, withdrawable anytime with a minimum " +
          "RM50 withdrawal).",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 2. Malaysia SOCSO Calculator
  // -------------------------------------------------------------------
  {
    slug: "malaysia-socso-calculator",
    title: "Malaysia SOCSO Calculator",
    description: "Estimate SOCSO (PERKESO) employee and employer contributions using the current wage ceiling.",
    metaTitle: "Malaysia SOCSO Calculator (PERKESO) — Free & Instant",
    metaDescription:
      "Free Malaysia SOCSO/PERKESO calculator. Estimate your Employment Injury and Invalidity Pension Scheme " +
      "contributions using the current RM6,000 wage ceiling.",
    calcInputs: [
      myrField("monthlyWage", "Monthly Wage", { unit: "MYR/month", max: 100000 }),
      yesNoField("isAge60Plus", "Age 60 or Above (or First Registered at 55+)?"),
    ],
    calcResult: { label: "Total Monthly SOCSO Contribution", format: "currency", currency: "MYR" },
    calcResults: [
      myrResult("employeeContribution", "Employee Contribution"),
      myrResult("employerContribution", "Employer Contribution"),
      myrResult("totalContribution", "Total Monthly Contribution", { highlight: true }),
    ],
    instructions:
      "Enter your monthly wage and whether you're 60+ (or were first registered with SOCSO at 55 or older). " +
      "Under 60 (Category 1 — Employment Injury + Invalidity Pension), employers contribute 1.75% and employees " +
      "0.5%. At 60+ (Category 2 — Employment Injury Scheme only), only the employer contributes, at 1.25%, with " +
      "no employee share. Both categories share the same RM6,000/month wage ceiling, raised from RM5,000 " +
      "effective 1 October 2024.",
    examples:
      "Example: an under-60 employee earning RM8,000/month has their wage capped at RM6,000 for SOCSO purposes " +
      "— RM30.00 employee and RM105.00 employer contribution, RM135.00 total monthly.",
    assumptions:
      "This calculator uses the confirmed Category 1/Category 2 percentage rates and the RM6,000 wage ceiling " +
      "(effective 1 October 2024) from perkeso.gov.my. SOCSO's ACTUAL contribution schedule is a fixed wage-band " +
      "table with rounded cent amounts per band, not a pure percentage calculation — this tool uses the " +
      "equivalent percentage rates as a close estimate, so your exact PERKESO bill may differ by a small amount " +
      "from the wage-band table.\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "Why might my actual SOCSO amount differ slightly from this calculator?",
        answer:
          "PERKESO's official contribution schedule uses fixed wage-band tables with specific rounded amounts " +
          "for each wage range, rather than a pure percentage multiplication — this calculator uses the " +
          "equivalent percentage rates as a very close estimate, so small differences (usually a few ringgit) " +
          "from the exact official table are possible.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 3. Malaysia EIS Calculator
  // -------------------------------------------------------------------
  {
    slug: "malaysia-eis-calculator",
    title: "Malaysia EIS Calculator",
    description: "Calculate Employment Insurance System (EIS) contributions using the current 0.2%/0.2% rate and wage ceiling.",
    metaTitle: "Malaysia EIS Calculator — Free & Instant",
    metaDescription:
      "Free Malaysia EIS (Employment Insurance System) calculator using the current 0.2% employee / 0.2% " +
      "employer rate and RM6,000 wage ceiling.",
    calcInputs: [myrField("monthlyWage", "Monthly Wage", { unit: "MYR/month", max: 100000 })],
    calcResult: { label: "Total Monthly EIS Contribution", format: "currency", currency: "MYR" },
    calcResults: [
      myrResult("employeeContribution", "Employee Contribution"),
      myrResult("employerContribution", "Employer Contribution"),
      myrResult("totalContribution", "Total Monthly Contribution", { highlight: true }),
    ],
    instructions:
      "Enter your monthly wage. EIS (which funds unemployment benefits and job-search assistance) is a small, " +
      "flat 0.2% employee plus 0.2% employer contribution, sharing the same RM6,000/month wage ceiling as SOCSO " +
      "(raised from RM5,000 effective 1 October 2024).",
    examples: "Example: a RM4,000/month wage owes RM8.00 employee and RM8.00 employer EIS contribution — RM16.00 total monthly.",
    assumptions:
      "This calculator uses the confirmed 0.2%/0.2% EIS rate and the RM6,000 wage ceiling (effective 1 October " +
      "2024, shared with SOCSO) from perkeso.gov.my.\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "What does EIS actually fund?",
        answer:
          "The Employment Insurance System provides temporary financial assistance, job-search allowances, and " +
          "re-employment training for employees who lose their jobs — it's separate from SOCSO's employment " +
          "injury and invalidity coverage, though both are administered by PERKESO and share the same wage " +
          "ceiling.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 4. Malaysia PCB Calculator (Monthly Tax Deduction)
  // -------------------------------------------------------------------
  {
    slug: "malaysia-pcb-calculator",
    title: "Malaysia PCB Calculator",
    description: "Estimate monthly PCB (Potongan Cukai Bulanan / Monthly Tax Deduction) withheld from your salary.",
    metaTitle: "Malaysia PCB Calculator (Monthly Tax Deduction) — Free & Instant",
    metaDescription:
      "Free Malaysia PCB calculator. Estimate your Monthly Tax Deduction using annualized progressive tax " +
      "brackets and EPF relief.",
    calcInputs: [
      myrField("monthlyGrossPay", "Monthly Gross Pay", { unit: "MYR/month", max: 200000 }),
      myrField("monthlyEpfContribution", "Monthly EPF Contribution (Employee Share)", { unit: "MYR/month", max: 20000 }),
    ],
    calcResult: { label: "Estimated Monthly PCB", format: "currency", currency: "MYR" },
    calcResults: [
      myrResult("estimatedMonthlyPcb", "Estimated Monthly PCB", { highlight: true }),
      myrResult("estimatedAnnualTax", "Estimated Annual Tax"),
      myrResult("netMonthlyPay", "Estimated Net Monthly Pay"),
    ],
    instructions:
      "Enter your monthly gross pay and monthly EPF employee contribution. PCB (Potongan Cukai Bulanan) is the " +
      "tax your employer withholds from your salary each month, as an advance toward your final annual income " +
      "tax bill — this tool estimates it by annualizing your monthly pay, applying the Individual Relief and " +
      "EPF relief (capped at RM7,000/year), computing tax at the standard progressive rates, then dividing back " +
      "by 12.",
    examples:
      "Example: RM6,000 monthly gross pay with RM600 monthly EPF contribution has an estimated RM180.00 monthly " +
      "PCB (RM2,160.00 annualized tax ÷ 12), for RM5,220.00 estimated net monthly pay.",
    assumptions:
      "This is an ESTIMATE using the same annual progressive tax brackets as the main Malaysia Income Tax " +
      "Calculator (hasil.gov.my), annualized and divided by 12 — it is NOT LHDN's exact Computerized Calculation " +
      "Method formula, which the actual PCB Schedule/formula applies, and which includes additional rounding " +
      "rules, bonus/lump-sum handling, and other reliefs (spouse, child, and more) not modeled here. Your actual " +
      "employer-withheld PCB may differ from this estimate — treat it as a planning figure, not your exact " +
      "payslip amount.\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "Is PCB my final tax for the year?",
        answer:
          "No — PCB is only an advance monthly withholding toward your final annual tax liability. When you " +
          "file your annual tax return (Form BE), your actual tax is calculated considering your full income " +
          "and all eligible reliefs, and any difference between total PCB withheld and your actual liability is " +
          "refunded or additionally owed.",
      },
      {
        question: "Why might my actual PCB differ from this estimate?",
        answer:
          "LHDN's official Computerized Calculation Method / PCB Schedule includes additional adjustment rules " +
          "— rounding conventions, special handling for bonuses and other lump-sum payments, and reliefs like " +
          "spouse and child relief that this simplified estimate doesn't model — so your actual payslip PCB may " +
          "differ somewhat from this planning estimate.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 5. Malaysia SST Calculator
  // -------------------------------------------------------------------
  {
    slug: "malaysia-sst-calculator",
    title: "Malaysia SST Calculator",
    description: "Add or extract Sales Tax or Service Tax using Malaysia's current SST rates.",
    metaTitle: "Malaysia SST Calculator — Free & Instant",
    metaDescription:
      "Free Malaysia SST calculator covering current Sales Tax (5%/10%) and Service Tax (6%/8%) rates. Add or " +
      "extract SST from a price.",
    calcInputs: [
      myrField("amount", "Amount", { unit: "MYR", max: 5000000, step: 10 }),
      {
        key: "taxType",
        label: "Tax Type",
        type: "dropdown",
        required: true,
        default: 2,
        options: [
          { label: "Sales Tax — Exempt (0%)", value: 0 },
          { label: "Sales Tax — 5% (Select Goods)", value: 1 },
          { label: "Sales Tax — 10% (Standard/Default Goods)", value: 2 },
          { label: "Service Tax — 8% (General/Default Rate)", value: 3 },
          { label: "Service Tax — 6% (F&B, Telecoms, Parking, Logistics)", value: 4 },
        ],
      },
      yesNoField("isInclusive", "Is the Amount Already Tax-Inclusive?"),
    ],
    calcResult: { label: "Tax Amount", format: "currency", currency: "MYR" },
    calcResults: [
      myrResult("netAmount", "Net Amount (Excluding Tax)"),
      myrResult("taxAmount", "Tax Amount", { highlight: true }),
      myrResult("grossAmount", "Gross Amount (Including Tax)"),
      percentResult("rateUsed", "Rate Used"),
    ],
    instructions:
      "Enter an amount, choose the tax type that applies, and say whether the amount already includes tax. " +
      "Malaysia's Sales and Service Tax has two separate tracks: Sales Tax (5% for select goods like some " +
      "foodstuffs and construction materials, 10% standard for most other taxable goods), and Service Tax (8% " +
      "general/default rate since 1 March 2024, with 6% retained for food & beverage, telecommunications, " +
      "parking, and logistics services). A 1 July 2025 expansion broadened SST's scope to thousands more goods " +
      "and services, including rental/leasing and construction services above certain thresholds.",
    examples: "Example: a RM1,000 price at the 10% standard Sales Tax rate owes RM100.00 tax, for a RM1,100.00 tax-inclusive total.",
    assumptions:
      "This calculator uses the confirmed general Sales Tax (5%/10%) and Service Tax (8%/6%) rate structure " +
      "from mysst.customs.gov.my, including the Service Tax rate increase to 8% (effective 1 March 2024, Budget " +
      "2024). The exact goods-category-to-rate mapping is set by detailed RMCD legal schedules (Sales Tax Order " +
      "and Goods Exempted Order) — this tool lets you pick the general rate tier directly rather than " +
      "classifying your specific product or service for you; confirm your item's exact classification against " +
      "the official RMCD schedule if you're unsure which rate applies.\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "What changed in the 1 July 2025 SST expansion?",
        answer:
          "The scope of SST broadened to cover thousands more goods and services categories, including rental " +
          "and leasing (above a RM1 million threshold), construction services, financial services (also above a " +
          "RM1 million threshold), and private healthcare/education for non-citizens — mostly at the standard " +
          "current rates shown in this calculator.",
      },
      {
        question: "How do I know which rate applies to my specific product?",
        answer:
          "The exact classification is set out in RMCD's detailed legal orders (the Sales Tax Order and Goods " +
          "Exempted Order) — this calculator lets you select the general rate tier once you know it, but doesn't " +
          "classify a specific product or service for you. Check the official RMCD schedule or consult a tax " +
          "adviser if you're unsure.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 6. Malaysia Capital Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "malaysia-capital-gains-tax-calculator",
    title: "Malaysia Capital Gains Tax Calculator",
    description: "See why Malaysia's Capital Gains Tax excludes individuals entirely, and calculate it for companies/LLPs.",
    metaTitle: "Malaysia Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free Malaysia CGT tool. Individuals are entirely excluded from Malaysia's Capital Gains Tax — see why, " +
      "and calculate the rate for companies and LLPs.",
    calcInputs: [
      myrField("gainAmount", "Capital Gain Amount", { unit: "MYR", max: 50000000 }),
      yesNoField("isCompanyOrLlp", "Is the Seller a Company, LLP, Trust Body, or Co-operative?"),
      yesNoField("acquiredBefore2024", "Shares Acquired Before 1 Jan 2024? (Companies/LLPs Only)"),
      yesNoField("electGrossBasis", "Elect 2% Gross-Disposal-Price Basis? (Pre-2024 Shares Only)"),
      myrField("grossDisposalPrice", "Gross Disposal Price (For 2% Election Only)", { unit: "MYR", max: 50000000, required: false }),
    ],
    calcResult: { label: "Tax on Gain", format: "currency", currency: "MYR" },
    calcResults: [
      { key: "isSubjectToCgt", label: "Subject to CGT?", format: "number" },
      myrResult("taxableGain", "Taxable Gain"),
      myrResult("taxOnGain", "Tax on Gain", { highlight: true }),
      myrResult("netGain", "Net Gain After Tax"),
    ],
    instructions:
      "Malaysia's Capital Gains Tax (effective 1 January 2024) applies ONLY to companies, LLPs, trust bodies, " +
      "and co-operative societies disposing of unlisted shares (or certain foreign capital assets) — " +
      "INDIVIDUALS are entirely excluded from this regime and owe no CGT on share disposals of any kind. " +
      "(Individuals disposing of REAL PROPERTY or shares in a real property company have a separate, older " +
      "liability — Real Property Gains Tax — see the RPGT Calculator instead.)\n\n" +
      "For companies/LLPs, the standard rate is 10% on the net gain. For shares acquired BEFORE 1 January 2024, " +
      "the disposer can instead elect a flat 2% on the gross disposal price — enter the gross disposal price to " +
      "compare that election.",
    examples:
      "Example: an individual with a RM500,000 gain on unlisted shares owes RM0.00 CGT — is simply not subject " +
      "to the tax at all. The SAME RM500,000 gain for a company (shares acquired after 2024) instead owes " +
      "RM50,000.00 CGT (10% net-gain basis).",
    assumptions:
      "This calculator reflects Malaysia's confirmed CGT scope from hasil.gov.my and cross-checked against EY/" +
      "PwC guidance: Section 4(aa) of the Income Tax Act 1967 (effective 1 January 2024) limits chargeable " +
      "persons to companies, LLPs, trust bodies, and co-operative societies — individuals and partnerships are " +
      "excluded entirely, even for unlisted shares. Listed shares are excluded from CGT for everyone. It doesn't " +
      "model the foreign-sourced-gain economic-substance exemption available to in-scope entities.\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "Do individuals pay any capital gains tax in Malaysia?",
        answer:
          "Not under Malaysia's CGT regime — individuals are entirely outside its scope, even when disposing of " +
          "unlisted shares. The one gains-related tax individuals DO face is Real Property Gains Tax, a " +
          "separate, older regime that applies specifically to real property (and shares in real-property " +
          "companies) — see the RPGT Calculator for that.",
      },
      {
        question: "What's the 2% election for pre-2024 shares?",
        answer:
          "Companies and LLPs disposing of unlisted shares acquired before 1 January 2024 can choose between " +
          "10% on the net gain (the standard basis) or a flat 2% on the gross disposal price — whichever works " +
          "out cheaper depends on the specific numbers, so it's worth comparing both.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 7. Malaysia Real Property Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "malaysia-real-property-gains-tax-calculator",
    title: "Malaysia Real Property Gains Tax Calculator",
    description: "Calculate RPGT on a property disposal using the current holding-period rate schedule.",
    metaTitle: "Malaysia RPGT Calculator — Free & Instant",
    metaDescription:
      "Free Malaysia Real Property Gains Tax calculator using the current holding-period rate schedule for " +
      "citizens/PRs and non-citizens.",
    calcInputs: [
      myrField("disposalPrice", "Disposal Price", { unit: "MYR", max: 50000000, step: 1000 }),
      myrField("acquisitionPrice", "Acquisition Price", { unit: "MYR", max: 50000000, step: 1000 }),
      {
        key: "yearsHeld",
        label: "Years Held",
        type: "number",
        required: true,
        default: 3,
        min: 0,
        max: 50,
        step: 1,
      },
      yesNoField("isCitizenOrPr", "Malaysian Citizen or Permanent Resident?", { defaultYes: true }),
    ],
    calcResult: { label: "RPGT Payable", format: "currency", currency: "MYR" },
    calcResults: [
      myrResult("chargeableGain", "Chargeable Gain"),
      myrResult("exemption", "Exemption (RM10,000 or 10%, Whichever Greater)"),
      myrResult("netChargeableGain", "Net Chargeable Gain"),
      percentResult("rateUsed", "RPGT Rate Applied"),
      myrResult("rpgtPayable", "RPGT Payable", { highlight: true }),
      myrResult("netProceeds", "Net Proceeds After RPGT"),
    ],
    instructions:
      "Enter the disposal price, acquisition price, how many years you held the property, and your citizenship/" +
      "residency status. RPGT rates depend on holding period: citizens and PRs pay 30% in years 1–3, tapering to " +
      "20% (year 4), 15% (year 5), and 0% from year 6 onward. Non-citizens and companies pay a flat 30% through " +
      "year 5, dropping to only 10% from year 6 onward (never reaching 0%).\n\n" +
      "Every individual disposal gets an exemption of RM10,000 or 10% of the chargeable gain, whichever is " +
      "GREATER, applied before the rate. A separate once-in-a-lifetime full exemption is also available for " +
      "disposing of a private residence (citizens/PRs only) — not modeled here since it's an irrevocable " +
      "election you make separately with LHDN.",
    examples:
      "Example: a citizen selling in year 2 with a RM300,000 gain has a RM30,000.00 exemption (10% of gain, " +
      "greater than the RM10,000 flat amount), leaving RM270,000.00 net chargeable gain taxed at 30% — " +
      "RM81,000.00 RPGT payable. The SAME sale in year 7 instead owes RM0.00 (0% rate from year 6 onward).",
    assumptions:
      "This calculator uses the confirmed current RPGT rate schedule from hasil.gov.my: the citizen/PR schedule " +
      "effective 1 January 2022 (0% restored from year 6), and the non-citizen/company schedule effective 1 " +
      "January 2019. It doesn't model the separate once-in-a-lifetime private residence exemption, which " +
      "requires its own irrevocable election with LHDN and isn't captured by a simple calculator.\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "Why is the rate so much higher for non-citizens after year 6?",
        answer:
          "Malaysia's RPGT schedule treats non-citizens and companies less favourably long-term — while " +
          "citizens and PRs pay 0% from year 6 onward, non-citizens and companies still pay 10%, reflecting " +
          "policy aimed at curbing speculative property investment by non-residents.",
      },
      {
        question: "Is there any other RPGT exemption besides the automatic one?",
        answer:
          "Yes — Malaysian citizens and PRs get a separate ONCE-IN-A-LIFETIME full exemption when disposing of " +
          "their own private residence, but this requires an irrevocable written election filed with LHDN and " +
          "isn't automatically applied — this calculator only models the standard exemption available on every " +
          "disposal.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 8. Malaysia Stamp Duty Calculator
  // -------------------------------------------------------------------
  {
    slug: "malaysia-stamp-duty-calculator",
    title: "Malaysia Stamp Duty Calculator",
    description: "Calculate stamp duty on a property transfer (MOT) and loan agreement, including the first-time buyer exemption.",
    metaTitle: "Malaysia Stamp Duty Calculator — Free & Instant",
    metaDescription:
      "Free Malaysia stamp duty calculator covering property transfer (MOT) ad valorem rates, loan agreement " +
      "duty, and the first-time homebuyer exemption.",
    calcInputs: [
      myrField("propertyValue", "Property Value", { unit: "MYR", max: 20000000, step: 1000 }),
      myrField("loanAmount", "Loan/Financing Amount", { unit: "MYR", max: 20000000, step: 1000, required: false }),
      yesNoField("isFirstTimeBuyer", "First-Time Malaysian Homebuyer, Property ≤ RM500,000?"),
    ],
    calcResult: { label: "Total Stamp Duty", format: "currency", currency: "MYR" },
    calcResults: [
      myrResult("motDuty", "Memorandum of Transfer (MOT) Duty"),
      myrResult("loanDuty", "Loan/Financing Agreement Duty"),
      myrResult("totalStampDuty", "Total Stamp Duty", { highlight: true }),
      { key: "isExempt", label: "First-Time Buyer Exemption Applied?", format: "number" },
    ],
    instructions:
      "Enter the property value, loan amount, and whether you qualify for the first-time Malaysian homebuyer " +
      "exemption. The Memorandum of Transfer (MOT) is charged at 1% on the first RM100,000, 2% on the next " +
      "RM400,000, 3% on the next RM500,000, and 4% above RM1,000,000. Loan/financing agreements are charged " +
      "separately at a flat 0.5% of the loan amount.\n\n" +
      "First-time Malaysian citizen homebuyers get a FULL exemption on both MOT and loan agreement duty for " +
      "properties priced up to RM500,000 — Budget 2026 extended this exemption through 31 December 2027.",
    examples:
      "Example: a RM700,000 property with a RM600,000 loan (not first-time-buyer-exempt) owes RM15,000.00 MOT " +
      "duty plus RM3,000.00 loan duty — RM18,000.00 total. The SAME RM450,000 purchase for an eligible first-" +
      "time buyer instead owes RM0.00, fully exempt.",
    assumptions:
      "This calculator uses the confirmed general ad valorem MOT tiers, the 0.5% loan/financing instrument " +
      "rate, and the first-time-homebuyer exemption (extended to 31 December 2027 per Budget 2026), all " +
      "corroborated across current sources referencing the Stamp Act 1949 (as amended) and recent Budget " +
      "announcements. It does NOT include a foreign-buyer stamp duty surcharge rate reported in some property-" +
      "industry sources, since that figure could only be corroborated by secondary sources rather than an " +
      "official gazette/LHDN rate table at the time of writing — verify any foreign-buyer surcharge directly " +
      "with LHDN or your solicitor.\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "Does the first-time buyer exemption cover the loan agreement too?",
        answer:
          "Yes — the exemption covers BOTH the Memorandum of Transfer stamp duty and the loan/financing " +
          "agreement stamp duty, for properties priced up to RM500,000, for Malaysian citizens buying their " +
          "first residential property. Budget 2026 extended the exemption period through 31 December 2027.",
      },
      {
        question: "Is there an extra stamp duty rate for foreign buyers?",
        answer:
          "Some property-industry sources report a foreign-buyer stamp duty surcharge, but this calculator " +
          "doesn't include it since the figure couldn't be confirmed against an official primary source at the " +
          "time of writing — if you're a non-Malaysian buyer, confirm the current rate directly with LHDN or " +
          "your solicitor before relying on any estimate.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 9. Malaysia Rental Income Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "malaysia-rental-income-tax-calculator",
    title: "Malaysia Rental Income Tax Calculator",
    description: "Calculate the extra income tax owed on rental income, after allowable deductions, stacked on your other income.",
    metaTitle: "Malaysia Rental Income Tax Calculator — Free & Instant",
    metaDescription:
      "Free Malaysia rental income tax calculator. See net rental income after allowable deductions, and the " +
      "extra tax it adds stacked on your other income.",
    calcInputs: [
      myrField("annualGrossRent", "Annual Gross Rent", { unit: "MYR/year", max: 2000000 }),
      myrField("mortgageInterest", "Mortgage Interest Paid", { unit: "MYR/year", max: 1000000, required: false }),
      myrField("quitRentAndAssessment", "Quit Rent & Assessment", { unit: "MYR/year", max: 100000, required: false }),
      myrField("repairs", "Repairs & Maintenance", { unit: "MYR/year", max: 500000, required: false }),
      myrField("agentCommission", "Agent's Commission", { unit: "MYR/year", max: 200000, required: false }),
      myrField("otherTaxableIncome", "Other Taxable Income (Before Relief)", { unit: "MYR/year", max: 5000000 }),
    ],
    calcResult: { label: "Extra Tax From Rental Income", format: "currency", currency: "MYR" },
    calcResults: [
      myrResult("netRentalIncome", "Net Rental Income (After Deductions)"),
      myrResult("allowableDeductions", "Total Allowable Deductions"),
      myrResult("taxAttributableToRental", "Extra Tax From Rental Income", { highlight: true }),
    ],
    instructions:
      "Enter your annual gross rent, allowable expenses, and your other taxable income. Rental income for " +
      "individuals not running a property-letting business is taxed as ordinary income — added to your other " +
      "income and taxed at the same progressive rates, after deducting genuinely allowable expenses: mortgage/" +
      "loan interest, quit rent and assessment, repairs and maintenance (not capital improvements), and agent's " +
      "commission.",
    examples:
      "Example: RM60,000 gross rent with RM28,000 total allowable deductions nets RM32,000.00 rental income — " +
      "stacked on RM100,000 other income, this adds RM7,460.00 extra tax versus having no rental income at all.",
    assumptions:
      "This calculator uses the confirmed standard treatment of rental income as ordinary progressive-rate " +
      "income for individuals, with the standard list of allowable deductions confirmed via general LHDN " +
      "guidance (a dedicated Public Ruling covers the full detail). It does NOT include any special below-" +
      "market-rent exemption — an earlier such incentive for landlords renting to SMEs at reduced rates could " +
      "not be confirmed as still in force for the current year, so it's treated as discontinued rather than " +
      "assumed to still apply. It also doesn't model the property being reclassified as a rental BUSINESS " +
      "(letting 4+ properties, or with substantial additional services), which uses different rules.\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "Can I deduct capital improvements to the property?",
        answer:
          "No — only repairs and maintenance that restore the property to its original condition are " +
          "deductible; capital improvements (renovations that enhance or extend the property beyond its " +
          "original state) are not deductible against rental income, though they may affect your cost basis for " +
          "a future property sale.",
      },
      {
        question: "Is there still a special exemption for renting below market rate?",
        answer:
          "This calculator doesn't include one — an earlier incentive along these lines couldn't be confirmed " +
          "as still current, so it's been left out rather than guessed at. If you believe a specific exemption " +
          "applies to your situation, confirm directly with LHDN or a tax adviser before relying on it.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 10. Malaysia Dividend Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "malaysia-dividend-tax-calculator",
    title: "Malaysia Dividend Tax Calculator",
    description: "Calculate the new 2% tax on dividend income above RM100,000/year for individual shareholders.",
    metaTitle: "Malaysia Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free Malaysia dividend tax calculator for the new 2% tax on individual dividend income above RM100,000, " +
      "effective YA2025.",
    calcInputs: [
      myrField("dividendAmount", "Dividend Income", { unit: "MYR/year", max: 20000000 }),
      yesNoField("isExemptSource", "From an Exempt Source? (EPF, ASNB/Unit Trust, Foreign-Sourced)"),
    ],
    calcResult: { label: "Tax on Dividend", format: "currency", currency: "MYR" },
    calcResults: [
      myrResult("taxableDividend", "Taxable Dividend (Above RM100,000)"),
      myrResult("taxOnDividend", "Tax on Dividend", { highlight: true }),
      myrResult("netDividend", "Net Dividend After Tax"),
    ],
    instructions:
      "Enter your dividend income and say whether it's from an exempt source. A NEW 2% tax applies to " +
      "individual shareholders' dividend income (from listed or unlisted Malaysian companies) that exceeds " +
      "RM100,000 in a year, effective Year of Assessment 2025 — the RM100,000 threshold is deducted first, and " +
      "only the amount ABOVE it is taxed at 2%.\n\n" +
      "Several dividend sources are specifically EXEMPT from this tax, as clarified by LHDN: EPF distributions, " +
      "ASNB/Amanah Saham Nasional Bumiputera distributions, unit trust fund distributions, and foreign-sourced " +
      "dividends, among others.",
    examples:
      "Example: RM250,000 dividend income from a taxable source has RM150,000.00 taxable (above the RM100,000 " +
      "threshold), owing RM3,000.00 tax (2%) — RM247,000.00 net. The SAME RM250,000 from an exempt source (like " +
      "EPF) instead owes RM0.00.",
    assumptions:
      "This calculator uses the confirmed 2% rate and RM100,000 annual threshold from the Income Tax " +
      "(Determination of Chargeable Income of an Individual in Respect of Dividend) Rules 2025, effective YA2025, " +
      "and IRB's own clarified list of exempt sources (EPF, ASNB/unit trust, foreign-sourced dividends, and " +
      "several others). It applies the threshold once per year total across all taxable dividend sources — it " +
      "doesn't separately track multiple dividend payments across the year, so enter your TOTAL annual dividend " +
      "income from taxable sources.\n\n" +
      MY_DISCLAIMER,
    faq: [
      {
        question: "Are EPF dividends taxed under this new rule?",
        answer:
          "No — EPF dividend distributions are specifically confirmed exempt from the new 2% dividend tax, " +
          "along with ASNB/unit trust distributions and foreign-sourced dividends, among other exempt " +
          "categories IRB has clarified.",
      },
      {
        question: "Does the 2% apply to my whole dividend, or just the amount over RM100,000?",
        answer:
          "Just the amount above RM100,000 — the first RM100,000 of taxable dividend income each year is " +
          "entirely untaxed under this rule, and only the excess is taxed at the flat 2% rate.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:create-malaysia-tool" first, then ` +
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
