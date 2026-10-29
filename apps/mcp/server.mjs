#!/usr/bin/env node
// Read-only MCP server over stdio; never writes to repositories or runs scans.
// Configure your MCP host to start: node apps/mcp/server.mjs
import { createInterface } from "node:readline";
import { JsonStore } from "../web/store.mjs";
import { AuditService } from "../web/service.mjs";

const service = new AuditService(new JsonStore(process.env.OMNIAUDITOR_DATA_DIR || ".omni-data"));
const tools = [
  { name: "list_projects", description: "List available OmniAuditor projects and high-level counts.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "get_project", description: "Retrieve project repositories, findings, assessments, and run metadata.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" } },
      required: ["projectId"], additionalProperties: false } },
  { name: "get_framework_catalog", description: "List known frameworks and integration registry statuses.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "get_audit_report", description: "Read an evidence-based Markdown audit-readiness report.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" } },
      required: ["projectId"], additionalProperties: false } }
];

function send(data) { process.stdout.write(JSON.stringify(data) + "\n"); }
async function handle(message) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return;
  const response = { jsonrpc: "2.0", id: message.id };
  try {
    if (message.method === "notifications/initialized") return;
    if (message.method === "initialize") {
      response.result = { protocolVersion: "2025-03-26", capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "omni-auditor", version: "0.2.0" } };
    } else if (message.method === "ping") response.result = {};
    else if (message.method === "tools/list") response.result = { tools };
    else if (message.method === "tools/call") {
      const name = message.params?.name;
      const args = message.params?.arguments ?? {};
      let result;
      if (name === "list_projects") result = await service.projects();
      else if (name === "get_project") result = await service.project(args.projectId);
      else if (name === "get_framework_catalog") result = await service.catalog();
      else if (name === "get_audit_report") result = await service.report(args.projectId);
      else throw new Error("Unknown tool: " + name);
      response.result = { content: [{ type: "text", text: typeof result === "string" ?
        result : JSON.stringify(result, null, 2) }] };
    } else {
      response.error = { code: -32601, message: "Method not found" };
    }
  } catch (error) {
    response.error = { code: -32000, message: error.message || "Tool failure" };
  }
  if (message.id !== undefined && message.id !== null) send(response);
}
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  if (line.length > 5_000_000) continue;
  try { await handle(JSON.parse(line)); }
  catch { send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
}
