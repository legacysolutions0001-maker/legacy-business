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

// Brute-force / abuse protection for the most sensitive endpoints: login,
// super-admin routes, and the dev-only demo data seeder.
const sensitiveRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
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

app.use("/api/auth/login", sensitiveRouteLimiter);
app.use("/api/seed", sensitiveRouteLimiter);
app.use("/api/super", sensitiveRouteLimiter);
app.use("/api", router);

export default app;
