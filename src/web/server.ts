import { initDb, type Database } from "./db/schema.ts";
import { registerAuthRoutes, type AuthDependencies } from "./auth/handlers.ts";

export interface ServeOptions {
  port: number;
  host: string;
  dbPath: string;
  jwtSecret: string;
}

export async function startServer(options: ServeOptions): Promise<void> {
  const { port, host, dbPath, jwtSecret } = options;

  const db = initDb(dbPath);
  const deps: AuthDependencies = { db, jwtSecret };

  const server = Bun.serve({
    port,
    hostname: host,
    async fetch(request) {
      const url = new URL(request.url);
      const method = request.method;

      const authResult = await handleAuthRoute(method, url.pathname, request, deps);
      if (authResult) return authResult;

      return new Response("Not Found", { status: 404 });
    },
  });

  const effectiveSecret = jwtSecret || "(auto-generated)";
  console.log(`resumy server running on http://${host}:${port}`);
  console.log(`  Database: ${dbPath}`);
  console.log(`  JWT secret: ${effectiveSecret}`);

  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    server.stop();
    process.exit(0);
  });
}

async function handleAuthRoute(
  method: string,
  pathname: string,
  request: Request,
  deps: AuthDependencies,
): Promise<Response | null> {
  if (pathname === "/api/auth/register" && method === "POST") {
    return registerAuthRoutes.register(request, deps);
  }
  if (pathname === "/api/auth/login" && method === "POST") {
    return registerAuthRoutes.login(request, deps);
  }
  if (pathname === "/api/auth/me" && method === "GET") {
    return registerAuthRoutes.me(request, deps);
  }
  return null;
}
