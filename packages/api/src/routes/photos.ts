import { Router, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { encode } from "blurhash";
import { v4 as uuid } from "uuid";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { p } from "../middleware/params.js";
import { storage } from "../storage/index.js";
import { PHOTO_ACCEPT_MIMES, MAX_UPLOAD_SIZE, THUMBNAIL_WIDTH, PREVIEW_WIDTH } from "@gallery/shared";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (PHOTO_ACCEPT_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

export const photosRouter = Router();

async function generateThumbnail(buffer: Buffer) {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const w = Math.min(THUMBNAIL_WIDTH, meta.width || THUMBNAIL_WIDTH);
  return image.resize(w, undefined, { withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}

async function generatePreview(buffer: Buffer) {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const w = Math.min(PREVIEW_WIDTH, meta.width || PREVIEW_WIDTH);
  return image.resize(w, undefined, { withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
}

function generateBlurhash(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    sharp(buffer)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: "inside" })
      .toBuffer((err, data, info) => {
        if (err || !data) { resolve("LEHV6nWB2yk8pyo0adR*.7kCMdnj"); return; }
        try {
          resolve(encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4));
        } catch { resolve("LEHV6nWB2yk8pyo0adR*.7kCMdnj"); }
      });
  });
}

photosRouter.post(
  "/upload/:galleryId",
  requireAuth,
  upload.array("photos", 50),
  async (req: Request, res: Response) => {
    const galleryId = p(req, "galleryId");
    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, userId: req.user!.userId },
    });
    if (!gallery) {
      res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
      return;
    }

    const collectionId = req.body.collectionId as string | undefined;
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "VALIDATION", message: "No files uploaded", statusCode: 400 });
      return;
    }

    const results: unknown[] = [];

    for (const file of files) {
      const id = uuid();
      const ext = file.originalname.split(".").pop() || "jpg";
      const baseKey = `photos/${id}`;

      try {
        const [thumb, preview, blurhash, originalMeta] = await Promise.all([
          generateThumbnail(file.buffer),
          generatePreview(file.buffer),
          generateBlurhash(file.buffer),
          sharp(file.buffer).metadata(),
        ]);

        await Promise.all([
          storage.upload(`${baseKey}/original.${ext}`, file.buffer, file.mimetype),
          storage.upload(`${baseKey}/thumb.jpg`, thumb, "image/jpeg"),
          storage.upload(`${baseKey}/preview.jpg`, preview, "image/jpeg"),
        ]);

        const photo = await prisma.photo.create({
          data: {
            id,
            galleryId,
            collectionId: collectionId || null,
            originalKey: `${baseKey}/original.${ext}`,
            thumbnailKey: `${baseKey}/thumb.jpg`,
            previewKey: `${baseKey}/preview.jpg`,
            fileName: file.originalname,
            fileSize: BigInt(file.size),
            width: originalMeta.width || null,
            height: originalMeta.height || null,
            blurhash,
          },
        });

        results.push({
          id: photo.id,
          fileName: photo.fileName,
          thumbnailUrl: storage.getPublicUrl(photo.thumbnailKey!),
          previewUrl: storage.getPublicUrl(photo.previewKey!),
          width: photo.width,
          height: photo.height,
        });
      } catch (err) {
        console.error(`Failed to process ${file.originalname}:`, err);
      }
    }

    res.status(201).json({ uploaded: results.length, photos: results });
  }
);

photosRouter.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = p(req, "id");
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { gallery: { select: { userId: true } } },
  });
  if (!photo || photo.gallery.userId !== req.user!.userId) {
    res.status(404).json({ error: "NOT_FOUND", message: "Photo not found", statusCode: 404 });
    return;
  }

  const updated = await prisma.photo.update({ where: { id }, data: req.body });
  res.json(updated);
});

photosRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = p(req, "id");
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { gallery: { select: { userId: true } } },
  });
  if (!photo || photo.gallery.userId !== req.user!.userId) {
    res.status(404).json({ error: "NOT_FOUND", message: "Photo not found", statusCode: 404 });
    return;
  }

  if (photo.thumbnailKey) await storage.delete(photo.thumbnailKey).catch(() => {});
  if (photo.previewKey) await storage.delete(photo.previewKey).catch(() => {});
  if (photo.originalKey) await storage.delete(photo.originalKey).catch(() => {});

  await prisma.photo.delete({ where: { id } });
  res.json({ deleted: true });
});

photosRouter.get("/:id", async (req: Request, res: Response) => {
  const id = p(req, "id");
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) {
    res.status(404).json({ error: "NOT_FOUND", message: "Photo not found", statusCode: 404 });
    return;
  }
  res.json({
    ...photo,
    thumbnailUrl: photo.thumbnailKey ? storage.getPublicUrl(photo.thumbnailKey) : null,
    previewUrl: photo.previewKey ? storage.getPublicUrl(photo.previewKey) : null,
    originalUrl: photo.originalKey ? storage.getPublicUrl(photo.originalKey) : null,
  });
});
