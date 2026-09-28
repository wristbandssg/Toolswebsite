/**
 * Batch: "Real Estate Calculators" sub-batch H (Selling & Real Estate Tax,
 * 9 tools). Part of the Real Estate build-out — see calc-engine-realestate-
 * rental-income.ts for the full list of 11 sub-batches. Filed under Finance
 * Calculators > Real Estate Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - costToSellAHouseCalculator: every cost of selling (commission, closing,
 *    repairs/staging, concessions, moving) as dollars and % of the price.
 *  - realEstateCommissionCalculator: how the commission is split between
 *    brokerages and agents, and what a flat-fee listing would save.
 *  - sellerClosingCostCalculator: the seller's itemized closing statement
 *    lines (transfer tax, title, escrow, prorated tax, HOA).
 *  - netProceedsFromHomeSaleCalculator: the cash you walk away with after
 *    paying off the mortgage and liens.
 *  - homeSaleProfitCalculator: profit over what you paid (plus improvements)
 *    and the Section 121 home-sale exclusion ($250,000 / $500,000).
 *  - capitalGainsOnPropertyCalculator: tax on a sale by property TYPE —
 *    main home (with the exclusion), second home, or investment property
 *    (with depreciation recapture taxed at up to 25%).
 *  - exchange1031Calculator: a 1031 exchange — taxable boot, deferred gain
 *    and the replacement property's new basis.
 *  - realEstateInvestmentTaxCalculator: yearly tax on a rental — depreciation,
 *    and the $25,000 passive-loss allowance phased out between $100,000 and
 *    $150,000 of MAGI.
 *  - propertyTaxDeductionCalculator: 2026 SALT deduction — $40,400 cap cut by
 *    30% of MAGI over $505,000 (not below $10,000) — vs the standard deduction.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-selling-tax-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pct = (a: number, b: number) => (b !== 0 ? round2((a / b) * 100) : 0);

// Section 121 home-sale exclusion (IRC §121): $250,000 single, $500,000 joint.
const EXCLUSION_SINGLE = 250000;
const EXCLUSION_JOINT = 500000;
// Unrecaptured §1250 gain (depreciation on real property) is taxed at most 25%.
const RECAPTURE_MAX_RATE = 25;
// Residential rental buildings are depreciated over 27.5 years (IRS Pub. 527).
const RESIDENTIAL_RECOVERY_YEARS = 27.5;
// 2026 SALT cap (One Big Beautiful Bill Act): $40,400, reduced by 30% of MAGI
// over $505,000, but never below $10,000.
const SALT_CAP_2026 = 40400;
const SALT_PHASEOUT_START = 505000;
const SALT_FLOOR = 10000;
// 2026 standard deduction.
const STANDARD_SINGLE_2026 = 16100;
const STANDARD_JOINT_2026 = 32200;

// --- 1. Cost to Sell a House ----------------------------------------------
export const costToSellAHouseCalculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice, 450000));
  const commissionPercent = Math.max(0, safeNumber(values.commissionPercent, 5.5));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 1.5));
  const repairsAndStaging = Math.max(0, safeNumber(values.repairsAndStaging, 5000));
  const sellerConcessions = Math.max(0, safeNumber(values.sellerConcessions, 3000));
  const movingCosts = Math.max(0, safeNumber(values.movingCosts, 2500));

  const commission = (salePrice * commissionPercent) / 100;
  const closing = (salePrice * closingCostPercent) / 100;
  const total = commission + closing + repairsAndStaging + sellerConcessions + movingCosts;

  return {
    totalCostToSell: round2(total),
    costPercentOfSalePrice: pct(total, salePrice),
    agentCommission: round2(commission),
    closingCosts: round2(closing),
    otherSellingCosts: round2(repairsAndStaging + sellerConcessions + movingCosts),
  };
};

// --- 2. Real Estate Commission -------------------------------------------------
export const realEstateCommissionCalculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice, 400000));
  const totalCommissionPercent = Math.max(0, safeNumber(values.totalCommissionPercent, 5.5));
  const listingSideSharePercent = Math.min(100, Math.max(0, safeNumber(values.listingSideSharePercent, 50)));
  const agentSplitPercent = Math.min(100, Math.max(0, safeNumber(values.agentSplitPercent, 70)));
  const flatFeeListing = Math.max(0, safeNumber(values.flatFeeListing, 5000));

  const total = (salePrice * totalCommissionPercent) / 100;
  const listing = (total * listingSideSharePercent) / 100;
  const buyer = total - listing;

  return {
    totalCommission: round2(total),
    listingSideCommission: round2(listing),
    buyerSideCommission: round2(buyer),
    listingAgentTakeHome: round2((listing * agentSplitPercent) / 100),
    savingsWithFlatFeeListing: round2(total - (flatFeeListing + buyer)),
  };
};

// --- 3. Seller Closing Cost (itemized) ---------------------------------------
export const sellerClosingCostCalculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice, 420000));
  const commissionPercent = Math.max(0, safeNumber(values.commissionPercent, 5.5));
  const transferTaxPercent = Math.max(0, safeNumber(values.transferTaxPercent, 0.4));
  const ownerTitleInsurance = Math.max(0, safeNumber(values.ownerTitleInsurance, 1800));
  const escrowAndAttorneyFees = Math.max(0, safeNumber(values.escrowAndAttorneyFees, 1500));
  const proratedPropertyTax = Math.max(0, safeNumber(values.proratedPropertyTax, 2100));
  const hoaAndOtherFees = Math.max(0, safeNumber(values.hoaAndOtherFees, 600));

  const commission = (salePrice * commissionPercent) / 100;
  const transfer = (salePrice * transferTaxPercent) / 100;
  const nonCommission = transfer + ownerTitleInsurance + escrowAndAttorneyFees + proratedPropertyTax + hoaAndOtherFees;
  const total = commission + nonCommission;

  return {
    totalSellerClosingCosts: round2(total),
    closingCostsPercentOfPrice: pct(total, salePrice),
    costsExcludingCommission: round2(nonCommission),
    agentCommission: round2(commission),
    transferTax: round2(transfer),
  };
};

// --- 4. Net Proceeds from Home Sale -------------------------------------------
export const netProceedsFromHomeSaleCalculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice, 500000));
  const mortgagePayoff = Math.max(0, safeNumber(values.mortgagePayoff, 260000));
  const otherLiens = Math.max(0, safeNumber(values.otherLiens, 0));
  const commissionPercent = Math.max(0, safeNumber(values.commissionPercent, 5.5));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 1.5));
  const repairsAndConcessions = Math.max(0, safeNumber(values.repairsAndConcessions, 4000));

  const costs = (salePrice * (commissionPercent + closingCostPercent)) / 100 + repairsAndConcessions;
  const net = salePrice - costs - mortgagePayoff - otherLiens;

  return {
    netProceeds: round2(net),
    totalSellingCosts: round2(costs),
    equityBeforeSelling: round2(salePrice - mortgagePayoff - otherLiens),
    netProceedsPercentOfPrice: pct(net, salePrice),
  };
};

// --- 5. Home Sale Profit (with Section 121) -----------------------------------
export const homeSaleProfitCalculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice, 650000));
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 300000));
  const buyingClosingCosts = Math.max(0, safeNumber(values.buyingClosingCosts, 6000));
  const improvements = Math.max(0, safeNumber(values.improvements, 40000));
  const sellingCostPercent = Math.max(0, safeNumber(values.sellingCostPercent, 6));
  // 1 = single, 2 = married filing jointly.
  const filingStatus = safeNumber(values.filingStatus, 1) === 2 ? 2 : 1;
  const yearsOwnedAndLivedIn = Math.max(0, safeNumber(values.yearsOwnedAndLivedIn, 8));
  const capitalGainsRatePercent = Math.max(0, safeNumber(values.capitalGainsRatePercent, 15));

  const selling = (salePrice * sellingCostPercent) / 100;
  const basis = purchasePrice + buyingClosingCosts + improvements;
  const profit = salePrice - selling - basis;
  const maxExclusion = yearsOwnedAndLivedIn >= 2 ? (filingStatus === 2 ? EXCLUSION_JOINT : EXCLUSION_SINGLE) : 0;
  const excluded = Math.max(0, Math.min(profit, maxExclusion));
  const taxable = Math.max(0, profit - excluded);
  const tax = (taxable * capitalGainsRatePercent) / 100;

  return {
    profitOnSale: round2(profit),
    exclusionApplied: round2(excluded),
    taxableGain: round2(taxable),
    estimatedTax: round2(tax),
    profitAfterTax: round2(profit - tax),
  };
};

// --- 6. Capital Gains on Property (by property type) ------------------------
export const capitalGainsOnPropertyCalculator: CustomCalculator = (values) => {
  // 1 = main home, 2 = second home, 3 = investment/rental property.
  const propertyType = Math.min(3, Math.max(1, Math.round(safeNumber(values.propertyType, 3))));
  const salePrice = Math.max(0, safeNumber(values.salePrice, 550000));
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 350000));
  const improvementsAndCosts = Math.max(0, safeNumber(values.improvementsAndCosts, 45000));
  const depreciationTaken = propertyType === 3 ? Math.max(0, safeNumber(values.depreciationTaken, 60000)) : 0;
  const exclusionAvailable = propertyType === 1 ? Math.max(0, safeNumber(values.exclusionAvailable, 250000)) : 0;
  const capitalGainsRatePercent = Math.max(0, safeNumber(values.capitalGainsRatePercent, 15));
  const ordinaryRatePercent = Math.max(0, safeNumber(values.ordinaryRatePercent, 24));
  const stateTaxRatePercent = Math.max(0, safeNumber(values.stateTaxRatePercent, 5));

  const adjustedBasis = purchasePrice + improvementsAndCosts - depreciationTaken;
  const gain = salePrice - adjustedBasis;
  const recapture = Math.max(0, Math.min(gain, depreciationTaken));
  const remaining = Math.max(0, gain - recapture);
  const excluded = Math.min(remaining, exclusionAvailable);
  const capitalGain = remaining - excluded;
  const recaptureTax = (recapture * Math.min(ordinaryRatePercent, RECAPTURE_MAX_RATE)) / 100;
  const federal = recaptureTax + (capitalGain * capitalGainsRatePercent) / 100;
  const state = ((recapture + capitalGain) * stateTaxRatePercent) / 100;

  return {
    totalGain: round2(gain),
    taxableGain: round2(recapture + capitalGain),
    depreciationRecaptureTax: round2(recaptureTax),
    federalTax: round2(federal),
    stateTax: round2(state),
    totalTax: round2(federal + state),
  };
};

// --- 7. 1031 Exchange -------------------------------------------------------------
export const exchange1031Calculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice, 600000));
  const adjustedBasis = Math.max(0, safeNumber(values.adjustedBasis, 320000));
  const sellingCosts = Math.max(0, safeNumber(values.sellingCosts, 36000));
  const oldMortgagePaidOff = Math.max(0, safeNumber(values.oldMortgagePaidOff, 200000));
  const replacementPrice = Math.max(0, safeNumber(values.replacementPrice, 750000));
  const newMortgage = Math.max(0, safeNumber(values.newMortgage, 400000));
  const cashKept = Math.max(0, safeNumber(values.cashKept, 20000));
  const taxRatePercent = Math.max(0, safeNumber(values.taxRatePercent, 20));

  const gain = Math.max(0, salePrice - sellingCosts - adjustedBasis);
  const mortgageBoot = Math.max(0, oldMortgagePaidOff - newMortgage);
  const boot = cashKept + mortgageBoot;
  const recognized = Math.min(gain, boot);
  const deferred = gain - recognized;

  return {
    realizedGain: round2(gain),
    taxableBoot: round2(recognized),
    deferredGain: round2(deferred),
    taxDueNow: round2((recognized * taxRatePercent) / 100),
    taxDeferred: round2((deferred * taxRatePercent) / 100),
    newPropertyBasis: round2(replacementPrice - deferred),
  };
};

// --- 8. Real Estate Investment Tax (rental, passive loss) --------------------
export const realEstateInvestmentTaxCalculator: CustomCalculator = (values) => {
  const annualRentalIncome = Math.max(0, safeNumber(values.annualRentalIncome, 24000));
  const operatingExpenses = Math.max(0, safeNumber(values.operatingExpenses, 8000));
  const mortgageInterest = Math.max(0, safeNumber(values.mortgageInterest, 13000));
  const buildingBasis = Math.max(0, safeNumber(values.buildingBasis, 275000));
  const magi = Math.max(0, safeNumber(values.magi, 120000));
  const marginalRatePercent = Math.max(0, safeNumber(values.marginalRatePercent, 22));

  const depreciation = buildingBasis / RESIDENTIAL_RECOVERY_YEARS;
  const net = annualRentalIncome - operatingExpenses - mortgageInterest - depreciation;
  // $25,000 allowance for active participants, cut by 50% of MAGI over $100,000.
  const allowance = Math.max(0, 25000 - Math.max(0, magi - 100000) * 0.5);
  const loss = Math.max(0, -net);
  const deductible = Math.min(loss, allowance);

  return {
    annualDepreciation: round2(depreciation),
    taxableRentalIncome: round2(net),
    taxOnRentalIncome: round2((Math.max(0, net) * marginalRatePercent) / 100),
    lossDeductibleThisYear: round2(deductible),
    suspendedLossCarriedForward: round2(loss - deductible),
    taxSavingsFromLoss: round2((deductible * marginalRatePercent) / 100),
  };
};

// --- 9. Property Tax Deduction (2026 SALT) -----------------------------------
export const propertyTaxDeductionCalculator: CustomCalculator = (values) => {
  const annualPropertyTax = Math.max(0, safeNumber(values.annualPropertyTax, 9000));
  const stateAndLocalIncomeTax = Math.max(0, safeNumber(values.stateAndLocalIncomeTax, 12000));
  // 1 = single, 2 = married filing jointly.
  const filingStatus = safeNumber(values.filingStatus, 2) === 2 ? 2 : 1;
  const magi = Math.max(0, safeNumber(values.magi, 250000));
  const otherItemizedDeductions = Math.max(0, safeNumber(values.otherItemizedDeductions, 14000));
  const marginalRatePercent = Math.max(0, safeNumber(values.marginalRatePercent, 24));

  const cap = Math.max(SALT_FLOOR, SALT_CAP_2026 - Math.max(0, magi - SALT_PHASEOUT_START) * 0.3);
  const salt = Math.min(annualPropertyTax + stateAndLocalIncomeTax, cap);
  const itemized = salt + otherItemizedDeductions;
  const standard = filingStatus === 2 ? STANDARD_JOINT_2026 : STANDARD_SINGLE_2026;
  const extra = Math.max(0, itemized - standard);

  return {
    saltDeduction: round2(salt),
    saltCap: round2(cap),
    totalItemizedDeductions: round2(itemized),
    standardDeduction: standard,
    deductionAboveStandard: round2(extra),
    taxSavingsFromItemizing: round2((extra * marginalRatePercent) / 100),
  };
};

export const realestateSellingTaxCustomCalculators: Record<string, CustomCalculator> = {
  "cost-to-sell-a-house-calculator": costToSellAHouseCalculator,
  "real-estate-commission-calculator": realEstateCommissionCalculator,
  "seller-closing-cost-calculator": sellerClosingCostCalculator,
  "net-proceeds-from-home-sale-calculator": netProceedsFromHomeSaleCalculator,
  "home-sale-profit-calculator": homeSaleProfitCalculator,
  "capital-gains-on-property-calculator": capitalGainsOnPropertyCalculator,
  "1031-exchange-calculator": exchange1031Calculator,
  "real-estate-investment-tax-calculator": realEstateInvestmentTaxCalculator,
  "property-tax-deduction-calculator": propertyTaxDeductionCalculator,
};
