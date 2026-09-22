/**
 * Rule-based topic suggestion generator for the AI Content Planner (Phase 8).
 *
 * No external AI API is used here — topics are built by filling a set of
 * proven blog-topic patterns in with the tool's own title/category/
 * description. This keeps suggestion generation free and instant. Real
 * content GENERATION (writing the actual blog post) is a separate,
 * later phase and is intentionally not done here.
 */

export interface SuggestedTopic {
  topicTitle: string;
  searchIntent: string;
  keywords: string[];
}

interface ToolInfo {
  title: string;
  description?: string | null;
  categoryName?: string | null;
}

function baseKeywords(tool: ToolInfo): string[] {
  const words = new Set<string>();
  words.add(tool.title.toLowerCase());
  words.add(`${tool.title.toLowerCase()} calculator`);
  if (tool.categoryName) words.add(tool.categoryName.toLowerCase());
  return Array.from(words);
}

const TEMPLATES: {
  intent: string;
  title: (tool: ToolInfo) => string;
  keywords: (tool: ToolInfo) => string[];
}[] = [
  {
    intent: "informational",
    title: (t) => `How to Use the ${t.title} Calculator: A Step-by-Step Guide`,
    keywords: (t) => [...baseKeywords(t), "how to", "guide", "step by step"],
  },
  {
    intent: "comparison",
    title: (t) => `${t.title} vs Manual Calculation: Which Should You Trust?`,
    keywords: (t) => [...baseKeywords(t), "manual calculation", "comparison"],
  },
  {
    intent: "informational",
    title: (t) => `5 Common Mistakes People Make With ${t.title}`,
    keywords: (t) => [...baseKeywords(t), "common mistakes", "errors"],
  },
  {
    intent: "informational",
    title: (t) => `Understanding ${t.title}: What the Numbers Actually Mean`,
    keywords: (t) => [...baseKeywords(t), "explained", "meaning"],
  },
  {
    intent: "navigational",
    title: (t) => `${t.title}: Frequently Asked Questions`,
    keywords: (t) => [...baseKeywords(t), "faq", "questions"],
  },
  {
    intent: "informational",
    title: (t) => `How Accurate Is the ${t.title} Calculator?`,
    keywords: (t) => [...baseKeywords(t), "accuracy", "reliable"],
  },
  {
    intent: "informational",
    title: (t) => `When Should You Use the ${t.title} Calculator?`,
    keywords: (t) => [...baseKeywords(t), "when to use", "use cases"],
  },
  {
    intent: "informational",
    title: (t) => `${t.title} Formula Explained (With Real Examples)`,
    keywords: (t) => [...baseKeywords(t), "formula", "examples"],
  },
];

export function generateTopicSuggestions(
  tool: ToolInfo,
  excludeTitles: string[] = []
): SuggestedTopic[] {
  const excluded = new Set(excludeTitles.map((t) => t.toLowerCase()));
  return TEMPLATES.map((template) => ({
    topicTitle: template.title(tool),
    searchIntent: template.intent,
    keywords: template.keywords(tool),
  })).filter((topic) => !excluded.has(topic.topicTitle.toLowerCase()));
}
