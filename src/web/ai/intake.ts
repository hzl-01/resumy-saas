async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value;
}

async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { writeFile, rm } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const crypto = await import("node:crypto");

  const tempPath = join(tmpdir(), `resumy-ai-pdf-${crypto.randomUUID()}.pdf`);
  await writeFile(tempPath, Buffer.from(buffer));

  try {
    const scriptPath = fileURLToPath(new URL("./extract-pdf.mjs", import.meta.url));
    const proc = Bun.spawn(["node", scriptPath, tempPath], {
      env: { ...process.env },
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(stderr.trim() || `pdf extraction failed (exit code ${exitCode})`);
    }
    return await new Response(proc.stdout).text();
  } finally {
    await rm(tempPath, { force: true });
  }
}

export interface UploadedIntake {
  text: string;
  sourceType: "text" | "pdf" | "docx";
  fileName?: string;
}

export async function extractUploadedIntake(file: File): Promise<UploadedIntake> {
  const fileName = file.name || "resume";
  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";

  if (ext === "txt") {
    return { text: await file.text(), sourceType: "text", fileName };
  }

  const buffer = await file.arrayBuffer();
  if (ext === "docx") {
    return { text: await parseDocx(buffer), sourceType: "docx", fileName };
  }
  if (ext === "pdf") {
    return { text: await parsePdf(buffer), sourceType: "pdf", fileName };
  }

  throw new Error(`Unsupported file type: .${ext}. Supported: .txt, .docx, .pdf`);
}
