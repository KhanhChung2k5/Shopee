(() => {
  const form = document.getElementById("login-form");
  const user = document.getElementById("login-user");
  const pass = document.getElementById("login-pass");
  const error = document.getElementById("login-error");
  const list = document.getElementById("login-accounts");
  const auth = window.CrmAuth;
  if (!form || !auth) {
    return;
  }

  const last = auth.lastLogin();
  if (last) {
    user.value = last;
  }

  function showError(message) {
    error.hidden = !message;
    error.textContent = message || "";
  }

  auth.accounts.forEach((account) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "login-account";
    button.innerHTML = `
      <span class="session-avatar" style="background:${account.color}">${account.initials}</span>
      <span>
        <strong>${account.label}</strong>
        <small>${account.login} / ${account.password}</small>
        <em>${account.note}</em>
      </span>
    `;
    button.addEventListener("click", () => {
      user.value = account.login;
      pass.value = account.password;
      showError("");
      user.focus();
    });
    list.appendChild(button);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const account = auth.signIn(user.value, pass.value);
    if (!account) {
      showError("Sai tên đăng nhập hoặc mật khẩu.");
      return;
    }
    const next = new URLSearchParams(location.search).get("next");
    const file = next ? next.replace(/^\//, "").split("?")[0] : "";
    if (next && next.startsWith("/") && !next.startsWith("//") && auth.canAccess(account, file)) {
      location.replace(next);
      return;
    }
    location.replace(auth.homeFor(account));
  });
})();
