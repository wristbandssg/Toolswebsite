import CalculatorWidget from "@/components/CalculatorWidget";
import { ToolContentSections } from "./ToolContentSections";
import type { ToolTemplateProps } from "./types";

/** Tool Template 3 — Calculator First: full-bleed calculator band right under the header, title above it. */
export default function ToolTemplate3(props: ToolTemplateProps) {
  const { tool } = props;
  return (
    <article>
      <div className="bg-indigo-50 py-10 dark:bg-indigo-950/40">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-3xl font-bold">{tool.title}</h1>
          {tool.description ? (
            <p className="mt-2 text-gray-600 dark:text-gray-300">{tool.description}</p>
          ) : null}
        </div>
      </div>
      <div className="mx-auto -mt-6 max-w-2xl px-4">
        <CalculatorWidget toolSlug={tool.slug} fields={tool.calcInputs} result={tool.calcResult} />
      </div>
      <div className="mx-auto mt-10 max-w-3xl px-4 pb-10">
        <ToolContentSections {...props} />
      </div>
    </article>
  );
}
