/**
 * Batch: "Car & Vehicle Cost Calculators" (5 Oct 2026), sub-batch 3 of 9 —
 * Car Leasing (7 tools), filed under Car & Vehicle Cost Calculators > Car
 * Lease, Rental & Transport Calculators. See calc-engine-car-buying.ts for
 * the full batch context.
 *
 *  - carLease: (adjusted cap cost - residual) / term + (cap + residual) x
 *    money factor, plus tax on the payment; APR = money factor x 2,400.
 *  - carLeaseVsBuy: lease cost over the term vs loan payments over the same
 *    months less your equity (value - loan balance) at the end.
 *  - leaseBuyout: residual + purchase option fee + tax vs market value.
 *  - leaseMileageOverage: projected miles from miles so far; overage fee vs
 *    buying miles up front; miles per month left to stay under.
 *  - carSubscription (incl. subscription vs lease vs buy): all-in monthly
 *    subscription vs lease + insurance + upkeep vs buying (less equity).
 *  - novatedLease (Australia): lease with ATO minimum residual, pre-tax
 *    deductions (EVs FBT-exempt; petrol cars use the employee contribution
 *    method, 20% of the car's cost post-tax) vs paying from after-tax pay.
 *  - companyCarBenefit (UK benefit in kind): list price x BIK % -> tax and
 *    employer Class 1A NIC (15%) vs a cash allowance after tax and NI.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-car-lease-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const pick = (v: number, d: number, n: number) => {
  const r = Math.round(safeNumber(v, d));
  return r >= 1 && r <= n ? r : d;
};

function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

function balanceAfter(principal: number, i: number, n: number, k: number): number {
  const p = payment(principal, i, n);
  if (i === 0) return Math.max(0, principal - p * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (p * (g - 1)) / i);
}

// --- 1. Car Lease Calculator -----------------------------------------------------------
export const carLeaseCalculator: CustomCalculator = (values) => {
  const msrp = pos(values.msrp, 40000);
  const negotiatedPrice = pos(values.negotiatedPrice, 38000);
  const downPayment = pos(values.downPayment, 2000);
  const acquisitionFee = pos(values.acquisitionFee, 695);
  const residualPercent = Math.min(100, pos(values.residualPercent, 58));
  const moneyFactor = pos(values.moneyFactor, 0.0025);
  const termMonths = Math.max(1, Math.round(pos(values.termMonths, 36)));
  const salesTaxPercent = pos(values.salesTaxPercent, 7);

  const adjustedCap = negotiatedPrice + acquisitionFee - downPayment;
  const residual = (msrp * residualPercent) / 100;
  const depreciation = (adjustedCap - residual) / termMonths;
  const finance = (adjustedCap + residual) * moneyFactor;
  const base = depreciation + finance;
  const monthly = base * (1 + salesTaxPercent / 100);

  return {
    residualValue: round2(residual),
    monthlyDepreciation: round2(depreciation),
    monthlyFinanceCharge: round2(finance),
    monthlyPayment: round2(monthly),
    equivalentApr: round2(moneyFactor * 2400),
    totalLeaseCost: round2(monthly * termMonths + downPayment),
  };
};

// --- 2. Car Lease vs Buy Calculator ----------------------------------------------------
export const carLeaseVsBuyCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 38000);
  const downPayment = pos(values.downPayment, 2000);
  const leasePayment = pos(values.leasePayment, 450);
  const leaseTermMonths = Math.max(1, Math.round(pos(values.leaseTermMonths, 36)));
  const leaseEndFees = pos(values.leaseEndFees, 395);
  const loanRatePercent = pos(values.loanRatePercent, 6.5);
  const loanTermMonths = Math.max(1, Math.round(pos(values.loanTermMonths, 60)));
  const valueLostPercent = Math.min(100, pos(values.valueLostPercent, 40));

  const loan = Math.max(0, price - downPayment);
  const i = loanRatePercent / 100 / 12;
  const pmt = payment(loan, i, loanTermMonths);
  const months = Math.min(leaseTermMonths, loanTermMonths);
  const paid = pmt * months;
  const balance = balanceAfter(loan, i, loanTermMonths, months);
  const value = price * (1 - valueLostPercent / 100);
  const leaseTotal = downPayment + leasePayment * leaseTermMonths + leaseEndFees;
  const buyNet = downPayment + paid - (value - balance);

  return {
    leaseTotalCost: round2(leaseTotal),
    loanMonthlyPayment: round2(pmt),
    buyPaymentsOverTerm: round2(downPayment + paid),
    carValueAtEnd: round2(value),
    loanBalanceAtEnd: round2(balance),
    buyNetCost: round2(buyNet),
    leaseSavings: round2(buyNet - leaseTotal),
  };
};

// --- 3. Lease Buyout Calculator --------------------------------------------------------
export const leaseBuyoutCalculator: CustomCalculator = (values) => {
  const residualValue = pos(values.residualValue, 22000);
  const purchaseOptionFee = pos(values.purchaseOptionFee, 350);
  const monthsLeft = Math.round(pos(values.monthsLeft, 0));
  const monthlyPayment = pos(values.monthlyPayment, 450);
  const salesTaxPercent = pos(values.salesTaxPercent, 7);
  const marketValue = pos(values.marketValue, 25000);

  const tax = (residualValue * salesTaxPercent) / 100;
  const remaining = monthsLeft * monthlyPayment;
  const total = residualValue + purchaseOptionFee + tax + remaining;

  return {
    remainingPayments: round2(remaining),
    salesTax: round2(tax),
    totalBuyoutCost: round2(total),
    marketValueWithTax: round2(marketValue * (1 + salesTaxPercent / 100)),
    buyoutSavingsVsMarket: round2(marketValue * (1 + salesTaxPercent / 100) - total),
  };
};

// --- 4. Lease Mileage Overage Calculator -----------------------------------------------
export const leaseMileageOverageCalculator: CustomCalculator = (values) => {
  const milesPerYearAllowed = pos(values.milesPerYearAllowed, 12000);
  const termMonths = Math.max(1, Math.round(pos(values.termMonths, 36)));
  const milesSoFar = pos(values.milesSoFar, 30000);
  const monthsElapsed = Math.min(termMonths, Math.max(1, Math.round(pos(values.monthsElapsed, 24))));
  const overageFeePerMile = pos(values.overageFeePerMile, 0.25);
  const prepaidPerMile = pos(values.prepaidPerMile, 0.15);

  const allowed = (milesPerYearAllowed * termMonths) / 12;
  const projected = (milesSoFar / monthsElapsed) * termMonths;
  const over = Math.max(0, projected - allowed);
  const monthsLeft = termMonths - monthsElapsed;

  return {
    totalMilesAllowed: round2(allowed),
    projectedMilesAtEnd: round2(projected),
    projectedOverageMiles: round2(over),
    overageFee: round2(over * overageFeePerMile),
    costIfMilesBoughtUpFront: round2(over * prepaidPerMile),
    milesPerMonthToStayUnder: round2(monthsLeft > 0 ? Math.max(0, allowed - milesSoFar) / monthsLeft : 0),
  };
};

// --- 5. Car Subscription Calculator ----------------------------------------------------
export const carSubscriptionCalculator: CustomCalculator = (values) => {
  const months = Math.max(1, Math.round(pos(values.months, 24)));
  const subscriptionMonthly = pos(values.subscriptionMonthly, 900);
  const subscriptionStartFee = pos(values.subscriptionStartFee, 500);
  const leasePayment = pos(values.leasePayment, 450);
  const leaseDueAtSigning = pos(values.leaseDueAtSigning, 2500);
  const insuranceMonthly = pos(values.insuranceMonthly, 150);
  const upkeepMonthly = pos(values.upkeepMonthly, 40);
  const price = pos(values.price, 35000);
  const downPayment = pos(values.downPayment, 3500);
  const loanRatePercent = pos(values.loanRatePercent, 7);
  const depreciationPercent = Math.min(100, pos(values.depreciationPercent, 15));

  const sub = subscriptionStartFee + subscriptionMonthly * months;
  const lease = leaseDueAtSigning + (leasePayment + insuranceMonthly + upkeepMonthly) * months;
  const loan = Math.max(0, price - downPayment);
  const i = loanRatePercent / 100 / 12;
  const pmt = payment(loan, i, 60);
  const k = Math.min(months, 60);
  const equity = price * Math.pow(1 - depreciationPercent / 100, months / 12) - balanceAfter(loan, i, 60, k);
  const buy = downPayment + pmt * k + (insuranceMonthly + upkeepMonthly) * months - equity;

  return {
    subscriptionTotal: round2(sub),
    leaseTotal: round2(lease),
    buyNetCost: round2(buy),
    subscriptionPerMonth: round2(sub / months),
    leasePerMonth: round2(lease / months),
    buyPerMonth: round2(buy / months),
    cheapestPerMonth: round2(Math.min(sub, lease, buy) / months),
  };
};

// --- 6. Novated Lease Calculator (Australia) -------------------------------------------
export const novatedLeaseCalculator: CustomCalculator = (values) => {
  const vehiclePrice = pos(values.vehiclePrice, 50000);
  const runningCosts = pos(values.runningCosts, 6000);
  const termYears = pick(values.termYears, 3, 5);
  const ratePercent = pos(values.ratePercent, 8);
  const fbtExempt = Math.round(safeNumber(values.fbtExempt, 1)) === 1;
  const marginalRatePercent = Math.min(100, pos(values.marginalRatePercent, 32));

  // ATO minimum residuals by term (years 1-5).
  const residualPercent = [65.63, 56.25, 46.88, 37.5, 28.13][termYears - 1];
  const n = termYears * 12;
  const i = ratePercent / 100 / 12;
  const leasePmt = (financed: number) => {
    const residual = (financed * residualPercent) / 100;
    return i === 0 ? (financed - residual) / n : ((financed - residual / Math.pow(1 + i, n)) * i) / (1 - Math.pow(1 + i, -n));
  };
  const exGst = vehiclePrice / 1.1;
  const leaseAnnual = leasePmt(exGst) * 12;
  const runningExGst = runningCosts / 1.1;
  const packageCost = leaseAnnual + runningExGst;
  const postTax = fbtExempt ? 0 : vehiclePrice * 0.2;
  const preTax = Math.max(0, packageCost - postTax);
  const taxSaved = (preTax * marginalRatePercent) / 100;
  const netCost = preTax - taxSaved + postTax;
  const without = leasePmt(vehiclePrice) * 12 + runningCosts;

  return {
    residualPayment: round2((exGst * residualPercent) / 100),
    annualLeasePayments: round2(leaseAnnual),
    preTaxDeductions: round2(preTax),
    postTaxContribution: round2(postTax),
    taxSaved: round2(taxSaved),
    netAnnualCost: round2(netCost),
    costWithoutNovatedLease: round2(without),
    annualSavings: round2(without - netCost),
  };
};

// --- 7. Company Car Benefit Calculator (UK) --------------------------------------------
export const companyCarBenefitCalculator: CustomCalculator = (values) => {
  const listPrice = pos(values.listPrice, 40000);
  const bikPercent = Math.min(37, pos(values.bikPercent, 4));
  const taxBand = pick(values.taxBand, 2, 3);
  const employeeContribution = pos(values.employeeContribution, 0);
  const cashAllowance = pos(values.cashAllowance, 6000);

  const taxRate = [20, 40, 45][taxBand - 1];
  const niRate = taxBand === 1 ? 8 : 2;
  const benefit = Math.max(0, (listPrice * bikPercent) / 100 - employeeContribution);
  const tax = (benefit * taxRate) / 100;

  return {
    taxableBenefit: round2(benefit),
    yearlyTax: round2(tax),
    monthlyTax: round2(tax / 12),
    employerClass1ANic: round2(benefit * 0.15),
    cashAllowanceAfterTaxAndNi: round2(cashAllowance * (1 - (taxRate + niRate) / 100)),
  };
};

export const carLeaseCustomCalculators: Record<string, CustomCalculator> = {
  "car-lease-calculator": carLeaseCalculator,
  "car-lease-vs-buy-calculator": carLeaseVsBuyCalculator,
  "lease-buyout-calculator": leaseBuyoutCalculator,
  "lease-mileage-overage-calculator": leaseMileageOverageCalculator,
  "car-subscription-calculator": carSubscriptionCalculator,
  "novated-lease-calculator": novatedLeaseCalculator,
  "company-car-benefit-calculator": companyCarBenefitCalculator,
};
