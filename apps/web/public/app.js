const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const state = { projects: [], project: null, projectId: null,
  catalog: { frameworks: [], integrations: [] }, view: "overview", token: "" };

function e(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") n.className = value;
    else if (key === "text") n.textContent = value == null ? "" : String(value);
    else if (key === "title") n.title = value;
    else if (key.startsWith("on") && typeof value === "function") n.addEventListener(key.slice(2), value);
    else n.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    n.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return n;
}
function replace(selector, ...nodes) {
  $(selector).replaceChildren(...nodes);
}
function pill(value) {
  return e("span", { class: "pill " + String(value).replace(/[^a-z-]/g, ""), text: value });
}
function empty(message) { return e("div", { class: "empty", text: message }); }
function notification(message, isError = false) {
  const notice = $("#notice");
  notice.className = "notice" + (isError ? " error" : "");
  notice.textContent = message;
}
async function api(path, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(state.token ? { Authorization: "Bearer " + state.token } : {}) };
  const response = await fetch(path, { ...options, headers, cache: "no-store" });
  if (!response.ok) {
    let message = "Request failed (" + response.status + ")";
    try { message = (await response.json()).error || message; } catch {}
    throw new Error(message);
  }
  return response.headers.get("content-type")?.includes("text/markdown")
    ? response.text() : response.json();
}
async function run(action) {
  try { await action(); $("#notice").classList.add("hidden"); }
  catch (error) { notification(error.message, true); console.error(error); }
}
function date(value) { return value ? new Date(value).toLocaleString() : "Unknown"; }
function selected() { if (!state.projectId) throw new Error("Create or select a project first"); return state.projectId; }
function dialog(id) { $("#" + id).showModal(); }
function close(form) { form.closest("dialog").close(); form.reset(); }

function drawNavigation() {
  $$(".nav-link").forEach(button => {
    const active = button.dataset.view === state.view;
    button.classList.toggle("active", active);
  });
  $$(".view").forEach(view => view.classList.toggle("hidden", view.id !== "view-" + state.view));
  const names = {
    overview: ["Audit overview", "Evidence-backed engineering and compliance readiness."],
    findings: ["Technical findings", "Inspect, review, and trace each reported observation."],
    assessments: ["Control assessments", "Record standards evaluations with evidence and reviewers."],
    repositories: ["Repositories & runs", "Inventory projects and import existing scanner results."],
    frameworks: ["Standards catalog", "Recognized frameworks; assessments remain control-scoped."],
    integrations: ["Integration registry", "Installed and planned tools, clearly distinguished."]
  };
  $("#page-title").textContent = names[state.view][0];
  $("#page-subtitle").textContent = names[state.view][1];
  $("#current-view").textContent = names[state.view][0];
}

function drawSelect() {
  const select = $("#project-select");
  select.replaceChildren(...(state.projects.length ?
    state.projects.map(p => e("option", { value: p.id, text: p.name })) :
    [e("option", { value: "", text: "No projects" })]));
  select.value = state.projectId || "";
}

async function refresh() {
  state.catalog = await api("/api/catalog");
  state.projects = await api("/api/projects");
  if (!state.projects.some(p => p.id === state.projectId))
    state.projectId = state.projects[0]?.id || null;
  state.project = state.projectId ? await api("/api/projects/" + encodeURIComponent(state.projectId)) : null;
  drawSelect();
  drawAll();
}
async function refreshProject() {
  state.projects = await api("/api/projects");
  state.project = state.projectId ? await api("/api/projects/" + encodeURIComponent(state.projectId)) : null;
  drawSelect();
  drawAll();
}
function drawAll() {
  drawNavigation();
  drawOverview();
  drawFindings();
  drawAssessments();
  drawRepositories();
  drawCatalog();
  $("#new-repository").disabled = !state.project;
  $("#new-import").disabled = !state.project || !state.project.repositories.length;
  $("#new-assessment").disabled = !state.project;
  $("#report-md").disabled = !state.project;
  $("#report-json").disabled = !state.project;
}
function metric(label, value, hint) {
  return e("div", { class: "kpi" },
    e("div", { class: "label", text: label }),
    e("div", { class: "number", text: value }),
    e("div", { class: "hint", text: hint }));
}
function drawOverview() {
  const s = state.project?.summary;
  replace("#kpi-row", ...[
    metric("Repositories", s?.repositories ?? 0, "Registered source components"),
    metric("Scanner findings", s?.findings ?? 0, "Reported, not automatically verified"),
    metric("Needs review", s?.unreviewed ?? 0, "Pending an analyst decision"),
    metric("Control assessments", s?.assessments ?? 0, "Manually evaluated controls")]);
  if (!state.project) {
    replace("#coverage", empty("Create a project to begin building an evidence-backed audit workspace."));
    replace("#activity", empty("No recent events."));
    replace("#project-summary", empty("No project selected."));
    return;
  }
  const records = state.project.assessments;
  const conforming = records.filter(a => a.status === "conforms").length;
  const coverage = e("div", {},
    e("p", { class: "info", text: "Conforming reviewed controls: " + conforming +
      " / " + records.length + ". This is not overall ISO readiness." }),
    e("div", { class: "bar" }, e("span", { style: "width:" +
      (records.length ? Math.round(conforming / records.length * 100) : 0) + "%" })),
    e("div", { class: "metric-row" },
      e("span", { text: "Conforms" }), pill(conforming)),
    e("div", { class: "metric-row" },
      e("span", { text: "Insufficient evidence" }),
      pill(records.filter(a => a.status === "insufficient-evidence").length)),
    e("div", { class: "metric-row" },
      e("span", { text: "Nonconforming" }),
      pill(records.filter(a => a.status === "nonconforming").length)),
    e("p", { class: "info", text: "Unassessed requirements outside this list are UNKNOWN. Zero scanner findings never proves conformity." })
  );
  replace("#coverage", coverage);
  replace("#activity", ...(state.project.activity.length ?
    state.project.activity.slice(0, 7).map(a => e("div", { class: "activity-item" },
      e("span", { text: a.type.replaceAll(".", " ") + " · " + a.subject }),
      e("small", { text: date(a.at) }))) : [empty("No recorded activity.")]));
  const p = state.project.project;
  replace("#project-summary", e("div", { class: "info" },
    e("p", {}, e("strong", { text: p.name }), " · " + p.id),
    e("p", { text: p.description || "No project description yet." }),
    e("p", { text: "Last assessment status: unknown until all applicable controls are assessed. Reports are designed for audit readiness, not certification." })));
}

function table(headers, rows) {
  if (!rows.length) return empty("Nothing here yet. Add a repository or import an existing scanner report.");
  const head = e("thead", {}, e("tr", {}, headers.map(x => e("th", { text: x }))));
  const body = e("tbody", {}, rows.map(row => e("tr", {}, row.map(cell =>
    e("td", {}, cell instanceof Node ? cell : (cell ?? "—"))))));
  return e("table", {}, head, body);
}
function drawFindings() {
  const project = state.project;
  if (!project) { replace("#findings-table", empty("Select a project first.")); return; }
  const query = $("#finding-search").value.trim().toLowerCase();
  const severity = $("#finding-severity").value;
  const filtered = project.findings.filter(f =>
    (!severity || f.severity === severity) &&
    (!query || [f.title, f.repositoryId, f.sources.map(s => s.ruleId).join(" ")].join(" ").toLowerCase().includes(query)));
  replace("#findings-table", table(["Finding", "Source / location", "Severity", "Review", "Action"],
    filtered.map(f => [
      e("div", {}, e("strong", { text: f.title }), e("small", { text: f.id })),
      e("div", {}, e("span", { text: f.sources[0]?.tool + " / " + f.repositoryId }),
        e("small", { text: (f.locations[0]?.file ?? "Unknown location") +
          (f.locations[0]?.line ? ":" + f.locations[0].line : "") })),
      pill(f.severity), pill(f.status),
      e("div", { class: "buttons" },
        e("button", { class: "btn btn-sm", text: "Review",
          onclick: () => openReview(f) }),
        e("button", { class: "btn btn-sm", text: "Map control",
          onclick: () => openMapping(f) }))
    ])));
}
function drawAssessments() {
  if (!state.project) { replace("#assessments-table", empty("Select a project first.")); return; }
  replace("#assessments-table", table(["Control", "Status", "Assessor / scope", "Evidence"],
    state.project.assessments.map(a => [
      e("div", {}, e("strong", { text: a.frameworkId + " " + a.frameworkEdition + " · " + a.controlId }),
        e("small", { text: a.rationale })),
      pill(a.status),
      e("div", {}, e("span", { text: a.assessor }), e("small", { text: a.scope + " · " + date(a.updatedAt) })),
      e("span", { text: a.evidenceIds.join(", ") || "No linked evidence" })
    ])));
}
function drawRepositories() {
  if (!state.project) {
    replace("#repositories-table", empty("Select a project first."));
    replace("#runs-table", empty("No scanner runs."));
    return;
  }
  replace("#repositories-table", table(["Repository", "Role", "Source"],
    state.project.repositories.map(r => [
      e("div", {}, e("strong", { text: r.name }), e("small", { text: r.id })),
      r.role || "Unspecified",
      e("span", { text: r.url })
    ])));
  replace("#runs-table", table(["Run", "Repository", "Import", "Findings"],
    state.project.runs.map(r => [
      e("div", {}, e("strong", { text: r.artifactName }),
        e("small", { text: r.id + " · " + r.format })),
      r.repositoryId, date(r.importedAt), String(r.findingCount)
    ])));
}
function drawCatalog() {
  replace("#frameworks-grid", ...state.catalog.frameworks.map(f =>
    e("article", { class: "catalog-item" },
      e("strong", { text: f.name }),
      e("p", { text: f.domain.replaceAll("-", " ") }),
      pill(f.edition))));
  replace("#integrations-grid", ...state.catalog.integrations.map(i =>
    e("article", { class: "catalog-item" },
      e("strong", { text: i.name }),
      e("p", { text: i.role.replaceAll("-", " ") }),
      pill(i.status),
      e("p", { text: i.status.includes("planned") ? "Planned connector: not operational." :
        "Manual report import only. No tool execution." }))));
}

function openReview(finding) {
  const form = $("#review-form");
  form.elements.findingId.value = finding.id;
  form.elements.status.value = finding.status;
  $("#review-title").textContent = finding.title + " · " + finding.repositoryId;
  dialog("review-dialog");
}
function openImport() {
  const select = $("#import-repo");
  select.replaceChildren(...state.project.repositories.map(r =>
    e("option", { value: r.id, text: r.name })));
  dialog("import-dialog");
}
function openMapping(finding) {
  const form = $("#mapping-form");
  form.elements.findingId.value = finding.id;
  $("#mapping-title").textContent = finding.title + " · " + finding.repositoryId;
  $("#mapping-framework").replaceChildren(...state.catalog.frameworks.map(f =>
    e("option", { value: f.id, text: f.name + " (" + f.edition + ")" })));
  dialog("mapping-dialog");
}
function openAssessment() {
  $("#assessment-framework").replaceChildren(...state.catalog.frameworks.map(f =>
    e("option", { value: f.id, text: f.name + " (" + f.edition + ")" })));
  dialog("assessment-dialog");
}
async function downloadReport(kind) {
  const id = selected();
  const endpoint = kind === "md" ? "report.md" : "export.json";
  const response = await api("/api/projects/" + encodeURIComponent(id) + "/" + endpoint);
  const content = kind === "md" ? response : JSON.stringify(response, null, 2);
  const file = new Blob([content], { type: kind === "md" ? "text/markdown" : "application/json" });
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = "omniauditor-" + id + "." + kind;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$$("[data-view]").forEach(button => button.addEventListener("click", () => {
  state.view = button.dataset.view; drawNavigation();
}));
$$("[data-close]").forEach(button => button.addEventListener("click", () =>
  button.closest("dialog").close()));
$("#new-project").addEventListener("click", () => dialog("project-dialog"));
$("#new-repository").addEventListener("click", () => run(async () => {
  selected(); dialog("repository-dialog");
}));
$("#new-import").addEventListener("click", () => run(async () => {
  selected(); openImport();
}));
$("#new-assessment").addEventListener("click", () => run(async () => {
  selected(); openAssessment();
}));
$("#refresh").addEventListener("click", () => run(refresh));
$("#project-select").addEventListener("change", event => run(async () => {
  state.projectId = event.target.value || null; await refreshProject();
}));
$("#finding-search").addEventListener("input", drawFindings);
$("#finding-severity").addEventListener("change", drawFindings);
$("#report-md").addEventListener("click", () => run(() => downloadReport("md")));
$("#report-json").addEventListener("click", () => run(() => downloadReport("json")));
$("#auth-button").addEventListener("click", () => {
  const result = prompt("Bearer token (kept in this tab's memory only):", state.token);
  if (result !== null) { state.token = result.trim(); run(refresh); }
});

$("#project-form").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form));
    const created = await api("/api/projects", { method: "POST", body: JSON.stringify(data) });
    state.projectId = created.id; close(form); await refresh();
  });
});
$("#repository-form").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form));
    await api("/api/projects/" + selected() + "/repositories", {
      method: "POST", body: JSON.stringify(data) });
    close(form); await refreshProject();
  });
});
$("#import-form").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    const form = event.currentTarget;
    const file = $("#report-file").files[0];
    if (!file || file.size > 3_000_000) throw new Error("Choose a JSON report smaller than 3 MB.");
    const report = JSON.parse(await file.text());
    const data = Object.fromEntries(new FormData(form));
    delete data.file;
    await api("/api/projects/" + selected() + "/runs/import", {
      method: "POST", body: JSON.stringify({ ...data, artifactName: file.name, report }) });
    close(form); await refreshProject();
  });
});
$("#assessment-form").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form));
    data.evidenceIds = data.evidenceIds.split(",").map(x => x.trim()).filter(Boolean);
    await api("/api/projects/" + selected() + "/assessments", {
      method: "POST", body: JSON.stringify(data) });
    close(form); await refreshProject();
  });
});
$("#mapping-form").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form));
    const findingId = data.findingId; delete data.findingId;
    await api("/api/projects/" + selected() + "/findings/" + findingId + "/map", {
      method: "POST", body: JSON.stringify(data) });
    close(form); await refreshProject();
  });
});
$("#review-form").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form));
    const findingId = data.findingId; delete data.findingId;
    await api("/api/projects/" + selected() + "/findings/" + findingId + "/review", {
      method: "POST", body: JSON.stringify(data) });
    close(form); await refreshProject();
  });
});

drawNavigation();
run(refresh);
