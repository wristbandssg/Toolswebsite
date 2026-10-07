import Link from "next/link";
import SiteAuditTool from "@/components/admin/seo-tools/SiteAuditTool";
import { getSiteUrl } from "@/lib/seo";

export default function SiteAuditPage() {
  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/seo-tools" className="hover:underline">
          SEO Tools
        </Link>{" "}
        / Site Audit
      </p>
      <h1 className="mt-1 text-2xl font-bold">Site Audit</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Checks one page&apos;s on-page SEO in a single pass and scores it out of 100 (7 points off per issue). Add a target
        keyword to also check its use in the title and content.
      </p>
      <div className="mt-6">
        <SiteAuditTool defaultUrl={`${getSiteUrl()}/`} />
      </div>
    </div>
  );
}
