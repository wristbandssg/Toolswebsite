/**
 * Batch: "Investment Calculators" expansion (5 Oct 2026), sub-batch 6 of 9 —
 * Private & Alternative Investments (5 tools), filed under Investment
 * Calculators > Alternative Investment Calculators. See
 * calc-engine-investment-stocks.ts for the full batch context.
 *
 *  - hedgeFundInvestment: "2 and 20" — management fee on assets, then a
 *    performance fee on gains above the hurdle; net vs gross.
 *  - privateEquityInvestment: gross MOIC less management fees and carried
 *    interest over the preferred return -> net MOIC and IRR.
 *  - ventureCapitalInvestment (incl. angel): ownership at entry, dilution
 *    through later rounds, exit proceeds and probability-weighted value.
 *  - crowdfundingInvestment: Reg CF 12-month limit (greater of $2,500 or 5%
 *    if income or net worth < $124,000; else 10%, max $124,000) and a
 *    portfolio's expected outcome.
 *  - peerToPeerLendingInvestment: interest less servicing fee and losses
 *    from defaults (after recoveries) -> net return, after tax.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-investment-alt-private-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Hedge Fund Investment Calculator -----------------------------------------------
export const hedgeFundInvestmentCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 1000000));
  const grossReturnPercent = safeNumber(values.grossReturnPercent, 12);
  const managementFeePercent = Math.max(0, safeNumber(values.managementFeePercent, 2));
  const performanceFeePercent = Math.max(0, safeNumber(values.performanceFeePercent, 20));
  const hurdlePercent = Math.max(0, safeNumber(values.hurdlePercent, 0));
  const years = Math.max(0, Math.round(safeNumber(values.years, 5)));

  let net = investment;
  let gross = investment;
  let fees = 0;
  let highWater = investment;
  for (let y = 0; y < years; y++) {
    gross *= 1 + grossReturnPercent / 100;
    const mgmt = (net * managementFeePercent) / 100;
    const afterMgmt = net * (1 + grossReturnPercent / 100) - mgmt;
    const hurdleLevel = Math.max(highWater, net) * (1 + hurdlePercent / 100);
    const perf = Math.max(0, ((afterMgmt - hurdleLevel) * performanceFeePercent) / 100);
    net = afterMgmt - perf;
    fees += mgmt + perf;
    highWater = Math.max(highWater, net);
  }

  return {
    grossValue: round2(gross),
    netValue: round2(net),
    totalFees: round2(fees),
    netYearlyReturn: round2(investment > 0 && years > 0 ? (Math.pow(net / investment, 1 / years) - 1) * 100 : 0),
    feesShareOfGrossGain: round2(gross - investment > 0 ? ((gross - net) / (gross - investment)) * 100 : 0),
  };
};

// --- 2. Private Equity Investment Calculator -------------------------------------------
export const privateEquityInvestmentCalculator: CustomCalculator = (values) => {
  const commitment = Math.max(0, safeNumber(values.commitment, 1000000));
  const grossMultiple = Math.max(0, safeNumber(values.grossMultiple, 2));
  const years = Math.max(0.5, safeNumber(values.years, 6));
  const managementFeePercent = Math.max(0, safeNumber(values.managementFeePercent, 2));
  const carryPercent = Math.max(0, safeNumber(values.carryPercent, 20));
  const preferredReturnPercent = Math.max(0, safeNumber(values.preferredReturnPercent, 8));

  const gross = commitment * grossMultiple;
  const fees = (commitment * managementFeePercent * years) / 100;
  const profit = gross - commitment - fees;
  const pref = commitment * (Math.pow(1 + preferredReturnPercent / 100, years) - 1);
  const carry = profit > pref ? (profit * carryPercent) / 100 : 0;
  const net = gross - fees - carry;
  const netMultiple = commitment > 0 ? net / commitment : 0;

  return {
    grossProceeds: round2(gross),
    managementFees: round2(fees),
    carriedInterest: round2(carry),
    netProceeds: round2(net),
    netMultiple: round2(netMultiple),
    grossIrr: round2((Math.pow(Math.max(0, grossMultiple), 1 / years) - 1) * 100),
    netIrr: round2((Math.pow(Math.max(0, netMultiple), 1 / years) - 1) * 100),
  };
};

// --- 3. Venture Capital Investment Calculator (incl. angel) ----------------------------
export const ventureCapitalInvestmentCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 50000));
  const preMoney = Math.max(0, safeNumber(values.preMoney, 4000000));
  const dilutionPerRoundPercent = Math.min(90, Math.max(0, safeNumber(values.dilutionPerRoundPercent, 20)));
  const laterRounds = Math.max(0, Math.round(safeNumber(values.laterRounds, 3)));
  const exitValuation = Math.max(0, safeNumber(values.exitValuation, 200000000));
  const successChancePercent = Math.min(100, Math.max(0, safeNumber(values.successChancePercent, 10)));

  const post = preMoney + investment;
  const entry = post > 0 ? investment / post : 0;
  const final = entry * Math.pow(1 - dilutionPerRoundPercent / 100, laterRounds);
  const proceeds = final * exitValuation;

  return {
    postMoneyValuation: round2(post),
    ownershipAtEntry: round2(entry * 100),
    ownershipAtExit: round2(final * 100),
    proceedsIfExit: round2(proceeds),
    multipleIfExit: round2(investment > 0 ? proceeds / investment : 0),
    probabilityWeightedValue: round2((proceeds * successChancePercent) / 100),
  };
};

// --- 4. Crowdfunding Investment Calculator ---------------------------------------------
export const crowdfundingInvestmentCalculator: CustomCalculator = (values) => {
  const annualIncome = Math.max(0, safeNumber(values.annualIncome, 80000));
  const netWorth = Math.max(0, safeNumber(values.netWorth, 150000));
  const accredited = Math.round(safeNumber(values.accredited, 0)) === 1;
  const plannedInvestment = Math.max(0, safeNumber(values.plannedInvestment, 3000));
  const failurePercent = Math.min(100, Math.max(0, safeNumber(values.failurePercent, 70)));
  const winnerMultiple = Math.max(0, safeNumber(values.winnerMultiple, 3));

  const greater = Math.max(annualIncome, netWorth);
  const limit = accredited
    ? 0
    : annualIncome < 124000 || netWorth < 124000
      ? Math.max(2500, greater * 0.05)
      : Math.min(124000, greater * 0.1);
  const expectedMultiple = ((100 - failurePercent) / 100) * winnerMultiple;

  return {
    twelveMonthLimit: round2(limit),
    withinLimit: accredited || plannedInvestment <= limit ? 1 : 0,
    expectedMultiple: round2(expectedMultiple),
    expectedValue: round2(plannedInvestment * expectedMultiple),
    expectedGainOrLoss: round2(plannedInvestment * (expectedMultiple - 1)),
  };
};

// --- 5. Peer-to-Peer Lending Investment Calculator -------------------------------------
export const peerToPeerLendingInvestmentCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 10000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 11));
  const serviceFeePercent = Math.max(0, safeNumber(values.serviceFeePercent, 1));
  const defaultRatePercent = Math.max(0, safeNumber(values.defaultRatePercent, 4));
  const recoveryPercent = Math.min(100, Math.max(0, safeNumber(values.recoveryPercent, 10)));
  const years = Math.max(0, safeNumber(values.years, 3));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 24)));

  const losses = (defaultRatePercent * (100 - recoveryPercent)) / 100;
  const net = interestRatePercent - serviceFeePercent - losses;
  // interest is taxed as ordinary income; default losses offset it
  const afterTax = (interestRatePercent - serviceFeePercent) * (1 - taxRatePercent / 100) - losses * (1 - taxRatePercent / 100);
  const value = investment * Math.pow(1 + net / 100, years);

  return {
    lossesFromDefaults: round2(losses),
    netYearlyReturn: round2(net),
    afterTaxYearlyReturn: round2(afterTax),
    valueAfterYears: round2(value),
    totalEarned: round2(value - investment),
  };
};

export const investmentAltPrivateCustomCalculators: Record<string, CustomCalculator> = {
  "hedge-fund-investment-calculator": hedgeFundInvestmentCalculator,
  "private-equity-investment-calculator": privateEquityInvestmentCalculator,
  "venture-capital-investment-calculator": ventureCapitalInvestmentCalculator,
  "crowdfunding-investment-calculator": crowdfundingInvestmentCalculator,
  "peer-to-peer-lending-investment-calculator": peerToPeerLendingInvestmentCalculator,
};
