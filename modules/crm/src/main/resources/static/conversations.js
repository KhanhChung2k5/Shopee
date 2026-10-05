const ROLES = [
  { login: "cs", label: "CSKH", note: "Nhận ticket và live chat", initials: "CS" },
  { login: "crm", label: "CRM Manager", note: "Xử lý và nhận escalate", initials: "CM" },
  { login: "admin", label: "Quản trị viên", note: "Toàn quyền hội thoại", initials: "QT" },
  { login: "sales", label: "NV Kinh doanh", note: "Không vào được hàng đợi", initials: "KD" }
];

const PRIORITY = { high: "Cao", normal: "BT", low: "Thấp" };
const PRIORITY_FULL = { high: "Ưu tiên cao", normal: "Bình thường", low: "Thấp" };

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  filter: "all",
  items: [],
  catalog: [],
  selectedId: "",
  detail: null,
  agents: [],
  canned: [],
  note: false,
  onShift: true
};

const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const rolesEl = document.getElementById("roles");
const queueEl = document.getElementById("queue");
const threadPane = document.getElementById("thread-pane");
const profileEl = document.getElementById("profile");
const modalEl = document.getElementById("escalate-modal");

const entitySwitch = createEntitySwitch({
  root: "#entity-switch",
  pinKey: "crmConversationPins",
  recentKey: "crmConversationRecent",
  showDateFilter: true,
  labels: {
    noun: "hội thoại",
    switchLabel: "Đổi hội thoại",
    switchPlaceholder: "Gõ tên khách hoặc mã ticket…",
    searchLabel: "Tìm hội thoại",
    paletteTitle: "Tìm hội thoại",
    palettePlaceholder: "Tên khách, mã ticket, chủ đề, ưu tiên…",
    emptyTitle: "Không có hội thoại khớp.",
    emptyHint: "Thử tên khách, mã ticket hoặc chủ đề."
  },
  getItems: () => state.catalog.map((item) => ({
    id: item.id,
    title: item.customerName || item.code || "Hội thoại",
    subtitle: [item.code, item.topicLabel, item.channelLabel].filter(Boolean).join(" · "),
    badge: {
      label: PRIORITY_FULL[item.priority] || item.priority || "Bình thường",
      tone: item.priority === "high" ? "locked" : item.status === "closed" ? "scheduled" : "active"
    },
    searchText: `${item.customerName} ${item.code} ${item.topicLabel} ${item.preview || ""} ${item.channelLabel}`,
    sortAt: item.lastMessageAt || item.slaDueAt
  })),
  getSelectedId: () => state.selectedId,
  isEnabled: () => Boolean(state.login),
  onSelect: async (id) => {
    try {
      await loadDetail(id);
      entitySwitch.sync();
    } catch (error) {
      showBanner("err", error.message);
    }
  }
});

function authHeader() {
  if (!state.login) return {};
  return { Authorization: "Basic " + btoa(`${state.login}:${state.login}`) };
}

function showBanner(type, message) {
  bannerEl.hidden = !message;
  bannerEl.className = `attention ${type}`;
  bannerEl.textContent = message || "";
}

function openDialog(el) {
  el.hidden = false;
  el.classList.add("is-open");
}

function closeDialog(el) {
  el.hidden = true;
  el.classList.remove("is-open");
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

function currentRole() {
  return ROLES.find((role) => role.login === state.login);
}

const MESSAGE_GROUP_MS = 2 * 60 * 1000;

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false });
}

function formatMsgTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (sameDay) return time;
  const day = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${time} · ${day}`;
}

function formatDayDivider(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startToday - startMsg) / 86400000);
  if (dayDiff === 0) return "Hôm nay";
  if (dayDiff === 1) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

function sameCalendarDay(a, b) {
  if (!a || !b) return false;
  const left = new Date(a);
  const right = new Date(b);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false;
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function messageAuthorKey(message) {
  if (!message || message.side === "system") return "";
  return `${message.side}:${message.senderId || message.senderName || ""}`;
}

function isSameMessageGroup(prev, next) {
  if (!prev || !next) return false;
  if (prev.side === "system" || next.side === "system") return false;
  if (messageAuthorKey(prev) !== messageAuthorKey(next)) return false;
  const left = new Date(prev.sentAt).getTime();
  const right = new Date(next.sentAt).getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return Math.abs(right - left) < MESSAGE_GROUP_MS;
}

function messageAuthorLabel(message) {
  if (message.side === "agent") {
    return [message.senderName, message.senderRole].filter(Boolean).join(" · ");
  }
  if (message.side === "note") {
    return ["Ghi chú nội bộ", message.senderName].filter(Boolean).join(" · ");
  }
  if (message.side === "bot") {
    return "Trợ lý ảo";
  }
  return message.senderName || "Khách";
}

function messageHtml(message, options = {}) {
  if (message.side === "system") {
    return `<div class="divider">${escapeHtml(message.content)}</div>`;
  }
  const side = message.side === "note" ? "note" : message.side;
  const showAuthor = options.showAuthor !== false;
  const showTime = options.showTime !== false;
  const grouped = options.grouped ? " is-grouped" : "";
  const author = showAuthor
    ? `<p class="meta">${escapeHtml(messageAuthorLabel(message))}</p>`
    : "";
  const time = showTime
    ? `<time class="msg-time" datetime="${escapeHtml(message.sentAt || "")}">${escapeHtml(formatMsgTime(message.sentAt))}</time>`
    : "";
  return `
    <div class="msg ${side}${grouped}">
      <article class="bubble ${side}">
        ${author}
        <p>${escapeHtml(message.content)}</p>
      </article>
      ${time}
    </div>`;
}

function renderMessages(messages) {
  const items = messages || [];
  return items.map((message, index) => {
    if (message.side === "system") {
      return messageHtml(message);
    }
    const prev = items[index - 1];
    const next = items[index + 1];
    const continueFromPrev = isSameMessageGroup(prev, message);
    const continueToNext = isSameMessageGroup(message, next);
    const dayChanged = !prev || prev.side === "system" || !sameCalendarDay(prev.sentAt, message.sentAt);
    const dayDivider = !continueFromPrev && dayChanged
      ? `<div class="divider time-divider">${escapeHtml(formatDayDivider(message.sentAt))}</div>`
      : "";
    return dayDivider + messageHtml(message, {
      showAuthor: !continueFromPrev,
      showTime: !continueToNext,
      grouped: continueFromPrev
    });
  }).join("");
}

function vnd(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
}

function formatDuration(absMinutes) {
  if (absMinutes >= 1440) {
    const days = Math.floor(absMinutes / 1440);
    const hours = Math.floor((absMinutes % 1440) / 60);
    return hours > 0 ? `${days} ngày ${hours} giờ` : `${days} ngày`;
  }
  if (absMinutes >= 60) {
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
  }
  return `${absMinutes} phút`;
}

function slaText(detail, options = {}) {
  if (!detail) return "";
  if (detail.slaState === "done") return "Đã đóng";
  const due = new Date(detail.slaDueAt);
  if (Number.isNaN(due.getTime())) return "";
  const minutes = Math.round((due.getTime() - Date.now()) / 60000);
  const abs = Math.abs(minutes);
  const compact = options.compact === true;
  if (minutes < 0) {
    return compact ? `Vượt SLA ${formatDuration(abs)}` : `Quá hạn ${formatDuration(abs)}`;
  }
  // Còn hạn: không hiện số giờ chi tiết ở hàng đợi để tránh nhiễu đỏ/cam
  if (compact && detail.slaState === "ok") return "";
  if (detail.slaState === "due") {
    return compact ? `Còn hạn ${formatDuration(abs)}` : `SLA sắp hết · ${formatDuration(abs)}`;
  }
  return compact ? `Còn hạn ${formatDuration(abs)}` : `SLA Còn hạn ${formatDuration(abs)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderRoles() {
  rolesEl.innerHTML = ROLES.map((role) => `
    <button type="button" class="${role.login === state.login ? "active" : ""}" data-login="${role.login}">
      <span class="actor-dot" style="background:#2563eb">${role.initials}</span>
      <span><strong>${role.label}</strong><small>${role.note}</small></span>
    </button>
  `).join("");
  const role = currentRole();
  whoEl.textContent = role ? role.label : "Chưa chọn tài khoản";
  const avatar = document.querySelector(".who-avatar");
  if (avatar) avatar.textContent = role ? role.initials : "?";
}

function priorityClass(priority) {
  if (priority === "high") return "prio-high";
  if (priority === "low") return "prio-low";
  return "prio-normal";
}

function queueSlaHtml(item) {
  if (!item || item.slaState === "done" || item.slaState === "ok") return "";
  const text = slaText(item, { compact: true });
  if (!text) return "";
  const stateClass = item.slaState === "breached" ? "is-breached" : "is-due";
  const label = item.slaState === "breached" ? "SLA quá hạn" : "SLA sắp hết hạn";
  return `
    <span class="queue-sla ${stateClass}" title="${label}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      <span>${escapeHtml(text)}</span>
    </span>`;
}

function priorityPillClass(priority) {
  if (priority === "high") return "pill prio-pill high";
  if (priority === "low") return "pill prio-pill low";
  return "pill prio-pill normal";
}

function threadSlaHtml(detail) {
  const text = slaText(detail);
  if (!text) return "";
  const state = detail.slaState || "ok";
  if (state === "ok" || state === "done") {
    return `<span class="sla-chip ${state}">${escapeHtml(text)}</span>`;
  }
  return `
    <span class="sla-chip ${state}" title="${state === "breached" ? "Vượt hạn SLA" : "Sắp hết hạn SLA"}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      ${escapeHtml(text)}
    </span>`;
}

function renderQueue() {
  if (!state.items.length) {
    queueEl.innerHTML = `<li class="hint">Không có hội thoại trong bộ lọc này.</li>`;
    return;
  }
  queueEl.innerHTML = state.items.map((item) => {
    const selected = item.id === state.selectedId;
    const channelClass = item.type === "chat" ? "pill live" : "pill";
    const prio = priorityClass(item.priority);
    const priorityLabel = PRIORITY[item.priority] || item.priority || "BT";
    const priorityTitle = PRIORITY_FULL[item.priority] || priorityLabel;
    return `
      <li>
        <button type="button" class="queue-item ${prio}${selected ? " is-selected" : ""}" data-id="${item.id}" data-priority="${escapeHtml(item.priority || "normal")}">
          <span class="queue-top">
            <span class="queue-name">${escapeHtml(item.customerName)}</span>
            <span class="${channelClass}">${escapeHtml(item.channelLabel)}</span>
          </span>
          <span class="queue-meta">
            <span class="queue-signals">
              <span class="${priorityPillClass(item.priority)}" title="${escapeHtml(priorityTitle)}">${escapeHtml(priorityLabel)}</span>
              ${queueSlaHtml(item)}
            </span>
            <span class="pill">${escapeHtml(item.code)}</span>
          </span>
          <p class="queue-preview">${escapeHtml(item.preview || item.topicLabel)}</p>
        </button>
      </li>`;
  }).join("");
}

function renderThread() {
  const detail = state.detail;
  if (!detail) {
    threadPane.className = "thread-pane is-empty";
    threadPane.innerHTML = `Chọn một ticket trong hàng đợi.`;
    return;
  }
  threadPane.className = "thread-pane";
  const canned = state.canned.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  const prio = detail.priority || "normal";
  const closed = detail.status === "closed";
  threadPane.innerHTML = `
    <header class="thread-head">
      <div class="thread-head-main">
        <h2 class="thread-customer">${escapeHtml(detail.customerName)}</h2>
        <div class="thread-badges">
          <label class="priority-badge ${priorityClass(prio)}" title="Đổi mức ưu tiên">
            <span class="sr-only">Ưu tiên</span>
            <select id="priority" aria-label="Mức ưu tiên" ${closed ? "disabled" : ""}>
              <option value="high" ${prio === "high" ? "selected" : ""}>Cao</option>
              <option value="normal" ${prio === "normal" ? "selected" : ""}>BT</option>
              <option value="low" ${prio === "low" ? "selected" : ""}>Thấp</option>
            </select>
          </label>
          <span class="pill">${escapeHtml(detail.topicLabel)}</span>
          <span class="pill ${detail.type === "chat" ? "live" : ""}">${escapeHtml(detail.channelLabel)}</span>
        </div>
      </div>
      ${threadSlaHtml(detail)}
      <div class="thread-actions">
        ${!closed ? `<button class="btn-resolve" type="button" id="resolve">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
          Đã giải quyết
        </button>` : `<span class="pill">Đã giải quyết</span>`}
        ${detail.type === "ticket" && !closed ? `<button class="btn-ghost" type="button" id="to-live">Chuyển live chat</button>` : ""}
        ${!closed ? `<button class="btn-ghost" type="button" id="open-escalate">Escalate</button>` : ""}
      </div>
    </header>
    <div class="thread" id="messages">
      ${renderMessages(detail.messages)}
      ${detail.typingName ? `<p class="typing">${escapeHtml(detail.typingName)} đang nhập...</p>` : ""}
    </div>
    <form class="composer ${state.note ? "is-note" : ""}" id="composer">
      <div class="composer-mode" aria-live="polite">${state.note ? "Khi bật “Ghi chú nội bộ” — khách không thấy" : "Trả lời khách (mặc định)"}</div>
      <div class="composer-tools">
        <select id="canned" aria-label="Mẫu trả lời nhanh" ${state.note ? "disabled" : ""}>
          <option value="">Mẫu trả lời nhanh</option>
          ${canned}
        </select>
        <label class="note-toggle"><input id="note-toggle" type="checkbox" ${state.note ? "checked" : ""}> Ghi chú nội bộ</label>
      </div>
      <textarea id="draft" placeholder="${state.note ? "Ghi chú cho agent khác, khách không thấy" : "Trả lời khách"}"></textarea>
      <div class="thread-actions">
        <button class="${state.note ? "btn-note" : "btn-primary"}" type="submit" id="composer-submit">${state.note ? "Lưu ghi chú" : "Gửi"}</button>
      </div>
    </form>`;
  const box = document.getElementById("messages");
  if (box) box.scrollTop = box.scrollHeight;
}

function applyNoteMode(on) {
  state.note = on;
  const form = document.getElementById("composer");
  const draft = document.getElementById("draft");
  const submit = document.getElementById("composer-submit");
  const mode = form?.querySelector(".composer-mode");
  const canned = document.getElementById("canned");
  if (!form || !draft || !submit) return;
  form.classList.toggle("is-note", on);
  draft.placeholder = on ? "Ghi chú cho agent khác, khách không thấy" : "Trả lời khách";
  submit.textContent = on ? "Lưu ghi chú" : "Gửi";
  submit.className = on ? "btn-note" : "btn-primary";
  if (mode) mode.textContent = on ? "Khi bật “Ghi chú nội bộ” — khách không thấy" : "Trả lời khách (mặc định)";
  if (canned) canned.disabled = on;
}

function renderProfile() {
  const customer = state.detail?.customer;
  if (!customer) {
    profileEl.innerHTML = `<h2>Hồ sơ khách</h2><p class="hint">Chọn hội thoại để xem hạng, chi nhánh và các ticket trước.</p>`;
    return;
  }
  const history = (customer.history || []).map((item) => `
    <li>
      <button type="button" data-id="${item.id}">
        <strong>${escapeHtml(item.code)}</strong> · ${escapeHtml(item.topicLabel)}
        <br><small>${escapeHtml(item.channelLabel)} · ${escapeHtml(item.statusLabel)}</small>
      </button>
    </li>`).join("");
  const order = customer.lastOrderId
    ? `${customer.lastOrderId.slice(0, 8).toUpperCase()} · ${vnd(customer.lastOrderAmount)}`
    : "Chưa có đơn đã giao";
  profileEl.innerHTML = `
    <h2>${escapeHtml(customer.fullName)}</h2>
    <div class="fact-grid">
      <div class="fact"><span>RFM</span><strong>${escapeHtml(customer.tierLabel || customer.tier || "Other")}</strong></div>
      <div class="fact"><span>Chi nhánh</span><strong>${escapeHtml(customer.branch)}</strong></div>
      <div class="fact"><span>Tổng chi tiêu</span><strong>${vnd(customer.totalSpend)}</strong></div>
      <div class="fact"><span>Số đơn</span><strong>${customer.totalOrders}</strong></div>
    </div>
    <div class="fact"><span>Đơn gần nhất</span><strong>${escapeHtml(order)}</strong></div>
    <h2>Ticket trước đây</h2>
    <ul class="history">${history || "<li class='hint'>Chưa có hội thoại khác.</li>"}</ul>`;
}

async function loadQueue() {
  const query = state.filter === "all" ? "" : `?filter=${state.filter}`;
  const body = await request(`/api/conversations${query}`);
  state.items = body.items || [];
  if (state.filter === "all") {
    state.catalog = state.items;
  } else {
    try {
      const all = await request("/api/conversations");
      state.catalog = all.items || [];
    } catch {
      state.catalog = state.items;
    }
  }
  renderQueue();
  entitySwitch.sync();
}

async function loadDetail(id) {
  state.selectedId = id;
  state.detail = await request(`/api/conversations/${id}`);
  renderQueue();
  renderThread();
  renderProfile();
  entitySwitch.sync();
}

async function refreshQuiet() {
  if (!state.login) return;
  const editing = threadPane.contains(document.activeElement);
  await loadQueue();
  if (editing || !state.selectedId) return;
  state.detail = await request(`/api/conversations/${state.selectedId}`);
  renderThread();
  renderProfile();
}

async function beat(online) {
  state.onShift = online;
  await request("/api/conversations/presence", {
    method: "POST",
    body: JSON.stringify({ online })
  });
}

async function boot() {
  renderRoles();
  if (!state.login) {
    showBanner("info", "Chọn CSKH, CRM Manager hoặc Admin để vào ca.");
    return;
  }
  try {
    await beat(true);
    const [agents, canned] = await Promise.all([
      request("/api/conversations/agents"),
      request("/api/conversations/canned")
    ]);
    state.agents = agents || [];
    state.canned = canned?.items || [];
    showBanner("", "");
    await loadQueue();
    if (!state.selectedId && state.items[0]) await loadDetail(state.items[0].id);
  } catch (error) {
    showBanner("err", error.message);
    queueEl.innerHTML = "";
  }
}

rolesEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-login]");
  if (!button) return;
  state.login = button.dataset.login;
  sessionStorage.setItem("crmLogin", state.login);
  state.selectedId = "";
  state.detail = null;
  await boot();
});

document.getElementById("filters").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.filter = button.dataset.filter;
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.classList.toggle("is-on", chip === button);
  });
  try {
    await loadQueue();
  } catch (error) {
    showBanner("err", error.message);
  }
});

queueEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  try {
    await loadDetail(button.dataset.id);
  } catch (error) {
    showBanner("err", error.message);
  }
});

profileEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  try {
    await loadDetail(button.dataset.id);
  } catch (error) {
    showBanner("err", error.message);
  }
});

threadPane.addEventListener("change", async (event) => {
  if (event.target.id === "canned" && event.target.value) {
    const draft = document.getElementById("draft");
    if (draft) draft.value = event.target.value;
    event.target.value = "";
  }
  if (event.target.id === "note-toggle") {
    applyNoteMode(event.target.checked);
  }
  if (event.target.id === "priority" && state.selectedId) {
    try {
      state.detail = await request(`/api/conversations/${state.selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({ priority: event.target.value })
      });
      await loadQueue();
      renderThread();
    } catch (error) {
      showBanner("err", error.message);
    }
  }
});

threadPane.addEventListener("input", () => {
  if (!state.selectedId || document.activeElement?.id !== "draft") return;
  request(`/api/conversations/${state.selectedId}/typing`, {
    method: "POST",
    body: JSON.stringify({ typing: true })
  }).catch(() => {});
});

threadPane.addEventListener("click", async (event) => {
  if (event.target.id === "to-live") {
    try {
      state.detail = await request(`/api/conversations/${state.selectedId}/live`, { method: "POST" });
      await loadQueue();
      renderThread();
      renderProfile();
    } catch (error) {
      showBanner("err", error.message);
    }
  }
  if (event.target.id === "resolve") {
    try {
      state.detail = await request(`/api/conversations/${state.selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "closed" })
      });
      await loadQueue();
      renderThread();
    } catch (error) {
      showBanner("err", error.message);
    }
  }
  if (event.target.id === "open-escalate") {
    const select = document.getElementById("escalate-target");
    select.innerHTML = state.agents
      .filter((agent) => agent.userId !== state.detail?.assigneeId)
      .map((agent) => `<option value="${agent.userId}">${escapeHtml(agent.fullName)} · ${escapeHtml(agent.roleLabel)}</option>`)
      .join("");
    openDialog(modalEl);
  }
});

threadPane.addEventListener("submit", async (event) => {
  if (event.target.id !== "composer") return;
  event.preventDefault();
  const draft = document.getElementById("draft");
  const content = draft?.value?.trim();
  if (!content) return;
  try {
    state.detail = await request(`/api/conversations/${state.selectedId}/messages`, {
      method: "POST",
      body: JSON.stringify({ kind: state.note ? "internal" : "public", content })
    });
    state.note = false;
    await loadQueue();
    renderThread();
    showBanner("ok", "Đã lưu. Tải lại trang vẫn còn nội dung.");
  } catch (error) {
    showBanner("err", error.message);
  }
});

document.getElementById("escalate-confirm").addEventListener("click", async () => {
  const employeeId = document.getElementById("escalate-target").value;
  try {
    state.detail = await request(`/api/conversations/${state.selectedId}/escalate`, {
      method: "POST",
      body: JSON.stringify({ employeeId })
    });
    closeDialog(modalEl);
    await loadQueue();
    renderThread();
    renderProfile();
    showBanner("ok", "Đã chuyển. Lịch sử gán vẫn còn nhân viên trước.");
  } catch (error) {
    showBanner("err", error.message);
  }
});

modalEl.addEventListener("click", (event) => {
  if (event.target.closest("[data-close]")) closeDialog(modalEl);
});

document.getElementById("leave-shift").addEventListener("click", async () => {
  try {
    await beat(false);
    showBanner("info", "Đã rời ca. Khách đang mở widget sẽ thấy chế độ ticket.");
  } catch (error) {
    showBanner("err", error.message);
  }
});

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

setInterval(() => {
  if (!state.login || !state.onShift) return;
  beat(true).catch(() => {});
  refreshQuiet().catch(() => {});
}, 4000);

boot();
