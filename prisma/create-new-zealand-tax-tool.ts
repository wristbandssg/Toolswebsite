// One-time (but safe to re-run) setup script: creates the "New Zealand Tax
// & Salary Calculators" Tool Category (if it doesn't already exist) and the
// New Zealand Income Tax Calculator Tool — a single national tool, like
// India, Australia, South Africa, and Pakistan (see
// calc-engine-newzealand.ts's header). The math lives in
// `newZealandCustomCalculators["new-zealand-income-tax-calculator"]` in
// src/lib/calc-engine-newzealand.ts — 2026/27 PAYE brackets, the ACC
// Earner Levy, and KiwiSaver.
//
// HOW TO RUN
//   npx tsx prisma/create-new-zealand-tax-tool.ts
// or
//   npm run db:create-new-zealand-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "new-zealand-income-tax-calculator";

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
    where: { slug: "new-zealand-tax-salary-calculators" },
    update: { name: "New Zealand Tax & Salary Calculators" },
    create: {
      name: "New Zealand Tax & Salary Calculators",
      slug: "new-zealand-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "NZD/year",
      required: true,
      min: 0,
      max: 5000000,
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
      key: "kiwiSaverContribution",
      label: "KiwiSaver Contribution",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "NZD" },
    { key: "incomeTax", label: "Income Tax (per payment)", format: "currency", currency: "NZD" },
    { key: "accLevy", label: "ACC Earner Levy (per payment)", format: "currency", currency: "NZD" },
    {
      key: "kiwiSaverContribution",
      label: "KiwiSaver Contribution (per payment)",
      format: "currency",
      currency: "NZD",
    },
    { key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "NZD" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "NZD",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "NZD" },
  ];

  const instructions =
    "This New Zealand income tax calculator works out your PAYE income tax, ACC Earner Levy, and take-home " +
    "pay for the 2026/27 tax year (1 April 2026 – 31 March 2027).\n\n" +
    "Enter your annual salary and how often you're paid. If you contribute to KiwiSaver, add the per-payment " +
    "amount — it's deducted from your take-home pay only, after tax and the ACC levy, matching how it actually " +
    "comes out of your pay; otherwise leave it at $0.\n\n" +
    "Click Calculate to see a full breakdown, both per payment and for the year. New Zealand's tax brackets " +
    "are progressive with no tax-free threshold — only the portion of your income inside a given band is taxed " +
    "at that band's rate, starting from your very first dollar earned.";

  const assumptions =
    "This calculator uses confirmed 2026/27 PAYE tax brackets: 10.5% up to $15,600, then 17.5%, 30%, and 33% " +
    "through three more bands, topping out at 39% above $180,000 — with no standard deduction or tax-free " +
    "threshold, unlike most other countries on this site.\n\n" +
    "The ACC Earner Levy is calculated at the confirmed 2026/27 rate of 1.52% of earnings, capped at a " +
    "$156,641/year liable earnings ceiling, so the levy tops out at $2,380.94/year regardless of how much more " +
    "you earn above that.\n\n" +
    "KiwiSaver is deducted after PAYE and the ACC levy are calculated, matching how it's actually taken out of " +
    "an employee's pay — it never reduces your taxable income.\n\n" +
    "It doesn't account for tax credits (such as Independent Earner Tax Credit), student loan repayment " +
    "deductions, or other payroll-specific adjustments, so treat it as a close estimate rather than an exact " +
    "payslip figure.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax practitioner or Inland Revenue " +
    "(IRD) directly.";

  const examples =
    "Example: someone earning $70,000 a year, paid monthly, with no KiwiSaver entered, pays about " +
    "$1,101.71/month in income tax (plus $88.67/month in ACC Earner Levy), taking home approximately " +
    "$4,642.96 per month — about $55,715.50 for the year.\n\n" +
    "Someone earning $200,000 a year, paid annually, hits the ACC levy cap: their levy is $2,380.94 for the " +
    "year (not 1.52% of the full $200,000), on top of $57,077.50 in income tax, taking home $140,541.56 for " +
    "the year.";

  const faq = [
    {
      question: "Why is there no tax-free threshold?",
      answer:
        "New Zealand's PAYE system taxes the first dollar of income at 10.5% — unlike the US, UK, India, or " +
        "several other countries on this site, there's no standard deduction or personal allowance that " +
        "exempts an initial slice of income from tax.",
    },
    {
      question: "What is the ACC Earner Levy?",
      answer:
        "A compulsory levy that funds New Zealand's Accident Compensation Corporation (ACC) scheme, deducted " +
        "alongside PAYE at 1.52% of earnings, capped at a $156,641/year earnings ceiling so it tops out at " +
        "$2,380.94/year.",
    },
    {
      question: "Why doesn't my KiwiSaver contribution reduce my tax?",
      answer:
        "KiwiSaver is deducted from your pay AFTER income tax and the ACC levy are calculated, so it reduces " +
        "your take-home pay but has no effect on how much tax you owe — that's different from a retirement " +
        "scheme like the UK's pension salary sacrifice, which can reduce taxable income.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate using confirmed 2026/27 PAYE brackets and ACC levy figures. It doesn't include tax " +
        "credits like the Independent Earner Tax Credit or student loan deductions, so your actual take-home " +
        "pay may differ.",
    },
  ];

  const toolContent = {
    title: "New Zealand Income Tax Calculator",
    description:
      "Work out PAYE income tax, ACC levy, and take-home pay with this New Zealand income tax calculator. " +
      "Enter your salary to see a full breakdown for the 2026/27 tax year.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "NZD" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "New Zealand Income Tax Calculator (2026/27) — PAYE & Take-Home Pay",
    metaDescription:
      "Free New Zealand income tax calculator for the 2026/27 tax year. Estimate PAYE income tax, the ACC " +
      "Earner Levy, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". This is New Zealand's only tool for now — no category grid " +
      "to link."
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
