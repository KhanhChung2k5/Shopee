const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Gửi chiến dịch được", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Gửi chiến dịch được", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Gửi chiến dịch được", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Ngoài CRM — 403", initials: "KD" }
];

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  campaignId: null,
  deliveryStatus: "",
  originalSchedule: "",
  customers: [],
  segments: [],
  recipientOffset: 0
};

const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");
const nameEl = document.getElementById("name");
const contentEl = document.getElementById("content");
const scheduleEl = document.getElementById("schedule");
const scheduleHintEl = document.getElementById("schedule-hint");
const reachEl = document.getElementById("reach");
const submitEl = document.getElementById("submit-campaign");
const deleteEl = document.getElementById("delete-campaign");
const pickerEl = document.getElementById("campaign-picker");
const segmentMulti = document.getElementById("segment-multi");
const segmentOptionsEl = document.getElementById("segment-options");
const customerEl = document.getElementById("customer");
const inboxEl = document.getElementById("inbox");
const inboxMetaEl = document.getElementById("inbox-meta");
const inboxSection = document.getElementById("inbox-section");
const recipientsSection = document.getElementById("recipients-section");
const detailReachEl = document.getElementById("detail-reach");
const detailRecipientsEl = document.getElementById("detail-recipients");
const detailMoreEl = document.getElementById("detail-more");
const confirmModal = document.getElementById("confirm-modal");
const confirmTextEl = document.getElementById("confirm-text");

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
      sessionStorage.setItem("crmLogin", role.login);
      syncWho();
      renderRoles();
      loadAll();
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

function statusLabel(status) {
  if (status === "locked") return "khóa";
  if (status === "deleted") return "đã xóa";
  return "đang hoạt động";
}

function toLocalInput(iso) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function optionBoxes(root) {
  return [...root.querySelectorAll("[data-option]")];
}

function selectedIds(root) {
  return optionBoxes(root).filter((box) => box.checked).map((box) => box.value);
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
  showReach();
}

function bindMulti(root) {
  const toggle = root.querySelector(".multi-select-toggle");
  const panel = root.querySelector(".multi-select-panel");
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (toggle.disabled) {
      return;
    }
    const willOpen = panel.hidden;
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
  });
}

function setSegmentsLocked(locked) {
  segmentMulti.classList.toggle("is-disabled", locked);
  segmentMulti.querySelector(".multi-select-toggle").disabled = locked;
  segmentMulti.querySelectorAll("input").forEach((input) => {
    input.disabled = locked;
  });
}

function checkSegments(ids) {
  const wanted = new Set(ids || []);
  optionBoxes(segmentMulti).forEach((box) => {
    box.checked = wanted.has(box.value);
  });
  syncMulti(segmentMulti);
}

function showReach() {
  const ids = selectedIds(segmentMulti);
  if (!ids.length) {
    reachEl.textContent = "Chọn phân khúc để xem số khách đang hoạt động sẽ nhận thông báo.";
    return;
  }
  const chosen = state.segments.filter((segment) => ids.includes(segment.id));
  const total = chosen.reduce((sum, segment) => sum + (segment.memberCount || 0), 0);
  const names = chosen.map((segment) => segment.name).join(", ");
  reachEl.textContent = ids.length === 1
    ? `Ước tính ${total} khách đang hoạt động trong « ${names} » sẽ nhận thông báo. Khách khóa và đã xóa không nằm trong số này.`
    : `Ước tính ${total} khách trên ${ids.length} phân khúc (${names}). Số này có thể trùng nếu một khách thuộc nhiều phân khúc.`;
}

function syncScheduleButton() {
  const sent = state.deliveryStatus === "sent";
  scheduleEl.disabled = sent;
  document.getElementById("clear-schedule").disabled = sent;
  if (state.campaignId) {
    submitEl.textContent = "Lưu chỉnh sửa";
    scheduleHintEl.textContent = sent
      ? "Chiến dịch đã gửi. Có thể sửa tên và nội dung, không đổi được lịch."
      : "Xóa giờ của chiến dịch chưa gửi thì thư được phát ngay khi lưu.";
    return;
  }
  const chosen = scheduleEl.value ? new Date(scheduleEl.value) : null;
  submitEl.textContent = chosen && chosen.getTime() > Date.now() ? "Lên lịch gửi" : "Gửi trong app";
  scheduleHintEl.textContent = "Để trống để gửi ngay. Chọn giờ trong tương lai thì thư vào hộp thư đúng lịch.";
}

function resetDraft() {
  state.campaignId = null;
  state.deliveryStatus = "";
  state.originalSchedule = "";
  state.recipientOffset = 0;
  nameEl.value = "Chăm sóc 18–24";
  contentEl.value = "Bạn có ưu đãi mới trong ứng dụng.";
  scheduleEl.value = "";
  nameEl.disabled = false;
  contentEl.disabled = false;
  deleteEl.hidden = true;
  recipientsSection.hidden = true;
  inboxSection.hidden = true;
  setSegmentsLocked(false);
  checkSegments([]);
  metaEl.textContent = "Chọn phân khúc rồi gửi trong app.";
  syncScheduleButton();
}

function fillCampaign(campaign) {
  state.campaignId = campaign.id;
  state.deliveryStatus = campaign.deliveryStatus || "sent";
  state.originalSchedule = toLocalInput(campaign.startAt);
  nameEl.value = campaign.name || "";
  contentEl.value = campaign.content || "";
  scheduleEl.value = state.originalSchedule;
  nameEl.disabled = false;
  contentEl.disabled = false;
  deleteEl.hidden = false;
  recipientsSection.hidden = false;
  inboxSection.hidden = false;
  setSegmentsLocked(true);
  checkSegments(campaign.segmentIds || []);
  metaEl.textContent = state.deliveryStatus === "scheduled"
    ? "Đã lên lịch. Sửa tên, nội dung hoặc giờ gửi, rồi lưu."
    : "Đã gửi. Sửa tên và nội dung thư trong hộp thư, rồi lưu.";
  syncScheduleButton();
}

function renderCustomers() {
  const previous = customerEl.value;
  customerEl.innerHTML = "";
  state.customers.forEach((customer) => {
    const option = document.createElement("option");
    option.value = customer.id;
    option.textContent = `${customer.fullName} · ${statusLabel(customer.status)}`;
    customerEl.appendChild(option);
  });
  const binh = state.customers.find((customer) => customer.fullName === "Trần Thị Bình");
  if (previous && state.customers.some((customer) => customer.id === previous)) {
    customerEl.value = previous;
  } else if (binh) {
    customerEl.value = binh.id;
  }
}

function renderInbox(notifications) {
  inboxEl.innerHTML = "";
  const customer = state.customers.find((row) => row.id === customerEl.value);
  const name = customer ? customer.fullName : "khách";
  if (!notifications.length) {
    inboxMetaEl.textContent = `${name} chưa có thông báo.`;
    inboxEl.innerHTML = `<li><span>Hộp thư trống</span></li>`;
    return;
  }
  inboxMetaEl.textContent = `${name} có ${notifications.length} thông báo.`;
  notifications.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${escapeHtml(row.content)}</span><span>${escapeHtml(row.referenceType)} · ${escapeHtml(row.status)}</span>`;
    inboxEl.appendChild(item);
  });
}

async function loadPicker(selectId) {
  const body = state.login ? await request("/api/campaigns") : { campaigns: [] };
  const campaigns = body.campaigns || [];
  pickerEl.innerHTML = `<option value="">Chiến dịch mới</option>` + campaigns.map((campaign) => `
    <option value="${campaign.id}">${escapeHtml(campaign.name)}</option>
  `).join("");
  pickerEl.value = selectId || "";
}

async function loadLookups() {
  const [segments, customers] = await Promise.all([
    request("/api/segments"),
    request("/api/customers?includeDeleted=true&pageSize=50")
  ]);
  state.segments = segments.segments || [];
  state.customers = customers.data || [];
  if (!state.segments.length) {
    segmentOptionsEl.innerHTML = `<p class="hint">Chưa có phân khúc — tạo ở trang Phân khúc.</p>`;
  } else {
    segmentOptionsEl.innerHTML = state.segments.map((segment) => `
      <label><input type="checkbox" data-option value="${segment.id}"><span>${escapeHtml(segment.name)} (${segment.memberCount})</span></label>
    `).join("");
  }
  syncMulti(segmentMulti);
  renderCustomers();
}

async function loadInbox() {
  if (!customerEl.value) {
    inboxMetaEl.textContent = "Chưa có khách để xem.";
    inboxEl.innerHTML = "";
    return;
  }
  const body = await request(`/api/notifications?userId=${encodeURIComponent(customerEl.value)}`);
  const campaignMail = (body.notifications || []).filter((row) => row.referenceType === "campaign");
  renderInbox(campaignMail);
}

async function loadRecipients(reset) {
  if (!state.campaignId) {
    return;
  }
  if (reset) {
    state.recipientOffset = 0;
    detailRecipientsEl.innerHTML = "";
  }
  const body = await request(
    `/api/campaigns/${state.campaignId}/recipients?offset=${state.recipientOffset}&limit=10`
  );
  const waiting = (body.recipients || []).some((row) => row.status === "scheduled");
  detailReachEl.textContent = `${waiting ? "Sẽ gửi cho" : "Đã gửi cho"} ${body.total} người.`;
  (body.recipients || []).forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${escapeHtml(row.fullName)}</span><span>${row.status === "scheduled" ? "chờ gửi" : "đã gửi"}</span>`;
    detailRecipientsEl.appendChild(item);
  });
  state.recipientOffset += (body.recipients || []).length;
  detailMoreEl.hidden = state.recipientOffset >= body.total;
}

async function openCampaign(id) {
  const campaign = await request(`/api/campaigns/${id}`);
  fillCampaign(campaign);
  history.replaceState(null, "", `/campaign-edit.html?id=${encodeURIComponent(id)}`);
  await loadRecipients(true);
}

async function loadAll() {
  if (!state.login) {
    metaEl.textContent = "Chọn tài khoản bên trái để soạn chiến dịch.";
    showBanner("info", "Chọn tài khoản ở cột trái trước khi gửi.");
    resetDraft();
    pickerEl.innerHTML = `<option value="">Chiến dịch mới</option>`;
    return;
  }
  try {
    await loadLookups();
    const params = new URLSearchParams(location.search);
    const requestedId = params.get("id");
    await loadPicker(requestedId || state.campaignId || "");
    if (requestedId) {
      await openCampaign(requestedId);
    } else if (!state.campaignId) {
      resetDraft();
      const linked = params.getAll("segmentId");
      if (linked.length) {
        checkSegments(linked);
        if (linked.length > 1) {
          showBanner("ok", `Phiếu gắn ${linked.length} phân khúc. Gửi sẽ dùng tất cả.`);
        }
      }
    }
    await loadInbox();
    if (!params.getAll("segmentId").length || requestedId) {
      showBanner("", "");
    }
  } catch (error) {
    showBanner("err", error.message);
  }
}

document.getElementById("campaign-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitEl.disabled) {
    return;
  }
  const name = nameEl.value.trim();
  const content = contentEl.value.trim();
  submitEl.disabled = true;
  try {
    if (state.campaignId) {
      const body = { name, content };
      if (scheduleEl.value !== state.originalSchedule) {
        body.startAt = scheduleEl.value
          ? new Date(scheduleEl.value).toISOString()
          : new Date().toISOString();
      }
      const updated = await request(`/api/campaigns/${state.campaignId}`, {
        method: "PUT",
        body: JSON.stringify(body)
      });
      await loadPicker(updated.id);
      fillCampaign(updated);
      await loadRecipients(true);
      await loadInbox();
      showBanner("ok", "Đã cập nhật chiến dịch.");
      return;
    }
    const segmentIds = selectedIds(segmentMulti);
    if (!segmentIds.length) {
      throw new Error("Hãy chọn ít nhất một phân khúc.");
    }
    const payload = { name, segmentIds, content };
    if (scheduleEl.value) {
      payload.startAt = new Date(scheduleEl.value).toISOString();
    }
    const created = await request("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const skipped = (created.skipped || []).map((row) => `${row.fullName} (${statusLabel(row.status)})`).join(", ");
    await loadPicker(created.id);
    fillCampaign(created);
    await loadRecipients(true);
    await loadInbox();
    if (created.deliveryStatus === "scheduled") {
      showBanner("ok", "Đã lên lịch. Thư chưa vào hộp thư.");
      return;
    }
    showBanner("ok", skipped
      ? `Đã gửi ${created.sentCount} thông báo. Không gửi cho khách khóa hoặc đã xóa: ${skipped}.`
      : `Đã gửi ${created.sentCount} thông báo. Không loại khách nào vì khóa hoặc đã xóa.`);
  } catch (error) {
    showBanner("err", error.message);
  } finally {
    submitEl.disabled = false;
  }
});

pickerEl.addEventListener("change", async () => {
  if (!pickerEl.value) {
    history.replaceState(null, "", "/campaign-edit.html");
    resetDraft();
    return;
  }
  try {
    await openCampaign(pickerEl.value);
  } catch (error) {
    showBanner("err", error.message);
  }
});

scheduleEl.addEventListener("input", syncScheduleButton);
document.getElementById("clear-schedule").addEventListener("click", () => {
  scheduleEl.value = "";
  syncScheduleButton();
  scheduleEl.focus();
});

detailMoreEl.addEventListener("click", async () => {
  try {
    await loadRecipients(false);
  } catch (error) {
    showBanner("err", error.message);
  }
});

customerEl.addEventListener("change", async () => {
  try {
    await loadInbox();
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

deleteEl.addEventListener("click", () => {
  if (!state.campaignId) {
    return;
  }
  confirmTextEl.textContent = `Xóa « ${nameEl.value.trim() || "chiến dịch này"} »? Thư đã gửi cho khách cũng mất.`;
  openDialog(confirmModal);
});

confirmModal.querySelectorAll("[data-close-confirm]").forEach((el) => {
  el.addEventListener("click", () => closeDialog(confirmModal));
});

document.getElementById("confirm-delete").addEventListener("click", async () => {
  const id = state.campaignId;
  const title = nameEl.value.trim() || "chiến dịch";
  closeDialog(confirmModal);
  if (!id) {
    return;
  }
  try {
    await request(`/api/campaigns/${id}`, { method: "DELETE" });
    history.replaceState(null, "", "/campaign-edit.html");
    await loadPicker("");
    resetDraft();
    await loadInbox();
    showBanner("ok", `Đã xóa « ${title} ».`);
  } catch (error) {
    showBanner("err", error.message);
  }
});

document.getElementById("reload").addEventListener("click", loadAll);
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});
document.addEventListener("click", () => {
  document.querySelectorAll(".multi-select-panel").forEach((panel) => {
    panel.hidden = true;
  });
  document.querySelectorAll(".multi-select-toggle").forEach((toggle) => {
    toggle.setAttribute("aria-expanded", "false");
  });
});

bindMulti(segmentMulti);
syncWho();
renderRoles();
loadAll();
