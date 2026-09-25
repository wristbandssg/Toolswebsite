import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { MenuItem } from "@/lib/menu/types";
import { getSiteGeneralSettings } from "@/lib/site-config";
import AdSlot from "@/components/AdSlot";

// Header/Footer/Mega Menu are data-driven from the `menus` table (Section 9:
// Header/Footer/Mega Menu Builder) — always fetch fresh so admin edits show
// up immediately without a rebuild.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteGeneralSettings();
  return {
    title: { default: settings.siteName, template: `%s | ${settings.siteName}` },
    description: settings.siteDescription,
  };
}

async function loadMenu(location: string): Promise<MenuItem[]> {
  const menu = await prisma.menu.findUnique({ where: { location } });
  if (!menu) return [];
  try {
    return JSON.parse(menu.structure) as MenuItem[];
  } catch {
    return [];
  }
}

const DEFAULT_HEADER_ITEMS: MenuItem[] = [
  { id: "default-tools", label: "Tools", href: "/tools", children: [] },
  { id: "default-blog", label: "Blog", href: "/blog", children: [] },
];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [headerItemsRaw, megaItems, footerItems, settings] = await Promise.all([
    loadMenu("header"),
    loadMenu("mega-menu"),
    loadMenu("footer"),
    getSiteGeneralSettings(),
  ]);
  const headerItems = headerItemsRaw.length > 0 ? headerItemsRaw : DEFAULT_HEADER_ITEMS;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.siteName} className="h-7 w-7 rounded object-contain" />
            ) : null}
            {settings.siteName}
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
            {headerItems.map((item) => (
              <div key={item.id} className="group relative">
                <Link href={item.href || "#"} className="hover:text-gray-900 dark:hover:text-white">
                  {item.label}
                </Link>
                {item.children.length > 0 ? (
                  <div className="invisible absolute left-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 dark:border-gray-800 dark:bg-gray-900">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href || "#"}
                        className="block rounded-md px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {megaItems.map((item) => (
              <div key={item.id} className="group relative">
                <Link href={item.href || "#"} className="hover:text-gray-900 dark:hover:text-white">
                  {item.label}
                </Link>
                {item.children.length > 0 ? (
                  <div className="invisible absolute left-1/2 top-full z-20 mt-2 grid w-[36rem] -translate-x-1/2 grid-cols-3 gap-6 rounded-xl border border-gray-200 bg-white p-6 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 dark:border-gray-800 dark:bg-gray-900">
                    {item.children.map((col) =>
                      col.children.length > 0 ? (
                        <div key={col.id}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {col.label}
                          </p>
                          <div className="space-y-1.5">
                            {col.children.map((link) => (
                              <Link
                                key={link.id}
                                href={link.href || "#"}
                                className="block text-sm hover:text-indigo-600"
                              >
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Link
                          key={col.id}
                          href={col.href || "#"}
                          className="block text-sm font-medium hover:text-indigo-600"
                        >
                          {col.label}
                        </Link>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4">
        <AdSlot placement="site_header_bottom" />
      </div>

      <main className="flex-1">{children}</main>

      <div className="mx-auto w-full max-w-6xl px-4">
        <AdSlot placement="site_footer_top" />
      </div>

      <footer className="border-t border-gray-200 py-10 text-sm text-gray-500 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4">
          {footerItems.length > 0 ? (
            <div className="grid gap-8 sm:grid-cols-3">
              {footerItems.map((col) => (
                <div key={col.id}>
                  <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">{col.label}</p>
                  <div className="space-y-1.5">
                    {col.children.map((link) => (
                      <Link
                        key={link.id}
                        href={link.href || "#"}
                        className="block hover:text-gray-900 dark:hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-8 text-center">
            © {new Date().getFullYear()} {settings.siteName}
          </p>
        </div>
      </footer>
    </div>
  );
}
