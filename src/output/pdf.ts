import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CliError } from "../cli/errors.ts";
import { writeUtf8File } from "../io/files.ts";

interface RenderPdfOptions {
  html: string;
  htmlOutput?: string;
  outputPath: string;
  pageSize: "letter" | "a4";
}

export async function renderPdf(options: RenderPdfOptions): Promise<void> {
  const { html, htmlOutput, outputPath, pageSize } = options;

  const tempHtmlPath = htmlOutput || `${outputPath}.render.html`;

  await writeUtf8File(tempHtmlPath, html);

  const scriptPath = fileURLToPath(new URL("./generate-pdf.mjs", import.meta.url));
  const proc = Bun.spawn(["node", scriptPath, tempHtmlPath, outputPath, pageSize], {
    env: { ...process.env },
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new CliError(stderr.trim() || `PDF generation failed (exit code ${exitCode})`);
  }

  if (!htmlOutput) {
    try {
      await rm(tempHtmlPath, { force: true });
    } catch {
      /* ignore temp cleanup failures */
    }
  }
}
