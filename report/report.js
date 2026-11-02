// Report a problem — the resident's flow.
// 1 What's wrong → 2 Where → 3 Who's responsible → 4 Complain officially → 5 If it isn't fixed
// Everything comes from static JSON in data/officials/. Nothing is sent anywhere by this page:
// official systems need the resident's own phone number, so we hand over text, links and numbers.

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const D = "../data/";

// Problem types a resident recognises, mapped to the routing data and official channels
const TYPES = {
  garbage:  { label: "Garbage",                  hint: "Not collected, black spots, dumping",       cat: "Waste",       routing: "Garbage not collected",          channels: ["gba_sahaaya"] },
  road:     { label: "Road or footpath",         hint: "Potholes, broken footpaths",                 cat: "Roads",       routing: "Pothole",                        channels: ["gba_sahaaya"] },
  flooding: { label: "Flooding or drain",        hint: "Waterlogging, blocked storm drains",         cat: "Flooding",    routing: "Storm-water drain",              channels: ["gba_sahaaya", "emergency"] },
  power:    { label: "Power",                    hint: "Outages, transformer, dangling wires",       cat: "Electricity", routing: "Power cut",                      channels: ["bescom_helpline", "emergency"] },
  water:    { label: "Water or sewage",          hint: "No supply, sewage overflow, open manhole",   cat: "Water",       routing: "Water supply",                   channels: ["bwssb_helpline", "emergency"] },
  traffic:  { label: "Traffic",                  hint: "Signals, congestion, illegal parking",       cat: "Traffic",     routing: "Traffic congestion",             channels: ["traffic_station"] },
  health:   { label: "Mosquitoes or sanitation", hint: "Stagnant water, public toilets, nuisance",   cat: "Other",       routing: "Public health",                  channels: ["gba_sahaaya"] },
};
const CAT_TO_TYPE = { Waste: "garbage", Roads: "road", Flooding: "flooding", Electricity: "power", Water: "water", Traffic: "traffic", Parks: "garbage", Other: "health" };

const state = { type: null, ward: null };
const data = {};

// ── Small helpers ────────────────────────────────────────────────
// Phone numbers in the ward data come in mixed formats ("9741546667 9449874259", "080-25256464",
// "94485 73007", "+91-011-23016074", "25279101"). Match each format separately so numbers never merge.
const PHONE_RE = /(?<![\d])(?:\+91[-\s]?)?(?:0\d{2,4}[-\s]?\d{6,8}|[6-9]\d{4}\s?\d{5}|\d{8})(?![\d])/g;
const phonesIn = (s) => [...new Set((String(s || "").match(PHONE_RE) || []).map((p) => {
  const t = p.replace(/\s/g, "");
  return /^\d{8}$/.test(t) ? "080-" + t : t;   // bare 8-digit numbers are Bengaluru landlines
}))];
const emailsIn = (s) => String(s || "").match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
const shortCorp = (c) => String(c || "").replace("Bengaluru ", "").replace(" City Corporation", "");
const telHref = (p) => "tel:" + p.replace(/[^\d+]/g, "");

function person(role, name, phones = [], emails = [], extra = {}) {
  return { role, name: (name || "").trim(), phones: [].concat(phones).filter(Boolean), emails: [].concat(emails).filter(Boolean), ...extra };
}

// "AE Sri. Mohan 9449841578 JE Sri. Umesh 9449840467" → several people
const ROLE_NAMES = { AE: "Assistant Engineer", JE: "Junior Engineer", AEE: "Assistant Executive Engineer" };
function splitPeople(str, defaultRole) {
  if (!str) return [];
  const parts = /\b(AEE|AE|JE)\b/.test(str) ? str.split(/(?=\b(?:AEE|AE|JE)\b)/) : str.split(/(?=\b(?:Sri|Smt|Shri|Dr)\.)/);
  return parts.map((part) => {
    const tok = (part.match(/^\s*(AEE|AE|JE)\b/) || [])[1];
    const role = tok ? ROLE_NAMES[tok] : defaultRole;
    const name = part.replace(/^\s*(AEE|AE|JE)\b/, "").replace(/Assistant Executive Engineer/i, "").split(/[+\d@]/)[0].replace(/[;,/(\s]+$/, "").trim();
    return person(role, name, phonesIn(part), emailsIn(part));
  }).filter((p) => p.name || p.phones.length);
}

// ── Who is responsible, for a type in a ward ─────────────────────
function responsible(typeKey, w) {
  const commissioner = person(`Commissioner, ${w.city_corp}`, w.city_commissioner, phonesIn(w.city_commissioner_contact), emailsIn(w.city_commissioner_email));
  const engineerMissing = person("Ward engineer", "", [], [], { missing: "Not in our data yet. The Sahaaya app routes your complaint to the ward engineer." });
  let first = [], next = [];

  switch (typeKey) {
    case "garbage":
    case "health":
      if (typeKey === "garbage") {
        first.push(person(`Junior Health Inspector, solid waste (${w.swm_division || "division"})`, w.swm_jhi, phonesIn(w.swm_jhi_mobile)));
        next.push(person("Assistant Executive Engineer, solid waste", w.swm_aee, phonesIn(w.swm_aee_mobile), emailsIn(w.swm_aee_email)));
      } else {
        first.push(person("Health officer for the ward", "", [], [], { missing: "Not in our data yet. Use the Sahaaya app or contact the solid-waste inspector below." }));
        next.push(person(`Junior Health Inspector, solid waste`, w.swm_jhi, phonesIn(w.swm_jhi_mobile)));
      }
      next.push(commissioner);
      break;
    case "road":
    case "flooding":
      first.push(engineerMissing);
      next.push(commissioner);
      break;
    case "power":
      first.push(...splitPeople(w.bescom_ae_je, "BESCOM engineer").map((p) => ({ ...p, role: `${p.role}, BESCOM ${titleCase(w.bescom_unit || "")}`.trim() })));
      next.push(...splitPeople(w.bescom_aee, "Assistant Executive Engineer").map((p) => ({ ...p, role: `${p.role}, BESCOM sub-division ${w.bescom_subdivision || ""}`.trim() })));
      break;
    case "water":
      first.push(person(`BWSSB engineer, ${w.bwssb_station || "service"} station`, w.bwssb_ae, phonesIn(w.bwssb_ae_mobile)));
      next.push(person(`BWSSB Assistant Executive Engineer, ${w.bwssb_station || ""}`.trim(), w.bwssb_aee, phonesIn(w.bwssb_aee_mobile)));
      break;
    case "traffic":
      first.push(person(w.traffic_ps ? titleCase(w.traffic_ps) : "Traffic police station", w.traffic_pio, phonesIn(w.traffic_pio_contact)));
      break;
  }
  first = first.filter((p) => p.name || p.missing);
  next = next.filter((p) => p.name || p.missing);

  const elected = [];
  if (w.councillor) elected.push(person("Councillor on record", w.councillor, phonesIn(w.councillor_mobile)));
  if (w.mla) elected.push(person(`MLA, ${w.constituency}${w.mla_party ? ` (${w.mla_party})` : ""}`, w.mla, phonesIn(w.mla_phones), emailsIn(w.mla_email)));
  if (w.mp) elected.push(person("Member of Parliament", w.mp, phonesIn(w.mp_phones), emailsIn(w.mp_email)));
  return { first, next, elected };
}
function titleCase(s) { return String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bPs\b/, "police station"); }

// ── Rendering ────────────────────────────────────────────────────
function renderTypes() {
  $("#type-grid").innerHTML = Object.entries(TYPES).map(([k, t]) => `
    <button class="type-btn" type="button" role="radio" aria-checked="${state.type === k}" data-type="${k}">
      <strong>${esc(t.label)}</strong><span>${esc(t.hint)}</span>
    </button>`).join("");
  $("#type-grid").querySelectorAll(".type-btn").forEach((b) =>
    b.addEventListener("click", () => { state.type = b.dataset.type; renderTypes(); update(); if (!state.ward) $("#place-input").focus(); }));
  $("#step-type").classList.toggle("done", !!state.type);
}

function personCard(p, isFirst) {
  const contact = [
    ...p.phones.map((ph) => `<a href="${telHref(ph)}">Call ${esc(ph)}</a>`),
    ...p.emails.map((em) => `<a href="${esc(gmailLink([em], [], "", ""))}" target="_blank" rel="noopener">Email ${esc(em)}</a>`),
  ].join("");
  return `<div class="person${isFirst ? " first" : ""}">
    <span class="role">${esc(p.role)}</span>
    ${p.name ? `<span class="name">${esc(p.name)}</span>` : ""}
    ${p.missing ? `<span class="missing">${esc(p.missing)}</span>` : ""}
    ${contact ? `<span class="contact">${contact}</span>` : (p.name ? `<span class="missing">No phone or email on record</span>` : "")}
  </div>`;
}

function routingFor(typeKey) {
  return data.routing.find((r) => r.category.startsWith(TYPES[typeKey].routing)) || {};
}

function complaintText(t, w, r) {
  return [
    `Complaint: ${t.label} (${t.hint.toLowerCase()})`,
    `Location: [add street and landmark], ${w.ward_name}, Ward ${w.ward_no}, ${w.city_corp}`,
    `Details: [describe what is wrong and since when]`,
    `Department: ${r.primary_dept || ""}`,
    `Reported on: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
  ].join("\n");
}

function gmailLink(to, cc, subject, body) {
  const q = new URLSearchParams({ view: "cm", fs: "1", to: to.join(","), cc: cc.join(","), su: subject, body });
  return `https://mail.google.com/mail/?${q}`;
}

function update() {
  const ready = state.type && state.ward;
  ["#step-who", "#step-lodge", "#step-escalate"].forEach((s) => $(s).classList.toggle("locked", !ready));
  ["#who", "#lodge", "#escalate"].forEach((s) => ($(s).hidden = !ready));
  syncUrl();
  renderWardContext();
  if (!ready) return;

  const t = TYPES[state.type], w = state.ward, r = routingFor(state.type);
  const { first, next, elected } = responsible(state.type, w);

  // 3 — who
  $("#who").innerHTML = `
    <div class="who-group"><h3>Contact first</h3><div class="people">${first.map((p) => personCard(p, true)).join("") || personCard(person("Not in our data", "", [], [], { missing: "Use the official channel in the next step." }), true)}</div></div>
    ${next.length ? `<div class="who-group"><h3>If they don't respond</h3><div class="people">${next.map((p) => personCard(p)).join("")}</div></div>` : ""}
    <div class="who-group"><h3>Elected representatives</h3><div class="people">${elected.map((p) => personCard(p)).join("")}</div>
      <p class="note">City corporation councils are currently without elected members, so the councillor shown is the last one on record. Contacts come from public directories and can be out of date.</p></div>`;

  // 4 — lodge
  const text = complaintText(t, w, r);
  const box = $("#complaint-text");
  if (box.dataset.key !== state.type + w.key) { box.value = text; box.dataset.key = state.type + w.key; }
  const emails = [...first, ...next].flatMap((p) => p.emails);
  const subject = `${t.label} complaint: ${w.ward_name}, Ward ${w.ward_no}`;
  const cards = t.channels.map((k) => channelCard(k, data.channels[k], emails, subject)).join("");
  const emailCard = emails.length ? `
    <div class="channel"><h3>Email the officials</h3>
      <p>Opens Gmail with your complaint, addressed to ${esc(emails[0])}${emails.length > 1 ? ` with ${emails.length - 1} more copied in` : ""}.</p>
      <div class="btns"><a class="btn" data-email href="#" target="_blank" rel="noopener">Write the email</a></div></div>` : "";
  const xCard = `
    <div class="channel"><h3>Post it publicly on X</h3>
      <p>Public posts are what this site collects. Use this as well as an official channel, not instead of one.</p>
      <div class="btns"><a class="btn" data-x href="#" target="_blank" rel="noopener">Write the post</a></div></div>`;
  $("#channels").innerHTML = cards + emailCard + xCard;
  wireDynamicLinks(emails, subject);

  // 5 — escalate
  const ladder = [
    next.some((p) => p.name) && { when: "No response by then", what: `Contact ${next.filter((p) => p.name).map((p) => `${p.name} (${p.role})`).join(", then ")}. Quote your complaint number.` },
    r.escalation_1 && { when: next.some((p) => p.name) ? "Still no response" : "No response by then", what: `Escalate to the ${r.escalation_1}.` },
    r.escalation_2 && { when: "Still not fixed", what: `Escalate to the ${r.escalation_2}.` },
    { when: "Repeated failure", what: `Write to your elected representatives: ${elected.map((p) => p.name).join(", ") || "your MLA and MP"}. Include your complaint number and the dates you followed up.` },
  ].filter(Boolean);
  $("#escalate").innerHTML = `
    <p>Expected response time for ${esc(t.label.toLowerCase())} complaints: <span class="deadline">${esc(r.sla || "a few days")}</span></p>
    <ol class="ladder">${ladder.map((s) => `<li><span class="when">${esc(s.when)}.</span> <span class="what">${esc(s.what)}</span></li>`).join("")}</ol>
    ${r.notes ? `<p class="note">${esc(r.notes)}</p>` : ""}`;
}

function channelCard(key, c, emails, subject) {
  if (!c) return "";
  const btns = [];
  if (c.phone) btns.push(`<a class="btn btn-primary" href="${telHref(c.phone)}">Call ${esc(c.phone)}</a>`);
  if (c.whatsapp) btns.push(`<a class="btn" data-wa="${esc(c.whatsapp)}" href="#" target="_blank" rel="noopener">Send on WhatsApp</a>`);
  if (c.url) btns.push(`<a class="btn btn-primary" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url_label || "Open")}</a>`);
  if (c.web) btns.push(`<a class="btn" href="${esc(c.web)}" target="_blank" rel="noopener">${esc(c.web_label || "Website")}</a>`);
  return `<div class="channel${key === "emergency" ? " urgent" : ""}">
    <h3>${esc(c.name)}</h3>
    <p>${esc(c.how)}</p>
    ${btns.length ? `<div class="btns">${btns.join("")}</div>` : ""}
    ${c.confidence !== "high" ? `<span class="check">Last checked ${esc(data.channelsChecked)}. Confirm on the official website.</span>` : ""}
  </div>`;
}

function wireDynamicLinks(emails, subject) {
  const text = () => $("#complaint-text").value;
  document.querySelectorAll("[data-wa]").forEach((a) => a.addEventListener("click", (e) => { a.href = `https://wa.me/${a.dataset.wa}?text=${encodeURIComponent(text())}`; }));
  document.querySelectorAll("[data-email]").forEach((a) => a.addEventListener("click", () => { a.href = gmailLink(emails.slice(0, 1), emails.slice(1), subject, text()); }));
  document.querySelectorAll("[data-x]").forEach((a) => a.addEventListener("click", () => {
    const w = state.ward, t = TYPES[state.type];
    const post = `${t.label} problem in ${w.ward_name}, Bengaluru (Ward ${w.ward_no}, ${shortCorp(w.city_corp)} corporation). [describe it] #Bengaluru`;
    a.href = `https://x.com/intent/post?text=${encodeURIComponent(post)}`;
  }));
}

// ── Place search ─────────────────────────────────────────────────
function buildPlaceIndex() {
  const idx = data.wards.map((w) => ({ label: w.ward_name, sub: `Ward ${w.ward_no}, ${shortCorp(w.city_corp)}`, ward: w, hay: w.ward_name.toLowerCase() }));
  Object.entries(data.aliases || {}).forEach(([area, a]) => {
    const w = data.wards.find((x) => x.ward_name === a.ward_name && String(x.ward_no) === String(a.ward_no));
    if (w && area.toLowerCase() !== w.ward_name.toLowerCase())
      idx.push({ label: area, sub: `in ${w.ward_name}, Ward ${w.ward_no}, ${shortCorp(w.city_corp)}`, ward: w, hay: area.toLowerCase() });
  });
  return idx;
}
function searchPlaces(q) {
  q = q.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts = [], contains = [];
  for (const e of data.placeIndex) {
    if (e.hay.startsWith(q)) starts.push(e);
    else if (e.hay.includes(q)) contains.push(e);
  }
  return [...starts, ...contains].slice(0, 8);
}
function wirePlaceSearch() {
  const input = $("#place-input"), list = $("#place-results");
  let results = [], active = -1;
  const render = () => {
    list.hidden = !results.length;
    list.innerHTML = results.map((r, i) => `<li><button type="button" role="option" aria-selected="${i === active}" data-i="${i}"><span>${esc(r.label)}</span><small>${esc(r.sub)}</small></button></li>`).join("");
    list.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => choose(results[+b.dataset.i])));
  };
  const choose = (r) => {
    state.ward = r.ward; state.placeLabel = r.label;
    input.value = r.label; results = []; render();
    showChosen(); update();
    $("#step-who").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  input.addEventListener("input", () => {
    results = searchPlaces(input.value); active = -1; render();
    if (!input.value.trim()) { list.hidden = true; }
    if (!results.length && input.value.trim().length >= 2) {
      list.hidden = false;
      list.innerHTML = `<li><button type="button" disabled><span>No ward or neighbourhood matches “${esc(input.value)}”. Try a nearby area or a shorter name.</span></button></li>`;
    }
  });
  input.addEventListener("keydown", (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") { active = Math.min(active + 1, results.length - 1); render(); e.preventDefault(); }
    if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); render(); e.preventDefault(); }
    if (e.key === "Enter") { choose(results[Math.max(active, 0)]); e.preventDefault(); }
    if (e.key === "Escape") { results = []; render(); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".place-box")) list.hidden = true; });
}
function showChosen() {
  const w = state.ward, el = $("#place-chosen");
  el.hidden = !w;
  $("#step-place").classList.toggle("done", !!w);
  if (!w) return;
  el.innerHTML = `<strong>${esc(w.ward_name)}</strong><span>Ward ${esc(w.ward_no)}, ${esc(w.city_corp)}</span><span>Assembly constituency: ${esc(w.constituency)}</span>`;
}

// Link back to the city view: other complaints from this ward
function renderWardContext() {
  const el = $("#ward-context"), w = state.ward;
  if (!w || !data.issues) { el.hidden = true; return; }
  const inWard = data.issues.filter((i) => i.ward_name === w.ward_name);
  el.hidden = false;
  el.innerHTML = inWard.length
    ? `<p><strong>${inWard.length.toLocaleString("en-IN")}</strong> other complaint${inWard.length > 1 ? "s" : ""} from ${esc(w.ward_name)} ${inWard.length > 1 ? "were" : "was"} posted publicly. Seeing them can help you describe yours, or show it's a repeat problem.</p>
       <a class="btn" href="../dashboard/?q=${encodeURIComponent(w.ward_name)}">See complaints from ${esc(w.ward_name)}</a>`
    : `<p>No public complaints from ${esc(w.ward_name)} are in our records yet.</p><a class="btn" href="../dashboard/">See all complaints</a>`;
}

// ── URL state (so a link can open with type and place filled in) ─
function syncUrl() {
  const p = new URLSearchParams();
  if (state.type) p.set("type", state.type);
  if (state.ward) { p.set("ward", state.ward.ward_name); p.set("corp", shortCorp(state.ward.city_corp)); }
  history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
}
function readUrl() {
  const p = new URLSearchParams(location.search);
  const t = p.get("type") || CAT_TO_TYPE[p.get("category")];
  if (t && TYPES[t]) state.type = t;
  const ward = p.get("ward"), corp = p.get("corp"), area = p.get("area");
  if (ward) state.ward = data.wards.find((w) => w.ward_name === ward && (!corp || shortCorp(w.city_corp) === corp)) || null;
  if (!state.ward && area) {
    const hit = searchPlaces(area)[0];
    if (hit && hit.hay === area.toLowerCase()) state.ward = hit.ward;
    else if (area && area !== "Bangalore") $("#place-input").value = area;
  }
  if (state.ward) $("#place-input").value = state.ward.ward_name;
}

// ── Start ────────────────────────────────────────────────────────
(async function init() {
  const get = (p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [wards, aliases, routing, channels, issues] = await Promise.all([
    get(D + "officials/wards.json"), get(D + "officials/area_ward_lookup.json"),
    get(D + "officials/issue_routing.json"), get(D + "officials/official_channels.json"), get(D + "issues.json"),
  ]);
  data.wards = (Array.isArray(wards) ? wards : wards?.wards || []).map((w) => ({ ...w, key: `${w.ward_name}|${w.city_corp}` }));
  data.aliases = aliases || {};
  data.routing = routing || [];
  data.channels = channels?.channels || {};
  data.channelsChecked = channels?._last_checked ? new Date(channels._last_checked).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
  data.issues = Array.isArray(issues) ? issues : null;
  data.placeIndex = buildPlaceIndex();

  readUrl();
  renderTypes();
  showChosen();
  wirePlaceSearch();
  $("#copy-btn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#complaint-text").value); }
    catch (_) { $("#complaint-text").select(); document.execCommand("copy"); }
    $("#copied").hidden = false; setTimeout(() => ($("#copied").hidden = true), 2000);
  });
  update();
  if (!data.wards.length) $("#place-help").textContent = "Couldn't load the ward list. Refresh the page to try again.";
})();
