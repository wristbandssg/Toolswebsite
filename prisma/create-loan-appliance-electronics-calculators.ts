// One-time (but safe to re-run) batch setup script: creates the 8 tools
// of the Loan Calculators expansion 2, sub-batch 3 (Appliance & Electronics Loans),
// filed under Finance Calculators > Loan Calculators > Personal Loan Calculators. See src/lib/calc-engine-loan-appliance-electronics.ts for
// the math and src/lib/calc-engine-loan-life-events.ts for the full batch
// context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-appliance-electronics-calculators.ts
// or
//   npm run db:create-loan-appliance-electronics-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Personal Loan Calculators", slug: "personal-loan-calculators" };

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
    max: opts.max ?? 100000000,
    step: opts.step ?? 100,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    step: opts.step ?? 0.1,
  };
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

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial advice. " +
  "Actual rates, fees, and terms depend on the lender and your credit profile — check your loan agreement " +
  "or ask your lender for exact figures.";

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
  {
    slug: "appliance-loan-calculator",
    title: "Appliance Loan Calculator",
    description: "Add installation, haul-away and sales tax to an appliance's price, subtract rebates and your down payment, and see the monthly payment.",
    metaTitle: "Appliance Loan Calculator — Payment With Install & Tax",
    metaDescription: "Free appliance loan calculator. Add installation, haul-away and tax, subtract rebates and your down payment, and see your monthly payment.",
    calcInputs: [
      currencyField("appliancePrice", "Appliance Price", { default: 2500, max: 1000000, step: 25 }),
      currencyField("installation", "Installation", { default: 200, max: 100000, step: 10, required: false }),
      currencyField("haulAway", "Old Appliance Haul-Away", { default: 50, max: 10000, step: 5, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.125 }),
      currencyField("rebates", "Utility / Manufacturer Rebates", { default: 150, max: 100000, step: 10, required: false }),
      currencyField("downPayment", "Down Payment", { default: 0, max: 1000000, step: 25, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 18, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 18, min: 3, max: 60, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalPrice", label: "Total Price", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the appliance price, installation and haul-away charges, your sales tax rate, any rebates (many " +
      "utilities offer rebates on energy-efficient models), your down payment, and the financing rate and term.",
    examples:
      "Example: a $2,500 refrigerator with $200 installation, $50 haul-away, and 7% tax ($175) costs $2,925. After a " +
      "$150 rebate you finance $2,775 — $177.06 a month at 18% over 18 months, with $412.10 of interest.",
    assumptions:
      "Sales tax is applied to the appliance only. Mail-in rebates may arrive weeks later — put them toward the loan " +
      "when they do. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is the best time to buy appliances?",
        answer: "Big holiday sales (such as Black Friday and long weekends) and the months when new models arrive often bring the lowest prices — useful if the purchase isn't an emergency.",
      },
    ],
  },
  {
    slug: "appliance-loan-payment-calculator",
    title: "Appliance Loan Payment Calculator",
    description: "Compare the monthly payment on an appliance loan with what a more energy-efficient model saves on your bills, to see the net monthly cost.",
    metaTitle: "Appliance Loan Payment Calculator — vs Energy Savings",
    metaDescription: "Free appliance loan payment calculator. Compare the monthly payment with the energy savings of an efficient model and see the net cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 2000, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate", { default: 18, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 60, step: 3 }),
      numberField("annualKwhSaved", "Electricity Saved per Year (kWh)", { default: 600, min: 0, max: 100000, step: 10 }),
      currencyField("electricityRate", "Electricity Price per kWh", { default: 0.17, max: 1, step: 0.01 }),
      currencyField("otherMonthlySavings", "Other Monthly Savings (Water, Gas)", { default: 0, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Net Monthly Cost", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Loan Payment", format: "currency" },
      { key: "monthlyEnergySavings", label: "Monthly Energy Savings", format: "currency" },
      { key: "netMonthlyCost", label: "Net Monthly Cost", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "savingsOverLoanTerm", label: "Savings While You Repay", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, how many kWh a year the new appliance saves compared with your old one " +
      "(compare the yellow EnergyGuide labels), your electricity price, and any water or gas savings. The tool shows " +
      "what the upgrade really costs each month once savings are counted.",
    examples:
      "Example: a $2,000 loan at 18% over 24 months costs $99.85 a month. Saving 600 kWh a year at $0.17 is worth $8.50 " +
      "a month, so the net cost is $91.35 a month — $204 of savings over the loan against $396.36 of interest.",
    assumptions:
      "Energy savings are rarely enough on their own to pay for a new appliance; they help most when the old one is " +
      "failing anyway. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where do I find an appliance's energy use?",
        answer: "In the US, the yellow EnergyGuide label shows estimated yearly electricity use in kWh and running cost. ENERGY STAR models use less than standard ones.",
      },
    ],
  },
  {
    slug: "appliance-loan-cost-calculator",
    title: "Appliance Loan Cost Calculator",
    description: "Decide whether to repair an old appliance or finance a new one by comparing the cost per year of useful life, including loan interest.",
    metaTitle: "Appliance Loan Cost Calculator — Repair or Replace?",
    metaDescription: "Free repair vs replace calculator. Compare a repair's cost per year with a financed new appliance's cost per year, interest included.",
    calcInputs: [
      currencyField("repairCost", "Repair Quote", { default: 450, max: 100000, step: 10 }),
      numberField("oldYearsLeft", "Years the Old One Will Last After Repair", { default: 3, min: 0.25, max: 30, step: 0.5 }),
      currencyField("newPrice", "New Appliance Price (Installed)", { default: 1800, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 18, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 1, max: 60, step: 1 }),
      numberField("newLifeYears", "Expected Life of the New One (Years)", { default: 13, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Replacing Saves per Year", format: "currency" },
    calcResults: [
      { key: "repairCostPerYear", label: "Repair — Cost per Year", format: "currency" },
      { key: "newTotalWithInterest", label: "New — Total Cost With Interest", format: "currency" },
      { key: "newCostPerYear", label: "New — Cost per Year", format: "currency" },
      { key: "replacingSavesPerYear", label: "Replacing Saves per Year", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the repair quote and how many more years you expect the old appliance to last after it, then the new " +
      "appliance's installed price, the loan's rate and term, and its expected life. A negative saving means repairing " +
      "is cheaper per year. A common rule of thumb: if a repair costs more than half the price of a new one, replace " +
      "it.",
    examples:
      "Example: a $450 repair that buys 3 more years costs $150 a year. A $1,800 replacement financed at 18% over 24 " +
      "months costs $2,156.72, or $165.90 a year over 13 years — so repairing is $15.90 a year cheaper.",
    assumptions:
      "Ignores energy savings from a new model and the chance of further repairs on the old one. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long do appliances usually last?",
        answer: "Roughly 10–15 years for refrigerators and washers, 10–13 for dishwashers and dryers, and 13–15 for ranges, depending on brand, use, and maintenance.",
      },
    ],
  },
  {
    slug: "appliance-loan-payoff-calculator",
    title: "Appliance Loan Payoff Calculator",
    description: "On a lease-to-own appliance, see what an early buyout costs compared with making every remaining weekly payment.",
    metaTitle: "Appliance Loan Payoff Calculator — Lease-to-Own Buyout",
    metaDescription: "Free lease-to-own appliance payoff calculator. Compare the early buyout price with the remaining weekly payments and see the savings.",
    calcInputs: [
      currencyField("cashPrice", "Cash Price of the Appliance", { default: 1200, max: 1000000, step: 25 }),
      currencyField("weeklyPayment", "Weekly Payment", { default: 30, max: 10000, step: 1 }),
      numberField("totalWeeks", "Total Weeks to Ownership", { default: 104, min: 1, max: 260, step: 1 }),
      numberField("weeksPaid", "Weeks Already Paid", { default: 30, min: 0, max: 260, step: 1 }),
      percentField("buyoutPercent", "Early Buyout (% of Remaining Payments)", { default: 50, max: 100, step: 5 }),
    ],
    calcResult: { label: "Saved by Buying Out Now", format: "currency" },
    calcResults: [
      { key: "paidSoFar", label: "Paid So Far", format: "currency" },
      { key: "remainingIfYouKeepPaying", label: "Remaining If You Keep Paying", format: "currency" },
      { key: "earlyBuyoutPrice", label: "Early Buyout Price", format: "currency" },
      { key: "savedByBuyingOut", label: "Saved by Buying Out Now", format: "currency", highlight: true },
      { key: "totalWithBuyout", label: "Total Paid With Buyout", format: "currency" },
      { key: "paidAboveCashPrice", label: "Paid Above the Cash Price", format: "currency" },
    ],
    instructions:
      "Lease-to-own stores usually let you buy the item early for less than the remaining payments. Enter the cash " +
      "price, weekly payment, total weeks, weeks already paid, and the early buyout terms from your agreement — " +
      "often stated as a percentage of the remaining payments.",
    examples:
      "Example: a $1,200 washer at $30 a week for 104 weeks. After 30 weeks you've paid $900 and $2,220 remains. A " +
      "buyout at 50% of that costs $1,110, saving $1,110 — though in total you'd still pay $2,010, $810 above the cash " +
      "price.",
    assumptions:
      "Buyout formulas differ by company and state; ask for the exact figure. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is lease-to-own the same as a loan?",
        answer: "No. You're renting until the final payment or buyout, so you can return the item, but the total cost is usually far higher than financing or saving up.",
      },
    ],
  },
  {
    slug: "electronics-loan-calculator",
    title: "Electronics Loan Calculator",
    description: "Add accessories, a protection plan and sales tax to a laptop, phone or TV, subtract your trade-in, and see the monthly payment.",
    metaTitle: "Electronics Loan Calculator — Payment With Trade-In",
    metaDescription: "Free electronics loan calculator. Add accessories, protection and tax, subtract a trade-in and down payment, and see your payment.",
    calcInputs: [
      currencyField("devicePrice", "Device Price", { default: 1800, max: 1000000, step: 25 }),
      currencyField("accessories", "Accessories", { default: 200, max: 100000, step: 10, required: false }),
      currencyField("protectionPlan", "Protection Plan", { default: 150, max: 100000, step: 10, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.125 }),
      currencyField("tradeInValue", "Trade-In Value", { default: 300, max: 1000000, step: 10, required: false }),
      currencyField("downPayment", "Down Payment", { default: 0, max: 1000000, step: 25, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 20, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 3, max: 48, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalPrice", label: "Total Price", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the device price, accessories, any protection plan, your sales tax rate, trade-in value, down payment, " +
      "and the financing rate and term. Keep the term no longer than you'll use the device.",
    examples:
      "Example: an $1,800 laptop with $200 of accessories, a $150 protection plan, and 7% tax ($140) costs $2,290. After " +
      "a $300 trade-in you finance $1,990 — $184.34 a month at 20% over 12 months, with $222.11 of interest.",
    assumptions:
      "Sales tax is applied to the device and accessories; rules for plans and trade-ins vary by state. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are buy-now-pay-later plans cheaper?",
        answer: "'Pay in 4' plans are often interest-free if paid on time, but longer BNPL plans can carry interest, and late fees add up. Read the terms before choosing.",
      },
    ],
  },
  {
    slug: "electronics-loan-payment-calculator",
    title: "Electronics Loan Payment Calculator",
    description: "Break down a phone carrier's 0% device payment plan with monthly bill credits — your net monthly cost, and what you'd owe and lose if you leave early.",
    metaTitle: "Electronics Loan Payment Calculator — Carrier Plans",
    metaDescription: "Free phone payment plan calculator. See the monthly installment, net cost after bill credits, and what you'd owe and lose if you switch early.",
    calcInputs: [
      currencyField("devicePrice", "Device Price", { default: 1000, max: 100000, step: 10 }),
      numberField("months", "Installment Plan Length (Months)", { default: 36, min: 1, max: 48, step: 1 }),
      currencyField("monthlyBillCredit", "Promotional Bill Credit per Month", { default: 20, max: 10000, step: 1, required: false }),
      numberField("monthsBeforeLeaving", "Months Before You Might Switch", { default: 18, min: 0, max: 48, step: 1 }),
    ],
    calcResult: { label: "Net Monthly Cost After Credits", format: "currency" },
    calcResults: [
      { key: "monthlyInstallment", label: "Monthly Installment", format: "currency" },
      { key: "netMonthlyAfterCredits", label: "Net Monthly Cost After Credits", format: "currency", highlight: true },
      { key: "totalCredits", label: "Total Credits If You Stay", format: "currency" },
      { key: "creditsLostIfYouLeave", label: "Credits Lost If You Leave", format: "currency" },
      { key: "balanceDueIfYouLeave", label: "Device Balance Due If You Leave", format: "currency" },
    ],
    instructions:
      "Carriers often sell phones on 0% installment plans and give a monthly bill credit as a promotion — but the " +
      "credits stop if you switch carriers or pay off early, and the remaining device balance becomes due. Enter " +
      "the device price, plan length, monthly credit, and when you might switch.",
    examples:
      "Example: a $1,000 phone over 36 months is $27.78 a month; a $20 credit makes it $7.78. Staying earns $720 of " +
      "credits. Leaving after 18 months means paying the $500 balance and losing $360 of credits.",
    assumptions:
      "Assumes a 0% plan and a fixed monthly credit. Some promos require a particular plan or trade-in to keep " +
      "getting credits. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I pay off my phone early?",
        answer: "Usually yes, but on promotional plans paying early can end the remaining bill credits. Check the promotion's terms first.",
      },
    ],
  },
  {
    slug: "electronics-loan-cost-calculator",
    title: "Electronics Loan Cost Calculator",
    description: "See what a financed device really costs per month of use once interest is added and its resale value at the end is taken off.",
    metaTitle: "Electronics Loan Cost Calculator — Cost per Month of Use",
    metaDescription: "Free electronics loan cost calculator. Add interest, subtract resale value, and see what a financed phone, laptop or TV costs per month of use.",
    calcInputs: [
      currencyField("price", "Device Price (Financed)", { default: 2000, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate", { default: 20, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 1, max: 48, step: 1 }),
      percentField("resalePercent", "Resale Value When You're Done (% of Price)", { default: 30, max: 100, step: 5 }),
      numberField("monthsOfUse", "Months You'll Use It", { default: 36, min: 1, max: 120, step: 1 }),
    ],
    calcResult: { label: "Net Cost per Month of Use", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "resaleValue", label: "Resale Value at the End", format: "currency" },
      { key: "netCostPerMonthOfUse", label: "Net Cost per Month of Use", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the price you're financing, the rate and term, what share of the price you expect to sell or trade it in " +
      "for when you're done, and how many months you'll use it. The tool shows the real monthly cost of owning it — " +
      "useful for comparing a premium model with a cheaper one, or buying with leasing.",
    examples:
      "Example: a $2,000 laptop at 20% over 24 months costs $101.79 a month — $2,443 in total, $443 of it interest. If " +
      "it sells for 30% ($600) after 36 months, it cost $51.19 per month of use.",
    assumptions:
      "Resale values vary by brand and condition. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does resale value matter?",
        answer: "Devices that hold their value better can cost less over time even if they're pricier upfront, because you get more back when you sell or trade them in.",
      },
    ],
  },
  {
    slug: "electronics-loan-payoff-calculator",
    title: "Electronics Loan Payoff Calculator",
    description: "Find out what you'll still owe on a device when you want to upgrade, and the payment needed to have it paid off before then.",
    metaTitle: "Electronics Loan Payoff Calculator — Before You Upgrade",
    metaDescription: "Free electronics loan payoff calculator. See the balance at your next upgrade and the payment needed to be debt-free before it.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 1500, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate", { default: 22, max: 40, step: 0.05 }),
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 75, max: 100000, step: 5 }),
      numberField("monthsUntilUpgrade", "Months Until You Want to Upgrade", { default: 12, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Payment to Clear It Before Upgrading", format: "currency" },
    calcResults: [
      { key: "monthsToPayoffNow", label: "Months to Pay Off at Current Payment", format: "number", unit: "months" },
      { key: "balanceAtUpgrade", label: "Balance When You Upgrade", format: "currency" },
      { key: "paymentToClearBeforeUpgrade", label: "Payment to Clear It Before Upgrading", format: "currency", highlight: true },
      { key: "extraNeededPerMonth", label: "Extra Needed Each Month", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate, and current payment, and how soon you'd like to upgrade. Upgrading while you still owe " +
      "on the old device means paying for two at once, so the tool shows the balance you'd carry and the payment that " +
      "clears it in time.",
    examples:
      "Example: $1,500 at 22% paid at $75 a month takes 26 months, so you'd still owe $868.86 in 12 months. Paying " +
      "$140.39 a month — $65.39 more — clears it before you upgrade.",
    assumptions:
      "Assumes a fixed rate and no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a trade-in pay off what I owe?",
        answer: "Sometimes. A trade-in credit can go toward the old balance, but if it's worth less than you owe you'll need to cover the difference.",
      },
    ],
  },
];

async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

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
