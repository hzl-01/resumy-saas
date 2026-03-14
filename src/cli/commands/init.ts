import type { CAC } from "cac";
import { CliError } from "../errors.ts";
import { createStarterResume } from "../../domain/sample-resume.ts";
import { fileExists, writeUtf8File } from "../../io/files.ts";

interface InitOptions {
  force?: boolean;
}

export function registerInitCommand(cli: CAC): void {
  cli
    .command("init [output]", "Write a starter resume JSON file.")
    .option("-f, --force", "Overwrite the output file if it already exists.")
    .example((bin) => `${bin} init ./resume.json`)
    .action(async (output = "resume.json", options: InitOptions) => {
      await handleInit(output, options);
    });
}

async function handleInit(output: string, options: InitOptions): Promise<void> {
  if (fileExists(output) && !options.force) {
    throw new CliError(
      `Refusing to overwrite "${output}". Re-run with \`--force\` if you want to replace it.`,
    );
  }

  const starterDocument = createStarterResume();
  const contents = `${JSON.stringify(starterDocument, null, 2)}\n`;

  await writeUtf8File(output, contents);
  console.log(`Wrote starter resume data to ${output}`);
}
