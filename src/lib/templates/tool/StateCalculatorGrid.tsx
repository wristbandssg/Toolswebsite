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
 *
 * Cells carry their own solid background (not just a border) because this
 * section sits directly on the page's own light-gray background (see
 * ToolTemplate3/1/4) with no white card wrapping it — a border-only cell in
 * a near-matching gray was nearly invisible against that backdrop. Linked
 * and "coming soon" cells are also given a visibly different look (solid
 * card vs. dashed/muted card + explicit "Coming soon" sub-label) so the two
 * states are obvious without needing to hover or click.
 */
export function StateCalculatorGrid({ states }: { states: StateCalculatorEntry[] }) {
  if (states.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold">Other State Calculators</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((state) =>
          state.toolSlug ? (
            <Link
              key={state.abbreviation}
              href={`/tools/${state.toolSlug}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
            >
              {state.stateName} Income Tax
            </Link>
          ) : (
            <span
              key={state.abbreviation}
              title={`${state.stateName} Income Tax — coming soon`}
              className="cursor-default rounded-xl border border-dashed border-gray-300 bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400"
            >
              <span className="block">{state.stateName} Income Tax</span>
              <span className="mt-0.5 block text-xs font-normal text-gray-400 dark:text-gray-500">
                Coming soon
              </span>
            </span>
          )
        )}
      </div>
    </section>
  );
}
