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
import type { ResumeTemplate } from "./template.ts";

const CLASSIC_CSS = `
  body.theme-classic {
    --page-bg: linear-gradient(180deg, #f5efe5 0%, #efe8dc 100%);
    --surface: #fffdf9;
    --text: #241b16;
    --text-soft: #443934;
    --muted: #73665d;
    --accent: #6d4a33;
    --section-title: #8f5d3a;
    --chip-bg: #efe1d2;
    --chip-text: #3d2b20;
  }

  .classic-shell {
    padding: 3rem;
    border: 1px solid rgba(109, 74, 51, 0.12);
    box-shadow:
      0 24px 70px rgba(60, 35, 20, 0.08),
      0 8px 24px rgba(60, 35, 20, 0.04);
  }

  .theme-classic .resume-header {
    padding-bottom: 1.6rem;
    border-bottom: 2px solid rgba(109, 74, 51, 0.12);
    margin-bottom: 1.6rem;
  }

  .theme-classic .resume-name,
  .theme-classic .section-title,
  .theme-classic .entry-title {
    font-family:
      "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Garamond, serif;
  }

  @media (max-width: 720px) {
    .classic-shell {
      padding: 1.4rem;
    }
  }
`;

export const classicTemplate: ResumeTemplate = {
  id: "classic",
  label: "Classic Editorial",
  description: "A polished single-column layout with warm serif accents.",
  outputExtension: "html",
  render(resume: ResumeDocument): string {
    const content = [
      renderResumeHeader(resume),
      renderSummarySection(resume.basics.summary),
      renderExperienceSection(resume.experience),
      renderProjectsSection(resume.projects),
      renderEducationSection(resume.education),
      renderSkillsSection(resume.skills),
      renderCustomSections(resume.customSections),
    ]
      .filter(Boolean)
      .join("\n");

    return renderDocument({
      pageTitle: `${resume.basics.name} | Resume`,
      bodyClass: "theme-classic",
      css: CLASSIC_CSS,
      content: `<main class="page classic-shell">${content}</main>`,
    });
  },
};
