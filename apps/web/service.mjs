import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sha256, normalizeArtifact, mergeExactDuplicates } from "../cli/lib/normalize.mjs";
import { markdownReport } from "../cli/lib/report.mjs";

const ROOT = new URL("../../", import.meta.url);
const ISO_STATUSES = new Set(["not-assessed", "insufficient-evidence", "not-applicable",
  "conforms", "partially-conforms", "nonconforming"]);
const REVIEW_STATUSES = new Set(["needs-review", "confirmed", "false-positive",
  "accepted-risk", "resolved"]);

function required(value, field, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw Object.assign(new Error(field + " must be 1-" + max + " characters"), { code: 400 });
  return value.trim();
}
function optional(value, max = 1000) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max)
    throw Object.assign(new Error("Invalid text field"), { code: 400 });
  return value.trim();
}
function slug(value) {
  const id = required(value, "identifier", 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(id))
    throw Object.assign(new Error("Invalid identifier"), { code: 400 });
  return id;
}
function fail(message, code = 404) { throw Object.assign(new Error(message), { code }); }
function log(state, type, subject, detail = "") {
  state.activity.push({ id: randomUUID(), at: new Date().toISOString(),
    type, subject, detail: detail.slice(0, 200) });
  if (state.activity.length > 1500) state.activity.splice(0, state.activity.length - 1500);
}
function ensureProject(state, id) {
  const p = state.projects.find(p => p.id === id);
  if (!p) fail("Project not found");
  return p;
}
function ensureRepo(state, projectId, id) {
  const repo = state.repositories.find(r => r.projectId === projectId && r.id === id);
  if (!repo) fail("Repository not found");
  return repo;
}
export class AuditService {
  constructor(store) { this.store = store; }

  async catalog() {
    const [frameworks, integrations] = await Promise.all([
      readFile(new URL("../../standards/frameworks.json", import.meta.url), "utf8"),
      readFile(new URL("../../integrations/registry.json", import.meta.url), "utf8")
    ]);
    return { frameworks: JSON.parse(frameworks).frameworks,
      integrations: JSON.parse(integrations).integrations };
  }

  async projects() {
    const s = await this.store.read();
    return s.projects.map(p => {
      const repositories = s.repositories.filter(r => r.projectId === p.id);
      const findings = s.findings.filter(f => f.projectId === p.id);
      const assessments = s.assessments.filter(a => a.projectId === p.id);
      return { ...p, repositoryCount: repositories.length, findingCount: findings.length,
        assessmentsCount: assessments.length };
    });
  }

  async createProject(body) {
    const name = required(body?.name, "name");
    const description = optional(body?.description);
    const id = body?.id ? slug(body.id) : "proj-" + randomUUID().slice(0, 8);
    return this.store.mutate(s => {
      if (s.projects.some(p => p.id === id)) fail("Project ID already exists", 409);
      const p = { id, name, description, createdAt: new Date().toISOString() };
      s.projects.push(p);
      log(s, "project.created", id);
      return p;
    });
  }

  async addRepository(projectId, body) {
    const id = slug(body?.id);
    const name = optional(body?.name, 120) || id;
    const url = required(body?.url, "url", 600);
    let parsed;
    try { parsed = new URL(url); } catch { fail("Invalid repository URL", 400); }
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username ||
        parsed.password || parsed.search || parsed.hash)
      fail("Repository URL must be credential-free HTTPS without query or fragment", 400);
    const role = optional(body?.role, 60);
    return this.store.mutate(s => {
      ensureProject(s, projectId);
      if (s.repositories.some(r => r.projectId === projectId && r.id === id))
        fail("Repository ID already exists", 409);
      const repository = { id, projectId, name, url: parsed.toString(),
        role, createdAt: new Date().toISOString() };
      s.repositories.push(repository);
      log(s, "repository.added", projectId + "/" + id);
      return repository;
    });
  }

  async project(id) {
    const s = await this.store.read();
    const project = ensureProject(s, id);
    const repositories = s.repositories.filter(x => x.projectId === id);
    const runs = s.runs.filter(x => x.projectId === id).map(x => ({
      id: x.id, repositoryId: x.repositoryId, format: x.format, artifactName: x.artifactName,
      sha256: x.sha256, importedAt: x.importedAt, findingCount: x.findingCount,
      revision: x.revision
    })).reverse();
    const findings = s.findings.filter(x => x.projectId === id);
    const assessments = s.assessments.filter(x => x.projectId === id);
    return { project, repositories, runs, findings, assessments,
      activity: s.activity.filter(x => x.subject === id || x.subject.startsWith(id + "/")).slice(-50).reverse(),
      summary: {
        repositories: repositories.length, runs: runs.length, findings: findings.length,
        unreviewed: findings.filter(f => f.status === "needs-review").length,
        highOrCritical: findings.filter(f => ["high", "critical"].includes(f.severity)
          && !["false-positive", "resolved"].includes(f.status)).length,
        assessments: assessments.length,
        conforming: assessments.filter(a => a.status === "conforms").length,
        notAssessed: "Framework-wide status unknown until all applicable controls are evaluated"
      }
    };
  }

  async importReport(projectId, body) {
    const repositoryId = slug(body?.repositoryId);
    const format = required(body?.format, "format", 30);
    if (!["sarif", "trivy"].includes(format)) fail("Only sarif and trivy formats supported", 400);
    const artifactName = required(body?.artifactName, "artifactName", 180);
    if (!/^[\w.\- ]{1,180}$/.test(artifactName) || artifactName.startsWith("."))
      fail("Artifact name must be a simple filename", 400);
    const revision = body?.revision ? required(body.revision, "revision", 64) : null;
    if (revision && !/^[a-f0-9]{7,64}$/i.test(revision)) fail("Invalid hexadecimal revision", 400);
    const raw = JSON.stringify(body?.report ?? null);
    if (raw.length > 3_000_000) fail("Report exceeds 3 MB limit", 413);
    if (!body?.report || typeof body.report !== "object" || Array.isArray(body.report))
      fail("report must be a JSON object", 400);
    const digest = sha256(raw);
    const artifact = { name: artifactName, sha256: digest };
    let normalized;
    try {
      normalized = normalizeArtifact(body.report, format, {
        projectId, repositoryId, revision, artifact
      });
    } catch (error) { fail("Invalid scanner artifact: " + error.message, 400); }
    if (normalized.length > 10_000) fail("Too many findings in one import", 413);
    return this.store.mutate(s => {
      ensureRepo(s, projectId, repositoryId);
      if (s.runs.some(r => r.projectId === projectId && r.repositoryId === repositoryId &&
        r.sha256 === digest && r.format === format))
        fail("Artifact already imported for this repository", 409);
      const now = new Date().toISOString();
      const run = { id: "run-" + randomUUID().slice(0, 12), projectId, repositoryId,
        format, artifactName, sha256: digest, importedAt: now,
        revision, findingCount: normalized.length };
      s.runs.push(run);
      for (const incoming of mergeExactDuplicates(normalized)) {
        const existing = s.findings.find(f => f.projectId === projectId &&
          f.repositoryId === repositoryId && f.fingerprint === incoming.fingerprint);
        if (existing) {
          existing.lastSeen = now;
          existing.occurrences += 1;
          existing.revision = revision;
          for (const e of incoming.evidence) {
            if (!existing.evidence.some(x => x.sha256 === e.sha256)) existing.evidence.push(e);
          }
        } else {
          s.findings.push({ ...incoming, firstSeen: now, lastSeen: now, occurrences: 1,
            review: null });
        }
      }
      log(s, "artifact.imported", projectId + "/" + repositoryId, format + ": " + artifactName);
      return { run, importedFindings: normalized.length,
        distinctFindingsInProject: s.findings.filter(f => f.projectId === projectId).length };
    });
  }

  async reviewFinding(projectId, findingId, body) {
    const status = required(body?.status, "status", 40);
    if (!REVIEW_STATUSES.has(status)) fail("Invalid review status", 400);
    const reviewer = required(body?.reviewer, "reviewer", 120);
    const note = required(body?.note, "review note", 2000);
    return this.store.mutate(s => {
      ensureProject(s, projectId);
      const f = s.findings.find(f => f.projectId === projectId && f.id === findingId);
      if (!f) fail("Finding not found");
      f.status = status;
      f.review = { reviewer, note, reviewedAt: new Date().toISOString() };
      log(s, "finding.reviewed", projectId + "/" + f.repositoryId, f.id + " -> " + status);
      return f;
    });
  }

  async mapFinding(projectId, findingId, body) {
    const catalog = await this.catalog();
    const frameworkId = required(body?.frameworkId, "frameworkId", 100);
    const framework = catalog.frameworks.find(f => f.id === frameworkId);
    if (!framework) fail("Unknown framework", 400);
    const controlId = required(body?.controlId, "controlId", 120);
    const rationale = required(body?.rationale, "mapping rationale", 3000);
    const reviewer = required(body?.reviewer, "reviewer", 160);
    const mappingStatus = body?.mappingStatus === "reviewed" ? "reviewed" : "candidate";
    return this.store.mutate(s => {
      ensureProject(s, projectId);
      const finding = s.findings.find(f => f.projectId === projectId && f.id === findingId);
      if (!finding) fail("Finding not found");
      const entry = { frameworkId, edition: framework.edition, controlId,
        mappingStatus, rationale, reviewer, updatedAt: new Date().toISOString() };
      const previousIndex = finding.controlMappings.findIndex(m =>
        m.frameworkId === frameworkId && m.edition === framework.edition && m.controlId === controlId);
      if (previousIndex >= 0) finding.controlMappings[previousIndex] = entry;
      else finding.controlMappings.push(entry);
      log(s, "finding.mapped", projectId + "/" + finding.repositoryId,
        finding.id + " -> " + frameworkId + "/" + controlId);
      return entry;
    });
  }

  async assess(projectId, body) {
    const catalog = await this.catalog();
    const frameworkId = required(body?.frameworkId, "frameworkId", 100);
    const framework = catalog.frameworks.find(f => f.id === frameworkId);
    if (!framework) fail("Unknown framework", 400);
    const controlId = required(body?.controlId, "controlId", 120);
    const status = required(body?.status, "status", 40);
    if (!ISO_STATUSES.has(status)) fail("Invalid assessment status", 400);
    const rationale = required(body?.rationale, "rationale", 3000);
    const assessor = required(body?.assessor, "assessor", 160);
    const evidenceIds = body?.evidenceIds ?? [];
    if (!Array.isArray(evidenceIds) || evidenceIds.length > 100 ||
      evidenceIds.some(x => typeof x !== "string")) fail("Invalid evidence IDs", 400);
    if (["conforms", "partially-conforms", "nonconforming"].includes(status)
        && evidenceIds.length === 0) fail("Evidence required for conformity verdict", 400);
    const scope = optional(body?.scope, 250) || "project";
    return this.store.mutate(s => {
      ensureProject(s, projectId);
      for (const id of evidenceIds) {
        if (!s.findings.some(f => f.projectId === projectId && f.id === id)
            && !s.runs.some(r => r.projectId === projectId && r.id === id))
          fail("Unknown evidence reference: " + id, 400);
      }
      const key = [projectId, frameworkId, framework.edition, controlId, scope].join("::");
      let record = s.assessments.find(x => x.key === key);
      const revision = { status, rationale, assessor, evidenceIds,
        at: new Date().toISOString() };
      if (record) {
        record.history.push({ status: record.status, rationale: record.rationale,
          assessor: record.assessor, evidenceIds: record.evidenceIds, at: record.updatedAt });
        Object.assign(record, revision, { updatedAt: revision.at });
      } else {
        record = { id: "assessment-" + randomUUID().slice(0, 12), key, projectId,
          frameworkId, frameworkEdition: framework.edition, controlId, scope,
          ...revision, updatedAt: revision.at, history: [] };
        delete record.at;
        s.assessments.push(record);
      }
      log(s, "control.assessed", projectId, frameworkId + "/" + controlId + " -> " + status);
      return record;
    });
  }

  async exportProject(id) {
    const value = await this.project(id);
    return { schemaVersion: "0.1.0", exportedAt: new Date().toISOString(),
      caveat: "Not an accredited certification; unassessed controls remain unknown", ...value };
  }

  async report(id) {
    const value = await this.project(id);
    const lines = [
      "# OmniAuditor — " + value.project.name,
      "", "**Audit readiness report — not a certificate.**", "",
      "- Repositories: " + value.summary.repositories,
      "- Imported runs: " + value.summary.runs,
      "- Technical findings: " + value.summary.findings,
      "- Pending review: " + value.summary.unreviewed,
      "- Control assessments: " + value.summary.assessments,
      "",
      "## Repository inventory", ""
    ];
    for (const r of value.repositories) lines.push("- " + r.name + " (" + r.id + ", " + r.role + ")");
    lines.push("", "## Control assessments (manually reviewed)", "");
    for (const a of value.assessments) {
      lines.push("### " + a.frameworkId + " " + a.frameworkEdition + " — " + a.controlId,
        "- Status: **" + a.status + "**",
        "- Scope: " + a.scope, "- Assessor: " + a.assessor,
        "- Rationale: " + a.rationale,
        "- Evidence: " + (a.evidenceIds.join(", ") || "none"), "");
    }
    if (!value.assessments.length) lines.push("No controls assessed. No ISO conformity claim can be made.", "");
    lines.push("## Technical findings (unverified unless reviewed)", "");
    for (const f of value.findings) {
      const loc = f.locations[0];
      lines.push("### " + f.id + " — " + f.title,
        "- Repository: " + f.repositoryId, "- Severity: " + f.severity,
        "- Status: " + f.status, "- Source: " + f.sources.map(x => x.tool + "/" + x.ruleId).join(", "),
        "- Location: " + (loc.file ?? "unknown") + (loc.line ? ":" + loc.line : ""),
        "- Evidence: " + f.evidence.map(x => x.reference).join(", "),
        "- Related controls (not a conformity verdict): " +
          (f.controlMappings.map(m => m.frameworkId + " " + m.edition + "/" +
            m.controlId + " (" + m.mappingStatus + ")").join(", ") || "not mapped"),
        "- Suggested remediation: " + (f.remediation ?? "Needs analyst investigation"), "");
    }
    lines.push("## Limitations", "",
      "An imported scan is not a full audit. Unknown/unassessed controls are not passing controls.",
      "ISO certificates can only be issued by appropriately accredited certification bodies.", "");
    return lines.join("\n");
  }
}
