"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearToken, getGalleriesClient } from "@/lib/admin";
import { Plus, LogOut, Image, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  _count: { photos: number };
  updatedAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    getGalleriesClient(token).then((data) => {
      setGalleries(data);
      setLoading(false);
    }).catch(() => {
      router.push("/admin/login");
    });
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push("/admin/login");
  }

  async function createGallery() {
    const title = prompt("Gallery title:");
    if (!title) return;
    const slug = prompt("URL slug (e.g., my-wedding):") || title.toLowerCase().replace(/\s+/g, "-");
    const token = getToken();
    if (!token) return;

    try {
      await api.post("/api/galleries", { title, slug }, token);
      const data = await getGalleriesClient(token);
      setGalleries(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create gallery");
    }
  }

  async function toggleStatus(gallery: Gallery) {
    const token = getToken();
    if (!token) return;
    const newStatus = gallery.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await api.patch(`/api/galleries/${gallery.id}`, { status: newStatus }, token);
    const data = await getGalleriesClient(token);
    setGalleries(data);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-medium text-stone-800">Galleries</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={createGallery}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800 transition-colors"
            >
              <Plus size={16} />
              New Gallery
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {galleries.length === 0 ? (
          <div className="text-center py-24 text-stone-400">
            <Image size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg">No galleries yet</p>
            <button
              onClick={createGallery}
              className="mt-4 text-sm text-stone-600 hover:text-stone-800 underline"
            >
              Create your first gallery
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {galleries.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-5 py-4 hover:border-stone-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-stone-800 truncate">{g.title}</h3>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        g.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {g.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-stone-400">
                    <span>/{g.slug}</span>
                    <span>{g._count.photos} photos</span>
                    <span>{new Date(g.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => router.push(`/admin/galleries/${g.id}`)}
                    className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => toggleStatus(g)}
                    className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    {g.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </button>
                  {g.status === "PUBLISHED" && (
                    <a
                      href={`https://v1.onemoreday.net/g/${g.slug}`}
                      target="_blank"
                      rel="noopener"
                      className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
