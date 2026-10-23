const ROLES = [
  { login: "admin", label: "Quản trị viên", initials: "QT" },
  { login: "cslead", label: "Trưởng nhóm CSKH", initials: "TN" },
  { login: "cs", label: "CSKH", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", initials: "KD" }
];

const STATUS_LABELS = {
  active: "Đang hoạt động",
  locked: "Đã khóa",
  deleted: "Đã xóa"
};

/** Nhãn + icon cho từng quy tắc — không dựa vào màu để phân biệt. */
const RULES = {
  NEW_CUSTOMER_BEST_SELLER: {
    label: "Khách mới",
    icon: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  },
  ACCESSORY_NEEDS_CONTROLLER: {
    label: "Thiếu tay cầm",
    icon: '<rect x="3" y="8" width="18" height="9" rx="4.5"/><path d="M8 12.5h3M9.5 11v3"/>'
  },
  CONSOLE_NEEDS_GAME_DISC: {
    label: "Thiếu đĩa game",
    icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>'
  },
  SAME_GENRE_GAME_DISC: {
    label: "Cùng thể loại",
    icon: '<path d="M4 7h16M4 12h10M4 17h6"/><path d="M17 15l2 2 3-4"/>'
  },
  CO_PURCHASE: {
    label: "Mua chung",
    icon: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2.5l2.3 11h10.4l2-8H7"/>'
  }
};

const FETCH_LIMIT = 10;
const BATCH_SIZE = 4;

const RFM_SEGMENTS = [
  { bucket: "champions", label: "Champions" },
  { bucket: "loyal", label: "Loyal" },
  { bucket: "potential", label: "Potential" },
  { bucket: "at_risk", label: "At Risk" },
  { bucket: "lost", label: "Lost" },
  { bucket: "other", label: "Other" }
];
const KNOWN_RFM = new Set(RFM_SEGMENTS.map((item) => item.bucket));

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  rows: [],
  segments: [],
  rule: "",
  query: "",
  segmentIds: [],
  rfm: [],
  focusId: sessionStorage.getItem("crmMarketingFocusId") || "",
  selectedByCustomer: {},
  loading: false
};

const listEl = document.getElementById("mk-list");
const detailEl = document.getElementById("mk-detail");
const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");
const rulesEl = document.getElementById("mk-rules");
const searchEl = document.getElementById("mk-search");
const clearRuleEl = document.getElementById("mk-clear-rule");
const segmentFilterEl = document.getElementById("mk-filter-segment");
const rfmFilterEl = document.getElementById("mk-filter-rfm");
const filterResetEl = document.getElementById("mk-filter-reset");
const scrollerEl = document.getElementById("mk-scroller");

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
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(body?.error?.message || `Lỗi HTTP ${response.status}`);
  }
  return body;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  if (!rolesEl || !rolesEl.isConnected) {
    return;
  }
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
      loadAll();
    });
    rolesEl.appendChild(button);
  });
}

function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "—";
  }
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  const last = parts[parts.length - 1] || "?";
  return last.charAt(0).toUpperCase();
}

function ruleBadge(reason) {
  const rule = RULES[reason];
  if (!rule) {
    return "";
  }
  return `<span class="mk-tag"><svg viewBox="0 0 24 24" aria-hidden="true">${rule.icon}</svg>${escapeHtml(rule.label)}</span>`;
}

function reasonsOf(row) {
  return [...new Set((row.items || []).map((item) => item.reason))];
}

function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function knownRfm(code) {
  return KNOWN_RFM.has(code) ? code : "other";
}

function rfmLabel(code) {
  const key = knownRfm(code) || "other";
  return RFM_SEGMENTS.find((item) => item.bucket === key)?.label || "Other";
}

function matchesQuery(row, needle) {
  if (!needle) {
    return true;
  }
  const customer = row.customer;
  const haystack = fold([
    customer.fullName,
    customer.email,
    customer.phone,
    row.rfmSegment,
    rfmLabel(row.rfmSegment)
  ].join(" "));
  const digits = fold(customer.phone).replace(/[\s().+\-]/g, "");
  return haystack.includes(needle) || digits.includes(needle.replace(/[\s().+\-]/g, ""));
}

function visibleRows() {
  const needle = fold(state.query.trim());
  return state.rows.filter((row) => {
    if (state.rule && !reasonsOf(row).includes(state.rule)) {
      return false;
    }
    if (state.segmentIds.length) {
      const wanted = new Set(state.segmentIds);
      if (!(row.segmentIds || []).some((id) => wanted.has(id))) {
        return false;
      }
    }
    if (state.rfm.length && !state.rfm.includes(knownRfm(row.rfmSegment || "other"))) {
      return false;
    }
    return matchesQuery(row, needle);
  });
}

function updateRuleCards() {
  const counts = Object.fromEntries(Object.keys(RULES).map((key) => [key, 0]));
  for (const row of state.rows) {
    for (const reason of reasonsOf(row)) {
      if (counts[reason] != null) {
        counts[reason] += 1;
      }
    }
  }
  for (const key of Object.keys(RULES)) {
    document.getElementById(`mk-count-${key}`).textContent = counts[key];
    const card = rulesEl.querySelector(`[data-rule="${key}"]`);
    const selected = state.rule === key;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  }
  clearRuleEl.hidden = !state.rule;
}

function renderSkeleton() {
  listEl.setAttribute("aria-busy", "true");
  listEl.innerHTML = Array.from({ length: 5 }, () => '<div class="mk-skeleton" aria-hidden="true"></div>').join("");
}

function renderList() {
  updateRuleCards();
  listEl.removeAttribute("aria-busy");
  if (!state.login) {
    listEl.innerHTML = '<div class="empty"><strong>Chọn tài khoản để xem gợi ý.</strong>Dùng khung đăng nhập giả lập bên trái.</div>';
    return;
  }
  if (!state.rows.length) {
    return;
  }
  const rows = visibleRows();
  const extras = [
    state.rule ? `quy tắc « ${RULES[state.rule]?.label} »` : "",
    state.segmentIds.length
      ? `phân khúc « ${state.segmentIds.map((id) => state.segments.find((item) => item.id === id)?.name).filter(Boolean).join(", ")} »`
      : "",
    state.rfm.length ? `RFM ${state.rfm.map(rfmLabel).join(", ")}` : ""
  ].filter(Boolean);
  metaEl.textContent = `${rows.length} / ${state.rows.length} khách${extras.length ? ` · ${extras.join(" · ")}` : ""} · gợi ý theo đơn đã giao`;
  if (!rows.length) {
    listEl.innerHTML = '<div class="empty"><strong>Không có khách khớp.</strong>Đổi từ khóa, phân khúc, RFM hoặc bỏ lọc quy tắc.</div>';
    return;
  }
  listEl.innerHTML = rows.map((row) => {
    const selected = row.customer.id === state.focusId;
    const tags = reasonsOf(row).map(ruleBadge).join("");
    const first = row.items[0];
    const rfm = knownRfm(row.rfmSegment || "other");
    return `
      <button type="button" class="mk-row${selected ? " is-selected" : ""}" data-customer="${escapeHtml(row.customer.id)}" aria-pressed="${selected}">
        <span class="mk-avatar" style="background:${avatarFor(row.customer.fullName)}" aria-hidden="true">${escapeHtml(initials(row.customer.fullName))}</span>
        <span class="mk-row-main">
          <span class="mk-row-name">${escapeHtml(row.customer.fullName)}
            <span class="badge ${escapeHtml(row.customer.status)}">${escapeHtml(STATUS_LABELS[row.customer.status] || row.customer.status)}</span>
            <span class="rfm-pill rfm-${escapeHtml(rfm)}">${escapeHtml(rfmLabel(rfm))}</span>
          </span>
          <span class="mk-row-sub">${row.error ? escapeHtml(row.error) : first ? `Gợi ý đầu: ${escapeHtml(first.name)}` : "Chưa có gợi ý phù hợp"}</span>
          <span class="mk-tags">${tags}</span>
        </span>
        <span class="mk-row-count" aria-label="${row.items.length} gợi ý">${row.items.length}</span>
      </button>`;
  }).join("");
}

function selectedIdsOf(row) {
  const available = row.items.map((item) => item.productId);
  const stored = state.selectedByCustomer[row.customer.id];
  if (!stored) {
    return available;
  }
  const allowed = new Set(available);
  return stored.filter((id) => allowed.has(id));
}

function currentRow() {
  return state.rows.find((entry) => entry.customer.id === state.focusId);
}

function updatePickChrome() {
  const row = currentRow();
  const boxes = [...detailEl.querySelectorAll("[data-product]")];
  const checked = boxes.filter((box) => box.checked);
  const selectAll = document.getElementById("mk-select-all");
  if (selectAll) {
    selectAll.checked = boxes.length > 0 && checked.length === boxes.length;
    selectAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
  }
  const count = document.getElementById("mk-pick-count");
  if (count) {
    count.textContent = boxes.length ? `Đã chọn ${checked.length} / ${boxes.length}` : "";
  }
  boxes.forEach((box) => {
    box.closest(".mk-item")?.classList.toggle("is-selected", box.checked);
  });
  const button = document.getElementById("mk-customer-push");
  if (button && row) {
    button.disabled = row.customer.status !== "active" || checked.length === 0;
  }
}

function renderDetail() {
  const row = currentRow();
  if (!row) {
    detailEl.innerHTML = '<div class="empty"><strong>Chưa chọn khách.</strong>Chọn một khách ở danh sách để xem gợi ý.</div>';
    return;
  }
  const active = row.customer.status === "active";
  const selected = new Set(selectedIdsOf(row));
  const items = row.items.map((item) => {
    const on = selected.has(item.productId);
    return `
    <li>
      <label class="mk-item${on ? " is-selected" : ""}">
        <input type="checkbox" data-product="${escapeHtml(item.productId)}" ${on ? "checked" : ""} ${active ? "" : "disabled"}>
        <span class="mk-item-main">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="mk-item-meta">${escapeHtml([item.brandName, item.categoryName, item.genre].filter(Boolean).join(" · "))}${item.platforms?.length ? ` · ${escapeHtml(item.platforms.join(", "))}` : ""}</span>
          <span class="mk-tag"><svg viewBox="0 0 24 24" aria-hidden="true">${RULES[item.reason]?.icon || ""}</svg>${escapeHtml(item.reasonLabel || item.reason)}</span>
        </span>
        <span class="mk-price">${escapeHtml(formatPrice(item.price))}</span>
      </label>
    </li>`;
  }).join("");
  const chosen = selected.size;
  detailEl.innerHTML = `
    <div class="mk-detail-head">
      <span class="mk-avatar is-lg" style="background:${avatarFor(row.customer.fullName)}" aria-hidden="true">${escapeHtml(initials(row.customer.fullName))}</span>
      <div class="mk-detail-title">
        <h2>${escapeHtml(row.customer.fullName)}</h2>
        <p class="hint">${escapeHtml(row.customer.email || "Chưa có email")}
          <span class="badge ${escapeHtml(row.customer.status)}">${escapeHtml(STATUS_LABELS[row.customer.status] || row.customer.status)}</span>
          <span class="rfm-pill rfm-${escapeHtml(knownRfm(row.rfmSegment || "other"))}">${escapeHtml(rfmLabel(row.rfmSegment))}</span>
        </p>
      </div>
    </div>
    ${row.items.length
      ? `<div class="mk-pick">
          <div class="pt-listhead">
            <label class="pt-check">
              <input type="checkbox" id="mk-select-all" ${chosen === row.items.length ? "checked" : ""} ${active ? "" : "disabled"}>
              <span>Chọn tất cả</span>
            </label>
            <span class="pt-listcount" id="mk-pick-count">Đã chọn ${chosen} / ${row.items.length}</span>
          </div>
          <ul class="mk-items" aria-label="Sản phẩm gợi ý. Tick để chọn gửi.">${items}</ul>
        </div>`
      : '<div class="empty"><strong>Chưa có gợi ý.</strong>Danh mục chưa có sản phẩm phù hợp cho khách này.</div>'}
    <div class="mk-push">
      <button type="button" class="btn-primary" id="mk-customer-push" ${active && chosen ? "" : "disabled"}>Đẩy vào hộp thư</button>
    </div>
    <p class="hint" id="mk-customer-result" role="status" aria-live="polite">${active
      ? "Chỉ các sản phẩm đang tick được gửi vào hộp thư in-app của khách."
      : "Khách đã khóa hoặc đã xóa không nhận thư."}</p>`;
  updatePickChrome();
}

function optionBoxes(root) {
  return [...root.querySelectorAll("[data-option]")];
}

function selectedIds(root) {
  return optionBoxes(root).filter((box) => box.checked).map((box) => box.value);
}

function closeMultiPanels() {
  document.querySelectorAll(".multi-select-panel").forEach((panel) => {
    panel.hidden = true;
  });
  document.querySelectorAll(".multi-select-toggle").forEach((toggle) => {
    toggle.setAttribute("aria-expanded", "false");
  });
}

function syncMulti(root) {
  const boxes = optionBoxes(root);
  const all = root.querySelector("[data-select-all]");
  const checked = boxes.filter((box) => box.checked);
  if (all) {
    all.checked = boxes.length > 0 && checked.length === boxes.length;
    all.indeterminate = checked.length > 0 && checked.length < boxes.length;
  }
  const toggle = root.querySelector(".multi-select-toggle");
  if (!checked.length) {
    toggle.textContent = root.dataset.empty;
  } else if (all?.checked) {
    toggle.textContent = "Tất cả";
  } else {
    toggle.textContent = checked.map((box) => box.parentElement.querySelector("span").textContent).join(", ");
  }
}

function clearMulti(root) {
  optionBoxes(root).forEach((box) => {
    box.checked = false;
  });
  const all = root.querySelector("[data-select-all]");
  if (all) {
    all.checked = false;
    all.indeterminate = false;
  }
  syncMulti(root);
}

function readFilters() {
  state.segmentIds = selectedIds(segmentFilterEl);
  state.rfm = selectedIds(rfmFilterEl);
}

function bindMulti(root) {
  const toggle = root.querySelector(".multi-select-toggle");
  const panel = root.querySelector(".multi-select-panel");
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = panel.hidden;
    closeMultiPanels();
    panel.hidden = !willOpen;
    toggle.setAttribute("aria-expanded", String(willOpen));
  });
  panel.addEventListener("click", (event) => event.stopPropagation());
  panel.addEventListener("change", (event) => {
    if (event.target.matches("[data-select-all]")) {
      optionBoxes(root).forEach((box) => {
        box.checked = event.target.checked;
      });
    }
    syncMulti(root);
    readFilters();
    applyFilters();
  });
}

function renderSegments() {
  const previous = new Set(state.segmentIds);
  const container = document.getElementById("mk-segment-options");
  if (!state.segments.length) {
    container.innerHTML = '<p class="hint">Chưa có phân khúc.</p>';
  } else {
    container.innerHTML = state.segments.map((segment) => `
      <label><input type="checkbox" data-option value="${escapeHtml(segment.id)}" ${previous.has(segment.id) ? "checked" : ""}><span>${escapeHtml(segment.name)} (${segment.memberCount})</span></label>
    `).join("");
  }
  readFilters();
  syncMulti(segmentFilterEl);
}

function attachMembership(rows, segments) {
  const byUser = new Map();
  for (const segment of segments) {
    for (const member of segment.members || []) {
      const list = byUser.get(member.userId) || [];
      list.push(segment.id);
      byUser.set(member.userId, list);
    }
  }
  for (const row of rows) {
    row.segmentIds = byUser.get(row.customer.id) || [];
  }
}

function resetListFilters() {
  state.query = "";
  state.segmentIds = [];
  state.rfm = [];
  searchEl.value = "";
  clearMulti(segmentFilterEl);
  clearMulti(rfmFilterEl);
  applyFilters();
}

async function mapInBatches(items, task) {
  const results = [];
  for (let index = 0; index < items.length; index += BATCH_SIZE) {
    const chunk = items.slice(index, index + BATCH_SIZE);
    results.push(...await Promise.all(chunk.map(task)));
  }
  return results;
}

async function loadAll(banner) {
  if (!state.login) {
    state.rows = [];
    metaEl.textContent = "Chọn tài khoản để xem gợi ý sản phẩm cho từng khách.";
    renderList();
    renderDetail();
    entitySwitch.sync();
    return;
  }
  state.loading = true;
  renderSkeleton();
  metaEl.textContent = "Đang tải gợi ý…";
  try {
    const list = await request("/api/customers?includeDeleted=true&pageSize=100");
    const rows = await mapInBatches(list.data || [], async (customer) => {
      const [rec, profile] = await Promise.all([
        request(`/api/crm/customers/${customer.id}/recommendations?limit=${FETCH_LIMIT}`)
          .then((body) => ({ items: body.items || [] }))
          .catch((error) => ({ items: [], error: error.message })),
        request(`/api/crm/profiles/${customer.id}`).catch(() => null)
      ]);
      return {
        customer,
        items: rec.items || [],
        error: rec.error,
        rfmSegment: profile?.rfmSegment || "",
        segmentIds: []
      };
    });
    const segments = await request("/api/segments");
    state.rows = rows;
    state.segments = segments.segments || [];
    attachMembership(state.rows, state.segments);
    if (!rows.some((row) => row.customer.id === state.focusId)) {
      state.focusId = rows[0]?.customer.id || "";
    }
    renderSegments();
    renderList();
    renderDetail();
    entitySwitch.sync();
    const failed = rows.filter((row) => row.error).length;
    if (failed) {
      showBanner("err", `Không tải được gợi ý của ${failed}/${rows.length} khách.`);
    } else {
      showBanner(banner?.type || "ok", banner?.message || `Sẵn sàng  |  ${rows.length} khách`);
    }
  } catch (error) {
    state.rows = [];
    state.segments = [];
    renderSegments();
    listEl.removeAttribute("aria-busy");
    listEl.innerHTML = `<div class="empty"><strong>${escapeHtml(error.message)}</strong></div>`;
    detailEl.innerHTML = '<div class="empty"><strong>Không có dữ liệu.</strong></div>';
    metaEl.textContent = error.message;
    updateRuleCards();
    entitySwitch.sync();
    showBanner("err", error.message);
  } finally {
    state.loading = false;
  }
}

const stackedLayout = window.matchMedia("(max-width: 1024px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function scrollRowIntoView(id) {
  const row = listEl.querySelector(`[data-customer="${CSS.escape(id)}"]`);
  row?.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" });
}

function selectCustomer(id, { reveal = false } = {}) {
  state.focusId = id;
  sessionStorage.setItem("crmMarketingFocusId", id);
  renderList();
  renderDetail();
  entitySwitch.sync();
  scrollRowIntoView(id);
  if (reveal && stackedLayout.matches) {
    detailEl.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
  }
}

function revealCustomer(id) {
  const row = state.rows.find((entry) => entry.customer.id === id);
  if (!row) {
    return;
  }
  if (!visibleRows().some((entry) => entry.customer.id === id)) {
    state.query = "";
    state.segmentIds = [];
    state.rfm = [];
    searchEl.value = "";
    clearMulti(segmentFilterEl);
    clearMulti(rfmFilterEl);
    if (state.rule && !reasonsOf(row).includes(state.rule)) {
      state.rule = "";
    }
  }
  selectCustomer(id, { reveal: true });
}

/** Sau khi lọc: nếu khách đang xem không còn trong danh sách thì chuyển sang khách đầu tiên. */
function applyFilters() {
  const rows = visibleRows();
  if (rows.length && !rows.some((row) => row.customer.id === state.focusId)) {
    state.focusId = rows[0].customer.id;
    sessionStorage.setItem("crmMarketingFocusId", state.focusId);
  }
  renderList();
  renderDetail();
  entitySwitch.sync();
  if (state.focusId) {
    scrollRowIntoView(state.focusId);
  }
}

async function pushCustomer() {
  const row = currentRow();
  const button = document.getElementById("mk-customer-push");
  const resultEl = document.getElementById("mk-customer-result");
  const productIds = selectedIdsOf(row || { customer: {}, items: [] });
  if (!row || !productIds.length) {
    return;
  }
  button.disabled = true;
  button.textContent = "Đang gửi…";
  try {
    const body = await request(
      `/api/crm/customers/${row.customer.id}/recommendations/notify`,
      { method: "POST", body: JSON.stringify({ productIds }) });
    const message = body.sentCount
      ? `Đã đẩy gợi ý vào hộp thư của ${row.customer.fullName}.`
      : `${row.customer.fullName} không nhận thư (khóa, đã xóa hoặc chưa có gợi ý).`;
    resultEl.textContent = message;
    showBanner(body.sentCount ? "ok" : "info", message);
  } catch (error) {
    resultEl.textContent = error.message;
    showBanner("err", error.message);
  } finally {
    button.textContent = "Đẩy vào hộp thư";
    updatePickChrome();
  }
}

listEl.addEventListener("click", (event) => {
  const id = event.target.closest("[data-customer]")?.dataset.customer;
  if (id) {
    selectCustomer(id, { reveal: true });
  }
});

scrollerEl.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }
  const rows = visibleRows();
  const index = rows.findIndex((row) => row.customer.id === state.focusId);
  const next = event.key === "ArrowDown" ? index + 1 : Math.max(index, 0) - 1;
  if (next < 0 || next >= rows.length) {
    return;
  }
  event.preventDefault();
  selectCustomer(rows[next].customer.id);
});

detailEl.addEventListener("click", (event) => {
  if (event.target.closest("#mk-customer-push")) {
    pushCustomer();
  }
});

detailEl.addEventListener("change", (event) => {
  const row = currentRow();
  if (!row) {
    return;
  }
  const selectAll = event.target.closest("#mk-select-all");
  if (selectAll) {
    const on = selectAll.checked;
    state.selectedByCustomer[row.customer.id] = on ? row.items.map((item) => item.productId) : [];
    detailEl.querySelectorAll("[data-product]").forEach((box) => {
      box.checked = on;
    });
    updatePickChrome();
    return;
  }
  if (event.target.closest("[data-product]")) {
    state.selectedByCustomer[row.customer.id] = [...detailEl.querySelectorAll("[data-product]:checked")]
      .map((box) => box.dataset.product);
    updatePickChrome();
  }
});

rulesEl.addEventListener("click", (event) => {
  const key = event.target.closest("[data-rule]")?.dataset.rule;
  if (!key || !state.login) {
    return;
  }
  state.rule = state.rule === key ? "" : key;
  applyFilters();
});

clearRuleEl.addEventListener("click", () => {
  state.rule = "";
  applyFilters();
});

searchEl.addEventListener("input", () => {
  state.query = searchEl.value;
  if (state.rows.length) {
    applyFilters();
  }
});

bindMulti(segmentFilterEl);
bindMulti(rfmFilterEl);
syncMulti(segmentFilterEl);
syncMulti(rfmFilterEl);

filterResetEl.addEventListener("click", resetListFilters);

document.addEventListener("click", (event) => {
  if (event.target.closest(".multi-select")) {
    return;
  }
  closeMultiPanels();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMultiPanels();
  }
});

document.getElementById("reload").addEventListener("click", () => loadAll());
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

const entitySwitch = createEntitySwitch({
  root: "#entity-switch",
  pinKey: "crmMarketingPins",
  recentKey: "crmMarketingRecent",
  denseThreshold: 20,
  labels: {
    noun: "khách",
    switchLabel: "Đổi khách",
    switchPlaceholder: "Tên, email, SĐT, RFM…",
    searchLabel: "Tìm khách",
    paletteTitle: "Tìm khách hàng",
    palettePlaceholder: "Tên, email, SĐT, RFM hoặc phân khúc",
    emptyTitle: "Không có khách khớp.",
    emptyHint: "Thử tên, email, số điện thoại, nhãn RFM hoặc phân khúc."
  },
  getItems: () => state.rows.map((row) => ({
    id: row.customer.id,
    title: row.customer.fullName || "Chưa đặt tên",
    subtitle: [
      row.customer.email,
      row.customer.phone,
      row.rfmSegment ? `RFM ${rfmLabel(row.rfmSegment)}` : "",
      (row.items[0] && `Gợi ý: ${row.items[0].name}`) || ""
    ].filter(Boolean).join(" · "),
    email: row.customer.email || "",
    phone: row.customer.phone || "",
    badge: {
      label: STATUS_LABELS[row.customer.status] || row.customer.status,
      tone: row.customer.status === "active" ? "active" : row.customer.status === "locked" ? "locked" : "scheduled"
    },
    searchText: `${row.customer.fullName} ${row.customer.email || ""} ${row.customer.phone || ""} ${row.rfmSegment || ""} ${rfmLabel(row.rfmSegment)} ${(row.segmentIds || []).map((id) => state.segments.find((segment) => segment.id === id)?.name || "").join(" ")}`,
    sortAt: row.customer.updatedAt || row.customer.createdAt
  })),
  getSelectedId: () => state.focusId,
  isEnabled: () => Boolean(state.login),
  onSelect: (id) => revealCustomer(id)
});

renderRoles();
syncWho();
loadAll();
