import { SectionRenderer } from "./SectionRenderer";
import ContentBox from "./ContentBox";
import type { PageSection, PageTemplateProps } from "./types";
import AdSlot from "@/components/AdSlot";

/**
 * Page Template 1 — Boxed: a soft gradient background, the page title, then
 * every "Content Box" section as its own white card (numbered unless the box
 * turns numbering off). Other section types (headings, paragraphs, images,
 * buttons…) that sit between boxes are grouped into a plain card of their own,
 * so older pages built from those still look right.
 */
export default function PageTemplate1({ page }: PageTemplateProps) {
  // Group the sections: each box stands alone; runs of other sections share one card.
  const groups: ({ kind: "box"; section: Extract<PageSection, { type: "box" }>; number?: number } | { kind: "other"; sections: PageSection[] })[] = [];
  let boxNumber = 0;
  for (const section of page.sections) {
    if (section.type === "box") {
      const numbered = section.showNumber !== false;
      if (numbered) boxNumber++;
      groups.push({ kind: "box", section, number: numbered ? boxNumber : undefined });
    } else {
      const last = groups[groups.length - 1];
      if (last && last.kind === "other") last.sections.push(section);
      else groups.push({ kind: "other", sections: [section] });
    }
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-indigo-50/60 to-rose-50/50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/20" />
      <div aria-hidden className="pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-rose-200/30 blur-3xl dark:bg-rose-900/10" />
      <article className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">{page.title}</h1>
        <AdSlot placement="page_top" />
        <div className="mt-6 space-y-5">
          {groups.map((group, i) =>
            group.kind === "box" ? (
              <ContentBox
                key={i}
                heading={group.section.heading}
                lead={group.section.lead}
                html={group.section.html}
                number={group.number}
              />
            ) : (
              <ContentBox key={i}>
                <SectionRenderer sections={group.sections} />
              </ContentBox>
            )
          )}
        </div>
        <AdSlot placement="page_bottom" />
      </article>
    </div>
  );
}
