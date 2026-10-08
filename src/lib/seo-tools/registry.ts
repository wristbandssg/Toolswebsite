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
    id: "heading-structure",
    name: "Heading Structure",
    group: "Technical SEO",
    description: "H1–H6 hierarchy: missing or multiple H1, skipped levels, empty or long headings, keyword use.",
    sources: ["heading_analyzer.py"],
    fields: [URLS("Page URLs", 10), KEYWORD],
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

  // ---------------------------------------------------------------- On-Page & Content
  {
    id: "meta-description-generator",
    name: "Meta Description Generator",
    group: "On-Page & Content",
    description: "Writes meta description options from the page's own content, checked for length and keyword.",
    sources: ["meta_description_generator.py"],
    fields: [URL_FIELD(), KEYWORD, { name: "variants", label: "Number of options", type: "number", default: 3, min: 1, max: 8 }],
  },
  {
    id: "title-optimizer",
    name: "Title Tag Optimizer",
    group: "On-Page & Content",
    description: "Scores titles for click-through potential (length, numbers, power words, year, keyword position) with suggestions.",
    sources: ["title_tag_optimizer.py"],
    fields: [
      { name: "titles", label: "Titles", type: "textarea", placeholder: "10 Best Loan Calculators in 2026\nLoan Calculator", hint: "One per line — or score live pages below." },
      { ...URLS("…or page URLs (their titles are scored)"), required: false },
      KEYWORD,
      { name: "suggest", label: "Show improvement suggestions", type: "checkbox", default: true },
    ],
  },
  {
    id: "tfidf-terms",
    name: "TF-IDF Terms",
    group: "On-Page & Content",
    description: "The terms that define each page's content (1–4 word n-grams), weighted against the other documents.",
    sources: ["tfidf_extractor.py"],
    fields: [
      { ...URLS("Page URLs", 15), required: false },
      { name: "text", label: "…or paste text", type: "textarea" },
      { name: "top", label: "Terms per document", type: "number", default: 30, min: 5, max: 100 },
      { name: "ngramMin", label: "Shortest phrase (words)", type: "number", default: 1, min: 1, max: 3 },
      { name: "ngramMax", label: "Longest phrase (words)", type: "number", default: 3, min: 1, max: 4 },
    ],
  },
  {
    id: "content-brief",
    name: "Content Brief",
    group: "Keywords & Competitors",
    description: "Word-count target, must-include terms, competitor H2s and entities for a keyword — with an AI outline when an AI provider is set up.",
    sources: ["content_brief_generator.py"],
    fields: [{ ...KEYWORD, label: "Target keyword", required: true }, { ...URLS("Competitor URLs", 10), hint: "2–10 top-ranking pages." }],
  },
  {
    id: "competitor-strategy",
    name: "Competitor Strategy",
    group: "Keywords & Competitors",
    description: "Reverse-engineers a site's content strategy from its sitemap: content types, sections, length and publishing cadence.",
    sources: ["competitor_strategy_analyzer.py"],
    fields: [
      { name: "sitemap", label: "Sitemap URL", type: "url", placeholder: "https://competitor.com/sitemap.xml" },
      { ...URLS("…or page URLs", 60), required: false },
      { name: "maxPages", label: "Pages to analyse", type: "number", default: 30, min: 5, max: 60 },
    ],
  },
  {
    id: "keyword-cannibalization",
    name: "Keyword Cannibalization",
    group: "Site-Wide Content",
    description: "Finds pages on your site that target the same terms and compete with each other in search.",
    sources: ["keyword_cannibalization.py"],
    fields: [URLS("Page URLs", 50), { name: "threshold", label: "Similarity threshold (0–1)", type: "number", default: 0.5, min: 0.1, max: 0.99 }],
    siteUrls: 30,
  },
  {
    id: "duplicate-content",
    name: "Duplicate Content",
    group: "Site-Wide Content",
    description: "Near-duplicate pages by MinHash (copied passages) and TF-IDF cosine (same vocabulary).",
    sources: ["content_similarity_checker.py"],
    fields: [
      URLS("Page URLs", 50),
      { name: "threshold", label: "Similarity threshold (0–1)", type: "number", default: 0.7, min: 0.1, max: 1 },
      { name: "method", label: "Method", type: "select", default: "both", options: [{ value: "both", label: "MinHash + cosine" }, { value: "minhash", label: "MinHash only" }, { value: "cosine", label: "Cosine only" }] },
    ],
    siteUrls: 30,
  },
  {
    id: "content-pruning",
    name: "Content Pruning",
    group: "Site-Wide Content",
    description: "Which pages to keep, update, expand, merge or delete — from length, age, overlap and status.",
    sources: ["content_pruning_analyzer.py"],
    fields: [URLS("Page URLs", 50)],
    siteUrls: 40,
  },
  {
    id: "content-gap-map",
    name: "Content Gap Map",
    group: "Site-Wide Content",
    description: "Subtopics competitors cover that your pages miss or cover weakly.",
    sources: ["content_gap_mapper.py"],
    fields: [
      { ...URLS("Your page URLs", 20), name: "myUrls" },
      { ...URLS("Competitor URLs", 20), name: "competitorUrls" },
      { name: "topic", label: "Overall topic (optional)", type: "text" },
      { name: "topics", label: "Subtopics to find", type: "number", default: 15, min: 2, max: 30 },
    ],
  },
  {
    id: "search-console-insights",
    name: "Search Console Insights",
    group: "Backlinks & Data",
    description: "Quick wins, page-2 keywords and low-CTR top results — from your live Search Console or an exported CSV.",
    sources: ["search_console_analyzer.py"],
    fields: [
      { name: "csv", label: "Performance export (CSV, optional)", type: "csv", hint: "Leave empty to use the connected Search Console (last 28 days)." },
      { name: "dimension", label: "Live data by", type: "select", default: "query", options: [{ value: "query", label: "Query" }, { value: "page", label: "Page" }] },
      { name: "minImpressions", label: "Minimum impressions", type: "number", default: 50, min: 0, max: 1000000 },
    ],
  },
  {
    id: "log-file-analyzer",
    name: "Log File Analyzer",
    group: "Backlinks & Data",
    description: "Server access log: who crawls you, status codes, crawl budget waste, Googlebot per day and fake-Googlebot detection.",
    sources: ["log_file_analyzer.py"],
    fields: [
      { name: "log", label: "Access log file", type: "csv", hint: "Apache / Nginx combined or common format, up to 10 MB (about 50,000 lines)." },
      { name: "paste", label: "…or paste log lines", type: "textarea" },
      { name: "bot", label: "Only this bot (optional)", type: "text", placeholder: "e.g. googlebot" },
    ],
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
