// Civic Issue India — landing page (open access: no sign-up or login)
// Live figures, neighbourhood map, complaint ticker and category chart,
//    all computed in the browser from the same JSON files the dashboard uses.

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => n.toLocaleString("en-IN");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DASHBOARD = "dashboard/";

// ── Nav: hairline once scrolled ──────────────────────────────────
const nav = $("#nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ── Data ─────────────────────────────────────────────────────────
async function getJSON(path) {
  try { const r = await fetch(path); return r.ok ? await r.json() : null; } catch (_) { return null; }
}

const cleanText = (t) => String(t || "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
const dateFmt = (ms) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

(async function loadFigures() {
  const [issues, verdicts, geo] = await Promise.all([
    getJSON("data/issues.json"),
    getJSON("data/filter_verdicts.json"),
    getJSON("data/geo_cache.json"),
  ]);
  if (!Array.isArray(issues) || !issues.length) return;

  // Freshness: be honest about whether collection is running
  const times = issues.map((i) => Date.parse(i.date)).filter(Boolean);
  const latest = Math.max(...times), earliest = Math.min(...times);
  const stale = Date.now() - latest > 3 * 864e5;
  if (stale) {
    $("#feed-state").textContent = `Bangalore · archive to ${dateFmt(latest)}`;
    $("#freshness").textContent = `Live collection is paused. Figures cover complaints from ${dateFmt(earliest)} to ${dateFmt(latest)}.`;
  } else {
    $("#feed-dot").classList.add("on");
    $("#feed-state").textContent = `Bangalore · live, updated ${dateFmt(latest)}`;
  }

  // Hero figures
  const screened = verdicts ? Object.keys(verdicts).length : 0;
  const kept = issues.length;
  const statEls = document.querySelectorAll("#hero-stats dd");
  if (screened) statEls[0].dataset.count = screened;
  statEls[1].dataset.count = kept;
  countUp(statEls);
  if (screened) {
    $("#funnel-in").textContent = fmt(screened);
    $("#funnel-out").textContent = fmt(kept);
    $("#funnel-kept").style.setProperty("--w", `${(kept / screened) * 100}%`);
  }

  renderBars(issues);
  renderAreas(issues);
  if (geo) renderMap(issues, geo);
})();

function countUp(els) {
  els.forEach((el) => {
    const target = +el.dataset.count;
    if (reducedMotion || !target) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1100;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// ── Category bars (single hue: this is magnitude, not identity) ──
function renderBars(issues) {
  const counts = {};
  issues.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = rows[0][1], total = issues.length;
  const box = $("#cat-bars"), tip = $("#chart-tip"), card = box.parentElement;

  box.innerHTML = rows.map(([cat, n]) => `
    <div class="bar-row" role="listitem" tabindex="0" data-cat="${esc(cat)}" data-n="${n}"
         aria-label="${esc(cat)}: ${fmt(n)} complaints, ${((n / total) * 100).toFixed(1)} percent">
      <span class="bar-name">${esc(cat)}</span>
      <span class="bar-track"><span class="bar-fill" data-w="${(n / max) * 100}"></span></span>
      <span class="bar-val">${fmt(n)}</span>
    </div>`).join("");

  // Grow bars when the chart scrolls into view
  const grow = () => box.querySelectorAll(".bar-fill").forEach((b) => (b.style.width = b.dataset.w + "%"));
  if ("IntersectionObserver" in window && !reducedMotion) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { grow(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(box);
  } else grow();

  const show = (row) => {
    const n = +row.dataset.n;
    const fill = row.querySelector(".bar-fill").getBoundingClientRect();
    const c = card.getBoundingClientRect();
    tip.innerHTML = `<strong>${esc(row.dataset.cat)}</strong>${fmt(n)} complaints · ${((n / total) * 100).toFixed(1)}% of all`;
    tip.style.left = `${Math.min(Math.max(fill.right - c.left, 90), c.width - 90)}px`;
    tip.style.top = `${fill.top - c.top}px`;
    tip.hidden = false;
  };
  box.querySelectorAll(".bar-row").forEach((row) => {
    row.addEventListener("mouseenter", () => show(row));
    row.addEventListener("focus", () => show(row));
    row.addEventListener("mouseleave", () => (tip.hidden = true));
    row.addEventListener("blur", () => (tip.hidden = true));
  });

  const [topA, topB] = rows;
  $("#signal-sub").textContent = `${topA[0]} and ${topB[0]} make up ${Math.round(((topA[1] + topB[1]) / total) * 100)}% of ${fmt(total)} verified complaints. Hover a bar for its share.`;
  const head = document.querySelector("#signal h2");
  if (head) head.textContent = `${topA[0] === "Electricity" ? "Power" : topA[0]} and ${topB[0] === "Waste" ? "garbage" : topB[0].toLowerCase()} dominate the city's complaints.`;
}

// ── Top neighbourhoods ───────────────────────────────────────────
function groupByArea(issues) {
  const by = {};
  issues.forEach((i) => {
    const a = i.area;
    if (!a || a === "Bangalore" || a === "Bengaluru") return;
    (by[a] ||= []).push(i);
  });
  return by;
}
function topCategory(list) {
  const c = {};
  list.forEach((i) => (c[i.category] = (c[i.category] || 0) + 1));
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}
function renderAreas(issues) {
  const rows = Object.entries(groupByArea(issues)).sort((a, b) => b[1].length - a[1].length).slice(0, 7);
  $("#top-areas").innerHTML = rows.map(([area, list], i) => `
    <li><span class="rank">${String(i + 1).padStart(2, "0")}</span>
      <span>${esc(area)}<span class="top-cat">Mostly ${esc(topCategory(list).toLowerCase())}</span></span>
      <span class="n">${fmt(list.length)}</span></li>`).join("");
}

// ── Neighbourhood bubble map ─────────────────────────────────────
function renderMap(issues, geo) {
  const svg = $("#city-map"), tip = $("#map-tip"), stage = $("#map-stage");
  const groups = Object.entries(groupByArea(issues))
    .map(([area, list]) => ({ area, list, g: geo[area.toLowerCase()] }))
    .filter((d) => d.g && d.g.lat && d.g.lon);
  if (!groups.length) return;

  const placed = groups.reduce((s, d) => s + d.list.length, 0);
  $("#map-count").textContent = `${fmt(placed)} complaints · ${groups.length} areas`;

  // Equirectangular projection, corrected for latitude
  const S = 400, pad = 28;
  const lats = groups.map((d) => d.g.lat), lons = groups.map((d) => d.g.lon);
  const k = Math.cos((((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI) / 180);
  const xs = lons.map((l) => l * k), minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...lats), maxY = Math.max(...lats);
  const scale = (S - pad * 2) / Math.max(maxX - minX, maxY - minY);
  const offX = (S - (maxX - minX) * scale) / 2, offY = (S - (maxY - minY) * scale) / 2;
  const project = (lat, lon) => [offX + (lon * k - minX) * scale, offY + (maxY - lat) * scale];

  const maxN = Math.max(...groups.map((d) => d.list.length));
  const radius = (n) => 3 + Math.sqrt(n / maxN) * 22; // area ∝ count
  groups.forEach((d) => { [d.x, d.y] = project(d.g.lat, d.g.lon); d.r = radius(d.list.length); d.top = topCategory(d.list); });
  groups.sort((a, b) => b.r - a.r); // big first so small ones stay clickable on top

  const grid = [];
  for (let i = 1; i < 4; i++) {
    const p = (S / 4) * i;
    grid.push(`<line class="grid-line" x1="${p}" y1="0" x2="${p}" y2="${S}"/><line class="grid-line" x1="0" y1="${p}" x2="${S}" y2="${p}"/>`);
  }
  const labelled = [...groups].sort((a, b) => b.list.length - a.list.length).slice(0, 6);

  svg.setAttribute("viewBox", `0 0 ${S} ${S}`);
  svg.innerHTML = `
    <g opacity=".7">${grid.join("")}</g>
    <text class="compass" x="${S - 6}" y="14" text-anchor="end">N ↑</text>
    <g>${groups.map((d, i) => `
      <g data-i="${i}" tabindex="0" role="button" aria-label="${esc(d.area)}: ${d.list.length} complaints">
        <circle class="hit" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${Math.max(d.r, 9).toFixed(1)}"/>
        <circle class="bubble" style="--i:${i}" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(1)}"/>
      </g>`).join("")}</g>
    <g>${labelled.map((d) => {
      const left = d.x > S * 0.62; // flip labels on the right half so they never clip
      const x = left ? d.x - d.r - 5 : d.x + d.r + 5;
      return `<text class="area-label" x="${x.toFixed(1)}" y="${(d.y + 4).toFixed(1)}" text-anchor="${left ? "end" : "start"}">${esc(d.area)}</text>`;
    }).join("")}</g>`;

  const showTip = (d) => {
    const box = stage.getBoundingClientRect();
    const f = box.width / S;
    tip.innerHTML = `<strong>${esc(d.area)}</strong>${fmt(d.list.length)} complaint${d.list.length > 1 ? "s" : ""} · mostly ${esc(d.top.toLowerCase())}`;
    tip.style.left = `${Math.min(Math.max(d.x * f, 80), box.width - 80)}px`;
    tip.style.top = `${(d.y - d.r) * f}px`;
    tip.hidden = false;
  };
  svg.querySelectorAll("g[data-i]").forEach((el) => {
    const d = groups[+el.dataset.i];
    el.addEventListener("mouseenter", () => showTip(d));
    el.addEventListener("focus", () => showTip(d));
    el.addEventListener("mouseleave", () => (tip.hidden = true));
    el.addEventListener("blur", () => (tip.hidden = true));
    el.addEventListener("click", () => location.assign(`${DASHBOARD}?q=${encodeURIComponent(d.area)}`));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") el.dispatchEvent(new Event("click")); });
  });

  startTicker(groups, svg);
}

// ── Ticker: real complaints, linked to their bubble ──────────────
function startTicker(groups, svg) {
  const pool = [];
  groups.forEach((d, gi) => d.list.forEach((issue) => {
    const text = cleanText(issue.text);
    if (text.length > 50) pool.push({ issue, gi, text, score: (issue.likes || 0) + 2 * (issue.retweets || 0) });
  }));
  pool.sort((a, b) => b.score - a.score);
  const picks = pool.slice(0, 24);
  if (!picks.length) return;

  const card = $("#ticker-card"), ticker = $("#ticker");
  const bubbles = svg.querySelectorAll(".bubble");
  let idx = 0, paused = false;

  const show = (p) => {
    bubbles.forEach((b) => b.classList.remove("active"));
    const el = svg.querySelector(`g[data-i="${p.gi}"] .bubble`);
    if (el) { el.classList.add("active"); el.parentNode.parentNode.appendChild(el.parentNode); }
    const when = new Date(p.issue.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    card.innerHTML = `
      <div class="ticker-meta"><span class="chip">${esc(p.issue.category)}</span><span>${esc(p.issue.area)}</span><span aria-hidden="true">·</span><span>${when}</span></div>
      <p class="ticker-text">${esc(p.text)}</p>`;
  };
  const next = () => {
    if (paused || document.hidden) return;
    idx = (idx + 1) % picks.length;
    if (reducedMotion) return show(picks[idx]);
    card.classList.add("swap");
    setTimeout(() => { show(picks[idx]); card.classList.remove("swap"); }, 320);
  };
  show(picks[0]);
  ticker.addEventListener("mouseenter", () => (paused = true));
  ticker.addEventListener("mouseleave", () => (paused = false));
  setInterval(next, 5200);
}
