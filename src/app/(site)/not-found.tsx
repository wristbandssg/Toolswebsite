import Link from "next/link";
import { blogIndexUrl, calculatorsUrl } from "@/lib/urls";

// Shown (with the site header and footer, and a 404 status) when a public
// URL doesn't match a page — instead of Next.js' bare default page.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300">
        This page doesn&apos;t exist or has moved. Try one of these instead:
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Home
        </Link>
        <Link href={calculatorsUrl()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
          All calculators
        </Link>
        <Link href={blogIndexUrl()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
          Blog
        </Link>
      </div>
    </div>
  );
}
