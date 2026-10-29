import test from "node:test";
import assert from "node:assert/strict";
import { normalizeArtifact, mergeExactDuplicates } from "../lib/normalize.mjs";
import { markdownReport } from "../lib/report.mjs";

const ctx = { projectId: "shahr-man", repositoryId: "carpet-core",
  revision: null, artifact: { name: "sample.json", sha256: "a".repeat(64) } };

test("SARIF findings retain evidence and never auto-map ISO", () => {
  const scan = { runs: [{ tool: { driver: { name: "example" } }, results: [{
    ruleId: "R1", level: "warning", message: { text: "Potential authorization issue" },
    locations: [{ physicalLocation: { artifactLocation: { uri: "src/auth.ts" },
      region: { startLine: 24 } } }]
  }] }] };
  const [finding] = normalizeArtifact(scan, "sarif", ctx);
  assert.equal(finding.severity, "medium");
  assert.equal(finding.status, "needs-review");
  assert.deepEqual(finding.controlMappings, []);
  assert.equal(finding.locations[0].line, 24);
  assert.equal(finding.evidence[0].sha256, "a".repeat(64));
});

test("Trivy raw secret match and absolute workspace paths are never exported", () => {
  const scan = { Results: [{ Target: "/private/source/file.txt", Secrets: [{
    RuleID: "R2", Severity: "HIGH", Match: "TOP_SECRET_SHOULD_NOT_APPEAR",
    Code: "TOP_SECRET_SHOULD_NOT_APPEAR", StartLine: 10, Category: "generic"
  }] }] };
  const output = JSON.stringify(normalizeArtifact(scan, "trivy", ctx));
  assert.ok(!output.includes("TOP_SECRET_SHOULD_NOT_APPEAR"));
  assert.ok(!output.includes("/private/source/"));
});

test("exact duplicates merge but findings from distinct tools remain distinct", () => {
  const base = { ruleId: "R", message: { text: "x" } };
  const scan = { runs: [{ tool: { driver: { name: "A" } }, results: [base, base] }] };
  const findings = normalizeArtifact(scan, "sarif", ctx);
  assert.equal(mergeExactDuplicates(findings).length, 1);
  const second = normalizeArtifact({ runs: [{
    tool: { driver: { name: "B" } }, results: [base] }] }, "sarif", ctx);
  assert.equal(mergeExactDuplicates([...findings, ...second]).length, 2);
});

test("no-findings report never claims conformity", () => {
  const output = markdownReport({ projectId: "p", repositoryId: "r",
    revision: null, generatedAt: "2026-01-01", runId: "r1", inputs: [], findings: [] });
  assert.match(output, /NOT AN ISO CERTIFICATE/);
  assert.match(output, /not assessed/);
  assert.match(output, /zero findings/);
});
