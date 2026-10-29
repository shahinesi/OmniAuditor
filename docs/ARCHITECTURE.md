# OmniAuditor architecture (v0.2)

## Target

```text
Project
 ├── Repository A ── Tool report ──┐
 ├── Repository B ── Tool report ──┤
 └── Business/process evidence ───┘ (future)
                                   ↓
                    Ingestion & evidence provenance
                                   ↓
                    Normalized technical findings
                                   ↓
                 Human review + control relevance map
                                   ↓
              Separately reviewed control assessments
                                   ↓
            Project JSON / Markdown / Dashboard / MCP
```

The current prototype runs on Node.js 20+ with a dependency-free HTTP server, responsive HTML/CSS/JS dashboard, and an atomic single-process JSON workspace. The CLI supports offline scan file normalization. MCP uses JSON-RPC over stdio and is read-only.

This initial architecture intentionally uses no Next.js, NestJS, Prisma, or PostgreSQL dependencies. Migration to a service architecture should only happen when multi-user permissions, concurrent workflows, and larger evidence volumes justify the operational cost.

## Implemented modules

- `apps/web/store.mjs` — persistent single-process JSON workspace (atomic temp-file replace).
- `apps/web/service.mjs` — application layer: projects, repositories, imports, findings, reviews, mappings, assessments, reports.
- `apps/web/server.mjs` — local HTTP API and static dashboard, with token required for non-loopback binding.
- `apps/web/public/` — lightweight dashboard. English only for now.
- `apps/cli/` — standalone read-only SARIF and Trivy artifact importer.
- `apps/mcp/` — MCP stdio server exposing read-only project, catalog, and report tools.
- `contracts/` — CLI import schemas; the HTTP project workspace is independently represented and will need published schemas.
- `integrations/registry.json` — planned/available import capabilities with explicit statuses.
- `standards/frameworks.json` — metadata catalog, not the proprietary official text.

## Correctness boundaries

1. Project is a logical grouping, while each finding points to one repository and source artifact.
2. Reporter imports are **unverified findings**. Import alone never grants control conformity.
3. SHA-256 hashes identify imported evidence. Original raw scanner reports are deliberately not persisted by the dashboard.
4. Fingerprints deduplicate exact within-tool matches only; cross-tool equivalence is not assumed.
5. Control mappings carry framework version, control ID, rationale and reviewer, and are not themselves formal nonconformities.
6. Control assessments require explicit assessor, scope, rationale and linked evidence for conforms/partially-conforms/nonconforming.
7. Missing data is never a pass. This platform does not issue certificates.
8. The application is local-first and single-process. PostgreSQL, RBAC, isolated scanner workers, and multi-tenant architecture are future work.

## External adapter principles

MRA Auditor, SecuritySkills, OWASP AppSec Agent, Trivy, Opengrep, Shannon, Strix, CISO Assistant, Unicis, and DefectDojo are separate external projects. Never vendor third-party sources or assume their licenses permit embedding. Do not mark planned integrations operational. Active testing requires specifically authorized scope, target and time window.

## Security restrictions

The dashboard only imports existing reports; the repository URL is stored as metadata and is never fetched. Remote listener requires a strong bearer token, but production SSO, fine-grained authorization, backups, data retention and external scanner sandboxes have not yet been built. See [SECURITY](SECURITY.md).
