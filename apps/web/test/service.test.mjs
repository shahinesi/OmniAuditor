import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AuditService } from "../service.mjs";
import { JsonStore } from "../store.mjs";

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "omniauditor-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return new AuditService(new JsonStore(directory));
}
function sample() {
  return { version: "2.1.0", runs: [{ tool: { driver: { name: "synthetic-sast" } },
    results: [{ ruleId: "EXAMPLE", level: "warning", message: { text: "Review access checks" },
      locations: [{ physicalLocation: { artifactLocation: { uri: "src/auth.ts" },
        region: { startLine: 42 } } }] }] }] };
}

test("Create multiple repositories in one project and retrieve inventory", async t => {
  const service = await fixture(t);
  await service.createProject({ id: "shahr-man", name: "Shahr Man" });
  await service.addRepository("shahr-man", { id: "carpet-app", url: "https://github.com/example/carpet-app" });
  await service.addRepository("shahr-man", { id: "carpet-core", url: "https://github.com/example/carpet-core" });
  const project = await service.project("shahr-man");
  assert.equal(project.repositories.length, 2);
  assert.equal(project.summary.findings, 0);
  assert.equal(project.summary.assessments, 0);
});

test("Import, deduplicate, review, assess and report without fake ISO verdict", async t => {
  const service = await fixture(t);
  await service.createProject({ id: "p", name: "P" });
  await service.addRepository("p", { id: "r", url: "https://github.com/example/r" });
  const run = await service.importReport("p", {
    repositoryId: "r", format: "sarif", artifactName: "test.sarif.json", report: sample() });
  assert.equal(run.importedFindings, 1);
  const f = (await service.project("p")).findings[0];
  assert.equal(f.status, "needs-review");
  assert.deepEqual(f.controlMappings, []);
  await assert.rejects(service.importReport("p", {
    repositoryId: "r", format: "sarif", artifactName: "same.json", report: sample()
  }), /already imported/);
  await service.reviewFinding("p", f.id, {
    status: "confirmed", note: "Reproduced in isolated test", reviewer: "Alice" });
  const control = await service.assess("p", {
    frameworkId: "owasp-asvs", controlId: "5.0.0-EXAMPLE", status: "insufficient-evidence",
    rationale: "No full access tests were submitted", assessor: "Alice", evidenceIds: [f.id] });
  assert.equal(control.status, "insufficient-evidence");
  const report = await service.report("p");
  assert.match(report, /Insufficient evidence|insufficient-evidence/);
  assert.match(report, /not a certificate/i);
  assert.equal((await service.project("p")).summary.findings, 1);
});

test("Enforce valid evidence and reject unsupported repository URLs", async t => {
  const service = await fixture(t);
  await service.createProject({ id: "p", name: "P" });
  await assert.rejects(service.addRepository("p", {
    id: "invalid", url: "http://example.org/repo" }), /credential-free HTTPS/);
  await assert.rejects(service.assess("p", {
    frameworkId: "iso-27001", controlId: "A.8.3", status: "conforms",
    assessor: "Alice", rationale: "Claim without proof", evidenceIds: []
  }), /Evidence required/);
  await assert.rejects(service.assess("p", {
    frameworkId: "iso-27001", controlId: "A.8.3", status: "conforms",
    assessor: "Alice", rationale: "Unknown ID", evidenceIds: ["nonexistent"]
  }), /Unknown evidence/);
});

test("Do not export secret match data in Trivy artifacts", async t => {
  const service = await fixture(t);
  await service.createProject({ id: "p", name: "P" });
  await service.addRepository("p", { id: "r", url: "https://github.com/example/r" });
  await service.importReport("p", {
    repositoryId: "r", format: "trivy", artifactName: "secrets.json",
    report: { Results: [{ Target: "src/index.js", Secrets: [{
      RuleID: "test", Category: "Generic", Severity: "HIGH",
      Match: "MUST_NOT_EXPORT", Code: "MUST_NOT_EXPORT"
    }] }] }
  });
  const exported = JSON.stringify(await service.exportProject("p"));
  assert.ok(!exported.includes("MUST_NOT_EXPORT"));
  assert.equal((await service.project("p")).summary.highOrCritical, 1);
});
