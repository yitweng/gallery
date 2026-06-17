import { z } from "zod";

export const createGallerySchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  password: z.string().min(4).max(100).optional(),
  downloadPin: z.string().min(4).max(10).optional(),
  downloadPermission: z.enum(["NONE", "SINGLE", "SELECTION", "ALL"]).optional(),
  favoritesEnabled: z.boolean().optional(),
  watermarkEnabled: z.boolean().optional(),
});

export const updateGallerySchema = createGallerySchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  coverImage: z.string().optional(),
});

export const galleryAccessSchema = z.object({
  password: z.string().optional(),
  downloadPin: z.string().optional(),
});

export const createCollectionSchema = z.object({
  title: z.string().min(1).max(200),
});

export const downloadRequestSchema = z.object({
  photoIds: z.array(z.string()).optional(),
  collectionId: z.string().optional(),
  size: z.enum(["web", "highres", "original"]).default("highres"),
});

export const favoriteToggleSchema = z.object({
  photoId: z.string(),
});

export const faceMatchSchema = z.object({
  descriptor: z.array(z.number()),
  galleryId: z.string(),
  threshold: z.number().min(0).max(1).default(0.6),
});

export const createOrderSchema = z.object({
  galleryId: z.string(),
  clientEmail: z.string().email(),
  clientName: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      photoId: z.string(),
      quantity: z.number().int().min(1).default(1),
    })
  ),
});
