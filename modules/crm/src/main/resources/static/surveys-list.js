const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Tạo khảo sát được", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Tạo khảo sát được", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Tạo khảo sát được", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Ngoài CRM — 403", initials: "KD" }
];

const STATUS_LABEL = {
  draft: "Nháp",
  sent: "Đã gửi",
  closed: "Lưu trữ"
};

const ICONS = {
  all: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  draft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  sent: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  closed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M3 4h18v4H3z"/><path d="M10 12h4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2m-8 0v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M8 17V9m4 8V7m4 10v-6"/></svg>'
};

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  status: "",
  search: "",
  sort: "newest",
  surveys: [],
  selected: new Set(),
  focusId: sessionStorage.getItem("crmSurveyFocusId") || ""
};

const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");
const rowsEl = document.getElementById("survey-rows");
const kpisEl = document.getElementById("survey-kpis");
const bulkEl = document.getElementById("survey-bulk");
const bulkLabelEl = document.getElementById("survey-bulk-label");
const confirmModal = document.getElementById("confirm-modal");
const confirmTitleEl = document.getElementById("confirm-title");
const confirmTextEl = document.getElementById("confirm-text");

let pendingDelete = [];

const entitySwitch = createEntitySwitch({
  root: "#entity-switch",
  pinKey: "crmSurveyListPins",
  recentKey: "crmSurveyListRecent",
  labels: {
    noun: "phiếu",
    switchLabel: "Đổi phiếu",
    switchPlaceholder: "Gõ tên phiếu…",
    searchLabel: "Tìm phiếu",
    paletteTitle: "Tìm khảo sát",
    palettePlaceholder: "Tên, mô tả hoặc trạng thái",
    emptyTitle: "Không có phiếu khớp.",
    emptyHint: "Thử một phần tên phiếu."
  },
  getItems: () => state.surveys.map((survey) => ({
    id: survey.id,
    title: survey.title || "Chưa đặt tên",
    subtitle: survey.description || "",
    badge: {
      label: STATUS_LABEL[survey.status] || survey.status,
      tone: survey.status === "sent" ? "active" : survey.status === "closed" ? "locked" : "scheduled"
    },
    searchText: `${survey.title} ${survey.description || ""} ${STATUS_LABEL[survey.status] || ""}`,
    sortAt: survey.createdAt
  })),
  getSelectedId: () => state.focusId,
  isEnabled: () => Boolean(state.login),
  onSelect: (id) => {
    state.focusId = id;
    sessionStorage.setItem("crmSurveyFocusId", id);
    location.href = `/survey-edit.html?id=${encodeURIComponent(id)}`;
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
      loadSurveys();
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

function visibleSurveys() {
  const query = state.search.trim().toLowerCase();
  const items = state.surveys.filter((survey) => {
    if (state.status && survey.status !== state.status) {
      return false;
    }
    if (!query) {
      return true;
    }
    return `${survey.title} ${survey.description || ""}`.toLowerCase().includes(query);
  });
  items.sort((left, right) => {
    if (state.sort === "title") {
      return String(left.title).localeCompare(String(right.title), "vi");
    }
    const delta = new Date(left.createdAt || 0) - new Date(right.createdAt || 0);
    return state.sort === "oldest" ? delta : -delta;
  });
  return items;
}

function renderKpis() {
  const counts = { all: state.surveys.length, draft: 0, sent: 0, closed: 0 };
  state.surveys.forEach((survey) => {
    if (counts[survey.status] != null) {
      counts[survey.status] += 1;
    }
  });
  const cards = [
    ["all", "", "Tất cả", counts.all],
    ["draft", "is-warn", "Nháp", counts.draft],
    ["sent", "is-ok", "Đã gửi", counts.sent],
    ["closed", "is-muted", "Lưu trữ", counts.closed]
  ];
  kpisEl.innerHTML = cards.map(([key, tone, label, value]) => `
    <article class="kpi-card ${tone}">
      <span class="kpi-icon">${ICONS[key]}</span>
      <span class="kpi-copy"><span>${label}</span><strong>${value}</strong></span>
    </article>
  `).join("");
}

function renderRows() {
  const items = visibleSurveys();
  syncBulk();
  if (!state.login) {
    rowsEl.innerHTML = `<div class="empty"><strong>Chọn tài khoản để xem khảo sát.</strong>Dùng khung đăng nhập giả lập bên trái.</div>`;
    return;
  }
  if (!items.length) {
    rowsEl.innerHTML = `<div class="empty"><strong>Không có phiếu nào khớp bộ lọc.</strong><a href="/survey-edit.html">Tạo khảo sát mới</a></div>`;
    return;
  }
  rowsEl.innerHTML = items.map((survey) => {
    const status = survey.status || "draft";
    const questions = survey.questions?.length || 0;
    const checked = state.selected.has(survey.id) ? "checked" : "";
    return `
      <article class="survey-row${survey.id === state.focusId ? " is-focus" : ""}" data-survey-id="${survey.id}">
        <label class="survey-check">
          <input type="checkbox" data-select="${survey.id}" ${checked} aria-label="Chọn ${escapeHtml(survey.title)}">
        </label>
        <a class="survey-row-main" href="/survey-edit.html?id=${encodeURIComponent(survey.id)}">
          <strong>${escapeHtml(survey.title || "Chưa đặt tên")}</strong>
          <span>${escapeHtml(survey.description || "Chưa có mô tả")}</span>
        </a>
        <span class="badge ${status === "sent" ? "active" : "locked"}">${ICONS[status] || ""}${STATUS_LABEL[status] || status}</span>
        <span class="survey-row-meta">${questions} câu · ${formatDate(survey.createdAt)}</span>
        <div class="survey-row-actions">
          <a class="survey-stats-link" href="/reports-surveys.html?id=${encodeURIComponent(survey.id)}" aria-label="Xem thống kê ${escapeHtml(survey.title || "phiếu này")}">${ICONS.chart}<span>Xem thống kê</span></a>
          ${status === "closed" ? "" : `<button class="icon-btn" type="button" data-archive="${survey.id}" aria-label="Lưu trữ ${escapeHtml(survey.title)}">${ICONS.closed}</button>`}
          ${status === "closed" ? "" : `<button class="icon-btn icon-danger" type="button" data-delete="${survey.id}" data-status="${status}" aria-label="Xóa ${escapeHtml(survey.title)}">${ICONS.trash}</button>`}
        </div>
      </article>
    `;
  }).join("");
  rowsEl.querySelectorAll("[data-archive]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await request(`/api/surveys/${button.dataset.archive}/archive`, { method: "POST" });
        await loadSurveys();
      } catch (error) {
        metaEl.textContent = error.message;
        button.disabled = false;
      }
    });
  });
  rowsEl.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const survey = state.surveys.find((item) => item.id === button.dataset.delete);
      askDelete([{
        id: button.dataset.delete,
        title: survey?.title || "phiếu này",
        status: button.dataset.status || survey?.status || "draft"
      }]);
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
  bulkLabelEl.textContent = `Đã chọn ${count} phiếu. Lưu trữ giữ phiếu. Xóa sẽ hỏi lại trước.`;
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
    metaEl.textContent = "Không có phiếu nào xóa được. Phiếu lưu trữ được giữ lại.";
    return;
  }
  pendingDelete = targets;
  if (targets.length === 1) {
    const target = targets[0];
    confirmTitleEl.textContent = "Xóa khảo sát?";
    const inbox = target.status === "sent" ? " Thư trong hòm thư khách cũng mất." : "";
    confirmTextEl.textContent = `Xóa « ${target.title} »? Phiếu và các câu hỏi sẽ mất.${inbox}`;
  } else {
    confirmTitleEl.textContent = "Xóa các khảo sát đã chọn?";
    confirmTextEl.textContent = `Xóa ${targets.length} phiếu? Phiếu lưu trữ được giữ lại. Thư của phiếu đã gửi cũng mất.`;
  }
  openDialog(confirmModal);
}

async function loadSurveys() {
  if (!state.login) {
    state.surveys = [];
    metaEl.textContent = "Chọn tài khoản bên trái để xem danh sách phiếu.";
    renderKpis();
    renderRows();
    entitySwitch.sync();
    return;
  }
  try {
    const body = await request("/api/surveys");
    state.surveys = body.surveys || [];
    const known = new Set(state.surveys.map((survey) => survey.id));
    state.selected.forEach((id) => {
      if (!known.has(id)) {
        state.selected.delete(id);
      }
    });
    metaEl.textContent = `${state.surveys.length} phiếu. Soạn một dòng, hoặc chọn Xem thống kê.`;
    renderKpis();
    renderRows();
    entitySwitch.sync();
  } catch (error) {
    state.surveys = [];
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

document.getElementById("survey-sort").addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderRows();
});

document.getElementById("survey-bulk-archive").addEventListener("click", async () => {
  const targets = state.surveys.filter((survey) => state.selected.has(survey.id) && survey.status !== "closed");
  if (!targets.length) {
    metaEl.textContent = "Các phiếu đã chọn đều đang ở kho lưu trữ.";
    return;
  }
  const errors = [];
  for (const survey of targets) {
    try {
      await request(`/api/surveys/${survey.id}/archive`, { method: "POST" });
    } catch (error) {
      errors.push(error.message);
    }
  }
  await loadSurveys();
  if (errors.length) {
    metaEl.textContent = errors[0];
  }
});

document.getElementById("survey-bulk-delete").addEventListener("click", () => {
  const targets = state.surveys
    .filter((survey) => state.selected.has(survey.id) && survey.status !== "closed")
    .map((survey) => ({ id: survey.id, title: survey.title || "phiếu này", status: survey.status }));
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
  for (const survey of targets) {
    try {
      await request(`/api/surveys/${survey.id}`, { method: "DELETE" });
      state.selected.delete(survey.id);
    } catch (error) {
      errors.push(error.message);
    }
  }
  await loadSurveys();
  if (errors.length) {
    metaEl.textContent = errors[0];
    return;
  }
  metaEl.textContent = targets.length === 1
    ? `Đã xóa « ${targets[0].title} ».`
    : `Đã xóa ${targets.length} phiếu.`;
});

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

document.getElementById("reload").addEventListener("click", loadSurveys);
syncWho();
renderRoles();
loadSurveys();
