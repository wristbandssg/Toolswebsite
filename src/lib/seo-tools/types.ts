// Shared shapes for the admin SEO Tools (Marketing → SEO Tools). Every tool
// declares its input fields (rendered by one generic form) and returns a
// Report (rendered by one generic result view, with CSV export of tables).
// Client-safe: no server imports.

export type FieldType =
  | "url" // one URL
  | "urls" // several URLs, one per line
  | "text" // one line of text
  | "textarea" // free text
  | "number"
  | "select"
  | "checkbox"
  | "csv"; // a .csv file, read in the browser and sent as text

export interface ToolField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

export type ToolGroup = "Technical SEO" | "On-Page & Content" | "Keywords & Competitors" | "Site-Wide Content" | "Backlinks & Data";

export interface SeoToolInfo {
  id: string; // also the URL: /admin/seo-tools/{id}
  name: string;
  group: ToolGroup;
  description: string;
  sources: string[]; // the Python script(s) it was ported from
  fields: ToolField[];
  /** Short note on what was left out of the Python original, if anything. */
  limits?: string;
  /** Tools with their own screen (not the generic form). */
  custom?: boolean;
}

export type Cell = string | number | boolean | null;

export type ReportSection =
  | { kind: "table"; title: string; columns: string[]; rows: Cell[][]; note?: string }
  | { kind: "list"; title: string; items: string[]; tone?: "neutral" | "good" | "bad" }
  | { kind: "code"; title: string; code: string }
  | { kind: "text"; title: string; text: string };

export interface ToolReport {
  headline?: string;
  score?: number; // 0–100
  grade?: string;
  stats?: { label: string; value: Cell }[];
  issues?: string[];
  passed?: string[];
  sections?: ReportSection[];
}

export type ToolInput = Record<string, string | number | boolean | string[] | undefined>;
