/**
 * Batch: "Crypto Calculators" expansion (6 Oct 2026), sub-batch 8 of 8 —
 * Tax, Custody, Security & Speculation (10 tools), filed under Crypto
 * Calculators > Crypto Market, Tax & Security Calculators. See
 * calc-engine-crypto-trading.ts for the full batch context.
 *
 *  - cryptoTaxLossHarvesting (incl. wash sale rule impact): losses offset
 *    gains, then up to $3,000 of ordinary income, rest carried forward. The
 *    wash sale rule (IRC 1091) covers stocks and securities — crypto ETFs —
 *    but not crypto coins as of Oct 2026.
 *  - cryptoDonationTax: long-term holdings deduct fair market value (short-
 *    term: cost basis), capped at 30% of AGI, less the 0.5%-of-AGI floor for
 *    itemizers from 2026; plus capital gains tax avoided; vs selling first.
 *  - cryptoTaxSoftwareSavings: software + your time vs paying a CPA to
 *    reconcile manually; extra losses found.
 *  - cryptoColdStorageCost (incl. multi-sig wallet setup, hardware wallet
 *    comparison): devices, backups, setup and service fees vs the expected
 *    yearly loss of keeping coins on an exchange.
 *  - cryptoCustodyFee: custodian % fee over the years vs self-custody vs a
 *    spot ETF's expense ratio.
 *  - cryptoExchangeCustodialRisk (incl. insurance fund coverage): chance of
 *    exchange failure, bankruptcy recovery and insurance coverage -> expected
 *    loss; benefit of moving to self-custody.
 *  - cryptoScamLoss (incl. rug pull, dust attack, phishing loss): expected
 *    yearly loss from each risk on the amounts exposed.
 *  - cryptoWalletRecoveryCost: success chance x value less the recovery
 *    service's success fee and any upfront fee.
 *  - cryptoSportsBettingPayout: American odds at a crypto sportsbook (less
 *    deposit and withdrawal costs) vs a regular sportsbook.
 *  - predictionMarketReturn: shares at a price per $1 payout; profit if
 *    right, loss if wrong, expected value at your probability.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-crypto-tax-security-calculators.ts for the copy.
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
const flag = (v: number, d: number) => Math.round(safeNumber(v, d)) === 1;
const rate = (v: number, d: number) => Math.min(100, pos(v, d)) / 100;

// --- 1. Crypto Tax-Loss Harvesting Calculator ------------------------------------------
export const cryptoTaxLossHarvestingCalculator: CustomCalculator = (values) => {
  const unrealizedLoss = pos(values.unrealizedLoss, 8000);
  const realizedGains = pos(values.realizedGains, 5000);
  const gainsRate = rate(values.gainsRatePercent, 24);
  const ordinaryRate = rate(values.ordinaryRatePercent, 24);
  const assetType = pick(values.assetType, 1, 2);
  const rebuyWithin30Days = flag(values.rebuyWithin30Days, 1);

  const washSale = assetType === 2 && rebuyWithin30Days;
  const loss = washSale ? 0 : unrealizedLoss;
  const vsGains = Math.min(loss, realizedGains);
  const vsIncome = Math.min(3000, loss - vsGains);

  return {
    lossAllowedNow: round2(loss),
    gainsOffset: round2(vsGains),
    ordinaryIncomeOffset: round2(vsIncome),
    carryforward: round2(loss - vsGains - vsIncome),
    taxSavedThisYear: round2(vsGains * gainsRate + vsIncome * ordinaryRate),
    lossDisallowedByWashSale: round2(washSale ? unrealizedLoss : 0),
  };
};

// --- 2. Crypto Donation Tax Value Calculator -------------------------------------------
export const cryptoDonationTaxCalculator: CustomCalculator = (values) => {
  const cryptoValue = pos(values.cryptoValue, 10000);
  const costBasis = pos(values.costBasis, 2000);
  const longTerm = flag(values.longTerm, 1);
  const itemizes = flag(values.itemizes, 1);
  const marginalRate = rate(values.marginalRatePercent, 32);
  const capitalGainsRate = rate(values.capitalGainsRatePercent, 15);
  const agi = pos(values.agi, 200000);

  const floor = agi * 0.005;
  const base = longTerm ? cryptoValue : Math.min(cryptoValue, costBasis);
  const deduction = itemizes ? Math.max(0, Math.min(base, agi * 0.3) - floor) : 0;
  const deductionSavings = deduction * marginalRate;
  const gain = Math.max(0, cryptoValue - costBasis);
  const cgAvoided = longTerm ? gain * capitalGainsRate : gain * marginalRate;
  const benefit = deductionSavings + cgAvoided;
  // Alternative: sell, pay tax on the gain, donate the cash.
  const cash = cryptoValue - cgAvoided;
  const cashDeduction = itemizes ? Math.max(0, Math.min(cash, agi * 0.6) - floor) : 0;

  return {
    deductionAmount: round2(deduction),
    taxSavedByDeduction: round2(deductionSavings),
    capitalGainsTaxAvoided: round2(cgAvoided),
    totalTaxBenefit: round2(benefit),
    effectiveCostOfGift: round2(cryptoValue - benefit),
    extraBenefitVsSellingFirst: round2(benefit - cashDeduction * marginalRate),
  };
};

// --- 3. Crypto Tax Software Savings Calculator -----------------------------------------
export const cryptoTaxSoftwareSavingsCalculator: CustomCalculator = (values) => {
  const softwareCost = pos(values.softwareCost, 199);
  const cpaRate = pos(values.cpaRate, 200);
  const cpaHoursManual = pos(values.cpaHoursManual, 10);
  const yourHourlyValue = pos(values.yourHourlyValue, 40);
  const yourHoursManual = pos(values.yourHoursManual, 15);
  const yourHoursWithSoftware = pos(values.yourHoursWithSoftware, 2);
  const extraLossesFound = pos(values.extraLossesFound, 500);
  const taxRate = rate(values.taxRatePercent, 24);

  const manual = cpaRate * cpaHoursManual + yourHourlyValue * yourHoursManual;
  const software = softwareCost + yourHourlyValue * yourHoursWithSoftware;
  const lossSavings = extraLossesFound * taxRate;

  return {
    manualCost: round2(manual),
    softwareRouteCost: round2(software),
    timeAndFeeSavings: round2(manual - software),
    taxSavedFromLossesFound: round2(lossSavings),
    totalBenefit: round2(manual - software + lossSavings),
  };
};

// --- 4. Crypto Cold Storage Cost Calculator --------------------------------------------
export const cryptoColdStorageCostCalculator: CustomCalculator = (values) => {
  const devicePrice = pos(values.devicePrice, 149);
  const devices = Math.max(1, Math.round(pos(values.devices, 1)));
  const backupPerDevice = pos(values.backupPerDevice, 50);
  const setupFee = pos(values.setupFee, 0);
  const yearlyServiceFee = pos(values.yearlyServiceFee, 0);
  const cheaperDevicePrice = pos(values.cheaperDevicePrice, 79);
  const holdingsValue = pos(values.holdingsValue, 50000);
  const exchangeRisk = rate(values.exchangeRiskPercent, 1);

  const upfront = devices * (devicePrice + backupPerDevice) + setupFee;
  const avoided = holdingsValue * exchangeRisk;

  return {
    upfrontCost: round2(upfront),
    firstYearCost: round2(upfront + yearlyServiceFee),
    costAsShareOfHoldings: round2(holdingsValue > 0 ? ((upfront + yearlyServiceFee) / holdingsValue) * 100 : 0),
    expectedYearlyLossAvoided: round2(avoided),
    paybackMonths: round2(avoided - yearlyServiceFee > 0 ? (upfront / (avoided - yearlyServiceFee)) * 12 : 0),
    savingsWithCheaperDevice: round2(Math.max(0, devicePrice - cheaperDevicePrice) * devices),
  };
};

// --- 5. Crypto Custody Fee Calculator --------------------------------------------------
export const cryptoCustodyFeeCalculator: CustomCalculator = (values) => {
  const holdingsValue = pos(values.holdingsValue, 1000000);
  const custodyFeePercent = pos(values.custodyFeePercent, 0.5);
  const years = pos(values.years, 5);
  const selfCustodySetup = pos(values.selfCustodySetup, 1500);
  const selfCustodyYearly = pos(values.selfCustodyYearly, 500);
  const etfExpensePercent = pos(values.etfExpensePercent, 0.25);

  const yearly = (holdingsValue * custodyFeePercent) / 100;
  const custodian = yearly * years;
  const self = selfCustodySetup + selfCustodyYearly * years;
  const etf = ((holdingsValue * etfExpensePercent) / 100) * years;

  return {
    yearlyCustodyFee: round2(yearly),
    custodianTotal: round2(custodian),
    selfCustodyTotal: round2(self),
    spotEtfTotal: round2(etf),
    savingsWithSelfCustody: round2(custodian - self),
  };
};

// --- 6. Crypto Exchange Custodial Risk Calculator --------------------------------------
export const cryptoExchangeCustodialRiskCalculator: CustomCalculator = (values) => {
  const balance = pos(values.balance, 20000);
  const failureChance = rate(values.failureChancePercent, 2);
  const recovery = rate(values.recoveryPercent, 30);
  const insuranceCoverage = rate(values.insuranceCoveragePercent, 0);
  const years = pos(values.years, 3);
  const selfCustodyCost = pos(values.selfCustodyCost, 150);

  const lossIfFails = balance * (1 - recovery) * (1 - insuranceCoverage);
  const chanceOverYears = 1 - Math.pow(1 - failureChance, years);
  const expectedOverYears = lossIfFails * chanceOverYears;

  return {
    lossIfExchangeFails: round2(lossIfFails),
    chanceOfFailureOverYears: round2(chanceOverYears * 100),
    expectedLossPerYear: round2(lossIfFails * failureChance),
    expectedLossOverYears: round2(expectedOverYears),
    benefitOfSelfCustody: round2(expectedOverYears - selfCustodyCost),
  };
};

// --- 7. Crypto Scam Loss Estimate Calculator -------------------------------------------
export const cryptoScamLossCalculator: CustomCalculator = (values) => {
  const hotWalletValue = pos(values.hotWalletValue, 15000);
  const phishingChance = rate(values.phishingChancePercent, 2);
  const dustScamChance = rate(values.dustScamChancePercent, 0.5);
  const newTokenHoldings = pos(values.newTokenHoldings, 3000);
  const rugPullChance = rate(values.rugPullChancePercent, 20);
  const rugPullLoss = rate(values.rugPullLossPercent, 95);

  const phishing = hotWalletValue * phishingChance;
  const dust = hotWalletValue * dustScamChance;
  const rug = newTokenHoldings * rugPullChance * rugPullLoss;

  return {
    expectedPhishingLoss: round2(phishing),
    expectedDustAttackLoss: round2(dust),
    expectedRugPullLoss: round2(rug),
    totalExpectedYearlyLoss: round2(phishing + dust + rug),
    worstCaseLoss: round2(hotWalletValue + newTokenHoldings * rugPullLoss),
  };
};

// --- 8. Crypto Wallet Recovery Cost Calculator -----------------------------------------
export const cryptoWalletRecoveryCostCalculator: CustomCalculator = (values) => {
  const walletValue = pos(values.walletValue, 40000);
  const successFeePercent = Math.min(100, pos(values.successFeePercent, 20));
  const successChance = rate(values.successChancePercent, 30);
  const upfrontFee = pos(values.upfrontFee, 0);

  const fee = (walletValue * successFeePercent) / 100;
  const netIfSuccess = walletValue - fee;

  return {
    feeIfSuccessful: round2(fee),
    youKeepIfSuccessful: round2(netIfSuccess),
    expectedValueOfTrying: round2(successChance * netIfSuccess - upfrontFee),
  };
};

// Profit on a stake at American odds.
function americanProfit(stake: number, odds: number): number {
  if (odds >= 100) return (stake * odds) / 100;
  if (odds <= -100) return (stake * 100) / Math.abs(odds);
  return 0;
}

function impliedProbability(odds: number): number {
  if (odds >= 100) return 100 / (odds + 100);
  if (odds <= -100) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 0;
}

// --- 9. Crypto Sports Betting Payout Comparison Calculator -----------------------------
export const cryptoSportsBettingPayoutCalculator: CustomCalculator = (values) => {
  const stake = pos(values.stake, 100);
  const cryptoOdds = safeNumber(values.cryptoOdds, 150);
  const regularOdds = safeNumber(values.regularOdds, 140);
  const depositFeePercent = pos(values.depositFeePercent, 1);
  const withdrawalFee = pos(values.withdrawalFee, 5);

  const cryptoProfit = americanProfit(stake, cryptoOdds) - (stake * depositFeePercent) / 100 - withdrawalFee;
  const regularProfit = americanProfit(stake, regularOdds);

  return {
    cryptoBookNetProfit: round2(cryptoProfit),
    regularBookProfit: round2(regularProfit),
    differenceIfYouWin: round2(cryptoProfit - regularProfit),
    cryptoImpliedProbability: round2(impliedProbability(cryptoOdds) * 100),
    regularImpliedProbability: round2(impliedProbability(regularOdds) * 100),
  };
};

// --- 10. Prediction Market Return Calculator -------------------------------------------
export const predictionMarketReturnCalculator: CustomCalculator = (values) => {
  const sharePrice = Math.min(0.99, Math.max(0.01, safeNumber(values.sharePrice, 0.4)));
  const amount = pos(values.amount, 400);
  const feeOnProfitPercent = Math.min(100, pos(values.feeOnProfitPercent, 2));
  const yourProbability = rate(values.yourProbabilityPercent, 55);
  const days = Math.max(1, pos(values.days, 90));

  const shares = amount / sharePrice;
  const grossProfit = shares - amount;
  const profit = grossProfit * (1 - feeOnProfitPercent / 100);
  const ev = yourProbability * profit - (1 - yourProbability) * amount;

  return {
    shares: round2(shares),
    impliedProbability: round2(sharePrice * 100),
    profitIfRight: round2(profit),
    lossIfWrong: round2(amount),
    expectedValue: round2(ev),
    expectedReturnPercent: round2(amount > 0 ? (ev / amount) * 100 : 0),
    annualizedExpectedReturn: round2(amount > 0 ? (ev / amount) * (365 / days) * 100 : 0),
  };
};

export const cryptoTaxSecurityCustomCalculators: Record<string, CustomCalculator> = {
  "crypto-tax-loss-harvesting-calculator": cryptoTaxLossHarvestingCalculator,
  "crypto-donation-tax-calculator": cryptoDonationTaxCalculator,
  "crypto-tax-software-savings-calculator": cryptoTaxSoftwareSavingsCalculator,
  "crypto-cold-storage-cost-calculator": cryptoColdStorageCostCalculator,
  "crypto-custody-fee-calculator": cryptoCustodyFeeCalculator,
  "crypto-exchange-custodial-risk-calculator": cryptoExchangeCustodialRiskCalculator,
  "crypto-scam-loss-calculator": cryptoScamLossCalculator,
  "crypto-wallet-recovery-cost-calculator": cryptoWalletRecoveryCostCalculator,
  "crypto-sports-betting-payout-calculator": cryptoSportsBettingPayoutCalculator,
  "prediction-market-return-calculator": predictionMarketReturnCalculator,
};
