const CUSTOMERS = [
  { login: "an", label: "Nguyễn Văn An", initials: "AN" },
  { login: "binh", label: "Trần Thị Bình", initials: "TB" },
  { login: "linh", label: "Đặng Mỹ Linh", initials: "ML" },
  { login: "dung", label: "Phạm Quốc Dũng", initials: "QD" }
];

const state = {
  login: sessionStorage.getItem("crmCustomerLogin") || "an",
  conversationId: "",
  detail: null,
  agentOnline: false
};

const accountsEl = document.getElementById("accounts");
const headEl = document.getElementById("widget-head");
const threadEl = document.getElementById("thread");
const bannerEl = document.getElementById("banner");

function authHeader() {
  return { Authorization: "Basic " + btoa(`${state.login}:${state.login}`) };
}

function showBanner(type, message) {
  bannerEl.hidden = !message;
  bannerEl.className = `attention ${type}`;
  bannerEl.textContent = message || "";
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
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(body?.error?.message || `Lỗi HTTP ${response.status}`);
  }
  return body;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

function renderAccounts() {
  accountsEl.innerHTML = CUSTOMERS.map((customer) => `
    <button type="button" class="btn-ghost ${customer.login === state.login ? "is-on" : ""}" data-login="${customer.login}">
      ${customer.initials} ${customer.label}
    </button>`).join("");
}

function renderHead() {
  const detail = state.detail;
  const live = detail ? detail.mode === "live" : state.agentOnline;
  if (live) {
    headEl.innerHTML = `
      <span class="avatar-live">CS<span class="dot"></span></span>
      <span><strong>Chợ Tốt Mua</strong><small>Đang trực tuyến</small></span>`;
    return;
  }
  const code = detail?.code ? ` · ${detail.code}` : "";
  const expect = detail?.slaDueAt
    ? `<small>Dự kiến phản hồi trước ${formatWhen(detail.slaDueAt)}</small>`
    : `<small>Tin nhắn được ghi nhận, nhân viên sẽ trả lời</small>`;
  headEl.innerHTML = `
    <span>
      <span class="pill wait">Đang chờ xử lý${escapeHtml(code)}</span>
      ${expect}
    </span>`;
}

function renderThread() {
  const detail = state.detail;
  if (!detail) {
    threadEl.innerHTML = `<p class="empty-thread">Xin chào. Nhắn nội dung cần hỗ trợ, shop sẽ nhận ngay.</p>`;
    return;
  }
  const items = detail.messages || [];
  const messages = items.map((message, index) => {
    if (message.side === "system") {
      return `<div class="divider">${escapeHtml(message.content)}</div>`;
    }
    const side = message.side === "agent" ? "agent" : message.side === "bot" ? "bot" : "customer";
    const prev = items[index - 1];
    const next = items[index + 1];
    const continueFromPrev = isSameMessageGroup(prev, message);
    const continueToNext = isSameMessageGroup(message, next);
    const dayChanged = !prev || prev.side === "system" || !sameCalendarDay(prev.sentAt, message.sentAt);
    const dayDivider = !continueFromPrev && dayChanged
      ? `<div class="divider time-divider">${escapeHtml(formatDayDivider(message.sentAt))}</div>`
      : "";
    const author = message.side === "agent"
      ? [message.senderName, message.senderRole].filter(Boolean).join(" · ")
      : message.side === "bot"
        ? "Trợ lý ảo"
        : "";
    const authorHtml = !continueFromPrev && author
      ? `<p class="meta">${escapeHtml(author)}</p>`
      : "";
    const timeHtml = !continueToNext
      ? `<time class="msg-time" datetime="${escapeHtml(message.sentAt || "")}">${escapeHtml(formatMsgTime(message.sentAt))}</time>`
      : "";
    return `${dayDivider}
      <div class="msg ${side}${continueFromPrev ? " is-grouped" : ""}">
        <article class="bubble ${side}">
          ${authorHtml}
          <p>${escapeHtml(message.content)}</p>
        </article>
        ${timeHtml}
      </div>`;
  }).join("");
  const typing = detail.typingName ? `<p class="typing">${escapeHtml(detail.typingName)} đang nhập...</p>` : "";
  const csat = detail.status === "closed" && detail.csatScore == null
    ? `<div class="csat"><strong>Bạn hài lòng mức nào?</strong><div class="stars">${[1, 2, 3, 4, 5].map((score) => `<button type="button" data-score="${score}">${score}</button>`).join("")}</div></div>`
    : detail.csatScore
      ? `<div class="divider">Bạn đã đánh giá ${detail.csatScore}/5</div>`
      : "";
  threadEl.innerHTML = messages + typing + csat;
  threadEl.scrollTop = threadEl.scrollHeight;
}

async function resume() {
  const presence = await request("/api/conversations/presence");
  state.agentOnline = Boolean(presence.agentOnline);
  const list = await request("/api/conversations");
  const items = list.items || [];
  const current = items.find((item) => item.id === state.conversationId);
  if (!current) {
    const open = items.find((item) => item.status !== "closed");
    state.conversationId = (open || items[0] || {}).id || "";
  }
  state.detail = state.conversationId ? await request(`/api/conversations/${state.conversationId}`) : null;
  state.agentOnline = state.detail ? state.detail.agentOnline : state.agentOnline;
  renderHead();
  renderThread();
}

accountsEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-login]");
  if (!button) return;
  state.login = button.dataset.login;
  sessionStorage.setItem("crmCustomerLogin", state.login);
  renderAccounts();
  try {
    await resume();
    showBanner("", "");
  } catch (error) {
    showBanner("err", error.message);
  }
});

document.getElementById("composer").addEventListener("submit", async (event) => {
  event.preventDefault();
  const draft = document.getElementById("draft");
  const content = draft.value.trim();
  if (!content) return;
  try {
    if (!state.conversationId || state.detail?.status === "closed") {
      state.detail = await request("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ content, topic: "khieu_nai" })
      });
      state.conversationId = state.detail.id;
    } else {
      state.detail = await request(`/api/conversations/${state.conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content })
      });
    }
    draft.value = "";
    renderHead();
    renderThread();
    showBanner("ok", "Đã gửi. Tải lại trang vẫn còn tin nhắn.");
  } catch (error) {
    showBanner("err", error.message);
  }
});

document.getElementById("draft").addEventListener("input", () => {
  if (!state.conversationId || state.detail?.mode !== "live") return;
  request(`/api/conversations/${state.conversationId}/typing`, {
    method: "POST",
    body: JSON.stringify({ typing: true })
  }).catch(() => {});
});

threadEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-score]");
  if (!button || !state.conversationId) return;
  try {
    state.detail = await request(`/api/conversations/${state.conversationId}/csat`, {
      method: "POST",
      body: JSON.stringify({ score: Number(button.dataset.score) })
    });
    renderThread();
  } catch (error) {
    showBanner("err", error.message);
  }
});

setInterval(() => {
  resume().catch(() => {});
}, 3000);

renderAccounts();
resume().catch((error) => showBanner("err", error.message));
