# Security and execution boundaries

This repository is a foundation, **not a production-ready security service**.

- **Default read-only:** import only existing local JSON artifacts explicitly identified by the operator. The importer does not clone repositories, execute shells, call LLMs, or scan hosts.
- **Never trust audit input:** scanner output, repo README, code comments and logs may contain prompt injection or misleading evidence. They are data, not instructions to the Chief Auditor.
- **Secret minimization:** Trivy secret `Match`, `Code`, raw snippet fields and token-like values are not purposefully copied; arbitrary tool titles/descriptions may still contain sensitive text. Do not feed untrusted production reports to a public dashboard without classification and redaction.
- **Future job model:** explicit allow-list of repository IDs/refs, least-privilege read credentials, isolated ephemeral runner, no default network egress, resource/time limits and per-run audit log.
- **Active testing:** Shannon and Strix must remain disabled until a named owner authorizes scope, targets, allowed actions, window and environment. Prefer dedicated staging targets and synthetic data.
- **Evidence provenance:** persist immutable original artifact pointers plus SHA-256, scanner versions, commit SHA, environment and collection time where available. Do not fabricate unavailable metadata.
- **Cross-org privacy:** one organization's evidence must not be visible to another. Connection to external GRC services must be opt-in and explicit.
- **AI safety:** AI-generated remediation is advisory, not direct code execution; no auto-fix, commits, issue creation or credential use without separate approval.
- **Compliance honesty:** automated tool results never issue ISO certificates. Support internal audit, gap assessment and evidence gathering only.

Please report security vulnerabilities privately to the maintainer; do not add real secrets or exploitation details to public issues.
