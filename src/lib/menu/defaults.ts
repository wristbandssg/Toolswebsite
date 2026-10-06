import type { MenuItem } from "@/lib/menu/types";

// Shown in the site header while no header menu has been saved in the admin,
// and pre-filled in the Header Builder in that case so it matches the site.
export const DEFAULT_HEADER_ITEMS: MenuItem[] = [
  { id: "default-calculators", label: "Calculators", href: "/calculators", children: [] },
  { id: "default-blog", label: "Blog", href: "/blog", children: [] },
];
