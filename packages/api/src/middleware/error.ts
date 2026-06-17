import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    statusCode: 500,
  });
}
