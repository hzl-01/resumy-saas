import { initDb, type Database } from "./db/schema.ts";
import { registerAuthRoutes, type AuthDependencies } from "./auth/handlers.ts";
import { resumeRoutes, type ResumeDeps } from "./resume/handlers.ts";
import { pdfRoutes, type PdfDeps } from "./pdf/handlers.ts";
import { aiJobRoutes, type AiJobDeps } from "./ai/handlers.ts";

const STATIC_DIR = import.meta.dir ? import.meta.dir + "/static" : "./src/web/static";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

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

      const aiJobResult = await handleAiJobRoute(method, url.pathname, request, deps);
      if (aiJobResult) return aiJobResult;

      const pdfResult = await handlePdfRoute(method, url.pathname, request, deps);
      if (pdfResult) return pdfResult;

      const resumeResult = await handleResumeRoute(method, url.pathname, request, deps);
      if (resumeResult) return resumeResult;

      const staticResult = await handleStaticRoute(url.pathname);
      if (staticResult) return staticResult;

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

async function handleAiJobRoute(
  method: string,
  pathname: string,
  request: Request,
  deps: AuthDependencies,
): Promise<Response | null> {
  const adeps: AiJobDeps = { db: deps.db, jwtSecret: deps.jwtSecret || "dev-secret" };

  if (pathname === "/api/ai/jobs/import" && method === "POST") {
    return aiJobRoutes.import(request, adeps);
  }
  if (pathname === "/api/ai/jobs/compose" && method === "POST") {
    return aiJobRoutes.compose(request, adeps);
  }

  const getMatch = pathname.match(/^\/api\/ai\/jobs\/([^\/]+)$/);
  if (getMatch && method === "GET") {
    return aiJobRoutes.get(request, adeps, getMatch[1]!);
  }

  const answerMatch = pathname.match(/^\/api\/ai\/jobs\/([^\/]+)\/answers$/);
  if (answerMatch && method === "POST") {
    return aiJobRoutes.answer(request, adeps, answerMatch[1]!);
  }

  return null;
}

async function handleResumeRoute(
  method: string,
  pathname: string,
  request: Request,
  deps: AuthDependencies,
): Promise<Response | null> {
  const rdeps: ResumeDeps = { db: deps.db, jwtSecret: deps.jwtSecret || "dev-secret" };

  if (pathname === "/api/resumes" && method === "GET") {
    return resumeRoutes.list(request, rdeps);
  }
  if (pathname === "/api/resumes" && method === "POST") {
    return resumeRoutes.create(request, rdeps);
  }
  if (pathname.startsWith("/api/resumes/") && method === "GET") {
    return resumeRoutes.get(request, rdeps, pathname.slice(13));
  }
  if (pathname.startsWith("/api/resumes/") && method === "PUT") {
    return resumeRoutes.update(request, rdeps, pathname.slice(13));
  }
  if (pathname.startsWith("/api/resumes/") && method === "DELETE") {
    return resumeRoutes.delete(request, rdeps, pathname.slice(13));
  }
  return null;
}

async function handlePdfRoute(
  method: string,
  pathname: string,
  request: Request,
  deps: AuthDependencies,
): Promise<Response | null> {
  const pdeps: PdfDeps = { db: deps.db, jwtSecret: deps.jwtSecret || "dev-secret" };

  const generateMatch = pathname.match(/^\/api\/resumes\/([^\/]+)\/generate$/);
  if (generateMatch && method === "POST") {
    return pdfRoutes.generate(request, pdeps, generateMatch[1]!);
  }

  const statusMatch = pathname.match(/^\/api\/resumes\/([^\/]+)\/generate\/([^\/]+)\/status$/);
  if (statusMatch && method === "GET") {
    return pdfRoutes.status(request, pdeps, statusMatch[1]!, statusMatch[2]!);
  }

  const downloadMatch = pathname.match(/^\/api\/resumes\/([^\/]+)\/generate\/([^\/]+)\/download$/);
  if (downloadMatch && method === "GET") {
    return pdfRoutes.download(request, pdeps, downloadMatch[1]!, downloadMatch[2]!);
  }

  return null;
}

async function handleStaticRoute(pathname: string): Promise<Response | null> {
  let relativePath: string;
  if (pathname === "/") {
    relativePath = "/index.html";
  } else if (pathname.startsWith("/static/")) {
    relativePath = pathname.slice(7);
  } else {
    return null;
  }

  const filePath = STATIC_DIR + relativePath;
  const file = Bun.file(filePath);
  const exists = await file.exists();
  if (!exists) return null;

  const ext = filePath.substring(filePath.lastIndexOf("."));
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  return new Response(file, {
    headers: { "Content-Type": contentType },
  });
}
