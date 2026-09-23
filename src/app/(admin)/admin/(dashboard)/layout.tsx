import AdminSidebar from "@/components/admin/AdminSidebar";

// Every admin dashboard page is auth-gated and always needs fresh data — so
// build-time static prerendering is turned off here (otherwise the build
// would need a database connection, which breaks the deploy pipeline on a
// host like Render).
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <AdminSidebar />
      <main className="min-h-screen flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
        {children}
      </main>
    </div>
  );
}
