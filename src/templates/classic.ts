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

const CLASSIC_CSS = `
  body.theme-classic {
    --page-bg: #f9f7f4;
    --surface: #ffffff;
    --text: #2c2c2c;
    --text-soft: #444444;
    --muted: #777777;
    --accent: #8b4513;
    --section-title: var(--accent);
    --chip-bg: #f5ede4;
    --chip-text: #5a3a1a;
    --page-padding: 0.72in 0.82in 0.68in;
    font-family: var(--resume-body-font, "Georgia", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif);
    padding: 24px;
  }

  .classic-shell {
    padding: var(--page-padding);
    box-shadow:
      0 12px 40px rgba(44, 44, 44, 0.06),
      0 4px 12px rgba(44, 44, 44, 0.04);
  }

  .theme-classic .resume-header {
    gap: 0.5rem;
    text-align: center;
    margin-bottom: 1rem;
    padding-bottom: 0.8rem;
    border-bottom: 2px solid var(--accent);
  }

  .theme-classic .contact-list {
    justify-content: center;
    gap: 0.25rem 1rem;
    font-size: 0.88rem;
  }

  .theme-classic .resume-name {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Georgia", "Palatino Linotype", "Book Antiqua", serif));
    font-size: clamp(2rem, 4vw, 2.8rem);
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .theme-classic .resume-title {
    font-size: 1rem;
    font-style: italic;
    font-weight: 400;
  }

  .theme-classic .classic-body {
    display: grid;
    grid-template-columns: 1fr 280px;
    column-gap: 2.4rem;
    align-items: start;
  }

  .theme-classic .classic-main {
    min-width: 0;
  }

  .theme-classic .classic-sidebar {
    min-width: 0;
    border-left: 1px solid #ddd;
    padding-left: 1.2rem;
  }

  .theme-classic .section-title {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Georgia", "Palatino Linotype", "Book Antiqua", serif));
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 0.55rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #ddd;
  }

  .theme-classic .classic-sidebar .section-title {
    border-bottom: none;
    padding-bottom: 0;
  }

  .theme-classic .resume-section + .resume-section {
    margin-top: 0.9rem;
  }

  .theme-classic .entry + .entry {
    margin-top: 0.7rem;
  }

  .theme-classic .entry-title {
    font-family: var(--resume-heading-font, var(--resume-body-font, "Georgia", "Palatino Linotype", "Book Antiqua", serif));
    font-size: 0.98rem;
    font-weight: 700;
  }

  .theme-classic .entry-subtitle {
    font-style: italic;
    font-weight: 400;
    font-size: 0.92rem;
  }

  .theme-classic .entry-meta {
    font-size: 0.86rem;
    font-style: italic;
  }

  .theme-classic .entry-summary {
    margin-top: 0.35rem;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .theme-classic .entry-tech {
    margin-top: 0.35rem;
    font-size: 0.86rem;
  }

  .theme-classic .entry-list {
    margin-top: 0.3rem;
    gap: 0.18rem;
    line-height: 1.4;
    font-size: 0.92rem;
  }

  .theme-classic .skill-stack {
    gap: 0.55rem;
  }

  .theme-classic .skill-group {
    gap: 0.25rem;
  }

  .theme-classic .skill-group-title {
    font-size: 0.88rem;
    font-weight: 700;
    font-style: italic;
  }

  .theme-classic .chip-list {
    gap: 0.25rem;
  }

  .theme-classic .chip {
    min-height: 1.4rem;
    padding: 0.1rem 0.5rem;
    font-size: 0.78rem;
    border-radius: 3px;
  }

  .theme-classic .classic-sidebar .entry-header {
    flex-direction: column;
    gap: 0;
  }

  .theme-classic .classic-sidebar .entry-meta {
    text-align: left;
    font-size: 0.82rem;
  }

  .theme-classic .skills-section,
  .theme-classic .education-section,
  .theme-classic .custom-section,
  .theme-classic .skill-group,
  .theme-classic .chip-list {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  @media (max-width: 860px) {
    body.theme-classic {
      padding: 12px;
    }

    .classic-shell {
      padding: 1.1rem;
    }

    .theme-classic .classic-body {
      grid-template-columns: 1fr;
    }

    .theme-classic .classic-sidebar {
      padding-left: 0;
      border-left: none;
      padding-top: 0.8rem;
      border-top: 1px solid #ddd;
    }
  }

  @media print {
    body.theme-classic {
      padding: 0;
      background: #ffffff;
    }

    .classic-shell {
      padding: 0;
      box-shadow: none;
    }

    .theme-classic .classic-body {
      display: grid;
      grid-template-columns: 1fr 260px;
    }
  }
`;

export const classicTemplate: ResumeTemplate = {
  id: "classic",
  label: "Classic",
  description: "Two-column layout with sidebar, serif typography, and traditional styling.",
  render(resume: ResumeDocument, options?: ResumeTemplateRenderOptions): string {
    const order = options?.sectionOrder ?? DEFAULT_SECTION_ORDER;

    const mainKeys = new Set<ResumeSectionKey>(["summary", "experience", "projects", "custom"]);
    const sidebarKeys = new Set<ResumeSectionKey>(["skills", "education"]);

    const sectionRenderers: Record<ResumeSectionKey, () => string> = {
      summary: () => renderSummarySection(resume.basics.summary),
      experience: () => renderExperienceSection(resume.experience),
      projects: () => renderProjectsSection(resume.projects),
      skills: () => renderSkillsSection(resume.skills),
      education: () => renderEducationSection(resume.education),
      custom: () => renderCustomSections(resume.customSections),
    };

    const mainSections = order
      .filter((key) => mainKeys.has(key))
      .map((key) => sectionRenderers[key]())
      .filter(Boolean)
      .join("\n");

    const sidebarSections = order
      .filter((key) => sidebarKeys.has(key))
      .map((key) => sectionRenderers[key]())
      .filter(Boolean)
      .join("\n");

    return renderDocument({
      pageTitle: `${resume.basics.name} | Resume`,
      bodyClass: "theme-classic",
      css: [options?.fontFaceCss ?? "", renderClassicTypographyCss(options), CLASSIC_CSS]
        .filter(Boolean)
        .join("\n"),
      content: `
        <main class="page classic-shell">
          ${renderResumeHeader(resume)}
          <div class="classic-body">
            <div class="classic-main">
              ${mainSections}
            </div>
            ${sidebarSections ? `<aside class="classic-sidebar">${sidebarSections}</aside>` : ""}
          </div>
        </main>
      `,
    });
  },
};

function renderClassicTypographyCss(options?: ResumeTemplateRenderOptions): string {
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
    declarations.push("--page-padding: 0.6in 0.68in 0.56in;");
  }

  if (declarations.length === 0) {
    return "";
  }

  return `
    body.theme-classic {
      ${declarations.join("\n")}
    }
  `;
}
