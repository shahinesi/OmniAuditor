#!/usr/bin/env node
import http from "node:http";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { JsonStore } from "./store.mjs";
import { AuditService } from "./service.mjs";

const serverHost = process.env.OMNIAUDITOR_HOST || "127.0.0.1";
const serverPort = Number(process.env.OMNIAUDITOR_PORT || 4318);
const token = process.env.OMNIAUDITOR_TOKEN || "";
const localOnly = ["127.0.0.1", "::1", "localhost"].includes(serverHost);
if (!localOnly && token.length < 24)
  throw new Error("Non-loopback binding requires OMNIAUDITOR_TOKEN (at least 24 characters)");
if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65535)
  throw new Error("Invalid OMNIAUDITOR_PORT");

const service = new AuditService(new JsonStore(process.env.OMNIAUDITOR_DATA_DIR || ".omni-data"));
const staticFiles = new Map([
  ["/", ["./public/index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["./public/app.js", "text/javascript; charset=utf-8"]],
  ["/style.css", ["./public/style.css", "text/css; charset=utf-8"]]
]);

function send(res, code, body, contentType = "application/json; charset=utf-8", extra = {}) {
  res.writeHead(code, { "Content-Type": contentType, "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    ...extra });
  res.end(Buffer.isBuffer(body) || typeof body === "string" ? body : JSON.stringify(body));
}

function authorized(req) {
  if (!token) return localOnly;
  const candidate = req.headers.authorization;
  if (typeof candidate !== "string" || !candidate.startsWith("Bearer ")) return false;
  const a = Buffer.from(candidate.slice(7));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function jsonBody(req) {
  if (!String(req.headers["content-type"] || "").startsWith("application/json"))
    throw Object.assign(new Error("Content-Type must be application/json"), { code: 415 });
  let length = 0;
  const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 5 * 1024 * 1024)
      throw Object.assign(new Error("Request exceeds 5 MiB"), { code: 413 });
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("JSON object expected");
    return body;
  } catch { throw Object.assign(new Error("Invalid JSON body"), { code: 400 }); }
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host &&
    ["http:", "https:"].includes(new URL(origin).protocol); }
  catch { return false; }
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url, "http://localhost");
    const pathname = parsed.pathname;
    if (req.method === "GET" && staticFiles.has(pathname)) {
      const [file, type] = staticFiles.get(pathname);
      const content = await readFile(new URL(file, import.meta.url));
      send(res, 200, content, type);
      return;
    }
    if (!pathname.startsWith("/api/")) { send(res, 404, { error: "Not found" }); return; }
    if (!authorized(req)) { send(res, 401, { error: "Unauthorized" }); return; }
    if (req.method !== "GET" && !sameOrigin(req)) {
      send(res, 403, { error: "Cross-origin modification denied" }); return;
    }

    const segments = pathname.split("/").filter(Boolean);
    const method = req.method;
    let value;
    let kind = "json";
    let code = 200;
    if (method === "GET" && pathname === "/api/health") {
      value = { status: "ok", application: "OmniAuditor", version: "0.2.0",
        operational: ["offline-import", "project-workspace", "manual-assessments", "reporting"] };
    } else if (method === "GET" && pathname === "/api/catalog") {
      value = await service.catalog();
    } else if (method === "GET" && pathname === "/api/projects") {
      value = await service.projects();
    } else if (method === "POST" && pathname === "/api/projects") {
      value = await service.createProject(await jsonBody(req)); code = 201;
    } else if (segments[0] === "api" && segments[1] === "projects" &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(segments[2] ?? "")) {
      const id = segments[2];
      if (segments.length === 3 && method === "GET") value = await service.project(id);
      else if (segments.length === 4 && segments[3] === "repositories" && method === "POST") {
        value = await service.addRepository(id, await jsonBody(req)); code = 201;
      } else if (segments.length === 5 && segments[3] === "runs" &&
          segments[4] === "import" && method === "POST") {
        value = await service.importReport(id, await jsonBody(req)); code = 201;
      } else if (segments.length === 4 && segments[3] === "assessments" && method === "POST") {
        value = await service.assess(id, await jsonBody(req)); code = 201;
      } else if (segments.length === 6 && segments[3] === "findings" &&
        segments[5] === "review" && method === "POST" &&
        /^F-[a-f0-9]{16}$/.test(segments[4])) {
        value = await service.reviewFinding(id, segments[4], await jsonBody(req));
      } else if (segments.length === 6 && segments[3] === "findings" &&
        segments[5] === "map" && method === "POST" &&
        /^F-[a-f0-9]{16}$/.test(segments[4])) {
        value = await service.mapFinding(id, segments[4], await jsonBody(req));
      } else if (segments.length === 4 && segments[3] === "report.md" && method === "GET") {
        value = await service.report(id); kind = "md";
      } else if (segments.length === 4 && segments[3] === "export.json" && method === "GET") {
        value = await service.exportProject(id);
      } else { send(res, 404, { error: "Not found" }); return; }
    } else { send(res, 404, { error: "Not found" }); return; }
    send(res, code, value, kind === "md" ? "text/markdown; charset=utf-8" :
      "application/json; charset=utf-8");
  } catch (error) {
    const code = Number.isInteger(error.code) && error.code >= 400 && error.code < 500
      ? error.code : 500;
    if (code === 500) console.error("Request error:", error);
    send(res, code, { error: code === 500 ? "Internal server error" : error.message });
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.listen(serverPort, serverHost, () => {
  console.log("OmniAuditor running at http://" + serverHost + ":" + serverPort);
  console.log("Local-only by default. Remote access requires a secure reverse proxy and bearer token.");
});
