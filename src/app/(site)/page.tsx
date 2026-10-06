import type { Metadata } from "next";
import { getSiteGeneralSettings } from "@/lib/site-config";
import { getHomepageSettings } from "@/lib/homepage-config";
import { loadDesign1Data, loadDesign2Data } from "@/lib/homepage-data";
import HomeDesign1 from "@/components/home/designs/HomeDesign1";
import HomeDesign2 from "@/components/home/designs/HomeDesign2";

// Home page. The admin picks one of 3 designs at /admin/homepage and edits
// all of its content there. Design 3 isn't built yet, so until it is, that
// choice renders Design 1.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, home] = await Promise.all([getSiteGeneralSettings(), getHomepageSettings()]);
  const content = home.activeDesign === 2 ? home.design2 : home.design1;
  return {
    title: { absolute: content.metaTitle || `${settings.siteName} — Free Online Calculators` },
    description: content.metaDescription || settings.siteDescription,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [settings, home] = await Promise.all([getSiteGeneralSettings(), getHomepageSettings()]);
  if (home.activeDesign === 2) {
    const data = await loadDesign2Data(home.design2);
    return <HomeDesign2 content={home.design2} siteName={settings.siteName} {...data} />;
  }
  const content = home.design1;
  const data = await loadDesign1Data(content);
  return <HomeDesign1 content={content} siteName={settings.siteName} {...data} />;
}
