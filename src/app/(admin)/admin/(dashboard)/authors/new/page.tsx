import Link from "next/link";
import AuthorForm from "@/components/admin/AuthorForm";

export default function NewAuthorPage() {
  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/authors" className="hover:underline">
          Authors
        </Link>{" "}
        / New
      </p>
      <h1 className="mt-1 text-2xl font-bold">New Author</h1>
      <div className="mt-6">
        <AuthorForm mode="create" />
      </div>
    </div>
  );
}
