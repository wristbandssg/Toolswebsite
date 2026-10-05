/**
 * Batch: "Loan Calculators" expansion 2 (3 Oct 2026), sub-batch 3 of 8 —
 * Appliance & Electronics Loans (8 tools), filed under Loan Calculators >
 * Personal Loan Calculators. See calc-engine-loan-life-events.ts for the
 * full batch context.
 *
 * What each tool models beyond the plain payment formula:
 *  - applianceLoan: appliance + installation + haul-away + sales tax, less
 *    utility/manufacturer rebates and a down payment.
 *  - applianceLoanPayment: the payment vs the energy the new, more
 *    efficient appliance saves each month.
 *  - applianceLoanCost: repair the old appliance or finance a new one —
 *    cost per year of useful life.
 *  - applianceLoanPayoff: lease-to-own early buyout vs paying every week.
 *  - electronicsLoan: devices + accessories + protection plan + tax, less a
 *    trade-in and down payment.
 *  - electronicsLoanPayment: a carrier's 0% device installment plan with
 *    monthly bill credits that are lost if you leave early.
 *  - electronicsLoanCost: financing vs depreciation — net cost per month of
 *    use after the device's resale value.
 *  - electronicsLoanPayoff: what you'll still owe at your next upgrade, and
 *    the payment needed to be clear by then.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-appliance-electronics-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (k <= 0) return principal;
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

function payDown(balance: number, i: number, pay: number, maxMonths = 1200): { months: number; interest: number } {
  if (balance <= 0) return { months: 0, interest: 0 };
  if (pay <= balance * i + 1e-9) return { months: -1, interest: 0 };
  let b = balance;
  let interest = 0;
  let months = 0;
  while (b > 1e-9 && months < maxMonths) {
    const int = b * i;
    interest += int;
    b = b + int - Math.min(pay, b + int);
    months++;
  }
  return { months, interest };
}

// --- 1. Appliance Loan Calculator --------------------------------------------
export const applianceLoanCalculator: CustomCalculator = (values) => {
  const appliancePrice = Math.max(0, safeNumber(values.appliancePrice, 2500));
  const installation = Math.max(0, safeNumber(values.installation, 200));
  const haulAway = Math.max(0, safeNumber(values.haulAway, 50));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 7));
  const rebates = Math.max(0, safeNumber(values.rebates, 150));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 18));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 18)));

  const tax = (appliancePrice * salesTaxPercent) / 100;
  const total = appliancePrice + installation + haulAway + tax;
  const financed = Math.max(0, total - rebates - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);

  return {
    totalPrice: round2(total),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - financed),
  };
};

// --- 2. Appliance Loan Payment Calculator (vs energy savings) ----------------
export const applianceLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 18));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const annualKwhSaved = Math.max(0, safeNumber(values.annualKwhSaved, 600));
  const electricityRate = Math.max(0, safeNumber(values.electricityRate, 0.17));
  const otherMonthlySavings = Math.max(0, safeNumber(values.otherMonthlySavings, 0));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const savings = (annualKwhSaved * electricityRate) / 12 + otherMonthlySavings;

  return {
    monthlyPayment: round2(pmt),
    monthlyEnergySavings: round2(savings),
    netMonthlyCost: round2(pmt - savings),
    totalInterest: round2(pmt * termMonths - loanAmount),
    savingsOverLoanTerm: round2(savings * termMonths),
  };
};

// --- 3. Appliance Loan Cost Calculator (repair vs replace) -------------------
export const applianceLoanCostCalculator: CustomCalculator = (values) => {
  const repairCost = Math.max(0, safeNumber(values.repairCost, 450));
  const oldYearsLeft = Math.max(0.25, safeNumber(values.oldYearsLeft, 3));
  const newPrice = Math.max(0, safeNumber(values.newPrice, 1800));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 18));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const newLifeYears = Math.max(0.25, safeNumber(values.newLifeYears, 13));

  const pmt = payment(newPrice, annualRatePercent / 100 / 12, termMonths);
  const newTotal = pmt * termMonths;
  const repairPerYear = repairCost / oldYearsLeft;
  const newPerYear = newTotal / newLifeYears;

  return {
    repairCostPerYear: round2(repairPerYear),
    newTotalWithInterest: round2(newTotal),
    newCostPerYear: round2(newPerYear),
    replacingSavesPerYear: round2(repairPerYear - newPerYear),
  };
};

// --- 4. Appliance Loan Payoff Calculator (lease-to-own buyout) ---------------
export const applianceLoanPayoffCalculator: CustomCalculator = (values) => {
  const cashPrice = Math.max(0, safeNumber(values.cashPrice, 1200));
  const weeklyPayment = Math.max(0, safeNumber(values.weeklyPayment, 30));
  const totalWeeks = Math.max(1, Math.round(safeNumber(values.totalWeeks, 104)));
  const weeksPaid = Math.min(totalWeeks, Math.max(0, Math.round(safeNumber(values.weeksPaid, 30))));
  const buyoutPercent = Math.min(100, Math.max(0, safeNumber(values.buyoutPercent, 50)));

  const paid = weeklyPayment * weeksPaid;
  const remaining = weeklyPayment * (totalWeeks - weeksPaid);
  const buyout = (remaining * buyoutPercent) / 100;

  return {
    paidSoFar: round2(paid),
    remainingIfYouKeepPaying: round2(remaining),
    earlyBuyoutPrice: round2(buyout),
    savedByBuyingOut: round2(remaining - buyout),
    totalWithBuyout: round2(paid + buyout),
    paidAboveCashPrice: round2(paid + buyout - cashPrice),
  };
};

// --- 5. Electronics Loan Calculator ------------------------------------------
export const electronicsLoanCalculator: CustomCalculator = (values) => {
  const devicePrice = Math.max(0, safeNumber(values.devicePrice, 1800));
  const accessories = Math.max(0, safeNumber(values.accessories, 200));
  const protectionPlan = Math.max(0, safeNumber(values.protectionPlan, 150));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 7));
  const tradeInValue = Math.max(0, safeNumber(values.tradeInValue, 300));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 20));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));

  const tax = ((devicePrice + accessories) * salesTaxPercent) / 100;
  const total = devicePrice + accessories + protectionPlan + tax;
  const financed = Math.max(0, total - tradeInValue - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);

  return {
    totalPrice: round2(total),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - financed),
  };
};

// --- 6. Electronics Loan Payment Calculator (carrier plan + bill credits) ----
export const electronicsLoanPaymentCalculator: CustomCalculator = (values) => {
  const devicePrice = Math.max(0, safeNumber(values.devicePrice, 1000));
  const months = Math.max(1, Math.round(safeNumber(values.months, 36)));
  const monthlyBillCredit = Math.max(0, safeNumber(values.monthlyBillCredit, 20));
  const monthsBeforeLeaving = Math.min(months, Math.max(0, Math.round(safeNumber(values.monthsBeforeLeaving, 18))));

  const installment = devicePrice / months;
  const creditsTotal = monthlyBillCredit * months;

  return {
    monthlyInstallment: round2(installment),
    netMonthlyAfterCredits: round2(installment - monthlyBillCredit),
    totalCredits: round2(creditsTotal),
    creditsLostIfYouLeave: round2(monthlyBillCredit * (months - monthsBeforeLeaving)),
    balanceDueIfYouLeave: round2(installment * (months - monthsBeforeLeaving)),
  };
};

// --- 7. Electronics Loan Cost Calculator (vs depreciation) -------------------
export const electronicsLoanCostCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 2000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 20));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const resalePercent = Math.min(100, Math.max(0, safeNumber(values.resalePercent, 30)));
  const monthsOfUse = Math.max(1, Math.round(safeNumber(values.monthsOfUse, 36)));

  const pmt = payment(price, annualRatePercent / 100 / 12, termMonths);
  const total = pmt * termMonths;
  const resale = (price * resalePercent) / 100;

  return {
    monthlyPayment: round2(pmt),
    totalPaid: round2(total),
    totalInterest: round2(total - price),
    resaleValue: round2(resale),
    netCostPerMonthOfUse: round2((total - resale) / monthsOfUse),
  };
};

// --- 8. Electronics Loan Payoff Calculator (before the next upgrade) ---------
export const electronicsLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 1500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 22));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 75));
  const monthsUntilUpgrade = Math.max(1, Math.round(safeNumber(values.monthsUntilUpgrade, 12)));

  const i = annualRatePercent / 100 / 12;
  const now = payDown(balance, i, monthlyPayment);
  const needed = payment(balance, i, monthsUntilUpgrade);
  const atUpgrade =
    now.months >= 0 && now.months <= monthsUntilUpgrade ? 0 : balanceAfter(balance, i, monthlyPayment, monthsUntilUpgrade);

  return {
    monthsToPayoffNow: Math.max(0, now.months),
    balanceAtUpgrade: round2(atUpgrade),
    paymentToClearBeforeUpgrade: round2(needed),
    extraNeededPerMonth: round2(Math.max(0, needed - monthlyPayment)),
  };
};

export const loanApplianceElectronicsCustomCalculators: Record<string, CustomCalculator> = {
  "appliance-loan-calculator": applianceLoanCalculator,
  "appliance-loan-payment-calculator": applianceLoanPaymentCalculator,
  "appliance-loan-cost-calculator": applianceLoanCostCalculator,
  "appliance-loan-payoff-calculator": applianceLoanPayoffCalculator,
  "electronics-loan-calculator": electronicsLoanCalculator,
  "electronics-loan-payment-calculator": electronicsLoanPaymentCalculator,
  "electronics-loan-cost-calculator": electronicsLoanCostCalculator,
  "electronics-loan-payoff-calculator": electronicsLoanPayoffCalculator,
};
