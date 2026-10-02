/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 3 of 10 —
 * Wedding & Vacation Loans (11 tools), filed under Loan Calculators >
 * Personal Loan Calculators. See calc-engine-loan-debt-consolidation.ts for
 * the full batch context.
 *
 * What each tool models beyond the plain payment formula:
 *  - weddingLoan: budget less savings and family help = cash needed, grossed
 *    up for an origination fee deducted from the proceeds.
 *  - weddingLoanPayment: the payment split between two partners in
 *    proportion to their take-home pay, and as a share of combined pay.
 *  - weddingLoanPayoff: putting cash wedding gifts toward the loan a few
 *    months after the wedding.
 *  - weddingLoanInterest: interest per guest and the true cost per guest.
 *  - weddingLoanAffordability: savings now + saving until the date + the
 *    loan a post-wedding payment supports = the largest budget.
 *  - weddingLoanComparison: borrow now vs save the same monthly amount
 *    first (months to save, interest paid vs earned).
 *  - weddingLoanEligibility: applying alone vs jointly — DTI each way and
 *    the lower of two credit scores.
 *  - vacationLoan: trip cost built from flights, nights and daily spending,
 *    less savings.
 *  - vacationLoanPayment: payment as a share of take-home pay, how many
 *    months you're still paying after you're home, and cost per trip day.
 *  - vacationLoanCost: personal loan vs leaving the trip on a credit card
 *    at minimum payments.
 *  - vacationLoanPayoff: the balance when next year's trip comes round, and
 *    the payment needed to be clear before then.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-wedding-vacation-calculators.ts for the copy.
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

function presentValue(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + i, -n))) / i;
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

// --- 1. Wedding Loan Calculator ----------------------------------------------
export const weddingLoanCalculator: CustomCalculator = (values) => {
  const weddingBudget = Math.max(0, safeNumber(values.weddingBudget, 30000));
  const savings = Math.max(0, safeNumber(values.savings, 10000));
  const familyContribution = Math.max(0, safeNumber(values.familyContribution, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const originationFeePercent = Math.min(50, Math.max(0, safeNumber(values.originationFeePercent, 0)));

  const cashNeeded = Math.max(0, weddingBudget - savings - familyContribution);
  const loanAmount = cashNeeded / (1 - originationFeePercent / 100);
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - loanAmount;

  return {
    cashNeeded: round2(cashNeeded),
    loanAmount: round2(loanAmount),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    weddingCostWithBorrowing: round2(weddingBudget + interest + (loanAmount - cashNeeded)),
  };
};

// --- 2. Wedding Loan Payment Calculator (split between partners) -------------
export const weddingLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const partner1Income = Math.max(0, safeNumber(values.partner1Income, 4000));
  const partner2Income = Math.max(0, safeNumber(values.partner2Income, 3000));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const combined = partner1Income + partner2Income;
  const share1 = combined > 0 ? partner1Income / combined : 0.5;

  return {
    monthlyPayment: round2(pmt),
    partner1Share: round2(pmt * share1),
    partner2Share: round2(pmt * (1 - share1)),
    paymentPercentOfIncome: combined > 0 ? round2((pmt / combined) * 100) : 0,
    totalInterest: round2(pmt * termMonths - loanAmount),
  };
};

// --- 3. Wedding Loan Payoff Calculator (cash gifts as a lump sum) ------------
export const weddingLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const cashGifts = Math.max(0, safeNumber(values.cashGifts, 4000));
  const monthsAfterWedding = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.monthsAfterWedding, 2))));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const bal = balanceAfter(loanAmount, i, pmt, monthsAfterWedding);
  const remainingInterest = pmt * (termMonths - monthsAfterWedding) - bal;
  const after = payDown(Math.max(0, bal - cashGifts), i, pmt);
  const newTotal = monthsAfterWedding + Math.max(0, after.months);

  return {
    monthlyPayment: round2(pmt),
    balanceWhenGiftsPaid: round2(bal),
    newPayoffMonths: newTotal,
    monthsSaved: termMonths - newTotal,
    interestSaved: round2(remainingInterest - after.interest),
  };
};

// --- 4. Wedding Loan Interest Calculator (per guest) -------------------------
export const weddingLoanInterestCalculator: CustomCalculator = (values) => {
  const weddingBudget = Math.max(0, safeNumber(values.weddingBudget, 30000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const guestCount = Math.max(1, Math.round(safeNumber(values.guestCount, 100)));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - loanAmount;

  return {
    totalInterest: round2(interest),
    interestPerGuest: round2(interest / guestCount),
    costPerGuestBefore: round2(weddingBudget / guestCount),
    costPerGuestWithInterest: round2((weddingBudget + interest) / guestCount),
    interestPercentOfBudget: weddingBudget > 0 ? round2((interest / weddingBudget) * 100) : 0,
  };
};

// --- 5. Wedding Loan Affordability Calculator --------------------------------
export const weddingLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 8000));
  const monthlySaving = Math.max(0, safeNumber(values.monthlySaving, 600));
  const monthsUntilWedding = Math.max(0, Math.round(safeNumber(values.monthsUntilWedding, 12)));
  const savingsRatePercent = Math.max(0, safeNumber(values.savingsRatePercent, 4));
  const loanPaymentBudget = Math.max(0, safeNumber(values.loanPaymentBudget, 400));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const s = savingsRatePercent / 100 / 12;
  const g = Math.pow(1 + s, monthsUntilWedding);
  const savedByWedding = currentSavings * g + (s === 0 ? monthlySaving * monthsUntilWedding : (monthlySaving * (g - 1)) / s);
  const maxLoan = presentValue(loanPaymentBudget, annualRatePercent / 100 / 12, termMonths);

  return {
    savedByWedding: round2(savedByWedding),
    maxLoanAmount: round2(maxLoan),
    maxWeddingBudget: round2(savedByWedding + maxLoan),
    loanInterest: round2(loanPaymentBudget * termMonths - maxLoan),
  };
};

// --- 6. Wedding Loan Comparison Calculator (borrow now vs save first) --------
export const weddingLoanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const savingsRatePercent = Math.max(0, safeNumber(values.savingsRatePercent, 4));

  const pmt = payment(amount, annualRatePercent / 100 / 12, termMonths);
  const loanInterest = pmt * termMonths - amount;
  // Save the same monthly amount instead until the goal is reached.
  const s = savingsRatePercent / 100 / 12;
  let bal = 0;
  let months = 0;
  while (bal < amount - 1e-9 && months < 1200 && pmt > 0) {
    bal = bal * (1 + s) + pmt;
    months++;
  }
  const interestEarned = Math.max(0, bal - pmt * months);

  // Saving costs you (amount - interest earned); borrowing costs (amount +
  // interest paid), so the gap is the two interest figures added together.
  return {
    monthlyAmount: round2(pmt),
    loanInterest: round2(loanInterest),
    monthsToSave: months,
    monthsSooner: termMonths - months,
    interestEarnedSaving: round2(interestEarned),
    advantageOfSaving: round2(loanInterest + interestEarned),
  };
};

// --- 7. Wedding Loan Eligibility Calculator (solo vs joint) ------------------
export const weddingLoanEligibilityCalculator: CustomCalculator = (values) => {
  const income1 = Math.max(0, safeNumber(values.income1, 4500));
  const income2 = Math.max(0, safeNumber(values.income2, 3500));
  const debts1 = Math.max(0, safeNumber(values.debts1, 1500));
  const debts2 = Math.max(0, safeNumber(values.debts2, 400));
  const score1 = Math.max(300, Math.min(850, safeNumber(values.score1, 700)));
  const score2 = Math.max(300, Math.min(850, safeNumber(values.score2, 660)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 640)));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const solo = income1 > 0 ? ((debts1 + pmt) / income1) * 100 : 0;
  const joint = income1 + income2 > 0 ? ((debts1 + debts2 + pmt) / (income1 + income2)) * 100 : 0;

  return {
    monthlyPayment: round2(pmt),
    soloDtiPercent: round2(solo),
    jointDtiPercent: round2(joint),
    jointHeadroomPercent: round2(maxDtiPercent - joint),
    soloScoreMargin: Math.round(score1 - lenderMinScore),
    jointScoreMargin: Math.round(Math.min(score1, score2) - lenderMinScore),
  };
};

// --- 8. Vacation Loan Calculator (trip cost built up) ------------------------
export const vacationLoanCalculator: CustomCalculator = (values) => {
  const flights = Math.max(0, safeNumber(values.flights, 1800));
  const lodgingPerNight = Math.max(0, safeNumber(values.lodgingPerNight, 200));
  const nights = Math.max(0, Math.round(safeNumber(values.nights, 7)));
  const dailySpending = Math.max(0, safeNumber(values.dailySpending, 150));
  const otherCosts = Math.max(0, safeNumber(values.otherCosts, 300));
  const savings = Math.max(0, safeNumber(values.savings, 1000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));

  // Spending days = nights + 1 (arrival and departure days both count).
  const tripCost = flights + lodgingPerNight * nights + dailySpending * (nights + 1) + otherCosts;
  const borrow = Math.max(0, tripCost - savings);
  const pmt = payment(borrow, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - borrow;

  return {
    tripCost: round2(tripCost),
    amountToBorrow: round2(borrow),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    tripCostWithInterest: round2(tripCost + interest),
  };
};

// --- 9. Vacation Loan Payment Calculator -------------------------------------
export const vacationLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const tripDays = Math.max(1, Math.round(safeNumber(values.tripDays, 8)));
  const monthlyTakeHome = Math.max(0, safeNumber(values.monthlyTakeHome, 4000));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const totalPaid = pmt * termMonths;

  return {
    monthlyPayment: round2(pmt),
    paymentPercentOfIncome: monthlyTakeHome > 0 ? round2((pmt / monthlyTakeHome) * 100) : 0,
    totalPaid: round2(totalPaid),
    costPerTripDay: round2(totalPaid / tripDays),
    paymentDaysPerTripDay: round2((termMonths * 30.4375) / tripDays),
  };
};

// --- 10. Vacation Loan Cost Calculator (loan vs card minimums) ---------------
export const vacationLoanCostCalculator: CustomCalculator = (values) => {
  const tripCost = Math.max(0, safeNumber(values.tripCost, 5000));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 13));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 24)));
  const loanFeePercent = Math.min(50, Math.max(0, safeNumber(values.loanFeePercent, 0)));
  const cardAprPercent = Math.max(0, safeNumber(values.cardAprPercent, 24));
  const minPaymentPercent = Math.max(0.1, safeNumber(values.minPaymentPercent, 3));
  const minPaymentFloor = Math.max(1, safeNumber(values.minPaymentFloor, 25));

  const loanAmount = tripCost / (1 - loanFeePercent / 100);
  const pmt = payment(loanAmount, loanRatePercent / 100 / 12, loanTermMonths);
  const loanCost = pmt * loanTermMonths - tripCost;

  // Card at minimum payments: the larger of a % of the balance or a floor.
  const ci = cardAprPercent / 100 / 12;
  let b = tripCost;
  let cardInterest = 0;
  let months = 0;
  while (b > 1e-9 && months < 1200) {
    const int = b * ci;
    const due = b + int;
    const minPay = Math.min(due, Math.max((b * minPaymentPercent) / 100, minPaymentFloor));
    if (minPay <= int) {
      months = -1;
      break;
    }
    cardInterest += int;
    b = due - minPay;
    months++;
  }

  return {
    loanPayment: round2(pmt),
    loanTotalCost: round2(loanCost),
    cardMonthsAtMinimum: Math.max(0, months),
    cardInterestAtMinimum: months < 0 ? 0 : round2(cardInterest),
    savingsWithLoan: months < 0 ? 0 : round2(cardInterest - loanCost),
  };
};

// --- 11. Vacation Loan Payoff Calculator (clear it before the next trip) -----
export const vacationLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 4000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const currentPayment = Math.max(0, safeNumber(values.currentPayment, 190));
  const monthsUntilNextTrip = Math.max(1, Math.round(safeNumber(values.monthsUntilNextTrip, 12)));

  const i = annualRatePercent / 100 / 12;
  const now = payDown(balance, i, currentPayment);
  const needed = payment(balance, i, monthsUntilNextTrip);

  return {
    monthsToPayoffNow: Math.max(0, now.months),
    balanceAtNextTrip: round2(balanceAfter(balance, i, currentPayment, monthsUntilNextTrip)),
    paymentToClearBeforeTrip: round2(needed),
    extraNeededPerMonth: round2(Math.max(0, needed - currentPayment)),
  };
};

export const loanWeddingVacationCustomCalculators: Record<string, CustomCalculator> = {
  "wedding-loan-calculator": weddingLoanCalculator,
  "wedding-loan-payment-calculator": weddingLoanPaymentCalculator,
  "wedding-loan-payoff-calculator": weddingLoanPayoffCalculator,
  "wedding-loan-interest-calculator": weddingLoanInterestCalculator,
  "wedding-loan-affordability-calculator": weddingLoanAffordabilityCalculator,
  "wedding-loan-comparison-calculator": weddingLoanComparisonCalculator,
  "wedding-loan-eligibility-calculator": weddingLoanEligibilityCalculator,
  "vacation-loan-calculator": vacationLoanCalculator,
  "vacation-loan-payment-calculator": vacationLoanPaymentCalculator,
  "vacation-loan-cost-calculator": vacationLoanCostCalculator,
  "vacation-loan-payoff-calculator": vacationLoanPayoffCalculator,
};
