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
import type { ResumeTemplate, ResumeTemplateRenderOptions } from "./template.ts";

const PROFESSIONAL_CSS = `
  body.theme-professional {
    --page-bg: #eef2f7;
    --surface: #ffffff;
    --text: #172033;
    --text-soft: #3b475d;
    --muted: #617088;
    --accent: #0b5fff;
    --section-title: #0f4bcc;
    --chip-bg: #edf3ff;
    --chip-text: #14357f;
    font-family: var(--resume-body-font, "Avenir Next", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif);
    padding: 24px;
  }

  .professional-shell {
    padding: 1.1in 0.9in 0.9in;
    box-shadow:
      0 20px 60px rgba(23, 32, 51, 0.08),
      0 10px 24px rgba(23, 32, 51, 0.05);
  }

  .theme-professional .resume-header {
    gap: 0.85rem;
    padding-bottom: 1.2rem;
    margin-bottom: 1.4rem;
    border-bottom: 2px solid rgba(11, 95, 255, 0.12);
  }

  .theme-professional .resume-title {
    font-size: 1.02rem;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .theme-professional .resume-name {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Avenir Next", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif));
    font-size: clamp(2.1rem, 4vw, 3.05rem);
    font-weight: 800;
  }

  .theme-professional .section-title {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Avenir Next", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif));
    margin-bottom: 0.72rem;
  }

  .theme-professional .resume-section + .resume-section {
    margin-top: 1.5rem;
  }

  .theme-professional .entry-list {
    margin-top: 0.55rem;
  }

  .theme-professional .entry-summary {
    font-size: 0.96rem;
  }

  .theme-professional .entry-title {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Avenir Next", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif));
    font-size: 1.01rem;
    font-weight: 700;
  }

  .theme-professional .entry-subtitle {
    font-weight: 600;
  }

  .theme-professional .skills-and-education {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.95fr);
    gap: 1.5rem;
  }

  .theme-professional .skills-and-education > * {
    min-width: 0;
  }

  @media (max-width: 860px) {
    body.theme-professional {
      padding: 12px;
    }

    .professional-shell {
      padding: 1.1rem;
    }

    .theme-professional .skills-and-education {
      grid-template-columns: 1fr;
      gap: 0;
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
    const primarySections = [
      renderSummarySection(resume.basics.summary),
      renderExperienceSection(resume.experience),
      renderProjectsSection(resume.projects),
      renderCustomSections(resume.customSections),
    ]
      .filter(Boolean)
      .join("\n");

    const secondarySections = [
      renderSkillsSection(resume.skills),
      renderEducationSection(resume.education),
    ]
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
          ${primarySections}
          ${
            secondarySections
              ? `<section class="skills-and-education">${secondarySections}</section>`
              : ""
          }
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

  if (declarations.length === 0) {
    return "";
  }

  return `
    body.theme-professional {
      ${declarations.join("\n")}
    }
  `;
}
