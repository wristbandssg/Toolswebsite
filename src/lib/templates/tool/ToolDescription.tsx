import { truncateWords } from "@/lib/text";

const MOBILE_MAX_WORDS = 25;
const DESKTOP_MAX_WORDS = 50;

/**
 * Renders a Tool's description under its H1, capped to a word count so a
 * long, keyword-rich SEO description (written for the meta tag / on-page
 * text, sometimes 50-70+ words) never overwhelms the hero visually.
 *
 * Two variants, swapped by breakpoint rather than by JS: mobile shows the
 * 25-word cut, `md:` and up (tablet/laptop/desktop) shows the 50-word cut.
 * Doing it server-side with two `<p>`s + `md:hidden`/`hidden md:block` — not
 * a client-side word-count check, and not CSS line-clamp — because the ask
 * was an exact word count, and line-clamp truncates by rendered line height
 * instead, which varies with font size and column width.
 */
export function ToolDescription({
  text,
  className = "",
}: {
  text: string | null;
  className?: string;
}) {
  if (!text) return null;
  return (
    <>
      <p className={`md:hidden ${className}`}>{truncateWords(text, MOBILE_MAX_WORDS)}</p>
      <p className={`hidden md:block ${className}`}>{truncateWords(text, DESKTOP_MAX_WORDS)}</p>
    </>
  );
}
