import { cac } from "cac";
import packageJson from "../../package.json" with { type: "json" };
import { formatCliError } from "./errors.ts";
import { registerGenerateCommand } from "./commands/generate.ts";
import { registerTemplatesCommand } from "./commands/templates.ts";
import { registerServeCommand } from "./commands/serve.ts";

const CLI_VERSION = packageJson.version;

export async function runCli(argv: string[]): Promise<void> {
  const cli = createCli();

  try {
    const parsed = cli.parse(argv, { run: false });

    if (cli.options.help || cli.options.version) {
      return;
    }

    if (parsed.args.length === 0 && !cli.matchedCommandName) {
      cli.outputHelp();
      return;
    }

    await cli.runMatchedCommand();
  } catch (error) {
    const formatted = formatCliError(error);
    console.error(`Error: ${formatted.message}`);
    process.exitCode = formatted.exitCode;
  }
}

function createCli() {
  const cli = cac("resumy");

  cli
    .usage("<command> [options]")
    .help()
    .version(CLI_VERSION)
    .example("resumy templates")
    .example(
      'resumy generate pdf --name "Jordan Lee" --title "Product Engineer" --experience "role=Senior Product Engineer;company=Northstar Labs" --experience-bullet "0|Built a design system" --output ./dist/resume.pdf',
    );

  registerGenerateCommand(cli);
  registerTemplatesCommand(cli);
  registerServeCommand(cli);

  return cli;
}
