/**
 * Batch: "Car & Vehicle Cost Calculators" (5 Oct 2026), sub-batch 1 of 9 —
 * Car Buying (8 tools), filed under Car & Vehicle Cost Calculators > Car
 * Buying & Selling Calculators.
 *
 * Car & Vehicle Cost Calculators is a new Finance sub-category (created by
 * these scripts on first run) with 5 sub-categories. The user's 131-keyword
 * list: 5 already built (Rideshare and Food Delivery Driver Earnings =
 * gig-income; Extended Car Warranty = extended-auto-warranty-vs-insurance;
 * Daily Commute Cost = commuter-vs-remote-cost-comparison; Balloon Payment
 * Car Finance = balloon-loan) and 37 merged (see each engine header). 88 new
 * tools in 9 sub-batches, plus car-insurance-discount in ins-auto-specialty:
 *  - car-buying, car-selling                     -> Car Buying & Selling
 *  - car-lease, car-alternatives                 -> Car Lease, Rental & Transport
 *  - car-ownership, car-fuel-ev                  -> Car Ownership, Fuel & EV Cost
 *  - car-repair, car-care-upgrades               -> Car Maintenance, Repair & Upgrade
 *  - car-business                                -> Vehicle Business Use & Income
 * Prices, fees and rates vary by place and provider, so tools take the
 * user's figures with typical defaults; they don't invent quotes.
 *
 *  - carAffordability (incl. car down payment): 20/4/10-style budget — share
 *    of gross income for all car costs -> max payment, loan, price; 20% down.
 *  - newVsUsedCar (incl. certified pre-owned premium): payments, maintenance
 *    and resale over the years you keep it.
 *  - carFinancingVsCash: invest the cash and finance vs pay cash and invest
 *    the payments; ending savings compared.
 *  - zeroAprVsRebate (incl. manufacturer rebate value): 0% APR vs rebate +
 *    other financing; break-even rate.
 *  - dealerInvoicePrice (incl. negotiation savings): MSRP vs invoice,
 *    holdback and dealer incentives -> dealer's true cost and your offer.
 *  - dealerAddOnFee: doc fee, add-ons and market adjustment, taxed and
 *    financed.
 *  - carSalesTax: trade-in credit and whether rebates are taxed.
 *  - carRegistrationFee (incl. title transfer, license plate renewal): flat
 *    + value-based fee, title and plate; total over the years.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-car-buying-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

function presentValue(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + i, -n))) / i;
}

// --- 1. Car Affordability Calculator ---------------------------------------------------
export const carAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyIncome = pos(values.monthlyIncome, 6000);
  const carBudgetPercent = Math.min(100, pos(values.carBudgetPercent, 15));
  const otherCarCosts = pos(values.otherCarCosts, 250);
  const downPayment = pos(values.downPayment, 5000);
  const tradeInEquity = pos(values.tradeInEquity, 0);
  const ratePercent = pos(values.ratePercent, 7);
  const termMonths = Math.max(1, Math.round(pos(values.termMonths, 48)));
  const salesTaxPercent = pos(values.salesTaxPercent, 7);

  const maxPayment = Math.max(0, (monthlyIncome * carBudgetPercent) / 100 - otherCarCosts);
  const loan = presentValue(maxPayment, ratePercent / 100 / 12, termMonths);
  const price = (loan + downPayment + tradeInEquity) / (1 + salesTaxPercent / 100);

  return {
    maxMonthlyPayment: round2(maxPayment),
    maxLoanAmount: round2(loan),
    maxCarPrice: round2(price),
    suggestedDownPayment: round2(price * 0.2),
    yourDownPaymentPercent: round2(price > 0 ? ((downPayment + tradeInEquity) / price) * 100 : 0),
  };
};

// --- 2. New vs Used Car Calculator -----------------------------------------------------
export const newVsUsedCarCalculator: CustomCalculator = (values) => {
  const newPrice = pos(values.newPrice, 40000);
  const usedPrice = pos(values.usedPrice, 25000);
  const cpoPremium = pos(values.cpoPremium, 0);
  const newRate = pos(values.newRate, 6);
  const usedRate = pos(values.usedRate, 8);
  const termMonths = Math.max(1, Math.round(pos(values.termMonths, 60)));
  const years = Math.max(1, pos(values.years, 5));
  const newDepreciationPercent = Math.min(100, pos(values.newDepreciationPercent, 15));
  const usedDepreciationPercent = Math.min(100, pos(values.usedDepreciationPercent, 10));
  const newMaintenance = pos(values.newMaintenance, 500);
  const usedMaintenance = pos(values.usedMaintenance, 1200);

  const usedCost = usedPrice + cpoPremium;
  const newPmt = payment(newPrice, newRate / 100 / 12, termMonths);
  const usedPmt = payment(usedCost, usedRate / 100 / 12, termMonths);
  const newResale = newPrice * Math.pow(1 - newDepreciationPercent / 100, years);
  const usedResale = usedCost * Math.pow(1 - usedDepreciationPercent / 100, years);
  const newTotal = newPmt * termMonths + newMaintenance * years - newResale;
  const usedTotal = usedPmt * termMonths + usedMaintenance * years - usedResale;

  return {
    newMonthlyPayment: round2(newPmt),
    usedMonthlyPayment: round2(usedPmt),
    newResaleValue: round2(newResale),
    usedResaleValue: round2(usedResale),
    newTotalCost: round2(newTotal),
    usedTotalCost: round2(usedTotal),
    savingsWithUsed: round2(newTotal - usedTotal),
  };
};

// --- 3. Car Financing vs Cash Calculator -----------------------------------------------
export const carFinancingVsCashCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 30000);
  const ratePercent = pos(values.ratePercent, 6.5);
  const termMonths = Math.max(1, Math.round(pos(values.termMonths, 60)));
  const investReturnPercent = pos(values.investReturnPercent, 5);

  const pmt = payment(price, ratePercent / 100 / 12, termMonths);
  const j = investReturnPercent / 100 / 12;
  const g = Math.pow(1 + j, termMonths);
  const cashBuyer = j === 0 ? pmt * termMonths : (pmt * (g - 1)) / j;
  const financeBuyer = price * g;

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - price),
    cashBuyerEndingSavings: round2(cashBuyer),
    financeBuyerEndingSavings: round2(financeBuyer),
    advantageOfPayingCash: round2(cashBuyer - financeBuyer),
  };
};

// --- 4. Zero Percent APR vs Rebate Calculator ------------------------------------------
export const zeroAprVsRebateCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 35000);
  const downPayment = pos(values.downPayment, 0);
  const rebate = pos(values.rebate, 3000);
  const otherRatePercent = pos(values.otherRatePercent, 5.9);
  const termMonths = Math.max(1, Math.round(pos(values.termMonths, 60)));

  const zeroLoan = Math.max(0, price - downPayment);
  const rebateLoan = Math.max(0, price - downPayment - rebate);
  const zeroPmt = zeroLoan / termMonths;
  const rebatePmt = payment(rebateLoan, otherRatePercent / 100 / 12, termMonths);

  // Rate at which the rebate loan costs the same as 0% (bisection).
  let lo = 0;
  let hi = 100;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (payment(rebateLoan, mid / 100 / 12, termMonths) < zeroPmt) lo = mid;
    else hi = mid;
  }

  return {
    zeroAprMonthlyPayment: round2(zeroPmt),
    rebateMonthlyPayment: round2(rebatePmt),
    zeroAprTotalPaid: round2(zeroPmt * termMonths),
    rebateTotalPaid: round2(rebatePmt * termMonths),
    zeroAprSavings: round2(rebatePmt * termMonths - zeroPmt * termMonths),
    breakEvenRate: round2(rebateLoan > 0 && zeroLoan > rebateLoan ? lo : 0),
  };
};

// --- 5. Dealer Invoice Price Calculator ------------------------------------------------
export const dealerInvoicePriceCalculator: CustomCalculator = (values) => {
  const msrp = pos(values.msrp, 42000);
  const invoicePrice = pos(values.invoicePrice, 39500);
  const holdbackPercent = pos(values.holdbackPercent, 2);
  const dealerIncentive = pos(values.dealerIncentive, 1000);
  const offerPrice = pos(values.offerPrice, 40000);

  const trueCost = invoicePrice - (msrp * holdbackPercent) / 100 - dealerIncentive;

  return {
    markupOverInvoice: round2(msrp - invoicePrice),
    markupPercent: round2(invoicePrice > 0 ? ((msrp - invoicePrice) / invoicePrice) * 100 : 0),
    dealerTrueCost: round2(trueCost),
    dealerProfitAtYourOffer: round2(offerPrice - trueCost),
    savingsVsMsrp: round2(msrp - offerPrice),
  };
};

// --- 6. Dealer Add-On Fee Calculator ---------------------------------------------------
export const dealerAddOnFeeCalculator: CustomCalculator = (values) => {
  const vehiclePrice = pos(values.vehiclePrice, 35000);
  const docFee = pos(values.docFee, 499);
  const addOns = pos(values.addOns, 1995);
  const marketAdjustment = pos(values.marketAdjustment, 0);
  const salesTaxPercent = pos(values.salesTaxPercent, 7);
  const ratePercent = pos(values.ratePercent, 7);
  const termMonths = Math.max(1, Math.round(pos(values.termMonths, 60)));

  const extras = docFee + addOns + marketAdjustment;
  const tax = (extras * salesTaxPercent) / 100;
  const financed = extras + tax;
  const pmt = payment(financed, ratePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - financed;

  return {
    addOnTotal: round2(extras),
    taxOnAddOns: round2(tax),
    interestOnAddOns: round2(interest),
    trueCostOfAddOns: round2(financed + interest),
    extraPerMonth: round2(pmt),
    addOnsAsShareOfPrice: round2(vehiclePrice > 0 ? (extras / vehiclePrice) * 100 : 0),
  };
};

// --- 7. Car Sales Tax Calculator -------------------------------------------------------
export const carSalesTaxCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 30000);
  const tradeIn = pos(values.tradeIn, 8000);
  const rebate = pos(values.rebate, 1000);
  const salesTaxPercent = pos(values.salesTaxPercent, 7);
  const tradeInCredit = Math.round(safeNumber(values.tradeInCredit, 1)) === 1;
  const rebateTaxed = Math.round(safeNumber(values.rebateTaxed, 1)) === 1;

  const taxable = Math.max(0, price - (tradeInCredit ? tradeIn : 0) - (rebateTaxed ? 0 : rebate));
  const tax = (taxable * salesTaxPercent) / 100;

  return {
    taxableAmount: round2(taxable),
    salesTax: round2(tax),
    tradeInTaxSavings: round2(tradeInCredit ? (Math.min(tradeIn, price) * salesTaxPercent) / 100 : 0),
    priceAfterTradeInAndTax: round2(Math.max(0, price - tradeIn - rebate) + tax),
  };
};

// --- 8. Car Registration Fee Calculator ------------------------------------------------
export const carRegistrationFeeCalculator: CustomCalculator = (values) => {
  const vehicleValue = pos(values.vehicleValue, 30000);
  const flatFee = pos(values.flatFee, 60);
  const valueFeePercent = pos(values.valueFeePercent, 0.5);
  const titleFee = pos(values.titleFee, 75);
  const plateFee = pos(values.plateFee, 25);
  const years = Math.max(1, Math.round(pos(values.years, 5)));
  const depreciationPercent = Math.min(100, pos(values.depreciationPercent, 15));

  const registration = (value: number) => flatFee + (value * valueFeePercent) / 100;
  let renewals = 0;
  for (let y = 1; y < years; y++) {
    renewals += registration(vehicleValue * Math.pow(1 - depreciationPercent / 100, y));
  }
  const firstYear = registration(vehicleValue) + titleFee + plateFee;

  return {
    firstYearRegistration: round2(registration(vehicleValue)),
    firstYearTotal: round2(firstYear),
    nextYearRenewal: round2(registration(vehicleValue * (1 - depreciationPercent / 100))),
    totalOverYears: round2(firstYear + renewals),
  };
};

export const carBuyingCustomCalculators: Record<string, CustomCalculator> = {
  "car-affordability-calculator": carAffordabilityCalculator,
  "new-vs-used-car-calculator": newVsUsedCarCalculator,
  "car-financing-vs-cash-calculator": carFinancingVsCashCalculator,
  "zero-apr-vs-rebate-calculator": zeroAprVsRebateCalculator,
  "dealer-invoice-price-calculator": dealerInvoicePriceCalculator,
  "dealer-add-on-fee-calculator": dealerAddOnFeeCalculator,
  "car-sales-tax-calculator": carSalesTaxCalculator,
  "car-registration-fee-calculator": carRegistrationFeeCalculator,
};
