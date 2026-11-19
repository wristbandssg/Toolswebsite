import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

// General site settings (site name, description, logo, contact email), edited in
// Admin → Settings and stored as one JSON row ("site_general") in site_settings.
// Missing fields fall back to DEFAULT_SITE_SETTINGS.
const KEY = "site_general";

export interface SiteGeneralSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  contactEmail: string;
}

export const DEFAULT_SITE_SETTINGS: SiteGeneralSettings = {
  siteName: "Calc Platform",
  siteDescription: "Free online calculators and guides.",
  logoUrl: "",
  contactEmail: "",
};

export async function getSiteGeneralSettings(): Promise<SiteGeneralSettings> {
  const stored = await getSiteSetting<Partial<SiteGeneralSettings>>(KEY);
  return { ...DEFAULT_SITE_SETTINGS, ...stored };
}

export async function saveSiteGeneralSettings(settings: SiteGeneralSettings) {
  await setSiteSetting(KEY, settings);
}
