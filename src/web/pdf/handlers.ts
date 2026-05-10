import type { Database } from "../db/schema.ts";
import { getResumeById } from "../db/schema.ts";
import { getTemplate } from "../../templates/index.ts";
import { buildEmbeddedFontCss } from "../../render/fonts.ts";
import type { ResumeSectionKey } from "../../templates/template.ts";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

interface PdfJob {
  status: "processing" | "ready" | "failed";
  resumeId: string;
  userId: string;
  pdfPath?: string;
  error?: string;
  createdAt: number;
  templateId: string;
}

const jobs = new Map<string, PdfJob>();
const TEMP_DIR = mkdtempSync(join(tmpdir(), "resumy-pdf-"));

function cleanupOldJobs(): void {
  const cutoff = Date.now() - 3600000;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) {
      if (job.pdfPath) {
        try { rmSync(job.pdfPath, { force: true }); } catch { /* ignore */ }
      }
      jobs.delete(id);
    }
  }
}

setInterval(cleanupOldJobs, 300000).unref();

export interface PdfDeps {
  db: Database;
  jwtSecret: string;
}

async function verifyToken(token: string, secret: string): Promise<{ userId: string } | null> {
  try {
    const jwt = await import("jsonwebtoken");
    return jwt.default.verify(token, secret) as { userId: string };
  } catch {
    return null;
  }
}

function getBearerUserId(request: Request, secret: string): Promise<string | null> {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return Promise.resolve(null);
  return verifyToken(auth.slice(7), secret).then((p) => p?.userId ?? null);
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getUserResume(deps: PdfDeps, resumeId: string, userId: string) {
  const row = getResumeById(deps.db, resumeId);
  if (!row) return json(404, { error: "not_found", message: "Resume not found" });
  if (row.user_id !== userId) return json(403, { error: "forbidden", message: "Access denied" });
  return { id: row.id, name: row.name, data: JSON.parse(row.data) };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
  ]);
}

async function handleGenerate(request: Request, deps: PdfDeps, resumeId: string): Promise<Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  const result = await getUserResume(deps, resumeId, userId);
  if (result instanceof Response) return result;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid_input", message: "Invalid JSON body" });
  }

  const templateId = typeof body.template_id === "string" && body.template_id ? body.template_id : "professional";
  const template = getTemplate(templateId);
  if (!template) {
    return json(400, { error: "invalid_input", message: `Unknown template "${templateId}". Available: professional, minimal, classic` });
  }
  const density = (typeof body.density === "string" && ["standard", "compact"].includes(body.density))
    ? body.density as "standard" | "compact" : "standard";
  const pageSize = (typeof body.page_size === "string" && ["letter", "a4"].includes(body.page_size))
    ? body.page_size as "letter" | "a4" : "letter";
  const accentColor = typeof body.accent_color === "string" && body.accent_color ? body.accent_color : undefined;

  const jobId = randomUUID();

  jobs.set(jobId, {
    status: "processing", resumeId, userId, createdAt: Date.now(), templateId,
  });

  const pdfBaseName = `resume-${resumeId}-${jobId}.pdf`;
  const outputPath = join(TEMP_DIR, pdfBaseName);
  const htmlDir = join(TEMP_DIR, "html");
  mkdirSync(htmlDir, { recursive: true });
  const htmlPath = join(htmlDir, `${jobId}.html`);

  withTimeout(
    doGeneratePdf(result.data, templateId, density, pageSize, accentColor, outputPath, htmlPath),
    60000,
  ).then(() => {
    const job = jobs.get(jobId);
    if (job) { job.status = "ready"; job.pdfPath = outputPath; }
    try { rmSync(htmlPath, { force: true }); } catch { /* ignore */ }
  }).catch((e: Error) => {
    const job = jobs.get(jobId);
    if (job) { job.status = "failed"; job.error = e.message; }
    try { rmSync(htmlPath, { force: true }); } catch { /* ignore */ }
  });

  return json(202, { job_id: jobId, status: "processing" });
}

async function doGeneratePdf(
  document: Record<string, unknown>,
  templateId: string,
  density: "standard" | "compact",
  pageSize: "letter" | "a4",
  accentColor: string | undefined,
  outputPath: string,
  htmlPath: string,
): Promise<void> {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Unknown template: ${templateId}`);

  const fontFaceCss = await buildEmbeddedFontCss([]);
  const sectionOrder: ResumeSectionKey[] = ["summary", "experience", "projects", "custom", "skills", "education"];

  const renderedHtml = template.render(document as never, {
    density, fontFaceCss, accentColor, language: "en", sectionOrder,
  });

  // Write HTML to temp file for Node.js subprocess
  writeFileSync(htmlPath, renderedHtml, "utf-8");

  // Spawn Node.js to run Playwright (Bun can't run Playwright directly)
  const scriptPath = join(import.meta.dir!, "generate-pdf.mjs");

  const proc = Bun.spawn(["node", scriptPath, htmlPath, outputPath, pageSize], {
    env: { ...process.env },
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(stderr.trim() || `PDF generation failed (exit code ${exitCode})`);
  }
}

async function handleStatus(request: Request, deps: PdfDeps, resumeId: string, jobId: string): Promise<Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  const result = await getUserResume(deps, resumeId, userId);
  if (result instanceof Response) return result;

  const job = jobs.get(jobId);
  if (!job || job.resumeId !== resumeId) return json(404, { error: "not_found", message: "Job not found" });

  if (job.status === "ready") {
    return json(200, { status: "ready", download_url: `/api/resumes/${resumeId}/generate/${jobId}/download` });
  }
  if (job.status === "failed") {
    return json(200, { status: "failed", error: job.error });
  }
  return json(200, { status: "processing" });
}

async function handleDownload(request: Request, deps: PdfDeps, resumeId: string, jobId: string): Promise<Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  const result = await getUserResume(deps, resumeId, userId);
  if (result instanceof Response) return result;

  const job = jobs.get(jobId);
  if (!job || job.resumeId !== resumeId) return json(404, { error: "not_found", message: "Job not found" });
  if (job.status !== "ready" || !job.pdfPath) return json(400, { error: "not_ready", message: "PDF not ready" });

  const file = Bun.file(job.pdfPath);
  const exists = await file.exists();
  if (!exists) return json(404, { error: "not_found", message: "PDF file not found" });

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${job.templateId}-resume.pdf"`,
    },
  });
}

export const pdfRoutes = {
  generate: handleGenerate,
  status: handleStatus,
  download: handleDownload,
};
