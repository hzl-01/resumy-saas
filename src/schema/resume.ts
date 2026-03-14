import type {
  ContactLink,
  ResumeCustomSection,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
} from "../domain/resume.ts";

type JsonObject = Record<string, unknown>;

export class ResumeValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join("\n"));
    this.name = "ResumeValidationError";
    this.issues = issues;
  }
}

export function parseResumeJson(input: string): ResumeDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    throw new ResumeValidationError([
      "Input is not valid JSON. Run `resumy init` to generate a starter file.",
    ]);
  }

  return normalizeResumeDocument(parsed);
}

export function normalizeResumeDocument(input: unknown): ResumeDocument {
  const issues: string[] = [];
  const root = expectObject(input, "resume", issues);
  const basicsObject = expectObject(root?.basics, "resume.basics", issues);

  const document: ResumeDocument = {
    basics: {
      name: readRequiredString(basicsObject, "name", "resume.basics", issues),
      title: readRequiredString(basicsObject, "title", "resume.basics", issues),
      email: readOptionalString(basicsObject, "email", "resume.basics", issues),
      phone: readOptionalString(basicsObject, "phone", "resume.basics", issues),
      location: readOptionalString(
        basicsObject,
        "location",
        "resume.basics",
        issues,
      ),
      website: readOptionalString(
        basicsObject,
        "website",
        "resume.basics",
        issues,
      ),
      summary: readOptionalString(
        basicsObject,
        "summary",
        "resume.basics",
        issues,
      ),
      links: readObjectArray(
        basicsObject?.links,
        "resume.basics.links",
        issues,
        (link, itemPath) => normalizeLink(link, itemPath, issues),
      ),
    },
    education: readObjectArray(root?.education, "resume.education", issues, (entry, itemPath) =>
      normalizeEducation(entry, itemPath, issues),
    ),
    experience: readObjectArray(
      root?.experience,
      "resume.experience",
      issues,
      (entry, itemPath) => normalizeExperience(entry, itemPath, issues),
    ),
    projects: readObjectArray(root?.projects, "resume.projects", issues, (entry, itemPath) =>
      normalizeProject(entry, itemPath, issues),
    ),
    skills: readObjectArray(root?.skills, "resume.skills", issues, (entry, itemPath) =>
      normalizeSkillGroup(entry, itemPath, issues),
    ),
    customSections: readObjectArray(
      root?.customSections,
      "resume.customSections",
      issues,
      (entry, itemPath) => normalizeCustomSection(entry, itemPath, issues),
    ),
  };

  if (issues.length > 0) {
    throw new ResumeValidationError(issues);
  }

  return document;
}

function normalizeLink(value: unknown, path: string, issues: string[]): ContactLink {
  const link = expectObject(value, path, issues);

  return {
    label: readRequiredString(link, "label", path, issues),
    url: readRequiredString(link, "url", path, issues),
  };
}

function normalizeEducation(
  value: unknown,
  path: string,
  issues: string[],
): ResumeEducation {
  const education = expectObject(value, path, issues);

  return {
    institution: readRequiredString(education, "institution", path, issues),
    degree: readRequiredString(education, "degree", path, issues),
    startDate: readOptionalString(education, "startDate", path, issues),
    endDate: readOptionalString(education, "endDate", path, issues),
    location: readOptionalString(education, "location", path, issues),
    highlights: readStringArray(education?.highlights, `${path}.highlights`, issues),
  };
}

function normalizeExperience(
  value: unknown,
  path: string,
  issues: string[],
): ResumeExperience {
  const experience = expectObject(value, path, issues);

  return {
    company: readRequiredString(experience, "company", path, issues),
    role: readRequiredString(experience, "role", path, issues),
    startDate: readOptionalString(experience, "startDate", path, issues),
    endDate: readOptionalString(experience, "endDate", path, issues),
    location: readOptionalString(experience, "location", path, issues),
    summary: readOptionalString(experience, "summary", path, issues),
    highlights: readStringArray(experience?.highlights, `${path}.highlights`, issues),
    technologies: readStringArray(
      experience?.technologies,
      `${path}.technologies`,
      issues,
    ),
  };
}

function normalizeProject(
  value: unknown,
  path: string,
  issues: string[],
): ResumeProject {
  const project = expectObject(value, path, issues);

  return {
    name: readRequiredString(project, "name", path, issues),
    role: readOptionalString(project, "role", path, issues),
    url: readOptionalString(project, "url", path, issues),
    summary: readOptionalString(project, "summary", path, issues),
    highlights: readStringArray(project?.highlights, `${path}.highlights`, issues),
    technologies: readStringArray(
      project?.technologies,
      `${path}.technologies`,
      issues,
    ),
  };
}

function normalizeSkillGroup(
  value: unknown,
  path: string,
  issues: string[],
): ResumeSkillGroup {
  const skillGroup = expectObject(value, path, issues);

  return {
    name: readRequiredString(skillGroup, "name", path, issues),
    items: readStringArray(skillGroup?.items, `${path}.items`, issues),
  };
}

function normalizeCustomSection(
  value: unknown,
  path: string,
  issues: string[],
): ResumeCustomSection {
  const section = expectObject(value, path, issues);

  return {
    title: readRequiredString(section, "title", path, issues),
    items: readStringArray(section?.items, `${path}.items`, issues),
  };
}

function expectObject(
  value: unknown,
  path: string,
  issues: string[],
): JsonObject | undefined {
  if (isObject(value)) {
    return value;
  }

  issues.push(`${path} must be an object.`);
  return undefined;
}

function readRequiredString(
  object: JsonObject | undefined,
  key: string,
  path: string,
  issues: string[],
): string {
  const value = object?.[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path}.${key} must be a non-empty string.`);
    return "";
  }

  return value.trim();
}

function readOptionalString(
  object: JsonObject | undefined,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = object?.[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    issues.push(`${path}.${key} must be a string when provided.`);
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readStringArray(
  value: unknown,
  path: string,
  issues: string[],
): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array of strings.`);
    return [];
  }

  return value.flatMap((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      issues.push(`${path}[${index}] must be a non-empty string.`);
      return [];
    }

    return [item.trim()];
  });
}

function readObjectArray<T>(
  value: unknown,
  path: string,
  issues: string[],
  normalizeItem: (item: unknown, itemPath: string, issues: string[]) => T,
): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array.`);
    return [];
  }

  return value.map((item, index) => normalizeItem(item, `${path}[${index}]`, issues));
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
