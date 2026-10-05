// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the Loan Calculators expansion 2, sub-batch 1 (Funeral, Moving & Pet Loans),
// filed under Finance Calculators > Loan Calculators > Personal Loan Calculators. See src/lib/calc-engine-loan-life-events.ts for
// the math and src/lib/calc-engine-loan-life-events.ts for the full batch
// context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-life-events-calculators.ts
// or
//   npm run db:create-loan-life-events-calculators

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
    slug: "funeral-loan-calculator",
    title: "Funeral Loan Calculator",
    description: "Add up the main funeral costs, subtract life insurance, estate money and family help, and see how much to borrow and the monthly payment.",
    metaTitle: "Funeral Loan Calculator — Cost, Loan & Payment",
    metaDescription: "Free funeral loan calculator. Add up funeral costs, subtract insurance and family help, and see the loan amount, monthly payment and interest.",
    calcInputs: [
      currencyField("serviceFees", "Funeral Home Service Fees", { default: 3500, max: 1000000, step: 100 }),
      currencyField("casketOrUrn", "Casket or Urn", { default: 2500, max: 1000000, step: 100, required: false }),
      currencyField("burialOrCremation", "Burial Plot / Cremation", { default: 3000, max: 1000000, step: 100, required: false }),
      currencyField("headstoneAndOther", "Headstone, Flowers & Other", { default: 2000, max: 1000000, step: 100, required: false }),
      currencyField("lifeInsurance", "Life Insurance Paid Now", { default: 0, max: 10000000, step: 100, required: false }),
      currencyField("familyAndEstate", "Family Contributions / Estate Money", { default: 3000, max: 10000000, step: 100, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "funeralTotal", label: "Total Funeral Cost", format: "currency" },
      { key: "amountToBorrow", label: "Amount to Borrow", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the funeral home's service fees, the casket or urn, burial or cremation costs, and the headstone, " +
      "flowers, and other extras from the itemised price list. Then subtract any life insurance already paid out " +
      "and money from family or the estate, and enter the loan's rate and term.\n\n" +
      "US funeral homes must give you an itemised General Price List, so you can choose only what you need.",
    examples:
      "Example: $3,500 of service fees, a $2,500 casket, $3,000 for burial, and $2,000 of extras make an $11,000 " +
      "funeral. With $3,000 from family, you borrow $8,000 — $376.59 a month at 12% over 24 months, with $1,038.11 " +
      "of interest.",
    assumptions:
      "Assumes a fixed-rate personal loan. Costs vary widely by region and choice of burial or cremation. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are there alternatives to a funeral loan?",
        answer: "Ask whether the funeral home offers a payment plan, check for a life insurance or pre-need policy, and look into veterans' burial benefits, Social Security's one-time death payment, or crowdfunding from friends and family.",
      },
    ],
  },
  {
    slug: "funeral-loan-payment-calculator",
    title: "Funeral Loan Payment Calculator",
    description: "Find the monthly payment on a funeral loan and each family member's share if the cost is split between several people.",
    metaTitle: "Funeral Loan Payment Calculator — Split Among Family",
    metaDescription: "Free funeral loan payment calculator. See the monthly payment and each family member's share when the cost is split between several people.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 9000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
      numberField("people", "Number of People Sharing", { default: 3, min: 1, max: 20, step: 1 }),
    ],
    calcResult: { label: "Payment per Person", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "paymentPerPerson", label: "Payment per Person", format: "currency", highlight: true },
      { key: "totalPerPerson", label: "Total Each Person Pays", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, and how many family members will share the payments. The tool splits " +
      "the payment evenly. Only the person (or people) named on the loan are legally responsible, so agree the split " +
      "in writing.",
    examples:
      "Example: a $9,000 loan at 12% over 24 months costs $423.66 a month. Shared by 3 people, that's $141.22 each a " +
      "month, or $3,389.29 each over the loan, including $1,167.87 of interest in total.",
    assumptions:
      "Equal shares; for an uneven split, multiply the monthly payment by each person's percentage. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does the deceased person's debt pass to the family?",
        answer: "Generally not. Their debts are paid from the estate. Family members are only responsible for debts they co-signed or for a new loan they take out themselves.",
      },
    ],
  },
  {
    slug: "funeral-loan-cost-calculator",
    title: "Funeral Loan Cost Calculator",
    description: "See what a funeral loan costs if you only need it until a life insurance payout arrives — interest until then, and what's left to repay afterwards.",
    metaTitle: "Funeral Loan Cost Calculator — Until Insurance Pays",
    metaDescription: "Free funeral loan cost calculator. Borrow until the life insurance payout arrives and see the interest until then and the balance left after.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 10000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
      numberField("monthsUntilPayout", "Months Until the Payout Arrives", { default: 2, min: 0, max: 24, step: 1 }),
      currencyField("insurancePayout", "Payout Put Toward the Loan", { default: 7000, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Total Interest", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "interestUntilPayout", label: "Interest Until the Payout", format: "currency" },
      { key: "balanceAfterPayout", label: "Balance Left After the Payout", format: "currency" },
      { key: "monthsLeftAfterPayout", label: "Months Left After the Payout", format: "number", unit: "months" },
      { key: "totalInterest", label: "Total Interest", format: "currency", highlight: true },
      { key: "interestSavedByPayout", label: "Interest Saved by Using the Payout", format: "currency" },
    ],
    instructions:
      "Funerals usually have to be paid before life insurance pays out. Enter the loan, rate, and term, how many " +
      "months until the payout is expected, and how much of it you'll put toward the loan. The tool counts interest " +
      "until the payout, applies it, and keeps the same payment on whatever is left.",
    examples:
      "Example: a $10,000 loan at 12% over 24 months costs $470.73 a month. After 2 months ($196.29 of interest), a " +
      "$7,000 payout leaves $2,254.82, cleared in 5 more months. Total interest is $263.76 — $1,033.87 less than " +
      "keeping the loan for the full term.",
    assumptions:
      "Assumes no prepayment penalty. Many funeral homes accept an assignment of life insurance benefits, which can " +
      "avoid borrowing entirely — ask before taking a loan. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long does a life insurance payout take?",
        answer: "Often a few weeks after the insurer receives the claim and death certificate, though reviews can take longer.",
      },
    ],
  },
  {
    slug: "funeral-loan-payoff-calculator",
    title: "Funeral Loan Payoff Calculator",
    description: "See how much will be needed to pay off a funeral loan when the estate settles, and the interest saved compared with running the loan to term.",
    metaTitle: "Funeral Loan Payoff Calculator — Repay From the Estate",
    metaDescription: "Free funeral loan payoff calculator. See the payoff amount when the estate settles and the interest saved vs keeping the loan to term.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 10000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 3, max: 84, step: 3 }),
      numberField("monthsUntilEstate", "Months Until the Estate Settles", { default: 9, min: 0, max: 84, step: 1 }),
    ],
    calcResult: { label: "Payoff Amount From the Estate", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment Until Then", format: "currency" },
      { key: "payoffFromEstate", label: "Payoff Amount From the Estate", format: "currency", highlight: true },
      { key: "interestPaidByThen", label: "Interest Paid by Then", format: "currency" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Funeral expenses are usually among the first debts an estate repays. If you borrowed for the funeral and the " +
      "estate will reimburse you, enter the loan, rate, term, and how many months until the estate is expected to " +
      "settle (probate often takes several months to a year). The tool shows the balance to pay off at that point.",
    examples:
      "Example: a $10,000 loan at 12% over 36 months costs $332.14 a month. If the estate settles after 9 months, " +
      "$7,825.16 pays it off. You'll have paid $814.45 of interest, saving $1,142.70 compared with the full term.",
    assumptions:
      "Keep receipts so the executor can reimburse you. Estate rules vary by state. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can the estate repay funeral costs?",
        answer: "Yes — reasonable funeral expenses are normally a priority claim on the estate, paid before most other debts. Talk to the executor or a probate lawyer.",
      },
    ],
  },
  {
    slug: "moving-loan-calculator",
    title: "Moving Loan Calculator",
    description: "Add up movers, packing, storage, travel and the new home's deposits, subtract employer help and savings, and see how much to borrow for your move.",
    metaTitle: "Moving Loan Calculator — Cost of Moving & Payment",
    metaDescription: "Free moving loan calculator. Add movers, packing, storage, travel and deposits, subtract relocation help and savings, and see your payment.",
    calcInputs: [
      currencyField("moversOrTruck", "Movers or Truck Rental", { default: 4500, max: 1000000, step: 100 }),
      currencyField("packingSupplies", "Packing Supplies", { default: 300, max: 100000, step: 25, required: false }),
      currencyField("storageMonthly", "Storage per Month", { default: 150, max: 100000, step: 10, required: false }),
      numberField("storageMonths", "Months of Storage", { default: 2, min: 0, max: 24, step: 1, required: false }),
      currencyField("travelCosts", "Travel, Hotels & Meals", { default: 800, max: 100000, step: 50, required: false }),
      currencyField("newHomeDeposits", "Security Deposit, First Rent & Utility Deposits", { default: 3600, max: 1000000, step: 100, required: false }),
      currencyField("employerHelp", "Employer Relocation Help", { default: 2000, max: 1000000, step: 100, required: false }),
      currencyField("savings", "Savings for the Move", { default: 2000, max: 1000000, step: 100, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 13, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "movingTotal", label: "Total Cost of the Move", format: "currency" },
      { key: "amountToBorrow", label: "Amount to Borrow", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter your mover's quote or truck rental, packing supplies, storage, travel costs, and the deposits and first " +
      "month's rent for your new home. Subtract any relocation help from your employer and the savings you'll use, " +
      "then enter the loan's rate and term.",
    examples:
      "Example: $4,500 movers, $300 of supplies, 2 months of storage at $150, $800 of travel, and $3,600 of deposits " +
      "make a $9,500 move. With $2,000 from your employer and $2,000 saved, you borrow $5,500 — $261.48 a month at 13% " +
      "over 24 months, with $775.52 of interest.",
    assumptions:
      "Get written quotes from licensed movers; long-distance quotes depend on weight and distance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are moving expenses tax-deductible?",
        answer: "For most US taxpayers, no — the moving expense deduction is limited to active-duty military members moving under orders. Employer reimbursements are usually taxable income.",
      },
    ],
  },
  {
    slug: "moving-loan-payment-calculator",
    title: "Moving Loan Payment Calculator",
    description: "See your moving loan payment together with the change in rent, so you know what your housing costs will really be while you repay the move.",
    metaTitle: "Moving Loan Payment Calculator — With Rent Change",
    metaDescription: "Free moving loan payment calculator. Combine the loan payment with your old and new rent to see your real housing cost change.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 6000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 13, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
      currencyField("oldRent", "Current Rent / Housing Payment", { default: 1600, max: 100000, step: 25 }),
      currencyField("newRent", "New Rent / Housing Payment", { default: 1450, max: 100000, step: 25 }),
    ],
    calcResult: { label: "Housing Cost Change While Repaying", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Loan Payment", format: "currency" },
      { key: "housingCostChangeWhileRepaying", label: "Housing Cost Change While Repaying", format: "currency", highlight: true },
      { key: "housingCostChangeAfterLoan", label: "Housing Cost Change After the Loan", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, and your old and new rent or housing payment. The tool adds the loan " +
      "payment to the new rent and compares it with what you pay now. A positive number means you'll pay more each " +
      "month; negative means less.",
    examples:
      "Example: a $6,000 loan at 13% over 24 months costs $285.25 a month. Moving from $1,600 rent to $1,450 means you " +
      "pay $135.25 more a month while repaying, then $150 a month less once the loan is gone.",
    assumptions:
      "Doesn't include changes in commuting, utilities, or living costs in the new area. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I keep moving costs down?",
        answer: "Move mid-month or mid-week, get several quotes, sell or donate what you don't need, and ask your employer whether it offers relocation help.",
      },
    ],
  },
  {
    slug: "moving-loan-cost-calculator",
    title: "Moving Loan Cost Calculator",
    description: "Moving for a better job? See the full cost of a financed move and how many months of your after-tax raise it takes to pay it back.",
    metaTitle: "Moving Loan Cost Calculator — Is the Move Worth It?",
    metaDescription: "Free moving loan cost calculator. See the total cost of a financed move and how many months of your raise it takes to earn it back.",
    calcInputs: [
      currencyField("moveCost", "Cost of the Move", { default: 8000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 13, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
      percentField("originationFeePercent", "Origination Fee", { default: 0, max: 12, step: 0.25, required: false }),
      currencyField("monthlyRaiseAfterTax", "Extra Take-Home Pay per Month From the New Job", { default: 600, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Months of Raise to Recover", format: "number", unit: "months" },
    calcResults: [
      { key: "monthlyPayment", label: "Loan Payment", format: "currency" },
      { key: "financingCost", label: "Interest & Fees", format: "currency" },
      { key: "totalCostOfMove", label: "Total Cost of the Move", format: "currency" },
      { key: "monthsOfRaiseToRecover", label: "Months of Raise to Recover", format: "number", unit: "months", highlight: true },
      { key: "raiseLeftAfterPayment", label: "Raise Left After the Loan Payment", format: "currency" },
    ],
    instructions:
      "Enter what the move costs, the loan's rate, term, and fee, and how much more you'll take home each month in " +
      "the new job (after tax). The tool shows the full cost including financing and how long the raise takes to " +
      "cover it.",
    examples:
      "Example: an $8,000 move financed at 13% over 24 months costs $380.33 a month and $1,128.03 of interest — $9,128.03 " +
      "in total. A $600 monthly raise earns it back in about 15.21 months and still leaves $219.67 a month after the " +
      "payment.",
    assumptions:
      "Doesn't include differences in living costs between the two places — include those in the raise figure if " +
      "they're large. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I ask my new employer to pay for the move?",
        answer: "It's common to negotiate relocation help, especially for professional roles. Even a partial lump sum can avoid most of the borrowing.",
      },
    ],
  },
  {
    slug: "moving-loan-payoff-calculator",
    title: "Moving Loan Payoff Calculator",
    description: "See how putting your old home's returned security deposit and a small extra payment toward your moving loan shortens it.",
    metaTitle: "Moving Loan Payoff Calculator — Use Your Deposit Refund",
    metaDescription: "Free moving loan payoff calculator. Apply your returned security deposit and an extra payment and see months and interest saved.",
    calcInputs: [
      currencyField("balance", "Loan Balance", { default: 6000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 13, max: 40, step: 0.05 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 285, max: 100000, step: 5 }),
      currencyField("depositRefund", "Security Deposit Refund", { default: 1200, max: 100000, step: 50, required: false }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 50, max: 100000, step: 5, required: false }),
    ],
    calcResult: { label: "Months Saved", format: "number", unit: "months" },
    calcResults: [
      { key: "monthsLeftNow", label: "Months Left at Current Payment", format: "number", unit: "months" },
      { key: "monthsLeftWithRefundAndExtra", label: "Months Left With Refund & Extra", format: "number", unit: "months" },
      { key: "monthsSaved", label: "Months Saved", format: "number", unit: "months", highlight: true },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your loan balance, rate, and payment, the security deposit you expect back from your old landlord, and " +
      "any extra you can add each month. The refund is applied with the first payment (most states require deposits " +
      "to be returned within about two to six weeks).",
    examples:
      "Example: $6,000 at 13% paid at $285 a month takes 25 months. Putting a $1,200 deposit refund toward it and " +
      "paying $50 extra cuts it to 16 months — 9 months sooner — saving $386.80 in interest.",
    assumptions:
      "Assumes no prepayment penalty and that the full refund is returned. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I get my full deposit back?",
        answer: "Clean thoroughly, repair small damage, take dated photos when you leave, return all keys, and give your landlord a forwarding address in writing.",
      },
    ],
  },
  {
    slug: "pet-loan-calculator",
    title: "Pet Loan Calculator",
    description: "Work out what pet insurance will reimburse on a vet bill, what's left after savings, and the monthly payment to finance the rest.",
    metaTitle: "Pet Loan Calculator — Vet Bill After Insurance",
    metaDescription: "Free pet loan calculator. Apply your pet insurance deductible, reimbursement rate and limit, subtract savings, and see the loan payment.",
    calcInputs: [
      currencyField("vetBill", "Vet Bill", { default: 5000, max: 1000000, step: 50 }),
      {
        key: "hasInsurance", label: "Is This Covered by Pet Insurance?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      currencyField("deductible", "Insurance Deductible Left", { default: 250, max: 10000, step: 25, required: false }),
      percentField("reimbursementPercent", "Reimbursement Rate", { default: 80, max: 100, step: 5 }),
      currencyField("annualLimitLeft", "Annual Limit Left (0 = Unlimited)", { default: 0, max: 1000000, step: 100, required: false }),
      currencyField("savings", "Savings to Use", { default: 500, max: 1000000, step: 50, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 14, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 3, max: 60, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "insuranceReimburses", label: "Insurance Reimburses", format: "currency" },
      { key: "yourShare", label: "Your Share of the Bill", format: "currency" },
      { key: "amountToBorrow", label: "Amount to Borrow", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the vet bill and, if your pet is insured, the deductible you still have to meet, the reimbursement rate " +
      "(often 70%, 80%, or 90%), and any annual limit left. Add the savings you'll use and the loan's rate and term.\n\n" +
      "Most pet insurance reimburses you after you pay the vet, so you may need to borrow the full bill at first and " +
      "repay part of the loan when the claim pays out.",
    examples:
      "Example: on a $5,000 bill with a $250 deductible and 80% reimbursement, insurance pays $3,800 and your share is " +
      "$1,200. Using $500 of savings, you borrow $700 — $62.85 a month at 14% over 12 months, with $54.21 of interest.",
    assumptions:
      "Assumes the treatment is covered — pre-existing conditions and waiting periods are usually excluded. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I ask the vet to bill the insurer directly?",
        answer: "Some insurers and vets offer direct pay, so you only pay your share at the clinic. Ask your insurer and your vet before treatment if you can.",
      },
    ],
  },
  {
    slug: "pet-loan-payment-calculator",
    title: "Pet Loan Payment Calculator",
    description: "Compare a vet clinic's in-house payment plan — deposit plus installments — with the monthly payment on a pet loan for the whole bill.",
    metaTitle: "Pet Loan Payment Calculator — Vet Plan vs Loan",
    metaDescription: "Free pet loan payment calculator. Compare a vet's payment plan (deposit + installments + fee) with a pet loan's monthly payment and interest.",
    calcInputs: [
      currencyField("vetBill", "Vet Bill", { default: 3000, max: 1000000, step: 50 }),
      percentField("depositPercent", "Vet Plan Deposit Required", { default: 50, max: 100, step: 5 }),
      numberField("planMonths", "Vet Plan Installments (Months)", { default: 6, min: 1, max: 24, step: 1 }),
      currencyField("planFee", "Vet Plan Setup Fee", { default: 50, max: 10000, step: 5, required: false }),
      percentField("loanRatePercent", "Pet Loan Rate", { default: 15, max: 40, step: 0.05 }),
      numberField("loanTermMonths", "Pet Loan Term (Months)", { default: 12, min: 3, max: 60, step: 3 }),
    ],
    calcResult: { label: "Pet Loan Monthly Payment", format: "currency" },
    calcResults: [
      { key: "planDeposit", label: "Vet Plan — Deposit Today", format: "currency" },
      { key: "planMonthlyPayment", label: "Vet Plan — Monthly Payment", format: "currency" },
      { key: "planExtraCost", label: "Vet Plan — Extra Cost", format: "currency" },
      { key: "loanMonthlyPayment", label: "Pet Loan Monthly Payment", format: "currency", highlight: true },
      { key: "loanInterest", label: "Pet Loan — Total Interest", format: "currency" },
    ],
    instructions:
      "Some vet clinics let you pay in installments if you put down a deposit. Enter the bill, the deposit percentage, " +
      "number of installments and any setup fee, and the rate and term of a pet loan. The vet plan is usually cheaper " +
      "but needs cash today; the loan needs nothing upfront but costs interest.",
    examples:
      "Example: on a $3,000 bill, a vet plan with a 50% deposit needs $1,500 today, then $258.33 a month for 6 months " +
      "including a $50 fee. A 12-month pet loan at 15% for the full bill costs $270.77 a month and $249.30 of interest.",
    assumptions:
      "Vet plan terms vary by clinic and may require a credit check. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I can't afford the deposit?",
        answer: "Ask whether the clinic accepts a smaller deposit, check local animal welfare charities for help, or use a pet loan for the deposit only to keep the borrowing small.",
      },
    ],
  },
  {
    slug: "pet-loan-cost-calculator",
    title: "Pet Loan Cost Calculator",
    description: "Compare what a big vet bill costs when financed with a loan versus what it would have cost with a year of pet insurance.",
    metaTitle: "Pet Loan Cost Calculator — Loan vs Pet Insurance",
    metaDescription: "Free pet loan cost calculator. Compare the cost of financing a vet bill with a year of pet insurance premiums, deductible and co-pay.",
    calcInputs: [
      currencyField("vetBill", "Vet Bill", { default: 4000, max: 1000000, step: 50 }),
      percentField("annualRatePercent", "Pet Loan Rate", { default: 15, max: 40, step: 0.05 }),
      numberField("termMonths", "Pet Loan Term (Months)", { default: 18, min: 3, max: 60, step: 3 }),
      currencyField("monthlyPremium", "Pet Insurance Monthly Premium", { default: 45, max: 10000, step: 5 }),
      currencyField("deductible", "Insurance Deductible", { default: 250, max: 10000, step: 25 }),
      percentField("reimbursementPercent", "Reimbursement Rate", { default: 80, max: 100, step: 5 }),
    ],
    calcResult: { label: "What Insurance Would Have Saved", format: "currency" },
    calcResults: [
      { key: "loanInterest", label: "Loan Interest", format: "currency" },
      { key: "totalCostWithLoan", label: "Total Cost With a Loan", format: "currency" },
      { key: "costWithInsurance", label: "Cost With a Year of Insurance", format: "currency" },
      { key: "insuranceWouldSave", label: "What Insurance Would Have Saved", format: "currency", highlight: true },
    ],
    instructions:
      "Enter a vet bill (one you're facing, or a typical emergency cost), the pet loan's rate and term, and a pet " +
      "insurance quote — premium, deductible, and reimbursement rate. The insurance cost is a full year of premiums " +
      "plus the deductible and your share above it. Use it to decide whether to insure for future bills.",
    examples:
      "Example: financing a $4,000 bill at 15% over 18 months costs $4,491.70 in total, $491.70 of it interest. With " +
      "insurance at $45 a month, a $250 deductible and 80% reimbursement, the same bill would cost $1,540 for the year " +
      "— $2,951.70 less.",
    assumptions:
      "Insurance must be in place before an illness or injury; pre-existing conditions aren't covered. Premiums rise " +
      "with your pet's age. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is pet insurance worth it?",
        answer: "It depends on your pet's breed, age, and your savings. If an unexpected bill of a few thousand dollars would mean borrowing, insurance or a dedicated savings fund is usually cheaper over time.",
      },
    ],
  },
  {
    slug: "pet-loan-payoff-calculator",
    title: "Pet Loan Payoff Calculator",
    description: "See how many months are left on a pet loan, how much an extra payment saves, and what payment would clear it by your target date.",
    metaTitle: "Pet Loan Payoff Calculator — Free",
    metaDescription: "Free pet loan payoff calculator. See months left, interest saved by paying extra, and the payment needed to pay it off by a target date.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 3000, max: 1000000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate", { default: 16, max: 40, step: 0.05 }),
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 150, max: 100000, step: 5 }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 50, max: 100000, step: 5, required: false }),
      numberField("targetMonths", "Target Months to Pay Off", { default: 9, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Months With Extra Payment", format: "number", unit: "months" },
    calcResults: [
      { key: "monthsLeft", label: "Months Left at Current Payment", format: "number", unit: "months" },
      { key: "monthsWithExtra", label: "Months With Extra Payment", format: "number", unit: "months", highlight: true },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
      { key: "paymentForTarget", label: "Payment Needed for Target", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate, and payment, any extra you can add, and when you'd like to be finished. If an " +
      "insurance claim reimburses part of the bill later, put that money straight into the loan too.",
    examples:
      "Example: $3,000 at 16% paid at $150 a month takes 24 months. Paying $50 extra cuts it to 17 months and saves " +
      "$143.11 of interest. To finish in 9 months you'd need to pay $355.95 a month.",
    assumptions:
      "Assumes extra payments go to principal with no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I avoid borrowing for the next vet bill?",
        answer: "Once the loan is paid off, keep putting the same amount into a pet emergency fund, or compare pet insurance quotes while your pet is healthy.",
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
