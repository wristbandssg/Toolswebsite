/**
 * Batch: "Retirement Calculators" sub-batch G (Annuities & Portfolio, 7
 * tools). Part of the Retirement Calculators build-out — see
 * calc-engine-retirement-planning.ts for the full list of 7 sub-batches.
 * Filed under Finance Calculators > Retirement Calculators.
 *
 * Near-namesakes, and how each is deliberately different — including from
 * the Investment category's portfolio-allocation-calculator, portfolio-
 * expected-return-calculator, required-rate-of-return-calculator and
 * investment-fee-impact-calculator, which aren't retirement-specific:
 *  - annuityRetirementIncomeCalculator: the monthly income a premium buys
 *    for a set number of years, and its payout rate.
 *  - guaranteedIncomeCalculator: how much of your ESSENTIAL spending
 *    guaranteed income covers, and the annuity premium to close the gap.
 *  - retirementPortfolioCalculator: a stock/bond/cash mix's expected return
 *    while you WITHDRAW from it — balance left after N years.
 *  - retirementAssetAllocationCalculator: age-based rules (100/110/120
 *    minus age) and where they put you in 10 years.
 *  - retirementInvestmentReturnCalculator: the return needed to reach a
 *    retirement target — nominal AND after inflation.
 *  - retirementFeeImpactCalculator: fees measured in lost RETIREMENT INCOME
 *    per year, not just a smaller balance.
 *  - retirementSequenceOfReturnsCalculator: the same average return with a
 *    crash early vs late in retirement.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-retirement-portfolio-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Future value of `pmt` deposited at the END of each of `n` periods at
// periodic rate `i`.
function fvAnnuity(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (Math.pow(1 + i, n) - 1)) / i;
}

// --- 1. Annuity Retirement Income Calculator -------------------------------
export const annuityRetirementIncomeCalculator: CustomCalculator = (values) => {
  const premium = Math.max(0, safeNumber(values.premium, 200000));
  const payoutYears = Math.max(1, Math.round(safeNumber(values.payoutYears, 20)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 5));

  const i = interestRatePercent / 100 / 12;
  const n = payoutYears * 12;
  const monthly = i === 0 ? premium / n : (premium * i) / (1 - Math.pow(1 + i, -n));

  return {
    monthlyIncome: round2(monthly),
    annualIncome: round2(monthly * 12),
    payoutRatePercent: premium > 0 ? round2(((monthly * 12) / premium) * 100) : 0,
    totalReceived: round2(monthly * n),
    interestEarned: round2(monthly * n - premium),
  };
};

// --- 2. Guaranteed Income Calculator (income floor) ------------------------
export const guaranteedIncomeCalculator: CustomCalculator = (values) => {
  const essentialMonthlyExpenses = Math.max(0, safeNumber(values.essentialMonthlyExpenses, 4500));
  const socialSecurityMonthly = Math.max(0, safeNumber(values.socialSecurityMonthly, 2500));
  const pensionMonthly = Math.max(0, safeNumber(values.pensionMonthly, 600));
  const annuityMonthly = Math.max(0, safeNumber(values.annuityMonthly, 0));
  const annuityPayoutRatePercent = Math.max(0.1, safeNumber(values.annuityPayoutRatePercent, 7));

  const guaranteed = socialSecurityMonthly + pensionMonthly + annuityMonthly;
  const gap = Math.max(0, essentialMonthlyExpenses - guaranteed);

  return {
    essentialsCoveredPercent: essentialMonthlyExpenses > 0 ? round2(Math.min(100, (guaranteed / essentialMonthlyExpenses) * 100)) : 0,
    guaranteedMonthlyIncome: round2(guaranteed),
    monthlyGap: round2(gap),
    annuityPremiumToCloseGap: round2((gap * 12) / (annuityPayoutRatePercent / 100)),
  };
};

// --- 3. Retirement Portfolio Calculator (mix + withdrawals) ----------------
export const retirementPortfolioCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 800000));
  const stockPercent = Math.min(100, Math.max(0, safeNumber(values.stockPercent, 50)));
  const bondPercent = Math.min(100 - stockPercent, Math.max(0, safeNumber(values.bondPercent, 40)));
  const stockReturnPercent = safeNumber(values.stockReturnPercent, 7);
  const bondReturnPercent = safeNumber(values.bondReturnPercent, 4);
  const cashReturnPercent = safeNumber(values.cashReturnPercent, 3);
  const annualWithdrawal = Math.max(0, safeNumber(values.annualWithdrawal, 40000));
  const years = Math.max(0, Math.round(safeNumber(values.years, 25)));

  const cashPercent = 100 - stockPercent - bondPercent;
  const expected = (stockPercent * stockReturnPercent + bondPercent * bondReturnPercent + cashPercent * cashReturnPercent) / 100;
  let running = balance;
  let withdrawn = 0;
  let lastsYears = 0;
  for (let y = 0; y < years; y++) {
    const w = Math.min(annualWithdrawal, running);
    running = (running - w) * (1 + expected / 100);
    withdrawn += w;
    if (running <= 0.005 && !lastsYears) lastsYears = y + 1;
  }

  return {
    expectedReturnPercent: round2(expected),
    balanceAfterPeriod: round2(Math.max(0, running)),
    totalWithdrawn: round2(withdrawn),
    cashPercent: round2(cashPercent),
    // 0 = the money lasts the whole period.
    yearMoneyRunsOut: lastsYears,
  };
};

// --- 4. Retirement Asset Allocation Calculator (age-based rules) --------
export const retirementAssetAllocationCalculator: CustomCalculator = (values) => {
  const age = Math.max(18, Math.min(100, Math.round(safeNumber(values.age, 55))));
  const balance = Math.max(0, safeNumber(values.balance, 400000));
  // The rule's base: 100 (cautious), 110 (moderate), 120 (growth).
  const ruleBase = safeNumber(values.ruleBase, 110);

  const stocksAt = (a: number) => Math.min(100, Math.max(0, ruleBase - a));
  const stocks = stocksAt(age);

  return {
    stockPercent: round2(stocks),
    bondPercent: round2(100 - stocks),
    amountInStocks: round2((balance * stocks) / 100),
    amountInBonds: round2((balance * (100 - stocks)) / 100),
    stockPercentIn10Years: round2(stocksAt(age + 10)),
  };
};

// --- 5. Retirement Investment Return Calculator (return needed) ----------
export const retirementInvestmentReturnCalculator: CustomCalculator = (values) => {
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 150000));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 1000));
  const years = Math.max(1, Math.round(safeNumber(values.years, 20)));
  const targetNestEgg = Math.max(0, safeNumber(values.targetNestEgg, 1000000));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  const n = years * 12;
  const fv = (i: number) => currentSavings * Math.pow(1 + i, n) + fvAnnuity(monthlyContribution, i, n);
  let nominal = 0;
  if (fv(0) < targetNestEgg) {
    let lo = 0;
    let hi = 0.05; // 5% a month (~80% a year) is a generous cap
    if (fv(hi) < targetNestEgg) nominal = Math.pow(1 + hi, 12) - 1;
    else {
      for (let k = 0; k < 200; k++) {
        const mid = (lo + hi) / 2;
        if (fv(mid) < targetNestEgg) lo = mid;
        else hi = mid;
      }
      nominal = Math.pow(1 + (lo + hi) / 2, 12) - 1;
    }
  }
  const real = (1 + nominal) / (1 + inflationPercent / 100) - 1;

  return {
    requiredAnnualReturnPercent: round2(nominal * 100),
    requiredRealReturnPercent: round2(real * 100),
    totalYouContribute: round2(currentSavings + monthlyContribution * n),
    growthNeeded: round2(Math.max(0, targetNestEgg - currentSavings - monthlyContribution * n)),
  };
};

// --- 6. Retirement Fee Impact Calculator (in lost income) -------------------
export const retirementFeeImpactCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 100000));
  const annualContribution = Math.max(0, safeNumber(values.annualContribution, 12000));
  const years = Math.max(0, Math.round(safeNumber(values.years, 25)));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);
  const feePercent = Math.max(0, safeNumber(values.feePercent, 1));
  const withdrawalRatePercent = Math.max(0, safeNumber(values.withdrawalRatePercent, 4));

  const grow = (r: number) => currentBalance * Math.pow(1 + r, years) + fvAnnuity(annualContribution, r, years);
  const noFee = grow(annualReturnPercent / 100);
  const withFee = grow((annualReturnPercent - feePercent) / 100);
  const lost = noFee - withFee;

  return {
    balanceWithFees: round2(withFee),
    balanceWithoutFees: round2(noFee),
    costOfFees: round2(lost),
    retirementIncomeLostPerYear: round2((lost * withdrawalRatePercent) / 100),
    shareOfBalanceLostPercent: noFee > 0 ? round2((lost / noFee) * 100) : 0,
  };
};

// --- 7. Retirement Sequence of Returns Calculator ---------------------------
export const retirementSequenceOfReturnsCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 1000000));
  const annualWithdrawal = Math.max(0, safeNumber(values.annualWithdrawal, 45000));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));
  const years = Math.max(3, Math.round(safeNumber(values.years, 30)));
  const averageReturnPercent = safeNumber(values.averageReturnPercent, 6);
  const crashReturnPercent = Math.max(-90, safeNumber(values.crashReturnPercent, -20));

  // Two crash years; the other years' return is set so the compound
  // average over the whole period is the same in every scenario.
  const avg = 1 + averageReturnPercent / 100;
  const crash = 1 + crashReturnPercent / 100;
  const other = Math.pow(Math.pow(avg, years) / (crash * crash), 1 / (years - 2));
  const run = (returnFor: (y: number) => number) => {
    let running = balance;
    let runsOut = 0;
    for (let y = 0; y < years; y++) {
      const w = annualWithdrawal * Math.pow(1 + inflationPercent / 100, y);
      if (w > running) {
        runsOut = y + 1;
        running = 0;
        break;
      }
      running = (running - w) * returnFor(y);
    }
    return { running, runsOut };
  };
  const early = run((y) => (y < 2 ? crash : other));
  const late = run((y) => (y >= years - 2 ? crash : other));
  const steady = run(() => avg);

  return {
    endingBalanceCrashEarly: round2(early.running),
    endingBalanceCrashLate: round2(late.running),
    endingBalanceSteadyReturns: round2(steady.running),
    costOfEarlyCrashVsLate: round2(late.running - early.running),
    // 0 = the money lasts the whole period.
    yearMoneyRunsOutCrashEarly: early.runsOut,
  };
};

export const retirementPortfolioCustomCalculators: Record<string, CustomCalculator> = {
  "annuity-retirement-income-calculator": annuityRetirementIncomeCalculator,
  "guaranteed-income-calculator": guaranteedIncomeCalculator,
  "retirement-portfolio-calculator": retirementPortfolioCalculator,
  "retirement-asset-allocation-calculator": retirementAssetAllocationCalculator,
  "retirement-investment-return-calculator": retirementInvestmentReturnCalculator,
  "retirement-fee-impact-calculator": retirementFeeImpactCalculator,
  "retirement-sequence-of-returns-calculator": retirementSequenceOfReturnsCalculator,
};
