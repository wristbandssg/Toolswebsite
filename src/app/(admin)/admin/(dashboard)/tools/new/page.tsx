import ToolForm from "@/components/admin/ToolForm";

export default function NewToolPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">নতুন Calculator Tool</h1>
      <p className="mt-1 text-sm text-gray-500">Tool তৈরি করে Template, Calculation Logic এবং Content সেট করুন।</p>
      <div className="mt-6">
        <ToolForm mode="create" />
      </div>
    </div>
  );
}
