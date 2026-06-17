import { Router, type Request, type Response } from "express";
import { prisma } from "../db.js";
import { p } from "../middleware/params.js";

export const downloadRouter = Router();

downloadRouter.post("/:galleryId", async (req: Request, res: Response) => {
  const galleryId = p(req, "galleryId");
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId, status: "PUBLISHED" },
  });
  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  const { downloadPin, photoIds } = req.body;

  if (gallery.downloadPin && gallery.downloadPin !== downloadPin) {
    res.status(403).json({ error: "FORBIDDEN", message: "Invalid download PIN", statusCode: 403 });
    return;
  }

  if (gallery.downloadPermission === "NONE") {
    res.status(403).json({ error: "FORBIDDEN", message: "Downloads not allowed", statusCode: 403 });
    return;
  }

  if (gallery.downloadPermission === "SELECTION" && (!photoIds || photoIds.length === 0)) {
    res.status(400).json({ error: "VALIDATION", message: "Must select photos to download", statusCode: 400 });
    return;
  }

  const where = {
    galleryId,
    ...(photoIds?.length ? { id: { in: photoIds } } : {}),
  } as Parameters<typeof prisma.photo.findMany>[0];

  const photos = await prisma.photo.findMany({
    ...where,
    orderBy: { sortOrder: "asc" },
  });

  if (photos.length === 0) {
    res.status(404).json({ error: "NOT_FOUND", message: "No photos found", statusCode: 404 });
    return;
  }

  const totalSize = photos.reduce((sum, p) => sum + Number(p.fileSize), 0);

  await prisma.downloadLog.create({
    data: {
      galleryId,
      ip: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      downloadType: photoIds?.length ? "SELECTION" : "ALL",
      photoCount: photos.length,
      sizeBytes: BigInt(totalSize),
    },
  });

  res.json({
    downloadId: `zip-${Date.now()}`,
    photoCount: photos.length,
    totalSize,
    status: "queued",
    message: "Download is being prepared",
    estimatedTime: Math.ceil(totalSize / (50 * 1024 * 1024)) + " seconds",
  });
});

downloadRouter.get("/status/:downloadId", async (req: Request, res: Response) => {
  const downloadId = p(req, "downloadId");
  res.json({
    downloadId,
    status: "ready",
    progress: 100,
    url: `/api/download/file/${downloadId}`,
  });
});
