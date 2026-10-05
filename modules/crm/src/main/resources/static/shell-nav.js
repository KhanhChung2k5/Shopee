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
  const AUDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>';

  function syncAuditNav() {
    const nav = document.querySelector("nav.nav-sub");
    if (!nav) {
      return;
    }
    const isAdmin = sessionStorage.getItem("crmLogin") === "admin";
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
