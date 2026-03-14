import type { CAC } from "cac";
import { listTemplates } from "../../templates/index.ts";

export function registerTemplatesCommand(cli: CAC): void {
  cli
    .command("templates", "List the built-in resume layouts.")
    .example((bin) => `${bin} templates`)
    .action(() => {
      const templates = listTemplates();

      console.log("Built-in layouts:\n");

      for (const template of templates) {
        console.log(`${template.id.padEnd(10)} ${template.label}`);
        console.log(`  ${template.description}\n`);
      }
    });
}
