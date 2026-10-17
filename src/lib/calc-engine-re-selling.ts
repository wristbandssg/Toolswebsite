/**
 * Batch: "Real Estate Calculators" → Home Value, Equity & Selling (8 tools):
 *
 *  - homeAppraisal: sales comparison approach — three comparable sales
 *    adjusted for size, bedrooms, bathrooms and other differences, averaged
 *    (covers "Comparative Market Analysis"). The existing
 *    property-value-calculator only scales comps by price per square foot.
 *  - assessedVsMarketValue: actual vs legal assessment ratio, the
 *    over-assessment and the tax it costs at the mill rate.
 *  - divorceBuyout: equity, each spouse's share after separate-property
 *    credits, and the refinance needed to buy the other out.
 *  - cashOffer: a cash / iBuyer offer net vs listing on the open market.
 *  - buyingAndSellingHome: sell-then-buy — proceeds, the new down payment and
 *    payment, the overlap cost and the cash needed to buy first.
 *  - cashForKeys: paying a tenant to leave vs the cost of an eviction.
 *  - rentVsSell: keep the home as a rental vs sell now, with the Section
 *    121 exclusion (lost after 3 years rented), depreciation recapture and
 *    investing the sale proceeds.
 *  - partExchangeHouse: UK new-build part exchange offer vs an open-market
 *    sale (agent fee with VAT, conveyancing, holding costs).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-re-selling-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const yes = (v: number) => Math.round(safeNumber(v)) === 1;

/** Monthly principal & interest on a fully amortizing loan. */
function pmt(principal: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Balance left after `months` payments. */
function balanceAfter(principal: number, annualRatePct: number, years: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  const p = pmt(principal, annualRatePct, years);
  if (r === 0) return Math.max(0, principal - p * months);
  return Math.max(0, principal * Math.pow(1 + r, months) - (p * (Math.pow(1 + r, months) - 1)) / r);
}

export const homeAppraisal: CustomCalculator = (v) => {
  const sqftAdj = nonNeg(v.perSqFtAdjustment);
  const bedAdj = nonNeg(v.perBedroomAdjustment);
  const bathAdj = nonNeg(v.perBathAdjustment);
  const adjusted: number[] = [];
  for (const i of [1, 2, 3]) {
    const price = nonNeg(v[`comp${i}Price`]);
    if (price <= 0) continue;
    adjusted.push(
      price +
        (nonNeg(v.subjectSqFt) - nonNeg(v[`comp${i}SqFt`])) * sqftAdj +
        (nonNeg(v.subjectBeds) - nonNeg(v[`comp${i}Beds`])) * bedAdj +
        (nonNeg(v.subjectBaths) - nonNeg(v[`comp${i}Baths`])) * bathAdj +
        safeNumber(v[`comp${i}OtherAdjustment`])
    );
  }
  const value = adjusted.length ? adjusted.reduce((a, b) => a + b, 0) / adjusted.length : 0;
  return {
    estimatedValue: round2(value),
    lowAdjustedComp: adjusted.length ? round2(Math.min(...adjusted)) : 0,
    highAdjustedComp: adjusted.length ? round2(Math.max(...adjusted)) : 0,
    valuePerSqFt: nonNeg(v.subjectSqFt) > 0 ? round2(value / nonNeg(v.subjectSqFt)) : 0,
    comp1Adjusted: round2(adjusted[0] ?? 0),
    comp2Adjusted: round2(adjusted[1] ?? 0),
    comp3Adjusted: round2(adjusted[2] ?? 0),
  };
};

export const assessedVsMarketValue: CustomCalculator = (v) => {
  const market = nonNeg(v.marketValue);
  const assessed = nonNeg(v.assessedValue);
  const legalRatio = nonNeg(v.legalRatio, 100) / 100;
  const mills = nonNeg(v.millRate);
  const fair = market * legalRatio;
  const over = assessed - fair;
  return {
    actualAssessmentRatio: market > 0 ? round2((assessed / market) * 100) : 0,
    fairAssessedValue: round2(fair),
    overAssessment: round2(over),
    currentTax: round2((assessed * mills) / 1000),
    taxAtFairAssessment: round2((fair * mills) / 1000),
    yearlyTaxOverpaid: round2(Math.max(0, (over * mills) / 1000)),
    worthAppealing: fair > 0 && over / fair > 0.05 ? 1 : 0,
  };
};

export const divorceBuyout: CustomCalculator = (v) => {
  const value = nonNeg(v.homeValue);
  const balance = nonNeg(v.mortgageBalance);
  const costs = yes(v.deductSellingCosts) ? (value * nonNeg(v.sellingCostPercent)) / 100 : 0;
  const equity = Math.max(0, value - balance - costs);
  const credits = nonNeg(v.leavingSpouseCredit) - nonNeg(v.stayingSpouseCredit);
  const marital = Math.max(0, equity - nonNeg(v.leavingSpouseCredit) - nonNeg(v.stayingSpouseCredit));
  const buyout = Math.max(0, (marital * nonNeg(v.leavingSharePercent, 50)) / 100 + nonNeg(v.leavingSpouseCredit));
  const newLoan = balance + buyout + nonNeg(v.refinanceCosts);
  return {
    buyoutAmount: round2(buyout),
    totalEquity: round2(equity),
    maritalEquity: round2(marital),
    netSeparateCredits: round2(credits),
    newLoanAmount: round2(newLoan),
    newMonthlyPayment: round2(pmt(newLoan, nonNeg(v.newRate), nonNeg(v.newTerm, 30) || 30)),
    newLoanToValue: value > 0 ? round2((newLoan / value) * 100) : 0,
  };
};

export const cashOffer: CustomCalculator = (v) => {
  const market = nonNeg(v.marketPrice);
  const balance = nonNeg(v.mortgageBalance);
  const listNet =
    market -
    (market * (nonNeg(v.commissionPercent) + nonNeg(v.closingCostPercent))) / 100 -
    nonNeg(v.repairsAndConcessions) -
    nonNeg(v.prepCosts) -
    nonNeg(v.monthlyHoldingCost) * nonNeg(v.monthsToSell);
  const offer = nonNeg(v.cashOfferAmount);
  const cashNet = offer - (offer * nonNeg(v.serviceFeePercent)) / 100 - nonNeg(v.cashRepairDeduction) - (offer * nonNeg(v.cashClosingPercent)) / 100;
  return {
    netFromCashOffer: round2(cashNet - balance),
    netFromListing: round2(listNet - balance),
    listingNetsMore: round2(listNet - cashNet),
    cashOfferPercentOfMarket: market > 0 ? round2((offer / market) * 100) : 0,
    effectiveCostOfCash: market > 0 ? round2(((market - cashNet) / market) * 100) : 0,
  };
};

export const buyingAndSellingHome: CustomCalculator = (v) => {
  const value = nonNeg(v.currentValue);
  const proceeds = value - nonNeg(v.currentBalance) - (value * nonNeg(v.sellingCostPercent)) / 100;
  const price = nonNeg(v.newPrice);
  const buying = (price * nonNeg(v.buyingCostPercent)) / 100;
  const down = Math.min(price, Math.max(0, proceeds - buying - nonNeg(v.cashReserve) + nonNeg(v.extraSavings)));
  const loan = price - down;
  return {
    newMonthlyPayment: round2(pmt(loan, nonNeg(v.newRate), nonNeg(v.newTerm, 30) || 30)),
    netSaleProceeds: round2(proceeds),
    downPaymentAvailable: round2(down),
    downPaymentPercent: price > 0 ? round2((down / price) * 100) : 0,
    newLoanAmount: round2(loan),
    overlapCost: round2(nonNeg(v.currentMonthlyPayment) * nonNeg(v.overlapMonths)),
    cashNeededToBuyFirst: round2(down + buying),
  };
};

export const cashForKeys: CustomCalculator = (v) => {
  const rent = nonNeg(v.monthlyRent);
  const eviction =
    nonNeg(v.legalFees) + nonNeg(v.courtCosts) + rent * nonNeg(v.evictionMonths) + nonNeg(v.expectedDamage) + nonNeg(v.lockoutCosts);
  const keys = nonNeg(v.cashOffer) + rent * nonNeg(v.vacateMonths);
  return {
    savingsVsEviction: round2(eviction - keys),
    totalEvictionCost: round2(eviction),
    totalCashForKeysCost: round2(keys),
    maxSensibleOffer: round2(Math.max(0, eviction - rent * nonNeg(v.vacateMonths))),
    lostRentDuringEviction: round2(rent * nonNeg(v.evictionMonths)),
  };
};

export const rentVsSell: CustomCalculator = (v) => {
  const value = nonNeg(v.homeValue);
  const basis = nonNeg(v.costBasis);
  const balance = nonNeg(v.mortgageBalance);
  const rate = nonNeg(v.mortgageRate);
  const remaining = nonNeg(v.remainingYears, 25) || 25;
  const years = Math.max(1, Math.round(nonNeg(v.yearsToRent, 5)));
  const sellPct = nonNeg(v.sellingCostPercent) / 100;
  const cgRate = nonNeg(v.capitalGainsRate) / 100;
  const exclusion = yes(v.married) ? 500_000 : 250_000;

  const gainNow = Math.max(0, value * (1 - sellPct) - basis);
  const taxNow = Math.max(0, gainNow - exclusion) * cgRate;
  const netNow = value * (1 - sellPct) - balance - taxNow;
  const investedNow = netNow * Math.pow(1 + nonNeg(v.investmentReturn) / 100, years);

  const payment = pmt(balance, rate, remaining);
  const rent = nonNeg(v.monthlyRent) * (1 - nonNeg(v.vacancyRate) / 100);
  const costs = nonNeg(v.monthlyCosts) + (nonNeg(v.monthlyRent) * nonNeg(v.managementPercent)) / 100;
  const cashFlow = rent - costs - payment;
  const future = value * Math.pow(1 + nonNeg(v.appreciationRate) / 100, years);
  const depreciation = Math.min(years, 27.5) * ((basis * 0.8) / 27.5);
  const adjBasis = basis - depreciation;
  const gainLater = Math.max(0, future * (1 - sellPct) - adjBasis);
  // Section 121 needs 2 of the last 5 years as a home: lost once rented more than 3 years.
  const excl = years <= 3 ? exclusion : 0;
  const recapture = Math.min(gainLater, depreciation) * 0.25;
  const taxLater = recapture + Math.max(0, gainLater - depreciation - excl) * cgRate;
  const netLater = future * (1 - sellPct) - balanceAfter(balance, rate, remaining, years * 12) - taxLater + cashFlow * 12 * years;
  return {
    keepingAndRentingGains: round2(netLater - investedNow),
    wealthIfYouRent: round2(netLater),
    wealthIfYouSellNow: round2(investedNow),
    netProceedsToday: round2(netNow),
    monthlyCashFlow: round2(cashFlow),
    taxIfSoldLater: round2(taxLater),
    taxIfSoldNow: round2(taxNow),
  };
};

export const partExchangeHouse: CustomCalculator = (v) => {
  const value = nonNeg(v.marketValue);
  const px = (value * nonNeg(v.pxOfferPercent)) / 100;
  const agent = (value * nonNeg(v.agentFeePercent) * 1.2) / 100; // UK agent fees + 20% VAT
  const open = value - agent - nonNeg(v.conveyancing) - nonNeg(v.otherSaleCosts) - nonNeg(v.monthlyHoldingCost) * nonNeg(v.monthsToSell);
  const pxNet = px - (yes(v.builderPaysFees) ? 0 : nonNeg(v.conveyancing));
  return {
    netViaPartExchange: round2(pxNet),
    netViaOpenMarket: round2(open),
    openMarketNetsMore: round2(open - pxNet),
    partExchangeOffer: round2(px),
    discountToMarketValue: value > 0 ? round2(((value - px) / value) * 100) : 0,
    agentFeeWithVat: round2(agent),
  };
};

export const reSellingCustomCalculators: Record<string, CustomCalculator> = {
  "home-appraisal-calculator": homeAppraisal,
  "assessed-value-vs-market-value-calculator": assessedVsMarketValue,
  "divorce-buyout-calculator": divorceBuyout,
  "cash-offer-calculator": cashOffer,
  "buying-and-selling-home-calculator": buyingAndSellingHome,
  "cash-for-keys-calculator": cashForKeys,
  "rent-vs-sell-calculator": rentVsSell,
  "part-exchange-house-calculator": partExchangeHouse,
};
