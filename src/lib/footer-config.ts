import { z } from "zod";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

// Footer look and text, edited at /admin/footer-builder (the link columns
// themselves are the "footer" menu, edited on the same page).

const KEY = "footer";

export const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook" },
  { key: "x", label: "X (Twitter)" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "youtube", label: "YouTube" },
  { key: "instagram", label: "Instagram" },
  { key: "website", label: "Website" },
  { key: "email", label: "Email" },
] as const;

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #1b6fa8");

export const footerSchema = z.object({
  // Colors
  bgFrom: color.default("#1a6aa3"),
  bgTo: color.default("#0b4566"),
  textColor: color.default("#e6f0f8"),
  headingColor: color.default("#ffffff"),
  linkColor: color.default("#ffffff"),
  bottomBg: color.default("#083650"),
  bottomTextColor: color.default("#b9d3e6"),
  // Brand column
  showBrand: z.boolean().default(true),
  brandName: z.string().default(""), // "" = site name
  tagline: z.string().default("Free online calculators for money, math and everyday life — fast, accurate and easy to use."),
  socials: z
    .array(z.object({ platform: z.string(), url: z.string().default("") }))
    .default([]),
  // Bottom bar
  copyright: z.string().default("© {year} {siteName}. All rights reserved."),
});

export type FooterSettings = z.infer<typeof footerSchema>;

export async function getFooterSettings(): Promise<FooterSettings> {
  try {
    const stored = await getSiteSetting<unknown>(KEY);
    const parsed = footerSchema.safeParse(stored ?? {});
    return parsed.success ? parsed.data : footerSchema.parse({});
  } catch {
    return footerSchema.parse({});
  }
}

export async function saveFooterSettings(settings: FooterSettings) {
  await setSiteSetting(KEY, settings);
}
