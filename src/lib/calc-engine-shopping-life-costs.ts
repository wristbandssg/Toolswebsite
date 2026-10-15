/**
 * Batch: "Shopping Calculators" → Lifestyle, Party & Wedding — everyday and
 * personal costs (14 tools):
 *
 *  - fountainDrinkCost / coffeeCost: habit cost vs making it at home.
 *  - diaperCost: diapers and wipes until potty training, vs cloth.
 *  - costPerMeal: home-cooked cost per serving vs takeout.
 *  - streamingCost: subscriptions per month, per year and per hour watched.
 *  - toiletPaperPaperTowel: household rolls, packs and yearly cost.
 *  - vapeToCigaretteCost / chewingTobaccoCost: habit costs and savings.
 *  - clothingBudget: share of take-home pay split across the household.
 *  - hairColorCost / tattooPrice: salon and studio price estimates.
 *  - bracesCost / dentalCost / prescriptionGlassesCost: health costs with
 *    insurance.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-life-costs-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));
const mult = (v: number) => (safeNumber(v) > 0 ? safeNumber(v) : 1);
const yes = (v: number) => idx(v, 1) === 1;
const WEEKS = 52.14;

/** Future value of a monthly contribution at an annual return, compounded monthly. */
function fvMonthly(monthly: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const n = years * 12;
  return r > 0 ? monthly * ((Math.pow(1 + r, n) - 1) / r) : monthly * n;
}

export const fountainDrinkCost: CustomCalculator = (v) => {
  const perWeek = nonNeg(v.drinksPerWeek);
  const annual = perWeek * nonNeg(v.pricePerDrink) * WEEKS;
  const oz = nonNeg(v.cupOz);
  const home = perWeek * WEEKS * ((oz * 0.6) / 67.6) * nonNeg(v.twoLiterPrice); // about 40% of a cup is ice
  const sub = nonNeg(v.subscriptionMonthly) * 12;
  return {
    annualCost: round2(annual),
    monthlyCost: round2(annual / 12),
    costPerOz: oz > 0 ? round2(nonNeg(v.pricePerDrink) / oz) : 0,
    homeAnnualCost: round2(home),
    annualSavingsAtHome: round2(annual - home),
    subscriptionSavings: sub > 0 ? round2(annual - sub) : 0,
  };
};

export const coffeeCost: CustomCalculator = (v) => {
  const cups = nonNeg(v.cupsPerDay) * nonNeg(v.daysPerWeek) * WEEKS;
  const cafe = cups * nonNeg(v.cafePrice);
  const bagOz = nonNeg(v.bagOz) || 12;
  const homeCup = (nonNeg(v.bagPrice) / bagOz) * nonNeg(v.ozPerCup) + nonNeg(v.extrasPerCup);
  const home = cups * homeCup;
  const save = cafe - home;
  return {
    annualSavings: round2(save),
    annualCafeCost: round2(cafe),
    annualHomeCost: round2(home),
    homeCostPerCup: round2(homeCup),
    savingsInvested: round2(fvMonthly(save / 12, nonNeg(v.returnRate), nonNeg(v.years))),
  };
};

/** Diapers per day by age in months. */
const perDay = (m: number) => (m < 1 ? 11 : m < 6 ? 9 : m < 12 ? 7 : 5.5);

export const diaperCost: CustomCalculator = (v) => {
  const start = Math.floor(nonNeg(v.ageMonths));
  const end = Math.floor(nonNeg(v.pottyMonths));
  let diapers = 0;
  for (let m = start; m < end; m++) diapers += perDay(m) * 30.4;
  diapers = Math.round(diapers);
  const months = Math.max(0, end - start);
  const total = diapers * (nonNeg(v.pricePerDiaper) + nonNeg(v.wipesPerChange));
  const cloth = months > 0 ? nonNeg(v.clothUpfront) + months * nonNeg(v.clothLaundryMonthly) + diapers * nonNeg(v.wipesPerChange) : 0;
  return {
    totalCost: round2(total),
    diapersNeeded: diapers,
    averageMonthlyCost: months > 0 ? round2(total / months) : 0,
    clothAlternativeCost: round2(cloth),
    clothSavings: round2(total - cloth),
  };
};

export const costPerMeal: CustomCalculator = (v) => {
  const servings = nonNeg(v.servings);
  const cost = nonNeg(v.ingredientCost) + nonNeg(v.pantryCost);
  const perServing = servings > 0 ? cost / servings : 0;
  const save = nonNeg(v.takeoutPrice) - perServing;
  const meals = nonNeg(v.mealsPerWeek);
  return {
    costPerServing: round2(perServing),
    savingsPerServing: round2(save),
    weeklyHomeCost: round2(perServing * meals),
    annualSavingsVsTakeout: round2(save * meals * WEEKS),
  };
};

export const streamingCost: CustomCalculator = (v) => {
  const monthly = [v.s1, v.s2, v.s3, v.s4, v.s5, v.s6].reduce((s, x) => s + nonNeg(x), 0);
  const hours = nonNeg(v.hoursPerWeek) * (WEEKS / 12);
  const cable = nonNeg(v.cablePrice);
  return {
    monthlyTotal: round2(monthly),
    annualTotal: round2(monthly * 12),
    costPerHourWatched: hours > 0 ? round2(monthly / hours) : 0,
    savingsVsCable: cable > 0 ? round2((cable - monthly) * 12) : 0,
    services: [v.s1, v.s2, v.s3, v.s4, v.s5, v.s6].filter((x) => nonNeg(x) > 0).length,
  };
};

export const toiletPaperPaperTowel: CustomCalculator = (v) => {
  const sheets = nonNeg(v.people) * nonNeg(v.sheetsPerDay) * 365;
  const perRoll = nonNeg(v.sheetsPerRoll) || 1;
  const rollsYear = sheets / perRoll;
  const packs = rollsYear / (nonNeg(v.packRolls) || 1);
  const tpCost = packs * nonNeg(v.packPrice);
  const towelRolls = nonNeg(v.towelRollsPerWeek) * WEEKS;
  const towelCost = (towelRolls / (nonNeg(v.towelPackRolls) || 1)) * nonNeg(v.towelPackPrice);
  return {
    totalAnnualCost: round2(tpCost + towelCost),
    toiletPaperRollsPerMonth: round2(rollsYear / 12),
    toiletPaperPacksPerYear: Math.ceil(packs - 1e-9),
    toiletPaperAnnualCost: round2(tpCost),
    paperTowelAnnualCost: round2(towelCost),
    costPer100Sheets: round2((nonNeg(v.packPrice) / ((nonNeg(v.packRolls) || 1) * perRoll)) * 100),
  };
};

export const vapeToCigaretteCost: CustomCalculator = (v) => {
  const cig = ((nonNeg(v.cigsPerDay) * 365) / 20) * nonNeg(v.packPrice);
  const vape = nonNeg(v.podsPerWeek) * nonNeg(v.podPrice) * WEEKS + nonNeg(v.devicePerYear);
  const save = cig - vape;
  return {
    annualSavings: round2(save),
    annualCigaretteCost: round2(cig),
    annualVapeCost: round2(vape),
    monthlySavings: round2(save / 12),
    fiveYearSavings: round2(save * 5),
  };
};

export const chewingTobaccoCost: CustomCalculator = (v) => {
  const annual = nonNeg(v.cansPerWeek) * nonNeg(v.canPrice) * WEEKS;
  const years = nonNeg(v.years);
  return {
    annualCost: round2(annual),
    monthlyCost: round2(annual / 12),
    totalOverYears: round2(annual * years),
    ifInvestedInstead: round2(fvMonthly(annual / 12, nonNeg(v.returnRate), years)),
  };
};

export const clothingBudget: CustomCalculator = (v) => {
  const monthly = (nonNeg(v.takeHomeMonthly) * nonNeg(v.percent)) / 100;
  const adults = nonNeg(v.adults);
  const kids = nonNeg(v.kids);
  const shares = adults + kids * 0.7;
  const annual = monthly * 12;
  return {
    monthlyBudget: round2(monthly),
    annualBudget: round2(annual),
    perAdultAnnual: shares > 0 && adults > 0 ? round2(annual / shares) : 0,
    perChildAnnual: shares > 0 && kids > 0 ? round2((annual / shares) * 0.7) : 0,
  };
};

export const hairColorCost: CustomCalculator = (v) => {
  const base = mult(v.service) * mult(v.length) * mult(v.salonTier);
  const gloss = yes(v.toner) ? 40 : 0;
  const tip = ((base + gloss) * nonNeg(v.tipPercent)) / 100;
  const visit = base + gloss + tip;
  const visits = nonNeg(v.visitsPerYear);
  return {
    costPerVisit: round2(visit),
    serviceBeforeTip: round2(base + gloss),
    tip: round2(tip),
    annualCost: round2(visit * visits),
    boxDyeAnnualCost: round2(visits * 15),
  };
};

export const tattooPrice: CustomCalculator = (v) => {
  const area = nonNeg(v.widthIn) * nonNeg(v.heightIn);
  const hours = area > 0 ? Math.max(0.5, area * 0.15 * mult(v.style) * mult(v.placement)) : 0;
  const base = area > 0 ? Math.max(nonNeg(v.shopMinimum), hours * nonNeg(v.hourlyRate)) : 0;
  const tip = (base * nonNeg(v.tipPercent)) / 100;
  return {
    totalWithTip: round2(base + tip),
    tattooPrice: round2(base),
    estimatedHours: round2(hours),
    tip: round2(tip),
    sessions: hours > 0 ? Math.ceil(hours / 5) : 0,
  };
};

export const bracesCost: CustomCalculator = (v) => {
  const total = mult(v.bracesType) * mult(v.severity) + nonNeg(v.retainers);
  const ins = Math.min((total * nonNeg(v.coveragePercent)) / 100, nonNeg(v.lifetimeMax));
  const oop = total - ins;
  const months = Math.max(1, Math.round(nonNeg(v.months) || 24));
  const financed = Math.max(0, oop - nonNeg(v.downPayment));
  return {
    outOfPocket: round2(oop),
    totalCost: round2(total),
    insurancePays: round2(ins),
    monthlyPayment: round2(financed / months),
    taxSavingsWithHsa: round2((oop * nonNeg(v.taxRate)) / 100),
  };
};

export const dentalCost: CustomCalculator = (v) => {
  const preventive = nonNeg(v.cleanings) * nonNeg(v.cleaningPrice) + (nonNeg(v.cleanings) > 0 ? 150 : 0);
  const basic = nonNeg(v.fillings) * 200 + nonNeg(v.extractions) * 250 + nonNeg(v.rootCanals) * 1100;
  const major = nonNeg(v.crowns) * 1300;
  const bill = preventive + basic + major;
  let deductible = nonNeg(v.deductible);
  const afterDed = (amount: number) => {
    const d = Math.min(deductible, amount);
    deductible -= d;
    return amount - d;
  };
  const pays = Math.min(nonNeg(v.annualMax), preventive + afterDed(basic) * 0.8 + afterDed(major) * 0.5);
  const premiums = nonNeg(v.premiumMonthly) * 12;
  const yours = bill - pays + premiums;
  return {
    yourCostWithInsurance: round2(yours),
    totalDentalBill: round2(bill),
    insurancePays: round2(pays),
    annualPremiums: round2(premiums),
    insuranceSaves: round2(bill - yours),
  };
};

const LENS = [80, 150, 300]; // single vision, bifocal, progressive

export const prescriptionGlassesCost: CustomCalculator = (v) => {
  const frames = mult(v.frames);
  const lenses = LENS[idx(v.lens, 2)] + (yes(v.antiReflective) ? 60 : 0) + (yes(v.blueLight) ? 40 : 0) + (yes(v.photochromic) ? 120 : 0) + (yes(v.highIndex) ? 80 : 0);
  const exam = yes(v.includeExam) ? 120 : 0;
  const full = frames + lenses + exam;
  const ins = yes(v.hasInsurance);
  const withIns = ins
    ? Math.max(0, frames - nonNeg(v.frameAllowance)) + nonNeg(v.lensCopay) + (lenses - LENS[idx(v.lens, 2)]) * 0.8 + (exam > 0 ? nonNeg(v.examCopay) : 0)
    : full;
  return {
    yourCost: round2(withIns),
    costWithoutInsurance: round2(full),
    framesCost: round2(frames),
    lensesCost: round2(lenses),
    insuranceSavings: round2(full - withIns),
  };
};

export const shoppingLifeCostsCustomCalculators: Record<string, CustomCalculator> = {
  "fountain-drink-cost-calculator": fountainDrinkCost,
  "coffee-cost-calculator": coffeeCost,
  "diaper-cost-calculator": diaperCost,
  "cost-per-meal-calculator": costPerMeal,
  "streaming-cost-calculator": streamingCost,
  "toilet-paper-paper-towel-calculator": toiletPaperPaperTowel,
  "vape-to-cigarette-cost-calculator": vapeToCigaretteCost,
  "chewing-tobacco-cost-calculator": chewingTobaccoCost,
  "clothing-budget-calculator": clothingBudget,
  "hair-color-cost-calculator": hairColorCost,
  "tattoo-price-calculator": tattooPrice,
  "braces-cost-calculator": bracesCost,
  "dental-cost-calculator": dentalCost,
  "prescription-glasses-cost-calculator": prescriptionGlassesCost,
};
