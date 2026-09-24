// One-time (but safe to re-run) setup script: creates the "India Tax &
// Salary Calculators" Tool Category (if it doesn't already exist) and the
// India Income Tax Calculator Tool — a single national tool, unlike the US
// or Canada, since India has no state-level income tax (see
// calc-engine-india.ts's header). The math lives in
// `indiaCustomCalculators["india-income-tax-calculator"]` in
// src/lib/calc-engine-india.ts — New Tax Regime vs Old Tax Regime, selected
// via the taxRegime input field below rather than by a separate tool/slug.
//
// HOW TO RUN
//   npx tsx prisma/create-india-tax-tool.ts
// or
//   npm run db:create-india-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "india-income-tax-calculator";

// Instructions/Examples/Assumptions are rich-text (HTML) fields — see the
// matching helper/comment in create-nevada-paycheck-tool.ts.
function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: "india-tax-salary-calculators" },
    update: { name: "India Tax & Salary Calculators" },
    create: {
      name: "India Tax & Salary Calculators",
      slug: "india-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary (CTC)",
      type: "currency",
      unit: "INR/year",
      required: true,
      min: 0,
      max: 10000000,
    },
    {
      key: "taxRegime",
      label: "Tax Regime",
      type: "dropdown",
      required: true,
      default: 1,
      options: [
        { label: "New Regime (default since FY 2023-24)", value: 1 },
        { label: "Old Regime (with exemptions/deductions)", value: 0 },
      ],
    },
    {
      key: "payFrequency",
      label: "Pay Frequency",
      type: "dropdown",
      required: true,
      default: 12,
      options: [
        { label: "Monthly (12 payments/year)", value: 12 },
        { label: "Annually (1 payment/year)", value: 1 },
      ],
    },
    {
      key: "epfContribution",
      label: "Employee PF Contribution",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
    {
      key: "oldRegimeDeductions",
      label: "Section 80C / 80D & Other Deductions (Old Regime only)",
      unit: "per year",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "INR" },
    { key: "incomeTax", label: "Income Tax after Rebate (per payment)", format: "currency", currency: "INR" },
    { key: "surcharge", label: "Surcharge (per payment)", format: "currency", currency: "INR" },
    { key: "cess", label: "Health & Education Cess (per payment)", format: "currency", currency: "INR" },
    { key: "epfContribution", label: "Employee PF Contribution (per payment)", format: "currency", currency: "INR" },
    { key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "INR" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "INR",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "INR" },
  ];

  const instructions =
    "This India income tax calculator works out your income tax, surcharge (if applicable), Health & Education " +
    "Cess, and take-home pay under either the New Tax Regime or the Old Tax Regime for FY 2026-27 (AY 2027-28).\n\n" +
    "Enter your annual salary (CTC), choose your tax regime, and choose how often you're paid. If your employer " +
    "deducts Employee Provident Fund (EPF) from your pay, enter it under Employee PF Contribution — this reduces " +
    "your take-home pay but, unlike a pre-tax deduction in the US or UK, it does NOT by itself reduce your " +
    "taxable salary under Indian tax law. If you've chosen the Old Regime and claim deductions such as Section " +
    "80C investments, 80D health insurance premiums, or HRA exemption, enter your total ANNUAL eligible " +
    "deductions in that field — it's ignored under the New Regime, since the New Regime doesn't allow most of " +
    "these deductions in exchange for lower rates.\n\n" +
    "Click Calculate to see a full breakdown, both per payment and for the year. Under the New Regime, taxable " +
    "income up to ₹12,00,000 pays no tax at all, thanks to a Section 87A rebate designed to exactly zero it out " +
    "— this calculator applies that rebate (and the narrow \"marginal relief\" band just above that threshold) " +
    "automatically.";

  const assumptions =
    "This calculator uses confirmed FY 2026-27 figures: New Regime slabs from 0% (up to ₹4,00,000) to 30% " +
    "(above ₹24,00,000) with a ₹75,000 standard deduction and a Section 87A rebate that zeroes out tax for " +
    "taxable income up to ₹12,00,000; Old Regime slabs from 0% (up to ₹2,50,000) to 30% (above ₹10,00,000) with " +
    "a ₹50,000 standard deduction and a Section 87A rebate up to taxable income of ₹5,00,000. A 4% Health & " +
    "Education Cess applies to tax plus surcharge in both regimes.\n\n" +
    "Surcharge applies only above ₹50,00,000 of taxable income (10%/15%/25%, capped at 25% under the New Regime " +
    "vs. up to 37% under the Old Regime above ₹5 crore) — this calculator applies the flat surcharge percentage " +
    "without the additional \"marginal relief\" that smooths out each surcharge threshold, since that only " +
    "affects taxpayers already well above ₹50,00,000 of income. Everything below that threshold (which covers " +
    "the vast majority of users) is calculated with full marginal relief at the Section 87A rebate threshold.\n\n" +
    "The Old Regime deductions field is a single figure standing in for Section 80C (up to ₹1,50,000), Section " +
    "80D, HRA exemption, and similar — it doesn't validate against each provision's individual limit, so enter " +
    "your own total eligible amount. Employee PF contributions are assumed to reduce take-home pay only, not " +
    "taxable salary — if you separately claim them under Section 80C, include that amount in the deductions " +
    "field above (Old Regime only).\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified chartered accountant, tax professional, " +
    "or the Income Tax Department directly.";

  const examples =
    "Example: someone earning ₹20,00,000 a year under the New Regime, paid monthly, with no EPF or other " +
    "deductions, takes home approximately ₹1,50,633.33 per month — about ₹18,07,600 for the year — after income " +
    "tax (₹15,416.67/month) and Health & Education Cess (₹616.67/month). No surcharge applies, since taxable " +
    "income is well below ₹50,00,000.\n\n" +
    "Someone earning exactly ₹12,00,000 a year under the New Regime pays no income tax at all — the ₹75,000 " +
    "standard deduction brings taxable income to ₹11,25,000, and the Section 87A rebate zeroes out the " +
    "resulting tax entirely, so take-home pay equals the full ₹12,00,000.\n\n" +
    "Under the Old Regime, someone earning ₹8,00,000 a year who claims ₹1,50,000 in Section 80C deductions takes " +
    "home approximately ₹63,850 per month — about ₹7,66,200 for the year — after income tax (₹2,708.33/month) " +
    "and cess (₹108.33/month).";

  const faq = [
    {
      question: "Which regime should I choose — New or Old?",
      answer:
        "It depends on how many deductions you can claim. The New Regime has lower rates and a bigger Section " +
        "87A rebate (zero tax up to ₹12,00,000) but disallows most exemptions and deductions. The Old Regime " +
        "allows Section 80C, 80D, HRA, and more, but at higher rates. If your total eligible deductions are " +
        "large, the Old Regime can still work out cheaper — try both in this calculator and compare the " +
        "take-home pay.",
    },
    {
      question: "Why doesn't my EPF contribution reduce my taxable income here?",
      answer:
        "Under Indian tax law, EPF (Employee Provident Fund) contributions reduce your take-home pay but don't " +
        "automatically reduce your taxable salary — they only reduce taxable income if you separately claim " +
        "them under Section 80C (Old Regime only, subject to the overall ₹1,50,000 Section 80C limit). If you " +
        "want that effect, include your EPF contribution in the Section 80C / 80D & Other Deductions field.",
    },
    {
      question: "Why is my tax exactly zero at ₹12,00,000 income under the New Regime?",
      answer:
        "The Section 87A rebate for the New Regime is deliberately set at up to ₹60,000 — the exact amount of " +
        "tax the slabs produce on ₹12,00,000 of taxable income (after the ₹75,000 standard deduction) — so tax " +
        "payable is zero for anyone at or below that threshold. Just above it, a narrow \"marginal relief\" band " +
        "keeps tax from jumping straight to the full slab amount.",
    },
    {
      question: "What is the Health & Education Cess?",
      answer:
        "A 4% cess added on top of your income tax and surcharge (if any), used to fund health and education " +
        "initiatives. It applies to every taxpayer with a tax liability, under both regimes.",
    },
    {
      question: "Does surcharge apply to most taxpayers?",
      answer:
        "No — surcharge only applies once taxable income exceeds ₹50,00,000 a year, which is well above what " +
        "most salaried taxpayers earn. Below that threshold, this calculator's surcharge line will always show " +
        "₹0.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using confirmed FY 2026-27 slabs, standard deductions, and Section 87A rebate rules. " +
        "It doesn't validate individual deduction limits (like the ₹1,50,000 Section 80C cap) or apply marginal " +
        "relief at the surcharge thresholds, so your actual tax liability may differ slightly, especially at " +
        "very high incomes.",
    },
  ];

  const toolContent = {
    title: "India Income Tax Calculator",
    description:
      "Work out income tax, surcharge, cess, and take-home pay under India's New Tax Regime or Old Tax Regime " +
      "with this income tax calculator. Enter your salary to see a full breakdown for FY 2026-27.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "INR" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "India Income Tax Calculator (FY 2026-27) — New vs Old Regime",
    metaDescription:
      "Free India income tax calculator for FY 2026-27. Compare the New Tax Regime and Old Tax Regime, and " +
      "estimate income tax, surcharge, cess, and take-home pay.",
    schemaType: "SoftwareApplication",
  };

  const existing = await prisma.tool.findUnique({ where: { slug: SLUG } });

  if (existing) {
    await prisma.tool.update({
      where: { slug: SLUG },
      data: {
        ...toolContent,
        seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } },
      },
    });
    console.log(`Updated the "${SLUG}" tool's content.`);
  } else {
    await prisma.tool.create({
      data: {
        slug: SLUG,
        status: "draft",
        ...toolContent,
        seoMeta: { create: seoMetaContent },
      },
    });
    console.log(`Created the "${SLUG}" tool (status: draft).`);
  }

  console.log(
    "Open it in /admin/tools, review it, then set Status to Published when you're happy with it. " +
      "Its live URL will be /tools/" + SLUG + ". This is India's only tool for now — no category grid to link."
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
