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
    const isWellbeing = scale.scorer === "wellbeing";
    app.innerHTML = `
      <header class="legacy-quiz-head"><a href="index.html">← 返回主页</a><span>${index + 1} / ${scale.questions.length}</span></header>
      <div class="legacy-progress"><i style="width:${answered / scale.questions.length * 100}%"></i></div>
      <section class="legacy-card question-screen${isWellbeing ? " wellbeing-screen" : ""}">
        <p class="legacy-kicker">${escapeHTML(scale.filename)}</p><h1>${escapeHTML(scale.title)}</h1>
        ${isWellbeing ? "" : `<p class="legacy-instruction">${escapeHTML(scale.instruction)}</p>`}
        <div class="legacy-question"><small>第 ${index + 1} 题</small><strong>${formatQuestion(scale.questions[index], isWellbeing)}</strong></div>
        <div class="legacy-options${isWellbeing ? " wellbeing-options" : ""}">${scale.options.map(([value, label]) => `<button type="button" data-value="${value}" class="${answers[index] === value ? "selected" : ""}">${escapeHTML(label)}</button>`).join("")}</div>
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
    const result = window.PSY_COMMON_SCORING.score(scale.scorer, answers);
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

  function saveResult(result) {
    let records = [];
    try { records = JSON.parse(sessionStorage.getItem("psyhealth-session-results") || "[]"); } catch (_) {}
    const record = {id:`common-${id}`, shortTitle:scale.filename, resultTitle:result.scoreLabel, score:result.score, scoreLabel:"结果", summary:result.details.join("；"), details:result.details, completedAt:new Date().toISOString()};
    records = records.filter(item => item.id !== record.id); records.push(record);
    sessionStorage.setItem("psyhealth-session-results", JSON.stringify(records));
  }

  async function saveScreenshot() {
    const canvas = await html2canvas(document.getElementById("commonResultCapture"), {scale:Math.min(devicePixelRatio * 2,3),backgroundColor:"#fff"});
    const link = document.createElement("a"); link.download = `${scale.filename}-结果.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }
  function formatQuestion(value, isWellbeing) {
    if (!isWellbeing || !value.includes(" — ")) return escapeHTML(value);
    const [left, right] = value.split(" — ");
    return `<span class="wellbeing-scale-line"><span>${escapeHTML(left)}</span><span class="double-arrow">←────→</span><span>${escapeHTML(right)}</span></span>`;
  }
  function escapeHTML(value) { return String(value).replace(/[&<>"']/gu, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]); }
  renderQuestion();
})();
