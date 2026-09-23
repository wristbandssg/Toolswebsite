import type { CalcInputField, CalcResultConfig, CalcResultLineConfig } from "@/lib/calc-engine";

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
    // Multi-line breakdown result config — see Tool.calcResults. Null/empty
    // for the vast majority of (single-output) tools.
    calcResults: CalcResultLineConfig[] | null;
    instructions: string | null;
    examples: string | null;
    faq: { question: string; answer: string }[];
    categoryName?: string | null;
  };
  relatedTools: { slug: string; title: string }[];
  supportBlogs: { slug: string; title: string }[];
}
