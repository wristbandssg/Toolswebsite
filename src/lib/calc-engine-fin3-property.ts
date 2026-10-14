/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 3 of 10
 * — Property Investment & Leasing (7 tools). See
 * calc-engine-fin3-derivatives-tax.ts for the full batch context.
 *
 *  - affo (incl. the "FFO" keyword): FFO = net income + real estate D&A −
 *    gains on property sales + impairments (Nareit); AFFO = FFO − recurring
 *    capex − straight-line rent adjustment; per share, payout and P/FFO.
 *  - commercialLease: gross vs NNN — base rent plus taxes, insurance and
 *    CAM per sq ft, yearly escalations, free months -> total and effective
 *    rent.
 *  - netEffectiveRent: (rent × term − concessions) ÷ term.
 *  - occupancyRate (incl. the "ADR" keyword): occupancy, ADR and RevPAR
 *    for hotels and rentals. Different from the existing airbnb-occupancy-
 *    rate-calculator (one listing's break-even nights).
 *  - proratedRent: rent for a partial month by days-in-month, 365-day or
 *    30-day method.
 *  - rentalCommission: a rental broker fee as a % of annual rent or months
 *    of rent, and its split.
 *  - realtorCommissionVat: an estate agent's fee plus VAT (e.g. 20% UK) and
 *    the seller's net. Different from the existing real-estate-commission-
 *    calculator (US buyer/listing brokerage split, no VAT).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-property-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- 1. AFFO Calculator ----------------------------------------------------------------
export const affoCalculator: CustomCalculator = (values) => {
  const ni = num(values.netIncome, 120000000);
  const da = pos(values.depreciationAmortization, 90000000);
  const gains = num(values.gainsOnSales, 15000000);
  const impair = pos(values.impairments, 0);
  const capex = pos(values.recurringCapex, 25000000);
  const slr = num(values.straightLineRent, 5000000);
  const shares = pos(values.sharesOutstanding, 100000000);
  const dps = pos(values.dividendPerShare, 1.5);
  const price = pos(values.sharePrice, 0);
  const ffo = ni + da - gains + impair;
  const affo = ffo - capex - slr;
  const affoPs = shares > 0 ? affo / shares : 0;
  const ffoPs = shares > 0 ? ffo / shares : 0;
  return {
    ffo: round2(ffo),
    affo: round2(affo),
    ffoPerShare: round2(ffoPs),
    affoPerShare: round2(affoPs),
    affoPayoutRatio: round2(affoPs > 0 ? (dps / affoPs) * 100 : 0),
    priceToFfo: round2(price > 0 && ffoPs > 0 ? price / ffoPs : 0),
  };
};

// --- 2. Commercial Lease Calculator ----------------------------------------------------
export const commercialLeaseCalculator: CustomCalculator = (values) => {
  const area = pos(values.squareFeet, 2500);
  const base = pos(values.baseRentPerSqFt, 28);
  const nnn = num(values.leaseType, 2) === 2 ? pos(values.taxesPerSqFt, 4) + pos(values.insurancePerSqFt, 1) + pos(values.camPerSqFt, 3) : 0;
  const esc = num(values.annualEscalation, 3) / 100;
  const years = Math.max(1, Math.round(pos(values.termYears, 5)));
  const free = pos(values.freeRentMonths, 2);
  const ti = pos(values.tenantImprovementAllowance, 0);
  let baseTotal = 0;
  for (let y = 0; y < years; y++) baseTotal += area * base * Math.pow(1 + esc, y);
  const freeValue = (area * base * Math.min(free, 12)) / 12;
  const nnnTotal = area * nnn * years;
  const total = baseTotal - freeValue + nnnTotal;
  return {
    firstYearMonthlyRent: round2((area * (base + nnn)) / 12),
    firstYearAnnualRent: round2(area * (base + nnn)),
    totalBaseRent: round2(baseTotal - freeValue),
    totalNnnCharges: round2(nnnTotal),
    totalLeaseCost: round2(total),
    effectiveRentPerSqFtYear: round2(area > 0 ? (total - ti) / area / years : 0),
  };
};

// --- 3. Net Effective Rent Calculator --------------------------------------------------
export const netEffectiveRentCalculator: CustomCalculator = (values) => {
  const rent = pos(values.monthlyRent, 3000);
  const term = Math.max(1, pos(values.leaseMonths, 12));
  const free = Math.min(term, pos(values.freeMonths, 1));
  const other = pos(values.otherConcessions, 0);
  const gross = rent * term;
  const net = gross - rent * free - other;
  return {
    grossRentOverLease: round2(gross),
    totalConcessions: round2(rent * free + other),
    netEffectiveRent: round2(net / term),
    effectiveDiscount: round2(gross > 0 ? (1 - net / gross) * 100 : 0),
  };
};

// --- 4. Occupancy Rate Calculator ------------------------------------------------------
export const occupancyRateCalculator: CustomCalculator = (values) => {
  const units = pos(values.unitsAvailable, 120);
  const nights = Math.max(1, pos(values.daysInPeriod, 30));
  const sold = pos(values.unitNightsSold, 2700);
  const revenue = pos(values.roomRevenue, 391500);
  const available = units * nights;
  return {
    availableUnitNights: available,
    occupancyRate: round2(available > 0 ? (Math.min(sold, available) / available) * 100 : 0),
    adr: round2(sold > 0 ? revenue / sold : 0),
    revpar: round2(available > 0 ? revenue / available : 0),
    vacantUnitNights: Math.max(0, available - sold),
  };
};

// --- 5. Prorated Rent Calculator -------------------------------------------------------
export const proratedRentCalculator: CustomCalculator = (values) => {
  const rent = pos(values.monthlyRent, 1800);
  const dim = clamp(Math.round(pos(values.daysInMonth, 31)), 28, 31);
  const moveIn = clamp(Math.round(pos(values.moveInDay, 20)), 1, dim);
  const method = num(values.method, 1); // 1 days in month, 2 yearly (365), 3 banker's 30
  const days = dim - moveIn + 1;
  const daily = method === 2 ? (rent * 12) / 365 : method === 3 ? rent / 30 : rent / dim;
  return {
    daysOccupied: days,
    dailyRent: round2(daily),
    proratedRent: round2(Math.min(rent, daily * days)),
  };
};

// --- 6. Rental Commission Calculator ---------------------------------------------------
export const rentalCommissionCalculator: CustomCalculator = (values) => {
  const rent = pos(values.monthlyRent, 2500);
  const months = Math.max(1, pos(values.leaseMonths, 12));
  const basis = num(values.feeBasis, 1); // 1 % of annual rent, 2 months of rent
  const rate = pos(values.feeRate, 15);
  const split = clamp(pos(values.agentSplit, 50), 0, 100) / 100;
  const totalRent = rent * months;
  const fee = basis === 2 ? rent * rate : totalRent * (rate / 100);
  return {
    totalLeaseValue: round2(totalRent),
    commission: round2(fee),
    agentShare: round2(fee * split),
    commissionAsMonthsOfRent: round2(rent > 0 ? fee / rent : 0),
    commissionPctOfLease: round2(totalRent > 0 ? (fee / totalRent) * 100 : 0),
  };
};

// --- 7. Realtor Commission Calculator with VAT -----------------------------------------
export const realtorCommissionVatCalculator: CustomCalculator = (values) => {
  const price = pos(values.salePrice, 350000);
  const rate = pos(values.commissionRate, 1.5) / 100;
  const vat = pos(values.vatRate, 20) / 100;
  const fixed = pos(values.fixedFees, 0);
  const commission = price * rate + fixed;
  const vatAmount = commission * vat;
  return {
    commissionExVat: round2(commission),
    vatAmount: round2(vatAmount),
    totalFeeIncVat: round2(commission + vatAmount),
    effectiveRateIncVat: round2(price > 0 ? ((commission + vatAmount) / price) * 100 : 0),
    sellerNetAfterFee: round2(price - commission - vatAmount),
  };
};

export const fin3PropertyCustomCalculators: Record<string, CustomCalculator> = {
  "affo-calculator": affoCalculator,
  "commercial-lease-calculator": commercialLeaseCalculator,
  "net-effective-rent-calculator": netEffectiveRentCalculator,
  "occupancy-rate-calculator": occupancyRateCalculator,
  "prorated-rent-calculator": proratedRentCalculator,
  "rental-commission-calculator": rentalCommissionCalculator,
  "realtor-commission-calculator-with-vat": realtorCommissionVatCalculator,
};
