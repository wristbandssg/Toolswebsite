/**
 * Batch: "Car & Vehicle Cost Calculators" (5 Oct 2026), sub-batch 2 of 9 —
 * Car Selling & Value (8 tools), filed under Car & Vehicle Cost Calculators >
 * Car Buying & Selling Calculators. See calc-engine-car-buying.ts for the
 * full batch context.
 *
 *  - carImportDuty: duty on CIF (most countries) or FOB (US) value, then
 *    VAT/GST on value + duty, plus port and compliance fees -> landed cost.
 *  - carTradeInValue (incl. odometer mileage value adjustment): book value
 *    adjusted per mile above/below average and for condition, less the
 *    dealer's trade-in discount.
 *  - carLoanPayoffVsTradeIn: equity now vs after waiting (loan amortizes,
 *    car depreciates); months until positive equity.
 *  - privatePartyCarSale (incl. consignment sale fee): private sale net vs
 *    consignment vs trade-in plus its sales tax credit.
 *  - carAuctionFee: buyer's premium and fees vs seller's commission.
 *  - carFlippingProfit: buy + repairs + fees + holding costs vs sale price;
 *    after-tax profit, ROI and annualized ROI.
 *  - carDiminishedValue: "17c" formula — 10% cap x damage x mileage
 *    multipliers.
 *  - salvageTitleValue (incl. rebuilt title, vehicle history report impact):
 *    typical discounts by title status; salvage -> rebuilt margin.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-car-selling-calculators.ts for the copy.
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

// --- 1. Car Import Duty Calculator -----------------------------------------------------
export const carImportDutyCalculator: CustomCalculator = (values) => {
  const vehicleValue = pos(values.vehicleValue, 30000);
  const shippingCost = pos(values.shippingCost, 2000);
  const insuranceCost = pos(values.insuranceCost, 300);
  const basis = pick(values.basis, 2, 2);
  const dutyPercent = pos(values.dutyPercent, 2.5);
  const vatPercent = pos(values.vatPercent, 0);
  const fees = pos(values.fees, 1500);

  const customsValue = basis === 1 ? vehicleValue + shippingCost + insuranceCost : vehicleValue;
  const duty = (customsValue * dutyPercent) / 100;
  const vat = ((vehicleValue + shippingCost + insuranceCost + duty) * vatPercent) / 100;

  return {
    customsValue: round2(customsValue),
    importDuty: round2(duty),
    importVat: round2(vat),
    totalTaxesAndFees: round2(duty + vat + fees),
    landedCost: round2(vehicleValue + shippingCost + insuranceCost + duty + vat + fees),
  };
};

// --- 2. Car Trade-In Value Calculator --------------------------------------------------
export const carTradeInValueCalculator: CustomCalculator = (values) => {
  const baseValue = pos(values.baseValue, 18000);
  const ageYears = pos(values.ageYears, 5);
  const actualMiles = pos(values.actualMiles, 70000);
  const averageMilesPerYear = pos(values.averageMilesPerYear, 12000);
  const perMile = pos(values.perMile, 0.1);
  const condition = pick(values.condition, 2, 4);
  const tradeInDiscountPercent = Math.min(100, pos(values.tradeInDiscountPercent, 15));

  const expectedMiles = ageYears * averageMilesPerYear;
  const adjustment = (expectedMiles - actualMiles) * perMile;
  const fCondition = [1.05, 1.0, 0.9, 0.75][condition - 1];
  const privateValue = Math.max(0, (baseValue + adjustment) * fCondition);

  return {
    expectedMiles: round2(expectedMiles),
    mileageAdjustment: round2(adjustment),
    privatePartyValue: round2(privateValue),
    tradeInValue: round2(privateValue * (1 - tradeInDiscountPercent / 100)),
    gapVsPrivateSale: round2((privateValue * tradeInDiscountPercent) / 100),
  };
};

// --- 3. Car Loan Payoff vs Trade-In Timing Calculator ----------------------------------
export const carLoanPayoffVsTradeInCalculator: CustomCalculator = (values) => {
  const loanBalance = pos(values.loanBalance, 18000);
  const monthlyPayment = pos(values.monthlyPayment, 450);
  const ratePercent = pos(values.ratePercent, 7);
  const carValue = pos(values.carValue, 15000);
  const monthlyDepreciationPercent = Math.min(100, pos(values.monthlyDepreciationPercent, 1.2));
  const monthsToWait = Math.min(120, Math.round(pos(values.monthsToWait, 12)));

  const i = ratePercent / 100 / 12;
  const step = (bal: number) => Math.max(0, bal * (1 + i) - monthlyPayment);
  let bal = loanBalance;
  let val = carValue;
  let monthsUntilPositive = loanBalance <= carValue ? 0 : -1;
  let balWait = loanBalance;
  let valWait = carValue;
  for (let m = 1; m <= 120; m++) {
    bal = step(bal);
    val *= 1 - monthlyDepreciationPercent / 100;
    if (m === monthsToWait) {
      balWait = bal;
      valWait = val;
    }
    if (monthsUntilPositive < 0 && val >= bal) monthsUntilPositive = m;
  }

  return {
    equityNow: round2(carValue - loanBalance),
    balanceAfterWaiting: round2(balWait),
    valueAfterWaiting: round2(valWait),
    equityAfterWaiting: round2(valWait - balWait),
    improvementFromWaiting: round2(valWait - balWait - (carValue - loanBalance)),
    monthsUntilPositiveEquity: monthsUntilPositive < 0 ? 120 : monthsUntilPositive,
  };
};

// --- 4. Private Party Car Sale Calculator ----------------------------------------------
export const privatePartyCarSaleCalculator: CustomCalculator = (values) => {
  const privatePrice = pos(values.privatePrice, 20000);
  const sellingCosts = pos(values.sellingCosts, 100);
  const consignmentPercent = Math.min(100, pos(values.consignmentPercent, 10));
  const consignmentFlatFee = pos(values.consignmentFlatFee, 0);
  const tradeInOffer = pos(values.tradeInOffer, 16500);
  const salesTaxPercent = pos(values.salesTaxPercent, 7);

  const privateNet = privatePrice - sellingCosts;
  const consignmentNet = (privatePrice * (1 - consignmentPercent / 100)) - consignmentFlatFee;
  const tradeEffective = tradeInOffer * (1 + salesTaxPercent / 100);

  return {
    privateSaleNet: round2(privateNet),
    consignmentNet: round2(consignmentNet),
    tradeInTaxCredit: round2((tradeInOffer * salesTaxPercent) / 100),
    tradeInEffectiveValue: round2(tradeEffective),
    privateSaleAdvantage: round2(privateNet - tradeEffective),
  };
};

// --- 5. Car Auction Fee Calculator -----------------------------------------------------
export const carAuctionFeeCalculator: CustomCalculator = (values) => {
  const hammerPrice = pos(values.hammerPrice, 10000);
  const buyerPremiumPercent = pos(values.buyerPremiumPercent, 10);
  const buyerFlatFees = pos(values.buyerFlatFees, 200);
  const transportCost = pos(values.transportCost, 300);
  const sellerCommissionPercent = pos(values.sellerCommissionPercent, 5);
  const sellerEntryFee = pos(values.sellerEntryFee, 150);

  const buyerPremium = (hammerPrice * buyerPremiumPercent) / 100;
  const sellerCommission = (hammerPrice * sellerCommissionPercent) / 100;

  return {
    buyerPremium: round2(buyerPremium),
    buyerTotalCost: round2(hammerPrice + buyerPremium + buyerFlatFees + transportCost),
    sellerCommission: round2(sellerCommission),
    sellerNetProceeds: round2(hammerPrice - sellerCommission - sellerEntryFee),
    auctionHouseTotalFees: round2(buyerPremium + buyerFlatFees + sellerCommission + sellerEntryFee),
  };
};

// --- 6. Car Flipping Profit Calculator -------------------------------------------------
export const carFlippingProfitCalculator: CustomCalculator = (values) => {
  const purchasePrice = pos(values.purchasePrice, 8000);
  const repairs = pos(values.repairs, 1200);
  const detailing = pos(values.detailing, 200);
  const fees = pos(values.fees, 300);
  const holdingDays = Math.max(1, pos(values.holdingDays, 30));
  const dailyHoldingCost = pos(values.dailyHoldingCost, 5);
  const salePrice = pos(values.salePrice, 11500);
  const taxRatePercent = Math.min(100, pos(values.taxRatePercent, 22));

  const invested = purchasePrice + repairs + detailing + fees + holdingDays * dailyHoldingCost;
  const profit = salePrice - invested;
  const afterTax = profit > 0 ? profit * (1 - taxRatePercent / 100) : profit;
  const roi = invested > 0 ? (afterTax / invested) * 100 : 0;

  return {
    totalInvested: round2(invested),
    grossProfit: round2(profit),
    profitAfterTax: round2(afterTax),
    roiPercent: round2(roi),
    annualizedRoiPercent: round2((roi * 365) / holdingDays),
    profitPerDay: round2(afterTax / holdingDays),
  };
};

// --- 7. Car Diminished Value Calculator (17c) ------------------------------------------
export const carDiminishedValueCalculator: CustomCalculator = (values) => {
  const preAccidentValue = pos(values.preAccidentValue, 25000);
  const damage = pick(values.damage, 3, 5);
  const mileage = pos(values.mileage, 45000);

  const fDamage = [1, 0.75, 0.5, 0.25, 0][damage - 1];
  const fMileage = mileage < 20000 ? 1 : mileage < 40000 ? 0.8 : mileage < 60000 ? 0.6 : mileage < 80000 ? 0.4 : mileage < 100000 ? 0.2 : 0;
  const cap = preAccidentValue * 0.1;
  const dv = cap * fDamage * fMileage;

  return {
    baseLossCap: round2(cap),
    damageMultiplier: fDamage,
    mileageMultiplier: fMileage,
    diminishedValue: round2(dv),
    valueAfterRepair: round2(preAccidentValue - dv),
  };
};

// --- 8. Salvage Title Value Calculator -------------------------------------------------
export const salvageTitleValueCalculator: CustomCalculator = (values) => {
  const cleanValue = pos(values.cleanValue, 20000);
  const titleStatus = pick(values.titleStatus, 2, 4);
  const customDiscountPercent = Math.min(100, pos(values.customDiscountPercent, 0));
  const repairCost = pos(values.repairCost, 3000);
  const inspectionFee = pos(values.inspectionFee, 200);

  const typical = [12, 30, 50, 0][titleStatus - 1];
  const discount = customDiscountPercent > 0 ? customDiscountPercent : typical;
  const rebuilt = cleanValue * 0.7;
  const salvage = cleanValue * 0.5;

  return {
    discountPercentUsed: discount,
    valueDiscount: round2((cleanValue * discount) / 100),
    estimatedValue: round2(cleanValue * (1 - discount / 100)),
    rebuiltTitleValue: round2(rebuilt),
    salvageTitleValue: round2(salvage),
    rebuildMargin: round2(rebuilt - salvage - repairCost - inspectionFee),
  };
};

export const carSellingCustomCalculators: Record<string, CustomCalculator> = {
  "car-import-duty-calculator": carImportDutyCalculator,
  "car-trade-in-value-calculator": carTradeInValueCalculator,
  "car-loan-payoff-vs-trade-in-calculator": carLoanPayoffVsTradeInCalculator,
  "private-party-car-sale-calculator": privatePartyCarSaleCalculator,
  "car-auction-fee-calculator": carAuctionFeeCalculator,
  "car-flipping-profit-calculator": carFlippingProfitCalculator,
  "car-diminished-value-calculator": carDiminishedValueCalculator,
  "salvage-title-value-calculator": salvageTitleValueCalculator,
};
