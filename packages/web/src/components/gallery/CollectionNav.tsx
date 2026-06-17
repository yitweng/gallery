"use client";

interface CollectionNavProps {
  collections: { id: string; title: string }[];
  activeId?: string;
  onChange: (id: string | undefined) => void;
  downloadUrl?: string;
}

export function CollectionNav({ collections, activeId, onChange, downloadUrl }: CollectionNavProps) {
  if (collections.length <= 1 && !downloadUrl) return null;

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto py-3">
        <button
          onClick={() => onChange(undefined)}
          className={`px-4 py-2 text-sm rounded-full transition-colors whitespace-nowrap ${
            !activeId
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          All
        </button>
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={`px-4 py-2 text-sm rounded-full transition-colors whitespace-nowrap ${
              activeId === c.id
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>
    </div>
  );
}
