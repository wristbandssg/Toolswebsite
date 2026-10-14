/**
 * Batch: "Finance Calculators expansion 4" (14 Oct 2026), sub-batch 1 of 3 —
 * UK & India (7 tools). The user's 192-keyword list: most already built or
 * covered by existing tools; "Redundant", "for your website", formula pages
 * and non-finance maths tools dropped; 26 new tools in 3 sub-batches
 * (`fin4-*`: india-uk 7, trading-ops 9, accounting-ratios 10). Each tool is
 * filed in the sub-category the user named (see `category` in each
 * create-fin4-*.ts ToolDef).
 *
 *  - ukCoinWeight: counts and values UK coins from bag weights (Royal Mint
 *    weights: 1p 3.56 g, 2p 7.12 g, 5p 3.25 g, 10p 6.5 g, 20p 5 g, 50p 8 g,
 *    £1 8.75 g, £2 12 g).
 *  - penceToPounds: pence <-> pounds.
 *  - atalPensionYojana: the official APY contribution chart (entry age
 *    18–40 × ₹1,000–₹5,000 pension), years and total contributed, corpus
 *    returned to the nominee (₹1.7–8.5 lakh).
 *  - elss: ELSS mutual fund SIP or lump sum (3-year lock-in) — maturity,
 *    Section 80C tax saved under the old regime (₹1.5 lakh cap, 4% cess),
 *    LTCG tax at 12.5% above ₹1.25 lakh.
 *  - hraExemption: Section 10(13A) — least of actual HRA, rent − 10% of
 *    basic + DA, and 50% (metro) / 40% of basic + DA.
 *  - npsIndia: National Pension System — corpus at 60, the 60% tax-free
 *    lump sum, the annuity (min 40%) and monthly pension; 80CCD(1B)
 *    ₹50,000 deduction. Different from the Net Promoter Score tool on
 *    nps-calculator.
 *  - tdsInterest: Section 201(1A) interest — 1% a month for late
 *    deduction, 1.5% a month for late payment — and the Section 234E late
 *    filing fee (₹200 a day, capped at the TDS).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin4-india-uk-calculators.ts for the copy.
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

// --- 1. UK Coin Weight Calculator ------------------------------------------------------
// [input key, grams per coin, value in pence]
const UK_COINS: [string, number, number][] = [
  ["grams1p", 3.56, 1], ["grams2p", 7.12, 2], ["grams5p", 3.25, 5], ["grams10p", 6.5, 10],
  ["grams20p", 5, 20], ["grams50p", 8, 50], ["grams1pound", 8.75, 100], ["grams2pound", 12, 200],
];

export const ukCoinWeightCalculator: CustomCalculator = (values) => {
  let pence = 0;
  let coins = 0;
  let grams = 0;
  const out: Record<string, number> = {};
  for (const [key, g, value] of UK_COINS) {
    const w = pos(values[key], 0);
    const n = Math.round(w / g);
    grams += w;
    coins += n;
    pence += n * value;
    out[key.replace("grams", "coins")] = n;
  }
  return { ...out, totalCoins: coins, totalWeightKg: Math.round(grams) / 1000, totalValue: pence / 100 };
};

// --- 2. Pence to Pounds Converter ------------------------------------------------------
export const penceToPoundsConverter: CustomCalculator = (values) => {
  const toPounds = num(values.direction, 1) === 1;
  const amount = pos(values.amount, 1250);
  const pence = toPounds ? amount : amount * 100;
  return {
    pounds: round2(pence / 100),
    pence: Math.round(pence * 100) / 100,
    wholePounds: Math.floor(pence / 100),
    remainingPence: Math.round((pence % 100) * 100) / 100,
  };
};

// --- 3. Atal Pension Yojana Calculator -------------------------------------------------
// Monthly contribution (₹) by entry age 18–40 for ₹1,000 / 2,000 / 3,000 / 4,000 / 5,000 pension.
const APY: number[][] = [
  [42, 84, 126, 168, 210], [46, 92, 138, 183, 228], [50, 100, 150, 198, 248], [54, 108, 162, 215, 269],
  [59, 117, 177, 234, 292], [64, 127, 192, 254, 318], [70, 139, 208, 277, 346], [76, 151, 226, 301, 376],
  [82, 164, 246, 327, 409], [90, 178, 268, 356, 446], [97, 194, 292, 388, 485], [106, 212, 318, 423, 529],
  [116, 231, 347, 462, 577], [126, 252, 379, 504, 630], [138, 276, 414, 551, 689], [151, 302, 453, 602, 752],
  [165, 330, 495, 659, 824], [181, 362, 543, 722, 902], [198, 396, 594, 792, 990], [218, 436, 654, 870, 1087],
  [240, 480, 720, 957, 1196], [264, 528, 792, 1054, 1318], [291, 582, 873, 1164, 1454],
];
const APY_FREQ: Record<number, number> = { 1: 1, 2: 3, 3: 6 };

export const atalPensionYojanaCalculator: CustomCalculator = (values) => {
  const age = clamp(Math.round(num(values.entryAge, 25)), 18, 40);
  const slab = clamp(Math.round(num(values.pensionAmount, 5000) / 1000), 1, 5);
  const freq = APY_FREQ[num(values.frequency, 1)] ?? 1;
  const monthly = APY[age - 18][slab - 1];
  const years = 60 - age;
  return {
    monthlyContribution: monthly,
    contributionPerInstalment: monthly * freq,
    yearsOfContribution: years,
    totalContributed: monthly * 12 * years,
    monthlyPension: slab * 1000,
    corpusToNominee: slab * 170000,
  };
};

// --- 4. ELSS Calculator ----------------------------------------------------------------
export const elssCalculator: CustomCalculator = (values) => {
  const sip = num(values.mode, 1) === 1;
  const amount = pos(values.investment, 12500);
  const r = num(values.expectedReturn, 12) / 100;
  const years = Math.max(3, Math.round(pos(values.years, 5)));
  const slab = pos(values.taxSlab, 30) / 100;
  let value: number;
  let invested: number;
  if (sip) {
    const i = r / 12;
    value = 0;
    for (let m = 0; m < years * 12; m++) value = (value + amount) * (1 + i);
    invested = amount * years * 12;
  } else {
    value = amount * Math.pow(1 + r, years);
    invested = amount;
  }
  const yearlyInvested = sip ? amount * 12 : amount;
  const taxSaved = Math.min(150000, yearlyInvested) * slab * 1.04;
  const gain = value - invested;
  const ltcg = Math.max(0, gain - 125000) * 0.125 * 1.04;
  return {
    investedAmount: round2(invested),
    maturityValue: round2(value),
    estimatedGains: round2(gain),
    taxSavedFirstYear: round2(taxSaved),
    ltcgTaxOnRedemption: round2(ltcg),
    valueAfterLtcg: round2(value - ltcg),
  };
};

// --- 5. HRA Exemption Calculator -------------------------------------------------------
export const hraExemptionCalculator: CustomCalculator = (values) => {
  const basic = pos(values.basicSalary, 600000) + pos(values.dearnessAllowance, 0);
  const hra = pos(values.hraReceived, 240000);
  const rent = pos(values.rentPaid, 216000);
  const metro = num(values.cityType, 1) === 1;
  const a = hra;
  const b = Math.max(0, rent - 0.1 * basic);
  const c = basic * (metro ? 0.5 : 0.4);
  const exempt = Math.min(a, b, c);
  return {
    actualHra: round2(a),
    rentMinus10PctSalary: round2(b),
    percentOfSalary: round2(c),
    hraExemption: round2(exempt),
    taxableHra: round2(hra - exempt),
  };
};

// --- 6. NPS Calculator (National Pension System) ---------------------------------------
export const npsIndiaCalculator: CustomCalculator = (values) => {
  const monthly = pos(values.monthlyContribution, 5000);
  const age = clamp(Math.round(num(values.currentAge, 30)), 18, 69);
  const retire = Math.max(age + 1, Math.round(num(values.retirementAge, 60)));
  const r = num(values.expectedReturn, 10) / 100;
  const annuityPct = clamp(pos(values.annuityPercent, 40), 40, 100) / 100;
  const annuityRate = pos(values.annuityRate, 6) / 100;
  const slab = pos(values.taxSlab, 30) / 100;
  const n = (retire - age) * 12;
  const i = r / 12;
  let corpus = 0;
  for (let m = 0; m < n; m++) corpus = (corpus + monthly) * (1 + i);
  const annuity = corpus * annuityPct;
  return {
    totalInvested: round2(monthly * n),
    corpusAtRetirement: round2(corpus),
    lumpSumWithdrawal: round2(corpus - annuity),
    annuityPurchase: round2(annuity),
    monthlyPension: round2((annuity * annuityRate) / 12),
    yearlyTaxSaved80ccd1b: round2(Math.min(50000, monthly * 12) * slab * 1.04),
  };
};

// --- 7. TDS Interest Calculator --------------------------------------------------------
export const tdsInterestCalculator: CustomCalculator = (values) => {
  const tds = pos(values.tdsAmount, 50000);
  const lateDeduction = Math.ceil(pos(values.monthsLateDeduction, 0));
  const latePayment = Math.ceil(pos(values.monthsLatePayment, 2));
  const lateDays = Math.ceil(pos(values.daysLateFiling, 30));
  const i1 = tds * 0.01 * lateDeduction;
  const i2 = tds * 0.015 * latePayment;
  const fee = Math.min(tds, 200 * lateDays);
  return {
    interestLateDeduction: round2(i1),
    interestLatePayment: round2(i2),
    totalInterest: round2(i1 + i2),
    lateFilingFee234E: round2(fee),
    totalPayable: round2(tds + i1 + i2 + fee),
  };
};

export const fin4IndiaUkCustomCalculators: Record<string, CustomCalculator> = {
  "uk-coin-weight-calculator": ukCoinWeightCalculator,
  "pence-to-pounds-converter": penceToPoundsConverter,
  "atal-pension-yojana-calculator": atalPensionYojanaCalculator,
  "elss-calculator": elssCalculator,
  "hra-exemption-calculator": hraExemptionCalculator,
  "national-pension-system-calculator": npsIndiaCalculator,
  "tds-interest-calculator": tdsInterestCalculator,
};
