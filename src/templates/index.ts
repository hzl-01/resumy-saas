import { classicTemplate } from "./classic.ts";
import { compactTemplate } from "./compact.ts";
import { modernTemplate } from "./modern.ts";
import type { ResumeTemplate } from "./template.ts";

const templateRegistry = [classicTemplate, modernTemplate, compactTemplate] as const;

export function listTemplates(): readonly ResumeTemplate[] {
  return templateRegistry;
}

export function getTemplate(templateId: string): ResumeTemplate | undefined {
  return templateRegistry.find((template) => template.id === templateId);
}
