// One-time (but safe to re-run) batch setup script: creates 18 US state
// Estate/Inheritance/Gift Tax Tools inside the existing "Tax & Paycheck
// Calculators" category — the first batch of the 50-state audit (see
// state_tax_audit.xlsx, delivered 27 Sep 2026, and this repo's calc-engine.ts
// header for the full batch roadmap).
//
// See src/lib/calc-engine-us-estate-inheritance-gift.ts for the actual math
// and — IMPORTANT — that file's header for the disclosed "graduatedEstimate"
// approximation used for every state whose published rate schedule has more
// bracket edges than the audit could independently confirm.
//
// HOW TO RUN
//   npx tsx prisma/create-us-estate-inheritance-gift-calculators.ts
// or
//   npm run db:create-us-estate-inheritance-gift-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

// ---------------------------------------------------------------------------
// Shared field building blocks
// ---------------------------------------------------------------------------

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
    max: opts.max ?? 30_000_000,
    step: opts.step ?? 10_000,
  };
}

function dropdownField(key: string, label: string, options: { label: string; value: number }[], defaultValue = 0) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}

function currencyResult(key: string, label: string, opts: { highlight?: boolean; unit?: string } = {}) {
  return { key, label, format: "currency", unit: opts.unit, highlight: opts.highlight };
}
function percentResult(key: string, label: string) {
  return { key, label, format: "percentage" };
}

const GRADUATED_ESTIMATE_NOTE =
  "This state publishes a graduated rate schedule with more bracket edges than could be independently " +
  "reconfirmed against a live, primary source for this calculator. Rather than guess at exact bracket " +
  "boundaries, this tool models the marginal rate as rising smoothly from the published low rate to the " +
  "published top rate as the taxable amount grows, which matches the two confirmed endpoints exactly and " +
  "closely approximates the true liability in between — the same disclosed-approximation approach this site " +
  "uses for Alabama's stepped standard deduction. For an amount close to a real bracket edge, verify the " +
  "exact figure with the state's own Department of Revenue before relying on it.";

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. Estate, inheritance, and gift tax law changes frequently and depends heavily on your specific " +
  "situation — consult a qualified estate attorney or tax professional, or the state's own Department of " +
  "Revenue, before making any decisions.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const inheritanceAmountField = currencyField("inheritanceAmount", "Inheritance Amount Received", { max: 20_000_000 });
const grossEstateField = currencyField("grossEstate", "Gross Taxable Estate Value", { max: 30_000_000 });

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: ToolDef[] = [
  // --- Gift Tax ---
  {
    slug: "connecticut-gift-tax-calculator",
    title: "Connecticut Gift Tax Calculator",
    description:
      "Connecticut is the only US state with its own gift tax. Estimate the tax owed on taxable gifts made " +
      "this year, using Connecticut's $15 million lifetime exemption shared with its estate tax.",
    metaTitle: "Connecticut Gift Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Connecticut gift tax calculator. Connecticut is the only US state with a standalone gift tax — " +
      "estimate what you owe using its $15M unified lifetime exemption.",
    calcInputs: [
      currencyField("giftsThisYear", "Taxable Gifts Made This Year", { max: 20_000_000 }),
      currencyField("priorTaxableGifts", "Prior Taxable Gifts (Lifetime Total)", { required: false, default: 0, max: 20_000_000 }),
    ],
    calcResults: [
      currencyResult("cumulativeLifetimeGifts", "Cumulative Lifetime Taxable Gifts"),
      currencyResult("newlyTaxableAmount", "Newly Taxable Amount This Year"),
      currencyResult("giftTaxOwed", "Connecticut Gift Tax Owed", { highlight: true }),
      currencyResult("remainingLifetimeExemption", "Remaining Lifetime Exemption"),
    ],
    instructions:
      "Connecticut is the only US state that levies its own gift tax — every other state relies solely on the " +
      "federal gift tax. Connecticut's gift tax shares a single $15 million lifetime exemption with its estate " +
      "tax: every dollar of taxable gifts you make during your life uses up part of that exemption, and " +
      "whatever's left over is what your estate can use tax-free when you die.\n\n" +
      "Enter the taxable gifts you're making this year and, if you've made taxable gifts in prior years, the " +
      "cumulative total of those. This calculator adds them together, works out how much of the $15 million " +
      "exemption is left after this year's gifts, and applies Connecticut's flat 12% rate to whatever exceeds " +
      "it.\n\n" +
      "\"Taxable gifts\" generally excludes gifts covered by the annual federal gift tax exclusion " +
      "(currently $19,000 per recipient per year) and gifts to a spouse or qualified charity — only include the " +
      "amount that would count as a taxable gift on a federal gift tax return.",
    assumptions:
      "This calculator uses Connecticut's current $15,000,000 unified lifetime exemption and flat 12% rate " +
      "above it. It assumes every dollar you enter is already a \"taxable gift\" in the federal gift-tax sense " +
      "(i.e., you've already excluded annual exclusions and spousal/charitable gifts) — it doesn't calculate " +
      "that exclusion for you.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: someone with no prior taxable gifts makes a $20,000,000 taxable gift this year. The first " +
      "$15,000,000 is covered by the lifetime exemption; the remaining $5,000,000 is taxed at Connecticut's " +
      "flat 12% rate, for a gift tax owed of $600,000 — and the full $15,000,000 exemption is now used up, " +
      "leaving nothing for a future gift or for the estate tax at death.",
    faq: [
      {
        question: "Is Connecticut really the only state with a gift tax?",
        answer:
          "Yes. Every other US state relies solely on the federal gift tax (which has its own, much larger, " +
          "unified exemption). Connecticut is the sole exception.",
      },
      {
        question: "How does this relate to Connecticut's estate tax?",
        answer:
          "They share one $15 million lifetime exemption. Taxable gifts made during your life use up part of " +
          "that exemption, so any exemption you use through lifetime gifts isn't available to your estate when " +
          "you die — see our Connecticut Estate Tax Calculator, which nets out gift tax already paid.",
      },
      {
        question: "What rate does Connecticut charge on gifts above the exemption?",
        answer: "A flat 12% — Connecticut's gift and estate tax both use this same single flat rate.",
      },
    ],
  },

  // --- Inheritance Tax ---
  {
    slug: "kentucky-inheritance-tax-calculator",
    title: "Kentucky Inheritance Tax Calculator",
    description:
      "Estimate Kentucky inheritance tax owed. Close family (Class A) is fully exempt; other beneficiaries " +
      "(Class B/C) owe a graduated 4%–16% after a $1,000 exemption.",
    metaTitle: "Kentucky Inheritance Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Kentucky inheritance tax calculator. Class A relatives are exempt; estimate the graduated 4%-16% " +
      "tax owed by other beneficiaries.",
    calcInputs: [
      inheritanceAmountField,
      dropdownField("beneficiaryClass", "Your Relationship to the Deceased", [
        { label: "Class A — Spouse, Parent, Child, Grandchild (exempt)", value: 0 },
        { label: "Class B/C — Sibling, Niece/Nephew, Friend, or other (taxable)", value: 1 },
      ]),
    ],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableAmount", "Taxable Amount"),
      currencyResult("estimatedTax", "Estimated Kentucky Inheritance Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Kentucky is one of only a handful of states that still taxes inheritances (separately from the estate " +
      "itself). How much you owe depends entirely on your relationship to the person who died: Class A " +
      "beneficiaries — a spouse, parent, child, or grandchild — pay nothing at all. Everyone else (Class B and " +
      "C, which covers siblings, nieces and nephews, friends, and unrelated beneficiaries) owes a graduated tax " +
      "after a small $1,000 exemption.\n\n" +
      "Enter what you're inheriting and select your relationship to the deceased to see your exemption, taxable " +
      "amount, and estimated tax.",
    assumptions:
      "This calculator uses Kentucky's $1,000 Class B/C exemption and its published 4%-16% graduated rate " +
      "range. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a niece inherits $50,000 from her uncle. As a Class B/C beneficiary, the first $1,000 is " +
      "exempt, leaving $49,000 taxable at Kentucky's graduated rate — an estimated tax of a little over $2,000, " +
      "an effective rate under 5% because most of the taxable amount falls near the low end of the schedule.",
    faq: [
      {
        question: "Who is exempt from Kentucky inheritance tax?",
        answer:
          "Class A beneficiaries: a surviving spouse, parents, children (including adopted children), and " +
          "grandchildren all owe nothing.",
      },
      {
        question: "What's the Kentucky inheritance tax rate for everyone else?",
        answer:
          "Class B and C beneficiaries (siblings, nieces/nephews, friends, and unrelated heirs) owe a graduated " +
          "rate from 4% up to 16%, after a $1,000 exemption.",
      },
      {
        question: "Is this the same as Kentucky's estate tax?",
        answer:
          "Kentucky doesn't have a separate estate tax — inheritance tax is the only state-level death tax it " +
          "levies, and it's based on who receives the property, not the total size of the estate.",
      },
    ],
  },
  {
    slug: "maryland-inheritance-tax-calculator",
    title: "Maryland Inheritance Tax Calculator",
    description:
      "Estimate Maryland inheritance tax. Close family is exempt; other beneficiaries owe a flat 10% after a " +
      "$1,000 exemption. Maryland is the only state with both an inheritance tax and an estate tax.",
    metaTitle: "Maryland Inheritance Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Maryland inheritance tax calculator. Exempt relationships pay nothing; other beneficiaries owe a " +
      "flat 10% after a $1,000 exemption.",
    calcInputs: [
      inheritanceAmountField,
      dropdownField("beneficiaryClass", "Your Relationship to the Deceased", [
        { label: "Exempt relationship — spouse, child, parent, grandparent, sibling, etc.", value: 0 },
        { label: "Non-exempt — other relatives, friends, unrelated", value: 1 },
      ]),
    ],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableAmount", "Taxable Amount"),
      currencyResult("estimatedTax", "Estimated Maryland Inheritance Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Maryland is the only US state that levies both an inheritance tax and a separate estate tax. Its " +
      "inheritance tax is simpler than most: close family (spouses, children, parents, grandparents, siblings, " +
      "and a few other close relationships) is fully exempt, and everyone else pays a flat 10% after a small " +
      "$1,000 exemption — there's no graduated schedule to worry about.\n\n" +
      "Enter what you're inheriting and whether your relationship to the deceased is one of Maryland's exempt " +
      "categories.",
    assumptions:
      "This calculator uses Maryland's $1,000 exemption and flat 10% rate for non-exempt beneficiaries. It " +
      "covers inheritance tax only — if the estate itself is large, Maryland's separate estate tax may also " +
      "apply; see our Maryland Estate Tax Calculator.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a close friend (a non-exempt relationship) inherits $25,000. After the $1,000 exemption, " +
      "$24,000 is taxable at a flat 10%, for an estimated Maryland inheritance tax of $2,400.",
    faq: [
      {
        question: "Who is exempt from Maryland inheritance tax?",
        answer:
          "A surviving spouse, children, parents, grandparents, siblings, and a few other close relationships " +
          "are exempt. Everyone else owes the tax.",
      },
      {
        question: "What's the Maryland inheritance tax rate?",
        answer: "A flat 10% on the taxable amount, after a $1,000 exemption — Maryland doesn't use brackets here.",
      },
      {
        question: "Does Maryland also have an estate tax?",
        answer:
          "Yes — Maryland is the only US state with both. Its separate estate tax applies to large estates " +
          "regardless of who inherits; see our Maryland Estate Tax Calculator for that.",
      },
    ],
  },
  {
    slug: "nebraska-inheritance-tax-calculator",
    title: "Nebraska Inheritance Tax Calculator",
    description:
      "Estimate Nebraska's county-collected inheritance tax: spouses are exempt, close relatives owe 1% above " +
      "$100,000, remote relatives owe 11% above $40,000, and others owe 15% above $25,000.",
    metaTitle: "Nebraska Inheritance Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Nebraska inheritance tax calculator. Rates and exemptions vary by how closely you were related to " +
      "the deceased — spouses are exempt.",
    calcInputs: [
      inheritanceAmountField,
      dropdownField("relationship", "Your Relationship to the Deceased", [
        { label: "Spouse (exempt)", value: 0 },
        { label: "Close relative — parent, grandparent, sibling, child", value: 1 },
        { label: "Remote relative — aunt/uncle, niece/nephew", value: 2 },
        { label: "Other / unrelated", value: 3 },
      ]),
    ],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableAmount", "Taxable Amount"),
      currencyResult("estimatedTax", "Estimated Nebraska Inheritance Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Nebraska's inheritance tax is administered by the county, not the state, but the rates and exemptions " +
      "are set uniformly. A surviving spouse is fully exempt. Close relatives (parents, grandparents, siblings, " +
      "and children) owe 1% above a $100,000 exemption. Remote relatives (aunts, uncles, nieces, and nephews) " +
      "owe 11% above a $40,000 exemption. Everyone else owes 15% above a $25,000 exemption.\n\n" +
      "Enter what you're inheriting and select your relationship to the deceased.",
    assumptions:
      "This calculator uses Nebraska's published exemptions and flat rates per relationship tier — unlike some " +
      "states, Nebraska's rate is flat within each tier rather than graduated, so no bracket-edge approximation " +
      "is needed here.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a sibling (a close relative) inherits $250,000. After the $100,000 exemption, $150,000 is " +
      "taxable at 1%, for an estimated Nebraska inheritance tax of $1,500.",
    faq: [
      {
        question: "Is Nebraska inheritance tax paid to the state or the county?",
        answer: "The county where the deceased lived collects it, though the rates and exemptions are set statewide.",
      },
      {
        question: "Are spouses exempt from Nebraska inheritance tax?",
        answer: "Yes, a surviving spouse owes nothing regardless of the amount inherited.",
      },
      {
        question: "What's the rate for a niece or nephew?",
        answer: "Nieces and nephews are \"remote relatives\" under Nebraska law: 11% above a $40,000 exemption.",
      },
    ],
  },
  {
    slug: "new-jersey-inheritance-tax-calculator",
    title: "New Jersey Inheritance Tax Calculator",
    description:
      "Estimate New Jersey inheritance tax. Close family and charities are exempt; siblings (Class C) get a " +
      "$25,000 exemption then 11%-16%, while unrelated beneficiaries (Class D) owe 15%-16% with no exemption.",
    metaTitle: "New Jersey Inheritance Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free New Jersey inheritance tax calculator. Class A/E relationships are exempt; estimate the Class C or " +
      "Class D tax owed by other beneficiaries.",
    calcInputs: [
      inheritanceAmountField,
      dropdownField("beneficiaryClass", "Your Relationship to the Deceased", [
        { label: "Class A/E — Spouse, Parent, Child, Grandchild, Charity/Government (exempt)", value: 0 },
        { label: "Class C — Sibling, or Child's Spouse", value: 1 },
        { label: "Class D — Other (friend, distant relative, unrelated)", value: 2 },
      ]),
    ],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableAmount", "Taxable Amount"),
      currencyResult("estimatedTax", "Estimated New Jersey Inheritance Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "New Jersey groups beneficiaries into classes. Class A (spouse, parent, child, grandchild) and Class E " +
      "(charities and government) owe nothing. Class C (siblings and a child's spouse) get a $25,000 exemption, " +
      "then a graduated 11%-16%. Class D (everyone else — friends, distant relatives, unrelated beneficiaries) " +
      "gets no exemption at all, and owes a graduated 15%-16%.\n\n" +
      "Enter what you're inheriting and select your relationship class to see your estimated tax.",
    assumptions:
      "This calculator uses New Jersey's published exemptions and rate ranges per class. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a sibling (Class C) inherits $100,000. After the $25,000 exemption, $75,000 is taxable, mostly " +
      "at New Jersey's 11% starting rate since it's well below the upper bracket — an estimated tax a little " +
      "over $8,000.",
    faq: [
      {
        question: "Who is exempt from New Jersey inheritance tax?",
        answer:
          "Class A (spouse, parent, child, grandchild, and a few other lineal relationships) and Class E " +
          "(charities, religious institutions, and government) owe nothing.",
      },
      {
        question: "What's the rate for a sibling?",
        answer: "Siblings are Class C: a $25,000 exemption, then a graduated 11% to 16%.",
      },
      {
        question: "What's the rate for a friend with no exemption?",
        answer: "Friends and other unrelated beneficiaries are Class D: no exemption at all, and a graduated 15% to 16%.",
      },
    ],
  },
  {
    slug: "pennsylvania-inheritance-tax-calculator",
    title: "Pennsylvania Inheritance Tax Calculator",
    description:
      "Estimate Pennsylvania inheritance tax: 0% for a spouse or a minor child from a parent, 4.5% for other " +
      "lineal relatives, 12% for siblings, and 15% for everyone else — charities are exempt.",
    metaTitle: "Pennsylvania Inheritance Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Pennsylvania inheritance tax calculator. Flat rates by relationship: 0% spouse, 4.5% lineal " +
      "relatives, 12% siblings, 15% others.",
    calcInputs: [
      inheritanceAmountField,
      dropdownField("beneficiaryClass", "Your Relationship to the Deceased", [
        { label: "Spouse, or a child age 21 or younger from a parent (0%)", value: 0 },
        { label: "Lineal relative — child, grandchild, parent, grandparent (4.5%)", value: 1 },
        { label: "Sibling (12%)", value: 2 },
        { label: "Other / unrelated (15%)", value: 3 },
        { label: "Registered charity (exempt)", value: 4 },
      ]),
    ],
    calcResults: [
      percentResult("rateApplied", "Rate Applied"),
      currencyResult("estimatedTax", "Estimated Pennsylvania Inheritance Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Pennsylvania's inheritance tax has no exemption threshold — instead, a flat rate applies to the entire " +
      "amount, based purely on your relationship to the person who died. A spouse (or a minor child inheriting " +
      "from a parent) pays 0%. Other lineal relatives — children, grandchildren, parents, and grandparents — " +
      "pay 4.5%. Siblings pay 12%. Everyone else pays 15%. Registered charities are exempt.\n\n" +
      "Enter what you're inheriting and select your relationship to see the flat rate that applies and your " +
      "estimated tax.",
    assumptions:
      "This calculator uses Pennsylvania's published flat rates by relationship class. Pennsylvania applies " +
      "these rates to the whole inheritance, without a general exemption amount, so no bracket-edge " +
      "approximation is needed here.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: an adult child inherits $200,000 from a parent. As a lineal relative, the flat 4.5% rate " +
      "applies to the full amount — an estimated Pennsylvania inheritance tax of $9,000.",
    faq: [
      {
        question: "Does Pennsylvania have an exemption amount like other states?",
        answer:
          "No — Pennsylvania applies its flat rate to the entire inheritance regardless of size; the rate " +
          "itself is what depends on your relationship to the deceased.",
      },
      {
        question: "What's the rate for a spouse?",
        answer: "0% — spouses (and a minor child inheriting from a parent) pay no Pennsylvania inheritance tax at all.",
      },
      {
        question: "What's the rate for a sibling versus an unrelated friend?",
        answer: "Siblings pay 12%; unrelated beneficiaries (friends, distant relatives) pay 15%.",
      },
    ],
  },

  // --- Estate Tax ---
  {
    slug: "connecticut-estate-tax-calculator",
    title: "Connecticut Estate Tax Calculator",
    description:
      "Estimate Connecticut estate tax using its $15 million exemption, shared with the state's gift tax, and " +
      "flat 12% rate above it — netting out any Connecticut gift tax already paid during life.",
    metaTitle: "Connecticut Estate Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Connecticut estate tax calculator. Uses the $15M unified exemption shared with Connecticut's gift " +
      "tax and a flat 12% rate above it.",
    calcInputs: [
      grossEstateField,
      currencyField("priorTaxableGifts", "Prior Taxable Gifts Made During Life", { required: false, default: 0, max: 20_000_000 }),
      currencyField("giftTaxAlreadyPaid", "Connecticut Gift Tax Already Paid", { required: false, default: 0, max: 3_000_000 }),
    ],
    calcResults: [
      currencyResult("combinedTaxableAmount", "Combined Estate + Lifetime Taxable Gifts"),
      currencyResult("exemptionUsed", "Exemption Applied"),
      currencyResult("grossEstateAndGiftTax", "Gross Estate & Gift Tax (combined)"),
      currencyResult("giftTaxAlreadyPaid", "Less: Gift Tax Already Paid"),
      currencyResult("estateTaxDue", "Connecticut Estate Tax Due", { highlight: true }),
    ],
    instructions:
      "Connecticut's estate tax shares a single $15 million lifetime exemption with its gift tax — think of it " +
      "as one combined \"unified\" exemption, the same idea the federal estate/gift tax uses. Any taxable gifts " +
      "made during life use up part of the exemption, so this calculator adds your gross estate to your prior " +
      "taxable gifts, works out the combined tax at Connecticut's flat 12% rate, and then subtracts any " +
      "Connecticut gift tax you already paid on those lifetime gifts — leaving the estate tax actually due at " +
      "death.\n\n" +
      "Enter your gross taxable estate, any prior taxable gifts made during life (leave at $0 if none), and any " +
      "Connecticut gift tax already paid on those gifts (also $0 if none).",
    assumptions:
      "This calculator uses Connecticut's current $15,000,000 unified exemption and flat 12% rate. It assumes " +
      "the amounts you enter for prior gifts and gift tax paid are accurate and complete — this tool doesn't " +
      "independently verify them.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: someone dies with a $20,000,000 estate and made no taxable gifts during life. The $15,000,000 " +
      "exemption covers the first $15,000,000; the remaining $5,000,000 is taxed at 12%, for an estimated " +
      "Connecticut estate tax of $600,000.",
    faq: [
      {
        question: "Why does this calculator ask about gifts, not just the estate?",
        answer:
          "Because Connecticut's estate and gift tax share one $15 million lifetime exemption — any exemption " +
          "used on lifetime gifts isn't available at death, so the two need to be combined for an accurate " +
          "figure.",
      },
      {
        question: "What's Connecticut's estate tax rate?",
        answer: "A flat 12% on the combined amount above the $15 million exemption — there's no graduated schedule.",
      },
      {
        question: "Is Connecticut's exemption indexed for inflation?",
        answer:
          "The $15 million figure is Connecticut's current exemption level; check the Connecticut Department " +
          "of Revenue Services for the latest figure before relying on this for estate planning.",
      },
    ],
  },
  {
    slug: "hawaii-estate-tax-calculator",
    title: "Hawaii Estate Tax Calculator",
    description:
      "Estimate Hawaii estate tax using its $5.49 million exemption and graduated 10%-20% rate schedule above it.",
    metaTitle: "Hawaii Estate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Hawaii estate tax calculator. Estimate tax owed above the $5.49M exemption at a graduated 10%-20% rate.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableEstate", "Taxable Estate"),
      currencyResult("estateTaxDue", "Estimated Hawaii Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Hawaii exempts the first $5.49 million of a taxable estate, then applies a graduated rate from 10% up " +
      "to 20% on the amount above that. Enter your gross taxable estate to see the exemption applied, the " +
      "taxable portion, and the estimated tax.",
    assumptions:
      "This calculator uses Hawaii's $5,490,000 exemption and published 10%-20% rate range. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $7,000,000 taxable estate. After the $5,490,000 exemption, $1,510,000 is taxable, mostly " +
      "near Hawaii's 10% starting rate — an estimated tax in the neighborhood of $170,000.",
    faq: [
      { question: "What is Hawaii's estate tax exemption?", answer: "$5.49 million per person." },
      { question: "What's the top Hawaii estate tax rate?", answer: "20%, reached on very large estates." },
    ],
  },
  {
    slug: "illinois-estate-tax-calculator",
    title: "Illinois Estate Tax Calculator",
    description:
      "Estimate Illinois estate tax using its $4 million exemption (not inflation-indexed) and graduated " +
      "0.8%-16% rate schedule above it.",
    metaTitle: "Illinois Estate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Illinois estate tax calculator. Estimate tax owed above the $4M exemption at a graduated 0.8%-16% rate.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableEstate", "Taxable Estate"),
      currencyResult("estateTaxDue", "Estimated Illinois Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Illinois exempts the first $4 million of a taxable estate — a figure that, unlike many states, isn't " +
      "adjusted for inflation over time — then applies a graduated rate from 0.8% up to 16% above that. Enter " +
      "your gross taxable estate to see your estimated tax.",
    assumptions:
      "This calculator uses Illinois's $4,000,000 exemption and published 0.8%-16% rate range. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $6,000,000 taxable estate. After the $4,000,000 exemption, $2,000,000 is taxable, taxed near " +
      "the low end of the schedule — an estimated tax of roughly $20,000-$30,000.",
    faq: [
      { question: "Is Illinois's estate tax exemption indexed for inflation?", answer: "No — it's a fixed $4 million, unlike many other states." },
      { question: "What's the top Illinois estate tax rate?", answer: "16%, reached on very large estates." },
    ],
  },
  {
    slug: "maine-estate-tax-calculator",
    title: "Maine Estate Tax Calculator",
    description:
      "Estimate Maine estate tax using its roughly $7 million inflation-indexed exemption and graduated " +
      "8%-12% rate schedule above it.",
    metaTitle: "Maine Estate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Maine estate tax calculator. Estimate tax owed above the ~$7M exemption at a graduated 8%-12% rate.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableEstate", "Taxable Estate"),
      currencyResult("estateTaxDue", "Estimated Maine Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Maine exempts roughly the first $7 million of a taxable estate — a figure that adjusts with inflation " +
      "each year — then applies a graduated rate from 8% up to 12% above that. Enter your gross taxable estate " +
      "to see your estimated tax.",
    assumptions:
      "This calculator uses an approximate $7,000,000 exemption (Maine's exact current figure is inflation-" +
      "indexed and adjusts annually — verify the precise current-year amount with Maine Revenue Services) and " +
      "its published 8%-12% rate range. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $9,000,000 taxable estate. After the roughly $7,000,000 exemption, about $2,000,000 is " +
      "taxable near Maine's 8% starting rate — an estimated tax in the neighborhood of $170,000.",
    faq: [
      { question: "Does Maine's estate tax exemption change every year?", answer: "Yes, it's adjusted for inflation annually — this calculator uses an approximate current figure." },
      { question: "What's the top Maine estate tax rate?", answer: "12%, a narrower range than several neighboring states." },
    ],
  },
  {
    slug: "maryland-estate-tax-calculator",
    title: "Maryland Estate Tax Calculator",
    description:
      "Estimate Maryland estate tax using its $5 million exemption (not inflation-indexed) and graduated " +
      "0.8%-16% rate schedule above it. Maryland is the only state with both an estate tax and an inheritance tax.",
    metaTitle: "Maryland Estate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Maryland estate tax calculator. Estimate tax owed above the $5M exemption at a graduated 0.8%-16% rate.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableEstate", "Taxable Estate"),
      currencyResult("estateTaxDue", "Estimated Maryland Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Maryland is the only US state that levies both an estate tax and a separate inheritance tax — this " +
      "calculator covers the estate tax only, which exempts the first $5 million of a taxable estate (a fixed " +
      "figure, not adjusted for inflation) and applies a graduated rate from 0.8% up to 16% above that.\n\n" +
      "Enter your gross taxable estate to see your estimated tax. If any beneficiaries aren't in an exempt " +
      "relationship, Maryland's separate inheritance tax may also apply — see our Maryland Inheritance Tax " +
      "Calculator.",
    assumptions:
      "This calculator uses Maryland's $5,000,000 exemption and published 0.8%-16% rate range. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $7,000,000 taxable estate. After the $5,000,000 exemption, $2,000,000 is taxable near " +
      "Maryland's 0.8% starting rate — an estimated tax of roughly $15,000-$25,000.",
    faq: [
      { question: "Does Maryland really have both an estate tax and an inheritance tax?", answer: "Yes — Maryland is the only US state with both. They apply independently and can both be owed on the same estate." },
      { question: "Is Maryland's estate tax exemption indexed for inflation?", answer: "No — it's a fixed $5 million." },
    ],
  },
  {
    slug: "massachusetts-estate-tax-calculator",
    title: "Massachusetts Estate Tax Calculator",
    description:
      "Estimate Massachusetts estate tax. Estates at or below $2 million owe nothing; above that threshold, " +
      "the whole estate is taxed on a graduated 0.8%-16% schedule, reduced by a flat $99,600 credit.",
    metaTitle: "Massachusetts Estate Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free Massachusetts estate tax calculator. Estates over $2M are taxed on their full value at a graduated " +
      "rate, minus a $99,600 credit.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("scheduleTaxBeforeCredit", "Tax on Full Estate (before credit)"),
      currencyResult("credit", "Flat Credit Applied"),
      currencyResult("estateTaxDue", "Estimated Massachusetts Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Massachusetts works differently from most states with a $2 million threshold: an estate at or below " +
      "$2 million owes nothing at all, but as soon as it exceeds $2 million, Massachusetts taxes the ENTIRE " +
      "estate — not just the amount above $2 million — using a graduated rate from 0.8% up to 16%. A flat " +
      "$99,600 credit is then subtracted, which softens the impact for estates just over the threshold.\n\n" +
      "Enter your gross taxable estate to see whether the threshold applies and your estimated tax.",
    assumptions:
      "This calculator uses Massachusetts's $2,000,000 threshold, its published 0.8%-16% rate range applied to " +
      "the full estate once the threshold is exceeded, and its flat $99,600 credit. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $2,100,000 estate — just over the threshold. The graduated schedule is applied to the full " +
      "$2,100,000 (not just the $100,000 excess), producing a schedule tax of a little over $99,600 before the " +
      "credit; after subtracting the $99,600 credit, the estimated Massachusetts estate tax owed is a small " +
      "amount rather than zero.",
    faq: [
      {
        question: "If my estate is $2,000,001, is my whole estate taxed?",
        answer:
          "Yes — Massachusetts applies its graduated schedule to the full estate value once you're over the " +
          "$2 million threshold, not just the amount above it. A flat $99,600 credit softens this for estates " +
          "just over the line.",
      },
      {
        question: "Is there really no tax at all below $2 million?",
        answer: "Correct — an estate at or below the $2 million threshold owes no Massachusetts estate tax.",
      },
    ],
  },
  {
    slug: "minnesota-estate-tax-calculator",
    title: "Minnesota Estate Tax Calculator",
    description:
      "Estimate Minnesota estate tax using its $3 million exemption and a narrower graduated 13%-16% rate " +
      "schedule above it.",
    metaTitle: "Minnesota Estate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Minnesota estate tax calculator. Estimate tax owed above the $3M exemption at a graduated 13%-16% rate.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableEstate", "Taxable Estate"),
      currencyResult("estateTaxDue", "Estimated Minnesota Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Minnesota exempts the first $3 million of a taxable estate, then applies a comparatively narrow " +
      "graduated rate from 13% up to 16% above that — higher at the low end than most other states with an " +
      "estate tax. Enter your gross taxable estate to see your estimated tax.",
    assumptions:
      "This calculator uses Minnesota's $3,000,000 exemption and published 13%-16% rate range. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $4,000,000 taxable estate. After the $3,000,000 exemption, $1,000,000 is taxable near " +
      "Minnesota's 13% starting rate — an estimated tax of roughly $135,000.",
    faq: [
      { question: "Why is Minnesota's starting rate so much higher than other states'?", answer: "Minnesota's schedule starts at 13% rather than the sub-1% starting rates several other states use, reaching 16% relatively quickly." },
    ],
  },
  {
    slug: "new-york-estate-tax-calculator",
    title: "New York Estate Tax Calculator",
    description:
      "Estimate New York estate tax. Estates at or below the $7.35 million exemption owe nothing; estates over " +
      "105% of the exemption lose it entirely and are taxed on their full value — New York's notorious \"cliff.\"",
    metaTitle: "New York Estate Tax Calculator (2026) — Free & Instant",
    metaDescription:
      "Free New York estate tax calculator. New York's exemption disappears entirely once an estate exceeds " +
      "105% of it — a notorious \"cliff\" this tool models.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("estateTaxDue", "Estimated New York Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "New York has one of the most punishing quirks in state estate tax law: its $7,350,000 exemption " +
      "disappears entirely — not just partially — once an estate exceeds 105% of that figure ($7,717,500). " +
      "Below the exemption, you owe nothing. Right above 105% of the exemption, the ENTIRE estate becomes " +
      "taxable, not just the excess. In between (100%-105%), the exemption phases out.\n\n" +
      "Enter your gross taxable estate to see which of these three zones applies and your estimated tax.",
    assumptions:
      "This calculator uses New York's $7,350,000 exemption and $7,717,500 cliff threshold (105% of the " +
      "exemption). For estates in the narrow phase-out band between the two, this tool approximates the tax as " +
      "phasing in in a straight line, which is a simplification of New York's actual credit-phase-out " +
      "mechanism. " +
      GRADUATED_ESTIMATE_NOTE +
      " New York's actual published schedule starts near 3.06% rather than under 1% — used here for the " +
      "full-estate calculation once past the cliff.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $7,800,000 estate — just past the 105% cliff. Because the exemption is lost entirely, New " +
      "York's graduated schedule is applied to the FULL $7,800,000, not just the amount above the exemption — " +
      "producing a materially larger tax bill than an estate valued just under the cliff at $7,700,000, which " +
      "would fall in the phase-out zone with a much smaller tax.",
    faq: [
      {
        question: "What is New York's estate tax \"cliff\"?",
        answer:
          "If your estate exceeds 105% of the $7.35 million exemption, you lose the exemption entirely and " +
          "your WHOLE estate is taxed — not just the amount above the exemption. This can mean an estate just " +
          "over the line owes far more than one just under it.",
      },
      {
        question: "Is there any way to avoid the cliff?",
        answer:
          "Estate planning strategies exist to keep an estate under the cliff threshold, but that's beyond " +
          "what this calculator covers — consult an estate attorney if your estate is anywhere near this range.",
      },
    ],
  },
  {
    slug: "oregon-estate-tax-calculator",
    title: "Oregon Estate Tax Calculator",
    description:
      "Estimate Oregon estate tax using its unusually low $1 million exemption (not inflation-indexed) and " +
      "graduated 10%-16% rate schedule above it.",
    metaTitle: "Oregon Estate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Oregon estate tax calculator. Estimate tax owed above Oregon's low $1M exemption at a graduated 10%-16% rate.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableEstate", "Taxable Estate"),
      currencyResult("estateTaxDue", "Estimated Oregon Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Oregon has one of the lowest estate tax exemptions in the country — just $1 million, and unlike most " +
      "states, it isn't adjusted for inflation. Above that threshold, a graduated rate from 10% up to 16% " +
      "applies. Enter your gross taxable estate to see your estimated tax.",
    assumptions:
      "This calculator uses Oregon's $1,000,000 exemption and published 10%-16% rate range. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $2,000,000 taxable estate — a modest estate by many measures. After the $1,000,000 " +
      "exemption, $1,000,000 is taxable near Oregon's 10% starting rate — an estimated tax of roughly $105,000.",
    faq: [
      { question: "Why is Oregon's exemption so low?", answer: "Oregon's $1 million exemption hasn't been raised or indexed for inflation, unlike many other states, so it catches far more estates than it once did." },
    ],
  },
  {
    slug: "rhode-island-estate-tax-calculator",
    title: "Rhode Island Estate Tax Calculator",
    description:
      "Estimate Rhode Island estate tax using its inflation-indexed exemption (about $1.84 million) and " +
      "graduated 0.8%-16% rate schedule above it — with no \"cliff\" feature.",
    metaTitle: "Rhode Island Estate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Rhode Island estate tax calculator. Estimate tax owed above the ~$1.84M exemption at a graduated 0.8%-16% rate.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableEstate", "Taxable Estate"),
      currencyResult("estateTaxDue", "Estimated Rhode Island Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Rhode Island exempts roughly the first $1,838,056 of a taxable estate (a figure that's adjusted for " +
      "inflation each year), then applies a graduated rate from 0.8% up to 16% above that. Unlike New York or " +
      "Massachusetts, Rhode Island has no \"cliff\" — only the amount above the exemption is ever taxed. Enter " +
      "your gross taxable estate to see your estimated tax.",
    assumptions:
      "This calculator uses Rhode Island's 2026 exemption of $1,838,056 and published 0.8%-16% rate range. " +
      GRADUATED_ESTIMATE_NOTE +
      "\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $3,000,000 taxable estate. After the roughly $1,838,000 exemption, about $1,162,000 is " +
      "taxable near Rhode Island's low starting rate — an estimated tax in the range of $10,000-$20,000.",
    faq: [
      { question: "Does Rhode Island have a \"cliff\" like New York or Massachusetts?", answer: "No — Rhode Island only ever taxes the amount above its exemption, regardless of how large the estate is." },
      { question: "Is Rhode Island's exemption indexed for inflation?", answer: "Yes, it adjusts annually — this calculator uses the 2026 figure." },
    ],
  },
  {
    slug: "vermont-estate-tax-calculator",
    title: "Vermont Estate Tax Calculator",
    description:
      "Estimate Vermont estate tax using its $5 million exemption and simple flat 16% rate above it — no " +
      "graduated brackets.",
    metaTitle: "Vermont Estate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Vermont estate tax calculator. Estimate tax owed above the $5M exemption at a flat 16% rate.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableEstate", "Taxable Estate"),
      currencyResult("estateTaxDue", "Estimated Vermont Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Vermont keeps its estate tax simple compared to most states: the first $5 million of a taxable estate " +
      "is exempt, and everything above that is taxed at a single flat 16% rate — there's no graduated schedule " +
      "to model. Enter your gross taxable estate to see your estimated tax.",
    assumptions:
      "This calculator uses Vermont's $5,000,000 exemption (raised to this level in 2026) and flat 16% rate — " +
      "since Vermont's rate doesn't graduate, no approximation is needed here.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $6,000,000 taxable estate. After the $5,000,000 exemption, $1,000,000 is taxable at a flat " +
      "16%, for an estimated Vermont estate tax of $160,000.",
    faq: [
      { question: "Does Vermont use a graduated rate like most other states?", answer: "No — Vermont applies one flat 16% rate to everything above its $5 million exemption." },
      { question: "Has Vermont's exemption changed recently?", answer: "Yes — it was raised to $5 million in 2026, up from a lower figure previously." },
    ],
  },
  {
    slug: "washington-estate-tax-calculator",
    title: "Washington Estate Tax Calculator",
    description:
      "Estimate Washington State estate tax using its $3 million exemption and graduated 10%-20% rate schedule " +
      "above it, reflecting the state's mid-2026 rate rollback.",
    metaTitle: "Washington Estate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Washington State estate tax calculator. Estimate tax owed above the $3M exemption at a graduated 10%-20% rate.",
    calcInputs: [grossEstateField],
    calcResults: [
      currencyResult("exemptionApplied", "Exemption Applied"),
      currencyResult("taxableEstate", "Taxable Estate"),
      currencyResult("estateTaxDue", "Estimated Washington Estate Tax", { highlight: true }),
      percentResult("effectiveRate", "Effective Rate"),
    ],
    instructions:
      "Washington exempts the first $3,000,000 of a taxable estate, then applies a graduated rate from 10% up " +
      "to 20% above that. Washington's top rate changed mid-2026 — it was temporarily as high as 35% between " +
      "July 2025 and June 2026, then rolled back to 20% from July 1, 2026 onward. This calculator uses the " +
      "current post-July-2026 rates. Enter your gross taxable estate to see your estimated tax.",
    assumptions:
      "This calculator uses Washington's current $3,000,000 exemption and 10%-20% rate range (effective " +
      "July 1, 2026). " +
      GRADUATED_ESTIMATE_NOTE +
      " If the death occurred before July 1, 2026, a different, temporarily higher top rate applied — verify " +
      "the date-of-death-specific rules with the Washington Department of Revenue for an estate in that " +
      "window.\n\n" +
      GENERAL_DISCLAIMER,
    examples:
      "Example: a $4,000,000 taxable estate, death after July 1, 2026. After the $3,000,000 exemption, " +
      "$1,000,000 is taxable near Washington's 10% starting rate — an estimated tax of roughly $105,000.",
    faq: [
      {
        question: "Did Washington's estate tax rate really change in 2026?",
        answer:
          "Yes — the top rate was temporarily raised to 35% for deaths between July 2025 and June 2026, then " +
          "rolled back to 20% starting July 1, 2026. This calculator uses the current, rolled-back rate.",
      },
      {
        question: "Is this the same as Washington's capital gains tax?",
        answer:
          "No — Washington also has a separate, unique excise tax on long-term capital gains; see our " +
          "Washington Capital Gains Tax Calculator for that.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: "Tax & Paycheck Calculators" },
    create: {
      name: "Tax & Paycheck Calculators",
      slug: CATEGORY_SLUG,
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  for (const t of TOOLS) {
    const toolContent = {
      title: t.title,
      description: t.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(t.calcInputs),
      calcResult: JSON.stringify({ label: t.title, unit: "", format: "currency" }),
      calcResults: JSON.stringify(t.calcResults),
      instructions: paragraphsToHtml(t.instructions),
      examples: paragraphsToHtml(t.examples),
      assumptions: paragraphsToHtml(t.assumptions),
      faq: JSON.stringify(t.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: t.metaTitle,
      metaDescription: t.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: t.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: t.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      console.log(`Updated "${t.slug}".`);
    } else {
      await prisma.tool.create({
        data: { slug: t.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      console.log(`Created "${t.slug}" (status: draft).`);
    }
  }

  console.log(`\nDone — ${TOOLS.length} tools created/updated, all status "draft". Review in /admin/tools.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
