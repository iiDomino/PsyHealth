(async function () {
  "use strict";
  const S = window.PsyHealthStorage;
  const session = await S.adminSession();
  if (!session) { location.replace("admin-login.html"); return; }
  const app = document.getElementById("clientDetailApp");
  const id = new URLSearchParams(location.search).get("id");
  const esc = value => String(value ?? "").replace(/[&<>"']/gu, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const fmt = value => value ? new Date(value).toLocaleString("zh-CN", {hour12:false}) : "暂无";
  const scaleNames = {"legacy-psy90":"心理健康90自测量表","legacy-personality85":"人格85自测量表","legacy-love40":"爱情关系合适度测评","common-psq":"父母问卷（PSQ）","common-interpersonal":"人际关系综合诊断量表","common-sds":"抑郁自评量表（SDS）","common-enrich":"婚姻质量问卷","common-wellbeing":"幸福感指数量表","common-sas":"焦虑自评量表（SAS）","common-ucla":"孤独感自评量表（UCLA）"};
  let profile;
  try { profile = await S.clientProfile(id); }
  catch (error) { app.innerHTML = `<section class="panel"><p class="error-text">${esc(error.message)}</p></section>`; return; }
  if (!profile) { app.innerHTML = '<section class="panel"><h1>档案不存在</h1><a href="clients.html">返回档案列表</a></section>'; return; }
  const intake = profile.intake || {};
  const sessions = profile.sessions || [];
  const allResults = sessions.flatMap(session => (session.results || []).map(result => ({...result, sessionId:session.id, sessionAt:session.createdAt, message:session.message})));
  const grouped = allResults.reduce((map, result) => {
    const key = result.id || "unknown";
    (map[key] ||= []).push(result);
    return map;
  }, {});
  const facts = `<dl class="report-facts"><div><dt>姓名</dt><dd>${esc(profile.name || intake.name)}</dd></div><div><dt>性别</dt><dd>${esc(intake.gender)}</dd></div><div><dt>年龄</dt><dd>${esc(intake.age)} 岁</dd></div><div><dt>最高学历</dt><dd>${esc(intake.education)}</dd></div><div><dt>职业</dt><dd>${esc(intake.occupation)}</dd></div><div><dt>婚姻状况</dt><dd>${esc(intake.marital)}</dd></div><div><dt>出生城市</dt><dd>${esc(intake.birthCity)}</dd></div><div class="wide"><dt>咨询问题</dt><dd>${esc((intake.topics || []).join("、"))}</dd></div><div class="wide"><dt>所属机构</dt><dd>${esc(profile.organizationName || "系统直属")} · ${esc(profile.institutionCode || "-")}</dd></div></dl>`;
  const scaleGroups = Object.entries(grouped).map(([key, list]) => renderScaleGroup(key, list.sort((a,b) => new Date(a.completedAt || a.sessionAt) - new Date(b.completedAt || b.sessionAt)))).join("") || '<p class="muted-copy">尚未完成测评。</p>';
  const messages = sessions.filter(s => s.message).map(s => `<article class="note-card"><time>${esc(fmt(s.updatedAt || s.createdAt))}</time><p>${esc(s.message)}</p></article>`).join("") || '<p class="muted-copy">暂无来访者留言。</p>';
  const logs = (profile.workLogs || []).map(log => renderLog(log)).join("") || '<p class="muted-copy" id="emptyLogs">暂无工作日志。</p>';
  app.innerHTML = `<section class="panel report-panel"><header class="report-header"><p class="eyebrow">来访者档案</p><h1>${esc(profile.name || intake.name)}的独立档案</h1><p>建档时间：${esc(fmt(profile.createdAt))}</p></header><section class="report-block"><h2>基本信息</h2>${facts}</section><section class="report-block"><h2>测评题目分类与趋势分析</h2><div class="scale-group-list">${scaleGroups}</div></section><section class="report-block"><h2>来访者留言</h2>${messages}</section><section class="report-block"><h2>机构工作日志</h2><p class="muted-copy">可记录咨询观察、跟进计划或沟通摘要。保存后自动生成日期，可修改或删除。</p><textarea class="note-textarea" id="workLogInput" rows="4" placeholder="填写新的工作日志"></textarea><p id="workLogMessage" class="form-message"></p><button class="secondary-btn" id="saveWorkLogBtn" type="button">保存工作日志</button><div class="work-log-list" id="workLogList">${logs}</div></section></section>`;
  document.getElementById("saveWorkLogBtn").addEventListener("click", async () => {
    const input = document.getElementById("workLogInput");
    const msg = document.getElementById("workLogMessage");
    msg.textContent = "正在保存…";
    try {
      await S.saveWorkLog(profile.id, null, input.value);
      location.reload();
    } catch (error) {
      msg.textContent = error.message || "保存失败。";
    }
  });
  document.querySelectorAll("[data-edit-log]").forEach(button => button.addEventListener("click", async () => {
    const id = button.dataset.editLog;
    const current = button.closest(".note-card").querySelector("p").textContent;
    const next = prompt("修改工作日志：", current);
    if (next === null) return;
    try { await S.saveWorkLog(profile.id, id, next); location.reload(); }
    catch (error) { alert(error.message || "修改失败。"); }
  }));
  document.querySelectorAll("[data-delete-log]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("确认删除这条工作日志吗？")) return;
    try { await S.deleteWorkLog(button.dataset.deleteLog); location.reload(); }
    catch (error) { alert(error.message || "删除失败。"); }
  }));

  function renderScaleGroup(key, list) {
    const trend = trendText(list);
    return `<article class="scale-group"><h3>${esc(scaleNames[key] || list[0]?.shortTitle || "未命名测评")}</h3><p class="muted-copy">${esc(trend)}</p><div class="result-comparison">${list.map((result, index) => renderResult(result, index)).join("")}</div></article>`;
  }
  function renderResult(result, index) {
    const details = Array.isArray(result.details) && result.details.length ? result.details : String(result.summary || "").split("；").filter(Boolean);
    return `<article class="report-result compact-result"><div><span class="report-scale">第 ${index + 1} 次 · ${esc(fmt(result.completedAt || result.sessionAt))}</span><h3>${esc(result.resultTitle || result.scoreLabel || "测评结果")}</h3></div><div class="mini-score"><strong>${esc(result.score)}</strong><span>${esc(result.scoreLabel || "结果")}</span></div><ul class="report-detail-list">${details.slice(0, 6).map(line => `<li>${esc(line)}</li>`).join("")}</ul></article>`;
  }
  function trendText(list) {
    if (list.length < 2) return "仅有 1 次结果，暂不形成趋势判断。";
    const nums = list.map(item => Number(String(item.score).match(/-?\d+(\.\d+)?/)?.[0])).filter(Number.isFinite);
    if (nums.length < 2) return `共 ${list.length} 次结果，分数格式不统一，建议结合详细内容人工比较。`;
    const first = nums[0], last = nums[nums.length - 1], diff = last - first;
    if (Math.abs(diff) < 0.01) return `共 ${list.length} 次结果，首末分数基本持平。`;
    return `共 ${list.length} 次结果，首末分数${diff > 0 ? "上升" : "下降"} ${Math.abs(diff).toFixed(2)}。请结合该量表含义判断改善或风险变化。`;
  }
  function renderLog(log) {
    return `<article class="note-card"><time>生成日期：${esc(fmt(log.createdAt))}${log.updatedAt && log.updatedAt !== log.createdAt ? ` · 更新：${esc(fmt(log.updatedAt))}` : ""}</time><p>${esc(log.content)}</p><div class="inline-actions"><button class="secondary-btn" data-edit-log="${esc(log.id)}" type="button">修改</button><button class="danger-ghost-btn" data-delete-log="${esc(log.id)}" type="button">删除</button></div></article>`;
  }
})();
