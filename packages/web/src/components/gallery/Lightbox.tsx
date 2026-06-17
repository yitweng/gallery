"use client";

import { useEffect, useCallback, useState } from "react";
import { X, ChevronLeft, ChevronRight, Heart, Download } from "lucide-react";

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

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  favorites: Set<string>;
  onToggleFavorite: (photoId: string) => void;
}

export function Lightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  favorites,
  onToggleFavorite,
}: LightboxProps) {
  const photo = photos[currentIndex];
  const [loaded, setLoaded] = useState(false);

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    setLoaded(false);
  }, [currentIndex]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/60 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X size={24} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 text-white/60 text-sm font-mono">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Actions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
        <button
          onClick={() => onToggleFavorite(photo.id)}
          className={`p-2 rounded-full transition-all ${
            favorites.has(photo.id)
              ? "text-red-400 bg-white/10"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
          aria-label={favorites.has(photo.id) ? "Remove favorite" : "Add favorite"}
        >
          <Heart
            size={20}
            fill={favorites.has(photo.id) ? "currentColor" : "none"}
          />
        </button>
        <a
          href={photo.originalUrl || photo.previewUrl || "#"}
          download={photo.fileName}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Download"
        >
          <Download size={20} />
        </a>
      </div>

      {/* Image */}
      <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center">
        {!loaded && (
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        )}
        <img
          src={photo.previewUrl || photo.thumbnailUrl || undefined}
          alt={photo.fileName}
          onLoad={() => setLoaded(true)}
          className={`max-w-full max-h-[85vh] object-contain transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0 absolute"
          }`}
        />
      </div>

      {/* Prev */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white transition-colors"
          aria-label="Previous photo"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Next */}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white transition-colors"
          aria-label="Next photo"
        >
          <ChevronRight size={32} />
        </button>
      )}
    </div>
  );
}
