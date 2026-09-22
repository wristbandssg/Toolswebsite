import { prisma } from "@/lib/prisma";

/** Thin typed wrapper over the generic key/value `site_settings` table. */

export async function getSiteSetting<T = unknown>(key: string): Promise<T | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as unknown as T;
  }
}

export async function setSiteSetting(key: string, value: unknown) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return prisma.siteSetting.upsert({
    where: { key },
    update: { value: serialized },
    create: { key, value: serialized },
  });
}

export async function deleteSiteSetting(key: string) {
  await prisma.siteSetting.deleteMany({ where: { key } });
}
