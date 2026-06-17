import { api } from "@/lib/api";

interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  _count: { photos: number };
  updatedAt: string;
}

interface GalleryListProps {
  token: string;
}

let cachedGalleries: Gallery[] | null = null;

export async function getGalleriesClient(token: string): Promise<Gallery[]> {
  try {
    const data = await api.get<Gallery[]>("/api/galleries", token);
    cachedGalleries = data;
    return data;
  } catch {
    return cachedGalleries || [];
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gallery_token");
}

export function setToken(token: string) {
  localStorage.setItem("gallery_token", token);
}

export function clearToken() {
  localStorage.removeItem("gallery_token");
}

export async function login(email: string, password: string): Promise<string> {
  const data = await api.post<{ token: string }>("/api/auth/login", { email, password });
  setToken(data.token);
  return data.token;
}
