export interface BlogTemplateProps {
  blog: {
    slug: string;
    title: string;
    featuredImage: string | null;
    content: string;
    tags: string[];
    publishedAt: string | null;
    authorName?: string | null;
  };
  relatedTools: { slug: string; title: string }[];
  relatedBlogs: { slug: string; title: string }[];
}
