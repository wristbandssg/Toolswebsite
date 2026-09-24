import AdminSidebar from "@/components/admin/AdminSidebar";

// Every admin dashboard page is auth-gated and always needs fresh data — so
// build-time static prerendering is turned off here (otherwise the build
// would need a database connection, which breaks the deploy pipeline on a
// host like Render).
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The outer row needs an explicit height (not just min-h-screen) so the
  // two children can each scroll on their own: AdminSidebar is already
  // h-screen internally, but without a height-constrained parent here the
  // whole document scrolled together, and the sidebar — a normal-flow flex
  // item, not fixed/sticky — scrolled up out of view along with it on any
  // page with a long list (Tools, Tool Categories, State Calculators, Blog
  // Posts, Blog Categories, ...). Locking this row to the viewport height
  // with overflow-hidden means only <main> scrolls, and the sidebar stays
  // put the whole time.
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="h-screen flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
        {children}
      </main>
    </div>
  );
}
