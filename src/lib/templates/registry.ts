/**
 * Template Registry (see plan doc, Section 4: Template System).
 *
 * A template is just a React component. Content lives in the database;
 * the template component receives it as props and decides layout/design.
 * Adding a new template = add one file + one line here. No other tool's
 * code is touched.
 */

import { ComponentType } from "react";
import ToolTemplate1 from "./tool/ToolTemplate1";
import ToolTemplate2 from "./tool/ToolTemplate2";
import ToolTemplate3 from "./tool/ToolTemplate3";
import ToolTemplate4 from "./tool/ToolTemplate4";
import ToolTemplate5 from "./tool/ToolTemplate5";
import BlogTemplate from "./blog/BlogTemplate";
import PageTemplate1 from "./page/PageTemplate1";
import PageTemplate2 from "./page/PageTemplate2";
import type { ToolTemplateProps } from "./tool/types";
import type { BlogTemplateProps } from "./blog/types";
import type { PageTemplateProps } from "./page/types";

export const TOOL_TEMPLATES: Record<
  string,
  { name: string; component: ComponentType<ToolTemplateProps> }
> = {
  "tool-template-1": { name: "Tool Template 1 — Classic", component: ToolTemplate1 },
  "tool-template-2": { name: "Tool Template 2 — Split Sidebar", component: ToolTemplate2 },
  "tool-template-3": { name: "Tool Template 3 — Calculator First", component: ToolTemplate3 },
  "tool-template-4": { name: "Tool Template 4 — Card Focused", component: ToolTemplate4 },
  "tool-template-5": { name: "Tool Template 5 — Minimal", component: ToolTemplate5 },
};

export const BLOG_TEMPLATE: { name: string; component: ComponentType<BlogTemplateProps> } = {
  name: "Blog Template",
  component: BlogTemplate,
};

export const PAGE_TEMPLATES: Record<
  string,
  { name: string; component: ComponentType<PageTemplateProps> }
> = {
  "page-template-1": { name: "Page Template 1 — Standard", component: PageTemplate1 },
  "page-template-2": { name: "Page Template 2 — Wide", component: PageTemplate2 },
};

export const DEFAULT_TOOL_TEMPLATE = "tool-template-1";
export const DEFAULT_PAGE_TEMPLATE = "page-template-1";

export function getToolTemplate(key: string) {
  return TOOL_TEMPLATES[key] ?? TOOL_TEMPLATES[DEFAULT_TOOL_TEMPLATE];
}

export function getPageTemplate(key: string) {
  return PAGE_TEMPLATES[key] ?? PAGE_TEMPLATES[DEFAULT_PAGE_TEMPLATE];
}

// Category page templates (3-way, per the user's follow-up request) + the
// 3 tool-list view styles used inside them.
export const CATEGORY_TEMPLATE_KEYS = [
  "category-template-1",
  "category-template-2",
  "category-template-3",
] as const;

export const CATEGORY_VIEW_STYLES = ["grid", "list", "card-description"] as const;
export type CategoryViewStyle = (typeof CATEGORY_VIEW_STYLES)[number];
