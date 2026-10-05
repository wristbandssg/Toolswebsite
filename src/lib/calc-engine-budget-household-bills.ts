/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 3 of 12 — Household
 * Bills (7 tools), filed under Budget Calculators > Household & Family
 * Expense Calculators. See calc-engine-budget-methods.ts for the full batch
 * context.
 *
 *  - groceryBudget (incl. weekly meal plan): per-adult weekly cost, kids at
 *    a share of an adult, cost per meal.
 *  - diningOutBudget: meals out with tip, yearly cost, savings from cooking
 *    some of them at home.
 *  - utilityBillBudget: monthly total, a summer/winter peak month, share
 *    of income.
 *  - cellPhonePlanCost: plan + device payments + taxes vs a cheaper plan.
 *  - gymMembershipCost: yearly cost with fees, cost per visit, vs paying
 *    per class.
 *  - subscriptionCostAudit (incl. streaming services, gaming
 *    subscriptions): monthly/yearly/10-year cost, savings from cancelling
 *    rarely used ones.
 *  - roommateExpenseSplit: rent by room size (or equally), utilities
 *    equally.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-household-bills-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Grocery Budget Calculator ------------------------------------------------------
export const groceryBudgetCalculator: CustomCalculator = (values) => {
  const adults = pos(values.adults, 2);
  const children = pos(values.children, 2);
  const weeklyPerAdult = pos(values.weeklyPerAdult, 85);
  const childSharePercent = pos(values.childSharePercent, 70);
  const mealsOutPerWeek = pos(values.mealsOutPerWeek, 3);

  const weekly = weeklyPerAdult * (adults + (children * childSharePercent) / 100);
  const people = adults + children;
  const mealsAtHome = Math.max(1, people * 21 - mealsOutPerWeek * people);

  return {
    weeklyGroceryBudget: round2(weekly),
    monthlyGroceryBudget: round2((weekly * 52) / 12),
    yearlyGroceryBudget: round2(weekly * 52),
    costPerMealAtHome: round2(weekly / mealsAtHome),
  };
};

// --- 2. Dining Out Budget Calculator ---------------------------------------------------
export const diningOutBudgetCalculator: CustomCalculator = (values) => {
  const mealsPerWeek = pos(values.mealsPerWeek, 3);
  const people = pos(values.people, 2);
  const costPerPerson = pos(values.costPerPerson, 25);
  const tipPercent = pos(values.tipPercent, 18);
  const homeCostPerPerson = pos(values.homeCostPerPerson, 5);
  const shareCookedAtHomePercent = Math.min(100, pos(values.shareCookedAtHomePercent, 50));

  const perMeal = people * costPerPerson * (1 + tipPercent / 100);
  const monthly = (perMeal * mealsPerWeek * 52) / 12;
  const swap = (mealsPerWeek * shareCookedAtHomePercent) / 100;
  const saved = ((perMeal - people * homeCostPerPerson) * swap * 52) / 12;

  return {
    costPerMealOut: round2(perMeal),
    monthlyDiningCost: round2(monthly),
    yearlyDiningCost: round2(monthly * 12),
    monthlySavingsCookingAtHome: round2(saved),
    yearlySavingsCookingAtHome: round2(saved * 12),
  };
};

// --- 3. Utility Bill Budget Calculator -------------------------------------------------
export const utilityBillBudgetCalculator: CustomCalculator = (values) => {
  const electricity = pos(values.electricity, 140);
  const gas = pos(values.gas, 60);
  const water = pos(values.water, 50);
  const trash = pos(values.trash, 40);
  const internet = pos(values.internet, 70);
  const peakIncreasePercent = pos(values.peakIncreasePercent, 40);
  const income = pos(values.income, 5000);

  const total = electricity + gas + water + trash + internet;
  const peak = total + ((electricity + gas) * peakIncreasePercent) / 100;

  return {
    monthlyUtilities: round2(total),
    yearlyUtilities: round2(total * 12),
    peakMonthEstimate: round2(peak),
    shareOfIncome: round2(income > 0 ? (total / income) * 100 : 0),
  };
};

// --- 4. Cell Phone Plan Cost Calculator ------------------------------------------------
export const cellPhonePlanCostCalculator: CustomCalculator = (values) => {
  const lines = Math.max(1, pos(values.lines, 2));
  const planPerLine = pos(values.planPerLine, 45);
  const devicePrice = pos(values.devicePrice, 900);
  const devicesFinanced = pos(values.devicesFinanced, 2);
  const deviceMonths = Math.max(1, pos(values.deviceMonths, 36));
  const taxesFeesPercent = pos(values.taxesFeesPercent, 12);
  const altPlanPerLine = pos(values.altPlanPerLine, 25);

  const plan = lines * planPerLine * (1 + taxesFeesPercent / 100);
  const devices = (devicePrice * devicesFinanced) / deviceMonths;
  const monthly = plan + devices;
  const alt = lines * altPlanPerLine * (1 + taxesFeesPercent / 100);

  return {
    monthlyPlanWithTaxes: round2(plan),
    monthlyDevicePayments: round2(devices),
    totalMonthlyCost: round2(monthly),
    yearlyCost: round2(monthly * 12),
    yearlySavingsWithCheaperPlan: round2((plan - alt) * 12),
  };
};

// --- 5. Gym Membership Cost Calculator -------------------------------------------------
export const gymMembershipCostCalculator: CustomCalculator = (values) => {
  const monthlyFee = pos(values.monthlyFee, 50);
  const initiationFee = pos(values.initiationFee, 99);
  const annualFee = pos(values.annualFee, 49);
  const visitsPerWeek = pos(values.visitsPerWeek, 2.5);
  const payPerVisit = pos(values.payPerVisit, 20);

  const yearly = monthlyFee * 12 + annualFee;
  const firstYear = yearly + initiationFee;
  const visits = visitsPerWeek * 52;

  return {
    firstYearCost: round2(firstYear),
    yearlyCostAfter: round2(yearly),
    visitsPerYear: round2(visits),
    costPerVisit: round2(visits > 0 ? firstYear / visits : 0),
    payPerVisitYearlyCost: round2(visits * payPerVisit),
    breakEvenVisitsPerMonth: round2(payPerVisit > 0 ? (yearly / 12) / payPerVisit : 0),
  };
};

// --- 6. Subscription Cost Audit Calculator ---------------------------------------------
export const subscriptionCostAuditCalculator: CustomCalculator = (values) => {
  const subs = [
    pos(values.streaming1, 17.99),
    pos(values.streaming2, 15.49),
    pos(values.streaming3, 10.99),
    pos(values.music, 11.99),
    pos(values.gaming, 9.99),
    pos(values.cloudApps, 9.99),
    pos(values.newsMagazines, 10),
    pos(values.other, 15),
  ];
  const rarelyUsed = pos(values.rarelyUsed, 30);

  const monthly = subs.reduce((s, v) => s + v, 0);

  return {
    subscriptionsCounted: subs.filter((v) => v > 0).length,
    monthlyTotal: round2(monthly),
    yearlyTotal: round2(monthly * 12),
    tenYearTotal: round2(monthly * 120),
    yearlySavingsCancellingUnused: round2(Math.min(rarelyUsed, monthly) * 12),
  };
};

// --- 7. Roommate Expense Split Calculator ----------------------------------------------
export const roommateExpenseSplitCalculator: CustomCalculator = (values) => {
  const rent = pos(values.rent, 2400);
  const utilities = pos(values.utilities, 240);
  const raw = Math.round(safeNumber(values.method, 2));
  const bySize = raw !== 1;
  const sizes = [pos(values.room1, 160), pos(values.room2, 130), pos(values.room3, 110)];
  const commonSharePercent = Math.min(100, pos(values.commonSharePercent, 40));

  const n = sizes.filter((s) => s > 0).length || 1;
  const totalSize = sizes.reduce((s, v) => s + v, 0);
  // part of the rent covers shared space and is split equally; the rest by room size
  const shareOf = (k: number) => {
    if (!bySize || totalSize <= 0 || sizes[k] <= 0) return sizes[k] > 0 || !bySize ? rent / n : 0;
    return (rent * commonSharePercent) / 100 / n + (rent * (1 - commonSharePercent / 100) * sizes[k]) / totalSize;
  };
  const util = utilities / n;

  return {
    roommate1Pays: round2(shareOf(0) + util),
    roommate2Pays: round2(shareOf(1) + (sizes[1] > 0 ? util : 0)),
    roommate3Pays: round2(shareOf(2) + (sizes[2] > 0 ? util : 0)),
    equalShare: round2((rent + utilities) / n),
  };
};

export const budgetHouseholdBillsCustomCalculators: Record<string, CustomCalculator> = {
  "grocery-budget-calculator": groceryBudgetCalculator,
  "dining-out-budget-calculator": diningOutBudgetCalculator,
  "utility-bill-budget-calculator": utilityBillBudgetCalculator,
  "cell-phone-plan-cost-calculator": cellPhonePlanCostCalculator,
  "gym-membership-cost-calculator": gymMembershipCostCalculator,
  "subscription-cost-audit-calculator": subscriptionCostAuditCalculator,
  "roommate-expense-split-calculator": roommateExpenseSplitCalculator,
};
