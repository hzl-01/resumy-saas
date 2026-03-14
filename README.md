# resume-cli

`resume-cli` is a Bun-based CLI for generating resumes from agent-friendly command arguments with a print-first PDF output pipeline.

## Install

```bash
bun install
```

## Run

List the built-in layouts:

```bash
bun run index.ts templates
```

Generate a PDF resume directly from command arguments:

```bash
bun run index.ts generate pdf \
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

Also write the intermediate HTML for debugging:

```bash
bun run index.ts generate pdf ... --html-output ./dist/resume.html
```

Use custom typography:

```bash
bun run index.ts generate pdf ... \
  --density compact \
  --theme-color "#0f766e" \
  --font-family '"IBM Plex Sans", "Segoe UI", sans-serif' \
  --heading-font-family '"Newsreader", serif'
```

Embed local font files so the HTML and PDF are self-contained:

```bash
bun run index.ts generate pdf ... \
  --font-face "family=IBM Plex Sans;path=/absolute/path/IBMPlexSans-Regular.ttf;weight=400" \
  --font-face "family=IBM Plex Sans;path=/absolute/path/IBMPlexSans-SemiBold.ttf;weight=600" \
  --font-face "family=Newsreader;path=/absolute/path/Newsreader-Bold.ttf;weight=700" \
  --font-family '"IBM Plex Sans", sans-serif' \
  --heading-font-family '"Newsreader", serif'
```

## Commands

- `generate pdf`: Generate a PDF resume from explicit command flags
- `templates`: List built-in layouts

## Input Style

This CLI is designed for agents, so verbose commands are acceptable. Repeated section data is passed with repeated flags:

- `--experience "role=...;company=...;start=...;end=...;location=...;summary=..."`
- `--experience-bullet "0|Built something"`
- `--experience-tech "0|TypeScript, React, Bun"`
- `--project "name=...;role=...;url=...;summary=..."`
- `--project-bullet "0|Shipped something"`
- `--education "institution=...;degree=...;start=...;end=...;location=..."`
- `--education-highlight "0|Focused on ..."`
- `--skill-group "Languages|TypeScript, JavaScript, SQL"`
- `--extra "Certifications|AWS Certified Cloud Practitioner"`

Zero-based indices are used to attach bullets and tech stacks to the matching entry.

Typography can be controlled with:

- `--density` for `standard` or `compact` layout spacing
- `--theme-color` for the overall accent color
- `--font-family` for the main body text stack
- `--heading-font-family` for headings, section titles, and entry titles
- `--font-face` to embed local `.ttf`, `.otf`, `.woff`, or `.woff2` files into the generated HTML/PDF

## Development

```bash
bun run check
bun test
```
