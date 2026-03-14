# Intake And Tailoring

Use this reference when you need to collect missing user information or convert raw background details into resume-ready copy.

## Candidate Intake Checklist

Collect as much as the user already knows. Do not ask for fields the user has already provided.

- Basics: full name, target title, email, phone, location, website, portfolio, GitHub, LinkedIn
- Experience: role, company, start date, end date, location, summary, 2-5 strong bullets, technologies
- Projects: name, role, URL, summary, highlights, technologies
- Education: institution, degree, start date, end date, location, highlights
- Skills: grouped skills such as languages, frameworks, tooling, data, cloud, design, leadership
- Extras: certifications, awards, volunteering, publications, patents, talks
- Preferences: template, density, language, accent color, fonts, output filename

## Preferred Intake Sequence

1. Ask for candidate background.
2. Ask for the target JD.
3. Ask only the missing follow-up questions needed to draft a credible resume.

If the user has an existing resume or profile, extract structured facts from that artifact before asking for more details.

## JD Analysis

Extract these signals from the job description:

- Target role and seniority
- Required skills and tools
- Domain language
- Expected outcomes
- Leadership or collaboration expectations
- Signals that should influence section order or emphasis

Build a simple match table in your own reasoning:

- JD requirement
- Supporting user evidence
- Missing evidence that should not be fabricated

## Tailoring Rules

- Preserve truthfulness. Do not invent experience, metrics, dates, or tools.
- Mirror JD phrasing only when the user has real supporting evidence.
- Put the strongest, most relevant experiences first.
- Rewrite bullets toward action, scope, and result.
- Remove filler bullets before removing high-signal bullets.
- Keep the summary short and role-specific.
- Group skills for scanning instead of dumping one long list.

## Good Bullet Pattern

Prefer bullets that look like this:

- Action + scope + result
- Action + system/process + measurable outcome
- Action + collaboration/ownership + business effect

Examples:

- "Led migration of onboarding flows to a shared React platform, reducing implementation time across product teams."
- "Built internal analytics dashboards for support operations, improving response planning for weekly ticket spikes."

## Section Emphasis Guidance

- Senior IC or manager: emphasize experience first, then projects, then skills
- Early-career or career-switching: consider projects or skills earlier with `--section-order`
- Research or academic roles: keep education and publications more visible
- Portfolio-heavy roles: keep strong project content near the top

## Minimum Information Needed Before Rendering

Do not render until you have:

- `--name`
- `--title`
- At least one content section among summary, experience, projects, education, skills, or custom
- Enough role-specific facts to tailor the resume honestly to the JD
