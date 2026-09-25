"use client";

import { useEffect, useRef } from "react";

/**
 * Renders a raw third-party ad-network HTML/script snippet (Adsterra,
 * AdSense, or similar — whatever an admin pastes into /admin/ad-settings).
 *
 * Setting `innerHTML` alone never executes any `<script>` tags it contains
 * — that's a deliberate browser security behavior, not a bug — so a naive
 * `dangerouslySetInnerHTML` would silently paste the ad network's markup
 * onto the page without ever running the script that actually loads the ad.
 * The fix (a standard technique for this exact problem): parse the snippet
 * into real DOM nodes, then for every `<script>` node specifically, create
 * a brand-new `<script>` element via `document.createElement` and append it
 * — a script element created and appended that way DOES execute, whether
 * it's an inline snippet (e.g. Adsterra's `atOptions = {...}` config block)
 * or one with a `src` (the network's actual loader script). Non-script
 * nodes (a wrapper `<div>`, an `<ins>` tag some networks use) are just
 * cloned in as-is.
 */
export default function RawAdScript({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !html.trim()) return;

    container.innerHTML = "";
    const parsed = document.createElement("div");
    parsed.innerHTML = html;

    Array.from(parsed.childNodes).forEach((node) => {
      if (node.nodeName === "SCRIPT") {
        const oldScript = node as HTMLScriptElement;
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.text = oldScript.text;
        container.appendChild(newScript);
      } else {
        container.appendChild(node.cloneNode(true));
      }
    });

    // Best-effort cleanup on unmount/re-render — some ad scripts keep
    // running via their own timers regardless, which is normal for this
    // kind of third-party embed and not something this component controls.
    return () => {
      container.innerHTML = "";
    };
  }, [html]);

  return <div ref={containerRef} className="w-full" />;
}
