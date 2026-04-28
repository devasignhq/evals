import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth.js";
import { requestLogger } from "./middleware/logger.js";
import { evalsRouter } from "./routes/evals.js";
import { providersRouter } from "./routes/providers.js";
import { reposRouter } from "./routes/repos.js";
import { settingsRouter } from "./routes/settings.js";
import { triggerRouter } from "./routes/trigger.js";
import { webhooksRouter } from "./routes/webhooks.js";

const app = new Hono();

app.use("*", requestLogger);
app.use(
  "*",
  cors({
    origin:
      process.env.APP_ENV === "production"
        ? [process.env.FRONTEND_URL ?? ""]
        : "*",
    allowHeaders: ["Authorization", "Content-Type", "X-DevaSign-Signature"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: false,
  })
);

app.get("/health", (c) =>
  c.json({ status: "ok", env: process.env.APP_ENV ?? "development" })
);

// Webhook is unauthenticated (HMAC-signed instead)
app.route("/v1/webhooks", webhooksRouter);

// Authenticated routes
const authed = new Hono();
authed.use("*", authMiddleware);
authed.route("/v1/providers", providersRouter);
authed.route("/v1/evals/trigger", triggerRouter);
authed.route("/v1/evals", evalsRouter);
authed.route("/v1/repos", reposRouter);
authed.route("/v1/settings", settingsRouter);
app.route("/", authed);

const port = parseInt(process.env.PORT ?? "3001", 10);
// eslint-disable-next-line no-console
console.log(`devasign-eval backend listening on :${port}`);
serve({ fetch: app.fetch, port });

export default app;
