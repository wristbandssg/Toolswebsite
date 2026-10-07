import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoTool } from "@/lib/seo-tools/registry";
import { getSiteUrl } from "@/lib/seo";
import ToolRunner from "@/components/admin/seo-tools/ToolRunner";

export default async function SeoToolPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const tool = getSeoTool(toolId);
  if (!tool || tool.custom) notFound();

  // Start URL fields on this site, so a tool can be run straight away.
  const site = getSiteUrl();
  const defaults: Record<string, string> = {};
  for (const f of tool.fields) {
    if (f.name === "url" && f.type === "url" && f.required) defaults.url = f.label === "Sitemap URL" ? `${site}/sitemap.xml` : `${site}/`;
    if (f.name === "urls" && f.required) defaults.urls = `${site}/`;
  }

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/seo-tools" className="hover:underline">
          SEO Tools
        </Link>{" "}
        / {tool.name}
      </p>
      <h1 className="mt-1 text-2xl font-bold">{tool.name}</h1>
      <p className="mt-1 max-w-3xl text-sm text-gray-500">{tool.description}</p>
      {tool.limits ? <p className="mt-2 max-w-3xl rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{tool.limits}</p> : null}
      <div className="mt-6">
        <ToolRunner tool={tool} defaults={defaults} />
      </div>
    </div>
  );
}
