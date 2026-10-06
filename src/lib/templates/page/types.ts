export type PageSection =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "button"; label: string; href: string }
  | { type: "spacer"; size?: "sm" | "md" | "lg" }
  | { type: "calculator_embed"; toolSlug: string; toolTitle: string }
  // A content box (Page Template 1 renders each as its own white card):
  // heading, an optional bold lead line, and rich-text HTML from the same
  // editor blog posts use. showNumber (default true) prefixes "1.", "2."…
  | { type: "box"; heading: string; lead?: string; html: string; showNumber?: boolean };

export interface PageTemplateProps {
  page: {
    slug: string;
    title: string;
    sections: PageSection[];
  };
}
