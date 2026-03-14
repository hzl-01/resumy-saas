import type { ResumeDocument } from "../domain/resume.ts";
import {
  renderCustomSections,
  renderDocument,
  renderEducationSection,
  renderExperienceSection,
  renderProjectsSection,
  renderResumeHeader,
  renderSkillsSection,
  renderSummarySection,
} from "../render/html.ts";
import {
  DEFAULT_SECTION_ORDER,
  type ResumeSectionKey,
  type ResumeTemplate,
  type ResumeTemplateRenderOptions,
} from "./template.ts";

const PROFESSIONAL_CSS = `
  body.theme-professional {
    --page-bg: #eef2f7;
    --surface: #ffffff;
    --text: #172033;
    --text-soft: #3b475d;
    --muted: #617088;
    --accent: #0b5fff;
    --section-title: color-mix(in srgb, var(--accent) 82%, #0f172a);
    --chip-bg: color-mix(in srgb, var(--accent) 10%, white);
    --chip-text: color-mix(in srgb, var(--accent) 68%, #0f172a);
    --page-padding: 0.88in 0.74in 0.72in;
    --header-gap: 0.62rem;
    --header-padding-bottom: 0.68rem;
    --header-margin-bottom: 0.78rem;
    --title-size: 0.96rem;
    --name-size: clamp(1.95rem, 3.4vw, 2.7rem);
    --section-title-gap: 0.5rem;
    --section-spacing: 0.92rem;
    --entry-spacing: 0.72rem;
    --summary-margin-top: 0.42rem;
    --summary-line-height: 1.42;
    --entry-tech-margin-top: 0.42rem;
    --entry-list-margin-top: 0.28rem;
    --entry-list-gap: 0.2rem;
    --entry-list-line-height: 1.34;
    --summary-size: 0.93rem;
    --entry-title-size: 0.98rem;
    --contact-font-size: 0.92rem;
    --contact-gap: 0.28rem 0.62rem;
    --chip-gap: 0.36rem;
    --chip-min-height: 1.58rem;
    --chip-padding: 0.12rem 0.58rem;
    --chip-font-size: 0.82rem;
    --skill-stack-gap: 0.48rem;
    --skill-group-gap: 0.2rem;
    font-family: var(--resume-body-font, "Avenir Next", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif);
    padding: 24px;
  }

  .professional-shell {
    padding: var(--page-padding);
    box-shadow:
      0 20px 60px rgba(23, 32, 51, 0.08),
      0 10px 24px rgba(23, 32, 51, 0.05);
  }

  .theme-professional .resume-header {
    gap: var(--header-gap);
    padding-bottom: var(--header-padding-bottom);
    margin-bottom: var(--header-margin-bottom);
    border-bottom: 2px solid color-mix(in srgb, var(--accent) 14%, white);
  }

  .theme-professional .contact-list {
    gap: var(--contact-gap);
    font-size: var(--contact-font-size);
  }

  .theme-professional .resume-title {
    font-size: var(--title-size);
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .theme-professional .resume-name {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Avenir Next", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif));
    font-size: var(--name-size);
    font-weight: 800;
  }

  .theme-professional .section-title {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Avenir Next", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif));
    margin-bottom: var(--section-title-gap);
  }

  .theme-professional .resume-section + .resume-section {
    margin-top: var(--section-spacing);
  }

  .theme-professional .entry + .entry {
    margin-top: var(--entry-spacing);
  }

  .theme-professional .entry-list {
    margin-top: var(--entry-list-margin-top);
    gap: var(--entry-list-gap);
    line-height: var(--entry-list-line-height);
  }

  .theme-professional .entry-summary {
    margin-top: var(--summary-margin-top);
    font-size: var(--summary-size);
    line-height: var(--summary-line-height);
  }

  .theme-professional .entry-title {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Avenir Next", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif));
    font-size: var(--entry-title-size);
    font-weight: 700;
  }

  .theme-professional .entry-subtitle {
    font-weight: 600;
  }

  .theme-professional .entry-tech {
    margin-top: var(--entry-tech-margin-top);
  }

  .theme-professional .skills-section,
  .theme-professional .education-section,
  .theme-professional .custom-section,
  .theme-professional .skill-group,
  .theme-professional .chip-list {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .theme-professional .chip-list {
    gap: var(--chip-gap);
  }

  .theme-professional .chip {
    min-height: var(--chip-min-height);
    padding: var(--chip-padding);
    font-size: var(--chip-font-size);
  }

  .theme-professional .skill-stack {
    gap: var(--skill-stack-gap);
  }

  .theme-professional .skill-group {
    gap: var(--skill-group-gap);
  }

  @media (max-width: 860px) {
    body.theme-professional {
      padding: 12px;
    }

    .professional-shell {
      padding: 1.1rem;
    }
  }

  @media print {
    body.theme-professional {
      padding: 0;
      background: #ffffff;
    }

    .professional-shell {
      padding: 0;
      box-shadow: none;
    }
  }
`;

export const professionalTemplate: ResumeTemplate = {
  id: "professional",
  label: "Professional PDF",
  description: "A single-column, print-first resume layout optimized for PDF export.",
  render(resume: ResumeDocument, options?: ResumeTemplateRenderOptions): string {
    const order = options?.sectionOrder ?? DEFAULT_SECTION_ORDER;

    const sectionRenderers: Record<ResumeSectionKey, () => string> = {
      summary: () => renderSummarySection(resume.basics.summary),
      experience: () => renderExperienceSection(resume.experience),
      projects: () => renderProjectsSection(resume.projects),
      skills: () => renderSkillsSection(resume.skills),
      education: () => renderEducationSection(resume.education),
      custom: () => renderCustomSections(resume.customSections),
    };

    const renderedSections = order
      .map((key) => sectionRenderers[key]())
      .filter(Boolean)
      .join("\n");

    return renderDocument({
      pageTitle: `${resume.basics.name} | Resume`,
      bodyClass: "theme-professional",
      css: [options?.fontFaceCss ?? "", renderTypographyCss(options), PROFESSIONAL_CSS]
        .filter(Boolean)
        .join("\n"),
      content: `
        <main class="page professional-shell">
          ${renderResumeHeader(resume)}
          ${renderedSections}
        </main>
      `,
    });
  },
};

function renderTypographyCss(options?: ResumeTemplateRenderOptions): string {
  const declarations: string[] = [];

  if (options?.bodyFontFamily) {
    declarations.push(`--resume-body-font: ${options.bodyFontFamily};`);
  }

  if (options?.headingFontFamily) {
    declarations.push(`--resume-heading-font: ${options.headingFontFamily};`);
  }

  if (options?.accentColor) {
    declarations.push(`--accent: ${options.accentColor};`);
  }

  if (options?.density === "compact") {
    declarations.push("--header-gap: 0.5rem;");
    declarations.push("--header-padding-bottom: 0.52rem;");
    declarations.push("--header-margin-bottom: 0.58rem;");
    declarations.push("--section-title-gap: 0.32rem;");
    declarations.push("--section-spacing: 0.68rem;");
    declarations.push("--entry-spacing: 0.48rem;");
    declarations.push("--summary-margin-top: 0.22rem;");
    declarations.push("--summary-line-height: 1.26;");
    declarations.push("--entry-tech-margin-top: 0.24rem;");
    declarations.push("--entry-list-margin-top: 0.18rem;");
    declarations.push("--entry-list-gap: 0.08rem;");
    declarations.push("--entry-list-line-height: 1.18;");
    declarations.push("--summary-size: 0.91rem;");
    declarations.push("--contact-font-size: 0.88rem;");
    declarations.push("--contact-gap: 0.18rem 0.48rem;");
    declarations.push("--chip-gap: 0.22rem;");
    declarations.push("--chip-min-height: 1.3rem;");
    declarations.push("--chip-padding: 0.05rem 0.4rem;");
    declarations.push("--chip-font-size: 0.74rem;");
    declarations.push("--skill-stack-gap: 0.3rem;");
    declarations.push("--skill-group-gap: 0.12rem;");
  }

  if (declarations.length === 0) {
    return "";
  }

  return `
    body.theme-professional {
      ${declarations.join("\n")}
    }
  `;
}
