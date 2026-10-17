/**
 * Batch: "Real Estate Calculators" → Land, Construction & Building Cost (13)
 * and Commercial Real Estate (6) — 19 tools:
 *
 *  - costToBuild + six state versions (Texas, Michigan, Minnesota,
 *    Pennsylvania, Florida, North Carolina): one engine — square footage ×
 *    base cost × quality × region, garage, site work, permits, design and
 *    contingency — with each state's own base cost per square foot
 *    (BUILD_STATES).
 *  - buildingPermitCost: permit fee on valuation + plan review + trade
 *    permits + impact fees + state surcharge.
 *  - landSurveyCost: survey type, acreage, terrain and corners.
 *  - pricePerAcre: price per acre / square foot / hectare and value at a
 *    comparable $/acre.
 *  - landDevelopmentCost: roads, utilities, grading, engineering, permits
 *    and impact fees → cost per lot and margin.
 *  - realEstateArea: floor area from up to four rectangles.
 *  - lotSize: lot area by shape in square feet, acres, m² and hectares.
 *  - percentageRent: retail percentage rent over a natural or artificial
 *    breakpoint.
 *  - tenantImprovementAllowance: TI allowance vs build-out, with any excess
 *    amortized into rent.
 *  - leaseVsBuyCommercial: lease cost vs net cost of owning.
 *  - warehouseLease: industrial lease cost over the term with free rent,
 *    NNN and cost per pallet position.
 *  - nnnRent: pro-rata share of the building's tax, insurance and CAM pool
 *    (the existing commercial-lease-calculator takes NNN per sq ft as given).
 *  - defeasance: cost of a Treasury portfolio replacing the remaining loan
 *    payments, plus fees.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-re-land-commercial-calculators.ts for the copy.
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

const QUALITY = [1, 1.25, 1.6, 2.3]; // builder grade, mid-range, custom, luxury

/** 2026 base construction cost per finished sq ft (builder grade) by state. */
export const BUILD_STATES: Record<string, { name: string; base: number; sqft: number }> = {
  "cost-to-build-calculator": { name: "the US", base: 165, sqft: 2200 },
  "texas-cost-to-build-a-house-calculator": { name: "Texas", base: 150, sqft: 2400 },
  "cost-to-build-a-house-in-michigan-calculator": { name: "Michigan", base: 170, sqft: 2000 },
  "cost-to-build-a-house-in-mn-calculator": { name: "Minnesota", base: 185, sqft: 2200 },
  "cost-to-build-a-house-in-pa-calculator": { name: "Pennsylvania", base: 175, sqft: 2200 },
  "cost-to-build-a-house-in-florida-calculator": { name: "Florida", base: 168, sqft: 2200 },
  "cost-to-build-a-house-in-nc-calculator": { name: "North Carolina", base: 160, sqft: 2300 },
};

export const costToBuild: CustomCalculator = (v) => {
  const sqft = nonNeg(v.squareFeet);
  const q = QUALITY[Math.min(3, Math.round(nonNeg(v.quality)))] ?? 1;
  const region = nonNeg(v.regionalFactor, 100) / 100;
  const perSqFt = nonNeg(v.baseCostPerSqFt) * q * region;
  const house = sqft * perSqFt;
  const garage = nonNeg(v.garageSqFt) * perSqFt * 0.45;
  const construction = house + garage + nonNeg(v.siteWork);
  const permits = (construction * nonNeg(v.permitPercent)) / 100;
  const design = (construction * nonNeg(v.designPercent)) / 100;
  const contingency = ((construction + permits + design) * nonNeg(v.contingencyPercent)) / 100;
  const total = construction + permits + design + contingency;
  return {
    totalCostToBuild: round2(total),
    constructionCost: round2(house + garage),
    costPerSqFt: sqft > 0 ? round2(total / sqft) : 0,
    permitsAndDesign: round2(permits + design),
    contingency: round2(contingency),
    totalWithLand: round2(total + nonNeg(v.landCost)),
  };
};

export const buildingPermitCost: CustomCalculator = (v) => {
  const permit = Math.max(nonNeg(v.minimumFee), (nonNeg(v.projectValuation) * nonNeg(v.permitRate)) / 100);
  const review = (permit * nonNeg(v.planReviewPercent)) / 100;
  const trades = nonNeg(v.electricalPermit) + nonNeg(v.plumbingPermit) + nonNeg(v.mechanicalPermit);
  const surcharge = ((permit + review) * nonNeg(v.stateSurchargePercent)) / 100;
  const total = permit + review + trades + surcharge + nonNeg(v.impactFees);
  return {
    totalPermitCost: round2(total),
    buildingPermitFee: round2(permit),
    planReviewFee: round2(review),
    tradePermits: round2(trades),
    impactFees: round2(nonNeg(v.impactFees)),
    stateSurcharge: round2(surcharge),
    shareOfProjectCost: nonNeg(v.projectValuation) > 0 ? round2((total / nonNeg(v.projectValuation)) * 100) : 0,
  };
};

// Survey types: [base fee, per-acre fee].
const SURVEYS: [number, number][] = [[500, 150], [600, 300], [2500, 600], [400, 50], [3000, 900]];
const TERRAIN = [1, 1.25, 1.5];

export const landSurveyCost: CustomCalculator = (v) => {
  const [base, perAcre] = SURVEYS[Math.min(4, Math.round(nonNeg(v.surveyType)))] ?? SURVEYS[0];
  const acres = nonNeg(v.acres);
  const terrain = TERRAIN[Math.min(2, Math.round(nonNeg(v.terrain)))] ?? 1;
  const region = nonNeg(v.regionalFactor, 100) / 100;
  const fieldwork = (base + perAcre * Math.pow(acres, 0.8)) * terrain;
  const corners = nonNeg(v.cornersToSet) * nonNeg(v.costPerCorner);
  const total = (fieldwork + corners) * region + nonNeg(v.recordingFees);
  return {
    estimatedSurveyCost: round2(total),
    lowEstimate: round2(total * 0.8),
    highEstimate: round2(total * 1.3),
    fieldworkAndDrafting: round2(fieldwork * region),
    cornerMonuments: round2(corners * region),
    costPerAcre: acres > 0 ? round2(total / acres) : 0,
  };
};

export const pricePerAcre: CustomCalculator = (v) => {
  const price = nonNeg(v.price);
  const unit = Math.round(nonNeg(v.sizeUnit));
  const size = nonNeg(v.size);
  const acres = unit === 1 ? size / 43_560 : unit === 2 ? size * 2.4710538 : size;
  const perAcre = acres > 0 ? price / acres : 0;
  const comp = nonNeg(v.comparablePricePerAcre);
  return {
    pricePerAcre: round2(perAcre),
    pricePerSqFt: acres > 0 ? round2(price / (acres * 43_560)) : 0,
    pricePerHectare: acres > 0 ? round2(price / (acres / 2.4710538)) : 0,
    acres: Math.round(acres * 10000) / 10000,
    valueAtComparableRate: round2(comp * acres),
    differenceVsComparable: comp > 0 ? round2(((perAcre - comp) / comp) * 100) : 0,
  };
};

export const landDevelopmentCost: CustomCalculator = (v) => {
  const lots = Math.max(1, Math.round(nonNeg(v.lots, 1)));
  const acres = nonNeg(v.acres);
  const hard =
    nonNeg(v.roadFeet) * nonNeg(v.roadCostPerFoot) + lots * (nonNeg(v.waterSewerPerLot) + nonNeg(v.drySumpPerLot)) + acres * nonNeg(v.gradingPerAcre) + nonNeg(v.stormwater);
  const soft = (hard * nonNeg(v.engineeringPercent)) / 100 + lots * nonNeg(v.permitsImpactPerLot);
  const contingency = ((hard + soft) * nonNeg(v.contingencyPercent)) / 100;
  const dev = hard + soft + contingency;
  const finished = (dev + nonNeg(v.landCost)) / lots;
  return {
    totalDevelopmentCost: round2(dev),
    costPerLot: round2(dev / lots),
    finishedLotCost: round2(finished),
    costPerAcre: acres > 0 ? round2(dev / acres) : 0,
    profitPerLot: round2(nonNeg(v.lotSalePrice) - finished),
    marginOnSales: nonNeg(v.lotSalePrice) > 0 ? round2(((nonNeg(v.lotSalePrice) - finished) / nonNeg(v.lotSalePrice)) * 100) : 0,
  };
};

export const realEstateArea: CustomCalculator = (v) => {
  let sqft = 0;
  for (const i of [1, 2, 3, 4]) sqft += nonNeg(v[`length${i}`]) * nonNeg(v[`width${i}`]);
  const price = nonNeg(v.price);
  return {
    totalSquareFeet: round2(sqft),
    squareMeters: round2(sqft * 0.09290304),
    acres: Math.round((sqft / 43_560) * 10000) / 10000,
    pricePerSquareFoot: sqft > 0 && price > 0 ? round2(price / sqft) : 0,
    pricePerSquareMeter: sqft > 0 && price > 0 ? round2(price / (sqft * 0.09290304)) : 0,
  };
};

export const lotSize: CustomCalculator = (v) => {
  const a = nonNeg(v.sideA);
  const b = nonNeg(v.sideB);
  const c = nonNeg(v.sideC);
  const d = nonNeg(v.sideD);
  const shape = Math.round(nonNeg(v.shape));
  let sqft = a * b; // rectangle: frontage × depth
  if (shape === 1) sqft = ((a + c) / 2) * ((b + d) / 2); // irregular 4 sides: average width × average depth
  if (shape === 2) sqft = (a * b) / 2; // triangle: base × height ÷ 2
  if (shape === 3) sqft = ((a + c) / 2) * b; // trapezoid: (front + rear) ÷ 2 × depth
  return {
    lotSquareFeet: round2(sqft),
    acres: Math.round((sqft / 43_560) * 10000) / 10000,
    squareMeters: round2(sqft * 0.09290304),
    hectares: Math.round(sqft * 0.09290304) / 10000,
    squareYards: round2(sqft / 9),
  };
};

export const percentageRent: CustomCalculator = (v) => {
  const sales = nonNeg(v.grossSales);
  const base = nonNeg(v.annualBaseRent);
  const pct = nonNeg(v.percentageRate) / 100;
  const natural = pct > 0 ? base / pct : 0;
  const breakpoint = nonNeg(v.artificialBreakpoint) > 0 ? nonNeg(v.artificialBreakpoint) : natural;
  const overage = Math.max(0, sales - breakpoint) * pct;
  return {
    percentageRentDue: round2(overage),
    totalRent: round2(base + overage),
    breakpointUsed: round2(breakpoint),
    naturalBreakpoint: round2(natural),
    occupancyCostOfSales: sales > 0 ? round2(((base + overage + nonNeg(v.annualNnnCharges)) / sales) * 100) : 0,
  };
};

export const tenantImprovementAllowance: CustomCalculator = (v) => {
  const sqft = nonNeg(v.squareFeet);
  const allowance = sqft * nonNeg(v.allowancePerSqFt);
  const cost = sqft * nonNeg(v.buildoutCostPerSqFt) + nonNeg(v.otherCosts);
  const excess = Math.max(0, cost - allowance);
  const amortize = yes(v.amortizeExcess);
  const years = nonNeg(v.leaseYears, 5) || 5;
  const payment = amortize ? pmt(excess, nonNeg(v.amortizationRate), years) : 0;
  return {
    tenantOutOfPocket: round2(amortize ? 0 : excess),
    totalAllowance: round2(allowance),
    totalBuildoutCost: round2(cost),
    excessOverAllowance: round2(excess),
    addedRentPerMonth: round2(payment),
    addedRentPerSqFtYear: sqft > 0 ? round2((payment * 12) / sqft) : 0,
    unusedAllowance: round2(Math.max(0, allowance - cost)),
  };
};

export const leaseVsBuyCommercial: CustomCalculator = (v) => {
  const sqft = nonNeg(v.squareFeet);
  const years = Math.max(1, Math.round(nonNeg(v.years, 10)));
  const esc = nonNeg(v.rentEscalation) / 100;
  let lease = 0;
  for (let y = 0; y < years; y++) lease += sqft * (nonNeg(v.leaseRentPerSqFt) + nonNeg(v.nnnPerSqFt)) * Math.pow(1 + esc, y);
  const price = nonNeg(v.purchasePrice);
  const down = (price * nonNeg(v.downPaymentPercent)) / 100;
  const loan = price - down;
  const rate = nonNeg(v.interestRate);
  const term = nonNeg(v.loanTerm, 25) || 25;
  const pay = pmt(loan, rate, term);
  const months = years * 12;
  const interest = pay * Math.min(months, term * 12) - (loan - balanceAfter(loan, rate, term, months));
  const owning = (price * (nonNeg(v.ownershipCostPercent) / 100)) * years;
  const future = price * Math.pow(1 + nonNeg(v.appreciationRate) / 100, years);
  const sellCost = (future * nonNeg(v.sellingCostPercent)) / 100;
  const closing = (price * nonNeg(v.closingCostPercent)) / 100;
  const lost = (down + closing) * (Math.pow(1 + nonNeg(v.opportunityRate) / 100, years) - 1);
  const buyNet = interest + owning + closing + sellCost + lost - (future - price);
  return {
    buyingSaves: round2(lease - buyNet),
    totalLeaseCost: round2(lease),
    netCostOfOwning: round2(buyNet),
    monthlyLoanPayment: round2(pay),
    equityAtEnd: round2(future - sellCost - balanceAfter(loan, rate, term, months)),
    yearOneLeasePerMonth: round2((sqft * (nonNeg(v.leaseRentPerSqFt) + nonNeg(v.nnnPerSqFt))) / 12),
  };
};

export const warehouseLease: CustomCalculator = (v) => {
  const sqft = nonNeg(v.squareFeet);
  const years = Math.max(1, Math.round(nonNeg(v.termYears, 5)));
  const esc = nonNeg(v.annualEscalation) / 100;
  let base = 0;
  for (let y = 0; y < years; y++) base += sqft * nonNeg(v.baseRentPerSqFt) * Math.pow(1 + esc, y);
  const free = (sqft * nonNeg(v.baseRentPerSqFt) * nonNeg(v.freeRentMonths)) / 12;
  const nnn = sqft * nonNeg(v.nnnPerSqFt) * years;
  const utilities = nonNeg(v.monthlyUtilities) * 12 * years;
  const total = base - free + nnn + utilities - nonNeg(v.tiAllowance);
  const pallets = nonNeg(v.palletPositions);
  return {
    yearOneMonthlyCost: round2((sqft * (nonNeg(v.baseRentPerSqFt) + nonNeg(v.nnnPerSqFt))) / 12 + nonNeg(v.monthlyUtilities)),
    totalLeaseCost: round2(total),
    effectiveRentPerSqFtYear: sqft > 0 ? round2(total / sqft / years) : 0,
    freeRentValue: round2(free),
    costPerPalletPerMonth: pallets > 0 ? round2(total / (years * 12) / pallets) : 0,
  };
};

export const nnnRent: CustomCalculator = (v) => {
  const tenant = nonNeg(v.tenantSqFt);
  const building = nonNeg(v.buildingSqFt);
  const share = building > 0 ? tenant / building : 0;
  const cam = nonNeg(v.buildingCam) * (1 + nonNeg(v.adminFeePercent) / 100);
  const pool = nonNeg(v.buildingTaxes) + nonNeg(v.buildingInsurance) + cam;
  const nnn = pool * share;
  const base = tenant * nonNeg(v.baseRentPerSqFt);
  return {
    monthlyTotalRent: round2((base + nnn) / 12),
    yearlyNnnCharges: round2(nnn),
    nnnPerSqFtYear: tenant > 0 ? round2(nnn / tenant) : 0,
    proRataShare: round2(share * 100),
    monthlyBaseRent: round2(base / 12),
    grossEquivalentPerSqFt: tenant > 0 ? round2((base + nnn) / tenant) : 0,
  };
};

export const defeasance: CustomCalculator = (v) => {
  const balance = nonNeg(v.loanBalance);
  const rate = nonNeg(v.noteRate);
  const remaining = Math.max(1, Math.round(nonNeg(v.monthsToMaturity)));
  const amortMonths = Math.round(nonNeg(v.amortizationYears, 30) * 12);
  const interestOnly = yes(v.interestOnly);
  const r = rate / 100 / 12;
  const payment = interestOnly ? balance * r : amortMonths > 0 ? pmt(balance, rate, amortMonths / 12) : balance * r;
  const t = nonNeg(v.treasuryYield) / 100 / 12;
  let pv = 0;
  let bal = balance;
  for (let m = 1; m <= remaining; m++) {
    const interest = bal * r;
    const principal = interestOnly ? 0 : Math.min(bal, payment - interest);
    bal -= principal;
    const cash = interest + principal + (m === remaining ? bal : 0);
    pv += cash / Math.pow(1 + t, m);
  }
  const fees = nonNeg(v.transactionFees);
  return {
    totalDefeasanceCost: round2(pv - balance + fees),
    securitiesPortfolioCost: round2(pv),
    defeasancePremium: round2(pv - balance),
    transactionFees: round2(fees),
    costAsPercentOfBalance: balance > 0 ? round2(((pv - balance + fees) / balance) * 100) : 0,
    balloonAtMaturity: round2(bal),
  };
};

export const reLandCommercialCustomCalculators: Record<string, CustomCalculator> = {
  ...Object.fromEntries(Object.keys(BUILD_STATES).map((slug) => [slug, costToBuild])),
  "building-permit-cost-calculator": buildingPermitCost,
  "land-survey-cost-calculator": landSurveyCost,
  "price-per-acre-calculator": pricePerAcre,
  "land-development-cost-calculator": landDevelopmentCost,
  "real-estate-area-calculator": realEstateArea,
  "square-feet-lot-size-calculator": lotSize,
  "percentage-rent-calculator": percentageRent,
  "tenant-improvement-allowance-calculator": tenantImprovementAllowance,
  "lease-vs-buy-commercial-property-calculator": leaseVsBuyCommercial,
  "warehouse-lease-calculator": warehouseLease,
  "nnn-rent-calculator": nnnRent,
  "defeasance-calculator": defeasance,
};
