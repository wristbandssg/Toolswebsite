import Link from "next/link";
import { SEO_TOOLS } from "@/lib/seo-tools/registry";

export default function SeoToolsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">SEO Tools</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        SEO checks you can run from here on any public page — your own or a competitor&apos;s.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SEO_TOOLS.map((tool) => (
          <Link
            key={tool.id}
            href={`/admin/seo-tools/${tool.id}`}
            className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-800"
          >
            <h2 className="font-semibold group-hover:text-indigo-600">{tool.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{tool.description}</p>
            <span className="mt-3 inline-block text-sm font-medium text-indigo-600">Open tool →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
