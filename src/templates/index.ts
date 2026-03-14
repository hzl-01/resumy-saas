import { classicTemplate } from "./classic.ts";
import { minimalTemplate } from "./minimal.ts";
import { professionalTemplate } from "./professional.ts";
import type { ResumeTemplate } from "./template.ts";

const templateRegistry = [
  professionalTemplate,
  minimalTemplate,
  classicTemplate,
] as const;

export function listTemplates(): readonly ResumeTemplate[] {
  return templateRegistry;
}

export function getTemplate(templateId: string): ResumeTemplate | undefined {
  return templateRegistry.find((template) => template.id === templateId);
}
