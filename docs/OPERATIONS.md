# Running OmniAuditor

## Requirements

Node.js 20+ with no npm install needed for the local MVP.

## Start the dashboard

```bash
npm start
# http://127.0.0.1:4318
```

The server binds to loopback by default and writes metadata to `.omni-data/workspace.json`.
It does **not** clone repositories or start scans. You can:

1. Create a project, e.g. Shahr Man.
2. Add repositories, e.g. carpet-app and carpet-core, as HTTPS references.
3. Import a **previously generated** SARIF 2.1 or Trivy JSON file per repository.
4. Review individual findings with rationale and reviewer identity.
5. Assess standards controls with separate applicability and evidence.
6. Export a project-level JSON or Markdown evidence/readiness report.

Nothing requires access to GitHub accounts unless you manually use external tools to produce audit artifacts.

## Remote / server deployments

A remote listener requires an explicit strong bearer token:

```bash
OMNIAUDITOR_HOST=0.0.0.0 \
OMNIAUDITOR_PORT=4318 \
OMNIAUDITOR_TOKEN='REPLACE_WITH_A_RANDOM_SECRET_OF_32_PLUS_CHARACTERS' \
OMNIAUDITOR_DATA_DIR=/var/lib/omniauditor \
npm start
```

The UI has an **Access token** button. Paste the bearer token there; it remains in that tab's JavaScript memory and is not saved by the UI.

**Important:** a token alone is not sufficient for publicly exposed production installations. Put the application behind a properly configured HTTPS reverse proxy, restrict upstream reachability, handle backups and access logs, and implement organizational authentication/RBAC before storing sensitive enterprise assessments. Current implementation is suited to local or tightly restricted environments, not multi-tenant public SaaS.

### Docker

```bash
docker compose up -d
```

Compose binds to `127.0.0.1:4318` and uses a named data volume by default. Docker image contains only the local app and does not install scanners.

## Command-line report import

```bash
node apps/cli/index.mjs ingest --project shahr-man --repo carpet-core \
  --format sarif --file examples/sample.sarif.json \
  --format trivy --file examples/sample.trivy.json --out out
```

This standalone CLI writes a JSON and a Markdown report to `out/`, **not** to the dashboard workspace. To import into the dashboard, use the UI or HTTP endpoint.

## MCP (read-only)

```bash
OMNIAUDITOR_DATA_DIR=.omni-data node apps/mcp/server.mjs
```

Configure the host using `command: node`, `args: ["<absolute>/apps/mcp/server.mjs"]`, and the same `OMNIAUDITOR_DATA_DIR` as the web app. This stdio server provides `list_projects`, `get_project`, `get_framework_catalog`, and `get_audit_report`. There are no write or scanning tools.

## API examples

Create project:

```bash
curl -fsS -X POST http://127.0.0.1:4318/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"id":"shahr-man","name":"Shahr Man"}'
```

Add repository:

```bash
curl -fsS -X POST http://127.0.0.1:4318/api/projects/shahr-man/repositories \
  -H 'Content-Type: application/json' \
  -d '{"id":"carpet-core","url":"https://github.com/example/carpet-core","role":"api"}'
```

Import endpoint `POST /api/projects/:id/runs/import` expects `repositoryId`, `format` (`sarif` or `trivy`), `artifactName`, `report` (parsed JSON scanner report), optional `revision` (Git SHA).

Additional routes: `GET /api/projects`, `GET /api/projects/:id`, `GET /api/catalog`, `POST /api/projects/:id/assessments`, `POST /api/projects/:id/findings/:findingId/review`, `GET /api/projects/:id/report.md`, `GET /api/projects/:id/export.json`.

## Data notes and limitations

- Metadata storage is a single JSON file with atomic replacement. It is intended for **one server process**; not a high-concurrency production database.
- Review sensitive imports before sharing exported data. Text masking is best-effort, and raw report values might still include private data.
- Secret match/code snippets from Trivy are intentionally not included in normalized findings.
- Control references are manually entered and must be verified against the authorized edition of the standard.
- This is an audit **readiness** system, not an accredited certification service.
