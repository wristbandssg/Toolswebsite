import type { Metadata } from "next";
import { getSiteGeneralSettings } from "@/lib/site-config";
import { getHomepageSettings, type HomepageSettings } from "@/lib/homepage-config";
import { loadDesign1Data, loadDesign2Data } from "@/lib/homepage-data";
import { loadDesign3Data } from "@/lib/homepage-data-design3";
import HomeDesign1 from "@/components/home/designs/HomeDesign1";
import HomeDesign2 from "@/components/home/designs/HomeDesign2";
import HomeDesign3 from "@/components/home/designs/HomeDesign3";

// Home page. The admin picks one of 3 designs at /admin/homepage and edits
// all of its content there.
export const dynamic = "force-dynamic";

function activeContent(home: HomepageSettings) {
  if (home.activeDesign === 2) return home.design2;
  if (home.activeDesign === 3) return home.design3;
  return home.design1;
}

export async function generateMetadata(): Promise<Metadata> {
  const [settings, home] = await Promise.all([getSiteGeneralSettings(), getHomepageSettings()]);
  const content = activeContent(home);
  return {
    title: { absolute: content.metaTitle || `${settings.siteName} — Free Online Calculators` },
    description: content.metaDescription || settings.siteDescription,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [settings, home] = await Promise.all([getSiteGeneralSettings(), getHomepageSettings()]);
  if (home.activeDesign === 3) {
    const data = await loadDesign3Data(home.design3);
    return <HomeDesign3 content={home.design3} siteName={settings.siteName} {...data} />;
  }
  if (home.activeDesign === 2) {
    const data = await loadDesign2Data(home.design2);
    return <HomeDesign2 content={home.design2} siteName={settings.siteName} {...data} />;
  }
  const content = home.design1;
  const data = await loadDesign1Data(content);
  return <HomeDesign1 content={content} siteName={settings.siteName} {...data} />;
}
