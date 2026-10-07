import Link from "next/link";
import { SEO_TOOLS } from "@/lib/seo-tools/registry";
import type { ToolGroup } from "@/lib/seo-tools/types";

const GROUP_ORDER: ToolGroup[] = ["Technical SEO", "On-Page & Content", "Keywords & Competitors", "Site-Wide Content", "Backlinks & Data"];

export default function SeoToolsPage() {
  const groups = GROUP_ORDER.map((g) => ({ group: g, tools: SEO_TOOLS.filter((t) => t.group === g) })).filter((g) => g.tools.length);
  return (
    <div>
      <h1 className="text-2xl font-bold">SEO Tools</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        {SEO_TOOLS.length} SEO checks you can run on any public page — your own or a competitor&apos;s.
      </p>
      {groups.map(({ group, tools }) => (
        <section key={group} className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            {group} <span className="font-normal">({tools.length})</span>
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={`/admin/seo-tools/${tool.id}`}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-800"
              >
                <h3 className="font-semibold group-hover:text-indigo-600">{tool.name}</h3>
                <p className="mt-1 flex-1 text-sm text-gray-500">{tool.description}</p>
                <span className="mt-3 text-sm font-medium text-indigo-600">Open tool →</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
