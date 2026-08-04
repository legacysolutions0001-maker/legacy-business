import app from "./app";
import { logger } from "./lib/logger";
import { ensureSuperAdmin } from "./routes/seed";
import { runMigrations } from "@workspace/db/migrate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Run migrations then seed the super admin, then start the server.
// Both steps must succeed — if either fails we exit immediately so the
// process supervisor (or the developer) sees a clear error rather than a
// server that accepts connections but whose auth tables don't exist yet.
runMigrations()
  .then(() => {
    logger.info("Database migrations applied");
    return ensureSuperAdmin();
  })
  .then(() => {
    logger.info("Super admin verified");
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Startup failed — exiting");
    process.exit(1);
  });
