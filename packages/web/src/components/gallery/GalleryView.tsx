"use client";

import { useState, useCallback, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Heart, Download } from "lucide-react";

interface Photo {
  id: string; thumbnailUrl: string | null; previewUrl: string | null;
  originalUrl: string | null; blurhash: string | null;
  width: number | null; height: number | null; fileName: string;
}

interface Collection { id: string; title: string; photos: Photo[] }

interface GalleryData {
  id: string; title: string; description?: string; coverImage?: string;
  protected: boolean; downloadProtected: boolean; downloadPermission: string;
  favoritesEnabled: boolean; collections: Collection[];
}

export function GalleryView({ gallery }: { gallery: GalleryData }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const stored = localStorage.getItem(`fav-${gallery.id}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const toggleFavorite = useCallback((photoId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(photoId) ? next.delete(photoId) : next.add(photoId);
      localStorage.setItem(`fav-${gallery.id}`, JSON.stringify([...next]));
      return next;
    });
  }, [gallery.id]);

  const allPhotos = useMemo(() => gallery.collections.flatMap((c) => c.photos), [gallery.collections]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto px-8 py-16">
        <h1 className="text-3xl font-light text-white tracking-tight">{gallery.title}</h1>
        {gallery.description && <p className="text-sm text-[#555] mt-2 max-w-lg">{gallery.description}</p>}
      </div>

      {/* Grid */}
      <div className="max-w-[1600px] mx-auto px-8 pb-24">
        <div className="columns-2 md:columns-3 lg:columns-4 gap-1 space-y-1">
          {allPhotos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIndex(i)}
              className="block w-full overflow-hidden bg-[#111] cursor-pointer group focus:outline-none"
            >
              {photo.thumbnailUrl ? (
                <img src={photo.thumbnailUrl} alt=""
                  className="w-full h-auto block transition-all duration-500 group-hover:scale-[1.02]"
                  loading="lazy" />
              ) : (
                <div className="aspect-[4/3] flex items-center justify-center">
                  <div className="w-4 h-4 border border-[#333] border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-10 p-2 text-[#555] hover:text-white transition-colors">
            <X size={24} />
          </button>
          <span className="absolute top-4 left-4 z-10 text-xs text-[#555] font-mono">
            {lightboxIndex + 1} / {allPhotos.length}
          </span>

          <div className="flex items-center gap-3 absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <button onClick={() => toggleFavorite(allPhotos[lightboxIndex].id)}
              className={`p-2 rounded-full transition-colors ${favorites.has(allPhotos[lightboxIndex].id) ? "text-white" : "text-[#555] hover:text-white"}`}>
              <Heart size={20} fill={favorites.has(allPhotos[lightboxIndex].id) ? "currentColor" : "none"} />
            </button>
            <a href={allPhotos[lightboxIndex].originalUrl || "#"} download
              className="p-2 rounded-full text-[#555] hover:text-white transition-colors">
              <Download size={20} />
            </a>
          </div>

          <img
            src={allPhotos[lightboxIndex].previewUrl || allPhotos[lightboxIndex].thumbnailUrl || undefined}
            alt="" className="max-w-[90vw] max-h-[85vh] object-contain" />

          {lightboxIndex > 0 && (
            <button onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-[#555] hover:text-white transition-colors">
              <ChevronLeft size={32} />
            </button>
          )}
          {lightboxIndex < allPhotos.length - 1 && (
            <button onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-[#555] hover:text-white transition-colors">
              <ChevronRight size={32} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
