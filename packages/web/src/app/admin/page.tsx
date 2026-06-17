"use client";

import { useState, useEffect, useRef } from "react";

function getToken() { return localStorage.getItem("gallery_token"); }
function setToken(t: string) { localStorage.setItem("gallery_token", t); }

interface Gallery { id: string; title: string; slug: string; status: string; _count: { photos: number } }
interface Photo { id: string; fileName: string; thumbnailUrl: string | null; originalUrl: string | null }
interface CollectionData { id: string; title: string; photos: Photo[] }

async function apiCall(path: string, options: Record<string, unknown> = {}) {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body != null) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const res = await fetch(path, { method: (options.method as string) || "GET", headers, body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function AdminApp() {
  const [view, setView] = useState<"login" | "list" | "gallery">("login");
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Gallery detail
  const [activeGallery, setActiveGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (getToken()) { setView("list"); loadGalleries(); } }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiCall("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(data.token);
      setView("list");
      await loadGalleries();
    } catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setLoading(false); }
  }

  async function loadGalleries() {
    try { setGalleries(await apiCall("/api/galleries")); }
    catch { setToken(""); }
  }

  async function loadPhotos(galleryId: string) {
    try { setPhotos((await apiCall(`/api/galleries/${galleryId}/photos?pageSize=200`)).items || []); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleCreate() {
    const title = prompt("Gallery title:");
    if (!title) return;
    const slug = prompt("URL slug:", title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    if (!slug) return;
    try { await apiCall("/api/galleries", { method: "POST", body: { title, slug } }); await loadGalleries(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handlePublish(g: Gallery) {
    await apiCall(`/api/galleries/${g.id}`, { method: "PATCH", body: { status: g.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" } });
    await loadGalleries();
  }

  async function handleUpload(files: FileList) {
    if (!files.length || !activeGallery) return;
    setUploading(true);
    setError("");
    const arr = Array.from(files);
    for (let i = 0; i < arr.length; i += 10) {
      const fd = new FormData();
      arr.slice(i, i + 10).forEach((f) => fd.append("photos", f));
      try { await apiCall(`/api/photos/upload/${activeGallery.id}`, { method: "POST", body: fd }); }
      catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); break; }
    }
    setUploading(false);
    await loadPhotos(activeGallery.id);
  }

  function handleLogout() { setToken(""); setView("login"); setGalleries([]); setActiveGallery(null); }

  // ─── LOGIN ──────────────────────────────────────────────────────
  if (view === "login") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <h1 className="text-2xl font-light text-white tracking-tight">Sign in</h1>
              <p className="text-sm text-[#555] mt-1">Gallery admin</p>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/5 border border-red-400/10 rounded-[8px] px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email" required
                className="w-full bg-[#111] border border-[#222] rounded-[8px] px-4 py-3 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#333] transition-colors"
              />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required
                className="w-full bg-[#111] border border-[#222] rounded-[8px] px-4 py-3 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#333] transition-colors"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-white text-black text-sm font-medium rounded-[8px] hover:bg-[#e5e5e5] disabled:opacity-40 transition-colors cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── GALLERY DETAIL ─────────────────────────────────────────────
  if (view === "gallery" && activeGallery) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#1a1a1a]">
          <div className="max-w-[1600px] mx-auto px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => { setView("list"); setActiveGallery(null); }}
                className="text-[#555] hover:text-white text-sm transition-colors">
                ← Galleries
              </button>
              <div className="w-px h-5 bg-[#1a1a1a]" />
              <div>
                <h1 className="text-sm font-medium text-white">{activeGallery.title}</h1>
                <p className="text-xs text-[#444]">
                  {photos.length} photos · {activeGallery.slug}
                  {" · "}
                  <a href={`https://v1.onemoreday.net/g/${activeGallery.slug}`}
                     target="_blank" className="hover:text-[#888] transition-colors">Preview ↗</a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <div className="max-w-[1600px] mx-auto px-8 py-12">
          {error && (
            <div className="mb-6 text-sm text-red-400 bg-red-400/5 border border-red-400/10 rounded-[8px] px-4 py-3">{error}</div>
          )}

          <button
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={`w-full border border-dashed rounded-[16px] p-24 text-center transition-all cursor-pointer
              ${dragOver ? "border-[#444] bg-[#111]" : "border-[#1a1a1a] hover:border-[#2a2a2a]"}
              ${uploading ? "pointer-events-none opacity-40" : ""}`}
          >
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)} />
            {uploading ? (
              <div className="space-y-3">
                <div className="w-8 h-8 border-2 border-[#333] border-t-white rounded-full animate-spin mx-auto" />
                <p className="text-sm text-[#555]">Uploading...</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-[#666]">Drop photos here</p>
                <p className="text-xs text-[#333] mt-1">or click to browse · JPG, PNG, WebP</p>
              </div>
            )}
          </button>
        </div>

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="max-w-[1600px] mx-auto px-8 pb-24">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-px bg-[#0a0a0a]">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-[4/3] bg-[#111] overflow-hidden">
                  {p.thumbnailUrl ? (
                    <img src={p.thumbnailUrl} alt={p.fileName} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-4 h-4 border border-[#333] border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm("Delete?")) return;
                      await apiCall(`/api/photos/${p.id}`, { method: "DELETE" });
                      await loadPhotos(activeGallery.id);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/70 text-[#888] hover:text-white hover:bg-red-500/80 rounded-[6px] flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── GALLERY LIST ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto px-8 py-4 flex items-center justify-between">
          <h1 className="text-sm font-medium text-white">Galleries</h1>
          <div className="flex items-center gap-3">
            <button onClick={handleCreate}
              className="text-sm text-[#888] hover:text-white transition-colors cursor-pointer">
              New
            </button>
            <button onClick={handleLogout}
              className="text-sm text-[#444] hover:text-[#888] transition-colors cursor-pointer">
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-8 py-12">
        {error && (
          <div className="mb-8 text-sm text-red-400 bg-red-400/5 border border-red-400/10 rounded-[8px] px-4 py-3">{error}</div>
        )}

        {galleries.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-sm text-[#555]">No galleries yet</p>
            <button onClick={handleCreate} className="mt-4 text-sm text-[#888] hover:text-white transition-colors">
              Create your first gallery
            </button>
          </div>
        ) : (
          <div className="space-y-px">
            {galleries.map((g) => (
              <div key={g.id}
                className="group flex items-center justify-between px-6 py-5 hover:bg-[#111] transition-colors rounded-[8px]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm text-white truncate">{g.title}</h3>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      g.status === "PUBLISHED" ? "text-[#888]" : "text-[#444]"
                    }`}>{g.status}</span>
                  </div>
                  <p className="text-xs text-[#333] mt-0.5">
                    {g.slug} · {g._count.photos} photos
                    {g.status === "PUBLISHED" && (
                      <> · <a href={`https://v1.onemoreday.net/g/${g.slug}`}
                           target="_blank" className="text-[#555] hover:text-[#888] transition-colors">Preview ↗</a></>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handlePublish(g)}
                    className="px-3 py-1.5 text-xs text-[#666] hover:text-white hover:bg-[#1a1a1a] rounded-[6px] transition-colors cursor-pointer">
                    {g.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={async () => {
                    setActiveGallery(g); setView("gallery"); await loadPhotos(g.id);
                  }}
                  className="px-3 py-1.5 text-xs text-white bg-white/10 hover:bg-white/20 rounded-[6px] transition-colors cursor-pointer">
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
