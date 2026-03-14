import type { ResumeDocument } from "../domain/resume.ts";

export interface ResumeTemplateRenderOptions {
  density?: "standard" | "compact";
  fontFaceCss?: string;
  bodyFontFamily?: string;
  headingFontFamily?: string;
  accentColor?: string;
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
