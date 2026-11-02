// Civic Issue India — landing page (open access: no sign-up or login).
// Every figure, the map and the charts are computed in the browser from the
// same JSON files the dashboard uses, so the page stays true to the data.

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => Number(n).toLocaleString("en-IN");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DASHBOARD = "dashboard/";
const DEPT_OF = { Electricity: "BESCOM", Water: "BWSSB", Traffic: "BTP" }; // everything else → BBMP

async function getJSON(path) {
  try { const r = await fetch(path); return r.ok ? await r.json() : null; } catch (_) { return null; }
}
const cleanText = (t) => String(t || "").replace(/https?:\/\/\S+/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const longDate = (ms) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const shortDate = (ms) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// Grow bars once they are on screen (this answers the visitor scrolling to them)
function growWhenVisible(box, apply) {
  if (reducedMotion || !("IntersectionObserver" in window)) return apply();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { apply(); io.disconnect(); } }, { threshold: 0.25 });
  io.observe(box);
}

// Shared hover/focus tooltip for chart marks
function bindTip(items, tip, container, html, anchor) {
  const show = (el) => {
    const a = anchor(el).getBoundingClientRect(), c = container.getBoundingClientRect();
    tip.innerHTML = html(el);
    tip.style.left = `${Math.min(Math.max(a.left + a.width / 2 - c.left, 90), c.width - 90)}px`;
    tip.style.top = `${a.top - c.top}px`;
    tip.hidden = false;
  };
  items.forEach((el) => {
    el.addEventListener("mouseenter", () => show(el));
    el.addEventListener("focus", () => show(el));
    el.addEventListener("mouseleave", () => (tip.hidden = true));
    el.addEventListener("blur", () => (tip.hidden = true));
  });
}

(async function load() {
  const [issues, verdicts, geo] = await Promise.all([
    getJSON("data/issues.json"),
    getJSON("data/filter_verdicts.json"),
    getJSON("data/geo_cache.json"),
  ]);
  if (!Array.isArray(issues) || !issues.length) return;

  const times = issues.map((i) => Date.parse(i.date)).filter(Boolean);
  const latest = Math.max(...times), earliest = Math.min(...times);
  if (Date.now() - latest > 3 * 864e5) {
    $("#freshness").textContent = `Collection is paused. These figures cover complaints posted between ${longDate(earliest)} and ${longDate(latest)}.`;
  } else {
    $("#freshness").textContent = `Updated with complaints up to ${longDate(latest)}.`;
  }

  const read = verdicts ? Object.keys(verdicts).length : 0;
  const kept = issues.length;
  $("#plate-n").textContent = fmt(kept);
  $("#n-kept").textContent = fmt(kept);
  if (read) {
    $("#n-screened").textContent = fmt(read);
    $("#funnel-in").textContent = fmt(read);
    $("#funnel-out").textContent = fmt(kept);
    $("#funnel-kept").style.setProperty("--w", `${(kept / read) * 100}%`);
  }

  renderBars(issues);
  renderAreas(issues);
  renderTimeline(issues);
  renderDepts(issues);
  renderVoices(issues);
  if (geo) renderMap(issues, geo);
})();

// ── Complaints by type (single hue: magnitude, not identity) ─────
function renderBars(issues) {
  const counts = {};
  issues.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = rows[0][1], total = issues.length;
  const box = $("#cat-bars");
  const label = (c) => (c === "Electricity" ? "Power" : c === "Waste" ? "Garbage" : c);

  box.innerHTML = rows.map(([cat, n]) => `
    <div class="bar-row" role="listitem" tabindex="0" data-cat="${esc(label(cat))}" data-n="${n}"
         aria-label="${esc(label(cat))}: ${fmt(n)} complaints, ${Math.round((n / total) * 100)} percent">
      <span class="bar-name">${esc(label(cat))}</span>
      <span class="bar-track"><span class="bar-fill" data-w="${(n / max) * 100}"></span></span>
      <span class="bar-val">${fmt(n)}</span>
    </div>`).join("");
  growWhenVisible(box, () => box.querySelectorAll(".bar-fill").forEach((b) => (b.style.width = b.dataset.w + "%")));
  bindTip(box.querySelectorAll(".bar-row"), $("#chart-tip"), box.parentElement,
    (r) => `<strong>${esc(r.dataset.cat)}</strong>${fmt(r.dataset.n)} complaints, ${Math.round((r.dataset.n / total) * 100)}% of all`,
    (r) => r.querySelector(".bar-fill"));

  const [a, b] = rows;
  $("#reports-sub").textContent = `${label(a[0])} and ${label(b[0]).toLowerCase()} account for ${Math.round(((a[1] + b[1]) / total) * 100)}% of the ${fmt(total)} genuine complaints.`;
}

// ── Neighbourhoods ───────────────────────────────────────────────
function groupByArea(issues) {
  const by = {};
  issues.forEach((i) => {
    if (!i.area || i.area === "Bangalore" || i.area === "Bengaluru") return;
    (by[i.area] ||= []).push(i);
  });
  return by;
}
function topCategory(list) {
  const c = {};
  list.forEach((i) => (c[i.category] = (c[i.category] || 0) + 1));
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
  return top === "Electricity" ? "power" : top === "Waste" ? "garbage" : top.toLowerCase();
}
function renderAreas(issues) {
  const rows = Object.entries(groupByArea(issues)).sort((a, b) => b[1].length - a[1].length).slice(0, 7);
  $("#top-areas").innerHTML = rows.map(([area, list]) => `
    <li><span class="name">${esc(area)}<span class="top-cat">Mostly ${esc(topCategory(list))}</span></span>
      <span class="n">${fmt(list.length)}</span></li>`).join("");
}

// ── Neighbourhood map: one circle per area, area ∝ complaints ────
function renderMap(issues, geo) {
  const svg = $("#city-map"), tip = $("#map-tip"), stage = $("#map-stage");
  const groups = Object.entries(groupByArea(issues))
    .map(([area, list]) => ({ area, list, g: geo[area.toLowerCase()] }))
    .filter((d) => d.g && d.g.lat && d.g.lon);
  if (!groups.length) return;
  const placed = groups.reduce((s, d) => s + d.list.length, 0);
  $("#map-count").textContent = `${fmt(placed)} complaints across ${groups.length} neighbourhoods are shown.`;

  const S = 400, pad = 28;
  const lats = groups.map((d) => d.g.lat);
  const k = Math.cos((((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI) / 180);
  const xs = groups.map((d) => d.g.lon * k);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...lats), maxY = Math.max(...lats);
  const scale = (S - pad * 2) / Math.max(maxX - minX, maxY - minY);
  const offX = (S - (maxX - minX) * scale) / 2, offY = (S - (maxY - minY) * scale) / 2;
  const maxN = Math.max(...groups.map((d) => d.list.length));
  groups.forEach((d) => {
    d.x = offX + (d.g.lon * k - minX) * scale;
    d.y = offY + (maxY - d.g.lat) * scale;
    d.r = 3 + Math.sqrt(d.list.length / maxN) * 22;
    d.top = topCategory(d.list);
  });
  groups.sort((a, b) => b.r - a.r);

  const grid = [1, 2, 3].map((i) => {
    const p = (S / 4) * i;
    return `<line class="grid-line" x1="${p}" y1="0" x2="${p}" y2="${S}"/><line class="grid-line" x1="0" y1="${p}" x2="${S}" y2="${p}"/>`;
  }).join("");
  const labelled = [...groups].sort((a, b) => b.list.length - a.list.length).slice(0, 6);

  svg.setAttribute("viewBox", `0 0 ${S} ${S}`);
  svg.innerHTML = `
    <g>${grid}</g>
    <text class="compass" x="${S - 4}" y="12" text-anchor="end">North ↑</text>
    <g>${groups.map((d, i) => `
      <g data-i="${i}" tabindex="0" role="link" aria-label="${esc(d.area)}: ${d.list.length} complaints. Open in dashboard">
        <circle class="hit" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${Math.max(d.r, 9).toFixed(1)}"/>
        <circle class="bubble" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(1)}"/>
      </g>`).join("")}</g>
    <g>${labelled.map((d) => {
      const left = d.x > S * 0.62;
      const x = left ? d.x - d.r - 5 : d.x + d.r + 5;
      return `<text class="area-label" x="${x.toFixed(1)}" y="${(d.y + 4).toFixed(1)}" text-anchor="${left ? "end" : "start"}">${esc(d.area)}</text>`;
    }).join("")}</g>`;

  svg.querySelectorAll("g[data-i]").forEach((el) => {
    const d = groups[+el.dataset.i];
    const show = () => {
      const box = stage.getBoundingClientRect(), f = box.width / S;
      tip.innerHTML = `<strong>${esc(d.area)}</strong>${fmt(d.list.length)} complaint${d.list.length > 1 ? "s" : ""}, mostly ${esc(d.top)}`;
      tip.style.left = `${Math.min(Math.max(d.x * f, 90), box.width - 90)}px`;
      tip.style.top = `${(d.y - d.r) * f}px`;
      tip.hidden = false;
    };
    const open = () => location.assign(`${DASHBOARD}?q=${encodeURIComponent(d.area)}`);
    el.addEventListener("mouseenter", show);
    el.addEventListener("focus", show);
    el.addEventListener("mouseleave", () => (tip.hidden = true));
    el.addEventListener("blur", () => (tip.hidden = true));
    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
  });
}

// ── Complaints each week ─────────────────────────────────────────
function renderTimeline(issues) {
  const box = $("#timeline");
  const WEEK = 7 * 864e5;
  const times = issues.map((i) => Date.parse(i.date)).filter(Boolean);
  const startOf = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  const first = startOf(Math.min(...times)), last = startOf(Math.max(...times));
  const weeks = [];
  for (let w = first; w <= last; w += WEEK) weeks.push({ start: w, n: 0 });
  times.forEach((t) => { const k = Math.round((startOf(t) - first) / WEEK); if (weeks[k]) weeks[k].n++; });
  const max = Math.max(...weeks.map((w) => w.n));

  $("#timeline-range").textContent = `Weeks starting Monday, ${shortDate(first)} to ${shortDate(last)}`;
  box.innerHTML = weeks.map((w) => `
    <div class="tl-col" role="listitem" tabindex="0" data-n="${w.n}" data-start="${w.start}" aria-label="Week of ${shortDate(w.start)}: ${w.n} complaints">
      <span class="tl-bar" data-h="${max ? (w.n / max) * 100 : 0}"></span>
    </div>`).join("");
  const ticks = [weeks[0], weeks[Math.floor(weeks.length / 2)], weeks[weeks.length - 1]];
  $("#timeline-axis").innerHTML = ticks.map((w) => `<span>${shortDate(w.start)}</span>`).join("");
  growWhenVisible(box, () => box.querySelectorAll(".tl-bar").forEach((b) => (b.style.height = b.dataset.h + "%")));
  bindTip(box.querySelectorAll(".tl-col"), $("#timeline-tip"), box.parentElement,
    (c) => `<strong>Week of ${shortDate(+c.dataset.start)}</strong>${fmt(c.dataset.n)} complaints`,
    (c) => c.querySelector(".tl-bar"));
}

// ── Departments ──────────────────────────────────────────────────
function renderDepts(issues) {
  const INFO = {
    BBMP:   "City corporation: roads, garbage, parks, drains",
    BESCOM: "Electricity supply and street lights",
    BWSSB:  "Water supply and sewerage",
    BTP:    "Traffic police: signals and congestion",
  };
  const counts = { BBMP: 0, BESCOM: 0, BWSSB: 0, BTP: 0 };
  issues.forEach((i) => counts[DEPT_OF[i.category] || "BBMP"]++);
  const total = issues.length;
  $("#depts").innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([d, n]) => `
    <div class="dept">
      <div class="dept-name">${d}</div>
      <div class="dept-desc">${INFO[d]}</div>
      <div class="dept-n">${fmt(n)}</div>
      <div class="dept-share" role="img" aria-label="${Math.round((n / total) * 100)} percent of complaints"><i style="width:${(n / total) * 100}%"></i></div>
    </div>`).join("");
}

// ── Most-shared complaints, verbatim ─────────────────────────────
function renderVoices(issues) {
  const seen = new Set();
  const picks = issues
    .map((i) => ({ i, text: cleanText(i.text), score: (i.likes || 0) + 2 * (i.retweets || 0) }))
    .filter((p) => p.text.length > 60 && p.text.length < 400)
    // The AI filter occasionally keeps a thank-you post; this wall is for complaints only
    .filter((p) => !/\b(congrat|thank|well done|good job|great work|kudos)/i.test(p.text))
    .sort((a, b) => b.score - a.score)
    .filter((p) => { const k = p.i.category + "|" + p.i.area; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 6);
  const label = (c) => (c === "Electricity" ? "Power" : c === "Waste" ? "Garbage" : c);
  $("#voice-wall").innerHTML = picks.map(({ i, text }) => `
    <blockquote class="voice" cite="${esc(i.source_url || "")}">
      <p class="voice-text">“${esc(text)}”</p>
      <footer class="voice-meta">
        <span class="cat">${esc(label(i.category))}</span>
        <span>${esc(i.area || "Bengaluru")}</span>
        <span>${longDate(Date.parse(i.date))}</span>
        ${i.source_url ? `<a href="${esc(i.source_url)}" target="_blank" rel="noopener">View the post on X</a>` : ""}
      </footer>
    </blockquote>`).join("");
}
