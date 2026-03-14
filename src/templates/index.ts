import { professionalTemplate } from "./professional.ts";
import type { ResumeTemplate } from "./template.ts";

const templateRegistry = [professionalTemplate] as const;

export function listTemplates(): readonly ResumeTemplate[] {
  return templateRegistry;
}

export function getTemplate(templateId: string): ResumeTemplate | undefined {
  return templateRegistry.find((template) => template.id === templateId);
}
