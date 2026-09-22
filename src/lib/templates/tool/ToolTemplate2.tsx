import Link from "next/link";
import CalculatorWidget from "@/components/CalculatorWidget";
import { ToolContentSections } from "./ToolContentSections";
import type { ToolTemplateProps } from "./types";

/** Tool Template 2 — Split Sidebar: sticky calculator in a right sidebar, content in the main column. */
export default function ToolTemplate2(props: ToolTemplateProps) {
  const { tool } = props;
  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/">Home</Link> / <Link href="/tools">Tools</Link> / {tool.title}
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-bold">{tool.title}</h1>
          {tool.description ? (
            <p className="mt-2 text-gray-600 dark:text-gray-300">{tool.description}</p>
          ) : null}
          <div className="mt-8">
            <ToolContentSections {...props} />
          </div>
        </div>
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <CalculatorWidget toolSlug={tool.slug} fields={tool.calcInputs} result={tool.calcResult} />
        </aside>
      </div>
    </article>
  );
}
