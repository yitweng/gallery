import { Router, type Request, type Response } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { p } from "../middleware/params.js";

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
            take: 20,
          },
        },
      },
    },
  });

  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  const { password, downloadPin, userId, ...safe } = gallery as Record<string, unknown>;
  res.json({
    ...safe,
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
  res.json(gallery);
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
    where: { id, status: "PUBLISHED" },
  });
  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  const page = parseInt(p(req, "page") || "1") || 1;
  const pageSize = Math.min(parseInt(p(req, "pageSize") || "50") || 50, 200);
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
    items: photos,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
});
