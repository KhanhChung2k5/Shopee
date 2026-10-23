const ROLES = [
  { login: "cs", label: "CSKH", note: "Agent Home — việc cần làm hôm nay", initials: "CS", view: "agent" },
  { login: "cslead", label: "Trưởng nhóm CSKH", note: "Manager Home — vận hành team", initials: "TN", view: "manager" },
  { login: "admin", label: "Quản trị viên", note: "Manager Home — toàn quyền", initials: "QT", view: "manager" },
  { login: "sales", label: "NV Kinh doanh", note: "Không có trang chủ vận hành", initials: "KD", view: "denied" }
];

const AGENT_NOTES = [
  { title: "Ticket #HT-1042 sắp vượt SLA", detail: "Còn khoảng 12 phút — ưu tiên phản hồi" },
  { title: "Khách VIP gọi lại", detail: "Nguyễn Minh Anh · chi nhánh Q.1" }
];

const BRANCH_COMPLAINTS = {
  today: [
    { id: "q1", label: "Q.1", value: 24, tone: "bad" },
    { id: "q3", label: "Q.3", value: 13, tone: "warn" },
    { id: "td", label: "Thủ Đức", value: 6, tone: "muted" }
  ],
  "7d": [
    { id: "q1", label: "Q.1", value: 61, tone: "bad" },
    { id: "q3", label: "Q.3", value: 38, tone: "warn" },
    { id: "td", label: "Thủ Đức", value: 22, tone: "muted" }
  ],
  "30d": [
    { id: "q1", label: "Q.1", value: 148, tone: "bad" },
    { id: "q3", label: "Q.3", value: 97, tone: "warn" },
    { id: "td", label: "Thủ Đức", value: 54, tone: "muted" }
  ]
};

const MANAGER_STATS = {
  today: { open: 142, sla: 6, avgReply: "18p", csat: "4.3/5" },
  "7d": { open: 318, sla: 19, avgReply: "21p", csat: "4.2/5" },
  "30d": { open: 902, sla: 47, avgReply: "24p", csat: "4.1/5" }
};

const DEMO_SURVEYS = [
  { id: "", title: "CSAT sau mua", rate: 32, score: 4.3 },
  { id: "", title: "NPS quý này", rate: 18, score: 3.2 },
  { id: "", title: "Hài lòng giao hàng", rate: 56, score: 4.5 }
];

const state = {
  login: sessionStorage.getItem("crmLogin") || window.CrmAuth?.current()?.login || "",
  onShift: sessionStorage.getItem("crmOnShift") !== "0",
  queue: [],
  agents: [],
  surveys: [],
  campaigns: [],
  profiles: [],
  searchTimer: 0
};

const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const rolesEl = document.getElementById("roles");
const leaveShiftBtn = document.getElementById("leave-shift");
const gateEl = document.getElementById("home-gate");
const opsHome = document.getElementById("ops-home");
const deniedHome = document.getElementById("denied-home");
const searchInput = document.getElementById("agent-search");
const searchResults = document.getElementById("agent-search-results");

function authHeader() {
  if (!state.login) return {};
  return { Authorization: "Basic " + btoa(`${state.login}:${state.login}`) };
}

function currentRole() {
  return ROLES.find((role) => role.login === state.login);
}

function showBanner(type, message) {
  bannerEl.hidden = !message;
  bannerEl.className = `attention ${type}`;
  bannerEl.textContent = message || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(options.headers || {})
    }
  });
  if (response.status === 204) return null;
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(body?.error?.message || `Lỗi HTTP ${response.status}`);
  }
  return body;
}

function avatarFor(login) {
  const map = {
    admin: { fg: "#1d4ed8" },
    crm: { fg: "#0f766e" },
    cs: { fg: "#b45309" },
    sales: { fg: "#64748b" }
  };
  return map[login] || { fg: "#64748b" };
}

function renderWho() {
  if (!state.login && window.CrmAuth?.current()) {
    state.login = window.CrmAuth.current().login;
  }
  const role = currentRole();
  const avatar = document.querySelector(".who-avatar");
  if (!role) {
    if (whoEl) whoEl.textContent = "Chưa chọn tài khoản";
    if (avatar && !window.CrmAuth?.current()) avatar.textContent = "?";
    return;
  }
  if (whoEl) whoEl.textContent = `${role.label} (${role.login})`;
  if (avatar) {
    avatar.textContent = role.initials;
    avatar.style.background = avatarFor(role.login).fg;
  }
}

function renderRoles() {
  if (!rolesEl || !rolesEl.isConnected) {
    return;
  }
  rolesEl.innerHTML = "";
  ROLES.forEach((role) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.login = role.login;
    button.className = role.login === state.login ? "active" : "";
    button.innerHTML = `<span class="actor-dot" style="background:${avatarFor(role.login).fg}">${role.initials}</span><span><strong>${role.label}</strong><small>${role.note}</small></span>`;
    button.addEventListener("click", async () => {
      state.login = role.login;
      sessionStorage.setItem("crmLogin", role.login);
      await boot();
    });
    rolesEl.appendChild(button);
  });
}

function setView(view) {
  if (gateEl) gateEl.hidden = view !== "gate";
  if (opsHome) opsHome.hidden = view !== "agent" && view !== "manager";
  if (deniedHome) deniedHome.hidden = view !== "denied";
  if (leaveShiftBtn) leaveShiftBtn.hidden = view !== "agent";
  const shift = document.getElementById("agent-shift");
  if (shift) shift.hidden = view !== "agent";
}

function updateShiftUi() {
  const badge = document.getElementById("agent-shift-badge");
  if (!badge) return;
  badge.classList.toggle("is-on", state.onShift);
  badge.classList.toggle("is-off", !state.onShift);
  badge.innerHTML = state.onShift
    ? '<span class="home-shift-dot" aria-hidden="true"></span>Đang trong ca'
    : '<span class="home-shift-dot" aria-hidden="true"></span>Đã rời ca';
  leaveShiftBtn.textContent = state.onShift ? "Rời ca" : "Vào ca";
  leaveShiftBtn.classList.toggle("is-shift-off", !state.onShift);
}

function isSlaBreached(item) {
  return item.slaState === "breached" || item.slaState === "overdue" || item.slaBreached === true;
}

function badgeForItem(item) {
  if (isSlaBreached(item)) {
    return { label: "Vượt SLA", tone: "bad" };
  }
  if (item.type === "live" || item.mode === "live" || /live/i.test(item.channelLabel || "")) {
    return { label: "Live chat", tone: "live" };
  }
  if (item.priority === "high") {
    return { label: "Ưu tiên cao", tone: "bad" };
  }
  return { label: item.statusLabel || item.status || "Mở", tone: "muted" };
}

function renderAgentQueue() {
  const list = document.getElementById("agent-queue");
  const mine = state.queue.filter((item) => item.status !== "closed").slice(0, 5);
  if (!mine.length) {
    list.innerHTML = `<li class="home-empty">Không còn hội thoại cần xử lý. <a href="/conversations.html">Mở hàng đợi</a></li>`;
    return;
  }
  list.innerHTML = mine.map((item) => {
    const badge = badgeForItem(item);
    const title = escapeHtml(item.customerName || item.code || "Khách");
    const sub = escapeHtml([item.code, item.topicLabel || item.preview].filter(Boolean).join(" · "));
    return `<li>
      <a class="home-queue-item" href="/conversations.html">
        <span class="home-queue-copy">
          <strong>${title}</strong>
          <small>${sub}</small>
        </span>
        <span class="home-tag is-${badge.tone}">${escapeHtml(badge.label)}</span>
      </a>
    </li>`;
  }).join("");
}

function renderAgentNotes() {
  document.getElementById("agent-notes").innerHTML = AGENT_NOTES.map((note) => `
    <li class="home-note">
      <span class="home-note-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
      </span>
      <span>
        <strong>${escapeHtml(note.title)}</strong>
        <small>${escapeHtml(note.detail)}</small>
      </span>
    </li>
  `).join("");
}

function renderAgentKpis() {
  const openMine = state.queue.filter((item) => item.status !== "closed");
  const urgent = openMine.filter((item) => isSlaBreached(item) || item.priority === "high").length;
  const hasLiveQueue = state.queue.length > 0;
  document.getElementById("kpi-my-tickets").textContent = String(hasLiveQueue ? openMine.length : 8);
  document.getElementById("kpi-urgent").textContent = String(hasLiveQueue ? urgent : 2);
  document.getElementById("kpi-closed-today").textContent = "14";
  document.getElementById("kpi-csat-personal").textContent = "4.6/5";
}

function renderBranchBars() {
  const period = document.getElementById("mgr-period").value;
  const branch = document.getElementById("mgr-branch").value;
  let rows = BRANCH_COMPLAINTS[period] || BRANCH_COMPLAINTS.today;
  if (branch !== "all") {
    rows = rows.filter((row) => row.id === branch);
  }
  const max = Math.max(...rows.map((row) => row.value), 1);
  const root = document.getElementById("branch-bars");
  root.innerHTML = rows.map((row) => {
    const pct = Math.round((row.value / max) * 100);
    return `<div class="home-bar-row">
      <span class="home-bar-label">${escapeHtml(row.label)}</span>
      <div class="home-bar-track" aria-hidden="true">
        <span class="home-bar-fill is-${row.tone}" style="width:${pct}%"></span>
      </div>
      <strong class="home-bar-value">${row.value}</strong>
    </div>`;
  }).join("");
  root.setAttribute(
    "aria-label",
    `Khiếu nại theo chi nhánh: ${rows.map((row) => `${row.label} ${row.value}`).join(", ")}`
  );
}

function ticketCountForAgent(agentId) {
  if (!agentId) return 0;
  return state.queue.filter(
    (item) => item.status !== "closed" && String(item.assigneeId || "") === String(agentId)
  ).length;
}

function renderAgentsOnline() {
  const list = document.getElementById("agents-online");
  const agents = state.agents.length
    ? state.agents.slice(0, 6).map((agent, index) => ({
        ...agent,
        ticketCount: ticketCountForAgent(agent.userId) || (index === 0 ? 5 : index === 1 ? 3 : 2)
      }))
    : [
        { fullName: "Trần Thu Hà", ticketCount: 5 },
        { fullName: "Lê Quang Duy", ticketCount: 3 },
        { fullName: "Phạm Bảo Ngọc", ticketCount: 7 }
      ];
  list.innerHTML = agents.map((agent) => {
    const count = agent.ticketCount ?? 0;
    return `<li class="home-agent">
      <span class="home-agent-dot" aria-hidden="true"></span>
      <span class="home-agent-name">${escapeHtml(agent.fullName || agent.name || "Agent")}</span>
      <strong>${count} ticket</strong>
    </li>`;
  }).join("");
}

function formatSurveyScore(average) {
  if (average == null || Number.isNaN(average)) return "—";
  return average.toFixed(2).replace(/\.?0+$/, "");
}

/** Tỷ lệ phản hồi: ≥50 tốt, 25–49 cảnh báo, <25 kém (khớp ngưỡng báo cáo ≥50). */
function rateTone(rate) {
  if (rate == null || Number.isNaN(rate)) return "is-muted";
  if (rate >= 50) return "is-ok";
  if (rate >= 25) return "is-warn";
  return "is-bad";
}

/** Điểm TB /5: ≥3.5 tốt, 3.0–3.49 cảnh báo, <3.0 kém (khớp ngưỡng báo cáo ≥3.5). */
function scoreTone(score) {
  if (score == null || Number.isNaN(score)) return "is-muted";
  if (score >= 3.5) return "is-ok";
  if (score >= 3) return "is-warn";
  return "is-bad";
}

function surveyScoreFromStats(stats) {
  const questions = stats?.questions || [];
  let sum = 0;
  let count = 0;
  for (const question of questions) {
    if (question.answerType && question.answerType !== "rating" && question.answerType !== "score") {
      continue;
    }
    const buckets = question.buckets || [];
    for (const bucket of buckets) {
      const score = Number(bucket.value);
      if (!Number.isFinite(score)) continue;
      const n = Number(bucket.count) || 0;
      sum += score * n;
      count += n;
    }
  }
  if (!count) return null;
  return Math.round((sum / count) * 100) / 100;
}

function renderSurveyTouch() {
  const list = document.getElementById("survey-touch");
  const rows = state.surveys.length ? state.surveys : DEMO_SURVEYS;
  list.innerHTML = rows.map((survey) => {
    const href = survey.id
      ? `/reports-surveys.html?id=${encodeURIComponent(survey.id)}`
      : "/reports-surveys.html";
    const rateLabel = survey.rate == null ? "—" : `${survey.rate}%`;
    const scoreLabel = formatSurveyScore(survey.score);
    const rateClass = rateTone(survey.rate);
    const scoreClass = scoreTone(survey.score);
    return `<li>
      <a class="home-survey-row" href="${href}">
        <span class="home-survey-copy">
          <strong>${escapeHtml(survey.title)}</strong>
          <small>
            Tỷ lệ phản hồi
            <span class="home-metric ${rateClass}">${escapeHtml(rateLabel)}</span>
            · điểm TB
            <span class="home-metric ${scoreClass}">${escapeHtml(scoreLabel)}</span>
          </small>
        </span>
        <span class="home-link" aria-hidden="true">Xem →</span>
      </a>
    </li>`;
  }).join("");
}

function renderManagerKpis() {
  const period = document.getElementById("mgr-period").value;
  const stats = MANAGER_STATS[period] || MANAGER_STATS.today;
  const openFromApi = state.queue.filter((item) => item.status !== "closed").length;
  const slaFromApi = state.queue.filter((item) => isSlaBreached(item) || item.priority === "high").length;
  document.getElementById("kpi-team-open").textContent = String(openFromApi || stats.open);
  document.getElementById("kpi-sla").textContent = String(slaFromApi || stats.sla);
  document.getElementById("kpi-avg-reply").textContent = stats.avgReply;
  document.getElementById("kpi-csat-team").textContent = stats.csat;
  renderSurveyTouch();
}

function closeSearchResults() {
  searchResults.hidden = true;
  searchResults.innerHTML = "";
}

async function runCustomerSearch(query) {
  const q = query.trim();
  if (q.length < 2) {
    closeSearchResults();
    return;
  }
  try {
    const result = await request(`/api/customers?search=${encodeURIComponent(q)}&pageSize=6`);
    const items = result.data || [];
    if (!items.length) {
      searchResults.hidden = false;
      searchResults.innerHTML = `<div class="home-search-empty">Không tìm thấy khách khớp «${escapeHtml(q)}».</div>`;
      return;
    }
    searchResults.hidden = false;
    searchResults.innerHTML = items.map((item) => `
      <a class="home-search-item" role="option" href="/profiles.html">
        <strong>${escapeHtml(item.fullName)}</strong>
        <small>${escapeHtml([item.phone, item.email].filter(Boolean).join(" · "))}</small>
      </a>
    `).join("");
  } catch (error) {
    searchResults.hidden = false;
    searchResults.innerHTML = `<div class="home-search-empty">${escapeHtml(error.message)}</div>`;
  }
}

async function beat(online) {
  state.onShift = online;
  sessionStorage.setItem("crmOnShift", online ? "1" : "0");
  updateShiftUi();
  try {
    await request("/api/conversations/presence", {
      method: "POST",
      body: JSON.stringify({ online })
    });
  } catch {
    /* Trang chủ vẫn phản ánh trạng thái ca local nếu API vắng mặt. */
  }
}

async function loadSurveyTouches() {
  state.surveys = [];
  try {
    const body = await request("/api/surveys");
    const surveys = (body?.surveys || []).slice(0, 3);
    const rows = await Promise.all(surveys.map(async (survey) => {
      try {
        const stats = await request(`/api/surveys/${survey.id}/stats`);
        const invited = Number(stats?.invitedCount) || 0;
        return {
          id: survey.id,
          title: survey.title || "Khảo sát",
          status: survey.status || "",
          rate: invited > 0 ? stats?.completionPercent ?? null : null,
          score: surveyScoreFromStats(stats)
        };
      } catch {
        return {
          id: survey.id,
          title: survey.title || "Khảo sát",
          status: survey.status || "",
          rate: null,
          score: null
        };
      }
    }));
    state.surveys = rows;
  } catch {
    state.surveys = [];
  }
}

async function loadOperationalData(view) {
  state.queue = [];
  state.agents = [];
  state.surveys = [];
  if (!state.login) return;
  const filter = view === "agent" ? "mine" : "all";
  try {
    const queue = await request(`/api/conversations?filter=${encodeURIComponent(filter)}`);
    state.queue = queue?.items || queue?.data || [];
  } catch {
    try {
      const queue = await request("/api/conversations");
      state.queue = queue?.items || queue?.data || [];
    } catch {
      state.queue = [];
    }
  }
  try {
    const agents = await request("/api/conversations/agents");
    state.agents = Array.isArray(agents) ? agents : agents?.items || [];
  } catch {
    state.agents = [];
  }
  await Promise.all([loadSurveyTouches(), loadCampaigns(), loadProfiles()]);
}

async function loadCampaigns() {
  state.campaigns = [];
  try {
    const body = await request("/api/campaigns");
    state.campaigns = body?.campaigns || [];
  } catch {
    state.campaigns = [];
  }
}

async function loadProfiles() {
  state.profiles = [];
  try {
    const body = await request("/api/crm/reports/customers");
    state.profiles = body?.customers || [];
  } catch {
    state.profiles = [];
  }
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function countBy(items, pick) {
  const totals = new Map();
  items.forEach((item) => {
    const key = pick(item) || "other";
    totals.set(key, (totals.get(key) || 0) + 1);
  });
  return totals;
}

function mixRow(label, count, total, tone) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return `<li class="mix-row">
    <span class="mix-label">${escapeHtml(label)}</span>
    <span class="mix-track"><span class="is-${tone}" style="width:${pct}%"></span></span>
    <strong>${count}</strong>
    <small>${pct}%</small>
  </li>`;
}

function fillList(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function channelColor(value) {
  const text = String(value || "").trim();
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let raw = hex[1];
    if (raw.length === 3) raw = [...raw].map((char) => char + char).join("");
    const n = Number.parseInt(raw, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = text.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

function rgbToHsl(rgb) {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  if (max === min) return [0, 0, light];
  const delta = max - min;
  const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return [hue, sat, light];
}

function mixHsl(fromRgb, toRgb, amount) {
  const t = Math.min(1, Math.max(0, amount));
  const from = rgbToHsl(fromRgb);
  const to = rgbToHsl(toRgb);
  let dh = to[0] - from[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (from[0] + dh * t + 360) % 360;
  const s = (from[1] + (to[1] - from[1]) * t) * 100;
  const l = (from[2] + (to[2] - from[2]) * t) * 100;
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

/** Từ 80% trở lên giữ xanh; dưới 80% pha dần sang cam (40%) rồi đỏ (0%). */
function slaFill(pct) {
  const root = getComputedStyle(document.documentElement);
  const good = channelColor(root.getPropertyValue("--color-ok")) || [21, 128, 61];
  const mid = [249, 115, 22];
  const bad = channelColor(root.getPropertyValue("--color-destructive")) || [220, 38, 38];
  if (pct >= 80) return mixHsl(good, good, 1);
  if (pct >= 40) return mixHsl(mid, good, (pct - 40) / 40);
  return mixHsl(bad, mid, pct / 40);
}

function renderTicketBoard(view) {
  const openItems = state.queue.filter((item) => item.status !== "closed");
  const closed = state.queue.length - openItems.length;
  const inProgress = openItems.filter((item) => item.status === "in_progress").length;
  const waiting = openItems.length - inProgress;
  const bars = document.getElementById("ticket-hero-bars");
  const openEl = document.getElementById("kpi-open");
  const metaEl = document.getElementById("kpi-open-meta");
  if (openEl) openEl.textContent = String(openItems.length);
  if (metaEl) {
    metaEl.textContent = view === "agent" ? "Ticket đang giao cho bạn" : "Hội thoại chưa đóng";
  }
  const columns = [
    { key: "open", label: "Mở", count: waiting },
    { key: "progress", label: "Đang xử lý", count: inProgress },
    { key: "done", label: "Đã đóng", count: closed }
  ];
  const max = Math.max(...columns.map((col) => col.count), 1);
  if (bars) {
    bars.innerHTML = columns.map((col) => {
      const height = Math.max(8, Math.round((col.count / max) * 100));
      return `<div class="hero-col is-${col.key}">
        <div class="hero-col-plot"><span class="hero-col-bar" style="height:${height}%"></span></div>
        <strong>${col.count}</strong>
        <small>${col.label}</small>
      </div>`;
    }).join("");
  }

  const due = openItems.filter((item) => !isSlaBreached(item)).length;
  const breached = openItems.length - due;
  const pct = openItems.length ? Math.round((due / openItems.length) * 100) : 100;
  const ring = document.getElementById("sla-ring");
  const pctEl = document.getElementById("sla-pct");
  const caption = document.getElementById("sla-caption");
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (ring) {
    ring.style.setProperty("--sla-pct", `${pct}%`);
    ring.style.setProperty("--sla-fill", slaFill(pct));
    ring.setAttribute("aria-label", `Tỷ lệ đúng hạn ${pct}%`);
  }
  if (caption) {
    caption.textContent = pct >= 90 ? "Đạt mục tiêu 90%" : `Dưới mục tiêu 90% · ${breached} ticket trễ`;
  }
  fillList("ticket-sla", [
    mixRow("Đúng hạn", due, openItems.length, "ok"),
    mixRow("Vượt SLA", breached, openItems.length, "bad")
  ].join(""));

  const high = openItems.filter((item) => item.priority === "high").length;
  const normal = openItems.filter((item) => item.priority === "normal").length;
  const low = openItems.filter((item) => item.priority !== "high" && item.priority !== "normal").length;
  fillList("ticket-priority", [
    mixRow("Cao", high, openItems.length, "high"),
    mixRow("Bình thường", normal, openItems.length, "normal"),
    mixRow("Thấp", low, openItems.length, "low")
  ].join(""));

  const queueMeta = document.getElementById("ticket-queue-meta");
  if (queueMeta) queueMeta.textContent = openItems.length ? `${openItems.length} hội thoại` : "";
  const rows = openItems.slice(0, 6);
  fillList("ticket-queue", rows.length
    ? rows.map((item) => {
        const title = escapeHtml(item.customerName || item.code || "Khách");
        const sub = escapeHtml([item.code, item.topicLabel || item.preview].filter(Boolean).join(" · "));
        const statusTone = item.status === "in_progress" ? "progress" : "open";
        const prio = item.priority === "high" ? "high" : item.priority === "low" ? "low" : "normal";
        const prioLabel = item.priority === "high" ? "Cao" : item.priority === "low" ? "Thấp" : "Thường";
        const sla = isSlaBreached(item) ? `<span class="home-tag is-bad">Vượt SLA</span>` : "";
        return `<li>
          <a class="ticket-row" href="/conversations.html">
            <span class="ticket-copy"><strong>${title}</strong><small>${sub}</small></span>
            <span class="ticket-flags">
              <span class="home-tag is-${statusTone}">${escapeHtml(item.statusLabel || "Mở")}</span>
              <span class="home-tag is-prio-${prio}">${prioLabel}</span>
              ${sla}
            </span>
          </a>
        </li>`;
      }).join("")
    : `<li class="home-empty">Không còn hội thoại cần xử lý. <a href="/conversations.html">Mở hàng đợi</a></li>`);
}

const RFM_LABEL = {
  champions: "Champions",
  loyal: "Loyal",
  potential: "Potential",
  at_risk: "At Risk",
  lost: "Lost",
  other: "Khác"
};

function kpi(label, value) {
  return `<div class="module-kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function moduleRows(items, emptyHref, emptyText, render) {
  if (!items.length) {
    return `<li class="home-empty">${emptyText} <a href="${emptyHref}">Mở trang</a></li>`;
  }
  return items.slice(0, 4).map(render).join("");
}

const QUOTA_TICKS = 20;
const CSAT_MAX = 5;
const CSAT_TARGET = 3.5;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setPill(id, tone, label, title) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!label) {
    el.hidden = true;
    el.replaceChildren();
    el.className = "insight-pill";
    el.removeAttribute("title");
    return;
  }
  el.hidden = false;
  el.className = `insight-pill${tone ? ` is-${tone}` : ""}`;
  el.title = title || "";
  const arrow = tone === "up" || tone === "down"
    ? `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="${tone === "up" ? "M6 9.5V2.5M3.2 5.2 6 2.5l2.8 2.7" : "M6 2.5v7M3.2 6.8 6 9.5l2.8-2.7"}"/></svg>`
    : "";
  el.innerHTML = `${arrow}<span>${escapeHtml(label)}</span>`;
}

function mean(values) {
  const nums = values.filter((value) => value != null && !Number.isNaN(Number(value)));
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + Number(value), 0) / nums.length;
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function targetDelta(value, target) {
  if (value == null) return null;
  const delta = Math.round((value - target) * 10) / 10;
  const abs = Math.abs(delta);
  if (abs < 0.05) {
    return { tone: "", label: "Đúng mục tiêu", title: `Bằng mục tiêu ${target}` };
  }
  const shown = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return {
    tone: delta > 0 ? "up" : "down",
    label: `${shown}`,
    title: `${delta > 0 ? "Cao hơn" : "Thấp hơn"} mục tiêu ${target}`
  };
}

function surveyHref(survey) {
  return survey?.id
    ? `/reports-surveys.html?id=${encodeURIComponent(survey.id)}`
    : "/surveys.html";
}

function campaignHref(campaign) {
  return campaign?.id
    ? `/campaign-edit.html?id=${encodeURIComponent(campaign.id)}`
    : "/campaigns.html";
}

function recentCampaigns(campaigns) {
  return campaigns.slice().sort((left, right) => {
    const leftAt = Date.parse(left.startAt || "") || 0;
    const rightAt = Date.parse(right.startAt || "") || 0;
    return rightAt - leftAt;
  }).slice(0, 3);
}

function campaignDelivery(campaign) {
  const unread = Number(campaign.sentCount) || 0;
  const read = Number(campaign.readCount) || 0;
  const delivered = unread + read;
  const pending = campaign.deliveryStatus === "scheduled" || delivered === 0;
  const rate = pending ? null : Math.round((read * 1000) / delivered) / 10;
  return { unread, read, delivered, pending, rate };
}

function quotaTicks(percent, bars = QUOTA_TICKS) {
  const rate = percent == null ? 0 : Math.max(0, Math.min(100, Number(percent)));
  const filled = Math.round((bars * rate) / 100);
  return Array.from({ length: bars }, (_, index) => (
    `<i class="${index < filled ? "is-fill" : "is-rest"}" style="--tick:${index};--rate:${rate}"></i>`
  )).join("");
}

function smallPanel(href, title, valueHtml, plotHtml, plotLabel) {
  return `<a class="small-panel" href="${href}" title="${escapeHtml(title)}">
    <span class="small-panel-head">
      <span class="small-panel-name">${escapeHtml(title)}</span>
      ${valueHtml}
    </span>
    <span class="small-plot" role="img" aria-label="${escapeHtml(plotLabel)}">${plotHtml}</span>
  </a>`;
}

function emptyMultiples(chart, message) {
  if (!chart) return;
  chart.dataset.count = "0";
  chart.innerHTML = `<p class="insight-empty">${message}</p>`;
}

function renderResponseChart(surveys) {
  const chart = document.getElementById("survey-rate-chart");
  const rates = surveys.map((survey) => survey.rate);
  const average = mean(rates);
  setText("survey-rate-value", average == null ? "—" : `${formatPercent(average)}%`);
  const delta = targetDelta(average, 50);
  setPill("survey-rate-pill", delta?.tone, delta?.label, delta ? `${delta.title}%` : "");
  setText(
    "survey-rate-meta",
    surveys.length
      ? `${surveys.length} khảo sát tạo gần nhất · mục tiêu 50%`
      : "Chưa có khảo sát · mục tiêu 50%"
  );
  if (!chart) return;
  if (!surveys.length) {
    emptyMultiples(chart, "Chưa có khảo sát.");
    return;
  }
  chart.dataset.count = String(surveys.length);
  chart.innerHTML = surveys.map((survey) => {
    const label = survey.rate == null ? "—" : `${formatPercent(survey.rate)}%`;
    const deltaRow = targetDelta(survey.rate, 50);
    const value = deltaRow
      ? `<span class="small-panel-value">${escapeHtml(label)}${pillHtml(deltaRow.tone, deltaRow.label, `${deltaRow.title}%`)}</span>`
      : `<span class="small-panel-value">${escapeHtml(label)}</span>`;
    const plotLabel = survey.rate == null
      ? `${survey.title}: chưa có tỷ lệ phản hồi`
      : `${survey.title}: phản hồi ${formatPercent(survey.rate)}%`;
    return smallPanel(
      surveyHref(survey),
      survey.title,
      value,
      `<span class="quota-stripes is-rate">${quotaTicks(survey.rate)}</span>`,
      plotLabel
    );
  }).join("");
}

function pillHtml(tone, label, title) {
  const arrow = tone === "up" || tone === "down"
    ? `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="${tone === "up" ? "M6 9.5V2.5M3.2 5.2 6 2.5l2.8 2.7" : "M6 2.5v7M3.2 6.8 6 9.5l2.8-2.7"}"/></svg>`
    : "";
  return `<span class="insight-pill${tone ? ` is-${tone}` : ""}" title="${escapeHtml(title || "")}">${arrow}<span>${escapeHtml(label)}</span></span>`;
}

function renderCsatChart(surveys) {
  const chart = document.getElementById("survey-csat-chart");
  const average = mean(surveys.map((survey) => survey.score));
  setText("survey-csat-value", average == null ? "—" : formatSurveyScore(average));
  const delta = targetDelta(average, CSAT_TARGET);
  setPill("survey-csat-pill", delta?.tone, delta?.label, delta?.title || "");
  setText(
    "survey-csat-meta",
    surveys.length
      ? `${surveys.length} khảo sát tạo gần nhất · thang ${CSAT_MAX}`
      : `Chưa có khảo sát · thang ${CSAT_MAX}`
  );
  if (!chart) return;
  if (!surveys.length) {
    emptyMultiples(chart, "Chưa có khảo sát.");
    return;
  }
  chart.dataset.count = String(surveys.length);
  const targetPct = (CSAT_TARGET / CSAT_MAX) * 100;
  chart.innerHTML = surveys.map((survey) => {
    const score = survey.score;
    const fillPct = score == null ? 0 : Math.max(0, Math.min(100, (score / CSAT_MAX) * 100));
    const label = score == null ? "—" : formatSurveyScore(score);
    const deltaRow = targetDelta(score, CSAT_TARGET);
    const value = deltaRow
      ? `<span class="small-panel-value">${escapeHtml(label)}${pillHtml(deltaRow.tone, deltaRow.label, deltaRow.title)}</span>`
      : `<span class="small-panel-value">${escapeHtml(label)}</span>`;
    const plotLabel = score == null
      ? `${survey.title}: chưa có điểm CSAT`
      : `${survey.title}: CSAT ${formatSurveyScore(score)} trên ${CSAT_MAX}, mục tiêu ${CSAT_TARGET}`;
    return smallPanel(
      surveyHref(survey),
      survey.title,
      value,
      `<span class="horizon-track">
        <span class="horizon-fill" style="width:${fillPct.toFixed(1)}%"></span>
        <span class="horizon-mark" style="left:${targetPct}%" title="Mục tiêu ${CSAT_TARGET}"></span>
      </span>`,
      plotLabel
    );
  }).join("");
}

function renderSentChart(campaigns) {
  const chart = document.getElementById("campaign-sent-chart");
  const total = campaigns.length;
  const sent = campaigns.filter((row) => row.deliveryStatus === "sent").length;
  const scheduled = campaigns.filter((row) => row.deliveryStatus === "scheduled").length;
  const letters = campaigns.reduce((sum, row) => sum + campaignDelivery(row).delivered, 0);
  setText("campaign-sent-value", total ? `${sent}` : "—");
  const valueEl = document.getElementById("campaign-sent-value");
  if (valueEl && total) {
    valueEl.innerHTML = `${sent}<small> / ${total}</small>`;
  }
  setPill(
    "campaign-sent-pill",
    scheduled ? "" : (total && sent === total ? "up" : ""),
    scheduled ? `${scheduled} đã lên lịch` : (total && sent === total ? "Đã gửi hết" : ""),
    scheduled ? "Chiến dịch chưa đến giờ phát thư" : "Mọi chiến dịch đã được gửi"
  );
  setText(
    "campaign-sent-meta",
    total ? `${letters} thư đã phát trên ${total} chiến dịch` : "Chưa có chiến dịch"
  );
  if (!chart) return;
  chart.setAttribute("aria-label", total ? `${sent} trên ${total} chiến dịch đã gửi` : "Chưa có chiến dịch");
  if (!total) {
    chart.innerHTML = `<p class="insight-empty">Chưa có chiến dịch.</p>`;
    return;
  }
  const percent = total ? (sent * 100) / total : 0;
  chart.innerHTML = quotaTicks(percent);
}

function renderOpenChart(campaigns) {
  const chart = document.getElementById("campaign-open-chart");
  const summary = document.getElementById("campaign-open-summary");
  const latest = recentCampaigns(campaigns);
  const stats = latest.map((campaign) => ({ campaign, ...campaignDelivery(campaign) }));
  const average = mean(stats.map((row) => row.rate));
  const read = stats.reduce((sum, row) => sum + row.read, 0);
  const delivered = stats.reduce((sum, row) => sum + row.delivered, 0);
  setText("campaign-open-value", average == null ? "—" : `${formatPercent(average)}%`);
  const tone = average == null ? "" : average >= 50 ? "up" : average >= 25 ? "" : "down";
  setPill(
    "campaign-open-pill",
    tone,
    delivered ? `${read}/${delivered} thư` : (latest.length ? "Chưa có lượt mở" : ""),
    "Số thư đã mở trên số thư đã gửi của 3 chiến dịch gần nhất"
  );
  const summaryText = average == null
    ? "Chưa có tỷ lệ mở thư."
    : `Tỷ lệ mở thư trung bình ${formatPercent(average)}%. ${read} trên ${delivered} thư đã mở.`;
  if (summary) summary.textContent = summaryText;
  if (!chart) return;
  if (!latest.length) {
    emptyMultiples(chart, "Chưa có chiến dịch.");
    return;
  }
  chart.dataset.count = String(stats.length);
  chart.innerHTML = stats.map((row) => {
    const name = row.campaign.name || "Chiến dịch";
    const label = row.campaign.deliveryStatus === "scheduled"
      ? "Chưa gửi"
      : row.delivered === 0
        ? "Chưa có thư"
        : `${formatPercent(row.rate)}%`;
    const plotLabel = `${name}: mở thư ${label}`;
    return smallPanel(
      campaignHref(row.campaign),
      name,
      `<span class="small-panel-value">${escapeHtml(label)}</span>`,
      `<span class="quota-stripes is-open">${quotaTicks(row.rate)}</span>`,
      plotLabel
    );
  }).join("");
}

function renderModules() {
  const surveys = state.surveys.slice(0, 3);
  renderResponseChart(surveys);
  renderCsatChart(surveys);
  renderSentChart(state.campaigns);
  renderOpenChart(state.campaigns);

  const profiles = state.profiles;
  const rfm = countBy(profiles, (row) => row.rfmSegment);
  fillList("profile-kpis", [
    kpi("Khách", profiles.length),
    kpi("Champions", rfm.get("champions") || 0),
    kpi("At Risk", rfm.get("at_risk") || 0)
  ].join(""));
  const ranked = profiles.slice().sort((a, b) => Number(b.ltv || 0) - Number(a.ltv || 0));
  fillList("profile-list", moduleRows(
    ranked,
    "/profiles.html",
    "Chưa có hồ sơ CRM.",
    (row) => `<li><a class="module-row" href="/profiles.html">
      <span><strong>${escapeHtml(row.fullName || "Khách")}</strong><small>${escapeHtml(RFM_LABEL[row.rfmSegment] || row.rfmSegment || "RFM")} · ${Number(row.totalOrders) || 0} đơn</small></span>
    </a></li>`
  ));
}

function renderDashboard(view) {
  const greet = document.getElementById("ops-greet");
  const sub = document.getElementById("ops-sub");
  const role = currentRole();
  if (greet) greet.textContent = greeting();
  if (sub) {
    sub.textContent = view === "agent"
      ? "Việc cần xử lý trong ca của bạn."
      : `${role?.label || "CRM"} — ticket, khảo sát, chiến dịch và hồ sơ.`;
  }
  if (view === "agent") updateShiftUi();
  renderTicketBoard(view);
  renderModules();
}

async function boot() {
  renderRoles();
  renderWho();
  closeSearchResults();

  if (!state.login) {
    setView("gate");
    showBanner("info", "Chọn tài khoản bên trái để mở trang chủ theo vai trò.");
    return;
  }

  const role = currentRole();
  const view = role?.view || "denied";
  setView(view);
  showBanner("", "");

  if (view === "denied") return;

  try {
    if (view === "agent" && state.onShift) {
      await beat(true);
    }
    await loadOperationalData(view);
    renderDashboard(view);
  } catch (error) {
    showBanner("err", error.message);
  }
}

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app")?.classList.toggle("nav-open");
});

document.getElementById("reload").addEventListener("click", () => boot());

leaveShiftBtn.addEventListener("click", async () => {
  const next = !state.onShift;
  await beat(next);
  showBanner(
    "info",
    next
      ? "Đã vào ca. Khách mở widget sẽ thấy live chat."
      : "Đã rời ca. Khách đang mở widget sẽ thấy chế độ ticket."
  );
});

document.getElementById("agent-search-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  runCustomerSearch(searchInput.value);
});

searchInput.addEventListener("input", () => {
  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(() => runCustomerSearch(searchInput.value), 220);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSearchResults();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".home-search")) closeSearchResults();
});

boot();
