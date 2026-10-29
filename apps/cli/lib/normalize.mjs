import { createHash } from "node:crypto";
import path from "node:path";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function safeText(value, limit = 2000) {
  if (typeof value !== "string") return "";
  return value.slice(0, limit)
    .replace(/\b(ghp_|gho_|ghu_|ghs_|github_pat_)[a-zA-Z0-9_]{12,}\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, "[REDACTED_AWS_KEY]")
    .replace(/\b((?:api[_-]?key|password|access[_-]?token|secret)\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]");
}

function safeFile(value) {
  const name = safeText(value, 500).replaceAll("\\", "/");
  if (!name) return null;
  return name.startsWith("/") || /^[A-Za-z]:\//.test(name)
    ? "[absolute-path-omitted]/" + path.posix.basename(name)
    : name.replace(/^\.\//, "");
}

function location(file, line = null, component = null) {
  return { file: safeFile(file),
    line: Number.isSafeInteger(line) && line > 0 ? line : null,
    component: safeText(component, 250) || null };
}

export function severity(value) {
  const level = String(value ?? "").trim().toUpperCase();
  if (["CRITICAL", "FATAL"].includes(level)) return "critical";
  if (["HIGH", "ERROR"].includes(level)) return "high";
  if (["MEDIUM", "WARNING", "MODERATE"].includes(level)) return "medium";
  if (["LOW", "NOTE"].includes(level)) return "low";
  return "informational";
}

function makeFinding({ projectId, repositoryId, revision, format, tool, ruleId,
  title, description, originalSeverity, locations, remediation, artifact }) {
  const primary = locations[0] ?? location(null);
  const nativeRule = safeText(ruleId, 240) || "UNKNOWN_RULE";
  const fingerprint = sha256(JSON.stringify([
    projectId, repositoryId, format, tool, nativeRule,
    primary.file, primary.line, primary.component,
    primary.file ? null : safeText(description, 350)
  ]));
  return {
    id: "F-" + fingerprint.slice(0, 16),
    fingerprint, projectId, repositoryId, revision,
    title: safeText(title, 500) || nativeRule,
    description: safeText(description, 2500) || null,
    severity: severity(originalSeverity),
    confidence: "unverified",
    status: "needs-review",
    locations: locations.length ? locations : [location(null)],
    sources: [{ tool: safeText(tool, 160) || format, format, ruleId: nativeRule }],
    evidence: [{ kind: "scanner-artifact", artifactName: artifact.name,
      sha256: artifact.sha256, reference: "artifact:sha256:" + artifact.sha256 }],
    remediation: safeText(remediation, 1500) || null,
    controlMappings: []
  };
}

function fromSarif(input, ctx) {
  if (!Array.isArray(input?.runs)) throw new Error("Invalid SARIF: expected runs[]");
  const found = [];
  for (const run of input.runs) {
    const tool = safeText(run?.tool?.driver?.name, 160) || "unknown-sarif-tool";
    if (!Array.isArray(run?.results)) continue;
    for (const item of run.results) {
      const primary = item?.locations?.[0]?.physicalLocation;
      const ruleId = item?.ruleId ?? (Number.isInteger(item?.ruleIndex)
        ? run?.tool?.driver?.rules?.[item.ruleIndex]?.id : null);
      found.push(makeFinding({
        ...ctx, format: "sarif", tool, ruleId,
        title: item?.message?.text ?? item?.message?.markdown ?? ruleId,
        description: item?.message?.text ?? item?.message?.markdown ?? "",
        originalSeverity: item?.level ?? "note",
        locations: [location(primary?.artifactLocation?.uri,
          primary?.region?.startLine,
          item?.logicalLocations?.[0]?.fullyQualifiedName)],
        remediation: null
      }));
    }
  }
  return found;
}

function fromTrivy(input, ctx) {
  if (!Array.isArray(input?.Results)) throw new Error("Invalid Trivy JSON: expected Results[]");
  const found = [];
  for (const result of input.Results) {
    const target = result?.Target ?? null;
    for (const v of (Array.isArray(result?.Vulnerabilities) ? result.Vulnerabilities : [])) {
      found.push(makeFinding({
        ...ctx, format: "trivy-json", tool: "trivy",
        ruleId: v?.VulnerabilityID ?? "UNKNOWN_CVE",
        title: v?.Title ?? v?.VulnerabilityID ?? "Dependency vulnerability",
        description: v?.Description ?? "", originalSeverity: v?.Severity,
        locations: [location(target, null, v?.PkgName)],
        remediation: v?.FixedVersion ? "Review fixed version: " + safeText(v.FixedVersion, 100) : null
      }));
    }
    for (const m of (Array.isArray(result?.Misconfigurations) ? result.Misconfigurations : [])) {
      found.push(makeFinding({
        ...ctx, format: "trivy-json", tool: "trivy",
        ruleId: m?.ID ?? "UNKNOWN_CONFIG",
        title: m?.Title ?? "Configuration observation",
        description: m?.Description ?? "", originalSeverity: m?.Severity,
        locations: [location(m?.CauseMetadata?.File ?? target, m?.CauseMetadata?.StartLine)],
        remediation: m?.Resolution ?? null
      }));
    }
    for (const s of (Array.isArray(result?.Secrets) ? result.Secrets : [])) {
      // Match, Code, and snippets must NEVER be exported.
      found.push(makeFinding({
        ...ctx, format: "trivy-json", tool: "trivy",
        ruleId: s?.RuleID ?? "POSSIBLE_SECRET",
        title: "Possible exposed secret (" + safeText(s?.Category, 120) + ")",
        description: "Possible secret detected; raw value and snippet omitted.",
        originalSeverity: s?.Severity ?? "high",
        locations: [location(target, s?.StartLine)],
        remediation: "Investigate privately, remove exposure and rotate credential."
      }));
    }
  }
  return found;
}

export function normalizeArtifact(input, format, ctx) {
  if (format === "sarif") return fromSarif(input, ctx);
  if (format === "trivy") return fromTrivy(input, ctx);
  throw new Error("Unsupported format: " + format);
}

export function mergeExactDuplicates(findings) {
  const fingerprints = new Map();
  for (const item of findings) {
    const existing = fingerprints.get(item.fingerprint);
    if (!existing) { fingerprints.set(item.fingerprint, item); continue; }
    for (const e of item.evidence) {
      if (!existing.evidence.some(old => old.sha256 === e.sha256)) existing.evidence.push(e);
    }
  }
  return [...fingerprints.values()].sort((a, b) => a.id.localeCompare(b.id));
}
