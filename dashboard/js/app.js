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

// TAT = turnaround time in hours; email = publicly listed official contact
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

// ── State ─────────────────────────────────────────────────────

let allIssues = [];
let activeFilters = { category: "all", severity: "all", area: "all", status: "all", search: "", datePreset: "all", dateFrom: "", dateTo: "", role: "" };
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
  // Detect role from URL param: ?role=bbmp / bescom / bwssb / btp
  const urlRole = new URLSearchParams(window.location.search).get("role") || "";
  if (urlRole && ROLE_DEPARTMENTS[urlRole]) {
    activeFilters.role = urlRole;
    renderRoleBanner(urlRole);
  }

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

  document.querySelectorAll(".chip[data-filter='date-preset']").forEach(btn =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chip[data-filter='date-preset']").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilters.datePreset = btn.dataset.value;
      activeFilters.dateFrom = "";
      activeFilters.dateTo = "";
      document.getElementById("date-from").value = "";
      document.getElementById("date-to").value = "";
      applyFilters();
    })
  );

  document.getElementById("date-from").addEventListener("change", e => {
    activeFilters.dateFrom = e.target.value;
    activeFilters.datePreset = "custom";
    document.querySelectorAll(".chip[data-filter='date-preset']").forEach(b => b.classList.remove("active"));
    applyFilters();
  });

  document.getElementById("date-to").addEventListener("change", e => {
    activeFilters.dateTo = e.target.value;
    activeFilters.datePreset = "custom";
    document.querySelectorAll(".chip[data-filter='date-preset']").forEach(b => b.classList.remove("active"));
    applyFilters();
  });
}

function onChipClick(btn) {
  const type = btn.dataset.filter;
  document.querySelectorAll(`.chip[data-filter="${type}"]`).forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeFilters[type] = btn.dataset.value;
  applyFilters();
}

function resetFilters() {
  activeFilters = { category: "all", severity: "all", area: "all", status: "all", search: "", datePreset: "all", dateFrom: "", dateTo: "" };
  document.querySelectorAll(".chip").forEach(b => {
    b.classList.toggle("active", b.dataset.value === "all");
  });
  document.getElementById("area-filter").value = "all";
  document.getElementById("search-input").value = "";
  document.getElementById("date-from").value = "";
  document.getElementById("date-to").value = "";
  applyFilters();
}

function getDateBounds() {
  const now = new Date();
  const preset = activeFilters.datePreset;
  if (preset === "7") {
    const from = new Date(now); from.setDate(from.getDate() - 7); from.setHours(0,0,0,0);
    return { from, to: null };
  }
  if (preset === "30") {
    const from = new Date(now); from.setDate(from.getDate() - 30); from.setHours(0,0,0,0);
    return { from, to: null };
  }
  if (preset === "this-month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: null };
  }
  if (preset === "custom") {
    const from = activeFilters.dateFrom ? new Date(activeFilters.dateFrom + "T00:00:00") : null;
    const to   = activeFilters.dateTo   ? new Date(activeFilters.dateTo   + "T23:59:59") : null;
    return { from, to };
  }
  return { from: null, to: null };
}

function getFiltered() {
  const { from, to } = getDateBounds();
  return allIssues.filter(i => {
    if (activeFilters.category !== "all" && i.category !== activeFilters.category) return false;
    if (activeFilters.severity !== "all" && i.severity !== activeFilters.severity) return false;
    if (activeFilters.area !== "all" && i.area !== activeFilters.area) return false;
    if (activeFilters.status !== "all" && getStatus(i.id) !== activeFilters.status) return false;
    if (activeFilters.search) {
      const hay = `${i.text} ${i.area} ${i.category} ${i.author}`.toLowerCase();
      if (!hay.includes(activeFilters.search)) return false;
    }
    if (from || to) {
      const d = new Date(i.date);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
    }
    if (activeFilters.role && ROLE_DEPARTMENTS[activeFilters.role]) {
      if (!ROLE_DEPARTMENTS[activeFilters.role].includes(i.category)) return false;
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

// ── Tabs ──────────────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-content").forEach(s => s.classList.add("hidden"));
  document.getElementById(`tab-${tab}`).classList.remove("hidden");

  if (tab === "coming-soon") { renderComingSoon(); return; }

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

function getIssueAge(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffH  = Math.floor(diffMs / 36e5);
  if (diffH < 1)  return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function getSLAStatus(issue) {
  const poc = POC_DIRECTORY[issue.category] || POC_DIRECTORY.Other;
  const elapsedH = (Date.now() - new Date(issue.date).getTime()) / 36e5;
  const pct = elapsedH / poc.tat;
  if (pct >= 1)    return { cls: "sla-overdue",  label: `Overdue by ${Math.round(elapsedH - poc.tat)}h` };
  if (pct >= 0.75) return { cls: "sla-warning",  label: `${Math.round(poc.tat - elapsedH)}h left` };
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
  return `mailto:${poc.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function issueCard(issue) {
  const status = getStatus(issue.id);
  const sevLabel = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" }[issue.severity] || issue.severity;
  const statusOpts = STATUS_OPTIONS.map(o =>
    `<option value="${o.value}"${status === o.value ? " selected" : ""}>${o.label}</option>`
  ).join("");
  const clusterBadge = issue.clusterCount > 1
    ? `<span class="cluster-badge">${issue.clusterCount} reports</span>` : "";
  const sla = getSLAStatus(issue);
  const poc = POC_DIRECTORY[issue.category] || POC_DIRECTORY.Other;

  return `
  <div class="issue-card sev-${issue.severity}" data-id="${esc(issue.id)}" data-status="${esc(status)}">
    <div class="card-top">
      <div class="card-header">
        <span class="category-tag">${esc(issue.category)}</span>
        <div class="card-badges">
          ${clusterBadge}
          <span class="severity-badge">${sevLabel}</span>
          <span class="sla-badge ${sla.cls}">${sla.label}</span>
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
        <span class="card-date" title="${formatDate(issue.date)}">${getIssueAge(issue.date)}</span>
      </div>
      <div class="card-actions">
        <select class="status-select" data-issue-id="${esc(issue.id)}">${statusOpts}</select>
        <a class="email-btn" href="${buildEmailLink(issue)}" title="Send to ${poc.dept} (${poc.email})">
          📧 Assign
        </a>
        <a class="tweet-link" href="${esc(issue.source_url || "#")}" target="_blank" rel="noopener noreferrer">
          Tweet ↗
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

// ── Coming Soon ───────────────────────────────────────────────

function renderComingSoon() {
  const UPCOMING = [
    {
      icon: "📡",
      title: "Multi-Channel Monitoring",
      desc: "Pull civic complaints from Reddit r/bangalore, Facebook community groups, and other platforms — not just Twitter.",
      eta: "Phase 7",
    },
    {
      icon: "🤖",
      title: "Twitter Clarification Bot",
      desc: "When a complaint lacks enough detail, the bot replies on the same thread asking for area, ward, or photo. Fully automated.",
      eta: "Phase 5",
    },
    {
      icon: "🔄",
      title: "Twitter Close-Loop",
      desc: "When an official marks an issue Resolved, an automated reply is posted on the original tweet thread so the citizen knows it's done.",
      eta: "Phase 5",
    },
    {
      icon: "💬",
      title: "WhatsApp Alerts",
      desc: "Daily digest of top issues sent directly to officials via WhatsApp Business API — high open rates, no app needed.",
      eta: "Phase 5",
    },
    {
      icon: "🗂",
      title: "PDF Reports for Meetings",
      desc: "One-click PDF export formatted for council meetings and presentations — issues, maps, severity breakdown, all on one page.",
      eta: "Phase 5",
    },
    {
      icon: "🌐",
      title: "Citizen-Facing Portal",
      desc: "A public view where citizens can see if their reported issue was acknowledged and track its progress in real time.",
      eta: "Phase 6",
    },
    {
      icon: "📊",
      title: "Resolution Analytics",
      desc: "Track how long issues spend in each status, SLA compliance rates by department, and which areas are getting the fastest response.",
      eta: "Phase 4",
    },
    {
      icon: "🏙",
      title: "Expand to Other Cities",
      desc: "Configurable keywords and area maps for any Indian city — Mumbai, Delhi, Chennai, Hyderabad. Same pipeline, new config.",
      eta: "Phase 7",
    },
  ];

  const grid = document.getElementById("coming-soon-grid");
  if (!grid) return;
  grid.innerHTML = UPCOMING.map(f => `
    <div class="cs-card">
      <div class="cs-icon">${f.icon}</div>
      <div class="cs-body">
        <div class="cs-title">${f.title}</div>
        <div class="cs-desc">${f.desc}</div>
      </div>
      <span class="cs-eta">${f.eta}</span>
    </div>
  `).join("");
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
