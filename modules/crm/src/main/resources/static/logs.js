const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Xem nhật ký được", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Không xem nhật ký — 403", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Không xem nhật ký — 403", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Không xem nhật ký — 403", initials: "KD" }
];

const DEPT_LABEL = {
  admin: "Quản trị",
  crm: "CRM",
  cs: "CSKH",
  sales: "Kinh doanh",
  warehouse: "Kho",
  customer: "Khách"
};

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  q: "",
  actor: "",
  department: "",
  action: "",
  outcome: "",
  page: 1,
  totalPages: 0,
  facetsLoaded: false
};

const rowsEl = document.getElementById("rows");
const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");
const filtersEl = document.getElementById("log-filters");
const pagerEl = document.getElementById("pager");
const pagerLabelEl = document.getElementById("pager-label");
const searchEl = document.getElementById("log-search");
const actorEl = document.getElementById("filter-actor");
const departmentEl = document.getElementById("filter-department");
const actionEl = document.getElementById("filter-action");

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

function currentRole() {
  return ROLES.find((role) => role.login === state.login);
}

function syncWho() {
  const role = currentRole();
  const avatar = document.querySelector(".who-avatar");
  if (role) {
    whoEl.textContent = `${role.label} (${role.login})`;
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
    button.innerHTML = `<span class="actor-dot">${role.initials}</span><span><strong>${role.label}</strong><small>${role.login} / ${role.login}</small></span>`;
    button.addEventListener("click", () => {
      state.login = role.login;
      state.page = 1;
      state.facetsLoaded = false;
      sessionStorage.setItem("crmLogin", role.login);
      syncWho();
      renderRoles();
      load();
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

function formatWhen(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

function emptyRow(message) {
  rowsEl.innerHTML = `<tr><td class="table-empty" colspan="6">${escapeHtml(message)}</td></tr>`;
}

function fillSelect(select, options, selected, placeholder) {
  const previous = selected || "";
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);
  options.forEach((option) => {
    const item = document.createElement("option");
    if (typeof option === "string") {
      item.value = option;
      item.textContent = option;
    } else {
      item.value = option.value;
      item.textContent = option.label;
    }
    select.appendChild(item);
  });
  select.value = [...select.options].some((opt) => opt.value === previous) ? previous : "";
}

async function loadFacets() {
  if (state.facetsLoaded || state.login !== "admin") {
    return;
  }
  const response = await fetch("/api/crm/audit-logs/filters", { headers: authHeader() });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(body?.error?.message || `Lỗi HTTP ${response.status}`);
  }
  fillSelect(
    actorEl,
    (body.actors || []).map((actor) => ({
      value: actor.login,
      label: `${actor.label} (${actor.login})`
    })),
    state.actor,
    "Tất cả nhân viên"
  );
  fillSelect(
    departmentEl,
    (body.departments || []).map((dept) => ({
      value: dept,
      label: DEPT_LABEL[dept] || dept
    })),
    state.department,
    "Tất cả phòng ban"
  );
  fillSelect(actionEl, body.actions || [], state.action, "Tất cả thao tác");
  state.facetsLoaded = true;
}

function renderRows(items) {
  if (!items.length) {
    emptyRow("Chưa có thao tác khớp bộ lọc.");
    return;
  }
  rowsEl.innerHTML = items.map((item) => {
    const ok = item.outcome === "success";
    const badge = ok
      ? `<span class="badge active">Thành công</span>`
      : `<span class="badge deleted">Thất bại ${item.statusCode || ""}</span>`;
    const dept = DEPT_LABEL[item.department] || item.department || "—";
    return `<tr>
      <td>${escapeHtml(formatWhen(item.occurredAt))}</td>
      <td><strong>${escapeHtml(item.actorLabel || item.actorLogin)}</strong><br><span class="log-path">${escapeHtml(item.actorLogin || "")}</span></td>
      <td>${escapeHtml(dept)}</td>
      <td>${escapeHtml(item.action)}</td>
      <td>${badge}</td>
      <td class="log-path">${escapeHtml(item.httpMethod)} ${escapeHtml(item.path)}</td>
    </tr>`;
  }).join("");
}

function filterSummary() {
  const parts = [];
  if (state.actor) {
    const option = actorEl.selectedOptions[0];
    parts.push(option ? option.textContent : state.actor);
  }
  if (state.department) {
    parts.push(DEPT_LABEL[state.department] || state.department);
  }
  if (state.action) {
    parts.push(state.action);
  }
  if (state.outcome === "success") {
    parts.push("Thành công");
  }
  if (state.outcome === "failed") {
    parts.push("Thất bại");
  }
  if (state.q) {
    parts.push(`“${state.q}”`);
  }
  return parts.length ? ` · Lọc: ${parts.join(" · ")}` : "";
}

async function load() {
  syncWho();
  const admin = state.login === "admin";
  filtersEl.hidden = !admin;
  if (!state.login) {
    showBanner("info", "Hãy chọn Quản trị viên để xem nhật ký thao tác.");
    metaEl.textContent = "CRM Manager, CSKH và NV Kinh doanh không mở được trang này.";
    pagerEl.hidden = true;
    emptyRow("Chưa chọn tài khoản.");
    return;
  }
  if (!admin) {
    showBanner("err", "Chỉ quản trị viên được xem nhật ký thao tác.");
    metaEl.textContent = "Tài khoản này không có quyền. API cũng trả 403.";
    pagerEl.hidden = true;
    emptyRow("Không có quyền xem lịch sử thao tác.");
    return;
  }

  const params = new URLSearchParams();
  if (state.q) {
    params.set("q", state.q);
  }
  if (state.actor) {
    params.set("actor", state.actor);
  }
  if (state.department) {
    params.set("department", state.department);
  }
  if (state.action) {
    params.set("action", state.action);
  }
  if (state.outcome) {
    params.set("outcome", state.outcome);
  }
  params.set("page", String(state.page));
  params.set("pageSize", "20");

  try {
    await loadFacets();
    const response = await fetch(`/api/crm/audit-logs?${params}`, { headers: authHeader() });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(body?.error?.message || `Lỗi HTTP ${response.status}`);
    }
    showBanner("", "");
    const total = body.pagination?.totalItems ?? body.data.length;
    state.totalPages = body.pagination?.totalPages ?? 1;
    metaEl.textContent =
      `${total} thao tác · trang ${body.pagination?.page || 1}/${Math.max(state.totalPages, 1)}` +
      filterSummary();
    renderRows(body.data || []);
    pagerEl.hidden = state.totalPages <= 1;
    pagerLabelEl.textContent = `Trang ${body.pagination?.page || 1} / ${Math.max(state.totalPages, 1)}`;
  } catch (error) {
    showBanner("err", error.message);
    metaEl.textContent = "Không tải được nhật ký.";
    pagerEl.hidden = true;
    emptyRow(error.message);
  }
}

function applyFilterChange() {
  state.page = 1;
  load();
}

document.querySelectorAll("[data-outcome]").forEach((button) => {
  button.addEventListener("click", () => {
    state.outcome = button.dataset.outcome || "";
    document.querySelectorAll("[data-outcome]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
    });
    applyFilterChange();
  });
});

actorEl.addEventListener("change", () => {
  state.actor = actorEl.value;
  applyFilterChange();
});
departmentEl.addEventListener("change", () => {
  state.department = departmentEl.value;
  applyFilterChange();
});
actionEl.addEventListener("change", () => {
  state.action = actionEl.value;
  applyFilterChange();
});

let searchTimer = 0;
searchEl.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    state.q = searchEl.value.trim();
    applyFilterChange();
  }, 250);
});

document.getElementById("filter-reset").addEventListener("click", () => {
  state.q = "";
  state.actor = "";
  state.department = "";
  state.action = "";
  state.outcome = "";
  state.page = 1;
  searchEl.value = "";
  actorEl.value = "";
  departmentEl.value = "";
  actionEl.value = "";
  document.querySelectorAll("[data-outcome]").forEach((item) => {
    const active = item.dataset.outcome === "";
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", active ? "true" : "false");
  });
  load();
});

document.getElementById("reload").addEventListener("click", () => {
  state.facetsLoaded = false;
  load();
});
document.getElementById("pager-prev").addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    load();
  }
});
document.getElementById("pager-next").addEventListener("click", () => {
  if (state.page < state.totalPages) {
    state.page += 1;
    load();
  }
});
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

renderRoles();
syncWho();
load();
