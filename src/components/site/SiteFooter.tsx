import Link from "next/link";
import type { MenuItem } from "@/lib/menu/types";
import type { FooterSettings } from "@/lib/footer-config";
import { SOCIAL_PLATFORMS } from "@/lib/footer-config";
import SocialIcon from "@/components/site/SocialIcon";
import { DEFAULT_FOOTER_COLUMNS } from "@/lib/menu/defaults";

// Site footer: a brand column (logo, name, tagline, social icons) and the
// link columns from the Footer Builder menu on a gradient background, then a
// copyright bar. Colors and text come from the footer settings
// (/admin/footer-builder), so the admin controls the whole look.

function isExternal(href: string) {
  return /^(https?:)?\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

function FooterLink({ href, children, color }: { href: string; children: React.ReactNode; color: string }) {
  const className = "inline-block py-0.5 opacity-90 transition hover:translate-x-0.5 hover:underline hover:opacity-100";
  if (!href) return <span className={className} style={{ color }}>{children}</span>;
  return isExternal(href) ? (
    <a href={href} className={className} style={{ color }} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={className} style={{ color }}>
      {children}
    </Link>
  );
}

export default function SiteFooter({
  settings,
  columns,
  siteName,
  logoUrl,
}: {
  settings: FooterSettings;
  columns: MenuItem[];
  siteName: string;
  logoUrl: string;
}) {
  const cols = columns.length > 0 ? columns : DEFAULT_FOOTER_COLUMNS;
  const brandName = settings.brandName || siteName;
  const socials = settings.socials.filter((s) => s.url.trim());
  const copyright = settings.copyright
    .replace(/\{year\}/g, String(new Date().getFullYear()))
    .replace(/\{siteName\}/g, siteName);

  return (
    <footer style={{ color: settings.textColor }}>
      <div style={{ background: `linear-gradient(110deg, ${settings.bgFrom}, ${settings.bgTo})` }}>
        <div
          className={`mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 ${
            settings.showBrand ? "lg:grid-cols-[1.4fr_repeat(var(--cols),1fr)]" : "lg:grid-cols-[repeat(var(--cols),1fr)]"
          }`}
          style={{ ["--cols" as string]: String(Math.max(1, Math.min(cols.length, 4))) }}
        >
          {settings.showBrand ? (
            <div className="col-span-2 lg:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-bold" style={{ color: settings.headingColor }}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-9 w-9 rounded-md bg-white/10 object-contain" />
                ) : null}
                {brandName}
              </Link>
              {settings.tagline ? <p className="mt-3 max-w-xs text-[15px] leading-relaxed">{settings.tagline}</p> : null}
              {socials.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {socials.map((s, i) => {
                    const label = SOCIAL_PLATFORMS.find((p) => p.key === s.platform)?.label ?? s.platform;
                    const href = s.platform === "email" && !s.url.startsWith("mailto:") ? `mailto:${s.url}` : s.url;
                    return (
                      <a
                        key={i}
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        aria-label={label}
                        title={label}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:-translate-y-0.5 hover:bg-white/20"
                        style={{ color: settings.headingColor }}
                      >
                        <SocialIcon platform={s.platform} className="h-[18px] w-[18px]" />
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {cols.map((col) => (
            <div key={col.id}>
              <p className="text-lg font-bold" style={{ color: settings.headingColor }}>
                {col.href ? <FooterLink href={col.href} color={settings.headingColor}>{col.label}</FooterLink> : col.label}
              </p>
              <ul className="mt-3 space-y-1.5 text-[15px]">
                {col.children.map((link) => (
                  <li key={link.id}>
                    <FooterLink href={link.href} color={settings.linkColor}>
                      {link.label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {copyright ? (
        <div style={{ background: settings.bottomBg, color: settings.bottomTextColor }}>
          <p className="mx-auto max-w-6xl px-4 py-4 text-center text-sm">{copyright}</p>
        </div>
      ) : null}
    </footer>
  );
}
