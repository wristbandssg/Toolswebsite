// One-time (but safe to re-run) setup script: creates the "Hong Kong Tax &
// Salary Calculators" Tool Category (if it doesn't already exist) and the
// Hong Kong Income Tax Calculator Tool — a single territory-wide tool, like
// India, Australia, South Africa, and Pakistan (see
// calc-engine-hongkong.ts's header). The math lives in
// `hongKongCustomCalculators["hong-kong-income-tax-calculator"]` in
// src/lib/calc-engine-hongkong.ts — the progressive-vs-standard-rate
// comparison, MPF, and personal allowances for 2025/26.
//
// HOW TO RUN
//   npx tsx prisma/create-hong-kong-tax-tool.ts
// or
//   npm run db:create-hong-kong-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "hong-kong-income-tax-calculator";

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
    where: { slug: "hong-kong-tax-salary-calculators" },
    update: { name: "Hong Kong Tax & Salary Calculators" },
    create: {
      name: "Hong Kong Tax & Salary Calculators",
      slug: "hong-kong-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "HKD/year",
      required: true,
      min: 0,
      max: 20000000,
    },
    {
      key: "maritalStatus",
      label: "Marital Status",
      type: "dropdown",
      required: true,
      default: 0,
      options: [
        { label: "Single", value: 0 },
        { label: "Married (spouse has no chargeable income)", value: 1 },
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
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "HKD" },
    { key: "incomeTax", label: "Salaries Tax (per payment)", format: "currency", currency: "HKD" },
    { key: "mpf", label: "MPF Contribution (per payment)", format: "currency", currency: "HKD" },
    { key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "HKD" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "HKD",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "HKD" },
  ];

  const instructions =
    "This Hong Kong income tax calculator works out your salaries tax, MPF contribution, and take-home pay for " +
    "the 2025/26 year of assessment (1 April 2025 – 31 March 2026).\n\n" +
    "Enter your annual salary, your marital status (this determines which personal allowance applies), and how " +
    "often you're paid. Click Calculate to see a full breakdown.\n\n" +
    "Hong Kong's salaries tax works differently from most countries: the IRD calculates your tax bill TWO ways " +
    "— once using progressive rates on your income after allowances, and once using a flat \"standard rate\" on " +
    "your income before allowances — and you only ever pay whichever amount is LOWER. This calculator does the " +
    "same comparison automatically, so higher earners and taxpayers with generous allowances both get the " +
    "correct, lower figure.";

  const assumptions =
    "This calculator uses confirmed 2025/26 year of assessment figures: progressive rates of 2% (up to " +
    "HK$50,000 of net chargeable income), 6%, 10%, 14%, and 17% (above HK$200,000); a two-tiered standard rate " +
    "of 15% on the first HK$5,000,000 of net income and 16% on the remainder; a Basic Allowance of HK$132,000; " +
    "and a Married Person's Allowance of HK$264,000. Your final salaries tax is the lower of the progressive " +
    "and standard-rate calculations, exactly as the IRD applies it.\n\n" +
    "MPF (Mandatory Provident Fund) is calculated at the standard employee rate of 5% of relevant income, " +
    "capped at a HK$30,000/month relevant income ceiling, so contributions top out at HK$1,500/month " +
    "(HK$18,000/year) — and, since mandatory MPF contributions are deductible from assessable income for " +
    "salaries tax purposes, this calculator subtracts them before working out both the progressive and " +
    "standard-rate tax.\n\n" +
    "It doesn't account for other allowances (child, dependent parent, single parent), other concessionary " +
    "deductions, or provisional tax timing, so treat it as a close estimate rather than an exact assessment — " +
    "your actual salaries tax bill may vary depending on your personal circumstances.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax practitioner or the Inland " +
    "Revenue Department (IRD) directly.";

  const examples =
    "Example: a single person earning HK$500,000 a year, paid monthly, pays about HK$3,458.33/month in " +
    "salaries tax (HK$41,500/year, via the progressive calculation) plus HK$1,500/month in MPF, taking home " +
    "approximately HK$36,708.33 per month — about HK$440,500 for the year.\n\n" +
    "A married person (spouse with no chargeable income) earning HK$200,000 a year pays no salaries tax at all " +
    "— the HK$264,000 Married Person's Allowance fully offsets their net income — leaving only the capped MPF " +
    "contribution to deduct.\n\n" +
    "A single person earning HK$10,000,000 a year is a case where the standard rate wins: the progressive " +
    "calculation would come to about HK$1,656,500, but the two-tiered standard rate caps it at HK$1,547,120 — " +
    "this calculator applies the lower figure automatically, taking home about HK$8,434,880 for the year.";

  const faq = [
    {
      question: "Why does this calculator compare two different tax calculations?",
      answer:
        "Because that's how Hong Kong's IRD actually calculates salaries tax — everyone's final bill is the " +
        "LOWER of the progressive-rate calculation (income after allowances) and the standard-rate calculation " +
        "(income before allowances). The standard rate exists specifically to cap tax for higher earners with " +
        "few allowances, so skipping it would overstate tax for a meaningful share of taxpayers.",
    },
    {
      question: "What is MPF and why is it capped?",
      answer:
        "The Mandatory Provident Fund — Hong Kong's mandatory retirement savings scheme. Employees contribute " +
        "5% of relevant income, capped at a HK$30,000/month earnings ceiling, so contributions top out at " +
        "HK$1,500/month regardless of how much more you earn above that.",
    },
    {
      question: "Does the Married Person's Allowance always apply if I'm married?",
      answer:
        "Only if your spouse has no net chargeable income of their own for the year (or you jointly elect for " +
        "it to apply) — otherwise each spouse is assessed separately using the Basic Allowance. This " +
        "calculator assumes the Married option means that condition is met.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate using confirmed 2025/26 rates, allowances, and MPF figures. It doesn't include other " +
        "allowances (child, dependent parent) or concessionary deductions, so your actual assessment may " +
        "differ.",
    },
  ];

  const toolContent = {
    title: "Hong Kong Income Tax Calculator",
    description:
      "Work out salaries tax, MPF, and take-home pay with this Hong Kong income tax calculator. Enter your " +
      "salary and marital status to see a full breakdown for the 2025/26 year of assessment.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "HKD" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "Hong Kong Income Tax Calculator (2025/26) — Salaries Tax & Take-Home Pay",
    metaDescription:
      "Free Hong Kong income tax calculator for the 2025/26 year of assessment. Estimate salaries tax, MPF, " +
      "and take-home pay using the progressive and standard-rate comparison.",
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
      "Its live URL will be /tools/" + SLUG + ". This is Hong Kong's only tool for now — no category grid " +
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
