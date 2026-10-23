(() => {
  const SESSION_KEY = "crmSession";
  const LOGIN_KEY = "crmLogin";
  const LAST_LOGIN_KEY = "crmLastLogin";

  const STAFF_PAGES = [
    "home.html",
    "index.html",
    "conversations.html",
    "profiles.html",
    "campaigns.html",
    "campaign-edit.html",
    "surveys.html",
    "survey-edit.html",
    "inbox.html",
    "segments.html",
    "reports.html",
    "reports-surveys.html",
    "marketing.html",
    "settings.html"
  ];

  // Phân khúc tạo/sửa và chiến dịch thuộc kinh doanh (sales); CSKH chỉ xem phân khúc.
  const MARKETING_PAGES = ["campaigns.html", "campaign-edit.html"];

  const ACCOUNTS = [
    {
      login: "admin",
      password: "admin",
      label: "Quản trị viên",
      initials: "QT",
      color: "#1d4ed8",
      note: "Toàn quyền CRM, khôi phục khách đã xóa, xem nhật ký thao tác.",
      pages: STAFF_PAGES.concat("logs.html")
    },
    {
      login: "cslead",
      password: "cslead",
      label: "Trưởng nhóm CSKH",
      initials: "TN",
      color: "#0f766e",
      note: "Như CSKH, nhận hội thoại được escalate. Không gửi chiến dịch, không xem nhật ký.",
      pages: STAFF_PAGES.filter((page) => !MARKETING_PAGES.includes(page))
    },
    {
      login: "cs",
      password: "cs",
      label: "CSKH",
      initials: "CS",
      color: "#b45309",
      note: "Khách hàng, hội thoại, khảo sát, báo cáo (chỉ xem). Không gửi chiến dịch.",
      pages: STAFF_PAGES.filter((page) => !MARKETING_PAGES.includes(page))
    },
    {
      login: "sales",
      password: "sales",
      label: "NV Kinh doanh",
      initials: "KD",
      color: "#64748b",
      note: "Phân khúc khách hàng và chiến dịch.",
      pages: ["home.html", "segments.html"].concat(MARKETING_PAGES)
    }
  ];

  const OPEN_PAGES = new Set(["login.html", "customer-chat.html", "customer-survey.html"]);
  const KEEP_ROLE_SWITCH = new Set(["inbox.html", "customer-chat.html", "customer-survey.html"]);

  function pageName() {
    const file = location.pathname.split("/").pop();
    return file && file.length ? file : "index.html";
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        return null;
      }
      const saved = JSON.parse(raw);
      return ACCOUNTS.find((account) => account.login === saved.login) || null;
    } catch (error) {
      return null;
    }
  }

  function persist(account) {
    const snapshot = {
      login: account.login,
      label: account.label,
      initials: account.initials
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    localStorage.setItem(LAST_LOGIN_KEY, account.login);
    sessionStorage.setItem(LOGIN_KEY, account.login);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LOGIN_KEY);
  }

  function canAccess(account, file) {
    return Boolean(account && account.pages.includes(file));
  }

  function homeFor(account) {
    return account && account.pages.includes("home.html") ? "/home.html" : `/${account.pages[0]}`;
  }

  function nextUrl() {
    const next = new URLSearchParams(location.search).get("next");
    if (!next || !next.startsWith("/") || next.startsWith("//")) {
      return null;
    }
    return next;
  }

  function signIn(login, password) {
    const name = String(login || "").trim().toLowerCase();
    const secret = String(password || "");
    const account = ACCOUNTS.find((row) => row.login === name && row.password === secret);
    if (!account) {
      return null;
    }
    persist(account);
    return account;
  }

  function signOut() {
    clearSession();
    location.replace("/login.html");
  }

  function syncLegacyLogin(account) {
    if (account) {
      sessionStorage.setItem(LOGIN_KEY, account.login);
      document.documentElement.classList.add("crm-authed");
    }
  }

  const current = readSession();
  syncLegacyLogin(current);

  const file = pageName();
  if (file === "login.html") {
    if (current) {
      const next = nextUrl();
      const target = next && canAccess(current, next.replace(/^\//, "").split("?")[0])
        ? next
        : homeFor(current);
      location.replace(target);
    }
  } else if (!OPEN_PAGES.has(file)) {
    if (!current) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace(`/login.html?next=${next}`);
    } else if (!canAccess(current, file)) {
      location.replace(homeFor(current));
    }
  }

  function filterNav(account) {
    if (!account) {
      return;
    }
    document.querySelectorAll(".sidebar a.nav-item[href]").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const target = href.split("?")[0].split("/").pop();
      if (!target || !target.endsWith(".html")) {
        return;
      }
      const allowed = canAccess(account, target);
      link.hidden = !allowed;
      link.style.display = allowed ? "" : "none";
    });
  }

  function hideSessionPanels() {
    document.querySelectorAll(".sidebar-panel").forEach((panel) => {
      const title = panel.querySelector("h2");
      const heading = title ? title.textContent : "";
      if (heading.includes("Đăng nhập") || heading.includes("Phiên đăng nhập")) {
        panel.remove();
        return;
      }
      panel.querySelector("#roles")?.remove();
      panel.querySelector(".session-card")?.remove();
    });
  }

  function bindAccountMenu(account) {
    const chip = document.querySelector(".who-chip");
    if (!chip || !account || chip.closest(".account-menu")) {
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "account-menu";
    chip.replaceWith(wrap);
    wrap.appendChild(chip);
    const avatar = chip.querySelector(".who-avatar");
    if (avatar) {
      avatar.textContent = account.initials;
      avatar.style.background = account.color;
    }
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("aria-haspopup", "menu");
    chip.setAttribute("aria-expanded", "false");
    chip.setAttribute("aria-label", "Tài khoản " + account.label);

    const pop = document.createElement("div");
    pop.className = "account-menu-pop";
    pop.setAttribute("role", "menu");
    pop.hidden = true;
    pop.innerHTML = `
      <a class="account-menu-item" role="menuitem" href="/settings.html">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>
        Hồ sơ
      </a>
      <button type="button" class="account-menu-item is-danger" role="menuitem" data-logout>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6h4v12h-4M15 12H4m4-4-4 4 4 4"/></svg>
        Đăng xuất
      </button>
    `;
    wrap.appendChild(pop);

    function setOpen(open) {
      pop.hidden = !open;
      wrap.classList.toggle("is-open", open);
      chip.setAttribute("aria-expanded", String(open));
    }

    chip.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(pop.hidden);
    });
    chip.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(pop.hidden);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    });
    pop.querySelector("[data-logout]").addEventListener("click", signOut);
    document.addEventListener("click", (event) => {
      if (!wrap.contains(event.target)) {
        setOpen(false);
      }
    });
  }

  function decorate() {
    const account = readSession();
    if (!account || OPEN_PAGES.has(file)) {
      return;
    }
    filterNav(account);
    if (!KEEP_ROLE_SWITCH.has(file)) {
      hideSessionPanels();
    }
    bindAccountMenu(account);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", decorate);
  } else {
    decorate();
  }

  window.CrmAuth = {
    accounts: ACCOUNTS.map((account) => ({
      login: account.login,
      password: account.password,
      label: account.label,
      initials: account.initials,
      color: account.color,
      note: account.note,
      pages: account.pages.slice()
    })),
    current: () => readSession(),
    lastLogin: () => localStorage.getItem(LAST_LOGIN_KEY) || "",
    canAccess,
    signIn,
    signOut,
    homeFor
  };
})();
