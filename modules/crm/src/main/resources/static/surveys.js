const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Tạo khảo sát được", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Tạo khảo sát được", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Tạo khảo sát được", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Ngoài CRM — 403", initials: "KD" }
];

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  surveyId: null,
  status: "draft",
  questions: [],
  segments: [],
  segmentIds: [],
  dragFrom: null
};

const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");
const titleEl = document.getElementById("title");
const descriptionEl = document.getElementById("description");
const segmentMulti = document.getElementById("segment-multi");
const segmentOptionsEl = document.getElementById("segment-options");
const pickerEl = document.getElementById("survey-picker");
const listEl = document.getElementById("question-list");
const previewEl = document.getElementById("preview");
const previewModal = document.getElementById("preview-modal");
const previewFullEl = document.getElementById("preview-full-body");

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

function isDraft() {
  return !state.status || state.status === "draft";
}

function blankQuestion(type = "text") {
  return {
    key: crypto.randomUUID(),
    questionText: "",
    uiType: type,
    options: type === "multiple_choice" ? ["", ""] : type === "yes_no" ? ["Có", "Không"] : []
  };
}

function uiTypeOf(question) {
  const options = question.options || [];
  if (question.answerType === "multiple_choice" && options.length === 2 && options[0] === "Có" && options[1] === "Không") {
    return "yes_no";
  }
  if (question.answerType === "rating") {
    return "rating";
  }
  if (question.answerType === "multiple_choice") {
    return "multiple_choice";
  }
  return "text";
}

function readCard(card) {
  const index = Number(card.dataset.index);
  const question = state.questions[index];
  if (!question) {
    return;
  }
  question.questionText = card.querySelector("[data-text]").value;
  question.uiType = card.querySelector("[data-type]").value;
  if (question.uiType === "yes_no") {
    question.options = ["Có", "Không"];
  } else if (question.uiType === "multiple_choice") {
    question.options = [...card.querySelectorAll("[data-option]")].map((input) => input.value);
    if (question.options.length < 2) {
      question.options = ["", ""];
    }
  } else {
    question.options = [];
  }
}

function typeControls(question, index) {
  if (question.uiType === "rating") {
    const stars = [1, 2, 3, 4, 5].map((star) => `<span class="survey-star" aria-hidden="true">${star}</span>`).join("");
    return `<div class="survey-stars">${stars}<span>1–5 sao</span></div>`;
  }
  if (question.uiType === "yes_no") {
    return `<div class="survey-yesno"><span class="survey-yes">Có</span><span class="survey-yes">Không</span></div>`;
  }
  if (question.uiType === "multiple_choice") {
    const fields = question.options.map((option, optionIndex) => `
      <input data-option="${optionIndex}" value="${escapeHtml(option)}" placeholder="Lựa chọn ${optionIndex + 1}" ${isDraft() ? "" : "disabled"}>
    `).join("");
    const add = isDraft() ? `<button class="survey-linkish" type="button" data-add-option="${index}">+ Thêm lựa chọn</button>` : "";
    return `<div class="survey-options">${fields}${add}</div>`;
  }
  return "";
}

function renderQuestions() {
  if (!state.questions.length) {
    listEl.innerHTML = `<p class="hint">Chưa có câu hỏi. Bấm « Thêm câu hỏi ».</p>`;
    renderPreview();
    return;
  }
  listEl.innerHTML = state.questions.map((question, index) => `
    <article class="survey-q" data-index="${index}" draggable="${isDraft()}">
      <button class="survey-grip" type="button" data-grip="${index}" aria-label="Kéo câu ${index + 1}" ${isDraft() ? "" : "disabled"}>⋮⋮</button>
      <div class="survey-q-main">
        <div class="survey-q-line">
          <label>
            Câu hỏi
            <input data-text value="${escapeHtml(question.questionText)}" placeholder="Nội dung câu hỏi" ${isDraft() ? "" : "disabled"}>
          </label>
          <select class="survey-type" data-type ${isDraft() ? "" : "disabled"}>
            <option value="rating" ${question.uiType === "rating" ? "selected" : ""}>Rating</option>
            <option value="multiple_choice" ${question.uiType === "multiple_choice" ? "selected" : ""}>Multiple choice</option>
            <option value="yes_no" ${question.uiType === "yes_no" ? "selected" : ""}>Yes/No</option>
            <option value="text" ${question.uiType === "text" ? "selected" : ""}>Text tự do</option>
          </select>
          ${isDraft() ? `<button class="btn-danger" type="button" data-remove="${index}" aria-label="Xóa câu">Xóa</button>` : ""}
        </div>
        ${typeControls(question, index)}
      </div>
    </article>
  `).join("");
  renderPreview();
}

function previewBlock(question) {
  const label = escapeHtml(question.questionText || "Câu hỏi");
  if (question.uiType === "rating") {
    return `<div class="survey-preview-block"><p>${label}</p><div class="survey-stars">${[1, 2, 3, 4, 5].map(() => `<span class="survey-star">★</span>`).join("")}</div></div>`;
  }
  if (question.uiType === "yes_no") {
    return `<div class="survey-preview-block"><p>${label}</p><div class="survey-yesno"><span class="survey-yes">Có</span><span class="survey-yes">Không</span></div></div>`;
  }
  if (question.uiType === "multiple_choice") {
    const options = (question.options || []).filter((option) => option.trim());
    const rows = (options.length ? options : ["Lựa chọn"]).map((option) => `<label><input type="checkbox" disabled> ${escapeHtml(option)}</label>`).join("");
    return `<div class="survey-preview-block"><p>${label}</p>${rows}</div>`;
  }
  return `<div class="survey-preview-block"><p>${label}</p><input placeholder="Gửi phản hồi" disabled></div>`;
}

function renderPreview() {
  const title = escapeHtml(titleEl.value.trim() || "Tên khảo sát");
  const blocks = state.questions.length
    ? state.questions.map(previewBlock).join("")
    : `<p class="hint">Thêm câu hỏi để xem khách sẽ thấy gì.</p>`;
  const html = `<h3>${title}</h3>${blocks}<button class="btn-primary" type="button" disabled>Gửi phản hồi</button>`;
  previewEl.innerHTML = html;
  previewFullEl.innerHTML = html;
}

function setAudienceLocked(locked) {
  segmentMulti.classList.toggle("is-disabled", locked);
  segmentMulti.querySelector(".multi-select-toggle").disabled = locked;
  segmentMulti.querySelectorAll("input").forEach((input) => {
    input.disabled = locked;
  });
}

function applyAudience(ids) {
  const wanted = new Set((ids || []).map(String));
  optionBoxes(segmentMulti).forEach((box) => {
    box.checked = wanted.has(box.value);
  });
  syncMulti(segmentMulti);
  setAudienceLocked(state.status === "closed");
}

function setLocked(locked) {
  const archived = state.status === "closed";
  titleEl.disabled = locked;
  descriptionEl.disabled = archived;
  setAudienceLocked(archived);
  document.getElementById("add-question").hidden = locked;
  document.getElementById("save-draft").hidden = archived;
  document.getElementById("archive-survey").hidden = archived;
  document.getElementById("send-inbox").hidden = archived;
}

function fillSurvey(survey) {
  state.surveyId = survey.id;
  state.status = survey.status;
  titleEl.value = survey.title || "";
  descriptionEl.value = survey.description || "";
  state.segmentIds = survey.segmentIds || [];
  state.questions = (survey.questions || []).map((question) => ({
    key: question.id,
    questionText: question.questionText,
    uiType: uiTypeOf(question),
    options: question.options?.length ? [...question.options] : []
  }));
  setLocked(!isDraft());
  metaEl.textContent = isDraft()
    ? "Bản nháp. Lưu phiếu, rồi gửi thẳng vào hòm thư khách hoặc đưa vào lưu trữ."
    : state.status === "closed"
      ? "Phiếu đang ở kho lưu trữ. Chỉ xem, không sửa."
      : "Phiếu đã gửi. Sửa được mô tả và đối tượng đã chọn. Câu hỏi giữ nguyên.";
  renderQuestions();
  applyAudience(state.segmentIds);
}

function resetDraft() {
  state.surveyId = null;
  state.status = "draft";
  titleEl.value = "";
  descriptionEl.value = "";
  state.segmentIds = [];
  state.questions = [
    blankQuestion("rating"),
    blankQuestion("multiple_choice"),
    blankQuestion("yes_no"),
    blankQuestion("text")
  ];
  setLocked(false);
  metaEl.textContent = "Soạn phiếu, xem trước như khách, rồi gửi vào hòm thư.";
  renderQuestions();
  applyAudience([]);
}

function payloadOf(question) {
  if (question.uiType === "rating") {
    return { questionText: question.questionText.trim(), answerType: "rating" };
  }
  if (question.uiType === "yes_no") {
    return { questionText: question.questionText.trim(), answerType: "multiple_choice", options: ["Có", "Không"] };
  }
  if (question.uiType === "multiple_choice") {
    return {
      questionText: question.questionText.trim(),
      answerType: "multiple_choice",
      options: question.options.map((option) => option.trim()).filter(Boolean)
    };
  }
  return { questionText: question.questionText.trim(), answerType: "text" };
}

function validate() {
  if (!titleEl.value.trim()) {
    throw new Error("Nhập tên khảo sát.");
  }
  state.questions.forEach((question, index) => {
    if (!question.questionText.trim()) {
      throw new Error(`Câu ${index + 1} chưa có nội dung.`);
    }
    if (question.uiType === "multiple_choice") {
      const options = question.options.map((option) => option.trim()).filter(Boolean);
      if (options.length < 2) {
        throw new Error(`Câu ${index + 1} cần ít nhất hai lựa chọn.`);
      }
    }
  });
}

async function saveDraft() {
  if (!state.login) {
    throw new Error("Hãy chọn tài khoản trước.");
  }
  if (state.status === "closed") {
    throw new Error("Phiếu đã lưu trữ, không sửa được.");
  }
  const segmentIds = selectedIds(segmentMulti);
  if (!isDraft()) {
    if (!titleEl.value.trim()) {
      throw new Error("Nhập tên khảo sát.");
    }
    const survey = await request(`/api/surveys/${state.surveyId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: titleEl.value.trim(),
        description: descriptionEl.value.trim(),
        segmentIds
      })
    });
    fillSurvey(survey);
    return survey;
  }
  listEl.querySelectorAll(".survey-q").forEach(readCard);
  validate();
  const body = {
    title: titleEl.value.trim(),
    description: descriptionEl.value.trim(),
    segmentIds
  };
  let survey = state.surveyId
    ? await request(`/api/surveys/${state.surveyId}`, { method: "PUT", body: JSON.stringify(body) })
    : await request("/api/surveys", { method: "POST", body: JSON.stringify(body) });
  state.surveyId = survey.id;
  const pending = state.questions.map((question) => ({
    key: question.key,
    questionText: question.questionText,
    uiType: question.uiType,
    options: [...(question.options || [])]
  }));
  const existing = new Map((survey.questions || []).map((question) => [question.id, question]));
  for (const question of existing.values()) {
    if (!pending.some((item) => item.key === question.id)) {
      survey = await request(`/api/surveys/${survey.id}/questions/${question.id}`, { method: "DELETE" });
    }
  }
  for (const [index, question] of pending.entries()) {
    const payload = { ...payloadOf(question), sortOrder: index + 1 };
    survey = existing.has(question.key)
      ? await request(`/api/surveys/${survey.id}/questions/${question.key}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      })
      : await request(`/api/surveys/${survey.id}/questions`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
  }
  fillSurvey(survey);
  return survey;
}

async function loadPicker(selectId) {
  const body = state.login ? await request("/api/surveys") : { surveys: [] };
  const surveys = body.surveys || [];
  pickerEl.innerHTML = `<option value="">Phiếu mới</option>` + surveys.map((survey) => `
    <option value="${survey.id}">${escapeHtml(survey.title)}</option>
  `).join("");
  pickerEl.value = selectId || "";
}

function optionBoxes(root) {
  return [...root.querySelectorAll("[data-option]")];
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

function selectedIds(root) {
  return optionBoxes(root).filter((box) => box.checked).map((box) => box.value);
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
    document.querySelectorAll(".multi-select-panel").forEach((other) => {
      other.hidden = true;
    });
    document.querySelectorAll(".multi-select-toggle").forEach((other) => {
      other.setAttribute("aria-expanded", "false");
    });
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

function fillOptions(container, rows, emptyLabel) {
  if (!rows.length) {
    container.innerHTML = `<p class="hint">${emptyLabel}</p>`;
    return;
  }
  container.innerHTML = rows.map((row) => `
    <label><input type="checkbox" data-option value="${row.id}"><span>${escapeHtml(row.name)}</span></label>
  `).join("");
}

async function loadLookups() {
  if (!state.login) {
    fillOptions(segmentOptionsEl, [], "Chọn tài khoản trước.");
    syncMulti(segmentMulti);
    return;
  }
  const segments = await request("/api/segments");
  state.segments = segments.segments || [];
  fillOptions(segmentOptionsEl, state.segments, "Chưa có phân khúc.");
  applyAudience(state.segmentIds);
}

async function loadAll() {
  if (!state.login) {
    metaEl.textContent = "Chọn tài khoản bên trái để soạn khảo sát.";
    resetDraft();
    pickerEl.innerHTML = `<option value="">Phiếu mới</option>`;
    return;
  }
  try {
    await loadLookups();
    const requestedId = new URLSearchParams(location.search).get("id");
    await loadPicker(requestedId || state.surveyId || "");
    if (requestedId) {
      fillSurvey(await request(`/api/surveys/${requestedId}`));
    } else if (!state.surveyId) {
      resetDraft();
    }
    showBanner("ok", "Sẵn sàng soạn khảo sát.");
  } catch (error) {
    showBanner("err", error.message);
  }
}

document.getElementById("add-question").addEventListener("click", () => {
  if (!isDraft()) {
    return;
  }
  listEl.querySelectorAll(".survey-q").forEach(readCard);
  state.questions.push(blankQuestion("text"));
  renderQuestions();
});

listEl.addEventListener("input", (event) => {
  const card = event.target.closest(".survey-q");
  if (!card) {
    return;
  }
  readCard(card);
  renderPreview();
});

listEl.addEventListener("change", (event) => {
  const card = event.target.closest(".survey-q");
  if (!card || !event.target.matches("[data-type]")) {
    return;
  }
  readCard(card);
  const question = state.questions[Number(card.dataset.index)];
  if (question.uiType === "multiple_choice" && question.options.length < 2) {
    question.options = ["", ""];
  }
  if (question.uiType === "yes_no") {
    question.options = ["Có", "Không"];
  }
  renderQuestions();
});

listEl.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove]");
  if (remove) {
    listEl.querySelectorAll(".survey-q").forEach(readCard);
    state.questions.splice(Number(remove.dataset.remove), 1);
    renderQuestions();
    return;
  }
  const addOption = event.target.closest("[data-add-option]");
  if (addOption) {
    listEl.querySelectorAll(".survey-q").forEach(readCard);
    state.questions[Number(addOption.dataset.addOption)].options.push("");
    renderQuestions();
  }
});

listEl.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".survey-q");
  if (!card || !isDraft()) {
    return;
  }
  state.dragFrom = Number(card.dataset.index);
});

listEl.addEventListener("dragover", (event) => {
  const card = event.target.closest(".survey-q");
  if (!card) {
    return;
  }
  event.preventDefault();
  card.classList.add("is-over");
});

listEl.addEventListener("dragleave", (event) => {
  event.target.closest(".survey-q")?.classList.remove("is-over");
});

listEl.addEventListener("drop", (event) => {
  const card = event.target.closest(".survey-q");
  if (!card || state.dragFrom == null) {
    return;
  }
  event.preventDefault();
  listEl.querySelectorAll(".survey-q").forEach(readCard);
  const to = Number(card.dataset.index);
  const [moved] = state.questions.splice(state.dragFrom, 1);
  state.questions.splice(to, 0, moved);
  state.dragFrom = null;
  renderQuestions();
});

titleEl.addEventListener("input", renderPreview);

pickerEl.addEventListener("change", async () => {
  if (!pickerEl.value) {
    resetDraft();
    return;
  }
  try {
    fillSurvey(await request(`/api/surveys/${pickerEl.value}`));
  } catch (error) {
    showBanner("err", error.message);
  }
});

document.getElementById("save-draft").addEventListener("click", async () => {
  try {
    const saved = await saveDraft();
    await loadPicker(saved.id);
    showBanner("ok", `Đã lưu « ${saved.title} ».`);
  } catch (error) {
    showBanner("err", error.message);
  }
});

document.getElementById("archive-survey").addEventListener("click", async () => {
  const button = document.getElementById("archive-survey");
  if (button.disabled) {
    return;
  }
  button.disabled = true;
  try {
    if (!state.surveyId || isDraft()) {
      await saveDraft();
    }
    const archived = await request(`/api/surveys/${state.surveyId}/archive`, { method: "POST" });
    await loadPicker(archived.id);
    fillSurvey(archived);
    showBanner("ok", `Đã lưu trữ « ${archived.title} ».`);
  } catch (error) {
    showBanner("err", error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("preview-full").addEventListener("click", () => {
  listEl.querySelectorAll(".survey-q").forEach(readCard);
  renderPreview();
  previewModal.hidden = false;
  previewModal.classList.add("is-open");
});

previewModal.querySelectorAll("[data-close-preview]").forEach((element) => {
  element.addEventListener("click", () => {
    previewModal.hidden = true;
    previewModal.classList.remove("is-open");
  });
});

document.getElementById("send-inbox").addEventListener("click", async (event) => {
  event.preventDefault();
  const button = event.currentTarget;
  if (button.disabled) {
    return;
  }
  button.disabled = true;
  try {
    const saved = await saveDraft();
    if (!saved?.id) {
      throw new Error("Hãy lưu phiếu trước khi gửi.");
    }
    const segmentIds = selectedIds(segmentMulti);
    if (!segmentIds.length) {
      throw new Error("Chọn ít nhất một đối tượng.");
    }
    const sent = await request(`/api/surveys/${saved.id}/inbox`, {
      method: "POST",
      body: JSON.stringify({ segmentIds })
    });
    await loadPicker(sent.survey.id);
    fillSurvey(sent.survey);
    const skipped = sent.skipped || [];
    const skipText = skipped.length
      ? ` Bỏ ${skipped.length} khách khóa hoặc đã xóa.`
      : "";
    showBanner("ok", `Đã gửi vào hòm thư của ${sent.sentCount} khách.${skipText}`);
  } catch (error) {
    showBanner("err", error.message);
  } finally {
    button.disabled = state.status === "closed";
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
});
bindMulti(segmentMulti);
syncWho();
renderRoles();
loadAll();
