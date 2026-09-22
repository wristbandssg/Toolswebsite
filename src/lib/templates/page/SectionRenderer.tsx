import type { PageSection } from "./types";

/** Renders the Page Builder's section array (Section 8: Page Builder). Shared by both Page Templates. */
export function SectionRenderer({ sections }: { sections: PageSection[] }) {
  return (
    <>
      {sections.map((section, i) => {
        switch (section.type) {
          case "heading": {
            const Tag = (`h${section.level ?? 2}` as unknown) as "h1" | "h2" | "h3";
            return (
              <Tag key={i} className="mt-6 text-2xl font-bold first:mt-0">
                {section.text}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={i} className="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
                {section.text}
              </p>
            );
          case "image":
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={section.url}
                alt={section.alt ?? ""}
                className="mt-6 w-full rounded-xl object-cover"
              />
            );
          case "button":
            return (
              <a
                key={i}
                href={section.href}
                className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
              >
                {section.label}
              </a>
            );
          case "spacer":
            return (
              <div
                key={i}
                className={
                  section.size === "lg" ? "h-16" : section.size === "sm" ? "h-4" : "h-8"
                }
              />
            );
          case "calculator_embed":
            return (
              <div
                key={i}
                className="mt-6 rounded-xl border border-dashed border-indigo-300 p-4 text-center dark:border-indigo-800"
              >
                <a href={`/tools/${section.toolSlug}`} className="text-indigo-600 hover:underline">
                  → {section.toolTitle} খুলুন
                </a>
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
