/** Trims `text` down to at most `maxWords` words, appending an ellipsis if
 * anything was cut. Splits on whitespace — good enough for plain English
 * marketing copy (no HTML/markdown to worry about here). */
export function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ") + "…";
}
