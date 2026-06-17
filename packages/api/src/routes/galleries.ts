import { Router, type Request, type Response } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { p, qn } from "../middleware/params.js";
import { storage } from "../storage/index.js";

function photoWithUrls(photo: Record<string, unknown>) {
  return {
    ...photo,
    thumbnailUrl: photo.thumbnailKey ? storage.getPublicUrl(photo.thumbnailKey as string) : null,
    previewUrl: photo.previewKey ? storage.getPublicUrl(photo.previewKey as string) : null,
    originalUrl: photo.originalKey ? storage.getPublicUrl(photo.originalKey as string) : null,
  };
}

export const galleriesRouter = Router();

galleriesRouter.get("/public/:slug", async (req: Request, res: Response) => {
  const slug = p(req, "slug");
  const gallery = await prisma.gallery.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      collections: {
        orderBy: { sortOrder: "asc" },
        include: {
          photos: {
            orderBy: { sortOrder: "asc" },
            take: 100,
          },
        },
      },
    },
  });

  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  const { password, downloadPin, userId, ...safe } = gallery;
  const collections = gallery.collections.map((c) => ({
    ...c,
    photos: c.photos.map(photoWithUrls),
  }));

  res.json({
    ...safe,
    collections,
    protected: !!password,
    downloadProtected: !!downloadPin,
  });
});

galleriesRouter.post("/verify/:slug", async (req: Request, res: Response) => {
  const slug = p(req, "slug");
  const gallery = await prisma.gallery.findUnique({ where: { slug } });
  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  const { password, downloadPin } = req.body;

  if (gallery.password && gallery.password !== password) {
    res.status(403).json({ error: "FORBIDDEN", message: "Incorrect password", statusCode: 403 });
    return;
  }

  res.json({
    verified: true,
    hasDownload: gallery.downloadPin ? gallery.downloadPin === downloadPin : true,
    downloadPermission: gallery.downloadPermission,
    favoritesEnabled: gallery.favoritesEnabled,
  });
});

galleriesRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  const galleries = await prisma.gallery.findMany({
    where: { userId: req.user!.userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { photos: true } } },
  });
  res.json(galleries);
});

galleriesRouter.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = p(req, "id");
  const gallery = await prisma.gallery.findFirst({
    where: { id, userId: req.user!.userId },
    include: {
      collections: { orderBy: { sortOrder: "asc" }, include: { photos: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }
  res.json({
    ...gallery,
    collections: gallery.collections.map((c) => ({
      ...c,
      photos: c.photos.map(photoWithUrls),
    })),
  });
});

galleriesRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  const { title, slug, description, password, downloadPin, downloadPermission } = req.body;
  const gallery = await prisma.gallery.create({
    data: {
      title,
      slug,
      description,
      password,
      downloadPin,
      downloadPermission,
      userId: req.user!.userId,
    },
  });
  res.status(201).json(gallery);
});

galleriesRouter.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = p(req, "id");
  const gallery = await prisma.gallery.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  const updated = await prisma.gallery.update({
    where: { id },
    data: req.body,
  });
  res.json(updated);
});

galleriesRouter.post("/:id/collections", requireAuth, async (req: Request, res: Response) => {
  const id = p(req, "id");
  const gallery = await prisma.gallery.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  const { title } = req.body;
  if (!title) {
    res.status(400).json({ error: "VALIDATION", message: "Title is required", statusCode: 400 });
    return;
  }

  const collection = await prisma.collection.create({
    data: { title, galleryId: id },
  });
  res.status(201).json(collection);
});

galleriesRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = p(req, "id");
  const gallery = await prisma.gallery.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  await prisma.gallery.delete({ where: { id } });
  res.json({ deleted: true });
});

galleriesRouter.get("/:id/photos", async (req: Request, res: Response) => {
  const id = p(req, "id");
  const gallery = await prisma.gallery.findUnique({
    where: { id },
  });
  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  // Require auth OR published status for photo access
  const isAdmin = req.headers.authorization?.startsWith("Bearer ");
  if (!isAdmin && gallery.status !== "PUBLISHED") {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  const page = qn(req, "page") || 1;
  const pageSize = Math.min(qn(req, "pageSize") || 50, 200);
  const collectionId = req.query.collectionId
    ? (Array.isArray(req.query.collectionId) ? req.query.collectionId[0] : req.query.collectionId)
    : undefined;

  const where = { galleryId: id, ...(collectionId ? { collectionId } : {}) };

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.photo.count({ where }),
  ]);

  res.json({
    items: photos.map(photoWithUrls),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
});
