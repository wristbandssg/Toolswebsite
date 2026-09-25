"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  indent?: boolean;
}

/** The 13 dashboard sections from the plan doc, Section 6: Admin Dashboard Architecture. */
const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard Overview" },
  { href: "/admin/tools", label: "Tools" },
  { href: "/admin/tools/categories", label: "Tool Categories", indent: true },
  { href: "/admin/state-calculators", label: "State Calculators", indent: true },
  { href: "/admin/blogs", label: "Blog Posts" },
  { href: "/admin/blogs/categories", label: "Blog Categories", indent: true },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/templates", label: "Design Templates" },
  { href: "/admin/header-builder", label: "Header Builder" },
  { href: "/admin/footer-builder", label: "Footer Builder" },
  { href: "/admin/mega-menu", label: "Mega Menu Builder" },
  { href: "/admin/ai-planner", label: "AI Content Planner" },
  { href: "/admin/internal-linking", label: "Internal Linking" },
  { href: "/admin/calendar", label: "Content Calendar" },
  { href: "/admin/search-console", label: "Search Console" },
  { href: "/admin/media", label: "Media Library" },
  { href: "/admin/settings", label: "Website Settings" },
  { href: "/admin/ad-settings", label: "Ad Settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
        <p className="font-semibold">Calc Platform Admin</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          // Highlight only the most specific matching item — otherwise
          // "/admin/blogs/categories" would light up both "Blog Posts" and
          // "Blog Categories" at once, since the former is a prefix of it.
          const matches = NAV_ITEMS.filter(
            (n) => pathname === n.href || pathname?.startsWith(n.href + "/")
          );
          const bestMatch = matches.sort((a, b) => b.href.length - a.href.length)[0];
          const active = bestMatch?.href === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                item.indent ? "ml-3" : ""
              } ${
                active
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
              }`}
            >
              {item.indent ? <span className="mr-1 text-gray-300 dark:text-gray-600">↳</span> : null}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
