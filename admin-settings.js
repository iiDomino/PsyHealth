(async function () {
  "use strict";
  const S = PsyHealthStorage;
  const session = await S.adminSession();
  if (!session) return;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const role = await S.myRole();
  document.getElementById("centerTitle").textContent = role.role === "system_admin" ? "系统管理中心" : "机构管理中心";
  document.getElementById("adminIdentity").textContent = `${role.name || "系统管理员"} · ${role.email}`;
  document.getElementById("adminLogoutBtn").onclick = async () => {
    await S.adminSignOut();
    location.replace("admin-login.html");
  };

  const choices = allowed => Array.from({length: 10}, (_, index) => {
    const value = index + 1;
    return `<label><input type="checkbox" name="scale" value="${value}" ${allowed.includes(value) ? "checked" : ""}>${String(value).padStart(2, "0")}</label>`;
  }).join("");

  async function codes(message = "") {
    const app = document.getElementById("inviteAdminApp");
    if (role.role === "system_admin") {
      app.innerHTML = '<p class="muted-copy">系统管理员可在机构用户列表中管理机构；历史兼容代码继续有效。</p>';
      return;
    }

    let list;
    try {
      list = await S.orgCodes();
    } catch (error) {
      app.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;
      return;
    }

    const existing = list.map(item => `<form class="invite-form" data-id="${item.id}">
      <b>机构代码：${esc(item.code)}</b>
      <label class="text-field"><span>代码名称</span><input name="label" value="${esc(item.label)}" required></label>
      <div class="scale-check-grid">${choices(item.allowedScales || [])}</div>
      <label><input type="checkbox" name="active" ${item.active ? "checked" : ""}> 启用</label>
      <div class="inline-actions"><button class="secondary-btn" type="submit">保存</button><button class="danger-ghost-btn delete-code" type="button">删除</button></div>
    </form>`).join("");

    const creator = list.length < 3 ? `<form class="invite-form" id="newCode">
      <h3>生成新代码</h3>
      <label class="text-field"><span>代码名称</span><input name="label" required></label>
      <div class="scale-check-grid">${choices([])}</div>
      <button class="primary-btn" type="submit">生成 6 位机构代码</button>
    </form>` : '<p class="muted-copy">已设置 3 组机构代码。如需更换，请先删除一组。</p>';

    app.innerHTML = `${message ? `<p class="form-message">${esc(message)}</p>` : ""}${existing}${creator}`;
    app.querySelectorAll("form").forEach(form => {
      form.onsubmit = async event => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const data = new FormData(form);
        button.disabled = true;
        button.textContent = form.id === "newCode" ? "正在生成…" : "正在保存…";
        try {
          const saved = await S.saveOrgCode({
            id: form.dataset.id,
            label: data.get("label"),
            allowedScales: data.getAll("scale").map(Number),
            active: form.id === "newCode" || data.get("active") === "on"
          });
          await codes(form.id === "newCode" ? `已生成机构代码：${saved.code}` : "机构代码设置已保存。");
        } catch (error) {
          button.disabled = false;
          button.textContent = form.id === "newCode" ? "生成 6 位机构代码" : "保存";
          await codes(error.message);
        }
      };
      const deleteButton = form.querySelector(".delete-code");
      if (deleteButton) deleteButton.onclick = async () => {
        if (!confirm("确认删除这组机构代码吗？删除后将不能再用于进入测评。")) return;
        try {
          await S.deleteOrgCode(form.dataset.id);
          await codes("机构代码已删除。");
        } catch (error) {
          await codes(error.message);
        }
      };
    });
  }

  async function organizations() {
    if (role.role !== "system_admin") return;
    document.getElementById("organizationsSection").hidden = false;
    const app = document.getElementById("organizationsApp");
    const items = await S.organizations();
    app.innerHTML = items.map(item => `<article class="invite-form"><b>${esc(item.name)}</b><p>${esc(item.email)} · ${esc(item.status)} · 到期：${item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "未赋时"}</p><div class="inline-actions"><button data-u="${item.userId}" data-m="1">加1月</button><button data-u="${item.userId}" data-m="3">加3月</button><button data-u="${item.userId}" data-m="6">加半年</button><button data-u="${item.userId}" data-m="12">加1年</button><button data-u="${item.userId}" data-stop="1">暂停</button></div></article>`).join("");
    app.querySelectorAll("button").forEach(button => button.onclick = async () => {
      await S.updateOrganization(button.dataset.u, button.dataset.stop ? "suspended" : "active", Number(button.dataset.m || 0));
      await organizations();
    });
  }

  await codes();
  await organizations();
  document.getElementById("changePasswordForm").onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = document.getElementById("passwordMessage");
    if (data.get("password") !== data.get("confirmPassword")) {
      message.textContent = "两次密码不一致";
      return;
    }
    await S.adminChangePassword(data.get("password"));
    message.textContent = "密码已更新";
  };
})();
