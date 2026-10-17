/**
 * Batch: "Jobs & Education Calculators" → College Admissions (7) and College
 * Cost & Financial Aid (9) — 16 tools.
 *
 * Admissions chances are transparent logistic estimates: the school's admit
 * rate sets the baseline and your stats relative to its medians move it —
 * not a prediction of any school's decision.
 *  - collegeChances (covers "Harvard admissions chances" via a preset),
 *    lawSchoolAdmissions, lawSchoolScholarship, medSchoolAdmissions,
 *    mbaAdmissions, academicIndex (Ivy-style AI out of 240), lizzyM.
 *  - netPrice (covers school-specific net price calculators): cost of
 *    attendance − Pell (2026–27 max $7,395) − state, institutional and merit
 *    aid.
 *  - tuition (covers school-specific tuition calculators): per-credit or
 *    flat-rate tuition + fees, yearly increases.
 *  - sai: simplified 2026–27 FAFSA Student Aid Index for a dependent student.
 *  - osap: Ontario aid with the 2026–27 25% grant / 75% loan split.
 *  - collegeRoi, stipend, edChoice (Ohio EdChoice Expansion 2025–26),
 *    transferCredit (covers UTSA / Liberty transfer calculators), sap
 *    (Satisfactory Academic Progress; covers "completion rate").
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-edu-college-calculators.ts for the copy.
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

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(clamp(p, 0.001, 0.999) / (1 - clamp(p, 0.001, 0.999)));
const band = (p: number) => (p < 0.25 ? 1 : p < 0.6 ? 2 : 3); // 1 reach, 2 target, 3 likely

// School presets: [admit rate %, SAT 25th, SAT 75th, average GPA].
const PRESETS: [number, number, number, number][] = [[0, 0, 0, 0], [3.6, 1500, 1580, 3.95]];

export const collegeChances: CustomCalculator = (v) => {
  const preset = PRESETS[clamp(Math.round(nonNeg(v.schoolPreset)), 0, 1)];
  const usePreset = preset[0] > 0;
  const admit = (usePreset ? preset[0] : nonNeg(v.admitRate)) / 100;
  const s25 = usePreset ? preset[1] : nonNeg(v.sat25);
  const s75 = usePreset ? preset[2] : nonNeg(v.sat75);
  const avgGpa = usePreset ? preset[3] : nonNeg(v.schoolGpa);
  const mid = (s25 + s75) / 2;
  const sd = Math.max(20, (s75 - s25) / 1.35);
  const testZ = nonNeg(v.sat) > 0 ? clamp((nonNeg(v.sat) - mid) / sd, -3, 2) : 0;
  const gpaZ = clamp((nonNeg(v.gpa) - avgGpa) / 0.15, -3, 1.5);
  const academic = 0.55 * testZ + 0.65 * gpaZ;
  const extras = 0.3 * (nonNeg(v.extracurriculars, 3) - 3) + 0.25 * (nonNeg(v.essays, 3) - 3) + (yes(v.earlyDecision) ? 0.6 : 0) + [0, 0.5, 0.8, 2][clamp(Math.round(nonNeg(v.hook)), 0, 3)];
  const p = sigmoid(logit(admit) + academic + extras);
  return { admissionChance: round2(p * 100), schoolAdmitRate: round2(admit * 100), category: band(p), testScorePosition: round2(testZ), gpaPosition: round2(gpaZ) };
};

export const lawSchoolAdmissions: CustomCalculator = (v) => {
  const lz = (nonNeg(v.lsat) - nonNeg(v.medianLsat)) / 3;
  const gz = (nonNeg(v.gpa) - nonNeg(v.medianGpa)) / 0.15;
  const p = sigmoid(logit(nonNeg(v.admitRate) / 100) + 0.8 * clamp(lz, -4, 3) + 0.5 * clamp(gz, -4, 3) + (yes(v.earlyDecision) ? 0.4 : 0));
  return { admissionChance: round2(p * 100), lsatVsMedian: round2(nonNeg(v.lsat) - nonNeg(v.medianLsat)), gpaVsMedian: round2(nonNeg(v.gpa) - nonNeg(v.medianGpa)), splitter: lz * gz < -1 ? 1 : 0, category: band(p) };
};

export const lawSchoolScholarship: CustomCalculator = (v) => {
  const pos = (x: number, p25: number, p50: number, p75: number) => (x >= p75 ? 1 + (x - p75) / Math.max(0.01, p75 - p50) : x >= p50 ? 0.5 + (0.5 * (x - p50)) / Math.max(0.01, p75 - p50) : x >= p25 ? (0.5 * (x - p25)) / Math.max(0.01, p50 - p25) : -0.5);
  const l = pos(nonNeg(v.lsat), nonNeg(v.lsat25), nonNeg(v.lsat50), nonNeg(v.lsat75));
  const g = pos(nonNeg(v.gpa), nonNeg(v.gpa25), nonNeg(v.gpa50), nonNeg(v.gpa75));
  const score = 0.6 * l + 0.4 * g;
  const pct = clamp(score <= 0 ? 0 : score * 75, 0, 100);
  const yearly = (nonNeg(v.tuition) * pct) / 100;
  return { estimatedSharePercent: round2(pct), estimatedYearlyScholarship: round2(yearly), threeYearValue: round2(yearly * 3), netTuitionPerYear: round2(nonNeg(v.tuition) - yearly) };
};

export const medSchoolAdmissions: CustomCalculator = (v) => {
  const x = -0.2 + 0.26 * (nonNeg(v.mcat) - 510) + 3.2 * (nonNeg(v.gpa) - 3.6) + (yes(v.inStateApplicant) ? 0.3 : 0) + 0.15 * (nonNeg(v.schoolsApplied, 20) - 20) / 5 + 0.25 * (nonNeg(v.experienceStrength, 3) - 3);
  const p = sigmoid(x);
  return { acceptanceChance: round2(p * 100), mcatVsMatriculantAverage: round2(nonNeg(v.mcat) - 512), gpaVsMatriculantAverage: round2(nonNeg(v.gpa) - 3.77), category: band(p) };
};

export const mbaAdmissions: CustomCalculator = (v) => {
  const gz = (nonNeg(v.gmat) - nonNeg(v.programGmat)) / 40;
  const pz = (nonNeg(v.gpa) - nonNeg(v.programGpa)) / 0.25;
  const wz = (nonNeg(v.workYears) - 5) / 2;
  const p = sigmoid(logit(nonNeg(v.admitRate) / 100) + 0.7 * clamp(gz, -3, 2) + 0.35 * clamp(pz, -3, 2) + 0.2 * clamp(-Math.abs(wz) + 1, -2, 1) + 0.3 * (nonNeg(v.profileStrength, 3) - 3));
  return { admissionChance: round2(p * 100), gmatVsAverage: round2(nonNeg(v.gmat) - nonNeg(v.programGmat)), gpaVsAverage: round2(nonNeg(v.gpa) - nonNeg(v.programGpa)), category: band(p) };
};

export const academicIndex: CustomCalculator = (v) => {
  const math = clamp(nonNeg(v.satMath), 200, 800);
  const rw = clamp(nonNeg(v.satReadingWriting), 200, 800);
  // Converted rank score: GPA 4.0 → 80, sliding to 20 at about 1.0.
  const crs = clamp(20 + (nonNeg(v.gpa) - 1) * 20, 20, 80);
  const ai = Math.round(math / 10 + rw / 10 + crs);
  return { academicIndex: ai, testScorePart: Math.round(math / 10 + rw / 10), convertedRankScore: Math.round(crs), aboveRecruitedFloor: ai >= 176 ? 1 : 0 };
};

export const lizzyM: CustomCalculator = (v) => {
  const old = (m: number) => (clamp(nonNeg(m), 472, 528) - 472) * (45 / 56);
  const you = Math.round(10 * nonNeg(v.gpa) + old(v.mcat));
  const school = nonNeg(v.schoolGpa) > 0 && nonNeg(v.schoolMcat) > 0 ? Math.round(10 * nonNeg(v.schoolGpa) + old(v.schoolMcat)) : 0;
  return { lizzyMScore: you, schoolLizzyM: school, difference: school > 0 ? you - school : 0, competitive: school > 0 && you >= school ? 1 : 0 };
};

const PELL_MAX = 7395;

export const netPrice: CustomCalculator = (v) => {
  const coa = nonNeg(v.tuitionFees) + nonNeg(v.housingFood) + nonNeg(v.booksSupplies) + nonNeg(v.otherCosts);
  const sai = safeNumber(v.sai);
  const pellRaw = PELL_MAX - Math.max(0, sai);
  const pell = sai < 0 ? PELL_MAX : pellRaw >= 740 ? pellRaw : 0;
  const need = Math.max(0, coa - Math.max(0, sai));
  const inst = Math.max(0, need * (nonNeg(v.needMetPercent) / 100) - pell - nonNeg(v.stateGrant));
  const grants = pell + nonNeg(v.stateGrant) + inst + nonNeg(v.meritScholarship);
  const net = Math.max(0, coa - grants);
  return {
    netPrice: round2(net),
    costOfAttendance: round2(coa),
    totalGrants: round2(grants),
    pellGrant: round2(pell),
    institutionalGrant: round2(inst),
    afterFederalLoans: round2(Math.max(0, net - nonNeg(v.federalLoans))),
    fourYearNetPrice: round2(net * 4 * Math.pow(1 + nonNeg(v.yearlyIncrease) / 100, 1.5)),
  };
};

export const tuition: CustomCalculator = (v) => {
  const credits = nonNeg(v.creditsPerTerm);
  const rate = nonNeg(v.perCreditRate);
  const flatFrom = nonNeg(v.flatRateFrom);
  const perTermTuition = flatFrom > 0 && credits >= flatFrom ? rate * flatFrom : credits * rate;
  const perTerm = perTermTuition + nonNeg(v.feesPerTerm);
  const terms = Math.max(1, nonNeg(v.termsPerYear, 2));
  const yearly = perTerm * terms;
  const years = Math.max(1, Math.round(nonNeg(v.years, 4)));
  const g = nonNeg(v.yearlyIncrease) / 100;
  let total = 0;
  for (let y = 0; y < years; y++) total += yearly * Math.pow(1 + g, y);
  return { yearlyTuitionAndFees: round2(yearly), perTermCost: round2(perTerm), tuitionPerTerm: round2(perTermTuition), totalForDegree: round2(total), effectivePerCredit: credits > 0 ? round2(perTerm / credits) : 0 };
};

// 2026–27 FAFSA simplified for a dependent student. Parent income protection allowance by family size.
const IPA = [0, 0, 29_100, 36_240, 44_880, 52_950, 61_940];
const AAI: [number, number][] = [[21_800, 22], [27_400, 25], [32_900, 29], [38_400, 34], [43_900, 40], [Infinity, 47]];

export const sai: CustomCalculator = (v) => {
  const size = clamp(Math.round(nonNeg(v.familySize, 4)), 2, 6);
  const income = nonNeg(v.parentAgi) + nonNeg(v.untaxedIncome);
  const allowances = nonNeg(v.parentTaxesPaid) + nonNeg(v.parentAgi) * 0.0765 + IPA[size] + Math.min(4_730, 0.35 * nonNeg(v.lowerEarnerIncome));
  const available = income - allowances + 0.12 * nonNeg(v.parentNetWorth);
  let parent: number;
  if (available < 0) parent = Math.max(-1500, available * 0.22);
  else {
    parent = 0;
    let lower = 0;
    for (const [upper, rate] of AAI) {
      if (available <= lower) break;
      parent += ((Math.min(available, upper) - lower) * rate) / 100;
      lower = upper;
    }
  }
  const student = Math.max(0, (nonNeg(v.studentIncome) - 11_770 - nonNeg(v.studentIncome) * 0.0765) * 0.5) + 0.2 * nonNeg(v.studentAssets);
  const total = Math.max(-1500, Math.round(parent + student));
  const pell = total < 0 ? PELL_MAX : PELL_MAX - total >= 740 ? PELL_MAX - total : 0;
  return { studentAidIndex: total, parentContribution: Math.round(parent), studentContribution: Math.round(student), estimatedPellGrant: round2(pell), maximumPell: pell === PELL_MAX ? 1 : 0 };
};

export const osap: CustomCalculator = (v) => {
  const costs = nonNeg(v.tuitionFees) + nonNeg(v.booksEquipment) + nonNeg(v.livingCosts) * nonNeg(v.studyMonths, 8);
  const need = Math.max(0, costs - nonNeg(v.familyContribution) - nonNeg(v.studentContribution));
  const fedGrant = Math.min(need, nonNeg(v.federalGrant));
  const rest = need - fedGrant;
  const federalLoan = rest * 0.5;
  const ontario = rest * 0.5;
  // 2026–27: at most 25% of the Ontario portion as grants, at least 75% as loans.
  const ontarioGrant = ontario * 0.25;
  const loans = federalLoan + ontario * 0.75;
  return {
    totalAid: round2(need),
    totalGrants: round2(fedGrant + ontarioGrant),
    totalLoans: round2(loans),
    ontarioGrant: round2(ontarioGrant),
    canadaStudentGrant: round2(fedGrant),
    assessedCosts: round2(costs),
    monthlyRepaymentAfterSchool: round2(pmt(loans * nonNeg(v.yearsOfStudy, 4), nonNeg(v.repaymentRate), 10)),
  };
};

export const collegeRoi: CustomCalculator = (v) => {
  const years = Math.max(1, nonNeg(v.yearsToDegree, 4));
  const cost = nonNeg(v.netPricePerYear) * years;
  const premium = nonNeg(v.salaryWithDegree) - nonNeg(v.salaryWithoutDegree);
  const loan = nonNeg(v.loanAmount);
  const payment = pmt(loan, nonNeg(v.loanRate), 10);
  const forgone = yes(v.countForgoneEarnings) ? nonNeg(v.salaryWithoutDegree) * years : 0;
  const invest = cost + forgone;
  const career = Math.max(0, nonNeg(v.careerYears, 40));
  const g = nonNeg(v.salaryGrowth) / 100;
  let lifetime = 0;
  for (let y = 0; y < career; y++) lifetime += premium * Math.pow(1 + g, y);
  const net = lifetime - invest - (payment * 120 - loan);
  return {
    lifetimeEarningsGain: round2(net),
    yearsToPayBack: premium > 0 ? round2(invest / premium) : 0,
    totalInvestment: round2(invest),
    returnOnInvestment: invest > 0 ? round2((net / invest) * 100) : 0,
    monthlyLoanPayment: round2(payment),
    loanPaymentShareOfPay: nonNeg(v.salaryWithDegree) > 0 ? round2(((payment * 12) / nonNeg(v.salaryWithDegree)) * 100) : 0,
  };
};

export const stipend: CustomCalculator = (v) => {
  const yearly = nonNeg(v.annualStipend);
  const tax = (Math.max(0, yearly - nonNeg(v.standardDeduction, 16_100)) * nonNeg(v.taxRate)) / 100;
  const net = yearly - tax - nonNeg(v.universityFees);
  const monthly = net / 12;
  const rent = nonNeg(v.monthlyRent);
  return {
    monthlyAfterTaxAndFees: round2(monthly),
    leftAfterRentAndCosts: round2(monthly - rent - nonNeg(v.otherMonthlyCosts)),
    rentBurden: monthly > 0 ? round2((rent / monthly) * 100) : 0,
    estimatedIncomeTax: round2(tax),
    effectiveHourly: nonNeg(v.hoursPerWeek) > 0 ? round2(yearly / (52 * nonNeg(v.hoursPerWeek))) : 0,
  };
};

// Ohio EdChoice Expansion 2025–26: full award at or below 450% FPL, prorated above, 10% minimum.
export const edChoice: CustomCalculator = (v) => {
  const size = Math.max(1, Math.round(nonNeg(v.householdSize, 1)));
  const fpl = 15_650 + 5_500 * (size - 1);
  const pctFpl = (nonNeg(v.householdIncome) / fpl) * 100;
  const max = yes(v.highSchool) ? 8_408 : 6_166;
  const share = pctFpl <= 450 ? 100 : clamp(100 - (pctFpl - 450) * 0.7, 10, 100);
  const award = (max * share) / 100;
  return { estimatedScholarship: round2(award), percentOfPovertyLevel: round2(pctFpl), shareOfMaximum: round2(share), maximumAward: max, gapToTuition: round2(Math.max(0, nonNeg(v.tuition) - award)) };
};

export const transferCredit: CustomCalculator = (v) => {
  const earned = nonNeg(v.creditsEarned);
  const accepted = Math.min(earned, nonNeg(v.creditsAccepted));
  const applicable = Math.min(accepted, nonNeg(v.creditsApplicable) > 0 ? nonNeg(v.creditsApplicable) : accepted);
  const left = Math.max(0, nonNeg(v.degreeCredits) - applicable);
  const perTerm = Math.max(1, nonNeg(v.creditsPerTerm, 15));
  return {
    creditsRemaining: round2(left),
    termsRemaining: Math.ceil(left / perTerm),
    creditsLost: round2(earned - accepted),
    acceptanceRate: earned > 0 ? round2((accepted / earned) * 100) : 0,
    tuitionSaved: round2(applicable * nonNeg(v.costPerCredit)),
  };
};

export const sap: CustomCalculator = (v) => {
  const attempted = nonNeg(v.creditsAttempted);
  const completed = Math.min(attempted, nonNeg(v.creditsCompleted));
  const rate = attempted > 0 ? (completed / attempted) * 100 : 100;
  const maxCredits = nonNeg(v.programCredits) * 1.5;
  const gpaOk = nonNeg(v.cumulativeGpa) >= nonNeg(v.minimumGpa, 2);
  const paceOk = rate >= nonNeg(v.minimumPace, 67);
  const timeOk = attempted <= maxCredits;
  return {
    meetsSap: gpaOk && paceOk && timeOk ? 1 : 0,
    completionRate: round2(rate),
    gpaRequirementMet: gpaOk ? 1 : 0,
    maxTimeframeCredits: round2(maxCredits),
    creditsLeftBeforeMaxTimeframe: round2(Math.max(0, maxCredits - attempted)),
    creditsToPassToReachPace: Math.max(0, Math.ceil(((nonNeg(v.minimumPace, 67) / 100) * attempted - completed) / (1 - nonNeg(v.minimumPace, 67) / 100))),
  };
};

export const eduCollegeCustomCalculators: Record<string, CustomCalculator> = {
  "college-admissions-chances-calculator": collegeChances,
  "law-school-admissions-calculator": lawSchoolAdmissions,
  "law-school-scholarship-calculator": lawSchoolScholarship,
  "medical-school-admissions-calculator": medSchoolAdmissions,
  "mba-admissions-calculator": mbaAdmissions,
  "academic-index-calculator": academicIndex,
  "lizzym-score-calculator": lizzyM,
  "college-net-price-calculator": netPrice,
  "college-tuition-calculator": tuition,
  "efc-sai-calculator": sai,
  "osap-calculator": osap,
  "college-roi-calculator": collegeRoi,
  "stipend-calculator": stipend,
  "ohio-edchoice-calculator": edChoice,
  "transfer-credit-calculator": transferCredit,
  "sap-calculator": sap,
};
