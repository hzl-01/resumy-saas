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

const COMPACT_CSS = `
  body.theme-compact {
    --page-bg: #f0f1f3;
    --surface: #ffffff;
    --text: #111827;
    --text-soft: #374151;
    --muted: #6b7280;
    --accent: #7c3aed;
    --section-title: #4f46e5;
    --chip-bg: #eef2ff;
    --chip-text: #3730a3;
    padding: 1.25rem;
  }

  .compact-shell {
    padding: 2rem;
    border-radius: 20px;
    border: 1px solid rgba(79, 70, 229, 0.12);
    box-shadow:
      0 18px 48px rgba(17, 24, 39, 0.08),
      0 8px 18px rgba(17, 24, 39, 0.04);
  }

  .theme-compact .resume-header {
    gap: 0.5rem;
  }

  .compact-grid {
    display: grid;
    grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.6fr);
    gap: 2rem;
    margin-top: 1.75rem;
  }

  .compact-side,
  .compact-main {
    display: grid;
    gap: 1.75rem;
    align-content: start;
  }

  .theme-compact .resume-name {
    font-family:
      "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: clamp(2.2rem, 4vw, 3rem);
  }

  @media (max-width: 860px) {
    .compact-grid {
      grid-template-columns: 1fr;
    }

    .compact-shell {
      padding: 1.25rem;
    }
  }
`;

export const compactTemplate: ResumeTemplate = {
  id: "compact",
  label: "Compact Grid",
  description: "A dense grid layout optimized for concise one-page resumes.",
  outputExtension: "html",
  render(resume: ResumeDocument): string {
    const sideSections = [
      renderSummarySection(resume.basics.summary),
      renderSkillsSection(resume.skills),
      renderEducationSection(resume.education),
    ]
      .filter(Boolean)
      .join("\n");

    const mainSections = [
      renderExperienceSection(resume.experience),
      renderProjectsSection(resume.projects),
      renderCustomSections(resume.customSections),
    ]
      .filter(Boolean)
      .join("\n");

    return renderDocument({
      pageTitle: `${resume.basics.name} | Resume`,
      bodyClass: "theme-compact",
      css: COMPACT_CSS,
      content: `
        <main class="page compact-shell">
          ${renderResumeHeader(resume)}
          <section class="compact-grid">
            <aside class="compact-side">${sideSections}</aside>
            <div class="compact-main">${mainSections}</div>
          </section>
        </main>
      `,
    });
  },
};
