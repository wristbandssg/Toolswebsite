/**
 * Batch: "Finance Calculators — Business, Investment & Economics" (14 Oct
 * 2026), sub-batch 4 of 5 — Pay, Costs & Pricing (10 tools). See
 * calc-engine-fin-valuation.ts for the full batch context.
 *
 *  - tip: tip on the pre-tax or full bill, split between people, optional
 *    round-up. Different from the existing gratuity-calculator (India's
 *    end-of-service gratuity).
 *  - agi: US adjusted gross income for 2026 — gross income less
 *    above-the-line adjustments, with the half-SE-tax deduction worked out
 *    from business income (2026 SS wage base $184,500), the $3,000 capital
 *    loss limit, the $2,500 student loan interest and $300 educator caps,
 *    then taxable income after the 2026 standard deduction ($16,100 single /
 *    MFS, $32,200 joint, $24,150 head of household).
 *  - laborCost: a team's yearly labor cost — wages with overtime at 1.5×,
 *    payroll taxes and benefits as % of wages, and labor cost as % of
 *    revenue. Different from employeeCost (one employee, itemized).
 *  - vaDisability: VA combined rating ("whole person" math, rounded to the
 *    nearest 10) and the monthly payment from the VA rate tables effective
 *    1 Dec 2025 (2.8% COLA), with spouse, children, parents and spouse Aid &
 *    Attendance.
 *  - employeeCost: one employee's fully loaded cost — employer FICA (SS
 *    6.2% to $184,500 + Medicare 1.45%), FUTA 0.6% of $7,000, SUTA, workers'
 *    comp, health, 401(k) match, other benefits and overhead; cost per paid
 *    and per productive hour.
 *  - discount: % off (with a stacked second discount), amount off, or the
 *    markdown % from original and sale price — the "Markdown Calculator"
 *    keyword is merged here.
 *  - marginalCost: ΔTC ÷ ΔQ and average total cost at both levels.
 *  - marginalRevenue: ΔTR ÷ ΔQ from two price/quantity points.
 *  - maximumProfit: linear demand P = a − bQ and cost FC + cQ + dQ²; profit
 *    is maximised where MR = MC: Q* = (a − c) ÷ (2b + 2d).
 *  - fifoLifo: periodic FIFO, LIFO and weighted-average COGS, ending
 *    inventory and gross profit from up to 5 cost layers.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin-business-pay-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const SS_WAGE_BASE_2026 = 184500;

// --- 1. Tip Calculator -----------------------------------------------------------------
export const tipCalculator: CustomCalculator = (values) => {
  const bill = pos(values.billAmount, 85);
  const tipPct = pos(values.tipPercent, 18);
  const people = Math.max(1, Math.round(pos(values.people, 1)));
  const tax = Math.min(bill, pos(values.taxAmount, 0));
  const base = num(values.tipOn, 1) === 2 ? bill - tax : bill;
  let tip = (base * tipPct) / 100;
  let total = bill + tip;
  if (num(values.roundUp, 1) === 2) {
    total = Math.ceil(total / people) * people;
    tip = total - bill;
  }
  return {
    tipAmount: round2(tip),
    totalBill: round2(total),
    perPerson: round2(total / people),
    tipPerPerson: round2(tip / people),
    effectiveTipPct: round2(bill > 0 ? (tip / bill) * 100 : 0),
  };
};

// --- 2. AGI Calculator -----------------------------------------------------------------
const STANDARD_DEDUCTION_2026: Record<number, number> = { 1: 16100, 2: 32200, 3: 24150, 4: 16100 };

export const agiCalculator: CustomCalculator = (values) => {
  const status = clamp(num(values.filingStatus, 1), 1, 4);
  const wages = pos(values.wages, 65000);
  const business = num(values.businessIncome, 0);
  const capLimit = status === 4 ? 1500 : 3000;
  const capGains = Math.max(-capLimit, num(values.capitalGains, 0));
  const totalIncome =
    wages + pos(values.interest, 500) + pos(values.dividends, 800) + business + capGains +
    pos(values.retirementIncome, 0) + pos(values.otherIncome, 0);
  const seNet = Math.max(0, business) * 0.9235;
  const seTax = seNet >= 400 ? Math.min(seNet, Math.max(0, SS_WAGE_BASE_2026 - wages)) * 0.124 + seNet * 0.029 : 0;
  const adjustments =
    pos(values.iraDeduction, 0) + pos(values.hsaDeduction, 0) + Math.min(2500, pos(values.studentLoanInterest, 0)) +
    seTax / 2 + pos(values.seHealthInsurance, 0) + Math.min(300, pos(values.educatorExpenses, 0)) +
    pos(values.otherAdjustments, 0);
  const agi = totalIncome - adjustments;
  const std = STANDARD_DEDUCTION_2026[status];
  return {
    totalIncome: round2(totalIncome),
    halfSeTaxDeduction: round2(seTax / 2),
    totalAdjustments: round2(adjustments),
    agi: round2(agi),
    standardDeduction: std,
    estimatedTaxableIncome: round2(Math.max(0, agi - std)),
  };
};

// --- 3. Labor Cost Calculator ----------------------------------------------------------
export const laborCostCalculator: CustomCalculator = (values) => {
  const staff = pos(values.employees, 10);
  const rate = pos(values.hourlyWage, 22);
  const hours = pos(values.hoursPerWeek, 40);
  const weeks = pos(values.weeksPerYear, 52);
  const ot = pos(values.overtimeHoursPerWeek, 0);
  const wages = staff * weeks * (hours * rate + ot * rate * 1.5);
  const taxes = (wages * pos(values.payrollTaxPct, 10)) / 100;
  const benefits = (wages * pos(values.benefitsPct, 20)) / 100;
  const total = wages + taxes + benefits;
  const totalHours = staff * weeks * (hours + ot);
  const revenue = pos(values.annualRevenue, 0);
  return {
    grossWages: round2(wages),
    payrollTaxes: round2(taxes),
    benefitsCost: round2(benefits),
    totalLaborCost: round2(total),
    monthlyLaborCost: round2(total / 12),
    loadedCostPerHour: round2(totalHours > 0 ? total / totalHours : 0),
    laborCostPctOfRevenue: round2(revenue > 0 ? (total / revenue) * 100 : 0),
  };
};

// --- 4. VA Disability Calculator -------------------------------------------------------
// Monthly rates effective 1 Dec 2025. 10%/20%: veteran only.
const VA_10_20: Record<number, number> = { 10: 180.42, 20: 356.66 };
// 30–100%: [alone, with spouse, spouse + 1 child, 1 child only, per parent,
//           each additional child < 18, each additional school child 18–23,
//           spouse Aid & Attendance]
const VA_TABLE: Record<number, number[]> = {
  30: [552.47, 617.47, 666.47, 596.47, 52, 32, 105, 61],
  40: [795.84, 882.84, 947.84, 853.84, 70, 43, 140, 81],
  50: [1132.9, 1241.9, 1322.9, 1205.9, 88, 54, 176, 101],
  60: [1435.02, 1566.02, 1663.02, 1523.02, 105, 65, 211, 121],
  70: [1808.45, 1961.45, 2074.45, 1910.45, 123, 76, 246, 141],
  80: [2102.15, 2277.15, 2406.15, 2219.15, 140, 87, 281, 161],
  90: [2362.3, 2559.3, 2704.3, 2494.3, 158, 98, 317, 181],
  100: [3938.58, 4158.17, 4318.99, 4085.43, 176.24, 109.11, 352.45, 201.41],
};

export const vaDisabilityCalculator: CustomCalculator = (values) => {
  const ratings: number[] = [];
  for (let k = 1; k <= 6; k++) {
    const r = clamp(num(values[`rating${k}`], 0), 0, 100);
    if (r > 0) ratings.push(r);
  }
  ratings.sort((a, b) => b - a);
  let disabled = 0;
  for (const r of ratings) disabled = Math.round(disabled + ((100 - disabled) * r) / 100);
  const combined = clamp(Math.round(disabled / 10) * 10, 0, 100);

  const spouse = num(values.spouse, 1) === 2;
  const aa = spouse && num(values.spouseAidAttendance, 1) === 2;
  const kids = Math.round(pos(values.childrenUnder18, 0));
  const school = Math.round(pos(values.childrenInSchool, 0));
  const parents = clamp(Math.round(num(values.dependentParents, 0)), 0, 2);

  let pay = 0;
  if (combined === 10 || combined === 20) pay = VA_10_20[combined];
  else if (combined >= 30) {
    const [alone, withSpouse, spouseChild, childOnly, perParent, addChild, addSchool, aaAdd] = VA_TABLE[combined];
    const anyChild = kids + school > 0;
    // The first child is priced by the "with child" rows; the rest are added.
    const extraKids = kids > 0 ? kids - 1 : 0;
    const extraSchool = kids > 0 ? school : Math.max(0, school - 1);
    pay = anyChild ? (spouse ? spouseChild : childOnly) : spouse ? withSpouse : alone;
    pay += extraKids * addChild + extraSchool * addSchool + parents * perParent + (aa ? aaAdd : 0);
  }
  return {
    combinedValue: disabled,
    combinedRating: combined,
    monthlyPayment: round2(pay),
    annualPayment: round2(pay * 12),
    dependentAddOn: round2(combined >= 30 ? pay - VA_TABLE[combined][0] : 0),
  };
};

// --- 5. Employee Cost Calculator -------------------------------------------------------
export const employeeCostCalculator: CustomCalculator = (values) => {
  const salary = pos(values.annualSalary, 60000);
  const paidHours = Math.max(1, pos(values.paidHoursPerYear, 2080));
  const fica = Math.min(salary, SS_WAGE_BASE_2026) * 0.062 + salary * 0.0145;
  const futa = Math.min(salary, 7000) * 0.006;
  const suta = Math.min(salary, pos(values.sutaWageBase, 7000)) * (pos(values.sutaRate, 2.7) / 100);
  const comp = salary * (pos(values.workersCompPct, 1) / 100);
  const taxes = fica + futa + suta + comp;
  const benefits =
    pos(values.healthInsurance, 9000) + salary * (pos(values.retirementMatchPct, 4) / 100) + pos(values.otherBenefits, 1500);
  const overhead = pos(values.overhead, 5000);
  const total = salary + taxes + benefits + overhead;
  const productive = Math.max(1, paidHours - pos(values.ptoDays, 15) * 8);
  return {
    employerPayrollTaxes: round2(taxes),
    benefitsCost: round2(benefits),
    totalAnnualCost: round2(total),
    costAboveSalary: round2(total - salary),
    costMultiplier: round2(salary > 0 ? total / salary : 0),
    costPerPaidHour: round2(total / paidHours),
    costPerProductiveHour: round2(total / productive),
    monthlyCost: round2(total / 12),
  };
};

// --- 6. Discount Calculator ------------------------------------------------------------
export const discountCalculator: CustomCalculator = (values) => {
  const original = pos(values.originalPrice, 80);
  const mode = num(values.mode, 1); // 1 % off, 2 amount off, 3 markdown from sale price
  let final: number;
  if (mode === 2) final = original - pos(values.amountOff, 10);
  else if (mode === 3) final = pos(values.salePrice, 60);
  else final = original * (1 - pos(values.discountPercent, 25) / 100) * (1 - pos(values.extraDiscountPercent, 0) / 100);
  final = Math.max(0, final);
  const saved = original - final;
  return {
    finalPrice: round2(final),
    youSave: round2(saved),
    totalDiscountPct: round2(original > 0 ? (saved / original) * 100 : 0),
    priceWithTax: round2(final * (1 + pos(values.salesTaxRate, 0) / 100)),
  };
};

// --- 7. Marginal Cost Calculator -------------------------------------------------------
export const marginalCostCalculator: CustomCalculator = (values) => {
  const tc1 = pos(values.initialTotalCost, 10000);
  const tc2 = pos(values.newTotalCost, 11500);
  const q1 = pos(values.initialQuantity, 500);
  const q2 = pos(values.newQuantity, 600);
  const dq = q2 - q1;
  return {
    changeInCost: round2(tc2 - tc1),
    changeInQuantity: round2(dq),
    marginalCost: round2(dq !== 0 ? (tc2 - tc1) / dq : 0),
    averageCostBefore: round2(q1 > 0 ? tc1 / q1 : 0),
    averageCostAfter: round2(q2 > 0 ? tc2 / q2 : 0),
  };
};

// --- 8. Marginal Revenue Calculator ----------------------------------------------------
export const marginalRevenueCalculator: CustomCalculator = (values) => {
  const p1 = pos(values.initialPrice, 20);
  const q1 = pos(values.initialQuantity, 100);
  const p2 = pos(values.newPrice, 18);
  const q2 = pos(values.newQuantity, 130);
  const tr1 = p1 * q1;
  const tr2 = p2 * q2;
  const dq = q2 - q1;
  return {
    revenueBefore: round2(tr1),
    revenueAfter: round2(tr2),
    changeInRevenue: round2(tr2 - tr1),
    marginalRevenue: round2(dq !== 0 ? (tr2 - tr1) / dq : 0),
    averageRevenue: round2(q2 > 0 ? tr2 / q2 : 0),
  };
};

// --- 9. Maximum Profit Calculator ------------------------------------------------------
export const maximumProfitCalculator: CustomCalculator = (values) => {
  const a = pos(values.demandIntercept, 100);
  const b = pos(values.demandSlope, 0.5);
  const fc = pos(values.fixedCost, 1000);
  const c = pos(values.variableCost, 20);
  const d = pos(values.costCurvature, 0);
  const q = 2 * b + 2 * d > 0 ? Math.max(0, (a - c) / (2 * b + 2 * d)) : 0;
  const p = Math.max(0, a - b * q);
  const revenue = p * q;
  const cost = fc + c * q + d * q * q;
  return {
    profitMaximizingQuantity: round2(q),
    profitMaximizingPrice: round2(p),
    totalRevenue: round2(revenue),
    totalCost: round2(cost),
    maximumProfit: round2(revenue - cost),
    marginalRevenueEqualsCost: round2(a - 2 * b * q),
  };
};

// --- 10. FIFO & LIFO Calculator --------------------------------------------------------
export const fifoLifoCalculator: CustomCalculator = (values) => {
  const layers: { units: number; cost: number }[] = [];
  for (let k = 1; k <= 5; k++) {
    const units = pos(values[`units${k}`], 0);
    if (units > 0) layers.push({ units, cost: pos(values[`cost${k}`], 0) });
  }
  const available = layers.reduce((s, l) => s + l.units, 0);
  const totalCost = layers.reduce((s, l) => s + l.units * l.cost, 0);
  const sold = Math.min(available, pos(values.unitsSold, 0));
  const take = (order: typeof layers) => {
    let left = sold;
    let cogs = 0;
    for (const l of order) {
      const u = Math.min(left, l.units);
      cogs += u * l.cost;
      left -= u;
      if (left <= 0) break;
    }
    return cogs;
  };
  const fifo = take(layers);
  const lifo = take([...layers].reverse());
  const avgCost = available > 0 ? totalCost / available : 0;
  const avg = sold * avgCost;
  const sales = sold * pos(values.sellingPrice, 0);
  return {
    unitsAvailable: round2(available),
    costOfGoodsAvailable: round2(totalCost),
    cogsFifo: round2(fifo),
    cogsLifo: round2(lifo),
    cogsWeightedAverage: round2(avg),
    endingInventoryFifo: round2(totalCost - fifo),
    endingInventoryLifo: round2(totalCost - lifo),
    endingInventoryAverage: round2(totalCost - avg),
    grossProfitFifo: round2(sales - fifo),
    grossProfitLifo: round2(sales - lifo),
    averageUnitCost: round2(avgCost),
  };
};

export const finBusinessPayCustomCalculators: Record<string, CustomCalculator> = {
  "tip-calculator": tipCalculator,
  "agi-calculator": agiCalculator,
  "labor-cost-calculator": laborCostCalculator,
  "va-disability-calculator": vaDisabilityCalculator,
  "employee-cost-calculator": employeeCostCalculator,
  "discount-calculator": discountCalculator,
  "marginal-cost-calculator": marginalCostCalculator,
  "marginal-revenue-calculator": marginalRevenueCalculator,
  "maximum-profit-calculator": maximumProfitCalculator,
  "fifo-lifo-calculator": fifoLifoCalculator,
};
