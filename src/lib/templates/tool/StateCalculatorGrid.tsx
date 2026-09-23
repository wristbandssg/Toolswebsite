import Link from "next/link";

export interface StateCalculatorEntry {
  stateName: string;
  abbreviation: string;
  toolSlug: string | null;
}

/**
 * "Other state calculators" directory grid — shown on state-specific tax
 * tool pages, above the FAQ section (see ToolContentSections). Every US
 * state is listed even before its calculator exists, matching how
 * competitor sites present a complete 50-state directory: linked states are
 * real links, unlinked ones render as plain (non-clickable) "coming soon"
 * cells so nothing looks like a dead link. Content comes from
 * StateCalculatorLink, managed at /admin/state-calculators.
 *
 * Each cell shows the full "<State> Income Tax" label rather than just the
 * two-letter abbreviation — the abbreviation is still stored (it's the
 * unique key used in the admin panel and for React keys) but is no longer
 * the visible text, per explicit request.
 */
export function StateCalculatorGrid({ states }: { states: StateCalculatorEntry[] }) {
  if (states.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold">Other State Calculators</h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((state) =>
          state.toolSlug ? (
            <Link
              key={state.abbreviation}
              href={`/tools/${state.toolSlug}`}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
            >
              {state.stateName} Income Tax
            </Link>
          ) : (
            <span
              key={state.abbreviation}
              title={`${state.stateName} Income Tax — coming soon`}
              className="cursor-default rounded-xl border border-gray-100 px-4 py-3 text-sm font-medium text-gray-400 dark:border-gray-800 dark:text-gray-600"
            >
              {state.stateName} Income Tax
            </span>
          )
        )}
      </div>
    </section>
  );
}
