import { getSiteGeneralSettings } from "@/lib/site-config";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSiteGeneralSettings();

  return (
    <div>
      <h1 className="text-2xl font-bold">Website Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Site name, logo, and default description — used across the header, footer, and page
        metadata.
      </p>
      <div className="mt-6">
        <SiteSettingsForm initial={settings} />
      </div>
    </div>
  );
}
