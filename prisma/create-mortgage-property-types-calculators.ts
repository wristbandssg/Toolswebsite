// One-time (but safe to re-run) batch setup script: creates the Property Type Mortgage tools
// (6) of the Mortgage Calculators expansion, filed under
// Mortgage Calculators > Property & Construction Mortgage Calculators. See src/lib/calc-engine-mortgage-property-types.ts for the math and
// src/lib/calc-engine-mortgage-loan-types.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-property-types-calculators.ts
// or
//   npm run db:create-mortgage-property-types-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const CATEGORY = { name: "Property & Construction Mortgage Calculators", slug: "property-construction-mortgage-calculators" };

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
    slug: "manufactured-home-loan-calculator",
    title: "Manufactured Home Loan Calculator",
    description: "Compare financing a manufactured or mobile home with a chattel (home-only) loan versus a land-home mortgage: loan amount, monthly payment and total interest of each.",
    metaTitle: "Manufactured Home Loan Calculator — Chattel vs Mortgage",
    metaDescription: "Free manufactured home loan calculator. Compare a chattel home-only loan with a land-home mortgage: payment and total interest of each.",
    calcInputs: [
      currencyField("homePrice", "Home Price (Installed)", { default: 120000, max: 2000000, step: 1000 }),
      currencyField("landPrice", "Land Price (For Land-Home Loan)", { default: 50000, max: 2000000, step: 1000, required: false }),
      percentField("downPaymentPercent", "Down Payment", { default: 5, max: 100, step: 0.5 }),
      percentField("chattelRatePercent", "Chattel Loan Rate", { default: 9.5, max: 20, step: 0.125 }),
      numberField("chattelTermYears", "Chattel Loan Term (Years)", { default: 20, min: 5, max: 25, step: 1 }),
      percentField("mortgageRatePercent", "Land-Home Mortgage Rate", { default: 6.75, max: 15, step: 0.125 }),
      numberField("mortgageTermYears", "Mortgage Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
    ],
    calcResult: { label: "Chattel Loan Payment", format: "currency" },
    calcResults: [
      { key: "chattelLoanAmount", label: "Chattel Loan Amount (Home Only)", format: "currency" },
      { key: "chattelPayment", label: "Chattel Loan Payment", format: "currency", highlight: true },
      { key: "chattelTotalInterest", label: "Chattel Total Interest", format: "currency" },
      { key: "landHomeLoanAmount", label: "Land-Home Loan Amount", format: "currency" },
      { key: "landHomePayment", label: "Land-Home Mortgage Payment", format: "currency" },
      { key: "landHomeTotalInterest", label: "Land-Home Total Interest", format: "currency" },
    ],
    instructions:
      "A manufactured home on rented land (such as a community lot) is financed with a chattel loan, a personal-property " +
      "loan with a higher rate and shorter term. If you own or buy the land and the home is permanently attached, it can be " +
      "titled as real estate and financed with a regular mortgage (FHA, VA, USDA or conventional) at a lower rate.\n\n" +
      "Enter the home and land prices and both offers. FHA Title I loans can also finance a home on a leased lot.",
    examples:
      "Example: a $120,000 home with 5% down on a chattel loan of $114,000 at " +
      "9.50% over 20 years costs $1,062.63 a month and $141,031.09 of " +
      "interest. Buying the $50,000 lot too with a land-home mortgage of $161,500 at 6.75% " +
      "costs $1,047.49 a month — and you own the land.",
    assumptions:
      "Same down payment percentage for both. Lot rent for a leased site isn't included in the chattel option, so add it " +
      "when you compare monthly costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why are chattel loan rates higher?",
        answer: "The home alone is the collateral, and it can be moved and tends to lose value, unlike land, so lenders charge more and lend for shorter terms.",
      },
    ],
  },
  {
    slug: "land-loan-calculator",
    title: "Land Loan Calculator",
    description: "Estimate a loan to buy raw or improved land: the larger down payment lenders require, the monthly payment, and any balloon payment at the end of a short term.",
    metaTitle: "Land Loan Calculator — Payment, Down Payment & Balloon",
    metaDescription: "Free land loan calculator. See the down payment, monthly payment, interest and any balloon payment for raw or improved land.",
    calcInputs: [
      currencyField("landPrice", "Land Price", { default: 100000, max: 10000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 30, max: 100, step: 5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("amortizationYears", "Amortization (Years)", { default: 20, min: 1, max: 30, step: 1 }),
      numberField("balloonYears", "Balloon Due After (Years, 0 = None)", { default: 0, min: 0, max: 30, step: 1, required: false }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "balloonPayment", label: "Balloon Payment", format: "currency" },
      { key: "interestPaid", label: "Interest Paid", format: "currency" },
    ],
    instructions:
      "Land loans are riskier for lenders than home loans, so they ask for more down — often 20% for improved land with " +
      "utilities and 30–50% for raw land — and charge higher rates. Many come from local banks, credit unions or the seller, " +
      "and some amortize over 15–20 years but come due in a balloon after 3–5 years.\n\n" +
      "Enter the price, down payment, rate and amortization, plus the balloon year if there is one. USDA, FHA and VA " +
      "construction-to-permanent loans can finance land when you're building a home on it right away.",
    examples:
      "Example: a $100,000 lot with 30% down needs $30,000 and a $70,000 loan. At " +
      "8.50% over 20 years, the payment is $607.48 a month and you pay " +
      "$75,794.30 of interest over the life of the loan.",
    assumptions:
      "Fixed rate. Interest paid runs to the balloon date when there is one. Property taxes on land are not included. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between raw and improved land?",
        answer: "Raw land has no utilities, roads or permits; improved land has road access, power, water and sewer or septic approval. Improved land is easier to finance.",
      },
    ],
  },
  {
    slug: "condo-mortgage-calculator",
    title: "Condo Mortgage Calculator",
    description: "Calculate the full monthly cost of a condo: mortgage, PMI, property taxes, HO-6 insurance and HOA dues — and how much of it the HOA takes.",
    metaTitle: "Condo Mortgage Calculator — Payment With HOA Dues",
    metaDescription: "Free condo mortgage calculator. See your full monthly cost with mortgage, PMI, taxes, HO-6 insurance and HOA dues, and the HOA share.",
    calcInputs: [
      currencyField("price", "Condo Price", { default: 350000, max: 10000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 0.5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.625, max: 15, step: 0.125 }),
      currencyField("monthlyHoa", "Monthly HOA Dues", { default: 400, max: 20000, step: 10 }),
      currencyField("annualTaxes", "Property Taxes per Year", { default: 4200, max: 200000, step: 100, required: false }),
      currencyField("annualHo6", "HO-6 Insurance per Year", { default: 600, max: 20000, step: 25, required: false }),
      percentField("pmiRatePercent", "PMI Rate (Yearly)", { default: 0.5, max: 3, step: 0.05, required: false }),
    ],
    calcResult: { label: "Total Monthly Cost", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "principalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "monthlyPmi", label: "Monthly PMI", format: "currency" },
      { key: "monthlyTaxesAndInsurance", label: "Monthly Taxes & HO-6", format: "currency" },
      { key: "totalMonthlyCost", label: "Total Monthly Cost", format: "currency", highlight: true },
      { key: "hoaShareOfCostPercent", label: "HOA Share of Cost", format: "percentage" },
    ],
    instructions:
      "Condo owners pay HOA dues for the building's upkeep, master insurance and amenities, and carry their own HO-6 policy " +
      "for the unit's interior. Lenders count HOA dues in your debt-to-income ratio, so higher dues lower what you can " +
      "borrow.\n\n" +
      "The building also matters: lenders check whether the condo project is \"warrantable\" (enough owner-occupants, healthy " +
      "reserves, no major lawsuits). FHA and VA loans need the project to be on their approved lists.",
    examples:
      "Example: a $350,000 condo with 10% down needs a $315,000 loan at 6.63%: " +
      "$2,016.98 of principal and interest, $131.25 of PMI, $400 of taxes and " +
      "HO-6, and $400 of HOA dues — $2,948.23 a month, of which the HOA is 13.57%.",
    assumptions:
      "30-year fixed; PMI applies below 20% down. Special assessments aren't included — see the HOA fee calculator to plan " +
      "for rising dues. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a non-warrantable condo?",
        answer: "One that doesn't meet Fannie Mae or Freddie Mac rules — for example, too many units rented out or one owner holding many units. It needs a portfolio or non-QM loan, usually with more down.",
      },
    ],
  },
  {
    slug: "co-op-apartment-loan-calculator",
    title: "Co-op Apartment Loan Calculator",
    description: "Estimate buying a co-op apartment: the share loan payment plus monthly maintenance, the tax-deductible part of maintenance, and the board's liquidity and income requirements.",
    metaTitle: "Co-op Apartment Loan Calculator — Board Requirements",
    metaDescription: "Free co-op loan calculator. See your share loan and maintenance cost, the deductible maintenance, and the liquidity and income a co-op board expects.",
    calcInputs: [
      currencyField("price", "Purchase Price", { default: 600000, max: 20000000, step: 5000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.75, max: 15, step: 0.125 }),
      currencyField("monthlyMaintenance", "Monthly Maintenance", { default: 1400, max: 50000, step: 25 }),
      percentField("deductibleSharePercent", "Tax-Deductible Share of Maintenance", { default: 40, max: 100, step: 5, required: false }),
      numberField("liquidityMonths", "Board's Post-Closing Liquidity (Months)", { default: 24, min: 0, max: 60, step: 1 }),
      percentField("boardDtiPercent", "Board's Maximum Debt-to-Income", { default: 28, max: 50, step: 1 }),
    ],
    calcResult: { label: "Total Monthly Cost", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "loanAmount", label: "Share Loan Amount", format: "currency" },
      { key: "loanPayment", label: "Share Loan Payment", format: "currency" },
      { key: "totalMonthlyCost", label: "Total Monthly Cost", format: "currency", highlight: true },
      { key: "taxDeductibleMaintenance", label: "Tax-Deductible Maintenance per Year", format: "currency" },
      { key: "liquidityRequiredAfterClosing", label: "Liquid Assets Needed After Closing", format: "currency" },
      { key: "incomeNeededForBoard", label: "Yearly Income Needed for the Board", format: "currency" },
    ],
    instructions:
      "In a co-op you buy shares in the corporation that owns the building, financed with a share loan rather than a " +
      "mortgage. Monthly maintenance covers the building's costs, including its own mortgage and property taxes — the part " +
      "for taxes and building mortgage interest is often deductible (your building reports the percentage).\n\n" +
      "Co-op boards set their own rules, often stricter than lenders': 20–25% down or more, 1–2 years of payments in liquid " +
      "assets after closing, and housing costs below 25–30% of income.",
    examples:
      "Example: a $600,000 co-op with 20% down needs a $480,000 share loan, costing $3,113.27 at " +
      "6.75%. With $1,400 of maintenance, that's $4,513.27 a month. A board asking " +
      "for 24 months of liquidity wants $108,318.50 left after closing, and a " +
      "28% limit means about $193,425.89 of income.",
    assumptions:
      "30-year share loan. The board's income test here uses only the loan payment and maintenance; boards also look at " +
      "other debts. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do co-op boards ask for so much liquidity?",
        answer: "Owners share the building's costs, so the board wants every shareholder able to keep paying maintenance through a job loss or a special assessment.",
      },
    ],
  },
  {
    slug: "multi-family-mortgage-calculator",
    title: "Multi-Family Mortgage Calculator",
    description: "Estimate a mortgage on a 2–4 unit home you'll live in: the payment, the rent from the other units that lenders count, and your net housing cost after rent.",
    metaTitle: "Multi-Family Mortgage Calculator — 2–4 Units & Rent",
    metaDescription: "Free multi-family mortgage calculator. See the payment on a 2–4 unit home, the rental income lenders count, and your net cost after rent.",
    calcInputs: [
      currencyField("price", "Purchase Price", { default: 600000, max: 10000000, step: 5000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 3.5, max: 100, step: 0.5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      percentField("mortgageInsurancePercent", "Mortgage Insurance (Yearly)", { default: 0.55, max: 3, step: 0.05, required: false }),
      currencyField("annualTaxesInsurance", "Taxes & Insurance per Year", { default: 9600, max: 500000, step: 100 }),
      currencyField("rentFromOtherUnits", "Monthly Rent From Other Units", { default: 3000, max: 100000, step: 50 }),
      percentField("rentCountedPercent", "Share of Rent Lenders Count", { default: 75, max: 100, step: 5 }),
    ],
    calcResult: { label: "Net Housing Cost", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment (PITI + MI)", format: "currency" },
      { key: "rentalIncomeCounted", label: "Rental Income Lenders Count", format: "currency" },
      { key: "netHousingCost", label: "Net Housing Cost", format: "currency", highlight: true },
      { key: "netCostAfterVacancyAllowance", label: "Net Cost With 25% Vacancy Allowance", format: "currency" },
    ],
    instructions:
      "Buying a duplex, triplex or fourplex and living in one unit lets you use owner-occupant financing: FHA with 3.5% down, " +
      "VA with no down payment, or conventional with 5% down for 2–4 units. Lenders count most of the other units' rent — " +
      "usually 75%, leaving 25% for vacancies and upkeep — toward your income.\n\n" +
      "Enter the price, loan terms, taxes and insurance, and the rent the other units bring in.",
    examples:
      "Example: a $600,000 fourplex with 3.50% down needs a $579,000 loan; the full payment is " +
      "$4,725.05. The other units rent for $3,000, of which lenders count $2,250. " +
      "Your net housing cost is $1,725.05 a month, or $2,475.05 if you allow for vacancies.",
    assumptions:
      "30-year fixed. Mortgage insurance applies below 20% down (FHA charges it at any down payment). FHA and conventional " +
      "loan limits are higher for 2–4 units. Repairs and utilities you pay as landlord aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need landlord experience?",
        answer: "Not usually for an owner-occupied 2–4 unit loan, but some lenders ask for reserves, and FHA requires 3- and 4-unit properties to pass a self-sufficiency test.",
      },
    ],
  },
  {
    slug: "second-home-mortgage-calculator",
    title: "Second Home Mortgage Calculator",
    description: "Estimate a mortgage on a vacation or second home: the payment with taxes, insurance and HOA, your total housing cost with your current home, and the income needed to qualify.",
    metaTitle: "Second Home Mortgage Calculator — Payment & Income",
    metaDescription: "Free second home mortgage calculator. See the vacation home payment, your total housing cost with your current home, and the income needed.",
    calcInputs: [
      currencyField("price", "Second Home Price", { default: 400000, max: 10000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.875, max: 15, step: 0.125 }),
      percentField("pmiRatePercent", "PMI Rate (Yearly)", { default: 0.5, max: 3, step: 0.05, required: false }),
      currencyField("annualTaxesInsurance", "Taxes & Insurance per Year", { default: 7200, max: 500000, step: 100 }),
      currencyField("monthlyHoa", "Monthly HOA Dues", { default: 0, max: 20000, step: 10, required: false }),
      currencyField("currentHousingPayment", "Current Home Payment", { default: 2200, max: 100000, step: 50 }),
      currencyField("otherMonthlyDebts", "Other Monthly Debts", { default: 500, max: 100000, step: 50, required: false }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 43, max: 60, step: 1 }),
    ],
    calcResult: { label: "Second Home Payment", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "secondHomePayment", label: "Second Home Payment", format: "currency", highlight: true },
      { key: "totalHousingPayments", label: "Both Homes' Payments", format: "currency" },
      { key: "totalMonthlyDebts", label: "Total Monthly Debts", format: "currency" },
      { key: "incomeNeeded", label: "Yearly Income Needed", format: "currency" },
    ],
    instructions:
      "A second home must be for your own use — a vacation or seasonal home, usually a reasonable distance from your main " +
      "home — not rented full-time. Conventional loans allow 10% down, and rates are a little higher than for a primary " +
      "home. Lenders count both homes' payments in your debt-to-income ratio and often want several months of reserves.\n\n" +
      "Enter the second home's price and costs, your current housing payment and other debts.",
    examples:
      "Example: a $400,000 vacation home with 10% down needs a $360,000 loan; the payment with PMI, " +
      "taxes and insurance is $3,114.94. With your current $2,200 payment, housing costs " +
      "$5,314.94 a month, and at a 43% DTI limit you'd need about $162,277.50 a year.",
    assumptions:
      "30-year fixed. FHA, VA and USDA loans can't be used for second homes. If you plan to rent it out most of the time, " +
      "lenders treat it as an investment property — see the investment property mortgage calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I rent out my second home?",
        answer: "Occasionally, yes — but lenders expect you to use it yourself and keep control of it. Year-round rental or a management company controlling bookings makes it an investment property.",
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
