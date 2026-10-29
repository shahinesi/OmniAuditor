# Architecture — proposed target and implemented subset

## Target system

```text
Projects (many repos, services, environments)
  -> Scoped audit plans / authorized jobs
  -> Isolated connectors and runners
       -> Trivy, Opengrep, external SARIF
       -> Shannon / Strix (active, opt-in only)
       -> MRA / OWASP AppSec Agent / SecuritySkills
       -> documents, people, operations evidence
  -> Ingestion & normalization
  -> Evidence provenance / immutable references / deduplication
  -> Framework / control mapping (versioned and reviewed)
  -> Human review + AI Chief Auditor (proposals, not verdict authority)
  -> Findings and assessments
  -> JSON / Markdown / SARIF / PDF / dashboard / MCP
  -> Optional DefectDojo, CISO Assistant, Unicis integrations
```

**Implemented in Phase 0:** local, explicit SARIF/Trivy JSON input -> normalized findings -> JSON/Markdown. No automatic execution or network access.

## Repository layout

- `apps/cli/`: offline input import and report output.
- `contracts/`: normalized findings and audit-run JSON Schemas.
- `integrations/`: planned adapters and their integration state.
- `standards/`: names and versions only, not proprietary ISO normative text.
- `examples/`: fictional synthetic test artifacts.
- `docs/`: governance, boundaries, architecture and stages.

## Design decisions

1. **Project > repository > environment > run:** repository-specific findings and cross-repository relationships are distinct. An aggregated project verdict cannot be inferred from one scanned repo.
2. **Tool outputs are evidence sources, not judgments:** preserve tool identifier, source artifact digest, original rule ID, location and revision when known.
3. **Conservative deduplication:** automatically deduplicate only repeated results sharing the same repository, rule, file, line, and component within a tool/format. Cross-tool correlation requires human or validated logic.
4. **Versioned control catalog:** mapping needs framework, edition, control ID, mapping rationale, scope, and reviewer verification. The foundation deliberately does not auto-map technical findings to ISO clauses.
5. **No single pass percentage:** control-level statuses need clear tested scope, sampling, required evidence, reviewer and history. Absence of findings is not evidence of conformity.
6. **Plugin registry:** integrations declare capabilities, data formats, license and operational safety. Being listed in the registry is *not* being installed or operational.
7. **Security:** minimize scanner privilege, do not execute code from incoming artifacts, redact sensitive values, segregate tenants/projects, and avoid external uploads unless authorized.

## Suggested future stack

TypeScript core and isolated runners; NestJS API, PostgreSQL for metadata, object storage for evidence, Next.js/shadcn/ui for RTL-capable interface. Current Phase 0 intentionally uses dependency-free Node.js ESM so the data model is developed before services are provisioned.

## Explicitly out of scope in Phase 0

Repository cloning and credential handling; actual scans; dynamic testing; LLM analysis; standards verdict engine; ISO SoA and risk workshops; audit management; web dashboard; PDF generation; MCP/API servers; scheduling; persistence beyond the generated files.
