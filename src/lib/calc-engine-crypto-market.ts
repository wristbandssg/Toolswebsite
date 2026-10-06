/**
 * Batch: "Crypto Calculators" expansion (6 Oct 2026), sub-batch 7 of 8 —
 * Tokens & Market Analysis (9 tools), filed under Crypto Calculators > Crypto
 * Market, Tax & Security Calculators. See calc-engine-crypto-trading.ts for
 * the full batch context.
 *
 *  - tokenVestingSchedule: TGE unlock, cliff, then linear monthly vesting;
 *    unlocked/locked tokens and value at a given month.
 *  - tokenInflationBurn (incl. token burn impact on price): yearly emission
 *    less burn -> supply after N years; price at an unchanged market cap.
 *  - cryptoMarketCapComparison (incl. crypto dominance share): price if the
 *    coin had a target market cap; current and target dominance.
 *  - daoGovernanceTokenValue: holding value, voting power, treasury per
 *    token (price-to-treasury), tokens needed for quorum.
 *  - cryptoIndexFundReturn (incl. index weighting impact): market-cap
 *    weighted vs equal weighted return of 4 assets, after the expense ratio.
 *  - cryptoDiversificationScore: Herfindahl index of up to 6 holdings ->
 *    effective number of holdings and a 0-100 score.
 *  - cryptoReturnComparison (incl. crypto vs gold, crypto vs stocks,
 *    altcoin season): growth of the same investment at each asset's yearly
 *    return.
 *  - cryptoStockCorrelation: Pearson correlation, R-squared and beta from
 *    6 months of paired returns.
 *  - cryptoVolatilityComparison: daily volatility annualized by sqrt(trading
 *    days); typical 1-standard-deviation moves.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-crypto-market-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Token Vesting Schedule Calculator ----------------------------------------------
export const tokenVestingScheduleCalculator: CustomCalculator = (values) => {
  const totalTokens = pos(values.totalTokens, 100000);
  const tokenPrice = pos(values.tokenPrice, 0.5);
  const tgeUnlockPercent = Math.min(100, pos(values.tgeUnlockPercent, 10));
  const cliffMonths = pos(values.cliffMonths, 12);
  const vestingMonths = Math.max(1, pos(values.vestingMonths, 36));
  const monthsElapsed = pos(values.monthsElapsed, 18);

  const tge = (totalTokens * tgeUnlockPercent) / 100;
  const rest = totalTokens - tge;
  const vestedMonths = Math.min(vestingMonths, Math.max(0, monthsElapsed - cliffMonths));
  const unlocked = tge + (rest * vestedMonths) / vestingMonths;

  return {
    unlockedTokens: round2(unlocked),
    unlockedPercent: round2(totalTokens > 0 ? (unlocked / totalTokens) * 100 : 0),
    unlockedValue: round2(unlocked * tokenPrice),
    lockedTokens: round2(totalTokens - unlocked),
    monthlyUnlockAfterCliff: round2(rest / vestingMonths),
    fullyVestedAtMonth: round2(cliffMonths + vestingMonths),
  };
};

// --- 2. Token Inflation & Burn Calculator ----------------------------------------------
export const tokenInflationBurnCalculator: CustomCalculator = (values) => {
  const supply = pos(values.supply, 1000000000);
  const emissionPercent = pos(values.emissionPercent, 5);
  const burnPercent = pos(values.burnPercent, 2);
  const years = Math.min(100, pos(values.years, 3));
  const price = pos(values.price, 1);

  let s = supply;
  let burned = 0;
  const whole = Math.floor(years);
  for (let y = 0; y < whole; y++) {
    burned += (s * burnPercent) / 100;
    s *= 1 + (emissionPercent - burnPercent) / 100;
  }
  const frac = years - whole;
  if (frac > 0) {
    burned += (s * burnPercent * frac) / 100;
    s *= Math.pow(1 + (emissionPercent - burnPercent) / 100, frac);
  }
  const priceAfter = s > 0 ? (price * supply) / s : 0;

  return {
    netInflationPercent: round2(emissionPercent - burnPercent),
    supplyAfterYears: round2(s),
    tokensBurned: round2(burned),
    priceAtSameMarketCap: round4(priceAfter),
    priceChangeFromSupplyPercent: round2(price > 0 ? (priceAfter / price - 1) * 100 : 0),
  };
};

// --- 3. Crypto Market Cap Comparison Calculator ----------------------------------------
export const cryptoMarketCapComparisonCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 0.5);
  const circulatingSupply = pos(values.circulatingSupply, 35000000000);
  const targetMarketCap = pos(values.targetMarketCap, 1200000000000);
  const totalMarketCap = pos(values.totalMarketCap, 2400000000000);

  const cap = price * circulatingSupply;
  const targetPrice = circulatingSupply > 0 ? targetMarketCap / circulatingSupply : 0;

  return {
    currentMarketCap: round2(cap),
    priceAtTargetMarketCap: round4(targetPrice),
    multipleFromToday: round2(price > 0 ? targetPrice / price : 0),
    currentDominancePercent: round2(totalMarketCap > 0 ? (cap / totalMarketCap) * 100 : 0),
    dominanceAtTargetPercent: round2(totalMarketCap - cap + targetMarketCap > 0 ? (targetMarketCap / (totalMarketCap - cap + targetMarketCap)) * 100 : 0),
  };
};

// --- 4. DAO Governance Token Value Calculator ------------------------------------------
export const daoGovernanceTokenValueCalculator: CustomCalculator = (values) => {
  const tokensHeld = pos(values.tokensHeld, 5000);
  const totalSupply = pos(values.totalSupply, 100000000);
  const tokenPrice = pos(values.tokenPrice, 2);
  const treasuryValue = pos(values.treasuryValue, 500000000);
  const quorumPercent = Math.min(100, pos(values.quorumPercent, 4));
  const turnoutPercent = Math.min(100, pos(values.turnoutPercent, 10));

  const treasuryPerToken = totalSupply > 0 ? treasuryValue / totalSupply : 0;
  const turnoutTokens = (totalSupply * turnoutPercent) / 100;

  return {
    holdingValue: round2(tokensHeld * tokenPrice),
    votingPowerPercent: round4(totalSupply > 0 ? (tokensHeld / totalSupply) * 100 : 0),
    treasuryPerToken: round4(treasuryPerToken),
    yourTreasuryShare: round2(tokensHeld * treasuryPerToken),
    priceToTreasuryRatio: round2(treasuryPerToken > 0 ? tokenPrice / treasuryPerToken : 0),
    tokensNeededForQuorum: round2((totalSupply * quorumPercent) / 100),
    shareOfTypicalVotePercent: round4(turnoutTokens > 0 ? (tokensHeld / turnoutTokens) * 100 : 0),
  };
};

// --- 5. Crypto Index Fund Return Calculator --------------------------------------------
export const cryptoIndexFundReturnCalculator: CustomCalculator = (values) => {
  const investment = pos(values.investment, 10000);
  const years = pos(values.years, 1);
  const expenseRatioPercent = Math.min(100, pos(values.expenseRatioPercent, 2.5));
  const weights = [pos(values.weight1, 60), pos(values.weight2, 25), pos(values.weight3, 10), pos(values.weight4, 5)];
  const returns = [
    Math.max(-100, safeNumber(values.return1, 50)),
    Math.max(-100, safeNumber(values.return2, 80)),
    Math.max(-100, safeNumber(values.return3, 120)),
    Math.max(-100, safeNumber(values.return4, -20)),
  ];

  const wTotal = weights.reduce((s, w) => s + w, 0);
  const capWeighted = wTotal > 0 ? weights.reduce((s, w, k) => s + (w / wTotal) * returns[k], 0) : 0;
  const equal = returns.reduce((s, r) => s + r, 0) / 4;
  const feeFactor = Math.pow(1 - expenseRatioPercent / 100, years);
  const capValue = investment * (1 + capWeighted / 100) * feeFactor;
  const equalValue = investment * (1 + equal / 100) * feeFactor;

  return {
    capWeightedReturnPercent: round2(capWeighted),
    equalWeightedReturnPercent: round2(equal),
    capWeightedValueAfterFees: round2(capValue),
    equalWeightedValueAfterFees: round2(equalValue),
    feesPaidApprox: round2(investment * (1 + capWeighted / 100) * (1 - feeFactor)),
    weightingDifference: round2(capValue - equalValue),
  };
};

// --- 6. Crypto Portfolio Diversification Score Calculator ------------------------------
export const cryptoDiversificationScoreCalculator: CustomCalculator = (values) => {
  const vals = [
    pos(values.value1, 7000),
    pos(values.value2, 3000),
    pos(values.value3, 2000),
    pos(values.value4, 1000),
    pos(values.value5, 500),
    pos(values.value6, 500),
  ];
  const total = vals.reduce((s, v) => s + v, 0);
  const w = total > 0 ? vals.map((v) => v / total) : vals.map(() => 0);
  const hhi = w.reduce((s, x) => s + x * x, 0);
  const sorted = [...w].sort((a, b) => b - a);

  return {
    totalValue: round2(total),
    largestHoldingPercent: round2(sorted[0] * 100),
    topTwoPercent: round2((sorted[0] + sorted[1]) * 100),
    concentrationIndex: round4(hhi),
    effectiveNumberOfHoldings: round2(hhi > 0 ? 1 / hhi : 0),
    diversificationScore: round2(total > 0 ? (1 - hhi) * 100 : 0),
  };
};

// --- 7. Crypto Return Comparison Calculator --------------------------------------------
export const cryptoReturnComparisonCalculator: CustomCalculator = (values) => {
  const investment = pos(values.investment, 10000);
  const years = pos(values.years, 5);
  const rates = [
    Math.max(-100, safeNumber(values.bitcoinReturn, 30)),
    Math.max(-100, safeNumber(values.altcoinReturn, 15)),
    Math.max(-100, safeNumber(values.stocksReturn, 10)),
    Math.max(-100, safeNumber(values.goldReturn, 6)),
  ];
  const v = rates.map((r) => investment * Math.pow(1 + r / 100, years));

  return {
    bitcoinValue: round2(v[0]),
    altcoinValue: round2(v[1]),
    stocksValue: round2(v[2]),
    goldValue: round2(v[3]),
    bestValue: round2(Math.max(...v)),
    bitcoinVsStocks: round2(v[0] - v[2]),
    altcoinsVsBitcoin: round2(v[1] - v[0]),
  };
};

// --- 8. Crypto Correlation to Stock Market Calculator ----------------------------------
export const cryptoStockCorrelationCalculator: CustomCalculator = (values) => {
  const c = [5, -8, 12, -3, 9, -6].map((d, k) => safeNumber(values[`crypto${k + 1}`], d));
  const s = [3, -2, 1, 2, 1, -3].map((d, k) => safeNumber(values[`stock${k + 1}`], d));
  const n = c.length;
  const mc = c.reduce((a, b) => a + b, 0) / n;
  const ms = s.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let vc = 0;
  let vs = 0;
  for (let k = 0; k < n; k++) {
    cov += (c[k] - mc) * (s[k] - ms);
    vc += (c[k] - mc) ** 2;
    vs += (s[k] - ms) ** 2;
  }
  const r = vc > 0 && vs > 0 ? cov / Math.sqrt(vc * vs) : 0;

  return {
    correlation: round4(r),
    rSquared: round4(r * r),
    cryptoAverageReturn: round2(mc),
    stockAverageReturn: round2(ms),
    betaToStocks: round2(vs > 0 ? cov / vs : 0),
  };
};

// --- 9. Crypto Volatility Comparison Calculator ----------------------------------------
export const cryptoVolatilityComparisonCalculator: CustomCalculator = (values) => {
  const dailyVolA = pos(values.dailyVolA, 3.5);
  const tradingDaysA = Math.max(1, pos(values.tradingDaysA, 365));
  const dailyVolB = pos(values.dailyVolB, 1.1);
  const tradingDaysB = Math.max(1, pos(values.tradingDaysB, 252));
  const investment = pos(values.investment, 10000);

  const annualA = dailyVolA * Math.sqrt(tradingDaysA);
  const annualB = dailyVolB * Math.sqrt(tradingDaysB);

  return {
    annualVolatilityA: round2(annualA),
    annualVolatilityB: round2(annualB),
    volatilityRatio: round2(annualB > 0 ? annualA / annualB : 0),
    typicalMonthlyMoveA: round2((investment * dailyVolA * Math.sqrt(30)) / 100),
    typicalMonthlyMoveB: round2((investment * dailyVolB * Math.sqrt(21)) / 100),
    typicalYearlyMoveA: round2((investment * annualA) / 100),
    typicalYearlyMoveB: round2((investment * annualB) / 100),
  };
};

export const cryptoMarketCustomCalculators: Record<string, CustomCalculator> = {
  "token-vesting-schedule-calculator": tokenVestingScheduleCalculator,
  "token-inflation-burn-calculator": tokenInflationBurnCalculator,
  "crypto-market-cap-comparison-calculator": cryptoMarketCapComparisonCalculator,
  "dao-governance-token-value-calculator": daoGovernanceTokenValueCalculator,
  "crypto-index-fund-return-calculator": cryptoIndexFundReturnCalculator,
  "crypto-diversification-score-calculator": cryptoDiversificationScoreCalculator,
  "crypto-return-comparison-calculator": cryptoReturnComparisonCalculator,
  "crypto-stock-correlation-calculator": cryptoStockCorrelationCalculator,
  "crypto-volatility-comparison-calculator": cryptoVolatilityComparisonCalculator,
};
