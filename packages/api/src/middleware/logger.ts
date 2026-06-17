import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, path } = req;

  _res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${method} ${path} ${_res.statusCode} ${duration}ms`);
  });

  next();
}
