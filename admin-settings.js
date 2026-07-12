(async function () {
  "use strict";
  const S = PsyHealthStorage;
  const session = await S.adminSession();
  if (!session) { location.replace("admin-login.html"); return; }

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  let role = await S.myRole();
  document.getElementById("centerTitle").textContent = role.role === "system_admin" ? "系统管理中心" : "机构管理中心";
  const identityLines = [`${esc(role.name || "系统管理员")} · ${esc(role.phone || role.email || "")}`];
  if (role.role === "organization") {
    const expires = role.expiresAt ? new Date(role.expiresAt) : null;
    identityLines.push(`账户使用到期日：${expires ? expires.toLocaleDateString("zh-CN") : "未授权"}`);
  }
  document.getElementById("adminIdentity").innerHTML = identityLines.map(line => `<span>${line}</span>`).join("");
  if (role.role === "system_admin") {
    document.getElementById("codeSection").hidden = true;
    document.getElementById("passwordSectionTitle").textContent = "修改系统管理员密码";
  } else {
    const profileSection = document.getElementById("orgProfileSection");
    const renameForm = document.getElementById("renameOrganizationForm");
    const renameMessage = document.getElementById("renameOrganizationMessage");
    profileSection.hidden = false;
    renameForm.elements.name.value = role.name || "";
    renameForm.onsubmit = async event => {
      event.preventDefault();
      const newName = String(new FormData(renameForm).get("name") || "").trim();
      if (!newName) {
        renameMessage.textContent = "请填写机构名称。";
        return;
      }
      const password = prompt("请输入当前机构登录密码确认修改机构名称：");
      if (!password) return;
      const button = renameForm.querySelector("button");
      button.disabled = true;
      button.textContent = "正在保存…";
      renameMessage.textContent = "";
      try {
        await S.adminSignIn(session.phone || session.email, password);
        const updated = await S.renameOrganization(newName);
        role = {...role, ...updated};
        document.getElementById("adminIdentity").innerHTML = [`${esc(role.name || "机构") } · ${esc(role.phone || role.email || "")}`, identityLines[1]].filter(Boolean).map(line => `<span>${line}</span>`).join("");
        renameMessage.textContent = "机构名称已更新。";
      } catch (error) {
        renameMessage.textContent = error.message || "密码验证失败，未修改。";
      } finally {
        button.disabled = false;
        button.textContent = "保存机构名称";
      }
    };
  }
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
    if (role.role === "system_admin") return;

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
        const password = prompt("请输入当前机构管理账号密码确认删除：");
        if (!password) return;
        try {
          await S.adminSignIn(session.email || session.phone, password);
          await S.deleteOrgCode(form.dataset.id);
          await codes("机构代码已删除。");
        } catch (error) {
          await codes(error.message || "密码验证失败，未删除。");
        }
      };
    });
  }

  async function organizations() {
    if (role.role !== "system_admin") return;
    document.getElementById("organizationsSection").hidden = false;
    const app = document.getElementById("organizationsApp");
    const items = await S.organizations();
    app.innerHTML = items.map(item => {
      const expires = item.expiresAt ? new Date(item.expiresAt) : null;
      const expiryValue = expires ? expires.toISOString().slice(0, 10) : "";
      const expired = expires && expires <= new Date();
      const state = item.status === "suspended" ? "已停止" : expired ? "已到期（暂停）" : item.status === "active" ? "正常使用" : "等待授权";
      return `<article class="invite-form"><b>${esc(item.name)}</b><p>${esc(item.phone || item.email || "")}</p><p><strong>状态：${state}</strong> · 到期时间：${expires ? expires.toLocaleDateString("zh-CN") : "未授权"}</p><label class="text-field"><span>手动修改到期日</span><input type="date" data-expiry-for="${item.userId}" value="${expiryValue}" required></label><label class="text-field"><span>系统管理员备注</span><textarea class="note-textarea" data-note-for="${item.userId}" rows="3" placeholder="可记录服务情况、商务备注或内部提醒">${esc(item.adminNote || "")}</textarea></label><div class="inline-actions"><button data-u="${item.userId}" data-save-expiry="1">保存到期日</button><button data-u="${item.userId}" data-save-note="1">保存备注</button><button class="danger-ghost-btn" data-u="${item.userId}" data-delete-org="1">删除机构账户</button></div></article>`;
    }).join("");
    app.querySelectorAll("button").forEach(button => button.onclick = async () => {
      if (button.dataset.deleteOrg) {
        const password = prompt("删除机构账户会移除该机构登录账号和机构代码。请输入当前系统管理员密码确认：");
        if (!password) return;
        try {
          await S.adminSignIn(session.email || session.phone, password);
          await S.deleteOrganization(button.dataset.u);
        } catch (error) {
          alert(error.message || "管理员密码验证失败，未删除。");
          return;
        }
      } else if (button.dataset.saveExpiry) {
        const input = app.querySelector(`[data-expiry-for="${button.dataset.u}"]`);
        if (!input.value) {
          alert("请先选择到期日。");
          return;
        }
        await S.setOrganizationExpiry(button.dataset.u, input.value);
      } else if (button.dataset.saveNote) {
        const input = app.querySelector(`[data-note-for="${button.dataset.u}"]`);
        await S.setOrganizationNote(button.dataset.u, input.value);
      } else {
        await S.updateOrganization(button.dataset.u, button.dataset.stop ? "suspended" : "active", 0);
      }
      await organizations();
    });
  }

  async function trialInvites(message = "") {
    if (role.role !== "system_admin") return;
    const section = document.getElementById("trialInviteSection");
    const app = document.getElementById("trialInviteApp");
    section.hidden = false;
    let list;
    try {
      list = await S.systemTrialInvites();
    } catch (error) {
      app.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;
      return;
    }
    const items = list.map(item => `<article class="invite-form">
      <div class="invite-fields">
        <div><span class="trial-invite-code">${esc(item.code)}</span></div>
        <div class="trial-invite-meta"><strong>${item.active ? "启用中" : "已停用"}</strong><br>已使用：${esc(item.useCount || 0)} 次<br>生成时间：${esc(item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN",{hour12:false}) : "-")}</div>
      </div>
      <div class="inline-actions"><button class="secondary-btn" data-toggle-trial="${esc(item.id)}" data-active="${item.active ? "0" : "1"}" type="button">${item.active ? "停用" : "启用"}</button><button class="danger-ghost-btn" data-delete-trial="${esc(item.id)}" type="button">删除</button></div>
    </article>`).join("") || '<p class="muted-copy">暂无试用邀请码。</p>';
    app.innerHTML = `${message ? `<p class="form-message">${esc(message)}</p>` : ""}<div class="inline-actions"><button class="primary-btn" id="createTrialInviteBtn" type="button">生成 4 位邀请码</button></div><div class="invite-list">${items}</div>`;
    document.getElementById("createTrialInviteBtn").onclick = async () => {
      const button = document.getElementById("createTrialInviteBtn");
      button.disabled = true;
      button.textContent = "正在生成…";
      try {
        const saved = await S.systemCreateTrialInvite();
        await trialInvites(`已生成试用邀请码：${saved.code}`);
      } catch (error) {
        await trialInvites(error.message || "生成失败。");
      }
    };
    app.querySelectorAll("[data-toggle-trial]").forEach(button => button.onclick = async () => {
      try {
        await S.systemSetTrialInviteActive(button.dataset.toggleTrial, button.dataset.active === "1");
        await trialInvites("邀请码状态已更新。");
      } catch (error) {
        await trialInvites(error.message || "状态更新失败。");
      }
    });
    app.querySelectorAll("[data-delete-trial]").forEach(button => button.onclick = async () => {
      const password = prompt("删除试用邀请码后，注册页将不能再使用该码。请输入当前系统管理员密码确认：");
      if (!password) return;
      try {
        await S.adminSignIn(session.email || session.phone, password);
        await S.systemDeleteTrialInvite(button.dataset.deleteTrial);
        await trialInvites("试用邀请码已删除。");
      } catch (error) {
        await trialInvites(error.message || "密码验证失败，未删除。");
      }
    });
  }

  if (role.role !== "system_admin") await codes();
  await trialInvites();
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
