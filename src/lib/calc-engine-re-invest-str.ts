/**
 * Batch: "Real Estate Calculators" → Rental Property & Investment (5) and
 * Short-Term Rental & Airbnb (6) — 11 tools:
 *
 *  - realEstateWholesale: maximum allowable offer to the seller under the
 *    end buyer's rule (e.g. 70% of ARV − repairs) less your assignment fee.
 *  - landlordRent: rent to charge three ways — break-even on costs, cost +
 *    target cash flow, the 1% rule and market rent per square foot.
 *  - houseHacking: live in one unit (or room), rent the rest — your net
 *    housing cost vs renting, and cash flow once you move out.
 *  - irrRealEstate: levered IRR from yearly cash flows and an exit at a cap
 *    rate, with equity multiple and year-1 cash-on-cash.
 *  - buyToLetMortgage: UK BTL — max loan from the rent under the 125%/145%
 *    interest cover ratio at a stress rate and the LTV cap, the rent needed
 *    for a target loan, and SDLT with the 5% surcharge (covers "buy to let
 *    rent").
 *  - airbnbMortgage: DSCR short-term rental loan — haircut STR revenue vs
 *    PITIA, and the largest loan for a target DSCR.
 *  - airbnbPrice: nightly rate needed for a target profit after host fees,
 *    cleaning and fixed costs.
 *  - airbnbTax: lodging taxes plus income tax with the 14-day rule,
 *    personal-use proration and self-employment tax when services are
 *    substantial.
 *  - midtermRental: furnished 30+ day stays vs a long-term lease.
 *  - rentalArbitrage: lease a unit and host it — monthly profit, payback on
 *    setup costs and break-even occupancy.
 *  - rentVsAirbnb: long-term vs short-term on the same property.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-re-invest-str-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const yes = (v: number) => Math.round(safeNumber(v)) === 1;

/** Monthly principal & interest on a fully amortizing loan. */
function pmt(principal: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Loan a monthly P&I payment supports. */
function loanFromPayment(payment: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (payment <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + r, -n))) / r;
}

/** Balance left after `months` payments. */
function balanceAfter(principal: number, annualRatePct: number, years: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  const p = pmt(principal, annualRatePct, years);
  if (r === 0) return Math.max(0, principal - p * months);
  return Math.max(0, principal * Math.pow(1 + r, months) - (p * (Math.pow(1 + r, months) - 1)) / r);
}

const NIGHTS_PER_MONTH = 365 / 12;

export const realEstateWholesale: CustomCalculator = (v) => {
  const arv = nonNeg(v.arv);
  const repairs = nonNeg(v.repairCosts);
  const fee = nonNeg(v.assignmentFee);
  const buyerMax = (arv * nonNeg(v.buyerRulePercent, 70)) / 100 - repairs;
  const mao = buyerMax - fee - nonNeg(v.yourClosingCosts);
  const buyerCosts = (arv * nonNeg(v.buyerCostsPercent)) / 100;
  return {
    maxOfferToSeller: round2(Math.max(0, mao)),
    endBuyerPrice: round2(Math.max(0, buyerMax)),
    yourAssignmentFee: round2(fee),
    endBuyerProfit: round2(arv - buyerMax - repairs - buyerCosts),
    maoPercentOfArv: arv > 0 ? round2((Math.max(0, mao) / arv) * 100) : 0,
  };
};

export const landlordRent: CustomCalculator = (v) => {
  const fixed = nonNeg(v.mortgagePayment) + nonNeg(v.monthlyTaxInsurance) + nonNeg(v.monthlyHoa) + nonNeg(v.ownerPaidUtilities);
  const pct = (nonNeg(v.vacancyRate) + nonNeg(v.managementPercent) + nonNeg(v.maintenancePercent) + nonNeg(v.capexPercent)) / 100;
  const denom = Math.max(0.05, 1 - pct);
  const breakEven = fixed / denom;
  const target = (fixed + nonNeg(v.targetCashFlow)) / denom;
  const market = nonNeg(v.squareFeet) * nonNeg(v.marketRentPerSqFt);
  return {
    targetRent: round2(target),
    breakEvenRent: round2(breakEven),
    onePercentRuleRent: round2(nonNeg(v.propertyValue) * 0.01),
    marketRent: round2(market),
    cashFlowAtMarketRent: market > 0 ? round2(market * denom - fixed) : 0,
  };
};

export const houseHacking: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const down = (price * nonNeg(v.downPaymentPercent)) / 100;
  const loan = price - down;
  const pi = pmt(loan, nonNeg(v.interestRate), nonNeg(v.loanTerm, 30) || 30);
  const mi = loan / Math.max(1, price) > 0.8 ? (loan * nonNeg(v.mortgageInsuranceRate)) / 100 / 12 : 0;
  const piti = pi + mi + (price * nonNeg(v.propertyTaxRate)) / 100 / 12 + nonNeg(v.annualInsurance) / 12;
  const rentIn = nonNeg(v.rentFromOtherUnits) * (1 - nonNeg(v.vacancyRate) / 100);
  const upkeep = (nonNeg(v.rentFromOtherUnits) + nonNeg(v.rentForYourUnit)) * (nonNeg(v.maintenancePercent) / 100) + nonNeg(v.ownerPaidUtilities);
  const net = piti + upkeep - rentIn;
  const allRent = (nonNeg(v.rentFromOtherUnits) + nonNeg(v.rentForYourUnit)) * (1 - nonNeg(v.vacancyRate) / 100);
  return {
    yourNetHousingCost: round2(net),
    savingsVsRenting: round2(nonNeg(v.currentRent) - net),
    totalMonthlyPayment: round2(piti),
    rentalIncomeAfterVacancy: round2(rentIn),
    cashFlowAfterYouMoveOut: round2(allRent - piti - upkeep),
    downPayment: round2(down),
    rentCoversPayment: piti > 0 ? round2((rentIn / piti) * 100) : 0,
  };
};

function irr(flows: number[]): number {
  const npv = (r: number) => flows.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
  let lo = -0.99;
  let hi = 10;
  if (npv(lo) * npv(hi) > 0) return 0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export const irrRealEstate: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const closing = nonNeg(v.closingCosts);
  const downPct = nonNeg(v.downPaymentPercent) / 100;
  const loan = price * (1 - downPct);
  const rate = nonNeg(v.interestRate);
  const term = nonNeg(v.loanTerm, 30) || 30;
  const debt = pmt(loan, rate, term) * 12;
  const years = Math.max(1, Math.round(nonNeg(v.holdYears, 5)));
  const g = nonNeg(v.noiGrowth) / 100;
  const noi1 = nonNeg(v.yearOneNoi);
  const exitCap = nonNeg(v.exitCapRate) / 100;
  const equity = price * downPct + closing;
  const flows = [-equity];
  const unlev = [-(price + closing)];
  let total = 0;
  for (let y = 1; y <= years; y++) {
    const noi = noi1 * Math.pow(1 + g, y - 1);
    let cf = noi - debt;
    let ucf = noi;
    if (y === years) {
      const sale = exitCap > 0 ? (noi1 * Math.pow(1 + g, years)) / exitCap : price;
      const net = sale * (1 - nonNeg(v.sellingCostPercent) / 100);
      cf += net - balanceAfter(loan, rate, term, years * 12);
      ucf += net;
    }
    flows.push(cf);
    unlev.push(ucf);
    total += cf;
  }
  return {
    leveredIrr: round2(irr(flows) * 100),
    unleveredIrr: round2(irr(unlev) * 100),
    equityMultiple: equity > 0 ? round2(total / equity) : 0,
    totalProfit: round2(total - equity),
    yearOneCashOnCash: equity > 0 ? round2(((noi1 - debt) / equity) * 100) : 0,
    equityInvested: round2(equity),
  };
};

// England & NI residential SDLT from 1 April 2025, plus the 5% higher-rates surcharge (from 31 Oct 2024).
const SDLT: [number, number][] = [[125_000, 0], [250_000, 2], [925_000, 5], [1_500_000, 10], [Infinity, 12]];
function sdlt(price: number, surcharge: number): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of SDLT) {
    if (price <= lower) break;
    tax += ((Math.min(price, upper) - lower) * (rate + surcharge)) / 100;
    lower = upper;
  }
  return tax;
}

export const buyToLetMortgage: CustomCalculator = (v) => {
  const price = nonNeg(v.propertyPrice);
  const rent = nonNeg(v.monthlyRent);
  const icr = yes(v.higherRateTaxpayer) ? 1.45 : 1.25;
  const stress = Math.max(nonNeg(v.stressRate), nonNeg(v.interestRate));
  const maxByRent = stress > 0 ? (rent * 12) / (icr * (stress / 100)) : 0;
  const maxByLtv = (price * nonNeg(v.maxLtv, 75)) / 100;
  const loan = Math.min(maxByRent, maxByLtv);
  const wanted = nonNeg(v.loanWanted) > 0 ? nonNeg(v.loanWanted) : maxByLtv;
  return {
    maxLoan: round2(loan),
    maxLoanFromRent: round2(maxByRent),
    maxLoanFromLtv: round2(maxByLtv),
    rentNeededForLoan: round2((wanted * icr * (stress / 100)) / 12),
    interestOnlyPayment: round2((loan * nonNeg(v.interestRate)) / 100 / 12),
    depositNeeded: round2(price - loan),
    stampDuty: round2(sdlt(price, yes(v.companyOrAdditional) ? 5 : 0)),
  };
};

export const airbnbMortgage: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const loan = price * (1 - nonNeg(v.downPaymentPercent) / 100);
  const rate = nonNeg(v.interestRate);
  const term = nonNeg(v.loanTerm, 30) || 30;
  const carry = nonNeg(v.monthlyTaxes) + nonNeg(v.monthlyInsurance) + nonNeg(v.monthlyHoa);
  const pitia = pmt(loan, rate, term) + carry;
  const qualifying = (nonNeg(v.projectedRevenue) * (nonNeg(v.lenderHaircut, 80) / 100)) / 12;
  const target = nonNeg(v.targetDscr, 1) || 1;
  const maxLoan = loanFromPayment(Math.max(0, qualifying / target - carry), rate, term);
  const expenses = (nonNeg(v.projectedRevenue) / 12) * (nonNeg(v.operatingExpensePercent) / 100);
  return {
    dscr: pitia > 0 ? round2(qualifying / pitia) : 0,
    monthlyPitia: round2(pitia),
    qualifyingMonthlyIncome: round2(qualifying),
    meetsTargetDscr: pitia > 0 && qualifying / pitia >= target ? 1 : 0,
    maxLoanAtTargetDscr: round2(maxLoan),
    monthlyCashFlow: round2(nonNeg(v.projectedRevenue) / 12 - expenses - pitia),
  };
};

export const airbnbPrice: CustomCalculator = (v) => {
  const occ = Math.min(100, nonNeg(v.occupancyRate)) / 100;
  const nights = NIGHTS_PER_MONTH * occ;
  const stays = nights / Math.max(1, nonNeg(v.averageStayNights, 3));
  const fee = Math.min(0.5, nonNeg(v.hostFeePercent) / 100);
  const cleaningFee = nonNeg(v.cleaningFeeCharged);
  const costs = nonNeg(v.monthlyFixedCosts) + stays * (nonNeg(v.cleaningCostPerStay) + nonNeg(v.suppliesPerStay));
  const needed = (rateTarget: number) => (nights > 0 ? ((rateTarget + costs) / (1 - fee) - stays * cleaningFee) / nights : 0);
  const rate = needed(nonNeg(v.targetMonthlyProfit));
  const breakEven = needed(0);
  return {
    nightlyRateNeeded: round2(Math.max(0, rate)),
    breakEvenNightlyRate: round2(Math.max(0, breakEven)),
    bookedNightsPerMonth: round2(nights),
    staysPerMonth: round2(stays),
    guestPricePerStay: round2(Math.max(0, rate) * nonNeg(v.averageStayNights, 3) + cleaningFee),
    monthlyGrossRevenue: round2(Math.max(0, rate) * nights + stays * cleaningFee),
  };
};

export const airbnbTax: CustomCalculator = (v) => {
  const gross = nonNeg(v.grossRentalIncome);
  const rentalDays = nonNeg(v.rentalDays);
  const personalDays = nonNeg(v.personalDays);
  const lodging = (gross * (nonNeg(v.stateLodgingTax) + nonNeg(v.localLodgingTax))) / 100;
  if (rentalDays > 0 && rentalDays <= 14) {
    return { totalTax: 0, lodgingTaxes: round2(lodging), taxableRentalProfit: 0, incomeTax: 0, selfEmploymentTax: 0, afterTaxProfit: round2(gross - nonNeg(v.expenses)), fourteenDayRuleApplies: 1 };
  }
  // Personal use over 14 days (or 10% of rental days) → expenses split by use days.
  const mixed = personalDays > Math.max(14, rentalDays * 0.1);
  const share = mixed && rentalDays + personalDays > 0 ? rentalDays / (rentalDays + personalDays) : 1;
  const profit = gross - (nonNeg(v.expenses) + nonNeg(v.depreciation)) * share;
  const taxable = mixed ? Math.max(0, profit) : profit;
  const services = yes(v.substantialServices);
  const se = services && taxable > 0 ? taxable * 0.9235 * 0.153 : 0;
  const income = Math.max(0, taxable - se / 2) * (nonNeg(v.marginalTaxRate) / 100);
  return {
    totalTax: round2(income + se),
    lodgingTaxes: round2(lodging),
    taxableRentalProfit: round2(taxable),
    incomeTax: round2(income),
    selfEmploymentTax: round2(se),
    afterTaxProfit: round2(gross - nonNeg(v.expenses) - income - se),
    fourteenDayRuleApplies: 0,
  };
};

export const midtermRental: CustomCalculator = (v) => {
  const month = (occPct: number) => {
    const occ = Math.min(100, occPct) / 100;
    const revenue = nonNeg(v.monthlyFurnishedRent) * occ;
    const turnovers = (12 * occ) / Math.max(1, nonNeg(v.averageStayMonths, 3));
    const costs =
      nonNeg(v.utilities) + nonNeg(v.platformFeesPerYear) / 12 + (turnovers * nonNeg(v.turnoverCost)) / 12 +
      nonNeg(v.furnishingCost) / Math.max(1, nonNeg(v.furnishingLifeMonths, 60)) + (revenue * nonNeg(v.managementPercent)) / 100;
    return { revenue, costs, net: revenue - costs - nonNeg(v.mortgageAndCarry) };
  };
  const m = month(nonNeg(v.occupancyRate));
  const longTerm = nonNeg(v.longTermRent) * (1 - nonNeg(v.longTermVacancy) / 100) - nonNeg(v.mortgageAndCarry);
  return {
    midTermCashFlow: round2(m.net),
    longTermCashFlow: round2(longTerm),
    midTermAdvantage: round2(m.net - longTerm),
    monthlyRevenue: round2(m.revenue),
    monthlyOperatingCosts: round2(m.costs),
    occupancyToMatchLongTerm: round2(breakEvenOcc((o) => month(o).net, longTerm)),
  };
};

function strMonthly(v: Record<string, number>, occPct: number) {
  const nights = NIGHTS_PER_MONTH * (Math.min(100, occPct) / 100);
  const stays = nights / Math.max(1, nonNeg(v.averageStayNights, 3));
  const revenue = nights * nonNeg(v.nightlyRate) + stays * nonNeg(v.cleaningFeeCharged);
  const fees = (revenue * (nonNeg(v.platformFeePercent) + nonNeg(v.strManagementPercent))) / 100;
  const perStay = stays * (nonNeg(v.cleaningCostPerStay) + nonNeg(v.suppliesPerStay));
  return { revenue, costs: fees + perStay + nonNeg(v.strUtilities) };
}

/** Lowest occupancy (%) at which `net(occ)` reaches `target`. */
function breakEvenOcc(net: (occ: number) => number, target: number): number {
  if (net(100) < target) return 100;
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (net(mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

export const rentalArbitrage: CustomCalculator = (v) => {
  const setup = nonNeg(v.furnishingCost) + nonNeg(v.securityDeposit) + nonNeg(v.otherSetupCosts);
  const fixed = nonNeg(v.monthlyLeaseRent) + nonNeg(v.monthlyInsurance);
  const net = (occ: number) => {
    const m = strMonthly(v, occ);
    return m.revenue - m.costs - fixed;
  };
  const profit = net(nonNeg(v.occupancyRate));
  return {
    monthlyProfit: round2(profit),
    monthlyRevenue: round2(strMonthly(v, nonNeg(v.occupancyRate)).revenue),
    setupCost: round2(setup),
    paybackMonths: profit > 0 ? round2(setup / profit) : 0,
    yearlyReturnOnSetup: setup > 0 ? round2(((profit * 12) / setup) * 100) : 0,
    breakEvenOccupancy: round2(breakEvenOcc(net, 0)),
  };
};

export const rentVsAirbnb: CustomCalculator = (v) => {
  const carry = nonNeg(v.mortgageAndCarry);
  const ltr = nonNeg(v.longTermRent) * (1 - nonNeg(v.longTermVacancy) / 100) * (1 - nonNeg(v.ltrManagementPercent) / 100) - nonNeg(v.ltrMaintenance) - carry;
  const furnish = nonNeg(v.furnishingCost) / 60;
  const str = (occ: number) => {
    const m = strMonthly(v, occ);
    return m.revenue - m.costs - furnish - carry;
  };
  const strNet = str(nonNeg(v.occupancyRate));
  return {
    airbnbAdvantage: round2(strNet - ltr),
    shortTermCashFlow: round2(strNet),
    longTermCashFlow: round2(ltr),
    shortTermRevenue: round2(strMonthly(v, nonNeg(v.occupancyRate)).revenue),
    occupancyToMatchLongTerm: round2(breakEvenOcc(str, ltr)),
  };
};

export const reInvestStrCustomCalculators: Record<string, CustomCalculator> = {
  "real-estate-wholesale-calculator": realEstateWholesale,
  "landlord-rent-calculator": landlordRent,
  "house-hacking-calculator": houseHacking,
  "irr-real-estate-calculator": irrRealEstate,
  "buy-to-let-mortgage-calculator": buyToLetMortgage,
  "airbnb-mortgage-calculator": airbnbMortgage,
  "airbnb-price-calculator": airbnbPrice,
  "airbnb-tax-calculator": airbnbTax,
  "midterm-rental-calculator": midtermRental,
  "rental-arbitrage-calculator": rentalArbitrage,
  "rent-vs-airbnb-calculator": rentVsAirbnb,
};
