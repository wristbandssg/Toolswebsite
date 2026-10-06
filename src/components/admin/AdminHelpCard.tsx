// A small sticky "how this works" side card for admin builder pages.
export default function AdminHelpCard({
  title = "How This Works",
  tips,
  link,
}: {
  title?: string;
  tips: React.ReactNode[];
  link?: { href: string; label: string };
}) {
  return (
    <aside className="h-fit space-y-4 rounded-2xl border border-gray-200 bg-white p-5 xl:sticky xl:top-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-semibold">{title}</h2>
      <ul className="space-y-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-0.5 text-indigo-500">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      {link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {link.label}
        </a>
      ) : null}
    </aside>
  );
}
