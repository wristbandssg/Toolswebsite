/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 4 of 12 — Children
 * (8 tools), filed under Budget Calculators > Household & Family Expense
 * Calculators. See calc-engine-budget-methods.ts for the full batch context.
 *
 *  - childcareCostBudget: yearly cost; dependent care FSA ($7,500 from 2026)
 *    tax savings; child and dependent care credit on remaining expenses
 *    (limit $3,000 / $6,000, less FSA dollars) at the rate entered.
 *  - nannyVsDaycareCostComparison: daycare per child with sibling discount
 *    vs a nanny's wages plus employer payroll taxes.
 *  - backToSchoolBudget: per-child clothing, supplies, tech, fees.
 *  - newBabyBudget: first-year costs and the monthly saving needed before
 *    the due date.
 *  - pregnancyDeliveryCostBudget: insurance deductible/coinsurance/OOP max
 *    plus unpaid leave.
 *  - homeschoolCostBudget: curriculum, classes, supplies, lost income.
 *  - privateSchoolTuitionBudget: tuition rising yearly, aid, total and the
 *    529 K-12 withdrawal limit ($20,000/yr from 2026).
 *  - summerCampCostBudget: weeks x price, sibling discount, care credit for
 *    day camp.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-children-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Childcare Cost Budget Calculator -----------------------------------------------
export const childcareCostBudgetCalculator: CustomCalculator = (values) => {
  const weeklyPerChild = pos(values.weeklyPerChild, 300);
  const children = Math.max(1, Math.round(pos(values.children, 1)));
  const weeks = pos(values.weeks, 50);
  const fsaContribution = Math.min(7500, pos(values.fsaContribution, 5000));
  const taxRatePercent = pos(values.taxRatePercent, 30);
  const creditRatePercent = pos(values.creditRatePercent, 20);
  const income = pos(values.income, 9000);

  const yearly = weeklyPerChild * children * weeks;
  const fsaUsed = Math.min(fsaContribution, yearly);
  const fsaSavings = (fsaUsed * taxRatePercent) / 100;
  const limit = children >= 2 ? 6000 : 3000;
  const creditBase = Math.max(0, Math.min(yearly - fsaUsed, limit - fsaUsed));
  const credit = (creditBase * creditRatePercent) / 100;
  const net = yearly - fsaSavings - credit;

  return {
    yearlyCost: round2(yearly),
    monthlyCost: round2(yearly / 12),
    fsaTaxSavings: round2(fsaSavings),
    childCareCredit: round2(credit),
    netYearlyCost: round2(net),
    shareOfIncome: round2(income > 0 ? (net / 12 / income) * 100 : 0),
  };
};

// --- 2. Nanny vs Daycare Cost Comparison Calculator -------------------------------------
export const nannyVsDaycareCostComparisonCalculator: CustomCalculator = (values) => {
  const children = Math.max(1, Math.round(pos(values.children, 2)));
  const daycareWeekly = pos(values.daycareWeekly, 350);
  const siblingDiscountPercent = pos(values.siblingDiscountPercent, 10);
  const daycareWeeks = pos(values.daycareWeeks, 50);
  const nannyHourly = pos(values.nannyHourly, 22);
  const nannyHours = pos(values.nannyHours, 45);
  const nannyWeeks = pos(values.nannyWeeks, 52);
  const employerTaxPercent = pos(values.employerTaxPercent, 10);

  const daycare = daycareWeekly * daycareWeeks * (1 + (children - 1) * (1 - siblingDiscountPercent / 100));
  const nannyWages = nannyHourly * nannyHours * nannyWeeks;
  const nanny = nannyWages * (1 + employerTaxPercent / 100);

  return {
    daycareYearly: round2(daycare),
    nannyWages: round2(nannyWages),
    nannyYearlyWithTaxes: round2(nanny),
    differencePerYear: round2(nanny - daycare),
    daycarePerChildPerMonth: round2(daycare / children / 12),
    nannyPerChildPerMonth: round2(nanny / children / 12),
  };
};

// --- 3. Back-to-School Budget Calculator ------------------------------------------------
export const backToSchoolBudgetCalculator: CustomCalculator = (values) => {
  const children = Math.max(0, Math.round(pos(values.children, 2)));
  const clothing = pos(values.clothing, 150);
  const supplies = pos(values.supplies, 100);
  const tech = pos(values.tech, 150);
  const fees = pos(values.fees, 120);
  const monthsToSave = Math.max(1, pos(values.monthsToSave, 3));

  const perChild = clothing + supplies + tech + fees;
  const total = perChild * children;

  return {
    perChild: round2(perChild),
    totalBudget: round2(total),
    monthlySavingsNeeded: round2(total / monthsToSave),
    weeklySavingsNeeded: round2(total / (monthsToSave * 4.33)),
  };
};

// --- 4. New Baby Budget Calculator ------------------------------------------------------
export const newBabyBudgetCalculator: CustomCalculator = (values) => {
  const diapers = pos(values.diapers, 80);
  const formula = pos(values.formula, 150);
  const childcare = pos(values.childcare, 1200);
  const otherMonthly = pos(values.otherMonthly, 100);
  const gear = pos(values.gear, 1500);
  const medical = pos(values.medical, 1000);
  const monthsUntilDue = Math.max(1, pos(values.monthsUntilDue, 6));

  const monthly = diapers + formula + childcare + otherMonthly;
  const firstYear = monthly * 12 + gear + medical;

  return {
    monthlyOngoingCost: round2(monthly),
    oneTimeCosts: round2(gear + medical),
    firstYearTotal: round2(firstYear),
    saveMonthlyBeforeBirth: round2((gear + medical) / monthsUntilDue),
  };
};

// --- 5. Pregnancy and Delivery Cost Budget Calculator ----------------------------------
export const pregnancyDeliveryCostBudgetCalculator: CustomCalculator = (values) => {
  const billed = pos(values.billed, 20000);
  const deductible = pos(values.deductible, 3000);
  const coinsurancePercent = Math.min(100, pos(values.coinsurancePercent, 20));
  const oopMax = pos(values.oopMax, 7000);
  const alreadyPaid = pos(values.alreadyPaid, 0);
  const unpaidLeaveWeeks = pos(values.unpaidLeaveWeeks, 4);
  const weeklyPay = pos(values.weeklyPay, 1200);

  const raw = Math.min(billed, deductible) + (Math.max(0, billed - deductible) * coinsurancePercent) / 100;
  const oop = Math.max(0, Math.min(raw, oopMax - alreadyPaid));
  const leave = unpaidLeaveWeeks * weeklyPay;

  return {
    outOfPocketMedical: round2(oop),
    insurancePays: round2(billed - oop),
    lostIncome: round2(leave),
    totalCost: round2(oop + leave),
    saveMonthlyOver9Months: round2((oop + leave) / 9),
  };
};

// --- 6. Homeschool Cost Budget Calculator ----------------------------------------------
export const homeschoolCostBudgetCalculator: CustomCalculator = (values) => {
  const children = Math.max(1, Math.round(pos(values.children, 2)));
  const curriculum = pos(values.curriculum, 600);
  const classes = pos(values.classes, 500);
  const supplies = pos(values.supplies, 200);
  const sharedCosts = pos(values.sharedCosts, 400);
  const lostIncome = pos(values.lostIncome, 0);

  const direct = (curriculum + classes + supplies) * children + sharedCosts;
  const total = direct + lostIncome;

  return {
    directCostPerYear: round2(direct),
    costPerChild: round2(direct / children),
    monthlyCost: round2(direct / 12),
    totalWithLostIncome: round2(total),
  };
};

// --- 7. Private School Tuition Budget Calculator --------------------------------------
export const privateSchoolTuitionBudgetCalculator: CustomCalculator = (values) => {
  const tuition = pos(values.tuition, 18000);
  const fees = pos(values.fees, 1500);
  const increasePercent = safeNumber(values.increasePercent, 4);
  const years = Math.max(1, Math.round(pos(values.years, 6)));
  const children = Math.max(1, Math.round(pos(values.children, 1)));
  const aidPercent = Math.min(100, pos(values.aidPercent, 0));

  let total = 0;
  for (let y = 0; y < years; y++) total += (tuition + fees) * Math.pow(1 + increasePercent / 100, y);
  total *= children * (1 - aidPercent / 100);
  const firstYear = (tuition + fees) * children * (1 - aidPercent / 100);

  return {
    firstYearCost: round2(firstYear),
    monthlyFirstYear: round2(firstYear / 12),
    totalCost: round2(total),
    averageYearlyCost: round2(total / years),
    taxFree529WithdrawalPerYear: round2(Math.min(20000 * children, (tuition * children * (1 - aidPercent / 100)))),
  };
};

// --- 8. Summer Camp Cost Budget Calculator ---------------------------------------------
export const summerCampCostBudgetCalculator: CustomCalculator = (values) => {
  const children = Math.max(1, Math.round(pos(values.children, 2)));
  const weeks = pos(values.weeks, 6);
  const costPerWeek = pos(values.costPerWeek, 350);
  const extrasPerWeek = pos(values.extrasPerWeek, 40);
  const siblingDiscountPercent = pos(values.siblingDiscountPercent, 5);
  const creditRatePercent = pos(values.creditRatePercent, 20);
  const monthsToSave = Math.max(1, pos(values.monthsToSave, 5));

  const camp = costPerWeek * weeks * (1 + (children - 1) * (1 - siblingDiscountPercent / 100));
  const total = camp + extrasPerWeek * weeks * children;
  const limit = children >= 2 ? 6000 : 3000;
  const credit = (Math.min(camp, limit) * creditRatePercent) / 100;

  return {
    totalCost: round2(total),
    costPerChild: round2(total / children),
    dayCampCareCredit: round2(credit),
    netCost: round2(total - credit),
    monthlySavingsNeeded: round2(total / monthsToSave),
  };
};

export const budgetChildrenCustomCalculators: Record<string, CustomCalculator> = {
  "childcare-cost-budget-calculator": childcareCostBudgetCalculator,
  "nanny-vs-daycare-cost-comparison-calculator": nannyVsDaycareCostComparisonCalculator,
  "back-to-school-budget-calculator": backToSchoolBudgetCalculator,
  "new-baby-budget-calculator": newBabyBudgetCalculator,
  "pregnancy-and-delivery-cost-budget-calculator": pregnancyDeliveryCostBudgetCalculator,
  "homeschool-cost-budget-calculator": homeschoolCostBudgetCalculator,
  "private-school-tuition-budget-calculator": privateSchoolTuitionBudgetCalculator,
  "summer-camp-cost-budget-calculator": summerCampCostBudgetCalculator,
};
