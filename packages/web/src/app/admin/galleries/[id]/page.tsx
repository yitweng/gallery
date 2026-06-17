"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getToken } from "@/lib/admin";
import { api } from "@/lib/api";
import { ArrowLeft, Upload, Plus, Trash2, X, Image } from "lucide-react";

interface Photo {
  id: string;
  fileName: string;
  thumbnailUrl: string | null;
  originalUrl: string | null;
}

interface Collection {
  id: string;
  title: string;
  photos: Photo[];
}

interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  collections: Collection[];
}

export default function GalleryManagePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGallery = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.get<Gallery>(`/api/galleries/${id}`, token);
      setGallery(data);
    } catch {
      alert("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  async function uploadFiles(files: FileList | File[]) {
    if (files.length === 0) return;
    const token = getToken();
    if (!token) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    const fileArray = Array.from(files);
    const BATCH_SIZE = 10;

    for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
      const batch = fileArray.slice(i, i + BATCH_SIZE);
      const formData = new FormData();
      batch.forEach((f) => formData.append("photos", f));

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${API_URL}/api/photos/upload/${id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Upload failed");
        }
        setUploadProgress({ current: Math.min(i + BATCH_SIZE, fileArray.length), total: fileArray.length });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Upload failed");
        break;
      }
    }

    setUploading(false);
    setUploadProgress(null);
    await loadGallery();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  async function createCollection() {
    const title = prompt("Collection name (e.g., Ceremony):");
    if (!title) return;
    const token = getToken();
    if (!token) return;
    try {
      await api.post(`/api/galleries/${id}/collections`, { title }, token);
      await loadGallery();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function moveToCollection(photoId: string, collectionId: string) {
    const token = getToken();
    if (!token) return;
    await api.patch(`/api/photos/${photoId}`, { collectionId: collectionId || null }, token);
    await loadGallery();
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    const token = getToken();
    if (!token) return;
    await api.delete(`/api/photos/${photoId}`, token);
    await loadGallery();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-500">Gallery not found</p>
      </div>
    );
  }

  const allPhotos = gallery.collections.flatMap((c) => c.photos);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin")} className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-medium text-stone-800">{gallery.title}</h1>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span>/{gallery.slug}</span>
                <span>{allPhotos.length} photos</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={createCollection} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
              <Plus size={14} /> Collection
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Drag-and-drop upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative mb-8 border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            ${dragOver ? "border-stone-400 bg-stone-100" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"}
            ${uploading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          {uploading ? (
            <div className="space-y-3">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-stone-500">
                Uploading{uploadProgress ? ` ${uploadProgress.current}/${uploadProgress.total}` : ""}...
              </p>
              {uploadProgress && (
                <div className="max-w-xs mx-auto bg-stone-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-stone-800 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto">
                <Upload size={24} className="text-stone-400" />
              </div>
              <p className="text-sm font-medium text-stone-600">
                Drop photos here or click to browse
              </p>
              <p className="text-xs text-stone-400">
                JPG, PNG, WebP — up to 50MB each
              </p>
            </div>
          )}
        </div>

        {/* Photo grid */}
        {allPhotos.length === 0 ? (
          <div className="text-center py-16">
            <Image size={48} className="mx-auto text-stone-200 mb-3" />
            <p className="text-stone-400">Drag and drop photos above to get started</p>
          </div>
        ) : gallery.collections.length > 0 ? (
          <div className="space-y-10">
            {gallery.collections.map((col) => (
              <div key={col.id}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-stone-600">
                    {col.title}
                    <span className="ml-2 text-stone-400 font-normal">{col.photos.length} photos</span>
                  </h3>
                </div>
                <PhotoGrid
                  photos={col.photos}
                  collections={gallery.collections}
                  currentCollectionId={col.id}
                  onDelete={deletePhoto}
                  onMove={moveToCollection}
                />
              </div>
            ))}
            {/* Uncategorized photos */}
            {allPhotos.filter(p => !p.thumbnailUrl).length > 0 && (
              <div className="text-xs text-stone-400 text-center py-4">
                Photos are processing — thumbnails will appear shortly
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-stone-600 mb-3">
              All Photos <span className="ml-2 text-stone-400 font-normal">{allPhotos.length}</span>
            </h3>
            <PhotoGrid
              photos={allPhotos}
              collections={gallery.collections}
              onDelete={deletePhoto}
              onMove={moveToCollection}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoGrid({
  photos,
  collections,
  currentCollectionId,
  onDelete,
  onMove,
}: {
  photos: Photo[];
  collections: Collection[];
  currentCollectionId?: string;
  onDelete: (id: string) => void;
  onMove: (photoId: string, collectionId: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {photos.map((photo) => (
        <div key={photo.id} className="relative group aspect-square bg-stone-100 rounded-lg overflow-hidden">
          {photo.thumbnailUrl ? (
            <img src={photo.thumbnailUrl} alt={photo.fileName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-1.5 opacity-0 group-hover:opacity-100">
            {/* Move to collection */}
            {collections.length > 0 && (
              <select
                value={currentCollectionId || ""}
                onChange={(e) => onMove(photo.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5 border-0 outline-none appearance-none cursor-pointer"
              >
                <option value="">Move to...</option>
                {collections.filter(c => c.id !== currentCollectionId).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
                {currentCollectionId && <option value="">Remove from collection</option>}
              </select>
            )}
            <button
              onClick={() => onDelete(photo.id)}
              className="p-1 bg-black/60 text-white rounded hover:bg-red-500 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
