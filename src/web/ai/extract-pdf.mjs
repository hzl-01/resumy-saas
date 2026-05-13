import { readFileSync } from "fs";
import { PDFParse } from "pdf-parse";

const [inputPath] = process.argv.slice(2);

async function main() {
  const buffer = readFileSync(inputPath);
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText();
    process.stdout.write(data.text || "");
  } finally {
    await parser.destroy();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
