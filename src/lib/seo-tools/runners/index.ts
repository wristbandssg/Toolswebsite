import { SEO_TOOLS } from "../registry";
import type { Runner } from "./util";
import * as A from "./technical-a";
import * as B from "./technical-b";
import * as C from "./content-a";
import * as D from "./content-b";
import * as E from "./keywords";
import * as F from "./sitewide";
import * as G from "./data";

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
  "competitor-analysis": E.competitorAnalysis,
  "content-brief": E.contentBrief,
  "keyword-gap": E.keywordGap,
  "lsi-keywords": E.lsiKeywords,
  "keyword-difficulty": E.keywordDifficulty,
  "keyword-intent": E.keywordIntent,
  "competitor-strategy": E.competitorStrategy,
  "content-calendar": E.contentCalendar,
  "keyword-clustering": F.keywordClustering,
  "entity-analysis": F.entityAnalysis,
  "keyword-cannibalization": F.cannibalization,
  "duplicate-content": F.duplicateContent,
  "content-pruning": F.contentPruning,
  "semantic-similarity": F.semanticSimilarity,
  "topic-modeler": F.topicModeler,
  "topic-authority": F.topicAuthority,
  "content-gap-map": F.contentGapMapper,
  "backlink-anchors": G.backlinkAnchors,
  "toxic-backlinks": G.toxicBacklinks,
  "search-console-insights": G.searchConsoleInsights,
  "log-file-analyzer": G.logFileAnalyzer,
};

// Every generic tool in the registry must have a runner, and vice versa.
for (const t of SEO_TOOLS) if (!t.custom && !RUNNERS[t.id]) throw new Error(`SEO tool "${t.id}" has no runner`);
for (const id of Object.keys(RUNNERS)) if (!SEO_TOOLS.some((t) => t.id === id)) throw new Error(`Runner "${id}" isn't in the registry`);
