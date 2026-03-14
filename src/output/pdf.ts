import { chromium } from "playwright";
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

  if (htmlOutput) {
    await writeUtf8File(htmlOutput, html);
  }

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
  } catch (bundledError) {
    try {
      browser = await chromium.launch({
        channel: "chrome",
        headless: true,
      });
    } catch {
      throw new CliError(
        "Unable to launch Chromium for PDF export. Install the browser with `bunx playwright install chromium`, or make sure Google Chrome is available locally.",
      );
    }
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: outputPath,
      format: pageSize === "a4" ? "A4" : "Letter",
      printBackground: true,
      margin: {
        top: "0.55in",
        right: "0.55in",
        bottom: "0.55in",
        left: "0.55in",
      },
    });
  } finally {
    await browser.close();
  }
}
