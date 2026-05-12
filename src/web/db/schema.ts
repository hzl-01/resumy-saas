import { Database } from "bun:sqlite";

export type { Database };

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export interface ResumeRow {
  id: string;
  user_id: string;
  name: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export interface AiJobRow {
  id: string;
  user_id: string;
  kind: string;
  status: string;
  source_type: string;
  source_ref: string | null;
  result_resume_id: string | null;
  warnings_json: string | null;
  questions_json: string | null;
  error_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiJobMessageRow {
  id: string;
  job_id: string;
  role: string;
  payload_json: string;
  created_at: string;
}

export function initDb(dbPath: string): Database {
  const db = new Database(dbPath);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_ref TEXT,
      result_resume_id TEXT REFERENCES resumes(id),
      warnings_json TEXT,
      questions_json TEXT,
      error_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_job_messages (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES ai_jobs(id),
      role TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run("PRAGMA journal_mode=WAL");
  return db;
}

export function findUserByEmail(db: Database, email: string): UserRow | null {
  return db.query("SELECT * FROM users WHERE email = ?").get(email) as UserRow | null;
}

export function findUserById(db: Database, id: string): UserRow | null {
  return db.query("SELECT * FROM users WHERE id = ?").get(id) as UserRow | null;
}

export function insertUser(
  db: Database,
  user: UserRow,
): void {
  db.run(
    "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)",
    [user.id, user.email, user.password_hash, user.name, user.created_at],
  );
}

export function insertResume(db: Database, row: ResumeRow): void {
  db.run(
    "INSERT INTO resumes (id, user_id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [row.id, row.user_id, row.name, row.data, row.created_at, row.updated_at],
  );
}

export function getResumesByUserId(db: Database, userId: string): ResumeRow[] {
  return db.query("SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as ResumeRow[];
}

export function getResumeById(db: Database, id: string): ResumeRow | null {
  return db.query("SELECT * FROM resumes WHERE id = ?").get(id) as ResumeRow | null;
}

export function updateResume(db: Database, id: string, name: string, data: string, updatedAt: string): void {
  db.run(
    "UPDATE resumes SET name = ?, data = ?, updated_at = ? WHERE id = ?",
    [name, data, updatedAt, id],
  );
}

export function deleteResume(db: Database, id: string): void {
  db.run("DELETE FROM resumes WHERE id = ?", [id]);
}

export function insertAiJob(db: Database, row: AiJobRow): void {
  db.run(
    `INSERT INTO ai_jobs (
      id, user_id, kind, status, source_type, source_ref,
      result_resume_id, warnings_json, questions_json, error_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.user_id,
      row.kind,
      row.status,
      row.source_type,
      row.source_ref,
      row.result_resume_id,
      row.warnings_json,
      row.questions_json,
      row.error_json,
      row.created_at,
      row.updated_at,
    ],
  );
}

export function getAiJobById(db: Database, id: string): AiJobRow | null {
  return db.query("SELECT * FROM ai_jobs WHERE id = ?").get(id) as AiJobRow | null;
}

export function getAiJobsByUserId(db: Database, userId: string): AiJobRow[] {
  return db.query("SELECT * FROM ai_jobs WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as AiJobRow[];
}

export function updateAiJob(db: Database, row: AiJobRow): void {
  db.run(
    `UPDATE ai_jobs SET
      status = ?,
      source_ref = ?,
      result_resume_id = ?,
      warnings_json = ?,
      questions_json = ?,
      error_json = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      row.status,
      row.source_ref,
      row.result_resume_id,
      row.warnings_json,
      row.questions_json,
      row.error_json,
      row.updated_at,
      row.id,
    ],
  );
}

export function insertAiJobMessage(db: Database, row: AiJobMessageRow): void {
  db.run(
    "INSERT INTO ai_job_messages (id, job_id, role, payload_json, created_at) VALUES (?, ?, ?, ?, ?)",
    [row.id, row.job_id, row.role, row.payload_json, row.created_at],
  );
}

export function getAiJobMessages(db: Database, jobId: string): AiJobMessageRow[] {
  return db.query("SELECT * FROM ai_job_messages WHERE job_id = ? ORDER BY created_at ASC").all(jobId) as AiJobMessageRow[];
}
