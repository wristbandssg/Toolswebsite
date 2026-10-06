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
    <div className="relative overflow-hidden bg-[#f6f7fb] dark:bg-gray-950">
      {/* Soft pastel wash across the top, fading into the light grey page (like Omni's About page). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[linear-gradient(100deg,#fbf3e4_0%,#fbe9ee_30%,#ebe9fb_60%,#e3e8fd_100%)] opacity-80 [mask-image:linear-gradient(to_bottom,black,transparent)] dark:opacity-10"
      />
      <article className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pt-14">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-[28px] dark:text-white">{page.title}</h1>
        <AdSlot placement="page_top" />
        <div className="mt-5 space-y-4">
          {groups.map((group, i) =>
            group.kind === "box" ? (
              <ContentBox
                key={i}
                heading={group.section.heading}
                lead={group.section.lead}
                html={group.section.html}
                number={group.number}
                collapsed={group.section.collapsed}
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
