import Link from "next/link";
import CalculatorWidget from "@/components/CalculatorWidget";
import { ToolContentSections } from "./ToolContentSections";
import { ToolDescription } from "./ToolDescription";
import type { ToolTemplateProps } from "./types";

/** Tool Template 1 — Classic: title/description, then full-width calculator, then content below. */
export default function ToolTemplate1(props: ToolTemplateProps) {
  const { tool } = props;
  return (
    // Full-bleed light background — see ToolTemplate3 for why.
    <div className="bg-gray-50 dark:bg-gray-950">
      <article className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/">Home</Link> / <Link href="/tools">Tools</Link> / {tool.title}
        </nav>
        <h1 className="text-3xl font-bold">{tool.title}</h1>
        <ToolDescription text={tool.description} className="mt-2 text-gray-600 dark:text-gray-300" />
        <div className="mt-6">
          <CalculatorWidget toolSlug={tool.slug} fields={tool.calcInputs} result={tool.calcResult} results={tool.calcResults} />
        </div>
        <div className="mt-10">
          <ToolContentSections {...props} />
        </div>
      </article>
    </div>
  );
}
