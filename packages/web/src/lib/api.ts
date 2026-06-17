const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: "GET", token }),

  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), token }),

  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), token }),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: "DELETE", token }),
};
