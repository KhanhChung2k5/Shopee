const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Tạo phân khúc được", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Tạo phân khúc được", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Đầu vào campaign — được", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Ngoài CRM — 403", initials: "KD" }
];

const MEMBER_PAGE_SIZE = 5;

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  view: sessionStorage.getItem("crmSegmentView") === "grid" ? "grid" : "list",
  detailId: null,
  detailCategoryId: null,
  detailCategoryName: "",
  detailMembers: [],
  memberPage: 0
};

const rowsEl = document.getElementById("rows");
const viewSwitchEl = document.querySelector(".view-switch");
const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");
const presetFieldEl = document.getElementById("preset-field");
const nameEl = document.getElementById("name");
const ageFieldEl = document.getElementById("age-field");
const rfmFieldEl = document.getElementById("rfm-field");
const categoryFieldEl = document.getElementById("category-field");
const detailModal = document.getElementById("detail-modal");
const confirmModal = document.getElementById("confirm-modal");
const confirmTextEl = document.getElementById("confirm-text");
let pendingDelete = null;
const detailTitleEl = document.getElementById("detail-title");
const detailMetaEl = document.getElementById("detail-meta");
const detailMembersEl = document.getElementById("detail-members");
const detailFormEl = document.getElementById("detail-form");
const detailLockedEl = document.getElementById("detail-locked");
const memberPagerEl = document.getElementById("member-pager");
const memberPageLabelEl = document.getElementById("member-page-label");
const memberPrevEl = document.getElementById("member-prev");
const memberNextEl = document.getElementById("member-next");
const detailNameEl = document.getElementById("detail-name");
const detailPresetFieldEl = document.getElementById("detail-preset-field");
const detailAgeFieldEl = document.getElementById("detail-age-field");
const detailRfmFieldEl = document.getElementById("detail-rfm-field");
const detailCategoryFieldEl = document.getElementById("detail-category-field");

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
      loadSegments();
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

function closeCategoryPanels() {
  document.querySelectorAll(".multi-select-panel").forEach((panel) => {
    panel.hidden = true;
  });
  document.querySelectorAll(".multi-select-toggle").forEach((toggle) => {
    toggle.setAttribute("aria-expanded", "false");
  });
}

function checkedValues(root, name) {
  return [...root.querySelectorAll(`input[name="${name}"]:checked`)].map((box) => box.value);
}

function showPresetOptions(presetRoot, ageRoot, rfmRoot, categoryRoot) {
  const presets = checkedValues(presetRoot, "presetValue");
  ageRoot.hidden = !presets.includes("age");
  rfmRoot.hidden = !presets.includes("rfm");
  categoryRoot.hidden = !presets.includes("category");
}

function syncPresetFields() {
  showPresetOptions(presetFieldEl, ageFieldEl, rfmFieldEl, categoryFieldEl);
}

function syncDetailFields() {
  showPresetOptions(detailPresetFieldEl, detailAgeFieldEl, detailRfmFieldEl, detailCategoryFieldEl);
}

function optionBoxes(root) {
  return [...root.querySelectorAll('input[type="checkbox"]:not([data-category-all])')];
}

function selectedCategoryNames(root) {
  return optionBoxes(root).filter((box) => box.checked).map((box) => box.value);
}

function syncCategoryAll(root) {
  const boxes = optionBoxes(root);
  const all = root.querySelector("[data-category-all]");
  const checked = boxes.filter((box) => box.checked);
  all.checked = checked.length === boxes.length && checked.length > 0;
  all.indeterminate = checked.length > 0 && checked.length < boxes.length;
  const toggle = root.querySelector(".multi-select-toggle");
  if (!checked.length) {
    toggle.textContent = root.querySelector(".choice-title").textContent;
  } else if (checked.length === boxes.length) {
    toggle.textContent = "Tất cả";
  } else {
    toggle.textContent = checked.map((box) => box.parentElement.querySelector("span").textContent).join(", ");
  }
}

function refreshPresetOptions(root) {
  syncCategoryAll(root);
  if (root === presetFieldEl) {
    showPresetOptions(presetFieldEl, ageFieldEl, rfmFieldEl, categoryFieldEl);
  }
  if (root === detailPresetFieldEl) {
    showPresetOptions(detailPresetFieldEl, detailAgeFieldEl, detailRfmFieldEl, detailCategoryFieldEl);
  }
}

function setCategoryNames(root, names) {
  const selected = new Set(names);
  optionBoxes(root).forEach((box) => {
    box.checked = selected.has(box.value);
  });
  refreshPresetOptions(root);
}

function bindCategoryField(root) {
  const toggle = root.querySelector(".multi-select-toggle");
  const panel = root.querySelector(".multi-select-panel");
  const all = root.querySelector("[data-category-all]");
  toggle.addEventListener("click", () => {
    const open = panel.hidden;
    document.querySelectorAll(".multi-select-panel").forEach((other) => {
      other.hidden = true;
    });
    document.querySelectorAll(".multi-select-toggle").forEach((other) => {
      other.setAttribute("aria-expanded", "false");
    });
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });
  all.addEventListener("change", () => {
    optionBoxes(root).forEach((box) => {
      box.checked = all.checked;
    });
    refreshPresetOptions(root);
  });
  optionBoxes(root).forEach((box) => {
    box.addEventListener("change", () => refreshPresetOptions(root));
  });
  syncCategoryAll(root);
}

function namesFromRule(rule) {
  if (Array.isArray(rule.categoryNames) && rule.categoryNames.length) {
    return rule.categoryNames;
  }
  if (rule.categoryName) {
    return [rule.categoryName];
  }
  return [];
}

function ruleFromRoots(presetRoot, ageRoot, rfmRoot, categoryRoot) {
  const presets = checkedValues(presetRoot, "presetValue");
  const rule = { presets };
  if (presets.includes("age")) {
    rule.buckets = checkedValues(ageRoot, "bucket");
  }
  if (presets.includes("rfm")) {
    rule.segments = checkedValues(rfmRoot, "rfm");
  }
  if (presets.includes("category")) {
    rule.categoryNames = selectedCategoryNames(categoryRoot);
  }
  return rule;
}

function ruleFromForm() {
  return ruleFromRoots(presetFieldEl, ageFieldEl, rfmFieldEl, categoryFieldEl);
}

function presetsFromRule(rule) {
  if (Array.isArray(rule.presets) && rule.presets.length) {
    return rule.presets;
  }
  return rule.preset ? [rule.preset] : [];
}

function listOrOne(values, single) {
  if (Array.isArray(values) && values.length) {
    return values;
  }
  return single ? [single] : [];
}

function ruleLabel(rule) {
  if (!rule) {
    return "";
  }
  const parts = [];
  const presets = presetsFromRule(rule);
  if (presets.includes("age")) {
    parts.push(`Tuổi · ${listOrOne(rule.buckets, rule.bucket).join(", ")}`);
  }
  if (presets.includes("rfm")) {
    parts.push(`RFM · ${listOrOne(rule.segments, rule.segment).join(", ")}`);
  }
  if (presets.includes("category")) {
    const names = namesFromRule(rule);
    parts.push(`Danh mục · ${names.length ? names.join(", ") : (rule.categoryId || "")}`);
  }
  return parts.join(" · ");
}

function applyView(view, focusButton) {
  state.view = view === "grid" ? "grid" : "list";
  sessionStorage.setItem("crmSegmentView", state.view);
  rowsEl.classList.toggle("is-grid", state.view === "grid");
  rowsEl.classList.toggle("is-list", state.view === "list");
  const buttons = [...viewSwitchEl.querySelectorAll("[data-view]")];
  buttons.forEach((button) => {
    const selected = button.dataset.view === state.view;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-checked", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focusButton) {
      button.focus();
    }
  });
}

function renderSegments(segments) {
  if (!segments.length) {
    rowsEl.innerHTML = `<div class="empty"><strong>Chưa có phân khúc.</strong>Tạo preset 18–24 để thấy Trần Thị Bình (sinh 2003).</div>`;
    return;
  }
  rowsEl.innerHTML = segments.map((segment) => {
    const emptyHint = segment.memberCount
      ? ""
      : `<p class="hint">Không có khách phù hợp. Khách khóa và đã xóa không được thêm.</p>`;
    return `
      <article class="report-card" data-id="${escapeHtml(segment.id)}">
        <div class="card-head">
          <h2>${escapeHtml(segment.name)}</h2>
          <button class="icon-menu" type="button" data-open="${escapeHtml(segment.id)}" aria-label="${segment.locked ? "Xem thành viên" : "Chi tiết và chỉnh sửa"} ${escapeHtml(segment.name)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
        </div>
        <p class="hint">${escapeHtml(ruleLabel(segment.ruleDefinition))} · ${segment.memberCount} thành viên</p>
        ${emptyHint}
        <div class="segment-actions">
          <button class="btn-ghost" type="button" data-refresh="${escapeHtml(segment.id)}">Tính lại</button>
          ${segment.locked ? "" : `<button class="btn-danger" type="button" data-delete="${escapeHtml(segment.id)}" data-name="${escapeHtml(segment.name)}">Xóa</button>`}
        </div>
      </article>`;
  }).join("");
}

async function loadSegments(banner) {
  if (!state.login) {
    rowsEl.innerHTML = `<div class="empty"><strong>Chọn tài khoản để xem phân khúc.</strong>Dùng khung đăng nhập giả lập bên trái.</div>`;
    metaEl.textContent = "Chọn tài khoản, rồi tạo preset tuổi 18–24 để xem thành viên.";
    return;
  }
  try {
    const body = await request("/api/segments");
    const segments = body.segments || [];
    const members = segments.reduce((sum, segment) => sum + (segment.memberCount || 0), 0);
    metaEl.textContent = `${segments.length} phân khúc · ${members} lượt thành viên đang hoạt động`;
    renderSegments(segments);
    if (banner) {
      showBanner(banner.type, banner.message);
    } else {
      showBanner("ok", `Sẵn sàng  |  ${segments.length} phân khúc`);
    }
  } catch (error) {
    rowsEl.innerHTML = `<div class="empty"><strong>${escapeHtml(error.message)}</strong></div>`;
    metaEl.textContent = error.message;
    showBanner("err", error.message);
  }
}

async function createSegment(name, ruleDefinition) {
  const created = await request("/api/segments", {
    method: "POST",
    body: JSON.stringify({ name, ruleDefinition })
  });
  const names = (created.members || []).map((member) => member.fullName).join(", ");
  const message = names
    ? `Đã tạo « ${created.name} » · ${created.memberCount} thành viên: ${names}`
    : `Đã tạo « ${created.name} » · chưa có thành viên đang hoạt động`;
  await loadSegments({ type: "ok", message });
}

document.getElementById("segment-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.login) {
    showBanner("err", "Hãy chọn tài khoản trước.");
    return;
  }
  const ruleDefinition = ruleFromForm();
  if (!(ruleDefinition.presets || []).length) {
    showBanner("err", "Chọn ít nhất một preset.");
    return;
  }
  if (ruleDefinition.presets.includes("age") && !(ruleDefinition.buckets || []).length) {
    showBanner("err", "Chọn ít nhất một nhóm tuổi.");
    return;
  }
  if (ruleDefinition.presets.includes("rfm") && !(ruleDefinition.segments || []).length) {
    showBanner("err", "Chọn ít nhất một nhãn RFM.");
    return;
  }
  if (ruleDefinition.presets.includes("category") && !(ruleDefinition.categoryNames || []).length) {
    showBanner("err", "Chọn ít nhất một danh mục.");
    return;
  }
  try {
    await createSegment(nameEl.value.trim(), ruleDefinition);
  } catch (error) {
    showBanner("err", error.message);
  }
});

function openDialog(el) {
  el.hidden = false;
  el.classList.add("is-open");
}

function closeDialog(el) {
  el.hidden = true;
  el.classList.remove("is-open");
}

function renderMemberPage() {
  const members = state.detailMembers;
  if (!members.length) {
    detailMembersEl.innerHTML = `<li><span>Không có khách phù hợp</span></li>`;
    memberPagerEl.hidden = true;
    return;
  }
  const pages = Math.ceil(members.length / MEMBER_PAGE_SIZE);
  state.memberPage = Math.min(Math.max(state.memberPage, 0), pages - 1);
  const start = state.memberPage * MEMBER_PAGE_SIZE;
  const slice = members.slice(start, start + MEMBER_PAGE_SIZE);
  detailMembersEl.innerHTML = slice.map((member) => `
    <li>
      <span>${escapeHtml(member.fullName)}</span>
      <span>${escapeHtml(member.status)}</span>
    </li>`).join("");
  const from = start + 1;
  const to = start + slice.length;
  memberPageLabelEl.textContent = `${from}–${to} / ${members.length}`;
  memberPrevEl.disabled = state.memberPage === 0;
  memberNextEl.disabled = state.memberPage >= pages - 1;
  memberPagerEl.hidden = pages <= 1;
}

function ruleFromDetail() {
  const rule = ruleFromRoots(detailPresetFieldEl, detailAgeFieldEl, detailRfmFieldEl, detailCategoryFieldEl);
  const categoryNames = rule.categoryNames || [];
  if (state.detailCategoryId && categoryNames.length === 1 && categoryNames[0] === state.detailCategoryName) {
    rule.categoryId = state.detailCategoryId;
    rule.categoryName = categoryNames[0];
  }
  return rule;
}

function fillDetail(segment) {
  const rule = segment.ruleDefinition || {};
  state.detailId = segment.id;
  state.detailCategoryId = rule.categoryId || null;
  state.detailCategoryName = namesFromRule(rule)[0] || "";
  detailTitleEl.textContent = segment.name;
  const created = segment.createdAt ? new Date(segment.createdAt).toLocaleString("vi-VN") : "";
  detailMetaEl.textContent = created
    ? `${ruleLabel(rule)} · ${segment.memberCount} thành viên · tạo ${created}`
    : `${ruleLabel(rule)} · ${segment.memberCount} thành viên`;
  state.detailMembers = segment.members || [];
  state.memberPage = 0;
  renderMemberPage();
  const locked = Boolean(segment.locked);
  detailFormEl.hidden = locked;
  detailLockedEl.hidden = !locked;
  if (locked) {
    return;
  }
  detailNameEl.value = segment.name;
  setCategoryNames(detailPresetFieldEl, presetsFromRule(rule));
  setCategoryNames(detailAgeFieldEl, listOrOne(rule.buckets, rule.bucket));
  setCategoryNames(detailRfmFieldEl, listOrOne(rule.segments, rule.segment));
  setCategoryNames(detailCategoryFieldEl, namesFromRule(rule));
  syncDetailFields();
}

function closeDetail() {
  state.detailId = null;
  state.detailCategoryId = null;
  state.detailCategoryName = "";
  state.detailMembers = [];
  state.memberPage = 0;
  closeDialog(detailModal);
}

async function openDetail(id) {
  const segment = await request(`/api/segments/${id}`);
  fillDetail(segment);
  openDialog(detailModal);
  if (!segment.locked) {
    detailNameEl.focus();
  }
}

rowsEl.addEventListener("click", async (event) => {
  const openId = event.target.closest("[data-open]")?.dataset.open;
  if (openId) {
    try {
      await openDetail(openId);
    } catch (error) {
      showBanner("err", error.message);
    }
    return;
  }
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    pendingDelete = { id: deleteButton.dataset.delete, name: deleteButton.dataset.name };
    confirmTextEl.textContent = `Xóa « ${pendingDelete.name} »? Phân khúc này và danh sách thành viên sẽ mất.`;
    openDialog(confirmModal);
    return;
  }
  const refreshId = event.target.closest("[data-refresh]")?.dataset.refresh;
  if (!refreshId) {
    return;
  }
  try {
    const refreshed = await request(`/api/segments/${refreshId}/refresh`, { method: "POST" });
    await loadSegments({
      type: "ok",
      message: `Đã tính lại « ${refreshed.name} » · ${refreshed.memberCount} thành viên`
    });
  } catch (error) {
    showBanner("err", error.message);
  }
});

confirmModal.querySelectorAll("[data-close-confirm]").forEach((el) => {
  el.addEventListener("click", () => {
    pendingDelete = null;
    closeDialog(confirmModal);
  });
});

document.getElementById("confirm-delete").addEventListener("click", async () => {
  if (!pendingDelete) {
    return;
  }
  const target = pendingDelete;
  pendingDelete = null;
  closeDialog(confirmModal);
  try {
    await request(`/api/segments/${target.id}`, { method: "DELETE" });
    await loadSegments({ type: "ok", message: `Đã xóa « ${target.name} ».` });
  } catch (error) {
    showBanner("err", error.message);
  }
});

document.getElementById("detail-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.detailId || detailFormEl.hidden) {
    return;
  }
  const ruleDefinition = ruleFromDetail();
  if (!(ruleDefinition.presets || []).length) {
    showBanner("err", "Chọn ít nhất một preset.");
    return;
  }
  if (ruleDefinition.presets.includes("age") && !(ruleDefinition.buckets || []).length) {
    showBanner("err", "Chọn ít nhất một nhóm tuổi.");
    return;
  }
  if (ruleDefinition.presets.includes("rfm") && !(ruleDefinition.segments || []).length) {
    showBanner("err", "Chọn ít nhất một nhãn RFM.");
    return;
  }
  if (ruleDefinition.presets.includes("category") && !(ruleDefinition.categoryNames || []).length && !ruleDefinition.categoryId) {
    showBanner("err", "Nhập tên danh mục trước khi lưu.");
    return;
  }
  try {
    const updated = await request(`/api/segments/${state.detailId}`, {
      method: "PUT",
      body: JSON.stringify({
        name: detailNameEl.value.trim(),
        ruleDefinition
      })
    });
    closeDetail();
    await loadSegments({
      type: "ok",
      message: `Đã cập nhật « ${updated.name} » · ${updated.memberCount} thành viên`
    });
  } catch (error) {
    showBanner("err", error.message);
  }
});

memberPrevEl.addEventListener("click", () => {
  state.memberPage -= 1;
  renderMemberPage();
});
memberNextEl.addEventListener("click", () => {
  state.memberPage += 1;
  renderMemberPage();
});

detailModal.querySelectorAll("[data-close-detail]").forEach((el) => {
  el.addEventListener("click", closeDetail);
});
document.getElementById("reload").addEventListener("click", loadSegments);
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".multi-select")) {
    return;
  }
  document.querySelectorAll(".multi-select-panel").forEach((panel) => {
    panel.hidden = true;
  });
  document.querySelectorAll(".multi-select-toggle").forEach((toggle) => {
    toggle.setAttribute("aria-expanded", "false");
  });
});
bindCategoryField(presetFieldEl);
bindCategoryField(ageFieldEl);
bindCategoryField(rfmFieldEl);
bindCategoryField(categoryFieldEl);
bindCategoryField(detailPresetFieldEl);
bindCategoryField(detailAgeFieldEl);
bindCategoryField(detailRfmFieldEl);
bindCategoryField(detailCategoryFieldEl);
viewSwitchEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button || button.dataset.view === state.view) {
    return;
  }
  applyView(button.dataset.view, false);
});

viewSwitchEl.addEventListener("keydown", (event) => {
  const buttons = [...viewSwitchEl.querySelectorAll("[data-view]")];
  const index = buttons.findIndex((button) => button.dataset.view === state.view);
  let next = index;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    next = (index + 1) % buttons.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    next = (index - 1 + buttons.length) % buttons.length;
  } else {
    return;
  }
  event.preventDefault();
  applyView(buttons[next].dataset.view, true);
});

applyView(state.view, false);
presetFieldEl.addEventListener("change", syncPresetFields);
detailPresetFieldEl.addEventListener("change", syncDetailFields);
syncPresetFields();
renderRoles();
syncWho();
loadSegments();
