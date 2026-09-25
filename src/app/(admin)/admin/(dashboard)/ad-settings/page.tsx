import { getAdSettings } from "@/lib/ad-settings";
import AdSettingsForm from "@/components/admin/AdSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdSettingsPage() {
  const settings = await getAdSettings();
  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold">Ad Settings</h1>
      <div className="mt-6">
        <AdSettingsForm initial={settings} />
      </div>
    </div>
  );
}
