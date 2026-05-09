import { describe, expect, test } from "bun:test";

const BASE = "http://localhost:3099";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function tryFetch(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(`${BASE}${path}`, init);
  } catch {
    return null;
  }
}

describe("auth API integration", () => {
  const registeredUser = { email: "", password: "123456", name: "API Test", token: "" };

  test("register creates user and returns token", async () => {
    const res = await tryFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "api@test.com", password: "123456", name: "API Test" }),
    });
    if (!res) return;
    expect(res.status).toBe(201);
    const data: Json = await res.json();
    expect(data.user.email).toBe("api@test.com");
    expect(data.user.name).toBe("API Test");
    expect(data.token).toBeTruthy();
    registeredUser.token = data.token;
  });

  test("login returns token", async () => {
    const res = await tryFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "api@test.com", password: "123456" }),
    });
    if (!res) return;
    expect(res.status).toBe(200);
    const data: Json = await res.json();
    expect(data.user.email).toBe("api@test.com");
    expect(data.token).toBeTruthy();
  });

  test("/me returns user info with valid token", async () => {
    if (!registeredUser.token) return;
    const res = await tryFetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${registeredUser.token}` },
    });
    if (!res) return;
    expect(res.status).toBe(200);
    const data: Json = await res.json();
    expect(data.user.email).toBe("api@test.com");
  });

  test("rejects duplicate registration", async () => {
    const res = await tryFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "api@test.com", password: "654321", name: "Dup" }),
    });
    if (!res) return;
    expect(res.status).toBe(400);
    const data: Json = await res.json();
    expect(data.error).toBe("email_exists");
  });

  test("rejects wrong password", async () => {
    const res = await tryFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "api@test.com", password: "wrong" }),
    });
    if (!res) return;
    expect(res.status).toBe(401);
    const data: Json = await res.json();
    expect(data.error).toBe("invalid_credentials");
  });

  test("rejects missing auth header on /me", async () => {
    const res = await tryFetch("/api/auth/me");
    if (!res) return;
    expect(res.status).toBe(401);
    const data: Json = await res.json();
    expect(data.error).toBe("unauthorized");
  });

  test("rejects invalid token on /me", async () => {
    const res = await tryFetch("/api/auth/me", {
      headers: { Authorization: "Bearer badtoken" },
    });
    if (!res) return;
    expect(res.status).toBe(401);
    const data: Json = await res.json();
    expect(data.error).toBe("unauthorized");
  });
});
