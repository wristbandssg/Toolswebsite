/**
 * Batch: "Mortgage Calculators" expansion (5 Oct 2026), sub-batch 5 of 5 —
 * Mortgage Costs & Insurance (4 tools), filed under Mortgage Calculators >
 * Mortgage Cost & Insurance Calculators. See
 * calc-engine-mortgage-loan-types.ts for the full batch context.
 * Distinct from the existing mortgage-points / discount-points-break-even
 * (permanent buydown) and private-mortgage-insurance-pmi tools.
 *
 *  - interestRateBuydownMortgage: temporary 2-1, 3-2-1 or 1-0 buydown —
 *    payment each year and the subsidy (cost) the seller/builder funds.
 *  - mortgageRateLock: lock fee + extension vs floating into a higher
 *    rate — extra interest over N years and the net value of locking.
 *  - escrowAccount: monthly escrow, RESPA two-month cushion, initial
 *    deposit at closing, and the shortage/new payment after a tax rise.
 *  - lenderPaidMortgageInsurance (incl. split premium): borrower-paid
 *    monthly PMI (ends at 78% LTV) vs LPMI (higher rate for the life of
 *    the loan) vs single premium vs split premium, over N years.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-mortgage-costs-insurance-calculators.ts for the copy.
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
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

function interestFirst(principal: number, i: number, n: number, k: number): number {
  const p = payment(principal, i, n);
  const kk = Math.min(k, n);
  return p * kk - (principal - balanceAfter(principal, i, p, kk));
}

function monthsToBalance(principal: number, i: number, pmt: number, n: number, target: number): number {
  let b = principal;
  for (let m = 0; m < n; m++) {
    if (b <= target) return m;
    b = b * (1 + i) - pmt;
  }
  return n;
}

// --- 1. Interest Rate Buydown Mortgage Calculator (temporary) -------------------------
export const interestRateBuydownMortgageCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 350000));
  const noteRatePercent = Math.max(0, safeNumber(values.noteRatePercent, 6.75));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const raw = Math.round(safeNumber(values.buydownType, 1));
  const type = [1, 2, 3].includes(raw) ? raw : 1;

  const steps = type === 1 ? [2, 1] : type === 2 ? [3, 2, 1] : [1];
  const n = termYears * 12;
  const full = payment(loanAmount, noteRatePercent / 100 / 12, n);
  // the payment for a reduced year is figured on the original loan and term
  const reduced = steps.map((s) => payment(loanAmount, Math.max(0, noteRatePercent - s) / 100 / 12, n));
  const cost = reduced.reduce((sum, p) => sum + (full - p) * 12, 0);
  const y = (k: number) => (k < reduced.length ? reduced[k] : full);

  return {
    year1Payment: round2(y(0)),
    year2Payment: round2(y(1)),
    year3Payment: round2(y(2)),
    fullPayment: round2(full),
    buydownCost: round2(cost),
    buydownCostPercent: round2(loanAmount > 0 ? (cost / loanAmount) * 100 : 0),
    firstYearSavings: round2((full - y(0)) * 12),
  };
};

// --- 2. Mortgage Rate Lock Calculator -------------------------------------------------
export const mortgageRateLockCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 350000));
  const lockedRatePercent = Math.max(0, safeNumber(values.lockedRatePercent, 6.5));
  const lockFeePercent = Math.max(0, safeNumber(values.lockFeePercent, 0.25));
  const extensionDays = Math.max(0, Math.round(safeNumber(values.extensionDays, 7)));
  const extensionFeePerDayPercent = Math.max(0, safeNumber(values.extensionFeePerDayPercent, 0.02));
  const floatRatePercent = Math.max(0, safeNumber(values.floatRatePercent, 6.875));
  const yearsKept = Math.max(0, safeNumber(values.yearsKept, 7));

  const n = 360;
  const k = Math.round(yearsKept * 12);
  const lockCost = (loanAmount * (lockFeePercent + extensionDays * extensionFeePerDayPercent)) / 100;
  const iL = lockedRatePercent / 100 / 12;
  const iF = floatRatePercent / 100 / 12;
  const extra = interestFirst(loanAmount, iF, n, k) - interestFirst(loanAmount, iL, n, k);

  return {
    lockCost: round2(lockCost),
    lockedPayment: round2(payment(loanAmount, iL, n)),
    paymentIfRateRises: round2(payment(loanAmount, iF, n)),
    monthlyDifference: round2(payment(loanAmount, iF, n) - payment(loanAmount, iL, n)),
    extraInterestIfRateRises: round2(extra),
    netBenefitOfLocking: round2(extra - lockCost),
  };
};

// --- 3. Escrow Account Calculator ----------------------------------------------------
export const escrowAccountCalculator: CustomCalculator = (values) => {
  const annualTaxes = Math.max(0, safeNumber(values.annualTaxes, 4800));
  const annualInsurance = Math.max(0, safeNumber(values.annualInsurance, 1800));
  const annualOther = Math.max(0, safeNumber(values.annualOther, 0));
  const paymentsBeforeTaxDue = Math.max(0, Math.min(12, Math.round(safeNumber(values.paymentsBeforeTaxDue, 4))));
  const cushionMonths = Math.max(0, Math.min(2, safeNumber(values.cushionMonths, 2)));
  const taxIncreasePercent = safeNumber(values.taxIncreasePercent, 10);

  const annual = annualTaxes + annualInsurance + annualOther;
  const monthly = annual / 12;
  const cushion = monthly * cushionMonths;
  // taxes: enough at closing that the deposit plus the payments made before the
  // bill covers it; insurance and other items are prepaid for the first year,
  // so the escrow only starts building them from the first payment.
  const taxShort = Math.max(0, annualTaxes - (annualTaxes / 12) * paymentsBeforeTaxDue);
  const initial = taxShort + cushion;
  const increase = (annualTaxes * taxIncreasePercent) / 100;
  const newMonthly = (annual + increase) / 12;

  return {
    monthlyEscrow: round2(monthly),
    cushion: round2(cushion),
    initialEscrowDeposit: round2(initial),
    escrowShortage: round2(Math.max(0, increase)),
    newMonthlyEscrow: round2(newMonthly + Math.max(0, increase) / 12),
    monthlyIncrease: round2(newMonthly + Math.max(0, increase) / 12 - monthly),
  };
};

// --- 4. Lender-Paid Mortgage Insurance Calculator (incl. split premium) ---------------
export const lenderPaidMortgageInsuranceCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 400000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 360000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const bpmiRatePercent = Math.max(0, safeNumber(values.bpmiRatePercent, 0.5));
  const lpmiRateIncreasePercent = Math.max(0, safeNumber(values.lpmiRateIncreasePercent, 0.25));
  const singlePremiumPercent = Math.max(0, safeNumber(values.singlePremiumPercent, 1.5));
  const splitUpfrontPercent = Math.max(0, safeNumber(values.splitUpfrontPercent, 0.5));
  const splitMonthlyRatePercent = Math.max(0, safeNumber(values.splitMonthlyRatePercent, 0.25));
  const yearsKept = Math.max(0, safeNumber(values.yearsKept, 10));

  const n = 360;
  const k = Math.min(n, Math.round(yearsKept * 12));
  const i = annualRatePercent / 100 / 12;
  const p = payment(loanAmount, i, n);
  const pmiMonths = homePrice > 0 && loanAmount / homePrice > 0.8 ? monthsToBalance(loanAmount, i, p, n, homePrice * 0.78) : 0;
  const paidMonths = Math.min(k, pmiMonths);
  const bpmiMonthly = (loanAmount * bpmiRatePercent) / 100 / 12;
  const lpmiExtra = payment(loanAmount, (annualRatePercent + lpmiRateIncreasePercent) / 100 / 12, n) - p;
  const splitMonthly = (loanAmount * splitMonthlyRatePercent) / 100 / 12;

  return {
    borrowerPaidMonthly: round2(bpmiMonthly),
    borrowerPaidTotal: round2(bpmiMonthly * paidMonths),
    lpmiExtraMonthly: round2(lpmiExtra),
    lpmiTotalCost: round2(lpmiExtra * k),
    singlePremiumCost: round2((loanAmount * singlePremiumPercent) / 100),
    splitPremiumTotal: round2((loanAmount * splitUpfrontPercent) / 100 + splitMonthly * paidMonths),
    monthsUntilBorrowerPmiEnds: pmiMonths,
  };
};

export const mortgageCostsInsuranceCustomCalculators: Record<string, CustomCalculator> = {
  "interest-rate-buydown-mortgage-calculator": interestRateBuydownMortgageCalculator,
  "mortgage-rate-lock-calculator": mortgageRateLockCalculator,
  "escrow-account-calculator": escrowAccountCalculator,
  "lender-paid-mortgage-insurance-calculator": lenderPaidMortgageInsuranceCalculator,
};
