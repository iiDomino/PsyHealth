(async function () {
  "use strict";
  const app = document.getElementById("reportApp");
  let intake = null;
  let localResults = [];
  let selfProfile = null;
  try {
    intake = JSON.parse(sessionStorage.getItem("psyhealth-session-intake") || "null");
    localResults = JSON.parse(sessionStorage.getItem("psyhealth-session-results") || "[]");
  } catch (_) {}

  const activeResultIds = new Set(["legacy-psy90","legacy-personality85","legacy-love40","common-psq","common-interpersonal","common-sds","common-enrich","common-wellbeing","common-sas","common-ucla"]);
  const resultNames = {"legacy-psy90":"心理健康90自测量表","legacy-personality85":"人格85自测量表","legacy-love40":"爱情关系合适度测评","common-psq":"父母问卷（PSQ）","common-interpersonal":"人际关系综合诊断量表","common-sds":"抑郁自评量表（SDS）","common-enrich":"婚姻质量问卷","common-wellbeing":"幸福感指数量表","common-sas":"焦虑自评量表（SAS）","common-ucla":"孤独感自评量表（UCLA）"};
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/gu, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const formatTopics = topics => (topics || []).map(topic => topic === "婚恋" + "难题" ? "婚恋情感" : topic).join("、");
  const fmt = value => value ? new Date(value).toLocaleString("zh-CN",{hour12:false}) : "暂无时间";

  localResults = localResults.filter(item => activeResultIds.has(item.id));
  if (intake?.recordId && intake?.editToken && window.PsyHealthStorage?.clientSelfProfile) {
    try {
      selfProfile = await window.PsyHealthStorage.clientSelfProfile(intake.recordId, intake.editToken);
      if (selfProfile?.intake) {
        intake = {...intake, ...selfProfile.intake, organizationName:selfProfile.organizationName || intake.organizationName};
        sessionStorage.setItem("psyhealth-session-intake", JSON.stringify(intake));
      }
    } catch (_) {}
  }

  if (!intake && !localResults.length) {
    app.innerHTML = '<section class="panel empty-report"><p class="eyebrow">测评结果</p><h1>暂无可查看的测评记录</h1><p class="lead">请先通过来访入口填写资料，并在完成测评后返回这里查看结果。</p><a class="primary-btn button-link" href="intake.html">来访入口</a></section>';
    return;
  }

  const sessions = buildSessions();
  const allResults = sessions.flatMap(session => (session.results || []).map(result => ({...result, sessionId:session.id, sessionAt:session.createdAt})));
  const completionText = allResults.length ? `当前档案共记录 ${sessions.length} 次测评批次，${allResults.length} 项测评结果。` : "当前档案尚未记录测评结果。";
  const facts = intake ? `<dl class="report-facts"><div class="wide"><dt>所属机构</dt><dd>${escapeHTML(intake.organizationName || selfProfile?.organizationName || "系统直属")}</dd></div><div><dt>姓名</dt><dd>${escapeHTML(intake.name)}</dd></div><div><dt>手机号后四位</dt><dd>${escapeHTML(intake.phoneLast4 || "-")}</dd></div><div><dt>性别</dt><dd>${escapeHTML(intake.gender)}</dd></div><div><dt>出生年</dt><dd>${escapeHTML(intake.birthYear || "-")}${intake.birthYear ? " 年" : ""}</dd></div><div><dt>最高学历</dt><dd>${escapeHTML(intake.education)}</dd></div><div><dt>职业</dt><dd>${escapeHTML(intake.occupation)}</dd></div><div><dt>婚姻状况</dt><dd>${escapeHTML(intake.marital)}</dd></div><div><dt>出生城市</dt><dd>${escapeHTML(intake.birthCity)}</dd></div><div class="wide"><dt>主要咨询议题</dt><dd>${escapeHTML(formatTopics(intake.topics))}</dd></div></dl>` : '<p class="muted-copy">尚未填写来访资料。</p>';
  const grouped = allResults.reduce((map, result) => {
    const key = result.id || "unknown";
    (map[key] ||= []).push(result);
    return map;
  }, {});
  const scaleGroups = Object.entries(grouped).map(([key, list]) => renderScaleGroup(key, list)).join("") || '<p class="muted-copy">尚未完成测评。</p>';

  app.innerHTML = `<section class="panel report-panel" id="reportCapture"><header class="report-header"><p class="eyebrow">测评结果</p><h1>我的测评结果</h1><p>所属机构：${escapeHTML(intake?.organizationName || selfProfile?.organizationName || "系统直属")} · 生成时间：${fmt(new Date().toISOString())}</p></header><section class="report-block"><h2>来访者资料</h2>${facts}</section><section class="report-block"><h2>既往测评记录</h2><p class="report-count">${escapeHTML(completionText)}</p><p class="muted-copy">相同测评项目已自动堆叠。点击项目可按时间查看全部历史结果。</p><div class="scale-group-list">${scaleGroups}</div></section><section class="report-block" data-html2canvas-ignore="true"><h2>给机构留言（可选）</h2><p class="muted-copy">如有补充情况、咨询诉求或对测评结果的疑问，可在这里留言，所属机构和系统管理员可在必要范围内查看。</p><textarea class="note-textarea" id="clientMessage" rows="4" placeholder="可补充当前状态、希望讨论的问题或对结果的疑问"></textarea><p id="messageState" class="form-message"></p><button class="secondary-btn" id="saveMessageBtn" type="button">保存留言</button></section><div class="actions" data-html2canvas-ignore="true"><button class="secondary-btn" id="clearReportBtn">清空本机临时数据</button><button class="primary-btn" id="saveReportBtn">截图保存结果</button></div></section>`;

  document.getElementById("saveMessageBtn").addEventListener("click", async () => {
    const state = document.getElementById("messageState");
    if (!intake?.recordId || !intake?.editToken) { state.textContent = "请先通过来访入口建立档案。"; return; }
    state.textContent = "正在保存留言…";
    try {
      await window.PsyHealthStorage.saveClientMessage(intake.recordId, intake.editToken, document.getElementById("clientMessage").value);
      state.textContent = "留言已保存，所属机构可在后台查看。";
    } catch (error) {
      state.textContent = error.message || "留言保存失败，请稍后重试。";
    }
  });
  document.getElementById("clearReportBtn").addEventListener("click", () => {
    const confirmation = prompt("该操作只清空当前浏览器中的临时会话，不会删除云端档案或测评结果。请输入“清空”确认：");
    if (confirmation === "清空") {
      sessionStorage.clear();
      location.reload();
    }
  });
  document.getElementById("saveReportBtn").addEventListener("click", async () => {
    const canvas = await html2canvas(document.getElementById("reportCapture"),{scale:Math.min(devicePixelRatio*2,3),backgroundColor:"#fff"});
    const link=document.createElement("a");
    link.download=`心理健康工作平台-测评结果-${new Date().toISOString().slice(0,10)}.png`;
    link.href=canvas.toDataURL("image/png");
    link.click();
  });

  function buildSessions() {
    if (selfProfile?.sessions?.length) {
      return selfProfile.sessions.map(session => ({
        ...session,
        results: (session.results || []).filter(item => activeResultIds.has(item.id))
      })).filter(session => session.results.length);
    }
    if (localResults.length) {
      return [{id:intake?.recordId || "local", isCurrent:true, createdAt:intake?.completedAt || new Date().toISOString(), updatedAt:new Date().toISOString(), results:localResults}];
    }
    return [];
  }

  function renderScaleGroup(key, list) {
    const chronological = list.slice().sort((a,b) => new Date(a.completedAt || a.sessionAt) - new Date(b.completedAt || b.sessionAt));
    const latestFirst = chronological.slice().reverse();
    const trend = trendText(chronological);
    const latest = latestFirst[0];
    const title = resultNames[key] || list[0]?.shortTitle || "未命名测评";
    const openAttr = latestFirst.length === 1 ? " open" : "";
    return `<details class="scale-group stacked-scale-group"${openAttr}><summary><span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(latestFirst.length)} 次测试 · 最新：${escapeHTML(fmt(latest?.completedAt || latest?.sessionAt))}</small><em>${escapeHTML(trend)}</em></span><b>展开</b></summary><div class="result-comparison">${latestFirst.map((result, index) => renderResult(result, index, latestFirst.length)).join("")}</div></details>`;
  }

  function renderResult(item, index, total) {
    const detailLines = cleanDetails(Array.isArray(item.details) && item.details.length ? item.details : String(item.summary || "").split("；").filter(Boolean));
    return `<article class="report-result compact-result"><div><span class="report-scale">${index === 0 ? "最新" : `倒数第 ${index + 1} 次`} · 共 ${total} 次 · ${escapeHTML(fmt(item.completedAt || item.sessionAt))}</span><h3>${escapeHTML(item.resultTitle || item.scoreLabel || "测评结果")}</h3></div><div class="mini-score"><strong>${escapeHTML(item.score)}</strong><span>${escapeHTML(item.scoreLabel || "结果")}</span></div><ul class="report-detail-list">${detailLines.map(line => `<li>${escapeHTML(line)}</li>`).join("")}</ul></article>`;
  }
  function cleanDetails(details) {
    const removedPrefix = "解释" + "说明";
    return details.map(line => String(line || "").trim()).filter(line => line && !line.startsWith(removedPrefix));
  }
  function trendText(list) {
    if (list.length < 2) return "目前仅有 1 次结果，暂不形成趋势判断。";
    const nums = list.map(item => Number(String(item.score).match(/-?\d+(\.\d+)?/)?.[0])).filter(Number.isFinite);
    if (nums.length < 2) return `共 ${list.length} 次结果，分数格式不统一，建议结合详细内容人工比较。`;
    const first = nums[0], last = nums[nums.length - 1], diff = last - first;
    if (Math.abs(diff) < 0.01) return `共 ${list.length} 次结果，首末分数基本持平。`;
    return `共 ${list.length} 次结果，首末分数${diff > 0 ? "上升" : "下降"} ${Math.abs(diff).toFixed(2)}。请结合该量表含义判断改善或风险变化。`;
  }
})();
