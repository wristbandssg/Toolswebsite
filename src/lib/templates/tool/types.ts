import type { CalcInputField, CalcResultConfig } from "@/lib/calc-engine";

export interface ToolTemplateProps {
  tool: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    calcType: "expression" | "custom";
    calcFormula: string | null;
    calcInputs: CalcInputField[];
    calcResult: CalcResultConfig | null;
    instructions: string | null;
    examples: string | null;
    faq: { question: string; answer: string }[];
    categoryName?: string | null;
  };
  relatedTools: { slug: string; title: string }[];
  supportBlogs: { slug: string; title: string }[];
}
