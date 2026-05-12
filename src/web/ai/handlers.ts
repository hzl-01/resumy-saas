import type { Database, AiJobRow } from "../db/schema.ts";
import {
  getAiJobById,
  getResumeById,
  insertResume,
  insertAiJob,
  insertAiJobMessage,
  updateAiJob,
} from "../db/schema.ts";
import { createAiClient, AiClientError, type AiClientOptions } from "./client.ts";
import { normalizeResumeDocument } from "../../schema/resume.ts";
import { extractUploadedIntake } from "./intake.ts";

export interface AiJobDeps {
  db: Database;
  jwtSecret: string;
  createClient?: (options?: AiClientOptions) => ReturnType<typeof createAiClient>;
}

interface AiJobQuestion {
  key: string;
  question: string;
  required: boolean;
}

interface AiJobError {
  code: string;
  message: string;
}

interface JobInputState {
  text?: string;
  notes?: string;
  source_resume_id?: string;
  jd_text?: string;
  target_role?: string;
  extra_answers?: Record<string, string>;
}

interface CreateJobBody {
  text?: string;
  notes?: string;
  source_resume_id?: string;
  raw_material?: string;
  jd_text?: string;
  target_role?: string;
}

interface MultipartImportInput {
  text?: string;
  jd_text?: string;
  target_role?: string;
  notes?: string;
  source_type: "text" | "pdf" | "docx";
}

interface AnswerBody {
  answers: Array<{ key: string; value: string }>;
}

interface AuthPayload {
  userId: string;
}

async function verifyToken(token: string, secret: string): Promise<AuthPayload | null> {
  try {
    const jwt = await import("jsonwebtoken");
    return jwt.default.verify(token, secret) as AuthPayload;
  } catch {
    return null;
  }
}

function getBearerUserId(request: Request, secret: string): Promise<string | null> {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return Promise.resolve(null);
  return verifyToken(auth.slice(7), secret).then((payload) => payload?.userId ?? null);
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

async function newId(): Promise<string> {
  const crypto = await import("crypto");
  return crypto.randomUUID();
}

function parseJson<T>(value: string | null): T | undefined {
  if (!value) return undefined;
  return JSON.parse(value) as T;
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

function buildTargetJdQuestion(): AiJobQuestion[] {
  return [
    {
      key: "target_jd",
      question: "请提供目标岗位 JD 或至少职位摘要、必备技能和职责。",
      required: true,
    },
  ];
}

function ensureJobInput(body: CreateJobBody): JobInputState {
  const text = body.text?.trim() || body.raw_material?.trim() || undefined;
  const notes = body.notes?.trim() || undefined;
  const sourceResumeId = body.source_resume_id?.trim() || undefined;
  const jdText = body.jd_text?.trim() || undefined;
  const targetRole = body.target_role?.trim() || undefined;

  if (!text && !sourceResumeId) {
    throw new Error("text or source_resume_id is required");
  }

  return {
    text,
    notes,
    source_resume_id: sourceResumeId,
    jd_text: jdText,
    target_role: targetRole,
  };
}

function mergeAnswers(state: JobInputState, answers: Array<{ key: string; value: string }>): JobInputState {
  const next: JobInputState = { ...state, extra_answers: { ...(state.extra_answers || {}) } };

  for (const answer of answers) {
    const value = answer.value.trim();
    if (answer.key === "target_jd") {
      next.jd_text = value || undefined;
      continue;
    }

    next.extra_answers![answer.key] = value;
  }

  if (Object.keys(next.extra_answers || {}).length === 0) {
    delete next.extra_answers;
  }

  return next;
}

async function persistMessage(db: Database, jobId: string, role: string, payload: unknown): Promise<void> {
  insertAiJobMessage(db, {
    id: await newId(),
    job_id: jobId,
    role,
    payload_json: stringify(payload),
    created_at: nowIso(),
  });
}

function toJobResponse(row: AiJobRow): Record<string, unknown> {
  const questions = parseJson<AiJobQuestion[]>(row.questions_json) || undefined;
  const error = parseJson<AiJobError>(row.error_json) || undefined;
  const warnings = parseJson<string[]>(row.warnings_json) || undefined;

  const response: Record<string, unknown> = {
    id: row.id,
    status: row.status,
  };

  if (questions && questions.length > 0) {
    response.questions = questions;
  }
  if (error) {
    response.error = error;
  }
  if (warnings && warnings.length > 0) {
    response.result = { warnings };
  }
  if (row.result_resume_id) {
    response.result = { ...(response.result as Record<string, unknown> | undefined), draft_resume_id: row.result_resume_id };
  }

  return response;
}

async function createDraftResume(db: Database, userId: string, document: Record<string, unknown>): Promise<string> {
  const normalized = normalizeResumeDocument(document) as unknown as Record<string, unknown>;
  const id = await newId();
  const now = nowIso();
  const basics = normalized.basics as { title?: string } | undefined;
  const title = basics?.title || "AI 草稿";
  insertResume(db, {
    id,
    user_id: userId,
    name: `AI 草稿 - ${title}`,
    data: stringify(normalized),
    created_at: now,
    updated_at: now,
  });
  return id;
}

async function requireOwnedJob(request: Request, deps: AiJobDeps, jobId: string): Promise<{ userId: string; job: AiJobRow } | Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  const job = getAiJobById(deps.db, jobId);
  if (!job) return json(404, { error: "not_found", message: "AI job not found" });
  if (job.user_id !== userId) return json(403, { error: "forbidden", message: "Access denied" });

  return { userId, job };
}

async function maybeValidateSourceResume(deps: AiJobDeps, userId: string, sourceResumeId: string | undefined): Promise<Response | null> {
  if (!sourceResumeId) return null;
  const resume = getResumeById(deps.db, sourceResumeId);
  if (!resume) return json(404, { error: "not_found", message: "Source resume not found" });
  if (resume.user_id !== userId) return json(403, { error: "forbidden", message: "Access denied" });
  return null;
}

async function createJob(
  request: Request,
  deps: AiJobDeps,
  kind: "import" | "compose",
): Promise<Response> {
  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  let body: CreateJobBody;
  try {
    body = (await request.json()) as CreateJobBody;
  } catch {
    return json(400, { error: "invalid_input", message: "Invalid JSON body" });
  }

  let input: JobInputState;
  try {
    input = ensureJobInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid input";
    return json(400, { error: "invalid_input", message });
  }

  const sourceResumeError = await maybeValidateSourceResume(deps, userId, input.source_resume_id);
  if (sourceResumeError) return sourceResumeError;

  const id = await newId();
  const now = nowIso();
  const row: AiJobRow = {
    id,
    user_id: userId,
    kind,
    status: "processing",
    source_type: input.source_resume_id ? "resume_id" : "text",
    source_ref: stringify(input),
    result_resume_id: null,
    warnings_json: null,
    questions_json: null,
    error_json: null,
    created_at: now,
    updated_at: now,
  };

  insertAiJob(deps.db, row);
  await persistMessage(deps.db, id, "user", { kind, background: input });

  if (!input.jd_text) {
    const questions = buildTargetJdQuestion();
    row.status = "needs_input";
    row.questions_json = stringify(questions);
    row.updated_at = nowIso();
    updateAiJob(deps.db, row);
    await persistMessage(deps.db, id, "assistant", { questions });
    return json(202, { job_id: id, status: "processing" });
  }

  await pushToSidecar(deps, row, input, "intake", []);
  return json(202, { job_id: id, status: "processing" });
}

async function createImportJob(request: Request, deps: AiJobDeps): Promise<Response> {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return createJob(request, deps, "import");
  }

  const userId = await getBearerUserId(request, deps.jwtSecret);
  if (!userId) return json(401, { error: "unauthorized", message: "Invalid or missing token" });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json(400, { error: "invalid_input", message: "Expected multipart/form-data" });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return json(400, { error: "invalid_input", message: "Missing file field" });
  }

  let uploaded: MultipartImportInput;
  try {
    const parsed = await extractUploadedIntake(file);
    uploaded = {
      text: parsed.text,
      source_type: parsed.sourceType,
      jd_text: String(formData.get("jd_text") || "").trim() || undefined,
      target_role: String(formData.get("target_role") || "").trim() || undefined,
      notes: String(formData.get("notes") || "").trim() || undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse uploaded file";
    return json(400, { error: "invalid_input", message });
  }

  const id = await newId();
  const now = nowIso();
  const input: JobInputState = {
    text: uploaded.text,
    notes: uploaded.notes,
    jd_text: uploaded.jd_text,
    target_role: uploaded.target_role,
  };
  const row: AiJobRow = {
    id,
    user_id: userId,
    kind: "import",
    status: "processing",
    source_type: uploaded.source_type,
    source_ref: stringify(input),
    result_resume_id: null,
    warnings_json: null,
    questions_json: null,
    error_json: null,
    created_at: now,
    updated_at: now,
  };

  insertAiJob(deps.db, row);
  await persistMessage(deps.db, id, "user", { kind: "import", background: input, uploaded_file: file.name });

  if (!input.jd_text) {
    const questions = buildTargetJdQuestion();
    row.status = "needs_input";
    row.questions_json = stringify(questions);
    row.updated_at = nowIso();
    updateAiJob(deps.db, row);
    await persistMessage(deps.db, id, "assistant", { questions });
    return json(202, { job_id: id, status: "processing" });
  }

  await pushToSidecar(deps, row, input, "intake", []);
  return json(202, { job_id: id, status: "processing" });
}

async function pushToSidecar(
  deps: AiJobDeps,
  row: AiJobRow,
  input: JobInputState,
  mode: "intake" | "continue",
  answers: Array<{ key: string; value: string }>,
): Promise<void> {
  const clientFactory = deps.createClient || createAiClient;

  try {
    const client = clientFactory();
    const result = mode === "intake"
      ? await client.intake({
        job_id: row.id,
        source: input.source_resume_id
          ? { type: "resume_id", resume_document: undefined }
          : { type: "text", text: input.text },
        mode: row.kind as "import" | "compose" | "tailor",
        context: {
          jd_text: input.jd_text,
          target_role: input.target_role,
          user_notes: input.notes,
        },
      })
      : await client.continue({ job_id: row.id, answers });

    row.questions_json = null;
    row.updated_at = nowIso();

    if (result.status === "ready" && result.resume_document) {
      row.status = "ready";
      row.result_resume_id = await createDraftResume(deps.db, row.user_id, result.resume_document);
      row.warnings_json = result.warnings ? stringify(result.warnings) : null;
      row.error_json = null;
      updateAiJob(deps.db, row);
      await persistMessage(deps.db, row.id, "assistant", { status: "ready", draft_resume_id: row.result_resume_id, warnings: result.warnings || [] });
      return;
    }

    row.status = result.status;
    row.warnings_json = result.warnings ? stringify(result.warnings) : null;
    row.error_json = result.error ? stringify(result.error) : null;
    updateAiJob(deps.db, row);
  } catch (error) {
    const normalized = error instanceof AiClientError
      ? { code: error.code, message: error.message }
      : { code: "request_failed", message: error instanceof Error ? error.message : "Unknown AI service error" };
    row.status = "failed";
    row.questions_json = null;
    row.error_json = stringify(normalized);
    row.updated_at = nowIso();
    updateAiJob(deps.db, row);
  }
}

async function handleGetJob(request: Request, deps: AiJobDeps, jobId: string): Promise<Response> {
  const owned = await requireOwnedJob(request, deps, jobId);
  if (owned instanceof Response) return owned;
  return json(200, toJobResponse(owned.job));
}

async function handleAnswerJob(request: Request, deps: AiJobDeps, jobId: string): Promise<Response> {
  const owned = await requireOwnedJob(request, deps, jobId);
  if (owned instanceof Response) return owned;

  const { job } = owned;
  if (job.status !== "needs_input") {
    return json(409, { error: "invalid_state", message: `Cannot answer job in status ${job.status}` });
  }

  let body: AnswerBody;
  try {
    body = (await request.json()) as AnswerBody;
  } catch {
    return json(400, { error: "invalid_input", message: "Invalid JSON body" });
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return json(400, { error: "invalid_input", message: "answers must be a non-empty array" });
  }

  const hasInvalidAnswer = body.answers.some((answer) => !answer.key || typeof answer.value !== "string");
  if (hasInvalidAnswer) {
    return json(400, { error: "invalid_input", message: "answers[*] must include key and string value" });
  }

  await persistMessage(deps.db, job.id, "user", { answers: body.answers });

  const currentInput = parseJson<JobInputState>(job.source_ref) || {};
  const nextInput = mergeAnswers(currentInput, body.answers);
  job.source_ref = stringify(nextInput);
  job.updated_at = nowIso();
  updateAiJob(deps.db, job);

  if (!nextInput.jd_text) {
    const questions = buildTargetJdQuestion();
    job.status = "needs_input";
    job.questions_json = stringify(questions);
    job.updated_at = nowIso();
    updateAiJob(deps.db, job);
    await persistMessage(deps.db, job.id, "assistant", { questions });
    return json(202, { job_id: job.id, status: "processing" });
  }

  await pushToSidecar(deps, job, nextInput, "intake", body.answers);
  return json(202, { job_id: job.id, status: "processing" });
}

export const aiJobRoutes = {
  import: createImportJob,
  compose: (request: Request, deps: AiJobDeps) => createJob(request, deps, "compose"),
  get: handleGetJob,
  answer: handleAnswerJob,
};
