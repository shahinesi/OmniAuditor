# Evidence-backed findings and standards assessments

A **finding** is a report of a possible technical concern associated with a project, repository and scanner artifact. It is not automatically a vulnerability, a failed ISO control, or an ISO nonconformity.

## Normalized finding

- Unique `id` and stable tool-scope `fingerprint`.
- `projectId`, `repositoryId`, `revision` (nullable).
- `title`, `description`, `severity`, `confidence`, `status`.
- `locations`: file, optional line and component.
- `sources`: tool, input format, native rule ID.
- `evidence`: artifact basename, SHA-256 digest and reference.
- `remediation`: optional tool-supplied suggestion.
- `controlMappings`: zero or more reviewed/candidate framework control references.

Import retains unknown/null when no source location exists and masks some secret patterns. Security-sensitive raw match snippets from Trivy are intentionally discarded. Arbitrary descriptions may still contain sensitive text; imported reports must be reviewed before export.

## Finding review

Review statuses: `needs-review`, `confirmed`, `false-positive`, `accepted-risk`, `resolved`. Reviewer identity and decision rationale are recorded, but current local MVP does not independently authenticate reviewer identities.

## Control relevance mapping

A user may link a finding to a framework control edition and exact control ID, with mapping rationale and reviewer. Mapping statuses: `candidate` or `reviewed`. **A relevance mapping does not declare an organizational nonconformity**. Cross-framework mappings should be reviewed by a qualified assessor.

## Separate control assessment

Independent records include project, framework, edition, control, scope, assessor, evidence references, verdict, rationale and revision history. Verdict statuses:

- `not-assessed`
- `insufficient-evidence`
- `not-applicable`
- `conforms`
- `partially-conforms`
- `nonconforming`

Evidence IDs must refer to an imported scanner run or finding within the same project. The current MVP only stores these technical evidence types; it cannot verify policy execution, human procedures, risk acceptance, training or business continuity. Consequently, no project-level ISO certificate or complete control coverage can be inferred.

## Duplicate policy

Within the same project/repository/format/tool/native rule/primary location/component, the import path merges repeated findings and accumulates evidence references. It never silently merges distinct tools just because descriptions are similar. False positives require reviewer disposition.

## Freshness

Each reported finding has `firstSeen`, `lastSeen`, `occurrences`, and optional revision. A new import does not automatically mark old findings resolved because partial scans or changed scope could hide them. This prevents false claims of remediation.

## Reports

Both dashboard exports and standalone CLI reports clearly state their limitations. JSON export preserves structured records; Markdown is aimed at human review. Neither is an accredited compliance certificate.
