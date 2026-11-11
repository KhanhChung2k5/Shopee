const CUSTOMERS = [
  { login: "an", label: "Nguyễn Văn An", note: "Hoạt động", initials: "AN" },
  { login: "binh", label: "Trần Thị Bình", note: "Hoạt động", initials: "TB" },
  { login: "linh", label: "Đặng Mỹ Linh", note: "Hoạt động", initials: "ML" },
  { login: "dung", label: "Phạm Quốc Dũng", note: "Hoạt động", initials: "QD" },
  { login: "chau", label: "Lê Minh Châu", note: "Đã khóa", initials: "MC" },
  { login: "phong", label: "Võ Văn Phong", note: "Đã xóa", initials: "VP" }
];

const state = {
  login: sessionStorage.getItem("crmCustomerLogin") || "",
  surveyId: new URLSearchParams(location.search).get("id") || ""
};

const rolesEl = document.getElementById("roles");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const formEl = document.getElementById("sheet");
const bannerEl = document.getElementById("banner");

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
      ...authHeader(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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

function currentCustomer() {
  return CUSTOMERS.find((row) => row.login === state.login);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function answerOf(sheet, questionId) {
  return (sheet.answers || []).find((row) => row.questionId === questionId)?.answerText || "";
}

function questionField(question, saved, locked) {
  const name = `q-${question.id}`;
  const disabled = locked ? "disabled" : "";
  if (question.answerType === "rating") {
    const stars = [1, 2, 3, 4, 5].map((score) => {
      const checked = saved === String(score) ? "checked" : "";
      return `<label class="survey-star survey-star-pick">${score}<input type="radio" name="${name}" value="${score}" ${checked} ${disabled} required></label>`;
    }).join("");
    return `<div class="survey-stars">${stars}</div>`;
  }
  if (question.answerType === "multiple_choice") {
    return `<div class="survey-options">${(question.options || []).map((option) => {
      const checked = saved === option ? "checked" : "";
      return `<label class="survey-choice-pick">${escapeHtml(option)}<input type="radio" name="${name}" value="${escapeHtml(option)}" ${checked} ${disabled} required></label>`;
    }).join("")}</div>`;
  }
  return `<textarea name="${name}" rows="3" placeholder="Gửi phản hồi" ${disabled} required>${escapeHtml(saved)}</textarea>`;
}

function renderSheet(sheet) {
  const locked = sheet.submitted || sheet.status !== "sent";
  const note = sheet.submitted
    ? "Bạn đã gửi phiếu này. Câu trả lời chỉ để xem lại."
    : sheet.status === "closed"
      ? "Phiếu đã lưu trữ, không nộp thêm được."
      : (sheet.description || "Trả lời các câu rồi gửi.");
  const questions = (sheet.questions || []).map((question, index) => `
    <div class="survey-preview-block">
      <p>${index + 1}. ${escapeHtml(question.questionText)}</p>
      ${questionField(question, answerOf(sheet, question.id), locked)}
    </div>`).join("");
  formEl.innerHTML = `
    <h3>${escapeHtml(sheet.title)}</h3>
    <p class="hint">${escapeHtml(note)}</p>
    ${questions}
    ${locked ? "" : `<button class="btn-primary" type="submit">Gửi câu trả lời</button>`}`;
  formEl.hidden = false;
}

function renderRoles() {
  rolesEl.innerHTML = "";
  CUSTOMERS.forEach((customer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = customer.login === state.login ? "active" : "";
    button.innerHTML = `<span><strong>${customer.label}</strong><small>${customer.login} / ${customer.login} · ${customer.note}</small></span>`;
    button.addEventListener("click", () => {
      state.login = customer.login;
      sessionStorage.setItem("crmCustomerLogin", customer.login);
      renderRoles();
      syncWho();
      loadSheet();
    });
    rolesEl.appendChild(button);
  });
}

function syncWho() {
  const customer = currentCustomer();
  const avatar = document.querySelector(".who-avatar");
  if (customer) {
    whoEl.textContent = `${customer.label} (${customer.login})`;
    avatar.textContent = customer.initials;
  } else {
    whoEl.textContent = "Chưa chọn khách";
    avatar.textContent = "?";
  }
}

async function loadSheet() {
  const customer = currentCustomer();
  if (!state.surveyId) {
    metaEl.textContent = "Mở phiếu từ hộp thư.";
    formEl.hidden = true;
    showBanner("bad", "Thiếu mã khảo sát. Quay lại hộp thư và bấm Làm khảo sát.");
    return;
  }
  if (!customer) {
    metaEl.textContent = "Chọn khách bên trái để mở phiếu.";
    formEl.hidden = true;
    showBanner("", "");
    return;
  }
  try {
    const sheet = await request(`/api/surveys/${state.surveyId}/sheet`);
    metaEl.textContent = `${customer.label} · ${sheet.submitted ? "Đã nộp" : "Chưa nộp"}`;
    renderSheet(sheet);
    showBanner("ok", `Đang mở phiếu của ${customer.label}.`);
  } catch (error) {
    formEl.hidden = true;
    metaEl.textContent = customer.note;
    showBanner("bad", error.message);
  }
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(formEl);
  const answers = [];
  for (const [key, value] of data.entries()) {
    if (!key.startsWith("q-")) {
      continue;
    }
    answers.push({ questionId: key.slice(2), answerText: String(value).trim() });
  }
  try {
    await request(`/api/surveys/${state.surveyId}/responses`, {
      method: "POST",
      body: JSON.stringify({ answers })
    });
    showBanner("ok", "Đã gửi khảo sát.");
    await loadSheet();
  } catch (error) {
    showBanner("bad", error.message);
  }
});

document.getElementById("reload").addEventListener("click", loadSheet);
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

renderRoles();
syncWho();
loadSheet();
