/**
 * Batch: "Real Estate Calculators" → Property & Real Estate Tax — local
 * property taxes, transfer taxes and international property taxes (26 tools):
 *
 *  - texasHomesteadExemption, floridaHomesteadExemption,
 *    desantisPropertyTax (Florida's Nov 2026 ballot amendment: $150,000 /
 *    $250,000 non-school exemption from 2027/2028).
 *  - prop13Tax (Los Angeles, San Francisco, San Diego): purchase-price base,
 *    2% yearly cap, $7,000 homeowners' exemption, direct assessments.
 *  - texasLocalTax (Harris County incl. Houston, Austin): per-$100 rates by
 *    taxing unit with each unit's homestead exemption.
 *  - nycPropertyTax: Class 1 (6% assessment ratio) / Class 2 (45%), FY2026
 *    rates, exemptions and abatements.
 *  - lasVegasPropertyTax: 35% assessment of taxable value and the 3%
 *    owner-occupied abatement cap.
 *  - depreciationRecapture: unrecaptured §1250 gain at up to 25% + capital
 *    gains + NIIT.
 *  - njExitTax: nonresident GIT/REP estimate — greater of 10.75% of the gain
 *    or 2% of the price.
 *  - nycTransferTax, miamiDadeDocStamp, chicagoTransferTax (and suburban
 *    Cook County), sanFranciscoTransferTax, tennesseeTransferTax,
 *    wisconsinTransferTax, coloradoTransferTax (state fee + resort-town
 *    RETTs), philadelphiaTransferTax.
 *  - nswStampDuty (2025–26 bands, first home buyer scheme, 9% foreign
 *    surcharge), canadaLandTransferTax (by province, first-time rebates),
 *    italyPropertyTax (IMU), mexicoPropertyTax (predial + ISAI),
 *    philippinesPropertyTax (RPT with assessment levels + SEF),
 *    ukCommercialStampDuty (non-residential SDLT / LBTT / LTT).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-re-tax-local-calculators.ts for the copy.
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

/** Marginal brackets: [upper bound, rate %]. */
function bracketTax(amount: number, brackets: [number, number][]): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of brackets) {
    if (amount <= lower) break;
    tax += ((Math.min(amount, upper) - lower) * rate) / 100;
    lower = upper;
  }
  return tax;
}

export const texasHomesteadExemption: CustomCalculator = (v) => {
  const value = nonNeg(v.appraisedValue);
  const school = nonNeg(v.schoolRate) / 100;
  const county = nonNeg(v.countyRate) / 100;
  const city = nonNeg(v.cityRate) / 100;
  const other = nonNeg(v.otherRate) / 100;
  // 2025 (Props 13 & 11): $140,000 school homestead exemption, +$60,000 for 65+ or disabled.
  const schoolEx = 140_000 + (yes(v.over65OrDisabled) ? 60_000 : 0);
  const countyEx = (value * Math.min(20, nonNeg(v.countyHomesteadPercent))) / 100;
  const cityEx = (value * Math.min(20, nonNeg(v.cityHomesteadPercent))) / 100;
  const without = value * (school + county + city + other);
  const withEx =
    Math.max(0, value - schoolEx) * school + Math.max(0, value - countyEx) * county + Math.max(0, value - cityEx) * city + value * other;
  return {
    yearlySavings: round2(without - withEx),
    taxWithExemption: round2(withEx),
    taxWithoutExemption: round2(without),
    schoolTaxableValue: round2(Math.max(0, value - schoolEx)),
    effectiveRateWithExemption: value > 0 ? round2((withEx / value) * 100) : 0,
  };
};

export const floridaHomesteadExemption: CustomCalculator = (v) => {
  const value = nonNeg(v.assessedValue);
  const school = nonNeg(v.schoolMillage) / 1000;
  const nonSchool = nonNeg(v.nonSchoolMillage) / 1000;
  const extra = nonNeg(v.otherExemptions);
  const schoolTaxable = Math.max(0, value - 25_000 - extra);
  const nonSchoolTaxable = Math.max(0, value - 25_000 - Math.min(25_000, Math.max(0, value - 50_000)) - extra);
  const without = value * (school + nonSchool);
  const withEx = schoolTaxable * school + nonSchoolTaxable * nonSchool;
  // Save Our Homes: assessed value rises at most 3% a year (CPI-capped) after the first year.
  const years = nonNeg(v.yearsOwned);
  const growth = nonNeg(v.marketGrowth) / 100;
  const market = value * Math.pow(1 + growth, years);
  const capped = value * Math.pow(1 + Math.min(growth, 0.03), years);
  const rate = school + nonSchool;
  return {
    yearlySavings: round2(without - withEx),
    taxWithHomestead: round2(withEx),
    taxWithoutHomestead: round2(without),
    exemptionFromNonSchoolTaxes: round2(value - nonSchoolTaxable),
    saveOurHomesSavingsInFutureYear: round2(Math.max(0, market - capped) * rate),
    cappedAssessedValueThen: round2(capped),
  };
};

export const desantisPropertyTax: CustomCalculator = (v) => {
  const value = nonNeg(v.assessedValue);
  const school = nonNeg(v.schoolMillage) / 1000;
  const nonSchool = nonNeg(v.nonSchoolMillage) / 1000;
  const currentSchool = Math.max(0, value - 25_000);
  const currentNonSchool = Math.max(0, value - 25_000 - Math.min(25_000, Math.max(0, value - 50_000)));
  const current = currentSchool * school + currentNonSchool * nonSchool;
  const proposedEx = Math.round(nonNeg(v.year, 2028)) >= 2028 ? 250_000 : 150_000;
  const proposed = currentSchool * school + Math.max(0, value - proposedEx) * nonSchool;
  return {
    yearlySavings: round2(current - proposed),
    taxToday: round2(current),
    taxUnderAmendment: round2(proposed),
    savingsPercent: current > 0 ? round2(((current - proposed) / current) * 100) : 0,
    nonSchoolExemption: proposedEx,
    schoolTaxesUnchanged: round2(currentSchool * school),
  };
};

export const prop13Tax: CustomCalculator = (v) => {
  const base = nonNeg(v.purchasePrice);
  const years = nonNeg(v.yearsSincePurchase);
  const assessed = base * Math.pow(1.02, years);
  const market = nonNeg(v.marketValue) > 0 ? nonNeg(v.marketValue) : assessed;
  const taxable = Math.max(0, Math.min(assessed, market) - (yes(v.homeownersExemption) ? 7000 : 0));
  const adValorem = (taxable * nonNeg(v.taxRate)) / 100;
  const total = adValorem + nonNeg(v.directAssessments);
  return {
    yearlyPropertyTax: round2(total),
    monthlyPropertyTax: round2(total / 12),
    assessedValueThisYear: round2(Math.min(assessed, market)),
    adValoremTax: round2(adValorem),
    directAssessments: round2(nonNeg(v.directAssessments)),
    effectiveRate: market > 0 ? round2((total / market) * 100) : 0,
  };
};

export const texasLocalTax: CustomCalculator = (v) => {
  const value = nonNeg(v.appraisedValue);
  const capped = nonNeg(v.cappedValue) > 0 ? Math.min(value, nonNeg(v.cappedValue)) : value;
  const home = yes(v.homestead);
  const senior = yes(v.over65OrDisabled);
  const units: [number, number][] = [
    // [rate per $100, exemption $]
    [nonNeg(v.countyRate), home ? capped * 0.2 + (senior ? nonNeg(v.countySeniorExemption) : 0) : 0],
    [nonNeg(v.schoolRate), home ? 140_000 + (senior ? 60_000 : 0) : 0],
    [nonNeg(v.cityRate), home ? capped * (nonNeg(v.cityHomesteadPercent) / 100) + (senior ? nonNeg(v.citySeniorExemption) : 0) : 0],
    [nonNeg(v.collegeRate), home ? 5000 : 0],
    [nonNeg(v.otherRate), 0],
  ];
  const tax = units.reduce((s, [rate, ex]) => s + (Math.max(0, capped - ex) * rate) / 100, 0);
  const noEx = (capped * units.reduce((s, [rate]) => s + rate, 0)) / 100;
  return {
    yearlyPropertyTax: round2(tax),
    monthlyPropertyTax: round2(tax / 12),
    homesteadSavings: round2(noEx - tax),
    combinedRatePer100: Math.round(units.reduce((s, [rate]) => s + rate, 0) * 10000) / 10000,
    effectiveRate: value > 0 ? round2((tax / value) * 100) : 0,
  };
};

export const nycPropertyTax: CustomCalculator = (v) => {
  const market = nonNeg(v.marketValue);
  const class2 = yes(v.propertyClass);
  const ratio = class2 ? 0.45 : 0.06;
  const av = nonNeg(v.assessedValue) > 0 ? nonNeg(v.assessedValue) : market * ratio;
  const taxable = Math.max(0, av - nonNeg(v.exemptions));
  const rate = nonNeg(v.taxRate, class2 ? 12.439 : 19.843) / 100;
  const gross = taxable * rate;
  const net = Math.max(0, gross - nonNeg(v.abatements) - nonNeg(v.starCredit));
  return {
    yearlyPropertyTax: round2(net),
    quarterlyPayment: round2(net / 4),
    assessedValue: round2(av),
    taxableValue: round2(taxable),
    taxBeforeCredits: round2(gross),
    effectiveRateOnMarketValue: market > 0 ? round2((net / market) * 100) : 0,
  };
};

export const lasVegasPropertyTax: CustomCalculator = (v) => {
  const taxable = nonNeg(v.taxableValue);
  const assessed = taxable * 0.35;
  const full = (assessed * nonNeg(v.ratePer100)) / 100;
  const last = nonNeg(v.lastYearTax);
  const cap = yes(v.ownerOccupied) ? 1.03 : 1.08; // NRS 361.4723 abatement caps (residential owner-occupied 3%, others up to 8%)
  const capped = last > 0 ? Math.min(full, last * cap) : full;
  return {
    yearlyPropertyTax: round2(capped),
    monthlyPropertyTax: round2(capped / 12),
    assessedValue: round2(assessed),
    taxBeforeAbatement: round2(full),
    abatementSavings: round2(full - capped),
    effectiveRateOnTaxableValue: taxable > 0 ? round2((capped / taxable) * 100) : 0,
  };
};

export const depreciationRecapture: CustomCalculator = (v) => {
  const basis = nonNeg(v.purchasePrice) + nonNeg(v.improvements);
  const building = basis * (1 - nonNeg(v.landPercent) / 100);
  const life = yes(v.commercial) ? 39 : 27.5;
  const years = nonNeg(v.yearsOwned);
  const depreciation = nonNeg(v.depreciationTaken) > 0 ? nonNeg(v.depreciationTaken) : Math.min(building, (building / life) * years);
  const amountRealized = nonNeg(v.salePrice) - nonNeg(v.sellingCosts);
  const adjusted = basis - depreciation;
  const gain = Math.max(0, amountRealized - adjusted);
  const unrecaptured = Math.min(gain, depreciation);
  const recaptureTax = unrecaptured * (Math.min(25, nonNeg(v.ordinaryRate)) / 100);
  const capitalGain = gain - unrecaptured;
  const cgTax = (capitalGain * nonNeg(v.capitalGainsRate)) / 100;
  const niit = yes(v.niit) ? gain * 0.038 : 0;
  return {
    depreciationRecaptureTax: round2(recaptureTax),
    totalTaxOnSale: round2(recaptureTax + cgTax + niit),
    totalDepreciation: round2(depreciation),
    adjustedBasis: round2(adjusted),
    totalGain: round2(gain),
    capitalGainsTax: round2(cgTax),
    netInvestmentIncomeTax: round2(niit),
  };
};

export const njExitTax: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  const gain = Math.max(0, price - nonNeg(v.sellingCosts) - nonNeg(v.adjustedBasis));
  const exempt = !yes(v.nonResident) || yes(v.section121Exempt);
  const byGain = gain * 0.1075;
  const byPrice = price * 0.02;
  const due = exempt ? 0 : Math.max(byGain, byPrice) * (nonNeg(v.ownershipPercent, 100) / 100);
  return {
    estimatedPaymentAtClosing: round2(due),
    tenPointSevenFivePercentOfGain: round2(byGain),
    twoPercentOfPrice: round2(byPrice),
    gainOnSale: round2(gain),
    usesTwoPercentMinimum: !exempt && byPrice > byGain ? 1 : 0,
  };
};

const NYC_MANSION: [number, number][] = [
  [1_000_000, 1], [2_000_000, 1.25], [3_000_000, 1.5], [5_000_000, 2.25], [10_000_000, 3.25],
  [15_000_000, 3.5], [20_000_000, 3.75], [25_000_000, 3.9],
];

export const nycTransferTax: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  const commercial = yes(v.commercial);
  const rptt = price * (commercial ? (price > 500_000 ? 0.02625 : 0.01425) : price > 500_000 ? 0.01425 : 0.01);
  const state = price * (commercial ? (price >= 2_000_000 ? 0.0065 : 0.004) : price >= 3_000_000 ? 0.0065 : 0.004);
  let mansionRate = 0;
  if (!commercial) for (const [from, r] of NYC_MANSION) if (price >= from) mansionRate = r;
  const mansion = (price * mansionRate) / 100;
  return {
    totalTransferTaxes: round2(rptt + state + mansion),
    nycRptt: round2(rptt),
    nysTransferTax: round2(state),
    mansionTax: round2(mansion),
    sellerPays: round2(rptt + state),
    buyerPays: round2(mansion),
  };
};

export const miamiDadeDocStamp: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  const loan = nonNeg(v.mortgageAmount);
  const deed = price * 0.006;
  const surtax = yes(v.singleFamily) ? 0 : price * 0.0045;
  const note = loan * 0.0035;
  const intangible = loan * 0.002;
  return {
    totalDocStampsAndTaxes: round2(deed + surtax + note + intangible),
    deedDocStamps: round2(deed),
    discretionarySurtax: round2(surtax),
    noteDocStamps: round2(note),
    intangibleTax: round2(intangible),
    sellerTypicallyPays: round2(deed + surtax),
    buyerTypicallyPays: round2(note + intangible),
  };
};

export const chicagoTransferTax: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  const chicago = yes(v.inChicago);
  const state = price * 0.001;
  const county = price * 0.0005;
  const cityBuyer = chicago ? price * 0.0075 : 0;
  const cityCta = chicago ? price * 0.003 : 0;
  const municipal = chicago ? 0 : (price * nonNeg(v.municipalRate)) / 100;
  const muniBuyer = yes(v.municipalPaidByBuyer) ? municipal : 0;
  return {
    totalTransferTax: round2(state + county + cityBuyer + cityCta + municipal),
    stateTax: round2(state),
    cookCountyTax: round2(county),
    chicagoCityTax: round2(cityBuyer + cityCta),
    municipalTax: round2(municipal),
    buyerPays: round2(cityBuyer + muniBuyer),
    sellerPays: round2(state + county + cityCta + municipal - muniBuyer),
  };
};

const SF_TIERS: [number, number][] = [[100, 0.5], [250_000, 0.68], [1_000_000, 0.75], [5_000_000, 2.25], [10_000_000, 5.5], [25_000_000, 6]];

export const sanFranciscoTransferTax: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  let rate = 0;
  for (const [from, r] of SF_TIERS) if (price >= from) rate = r;
  const tax = (price * rate) / 100;
  return {
    transferTax: round2(tax),
    rateApplied: rate,
    perThousand: round2(rate * 10),
    netAfterTax: round2(price - tax),
  };
};

export const tennesseeTransferTax: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  const loan = nonNeg(v.mortgageAmount);
  const transfer = price * 0.0037;
  const mortgage = Math.max(0, loan - 2000) * 0.00115;
  return {
    totalTaxes: round2(transfer + mortgage + nonNeg(v.recordingFees)),
    transferTax: round2(transfer),
    mortgageTax: round2(mortgage),
    recordingFees: round2(nonNeg(v.recordingFees)),
  };
};

export const wisconsinTransferTax: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  const fee = yes(v.exempt) ? 0 : Math.ceil(price / 100) * 0.3;
  return { transferFee: round2(fee), feePerThousand: 3, netToSeller: round2(price - fee) };
};

export const coloradoTransferTax: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  const doc = Math.ceil(price / 100) * 0.01;
  const town = Math.round(nonNeg(v.town));
  // Resort-town real estate transfer taxes: [rate %, exempt first $].
  const rules: Record<number, [number, number]> = { 1: [1.5, 0], 2: [3, 0], 3: [1, 0], 4: [1, 0], 5: [2, 0], 6: [nonNeg(v.customRate), 0] };
  const [rate, exemptFirst] = rules[town] ?? [0, 0];
  const local = (Math.max(0, price - exemptFirst) * rate) / 100;
  return { totalTransferTaxes: round2(doc + local), stateDocumentaryFee: round2(doc), localTransferTax: round2(local), localRate: rate };
};

export const philadelphiaTransferTax: CustomCalculator = (v) => {
  const price = Math.max(nonNeg(v.salePrice), nonNeg(v.assessedValue));
  const city = price * 0.03578;
  const state = price * 0.01;
  const buyerShare = nonNeg(v.buyerSharePercent, 50) / 100;
  return {
    totalTransferTax: round2(city + state),
    cityTax: round2(city),
    stateTax: round2(state),
    buyerPays: round2((city + state) * buyerShare),
    sellerPays: round2((city + state) * (1 - buyerShare)),
  };
};

// NSW transfer duty bands from 1 July 2025 (premium property duty from $3,721,000).
const NSW_BANDS: [number, number][] = [[17_000, 1.25], [37_000, 1.5], [99_000, 1.75], [372_000, 3.5], [1_240_000, 4.5], [3_721_000, 5.5], [Infinity, 7]];

export const nswStampDuty: CustomCalculator = (v) => {
  const price = nonNeg(v.propertyPrice);
  const full = price > 0 ? Math.max(20, bracketTax(price, NSW_BANDS)) : 0;
  let duty = full;
  if (yes(v.firstHomeBuyer)) {
    const land = yes(v.vacantLand);
    const [exempt, top] = land ? [350_000, 450_000] : [800_000, 1_000_000];
    if (price <= exempt) duty = 0;
    else if (price < top) duty = (full * (price - exempt)) / (top - exempt);
  }
  const surcharge = yes(v.foreignPurchaser) ? price * 0.09 : 0;
  return {
    totalDuty: round2(duty + surcharge),
    transferDuty: round2(duty),
    firstHomeSaving: round2(full - duty),
    foreignSurcharge: round2(surcharge),
    effectiveRate: price > 0 ? round2(((duty + surcharge) / price) * 100) : 0,
  };
};

const ON: [number, number][] = [[55_000, 0.5], [250_000, 1], [400_000, 1.5], [2_000_000, 2], [Infinity, 2.5]];
const TORONTO: [number, number][] = [
  [55_000, 0.5], [250_000, 1], [400_000, 1.5], [2_000_000, 2], [3_000_000, 2.5], [4_000_000, 4.5],
  [5_000_000, 5.5], [10_000_000, 6.5], [20_000_000, 7.5], [Infinity, 8.6],
];
const BC: [number, number][] = [[200_000, 1], [2_000_000, 2], [3_000_000, 3], [Infinity, 5]];
const MB: [number, number][] = [[30_000, 0], [90_000, 0.5], [150_000, 1], [200_000, 1.5], [Infinity, 2]];
const QC: [number, number][] = [[61_500, 0.5], [307_800, 1], [Infinity, 1.5]];

export const canadaLandTransferTax: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const first = yes(v.firstTimeBuyer);
  const p = Math.round(nonNeg(v.province));
  let provincial = 0;
  let municipal = 0;
  let rebate = 0;
  if (p === 0 || p === 1) {
    provincial = bracketTax(price, ON);
    if (first) rebate += Math.min(4000, provincial);
    if (p === 1) {
      municipal = bracketTax(price, TORONTO);
      if (first) rebate += Math.min(4475, municipal);
    }
  } else if (p === 2) {
    provincial = bracketTax(price, BC);
    if (first && price <= 860_000) rebate = bracketTax(500_000, BC) * (price <= 835_000 ? 1 : (860_000 - price) / 25_000);
    rebate = Math.min(rebate, provincial);
  } else if (p === 3) provincial = bracketTax(price, MB);
  else if (p === 4) municipal = bracketTax(price, QC);
  else if (p === 5) municipal = (price * nonNeg(v.municipalRate, 1.5)) / 100; // Nova Scotia municipal deed transfer tax
  else if (p === 6) provincial = price * 0.01; // New Brunswick
  else if (p === 7) {
    provincial = price * 0.01; // PEI
    if (first) rebate = provincial;
  } else if (p === 8) provincial = 50 + Math.ceil(price / 5000) * 5; // Alberta title fee
  else if (p === 9) provincial = Math.max(0, price - 500) * 0.004 + 100; // Newfoundland & Labrador registration
  else if (p === 10) provincial = Math.max(0, price - 8400) * 0.003 + 25; // Saskatchewan title fee
  return {
    totalLandTransferTax: round2(Math.max(0, provincial + municipal - rebate)),
    provincialTax: round2(provincial),
    municipalTax: round2(municipal),
    firstTimeBuyerRebate: round2(rebate),
    effectiveRate: price > 0 ? round2((Math.max(0, provincial + municipal - rebate) / price) * 100) : 0,
  };
};

export const italyPropertyTax: CustomCalculator = (v) => {
  const base = nonNeg(v.renditaCatastale) * 1.05 * nonNeg(v.multiplier, 160);
  const main = yes(v.mainHome);
  const luxury = yes(v.luxuryCategory);
  const share = nonNeg(v.ownershipPercent, 100) / 100;
  const months = Math.min(12, nonNeg(v.monthsOwned, 12)) / 12;
  let imu = 0;
  if (!main) imu = (base * nonNeg(v.imuRate)) / 100;
  else if (luxury) imu = Math.max(0, (base * nonNeg(v.mainHomeLuxuryRate, 0.5)) / 100 - 200);
  imu *= share * months;
  return { yearlyImu: round2(imu), juneInstalment: round2(imu / 2), decemberInstalment: round2(imu / 2), taxableValue: round2(base), mainHomeExempt: main && !luxury ? 1 : 0 };
};

export const mexicoPropertyTax: CustomCalculator = (v) => {
  const predialBase = (nonNeg(v.cadastralValue) * nonNeg(v.predialRate)) / 100;
  const discount = Math.min(100, nonNeg(v.earlyPaymentDiscount) + (yes(v.seniorDiscount) ? 50 : 0));
  const predial = predialBase * (1 - discount / 100);
  const isai = (nonNeg(v.purchasePrice) * nonNeg(v.isaiRate)) / 100;
  return { yearlyPredial: round2(predial), predialBeforeDiscounts: round2(predialBase), bimonthlyPredial: round2(predial / 6), acquisitionTaxIsai: round2(isai) };
};

// Local Government Code: residential building assessment levels by fair market value.
const PH_BUILDING_LEVELS: [number, number][] = [
  [175_000, 0], [300_000, 10], [500_000, 20], [750_000, 25], [1_000_000, 30], [2_000_000, 35], [5_000_000, 40], [10_000_000, 50], [Infinity, 60],
];

export const philippinesPropertyTax: CustomCalculator = (v) => {
  const landAv = (nonNeg(v.landFmv) * nonNeg(v.landAssessmentLevel, 20)) / 100;
  const bFmv = nonNeg(v.buildingFmv);
  const level = PH_BUILDING_LEVELS.find(([upTo]) => bFmv <= upTo)?.[1] ?? 60;
  const buildingAv = (bFmv * level) / 100;
  const av = landAv + buildingAv;
  const basicRate = yes(v.inCityOrMetroManila) ? 2 : 1;
  const basic = (av * basicRate) / 100;
  const sef = av * 0.01;
  const gross = basic + sef;
  const net = gross * (1 - nonNeg(v.earlyPaymentDiscount) / 100);
  return { yearlyRealPropertyTax: round2(net), quarterlyPayment: round2(net / 4), assessedValue: round2(av), basicTax: round2(basic), specialEducationFund: round2(sef), buildingAssessmentLevel: level };
};

export const ukCommercialStampDuty: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const region = Math.round(nonNeg(v.region));
  const bands: [number, number][] =
    region === 1 ? [[150_000, 0], [250_000, 1], [Infinity, 5]] : region === 2 ? [[225_000, 0], [250_000, 1], [1_000_000, 5], [Infinity, 6]] : [[150_000, 0], [250_000, 2], [Infinity, 5]];
  const tax = bracketTax(price, bands);
  return { stampDuty: round2(tax), effectiveRate: price > 0 ? round2((tax / price) * 100) : 0, totalCost: round2(price + tax) };
};

export const reTaxLocalCustomCalculators: Record<string, CustomCalculator> = {
  "texas-homestead-exemption-calculator": texasHomesteadExemption,
  "florida-homestead-exemption-calculator": floridaHomesteadExemption,
  "desantis-property-tax-calculator": desantisPropertyTax,
  "los-angeles-property-tax-calculator": prop13Tax,
  "san-francisco-property-tax-calculator": prop13Tax,
  "san-diego-property-tax-calculator": prop13Tax,
  "harris-county-property-tax-calculator": texasLocalTax,
  "austin-property-tax-calculator": texasLocalTax,
  "property-tax-nyc-calculator": nycPropertyTax,
  "las-vegas-property-tax-calculator": lasVegasPropertyTax,
  "depreciation-recapture-calculator": depreciationRecapture,
  "nj-exit-tax-calculator": njExitTax,
  "nyc-transfer-tax-calculator": nycTransferTax,
  "miami-dade-doc-stamp-calculator": miamiDadeDocStamp,
  "chicago-transfer-tax-calculator": chicagoTransferTax,
  "san-francisco-transfer-tax-calculator": sanFranciscoTransferTax,
  "tennessee-transfer-tax-calculator": tennesseeTransferTax,
  "wisconsin-transfer-tax-calculator": wisconsinTransferTax,
  "colorado-transfer-tax-calculator": coloradoTransferTax,
  "philadelphia-transfer-tax-calculator": philadelphiaTransferTax,
  "nsw-stamp-duty-calculator": nswStampDuty,
  "canada-land-transfer-tax-calculator": canadaLandTransferTax,
  "italy-property-tax-calculator": italyPropertyTax,
  "mexico-property-tax-calculator": mexicoPropertyTax,
  "property-tax-philippines-calculator": philippinesPropertyTax,
  "commercial-stamp-duty-calculator": ukCommercialStampDuty,
};
