import type { CAC } from "cac";
import { CliError } from "../errors.ts";
import { readUtf8File, writeUtf8File } from "../../io/files.ts";
import { parseResumeJson } from "../../schema/resume.ts";
import { getTemplate } from "../../templates/index.ts";

interface GenerateOptions {
  output?: string;
  stdout?: boolean;
  template?: string;
}

export function registerGenerateCommand(cli: CAC): void {
  cli
    .command("generate <input>", "Generate a resume HTML file from JSON input.")
    .option("-t, --template <template>", "Built-in template id to use.", {
      default: "classic",
    })
    .option("-o, --output <file>", "Where to write the rendered HTML file.")
    .option("--stdout", "Print the rendered HTML instead of writing a file.")
    .example((bin) => `${bin} generate ./resume.json --template modern --output ./dist/resume.html`)
    .action(async (input: string, options: GenerateOptions) => {
      await handleGenerate(input, options);
    });
}

export async function handleGenerate(
  input: string,
  options: GenerateOptions,
): Promise<void> {
  const templateId = options.template ?? "classic";
  const template = getTemplate(templateId);

  if (!template) {
    throw new CliError(
      `Unknown template "${templateId}". Run \`resume-cli templates\` to see the available built-in templates.`,
    );
  }

  const source = await readUtf8File(input);
  const resume = parseResumeJson(source);
  const rendered = template.render(resume);

  if (options.stdout) {
    console.log(rendered);
    return;
  }

  const outputPath = options.output ?? `resume.${template.id}.${template.outputExtension}`;
  await writeUtf8File(outputPath, rendered);
  console.log(`Generated ${template.label} resume at ${outputPath}`);
}
