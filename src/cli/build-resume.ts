import type {
  ResumeCustomSection,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
} from "../domain/resume.ts";
import {
  DEFAULT_SECTION_ORDER,
  type ResumeSectionKey,
  VALID_SECTION_KEYS,
} from "../templates/template.ts";
import { CliError } from "./errors.ts";

export interface GeneratePdfOptions {
  output?: string;
  htmlOutput?: string;
  template?: string;
  pageSize?: string;
  density?: string;
  themeColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  fontFace?: string | string[];
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  summary?: string;
  link?: string | string[];
  experience?: string | string[];
  experienceBullet?: string | string[];
  experienceTech?: string | string[];
  project?: string | string[];
  projectBullet?: string | string[];
  projectTech?: string | string[];
  education?: string | string[];
  educationHighlight?: string | string[];
  skillGroup?: string | string[];
  extra?: string | string[];
  sectionOrder?: string;
  theme?: string;
}

export interface ResumeFontFace {
  family: string;
  path: string;
  style: string;
  weight: string;
}

export interface ResumeTypographyOptions {
  bodyFontFamily?: string;
  headingFontFamily?: string;
  fontFaces: ResumeFontFace[];
}

export interface ResumeThemeOptions {
  accentColor?: string;
}

export type ResumeDensity = "standard" | "compact";

export interface PdfRenderRequest {
  document: ResumeDocument;
  htmlOutput?: string;
  output: string;
  density: ResumeDensity;
  pageSize: "letter" | "a4";
  templateId: string;
  theme: ResumeThemeOptions;
  typography: ResumeTypographyOptions;
  sectionOrder: ResumeSectionKey[];
}

export function buildPdfRenderRequest(
  options: GeneratePdfOptions,
): PdfRenderRequest {
  const templateId = options.theme ?? options.template ?? "professional";
  const pageSize = normalizePageSize(options.pageSize);
  const density = normalizeDensity(options.density);
  const sectionOrder = parseSectionOrder(options.sectionOrder);
  const document = buildResumeDocument(options);
  const output = options.output ?? `resume.${templateId}.${pageSize}.pdf`;

  return {
    document,
    htmlOutput: options.htmlOutput,
    output,
    density,
    pageSize,
    templateId,
    sectionOrder,
    theme: {
      accentColor: normalizeCssValue(options.themeColor, "--theme-color"),
    },
    typography: {
      bodyFontFamily: optionalString(options.fontFamily),
      headingFontFamily: optionalString(options.headingFontFamily),
      fontFaces: parseFontFaces(asArray(options.fontFace)),
    },
  };
}

export function buildResumeDocument(
  options: GeneratePdfOptions,
): ResumeDocument {
  const experience = parseExperienceEntries(asArray(options.experience));
  applyIndexedTextItems(
    experience,
    asArray(options.experienceBullet),
    "experience-bullet",
    (entry, text) => {
      entry.highlights.push(text);
    },
  );
  applyIndexedCsvItems(
    experience,
    asArray(options.experienceTech),
    "experience-tech",
    (entry, values) => {
      entry.technologies.push(...values);
    },
  );

  const projects = parseProjectEntries(asArray(options.project));
  applyIndexedTextItems(
    projects,
    asArray(options.projectBullet),
    "project-bullet",
    (entry, text) => {
      entry.highlights.push(text);
    },
  );
  applyIndexedCsvItems(
    projects,
    asArray(options.projectTech),
    "project-tech",
    (entry, values) => {
      entry.technologies.push(...values);
    },
  );

  const education = parseEducationEntries(asArray(options.education));
  applyIndexedTextItems(
    education,
    asArray(options.educationHighlight),
    "education-highlight",
    (entry, text) => {
      entry.highlights.push(text);
    },
  );

  const skills = parseSkillGroups(asArray(options.skillGroup));
  const customSections = parseCustomSections(asArray(options.extra));

  const document: ResumeDocument = {
    basics: {
      name: requireString(options.name, "--name"),
      title: requireString(options.title, "--title"),
      email: optionalString(options.email),
      phone: optionalString(options.phone),
      location: optionalString(options.location),
      website: optionalString(options.website),
      summary: optionalString(options.summary),
      links: asArray(options.link).map((entry, index) =>
        parseLink(entry, `--link[${index}]`),
      ),
    },
    education,
    experience,
    projects,
    skills,
    customSections,
  };

  const hasContentSection =
    document.experience.length > 0 ||
    document.projects.length > 0 ||
    document.education.length > 0 ||
    document.skills.length > 0 ||
    document.customSections.length > 0 ||
    Boolean(document.basics.summary);

  if (!hasContentSection) {
    throw new CliError(
      "Add at least one resume section with `--experience`, `--project`, `--education`, `--skill-group`, `--extra`, or `--summary`.",
    );
  }

  return document;
}

function parseExperienceEntries(entries: string[]): ResumeExperience[] {
  return entries.map((entry, index) => {
    const fields = parseKeyValueFields(entry, `--experience[${index}]`);

    return {
      company: getRequiredField(fields, "company", `--experience[${index}]`),
      role: getRequiredField(fields, "role", `--experience[${index}]`),
      startDate: getOptionalField(fields, "start"),
      endDate: getOptionalField(fields, "end"),
      location: getOptionalField(fields, "location"),
      summary: getOptionalField(fields, "summary"),
      highlights: [],
      technologies: [],
    };
  });
}

function parseProjectEntries(entries: string[]): ResumeProject[] {
  return entries.map((entry, index) => {
    const fields = parseKeyValueFields(entry, `--project[${index}]`);

    return {
      name: getRequiredField(fields, "name", `--project[${index}]`),
      role: getOptionalField(fields, "role"),
      url: getOptionalField(fields, "url"),
      summary: getOptionalField(fields, "summary"),
      highlights: [],
      technologies: [],
    };
  });
}

function parseEducationEntries(entries: string[]): ResumeEducation[] {
  return entries.map((entry, index) => {
    const fields = parseKeyValueFields(entry, `--education[${index}]`);

    return {
      institution: getRequiredField(
        fields,
        "institution",
        `--education[${index}]`,
      ),
      degree: getRequiredField(fields, "degree", `--education[${index}]`),
      startDate: getOptionalField(fields, "start"),
      endDate: getOptionalField(fields, "end"),
      location: getOptionalField(fields, "location"),
      highlights: [],
    };
  });
}

function parseSkillGroups(entries: string[]): ResumeSkillGroup[] {
  return entries.map((entry, index) => {
    const [name, rawItems] = splitPair(entry, "|", `--skill-group[${index}]`);
    const items = parseCsv(rawItems, `--skill-group[${index}]`);

    if (items.length === 0) {
      throw new CliError(
        `--skill-group[${index}] must include at least one comma-separated item after the group name.`,
      );
    }

    return {
      name,
      items,
    };
  });
}

function parseCustomSections(entries: string[]): ResumeCustomSection[] {
  const grouped = new Map<string, string[]>();

  entries.forEach((entry, index) => {
    const [title, item] = splitPair(entry, "|", `--extra[${index}]`);
    const existing = grouped.get(title) ?? [];
    existing.push(item);
    grouped.set(title, existing);
  });

  return [...grouped.entries()].map(([title, items]) => ({
    title,
    items,
  }));
}

function parseLink(entry: string, label: string) {
  const [name, url] = splitPair(entry, "|", label);

  return {
    label: name,
    url,
  };
}

function parseFontFaces(entries: string[]): ResumeFontFace[] {
  return entries.map((entry, index) => {
    const fields = parseKeyValueFields(entry, `--font-face[${index}]`);

    return {
      family: getRequiredField(fields, "family", `--font-face[${index}]`),
      path: getRequiredField(fields, "path", `--font-face[${index}]`),
      weight: getOptionalField(fields, "weight") ?? "400",
      style: getOptionalField(fields, "style") ?? "normal",
    };
  });
}

function applyIndexedTextItems<T>(
  entries: T[],
  rawItems: string[],
  optionName: string,
  applyValue: (entry: T, value: string) => void,
): void {
  for (const rawItem of rawItems) {
    const { index, value } = parseIndexedValue(rawItem, optionName);
    const entry = entries[index];

    if (!entry) {
      throw new CliError(
        `--${optionName} references entry ${index}, but only ${entries.length} base entries were provided.`,
      );
    }

    applyValue(entry, value);
  }
}

function applyIndexedCsvItems<T>(
  entries: T[],
  rawItems: string[],
  optionName: string,
  applyValue: (entry: T, values: string[]) => void,
): void {
  for (const rawItem of rawItems) {
    const { index, value } = parseIndexedValue(rawItem, optionName);
    const entry = entries[index];

    if (!entry) {
      throw new CliError(
        `--${optionName} references entry ${index}, but only ${entries.length} base entries were provided.`,
      );
    }

    const values = parseCsv(value, `--${optionName}`);

    if (values.length === 0) {
      throw new CliError(`--${optionName} must include at least one comma-separated value.`);
    }

    applyValue(entry, values);
  }
}

function parseIndexedValue(
  rawValue: string,
  optionName: string,
): { index: number; value: string } {
  const [indexText, value] = splitPair(rawValue, "|", `--${optionName}`);
  const index = Number.parseInt(indexText, 10);

  if (!Number.isInteger(index) || index < 0) {
    throw new CliError(
      `--${optionName} must start with a zero-based index like "0|text". Received "${rawValue}".`,
    );
  }

  return { index, value };
}

function parseKeyValueFields(
  entry: string,
  label: string,
): Map<string, string> {
  const fields = new Map<string, string>();

  for (const segment of entry.split(";")) {
    const trimmedSegment = segment.trim();

    if (!trimmedSegment) {
      continue;
    }

    const separatorIndex = trimmedSegment.indexOf("=");

    if (separatorIndex <= 0 || separatorIndex === trimmedSegment.length - 1) {
      throw new CliError(
        `${label} entries must use "key=value" pairs separated by semicolons. Received "${entry}".`,
      );
    }

    const key = trimmedSegment.slice(0, separatorIndex).trim();
    const value = trimmedSegment.slice(separatorIndex + 1).trim();

    if (!key || !value) {
      throw new CliError(
        `${label} entries must use non-empty "key=value" pairs. Received "${entry}".`,
      );
    }

    fields.set(key, value);
  }

  return fields;
}

function getRequiredField(
  fields: Map<string, string>,
  key: string,
  label: string,
): string {
  const value = fields.get(key)?.trim();

  if (!value) {
    throw new CliError(`${label} is missing required field "${key}".`);
  }

  return value;
}

function getOptionalField(
  fields: Map<string, string>,
  key: string,
): string | undefined {
  const value = fields.get(key)?.trim();
  return value ? value : undefined;
}

function splitPair(
  value: string,
  separator: string,
  label: string,
): [string, string] {
  const separatorIndex = value.indexOf(separator);

  if (separatorIndex <= 0 || separatorIndex === value.length - separator.length) {
    throw new CliError(
      `${label} must contain "${separator}" with non-empty values on both sides. Received "${value}".`,
    );
  }

  const left = value.slice(0, separatorIndex).trim();
  const right = value.slice(separatorIndex + separator.length).trim();

  if (!left || !right) {
    throw new CliError(
      `${label} must contain non-empty values on both sides of "${separator}". Received "${value}".`,
    );
  }

  return [left, right];
}

function parseCsv(value: string, label: string): string[] {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    throw new CliError(`${label} must include at least one value.`);
  }

  return items;
}

function asArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function requireString(value: string | undefined, optionName: string): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new CliError(`${optionName} is required.`);
  }

  return trimmed;
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePageSize(pageSize: string | undefined): "letter" | "a4" {
  const normalized = pageSize?.trim().toLowerCase() ?? "letter";

  if (normalized === "letter" || normalized === "a4") {
    return normalized;
  }

  throw new CliError(
    `Unsupported page size "${pageSize}". Use \`letter\` or \`a4\`.`,
  );
}

function normalizeDensity(density: string | undefined): ResumeDensity {
  const normalized = density?.trim().toLowerCase() ?? "standard";

  if (normalized === "standard" || normalized === "compact") {
    return normalized;
  }

  throw new CliError(
    `Unsupported density "${density}". Use \`standard\` or \`compact\`.`,
  );
}

function parseSectionOrder(
  value: string | undefined,
): ResumeSectionKey[] {
  if (!value) {
    return DEFAULT_SECTION_ORDER;
  }

  const keys = value
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new CliError(
      `--section-order must contain at least one section key. Valid keys: ${[...VALID_SECTION_KEYS].join(", ")}.`,
    );
  }

  for (const key of keys) {
    if (!VALID_SECTION_KEYS.has(key)) {
      throw new CliError(
        `Unknown section key "${key}" in --section-order. Valid keys: ${[...VALID_SECTION_KEYS].join(", ")}.`,
      );
    }
  }

  return keys as ResumeSectionKey[];
}

function normalizeCssValue(
  value: string | undefined,
  optionName: string,
): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/[;\n\r{}]/.test(trimmed)) {
    throw new CliError(
      `${optionName} contains unsupported characters. Pass a plain CSS color value such as \`#2563eb\` or \`rgb(37 99 235)\`.`,
    );
  }

  return trimmed;
}
