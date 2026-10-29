function escapeMd(value) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ")
    .replace(/[\\*_{}\[\]()<>#+.!|\x60]/g, "\\$&");
}

export function markdownReport(run) {
  const lines = [
    "# OmniAuditor — Imported technical findings",
    "",
    "**THIS IS NOT AN ISO CERTIFICATE OR A CONTROL-CONFORMITY AUDIT.**",
    "",
    "- Project: " + escapeMd(run.projectId),
    "- Repository: " + escapeMd(run.repositoryId),
    "- Revision: " + escapeMd(run.revision ?? "unknown"),
    "- Generated: " + escapeMd(run.generatedAt),
    "- Run ID: " + escapeMd(run.runId),
    "- Findings (unreviewed): " + run.findings.length,
    "- Standards assessment: **not assessed**",
    "- Coverage: **unknown**; zero findings must never be interpreted as a pass.",
    "",
    "## Imported artifacts",
    ""
  ];
  for (const artifact of run.inputs) {
    lines.push("- " + escapeMd(artifact.name) + " (" + escapeMd(artifact.format)
      + "; SHA-256: " + artifact.sha256 + ")");
  }
  lines.push("", "## Findings", "");
  if (run.findings.length === 0) {
    lines.push("No results were reported in the supplied files. This does not prove that the repository is secure or compliant.", "");
  }
  for (const f of run.findings) {
    lines.push("### " + escapeMd(f.id) + " — " + escapeMd(f.title), "");
    lines.push("- Severity: **" + escapeMd(f.severity) + "**");
    lines.push("- Review: " + escapeMd(f.status) + " / " + escapeMd(f.confidence));
    lines.push("- Origin: " + f.sources.map(s => escapeMd(s.tool + " / " + s.ruleId)).join(", "));
    lines.push("- Location: " + f.locations.map(l => escapeMd(l.file ?? "unknown")
      + (l.line ? ":" + l.line : "") + (l.component ? " (" + escapeMd(l.component) + ")" : "")).join("; "));
    lines.push("- Evidence: " + f.evidence.map(e => escapeMd(e.artifactName) + " (" + e.sha256 + ")").join(", "));
    lines.push("- Standard mapping: **not assessed**");
    if (f.description) lines.push("- Description: " + escapeMd(f.description));
    if (f.remediation) lines.push("- Suggested remediation: " + escapeMd(f.remediation));
    lines.push("");
  }
  lines.push("## Interpretation", "",
    "Tool output is provisional evidence, not a reviewer-confirmed vulnerability or management-system nonconformity.",
    "Mappings to ISO, OWASP or NIST controls require verified control identifiers, scope and additional evidence.",
    "Unscanned repositories, operations, policies, business processes and human controls are not evaluated.",
    "");
  return lines.join("\n");
}
