const CUSTOMERS = [
  { login: "an", label: "Nguyễn Văn An", note: "Hoạt động — nhận thư", initials: "AN" },
  { login: "binh", label: "Trần Thị Bình", note: "Hoạt động — nhận thư", initials: "TB" },
  { login: "linh", label: "Đặng Mỹ Linh", note: "Hoạt động — nhận thư", initials: "ML" },
  { login: "dung", label: "Phạm Quốc Dũng", note: "Hoạt động — nhận thư", initials: "QD" },
  { login: "chau", label: "Lê Minh Châu", note: "Đã khóa — không nhận thư mới", initials: "MC" },
  { login: "phong", label: "Võ Văn Phong", note: "Đã xóa — không nhận thư mới", initials: "VP" }
];

const KIND = {
  campaign: "Chiến dịch",
  survey: "Khảo sát"
};

const MARK = {
  campaign: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>`,
  survey: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>`
};

const state = {
  login: sessionStorage.getItem("crmCustomerLogin") || ""
};

const rolesEl = document.getElementById("roles");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const inboxEl = document.getElementById("inbox");
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

function currentCustomer() {
  return CUSTOMERS.find((row) => row.login === state.login);
}

function avatarFor(name) {
  const palette = ["#1d4ed8", "#2563eb", "#1e40af", "#3b82f6", "#1e3a8a", "#0369a1"];
  let hash = 0;
  for (const char of String(name)) {
    hash = (hash + char.charCodeAt(0)) % palette.length;
  }
  return palette[hash];
}

function formatWhen(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("vi-VN", { hour12: false });
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

function renderRoles() {
  rolesEl.innerHTML = "";
  CUSTOMERS.forEach((customer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = customer.login === state.login ? "active" : "";
    button.innerHTML = `<span class="actor-dot" style="background:${avatarFor(customer.login)}">${customer.initials}</span><span><strong>${customer.label}</strong><small>${customer.login} / ${customer.login}</small></span>`;
    button.addEventListener("click", () => {
      state.login = customer.login;
      sessionStorage.setItem("crmCustomerLogin", customer.login);
      renderRoles();
      syncWho();
      loadInbox();
    });
    rolesEl.appendChild(button);
  });
}

function letterView(row) {
  const kind = KIND[row.referenceType] || "Thông báo";
  const raw = String(row.content ?? "").trim();
  const mark = " — ";
  const splitAt = raw.indexOf(mark);
  if (splitAt > 0) {
    const title = raw.slice(0, splitAt).trim();
    const body = raw.slice(splitAt + mark.length).trim();
    if (title && body) {
      return { kind, title, body };
    }
  }
  return { kind, title: kind, body: raw || "Không có nội dung." };
}

function mailType(referenceType) {
  return referenceType === "survey" ? "survey" : "campaign";
}

function renderInbox(notifications) {
  inboxEl.replaceChildren();
  if (!notifications.length) {
    const empty = document.createElement("li");
    empty.className = "mail-empty";
    empty.textContent = "Hộp thư trống";
    inboxEl.append(empty);
    return;
  }
  notifications.forEach((row) => {
    const letter = letterView(row);
    const type = mailType(row.referenceType);
    const item = document.createElement("li");
    item.className = `mail-item is-${type}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mail-open";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-label", `Mở thư ${letter.kind}. ${letter.title === letter.kind ? letter.body : `${letter.title}. ${letter.body}`}`);

    const mark = document.createElement("span");
    mark.className = `mail-mark is-${type}`;
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = MARK[type];

    const copy = document.createElement("span");
    copy.className = "mail-copy";

    const top = document.createElement("span");
    top.className = "mail-card-top";
    const badge = document.createElement("span");
    badge.className = `mail-badge is-${type}`;
    badge.textContent = letter.kind;
    const when = document.createElement("time");
    if (row.sentAt) {
      when.dateTime = row.sentAt;
    }
    when.textContent = formatWhen(row.sentAt);
    top.append(badge, when);
    copy.append(top);

    if (letter.title !== letter.kind) {
      const title = document.createElement("span");
      title.className = "mail-subject";
      title.textContent = letter.title;
      copy.append(title);
    }

    const excerpt = document.createElement("span");
    excerpt.className = "mail-excerpt";
    excerpt.textContent = letter.body;
    copy.append(excerpt);

    button.append(mark, copy);
    button.addEventListener("click", () => openLetter(row, letter));
    item.append(button);

    if (row.referenceType === "survey" && row.referenceId) {
      const survey = document.createElement("a");
      survey.className = "btn-primary mail-survey";
      survey.href = `/customer-survey.html?id=${encodeURIComponent(row.referenceId)}`;
      survey.innerHTML = `${MARK.survey}<span>Làm khảo sát</span>`;
      item.append(survey);
    }

    inboxEl.append(item);
  });
}

const letterModal = document.getElementById("letter-modal");
const letterMarkEl = document.getElementById("letter-mark");
const letterKindEl = document.getElementById("letter-kind");
const letterTitleEl = document.getElementById("letter-title");
const letterWhenEl = document.getElementById("letter-when");
const letterBodyEl = document.getElementById("letter-body");
const letterSurveyEl = document.getElementById("letter-survey");
const letterCloseEl = document.getElementById("letter-close");
let letterReturnFocus = null;

function openLetter(row, letter) {
  const type = mailType(row.referenceType);
  letterMarkEl.className = `mail-mark is-${type}`;
  letterMarkEl.innerHTML = MARK[type];
  letterKindEl.className = `mail-badge is-${type}`;
  letterKindEl.textContent = letter.kind;
  letterKindEl.hidden = false;
  letterTitleEl.textContent = letter.title === letter.kind ? letter.body : letter.title;
  letterBodyEl.hidden = letter.title === letter.kind;
  letterBodyEl.textContent = letter.body;
  letterWhenEl.textContent = formatWhen(row.sentAt);
  if (row.referenceType === "survey" && row.referenceId) {
    letterSurveyEl.hidden = false;
    letterSurveyEl.href = `/customer-survey.html?id=${encodeURIComponent(row.referenceId)}`;
  } else {
    letterSurveyEl.hidden = true;
    letterSurveyEl.removeAttribute("href");
  }
  letterReturnFocus = document.activeElement;
  letterModal.hidden = false;
  letterModal.classList.add("is-open");
  letterCloseEl.focus();
}

function closeLetter() {
  if (letterModal.hidden) {
    return;
  }
  letterModal.hidden = true;
  letterModal.classList.remove("is-open");
  if (letterReturnFocus && typeof letterReturnFocus.focus === "function") {
    letterReturnFocus.focus();
  }
}

letterModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-letter]")) {
    closeLetter();
  }
});

document.addEventListener("keydown", (event) => {
  if (letterModal.hidden) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeLetter();
    return;
  }
  if (event.key !== "Tab") {
    return;
  }
  const focusable = [...letterModal.querySelectorAll("button, a[href]")].filter((node) => !node.hidden);
  if (!focusable.length) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

async function loadInbox() {
  closeLetter();
  const customer = currentCustomer();
  if (!customer) {
    metaEl.textContent = "Chọn một khách bên trái, rồi bấm một thư để đọc.";
    inboxEl.innerHTML = "";
    showBanner("", "");
    return;
  }
  try {
    const body = await request("/api/notifications");
    const notifications = body.notifications || [];
    const surveys = notifications.filter((row) => row.referenceType === "survey").length;
    const campaigns = notifications.filter((row) => row.referenceType === "campaign").length;
    metaEl.textContent = `${customer.label}: ${notifications.length} thư (${campaigns} chiến dịch, ${surveys} khảo sát). ${customer.note}.`;
    renderInbox(notifications);
    showBanner("ok", `Đang xem hộp thư của ${customer.label}.`);
  } catch (error) {
    metaEl.textContent = customer.note;
    inboxEl.innerHTML = "";
    showBanner("bad", error.message);
  }
}

document.getElementById("reload").addEventListener("click", loadInbox);
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

renderRoles();
syncWho();
loadInbox();
