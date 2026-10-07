import SocialIcon from "@/components/site/SocialIcon";
import { initialsFor, type AuthorProfile } from "@/lib/authors";

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

function normalizeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** The links an author has filled in, in a fixed order. */
export function authorSocialLinks(author: AuthorProfile) {
  const links: { platform: string; label: string; href: string }[] = [];
  if (author.website) links.push({ platform: "website", label: "Website", href: normalizeUrl(author.website) });
  if (author.linkedin) links.push({ platform: "linkedin", label: "LinkedIn", href: normalizeUrl(author.linkedin) });
  if (author.twitter) links.push({ platform: "x", label: "X (Twitter)", href: normalizeUrl(author.twitter) });
  if (author.facebook) links.push({ platform: "facebook", label: "Facebook", href: normalizeUrl(author.facebook) });
  if (author.email) links.push({ platform: "email", label: "Email", href: `mailto:${author.email}` });
  return links;
}

export function AuthorSocialLinks({
  author,
  className = "",
  buttonClassName = "border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-indigo-700 dark:hover:text-indigo-400",
}: {
  author: AuthorProfile;
  className?: string;
  buttonClassName?: string;
}) {
  const links = authorSocialLinks(author);
  if (links.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((l) => (
        <a
          key={l.platform}
          href={l.href}
          target={l.platform === "email" ? undefined : "_blank"}
          rel="noopener noreferrer"
          title={l.label}
          aria-label={`${author.name} on ${l.label}`}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${buttonClassName}`}
        >
          <SocialIcon platform={l.platform} className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
