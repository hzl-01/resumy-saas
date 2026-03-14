export interface ContactLink {
  label: string;
  url: string;
}

export interface ResumeBasics {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  summary?: string;
  links: ContactLink[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  highlights: string[];
}

export interface ResumeExperience {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  summary?: string;
  highlights: string[];
  technologies: string[];
}

export interface ResumeProject {
  name: string;
  role?: string;
  url?: string;
  summary?: string;
  highlights: string[];
  technologies: string[];
}

export interface ResumeSkillGroup {
  name: string;
  items: string[];
}

export interface ResumeCustomSection {
  title: string;
  items: string[];
}

export interface ResumeDocument {
  basics: ResumeBasics;
  education: ResumeEducation[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skills: ResumeSkillGroup[];
  customSections: ResumeCustomSection[];
}
