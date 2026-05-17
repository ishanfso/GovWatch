/**
 * GovWatch Dashboard — app.js
 * Features: issue feed, map view, department view, clustering,
 *           status tracking (localStorage), search, export CSV.
 */

// ── Constants ─────────────────────────────────────────────────

const DATA_PATHS = ["../data/issues.json", "../data/sample_issues.json"];

const CATEGORY_COLORS = {
  Roads:       "#2563a8",
  Water:       "#0891b2",
  Electricity: "#d97706",
  Waste:       "#65a30d",
  Flooding:    "#7c3aed",
  Parks:       "#16a34a",
  Traffic:     "#dc2626",
  Other:       "#94a3b8",
};

// Approximate lat/long centres for Bangalore areas
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
  BBMP:   { icon: "🏗",  color: "#2563a8", desc: "Roads · Waste · Parks · Flooding", categories: ["Roads", "Waste", "Parks", "Flooding", "Other"] },
  BESCOM: { icon: "⚡",  color: "#d97706", desc: "Electricity · Street Lights",      categories: ["Electricity"] },
  BWSSB:  { icon: "💧",  color: "#0891b2", desc: "Water Supply · Drainage",          categories: ["Water"] },
  BTP:    { icon: "🚦",  color: "#dc2626", desc: "Traffic Signals · Road Safety",    categories: ["Traffic"] },
};

const STATUS_OPTIONS = [
  { value: "open",         label: "⚪ Open" },
  { value: "acknowledged", label: "🔵 Acknowledged" },
  { value: "in_progress",  label: "🟡 In Progress" },
  { value: "resolved",     label: "🟢 Resolved" },
];

const SEV_COLORS = { high: "#c0392b", medium: "#d97706", low: "#166534" };

// ── State ─────────────────────────────────────────────────────

let allIssues = [];
let activeFilters = { category: "all", severity: "all", area: "all", status: "all", search: "" };
let activeTab = "feed";
let clustered = false;
let chart = null;
let leafletMap = null;
let mapMarkers = [];
let mapInitialized = false;

// ── Bootstrap ─────────────────────────────────────────────────

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
  allIssues = await loadData();

  if (allIssues.length === 0) {
    document.getElementById("issue-grid").innerHTML =
      '<div class="no-results">No data found. Check the data folder or run the fetch script.</div>';
    return;
  }

  setLastUpdated();
  renderStats(allIssues);
  buildFilters(allIssues);
  renderChart(allIssues);
  renderIssues(getFiltered());

  // Tab switching
  document.querySelectorAll(".tab").forEach(btn =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
  );

  // Cluster toggle
  document.getElementById("cluster-toggle").addEventListener("change", e => {
    clustered = e.target.checked;
    renderIssues(getFiltered());
  });

  // Export
  document.getElementById("export-csv").addEventListener("click", exportCSV);

  // Status changes (event delegation on the grid)
  document.getElementById("issue-grid").addEventListener("change", e => {
    if (e.target.classList.contains("status-select")) {
      const id = e.target.dataset.issueId;
      const val = e.target.value;
      setStatus(id, val);
      const card = e.target.closest(".issue-card");
      if (card) card.dataset.status = val;
    }
  });
}

// ── Stats ─────────────────────────────────────────────────────

function renderStats(issues) {
  document.getElementById("stat-total").textContent = issues.length;
  document.getElementById("stat-high").textContent = issues.filter(i => i.severity === "high").length;
  document.getElementById("stat-top-cat").textContent = topKey(countBy(issues, "category")) || "—";
  document.getElementById("stat-top-area").textContent = topKey(countBy(issues, "area")) || "—";
}

// ── Filters ───────────────────────────────────────────────────

function buildFilters(issues) {
  const categories = [...new Set(issues.map(i => i.category))].sort();
  const catContainer = document.getElementById("category-filters");
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.filter = "category";
    btn.dataset.value = cat;
    btn.textContent = cat;
    catContainer.appendChild(btn);
  });

  const areas = [...new Set(issues.map(i => i.area))].sort();
  const sel = document.getElementById("area-filter");
  areas.forEach(area => {
    const opt = document.createElement("option");
    opt.value = area;
    opt.textContent = area;
    sel.appendChild(opt);
  });

  document.querySelectorAll(".chip").forEach(btn =>
    btn.addEventListener("click", () => onChipClick(btn))
  );
  sel.addEventListener("change", () => { activeFilters.area = sel.value; applyFilters(); });

  document.getElementById("search-input").addEventListener("input", e => {
    activeFilters.search = e.target.value.toLowerCase().trim();
    applyFilters();
  });

  document.getElementById("reset-filters").addEventListener("click", resetFilters);
}

function onChipClick(btn) {
  const type = btn.dataset.filter;
  document.querySelectorAll(`.chip[data-filter="${type}"]`).forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeFilters[type] = btn.dataset.value;
  applyFilters();
}

function resetFilters() {
  activeFilters = { category: "all", severity: "all", area: "all", status: "all", search: "" };
  document.querySelectorAll(".chip").forEach(b => {
    b.classList.toggle("active", b.dataset.value === "all");
  });
  document.getElementById("area-filter").value = "all";
  document.getElementById("search-input").value = "";
  applyFilters();
}

function getFiltered() {
  return allIssues.filter(i => {
    if (activeFilters.category !== "all" && i.category !== activeFilters.category) return false;
    if (activeFilters.severity !== "all" && i.severity !== activeFilters.severity) return false;
    if (activeFilters.area !== "all" && i.area !== activeFilters.area) return false;
    if (activeFilters.status !== "all" && getStatus(i.id) !== activeFilters.status) return false;
    if (activeFilters.search) {
      const hay = `${i.text} ${i.area} ${i.category} ${i.author}`.toLowerCase();
      if (!hay.includes(activeFilters.search)) return false;
    }
    return true;
  });
}

function applyFilters() {
  const filtered = getFiltered();
  renderChart(filtered);
  if (activeTab === "feed")        renderIssues(filtered);
  if (activeTab === "map")         renderMap(filtered);
  if (activeTab === "departments") renderDepartments(filtered);
}

// ── Tabs ──────────────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-content").forEach(s => s.classList.add("hidden"));
  document.getElementById(`tab-${tab}`).classList.remove("hidden");

  const filtered = getFiltered();
  if (tab === "map")         renderMap(filtered);
  if (tab === "departments") renderDepartments(filtered);
}

// ── Feed / Issue Cards ────────────────────────────────────────

function renderIssues(issues) {
  const displayed = clustered ? getClusteredIssues(issues) : issues;
  document.getElementById("showing-count").textContent =
    `${displayed.length} issue${displayed.length !== 1 ? "s" : ""}` +
    (clustered && displayed.length < issues.length ? ` (clustered from ${issues.length})` : "");

  const grid = document.getElementById("issue-grid");
  if (displayed.length === 0) {
    grid.innerHTML = '<div class="no-results">No issues match the selected filters.</div>';
    return;
  }
  grid.innerHTML = displayed.map(i => issueCard(i)).join("");
}

function getClusteredIssues(issues) {
  const groups = {};
  for (const issue of issues) {
    const key = `${issue.category}||${issue.area}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(issue);
  }
  const sevOrder = { high: 0, medium: 1, low: 2 };
  return Object.values(groups)
    .map(group => {
      const lead = [...group].sort((a, b) =>
        (b.likes + b.retweets) - (a.likes + a.retweets)
      )[0];
      return { ...lead, clusterCount: group.length };
    })
    .sort((a, b) =>
      sevOrder[a.severity] - sevOrder[b.severity] ||
      (b.likes + b.retweets) - (a.likes + a.retweets)
    );
}

function issueCard(issue) {
  const status = getStatus(issue.id);
  const sevLabel = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" }[issue.severity] || issue.severity;
  const statusOpts = STATUS_OPTIONS.map(o =>
    `<option value="${o.value}"${status === o.value ? " selected" : ""}>${o.label}</option>`
  ).join("");
  const clusterBadge = issue.clusterCount > 1
    ? `<span class="cluster-badge">${issue.clusterCount} reports</span>` : "";

  return `
  <div class="issue-card sev-${issue.severity}" data-id="${esc(issue.id)}" data-status="${esc(status)}">
    <div class="card-top">
      <div class="card-header">
        <span class="category-tag">${esc(issue.category)}</span>
        <div class="card-badges">
          ${clusterBadge}
          <span class="severity-badge">${sevLabel}</span>
        </div>
      </div>
      <p class="card-text">${esc(issue.text)}</p>
    </div>
    <div class="card-bottom">
      <div class="card-meta">
        <span class="card-area">📍 ${esc(issue.area)}</span>
        <span class="card-engagement">
          <span>❤️ ${issue.likes || 0}</span>
          <span>🔁 ${issue.retweets || 0}</span>
        </span>
        <span class="card-date">${formatDate(issue.date)}</span>
      </div>
      <div class="card-actions">
        <select class="status-select" data-issue-id="${esc(issue.id)}">${statusOpts}</select>
        <a class="tweet-link" href="${esc(issue.source_url || "#")}" target="_blank" rel="noopener noreferrer">
          View Tweet ↗
        </a>
      </div>
    </div>
  </div>`;
}

// ── Chart ─────────────────────────────────────────────────────

function renderChart(issues) {
  const counts = countBy(issues, "category");
  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const values = labels.map(l => counts[l]);
  const colors = labels.map(l => CATEGORY_COLORS[l] || CATEGORY_COLORS.Other);

  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
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
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw} issue${ctx.raw !== 1 ? "s" : ""}` } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: "#e2e8f0" } },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
}

// ── Map ───────────────────────────────────────────────────────

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
    // Jitter slightly so overlapping markers don't fully stack
    const jitter = () => (Math.random() - 0.5) * 0.008;
    const latLng = [coords[0] + jitter(), coords[1] + jitter()];

    const color = SEV_COLORS[issue.severity] || "#94a3b8";
    const marker = L.circleMarker(latLng, {
      radius: issue.severity === "high" ? 10 : issue.severity === "medium" ? 7 : 5,
      fillColor: color,
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    });

    const engagement = (issue.likes || 0) + (issue.retweets || 0);
    const sevLabel = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" }[issue.severity] || "";
    marker.bindPopup(`
      <div style="max-width:240px;font-family:system-ui,sans-serif;font-size:13px">
        <div style="font-weight:700;color:#1a3a5c;margin-bottom:4px">${esc(issue.category)} — ${esc(issue.area)}</div>
        <div style="color:#1e293b;line-height:1.45;margin-bottom:6px">${esc(issue.text)}</div>
        <div style="color:#94a3b8;font-size:11px">${sevLabel} · ❤️ ${issue.likes || 0} 🔁 ${issue.retweets || 0} · ${formatDate(issue.date)}</div>
        ${issue.source_url ? `<a href="${esc(issue.source_url)}" target="_blank" style="color:#2563a8;font-weight:600;font-size:12px">View Tweet ↗</a>` : ""}
      </div>
    `);

    marker.addTo(leafletMap);
    mapMarkers.push(marker);
  });
}

// ── Department View ───────────────────────────────────────────

function renderDepartments(issues) {
  const grid = document.getElementById("dept-grid");
  grid.innerHTML = Object.entries(DEPARTMENT_MAP).map(([name, info]) => {
    const deptIssues = issues.filter(i => info.categories.includes(i.category));
    return deptCard(name, info, deptIssues);
  }).join("");

  grid.querySelectorAll(".dept-filter-link").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.filterCat;
      switchTab("feed");
      const chip = document.querySelector(`.chip[data-filter="category"][data-value="${cat}"]`);
      if (chip) chip.click();
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
    ? `<div class="dept-no-issues">No issues in current filter</div>`
    : topIssues.map(i => `
        <div class="dept-issue-row">
          <span class="dept-issue-cat">${esc(i.category)}</span>
          <span class="dept-issue-text" title="${esc(i.text)}">${esc(i.text)}</span>
          <span class="dept-issue-sev" style="color:${SEV_COLORS[i.severity]}">${i.severity === "high" ? "🔴" : i.severity === "medium" ? "🟡" : "🟢"}</span>
        </div>`).join("");

  const filterCat = info.categories[0];

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
    <button class="dept-filter-link" data-filter-cat="${esc(filterCat)}">
      See all ${esc(name)} issues in feed →
    </button>
  </div>`;
}

// ── Status Tracking (localStorage) ───────────────────────────

function getStatus(id) {
  return localStorage.getItem(`gw_status_${id}`) || "open";
}

function setStatus(id, value) {
  localStorage.setItem(`gw_status_${id}`, value);
}

// ── Export CSV ────────────────────────────────────────────────

function exportCSV() {
  const issues = getFiltered();
  const headers = ["ID", "Date", "Category", "Area", "Severity", "Status", "Likes", "Retweets", "Author", "Tweet Text", "URL"];
  const rows = issues.map(i => [
    i.id,
    i.date || "",
    i.category,
    i.area,
    i.severity,
    getStatus(i.id),
    i.likes || 0,
    i.retweets || 0,
    i.author || "",
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

// ── Helpers ───────────────────────────────────────────────────

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function topKey(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (_) { return ""; }
}

function setLastUpdated() {
  const timestamps = allIssues.map(i => i.date ? new Date(i.date).getTime() : 0).filter(Boolean);
  if (!timestamps.length) return;
  const latest = new Date(Math.max(...timestamps));
  document.getElementById("last-updated").textContent =
    "Latest: " + latest.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Start ─────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
