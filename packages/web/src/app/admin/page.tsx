"use client";

import { useState, useEffect, useRef, useCallback } from "react";

function getToken() { return localStorage.getItem("gallery_token"); }
function setToken(t: string) { localStorage.setItem("gallery_token", t); }

async function apiCall(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { ...options.headers as Record<string, string> || {} };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body && typeof options.body !== "string" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

interface Gallery { id: string; title: string; slug: string; status: string; _count: { photos: number } }
interface Photo { id: string; fileName: string; thumbnailUrl: string | null; originalUrl: string | null }
interface CollectionData { id: string; title: string; photos: Photo[] }

export default function AdminApp() {
  const [view, setView] = useState<"login" | "list" | "gallery">("login");
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Gallery detail state
  const [activeGallery, setActiveGallery] = useState<Gallery | null>(null);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (getToken()) {
      setView("list");
      loadGalleries();
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiCall("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setView("list");
      await loadGalleries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadGalleries() {
    try {
      const data = await apiCall("/api/galleries");
      setGalleries(data);
    } catch {
      setToken("");
    }
  }

  async function loadGalleryDetail(galleryId: string) {
    try {
      const data = await apiCall(`/api/galleries/${galleryId}`);
      setCollections(data.collections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  async function handleCreateGallery() {
    const title = prompt("Gallery title:");
    if (!title) return;
    const slug = prompt("URL slug (e.g., june-wedding):", title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    if (!slug) return;
    try {
      await apiCall("/api/galleries", { method: "POST", body: { title, slug } });
      await loadGalleries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handlePublish(gallery: Gallery) {
    const newStatus = gallery.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await apiCall(`/api/galleries/${gallery.id}`, { method: "PATCH", body: { status: newStatus } });
    await loadGalleries();
  }

  async function handleUpload(files: FileList) {
    if (files.length === 0 || !activeGallery) return;
    setUploading(true);
    setError("");

    const batches = [];
    const arr = Array.from(files);
    for (let i = 0; i < arr.length; i += 10) {
      batches.push(arr.slice(i, i + 10));
    }

    for (let i = 0; i < batches.length; i++) {
      const fd = new FormData();
      batches[i].forEach((f) => fd.append("photos", f));
      if (selectedCollection) fd.append("collectionId", selectedCollection);

      try {
        await apiCall(`/api/photos/upload/${activeGallery.id}`, {
          method: "POST",
          body: fd,
        });
      } catch (err) {
        setError(`Batch ${i + 1} failed: ${err instanceof Error ? err.message : "Upload error"}`);
        break;
      }
    }

    setUploading(false);
    await loadGalleryDetail(activeGallery.id);
  }

  function handleLogout() {
    setToken("");
    setView("login");
    setGalleries([]);
    setActiveGallery(null);
  }

  // Login view
  if (view === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-light text-center text-stone-800 mb-8">Gallery Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>}
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full px-4 py-3 border border-stone-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-4 py-3 border border-stone-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Gallery detail view
  if (view === "gallery" && activeGallery) {
    const allPhotos = collections.flatMap((c) => c.photos);

    return (
      <div className="min-h-screen bg-stone-50">
        <div className="border-b border-stone-200 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setView("list"); setActiveGallery(null); }} className="text-stone-400 hover:text-stone-600">&larr; Back</button>
              <div>
                <h1 className="text-lg font-medium text-stone-800">{activeGallery.title}</h1>
                <p className="text-xs text-stone-400">{allPhotos.length} photos &middot; /{activeGallery.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white"
              >
                <option value="">Upload to: All</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  const title = prompt("Collection name:");
                  if (!title || !activeGallery) return;
                  await apiCall(`/api/galleries/${activeGallery.id}/collections`, { method: "POST", body: { title } });
                  await loadGalleryDetail(activeGallery.id);
                }}
                className="text-sm px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                + Collection
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {error && <div className="mb-4 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all mb-8
              ${dragOver ? "border-stone-500 bg-stone-100" : "border-stone-300 hover:border-stone-400"}
              ${uploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)} />
            {uploading ? (
              <div>
                <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-stone-500">Uploading...</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-stone-500">Drop photos here</p>
                <p className="text-sm text-stone-400 mt-1">or click to browse &middot; JPG, PNG, WebP</p>
              </div>
            )}
          </div>

          {/* Photos */}
          {collections.length > 0 ? (
            collections.map((col) => (
              <div key={col.id} className="mb-8">
                <h3 className="text-sm font-medium text-stone-600 mb-3">{col.title} ({col.photos.length})</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {col.photos.map((p) => (
                    <PhotoTile key={p.id} photo={p} onDelete={async () => {
                      await apiCall(`/api/photos/${p.id}`, { method: "DELETE" });
                      await loadGalleryDetail(activeGallery.id);
                    }} />
                  ))}
                </div>
              </div>
            ))
          ) : allPhotos.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-stone-600 mb-3">All Photos ({allPhotos.length})</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {allPhotos.map((p) => (
                  <PhotoTile key={p.id} photo={p} onDelete={async () => {
                    await apiCall(`/api/photos/${p.id}`, { method: "DELETE" });
                    await loadGalleryDetail(activeGallery.id);
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-stone-300">
              <p className="text-lg">Drop photos above to start</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Gallery list
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-medium text-stone-800">Galleries</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleCreateGallery} className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800 transition-colors">
              New Gallery
            </button>
            <button onClick={handleLogout} className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && <div className="mb-4 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>}

        {galleries.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-stone-400 text-lg mb-4">No galleries yet</p>
            <button onClick={handleCreateGallery} className="text-stone-600 hover:text-stone-800 underline text-sm">
              Create your first gallery
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {galleries.map((g) => (
              <div key={g.id} className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-stone-800 truncate">{g.title}</h3>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${
                      g.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
                    }`}>{g.status}</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    /{g.slug} &middot; {g._count.photos} photos
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePublish(g)}
                    className="px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    {g.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={async () => {
                      setActiveGallery(g);
                      setView("gallery");
                      await loadGalleryDetail(g.id);
                    }}
                    className="px-3 py-1.5 text-xs bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoTile({ photo, onDelete }: { photo: Photo; onDelete: () => void }) {
  return (
    <div className="group relative aspect-square bg-stone-100 rounded-lg overflow-hidden">
      {photo.thumbnailUrl ? (
        <img src={photo.thumbnailUrl} alt={photo.fileName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" />
        </div>
      )}
      <button
        onClick={onDelete}
        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >
        &times;
      </button>
    </div>
  );
}
