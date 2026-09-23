import CalculatorWidget from "@/components/CalculatorWidget";
import { ToolContentSections } from "./ToolContentSections";
import { ToolDescription } from "./ToolDescription";
import type { ToolTemplateProps } from "./types";

/** Tool Template 4 — Card Focused: everything (header, calculator, content) inside stacked rounded cards. */
export default function ToolTemplate4(props: ToolTemplateProps) {
  const { tool } = props;
  return (
    // Full-bleed light background — see ToolTemplate3 for why.
    <div className="bg-gray-50 dark:bg-gray-950">
      <article className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">{tool.title}</h1>
          <ToolDescription text={tool.description} className="mt-2 text-gray-600 dark:text-gray-300" />
        </div>
        <CalculatorWidget toolSlug={tool.slug} fields={tool.calcInputs} result={tool.calcResult} results={tool.calcResults} />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <ToolContentSections {...props} />
        </div>
      </article>
    </div>
  );
}
