// A white content card used by the page templates: numbered heading, an
// optional bold lead line under a divider, then rich-text HTML (written in
// the admin's rich text editor — the same one blog posts use).

export const RICH_TEXT_CLASSES =
  "prose max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-gray-50 prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:font-medium prose-a:text-indigo-600 prose-a:underline-offset-2 dark:prose-a:text-indigo-400 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-img:rounded-2xl prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-blockquote:border-l-4 prose-blockquote:border-indigo-300 prose-blockquote:not-italic";

export default function ContentBox({
  heading,
  lead,
  html,
  number,
  children,
}: {
  heading?: string;
  lead?: string;
  html?: string;
  number?: number;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white p-6 shadow-sm ring-1 ring-gray-900/5 sm:p-8 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5">
      {heading ? (
        <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
          {number ? <span className="mr-1.5 text-indigo-600 dark:text-indigo-400">{number}.</span> : null}
          {heading}
        </h2>
      ) : null}
      {lead ? (
        <p className="mt-4 border-t border-gray-200 pt-4 text-[15px] font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
          {lead}
        </p>
      ) : heading ? (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-800" />
      ) : null}
      {html ? <div className={`${RICH_TEXT_CLASSES} mt-4 text-[15px]`} dangerouslySetInnerHTML={{ __html: html }} /> : null}
      {children}
    </section>
  );
}
