import { Queue, Worker } from "bullmq";
import { THUMBNAIL_WIDTH, PREVIEW_WIDTH } from "@gallery/shared";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

interface ProcessImageJob {
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

const imageWorker = new Worker<ProcessImageJob>(
  "process-image",
  async (job) => {
    const { photoId, buffer, fileName } = job.data;
    console.log(`Processing photo ${photoId}: ${fileName}`);

    // Placeholder: real processing in Phase 1
    await job.updateProgress(50);

    return { photoId, status: "processed" };
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
    return { status: "complete", url: "" };
  },
  {
    connection: { url: REDIS_URL },
  }
);

console.log("Worker started — waiting for jobs...");

process.on("SIGTERM", async () => {
  await imageWorker.close();
  await zipWorker.close();
  process.exit(0);
});
