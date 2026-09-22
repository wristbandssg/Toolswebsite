import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

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
