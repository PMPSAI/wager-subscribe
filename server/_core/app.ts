import express, { type Express } from "express";
import path from "path";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { registerOAuthRoutes } from "./oauth";
import { registerStripeWebhook } from "../webhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { serveStatic, setupVite } from "./vite";

/**
 * Creates the Express app (used by both standalone server and Vercel serverless).
 */
export async function createApp(): Promise<Express> {
  const app = express();
  const server = createServer(app);

  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
  registerStripeWebhook(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);

  if (process.env.NODE_ENV === "development") {
    app.get("/api/dev-login", async (req, res) => {
      const token = await sdk.createSessionToken("dev-dummy", {
        name: "Dev User",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    });
  }

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // On Vercel Build Output API v3, static files are at process.cwd()/public inside the function.
    const distPath = process.env.VERCEL
      ? path.join(process.cwd(), "public")
      : path.resolve(import.meta.dirname ?? __dirname, "public");
    app.use(express.static(distPath));
    app.get("*", (_req, res, next) => {
      const indexHtml = path.join(distPath, "index.html");
      res.sendFile(indexHtml, (err) => {
        if (err) {
          console.warn("[App] sendFile failed:", err.message);
          res.status(500).json({ error: "Static assets not found (check deployment)." });
        }
      });
    });
  }

  return app;
}
