import { notFound } from "next/navigation";

interface GalleryPhoto {
  id: string;
  thumbnailUrl?: string;
  previewUrl?: string;
}

interface GalleryCollection {
  id?: string;
  title?: string;
  photos?: GalleryPhoto[];
}

interface GalleryData {
  title: string;
  description?: string;
  collections?: GalleryCollection[];
}

interface GalleryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { slug } = await params;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  let gallery: GalleryData;
  try {
    const res = await fetch(`${API_URL}/api/galleries/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) notFound();
    gallery = await res.json();
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-light tracking-tight text-stone-800">
            {gallery.title}
          </h1>
          {gallery.description && (
            <p className="mt-3 text-stone-500">{gallery.description}</p>
          )}
        </div>
        <div className="mt-12 grid grid-cols-2 gap-0.5 md:grid-cols-3 lg:grid-cols-4">
          {gallery.collections?.flatMap((collection) =>
            (collection.photos ?? []).map((photo) => (
              <div
                key={photo.id}
                className="aspect-square bg-stone-200 animate-pulse"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
