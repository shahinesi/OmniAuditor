# OmniAuditor

**An evidence-first, extensible audit and assurance hub for software projects.**

> Status: early foundation. No scanners, AI agents, or certification workflows are operational yet.

OmniAuditor will connect multiple repositories, specialized audit agents, security scanners, and compliance frameworks into one traceable assessment workflow.

## Principles

- One project can contain multiple repositories and services.
- Each finding must identify its source, evidence, affected location, impact, and suggested remediation.
- Technical findings are **not automatically ISO nonconformities**; framework mapping requires review.
- Unknown, not tested, and insufficient evidence are first-class outcomes—not a pass.
- Integrations run with explicit permission and least privilege; active penetration tests require separate authorization.
- Reports are reproducible and must identify tool and standard versions.
- AI provides recommendations, never fabricates evidence or issues certificates.

## Scope

Architecture and first adapter contracts are being developed separately from the production application. No external source repository is copied or vendored.

## Status

This initial README only establishes the repository. See the forthcoming foundation pull request for the first implementation.

## License

License selection is pending; the repository being public does not grant redistribution rights.
