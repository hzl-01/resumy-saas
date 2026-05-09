import type { CAC } from "cac";
import { startServer, type ServeOptions } from "../../web/server.ts";

function getEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export function registerServeCommand(cli: CAC): void {
  cli
    .command("serve", "Start the resume web server.")
    .option("--port <port>", "HTTP port (default 3000)")
    .option("--host <host>", "Listen address (default 0.0.0.0)")
    .option("--db <path>", "SQLite database file path")
    .option("--jwt-secret <secret>", "JWT signing secret")
    .example((bin) => `${bin} serve --port 3000`)
    .example((bin) => `${bin} serve --port 8080 --db ./data/resumy.db`)
    .action(async (options: Record<string, unknown>) => {
      const opts: ServeOptions = {
        port: Number(options.port ?? getEnv("PORT", "3000")),
        host: String(options.host ?? getEnv("HOST", "0.0.0.0")),
        dbPath: String(options.db ?? getEnv("RESUMY_DB", "./resumy.db")),
        jwtSecret: String(options.jwtSecret ?? getEnv("RESUMY_JWT_SECRET", "")),
      };

      await startServer(opts);
    });
}
