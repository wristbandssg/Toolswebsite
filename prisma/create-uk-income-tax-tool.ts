// One-time (but safe to re-run) setup script: creates the "UK Tax & Salary
// Calculators" Tool Category (if it doesn't already exist) and the UK
// Income Tax Calculator Tool — input fields, the multi-line breakdown
// result config, instructions/examples/FAQ, and SEO meta.
//
// This is the "rest of UK" tool (England, Wales, Northern Ireland) — see
// create-scotland-income-tax-tool.ts for Scotland's separate, devolved
// rate/band schedule. The actual math lives in code, not the database: see
// `ukCustomCalculators["uk-income-tax-calculator"]` in
// `src/lib/calc-engine-uk.ts` for the Personal Allowance (with its taper
// above £100,000), the 20%/40%/45% band calculation, and UK-wide National
// Insurance. This script only wires up the Tool row so the public page has
// a title, input form, and content around that calculation.
//
// UK income tax is structurally different from every US state tool this
// project has shipped so far, which is why calcInputs below deliberately
// has NO filingStatus, numberOfDependents, or extraWithholding field — see
// calc-engine-uk.ts's file header for why.
//
// HOW TO RUN
//   npx tsx prisma/create-uk-income-tax-tool.ts
// or
//   npm run db:create-uk-income-tax-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "uk-income-tax-calculator";

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
    where: { slug: "uk-tax-salary-calculators" },
    update: { name: "UK Tax & Salary Calculators" },
    create: {
      name: "UK Tax & Salary Calculators",
      slug: "uk-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "GBP/year",
      required: true,
      min: 0,
      max: 300000,
      step: 1000,
    },
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
    {
      key: "preTaxDeductions",
      label: "Pre-Tax Deductions",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
    {
      key: "postTaxDeductions",
      label: "Post-Tax Deductions",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "GBP" },
    { key: "incomeTax", label: "Income Tax (per payment)", format: "currency", currency: "GBP" },
    { key: "nationalInsurance", label: "National Insurance (per payment)", format: "currency", currency: "GBP" },
    { key: "totalDeductions", label: "Total Tax & NI (per payment)", format: "currency", currency: "GBP" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "GBP",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "GBP" },
  ];

  const instructions =
    "This UK income tax calculator works out what's actually taken out of your salary — Income Tax and National " +
    "Insurance — and what you take home, for England, Wales, and Northern Ireland (Scotland has its own rates: " +
    "see the Scotland Income Tax Calculator instead).\n\n" +
    "Enter your annual salary and choose how often you're paid. Add any pre-tax deductions (such as pension " +
    "contributions taken via salary sacrifice) and post-tax deductions if they apply to you — otherwise leave " +
    "them at £0. Click Calculate to see a full breakdown: gross pay, Income Tax, National Insurance, total " +
    "deductions, and your estimated take-home pay, both per payment and for the year.\n\n" +
    "Unlike a US paycheck calculator, there's no filing status to choose — UK Income Tax is assessed on each " +
    "person individually, regardless of marital status. Your Personal Allowance (the amount you can earn before " +
    "Income Tax starts) is £12,570, and it tapers away for income above £100,000, reaching £0 once income hits " +
    "£125,140. This calculator is reviewed and updated whenever HMRC publishes new rates, bands, or thresholds " +
    "for the tax year.";

  const assumptions =
    "This calculator uses HMRC's confirmed rates and thresholds for the 2026/27 tax year (6 April 2026 – 5 April " +
    "2027): a £12,570 Personal Allowance (tapered £1 for every £2 of income above £100,000, fully withdrawn at " +
    "£125,140), Basic Rate 20% up to £50,270, Higher Rate 40% up to £125,140, and Additional Rate 45% above " +
    "that. National Insurance (Class 1, employee) is calculated at 8% between the £12,570 Primary Threshold and " +
    "the £50,270 Upper Earnings Limit, and 2% above it.\n\n" +
    "It doesn't account for the Marriage Allowance, student loan repayments, tax codes other than the standard " +
    "one, or benefits-in-kind, so treat it as a close estimate rather than an exact payslip figure — your actual " +
    "take-home pay may vary slightly depending on your tax code and your employer's payroll system.\n\n" +
    "Pre-tax deductions you enter (such as salary-sacrifice pension contributions) are assumed to reduce pay for " +
    "both Income Tax and National Insurance alike, which is the common case for a salary-sacrifice arrangement — " +
    "some deduction types only reduce one or the other, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified accountant, tax adviser, or HMRC " +
    "directly.";

  const examples =
    "Example: someone earning £35,000 a year, paid monthly, with no pre-tax or post-tax deductions, takes home " +
    "approximately £2,393.30 per month — about £28,719.60 for the year — after Income Tax (£373.83/month) and " +
    "National Insurance (£149.53/month).\n\n" +
    "At a higher income — £110,000 a year, paid monthly — the Personal Allowance taper kicks in (it's reduced " +
    "from £12,570 to £7,570, since income is £10,000 over the £100,000 taper threshold). Take-home pay works out " +
    "to approximately £6,029.78 per month, about £72,357.40 for the year, after Income Tax (£2,786.00/month, " +
    "including a chunk at the 40% Higher Rate) and National Insurance (£350.88/month).";

  const faq = [
    {
      question: "Why is there no filing status option, unlike a US tax calculator?",
      answer:
        "UK Income Tax doesn't have a US-style filing status. Each person is taxed individually on their own " +
        "income, regardless of whether they're single, married, or in a civil partnership, so there's nothing to " +
        "select — every UK taxpayer uses the same Personal Allowance and the same rate bands.",
    },
    {
      question: "What is the Personal Allowance, and why does it taper away?",
      answer:
        "The Personal Allowance is the amount you can earn each year before Income Tax applies — £12,570 for " +
        "2026/27. It's gradually withdrawn for income above £100,000, reduced by £1 for every £2 you earn over " +
        "that threshold, until it reaches £0 at £125,140. This calculator applies that taper automatically based " +
        "on your annual salary.",
    },
    {
      question: "What's the difference between this calculator and the Scotland one?",
      answer:
        "Income Tax is devolved to the Scottish Parliament, so Scotland sets its own rates and bands — six of " +
        "them, instead of England/Wales/Northern Ireland's three. This calculator is for England, Wales, and " +
        "Northern Ireland; use the separate Scotland Income Tax Calculator if you live in Scotland. National " +
        "Insurance is identical either way, since it isn't devolved.",
      },
    {
      question: "Is National Insurance the same across the whole UK, including Scotland?",
      answer:
        "Yes. Unlike Income Tax, National Insurance is set by the UK government and applies at the same rates " +
        "and thresholds everywhere in the UK — England, Wales, Scotland, and Northern Ireland alike.",
    },
    {
      question: "What National Insurance rate does this calculator use?",
      answer:
        "Class 1 (employee) National Insurance: 8% on earnings between the £12,570 Primary Threshold and the " +
        "£50,270 Upper Earnings Limit, and 2% on earnings above that, per year.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using HMRC's confirmed 2026/27 rates and thresholds. It doesn't account for the " +
        "Marriage Allowance, student loan repayments, non-standard tax codes, or benefits-in-kind, so your actual " +
        "payslip may differ slightly.",
    },
    {
      question: "How do pre-tax deductions affect my take-home pay?",
      answer:
        "Pre-tax deductions (like salary-sacrifice pension contributions) are subtracted from your pay before " +
        "Income Tax and National Insurance are calculated, which lowers both — so your take-home pay drops by " +
        "less than the full deduction amount.",
    },
  ];

  const toolContent = {
    title: "UK Income Tax Calculator",
    description:
      "Work out Income Tax, National Insurance, and take-home pay for England, Wales, and Northern Ireland with " +
      "this UK income tax calculator. Enter your salary and pay frequency to see a full breakdown for 2026/27.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom",
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "GBP" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "UK Income Tax Calculator (2026/27) — Salary & Take-Home Pay",
    metaDescription:
      "Free UK income tax calculator for England, Wales, and Northern Ireland. Estimate Income Tax, National " +
      "Insurance, and take-home pay for 2026/27.",
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
      "Its live URL will be /tools/" + SLUG + ". There's no \"Other State Calculators\"-style grid to link for " +
      "the UK — the category page itself (UK Tax & Salary Calculators) lists this and the Scotland tool " +
      "together once both are published."
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
