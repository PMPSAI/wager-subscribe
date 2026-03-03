import type { Express } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";
import { createApp } from "./_core/app";

export const maxDuration = 30;

let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}

/** Detect Web Fetch Request (Vercel may invoke with a single Request). */
function isWebRequest(
  a: unknown,
  b: unknown
): a is Request {
  return (
    typeof a === "object" &&
    a !== null &&
    "url" in a &&
    "method" in a &&
    "headers" in a &&
    typeof (a as Request).url === "string" &&
    (b === undefined || b === null)
  );
}

/** Build Node-like headers object from Web Headers. */
function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

/** Convert Web Request to Node-like IncomingMessage and run Express; return Web Response. */
async function handleFetchRequest(request: Request): Promise<Response> {
  const app = await getApp();

  const url = request.url;
  const method = request.method;
  const headers = headersToObject(request.headers);

  let bodyStream: Readable;
  const contentType = request.headers.get("content-type") ?? "";
  if (request.body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    const buf = await request.arrayBuffer();
    bodyStream = new Readable();
    bodyStream.push(Buffer.from(buf));
    bodyStream.push(null);
  } else {
    bodyStream = new Readable();
    bodyStream.push(null);
  }

  const req = Object.assign(bodyStream, {
    url,
    method,
    headers,
    socket: { encrypted: url.startsWith("https") },
    connection: {},
  }) as IncomingMessage;

  return new Promise<Response>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const resHeaders: Record<string, string> = {};
    const setCookieValues: string[] = [];
    let statusCode = 200;

    const endResponse = (chunk?: Buffer | string, _enc?: string | (() => void), cb?: () => void): void => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      const headers = new Headers(resHeaders);
      setCookieValues.forEach((v) => headers.append("set-cookie", v));
      const response = new Response(body.length ? body : null, {
        status: statusCode,
        headers,
      });
      if (typeof _enc === "function") _enc();
      else if (cb) cb();
      resolve(response);
    };

    const res = {
      statusCode: 200,
      setHeader(name: string, value: string | number | string[]): void {
        resHeaders[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
      },
      getHeader(name: string): string | number | string[] | undefined {
        return resHeaders[name.toLowerCase()];
      },
      writeHead(code: number, h?: Record<string, string | number | string[]>): void {
        statusCode = code;
        if (h) Object.entries(h).forEach(([k, v]) => (res as any).setHeader(k, v));
      },
      write(chunk: Buffer | string, _enc?: string | ((err?: Error) => void), cb?: (err?: Error) => void): boolean {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        if (typeof _enc === "function") _enc();
        else if (cb) cb();
        return true;
      },
      end: endResponse,
      status(code: number): typeof res {
        statusCode = code;
        return res as any;
      },
      json(body: unknown): void {
        (res as any).setHeader("Content-Type", "application/json");
        endResponse(JSON.stringify(body));
      },
      send(body: string | Buffer | object): void {
        if (typeof body === "object" && !Buffer.isBuffer(body)) {
          (res as any).setHeader("Content-Type", "application/json");
          endResponse(JSON.stringify(body));
        } else {
          endResponse(typeof body === "string" ? body : Buffer.isBuffer(body) ? body : String(body));
        }
      },
      cookie(_name: string, _value: string, _options?: Record<string, unknown>): void {
        setCookieValues.push(`${_name}=${_value}`);
      },
      redirect(codeOrUrl: number | string, url?: string): void {
        const status = typeof codeOrUrl === "number" ? codeOrUrl : 302;
        const location = typeof codeOrUrl === "string" ? codeOrUrl : url ?? "";
        (res as any).setHeader("Location", location);
        statusCode = status;
        endResponse();
      },
      sendFile(_path: string, _options?: unknown, cb?: (err?: Error) => void): void {
        const fs = require("fs");
        try {
          const data = fs.readFileSync(_path);
          (res as any).setHeader("Content-Type", "text/html");
          endResponse(data);
        } catch (e) {
          statusCode = 500;
          endResponse(JSON.stringify({ error: "Failed to send file" }));
        }
        if (cb) cb();
      },
      on(_event: string, _handler: (...args: unknown[]) => void): void {},
      emit(_event: string, ..._args: unknown[]): boolean {
        return false;
      },
    } as unknown as ServerResponse;

    try {
      (app as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
    } catch (err) {
      console.error("[Vercel] Express invocation error:", err);
      reject(err);
    }
  });
}

/** Node-style handler (req, res) used when Vercel passes Node request/response. */
function handleNodeRequest(
  app: Express,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  return new Promise((resolve, reject) => {
    res.on("finish", () => resolve());
    res.on("error", reject);
    (app as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
  });
}

export default async function handler(
  reqOrRequest: IncomingMessage | Request,
  res?: ServerResponse
): Promise<void | Response> {
  try {
    const app = await getApp();

    // Vercel fetch-style: single Web Request → convert and return Response
    if (isWebRequest(reqOrRequest, res)) {
      return await handleFetchRequest(reqOrRequest);
    }

    // Node-style: (req, res)
    if (res) {
      return await handleNodeRequest(app, reqOrRequest as IncomingMessage, res);
    }

    // Fallback: res missing (wrong invocation) → return 500
    console.error("[Vercel] Handler called with missing res (expected Node req, res)");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Vercel] Handler error:", err);
    const body = JSON.stringify({
      error: "A server error has occurred",
      message: err instanceof Error ? err.message : String(err),
    });
    if (typeof res !== "undefined" && res && typeof res.writeHead === "function") {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(body);
      return;
    }
    return new Response(body, {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
