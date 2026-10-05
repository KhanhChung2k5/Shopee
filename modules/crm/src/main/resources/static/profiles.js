const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Tính lại hồ sơ được", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Tính lại hồ sơ được", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Xem và tính lại được", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Ngoài CRM — 403", initials: "KD" }
];

const STATUS_LABELS = {
  active: "Đang hoạt động",
  locked: "Đã khóa",
  deleted: "Đã xóa"
};

const SORT_LABELS = {
  desc: "LTV cao → thấp",
  asc: "LTV thấp → cao",
  none: "thứ tự danh sách"
};

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  rows: [],
  focusId: sessionStorage.getItem("crmProfileFocusId") || ""
};

const rowsEl = document.getElementById("rows");
const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");

const entitySwitch = createEntitySwitch({
  root: "#entity-switch",
  pinKey: "crmProfilePins",
  recentKey: "crmProfileRecent",
  labels: {
    noun: "hồ sơ",
    switchLabel: "Đổi hồ sơ",
    switchPlaceholder: "Tên, email hoặc SĐT…",
    searchLabel: "Tìm hồ sơ",
    paletteTitle: "Tìm hồ sơ CRM",
    palettePlaceholder: "Tên, email, SĐT, RFM hoặc trạng thái",
    emptyTitle: "Không có hồ sơ khớp.",
    emptyHint: "Thử tên (ưu tiên tên gọi), email hoặc số điện thoại."
  },
  getItems: () => state.rows.map((row) => ({
    id: row.customer.id,
    title: row.customer.fullName || "Chưa đặt tên",
    subtitle: [row.customer.email, row.customer.phone, `RFM ${row.profile.rfmSegment || "other"}`, `LTV ${formatLtv(row.profile.ltv)}`]
      .filter(Boolean)
      .join(" · "),
    email: row.customer.email || "",
    phone: row.customer.phone || "",
    badge: {
      label: STATUS_LABELS[row.customer.status] || row.customer.status,
      tone: row.customer.status === "active" ? "active" : row.customer.status === "locked" ? "locked" : "scheduled"
    },
    searchText: `${row.customer.fullName} ${row.customer.email || ""} ${row.customer.phone || ""} ${row.profile.rfmSegment || ""} ${row.customer.status || ""}`,
    sortAt: row.profile.calculatedAt || row.profile.lastPurchaseAt
  })),
  getSelectedId: () => state.focusId,
  isEnabled: () => Boolean(state.login),
  onSelect: (id) => {
    state.focusId = id;
    sessionStorage.setItem("crmProfileFocusId", id);
    renderFiltered();
    const card = rowsEl.querySelector(`[data-profile-id="${id}"]`);
    if (card) {
      card.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setTimeout(() => card.classList.remove("is-focus"), 1600);
    }
    entitySwitch.sync();
  }
});

function authHeader() {
  if (!state.login) {
    return {};
  }
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
    const message = body?.error?.message || `Lỗi HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

function currentRole() {
  return ROLES.find((role) => role.login === state.login);
}

function avatarFor(name) {
  const palette = ["#1d4ed8", "#2563eb", "#1e40af", "#3b82f6", "#1e3a8a", "#0369a1"];
  let hash = 0;
  for (const char of String(name)) {
    hash = (hash + char.charCodeAt(0)) % palette.length;
  }
  return palette[hash];
}

function syncWho() {
  const role = currentRole();
  const avatar = document.querySelector(".who-avatar");
  if (role) {
    whoEl.textContent = `Đang thử với ${role.label} (${role.login})`;
    avatar.textContent = role.initials;
  } else {
    whoEl.textContent = "Chưa chọn tài khoản";
    avatar.textContent = "?";
  }
}

function renderRoles() {
  rolesEl.innerHTML = "";
  ROLES.forEach((role) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = role.login === state.login ? "active" : "";
    button.innerHTML = `<span class="actor-dot" style="background:${avatarFor(role.login)}">${role.initials}</span><span><strong>${role.label}</strong><small>${role.login} / ${role.login}</small></span>`;
    button.addEventListener("click", () => {
      state.login = role.login;
      sessionStorage.setItem("crmLogin", role.login);
      syncWho();
      renderRoles();
      loadProfiles();
    });
    rolesEl.appendChild(button);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Nghìn → K, triệu → M. Hai chữ số thập phân, làm tròn xuống. */
function formatLtv(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "0.00";
  }
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const divisor = abs >= 1_000_000 ? 1_000_000 : abs >= 1_000 ? 1_000 : 1;
  const suffix = divisor === 1_000_000 ? "M" : divisor === 1_000 ? "K" : "";
  const whole = Math.floor(abs / divisor);
  const fraction = Math.floor((abs % divisor) * 100 / divisor);
  return `${sign}${whole}.${String(fraction).padStart(2, "0")}${suffix}`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function selectedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

const KNOWN_RFM = new Set(["champions", "loyal", "potential", "at_risk", "lost", "other"]);
const RFM_FIVE = ["champions", "loyal", "potential", "at_risk", "lost"];

function filterLabel(raw) {
  const label = raw || "lost";
  return KNOWN_RFM.has(label) ? label : "other";
}

function visibleRows() {
  const rfm = new Set(selectedValues("rfm"));
  const statuses = new Set(selectedValues("status"));
  const sort = document.getElementById("ltv-sort").value;
  const rows = state.rows.filter((row) => {
    return rfm.has(filterLabel(row.profile.rfmSegment)) && statuses.has(row.customer.status);
  });
  if (sort === "none") {
    return rows;
  }
  const direction = sort === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const delta = Number(left.profile.ltv || 0) - Number(right.profile.ltv || 0);
    if (delta !== 0) {
      return delta * direction;
    }
    return left.customer.fullName.localeCompare(right.customer.fullName, "vi");
  });
}

function updateRfmCards() {
  const counts = Object.fromEntries(RFM_FIVE.map((key) => [key, 0]));
  for (const row of state.rows) {
    const label = filterLabel(row.profile.rfmSegment);
    if (counts[label] != null) {
      counts[label] += 1;
    }
  }
  const checked = selectedValues("rfm");
  const exclusive = checked.length === 1 ? checked[0] : "";
  for (const key of RFM_FIVE) {
    document.getElementById(`rfm-count-${key}`).textContent = counts[key];
    const card = document.querySelector(`#profile-kpis [data-rfm="${key}"]`);
    const selected = exclusive === key;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  }
}

function applyRfmCard(label) {
  const inputs = [...document.querySelectorAll('input[name="rfm"]')];
  const onlyThis = inputs.every((input) => (input.value === label) === input.checked);
  inputs.forEach((input) => {
    input.checked = onlyThis ? true : input.value === label;
  });
  renderFiltered();
}

function renderFiltered() {
  updateRfmCards();
  const rows = visibleRows();
  const sort = document.getElementById("ltv-sort").value;
  metaEl.textContent = state.rows.length
    ? `${rows.length} / ${state.rows.length} hồ sơ · ${SORT_LABELS[sort]}`
    : "Chọn tài khoản, rồi tính lại hồ sơ từ đơn đã giao.";
  if (!state.rows.length) {
    rowsEl.innerHTML = `<div class="empty"><strong>Chưa có khách.</strong></div>`;
    return;
  }
  if (!rows.length) {
    rowsEl.innerHTML = `<div class="empty"><strong>Không có hồ sơ khớp bộ lọc.</strong>Chọn thêm nhãn RFM hoặc trạng thái.</div>`;
    return;
  }
  renderProfiles(rows);
}

function renderProfiles(rows) {
  rowsEl.innerHTML = rows.map((row) => {
    const isStale = !row.profile.calculatedAt;
    const calculated = isStale
      ? "Chưa tính lại"
      : `Đã tính ${formatDate(row.profile.calculatedAt)}`;
    const calcClass = isStale ? "profile-calc is-stale" : "profile-calc is-done";
    const focus = row.customer.id === state.focusId ? " is-focus" : "";
    return `
      <article class="report-card${focus}" data-profile-id="${escapeHtml(row.customer.id)}">
        <h2>${escapeHtml(row.customer.fullName)}</h2>
        <p class="hint profile-status-line">
          <span class="badge ${escapeHtml(row.customer.status)}">${escapeHtml(STATUS_LABELS[row.customer.status] || row.customer.status)}</span>
          <span class="${calcClass}">· ${escapeHtml(calculated)}</span>
        </p>
        <dl class="profile-metrics">
          <div><dt>LTV</dt><dd>${escapeHtml(formatLtv(row.profile.ltv))}</dd></div>
          <div><dt>Số đơn đã giao</dt><dd>${escapeHtml(row.profile.totalOrders)}</dd></div>
          <div><dt>RFM</dt><dd>${escapeHtml(row.profile.rfmSegment)}</dd></div>
          <div><dt>Mua gần nhất</dt><dd>${escapeHtml(formatDate(row.profile.lastPurchaseAt))}</dd></div>
        </dl>
        <div class="segment-actions">
          <button class="btn-ghost" type="button" data-recalculate="${escapeHtml(row.customer.id)}">Tính lại</button>
        </div>
      </article>`;
  }).join("");
}

async function loadProfiles(banner) {
  if (!state.login) {
    state.rows = [];
    entitySwitch.sync();
    rowsEl.innerHTML = `<div class="empty"><strong>Chọn tài khoản để xem hồ sơ.</strong>Dùng khung đăng nhập giả lập bên trái.</div>`;
    metaEl.textContent = "Chọn tài khoản, rồi tính lại hồ sơ từ đơn đã giao.";
    updateRfmCards();
    return;
  }
  try {
    const list = await request("/api/customers?includeDeleted=true&pageSize=100");
    const rows = [];
    for (const customer of list.data || []) {
      const profile = await request(`/api/crm/profiles/${customer.id}`);
      rows.push({ customer, profile });
    }
    state.rows = rows;
    renderFiltered();
    entitySwitch.sync();
    if (banner) {
      showBanner(banner.type, banner.message);
    } else {
      showBanner("ok", `Sẵn sàng  |  ${rows.length} hồ sơ`);
    }
  } catch (error) {
    state.rows = [];
    entitySwitch.sync();
    rowsEl.innerHTML = `<div class="empty"><strong>${escapeHtml(error.message)}</strong></div>`;
    metaEl.textContent = error.message;
    updateRfmCards();
    showBanner("err", error.message);
  }
}

async function recalculateOne(userId) {
  const profile = await request(`/api/crm/profiles/${userId}/recalculate`, { method: "POST" });
  await loadProfiles({
    type: "ok",
    message: `${profile.fullName}: ${profile.totalOrders} đơn · ltv ${formatLtv(profile.ltv)} · ${profile.rfmSegment}`
  });
}

async function recalculateAll() {
  if (!state.login) {
    showBanner("err", "Hãy chọn tài khoản trước.");
    return;
  }
  if (!state.rows.length) {
    await loadProfiles();
  }
  if (!state.rows.length) {
    return;
  }
  const total = state.rows.length;
  let last = null;
  for (const row of state.rows) {
    last = await request(`/api/crm/profiles/${row.customer.id}/recalculate`, { method: "POST" });
  }
  await loadProfiles({
    type: "ok",
    message: `Đã tính lại ${total} hồ sơ. Gần nhất: ${last.fullName} · ${last.totalOrders} đơn`
  });
}

document.getElementById("recalculate-all").addEventListener("click", async () => {
  try {
    await recalculateAll();
  } catch (error) {
    showBanner("err", error.message);
  }
});

rowsEl.addEventListener("click", async (event) => {
  const userId = event.target.closest("[data-recalculate]")?.dataset.recalculate;
  if (!userId) {
    return;
  }
  try {
    await recalculateOne(userId);
  } catch (error) {
    showBanner("err", error.message);
  }
});

document.getElementById("profile-kpis").addEventListener("click", (event) => {
  const card = event.target.closest("[data-rfm]");
  if (!card || !state.login) {
    return;
  }
  applyRfmCard(card.dataset.rfm);
});

document.querySelector(".profile-filters").addEventListener("change", () => {
  if (state.login && state.rows.length) {
    renderFiltered();
  }
});

document.getElementById("reload").addEventListener("click", () => loadProfiles());
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

renderRoles();
syncWho();
loadProfiles();
