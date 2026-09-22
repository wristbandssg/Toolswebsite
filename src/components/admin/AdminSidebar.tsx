"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

/** The 13 dashboard sections from the plan doc, Section 6: Admin Dashboard Architecture. */
const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard Overview" },
  { href: "/admin/tools", label: "Calculator Tools" },
  { href: "/admin/blogs", label: "Blog Posts" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/templates", label: "Design Templates" },
  { href: "/admin/header-builder", label: "Header Builder" },
  { href: "/admin/footer-builder", label: "Footer Builder" },
  { href: "/admin/mega-menu", label: "Mega Menu Builder" },
  { href: "/admin/ai-planner", label: "AI Content Planner" },
  { href: "/admin/seo", label: "SEO Management" },
  { href: "/admin/internal-linking", label: "Internal Linking" },
  { href: "/admin/media", label: "Media Library" },
  { href: "/admin/settings", label: "Website Settings" },
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
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
              }`}
            >
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
