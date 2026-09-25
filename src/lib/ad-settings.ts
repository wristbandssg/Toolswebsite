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
  // Which section of the admin form this card is grouped under — purely a
  // display grouping, doesn't affect storage/lookup (still a flat map keyed
  // by `key`).
  group: string;
  // Reserved minimum height (px) for the slot's container while an ad is
  // enabled — keeps the page from jumping/shifting once the ad script
  // finishes loading and injects its own content (Core Web Vitals: CLS).
  minHeight: number;
}

export const AD_PLACEMENTS: AdPlacementDef[] = [
  {
    key: "site_header_bottom",
    label: "Below Header",
    description:
      "Shows near the top of every public page (Tool, Category, Blog, Blog Category, and general Pages), just under the site header.",
    group: "Sitewide",
    minHeight: 90,
  },
  {
    key: "site_footer_top",
    label: "Above Footer",
    description: "Shows at the bottom of every public page, just above the site footer.",
    group: "Sitewide",
    minHeight: 90,
  },
  {
    key: "tool_content_top",
    label: "Above Content",
    description:
      "Right below the calculator widget and above the About/Example/Assumptions sections. Appears on all 5 Tool Page templates (shared component).",
    group: "Tool Page",
    minHeight: 250,
  },
  {
    key: "tool_content_bottom",
    label: "Bottom of Content",
    description:
      "After FAQ/Related Calculators/Support Blogs — the very end of the content. Appears on all 5 Tool Page templates.",
    group: "Tool Page",
    minHeight: 250,
  },
  {
    key: "category_top",
    label: "Top",
    description: "Right below the hero section, above the sub-category/tool grid.",
    group: "Tool Category Page",
    minHeight: 90,
  },
  {
    key: "category_bottom",
    label: "Bottom",
    description: "At the very bottom of the page.",
    group: "Tool Category Page",
    minHeight: 90,
  },
  {
    key: "blog_top",
    label: "Top",
    description: "Right below the header/hero band, above the article body.",
    group: "Blog Post",
    minHeight: 90,
  },
  {
    key: "blog_in_article",
    label: "In-Article",
    description: "Right after the article content, before the related-calculators section.",
    group: "Blog Post",
    minHeight: 250,
  },
  {
    key: "blog_bottom",
    label: "Bottom",
    description: "At the very end of the article.",
    group: "Blog Post",
    minHeight: 250,
  },
  {
    key: "blog_category_top",
    label: "Top",
    description: "Right below the hero, above the hero slider/featured posts.",
    group: "Blog Category Page",
    minHeight: 90,
  },
  {
    key: "blog_category_bottom",
    label: "Bottom",
    description: "At the bottom of the post grid.",
    group: "Blog Category Page",
    minHeight: 90,
  },
  {
    key: "page_top",
    label: "Top",
    description: "Right below the title. Applies to both of the 2 Page templates.",
    group: "General Page",
    minHeight: 90,
  },
  {
    key: "page_bottom",
    label: "Bottom",
    description: "At the very bottom. Applies to both Page templates.",
    group: "General Page",
    minHeight: 90,
  },
];

/** `AD_PLACEMENTS` grouped by `group`, in first-seen order — what the admin
 * form actually renders (one section per group). */
export function groupedAdPlacements(): { group: string; placements: AdPlacementDef[] }[] {
  const order: string[] = [];
  const byGroup = new Map<string, AdPlacementDef[]>();
  for (const p of AD_PLACEMENTS) {
    if (!byGroup.has(p.group)) {
      byGroup.set(p.group, []);
      order.push(p.group);
    }
    byGroup.get(p.group)!.push(p);
  }
  return order.map((group) => ({ group, placements: byGroup.get(group)! }));
}

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
