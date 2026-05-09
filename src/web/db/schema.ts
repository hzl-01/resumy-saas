import { Database } from "bun:sqlite";

export type { Database };

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
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
