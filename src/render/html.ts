import type {
  ResumeCustomSection,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
} from "../domain/resume.ts";

const BASE_CSS = `
  * {
    box-sizing: border-box;
  }

  :root {
    color-scheme: light;
  }

  html {
    font-size: 16px;
  }

  body {
    margin: 0;
    min-height: 100vh;
    background: var(--page-bg, #f4f1eb);
    color: var(--text, #1f1a17);
  }

  a {
    color: var(--accent, #69462f);
    text-decoration: none;
  }

  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  a:hover {
    text-decoration: underline;
  }

  .page {
    max-width: 960px;
    margin: 0 auto;
    background: var(--surface, #fffdf9);
  }

  .resume-header {
    display: grid;
    gap: 0.75rem;
  }

  .resume-name {
    margin: 0;
    font-size: clamp(2.4rem, 5vw, 3.6rem);
    line-height: 0.95;
    letter-spacing: -0.04em;
  }

  .resume-title {
    margin: 0;
    font-size: 1.05rem;
    color: var(--muted, #6b645d);
  }

  .contact-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.9rem;
    font-size: 0.95rem;
    color: var(--muted, #6b645d);
  }

  .contact-item {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-title {
    margin: 0 0 0.8rem;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--section-title, var(--accent, #69462f));
  }

  .resume-section + .resume-section {
    margin-top: 1.75rem;
  }

  .entry + .entry {
    margin-top: 1.15rem;
  }

  .entry {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }

  .entry-title {
    margin: 0;
    font-size: 1rem;
    line-height: 1.25;
  }

  .entry-subtitle {
    margin: 0.2rem 0 0;
    color: var(--muted, #6b645d);
    font-size: 0.96rem;
  }

  .entry-meta {
    margin: 0;
    flex-shrink: 0;
    text-align: right;
    color: var(--muted, #6b645d);
    font-size: 0.92rem;
    line-height: 1.4;
  }

  .entry-summary {
    margin: 0.65rem 0 0;
    color: var(--text-soft, #433d39);
    line-height: 1.6;
  }

  .entry-tech {
    margin: 0.7rem 0 0;
    font-size: 0.9rem;
    color: var(--muted, #6b645d);
  }

  .entry-list {
    margin: 0.65rem 0 0 1.1rem;
    padding: 0;
    display: grid;
    gap: 0.4rem;
    color: var(--text-soft, #433d39);
    line-height: 1.55;
  }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 2rem;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: var(--chip-bg, #efe5d7);
    color: var(--chip-text, #3b2d22);
    font-size: 0.92rem;
    line-height: 1.2;
  }

  .skill-stack {
    display: grid;
    gap: 0.8rem;
  }

  .skill-group {
    display: grid;
    gap: 0.45rem;
  }

  .skill-group-title {
    margin: 0;
    font-size: 0.95rem;
    color: var(--muted, #6b645d);
    font-weight: 700;
  }

  .layout-split {
    display: grid;
    gap: 2rem;
  }

  @media (max-width: 480px) {
    .entry-header {
      flex-direction: column;
    }

    .entry-meta {
      text-align: left;
    }
  }

  @media print {
    body {
      background: #ffffff;
    }

    .page {
      box-shadow: none !important;
      max-width: none;
      width: 100%;
    }

    a {
      color: inherit;
      text-decoration: none;
    }
  }
`;

export function renderDocument(params: {
  pageTitle: string;
  bodyClass: string;
  css: string;
  content: string;
}): string {
  const { pageTitle, bodyClass, css, content } = params;

  return [
    "<!doctype html>",
    `<html lang="en">`,
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(pageTitle)}</title>`,
    "  <style>",
    BASE_CSS,
    css,
    "  </style>",
    "</head>",
    `<body class="${escapeAttribute(bodyClass)}">`,
    content,
    "</body>",
    "</html>",
  ].join("\n");
}

export function renderResumeHeader(resume: ResumeDocument): string {
  const { basics } = resume;
  const contactItems: string[] = [];

  if (basics.email) {
    contactItems.push(
      renderContactItem(`mailto:${basics.email}`, basics.email),
    );
  }

  if (basics.phone) {
    contactItems.push(
      renderContactItem(`tel:${basics.phone.replace(/\s+/g, "")}`, basics.phone),
    );
  }

  if (basics.location) {
    contactItems.push(`<span class="contact-item">${escapeHtml(basics.location)}</span>`);
  }

  if (basics.website) {
    contactItems.push(renderContactItem(basics.website, basics.website));
  }

  for (const link of basics.links) {
    contactItems.push(renderContactItem(link.url, link.label));
  }

  return `
    <header class="resume-header">
      <div>
        <h1 class="resume-name">${escapeHtml(basics.name)}</h1>
        <p class="resume-title">${escapeHtml(basics.title)}</p>
      </div>
      ${contactItems.length > 0 ? `<div class="contact-list">${contactItems.join("")}</div>` : ""}
    </header>
  `;
}

export function renderSummarySection(summary?: string): string {
  if (!summary) {
    return "";
  }

  return renderSection(
    "Summary",
    `<p class="entry-summary">${escapeHtml(summary)}</p>`,
    "summary-section",
  );
}

export function renderExperienceSection(items: ResumeExperience[]): string {
  if (items.length === 0) {
    return "";
  }

  return renderSection(
    "Experience",
    items.map(renderExperienceEntry).join(""),
    "experience-section",
  );
}

export function renderProjectsSection(items: ResumeProject[]): string {
  if (items.length === 0) {
    return "";
  }

  return renderSection(
    "Projects",
    items.map(renderProjectEntry).join(""),
    "projects-section",
  );
}

export function renderEducationSection(items: ResumeEducation[]): string {
  if (items.length === 0) {
    return "";
  }

  return renderSection(
    "Education",
    items.map(renderEducationEntry).join(""),
    "education-section",
  );
}

export function renderSkillsSection(items: ResumeSkillGroup[]): string {
  if (items.length === 0) {
    return "";
  }

  return renderSection(
    "Skills",
    `
      <div class="skill-stack">
        ${items
          .map(
            (skillGroup) => `
              <div class="skill-group">
                <p class="skill-group-title">${escapeHtml(skillGroup.name)}</p>
                <div class="chip-list">
                  ${skillGroup.items
                    .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
                    .join("")}
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    `,
    "skills-section",
  );
}

export function renderCustomSections(items: ResumeCustomSection[]): string {
  return items
    .filter((section) => section.items.length > 0)
    .map((section) =>
      renderSection(section.title, renderList(section.items), "custom-section"),
    )
    .join("");
}

function renderExperienceEntry(item: ResumeExperience): string {
  return `
    <article class="entry">
      <div class="entry-header">
        <div>
          <h3 class="entry-title">${escapeHtml(item.role)}</h3>
          <p class="entry-subtitle">${escapeHtml(item.company)}</p>
        </div>
        <p class="entry-meta">${escapeHtml(formatMeta(item.startDate, item.endDate, item.location))}</p>
      </div>
      ${item.summary ? `<p class="entry-summary">${escapeHtml(item.summary)}</p>` : ""}
      ${
        item.technologies.length > 0
          ? `<p class="entry-tech"><strong>Stack:</strong> ${escapeHtml(item.technologies.join(", "))}</p>`
          : ""
      }
      ${renderList(item.highlights)}
    </article>
  `;
}

function renderProjectEntry(item: ResumeProject): string {
  const subtitleParts = [item.role];

  if (item.url) {
    subtitleParts.push(`<a href="${escapeAttribute(item.url)}">${escapeHtml(item.url)}</a>`);
  }

  return `
    <article class="entry">
      <div class="entry-header">
        <div>
          <h3 class="entry-title">${escapeHtml(item.name)}</h3>
          ${
            subtitleParts.length > 0
              ? `<p class="entry-subtitle">${subtitleParts.filter(Boolean).join(" · ")}</p>`
              : ""
          }
        </div>
      </div>
      ${item.summary ? `<p class="entry-summary">${escapeHtml(item.summary)}</p>` : ""}
      ${
        item.technologies.length > 0
          ? `<p class="entry-tech"><strong>Stack:</strong> ${escapeHtml(item.technologies.join(", "))}</p>`
          : ""
      }
      ${renderList(item.highlights)}
    </article>
  `;
}

function renderEducationEntry(item: ResumeEducation): string {
  return `
    <article class="entry">
      <div class="entry-header">
        <div>
          <h3 class="entry-title">${escapeHtml(item.degree)}</h3>
          <p class="entry-subtitle">${escapeHtml(item.institution)}</p>
        </div>
        <p class="entry-meta">${escapeHtml(formatMeta(item.startDate, item.endDate, item.location))}</p>
      </div>
      ${renderList(item.highlights)}
    </article>
  `;
}

function renderSection(title: string, body: string, className = ""): string {
  const classes = ["resume-section", className].filter(Boolean).join(" ");

  return `
    <section class="${escapeAttribute(classes)}">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      ${body}
    </section>
  `;
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "";
  }

  return `
    <ul class="entry-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderContactItem(href: string, label: string): string {
  return `<a class="contact-item" href="${escapeAttribute(href)}">${escapeHtml(label)}</a>`;
}

function formatMeta(
  startDate?: string,
  endDate?: string,
  location?: string,
): string {
  const parts = [formatDateRange(startDate, endDate), location].filter(Boolean);
  return parts.join(" | ");
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) {
    return "";
  }

  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }

  return startDate ?? endDate ?? "";
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
