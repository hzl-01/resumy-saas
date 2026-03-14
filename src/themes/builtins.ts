import type { ResumeTheme } from "./theme.ts";

export const defaultTheme: ResumeTheme = {
  id: "default",
  label: "Default",
  description: "Clean blue professional theme.",
  variables: {
    "page-bg": "#eef2f7",
    "surface": "#ffffff",
    "text": "#172033",
    "text-soft": "#3b475d",
    "muted": "#617088",
    "accent": "#0b5fff",
    "section-title": "color-mix(in srgb, var(--accent) 82%, #0f172a)",
    "chip-bg": "color-mix(in srgb, var(--accent) 10%, white)",
    "chip-text": "color-mix(in srgb, var(--accent) 68%, #0f172a)",
  },
};

export const minimalTheme: ResumeTheme = {
  id: "minimal",
  label: "Minimal",
  description: "Grayscale theme with subtle contrast.",
  variables: {
    "page-bg": "#f5f5f5",
    "surface": "#ffffff",
    "text": "#1a1a1a",
    "text-soft": "#404040",
    "muted": "#737373",
    "accent": "#404040",
    "section-title": "#1a1a1a",
    "chip-bg": "#f0f0f0",
    "chip-text": "#333333",
  },
};

export const warmTheme: ResumeTheme = {
  id: "warm",
  label: "Warm",
  description: "Earth-toned palette with a warm accent color.",
  variables: {
    "page-bg": "#f4f1eb",
    "surface": "#fffdf9",
    "text": "#1f1a17",
    "text-soft": "#433d39",
    "muted": "#6b645d",
    "accent": "#69462f",
    "section-title": "color-mix(in srgb, var(--accent) 82%, #1f1a17)",
    "chip-bg": "#efe5d7",
    "chip-text": "#3b2d22",
  },
};

export const darkTheme: ResumeTheme = {
  id: "dark",
  label: "Dark",
  description: "Dark background with light text for screen viewing.",
  variables: {
    "page-bg": "#111111",
    "surface": "#1e1e1e",
    "text": "#e8e8e8",
    "text-soft": "#b0b0b0",
    "muted": "#888888",
    "accent": "#60a5fa",
    "section-title": "color-mix(in srgb, var(--accent) 85%, #e8e8e8)",
    "chip-bg": "color-mix(in srgb, var(--accent) 15%, #1e1e1e)",
    "chip-text": "color-mix(in srgb, var(--accent) 70%, #e8e8e8)",
  },
};
