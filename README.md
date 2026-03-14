# resumy

`resumy` is a Bun-first CLI for generating polished resumes from structured flags and built-in templates. It is designed to stay scriptable, deterministic, and friendly to agents or power users who prefer explicit command input over interactive flows.

## English

### Install

Install `resumy` globally with Bun:

```bash
bun add -g resumy
```

### Quick Start

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

Use custom typography:

```bash
resumy generate pdf ... \
  --density compact \
  --theme-color "#0f766e" \
  --font-family '"IBM Plex Sans", "Segoe UI", sans-serif' \
  --heading-font-family '"Newsreader", serif'
```

Embed local font files so the HTML and PDF stay self-contained:

```bash
resumy generate pdf ... \
  --font-face "family=IBM Plex Sans;path=/absolute/path/IBMPlexSans-Regular.ttf;weight=400" \
  --font-face "family=IBM Plex Sans;path=/absolute/path/IBMPlexSans-SemiBold.ttf;weight=600" \
  --font-face "family=Newsreader;path=/absolute/path/Newsreader-Bold.ttf;weight=700" \
  --font-family '"IBM Plex Sans", sans-serif' \
  --heading-font-family '"Newsreader", serif'
```

### Commands

- `resumy templates`: list built-in layouts
- `resumy generate pdf`: generate a resume PDF from explicit flags

### Input Model

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

### Typography Options

- `--density`: `standard` or `compact`
- `--theme-color`: accent color for links, headings, and visual details
- `--font-family`: body font stack
- `--heading-font-family`: heading font stack
- `--font-face`: embed local `.ttf`, `.otf`, `.woff`, or `.woff2` files

### PDF Export Note

PDF export relies on Playwright. If Chromium is not available locally, install it with:

```bash
bunx playwright install chromium
```

### Development

```bash
bun install
bun run check
bun test
bun run build
```

## 中文

### 安装

使用 Bun 全局安装：

```bash
bun add -g resumy
```

### 快速使用

- `resumy templates`：查看内置模板
- `resumy generate pdf ...`：通过显式参数生成 PDF 简历

### 特点

- 内置多套模板，统一使用同一份结构化输入
- 命令行参数显式、可脚本化，适合 agent 和自动化流程
- 支持输出 PDF，也可以同时保留调试用 HTML
- 支持嵌入本地字体文件，方便生成自包含文档

### 开发

```bash
bun install
bun run check
bun test
bun run build
```
