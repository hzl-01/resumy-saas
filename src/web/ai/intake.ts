async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value;
}

async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  const pdfModule = await import("pdf-parse") as unknown as { default?: (buffer: Buffer) => Promise<{ text: string }> };
  const parse = pdfModule.default;
  if (!parse) {
    throw new Error("pdf-parse is unavailable");
  }
  const data = await parse(Buffer.from(buffer));
  return data.text;
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
