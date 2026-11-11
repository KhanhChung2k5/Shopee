(() => {
  const sidebar = document.querySelector(".sidebar");
  const app = document.querySelector(".app");
  if (!sidebar || !app || sidebar.querySelector(".sidebar-close")) {
    return;
  }

  const brand = sidebar.querySelector(".brand");
  if (!brand) {
    return;
  }

  const head = document.createElement("div");
  head.className = "sidebar-head";
  brand.replaceWith(head);
  head.appendChild(brand);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "sidebar-close";
  close.setAttribute("aria-label", "Đóng menu");
  close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  close.addEventListener("click", () => {
    app.classList.remove("nav-open");
  });
  head.appendChild(close);
})();

(() => {
  const MARKETING_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
  const nav = document.querySelector("nav.nav:not(.nav-sub)");
  if (!nav || nav.querySelector('a[href="/marketing.html"]')) {
    return;
  }
  const link = document.createElement("a");
  link.className = "nav-item";
  link.href = "/marketing.html";
  link.innerHTML = `${MARKETING_ICON} Marketing tự động`;
  if (/\/marketing\.html$/.test(location.pathname)) {
    link.classList.add("is-active");
    link.setAttribute("aria-current", "page");
  }
  const campaigns = nav.querySelector('a[href="/campaigns.html"]');
  if (campaigns) {
    campaigns.insertAdjacentElement("afterend", link);
  } else {
    nav.appendChild(link);
  }
})();

(() => {
  const AUDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>';

  function syncAuditNav() {
    const nav = document.querySelector("nav.nav-sub");
    if (!nav) {
      return;
    }
    const isAdmin = (window.CrmAuth?.current()?.login || sessionStorage.getItem("crmLogin")) === "admin";
    let link = nav.querySelector("[data-audit-nav]");
    if (!link) {
      link = document.createElement("a");
      link.className = "nav-item";
      link.href = "/logs.html";
      link.dataset.auditNav = "true";
      link.innerHTML = `${AUDIT_ICON} Nhật ký`;
      const settings = nav.querySelector('a[href="/settings.html"]');
      if (settings) {
        settings.insertAdjacentElement("afterend", link);
      } else {
        nav.prepend(link);
      }
    }
    const onLogs = /\/logs\.html$/.test(location.pathname);
    link.classList.toggle("is-active", onLogs && isAdmin);
    if (onLogs && isAdmin) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
    link.hidden = !isAdmin;
    link.style.display = isAdmin ? "" : "none";
  }

  syncAuditNav();
  document.addEventListener("click", (event) => {
    if (event.target.closest("#roles")) {
      setTimeout(syncAuditNav, 0);
    }
  });
})();

(() => {
  const KEY = "crm-sidebar-rail";
  const sidebar = document.querySelector(".sidebar");
  const app = document.querySelector(".app");
  const head = sidebar && sidebar.querySelector(".sidebar-head");
  if (!sidebar || !app || !head || head.querySelector(".sidebar-toggle")) {
    return;
  }

  const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "sidebar-toggle";
  toggle.setAttribute("aria-controls", sidebar.id || "sidebar");
  toggle.innerHTML = CHEVRON;
  head.appendChild(toggle);

  function labelNavItems() {
    sidebar.querySelectorAll(".nav-item").forEach((item) => {
      if (!item.dataset.label) {
        item.dataset.label = item.textContent.replace(/\s+/g, " ").trim();
      }
    });
  }

  function apply(collapsed) {
    labelNavItems();
    app.classList.toggle("sidebar-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    const text = collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên";
    toggle.setAttribute("aria-label", text);
    toggle.title = text;
    sidebar.querySelectorAll(".nav-item").forEach((item) => {
      if (collapsed) {
        item.title = item.dataset.label;
      } else {
        item.removeAttribute("title");
      }
    });
  }

  let stored = true;
  try {
    const raw = localStorage.getItem(KEY);
    stored = raw == null ? true : raw === "1";
  } catch (e) { /* ignore */ }
  apply(stored);

  toggle.addEventListener("click", () => {
    const next = !app.classList.contains("sidebar-collapsed");
    apply(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch (e) { /* ignore */ }
  });
})();

(() => {
  const topbar = document.querySelector(".topbar");
  if (!topbar || !document.querySelector(".sidebar")) {
    return;
  }

  document.querySelectorAll(".chrome-search").forEach((form) => form.remove());

  const reload = document.getElementById("reload");
  if (reload && !reload.querySelector(".sync-copy")) {
    reload.classList.add("sync-chip");
    const copy = document.createElement("span");
    copy.className = "sync-copy";
    copy.textContent = "Vừa đồng bộ";
    reload.appendChild(copy);
  }

  const menu = document.getElementById("menu-toggle");
  if (menu && !menu.dataset.shellBound) {
    menu.dataset.shellBound = "1";
    menu.addEventListener("click", () => {
      document.querySelector(".app")?.classList.toggle("nav-open");
    });
  }
})();
