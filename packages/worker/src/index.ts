import { Queue, Worker } from "bullmq";
import sharp from "sharp";
import { encode } from "blurhash";
import { THUMBNAIL_WIDTH, PREVIEW_WIDTH } from "@gallery/shared";
import { storage } from "./storage.js";
import { prisma } from "./db.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export interface ProcessImageJob {
  photoId: string;
  buffer: Buffer;
  fileName: string;
}

export const processImageQueue = new Queue<ProcessImageJob>("process-image", {
  connection: { url: REDIS_URL },
});

export const downloadZipQueue = new Queue("download-zip", {
  connection: { url: REDIS_URL },
});

async function generateThumbnail(buffer: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const width = Math.min(THUMBNAIL_WIDTH, metadata.width || THUMBNAIL_WIDTH);
  const resized = await image
    .resize(width, undefined, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const meta = await sharp(resized).metadata();
  return { buffer: resized, width: meta.width!, height: meta.height! };
}

async function generatePreview(buffer: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const width = Math.min(PREVIEW_WIDTH, metadata.width || PREVIEW_WIDTH);
  const resized = await image
    .resize(width, undefined, { withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  const meta = await sharp(resized).metadata();
  return { buffer: resized, width: meta.width!, height: meta.height! };
}

function generateBlurhash(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    sharp(buffer)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: "inside" })
      .toBuffer((err, data, info) => {
        if (err) {
          resolve("LEHV6nWB2yk8pyo0adR*.7kCMdnj");
          return;
        }
        try {
          const blurhash = encode(
            new Uint8ClampedArray(data),
            info.width,
            info.height,
            4,
            4
          );
          resolve(blurhash);
        } catch {
          resolve("LEHV6nWB2yk8pyo0adR*.7kCMdnj");
        }
      });
  });
}

const imageWorker = new Worker<ProcessImageJob>(
  "process-image",
  async (job) => {
    const { photoId, buffer, fileName } = job.data;

    try {
      const [thumbnail, preview, originalMeta, blurhash] = await Promise.all([
        generateThumbnail(buffer),
        generatePreview(buffer),
        sharp(buffer).metadata(),
        generateBlurhash(buffer),
      ]);

      const baseKey = `photos/${photoId}`;
      const ext = fileName.split(".").pop() || "jpg";

      await Promise.all([
        storage.upload(`${baseKey}/original.${ext}`, buffer, "image/jpeg"),
        storage.upload(`${baseKey}/thumb.jpg`, thumbnail.buffer, "image/jpeg"),
        storage.upload(`${baseKey}/preview.jpg`, preview.buffer, "image/jpeg"),
      ]);

      await prisma.photo.update({
        where: { id: photoId },
        data: {
          originalKey: `${baseKey}/original.${ext}`,
          thumbnailKey: `${baseKey}/thumb.jpg`,
          previewKey: `${baseKey}/preview.jpg`,
          width: originalMeta.width || null,
          height: originalMeta.height || null,
          blurhash,
          fileSize: BigInt(buffer.length),
        },
      });

      return { photoId, status: "processed" };
    } catch (err) {
      console.error(`Failed to process photo ${photoId}:`, err);
      throw err;
    }
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 2,
  }
);

const zipWorker = new Worker(
  "download-zip",
  async (job) => {
    console.log(`Building zip for job ${job.id}`);
    return { status: "complete" };
  },
  { connection: { url: REDIS_URL } }
);

console.log("Worker started — waiting for jobs...");

process.on("SIGTERM", async () => {
  await imageWorker.close();
  await zipWorker.close();
  process.exit(0);
});
