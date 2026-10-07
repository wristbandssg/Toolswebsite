import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AuthorForm from "@/components/admin/AuthorForm";
import { parseExpertise } from "@/lib/authors";

export default async function EditAuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A malformed id would make Mongo throw rather than return null.
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  const author = await prisma.author.findUnique({ where: { id } });
  if (!author) notFound();

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/authors" className="hover:underline">
          Authors
        </Link>{" "}
        / Edit
      </p>
      <h1 className="mt-1 text-2xl font-bold">Edit &quot;{author.name}&quot;</h1>
      <p className="mt-1 text-sm text-gray-500">
        <a href={`/authors/${author.slug}`} target="_blank" className="text-indigo-600 hover:underline">
          View Profile Page →
        </a>
      </p>
      <div className="mt-6">
        <AuthorForm
          mode="edit"
          initial={{
            id: author.id,
            name: author.name,
            slug: author.slug,
            jobTitle: author.jobTitle ?? "",
            photo: author.photo ?? "",
            shortBio: author.shortBio ?? "",
            bio: author.bio ?? "",
            expertise: parseExpertise(author.expertise).join(", "),
            email: author.email ?? "",
            website: author.website ?? "",
            linkedin: author.linkedin ?? "",
            twitter: author.twitter ?? "",
            facebook: author.facebook ?? "",
            isDefault: author.isDefault,
          }}
        />
      </div>
    </div>
  );
}
