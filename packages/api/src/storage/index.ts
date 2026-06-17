const endpoint = process.env.STORAGE_ENDPOINT || "http://localhost:9000";
const bucket = process.env.STORAGE_BUCKET || "gallery-dev";
const publicUrl = process.env.STORAGE_PUBLIC_URL || endpoint;

export const storage = {
  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const url = `${endpoint}/${bucket}/${key}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
      },
      body: buffer,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return key;
  },

  async delete(key: string): Promise<void> {
    const url = `${endpoint}/${bucket}/${key}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`Delete failed: ${res.status}`);
  },

  getPublicUrl(key: string): string {
    return `${publicUrl}/${bucket}/${key}`;
  },
};
