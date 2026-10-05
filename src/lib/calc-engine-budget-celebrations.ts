/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 6 of 12 — Celebrations
 * & Events (5 tools), filed under Budget Calculators > Life Events & Travel
 * Budget Calculators. See calc-engine-budget-methods.ts for the full batch
 * context.
 *
 *  - weddingGuestBudget: travel, lodging (shared), attire, gift, pre-wedding
 *    events; monthly saving.
 *  - holidayGiftBudget: recipients x amount by group plus food and decor.
 *  - birthdayPartyBudget (incl. graduation party, baby shower,
 *    housewarming): per-guest food, venue, cake, entertainment, favors.
 *  - bachelorBacheloretteParty: per-person cost incl. covering the
 *    honoree's share.
 *  - funeralCostBudget (incl. end-of-life planning): funeral costs plus
 *    final expenses vs money set aside.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-celebrations-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Wedding Guest Budget Calculator ------------------------------------------------
export const weddingGuestBudgetCalculator: CustomCalculator = (values) => {
  const travel = pos(values.travel, 400);
  const lodgingPerNight = pos(values.lodgingPerNight, 180);
  const nights = pos(values.nights, 2);
  const sharingWith = Math.max(1, Math.round(pos(values.sharingWith, 1)));
  const attire = pos(values.attire, 200);
  const gift = pos(values.gift, 150);
  const preEvents = pos(values.preEvents, 150);
  const monthsToSave = Math.max(1, pos(values.monthsToSave, 4));

  const lodging = (lodgingPerNight * nights) / sharingWith;
  const total = travel + lodging + attire + gift + preEvents;

  return {
    lodgingShare: round2(lodging),
    totalCost: round2(total),
    monthlySavingsNeeded: round2(total / monthsToSave),
  };
};

// --- 2. Holiday Gift Budget Calculator -------------------------------------------------
export const holidayGiftBudgetCalculator: CustomCalculator = (values) => {
  const groups: [number, number][] = [
    [pos(values.familyCount, 6), pos(values.familyAmount, 75)],
    [pos(values.kidsCount, 3), pos(values.kidsAmount, 60)],
    [pos(values.friendsCount, 5), pos(values.friendsAmount, 30)],
    [pos(values.otherCount, 4), pos(values.otherAmount, 15)],
  ];
  const extras = pos(values.extras, 300);
  const monthsToSave = Math.max(1, pos(values.monthsToSave, 6));

  const gifts = groups.reduce((s, [c, a]) => s + c * a, 0);
  const total = gifts + extras;

  return {
    giftsTotal: round2(gifts),
    totalHolidayBudget: round2(total),
    recipients: groups.reduce((s, [c]) => s + c, 0),
    monthlySavingsNeeded: round2(total / monthsToSave),
  };
};

// --- 3. Birthday Party Budget Calculator ------------------------------------------------
export const birthdayPartyBudgetCalculator: CustomCalculator = (values) => {
  const guests = pos(values.guests, 20);
  const foodPerGuest = pos(values.foodPerGuest, 12);
  const venue = pos(values.venue, 200);
  const cake = pos(values.cake, 60);
  const decorations = pos(values.decorations, 50);
  const entertainment = pos(values.entertainment, 150);
  const favorsPerGuest = pos(values.favorsPerGuest, 5);

  const total = guests * (foodPerGuest + favorsPerGuest) + venue + cake + decorations + entertainment;

  return {
    foodAndFavors: round2(guests * (foodPerGuest + favorsPerGuest)),
    totalCost: round2(total),
    costPerGuest: round2(guests > 0 ? total / guests : 0),
  };
};

// --- 4. Bachelor or Bachelorette Party Budget Calculator -------------------------------
export const bachelorBachelorettePartyBudgetCalculator: CustomCalculator = (values) => {
  const attendees = Math.max(1, Math.round(pos(values.attendees, 8)));
  const lodgingTotal = pos(values.lodgingTotal, 1600);
  const days = pos(values.days, 2);
  const foodPerPersonPerDay = pos(values.foodPerPersonPerDay, 80);
  const activitiesPerPerson = pos(values.activitiesPerPerson, 200);
  const travelPerPerson = pos(values.travelPerPerson, 300);
  const coverHonoree = Math.round(safeNumber(values.coverHonoree, 1)) === 1;

  const people = attendees + 1;
  const shared = lodgingTotal + people * (foodPerPersonPerDay * days + activitiesPerPerson);
  const honoreeShare = shared / people;
  const perAttendeeShared = coverHonoree ? shared / attendees : honoreeShare;

  return {
    totalTripCost: round2(shared + people * travelPerPerson),
    honoreeShareOfCosts: round2(honoreeShare),
    costPerAttendee: round2(perAttendeeShared + travelPerPerson),
    extraEachForHonoree: round2(coverHonoree ? honoreeShare / attendees : 0),
  };
};

// --- 5. Funeral Cost Budget Calculator ---------------------------------------------------
export const funeralCostBudgetCalculator: CustomCalculator = (values) => {
  const serviceFees = pos(values.serviceFees, 4500);
  const casketOrUrn = pos(values.casketOrUrn, 2500);
  const burialOrNiche = pos(values.burialOrNiche, 3500);
  const marker = pos(values.marker, 1800);
  const otherCosts = pos(values.otherCosts, 1200);
  const finalExpenses = pos(values.finalExpenses, 3000);
  const moneyAvailable = pos(values.moneyAvailable, 10000);

  const funeral = serviceFees + casketOrUrn + burialOrNiche + marker + otherCosts;
  const total = funeral + finalExpenses;

  return {
    funeralCost: round2(funeral),
    totalEndOfLifeCost: round2(total),
    shortfall: round2(Math.max(0, total - moneyAvailable)),
    surplus: round2(Math.max(0, moneyAvailable - total)),
  };
};

export const budgetCelebrationsCustomCalculators: Record<string, CustomCalculator> = {
  "wedding-guest-budget-calculator": weddingGuestBudgetCalculator,
  "holiday-gift-budget-calculator": holidayGiftBudgetCalculator,
  "birthday-party-budget-calculator": birthdayPartyBudgetCalculator,
  "bachelor-bachelorette-party-budget-calculator": bachelorBachelorettePartyBudgetCalculator,
  "funeral-cost-budget-calculator": funeralCostBudgetCalculator,
};
