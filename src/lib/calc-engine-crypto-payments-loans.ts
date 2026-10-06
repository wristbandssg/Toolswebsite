/**
 * Batch: "Crypto Calculators" expansion (6 Oct 2026), sub-batch 4 of 8 —
 * Payments, Rewards & Loans (5 tools), filed under Crypto Calculators >
 * Crypto Fees, Payments & Loans Calculators. See calc-engine-crypto-trading.ts
 * for the full batch context.
 *
 *  - cryptoMerchantProcessingFee: crypto processor % vs card % + fixed fee
 *    on the same sales.
 *  - cryptoPayroll: share of pay taken in crypto, coins after conversion
 *    fee, value at a later price; wages stay taxed at their dollar value.
 *  - cryptoCardRewards (incl. crypto debit card cashback): rewards rate in
 *    crypto, value after the token's price change and annual fee, vs a
 *    regular cash-back card.
 *  - cryptoReferralBonus: sign-up bonuses + share of referees' trading fees,
 *    after tax.
 *  - cryptoBackedLoan (incl. loan-to-value, loan origination fee):
 *    interest-only loan; LTV, margin call and liquidation prices.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-crypto-payments-loans-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Crypto Merchant Payment Processing Fee Calculator ------------------------------
export const cryptoMerchantProcessingFeeCalculator: CustomCalculator = (values) => {
  const monthlySales = pos(values.monthlySales, 20000);
  const cryptoSharePercent = Math.min(100, pos(values.cryptoSharePercent, 10));
  const cryptoFeePercent = pos(values.cryptoFeePercent, 1);
  const cardFeePercent = pos(values.cardFeePercent, 2.9);
  const cardFixedFee = pos(values.cardFixedFee, 0.3);
  const averageTicket = Math.max(0.01, pos(values.averageTicket, 50));

  const cryptoSales = (monthlySales * cryptoSharePercent) / 100;
  const cryptoFees = (cryptoSales * cryptoFeePercent) / 100;
  const cardFees = (cryptoSales * cardFeePercent) / 100 + (cryptoSales / averageTicket) * cardFixedFee;

  return {
    cryptoSales: round2(cryptoSales),
    cryptoProcessingFees: round2(cryptoFees),
    cardFeesOnSameSales: round2(cardFees),
    monthlySavings: round2(cardFees - cryptoFees),
    yearlySavings: round2((cardFees - cryptoFees) * 12),
    effectiveCardRate: round2(cryptoSales > 0 ? (cardFees / cryptoSales) * 100 : 0),
  };
};

// --- 2. Crypto Payroll Payment Value Calculator ----------------------------------------
export const cryptoPayrollCalculator: CustomCalculator = (values) => {
  const grossPay = pos(values.grossPay, 5000);
  const cryptoSharePercent = Math.min(100, pos(values.cryptoSharePercent, 20));
  const priceAtPay = pos(values.priceAtPay, 60000);
  const priceLater = pos(values.priceLater, 66000);
  const conversionFeePercent = Math.min(100, pos(values.conversionFeePercent, 1));

  const cryptoPortion = (grossPay * cryptoSharePercent) / 100;
  const coins = priceAtPay > 0 ? (cryptoPortion * (1 - conversionFeePercent / 100)) / priceAtPay : 0;
  const later = coins * priceLater;

  return {
    cryptoPortion: round2(cryptoPortion),
    coinsReceived: round8(coins),
    valueAtLaterPrice: round2(later),
    gainOrLossSincePayday: round2(later - coins * priceAtPay),
    wagesTaxedAs: round2(grossPay),
  };
};

// --- 3. Crypto Card Rewards Calculator -------------------------------------------------
export const cryptoCardRewardsCalculator: CustomCalculator = (values) => {
  const monthlySpend = pos(values.monthlySpend, 1500);
  const rewardRatePercent = pos(values.rewardRatePercent, 2);
  const tokenPriceChangePercent = safeNumber(values.tokenPriceChangePercent, -10);
  const annualFee = pos(values.annualFee, 0);
  const cashbackRatePercent = pos(values.cashbackRatePercent, 1.5);

  const atIssue = (monthlySpend * 12 * rewardRatePercent) / 100;
  const after = Math.max(0, atIssue * (1 + tokenPriceChangePercent / 100));
  const net = after - annualFee;
  const cash = (monthlySpend * 12 * cashbackRatePercent) / 100;

  return {
    rewardsAtIssueValue: round2(atIssue),
    rewardsAfterPriceChange: round2(after),
    netRewardsAfterFee: round2(net),
    regularCashbackCard: round2(cash),
    advantageOverCashback: round2(net - cash),
  };
};

// --- 4. Crypto Referral Bonus Calculator -----------------------------------------------
export const cryptoReferralBonusCalculator: CustomCalculator = (values) => {
  const bonusPerReferral = pos(values.bonusPerReferral, 50);
  const referrals = pos(values.referrals, 5);
  const monthlyVolumePerReferral = pos(values.monthlyVolumePerReferral, 2000);
  const feeRatePercent = pos(values.feeRatePercent, 0.1);
  const commissionSharePercent = Math.min(100, pos(values.commissionSharePercent, 20));
  const months = pos(values.months, 12);
  const taxRatePercent = Math.min(100, pos(values.taxRatePercent, 22));

  const bonuses = bonusPerReferral * referrals;
  const commission = referrals * monthlyVolumePerReferral * (feeRatePercent / 100) * (commissionSharePercent / 100) * months;
  const total = bonuses + commission;

  return {
    signUpBonuses: round2(bonuses),
    commissionIncome: round2(commission),
    totalValue: round2(total),
    afterTaxValue: round2(total * (1 - taxRatePercent / 100)),
  };
};

// --- 5. Crypto-Backed Loan Calculator --------------------------------------------------
export const cryptoBackedLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = pos(values.loanAmount, 20000);
  const collateralCoins = pos(values.collateralCoins, 0.75);
  const coinPrice = pos(values.coinPrice, 60000);
  const ratePercent = pos(values.ratePercent, 11);
  const termMonths = Math.max(1, pos(values.termMonths, 12));
  const originationFeePercent = pos(values.originationFeePercent, 2);
  const marginCallLtvPercent = Math.max(1, pos(values.marginCallLtvPercent, 70));
  const liquidationLtvPercent = Math.max(1, pos(values.liquidationLtvPercent, 83));

  const collateral = collateralCoins * coinPrice;
  const interest = (loanAmount * ratePercent * termMonths) / 1200;
  const fee = (loanAmount * originationFeePercent) / 100;
  const liq = collateralCoins > 0 ? loanAmount / (collateralCoins * (liquidationLtvPercent / 100)) : 0;

  return {
    collateralValue: round2(collateral),
    loanToValuePercent: round2(collateral > 0 ? (loanAmount / collateral) * 100 : 0),
    totalInterest: round2(interest),
    originationFee: round2(fee),
    totalBorrowingCost: round2(interest + fee),
    effectiveAnnualRate: round2(loanAmount > 0 ? ((interest + fee) / loanAmount) * (12 / termMonths) * 100 : 0),
    marginCallPrice: round2(collateralCoins > 0 ? loanAmount / (collateralCoins * (marginCallLtvPercent / 100)) : 0),
    liquidationPrice: round2(liq),
    priceDropToLiquidationPercent: round2(coinPrice > 0 ? Math.max(0, (1 - liq / coinPrice) * 100) : 0),
  };
};

export const cryptoPaymentsLoansCustomCalculators: Record<string, CustomCalculator> = {
  "crypto-merchant-processing-fee-calculator": cryptoMerchantProcessingFeeCalculator,
  "crypto-payroll-calculator": cryptoPayrollCalculator,
  "crypto-card-rewards-calculator": cryptoCardRewardsCalculator,
  "crypto-referral-bonus-calculator": cryptoReferralBonusCalculator,
  "crypto-backed-loan-calculator": cryptoBackedLoanCalculator,
};
