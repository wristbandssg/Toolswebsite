import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { MenuItem } from "@/lib/menu/types";
import { DEFAULT_HEADER_ITEMS } from "@/lib/menu/defaults";
import HeaderNavItem from "@/components/site/HeaderNavItem";
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

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [headerItemsRaw, legacyMegaItems, footerItems, settings] = await Promise.all([
    loadMenu("header"),
    loadMenu("mega-menu"),
    loadMenu("footer"),
    getSiteGeneralSettings(),
  ]);
  // Mega menus are now built in the Header Builder; items still in the old
  // separate "mega-menu" list show after the header items until the admin
  // saves the Header Builder (which moves them into the header list).
  const headerItems = [
    ...(headerItemsRaw.length > 0 ? headerItemsRaw : DEFAULT_HEADER_ITEMS),
    ...legacyMegaItems.map((item) => ({ ...item, mega: true })),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky header: stays at the top while the page scrolls. */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 dark:border-gray-800 dark:bg-gray-950/90">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.siteName} className="h-7 w-7 rounded object-contain" />
            ) : null}
            {settings.siteName}
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
            {headerItems.map((item) => (
              <HeaderNavItem key={item.id} item={item} />
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
