"use client";

import { Children, useState } from "react";

/**
 * A card grid that shows the first `initial` cards and reveals the rest in
 * place with one button click — no navigation. Every card is still in the
 * HTML (just hidden), so search engines can follow all the links.
 */
export default function ShowMoreGrid({
  initial,
  className,
  noun,
  children,
}: {
  initial: number;
  className: string;
  noun: [singular: string, plural: string];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const hiddenCount = open ? 0 : Math.max(0, items.length - initial);

  return (
    <>
      <div className={className}>
        {items.map((item, i) => (
          <div key={i} className={!open && i >= initial ? "hidden" : "flex [&>*]:w-full"}>
            {item}
          </div>
        ))}
      </div>
      {hiddenCount > 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-gray-900 dark:text-indigo-400 dark:hover:bg-gray-800"
          >
            Show {hiddenCount} more {hiddenCount === 1 ? noun[0] : noun[1]} ↓
          </button>
          <p className="text-xs text-gray-400">
            Showing {initial} of {items.length} {noun[1]}
          </p>
        </div>
      ) : null}
    </>
  );
}
