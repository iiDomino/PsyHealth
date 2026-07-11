(async function () {
  "use strict";
  const S = window.PsyHealthStorage;
  const session = await S.adminSession();
  if (!session) { location.replace("admin-login.html"); return; }
  document.getElementById("adminLogoutBtn").onclick = async () => { await S.adminSignOut(); location.replace("admin-login.html"); };
  const app = document.getElementById("clientsApp");
  const esc = value => String(value ?? "").replace(/[&<>"']/gu, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const fmt = value => value ? new Date(value).toLocaleString("zh-CN", {hour12:false}) : "暂无";
  let clients;
  try { clients = await S.clientProfiles(); }
  catch (error) { app.innerHTML = `<p class="error-text">${esc(error.message)}</p>`; return; }
  if (!clients.length) {
    app.innerHTML = '<p class="empty-state"><strong>暂无来访者档案</strong><br>来访者第一次提交基本信息后，会在这里建立独立档案。</p>';
    return;
  }
  app.innerHTML = `<div class="history-list client-list">${clients.map(client => {
    const i = client.intake || {};
    return `<article class="history-card client-card"><a href="client-detail.html?id=${encodeURIComponent(client.id)}"><strong>${esc(client.name || i.name || "未命名")}</strong><span>${esc(i.gender || "-")} · ${esc(i.age || "-")} 岁 · ${esc(i.education || "-")} · ${esc(i.occupation || "-")}</span><span>机构：${esc(client.organizationName || "系统直属")} · 代码：${esc(client.institutionCode || "-")}</span><span>测评批次：${client.sessionCount || 0} 次 · 留言：${client.messageCount || 0} 条 · 工作日志：${client.workLogCount || 0} 条</span><time>最近更新：${esc(fmt(client.latestAt || client.updatedAt))}</time></a></article>`;
  }).join("")}</div>`;
})();
