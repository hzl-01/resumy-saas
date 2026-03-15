# resumy

English README / [中文文档](https://github.com/ahpxex/resume-cli/blob/main/README.zh-CN.md).

`resumy` is a Bun-first CLI for generating polished resumes from structured flags and built-in templates. It is designed to stay scriptable, deterministic, and friendly to agents or power users who prefer explicit command input over interactive flows.
zh
## Install

Install `resumy` globally with Bun:

```bash
bun add -g resumy
bun install -g resumy
```

After installation, the global command is:

```bash
resumy --help
```

## Publish To npm

Publish the package publicly to npm:

```bash
npm login
npm publish
```

Once published, other users can install it globally with Bun and call `resumy` directly.

## Install The Agent Skill

This repository also ships the `agent-resume` skill for the `skills` installer.

Install it from GitHub:

```bash
bunx skills add https://github.com/ahpxex/resume-cli --skill agent-resume
```

Inspect locally during development:

```bash
bunx skills add . --list
bunx skills add . --skill agent-resume
```

## Quick Start

List the built-in templates:

```bash
resumy templates
```

Generate a PDF resume:

```bash
resumy generate pdf \
  --theme professional \
  --name "Jordan Lee" \
  --title "Product Engineer" \
  --email "jordan@example.com" \
  --phone "+1 (555) 123-4567" \
  --location "San Francisco, CA" \
  --website "https://jordanlee.dev" \
  --link "GitHub|https://github.com/jordanlee" \
  --link "LinkedIn|https://linkedin.com/in/jordanlee" \
  --summary "Product-minded engineer with a track record of shipping polished user experiences." \
  --experience "role=Senior Product Engineer;company=Northstar Labs;start=2022;end=Present;location=Remote;summary=Led the frontend architecture for customer-facing workflows." \
  --experience-bullet "0|Built a design-system-based UI platform across three product teams." \
  --experience-bullet "0|Improved onboarding completion by 18% through a guided setup flow." \
  --experience-tech "0|TypeScript, React, Bun, Design systems" \
  --project "name=Resume Studio;role=Creator;url=https://github.com/jordanlee/resume-studio;summary=A template-driven resume renderer for structured content." \
  --project-bullet "0|Designed a normalized resume schema for multiple layouts." \
  --project-tech "0|TypeScript, Bun, HTML, CSS" \
  --education "institution=University of Washington;degree=B.S. in Computer Science;start=2015;end=2019;location=Seattle, WA" \
  --education-highlight "0|Focused on human-computer interaction and distributed systems." \
  --skill-group "Languages|TypeScript, JavaScript, SQL, HTML, CSS" \
  --skill-group "Frameworks|React, Next.js, Bun, Node.js" \
  --extra "Certifications|AWS Certified Cloud Practitioner" \
  --output ./dist/resume.pdf
```

Write the intermediate HTML too:

```bash
resumy generate pdf ... --html-output ./dist/resume.html
```

## Commands

- `resumy templates`: list built-in layouts
- `resumy generate pdf`: generate a resume PDF from explicit flags

## How PDF Export Works

`resumy` renders your structured resume data into HTML first, then launches a headless browser through Playwright and asks the browser to print that HTML to PDF. This keeps template development simple while preserving browser-quality layout, fonts, colors, and print styling.

## Playwright And Chromium

- `resumy` depends on the Playwright JavaScript package for browser automation.
- The published `resumy` package itself does not bundle a Chromium binary inside the package tarball.
- At runtime, `resumy` first tries Playwright's Chromium. If that is unavailable, it falls back to a locally installed Google Chrome.
- If neither browser is available, install Chromium with `bunx playwright install chromium`.

## Input Model

The CLI is intentionally explicit. Repeated entries are passed with repeated flags:

- `--experience "role=...;company=...;start=...;end=...;location=...;summary=..."`
- `--experience-bullet "0|Built something"`
- `--experience-tech "0|TypeScript, React, Bun"`
- `--project "name=...;role=...;url=...;summary=..."`
- `--project-bullet "0|Shipped something"`
- `--project-tech "0|TypeScript, Bun, HTML, CSS"`
- `--education "institution=...;degree=...;start=...;end=...;location=..."`
- `--education-highlight "0|Focused on ..."`
- `--skill-group "Languages|TypeScript, JavaScript, SQL"`
- `--extra "Certifications|AWS Certified Cloud Practitioner"`

Zero-based indices are used to attach bullets and technology stacks to the matching entries.

## Typography Options

- `--density`: `standard` or `compact`
- `--theme-color`: accent color for links, headings, and visual details
- `--font-family`: body font stack
- `--heading-font-family`: heading font stack
- `--font-face`: embed local `.ttf`, `.otf`, `.woff`, or `.woff2` files

## Development

```bash
bun install
bun run check
bun test
bun run build
npm publish --dry-run
```
