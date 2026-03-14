import type { CAC } from "cac";
import {
  buildPdfRenderRequest,
  type GeneratePdfOptions,
} from "../build-resume.ts";
import { CliError } from "../errors.ts";
import { renderPdf } from "../../output/pdf.ts";
import { buildEmbeddedFontCss } from "../../render/fonts.ts";
import { renderThemeCss } from "../../render/theme-css.ts";
import { getTemplate } from "../../templates/index.ts";
import { getTheme } from "../../themes/index.ts";

export function registerGenerateCommand(cli: CAC): void {
  cli
    .command("generate <format>", "Generate a resume in one of the supported output formats.")
    .option("-t, --template <template>", "Built-in resume layout to use.", {
      default: "professional",
    })
    .option("-o, --output <file>", "Where to write the generated PDF file.")
    .option("--html-output <file>", "Optional path to also write the rendered HTML.")
    .option("--page-size <size>", "PDF page size: letter or a4.", {
      default: "letter",
    })
    .option(
      "--density <value>",
      "Layout density preset: standard or compact.",
      { default: "standard" },
    )
    .option(
      "--theme <name>",
      "Color theme to apply. Built-in themes: default, minimal, warm, dark.",
      { default: "default" },
    )
    .option(
      "--theme-color <value>",
      "Accent color override applied on top of the selected theme.",
    )
    .option("--font-family <value>", "Body font family or CSS font-family stack.")
    .option(
      "--heading-font-family <value>",
      "Heading font family or CSS font-family stack.",
    )
    .option(
      "--font-face <spec>",
      'Embedded local font face using semicolon-separated key=value fields. Required keys: family, path. Optional keys: weight, style. Repeatable.',
    )
    .option("--name <value>", "Full name shown in the resume header.")
    .option("--title <value>", "Professional title shown below the name.")
    .option("--email <value>", "Email address.")
    .option("--phone <value>", "Phone number.")
    .option("--location <value>", "Location text, such as city or region.")
    .option("--website <value>", "Primary website or portfolio URL.")
    .option("--summary <value>", "Short summary paragraph.")
    .option("--link <label|url>", "Additional contact link. Repeatable.")
    .option(
      "--experience <spec>",
      'Experience entry using semicolon-separated key=value fields. Required keys: role, company. Optional keys: start, end, location, summary. Repeatable.',
    )
    .option(
      "--experience-bullet <index|text>",
      "Bullet point attached to an experience entry by zero-based index. Repeatable.",
    )
    .option(
      "--experience-tech <index|csv>",
      "Comma-separated tech stack attached to an experience entry by zero-based index. Repeatable.",
    )
    .option(
      "--project <spec>",
      'Project entry using semicolon-separated key=value fields. Required key: name. Optional keys: role, url, summary. Repeatable.',
    )
    .option(
      "--project-bullet <index|text>",
      "Bullet point attached to a project entry by zero-based index. Repeatable.",
    )
    .option(
      "--project-tech <index|csv>",
      "Comma-separated tech stack attached to a project entry by zero-based index. Repeatable.",
    )
    .option(
      "--education <spec>",
      'Education entry using semicolon-separated key=value fields. Required keys: institution, degree. Optional keys: start, end, location. Repeatable.',
    )
    .option(
      "--education-highlight <index|text>",
      "Highlight attached to an education entry by zero-based index. Repeatable.",
    )
    .option(
      "--skill-group <name|csv>",
      "Skill group with a label and comma-separated items. Repeatable.",
    )
    .option(
      "--extra <title|item>",
      "Extra resume item grouped under a custom section title. Repeatable.",
    )
    .option(
      "--section-order <csv>",
      "Comma-separated section order. Valid keys: summary, experience, projects, skills, education, custom. Default: summary,experience,projects,custom,skills,education.",
    )
    .example(
      (bin) =>
        `${bin} generate pdf --name "Jordan Lee" --title "Product Engineer" --theme-color "#0f766e" --font-family '"IBM Plex Sans", "Segoe UI", sans-serif' --experience "role=Senior Product Engineer;company=Northstar Labs;start=2022;end=Present;location=Remote" --experience-bullet "0|Built a design system" --skill-group "Languages|TypeScript, JavaScript, SQL" --output ./dist/resume.pdf`,
    )
    .example(
      (bin) =>
        `${bin} generate pdf --density compact --name "Jordan Lee" --title "Product Engineer" --experience "role=Senior Product Engineer;company=Northstar Labs" --experience-bullet "0|Built a design system" --skill-group "Languages|TypeScript, JavaScript, SQL" --output ./dist/resume-compact.pdf`,
    )
    .action(async (format: string, options: GeneratePdfOptions) => {
      await handleGenerate(format, options);
    });
}

export async function handleGenerate(
  format: string,
  options: GeneratePdfOptions,
): Promise<void> {
  const normalizedFormat = format.trim().toLowerCase();

  if (normalizedFormat !== "pdf") {
    throw new CliError(
      `Unsupported format "${format}". PDF is implemented first, so use \`resume-cli generate pdf ...\` for now.`,
    );
  }

  const request = buildPdfRenderRequest(options);
  const template = getTemplate(request.templateId);

  if (!template) {
    throw new CliError(
      `Unknown template "${request.templateId}". Run \`resume-cli templates\` to see the available built-in templates.`,
    );
  }

  const theme = getTheme(request.theme.themeId);

  if (!theme) {
    throw new CliError(
      `Unknown theme "${request.theme.themeId}". Built-in themes: default, minimal, warm, dark.`,
    );
  }

  const fontFaceCss = await buildEmbeddedFontCss(request.typography.fontFaces);
  const themeCss = renderThemeCss(theme, "theme-professional", request.theme.accentColor);
  const renderedHtml = template.render(request.document, {
    density: request.density,
    fontFaceCss,
    themeCss,
    bodyFontFamily: request.typography.bodyFontFamily,
    headingFontFamily: request.typography.headingFontFamily,
    sectionOrder: request.sectionOrder,
  });

  await renderPdf({
    html: renderedHtml,
    htmlOutput: request.htmlOutput,
    outputPath: request.output,
    pageSize: request.pageSize,
  });

  console.log(`Generated ${template.label} at ${request.output}`);
  if (request.htmlOutput) {
    console.log(`Also wrote debug HTML to ${request.htmlOutput}`);
  }
}
