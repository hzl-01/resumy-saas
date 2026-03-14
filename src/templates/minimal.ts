import type { ResumeDocument } from "../domain/resume.ts";
import {
  renderCustomSections,
  renderDocument,
  renderEducationSection,
  renderExperienceSection,
  renderProjectsSection,
  renderResumeHeader,
  renderSkillsSectionPlain,
  renderSummarySection,
} from "../render/html.ts";
import {
  DEFAULT_SECTION_ORDER,
  type ResumeSectionKey,
  type ResumeTemplate,
  type ResumeTemplateRenderOptions,
} from "./template.ts";

const MINIMAL_CSS = `
  body.theme-minimal {
    --page-bg: #ffffff;
    --surface: #ffffff;
    --text: #111111;
    --text-soft: #333333;
    --muted: #666666;
    --accent: #111111;
    --section-title: #111111;
    --chip-bg: #f0f0f0;
    --chip-text: #333333;
    --page-padding: 0.82in 0.72in 0.68in;
    font-family: var(--resume-body-font, "Helvetica Neue", "Inter", "Segoe UI", Arial, sans-serif);
    padding: 24px;
  }

  .minimal-shell {
    padding: var(--page-padding);
  }

  .theme-minimal .resume-header {
    gap: 0.35rem;
    margin-bottom: 1.2rem;
  }

  .theme-minimal .resume-name {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Helvetica Neue", "Inter", "Segoe UI", Arial, sans-serif));
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 300;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .theme-minimal .resume-title {
    font-size: 0.92rem;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  .theme-minimal .contact-list {
    gap: 0.2rem 0.8rem;
    font-size: 0.88rem;
  }

  .theme-minimal .section-title {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Helvetica Neue", "Inter", "Segoe UI", Arial, sans-serif));
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 0.6rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .theme-minimal .resume-section + .resume-section {
    margin-top: 1rem;
  }

  .theme-minimal .entry + .entry {
    margin-top: 0.8rem;
  }

  .theme-minimal .entry-title {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Helvetica Neue", "Inter", "Segoe UI", Arial, sans-serif));
    font-size: 0.95rem;
    font-weight: 600;
  }

  .theme-minimal .entry-subtitle {
    font-size: 0.9rem;
    font-weight: 400;
  }

  .theme-minimal .entry-meta {
    font-size: 0.85rem;
  }

  .theme-minimal .entry-summary {
    margin-top: 0.3rem;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .theme-minimal .entry-tech {
    margin-top: 0.3rem;
    font-size: 0.85rem;
  }

  .theme-minimal .entry-list {
    margin-top: 0.3rem;
    gap: 0.15rem;
    line-height: 1.4;
    font-size: 0.9rem;
  }

  .theme-minimal .skill-stack {
    gap: 0.4rem;
  }

  .theme-minimal .skill-group {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }

  .theme-minimal .skill-group-title {
    font-size: 0.88rem;
    font-weight: 600;
    flex-shrink: 0;
    min-width: 5rem;
  }

  .theme-minimal .skill-group-items {
    margin: 0;
    font-size: 0.88rem;
    color: var(--text-soft);
    line-height: 1.4;
  }

  .theme-minimal .skills-section,
  .theme-minimal .education-section,
  .theme-minimal .custom-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  @media (max-width: 860px) {
    body.theme-minimal {
      padding: 12px;
    }

    .minimal-shell {
      padding: 1.1rem;
    }
  }

  @media print {
    body.theme-minimal {
      padding: 0;
      background: #ffffff;
    }

    .minimal-shell {
      padding: 0;
    }
  }
`;

export const minimalTemplate: ResumeTemplate = {
  id: "minimal",
  label: "Minimal",
  description: "Ultra-clean layout with maximum whitespace and no decorative elements.",
  render(resume: ResumeDocument, options?: ResumeTemplateRenderOptions): string {
    const order = options?.sectionOrder ?? DEFAULT_SECTION_ORDER;

    const sectionRenderers: Record<ResumeSectionKey, () => string> = {
      summary: () => renderSummarySection(resume.basics.summary),
      experience: () => renderExperienceSection(resume.experience),
      projects: () => renderProjectsSection(resume.projects),
      skills: () => renderSkillsSectionPlain(resume.skills),
      education: () => renderEducationSection(resume.education),
      custom: () => renderCustomSections(resume.customSections),
    };

    const renderedSections = order
      .map((key) => sectionRenderers[key]())
      .filter(Boolean)
      .join("\n");

    return renderDocument({
      pageTitle: `${resume.basics.name} | Resume`,
      bodyClass: "theme-minimal",
      css: [options?.fontFaceCss ?? "", renderMinimalTypographyCss(options), MINIMAL_CSS]
        .filter(Boolean)
        .join("\n"),
      content: `
        <main class="page minimal-shell">
          ${renderResumeHeader(resume)}
          ${renderedSections}
        </main>
      `,
    });
  },
};

function renderMinimalTypographyCss(options?: ResumeTemplateRenderOptions): string {
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
    declarations.push("--page-padding: 0.68in 0.62in 0.58in;");
  }

  if (declarations.length === 0) {
    return "";
  }

  return `
    body.theme-minimal {
      ${declarations.join("\n")}
    }
  `;
}
