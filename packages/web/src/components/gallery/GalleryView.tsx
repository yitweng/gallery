"use client";

import { useState, useCallback, useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { GalleryHero } from "./GalleryHero";
import { CollectionNav } from "./CollectionNav";
import { PhotoGrid } from "./PhotoGrid";
import { Lightbox } from "./Lightbox";

interface Photo {
  id: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  originalUrl: string | null;
  blurhash: string | null;
  width: number | null;
  height: number | null;
  fileName: string;
}

interface Collection {
  id: string;
  title: string;
  photos: Photo[];
}

interface GalleryData {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  protected: boolean;
  downloadProtected: boolean;
  downloadPermission: string;
  favoritesEnabled: boolean;
  collections: Collection[];
}

interface Props {
  gallery: GalleryData;
}

export function GalleryView({ gallery }: Props) {
  const [activeCollection, setActiveCollection] = useState<string | undefined>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const stored = localStorage.getItem(`fav-${gallery.id}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const toggleFavorite = useCallback(
    (photoId: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(photoId)) {
          next.delete(photoId);
        } else {
          next.add(photoId);
        }
        localStorage.setItem(`fav-${gallery.id}`, JSON.stringify([...next]));
        return next;
      });
    },
    [gallery.id]
  );

  const allPhotos = useMemo(
    () => gallery.collections.flatMap((c) => c.photos),
    [gallery.collections]
  );

  const filteredPhotos = useMemo(() => {
    if (!activeCollection) return allPhotos;
    const col = gallery.collections.find((c) => c.id === activeCollection);
    return col?.photos || [];
  }, [activeCollection, allPhotos, gallery.collections]);

  const collectionsForNav = gallery.collections.map((c) => ({
    id: c.id,
    title: c.title,
  }));

  const handlePhotoClick = useCallback(
    (photo: Photo, index: number) => {
      const globalIndex = allPhotos.findIndex((p) => p.id === photo.id);
      setLightboxIndex(globalIndex >= 0 ? globalIndex : 0);
    },
    [allPhotos]
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <GalleryHero
        title={gallery.title}
        description={gallery.description}
        coverImage={gallery.coverImage || undefined}
      />

      <CollectionNav
        collections={collectionsForNav}
        activeId={activeCollection}
        onChange={setActiveCollection}
      />

      {/* Favorite count badge */}
      {gallery.favoritesEnabled && favorites.size > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-end">
          <span className="text-xs text-stone-400">
            {favorites.size} favorite{favorites.size !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Photo grid */}
      <div className="max-w-7xl mx-auto px-2 md:px-6 pb-12">
        <PhotoGrid photos={filteredPhotos} onPhotoClick={handlePhotoClick} />
      </div>

      {/* Download button */}
      <div className="fixed bottom-6 right-6 z-20">
        {gallery.downloadPermission !== "NONE" && (
          <button className="flex items-center gap-2 px-5 py-3 bg-stone-900 text-white rounded-full shadow-lg hover:bg-stone-800 transition-colors text-sm font-medium">
            <ArrowDown size={18} />
            Download
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={allPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
