import { prisma } from "@/lib/prisma";
import ToolForm from "@/components/admin/ToolForm";
import { flattenCategoryTree } from "@/lib/flattenCategoryTree";

export default async function NewToolPage() {
  const categories = await prisma.toolCategory.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold">New Tool</h1>
      <p className="mt-1 text-sm text-gray-500">
        Create a tool and set its template, calculation logic, and content.
      </p>
      <div className="mt-6">
        <ToolForm mode="create" categories={flattenCategoryTree(categories)} />
      </div>
    </div>
  );
}
