import CalculatorWidget from "@/components/CalculatorWidget";
import { ToolContentSections } from "./ToolContentSections";
import { ToolDescription } from "./ToolDescription";
import type { ToolTemplateProps } from "./types";

/** Tool Template 3 — Calculator First: full-bleed calculator band right under the header, title above it. */
export default function ToolTemplate3(props: ToolTemplateProps) {
  const { tool } = props;
  return (
    // Full-bleed light background behind the whole page — without it, the
    // centered content column leaves large flat-white margins on wide
    // screens that read as broken/empty rather than an intentional layout.
    <div className="bg-gray-50 dark:bg-gray-950">
      <article>
        <div className="bg-indigo-50 py-10 dark:bg-indigo-950/40">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h1 className="text-3xl font-bold">{tool.title}</h1>
            <ToolDescription text={tool.description} className="mt-2 text-gray-600 dark:text-gray-300" />
          </div>
        </div>
        <div className="mx-auto -mt-6 max-w-5xl px-4">
          <CalculatorWidget toolSlug={tool.slug} fields={tool.calcInputs} result={tool.calcResult} results={tool.calcResults} />
        </div>
        <div className="mx-auto mt-10 max-w-6xl px-4 pb-10">
          <ToolContentSections {...props} />
        </div>
      </article>
    </div>
  );
}
