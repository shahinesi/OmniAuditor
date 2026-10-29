# OmniAuditor

**Evidence-first, extensible software auditing and assurance.**

OmniAuditor is a planned AI-assisted audit hub for software repositories, technical controls, quality, operational risk, and compliance readiness. A project can contain many repositories; each assessment should trace its conclusions to explicit evidence and versioned standards.

> **Foundation status (Phase 0):** an offline, read-only JSON importer for SARIF and Trivy results, a normalized findings contract, and technical Markdown/JSON output. No external scanner, agent, dashboard, MCP server, GRC sync, or ISO certification capability is implemented yet.

## Quick start (offline imported reports only)

Node.js 20+ is required; no installation is necessary for the current CLI.

```bash
node apps/cli/index.mjs ingest \
  --project shahr-man \
  --repo carpet-core \
  --format sarif \
  --file examples/sample.sarif.json \
  --out ./out
```

You may repeat `--format FORMAT --file PATH` pairs for additional reports from the **same repository**. Run again for a different repository. No network, scanning, build, test, or deployment is triggered by `ingest`.

Outputs: `out/audit-run.json` and `out/audit-report.md`. These are *technical findings*, not an ISO conformity determination. Input files must be trusted scanner artifacts; the importer never executes their content.

## What comes next

- Multi-project / multi-repository inventory, relationships, versioned snapshots and jobs.
- Sandboxed tool adapters: Trivy, Opengrep, Shannon, Strix, OWASP AppSec Agent, MRA Auditor, SecuritySkills.
- Optional external systems: DefectDojo, CISO Assistant, Unicis.
- Versioned framework catalog, control-by-control assessment, evidence ledger, reviewer approval.
- AI Chief Auditor, read-only-by-default MCP, dashboard, continuous re-assessment.

See [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), [finding lifecycle](docs/FINDINGS.md), [security boundaries](docs/SECURITY.md), [integration registry](integrations/registry.json) and [standards catalog](standards/frameworks.json).

## Non-negotiable rules

1. Findings must identify scope, source, and evidence. No invented source lines, results, or control mappings.
2. `not-assessed`, `insufficient-evidence`, and `not-applicable` are different from `conforms`.
3. A technical scanner alert does **not** automatically prove an ISO management-system nonconformity.
4. Active tests, write actions, repository access, and data export require appropriate explicit authorization.
5. AI and scanners can support audit readiness, but cannot grant accredited ISO certificates.
6. Avoid exposing secrets, personal data, or customer/production records in exported findings.

**Development policy:** never run build, tests, migrations, infrastructure changes or deployments implicitly. No CI automation is configured in this foundation.

**License:** not chosen yet; public source code is not automatically licensed for reuse.
