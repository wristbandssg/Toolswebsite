// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// finance expansion 4 sub-batch "india-uk". See
// src/lib/calc-engine-fin4-india-uk.ts for the full list of 3 sub-batches,
// and src/lib/calc-engine-fin4-india-uk.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run if new).
//
// HOW TO RUN
//   npx tsx prisma/create-fin4-india-uk-calculators.ts
// or
//   npm run db:create-fin4-india-uk-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}


function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "This tool gives estimates for learning and planning only and isn't financial, investment or tax advice. Results depend entirely on your inputs — check important decisions with a qualified professional.";

interface ToolDef {
  slug: string;
  category: { name: string; slug: string };
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });


const UK_FINANCE = { name: "UK Finance Calculators", slug: "uk-finance-calculators" };
const INDIAN_FINANCE = { name: "Indian Finance Calculators", slug: "indian-finance-calculators" };

const gbp = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", currency: "GBP", ...(highlight ? { highlight: true } : {}) });
const inr = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", currency: "INR", ...(highlight ? { highlight: true } : {}) });
const inrField = (key: string, label: string, def: number, opts: { max?: number; step?: number; required?: boolean } = {}) => ({ key, label, type: "currency", unit: "INR", required: opts.required ?? true, default: def, min: 0, max: opts.max ?? 1000000000, step: opts.step ?? 100 });
const SLAB = (def: number) => dropdown("taxSlab", "Your Income Tax Slab (old regime)", [["30%", 30], ["20%", 20], ["5%", 5], ["0%", 0]], def);

const TOOLS: ToolDef[] = [
  {
    slug: "uk-coin-weight-calculator",
    category: UK_FINANCE,
    title: "UK Coin Weight Calculator",
    description: "Count UK coins by weight — weigh your 1p, 2p, 5p, 10p, 20p, 50p, £1 and £2 coins and see how many you have and what they're worth, the way banks check coin bags.",
    metaTitle: "UK Coin Weight Calculator — Count Coins by Weight",
    metaDescription: "Free UK coin weight calculator. Enter the weight of each coin type to count 1p to £2 coins and total their value, using Royal Mint coin weights.",
    calcInputs: [["grams1p", "1p coins — weight (g)"], ["grams2p", "2p coins — weight (g)"], ["grams5p", "5p coins — weight (g)"], ["grams10p", "10p coins — weight (g)"], ["grams20p", "20p coins — weight (g)"], ["grams50p", "50p coins — weight (g)"], ["grams1pound", "£1 coins — weight (g)"], ["grams2pound", "£2 coins — weight (g)"]].map(([k, l], i) => numberField(k, l, { default: [356, 712, 325, 325, 250, 160, 175, 120][i], max: 1000000, step: 0.01, required: false })),
    calcResult: { label: "Total Value", format: "currency", currency: "GBP" },
    calcResults: [num("coins1p", "1p Coins"), num("coins2p", "2p Coins"), num("coins5p", "5p Coins"), num("coins10p", "10p Coins"), num("coins20p", "20p Coins"), num("coins50p", "50p Coins"), num("coins1pound", "£1 Coins"), num("coins2pound", "£2 Coins"), num("totalCoins", "Total Coins"), num("totalWeightKg", "Total Weight (kg)"), gbp("totalValue", "Total Value", true)],
    instructions: "Weigh each type of coin separately on a kitchen or postal scale and enter the weight in grams. The calculator divides by the Royal Mint weight of one coin and rounds to the nearest whole coin.",
    examples: "Example: 356 g of 1p coins is 100 coins (£1); 712 g of 2p is 100 coins (£2); 325 g of 5p is 100 coins (£5); 325 g of 10p is 50 coins (£5); 250 g of 20p is 50 coins (£10); 160 g of 50p is 20 coins (£10); 175 g of £1 is 20 coins (£20) and 120 g of £2 is 10 coins (£20) — £73 in all.",
    assumptions: "Royal Mint weights: 1p 3.56 g, 2p 7.12 g, 5p 3.25 g, 10p 6.50 g, 20p 5.00 g, 50p 8.00 g, £1 (12-sided) 8.75 g, £2 12.00 g. Pre-1992 bronze and old larger 5p/10p coins weigh differently, and worn coins weigh slightly less, so very large bags can be off by a coin or two. Bank bag values: 1p and 2p £1, 5p and 10p £5, 20p £10, 50p/£1/£2 £20.",
    faq: [
      { question: "How much does a bag of £1 coins weigh?", answer: "A standard £20 bag of 20 £1 coins weighs 175 g." },
      { question: "Can I pay coins into my bank?", answer: "Yes — use the bank's coin bags filled to the standard value; many banks and the Post Office accept them." },
    ],
  },
  {
    slug: "pence-to-pounds-converter",
    category: UK_FINANCE,
    title: "Pence to Pounds Converter",
    description: "Convert pence to pounds or pounds to pence — and see the amount as whole pounds and pence.",
    metaTitle: "Pence to Pounds Converter — p to £ and £ to p",
    metaDescription: "Free pence to pounds converter. Turn any number of pence into pounds (100p = £1), or pounds into pence, instantly.",
    calcInputs: [dropdown("direction", "Convert", [["Pence to pounds", 1], ["Pounds to pence", 2]], 1), numberField("amount", "Amount", { default: 1250, max: 1000000000000, step: 0.01 })],
    calcResult: { label: "Pounds", format: "currency", currency: "GBP" },
    calcResults: [gbp("pounds", "In Pounds", true), num("pence", "In Pence"), num("wholePounds", "Whole Pounds"), num("remainingPence", "Plus Pence")],
    instructions: "Choose the direction and enter the amount. There are 100 pence (p) in a pound (£).",
    examples: "Example: 1,250p = £12.50 — 12 pounds and 50 pence. £3.75 = 375p.",
    assumptions: "UK decimal currency since 1971: £1 = 100p.",
    faq: [
      { question: "How many pence are in a pound?", answer: "100 pence." },
      { question: "What is 50p in pounds?", answer: "£0.50 — half a pound." },
    ],
  },
  {
    slug: "atal-pension-yojana-calculator",
    category: INDIAN_FINANCE,
    title: "Atal Pension Yojana Calculator",
    description: "Find your Atal Pension Yojana (APY) monthly contribution for a guaranteed pension of ₹1,000 to ₹5,000 from age 60, based on the age you join — plus the total you'll pay and the corpus returned to your nominee.",
    metaTitle: "Atal Pension Yojana Calculator — APY Contribution Chart",
    metaDescription: "Free Atal Pension Yojana calculator. See the APY monthly, quarterly or half-yearly contribution for a ₹1,000–₹5,000 pension by joining age (18–40).",
    calcInputs: [numberField("entryAge", "Age When You Join (18–40)", { default: 25, min: 18, max: 40 }), dropdown("pensionAmount", "Monthly Pension You Want from Age 60", [["₹1,000", 1000], ["₹2,000", 2000], ["₹3,000", 3000], ["₹4,000", 4000], ["₹5,000", 5000]], 5000), dropdown("frequency", "Pay Contributions", [["Monthly", 1], ["Quarterly", 2], ["Half-yearly", 3]], 1)],
    calcResult: { label: "Monthly Contribution", format: "currency", currency: "INR" },
    calcResults: [inr("monthlyContribution", "Monthly Contribution", true), inr("contributionPerInstalment", "Per Instalment (your frequency)"), num("yearsOfContribution", "Years of Contribution"), inr("totalContributed", "Total You'll Contribute"), inr("monthlyPension", "Guaranteed Monthly Pension"), inr("corpusToNominee", "Corpus Returned to Nominee")],
    instructions: "Enter the age at which you join and the pension you want. You contribute until 60; then you get the pension for life, your spouse gets the same pension after you, and the corpus goes to your nominee after both.",
    examples: "Example: joining at 25 for a ₹5,000 pension costs ₹376 a month for 35 years — ₹1,57,920 in total — with ₹8.5 lakh returned to your nominee. Joining at 40 for the same pension costs ₹1,454 a month.",
    assumptions: "Official PFRDA contribution chart (unchanged since 2015). Open to Indian citizens aged 18–40 with a savings account; since 1 October 2022 income-tax payers can't join. Late payments attract a penalty of ₹1–10 a month. Contributions qualify for Section 80CCD(1). " + DISCLAIMER,
    faq: [
      { question: "Is the APY pension guaranteed?", answer: "Yes — the Government of India guarantees the pension amount you choose." },
      { question: "Can I exit APY before 60?", answer: "Voluntary exit returns only your contributions plus net actual income, minus charges; the full pension needs contributions until 60." },
    ],
  },
  {
    slug: "elss-calculator",
    category: INDIAN_FINANCE,
    title: "ELSS Calculator",
    description: "Calculate returns on an ELSS (equity-linked savings scheme) tax-saving mutual fund by SIP or lump sum, the Section 80C tax you save, and the LTCG tax on redemption.",
    metaTitle: "ELSS Calculator — Returns & 80C Tax Saving",
    metaDescription: "Free ELSS calculator. Project ELSS SIP or lump-sum returns, the Section 80C tax saved under the old regime, and LTCG tax after the 3-year lock-in.",
    calcInputs: [dropdown("mode", "Investment Type", [["Monthly SIP", 1], ["One-time lump sum", 2]], 1), inrField("investment", "Monthly SIP or Lump Sum", 12500, { step: 500 }), percentField("expectedReturn", "Expected Return per Year", { default: 12, max: 40, step: 0.1 }), numberField("years", "Years Invested (3+ lock-in)", { default: 5, min: 3, max: 40 }), SLAB(30)],
    calcResult: { label: "Maturity Value", format: "currency", currency: "INR" },
    calcResults: [inr("investedAmount", "Total Invested"), inr("maturityValue", "Maturity Value", true), inr("estimatedGains", "Estimated Gains"), inr("taxSavedFirstYear", "Section 80C Tax Saved per Year"), inr("ltcgTaxOnRedemption", "LTCG Tax on Redemption"), inr("valueAfterLtcg", "Value after LTCG Tax")],
    instructions: "Choose SIP or lump sum, the amount, expected return and how long you'll stay invested. ELSS has the shortest lock-in of any 80C option — 3 years for each instalment.",
    examples: "Example: ₹12,500 a month (₹1.5 lakh a year) for 5 years at 12% grows to about ₹10.31 lakh. In the 30% slab that saves ₹46,800 of tax a year, and LTCG tax on redemption is about ₹20,290.",
    assumptions: "80C deduction (up to ₹1.5 lakh a year including EPF, PPF, insurance etc.) only applies under the old tax regime; tax saved includes 4% cess. LTCG on equity funds: 12.5% (+ cess) on gains above ₹1.25 lakh a year, from 23 July 2024; assumes all gains are booked in one year. Returns aren't guaranteed. " + DISCLAIMER,
    faq: [
      { question: "Is ELSS useful under the new tax regime?", answer: "Not for tax saving — the new regime doesn't allow 80C — but it still works as a diversified equity fund." },
      { question: "How does the lock-in work for an ELSS SIP?", answer: "Each monthly instalment is locked for 3 years from its own date, so the last SIP unlocks 3 years after it's made." },
    ],
  },
  {
    slug: "hra-exemption-calculator",
    category: INDIAN_FINANCE,
    title: "HRA Exemption Calculator",
    description: "Calculate your house rent allowance (HRA) exemption under Section 10(13A) — the least of actual HRA, rent paid minus 10% of salary, and 50% or 40% of salary — and the taxable HRA.",
    metaTitle: "HRA Exemption Calculator — Section 10(13A)",
    metaDescription: "Free HRA exemption calculator. Find tax-free HRA from basic salary, DA, HRA received, rent paid and metro or non-metro city, and how much HRA is taxable.",
    calcInputs: [inrField("basicSalary", "Basic Salary (per year)", 600000, { step: 1000 }), inrField("dearnessAllowance", "Dearness Allowance (per year, if part of retirement benefits)", 0, { step: 1000, required: false }), inrField("hraReceived", "HRA Received (per year)", 240000, { step: 1000 }), inrField("rentPaid", "Rent Paid (per year)", 216000, { step: 1000 }), dropdown("cityType", "City", [["Metro (Delhi, Mumbai, Kolkata, Chennai)", 1], ["Non-metro", 2]], 1)],
    calcResult: { label: "HRA Exemption", format: "currency", currency: "INR" },
    calcResults: [inr("actualHra", "1. Actual HRA Received"), inr("rentMinus10PctSalary", "2. Rent Paid − 10% of Salary"), inr("percentOfSalary", "3. 50% / 40% of Salary"), inr("hraExemption", "HRA Exemption (least of the three)", true), inr("taxableHra", "Taxable HRA")],
    instructions: "Enter yearly figures. \"Salary\" here means basic pay plus dearness allowance that counts for retirement benefits. The exemption is the lowest of the three amounts.",
    examples: "Example: basic salary of ₹6,00,000, HRA of ₹2,40,000 and rent of ₹2,16,000 in Mumbai: rent minus 10% of salary is ₹1,56,000 — the lowest — so ₹1,56,000 is exempt and ₹84,000 is taxable.",
    assumptions: "Section 10(13A) and Rule 2A; available only under the old tax regime. Rent above ₹1 lakh a year needs the landlord's PAN. If you don't receive HRA, Section 80GG may allow a smaller deduction. " + DISCLAIMER,
    faq: [
      { question: "Can I claim HRA under the new tax regime?", answer: "No — the HRA exemption is only available under the old regime." },
      { question: "Can I claim HRA if I pay rent to my parents?", answer: "Yes, with a genuine rent agreement and payment record; your parents must declare the rent as income." },
    ],
  },
  {
    slug: "national-pension-system-calculator",
    category: INDIAN_FINANCE,
    title: "NPS Calculator for India",
    description: "Calculate your National Pension System (NPS) corpus at retirement, the tax-free lump sum, the annuity purchase and your monthly pension — plus the extra 80CCD(1B) tax saving.",
    metaTitle: "NPS Calculator India — National Pension System Pension",
    metaDescription: "Free NPS calculator for India. Project your National Pension System corpus, 60% tax-free lump sum, annuity and monthly pension from your contributions.",
    calcInputs: [inrField("monthlyContribution", "Monthly Contribution", 5000, { step: 500 }), numberField("currentAge", "Current Age", { default: 30, min: 18, max: 69 }), numberField("retirementAge", "Retirement Age", { default: 60, min: 40, max: 75 }), percentField("expectedReturn", "Expected Return per Year", { default: 10, max: 20, step: 0.1 }), percentField("annuityPercent", "Corpus Used for Annuity (min 40%)", { default: 40, min: 40, max: 100, step: 1 }), percentField("annuityRate", "Expected Annuity Rate", { default: 6, max: 15, step: 0.1 }), SLAB(30)],
    calcResult: { label: "Monthly Pension", format: "currency", currency: "INR" },
    calcResults: [inr("totalInvested", "Total Invested"), inr("corpusAtRetirement", "Corpus at Retirement"), inr("lumpSumWithdrawal", "Tax-Free Lump Sum"), inr("annuityPurchase", "Used to Buy Annuity"), inr("monthlyPension", "Monthly Pension", true), inr("yearlyTaxSaved80ccd1b", "Yearly Tax Saved (80CCD(1B))")],
    instructions: "Enter what you'll contribute each month, your age and the return you expect (equity-heavy NPS schemes have returned about 9–12% over long periods). At 60 at least 40% of the corpus must buy an annuity; the rest can be withdrawn tax-free.",
    examples: "Example: ₹5,000 a month from 30 to 60 at 10% builds a corpus of about ₹1.14 crore. ₹68.4 lakh can be taken as a tax-free lump sum and ₹45.6 lakh buys an annuity paying about ₹22,793 a month.",
    assumptions: "Monthly compounding; annuity rates from insurers are around 6–7%. Section 80CCD(1B) gives an extra ₹50,000 deduction under the old regime (tax saved includes 4% cess); employer contributions up to 14% of basic are deductible under 80CCD(2) in the new regime. If the corpus is ₹5 lakh or less, it can all be withdrawn. Not the Net Promoter Score — see the NPS Calculator for that. " + DISCLAIMER,
    faq: [
      { question: "Is the NPS lump sum tax-free?", answer: "Yes — up to 60% of the corpus withdrawn at retirement is tax-free; the annuity income is taxed as salary." },
      { question: "Can I withdraw from NPS before 60?", answer: "Partial withdrawals of up to 25% of your own contributions are allowed after 3 years for specific needs like education, marriage, a home or illness." },
    ],
  },
  {
    slug: "tds-interest-calculator",
    category: INDIAN_FINANCE,
    title: "TDS Interest Calculator",
    description: "Calculate interest on late TDS — 1% a month for late deduction and 1.5% a month for late payment under Section 201(1A) — and the Section 234E late filing fee.",
    metaTitle: "TDS Interest Calculator — Section 201(1A) & 234E",
    metaDescription: "Free TDS interest calculator. Work out interest for late deduction (1%) and late deposit (1.5%) of TDS, plus the ₹200-a-day late return fee.",
    calcInputs: [inrField("tdsAmount", "TDS Amount", 50000, { step: 100 }), numberField("monthsLateDeduction", "Months from Due Date of Deduction to Actual Deduction", { default: 0, max: 120, required: false }), numberField("monthsLatePayment", "Months from Deduction to Payment to Government", { default: 2, max: 120 }), numberField("daysLateFiling", "Days the TDS Return Was Filed Late", { default: 30, max: 3650, required: false })],
    calcResult: { label: "Total Interest", format: "currency", currency: "INR" },
    calcResults: [inr("interestLateDeduction", "Interest — Late Deduction (1% a month)"), inr("interestLatePayment", "Interest — Late Payment (1.5% a month)"), inr("totalInterest", "Total Interest", true), inr("lateFilingFee234E", "Late Filing Fee (Section 234E)"), inr("totalPayable", "TDS + Interest + Fee")],
    instructions: "Count months as calendar months, with any part of a month counting as a full month (enter the rounded-up number). TDS must normally be deposited by the 7th of the next month (30 April for March).",
    examples: "Example: ₹50,000 of TDS deducted on time but deposited 2 months late costs ₹1,500 of interest. Filing the quarterly return 30 days late adds a ₹6,000 fee — ₹57,500 in total.",
    assumptions: "Section 201(1A): 1% per month or part from the date tax was deductible to the date deducted, and 1.5% per month or part from deduction to payment. Section 234E: ₹200 per day of delay, capped at the TDS amount. A penalty under Section 271H (₹10,000–₹1 lakh) may also apply. " + DISCLAIMER,
    faq: [
      { question: "Is interest on late TDS deductible as a business expense?", answer: "No — courts have generally held it's not an allowable deduction." },
      { question: "Does part of a month count as a full month?", answer: "Yes — even one day late in a month counts as a full month for TDS interest." },
    ],
  },
];

// Every sub-category here hangs directly under Finance Calculators and is
// created on first use.
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) throw new Error(`The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first.`);
  console.log(`Creating sub-category "${cat.name}" under "${finance.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const category = await ensureCategory(def.category);
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
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
