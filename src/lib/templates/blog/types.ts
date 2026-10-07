import type { AuthorProfile } from "@/lib/authors";

export interface BlogTemplateProps {
  blog: {
    slug: string;
    title: string;
    excerpt: string | null;
    featuredImage: string | null;
    content: string;
    tags: string[];
    publishedAt: string | null;
    updatedAt: string;
    authorName?: string | null;
    // A post can belong to more than one category at once.
    categories: { name: string; slug: string }[];
  };
  // The post's public author (or the site default) — drives the byline and
  // the "About the Author" box. Null when no author profile exists at all.
  authorProfile?: AuthorProfile | null;
  relatedTools: { slug: string; title: string; href: string }[];
  relatedBlogs: {
    slug: string;
    title: string;
    publishedAt: string | null;
    categoryName?: string | null;
  }[];
}
