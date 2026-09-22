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
    categoryName?: string | null;
    categorySlug?: string | null;
  };
  relatedTools: { slug: string; title: string }[];
  relatedBlogs: {
    slug: string;
    title: string;
    publishedAt: string | null;
    categoryName?: string | null;
  }[];
}
