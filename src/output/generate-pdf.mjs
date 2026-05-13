import { chromium } from "playwright";
import { readFileSync } from "fs";

const [htmlFile, outputPath, pageSize] = process.argv.slice(2);

async function main() {
  const html = readFileSync(htmlFile, "utf-8");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: outputPath,
      format: (pageSize || "letter") === "a4" ? "A4" : "Letter",
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("PDF generation failed:", error.message);
  process.exit(1);
});
