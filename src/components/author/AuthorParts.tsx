import SocialIcon from "@/components/site/SocialIcon";
import { initialsFor, type AuthorProfile } from "@/lib/authors";
import { platformLabel, socialHref } from "@/lib/author-social";

/** Round author photo, or their initials on a gradient when no photo is set. */
export function AuthorAvatar({ author, className = "h-16 w-16 text-lg" }: { author: AuthorProfile; className?: string }) {
  if (author.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={author.photo} alt={author.name} className={`shrink-0 rounded-full object-cover ${className}`} />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white ${className}`}
    >
      {initialsFor(author.name)}
    </span>
  );
}

/** All of an author's links as hrefs — used for schema.org `sameAs`. */
export function authorSocialHrefs(author: AuthorProfile) {
  return author.socialLinks.filter((l) => l.platform !== "email").map(socialHref);
}

/**
 * The author's links in the admin's order: brand icons in round buttons,
 * and "custom" links as a small pill showing their own label.
 */
export function AuthorSocialLinks({
  author,
  className = "",
  buttonClassName = "border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-indigo-700 dark:hover:text-indigo-400",
}: {
  author: AuthorProfile;
  className?: string;
  buttonClassName?: string;
}) {
  if (author.socialLinks.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {author.socialLinks.map((l, i) => {
        const custom = l.platform === "custom";
        const label = custom ? l.label || "Link" : platformLabel(l.platform);
        return (
          <a
            key={`${l.platform}-${i}`}
            href={socialHref(l)}
            target={l.platform === "email" ? undefined : "_blank"}
            rel="noopener noreferrer"
            title={label}
            aria-label={`${author.name}: ${label}`}
            className={`flex h-9 items-center justify-center gap-1.5 rounded-full border transition-colors ${
              custom ? "px-3 text-sm font-medium" : "w-9"
            } ${buttonClassName}`}
          >
            <SocialIcon platform={l.platform} className="h-4 w-4 shrink-0" />
            {custom ? <span className="max-w-[10rem] truncate">{label}</span> : null}
          </a>
        );
      })}
    </div>
  );
}
