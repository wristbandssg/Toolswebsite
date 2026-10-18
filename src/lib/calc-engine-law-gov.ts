/**
 * Batch: "Law & Government Calculators" → Government Fees & Public Finance
 * Calculators.
 *
 * Data:
 *  - OPM Salary Table 2026-GS (1% increase, January 2026) and the 58 2026
 *    locality percentages; rates capped at EX-IV $197,200.
 *  - FERS: 1% (1.1% at 62+ with 20 years) of high-3, MRA 55–57 by birth year,
 *    5%/year MRA+10 reduction; VSIP up to $25,000 or severance, whichever is
 *    less (5 U.S.C. 5597, 5595).
 *  - California registration 2026 (DMV VIN 2026-07 current fees): registration
 *    $73, CHP $34, TIF $33 / $66 / $132 / $198 / $231 by value, Road
 *    Improvement Fee $121 (ZEV 2020+), VLF 0.65% (R&T §10753.2 schedule).
 *    Utah 2026 age-based uniform fee $150 / $110 / $80 / $50 / $10;
 *    Wisconsin $85 (+$75 hybrid, +$175 EV); Maine excise 24 / 17.5 / 13.5 /
 *    10 / 6.5 / 4 mills of MSRP (36 MRSA §1482); Massachusetts excise $25 per
 *    $1,000 (50 / 90 / 60 / 40 / 25 / 10%); Arizona VLT 60% of MSRP less
 *    16.25% a year, $2.80 / $2.89 per $100. Other states' fixed fees are
 *    typical defaults the user can override from their renewal notice.
 *  - Florida doc stamps $0.70 / $100 (Miami-Dade $0.60 + $0.45 surtax),
 *    mortgage stamps $0.35 / $100, intangible tax 0.2%, recording $10 + $8.50
 *    per extra page; NYC Local Law 97 2024–2029 and 2030–2034 limits and
 *    coefficients, $268 per tCO2e; IBC Table 1004.5 occupant load factors;
 *    ADA 1:12; 47 CFR 1.1310 MPE limits; Seattle beverage tax 1.75¢/oz;
 *    passport fees ($130 book, $30 card, $35 execution, $60 expedite);
 *    FUTA 6.0% − 5.4% on $7,000; Section 184 1% upfront + 0.25% annual;
 *    DFVC $10/day with $750 / $1,500 and $2,000 / $4,000 caps; CY2026 MPFS
 *    conversion factors $33.4009 / $33.5675.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-gov-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));
const yes = (v: number, d = 0) => Math.round(safeNumber(v, d)) === 1;

// --- Federal pay -------------------------------------------------------------------------------------
/** OPM Salary Table 2026-GS, annual base rates by grade (1–15) and step (1–10). */
export const GS_2026: number[][] = [
  [22584, 23341, 24092, 24840, 25589, 26028, 26771, 27519, 27550, 28248],
  [25393, 25997, 26839, 27550, 27858, 28677, 29496, 30315, 31134, 31953],
  [27708, 28632, 29556, 30480, 31404, 32328, 33252, 34176, 35100, 36024],
  [31103, 32140, 33177, 34214, 35251, 36288, 37325, 38362, 39399, 40436],
  [34799, 35959, 37119, 38279, 39439, 40599, 41759, 42919, 44079, 45239],
  [38791, 40084, 41377, 42670, 43963, 45256, 46549, 47842, 49135, 50428],
  [43106, 44543, 45980, 47417, 48854, 50291, 51728, 53165, 54602, 56039],
  [47738, 49329, 50920, 52511, 54102, 55693, 57284, 58875, 60466, 62057],
  [52727, 54485, 56243, 58001, 59759, 61517, 63275, 65033, 66791, 68549],
  [58064, 59999, 61934, 63869, 65804, 67739, 69674, 71609, 73544, 75479],
  [63795, 65922, 68049, 70176, 72303, 74430, 76557, 78684, 80811, 82938],
  [76463, 79012, 81561, 84110, 86659, 89208, 91757, 94306, 96855, 99404],
  [90925, 93956, 96987, 100018, 103049, 106080, 109111, 112142, 115173, 118204],
  [107446, 111028, 114610, 118192, 121774, 125356, 128938, 132520, 136102, 139684],
  [126384, 130597, 134810, 139023, 143236, 147449, 151662, 155875, 160088, 164301],
];
export const GS_CAP_2026 = 197200;
/** 2026 locality pay areas and percentages (OPM 2026 salary tables). */
export const LOCALITIES: [string, number][] = [
  ["Rest of U.S.", 17.06], ["Albany-Schenectady, NY-MA", 20.77], ["Albuquerque-Santa Fe-Las Vegas, NM", 18.33], ["Alaska", 32.36], ["Atlanta-Athens-Clarke County-Sandy Springs, GA-AL", 23.79], ["Austin-Round Rock-Georgetown, TX", 20.35], ["Birmingham-Hoover-Talladega, AL", 18.24], ["Boston-Worcester-Providence, MA-RI-NH-CT-ME-VT", 32.58], ["Buffalo-Cheektowaga-Olean, NY", 22.41], ["Burlington-South Burlington-Barre, VT", 19.45],
  ["Charlotte-Concord, NC-SC", 19.67], ["Chicago-Naperville, IL-IN-WI", 30.86], ["Cincinnati-Wilmington-Maysville, OH-KY-IN", 21.93], ["Cleveland-Akron-Canton, OH-PA", 22.23], ["Colorado Springs, CO", 20.15], ["Columbus-Marion-Zanesville, OH", 22.15], ["Corpus Christi-Kingsville-Alice, TX", 17.63], ["Dallas-Fort Worth, TX-OK", 27.26], ["Davenport-Moline, IA-IL", 18.93], ["Dayton-Springfield-Kettering, OH", 21.42],
  ["Denver-Aurora, CO", 30.52], ["Des Moines-Ames-West Des Moines, IA", 18.01], ["Detroit-Warren-Ann Arbor, MI", 29.12], ["Fresno-Madera-Hanford, CA", 17.65], ["Harrisburg-Lebanon, PA", 19.43], ["Hartford-East Hartford, CT-MA", 32.08], ["Hawaii", 22.21], ["Houston-The Woodlands, TX", 35.0], ["Huntsville-Decatur, AL-TN", 21.91], ["Indianapolis-Carmel-Muncie, IN", 18.15],
  ["Kansas City-Overland Park-Kansas City, MO-KS", 18.97], ["Laredo, TX", 21.59], ["Las Vegas-Henderson, NV-AZ", 19.57], ["Los Angeles-Long Beach, CA", 36.47], ["Miami-Port St. Lucie-Fort Lauderdale, FL", 24.67], ["Milwaukee-Racine-Waukesha, WI", 22.42], ["Minneapolis-St. Paul, MN-WI", 27.62], ["New York-Newark, NY-NJ-CT-PA", 37.95], ["Omaha-Council Bluffs-Fremont, NE-IA", 18.23], ["Palm Bay-Melbourne-Titusville, FL", 17.93],
  ["Philadelphia-Reading-Camden, PA-NJ-DE-MD", 28.99], ["Phoenix-Mesa, AZ", 22.45], ["Pittsburgh-New Castle-Weirton, PA-OH-WV", 21.03], ["Portland-Vancouver-Salem, OR-WA", 26.13], ["Raleigh-Durham-Cary, NC", 22.24], ["Reno-Fernley, NV", 17.52], ["Richmond, VA", 22.28], ["Rochester-Batavia-Seneca Falls, NY", 17.88], ["Sacramento-Roseville, CA-NV", 29.76], ["San Antonio-New Braunfels-Pearsall, TX", 18.78],
  ["San Diego-Chula Vista-Carlsbad, CA", 33.72], ["San Jose-San Francisco-Oakland, CA", 46.34], ["Seattle-Tacoma, WA", 31.57], ["Spokane-Spokane Valley-Coeur d'Alene, WA-ID", 17.67], ["St. Louis-St. Charles-Farmington, MO-IL", 20.03], ["Tucson-Nogales, AZ", 19.28], ["Virginia Beach-Norfolk, VA-NC", 18.8], ["Washington-Baltimore-Arlington, DC-MD-VA-WV-PA", 33.94],
];
export const gsRate = (grade: number, step: number, loc: number) => {
  const base = GS_2026[grade][step];
  return Math.min(GS_CAP_2026, Math.round(base * (1 + LOCALITIES[loc][1] / 100)));
};
export const gsPay: CustomCalculator = (v) => {
  const g = pick(v.grade, 15);
  const s = pick(v.step, 10);
  const loc = pick(v.locality, LOCALITIES.length);
  const annual = gsRate(g, s, loc);
  const base = GS_2026[g][s];
  return {
    annualSalary: annual,
    basePay: base,
    localityPay: annual - base,
    biweeklyPay: round2(annual / 26.1),
    hourlyRate: round2(annual / 2087),
    localityPercent: LOCALITIES[loc][1],
    cappedAtExIV: base * (1 + LOCALITIES[loc][1] / 100) > GS_CAP_2026 ? 1 : 0,
  };
};

/** Two-step promotion rule (5 CFR 531.214): lowest step in the new grade ≥ current rate + 2 WGIs of the current grade. */
export const twoStepPromotion: CustomCalculator = (v) => {
  const g = pick(v.currentGrade, 15);
  const s = pick(v.currentStep, 10);
  const ng = Math.min(14, Math.max(g + 1, pick(v.newGrade, 15)));
  const loc = pick(v.locality, LOCALITIES.length);
  const wgi = GS_2026[g][1] - GS_2026[g][0];
  const target = GS_2026[g][s] + 2 * wgi;
  let step = GS_2026[ng].findIndex((x) => x >= target);
  if (step < 0) step = 9;
  const newBase = GS_2026[ng][step];
  return {
    newStep: step + 1,
    newBasePay: newBase,
    newSalaryWithLocality: gsRate(ng, step, loc),
    raiseAmount: gsRate(ng, step, loc) - gsRate(g, s, loc),
    minimumRequiredBase: target,
  };
};

const MRA = (birthYear: number) => {
  const y = Math.round(birthYear);
  if (y < 1948) return 55;
  if (y < 1953) return 55 + (y - 1947) * (2 / 12);
  if (y < 1965) return 56;
  if (y < 1970) return 56 + (y - 1964) * (2 / 12);
  return 57;
};
export const fersRetirement: CustomCalculator = (v) => {
  const high3 = nonNeg(v.high3Salary);
  const years = nonNeg(v.yearsOfService) + nonNeg(v.sickLeaveHours) / 2087;
  const age = nonNeg(v.retirementAge, 62);
  const special = yes(v.specialProvisions);
  const mra = MRA(nonNeg(v.birthYear, 1970));
  let mult = age >= 62 && years >= 20 ? 0.011 : 0.01;
  let annuity = high3 * years * mult;
  if (special) {
    const first = Math.min(20, years);
    annuity = high3 * (first * 0.017 + Math.max(0, years - 20) * 0.01);
    mult = 0.017;
  }
  const unreduced = special ? (age >= 50 && years >= 20) || years >= 25 : (age >= 62 && years >= 5) || (age >= 60 && years >= 20) || (age >= mra && years >= 30);
  const mra10 = !unreduced && !special && age >= mra && years >= 10;
  const reductionPct = mra10 ? Math.min(100, (62 - age) * 5) : 0;
  const eligible = unreduced || mra10 || (yes(v.earlyOutOffer) && ((age >= 50 && years >= 20) || years >= 25));
  annuity = eligible ? annuity * (1 - reductionPct / 100) : 0;
  const supplement = eligible && (unreduced || yes(v.earlyOutOffer)) && age < 62 && !mra10 ? (nonNeg(v.socialSecurityAt62) * Math.min(40, Math.floor(years))) / 40 : 0;
  return {
    annualAnnuity: round2(annuity),
    monthlyAnnuity: round2(annuity / 12),
    fersSupplementMonthly: round2(supplement),
    multiplierPercent: round2(mult * 100),
    reductionPercent: reductionPct,
    minimumRetirementAge: round2(mra),
    eligibleToRetire: eligible ? 1 : 0,
    creditableYears: round2(years),
  };
};

/** Severance (5 U.S.C. 5595): 1 week per year up to 10 + 2 weeks per year beyond, ×(1 + 2.5% per quarter over 40), cap 52 weeks. */
export const veraVsip: CustomCalculator = (v) => {
  const salary = nonNeg(v.annualBasePay);
  const years = nonNeg(v.yearsOfService);
  const age = nonNeg(v.age, 55);
  const weekly = salary / 52;
  const weeks = Math.min(10, years) + Math.max(0, years - 10) * 2;
  const quartersOver40 = Math.max(0, Math.floor((age - 40) * 4));
  const severanceWeeks = Math.min(52, weeks * (1 + 0.025 * quartersOver40));
  const severance = weekly * severanceWeeks;
  const cap = nonNeg(v.vsipCap, 25000) || 25000;
  const vsip = Math.min(cap, severance);
  const vera = (age >= 50 && years >= 20) || years >= 25;
  const annuity = vera ? nonNeg(v.high3Salary, salary) * years * 0.01 : 0;
  return {
    vsipPayment: round2(vsip),
    vsipAfterTax: round2(vsip * (1 - Math.min(60, nonNeg(v.taxRatePercent, 32)) / 100)),
    severanceEquivalent: round2(severance),
    veraEligible: vera ? 1 : 0,
    veraAnnualAnnuity: round2(annuity),
  };
};

export const governmentPension: CustomCalculator = (v) => {
  const fas = nonNeg(v.finalAverageSalary);
  const years = nonNeg(v.yearsOfService);
  const mult = nonNeg(v.multiplierPercent, 2) / 100;
  const reduction = Math.min(100, nonNeg(v.earlyReductionPercent)) / 100;
  const cap = Math.min(100, nonNeg(v.maxPercentOfSalary, 100)) / 100;
  const gross = Math.min(fas * years * mult, fas * cap) * (1 - reduction);
  const survivor = gross * (1 - Math.min(50, nonNeg(v.survivorReductionPercent)) / 100);
  return {
    annualPension: round2(survivor),
    monthlyPension: round2(survivor / 12),
    replacementRatePercent: round2(fas > 0 ? (survivor / fas) * 100 : 0),
    pensionBeforeSurvivorOption: round2(gross),
    valueAt4PercentRule: round2(survivor * 25),
  };
};

export const totalCompensation: CustomCalculator = (v) => {
  const salary = nonNeg(v.annualSalary);
  const fers = salary * (nonNeg(v.agencyFersPercent, 18.4) / 100);
  const c = nonNeg(v.yourTspPercent, 5);
  const tsp = salary * ((1 + Math.min(3, c) + Math.max(0, Math.min(2, c - 3)) * 0.5) / 100); // 1% automatic + match: 100% of 3%, 50% of next 2%
  const fica = Math.min(salary, 184500) * 0.062 + salary * 0.0145;
  const fehb = nonNeg(v.annualFehbPremium) * (Math.min(75, nonNeg(v.governmentSharePercent, 72)) / 100);
  const leaveDays = nonNeg(v.annualLeaveDays, 20) + nonNeg(v.sickLeaveDays, 13) + 11;
  const leave = (salary / 260) * leaveDays;
  const fegli = ((Math.ceil(salary / 1000) * 1000 + 2000) / 1000) * 0.08 * 26; // agency share of FEGLI Basic: $0.08 per $1,000 biweekly
  const total = salary + fers + tsp + fica + fehb + fegli;
  return {
    totalCompensation: round2(total),
    benefitsValue: round2(total - salary),
    fersAgencyContribution: round2(fers),
    tspAgencyContribution: round2(tsp),
    healthInsuranceShare: round2(fehb),
    socialSecurityMedicare: round2(fica),
    paidLeaveValue: round2(leave),
    benefitsPercentOfSalary: round2(salary > 0 ? ((total - salary) / salary) * 100 : 0),
  };
};

/** FY2025 federal outlays by function, share of total (CBO / OMB actuals, rounded). */
export const OUTLAY_SHARES: [string, number][] = [
  ["Social Security", 22.4], ["Medicare", 13.9], ["Medicaid & other health", 13.2], ["Net interest on the debt", 13.8], ["National defense", 12.9], ["Income security (SNAP, EITC, unemployment)", 9.6], ["Veterans' benefits", 5.6], ["Education & training", 2.6], ["Transportation", 2.0], ["Everything else", 4.0],
];
export const taxpayerReceipt: CustomCalculator = (v) => {
  const tax = nonNeg(v.federalIncomeTax) + nonNeg(v.payrollTax);
  const out: Record<string, number> = { totalFederalTaxes: round2(tax) };
  const keys = ["socialSecurity", "medicare", "health", "netInterest", "defense", "incomeSecurity", "veterans", "education", "transportation", "other"];
  OUTLAY_SHARES.forEach(([, p], i) => (out[keys[i]] = round2((tax * p) / 100)));
  out.deficitShareBorrowed = round2(tax * (nonNeg(v.deficitPercentOfSpending, 25) / 100));
  return out;
};

// --- Contracting -------------------------------------------------------------------------------------
export const sprsScore: CustomCalculator = (v) => {
  const a = Math.round(nonNeg(v.unmetFivePoint));
  const b = Math.round(nonNeg(v.unmetThreePoint));
  const c = Math.round(nonNeg(v.unmetOnePoint));
  const partial = Math.round(nonNeg(v.partialMfaOrFips));
  const score = Math.max(-203, 110 - 5 * a - 3 * b - c - 2 * partial);
  return { sprsScore: score, pointsDeducted: 110 - score, perfectScore: score === 110 ? 1 : 0, meetsCmmcConditional88: score >= 88 ? 1 : 0, requirementsUnmet: a + b + c };
};

export const wrapRate: CustomCalculator = (v) => {
  const dl = nonNeg(v.directLaborRate);
  const fringe = nonNeg(v.fringePercent) / 100;
  const oh = nonNeg(v.overheadPercent) / 100;
  const ga = nonNeg(v.gaPercent) / 100;
  const fee = nonNeg(v.feePercent) / 100;
  const cost = dl * (1 + fringe) * (1 + oh) * (1 + ga);
  const price = cost * (1 + fee);
  return { wrapRate: round2(dl > 0 ? price / dl : 0), billRate: round2(price), fullyBurdenedCost: round2(cost), profitPerHour: round2(price - cost), wrapRateWithoutFee: round2(dl > 0 ? cost / dl : 0) };
};

/** DFARS 215.404-71 weighted guidelines (performance risk + contract type risk + facilities). */
export const CONTRACT_TYPE_RISK: [string, number, number, number][] = [
  ["FFP, no financing (normal 5%, 4–6%)", 5, 4, 6], ["FFP with performance-based payments (normal 4%, 2.5–5.5%)", 4, 2.5, 5.5], ["FFP with progress payments (normal 3%, 2–4%)", 3, 2, 4], ["Fixed-price incentive (normal 3%, 2–4%)", 3, 2, 4], ["Cost-plus incentive fee (normal 1%, 0–2%)", 1, 0, 2], ["Cost-plus fixed fee (normal 0.5%, 0–1%)", 0.5, 0, 1],
];
export const weightedGuidelines: CustomCalculator = (v) => {
  const cost = nonNeg(v.totalCostsExcludingFacilities);
  const tech = Math.min(10, nonNeg(v.technicalRiskValue, 4)) / 100;
  const mgmt = Math.min(6, nonNeg(v.managementRiskValue, 4)) / 100;
  const tw = Math.min(100, nonNeg(v.technicalWeightPercent, 60)) / 100;
  const perf = cost * (tech * tw + mgmt * (1 - tw));
  const [, normal, lo, hi] = CONTRACT_TYPE_RISK[pick(v.contractType, CONTRACT_TYPE_RISK.length)];
  const ctVal = Math.min(hi, Math.max(lo, safeNumber(v.contractTypeValue, normal) || normal)) / 100;
  const ctRisk = cost * ctVal;
  const wc = pick(v.contractType, CONTRACT_TYPE_RISK.length) <= 3 ? cost * (nonNeg(v.workingCapitalPercent) / 100) : 0;
  const fac = nonNeg(v.facilitiesCapitalEmployed) * 0.175 + nonNeg(v.landAndBuildings) * 0.1;
  const profit = perf + ctRisk + wc + fac;
  return { profitObjective: round2(profit), profitRatePercent: round2(cost > 0 ? (profit / cost) * 100 : 0), performanceRiskProfit: round2(perf), contractTypeRiskProfit: round2(ctRisk), facilitiesProfit: round2(fac), totalPrice: round2(cost + profit) };
};

// --- Vehicle fees ------------------------------------------------------------------------------------
export interface RegResult { registration: number; valueTax: number; weightFee: number; other: number; note?: number }
export interface StateReg { name: string; slug: string; fn: (v: Record<string, number>) => RegResult; defaults: { value: number; age: number; weight: number }; inputs: ("value" | "age" | "weight" | "fuel" | "local" | "mpg" | "mill" | "purchase")[]; valueLabel: string; rule: string; estimated: boolean }
const fuelOf = (v: Record<string, number>) => pick(v.fuelType, 3); // 0 gas, 1 hybrid, 2 electric
const ageOf = (v: Record<string, number>) => Math.round(nonNeg(v.vehicleAge));
const CA_VLF = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15];
const NV_DEP = [1, 0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15];
const NE_DEP = [1, 0.9, 0.8, 0.7, 0.6, 0.51, 0.43, 0.33, 0.24, 0.15, 0];
const local = (v: Record<string, number>, d: number) => (v.localFees === undefined ? d : nonNeg(v.localFees));
const S = (name: string, fn: StateReg["fn"], inputs: StateReg["inputs"], defaults: StateReg["defaults"], valueLabel: string, rule: string, estimated: boolean): StateReg => ({ name, slug: `${name.toLowerCase().replace(/ /g, "-")}-vehicle-registration-fee-calculator`, fn, inputs, defaults, valueLabel, rule, estimated });
export const REG_STATES: StateReg[] = [
  S("California", (v) => {
    const age = Math.min(10, ageOf(v));
    const val = nonNeg(v.vehicleValue);
    const cur = val * CA_VLF[age];
    const tif = cur < 5000 ? 33 : cur < 25000 ? 66 : cur < 35000 ? 132 : cur < 60000 ? 198 : 231;
    return { registration: 73 + 34, valueTax: val * CA_VLF[age] * 0.0065, weightFee: 0, other: tif + (fuelOf(v) === 2 ? 121 : 0) + local(v, 20) };
  }, ["value", "age", "fuel", "local"], { value: 35000, age: 2, weight: 3500 }, "Purchase Price (VLF base)", "Registration $73 + CHP $34; Vehicle License Fee 0.65% of the purchase price × the R&T §10753.2 schedule (100%, 90%, 80% … 15% from year 11); Transportation Improvement Fee $33–$231 by value; Road Improvement Fee $121 for zero-emission vehicles (model 2020+); county/district fees vary. These 2026 fees rise with CPI on January 1, 2027 (registration $76, CHP $35).", false),
  S("Arizona", (v) => {
    const age = ageOf(v);
    const assessed = nonNeg(v.vehicleValue) * 0.6 * Math.pow(1 - 0.1625, age);
    return { registration: 8, valueTax: (assessed / 100) * (age === 0 ? 2.8 : 2.89), weightFee: 0, other: 1.5 + local(v, 32) };
  }, ["value", "age", "local"], { value: 35000, age: 2, weight: 3500 }, "MSRP (Manufacturer's Base Retail Price)", "Vehicle License Tax (A.R.S. 28-5801): assessed value = 60% of the base retail price, reduced 16.25% for each year since first registration; $2.80 per $100 in the first year, $2.89 after. Registration $8, air quality fee $1.50, plus the public safety fee (default $32 — check your notice).", false),
  S("Colorado", (v) => {
    const age = ageOf(v);
    const tv = nonNeg(v.vehicleValue) * 0.85;
    const sot = age === 0 ? tv * 0.021 : age === 1 ? tv * 0.015 : age === 2 ? tv * 0.0125 : age <= 8 ? tv * 0.0075 : 3;
    const w = nonNeg(v.vehicleWeight, 3500);
    return { registration: w <= 4500 ? 12.5 : 17.5, valueTax: sot, weightFee: 0, other: local(v, 75) };
  }, ["value", "age", "weight", "local"], { value: 35000, age: 2, weight: 3500 }, "MSRP", "Specific ownership tax on 85% of MSRP: 2.1% in year 1, 1.5% in year 2, 1.25% in year 3, 0.75% in years 4–9 and $3 from year 10. License fee by weight plus FASTER road safety, bridge and county fees (default $75 — check your county's estimate).", true),
  S("New York", (v) => {
    const w = nonNeg(v.vehicleWeight, 3500);
    const twoYear = Math.min(280, Math.max(52, 2 * (26 + Math.max(0, w - 1650) / 100 * 1.5)));
    return { registration: twoYear, valueTax: 0, weightFee: 0, other: (yes(v.mctdCounty) ? 50 : 0) + local(v, 30) };
  }, ["weight", "local"], { value: 30000, age: 2, weight: 3500 }, "Vehicle Value", "Two-year passenger registration based on weight (estimated scale — use the fee on your DMV renewal), plus the $50 MCTD supplement in the Metropolitan Commuter Transportation District and the county vehicle use tax (default $30 for two years).", true),
  S("Iowa", (v) => {
    const age = ageOf(v);
    if (age >= 11) return { registration: 50, valueTax: 0, weightFee: 0, other: 0 };
    const f = age < 7 ? 1 : age < 9 ? 0.75 : 0.5;
    return { registration: 0, valueTax: nonNeg(v.vehicleValue) * 0.01 * f, weightFee: (nonNeg(v.vehicleWeight, 3500) / 100) * 0.4, other: 0 };
  }, ["value", "age", "weight"], { value: 35000, age: 2, weight: 3500 }, "Original List Price (MSRP)", "Iowa Code §321.109: 1% of list price plus 40¢ per 100 lb; the value part falls to 75% and then 50% as the vehicle ages, and older vehicles pay a $50 flat fee (age bands vary by model year — check your county treasurer).", true),
  S("Oregon", (v) => {
    const mpg = nonNeg(v.mpg, 25);
    const fuel = fuelOf(v);
    const twoYear = fuel === 2 ? 376 : mpg >= 40 ? 216 : mpg >= 20 ? 136 : 126;
    return { registration: twoYear, valueTax: 0, weightFee: 0, other: local(v, 0) };
  }, ["mpg", "fuel", "local"], { value: 30000, age: 2, weight: 3500 }, "Vehicle Value", "Two-year registration by fuel economy (0–19, 20–39, 40+ MPG, and electric), including the $60 two-year increase for 40+ MPG and electric vehicles from December 31, 2025. Multnomah, Washington and other counties add a county registration fee. Fees may change with the HB 3991 referendum — check ODOT DMV.", true),
  S("Wisconsin", (v) => ({ registration: 85, valueTax: 0, weightFee: 0, other: (fuelOf(v) === 1 ? 75 : fuelOf(v) === 2 ? 175 : 0) + local(v, 0) }), ["fuel", "local"], { value: 30000, age: 2, weight: 3500 }, "Vehicle Value", "Wis. Stat. §341.25: $85 a year for automobiles, plus $75 for hybrids and $175 for electric vehicles. Some counties and municipalities add a wheel tax ($10–$40).", false),
  S("Utah", (v) => {
    const age = ageOf(v);
    const uniform = age < 3 ? 150 : age < 6 ? 110 : age < 9 ? 80 : age < 12 ? 50 : 10;
    return { registration: 44, valueTax: uniform, weightFee: 0, other: (fuelOf(v) === 2 ? 142.5 : 0) + local(v, 0) };
  }, ["age", "fuel", "local"], { value: 30000, age: 2, weight: 3500 }, "Vehicle Value", "2026 age-based uniform fee in lieu of property tax: under 3 years $150, 3–5 $110, 6–8 $80, 9–11 $50, 12+ $10; plus the registration fee (about $44) and an electric vehicle fee (about $142.50).", true),
  S("Indiana", (v) => {
    const age = Math.min(10, ageOf(v));
    const f = [1, 0.87, 0.73, 0.6, 0.49, 0.39, 0.3, 0.22, 0.15, 0.1, 0.1][age];
    return { registration: 21.35, valueTax: Math.max(12, nonNeg(v.vehicleValue) * 0.0125 * f), weightFee: 0, other: local(v, 25) };
  }, ["value", "age", "local"], { value: 35000, age: 2, weight: 3500 }, "MSRP", "Registration $21.35 plus vehicle excise tax by MSRP class and age (estimated here at about 1.25% of MSRP, falling each year to a $12 minimum) and the county wheel / surtax (default $25). Use the BMV fee estimator for the exact excise class.", true),
  S("Arkansas", (v) => {
    const w = nonNeg(v.vehicleWeight, 3500);
    return { registration: w <= 3000 ? 17 : w <= 4500 ? 25 : 30, valueTax: yes(v.includePropertyTax) ? nonNeg(v.vehicleValue) * 0.2 * (nonNeg(v.millageRate, 45) / 1000) : 0, weightFee: 0, other: local(v, 0) };
  }, ["weight", "value", "mill", "local"], { value: 25000, age: 2, weight: 3500 }, "Assessed Market Value", "A.C.A. §27-14-601: $17 up to 3,000 lb, $25 for 3,001–4,500 lb, $30 over 4,500 lb. Personal property tax (20% of value × county millage) must be paid before renewal.", true),
  S("New Mexico", (v) => {
    const w = nonNeg(v.vehicleWeight, 3500);
    const old = ageOf(v) >= 5;
    const fee = w <= 2000 ? (old ? 24 : 27) : w <= 3000 ? (old ? 33 : 38) : w <= 4000 ? (old ? 44 : 49) : old ? 55 : 62;
    return { registration: fee, valueTax: 0, weightFee: 0, other: local(v, 0) };
  }, ["weight", "age", "local"], { value: 25000, age: 2, weight: 3500 }, "Vehicle Value", "One-year registration by weight and age (lower after 5 years); 2-year registration doubles it. Fees shown are typical — check MVD.", true),
  S("Nebraska", (v) => {
    const age = Math.min(10, ageOf(v));
    return { registration: 15, valueTax: nonNeg(v.vehicleValue) * 0.012 * NE_DEP[age], weightFee: 0, other: local(v, 20) };
  }, ["value", "age", "local"], { value: 35000, age: 2, weight: 3500 }, "MSRP", "Registration $15 plus the motor vehicle tax (a base tax set by MSRP, reduced by age: 100%, 90%, 80%, 70%, 60%, 51%, 43%, 33%, 24%, 15%, then $0 — estimated here at about 1.2% of MSRP) and the motor vehicle fee and county fees.", true),
  S("Kansas", (v) => ({ registration: nonNeg(v.vehicleWeight, 3500) <= 4500 ? 39 : 49, valueTax: nonNeg(v.vehicleValue) * 0.2 * (nonNeg(v.millageRate, 130) / 1000), weightFee: 0, other: local(v, 0) }), ["value", "weight", "mill", "local"], { value: 25000, age: 2, weight: 3500 }, "Appraised Value", "Registration $39 for passenger vehicles up to 4,500 lb ($49 heavier) plus county property tax on 20% of the appraised value at the local mill levy (default 130 mills).", true),
  S("Montana", (v) => {
    const age = ageOf(v);
    return { registration: age < 5 ? 217 : age <= 10 ? 87.5 : 28, valueTax: 0, weightFee: 0, other: local(v, 12) };
  }, ["age", "local"], { value: 30000, age: 2, weight: 3500 }, "Vehicle Value", "Light vehicle registration by age: 0–4 years about $217, 5–10 years $87.50, 11+ years $28 (permanent registration available for 11+ years), plus county option fees. Vehicles with MSRP over $150,000 pay an extra luxury fee.", true),
  S("Maine", (v) => {
    const age = Math.min(5, ageOf(v));
    const mills = [24, 17.5, 13.5, 10, 6.5, 4][age];
    return { registration: 35, valueTax: Math.max(5, (nonNeg(v.vehicleValue) / 1000) * mills), weightFee: 0, other: local(v, 0) };
  }, ["value", "age", "local"], { value: 35000, age: 2, weight: 3500 }, "MSRP", "36 M.R.S. §1482 excise tax paid to your town: MSRP × 24 mills (year 1), 17.5 (year 2), 13.5 (year 3), 10 (year 4), 6.5 (year 5), 4 (year 6+), minimum $5; plus the $35 state registration fee.", false),
  S("Delaware", (v) => ({ registration: 40, valueTax: yes(v.isPurchase) ? nonNeg(v.vehicleValue) * (nonNeg(v.docFeePercent, 4.25) / 100) : 0, weightFee: 0, other: local(v, 0) }), ["value", "purchase", "local"], { value: 30000, age: 2, weight: 3500 }, "Purchase Price", "$40 a year for passenger vehicles; on purchase, the one-time document fee (a percentage of the price — check DMV for the current rate) and $35 title fee.", true),
  S("Wyoming", (v) => {
    const age = ageOf(v);
    const f = [1, 0.75, 0.5, 0.3, 0.2, 0.15][Math.min(5, age)];
    return { registration: 30, valueTax: nonNeg(v.vehicleValue) * 0.6 * f * 0.03, weightFee: 0, other: local(v, 0) };
  }, ["value", "age", "local"], { value: 35000, age: 2, weight: 3500 }, "Factory Price (MSRP)", "County fee of 3% on 60% of the factory price, reduced as the vehicle ages (estimated schedule), plus the $30 state fee.", true),
  S("Florida", (v) => {
    const w = nonNeg(v.vehicleWeight, 3500);
    return { registration: w < 2500 ? 46.15 : w < 3500 ? 54.15 : 64.15, valueTax: 0, weightFee: 0, other: (yes(v.newToFlorida) ? 225 : 0) + local(v, 0) };
  }, ["weight", "local"], { value: 30000, age: 2, weight: 3500 }, "Vehicle Value", "Annual registration by weight (about $46 under 2,500 lb, $54 for 2,500–3,499 lb, $64 for 3,500 lb+ including service fees) plus the one-time $225 initial registration fee if you're registering a vehicle in Florida for the first time without a plate to transfer.", true),
  S("Georgia", (v) => ({ registration: 20, valueTax: yes(v.isPurchase) ? nonNeg(v.vehicleValue) * 0.07 : 0, weightFee: 0, other: local(v, 0) }), ["value", "purchase", "local"], { value: 30000, age: 2, weight: 3500 }, "Fair Market Value", "$20 annual registration. Vehicles bought on or after March 1, 2013 pay the one-time Title Ad Valorem Tax (7% of fair market value) instead of annual property tax, plus an $18 title fee.", false),
  S("Nevada", (v) => {
    const age = Math.min(9, ageOf(v));
    return { registration: 33, valueTax: Math.max(16, nonNeg(v.vehicleValue) * 0.35 * NV_DEP[age] * 0.04), weightFee: 0, other: local(v, 8) };
  }, ["value", "age", "local"], { value: 35000, age: 2, weight: 3500 }, "MSRP", "Registration $33 plus the Governmental Services Tax: 4¢ per $1 of 35% of MSRP, depreciated per NRS 371.060 (100%, 95%, 85%, 75%, 65% … to 15%), minimum $16; some counties add 1¢ supplemental GST.", true),
  S("Oklahoma", (v) => {
    const age = ageOf(v);
    return { registration: age < 4 ? 96 : age < 8 ? 86 : age < 12 ? 56 : age < 16 ? 36 : 16, valueTax: 0, weightFee: 0, other: local(v, 0) };
  }, ["age", "local"], { value: 30000, age: 2, weight: 3500 }, "Vehicle Value", "47 O.S. §1132: annual registration by registration year — $96 for years 1–4, $86 for years 5–8, then lower tiers for older vehicles. Excise tax is paid once on purchase (see the Oklahoma tax, title & license calculator).", true),
];
export const stateRegistration = (s: StateReg): CustomCalculator => (v) => {
  const r = s.fn(v);
  const override = nonNeg(v.registrationFeeOverride);
  const reg = override > 0 ? override : r.registration;
  const total = reg + r.valueTax + r.weightFee + r.other;
  return { totalRegistrationCost: round2(total), registrationFee: round2(reg), valueBasedTax: round2(r.valueTax), weightFee: round2(r.weightFee), otherFees: round2(r.other), monthlyEquivalent: round2(total / (s.name === "New York" || s.name === "Oregon" ? 24 : 12)) };
};

export const massExcise: CustomCalculator = (v) => {
  const msrp = nonNeg(v.msrp);
  const f = [0.5, 0.9, 0.6, 0.4, 0.25, 0.1][pick(v.yearIndex, 6)];
  const months = Math.min(12, Math.max(1, Math.round(nonNeg(v.monthsRegistered, 12))));
  const tax = Math.max(5, (msrp * f * 25) / 1000) * (months / 12);
  return { exciseTax: round2(tax), assessedValue: round2(msrp * f), percentOfMsrp: f * 100 };
};

export const maineExcise: CustomCalculator = (v) => {
  const mills = [24, 17.5, 13.5, 10, 6.5, 4][pick(v.yearIndex, 6)];
  const tax = Math.max(5, (nonNeg(v.msrp) / 1000) * mills);
  return { exciseTax: round2(tax), millRate: mills, totalWithRegistration: round2(tax + 35) };
};

export const DC_RATES = [6, 7, 8];
export const dcExcise: CustomCalculator = (v) => {
  const value = nonNeg(v.fairMarketValue);
  const rate = nonNeg(v.rateOverride) > 0 ? nonNeg(v.rateOverride) : DC_RATES[pick(v.weightClass, 3)];
  const tax = value * (rate / 100);
  const reg = [72, 115, 155][pick(v.weightClass, 3)];
  return { exciseTax: round2(tax), ratePercent: rate, estimatedRegistration: reg, totalDue: round2(tax + reg + 26) };
};

export const ttl: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const trade = yes(v.tradeInReducesTax) ? nonNeg(v.tradeInValue) : 0;
  const taxable = Math.max(0, price - trade - nonNeg(v.rebates));
  const tax = taxable * (nonNeg(v.salesTaxPercent, 6) / 100);
  const fees = nonNeg(v.titleFee) + nonNeg(v.registrationFee) + nonNeg(v.docFee) + nonNeg(v.plateFee);
  return { totalTaxTitleLicense: round2(tax + fees), salesTax: round2(tax), fees: round2(fees), outTheDoorPrice: round2(price - nonNeg(v.tradeInValue) - nonNeg(v.rebates) + tax + fees), taxableAmount: round2(taxable) };
};

export const oklahomaTtl: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const used = yes(v.usedVehicle);
  const excise = used ? (price <= 1500 ? 20 : 20 + (price - 1500) * 0.0325) : price * 0.0325;
  const sales = price * 0.0125;
  const age = Math.round(nonNeg(v.vehicleAge));
  const tag = age < 4 ? 96 : age < 8 ? 86 : age < 12 ? 56 : age < 16 ? 36 : 16;
  const fees = 11 + 2 + nonNeg(v.otherFees, 10);
  return { totalTaxTitleLicense: round2(excise + sales + tag + fees), exciseTax: round2(excise), salesTax: round2(sales), registration: tag, titleAndOtherFees: round2(fees) };
};

export const waTaxLicensing: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const sales = price * (nonNeg(v.salesTaxPercent, 9.5) / 100);
  const msrp = nonNeg(v.msrp, price);
  const age = Math.min(10, Math.round(nonNeg(v.vehicleAge)));
  const rtaSchedule = [0.95, 0.84, 0.72, 0.62, 0.53, 0.45, 0.38, 0.31, 0.25, 0.2, 0.16];
  const rta = yes(v.soundTransitArea) ? msrp * rtaSchedule[age] * 0.011 : 0;
  const w = nonNeg(v.vehicleWeight, 4000);
  const weight = w <= 4000 ? 25 : w <= 6000 ? 45 : w <= 8000 ? 55 : 65;
  const fees = 30 + weight + (pick(v.fuelType, 3) === 2 ? 225 : pick(v.fuelType, 3) === 1 ? 75 : 0) + nonNeg(v.localFees, 20) + 15;
  return { totalTaxAndLicensing: round2(sales + rta + fees), salesUseTax: round2(sales), rtaExciseTax: round2(rta), registrationAndWeightFees: round2(fees) };
};

export const titleTransfer: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  const tax = yes(v.salesTaxApplies, 1) ? price * (nonNeg(v.salesTaxPercent, 6) / 100) : 0;
  const fees = nonNeg(v.titleFee, 30) + nonNeg(v.registrationTransferFee) + nonNeg(v.notaryFee) + nonNeg(v.lienFee);
  return { totalTransferCost: round2(tax + fees), salesTaxOrTransferTax: round2(tax), fees: round2(fees) };
};

export const irpFee: CustomCalculator = (v) => {
  let total = 0;
  let miles = 0;
  for (let i = 1; i <= 5; i++) miles += nonNeg(v[`miles${i}`]);
  const share: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const pct = miles > 0 ? nonNeg(v[`miles${i}`]) / miles : 0;
    share.push(pct);
    total += pct * nonNeg(v[`fullFee${i}`]);
  }
  const trucks = Math.max(1, Math.round(nonNeg(v.trucks, 1)));
  const admin = nonNeg(v.adminFee);
  return { apportionedFeePerTruck: round2(total + admin), fleetTotal: round2((total + admin) * trucks), baseJurisdictionPercent: round2(share[0] * 100), totalMiles: miles };
};

export const scVehicleTax: CustomCalculator = (v) => {
  const value = nonNeg(v.assessedMarketValue);
  const tax = value * 0.06 * (nonNeg(v.millageRate, 330) / 1000);
  const fees = nonNeg(v.roadFee, 25);
  return { annualVehicleTax: round2(tax + fees), propertyTax: round2(tax), assessedValue: round2(value * 0.06), roadAndOtherFees: round2(fees) };
};

export const boatRegistration = (state: "CA" | "WA"): CustomCalculator => (v) => {
  const value = nonNeg(v.boatValue);
  if (state === "CA") {
    const reg = yes(v.originalRegistration) ? 59 : 40;
    const qmf = yes(v.freshwaterUse, 1) ? 16 : 0;
    return { totalRegistrationCost: round2(reg + qmf), registrationFee: reg, valueTax: 0, otherFees: qmf, perYear: round2((reg + qmf) / 2) };
  }
  const tax = value * 0.005;
  const reg = 30.5;
  const other = 2 + (yes(v.originalRegistration) ? 35.5 : 0);
  return { totalRegistrationCost: round2(reg + tax + other), registrationFee: reg, valueTax: round2(tax), otherFees: other, perYear: round2(reg + tax + other) };
};

// --- Permits, records, penalties ---------------------------------------------------------------------
export const passportFee: CustomCalculator = (v) => {
  const type = pick(v.applicationType, 4); // 0 first adult, 1 renewal adult, 2 minor under 16, 3 card only
  const product = pick(v.product, 3); // 0 book, 1 card, 2 book + card
  let app = 0;
  if (type === 2) app = product === 0 ? 100 : product === 1 ? 15 : 115;
  else app = product === 0 ? 130 : product === 1 ? 30 : 160;
  const exec = type === 1 ? 0 : 35;
  const expedite = yes(v.expedite) ? 60 : 0;
  const delivery = yes(v.oneTwoDayDelivery) ? 22.05 : 0;
  const people = Math.max(1, Math.round(nonNeg(v.applicants, 1)));
  const each = app + exec + expedite + delivery + nonNeg(v.photoCost);
  return { totalCost: round2(each * people), feePerPerson: round2(each), applicationFee: app, executionFee: exec, expediteFee: expedite };
};

export const floridaRecording: CustomCalculator = (v) => {
  const price = nonNeg(v.salePrice);
  const loan = nonNeg(v.mortgageAmount);
  const md = yes(v.miamiDade);
  const sfr = yes(v.singleFamily, 1);
  const deedRate = md ? 0.6 + (sfr ? 0 : 0.45) : 0.7;
  const deed = Math.ceil(price / 100) * deedRate;
  const note = Math.ceil(loan / 100) * 0.35;
  const intangible = loan * 0.002;
  const pages = Math.max(1, Math.round(nonNeg(v.deedPages, 3))) + Math.max(0, Math.round(nonNeg(v.mortgagePages, 15)));
  const docs = (loan > 0 ? 2 : 1);
  const recording = docs * 10 + Math.max(0, pages - docs) * 8.5;
  return { totalGovernmentFees: round2(deed + note + intangible + recording), deedDocStamps: round2(deed), mortgageDocStamps: round2(note), intangibleTax: round2(intangible), recordingFees: round2(recording) };
};

/** LL97 limits [2024–2029, 2030–2034] in tCO2e per sq ft by occupancy group. */
export const LL97_LIMITS: [string, number, number][] = [
  ["A — Assembly", 0.01074, 0.0042], ["B — Business (office)", 0.00846, 0.00453], ["B — Healthcare / ambulatory", 0.02381, 0.01193], ["E — Educational", 0.00758, 0.00344], ["F — Factory / industrial", 0.00574, 0.00167], ["H — High hazard", 0.02381, 0.01193], ["I-1 — Assisted living", 0.01138, 0.00598], ["I-2 — Hospital", 0.02381, 0.01193], ["I-4 — Day care", 0.00758, 0.00344], ["M — Mercantile (retail)", 0.01181, 0.00403], ["R-1 — Hotel", 0.00987, 0.00526], ["R-2 — Multifamily residential", 0.00675, 0.00407], ["S — Storage", 0.00426, 0.0011], ["U — Utility / misc.", 0.00426, 0.0011],
];
export const localLaw97: CustomCalculator = (v) => {
  const sf = nonNeg(v.grossFloorArea);
  const [, l1, l2] = LL97_LIMITS[pick(v.occupancy, LL97_LIMITS.length)];
  const limit = sf * (pick(v.period, 2) === 1 ? l2 : l1);
  const em = nonNeg(v.electricityKwh) * 0.000288962 + nonNeg(v.naturalGasKbtu) * 0.00005311 + nonNeg(v.fuelOil2Kbtu) * 0.00007421 + nonNeg(v.districtSteamKbtu) * 0.00004493;
  const over = Math.max(0, em - limit);
  return { annualPenalty: round2(over * 268), buildingEmissions: round2(em), emissionsLimit: round2(limit), excessEmissions: round2(over), percentOverLimit: round2(limit > 0 ? ((em - limit) / limit) * 100 : 0) };
};

export const OCCUPANT_LOADS: [string, number][] = [
  ["Assembly — chairs only, not fixed (7 net)", 7], ["Assembly — standing space (5 net)", 5], ["Assembly — tables and chairs (15 net)", 15], ["Business / office (150 gross)", 150], ["Educational classroom (20 net)", 20], ["Exercise room (50 gross)", 50], ["Mercantile / retail (60 gross)", 60], ["Commercial kitchen (200 gross)", 200], ["Industrial (100 gross)", 100], ["Residential (200 gross)", 200], ["Storage / warehouse (300 gross)", 300], ["Library reading room (50 net)", 50], ["Day care (35 net)", 35],
];
export const occupancy: CustomCalculator = (v) => {
  const area = nonNeg(v.floorArea);
  const factor = OCCUPANT_LOADS[pick(v.useType, OCCUPANT_LOADS.length)][1];
  const load = Math.floor(area / factor);
  return { maximumOccupancy: load, occupantLoadFactor: factor, exitsRequired: load > 1000 ? 4 : load > 500 ? 3 : load > 49 ? 2 : 1, minimumExitWidthInches: Math.max(32, Math.ceil(load * 0.2)) };
};

export const adaRamp: CustomCalculator = (v) => {
  const rise = nonNeg(v.totalRiseInches);
  const run = rise * 12;
  const runs = Math.max(1, Math.ceil(rise / 30));
  const landings = runs + 1;
  const length = run + (landings - 2) * 60 + 2 * 60;
  const actualRun = nonNeg(v.availableRunInches);
  return {
    minimumRampRunFeet: round2(run / 12),
    rampSegments: runs,
    landingsRequired: landings,
    totalLengthWithLandingsFeet: round2(length / 12),
    slopePercent: actualRun > 0 ? round2((rise / actualRun) * 100) : round2(100 / 12),
    compliant: actualRun > 0 ? (rise / actualRun <= 1 / 12 ? 1 : 0) : 1,
  };
};

export const sainteLague: CustomCalculator = (v) => {
  const seats = Math.max(1, Math.min(1000, Math.round(nonNeg(v.seats, 10))));
  const votes = [1, 2, 3, 4, 5, 6].map((i) => nonNeg(v[`party${i}Votes`]));
  const threshold = nonNeg(v.thresholdPercent) / 100;
  const total = votes.reduce((a, b) => a + b, 0);
  const elig = votes.map((x) => (total > 0 && x / total >= threshold ? x : 0));
  const method = pick(v.method, 3); // 0 Sainte-Laguë, 1 modified (1.4), 2 D'Hondt
  const won = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < seats; s++) {
    let best = -1;
    let bestQ = -1;
    for (let i = 0; i < 6; i++) {
      if (!elig[i]) continue;
      const d = method === 2 ? won[i] + 1 : won[i] === 0 ? (method === 1 ? 1.4 : 1) : 2 * won[i] + 1;
      const q = elig[i] / d;
      if (q > bestQ) { bestQ = q; best = i; }
    }
    if (best < 0) break;
    won[best]++;
  }
  const out: Record<string, number> = {};
  won.forEach((w, i) => (out[`party${i + 1}Seats`] = w));
  out.totalVotes = total;
  return out;
};

export const cumulativeVoting: CustomCalculator = (v) => {
  const shares = nonNeg(v.sharesVoting);
  const seats = Math.max(1, Math.round(nonNeg(v.directorsToElect, 5)));
  const want = Math.max(1, Math.round(nonNeg(v.directorsYouWant, 1)));
  const needed = Math.floor((shares * want) / (seats + 1)) + 1;
  const yours = nonNeg(v.yourShares);
  const canElect = Math.floor(((yours - 1) * (seats + 1)) / Math.max(1, shares));
  return { sharesNeededForYourDirectors: needed, directorsYouCanElect: Math.max(0, Math.min(seats, canElect)), yourTotalVotes: yours * seats, percentOfSharesNeeded: round2(shares > 0 ? (needed / shares) * 100 : 0) };
};

export const rfExposure: CustomCalculator = (v) => {
  const f = Math.max(0.3, nonNeg(v.frequencyMhz, 146));
  const eirpW = nonNeg(v.powerWatts) * Math.pow(10, Math.min(60, Math.max(-20, safeNumber(v.antennaGainDbi))) / 10) * (Math.min(100, nonNeg(v.dutyCyclePercent, 50)) / 100);
  const occ = yes(v.occupational);
  let mpe: number;
  if (f < 3) mpe = occ ? 100 : 100;
  else if (f < 30) mpe = occ ? 900 / (f * f) : 180 / (f * f);
  else if (f < 300) mpe = occ ? 1 : 0.2;
  else if (f < 1500) mpe = occ ? f / 300 : f / 1500;
  else mpe = occ ? 5 : 1;
  const rCm = nonNeg(v.distanceFeet, 10) * 30.48;
  const ground = yes(v.groundReflection, 1) ? 2.56 : 1;
  const s = rCm > 0 ? (ground * eirpW * 1000) / (4 * Math.PI * rCm * rCm) : 0;
  const safeCm = Math.sqrt((ground * eirpW * 1000) / (4 * Math.PI * mpe));
  return { powerDensityMwCm2: round2(s * 1000) / 1000, mpeLimitMwCm2: round2(mpe * 1000) / 1000, compliant: s <= mpe ? 1 : 0, minimumSafeDistanceFeet: round2(safeCm / 30.48), percentOfLimit: round2(mpe > 0 ? (s / mpe) * 100 : 0) };
};

export const sugarTax: CustomCalculator = (v) => {
  const oz = nonNeg(v.ouncesPerUnit, 12) * nonNeg(v.unitsPerWeek, 7);
  const weekly = oz * 0.0175;
  return { taxPerUnit: round2(nonNeg(v.ouncesPerUnit, 12) * 0.0175), weeklyTax: round2(weekly), annualTax: round2(weekly * 52), twoLiterBottleTax: round2(67.6 * 0.0175) };
};

export const futa: CustomCalculator = (v) => {
  const emps = Math.max(0, Math.round(nonNeg(v.employees, 1)));
  const wages = Math.min(7000, nonNeg(v.wagesPerEmployee, 7000));
  const credit = Math.max(0, 5.4 - nonNeg(v.creditReductionPercent));
  const rate = yes(v.paidStateUnemployment, 1) ? 6 - credit : 6;
  const tax = emps * wages * (rate / 100);
  return { annualFutaTax: round2(tax), perEmployee: round2(wages * (rate / 100)), effectiveRatePercent: round2(rate), quarterlyDepositRequired: tax > 500 ? 1 : 0 };
};

export const section184: CustomCalculator = (v) => {
  const price = nonNeg(v.homePrice);
  const downPct = price > 50000 ? 2.25 : 1.25;
  const down = Math.max(nonNeg(v.downPayment), price * (downPct / 100));
  const base = price - down;
  const upfront = base * 0.01;
  const loan = yes(v.financeUpfrontFee, 1) ? base + upfront : base;
  const r = nonNeg(v.interestRatePercent, 6.5) / 100 / 12;
  const n = Math.max(1, Math.round(nonNeg(v.termYears, 30) * 12));
  const pi = r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n;
  const annual = (loan * 0.0025) / 12;
  const tax = nonNeg(v.annualTaxesInsurance) / 12;
  return { monthlyPayment: round2(pi + annual + tax), principalAndInterest: round2(pi), annualGuaranteeFeeMonthly: round2(annual), upfrontGuaranteeFee: round2(upfront), minimumDownPayment: round2(price * (downPct / 100)), loanAmount: round2(loan) };
};

export const dfvc: CustomCalculator = (v) => {
  const days = Math.round(nonNeg(v.daysLate));
  const large = yes(v.largePlan);
  const nonprofit = yes(v.small501c3);
  const years = Math.max(1, Math.round(nonNeg(v.lateYears, 1)));
  const perFilingCap = large ? 2000 : 750;
  const perPlanCap = nonprofit && !large ? 750 : large ? 4000 : 1500;
  const per = Math.min(perFilingCap, days * 10);
  const total = Math.min(perPlanCap, per * years);
  return { dfvcPenalty: round2(total), perFilingPenalty: round2(per), perPlanCap, perFilingCap, irsPenaltyAvoided: round2(Math.min(150000, days * 250) * years) };
};

export const form5500Penalty: CustomCalculator = (v) => {
  const days = Math.round(nonNeg(v.daysLate));
  const irs = Math.min(150000, days * 250);
  const dol = days * nonNeg(v.dolPerDayPenalty, 2739);
  return { irsPenalty: round2(irs), maximumDolPenalty: round2(dol), totalPotentialPenalty: round2(irs + dol), dfvcAlternative: round2(Math.min(yes(v.largePlan) ? 2000 : 750, days * 10)) };
};

export const vfcpLostEarnings: CustomCalculator = (v) => {
  const p = nonNeg(v.principal);
  const days = Math.max(0, Math.round(nonNeg(v.daysLateToRecovery)));
  const rate = Math.min(50, nonNeg(v.underpaymentRatePercent, 7)) / 100;
  const lost = p * (Math.pow(1 + rate / 365, Math.min(days, 36500)) - 1);
  const restoration = nonNeg(v.daysRecoveryToPayment);
  const extra = (p + lost) * (Math.pow(1 + rate / 365, Math.min(restoration, 36500)) - 1);
  return { lostEarnings: round2(lost), interestOnLostEarnings: round2(extra), totalToRestore: round2(p + lost + extra), totalLostEarningsAndInterest: round2(lost + extra) };
};

export const caLatePayment: CustomCalculator = (v) => {
  const tax = nonNeg(v.unpaidTax);
  const months = Math.min(40, Math.ceil(nonNeg(v.monthsLate)));
  const pay = tax * Math.min(0.25, 0.05 + 0.005 * months);
  const filedLate = yes(v.filedLate);
  const fileMonths = Math.min(5, Math.ceil(nonNeg(v.monthsFiledLate)));
  const filing = filedLate ? Math.max(Math.min(tax * 0.05 * fileMonths, tax * 0.25), nonNeg(v.monthsFiledLate) >= 2 ? Math.min(135, tax) : 0) : 0;
  const interest = tax * (nonNeg(v.interestRatePercent, 7) / 100) * (nonNeg(v.monthsLate) / 12);
  return { totalOwed: round2(tax + pay + filing + interest), latePaymentPenalty: round2(pay), lateFilingPenalty: round2(filing), interest: round2(interest), penaltyPercent: round2(tax > 0 ? ((pay + filing) / tax) * 100 : 0) };
};

export const medicareFee: CustomCalculator = (v) => {
  const cf = yes(v.qualifyingApm) ? 33.5675 : 33.4009;
  const rvu = nonNeg(v.workRvu) * nonNeg(v.workGpci, 1) + nonNeg(v.peRvu) * nonNeg(v.peGpci, 1) + nonNeg(v.mpRvu) * nonNeg(v.mpGpci, 1);
  const allowed = rvu * cf;
  const nonPar = yes(v.nonParticipating) ? 0.95 : 1;
  const amt = allowed * nonPar;
  return { allowedAmount: round2(amt), medicarePays80: round2(amt * 0.8), patientCoinsurance20: round2(amt * 0.2), totalRvus: round2(rvu), conversionFactor: cf, limitingCharge: round2(nonPar < 1 ? amt * 1.15 : 0) };
};

export const landRegistry: CustomCalculator = (v) => {
  const value = nonNeg(v.propertyValue);
  const scale = pick(v.scale, 2);
  const paper = yes(v.paperApplication);
  const s1: [number, number, number][] = [[80000, 20, 45], [100000, 40, 95], [200000, 100, 230], [500000, 150, 330], [1000000, 295, 655], [Infinity, 500, 1105]];
  const s2: [number, number, number][] = [[100000, 20, 40], [200000, 30, 60], [500000, 40, 80], [1000000, 60, 120], [Infinity, 105, 210]];
  const row = (scale === 0 ? s1 : s2).find(([cap]) => value <= cap)!;
  return { landRegistryFee: paper ? row[2] : row[1], portalFee: row[1], paperFee: row[2], saving: row[2] - row[1] };
};

export const softwareRoi: CustomCalculator = (v) => {
  const users = Math.max(1, Math.round(nonNeg(v.lawyers, 5)));
  const hours = nonNeg(v.hoursSavedPerWeek, 3);
  const rate = nonNeg(v.billingRate, 300);
  const capture = Math.min(100, nonNeg(v.percentBilled, 50)) / 100;
  const gain = users * hours * 48 * rate * capture + nonNeg(v.otherSavingsPerYear);
  const cost = users * nonNeg(v.costPerUserMonth, 89) * 12 + nonNeg(v.setupCost);
  return { annualNetBenefit: round2(gain - cost), roiPercent: round2(cost > 0 ? ((gain - cost) / cost) * 100 : 0), annualGain: round2(gain), annualCost: round2(cost), paybackMonths: round2(gain > 0 ? (cost / gain) * 12 : 0) };
};

export const lawGovCustomCalculators: Record<string, CustomCalculator> = {
  "gs-pay-calculator": gsPay,
  "two-step-promotion-rule-calculator": twoStepPromotion,
  "fers-retirement-calculator": fersRetirement,
  "vera-vsip-calculator": veraVsip,
  "government-pension-calculator": governmentPension,
  "federal-employee-total-compensation-calculator": totalCompensation,
  "taxpayer-receipt-calculator": taxpayerReceipt,
  "sprs-score-calculator": sprsScore,
  "wrap-rate-calculator": wrapRate,
  "weighted-guidelines-calculator": weightedGuidelines,
  ...Object.fromEntries(REG_STATES.map((s) => [s.slug, stateRegistration(s)])),
  "vehicle-excise-tax-calculator": massExcise,
  "maine-vehicle-excise-tax-calculator": maineExcise,
  "dc-vehicle-excise-tax-calculator": dcExcise,
  "tax-title-license-calculator": ttl,
  "oklahoma-tax-title-license-calculator": oklahomaTtl,
  "washington-tax-and-licensing-calculator": waTaxLicensing,
  "title-transfer-calculator": titleTransfer,
  "irp-fee-calculator": irpFee,
  "spartanburg-county-vehicle-tax-calculator": scVehicleTax,
  "california-boat-registration-fee-calculator": boatRegistration("CA"),
  "washington-boat-registration-fee-calculator": boatRegistration("WA"),
  "passport-fee-calculator": passportFee,
  "florida-recording-fee-transfer-tax-calculator": floridaRecording,
  "local-law-97-calculator": localLaw97,
  "fire-code-occupancy-calculator": occupancy,
  "ada-ramp-slope-calculator": adaRamp,
  "sainte-lague-calculator": sainteLague,
  "cumulative-voting-calculator": cumulativeVoting,
  "fcc-rf-exposure-calculator": rfExposure,
  "seattle-sugar-tax-calculator": sugarTax,
  "futa-calculator": futa,
  "section-184-loan-calculator": section184,
  "dfvc-penalty-calculator": dfvc,
  "form-5500-late-filing-penalty-calculator": form5500Penalty,
  "vfcp-lost-earnings-calculator": vfcpLostEarnings,
  "california-late-payment-penalty-calculator": caLatePayment,
  "medicare-fee-schedule-calculator": medicareFee,
  "land-registry-fee-calculator": landRegistry,
  "legal-practice-management-software-roi-calculator": softwareRoi,
};
