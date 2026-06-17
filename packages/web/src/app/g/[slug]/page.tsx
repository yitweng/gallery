import { notFound } from "next/navigation";
import { GalleryView } from "@/components/gallery/GalleryView";

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  let gallery;
  try {
    const res = await fetch(`${API_URL}/api/galleries/public/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) notFound();
    gallery = await res.json();
  } catch { notFound(); }

  if (gallery.protected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-light text-white">{gallery.title}</h1>
          <p className="text-sm text-[#555] mt-2">Password protected</p>
          <form className="mt-8 space-y-3">
            <input type="password" name="password" placeholder="Enter password"
              className="w-full bg-[#111] border border-[#222] rounded-[8px] px-4 py-3 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#333]" />
            <button className="w-full py-3 bg-white text-black text-sm font-medium rounded-[8px] hover:bg-[#e5e5e5] transition-colors">
              View Gallery
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <GalleryView gallery={gallery} />;
}
