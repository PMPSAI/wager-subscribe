import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApp } from "./app";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Create the HTTP server first so it can be passed to createApp.
  // This ensures Vite HMR WebSocket upgrades are attached to the same
  // server instance that is actually listening on the port.
  const { createServer: createHttpServer } = await import("http");
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Temporary placeholder so we can create the server before the app
  const server = createHttpServer();
  const app = await createApp(server);
  // Attach the express app as the request handler
  server.on("request", app);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
