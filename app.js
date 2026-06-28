(function () {
  "use strict";

  const app = document.getElementById("app");
  const scaleId = new URLSearchParams(window.location.search).get("scale") || "gses";
  const scale = window.PSY_SCALES && window.PSY_SCALES[scaleId];

  if (!scale) {
    app.innerHTML = `<section class="panel"><h1>没有找到这份量表</h1><p class="lead">请返回量表首页重新选择。</p><a class="primary-btn" href="index.html">返回首页</a></section>`;
    return;
  }

  document.title = `${scale.title} · PsyHealth`;
  const answers = new Array(scale.questions.length).fill(null);
  let currentIndex = 0;

  function pageShell(content) {
    app.innerHTML = `
      <header class="topbar">
        <a class="home-link" href="index.html" aria-label="返回量表首页">← 量表首页</a>
        <a class="privacy-pill report-pill" href="report.html">查看本次初筛报告</a>
      </header>
      ${content}
    `;
  }

  function renderWelcome() {
    pageShell(`
      <section class="panel">
        <p class="eyebrow">${scale.icon} ${scale.shortTitle}</p>
        <h1>${scale.title}</h1>
        <p class="lead">${scale.intro}</p>
        <div class="meta-row">
          <span class="meta-chip">${scale.questions.length} 题</span>
          <span class="meta-chip">${scale.duration}</span>
          <span class="meta-chip">${scale.timeframe}</span>
        </div>
        <p class="notice">${scale.notice}</p>
        <div class="actions"><button class="primary-btn" id="startBtn" type="button">开始测评</button></div>
      </section>
    `);
    document.getElementById("startBtn").addEventListener("click", renderQuestion);
  }

  function getQuestion(index) {
    const item = scale.questions[index];
    return typeof item === "string" ? { text: item } : item;
  }

  function getOptions(question) {
    if (!question.options) return scale.options;
    if (typeof question.options[0] === "object") return question.options;
    return question.options.map((label, index) => ({ label, value: index + 1 }));
  }

  function renderQuestion() {
    const question = getQuestion(currentIndex);
    const options = getOptions(question);
    const progress = Math.round(((currentIndex + 1) / scale.questions.length) * 100);
    const optionMarkup = options.map(option => `
      <button type="button" class="option-btn${answers[currentIndex] === option.value ? " selected" : ""}"
        data-value="${option.value}" aria-pressed="${answers[currentIndex] === option.value}">
        <strong>${option.value}</strong> · ${option.label}
      </button>
    `).join("");

    pageShell(`
      <section class="panel" aria-labelledby="questionTitle">
        <div class="progress-head"><span>${scale.shortTitle}</span><span>${currentIndex + 1} / ${scale.questions.length}</span></div>
        <div class="progress-track" aria-hidden="true"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="question-number">第 ${currentIndex + 1} 题</div>
        <h2 id="questionTitle" class="question-text">${question.text}</h2>
        <p class="question-help">${question.help || scale.timeframe}</p>
        <div class="options" role="group" aria-label="请选择一项">${optionMarkup}</div>
        <p id="errorText" class="error-text" role="alert" aria-live="polite"></p>
        <div class="actions">
          <button class="secondary-btn" id="prevBtn" type="button" ${currentIndex === 0 ? "disabled" : ""}>上一题</button>
          <button class="primary-btn" id="nextBtn" type="button">${currentIndex === scale.questions.length - 1 ? "查看结果" : "下一题"}</button>
        </div>
      </section>
    `);

    document.querySelectorAll(".option-btn").forEach(button => {
      button.addEventListener("click", () => {
        answers[currentIndex] = Number(button.dataset.value);
        document.querySelectorAll(".option-btn").forEach(item => {
          const selected = item === button;
          item.classList.toggle("selected", selected);
          item.setAttribute("aria-pressed", String(selected));
          item.disabled = true;
        });
        document.getElementById("errorText").textContent = "";

        if (currentIndex < scale.questions.length - 1) {
          currentIndex += 1;
          renderQuestion();
        } else {
          renderResult();
        }
      });
    });

    document.getElementById("prevBtn").addEventListener("click", () => {
      if (currentIndex > 0) { currentIndex -= 1; renderQuestion(); }
    });
    document.getElementById("nextBtn").addEventListener("click", () => {
      if (answers[currentIndex] === null) {
        document.getElementById("errorText").textContent = "请先选择一项再继续。";
        return;
      }
      if (currentIndex < scale.questions.length - 1) { currentIndex += 1; renderQuestion(); }
      else renderResult();
    });
  }

  function renderResult() {
    const result = scale.score(answers, scale);
    persistResult(result);
    const details = result.details.map(item => `<li>${item}</li>`).join("");
    const urgentMarkup = result.urgent ? `<div class="urgent-box"><strong>安全优先</strong><p>该提示不能判断风险高低，需要咨询师立即进行人工风险评估。如当前存在明确计划、可用手段、近期行为或无法保证安全，请立即联系当地急救、公安或精神卫生医疗机构，并让可信任的人陪同。</p></div>` : "";
    pageShell(`
      <section class="panel" id="resultCapture" aria-labelledby="resultTitle">
        <p class="eyebrow">测评完成</p>
        <h1 id="resultTitle" class="result-title">${result.title}</h1>
        <div class="score-orb" aria-label="${result.scoreLabel} ${result.score}"><div><strong>${result.score}</strong><span>${result.scoreLabel}</span></div></div>
        ${urgentMarkup}
        <p class="result-summary">${result.summary}</p>
        <div class="result-detail"><strong>结果说明</strong><ul>${details}</ul></div>
        <p class="notice" style="margin-top:18px">测评结果仅供自我了解，不能替代专业诊断。若困扰持续、加重或明显影响生活，请及时寻求专业帮助。</p>
        <p class="session-note">本结果已加入<a href="report.html">本次初筛报告</a>，只保存在当前浏览器会话中，不保存逐题答案。</p>
        <div class="actions" data-html2canvas-ignore="true">
          <button class="secondary-btn" id="restartBtn" type="button">重新测评</button>
          <button class="primary-btn" id="saveImageBtn" type="button">截图保存</button>
        </div>
      </section>
    `);
    document.getElementById("restartBtn").addEventListener("click", () => {
      answers.fill(null); currentIndex = 0; renderWelcome();
    });
    document.getElementById("saveImageBtn").addEventListener("click", saveResultImage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function persistResult(result) {
    try {
      const key = "psyhealth-session-results";
      const saved = JSON.parse(window.sessionStorage.getItem(key) || "[]");
      const record = {
        id: scaleId,
        title: scale.title,
        shortTitle: scale.shortTitle,
        score: result.score,
        scoreLabel: result.scoreLabel,
        resultTitle: result.title,
        summary: result.summary,
        details: result.details,
        urgent: Boolean(result.urgent),
        priority: result.priority || (result.urgent ? "urgent" : "routine"),
        completedAt: new Date().toISOString()
      };
      const next = saved.filter(item => item.id !== scaleId);
      next.push(record);
      window.sessionStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      // 某些浏览器会限制 file:// 页面的会话存储；不影响单份量表使用。
    }
  }

  async function saveResultImage() {
    const button = document.getElementById("saveImageBtn");
    if (typeof window.html2canvas !== "function") {
      window.alert("截图组件未能加载，请刷新页面后再试。");
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "正在生成图片…";

    try {
      const canvas = await window.html2canvas(document.getElementById("resultCapture"), {
        scale: Math.min(window.devicePixelRatio * 2, 3),
        backgroundColor: "#ffffff",
        useCORS: true
      });
      const date = new Date().toISOString().slice(0, 10);
      await downloadCanvas(canvas, `${scale.shortTitle}-测评结果-${date}.png`);
    } catch (error) {
      window.alert("截图生成失败，请刷新页面后重试。");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function downloadCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error("无法生成 PNG 图片")); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, "image/png");
    });
  }

  renderWelcome();
})();
