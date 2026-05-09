import type { Database } from "../db/schema.ts";

export interface AuthDependencies {
  db: Database;
  jwtSecret: string;
}

async function handleRegister(request: Request, deps: AuthDependencies): Promise<Response> {
  const { db, jwtSecret } = deps;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: "invalid_input", message: "Invalid JSON body" });
  }

  const { email, password, name } = body as { email?: string; password?: string; name?: string };

  if (!email || !password || !name) {
    return jsonResponse(400, { error: "invalid_input", message: "email, password, and name are required" });
  }

  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
    return jsonResponse(400, { error: "invalid_input", message: "Fields must be strings" });
  }

  const existing = findUserByEmail(db, email);
  if (existing) {
    return jsonResponse(400, { error: "email_exists", message: "An account with this email already exists" });
  }

  const bcrypt = await import("bcryptjs");
  const crypto = await import("crypto");
  const jwt = await import("jsonwebtoken");

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  insertUser(db, { id, email, password_hash: passwordHash, name, created_at: createdAt });

  const secret = jwtSecret || "dev-secret";
  const token = jwt.default.sign({ userId: id, email }, secret, { expiresIn: "7d" });

  return jsonResponse(201, {
    user: { id, email, name },
    token,
  });
}

async function handleLogin(request: Request, deps: AuthDependencies): Promise<Response> {
  const { db, jwtSecret } = deps;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: "invalid_input", message: "Invalid JSON body" });
  }

  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return jsonResponse(400, { error: "invalid_input", message: "email and password are required" });
  }

  const user = findUserByEmail(db, email);
  if (!user) {
    return jsonResponse(401, { error: "invalid_credentials", message: "Invalid email or password" });
  }

  const bcrypt = await import("bcryptjs");
  const jwt = await import("jsonwebtoken");

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return jsonResponse(401, { error: "invalid_credentials", message: "Invalid email or password" });
  }

  const secret = jwtSecret || "dev-secret";
  const token = jwt.default.sign({ userId: user.id, email: user.email }, secret, { expiresIn: "7d" });

  return jsonResponse(200, {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
}

async function handleMe(request: Request, deps: AuthDependencies): Promise<Response> {
  const { db, jwtSecret } = deps;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse(401, { error: "unauthorized", message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);
  const jwt = await import("jsonwebtoken");

  let payload: { userId: string };
  try {
    payload = jwt.default.verify(token, jwtSecret || "dev-secret") as { userId: string };
  } catch {
    return jsonResponse(401, { error: "unauthorized", message: "Invalid or expired token" });
  }

  const user = findUserById(db, payload.userId);
  if (!user) {
    return jsonResponse(401, { error: "unauthorized", message: "User not found" });
  }

  return jsonResponse(200, {
    user: { id: user.id, email: user.email, name: user.name },
  });
}

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

import { findUserByEmail, findUserById, insertUser } from "../db/schema.ts";

export const registerAuthRoutes = {
  register: handleRegister,
  login: handleLogin,
  me: handleMe,
};
