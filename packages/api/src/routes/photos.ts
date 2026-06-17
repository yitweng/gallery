import { Router, type Request, type Response } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { p } from "../middleware/params.js";
import { PHOTO_ACCEPT_MIMES, MAX_UPLOAD_SIZE } from "@gallery/shared";

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

photosRouter.post("/upload/:galleryId", requireAuth, upload.array("photos", 50), async (req: Request, res: Response) => {
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

  const photos = await Promise.all(
    files.map(async (file) => {
      const photo = await prisma.photo.create({
        data: {
          galleryId,
          collectionId: collectionId || null,
          originalKey: `pending/${Date.now()}-${file.originalname}`,
          fileName: file.originalname,
          fileSize: BigInt(file.size),
        },
      });
      return photo;
    })
  );

  res.status(201).json({ uploaded: photos.length, photos });
});

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

  const updated = await prisma.photo.update({
    where: { id },
    data: req.body,
  });
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

  await prisma.photo.delete({ where: { id } });
  res.json({ deleted: true });
});
