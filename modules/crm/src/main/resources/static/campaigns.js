const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Gửi chiến dịch được", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Gửi chiến dịch được", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Gửi chiến dịch được", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Ngoài CRM — 403", initials: "KD" }
];

const STATUS_LABEL = {
  sent: "Đã gửi",
  scheduled: "Đã lên lịch"
};

const ICONS = {
  all: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  sent: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  scheduled: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  reach: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2m-8 0v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7"/></svg>'
};

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  status: "",
  search: "",
  sort: "newest",
  campaigns: [],
  segments: [],
  selected: new Set(),
  focusId: sessionStorage.getItem("crmCampaignFocusId") || ""
};

const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");
const rowsEl = document.getElementById("campaign-rows");
const kpisEl = document.getElementById("campaign-kpis");
const bulkEl = document.getElementById("campaign-bulk");
const bulkLabelEl = document.getElementById("campaign-bulk-label");
const confirmModal = document.getElementById("confirm-modal");
const confirmTitleEl = document.getElementById("confirm-title");
const confirmTextEl = document.getElementById("confirm-text");

let pendingDelete = [];

const entitySwitch = createEntitySwitch({
  root: "#entity-switch",
  pinKey: "crmCampaignPins",
  recentKey: "crmCampaignRecent",
  labels: {
    noun: "chiến dịch",
    switchLabel: "Đổi chiến dịch",
    switchPlaceholder: "Gõ tên chiến dịch…",
    searchLabel: "Tìm chiến dịch",
    paletteTitle: "Tìm chiến dịch",
    palettePlaceholder: "Tên, nội dung hoặc trạng thái",
    emptyTitle: "Không có chiến dịch khớp.",
    emptyHint: "Thử một phần tên chiến dịch."
  },
  getItems: () => state.campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.name || "Chưa đặt tên",
    subtitle: campaign.content || "",
    badge: {
      label: STATUS_LABEL[campaign.deliveryStatus] || campaign.deliveryStatus || "Đã gửi",
      tone: campaign.deliveryStatus === "scheduled" ? "scheduled" : "active"
    },
    searchText: `${campaign.name} ${campaign.content || ""}`,
    sortAt: campaign.startAt || campaign.createdAt
  })),
  getSelectedId: () => state.focusId,
  isEnabled: () => Boolean(state.login),
  onSelect: (id) => {
    state.focusId = id;
    sessionStorage.setItem("crmCampaignFocusId", id);
    location.href = `/campaign-edit.html?id=${encodeURIComponent(id)}`;
  }
});

function authHeader() {
  if (!state.login) {
    return {};
  }
  return { Authorization: "Basic " + btoa(`${state.login}:${state.login}`) };
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
  if (response.status === 204) {
    return null;
  }
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
      state.selected.clear();
      sessionStorage.setItem("crmLogin", role.login);
      syncWho();
      renderRoles();
      loadCampaigns();
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

function formatDate(value) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function audienceLabel(campaign) {
  const ids = campaign.segmentIds || [];
  if (ids.length === 1) {
    const found = state.segments.find((segment) => segment.id === ids[0]);
    return found ? found.name : "1 phân khúc";
  }
  return `${ids.length} phân khúc`;
}

function visibleCampaigns() {
  const query = state.search.trim().toLowerCase();
  const items = state.campaigns.filter((campaign) => {
    const status = campaign.deliveryStatus || "sent";
    if (state.status && status !== state.status) {
      return false;
    }
    if (!query) {
      return true;
    }
    return `${campaign.name} ${campaign.content || ""} ${audienceLabel(campaign)}`.toLowerCase().includes(query);
  });
  items.sort((left, right) => {
    if (state.sort === "name") {
      return String(left.name).localeCompare(String(right.name), "vi");
    }
    const delta = new Date(left.startAt || 0) - new Date(right.startAt || 0);
    return state.sort === "oldest" ? delta : -delta;
  });
  return items;
}

function renderKpis() {
  const counts = { all: state.campaigns.length, sent: 0, scheduled: 0, reach: 0 };
  state.campaigns.forEach((campaign) => {
    const status = campaign.deliveryStatus || "sent";
    if (counts[status] != null) {
      counts[status] += 1;
    }
    if (status === "sent") {
      counts.reach += campaign.sentCount || 0;
    }
  });
  const cards = [
    ["all", "", "Tất cả", counts.all],
    ["sent", "is-ok", "Đã gửi", counts.sent],
    ["scheduled", "is-warn", "Đã lên lịch", counts.scheduled],
    ["reach", "is-loyal", "Người nhận", counts.reach]
  ];
  kpisEl.innerHTML = cards.map(([key, tone, label, value]) => `
    <article class="kpi-card ${tone}">
      <span class="kpi-icon">${ICONS[key]}</span>
      <span class="kpi-copy"><span>${label}</span><strong>${value}</strong></span>
    </article>
  `).join("");
}

function renderRows() {
  const items = visibleCampaigns();
  syncBulk();
  if (!state.login) {
    rowsEl.innerHTML = `<div class="empty"><strong>Chọn tài khoản để xem chiến dịch.</strong>Dùng khung đăng nhập giả lập bên trái.</div>`;
    return;
  }
  if (!items.length) {
    rowsEl.innerHTML = `<div class="empty"><strong>Không có chiến dịch nào khớp bộ lọc.</strong><a href="/campaign-edit.html">Tạo chiến dịch mới</a></div>`;
    return;
  }
  rowsEl.innerHTML = items.map((campaign) => {
    const status = campaign.deliveryStatus || "sent";
    const checked = state.selected.has(campaign.id) ? "checked" : "";
    const reach = status === "scheduled" ? "Chờ gửi" : `${campaign.sentCount || 0} khách`;
    return `
      <article class="survey-row${campaign.id === state.focusId ? " is-focus" : ""}" data-campaign-id="${campaign.id}">
        <label class="survey-check">
          <input type="checkbox" data-select="${campaign.id}" ${checked} aria-label="Chọn ${escapeHtml(campaign.name)}">
        </label>
        <a class="survey-row-main" href="/campaign-edit.html?id=${encodeURIComponent(campaign.id)}">
          <strong>${escapeHtml(campaign.name || "Chưa đặt tên")}</strong>
          <span>${escapeHtml(campaign.content || "Chưa có nội dung")}</span>
        </a>
        <span class="badge ${status === "sent" ? "active" : "scheduled"}">${ICONS[status] || ""}${STATUS_LABEL[status] || status}</span>
        <span class="survey-row-meta">${escapeHtml(audienceLabel(campaign))} · ${reach} · ${formatDate(campaign.startAt)}</span>
        <div class="survey-row-actions">
          <button class="icon-btn icon-danger" type="button" data-delete="${campaign.id}" aria-label="Xóa ${escapeHtml(campaign.name)}">${ICONS.trash}</button>
        </div>
      </article>
    `;
  }).join("");
  rowsEl.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const campaign = state.campaigns.find((item) => item.id === button.dataset.delete);
      askDelete([{ id: button.dataset.delete, name: campaign?.name || "chiến dịch này" }]);
    });
  });
  rowsEl.querySelectorAll("[data-select]").forEach((box) => {
    box.addEventListener("change", () => {
      if (box.checked) {
        state.selected.add(box.dataset.select);
      } else {
        state.selected.delete(box.dataset.select);
      }
      syncBulk();
    });
  });
}

function syncBulk() {
  const count = state.selected.size;
  bulkEl.hidden = count === 0;
  bulkLabelEl.textContent = `Đã chọn ${count} chiến dịch. Xóa sẽ hỏi lại trước.`;
}

function openDialog(el) {
  el.hidden = false;
  el.classList.add("is-open");
}

function closeDialog(el) {
  el.hidden = true;
  el.classList.remove("is-open");
}

function askDelete(targets) {
  if (!targets.length) {
    return;
  }
  pendingDelete = targets;
  if (targets.length === 1) {
    confirmTitleEl.textContent = "Xóa chiến dịch?";
    confirmTextEl.textContent = `Xóa « ${targets[0].name} »? Thư đã gửi cho khách cũng mất.`;
  } else {
    confirmTitleEl.textContent = "Xóa các chiến dịch đã chọn?";
    confirmTextEl.textContent = `Xóa ${targets.length} chiến dịch? Thư đã gửi cho khách cũng mất.`;
  }
  openDialog(confirmModal);
}

async function loadCampaigns() {
  if (!state.login) {
    state.campaigns = [];
    state.segments = [];
    metaEl.textContent = "Chọn tài khoản bên trái để xem danh sách chiến dịch.";
    renderKpis();
    renderRows();
    entitySwitch.sync();
    return;
  }
  try {
    const [campaigns, segments] = await Promise.all([
      request("/api/campaigns"),
      request("/api/segments")
    ]);
    state.campaigns = campaigns.campaigns || [];
    state.segments = segments.segments || [];
    const known = new Set(state.campaigns.map((campaign) => campaign.id));
    state.selected.forEach((id) => {
      if (!known.has(id)) {
        state.selected.delete(id);
      }
    });
    metaEl.textContent = `${state.campaigns.length} chiến dịch. Mở một dòng để sửa, hoặc tạo chiến dịch mới.`;
    renderKpis();
    renderRows();
    entitySwitch.sync();
  } catch (error) {
    state.campaigns = [];
    metaEl.textContent = error.message;
    kpisEl.innerHTML = "";
    rowsEl.innerHTML = `<div class="empty"><strong>${escapeHtml(error.message)}</strong></div>`;
    syncBulk();
    entitySwitch.sync();
  }
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    state.status = chip.dataset.status;
    document.querySelectorAll(".chip").forEach((item) => {
      const active = item === chip;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    renderRows();
  });
});

document.getElementById("campaign-sort").addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderRows();
});

document.getElementById("campaign-bulk-delete").addEventListener("click", () => {
  const targets = state.campaigns
    .filter((campaign) => state.selected.has(campaign.id))
    .map((campaign) => ({ id: campaign.id, name: campaign.name || "chiến dịch này" }));
  askDelete(targets);
});

confirmModal.querySelectorAll("[data-close-confirm]").forEach((el) => {
  el.addEventListener("click", () => {
    pendingDelete = [];
    closeDialog(confirmModal);
  });
});

document.getElementById("confirm-delete").addEventListener("click", async () => {
  const targets = pendingDelete;
  pendingDelete = [];
  closeDialog(confirmModal);
  if (!targets.length) {
    return;
  }
  const errors = [];
  for (const campaign of targets) {
    try {
      await request(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
      state.selected.delete(campaign.id);
    } catch (error) {
      errors.push(error.message);
    }
  }
  await loadCampaigns();
  if (errors.length) {
    metaEl.textContent = errors[0];
    return;
  }
  metaEl.textContent = targets.length === 1
    ? `Đã xóa « ${targets[0].name} ».`
    : `Đã xóa ${targets.length} chiến dịch.`;
});

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

document.getElementById("reload").addEventListener("click", loadCampaigns);
syncWho();
renderRoles();
loadCampaigns();
