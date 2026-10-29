#!/usr/bin/env node
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { sha256, normalizeArtifact, mergeExactDuplicates } from "./lib/normalize.mjs";
import { markdownReport } from "./lib/report.mjs";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function usage() {
  return [
    "OmniAuditor foundation (offline only)",
    "",
    "Usage:",
    "  node apps/cli/index.mjs ingest --project PROJECT --repo REPO \\",
    "    --format sarif|trivy --file REPORT.json [--format ... --file ...] \\",
    "    --out OUTPUT_DIR [--revision COMMIT_SHA]",
    "",
    "Inputs must come from a single repository. Active scanning is not performed.",
    "Outputs: audit-run.json and audit-report.md"
  ].join("\n");
}

function parse(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) return { help: true };
  if (argv.shift() !== "ingest") throw new Error("Expected 'ingest' command");
  const options = { inputs: [], projectId: null, repositoryId: null, out: null, revision: null };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--"))
      throw new Error("Expected a value for " + (key ?? "option"));
    switch (key) {
      case "--project": options.projectId = value; break;
      case "--repo": options.repositoryId = value; break;
      case "--revision": options.revision = value; break;
      case "--out": options.out = value; break;
      case "--format": options.inputs.push({ format: value, file: null }); break;
      case "--file": {
        const last = options.inputs.at(-1);
        if (!last || last.file) throw new Error("Each --file requires one preceding --format");
        last.file = value; break;
      }
      default: throw new Error("Unknown option: " + key);
    }
  }
  const validId = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
  if (!validId.test(options.projectId ?? "") || !validId.test(options.repositoryId ?? ""))
    throw new Error("--project and --repo require identifiers of 1-80 letters/numbers/._-");
  if (!options.out) throw new Error("--out is required");
  if (options.inputs.length === 0 || options.inputs.some(i =>
    !i.file || !["sarif", "trivy"].includes(i.format)))
    throw new Error("Supply at least one --format sarif|trivy --file path pair");
  if (options.revision && !/^[a-f0-9]{7,64}$/i.test(options.revision))
    throw new Error("--revision must be a hexadecimal commit hash (7-64 chars)");
  return options;
}

async function ingest(options) {
  const found = [], inputs = [];
  for (const item of options.inputs) {
    const source = path.resolve(item.file);
    const metadata = await stat(source);
    if (!metadata.isFile() || metadata.size > MAX_FILE_BYTES)
      throw new Error("Input must be a JSON file <= 25 MiB: " + path.basename(source));
    const raw = await readFile(source);
    const artifact = {
      name: path.basename(source), format: item.format,
      sha256: sha256(raw), byteLength: raw.length
    };
    let json;
    try { json = JSON.parse(raw.toString("utf8")); }
    catch { throw new Error("Invalid JSON input: " + artifact.name); }
    const normalized = normalizeArtifact(json, item.format, {
      projectId: options.projectId, repositoryId: options.repositoryId,
      revision: options.revision, artifact
    });
    inputs.push({ ...artifact, importedItems: normalized.length });
    found.push(...normalized);
  }
  const run = {
    schemaVersion: "0.1.0",
    runId: "RUN-" + sha256(JSON.stringify([
      options.projectId, options.repositoryId, options.revision,
      inputs.map(i => [i.format, i.sha256])
    ])).slice(0, 16),
    projectId: options.projectId, repositoryId: options.repositoryId,
    revision: options.revision, generatedAt: new Date().toISOString(),
    kind: "imported-technical-findings", status: "unreviewed",
    coverageStatus: "unknown", standardsAssessmentStatus: "not-assessed",
    inputs, findings: mergeExactDuplicates(found), controlAssessments: []
  };
  const directory = path.resolve(options.out);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "audit-run.json"), JSON.stringify(run, null, 2) + "\n");
  await writeFile(path.join(directory, "audit-report.md"), markdownReport(run));
  process.stdout.write("Imported " + inputs.length + " artifact(s), " +
    run.findings.length + " unique unreviewed finding(s).\n" +
    "No scan was executed. No ISO conformity assessment was performed.\n" +
    "Outputs: " + path.join(directory, "audit-run.json") + " and audit-report.md\n");
}

try {
  const options = parse(process.argv.slice(2));
  if (options.help) process.stdout.write(usage() + "\n");
  else await ingest(options);
} catch (error) {
  process.stderr.write("OmniAuditor: " + error.message + "\n\n" + usage() + "\n");
  process.exitCode = 1;
}
