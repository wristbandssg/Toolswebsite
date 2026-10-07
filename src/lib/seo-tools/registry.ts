import type { SeoToolInfo, ToolField } from "./types";

// The admin SEO Tools (Marketing → SEO Tools): one entry per tool, with the
// form fields its page shows. Ids are unique (checked below), so a tool can't
// be added twice. Tools are TypeScript ports of the NLP-SEO toolkit's Python
// scripts; `sources` names the script(s) each one came from. Client-safe.

const URLS = (label = "Page URLs", max = 20): ToolField => ({
  name: "urls",
  label,
  type: "urls",
  required: true,
  placeholder: "https://example.com/page\nhttps://example.com/another-page",
  hint: `One URL per line, up to ${max}.`,
});
const URL_FIELD = (label = "Page URL"): ToolField => ({ name: "url", label, type: "url", required: true, placeholder: "https://example.com/page" });
const KEYWORD: ToolField = { name: "keyword", label: "Target keyword (optional)", type: "text", placeholder: "e.g. loan calculator" };

export const SEO_TOOLS: SeoToolInfo[] = [
  {
    id: "site-audit",
    name: "Site Audit",
    group: "Technical SEO",
    description: "One-pass on-page SEO check of any URL with a score and a list of issues.",
    sources: ["site_audit_summary.py"],
    fields: [],
    custom: true,
  },
  {
    id: "meta-social-tags",
    name: "Meta & Social Tags",
    group: "Technical SEO",
    description: "Title, meta description, canonical, robots, Open Graph, Twitter Card, schema, H1, lang and viewport for each page.",
    sources: ["meta_tag_analyzer.py", "social_preview_validator.py"],
    fields: [URLS()],
  },
  {
    id: "heading-structure",
    name: "Heading Structure",
    group: "Technical SEO",
    description: "H1–H6 hierarchy: missing or multiple H1, skipped levels, empty or long headings, keyword use.",
    sources: ["heading_analyzer.py"],
    fields: [URLS("Page URLs", 10), KEYWORD],
  },
  {
    id: "image-seo",
    name: "Image SEO",
    group: "Technical SEO",
    description: "Alt text, file names, formats, width/height, lazy loading and oversized embedded images.",
    sources: ["image_seo_analyzer.py"],
    fields: [URLS("Page URLs", 10)],
  },
  {
    id: "canonical-check",
    name: "Canonical Check",
    group: "Technical SEO",
    description: "Missing, self-referencing, cross-domain and conflicting canonical tags (HTML and HTTP header).",
    sources: ["canonical_checker.py"],
    fields: [URLS("Page URLs", 30)],
  },
  {
    id: "redirect-chains",
    name: "Redirect Chains",
    group: "Technical SEO",
    description: "Traces every redirect hop: long chains, loops, HTTP/HTTPS mixing, temporary redirects, dead ends.",
    sources: ["redirect_chain_checker.py"],
    fields: [URLS("URLs", 50)],
  },
  {
    id: "schema-validator",
    name: "Schema Validator",
    group: "Technical SEO",
    description: "Finds JSON-LD and Microdata, flags invalid JSON, and scores each type against its recommended properties.",
    sources: ["schema_extractor.py"],
    fields: [URLS("Page URLs", 10)],
  },
  {
    id: "serp-features",
    name: "SERP Features",
    group: "Technical SEO",
    description: "Eligibility for featured snippets, FAQ, How-To, review stars, breadcrumbs and video results — with tips.",
    sources: ["serp_feature_analyzer.py"],
    fields: [URL_FIELD()],
  },
  {
    id: "serp-snippet",
    name: "SERP Snippet Preview",
    group: "Technical SEO",
    description: "Shows how a page may look in Google — title and description truncation, breadcrumb and date.",
    sources: ["serp_snippet_previewer.py"],
    fields: [
      { ...URL_FIELD(), required: false, hint: "Fetches the page's title and description — or type them below." },
      { name: "title", label: "Title (optional)", type: "text" },
      { name: "description", label: "Description (optional)", type: "textarea" },
      { name: "display", label: "Breadcrumb display (optional)", type: "text", placeholder: "example.com › blog › post" },
    ],
  },
  {
    id: "broken-links",
    name: "Broken Links",
    group: "Technical SEO",
    description: "Crawls pages from a start URL and checks every link and image for errors and redirects.",
    sources: ["broken_link_checker.py"],
    fields: [
      URL_FIELD("Start URL"),
      { name: "depth", label: "Crawl depth", type: "number", default: 0, min: 0, max: 2, hint: "0 = only this page, 1 = also pages it links to." },
      { name: "maxPages", label: "Max pages", type: "number", default: 20, min: 1, max: 50 },
    ],
  },
  {
    id: "internal-links",
    name: "Internal Links & Anchors",
    group: "Technical SEO",
    description: "Crawls your site: most-linked pages, orphan pages, anchor text types and top anchors.",
    sources: ["internal_link_analyzer.py", "anchor_text_analyzer.py"],
    fields: [
      URL_FIELD("Start URL"),
      { name: "depth", label: "Crawl depth", type: "number", default: 2, min: 0, max: 3 },
      { name: "maxPages", label: "Max pages", type: "number", default: 30, min: 1, max: 60 },
    ],
  },
  {
    id: "outbound-links",
    name: "Outbound Links",
    group: "Technical SEO",
    description: "External links per page: domains, nofollow / sponsored / UGC, and (optionally) broken ones.",
    sources: ["outbound_link_analyzer.py"],
    fields: [URLS("Page URLs", 10), { name: "checkStatus", label: "Also check if each link works (slower)", type: "checkbox", default: false }],
  },
  {
    id: "robots-txt",
    name: "robots.txt",
    group: "Technical SEO",
    description: "Parses robots.txt: rules, sitemaps, crawl-delay, blocked resources, and tests whether a path is allowed.",
    sources: ["robots_txt_analyzer.py"],
    fields: [URL_FIELD("Website URL"), { name: "testPath", label: "Test a path (optional)", type: "text", placeholder: "/admin/" }],
  },
  {
    id: "sitemap-check",
    name: "Sitemap Check",
    group: "Technical SEO",
    description: "Validates an XML sitemap (and sitemap indexes): lastmod freshness, duplicates, protocols, trailing slashes, status sample.",
    sources: ["sitemap_analyzer.py"],
    fields: [
      URL_FIELD("Sitemap URL"),
      { name: "checkStatus", label: "Also check a random sample of URLs", type: "checkbox", default: true },
      { name: "sampleSize", label: "Sample size", type: "number", default: 50, min: 1, max: 200 },
    ],
  },
  {
    id: "url-slugs",
    name: "URL & Slug Audit",
    group: "Technical SEO",
    description: "Length, depth, underscores, uppercase, parameters, stop words and keyword use across many URLs.",
    sources: ["url_slug_analyzer.py"],
    fields: [
      { ...URLS("URLs", 2000), required: false, hint: "One per line — or use a sitemap below." },
      { name: "sitemap", label: "…or a sitemap URL", type: "url", placeholder: "https://example.com/sitemap.xml" },
      KEYWORD,
    ],
  },
  {
    id: "page-speed",
    name: "Page Speed & Web Vitals",
    group: "Technical SEO",
    description: "Response time, HTML size, scripts and stylesheets, render-blocking resources, and LCP / CLS / INP risks.",
    sources: ["page_speed_analyzer.py", "core_web_vitals_estimator.py"],
    fields: [URLS("Page URLs", 10)],
  },
  {
    id: "mobile-friendly",
    name: "Mobile Friendly",
    group: "Technical SEO",
    description: "Viewport, zoom, fixed widths, tiny fonts, responsive images, plugins and wide tables.",
    sources: ["mobile_friendly_checker.py"],
    fields: [URLS("Page URLs", 10)],
  },
  {
    id: "content-ratio",
    name: "Content Ratio",
    group: "Technical SEO",
    description: "Text-to-HTML ratio, inline code weight, and main content vs boilerplate (header, nav, footer).",
    sources: ["text_html_ratio.py", "page_segmenter.py"],
    fields: [URLS()],
  },
  {
    id: "hreflang",
    name: "Hreflang",
    group: "Technical SEO",
    description: "Validates multilingual hreflang tags: x-default, self-reference, language codes and return tags.",
    sources: ["hreflang_validator.py"],
    fields: [{ ...URLS("Every language version of the page"), hint: "Add each language version (one per line) so return tags can be checked." }],
  },
  {
    id: "local-seo",
    name: "Local SEO",
    group: "Technical SEO",
    description: "Name / address / phone, LocalBusiness schema, maps, opening hours, social profiles and NAP consistency.",
    sources: ["local_seo_auditor.py"],
    fields: [URLS("Page URLs", 10)],
  },
];

if (new Set(SEO_TOOLS.map((t) => t.id)).size !== SEO_TOOLS.length) {
  throw new Error("Duplicate SEO tool id in src/lib/seo-tools/registry.ts");
}
const allSources = SEO_TOOLS.flatMap((t) => t.sources);
if (new Set(allSources).size !== allSources.length) {
  throw new Error("A Python script is ported twice in src/lib/seo-tools/registry.ts");
}

export const getSeoTool = (id: string) => SEO_TOOLS.find((t) => t.id === id);
