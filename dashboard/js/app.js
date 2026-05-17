/**
 * GovWatch Dashboard — app.js
 * Loads issue data, renders cards, handles filters, draws chart.
 */

const DATA_PATHS = [
  "../data/issues.json",
  "../data/sample_issues.json",
];

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

let allIssues = [];
let activeFilters = { category: "all", severity: "all", area: "all" };
let chart = null;

// ── Bootstrap ──────────────────────────────────────────────────

async function loadData() {
  for (const path of DATA_PATHS) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const isLive = path.includes("issues.json") && !path.includes("sample");
      document.getElementById("data-source-badge").textContent = isLive ? "Live Data" : "Sample Data";
      if (isLive) document.getElementById("data-source-badge").classList.add("live");

      return data;
    } catch (_) {
      continue;
    }
  }
  return [];
}

async function init() {
  allIssues = await loadData();

  if (allIssues.length === 0) {
    document.getElementById("issue-grid").innerHTML =
      '<div class="no-results">No data found. Run the fetch script or check your data folder.</div>';
    return;
  }

  setLastUpdated();
  renderStats(allIssues);
  buildFilters(allIssues);
  renderChart(allIssues);
  renderIssues(allIssues);
}

// ── Stats Row ──────────────────────────────────────────────────

function renderStats(issues) {
  document.getElementById("stat-total").textContent = issues.length;

  const high = issues.filter(i => i.severity === "high").length;
  document.getElementById("stat-high").textContent = high;

  const catCounts = countBy(issues, "category");
  const topCat = topKey(catCounts);
  document.getElementById("stat-top-cat").textContent = topCat || "—";

  const areaCounts = countBy(issues, "area");
  const topArea = topKey(areaCounts);
  document.getElementById("stat-top-area").textContent = topArea || "—";
}

// ── Filter Building ────────────────────────────────────────────

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
  const areaSelect = document.getElementById("area-filter");
  areas.forEach(area => {
    const opt = document.createElement("option");
    opt.value = area;
    opt.textContent = area;
    areaSelect.appendChild(opt);
  });

  document.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => onChipClick(btn));
  });

  areaSelect.addEventListener("change", () => {
    activeFilters.area = areaSelect.value;
    applyFilters();
  });

  document.getElementById("reset-filters").addEventListener("click", resetFilters);
}

function onChipClick(btn) {
  const filterType = btn.dataset.filter;
  const value = btn.dataset.value;

  document.querySelectorAll(`.chip[data-filter="${filterType}"]`).forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  activeFilters[filterType] = value;
  applyFilters();
}

function resetFilters() {
  activeFilters = { category: "all", severity: "all", area: "all" };

  document.querySelectorAll(".chip[data-filter='category']").forEach((b, i) => {
    b.classList.toggle("active", i === 0);
  });
  document.querySelectorAll(".chip[data-filter='severity']").forEach((b, i) => {
    b.classList.toggle("active", i === 0);
  });
  document.getElementById("area-filter").value = "all";

  applyFilters();
}

function applyFilters() {
  let filtered = allIssues;

  if (activeFilters.category !== "all") {
    filtered = filtered.filter(i => i.category === activeFilters.category);
  }
  if (activeFilters.severity !== "all") {
    filtered = filtered.filter(i => i.severity === activeFilters.severity);
  }
  if (activeFilters.area !== "all") {
    filtered = filtered.filter(i => i.area === activeFilters.area);
  }

  renderIssues(filtered);
  renderChart(filtered);
}

// ── Chart ──────────────────────────────────────────────────────

function renderChart(issues) {
  const catCounts = countBy(issues, "category");
  const labels = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);
  const values = labels.map(l => catCounts[l]);
  const colors = labels.map(l => CATEGORY_COLORS[l] || CATEGORY_COLORS.Other);

  const ctx = document.getElementById("categoryChart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Issues",
        data: values,
        backgroundColor: colors,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw} issue${ctx.raw !== 1 ? "s" : ""}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 11 } },
          grid: { color: "#e2e8f0" },
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

// ── Issue Cards ────────────────────────────────────────────────

function renderIssues(issues) {
  const grid = document.getElementById("issue-grid");
  document.getElementById("showing-count").textContent =
    `${issues.length} issue${issues.length !== 1 ? "s" : ""}`;

  if (issues.length === 0) {
    grid.innerHTML = '<div class="no-results">No issues match the selected filters.</div>';
    return;
  }

  grid.innerHTML = issues.map(issueCard).join("");
}

function issueCard(issue) {
  const sevLabel = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" }[issue.severity] || issue.severity;
  const dateStr = issue.date ? formatDate(issue.date) : "";
  const engagement = (issue.likes || 0) + (issue.retweets || 0);
  const url = issue.source_url || "#";

  return `
  <a class="issue-card sev-${issue.severity}" href="${url}" target="_blank" rel="noopener noreferrer">
    <div class="card-header">
      <span class="category-tag">${esc(issue.category)}</span>
      <span class="severity-badge">${sevLabel}</span>
    </div>
    <p class="card-text">${esc(issue.text)}</p>
    <div class="card-footer">
      <span class="card-area">📍 ${esc(issue.area)}</span>
      <span class="card-engagement">
        <span>❤️ ${issue.likes || 0}</span>
        <span>🔁 ${issue.retweets || 0}</span>
      </span>
      <span class="card-date">${dateStr}</span>
    </div>
  </a>`;
}

// ── Helpers ────────────────────────────────────────────────────

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
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (_) {
    return "";
  }
}

function setLastUpdated() {
  const timestamps = allIssues
    .map(i => i.date ? new Date(i.date).getTime() : 0)
    .filter(Boolean);

  if (timestamps.length === 0) return;

  const latest = new Date(Math.max(...timestamps));
  document.getElementById("last-updated").textContent =
    "Latest: " + latest.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Start ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
