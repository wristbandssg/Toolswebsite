import { getAdSettings } from "@/lib/ad-settings";
import AdSettingsForm from "@/components/admin/AdSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdSettingsPage() {
  const settings = await getAdSettings();
  return (
    <div>
      <h1 className="text-xl font-semibold">Ad Settings</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage where ads (Adsterra, AdSense, or any other network) appear across the site — every placement
        below is wired into a specific spot on the public pages. Paste the ad network&apos;s exact code, toggle
        it on, and save. No code changes or redeploys needed to update, move, or turn off an ad.
      </p>
      <div className="mt-6">
        <AdSettingsForm initial={settings} />
      </div>
    </div>
  );
}
