import Link from "next/link";

export interface AuthorOption {
  id: string;
  name: string;
  isDefault: boolean;
}

/** "Author" card for the Blog / Calculator forms. Empty value = the default author. */
export default function AuthorSelect({
  authors,
  value,
  onChange,
}: {
  authors: AuthorOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const fallback = authors.find((a) => a.isDefault);
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold">Author</h2>
        <Link href="/admin/authors" target="_blank" className="text-xs font-medium text-indigo-600 hover:underline">
          Manage Authors →
        </Link>
      </div>
      <p className="mb-3 text-sm text-gray-500">Their bio box is shown at the bottom of this page.</p>
      <select
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{fallback ? `Default author (${fallback.name})` : "No author"}</option>
        {authors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {authors.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">No authors yet — add one on the Authors page.</p>
      ) : null}
    </section>
  );
}
