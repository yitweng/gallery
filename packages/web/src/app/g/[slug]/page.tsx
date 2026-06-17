import { notFound } from "next/navigation";
import { GalleryView } from "@/components/gallery/GalleryView";

interface GalleryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { slug } = await params;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  let gallery;
  try {
    const res = await fetch(`${API_URL}/api/galleries/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) notFound();
    gallery = await res.json();
  } catch {
    notFound();
  }

  if (gallery.protected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="text-center max-w-sm mx-auto px-6">
          <h1 className="text-2xl font-light text-stone-800">
            {gallery.title}
          </h1>
          <p className="mt-3 text-stone-500">This gallery is password protected.</p>
          <form className="mt-6 space-y-3" action={`/g/${slug}/verify`} method="post">
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-stone-200 rounded-lg bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
              required
            />
            <button
              type="submit"
              className="w-full px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
            >
              View Gallery
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <GalleryView gallery={gallery} />;
}
