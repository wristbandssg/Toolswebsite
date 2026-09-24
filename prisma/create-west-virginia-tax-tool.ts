// One-time (but safe to re-run) setup script: creates the West Virginia
// Income Tax Calculator Tool inside the existing "Tax & Paycheck
// Calculators" category (created by create-nevada-paycheck-tool.ts, or here
// if that hasn't run yet) — input fields, the multi-line breakdown result
// config, instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Unlike Nevada, West Virginia DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero West Virginia State Income Tax line.
// The math lives in code, not the database: see
// `customCalculators["west-virginia-tax-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and West Virginia
// state income tax (2.11%/2.81%/3.16%/4.22%/4.58% brackets applied to
// federal AGI, with no standard deduction but a $2,000-per-exemption
// personal exemption — figures sourced from the West Virginia Tax
// Division's 2026 rate-cut page and the official IT-140 instructions) this
// script only wires up the Tool row so the public page has a title, input
// form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-west-virginia-tax-tool.ts
// or
//   npm run db:create-west-virginia-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "west-virginia-tax-calculator";

// Instructions/Examples/Assumptions are now rich-text (HTML) fields — see
// the matching helper/comment in create-nevada-paycheck-tool.ts.
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
    where: { slug: "tax-paycheck-calculators" },
    update: { name: "Tax & Paycheck Calculators" },
    create: {
      name: "Tax & Paycheck Calculators",
      slug: "tax-paycheck-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "USD/year",
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
      default: 26,
      options: [
        { label: "Weekly (52 paychecks/year)", value: 52 },
        { label: "Biweekly (26 paychecks/year)", value: 26 },
        { label: "Semi-Monthly (24 paychecks/year)", value: 24 },
        { label: "Monthly (12 paychecks/year)", value: 12 },
        { label: "Annually (1 payment/year)", value: 1 },
      ],
    },
    {
      key: "filingStatus",
      label: "Filing Status",
      type: "dropdown",
      required: true,
      default: 0,
      options: [
        { label: "Single", value: 0 },
        { label: "Married Filing Jointly", value: 1 },
        { label: "Married Filing Separately", value: 2 },
        { label: "Head of Household", value: 3 },
      ],
    },
    {
      key: "numberOfDependents",
      label: "Number of Dependents",
      type: "number",
      required: false,
      default: 0,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      key: "preTaxDeductions",
      label: "Pre-Tax Deductions",
      unit: "per paycheck",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
    {
      key: "postTaxDeductions",
      label: "Post-Tax Deductions",
      unit: "per paycheck",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
    {
      key: "extraWithholding",
      label: "Extra Withholding",
      unit: "per paycheck",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per paycheck)", format: "currency" },
    { key: "federalIncomeTax", label: "Federal Income Tax (per paycheck)", format: "currency" },
    { key: "socialSecurityTax", label: "Social Security Tax (per paycheck)", format: "currency" },
    { key: "medicareTax", label: "Medicare Tax (per paycheck)", format: "currency" },
    { key: "stateIncomeTax", label: "West Virginia State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a West Virginia income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for West Virginia, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and West Virginia's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter how " +
    "many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health insurance " +
    "premiums), post-tax deductions, and extra federal withholding if they apply to you — otherwise leave them " +
    "at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, Social Security tax, " +
    "Medicare tax, West Virginia state income tax, total deductions, and your estimated take-home pay, both per " +
    "paycheck and for the year.\n\n" +
    "West Virginia works differently from most states you'll find on this site, and it's worth understanding " +
    "before you rely on the numbers: West Virginia starts from your federal adjusted gross income (AGI) — not " +
    "federal taxable income — and it has NO standard deduction at all. Instead of a standard deduction, West " +
    "Virginia gives you a $2,000 personal exemption for yourself, another $2,000 if you're married filing " +
    "jointly, and $2,000 for each dependent you claim (with a $500 floor if you claim zero exemptions, which " +
    "mainly applies if someone else claims you as a dependent). West Virginia then applies five bracket rates — " +
    "2.11%, 2.81%, 3.16%, 4.22%, and 4.58% — to what's left, with the same dollar thresholds ($10,000/$25,000/" +
    "$40,000/$60,000) for every filing status.\n\n" +
    "Income taxes are calculated in five steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, that figure is used as a proxy for your federal AGI (West Virginia's own " +
    "starting point), your $2,000-per-exemption personal exemptions are subtracted from it (with the $500 floor " +
    "applied if you claim none), West Virginia's 2.11%/2.81%/3.16%/4.22%/4.58% bracket rates are applied to " +
    "what's left, and federal income tax plus Social Security and Medicare are calculated separately alongside " +
    "it. This calculator is reviewed and updated whenever the IRS or the West Virginia Tax Division publish new " +
    "annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the West Virginia Tax Division's official 2026 rate-cut figures for its state figures. It " +
    "doesn't account for tax credits, itemized deductions, or every possible W-4/WV-IT-104 election, so treat " +
    "it as a close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly " +
    "depending on your employer's payroll system.\n\n" +
    "West Virginia's own starting point is federal adjusted gross income (AGI), not federal taxable income, " +
    "and the state has NO standard deduction of its own — this is a genuine difference from how most states in " +
    "this calculator collection work, not a simplification. This calculator uses your taxable wages (salary " +
    "minus pre-tax deductions) as a proxy for AGI, which is close for a simple wage-only return but not always " +
    "identical to your actual federal AGI once other income and above-the-line adjustments are involved.\n\n" +
    "The $2,000-per-exemption personal exemption (self, spouse if filing jointly, and each dependent) is " +
    "applied as described in West Virginia's official IT-140 instructions and its personal exemption " +
    "regulation, including the $500 floor when zero exemptions are claimed. This calculator assumes one " +
    "exemption for you, one more if you select Married Filing Jointly, and one per dependent entered — it " +
    "doesn't model every edge case in the underlying regulation.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND West Virginia state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the West Virginia " +
    "Tax Division.";

  const examples =
    "Example: a Married Filing Jointly couple with 2 dependents earning $90,000 a year combined, paid biweekly " +
    "(26 paychecks/year), with no pre-tax or post-tax deductions, takes home approximately $2,835.27 per " +
    "paycheck — about $73,716.90 for the year — after federal income tax, Social Security, Medicare, and West " +
    "Virginia state income tax of $113.77 per paycheck.\n\n" +
    "That relatively modest state tax bite reflects West Virginia's exemption structure at work: with four " +
    "exemptions claimed (self, spouse, and 2 dependents at $2,000 each — $8,000 total), a meaningful slice of " +
    "this household's federal-AGI-based income is exempted before West Virginia's 2.11%–4.58% bracket rates " +
    "even apply, which is a very different mechanism from a flat standard deduction.";

  const faq = [
    {
      question: "Does West Virginia have a state income tax?",
      answer:
        "Yes. West Virginia taxes income at five rates — 2.11%, 2.81%, 3.16%, 4.22%, and 4.58% — using the same " +
        "dollar thresholds for every filing status, following the state's latest across-the-board rate cut, " +
        "effective retroactively to January 1, 2026.",
    },
    {
      question: "What are the West Virginia income tax brackets?",
      answer:
        "2.11% on the first $10,000, 2.81% on the next $15,000 (up to $25,000), 3.16% on the next $15,000 (up " +
        "to $40,000), 4.22% on the next $20,000 (up to $60,000), and 4.58% above $60,000. These thresholds are " +
        "the same whether you file Single, Married Filing Jointly, Married Filing Separately, or Head of " +
        "Household.",
    },
    {
      question: "What is West Virginia's standard deduction?",
      answer:
        "West Virginia has no standard deduction at all. Its income tax starts from your federal adjusted gross " +
        "income (AGI) rather than your federal taxable income, and instead of a standard deduction it offers a " +
        "$2,000 personal exemption for each exemption you claim.",
    },
    {
      question: "How does the West Virginia personal exemption work?",
      answer:
        "You get a $2,000 exemption for yourself, another $2,000 if you're married filing jointly, and $2,000 " +
        "for each dependent you claim — all subtracted from your federal-AGI-based income before West " +
        "Virginia's bracket rates apply. If you claim zero exemptions (for example, if someone else claims you " +
        "as a dependent), a $500 floor applies instead.",
    },
    {
      question: "What taxes are actually taken out of a West Virginia paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and West Virginia state " +
        "income tax (2.11%–4.58% brackets applied to your AGI-based income after personal exemptions).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and West Virginia " +
        "state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in West Virginia?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, West " +
        "Virginia state income tax, and any deductions you enter. Because West Virginia has no standard " +
        "deduction but does offer meaningful per-exemption relief, your take-home pay depends heavily on how " +
        "many exemptions (yourself, spouse, dependents) you're able to claim.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus the West " +
        "Virginia Tax Division's official 2026 brackets and personal exemption amounts. It uses taxable wages " +
        "as a proxy for federal AGI and doesn't include tax credits, itemized deductions, or every W-4/" +
        "WV-IT-104 adjustment, so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "West Virginia Income Tax Calculator",
    description:
      "This West Virginia income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for West " +
      "Virginia, a West Virginia payroll tax calculator for federal withholding, FICA, and state tax, or a " +
      "salary tax calculator for any pay frequency and number of dependents — it accounts for West Virginia's " +
      "AGI-based tax and $2,000-per-exemption personal exemption in place of a standard deduction.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom",
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "West Virginia Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free West Virginia income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), West Virginia state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to West Virginia's row in " +
      "/admin/state-calculators so it shows up in the \"Other State Calculators\" grid on Nevada's (and any " +
      "other state's) tool page."
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
