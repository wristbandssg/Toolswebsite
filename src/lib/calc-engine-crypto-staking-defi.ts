/**
 * Batch: "Crypto Calculators" expansion (6 Oct 2026), sub-batch 5 of 8 —
 * Staking, DeFi & Yield (10 tools), filed under Crypto Calculators > Crypto
 * Staking, DeFi & Mining Calculators. See calc-engine-crypto-trading.ts for
 * the full batch context.
 *
 *  - cryptoStakingReward: APR less validator commission, compounded (none /
 *    monthly / daily) -> reward coins and value at a future price.
 *  - cryptoValidatorRevenue (incl. node operator revenue): own-stake rewards
 *    x uptime + commission on delegated stake - server costs - expected
 *    slashing loss.
 *  - liquidStakingReturn: staking APR less protocol fee + DeFi yield on the
 *    liquid staking token; exit cost at a discount; vs native staking.
 *  - cryptoRestakingReturn (incl. slashing risk loss): base staking + extra
 *    restaking rewards less operator fee, less expected slashing loss.
 *  - yieldFarmingApy (incl. yield aggregator return): APR after performance
 *    fee, compounded -> APY; reward token price change applied to earnings.
 *  - liquidityPoolReturn: 50/50 pool value with impermanent loss + trading
 *    fee and reward income vs holding.
 *  - impermanentLoss: IL = 2 sqrt(r) / (1 + r) - 1 for the price ratio r.
 *  - cryptoLendingInterest: APR compounded, less platform fee, at a future
 *    coin price.
 *  - stablecoinYield (incl. fixed-term crypto deposit): flexible (daily
 *    compounding) vs fixed-term (simple) vs a bank savings rate.
 *  - cryptoAirdropValue: unlocked share, income tax on receipt, claim gas,
 *    value after a price drop.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-crypto-staking-defi-calculators.ts for the copy.
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
const pick = (v: number, d: number, n: number) => {
  const r = Math.round(safeNumber(v, d));
  return r >= 1 && r <= n ? r : d;
};
const periods = (choice: number) => [0, 12, 365][choice - 1];

// Growth factor for an annual rate over `years`, with n compounding periods a year (0 = simple).
function grow(rate: number, n: number, years: number): number {
  return n === 0 ? 1 + rate * years : Math.pow(1 + rate / n, n * years);
}

// --- 1. Crypto Staking Reward Calculator -----------------------------------------------
export const cryptoStakingRewardCalculator: CustomCalculator = (values) => {
  const stakedCoins = pos(values.stakedCoins, 10);
  const coinPrice = pos(values.coinPrice, 3500);
  const aprPercent = pos(values.aprPercent, 4);
  const commissionPercent = Math.min(100, pos(values.commissionPercent, 5));
  const compounding = pick(values.compounding, 1, 3);
  const years = pos(values.years, 1);
  const priceChangePercent = Math.max(-100, safeNumber(values.priceChangePercent, 0));

  const r = (aprPercent / 100) * (1 - commissionPercent / 100);
  const n = periods(compounding);
  const coinsEnd = stakedCoins * grow(r, n, years);
  const futurePrice = coinPrice * (1 + priceChangePercent / 100);
  const reward = coinsEnd - stakedCoins;

  return {
    netAprPercent: round2(r * 100),
    apyPercent: round2((grow(r, n, 1) - 1) * 100),
    rewardCoins: round8(reward),
    rewardValue: round2(reward * futurePrice),
    totalValue: round2(coinsEnd * futurePrice),
    averageMonthlyReward: round2(years > 0 ? (reward * futurePrice) / (years * 12) : 0),
  };
};

// --- 2. Crypto Validator & Node Operator Revenue Calculator ----------------------------
export const cryptoValidatorRevenueCalculator: CustomCalculator = (values) => {
  const selfStakeCoins = pos(values.selfStakeCoins, 32);
  const coinPrice = pos(values.coinPrice, 3500);
  const rewardAprPercent = pos(values.rewardAprPercent, 3.5);
  const uptimePercent = Math.min(100, pos(values.uptimePercent, 99));
  const delegatedCoins = pos(values.delegatedCoins, 0);
  const commissionPercent = Math.min(100, pos(values.commissionPercent, 10));
  const serverCostMonthly = pos(values.serverCostMonthly, 100);
  const slashingRiskPercent = Math.min(100, pos(values.slashingRiskPercent, 0.1));

  const own = selfStakeCoins * coinPrice * (rewardAprPercent / 100) * (uptimePercent / 100);
  const commission = delegatedCoins * coinPrice * (rewardAprPercent / 100) * (uptimePercent / 100) * (commissionPercent / 100);
  const costs = serverCostMonthly * 12;
  const slashing = (selfStakeCoins * coinPrice * slashingRiskPercent) / 100;
  const net = own + commission - costs - slashing;
  const stakeValue = selfStakeCoins * coinPrice;

  return {
    selfStakeValue: round2(stakeValue),
    ownStakeRewards: round2(own),
    commissionIncome: round2(commission),
    yearlyCosts: round2(costs),
    expectedSlashingLoss: round2(slashing),
    netYearlyRevenue: round2(net),
    netAprOnStake: round2(stakeValue > 0 ? (net / stakeValue) * 100 : 0),
  };
};

// --- 3. Liquid Staking Return Calculator -----------------------------------------------
export const liquidStakingReturnCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 10000);
  const stakingAprPercent = pos(values.stakingAprPercent, 3.5);
  const protocolFeePercent = Math.min(100, pos(values.protocolFeePercent, 10));
  const defiYieldPercent = pos(values.defiYieldPercent, 2);
  const exitDiscountPercent = Math.min(100, pos(values.exitDiscountPercent, 0.2));
  const years = pos(values.years, 1);

  const stakingNet = stakingAprPercent * (1 - protocolFeePercent / 100);
  const combined = stakingNet + defiYieldPercent;
  const end = amount * Math.pow(1 + combined / 100, years);
  const native = amount * Math.pow(1 + stakingAprPercent / 100, years);

  return {
    netStakingApr: round2(stakingNet),
    combinedApr: round2(combined),
    valueAfterYears: round2(end),
    earnings: round2(end - amount),
    advantageVsNativeStaking: round2(end - native),
    costToExitAtDiscount: round2((end * exitDiscountPercent) / 100),
  };
};

// --- 4. Crypto Restaking Return Calculator ---------------------------------------------
export const cryptoRestakingReturnCalculator: CustomCalculator = (values) => {
  const stakeValue = pos(values.stakeValue, 10000);
  const baseAprPercent = pos(values.baseAprPercent, 3.5);
  const restakingAprPercent = pos(values.restakingAprPercent, 2.5);
  const operatorFeePercent = Math.min(100, pos(values.operatorFeePercent, 10));
  const slashingChancePercent = Math.min(100, pos(values.slashingChancePercent, 1));
  const slashingLossPercent = Math.min(100, pos(values.slashingLossPercent, 5));

  const base = (stakeValue * baseAprPercent) / 100;
  const restake = ((stakeValue * restakingAprPercent) / 100) * (1 - operatorFeePercent / 100);
  const slashing = stakeValue * (slashingChancePercent / 100) * (slashingLossPercent / 100);
  const net = base + restake - slashing;

  return {
    baseStakingRewards: round2(base),
    restakingRewards: round2(restake),
    expectedSlashingLoss: round2(slashing),
    netExpectedReturn: round2(net),
    netExpectedApr: round2(stakeValue > 0 ? (net / stakeValue) * 100 : 0),
    extraVsPlainStaking: round2(restake - slashing),
  };
};

// --- 5. Yield Farming APY Calculator ---------------------------------------------------
export const yieldFarmingApyCalculator: CustomCalculator = (values) => {
  const deposit = pos(values.deposit, 10000);
  const aprPercent = pos(values.aprPercent, 20);
  const compounding = pick(values.compounding, 3, 3);
  const performanceFeePercent = Math.min(100, pos(values.performanceFeePercent, 10));
  const rewardTokenChangePercent = Math.max(-100, safeNumber(values.rewardTokenChangePercent, 0));
  const days = pos(values.days, 365);

  const r = (aprPercent / 100) * (1 - performanceFeePercent / 100);
  const n = periods(compounding);
  const earnings = deposit * (grow(r, n, days / 365) - 1) * (1 + rewardTokenChangePercent / 100);

  return {
    aprAfterFees: round2(r * 100),
    apyPercent: round2((grow(r, n, 1) - 1) * 100),
    earnings: round2(earnings),
    endingValue: round2(deposit + earnings),
  };
};

// Impermanent loss for a 50/50 pool when token A's price changes by a% and B's by b%.
function impermanentLoss(aPercent: number, bPercent: number): number {
  const ra = 1 + aPercent / 100;
  const rb = 1 + bPercent / 100;
  if (ra <= 0 || rb <= 0) return -1;
  const r = ra / rb;
  return (2 * Math.sqrt(r)) / (1 + r) - 1;
}

// --- 6. Liquidity Pool Return Calculator -----------------------------------------------
export const liquidityPoolReturnCalculator: CustomCalculator = (values) => {
  const deposit = pos(values.deposit, 10000);
  const feeAprPercent = pos(values.feeAprPercent, 15);
  const rewardsAprPercent = pos(values.rewardsAprPercent, 5);
  const priceChangeAPercent = Math.max(-100, safeNumber(values.priceChangeAPercent, 50));
  const priceChangeBPercent = Math.max(-100, safeNumber(values.priceChangeBPercent, 0));
  const days = pos(values.days, 365);

  const hodl = (deposit / 2) * (1 + priceChangeAPercent / 100) + (deposit / 2) * (1 + priceChangeBPercent / 100);
  const il = impermanentLoss(priceChangeAPercent, priceChangeBPercent);
  const pool = hodl * (1 + il);
  const income = (deposit * (feeAprPercent + rewardsAprPercent) * days) / 36500;

  return {
    holdValue: round2(hodl),
    impermanentLossPercent: round2(il * 100),
    impermanentLossValue: round2(hodl - pool),
    feeAndRewardIncome: round2(income),
    liquidityPositionValue: round2(pool + income),
    resultVsHolding: round2(pool + income - hodl),
  };
};

// --- 7. Impermanent Loss Calculator ----------------------------------------------------
export const impermanentLossCalculator: CustomCalculator = (values) => {
  const deposit = pos(values.deposit, 10000);
  const priceChangeAPercent = Math.max(-100, safeNumber(values.priceChangeAPercent, 100));
  const priceChangeBPercent = Math.max(-100, safeNumber(values.priceChangeBPercent, 0));

  const hodl = (deposit / 2) * (1 + priceChangeAPercent / 100) + (deposit / 2) * (1 + priceChangeBPercent / 100);
  const il = impermanentLoss(priceChangeAPercent, priceChangeBPercent);

  return {
    impermanentLossPercent: round2(il * 100),
    holdValue: round2(hodl),
    poolValue: round2(hodl * (1 + il)),
    lossVsHolding: round2(-hodl * il),
  };
};

// --- 8. Crypto Lending Interest Calculator ---------------------------------------------
export const cryptoLendingInterestCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 10000);
  const aprPercent = pos(values.aprPercent, 5);
  const compounding = pick(values.compounding, 3, 3);
  const platformFeePercent = Math.min(100, pos(values.platformFeePercent, 0));
  const years = pos(values.years, 1);
  const priceChangePercent = Math.max(-100, safeNumber(values.priceChangePercent, 0));

  const r = (aprPercent / 100) * (1 - platformFeePercent / 100);
  const n = periods(compounding);
  const f = grow(r, n, years);
  const price = 1 + priceChangePercent / 100;

  return {
    apyPercent: round2((grow(r, n, 1) - 1) * 100),
    interestAtTodaysPrice: round2(amount * (f - 1)),
    interestAtFuturePrice: round2(amount * (f - 1) * price),
    endingValue: round2(amount * f * price),
  };
};

// --- 9. Stablecoin Yield Calculator ----------------------------------------------------
export const stablecoinYieldCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 10000);
  const flexibleAprPercent = pos(values.flexibleAprPercent, 4);
  const fixedAprPercent = pos(values.fixedAprPercent, 6);
  const termDays = pos(values.termDays, 90);
  const bankApyPercent = pos(values.bankApyPercent, 3.8);

  const flexible = amount * (Math.pow(1 + flexibleAprPercent / 36500, termDays) - 1);
  const fixed = (amount * fixedAprPercent * termDays) / 36500;
  const bank = amount * (Math.pow(1 + bankApyPercent / 100, termDays / 365) - 1);

  return {
    flexibleEarnings: round2(flexible),
    fixedTermEarnings: round2(fixed),
    bankSavingsEarnings: round2(bank),
    fixedTermExtraVsFlexible: round2(fixed - flexible),
    fixedTermExtraVsBank: round2(fixed - bank),
  };
};

// --- 10. Crypto Airdrop Value Calculator -----------------------------------------------
export const cryptoAirdropValueCalculator: CustomCalculator = (values) => {
  const tokens = pos(values.tokens, 1000);
  const tokenPrice = pos(values.tokenPrice, 0.85);
  const unlockedPercent = Math.min(100, pos(values.unlockedPercent, 25));
  const claimGas = pos(values.claimGas, 10);
  const taxRatePercent = Math.min(100, pos(values.taxRatePercent, 24));
  const priceChangePercent = Math.max(-100, safeNumber(values.priceChangePercent, -30));

  const total = tokens * tokenPrice;
  const unlocked = (total * unlockedPercent) / 100;
  const tax = (unlocked * taxRatePercent) / 100;

  return {
    totalValueAtClaim: round2(total),
    unlockedValue: round2(unlocked),
    incomeTaxOnUnlocked: round2(tax),
    netValueNow: round2(unlocked - tax - claimGas),
    totalValueAfterPriceChange: round2(total * (1 + priceChangePercent / 100)),
  };
};

export const cryptoStakingDefiCustomCalculators: Record<string, CustomCalculator> = {
  "crypto-staking-reward-calculator": cryptoStakingRewardCalculator,
  "crypto-validator-revenue-calculator": cryptoValidatorRevenueCalculator,
  "liquid-staking-return-calculator": liquidStakingReturnCalculator,
  "crypto-restaking-return-calculator": cryptoRestakingReturnCalculator,
  "yield-farming-apy-calculator": yieldFarmingApyCalculator,
  "liquidity-pool-return-calculator": liquidityPoolReturnCalculator,
  "impermanent-loss-calculator": impermanentLossCalculator,
  "crypto-lending-interest-calculator": cryptoLendingInterestCalculator,
  "stablecoin-yield-calculator": stablecoinYieldCalculator,
  "crypto-airdrop-value-calculator": cryptoAirdropValueCalculator,
};
