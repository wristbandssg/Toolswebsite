// One-time (but safe to re-run) setup script: creates the Scotland Income
// Tax Calculator Tool inside the "UK Tax & Salary Calculators" category
// (created by create-uk-income-tax-tool.ts, or here if that hasn't run
// yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-uk-income-tax-tool.ts's structure and template (tool-template-3)
// exactly — same design, Scotland's own devolved rates and bands.
//
// Income Tax is devolved to the Scottish Parliament, which sets its own
// rates and bands — six of them, rather than the rest of the UK's three.
// National Insurance is NOT devolved, so it's identical to the rest-of-UK
// tool. The math lives in code, not the database: see
// `ukCustomCalculators["scotland-income-tax-calculator"]` in
// `src/lib/calc-engine-uk.ts`.
//
// HOW TO RUN
//   npx tsx prisma/create-scotland-income-tax-tool.ts
// or
//   npm run db:create-scotland-income-tax-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "scotland-income-tax-calculator";

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
    { key: "incomeTax", label: "Scottish Income Tax (per payment)", format: "currency", currency: "GBP" },
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
    "This Scotland income tax calculator works out what's actually taken out of your salary — Scottish Income " +
    "Tax and National Insurance — and what you take home. Scotland has its own Income Tax rates and bands, set " +
    "by the Scottish Parliament, which are different from the rest of the UK (if you live in England, Wales, or " +
    "Northern Ireland, use the UK Income Tax Calculator instead).\n\n" +
    "Enter your annual salary and choose how often you're paid. Add any pre-tax deductions (such as pension " +
    "contributions taken via salary sacrifice) and post-tax deductions if they apply to you — otherwise leave " +
    "them at £0. Click Calculate to see a full breakdown: gross pay, Scottish Income Tax, National Insurance, " +
    "total deductions, and your estimated take-home pay, both per payment and for the year.\n\n" +
    "As with the rest of the UK, there's no filing status to choose — Income Tax is assessed on each person " +
    "individually. The same £12,570 Personal Allowance applies (tapering away for income above £100,000, " +
    "reaching £0 at £125,140) — only the rates and bands above the Personal Allowance differ from the rest of " +
    "the UK. This calculator is reviewed and updated whenever the Scottish Government publishes new rates, " +
    "bands, or thresholds for the tax year.";

  const assumptions =
    "This calculator uses the Scottish Government's confirmed rates and bands for the 2026/27 tax year (6 April " +
    "2026 – 5 April 2027): a £12,570 Personal Allowance (tapered £1 for every £2 of income above £100,000, " +
    "fully withdrawn at £125,140), then six bands on taxable income above the allowance — Starter Rate 19% up " +
    "to £16,537 of gross income, Basic Rate 20% up to £29,526, Intermediate Rate 21% up to £43,662, Higher Rate " +
    "42% up to £75,000, Advanced Rate 45% up to £125,140, and Top Rate 48% above that. National Insurance " +
    "(Class 1, employee) is calculated the same way as the rest of the UK — 8% between the £12,570 Primary " +
    "Threshold and the £50,270 Upper Earnings Limit, and 2% above it, since National Insurance isn't devolved.\n\n" +
    "It doesn't account for the Marriage Allowance, student loan repayments, tax codes other than the standard " +
    "one, or benefits-in-kind, so treat it as a close estimate rather than an exact payslip figure — your actual " +
    "take-home pay may vary slightly depending on your tax code and your employer's payroll system.\n\n" +
    "Pre-tax deductions you enter (such as salary-sacrifice pension contributions) are assumed to reduce pay for " +
    "both Income Tax and National Insurance alike, which is the common case for a salary-sacrifice arrangement — " +
    "some deduction types only reduce one or the other, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified accountant, tax adviser, or Revenue " +
    "Scotland directly.";

  const examples =
    "Example: someone earning £35,000 a year, paid monthly, with no pre-tax or post-tax deductions, takes home " +
    "approximately £2,392.04 per month — about £28,704.53 for the year — after Scottish Income Tax " +
    "(£375.09/month) and National Insurance (£149.53/month). That's a few pounds a month less than the same " +
    "salary in the rest of the UK, since part of that income falls into Scotland's 21% Intermediate Rate band " +
    "rather than staying at 20%.\n\n" +
    "At a higher income — £110,000 a year, paid monthly — the Personal Allowance taper kicks in (it's reduced " +
    "from £12,570 to £7,570, since income is £10,000 over the £100,000 taper threshold). Take-home pay works out " +
    "to approximately £5,692.28 per month, about £68,307.35 for the year, after Scottish Income Tax " +
    "(£3,123.50/month, including amounts at the 42% and 45% bands) and National Insurance (£350.88/month).";

  const faq = [
    {
      question: "Why does Scotland have different Income Tax rates from the rest of the UK?",
      answer:
        "Income Tax on earned income is a devolved power, set by the Scottish Parliament rather than Westminster. " +
        "Scotland currently uses six rate bands instead of the rest of the UK's three, with its own thresholds — " +
        "which is why this calculator is separate from the UK Income Tax Calculator.",
    },
    {
      question: "Is National Insurance different in Scotland too?",
      answer:
        "No. National Insurance isn't devolved — it's set by the UK government and applies at the same rates and " +
        "thresholds everywhere in the UK, including Scotland. Only Income Tax differs.",
    },
    {
      question: "What are Scotland's Income Tax bands for 2026/27?",
      answer:
        "After the £12,570 Personal Allowance: Starter Rate 19% (gross income £12,571–£16,537), Basic Rate 20% " +
        "(£16,538–£29,526), Intermediate Rate 21% (£29,527–£43,662), Higher Rate 42% (£43,663–£75,000), " +
        "Advanced Rate 45% (£75,001–£125,140), and Top Rate 48% above £125,140.",
    },
    {
      question: "Does the Personal Allowance work the same way in Scotland?",
      answer:
        "Yes — the £12,570 Personal Allowance and its taper above £100,000 (down to £0 at £125,140) are UK-wide " +
        "and set by Westminster, not the Scottish Parliament. Only the rates applied above the allowance are " +
        "Scotland-specific.",
    },
    {
      question: "Do Scottish taxpayers pay more or less Income Tax than the rest of the UK?",
      answer:
        "It depends on income. Lower earners can pay slightly less, thanks to the 19% Starter Rate; middle and " +
        "higher earners typically pay somewhat more, since Scotland's Intermediate (21%), Higher (42%), and Top " +
        "(48%) rates are higher than the equivalent rest-of-UK bands. This calculator shows your actual figure " +
        "either way.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using the Scottish Government's confirmed 2026/27 rates and bands. It doesn't account " +
        "for the Marriage Allowance, student loan repayments, non-standard tax codes, or benefits-in-kind, so " +
        "your actual payslip may differ slightly.",
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
    title: "Scotland Income Tax Calculator",
    description:
      "Work out Scottish Income Tax, National Insurance, and take-home pay with this Scotland income tax " +
      "calculator. Enter your salary and pay frequency to see a full breakdown using Scotland's own six-band " +
      "rate schedule for 2026/27.",
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
    metaTitle: "Scotland Income Tax Calculator (2026/27) — Salary & Take-Home Pay",
    metaDescription:
      "Free Scotland income tax calculator using Scotland's own six-band rate schedule. Estimate Scottish " +
      "Income Tax, National Insurance, and take-home pay for 2026/27.",
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
      "the UK — the category page itself (UK Tax & Salary Calculators) lists this and the UK tool together " +
      "once both are published."
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
