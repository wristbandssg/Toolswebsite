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
  relatedTools: { slug: string; title: string }[];
  relatedBlogs: {
    slug: string;
    title: string;
    publishedAt: string | null;
    categoryName?: string | null;
  }[];
}
