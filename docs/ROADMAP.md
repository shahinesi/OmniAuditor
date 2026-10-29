# Roadmap

Delivery is gated by evidence, security and reproducibility rather than claims of "one-click certification."

| Stage | Deliverables | Exit gate |
| --- | --- | --- |
| 0 — Offline foundation | Model, schemas, tool registry, SARIF/Trivy import, Markdown/JSON | Safe imports; outputs distinguish reported findings from audited controls |
| 1 — Project workspace | Projects, many repositories, revision identity, run history, scoped permissions, persistent evidence | Every finding traceable to project/repository/run/commit |
| 2 — Technical adapters | Trivy, Opengrep, MRA, SecuritySkills, OWASP AppSec Agent; optional staging-only Shannon/Strix | Exact version capture; sandbox & opt-in for active tools |
| 3 — Standards & governance | Control-level assessment, ISO/OWASP/NIST catalog, evidence requests, reviewer signoff, GRC exports | No certification or false-positive mapping claims |
| 4 — AI Chief Auditor | Proposed analysis, remediation, counter-evidence, reviewer workflow | AI claims backed by source evidence and revision |
| 5 — UX/MCP/automation | Dashboard, MCP + CLI, PDF, scheduling, comparisons, optional GRC sync | RBAC, tenant isolation, audit log, safe defaults |

## Integrations

The intended ecosystem includes all previously discussed tools: MRA Auditor, SecuritySkills, OWASP AppSec Agent, Trivy, Opengrep, Shannon, Strix, CISO Assistant, Unicis, and DefectDojo. These have distinct roles and incompatible licenses/terms or deployment costs. Do **not** vendor their code automatically, assume a free integration API/MCP tier, or claim they are operational.

## Acceptance criteria for compliance

For each control: standard + version + identifier, applicability rationale, explicit testing method, evidence references, assessor, review date, and one of `conforms`, `partially-conforms`, `nonconforming`, `insufficient-evidence`, `not-assessed`, `not-applicable`. A pass never follows solely from zero scanner findings.

## Operational note

Never auto-run tests, builds, migrations, deployments, scans against live services, or modifications to audited repositories. Approval must be scoped per action.
