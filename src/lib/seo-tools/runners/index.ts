import { SEO_TOOLS } from "../registry";
import type { Runner } from "./util";
import * as A from "./technical-a";
import * as B from "./technical-b";
import * as C from "./content-a";
import * as D from "./content-b";

// Server side: which function runs each tool in the registry.
export const RUNNERS: Record<string, Runner> = {
  "meta-social-tags": A.metaSocialTags,
  "heading-structure": A.headingStructure,
  "image-seo": A.imageSeo,
  "canonical-check": A.canonicalCheck,
  "redirect-chains": A.redirectChains,
  "schema-validator": A.schemaValidator,
  "serp-features": A.serpFeatures,
  "serp-snippet": A.serpSnippet,
  "broken-links": B.brokenLinks,
  "internal-links": B.internalLinks,
  "outbound-links": B.outboundLinks,
  "robots-txt": B.robotsTxt,
  "sitemap-check": B.sitemapCheck,
  "url-slugs": B.urlSlugs,
  "page-speed": B.pageSpeed,
  "mobile-friendly": B.mobileFriendly,
  "content-ratio": B.contentRatio,
  hreflang: B.hreflang,
  "local-seo": B.localSeo,
  readability: C.readabilityTool,
  "sentence-complexity": C.sentenceComplexity,
  "word-frequency": C.wordFrequency,
  "thin-content": C.thinContent,
  "content-freshness": C.contentFreshness,
  "content-optimizer": C.contentOptimizer,
  "question-finder": C.questionFinder,
  "meta-description-generator": D.metaDescriptionGenerator,
  "title-optimizer": D.titleOptimizer,
  "faq-schema": D.faqSchema,
  "structured-data": D.structuredData,
  "content-repurposer": D.contentRepurposer,
  "content-length-benchmark": D.contentLengthBenchmark,
  "tfidf-terms": D.tfidfTerms,
  sentiment: D.sentiment,
};

// Every generic tool in the registry must have a runner, and vice versa.
for (const t of SEO_TOOLS) if (!t.custom && !RUNNERS[t.id]) throw new Error(`SEO tool "${t.id}" has no runner`);
for (const id of Object.keys(RUNNERS)) if (!SEO_TOOLS.some((t) => t.id === id)) throw new Error(`Runner "${id}" isn't in the registry`);
