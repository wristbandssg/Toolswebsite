// The "Real Estate Calculators" main category (set up 17 Oct 2026, user
// request: Real Estate becomes its own main category with at most 10
// sub-categories, and every existing real estate tool moves into it rather
// than being rebuilt).
//
// Shared by prisma/restructure-real-estate-main-category.ts (which makes the
// move) and by every older create-*.ts script that owns one of the moved
// tools — those scripts look a tool up here first so re-running them files
// it in its new sub-category instead of moving it back.

export const REAL_ESTATE_MAIN = { name: "Real Estate Calculators", slug: "real-estate-calculators", breadcrumbName: "Real Estate" };

/** The 10 sub-categories, in display order. Mortgage Calculators keeps its own 5 children. */
export const REAL_ESTATE_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Rent & Tenant Calculators", slug: "rent-tenant-calculators" },
  { name: "Home Buying & Affordability Calculators", slug: "home-buying-affordability-calculators" },
  { name: "Home Value, Equity & Selling Calculators", slug: "home-value-equity-selling-calculators" },
  { name: "Closing Cost Calculators", slug: "closing-cost-calculators" },
  { name: "Mortgage Calculators", slug: "mortgage-calculators" },
  { name: "Property & Real Estate Tax Calculators", slug: "property-real-estate-tax-calculators" },
  { name: "Rental Property & Investment Calculators", slug: "rental-property-investment-calculators" },
  { name: "Short-Term Rental & Airbnb Calculators", slug: "short-term-rental-airbnb-calculators" },
  { name: "Land, Construction & Building Cost Calculators", slug: "land-construction-building-cost-calculators" },
  { name: "Commercial Real Estate Calculators", slug: "commercial-real-estate-calculators" },
];

/** The 5 children of Mortgage Calculators after the merge. */
export const MORTGAGE_CHILDREN: { name: string; slug: string }[] = [
  { name: "Mortgage Payment, Type & Cost Calculators", slug: "mortgage-payment-type-calculators" },
  { name: "Refinance & Home Equity Calculators", slug: "refinance-home-equity-calculators" },
  { name: "Home Buyer Program Calculators", slug: "home-buyer-program-calculators" },
  { name: "Property & Construction Mortgage Calculators", slug: "property-construction-mortgage-calculators" },
  { name: "Mortgage Calculators by State, City & Country", slug: "mortgage-by-location-calculators" },
];

/** Merged into Mortgage Payment, Type & Cost (its 10 tools move, the category is deleted). */
export const MERGED_MORTGAGE_CHILD = { from: "mortgage-cost-insurance-calculators", into: "mortgage-payment-type-calculators" };

const c = (list: string) => list.trim().split(/\s+/).map((s) => `${s}-calculator`);

const STATES =
  "alabama alaska arizona arkansas california colorado connecticut delaware florida georgia hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts michigan minnesota mississippi missouri montana nebraska nevada new-hampshire new-jersey new-mexico new-york north-carolina north-dakota ohio oklahoma oregon pennsylvania rhode-island south-carolina south-dakota tennessee texas utah vermont virginia washington west-virginia wisconsin wyoming";
const TRANSFER_TAX_STATES =
  "alabama arkansas california connecticut delaware florida georgia hawaii illinois iowa kentucky maine maryland massachusetts michigan minnesota nebraska nevada new-hampshire new-jersey new-york north-carolina oklahoma pennsylvania rhode-island south-carolina vermont virginia washington";

const GROUPS: Record<string, string[]> = {
  "rent-tenant-calculators": c("prorated-rent rent-to-income-ratio net-effective-rent rent-increase rental-affordability rental-commission"),
  "home-buying-affordability-calculators": c(
    "home-affordability home-price-affordability down-payment home-down-payment earnest-money gift-of-equity what-to-offer-on-a-house rent-vs-buy rent-vs-own price-to-rent-ratio rent-to-price-ratio homeownership-cost total-cost-of-homeownership hoa-fee"
  ),
  "home-value-equity-selling-calculators": [
    ...c(
      "property-value price-per-square-foot property-appreciation real-estate-appreciation home-equity real-estate-equity property-equity-growth loan-to-value-real-estate real-estate-commission home-sale-profit net-proceeds-from-home-sale cost-to-sell-a-house"
    ),
    "realtor-commission-calculator-with-vat",
  ],
  "closing-cost-calculators": c("closing-cost buyer-closing-cost home-closing-cost seller-closing-cost title-insurance"),
  "property-real-estate-tax-calculators": [
    ...STATES.split(" ").map((s) => `${s}-property-tax-calculator`),
    ...TRANSFER_TAX_STATES.split(" ").map((s) => `${s}-transfer-tax-calculator`),
    ...c(
      "property-tax property-tax-rate property-transfer-tax land-tax stamp-duty real-estate-capital-gains rental-property-capital-gains capital-gains-on-property rental-income-tax rental-property-tax property-tax-deduction real-estate-investment-tax 1031-exchange canada-property-transfer-tax"
    ),
  ],
  "rental-property-investment-calculators": c(
    "landlord-insurance cap-rate real-estate-roi house-flipping rental-property rental-income rental-cash-flow rental-property-roi cash-on-cash-return net-operating-income operating-expense-ratio vacancy-rate rental-vacancy-loss property-management-fee rental-expense rental-property-profit rental-property-break-even rental-yield gross-rental-yield net-rental-yield rent-to-value-ratio gross-rent-multiplier rental-property-payback-period investment-property-value property-depreciation real-estate-depreciation rental-property-appreciation rental-property-future-value real-estate-investment-return real-estate-cash-flow real-estate-profit real-estate-break-even real-estate-payback-period dscr-real-estate capitalization-rate-vs-cash-on-cash cap-rate-vs-roi property-investment-comparison multiple-property-investment property-investment buy-and-hold-real-estate brrrr brrrr-refinance brrrr-cash-flow house-flip-profit house-flip-roi house-flip-cost house-flip-budget house-flip-break-even house-flip-arv after-repair-value 70-percent-rule-house-flipping fix-and-flip fix-and-flip-loan fix-and-flip-financing renovation-cost rehab-cost property-maintenance-cost affo"
  ),
  "short-term-rental-airbnb-calculators": c(
    "airbnb-cash-flow airbnb-investment airbnb-occupancy-rate airbnb-profit airbnb-roi short-term-rental vacation-rental vacation-rental-roi occupancy-rate"
  ),
  "land-construction-building-cost-calculators": c("barndominium-cost home-addition-cost land-investment land-value property-development-profit real-estate-development"),
  "commercial-real-estate-calculators": c(
    "commercial-cap-rate commercial-lease commercial-loan-dscr commercial-property-cash-flow commercial-property-loan commercial-property-roi commercial-real-estate debt-yield multifamily-cap-rate multifamily-cash-flow multifamily-property multifamily-roi apartment-investment income-approach-property-value"
  ),
  "property-construction-mortgage-calculators": c("timeshare-loan timeshare-loan-cost timeshare-loan-payment timeshare-loan-payoff"),
};

/** Existing tool slug → the sub-category slug it now lives in. */
export const REAL_ESTATE_TOOL_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(GROUPS).flatMap(([cat, slugs]) => slugs.map((slug) => [slug, cat]))
);

type CategoryLookup = { toolCategory: { findUnique(args: { where: { slug: string } }): Promise<{ id: string } | null> } };
const idCache = new Map<string, string>();

/**
 * For the older create-*.ts scripts: the id of the Real Estate sub-category a
 * moved tool now lives in, or undefined when the tool isn't one of them (or
 * the restructure hasn't been run yet) — the script then uses its own category.
 */
export async function realEstateCategoryIdFor(prisma: CategoryLookup, toolSlug: string): Promise<string | undefined> {
  const slug = REAL_ESTATE_TOOL_CATEGORY[toolSlug];
  if (!slug) return undefined;
  if (!idCache.has(slug)) {
    const found = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!found) return undefined;
    idCache.set(slug, found.id);
  }
  return idCache.get(slug);
}
