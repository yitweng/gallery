"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getToken } from "@/lib/admin";
import { api } from "@/lib/api";
import { ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";

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
  const [collectionId, setCollectionId] = useState<string>("");

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

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const token = getToken();
    if (!token) return;

    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("photos", f));
    if (collectionId) formData.append("collectionId", collectionId);

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
      await loadGallery();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function createCollection() {
    const title = prompt("Collection name (e.g., Ceremony, Reception):");
    if (!title) return;
    const token = getToken();
    if (!token) return;

    try {
      await api.post(`/api/galleries/${id}/collections`, { title }, token);
      await loadGallery();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create collection");
    }
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
      <header className="border-b border-stone-200 bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-medium text-stone-800">{gallery.title}</h1>
              <p className="text-xs text-stone-400">{allPhotos.length} photos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={createCollection}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Collection
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Upload */}
        <div className="mb-8 bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-stone-800 mb-4">Upload Photos</h2>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs text-stone-400 mb-1">Collection (optional)</label>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Photos</option>
                {gallery.collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800 cursor-pointer transition-colors">
              <Upload size={16} />
              {uploading ? "Uploading..." : "Select Files"}
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
                disabled={uploading}
              />
            </label>
          </div>
          {uploading && (
            <div className="mt-4 w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-stone-800 rounded-full animate-pulse w-2/3" />
            </div>
          )}
        </div>

        {/* Collections */}
        {gallery.collections.length > 0 ? (
          <div className="space-y-8">
            {gallery.collections.map((col) => (
              <div key={col.id}>
                <h3 className="text-sm font-medium text-stone-600 mb-3">
                  {col.title} ({col.photos.length})
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-1">
                  {col.photos.map((photo) => (
                    <div key={photo.id} className="relative group aspect-square bg-stone-100 overflow-hidden rounded-sm">
                      {photo.thumbnailUrl ? (
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.fileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">
                          processing
                        </div>
                      )}
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-stone-400">
            <Upload size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg">Upload your first photos</p>
          </div>
        )}
      </div>
    </div>
  );
}
