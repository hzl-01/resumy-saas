import type { ResumeDocument } from "../domain/resume.ts";

export type ResumeSectionKey =
  | "summary"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "custom";

export const DEFAULT_SECTION_ORDER: ResumeSectionKey[] = [
  "summary",
  "experience",
  "projects",
  "custom",
  "skills",
  "education",
];

export const VALID_SECTION_KEYS: ReadonlySet<string> = new Set<ResumeSectionKey>([
  "summary",
  "experience",
  "projects",
  "skills",
  "education",
  "custom",
]);

export interface ResumeTemplateRenderOptions {
  density?: "standard" | "compact";
  fontFaceCss?: string;
  bodyFontFamily?: string;
  headingFontFamily?: string;
  accentColor?: string;
  themeCss?: string;
  sectionOrder?: ResumeSectionKey[];
}

export interface ResumeTemplate {
  id: string;
  label: string;
  description: string;
  render: (
    resume: ResumeDocument,
    options?: ResumeTemplateRenderOptions,
  ) => string;
}
