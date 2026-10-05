// One-time (but safe to re-run) batch setup script: creates the Celebration & Event tools
// (5) of the Budget Calculators expansion, filed under Budget Calculators >
// Life Events & Travel Budget Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-celebrations.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-celebrations-calculators.ts
// or
//   npm run db:create-budget-celebrations-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Budget Calculators", slug: "budget-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Life Events & Travel Budget Calculators", slug: "life-events-travel-budget-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function currencyField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 100000000,
    step: opts.step ?? 100,
  };
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
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for planning purposes only and isn't financial advice. Your actual " +
  "costs depend on where you live, your prices and your choices — adjust the inputs to your situation.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "wedding-guest-budget-calculator",
    title: "Wedding Guest Budget Calculator",
    description: "Add up what it costs to attend a wedding — travel, hotel, attire, gift and pre-wedding events — and how much to save each month beforehand.",
    metaTitle: "Wedding Guest Budget Calculator — Cost to Attend",
    metaDescription: "Free wedding guest budget calculator. Total travel, lodging, attire, gift and shower costs and see what to save each month.",
    calcInputs: [
      currencyField("travel", "Travel (Flights, Gas)", { default: 400, max: 100000, step: 10 }),
      currencyField("lodgingPerNight", "Hotel per Night", { default: 180, max: 10000, step: 5 }),
      numberField("nights", "Nights", { default: 2, min: 0, max: 30, step: 1 }),
      numberField("sharingWith", "People Sharing the Room", { default: 1, min: 1, max: 10, step: 1 }),
      currencyField("attire", "Attire, Hair & Makeup", { default: 200, max: 100000, step: 10, required: false }),
      currencyField("gift", "Gift", { default: 150, max: 100000, step: 10 }),
      currencyField("preEvents", "Shower, Bachelor(ette) & Other Events", { default: 150, max: 100000, step: 10, required: false }),
      numberField("monthsToSave", "Months Until the Wedding", { default: 4, min: 1, max: 24, step: 1 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "lodgingShare", label: "Your Lodging Share", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "monthlySavingsNeeded", label: "Save per Month", format: "currency" },
    ],
    instructions:
      "Being a wedding guest — especially at a destination wedding or as part of the wedding party — can cost well over " +
      "$1,000. Enter your expected costs; sharing a room or carpooling lowers them quickly.\n\n" +
      "For a bachelor or bachelorette trip, use that calculator and enter the result here as a pre-wedding event.",
    examples:
      "Example: $400 of travel, a $360 hotel share, $200 for attire, a $150 gift and $150 for other " +
      "events come to $1,260 — about $315 a month over 4 months.",
    assumptions:
      "Costs as entered. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much should a wedding gift be?",
        answer: "Common guidance is roughly $75–$150 for a friend or coworker and more for close family — but give what fits your budget, especially if travel is expensive.",
      },
    ],
  },
  {
    slug: "holiday-gift-budget-calculator",
    title: "Holiday Gift Budget Calculator",
    description: "Plan holiday gift spending by group — family, kids, friends and others — plus food and decorations, and how much to save each month ahead of the season.",
    metaTitle: "Holiday Gift Budget Calculator — Christmas Spending",
    metaDescription: "Free holiday gift budget calculator. Plan gifts for family, kids and friends plus food and decor, and the monthly savings needed.",
    calcInputs: [
      numberField("familyCount", "Adult Family Members", { default: 6, min: 0, max: 100, step: 1 }),
      currencyField("familyAmount", "Per Family Member", { default: 75, max: 10000, step: 5 }),
      numberField("kidsCount", "Children", { default: 3, min: 0, max: 100, step: 1 }),
      currencyField("kidsAmount", "Per Child", { default: 60, max: 10000, step: 5 }),
      numberField("friendsCount", "Friends", { default: 5, min: 0, max: 100, step: 1 }),
      currencyField("friendsAmount", "Per Friend", { default: 30, max: 10000, step: 5 }),
      numberField("otherCount", "Coworkers, Teachers & Others", { default: 4, min: 0, max: 100, step: 1 }),
      currencyField("otherAmount", "Per Other Recipient", { default: 15, max: 10000, step: 5 }),
      currencyField("extras", "Food, Decorations, Cards & Wrapping", { default: 300, max: 100000, step: 10, required: false }),
      numberField("monthsToSave", "Months to Save", { default: 6, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Total Holiday Budget", format: "currency" },
    calcResults: [
      { key: "recipients", label: "Recipients", format: "number" },
      { key: "giftsTotal", label: "Gifts", format: "currency" },
      { key: "totalHolidayBudget", label: "Total Holiday Budget", format: "currency", highlight: true },
      { key: "monthlySavingsNeeded", label: "Save per Month", format: "currency" },
    ],
    instructions:
      "Holiday spending often lands on credit cards in December. Setting a per-person amount for each group and saving a " +
      "little each month beforehand (a holiday sinking fund) keeps it in check. Gift exchanges and homemade gifts cut the " +
      "list.\n\n" +
      "Enter the number of people and amount for each group.",
    examples:
      "Example: gifts for 18 people total $840; with $300 for food and decorations the holiday budget is " +
      "$1,140. Saving $190 a month for 6 months covers it.",
    assumptions:
      "Travel to see family isn't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much do people spend on the holidays?",
        answer: "National surveys put typical US holiday spending around $900–$1,000 per person on gifts, food and decorations.",
      },
    ],
  },
  {
    slug: "birthday-party-budget-calculator",
    title: "Birthday Party Budget Calculator",
    description: "Budget a birthday, graduation party, baby shower or housewarming: food and favors per guest plus venue, cake, decorations and entertainment.",
    metaTitle: "Party Budget Calculator — Birthday, Graduation & Shower",
    metaDescription: "Free party budget calculator for birthdays, graduation parties, baby showers and housewarmings — total cost and cost per guest.",
    calcInputs: [
      numberField("guests", "Guests", { default: 20, min: 0, max: 1000, step: 1 }),
      currencyField("foodPerGuest", "Food & Drinks per Guest", { default: 12, max: 1000, step: 1 }),
      currencyField("venue", "Venue", { default: 200, max: 100000, step: 10, required: false }),
      currencyField("cake", "Cake or Dessert", { default: 60, max: 10000, step: 5, required: false }),
      currencyField("decorations", "Decorations & Invitations", { default: 50, max: 10000, step: 5, required: false }),
      currencyField("entertainment", "Entertainment or Activities", { default: 150, max: 100000, step: 10, required: false }),
      currencyField("favorsPerGuest", "Favors per Guest", { default: 5, max: 1000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Party Cost", format: "currency" },
    calcResults: [
      { key: "foodAndFavors", label: "Food & Favors", format: "currency" },
      { key: "totalCost", label: "Total Party Cost", format: "currency", highlight: true },
      { key: "costPerGuest", label: "Cost per Guest", format: "currency" },
    ],
    instructions:
      "Party costs scale with the guest list, so start there. This works for birthdays, graduation parties, baby showers " +
      "and housewarmings — leave out what you don't need (venue for a party at home, favors for adults).\n\n" +
      "Potlucks, hosting at a park or home, and making your own dessert cut costs most.",
    examples:
      "Example: 20 guests at $12 for food plus $5 favors, with $200 for the venue, " +
      "$150 of entertainment, cake and decorations, come to $800 — $40 per guest.",
    assumptions:
      "Costs as entered. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I keep a party affordable?",
        answer: "Trim the guest list, host at home or a free public space, serve one main dish, and skip favors — guests rarely miss them.",
      },
    ],
  },
  {
    slug: "bachelor-bachelorette-party-budget-calculator",
    title: "Bachelor or Bachelorette Party Budget Calculator",
    description: "Plan a bachelor or bachelorette party: total trip cost and what each attendee pays, including their share of covering the guest of honor.",
    metaTitle: "Bachelor & Bachelorette Party Budget Calculator",
    metaDescription: "Free bachelor or bachelorette party calculator. See the total trip cost and each attendee's share, including covering the guest of honor.",
    calcInputs: [
      numberField("attendees", "Attendees (Not Counting the Honoree)", { default: 8, min: 1, max: 100, step: 1 }),
      currencyField("lodgingTotal", "Lodging (Total)", { default: 1600, max: 1000000, step: 50 }),
      numberField("days", "Days", { default: 2, min: 0, max: 14, step: 1 }),
      currencyField("foodPerPersonPerDay", "Food & Drinks per Person per Day", { default: 80, max: 10000, step: 5 }),
      currencyField("activitiesPerPerson", "Activities per Person", { default: 200, max: 10000, step: 10 }),
      currencyField("travelPerPerson", "Travel per Person", { default: 300, max: 10000, step: 10, required: false }),
      {
        key: "coverHonoree", label: "Attendees Cover the Honoree?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Split the Honoree's Share", value: 1 },
          { label: "No — Honoree Pays Their Own Way", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Cost per Attendee", format: "currency" },
    calcResults: [
      { key: "totalTripCost", label: "Total Trip Cost", format: "currency" },
      { key: "honoreeShareOfCosts", label: "Honoree's Share of Costs", format: "currency" },
      { key: "costPerAttendee", label: "Cost per Attendee", format: "currency", highlight: true },
      { key: "extraEachForHonoree", label: "Extra Each to Cover the Honoree", format: "currency" },
    ],
    instructions:
      "Attendees usually split the guest of honor's lodging, food and activities. Agree on a budget early so no one is " +
      "priced out, and collect deposits for big bookings.\n\n" +
      "Travel is paid by each person; the honoree's travel is usually their own. For splitting receipts during the trip, " +
      "use the group trip expense split calculator.",
    examples:
      "Example: 8 attendees sharing $1,600 of lodging for 2 days, plus food, activities and travel, spend " +
      "$7,540 in total. Covering the honoree adds $67.22 each, for $905 per attendee.",
    assumptions:
      "Food and activities are the same for everyone. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it okay to decline an expensive bachelor(ette) party?",
        answer: "Yes. Tell the organizer early and kindly; many groups offer a cheaper option such as joining for one day.",
      },
    ],
  },
  {
    slug: "funeral-cost-budget-calculator",
    title: "Funeral Cost Budget Calculator",
    description: "Estimate funeral and end-of-life costs — services, casket or urn, burial plot or niche, headstone and final expenses — and any shortfall versus money set aside.",
    metaTitle: "Funeral Cost Calculator — Burial, Cremation & Final Expenses",
    metaDescription: "Free funeral cost calculator. Estimate service, casket, burial and headstone costs plus final expenses, and any shortfall to plan for.",
    calcInputs: [
      currencyField("serviceFees", "Funeral Home Services & Ceremony", { default: 4500, max: 1000000, step: 100 }),
      currencyField("casketOrUrn", "Casket or Urn", { default: 2500, max: 1000000, step: 100, required: false }),
      currencyField("burialOrNiche", "Burial Plot, Vault & Opening, or Niche", { default: 3500, max: 1000000, step: 100, required: false }),
      currencyField("marker", "Headstone or Marker", { default: 1800, max: 1000000, step: 100, required: false }),
      currencyField("otherCosts", "Flowers, Obituary, Reception", { default: 1200, max: 1000000, step: 50, required: false }),
      currencyField("finalExpenses", "Other Final Expenses (Medical Bills, Legal)", { default: 3000, max: 10000000, step: 100, required: false }),
      currencyField("moneyAvailable", "Life Insurance or Savings Set Aside", { default: 10000, max: 100000000, step: 500, required: false }),
    ],
    calcResult: { label: "Total End-of-Life Cost", format: "currency" },
    calcResults: [
      { key: "funeralCost", label: "Funeral Cost", format: "currency" },
      { key: "totalEndOfLifeCost", label: "Total End-of-Life Cost", format: "currency", highlight: true },
      { key: "shortfall", label: "Shortfall to Plan For", format: "currency" },
      { key: "surplus", label: "Left Over", format: "currency" },
    ],
    instructions:
      "A traditional US funeral with burial often costs $10,000–$15,000 once the cemetery is included; direct cremation can " +
      "cost a few thousand dollars. The FTC Funeral Rule requires funeral homes to give you an itemized price list, and you " +
      "can buy a casket or urn elsewhere.\n\n" +
      "For cremation, set the burial field to a niche or scattering cost (or 0). Planning ahead — and telling family your " +
      "wishes — eases the burden.",
    examples:
      "Example: $4,500 of services, a $2,500 casket, $3,500 for burial, a $1,800 headstone and " +
      "$1,200 of other costs total $13,500. With $3,000 of final expenses, end-of-life costs reach " +
      "$16,500 — $6,500 more than the $10,000 set aside.",
    assumptions:
      "Costs as entered; prices vary a lot by region and provider. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does Social Security help with funeral costs?",
        answer: "It pays a one-time $255 death benefit to a surviving spouse or eligible child. Veterans may qualify for burial benefits.",
      },
    ],
  },
];

// Budget Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
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
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
