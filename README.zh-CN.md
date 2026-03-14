# resumy

中文版文档。英文主文档见 [README.md](./README.md)。

`resumy` 是一个以 Bun 为优先运行时的 CLI，用来通过结构化命令参数和内置模板生成排版稳定的简历 PDF。它的定位是可脚本化、可重复、适合自动化流程和 agent 场景，而不是交互式向导。

## 安装

使用 Bun 全局安装：

```bash
bun add -g resumy
```

## 快速开始

查看内置模板：

```bash
resumy templates
```

生成 PDF 简历：

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

如果你想同时保留中间产出的 HTML，方便调试模板：

```bash
resumy generate pdf ... --html-output ./dist/resume.html
```

## 命令

- `resumy templates`：列出内置模板
- `resumy generate pdf`：通过显式参数生成 PDF 简历

## PDF 是怎么生成的

`resumy` 会先把结构化简历数据渲染成 HTML，然后通过 Playwright 启动无头浏览器，再让浏览器把这份 HTML 直接打印成 PDF。这个方案的好处是模板开发更直接，而且能复用浏览器的排版能力，字体、颜色、间距和打印样式都会更稳定。

## Playwright 和 Chromium 说明

- `resumy` 依赖的是 Playwright 的 JavaScript 包。
- 发布出去的 `resumy` 包本身不会把 Chromium 二进制直接打进包体里。
- 运行时会先尝试使用 Playwright 的 Chromium。
- 如果 Playwright 的 Chromium 不可用，会回退到本机已有的 Google Chrome。
- 如果两者都不可用，可以执行 `bunx playwright install chromium` 安装 Chromium。

## 输入模型

CLI 故意保持显式。重复条目通过重复参数传入：

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

这些附加项通过从 `0` 开始的索引挂到对应条目上。

## 字体与排版

- `--density`：`standard` 或 `compact`
- `--theme-color`：控制链接、标题和视觉强调色
- `--font-family`：正文字体栈
- `--heading-font-family`：标题字体栈
- `--font-face`：嵌入本地 `.ttf`、`.otf`、`.woff`、`.woff2` 字体文件

## 开发

```bash
bun install
bun run check
bun test
bun run build
```
