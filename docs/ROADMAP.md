# OmniAuditor product roadmap

OmniAuditor's target is **continuous, evidence-first audit readiness** across technical and organizational controls. Accredited certification remains outside the platform's authority.

## Actual implementation status

| Capability | Status | Details |
| --- | --- | --- |
| Project registry / multiple repositories | Implemented (local MVP) | HTTPS references, no cloning |
| SARIF 2.1 + Trivy JSON ingestion | Implemented | Manual import, source digests |
| Finding review and conservatively deduplicated evidence | Implemented | Review rationale and actor |
| Standards/framework metadata catalog | Implemented | Not a normative text database |
| Manual standard control assessment | Implemented | Evidence references and assessor |
| Manual finding-to-control mapping | Implemented | Candidate/reviewed, no automatic nonconformity |
| Project JSON and Markdown reporting | Implemented | Not certification |
| Local dashboard | Implemented | Single-operator, English-only initial UI |
| Read-only MCP stdio server | Implemented | No writing or scanner execution |
| CLI offline report importer | Implemented | Separate from dashboard persistence |
| Trivy binary execution | Not implemented | Manual Trivy JSON import only |
| Opengrep binary execution | Not implemented | SARIF import only |
| MRA, SecuritySkills, OWASP AppSec Agent | Not implemented | Integration contracts planned |
| Shannon / Strix dynamic testing | Not implemented | Require scoped authorization |
| CISO Assistant / Unicis / DefectDojo sync | Not implemented | Optional APIs subject to availability |
| AI Chief Auditor autonomous orchestration | Not implemented | Needs bounded agents and verifier |
| Fully populated ISO clause catalog & SoA | Not implemented | Requires licensed standard text and assessment method |
| Organizational identity/RBAC and PostgreSQL | Not implemented | Do not expose as multi-tenant SaaS |
| Formal audit evidence signoff & certificates | Not implemented | Human/authority dependent |
| Bilingual English/Persian UI and documentation | Planned | After initial functionality stabilizes |

## Next engineering phases

1. **Verified data core:** PostgreSQL migration path, immutable evidence references, scoped access control, audit trail, artifact retention, snapshots, input redaction.
2. **Tool execution:** version-pinned and sandboxed adapters for Trivy/Opengrep, then other tools with explicit contracts and manual authorization for active testing.
3. **Assurance model:** comprehensive controls, applicability rules, evidence requirements, source-level citations, reviewer signoff, and conflict-resolution process.
4. **Chief Auditor:** bounded AI-assisted recommendation and standards mapping, source citation, deterministic validators, red-team testing of prompt injection.
5. **Ecosystem:** optional DefectDojo / CISO Assistant / Unicis adapters, reporting & notification flows.
6. **Production hardening:** RBAC, tenancy, rate limiting, backups, threat model, observability, CI and repeatable integration testing.
7. **Localization:** final English/Persian readmes, documents and RTL UI.

## Rules

- Always distinguish **planned**, **prototype**, **implemented**, **verified** and **certified**.
- Do not treat scanner silence as control conformity.
- Never claim a proprietary standard's official requirements were checked without correctly scoped evidence and authorized standard access.
- Do not auto-run builds, tests, migrations, deployments, penetration tests or changes to audited repositories.
