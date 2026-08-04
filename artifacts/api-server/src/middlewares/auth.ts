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
  // Cookie-only session: the token never leaves the server in a form
  // JavaScript can read, so there is no Bearer-header fallback to accept.
  const token = req.cookies?.lb_token;
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

/**
 * Resolve the effective company ID for the current request.
 *
 * - Regular users: always the companyId baked into their JWT.
 * - Super admin: may pass an `X-Company-Id` header to act on behalf of any
 *   company (e.g. when managing a tenant's billing or inventory directly).
 *   If no header is supplied the JWT value is used (which may be null).
 *
 * Prefer requireResolvedCompany middleware over calling this directly so that
 * the null-check and normalisation are done once, centrally.
 */
export function resolveCompanyId(req: Request): number | null {
  if (req.auth?.role === "super_admin") {
    const header = req.headers["x-company-id"];
    if (header) {
      const id = parseInt(header as string, 10);
      if (!isNaN(id) && id > 0) return id;
    }
  }
  return req.auth?.companyId ?? null;
}

/**
 * Drop-in replacement for requireAuth on all tenant-scoped routes.
 *
 * What it does:
 *  1. Verifies the JWT (via requireAuth).
 *  2. Resolves the effective companyId (JWT for regular users,
 *     X-Company-Id header for super_admin).
 *  3. Returns 403 immediately if no companyId can be resolved (super admin
 *     called without supplying X-Company-Id, or a fresh token with null
 *     companyId).
 *  4. Writes the resolved value back to req.auth.companyId so that every
 *     subsequent read of req.auth!.companyId in the handler body is safe
 *     and non-null — no per-handler null guard needed.
 */
export function requireResolvedCompany(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      res.status(403).json({
        error: "Company context required. Super admin must supply the X-Company-Id header.",
      });
      return;
    }
    // Normalise: patch the resolved value back so downstream code that reads
    // req.auth!.companyId directly (rather than calling resolveCompanyId)
    // also sees the correct tenant ID.
    req.auth!.companyId = companyId;
    next();
  });
}
