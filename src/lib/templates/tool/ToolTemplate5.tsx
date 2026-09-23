import CalculatorWidget from "@/components/CalculatorWidget";
import { ToolContentSections } from "./ToolContentSections";
import { ToolDescription } from "./ToolDescription";
import type { ToolTemplateProps } from "./types";

/** Tool Template 5 — Minimal: no chrome, small title, calculator immediately after, tight spacing. */
export default function ToolTemplate5(props: ToolTemplateProps) {
  const { tool } = props;
  return (
    <article className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{tool.title}</h1>
      <ToolDescription text={tool.description} className="mt-1 text-sm text-gray-500" />
      <div className="mt-4">
        <CalculatorWidget toolSlug={tool.slug} fields={tool.calcInputs} result={tool.calcResult} results={tool.calcResults} />
      </div>
      <div className="mt-6">
        <ToolContentSections {...props} />
      </div>
    </article>
  );
}
