"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  ChevronDown,
  ExternalLink,
  House,
  Image,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Newspaper,
} from "lucide-react";

type NavLink = { href: string; label: string };
type NavEntry = NavLink & { icon: LucideIcon; children?: NavLink[] };
type NavSection = { title: string; items: NavEntry[] };

// Grouped admin navigation. "Calculators", "Blog", "Home Page" and
// "Marketing" are collapsible groups: clicking the group opens its links, and
// a group starts open whenever one of its pages is the current page.
const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Content",
    items: [
      {
        href: "/admin/tools",
        label: "Calculators",
        icon: Calculator,
        children: [
          { href: "/admin/tools", label: "All Calculators" },
          { href: "/admin/tools/categories", label: "Calculator Categories" },
          { href: "/admin/state-calculators", label: "State Calculators" },
        ],
      },
      {
        href: "/admin/blogs",
        label: "Blog",
        icon: Newspaper,
        children: [
          { href: "/admin/blogs", label: "All Blogs" },
          { href: "/admin/blogs/categories", label: "Blog Categories" },
        ],
      },
      { href: "/admin/media", label: "Media Library", icon: Image },
    ],
  },
  {
    title: "Design",
    items: [
      {
        href: "/admin/homepage",
        label: "Home Page",
        icon: House,
        children: [
          { href: "/admin/homepage", label: "Home Page Design" },
          { href: "/admin/header-builder", label: "Header Builder" },
          { href: "/admin/footer-builder", label: "Footer Builder" },
          { href: "/admin/pages", label: "Pages" },
          { href: "/admin/authors", label: "Authors" },
          { href: "/admin/settings", label: "Website Settings" },
        ],
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        href: "/admin/ai-planner",
        label: "Marketing",
        icon: Megaphone,
        children: [
          { href: "/admin/ai-planner", label: "AI Content Planner" },
          { href: "/admin/internal-linking", label: "Internal Linking" },
          { href: "/admin/calendar", label: "Content Calendar" },
          { href: "/admin/search-console", label: "Search Console" },
          { href: "/admin/ad-settings", label: "Ad Settings" },
        ],
      },
    ],
  },
];

const ALL_HREFS = SECTIONS.flatMap((s) => s.items.flatMap((i) => [i.href, ...(i.children ?? []).map((c) => c.href)]));

/** The most specific nav href matching the current path (so /admin/blogs/categories doesn't also light up /admin/blogs). */
function activeHref(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  return ALL_HREFS.filter((h) => pathname === h || (h !== "/admin" && pathname.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const current = activeHref(pathname);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      SECTIONS.flatMap((s) => s.items)
        .filter((i) => i.children)
        .map((i) => [i.label, i.children!.some((c) => c.href === current)])
    )
  );

  const linkBase = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition";
  const idle = "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white";
  const activeClass = "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-900";

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Brand */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-4 dark:border-gray-800">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <Calculator aria-hidden className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-gray-900 dark:text-white">Calc Platform</span>
            <span className="block text-xs text-gray-400">Admin Panel</span>
          </span>
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="View the live site"
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900"
        >
          <ExternalLink aria-hidden className="h-4 w-4" />
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                if (!item.children) {
                  const active = current === item.href;
                  return (
                    <Link key={item.href} href={item.href} className={`${linkBase} ${active ? activeClass : idle}`}>
                      <Icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  );
                }
                const groupActive = item.children.some((c) => c.href === current);
                const isOpen = open[item.label];
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [item.label]: !o[item.label] }))}
                      aria-expanded={isOpen}
                      className={`${linkBase} w-full ${groupActive ? "text-indigo-700 dark:text-indigo-300" : idle}`}
                    >
                      <Icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        aria-hidden
                        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen ? (
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3 dark:border-gray-800">
                        {item.children.map((child) => {
                          const active = current === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`block rounded-lg px-3 py-1.5 text-sm transition ${
                                active
                                  ? "bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          <LogOut aria-hidden className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </aside>
  );
}
