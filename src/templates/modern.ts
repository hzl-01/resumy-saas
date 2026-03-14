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

const MODERN_CSS = `
  body.theme-modern {
    --page-bg: #ece7df;
    --surface: #fffdfa;
    --text: #172126;
    --text-soft: #31434b;
    --muted: #5f7079;
    --accent: #0f6b68;
    --section-title: #0f6b68;
    --chip-bg: #e2efee;
    --chip-text: #0f4745;
    padding: 2rem;
  }

  .modern-shell {
    overflow: hidden;
    border-radius: 28px;
    box-shadow:
      0 28px 80px rgba(15, 39, 45, 0.12),
      0 10px 24px rgba(15, 39, 45, 0.06);
  }

  .modern-banner {
    padding: 3rem 3rem 2.3rem;
    background:
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.45), transparent 30%),
      linear-gradient(135deg, #104d5d 0%, #0f6b68 48%, #3c8d72 100%);
    color: #f5fbfb;
  }

  .theme-modern .modern-banner a,
  .theme-modern .modern-banner .resume-title,
  .theme-modern .modern-banner .contact-list {
    color: rgba(245, 251, 251, 0.92);
  }

  .theme-modern .modern-banner .resume-header {
    margin: 0;
  }

  .theme-modern .modern-banner .section-title {
    color: rgba(245, 251, 251, 0.8);
  }

  .modern-content {
    display: grid;
    grid-template-columns: minmax(0, 2.15fr) minmax(260px, 0.95fr);
  }

  .modern-main {
    padding: 2.4rem 2.6rem 2.8rem;
  }

  .modern-aside {
    padding: 2.4rem 2rem 2.8rem;
    background: #f4f0ea;
    border-left: 1px solid rgba(15, 107, 104, 0.1);
  }

  .theme-modern .modern-aside .resume-section + .resume-section {
    margin-top: 2rem;
  }

  @media (max-width: 860px) {
    body.theme-modern {
      padding: 0.75rem;
    }

    .modern-banner,
    .modern-main,
    .modern-aside {
      padding: 1.4rem;
    }

    .modern-content {
      grid-template-columns: 1fr;
    }

    .modern-aside {
      border-left: none;
      border-top: 1px solid rgba(15, 107, 104, 0.1);
    }
  }
`;

export const modernTemplate: ResumeTemplate = {
  id: "modern",
  label: "Modern Split",
  description: "A high-contrast layout with a strong header and side rail.",
  outputExtension: "html",
  render(resume: ResumeDocument): string {
    const mainSections = [
      renderSummarySection(resume.basics.summary),
      renderExperienceSection(resume.experience),
      renderProjectsSection(resume.projects),
      renderCustomSections(resume.customSections),
    ]
      .filter(Boolean)
      .join("\n");

    const asideSections = [
      renderSkillsSection(resume.skills),
      renderEducationSection(resume.education),
    ]
      .filter(Boolean)
      .join("\n");

    return renderDocument({
      pageTitle: `${resume.basics.name} | Resume`,
      bodyClass: "theme-modern",
      css: MODERN_CSS,
      content: `
        <main class="page modern-shell">
          <section class="modern-banner">
            ${renderResumeHeader(resume)}
          </section>
          <section class="modern-content">
            <div class="modern-main">${mainSections}</div>
            <aside class="modern-aside">${asideSections}</aside>
          </section>
        </main>
      `,
    });
  },
};
