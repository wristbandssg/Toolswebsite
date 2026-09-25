import { ChevronDown } from "lucide-react";
import type { ToolTemplateProps } from "./types";
import { StateCalculatorGrid } from "./StateCalculatorGrid";
import AdSlot from "@/components/AdSlot";

/** Instructions/Examples/Assumptions are authored with the same rich-text
 * editor as Blog posts (see admin ToolForm → RichTextEditor) and stored as
 * HTML, not plain text — so they render the same way the blog's content
 * does (see BlogTemplate), via dangerouslySetInnerHTML with `prose` styling,
 * rather than the old plain-text "\n\n"-split paragraphs. This is what lets
 * an admin add links and images inside these sections. */
function RichContent({ html }: { html: string }) {
  return (
    <div
      className="prose max-w-none dark:prose-invert prose-a:font-medium prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-img:rounded-xl"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * A closed-by-default accordion bar — grey summary row with a chevron that
 * rotates on open, content revealed below a divider. Used ONLY for "About
 * This Calculator" (per explicit request — Assumptions and Example are
 * always-visible plain sections, not accordions).
 */
function AccordionSection({ title, html }: { title: string; html: string }) {
  return (
    <details className="group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <summary className="flex cursor-pointer list-none items-center justify-between bg-gray-50 px-4 py-3 font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-800">
        <RichContent html={html} />
      </div>
    </details>
  );
}

/**
 * Shared content blocks (About This Calculator, Example, Assumptions, FAQ,
 * Related Tools, Support Blogs) reused across all 5 Tool Templates — see
 * plan doc Section 6 "Calculator Tool Page Design" for the full section
 * list. Only the outer layout differs per template; this keeps that content
 * logic in one place.
 *
 * Section order/behavior, per explicit request: "About This Calculator" is
 * the ONLY collapsible accordion — Example sits directly below it, and
 * Assumptions is a plain always-visible section (not a dropdown) after
 * Example, not grouped with About This Calculator.
 *
 * IMPORTANT: the "Other State Calculators" grid's position — directly above
 * the FAQ section — and its own rendering are untouched here. Don't move or
 * restyle it when editing this file.
 */
export function ToolContentSections({
  tool,
  relatedTools,
  supportBlogs,
  stateCalculators,
}: ToolTemplateProps) {
  return (
    <div className="space-y-8">
      {tool.instructions ? (
        <AccordionSection title="About This Calculator" html={tool.instructions} />
      ) : null}

      <AdSlot placement="tool_content_top" />

      {tool.examples ? (
        <section>
          <h2 className="mb-2 text-xl font-semibold">Example</h2>
          <RichContent html={tool.examples} />
        </section>
      ) : null}

      {tool.assumptions ? (
        <section>
          <h2 className="mb-2 text-xl font-semibold">Assumptions</h2>
          <RichContent html={tool.assumptions} />
        </section>
      ) : null}

      {/* Above the FAQ, per request — a directory of the other 49 states'
          calculators (this tool's own state is filtered out server-side). */}
      {stateCalculators && stateCalculators.length > 0 ? (
        <StateCalculatorGrid states={stateCalculators} />
      ) : null}

      {tool.faq.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xl font-semibold">Frequently Asked Questions</h2>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {tool.faq.map((item, i) => (
              <details key={i} className="group py-3">
                <summary className="cursor-pointer list-none font-medium">
                  {item.question}
                </summary>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {relatedTools.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xl font-semibold">Related Calculators</h2>
          <ul className="flex flex-wrap gap-2">
            {relatedTools.map((t) => (
              <li key={t.slug}>
                <a
                  href={`/tools/${t.slug}`}
                  className="rounded-full border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {supportBlogs.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xl font-semibold">Read More About This Topic</h2>
          <ul className="space-y-2">
            {supportBlogs.map((b) => (
              <li key={b.slug}>
                <a href={`/blog/${b.slug}`} className="text-indigo-600 hover:underline">
                  {b.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AdSlot placement="tool_content_bottom" />
    </div>
  );
}
