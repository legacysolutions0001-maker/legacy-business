import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Replit's preview/production traffic always arrives through a proxy that
// sets X-Forwarded-For; trust exactly one hop so express-rate-limit (and
// req.ip generally) key on the real client IP instead of the proxy's.
app.set("trust proxy", 1);

// --- Rate limiters — each is a SEPARATE instance with its own counter ---
//
// BUG HISTORY: Previously all three paths shared one `sensitiveRouteLimiter`
// instance (30 req / 15 min). The super admin dashboard makes 5-10 API calls
// per page load, so after a few minutes of normal use the shared counter
// reached 30. That blocked /api/auth/login with a 429 — causing the
// "access denied" toast every time the super admin tried to log in until the
// 15-minute window reset.

// Login: strict brute-force protection — unauthenticated, high-value target.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

// Seed: dev-only bootstrap endpoints — small limit, unauthenticated.
const seedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many seed requests. Please try again later." },
});

// Super admin panel: all routes already require a valid super_admin JWT via
// requireSuperAdmin middleware, so the risk surface is low. A generous
// per-minute limit prevents accidental runaway loops while letting the
// dashboard work normally (each page load hits 5-10 endpoints).
const superApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth/login", loginLimiter);
app.use("/api/seed", seedLimiter);
app.use("/api/super", superApiLimiter);
app.use("/api", router);

export default app;
