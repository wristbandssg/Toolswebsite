// A white content card used by the page templates: numbered heading, an
// optional bold lead line under a divider, then rich-text HTML (written in
// the admin's rich text editor — the same one blog posts use). A box with a
// heading folds: visitors click the heading to open or close it (native
// <details>, so it works without JavaScript); `collapsed` starts it closed.

export const RICH_TEXT_CLASSES =
  "prose max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-gray-50 prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:font-medium prose-a:text-indigo-600 prose-a:underline-offset-2 dark:prose-a:text-indigo-400 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-img:rounded-2xl prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-blockquote:border-l-4 prose-blockquote:border-indigo-300 prose-blockquote:not-italic";

const CARD = "rounded-2xl bg-white px-5 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-6 dark:bg-gray-900";

function Body({ lead, html, children }: { lead?: string; html?: string; children?: React.ReactNode }) {
  return (
    <>
      <div className="mt-4 border-t border-gray-200 dark:border-gray-800" />
      {lead ? <p className="mt-2.5 text-sm font-semibold text-gray-900 sm:text-[15px] dark:text-gray-100">{lead}</p> : null}
      {html ? (
        <div className={`${RICH_TEXT_CLASSES} mt-4 text-sm sm:text-[15px] prose-p:my-3 prose-p:text-gray-800 dark:prose-p:text-gray-300`} dangerouslySetInnerHTML={{ __html: html }} />
      ) : null}
      {children}
    </>
  );
}

export default function ContentBox({
  heading,
  lead,
  html,
  number,
  collapsed,
  children,
}: {
  heading?: string;
  lead?: string;
  html?: string;
  number?: number;
  collapsed?: boolean;
  children?: React.ReactNode;
}) {
  if (!heading) {
    return (
      <section className={CARD}>
        {lead ? <p className="text-sm font-semibold text-gray-900 sm:text-[15px] dark:text-gray-100">{lead}</p> : null}
        {html ? <div className={`${RICH_TEXT_CLASSES} text-sm sm:text-[15px]`} dangerouslySetInnerHTML={{ __html: html }} /> : null}
        {children}
      </section>
    );
  }

  const hasBody = Boolean(lead || html || children);
  const title = (
    <h2 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl dark:text-white">
      {number ? `${number}. ` : null}
      {heading}
    </h2>
  );

  if (!hasBody) return <section className={CARD}>{title}</section>;

  return (
    <details open={!collapsed} className={`group ${CARD}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </summary>
      <Body lead={lead} html={html}>
        {children}
      </Body>
    </details>
  );
}
