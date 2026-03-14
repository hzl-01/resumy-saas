import { describe, expect, test } from "bun:test";
import { buildResumeDocument } from "./build-resume.ts";

describe("buildResumeDocument", () => {
  test("builds a resume from repeated CLI flags", () => {
    const document = buildResumeDocument({
      name: "Jordan Lee",
      title: "Product Engineer",
      email: "jordan@example.com",
      summary: "Product-minded engineer.",
      link: [
        "GitHub|https://github.com/jordanlee",
        "LinkedIn|https://linkedin.com/in/jordanlee",
      ],
      experience: [
        "role=Senior Product Engineer;company=Northstar Labs;start=2022;end=Present;location=Remote;summary=Led the frontend architecture.",
      ],
      experienceBullet: [
        "0|Built a design-system-based UI platform.",
        "0|Improved onboarding completion by 18%.",
      ],
      experienceTech: ["0|TypeScript, React, Bun"],
      project: [
        "name=Resume Studio;role=Creator;url=https://github.com/jordanlee/resume-studio;summary=A template-driven resume renderer.",
      ],
      projectBullet: ["0|Designed a normalized resume schema."],
      projectTech: ["0|TypeScript, Bun, HTML, CSS"],
      education: [
        "institution=University of Washington;degree=B.S. in Computer Science;start=2015;end=2019;location=Seattle, WA",
      ],
      educationHighlight: [
        "0|Focused on human-computer interaction and distributed systems.",
      ],
      skillGroup: ["Languages|TypeScript, JavaScript, SQL"],
      extra: ["Certifications|AWS Certified Cloud Practitioner"],
    });

    expect(document.basics.name).toBe("Jordan Lee");
    expect(document.experience[0]?.highlights.length).toBe(2);
    expect(document.experience[0]?.technologies).toEqual([
      "TypeScript",
      "React",
      "Bun",
    ]);
    expect(document.projects[0]?.technologies).toContain("CSS");
    expect(document.skills[0]?.items).toContain("SQL");
    expect(document.customSections[0]?.title).toBe("Certifications");
  });
});
