export type SectionLabel =
  | "summary"
  | "experience"
  | "projects"
  | "skills"
  | "education";

const translations: Record<string, Record<SectionLabel, string>> = {
  en: {
    summary: "Summary",
    experience: "Experience",
    projects: "Projects",
    skills: "Skills",
    education: "Education",
  },
  zh: {
    summary: "简介",
    experience: "工作经历",
    projects: "项目经历",
    skills: "技能",
    education: "教育背景",
  },
  ja: {
    summary: "概要",
    experience: "職歴",
    projects: "プロジェクト",
    skills: "スキル",
    education: "学歴",
  },
  ko: {
    summary: "요약",
    experience: "경력",
    projects: "프로젝트",
    skills: "기술",
    education: "학력",
  },
  es: {
    summary: "Resumen",
    experience: "Experiencia",
    projects: "Proyectos",
    skills: "Habilidades",
    education: "Educacion",
  },
  fr: {
    summary: "Resume",
    experience: "Experience",
    projects: "Projets",
    skills: "Competences",
    education: "Formation",
  },
  de: {
    summary: "Zusammenfassung",
    experience: "Berufserfahrung",
    projects: "Projekte",
    skills: "Kenntnisse",
    education: "Ausbildung",
  },
};

export type SectionLabels = Record<SectionLabel, string>;

export const SUPPORTED_LANGUAGES = Object.keys(translations);

export function getSectionLabels(language: string): SectionLabels {
  return translations[language] ?? translations.en!;
}
