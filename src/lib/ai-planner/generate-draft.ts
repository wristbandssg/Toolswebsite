/**
 * Draft blog content assembler for the AI Content Planner (Phase 9: AI
 * Content Generation). This does NOT call any external AI API — it
 * restructures the tool's own already-reviewed content (description,
 * instructions, examples, FAQ) into a blog post shaped around an approved
 * topic. That keeps it factually safe (nothing is invented) and free to
 * run. The result is always saved as a DRAFT blog post — a human still
 * reviews and publishes it through the normal Blog admin screen.
 */

export interface DraftContent {
  contentHtml: string;
  tags: string[];
}

interface ToolInfo {
  title: string;
  slug: string;
  description?: string | null;
  instructions?: string | null;
  examples?: string | null;
  faq?: string | null; // JSON: [{ question, answer }]
}

interface TopicInfo {
  topicTitle: string;
  searchIntent?: string | null;
  keywords: string[];
}

function paragraph(text: string) {
  return `<p>${text}</p>`;
}

function asHtmlBlock(text: string) {
  return text.trim().startsWith("<") ? text : paragraph(text);
}

export function generateDraftContent(tool: ToolInfo, topic: TopicInfo): DraftContent {
  const parts: string[] = [];

  parts.push(
    paragraph(
      `If you're looking into ${topic.topicTitle.toLowerCase()}, the ${tool.title} Calculator can help. This guide walks through how it works and what to keep in mind.`
    )
  );

  if (tool.description) {
    parts.push(`<h2>What Is the ${tool.title} Calculator?</h2>`);
    parts.push(paragraph(tool.description));
  }

  if (tool.instructions) {
    parts.push(`<h2>How to Use It</h2>`);
    parts.push(asHtmlBlock(tool.instructions));
  }

  if (tool.examples) {
    parts.push(`<h2>Example</h2>`);
    parts.push(asHtmlBlock(tool.examples));
  }

  if (tool.faq) {
    try {
      const faqItems = JSON.parse(tool.faq) as { question: string; answer: string }[];
      if (faqItems.length > 0) {
        parts.push(`<h2>Frequently Asked Questions</h2>`);
        for (const item of faqItems) {
          if (!item.question) continue;
          parts.push(`<h3>${item.question}</h3>`);
          parts.push(paragraph(item.answer ?? ""));
        }
      }
    } catch {
      // Malformed FAQ JSON — skip this section rather than fail the draft.
    }
  }

  parts.push(`<h2>Try the ${tool.title} Calculator</h2>`);
  parts.push(
    paragraph(
      `Ready to see your own numbers? <a href="/tools/${tool.slug}">Use the ${tool.title} Calculator now</a>.`
    )
  );

  return { contentHtml: parts.join("\n"), tags: topic.keywords.slice(0, 6) };
}
