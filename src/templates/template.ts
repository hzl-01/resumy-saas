import type { ResumeDocument } from "../domain/resume.ts";

export interface ResumeTemplate {
  id: string;
  label: string;
  description: string;
  render: (resume: ResumeDocument) => string;
}
