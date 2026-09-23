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
 * Shared content blocks (Instructions, Examples, FAQ, Related Tools, Support
 * Blogs) reused across all 5 Tool Templates — see plan doc Section 6
 * "Calculator Tool Page Design" for the full section list. Only the outer
 * layout differs per template; this keeps that content logic in one place.
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
        <section>
          <h2 className="mb-2 text-xl font-semibold">How to Use This Calculator</h2>
          <Paragraphs text={tool.instructions} />
        </section>
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
