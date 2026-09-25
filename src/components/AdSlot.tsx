import { AD_PLACEMENTS, getAdSettings } from "@/lib/ad-settings";
import RawAdScript from "./RawAdScript";

/**
 * Drop this into any public template at a spot where an ad should be able
 * to appear — `placement` must match one of the keys in
 * src/lib/ad-settings.ts's `AD_PLACEMENTS`. Renders nothing at all (no
 * empty gap, no reserved space) unless an admin has both enabled that
 * placement AND pasted ad code for it in /admin/ad-settings — so a site
 * with ads not yet configured looks and behaves exactly as if this
 * component weren't here.
 */
export default async function AdSlot({ placement }: { placement: string }) {
  const settings = await getAdSettings();
  const config = settings[placement];
  if (!config?.enabled || !config.code.trim()) return null;

  const def = AD_PLACEMENTS.find((p) => p.key === placement);

  return (
    <div
      className="my-6 flex w-full items-center justify-center overflow-hidden"
      style={{ minHeight: def?.minHeight ?? 90 }}
      data-ad-placement={placement}
    >
      <RawAdScript html={config.code} />
    </div>
  );
}
