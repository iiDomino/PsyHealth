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
  const facts = `<dl class="report-facts"><div><dt>姓名</dt><dd>${esc(profile.name || intake.name)}</dd></div><div><dt>手机号后四位</dt><dd>${esc(intake.phoneLast4 || "-")}</dd></div><div><dt>性别</dt><dd>${esc(intake.gender)}</dd></div><div><dt>出生年</dt><dd>${esc(intake.birthYear || "-")}${intake.birthYear ? " 年" : ""}</dd></div><div><dt>最高学历</dt><dd>${esc(intake.education)}</dd></div><div><dt>职业</dt><dd>${esc(intake.occupation)}</dd></div><div><dt>婚姻状况</dt><dd>${esc(intake.marital)}</dd></div><div><dt>出生城市</dt><dd>${esc(intake.birthCity)}</dd></div><div class="wide"><dt>主要咨询议题</dt><dd>${esc((intake.topics || []).join("、"))}</dd></div><div class="wide"><dt>所属机构</dt><dd>${esc(profile.organizationName || "系统直属")} · ${esc(profile.institutionCode || "-")}</dd></div></dl>`;
  const scaleGroups = Object.entries(grouped).map(([key, list]) => renderScaleGroup(key, list)).join("") || '<p class="muted-copy">尚未完成测评。</p>';
  const messages = sessions.filter(s => s.message).map(s => `<article class="note-card"><time>${esc(fmt(s.updatedAt || s.createdAt))}</time><p>${esc(s.message)}</p></article>`).join("") || '<p class="muted-copy">暂无来访者留言。</p>';
  const logs = (profile.workLogs || []).map(log => renderLog(log)).join("") || '<p class="muted-copy" id="emptyLogs">暂无工作日志。</p>';
  app.innerHTML = `<section class="panel report-panel" id="clientProfileExport"><header class="report-header"><p class="eyebrow">来访者档案</p><h1>${esc(profile.name || intake.name)}的独立档案</h1><p>建档时间：${esc(fmt(profile.createdAt))}</p><div class="actions no-print"><button class="primary-btn" id="exportClientPdfBtn" type="button">导出个人档案 PDF</button></div></header><section class="report-block"><h2>基本信息</h2>${facts}</section><section class="report-block"><h2>来访者留言</h2>${messages}</section><section class="report-block"><h2>机构工作日志</h2><p class="muted-copy">可记录咨询观察、跟进计划或沟通摘要。保存后自动生成日期，可修改或删除。</p><textarea class="note-textarea no-print" id="workLogInput" rows="4" placeholder="填写新的工作日志"></textarea><p id="workLogMessage" class="form-message no-print"></p><button class="secondary-btn no-print" id="saveWorkLogBtn" type="button">保存工作日志</button><div class="work-log-list" id="workLogList">${logs}</div></section><section class="report-block"><h2>测评分类与趋势分析</h2><p class="muted-copy">趋势仅基于同一测评的多次结果自动比较，用于辅助观察变化，仍需结合访谈与实际情况理解。</p><div class="scale-group-list">${scaleGroups}</div></section></section>`;
  document.querySelectorAll(".stacked-scale-group").forEach(item => { item.open = false; });
  document.getElementById("exportClientPdfBtn").addEventListener("click", async () => {
    const button = document.getElementById("exportClientPdfBtn");
    const opened = [...document.querySelectorAll(".stacked-scale-group")].filter(item => item.open);
    document.querySelectorAll(".stacked-scale-group").forEach(item => { item.open = true; });
    button.disabled = true;
    button.textContent = "正在生成 PDF…";
    try {
      await exportProfilePdf(`${profile.name || intake.name || "来访者"}-个人档案.pdf`);
    } catch (error) {
      alert(error.message || "PDF 导出失败，请稍后重试。");
    } finally {
      document.querySelectorAll(".stacked-scale-group").forEach(item => { item.open = opened.includes(item); });
      button.disabled = false;
      button.textContent = "导出个人档案 PDF";
    }
  });
  document.getElementById("saveWorkLogBtn").addEventListener("click", async () => {
    const input = document.getElementById("workLogInput");
    const msg = document.getElementById("workLogMessage");
    msg.textContent = "正在保存工作日志…";
    try {
      await S.saveWorkLog(profile.id, null, input.value);
      location.reload();
    } catch (error) {
      msg.textContent = error.message || "工作日志暂未保存成功，请稍后重试。";
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
    if (!confirm("确认删除这条工作日志吗？删除后无法恢复。")) return;
    const password = prompt("请输入当前管理账号密码确认删除：");
    if (!password) return;
    try {
      await S.adminSignIn(session.email || session.phone, password);
      await S.deleteWorkLog(button.dataset.deleteLog);
      location.reload();
    }
    catch (error) { alert(error.message || "密码验证失败，未删除。"); }
  }));

  function renderScaleGroup(key, list) {
    const chronological = list.slice().sort((a,b) => new Date(a.completedAt || a.sessionAt) - new Date(b.completedAt || b.sessionAt));
    const latestFirst = chronological.slice().reverse();
    const trend = trendText(chronological);
    const latest = latestFirst[0];
    const title = scaleNames[key] || list[0]?.shortTitle || "未命名测评";
    return `<details class="scale-group stacked-scale-group"><summary><span><strong>${esc(title)}</strong><small>${esc(latestFirst.length)} 次测试 · 最新：${esc(fmt(latest?.completedAt || latest?.sessionAt))}</small><em>${esc(trend)}</em></span><b>展开</b></summary>${renderTrendChart(chronological)}<div class="result-comparison">${latestFirst.map((result, index) => renderResult(result, index, latestFirst.length)).join("")}</div></details>`;
  }
  function renderResult(result, index, total) {
    const details = cleanDetails(Array.isArray(result.details) && result.details.length ? result.details : String(result.summary || "").split("；").filter(Boolean));
    return `<article class="report-result compact-result"><div><span class="report-scale">${index === 0 ? "最新" : `倒数第 ${index + 1} 次`} · 共 ${total} 次 · ${esc(fmt(result.completedAt || result.sessionAt))}</span><h3>${esc(result.resultTitle || result.scoreLabel || "测评结果")}</h3></div><div class="mini-score"><strong>${esc(result.score)}</strong><span>${esc(result.scoreLabel || "结果")}</span></div><ul class="report-detail-list">${details.map(line => `<li>${esc(line)}</li>`).join("")}</ul></article>`;
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
  function renderTrendChart(list) {
    const points = list.map((item, index) => ({index, value:Number(String(item.score).match(/-?\d+(\.\d+)?/)?.[0]), time:item.completedAt || item.sessionAt})).filter(item => Number.isFinite(item.value));
    if (points.length < 2) return `<section class="trend-chart-card"><h4>趋势图</h4><p class="muted-copy">当前有效数字结果不足 2 次，暂不生成趋势图。可结合下方详细记录人工比较。</p></section>`;
    const width = 620, height = 210, padX = 44, padY = 32;
    const values = points.map(item => item.value);
    let min = Math.min(...values), max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const x = i => padX + (points.length === 1 ? 0 : i * (width - padX * 2) / (points.length - 1));
    const y = value => height - padY - (value - min) * (height - padY * 2) / (max - min);
    const d = points.map((point, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
    const circles = points.map((point, i) => `<g><circle cx="${x(i).toFixed(1)}" cy="${y(point.value).toFixed(1)}" r="5"></circle><text x="${x(i).toFixed(1)}" y="${(y(point.value)-10).toFixed(1)}">${esc(point.value)}</text></g>`).join("");
    const labels = points.map((point, i) => `<text class="trend-x-label" x="${x(i).toFixed(1)}" y="${height - 8}">${esc(shortDate(point.time))}</text>`).join("");
    const first = points[0].value, last = points[points.length - 1].value, diff = last - first;
    const summary = Math.abs(diff) < 0.01 ? "首末分数基本持平" : `首末分数${diff > 0 ? "上升" : "下降"} ${Math.abs(diff).toFixed(2)}`;
    return `<section class="trend-chart-card"><h4>趋势分析图</h4><p>${esc(summary)}。图表按完成时间从左到右排列，越靠右越新。</p><svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="测评趋势折线图"><line class="trend-axis" x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}"></line><line class="trend-axis" x1="${padX}" y1="${padY}" x2="${padX}" y2="${height-padY}"></line><text class="trend-y-label" x="8" y="${padY+4}">${esc(max.toFixed(2))}</text><text class="trend-y-label" x="8" y="${height-padY+4}">${esc(min.toFixed(2))}</text><path d="${d}"></path>${circles}${labels}</svg></section>`;
  }
  function shortDate(value) {
    if (!value) return "暂无";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "暂无";
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  function renderLog(log) {
    return `<article class="note-card"><time>生成日期：${esc(fmt(log.createdAt))}${log.updatedAt && log.updatedAt !== log.createdAt ? ` · 更新：${esc(fmt(log.updatedAt))}` : ""}</time><p>${esc(log.content)}</p><div class="inline-actions"><button class="secondary-btn" data-edit-log="${esc(log.id)}" type="button">修改</button><button class="danger-ghost-btn" data-delete-log="${esc(log.id)}" type="button">删除</button></div></article>`;
  }
  async function exportProfilePdf(filename) {
    if (typeof html2canvas !== "function") throw new Error("PDF 导出组件尚未加载完成，请刷新后重试。");
    const target = document.getElementById("clientProfileExport");
    target.classList.add("exporting-pdf");
    let canvas;
    try {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      canvas = await html2canvas(target, {scale:2, backgroundColor:"#ffffff", useCORS:true});
    } finally {
      target.classList.remove("exporting-pdf");
    }
    const pdfBytes = canvasToPdf(canvas);
    const blob = new Blob([pdfBytes], {type:"application/pdf"});
    const link = document.createElement("a");
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  function canvasToPdf(canvas) {
    const pageW = 595.28, pageH = 841.89;
    const pageHPx = Math.floor(canvas.width * pageH / pageW);
    const images = [];
    for (let y = 0; y < canvas.height; y += pageHPx) {
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = pageHPx;
      const ctx = slice.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y, canvas.width, Math.min(pageHPx, canvas.height - y), 0, 0, canvas.width, Math.min(pageHPx, canvas.height - y));
      images.push({data:base64ToBytes(slice.toDataURL("image/jpeg", 0.92).split(",")[1]), width:slice.width, height:slice.height});
    }
    return buildPdf(images, pageW, pageH);
  }
  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function buildPdf(images, pageW, pageH) {
    const chunks = [];
    const offsets = [0];
    let length = 0;
    const addText = text => { const bytes = new TextEncoder().encode(text); chunks.push(bytes); length += bytes.length; };
    const addBytes = bytes => { chunks.push(bytes); length += bytes.length; };
    const addObj = (num, body) => { offsets[num] = length; addText(`${num} 0 obj\n${body}\nendobj\n`); };
    addText("%PDF-1.4\n");
    const pageNums = images.map((_, index) => 3 + index * 3);
    addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObj(2, `<< /Type /Pages /Count ${images.length} /Kids [${pageNums.map(num => `${num} 0 R`).join(" ")}] >>`);
    images.forEach((image, index) => {
      const pageNum = 3 + index * 3;
      const contentNum = pageNum + 1;
      const imageNum = pageNum + 2;
      addObj(pageNum, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im${index} ${imageNum} 0 R >> >> /Contents ${contentNum} 0 R >>`);
      const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im${index} Do\nQ`;
      addObj(contentNum, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      offsets[imageNum] = length;
      addText(`${imageNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`);
      addBytes(image.data);
      addText("\nendstream\nendobj\n");
    });
    const xref = length;
    addText(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
    for (let i = 1; i < offsets.length; i += 1) addText(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
    addText(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    const output = new Uint8Array(length);
    let cursor = 0;
    chunks.forEach(chunk => { output.set(chunk, cursor); cursor += chunk.length; });
    return output;
  }
})();
