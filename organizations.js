(async function () {
  "use strict";
  const S = window.PsyHealthStorage;
  const session = await S.adminSession();
  if (!session) { location.replace("admin-login.html"); return; }
  document.getElementById("adminLogoutBtn").onclick = async () => { await S.adminSignOut(); location.replace("admin-login.html"); };

  const app = document.getElementById("organizationsApp");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const fmt = value => value ? new Date(value).toLocaleString("zh-CN", {hour12:false}) : "暂无";
  const dateValue = value => value ? new Date(value).toISOString().slice(0, 10) : "";
  const activityTime = item => new Date(item.latestActivityAt || item.updatedAt || item.createdAt || 0).getTime();
  const stateText = item => {
    const expires = item.expiresAt ? new Date(item.expiresAt) : null;
    if (item.status === "suspended") return "已停止";
    if (expires && expires <= new Date()) return "已到期（暂停）";
    if (item.status === "active") return "正常使用";
    return "等待授权";
  };

  try {
    const role = await S.myRole();
    if (role.role !== "system_admin") {
      app.innerHTML = '<p class="error-text">当前账号没有系统管理权限。</p>';
      return;
    }
  } catch (error) {
    app.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;
    return;
  }

  async function render() {
    let items;
    try {
      items = await S.organizations();
    } catch (error) {
      app.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;
      return;
    }
    const clientActivity = {};
    try {
      const clients = await S.clientProfiles();
      clients.forEach(client => {
        const when = new Date(client.latestAt || client.updatedAt || client.createdAt || 0).getTime();
        const keys = [client.organizationId, client.organizationName].filter(Boolean);
        keys.forEach(key => { clientActivity[key] = Math.max(clientActivity[key] || 0, when); });
      });
    } catch (_) {}
    items = [...items].map(item => {
      const fromClients = Math.max(clientActivity[item.userId] || 0, clientActivity[item.name] || 0);
      return {...item, latestActivityAt: new Date(Math.max(activityTime(item), fromClients)).toISOString()};
    }).sort((a, b) => activityTime(b) - activityTime(a));
    if (!items.length) {
      app.innerHTML = '<p class="empty-state"><strong>暂无机构账号</strong><br>机构完成注册和验证后，会显示在这里。</p>';
      return;
    }
    app.innerHTML = `<div class="history-list organization-account-list">${items.map(item => {
      const expires = item.expiresAt ? new Date(item.expiresAt) : null;
      return `<details class="stacked-scale-group organization-account-card">
        <summary><span><strong>${esc(item.name || "未命名机构")}</strong></span><b>详情</b></summary>
        <div class="organization-account-detail">
          <p><strong>登录账号：</strong>${esc(item.phone || item.email || "-")}</p>
          <p><strong>账号状态：</strong>${esc(stateText(item))}</p>
          <p><strong>到期时间：</strong>${expires ? esc(expires.toLocaleDateString("zh-CN")) : "未授权"}</p>
          <p><strong>最近活跃：</strong>${esc(fmt(item.latestActivityAt || item.updatedAt || item.createdAt))}</p>
          <label class="text-field"><span>手动修改到期日</span><input type="date" data-expiry-for="${esc(item.userId)}" value="${esc(dateValue(item.expiresAt))}" required></label>
          <label class="text-field"><span>系统管理员备注</span><textarea class="note-textarea" data-note-for="${esc(item.userId)}" rows="3" placeholder="可记录服务情况、商务备注或内部提醒">${esc(item.adminNote || "")}</textarea></label>
          <div class="inline-actions"><button data-u="${esc(item.userId)}" data-save-expiry="1">保存到期日</button><button data-u="${esc(item.userId)}" data-save-note="1">保存备注</button><button class="danger-ghost-btn" data-u="${esc(item.userId)}" data-delete-org="1">删除机构账户</button></div>
        </div>
      </details>`;
    }).join("")}</div>`;

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
      }
      await render();
    });
  }

  await render();
})();
