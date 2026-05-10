import type { Database } from "../db/schema.ts";
import { getResumeById, getResumesByUserId, insertResume, updateResume, deleteResume } from "../db/schema.ts";
import { normalizeResumeDocument } from "../../schema/resume.ts";

export interface ResumeDeps {
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

async function handleList(request: Request, deps: ResumeDeps): Promise<Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });
  const rows = getResumesByUserId(deps.db, userId);
  return json(200, {
    resumes: rows.map((r) => ({ id: r.id, name: r.name, updated_at: r.updated_at })),
  });
}

async function handleCreate(request: Request, deps: ResumeDeps): Promise<Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid_input", message: "Invalid JSON body" });
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Untitled Resume";
  let data: Record<string, unknown>;
  try {
    data = body.data as Record<string, unknown>;
    data = normalizeResumeDocument(data) as unknown as Record<string, unknown>;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid resume data";
    return json(400, { error: "invalid_input", message: msg });
  }

  const crypto = await import("crypto");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const dataStr = JSON.stringify(data);

  insertResume(deps.db, { id, user_id: userId, name, data: dataStr, created_at: now, updated_at: now });
  return json(201, { resume: { id, name, data, updated_at: now } });
}

async function handleGet(request: Request, deps: ResumeDeps, id: string): Promise<Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  const row = getResumeById(deps.db, id);
  if (!row) return json(404, { error: "not_found", message: "Resume not found" });
  if (row.user_id !== userId) return json(403, { error: "forbidden", message: "Access denied" });

  return json(200, { resume: { id: row.id, name: row.name, data: JSON.parse(row.data), updated_at: row.updated_at } });
}

async function handleUpdate(request: Request, deps: ResumeDeps, id: string): Promise<Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  const row = getResumeById(deps.db, id);
  if (!row) return json(404, { error: "not_found", message: "Resume not found" });
  if (row.user_id !== userId) return json(403, { error: "forbidden", message: "Access denied" });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid_input", message: "Invalid JSON body" });
  }

  let name = row.name;
  let dataObj: Record<string, unknown> = JSON.parse(row.data);

  if (typeof body.name === "string" && body.name.trim()) name = body.name.trim();
  if (body.data !== undefined) {
    try {
      dataObj = body.data as Record<string, unknown>;
      dataObj = normalizeResumeDocument(dataObj) as unknown as Record<string, unknown>;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid resume data";
      return json(400, { error: "invalid_input", message: msg });
    }
  }

  const now = new Date().toISOString();
  updateResume(deps.db, id, name, JSON.stringify(dataObj), now);
  return json(200, { resume: { id, name, data: dataObj, updated_at: now } });
}

async function handleDelete(request: Request, deps: ResumeDeps, id: string): Promise<Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  const row = getResumeById(deps.db, id);
  if (!row) return json(404, { error: "not_found", message: "Resume not found" });
  if (row.user_id !== userId) return json(403, { error: "forbidden", message: "Access denied" });

  deleteResume(deps.db, id);
  return new Response(null, { status: 204 });
}

export const resumeRoutes = {
  list: handleList,
  create: handleCreate,
  get: handleGet,
  update: handleUpdate,
  delete: handleDelete,
};
