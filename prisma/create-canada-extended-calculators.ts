// One-time (but safe to re-run) batch setup script: creates 15 more Tools
// under the EXISTING "Canada Tax & Salary Calculators" category (slug
// "canada-tax-salary-calculators", created by the provincial income tax
// tool scripts, e.g. create-alberta-tax-tool.ts — this script does NOT
// create the category; it fails loudly if it's missing).
//
// See src/lib/calc-engine-canada-extended-calculators.ts for the actual
// math and which of its exported functions each of these 15 slugs maps
// to, and that file's header for the canada.ca/CRA source of every 2026
// figure used, and why the income-tax-based tools here are FEDERAL ONLY
// (see each tool's own Assumptions text too).
//
// HOW TO RUN
//   npx tsx prisma/create-canada-extended-calculators.ts
// or
//   npm run db:create-canada-extended-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "canada-tax-salary-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function cadField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit ?? "CAD",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 300000,
    step: opts.step ?? 500,
  };
}

function cadResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", currency: "CAD", unit: opts.unit, highlight: opts.highlight };
}

function percentResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "percentage", highlight: opts.highlight };
}

const payFrequencyField = {
  key: "payFrequency",
  label: "Pay Frequency",
  type: "dropdown",
  required: true,
  default: 26,
  options: [
    { label: "Weekly (52 paychecks/year)", value: 52 },
    { label: "Biweekly (26 paychecks/year)", value: 26 },
    { label: "Semi-Monthly (24 paychecks/year)", value: 24 },
    { label: "Monthly (12 paychecks/year)", value: 12 },
  ],
};

const otherIncomeField = cadField("otherIncome", "Other Taxable Income (Before This Amount)", {
  unit: "CAD/year",
  max: 250000,
});

const FEDERAL_ONLY_NOTE =
  "This calculator covers FEDERAL tax only. Canada has 13 different provincial/territorial bracket tables " +
  "(see calc-engine-canada.ts's header for why), so a single generic \"Canada\" tool can't correctly add " +
  "provincial tax without knowing which province — for your exact combined federal+provincial figure, use " +
  "your own province's Income Tax Calculator under this category instead.";

const CA_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified accountant or the CRA.";

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
  // 1. Canada CPP Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-cpp-calculator",
    title: "Canada CPP Calculator",
    description: "Calculate your Canada Pension Plan (CPP) contribution from your employment income, including the CPP2 second tier.",
    metaTitle: "Canada CPP Calculator — Free & Instant",
    metaDescription:
      "Free Canada CPP calculator. Enter your annual employment income to see your 2026 CPP contribution, " +
      "including the CPP2 tier.",
    calcInputs: [
      cadField("annualEmploymentIncome", "Annual Employment Income", { unit: "CAD/year", max: 200000 }),
      payFrequencyField,
    ],
    calcResult: { label: "Total CPP Contribution", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("cppBaseContribution", "Base CPP (5.95%)"),
      cadResult("cpp2Contribution", "CPP2 (4%, Above $74,600)"),
      cadResult("totalCppContribution", "Total CPP Contribution", { highlight: true }),
      cadResult("perPeriodContribution", "Per Paycheck"),
    ],
    instructions:
      "Enter your annual employment income and how often you're paid. The Canada Pension Plan deducts 5.95% " +
      "of your income between the $3,500 basic exemption and the $74,600 Year's Maximum Pensionable Earnings " +
      "(YMPE) for 2026. Income above $74,600 (up to $85,000) is also subject to the CPP2 second tier, at 4%.\n\n" +
      "This calculator handles both tiers automatically — enter your income once and see the base contribution, " +
      "the CPP2 top-up (if any), and the combined total.",
    examples:
      "Example: $60,000 of annual employment income owes $3,361.75 in base CPP for the year (no CPP2, since " +
      "$60,000 is below the $74,600 threshold) — $280.15 per biweekly paycheck.",
    assumptions:
      "This calculator uses 2026 CPP figures confirmed via canada.ca: $3,500 basic exemption, $74,600 Year's " +
      "Maximum Pensionable Earnings, 5.95% base rate, and the CPP2 second tier (4% between $74,600 and " +
      "$85,000). It assumes one employer for the full year — working multiple jobs can lead to CPP overpayment " +
      "across employers, refundable when you file. It does not apply to Quebec residents, who contribute to " +
      "the Quebec Pension Plan (QPP) instead, at different rates.\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "What is CPP2?",
        answer:
          "A second, additional tier of CPP contributions introduced in 2024, applying only to income between " +
          "the regular YMPE ($74,600 for 2026) and a higher ceiling (the Year's Additional Maximum Pensionable " +
          "Earnings, $85,000 for 2026) — it doesn't affect anyone earning below $74,600.",
      },
      {
        question: "Does this apply in Quebec?",
        answer:
          "No — Quebec residents contribute to the Quebec Pension Plan (QPP) instead of CPP, administered " +
          "separately by Revenu Québec at its own (slightly higher) rate. This calculator is for the rest of " +
          "Canada.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 2. Canada EI Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-ei-calculator",
    title: "Canada EI Calculator",
    description: "Calculate your Employment Insurance (EI) premium from your annual employment income.",
    metaTitle: "Canada EI Calculator — Free & Instant",
    metaDescription:
      "Free Canada EI calculator. Enter your annual employment income to see your 2026 Employment Insurance " +
      "premium.",
    calcInputs: [
      cadField("annualEmploymentIncome", "Annual Employment Income", { unit: "CAD/year", max: 200000 }),
      payFrequencyField,
    ],
    calcResult: { label: "EI Premium", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("eiPremium", "EI Premium", { highlight: true }),
      cadResult("perPeriodPremium", "Per Paycheck"),
      cadResult("insurableEarnings", "Insurable Earnings"),
    ],
    instructions:
      "Enter your annual employment income and how often you're paid. Employment Insurance is deducted at " +
      "1.63% of your income, up to the $68,900 Maximum Insurable Earnings for 2026 — income above that isn't " +
      "taxed further for EI.",
    examples: "Example: $60,000 of annual employment income owes $978.00 in EI premiums for the year, or $81.50 per biweekly paycheck.",
    assumptions:
      "This calculator uses the 2026 EI employee premium rate (1.63%) and Maximum Insurable Earnings ($68,900) " +
      "confirmed via canada.ca, for residents outside Quebec. Quebec's EI rate is reduced (1.30%) because " +
      "Quebec residents also pay into the Quebec Parental Insurance Plan (QPIP) separately — not modeled here.\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Why is Quebec's EI rate different?",
        answer:
          "Quebec runs its own parental/maternity leave program (QPIP) alongside EI, so the federal EI premium " +
          "is reduced for Quebec residents to avoid double-charging for benefits EI itself doesn't cover there.",
      },
      {
        question: "Does self-employment income pay EI?",
        answer:
          "Not by default — self-employed Canadians don't pay EI premiums on their business income unless they " +
          "voluntarily register for EI special benefits (parental, sickness, etc.), a specific opt-in program " +
          "this calculator doesn't model.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 3. Canada Payroll Tax Calculator (employer side)
  // -------------------------------------------------------------------
  {
    slug: "canada-payroll-tax-calculator",
    title: "Canada Payroll Tax Calculator",
    description: "Calculate the EMPLOYER's own CPP and EI cost of employing someone, on top of their salary.",
    metaTitle: "Canada Payroll Tax Calculator — Free & Instant",
    metaDescription:
      "Free Canada payroll tax calculator. Enter an employee's salary to see your employer CPP and EI cost " +
      "and total employment cost.",
    calcInputs: [cadField("annualSalary", "Annual Salary", { unit: "CAD/year", max: 200000, step: 1000 })],
    calcResult: { label: "Total Employer Payroll Tax", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("employerCpp", "Employer CPP (Matching)"),
      cadResult("employerEi", "Employer EI (1.4x Employee Rate)"),
      cadResult("totalEmployerPayrollTax", "Total Employer Payroll Tax", { highlight: true }),
      cadResult("totalEmploymentCost", "Total Annual Employment Cost"),
    ],
    instructions:
      "Enter an employee's annual salary to see what YOU, as the employer, pay in matching CPP and EI on top " +
      "of it — separate from, and in addition to, the employee's own CPP/EI that comes out of their pay.\n\n" +
      "Employers match the employee's CPP contribution dollar-for-dollar (including CPP2), and pay EI at 1.4x " +
      "the employee rate (2.28% vs the employee's 1.63%) — the standard federal multiplier.",
    examples:
      "Example: a $60,000 salary costs an extra $3,361.75 in employer CPP and $1,368.00 in employer EI — " +
      "$4,729.75 total, for a $64,729.75 total annual employment cost.",
    assumptions:
      "This calculator uses 2026 CPP and EI figures confirmed via canada.ca, matching the employee-side rates " +
      "used in the CPP and EI Calculators on this site. It doesn't include provincial employer payroll taxes " +
      "like Ontario's Employer Health Tax or BC's Employer Health Tax, which are separate, province-specific " +
      "charges on top of CPP/EI.\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Is this the same as a provincial Employer Health Tax?",
        answer:
          "No — several provinces (Ontario, British Columbia, Manitoba, and others) charge their own separate " +
          "payroll-based Employer Health Tax on top of CPP/EI, with their own rates and exemption thresholds. " +
          "This calculator covers only the federal CPP/EI employer cost, which applies everywhere in Canada.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 4. Canada Capital Gains Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-capital-gains-tax-calculator",
    title: "Canada Capital Gains Tax Calculator",
    description: "Calculate federal tax on a capital gain using Canada's 50% inclusion rate, stacked on your other income.",
    metaTitle: "Canada Capital Gains Tax Calculator — Free & Instant",
    metaDescription:
      "Free Canada capital gains tax calculator. Enter your other income and gain to see federal tax using " +
      "the 50% inclusion rate.",
    calcInputs: [otherIncomeField, cadField("gainAmount", "Capital Gain", { unit: "CAD", max: 500000 })],
    calcResult: { label: "Federal Tax on Gain", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("taxableGain", "Taxable Gain (50% Inclusion)"),
      cadResult("federalTaxOnGain", "Federal Tax on Gain", { highlight: true }),
      cadResult("netProceeds", "Gain After Federal Tax"),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter your other taxable income for the year and the size of your capital gain. Unlike the US or UK, " +
      "Canada doesn't tax the full gain — only 50% of it (the \"inclusion rate\") is added to your taxable " +
      "income and taxed at your regular marginal rate, stacked on top of your other income.\n\n" +
      "A proposed increase to a two-thirds inclusion rate for large gains (announced in Budget 2024) was " +
      "cancelled in March 2025 and is NOT in effect — the standard 50% rate applies to gains of any size.",
    examples:
      "Example: $70,000 of other income with a $40,000 gain includes $20,000.00 (50%) as taxable, taxed at " +
      "$4,100.00 federal tax — a 10.25% effective rate on the full gain, leaving $35,900.00 net proceeds.",
    assumptions:
      "This calculator is FEDERAL TAX ONLY — see this tool's category note for why a single generic Canada " +
      "tool can't add provincial tax. It uses the confirmed 50% capital gains inclusion rate and 2026 federal " +
      "brackets/Basic Personal Amount. It doesn't model the Lifetime Capital Gains Exemption (which can " +
      "shelter gains on qualified small business shares or farm/fishing property) or the principal residence " +
      "exemption (which generally makes gains on your own home tax-free).\n\n" +
      FEDERAL_ONLY_NOTE +
      "\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Did the capital gains inclusion rate go up to two-thirds?",
        answer:
          "No — that increase was proposed in the April 2024 federal budget but was cancelled by the " +
          "government in March 2025 before ever taking effect. The inclusion rate remains 50% for gains of any " +
          "size, which is what this calculator uses.",
      },
      {
        question: "Does selling my home count?",
        answer:
          "Usually not — the Principal Residence Exemption generally makes the gain on your own home " +
          "completely tax-free, provided it was your principal residence for every year you owned it. This " +
          "calculator is for gains where no such exemption applies (a second property, shares, etc.).",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 5. Canada Dividend Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-dividend-tax-calculator",
    title: "Canada Dividend Tax Calculator",
    description:
      "Calculate federal tax on eligible and non-eligible dividends using Canada's gross-up and dividend tax " +
      "credit system.",
    metaTitle: "Canada Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free Canada dividend tax calculator. Enter your eligible and non-eligible dividends to see federal tax " +
      "after the dividend gross-up and tax credit.",
    calcInputs: [
      otherIncomeField,
      cadField("eligibleDividends", "Eligible Dividends", { unit: "CAD/year", max: 100000 }),
      cadField("nonEligibleDividends", "Non-Eligible (Ordinary) Dividends", { unit: "CAD/year", max: 100000 }),
    ],
    calcResult: { label: "Net Federal Dividend Tax", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("totalGrossedUp", "Total Grossed-Up Dividend Income"),
      cadResult("taxOnGrossedUp", "Federal Tax on Grossed-Up Amount"),
      cadResult("federalDividendTaxCredit", "Federal Dividend Tax Credit"),
      cadResult("netDividendTax", "Net Federal Dividend Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate on Dividends"),
    ],
    instructions:
      "Enter your other taxable income and your eligible and non-eligible dividend amounts separately (your " +
      "T5 slip shows both). Canada's dividend tax system is unusual: your dividend is first \"grossed up\" " +
      "(eligible dividends by 38%, non-eligible by 15%) to approximate the underlying corporate income, taxed " +
      "at your marginal rate, and then a Dividend Tax Credit is subtracted to account for corporate tax " +
      "already paid — avoiding taxing the same income twice.\n\n" +
      "Eligible dividends (generally from larger public corporations) get a bigger gross-up and credit than " +
      "non-eligible dividends (generally from Canadian-controlled private corporations taxed at the small " +
      "business rate).",
    examples:
      "Example: $50,000 of other income with $3,000 of eligible and $1,000 of non-eligible dividends grosses " +
      "up to $5,290.00, taxed at $740.60 federal tax — minus a $725.67 dividend tax credit — for just $14.93 " +
      "net federal tax on the $4,000 of dividends, a 0.37% effective rate.",
    assumptions:
      "This calculator is FEDERAL TAX ONLY. It uses the confirmed 2026 gross-up rates (38% eligible, 15% " +
      "non-eligible) and the longstanding enacted federal Dividend Tax Credit rates (15.0198% eligible, " +
      "9.0301% non-eligible, both of the grossed-up amount). Every province also has its own separate dividend " +
      "tax credit, not included here — your actual combined tax will differ from this federal-only figure.\n\n" +
      FEDERAL_ONLY_NOTE +
      "\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Why is the tax on dividends so much lower than on regular income?",
        answer:
          "Because the underlying corporation already paid corporate tax on that income before distributing " +
          "it as a dividend — the gross-up and dividend tax credit system is designed to roughly approximate " +
          "\"integration,\" so the combined corporate + personal tax on a dollar of corporate profit lands close " +
          "to what you'd have paid if you'd earned that dollar directly as an individual.",
      },
      {
        question: "How do I know if my dividends are eligible or non-eligible?",
        answer:
          "Your T5 slip (Statement of Investment Income) reports them separately — Box 24/25/26 for eligible " +
          "dividends, Box 10/11/12 for non-eligible (\"other than eligible\") dividends. Publicly traded Canadian " +
          "corporations almost always pay eligible dividends; many small private corporations pay non-eligible " +
          "ones.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 6. Canada Self Employment Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-self-employment-tax-calculator",
    title: "Canada Self Employment Tax Calculator",
    description: "Calculate your CPP contribution as a self-employed Canadian — both the employee and employer portions.",
    metaTitle: "Canada Self Employment Tax Calculator — Free & Instant",
    metaDescription:
      "Free Canada self-employment tax calculator. Enter your net profit to see your combined CPP contribution " +
      "as a self-employed person.",
    calcInputs: [cadField("netProfit", "Net Profit (After Business Expenses)", { unit: "CAD/year", max: 250000 })],
    calcResult: { label: "Total CPP Contribution", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("cppBaseContribution", "Base CPP (11.90%)"),
      cadResult("cpp2Contribution", "CPP2 (8%, Above $74,600)"),
      cadResult("totalCppContribution", "Total CPP Contribution", { highlight: true }),
      cadResult("netProfitAfterCpp", "Net Profit After CPP"),
    ],
    instructions:
      "Enter your net self-employment profit for the year. Unlike an employee, a self-employed person pays " +
      "BOTH the employee and employer portions of CPP — 11.90% (double the employee's 5.95%) between the " +
      "$3,500 exemption and $74,600, plus 8% CPP2 (double the employee's 4%) between $74,600 and $85,000.\n\n" +
      "This is on top of — not instead of — federal (and provincial) income tax on the same profit; use your " +
      "province's Income Tax Calculator under this category for that part.",
    examples:
      "Example: $90,000 of net profit owes $8,460.90 in base CPP plus $832.00 in CPP2 — $9,292.90 total, " +
      "leaving $80,707.10 after CPP (before income tax).",
    assumptions:
      "This calculator uses 2026 CPP figures confirmed via canada.ca, doubling the employee rates as required " +
      "for self-employed contributors. It doesn't include EI, which self-employed Canadians don't pay by " +
      "default (see this tool's FAQ), and doesn't include income tax — see the province-specific Income Tax " +
      "Calculators on this site for that separately.\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Why do I pay double the CPP rate?",
        answer:
          "Because there's no separate employer to match your contribution — as a self-employed person, you " +
          "ARE both the worker and the \"employer,\" so CRA requires you to remit both halves yourself, usually " +
          "through your annual tax return rather than payroll deductions.",
      },
      {
        question: "Do I pay EI too?",
        answer:
          "Not by default — self-employed Canadians are exempt from mandatory EI premiums on business income. " +
          "You CAN voluntarily register for the EI Special Benefits for Self-Employed People program (covering " +
          "parental, sickness, and similar leave) if you want that coverage, but it's optional and not modeled " +
          "in this calculator.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 7. Canada GST Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-gst-calculator",
    title: "Canada GST Calculator",
    description: "Add or extract the 5% federal Goods and Services Tax (GST) from a price.",
    metaTitle: "Canada GST Calculator — Free & Instant",
    metaDescription: "Free Canada GST calculator. Add 5% GST to a price or extract it from a GST-inclusive price.",
    calcInputs: [
      cadField("amount", "Amount", { unit: "CAD", max: 500000, step: 10 }),
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
    calcResult: { label: "GST Amount", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("netAmount", "Net Amount (Excluding GST)"),
      cadResult("gstAmount", "GST Amount (5%)", { highlight: true }),
      cadResult("grossAmount", "Gross Amount (Including GST)"),
    ],
    instructions:
      "Enter an amount and say whether it already includes GST. GST is a flat 5% federal tax that applies in " +
      "every province — in provinces with HST (see the Canada HST Calculator) it's combined into one rate; in " +
      "provinces with GST + a separate PST (see the Canada PST Calculator), the two are charged side by side.",
    examples: "Example: a $1,000 price with 5% GST added owes $50.00 in GST, for a $1,050.00 GST-inclusive total.",
    assumptions:
      "This calculator uses the current federal GST rate (5%, unchanged), confirmed via canada.ca. Use the " +
      "Canada HST Calculator instead for the 5 provinces that combine GST and provincial sales tax into one " +
      "Harmonized Sales Tax rate.\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Which provinces charge GST alone (not HST)?",
        answer:
          "Alberta, British Columbia, Saskatchewan, Manitoba, Quebec, and the three territories charge the " +
          "federal 5% GST on its own — BC, Saskatchewan, and Manitoba also charge their own separate PST on " +
          "top (see the Canada PST Calculator); Quebec charges its own QST instead.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 8. Canada HST Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-hst-calculator",
    title: "Canada HST Calculator",
    description:
      "Add or extract Harmonized Sales Tax (HST) for Ontario, Nova Scotia, New Brunswick, PEI, or " +
      "Newfoundland & Labrador.",
    metaTitle: "Canada HST Calculator — Free & Instant",
    metaDescription:
      "Free Canada HST calculator. Choose your province to add or extract the correct Harmonized Sales Tax " +
      "rate from a price.",
    calcInputs: [
      cadField("amount", "Amount", { unit: "CAD", max: 500000, step: 10 }),
      {
        key: "province",
        label: "Province",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "Ontario (13%)", value: 0 },
          { label: "Nova Scotia (14%)", value: 1 },
          { label: "New Brunswick (15%)", value: 2 },
          { label: "Prince Edward Island (15%)", value: 3 },
          { label: "Newfoundland and Labrador (15%)", value: 4 },
        ],
      },
      {
        key: "isHstInclusive",
        label: "Is the Amount Already HST-Inclusive?",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "No — add HST to this price", value: 0 },
          { label: "Yes — extract HST from this price", value: 1 },
        ],
      },
    ],
    calcResult: { label: "HST Amount", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("netAmount", "Net Amount (Excluding HST)"),
      cadResult("hstAmount", "HST Amount", { highlight: true }),
      cadResult("grossAmount", "Gross Amount (Including HST)"),
      { key: "rateUsed", label: "Rate Used", format: "percentage" },
    ],
    instructions:
      "Enter an amount, choose your province, and say whether the amount already includes HST. The 5 " +
      "\"harmonized\" provinces combine the federal GST and their own provincial sales tax into a single HST " +
      "rate, charged and remitted as one tax rather than two separate ones.",
    examples: "Example: a $1,000 price in Ontario (13%) with HST added owes $130.00 in HST, for a $1,130.00 HST-inclusive total.",
    assumptions:
      "This calculator uses current HST rates confirmed via canada.ca and provincial sources: Ontario 13%, " +
      "Nova Scotia 14% (reduced from 15% effective April 1, 2025), New Brunswick 15%, Prince Edward Island " +
      "15%, Newfoundland and Labrador 15%.\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Why did Nova Scotia's rate change?",
        answer:
          "Nova Scotia reduced its HST rate from 15% to 14% effective April 1, 2025, the first rate cut among " +
          "the harmonized provinces in years — this calculator uses the current, reduced rate.",
      },
      {
        question: "What about provinces not in this list?",
        answer:
          "Every other province and territory charges the federal 5% GST separately from any provincial sales " +
          "tax — see the Canada GST Calculator and Canada PST Calculator (for BC, Saskatchewan, and Manitoba) " +
          "instead. Quebec and Alberta have their own separate arrangements not covered by either tool.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 9. Canada PST Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-pst-calculator",
    title: "Canada PST Calculator",
    description: "Add or extract Provincial Sales Tax (PST) for British Columbia, Saskatchewan, or Manitoba.",
    metaTitle: "Canada PST Calculator — Free & Instant",
    metaDescription:
      "Free Canada PST calculator. Choose your province to add or extract the correct Provincial Sales Tax " +
      "rate from a price.",
    calcInputs: [
      cadField("amount", "Amount", { unit: "CAD", max: 500000, step: 10 }),
      {
        key: "province",
        label: "Province",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "British Columbia (7%)", value: 0 },
          { label: "Saskatchewan (6%)", value: 1 },
          { label: "Manitoba (7%)", value: 2 },
        ],
      },
      {
        key: "isPstInclusive",
        label: "Is the Amount Already PST-Inclusive?",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "No — add PST to this price", value: 0 },
          { label: "Yes — extract PST from this price", value: 1 },
        ],
      },
    ],
    calcResult: { label: "PST Amount", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("netAmount", "Net Amount (Excluding PST)"),
      cadResult("pstAmount", "PST Amount", { highlight: true }),
      cadResult("grossAmount", "Gross Amount (Including PST)"),
      { key: "rateUsed", label: "Rate Used", format: "percentage" },
    ],
    instructions:
      "Enter an amount, choose your province, and say whether the amount already includes PST. British " +
      "Columbia, Saskatchewan, and Manitoba are the three provinces that still charge a standalone Provincial " +
      "Sales Tax, ON TOP OF (not combined with) the federal 5% GST — see the Canada GST Calculator to add that " +
      "separately.",
    examples: "Example: a $1,000 price in British Columbia (7%) with PST added owes $70.00 in PST, for a $1,070.00 PST-inclusive total.",
    assumptions:
      "This calculator uses current provincial rates confirmed via canada.ca and provincial finance sources: " +
      "British Columbia 7%, Saskatchewan 6%, Manitoba 7% (branded \"Retail Sales Tax\" in Manitoba, same " +
      "mechanism). It calculates PST alone — combine with the Canada GST Calculator's 5% for your total sales " +
      "tax in these provinces.\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Do I charge both GST and PST in these provinces?",
        answer:
          "Yes — unlike the harmonized (HST) provinces, GST and PST are charged separately and shown as two " +
          "line items in these three provinces. Use this calculator for the PST portion and the Canada GST " +
          "Calculator for the 5% GST portion.",
      },
      {
        question: "What about Quebec's QST?",
        answer:
          "Quebec's Quebec Sales Tax (QST) works similarly to PST but at its own rate (9.975%) and with its " +
          "own administration through Revenu Québec — not included in this calculator, which covers BC, " +
          "Saskatchewan, and Manitoba only.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 10. Canada Rental Income Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-rental-income-tax-calculator",
    title: "Canada Rental Income Tax Calculator",
    description: "Calculate federal tax on your rental profit, stacked on top of your other income.",
    metaTitle: "Canada Rental Income Tax Calculator — Free & Instant",
    metaDescription:
      "Free Canada rental income tax calculator. Enter your rental income and expenses to see federal tax on " +
      "your rental profit.",
    calcInputs: [
      cadField("annualRentalIncome", "Annual Rental Income", { unit: "CAD/year", max: 150000 }),
      cadField("allowableExpenses", "Allowable Expenses", { unit: "CAD/year", max: 100000 }),
      otherIncomeField,
    ],
    calcResult: { label: "Federal Tax on Rental Profit", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("rentalProfit", "Rental Profit"),
      cadResult("federalTaxOnRental", "Federal Tax on Rental Profit", { highlight: true }),
      cadResult("netRentalIncome", "Net Rental Income After Federal Tax"),
    ],
    instructions:
      "Enter your annual rental income, your allowable expenses (mortgage interest, property tax, insurance, " +
      "repairs, and other deductible costs — unlike the UK, Canada DOES let you deduct mortgage interest " +
      "directly as a rental expense, with no Section 24-style restriction), and your other taxable income.\n\n" +
      "Rental profit in Canada is simply added to your other income and taxed at your regular marginal rate — " +
      "there's no separate rental tax rate or special treatment beyond the expense deductions themselves.",
    examples:
      "Example: $24,000 rental income with $6,000 of allowable expenses (against $60,000 other income) has " +
      "$18,000.00 rental profit, taxed at $3,690.00 federal tax, leaving $14,310.00 net rental income.",
    assumptions:
      "This calculator is FEDERAL TAX ONLY, using 2026 federal brackets stacked on top of your other income. " +
      "It doesn't model Capital Cost Allowance (depreciation) — a separate, optional deduction with its own " +
      "rules and later tax consequences on sale — or the distinction between rental income earned personally " +
      "vs. through a corporation.\n\n" +
      FEDERAL_ONLY_NOTE +
      "\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Can I deduct my full mortgage payment?",
        answer:
          "No — only the INTEREST portion of your mortgage payment is a deductible rental expense; the " +
          "principal repayment portion isn't deductible (it's building equity, not an expense). Enter only the " +
          "interest portion in \"Allowable Expenses,\" along with your other genuine costs.",
      },
      {
        question: "What is Capital Cost Allowance?",
        answer:
          "An optional tax depreciation deduction for the building (not the land) that can further reduce your " +
          "taxable rental profit — but claiming it can trigger \"recapture\" tax when you eventually sell. It's " +
          "a genuine planning decision many landlords make deliberately, which is why this calculator doesn't " +
          "apply it automatically.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 11. Canada Property Transfer Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-property-transfer-tax-calculator",
    title: "Canada Property Transfer Tax Calculator",
    description:
      "Estimate property transfer tax on a purchase using British Columbia's tiered rates as a representative " +
      "example.",
    metaTitle: "Canada Property Transfer Tax Calculator — Free & Instant",
    metaDescription:
      "Free Canada property transfer tax calculator. Enter a property price to estimate transfer tax using " +
      "British Columbia's tiered rate bands.",
    calcInputs: [cadField("propertyPrice", "Property Price", { unit: "CAD", max: 3000000, step: 5000 })],
    calcResult: { label: "Total Transfer Tax", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("baseTax", "Base Transfer Tax"),
      cadResult("furtherTax", "Further Property Tax (Over $3M)"),
      cadResult("totalTransferTax", "Total Transfer Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Enter a property's purchase price. This calculator applies British Columbia's Property Transfer Tax " +
      "bands as a representative example: 1% on the first $200,000, 2% on the portion up to $2,000,000, 3% " +
      "above that, plus a further 2% property tax on the residential portion above $3,000,000.\n\n" +
      "Property transfer tax varies significantly by province — see this tool's Assumptions for why there's " +
      "no single \"Canada-wide\" rate, and check your own province and city for the rates that actually apply " +
      "to your purchase.",
    examples: "Example: an $800,000 purchase owes $2,000.00 on the first $200,000 (1%) plus $12,000.00 on the remaining $600,000 (2%) — $14,000.00 total, a 1.75% effective rate.",
    assumptions:
      "This calculator uses British Columbia's current Property Transfer Tax bands, confirmed via gov.bc.ca, " +
      "as a representative example ONLY — every province sets its own transfer/land transfer tax independently " +
      "(Ontario, for instance, has its own separate bands, and Toronto layers an additional Municipal Land " +
      "Transfer Tax on top of Ontario's provincial tax), and some provinces don't charge one at all. It " +
      "doesn't model BC's First Time Home Buyers' Program exemption or Newly Built Home exemption.\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Does this apply outside British Columbia?",
        answer:
          "Not exactly — it's provided as a representative example of how a tiered transfer tax works. Ontario, " +
          "for example, has its own different bands, and Toronto adds a separate Municipal Land Transfer Tax on " +
          "top. Alberta and Saskatchewan charge only small flat registration fees instead of a percentage-based " +
          "tax. Always check your own province's (and city's) current rules for an accurate figure.",
      },
      {
        question: "Are there first-time buyer exemptions?",
        answer:
          "Many provinces offer some relief for first-time buyers below a certain purchase price — British " +
          "Columbia's First Time Home Buyers' Program, for example — which this calculator doesn't model. Check " +
          "your province's program if you qualify.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 12. Canada Tax Refund Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-tax-refund-calculator",
    title: "Canada Tax Refund Calculator",
    description: "Check whether your withheld tax is on track for a refund, for employment income with source withholding.",
    metaTitle: "Canada Tax Refund Calculator — Free & Instant",
    metaDescription:
      "Free Canada tax refund calculator. Enter your salary and tax withheld to project your federal refund " +
      "or balance owing.",
    calcInputs: [
      cadField("annualSalary", "Annual Salary", { unit: "CAD/year", max: 250000, step: 1000 }),
      cadField("taxWithheldToDate", "Federal Tax Withheld This Year", { unit: "CAD/year", max: 100000 }),
    ],
    calcResult: { label: "Projected Refund or Balance", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("estimatedFederalTax", "Estimated Federal Tax"),
      cadResult("taxWithheldToDate", "Tax Withheld"),
      cadResult("refundOrBalance", "Projected Refund (+) or Balance Due (−)", { highlight: true }),
    ],
    instructions:
      "Enter your annual salary and the federal income tax already withheld from your paycheques this year " +
      "(check a recent pay stub or your T4). This calculator compares that withholding against your estimated " +
      "federal tax liability, for employment income where tax is deducted at source.\n\n" +
      "If you have self-employment or investment income with NO source withholding instead, use the Canada " +
      "Tax Owing Calculator, which is framed for that scenario.",
    examples:
      "Example: a $55,000 salary with $7,000.00 of federal tax already withheld has an estimated $5,396.72 " +
      "federal tax liability — a $1,603.28 projected refund.",
    assumptions:
      "This calculator is FEDERAL TAX ONLY, using 2026 federal brackets and the Basic Personal Amount credit. " +
      "It doesn't include provincial tax (also withheld from your paycheque and settled at filing) or any " +
      "credits/deductions beyond the Basic Personal Amount — your actual refund will differ once provincial " +
      "tax and any other credits (RRSP contributions, medical expenses, etc.) are factored in.\n\n" +
      FEDERAL_ONLY_NOTE +
      "\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Where do I find my tax withheld?",
        answer:
          "Box 22 of your T4 slip (Income Tax Deducted) shows the total federal AND provincial tax withheld " +
          "combined by your employer for the year — this calculator's federal-only estimate won't match that " +
          "combined figure exactly.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 13. Canada Tax Owing Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-tax-owing-calculator",
    title: "Canada Tax Owing Calculator",
    description: "Estimate your federal balance owing for income with no source withholding — self-employment or investment income.",
    metaTitle: "Canada Tax Owing Calculator — Free & Instant",
    metaDescription:
      "Free Canada tax owing calculator. Enter your total income and any installments paid to estimate your " +
      "federal balance owing.",
    calcInputs: [
      cadField("totalIncome", "Total Income (No Source Withholding)", { unit: "CAD/year", max: 300000 }),
      cadField("installmentsPaid", "Tax Installments Already Paid", { unit: "CAD/year", max: 100000 }),
    ],
    calcResult: { label: "Balance Owing", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("estimatedFederalTax", "Estimated Federal Tax"),
      cadResult("installmentsPaid", "Installments Already Paid"),
      cadResult("balanceOwing", "Balance Owing", { highlight: true }),
    ],
    instructions:
      "Enter your total income for the year from sources with NO tax withheld at source (self-employment " +
      "profit, most investment income) and any quarterly tax installments you've already sent CRA. This " +
      "calculator estimates your remaining federal balance owing.\n\n" +
      "For employment income where your employer already withholds tax from every paycheque, use the Canada " +
      "Tax Refund Calculator instead, which is framed for that scenario.",
    examples:
      "Example: $65,000 of total income with $3,000.00 of installments already paid has an estimated $7,217.73 " +
      "federal tax liability, leaving a $4,217.73 balance owing.",
    assumptions:
      "This calculator is FEDERAL TAX ONLY, using 2026 federal brackets and the Basic Personal Amount credit — " +
      "it doesn't include provincial tax, CPP self-employment contributions (see the Canada Self Employment " +
      "Tax Calculator for that separately), or any deductions/credits beyond the Basic Personal Amount.\n\n" +
      FEDERAL_ONLY_NOTE +
      "\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Do I need to make quarterly tax installments?",
        answer:
          "CRA generally requires installments if your net federal + provincial tax owing was more than $3,000 " +
          "in the current year AND in either of the two previous years — common for the self-employed and " +
          "those with significant investment income. CRA sends installment reminder notices if you're required.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 14. Canada Pension Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-pension-tax-calculator",
    title: "Canada Pension Tax Calculator",
    description: "Calculate the withholding tax on an RRSP withdrawal, tiered by withdrawal size.",
    metaTitle: "Canada Pension Tax Calculator — Free & Instant",
    metaDescription:
      "Free Canada pension tax calculator. Enter your RRSP withdrawal amount to see the withholding tax and " +
      "net amount you'll receive.",
    calcInputs: [cadField("withdrawalAmount", "RRSP Withdrawal Amount", { unit: "CAD", max: 200000, step: 500 })],
    calcResult: { label: "Withholding Tax", format: "currency", currency: "CAD" },
    calcResults: [
      percentResult("withholdingRate", "Withholding Rate"),
      cadResult("withholdingTax", "Withholding Tax", { highlight: true }),
      cadResult("netWithdrawal", "Net Amount You'll Receive"),
    ],
    instructions:
      "Enter the amount you're withdrawing from an RRSP (Registered Retirement Savings Plan). RRSP withdrawals " +
      "are subject to withholding tax at the time of withdrawal, at a rate that increases with the size of the " +
      "withdrawal: 10% up to $5,000, 20% from $5,001 to $15,000, and 30% above $15,000.\n\n" +
      "This withholding is an ADVANCE payment toward your tax bill, not necessarily your final tax — the full " +
      "withdrawal is added to your taxable income for the year, and you'll owe more (or get some of the " +
      "withholding back) depending on your actual marginal rate once you file.",
    examples: "Example: a $10,000 RRSP withdrawal is withheld at 20% ($2,000.00), leaving $8,000.00 paid out to you.",
    assumptions:
      "This calculator uses the 2026 withholding tax tiers for residents outside Quebec, confirmed via " +
      "canada.ca (10%/20%/30%). Quebec residents face different, generally lower federal rates (5%/10%/15%) " +
      "plus separate provincial withholding, not modeled here. It doesn't cover RRIF withdrawals (which have " +
      "their own minimum-withdrawal rules) or the Home Buyers' Plan / Lifelong Learning Plan (both allow " +
      "certain withdrawals with NO withholding tax, repayable over time).\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "Is the withheld amount my final tax bill?",
        answer:
          "No — it's withheld in advance and credited against your total tax owing for the year. Since the " +
          "full withdrawal counts as taxable income, if your marginal rate is higher than the withholding " +
          "rate charged, you'll likely owe more when you file; if it's lower, you may get some of the " +
          "withholding back as a refund.",
      },
      {
        question: "Does this apply to the Home Buyers' Plan?",
        answer:
          "No — withdrawals under the Home Buyers' Plan (up to $60,000 for a first home) or the Lifelong " +
          "Learning Plan have NO withholding tax at all, since they're structured as a loan from your own RRSP " +
          "that you repay over time, not a taxable withdrawal. This calculator is for a regular, fully taxable " +
          "withdrawal.",
      },
    ],
  },
  // -------------------------------------------------------------------
  // 15. Canada Severance Tax Calculator
  // -------------------------------------------------------------------
  {
    slug: "canada-severance-tax-calculator",
    title: "Canada Severance Tax Calculator",
    description:
      "Calculate withholding tax on a severance payment (retiring allowance), including any tax-free RRSP " +
      "rollover room from service before 1996.",
    metaTitle: "Canada Severance Tax Calculator — Free & Instant",
    metaDescription:
      "Free Canada severance tax calculator. Enter your severance amount and years of pre-1996 service to see " +
      "withholding tax and any RRSP rollover room.",
    calcInputs: [
      cadField("severanceAmount", "Severance Amount", { unit: "CAD", max: 200000, step: 500 }),
      {
        key: "yearsServicePre1996",
        label: "Years of Service BEFORE 1996",
        type: "number",
        required: true,
        default: 0,
        min: 0,
        max: 40,
        step: 1,
      },
    ],
    calcResult: { label: "Withholding Tax", format: "currency", currency: "CAD" },
    calcResults: [
      cadResult("eligibleRolloverRoom", "Eligible RRSP Rollover Room"),
      cadResult("taxableNow", "Taxable Now (After Rollover)"),
      cadResult("withholdingTax", "Withholding Tax", { highlight: true }),
      cadResult("netSeverance", "Net Severance You'll Receive"),
    ],
    instructions:
      "Enter your total severance amount (CRA calls this a \"retiring allowance\") and how many years of your " +
      "service with that employer were BEFORE 1996 (0 if none). Severance is subject to the same tiered " +
      "withholding tax as an RRSP withdrawal — but a portion earned for service before 1996 can be rolled into " +
      "an RRSP completely tax-free (and withholding-free), at $2,000 for each such year.\n\n" +
      "This calculator applies that rollover room first, then calculates withholding tax on whatever's left.",
    examples:
      "Example: a $50,000 severance with 5 years of service before 1996 gets $10,000.00 of tax-free rollover " +
      "room, leaving $40,000.00 taxable now — withheld at 30% ($12,000.00) — for $38,000.00 net severance.",
    assumptions:
      "This calculator uses the same 2026 withholding tiers as RRSP withdrawals (10%/20%/30%, residents " +
      "outside Quebec) and the standard $2,000-per-pre-1996-year eligible rollover formula confirmed via " +
      "canada.ca. It doesn't include the additional $1,500-per-year rollover for years before 1989 when " +
      "employer pension/DPSP contributions weren't vested (a narrower, less common case), or any non-eligible " +
      "portion rolled into available RRSP room beyond the eligible formula.\n\n" +
      CA_DISCLAIMER,
    faq: [
      {
        question: "What counts as an \"eligible\" retiring allowance?",
        answer:
          "The portion of a severance payment tied to years of service BEFORE 1996, which the Income Tax Act " +
          "lets you roll into an RRSP tax-free — $2,000 for every full or partial year before 1996 — " +
          "regardless of how much RRSP contribution room you otherwise have. Any amount beyond that can still " +
          "go into an RRSP, but only up to your normal available contribution room.",
      },
      {
        question: "What if I started this job after 1996?",
        answer:
          "Then you have no eligible rollover room at all (enter 0 years) — your entire severance is subject " +
          "to the standard tiered withholding tax, the same as any other lump-sum payment from your employer.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:setup-finance-categories" (or any ` +
        `provincial tool script, e.g. "npm run db:create-alberta-tax-tool") first, then re-run this script.`
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
