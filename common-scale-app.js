(function () {
  "use strict";
  const app = document.getElementById("commonScaleApp");
  const id = new URLSearchParams(location.search).get("scale");
  const scale = window.PSY_COMMON_SCALES?.[id];
  if (!scale) { app.innerHTML = '<section class="legacy-card"><h1>未找到该量表</h1><a href="index.html">返回主页</a></section>'; return; }

  let index = 0;
  let answers = Array(scale.questions.length).fill(null);
  document.title = `${scale.filename} · PsyHealth`;

  function renderQuestion() {
    const answered = answers.filter(value => value !== null).length;
    app.innerHTML = `
      <header class="legacy-quiz-head"><a href="index.html">← 返回主页</a><span>${index + 1} / ${scale.questions.length}</span></header>
      <div class="legacy-progress"><i style="width:${answered / scale.questions.length * 100}%"></i></div>
      <section class="legacy-card question-screen">
        <p class="legacy-kicker">${escapeHTML(scale.filename)}</p><h1>${escapeHTML(scale.title)}</h1>
        <p class="legacy-instruction">${escapeHTML(scale.instruction)}</p>
        <div class="legacy-question"><small>第 ${index + 1} 题</small><strong>${escapeHTML(scale.questions[index])}</strong></div>
        <div class="legacy-options">${scale.options.map(([value, label]) => `<button type="button" data-value="${value}" class="${answers[index] === value ? "selected" : ""}">${escapeHTML(label)}</button>`).join("")}</div>
        <div class="legacy-nav"><button type="button" id="prevBtn" ${index === 0 ? "disabled" : ""}>上一题</button><button type="button" id="nextBtn" ${answers[index] === null ? "disabled" : ""}>${index === scale.questions.length - 1 ? "查看结果" : "下一题"}</button></div>
      </section>`;
    app.querySelectorAll("[data-value]").forEach(button => button.addEventListener("click", () => {
      answers[index] = Number(button.dataset.value);
      if (index < scale.questions.length - 1) { index += 1; renderQuestion(); }
      else showResult();
    }));
    document.getElementById("prevBtn").addEventListener("click", () => { index -= 1; renderQuestion(); });
    document.getElementById("nextBtn").addEventListener("click", () => index === scale.questions.length - 1 ? showResult() : (index += 1, renderQuestion()));
  }

  function showResult() {
    const missing = answers.indexOf(null);
    if (missing !== -1) { index = missing; renderQuestion(); return; }
    const result = scoreResult(scale.scorer, answers);
    saveResult(result);
    app.innerHTML = `
      <header class="legacy-quiz-head"><a href="index.html">← 返回主页</a><a href="report.html">查看粗筛报告 →</a></header>
      <section class="legacy-card result-screen" id="commonResultCapture">
        <p class="legacy-kicker">测评结果</p><h1>${escapeHTML(scale.title)}</h1>
        <div class="legacy-score"><strong>${escapeHTML(result.score)}</strong><span>${escapeHTML(result.scoreLabel)}</span></div>
        <div class="legacy-result-lines">${result.details.map(line => `<p>${escapeHTML(line)}</p>`).join("")}</div>
        <p class="result-time">完成时间：${new Date().toLocaleString("zh-CN", {hour12:false})}</p>
        <div class="actions" data-html2canvas-ignore="true"><button class="secondary-btn" id="redoBtn">重新测评</button><button class="primary-btn" id="shotBtn">截图保存结果</button></div>
      </section>`;
    document.getElementById("redoBtn").addEventListener("click", () => { index = 0; answers = Array(scale.questions.length).fill(null); renderQuestion(); });
    document.getElementById("shotBtn").addEventListener("click", saveScreenshot);
  }

  function scoreResult(kind, values) {
    const sum = list => list.reduce((total, value) => total + value, 0);
    const picked = list => list.map(number => values[number - 1]);
    if (kind === "psq") {
      const factors = {"品行问题":[2,8,14,19,20,21,22,23,27,33,34,39],"学习问题":[10,25,31,37],"心身问题":[32,41,43,44,48],"冲动-多动":[4,5,11,13],"焦虑":[12,16,24,47],"多动指数":[4,7,11,13,14,25,31,33,37,38]};
      const details = Object.entries(factors).map(([name, items]) => `${name}均分：${(sum(picked(items)) / items.length).toFixed(2)}`);
      return {score:(sum(values) / values.length).toFixed(2), scoreLabel:"全量表平均分", details};
    }
    if (kind === "epq85") {
      const yes = {E:[1,5,9,13,16,22,29,32,35,40,43,46,49,53,56,61,72,76,85],N:[3,6,11,14,18,20,24,28,30,34,36,42,47,51,54,59,63,66,67,70,74,78,82,84],P:[19,23,27,38,41,44,57,58,65,69,73,77],L:[12,31,48,68,79,81]};
      const no = {E:[26,37],N:[],P:[2,8,10,17,33,50,62,80],L:[4,7,15,21,25,39,45,52,55,60,64,71,75,83]};
      const dimensions = Object.keys(yes).map(key => [key, sum(picked(yes[key])) + no[key].filter(number => values[number - 1] === 0).length]);
      return {score:dimensions.map(item => item.join(":" )).join(" · "), scoreLabel:"各维度原始分", details:dimensions.map(([key,value]) => `${key} 维度：${value} 分`)};
    }
    if (kind === "interpersonal") {
      const groups = [[1,5,9,13,17,21,25],[2,6,10,14,18,22,26],[3,7,11,15,19,23,27],[4,8,12,16,20,24,28]].map(items => sum(picked(items)));
      const total = sum(values); const level = total <= 8 ? "困扰较少" : total <= 14 ? "存在一定困扰" : total <= 20 ? "困扰较严重" : "困扰程度很严重";
      return {score:total, scoreLabel:level, details:[`交谈：${groups[0]} 分`,`交际：${groups[1]} 分`,`待人接物：${groups[2]} 分`,`异性交往：${groups[3]} 分`]};
    }
    if (kind === "sds" || kind === "sas") {
      const reverse = kind === "sds" ? [2,5,6,11,12,14,16,17,18,20] : [5,9,13,17,19];
      const raw = sum(values.map((value, i) => reverse.includes(i + 1) ? 5 - value : value));
      const standard = Math.round(raw * 1.25); const level = standard < 50 ? "50 分以下" : standard < 60 ? "50–59 分" : standard < 70 ? "60–69 分" : "70 分及以上";
      return {score:standard, scoreLabel:"标准分", details:[`原始分：${raw}`,`分数区间：${level}`]};
    }
    if (kind === "enrich") {
      const negative = new Set([3,4,5,6,7,8,10,12,13,14,16,17,18,24,25,26,28,29,30,32,37,40,43,44,47,48,49,52,53,54,55,56,57,59,61,63,64,66,69,70,71,72,73,74,75,81,84,85,86,87,88,90,92,93,94,95,96,97,98,99,100,101,105,106,111,115,117,118,123]);
      const scored = values.map((value,i) => negative.has(i + 1) ? value : 6 - value); const total = sum(scored);
      const factors = {"满意度":[14,19,32,36,52,53,82,88,99,113],"交流":[2,6,40,54,66,73,81,91,98,109],"解决冲突":[4,10,39,58,71,74,79,83,96,112],"经济安排":[16,20,26,38,45,51,77,85,93,110],"性生活":[9,15,25,41,47,62,69,106,107,111],"子女与婚姻":[5,21,35,49,50,59,67,87,94,102]};
      return {score:total, scoreLabel:"婚姻质量总分", details:Object.entries(factors).map(([name,items]) => `${name}：${sum(items.map(n => scored[n-1]))} 分`)};
    }
    if (kind === "wellbeing") {
      const reversed = values.map(value => 8 - value); const total = sum(reversed.slice(0,8)) / 8 + reversed[8] * 1.1;
      return {score:total.toFixed(2), scoreLabel:"幸福感指数", details:["理论范围：2.10–14.70","分数越高，当前幸福感越高"]};
    }
    if (kind === "emotion") {
      const yes = values.filter(v => v === 1).length, uncertain = values.filter(v => v === .5).length, no = values.filter(v => v === 0).length;
      return {score:`${scale.questions.length} 题`, scoreLabel:"已完成", details:[`是：${yes} 题`,`不一定：${uncertain} 题`,`否：${no} 题`,`原文件未附计分键，本报告仅记录作答分布。`]};
    }
    const reverse = new Set([1,5,6,9,10,15,16,19,20]); const total = sum(values.map((value,i) => reverse.has(i+1) ? 5-value : value));
    const level = total >= 45 ? "高度孤独" : total >= 39 ? "一般偏上孤独" : total >= 33 ? "中间水平" : total >= 28 ? "一般偏下孤独" : "低度孤独";
    return {score:total, scoreLabel:level, details:[`总分：${total}`,`结果区间：${level}`]};
  }

  function saveResult(result) {
    let records = [];
    try { records = JSON.parse(sessionStorage.getItem("psyhealth-session-results") || "[]"); } catch (_) {}
    const record = {id:`common-${id}`, shortTitle:scale.filename, resultTitle:result.scoreLabel, score:result.score, scoreLabel:"结果", summary:result.details.join("；"), completedAt:new Date().toISOString()};
    records = records.filter(item => item.id !== record.id); records.push(record);
    sessionStorage.setItem("psyhealth-session-results", JSON.stringify(records));
  }

  async function saveScreenshot() {
    const canvas = await html2canvas(document.getElementById("commonResultCapture"), {scale:Math.min(devicePixelRatio * 2,3),backgroundColor:"#fff"});
    const link = document.createElement("a"); link.download = `${scale.filename}-结果.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }
  function escapeHTML(value) { return String(value).replace(/[&<>"']/gu, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]); }
  renderQuestion();
})();
