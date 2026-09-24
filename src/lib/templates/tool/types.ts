import type { CalcInputField, CalcResultConfig, CalcResultLineConfig } from "@/lib/calc-engine";
import type { StateCalculatorEntry } from "./StateCalculatorGrid";

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
    // Limitations/disclaimer text — see Tool.assumptions. Renders as its own
    // collapsible "Assumptions" section, right after "About This
    // Calculator" (instructions).
    assumptions?: string | null;
    faq: { question: string; answer: string }[];
    categoryName?: string | null;
  };
  relatedTools: { slug: string; title: string }[];
  supportBlogs: { slug: string; title: string }[];
  // "Other state calculators" directory — only populated for tools in the
  // state tax/paycheck calculator family (see the [slug]/page.tsx gating).
  // Empty/omitted on every other tool, so this is fully opt-in.
  stateCalculators?: StateCalculatorEntry[];
}
