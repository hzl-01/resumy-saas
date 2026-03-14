import type { ResumeDocument } from "./resume.ts";

const sampleResume: ResumeDocument = {
  basics: {
    name: "Jordan Lee",
    title: "Product Engineer",
    email: "jordan@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    website: "https://jordanlee.dev",
    summary:
      "Product-minded engineer with a track record of shipping polished user experiences, improving developer velocity, and translating ambiguous ideas into production-ready software.",
    links: [
      {
        label: "GitHub",
        url: "https://github.com/jordanlee",
      },
      {
        label: "LinkedIn",
        url: "https://linkedin.com/in/jordanlee",
      },
    ],
  },
  experience: [
    {
      company: "Northstar Labs",
      role: "Senior Product Engineer",
      startDate: "2022",
      endDate: "Present",
      location: "Remote",
      summary:
        "Led the frontend architecture for customer-facing workflows used by thousands of weekly active users.",
      highlights: [
        "Built a design-system-based UI platform that reduced duplicate component work across three product teams.",
        "Improved end-to-end onboarding completion by 18% through a guided setup flow and tighter validation states.",
        "Partnered with design and support to turn recurring customer pain points into a prioritized delivery roadmap.",
      ],
    },
    {
      company: "Beacon Commerce",
      role: "Software Engineer",
      startDate: "2019",
      endDate: "2022",
      location: "New York, NY",
      summary:
        "Worked across web product surfaces, internal tooling, and experimentation infrastructure.",
      highlights: [
        "Delivered a seller analytics dashboard that became one of the top-used product areas within the first quarter.",
        "Introduced shared CI tooling that cut average review-to-release time by 30%.",
      ],
    },
  ],
  education: [
    {
      institution: "University of Washington",
      degree: "B.S. in Computer Science",
      startDate: "2015",
      endDate: "2019",
      location: "Seattle, WA",
      highlights: [
        "Focused on human-computer interaction and distributed systems.",
      ],
    },
  ],
  projects: [
    {
      name: "Resume Studio",
      role: "Creator",
      url: "https://github.com/jordanlee/resume-studio",
      summary:
        "A template-driven resume renderer for generating print-ready application materials from structured content.",
      technologies: ["TypeScript", "Bun", "HTML", "CSS"],
      highlights: [
        "Designed a normalized resume schema to support multiple layout templates.",
        "Implemented snapshot-friendly rendering helpers to keep template regressions visible.",
      ],
    },
  ],
  skills: [
    {
      name: "Languages",
      items: ["TypeScript", "JavaScript", "SQL", "HTML", "CSS"],
    },
    {
      name: "Frameworks",
      items: ["React", "Next.js", "Bun", "Node.js"],
    },
    {
      name: "Product",
      items: ["Design systems", "UX collaboration", "Rapid prototyping"],
    },
  ],
  customSections: [
    {
      title: "Certifications",
      items: [
        "AWS Certified Cloud Practitioner",
        "Google UX Design Certificate",
      ],
    },
  ],
};

export function createStarterResume(): ResumeDocument {
  return structuredClone(sampleResume);
}
