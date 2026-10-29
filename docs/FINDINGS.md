# Findings, evidence and compliance assessments

## Technical finding

A tool may report a possible issue; it is represented as a **finding**, not an ISO nonconformity. Fields include:

- `id` and `fingerprint`: stable within project/repo/format/rule/location/component.
- `projectId`, `repositoryId`: explicit ownership.
- `title`, `description`, `severity`, `confidence`, `status`.
- `locations`: file, optional line, component; unknown is legitimate.
- `sources`: tool name, native rule ID, output format.
- `evidence`: input artifact SHA-256 and scoped artifact reference; no raw secrets.
- `remediation`: supported recommendations or `null`.
- `controlMappings`: initially empty; needs independently verified standards crosswalk.
- `review`: optional reviewer decision and explanatory basis (later stage).

## Separate control assessment

An assessment of `ISO/IEC 27001:2022` Annex A or OWASP ASVS is an **independent reviewed record** including applicability, required evidence, testing method, scope, assessor and verdict. A tool finding can support that record but cannot alone finalize management-system conformity.

States (future):
`not-assessed`, `insufficient-evidence`, `not-applicable`, `conforms`, `partially-conforms`, `nonconforming`.

## Confidence and freshness

Imported scanner findings use status `needs-review` and confidence `unverified` by default. Rules may be false positives. Runs without a repository revision are marked with an unknown revision. Evidence does not stay valid forever when the target changes.

## Duplicate policy

The importer merges exact duplicate identities within the same tool format + repo + rule + primary location + component and retains distinct input evidence. Do not merge cross-tool findings solely because their descriptions look similar. A future correlation engine must preserve source-specific details and allow reviewer override.

## Privacy and confidentiality

Raw scanner artifacts may contain secrets or internal paths. Do not publish production artifacts in this public repository. Importer excludes secret match values and code snippets, but *cannot guarantee redaction of arbitrary tool-supplied titles or descriptions*. Review exports before sharing.
