import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import jwt from "jsonwebtoken";
import { initDb, type Database } from "../db/schema.ts";
import { insertUser } from "../db/schema.ts";
import { aiJobRoutes, type AiJobDeps } from "./handlers.ts";
import { AiClientError } from "./client.ts";

const SECRET = "ai-job-test-secret";
const createdDbs: string[] = [];

afterEach(() => {
  for (const path of createdDbs.splice(0)) {
    if (existsSync(path)) unlinkSync(path);
    if (existsSync(path + "-wal")) unlinkSync(path + "-wal");
    if (existsSync(path + "-shm")) unlinkSync(path + "-shm");
  }
});

function setupDb(name: string): Database {
  const path = `./${name}.db`;
  createdDbs.push(path);
  const db = initDb(path);
  insertUser(db, {
    id: "user-a",
    email: "a@test.com",
    password_hash: "hash",
    name: "User A",
    created_at: new Date().toISOString(),
  });
  insertUser(db, {
    id: "user-b",
    email: "b@test.com",
    password_hash: "hash",
    name: "User B",
    created_at: new Date().toISOString(),
  });
  return db;
}

function token(userId: string): string {
  return jwt.sign({ userId }, SECRET);
}

function authHeaders(userId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token(userId)}`,
  };
}

function deps(db: Database, createClient?: AiJobDeps["createClient"]): AiJobDeps {
  return { db, jwtSecret: SECRET, createClient };
}

describe("ai job handlers", () => {
  test("background-only import enters needs_input and asks for target_jd", async () => {
    const db = setupDb("ai-job-needs-input");
    const createRequest = new Request("http://local/api/ai/jobs/import", {
      method: "POST",
      headers: authHeaders("user-a"),
      body: JSON.stringify({ text: "candidate background" }),
    });

    const createResponse = await aiJobRoutes.import(createRequest, deps(db));
    expect(createResponse.status).toBe(202);
    const createData = await createResponse.json() as { job_id: string };

    const getRequest = new Request(`http://local/api/ai/jobs/${createData.job_id}`, {
      headers: authHeaders("user-a"),
    });
    const getResponse = await aiJobRoutes.get(getRequest, deps(db), createData.job_id);
    const getData = await getResponse.json() as { status: string; questions: Array<{ key: string }> };
    expect(getResponse.status).toBe(200);
    expect(getData.status).toBe("needs_input");
    expect(getData.questions[0]?.key).toBe("target_jd");

    db.close();
  });

  test("compose with background and JD persists sidecar failed status", async () => {
    const db = setupDb("ai-job-compose-failed");
    const createClient = () => ({
      intake: async () => ({ status: "failed" as const, error: { code: "not_implemented", message: "stub" } }),
      continue: async () => ({ status: "failed" as const, error: { code: "not_implemented", message: "stub" } }),
    });

    const createRequest = new Request("http://local/api/ai/jobs/compose", {
      method: "POST",
      headers: authHeaders("user-a"),
      body: JSON.stringify({ raw_material: "candidate background", jd_text: "Senior Backend Engineer JD" }),
    });

    const createResponse = await aiJobRoutes.compose(createRequest, deps(db, createClient));
    const createData = await createResponse.json() as { job_id: string };

    const getRequest = new Request(`http://local/api/ai/jobs/${createData.job_id}`, {
      headers: authHeaders("user-a"),
    });
    const getResponse = await aiJobRoutes.get(getRequest, deps(db, createClient), createData.job_id);
    const getData = await getResponse.json() as { status: string; error: { code: string } };
    expect(getData.status).toBe("failed");
    expect(getData.error.code).toBe("not_implemented");

    db.close();
  });

  test("answering target_jd moves needs_input job forward", async () => {
    const db = setupDb("ai-job-answer-flow");
    const createClient = () => ({
      intake: async () => ({ status: "failed" as const, error: { code: "not_implemented", message: "stub" } }),
      continue: async () => ({ status: "failed" as const, error: { code: "not_implemented", message: "stub" } }),
    });

    const createRequest = new Request("http://local/api/ai/jobs/import", {
      method: "POST",
      headers: authHeaders("user-a"),
      body: JSON.stringify({ text: "candidate background" }),
    });
    const createResponse = await aiJobRoutes.import(createRequest, deps(db, createClient));
    const createData = await createResponse.json() as { job_id: string };

    const answerRequest = new Request(`http://local/api/ai/jobs/${createData.job_id}/answers`, {
      method: "POST",
      headers: authHeaders("user-a"),
      body: JSON.stringify({ answers: [{ key: "target_jd", value: "Backend JD" }] }),
    });
    const answerResponse = await aiJobRoutes.answer(answerRequest, deps(db, createClient), createData.job_id);
    expect(answerResponse.status).toBe(202);

    const getRequest = new Request(`http://local/api/ai/jobs/${createData.job_id}`, {
      headers: authHeaders("user-a"),
    });
    const getResponse = await aiJobRoutes.get(getRequest, deps(db, createClient), createData.job_id);
    const getData = await getResponse.json() as { status: string; error: { code: string }; questions?: unknown[] };
    expect(getData.status).toBe("failed");
    expect(getData.error.code).toBe("not_implemented");
    expect(getData.questions).toBeUndefined();

    db.close();
  });

  test("answering failed job returns invalid_state", async () => {
    const db = setupDb("ai-job-invalid-state");
    const createClient = () => ({
      intake: async () => ({ status: "failed" as const, error: { code: "not_implemented", message: "stub" } }),
      continue: async () => ({ status: "failed" as const, error: { code: "not_implemented", message: "stub" } }),
    });

    const createRequest = new Request("http://local/api/ai/jobs/compose", {
      method: "POST",
      headers: authHeaders("user-a"),
      body: JSON.stringify({ raw_material: "candidate background", jd_text: "Backend JD" }),
    });
    const createResponse = await aiJobRoutes.compose(createRequest, deps(db, createClient));
    const createData = await createResponse.json() as { job_id: string };

    const answerRequest = new Request(`http://local/api/ai/jobs/${createData.job_id}/answers`, {
      method: "POST",
      headers: authHeaders("user-a"),
      body: JSON.stringify({ answers: [{ key: "target_jd", value: "Another JD" }] }),
    });
    const answerResponse = await aiJobRoutes.answer(answerRequest, deps(db, createClient), createData.job_id);
    expect(answerResponse.status).toBe(409);

    db.close();
  });

  test("job ownership is enforced", async () => {
    const db = setupDb("ai-job-ownership");
    const createRequest = new Request("http://local/api/ai/jobs/import", {
      method: "POST",
      headers: authHeaders("user-a"),
      body: JSON.stringify({ text: "candidate background" }),
    });
    const createResponse = await aiJobRoutes.import(createRequest, deps(db));
    const createData = await createResponse.json() as { job_id: string };

    const getRequest = new Request(`http://local/api/ai/jobs/${createData.job_id}`, {
      headers: authHeaders("user-b"),
    });
    const getResponse = await aiJobRoutes.get(getRequest, deps(db), createData.job_id);
    expect(getResponse.status).toBe(403);

    db.close();
  });

  test("sidecar network error is persisted as failed job", async () => {
    const db = setupDb("ai-job-network-error");
    const createClient = () => ({
      intake: async () => {
        throw new AiClientError("network_error", "unreachable", 0);
      },
      continue: async () => ({ status: "failed" as const, error: { code: "not_implemented", message: "stub" } }),
    });

    const createRequest = new Request("http://local/api/ai/jobs/compose", {
      method: "POST",
      headers: authHeaders("user-a"),
      body: JSON.stringify({ raw_material: "candidate background", jd_text: "Backend JD" }),
    });
    const createResponse = await aiJobRoutes.compose(createRequest, deps(db, createClient));
    const createData = await createResponse.json() as { job_id: string };

    const getRequest = new Request(`http://local/api/ai/jobs/${createData.job_id}`, {
      headers: authHeaders("user-a"),
    });
    const getResponse = await aiJobRoutes.get(getRequest, deps(db, createClient), createData.job_id);
    const getData = await getResponse.json() as { status: string; error: { code: string } };
    expect(getData.status).toBe("failed");
    expect(getData.error.code).toBe("network_error");

    db.close();
  });

  test("ready sidecar response creates a draft resume id", async () => {
    const db = setupDb("ai-job-ready-draft");
    const createClient = () => ({
      intake: async () => ({
        status: "ready" as const,
        resume_document: {
          basics: { name: "候选人", title: "Backend Engineer", links: [] },
          education: [],
          experience: [{ company: "待确认公司", role: "Backend Engineer", highlights: ["有后端经验"], technologies: [] }],
          projects: [],
          skills: [],
          customSections: [],
        },
        warnings: ["draft"],
      }),
      continue: async () => ({ status: "failed" as const, error: { code: "not_implemented", message: "stub" } }),
    });

    const createRequest = new Request("http://local/api/ai/jobs/compose", {
      method: "POST",
      headers: authHeaders("user-a"),
      body: JSON.stringify({ raw_material: "candidate background", jd_text: "Backend JD" }),
    });
    const createResponse = await aiJobRoutes.compose(createRequest, deps(db, createClient));
    const createData = await createResponse.json() as { job_id: string };

    const getRequest = new Request(`http://local/api/ai/jobs/${createData.job_id}`, {
      headers: authHeaders("user-a"),
    });
    const getResponse = await aiJobRoutes.get(getRequest, deps(db, createClient), createData.job_id);
    const getData = await getResponse.json() as { status: string; result: { draft_resume_id?: string } };
    expect(getData.status).toBe("ready");
    expect(typeof getData.result.draft_resume_id).toBe("string");

    db.close();
  });

  test("multipart import accepts uploaded txt file and creates ready draft", async () => {
    const db = setupDb("ai-job-multipart-import");
    const form = new FormData();
    form.append("file", new File(["candidate background from file"], "resume.txt", { type: "text/plain" }));
    form.append("jd_text", "Backend JD");

    const createRequest = new Request("http://local/api/ai/jobs/import", {
      method: "POST",
      headers: { Authorization: `Bearer ${token("user-a")}` },
      body: form,
    });

    const createResponse = await aiJobRoutes.import(createRequest, deps(db, () => ({
      intake: async () => ({
        status: "ready" as const,
        resume_document: {
          basics: { name: "候选人", title: "Backend Engineer", links: [] },
          education: [],
          experience: [{ company: "待确认公司", role: "Backend Engineer", highlights: ["来自上传文件"], technologies: [] }],
          projects: [],
          skills: [],
          customSections: [],
        },
      }),
      continue: async () => ({ status: "failed" as const, error: { code: "not_implemented", message: "stub" } }),
    })));
    const createData = await createResponse.json() as { job_id: string };

    const getRequest = new Request(`http://local/api/ai/jobs/${createData.job_id}`, {
      headers: authHeaders("user-a"),
    });
    const getResponse = await aiJobRoutes.get(getRequest, deps(db), createData.job_id);
    const getData = await getResponse.json() as { status: string; result: { draft_resume_id?: string } };
    expect(getData.status).toBe("ready");
    expect(typeof getData.result.draft_resume_id).toBe("string");

    db.close();
  });
});
