import { SectionRenderer } from "./SectionRenderer";
import type { PageSection, PageTemplateProps } from "./types";
import AdSlot from "@/components/AdSlot";

// Blue headings and readable body text for the rich-text content, document style.
const DOC_CLASSES =
  "prose max-w-none text-[15px] text-gray-800 dark:prose-invert dark:text-gray-300 prose-p:my-3 prose-p:leading-relaxed prose-p:text-gray-800 dark:prose-p:text-gray-300 prose-headings:font-semibold prose-headings:text-[#1b6aa5] dark:prose-headings:text-sky-400 prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-2xl prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-lg prose-ul:my-3 prose-ul:pl-6 prose-li:my-2 prose-li:text-gray-800 dark:prose-li:text-gray-300 prose-li:marker:text-gray-700 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-a:text-[#1b6aa5] prose-a:underline-offset-2 dark:prose-a:text-sky-400 prose-img:rounded-xl";

/**
 * Page Template 2 — Document: a plain white page for long text such as
 * Terms of Service, Privacy Policy or Disclaimer. A blue title, then each
 * Content Box as a blue heading with its rich text flowing underneath (no
 * cards, no numbers, nothing folds). A box without a heading is plain text,
 * e.g. the intro line under the title. Other section types render as usual.
 */
export default function PageTemplate2({ page }: PageTemplateProps) {
  // Each box stands alone; runs of other sections are rendered together.
  const groups: ({ kind: "box"; section: Extract<PageSection, { type: "box" }> } | { kind: "other"; sections: PageSection[] })[] = [];
  for (const section of page.sections) {
    if (section.type === "box") groups.push({ kind: "box", section });
    else {
      const last = groups[groups.length - 1];
      if (last && last.kind === "other") last.sections.push(section);
      else groups.push({ kind: "other", sections: [section] });
    }
  }

  return (
    <div className="bg-white dark:bg-gray-950">
      <article className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pt-10">
        <h1 className="text-3xl font-normal tracking-tight text-[#1b6aa5] sm:text-4xl dark:text-sky-400">{page.title}</h1>
        <AdSlot placement="page_top" />
        <div className="mt-4">
          {groups.map((group, i) =>
            group.kind === "box" ? (
              <section key={i} className="mt-6 first:mt-0">
                {group.section.heading ? (
                  <h2 className="text-xl font-semibold text-[#1b6aa5] sm:text-2xl dark:text-sky-400">{group.section.heading}</h2>
                ) : null}
                {group.section.lead ? (
                  <p className="mt-2 text-[15px] font-semibold text-gray-900 dark:text-gray-100">{group.section.lead}</p>
                ) : null}
                {group.section.html ? (
                  <div className={`${DOC_CLASSES} ${group.section.heading ? "mt-2" : ""}`} dangerouslySetInnerHTML={{ __html: group.section.html }} />
                ) : null}
              </section>
            ) : (
              <div key={i} className="mt-6 first:mt-0">
                <SectionRenderer sections={group.sections} />
              </div>
            )
          )}
        </div>
        <AdSlot placement="page_bottom" />
      </article>
    </div>
  );
}
