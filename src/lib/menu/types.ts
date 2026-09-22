export const MENU_LOCATIONS = ["header", "footer", "mega-menu"] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  children: MenuItem[];
}
