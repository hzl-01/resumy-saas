# Resumy CLI

Use this reference when you are ready to translate tailored resume content into a `resumy` command.

## Command Shape

`resumy` currently renders PDF output from explicit flags.

Core pattern:

```bash
resumy generate pdf \
  --theme professional \
  --name "Candidate Name" \
  --title "Target Role" \
  --summary "Tailored summary" \
  --experience "role=...;company=...;start=...;end=...;location=...;summary=..." \
  --experience-bullet "0|Most relevant achievement" \
  --experience-tech "0|TypeScript, React, Bun" \
  --project "name=...;role=...;url=...;summary=..." \
  --project-bullet "0|Relevant project outcome" \
  --education "institution=...;degree=...;start=...;end=...;location=..." \
  --skill-group "Languages|TypeScript, JavaScript" \
  --extra "Certifications|AWS Certified Cloud Practitioner" \
  --output ./dist/candidate-name.pdf
```

## Important Flags

- `--theme`: `professional`, `minimal`, or `classic`
- `--output`: PDF output path
- `--html-output`: optional debug HTML path
- `--page-size`: `letter` or `a4`
- `--density`: `standard` or `compact`
- `--theme-color`: accent color
- `--language`: section header language only
- `--font-family` and `--heading-font-family`: font stacks
- `--font-face`: embed local font files
- `--section-order`: comma-separated keys from `summary,experience,projects,skills,education,custom`

## Theme Guidance

- `professional`: default choice for most applications
- `minimal`: cleaner and lighter visual treatment
- `classic`: more traditional resume look

If the user does not specify a preference, start with `professional`.

## Flag Mapping

- Basics map to `--name`, `--title`, `--email`, `--phone`, `--location`, `--website`, `--link`, `--summary`
- Experience entries map to repeated `--experience`
- Experience bullets map to `--experience-bullet "index|text"`
- Experience tech stacks map to `--experience-tech "index|csv"`
- Project entries map to repeated `--project`
- Project bullets map to `--project-bullet "index|text"`
- Project tech stacks map to `--project-tech "index|csv"`
- Education entries map to repeated `--education`
- Education highlights map to `--education-highlight "index|text"`
- Skills map to repeated `--skill-group "Group|item1, item2"`
- Extra sections map to repeated `--extra "Section|Item"`

## Command Construction Notes

- Use double quotes around every semicolon-separated or pipe-separated value.
- Keep indices zero-based and aligned with the order of the base entries.
- Prefer deterministic file paths such as `./dist/<candidate-or-role>.pdf`.
- Add `--html-output` when you want to inspect the rendered HTML or debug layout problems.

## PDF Export Notes

`resumy` renders HTML first and then uses Playwright to print that HTML to PDF through a headless browser.

- The published `resumy` package does not bundle a Chromium binary inside the package tarball.
- At runtime, `resumy` first tries Playwright's Chromium.
- If that fails, `resumy` falls back to a locally installed Google Chrome.
- If both are unavailable, install Chromium with:

```bash
bunx playwright install chromium
```

## Verification

After rendering:

1. Confirm the command exited successfully.
2. Confirm the PDF exists at the requested path.
3. If you also emitted HTML, keep that path in the final response for debugging.
