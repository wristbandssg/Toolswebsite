import CalculatorWidget from "@/components/CalculatorWidget";
import { ToolContentSections } from "./ToolContentSections";
import type { ToolTemplateProps } from "./types";

/** Tool Template 4 — Card Focused: everything (header, calculator, content) inside stacked rounded cards. */
export default function ToolTemplate4(props: ToolTemplateProps) {
  const { tool } = props;
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
        <h1 className="text-3xl font-bold">{tool.title}</h1>
        {tool.description ? (
          <p className="mt-2 text-gray-600 dark:text-gray-300">{tool.description}</p>
        ) : null}
      </div>
      <CalculatorWidget toolSlug={tool.slug} fields={tool.calcInputs} result={tool.calcResult} />
      <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
        <ToolContentSections {...props} />
      </div>
    </article>
  );
}
