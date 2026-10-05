const ROLES = [
  { login: "cs", label: "CSKH", note: "Agent Home — việc cần làm hôm nay", initials: "CS", view: "agent" },
  { login: "crm", label: "CRM Manager", note: "Manager Home — vận hành team", initials: "CM", view: "manager" },
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
  login: sessionStorage.getItem("crmLogin") || "",
  onShift: sessionStorage.getItem("crmOnShift") !== "0",
  queue: [],
  agents: [],
  surveys: [],
  searchTimer: 0
};

const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const rolesEl = document.getElementById("roles");
const leaveShiftBtn = document.getElementById("leave-shift");
const gateEl = document.getElementById("home-gate");
const agentHome = document.getElementById("agent-home");
const managerHome = document.getElementById("manager-home");
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
  const role = currentRole();
  const avatar = document.querySelector(".who-avatar");
  if (!role) {
    whoEl.textContent = "Chưa chọn tài khoản";
    if (avatar) avatar.textContent = "?";
    return;
  }
  whoEl.textContent = `Đang thử với ${role.label} (${role.login})`;
  if (avatar) {
    avatar.textContent = role.initials;
    avatar.style.background = avatarFor(role.login).fg;
  }
}

function renderRoles() {
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
  gateEl.hidden = view !== "gate";
  agentHome.hidden = view !== "agent";
  managerHome.hidden = view !== "manager";
  deniedHome.hidden = view !== "denied";
  leaveShiftBtn.hidden = view !== "agent";
}

function updateShiftUi() {
  const badge = document.getElementById("agent-shift-badge");
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
    const surveys = (body?.surveys || []).slice(0, 4);
    const rows = await Promise.all(surveys.map(async (survey) => {
      try {
        const stats = await request(`/api/surveys/${survey.id}/stats`);
        return {
          id: survey.id,
          title: survey.title || "Khảo sát",
          rate: stats?.completionPercent ?? null,
          score: surveyScoreFromStats(stats)
        };
      } catch {
        return {
          id: survey.id,
          title: survey.title || "Khảo sát",
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
  if (view === "manager") {
    await loadSurveyTouches();
  }
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
    if (view === "agent") {
      updateShiftUi();
      renderAgentKpis();
      renderAgentQueue();
      renderAgentNotes();
    } else {
      renderManagerKpis();
      renderBranchBars();
      renderAgentsOnline();
    }
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

document.getElementById("mgr-period").addEventListener("change", () => {
  renderManagerKpis();
  renderBranchBars();
});

document.getElementById("mgr-branch").addEventListener("change", () => {
  renderBranchBars();
});

document.getElementById("agent-search-form").addEventListener("submit", (event) => {
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
