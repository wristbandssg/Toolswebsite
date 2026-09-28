/**
 * Batch: "Retirement Calculators" sub-batch E (Pensions & Social Security,
 * 12 tools). Part of the Retirement Calculators build-out — see
 * calc-engine-retirement-planning.ts for the full list of 7 sub-batches.
 * Filed under Finance Calculators > Retirement Calculators.
 *
 * Social Security rules (SSA, 2026):
 *  - Full retirement age (FRA): 66 for births 1943–1954, rising 2 months a
 *    year for 1955–1959, 67 for 1960 or later.
 *  - Claiming early: benefit cut 5/9 of 1% a month for the first 36 months,
 *    5/12 of 1% for each month beyond. Spousal benefits: 25/36 of 1% a month
 *    for the first 36, 5/12 of 1% beyond.
 *  - Delaying past FRA: +2/3 of 1% a month (8% a year) up to age 70; no
 *    delayed credits on spousal benefits.
 *  - 2026 PIA formula: 90% of AIME up to $1,286, 32% up to $7,749, 15%
 *    above. Taxable maximum $184,500.
 *  - 2026 earnings test: $1 withheld per $2 over $24,480 (under FRA all
 *    year); $1 per $3 over $65,160 in the year you reach FRA.
 *
 * Near-namesakes, and how each is deliberately different (pension-
 * calculator estimates a benefit from salary × service × accrual; social-
 * security-calculator adjusts a benefit by whole claiming ages):
 *  - pensionIncomeCalculator: single-life vs joint-and-survivor payout
 *    options and what a surviving spouse would get.
 *  - pensionLumpSumVsAnnuityCalculator: the offer's value in today's money
 *    and the return the monthly pension implies.
 *  - pensionPresentValueCalculator: a DEFERRED pension with a COLA valued
 *    today.
 *  - pensionCommutationCalculator: UK-style commutation — giving up pension
 *    for a tax-free lump sum at a commutation factor (pounds).
 *  - socialSecurityBenefitCalculator: the benefit (PIA) from average
 *    earnings using the 2026 bend points.
 *  - socialSecurityRetirementAgeCalculator: your FRA from birth year and
 *    what claiming at 62 or 70 does.
 *  - socialSecurityEarlyRetirementCalculator: month-precise early claiming
 *    reduction.
 *  - socialSecurityDelayedRetirementCalculator: delayed credits and the age
 *    at which waiting pays off.
 *  - socialSecurityBreakEvenCalculator: any two claiming choices compared,
 *    cumulative totals and break-even age.
 *  - socialSecuritySpousalBenefitsCalculator: own benefit + spousal top-up.
 *  - socialSecurityEarningsTestCalculator: benefits withheld for working
 *    before FRA.
 *  - socialSecurityLifetimeBenefitsCalculator: total benefits to a chosen
 *    age, with COLAs, in future and today's dollars.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-retirement-pension-social-security-calculators.ts for
 * the tool content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const BEND_POINT_1_2026 = 1286;
const BEND_POINT_2_2026 = 7749;
const TAXABLE_MAX_2026 = 184500;
const EARNINGS_TEST_UNDER_FRA_2026 = 24480;
const EARNINGS_TEST_FRA_YEAR_2026 = 65160;

// Full retirement age in months (e.g. 67 years = 804) for a birth year.
function fraMonths(birthYear: number): number {
  const y = Math.round(birthYear);
  if (y <= 1954) return 66 * 12;
  if (y >= 1960) return 67 * 12;
  return 66 * 12 + (y - 1954) * 2;
}

// Worker benefit as a share of PIA when claiming `claimMonths` (age in
// months) with FRA at `fra` months. Delayed credits stop at 70.
function workerFactor(claimMonths: number, fra: number): number {
  if (claimMonths < fra) {
    const early = fra - claimMonths;
    return 1 - (Math.min(early, 36) * 5) / 900 - (Math.max(0, early - 36) * 5) / 1200;
  }
  const late = Math.min(claimMonths, 70 * 12) - fra;
  return 1 + (late * 2) / 300;
}

// Spousal benefit as a share of the full spousal amount (no delayed credits).
function spousalFactor(claimMonths: number, fra: number): number {
  if (claimMonths >= fra) return 1;
  const early = fra - claimMonths;
  return 1 - (Math.min(early, 36) * 25) / 3600 - (Math.max(0, early - 36) * 5) / 1200;
}

// Claiming age in months from separate years + months inputs, 62–70.
function claimAgeMonths(years: number, months: number): number {
  const total = Math.round(years) * 12 + Math.round(months);
  return Math.min(70 * 12, Math.max(62 * 12, total));
}

// --- 1. Pension Income Calculator (payout options) --------------------------
export const pensionIncomeCalculator: CustomCalculator = (values) => {
  const singleLifeMonthly = Math.max(0, safeNumber(values.singleLifeMonthly, 3000));
  const js50ReductionPercent = Math.min(100, Math.max(0, safeNumber(values.js50ReductionPercent, 7)));
  const js100ReductionPercent = Math.min(100, Math.max(0, safeNumber(values.js100ReductionPercent, 13)));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 15)));

  const js50 = singleLifeMonthly * (1 - js50ReductionPercent / 100);
  const js100 = singleLifeMonthly * (1 - js100ReductionPercent / 100);

  return {
    singleLifeMonthly: round2(singleLifeMonthly),
    jointSurvivor50Monthly: round2(js50),
    survivorGetsUnder50Option: round2(js50 / 2),
    jointSurvivor100Monthly: round2(js100),
    singleLifeAfterTaxMonthly: round2(singleLifeMonthly * (1 - taxRatePercent / 100)),
  };
};

// --- 2. Pension Lump Sum vs Annuity Calculator --------------------------------
export const pensionLumpSumVsAnnuityCalculator: CustomCalculator = (values) => {
  const lumpSumOffer = Math.max(0, safeNumber(values.lumpSumOffer, 400000));
  const monthlyPension = Math.max(0, safeNumber(values.monthlyPension, 2400));
  const yearsOfPayments = Math.max(1, Math.round(safeNumber(values.yearsOfPayments, 22)));
  const discountRatePercent = Math.max(0, safeNumber(values.discountRatePercent, 5));

  const n = yearsOfPayments * 12;
  const pvAt = (i: number) => (i === 0 ? monthlyPension * n : (monthlyPension * (1 - Math.pow(1 + i, -n))) / i);
  const pv = pvAt(discountRatePercent / 100 / 12);
  // Monthly return at which the pension's value equals the lump sum.
  let implied = 0;
  if (monthlyPension * n > lumpSumOffer && lumpSumOffer > 0) {
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2;
      if (pvAt(mid) > lumpSumOffer) lo = mid;
      else hi = mid;
    }
    implied = ((lo + hi) / 2) * 12 * 100;
  }

  return {
    pensionValueToday: round2(pv),
    pensionMinusLumpSum: round2(pv - lumpSumOffer),
    impliedReturnPercent: round2(implied),
    yearsToCollectTheLumpSum: monthlyPension > 0 ? round2(lumpSumOffer / monthlyPension / 12) : 0,
    totalPensionPayments: round2(monthlyPension * n),
  };
};

// --- 3. Pension Present Value Calculator (deferred, with COLA) ------------
export const pensionPresentValueCalculator: CustomCalculator = (values) => {
  const monthlyPension = Math.max(0, safeNumber(values.monthlyPension, 2000));
  const yearsUntilStart = Math.max(0, Math.round(safeNumber(values.yearsUntilStart, 10)));
  const yearsOfPayments = Math.max(1, Math.round(safeNumber(values.yearsOfPayments, 25)));
  const colaPercent = Math.max(0, safeNumber(values.colaPercent, 2));
  const discountRatePercent = Math.max(0, safeNumber(values.discountRatePercent, 5));

  const i = discountRatePercent / 100 / 12;
  let pvAtStart = 0;
  let total = 0;
  for (let m = 0; m < yearsOfPayments * 12; m++) {
    // COLA raises the payment once a year; payments at the end of each month.
    const pay = monthlyPension * Math.pow(1 + colaPercent / 100, Math.floor(m / 12));
    total += pay;
    pvAtStart += pay / Math.pow(1 + i, m + 1);
  }
  const pvToday = pvAtStart / Math.pow(1 + i, yearsUntilStart * 12);

  return {
    presentValueToday: round2(pvToday),
    valueWhenPaymentsStart: round2(pvAtStart),
    totalPaymentsReceived: round2(total),
    finalMonthlyPayment: round2(monthlyPension * Math.pow(1 + colaPercent / 100, yearsOfPayments - 1)),
  };
};

// --- 4. Pension Commutation Calculator (UK, factor-based) ----------------
export const pensionCommutationCalculator: CustomCalculator = (values) => {
  const annualPension = Math.max(0, safeNumber(values.annualPension, 20000));
  const pensionGivenUpPercent = Math.min(100, Math.max(0, safeNumber(values.pensionGivenUpPercent, 20)));
  const commutationFactor = Math.max(0, safeNumber(values.commutationFactor, 12));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 20)));

  const givenUp = (annualPension * pensionGivenUpPercent) / 100;
  const lump = givenUp * commutationFactor;
  const afterTaxGivenUp = givenUp * (1 - taxRatePercent / 100);

  return {
    taxFreeLumpSum: round2(lump),
    reducedAnnualPension: round2(annualPension - givenUp),
    pensionGivenUpPerYear: round2(givenUp),
    yearsToBreakEvenAfterTax: afterTaxGivenUp > 0 ? round2(lump / afterTaxGivenUp) : 0,
  };
};

// --- 5. Social Security Benefit Calculator (2026 PIA formula) -------------
export const socialSecurityBenefitCalculator: CustomCalculator = (values) => {
  const averageAnnualEarnings = Math.max(0, safeNumber(values.averageAnnualEarnings, 65000));
  const yearsWorked = Math.max(0, Math.round(safeNumber(values.yearsWorked, 35)));

  // AIME: the top 35 years' (indexed) earnings ÷ 420 months; missing years
  // count as zero. Each year is capped at the taxable maximum.
  const aime = Math.floor((Math.min(averageAnnualEarnings, TAXABLE_MAX_2026) * Math.min(yearsWorked, 35)) / 35 / 12);
  const raw =
    0.9 * Math.min(aime, BEND_POINT_1_2026) +
    0.32 * Math.max(0, Math.min(aime, BEND_POINT_2_2026) - BEND_POINT_1_2026) +
    0.15 * Math.max(0, aime - BEND_POINT_2_2026);
  const pia = Math.floor(raw * 10) / 10; // SSA rounds down to the dime

  return {
    monthlyBenefitAtFullRetirementAge: pia,
    averageIndexedMonthlyEarnings: aime,
    monthlyBenefitAt62: round2(pia * 0.7),
    monthlyBenefitAt70: round2(pia * 1.24),
    earningsReplacedPercent: averageAnnualEarnings > 0 ? round2(((pia * 12) / averageAnnualEarnings) * 100) : 0,
  };
};

// --- 6. Social Security Retirement Age Calculator (FRA by birth year) -----
export const socialSecurityRetirementAgeCalculator: CustomCalculator = (values) => {
  const birthYear = Math.max(1943, Math.min(2010, Math.round(safeNumber(values.birthYear, 1962))));

  const fra = fraMonths(birthYear);
  const at62 = workerFactor(62 * 12, fra);
  const at70 = workerFactor(70 * 12, fra);

  return {
    fullRetirementAgeYears: Math.floor(fra / 12),
    fullRetirementAgeExtraMonths: fra % 12,
    monthsEarlyIfClaimAt62: fra - 62 * 12,
    benefitAt62PercentOfFull: round2(at62 * 100),
    benefitAt70PercentOfFull: round2(at70 * 100),
  };
};

// --- 7. Social Security Early Retirement Calculator ----------------------
export const socialSecurityEarlyRetirementCalculator: CustomCalculator = (values) => {
  const pia = Math.max(0, safeNumber(values.pia, 2200));
  const birthYear = Math.max(1943, Math.min(2010, Math.round(safeNumber(values.birthYear, 1964))));
  const claimAgeYears = safeNumber(values.claimAgeYears, 63);
  const claimAgeExtraMonths = Math.min(11, Math.max(0, safeNumber(values.claimAgeExtraMonths, 6)));

  const fra = fraMonths(birthYear);
  const claim = Math.min(claimAgeMonths(claimAgeYears, claimAgeExtraMonths), fra);
  const factor = workerFactor(claim, fra);
  const benefit = Math.floor(pia * factor);

  return {
    monthlyBenefit: benefit,
    reductionPercent: round2((1 - factor) * 100),
    monthsBeforeFullRetirementAge: fra - claim,
    lessPerYearThanAtFullAge: round2((pia - benefit) * 12),
  };
};

// --- 8. Social Security Delayed Retirement Calculator ---------------------
export const socialSecurityDelayedRetirementCalculator: CustomCalculator = (values) => {
  const pia = Math.max(0, safeNumber(values.pia, 2200));
  const birthYear = Math.max(1943, Math.min(2010, Math.round(safeNumber(values.birthYear, 1964))));
  const claimAgeYears = safeNumber(values.claimAgeYears, 70);
  const claimAgeExtraMonths = Math.min(11, Math.max(0, safeNumber(values.claimAgeExtraMonths, 0)));

  const fra = fraMonths(birthYear);
  const claim = Math.max(claimAgeMonths(claimAgeYears, claimAgeExtraMonths), fra);
  const factor = workerFactor(claim, fra);
  const benefit = Math.floor(pia * factor);
  const monthsWaited = claim - fra;
  const extraPerMonth = benefit - pia;
  // Months of higher checks needed to make up the checks skipped while waiting.
  const monthsToRecover = extraPerMonth > 0 ? (pia * monthsWaited) / extraPerMonth : 0;

  return {
    monthlyBenefit: benefit,
    delayedCreditPercent: round2((factor - 1) * 100),
    extraPerYearVsFullAge: round2(extraPerMonth * 12),
    breakEvenAge: monthsWaited > 0 ? round2((claim + monthsToRecover) / 12) : 0,
  };
};

// --- 9. Social Security Break-Even Calculator (two choices) ---------------
export const socialSecurityBreakEvenCalculator: CustomCalculator = (values) => {
  const earlyAge = Math.max(62, Math.min(70, safeNumber(values.earlyAge, 62)));
  const earlyMonthly = Math.max(0, safeNumber(values.earlyMonthly, 1540));
  const laterAge = Math.max(earlyAge, Math.min(70, safeNumber(values.laterAge, 70)));
  const laterMonthly = Math.max(0, safeNumber(values.laterMonthly, 2728));
  const colaPercent = Math.max(0, safeNumber(values.colaPercent, 0));

  // Month by month from the earlier start; both choices get the same COLA
  // each January-equivalent (every 12 months from the early start).
  const start = Math.round(earlyAge * 12);
  const laterStart = Math.round(laterAge * 12);
  let cumEarly = 0;
  let cumLater = 0;
  let breakEven = 0;
  const at: Record<number, [number, number]> = {};
  for (let m = start; m < 100 * 12; m++) {
    const cola = Math.pow(1 + colaPercent / 100, Math.floor((m - start) / 12));
    cumEarly += earlyMonthly * cola;
    if (m >= laterStart) cumLater += laterMonthly * cola;
    if (!breakEven && m >= laterStart && cumLater >= cumEarly) breakEven = (m + 1) / 12;
    if ((m + 1) % 12 === 0) at[(m + 1) / 12] = [cumEarly, cumLater];
  }
  const get = (age: number, k: 0 | 1) => (at[age] ? at[age][k] : 0);

  return {
    // 0 = the later choice never catches up before age 100.
    breakEvenAge: round2(breakEven),
    totalByAge80Early: round2(get(80, 0)),
    totalByAge80Later: round2(get(80, 1)),
    totalByAge90Early: round2(get(90, 0)),
    totalByAge90Later: round2(get(90, 1)),
  };
};

// --- 10. Social Security Spousal Benefits Calculator -------------------------
export const socialSecuritySpousalBenefitsCalculator: CustomCalculator = (values) => {
  const workerPia = Math.max(0, safeNumber(values.workerPia, 3000));
  const spouseOwnPia = Math.max(0, safeNumber(values.spouseOwnPia, 800));
  const spouseBirthYear = Math.max(1943, Math.min(2010, Math.round(safeNumber(values.spouseBirthYear, 1963))));
  const spouseClaimAgeYears = safeNumber(values.spouseClaimAgeYears, 67);
  const spouseClaimAgeExtraMonths = Math.min(11, Math.max(0, safeNumber(values.spouseClaimAgeExtraMonths, 0)));

  const fra = fraMonths(spouseBirthYear);
  const claim = claimAgeMonths(spouseClaimAgeYears, spouseClaimAgeExtraMonths);
  const own = spouseOwnPia * workerFactor(claim, fra);
  // The spousal top-up is based on the excess of half the worker's PIA over
  // the spouse's own PIA, reduced for claiming early (no delayed credits).
  const excess = Math.max(0, 0.5 * workerPia - spouseOwnPia);
  const topUp = excess * spousalFactor(claim, fra);
  const total = Math.floor(own + topUp);

  return {
    spouseTotalMonthly: total,
    spouseOwnBenefit: round2(own),
    spousalTopUp: round2(topUp),
    maxSpousalAtFullAge: round2(Math.max(0.5 * workerPia, spouseOwnPia)),
    householdMonthlyWithWorkerAtFullAge: round2(workerPia + total),
  };
};

// --- 11. Social Security Earnings Test Calculator (2026) ----------------------
export const socialSecurityEarningsTestCalculator: CustomCalculator = (values) => {
  const monthlyBenefit = Math.max(0, safeNumber(values.monthlyBenefit, 1800));
  const expectedEarnings = Math.max(0, safeNumber(values.expectedEarnings, 40000));
  // 1 = under full retirement age all year, 2 = reaching FRA this year
  const stage = Math.round(safeNumber(values.stage, 1)) === 2 ? 2 : 1;
  const monthsOfBenefitsThisYear = Math.min(12, Math.max(1, Math.round(safeNumber(values.monthsOfBenefitsThisYear, 12))));

  const limit = stage === 1 ? EARNINGS_TEST_UNDER_FRA_2026 : EARNINGS_TEST_FRA_YEAR_2026;
  const excess = Math.max(0, expectedEarnings - limit);
  const withheld = Math.min(excess / (stage === 1 ? 2 : 3), monthlyBenefit * monthsOfBenefitsThisYear);
  // SSA holds back whole monthly checks until the amount is covered.
  const checksHeld = monthlyBenefit > 0 ? Math.min(monthsOfBenefitsThisYear, Math.ceil(withheld / monthlyBenefit - 1e-9)) : 0;

  return {
    amountWithheld: round2(withheld),
    earningsOverLimit: round2(excess),
    monthlyChecksHeldBack: checksHeld,
    benefitsStillPaidThisYear: round2(monthlyBenefit * (monthsOfBenefitsThisYear - checksHeld)),
    earningsLimit: limit,
  };
};

// --- 12. Social Security Lifetime Benefits Calculator --------------------------
export const socialSecurityLifetimeBenefitsCalculator: CustomCalculator = (values) => {
  const monthlyBenefit = Math.max(0, safeNumber(values.monthlyBenefit, 2200));
  const claimAge = Math.max(62, Math.min(70, safeNumber(values.claimAge, 67)));
  const lifeExpectancyAge = Math.max(claimAge, Math.min(110, safeNumber(values.lifeExpectancyAge, 88)));
  const colaPercent = Math.max(0, safeNumber(values.colaPercent, 2.5));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  const months = Math.round((lifeExpectancyAge - claimAge) * 12);
  let nominal = 0;
  let real = 0;
  for (let m = 0; m < months; m++) {
    const y = Math.floor(m / 12);
    const pay = monthlyBenefit * Math.pow(1 + colaPercent / 100, y);
    nominal += pay;
    real += pay / Math.pow(1 + inflationPercent / 100, y);
  }

  return {
    lifetimeBenefitsFutureDollars: round2(nominal),
    lifetimeBenefitsTodaysMoney: round2(real),
    yearsCollecting: round2(months / 12),
    finalMonthlyBenefit: round2(months > 0 ? monthlyBenefit * Math.pow(1 + colaPercent / 100, Math.floor((months - 1) / 12)) : 0),
  };
};

export const retirementPensionSocialSecurityCustomCalculators: Record<string, CustomCalculator> = {
  "pension-income-calculator": pensionIncomeCalculator,
  "pension-lump-sum-vs-annuity-calculator": pensionLumpSumVsAnnuityCalculator,
  "pension-present-value-calculator": pensionPresentValueCalculator,
  "pension-commutation-calculator": pensionCommutationCalculator,
  "social-security-benefit-calculator": socialSecurityBenefitCalculator,
  "social-security-retirement-age-calculator": socialSecurityRetirementAgeCalculator,
  "social-security-early-retirement-calculator": socialSecurityEarlyRetirementCalculator,
  "social-security-delayed-retirement-calculator": socialSecurityDelayedRetirementCalculator,
  "social-security-break-even-calculator": socialSecurityBreakEvenCalculator,
  "social-security-spousal-benefits-calculator": socialSecuritySpousalBenefitsCalculator,
  "social-security-earnings-test-calculator": socialSecurityEarningsTestCalculator,
  "social-security-lifetime-benefits-calculator": socialSecurityLifetimeBenefitsCalculator,
};
