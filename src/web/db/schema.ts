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
