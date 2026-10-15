// One-time (but safe to re-run) batch setup script: creates 9 wedding tools
// from the user's shopping list (Shopping Calculators > Lifestyle, Party & Wedding Calculators).
// See src/lib/calc-engine-shopping-life-wedding.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-life-wedding-calculators.ts
// or
//   npm run db:create-shopping-life-wedding-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Lifestyle, Party & Wedding Calculators", slug: "lifestyle-party-wedding-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const YN = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);
const REGION = () => percentField("regionFactor", "Regional Price Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 });

const TOOLS: ToolDef[] = [
  {
    slug: "wedding-budget-calculator",
    title: "Wedding Budget Calculator",
    description: "Split your total wedding budget into typical category shares — venue and catering, photography, flowers, music, attire, planner and more — with a contingency and cost per guest.",
    metaTitle: "Wedding Budget Calculator — Budget Breakdown",
    metaDescription: "Free wedding budget calculator. Split your budget into venue, catering, photography, flowers, music, attire and more, with cost per guest.",
    calcInputs: [
      currencyField("totalBudget", "Total Wedding Budget", { default: 30000, max: 2000000, step: 100 }),
      numberField("guests", "Number of Guests", { default: 120, max: 1000 }),
    ],
    calcResult: { label: "Venue & Catering", format: "currency" },
    calcResults: [
      { key: "venueAndCatering", label: "Venue, Food & Drink (45%)", format: "currency", highlight: true },
      { key: "photographyVideo", label: "Photography & Video (12%)", format: "currency" },
      { key: "flowersDecor", label: "Flowers & Decor (10%)", format: "currency" },
      { key: "musicEntertainment", label: "Music & Entertainment (8%)", format: "currency" },
      { key: "attireBeauty", label: "Attire, Hair & Makeup (8%)", format: "currency" },
      { key: "plannerCoordinator", label: "Planner / Coordinator (5%)", format: "currency" },
      { key: "stationeryCakeFavors", label: "Stationery, Cake & Favors (5%)", format: "currency" },
      { key: "transportation", label: "Transportation (2%)", format: "currency" },
      { key: "contingency", label: "Contingency Buffer (5%)", format: "currency" },
      { key: "costPerGuest", label: "Total Cost per Guest", format: "currency" },
    ],
    instructions: "Enter your total budget (everything except the rings and honeymoon) and your guest count. Use the category amounts as starting targets, then shift money toward what matters most to you.",
    examples: "Example: a $30,000 wedding for 120 guests puts about $13,500.00 toward the venue, food and drink and $3,600.00 toward photography — $250.00 per guest overall.",
    assumptions: "Shares follow common US planning guidelines; venue and catering usually take 40–50%. Guest count drives most costs, so trimming the list saves the most. The 5% buffer covers tips, fees and surprises. Engagement rings and the honeymoon are usually budgeted separately.",
    faq: [
      { question: "How much does the average wedding cost?", answer: "US weddings commonly cost about $30,000–$36,000 in 2025–2026, with big regional differences." },
      { question: "What percentage of a wedding budget goes to the venue?", answer: "Venue and catering together typically take 40–50% of the total." },
    ],
  },
  {
    slug: "wedding-guest-calculator",
    title: "Wedding Guest Calculator",
    description: "Build your wedding guest count — family, friends, coworkers, plus-ones and kids — and estimate how many will attend, invitations to send, catering cost and seats left at the venue.",
    metaTitle: "Wedding Guest Calculator — Guest Count & RSVPs",
    metaDescription: "Free wedding guest calculator. Count invitees with plus-ones and kids, estimate attendance, invitations to send and catering cost.",
    calcInputs: [
      numberField("familyGuests", "Family (Both Sides)", { default: 60, max: 1000 }),
      numberField("friendsGuests", "Friends", { default: 50, max: 1000 }),
      numberField("coworkerGuests", "Coworkers & Others", { default: 10, max: 500, required: false }),
      percentField("plusOnePercent", "Friends/Coworkers Getting a Plus-One", { default: 30, max: 100 }),
      numberField("kids", "Children Invited", { default: 10, max: 300, required: false }),
      dropdown("weddingType", "Wedding Type (Typical Attendance)", [["Local (about 85%)", 0.85], ["Some guests travel (about 75%)", 0.75], ["Destination (about 60%)", 0.6]], 0.85),
      currencyField("costPerGuest", "Catering Cost per Guest", { default: 100, max: 1000 }),
      numberField("venueCapacity", "Venue Capacity", { default: 150, max: 2000, required: false }),
    ],
    calcResult: { label: "Expected Attendance", format: "number" },
    calcResults: [
      { key: "expectedAttendance", label: "Expected Attendance", format: "number", highlight: true },
      { key: "totalInvited", label: "Total Guests Invited", format: "number" },
      { key: "invitationsToSend", label: "Invitations to Send (Households)", format: "number" },
      { key: "cateringEstimate", label: "Catering Estimate", format: "currency" },
      { key: "seatsLeft", label: "Seats Left at Venue (Negative = Over)", format: "number" },
    ],
    instructions: "Count family, friends and coworkers you plan to invite, the share of friends and coworkers getting a plus-one, and children. Pick how far guests travel, then enter catering cost per head and venue capacity.",
    examples: "Example: 60 family, 50 friends, 10 coworkers, 30% plus-ones and 10 kids means 148 invited; for a local wedding expect about 126 — about $12,600.00 in catering.",
    assumptions: "Typical attendance: 80–90% for local weddings, 70–80% when many travel and 50–70% for destination weddings. Invitations average about 1.9 guests per household. Plan catering on the expected count but make sure the venue fits everyone invited.",
    faq: [
      { question: "What percentage of wedding guests usually attend?", answer: "Around 75–85% for most weddings, lower for destination weddings and holiday weekends." },
      { question: "How do I cut my wedding guest list?", answer: "Set clear rules — no plus-ones for single guests, adults-only, and only people you've seen in the last year or two." },
    ],
  },
  {
    slug: "wedding-venue-cost-calculator",
    title: "Wedding Venue Cost Calculator",
    description: "Estimate wedding venue cost by venue type, day of the week and season — plus tables, chairs and linens and the service charge — with total and per-guest cost.",
    metaTitle: "Wedding Venue Cost Calculator — Rental Prices",
    metaDescription: "Free wedding venue cost calculator. Estimate venue rental by type, day and season plus rentals and service fees, with cost per guest.",
    calcInputs: [
      numberField("guests", "Number of Guests", { default: 120, max: 1000 }),
      dropdown("venueType", "Venue Type", [["Hotel / banquet hall", 0], ["Barn / rustic venue", 1], ["Estate / garden / vineyard", 2], ["Restaurant private room", 3], ["Park or backyard (permit)", 4]], 1),
      dropdown("day", "Day", [["Saturday", 0], ["Friday or Sunday", 1], ["Weekday", 2]], 0),
      dropdown("season", "Season", [["Peak (May–October)", 0], ["Shoulder (April, November)", 1], ["Off-season (winter)", 2]], 0),
      currencyField("rentalsPerGuest", "Tables, Chairs & Linens per Guest (If Not Included)", { default: 15, max: 200, required: false }),
      percentField("serviceFee", "Service Charge & Tax", { default: 20, max: 40, required: false }),
      REGION(),
    ],
    calcResult: { label: "Total Venue Cost", format: "currency" },
    calcResults: [
      { key: "totalVenueCost", label: "Estimated Venue Cost", format: "currency", highlight: true },
      { key: "rentalFee", label: "Venue Rental Fee", format: "currency" },
      { key: "tablesChairsLinens", label: "Tables, Chairs & Linens", format: "currency" },
      { key: "serviceAndTax", label: "Service Charge & Tax", format: "currency" },
      { key: "costPerGuest", label: "Venue Cost per Guest", format: "currency" },
    ],
    instructions: "Enter your guest count, venue type, day and season. If the venue doesn't include tables, chairs and linens, add a per-guest rental cost. Hotels and restaurants often waive rental fees in exchange for a food-and-beverage minimum.",
    examples: "Example: a Saturday barn wedding in peak season for 120 guests costs about $10,440.00 for the venue and rentals — $87.00 per guest before catering.",
    assumptions: "Typical 2026 US rental fees: hotel/banquet about $3,000 (often with F&B minimums), barns about $6,000, estates and vineyards about $8,000+, restaurants $1,500 and parks a few hundred dollars for permits. Fridays and Sundays often cost 20% less and weekdays 40% less.",
    faq: [
      { question: "How much does a wedding venue cost?", answer: "Venue rentals commonly run $3,000–$12,000+, with big-city and peak-season Saturday dates costing the most." },
      { question: "How can I save money on a wedding venue?", answer: "Choose a Friday, Sunday or off-season date, or an all-inclusive venue that bundles rentals and catering." },
    ],
  },
  {
    slug: "wedding-alcohol-calculator",
    title: "Wedding Alcohol Calculator",
    description: "Calculate how much alcohol to buy for a wedding — bottles of wine, cases of beer, liquor and champagne for the toast — from guests, drinkers and reception length, with cost.",
    metaTitle: "Wedding Alcohol Calculator — How Much to Buy",
    metaDescription: "Free wedding alcohol calculator. Find how many bottles of wine, cases of beer, liquor and champagne to buy for your reception.",
    calcInputs: [
      numberField("guests", "Number of Guests", { default: 120, max: 1000 }),
      percentField("drinkersPercent", "Guests Who Drink", { default: 75, max: 100 }),
      numberField("hours", "Reception Length", { unit: "hours", default: 5, max: 12, step: 0.5 }),
      dropdown("barType", "Bar", [["Beer & wine only", 0], ["Full bar (wine, beer, liquor)", 1]], 1),
      YN("toast", "Champagne Toast", 1),
      currencyField("winePrice", "Wine per Bottle", { default: 14, max: 200 }),
      currencyField("beerCasePrice", "Beer per 24-Pack", { default: 32, max: 200 }),
      currencyField("liquorPrice", "Liquor per 750 ml", { default: 25, max: 200 }),
      currencyField("champagnePrice", "Sparkling Wine per Bottle", { default: 15, max: 200 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Alcohol Cost", format: "currency", highlight: true },
      { key: "totalDrinks", label: "Total Drinks", format: "number" },
      { key: "wineBottles", label: "Wine Bottles (750 ml)", format: "number" },
      { key: "beerCases", label: "Beer Cases (24 × 12 oz)", format: "number" },
      { key: "liquorBottles", label: "Liquor Bottles (750 ml)", format: "number" },
      { key: "champagneBottles", label: "Sparkling Wine for the Toast", format: "number" },
    ],
    instructions: "Enter the guest count, share who drink, reception length, bar style and prices from your store (many stores take back unopened bottles — ask). Adjust if your crowd leans toward beer or wine.",
    examples: "Example: 120 guests (75% drinking) at a 5-hour full-bar reception need about 540 drinks: 54 bottles of wine, 7 cases of beer and 7 bottles of liquor, plus 15 bottles for the toast — about $1,380.00.",
    assumptions: "Drinkers have 2 drinks in the first hour and 1 per hour after. Full bar split: 50% wine, 30% beer, 20% liquor (beer & wine: 60/40). A wine bottle pours 5 glasses, a 750 ml liquor bottle about 16 shots, and a sparkling bottle 8 toast pours. Bring extra ice, mixers and water.",
    faq: [
      { question: "How much alcohol do I need for 100 wedding guests?", answer: "For a 5-hour full bar with 75 drinkers, plan on about 45 bottles of wine, 6 cases of beer and 6 bottles of liquor." },
      { question: "Is a champagne toast necessary?", answer: "No — many couples skip it or toast with whatever guests are already drinking to save money." },
    ],
  },
  {
    slug: "wedding-cake-cost-calculator",
    title: "Wedding Cake Cost Calculator",
    description: "Estimate wedding cake cost from guest count and style — buttercream, fondant or luxury — with servings needed, suggested tiers, cutting and delivery fees and cost per guest.",
    metaTitle: "Wedding Cake Cost Calculator — Tiers & Price",
    metaDescription: "Free wedding cake cost calculator. Find servings, suggested tiers and cost by style with cutting and delivery fees and cost per guest.",
    calcInputs: [
      numberField("guests", "Number of Guests", { default: 120, max: 1000 }),
      percentField("eatingPercent", "Guests Who'll Have Cake", { default: 90, max: 100 }),
      dropdown("style", "Cake Style (Price per Slice)", [["Naked / semi-naked ($4)", 4], ["Buttercream ($5)", 5], ["Fondant ($7)", 7], ["Luxury / sugar flowers ($12)", 12]], 5),
      currencyField("cuttingFee", "Venue Cake-Cutting Fee per Slice", { default: 0, max: 10, step: 0.25, required: false }),
      currencyField("deliveryFee", "Delivery & Setup", { default: 100, max: 1000, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Cake Cost", format: "currency", highlight: true },
      { key: "servingsNeeded", label: "Servings Needed", format: "number" },
      { key: "suggestedTiers", label: "Suggested Round Tiers", format: "number" },
      { key: "tierServings", label: "Servings in Those Tiers", format: "number" },
      { key: "costPerGuest", label: "Cost per Guest", format: "currency" },
    ],
    instructions: "Enter your guest count and the share likely to eat cake (often 85–90%), pick a style and add any cake-cutting fee your venue charges and the baker's delivery fee.",
    examples: "Example: 120 guests with 90% eating cake need 108 servings — about 4 tiers — costing around $640.00 in buttercream.",
    assumptions: "Tiers are round, 4 in tall, starting at 6 in and stepping up 2 in (6 in ≈ 12 wedding slices, 8 in ≈ 24, 10 in ≈ 38, 12 in ≈ 56, 14 in ≈ 78). A small display cake plus sheet cakes in the kitchen can cut costs by 30–50%. Typical 2026 prices are $4–$12 per slice.",
    faq: [
      { question: "How much does a wedding cake cost?", answer: "Usually $4–$12 per slice, so about $500–$1,000 for 120 guests with a classic buttercream design." },
      { question: "How many tiers do I need for 150 guests?", answer: "About four round tiers (6, 8, 10 and 12 or 14 in), or three tiers plus a kitchen sheet cake." },
    ],
  },
  {
    slug: "wedding-flower-cost-calculator",
    title: "Wedding Flower Cost Calculator",
    description: "Estimate wedding flowers — bridal and bridesmaid bouquets, boutonnieres, corsages, reception centerpieces and ceremony arrangements — by style, with delivery and setup.",
    metaTitle: "Wedding Flower Cost Calculator — Florist Budget",
    metaDescription: "Free wedding flower cost calculator. Estimate bouquets, boutonnieres, centerpieces and ceremony flowers by style, with setup fees.",
    calcInputs: [
      numberField("guests", "Number of Guests", { default: 120, max: 1000 }),
      numberField("guestsPerTable", "Guests per Table", { default: 8, min: 2, max: 20 }),
      numberField("bridesmaids", "Bridesmaids", { default: 5, max: 20 }),
      numberField("groomsmen", "Groomsmen", { default: 5, max: 20 }),
      numberField("corsages", "Corsages (Mothers, Grandmothers)", { default: 4, max: 20, required: false }),
      numberField("ceremonyArrangements", "Ceremony Arrangements / Arch Pieces", { default: 2, max: 20, required: false }),
      dropdown("style", "Style", [["Simple / seasonal", 0.7], ["Classic", 1], ["Luxe (peonies, garden roses, installations)", 1.8]], 1),
      percentField("setupPercent", "Delivery & Setup", { default: 15, max: 40, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Flower Cost", format: "currency", highlight: true },
      { key: "personalFlowers", label: "Bouquets, Boutonnieres & Corsages", format: "currency" },
      { key: "centerpieceCost", label: "Centerpieces", format: "currency" },
      { key: "centerpieces", label: "Number of Centerpieces", format: "number" },
      { key: "ceremonyFlowers", label: "Ceremony Flowers", format: "currency" },
      { key: "deliverySetup", label: "Delivery & Setup", format: "currency" },
    ],
    instructions: "Enter guests and guests per table (for centerpieces), the wedding party size, corsages and ceremony pieces, then choose the overall style.",
    examples: "Example: 120 guests at tables of 8 with 5 bridesmaids and 5 groomsmen in a classic style cost about $3,869.75, including 15 centerpieces.",
    assumptions: "Classic 2026 prices: bridal bouquet about $250, bridesmaid bouquets $85, boutonnieres $25 (including the groom), corsages $35, centerpieces $120 and ceremony arrangements $300. Seasonal and local flowers cut costs; peonies, garden roses and large installations raise them.",
    faq: [
      { question: "How much do wedding flowers cost?", answer: "Most couples spend about $2,000–$4,000, while luxe designs with installations can exceed $10,000." },
      { question: "How can I save on wedding flowers?", answer: "Use seasonal blooms, repurpose ceremony arrangements at the reception and mix candles or greenery into centerpieces." },
    ],
  },
  {
    slug: "wedding-dress-alterations-cost-calculator",
    title: "Wedding Dress Alterations Cost Calculator",
    description: "Estimate wedding dress alteration costs — hem, taking in the sides, bustle, straps, cups and pressing — with rush fees and a typical price range.",
    metaTitle: "Wedding Dress Alterations Cost Calculator",
    metaDescription: "Free wedding dress alterations cost calculator. Add hem, take-in, bustle, straps, cups and pressing with rush fees and a price range.",
    calcInputs: [
      dropdown("hem", "Hem", [["None", 0], ["Simple hem ($150)", 150], ["Multi-layer or lace hem ($300)", 300]], 150),
      YN("takeIn", "Take In or Let Out the Sides ($150)", 1),
      dropdown("bustle", "Bustle", [["None", 0], ["Simple bustle, 1–3 points ($100)", 100], ["French or complex bustle ($200)", 200]], 100),
      YN("straps", "Add or Adjust Straps / Sleeves ($100)", 0),
      YN("cups", "Add Bra Cups ($40)", 0),
      YN("press", "Steam & Press ($90)", 1),
      currencyField("otherCost", "Other Changes", { default: 0, max: 5000, required: false }),
      percentField("rushPercent", "Rush Fee", { default: 0, max: 100, required: false }),
      REGION(),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Alterations Cost", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "rushFee", label: "Rush Fee", format: "currency" },
    ],
    instructions: "Choose the alterations you expect to need — your seamstress will confirm at the first fitting. Add a rush fee if your wedding is less than about 8 weeks away.",
    examples: "Example: a simple hem, taking in the sides, a simple bustle and pressing cost about $490.00 (range $367.50–$661.50).",
    assumptions: "Typical 2026 US bridal alteration prices; lace, beading and multiple layers raise labor. Plan 2–3 fittings starting 2–3 months before the wedding. Many bridal shops quote a flat package; independent seamstresses often charge less.",
    faq: [
      { question: "How much do wedding dress alterations cost?", answer: "Most brides spend about $300–$800; complex lace or beaded gowns can exceed $1,000." },
      { question: "When should I start wedding dress alterations?", answer: "About 2–3 months before the wedding, with the final fitting 1–2 weeks before." },
    ],
  },
  {
    slug: "wedding-invitation-postage-calculator",
    title: "Wedding Invitation Postage Calculator",
    description: "Work out postage for wedding invitations — weight, square-envelope surcharge, RSVP return stamps and international guests — per invitation and in total.",
    metaTitle: "Wedding Invitation Postage Calculator",
    metaDescription: "Free wedding invitation postage calculator. Find stamps per invitation by weight, square surcharge, RSVP stamps and international mail.",
    calcInputs: [
      numberField("invitations", "Invitations to Mail", { default: 75, min: 1, max: 2000 }),
      numberField("weightOz", "Weight of One Assembled Invitation", { unit: "oz", default: 2, max: 13, step: 0.1 }),
      dropdown("square", "Envelope Shape", [["Standard rectangle", 0], ["Square / rigid / wax seal (non-machinable)", 1]], 0),
      YN("rsvpStamp", "Stamp the RSVP Return Envelope", 1),
      numberField("internationalCount", "International Invitations", { default: 0, max: 500, required: false }),
      currencyField("firstOunce", "First-Ounce Price (Forever Stamp)", { default: 0.78, max: 5, step: 0.01 }),
      currencyField("additionalOunce", "Additional Ounce Price", { default: 0.29, max: 2, step: 0.01 }),
      currencyField("nonmachinable", "Non-Machinable Surcharge", { default: 0.49, max: 2, step: 0.01 }),
      currencyField("internationalPrice", "International Postage Each", { default: 1.7, max: 20, step: 0.05, required: false }),
    ],
    calcResult: { label: "Total Postage", format: "currency" },
    calcResults: [
      { key: "totalPostage", label: "Total Postage", format: "currency", highlight: true },
      { key: "postagePerInvitation", label: "Postage per Invitation", format: "currency" },
      { key: "rsvpPostageTotal", label: "RSVP Return Postage", format: "currency" },
      { key: "foreverStampsPerInvitation", label: "Forever Stamps per Invitation (Rounded Up)", format: "number" },
      { key: "costPerGuestHousehold", label: "Postage per Household", format: "currency" },
    ],
    instructions: "Weigh one fully assembled invitation (with all cards and inner envelope) at the post office, choose the envelope shape and whether you'll stamp RSVP cards. Update prices if USPS changes rates.",
    examples: "Example: 75 two-ounce invitations in standard envelopes cost $1.07 each to mail; with stamped RSVP cards, total postage is about $138.75.",
    assumptions: "2026 US letter prices: $0.78 for the first ounce and $0.29 each extra (up to 3.5 oz), plus about $0.49 for square, rigid or lumpy (wax seal) envelopes. Invitations over 3.5 oz mail as large envelopes at higher prices. International letters cost about $1.70.",
    faq: [
      { question: "How many stamps do I need for a wedding invitation?", answer: "Most 1 oz invitations need one Forever stamp; heavier ones need an additional-ounce stamp, and square ones a surcharge." },
      { question: "Should I hand-cancel wedding invitations?", answer: "Asking the post office to hand-cancel helps prevent machine damage, especially for wax seals and thick invitations." },
    ],
  },
  {
    slug: "honeymoon-budget-calculator",
    title: "Honeymoon Budget Calculator",
    description: "Plan your honeymoon budget — flights, hotel, food, activities, local transport, extras and travel insurance — with total cost and cost per day.",
    metaTitle: "Honeymoon Budget Calculator — Trip Cost Planner",
    metaDescription: "Free honeymoon budget calculator. Add up flights, hotel, food, activities, transport and insurance for your total and per-day cost.",
    calcInputs: [
      numberField("nights", "Nights", { default: 7, max: 60 }),
      numberField("travelers", "Travelers", { default: 2, min: 1, max: 6 }),
      currencyField("flightPerPerson", "Round-Trip Flight per Person", { default: 900, max: 20000 }),
      currencyField("hotelPerNight", "Hotel per Night", { default: 300, max: 10000 }),
      currencyField("foodPerPersonDay", "Food & Drinks per Person per Day", { default: 90, max: 2000 }),
      currencyField("activitiesPerDay", "Activities & Excursions per Day (Couple)", { default: 100, max: 5000 }),
      currencyField("transportPerDay", "Local Transport per Day", { default: 40, max: 1000, required: false }),
      currencyField("extras", "Extras (Spa, Souvenirs, Upgrades)", { default: 500, max: 50000, required: false }),
      percentField("insurancePercent", "Travel Insurance (% of Trip)", { default: 5, max: 12, required: false }),
    ],
    calcResult: { label: "Total Budget", format: "currency" },
    calcResults: [
      { key: "totalBudget", label: "Total Honeymoon Budget", format: "currency", highlight: true },
      { key: "flights", label: "Flights", format: "currency" },
      { key: "lodging", label: "Lodging", format: "currency" },
      { key: "foodActivitiesTransport", label: "Food, Activities & Transport", format: "currency" },
      { key: "travelInsurance", label: "Travel Insurance", format: "currency" },
      { key: "costPerDay", label: "Cost per Day", format: "currency" },
    ],
    instructions: "Enter trip length, flight and hotel prices from your searches, and daily spending. For all-inclusive resorts, enter the nightly rate in Hotel and set food to a small amount for extras.",
    examples: "Example: a 7-night honeymoon with $900 flights each and a $300 hotel costs about $7,308.00 — $913.50 per day.",
    assumptions: "Food, activities and transport are counted for nights + 1 days. Travel insurance usually costs 4–8% of prepaid, nonrefundable trip costs. Ask hotels about honeymoon perks, and consider a honeymoon fund on your registry.",
    faq: [
      { question: "How much does a honeymoon cost?", answer: "US couples commonly spend about $5,000–$7,000 for a week, with luxury and far-away trips costing $10,000+." },
      { question: "How can we save on our honeymoon?", answer: "Travel in shoulder season, use credit card points, book all-inclusives with free honeymoon perks or add a honeymoon fund to your registry." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
