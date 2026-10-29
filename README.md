<div align="center">

# ◈ OmniAuditor

**Evidence-first, extensible audit & assurance workspace**

*Multiple repositories · Technical evidence · Standard control assessments · Unified reporting · Read-only MCP*

</div>

> **Status: v0.2 local MVP, not a finished autonomous ISO auditor.** The application is usable for project management, manual control assessments, SARIF/Trivy report import, finding reviews, control mappings and combined reporting. External scanning/agent orchestration, validated ISO certification readiness, multi-tenant RBAC, formal audit workflows and the other planned adapters are **not yet implemented**.

## Why OmniAuditor?

Traditional SAST tools, penetration-testing agents, software-quality reviews, and GRC systems produce separate reports. OmniAuditor is a common workspace designed to tie evidence to a project, repository, technical finding, and ultimately a reviewed standard requirement.

**Important distinction:** a technical scanner finding can indicate a risk, but does not itself establish an ISO management-system nonconformity. Zero findings does not mean "certified" or "compliant."

## Implemented now

- **Projects and repositories:** register multiple HTTPS repositories per project; no automatic cloning or credential collection.
- **Technical scanner imports:** SARIF 2.1 and Trivy JSON, with per-project/repo provenance and conservative exact-identity deduplication.
- **Evidence:** source identifiers, file/line when available, import timestamps and SHA-256 input digests; Trivy secret match/code fields are excluded.
- **Finding reviews:** confirmed, needs-review, false-positive, accepted-risk, resolved; reviewer and rationale.
- **Control mapping:** manually map findings to edition-pinned framework controls; mapping rationale and reviewer are required.
- **Control assessments:** conforms, partially-conforms, nonconforming, insufficient-evidence, not-applicable, not-assessed. Positive/negative conformity verdicts require linked evidence.
- **Unified reporting:** per-project JSON export and Markdown readiness report; separate offline CLI JSON/Markdown importer.
- **Dashboard:** responsive lightweight local web app with project selection, inventory, findings, reviews, framework registry, and downloadable reports.
- **Read-only MCP server:** connect MCP-capable AI coding tools to inspect workspaces and reports.
- **No mandatory runtime dependencies:** Node.js 20+.

## Quick start

```bash
git clone https://github.com/shahinesi/OmniAuditor.git
cd OmniAuditor
npm start
# Open http://127.0.0.1:4318
```

No npm install is necessary for the default local server. Create a project, add one or more repositories, and import **existing** scanner reports. The server never starts security scans, clones repositories or modifies audited code on its own.

### Offline CLI

```bash
node apps/cli/index.mjs ingest \
  --project shahr-man --repo carpet-core \
  --format sarif --file examples/sample.sarif.json \
  --format trivy --file examples/sample.trivy.json \
  --out out
```

The sample data is fictional. The CLI writes `out/audit-run.json` and `out/audit-report.md`, and does not modify the dashboard's stored workspace.

### Docker

```bash
cp .env.example .env
# Set a unique, long OMNIAUDITOR_TOKEN in .env
docker compose up -d
```

Compose binds to `127.0.0.1:4318`. When a token is set, unlock the dashboard using the **Access token** button. Protect any remote installation with a reverse proxy and HTTPS. See [operations guide](docs/OPERATIONS.md) for limitations.

### MCP

```bash
npm run mcp
```

Supported **read-only** tools: `list_projects`, `get_project`, `get_framework_catalog`, `get_audit_report`. Set the same `OMNIAUDITOR_DATA_DIR` used by the web process. No write, scan or certification tool is exposed.

## Integration roadmap

| Integration | Intended role | Current capability |
|---|---|---|
| MRA Auditor | Multi-domain audit methodology | Planned |
| SecuritySkills | Specialized agent skills | Planned |
| OWASP AppSec Agent | Security review assistance | Planned |
| Trivy | Vulnerabilities, containers, misconfiguration | **JSON file import** |
| Opengrep | Static analysis | **Generic SARIF import** |
| Shannon | Authorized active testing | Planned; not auto-enabled |
| Strix | Authorized active testing | Planned; not auto-enabled |
| CISO Assistant | External GRC platform | Optional; planned |
| Unicis Platform | External GRC platform | Optional; planned; confirm plan/API availability |
| DefectDojo | Vulnerability management | Optional; planned |

An entry in the table **does not** mean the project has installed, embedded or executed that external tool. Integrations must respect upstream licenses and permission requirements.

## Standards catalog

Version metadata for ISO/IEC 27001, ISO 9001, ISO/IEC 25010, ISO/IEC/IEEE 12207, ISO/IEC 20000-1, ISO 22301, ISO/IEC 27701, ISO/IEC 42001, OWASP ASVS, OWASP Top 10, OWASP API Security Top 10, and NIST SSDF. The catalog is **not** a reproduction of full proprietary ISO normative content and makes no certification claim.

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [Operations](docs/OPERATIONS.md) · [Security model](docs/SECURITY.md) · [Findings](docs/FINDINGS.md) · [Roadmap](docs/ROADMAP.md) · [Agent guidelines](AGENTS.md)

**Language policy:** the repository is currently documented in English. A maintained Persian translation and RTL/i18n documentation are planned for the final localization milestone.

## Development and validation

```bash
npm test
```

Tests are opt-in; no CI builds, tests, schema migrations or deployments are automatically initiated by this repository.

## Security

Do not import confidential scans into a public or untrusted environment. The local MVP does not implement organizational SSO, tenant isolation, an external scanning sandbox, or accredited certification workflows. All active testing requires separately authorized targets and environments.

## License

MIT — see [LICENSE](LICENSE).
