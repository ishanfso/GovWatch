/**
 * GovWatch Dashboard — app.js
 * Public Ledger theme redesign: queue-first layout, detail panel, 5 KPIs.
 */

// ── Constants ──────────────────────────────────────────────────────

const DATA_PATHS = ["../data/issues.json", "../data/sample_issues.json"];

const CATEGORY_COLORS = {
  Roads:       "#1f4d3a",
  Water:       "#0891b2",
  Electricity: "#92400e",
  Waste:       "#31572c",
  Flooding:    "#7c3aed",
  Parks:       "#15803d",
  Traffic:     "#991b1b",
  Other:       "#6f675d",
};

const AREA_COORDS = {
  "Koramangala":    [12.9352, 77.6245],
  "Indiranagar":    [12.9784, 77.6408],
  "Whitefield":     [12.9698, 77.7500],
  "Jayanagar":      [12.9254, 77.5829],
  "HSR Layout":     [12.9116, 77.6389],
  "BTM Layout":     [12.9166, 77.6101],
  "Marathahalli":   [12.9591, 77.6974],
  "Sarjapur":       [12.9010, 77.6850],
  "Electronic City":[12.8399, 77.6770],
  "Hebbal":         [13.0435, 77.5983],
  "Malleshwaram":   [13.0029, 77.5698],
  "Rajajinagar":    [12.9939, 77.5523],
  "JP Nagar":       [12.9048, 77.5838],
  "Bannerghatta":   [12.8005, 77.5779],
  "Yelahanka":      [13.1004, 77.5963],
  "MG Road":        [12.9756, 77.6099],
  "Cubbon Park":    [12.9763, 77.5929],
  "Lalbagh":        [12.9507, 77.5848],
  "KR Puram":       [13.0090, 77.6934],
  "Lavelle Road":   [12.9651, 77.6000],
  "Bellandur":      [12.9257, 77.6763],
  "Domlur":         [12.9609, 77.6387],
  "Madiwala":       [12.9195, 77.6162],
  "Basavanagudi":   [12.9436, 77.5754],
  "Vijayanagar":    [12.9718, 77.5390],
  "Yeshwantpur":    [13.0225, 77.5399],
  "Peenya":         [13.0285, 77.5187],
  "Bangalore":      [12.9716, 77.5946],
};

const DEPARTMENT_MAP = {
  BBMP:   { icon: "🏗", color: "#1f4d3a", desc: "Roads · Waste · Parks · Flooding", categories: ["Roads", "Waste", "Parks", "Flooding", "Other"] },
  BESCOM: { icon: "⚡", color: "#92400e", desc: "Electricity · Street Lights",      categories: ["Electricity"] },
  BWSSB:  { icon: "💧", color: "#0891b2", desc: "Water Supply · Drainage",          categories: ["Water"] },
  BTP:    { icon: "🚦", color: "#991b1b", desc: "Traffic Signals · Road Safety",    categories: ["Traffic"] },
};

const CATEGORY_DEPT = {
  Roads: "BBMP", Waste: "BBMP", Parks: "BBMP", Flooding: "BBMP", Other: "BBMP",
  Electricity: "BESCOM", Water: "BWSSB", Traffic: "BTP",
};

const STATUS_OPTIONS = [
  { value: "open",         label: "⚪ Open" },
  { value: "acknowledged", label: "🔵 Acknowledged" },
  { value: "in_progress",  label: "🟡 In Progress" },
  { value: "resolved",     label: "🟢 Resolved" },
];

const SEV_COLORS = { high: "#991b1b", medium: "#92400e", low: "#14532d" };

const POC_DIRECTORY = {
  Roads:       { dept: "BBMP",   div: "Roads & Infrastructure",  email: "roads@bbmp.gov.in",            phone: "080-22660000", tat: 72  },
  Waste:       { dept: "BBMP",   div: "Solid Waste Management",  email: "swm@bbmp.gov.in",              phone: "1533",         tat: 48  },
  Parks:       { dept: "BBMP",   div: "Parks & Gardens",         email: "parks@bbmp.gov.in",            phone: "080-22660000", tat: 168 },
  Flooding:    { dept: "BBMP",   div: "Storm Water Drains",      email: "jdflood@bbmp.gov.in",          phone: "080-22660000", tat: 4   },
  Electricity: { dept: "BESCOM", div: "Consumer Care",           email: "consumer.care@bescom.co.in",   phone: "1912",         tat: 4   },
  Water:       { dept: "BWSSB",  div: "Consumer Grievances",     email: "complaints@bwssb.org",         phone: "1916",         tat: 24  },
  Traffic:     { dept: "BTP",    div: "Traffic Management",      email: "traffic.blr@ksp.gov.in",       phone: "103",          tat: 48  },
  Other:       { dept: "BBMP",   div: "General",                 email: "bbmpcommissioner@bbmp.gov.in", phone: "080-22660000", tat: 72  },
};

// City-level contacts shown when issue has no specific ward (area = "Bangalore")
const CITY_LEVEL_CONTACTS = {
  Roads:       [
    { role: "BBMP Commissioner",    detail: "Bruhat Bengaluru Mahanagara Palike", name: "BBMP Commissioner", phone: "080-22660000", email: "bbmpcommissioner@bbmp.gov.in", type: "first_contact" },
    { role: "BBMP Roads Division",  detail: "Roads & Infrastructure",              name: "Roads Helpline",    phone: "080-22660000", email: "roads@bbmp.gov.in",            type: "cc" },
  ],
  Waste:       [
    { role: "BBMP Commissioner",    detail: "Bruhat Bengaluru Mahanagara Palike", name: "BBMP Commissioner", phone: "080-22660000", email: "bbmpcommissioner@bbmp.gov.in", type: "first_contact" },
    { role: "BBMP SWM",             detail: "Solid Waste Management",             name: "SWM Helpline",      phone: "1533",         email: "swm@bbmp.gov.in",              type: "cc" },
  ],
  Parks:       [
    { role: "BBMP Commissioner",    detail: "Bruhat Bengaluru Mahanagara Palike", name: "BBMP Commissioner", phone: "080-22660000", email: "bbmpcommissioner@bbmp.gov.in", type: "first_contact" },
    { role: "BBMP Parks Division",  detail: "Parks & Gardens",                   name: "Parks Helpline",    phone: "080-22660000", email: "parks@bbmp.gov.in",            type: "cc" },
  ],
  Flooding:    [
    { role: "BBMP Commissioner",    detail: "Bruhat Bengaluru Mahanagara Palike", name: "BBMP Commissioner", phone: "080-22660000", email: "bbmpcommissioner@bbmp.gov.in", type: "first_contact" },
    { role: "BBMP Storm Drains",    detail: "Storm Water Drains Division",        name: "Flood Helpline",    phone: "080-22660000", email: "jdflood@bbmp.gov.in",          type: "cc" },
  ],
  Electricity: [
    { role: "BESCOM CEO",           detail: "Bangalore Electricity Supply Co.",   name: "BESCOM CEO",        phone: "1912",         email: "ceo@bescom.co.in",             type: "first_contact" },
    { role: "BESCOM Consumer Care", detail: "Consumer Complaints",                name: "Consumer Care",     phone: "1912",         email: "consumer.care@bescom.co.in",   type: "cc" },
  ],
  Water:       [
    { role: "BWSSB Chairman",       detail: "Bangalore Water Supply & Sewerage",  name: "BWSSB Chairman",    phone: "1916",         email: "chairman@bwssb.org",           type: "first_contact" },
    { role: "BWSSB Grievances",     detail: "Consumer Grievances",                name: "Complaints Cell",   phone: "1916",         email: "complaints@bwssb.org",         type: "cc" },
  ],
  Traffic:     [
    { role: "DCP Traffic",          detail: "Bangalore Traffic Police",           name: "Traffic Control",   phone: "103",          email: "traffic.blr@ksp.gov.in",       type: "first_contact" },
  ],
  Other:       [
    { role: "BBMP Commissioner",    detail: "Bruhat Bengaluru Mahanagara Palike", name: "BBMP Commissioner", phone: "080-22660000", email: "bbmpcommissioner@bbmp.gov.in", type: "first_contact" },
  ],
};

const ROLE_DEPARTMENTS = {
  bbmp:   ["Roads", "Waste", "Parks", "Flooding", "Other"],
  bescom: ["Electricity"],
  bwssb:  ["Water"],
  btp:    ["Traffic"],
};

const ROLE_LABELS = {
  bbmp:   "BBMP — Bruhat Bengaluru Mahanagara Palike",
  bescom: "BESCOM — Bangalore Electricity Supply Company",
  bwssb:  "BWSSB — Bangalore Water Supply & Sewerage Board",
  btp:    "BTP — Bangalore Traffic Police",
};

// ── State ──────────────────────────────────────────────────────────

let allIssues = [];
let activeFilters = {
  search: "", category: "all", area: "all", dept: "all", role: "",
  datePreset: "all", dateFrom: "", dateTo: "",
};
let activeSavedView = "all";
let activeSort = "priority";
let activeTab = "queue";
let clustered = false;
let selectedIssueId = null;
let chart = null;
let leafletMap = null;
let mapMarkers = [];
let mapInitialized = false;

// ── Bootstrap ──────────────────────────────────────────────────────

async function loadData() {
  for (const path of DATA_PATHS) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;
      const isLive = path.includes("issues.json") && !path.includes("sample");
      const badge = document.getElementById("data-source-badge");
      badge.textContent = isLive ? "Live Data" : "Sample Data";
      if (isLive) badge.classList.add("live");
      return data;
    } catch (_) { continue; }
  }
  return [];
}

async function init() {
  const urlRole = new URLSearchParams(window.location.search).get("role") || "";
  if (urlRole && ROLE_DEPARTMENTS[urlRole]) {
    activeFilters.role = urlRole;
    renderRoleBanner(urlRole);
  }

  allIssues = await loadData();

  if (allIssues.length === 0) {
    document.getElementById("queue-list").innerHTML =
      '<div class="no-results">No data found. Check the data folder or run the fetch script.</div>';
    return;
  }

  setLastUpdated();
  renderKPIs(allIssues);
  buildFilters(allIssues);
  renderQueue(getFiltered());

  document.querySelectorAll(".tab").forEach(btn =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
  );

  document.querySelectorAll(".view-chip").forEach(btn =>
    btn.addEventListener("click", () => onSavedViewClick(btn))
  );

  document.getElementById("cluster-toggle").addEventListener("change", e => {
    clustered = e.target.checked;
    renderQueue(getFiltered());
  });

  document.getElementById("sort-select").addEventListener("change", e => {
    activeSort = e.target.value;
    renderQueue(getFiltered());
  });

  document.getElementById("export-csv").addEventListener("click", exportCSV);

  // Pre-load officials data in the background so smart contacts are ready when issues are clicked
  initOfficials();
}

// ── KPIs ───────────────────────────────────────────────────────────

function renderKPIs(issues) {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 36e5;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const overdue = issues.filter(i => {
    const status = getStatus(i.id);
    if (status === "resolved") return false;
    const poc = POC_DIRECTORY[i.category] || POC_DIRECTORY.Other;
    return (now - new Date(i.date).getTime()) / 36e5 >= poc.tat;
  }).length;

  const highOpen = issues.filter(i =>
    i.severity === "high" && getStatus(i.id) !== "resolved"
  ).length;

  const newToday = issues.filter(i =>
    new Date(i.date).getTime() >= todayStart.getTime()
  ).length;

  const unassigned = issues.filter(i => getStatus(i.id) === "open").length;

  const resolvedWk = issues.filter(i => {
    if (getStatus(i.id) !== "resolved") return false;
    return new Date(i.date).getTime() >= oneWeekAgo;
  }).length;

  document.getElementById("kpi-overdue").textContent   = overdue;
  document.getElementById("kpi-high").textContent      = highOpen;
  document.getElementById("kpi-new").textContent       = newToday;
  document.getElementById("kpi-unassigned").textContent = unassigned;
  document.getElementById("kpi-resolved").textContent  = resolvedWk;
}

// ── Filters ────────────────────────────────────────────────────────

function buildFilters(issues) {
  const categories = [...new Set(issues.map(i => i.category))].sort();
  const catSel = document.getElementById("category-filter");
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat; opt.textContent = cat;
    catSel.appendChild(opt);
  });

  const areas = [...new Set(issues.map(i => i.area))].sort();
  const areaSel = document.getElementById("area-filter");
  areas.forEach(area => {
    const opt = document.createElement("option");
    opt.value = area; opt.textContent = area;
    areaSel.appendChild(opt);
  });

  document.getElementById("search-input").addEventListener("input", e => {
    activeFilters.search = e.target.value.toLowerCase().trim();
    applyFilters();
  });
  catSel.addEventListener("change", e => { activeFilters.category = e.target.value; applyFilters(); });
  areaSel.addEventListener("change", e => { activeFilters.area = e.target.value; applyFilters(); });
  document.getElementById("dept-filter").addEventListener("change", e => { activeFilters.dept = e.target.value; applyFilters(); });

  const dateSel = document.getElementById("date-preset-filter");
  const dateRangeRow = document.getElementById("date-range-row");
  dateSel.addEventListener("change", e => {
    activeFilters.datePreset = e.target.value;
    activeFilters.dateFrom = "";
    activeFilters.dateTo = "";
    document.getElementById("date-from").value = "";
    document.getElementById("date-to").value = "";
    dateRangeRow.classList.toggle("hidden", e.target.value !== "custom");
    applyFilters();
  });
  document.getElementById("date-from").addEventListener("change", e => {
    activeFilters.dateFrom = e.target.value;
    activeFilters.datePreset = "custom";
    dateSel.value = "custom";
    dateRangeRow.classList.remove("hidden");
    applyFilters();
  });
  document.getElementById("date-to").addEventListener("change", e => {
    activeFilters.dateTo = e.target.value;
    activeFilters.datePreset = "custom";
    dateSel.value = "custom";
    dateRangeRow.classList.remove("hidden");
    applyFilters();
  });

  document.getElementById("reset-filters").addEventListener("click", resetFilters);
}

function onSavedViewClick(btn) {
  document.querySelectorAll(".view-chip").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeSavedView = btn.dataset.view;
  applyFilters();
}

function resetFilters() {
  activeFilters = { search: "", category: "all", area: "all", dept: "all", role: activeFilters.role, datePreset: "all", dateFrom: "", dateTo: "" };
  activeSavedView = "all";
  activeSort = "priority";
  document.querySelectorAll(".view-chip").forEach(b => b.classList.toggle("active", b.dataset.view === "all"));
  document.getElementById("search-input").value = "";
  document.getElementById("category-filter").value = "all";
  document.getElementById("area-filter").value = "all";
  document.getElementById("dept-filter").value = "all";
  document.getElementById("date-preset-filter").value = "all";
  document.getElementById("date-from").value = "";
  document.getElementById("date-to").value = "";
  document.getElementById("date-range-row").classList.add("hidden");
  document.getElementById("sort-select").value = "priority";
  applyFilters();
}

function getDateBounds() {
  const now = new Date();
  const p = activeFilters.datePreset;
  if (p === "1") {
    const from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0,0,0,0);
    return { from, to: null };
  }
  if (p === "7") {
    const from = new Date(now); from.setDate(from.getDate() - 7); from.setHours(0,0,0,0);
    return { from, to: null };
  }
  if (p === "30") {
    const from = new Date(now); from.setDate(from.getDate() - 30); from.setHours(0,0,0,0);
    return { from, to: null };
  }
  if (p === "this-month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null };
  }
  if (p === "custom") {
    return {
      from: activeFilters.dateFrom ? new Date(activeFilters.dateFrom + "T00:00:00") : null,
      to:   activeFilters.dateTo   ? new Date(activeFilters.dateTo   + "T23:59:59") : null,
    };
  }
  return { from: null, to: null };
}

function getFiltered() {
  const now = Date.now();
  const { from, to } = getDateBounds();
  return allIssues.filter(i => {
    if (activeFilters.category !== "all" && i.category !== activeFilters.category) return false;
    if (activeFilters.area !== "all" && i.area !== activeFilters.area) return false;
    if (activeFilters.dept !== "all" && CATEGORY_DEPT[i.category] !== activeFilters.dept) return false;
    if (activeFilters.role && ROLE_DEPARTMENTS[activeFilters.role] &&
        !ROLE_DEPARTMENTS[activeFilters.role].includes(i.category)) return false;
    if (activeFilters.search) {
      const hay = `${i.text} ${i.area} ${i.category} ${i.author}`.toLowerCase();
      if (!hay.includes(activeFilters.search)) return false;
    }

    // Date filter
    if (from || to) {
      const d = new Date(i.date);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
    }

    // Saved view filter
    const status = getStatus(i.id);
    if (activeSavedView === "urgent") {
      if (i.severity !== "high" || status === "resolved") return false;
    } else if (activeSavedView === "overdue") {
      if (status === "resolved") return false;
      const poc = POC_DIRECTORY[i.category] || POC_DIRECTORY.Other;
      if ((now - new Date(i.date).getTime()) / 36e5 < poc.tat) return false;
    } else if (activeSavedView === "unassigned") {
      if (status !== "open") return false;
    } else if (activeSavedView === "resolved") {
      if (status !== "resolved") return false;
    }

    return true;
  });
}

function applyFilters() {
  const filtered = getFiltered();
  if (activeTab === "queue")       renderQueue(filtered);
  if (activeTab === "map")         renderMap(filtered);
  if (activeTab === "departments") renderDepartments(filtered);
  if (activeTab === "analytics")   renderAnalytics(filtered);
}

// ── Tabs ───────────────────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-content").forEach(s => s.classList.add("hidden"));
  document.getElementById(`tab-${tab}`).classList.remove("hidden");

  const filtered = getFiltered();
  if (tab === "map")         renderMap(filtered);
  if (tab === "departments") renderDepartments(filtered);
  if (tab === "analytics")   renderAnalytics(filtered);
  if (tab === "officials")   initOfficials();
}

// ── Queue ──────────────────────────────────────────────────────────

function renderQueue(issues) {
  const displayed = clustered ? getClusteredIssues(issues) : issues;
  const count = document.getElementById("queue-count");
  count.textContent = `${displayed.length} issue${displayed.length !== 1 ? "s" : ""}` +
    (clustered && displayed.length < issues.length ? ` (grouped from ${issues.length})` : "");

  const list = document.getElementById("queue-list");
  if (displayed.length === 0) {
    list.innerHTML = '<div class="no-results">No issues match the current view.</div>';
    return;
  }

  // Sort according to activeSort selection
  const sevOrder = { high: 0, medium: 1, low: 2 };
  const now = Date.now();
  displayed.sort((a, b) => {
    if (activeSort === "newest") return new Date(b.date) - new Date(a.date);
    if (activeSort === "oldest") return new Date(a.date) - new Date(b.date);
    if (activeSort === "severity") {
      return sevOrder[a.severity] - sevOrder[b.severity] ||
             (b.likes + b.retweets) - (a.likes + a.retweets);
    }
    // "priority" — overdue first, then severity, then engagement
    const pocA = POC_DIRECTORY[a.category] || POC_DIRECTORY.Other;
    const pocB = POC_DIRECTORY[b.category] || POC_DIRECTORY.Other;
    const aOver = (now - new Date(a.date).getTime()) / 36e5 >= pocA.tat;
    const bOver = (now - new Date(b.date).getTime()) / 36e5 >= pocB.tat;
    if (aOver !== bOver) return aOver ? -1 : 1;
    if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
    return (b.likes + b.retweets) - (a.likes + a.retweets);
  });

  list.innerHTML = displayed.map(i => queueRow(i)).join("");

  // Select first if none selected or selected not in list
  const ids = displayed.map(i => i.id);
  if (!selectedIssueId || !ids.includes(selectedIssueId)) {
    selectedIssueId = displayed[0]?.id || null;
  }
  if (selectedIssueId) {
    const el = list.querySelector(`[data-id="${CSS.escape(String(selectedIssueId))}"]`);
    if (el) el.classList.add("selected");
    renderDetailPanel(displayed.find(i => i.id === selectedIssueId));
  }

  list.querySelectorAll(".queue-row").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.dataset.id;
      selectedIssueId = id;
      list.querySelectorAll(".queue-row").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
      const issue = allIssues.find(i => String(i.id) === id);
      if (issue) renderDetailPanel(issue);
    });
  });
}

function queueRow(issue) {
  const status = getStatus(issue.id);
  const sla = getSLAStatus(issue);
  const poc = POC_DIRECTORY[issue.category] || POC_DIRECTORY.Other;
  const sevLabel = { high: "High", medium: "Medium", low: "Low" }[issue.severity] || issue.severity;
  const clusterBadge = issue.clusterCount > 1
    ? `<span class="q-cluster-badge">${issue.clusterCount} reports</span>` : "";

  return `
  <div class="queue-row sev-${esc(issue.severity)} q-status-${esc(status)}" data-id="${esc(String(issue.id))}" data-status="${esc(status)}">
    <div class="queue-row-stripe"></div>
    <div class="queue-row-body">
      <div class="queue-row-meta">
        <span class="q-priority-label">${sevLabel}</span>
        <span class="q-cat-badge">${esc(issue.category)}</span>
        <span class="q-area">${esc(issue.area)}</span>
        ${clusterBadge}
      </div>
      <div class="queue-row-text">${esc(issue.text)}</div>
      <div class="queue-row-footer">
        <span class="q-dept">${esc(poc.dept)} · ${esc(poc.div)}</span>
        <span class="q-age">${getIssueAge(issue.date)}</span>
        <span class="q-sla ${sla.cls}">${sla.label}</span>
      </div>
    </div>
    <div class="queue-row-actions">
      <div class="q-status-dot"></div>
    </div>
  </div>`;
}

function renderDetailPanel(issue) {
  if (!issue) {
    document.getElementById("detail-pane").innerHTML =
      `<div class="detail-empty"><div class="detail-empty-icon">⬅</div><div class="detail-empty-text">Select an issue to view details</div></div>`;
    return;
  }

  const status = getStatus(issue.id);
  const sla = getSLAStatus(issue);
  const poc = POC_DIRECTORY[issue.category] || POC_DIRECTORY.Other;
  const sevLabel = { high: "High Risk", medium: "Medium", low: "Low" }[issue.severity] || issue.severity;
  const statusOpts = STATUS_OPTIONS.map(o =>
    `<option value="${o.value}"${status === o.value ? " selected" : ""}>${o.label}</option>`
  ).join("");
  const statusClass = `s-${status}`;

  document.getElementById("detail-pane").innerHTML = `
    <div class="detail-header">
      <div class="detail-badges">
        <span class="detail-cat">${esc(issue.category)}</span>
        <span class="detail-sev detail-sev-${esc(issue.severity)}">${sevLabel}</span>
        <span class="detail-sla-badge ${sla.cls}">${sla.label}</span>
      </div>
      <div class="detail-title">${esc(issue.text.length > 120 ? issue.text.slice(0, 120) + "…" : issue.text)}</div>
    </div>
    <div class="detail-body">

      <div>
        <div class="detail-section-label">Full complaint</div>
        <div class="detail-full-text">${esc(issue.text)}</div>
      </div>

      <div class="detail-meta-grid">
        <div class="detail-meta-item">
          <div class="detail-section-label">Area</div>
          <div class="detail-meta-val">📍 ${esc(issue.area)}</div>
        </div>
        <div class="detail-meta-item">
          <div class="detail-section-label">Department</div>
          <div class="detail-meta-val">${esc(poc.dept)} · ${esc(poc.div)}</div>
        </div>
        <div class="detail-meta-item">
          <div class="detail-section-label">Age</div>
          <div class="detail-meta-val">${getIssueAge(issue.date)}</div>
        </div>
        <div class="detail-meta-item">
          <div class="detail-section-label">SLA</div>
          <div class="detail-meta-val">${poc.tat}h TAT</div>
        </div>
        <div class="detail-meta-item">
          <div class="detail-section-label">Engagement</div>
          <div class="detail-meta-val">❤️ ${issue.likes || 0} &nbsp; 🔁 ${issue.retweets || 0}</div>
        </div>
        <div class="detail-meta-item">
          <div class="detail-section-label">Author</div>
          <div class="detail-meta-val">${esc(issue.author || "—")}</div>
        </div>
        ${issue.clusterCount > 1 ? `
        <div class="detail-meta-item" style="grid-column:1/-1">
          <div class="detail-section-label">Related reports</div>
          <div class="detail-meta-val">${issue.clusterCount} complaints in same area &amp; category</div>
        </div>` : ""}
        ${issue.source_url ? `
        <div class="detail-meta-item" style="grid-column:1/-1">
          <div class="detail-section-label">Source</div>
          <div class="detail-meta-val"><a href="${esc(issue.source_url)}" target="_blank" rel="noopener">View original tweet ↗</a></div>
        </div>` : ""}
      </div>

      <div>
        <div class="detail-section-label">Who to contact</div>
        ${renderSmartContactsHTML(issue)}
      </div>

      <div class="detail-actions">
        <div class="detail-status-row">
          <span class="detail-status-label">Status</span>
          <select class="status-select ${statusClass}" id="detail-status-select" data-issue-id="${esc(String(issue.id))}">${statusOpts}</select>
        </div>
        <a class="btn-assign" href="${buildEmailLink(issue)}">
          &#128231; Assign to ${esc(poc.dept)}
        </a>
        ${issue.source_url ? `<a class="btn-source" href="${esc(issue.source_url)}" target="_blank" rel="noopener">Open source tweet &#8599;</a>` : ""}
        <button class="btn-copy-tweet" id="copy-tweet-btn">&#128203; Copy Tweet Reply</button>
        <div class="tweet-preview hidden" id="tweet-preview"></div>
      </div>

    </div>
  `;

  const sel = document.getElementById("detail-status-select");
  if (sel) {
    sel.addEventListener("change", e => {
      const id = e.target.dataset.issueId;
      const val = e.target.value;
      setStatus(id, val);
      sel.className = `status-select s-${val}`;
      // Update queue row dot
      const row = document.querySelector(`.queue-row[data-id="${CSS.escape(id)}"]`);
      if (row) {
        row.dataset.status = val;
        row.className = row.className.replace(/q-status-\S+/, `q-status-${val}`);
      }
      renderKPIs(allIssues);
    });
  }

  const copyBtn = document.getElementById("copy-tweet-btn");
  const tweetPreview = document.getElementById("tweet-preview");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const tweet = buildTweetReply(issue);
      if (tweetPreview) {
        tweetPreview.textContent = tweet;
        tweetPreview.classList.remove("hidden");
      }
      const doCopy = () => {
        copyBtn.innerHTML = "&#10003; Copied!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.innerHTML = "&#128203; Copy Tweet Reply";
          copyBtn.classList.remove("copied");
        }, 2500);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(tweet).then(doCopy).catch(() => {
          legacyCopy(tweet);
          doCopy();
        });
      } else {
        legacyCopy(tweet);
        doCopy();
      }
    });
  }
}

function legacyCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

// ── Clustering ─────────────────────────────────────────────────────

function getClusteredIssues(issues) {
  const groups = {};
  for (const issue of issues) {
    const key = `${issue.category}||${issue.area}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(issue);
  }
  return Object.values(groups).map(group => {
    const lead = [...group].sort((a, b) =>
      (b.likes + b.retweets) - (a.likes + a.retweets)
    )[0];
    return { ...lead, clusterCount: group.length };
  });
}

// ── SLA & Age ──────────────────────────────────────────────────────

function getIssueAge(dateStr) {
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 36e5);
  if (diffH < 1)  return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function getSLAStatus(issue) {
  const poc = POC_DIRECTORY[issue.category] || POC_DIRECTORY.Other;
  const elapsedH = (Date.now() - new Date(issue.date).getTime()) / 36e5;
  const pct = elapsedH / poc.tat;
  if (pct >= 1)    return { cls: "sla-overdue", label: `Overdue ${Math.round(elapsedH - poc.tat)}h` };
  if (pct >= 0.75) return { cls: "sla-warning", label: `${Math.round(poc.tat - elapsedH)}h left` };
  return               { cls: "sla-ok",       label: `${Math.round(poc.tat - elapsedH)}h left` };
}

function buildEmailLink(issue) {
  const poc  = POC_DIRECTORY[issue.category] || POC_DIRECTORY.Other;
  const due  = new Date(new Date(issue.date).getTime() + poc.tat * 36e5);
  const dueStr = due.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const subject = `[GovWatch] ${issue.severity.toUpperCase()} ${issue.category} issue in ${issue.area} — TAT: ${poc.tat}h`;
  const body = [
    `Dear ${poc.div} Team,`,
    ``,
    `A civic complaint has been flagged via GovWatch that requires your attention.`,
    ``,
    `Category:  ${issue.category}`,
    `Area:      ${issue.area}`,
    `Severity:  ${issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}`,
    `Reported:  ${formatDate(issue.date)}`,
    `Age:       ${getIssueAge(issue.date)}`,
    `TAT:       ${poc.tat} hours (action due by ${dueStr})`,
    ``,
    `Complaint:`,
    `"${issue.text}"`,
    ``,
    `Source tweet: ${issue.source_url || "N/A"}`,
    ``,
    `Please acknowledge this complaint and update its status within ${poc.tat} hours.`,
    ``,
    `— GovWatch Civic Intelligence Dashboard`,
    `  https://ishanfso.github.io/GovWatch/dashboard/`,
  ].join("\n");
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(poc.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ── Map ────────────────────────────────────────────────────────────

function renderMap(issues) {
  if (!mapInitialized) {
    leafletMap = L.map("leaflet-map").setView([12.9716, 77.5946], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(leafletMap);
    mapInitialized = true;
  }

  mapMarkers.forEach(m => m.remove());
  mapMarkers = [];

  issues.forEach(issue => {
    const coords = AREA_COORDS[issue.area] || AREA_COORDS["Bangalore"];
    const jitter = () => (Math.random() - 0.5) * 0.008;
    const latLng = [coords[0] + jitter(), coords[1] + jitter()];
    const color = SEV_COLORS[issue.severity] || "#9e9487";
    const marker = L.circleMarker(latLng, {
      radius: issue.severity === "high" ? 10 : issue.severity === "medium" ? 7 : 5,
      fillColor: color,
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    });
    const sevLabel = { high: "High", medium: "Medium", low: "Low" }[issue.severity] || "";
    marker.bindPopup(`
      <div style="max-width:240px;font-family:system-ui,sans-serif;font-size:13px">
        <div style="font-weight:700;color:#1f4d3a;margin-bottom:4px">${esc(issue.category)} — ${esc(issue.area)}</div>
        <div style="color:#202124;line-height:1.45;margin-bottom:6px">${esc(issue.text)}</div>
        <div style="color:#9e9487;font-size:11px">${sevLabel} · ❤️ ${issue.likes || 0} 🔁 ${issue.retweets || 0} · ${formatDate(issue.date)}</div>
        ${issue.source_url ? `<a href="${esc(issue.source_url)}" target="_blank" style="color:#31572c;font-weight:600;font-size:12px">View Tweet ↗</a>` : ""}
      </div>
    `);
    marker.addTo(leafletMap);
    mapMarkers.push(marker);
  });
}

// ── Departments ────────────────────────────────────────────────────

function renderDepartments(issues) {
  const grid = document.getElementById("dept-grid");
  grid.innerHTML = Object.entries(DEPARTMENT_MAP).map(([name, info]) => {
    const deptIssues = issues.filter(i => info.categories.includes(i.category));
    return deptCard(name, info, deptIssues);
  }).join("");

  grid.querySelectorAll(".dept-filter-link").forEach(btn => {
    btn.addEventListener("click", () => {
      activeFilters.dept = btn.dataset.filterDept;
      document.getElementById("dept-filter").value = btn.dataset.filterDept;
      switchTab("queue");
      applyFilters();
    });
  });
}

function deptCard(name, info, issues) {
  const high   = issues.filter(i => i.severity === "high").length;
  const medium = issues.filter(i => i.severity === "medium").length;
  const low    = issues.filter(i => i.severity === "low").length;

  const sevRow = issues.length === 0
    ? `<span class="sev-pill sev-pill-none">No active issues</span>`
    : [
        high   ? `<span class="sev-pill sev-pill-high">${high} High</span>` : "",
        medium ? `<span class="sev-pill sev-pill-medium">${medium} Medium</span>` : "",
        low    ? `<span class="sev-pill sev-pill-low">${low} Low</span>` : "",
      ].join("");

  const topIssues = [...issues]
    .sort((a, b) => {
      const s = { high: 0, medium: 1, low: 2 };
      return s[a.severity] - s[b.severity] || (b.likes + b.retweets) - (a.likes + a.retweets);
    })
    .slice(0, 4);

  const issueRows = issues.length === 0
    ? `<div class="dept-no-issues">No issues in current view</div>`
    : topIssues.map(i => `
        <div class="dept-issue-row">
          <span class="dept-issue-cat">${esc(i.category)}</span>
          <span class="dept-issue-text" title="${esc(i.text)}">${esc(i.text)}</span>
          <span class="dept-issue-sev" style="color:${SEV_COLORS[i.severity]}">${i.severity === "high" ? "🔴" : i.severity === "medium" ? "🟡" : "🟢"}</span>
        </div>`).join("");

  return `
  <div class="dept-card">
    <div class="dept-header">
      <span class="dept-icon">${info.icon}</span>
      <div>
        <div class="dept-name">${esc(name)}</div>
        <div class="dept-desc">${esc(info.desc)}</div>
      </div>
      <span class="dept-total">${issues.length}</span>
    </div>
    <div class="dept-severity-row">${sevRow}</div>
    <div class="dept-issues-label">Top Issues</div>
    ${issueRows}
    <button class="dept-filter-link" data-filter-dept="${esc(name)}">
      See all ${esc(name)} issues →
    </button>
  </div>`;
}

// ── Analytics ──────────────────────────────────────────────────────

function renderAnalytics(issues) {
  renderChart(issues);
  renderAreaChart(issues);
  renderBreakdownList("mla-breakdown",  issues, "constituency",  false);
  renderBreakdownList("mp-breakdown",   issues, "mp",             false);
  renderBreakdownList("zone-breakdown", issues, "city_corp",      true);

  // Severity breakdown bars
  const high   = issues.filter(i => i.severity === "high").length;
  const medium = issues.filter(i => i.severity === "medium").length;
  const low    = issues.filter(i => i.severity === "low").length;
  const total  = issues.length || 1;

  document.getElementById("sev-breakdown").innerHTML = [
    { label: "High",   count: high,   cls: "high" },
    { label: "Medium", count: medium, cls: "medium" },
    { label: "Low",    count: low,    cls: "low" },
  ].map(s => `
    <div class="sev-bar-row">
      <div class="sev-bar-label">${s.label}</div>
      <div class="sev-bar-track"><div class="sev-bar-fill sev-bar-fill-${s.cls}" style="width:${(s.count/total*100).toFixed(1)}%"></div></div>
      <div class="sev-bar-count">${s.count}</div>
    </div>`).join("");

  // SLA table by dept
  const now = Date.now();
  const deptStats = {};
  for (const [dName, dInfo] of Object.entries(DEPARTMENT_MAP)) {
    const di = issues.filter(i => dInfo.categories.includes(i.category));
    const od = di.filter(i => {
      if (getStatus(i.id) === "resolved") return false;
      const poc = POC_DIRECTORY[i.category] || POC_DIRECTORY.Other;
      return (now - new Date(i.date).getTime()) / 36e5 >= poc.tat;
    }).length;
    deptStats[dName] = { total: di.length, overdue: od, resolved: di.filter(i => getStatus(i.id) === "resolved").length };
  }

  const tableRows = Object.entries(deptStats).map(([d, s]) =>
    `<tr>
      <td>${esc(d)}</td>
      <td>${s.total}</td>
      <td class="sla-overdue-count">${s.overdue}</td>
      <td>${s.resolved}</td>
      <td>${s.total > 0 ? ((s.resolved / s.total) * 100).toFixed(0) + "%" : "—"}</td>
    </tr>`
  ).join("");

  document.getElementById("sla-table").innerHTML = `
    <table class="sla-table">
      <thead><tr><th>Department</th><th>Total</th><th>Overdue</th><th>Resolved</th><th>Resolution %</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>`;
}

function renderChart(issues) {
  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;
  const counts = countBy(issues, "category");
  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const values = labels.map(l => counts[l]);
  const colors = labels.map(l => CATEGORY_COLORS[l] || CATEGORY_COLORS.Other);

  if (chart) chart.destroy();
  chart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Issues", data: values, backgroundColor: colors, borderRadius: 4, borderSkipped: false }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.raw} issue${c.raw !== 1 ? "s" : ""}` } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: "#e2dbd0" } },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
}

let areaChart = null;

function renderAreaChart(issues) {
  const ctx = document.getElementById("areaChart");
  if (!ctx) return;

  // Only issues with a specific area (not generic "Bangalore")
  const located = issues.filter(i => i.area && i.area !== "Bangalore");
  const counts = countBy(located, "area");
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);

  if (!entries.length) {
    ctx.closest(".analytics-card").querySelector(".analytics-title").nextSibling.textContent = "";
    ctx.closest(".chart-wrap").innerHTML = '<div class="breakdown-no-data">No location-tagged issues yet. Run enrich_locations.py to add ward data.</div>';
    return;
  }

  const labels = entries.map(e => e[0]);
  const values = entries.map(e => e[1]);
  const colors = labels.map((_, i) => `hsl(${150 + (i * 9) % 120}, 45%, ${38 + (i % 3) * 5}%)`);

  if (areaChart) areaChart.destroy();
  areaChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Issues", data: values, backgroundColor: colors, borderRadius: 3, borderSkipped: false }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.raw} issue${c.raw !== 1 ? "s" : ""}` } },
      },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: "#e2dbd0" } },
        y: { ticks: { font: { size: 10 } }, grid: { display: false } },
      },
    },
  });
}

function renderBreakdownList(elId, issues, wardField, chips) {
  const el = document.getElementById(elId);
  if (!el) return;

  // Pull field value from each issue's ward (requires ward_name to be set)
  const counts = {};
  for (const issue of issues) {
    if (!issue.ward_name || !officialsLoaded) continue;
    const ward = officialsData.wardLookup[issue.ward_name.toLowerCase()];
    if (!ward) continue;
    const val = ward[wardField];
    if (!val) continue;
    counts[val] = (counts[val] || 0) + 1;
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    el.innerHTML = '<div class="breakdown-no-data">No ward-mapped data yet.</div>';
    return;
  }

  const max = entries[0][1];

  if (chips) {
    el.innerHTML = entries.map(([name, count]) => `
      <div class="breakdown-chip">
        <span class="breakdown-chip-name">${esc(name)}</span>
        <span class="breakdown-chip-count">${count}</span>
      </div>`).join("");
  } else {
    el.innerHTML = entries.slice(0, 15).map(([name, count]) => `
      <div class="breakdown-row">
        <div class="breakdown-name" title="${esc(name)}">${esc(name)}</div>
        <div class="breakdown-bar-track"><div class="breakdown-bar-fill" style="width:${(count/max*100).toFixed(1)}%"></div></div>
        <div class="breakdown-count">${count}</div>
      </div>`).join("");
  }
}

// ── Role Banner ────────────────────────────────────────────────────

function renderRoleBanner(role) {
  const banner = document.getElementById("role-banner");
  if (!banner) return;
  const cats = (ROLE_DEPARTMENTS[role] || []).join(" · ");
  banner.innerHTML = `
    <span class="role-banner-icon">👤</span>
    <span class="role-banner-text">
      <strong>${ROLE_LABELS[role]}</strong>
      <span class="role-banner-cats">Showing: ${cats}</span>
    </span>
    <a class="role-banner-clear" href="${window.location.pathname}">Clear role view ×</a>
  `;
  banner.classList.remove("hidden");
}

// ── Status (localStorage) ──────────────────────────────────────────

function getStatus(id) {
  return localStorage.getItem(`gw_status_${id}`) || "open";
}

function setStatus(id, value) {
  localStorage.setItem(`gw_status_${id}`, value);
}

// ── Export CSV ─────────────────────────────────────────────────────

function exportCSV() {
  const issues = getFiltered();
  const headers = ["ID", "Date", "Category", "Area", "Severity", "Status", "Likes", "Retweets", "Author", "Tweet Text", "URL"];
  const rows = issues.map(i => [
    i.id, i.date || "", i.category, i.area, i.severity, getStatus(i.id),
    i.likes || 0, i.retweets || 0, i.author || "",
    `"${(i.text || "").replace(/"/g, '""')}"`,
    i.source_url || "",
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `govwatch_bangalore_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Helpers ────────────────────────────────────────────────────────

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1; return acc;
  }, {});
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (_) { return ""; }
}

function setLastUpdated() {
  const ts = allIssues.map(i => i.date ? new Date(i.date).getTime() : 0).filter(Boolean);
  if (!ts.length) return;
  document.getElementById("last-updated").textContent =
    "Latest: " + new Date(Math.max(...ts)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Officials Data & State ─────────────────────────────────────────

let officialsData = {
  wards: [],
  wardLookup: {},       // ward_name.toLowerCase() -> ward object
  wardNoLookup: {},     // ward_no -> ward object
  areaToWard: {},       // from area_ward_lookup.json
  issueRouting: [],
  escalationChains: {},
  cityCorpContacts: [],
  swmSe: [],
  swmAee: [],
  bescomUnits: [],
  bwssb: [],
  traffic: [],
  mlas: [],
  mps: [],
  bbmpDir: [],
};
let officialsLoaded = false;
let officialsLoading = false;
let activeOrgDept = "BBMP";

// ── Officials Init ─────────────────────────────────────────────────

async function initOfficials() {
  if (officialsLoaded) return;
  if (officialsLoading) return;
  officialsLoading = true;

  document.getElementById("org-chart-container").innerHTML = '<div class="loading">Loading officials data...</div>';
  document.getElementById("routing-guide").innerHTML = '<div class="loading">Loading routing guide...</div>';

  try {
    const base = "../data/officials/";
    const [
      wards, areaWard, routing, escalation, cityCorpContacts,
      swmSe, swmAee, bescomUnits, bwssb, traffic, mlas, mps, bbmpDir
    ] = await Promise.all([
      fetch(base + "wards.json").then(r => r.json()).catch(() => []),
      fetch(base + "area_ward_lookup.json").then(r => r.json()).catch(() => ({})),
      fetch(base + "issue_routing.json").then(r => r.json()).catch(() => []),
      fetch(base + "escalation_chains.json").then(r => r.json()).catch(() => ({})),
      fetch(base + "city_corp_contacts.json").then(r => r.json()).catch(() => []),
      fetch(base + "swm_se.json").then(r => r.json()).catch(() => []),
      fetch(base + "swm_aee.json").then(r => r.json()).catch(() => []),
      fetch(base + "bescom_units.json").then(r => r.json()).catch(() => []),
      fetch(base + "bwssb_stations.json").then(r => r.json()).catch(() => []),
      fetch(base + "traffic_rti.json").then(r => r.json()).catch(() => []),
      fetch(base + "mlas.json").then(r => r.json()).catch(() => []),
      fetch(base + "mps.json").then(r => r.json()).catch(() => []),
      fetch(base + "bbmp_directory.json").then(r => r.json()).catch(() => []),
    ]);

    officialsData.wards = Array.isArray(wards) ? wards : [];
    officialsData.areaToWard = areaWard || {};
    officialsData.issueRouting = Array.isArray(routing) ? routing : [];
    officialsData.escalationChains = escalation || {};
    officialsData.cityCorpContacts = Array.isArray(cityCorpContacts) ? cityCorpContacts : [];
    officialsData.swmSe = Array.isArray(swmSe) ? swmSe : [];
    officialsData.swmAee = Array.isArray(swmAee) ? swmAee : [];
    officialsData.bescomUnits = Array.isArray(bescomUnits) ? bescomUnits : [];
    officialsData.bwssb = Array.isArray(bwssb) ? bwssb : [];
    officialsData.traffic = Array.isArray(traffic) ? traffic : [];
    officialsData.mlas = Array.isArray(mlas) ? mlas : [];
    officialsData.mps = Array.isArray(mps) ? mps : [];
    officialsData.bbmpDir = Array.isArray(bbmpDir) ? bbmpDir : [];

    // Build lookup tables
    officialsData.wardLookup = {};
    officialsData.wardNoLookup = {};
    officialsData.wards.forEach(w => {
      if (w.ward_name) officialsData.wardLookup[w.ward_name.toLowerCase()] = w;
      if (w.ward_no) officialsData.wardNoLookup[String(w.ward_no)] = w;
    });

    officialsLoaded = true;
  } catch (err) {
    console.error("Officials data load error:", err);
  }

  officialsLoading = false;

  // If a complaint detail panel is already open, re-render it so smart contacts appear
  if (officialsLoaded && selectedIssueId) {
    const issue = allIssues.find(i => i.id === selectedIssueId);
    if (issue) renderDetailPanel(issue);
  }

  // Re-render analytics breakdown charts (they depend on ward data from officialsData)
  if (activeTab === "analytics") renderAnalytics(getFiltered());

  // Render initial org chart and routing guide (only if Officials tab is active)
  renderOrgChart(activeOrgDept);
  renderRoutingGuide();
  initWardSearch();
  initOrgChipListeners();
}

// ── Ward Search ────────────────────────────────────────────────────

function initWardSearch() {
  const input = document.getElementById("ward-search");
  const suggestions = document.getElementById("ward-suggestions");
  if (!input || !suggestions) return;

  // Add "Detect My Location" button after search wrap
  const searchWrap = document.querySelector(".ward-search-wrap");
  if (searchWrap && !document.getElementById("detect-location-btn")) {
    const locBtn = document.createElement("button");
    locBtn.id = "detect-location-btn";
    locBtn.className = "btn-detect-location";
    locBtn.innerHTML = "&#127757; Detect My Location";
    locBtn.addEventListener("click", detectNearestWard);
    searchWrap.after(locBtn);
  }

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    if (!q || q.length < 2) {
      suggestions.classList.add("hidden");
      return;
    }

    // Search all 369 wards
    const wardMatches = officialsData.wards.filter(w =>
      (w.ward_name && w.ward_name.toLowerCase().includes(q)) ||
      (w.constituency && w.constituency.toLowerCase().includes(q)) ||
      (w.ward_no && String(w.ward_no) === q)
    ).slice(0, 6);

    // Also check the 28 named areas from areaToWard
    const areaMatches = Object.entries(officialsData.areaToWard)
      .filter(([area]) => area.toLowerCase().includes(q))
      .map(([area, info]) => {
        const ward = officialsData.wardLookup[info.ward_name.toLowerCase()] || officialsData.wardNoLookup[String(info.ward_no)];
        return ward ? { ...ward, _matchedArea: area } : null;
      })
      .filter(Boolean)
      .filter(w => !wardMatches.find(m => m.ward_no === w.ward_no));

    const combined = [...areaMatches, ...wardMatches].slice(0, 8);

    if (combined.length === 0) {
      suggestions.innerHTML = `<div class="ward-suggestion-item" style="color:var(--muted);cursor:default">No wards found for "${esc(input.value)}"</div>`;
      suggestions.classList.remove("hidden");
      return;
    }

    suggestions.innerHTML = combined.map(w => `
      <div class="ward-suggestion-item" data-ward-no="${esc(String(w.ward_no))}" data-ward-name="${esc(w.ward_name)}">
        <div><strong>${esc(w._matchedArea || w.ward_name)}</strong>${w._matchedArea ? ` <span style="color:var(--muted);font-size:.78rem"> → Ward ${esc(String(w.ward_no))}: ${esc(w.ward_name)}</span>` : ""}</div>
        <div class="ward-suggestion-meta">${esc(w.constituency || "")}${w.city_corp ? " &middot; " + esc(w.city_corp) : ""}</div>
      </div>
    `).join("");
    suggestions.classList.remove("hidden");

    suggestions.querySelectorAll(".ward-suggestion-item[data-ward-no]").forEach(item => {
      item.addEventListener("click", () => {
        const wardName = item.dataset.wardName;
        const ward = wardName ? officialsData.wardLookup[wardName.toLowerCase()] : officialsData.wardNoLookup[item.dataset.wardNo];
        if (ward) {
          input.value = ward.ward_name;
          suggestions.classList.add("hidden");
          renderWardCard(ward);
          document.getElementById("ward-results").scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    });
  });

  // Also trigger on Enter
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const first = suggestions.querySelector(".ward-suggestion-item[data-ward-no]");
      if (first) first.click();
    }
  });

  // Close suggestions on outside click
  document.addEventListener("click", e => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.add("hidden");
    }
  });
}

// ── Location Detection ─────────────────────────────────────────────

async function detectNearestWard() {
  const resultsEl = document.getElementById("ward-results");
  const input = document.getElementById("ward-search");
  const btn = document.getElementById("detect-location-btn");

  if (!navigator.geolocation) {
    if (resultsEl) resultsEl.innerHTML = `<div class="ward-empty">Geolocation is not supported by your browser.</div>`;
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = "&#8987; Locating..."; }

  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        const { latitude, longitude } = pos.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
        const resp = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await resp.json();
        const addr = data.address || {};

        // Try candidates from most-specific to least-specific
        const candidates = [
          addr.neighbourhood, addr.suburb, addr.quarter,
          addr.residential, addr.village, addr.city_district,
          addr.county, addr.town, addr.city
        ].filter(Boolean);

        const ward = findBestWardMatch(candidates);

        if (ward) {
          if (input) input.value = ward.ward_name;
          renderWardCard(ward);
          document.getElementById("ward-results").scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
          if (resultsEl) resultsEl.innerHTML = `<div class="ward-empty" style="padding:12px">Could not match your location (${candidates.join(", ")}) to a ward. Try searching manually.</div>`;
        }
      } catch (err) {
        if (resultsEl) resultsEl.innerHTML = `<div class="ward-empty" style="padding:12px">Location lookup failed. Try searching manually.</div>`;
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = "&#127757; Detect My Location"; }
      }
    },
    () => {
      if (btn) { btn.disabled = false; btn.innerHTML = "&#127757; Detect My Location"; }
      if (resultsEl) resultsEl.innerHTML = `<div class="ward-empty" style="padding:12px">Location access denied. Please allow location access and try again.</div>`;
    },
    { timeout: 10000 }
  );
}

function findBestWardMatch(candidates) {
  if (!candidates || candidates.length === 0) return null;

  // Pass 1: direct substring match against known area names (most reliable)
  for (const candidate of candidates) {
    const lc = candidate.toLowerCase();
    for (const [key, info] of Object.entries(officialsData.areaToWard)) {
      const kl = key.toLowerCase();
      if (lc === kl || lc.includes(kl) || kl.includes(lc)) {
        const ward = officialsData.wardLookup[info.ward_name.toLowerCase()] || officialsData.wardNoLookup[String(info.ward_no)];
        if (ward) return ward;
      }
    }
  }

  // Pass 2: trigram similarity fallback
  let best = null, bestScore = 0;
  for (const candidate of candidates) {
    const lc = candidate.toLowerCase();

    for (const [key, info] of Object.entries(officialsData.areaToWard)) {
      const score = trigramSimilarity(lc, key.toLowerCase());
      if (score > bestScore && score > 0.4) {
        bestScore = score;
        best = officialsData.wardLookup[info.ward_name.toLowerCase()] || officialsData.wardNoLookup[String(info.ward_no)];
      }
    }

    for (const w of officialsData.wards) {
      if (!w.ward_name) continue;
      const score = trigramSimilarity(lc, w.ward_name.toLowerCase());
      if (score > bestScore && score > 0.4) {
        bestScore = score;
        best = w;
      }
    }
  }
  return best;
}

function trigramSimilarity(a, b) {
  const tg = s => {
    const out = new Set();
    for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
    return out;
  };
  const ta = tg(a), tb = tg(b);
  let inter = 0;
  ta.forEach(t => { if (tb.has(t)) inter++; });
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ── Ward-by-area lookup (robust, case-insensitive) ─────────────────

function findWardByArea(area) {
  if (!area || !officialsLoaded) return null;
  const lc = area.toLowerCase().trim();

  // 1. Exact key match in areaToWard
  for (const [key, info] of Object.entries(officialsData.areaToWard)) {
    if (key.toLowerCase() === lc) return officialsData.wardLookup[info.ward_name.toLowerCase()] || officialsData.wardNoLookup[String(info.ward_no)];
  }

  // 2. Partial match: area name contains or is contained in the key
  for (const [key, info] of Object.entries(officialsData.areaToWard)) {
    const kl = key.toLowerCase();
    if (lc.includes(kl) || kl.includes(lc)) return officialsData.wardLookup[info.ward_name.toLowerCase()] || officialsData.wardNoLookup[String(info.ward_no)];
  }

  // 3. Exact match in 369 ward names
  const exact = officialsData.wardLookup[lc];
  if (exact) return exact;

  // 4. Partial match in ward names
  return officialsData.wards.find(w => w.ward_name && w.ward_name.toLowerCase().includes(lc)) || null;
}

// ── Phone link helper ──────────────────────────────────────────────

function phoneLink(num, classes = "ward-contact-phone") {
  if (!num || !num.trim()) return "";
  const digits = num.replace(/[^\d+]/g, "");
  return `<a href="tel:${esc(digits)}" class="${classes}">${esc(num)}</a>`;
}

// ── Ward Card ──────────────────────────────────────────────────────

function renderWardCard(ward) {
  const el = document.getElementById("ward-results");
  if (!el) return;

  const bescomParsed = parseBescomAee(ward.bescom_aee || "");

  // Build cells
  const cells = [
    buildWardCell("Waste / SWM", [
      ward.swm_jhi ? `<div class="ward-contact-name">${esc(ward.swm_jhi)}</div>` : "",
      ward.swm_jhi_mobile ? phoneLink(ward.swm_jhi_mobile) : "",
      ward.swm_aee ? `<div class="ward-contact-detail">AEE: ${esc(ward.swm_aee)}</div>` : "",
      ward.swm_aee_mobile ? phoneLink(ward.swm_aee_mobile) : "",
      ward.swm_aee_email ? `<a class="ward-email-btn" href="${buildWardEmail(ward.swm_aee_email, ward, "Waste / SWM")}" target="_blank">&#128231; Email AEE</a>` : "",
      !ward.swm_jhi && !ward.swm_aee ? `<div class="ward-empty">Data not available</div>` : "",
    ].filter(Boolean).join("")),

    buildWardCell("Electricity / BESCOM", [
      bescomParsed.name ? `<div class="ward-contact-name">${esc(bescomParsed.name)}</div>` : "",
      bescomParsed.phone ? phoneLink(bescomParsed.phone) : "",
      ward.bescom_subdivision ? `<div class="ward-contact-detail">Subdivision ${esc(ward.bescom_subdivision)}</div>` : "",
      ward.bescom_unit ? `<div class="ward-contact-detail">Unit: ${esc(ward.bescom_unit)}</div>` : "",
      bescomParsed.email ? `<a class="ward-email-btn" href="${buildWardEmail(bescomParsed.email, ward, "Electricity / BESCOM")}" target="_blank">&#128231; Email AEE</a>` : "",
      !bescomParsed.name && !ward.bescom_aee ? `<div class="ward-empty">Data not available</div>` : "",
    ].filter(Boolean).join("")),

    buildWardCell("Water / BWSSB", [
      ward.bwssb_ae ? `<div class="ward-contact-name">${esc(ward.bwssb_ae)}</div>` : "",
      ward.bwssb_ae_mobile ? phoneLink(ward.bwssb_ae_mobile) : "",
      ward.bwssb_aee ? `<div class="ward-contact-detail">AEE: ${esc(ward.bwssb_aee)}</div>` : "",
      ward.bwssb_aee_mobile ? phoneLink(ward.bwssb_aee_mobile) : "",
      ward.bwssb_aee_email ? `<a class="ward-email-btn" href="${buildWardEmail(ward.bwssb_aee_email, ward, "Water / BWSSB")}" target="_blank">&#128231; Email AEE</a>` : "",
      !ward.bwssb_ae && !ward.bwssb_aee ? `<div class="ward-empty">Data not available</div>` : "",
    ].filter(Boolean).join("")),

    buildWardCell("Traffic Police", [
      ward.traffic_ps ? `<div class="ward-contact-detail">PS: ${esc(ward.traffic_ps)}</div>` : "",
      ward.traffic_pio ? `<div class="ward-contact-name">${esc(ward.traffic_pio)}</div>` : "",
      ward.traffic_pio_contact ? phoneLink(ward.traffic_pio_contact) : "",
      !ward.traffic_ps && !ward.traffic_pio ? `<div class="ward-empty">Data not available</div>` : "",
    ].filter(Boolean).join("")),

    buildWardCell("Roads / City Corp", [
      ward.city_commissioner ? `<div class="ward-contact-name">${esc(ward.city_commissioner)}</div>` : "",
      ward.city_commissioner_contact ? phoneLink(ward.city_commissioner_contact) : "",
      ward.city_corp ? `<div class="ward-contact-detail">${esc(ward.city_corp)}</div>` : "",
      ward.city_commissioner_email ? `<a class="ward-email-btn" href="${buildWardEmail(ward.city_commissioner_email, ward, "Roads / City Corporation")}" target="_blank">&#128231; Email Commissioner</a>` : "",
    ].filter(Boolean).join("")),

    buildWardCell("Councillor", [
      ward.councillor ? `<div class="ward-contact-name">${esc(ward.councillor)}</div>` : `<div class="ward-empty">Not available</div>`,
      ward.councillor_mobile ? phoneLink(ward.councillor_mobile) : "",
      ward.councillor_confidence && ward.councillor_confidence !== "High" && ward.councillor
        ? `<div class="ward-note">Confidence: ${esc(ward.councillor_confidence)} — verify before contacting</div>` : "",
    ].filter(Boolean).join("")),

    buildWardCell("MLA", [
      ward.mla ? `<div class="ward-contact-name">${esc(ward.mla)}</div>` : `<div class="ward-empty">Not available</div>`,
      ward.mla_party ? `<div class="ward-contact-detail">${esc(ward.mla_party)}</div>` : "",
      ward.mla_phones ? phoneLink(ward.mla_phones) : "",
      ward.mla_email ? `<a class="ward-email-btn" href="${buildWardEmail(ward.mla_email, ward, "Civic issue")}" target="_blank">&#128231; Email MLA</a>` : "",
    ].filter(Boolean).join("")),

    buildWardCell("MP", [
      ward.mp ? `<div class="ward-contact-name">${esc(ward.mp)}</div>` : `<div class="ward-empty">Not available</div>`,
      ward.mp_phones ? phoneLink(ward.mp_phones) : "",
      ward.mp_email ? `<a class="ward-email-btn" href="${buildWardEmail(ward.mp_email, ward, "Civic issue")}" target="_blank">&#128231; Email MP</a>` : "",
    ].filter(Boolean).join("")),
  ];

  el.innerHTML = `
    <div class="ward-card">
      <div class="ward-card-header">
        <div class="ward-card-header-name">Ward ${esc(ward.ward_no || "")} &mdash; ${esc(ward.ward_name || "")}</div>
        <div class="ward-card-header-meta">
          <span>Constituency: ${esc(ward.constituency || "N/A")}</span>
          <span>${esc(ward.city_corp || "")}</span>
        </div>
      </div>
      <div class="ward-card-grid">
        ${cells.join("")}
      </div>
    </div>
  `;
}

function buildWardCell(label, content) {
  return `<div class="ward-dept-cell"><div class="ward-dept-label">${esc(label)}</div>${content}</div>`;
}

function buildWardEmail(toEmail, ward, subject) {
  const sub = `[GovWatch] ${subject} — Ward ${ward.ward_no} ${ward.ward_name}`;
  const body = `Dear Official,\n\nI am writing to bring a civic issue to your attention in Ward ${ward.ward_no} (${ward.ward_name}), ${ward.constituency}.\n\n[Describe the issue here]\n\n— GovWatch Civic Intelligence Dashboard\nhttps://ishanfso.github.io/GovWatch/dashboard/`;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
}

// ── Parse BESCOM AEE string ────────────────────────────────────────

function parseBescomAee(str) {
  if (!str) return {};
  // Format: "Assistant Executive Engineer Sri. Jagadish M.H 8277893186 AEE Ele <aees20.work@gmail.com >"
  const emailMatch = str.match(/<([^>]+)>/);
  const email = emailMatch ? emailMatch[1].trim() : "";
  const phoneMatch = str.match(/\b(\d{10})\b/);
  const phone = phoneMatch ? phoneMatch[1] : "";
  // Extract name: text between "Engineer" or "Sri." and the phone
  let name = "";
  const nameMatch = str.match(/(?:Assistant Executive Engineer|Sri\.|Smt\.)\s+([A-Za-z\s\.]+?)(?:\s+\d{10}|\s+AEE|$)/);
  if (nameMatch) name = nameMatch[1].trim();
  return { name, phone, email };
}

// ── Org Chart ──────────────────────────────────────────────────────

function initOrgChipListeners() {
  const chips = document.querySelectorAll("#org-dept-chips .view-chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeOrgDept = chip.dataset.dept;
      renderOrgChart(activeOrgDept);
    });
  });
}

function renderOrgChart(dept) {
  const container = document.getElementById("org-chart-container");
  if (!container) return;

  if (!officialsLoaded) {
    container.innerHTML = '<div class="loading">Loading...</div>';
    return;
  }

  if (dept === "BBMP") {
    const chain = officialsData.escalationChains["BBMP / City Corporation Engineering"] || [];
    // Group city corp contacts by corporation
    const corps = {};
    officialsData.cityCorpContacts.forEach(c => {
      if (!corps[c.corporation]) corps[c.corporation] = [];
      corps[c.corporation].push(c);
    });

    const chainHTML = chain.map(level => `
      <div class="org-level">
        <div class="org-level-num">${esc(level.level)}</div>
        <div class="org-level-body">
          <div class="org-level-role">${esc(level.role)}</div>
          <div class="org-level-use">${esc(level.use_for)}</div>
          ${level.notes ? `<div class="ward-note">${esc(level.notes)}</div>` : ""}
        </div>
      </div>
    `).join("");

    const corpCards = Object.entries(corps).map(([corp, contacts]) => {
      const cards = contacts.slice(0, 4).map(c => `
        <div class="org-contact-card">
          <div class="org-contact-role">${esc(c.role)}${c.zone ? " &mdash; " + esc(c.zone) : ""}</div>
          <div class="org-contact-name">${esc(c.name)}</div>
          <div class="org-contact-info">${esc(c.phone || "")}${c.email ? " &middot; " + esc(c.email) : ""}</div>
        </div>
      `).join("");
      return `
        <div style="margin-bottom:16px">
          <div class="ward-dept-label" style="margin-bottom:8px">${esc(corp)}</div>
          <div class="org-level-cards">${cards}</div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="org-chart">${chainHTML}</div>
      <div style="margin-top:20px">
        <div class="officials-section-title" style="font-size:.85rem;margin-bottom:12px">City Corporation Commissioners &amp; Key Contacts</div>
        ${corpCards}
      </div>
    `;

  } else if (dept === "BESCOM") {
    const chain = officialsData.escalationChains["BESCOM"] || [];
    const chainHTML = chain.map(level => `
      <div class="org-level">
        <div class="org-level-num">${esc(level.level)}</div>
        <div class="org-level-body">
          <div class="org-level-role">${esc(level.role)}</div>
          <div class="org-level-use">${esc(level.use_for)}</div>
        </div>
      </div>
    `).join("");

    // Group by zone -> circle -> show summary
    const zones = {};
    officialsData.bescomUnits.forEach(u => {
      const z = u.zone || "Other";
      if (!zones[z]) zones[z] = {};
      const c = u.circle || "General";
      if (!zones[z][c]) zones[z][c] = [];
      zones[z][c].push(u);
    });

    const zoneCards = Object.entries(zones).slice(0, 4).map(([zone, circles]) => {
      const circleItems = Object.entries(circles).map(([circle, units]) => {
        const parsed = parseBescomAee(units[0]?.aee || "");
        return `<div class="org-contact-card">
          <div class="org-contact-role">${esc(circle)} Circle</div>
          <div class="org-contact-name">${parsed.name ? esc(parsed.name) : "AEE " + esc(units[0]?.subdivision || "")}</div>
          <div class="org-contact-info">${esc(units.length)} subdivision${units.length !== 1 ? "s" : ""}</div>
        </div>`;
      }).join("");
      return `
        <div style="margin-bottom:16px">
          <div class="ward-dept-label" style="margin-bottom:8px">${esc(zone)}</div>
          <div class="org-level-cards">${circleItems}</div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="org-chart">${chainHTML}</div>
      <div style="margin-top:20px">
        <div class="officials-section-title" style="font-size:.85rem;margin-bottom:12px">BESCOM Zones &amp; Circles</div>
        ${zoneCards}
      </div>
    `;

  } else if (dept === "BWSSB") {
    const chain = officialsData.escalationChains["BWSSB"] || [];
    const chainHTML = chain.map(level => `
      <div class="org-level">
        <div class="org-level-num">${esc(level.level)}</div>
        <div class="org-level-body">
          <div class="org-level-role">${esc(level.role)}</div>
          <div class="org-level-use">${esc(level.use_for)}</div>
        </div>
      </div>
    `).join("");

    // Group by division
    const divs = {};
    officialsData.bwssb.forEach(s => {
      const d = s.division || "Other";
      if (!divs[d]) divs[d] = { ee: s.ee_name, email: s.division_email, stations: [] };
      divs[d].stations.push(s);
    });

    const divCards = Object.entries(divs).slice(0, 4).map(([div, info]) => {
      return `<div class="org-contact-card">
        <div class="org-contact-role">${esc(div)} Division</div>
        <div class="org-contact-name">${esc(info.ee || "EE")}</div>
        <div class="org-contact-info">${info.stations.length} service station${info.stations.length !== 1 ? "s" : ""}${info.email ? " &middot; " + esc(info.email) : ""}</div>
      </div>`;
    }).join("");

    container.innerHTML = `
      <div class="org-chart">${chainHTML}</div>
      <div style="margin-top:20px">
        <div class="officials-section-title" style="font-size:.85rem;margin-bottom:12px">BWSSB Divisions</div>
        <div class="org-level-cards">${divCards}</div>
      </div>
    `;

  } else if (dept === "Traffic Police") {
    const chain = officialsData.escalationChains["Traffic Police"] || [];
    const chainHTML = chain.map(level => `
      <div class="org-level">
        <div class="org-level-num">${esc(level.level)}</div>
        <div class="org-level-body">
          <div class="org-level-role">${esc(level.role)}</div>
          <div class="org-level-use">${esc(level.use_for)}</div>
          ${level.notes ? `<div class="ward-note">${esc(level.notes)}</div>` : ""}
        </div>
      </div>
    `).join("");

    const psCards = officialsData.traffic.slice(0, 12).map(t => `
      <div class="org-contact-card">
        <div class="org-contact-role">${esc(t.ps || "")}</div>
        <div class="org-contact-name">${esc(t.pio || "")}</div>
        <div class="org-contact-info">${esc(t.pio_contact || "")}</div>
      </div>
    `).join("");

    container.innerHTML = `
      <div class="org-chart">${chainHTML}</div>
      <div style="margin-top:20px">
        <div class="officials-section-title" style="font-size:.85rem;margin-bottom:12px">Traffic Police Stations &amp; RTI Officers</div>
        <div class="org-level-cards">${psCards}</div>
      </div>
    `;

  } else if (dept === "Political") {
    const chain = officialsData.escalationChains["Political / Elected"] || [];
    const chainHTML = chain.map(level => `
      <div class="org-level">
        <div class="org-level-num">${esc(level.level)}</div>
        <div class="org-level-body">
          <div class="org-level-role">${esc(level.role)}</div>
          <div class="org-level-use">${esc(level.use_for)}</div>
          ${level.notes ? `<div class="ward-note">${esc(level.notes)}</div>` : ""}
        </div>
      </div>
    `).join("");

    const mlaCard = m => `
      <div class="org-contact-card">
        <div class="org-contact-role">${esc(m.constituency || "")}</div>
        <div class="org-contact-name">${esc(m.name || "")}</div>
        <div class="org-contact-info">${esc(m.party || "")}</div>
        ${m.phones ? phoneLink(m.phones.split(";")[0].trim(), "org-contact-info") : ""}
        ${m.email ? `<a class="ward-email-btn" style="margin-top:4px" href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.email)}&su=${encodeURIComponent("[GovWatch] Civic issue — Bangalore")}" target="_blank">&#128231; Email MLA</a>` : ""}
      </div>
    `;

    const mpCards = officialsData.mps.map(m => `
      <div class="org-contact-card">
        <div class="org-contact-role">${esc(m.constituency || "")}</div>
        <div class="org-contact-name">${esc(m.name || "")}</div>
        <div class="org-contact-info">${esc(m.party || "")}</div>
        ${m.phones ? phoneLink(m.phones.split(";")[0].trim(), "org-contact-info") : ""}
        ${m.email ? `<a class="ward-email-btn" style="margin-top:4px" href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.email)}&su=${encodeURIComponent("[GovWatch] Civic issue — Bangalore")}" target="_blank">&#128231; Email MP</a>` : ""}
      </div>
    `).join("");

    container.innerHTML = `
      <div class="org-chart">${chainHTML}</div>
      <div style="margin-top:20px">
        <div class="officials-section-title" style="font-size:.85rem;margin-bottom:12px">Members of Parliament</div>
        <div class="org-level-cards" style="margin-bottom:20px">${mpCards}</div>
        <div class="officials-section-title" style="font-size:.85rem;margin-bottom:8px">MLAs — All Bangalore Constituencies (${officialsData.mlas.length})</div>
        <input type="text" class="search-input" id="mla-search" placeholder="Filter by name or constituency..." style="max-width:340px;margin-bottom:12px" />
        <div class="org-level-cards" id="mla-cards-grid">${officialsData.mlas.map(mlaCard).join("")}</div>
      </div>
    `;

    // Wire MLA search filter
    const mlaSearch = document.getElementById("mla-search");
    const mlaGrid = document.getElementById("mla-cards-grid");
    if (mlaSearch && mlaGrid) {
      mlaSearch.addEventListener("input", () => {
        const q = mlaSearch.value.toLowerCase();
        const filtered = q ? officialsData.mlas.filter(m =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.constituency && m.constituency.toLowerCase().includes(q)) ||
          (m.party && m.party.toLowerCase().includes(q))
        ) : officialsData.mlas;
        mlaGrid.innerHTML = filtered.map(mlaCard).join("") || `<div class="ward-empty">No MLAs match "${esc(q)}"</div>`;
      });
    }
  }
}

// ── Routing Guide ──────────────────────────────────────────────────

function renderRoutingGuide() {
  const el = document.getElementById("routing-guide");
  if (!el) return;
  if (!officialsLoaded || officialsData.issueRouting.length === 0) {
    el.innerHTML = '<div class="no-results">Routing data not available.</div>';
    return;
  }

  const cards = officialsData.issueRouting.map(r => `
    <div class="routing-card">
      <div class="routing-issue-type">${esc(r.category)}</div>
      <div class="routing-step">
        <span class="routing-badge badge-first">First</span>
        <span>${esc(r.first_contact)}</span>
      </div>
      ${r.cc ? `<div class="routing-step"><span class="routing-badge badge-cc">CC</span><span>${esc(r.cc)}</span></div>` : ""}
      ${r.escalation_1 ? `<div class="routing-step"><span class="routing-badge badge-esc1">Escalate 1</span><span>${esc(r.escalation_1)}</span></div>` : ""}
      ${r.escalation_2 ? `<div class="routing-step"><span class="routing-badge badge-esc2">Escalate 2</span><span>${esc(r.escalation_2)}</span></div>` : ""}
      ${r.political ? `<div class="routing-step"><span class="routing-badge badge-political">Political</span><span>${esc(r.political)}</span></div>` : ""}
      <div class="routing-sla"><strong>SLA:</strong> ${esc(r.sla)}</div>
      ${r.notes ? `<div class="routing-notes">${esc(r.notes)}</div>` : ""}
    </div>
  `).join("");

  el.innerHTML = `<div class="routing-grid">${cards}</div>`;
}

// ── Smart Contacts ─────────────────────────────────────────────────

function getSmartContacts(issue) {
  if (!officialsLoaded) return [];

  const contacts = [];
  const category = issue.category || "Other";
  const area = issue.area || "";

  // Prefer ward stored directly on the issue (from enrich_locations.py),
  // fall back to fuzzy area-name lookup
  let ward = null;
  if (issue.ward_name) ward = officialsData.wardLookup[issue.ward_name.toLowerCase()];
  if (!ward) ward = findWardByArea(area);

  if (!ward) {
    // No ward found — show city-level department heads, not random ward officials
    return CITY_LEVEL_CONTACTS[category] || CITY_LEVEL_CONTACTS.Other;
  }

  if (category === "Waste") {
    if (ward.swm_jhi) {
      contacts.push({
        role: "SWM JHI",
        detail: ward.swm_division || "",
        name: ward.swm_jhi,
        phone: ward.swm_jhi_mobile || "",
        email: "",
        type: "first_contact",
      });
    }
    if (ward.swm_aee) {
      contacts.push({
        role: "SWM AEE",
        detail: ward.swm_division || "",
        name: ward.swm_aee,
        phone: ward.swm_aee_mobile || "",
        email: ward.swm_aee_email || "",
        type: "cc",
      });
    }
    if (!ward.swm_jhi && !ward.swm_aee) {
      const poc = POC_DIRECTORY.Waste;
      contacts.push({ role: "BBMP SWM", detail: "General", name: "SWM Helpline", phone: poc.phone, email: poc.email, type: "first_contact" });
    }

  } else if (category === "Electricity") {
    const parsed = parseBescomAee(ward.bescom_aee || "");
    if (parsed.name || parsed.phone || parsed.email) {
      contacts.push({
        role: "BESCOM AEE",
        detail: ward.bescom_subdivision ? "Subdivision " + ward.bescom_subdivision : ward.bescom_unit || "",
        name: parsed.name || "AEE",
        phone: parsed.phone || "",
        email: parsed.email || "",
        type: "first_contact",
      });
    }
    if (ward.bescom_ae_je) {
      contacts.push({
        role: "BESCOM AE/JE",
        detail: ward.bescom_unit || "",
        name: ward.bescom_ae_je.substring(0, 60),
        phone: "",
        email: "",
        type: "cc",
      });
    }
    if (contacts.length === 0) {
      const poc = POC_DIRECTORY.Electricity;
      contacts.push({ role: "BESCOM", detail: "Consumer Care", name: "Helpline", phone: poc.phone, email: poc.email, type: "first_contact" });
    }

  } else if (category === "Water") {
    if (ward.bwssb_ae) {
      contacts.push({
        role: "BWSSB AE",
        detail: ward.bwssb_station || "",
        name: ward.bwssb_ae,
        phone: ward.bwssb_ae_mobile || "",
        email: "",
        type: "first_contact",
      });
    }
    if (ward.bwssb_aee) {
      contacts.push({
        role: "BWSSB AEE",
        detail: ward.bwssb_station || "",
        name: ward.bwssb_aee,
        phone: ward.bwssb_aee_mobile || "",
        email: ward.bwssb_aee_email || "",
        type: "cc",
      });
    }
    if (!ward.bwssb_ae && !ward.bwssb_aee) {
      const poc = POC_DIRECTORY.Water;
      contacts.push({ role: "BWSSB", detail: "Consumer Grievances", name: "Helpline", phone: poc.phone, email: poc.email, type: "first_contact" });
    }

  } else if (category === "Traffic") {
    if (ward.traffic_pio) {
      contacts.push({
        role: "Traffic Police PIO",
        detail: ward.traffic_ps || "",
        name: ward.traffic_pio,
        phone: ward.traffic_pio_contact || "",
        email: "",
        type: "first_contact",
      });
    } else {
      const poc = POC_DIRECTORY.Traffic;
      contacts.push({ role: "BTP", detail: "Traffic Management", name: "Helpline", phone: poc.phone, email: poc.email, type: "first_contact" });
    }

  } else {
    // Roads, Parks, Flooding, Other — use City Commissioner
    if (ward.city_commissioner) {
      contacts.push({
        role: "City Commissioner",
        detail: ward.city_corp || "",
        name: ward.city_commissioner,
        phone: ward.city_commissioner_contact || "",
        email: ward.city_commissioner_email || "",
        type: "first_contact",
      });
    } else {
      const poc = POC_DIRECTORY[category] || POC_DIRECTORY.Other;
      contacts.push({ role: poc.dept, detail: poc.div, name: "General", phone: poc.phone, email: poc.email, type: "first_contact" });
    }
  }

  // Ward Councillor — always include if known (level 3)
  if (ward.councillor) {
    contacts.push({
      role: "Ward Councillor",
      detail: `Ward ${ward.ward_no} — ${ward.ward_name}`,
      name: ward.councillor,
      phone: ward.councillor_mobile || "",
      email: "",
      type: "cc",
    });
  }

  // MLA — always include (level 4)
  if (ward.mla) {
    const mlaRec = officialsData.mlas.find(m =>
      m.name && ward.mla && m.name.toLowerCase().includes(ward.mla.toLowerCase().split(" ").pop())
    );
    contacts.push({
      role: "MLA",
      detail: ward.constituency || "",
      name: ward.mla,
      phone: ward.mla_phones || (mlaRec && mlaRec.phones) || "",
      email: ward.mla_email || (mlaRec && mlaRec.email) || "",
      type: "escalation",
    });
  }

  // MP — highest authority (level 5)
  if (ward.mp) {
    const mpRec = officialsData.mps.find(m =>
      m.name && ward.mp && m.name.toLowerCase().includes(ward.mp.toLowerCase().split(" ").pop())
    );
    contacts.push({
      role: "MP",
      detail: mpRec ? mpRec.constituency : "",
      name: ward.mp,
      phone: ward.mp_phones || (mpRec && mpRec.phones) || "",
      email: ward.mp_email || (mpRec && mpRec.email) || "",
      type: "highest",
    });
  }

  return contacts.filter(c => c.name && c.name.trim());
}

function renderSmartContactsHTML(issue) {
  if (!officialsLoaded) {
    if (!officialsLoading) initOfficials();
    return '<div class="sc-no-contacts" style="color:var(--muted);font-style:italic">Loading contact info…</div>';
  }

  const contacts = getSmartContacts(issue);
  if (!contacts || contacts.length === 0) {
    return '<div class="sc-no-contacts">No specific contacts found for this area and category.</div>';
  }

  const badgeClass = { first_contact: "badge-first", cc: "badge-cc", escalation: "badge-esc1", highest: "badge-highest" };
  const badgeLabel = { first_contact: "First Contact", cc: "CC", escalation: "Escalation", highest: "Highest Authority" };

  const emailLinkForContacts = buildSmartEmailLink(contacts, issue);

  const rows = contacts.map(c => {
    const badge = `<span class="sc-type-badge ${badgeClass[c.type] || "badge-cc"}">${badgeLabel[c.type] || "CC"}</span>`;
    const roleDetail = c.detail ? `${esc(c.role)} &mdash; ${esc(c.detail)}` : esc(c.role);
    const emailBtn = c.email
      ? `<a class="sc-email-btn" href="${esc(buildSmartEmailLink([c], issue))}" target="_blank">Email</a>`
      : "";
    return `
      <div class="smart-contact-row">
        ${badge}
        <span class="sc-role">${roleDetail}</span>
        <span class="sc-name">${esc(c.name)}</span>
        ${c.phone ? phoneLink(c.phone.split(";")[0].trim(), "sc-phone") : ""}
        ${emailBtn}
      </div>
    `;
  }).join("");

  // Bulk email button if multiple contacts have emails
  const emailContacts = contacts.filter(c => c.email);
  const bulkBtn = emailContacts.length > 1
    ? `<a class="ward-email-btn" style="margin-top:4px" href="${esc(emailLinkForContacts)}" target="_blank">Email All Contacts</a>`
    : "";

  return `<div class="smart-contacts">${rows}${bulkBtn}</div>`;
}

function buildTweetReply(issue) {
  const author = issue.author
    ? (issue.author.startsWith("@") ? issue.author : "@" + issue.author)
    : "";
  const contacts = officialsLoaded ? getSmartContacts(issue) : [];
  const first = contacts.find(c => c.type === "first_contact");
  const poc = POC_DIRECTORY[issue.category] || POC_DIRECTORY.Other;

  const authority = first
    ? `${first.name}, ${first.role} (${poc.dept})`
    : poc.dept;

  const greeting = author ? `${author} ` : "";
  const cat = (issue.category || "civic").toLowerCase();
  const area = issue.area || "Bangalore";

  const tweet = `${greeting}Hi! We've raised your ${cat} concern in ${area} with ${authority} and requested resolution within ${poc.tat}h. We're tracking this. 🙏 #GovWatch #Bengaluru`;
  return tweet.length > 280 ? tweet.slice(0, 277) + "…" : tweet;
}

function buildSmartEmailLink(contacts, issue) {
  if (!contacts || contacts.length === 0) return "#";
  const poc = POC_DIRECTORY[issue.category] || POC_DIRECTORY.Other;

  const firstContact = contacts.find(c => c.type === "first_contact");
  const ccContacts = contacts.filter(c => c.type !== "first_contact" && c.email);

  const toEmail = (firstContact && firstContact.email) ? firstContact.email : (poc.email || "");
  const ccEmails = ccContacts.map(c => c.email).filter(Boolean).join(",");

  const subject = `[GovWatch] ${esc(issue.category)} issue — ${esc(issue.area)} — TAT: ${poc.tat}h`;

  const contactNames = contacts.map(c => `  ${c.role}: ${c.name}${c.phone ? " (" + c.phone + ")" : ""}`).join("\n");
  const body = [
    `Dear ${firstContact ? firstContact.role : "Official"},`,
    ``,
    `A civic complaint has been flagged via GovWatch that requires your attention.`,
    ``,
    `Category:  ${issue.category}`,
    `Area:      ${issue.area}`,
    `Severity:  ${issue.severity ? issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1) : ""}`,
    ``,
    `Complaint:`,
    `"${issue.text}"`,
    ``,
    `Source: ${issue.source_url || "N/A"}`,
    ``,
    `Contacts copied on this email:`,
    contactNames,
    ``,
    `Please acknowledge and update status within ${poc.tat} hours.`,
    ``,
    `— GovWatch Civic Intelligence Dashboard`,
    `  https://ishanfso.github.io/GovWatch/dashboard/`,
  ].join("\n");

  let url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (ccEmails) url += `&cc=${encodeURIComponent(ccEmails)}`;
  return url;
}

// ── Start ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
