# OmniAuditor Agent & Contribution Guidelines

## Language and commits

- **All Git commit messages must be written in English.**
- Use [Conventional Commits](https://www.conventionalcommits.org/):
  `type(scope): concise imperative summary`.
- Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`, `revert`.
- Examples:
  - `feat(core): add normalized audit finding schema`
  - `fix(adapters): preserve SARIF source locations`
  - `docs(architecture): document audit orchestration boundaries`
  - `test(cli): cover Trivy findings normalization`
- Use a meaningful scope when applicable; subject lines should be concise, imperative, and free of trailing punctuation.
- Pull request titles and technical documentation should initially be in English.

## Documentation and localization

- During initial development, author README, guides, architecture notes, code comments, and contributor documentation in **English**.
- **At the project's documentation/localization milestone**, publish maintained **English and Persian** versions (including README and user-facing documentation), with discoverable links between languages.
- Do not introduce partially translated or stale duplicate documentation before that milestone.
- User-facing localization can be added incrementally when the UI is implemented, with both `en` and `fa` planned; Persian requires RTL layout validation.
- Source code identifiers, schema keys, file paths, API contracts, and commit messages remain English in both locales.

## Safety and quality

- Never automatically run builds, tests, migrations, deployments, active scans, or write operations against audited repositories. Obtain explicit approval first.
- Do not modify the default branch directly for feature work; use a dedicated branch and pull request.
- Make only evidence-backed audit claims; distinguish reported findings, verified findings, control assessments, and accredited certification.
- Keep standards editions and tool versions explicit, and avoid distributing proprietary standards text without permission.
- Do not commit credentials, private datasets, production reports, or secrets.
- State accurately which integrations are implemented versus proposed.
