import type { CalcInputField, CalcResultConfig, CalcResultLineConfig } from "@/lib/calc-engine";
import type { StateCalculatorEntry } from "./StateCalculatorGrid";
import type { AuthorProfile } from "@/lib/authors";
import type { Crumb } from "@/components/site/Breadcrumbs";

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
    categorySlug?: string | null;
  };
  // Home → main category → … → sub-category → this calculator — the full
  // hierarchy, even where the URL is shorter (src/lib/urls.ts).
  breadcrumbs: Crumb[];
  relatedTools: { slug: string; title: string; href: string }[];
  supportBlogs: { slug: string; title: string }[];
  // "Other state calculators" directory — only populated for tools in the
  // state tax/paycheck calculator family (see the gating in ToolView).
  // Empty/omitted on every other tool, so this is fully opt-in.
  stateCalculators?: StateCalculatorEntry[];
  // The tool's author (or the site default) — shown in the "About the
  // Author" box at the end of the content. Null/omitted = no box.
  authorProfile?: AuthorProfile | null;
}
