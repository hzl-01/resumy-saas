# resume-cli

`resume-cli` is a Bun-based CLI for generating resumes from structured JSON input using built-in style templates.

## Install

```bash
bun install
```

## Run

List the built-in templates:

```bash
bun run index.ts templates
```

Create a starter resume data file:

```bash
bun run index.ts init ./resume.json
```

Generate an HTML resume:

```bash
bun run index.ts generate ./resume.json --template modern --output ./dist/resume.html
```

Print the rendered HTML to stdout:

```bash
bun run index.ts generate ./resume.json --template classic --stdout
```

## Commands

- `generate <input>`: Read a JSON resume file and render a built-in HTML template
- `templates`: List built-in templates
- `init [output]`: Write a starter JSON resume file

## Input Shape

The CLI currently expects JSON matching the built-in resume schema. The `init` command writes a valid starter file you can modify.

```bash
bun run index.ts init ./resume.json
```

## Development

```bash
bun run check
bun test
```
