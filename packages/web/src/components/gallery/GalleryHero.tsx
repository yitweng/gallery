"use client";

interface GalleryHeroProps {
  title: string;
  description?: string;
  coverImage?: string;
}

export function GalleryHero({ title, description, coverImage }: GalleryHeroProps) {
  return (
    <div className="relative min-h-[60vh] flex items-end">
      {coverImage && (
        <div className="absolute inset-0">
          <img
            src={coverImage}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      )}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-16 pt-32">
        <div className={coverImage ? "text-white" : "text-stone-800"}>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-4 text-lg opacity-80 max-w-xl">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
