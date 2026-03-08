/**
 * Email/Password Authentication
 * 
 * Handles merchant signup (A), login, and session management.
 * Passwords are hashed with bcryptjs.
 */
import { type Express } from "express";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import * as db from "./db";

export function registerAuthRoutes(app: Express) {
  /**
   * POST /api/auth/signup
   * Merchant/user signup with email, password, and profile fields.
   */
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone, address, role } = req.body as {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        address?: string;
        role?: "user" | "admin";
      };

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Check if user already exists
      const openId = `email:${email.toLowerCase()}`;
      const existing = await db.getUserByOpenId(openId);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      const name = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];

      // Create user
      await db.upsertUser({
        openId,
        name,
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        address,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // Get the created user to get the ID
      const user = await db.getUserByOpenId(openId);
      if (!user) {
        return res.status(500).json({ error: "Failed to create account" });
      }

      // If signing up as merchant, create merchant record
      if (role === "admin" || req.body.merchantName) {
        const merchantName = req.body.merchantName || name;
        const slug = (req.body.slug || merchantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).slice(0, 64);
        try {
          await db.createMerchant({
            userId: user.id,
            name: merchantName,
            slug: `${slug}-${Date.now().toString(36)}`,
            stripeMode: "test",
            isActive: true,
          });
        } catch (err) {
          console.warn("[Auth] Failed to create merchant record:", err);
        }
      }

      // Create session token
      const token = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { email: user.email, name: user.name, role: user.role } });
    } catch (err) {
      console.error("[Auth/signup] Error:", err);
      res.status(500).json({ error: "Signup failed. Please try again." });
    }
  });

  /**
   * POST /api/auth/login
   * Email/password login.
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body as { email: string; password: string };

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const openId = `email:${email.toLowerCase()}`;
      const user = await db.getUserByOpenId(openId);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update last signed in (also promotes to admin if openId matches OWNER_OPEN_ID)
      await db.upsertUser({
        openId,
        name: user.name ?? "",
        email: user.email ?? "",
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // Re-read user so the response reflects the latest role (e.g. admin promotion)
      const freshUser = (await db.getUserByOpenId(openId)) ?? user;

      const token = await sdk.createSessionToken(openId, {
        name: freshUser.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { email: freshUser.email, name: freshUser.name, role: freshUser.role } });
    } catch (err) {
      console.error("[Auth/login] Error:", err);
      res.status(500).json({ error: "Login failed. Please try again." });
    }
  });

  /**
   * GET /api/auth/methods
   * Returns available auth methods (already registered in app.ts, this is supplemental).
   */
}
