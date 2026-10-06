export const MENU_LOCATIONS = ["header", "footer", "mega-menu"] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  children: MenuItem[];
  // Header only, top-level items: true = mega menu (children are columns,
  // their children the links); otherwise children are a simple dropdown.
  mega?: boolean;
}
