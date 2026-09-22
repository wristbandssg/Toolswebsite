import { SectionRenderer } from "./SectionRenderer";
import type { PageTemplateProps } from "./types";

/** Page Template 2 — Wide: full-width hero title band, wider content column. */
export default function PageTemplate2({ page }: PageTemplateProps) {
  return (
    <article>
      <div className="bg-gray-50 py-12 dark:bg-gray-900">
        <h1 className="mx-auto max-w-5xl px-4 text-4xl font-bold">{page.title}</h1>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <SectionRenderer sections={page.sections} />
      </div>
    </article>
  );
}
