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
  { id: 3, name: "Design 3", ready: false },
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
  // SEO
  metaTitle: z.string().default(""),
  metaDescription: z.string().default(""),
});

export const homepageSchema = z.object({
  activeDesign: z.number().int().min(1).max(3).default(1),
  design1: design1Schema.default(design1Schema.parse({})),
  design2: design2Schema.default(design2Schema.parse({})),
});

export type Design1Content = z.infer<typeof design1Schema>;
export type HomepageSettings = z.infer<typeof homepageSchema>;
export type HomeIconItem = z.infer<typeof iconItemSchema>;
export type HomeSectionItem = z.infer<typeof sectionSchema>;
export type HomeLogo = z.infer<typeof logoSchema>;
export type Design2Content = z.infer<typeof design2Schema>;
export type D2Chip = z.infer<typeof chipSchema>;

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const stored = await getSiteSetting<unknown>(KEY);
  const parsed = homepageSchema.safeParse(stored ?? {});
  return parsed.success ? parsed.data : homepageSchema.parse({});
}

export async function saveHomepageSettings(settings: HomepageSettings) {
  await setSiteSetting(KEY, settings);
}
