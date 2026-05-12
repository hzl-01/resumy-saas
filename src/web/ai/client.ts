export interface IntakeRequest {
  job_id: string;
  source: {
    type: "pdf" | "docx" | "text" | "resume_id";
    file_path?: string;
    text?: string;
    resume_document?: Record<string, unknown>;
  };
  mode: "import" | "compose" | "tailor";
  context: {
    jd_text?: string;
    target_role?: string;
    user_notes?: string;
  };
}

export interface ContinueRequest {
  job_id: string;
  answers: Array<{ key: string; value: string }>;
}

export interface AiServiceResponse {
  status: "ready" | "failed";
  resume_document?: Record<string, unknown>;
  warnings?: string[];
  error?: {
    code: string;
    message: string;
  };
}

export interface AiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export class AiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AiClientError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_BASE_URL = "http://127.0.0.1:8081";
const DEFAULT_TIMEOUT_MS = 5000;

export function createAiClient(options: AiClientOptions = {}) {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  return {
    intake(request: IntakeRequest): Promise<AiServiceResponse> {
      return postJson(`${baseUrl}/internal/ai/intake`, request, timeoutMs);
    },
    continue(request: ContinueRequest): Promise<AiServiceResponse> {
      return postJson(`${baseUrl}/internal/ai/continue`, request, timeoutMs);
    },
  };
}

async function postJson(url: string, body: unknown, timeoutMs: number): Promise<AiServiceResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new AiClientError("invalid_response", "AI service returned non-JSON response", response.status);
    }

    if (!response.ok) {
      const payload = data as { error?: string; message?: string };
      throw new AiClientError(payload.error || "request_failed", payload.message || "AI service request failed", response.status);
    }

    return parseStubResponse(data);
  } catch (error) {
    if (error instanceof AiClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiClientError("timeout", `AI service request timed out after ${timeoutMs}ms`, 0);
    }
    const message = error instanceof Error ? error.message : "Unknown AI service error";
    throw new AiClientError("network_error", message, 0);
  } finally {
    clearTimeout(timer);
  }
}

function parseStubResponse(data: unknown): AiServiceResponse {
  if (!data || typeof data !== "object") {
    throw new AiClientError("invalid_response", "AI service returned invalid response payload", 200);
  }

  const payload = data as {
    status?: unknown;
    error?: { code?: unknown; message?: unknown };
  };

  if (payload.status === "ready") {
    return {
      status: "ready",
      resume_document: typeof (payload as { resume_document?: unknown }).resume_document === "object"
        ? (payload as { resume_document?: Record<string, unknown> }).resume_document
        : undefined,
      warnings: Array.isArray((payload as { warnings?: unknown }).warnings)
        ? (payload as { warnings?: string[] }).warnings
        : undefined,
    };
  }

  if (payload.status === "failed") {
    if (!payload.error || typeof payload.error !== "object") {
      throw new AiClientError("invalid_response", "AI service returned missing error payload", 200);
    }

    if (typeof payload.error.code !== "string" || typeof payload.error.message !== "string") {
      throw new AiClientError("invalid_response", "AI service returned malformed error payload", 200);
    }

    return {
      status: "failed",
      error: {
        code: payload.error.code,
        message: payload.error.message,
      },
    };
  }

  throw new AiClientError("invalid_response", "AI service returned unexpected status", 200);
}
