import type { ResumeDocument } from "../domain/resume.ts";

export interface ResumeTemplateRenderOptions {
  fontFaceCss?: string;
  bodyFontFamily?: string;
  headingFontFamily?: string;
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
