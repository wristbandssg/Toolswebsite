// One-time (but safe to re-run) batch setup script: creates 26 property, transfer and
// international property tax tools from the user's real estate list
// (Real Estate Calculators > Property & Real Estate Tax Calculators).
// See src/lib/calc-engine-re-tax-local.ts for the math.
//
// HOW TO RUN (after prisma/restructure-real-estate-main-category.ts --apply)
//   npx tsx prisma/create-re-tax-local-calculators.ts
// or
//   npm run db:create-re-tax-local-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

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
  return { key, label, type: "number", unit: opts.unit, required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
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
  category: string;
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

const CAT = "property-real-estate-tax-calculators";

function prop13Inputs(price: number, rate: number, assessments: number) {
  return [
    currencyField("purchasePrice", "Purchase Price (Base Year Value)", { default: price, max: 100000000, step: 1000 }),
    numberField("yearsSincePurchase", "Years Since Purchase", { default: 0, max: 60 }),
    currencyField("marketValue", "Current Market Value (Optional, for Prop 8)", { default: 0, max: 100000000, step: 1000, required: false }),
    YN("homeownersExemption", "Homeowners' Exemption ($7,000, Owner-Occupied)", 1),
    percentField("taxRate", "Ad Valorem Tax Rate (1% + Voter Bonds)", { default: rate, max: 3, step: 0.0001 }),
    currencyField("directAssessments", "Direct Assessments & Special Taxes per Year", { default: assessments, max: 50000, step: 10, required: false }),
  ];
}
const PROP13_RESULTS = [
  { key: "yearlyPropertyTax", label: "Yearly Property Tax", format: "currency", highlight: true },
  { key: "monthlyPropertyTax", label: "Monthly Property Tax", format: "currency" },
  { key: "assessedValueThisYear", label: "Assessed Value This Year", format: "currency" },
  { key: "adValoremTax", label: "Ad Valorem Tax", format: "currency" },
  { key: "directAssessments", label: "Direct Assessments", format: "currency" },
  { key: "effectiveRate", label: "Effective Tax Rate", format: "percentage" },
];

function texasInputs(o: { value: number; county: number; school: number; city: number; college: number; cityPct: number; countyLabel: string; schoolLabel: string; cityLabel: string; collegeLabel: string }) {
  return [
    currencyField("appraisedValue", "Appraised (Market) Value", { default: o.value, max: 50000000, step: 1000 }),
    currencyField("cappedValue", "Capped Homestead Value from Your Notice (Optional)", { default: 0, max: 50000000, step: 1000, required: false }),
    YN("homestead", "Homestead (Your Main Home)", 1),
    YN("over65OrDisabled", "65 or Older / Disabled", 0),
    numberField("countyRate", o.countyLabel, { default: o.county, max: 3, step: 0.0001 }),
    numberField("schoolRate", o.schoolLabel, { default: o.school, max: 3, step: 0.0001 }),
    numberField("cityRate", o.cityLabel, { default: o.city, max: 3, step: 0.0001 }),
    percentField("cityHomesteadPercent", "City Homestead Exemption", { default: o.cityPct, max: 20, step: 1 }),
    numberField("collegeRate", o.collegeLabel, { default: o.college, max: 1, step: 0.0001 }),
    numberField("otherRate", "MUD / ESD / Other (per $100)", { default: 0, max: 3, step: 0.0001, required: false }),
    currencyField("countySeniorExemption", "County 65+ Exemption", { default: 0, max: 500000, step: 1000, required: false }),
    currencyField("citySeniorExemption", "City 65+ Exemption", { default: 0, max: 500000, step: 1000, required: false }),
  ];
}
const TEXAS_RESULTS = [
  { key: "yearlyPropertyTax", label: "Yearly Property Tax", format: "currency", highlight: true },
  { key: "monthlyPropertyTax", label: "Monthly Property Tax", format: "currency" },
  { key: "homesteadSavings", label: "Homestead Exemption Savings", format: "currency" },
  { key: "combinedRatePer100", label: "Combined Rate per $100", format: "number", decimals: 4 },
  { key: "effectiveRate", label: "Effective Tax Rate", format: "percentage" },
];

const TRANSFER_PRICE = (d: number) => currencyField("salePrice", "Sale Price", { default: d, max: 100000000, step: 1000 });

const TOOLS: ToolDef[] = [
  {
    slug: "texas-homestead-exemption-calculator",
    title: "Texas Homestead Exemption Calculator",
    category: CAT,
    description: "See how much the Texas homestead exemption saves you — the $140,000 school district exemption (plus $60,000 more if you're 65+ or disabled) and any county or city percentage exemption.",
    metaTitle: "Texas Homestead Exemption Calculator — 2025 $140,000",
    metaDescription: "Free Texas homestead exemption calculator. See your savings from the $140,000 school exemption, the 65+ exemption and county or city exemptions.",
    calcInputs: [
      currencyField("appraisedValue", "Appraised Value", { default: 350000, max: 50000000, step: 1000 }),
      YN("over65OrDisabled", "65 or Older / Disabled (+$60,000 School Exemption)", 0),
      numberField("schoolRate", "School District Rate (per $100)", { default: 1.05, max: 3, step: 0.0001 }),
      numberField("countyRate", "County Rate (per $100)", { default: 0.4, max: 3, step: 0.0001 }),
      numberField("cityRate", "City Rate (per $100)", { default: 0.55, max: 3, step: 0.0001 }),
      numberField("otherRate", "Other Units — College, Hospital, MUD (per $100)", { default: 0.2, max: 3, step: 0.0001, required: false }),
      percentField("countyHomesteadPercent", "County Optional Homestead Exemption", { default: 0, max: 20, step: 1, required: false }),
      percentField("cityHomesteadPercent", "City Optional Homestead Exemption", { default: 0, max: 20, step: 1, required: false }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "yearlySavings", label: "Yearly Savings from Homestead", format: "currency", highlight: true },
      { key: "taxWithExemption", label: "Tax with Homestead", format: "currency" },
      { key: "taxWithoutExemption", label: "Tax Without Homestead", format: "currency" },
      { key: "schoolTaxableValue", label: "School Taxable Value", format: "currency" },
      { key: "effectiveRateWithExemption", label: "Effective Rate with Homestead", format: "percentage" },
    ],
    instructions: "Enter your home's appraised value and the tax rates for your school district, county and city (shown per $100 on your appraisal notice or truth-in-taxation site). Add any optional percentage homestead exemption your county or city offers (up to 20%).",
    examples: "Example: a $350,000 home with a 1.05 school rate saves $1,470.00 a year from the $140,000 school exemption — the school-taxable value drops to $210,000 and the total tax from $7,700.00 to $6,230.00.",
    assumptions: "Since 2025 (voter-approved Propositions 13 and 11), every Texas school district must exempt $140,000 of a homestead's value, plus $60,000 more for owners 65+ or disabled, whose school taxes are also frozen. Counties and cities may add up to 20%. Homestead values also can't rise more than 10% a year. Apply with your appraisal district (Form 50-114) — there's no fee.",
    faq: [
      { question: "How much is the Texas homestead exemption in 2025?", answer: "$140,000 off your school district taxable value, and $200,000 if you're 65 or older or disabled." },
      { question: "When do I apply for the Texas homestead exemption?", answer: "Once you own and live in the home as of January 1; you can apply up to two years late and receive refunds." },
    ],
  },
  {
    slug: "florida-homestead-exemption-calculator",
    title: "Florida Homestead Exemption Calculator",
    category: CAT,
    description: "Estimate what Florida's homestead exemption saves you — up to $50,000 off your assessed value — and how much the Save Our Homes 3% cap saves in later years as market values rise.",
    metaTitle: "Florida Homestead Exemption Calculator — Savings & SOH Cap",
    metaDescription: "Free Florida homestead exemption calculator. See your yearly savings from the $50,000 exemption and the Save Our Homes 3% assessment cap.",
    calcInputs: [
      currencyField("assessedValue", "Assessed (Just) Value", { default: 400000, max: 50000000, step: 1000 }),
      numberField("schoolMillage", "School Millage (Mills)", { default: 6, max: 20, step: 0.0001 }),
      numberField("nonSchoolMillage", "County, City & Other Millage (Mills)", { default: 12, max: 30, step: 0.0001 }),
      currencyField("otherExemptions", "Other Exemptions (Senior, Veteran, Widow)", { default: 0, max: 1000000, step: 500, required: false }),
      numberField("yearsOwned", "Years Ahead for Save Our Homes", { default: 5, max: 40 }),
      percentField("marketGrowth", "Market Value Growth per Year", { default: 6, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "yearlySavings", label: "Yearly Savings from Homestead", format: "currency", highlight: true },
      { key: "taxWithHomestead", label: "Tax with Homestead", format: "currency" },
      { key: "taxWithoutHomestead", label: "Tax Without Homestead", format: "currency" },
      { key: "exemptionFromNonSchoolTaxes", label: "Exemption from Non-School Taxes", format: "currency" },
      { key: "saveOurHomesSavingsInFutureYear", label: "Save Our Homes Savings in That Year", format: "currency" },
      { key: "cappedAssessedValueThen", label: "Capped Assessed Value Then", format: "currency" },
    ],
    instructions: "Enter your home's assessed value and the school and non-school millage from your TRIM notice (1 mill = $1 per $1,000). Add any extra exemptions, then choose how many years ahead to project the Save Our Homes cap and how fast you expect market values to rise.",
    examples: "Example: a $400,000 home at 6 school mills and 12 other mills saves $750.00 a year — $25,000 off all taxes and another $25,000 off non-school taxes. If values rise 6% a year, the 3% cap saves about $1,288 in year 5.",
    assumptions: "Florida's homestead exemption: $25,000 off all property taxes plus $25,000 off non-school taxes on value between $50,000 and $75,000. Save Our Homes limits yearly assessment increases to 3% (or CPI if lower) after the first year, and up to $500,000 of the benefit can be ported to a new Florida home. A November 2026 ballot measure would raise the non-school exemption — see the DeSantis property tax calculator.",
    faq: [
      { question: "How much does the Florida homestead exemption save?", answer: "Usually $700–$1,100 a year from the $50,000 exemption, plus growing savings from the 3% Save Our Homes cap." },
      { question: "When is the Florida homestead deadline?", answer: "March 1 of the year after you own and live in the home as of January 1." },
    ],
  },
  {
    slug: "desantis-property-tax-calculator",
    title: "DeSantis Property Tax Calculator",
    category: CAT,
    description: "Estimate how much you'd save on Florida property taxes if the 2026 homestead amendment backed by Gov. DeSantis passes — a $150,000 non-school exemption in 2027 rising to $250,000 in 2028, with school taxes unchanged.",
    metaTitle: "DeSantis Property Tax Calculator — 2026 Florida Amendment",
    metaDescription: "Free calculator for Florida's 2026 homestead amendment. See your property tax under the proposed $150,000 / $250,000 non-school exemption vs today.",
    calcInputs: [
      currencyField("assessedValue", "Homestead Assessed Value", { default: 400000, max: 50000000, step: 1000 }),
      numberField("schoolMillage", "School Millage (Mills)", { default: 6, max: 20, step: 0.0001 }),
      numberField("nonSchoolMillage", "County, City & Other Millage (Mills)", { default: 12, max: 30, step: 0.0001 }),
      dropdown("year", "Year", [["2027 — $150,000 Non-School Exemption", 2027], ["2028 — $250,000 Non-School Exemption", 2028]], 2028),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "yearlySavings", label: "Yearly Savings If Passed", format: "currency", highlight: true },
      { key: "taxToday", label: "Homestead Tax Today", format: "currency" },
      { key: "taxUnderAmendment", label: "Tax Under the Amendment", format: "currency" },
      { key: "savingsPercent", label: "Savings %", format: "percentage" },
      { key: "nonSchoolExemption", label: "Non-School Exemption Used", format: "currency" },
      { key: "schoolTaxesUnchanged", label: "School Taxes (Unchanged)", format: "currency" },
    ],
    instructions: "Enter your homestead's assessed value (after Save Our Homes) and the school and non-school millage from your TRIM notice. Choose 2027 or 2028 to see the first or full step of the amendment.",
    examples: "Example: a $400,000 homestead paying 6 school mills and 12 other mills owes $6,450.00 today. With the $250,000 non-school exemption from 2028 it would owe $4,050.00 — $2,400.00 (37%) less; school taxes stay at $2,250.00.",
    assumptions: "Based on the amendment the Legislature placed on the November 3, 2026 ballot (needs 60% of voters): the non-school homestead exemption rises to $150,000 in 2027 and $250,000 in 2028, then is indexed to inflation from 2029; the $25,000 exemption then applies only to school taxes. New residents arriving after 2026 phase in over five years. Local governments may change millage rates in response. Not an official estimate.",
    faq: [
      { question: "What is the DeSantis property tax plan?", answer: "A 2026 constitutional amendment that would raise Florida's homestead exemption from non-school property taxes to $150,000 in 2027 and $250,000 in 2028." },
      { question: "Will school property taxes change?", answer: "No — the amendment keeps school taxes on the current $25,000 exemption." },
    ],
  },
  {
    slug: "los-angeles-property-tax-calculator",
    title: "Los Angeles Property Tax Calculator",
    category: CAT,
    description: "Estimate property tax on a Los Angeles home under Prop 13 — 1% of the purchase price plus voter-approved bonds (about 1.2%), the $7,000 homeowners' exemption, the 2% yearly cap and direct assessments.",
    metaTitle: "Los Angeles Property Tax Calculator — LA County Prop 13",
    metaDescription: "Free Los Angeles property tax calculator. Estimate LA County property tax with Prop 13, the homeowners' exemption, the 2% cap and direct assessments.",
    calcInputs: prop13Inputs(950000, 1.2, 600),
    calcResult: { label: "Yearly Property Tax", format: "currency" },
    calcResults: PROP13_RESULTS,
    instructions: "Enter what you paid (or the Prop 13 base value) and how many years ago. Use the ad valorem rate for your tax rate area — about 1.2% in the City of LA — and the direct assessments (lighting, sewer, Measure A parcel taxes) from a recent bill.",
    examples: "Example: a $950,000 LA home with the homeowners' exemption pays $11,316.00 of ad valorem tax at 1.2% plus $600 of direct assessments — $11,916.00 a year, or $993.00 a month.",
    assumptions: "Prop 13 sets the assessed value at the purchase price and limits increases to 2% a year; Prop 8 can temporarily lower it if market value falls below. New construction adds value. A supplemental tax bill follows a purchase. LA County bills are due in two installments (November 1 and February 1).",
    faq: [
      { question: "What is the property tax rate in Los Angeles?", answer: "About 1.1–1.3% of the assessed value, depending on the tax rate area, plus direct assessments." },
      { question: "What is the homeowners' exemption in California?", answer: "$7,000 off the assessed value of your main home — about $70–$85 a year in tax." },
    ],
  },
  {
    slug: "san-francisco-property-tax-calculator",
    title: "San Francisco Property Tax Calculator",
    category: CAT,
    description: "Estimate San Francisco property tax — the 2025–26 rate of about 1.18% on your Prop 13 assessed value, the homeowners' exemption, the 2% yearly cap and parcel taxes.",
    metaTitle: "San Francisco Property Tax Calculator — SF 2025–26 Rate",
    metaDescription: "Free San Francisco property tax calculator. Estimate SF property tax at the 2025–26 rate with Prop 13, the homeowners' exemption and parcel taxes.",
    calcInputs: prop13Inputs(1350000, 1.1787, 450),
    calcResult: { label: "Yearly Property Tax", format: "currency" },
    calcResults: PROP13_RESULTS,
    instructions: "Enter the purchase price (Prop 13 base) and years since purchase. The rate is San Francisco's citywide secured rate; add parcel taxes (school, SF City College, Prop G and others) from a recent bill as direct assessments.",
    examples: "Example: a $1,350,000 San Francisco home with the homeowners' exemption pays $15,829.94 at 1.1787% plus $450 of parcel taxes — $16,279.94 a year, or about $1,356.66 a month.",
    assumptions: "San Francisco uses one citywide rate (1% base plus voter-approved debt), set each year. Prop 13 caps assessed value increases at 2% a year until the home sells. A supplemental bill follows a purchase. Bills are due in two installments (December 10 and April 10).",
    faq: [
      { question: "What is the property tax rate in San Francisco?", answer: "About 1.18% of assessed value for 2025–26, plus parcel taxes." },
      { question: "Does San Francisco property tax go up every year?", answer: "Assessed value can rise up to 2% a year under Prop 13, and the rate can change slightly with voter-approved bonds." },
    ],
  },
  {
    slug: "san-diego-property-tax-calculator",
    title: "San Diego Property Tax Calculator",
    category: CAT,
    description: "Estimate San Diego County property tax under Prop 13 — about 1.1–1.2% of the purchase price, the homeowners' exemption, the 2% yearly cap and fixed charges such as Mello-Roos.",
    metaTitle: "San Diego Property Tax Calculator — Prop 13 & Mello-Roos",
    metaDescription: "Free San Diego property tax calculator. Estimate San Diego County property tax with Prop 13, the homeowners' exemption, 2% cap and Mello-Roos.",
    calcInputs: prop13Inputs(900000, 1.17, 250),
    calcResult: { label: "Yearly Property Tax", format: "currency" },
    calcResults: PROP13_RESULTS,
    instructions: "Enter the purchase price and years since purchase, the ad valorem rate for your tax rate area (about 1.1–1.2% in the City of San Diego) and fixed charges from a recent bill — Mello-Roos in newer communities can be several thousand dollars a year.",
    examples: "Example: a $900,000 San Diego home with the homeowners' exemption pays $10,448.10 at 1.17% plus $250 of fixed charges — about $10,698.10 a year, or $891.51 a month.",
    assumptions: "Prop 13 sets the assessed value at the purchase price, rising at most 2% a year. Fixed charges (vector control, water standby, Mello-Roos CFDs) are added per parcel. Bills are due in two installments (November 1 and February 1) and a supplemental bill follows a purchase.",
    faq: [
      { question: "What is the property tax rate in San Diego?", answer: "About 1.1–1.25% of assessed value depending on the area, plus fixed charges." },
      { question: "Does San Diego have Mello-Roos?", answer: "Many newer communities do — check the fixed charges on the tax bill before you buy." },
    ],
  },
  {
    slug: "harris-county-property-tax-calculator",
    title: "Harris County Property Tax Calculator",
    category: CAT,
    description: "Estimate Harris County and Houston property taxes by taxing unit — county, school district, city, college and MUD — with the $140,000 school homestead exemption, the county's and Houston's 20% exemptions and the 10% cap.",
    metaTitle: "Harris County Property Tax Calculator — Houston Property Tax",
    metaDescription: "Free Harris County and Houston property tax calculator. Estimate taxes by unit with homestead exemptions, 65+ exemptions and the 10% cap.",
    calcInputs: texasInputs({
      value: 330000, county: 0.6, school: 0.87, city: 0.52, college: 0.092, cityPct: 20,
      countyLabel: "Harris County + Flood Control + Port + Hospital (per $100)", schoolLabel: "School District, e.g. Houston ISD (per $100)",
      cityLabel: "City, e.g. Houston (per $100, 0 If Unincorporated)", collegeLabel: "Houston Community College (per $100)",
    }),
    calcResult: { label: "Yearly Property Tax", format: "currency" },
    calcResults: TEXAS_RESULTS,
    instructions: "Enter your home's appraised value from HCAD (and the capped homestead value if it's lower). Rates start at typical Houston levels — replace them with the rates for your school district, city and any MUD from the HCAD or Harris County Tax Office site. Set the city rate to 0 for unincorporated areas.",
    examples: "Example: a $330,000 Houston homestead pays about $4,908.80 a year (1.49% effective) at a combined 2.082 per $100 — the homestead exemptions save about $1,961.80.",
    assumptions: "Harris County and its flood control, port and hospital districts each give a 20% homestead exemption (modeled as one combined unit). School districts exempt $140,000 (+$60,000 for 65+/disabled, with a tax freeze). The City of Houston gives 20% plus a 65+ exemption, and HCC a small one. Homestead taxable value can't rise more than 10% a year. Houston is used as the default city; enter your own rates elsewhere in Harris County.",
    faq: [
      { question: "What is the property tax rate in Houston?", answer: "About 2.0–2.2 per $100 in total (county, HISD, city and college), before homestead exemptions." },
      { question: "How do I lower my Harris County property taxes?", answer: "File a homestead exemption and protest your HCAD value each spring (usually by May 15) with comparable sales." },
    ],
  },
  {
    slug: "austin-property-tax-calculator",
    title: "Austin Property Tax Calculator",
    category: CAT,
    description: "Estimate Austin property taxes by taxing unit — Travis County and Central Health, Austin ISD, the City of Austin and Austin Community College — with homestead and 65+ exemptions and the 10% cap.",
    metaTitle: "Austin Property Tax Calculator — Travis County & AISD",
    metaDescription: "Free Austin property tax calculator. Estimate Travis County, Austin ISD, City of Austin and ACC taxes with homestead exemptions.",
    calcInputs: texasInputs({
      value: 550000, county: 0.48, school: 0.87, city: 0.52, college: 0.1, cityPct: 20,
      countyLabel: "Travis County + Central Health (per $100)", schoolLabel: "Austin ISD (per $100)", cityLabel: "City of Austin (per $100)", collegeLabel: "Austin Community College (per $100)",
    }),
    calcResult: { label: "Yearly Property Tax", format: "currency" },
    calcResults: TEXAS_RESULTS,
    instructions: "Enter your appraised value from the Travis Central Appraisal District (and the capped value if it's lower). Rates start at typical Austin levels; replace them with the current adopted rates for your address, and set the city rate to your suburb's rate if you're outside Austin.",
    examples: "Example: a $550,000 Austin homestead pays about $8,512.00 a year (1.55% effective) at a combined 1.97 per $100, after about $2,323.00 of homestead exemption savings.",
    assumptions: "Travis County, Central Health and the City of Austin each give a 20% homestead exemption; Austin ISD exempts $140,000 (+$60,000 for 65+/disabled, with a school tax freeze); ACC gives a small exemption (modeled as $5,000). Homestead values can rise at most 10% a year. Rates are set each fall and change yearly.",
    faq: [
      { question: "What is the property tax rate in Austin, TX?", answer: "About 1.9–2.1 per $100 in total before exemptions, depending on the school district and city." },
      { question: "Does Austin have a homestead exemption?", answer: "Yes — the city, Travis County and Central Health each exempt 20% of a homestead's value, and AISD exempts $140,000." },
    ],
  },
  {
    slug: "property-tax-nyc-calculator",
    title: "Property Tax NYC Calculator",
    category: CAT,
    description: "Estimate New York City property tax — Class 1 homes assessed at 6% of market value and Class 2 condos/co-ops at 45%, at the FY2026 tax rates, with exemptions, abatements and the STAR credit.",
    metaTitle: "NYC Property Tax Calculator — Class 1 & Class 2 FY2026",
    metaDescription: "Free NYC property tax calculator. Estimate your New York City property tax for 1–3 family homes, condos and co-ops at FY2026 rates.",
    calcInputs: [
      currencyField("marketValue", "Market Value (DOF Notice of Value)", { default: 1000000, max: 100000000, step: 1000 }),
      dropdown("propertyClass", "Tax Class", [["Class 1 — 1–3 Family Home", 0], ["Class 2 — Condo, Co-op or Apartment Building", 1]], 0),
      currencyField("assessedValue", "Assessed Value from Your Notice (Optional)", { default: 0, max: 50000000, step: 100, required: false }),
      currencyField("exemptions", "Exemptions off Assessed Value (Basic STAR, Senior, Veteran)", { default: 0, max: 5000000, step: 100, required: false }),
      percentField("taxRate", "Tax Rate (FY2026: Class 1 19.843%, Class 2 12.439%)", { default: 19.843, max: 30, step: 0.001 }),
      currencyField("abatements", "Abatements (Co-op/Condo, J-51, 421-a)", { default: 0, max: 1000000, step: 10, required: false }),
      currencyField("starCredit", "STAR Credit", { default: 0, max: 5000, step: 10, required: false }),
    ],
    calcResult: { label: "Yearly Property Tax", format: "currency" },
    calcResults: [
      { key: "yearlyPropertyTax", label: "Yearly Property Tax", format: "currency", highlight: true },
      { key: "quarterlyPayment", label: "Quarterly Payment", format: "currency" },
      { key: "assessedValue", label: "Assessed Value", format: "currency" },
      { key: "taxableValue", label: "Taxable Value", format: "currency" },
      { key: "taxBeforeCredits", label: "Tax Before Abatements & Credits", format: "currency" },
      { key: "effectiveRateOnMarketValue", label: "Effective Rate on Market Value", format: "percentage" },
    ],
    instructions: "Enter the Department of Finance market value and pick the tax class. For the most accurate result, enter the assessed value from your Notice of Property Value — assessment caps often make it lower than the ratio. Add exemptions, abatements and the STAR credit, and switch the rate to 12.439% for Class 2.",
    examples: "Example: a Class 1 home with a $1,000,000 market value is assessed at $60,000 (6%). At the FY2026 rate of 19.843%, the tax is $11,905.80 a year — $2,976.45 a quarter, about 1.19% of market value.",
    assumptions: "Class 1 is assessed at 6% of market value with increases capped at 6% a year and 20% over five years; Class 2 at 45% of an income-based value (capped at 8%/30% for small buildings). FY2026 rates adopted October 2025: Class 1 19.843%, Class 2 12.439%. Co-op owners pay through maintenance. Rates change each fiscal year (July 1).",
    faq: [
      { question: "How is NYC property tax calculated?", answer: "Market value × assessment ratio (6% Class 1, 45% Class 2) = assessed value; minus exemptions; × the class tax rate; minus abatements." },
      { question: "Why is NYC property tax low for some homes?", answer: "Assessment caps keep assessed values well below 6% of market value for many long-held Class 1 homes." },
    ],
  },
  {
    slug: "las-vegas-property-tax-calculator",
    title: "Las Vegas Property Tax Calculator",
    category: CAT,
    description: "Estimate Las Vegas (Clark County) property tax — 35% of taxable value times your district's rate per $100, with Nevada's 3% cap on increases for owner-occupied homes.",
    metaTitle: "Las Vegas Property Tax Calculator — Clark County",
    metaDescription: "Free Las Vegas property tax calculator. Estimate Clark County property tax from taxable value, your district rate and Nevada's 3% abatement cap.",
    calcInputs: [
      currencyField("taxableValue", "Taxable Value (Assessor)", { default: 380000, max: 50000000, step: 1000 }),
      numberField("ratePer100", "Tax Rate per $100 of Assessed Value", { default: 3.2782, max: 5, step: 0.0001 }),
      currencyField("lastYearTax", "Last Year's Tax Bill (for the Cap)", { default: 4000, max: 500000, step: 10, required: false }),
      YN("ownerOccupied", "Owner-Occupied Primary Residence (3% Cap)", 1),
    ],
    calcResult: { label: "Yearly Property Tax", format: "currency" },
    calcResults: [
      { key: "yearlyPropertyTax", label: "Yearly Property Tax", format: "currency", highlight: true },
      { key: "monthlyPropertyTax", label: "Monthly Property Tax", format: "currency" },
      { key: "assessedValue", label: "Assessed Value (35%)", format: "currency" },
      { key: "taxBeforeAbatement", label: "Tax Before the Cap", format: "currency" },
      { key: "abatementSavings", label: "Abatement (Cap) Savings", format: "currency" },
      { key: "effectiveRateOnTaxableValue", label: "Effective Rate on Taxable Value", format: "percentage" },
    ],
    instructions: "Enter the taxable value from the Clark County Assessor (usually below market value — land at market plus depreciated building cost) and your tax district's rate (City of Las Vegas district 200 is about 3.28 per $100). Add last year's bill to apply the cap.",
    examples: "Example: a $380,000 taxable value is assessed at $133,000; at 3.2782 per $100 the full tax is $4,360.01. With last year's bill at $4,000 and the 3% cap, you pay $4,120.00.",
    assumptions: "Nevada assesses property at 35% of taxable value. Abatements cap yearly tax increases at 3% for owner-occupied homes and up to 8% for others (the exact non-owner cap is set yearly). When a home sells, the cap carries over but the new owner must claim owner-occupied status. Rates vary by district and are capped at $3.64 per $100 statewide.",
    faq: [
      { question: "What is the property tax rate in Las Vegas?", answer: "About 3.28 per $100 of assessed value (35% of taxable value), or roughly 1.1% of taxable value." },
      { question: "How much can Las Vegas property tax go up each year?", answer: "No more than 3% for an owner-occupied home, thanks to Nevada's tax abatement." },
    ],
  },
  {
    slug: "depreciation-recapture-calculator",
    title: "Depreciation Recapture Calculator",
    category: CAT,
    description: "Calculate depreciation recapture tax when you sell a rental or investment property — unrecaptured Section 1250 gain at up to 25%, capital gains tax on the rest and the 3.8% net investment income tax.",
    metaTitle: "Depreciation Recapture Calculator — Rental Property Sale Tax",
    metaDescription: "Free depreciation recapture calculator. Find the 25% recapture tax, capital gains tax and NIIT when you sell a rental or commercial property.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 300000, max: 100000000, step: 1000 }),
      currencyField("improvements", "Capital Improvements", { default: 0, max: 50000000, step: 500, required: false }),
      percentField("landPercent", "Land Share of Basis (Not Depreciable)", { default: 20, max: 90, step: 1 }),
      dropdown("commercial", "Property Type", [["Residential Rental (27.5 Years)", 0], ["Commercial (39 Years)", 1]], 0),
      numberField("yearsOwned", "Years Depreciated", { default: 10, max: 40, step: 0.5 }),
      currencyField("depreciationTaken", "Actual Depreciation Taken (Optional)", { default: 0, max: 50000000, step: 100, required: false }),
      currencyField("salePrice", "Sale Price", { default: 450000, max: 100000000, step: 1000 }),
      currencyField("sellingCosts", "Selling Costs", { default: 27000, max: 5000000, step: 500 }),
      percentField("ordinaryRate", "Your Ordinary Income Tax Rate", { default: 32, max: 37, step: 1 }),
      percentField("capitalGainsRate", "Long-Term Capital Gains Rate", { default: 15, max: 20, step: 5 }),
      YN("niit", "Subject to 3.8% Net Investment Income Tax", 0),
    ],
    calcResult: { label: "Depreciation Recapture Tax", format: "currency" },
    calcResults: [
      { key: "depreciationRecaptureTax", label: "Depreciation Recapture Tax", format: "currency", highlight: true },
      { key: "totalTaxOnSale", label: "Total Federal Tax on the Sale", format: "currency" },
      { key: "totalDepreciation", label: "Total Depreciation", format: "currency" },
      { key: "adjustedBasis", label: "Adjusted Basis", format: "currency" },
      { key: "totalGain", label: "Total Gain", format: "currency" },
      { key: "capitalGainsTax", label: "Capital Gains Tax (Rest of Gain)", format: "currency" },
      { key: "netInvestmentIncomeTax", label: "Net Investment Income Tax", format: "currency" },
    ],
    instructions: "Enter what you paid, improvements and the land share (from your tax assessment), the property type and how long you depreciated it — or the actual depreciation from your tax returns. Then the sale price, selling costs and your tax rates.",
    examples: "Example: a $300,000 rental (20% land) depreciated for 10 years has $87,272.73 of depreciation. Selling for $450,000 with $27,000 of costs gives a $210,272.73 gain; recapture at 25% is $21,818.18 and 15% on the rest adds $18,450.00 — $40,268.18 in total.",
    assumptions: "Unrecaptured §1250 gain (the depreciation, up to the gain) is taxed at your ordinary rate but no more than 25%. Depreciation 'allowed or allowable' is recaptured even if you didn't claim it. NIIT applies above $200,000 single / $250,000 joint MAGI. State tax isn't included. A 1031 exchange defers both recapture and capital gains.",
    faq: [
      { question: "What is depreciation recapture on rental property?", answer: "When you sell, the depreciation you took (or could have taken) is taxed at up to 25%, separately from the rest of the gain." },
      { question: "How can I avoid depreciation recapture?", answer: "Defer it with a 1031 exchange, or hold until death, when heirs get a stepped-up basis." },
    ],
  },
  {
    slug: "nj-exit-tax-calculator",
    title: "NJ Exit Tax Calculator",
    category: CAT,
    description: "Estimate New Jersey's 'exit tax' — the estimated income tax payment a nonresident seller must make at closing: the greater of 10.75% of the gain or 2% of the sale price — and when you're exempt.",
    metaTitle: "NJ Exit Tax Calculator — Nonresident Seller Estimated Tax",
    metaDescription: "Free NJ exit tax calculator. Estimate the GIT/REP payment due at closing for a nonresident seller: 10.75% of the gain or 2% of the price.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { default: 500000, max: 100000000, step: 1000 }),
      currencyField("adjustedBasis", "Adjusted Basis (Price Paid + Improvements)", { default: 400000, max: 100000000, step: 1000 }),
      currencyField("sellingCosts", "Selling Costs", { default: 30000, max: 5000000, step: 500 }),
      YN("nonResident", "Seller Is a Nonresident of New Jersey at Closing", 1),
      YN("section121Exempt", "Gain Fully Excluded as a Main Home (§121)", 0),
      percentField("ownershipPercent", "Your Ownership Share", { default: 100, max: 100, step: 1 }),
    ],
    calcResult: { label: "Payment Due at Closing", format: "currency" },
    calcResults: [
      { key: "estimatedPaymentAtClosing", label: "Estimated Tax Payment at Closing", format: "currency", highlight: true },
      { key: "tenPointSevenFivePercentOfGain", label: "10.75% of the Gain", format: "currency" },
      { key: "twoPercentOfPrice", label: "2% of the Sale Price", format: "currency" },
      { key: "gainOnSale", label: "Gain on Sale", format: "currency" },
      { key: "usesTwoPercentMinimum", label: "2% Minimum Applies? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the sale price, your adjusted basis and selling costs. Choose whether you're a nonresident at closing (residents sign a GIT/REP-3 and pay nothing at closing) and whether the gain is fully excluded as your main home.",
    examples: "Example: a nonresident selling for $500,000 with a $400,000 basis and $30,000 of costs has a $70,000 gain; 10.75% of it is $7,525.00, but the 2% minimum ($10,000.00) is higher, so $10,000.00 is withheld at closing.",
    assumptions: "The exit tax isn't a separate tax — it's a prepayment of NJ income tax under N.J.S.A. 54A:8-8 (form GIT/REP-1), credited on your NJ-1040NR. If the real tax is lower, you get a refund. Exempt: residents, sales of a principal residence qualifying for the full §121 exclusion, sales of $1,000 or less, and some transfers (GIT/REP-3).",
    faq: [
      { question: "What is the NJ exit tax?", answer: "An estimated tax nonresident sellers pay at closing: the greater of 10.75% of the gain or 2% of the sale price." },
      { question: "Do I get the NJ exit tax back?", answer: "If your actual NJ tax on the gain is lower, you get the difference back when you file an NJ nonresident return." },
    ],
  },
  {
    slug: "nyc-transfer-tax-calculator",
    title: "NYC Transfer Tax Calculator",
    category: CAT,
    description: "Calculate New York City and New York State transfer taxes on a sale — the NYC RPTT (1% / 1.425% residential, 1.425% / 2.625% commercial), the state transfer tax and the buyer's mansion tax.",
    metaTitle: "NYC Transfer Tax Calculator — RPTT, NYS Tax & Mansion Tax",
    metaDescription: "Free NYC transfer tax calculator. Calculate the NYC RPTT, New York State transfer tax and mansion tax for residential or commercial sales.",
    calcInputs: [TRANSFER_PRICE(1500000), dropdown("commercial", "Property Type", [["Residential (1–3 Family, Condo, Co-op)", 0], ["Commercial / Other", 1]], 0)],
    calcResult: { label: "Total Transfer Taxes", format: "currency" },
    calcResults: [
      { key: "totalTransferTaxes", label: "Total Transfer Taxes", format: "currency", highlight: true },
      { key: "nycRptt", label: "NYC Real Property Transfer Tax", format: "currency" },
      { key: "nysTransferTax", label: "New York State Transfer Tax", format: "currency" },
      { key: "mansionTax", label: "Mansion Tax (Buyer)", format: "currency" },
      { key: "sellerPays", label: "Seller Typically Pays", format: "currency" },
      { key: "buyerPays", label: "Buyer Typically Pays", format: "currency" },
    ],
    instructions: "Enter the sale price and choose residential or commercial. Sellers usually pay the RPTT and state tax; buyers pay the mansion tax on residential purchases of $1 million or more.",
    examples: "Example: a $1,500,000 NYC condo sale owes $21,375.00 of RPTT (1.425%) and $6,000.00 of state tax (0.4%), paid by the seller, plus a $15,000.00 mansion tax (1.25%) paid by the buyer — $42,375.00 in total.",
    assumptions: "NYC RPTT: residential 1% up to $500,000 and 1.425% above; commercial 1.425% and 2.625%. NYS transfer tax: 0.4%, rising to 0.65% for NYC residential sales of $3 million+ and commercial sales of $2 million+. Mansion tax in NYC: 1% from $1 million, rising in steps to 3.9% from $25 million. In new developments the buyer often pays the seller's transfer taxes.",
    faq: [
      { question: "How much is transfer tax in NYC?", answer: "About 1.4–2.1% for most residential sellers (city plus state), plus the buyer's mansion tax from $1 million." },
      { question: "Who pays the NYC mansion tax?", answer: "The buyer, on residential purchases of $1 million or more." },
    ],
  },
  {
    slug: "miami-dade-doc-stamp-calculator",
    title: "Miami Dade Doc Stamp Calculator",
    category: CAT,
    description: "Calculate Miami-Dade documentary stamp taxes — 0.60% on the deed for single-family homes (1.05% with the surtax for other property), 0.35% on the mortgage note and the 0.2% intangible tax.",
    metaTitle: "Miami-Dade Doc Stamp Calculator — Deed, Note & Intangible Tax",
    metaDescription: "Free Miami-Dade doc stamp calculator. Calculate deed doc stamps, the surtax, note stamps and intangible tax on a Miami-Dade purchase.",
    calcInputs: [
      TRANSFER_PRICE(600000),
      currencyField("mortgageAmount", "Mortgage Amount", { default: 480000, max: 100000000, step: 1000, required: false }),
      YN("singleFamily", "Single-Family Residence (No Surtax)", 1),
    ],
    calcResult: { label: "Total Doc Stamps & Taxes", format: "currency" },
    calcResults: [
      { key: "totalDocStampsAndTaxes", label: "Total Doc Stamps & Taxes", format: "currency", highlight: true },
      { key: "deedDocStamps", label: "Deed Doc Stamps (0.60%)", format: "currency" },
      { key: "discretionarySurtax", label: "Discretionary Surtax (0.45%)", format: "currency" },
      { key: "noteDocStamps", label: "Note Doc Stamps (0.35%)", format: "currency" },
      { key: "intangibleTax", label: "Intangible Tax (0.2%)", format: "currency" },
      { key: "sellerTypicallyPays", label: "Seller Typically Pays", format: "currency" },
      { key: "buyerTypicallyPays", label: "Buyer Typically Pays", format: "currency" },
    ],
    instructions: "Enter the sale price and the buyer's mortgage amount. Choose whether the property is a single-family residence — condos count as single-family residences for the surtax; commercial and multi-family property pays the 0.45% surtax.",
    examples: "Example: a $600,000 Miami-Dade home with a $480,000 mortgage owes $3,600.00 of deed stamps (seller) and $1,680.00 of note stamps plus $960.00 of intangible tax (buyer) — $6,240.00 in total.",
    assumptions: "Miami-Dade is the only Florida county with a deed rate of $0.60 per $100 (other counties pay $0.70); its 0.45% discretionary surtax applies to transfers other than single-family residences. Note stamps ($0.35 per $100) and the intangible tax ($2 per $1,000) apply to new mortgages statewide. In Miami-Dade the buyer customarily pays for the owner's title policy.",
    faq: [
      { question: "How much are doc stamps in Miami-Dade?", answer: "0.60% of the price on the deed for single-family homes, 1.05% for other property, plus 0.35% on any mortgage note." },
      { question: "Who pays doc stamps in Florida?", answer: "Customarily the seller pays the deed stamps and the buyer pays the note stamps and intangible tax." },
    ],
  },
  {
    slug: "chicago-transfer-tax-calculator",
    title: "Chicago Transfer Tax Calculator",
    category: CAT,
    description: "Calculate real estate transfer taxes in Chicago and suburban Cook County — Illinois state tax, the Cook County tax, Chicago's city tax and CTA portion, or a suburb's municipal tax — and who pays each.",
    metaTitle: "Chicago & Cook County Transfer Tax Calculator",
    metaDescription: "Free Chicago transfer tax calculator. Calculate Illinois, Cook County and Chicago city transfer taxes (or suburban municipal tax) and the buyer/seller split.",
    calcInputs: [
      TRANSFER_PRICE(400000),
      dropdown("inChicago", "Location", [["City of Chicago", 1], ["Suburban Cook County", 0]], 1),
      percentField("municipalRate", "Suburb's Municipal Transfer Tax (If Any)", { default: 0, max: 2, step: 0.05, required: false }),
      YN("municipalPaidByBuyer", "Suburb's Tax Paid by the Buyer", 0),
    ],
    calcResult: { label: "Total Transfer Tax", format: "currency" },
    calcResults: [
      { key: "totalTransferTax", label: "Total Transfer Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "Illinois State Tax (0.1%)", format: "currency" },
      { key: "cookCountyTax", label: "Cook County Tax (0.05%)", format: "currency" },
      { key: "chicagoCityTax", label: "Chicago City Tax (0.75% Buyer + 0.3% CTA)", format: "currency" },
      { key: "municipalTax", label: "Suburban Municipal Tax", format: "currency" },
      { key: "buyerPays", label: "Buyer Pays", format: "currency" },
      { key: "sellerPays", label: "Seller Pays", format: "currency" },
    ],
    instructions: "Enter the sale price and choose Chicago or suburban Cook County. For a suburb, enter its municipal transfer tax (for example Evanston, Oak Park and others charge their own) and who pays it.",
    examples: "Example: a $400,000 Chicago sale owes $400.00 of state tax, $200.00 of county tax and $4,200.00 of city tax — $4,800.00 in total. The buyer pays $3,000.00 (city 0.75%) and the seller $1,800.00.",
    assumptions: "Illinois charges $0.50 per $500 and Cook County $0.25 per $500, both customarily paid by the seller. Chicago charges the buyer $3.75 per $500 and the seller $1.50 per $500 for the CTA. The 2024 'Bring Chicago Home' proposal to raise the city tax on sales over $1 million did not pass. Many suburbs charge their own rates; exemptions exist for some transfers.",
    faq: [
      { question: "What is the transfer tax in Chicago?", answer: "1.2% in total on most sales: 0.75% city (buyer), 0.3% CTA (seller) and 0.15% state and county (seller)." },
      { question: "What is the Cook County transfer tax?", answer: "$0.25 per $500 (0.05%), on top of Illinois's $0.50 per $500 (0.1%)." },
    ],
  },
  {
    slug: "san-francisco-transfer-tax-calculator",
    title: "San Francisco Transfer Tax Calculator",
    category: CAT,
    description: "Calculate San Francisco's real property transfer tax — one rate on the whole price, from 0.5% up to $250,000 to 6% above $25 million.",
    metaTitle: "San Francisco Transfer Tax Calculator — SF Rates",
    metaDescription: "Free San Francisco transfer tax calculator. Find the SF real property transfer tax rate and amount for any sale price.",
    calcInputs: [TRANSFER_PRICE(1500000)],
    calcResult: { label: "Transfer Tax", format: "currency" },
    calcResults: [
      { key: "transferTax", label: "San Francisco Transfer Tax", format: "currency", highlight: true },
      { key: "rateApplied", label: "Rate Applied to the Whole Price", format: "percentage" },
      { key: "perThousand", label: "Tax per $1,000", format: "currency" },
      { key: "netAfterTax", label: "Price Minus Transfer Tax", format: "currency" },
    ],
    instructions: "Enter the sale price. San Francisco applies the rate for the bracket the price falls in to the entire price, so crossing a threshold raises the tax on every dollar.",
    examples: "Example: a $1,500,000 sale falls in the $1M–$5M bracket, so 0.75% applies to the whole price: $11,250.00.",
    assumptions: "Rates: $100–$250,000 0.5%; $250,000–$1M 0.68%; $1M–$5M 0.75%; $5M–$10M 2.25%; $10M–$25M 5.5%; over $25M 6% (Prop W and Prop I). It replaces the county's $0.55 per $500 tax. Custom says the seller pays, but it's negotiable.",
    faq: [
      { question: "What is the San Francisco transfer tax rate?", answer: "0.5% to 6% of the whole price, depending on the price bracket — 0.75% for $1–5 million." },
      { question: "Who pays transfer tax in San Francisco?", answer: "Usually the seller, though it can be negotiated." },
    ],
  },
  {
    slug: "tennessee-transfer-tax-calculator",
    title: "Tennessee Transfer Tax Calculator",
    category: CAT,
    description: "Calculate Tennessee's realty transfer tax ($0.37 per $100) and mortgage tax ($0.115 per $100 over $2,000), which are customarily paid by the buyer, plus recording fees.",
    metaTitle: "Tennessee Transfer Tax Calculator — Transfer & Mortgage Tax",
    metaDescription: "Free Tennessee transfer tax calculator. Calculate the 0.37% realty transfer tax, the mortgage tax and recording fees on a Tennessee purchase.",
    calcInputs: [
      TRANSFER_PRICE(400000),
      currencyField("mortgageAmount", "Mortgage Amount", { default: 320000, max: 100000000, step: 1000, required: false }),
      currencyField("recordingFees", "Recording Fees", { default: 100, max: 2000, step: 5, required: false }),
    ],
    calcResult: { label: "Total Taxes", format: "currency" },
    calcResults: [
      { key: "totalTaxes", label: "Total Transfer, Mortgage Tax & Fees", format: "currency", highlight: true },
      { key: "transferTax", label: "Realty Transfer Tax (0.37%)", format: "currency" },
      { key: "mortgageTax", label: "Mortgage Tax (0.115%)", format: "currency" },
      { key: "recordingFees", label: "Recording Fees", format: "currency" },
    ],
    instructions: "Enter the sale price and the buyer's mortgage amount. Add the county register's recording fees if you know them.",
    examples: "Example: a $400,000 Tennessee home with a $320,000 mortgage owes $1,480.00 of transfer tax and $365.70 of mortgage tax; with $100 of recording fees the buyer pays $1,945.70.",
    assumptions: "Tennessee's realty transfer tax is $0.37 per $100 of the price (or value); the indebtedness (mortgage) tax is $0.115 per $100 of the loan above $2,000. Both are customarily paid by the buyer in Tennessee, though the contract decides.",
    faq: [
      { question: "Who pays transfer tax in Tennessee?", answer: "Customarily the buyer, along with the mortgage tax." },
      { question: "How much is the Tennessee transfer tax?", answer: "$0.37 per $100 — $1,110 on a $300,000 home." },
    ],
  },
  {
    slug: "wisconsin-transfer-tax-calculator",
    title: "Wisconsin Transfer Tax Calculator",
    category: CAT,
    description: "Calculate Wisconsin's real estate transfer fee — $0.30 per $100 of the sale price ($3 per $1,000), paid by the seller.",
    metaTitle: "Wisconsin Transfer Tax Calculator — Real Estate Transfer Fee",
    metaDescription: "Free Wisconsin transfer tax calculator. Calculate the $3 per $1,000 real estate transfer fee on a Wisconsin sale.",
    calcInputs: [TRANSFER_PRICE(300000), YN("exempt", "Exempt Transfer (Gift, Family, Under $1,000, etc.)", 0)],
    calcResult: { label: "Transfer Fee", format: "currency" },
    calcResults: [
      { key: "transferFee", label: "Wisconsin Transfer Fee", format: "currency", highlight: true },
      { key: "feePerThousand", label: "Fee per $1,000", format: "currency" },
      { key: "netToSeller", label: "Price Minus Transfer Fee", format: "currency" },
    ],
    instructions: "Enter the sale price. If the transfer is exempt under Wis. Stat. 77.25 (for example between parent and child for no payment, or by gift), mark it exempt.",
    examples: "Example: a $300,000 Wisconsin sale owes a $900.00 transfer fee ($3 per $1,000), paid by the seller.",
    assumptions: "The fee is $0.30 for each $100 of value or fraction of $100, filed with an electronic real estate transfer return (eRETR). The seller (grantor) customarily pays. There's no separate county or city transfer tax in Wisconsin.",
    faq: [
      { question: "How much is the Wisconsin transfer tax?", answer: "$3 per $1,000 of the sale price — 0.3%." },
      { question: "Who pays the transfer fee in Wisconsin?", answer: "The seller customarily pays it." },
    ],
  },
  {
    slug: "colorado-transfer-tax-calculator",
    title: "Colorado Transfer Tax Calculator",
    category: CAT,
    description: "Calculate Colorado's state documentary fee (a penny per $100) and local real estate transfer taxes in resort towns such as Aspen, Telluride, Breckenridge, Vail and Avon.",
    metaTitle: "Colorado Transfer Tax Calculator — Documentary Fee & RETT",
    metaDescription: "Free Colorado transfer tax calculator. Calculate the state documentary fee and local transfer taxes in Aspen, Telluride, Vail, Breckenridge and Avon.",
    calcInputs: [
      TRANSFER_PRICE(2000000),
      dropdown("town", "Local Transfer Tax", [["None (Most of Colorado)", 0], ["Aspen (1.5%)", 1], ["Telluride (3%)", 2], ["Breckenridge (1%)", 3], ["Vail (1%)", 4], ["Avon (2%)", 5], ["Other — Enter Rate", 6]], 1),
      percentField("customRate", "Other Town's Rate", { default: 0, max: 5, step: 0.05, required: false }),
    ],
    calcResult: { label: "Total Transfer Taxes", format: "currency" },
    calcResults: [
      { key: "totalTransferTaxes", label: "Total Transfer Taxes", format: "currency", highlight: true },
      { key: "stateDocumentaryFee", label: "State Documentary Fee", format: "currency" },
      { key: "localTransferTax", label: "Local Transfer Tax", format: "currency" },
      { key: "localRate", label: "Local Rate", format: "percentage" },
    ],
    instructions: "Enter the sale price and pick the town's local real estate transfer tax, if any. Most Colorado cities have none — only the state's tiny documentary fee applies.",
    examples: "Example: a $2,000,000 Aspen sale owes a $200.00 state documentary fee and $30,000.00 of Aspen transfer taxes (1.5%) — $30,200.00 in total.",
    assumptions: "Colorado's documentary fee is $0.01 per $100 of price, usually paid by the buyer. Colorado's constitution (TABOR) bars new transfer taxes, so only towns that had them before 1992 — mostly mountain resorts — charge one. Many have exemptions (for example for primary residences or the first part of the price); check with the town.",
    faq: [
      { question: "Does Colorado have a transfer tax?", answer: "Only a tiny state documentary fee ($0.01 per $100), plus local taxes in some resort towns." },
      { question: "What is the Aspen transfer tax?", answer: "About 1.5% (a 1% housing tax and a 0.5% Wheeler Opera House tax), with some exemptions." },
    ],
  },
  {
    slug: "philadelphia-transfer-tax-calculator",
    title: "Philadelphia Transfer Tax Calculator",
    category: CAT,
    description: "Calculate Philadelphia's realty transfer tax — 3.578% to the city plus 1% to Pennsylvania (4.578% in total) — and the split between buyer and seller.",
    metaTitle: "Philadelphia Transfer Tax Calculator — 4.578% City + State",
    metaDescription: "Free Philadelphia transfer tax calculator. Calculate the 3.578% city and 1% state realty transfer tax and the buyer and seller shares.",
    calcInputs: [
      TRANSFER_PRICE(300000),
      currencyField("assessedValue", "Computed Value (If Higher, e.g. Non-Arm's-Length Sale)", { default: 0, max: 100000000, step: 1000, required: false }),
      percentField("buyerSharePercent", "Buyer's Share", { default: 50, max: 100, step: 5 }),
    ],
    calcResult: { label: "Total Transfer Tax", format: "currency" },
    calcResults: [
      { key: "totalTransferTax", label: "Total Transfer Tax (4.578%)", format: "currency", highlight: true },
      { key: "cityTax", label: "Philadelphia Tax (3.578%)", format: "currency" },
      { key: "stateTax", label: "Pennsylvania Tax (1%)", format: "currency" },
      { key: "buyerPays", label: "Buyer Pays", format: "currency" },
      { key: "sellerPays", label: "Seller Pays", format: "currency" },
    ],
    instructions: "Enter the sale price and how the tax is split — 50/50 is the custom. For family or below-market transfers, the tax is based on the computed value (assessed value × common level ratio); enter it if it's higher than the price.",
    examples: "Example: a $300,000 Philadelphia home owes $10,734.00 of city tax and $3,000.00 of state tax — $13,734.00 in total, or $6,867.00 each for buyer and seller.",
    assumptions: "Philadelphia's realty transfer tax is 3.578% (since July 2018) plus Pennsylvania's 1%. Some first-time buyers in Philadelphia can get a city transfer tax credit through approved homeownership counseling programs. Transfers between family members are exempt from the state tax in some cases but may still owe the city tax.",
    faq: [
      { question: "What is the transfer tax in Philadelphia?", answer: "4.578% in total — 3.578% city and 1% state — usually split equally." },
      { question: "Who pays transfer tax in Philadelphia?", answer: "Buyer and seller customarily split it 50/50." },
    ],
  },
  {
    slug: "nsw-stamp-duty-calculator",
    title: "NSW Stamp Duty Calculator",
    category: CAT,
    description: "Calculate NSW stamp (transfer) duty on a home or land purchase using the 2025–26 rates — with the First Home Buyers Assistance Scheme exemption and concession and the 9% foreign purchaser surcharge.",
    metaTitle: "NSW Stamp Duty Calculator 2025–26 — Transfer Duty",
    metaDescription: "Free NSW stamp duty calculator. Calculate transfer duty at 2025–26 rates, first home buyer exemptions up to $800,000 and the foreign surcharge.",
    calcInputs: [
      numberField("propertyPrice", "Purchase Price", { unit: "A$", default: 1000000, max: 100000000, step: 1000 }),
      YN("firstHomeBuyer", "First Home Buyer (FHBAS)", 0),
      YN("vacantLand", "Vacant Land (to Build a Home)", 0),
      YN("foreignPurchaser", "Foreign Purchaser (9% Surcharge)", 0),
    ],
    calcResult: { label: "Total Duty", format: "currency", currency: "AUD" },
    calcResults: [
      { key: "totalDuty", label: "Total Stamp Duty", format: "currency", currency: "AUD", highlight: true },
      { key: "transferDuty", label: "Transfer Duty", format: "currency", currency: "AUD" },
      { key: "firstHomeSaving", label: "First Home Buyer Saving", format: "currency", currency: "AUD" },
      { key: "foreignSurcharge", label: "Foreign Purchaser Surcharge", format: "currency", currency: "AUD" },
      { key: "effectiveRate", label: "Effective Rate", format: "percentage" },
    ],
    instructions: "Enter the purchase price and tick the options that apply. First home buyers pay no duty on homes up to $800,000 and reduced duty up to $1,000,000 (vacant land: $350,000 and $450,000).",
    examples: "Example: a $1,000,000 home in NSW owes $39,412.50 of transfer duty. A first home buyer paying $900,000 gets a concession, paying about $17,456 instead of about $34,912.",
    assumptions: "2025–26 bands: $1.25 per $100 to $17,000 (minimum $20); $1.50 to $37,000; $1.75 to $99,000; $3.50 to $372,000; $4.50 to $1,240,000; $5.50 to $3,721,000; $7.00 above (premium property duty). Thresholds are indexed every July. The first home concession is modeled as a straight-line phase-out. Foreign purchasers pay a 9% surcharge on residential land.",
    faq: [
      { question: "How much is stamp duty in NSW?", answer: "About 3.5–4.5% of the price for most homes — around $39,400 on $1 million." },
      { question: "Do first home buyers pay stamp duty in NSW?", answer: "Not on homes up to $800,000, and reduced duty up to $1,000,000." },
    ],
  },
  {
    slug: "canada-land-transfer-tax-calculator",
    title: "Canada Land Transfer Tax Calculator",
    category: CAT,
    description: "Calculate land transfer tax anywhere in Canada — Ontario, Toronto's municipal tax, British Columbia, Manitoba, Quebec's welcome tax, Nova Scotia, New Brunswick, PEI and the title fees in Alberta, Saskatchewan and Newfoundland — with first-time buyer rebates.",
    metaTitle: "Canada Land Transfer Tax Calculator — All Provinces",
    metaDescription: "Free Canada land transfer tax calculator. Calculate LTT in Ontario, Toronto, BC, Manitoba, Quebec and more, with first-time buyer rebates.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price (CAD)", { default: 900000, max: 100000000, step: 1000 }),
      dropdown("province", "Province / City", [
        ["Ontario", 0], ["Toronto", 1], ["British Columbia", 2], ["Manitoba", 3], ["Quebec (Welcome Tax)", 4], ["Nova Scotia", 5],
        ["New Brunswick", 6], ["Prince Edward Island", 7], ["Alberta (Title Fee)", 8], ["Newfoundland & Labrador", 9], ["Saskatchewan (Title Fee)", 10],
      ], 1),
      YN("firstTimeBuyer", "First-Time Home Buyer", 1),
      percentField("municipalRate", "Nova Scotia Municipal Rate", { default: 1.5, max: 2, step: 0.05, required: false }),
    ],
    calcResult: { label: "Total Land Transfer Tax", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "totalLandTransferTax", label: "Total Land Transfer Tax", format: "currency", currency: "CAD", highlight: true },
      { key: "provincialTax", label: "Provincial Tax / Fee", format: "currency", currency: "CAD" },
      { key: "municipalTax", label: "Municipal Tax", format: "currency", currency: "CAD" },
      { key: "firstTimeBuyerRebate", label: "First-Time Buyer Rebate", format: "currency", currency: "CAD" },
      { key: "effectiveRate", label: "Effective Rate", format: "percentage" },
    ],
    instructions: "Enter the price, pick the province (or Toronto for both the Ontario and Toronto taxes) and say whether you're a first-time buyer. For Nova Scotia, enter your municipality's deed transfer tax rate (Halifax 1.5%).",
    examples: "Example: a first-time buyer paying $900,000 in Toronto owes $14,475 of Ontario LTT and $14,475 of Toronto MLTT, less $8,475 of rebates — $20,475.00 in total.",
    assumptions: "Ontario: 0.5%/1%/1.5%/2%/2.5% bands, first-time rebate up to $4,000; Toronto adds the same bands to $2M then luxury rates to 8.6% above $20M, rebate up to $4,475. BC: 1%/2%/3%/5%, first-time exemption on the first $500,000 for homes up to $835,000 (phasing out to $860,000). Manitoba: 0–2% bands. Quebec welcome tax uses 2025 brackets (Montreal has higher top rates). NB and PEI 1%; Alberta and Saskatchewan charge title fees only.",
    faq: [
      { question: "Which provinces have no land transfer tax?", answer: "Alberta and Saskatchewan charge only small land title fees instead." },
      { question: "How much is land transfer tax in Toronto?", answer: "Roughly double Ontario's alone, because Toronto adds its own municipal land transfer tax." },
    ],
  },
  {
    slug: "italy-property-tax-calculator",
    title: "Italy Property Tax Calculator",
    category: CAT,
    description: "Calculate Italy's IMU property tax from the cadastral income (rendita catastale) — the 5% revaluation, the 160 multiplier, the local rate, the main-home exemption and the June and December instalments.",
    metaTitle: "Italy Property Tax Calculator — IMU from Rendita Catastale",
    metaDescription: "Free Italy property tax (IMU) calculator. Calculate IMU from the rendita catastale with the 160 multiplier, local rate and main home exemption.",
    calcInputs: [
      numberField("renditaCatastale", "Rendita Catastale (Cadastral Income)", { unit: "€", default: 800, max: 100000, step: 10 }),
      dropdown("multiplier", "Property Category", [["Homes, Garages, Cellars (A, C/2, C/6, C/7) — 160", 160], ["Offices A/10 — 80", 80], ["Shops C/1 — 55", 55], ["Group B / C/3 C/4 C/5 — 140", 140], ["Group D (Commercial) — 65", 65]], 160),
      YN("mainHome", "Main Home (Abitazione Principale)", 0),
      YN("luxuryCategory", "Luxury Category A/1, A/8 or A/9", 0),
      percentField("imuRate", "Local IMU Rate (Second Homes)", { default: 1.06, max: 1.14, step: 0.01 }),
      percentField("mainHomeLuxuryRate", "Local Rate for Luxury Main Homes", { default: 0.5, max: 0.6, step: 0.01, required: false }),
      percentField("ownershipPercent", "Your Ownership Share", { default: 100, max: 100, step: 1 }),
      numberField("monthsOwned", "Months Owned This Year", { default: 12, min: 1, max: 12 }),
    ],
    calcResult: { label: "Yearly IMU", format: "currency", currency: "EUR" },
    calcResults: [
      { key: "yearlyImu", label: "Yearly IMU", format: "currency", currency: "EUR", highlight: true },
      { key: "juneInstalment", label: "June 16 Instalment", format: "currency", currency: "EUR" },
      { key: "decemberInstalment", label: "December 16 Instalment", format: "currency", currency: "EUR" },
      { key: "taxableValue", label: "Taxable Value (Rendita × 1.05 × Multiplier)", format: "currency", currency: "EUR" },
      { key: "mainHomeExempt", label: "Main Home Exempt? (1 = Yes)", format: "number" },
    ],
    instructions: "Find the rendita catastale on your visura catastale (land registry extract). Pick the category, say whether it's your main home, and enter your comune's IMU rate (most charge 0.86–1.06% on second homes). Enter your share and months owned if you bought during the year.",
    examples: "Example: a second home with a rendita of €800 has a taxable value of €134,400 (800 × 1.05 × 160). At 1.06%, IMU is €1,424.64 a year — €712.32 each in June and December.",
    assumptions: "IMU doesn't apply to a non-luxury main home where you live and are resident. Luxury main homes (A/1, A/8, A/9) pay a reduced rate with a €200 deduction. Non-residents' Italian homes are second homes for IMU. Each comune sets its rate within national limits; TARI (waste tax) is billed separately.",
    faq: [
      { question: "How is IMU calculated in Italy?", answer: "Rendita catastale × 1.05 × the category multiplier (160 for homes) × the comune's IMU rate." },
      { question: "Do foreigners pay IMU on an Italian holiday home?", answer: "Yes — a home that isn't your Italian main residence is taxed as a second home." },
    ],
  },
  {
    slug: "mexico-property-tax-calculator",
    title: "Mexico Property Tax Calculator",
    category: CAT,
    description: "Estimate Mexico's property tax (predial) from the cadastral value, with early-payment and senior discounts, and the acquisition tax (ISAI) you pay when you buy.",
    metaTitle: "Mexico Property Tax Calculator — Predial & ISAI",
    metaDescription: "Free Mexico property tax calculator. Estimate yearly predial with early-payment and INAPAM senior discounts, and the ISAI acquisition tax.",
    calcInputs: [
      numberField("cadastralValue", "Cadastral Value (Valor Catastral)", { unit: "MXN", default: 2500000, max: 1000000000, step: 10000 }),
      percentField("predialRate", "Predial Rate (Municipality)", { default: 0.1, max: 2, step: 0.01 }),
      percentField("earlyPaymentDiscount", "Early Payment Discount (Jan–Feb)", { default: 8, max: 30, step: 1, required: false }),
      YN("seniorDiscount", "INAPAM / Senior or Retiree 50% Discount", 0),
      numberField("purchasePrice", "Purchase Price (for ISAI)", { unit: "MXN", default: 3000000, max: 1000000000, step: 10000, required: false }),
      percentField("isaiRate", "ISAI Acquisition Tax Rate", { default: 3, max: 6.5, step: 0.1, required: false }),
    ],
    calcResult: { label: "Yearly Predial", format: "currency", currency: "MXN" },
    calcResults: [
      { key: "yearlyPredial", label: "Yearly Predial", format: "currency", currency: "MXN", highlight: true },
      { key: "predialBeforeDiscounts", label: "Predial Before Discounts", format: "currency", currency: "MXN" },
      { key: "bimonthlyPredial", label: "Bimonthly Payment", format: "currency", currency: "MXN" },
      { key: "acquisitionTaxIsai", label: "ISAI Acquisition Tax (One-Time)", format: "currency", currency: "MXN" },
    ],
    instructions: "Enter the cadastral value from your predial bill (usually well below market value) and your municipality's rate. Add the early-payment discount for paying the whole year in January or February, and the INAPAM discount if you qualify. For a purchase, add the price and the state's ISAI rate.",
    examples: "Example: a home with a MXN 2,500,000 cadastral value at 0.1% owes MXN 2,500 a year; paying early with an 8% discount brings it to MXN 2,300.00. Buying at MXN 3,000,000 with a 3% ISAI costs MXN 90,000.00 once.",
    assumptions: "Predial is set by each municipality, often with progressive tables (Mexico City uses value ranges with a fixed fee plus a marginal rate); effective rates are typically 0.05–0.3% of cadastral value. ISAI is set by the state or municipality, typically 2–5% of the higher of price or appraised value. Foreigners pay the same predial as Mexicans.",
    faq: [
      { question: "How much is property tax in Mexico?", answer: "Usually very low — often 0.1–0.3% of the cadastral value, which is itself below market value." },
      { question: "What is ISAI in Mexico?", answer: "The one-time property acquisition tax paid by the buyer, typically 2–5% depending on the state." },
    ],
  },
  {
    slug: "property-tax-philippines-calculator",
    title: "Property Tax Philippines Calculator",
    category: CAT,
    description: "Calculate Philippine real property tax (amilyar) — assessed value from fair market value and assessment levels, the basic tax (1% province / 2% city or Metro Manila), the 1% SEF and the early-payment discount.",
    metaTitle: "Property Tax Philippines Calculator — Real Property Tax (RPT)",
    metaDescription: "Free Philippines real property tax calculator. Calculate RPT (amilyar) with assessment levels, basic tax, SEF and early-payment discounts.",
    calcInputs: [
      numberField("landFmv", "Land Fair Market Value", { unit: "₱", default: 2000000, max: 1000000000, step: 10000 }),
      percentField("landAssessmentLevel", "Land Assessment Level (Residential Max 20%)", { default: 20, max: 80, step: 1 }),
      numberField("buildingFmv", "Building Fair Market Value", { unit: "₱", default: 1500000, max: 1000000000, step: 10000 }),
      YN("inCityOrMetroManila", "In a City or Metro Manila Municipality (2% Basic Rate)", 1),
      percentField("earlyPaymentDiscount", "Advance / Prompt Payment Discount", { default: 10, max: 20, step: 1, required: false }),
    ],
    calcResult: { label: "Yearly Real Property Tax", format: "currency", currency: "PHP" },
    calcResults: [
      { key: "yearlyRealPropertyTax", label: "Yearly Real Property Tax", format: "currency", currency: "PHP", highlight: true },
      { key: "quarterlyPayment", label: "Quarterly Payment", format: "currency", currency: "PHP" },
      { key: "assessedValue", label: "Total Assessed Value", format: "currency", currency: "PHP" },
      { key: "basicTax", label: "Basic Real Property Tax", format: "currency", currency: "PHP" },
      { key: "specialEducationFund", label: "Special Education Fund (1%)", format: "currency", currency: "PHP" },
      { key: "buildingAssessmentLevel", label: "Building Assessment Level", format: "percentage" },
    ],
    instructions: "Enter the land and building fair market values from your tax declaration (the LGU's schedule of market values), the land assessment level and whether the property is in a city or Metro Manila. Add the LGU's discount for paying in advance or on time.",
    examples: "Example: in a city, land worth ₱2,000,000 (assessed at 20%) and a ₱1,500,000 house (assessed at 35%) have a ₱925,000 assessed value. The 2% basic tax (₱18,500) plus 1% SEF (₱9,250), less a 10% early-payment discount, comes to ₱24,975.00 a year.",
    assumptions: "Under the Local Government Code, residential land is assessed at up to 20% and residential buildings on a sliding scale from 0% (up to ₱175,000) to 60% (over ₱10 million). Basic RPT is up to 1% in provinces and 2% in cities and Metro Manila, plus 1% SEF. The 2024 Real Property Valuation and Assessment Reform Act (RA 12001) is phasing in updated market value schedules.",
    faq: [
      { question: "How is real property tax computed in the Philippines?", answer: "Fair market value × assessment level = assessed value; × the basic rate (1–2%) plus the 1% SEF." },
      { question: "When is amilyar due?", answer: "Annually by January 31 for a discount, or quarterly by March 31, June 30, September 30 and December 31." },
    ],
  },
  {
    slug: "commercial-stamp-duty-calculator",
    title: "Commercial Stamp Duty Calculator",
    category: CAT,
    description: "Calculate stamp duty on commercial and mixed-use property in the UK — non-residential SDLT in England and Northern Ireland, LBTT in Scotland and LTT in Wales.",
    metaTitle: "Commercial Stamp Duty Calculator — Non-Residential SDLT, LBTT, LTT",
    metaDescription: "Free commercial stamp duty calculator. Calculate non-residential and mixed-use SDLT (England/NI), LBTT (Scotland) and LTT (Wales).",
    calcInputs: [
      numberField("purchasePrice", "Purchase Price", { unit: "£", default: 500000, max: 500000000, step: 1000 }),
      dropdown("region", "Where Is the Property?", [["England / Northern Ireland (SDLT)", 0], ["Scotland (LBTT)", 1], ["Wales (LTT)", 2]], 0),
    ],
    calcResult: { label: "Stamp Duty", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "stampDuty", label: "Stamp Duty / Land Tax", format: "currency", currency: "GBP", highlight: true },
      { key: "effectiveRate", label: "Effective Rate", format: "percentage" },
      { key: "totalCost", label: "Price + Tax", format: "currency", currency: "GBP" },
    ],
    instructions: "Enter the price of the commercial or mixed-use property (offices, shops, land, farms, or a home with a shop) and pick the nation. Rates apply in slices, like income tax.",
    examples: "Example: a £500,000 commercial property in England pays 0% on the first £150,000, 2% on the next £100,000 (£2,000) and 5% on the remaining £250,000 (£12,500) — £14,500.00 in total.",
    assumptions: "Non-residential SDLT: 0% to £150,000, 2% to £250,000, 5% above. Scotland LBTT: 0% to £150,000, 1% to £250,000, 5% above. Wales LTT: 0% to £225,000, 1% to £250,000, 5% to £1 million, 6% above. Commercial leases are taxed on the lease's net present value under separate rules not covered here.",
    faq: [
      { question: "How much is stamp duty on commercial property?", answer: "In England, 0% up to £150,000, 2% up to £250,000 and 5% above — £14,500 on £500,000." },
      { question: "Does mixed-use property pay commercial stamp duty?", answer: "Yes — property with both residential and non-residential parts uses the non-residential rates." },
    ],
  },
];

async function main() {
  const categoryIds = new Map<string, string>();
  for (const slug of new Set(TOOLS.map((t) => t.category))) {
    const c = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!c) throw new Error(`The "${slug}" category doesn't exist — run "npx tsx prisma/restructure-real-estate-main-category.ts --apply" first.`);
    categoryIds.set(slug, c.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: categoryIds.get(def.category)!,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
