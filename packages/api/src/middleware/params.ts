import type { Request } from "express";

export function p(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

export function q(req: Request, key: string): string | undefined {
  const val = req.query[key];
  if (Array.isArray(val)) return val[0] as string;
  if (typeof val === "string") return val;
  return undefined;
}

export function qn(req: Request, key: string): number | undefined {
  const val = q(req, key);
  if (val === undefined) return undefined;
  const n = parseInt(val, 10);
  return isNaN(n) ? undefined : n;
}
