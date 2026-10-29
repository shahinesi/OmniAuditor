import { mkdir, readFile, writeFile, rename, chmod } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export function emptyState() {
  return { version: 1, projects: [], repositories: [], runs: [], findings: [],
    assessments: [], activity: [] };
}

export class JsonStore {
  constructor(directory = ".omni-data") {
    this.directory = resolve(directory);
    this.path = join(this.directory, "workspace.json");
    this.pending = Promise.resolve();
  }

  async read() {
    let value;
    try { value = JSON.parse(await readFile(this.path, "utf8")); }
    catch (error) {
      if (error.code === "ENOENT") return emptyState();
      throw error;
    }
    if (value?.version !== 1 || !Array.isArray(value.projects) ||
        !Array.isArray(value.repositories) || !Array.isArray(value.findings) ||
        !Array.isArray(value.runs) || !Array.isArray(value.assessments) ||
        !Array.isArray(value.activity)) {
      throw new Error("Workspace schema invalid or unsupported");
    }
    return value;
  }

  async mutate(transform) {
    const execute = async () => {
      const state = await this.read();
      const result = await transform(state);
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const tmp = join(this.directory, ".workspace-" + randomUUID() + ".tmp");
      try {
        await writeFile(tmp, JSON.stringify(state, null, 2) + "\n", { mode: 0o600, flag: "wx" });
        await rename(tmp, this.path);
        await chmod(this.path, 0o600);
      } catch (error) {
        try { const { unlink } = await import("node:fs/promises"); await unlink(tmp); } catch {}
        throw error;
      }
      return result;
    };
    const next = this.pending.then(execute);
    this.pending = next.catch(() => {});
    return next;
  }
}
