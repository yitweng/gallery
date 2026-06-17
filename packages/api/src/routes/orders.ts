import { Router, type Request, type Response } from "express";
import { prisma } from "../db.js";
import { p } from "../middleware/params.js";

export const ordersRouter = Router();

ordersRouter.get("/products", async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json(products);
});

ordersRouter.post("/", async (req: Request, res: Response) => {
  const { galleryId, clientEmail, clientName, items } = req.body;

  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
  });
  if (!gallery) {
    res.status(404).json({ error: "NOT_FOUND", message: "Gallery not found", statusCode: 404 });
    return;
  }

  let totalMyr = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) {
      res.status(400).json({ error: "VALIDATION", message: `Product ${item.productId} not found`, statusCode: 400 });
      return;
    }
    totalMyr += Number(product.priceMyr) * item.quantity;
    orderItems.push({
      productId: product.id,
      photoId: item.photoId,
      quantity: item.quantity,
      priceMyr: product.priceMyr,
    });
  }

  const order = await prisma.order.create({
    data: {
      galleryId,
      clientEmail,
      clientName,
      totalMyr,
      items: { create: orderItems },
    },
    include: { items: true },
  });

  res.status(201).json(order);
});

ordersRouter.get("/:id", async (req: Request, res: Response) => {
  const id = p(req, "id");
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) {
    res.status(404).json({ error: "NOT_FOUND", message: "Order not found", statusCode: 404 });
    return;
  }
  res.json(order);
});
