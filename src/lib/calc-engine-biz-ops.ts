/**
 * Batch: "Business & Industrial Calculators" → HR, Marketing & Business Operations Calculators.
 *
 * Data / methods:
 *  - Payroll burden: FICA 7.65%, FUTA 0.6% on the first $7,000, SUTA on the state wage base,
 *    workers' comp per $100 of payroll.
 *  - Erlang C staffing: P(wait) from the Erlang B recursion; service level =
 *    1 − P(wait)·e^(−(N − A)·T/AHT); ASA = P(wait)·AHT ÷ (N − A).
 *  - Cost per hire: SHRM / ANSI cost-per-hire standard (internal + external costs ÷ hires).
 *  - Gallup: actively disengaged employees cost ~18% of salary in lost productivity.
 *  - Event capacity: typical planner space factors per guest, and IBC Table 1004.5 occupant
 *    load factors (standing 5, chairs only 7, tables and chairs 15 net sq ft).
 *  - Share of voice / ESOV rule of thumb (Binet & Field): +10 points ESOV ≈ +0.5 points share a year.
 *  - Mexico / UAE and other country figures are 2025–2026 typical values the user can edit.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-ops-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));
const yes = (v: number) => Math.round(safeNumber(v)) === 1;
const ceil = (n: number) => Math.ceil(n - 1e-9);
const pctOf = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const DAY = 86400000;
const today = () => Math.floor(Date.now() / DAY);

// --- HR & payroll ---------------------------------------------------------------------------------------------
export const laborBurden: CustomCalculator = (v) => {
  const hours = nonNeg(v.paidHours, 2080);
  const wages = nonNeg(v.hourlyWage) * hours;
  const fica = wages * 0.0765;
  const futa = Math.min(wages, 7000) * 0.006;
  const suta = Math.min(wages, nonNeg(v.sutaWageBase, 9000)) * (nonNeg(v.sutaRate) / 100);
  const wc = (wages / 100) * nonNeg(v.workersCompRate);
  const health = nonNeg(v.healthInsurance);
  const retire = wages * (nonNeg(v.retirementMatch) / 100);
  const other = nonNeg(v.otherBenefits);
  const burden = fica + futa + suta + wc + health + retire + other;
  const productive = Math.max(1, hours - nonNeg(v.ptoHours));
  return { fullyBurdenedHourly: round2((wages + burden) / productive), burdenPercent: round2(pctOf(burden, wages)), annualBurden: round2(burden), totalAnnualCost: round2(wages + burden), payrollTaxes: round2(fica + futa + suta), workersComp: round2(wc), benefits: round2(health + retire + other), productiveHours: round2(productive) };
};

export const restaurantLabor: CustomCalculator = (v) => {
  const foh = nonNeg(v.fohHours) * nonNeg(v.fohWage);
  const boh = nonNeg(v.bohHours) * nonNeg(v.bohWage);
  const wages = foh + boh + nonNeg(v.managementWeekly);
  const taxes = wages * (nonNeg(v.payrollTaxRate, 10) / 100);
  const labor = wages + taxes + nonNeg(v.benefitsWeekly);
  const sales = nonNeg(v.weeklySales);
  const food = sales * (nonNeg(v.foodCostPercent) / 100);
  return { laborCostPercent: round2(pctOf(labor, sales)), weeklyLaborCost: round2(labor), primeCostPercent: round2(pctOf(labor + food, sales)), laborBudgetAtTarget: round2(sales * (nonNeg(v.targetLaborPercent, 30) / 100)), overUnderTarget: round2(labor - sales * (nonNeg(v.targetLaborPercent, 30) / 100)), salesPerLaborHour: round2(nonNeg(v.fohHours) + nonNeg(v.bohHours) ? sales / (nonNeg(v.fohHours) + nonNeg(v.bohHours)) : 0), payrollTaxes: round2(taxes) };
};

export const hvacLaborRate: CustomCalculator = (v) => {
  const wage = nonNeg(v.techWage);
  const burdened = wage * (1 + nonNeg(v.burdenPercent, 30) / 100);
  const billable = Math.max(1, 2080 * (nonNeg(v.billablePercent, 60) / 100));
  const overheadPerHour = (nonNeg(v.annualOverhead) / Math.max(1, nonNeg(v.technicians, 1))) / billable;
  const vehicle = (nonNeg(v.vehicleCostPerYear) / billable);
  const costPerBillable = (burdened * 2080) / billable + overheadPerHour + vehicle;
  const rate = costPerBillable / Math.max(0.05, 1 - nonNeg(v.profitMargin, 20) / 100);
  return { billableHourlyRate: round2(rate), breakEvenRate: round2(costPerBillable), burdenedWage: round2(burdened), overheadPerBillableHour: round2(overheadPerHour), billableHoursPerTech: round2(billable), serviceCallFee: round2(rate * nonNeg(v.callFeeHours, 1)) };
};

export const outsourcing: CustomCalculator = (v) => {
  const n = nonNeg(v.employees);
  const inHouse = n * (nonNeg(v.salary) * (1 + nonNeg(v.benefitsPercent, 30) / 100) + nonNeg(v.overheadPerEmployee)) + nonNeg(v.managementCost) + nonNeg(v.recruitingTraining);
  const vendor = pick(v.pricing, 2) === 0 ? nonNeg(v.vendorRate) * nonNeg(v.hoursPerYear) : nonNeg(v.vendorMonthly) * 12;
  const out = vendor * (1 + nonNeg(v.oversightPercent, 10) / 100) + nonNeg(v.transitionCost) / Math.max(1, nonNeg(v.years, 3));
  return { annualSavings: round2(inHouse - out), inHouseAnnualCost: round2(inHouse), outsourcedAnnualCost: round2(out), savingsPercent: round2(pctOf(inHouse - out, inHouse)), multiYearSavings: round2((inHouse - out) * Math.max(1, nonNeg(v.years, 3))), betterOption: inHouse > out ? 1 : 2 };
};

/** Employer statutory cost % on top of salary (typical 2026 averages). */
export const EOR_COUNTRIES: [string, number][] = [["United Kingdom", 14], ["Germany", 21], ["France", 45], ["Spain", 31], ["Netherlands", 20], ["Poland", 20], ["Canada", 11], ["Mexico", 30], ["Brazil", 70], ["India", 13], ["Philippines", 10], ["Australia", 17], ["Singapore", 17], ["Custom", -1]];
export const eor: CustomCalculator = (v) => {
  const c = EOR_COUNTRIES[pick(v.country, EOR_COUNTRIES.length)][1];
  const rate = c < 0 ? nonNeg(v.customEmployerCost) : c;
  const salary = nonNeg(v.salary);
  const employer = salary * (rate / 100);
  const fee = nonNeg(v.eorFeeMonthly) * 12;
  const total = salary + employer + fee + nonNeg(v.benefitsAnnual) + nonNeg(v.equipment);
  return { annualTotalCost: round2(total), monthlyCost: round2(total / 12), employerContributions: round2(employer), eorFees: round2(fee), costAboveSalaryPercent: round2(pctOf(total - salary, salary)), depositEstimate: round2((salary + employer) / 12 * nonNeg(v.depositMonths, 1)) };
};

export const peo: CustomCalculator = (v) => {
  const n = nonNeg(v.employees);
  const payroll = n * nonNeg(v.averageSalary);
  const fee = pick(v.pricing, 2) === 0 ? payroll * (nonNeg(v.percentOfPayroll) / 100) : n * nonNeg(v.pepm) * 12;
  const savings = n * nonNeg(v.healthCostPerEmployee) * (nonNeg(v.healthSavings) / 100) + payroll * (nonNeg(v.wcSavingsPercent) / 100) + nonNeg(v.adminHoursSaved) * 12 * nonNeg(v.adminRate);
  return { annualPeoFee: round2(fee), feePerEmployeeMonth: round2(n ? fee / n / 12 : 0), feeAsPercentOfPayroll: round2(pctOf(fee, payroll)), estimatedSavings: round2(savings), netCost: round2(fee - savings), worthIt: savings >= fee ? 1 : 0 };
};

export const truckerPay: CustomCalculator = (v) => {
  const miles = nonNeg(v.milesPerWeek) * nonNeg(v.centsPerMile) / 100;
  const extras = nonNeg(v.stops) * nonNeg(v.stopPay) + nonNeg(v.detentionHours) * nonNeg(v.detentionRate) + nonNeg(v.weeklyBonus);
  const perDiem = nonNeg(v.daysOut) * nonNeg(v.perDiemRate);
  const gross = miles + extras;
  return { weeklyGrossPay: round2(gross + perDiem), mileagePay: round2(miles), accessorialPay: round2(extras), perDiemPay: round2(perDiem), annualPay: round2((gross + perDiem) * nonNeg(v.weeksPerYear, 50)), effectiveHourly: round2(nonNeg(v.hoursPerWeek) ? (gross + perDiem) / nonNeg(v.hoursPerWeek) : 0), taxableWeekly: round2(gross) };
};

export const costPerHire: CustomCalculator = (v) => {
  const internal = nonNeg(v.recruiterCosts) + nonNeg(v.hiringManagerTime) + nonNeg(v.referralBonuses) + nonNeg(v.internalOther);
  const external = nonNeg(v.jobBoards) + nonNeg(v.agencyFees) + nonNeg(v.backgroundChecks) + nonNeg(v.travel) + nonNeg(v.relocation) + nonNeg(v.tools) + nonNeg(v.externalOther);
  const hires = Math.max(1, nonNeg(v.hires, 1));
  return { costPerHire: round2((internal + external) / hires), totalRecruitingCost: round2(internal + external), internalCost: round2(internal), externalCost: round2(external), costAsPercentOfSalary: round2(pctOf((internal + external) / hires, nonNeg(v.averageSalary))) };
};

export const hrAnalyticsRoi: CustomCalculator = (v) => {
  const n = nonNeg(v.employees);
  const leavers = n * (nonNeg(v.turnoverRate) / 100);
  const avoided = leavers * (nonNeg(v.turnoverReduction) / 100);
  const turnoverSavings = avoided * nonNeg(v.averageSalary) * (nonNeg(v.costPerLeaverPercent, 33) / 100);
  const productivity = n * nonNeg(v.averageSalary) * (nonNeg(v.productivityGain) / 100);
  const hrTime = nonNeg(v.hrHoursSavedPerMonth) * 12 * nonNeg(v.hrHourlyRate);
  const benefit = turnoverSavings + productivity + hrTime;
  const cost = nonNeg(v.annualCost) + nonNeg(v.implementation) / 3;
  return { annualBenefit: round2(benefit), roiPercent: round2(pctOf(benefit - cost, cost)), netAnnualValue: round2(benefit - cost), turnoverSavings: round2(turnoverSavings), leaversAvoided: round2(avoided), productivityValue: round2(productivity), paybackMonths: round2(benefit > nonNeg(v.annualCost) ? (nonNeg(v.implementation) / (benefit - nonNeg(v.annualCost))) * 12 : 0) };
};

export const compReview: CustomCalculator = (v) => {
  const n = nonNeg(v.employees);
  const payroll = n * nonNeg(v.averageSalary);
  const merit = payroll * (nonNeg(v.meritPercent) / 100);
  const promos = n * (nonNeg(v.promotionShare) / 100) * nonNeg(v.averageSalary) * (nonNeg(v.promotionIncrease) / 100);
  const total = merit + promos + nonNeg(v.marketAdjustments);
  const burden = total * (nonNeg(v.burdenPercent, 20) / 100);
  return { totalIncreaseCost: round2(total), totalWithBurden: round2(total + burden), increaseAsPercentOfPayroll: round2(pctOf(total, payroll)), meritCost: round2(merit), promotionCost: round2(promos), newPayroll: round2(payroll + total), averageRaisePerEmployee: round2(n ? total / n : 0) };
};

export const onboardingRoi: CustomCalculator = (v) => {
  const hires = nonNeg(v.hiresPerYear);
  const sal = nonNeg(v.averageSalary);
  const rampSaving = hires * (sal / 12) * Math.max(0, nonNeg(v.currentRampMonths) - nonNeg(v.improvedRampMonths)) * 0.5;
  const turnoverSaving = hires * (Math.max(0, nonNeg(v.currentEarlyTurnover) - nonNeg(v.improvedEarlyTurnover)) / 100) * sal * (nonNeg(v.costPerLeaverPercent, 33) / 100);
  const benefit = rampSaving + turnoverSaving;
  const cost = nonNeg(v.programCost);
  return { annualBenefit: round2(benefit), roiPercent: round2(pctOf(benefit - cost, cost)), netValue: round2(benefit - cost), fasterRampValue: round2(rampSaving), retentionValue: round2(turnoverSaving), benefitPerHire: round2(hires ? benefit / hires : 0) };
};

export const payEquity: CustomCalculator = (v) => {
  const s = nonNeg(v.salary);
  const mid = nonNeg(v.rangeMid);
  const min = nonNeg(v.rangeMin);
  const max = nonNeg(v.rangeMax);
  const a = nonNeg(v.groupAAverage);
  const b = nonNeg(v.groupBAverage);
  return { compaRatio: round2(mid ? s / mid : 0), rangePenetrationPercent: round2(max > min ? ((s - min) / (max - min)) * 100 : 0), gapToMidpoint: round2(mid - s), increaseToMidPercent: round2(pctOf(mid - s, s)), groupPayGapPercent: round2(pctOf(a - b, a)), belowRange: s < min ? 1 : 0 };
};

export const procurement: CustomCalculator = (v) => {
  const spend = nonNeg(v.addressableSpend);
  const negotiated = spend * (nonNeg(v.savingsRate) / 100);
  const realized = negotiated * (nonNeg(v.realization, 70) / 100);
  const cost = nonNeg(v.teamCost) + nonNeg(v.softwareCost);
  const net = realized - cost;
  return { netAnnualSavings: round2(net), realizedSavings: round2(realized), negotiatedSavings: round2(negotiated), roiPercent: round2(pctOf(net, cost)), equivalentRevenue: round2(nonNeg(v.profitMargin) ? net / (nonNeg(v.profitMargin) / 100) : 0), savingsPercentOfSpend: round2(pctOf(realized, spend)) };
};

export function erlangC(N: number, A: number) {
  if (N <= A) return 1;
  let b = 1;
  for (let k = 1; k <= N; k++) b = (A * b) / (k + A * b);
  return b / (1 - (A / N) * (1 - b));
}
export const callCenter: CustomCalculator = (v) => {
  const aht = Math.max(1, nonNeg(v.ahtSeconds, 300));
  const A = (nonNeg(v.callsPerHour) * aht) / 3600;
  const T = nonNeg(v.targetSeconds, 20);
  const target = Math.min(0.999, nonNeg(v.serviceLevel, 80) / 100);
  let N = Math.max(1, Math.floor(A) + 1);
  let pw = erlangC(N, A);
  let sl = 1 - pw * Math.exp((-(N - A) * T) / aht);
  while (sl < target && N < 10000) { N++; pw = erlangC(N, A); sl = 1 - pw * Math.exp((-(N - A) * T) / aht); }
  const shrink = Math.min(0.9, nonNeg(v.shrinkage, 30) / 100);
  return { agentsOnPhones: N, agentsScheduled: ceil(N / (1 - shrink)), serviceLevelPercent: round2(sl * 100), averageSpeedOfAnswerSec: round2(N > A ? (pw * aht) / (N - A) : 0), occupancyPercent: round2((A / N) * 100), trafficErlangs: round2(A), probabilityOfWaitPercent: round2(pw * 100) };
};

export const onCallPay: CustomCalculator = (v) => {
  const base = nonNeg(v.baseRate);
  const standby = nonNeg(v.onCallHours) * (pick(v.standbyMode, 2) === 0 ? nonNeg(v.standbyRate) : base * (nonNeg(v.standbyPercent) / 100));
  const callbackHours = nonNeg(v.callbacks) * Math.max(nonNeg(v.minimumHours, 2), nonNeg(v.avgCallbackHours));
  const callbackPay = callbackHours * base * nonNeg(v.callbackMultiplier, 1.5);
  return { totalOnCallPay: round2(standby + callbackPay), standbyPay: round2(standby), callbackPay: round2(callbackPay), paidCallbackHours: round2(callbackHours), effectiveRatePerOnCallHour: round2(nonNeg(v.onCallHours) ? (standby + callbackPay) / nonNeg(v.onCallHours) : 0) };
};

export const engagementCost: CustomCalculator = (v) => {
  const n = nonNeg(v.employees);
  const sal = nonNeg(v.averageSalary);
  const active = n * (nonNeg(v.activelyDisengaged, 17) / 100) * sal * 0.18;
  const notEngaged = n * (nonNeg(v.notEngaged, 50) / 100) * sal * (nonNeg(v.notEngagedCost, 9) / 100);
  const cost = active + notEngaged;
  return { annualDisengagementCost: round2(cost), activelyDisengagedCost: round2(active), notEngagedCost: round2(notEngaged), costPerEmployee: round2(n ? cost / n : 0), savingsFromImprovement: round2(cost * (nonNeg(v.improvement) / 100)), percentOfPayroll: round2(pctOf(cost, n * sal)) };
};

export const biweeklySchedule: CustomCalculator = (v) => {
  const first = safeNumber(v.firstPayDate, today());
  const year = Math.round(nonNeg(v.year, 2026));
  const start = Math.round(Date.UTC(year, 0, 1) / DAY);
  const end = Math.round(Date.UTC(year + 1, 0, 1) / DAY);
  let d = first + Math.ceil((start - first) / 14) * 14;
  const pays: number[] = [];
  for (; d < end; d += 14) if (d >= start) pays.push(d);
  const byMonth = new Map<number, number[]>();
  pays.forEach((p) => { const m = new Date(p * DAY).getUTCMonth(); byMonth.set(m, [...(byMonth.get(m) ?? []), p]); });
  const three = [...byMonth.values()].filter((a) => a.length >= 3).map((a) => a[2]);
  const t = today();
  const next = first + Math.max(0, Math.ceil((t - first) / 14)) * 14;
  return { paydaysInYear: pays.length, firstPaydayOfYear: pays[0] ?? 0, lastPaydayOfYear: pays[pays.length - 1] ?? 0, nextPayday: next, firstThreePaycheckMonthDate: three[0] ?? 0, secondThreePaycheckMonthDate: three[1] ?? 0, grossPerPaycheck: round2(pays.length ? nonNeg(v.annualSalary) / (pick(v.divisor, 2) === 0 ? 26 : pays.length) : 0) };
};

export const ltip: CustomCalculator = (v) => {
  const years = Math.max(1, Math.round(nonNeg(v.vestYears, 3)));
  const growth = nonNeg(v.annualGrowth) / 100;
  const priceAtVest = nonNeg(v.sharePrice) * Math.pow(1 + growth, years);
  const units = pick(v.grantType, 3) === 2 ? nonNeg(v.units) : nonNeg(v.grantValue) > 0 && nonNeg(v.sharePrice) > 0 ? nonNeg(v.grantValue) / nonNeg(v.sharePrice) : nonNeg(v.units);
  const mult = pick(v.grantType, 3) === 1 ? nonNeg(v.performanceMultiplier, 100) / 100 : 1;
  const value = pick(v.grantType, 3) === 2 ? units * Math.max(0, priceAtVest - nonNeg(v.strikePrice)) : units * mult * priceAtVest;
  return { valueAtVest: round2(value), grantDateValue: round2(pick(v.grantType, 3) === 2 ? units * Math.max(0, nonNeg(v.sharePrice) - nonNeg(v.strikePrice)) : units * nonNeg(v.sharePrice)), annualizedValue: round2(value / years), unitsVesting: round2(units * mult), projectedSharePrice: round2(priceAtVest), estimatedTax: round2(value * (nonNeg(v.taxRate) / 100)) };
};

// --- Operations ----------------------------------------------------------------------------------------------
export const b2bEcommerce: CustomCalculator = (v) => {
  const rev = nonNeg(v.b2bRevenue);
  const online = rev * (nonNeg(v.shareOnline) / 100);
  const lift = online * (nonNeg(v.revenueLift) / 100);
  const profitLift = lift * (nonNeg(v.grossMargin) / 100);
  const orders = nonNeg(v.ordersPerYear) * (nonNeg(v.shareOnline) / 100);
  const processing = orders * Math.max(0, nonNeg(v.offlineOrderCost) - nonNeg(v.onlineOrderCost));
  const salesTime = nonNeg(v.repHoursSaved) * nonNeg(v.repRate);
  const benefit = profitLift + processing + salesTime;
  const yearly = nonNeg(v.platformAnnual);
  const net3 = benefit * 3 - yearly * 3 - nonNeg(v.implementation);
  return { annualBenefit: round2(benefit), threeYearNet: round2(net3), threeYearRoiPercent: round2(pctOf(net3, yearly * 3 + nonNeg(v.implementation))), paybackMonths: round2(benefit > yearly ? (nonNeg(v.implementation) / (benefit - yearly)) * 12 : 0), incrementalGrossProfit: round2(profitLift), orderProcessingSavings: round2(processing), salesTimeSavings: round2(salesTime) };
};

export const KITCHEN_TIERS: [string, number][] = [["Basic / quick service", 150], ["Full-service restaurant", 250], ["High-volume / fine dining", 400], ["Ghost / commissary kitchen", 180]];
export const commercialKitchen: CustomCalculator = (v) => {
  const base = nonNeg(v.sqFt) * KITCHEN_TIERS[pick(v.tier, KITCHEN_TIERS.length)][1] * (1 + safeNumber(v.regionAdjust) / 100);
  const hood = nonNeg(v.hoodFeet) * nonNeg(v.hoodPerFoot, 1500);
  const extras = (yes(v.walkIn) ? nonNeg(v.walkInCost) : 0) + (yes(v.greaseInterceptor) ? 8000 : 0) + nonNeg(v.permitsDesign);
  const total = base + hood + extras;
  return { totalCost: round2(total), buildOutAndEquipment: round2(base), hoodSystem: round2(hood), extras: round2(extras), costPerSqFt: round2(nonNeg(v.sqFt) ? total / nonNeg(v.sqFt) : 0), lowEstimate: round2(total * 0.75), highEstimate: round2(total * 1.4) };
};

export const portableRestroom: CustomCalculator = (v) => {
  let units: number;
  if (pick(v.mode, 2) === 0) {
    units = (nonNeg(v.guests) / 50) * Math.max(1, nonNeg(v.hours, 4) / 4);
    if (yes(v.alcohol)) units *= 1.2;
    if (nonNeg(v.womenShare, 50) > 50) units *= 1 + (nonNeg(v.womenShare) - 50) / 250;
  } else {
    const w = nonNeg(v.workers);
    units = w <= 20 ? 1 : w / 40 + 0.5;
    units *= Math.max(1, nonNeg(v.hoursPerWeek, 40) / 40);
  }
  const total = Math.max(1, ceil(units));
  const ada = Math.max(1, ceil(total * 0.05));
  const sinks = Math.max(1, ceil(total / 10));
  const cost = (total * nonNeg(v.unitPrice) + ada * Math.max(0, nonNeg(v.adaPrice) - nonNeg(v.unitPrice)) + sinks * nonNeg(v.sinkPrice)) * Math.max(1, nonNeg(v.rentalPeriods, 1));
  return { unitsNeeded: total, adaUnits: ada, handwashStations: sinks, rentalCost: round2(cost), guestsPerUnit: round2(pick(v.mode, 2) === 0 ? nonNeg(v.guests) / total : nonNeg(v.workers) / total) };
};

/** Space per guest (sq ft) by layout. */
export const LAYOUTS: [string, number, number][] = [["Standing reception / cocktail", 8, 5], ["Theater (rows of chairs)", 9, 7], ["Banquet (60 in rounds)", 12, 15], ["Classroom (tables)", 18, 15], ["Conference / boardroom", 25, 15], ["Cabaret (rounds, one side open)", 15, 15]];
export const eventSpace: CustomCalculator = (v) => {
  const [, perGuest, codeFactor] = LAYOUTS[pick(v.layout, LAYOUTS.length)];
  const net = Math.max(0, nonNeg(v.sqFt) - nonNeg(v.stage) - nonNeg(v.danceFloor) - nonNeg(v.buffetBar));
  const comfortable = Math.floor(net / perGuest);
  const code = Math.floor(nonNeg(v.sqFt) / codeFactor);
  return { comfortableCapacity: comfortable, fireCodeMaximum: code, recommendedCapacity: Math.min(comfortable, code), netUsableSqFt: round2(net), sqFtNeededForGuests: round2(nonNeg(v.guests) * perGuest + nonNeg(v.stage) + nonNeg(v.danceFloor) + nonNeg(v.buffetBar)), fits: nonNeg(v.guests) <= Math.min(comfortable, code) ? 1 : 0 };
};

export const OFFICE_STYLES: [string, number][] = [["Open plan / benching", 125], ["Mixed (open + some offices)", 175], ["Mostly private offices", 250], ["Hybrid (desk sharing 0.7)", 110]];
export const officeSpace: CustomCalculator = (v) => {
  const people = nonNeg(v.employees) * (1 + nonNeg(v.growth) / 100);
  const usable = people * OFFICE_STYLES[pick(v.style, OFFICE_STYLES.length)][1] + nonNeg(v.meetingRooms) * 250 + nonNeg(v.extraSqFt);
  const rentable = usable * (1 + nonNeg(v.loadFactor, 15) / 100);
  const rent = rentable * nonNeg(v.rentPerSqFtYear);
  return { usableSqFt: round2(usable), rentableSqFt: round2(rentable), annualRent: round2(rent), monthlyRent: round2(rent / 12), sqFtPerPerson: round2(people ? rentable / people : 0), plannedHeadcount: round2(people) };
};

export const officeSupplies: CustomCalculator = (v) => {
  const n = nonNeg(v.employees);
  const general = n * nonNeg(v.suppliesPerEmployeeYear);
  const printing = n * nonNeg(v.pagesPerEmployeeMonth) * 12 * nonNeg(v.costPerPage);
  const breakroom = n * nonNeg(v.breakroomPerEmployeeMonth) * 12;
  const total = general + printing + breakroom + nonNeg(v.otherAnnual);
  return { annualBudget: round2(total), monthlyBudget: round2(total / 12), perEmployeeYear: round2(n ? total / n : 0), generalSupplies: round2(general), printing: round2(printing), breakroom: round2(breakroom) };
};

export const CDN_TIERS: [number, number][] = [[10240, 0.085], [40960, 0.08], [102400, 0.06], [358400, 0.04], [Infinity, 0.03]];
export const cdnCost: CustomCalculator = (v) => {
  let gb = nonNeg(v.tbPerMonth) * 1024;
  const total = gb;
  let transfer = 0;
  for (const [size, rate] of CDN_TIERS) { const chunk = Math.min(gb, size); transfer += chunk * rate; gb -= chunk; if (gb <= 0) break; }
  transfer *= 1 + safeNumber(v.priceAdjust) / 100;
  const requests = nonNeg(v.millionRequests) * nonNeg(v.pricePerMillionRequests, 1);
  const monthly = transfer + requests + nonNeg(v.fixedMonthly);
  return { monthlyCost: round2(monthly), annualCost: round2(monthly * 12), dataTransferCost: round2(transfer), requestCost: round2(requests), effectivePerGb: total ? Math.round((transfer / total) * 10000) / 10000 : 0, totalGb: round2(total) };
};

export const elr: CustomCalculator = (v) => {
  const sales = nonNeg(v.laborSales);
  const billed = nonNeg(v.billedHours);
  const elrRate = billed ? sales / billed : 0;
  return { effectiveLaborRate: round2(elrRate), rateRealizationPercent: round2(pctOf(elrRate, nonNeg(v.postedRate))), lostPerHour: round2(nonNeg(v.postedRate) - elrRate), monthlyRevenueGap: round2((nonNeg(v.postedRate) - elrRate) * billed), technicianEfficiencyPercent: round2(pctOf(billed, nonNeg(v.clockedHours))), grossProfitPerBilledHour: round2(billed ? (sales - nonNeg(v.techPayroll)) / billed : 0) };
};

export const spaRevenue: CustomCalculator = (v) => {
  const rooms = nonNeg(v.rooms);
  const hours = rooms * nonNeg(v.hoursPerDay) * nonNeg(v.daysPerWeek) * 4.33;
  const treatments = (hours * (nonNeg(v.utilization) / 100)) / Math.max(0.25, nonNeg(v.serviceHours, 1.25));
  const service = treatments * nonNeg(v.averageTicket);
  const retail = treatments * (nonNeg(v.retailAttach) / 100) * nonNeg(v.averageRetail);
  const total = service + retail;
  return { monthlyRevenue: round2(total), annualRevenue: round2(total * 12), serviceRevenue: round2(service), retailRevenue: round2(retail), treatmentsPerMonth: round2(treatments), revenuePerRoomMonth: round2(rooms ? total / rooms : 0), revenuePerAvailableHour: round2(hours ? total / hours : 0) };
};

export const compPlan: CustomCalculator = (v) => {
  const base = nonNeg(v.baseSalary);
  const variable = Math.max(0, nonNeg(v.ote) - base);
  const quota = Math.max(1, nonNeg(v.quota));
  const att = nonNeg(v.attainment) / 100;
  const rate = variable / quota;
  const sales = quota * att;
  let commission: number;
  if (att <= 1) commission = att < nonNeg(v.threshold) / 100 ? 0 : sales * rate;
  else commission = quota * rate + (sales - quota) * rate * nonNeg(v.accelerator, 1.5);
  const pay = base + commission;
  return { totalPay: round2(pay), commission: round2(commission), commissionRatePercent: round2(rate * 100), payMix: round2(pctOf(base, nonNeg(v.ote))), costOfSalesPercent: round2(pctOf(pay, sales)), salesClosed: round2(sales), quotaToOteRatio: round2(nonNeg(v.ote) ? quota / nonNeg(v.ote) : 0) };
};

export const parLevel: CustomCalculator = (v) => {
  const use = nonNeg(v.dailyUsage);
  const par = use * (nonNeg(v.daysBetweenDeliveries) + nonNeg(v.leadTimeDays)) * (1 + nonNeg(v.safetyStock, 20) / 100);
  const order = Math.max(0, par - nonNeg(v.onHand));
  return { parLevel: ceil(par), orderQuantity: ceil(order), casesToOrder: ceil(order / Math.max(1, nonNeg(v.unitsPerCase, 1))), daysOfStockOnHand: round2(use ? nonNeg(v.onHand) / use : 0), orderValue: round2(ceil(order) * nonNeg(v.unitCost)) };
};

export const saasTco: CustomCalculator = (v) => {
  const years = Math.max(1, Math.round(nonNeg(v.years, 3)));
  let subs = 0;
  let price = nonNeg(v.pricePerUserMonth);
  for (let y = 0; y < years; y++) { subs += price * nonNeg(v.users) * 12; price *= 1 + nonNeg(v.renewalIncrease) / 100; }
  const oneTime = nonNeg(v.implementation) + nonNeg(v.training) + nonNeg(v.integration) + nonNeg(v.migration);
  const admin = nonNeg(v.adminFteShare) / 100 * nonNeg(v.adminSalary) * years;
  const total = subs + oneTime + admin + nonNeg(v.addOnsAnnual) * years;
  return { totalCostOfOwnership: round2(total), subscriptionCost: round2(subs), oneTimeCosts: round2(oneTime), adminCost: round2(admin), perUserPerMonth: round2(nonNeg(v.users) ? total / nonNeg(v.users) / (years * 12) : 0), annualAverage: round2(total / years) };
};

export const itSupport: CustomCalculator = (v) => {
  const users = nonNeg(v.users);
  const staff = Math.max(users > 0 ? 1 : 0, ceil(users / Math.max(10, nonNeg(v.usersPerTech, 70))));
  const inHouse = staff * nonNeg(v.itSalary) * (1 + nonNeg(v.benefitsPercent, 30) / 100) + users * nonNeg(v.toolsPerUserYear) + nonNeg(v.otherInHouse);
  const msp = users * nonNeg(v.mspPerUserMonth) * 12 + users * nonNeg(v.toolsPerUserYear) * (nonNeg(v.mspIncludesTools) ? 0 : 1) + nonNeg(v.projectsAnnual);
  return { inHouseAnnual: round2(inHouse), mspAnnual: round2(msp), itStaffNeeded: staff, savingsWithMsp: round2(inHouse - msp), inHousePerUserMonth: round2(users ? inHouse / users / 12 : 0), betterOption: msp <= inHouse ? 2 : 1 };
};

// --- Marketing -------------------------------------------------------------------------------------------------
export const PLATFORM_RATE: [string, number][] = [["Instagram", 10], ["TikTok", 8], ["YouTube", 20], ["Facebook", 7], ["X / Twitter", 4], ["LinkedIn", 15]];
export const influencer: CustomCalculator = (v) => {
  const followers = nonNeg(v.followers);
  const posts = Math.max(1, nonNeg(v.posts, 1));
  const estFee = (followers / 1000) * PLATFORM_RATE[pick(v.platform, PLATFORM_RATE.length)][1];
  const fee = (nonNeg(v.feePerPost) > 0 ? nonNeg(v.feePerPost) : estFee) * posts + nonNeg(v.productCost);
  const reach = followers * (nonNeg(v.reachRate, 30) / 100) * posts;
  const engagements = followers * (nonNeg(v.engagementRate) / 100) * posts;
  const clicks = reach * (nonNeg(v.ctr) / 100);
  const orders = clicks * (nonNeg(v.conversionRate) / 100);
  const revenue = orders * nonNeg(v.aov);
  return { campaignCost: round2(fee), estimatedFeePerPost: round2(estFee), reach: Math.round(reach), engagements: Math.round(engagements), costPerEngagement: round2(engagements ? fee / engagements : 0), orders: round2(orders), revenue: round2(revenue), roiPercent: round2(pctOf(revenue * (nonNeg(v.margin, 50) / 100) - fee, fee)) };
};

export const shareOfVoice: CustomCalculator = (v) => {
  const you = nonNeg(v.yourMentions);
  const total = you + nonNeg(v.competitor1) + nonNeg(v.competitor2) + nonNeg(v.competitor3) + nonNeg(v.competitor4) + nonNeg(v.others);
  const sov = pctOf(you, total);
  const esov = sov - nonNeg(v.marketShare);
  return { shareOfVoicePercent: round2(sov), excessShareOfVoice: round2(esov), predictedShareChangePerYear: round2((esov / 10) * 0.5), totalCategoryVoice: round2(total), leaderSharePercent: round2(pctOf(Math.max(you, nonNeg(v.competitor1), nonNeg(v.competitor2), nonNeg(v.competitor3), nonNeg(v.competitor4)), total)) };
};

export const facebookAds: CustomCalculator = (v) => {
  const budget = nonNeg(v.budget);
  const impressions = nonNeg(v.cpm) > 0 ? (budget / nonNeg(v.cpm)) * 1000 : 0;
  const clicks = impressions * (nonNeg(v.ctr) / 100);
  const conv = clicks * (nonNeg(v.conversionRate) / 100);
  const revenue = conv * nonNeg(v.aov);
  const profit = revenue * (nonNeg(v.margin) / 100) - budget;
  return { conversions: round2(conv), revenue: round2(revenue), roas: round2(budget ? revenue / budget : 0), costPerAcquisition: round2(conv ? budget / conv : 0), profit: round2(profit), impressions: Math.round(impressions), clicks: Math.round(clicks), costPerClick: round2(clicks ? budget / clicks : 0), breakEvenRoas: round2(nonNeg(v.margin) ? 100 / nonNeg(v.margin) : 0) };
};

export const overheadRate: CustomCalculator = (v) => {
  const oh = nonNeg(v.indirectCosts);
  const base = nonNeg(v.allocationBase);
  const rate = base ? oh / base : 0;
  const applied = rate * nonNeg(v.jobBaseUnits);
  return { overheadRate: round2(rate), overheadRatePercent: round2(rate * 100), appliedToJob: round2(applied), jobTotalCost: round2(applied + nonNeg(v.jobDirectCost)), overheadShareOfRevenue: round2(pctOf(oh, nonNeg(v.revenue))) };
};

export const tamSamSom: CustomCalculator = (v) => {
  const tam = nonNeg(v.totalCustomers) * nonNeg(v.annualValuePerCustomer);
  const sam = tam * (nonNeg(v.serviceablePercent) / 100);
  const som = sam * (nonNeg(v.obtainablePercent) / 100);
  return { tam: round2(tam), sam: round2(sam), som: round2(som), somCustomers: Math.round(nonNeg(v.totalCustomers) * (nonNeg(v.serviceablePercent) / 100) * (nonNeg(v.obtainablePercent) / 100)), somShareOfTamPercent: round2(pctOf(som, tam)) };
};

export const leadFunnel: CustomCalculator = (v) => {
  const deals = nonNeg(v.revenueGoal) / Math.max(1, nonNeg(v.dealSize, 1));
  const opps = deals / Math.max(0.0001, nonNeg(v.closeRate, 20) / 100);
  const sql = opps / Math.max(0.0001, nonNeg(v.sqlToOpp, 50) / 100);
  const leads = sql / Math.max(0.0001, nonNeg(v.leadToSql, 15) / 100);
  const visits = leads / Math.max(0.0001, nonNeg(v.visitToLead, 2) / 100);
  return { leadsNeeded: ceil(leads), dealsNeeded: ceil(deals), opportunitiesNeeded: ceil(opps), sqlsNeeded: ceil(sql), websiteVisitsNeeded: ceil(visits), marketingBudget: round2(ceil(leads) * nonNeg(v.costPerLead)), leadsPerMonth: ceil(leads / 12) };
};

export const ppcProfit: CustomCalculator = (v) => {
  const clicks = pick(v.mode, 2) === 0 ? (nonNeg(v.cpc) > 0 ? nonNeg(v.adSpend) / nonNeg(v.cpc) : 0) : nonNeg(v.clicks);
  const spend = clicks * nonNeg(v.cpc);
  const conv = clicks * (nonNeg(v.conversionRate) / 100);
  const revenue = conv * nonNeg(v.aov);
  const gp = revenue * (nonNeg(v.margin) / 100);
  const profit = gp - spend - nonNeg(v.managementFee);
  return { profit: round2(profit), revenue: round2(revenue), grossProfit: round2(gp), adSpend: round2(spend), conversions: round2(conv), roas: round2(spend ? revenue / spend : 0), roiPercent: round2(pctOf(profit, spend + nonNeg(v.managementFee))), breakEvenCpc: round2(nonNeg(v.aov) * (nonNeg(v.margin) / 100) * (nonNeg(v.conversionRate) / 100)), costPerConversion: round2(conv ? spend / conv : 0) };
};

export const WEB_TIERS: [string, number][] = [["Template / DIY-level", 150], ["Custom design (small business)", 450], ["Premium custom", 900], ["Enterprise", 1800]];
export const websitePrice: CustomCalculator = (v) => {
  const pages = nonNeg(v.pages);
  const design = Math.max(nonNeg(v.minimum), pages * WEB_TIERS[pick(v.tier, WEB_TIERS.length)][1]);
  const features = (yes(v.ecommerce) ? 4500 + nonNeg(v.products) * 15 : 0) + (yes(v.blog) ? 800 : 0) + (yes(v.booking) ? 1200 : 0) + (yes(v.multilingual) ? pages * 120 : 0) + nonNeg(v.customIntegrations) * 2500;
  const content = yes(v.copywriting) ? pages * nonNeg(v.copyPerPage, 150) : 0;
  const seo = yes(v.seoSetup) ? 1200 : 0;
  const total = design + features + content + seo;
  return { projectPrice: round2(total), designAndBuild: round2(design), features: round2(features), copywriting: round2(content), seoSetup: seo, monthlyMaintenance: round2(nonNeg(v.maintenanceMonthly)), firstYearTotal: round2(total + nonNeg(v.maintenanceMonthly) * 12 + nonNeg(v.hostingAnnual)) };
};

export const engagementRate: CustomCalculator = (v) => {
  const eng = nonNeg(v.likes) + nonNeg(v.comments) + nonNeg(v.shares) + nonNeg(v.saves);
  const f = nonNeg(v.followers);
  const er = pctOf(eng, f);
  const bench = f < 10000 ? 4 : f < 100000 ? 2.4 : f < 1000000 ? 1.7 : 1.1;
  return { engagementRatePercent: round2(er), engagementByReachPercent: round2(pctOf(eng, nonNeg(v.reach))), totalEngagements: Math.round(eng), benchmarkPercent: bench, aboveBenchmark: er >= bench ? 1 : 0, commentToLikeRatio: round2(nonNeg(v.likes) ? nonNeg(v.comments) / nonNeg(v.likes) : 0) };
};

export const footTraffic: CustomCalculator = (v) => {
  const visitors = pick(v.mode, 2) === 0 ? nonNeg(v.visitorsPerDay) : nonNeg(v.passersbyPerDay) * (nonNeg(v.captureRate) / 100);
  const buyers = visitors * (nonNeg(v.conversionRate) / 100);
  const daily = buyers * nonNeg(v.averageTransaction);
  const needed = nonNeg(v.monthlyGoal) > 0 && nonNeg(v.conversionRate) > 0 && nonNeg(v.averageTransaction) > 0 ? nonNeg(v.monthlyGoal) / nonNeg(v.daysOpen, 30) / nonNeg(v.averageTransaction) / (nonNeg(v.conversionRate) / 100) : 0;
  return { dailySales: round2(daily), monthlySales: round2(daily * nonNeg(v.daysOpen, 30)), visitorsPerDay: round2(visitors), buyersPerDay: round2(buyers), salesPerVisitor: round2(visitors ? daily / visitors : 0), visitorsNeededForGoal: ceil(needed), salesPerSqFtYear: round2(nonNeg(v.sqFt) ? (daily * nonNeg(v.daysOpen, 30) * 12) / nonNeg(v.sqFt) : 0) };
};

/** UAE setup (AED): [label, license, establishment card, per-visa cost, office default]. */
export const UAE_TYPES: [string, number, number, number, number][] = [["Free zone (package)", 14000, 2000, 4500, 0], ["Mainland (DED / DET) LLC", 25000, 2500, 5000, 20000], ["Offshore (RAK ICC / JAFZA)", 12000, 0, 0, 0]];
export const uaeSetup: CustomCalculator = (v) => {
  const [, lic, est, visa, office] = UAE_TYPES[pick(v.jurisdiction, UAE_TYPES.length)];
  const visas = pick(v.jurisdiction, UAE_TYPES.length) === 2 ? 0 : nonNeg(v.visas);
  const officeCost = nonNeg(v.officeRent) > 0 ? nonNeg(v.officeRent) : office;
  const first = lic + est + visas * visa + officeCost + nonNeg(v.pro) + nonNeg(v.bankAndOther);
  const renewal = lic * 0.9 + est * 0.5 + officeCost + visas * visa * 0.35;
  const fx = Math.max(0.1, nonNeg(v.aedPerUsd, 3.6725));
  return { firstYearAed: round2(first), firstYearUsd: round2(first / fx), annualRenewalAed: round2(renewal), annualRenewalUsd: round2(renewal / fx), licenseAed: lic, visaCostsAed: round2(visas * visa), officeAed: round2(officeCost) };
};

export const rpaRoi: CustomCalculator = (v) => {
  const processes = Math.max(1, nonNeg(v.processes, 1));
  const hours = processes * nonNeg(v.hoursPerMonth) * 12 * (nonNeg(v.automatable, 80) / 100);
  const savings = hours * nonNeg(v.hourlyCost) + nonNeg(v.errorSavings);
  const yearly = nonNeg(v.botLicenses) * nonNeg(v.licensePerBot) + processes * nonNeg(v.developmentPerProcess) * (nonNeg(v.maintenancePercent, 20) / 100);
  const upfront = processes * nonNeg(v.developmentPerProcess) + nonNeg(v.platformSetup);
  const net = savings - yearly;
  return { annualNetSavings: round2(net), hoursFreedPerYear: round2(hours), fteEquivalent: round2(hours / 1800), upfrontCost: round2(upfront), annualRunningCost: round2(yearly), paybackMonths: round2(net > 0 ? (upfront / net) * 12 : 0), threeYearRoiPercent: round2(pctOf(net * 3 - upfront, upfront + yearly * 3)) };
};

export const advocacy: CustomCalculator = (v) => {
  const sharesPerMonth = nonNeg(v.participants) * nonNeg(v.sharesPerMonth);
  const reach = sharesPerMonth * nonNeg(v.averageNetwork) * (nonNeg(v.organicReach, 5) / 100);
  const engagements = reach * (nonNeg(v.engagementRate, 2) / 100);
  const clicks = reach * (nonNeg(v.ctr, 1) / 100);
  const emv = (reach / 1000) * nonNeg(v.equivalentCpm, 12);
  const leads = clicks * (nonNeg(v.leadRate) / 100);
  const value = emv * 12 + leads * 12 * nonNeg(v.valuePerLead);
  const cost = nonNeg(v.programCostAnnual);
  return { annualValue: round2(value), monthlyReach: Math.round(reach), monthlyEngagements: Math.round(engagements), monthlyClicks: Math.round(clicks), earnedMediaValueAnnual: round2(emv * 12), leadsPerYear: round2(leads * 12), roiPercent: round2(pctOf(value - cost, cost)) };
};

export const rfidRoi: CustomCalculator = (v) => {
  const inv = nonNeg(v.inventoryValue);
  const shrinkSave = inv * (nonNeg(v.shrinkRate) / 100) * (nonNeg(v.shrinkReduction) / 100);
  const labor = nonNeg(v.countHoursPerMonth) * 12 * (nonNeg(v.countTimeReduction, 80) / 100) * nonNeg(v.laborRate);
  const sales = nonNeg(v.annualSales) * (nonNeg(v.stockoutSalesRecovered) / 100) * (nonNeg(v.margin) / 100);
  const benefit = shrinkSave + labor + sales;
  const tags = nonNeg(v.itemsTaggedPerYear) * nonNeg(v.tagCost);
  const upfront = nonNeg(v.hardware) + nonNeg(v.implementation);
  const annual = tags + nonNeg(v.softwareAnnual);
  const net = benefit - annual;
  return { annualNetBenefit: round2(net), grossAnnualBenefit: round2(benefit), shrinkSavings: round2(shrinkSave), laborSavings: round2(labor), recoveredSalesProfit: round2(sales), annualTagCost: round2(tags), paybackMonths: round2(net > 0 ? (upfront / net) * 12 : 0), threeYearRoiPercent: round2(pctOf(net * 3 - upfront, upfront + annual * 3)) };
};

export const bizOpsCustomCalculators: Record<string, CustomCalculator> = {
  "labor-burden-calculator": laborBurden,
  "restaurant-labor-cost-calculator": restaurantLabor,
  "hvac-labor-rate-calculator": hvacLaborRate,
  "outsourcing-cost-calculator": outsourcing,
  "eor-cost-calculator": eor,
  "peo-cost-calculator": peo,
  "truck-driver-mileage-pay-calculator": truckerPay,
  "cost-per-hire-calculator": costPerHire,
  "hr-analytics-roi-calculator": hrAnalyticsRoi,
  "annual-compensation-review-calculator": compReview,
  "employee-onboarding-roi-calculator": onboardingRoi,
  "internal-pay-equity-calculator": payEquity,
  "procurement-savings-calculator": procurement,
  "call-center-staffing-calculator": callCenter,
  "on-call-pay-calculator": onCallPay,
  "employee-engagement-calculator": engagementCost,
  "biweekly-pay-schedule-calculator": biweeklySchedule,
  "long-term-incentive-plan-calculator": ltip,
  "b2b-ecommerce-business-case-calculator": b2bEcommerce,
  "commercial-kitchen-cost-calculator": commercialKitchen,
  "portable-restroom-calculator": portableRestroom,
  "event-space-calculator": eventSpace,
  "office-space-calculator": officeSpace,
  "office-supply-budget-calculator": officeSupplies,
  "cdn-cost-calculator": cdnCost,
  "effective-labor-rate-calculator": elr,
  "spa-revenue-calculator": spaRevenue,
  "sales-compensation-plan-calculator": compPlan,
  "par-level-calculator": parLevel,
  "saas-tco-calculator": saasTco,
  "it-support-cost-calculator": itSupport,
  "influencer-marketing-calculator": influencer,
  "share-of-voice-calculator": shareOfVoice,
  "facebook-ads-calculator": facebookAds,
  "overhead-rate-calculator": overheadRate,
  "tam-sam-som-calculator": tamSamSom,
  "lead-generation-calculator": leadFunnel,
  "ppc-profit-calculator": ppcProfit,
  "website-design-price-calculator": websitePrice,
  "engagement-rate-calculator": engagementRate,
  "foot-traffic-calculator": footTraffic,
  "uae-business-setup-cost-calculator": uaeSetup,
  "rpa-roi-calculator": rpaRoi,
  "employee-advocacy-calculator": advocacy,
  "rfid-roi-calculator": rfidRoi,
};
