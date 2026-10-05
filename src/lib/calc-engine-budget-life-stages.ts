/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 7 of 12 — Life Stages
 * & Work (9 tools), filed under Budget Calculators > Life Events & Travel
 * Budget Calculators. See calc-engine-budget-methods.ts for the full batch
 * context.
 *
 *  - householdMovingBudget (incl. new job relocation): moving, deposits and
 *    setup costs less an employer relocation package.
 *  - firstApartmentBudget: move-in cash, monthly cost, the 40x-rent income
 *    rule landlords use.
 *  - collegeStudentBudget: semester costs less aid and part-time pay.
 *  - postGraduationBudget: first-job take-home vs rent, loans, savings.
 *  - downsizingBudget: equity freed and monthly savings from a smaller home.
 *  - emptyNesterBudget: money freed from kids' costs redirected to
 *    retirement.
 *  - jobLossEmergencyBudget (incl. career change runway, strike fund):
 *    months of runway from savings, severance and benefits.
 *  - commuterVsRemoteCostComparison (incl. remote work expenses, home
 *    office setup): commuting costs and time vs working from home.
 *  - fourDayWorkWeekCostImpact: pay change vs savings from one fewer day.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-life-stages-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Household Moving Budget Calculator ---------------------------------------------
export const householdMovingBudgetCalculator: CustomCalculator = (values) => {
  const movers = pos(values.movers, 2500);
  const packing = pos(values.packing, 200);
  const travel = pos(values.travel, 400);
  const deposits = pos(values.deposits, 2000);
  const overlapHousing = pos(values.overlapHousing, 0);
  const setup = pos(values.setup, 500);
  const employerPackage = pos(values.employerPackage, 0);
  const monthsToSave = Math.max(1, pos(values.monthsToSave, 3));

  const total = movers + packing + travel + deposits + overlapHousing + setup;
  const net = Math.max(0, total - employerPackage);

  return {
    totalMovingCost: round2(total),
    outOfPocketAfterEmployer: round2(net),
    monthlySavingsNeeded: round2(net / monthsToSave),
  };
};

// --- 2. First Apartment Budget Calculator ----------------------------------------------
export const firstApartmentBudgetCalculator: CustomCalculator = (values) => {
  const rent = pos(values.rent, 1400);
  const yearlyIncome = pos(values.yearlyIncome, 60000);
  const depositMonths = pos(values.depositMonths, 1);
  const applicationFees = pos(values.applicationFees, 100);
  const moving = pos(values.moving, 500);
  const furniture = pos(values.furniture, 1500);
  const utilities = pos(values.utilities, 150);
  const rentersInsurance = pos(values.rentersInsurance, 15);

  const moveIn = rent * (1 + depositMonths) + applicationFees + moving + furniture;
  const monthly = rent + utilities + rentersInsurance;

  return {
    moveInCash: round2(moveIn),
    monthlyHousingCost: round2(monthly),
    rentToIncomePercent: round2(yearlyIncome > 0 ? ((rent * 12) / yearlyIncome) * 100 : 0),
    incomeNeededFor40xRule: round2(rent * 40),
    meets40xRule: yearlyIncome >= rent * 40 ? 1 : 0,
  };
};

// --- 3. College Student Budget Calculator ----------------------------------------------
export const collegeStudentBudgetCalculator: CustomCalculator = (values) => {
  const tuition = pos(values.tuition, 6000);
  const housing = pos(values.housing, 4500);
  const mealPlan = pos(values.mealPlan, 2500);
  const books = pos(values.books, 600);
  const other = pos(values.other, 1200);
  const aid = pos(values.aid, 5000);
  const monthlyJobIncome = pos(values.monthlyJobIncome, 600);
  const months = Math.max(1, pos(values.months, 4.5));

  const cost = tuition + housing + mealPlan + books + other;
  const work = monthlyJobIncome * months;
  const gap = cost - aid - work;

  return {
    semesterCost: round2(cost),
    afterAid: round2(cost - aid),
    jobIncomeForSemester: round2(work),
    semesterGap: round2(gap),
    monthlyGap: round2(gap / months),
  };
};

// --- 4. Post-Graduation Budget Calculator ----------------------------------------------
export const postGraduationBudgetCalculator: CustomCalculator = (values) => {
  const salary = pos(values.salary, 55000);
  const taxPercent = Math.min(100, pos(values.taxPercent, 22));
  const studentLoan = pos(values.studentLoan, 350);
  const rent = pos(values.rent, 1300);
  const otherCosts = pos(values.otherCosts, 1200);
  const savingsPercent = Math.min(100, pos(values.savingsPercent, 15));

  const takeHome = (salary * (1 - taxPercent / 100)) / 12;
  const savings = (takeHome * savingsPercent) / 100;
  const left = takeHome - studentLoan - rent - otherCosts - savings;

  return {
    monthlyTakeHome: round2(takeHome),
    monthlySavings: round2(savings),
    leftOver: round2(left),
    rentShare: round2(takeHome > 0 ? (rent / takeHome) * 100 : 0),
    loanShare: round2(takeHome > 0 ? (studentLoan / takeHome) * 100 : 0),
  };
};

// --- 5. Downsizing Budget Calculator ---------------------------------------------------
export const downsizingBudgetCalculator: CustomCalculator = (values) => {
  const currentValue = pos(values.currentValue, 600000);
  const mortgageBalance = pos(values.mortgageBalance, 150000);
  const sellingCostPercent = pos(values.sellingCostPercent, 7);
  const newHomePrice = pos(values.newHomePrice, 350000);
  const buyingCostPercent = pos(values.buyingCostPercent, 3);
  const currentMonthlyCosts = pos(values.currentMonthlyCosts, 3500);
  const newMonthlyCosts = pos(values.newMonthlyCosts, 2200);

  const proceeds = currentValue * (1 - sellingCostPercent / 100) - mortgageBalance;
  const freed = proceeds - newHomePrice * (1 + buyingCostPercent / 100);
  const monthly = currentMonthlyCosts - newMonthlyCosts;

  return {
    netSaleProceeds: round2(proceeds),
    cashFreedAfterBuying: round2(freed),
    monthlySavings: round2(monthly),
    yearlySavings: round2(monthly * 12),
    tenYearSavings: round2(monthly * 120 + freed),
  };
};

// --- 6. Empty Nester Budget Calculator -------------------------------------------------
export const emptyNesterBudgetCalculator: CustomCalculator = (values) => {
  const freedMonthly = pos(values.freedMonthly, 1500);
  const redirectPercent = Math.min(100, pos(values.redirectPercent, 80));
  const yearsToRetirement = pos(values.yearsToRetirement, 10);
  const returnPercent = safeNumber(values.returnPercent, 7);
  const newCosts = pos(values.newCosts, 200);

  const invest = Math.max(0, ((freedMonthly - newCosts) * redirectPercent) / 100);
  const g = Math.pow(1 + returnPercent / 100, 1 / 12);
  let fv = 0;
  for (let m = 0; m < Math.round(yearsToRetirement * 12); m++) fv = (fv + invest) * g;

  return {
    netFreedMonthly: round2(freedMonthly - newCosts),
    monthlyToRetirement: round2(invest),
    yearlyToRetirement: round2(invest * 12),
    valueAtRetirement: round2(fv),
  };
};

// --- 7. Job Loss Emergency Budget Calculator -------------------------------------------
export const jobLossEmergencyBudgetCalculator: CustomCalculator = (values) => {
  const savings = pos(values.savings, 20000);
  const severance = pos(values.severance, 6000);
  const essentials = pos(values.essentials, 3800);
  const weeklyBenefit = pos(values.weeklyBenefit, 450);
  const benefitWeeks = pos(values.benefitWeeks, 26);
  const otherMonthlyIncome = pos(values.otherMonthlyIncome, 0);

  const benefitMonthly = (weeklyBenefit * 52) / 12;
  const benefitMonthCount = (benefitWeeks * 12) / 52;
  let cash = savings + severance;
  let months = 0;
  // whole months the cash lasts; 120 means 10 years or more
  for (let m = 0; m < 120; m++) {
    const benefit = benefitMonthly * Math.max(0, Math.min(1, benefitMonthCount - m));
    const burn = essentials - benefit - otherMonthlyIncome;
    if (cash - burn < 0) break;
    cash -= burn;
    months++;
  }

  return {
    cashAvailable: round2(savings + severance),
    monthlyBenefit: round2(benefitMonthly),
    shortfallWhileOnBenefits: round2(Math.max(0, essentials - benefitMonthly - otherMonthlyIncome)),
    shortfallAfterBenefits: round2(Math.max(0, essentials - otherMonthlyIncome)),
    monthsOfRunway: months,
  };
};

// --- 8. Commuter vs Remote Cost Comparison Calculator ----------------------------------
export const commuterVsRemoteCostComparisonCalculator: CustomCalculator = (values) => {
  const daysPerWeek = pos(values.daysPerWeek, 5);
  const milesRoundTrip = pos(values.milesRoundTrip, 30);
  const costPerMile = pos(values.costPerMile, 0.7);
  const transitPerDay = pos(values.transitPerDay, 0);
  const parkingPerDay = pos(values.parkingPerDay, 10);
  const lunchPerDay = pos(values.lunchPerDay, 12);
  const commuteMinutes = pos(values.commuteMinutes, 60);
  const remoteExtraMonthly = pos(values.remoteExtraMonthly, 60);
  const officeSetup = pos(values.officeSetup, 800);

  const days = daysPerWeek * 48;
  const commuteYearly = days * (milesRoundTrip * costPerMile + transitPerDay + parkingPerDay + lunchPerDay);
  const remoteYearly = remoteExtraMonthly * 12;

  return {
    commutingCostPerYear: round2(commuteYearly),
    remoteCostPerYear: round2(remoteYearly),
    yearlySavingsWorkingRemotely: round2(commuteYearly - remoteYearly),
    firstYearSavingsAfterSetup: round2(commuteYearly - remoteYearly - officeSetup),
    hoursSavedPerYear: round2((days * commuteMinutes) / 60),
  };
};

// --- 9. Four-Day Work Week Cost Impact Calculator --------------------------------------
export const fourDayWorkWeekCostImpactCalculator: CustomCalculator = (values) => {
  const salary = pos(values.salary, 70000);
  const payChangePercent = safeNumber(values.payChangePercent, 0);
  const commutePerDay = pos(values.commutePerDay, 20);
  const childcarePerDay = pos(values.childcarePerDay, 0);
  const lunchPerDay = pos(values.lunchPerDay, 12);
  const workWeeks = pos(values.workWeeks, 48);

  const payChange = (salary * payChangePercent) / 100;
  const saved = (commutePerDay + childcarePerDay + lunchPerDay) * workWeeks;

  return {
    yearlyPayChange: round2(payChange),
    yearlySavingsFromDayOff: round2(saved),
    netYearlyImpact: round2(payChange + saved),
    extraDaysOffPerYear: round2(workWeeks),
  };
};

export const budgetLifeStagesCustomCalculators: Record<string, CustomCalculator> = {
  "household-moving-budget-calculator": householdMovingBudgetCalculator,
  "first-apartment-budget-calculator": firstApartmentBudgetCalculator,
  "college-student-budget-calculator": collegeStudentBudgetCalculator,
  "post-graduation-budget-calculator": postGraduationBudgetCalculator,
  "downsizing-budget-calculator": downsizingBudgetCalculator,
  "empty-nester-budget-calculator": emptyNesterBudgetCalculator,
  "job-loss-emergency-budget-calculator": jobLossEmergencyBudgetCalculator,
  "commuter-vs-remote-cost-comparison-calculator": commuterVsRemoteCostComparisonCalculator,
  "four-day-work-week-cost-impact-calculator": fourDayWorkWeekCostImpactCalculator,
};
