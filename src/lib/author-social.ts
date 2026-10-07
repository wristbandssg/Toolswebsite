// Social / profile links an author can have. Shared by the admin form, the
// API validation and the public bio box / author page, so it must stay free
// of server-only imports.

export const AUTHOR_SOCIAL_PLATFORMS = [
  { key: "website", label: "Website", placeholder: "https://example.com" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/…" },
  { key: "threads", label: "Threads", placeholder: "https://threads.net/@…" },
  { key: "medium", label: "Medium", placeholder: "https://medium.com/@…" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/…" },
  { key: "reddit", label: "Reddit", placeholder: "https://reddit.com/user/…" },
  { key: "quora", label: "Quora", placeholder: "https://quora.com/profile/…" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/…" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/60123456789" },
  { key: "email", label: "Email", placeholder: "name@example.com" },
  { key: "custom", label: "Custom link", placeholder: "https://…" },
] as const;

export type AuthorSocialPlatform = (typeof AUTHOR_SOCIAL_PLATFORMS)[number]["key"];

export const AUTHOR_SOCIAL_KEYS = AUTHOR_SOCIAL_PLATFORMS.map((p) => p.key) as [
  AuthorSocialPlatform,
  ...AuthorSocialPlatform[],
];

export interface AuthorSocialLink {
  platform: AuthorSocialPlatform;
  url: string;
  // Only used by "custom" links — the text shown for that link.
  label?: string | null;
}

export function platformLabel(platform: string) {
  return AUTHOR_SOCIAL_PLATFORMS.find((p) => p.key === platform)?.label ?? "Link";
}

/** Parses the stored JSON, dropping anything malformed or of an unknown platform. */
export function parseSocialLinks(json: string | null | undefined): AuthorSocialLink[] {
  try {
    const list = JSON.parse(json || "[]");
    if (!Array.isArray(list)) return [];
    return list.filter(
      (l): l is AuthorSocialLink =>
        !!l &&
        typeof l.url === "string" &&
        l.url.trim() !== "" &&
        (AUTHOR_SOCIAL_KEYS as readonly string[]).includes(l.platform)
    );
  } catch {
    return [];
  }
}

/** The href to link to: mailto: for email, https:// added when missing. */
export function socialHref(link: AuthorSocialLink) {
  const url = link.url.trim();
  if (link.platform === "email") return `mailto:${url.replace(/^mailto:/i, "")}`;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
