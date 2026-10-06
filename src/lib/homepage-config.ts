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
  { id: 2, name: "Design 2", ready: false },
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

export const homepageSchema = z.object({
  activeDesign: z.number().int().min(1).max(3).default(1),
  design1: design1Schema.default(design1Schema.parse({})),
});

export type Design1Content = z.infer<typeof design1Schema>;
export type HomepageSettings = z.infer<typeof homepageSchema>;
export type HomeIconItem = z.infer<typeof iconItemSchema>;
export type HomeSectionItem = z.infer<typeof sectionSchema>;
export type HomeLogo = z.infer<typeof logoSchema>;

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const stored = await getSiteSetting<unknown>(KEY);
  const parsed = homepageSchema.safeParse(stored ?? {});
  return parsed.success ? parsed.data : homepageSchema.parse({});
}

export async function saveHomepageSettings(settings: HomepageSettings) {
  await setSiteSetting(KEY, settings);
}
