import { resolve } from "node:path";
import type { ResumeFontFace } from "../cli/build-resume.ts";
import { CliError } from "../cli/errors.ts";

const FONT_FORMATS = {
  ".ttf": { mimeType: "font/ttf", format: "truetype" },
  ".otf": { mimeType: "font/otf", format: "opentype" },
  ".woff": { mimeType: "font/woff", format: "woff" },
  ".woff2": { mimeType: "font/woff2", format: "woff2" },
} as const;

export async function buildEmbeddedFontCss(
  fontFaces: ResumeFontFace[],
): Promise<string> {
  const blocks = await Promise.all(fontFaces.map((fontFace) => renderFontFace(fontFace)));
  return blocks.join("\n");
}

async function renderFontFace(fontFace: ResumeFontFace): Promise<string> {
  const absolutePath = resolve(fontFace.path);
  const extension = absolutePath.slice(absolutePath.lastIndexOf(".")).toLowerCase();
  const metadata = FONT_FORMATS[extension as keyof typeof FONT_FORMATS];

  if (!metadata) {
    throw new CliError(
      `Unsupported font file "${fontFace.path}". Use .ttf, .otf, .woff, or .woff2.`,
    );
  }

  const file = Bun.file(absolutePath);

  if (!(await file.exists())) {
    throw new CliError(`Font file not found: ${absolutePath}`);
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  return `
    @font-face {
      font-family: ${quoteCssString(fontFace.family)};
      src: url("data:${metadata.mimeType};base64,${base64}") format("${metadata.format}");
      font-style: ${fontFace.style};
      font-weight: ${fontFace.weight};
      font-display: swap;
    }
  `;
}

function quoteCssString(value: string): string {
  const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `"${escaped}"`;
}
