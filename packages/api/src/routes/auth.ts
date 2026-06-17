import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "VALIDATION", message: "Email and password required", statusCode: 400 });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid credentials", statusCode: 401 });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

authRouter.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "VALIDATION", message: "Email and password required", statusCode: 400 });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "CONFLICT", message: "User already exists", statusCode: 409 });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name },
  });

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ error: "NOT_FOUND", message: "User not found", statusCode: 404 });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name });
});
