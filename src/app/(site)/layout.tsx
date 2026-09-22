import Link from "next/link";

/**
 * Public site shell. Section 9 (Header/Footer/Mega Menu Builder) will make
 * this data-driven from the `menus`/`site_settings` tables — this is a
 * static placeholder so pages have somewhere to render into for now.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-semibold">
            Calc Platform
          </Link>
          <nav className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
            <Link href="/tools">Tools</Link>
            <Link href="/blog">Blog</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500 dark:border-gray-800">
        © {new Date().getFullYear()} Calc Platform
      </footer>
    </div>
  );
}
