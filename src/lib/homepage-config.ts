import { z } from "zod";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

// Home page settings, edited at /admin/homepage. The site has 3 home page
// designs; `activeDesign` picks the one shown. Every piece of home page
// content lives here (not in code) so the admin controls all of it. Each
// design keeps its own content block, so switching designs never loses
// what was set up for another.

const KEY = "homepage";

export const HOME_DESIGNS = [
  { id: 1, name: "Design 1 — Calculator Hub", ready: true },
  { id: 2, name: "Design 2 — Category Showcase", ready: true },
  { id: 3, name: "Design 3 — Clean Library", ready: true },
] as const;

const iconItemSchema = z.object({
  categorySlug: z.string(),
  label: z.string().default(""), // "" = category name
  icon: z.string().default(""), // "" = picked from the category's slug
});

const sectionSchema = z.object({
  categorySlug: z.string(),
  heading: z.string().default(""), // "" = category name
  toolSlugs: z.array(z.string()).default([]), // pinned first; the rest filled automatically
});

const logoSchema = z.object({
  name: z.string().default(""),
  imageUrl: z.string().default(""),
  url: z.string().default(""),
});

export const design1Schema = z.object({
  // Hero
  title: z.string().default(""), // "" = site name
  subtitle: z.string().default("Free, fast and accurate calculators for money, math and everyday life."), // "" = hidden
  showCalculator: z.boolean().default(true),
  calculatorPlaceholder: z.string().default("Type your calculation, e.g. 25% of 480 or sin(30)"),
  showSearch: z.boolean().default(true),
  searchPlaceholder: z.string().default("Search calculators…"),
  exploreText: z.string().default("Explore more than {count} calculators in different categories."),
  // Category icon grid
  showIconGrid: z.boolean().default(true),
  iconItems: z.array(iconItemSchema).default([]), // [] = automatic
  // About band
  showAbout: z.boolean().default(true),
  aboutHeading: z.string().default(""), // "" = "About {siteName}"
  aboutText: z.string().default(""), // paragraphs separated by a blank line; "" = default text
  // Category link sections
  showSections: z.boolean().default(true),
  sections: z.array(sectionSchema).default([]), // [] = automatic (biggest categories)
  autoSectionCount: z.number().int().min(1).max(30).default(8),
  linksPerSection: z.number().int().min(3).max(31).default(11),
  // Featured In logos
  showFeatured: z.boolean().default(false),
  featuredHeading: z.string().default("Featured In"),
  featuredLogos: z.array(logoSchema).default([]),
  // SEO
  metaTitle: z.string().default(""),
  metaDescription: z.string().default(""),
});

// ---------------------------------------------------------------------------
// Design 2 — Category Showcase (modelled on allcalculatortools.com): hero with
// an illustration, feature row, category cards, popular calculators, 3 steps,
// two rich-text columns, category guides, use cases, FAQ and latest blogs.
// In any text, {siteName} and {count} (published calculators) are filled in.
// Icons are emoji. Empty category / calculator lists mean "automatic".

const chipSchema = z.object({
  text: z.string().default(""),
  color: z.enum(["green", "blue", "gray", "amber", "purple"]).default("gray"),
});
const iconTextSchema = z.object({
  icon: z.string().default(""),
  title: z.string().default(""),
  text: z.string().default(""),
});
const d2CategorySchema = z.object({
  categorySlug: z.string(),
  icon: z.string().default(""), // "" = picked from the slug
  title: z.string().default(""), // "" = category name
  description: z.string().default(""), // "" = the category's hero text
});
const d2ToolSchema = z.object({
  toolSlug: z.string(),
  icon: z.string().default(""),
});
const d2GuideSchema = z.object({
  categorySlug: z.string(),
  icon: z.string().default(""),
  title: z.string().default(""),
  text: z.string().default(""),
  toolSlugs: z.array(z.string()).default([]), // pinned first; the rest filled automatically
});
const d2UseCaseSchema = z.object({
  icon: z.string().default(""),
  title: z.string().default(""),
  text: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});
const faqSchema = z.object({ question: z.string().default(""), answer: z.string().default("") });

const D2_INFO_LEFT = `<h2>What Are Free Online Calculator Tools?</h2>
<p>Free online calculators are browser-based tools that perform financial, mathematical and everyday calculations instantly — without requiring any software installation, account creation, or payment. They help students, homeowners, professionals, entrepreneurs, and everyday users handle common calculations in seconds.</p>
<p>At {siteName}, calculators use established formulas, with the method explained on each tool page. Whether you need to estimate compound interest, plan a loan, or check your debt-to-income ratio for a mortgage application — we have a tool for it.</p>
<h3>Why Use Our Calculators?</h3>
<ul><li>All {count} tools are completely free — no subscription, no hidden fees</li><li>Results appear instantly as you type, with no page reloads</li><li>Works on every device — phone, tablet, or desktop</li><li>No personal data collected — calculations stay in your browser</li><li>Each tool includes explanations, formulas, and usage guides</li></ul>`;

const D2_INFO_RIGHT = `<h2>Are Free Online Calculators Accurate?</h2>
<p>Our calculators are accurate for estimation and planning purposes. Every tool uses the same standard formulas referenced in textbooks, government publications, and professional practice — such as loan amortization methods, percentage and growth formulas, and other documented calculation methods.</p>
<p>Accuracy depends on entering correct inputs. For critical decisions — such as a tax filing or a major loan — we always recommend consulting a qualified professional alongside using our tools as a starting reference point.</p>
<h3>Who Uses {siteName}?</h3>
<ul><li>Students — for math and percentage calculations</li><li>Homeowners — for mortgage, loan, and renovation planning</li><li>Entrepreneurs — for break-even, pricing, and profit tools</li><li>Investors — for ROI, compound growth, and return tracking</li><li>Families — for budgeting, saving, and everyday money decisions</li></ul>`;

export const design2Schema = z.object({
  // Hero
  heroBadge: z.string().default("Free · Instant · No sign-up required"),
  heroTitleLine1: z.string().default("Free Online"),
  heroTitleHighlight: z.string().default("Calculator Tools"),
  heroTitleLine3: z.string().default("for Every Need"),
  heroText: z
    .string()
    .default(
      "Finance, loan, tax, investment and everyday calculators — all in one place. Get instant accurate results without any sign-up, subscription, or hidden fees."
    ),
  heroChips: z.array(chipSchema).default([
    { text: "{count}+ Free Calculators", color: "green" },
    { text: "No Registration", color: "blue" },
    { text: "Mobile Friendly", color: "gray" },
    { text: "Privacy Safe", color: "gray" },
  ]),
  heroImageUrl: z.string().default(""), // "" = built-in illustration
  // Feature row
  showFeatures: z.boolean().default(true),
  features: z.array(iconTextSchema).default([
    { icon: "⚡", title: "Instant Results", text: "Get answers in real time as you type — no loading, no waiting." },
    { icon: "🔒", title: "Privacy Safe", text: "All calculations happen in your browser. We never store your data." },
    { icon: "✅", title: "Proven Formulas", text: "Built on standard, peer-reviewed formulas used by professionals worldwide." },
    { icon: "📱", title: "Works Everywhere", text: "Fully responsive — use on any phone, tablet, or desktop device." },
  ]),
  // Category cards
  showCategories: z.boolean().default(true),
  categoriesEyebrow: z.string().default("Browse by category"),
  categoriesHeading: z.string().default("Free Calculator Tools for Every Purpose"),
  categoriesText: z.string().default("From managing money to planning your future — find the right calculator in seconds."),
  categoriesLinkText: z.string().default("Tools List"),
  categoryCards: z.array(d2CategorySchema).default([]),
  autoCategoryCount: z.number().int().min(1).max(30).default(9),
  // Popular calculators
  showPopular: z.boolean().default(true),
  popularEyebrow: z.string().default("Most used"),
  popularHeading: z.string().default("Popular Free Online Calculators"),
  popularText: z.string().default("Quick access to the most widely searched calculators on {siteName}."),
  popularTools: z.array(d2ToolSchema).default([]),
  autoPopularCount: z.number().int().min(1).max(40).default(12),
  // 3 steps
  showSteps: z.boolean().default(true),
  stepsEyebrow: z.string().default("Simple 3-step process"),
  stepsHeading: z.string().default("How to Use Our Free Calculators"),
  steps: z.array(iconTextSchema).default([
    {
      icon: "🔍",
      title: "Find Your Calculator",
      text: "Browse by category or use the search bar to instantly find the right tool. We offer {count}+ calculators for every money question.",
    },
    {
      icon: "⌨️",
      title: "Enter Your Values",
      text: "Type in your numbers using the simple input fields. Most calculators give you instant results as you type — no form submissions or page reloads required.",
    },
    {
      icon: "✅",
      title: "Get Instant Results",
      text: "See your answer immediately, along with a clear explanation of the formula used. Many tools include charts, breakdowns, and tips to help you understand your results.",
    },
  ]),
  // Two rich-text columns
  showInfo: z.boolean().default(true),
  infoLeftHtml: z.string().default(D2_INFO_LEFT),
  infoRightHtml: z.string().default(D2_INFO_RIGHT),
  // Category guides
  showGuides: z.boolean().default(true),
  guidesEyebrow: z.string().default("Category guides"),
  guidesHeading: z.string().default("Popular Categories of Online Calculator Tools"),
  guidesText: z.string().default("Each category is designed for a specific audience — find yours below."),
  guidesLinkText: z.string().default("View all {name} →"),
  guideCards: z.array(d2GuideSchema).default([]),
  autoGuideCount: z.number().int().min(1).max(30).default(6),
  guideToolsPerCard: z.number().int().min(1).max(15).default(5),
  // Use cases + keyword box
  showUseCases: z.boolean().default(true),
  useCasesEyebrow: z.string().default("Calculator guides & use cases"),
  useCasesHeading: z.string().default("Find the Right Online Calculator for Your Question"),
  useCasesText: z
    .string()
    .default("Choose a calculator by the problem you are trying to solve — from loans and taxes to saving and investing."),
  useCases: z.array(d2UseCaseSchema).default([
    {
      icon: "💳",
      title: "Money, Loans & Personal Finance",
      text: "Use online finance calculators to estimate loan payments, compound interest, inflation, taxes, debt-to-income ratios and other everyday money figures. Enter your own values to compare scenarios before making a financial decision.",
      bullets: [
        "Loan payment and interest estimates",
        "Compound interest and savings growth",
        "Income tax and capital gains estimates",
        "Debt-to-income and affordability calculations",
        "Inflation and purchasing-power calculations",
      ],
    },
    {
      icon: "🏠",
      title: "Home, Mortgage & Property",
      text: "Mortgage and property calculators help you estimate monthly payments, affordability, refinancing savings and the true cost of owning a home before you talk to a lender.",
      bullets: [
        "Mortgage payment estimates",
        "Home affordability checks",
        "Refinance break-even calculations",
        "Property tax and closing cost estimates",
        "Rent vs buy comparisons",
      ],
    },
    {
      icon: "📈",
      title: "Investments & Long-Term Planning",
      text: "Investment calculators help you model possible outcomes using your starting amount, contributions, time period, rate of return and other assumptions.",
      bullets: [
        "ROI and investment return estimates",
        "Compound growth projections",
        "Retirement savings planning",
        "Goal-based savings planning",
        "Recurring contribution scenarios",
      ],
    },
  ]),
  keywordsLabel: z.string().default("Popular calculator searches covered on this site:"),
  keywordsText: z
    .string()
    .default(
      "free online calculator, finance calculator, loan calculator, mortgage calculator, compound interest calculator, investment calculator, tax calculator, salary calculator, retirement calculator, and budget calculator."
    ),
  // FAQ
  showFaq: z.boolean().default(true),
  faqEyebrow: z.string().default("Frequently asked questions"),
  faqHeading: z.string().default("Questions About Free Online Calculators"),
  faqText: z.string().default("Helpful answers about using calculator tools for everyday calculations and planning."),
  faqs: z.array(faqSchema).default([
    {
      question: "What is a free online calculator?",
      answer: "A free online calculator is a browser-based tool that performs a specific calculation without requiring paid software. Different calculators handle loans, taxes, savings, investments and other money questions.",
    },
    {
      question: "How do online calculator tools work?",
      answer: "Most calculators ask for a small set of inputs, apply a defined formula or calculation method, and display the result instantly. Some also provide a breakdown so you can understand the calculation.",
    },
    {
      question: "Are online calculators accurate?",
      answer: "A calculator produces a mathematically correct result when its formula and inputs are appropriate. Accuracy also depends on the assumptions and values entered, so important financial or tax decisions should be independently verified.",
    },
    {
      question: "Can I use these calculators on a phone?",
      answer: "Yes. The calculator pages adapt to phones, tablets, laptops, and desktop screens so input fields and results remain readable on every device.",
    },
    {
      question: "Do I need to install an app?",
      answer: "No. These are web-based calculator tools that open in any modern browser. You can use them directly from a phone, tablet, or computer.",
    },
    {
      question: "Can calculators replace professional advice?",
      answer: "No. Calculators are useful for estimates and education, but they should not replace a qualified professional for legal or tax filings or major financial decisions.",
    },
  ]),
  // Blogs
  showBlogs: z.boolean().default(true),
  blogsHeading: z.string().default("Blogs"),
  blogCount: z.number().int().min(1).max(24).default(6),
  blogButtonText: z.string().default("Learn more"),
  blogLayout: z.enum(["slider", "grid"]).default("slider"),
  blogAutoplay: z.boolean().default(true),
  blogExcerptWords: z.number().int().min(0).max(80).default(20), // 0 = title only
  // SEO
  metaTitle: z.string().default(""),
  metaDescription: z.string().default(""),
});

// ---------------------------------------------------------------------------
// Design 3 — "Clean Library" (from the admin's own HTML mockup): centered
// hero with search + quick chips + stats, popular calculator cards, dark
// category grid, featured hub, two "what can you calculate" boxes, 3 steps,
// dark trending cards, guides (latest blogs), country hubs, trust row, FAQ and
// a closing call-to-action. In any text, {siteName}, {count} (published
// calculators) and {categoryCount} are filled in. Empty lists = automatic.

const linkSchema = z.object({ text: z.string().default(""), url: z.string().default("") });
const statSchema = z.object({ value: z.string().default(""), label: z.string().default("") });
const d3ToolSchema = z.object({
  toolSlug: z.string(),
  icon: z.string().default(""), // "" = picked from the slug
  badge: z.string().default(""), // e.g. "Popular" — "" = no badge
  description: z.string().default(""), // "" = the calculator's own description
});
const d3CategorySchema = z.object({
  categorySlug: z.string(),
  icon: z.string().default(""),
  title: z.string().default(""), // "" = category name
  description: z.string().default(""), // "" = the category's hero text
});
const d3HubItemSchema = z.object({
  title: z.string().default(""),
  text: z.string().default(""),
  url: z.string().default(""),
});
const d3ColumnSchema = z.object({
  title: z.string().default(""),
  text: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});
const d3StepSchema = z.object({ title: z.string().default(""), text: z.string().default("") });
const d3CountrySchema = z.object({
  flag: z.string().default(""),
  label: z.string().default(""), // "" = category name
  categorySlug: z.string().default(""), // links to this category…
  url: z.string().default(""), // …or to this URL when no category is picked
});

export const design3Schema = z.object({
  // Hero
  heroBadge: z.string().default("Free calculators • Updated regularly"),
  heroTitleLine1: z.string().default("Calculate Anything."),
  heroTitleLine2: z.string().default("Understand Everything."), // gradient line
  heroText: z
    .string()
    .default(
      "A growing library of simple, practical calculators for money, home, business, math, health, time and everyday decisions."
    ),
  showSearch: z.boolean().default(true),
  searchPlaceholder: z.string().default("What do you want to calculate? Try “mortgage payment”"),
  searchButtonText: z.string().default("Search"),
  heroChips: z.array(linkSchema).default([]), // [] = popular calculators automatically
  autoChipCount: z.number().int().min(0).max(12).default(7),
  heroStats: z.array(statSchema).default([
    { value: "{count}+", label: "Free calculators" },
    { value: "{categoryCount}", label: "Categories" },
    { value: "100%", label: "Free core tools" },
  ]),
  // Popular calculators
  showPopular: z.boolean().default(true),
  popularHeading: z.string().default("Most Popular Calculators"),
  popularText: z.string().default("Start with commonly used tools for money, planning and everyday calculations."),
  popularLink: linkSchema.default({ text: "Explore all calculators →", url: "/calculators" }),
  popularTools: z.array(d3ToolSchema).default([]),
  autoPopularCount: z.number().int().min(1).max(40).default(8),
  popularAutoBadge: z.string().default("Popular"), // badge on calculators marked Popular (automatic list)
  popularCardLinkText: z.string().default("Calculate now →"),
  // Category grid (dark)
  showCategories: z.boolean().default(true),
  categoriesHeading: z.string().default("Explore Calculator Categories"),
  categoriesText: z.string().default("Clear topic hubs make every calculator easy to discover."),
  categoriesLink: linkSchema.default({ text: "View all categories →", url: "/calculators" }),
  categoryCards: z.array(d3CategorySchema).default([]),
  autoCategoryCount: z.number().int().min(1).max(30).default(12),
  categoryCountText: z.string().default("{n} calculators →"), // {n} = calculators in the category
  // Featured hub
  showHub: z.boolean().default(true),
  hubHeading: z.string().default("Featured Calculator Hubs"),
  hubText: z.string().default("Explore whole topics instead of single calculators."),
  hubEyebrow: z.string().default("FEATURED HUB • FINANCE"),
  hubTitle: z.string().default("Make better financial decisions with the right calculation."),
  hubBody: z
    .string()
    .default("Explore payment, interest, savings, investment and loan tools in one organized finance hub."),
  hubButton: linkSchema.default({ text: "Explore Finance Calculators →", url: "" }), // url "" = first category
  hubItems: z.array(d3HubItemSchema).default([]), // [] = the next 3 categories automatically
  // "What can you calculate?" boxes
  showColumns: z.boolean().default(true),
  columnsHeading: z.string().default("What Can You Calculate?"),
  columnsText: z.string().default("From money to everyday decisions — here's what our calculators cover."),
  columns: z.array(d3ColumnSchema).default([
    {
      title: "For your money",
      text: "Financial calculators help you compare costs, plan payments and understand how numbers change over time.",
      bullets: [
        "Monthly loan and mortgage payments",
        "Interest and amortization schedules",
        "Take-home salary and taxes",
        "Savings and compound growth",
        "Profit, margin and business pricing",
      ],
    },
    {
      title: "For everyday decisions",
      text: "Quick calculators turn common questions into clear numbers without complicated spreadsheets.",
      bullets: [
        "Percentages, discounts and markups",
        "Age, dates and time differences",
        "Unit and measurement conversions",
        "BMI, calories and fitness estimates",
        "Grades, GPA and academic calculations",
      ],
    },
  ]),
  // Steps
  showSteps: z.boolean().default(true),
  stepsHeading: z.string().default("How {siteName} Works"),
  stepsText: z.string().default("Every tool follows a simple flow designed for speed and clarity."),
  stepLabel: z.string().default("STEP"), // shown as "STEP 01"
  steps: z.array(d3StepSchema).default([
    { title: "Find a calculator", text: "Search by calculation, browse a category or start from a popular tool." },
    { title: "Enter your numbers", text: "Use clearly labeled fields and practical input options." },
    { title: "Understand the result", text: "Get the result with formulas, explanations and useful context." },
  ]),
  // Trending (dark)
  showTrending: z.boolean().default(true),
  trendingHeading: z.string().default("Trending Right Now"),
  trendingText: z.string().default("Seasonal, high-interest and recently updated tools."),
  trendingLink: linkSchema.default({ text: "See all calculators →", url: "/calculators" }),
  trendingTools: z.array(d3ToolSchema).default([]), // [] = recently updated calculators
  autoTrendingCount: z.number().int().min(1).max(40).default(4),
  trendingBadge: z.string().default("Trending"),
  trendingCardLinkText: z.string().default("Open tool →"),
  // Guides (latest blog posts)
  showGuides: z.boolean().default(true),
  guidesHeading: z.string().default("Calculator Guides & Learning"),
  guidesText: z.string().default("Guides that explain the formulas before or after you use a tool."),
  guidesLink: linkSchema.default({ text: "Learning center →", url: "/blog" }),
  guideCount: z.number().int().min(1).max(24).default(3),
  guideExcerptWords: z.number().int().min(0).max(80).default(20),
  guideLinkText: z.string().default("Read guide →"),
  // Countries
  showCountries: z.boolean().default(true),
  countriesHeading: z.string().default("Calculators by Country"),
  countriesText: z.string().default("Local tax, salary and financial calculators, organized by country."),
  countriesLink: linkSchema.default({ text: "All calculators →", url: "/calculators" }),
  countries: z.array(d3CountrySchema).default([]), // [] = country categories found automatically
  // Trust row
  showTrust: z.boolean().default(true),
  trustHeading: z.string().default("Built for Clarity"),
  trustText: z.string().default("Simple tools you can trust, on any device."),
  trustItems: z.array(iconTextSchema).default([
    { icon: "⚡", title: "Fast to use", text: "Simple inputs and quick results" },
    { icon: "✓", title: "Clear formulas", text: "Explain what the result means" },
    { icon: "🔒", title: "Privacy focused", text: "No unnecessary account required" },
    { icon: "📱", title: "Mobile friendly", text: "Designed for every screen" },
  ]),
  // FAQ
  showFaq: z.boolean().default(true),
  faqHeading: z.string().default("Frequently Asked Questions"),
  faqText: z.string().default("Common questions about our calculators."),
  faqs: z.array(faqSchema).default([
    {
      question: "Are the calculators free?",
      answer: "Yes. The core calculator tools are free to use, with no account required for standard calculations.",
    },
    {
      question: "How many calculators are available?",
      answer: "{siteName} has {count} calculators today and keeps growing across categories, countries and calculation types.",
    },
    {
      question: "Can I search for a specific calculator?",
      answer: "Yes. Search by calculator name, topic, calculation type or a common phrase.",
    },
    {
      question: "Are there country-specific calculators?",
      answer: "Yes. Country hubs organize local calculations such as tax, salary and other financial tools.",
    },
    {
      question: "Can results be used for financial or health decisions?",
      answer:
        "Calculators give estimates based on the information and formulas used. Verify important financial, tax or health decisions with a qualified professional or an official source.",
    },
  ]),
  // Call to action
  showCta: z.boolean().default(true),
  ctaHeading: z.string().default("Find the Number You Need."),
  ctaText: z.string().default("Explore calculators designed to make complicated calculations easier to understand."),
  ctaButton: linkSchema.default({ text: "Browse All Calculators →", url: "/calculators" }),
  // SEO
  metaTitle: z.string().default(""),
  metaDescription: z.string().default(""),
});

export const homepageSchema = z.object({
  activeDesign: z.number().int().min(1).max(3).default(1),
  design1: design1Schema.default(design1Schema.parse({})),
  design2: design2Schema.default(design2Schema.parse({})),
  design3: design3Schema.default(design3Schema.parse({})),
});

export type Design1Content = z.infer<typeof design1Schema>;
export type HomepageSettings = z.infer<typeof homepageSchema>;
export type HomeIconItem = z.infer<typeof iconItemSchema>;
export type HomeSectionItem = z.infer<typeof sectionSchema>;
export type HomeLogo = z.infer<typeof logoSchema>;
export type Design2Content = z.infer<typeof design2Schema>;
export type D2Chip = z.infer<typeof chipSchema>;
export type Design3Content = z.infer<typeof design3Schema>;

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const stored = await getSiteSetting<unknown>(KEY);
  const parsed = homepageSchema.safeParse(stored ?? {});
  return parsed.success ? parsed.data : homepageSchema.parse({});
}

export async function saveHomepageSettings(settings: HomepageSettings) {
  await setSiteSetting(KEY, settings);
}
