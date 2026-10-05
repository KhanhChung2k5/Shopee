const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Toàn quyền story 1–3", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Thêm / sửa / khóa / xóa mềm được", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Chỉ xem — sửa sẽ 403", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Ngoài CRM — danh sách cũng 403", initials: "KD" }
];

const STATUS_LABEL = {
  active: "Hoạt động",
  locked: "Đã khóa",
  deleted: "Đã xóa"
};

const AVATARS = [
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#e0e7ff", fg: "#3730a3" },
  { bg: "#eff6ff", fg: "#2563eb" },
  { bg: "#e0f2fe", fg: "#0369a1" },
  { bg: "#dbeafe", fg: "#1e40af" },
  { bg: "#f1f5f9", fg: "#334155" }
];

const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  fail: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2m-8 0v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7"/></svg>',
  restore: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  view: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
};

const GENDER_LABEL = {
  male: "Nam",
  female: "Nữ"
};

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  includeDeleted: true,
  search: "",
  status: "",
  catalog: [],
  focusId: sessionStorage.getItem("crmCustomerFocusId") || ""
};

const entitySwitch = createEntitySwitch({
  root: "#entity-switch",
  pinKey: "crmCustomerPins",
  recentKey: "crmCustomerRecent",
  labels: {
    noun: "khách",
    switchLabel: "Đổi khách",
    switchPlaceholder: "Tên, email hoặc SĐT…",
    searchLabel: "Tìm khách",
    paletteTitle: "Tìm khách hàng",
    palettePlaceholder: "Tên, email, SĐT hoặc trạng thái",
    emptyTitle: "Không có khách khớp.",
    emptyHint: "Thử tên (ưu tiên tên gọi), email hoặc số điện thoại."
  },
  getItems: () => state.catalog.map((customer) => ({
    id: customer.id,
    title: customer.fullName || "Chưa đặt tên",
    subtitle: [customer.email, customer.phone].filter(Boolean).join(" · "),
    email: customer.email || "",
    phone: customer.phone || "",
    badge: {
      label: STATUS_LABEL[customer.status] || customer.status,
      tone: customer.status === "active" ? "active" : customer.status === "locked" ? "locked" : "scheduled"
    },
    searchText: `${customer.fullName} ${customer.email || ""} ${customer.phone || ""} ${customer.status || ""}`,
    sortAt: customer.updatedAt || customer.createdAt || customer.dob
  })),
  getSelectedId: () => state.focusId,
  isEnabled: () => Boolean(state.login),
  onSelect: (id) => {
    state.focusId = id;
    sessionStorage.setItem("crmCustomerFocusId", id);
    const card = rowsEl.querySelector(`[data-customer-id="${id}"]`);
    if (card) {
      card.classList.add("is-focus");
      card.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setTimeout(() => card.classList.remove("is-focus"), 1600);
    }
    openViewModal(id);
    entitySwitch.sync();
  }
});

const rowsEl = document.getElementById("rows");
const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");
const modalEl = document.getElementById("create-modal");
const confirmEl = document.getElementById("confirm-modal");
const viewEl = document.getElementById("view-modal");
const viewBodyEl = document.getElementById("view-body");
const viewHintEl = document.getElementById("view-hint");
const viewEditProfileEl = document.getElementById("view-edit-profile");
const viewSaveAddressEl = document.getElementById("view-save-address");
const confirmTextEl = document.getElementById("confirm-text");
const confirmTitleEl = document.getElementById("confirm-title");
const confirmActionEl = document.getElementById("confirm-action");
const statusEl = document.getElementById("status");
const includeDeletedEl = document.getElementById("include-deleted");
const formHintEl = document.getElementById("form-hint");
const saveCustomerEl = document.getElementById("save-customer");
const createTitleEl = document.getElementById("create-title");
const addressSectionEl = document.getElementById("customer-address-section");
const addressListEl = document.getElementById("customer-address-list");
const addAddressEl = document.getElementById("add-address");
let pendingAction = null;
let editingId = null;
let viewingId = null;
let viewingAddresses = [];
const customersById = new Map();

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
  const method = String(options.method || "GET").toUpperCase();
  const headers = {
    ...authHeader(),
    ...(options.headers || {})
  };
  if (method !== "GET" && method !== "HEAD" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    ...options,
    headers
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
  let hash = 0;
  for (const char of String(name)) {
    hash = (hash + char.charCodeAt(0)) % AVATARS.length;
  }
  return AVATARS[hash];
}

function initialsOf(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
    button.innerHTML = `<span class="actor-dot" style="background:${avatarFor(role.login).fg}">${role.initials}</span><span><strong>${role.label}</strong><small>${role.login} / ${role.login}</small></span>`;
    button.addEventListener("click", () => {
      state.login = role.login;
      sessionStorage.setItem("crmLogin", role.login);
      syncWho();
      renderRoles();
      loadCustomers();
    });
    rolesEl.appendChild(button);
  });
}

function statusBadge(status) {
  const icon = status === "active" ? ICON.check : status === "locked" ? ICON.lock : ICON.fail;
  return `<span class="badge ${status}">${icon}${STATUS_LABEL[status] || status}</span>`;
}

function canEditProfile() {
  return state.login === "admin" || state.login === "crm";
}

function renderRows(customers) {
  customersById.clear();
  customers.forEach((customer) => customersById.set(customer.id, customer));
  if (!customers.length) {
    rowsEl.innerHTML = `<div class="empty"><strong>Không có khách nào khớp bộ lọc.</strong>Thử đổi chip trạng thái hoặc từ khóa tìm kiếm.</div>`;
    return;
  }

  rowsEl.innerHTML = customers.map((customer) => {
    const tone = avatarFor(customer.fullName);
    const isDeleted = customer.status === "deleted";
    const isActive = customer.status === "active";
    const showEdit = canEditProfile() && !isDeleted;
    return `
      <article class="cust-card is-${customer.status}${customer.id === state.focusId ? " is-focus" : ""}" data-customer-id="${customer.id}">
        <div class="cust-top">
          <span class="avatar" style="background:${tone.bg};color:${tone.fg}">${escapeHtml(initialsOf(customer.fullName))}</span>
          ${statusBadge(customer.status)}
        </div>
        <div class="cust-body">
          <h3>${escapeHtml(customer.fullName)}</h3>
          <p>${escapeHtml(customer.email || "Chưa có email")}</p>
          <p>${escapeHtml(customer.phone || "Chưa có SĐT")} · ${escapeHtml(customer.dob || "—")}</p>
        </div>
        <div class="cust-foot">
          <div class="cust-actions">
            <button class="icon-view" type="button" data-view="${customer.id}" aria-label="Xem thông tin ${escapeHtml(customer.fullName)}">${ICON.view}</button>
            ${showEdit ? `<button class="icon-edit" type="button" data-edit="${customer.id}" aria-label="Sửa ${escapeHtml(customer.fullName)}">${ICON.edit}</button>` : ""}
            <button class="icon-danger" type="button" data-id="${customer.id}" data-name="${escapeHtml(customer.fullName)}" ${isDeleted ? "disabled" : ""} aria-label="Xóa mềm ${escapeHtml(customer.fullName)}">
              ${ICON.trash}
            </button>
          </div>
          ${isDeleted && state.login === "admin"
            ? `<button class="btn-restore" type="button" data-restore data-id="${customer.id}" data-name="${escapeHtml(customer.fullName)}">${ICON.restore} Khôi phục</button>`
            : `<button class="switch ${isActive ? "is-on" : ""}" type="button" data-id="${customer.id}" data-status="${isActive ? "locked" : "active"}" ${isDeleted ? "disabled" : ""} aria-pressed="${isActive}" aria-label="${isActive ? "Khóa" : "Mở khóa"} ${escapeHtml(customer.fullName)}"></button>`}
        </div>
      </article>
    `;
  }).join("");

  rowsEl.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => openViewModal(button.dataset.view));
  });
  rowsEl.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditModal(button.dataset.edit));
  });
  rowsEl.querySelectorAll(".icon-danger").forEach((button) => {
    button.addEventListener("click", () => openConfirm({
      kind: "delete",
      id: button.dataset.id,
      name: button.dataset.name
    }));
  });
  rowsEl.querySelectorAll("[data-restore]").forEach((button) => {
    button.addEventListener("click", () => openConfirm({
      kind: "restore",
      id: button.dataset.id,
      name: button.dataset.name
    }));
  });
  rowsEl.querySelectorAll(".switch").forEach((button) => {
    button.addEventListener("click", () => patchCustomer(button.dataset.id, button.dataset.status));
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function updateChips(counts) {
  document.getElementById("count-all").textContent = counts.all;
  document.getElementById("count-active").textContent = counts.active;
  document.getElementById("count-locked").textContent = counts.locked;
  document.getElementById("count-deleted").textContent = counts.deleted;
  document.getElementById("kpi-all").textContent = counts.all;
  document.getElementById("kpi-active").textContent = counts.active;
  document.getElementById("kpi-locked").textContent = counts.locked;
  document.getElementById("kpi-deleted").textContent = counts.deleted;
  document.getElementById("nav-count").textContent = counts.all;
  document.querySelectorAll(".chip").forEach((chip) => {
    const active = chip.dataset.status === state.status;
    chip.classList.toggle("is-active", active);
    chip.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("#customer-kpis .kpi-card").forEach((card) => {
    const active = card.dataset.status === state.status;
    card.classList.toggle("is-selected", active);
    card.setAttribute("aria-pressed", String(active));
  });
}

function applyStatusFilter(status) {
  state.status = status;
  state.includeDeleted = status === "" || status === "deleted";
  statusEl.value = status;
  includeDeletedEl.checked = state.includeDeleted;
  loadCustomers();
}

async function loadCounts() {
  if (!state.login) {
    updateChips({ all: 0, active: 0, locked: 0, deleted: 0 });
    return;
  }
  try {
    const counts = { all: 0, active: 0, locked: 0, deleted: 0 };
    let page = 1;
    let totalPages = 1;
    do {
      const result = await request(`/api/customers?includeDeleted=true&pageSize=100&page=${page}`);
      const items = result.data || [];
      if (page === 1) {
        counts.all = result.pagination?.totalItems ?? items.length;
        totalPages = result.pagination?.totalPages ?? 1;
      }
      items.forEach((item) => {
        if (counts[item.status] != null) {
          counts[item.status] += 1;
        }
      });
      page += 1;
    } while (page <= totalPages);
    updateChips(counts);
  } catch {
    updateChips({ all: 0, active: 0, locked: 0, deleted: 0 });
  }
}

async function loadCatalog() {
  if (!state.login) {
    state.catalog = [];
    entitySwitch.sync();
    return;
  }
  try {
    const result = await request("/api/customers?includeDeleted=true&pageSize=100");
    state.catalog = result.data || [];
  } catch {
    state.catalog = [];
  }
  entitySwitch.sync();
}

async function loadCustomers() {
  if (!state.login) {
    state.catalog = [];
    entitySwitch.sync();
    rowsEl.innerHTML = `<div class="empty"><strong>Chọn tài khoản để tải dữ liệu.</strong>Dùng khung đăng nhập giả lập bên trái.</div>`;
    metaEl.textContent = "";
    updateChips({ all: 0, active: 0, locked: 0, deleted: 0 });
    return;
  }
  const params = new URLSearchParams();
  params.set("includeDeleted", String(state.includeDeleted));
  params.set("pageSize", "50");
  if (state.search) {
    params.set("search", state.search);
  }
  if (state.status) {
    params.set("status", state.status);
  }
  try {
    await loadCatalog();
    const result = await request(`/api/customers?${params}`);
    const total = result.pagination?.totalItems ?? result.data.length;
    metaEl.textContent = `${total} khách · chỉ quản trị viên khôi phục được khách đã xóa`;
    renderRows(result.data);
    await loadCounts();
    entitySwitch.sync();
    const role = currentRole();
    if (role?.login === "cs") {
      showBanner("info", "CSKH chỉ xem  |  Thêm / sửa / khóa / xóa sẽ 403");
    } else if (role?.login === "sales") {
      showBanner("err", "Cần chú ý  |  NV Kinh doanh không thuộc CRM");
    } else {
      showBanner("ok", `Sẵn sàng  |  ${total} khách trên bộ lọc này`);
    }
  } catch (error) {
    rowsEl.innerHTML = `<div class="empty"><strong>${escapeHtml(error.message)}</strong></div>`;
    showBanner("err", error.message);
    metaEl.textContent = "";
    entitySwitch.sync();
  }
}

async function restoreCustomer(id) {
  try {
    const updated = await request(`/api/customers/${id}/restore`, { method: "POST" });
    showBanner("ok", `${updated.fullName} → ${STATUS_LABEL[updated.status] || updated.status}`);
    await loadCustomers();
  } catch (error) {
    showBanner("err", error.message);
  }
}

async function patchCustomer(id, status) {
  try {
    const updated = await request(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    showBanner("ok", `${updated.fullName} → ${STATUS_LABEL[updated.status] || updated.status}`);
    await loadCustomers();
  } catch (error) {
    showBanner("err", error.message);
  }
}

function openDialog(el) {
  el.hidden = false;
  el.classList.add("is-open");
}

function closeDialog(el) {
  el.hidden = true;
  el.classList.remove("is-open");
}

function openConfirm(action) {
  pendingAction = action;
  if (action.kind === "restore") {
    confirmTitleEl.textContent = "Khôi phục khách hàng?";
    confirmTextEl.innerHTML = `Khôi phục <strong>${escapeHtml(action.name)}</strong> về trạng thái đang hoạt động?`;
    confirmActionEl.textContent = "Khôi phục";
    confirmActionEl.className = "btn-primary";
  } else {
    confirmTitleEl.textContent = "Xóa khách hàng?";
    confirmTextEl.innerHTML = `Xóa mềm <strong>${escapeHtml(action.name)}</strong>? Khách sẽ ẩn khỏi danh sách mặc định. Chỉ <strong>quản trị viên</strong> khôi phục được.`;
    confirmActionEl.textContent = "Xóa mềm";
    confirmActionEl.className = "btn-danger";
  }
  openDialog(confirmEl);
  confirmEl.querySelector(".btn-ghost")?.focus();
}

function closeConfirm() {
  pendingAction = null;
  closeDialog(confirmEl);
}

function openModal() {
  editingId = null;
  createTitleEl.textContent = "Thêm khách hàng";
  formHintEl.textContent = "Admin và CRM Manager được. CSKH / NV Kinh doanh sẽ nhận 403.";
  saveCustomerEl.textContent = "Thêm khách";
  const form = document.getElementById("create-form");
  form.reset();
  form.dob.value = "1998-05-01";
  fillAddressEditors(form, []);
  openDialog(modalEl);
  form.fullName.focus();
}

async function openEditModal(id) {
  const customer = customersById.get(id);
  if (!customer) {
    return;
  }
  editingId = id;
  createTitleEl.textContent = "Sửa khách hàng";
  formHintEl.textContent = "Chỉ Admin và CRM Manager được sửa hồ sơ và địa chỉ. Khách đã xóa phải khôi phục trước.";
  saveCustomerEl.textContent = "Lưu thay đổi";
  const form = document.getElementById("create-form");
  form.fullName.value = customer.fullName || "";
  form.email.value = customer.email || "";
  form.phone.value = customer.phone || "";
  form.gender.value = customer.gender || "";
  form.dob.value = customer.dob || "";
  fillAddressEditors(form, []);
  openDialog(modalEl);
  form.fullName.focus();
  try {
    const detail = await request(`/api/customers/${id}`);
    customersById.set(detail.customer.id, detail.customer);
    fillAddressEditors(detail.customer, detail.addresses || []);
  } catch (error) {
    showBanner("err", error.message);
  }
}

function closeModal() {
  editingId = null;
  addressListEl.innerHTML = "";
  addressSectionEl.hidden = true;
  closeDialog(modalEl);
}

function closeViewModal() {
  viewingId = null;
  viewingAddresses = [];
  closeDialog(viewEl);
}

async function openViewModal(id) {
  if (!state.login) {
    showBanner("err", "Chọn tài khoản trước khi xem thông tin.");
    return;
  }
  viewingId = id;
  viewBodyEl.innerHTML = `<p class="hint">Đang tải thông tin…</p>`;
  viewEditProfileEl.hidden = true;
  viewSaveAddressEl.hidden = true;
  openDialog(viewEl);
  try {
    const detail = await request(`/api/customers/${id}`);
    customersById.set(detail.customer.id, detail.customer);
    viewingAddresses = detail.addresses || [];
    renderViewBody(detail.customer, viewingAddresses);
  } catch (error) {
    viewBodyEl.innerHTML = `<div class="empty"><strong>${escapeHtml(error.message)}</strong></div>`;
    showBanner("err", error.message);
  }
}

function renderViewBody(customer, addresses) {
  const canEdit = canEditProfile() && customer.status !== "deleted";
  viewHintEl.textContent = canEdit
    ? "Có thể sửa địa chỉ ngay trong khung này. Nút « Sửa hồ sơ » đổi tên / email / SĐT."
    : customer.status === "deleted"
      ? "Khách đã xóa — chỉ xem. Khôi phục trước khi sửa."
      : "CSKH chỉ xem. Admin / CRM Manager mới sửa được địa chỉ.";
  viewEditProfileEl.hidden = !canEdit;
  viewSaveAddressEl.hidden = !canEdit;

  const profileRows = [
    ["Họ tên", customer.fullName || "—"],
    ["Email", customer.email || "—"],
    ["Điện thoại", customer.phone || "—"],
    ["Giới tính", GENDER_LABEL[customer.gender] || "Không rõ"],
    ["Ngày sinh", customer.dob || "—"],
    ["Trạng thái", STATUS_LABEL[customer.status] || customer.status]
  ].map(([label, value]) => `
    <div class="view-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");

  let addressHtml;
  if (!addresses.length) {
    addressHtml = canEdit
      ? renderAddressEditor(null, customer)
      : `<p class="hint">Chưa có địa chỉ giao hàng.</p>`;
  } else if (canEdit) {
    addressHtml = addresses.map((address) => renderAddressEditor(address, customer)).join("");
  } else {
    addressHtml = addresses.map((address) => `
      <article class="address-card">
        <div class="address-card-head">
          <strong>${escapeHtml(address.recipientName || "—")}</strong>
          ${address.isDefault ? `<span class="badge active">${ICON.check} Mặc định</span>` : ""}
        </div>
        <p>${escapeHtml(address.phone || "—")}</p>
        <p>${escapeHtml(address.fullAddress || "—")}</p>
      </article>
    `).join("");
  }

  viewBodyEl.innerHTML = `
    <section class="view-section" aria-labelledby="view-profile-title">
      <h3 id="view-profile-title">Hồ sơ</h3>
      <div class="view-grid">${profileRows}</div>
    </section>
    <section class="view-section" aria-labelledby="view-address-title">
      <h3 id="view-address-title">Địa chỉ giao hàng</h3>
      <div class="address-list" id="address-list">${addressHtml}</div>
    </section>
  `;
}

function fillAddressEditors(customer, addresses) {
  addressSectionEl.hidden = false;
  const rows = addresses.length ? addresses : [null];
  addressListEl.innerHTML = rows.map((address) => renderAddressEditor(address, customer)).join("");
}

function appendAddressEditor() {
  const form = document.getElementById("create-form");
  const customer = {
    fullName: form.fullName.value,
    phone: form.phone.value
  };
  addressSectionEl.hidden = false;
  addressListEl.insertAdjacentHTML("beforeend", renderAddressEditor(null, customer));
}

function renderAddressEditor(address, customer) {
  const id = address?.id || "";
  const recipient = address?.recipientName || customer.fullName || "";
  const phone = address?.phone || customer.phone || "";
  const fullAddress = address?.fullAddress || "";
  const isDefault = address ? Boolean(address.isDefault) : true;
  return `
    <div class="address-form" data-address-id="${escapeHtml(id)}">
      <label>Người nhận <input name="addressRecipientName" value="${escapeHtml(recipient)}" maxlength="255"></label>
      <label>SĐT giao hàng <input name="addressPhone" value="${escapeHtml(phone)}" maxlength="20"></label>
      <label class="address-full">Địa chỉ đầy đủ
        <textarea name="addressFullAddress" maxlength="500" rows="2">${escapeHtml(fullAddress)}</textarea>
      </label>
      <label class="check-inline">
        <input type="checkbox" name="addressIsDefault" ${isDefault ? "checked" : ""}>
        Đặt làm mặc định
      </label>
    </div>
  `;
}

function collectAddressPayloads(root) {
  return [...root.querySelectorAll(".address-form")].map((block) => {
    const payload = {
      recipientName: block.querySelector("[name='addressRecipientName']")?.value.trim() || "",
      phone: block.querySelector("[name='addressPhone']")?.value.trim() || "",
      fullAddress: block.querySelector("[name='addressFullAddress']")?.value.trim() || "",
      isDefault: Boolean(block.querySelector("[name='addressIsDefault']")?.checked)
    };
    return {
      addressId: block.dataset.addressId || "",
      payload,
      filled: Boolean(payload.recipientName || payload.phone || payload.fullAddress)
    };
  }).filter((row) => row.filled);
}

async function saveCustomerAddresses(customerId, root) {
  const rows = collectAddressPayloads(root);
  for (const row of rows) {
    const { payload } = row;
    if (!payload.recipientName || !payload.phone || !payload.fullAddress) {
      throw new Error("Vui lòng điền đủ người nhận, SĐT và địa chỉ.");
    }
    if (row.addressId) {
      await request(`/api/customers/${customerId}/addresses/${row.addressId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await request(`/api/customers/${customerId}/addresses`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  }
}

async function saveViewAddresses() {
  if (!viewingId || !canEditProfile()) {
    return;
  }
  viewSaveAddressEl.disabled = true;
  try {
    await saveCustomerAddresses(viewingId, viewBodyEl);
    showBanner("ok", "Đã lưu địa chỉ khách hàng.");
    await openViewModal(viewingId);
  } catch (error) {
    showBanner("err", error.message);
  } finally {
    viewSaveAddressEl.disabled = false;
  }
}

document.getElementById("open-create").addEventListener("click", openModal);
modalEl.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", closeModal);
});
confirmEl.querySelectorAll("[data-close-confirm]").forEach((el) => {
  el.addEventListener("click", closeConfirm);
});
viewEl.querySelectorAll("[data-close-view]").forEach((el) => {
  el.addEventListener("click", closeViewModal);
});
viewEditProfileEl.addEventListener("click", () => {
  if (!viewingId) {
    return;
  }
  const id = viewingId;
  closeViewModal();
  openEditModal(id);
});
viewSaveAddressEl.addEventListener("click", saveViewAddresses);
confirmActionEl.addEventListener("click", async () => {
  if (!pendingAction) {
    return;
  }
  const action = pendingAction;
  closeConfirm();
  if (action.kind === "restore") {
    await restoreCustomer(action.id);
  } else {
    await patchCustomer(action.id, "deleted");
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (!confirmEl.hidden) {
    closeConfirm();
    return;
  }
  if (!modalEl.hidden) {
    closeModal();
    return;
  }
  if (!viewEl.hidden) {
    closeViewModal();
  }
});

document.getElementById("create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    gender: form.gender.value || null,
    dob: form.dob.value || null
  };
  try {
    if (editingId) {
      const updated = await request(`/api/customers/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      await saveCustomerAddresses(editingId, addressListEl);
      closeModal();
      showBanner("ok", `Đã cập nhật ${updated.fullName}.`);
    } else {
      const created = await request("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await saveCustomerAddresses(created.id, addressListEl);
      form.reset();
      form.dob.value = "1998-05-01";
      closeModal();
      showBanner("ok", `Đã thêm ${created.fullName} (đang hoạt động).`);
    }
    await loadCustomers();
  } catch (error) {
    showBanner("err", error.message);
  }
});
addAddressEl.addEventListener("click", appendAddressEditor);

document.querySelectorAll(".chip, #customer-kpis .kpi-card").forEach((control) => {
  control.addEventListener("click", () => applyStatusFilter(control.dataset.status));
});

includeDeletedEl.addEventListener("change", (event) => {
  state.includeDeleted = event.target.checked;
  loadCustomers();
});
statusEl.addEventListener("change", (event) => {
  state.status = event.target.value;
  loadCustomers();
});
document.getElementById("reload").addEventListener("click", loadCustomers);
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

includeDeletedEl.checked = true;
renderRoles();
syncWho();
if (state.login) {
  loadCustomers();
} else {
  rowsEl.innerHTML = `<div class="empty"><strong>Chọn tài khoản để tải dữ liệu.</strong>Dùng khung đăng nhập giả lập bên trái.</div>`;
}
