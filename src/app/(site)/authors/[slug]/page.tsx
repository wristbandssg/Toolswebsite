import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, Calculator } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildSeoMetadata, excerptFromHtml, getSiteUrl } from "@/lib/seo";
import { toAuthorProfile } from "@/lib/authors";
import { AuthorAvatar, AuthorSocialLinks, authorSocialHrefs } from "@/components/author/AuthorParts";
import { authorUrl, blogUrl } from "@/lib/urls";
import { getCategoryIndex } from "@/lib/category-index";

export const dynamic = "force-dynamic";

async function loadAuthor(slug: string) {
  return prisma.author.findUnique({ where: { slug } });
}

/**
 * Content credited to this author: everything they were picked for, plus —
 * when they are the default author — everything with no author picked,
 * since those posts/calculators show this author's bio too.
 */
function creditedTo(author: { id: string; isDefault: boolean }) {
  return author.isDefault
    ? {
        OR: [
          { authorProfileId: author.id },
          { authorProfileId: null },
          { authorProfileId: { isSet: false } },
        ],
      }
    : { authorProfileId: author.id };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const author = await loadAuthor(slug);
  if (!author) return {};
  return buildSeoMetadata({
    seoMeta: { ogImage: author.photo },
    fallbackTitle: author.jobTitle ? `${author.name}, ${author.jobTitle}` : author.name,
    fallbackDescription: author.shortBio || (author.bio ? excerptFromHtml(author.bio) : null),
    path: authorUrl(author.slug),
  });
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await loadAuthor(slug);
  if (!row) notFound();
  const author = toAuthorProfile(row);

  const index = await getCategoryIndex();
  const [blogCount, toolCount, blogs, tools] = await Promise.all([
    prisma.blog.count({ where: { status: "published", ...creditedTo(row) } }),
    prisma.tool.count({ where: { status: "published", ...creditedTo(row) } }),
    prisma.blog.findMany({
      where: { status: "published", ...creditedTo(row) },
      orderBy: { publishedAt: "desc" },
      take: 24,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        categories: { select: { name: true }, take: 1 },
      },
    }),
    prisma.tool.findMany({
      where: { status: "published", ...creditedTo(row) },
      orderBy: { title: "asc" },
      take: 60,
      select: { slug: true, title: true, description: true, categoryId: true, category: { select: { name: true } } },
    }),
  ]);

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteUrl}/authors/${author.slug}`,
    mainEntity: {
      "@type": "Person",
      name: author.name,
      jobTitle: author.jobTitle || undefined,
      description: author.shortBio || undefined,
      image: author.photo || undefined,
      knowsAbout: author.expertise.length > 0 ? author.expertise : undefined,
      sameAs: authorSocialHrefs(author),
    },
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 dark:from-indigo-800 dark:via-blue-800 dark:to-indigo-900">
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <nav className="mb-6 text-sm text-indigo-200">
            <Link href="/" className="hover:text-white">
              Home
            </Link>{" "}
            / <span className="text-white">Authors</span> / <span className="text-white">{author.name}</span>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <AuthorAvatar author={author} className="h-28 w-28 text-3xl ring-4 ring-white/40 shadow-xl sm:h-36 sm:w-36 sm:text-4xl" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Author</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">{author.name}</h1>
              {author.jobTitle ? <p className="mt-1 text-lg font-medium text-indigo-100">{author.jobTitle}</p> : null}
              {author.shortBio ? (
                <p className="mt-3 max-w-2xl leading-relaxed text-indigo-100">{author.shortBio}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white ring-1 ring-inset ring-white/25">
                  <BookOpen aria-hidden className="h-4 w-4" />
                  {blogCount} {blogCount === 1 ? "Article" : "Articles"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white ring-1 ring-inset ring-white/25">
                  <Calculator aria-hidden className="h-4 w-4" />
                  {toolCount} {toolCount === 1 ? "Calculator" : "Calculators"}
                </span>
                <AuthorSocialLinks
                  author={author}
                  buttonClassName="border-white/30 text-white hover:bg-white hover:text-indigo-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        {/* About + expertise */}
        {author.bio || author.expertise.length > 0 ? (
          <div className={`grid gap-6 ${author.bio && author.expertise.length > 0 ? "lg:grid-cols-[1fr_280px]" : ""}`}>
            {author.bio ? (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                <h2 className="text-xl font-bold">About {author.name}</h2>
                <div
                  className="prose mt-4 max-w-none dark:prose-invert prose-p:leading-relaxed prose-a:font-medium prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-img:rounded-xl"
                  dangerouslySetInnerHTML={{ __html: author.bio }}
                />
              </section>
            ) : null}
            {author.expertise.length > 0 ? (
              <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Areas of Expertise</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {author.expertise.map((e) => (
                    <li
                      key={e}
                      className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900"
                    >
                      {e}
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
        ) : null}

        {/* Articles */}
        {blogs.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold">Articles by {author.name}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((b) => (
                <Link
                  key={b.slug}
                  href={blogUrl(b.slug)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950">
                    {b.featuredImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.featuredImage}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen aria-hidden className="h-10 w-10 text-indigo-300 dark:text-indigo-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    {b.categories[0] ? (
                      <p className="text-[11px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                        {b.categories[0].name}
                      </p>
                    ) : null}
                    <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                      {b.title}
                    </h3>
                    {b.excerpt ? (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{b.excerpt}</p>
                    ) : null}
                    {b.publishedAt ? (
                      <p className="mt-auto pt-3 text-xs text-gray-500">{b.publishedAt.toLocaleDateString()}</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Calculators */}
        {tools.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold">Calculators by {author.name}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => (
                <Link
                  key={t.slug}
                  href={index.toolHref(t)}
                  className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <Calculator aria-hidden className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                      {t.title}
                    </span>
                    {t.category ? <span className="mt-0.5 block text-xs text-gray-500">{t.category.name}</span> : null}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {blogs.length === 0 && tools.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
            {author.name} hasn&apos;t published anything yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
