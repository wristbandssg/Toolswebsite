import AdminSidebar from "@/components/admin/AdminSidebar";

// সব Admin Dashboard Page Auth-gated এবং সবসময় Fresh Data দরকার — তাই Build-time
// Static Prerender বন্ধ রাখা হলো (নাহলে Build-এর সময় Database Connection লাগবে,
// যা Render-এর মতো Host-এ Deploy Pipeline-এ সমস্যা করে)।
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
