// One-time (but safe to re-run) batch setup script: creates 6 US state
// Capital Gains Tax Tools inside the existing "Tax & Paycheck Calculators"
// category — the second batch of the 50-state audit.
//
// See src/lib/calc-engine-us-capital-gains-extended.ts for the actual math
// and that file's header for what makes each of these 6 states a genuine
// exception (every other state taxes capital gains as ordinary income,
// already covered by that state's base income tax calculator).
//
// HOW TO RUN
//   npx tsx prisma/create-us-capital-gains-extended-calculators.ts
// or
//   npm run db:create-us-capital-gains-extended-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function currencyField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 5_000_000,
    step: opts.step ?? 1_000,
  };
}
function dropdownField(key: string, label: string, options: { label: string; value: number }[], defaultValue = 0) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}
function currencyResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "currency", highlight: opts.highlight };
}
function percentResult(key: string, label: string) {
  return { key, label, format: "percentage" };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. Capital gains tax law is unusually fast-moving right now — several of the figures here changed " +
  "within the last year or two — so consult a qualified tax professional or the state's own Department of " +
  "Revenue before making any decisions.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "washington-capital-gains-tax-calculator",
    title: "Washington Capital Gains Tax Calculator",
    description:
      "Washington has no state income tax, but it does levy a unique standalone excise tax on long-term " +
      "capital gains: 7% up to $1 million of taxable gain, 9.9% above, after a standard deduction.",
    metaTitle: "Washington Capital Gains Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Washington capital gains tax calculator. Washington's unique excise tax: 7% up to $1M of taxable " +
      "gain, 9.9% above, after a standard deduction.",
    calcInputs: [currencyField("longTermCapitalGains", "Long-Term Capital Gains", { max: 10_000_000, step: 5_000 })],
    calcResults: [
      currencyResult("standardDeductionApplied", "Standard Deduction Applied"),
      currencyResult("taxableGain", "Taxable Gain"),
      currencyResult("capitalGainsExciseTax", "Washington Capital Gains Excise Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Washington has no general state income tax, but since 2022 it has levied a standalone excise tax on " +
      "long-term capital gains — upheld by the Washington Supreme Court, with the U.S. Supreme Court declining " +
      "to hear a further challenge. A standard deduction (currently $278,000) is subtracted from your gain " +
      "first; what's left is taxed at 7% up to $1 million, and 9.9% on anything above that.\n\n" +
      "This tax has significant statutory exemptions — most notably real estate sales, retirement account " +
      "withdrawals, and gains from selling a qualifying small business — that don't count as taxable gain at " +
      "all. Enter only the long-term capital gains that are actually subject to this excise tax; see the " +
      "Assumptions section below and consult a professional if you're unsure whether an exemption applies to " +
      "you.",
    assumptions:
      "This calculator uses the $278,000 standard deduction most recently published (2025; the 2026 figure, " +
      "which adjusts for inflation, hadn't been published as of this tool's last review — check the Washington " +
      "Department of Revenue for the current-year figure) and the 7%/9.9% two-tier rate structure. It doesn't " +
      "model any of the statutory exemptions (real estate, retirement accounts, qualifying small business " +
      "sales, and others) — only enter capital gains you already know are subject to this tax.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: $1,278,000 of taxable long-term capital gains. After the $278,000 standard deduction, " +
      "$1,000,000 is taxable — all within the 7% tier — for an estimated tax of $70,000.",
    faq: [
      {
        question: "Is this the same as a state income tax?",
        answer:
          "No — Washington has no general income tax. This is a standalone excise tax that applies only to " +
          "long-term capital gains above the standard deduction, with its own separate legal basis.",
      },
      {
        question: "Does this cover gains from selling my house?",
        answer:
          "No — real estate sales are statutorily exempt from this tax entirely, along with retirement account " +
          "withdrawals and several other categories. This calculator doesn't model those exemptions; only enter " +
          "gains you know are actually subject to the tax.",
      },
      {
        question: "Has this tax survived legal challenges?",
        answer:
          "Yes — the Washington Supreme Court upheld it, and the U.S. Supreme Court declined to hear a further " +
          "appeal, so it remains in effect.",
      },
    ],
  },
  {
    slug: "hawaii-capital-gains-tax-calculator",
    title: "Hawaii Capital Gains Tax Calculator",
    description:
      "Hawaii caps the tax rate on net capital gains at a flat 7.25% — below the state's 11% top ordinary " +
      "income tax rate.",
    metaTitle: "Hawaii Capital Gains Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Hawaii capital gains tax calculator. Hawaii caps capital gains at a flat 7.25%, below its 11% top ordinary rate.",
    calcInputs: [currencyField("netCapitalGains", "Net Capital Gains", { max: 5_000_000 })],
    calcResults: [percentResult("ratedApplied", "Rate Applied"), currencyResult("capitalGainsTax", "Hawaii Capital Gains Tax", { highlight: true })],
    instructions:
      "Hawaii's ordinary income tax rates run as high as 11%, but the state caps the rate on net long-term " +
      "capital gains at a flat 7.25% instead — a real, meaningful break for anyone whose ordinary marginal rate " +
      "would otherwise be higher. Enter your net capital gains to see the tax at this capped rate.\n\n" +
      "This 7.25% figure is a ceiling, not a floor: if your income is modest enough that your ordinary tax " +
      "bracket would actually be below 7.25%, you'd pay that lower ordinary rate instead — use our Hawaii " +
      "Income Tax Calculator to check your ordinary bracket if your income (including the gain) is on the " +
      "lower end.",
    assumptions:
      "This calculator applies Hawaii's 7.25% capital gains cap directly, which is accurate for the great " +
      "majority of taxpayers with any meaningful capital gain (since Hawaii's ordinary brackets exceed 7.25% " +
      "for most taxable income levels). It doesn't calculate your specific ordinary marginal rate to confirm " +
      "the cap actually helps you — for a low overall income, check our Hawaii Income Tax Calculator instead.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: $200,000 of net capital gains. At Hawaii's capped 7.25% rate, the estimated Hawaii capital " +
      "gains tax is $14,500 — versus what could be materially more under the state's 11% top ordinary rate.",
    faq: [
      {
        question: "Is 7.25% always what I'll pay on capital gains in Hawaii?",
        answer:
          "For most taxpayers with a meaningful gain, yes — it's a cap that applies whenever your ordinary rate " +
          "would otherwise be higher. If your total income is low enough that your ordinary bracket is under " +
          "7.25%, you'd pay that lower rate instead.",
      },
      {
        question: "What's Hawaii's top ordinary income tax rate?",
        answer: "11%, for the highest earners — well above the 7.25% capital gains cap.",
      },
    ],
  },
  {
    slug: "massachusetts-capital-gains-tax-calculator",
    title: "Massachusetts Capital Gains Tax Calculator",
    description:
      "Massachusetts taxes short-term capital gains at 8.5% and long-term gains at 5% — plus a 4% surtax on " +
      "income above roughly $1.08 million.",
    metaTitle: "Massachusetts Capital Gains Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Massachusetts capital gains tax calculator. Short-term gains at 8.5%, long-term at 5%, plus the 4% " +
      "Millionaires surtax above ~$1.08M.",
    calcInputs: [
      currencyField("shortTermGains", "Short-Term Capital Gains", { required: false, default: 0, max: 5_000_000 }),
      currencyField("longTermGains", "Long-Term Capital Gains", { required: false, default: 0, max: 5_000_000 }),
    ],
    calcResults: [
      currencyResult("shortTermTax", "Tax on Short-Term Gains (8.5%)"),
      currencyResult("longTermTax", "Tax on Long-Term Gains (5%)"),
      currencyResult("surtaxAmount", "4% Millionaires Surtax"),
      currencyResult("totalCapitalGainsTax", "Total Massachusetts Capital Gains Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Massachusetts is one of the few states that genuinely splits its capital gains tax rate by holding " +
      "period: short-term gains (assets held one year or less) are taxed at 8.5%, well above the state's " +
      "regular 5% income tax rate, while long-term gains are taxed at the standard 5%. On top of that, " +
      "Massachusetts' 4% \"Millionaires surtax\" applies to income above roughly $1.08 million — including " +
      "capital gains.\n\n" +
      "Enter your short-term and long-term gains separately to see each taxed at its own rate, plus any surtax " +
      "that applies.",
    assumptions:
      "This calculator applies the surtax to the gains portion above the roughly $1,083,150 threshold as a " +
      "simplification — in reality, the surtax threshold is based on your TOTAL Massachusetts taxable income " +
      "(wages, gains, and everything else combined), not gains in isolation, so if you have substantial other " +
      "income, the actual surtax owed could be higher than this tool shows.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: $50,000 of short-term gains and $200,000 of long-term gains, no other income near the surtax " +
      "threshold. Short-term tax: $4,250. Long-term tax: $10,000. Total: $14,250, with no surtax since combined " +
      "gains are well under $1.08 million.",
    faq: [
      {
        question: "Why is short-term capital gains tax so much higher in Massachusetts?",
        answer:
          "Massachusetts taxes short-term gains at 8.5%, a rate specifically set above its standard 5% income " +
          "tax rate — most other states with an income tax don't distinguish holding periods at all.",
      },
      {
        question: "What is the Massachusetts Millionaires surtax?",
        answer:
          "An additional 4% tax on income (of any kind, including capital gains) above roughly $1,083,150, on " +
          "top of the regular rate that already applies.",
      },
    ],
  },
  {
    slug: "montana-capital-gains-tax-calculator",
    title: "Montana Capital Gains Tax Calculator",
    description:
      "Montana taxes capital gains at a distinct, lower two-bracket schedule (3.0%/4.1%) than its ordinary " +
      "income tax brackets (4.70%/5.65%).",
    metaTitle: "Montana Capital Gains Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Montana capital gains tax calculator. Montana's capital gains brackets (3.0%/4.1%) are lower than its ordinary income tax rates.",
    calcInputs: [
      currencyField("netCapitalGains", "Net Capital Gains", { max: 2_000_000 }),
      dropdownField("filingStatus", "Filing Status", [
        { label: "Single / Married Filing Separately", value: 0 },
        { label: "Married Filing Jointly", value: 1 },
      ]),
    ],
    calcResults: [
      currencyResult("bracketThreshold", "Bracket Threshold"),
      currencyResult("lowerBracketTax", "Tax at 3.0% Bracket"),
      currencyResult("upperBracketTax", "Tax at 4.1% Bracket"),
      currencyResult("capitalGainsTax", "Montana Capital Gains Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Montana survived a 2025 tax reform with a real, distinct capital gains tax break intact: gains are " +
      "taxed at a lower two-bracket schedule (3.0% then 4.1%) than the state's ordinary income tax brackets " +
      "(4.70% then 5.65%). Enter your net capital gains and filing status to see the tax at these lower rates.",
    assumptions:
      "This calculator uses an approximate bracket threshold ($20,500 single/separate, $41,000 joint) between " +
      "Montana's 3.0% and 4.1% capital gains brackets — the audit behind this tool confirmed both rates but not " +
      "the exact published break point, so verify the precise current-year threshold with the Montana " +
      "Department of Revenue for an amount close to it.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: $50,000 of net capital gains, single filer. The first $20,500 is taxed at 3.0% ($615); the " +
      "remaining $29,500 at 4.1% ($1,209.50) — an estimated total of $1,824.50.",
    faq: [
      {
        question: "Are Montana's capital gains rates really lower than its income tax rates?",
        answer:
          "Yes — Montana's 2025 tax reform preserved a distinct, lower two-bracket schedule (3.0%/4.1%) for " +
          "capital gains, versus 4.70%/5.65% for ordinary income.",
      },
    ],
  },
  {
    slug: "maryland-capital-gains-tax-calculator",
    title: "Maryland Capital Gains Tax Surcharge Calculator",
    description:
      "Maryland added a new 2% surcharge on net capital gains once federal AGI exceeds $350,000 (effective " +
      "7/1/2025) — layered on top of ordinary Maryland income tax on the same gain.",
    metaTitle: "Maryland Capital Gains Tax Surcharge Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Maryland capital gains surcharge calculator. A new 2% surcharge applies to net capital gains once " +
      "federal AGI exceeds $350,000.",
    calcInputs: [
      currencyField("netCapitalGains", "Net Capital Gains", { max: 5_000_000 }),
      currencyField("federalAGI", "Federal Adjusted Gross Income (AGI)", { max: 10_000_000 }),
    ],
    calcResults: [percentResult("thresholdCleared", "Threshold Cleared? (1 = yes)"), currencyResult("capitalGainsSurcharge", "Maryland Capital Gains Surcharge", { highlight: true })],
    instructions:
      "Maryland ordinarily taxes capital gains as regular income (see our Maryland Income Tax Calculator for " +
      "that). But effective July 1, 2025, Maryland added something new on top: a 2% surcharge on net capital " +
      "gains for any taxpayer whose federal AGI exceeds $350,000. This calculator covers ONLY that new " +
      "surcharge — not your regular Maryland income tax on the gain, which is separate.\n\n" +
      "Enter your net capital gains and your federal AGI to see whether the surcharge applies and how much it " +
      "adds.",
    assumptions:
      "This calculator uses a single $350,000 federal AGI threshold for all filing statuses — Maryland's " +
      "published guidance describes the threshold in terms of AGI exceeding $350,000, without a separately " +
      "confirmed higher figure for joint filers as of this tool's last review; verify with the Comptroller of " +
      "Maryland if you file jointly and are close to this line. This is a NEW, recently effective tax (July " +
      "2025) — a strong candidate to double-check for any further updates.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: $500,000 of net capital gains, federal AGI of $600,000 (over the $350,000 threshold). The " +
      "surcharge applies to the full net capital gains amount: $500,000 x 2% = $10,000 — on top of ordinary " +
      "Maryland income tax on the same gain.",
    faq: [
      {
        question: "Is this instead of Maryland's regular income tax on capital gains?",
        answer:
          "No — this surcharge is IN ADDITION TO ordinary Maryland income tax on the same gain, which this " +
          "tool doesn't calculate. See our Maryland Income Tax Calculator for the base tax.",
      },
      {
        question: "When did this surcharge take effect?",
        answer: "July 1, 2025 — it's a very recent addition to Maryland tax law.",
      },
    ],
  },
  {
    slug: "missouri-capital-gains-tax-calculator",
    title: "Missouri Capital Gains Tax Calculator",
    description:
      "Missouri became the first US state ever to fully repeal its individual capital gains tax, effective for " +
      "tax year 2025 onward. This calculator confirms: individuals owe $0 in Missouri capital gains tax.",
    metaTitle: "Missouri Capital Gains Tax Calculator (2026) — $0 Owed",
    metaDescription:
      "Missouri fully repealed its individual capital gains tax in 2025 — the first US state ever to do so. " +
      "Confirm your Missouri capital gains tax: $0.",
    calcInputs: [currencyField("netCapitalGains", "Net Capital Gains", { max: 10_000_000 })],
    calcResults: [currencyResult("netCapitalGainsEntered", "Net Capital Gains Entered"), currencyResult("capitalGainsTaxOwed", "Missouri Capital Gains Tax Owed", { highlight: true })],
    instructions:
      "In 2025, Missouri became the first US state ever to fully repeal its individual capital gains tax — " +
      "retroactive to tax year 2025. Whatever your gain, an individual Missouri taxpayer owes $0 in state " +
      "capital gains tax. Enter your gain if you'd like to see it reflected in a $0 result, or simply take this " +
      "as confirmation: Missouri doesn't tax individual capital gains.",
    assumptions:
      "This reflects Missouri's 2025 repeal of individual capital gains tax as currently enacted. Tax law can " +
      "always change again in a future legislative session — this tool reflects the law as it stands, not a " +
      "permanent guarantee. This tool covers individual taxpayers only; corporate capital gains treatment in " +
      "Missouri isn't addressed here.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: a $5,000,000 capital gain from selling a business. Missouri individual capital gains tax owed: $0.",
    faq: [
      {
        question: "Is Missouri really the first state to do this?",
        answer:
          "Yes — Missouri's 2025 repeal of individual capital gains tax, retroactive to tax year 2025, made it " +
          "the first US state ever to fully eliminate this tax for individuals.",
      },
      {
        question: "Could this change again?",
        answer:
          "Yes, in principle — like any state law, a future legislature could reinstate it. This tool reflects " +
          "the law as currently enacted.",
      },
      {
        question: "Does this apply to businesses/corporations too?",
        answer: "This tool covers individual taxpayers only; Missouri's corporate income tax treatment of capital gains is separate.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: "Tax & Paycheck Calculators" },
    create: { name: "Tax & Paycheck Calculators", slug: CATEGORY_SLUG, templateKey: "category-template-1", viewStyle: "grid" },
  });

  for (const t of TOOLS) {
    const toolContent = {
      title: t.title,
      description: t.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(t.calcInputs),
      calcResult: JSON.stringify({ label: t.title, unit: "", format: "currency" }),
      calcResults: JSON.stringify(t.calcResults),
      instructions: paragraphsToHtml(t.instructions),
      examples: paragraphsToHtml(t.examples),
      assumptions: paragraphsToHtml(t.assumptions),
      faq: JSON.stringify(t.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: t.metaTitle,
      metaDescription: t.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: t.slug } });
    if (existing) {
      await prisma.tool.update({ where: { slug: t.slug }, data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } } });
      console.log(`Updated "${t.slug}".`);
    } else {
      await prisma.tool.create({ data: { slug: t.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } } });
      console.log(`Created "${t.slug}" (status: draft).`);
    }
  }

  console.log(`\nDone — ${TOOLS.length} tools created/updated, all status "draft". Review in /admin/tools.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
