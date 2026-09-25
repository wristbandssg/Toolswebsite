import { SectionRenderer } from "./SectionRenderer";
import type { PageTemplateProps } from "./types";
import AdSlot from "@/components/AdSlot";

/** Page Template 1 — Standard: centered, narrow reading column. */
export default function PageTemplate1({ page }: PageTemplateProps) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <AdSlot placement="page_top" />
      <div className="mt-4">
        <SectionRenderer sections={page.sections} />
      </div>
      <AdSlot placement="page_bottom" />
    </article>
  );
}
