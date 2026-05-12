import { createAiClient } from "../src/web/ai/client.ts";

const baseUrl = process.env.AI_SERVICE_BASE_URL || "http://127.0.0.1:8081";

const health = await fetch(`${baseUrl}/healthz`);
if (!health.ok) {
  throw new Error(`Health check failed with status ${health.status}`);
}

const healthData = (await health.json()) as { status?: string };
if (healthData.status !== "ok") {
  throw new Error("Health check returned unexpected payload");
}

const client = createAiClient({ baseUrl });
const result = await client.intake({
  job_id: "smoke_job",
  source: { type: "text", text: "smoke test" },
  mode: "import",
  context: {},
});

if (result.status !== "ready") {
  throw new Error("Smoke test received unexpected intake response");
}

console.log("ai smoke ok");
