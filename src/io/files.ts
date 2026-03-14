import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export async function readUtf8File(filePath: string): Promise<string> {
  return Bun.file(filePath).text();
}

export async function writeUtf8File(
  filePath: string,
  contents: string,
): Promise<void> {
  const resolvedPath = resolve(filePath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await Bun.write(resolvedPath, contents);
}

export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}
