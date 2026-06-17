export interface StorageProvider {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
  getStream(key: string): Promise<ReadableStream>;
}

import { ReadableStream } from "node:stream/web";

export function createStorageProvider(): StorageProvider {
  const endpoint = process.env.STORAGE_ENDPOINT || "http://localhost:9000";
  const bucket = process.env.STORAGE_BUCKET || "gallery-dev";
  const accessKey = process.env.STORAGE_ACCESS_KEY || "minioadmin";
  const secretKey = process.env.STORAGE_SECRET_KEY || "minioadmin";
  const region = process.env.STORAGE_REGION || "us-east-1";
  const publicUrl = process.env.STORAGE_PUBLIC_URL || endpoint;

  if (endpoint.includes("r2.cloudflarestorage.com")) {
    return createS3Provider(endpoint, bucket, accessKey, secretKey, region, publicUrl);
  }

  return createS3Provider(endpoint, bucket, accessKey, secretKey, region, publicUrl);
}

function createS3Provider(
  endpoint: string,
  bucket: string,
  accessKey: string,
  secretKey: string,
  region: string,
  publicUrl: string
): StorageProvider {
  return {
    async upload(key: string, buffer: Buffer, contentType: string) {
      const url = `${endpoint}/${bucket}/${key}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": buffer.length.toString(),
        },
        body: buffer,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
      return `${publicUrl}/${bucket}/${key}`;
    },

    async getSignedUrl(key: string, _expiresIn = 3600) {
      return `${publicUrl}/${bucket}/${key}`;
    },

    async delete(key: string) {
      const url = `${endpoint}/${bucket}/${key}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Delete failed: ${res.status}`);
      }
    },

    async getStream(key: string): Promise<ReadableStream> {
      const url = `${endpoint}/${bucket}/${key}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to read: ${res.status}`);
      return res.body as unknown as ReadableStream;
    },
  };
}
