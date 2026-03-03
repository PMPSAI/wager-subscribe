import type { Express } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "./_core/app";

export const maxDuration = 30;

let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const app = await getApp();
  return new Promise((resolve, reject) => {
    res.on("finish", () => resolve());
    res.on("error", reject);
    (app as any)(req, res);
  });
}
