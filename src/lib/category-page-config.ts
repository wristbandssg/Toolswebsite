import { z } from "zod";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

// How many cards a public category page shows before its "Show more"
// button, edited at /admin/tools/categories (Category Page Display card).

const KEY = "category_page";

export const categoryPageSchema = z.object({
  subcategoriesShown: z.coerce.number().int().min(1).max(200).default(10),
  toolsShown: z.coerce.number().int().min(1).max(1000).default(40),
});

export type CategoryPageSettings = z.infer<typeof categoryPageSchema>;

export const DEFAULT_CATEGORY_PAGE: CategoryPageSettings = categoryPageSchema.parse({});

export async function getCategoryPageSettings(): Promise<CategoryPageSettings> {
  try {
    const parsed = categoryPageSchema.safeParse((await getSiteSetting(KEY)) ?? {});
    return parsed.success ? parsed.data : DEFAULT_CATEGORY_PAGE;
  } catch {
    return DEFAULT_CATEGORY_PAGE;
  }
}

export async function saveCategoryPageSettings(settings: CategoryPageSettings) {
  await setSiteSetting(KEY, settings);
}
