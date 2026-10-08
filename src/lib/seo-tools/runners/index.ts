import { SEO_TOOLS } from "../registry";
import type { Runner } from "./util";
import * as A from "./technical-a";
import * as B from "./technical-b";
import * as D from "./content-b";
import * as E from "./keywords";
import * as F from "./sitewide";
import * as G from "./data";

// Server side: which function runs each tool in the registry.
export const RUNNERS: Record<string, Runner> = {
  "heading-structure": A.headingStructure,
  "schema-validator": A.schemaValidator,
  "serp-features": A.serpFeatures,
  "broken-links": B.brokenLinks,
  "internal-links": B.internalLinks,
  "outbound-links": B.outboundLinks,
  "url-slugs": B.urlSlugs,
  "meta-description-generator": D.metaDescriptionGenerator,
  "title-optimizer": D.titleOptimizer,
  "tfidf-terms": D.tfidfTerms,
  "content-brief": E.contentBrief,
  "competitor-strategy": E.competitorStrategy,
  "keyword-cannibalization": F.cannibalization,
  "duplicate-content": F.duplicateContent,
  "content-pruning": F.contentPruning,
  "content-gap-map": F.contentGapMapper,
  "search-console-insights": G.searchConsoleInsights,
  "log-file-analyzer": G.logFileAnalyzer,
};

// Every generic tool in the registry must have a runner, and vice versa.
for (const t of SEO_TOOLS) if (!t.custom && !RUNNERS[t.id]) throw new Error(`SEO tool "${t.id}" has no runner`);
for (const id of Object.keys(RUNNERS)) if (!SEO_TOOLS.some((t) => t.id === id)) throw new Error(`Runner "${id}" isn't in the registry`);
