/**
 * Batch: "Shopping Calculators" → Lifestyle, Party & Wedding — weddings
 * (9 tools):
 *
 *  - weddingBudget: splits a total budget into typical category shares.
 *  - weddingGuest: invite list → expected attendance, invitations, catering.
 *  - weddingVenueCost: rental by venue type, day and season, plus rentals and
 *    service charge.
 *  - weddingAlcohol: drinks per guest by hours, split into wine, beer,
 *    liquor and a champagne toast, with cost.
 *  - weddingCakeCost: servings, suggested tiers and cost by style.
 *  - weddingFlowerCost: bouquets, boutonnieres, corsages, centerpieces and
 *    ceremony pieces by style.
 *  - weddingDressAlterationsCost: common alterations priced and summed.
 *  - weddingInvitationPostage: stamps for invitations and RSVP cards.
 *  - honeymoonBudget: flights, lodging, food, activities and insurance.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-life-wedding-calculators.ts for the copy.
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

export const weddingBudget: CustomCalculator = (v) => {
  const total = nonNeg(v.totalBudget);
  const guests = nonNeg(v.guests);
  const share = (pct: number) => round2((total * pct) / 100);
  return {
    venueAndCatering: share(45),
    photographyVideo: share(12),
    flowersDecor: share(10),
    musicEntertainment: share(8),
    attireBeauty: share(8),
    plannerCoordinator: share(5),
    stationeryCakeFavors: share(5),
    transportation: share(2),
    contingency: share(5),
    costPerGuest: guests > 0 ? round2(total / guests) : 0,
  };
};

export const weddingGuest: CustomCalculator = (v) => {
  const adultsInvited = nonNeg(v.familyGuests) + nonNeg(v.friendsGuests) + nonNeg(v.coworkerGuests);
  const plusOnes = Math.round(((nonNeg(v.friendsGuests) + nonNeg(v.coworkerGuests)) * nonNeg(v.plusOnePercent)) / 100);
  const invited = Math.round(adultsInvited + plusOnes + nonNeg(v.kids));
  const expected = Math.round(invited * mult(v.weddingType));
  const capacity = nonNeg(v.venueCapacity);
  return {
    expectedAttendance: expected,
    totalInvited: invited,
    invitationsToSend: Math.ceil(invited / 1.9),
    cateringEstimate: round2(expected * nonNeg(v.costPerGuest)),
    seatsLeft: capacity > 0 ? Math.round(capacity - expected) : 0,
  };
};

const VENUE_RENTAL = [3000, 6000, 8000, 1500, 600]; // hotel/banquet, barn, estate/garden, restaurant, park/backyard
const DAY = [1, 0.8, 0.6];
const SEASON = [1.15, 1, 0.8];

export const weddingVenueCost: CustomCalculator = (v) => {
  const guests = nonNeg(v.guests);
  const rental = VENUE_RENTAL[idx(v.venueType, 4)] * DAY[idx(v.day, 2)] * SEASON[idx(v.season, 2)] * (nonNeg(v.regionFactor) || 100) / 100;
  const rentals = guests * nonNeg(v.rentalsPerGuest);
  const service = ((rental + rentals) * nonNeg(v.serviceFee)) / 100;
  const total = rental + rentals + service;
  return {
    totalVenueCost: round2(total),
    rentalFee: round2(rental),
    tablesChairsLinens: round2(rentals),
    serviceAndTax: round2(service),
    costPerGuest: guests > 0 ? round2(total / guests) : 0,
  };
};

export const weddingAlcohol: CustomCalculator = (v) => {
  const drinkers = (nonNeg(v.guests) * nonNeg(v.drinkersPercent)) / 100;
  const hours = nonNeg(v.hours);
  const perGuest = hours > 0 ? 2 + Math.max(0, hours - 1) : 0;
  const drinks = Math.round(drinkers * perGuest);
  const full = idx(v.barType, 1) === 1;
  const [wine, beer, liquor] = full ? [0.5, 0.3, 0.2] : [0.6, 0.4, 0];
  const wineBottles = Math.ceil((drinks * wine) / 5);
  const beerCases = Math.ceil((drinks * beer) / 24);
  const liquorBottles = Math.ceil((drinks * liquor) / 16);
  const champagne = yes(v.toast) ? Math.ceil(nonNeg(v.guests) / 8) : 0;
  const cost = wineBottles * nonNeg(v.winePrice) + beerCases * nonNeg(v.beerCasePrice) + liquorBottles * nonNeg(v.liquorPrice) + champagne * nonNeg(v.champagnePrice);
  return {
    totalCost: round2(cost),
    totalDrinks: drinks,
    wineBottles,
    beerCases,
    liquorBottles,
    champagneBottles: champagne,
  };
};

// Round tiers 2 in deep: servings per tier size (wedding-size slices).
const TIERS: [number, number][] = [[6, 12], [8, 24], [10, 38], [12, 56], [14, 78], [16, 100]];

export const weddingCakeCost: CustomCalculator = (v) => {
  const servings = Math.ceil((nonNeg(v.guests) * nonNeg(v.eatingPercent)) / 100);
  let tiers = 0;
  let capacity = 0;
  while (capacity < servings && tiers < TIERS.length) capacity += TIERS[tiers++][1];
  const cake = servings * nonNeg(v.style);
  const cutting = servings * nonNeg(v.cuttingFee);
  const total = servings > 0 ? cake + cutting + nonNeg(v.deliveryFee) : 0;
  return {
    totalCost: round2(total),
    servingsNeeded: servings,
    suggestedTiers: tiers,
    tierServings: capacity,
    costPerGuest: nonNeg(v.guests) > 0 ? round2(total / nonNeg(v.guests)) : 0,
  };
};

export const weddingFlowerCost: CustomCalculator = (v) => {
  const s = mult(v.style);
  const perTable = nonNeg(v.guestsPerTable) || 8;
  const tables = Math.ceil(nonNeg(v.guests) / perTable);
  const personal = (250 + nonNeg(v.bridesmaids) * 85 + (nonNeg(v.groomsmen) + 1) * 25 + nonNeg(v.corsages) * 35) * s;
  const centerpieces = tables * 120 * s;
  const ceremony = nonNeg(v.ceremonyArrangements) * 300 * s;
  const setup = ((personal + centerpieces + ceremony) * nonNeg(v.setupPercent)) / 100;
  return {
    totalCost: round2(personal + centerpieces + ceremony + setup),
    personalFlowers: round2(personal),
    centerpieceCost: round2(centerpieces),
    centerpieces: tables,
    ceremonyFlowers: round2(ceremony),
    deliverySetup: round2(setup),
  };
};

export const weddingDressAlterationsCost: CustomCalculator = (v) => {
  const items = nonNeg(v.hem)
    + (yes(v.takeIn) ? 150 : 0)
    + nonNeg(v.bustle)
    + (yes(v.straps) ? 100 : 0)
    + (yes(v.cups) ? 40 : 0)
    + (yes(v.press) ? 90 : 0)
    + nonNeg(v.otherCost);
  const rush = (items * nonNeg(v.rushPercent)) / 100;
  const total = (items + rush) * (nonNeg(v.regionFactor) || 100) / 100;
  return {
    totalCost: round2(total),
    lowEstimate: round2(total * 0.75),
    highEstimate: round2(total * 1.35),
    rushFee: round2(rush),
  };
};

export const weddingInvitationPostage: CustomCalculator = (v) => {
  const n = Math.round(nonNeg(v.invitations));
  const oz = Math.ceil(nonNeg(v.weightOz));
  const first = nonNeg(v.firstOunce);
  const each = oz > 0 ? first + nonNeg(v.additionalOunce) * Math.max(0, oz - 1) + (yes(v.square) ? nonNeg(v.nonmachinable) : 0) : 0;
  const rsvp = yes(v.rsvpStamp) ? first : 0;
  const intl = nonNeg(v.internationalCount) * nonNeg(v.internationalPrice);
  const domestic = Math.max(0, n - nonNeg(v.internationalCount));
  const total = domestic * each + n * rsvp + intl;
  return {
    totalPostage: round2(total),
    postagePerInvitation: round2(each),
    rsvpPostageTotal: round2(n * rsvp),
    foreverStampsPerInvitation: first > 0 ? Math.ceil(each / first - 1e-9) : 0,
    costPerGuestHousehold: n > 0 ? round2(total / n) : 0,
  };
};

export const honeymoonBudget: CustomCalculator = (v) => {
  const nights = nonNeg(v.nights);
  const people = Math.max(1, Math.round(nonNeg(v.travelers) || 2));
  const days = nights + 1;
  const flights = nonNeg(v.flightPerPerson) * people;
  const lodging = nonNeg(v.hotelPerNight) * nights;
  const daily = (nonNeg(v.foodPerPersonDay) * people + nonNeg(v.activitiesPerDay) + nonNeg(v.transportPerDay)) * days;
  const sub = flights + lodging + daily + nonNeg(v.extras);
  const insurance = (sub * nonNeg(v.insurancePercent)) / 100;
  const total = sub + insurance;
  return {
    totalBudget: round2(total),
    flights: round2(flights),
    lodging: round2(lodging),
    foodActivitiesTransport: round2(daily),
    travelInsurance: round2(insurance),
    costPerDay: days > 0 ? round2(total / days) : 0,
  };
};

export const shoppingLifeWeddingCustomCalculators: Record<string, CustomCalculator> = {
  "wedding-budget-calculator": weddingBudget,
  "wedding-guest-calculator": weddingGuest,
  "wedding-venue-cost-calculator": weddingVenueCost,
  "wedding-alcohol-calculator": weddingAlcohol,
  "wedding-cake-cost-calculator": weddingCakeCost,
  "wedding-flower-cost-calculator": weddingFlowerCost,
  "wedding-dress-alterations-cost-calculator": weddingDressAlterationsCost,
  "wedding-invitation-postage-calculator": weddingInvitationPostage,
  "honeymoon-budget-calculator": honeymoonBudget,
};
