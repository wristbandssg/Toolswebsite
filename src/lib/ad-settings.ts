import { cache } from "react";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

/**
 * Ad placement system — lets a non-developer manage third-party ad network
 * code (Adsterra, AdSense, or anything else that hands you a raw HTML/script
 * snippet) from /admin/ad-settings, without touching any template code.
 * Every placement below is wired into the matching spot on the public site
 * (see each file's own comment for exactly where) — adding a NEW placement
 * means adding one entry here, plus one <AdSlot placement="..." /> call in
 * the template. Removing/renaming an existing placement means also removing
 * its <AdSlot> call, or the slot will just render nothing (fails closed,
 * never throws).
 */

const KEY = "ad_settings";

export type AdNetwork = "adsterra" | "adsense" | "other" | "none";

export interface AdPlacementConfig {
  enabled: boolean;
  network: AdNetwork;
  // Raw ad code as given by the network (script tags, <ins> tags, iframes,
  // whatever they hand you) — pasted verbatim by the admin, rendered as-is
  // by <AdSlot> (see src/components/RawAdScript.tsx for how <script> tags
  // inside this string actually get executed).
  code: string;
}

export interface AdPlacementDef {
  key: string;
  label: string;
  description: string;
  // Reserved minimum height (px) for the slot's container while an ad is
  // enabled — keeps the page from jumping/shifting once the ad script
  // finishes loading and injects its own content (Core Web Vitals: CLS).
  minHeight: number;
}

export const AD_PLACEMENTS: AdPlacementDef[] = [
  {
    key: "site_header_bottom",
    label: "Sitewide — Below Header",
    description:
      "Shows near the top of every public page (Tool, Category, Blog, Blog Category, and general Pages), just under the site header.",
    minHeight: 90,
  },
  {
    key: "site_footer_top",
    label: "Sitewide — Above Footer",
    description: "Shows at the bottom of every public page, just above the site footer.",
    minHeight: 90,
  },
  {
    key: "tool_content_top",
    label: "Tool Page — Above Content",
    description:
      "On a Calculator Tool page, right below the calculator widget and above the About/Example/Assumptions sections. Appears on all 5 Tool Page templates (shared component).",
    minHeight: 250,
  },
  {
    key: "tool_content_bottom",
    label: "Tool Page — Bottom of Content",
    description:
      "On a Calculator Tool page, after FAQ/Related Calculators/Support Blogs — the very end of the content. Appears on all 5 Tool Page templates.",
    minHeight: 250,
  },
  {
    key: "category_top",
    label: "Category Page — Top",
    description: "On a Tool Category page, right below the hero section, above the sub-category/tool grid.",
    minHeight: 90,
  },
  {
    key: "category_bottom",
    label: "Category Page — Bottom",
    description: "On a Tool Category page, at the very bottom.",
    minHeight: 90,
  },
  {
    key: "blog_top",
    label: "Blog Post — Top",
    description: "On a Blog post, right below the header/hero band, above the article body.",
    minHeight: 90,
  },
  {
    key: "blog_in_article",
    label: "Blog Post — In-Article",
    description: "On a Blog post, right after the article content, before the related-calculators section.",
    minHeight: 250,
  },
  {
    key: "blog_bottom",
    label: "Blog Post — Bottom",
    description: "On a Blog post, at the very end of the article.",
    minHeight: 250,
  },
  {
    key: "blog_category_top",
    label: "Blog Category Page — Top",
    description: "On a Blog Category page, right below the hero, above the hero slider/featured posts.",
    minHeight: 90,
  },
  {
    key: "blog_category_bottom",
    label: "Blog Category Page — Bottom",
    description: "On a Blog Category page, at the bottom of the post grid.",
    minHeight: 90,
  },
  {
    key: "page_top",
    label: "General Page — Top",
    description: "On a general Page (both of the 2 Page templates), right below the title.",
    minHeight: 90,
  },
  {
    key: "page_bottom",
    label: "General Page — Bottom",
    description: "On a general Page (both templates), at the very bottom.",
    minHeight: 90,
  },
];

export type AdSettings = Record<string, AdPlacementConfig>;

function defaultConfig(): AdPlacementConfig {
  return { enabled: false, network: "adsterra", code: "" };
}

export function defaultAdSettings(): AdSettings {
  const out: AdSettings = {};
  for (const p of AD_PLACEMENTS) out[p.key] = defaultConfig();
  return out;
}

/** `cache()`-wrapped so every <AdSlot> on the same page render shares one
 * DB read instead of one per placement (a single page can have 2-4 slots). */
export const getAdSettings = cache(async (): Promise<AdSettings> => {
  const stored = await getSiteSetting<Partial<AdSettings>>(KEY);
  const defaults = defaultAdSettings();
  if (!stored) return defaults;
  const merged: AdSettings = {};
  for (const p of AD_PLACEMENTS) {
    merged[p.key] = { ...defaults[p.key], ...(stored[p.key] ?? {}) };
  }
  return merged;
});

export async function saveAdSettings(settings: AdSettings) {
  await setSiteSetting(KEY, settings);
}
