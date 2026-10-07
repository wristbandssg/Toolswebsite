import type { Author } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** The public shape of an author — what the bio box and author page render. */
export interface AuthorProfile {
  slug: string;
  name: string;
  jobTitle: string | null;
  photo: string | null;
  shortBio: string | null;
  bio: string | null;
  expertise: string[];
  email: string | null;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  facebook: string | null;
}

export function parseExpertise(json: string | null | undefined): string[] {
  try {
    const list = JSON.parse(json || "[]");
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toAuthorProfile(a: Author): AuthorProfile {
  return {
    slug: a.slug,
    name: a.name,
    jobTitle: a.jobTitle,
    photo: a.photo,
    shortBio: a.shortBio,
    bio: a.bio,
    expertise: parseExpertise(a.expertise),
    email: a.email,
    website: a.website,
    linkedin: a.linkedin,
    twitter: a.twitter,
    facebook: a.facebook,
  };
}

/**
 * The author to show on a blog post / calculator: the one picked for it,
 * otherwise the site's default author, otherwise none (no bio box).
 */
export async function resolveAuthorProfile(picked: Author | null | undefined): Promise<AuthorProfile | null> {
  if (picked) return toAuthorProfile(picked);
  const fallback = await prisma.author.findFirst({ where: { isDefault: true } });
  return fallback ? toAuthorProfile(fallback) : null;
}

export function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
