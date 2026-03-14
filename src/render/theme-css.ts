import type { ResumeTheme } from "../themes/theme.ts";

export function renderThemeCss(
  theme: ResumeTheme,
  bodyClass: string,
  accentColorOverride?: string,
): string {
  const vars = { ...theme.variables };

  if (accentColorOverride) {
    vars["accent"] = accentColorOverride;
  }

  const declarations = Object.entries(vars)
    .map(([key, value]) => `--${key}: ${value};`)
    .join("\n    ");

  return `
  body.${bodyClass} {
    ${declarations}
  }
  `;
}
