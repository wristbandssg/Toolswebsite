import { prisma } from "@/lib/prisma";
import MediaLibraryGrid from "@/components/admin/MediaLibraryGrid";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold">Media Library</h1>
      <p className="mt-1 text-sm text-gray-500">
        Every image uploaded here or while editing a Blog Post or Page. Click &quot;Copy URL&quot;
        to reuse an image elsewhere.
      </p>
      <div className="mt-6">
        <MediaLibraryGrid
          initial={media.map((m) => ({
            id: m.id,
            url: m.url,
            altText: m.altText,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
