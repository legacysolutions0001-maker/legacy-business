import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL: SESSION_SECRET environment variable is not set.");
}

export interface AuthPayload {
  userId: number;
  username: string;
  role: string;
  companyId: number | null;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.lb_token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.auth = payload;
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "super_admin") {
      res.status(403).json({ error: "Super admin access required" });
      return;
    }
    next();
  });
}

export function requireCompany(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.auth?.companyId) {
      res.status(403).json({ error: "Company access required" });
      return;
    }
    next();
  });
}
