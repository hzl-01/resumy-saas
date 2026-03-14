import { describe, expect, test } from "bun:test";
import { createStarterResume } from "../domain/sample-resume.ts";
import {
  ResumeValidationError,
  normalizeResumeDocument,
  parseResumeJson,
} from "./resume.ts";
import { getTemplate } from "../templates/index.ts";

describe("resume schema", () => {
  test("normalizes a starter resume", () => {
    const sample = createStarterResume();
    const parsed = normalizeResumeDocument(sample);

    expect(parsed.basics.name).toBe("Jordan Lee");
    expect(parsed.experience.length).toBeGreaterThan(0);
    expect(parsed.skills.length).toBeGreaterThan(0);
  });

  test("rejects missing required basics fields", () => {
    const invalidInput = {
      basics: {
        title: "Engineer",
      },
    };

    expect(() => normalizeResumeDocument(invalidInput)).toThrow(
      ResumeValidationError,
    );
  });

  test("renders the built-in classic template", () => {
    const sample = createStarterResume();
    const professionalTemplate = getTemplate("professional");
    const html = professionalTemplate?.render(sample);

    expect(html).toContain("Jordan Lee");
    expect(html).toContain("theme-professional");
  });

  test("parses JSON text", () => {
    const sample = createStarterResume();
    const raw = JSON.stringify(sample);

    const parsed = parseResumeJson(raw);

    expect(parsed.projects[0]?.name).toBe("Resume Studio");
  });
});
