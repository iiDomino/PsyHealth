(async function () {
  "use strict";
  const S = window.PsyHealthStorage;
  const session = await S.adminSession();
  if (!session) { location.replace("admin-login.html"); return; }
  document.getElementById("adminLogoutBtn").onclick = async () => { await S.adminSignOut(); location.replace("admin-login.html"); };
  const app = document.getElementById("clientsApp");
  const esc = value => String(value ?? "").replace(/[&<>"']/gu, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const fmt = value => value ? new Date(value).toLocaleString("zh-CN", {hour12:false}) : "暂无";
  let role = {role:"organization"};
  try { role = await S.myRole(); } catch (_) {}
  let clients;
  try { clients = await S.clientProfiles(); }
  catch (error) { app.innerHTML = `<p class="error-text">${esc(error.message)}</p>`; return; }
  if (!clients.length) {
    app.innerHTML = '<p class="empty-state"><strong>暂无来访者档案</strong><br>来访者第一次提交基本信息后，会在这里建立独立档案。</p>';
    return;
  }
  const renderClient = client => {
    const i = client.intake || {};
    return `<article class="history-card client-card"><a href="client-detail.html?id=${encodeURIComponent(client.id)}"><strong>${esc(client.name || i.name || "未命名")}</strong><span>${esc(i.gender || "-")} · ${esc(i.age || "-")} 岁 · ${esc(i.education || "-")} · ${esc(i.occupation || "-")}</span><span>机构：${esc(client.organizationName || "系统直属")} · 代码：${esc(client.institutionCode || "-")}</span><span>测评批次：${client.sessionCount || 0} 次 · 留言：${client.messageCount || 0} 条 · 工作日志：${client.workLogCount || 0} 条</span><time>最近更新：${esc(fmt(client.latestAt || client.updatedAt))}</time></a></article>`;
  };
  if (role.role === "system_admin") {
    const groups = clients.reduce((map, client) => {
      const key = client.organizationName || "系统直属";
      (map[key] ||= []).push(client);
      return map;
    }, {});
    app.innerHTML = Object.entries(groups).map(([name, list]) => `<section class="organization-client-group"><h2>${esc(name)}</h2><p class="muted-copy">共 ${list.length} 位来访者</p><div class="history-list client-list">${list.map(renderClient).join("")}</div></section>`).join("");
  } else {
    app.innerHTML = `<div class="history-list client-list">${clients.map(renderClient).join("")}</div>`;
  }
})();
