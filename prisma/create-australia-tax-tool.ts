// One-time (but safe to re-run) setup script: creates the "Australia Tax &
// Salary Calculators" Tool Category (if it doesn't already exist) and the
// Australia Income Tax Calculator Tool — a single national tool, like
// India, since Australia has no state-level income tax (see
// calc-engine-australia.ts's header). The math lives in
// `australiaCustomCalculators["australia-income-tax-calculator"]` in
// src/lib/calc-engine-australia.ts — resident tax brackets, the Low Income
// Tax Offset, the Medicare Levy (including its low-income shade-in), and
// Superannuation Guarantee handling for both "salary + super" and
// "package inclusive of super" quotes.
//
// HOW TO RUN
//   npx tsx prisma/create-australia-tax-tool.ts
// or
//   npm run db:create-australia-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "australia-income-tax-calculator";

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
    where: { slug: "australia-tax-salary-calculators" },
    update: { name: "Australia Tax & Salary Calculators" },
    create: {
      name: "Australia Tax & Salary Calculators",
      slug: "australia-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "AUD/year",
      required: true,
      min: 0,
      max: 500000,
    },
    {
      key: "salaryIncludesSuper",
      label: "Does this figure include Superannuation?",
      type: "dropdown",
      required: true,
      default: 0,
      options: [
        { label: "No — Super is paid on top (most common)", value: 0 },
        { label: "Yes — this is a total package inclusive of Super", value: 1 },
      ],
    },
    {
      key: "payFrequency",
      label: "Pay Frequency",
      type: "dropdown",
      required: true,
      default: 12,
      options: [
        { label: "Weekly (52 payments/year)", value: 52 },
        { label: "Fortnightly (26 payments/year)", value: 26 },
        { label: "Monthly (12 payments/year)", value: 12 },
        { label: "Annually (1 payment/year)", value: 1 },
      ],
    },
    {
      key: "preTaxDeductions",
      label: "Pre-Tax Deductions (e.g. salary sacrifice, novated lease)",
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
    { key: "grossPayPerPeriod", label: "Cash Salary (per payment)", format: "currency", currency: "AUD" },
    { key: "incomeTax", label: "Income Tax after LITO (per payment)", format: "currency", currency: "AUD" },
    { key: "medicareLevy", label: "Medicare Levy (per payment)", format: "currency", currency: "AUD" },
    {
      key: "superGuarantee",
      label: "Superannuation Guarantee (employer-paid, per payment)",
      format: "currency",
      currency: "AUD",
    },
    { key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "AUD" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "AUD",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "AUD" },
  ];

  const instructions =
    "This Australia income tax calculator works out your income tax, Medicare Levy, and take-home pay for FY " +
    "2026-27 (1 July 2026 – 30 June 2027), and shows your employer's Superannuation Guarantee contribution " +
    "alongside it.\n\n" +
    "Enter your annual salary, then say whether that figure is on top of Super (the common case — an employer " +
    "pays an extra 12% into your super fund beyond what's shown here) or a total package figure that already " +
    "includes Super (common in some job ads) — this changes how much of the number you entered actually reaches " +
    "you as cash salary. Choose how often you're paid, and add any pre-tax deductions (like salary sacrifice " +
    "super contributions or a novated lease) or post-tax deductions if they apply — otherwise leave them at " +
    "$0.\n\n" +
    "Click Calculate to see a full breakdown, both per payment and for the year: your cash salary, income tax " +
    "(after the Low Income Tax Offset), the Medicare Levy, your employer's Superannuation Guarantee " +
    "contribution (shown for information — it's never subtracted from your take-home pay, since it was never " +
    "part of your cash salary either way), and your estimated take-home pay.";

  const assumptions =
    "This calculator uses confirmed FY 2026-27 figures: resident tax brackets from 0% (up to $18,200) to 45% " +
    "(above $190,000), the Low Income Tax Offset (up to $700, phasing out between $37,500 and $66,667), a 2% " +
    "Medicare Levy with a low-income \"shade-in\" (no levy below $28,011, a reduced levy up to $35,013, the full " +
    "2% above that), and a 12% Superannuation Guarantee rate.\n\n" +
    "SIMPLIFICATION: this calculator doesn't model the Medicare Levy Surcharge — an extra 1–1.5% charged to " +
    "higher-income earners who don't hold private hospital cover — since that depends on private health " +
    "insurance status, which this tool doesn't ask about. If you're a high earner without private hospital " +
    "cover, your actual liability may be higher than shown here. It also uses the Medicare Levy's \"single\" " +
    "thresholds rather than the higher family/dependent thresholds, and doesn't model other tax offsets (like " +
    "SAPTO for seniors) or HECS-HELP student loan repayments.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a registered tax agent or the Australian Taxation " +
    "Office (ATO) directly.";

  const examples =
    "Example: someone on an $80,000 salary (Super paid on top), paid monthly, with no other deductions, takes " +
    "home approximately $5,323.33 per month — about $63,880 for the year — after income tax ($1,210/month) and " +
    "the Medicare Levy ($133.33/month). Their employer also pays $800/month ($9,600/year) into their super fund " +
    "on top of that.\n\n" +
    "Someone on a $112,000 total package INCLUSIVE of Super has a cash salary of $100,000 (since $12,000 of the " +
    "package is Super) — take-home pay works out to about $6,456.67 per month, roughly $77,480 for the year, " +
    "after income tax ($1,710/month) and the Medicare Levy ($166.67/month).\n\n" +
    "At a lower income — $30,000 a year, Super on top — both the Low Income Tax Offset and the Medicare Levy's " +
    "low-income shade-in apply, bringing take-home pay to about $2,394.26 per month, roughly $28,731 for the " +
    "year.";

  const faq = [
    {
      question: "What's the difference between \"Super on top\" and \"package inclusive of Super\"?",
      answer:
        "If your salary is quoted as, say, \"$100,000 + Super,\" your employer pays an extra 12% ($12,000) into " +
        "your super fund on top of the $100,000 you're paid in cash. If it's quoted as a \"$112,000 package\" " +
        "that already includes Super, the 12% comes out of that $112,000 figure, leaving a smaller cash salary " +
        "(about $100,000 in that example) that your tax is actually calculated on. Choosing the right option " +
        "here changes both your tax and your take-home pay.",
    },
    {
      question: "Why is my Superannuation Guarantee shown but not subtracted from my take-home pay?",
      answer:
        "Because it was never part of your cash salary in the first place. If Super is paid on top, it goes " +
        "straight from your employer to your super fund and never touches your pay. If your package is " +
        "inclusive of Super, it's already carved out before your cash salary is calculated. Either way, showing " +
        "it separately just lets you see the full value of your employment package.",
    },
    {
      question: "What is the Low Income Tax Offset (LITO)?",
      answer:
        "A tax offset — up to $700 — for taxable income up to $37,500, phasing out gradually as income rises " +
        "past that (down to $325 by $45,000, and to $0 by $66,667). This calculator applies it automatically " +
        "based on your taxable income.",
    },
    {
      question: "Why does the Medicare Levy start below the full 2%?",
      answer:
        "The ATO \"shades in\" the Medicare Levy for lower incomes rather than applying the full 2% straight " +
        "away: there's no levy at all below $28,011 of taxable income, then a reduced 10 cents of levy per " +
        "dollar above that (rather than the full 2 cents) until the two calculations meet at $35,013, above " +
        "which the ordinary flat 2% applies.",
    },
    {
      question: "Does this include the Medicare Levy Surcharge?",
      answer:
        "No — the Medicare Levy Surcharge is a separate, additional charge (1–1.5%) for higher earners who " +
        "don't hold private hospital insurance, and it isn't modelled here since this calculator doesn't collect " +
        "private health insurance status. If that applies to you, your actual tax may be higher than shown.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using confirmed FY 2026-27 tax brackets, LITO, Medicare Levy, and Superannuation " +
        "Guarantee figures. It doesn't include the Medicare Levy Surcharge, other tax offsets like SAPTO, or " +
        "HECS-HELP repayments, so your actual take-home pay may differ.",
    },
  ];

  const toolContent = {
    title: "Australia Income Tax Calculator",
    description:
      "Work out income tax, the Medicare Levy, Superannuation, and take-home pay with this Australia income tax " +
      "calculator. Enter your salary to see a full breakdown for FY 2026-27.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "AUD" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "Australia Income Tax Calculator (FY 2026-27) — Salary & Take-Home Pay",
    metaDescription:
      "Free Australia income tax calculator for FY 2026-27. Estimate income tax, the Medicare Levy, " +
      "Superannuation, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". This is Australia's only tool for now — no category grid to " +
      "link."
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
