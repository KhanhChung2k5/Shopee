(() => {
  const options = Array.from(document.querySelectorAll("[data-theme-option]"));
  const toggle = document.getElementById("theme-dark-toggle");
  const status = document.getElementById("theme-status");

  if (!window.CrmTheme || (!options.length && !toggle)) {
    return;
  }

  const labels = {
    light: "Sáng",
    dark: "Tối",
    system: "Theo hệ thống",
  };

  function syncUi() {
    const { preference, theme } = window.CrmTheme.get();
    options.forEach((btn) => {
      const value = btn.getAttribute("data-theme-option");
      const active = value === preference;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (toggle) {
      toggle.checked = theme === "dark";
      toggle.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
    }
    if (status) {
      status.textContent = `Đang dùng: ${labels[preference] || preference} (${theme === "dark" ? "giao diện tối" : "giao diện sáng"})`;
    }
  }

  options.forEach((btn) => {
    btn.addEventListener("click", () => {
      window.CrmTheme.set(btn.getAttribute("data-theme-option"));
      syncUi();
    });
  });

  if (toggle) {
    toggle.addEventListener("change", () => {
      window.CrmTheme.set(toggle.checked ? "dark" : "light");
      syncUi();
    });
  }

  window.addEventListener("crm-theme-change", syncUi);
  syncUi();

  const menuToggle = document.getElementById("menu-toggle");
  const app = document.querySelector(".app");
  if (menuToggle && app) {
    menuToggle.addEventListener("click", () => {
      app.classList.toggle("nav-open");
    });
  }
})();
