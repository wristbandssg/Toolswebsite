// The admin SEO Tools (Marketing → SEO Tools). One entry per tool; the id is
// unique, so a tool can't be added twice. Tools are TypeScript ports of the
// NLP-SEO toolkit's Python scripts, added one at a time.

export interface SeoToolInfo {
  id: string; // also the URL: /admin/seo-tools/{id}
  name: string;
  description: string;
  source: string; // the Python script it was ported from
}

export const SEO_TOOLS: SeoToolInfo[] = [
  {
    id: "site-audit",
    name: "Site Audit",
    description: "One-pass on-page SEO check of any URL: title, meta description, headings, content length, images, canonical, schema, Open Graph, links and speed — with a score and a list of issues.",
    source: "site_audit_summary.py",
  },
];

// Fail loudly in development if two tools ever share an id.
if (new Set(SEO_TOOLS.map((t) => t.id)).size !== SEO_TOOLS.length) {
  throw new Error("Duplicate SEO tool id in src/lib/seo-tools/registry.ts");
}

export const getSeoTool = (id: string) => SEO_TOOLS.find((t) => t.id === id);
