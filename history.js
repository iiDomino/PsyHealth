(async function () {
  "use strict";
  if (!await window.PsyHealthStorage.adminSession()) { location.replace("admin-login.html"); return; }
  const app = document.getElementById("historyApp");
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/gu, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const formatTopics = topics => (topics || []).map(topic => topic === "婚恋" + "难题" ? "婚恋情感" : topic).join("、");
  app.innerHTML = '<p class="loading-state">正在读取云端来访者记录…</p>';
  let records;
  try { records = await window.PsyHealthStorage.history(); }
  catch (error) { app.innerHTML = `<p class="error-text">${escapeHTML(error.message)}</p>`; return; }
  if (!records.length) { app.innerHTML = '<p class="empty-state"><strong>暂无历史记录</strong><br>来访者提交来访者信息后会显示在这里。</p>'; return; }
  app.innerHTML = `<div class="history-toolbar"><label><input type="checkbox" id="selectAll"> 全选</label><button class="danger-btn" id="deleteSelected" type="button">删除所选</button></div><div class="history-list">${records.map(record => { const i=record.intake||{}; return `<article class="history-card"><label class="history-check"><input type="checkbox" data-id="${escapeHTML(record.id)}" aria-label="选择${escapeHTML(i.name)}"></label><a href="history-detail.html?id=${encodeURIComponent(record.id)}"><strong>${escapeHTML(i.name || "未命名")}</strong><span>${escapeHTML(i.gender)} · ${escapeHTML(i.age)} 岁 · ${escapeHTML(i.education)} · ${escapeHTML(i.occupation)}</span><span>机构：${escapeHTML(record.organizationName||"系统直属")} · 代码：${escapeHTML(record.institutionCode||"-")}</span><span>咨询问题：${escapeHTML(formatTopics(i.topics))}</span><time>${new Date(record.createdAt).toLocaleString("zh-CN",{hour12:false})} · 已完成 ${(record.results||[]).length} 项</time></a></article>`; }).join("")}</div>`;
  const checks = [...app.querySelectorAll("[data-id]")];
  document.getElementById("selectAll").addEventListener("change", event => checks.forEach(box => { box.checked = event.target.checked; }));
  document.getElementById("deleteSelected").addEventListener("click", async () => { const ids=checks.filter(box=>box.checked).map(box=>box.dataset.id); if (!ids.length) { alert("请先选择要删除的记录。"); return; } if (confirm(`确认删除所选的 ${ids.length} 条记录吗？此操作无法撤销。`)) { try { await window.PsyHealthStorage.deleteRecords(ids); location.reload(); } catch(error) { alert(error.message); } } });
})();
