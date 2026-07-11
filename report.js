(function () {
  "use strict";
  const app = document.getElementById("reportApp"); let intake = null, results = [];
  try { intake = JSON.parse(sessionStorage.getItem("psyhealth-session-intake") || "null"); results = JSON.parse(sessionStorage.getItem("psyhealth-session-results") || "[]"); } catch (_) {}
  const activeResultIds = new Set(["legacy-psy90","legacy-personality85","legacy-love40","common-psq","common-interpersonal","common-sds","common-enrich","common-wellbeing","common-sas","common-ucla"]);
  const resultNames = {"legacy-psy90":"心理健康90自测量表","legacy-personality85":"人格85自测量表","legacy-love40":"爱情关系合适度测评","common-psq":"父母问卷（PSQ）","common-interpersonal":"人际关系综合诊断量表","common-sds":"抑郁自评量表（SDS）","common-enrich":"婚姻质量问卷","common-wellbeing":"幸福感指数量表","common-sas":"焦虑自评量表（SAS）","common-ucla":"孤独感自评量表（UCLA）"};
  results = results.filter(item => activeResultIds.has(item.id));
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/gu, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const formatTopics = topics => (topics || []).map(topic => topic === "婚恋" + "难题" ? "婚恋情感" : topic).join("、");
  if (!intake && !results.length) { app.innerHTML = '<section class="panel empty-report"><p class="eyebrow">咨询报告</p><h1>本次还没有资料</h1><p class="lead">请先填写来访者信息并完成测评。</p><a class="primary-btn button-link" href="intake.html">填写来访者信息</a></section>'; return; }
  const facts = intake ? `<dl class="report-facts"><div class="wide"><dt>所属机构</dt><dd>${escapeHTML(intake.organizationName || "系统直属")}</dd></div><div><dt>姓名</dt><dd>${escapeHTML(intake.name)}</dd></div><div><dt>手机号后四位</dt><dd>${escapeHTML(intake.phoneLast4 || "-")}</dd></div><div><dt>性别</dt><dd>${escapeHTML(intake.gender)}</dd></div><div><dt>出生年</dt><dd>${escapeHTML(intake.birthYear || "-")}${intake.birthYear ? " 年" : ""}</dd></div><div><dt>最高学历</dt><dd>${escapeHTML(intake.education)}</dd></div><div><dt>职业</dt><dd>${escapeHTML(intake.occupation)}</dd></div><div><dt>婚姻状况</dt><dd>${escapeHTML(intake.marital)}</dd></div><div><dt>出生城市</dt><dd>${escapeHTML(intake.birthCity)}</dd></div><div class="wide"><dt>咨询问题</dt><dd>${escapeHTML(formatTopics(intake.topics))}</dd></div></dl>` : '<p class="muted-copy">尚未填写来访者信息。</p>';
  const items = results.length ? results.map((item,i) => {
    const detailLines = Array.isArray(item.details) && item.details.length ? item.details : String(item.summary || "").split("；").filter(Boolean);
    return `<article class="report-result"><div><span class="report-scale">${i+1}. ${escapeHTML(resultNames[item.id] || item.shortTitle)}</span><h3>${escapeHTML(item.resultTitle)}</h3></div><div class="mini-score"><strong>${escapeHTML(item.score)}</strong><span>${escapeHTML(item.scoreLabel)}</span></div><ul class="report-detail-list">${detailLines.map(line => `<li>${escapeHTML(line)}</li>`).join("")}</ul></article>`;
  }).join("") : '<p class="muted-copy">尚未完成测评。</p>';
  const completionText = results.length >= 10 ? "10 项测评已全部完成" : `已记录 ${results.length} / 10 项测评结果`;
  app.innerHTML = `<section class="panel report-panel" id="reportCapture"><header class="report-header"><p class="eyebrow">心理测试工具</p><h1>我的测评结果</h1><p>所属机构：${escapeHTML(intake?.organizationName || "系统直属")} · 生成时间：${new Date().toLocaleString("zh-CN",{hour12:false})}</p></header><section class="report-block"><h2>来访者资料</h2>${facts}</section><section class="report-block"><h2>已使用量表与评测结果</h2><p class="report-count">${completionText}</p><div class="report-results">${items}</div></section><section class="report-block" data-html2canvas-ignore="true"><h2>给机构留言（可选）</h2><p class="muted-copy">如有补充情况、咨询诉求或对测评结果的疑问，可在这里留言，机构管理方和系统管理员可在后台查看。</p><textarea class="note-textarea" id="clientMessage" rows="4" placeholder="可选填写"></textarea><p id="messageState" class="form-message"></p><button class="secondary-btn" id="saveMessageBtn" type="button">保存留言</button></section><div class="actions" data-html2canvas-ignore="true"><button class="secondary-btn" id="clearReportBtn">清空本次数据</button><button class="primary-btn" id="saveReportBtn">截图保存结果</button></div></section>`;
  document.getElementById("saveMessageBtn").addEventListener("click", async () => {
    const state = document.getElementById("messageState");
    if (!intake?.recordId || !intake?.editToken) { state.textContent = "请先建立来访者档案。"; return; }
    state.textContent = "正在保存留言…";
    try {
      await window.PsyHealthStorage.saveClientMessage(intake.recordId, intake.editToken, document.getElementById("clientMessage").value);
      state.textContent = "留言已保存。";
    } catch (error) {
      state.textContent = error.message || "留言保存失败，请稍后重试。";
    }
  });
  document.getElementById("clearReportBtn").addEventListener("click", () => {
    const confirmation = prompt("这是本机临时数据清空操作，不涉及云端账号。请输入“清空”确认：");
    if (confirmation === "清空") {
      sessionStorage.clear();
      location.reload();
    }
  });
  document.getElementById("saveReportBtn").addEventListener("click", async () => { const canvas = await html2canvas(document.getElementById("reportCapture"),{scale:Math.min(devicePixelRatio*2,3),backgroundColor:"#fff"}); const link=document.createElement("a"); link.download=`心理测试工具-咨询报告-${new Date().toISOString().slice(0,10)}.png`; link.href=canvas.toDataURL("image/png"); link.click(); });
})();
