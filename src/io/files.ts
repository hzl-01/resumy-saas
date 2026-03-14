import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export async function readUtf8File(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function writeUtf8File(
  filePath: string,
  contents: string,
): Promise<void> {
  const resolvedPath = resolve(filePath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, contents, "utf8");
}

export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}
