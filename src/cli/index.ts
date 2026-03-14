import { cac } from "cac";
import { formatCliError } from "./errors.ts";
import { registerGenerateCommand } from "./commands/generate.ts";
import { registerInitCommand } from "./commands/init.ts";
import { registerTemplatesCommand } from "./commands/templates.ts";

const CLI_VERSION = "0.1.0";

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
  const cli = cac("resume-cli");

  cli
    .usage("<command> [options]")
    .help()
    .version(CLI_VERSION)
    .example("resume-cli init ./resume.json")
    .example("resume-cli templates")
    .example(
      "resume-cli generate ./resume.json --template modern --output ./dist/resume.html",
    );

  registerGenerateCommand(cli);
  registerTemplatesCommand(cli);
  registerInitCommand(cli);

  return cli;
}
