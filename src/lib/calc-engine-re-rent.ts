/**
 * Batch: "Real Estate Calculators" → Rent & Tenant (9 tools):
 *
 *  - hudRent: HUD total tenant payment (24 CFR 5.628) — the greater of 30% of
 *    adjusted monthly income, 10% of gross monthly income or the minimum
 *    rent — for public housing or a Housing Choice Voucher.
 *  - mnRentersRebate: Minnesota Renter's Credit (Minn. Stat. 290.0693) —
 *    17% of rent is "rent constituting property tax", less the income
 *    threshold and co-pay from the statute table.
 *  - nycRent / texasRent / chicagoRent: rent qualification and move-in cash
 *    under each market's own rules (NYC 40x income / 80x guarantor and the
 *    one-month deposit cap; Texas 3x with no deposit cap and per-adult
 *    application fees; Chicago 3x with RLTO deposit interest and the
 *    non-refundable move-in fee option).
 *  - securityDeposit: deposit, state cap check, interest and the refund
 *    after deductions.
 *  - cellTowerLeaseBuyout: present value of the remaining ground rent vs a
 *    lump-sum buyout offer.
 *  - rentPerSquareFoot: monthly and annual rent per square foot and the
 *    gap to a market rate.
 *  - reraRent: Dubai's RERA rent-increase cap (Decree 43 of 2013) from the
 *    gap to the rental index.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-re-rent-calculators.ts for the copy.
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

export const hudRent: CustomCalculator = (v) => {
  const annual = nonNeg(v.annualIncome);
  const dependents = nonNeg(v.dependents);
  const elderly = yes(v.elderlyOrDisabled);
  const childcare = nonNeg(v.childcareExpenses);
  const medical = elderly ? nonNeg(v.medicalExpenses) : 0;
  const depDeduction = nonNeg(v.dependentDeduction, 480);
  const elderlyDeduction = nonNeg(v.elderlyDeduction, 525);
  // HOTMA: unreimbursed medical/disability costs count only above 10% of annual income.
  const medicalAllowed = Math.max(0, medical - annual * 0.1);
  const adjusted = Math.max(0, annual - dependents * depDeduction - (elderly ? elderlyDeduction : 0) - childcare - medicalAllowed);
  const ttp = Math.max((adjusted / 12) * 0.3, (annual / 12) * 0.1, nonNeg(v.minimumRent));
  const gross = nonNeg(v.grossRent);
  const ua = nonNeg(v.utilityAllowance);
  const voucher = yes(v.program);
  let tenantTotal = ttp;
  let hap = 0;
  if (voucher) {
    hap = Math.max(0, Math.min(nonNeg(v.paymentStandard), gross) - ttp);
    tenantTotal = gross - hap;
  }
  return {
    tenantRentToOwner: round2(Math.max(0, tenantTotal - ua)),
    totalTenantPayment: round2(ttp),
    tenantShareWithUtilities: round2(tenantTotal),
    housingAssistancePayment: round2(hap),
    adjustedAnnualIncome: round2(adjusted),
    shareOfAdjustedIncome: adjusted > 0 ? round2((tenantTotal / (adjusted / 12)) * 100) : 0,
    over40PercentCap: voucher && adjusted > 0 && tenantTotal > (adjusted / 12) * 0.4 ? 1 : 0,
  };
};

// Minn. Stat. 290.0693 subd. 3 (statutory year 2024): [income up to, % of income, % paid by claimant, max credit].
const MN_TABLE: [number, number, number, number][] = [
  [6479, 1.0, 5, 2640], [8609, 1.0, 10, 2640], [10759, 1.1, 10, 2570], [15089, 1.2, 10, 2510],
  [19399, 1.3, 15, 2430], [21539, 1.4, 15, 2370], [23679, 1.4, 20, 2310], [28009, 1.5, 20, 2240],
  [30159, 1.6, 20, 2180], [32309, 1.7, 25, 2180], [36629, 1.8, 25, 2180], [38769, 1.9, 30, 2180],
  [45229, 2.0, 30, 2180], [51689, 2.0, 35, 2180], [60319, 2.0, 40, 2180], [62459, 2.0, 45, 1980],
  [64619, 2.0, 45, 1780], [66789, 2.0, 45, 1510], [68929, 2.0, 50, 1320], [71089, 2.0, 50, 1190],
  [73239, 2.0, 50, 660], [75389, 2.0, 50, 260],
];
// Revenue indexes the table yearly: 2025 returns use a $2,720 top credit and a $77,570 income limit.
const MN_INCOME_INDEX = 77570 / 75389;
const MN_CREDIT_INDEX = 2720 / 2640;

export const mnRentersRebate: CustomCalculator = (v) => {
  const income = Math.max(0, nonNeg(v.householdIncome) - nonNeg(v.dependents) * nonNeg(v.dependentSubtraction));
  const rcpt = nonNeg(v.rentPaid) * 0.17;
  const row = MN_TABLE.find(([upTo]) => income <= upTo * MN_INCOME_INDEX);
  if (!row) {
    return { estimatedCredit: 0, rentConstitutingPropertyTax: round2(rcpt), incomeThreshold: 0, claimantCopay: 0, maximumCredit: 0, householdIncomeUsed: round2(income) };
  }
  const [, pctIncome, pctClaimant, max] = row;
  const threshold = (income * pctIncome) / 100;
  const over = Math.max(0, rcpt - threshold);
  const copay = (over * pctClaimant) / 100;
  const maxCredit = Math.round(max * MN_CREDIT_INDEX);
  return {
    estimatedCredit: round2(Math.min(maxCredit, over - copay)),
    rentConstitutingPropertyTax: round2(rcpt),
    incomeThreshold: round2(threshold),
    claimantCopay: round2(copay),
    maximumCredit: maxCredit,
    householdIncomeUsed: round2(income),
  };
};

export const nycRent: CustomCalculator = (v) => {
  const rent = nonNeg(v.monthlyRent);
  const income = nonNeg(v.annualIncome);
  const guarantor = nonNeg(v.guarantorIncome);
  const depositMonths = Math.min(1, nonNeg(v.depositMonths, 1)); // NY GOL 7-108: deposit capped at one month's rent.
  const brokerFee = (rent * 12 * nonNeg(v.brokerFeePercent)) / 100;
  const moveIn = rent + rent * depositMonths + brokerFee + Math.min(20, nonNeg(v.applicationFee, 20));
  return {
    annualIncomeNeeded: round2(rent * 40),
    maxRentOnYourIncome: round2(income / 40),
    qualifiesOnIncome: rent > 0 && income >= rent * 40 ? 1 : 0,
    guarantorIncomeNeeded: round2(rent * 80),
    guarantorQualifies: rent > 0 && guarantor >= rent * 80 ? 1 : 0,
    moveInCash: round2(moveIn),
    brokerFee: round2(brokerFee),
    rentToIncome: income > 0 ? round2(((rent * 12) / income) * 100) : 0,
  };
};

export const texasRent: CustomCalculator = (v) => {
  const rent = nonNeg(v.monthlyRent);
  const income = nonNeg(v.annualIncome) / 12;
  const multiple = nonNeg(v.incomeMultiple, 3);
  const adults = Math.max(1, Math.round(nonNeg(v.adults, 1)));
  const moveIn = rent + nonNeg(v.depositAmount) + nonNeg(v.applicationFee) * adults + nonNeg(v.adminFee) + nonNeg(v.petFees);
  return {
    monthlyIncomeNeeded: round2(rent * multiple),
    maxRentByIncomeRule: multiple > 0 ? round2(income / multiple) : 0,
    maxRentAfterDebts: round2(Math.max(0, income * 0.4 - nonNeg(v.monthlyDebts))),
    qualifiesOnIncome: rent > 0 && income >= rent * multiple ? 1 : 0,
    moveInCash: round2(moveIn),
    totalMonthlyHousing: round2(rent + nonNeg(v.utilities) + nonNeg(v.rentersInsurance)),
    rentToIncome: income > 0 ? round2((rent / income) * 100) : 0,
  };
};

export const chicagoRent: CustomCalculator = (v) => {
  const rent = nonNeg(v.monthlyRent);
  const income = nonNeg(v.annualIncome) / 12;
  const multiple = nonNeg(v.incomeMultiple, 3);
  const useMoveInFee = yes(v.moveInFeeInstead);
  const deposit = useMoveInFee ? 0 : nonNeg(v.depositAmount);
  const moveInFee = useMoveInFee ? nonNeg(v.moveInFee) : 0;
  // RLTO: interest at the City Comptroller's yearly rate on deposits held 6+ months.
  const interest = deposit * (nonNeg(v.depositInterestRate) / 100) * nonNeg(v.yearsHeld, 1);
  return {
    monthlyIncomeNeeded: round2(rent * multiple),
    maxRentByIncomeRule: multiple > 0 ? round2(income / multiple) : 0,
    qualifiesOnIncome: rent > 0 && income >= rent * multiple ? 1 : 0,
    moveInCash: round2(rent + deposit + moveInFee + nonNeg(v.applicationFee)),
    nonRefundableAtMoveIn: round2(moveInFee + nonNeg(v.applicationFee)),
    depositInterestOwed: round2(interest),
    rentToIncome: income > 0 ? round2((rent / income) * 100) : 0,
  };
};

export const securityDeposit: CustomCalculator = (v) => {
  const rent = nonNeg(v.monthlyRent);
  const capMonths = nonNeg(v.stateCapMonths);
  const deposit = rent * nonNeg(v.depositMonths);
  const interest = deposit * (nonNeg(v.interestRate) / 100) * (nonNeg(v.monthsHeld) / 12);
  const deductions = nonNeg(v.unpaidRent) + nonNeg(v.damages) + nonNeg(v.cleaning) + nonNeg(v.otherCharges);
  const refund = deposit + interest - deductions;
  return {
    refundDue: round2(Math.max(0, refund)),
    depositAmount: round2(deposit),
    legalMaximum: round2(rent * capMonths),
    overTheCap: capMonths > 0 && deposit > rent * capMonths ? round2(deposit - rent * capMonths) : 0,
    interestEarned: round2(interest),
    totalDeductions: round2(deductions),
    tenantStillOwes: round2(Math.max(0, -refund)),
  };
};

export const cellTowerLeaseBuyout: CustomCalculator = (v) => {
  const rent = nonNeg(v.annualRent);
  const g = nonNeg(v.escalator) / 100;
  const d = nonNeg(v.discountRate) / 100;
  const years = Math.min(99, Math.round(nonNeg(v.yearsRemaining)));
  const p = Math.min(100, nonNeg(v.renewalProbability, 100)) / 100;
  const offer = nonNeg(v.buyoutOffer);
  let pv = 0;
  let nominal = 0;
  let breakEven = 0;
  for (let t = 0; t < years; t++) {
    const cash = rent * Math.pow(1 + g, t) * p;
    nominal += cash;
    pv += cash / Math.pow(1 + d, t + 1);
    if (!breakEven && offer > 0 && nominal >= offer) breakEven = t + 1;
  }
  return {
    presentValueOfRent: round2(pv),
    offerVsPresentValue: pv > 0 ? round2((offer / pv) * 100) : 0,
    offerMultipleOfRent: rent > 0 ? round2(offer / rent) : 0,
    totalRentIfYouKeep: round2(nominal),
    yearsOfRentToMatchOffer: breakEven,
    gainOrLossVsKeeping: round2(offer - pv),
  };
};

export const rentPerSquareFoot: CustomCalculator = (v) => {
  const sqft = nonNeg(v.squareFeet);
  const annual = yes(v.rentIsAnnual) ? nonNeg(v.rent) : nonNeg(v.rent) * 12;
  const market = nonNeg(v.marketRentPerSqFtYear);
  const perYear = sqft > 0 ? annual / sqft : 0;
  return {
    rentPerSqFtMonth: round2(perYear / 12),
    rentPerSqFtYear: round2(perYear),
    monthlyRent: round2(annual / 12),
    marketMonthlyRent: round2((market * sqft) / 12),
    differenceVsMarket: market > 0 ? round2(((perYear - market) / market) * 100) : 0,
  };
};

export const reraRent: CustomCalculator = (v) => {
  const current = nonNeg(v.currentRent);
  const index = nonNeg(v.indexRent);
  const gap = index > 0 ? ((index - current) / index) * 100 : 0;
  // Decree No. 43 of 2013: no increase unless the rent is more than 10% below the index average.
  const cap = gap <= 10 ? 0 : gap <= 20 ? 5 : gap <= 30 ? 10 : gap <= 40 ? 15 : 20;
  const newRent = current * (1 + cap / 100);
  return {
    maxIncreasePercent: cap,
    maxNewAnnualRent: round2(newRent),
    maxIncreaseAmount: round2(newRent - current),
    newMonthlyRent: round2(newRent / 12),
    belowIndexPercent: round2(gap),
  };
};

export const reRentCustomCalculators: Record<string, CustomCalculator> = {
  "hud-rent-calculator": hudRent,
  "mn-renters-rebate-calculator": mnRentersRebate,
  "nyc-rent-calculator": nycRent,
  "texas-rent-calculator": texasRent,
  "chicago-rent-calculator": chicagoRent,
  "security-deposit-calculator": securityDeposit,
  "cell-tower-lease-buyout-calculator": cellTowerLeaseBuyout,
  "rent-per-square-foot-calculator": rentPerSquareFoot,
  "rera-rent-calculator": reraRent,
};
