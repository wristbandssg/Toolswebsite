import { ChevronDown } from "lucide-react";
import type { ToolTemplateProps } from "./types";
import { StateCalculatorGrid } from "./StateCalculatorGrid";

/** Splits on blank lines so a multi-paragraph Instructions/Examples string
 * actually renders as separate paragraphs — a plain string dropped into a
 * <div> ignores "\n\n" and runs everything together in one block. */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="prose max-w-none dark:prose-invert">
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  );
}

/**
 * A closed-by-default accordion bar — grey summary row with a chevron that
 * rotates on open, content revealed below a divider. This is the standard
 * format for a tool page's top content sections from here on ("About This
 * Calculator", "Assumptions", ...), matching the reference layout at
 * smartasset.com/taxes/alaska-tax-calculator: a calculator page opens with
 * collapsed accordions rather than walls of always-visible text.
 */
function AccordionSection({ title, text }: { title: string; text: string }) {
  return (
    <details className="group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <summary className="flex cursor-pointer list-none items-center justify-between bg-gray-50 px-4 py-3 font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-800">
        <Paragraphs text={text} />
      </div>
    </details>
  );
}

/**
 * Shared content blocks (About This Calculator, Assumptions, Examples, FAQ,
 * Related Tools, Support Blogs) reused across all 5 Tool Templates — see
 * plan doc Section 6 "Calculator Tool Page Design" for the full section
 * list. Only the outer layout differs per template; this keeps that content
 * logic in one place.
 *
 * IMPORTANT: the "Other State Calculators" grid's position — directly above
 * the FAQ section — and its own rendering are untouched by the accordion
 * redesign below. Don't move or restyle it when editing this file.
 */
export function ToolContentSections({
  tool,
  relatedTools,
  supportBlogs,
  stateCalculators,
}: ToolTemplateProps) {
  return (
    <div className="space-y-8">
      {tool.instructions || tool.assumptions ? (
        <div className="space-y-3">
          {tool.instructions ? (
            <AccordionSection title="About This Calculator" text={tool.instructions} />
          ) : null}
          {tool.assumptions ? (
            <AccordionSection title="Assumptions" text={tool.assumptions} />
          ) : null}
        </div>
      ) : null}

      {tool.examples ? (
        <section>
          <h2 className="mb-2 text-xl font-semibold">Example</h2>
          <Paragraphs text={tool.examples} />
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
    </div>
  );
}
