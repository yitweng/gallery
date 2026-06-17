"use client";

import { useState, useCallback } from "react";

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

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

export function PhotoGrid({ photos, onPhotoClick }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-24 text-stone-400">
        <p className="text-lg">No photos yet</p>
      </div>
    );
  }

  const columns = photos.reduce<Photo[][]>((acc, photo, i) => {
    const col = i % 3;
    if (!acc[col]) acc[col] = [];
    acc[col].push(photo);
    return acc;
  }, [[], [], []]);

  return (
    <>
      {/* Mobile: 2 columns */}
      <div className="md:hidden grid grid-cols-2 gap-1">
        {photos.map((photo, index) => (
          <PhotoThumb
            key={photo.id}
            photo={photo}
            onClick={() => onPhotoClick(photo, index)}
          />
        ))}
      </div>

      {/* Desktop: masonry 3-column */}
      <div className="hidden md:grid grid-cols-3 gap-1">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-1">
            {col.map((photo, rowIdx) => (
              <PhotoThumb
                key={photo.id}
                photo={photo}
                onClick={() =>
                  onPhotoClick(photo, columns.slice(0, colIdx).reduce((sum, c) => sum + c.length, 0) + rowIdx)
                }
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function PhotoThumb({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const aspectRatio = photo.width && photo.height
    ? photo.width / photo.height
    : 1;

  return (
    <button
      onClick={onClick}
      className="relative block w-full overflow-hidden bg-stone-100 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
    >
      <div
        style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}
        className="relative"
      >
        {photo.thumbnailUrl && (
          <img
            src={photo.thumbnailUrl}
            alt={photo.fileName}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {photo.blurhash && !loaded && (
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundColor: "#e7e5e4",
              backgroundImage: `url(data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="#e7e5e4"/></svg>`
              )})`,
            }}
          />
        )}
      </div>
    </button>
  );
}
