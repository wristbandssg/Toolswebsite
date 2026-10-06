import { redirect } from "next/navigation";

// Mega menus are now built inside the Header Builder (tick "Mega menu" on a
// top-level item). This old page just sends you there.
export default function MegaMenuPage() {
  redirect("/admin/header-builder");
}
