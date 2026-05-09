import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { initDb, insertUser, findUserByEmail, findUserById } from "../db/schema.ts";
import { unlinkSync, existsSync } from "node:fs";

const TEST_DB = "./test-auth.db";

let db: Database;

beforeAll(() => {
  db = initDb(TEST_DB);
});

afterAll(() => {
  db.close();
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  if (existsSync(TEST_DB + "-wal")) unlinkSync(TEST_DB + "-wal");
  if (existsSync(TEST_DB + "-shm")) unlinkSync(TEST_DB + "-shm");
});

describe("database CRUD", () => {
  test("creates and finds user by email", () => {
    const user = {
      id: "test-id-1",
      email: "find@test.com",
      password_hash: "hash",
      name: "Find Test",
      created_at: new Date().toISOString(),
    };
    insertUser(db, user);

    const found = findUserByEmail(db, "find@test.com");
    expect(found).not.toBeNull();
    expect(found!.email).toBe("find@test.com");
    expect(found!.name).toBe("Find Test");
    expect(found!.password_hash).toBe("hash");
  });

  test("creates and finds user by id", () => {
    const user = {
      id: "test-id-2",
      email: "findbyid@test.com",
      password_hash: "hash2",
      name: "ID Test",
      created_at: new Date().toISOString(),
    };
    insertUser(db, user);

    const found = findUserById(db, "test-id-2");
    expect(found).not.toBeNull();
    expect(found!.email).toBe("findbyid@test.com");
    expect(found!.name).toBe("ID Test");
  });

  test("returns null for non-existent email", () => {
    const found = findUserByEmail(db, "nonexistent@test.com");
    expect(found).toBeNull();
  });

  test("returns null for non-existent id", () => {
    const found = findUserById(db, "no-such-id");
    expect(found).toBeNull();
  });
});
