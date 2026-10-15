/**
 * Batch: "Shopping Calculators" → Lifestyle, Party & Wedding — parties and
 * holidays (15 tools):
 *
 *  - cateringCost: per-person food by service style, staff, service charge,
 *    tax and gratuity.
 *  - partyDrinks / party Ice / keg: drinks, ice and beer quantities.
 *  - meatPerPerson / charcuterieBoard: food quantities and cost.
 *  - helium / balloonGarlandPrice: tank sizing and garland DIY vs pro cost.
 *  - cakeSize: pan size and cakes needed for a number of servings.
 *  - crinklePaper: shred filler for gift boxes and baskets.
 *  - halloweenCandy, christmasLights, christmasOrnament, thanksgivingFood,
 *    turkeySize: holiday quantities and costs.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-life-party-calculators.ts for the copy.
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

// Service style: [food $ per person, guests per server]
const CATERING: [number, number][] = [[25, 0], [45, 25], [60, 15], [75, 12], [70, 15]];

export const cateringCost: CustomCalculator = (v) => {
  const guests = nonNeg(v.guests);
  const [perPerson, ratio] = CATERING[idx(v.style, 4)];
  const food = guests * perPerson * (nonNeg(v.regionFactor) || 100) / 100;
  const servers = ratio > 0 && guests > 0 ? Math.ceil(guests / ratio) : 0;
  const staff = servers * nonNeg(v.hours) * nonNeg(v.staffRate);
  const service = ((food + staff) * nonNeg(v.serviceCharge)) / 100;
  const tax = (food * nonNeg(v.taxRate)) / 100;
  const tip = ((food + staff) * nonNeg(v.gratuity)) / 100;
  const total = food + staff + service + tax + tip;
  return {
    totalCost: round2(total),
    foodCost: round2(food),
    staffCost: round2(staff),
    serversNeeded: servers,
    feesTaxTip: round2(service + tax + tip),
    costPerPerson: guests > 0 ? round2(total / guests) : 0,
  };
};

const MIX: [number, number, number][] = [[0.6, 0.3, 0.1], [0.4, 0.4, 0.2], [0.2, 0.3, 0.5]]; // beer, wine, liquor

export const partyDrinks: CustomCalculator = (v) => {
  const guests = nonNeg(v.guests);
  const hours = nonNeg(v.hours);
  const perGuest = hours > 0 ? 2 + Math.max(0, hours - 1) : 0;
  const drinks = Math.round(((guests * nonNeg(v.drinkersPercent)) / 100) * perGuest);
  const [b, w, l] = MIX[idx(v.mix, 2)];
  const softServings = Math.round(guests * (hours > 0 ? 1 + hours : 0) * 0.6);
  return {
    alcoholicDrinks: drinks,
    beerCans: Math.ceil(drinks * b),
    wineBottles: Math.ceil((drinks * w) / 5),
    liquorBottles: Math.ceil((drinks * l) / 16),
    sodaTwoLiters: Math.ceil((softServings * 12) / 67.6),
    waterBottles: Math.ceil(guests * Math.max(1, hours / 2)),
    cups: Math.ceil(guests * 3),
  };
};

export const partyIce: CustomCalculator = (v) => {
  const guests = nonNeg(v.guests);
  const hours = nonNeg(v.hours);
  const lb = guests * mult(v.use) * mult(v.weather) * (hours > 3 ? 1 + (hours - 3) * 0.1 : 1) + nonNeg(v.coolers) * 10;
  const bags = Math.ceil(lb / 10 - 1e-9);
  return {
    iceLb: Math.ceil(lb - 1e-9),
    tenLbBags: bags,
    twentyLbBags: Math.ceil(lb / 20 - 1e-9),
    iceCost: round2(bags * nonNeg(v.bagPrice)),
    lbPerGuest: guests > 0 ? round2(lb / guests) : 0,
  };
};

export const meatPerPerson: CustomCalculator = (v) => {
  const raw = mult(v.meatType);
  const people = nonNeg(v.adults) + nonNeg(v.kids) * 0.5;
  const lb = people * raw * mult(v.appetite) * (yes(v.otherMains) ? 0.75 : 1);
  const yieldPct = raw >= 0.9 ? 0.55 : raw >= 0.7 ? 0.65 : 0.75;
  return {
    rawMeatLb: round2(lb),
    cookedYieldLb: round2(lb * yieldPct),
    meatCost: round2(lb * nonNeg(v.pricePerLb)),
    cookedOzPerAdult: people > 0 ? round2(((lb * yieldPct) / people) * 16) : 0,
  };
};

export const charcuterieBoard: CustomCalculator = (v) => {
  const guests = nonNeg(v.guests);
  const meal = yes(v.asMeal);
  const f = meal ? 2 : 1;
  const meatOz = guests * 2 * f;
  const cheeseOz = guests * 2 * f;
  const crackers = Math.ceil(guests * 5 * f);
  const fruitCups = round2(guests * 0.25 * f);
  const area = guests * 30;
  const length = Math.sqrt(area * 1.5);
  const cost = (meatOz / 16) * nonNeg(v.meatPricePerLb) + (cheeseOz / 16) * nonNeg(v.cheesePricePerLb) + guests * nonNeg(v.extrasPerGuest) * f;
  return {
    meatLb: round2(meatOz / 16),
    cheeseLb: round2(cheeseOz / 16),
    crackers,
    fruitCups,
    boardLengthIn: Math.ceil(length),
    estimatedCost: round2(cost),
  };
};

// Servings in a keg (12 oz) by size: half barrel, quarter / pony, sixth, mini (5 L)
const KEG = [165, 82, 55, 14];

export const keg: CustomCalculator = (v) => {
  const drinkers = (nonNeg(v.guests) * nonNeg(v.drinkersPercent)) / 100;
  const hours = nonNeg(v.hours);
  const beers = Math.ceil(drinkers * (hours > 0 ? 2 + Math.max(0, hours - 1) : 0) * (nonNeg(v.beerShare) / 100) * 1.1);
  const size = KEG[idx(v.kegSize, 3)];
  const kegs = beers > 0 ? Math.ceil(beers / size) : 0;
  const cost = kegs * nonNeg(v.kegPrice);
  return {
    kegsNeeded: kegs,
    beersNeeded: beers,
    kegCost: round2(cost),
    refundableDeposits: round2(kegs * nonNeg(v.deposit)),
    costPerBeer: beers > 0 ? round2(cost / beers) : 0,
  };
};

// Helium per balloon (cu ft): 9 in, 11 in, 16 in latex, 18 in foil, 36 in latex
const HELIUM = [0.25, 0.5, 1.2, 0.5, 5];
// Tank capacity (cu ft): disposable 8.9, disposable jumbo 14.9, rental 55, 80, 125, 244
const TANK = [8.9, 14.9, 55, 80, 125, 244];

export const helium: CustomCalculator = (v) => {
  const n = Math.round(nonNeg(v.balloons));
  const cuft = n * HELIUM[idx(v.size, 4)] * 1.1;
  const t = TANK[idx(v.tank, 5)];
  return {
    tanksNeeded: cuft > 0 ? Math.ceil(cuft / t) : 0,
    heliumCuFt: round2(cuft),
    balloonsPerTank: Math.floor(t / (HELIUM[idx(v.size, 4)] * 1.1)),
    tankCost: round2((cuft > 0 ? Math.ceil(cuft / t) : 0) * nonNeg(v.tankPrice)),
  };
};

export const balloonGarlandPrice: CustomCalculator = (v) => {
  const ft = nonNeg(v.lengthFt);
  const balloons = Math.ceil(ft * mult(v.density));
  const diy = balloons * nonNeg(v.balloonPrice) + (ft > 0 ? 15 + ft * 0.5 : 0);
  const pro = ft * mult(v.style) + (ft > 0 ? nonNeg(v.installFee) : 0);
  return {
    proPrice: round2(pro),
    balloonsNeeded: balloons,
    diyMaterialCost: round2(diy),
    diySavings: round2(pro - diy),
    proPricePerFoot: ft > 0 ? round2(pro / ft) : 0,
  };
};

// [size in, party servings] — 2-layer rounds, squares and single-layer sheets
const CAKES: [number, number][][] = [
  [[6, 12], [8, 20], [9, 24], [10, 28], [12, 40], [14, 63]],
  [[6, 18], [8, 32], [10, 50], [12, 72], [14, 98]],
  [[13, 24], [18, 54], [24, 96]],
];

export const cakeSize: CustomCalculator = (v) => {
  const wedding = yes(v.weddingSlices);
  const need = Math.ceil(nonNeg(v.servings) / (wedding ? 1.6 : 1));
  const list = CAKES[idx(v.shape, 2)];
  const fit = list.find(([, s]) => s >= need);
  const [size, per] = fit ?? list[list.length - 1];
  const cakes = need > 0 ? (fit ? 1 : Math.ceil(need / per)) : 0;
  const provided = Math.round(cakes * per * (wedding ? 1.6 : 1));
  return {
    recommendedSizeIn: need > 0 ? size : 0,
    cakesNeeded: cakes,
    servingsProvided: provided,
    extraServings: Math.max(0, provided - Math.round(nonNeg(v.servings))),
  };
};

export const crinklePaper: CustomCalculator = (v) => {
  const oz = nonNeg(v.containers) * mult(v.size) * mult(v.fill);
  const bags = Math.ceil(oz / 2 - 1e-9);
  const boxes = Math.ceil(oz / 16 - 1e-9);
  const bagCost = bags * nonNeg(v.bagPrice);
  const bulkCost = boxes * nonNeg(v.bulkPrice);
  return {
    ozNeeded: round2(oz),
    twoOzBags: bags,
    onePoundBoxes: boxes,
    cheapestCost: round2(Math.min(bagCost, bulkCost)),
    lbNeeded: round2(oz / 16),
  };
};

export const halloweenCandy: CustomCalculator = (v) => {
  const kids = nonNeg(v.trickOrTreaters);
  const pieces = Math.ceil(kids * nonNeg(v.piecesPerKid) * (1 + nonNeg(v.buffer) / 100));
  const per = nonNeg(v.piecesPerBag) || 1;
  const bags = pieces > 0 ? Math.ceil(pieces / per) : 0;
  const cost = bags * nonNeg(v.bagPrice);
  return {
    candyPieces: pieces,
    bagsToBuy: bags,
    candyCost: round2(cost),
    costPerKid: kids > 0 ? round2(cost / kids) : 0,
  };
};

export const christmasLights: CustomCalculator = (v) => {
  const tree = nonNeg(v.treeHeightFt) * mult(v.density);
  const roof = nonNeg(v.rooflineFt) * 4; // C6/C9 or mini lights about 4 bulbs per foot on rooflines
  const shrubs = nonNeg(v.shrubs) * 100;
  const lights = Math.round(tree + roof + shrubs);
  const watts = lights * mult(v.bulbType);
  const kwh = (watts / 1000) * nonNeg(v.hoursPerDay) * nonNeg(v.days);
  return {
    totalLights: lights,
    strandsOf100: Math.ceil(lights / 100),
    treeLights: Math.round(tree),
    wattage: round2(watts),
    seasonElectricityCost: round2(kwh * nonNeg(v.rate)),
  };
};

export const christmasOrnament: CustomCalculator = (v) => {
  const h = nonNeg(v.treeHeightFt);
  const n = Math.round(h * mult(v.density));
  return {
    ornaments: n,
    garlandFt: Math.round(h * 2.7),
    ribbonFt: Math.round(h * 9),
    topperSizeIn: round2(h * 1.5),
    ornamentCost: round2(n * nonNeg(v.avgPrice)),
  };
};

export const thanksgivingFood: CustomCalculator = (v) => {
  const adults = nonNeg(v.adults);
  const kids = nonNeg(v.kids);
  const people = adults + kids * 0.5;
  const left = yes(v.leftovers) ? 1.4 : 1;
  return {
    turkeyLb: round2(people * 1.25 * left),
    mashedPotatoesLb: round2(people * 0.5 * left),
    stuffingCups: round2(people * 0.75 * left),
    gravyCups: round2(people * 0.33 * left),
    cranberryCups: round2(people * 0.25 * left),
    dinnerRolls: Math.ceil((adults + kids) * 1.5 * left),
    pies: Math.ceil((adults + kids) / 8),
  };
};

export const turkeySize: CustomCalculator = (v) => {
  const people = nonNeg(v.adults) + nonNeg(v.kids) * 0.5;
  const breast = idx(v.turkeyType, 1) === 1;
  const lb = people * mult(v.leftovers) * (breast ? 0.6 : 1);
  return {
    turkeyLb: round2(lb),
    fridgeThawDays: Math.ceil(lb / 4.5 - 1e-9),
    roastHoursUnstuffed: round2((lb * 14) / 60),
    turkeyCost: round2(lb * nonNeg(v.pricePerLb)),
  };
};

export const shoppingLifePartyCustomCalculators: Record<string, CustomCalculator> = {
  "catering-cost-calculator": cateringCost,
  "party-drinks-calculator": partyDrinks,
  "party-ice-calculator": partyIce,
  "meat-per-person-calculator": meatPerPerson,
  "charcuterie-board-calculator": charcuterieBoard,
  "keg-calculator": keg,
  "helium-calculator": helium,
  "balloon-garland-price-calculator": balloonGarlandPrice,
  "cake-size-calculator": cakeSize,
  "crinkle-paper-calculator": crinklePaper,
  "halloween-candy-calculator": halloweenCandy,
  "christmas-lights-calculator": christmasLights,
  "christmas-ornament-calculator": christmasOrnament,
  "thanksgiving-food-calculator": thanksgivingFood,
  "turkey-size-calculator": turkeySize,
};
