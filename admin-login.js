(async function () {
  "use strict";
  const form = document.getElementById("adminLoginForm");
  const error = document.getElementById("adminLoginError");
  const button = form.querySelector('button[type="submit"]');
  const defaultButtonText = "进入管理中心";

  function resetLoginButton() {
    button.disabled = false;
    button.textContent = defaultButtonText;
  }

  async function redirectIfLoggedIn() {
    if (await window.PsyHealthStorage.adminSession()) {
      location.replace("history.html");
      return true;
    }
    return false;
  }

  window.addEventListener("pageshow", async event => {
    resetLoginButton();
    if (event.persisted) await redirectIfLoggedIn();
  });

  if (await redirectIfLoggedIn()) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = "正在登录…";
    error.textContent = "";
    const data = new FormData(form);
    try {
      await window.PsyHealthStorage.adminSignIn(String(data.get("account")).trim(), String(data.get("password")));
      const role = await window.PsyHealthStorage.myRole();
      if (role.role === "organization" && !role.usable) {
        throw new Error(role.status === "pending" ? "机构账号正在等待系统管理员开通。" : "机构账号已到期或暂停使用。");
      }
      location.href = "history.html";
    } catch (err) {
      await window.PsyHealthStorage.adminSignOut().catch(() => {});
      error.textContent = err.message;
      resetLoginButton();
    }
  });
})();
