(() => {
  const options = Array.from(document.querySelectorAll("[data-theme-option]"));
  const toggle = document.getElementById("theme-dark-toggle");
  const status = document.getElementById("theme-status");

  if (!window.CrmTheme || (!options.length && !toggle)) {
    return;
  }

  const labels = {
    light: "Sáng",
    dark: "Tối (cyan)",
    "dark-orange": "Tối (cam)",
    system: "Theo hệ thống",
  };

  function isDarkTheme(theme) {
    return typeof window.CrmTheme.isDark === "function"
      ? window.CrmTheme.isDark(theme)
      : theme === "dark" || theme === "dark-orange";
  }

  function syncUi() {
    const { preference, theme } = window.CrmTheme.get();
    options.forEach((btn) => {
      const value = btn.getAttribute("data-theme-option");
      const active = value === preference;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (toggle) {
      const darkOn = isDarkTheme(theme);
      toggle.checked = darkOn;
      toggle.setAttribute("aria-checked", darkOn ? "true" : "false");
    }
    if (status) {
      status.textContent = `Đang dùng: ${labels[preference] || preference} (${isDarkTheme(theme) ? "giao diện tối" : "giao diện sáng"})`;
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
      // Toggle nhanh: sáng ↔ tối cyan; dark-orange chỉ chọn qua card
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
