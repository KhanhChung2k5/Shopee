const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Xem thống kê được", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Xem thống kê được", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Story 7 — xem được", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Ngoài CRM — 403", initials: "KD" }
];

const STATUS_ORDER = [
  { id: "sent", label: "Đang gửi", tone: "active" },
  { id: "closed", label: "Đã kết thúc", tone: "locked" },
  { id: "draft", label: "Bản nháp", tone: "scheduled" }
];

const ANSWER_TYPE = {
  text: "Tự luận",
  rating: "Điểm 1–5",
  multiple_choice: "Trắc nghiệm"
};

const PIN_KEY = "crmSurveyPins";
const RECENT_KEY = "crmSurveyRecent";
const QUICK_LIMIT = 5;
const PALETTE_THRESHOLD = 80;

const PIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"/><path d="M9 4h6v2H9z"/><path d="M8 6h8l-1 5.2a2 2 0 0 0 .4 1.6L17 15H7l1.6-2.2a2 2 0 0 0 .4-1.6z"/></svg>';

const params = new URLSearchParams(location.search);

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  surveys: [],
  surveyId: params.get("id") || sessionStorage.getItem("crmSurveyStatsId") || "",
  filter: "",
  comboOpen: false,
  active: 0,
  comboFlat: [],
  paletteOpen: false,
  paletteFrom: "",
  paletteTo: "",
  paletteActive: 0,
  paletteFlat: []
};

const rowsEl = document.getElementById("rows");
const kpisEl = document.getElementById("kpis");
const ratingKpisEl = document.getElementById("rating-kpis");
const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");
const switchEl = document.getElementById("survey-switch");
const quickEl = document.getElementById("survey-quick");
const comboWrap = document.getElementById("survey-combo");
const comboControl = document.getElementById("survey-combo-control");
const comboInput = document.getElementById("survey-combo-input");
const comboToggle = document.getElementById("survey-combo-toggle");
const comboList = document.getElementById("survey-combo-list");
const comboStatus = document.getElementById("survey-combo-status");
const pinCurrent = document.getElementById("pin-current");
const paletteTrigger = document.getElementById("palette-trigger");
const paletteEl = document.getElementById("palette");
const paletteQuery = document.getElementById("palette-query");
const paletteFrom = document.getElementById("palette-from");
const paletteTo = document.getElementById("palette-to");
const paletteClear = document.getElementById("palette-clear");
const paletteResults = document.getElementById("palette-results");
const paletteKbd = document.getElementById("palette-kbd");

let paletteReturn = null;
let statsToken = 0;

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

async function request(path) {
  const response = await fetch(path, { headers: { ...authHeader() } });
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
    button.innerHTML = `<span><strong>${role.label}</strong><small>${role.login} / ${role.login}</small></span>`;
    button.addEventListener("click", () => {
      state.login = role.login;
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

function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function formatDate(value) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function localDay(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function statusMeta(status) {
  return STATUS_ORDER.find((item) => item.id === status) || STATUS_ORDER[2];
}

function readIds(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(key, ids) {
  localStorage.setItem(key, JSON.stringify(ids));
}

function existing(ids) {
  const known = new Map(state.surveys.map((survey) => [survey.id, survey]));
  return ids.map((id) => known.get(id)).filter(Boolean);
}

function isPinned(id) {
  return readIds(PIN_KEY).includes(id);
}

function selectedSurvey() {
  return state.surveys.find((survey) => survey.id === state.surveyId) || null;
}

function byNewest(items) {
  return [...items].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

function quickSurveys() {
  const pins = existing(readIds(PIN_KEY)).map((survey) => ({ survey, pinned: true }));
  const pinIds = new Set(pins.map((item) => item.survey.id));
  const recent = existing(readIds(RECENT_KEY))
    .filter((survey) => !pinIds.has(survey.id))
    .map((survey) => ({ survey, pinned: false }));
  return [...pins, ...recent].slice(0, QUICK_LIMIT);
}

function statusGroups(pool) {
  return STATUS_ORDER.map((group) => ({
    label: group.label,
    items: byNewest(pool.filter((survey) => (survey.status || "draft") === group.id))
  })).filter((group) => group.items.length);
}

function labeledGroups(pool) {
  const poolIds = new Set(pool.map((survey) => survey.id));
  const pinned = existing(readIds(PIN_KEY)).filter((survey) => poolIds.has(survey.id));
  const pinnedIds = new Set(pinned.map((survey) => survey.id));
  const recent = existing(readIds(RECENT_KEY)).filter((survey) => poolIds.has(survey.id) && !pinnedIds.has(survey.id));
  const used = new Set([...pinned, ...recent].map((survey) => survey.id));
  const groups = [];
  if (pinned.length) {
    groups.push({ label: "Đã ghim", items: pinned });
  }
  if (recent.length) {
    groups.push({ label: "Gần đây", items: recent });
  }
  statusGroups(pool.filter((survey) => !used.has(survey.id))).forEach((group) => groups.push(group));
  return groups;
}

function matchesName(survey, query) {
  const needle = fold(query.trim());
  if (!needle) {
    return true;
  }
  return fold(survey.title).includes(needle);
}

function inDateRange(survey) {
  if (!state.paletteFrom && !state.paletteTo) {
    return true;
  }
  const day = localDay(survey.createdAt);
  if (!day) {
    return false;
  }
  if (state.paletteFrom && day < state.paletteFrom) {
    return false;
  }
  if (state.paletteTo && day > state.paletteTo) {
    return false;
  }
  return true;
}

function matchesPalette(survey, query) {
  const needle = fold(query.trim());
  if (needle) {
    const meta = statusMeta(survey.status);
    const hay = fold(`${survey.title} ${survey.description || ""} ${meta.label} ${formatDate(survey.createdAt)}`);
    if (!hay.includes(needle)) {
      return false;
    }
  }
  return inDateRange(survey);
}

function comboGroups() {
  const matched = state.surveys.filter((survey) => matchesName(survey, state.filter));
  if (!state.filter.trim()) {
    const quickIds = new Set(quickSurveys().map((item) => item.survey.id));
    const rest = matched.filter((survey) => !quickIds.has(survey.id));
    return statusGroups(rest.length ? rest : matched);
  }
  return labeledGroups(matched);
}

function highlight(text, query) {
  const source = String(text ?? "");
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return escapeHtml(source);
  }
  const lower = source.toLowerCase();
  let html = "";
  let from = 0;
  let at = lower.indexOf(needle, from);
  if (at < 0) {
    return escapeHtml(source);
  }
  while (at >= 0) {
    html += escapeHtml(source.slice(from, at));
    html += `<mark>${escapeHtml(source.slice(at, at + needle.length))}</mark>`;
    from = at + needle.length;
    at = lower.indexOf(needle, from);
  }
  return html + escapeHtml(source.slice(from));
}

function renderOptions(container, groups, prefix, highlightQuery, showDescription) {
  const flat = [];
  const activeIndex = prefix === "combo" ? state.active : state.paletteActive;
  if (!groups.length) {
    const hint = showDescription
      ? "Thử một phần tên khác, hoặc nới khoảng ngày."
      : "Thử một phần tên khác.";
    container.innerHTML = `<div class="pick-empty" role="status"><strong>Không có phiếu khớp.</strong> ${hint}</div>`;
    return flat;
  }
  const html = groups.map((group) => {
    const options = group.items.map((survey) => {
      const index = flat.length;
      flat.push(survey);
      const meta = statusMeta(survey.status);
      const pinned = isPinned(survey.id);
      const active = index === activeIndex;
      const current = survey.id === state.surveyId;
      const extra = showDescription && survey.description ? ` · ${survey.description}` : "";
      return `
        <div class="pick-option${active ? " is-active" : ""}${current ? " is-current" : ""}" role="option" id="${prefix}-${survey.id}" data-id="${escapeHtml(survey.id)}" data-index="${index}" aria-selected="${active ? "true" : "false"}">
          <button type="button" class="pin-btn${pinned ? " is-on" : ""}" data-pin="${escapeHtml(survey.id)}" aria-pressed="${pinned ? "true" : "false"}" aria-label="${pinned ? "Bỏ ghim" : "Ghim"} ${escapeHtml(survey.title || "phiếu này")}">${PIN_SVG}</button>
          <span class="pick-copy">
            <strong>${highlight(survey.title || "Chưa đặt tên", highlightQuery)}</strong>
            <small>Tạo ${escapeHtml(formatDate(survey.createdAt))}${escapeHtml(extra)}</small>
          </span>
          <span class="badge ${meta.tone}">${escapeHtml(meta.label)}</span>
        </div>`;
    }).join("");
    return `<div class="pick-group" role="presentation" aria-hidden="true">${escapeHtml(group.label)}</div>${options}`;
  }).join("");
  container.innerHTML = html;
  return flat;
}

function paintActive(container, prefix, flat, activeIndex, scroll) {
  container.querySelectorAll(".pick-option").forEach((option) => {
    const on = Number(option.dataset.index) === activeIndex;
    option.classList.toggle("is-active", on);
    option.setAttribute("aria-selected", on ? "true" : "false");
  });
  const input = prefix === "combo" ? comboInput : paletteQuery;
  const survey = flat[activeIndex];
  if (!survey) {
    input.removeAttribute("aria-activedescendant");
    return;
  }
  input.setAttribute("aria-activedescendant", `${prefix}-${survey.id}`);
  if (scroll) {
    container.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }
}

function bindPickList(container, mode) {
  container.addEventListener("mousedown", (event) => event.preventDefault());
  container.addEventListener("click", (event) => {
    const pin = event.target.closest("[data-pin]");
    if (pin) {
      togglePin(pin.dataset.pin);
      return;
    }
    const option = event.target.closest("[data-id]");
    if (option) {
      selectSurvey(option.dataset.id);
    }
  });
  container.addEventListener("mouseover", (event) => {
    const option = event.target.closest("[data-index]");
    if (!option) {
      return;
    }
    const index = Number(option.dataset.index);
    if (mode === "combo") {
      if (!state.comboOpen || index === state.active) {
        return;
      }
      state.active = index;
      paintActive(container, "combo", state.comboFlat, state.active, false);
      return;
    }
    if (!state.paletteOpen || index === state.paletteActive) {
      return;
    }
    state.paletteActive = index;
    paintActive(container, "palette", state.paletteFlat, state.paletteActive, false);
  });
}

function placeComboList() {
  const rect = comboControl.getBoundingClientRect();
  const width = Math.min(440, Math.max(rect.width, 320));
  const left = Math.min(rect.left, window.innerWidth - width - 12);
  const below = window.innerHeight - rect.bottom - 12;
  comboList.style.width = `${width}px`;
  comboList.style.left = `${Math.max(12, left)}px`;
  if (below < 180 && rect.top > below) {
    const height = Math.max(160, Math.min(320, rect.top - 12));
    comboList.style.maxHeight = `${height}px`;
    comboList.style.top = `${Math.max(12, rect.top - height - 4)}px`;
    return;
  }
  comboList.style.maxHeight = `${Math.max(160, Math.min(320, below))}px`;
  comboList.style.top = `${rect.bottom + 4}px`;
}

function renderComboList() {
  comboList.hidden = false;
  const selectedIndex = () => {
    const groups = comboGroups();
    state.comboFlat = renderOptions(comboList, groups, "combo", state.filter, false);
    if (!state.filter.trim() && state.surveyId) {
      const index = state.comboFlat.findIndex((survey) => survey.id === state.surveyId);
      if (index >= 0) {
        state.active = index;
        paintActive(comboList, "combo", state.comboFlat, state.active, false);
      }
    }
    const count = state.comboFlat.length;
    comboStatus.textContent = count ? `${count} phiếu` : "Không có phiếu khớp";
    if (state.comboFlat.length) {
      state.active = Math.min(state.active, state.comboFlat.length - 1);
      paintActive(comboList, "combo", state.comboFlat, state.active, false);
    } else {
      comboInput.removeAttribute("aria-activedescendant");
    }
  };
  selectedIndex();
  placeComboList();
}

function openCombo() {
  if (comboInput.disabled) {
    return;
  }
  const already = state.comboOpen;
  state.comboOpen = true;
  comboInput.setAttribute("aria-expanded", "true");
  comboToggle.setAttribute("aria-expanded", "true");
  if (!already) {
    state.filter = "";
    state.active = 0;
    comboInput.value = "";
    const current = selectedSurvey();
    comboInput.placeholder = current ? current.title : "Gõ tên phiếu…";
  }
  renderComboList();
}

function closeCombo() {
  state.comboOpen = false;
  state.filter = "";
  comboList.hidden = true;
  comboInput.setAttribute("aria-expanded", "false");
  comboToggle.setAttribute("aria-expanded", "false");
  comboInput.removeAttribute("aria-activedescendant");
  const survey = selectedSurvey();
  comboInput.value = survey ? survey.title : "";
  comboInput.placeholder = "Gõ tên phiếu…";
}

function moveCombo(step) {
  if (!state.comboFlat.length) {
    return;
  }
  const last = state.comboFlat.length - 1;
  state.active = Math.min(last, Math.max(0, state.active + step));
  paintActive(comboList, "combo", state.comboFlat, state.active, true);
}

function renderQuick() {
  const items = quickSurveys();
  if (!items.length) {
    quickEl.hidden = true;
    quickEl.innerHTML = "";
    return;
  }
  quickEl.hidden = false;
  quickEl.innerHTML = `<p class="survey-quick-label">Ghim và xem gần đây</p>` + items.map(({ survey, pinned }) => {
    const current = survey.id === state.surveyId ? " is-current" : "";
    const pin = pinned ? `<span class="quick-pin" aria-hidden="true">${PIN_SVG}</span>` : "";
    const kind = pinned ? "Đã ghim" : "Xem gần đây";
    return `<button type="button" class="quick-chip${current}" data-quick="${escapeHtml(survey.id)}" aria-label="${kind}: ${escapeHtml(survey.title || "Chưa đặt tên")}">${pin}<span>${escapeHtml(survey.title || "Chưa đặt tên")}</span></button>`;
  }).join("");
}

function syncPinButton() {
  const survey = selectedSurvey();
  const pinned = survey ? isPinned(survey.id) : false;
  pinCurrent.disabled = !survey;
  pinCurrent.classList.toggle("is-on", pinned);
  pinCurrent.setAttribute("aria-pressed", pinned ? "true" : "false");
  pinCurrent.setAttribute("aria-label", pinned ? "Bỏ ghim phiếu đang xem" : "Ghim phiếu đang xem");
}

function syncSwitcher() {
  const dense = state.surveys.length >= PALETTE_THRESHOLD;
  switchEl.classList.toggle("is-dense", dense);
  const survey = selectedSurvey();
  const label = paletteTrigger.querySelector("[data-palette-label]");
  label.textContent = dense && survey ? survey.title : "Tìm phiếu";
  const canPick = Boolean(state.login) && state.surveys.length > 0;
  comboInput.disabled = !canPick;
  comboToggle.disabled = !canPick;
  paletteTrigger.disabled = !state.login;
  syncPinButton();
  if (state.comboOpen && canPick && !dense) {
    renderComboList();
  } else if (dense) {
    closeCombo();
  } else if (!state.comboOpen) {
    comboInput.value = survey ? survey.title : "";
  }
  renderQuick();
  if (state.paletteOpen) {
    renderPalette();
  }
}

function pushRecent(id) {
  if (!id) {
    return;
  }
  writeIds(RECENT_KEY, [id, ...readIds(RECENT_KEY).filter((item) => item !== id)].slice(0, QUICK_LIMIT));
}

function togglePin(id) {
  if (!id) {
    return;
  }
  const pins = readIds(PIN_KEY);
  writeIds(PIN_KEY, pins.includes(id) ? pins.filter((item) => item !== id) : [id, ...pins]);
  syncSwitcher();
}

function rememberUrl(id) {
  const url = new URL(location.href);
  if (id) {
    url.searchParams.set("id", id);
    sessionStorage.setItem("crmSurveyStatsId", id);
  } else {
    url.searchParams.delete("id");
    sessionStorage.removeItem("crmSurveyStatsId");
  }
  history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function selectSurvey(id) {
  if (!id) {
    return;
  }
  const changed = id !== state.surveyId;
  const fromPalette = state.paletteOpen;
  state.surveyId = id;
  rememberUrl(id);
  pushRecent(id);
  closeCombo();
  closePalette(false);
  if (fromPalette) {
    paletteTrigger.focus();
  } else if (document.activeElement === comboInput) {
    comboInput.blur();
  }
  syncSwitcher();
  if (changed) {
    loadStats();
  }
}

function dateRangeError() {
  if (state.paletteFrom && state.paletteTo && state.paletteFrom > state.paletteTo) {
    return "Ngày bắt đầu đang sau ngày kết thúc.";
  }
  return "";
}

function renderPalette() {
  const error = dateRangeError();
  paletteClear.hidden = !state.paletteFrom && !state.paletteTo;
  if (error) {
    state.paletteFlat = [];
    paletteResults.innerHTML = `<div class="pick-empty" role="status"><strong>${escapeHtml(error)}</strong>Đổi lại khoảng ngày tạo.</div>`;
    paletteQuery.removeAttribute("aria-activedescendant");
    return;
  }
  const query = paletteQuery.value;
  const matched = state.surveys.filter((survey) => matchesPalette(survey, query));
  state.paletteFlat = renderOptions(paletteResults, labeledGroups(matched), "palette", query, true);
  if (!state.paletteFlat.length) {
    paletteQuery.removeAttribute("aria-activedescendant");
    return;
  }
  state.paletteActive = Math.min(state.paletteActive, state.paletteFlat.length - 1);
  paintActive(paletteResults, "palette", state.paletteFlat, state.paletteActive, false);
}

function openPalette() {
  if (paletteTrigger.disabled) {
    return;
  }
  closeCombo();
  paletteReturn = document.activeElement;
  state.paletteOpen = true;
  state.paletteActive = 0;
  paletteEl.hidden = false;
  paletteQuery.setAttribute("aria-expanded", "true");
  renderPalette();
  paletteQuery.focus();
}

function closePalette(restore = true) {
  if (!state.paletteOpen) {
    return;
  }
  state.paletteOpen = false;
  paletteEl.hidden = true;
  paletteQuery.setAttribute("aria-expanded", "false");
  paletteQuery.removeAttribute("aria-activedescendant");
  const back = paletteReturn;
  paletteReturn = null;
  if (restore && back && back !== document.body) {
    back.focus();
  }
}

function movePalette(step) {
  if (!state.paletteFlat.length) {
    return;
  }
  const last = state.paletteFlat.length - 1;
  state.paletteActive = Math.min(last, Math.max(0, state.paletteActive + step));
  paintActive(paletteResults, "palette", state.paletteFlat, state.paletteActive, true);
}

function percentOf(count, total) {
  if (!total) {
    return 0;
  }
  return Math.round((count * 1000) / total) / 10;
}

function ratingAverage(question) {
  const buckets = question.buckets || [];
  let sum = 0;
  let count = 0;
  for (const bucket of buckets) {
    const score = Number(bucket.value);
    if (!Number.isFinite(score)) {
      continue;
    }
    const n = Number(bucket.count) || 0;
    sum += score * n;
    count += n;
  }
  if (!count) {
    return null;
  }
  return Math.round((sum / count) * 100) / 100;
}

function formatAverage(average) {
  return average.toFixed(2).replace(/\.?0+$/, "");
}

function ratingTone(average) {
  if (average == null) {
    return "is-muted";
  }
  if (average >= 3.5) {
    return "is-ok";
  }
  return "is-warn";
}

function ratingFoot(question, average) {
  if (average == null || !question.answerCount) {
    return "Chưa có đánh giá";
  }
  if (average < 3.5) {
    return "Cần theo dõi";
  }
  return `${question.answerCount} đánh giá`;
}

function ratingCard(question) {
  const average = ratingAverage(question);
  const tone = ratingTone(average);
  const value = average == null ? "—/5" : `${formatAverage(average)}/5`;
  const label = question.questionText || "Câu đánh giá 1–5";
  return `
    <article class="rating-kpi-card ${tone}" aria-label="${escapeHtml(label)}: ${escapeHtml(value)}">
      <span class="rating-kpi-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
      <strong class="rating-kpi-value">${escapeHtml(value)}</strong>
      <span class="rating-kpi-foot">${escapeHtml(ratingFoot(question, average))}</span>
    </article>`;
}

function bucketChart(question) {
  const buckets = question.buckets || [];
  if (!buckets.length) {
    const texts = question.texts || [];
    if (!texts.length) {
      return `<p class="hint">Chưa có câu trả lời.</p>`;
    }
    return `<ul class="answer-list">${texts.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul>`;
  }
  const rows = buckets.map((bucket) => {
    const percent = percentOf(bucket.count, question.answerCount);
    return `
      <div class="hbar is-static">
        <span class="hbar-name" title="${escapeHtml(bucket.value)}">${escapeHtml(bucket.value)}</span>
        <span class="hbar-track"><span class="hbar-fill" style="width:${percent}%"></span></span>
        <span class="hbar-value">${bucket.count} · ${percent.toFixed(1)}%</span>
      </div>`;
  });
  return `<div class="hbar-chart">${rows.join("")}</div>`;
}

function renderStats(stats) {
  const completionClass = stats.completionPercent >= 50 ? "is-ok" : "is-warn";
  kpisEl.innerHTML = `
    <article class="kpi-card"><span>Thư mời đã gửi</span><strong>${stats.invitedCount}</strong></article>
    <article class="kpi-card"><span>Phiếu đã nộp</span><strong>${stats.submittedCount}</strong></article>
    <article class="kpi-card ${completionClass}"><span>Tỷ lệ hoàn thành</span><strong>${stats.completionPercent}%</strong></article>
  `;
  const questions = stats.questions || [];
  const ratingQuestions = questions.filter((question) => question.answerType === "rating");
  if (ratingQuestions.length) {
    ratingKpisEl.hidden = false;
    ratingKpisEl.innerHTML = ratingQuestions.map(ratingCard).join("");
  } else {
    ratingKpisEl.hidden = true;
    ratingKpisEl.innerHTML = "";
  }
  if (!questions.length) {
    rowsEl.innerHTML = `<div class="empty"><strong>Phiếu chưa có câu hỏi.</strong>Thêm câu ở trang Khảo sát rồi gửi lại.</div>`;
    return;
  }
  rowsEl.innerHTML = questions.map((question, index) => {
    const kind = ANSWER_TYPE[question.answerType] || question.answerType;
    return `
      <article class="dash-card" style="--bar:var(--chart-1)">
        <h2>${index + 1}. ${escapeHtml(question.questionText)}</h2>
        <p class="hint">${escapeHtml(kind)} · ${question.answerCount} câu trả lời</p>
        ${bucketChart(question)}
      </article>`;
  }).join("");
}

function clearBoard(message) {
  kpisEl.innerHTML = "";
  ratingKpisEl.hidden = true;
  ratingKpisEl.innerHTML = "";
  rowsEl.innerHTML = message;
}

async function loadStats() {
  const token = ++statsToken;
  if (!state.login || !state.surveyId) {
    clearBoard(state.login
      ? `<div class="empty"><strong>Chưa chọn phiếu.</strong>Mở « Xem thống kê » từ Quản lý khảo sát, hoặc gõ tên ở ô Đổi phiếu.</div>`
      : "");
    metaEl.textContent = state.login
      ? "Chọn một phiếu để xem tỷ lệ hoàn thành và kết quả từng câu."
      : "Chọn tài khoản, rồi mở thống kê từ Quản lý khảo sát.";
    return;
  }
  try {
    const stats = await request(`/api/surveys/${state.surveyId}/stats`);
    if (token !== statsToken) {
      return;
    }
    renderStats(stats);
    const survey = selectedSurvey();
    metaEl.textContent = survey
      ? `${survey.title}: ${stats.submittedCount}/${stats.invitedCount} khách đã nộp.`
      : `${stats.submittedCount}/${stats.invitedCount} khách đã nộp.`;
    showBanner("ok", `Hoàn thành ${stats.completionPercent}%`);
  } catch (error) {
    if (token !== statsToken) {
      return;
    }
    clearBoard(`<div class="empty"><strong>${escapeHtml(error.message)}</strong></div>`);
    metaEl.textContent = "";
    showBanner("err", error.message);
  }
}

async function loadSurveys() {
  syncSwitcher();
  if (!state.login) {
    closeCombo();
    closePalette();
    clearBoard(`<div class="empty"><strong>Chọn tài khoản để tải thống kê.</strong>Dùng khung đăng nhập giả lập bên trái.</div>`);
    metaEl.textContent = "Chọn tài khoản, rồi mở thống kê từ Quản lý khảo sát.";
    showBanner("", "");
    return;
  }
  try {
    const body = await request("/api/surveys");
    state.surveys = body.surveys || [];
    if (state.surveyId && !state.surveys.some((survey) => survey.id === state.surveyId)) {
      state.surveyId = "";
      rememberUrl("");
      showBanner("err", "Không tìm thấy phiếu này.");
    } else if (state.surveyId) {
      pushRecent(state.surveyId);
    }
    syncSwitcher();
    if (!state.surveys.length) {
      clearBoard(`<div class="empty"><strong>Chưa có khảo sát.</strong>Tạo phiếu ở trang Khảo sát, gửi cho khách, rồi quay lại đây.</div>`);
      metaEl.textContent = "Chưa có phiếu để thống kê.";
      showBanner("ok", "Danh sách khảo sát trống.");
      return;
    }
    await loadStats();
  } catch (error) {
    state.surveys = [];
    syncSwitcher();
    clearBoard(`<div class="empty"><strong>${escapeHtml(error.message)}</strong></div>`);
    metaEl.textContent = "";
    showBanner("err", error.message);
  }
}

paletteKbd.textContent = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";

comboInput.addEventListener("focus", () => {
  if (switchEl.classList.contains("is-dense")) {
    return;
  }
  openCombo();
});

comboInput.addEventListener("input", () => {
  if (comboInput.disabled) {
    return;
  }
  state.filter = comboInput.value;
  state.active = 0;
  if (!state.comboOpen) {
    state.comboOpen = true;
    comboInput.setAttribute("aria-expanded", "true");
    comboToggle.setAttribute("aria-expanded", "true");
  }
  renderComboList();
});

comboInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!state.comboOpen) {
      openCombo();
    } else {
      moveCombo(1);
    }
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!state.comboOpen) {
      openCombo();
    } else {
      moveCombo(-1);
    }
    return;
  }
  if (event.key === "Home" && state.comboOpen) {
    event.preventDefault();
    state.active = 0;
    paintActive(comboList, "combo", state.comboFlat, state.active, true);
    return;
  }
  if (event.key === "End" && state.comboOpen) {
    event.preventDefault();
    state.active = Math.max(0, state.comboFlat.length - 1);
    paintActive(comboList, "combo", state.comboFlat, state.active, true);
    return;
  }
  if (event.key === "Enter" && state.comboOpen) {
    event.preventDefault();
    const survey = state.comboFlat[state.active];
    if (survey) {
      selectSurvey(survey.id);
    }
    return;
  }
  if (event.key === "Escape" && state.comboOpen) {
    event.preventDefault();
    closeCombo();
    comboInput.blur();
  }
});

comboInput.addEventListener("blur", () => {
  setTimeout(() => {
    if (!comboWrap.contains(document.activeElement)) {
      closeCombo();
    }
  }, 0);
});

comboToggle.addEventListener("mousedown", (event) => event.preventDefault());
comboToggle.addEventListener("click", () => {
  if (comboInput.disabled) {
    return;
  }
  if (state.comboOpen) {
    closeCombo();
    comboInput.blur();
    return;
  }
  comboInput.focus();
});

pinCurrent.addEventListener("click", () => {
  if (state.surveyId) {
    togglePin(state.surveyId);
  }
});

quickEl.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-quick]");
  if (chip) {
    selectSurvey(chip.dataset.quick);
  }
});

paletteTrigger.addEventListener("click", openPalette);
paletteEl.querySelectorAll("[data-close-palette]").forEach((el) => {
  el.addEventListener("click", closePalette);
});

paletteQuery.addEventListener("input", () => {
  state.paletteActive = 0;
  renderPalette();
});

function syncPaletteDates() {
  state.paletteFrom = paletteFrom.value || "";
  state.paletteTo = paletteTo.value || "";
  state.paletteActive = 0;
  renderPalette();
}

paletteFrom.addEventListener("input", syncPaletteDates);
paletteFrom.addEventListener("change", syncPaletteDates);
paletteTo.addEventListener("input", syncPaletteDates);
paletteTo.addEventListener("change", syncPaletteDates);

paletteClear.addEventListener("click", () => {
  paletteFrom.value = "";
  paletteTo.value = "";
  syncPaletteDates();
  paletteQuery.focus();
});

paletteQuery.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    movePalette(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    movePalette(-1);
    return;
  }
  if (event.key === "Home") {
    event.preventDefault();
    state.paletteActive = 0;
    paintActive(paletteResults, "palette", state.paletteFlat, state.paletteActive, true);
    return;
  }
  if (event.key === "End") {
    event.preventDefault();
    state.paletteActive = Math.max(0, state.paletteFlat.length - 1);
    paintActive(paletteResults, "palette", state.paletteFlat, state.paletteActive, true);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    const survey = state.paletteFlat[state.paletteActive];
    if (survey) {
      selectSurvey(survey.id);
    }
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (state.paletteOpen) {
      closePalette();
    } else {
      openPalette();
    }
    return;
  }
  if (event.key === "Escape" && state.paletteOpen && !event.defaultPrevented) {
    event.preventDefault();
    closePalette();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!state.comboOpen) {
    return;
  }
  if (comboWrap.contains(event.target) || comboList.contains(event.target)) {
    return;
  }
  closeCombo();
});

window.addEventListener("resize", () => {
  if (state.comboOpen) {
    placeComboList();
  }
});
window.addEventListener("scroll", () => {
  if (state.comboOpen) {
    placeComboList();
  }
}, true);

document.getElementById("reload").addEventListener("click", loadSurveys);
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

bindPickList(comboList, "combo");
bindPickList(paletteResults, "palette");
renderRoles();
syncWho();
loadSurveys();
