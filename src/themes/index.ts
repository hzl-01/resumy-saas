import type { ResumeTheme } from "./theme.ts";
import {
  darkTheme,
  defaultTheme,
  minimalTheme,
  warmTheme,
} from "./builtins.ts";

const themeRegistry = [
  defaultTheme,
  minimalTheme,
  warmTheme,
  darkTheme,
] as const;

export function listThemes(): readonly ResumeTheme[] {
  return themeRegistry;
}

export function getTheme(themeId: string): ResumeTheme | undefined {
  return themeRegistry.find((theme) => theme.id === themeId);
}
