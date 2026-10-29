# Security policy & limits (local MVP)

**Do not deploy this release as an internet-facing multi-tenant SaaS or store high-sensitivity production evidence without additional controls.**

## What is implemented

- Local-only HTTP bind by default (`127.0.0.1`); non-loopback bind requires a 24+ character bearer token.
- Token comparison via constant-time byte comparison.
- Deny cross-origin state-changing requests with an Origin check; JSON Content-Type required.
- Limited request payloads and bounded imported finding count.
- Metadata persistence as an atomic, owner-readable JSON file.
- Repository links registered as metadata only; no clone, fetch, code execution, auto-fix or automated scan.
- Read-only MCP tools, no remote write/scan tools.
- SHA-256 digests for supplied scanner JSON artifacts and provenance.
- Best-effort token masking and intentional omission of Trivy Secret Match/Code values.
- Explicit scope, reviewer and evidence required for reviewed control verdicts.
- No injected external scripts/styles; local static frontend and Content Security Policy.

## Known limitations

- Single-process JSON store; not safe for multiple app processes sharing one data file.
- Bearer token is single-operator protection, not RBAC, organizational identity or tenant isolation.
- Reviewer names are user-entered and are not cryptographically authenticated.
- Raw imported scanner values may contain sensitive descriptions despite best-effort masking; do not publish exports blindly.
- No audit evidence signature, immutable object store, comprehensive redaction, security scanner sandbox, policy approval workflow, independent validation of standard clause IDs or full regulatory controls.
- Tokens alone do not replace HTTPS, proper network segmentation and authentication hardening for remote environments.
- API endpoints have not been independently penetration tested.
- Active pentest integrations are not installed or enabled.
- A reviewed finding-to-control link is never sufficient to prove an accredited ISO assessment outcome.

## Future hardened deployment

Implement RBAC/SSO, explicit organization boundaries, hardened worker isolation, scalable persistence, artifact encryption at rest, secret management, read and write audit trails, immutable evidence retention, workflow approvals, abuse protection, and continuous independent security testing.

## Reporting a vulnerability

Please privately contact the maintainer rather than posting secrets or reproduction material into public GitHub issues.
