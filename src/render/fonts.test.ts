import { expect, test } from "bun:test";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEmbeddedFontCss } from "./fonts.ts";

test("buildEmbeddedFontCss embeds local font files as data URLs", async () => {
  const fontPath = join(tmpdir(), `resumy-font-${Date.now()}.woff2`);
  await writeFile(fontPath, "not-a-real-font-but-good-enough-for-css", "utf8");

  try {
    const css = await buildEmbeddedFontCss([
      {
        family: "Demo Font",
        path: fontPath,
        style: "normal",
        weight: "400",
      },
    ]);

    expect(css).toContain("@font-face");
    expect(css).toContain('font-family: "Demo Font"');
    expect(css).toContain("data:font/woff2;base64,");
  } finally {
    await rm(fontPath, { force: true });
  }
});
