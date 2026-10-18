/**
 * Batch: "Law & Government Calculators" → Government Benefits Calculators
 * (31 tools).
 *
 * Data:
 *  - 2026 HHS poverty guidelines: $15,960 + $5,680 per person (48 states/DC);
 *    Alaska $19,950 + $7,100; Hawaii $18,360 + $6,530.
 *  - SNAP FY2027 (1 Oct 2026 – 30 Sep 2027, 48 states & DC): maximum
 *    allotments $306 / $562 / $808 / $1,023 / $1,217 / $1,463 / $1,616 /
 *    $1,841 (+$225 each extra person); standard deduction $217 (1–3), $229
 *    (4), $268 (5), $308 (6+); excess shelter cap $769; minimum benefit $25;
 *    gross limit 130% FPL (states with broad-based categorical eligibility go
 *    up to 200%), net limit 100%; 20% earned income deduction; benefit =
 *    maximum − 30% of net income.
 *  - SSI 2026: federal benefit rate $994 individual / $1,491 couple; $20
 *    general and $65 + half earned income exclusions.
 *  - Social Security 2026 PIA bend points $1,286 and $7,749 (90/32/15%);
 *    SSDI 5-month waiting period, 12 months retroactivity, representative fee
 *    cap $9,200. Social Security Fairness Act (Jan 2025) repealed WEP and GPO
 *    for benefits payable after December 2023.
 *  - Medicare Savings Programs 2026: QMB 100%, SLMB 120%, QI 135% FPL + $20.
 *  - ACA employer rules 2026: affordability 9.96% of household income; minimum
 *    value 60%; ALE = 50+ full-time + full-time-equivalent employees (FTE =
 *    part-time hours ÷ 120 a month).
 *  - HUD: total tenant payment = greater of 30% of adjusted income or 10% of
 *    gross; $480 per dependent and $525 elderly/disabled deductions (HOTMA).
 *  - LIHTC: rent = 30% of the income limit for 1.5 persons per bedroom.
 *  - Canada Child Benefit July 2026 – June 2027: $8,157 under 6, $6,883 for
 *    6–17; thresholds $38,237 and $82,847; reduction rates 7/13.5/19/23% then
 *    3.2/5.7/8/9.5% for 1/2/3/4+ children.
 *  - UK Universal Credit 2026/27 (monthly): standard allowance £424.90 single
 *    25+, £338.58 under 25, £666.97 couple 25+, £528.34 couple under 25;
 *    child element £351.88 (first child born before 6 Apr 2017) / £303.94;
 *    work allowance £427 (with housing costs) / £710; taper 55%; the two-child
 *    limit ended from April 2026.
 *  - USDA Expenditures on Children by Families (2015 dollars, birth–17):
 *    $174,690 / $233,610 / $372,210 by income group.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-benefits-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const size = (v: number) => Math.max(1, Math.round(nonNeg(v, 1)));

export function fpg2026(householdSize: number, region = 0): number {
  const [base, add] = region === 1 ? [19950, 7100] : region === 2 ? [18360, 6530] : [15960, 5680];
  return base + add * (size(householdSize) - 1);
}

function fplResult(annualIncome: number, hh: number, region: number) {
  const g = fpg2026(hh, region);
  return { guideline: g, pct: g > 0 ? (nonNeg(annualIncome) / g) * 100 : 0 };
}

// --- SNAP ----------------------------------------------------------------------------------------
export const SNAP_MAX = [306, 562, 808, 1023, 1217, 1463, 1616, 1841];
export const snapMax = (n: number) => (n <= 8 ? SNAP_MAX[n - 1] : Math.min(3887, 1841 + 225 * (n - 8)));
const snapStdDeduction = (n: number) => (n <= 3 ? 217 : n === 4 ? 229 : n === 5 ? 268 : 308);

export const snap: CustomCalculator = (v) => {
  const n = size(v.householdSize);
  const earned = nonNeg(v.monthlyEarnedIncome);
  const unearned = nonNeg(v.monthlyUnearnedIncome);
  const gross = earned + unearned;
  const elderly = Math.round(safeNumber(v.elderlyOrDisabledMember)) === 1;
  const grossLimitPct = nonNeg(v.grossIncomeLimitPercent, 130);
  const fpgMonthly = fpg2026(n) / 12;
  const grossOk = elderly || gross <= (fpgMonthly * grossLimitPct) / 100;
  const medical = elderly ? Math.max(0, nonNeg(v.medicalExpenses) - 35) : 0;
  const adjusted = Math.max(0, gross - 0.2 * earned - snapStdDeduction(n) - nonNeg(v.dependentCare) - nonNeg(v.childSupportPaid) - medical);
  const shelter = nonNeg(v.rentOrMortgage) + nonNeg(v.utilityAllowance);
  const excess = Math.max(0, shelter - adjusted / 2);
  const shelterDeduction = elderly ? excess : Math.min(769, excess);
  const net = Math.max(0, adjusted - shelterDeduction);
  const netOk = net <= fpgMonthly;
  const raw = snapMax(n) - 0.3 * net;
  let benefit = grossOk && netOk ? Math.max(0, Math.floor(raw)) : 0;
  if (grossOk && netOk && n <= 2 && benefit < 25) benefit = 25;
  return {
    monthlySnapBenefit: benefit,
    maximumAllotment: snapMax(n),
    netMonthlyIncome: round2(net),
    shelterDeduction: round2(shelterDeduction),
    passesGrossIncomeTest: grossOk ? 1 : 0,
    passesNetIncomeTest: netOk ? 1 : 0,
    grossIncomeLimit: round2((fpgMonthly * grossLimitPct) / 100),
  };
};

// --- SSI / SSDI ----------------------------------------------------------------------------------
export const SSI_FBR = { individual: 994, couple: 1491 };
export const ssi: CustomCalculator = (v) => {
  const couple = Math.round(safeNumber(v.livingArrangement)) === 1;
  const fbr = couple ? SSI_FBR.couple : SSI_FBR.individual;
  const unearned = nonNeg(v.monthlyUnearnedIncome);
  const earned = nonNeg(v.monthlyEarnedIncome);
  const unearnedCountable = Math.max(0, unearned - 20);
  const leftoverGeneral = Math.max(0, 20 - unearned);
  const earnedCountable = Math.max(0, (earned - 65 - leftoverGeneral) / 2);
  const inKind = Math.round(safeNumber(v.livesInAnothersHousehold)) === 1 ? fbr / 3 : 0;
  const countable = unearnedCountable + earnedCountable;
  const federal = Math.max(0, fbr - countable - inKind);
  const total = federal + nonNeg(v.stateSupplement);
  const resources = nonNeg(v.countableResources);
  const resourceOk = resources <= (couple ? 3000 : 2000);
  return {
    monthlySsiPayment: round2(resourceOk ? total : 0),
    federalBenefitRate: fbr,
    countableIncome: round2(countable),
    inKindReduction: round2(inKind),
    meetsResourceLimit: resourceOk ? 1 : 0,
    annualSsi: round2((resourceOk ? total : 0) * 12),
  };
};

export const BEND_2026: [number, number] = [1286, 7749];
export function pia2026(aime: number): number {
  const a = nonNeg(aime);
  const [b1, b2] = BEND_2026;
  return Math.floor((0.9 * Math.min(a, b1) + 0.32 * Math.max(0, Math.min(a, b2) - b1) + 0.15 * Math.max(0, a - b2)) * 10) / 10;
}

export const ssdi: CustomCalculator = (v) => {
  const direct = nonNeg(v.averageIndexedMonthlyEarnings);
  const aime = direct > 0 ? direct : nonNeg(v.averageAnnualEarnings) / 12;
  const pia = pia2026(aime);
  const kids = Math.min(4, Math.round(nonNeg(v.eligibleDependents)));
  // Family maximum for disability: lesser of 85% of AIME (not below the PIA) or 150% of the PIA.
  const familyMax = Math.max(pia, Math.min(0.85 * aime, 1.5 * pia));
  const auxiliary = Math.min(Math.max(0, familyMax - pia), kids * pia * 0.5);
  return {
    monthlySsdiBenefit: round2(pia),
    monthlyFamilyBenefit: round2(pia + auxiliary),
    annualSsdiBenefit: round2(pia * 12),
    aimeUsed: round2(aime),
    dependentsBenefit: round2(auxiliary),
  };
};

export const ssdiBackPay: CustomCalculator = (v) => {
  const monthly = nonNeg(v.monthlyBenefit);
  const monthsSinceOnset = nonNeg(v.monthsFromOnsetToApproval);
  const monthsSinceApplication = nonNeg(v.monthsFromApplicationToApproval);
  // Benefits start after the 5-month waiting period and can't go back more than 12 months before the application.
  const payableFromOnset = Math.max(0, monthsSinceOnset - 5);
  const months = Math.min(payableFromOnset, monthsSinceApplication + 12);
  const gross = monthly * months;
  const fee = Math.round(safeNumber(v.hasRepresentative, 1)) === 1 ? Math.min(9200, gross * 0.25) : 0;
  return {
    estimatedBackPay: round2(gross),
    monthsOfBackPay: round2(months),
    representativeFee: round2(fee),
    netBackPay: round2(gross - fee),
  };
};

// --- Poverty-line programs -----------------------------------------------------------------------
export const fpl: CustomCalculator = (v) => {
  const { guideline, pct } = fplResult(v.annualIncome, v.householdSize, Math.round(safeNumber(v.region)));
  return {
    percentOfPovertyLevel: round2(pct),
    povertyGuideline: guideline,
    monthlyGuideline: round2(guideline / 12),
    at138Percent: round2(guideline * 1.38),
    at200Percent: round2(guideline * 2),
    at400Percent: round2(guideline * 4),
  };
};

export const NON_EXPANSION = ["Alabama", "Florida", "Georgia", "Kansas", "Mississippi", "South Carolina", "Tennessee", "Texas", "Wisconsin", "Wyoming"];
export const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];
export const medicaid: CustomCalculator = (v) => {
  const state = STATES[Math.min(STATES.length - 1, Math.max(0, Math.round(safeNumber(v.state))))];
  const region = state === "Alaska" ? 1 : state === "Hawaii" ? 2 : 0;
  const { guideline, pct } = fplResult(v.annualIncome, v.householdSize, region);
  const expansion = !NON_EXPANSION.includes(state);
  const group = Math.round(safeNumber(v.applicantType));
  const limit = group === 1 ? nonNeg(v.childLimitPercent, 200) : group === 2 ? nonNeg(v.pregnancyLimitPercent, 200) : group === 3 ? 100 : expansion ? 138 : state === "Wisconsin" ? 100 : nonNeg(v.parentLimitNonExpansion, 0);
  // MAGI rules disregard 5 percentage points of FPL.
  const eligible = pct <= limit + 5;
  return {
    likelyEligible: eligible ? 1 : 0,
    percentOfPovertyLevel: round2(pct),
    incomeLimitPercent: limit,
    annualIncomeLimit: round2((guideline * (limit + 5)) / 100),
    expansionState: expansion ? 1 : 0,
  };
};

export const medicareSavings: CustomCalculator = (v) => {
  const couple = Math.round(safeNumber(v.married)) === 1;
  const g = fpg2026(couple ? 2 : 1, Math.round(safeNumber(v.region))) / 12;
  const income = Math.max(0, nonNeg(v.monthlyIncome) - 20);
  const pct = g > 0 ? (income / g) * 100 : 0;
  const resources = nonNeg(v.countableResources);
  const resourceOk = resources <= (couple ? 14910 : 9950);
  const level = !resourceOk ? 0 : pct <= 100 ? 1 : pct <= 120 ? 2 : pct <= 135 ? 3 : 0;
  return {
    programLevel: level,
    percentOfPovertyLevel: round2(pct),
    qmbIncomeLimit: round2(g + 20),
    slmbIncomeLimit: round2(g * 1.2 + 20),
    qiIncomeLimit: round2(g * 1.35 + 20),
    meetsResourceLimit: resourceOk ? 1 : 0,
  };
};

const thresholdProgram = (pctLimit: number) => (v: Record<string, number>) => {
  const { guideline, pct } = fplResult(v.annualIncome, v.householdSize, Math.round(safeNumber(v.region)));
  const adjunct = Math.round(safeNumber(v.receivesSnapMedicaidTanf)) === 1;
  return {
    likelyEligible: pct <= pctLimit || adjunct ? 1 : 0,
    percentOfPovertyLevel: round2(pct),
    annualIncomeLimit: round2((guideline * pctLimit) / 100),
    monthlyIncomeLimit: round2((guideline * pctLimit) / 1200),
    eligibleThroughOtherProgram: adjunct ? 1 : 0,
  };
};
export const wic: CustomCalculator = thresholdProgram(185);
export const headStart: CustomCalculator = thresholdProgram(100);

export const liheap: CustomCalculator = (v) => {
  const { guideline, pct } = fplResult(v.annualIncome, v.householdSize, Math.round(safeNumber(v.region)));
  const smiLimit = nonNeg(v.stateMedianIncome) * 0.6;
  const limit = Math.max(guideline * 1.5, smiLimit);
  const income = nonNeg(v.annualIncome);
  return {
    likelyEligible: income <= limit || Math.round(safeNumber(v.receivesSnapMedicaidTanf)) === 1 ? 1 : 0,
    annualIncomeLimit: round2(limit),
    percentOfPovertyLevel: round2(pct),
    energyBurdenPercent: round2(income > 0 ? (nonNeg(v.annualEnergyCosts) / income) * 100 : 0),
  };
};

export const childCareAssistance: CustomCalculator = (v) => {
  const income = nonNeg(v.annualIncome);
  const smi = nonNeg(v.stateMedianIncome);
  const limitPct = Math.min(85, nonNeg(v.stateLimitPercentOfSmi, 85));
  const limit = (smi * limitPct) / 100;
  const copayCap = income * 0.07;
  const cost = nonNeg(v.annualChildCareCost);
  return {
    likelyEligible: income <= limit ? 1 : 0,
    incomeLimit: round2(limit),
    maximumFamilyCopayPerYear: round2(copayCap),
    estimatedSubsidyPerYear: round2(income <= limit ? Math.max(0, cost - copayCap) : 0),
    percentOfStateMedianIncome: round2(smi > 0 ? (income / smi) * 100 : 0),
  };
};

export const tanf: CustomCalculator = (v) => {
  const max = nonNeg(v.stateMaximumGrant);
  const earned = nonNeg(v.monthlyEarnedIncome);
  const disregard = nonNeg(v.earnedIncomeDisregard, 90) + (earned > nonNeg(v.earnedIncomeDisregard, 90) ? (earned - nonNeg(v.earnedIncomeDisregard, 90)) * (nonNeg(v.percentDisregard, 50) / 100) : 0);
  const countable = Math.max(0, earned - disregard) + nonNeg(v.monthlyUnearnedIncome);
  const benefit = Math.max(0, max - countable);
  return {
    monthlyTanfBenefit: round2(benefit),
    countableIncome: round2(countable),
    earnedIncomeDisregarded: round2(Math.min(earned, disregard)),
    annualBenefit: round2(benefit * 12),
  };
};

// --- Housing -------------------------------------------------------------------------------------
export const section8: CustomCalculator = (v) => {
  const gross = nonNeg(v.annualIncome);
  const deductions = 480 * Math.round(nonNeg(v.dependents)) + (Math.round(safeNumber(v.elderlyOrDisabled)) === 1 ? 525 : 0) + nonNeg(v.annualChildCare) + nonNeg(v.unreimbursedMedical);
  const adjusted = Math.max(0, gross - deductions);
  const ttp = Math.max(0.3 * (adjusted / 12), 0.1 * (gross / 12), nonNeg(v.minimumRent, 50));
  const grossRent = nonNeg(v.contractRent) + nonNeg(v.utilityAllowance);
  const standard = nonNeg(v.paymentStandard) || grossRent;
  const hap = Math.max(0, Math.min(standard, grossRent) - ttp);
  const tenantPays = grossRent - hap - nonNeg(v.utilityAllowance);
  return {
    tenantRentToLandlord: round2(Math.max(0, tenantPays)),
    totalTenantPayment: round2(ttp),
    housingAssistancePayment: round2(hap),
    adjustedAnnualIncome: round2(adjusted),
    rentBurdenPercent: round2(gross > 0 ? ((tenantPays + nonNeg(v.utilityAllowance)) * 12 / gross) * 100 : 0),
    over40PercentAtMoveIn: (tenantPays + nonNeg(v.utilityAllowance)) > 0.4 * (adjusted / 12) ? 1 : 0,
  };
};

export const voucherBedrooms: CustomCalculator = (v) => {
  const people = size(v.householdSize);
  const perRoom = Math.max(1, Math.round(nonNeg(v.personsPerBedroom, 2)));
  const adults = Math.round(nonNeg(v.unrelatedAdults));
  const bedrooms = Math.max(people === 1 ? 0 : 1, Math.ceil((people - adults) / perRoom) + adults) + (Math.round(safeNumber(v.liveInAide)) === 1 ? 1 : 0);
  return {
    voucherBedroomSize: bedrooms,
    peopleCounted: people,
    oneBedroomAllowedForSingle: people === 1 ? 1 : 0,
  };
};

const LIHTC_SHARE: Record<number, number> = { 0: 0.7, 1: 0.75, 2: 0.9, 3: 1.04, 4: 1.16, 5: 1.28 };
export const lihtcRent: CustomCalculator = (v) => {
  const ami4 = nonNeg(v.areaMedianIncomeFamilyOf4);
  const br = Math.min(5, Math.max(0, Math.round(nonNeg(v.bedrooms))));
  const setAside = nonNeg(v.incomeLimitPercent, 60) / 100;
  const incomeLimit = ami4 * LIHTC_SHARE[br] * setAside;
  const grossRent = (incomeLimit * 0.3) / 12;
  return {
    maximumTenantRent: round2(Math.max(0, grossRent - nonNeg(v.utilityAllowance))),
    maximumGrossRent: round2(grossRent),
    incomeLimitForUnit: round2(incomeLimit),
    imputedHouseholdSize: br === 0 ? 1 : br * 1.5,
  };
};

const USDA_PROGRAMS: [string, number][] = [["Guaranteed home loan (115% of AMI)", 1.15], ["Direct home loan — low income (80% of AMI)", 0.8], ["Direct home loan / rental — very low income (50% of AMI)", 0.5]];
export { USDA_PROGRAMS };
export const usdaIncome: CustomCalculator = (v) => {
  const p = USDA_PROGRAMS[Math.min(2, Math.max(0, Math.round(safeNumber(v.program))))][1];
  const limit = nonNeg(v.areaMedianIncome) * p;
  const deductions = 480 * Math.round(nonNeg(v.childrenUnder18)) + (Math.round(safeNumber(v.elderlyOrDisabled)) === 1 ? 400 : 0) + nonNeg(v.childCareExpenses) + nonNeg(v.medicalExpenses);
  const adjusted = Math.max(0, nonNeg(v.annualHouseholdIncome) - deductions);
  return {
    adjustedAnnualIncome: round2(adjusted),
    incomeLimit: round2(limit),
    underTheLimit: adjusted <= limit ? 1 : 0,
    roomUnderLimit: round2(limit - adjusted),
  };
};

// --- National debt and Social Security outlook ---------------------------------------------------
export const nationalDebt: CustomCalculator = (v) => {
  const debt = nonNeg(v.totalDebtTrillions, 39.8) * 1e12;
  const pop = Math.max(1, nonNeg(v.populationMillions, 343)) * 1e6;
  const taxpayers = Math.max(1, nonNeg(v.taxpayersMillions, 160)) * 1e6;
  const households = Math.max(1, nonNeg(v.householdsMillions, 133)) * 1e6;
  const deficit = nonNeg(v.annualDeficitTrillions, 1.9) * 1e12;
  const gdp = Math.max(1, nonNeg(v.gdpTrillions, 31)) * 1e12;
  const surplus = nonNeg(v.annualSurplusToRepayTrillions);
  return {
    debtPerPerson: round2(debt / pop),
    debtPerTaxpayer: round2(debt / taxpayers),
    debtPerHousehold: round2(debt / households),
    debtToGdpPercent: round2((debt / gdp) * 100),
    debtGrowthPerSecond: round2(deficit / (365 * 86400)),
    deficitPerPerson: round2(deficit / pop),
    yearsToRepay: round2(surplus > 0 ? debt / (surplus * 1e12) : 0),
  };
};

export const socialSecurityCuts: CustomCalculator = (v) => {
  const benefit = nonNeg(v.monthlyBenefit);
  const payable = Math.min(100, nonNeg(v.payablePercent, 77)) / 100;
  const cut = benefit * (1 - payable);
  return {
    benefitAfterCut: round2(benefit * payable),
    monthlyCut: round2(cut),
    annualCut: round2(cut * 12),
    cutPercent: round2((1 - payable) * 100),
  };
};

export const wepRepeal: CustomCalculator = (v) => {
  const aime = nonNeg(v.aime);
  const years = Math.round(nonNeg(v.yearsOfSubstantialEarnings));
  const factor = years >= 30 ? 0.9 : years <= 20 ? 0.4 : 0.4 + (years - 20) * 0.05;
  const [b1, b2] = BEND_2026;
  const full = pia2026(aime);
  const wep = factor * Math.min(aime, b1) + 0.32 * Math.max(0, Math.min(aime, b2) - b1) + 0.15 * Math.max(0, aime - b2);
  const reduction = Math.min(full - wep, nonNeg(v.monthlyPension) / 2);
  const gpo = (nonNeg(v.monthlyPension) * 2) / 3;
  const spousal = Math.min(nonNeg(v.spousalOrSurvivorBenefit), gpo);
  const monthly = Math.max(0, reduction) + spousal;
  const months = nonNeg(v.monthsSinceJan2024, 33);
  return {
    monthlyIncreaseFromRepeal: round2(monthly),
    wepReductionRemoved: round2(Math.max(0, reduction)),
    gpoReductionRemoved: round2(spousal),
    retroactivePayment: round2(monthly * months),
    fullBenefitNow: round2(full),
  };
};

// --- ACA employer rules --------------------------------------------------------------------------
export const ACA_AFFORDABILITY_2026 = 9.96;
export const acaAffordability: CustomCalculator = (v) => {
  const premium = nonNeg(v.employeeMonthlyPremium) * 12;
  const method = Math.round(safeNumber(v.safeHarbor));
  const income = method === 1 ? nonNeg(v.boxOneW2Wages) : method === 2 ? nonNeg(v.hourlyRate) * 130 * 12 : method === 3 ? (fpg2026(1) / 12) * 12 : nonNeg(v.householdIncome);
  const pct = income > 0 ? (premium / income) * 100 : 0;
  const maxPremium = (income * ACA_AFFORDABILITY_2026) / 100 / 12;
  return {
    affordable: pct <= ACA_AFFORDABILITY_2026 ? 1 : 0,
    premiumPercentOfIncome: round2(pct),
    maximumAffordableMonthlyPremium: round2(maxPremium),
    affordabilityThresholdPercent: ACA_AFFORDABILITY_2026,
  };
};

export const minimumValue: CustomCalculator = (v) => {
  const total = Math.max(1, nonNeg(v.totalExpectedClaims));
  const planPays = nonNeg(v.planPaidClaims);
  const av = (planPays / total) * 100;
  return {
    actuarialValuePercent: round2(av),
    meetsMinimumValue: av >= 60 ? 1 : 0,
    shortfallPercentagePoints: round2(Math.max(0, 60 - av)),
    metalTierEquivalent: av >= 88 ? 4 : av >= 78 ? 3 : av >= 68 ? 2 : av >= 58 ? 1 : 0,
  };
};

export const aleTest: CustomCalculator = (v) => {
  const ft = nonNeg(v.averageFullTimeEmployees);
  const fte = nonNeg(v.monthlyPartTimeHours) / 120;
  const total = ft + fte;
  return {
    applicableLargeEmployer: total >= 50 ? 1 : 0,
    fullTimeEquivalents: round2(fte),
    totalCountedEmployees: round2(total),
    employeesUntilAle: round2(Math.max(0, 50 - total)),
  };
};

// --- Health billing & disability ------------------------------------------------------------------
export const hospitalFinancialAssistance: CustomCalculator = (v) => {
  const { pct } = fplResult(v.annualIncome, v.householdSize, Math.round(safeNumber(v.region)));
  const free = nonNeg(v.freeCareLimitPercent, 200);
  const disc = nonNeg(v.discountLimitPercent, 400);
  const bill = nonNeg(v.billAmount);
  const discountPct = pct <= free ? 100 : pct <= disc ? nonNeg(v.discountPercent, 60) : 0;
  return {
    estimatedDiscountPercent: discountPct,
    amountYouMayOwe: round2(bill * (1 - discountPct / 100)),
    percentOfPovertyLevel: round2(pct),
    likelyFreeCare: pct <= free ? 1 : 0,
  };
};

export const noSurprises: CustomCalculator = (v) => {
  const gfe = nonNeg(v.goodFaithEstimate);
  const bill = nonNeg(v.actualBill);
  const over = bill - gfe;
  return {
    amountOverEstimate: round2(over),
    canDispute: over >= 400 ? 1 : 0,
    disputeFee: 25,
    amountAtStake: round2(Math.max(0, over)),
  };
};

export const ltdBuyout: CustomCalculator = (v) => {
  const monthly = nonNeg(v.monthlyBenefit) - nonNeg(v.monthlyOffsets);
  const months = Math.max(0, (nonNeg(v.benefitEndAge, 65) - nonNeg(v.currentAge, 45)) * 12);
  const r = nonNeg(v.discountRatePercent, 5) / 100 / 12;
  const pv = r > 0 ? (Math.max(0, monthly) * (1 - Math.pow(1 + r, -months))) / r : Math.max(0, monthly) * months;
  const prob = Math.min(100, nonNeg(v.probabilityStayingOnClaimPercent, 70)) / 100;
  const offer = pv * prob;
  return {
    presentValueOfFutureBenefits: round2(pv),
    riskAdjustedValue: round2(offer),
    typicalOfferLow: round2(pv * 0.3),
    typicalOfferHigh: round2(pv * 0.7),
    monthsRemaining: Math.round(months),
  };
};

export const costOfRaisingChild: CustomCalculator = (v) => {
  const base = [174690, 233610, 372210][Math.min(2, Math.max(0, Math.round(safeNumber(v.incomeGroup, 1))))];
  const inflation = nonNeg(v.inflationFactor, 1.37);
  const kids = Math.round(nonNeg(v.childrenInFamily, 2));
  const adj = kids <= 1 ? 1.27 : kids >= 3 ? 0.78 : 1;
  const total = base * inflation * adj;
  return {
    totalCostBirthTo17: round2(total),
    averagePerYear: round2(total / 18),
    averagePerMonth: round2(total / 216),
    collegeNotIncluded: 1,
  };
};

// --- International -------------------------------------------------------------------------------
export const canadaChildBenefit: CustomCalculator = (v) => {
  const under6 = Math.round(nonNeg(v.childrenUnder6));
  const older = Math.round(nonNeg(v.children6To17));
  const n = under6 + older;
  const max = under6 * 8157 + older * 6883;
  const afni = nonNeg(v.adjustedFamilyNetIncome);
  const k = Math.min(4, Math.max(1, n));
  const r1 = [0.07, 0.135, 0.19, 0.23][k - 1];
  const r2 = [0.032, 0.057, 0.08, 0.095][k - 1];
  const red = n === 0 ? 0 : Math.min(afni, 82847) > 38237 ? (Math.min(afni, 82847) - 38237) * r1 + Math.max(0, afni - 82847) * r2 : 0;
  const annual = Math.max(0, max - red);
  return {
    annualCcb: round2(annual),
    monthlyCcb: round2(annual / 12),
    maximumBeforeReduction: max,
    incomeReduction: round2(Math.min(max, red)),
  };
};

export const universalCredit: CustomCalculator = (v) => {
  const couple = Math.round(safeNumber(v.relationship)) === 1;
  const under25 = Math.round(safeNumber(v.under25)) === 1;
  const standard = couple ? (under25 ? 528.34 : 666.97) : under25 ? 338.58 : 424.9;
  const kids = Math.round(nonNeg(v.children));
  const firstPre2017 = Math.round(safeNumber(v.firstChildBornBefore2017)) === 1;
  const child = kids === 0 ? 0 : (firstPre2017 ? 351.88 : 303.94) + (kids - 1) * 303.94;
  const housing = nonNeg(v.monthlyRentEligible);
  const other = nonNeg(v.otherElements);
  const scp = kids > 0 && Math.round(safeNumber(v.scotland)) === 1 ? (nonNeg(v.scottishChildPaymentWeekly, 27.15) * 52 * Math.min(kids, Math.round(nonNeg(v.childrenUnder16, kids)))) / 12 : 0;
  const maxAward = standard + child + housing + other;
  const allowance = kids > 0 || Math.round(safeNumber(v.limitedCapabilityForWork)) === 1 ? (housing > 0 ? 427 : 710) : 0;
  const earnings = nonNeg(v.monthlyNetEarnings);
  const taper = Math.max(0, earnings - allowance) * 0.55;
  const uc = Math.max(0, maxAward - taper - nonNeg(v.otherMonthlyIncome));
  return {
    monthlyUniversalCredit: round2(uc),
    maximumAward: round2(maxAward),
    earningsReduction: round2(taper),
    workAllowance: allowance,
    scottishChildPaymentMonthly: round2(scp),
    totalMonthlySupport: round2(uc + scp),
  };
};

export const lawBenefitsCustomCalculators: Record<string, CustomCalculator> = {
  "snap-calculator": snap,
  "ssi-calculator": ssi,
  "ssdi-calculator": ssdi,
  "ssdi-back-pay-calculator": ssdiBackPay,
  "federal-poverty-level-calculator": fpl,
  "medicaid-eligibility-calculator": medicaid,
  "medicare-savings-program-calculator": medicareSavings,
  "wic-calculator": wic,
  "head-start-eligibility-calculator": headStart,
  "liheap-calculator": liheap,
  "child-care-assistance-calculator": childCareAssistance,
  "tanf-calculator": tanf,
  "section-8-rent-calculator": section8,
  "voucher-bedroom-size-calculator": voucherBedrooms,
  "lihtc-rent-calculator": lihtcRent,
  "usda-income-eligibility-calculator": usdaIncome,
  "national-debt-calculator": nationalDebt,
  "social-security-cuts-calculator": socialSecurityCuts,
  "wep-gpo-repeal-calculator": wepRepeal,
  "aca-affordability-calculator": acaAffordability,
  "aca-minimum-value-calculator": minimumValue,
  "aca-ale-calculator": aleTest,
  "hospital-financial-assistance-calculator": hospitalFinancialAssistance,
  "no-surprises-act-calculator": noSurprises,
  "long-term-disability-buyout-calculator": ltdBuyout,
  "cost-of-raising-a-child-calculator": costOfRaisingChild,
  "canada-child-benefit-calculator": canadaChildBenefit,
  "universal-credit-calculator": universalCredit,
};
