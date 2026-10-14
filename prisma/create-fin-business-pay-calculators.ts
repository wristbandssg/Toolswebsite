// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the finance sub-batch "Pay, Costs & Pricing". See
// src/lib/calc-engine-fin-valuation.ts for the full list of 5 sub-batches,
// and src/lib/calc-engine-fin-business-pay.ts for the math.
// Each tool is filed in the Finance Calculators sub-category the user named
// for it (created on first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin-business-pay-calculators.ts
// or
//   npm run db:create-fin-business-pay-calculators

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000000, step: opts.step ?? 1 };
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
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });


const SALARY_WAGES = { name: "Salary & Wages Calculators", slug: "salary-wages-calculators" };
const PROFITABILITY_COST = { name: "Profitability & Cost Calculators", slug: "profitability-cost-calculators" };
const MISCELLANEOUS = { name: "Miscellaneous Calculators", slug: "miscellaneous-finance-calculators" };

const RATING_OPTS: [string, number][] = [["None", 0], ["10%", 10], ["20%", 20], ["30%", 30], ["40%", 40], ["50%", 50], ["60%", 60], ["70%", 70], ["80%", 80], ["90%", 90], ["100%", 100]];

const TOOLS: ToolDef[] = [
  {
    slug: "tip-calculator",
    category: SALARY_WAGES,
    title: "Tip Calculator",
    description: "Calculate the tip and total for a restaurant bill, split it between people, tip on the pre-tax amount and round up each share.",
    metaTitle: "Tip Calculator — Tip Amount & Split the Bill",
    metaDescription: "Free tip calculator. Work out the tip at any percentage, the total, and each person's share — with options to tip before tax and round up.",
    calcInputs: [
      currencyField("billAmount", "Bill Amount", { default: 85, max: 1000000, step: 0.01 }),
      percentField("tipPercent", "Tip Percentage", { default: 18, max: 100, step: 1 }),
      numberField("people", "Number of People", { default: 1, min: 1, max: 100 }),
      dropdown("tipOn", "Tip On", [["Full bill (incl. tax)", 1], ["Pre-tax amount", 2]], 1),
      currencyField("taxAmount", "Tax Included in the Bill (for pre-tax tipping)", { default: 0, max: 100000, step: 0.01, required: false }),
      dropdown("roundUp", "Round Each Share Up to a Whole Dollar?", [["No", 1], ["Yes", 2]], 1),
    ],
    calcResult: { label: "Tip", format: "currency" },
    calcResults: [cur("tipAmount", "Tip Amount", true), cur("totalBill", "Total with Tip"), cur("perPerson", "Each Person Pays"), cur("tipPerPerson", "Tip per Person"), pct("effectiveTipPct", "Tip as % of Bill")],
    instructions: "Enter the bill, the tip percentage and how many people are splitting it. To tip on the pre-tax amount, choose that option and enter the tax shown on the receipt.",
    examples: "Example: an $85 bill with an 18% tip is a $15.30 tip and $100.30 in total. Split three ways and rounded up, each person pays $34.",
    assumptions: "US sit-down restaurant tips are usually 15–20% (20% or more for great service); counter service and takeout are optional. Customs differ by country — in much of Europe and Asia a service charge may already be included.",
    faq: [
      { question: "Should I tip before or after tax?", answer: "Etiquette guides say pre-tax is fine; many people tip on the total for simplicity." },
      { question: "How much do you tip on a buffet or delivery?", answer: "Around 10% for buffets and 15–20% for delivery, with a few dollars minimum on small orders." },
    ],
  },
  {
    slug: "agi-calculator",
    category: SALARY_WAGES,
    title: "AGI Calculator",
    description: "Calculate your 2026 adjusted gross income (AGI) — total income minus above-the-line deductions such as IRA, HSA, student loan interest and half of self-employment tax — and your taxable income after the standard deduction.",
    metaTitle: "AGI Calculator 2026 — Adjusted Gross Income",
    metaDescription: "Free AGI calculator for 2026. Add up your income, subtract IRA, HSA, student loan interest and half of SE tax to get adjusted gross income and taxable income.",
    calcInputs: [
      dropdown("filingStatus", "Filing Status", [["Single", 1], ["Married filing jointly", 2], ["Head of household", 3], ["Married filing separately", 4]], 1),
      currencyField("wages", "Wages, Salaries & Tips", { default: 65000, max: 100000000, step: 100 }),
      currencyField("interest", "Taxable Interest", { default: 500, max: 100000000, step: 10, required: false }),
      currencyField("dividends", "Ordinary Dividends", { default: 800, max: 100000000, step: 10, required: false }),
      numberField("businessIncome", "Self-Employment / Business Profit", { unit: "$", default: 0, min: -100000000, max: 100000000, step: 100, required: false }),
      numberField("capitalGains", "Net Capital Gain or Loss", { unit: "$", default: 0, min: -100000000, max: 100000000, step: 100, required: false }),
      currencyField("retirementIncome", "Taxable IRA, Pension & Social Security", { default: 0, max: 100000000, step: 100, required: false }),
      currencyField("otherIncome", "Other Income (rental, unemployment…)", { default: 0, max: 100000000, step: 100, required: false }),
      currencyField("iraDeduction", "Deductible Traditional IRA Contributions", { default: 0, max: 100000, step: 100, required: false }),
      currencyField("hsaDeduction", "HSA Contributions (not through payroll)", { default: 0, max: 100000, step: 100, required: false }),
      currencyField("studentLoanInterest", "Student Loan Interest Paid", { default: 0, max: 100000, step: 10, required: false }),
      currencyField("seHealthInsurance", "Self-Employed Health Insurance", { default: 0, max: 1000000, step: 100, required: false }),
      currencyField("educatorExpenses", "Educator Expenses", { default: 0, max: 10000, step: 10, required: false }),
      currencyField("otherAdjustments", "Other Adjustments (SEP/solo 401k, alimony pre-2019…)", { default: 0, max: 10000000, step: 100, required: false }),
    ],
    calcResult: { label: "Adjusted Gross Income", format: "currency" },
    calcResults: [cur("totalIncome", "Total Income"), cur("halfSeTaxDeduction", "Deductible Half of SE Tax"), cur("totalAdjustments", "Total Adjustments"), cur("agi", "Adjusted Gross Income (AGI)", true), cur("standardDeduction", "2026 Standard Deduction"), cur("estimatedTaxableIncome", "Estimated Taxable Income")],
    instructions:
      "Enter each type of income for the year and any above-the-line adjustments (the ones on Schedule 1 that you can take without itemising). The deductible half of self-employment tax is worked out for you from your business profit.\n\n" +
      "AGI is line 11 of Form 1040. It decides your eligibility for many credits, Roth IRA contributions and the medical expense deduction.",
    examples: "Example: $65,000 of wages, $500 of interest and $800 of dividends give an AGI of $66,300. Less the $16,100 standard deduction for a single filer, taxable income is $50,200.",
    assumptions: "2026 figures: standard deduction $16,100 single/MFS, $32,200 joint, $24,150 head of household (extra amounts for 65+ or blind, and the 2025–2028 senior deduction, aren't included); net capital loss limited to $3,000 ($1,500 MFS); student loan interest capped at $2,500 and educator expenses at $300 (income phase-outs not applied); SE tax 15.3% on 92.35% of profit, Social Security part up to the $184,500 wage base. " + DISCLAIMER,
    faq: [
      { question: "What's the difference between AGI and MAGI?", answer: "MAGI adds back certain items, such as foreign earned income or tax-exempt interest, depending on which tax rule you're checking." },
      { question: "Is my AGI on my W-2?", answer: "No — your W-2 shows wages; AGI includes all income and adjustments and is on line 11 of your Form 1040." },
    ],
  },
  {
    slug: "labor-cost-calculator",
    category: SALARY_WAGES,
    title: "Labor Cost Calculator",
    description: "Calculate your business's total labor cost — wages, overtime, payroll taxes and benefits — the loaded cost per hour, and labor cost as a percentage of revenue.",
    metaTitle: "Labor Cost Calculator — Total Labor Cost & Labor %",
    metaDescription: "Free labor cost calculator. Add up wages, overtime, payroll taxes and benefits for your team to get total labor cost, cost per hour and labor cost percentage.",
    calcInputs: [
      numberField("employees", "Number of Employees", { default: 10, max: 100000 }),
      currencyField("hourlyWage", "Average Hourly Wage", { default: 22, max: 10000, step: 0.25 }),
      numberField("hoursPerWeek", "Regular Hours per Week (each)", { default: 40, max: 80 }),
      numberField("overtimeHoursPerWeek", "Overtime Hours per Week (each, 1.5×)", { default: 0, max: 60, required: false }),
      numberField("weeksPerYear", "Weeks Worked per Year", { default: 52, max: 52 }),
      percentField("payrollTaxPct", "Employer Payroll Taxes (% of wages)", { default: 10, max: 50 }),
      percentField("benefitsPct", "Benefits (% of wages)", { default: 20, max: 100 }),
      currencyField("annualRevenue", "Annual Revenue (optional)", { default: 0, max: 100000000000, step: 1000, required: false }),
    ],
    calcResult: { label: "Total Labor Cost", format: "currency" },
    calcResults: [cur("grossWages", "Gross Wages"), cur("payrollTaxes", "Payroll Taxes"), cur("benefitsCost", "Benefits"), cur("totalLaborCost", "Total Labor Cost per Year", true), cur("monthlyLaborCost", "Per Month"), cur("loadedCostPerHour", "Loaded Cost per Hour Worked"), pct("laborCostPctOfRevenue", "Labor Cost % of Revenue")],
    instructions: "Enter your headcount, average pay and hours. Employer payroll taxes are about 7.65% for FICA plus unemployment insurance (roughly 8–12% in total); benefits such as health insurance and retirement typically add 20–30%. Add revenue to see your labor cost percentage.",
    examples: "Example: 10 staff at $22 an hour, 40 hours a week, 52 weeks earn $457,600. With 10% payroll taxes and 20% benefits the total labor cost is $594,880 — $28.60 per hour worked.",
    assumptions: "Overtime is paid at 1.5× the hourly wage. Percentages apply to all wages; the Social Security wage cap is ignored at the team level. For one employee itemised in detail, use the Employee Cost Calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a good labor cost percentage?", answer: "Restaurants aim for about 25–35% of sales, retail 10–20%, and service businesses can run 50% or more." },
      { question: "Does labor cost include contractors?", answer: "Many businesses include them; add their pay to wages if you want a complete figure." },
    ],
  },
  {
    slug: "va-disability-calculator",
    category: SALARY_WAGES,
    title: "VA Disability Calculator",
    description: "Calculate your combined VA disability rating with VA math and your 2026 monthly compensation, including a spouse, children, dependent parents and Aid & Attendance.",
    metaTitle: "VA Disability Calculator 2026 — Combined Rating & Pay",
    metaDescription: "Free VA disability calculator. Combine ratings with VA math, round to the nearest 10% and see your monthly pay at 2026 rates with spouse, children and parents.",
    calcInputs: [
      ...Array.from({ length: 6 }, (_, i) => dropdown(`rating${i + 1}`, `Disability Rating ${i + 1}`, RATING_OPTS, [50, 30, 0, 0, 0, 0][i])),
      dropdown("spouse", "Married?", [["No", 1], ["Yes", 2]], 1),
      dropdown("spouseAidAttendance", "Spouse Receives Aid & Attendance?", [["No", 1], ["Yes", 2]], 1),
      numberField("childrenUnder18", "Children Under 18", { default: 0, max: 20 }),
      numberField("childrenInSchool", "Children 18–23 in School", { default: 0, max: 20, required: false }),
      dropdown("dependentParents", "Dependent Parents", [["0", 0], ["1", 1], ["2", 2]], 0),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [num("combinedValue", "Combined Value Before Rounding (%)"), pct("combinedRating", "Combined VA Rating"), cur("monthlyPayment", "Monthly Compensation", true), cur("annualPayment", "Yearly Compensation"), cur("dependentAddOn", "Added for Dependents")],
    instructions:
      "Select each of your service-connected disability ratings and your dependents. VA doesn't add ratings together: each rating applies to the \"healthy\" part left after the larger ones, and the result is rounded to the nearest 10%.\n\n" +
      "Dependents increase pay only at a combined rating of 30% or higher.",
    examples: "Example: 50% and 30% combine to 65%, which rounds to 70%. A veteran alone at 70% receives $1,808.45 a month; with a spouse and two children under 18 it's $2,150.45.",
    assumptions: "2026 VA compensation rates effective 1 Dec 2025 (2.8% COLA) from va.gov. The bilateral factor, special monthly compensation (SMC) and TDIU aren't included. The first child is priced by VA's \"with child\" rate and each extra child is added. This is an estimate — VA decides your rating.",
    faq: [
      { question: "Why isn't 50% + 30% equal to 80%?", answer: "VA applies the 30% to the 50% of you that is still \"healthy\", adding 15% for 65% in total, which rounds to 70%." },
      { question: "When is the next VA rate increase?", answer: "Rates rise each 1 December with the Social Security cost-of-living adjustment." },
    ],
  },
  {
    slug: "employee-cost-calculator",
    category: PROFITABILITY_COST,
    title: "Employee Cost Calculator",
    description: "Calculate the true cost of an employee — salary plus employer payroll taxes, health insurance, retirement match, workers' comp and overhead — and the cost per hour.",
    metaTitle: "Employee Cost Calculator — True Cost of an Employee",
    metaDescription: "Free employee cost calculator. Add employer FICA, FUTA, SUTA, benefits and overhead to a salary to see the fully loaded cost of an employee per year and hour.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 60000, max: 100000000, step: 500 }),
      currencyField("healthInsurance", "Employer Health Insurance per Year", { default: 9000, max: 1000000, step: 100, required: false }),
      percentField("retirementMatchPct", "401(k) Match (% of salary)", { default: 4, max: 50, required: false }),
      currencyField("otherBenefits", "Other Benefits per Year", { default: 1500, max: 1000000, step: 100, required: false }),
      percentField("sutaRate", "State Unemployment (SUTA) Rate", { default: 2.7, max: 20, step: 0.01 }),
      currencyField("sutaWageBase", "SUTA Wage Base", { default: 7000, max: 1000000, step: 100 }),
      percentField("workersCompPct", "Workers' Comp (% of salary)", { default: 1, max: 50, step: 0.01, required: false }),
      currencyField("overhead", "Equipment, Software & Office per Year", { default: 5000, max: 10000000, step: 100, required: false }),
      numberField("paidHoursPerYear", "Paid Hours per Year", { default: 2080, min: 1, max: 5000 }),
      numberField("ptoDays", "Paid Days Off (vacation + holidays)", { default: 15, max: 100, required: false }),
    ],
    calcResult: { label: "Total Annual Cost", format: "currency" },
    calcResults: [cur("employerPayrollTaxes", "Employer Payroll Taxes & Comp"), cur("benefitsCost", "Benefits"), cur("totalAnnualCost", "Total Annual Cost", true), cur("costAboveSalary", "Cost Above Salary"), num("costMultiplier", "Cost ÷ Salary (×)"), cur("costPerPaidHour", "Cost per Paid Hour"), cur("costPerProductiveHour", "Cost per Productive Hour"), cur("monthlyCost", "Cost per Month")],
    instructions: "Enter the salary and what you pay on top of it. Your state sets the SUTA rate and wage base (new employers often get a standard rate). Paid days off reduce the hours actually worked, so the productive hourly cost is higher than the paid one.",
    examples: "Example: a $60,000 employee with $9,000 health insurance, a 4% 401(k) match and $1,500 of other benefits, plus $5,000 of overhead, costs about $83,321 a year — 1.39× salary, or $40.06 per paid hour.",
    assumptions: "2026 employer taxes: Social Security 6.2% up to $184,500, Medicare 1.45% (no cap; the 0.9% additional tax is employee-only), FUTA 0.6% of the first $7,000 after the full state credit. " + DISCLAIMER,
    faq: [
      { question: "How much more than salary does an employee cost?", answer: "Typically 1.25 to 1.4 times salary once taxes, benefits and overhead are included." },
      { question: "Is this different from the labor cost calculator?", answer: "Yes — this itemises one employee's costs; the Labor Cost Calculator totals a whole team and compares it with revenue." },
    ],
  },
  {
    slug: "discount-calculator",
    category: PROFITABILITY_COST,
    title: "Discount Calculator",
    description: "Calculate the sale price after a percentage or dollar discount, stack a second or third discount (double and triple discounts), add sales tax, or find the markdown percentage from the original and sale price.",
    metaTitle: "Discount Calculator — Sale Price, % Off & Markdown",
    metaDescription: "Free discount calculator. Find the sale price and savings for % off or $ off, stack an extra discount, add sales tax, or get the markdown % from two prices.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 80, max: 100000000, step: 0.01 }),
      dropdown("mode", "Discount Type", [["Percent off", 1], ["Amount off", 2], ["Find markdown % from sale price", 3]], 1),
      percentField("discountPercent", "Discount %", { default: 25, step: 1, required: false }),
      percentField("extraDiscountPercent", "Extra Discount % (e.g. coupon, optional)", { default: 0, step: 1, required: false }),
      percentField("thirdDiscountPercent", "Third Discount % (triple discount, optional)", { default: 0, step: 1, required: false }),
      currencyField("amountOff", "Amount Off", { default: 10, max: 100000000, step: 0.01, required: false }),
      currencyField("salePrice", "Sale Price (markdown mode)", { default: 60, max: 100000000, step: 0.01, required: false }),
      percentField("salesTaxRate", "Sales Tax Rate (optional)", { default: 0, max: 30, step: 0.01, required: false }),
    ],
    calcResult: { label: "Final Price", format: "currency" },
    calcResults: [cur("finalPrice", "Final Price", true), cur("youSave", "You Save"), pct("totalDiscountPct", "Total Discount / Markdown %"), cur("priceWithTax", "Final Price with Tax")],
    instructions: "Enter the original price and choose how the discount is given. A stacked extra discount applies to the already-reduced price, so 20% + 10% is 28% off, not 30%. Retailers use the third option to find the markdown percentage between the original and sale price.",
    examples: "Example: 25% off $80 is $60 — you save $20. 20% off then an extra 10% off $100 is $72 (28% off). A price cut from $80 to $56 is a 30% markdown.",
    assumptions: "Sales tax is charged on the discounted price, as in most US states.",
    faq: [
      { question: "How do I calculate 30% off?", answer: "Multiply the price by 0.70 — for $50, that's $35." },
      { question: "What's the difference between a markdown and a discount?", answer: "A markdown is a permanent price cut by the retailer; a discount is usually temporary or for certain buyers. The math is the same." },
    ],
  },
  {
    slug: "marginal-cost-calculator",
    category: PROFITABILITY_COST,
    title: "Marginal Cost Calculator",
    description: "Calculate marginal cost — the extra cost of producing one more unit — from the change in total cost and quantity, plus average cost at both levels.",
    metaTitle: "Marginal Cost Calculator — Cost of One More Unit",
    metaDescription: "Free marginal cost calculator. Divide the change in total cost by the change in quantity to find marginal cost, and compare it with average total cost.",
    calcInputs: [currencyField("initialTotalCost", "Initial Total Cost", { default: 10000, max: 100000000000, step: 1 }), currencyField("newTotalCost", "New Total Cost", { default: 11500, max: 100000000000, step: 1 }), numberField("initialQuantity", "Initial Quantity", { default: 500, max: 1000000000 }), numberField("newQuantity", "New Quantity", { default: 600, max: 1000000000 })],
    calcResult: { label: "Marginal Cost", format: "currency" },
    calcResults: [cur("changeInCost", "Change in Total Cost"), num("changeInQuantity", "Change in Quantity"), cur("marginalCost", "Marginal Cost per Unit", true), cur("averageCostBefore", "Average Cost Before"), cur("averageCostAfter", "Average Cost After")],
    instructions: "Enter total production cost at two output levels. Marginal cost tells you whether making more is worth it: keep producing while the price (or marginal revenue) is above marginal cost.",
    examples: "Example: raising output from 500 to 600 units increases total cost from $10,000 to $11,500, so marginal cost is $15 a unit. Average cost falls from $20.00 to $19.17.",
    assumptions: "MC = ΔTC ÷ ΔQ, the average extra cost per unit across the change. Fixed costs don't affect marginal cost. " + DISCLAIMER,
    faq: [
      { question: "Why does marginal cost eventually rise?", answer: "Diminishing returns — overtime, crowded equipment and less efficient extra inputs make each extra unit dearer." },
      { question: "How does marginal cost relate to average cost?", answer: "When marginal cost is below average cost, the average falls; when it's above, the average rises." },
    ],
  },
  {
    slug: "marginal-revenue-calculator",
    category: PROFITABILITY_COST,
    title: "Marginal Revenue Calculator",
    description: "Calculate marginal revenue — the extra revenue from selling more units — from two prices and quantities, plus total and average revenue.",
    metaTitle: "Marginal Revenue Calculator — MR from Price & Quantity",
    metaDescription: "Free marginal revenue calculator. Find the change in total revenue per extra unit sold from two price and quantity points, plus average revenue.",
    calcInputs: [currencyField("initialPrice", "Initial Price", { default: 20, max: 100000000, step: 0.01 }), numberField("initialQuantity", "Initial Quantity Sold", { default: 100, max: 1000000000 }), currencyField("newPrice", "New Price", { default: 18, max: 100000000, step: 0.01 }), numberField("newQuantity", "New Quantity Sold", { default: 130, max: 1000000000 })],
    calcResult: { label: "Marginal Revenue", format: "currency" },
    calcResults: [cur("revenueBefore", "Total Revenue Before"), cur("revenueAfter", "Total Revenue After"), cur("changeInRevenue", "Change in Revenue"), cur("marginalRevenue", "Marginal Revenue per Unit", true), cur("averageRevenue", "Average Revenue (Price) After")],
    instructions: "Enter the price and units sold before and after a change. If you have to cut the price to sell more, marginal revenue is below the price because the lower price applies to every unit.",
    examples: "Example: cutting the price from $20 to $18 raises sales from 100 to 130. Revenue grows from $2,000 to $2,340, so each extra unit adds $11.33 — less than its $18 price.",
    assumptions: "MR = ΔTR ÷ ΔQ with TR = price × quantity. In perfect competition price is fixed and MR equals price. " + DISCLAIMER,
    faq: [
      { question: "When is marginal revenue negative?", answer: "When demand is inelastic, cutting the price loses more on existing sales than it gains from new ones." },
      { question: "How do firms use marginal revenue?", answer: "Profit is highest at the output where marginal revenue equals marginal cost." },
    ],
  },
  {
    slug: "maximum-profit-calculator",
    category: PROFITABILITY_COST,
    title: "Maximum Profit Calculator",
    description: "Find the profit-maximising quantity and price where marginal revenue equals marginal cost, from a linear demand curve and your cost structure.",
    metaTitle: "Maximum Profit Calculator — Profit-Maximizing Price & Output",
    metaDescription: "Free maximum profit calculator. Set MR = MC with a linear demand curve and your fixed and variable costs to find the best price, quantity and maximum profit.",
    calcInputs: [currencyField("demandIntercept", "Demand Intercept a (price at which sales are zero)", { default: 100, max: 100000000, step: 0.01 }), numberField("demandSlope", "Demand Slope b (price drop per extra unit)", { default: 0.5, max: 1000000, step: 0.0001 }), currencyField("fixedCost", "Fixed Costs", { default: 1000, max: 100000000000, step: 1 }), currencyField("variableCost", "Variable Cost per Unit c", { default: 20, max: 100000000, step: 0.01 }), numberField("costCurvature", "Rising Cost Term d (cost = FC + cQ + dQ², optional)", { default: 0, max: 1000000, step: 0.0001, required: false })],
    calcResult: { label: "Maximum Profit", format: "currency" },
    calcResults: [num("profitMaximizingQuantity", "Profit-Maximising Quantity"), cur("profitMaximizingPrice", "Profit-Maximising Price"), cur("totalRevenue", "Total Revenue"), cur("totalCost", "Total Cost"), cur("maximumProfit", "Maximum Profit", true), cur("marginalRevenueEqualsCost", "MR = MC at")],
    instructions: "Describe demand as P = a − bQ: a is the price at which nobody buys and b is how much the price must fall to sell one more unit. Enter your fixed costs and cost per unit (add d if unit costs rise with volume).",
    examples: "Example: with P = 100 − 0.5Q, fixed costs of $1,000 and $20 per unit, MR = 100 − Q equals MC = 20 at Q = 80. The price is $60, revenue $4,800, cost $2,600 and maximum profit $2,200.",
    assumptions: "Q* = (a − c) ÷ (2b + 2d) for a single-price firm with market power. If maximum profit is negative, the firm minimises losses there and should shut down if price is below average variable cost. " + DISCLAIMER,
    faq: [
      { question: "Why is profit maximised where MR = MC?", answer: "Below that quantity each extra unit adds more revenue than cost; above it, each one adds more cost than revenue." },
      { question: "How do I estimate a and b?", answer: "From two price points and the quantities sold at each: b = −ΔP ÷ ΔQ, then a = P + bQ." },
    ],
  },
  {
    slug: "fifo-lifo-calculator",
    category: MISCELLANEOUS,
    title: "FIFO & LIFO Calculator",
    description: "Calculate cost of goods sold, ending inventory and gross profit under FIFO, LIFO and weighted average cost from up to five inventory purchases.",
    metaTitle: "FIFO & LIFO Calculator — COGS & Ending Inventory",
    metaDescription: "Free FIFO and LIFO calculator. Compare cost of goods sold, ending inventory and gross profit under FIFO, LIFO and weighted average from your purchase layers.",
    calcInputs: [
      ...Array.from({ length: 5 }, (_, i) => [
        numberField(`units${i + 1}`, i === 0 ? "Beginning Inventory — Units" : `Purchase ${i} — Units`, { default: [100, 200, 150, 0, 0][i], max: 1000000000, required: false }),
        currencyField(`cost${i + 1}`, i === 0 ? "Beginning Inventory — Cost per Unit" : `Purchase ${i} — Cost per Unit`, { default: [10, 12, 15, 0, 0][i], max: 100000000, step: 0.01, required: false }),
      ]).flat(),
      numberField("unitsSold", "Units Sold", { default: 300, max: 1000000000 }),
      currencyField("sellingPrice", "Selling Price per Unit (optional)", { default: 20, max: 100000000, step: 0.01, required: false }),
    ],
    calcResult: { label: "COGS (FIFO)", format: "currency" },
    calcResults: [num("unitsAvailable", "Units Available for Sale"), cur("costOfGoodsAvailable", "Cost of Goods Available"), cur("cogsFifo", "COGS — FIFO", true), cur("cogsLifo", "COGS — LIFO"), cur("cogsWeightedAverage", "COGS — Weighted Average"), cur("endingInventoryFifo", "Ending Inventory — FIFO"), cur("endingInventoryLifo", "Ending Inventory — LIFO"), cur("endingInventoryAverage", "Ending Inventory — Weighted Average"), cur("grossProfitFifo", "Gross Profit — FIFO"), cur("grossProfitLifo", "Gross Profit — LIFO"), cur("averageUnitCost", "Weighted Average Unit Cost")],
    instructions: "Enter beginning inventory and each purchase in date order, then the units sold in the period. FIFO assumes the oldest units are sold first; LIFO assumes the newest are; weighted average uses the average cost of everything available.",
    examples: "Example: 100 units at $10, 200 at $12 and 150 at $15, with 300 sold. FIFO COGS = $3,400, LIFO = $4,050 and weighted average = $3,766.67. When prices are rising, LIFO shows higher costs and lower profit (and tax).",
    assumptions: "Periodic inventory system (all sales assumed after all purchases). LIFO is allowed under US GAAP but not IFRS, and US companies that use it for tax must also use it in their financial statements. " + DISCLAIMER,
    faq: [
      { question: "Which is better, FIFO or LIFO?", answer: "FIFO shows ending inventory closer to current cost; LIFO lowers taxable profit when prices rise. Most small businesses use FIFO." },
      { question: "Can I switch from FIFO to LIFO?", answer: "In the US you need IRS approval (Form 970 to adopt LIFO), and switching back requires Form 3115." },
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
