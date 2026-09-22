export type PageSection =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "button"; label: string; href: string }
  | { type: "spacer"; size?: "sm" | "md" | "lg" }
  | { type: "calculator_embed"; toolSlug: string; toolTitle: string };

export interface PageTemplateProps {
  page: {
    slug: string;
    title: string;
    sections: PageSection[];
  };
}
