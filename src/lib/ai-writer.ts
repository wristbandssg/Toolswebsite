// AI Content Writer: one-click drafts for a calculator page or a blog post,
// written by Claude under the site's SEO / AI-search writing rules. Used only
// by /api/ai-writer (admin login required). The admin always reviews the
// draft in the form before pressing Save — nothing here writes to the DB.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCategoryIndex } from "@/lib/category-index";
import { blogUrl } from "@/lib/urls";
import { getSiteGeneralSettings } from "@/lib/site-config";

const MODEL = process.env.AI_WRITER_MODEL || "claude-opus-5-5";

// ---------------------------------------------------------------------------
// The writing rules (from the user's SEO baseline: rubric, AIO/GEO, entity,
// topical map, SERP rules), shared by both page types.
// ---------------------------------------------------------------------------
const commonRules = (siteName: string) => `You write content for ${siteName}, a free online calculator website for US-first readers.

HARD RULES (never break):
- Never use em dashes (—) anywhere, including headings and tables. Use commas, periods, or parentheses.
- Never invent statistics, rates, prices, laws, dates, studies or sources. Use only well-established facts (formulas, definitions, standards, official agencies). If a number changes over time (tax brackets, limits, rates), say which year or source it comes from, or describe it without the number.
- Never copy sentences from other websites. Write fully original text.
- No hype words (amazing, ultimate, best ever, revolutionary, game-changer). Neutral, helpful, expert voice.
- American English and US formats: "March 15, 2026", "$25,000", "5 ft 9 in (175 cm)", "165 lb (75 kg)". Show metric next to imperial when units matter.
- Readability: grade 7 to 8. Sentences under 20 words on average. Paragraphs of 2 to 4 sentences. Most readers are on mobile.
- One fact = one value everywhere in the piece (no contradictions between sections, tables and FAQ).
- Health, money, legal and safety topics (YMYL): tie every caution to an authoritative source by name (IRS, CDC, NIH, FDA, CFPB, SSA, NIST, WHO, etc.) and add a short "this is an estimate, not professional advice" line in the assumptions/disclaimer.

SEO + AI SEARCH STRUCTURE:
- Open with a 40 to 80 word self-contained direct answer (what it is / how it works) inside the first 100 words. AI Overviews and ChatGPT quote this.
- Use H2 headings phrased as the questions people actually search ("How Do You Calculate X?", "What Is a Good X?"). Under each H2: start with a 1 to 2 sentence direct answer, then explain. Aim for 120 to 180 words per H2 section; split longer ones with H3.
- Name at least 15 real entities naturally (concepts, units, formulas, standards, agencies, organizations, related terms).
- Include evidence: tables, step-by-step worked numbers, comparisons, definitions. At least one "fact + source + why it matters" sentence (for example: "The IRS sets the 2026 standard deduction at ..., which means ...", only if you are sure of the fact).
- Information gain: include at least one useful thing most competing pages skip (a reference table of pre-computed values, common mistakes, a comparison grid, a quick rule of thumb, or edge cases).
- No keyword stuffing. Use the main keyword naturally in the first paragraph, one H2, and the meta title.

INTERNAL LINKS:
- Only link to URLs from the "Available internal links" list. Never invent a URL.
- 3 to 6 internal links total, each URL at most once, placed where the topic is first mentioned, with descriptive anchor text (the target page's name), never "click here".
- Spread links out; never two links side by side. If no link fits naturally, use fewer. Zero is better than a forced link.

HTML FORMAT (rich text fields):
- Output clean HTML only using: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a href="...">, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>.
- No <h1> (the page title is the H1). No inline styles, classes, scripts, images or markdown.

META:
- Meta title: at most 60 characters, main keyword near the start.
- Meta description: 150 to 155 characters, plain sentence, says what the reader gets.`;

const TOOL_TASK = `TASK: Write the full content for one calculator page. The calculator widget itself is already on the page; your text sits around it.

Fields:
- description: the short description shown under the tool name and on cards. 1 to 2 sentences, at most 30 words, says what it calculates.
- instructions: the "About This Calculator" section. Start with the 40 to 80 word direct-answer paragraph (no heading before it). Then H2 sections such as: how to use this calculator (numbered steps that match the real input fields), the formula (show it, explain every variable, name the unit), how to read the result, what a normal/good value is (only if a real standard exists), common mistakes, related concepts. Include at least one table. 600 to 1,000 words. Put the internal links here.
- examples: 2 or 3 worked examples with realistic, clearly made-up input numbers, solved step by step with the real formula, ending with the result. Then one summary table (Inputs | Result | What it means). Do the math carefully and double-check every number.
- assumptions: what the calculator assumes and its limits (rounding, simplifications, which standard or year the logic follows, who it is not for). Short: 60 to 150 words. YMYL tools end with a one-line "estimate, not professional advice" note.
- faq: 4 to 6 questions people really ask about this topic (People Also Ask style). Each answer 40 to 60 words, plain text (no HTML), direct answer in the first sentence, consistent with the rest of the page.
- metaTitle, metaDescription: per the META rules.

Use the calculator's real input fields, units, formula and outputs given below. Never describe an input or output the calculator does not have.`;

const BLOG_TASK = `TASK: Write one complete blog post that supports the site's calculators.

Fields:
- title: the H1. Clear, matches search intent, at most 65 characters. Keep the given title if it already works.
- slug: lowercase-hyphen URL slug, at most 6 words, no stop-word padding, no year.
- excerpt: a 1 to 2 sentence summary shown under the title and on blog cards, at most 300 characters.
- content: the post body in HTML. Start with the 40 to 80 word direct-answer paragraph to the post's main question (no heading before it). Then question-style H2 sections (120 to 180 words each, H3 for longer parts). Include at least 2 tables (comparison, reference values, or worked numbers). Include a worked example that uses the site's calculator where one fits, and link to it. End with an H2 "Frequently Asked Questions" (4 to 6 questions as H3, each answered in 40 to 60 words) and an H2 "Key Takeaways" (3 to 5 bullets, no new facts). 1,200 to 1,800 words. 3 to 6 internal links.
- tags: 3 to 6 short lowercase topic tags.
- metaTitle, metaDescription: per the META rules.

Pick the format the search intent needs: how-to (steps), "what is" (definition first), comparison (grid + verdict by use case), or guide. Be specific and practical; no filler.`;

// ---------------------------------------------------------------------------
// Output schemas (structured outputs: the response is guaranteed to match).
// ---------------------------------------------------------------------------
const ToolDraftSchema = z.object({
  description: z.string(),
  instructions: z.string(),
  examples: z.string(),
  assumptions: z.string(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),
  metaTitle: z.string(),
  metaDescription: z.string(),
});
export type ToolDraft = z.infer<typeof ToolDraftSchema>;

const BlogDraftSchema = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  metaTitle: z.string(),
  metaDescription: z.string(),
});
export type BlogDraft = z.infer<typeof BlogDraftSchema>;

// ---------------------------------------------------------------------------
// Requests from the admin forms
// ---------------------------------------------------------------------------
const ToolRequestSchema = z.object({
  kind: z.literal("tool"),
  slug: z.string(),
  title: z.string().min(1),
  categoryId: z.string().optional().default(""),
  calcFormula: z.string().optional().default(""),
  calcInputs: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  calcResult: z.record(z.string(), z.unknown()).nullable().optional(),
  calcResults: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  existing: z
    .object({
      description: z.string().optional(),
      instructions: z.string().optional(),
      examples: z.string().optional(),
      assumptions: z.string().optional(),
      faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    })
    .optional(),
  notes: z.string().optional().default(""),
});

const BlogRequestSchema = z.object({
  kind: z.literal("blog"),
  title: z.string().min(1),
  slug: z.string().optional().default(""),
  toolIds: z.array(z.string()).optional().default([]),
  existing: z
    .object({ excerpt: z.string().optional(), content: z.string().optional(), tags: z.string().optional() })
    .optional(),
  notes: z.string().optional().default(""),
});

export const WriterRequestSchema = z.discriminatedUnion("kind", [ToolRequestSchema, BlogRequestSchema]);

type LinkTarget = { title: string; href: string };

// ---------------------------------------------------------------------------
// Real internal link targets from the database (never guessed).
// ---------------------------------------------------------------------------
const STOP = new Set(["calculator", "calculators", "the", "and", "for", "how", "what", "with", "your", "from", "best", "guide", "a", "an", "to", "of", "in", "is", "vs", "on"]);

function keywords(text: string) {
  return [...new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))].slice(0, 5);
}

async function toolLinkTargets(opts: { categoryId?: string; excludeSlug?: string; text: string; ids?: string[] }) {
  const index = await getCategoryIndex();
  const select = { slug: true, title: true, categoryId: true } as const;
  const words = keywords(opts.text);
  const [picked, sameCategory, matching] = await Promise.all([
    opts.ids?.length ? prisma.tool.findMany({ where: { id: { in: opts.ids }, status: "published" }, select }) : [],
    opts.categoryId
      ? prisma.tool.findMany({ where: { categoryId: opts.categoryId, status: "published" }, select, take: 40 })
      : [],
    words.length
      ? prisma.tool.findMany({
          where: { status: "published", OR: words.map((w) => ({ title: { contains: w, mode: "insensitive" as const } })) },
          select,
          take: 40,
        })
      : [],
  ]);
  const seen = new Set<string>();
  const out: LinkTarget[] = [];
  for (const t of [...picked, ...matching, ...sameCategory]) {
    if (t.slug === opts.excludeSlug || seen.has(t.slug)) continue;
    seen.add(t.slug);
    out.push({ title: t.title, href: index.toolHref(t) });
  }
  return out.slice(0, 60);
}

async function blogLinkTargets(opts: { text: string; excludeSlug?: string }) {
  const words = keywords(opts.text);
  const posts = await prisma.blog.findMany({
    where: {
      status: "published",
      ...(words.length ? { OR: words.map((w) => ({ title: { contains: w, mode: "insensitive" as const } })) } : {}),
    },
    select: { slug: true, title: true },
    take: 25,
  });
  return posts.filter((p) => p.slug !== opts.excludeSlug).map((p) => ({ title: p.title, href: blogUrl(p.slug) }));
}

function linkList(links: LinkTarget[]) {
  return links.length ? links.map((l) => `- ${l.title}: ${l.href}`).join("\n") : "(none available, write without internal links)";
}

// ---------------------------------------------------------------------------
// Post-processing + automatic QC (deterministic checks, shown in the panel)
// ---------------------------------------------------------------------------
function noEmDash(s: string) {
  return s.replace(/\s*—\s*/g, ", ").replace(/–/g, "-");
}

/** Unwrap any internal <a> whose href is not a real page from the list. */
function keepRealLinks(html: string, allowed: Set<string>) {
  return html.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (whole, href: string, text: string) => {
    if (/^https?:\/\//i.test(href)) return whole; // external source links are fine
    return allowed.has(href) ? `<a href="${href}">${text}</a>` : text;
  });
}

function words(html: string) {
  return html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

export type QcCheck = { label: string; ok: boolean; detail: string };

function qcCommon(htmlParts: string[], metaTitle: string, metaDescription: string, allowed: Set<string>): QcCheck[] {
  const html = htmlParts.join("\n");
  const internal = [...html.matchAll(/<a\s+[^>]*href="(\/[^"]*)"/gi)].map((m) => m[1]);
  const tables = (html.match(/<table/gi) ?? []).length;
  const h2 = (html.match(/<h2/gi) ?? []).length;
  return [
    { label: "Meta title ≤ 60 chars", ok: metaTitle.length > 0 && metaTitle.length <= 60, detail: `${metaTitle.length} chars` },
    {
      label: "Meta description 150–155 chars",
      ok: metaDescription.length >= 140 && metaDescription.length <= 160,
      detail: `${metaDescription.length} chars`,
    },
    {
      label: "Internal links (3–6, real pages only)",
      ok: internal.length >= Math.min(3, allowed.size) && internal.length <= 6,
      detail: `${internal.length} link(s), ${new Set(internal).size} unique`,
    },
    { label: "Tables", ok: tables >= 1, detail: `${tables}` },
    { label: "H2 sections", ok: h2 >= 3, detail: `${h2}` },
    { label: "No em dashes", ok: !html.includes("—"), detail: "checked" },
  ];
}

// ---------------------------------------------------------------------------
// Claude call
// ---------------------------------------------------------------------------
let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new WriterError("AI writer is not set up: add ANTHROPIC_API_KEY to the server environment.", 503);
  }
  client ??= new Anthropic();
  return client;
}

export class WriterError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

async function runClaude<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T> {
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new WriterError("The AI declined to write this topic. Try different notes.", 422);
  if (message.stop_reason === "max_tokens") throw new WriterError("The draft was too long and got cut off. Try again.", 502);
  const parsed = message.parsed_output;
  if (!parsed) throw new WriterError("The AI returned an unreadable draft. Try again.", 502);
  return parsed as T;
}

function today() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function writeTool(req: z.infer<typeof ToolRequestSchema>) {
  const index = await getCategoryIndex();
  const categoryName = req.categoryId ? index.byId.get(req.categoryId)?.name ?? "" : "";
  const [tools, blogs] = await Promise.all([
    toolLinkTargets({ categoryId: req.categoryId, excludeSlug: req.slug, text: req.title }),
    blogLinkTargets({ text: req.title }),
  ]);
  const links = [...tools, ...blogs];
  const allowed = new Set(links.map((l) => l.href));

  const inputs = req.calcInputs
    .map((f) => `- ${String(f.label ?? f.key)}${f.unit ? ` (${String(f.unit)})` : ""}${f.type ? ` [${String(f.type)}]` : ""}${f.options ? `, options: ${JSON.stringify(f.options).slice(0, 300)}` : ""}`)
    .join("\n");
  const outputs = (req.calcResults.length ? req.calcResults : req.calcResult ? [req.calcResult] : [])
    .map((r) => `- ${String(r.label ?? "Result")}${r.unit ? ` (${String(r.unit)})` : ""}`)
    .join("\n");
  const ex = req.existing ?? {};
  const existing = [ex.description, ex.instructions, ex.examples, ex.assumptions].some((s) => s && s.trim())
    ? `\nCURRENT CONTENT (improve and expand it; keep anything correct and useful, fix anything wrong):\nDescription: ${ex.description ?? ""}\nAbout: ${(ex.instructions ?? "").slice(0, 6000)}\nExamples: ${(ex.examples ?? "").slice(0, 3000)}\nAssumptions: ${(ex.assumptions ?? "").slice(0, 1500)}\nFAQ: ${JSON.stringify(ex.faq ?? []).slice(0, 2000)}\n`
    : "";

  const user = `Today is ${today()}.

CALCULATOR: ${req.title}
Category: ${categoryName || "(none)"}
Page URL: ${req.slug ? index.toolHref({ slug: req.slug, categoryId: req.categoryId || null }) : "(new)"}
Input fields:
${inputs || "(not given)"}
Outputs:
${outputs || "(not given)"}
Formula / logic: ${req.calcFormula || "(custom code logic, describe the standard method for this calculation)"}
${existing}
Available internal links (title: URL):
${linkList(links)}
${req.notes ? `\nEXTRA INSTRUCTIONS FROM THE EDITOR (follow them unless they break a hard rule):\n${req.notes}\n` : ""}`;

  const { siteName } = await getSiteGeneralSettings();
  const draft = await runClaude(`${commonRules(siteName)}\n\n${TOOL_TASK}`, user, ToolDraftSchema);
  const clean = (s: string) => keepRealLinks(noEmDash(s), allowed);
  const result: ToolDraft = {
    description: noEmDash(draft.description),
    instructions: clean(draft.instructions),
    examples: clean(draft.examples),
    assumptions: clean(draft.assumptions),
    faq: draft.faq.map((f) => ({ question: noEmDash(f.question), answer: noEmDash(f.answer) })),
    metaTitle: noEmDash(draft.metaTitle),
    metaDescription: noEmDash(draft.metaDescription),
  };
  const firstPara = result.instructions.match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "";
  const qc: QcCheck[] = [
    { label: "Direct answer 40–80 words at the top", ok: words(firstPara) >= 40 && words(firstPara) <= 80, detail: `${words(firstPara)} words` },
    { label: "About section length", ok: words(result.instructions) >= 500, detail: `${words(result.instructions)} words` },
    { label: "FAQ 4–6 questions", ok: result.faq.length >= 4 && result.faq.length <= 6, detail: `${result.faq.length}` },
    ...qcCommon([result.instructions, result.examples, result.assumptions], result.metaTitle, result.metaDescription, allowed),
  ];
  return { draft: result, qc };
}

export async function writeBlog(req: z.infer<typeof BlogRequestSchema>) {
  const [tools, blogs] = await Promise.all([
    toolLinkTargets({ text: `${req.title} ${req.notes}`, ids: req.toolIds }),
    blogLinkTargets({ text: req.title, excludeSlug: req.slug }),
  ]);
  const links = [...tools, ...blogs];
  const allowed = new Set(links.map((l) => l.href));
  const ex = req.existing ?? {};
  const existing = ex.content && ex.content.replace(/<[^>]+>/g, "").trim()
    ? `\nCURRENT DRAFT (improve and expand it; keep anything correct and useful):\nExcerpt: ${ex.excerpt ?? ""}\nTags: ${ex.tags ?? ""}\nContent: ${ex.content.slice(0, 12000)}\n`
    : "";

  const user = `Today is ${today()}.

BLOG POST TOPIC / WORKING TITLE: ${req.title}
${existing}
Available internal links (title: URL). Calculators listed first; link the most relevant calculator early:
${linkList(links)}
${req.notes ? `\nEXTRA INSTRUCTIONS FROM THE EDITOR (follow them unless they break a hard rule):\n${req.notes}\n` : ""}`;

  const { siteName } = await getSiteGeneralSettings();
  const draft = await runClaude(`${commonRules(siteName)}\n\n${BLOG_TASK}`, user, BlogDraftSchema);
  const result: BlogDraft = {
    title: noEmDash(draft.title),
    slug: draft.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
    excerpt: noEmDash(draft.excerpt),
    content: keepRealLinks(noEmDash(draft.content), allowed),
    tags: draft.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    metaTitle: noEmDash(draft.metaTitle),
    metaDescription: noEmDash(draft.metaDescription),
  };
  const firstPara = result.content.match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "";
  const qc: QcCheck[] = [
    { label: "Direct answer 40–80 words at the top", ok: words(firstPara) >= 40 && words(firstPara) <= 80, detail: `${words(firstPara)} words` },
    { label: "Excerpt ≤ 300 chars", ok: result.excerpt.length <= 300, detail: `${result.excerpt.length} chars` },
    { label: "Post length 1,200+ words", ok: words(result.content) >= 1200, detail: `${words(result.content)} words` },
    ...qcCommon([result.content], result.metaTitle, result.metaDescription, allowed),
  ];
  return { draft: result, qc };
}
