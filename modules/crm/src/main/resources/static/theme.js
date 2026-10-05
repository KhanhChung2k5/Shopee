(() => {
  const KEY = "crm-theme";
  const VALID = new Set(["light", "dark", "system"]);

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function readPreference() {
    try {
      const saved = localStorage.getItem(KEY);
      if (VALID.has(saved)) return saved;
    } catch (_) {
      /* ignore */
    }
    return "system";
  }

  function resolve(preference = readPreference()) {
    const pref = VALID.has(preference) ? preference : "system";
    return pref === "system" ? systemTheme() : pref;
  }

  function apply(preference = readPreference()) {
    const pref = VALID.has(preference) ? preference : "system";
    const theme = resolve(pref);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-theme-pref", pref);
    document.documentElement.style.colorScheme = theme;
    return { preference: pref, theme };
  }

  function set(preference) {
    const pref = VALID.has(preference) ? preference : "system";
    try {
      localStorage.setItem(KEY, pref);
    } catch (_) {
      /* ignore */
    }
    const result = apply(pref);
    window.dispatchEvent(new CustomEvent("crm-theme-change", { detail: result }));
    return result;
  }

  function get() {
    return {
      preference: document.documentElement.getAttribute("data-theme-pref") || readPreference(),
      theme: document.documentElement.getAttribute("data-theme") || resolve(),
    };
  }

  apply();

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readPreference() === "system") apply("system");
  };
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onSystemChange);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(onSystemChange);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === KEY) apply();
  });

  window.CrmTheme = { KEY, get, set, apply, resolve, readPreference };
})();
