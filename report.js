(function () {
  "use strict";

  const app = document.getElementById("reportApp");
  const rules = window.PSY_REPORT_RULES;
  let intake = null;
  let results = [];

  try {
    intake = JSON.parse(window.sessionStorage.getItem("psyhealth-session-intake") || "null");
    results = JSON.parse(window.sessionStorage.getItem("psyhealth-session-results") || "[]");
  } catch (error) {
    intake = null;
    results = [];
  }

  intake = rules.normalizeIntake(intake);
  results = rules.normalizeResults(results);

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/gu, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[character]);
  }

  if (!intake && !results.length) {
    app.innerHTML = `
      <section class="panel empty-report">
        <p class="eyebrow">咨询辅助报告</p>
        <h1>本次还没有初筛内容</h1>
        <p class="lead">先完成初次来访筛查或任意一份量表，结果会在当前浏览器会话中汇总到这里。</p>
        <div class="actions"><a class="primary-btn button-link" href="intake.html">开始初次来访筛查</a></div>
      </section>`;
    return;
  }

  const priorityState = rules.assessPriority(intake, results);
  const { urgent, elevated } = priorityState;
  const topicNames = intake ? intake.topics.map(id => window.PSY_CATALOG.categories[id]?.title || id) : [];
  const questions = buildInterviewQuestions(intake, results, urgent);
  const now = new Date();

  const intakeMarkup = intake ? `
    <section class="report-block">
      <h2>来访信息摘要</h2>
      <dl class="report-facts">
        <div><dt>填写身份</dt><dd>${escapeHTML(intake.role)}</dd></div>
        <div><dt>年龄阶段</dt><dd>${escapeHTML(intake.age)}</dd></div>
        <div><dt>困扰时间</dt><dd>${escapeHTML(intake.duration)}</dd></div>
        <div><dt>功能影响</dt><dd>${escapeHTML(intake.impact)}</dd></div>
        <div class="wide"><dt>主要求助主题</dt><dd>${escapeHTML(topicNames.join("、"))}</dd></div>
      </dl>
    </section>` : `<section class="report-block"><h2>来访信息摘要</h2><p class="muted-copy">尚未完成初次来访综合筛查。</p></section>`;

  const resultsMarkup = results.length ? results.map(item => `
    <article class="report-result${item.urgent ? " urgent-result" : ""}">
      <div><span class="report-scale">${escapeHTML(item.shortTitle)}</span><h3>${escapeHTML(item.resultTitle)}</h3></div>
      <div class="mini-score"><strong>${escapeHTML(item.score)}</strong><span>${escapeHTML(item.scoreLabel)}</span></div>
      <p>${escapeHTML(item.summary)}</p>
    </article>`).join("") : `<p class="muted-copy">尚未完成具体量表。</p>`;

  const riskItems = [
    ...(intake?.risks || []),
    ...results.filter(item => item.urgent).map(item => `${item.shortTitle} 出现需要人工复核的风险回答`)
  ];

  app.innerHTML = `
    <section class="panel report-panel" id="reportCapture">
      <header class="report-header">
        <p class="eyebrow">PsyHealth · 咨询辅助</p>
        <h1>本次初筛报告</h1>
        <p>生成时间：${now.toLocaleString("zh-CN", { hour12: false })}</p>
      </header>
      <div class="priority-banner ${priorityState.className}"><strong>${priorityState.label}</strong><span>该分级用于安排后续处理优先级，不是诊断结论。</span></div>
      ${urgent ? `<div class="urgent-box"><strong>安全风险提示</strong><p>当前存在需要立即人工确认的风险信号。应进一步评估当前想法、意图、计划、可用手段、既往行为、现实危险与保护因素；如无法保证安全，请立即联系当地急救、公安或精神卫生医疗机构。</p><ul>${riskItems.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul></div>` : ""}
      ${intakeMarkup}
      <section class="report-block"><h2>已完成量表</h2><div class="report-results">${resultsMarkup}</div></section>
      <section class="report-block"><h2>建议访谈追问</h2><ol class="interview-list">${questions.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ol></section>
      <section class="report-block"><h2>初步处理建议</h2><p>${buildNextStep(urgent, elevated, results.length)}</p></section>
      <footer class="report-disclaimer">本报告由自评信息自动整理，仅用于心理咨询前的信息收集、风险提示与访谈辅助，不构成精神障碍诊断、医学诊断或治疗方案。精神障碍诊断应由具备法定资质的精神科执业医师作出。</footer>
      <div class="actions" data-html2canvas-ignore="true">
        <button class="secondary-btn" id="clearReportBtn" type="button">清空本次数据</button>
        <button class="primary-btn" id="saveReportBtn" type="button">截图保存报告</button>
      </div>
    </section>`;

  document.getElementById("clearReportBtn").addEventListener("click", () => {
    if (!window.confirm("确认清空当前浏览器会话中的初筛摘要和量表结果吗？")) return;
    window.sessionStorage.removeItem("psyhealth-session-intake");
    window.sessionStorage.removeItem("psyhealth-session-results");
    window.location.reload();
  });

  document.getElementById("saveReportBtn").addEventListener("click", saveReportImage);

  function buildInterviewQuestions(intakeData, scaleResults, hasUrgentRisk) {
    const items = [
      "这次最希望咨询帮助解决的具体问题是什么？理想的变化是什么？",
      "困扰最早何时出现，最近是否有明显诱因或变化？",
      "目前对睡眠、饮食、学习、工作、自我照顾和关系分别有什么影响？",
      "过去曾使用哪些应对方法？哪些有帮助，哪些反而加重了问题？",
      "目前有哪些可信任的人、稳定活动或其他保护性资源？"
    ];
    if (hasUrgentRisk) items.unshift("请立即完成结构化安全风险访谈：当前想法、意图、计划、手段、时间点、既往行为、物质使用、可获得支持和安全计划。");
    if (scaleResults.some(item => item.id === "phq9")) items.push("进一步确认核心抑郁症状、持续时间、昼夜变化、既往发作及躁狂或轻躁狂史。");
    if (scaleResults.some(item => item.id === "gad7" || item.id === "sas")) items.push("焦虑主要围绕哪些主题？是否难以控制？有哪些回避、安全行为和明显躯体症状？");
    if (scaleResults.some(item => item.id === "audit")) items.push("核对酒类、容量和酒精度，了解戒断表现、失控饮酒、驾驶风险、用药与身体后果。");
    if (scaleResults.some(item => item.id === "relationship_checkin")) items.push("分别了解双方对冲突循环、关系目标、权力边界和安全感的看法；不要用单方回答替另一方下结论。");
    if (scaleResults.some(item => item.id === "family_checkin")) items.push("了解每名家庭成员对问题、角色、边界和资源的不同描述，并确认谁需要参加后续家庭访谈。");
    if (scaleResults.some(item => item.id === "interpersonal_checkin")) items.push("区分社交意愿、社交焦虑、技能困难、环境排斥和个人独处偏好，明确最想改变的具体情境。");
    if (scaleResults.some(item => item.id === "youth_checkin")) items.push("分别收集儿童青少年本人、监护人和学校信息，核对发展阶段、家庭变化、欺凌及校园适应。");
    if (scaleResults.some(item => item.id === "wellbeing_checkin")) items.push("核对睡眠作息、白天功能、身体症状、就医与用药情况，区分需优先医疗评估与可在咨询中继续探索的内容。");
    if (intakeData?.age === "不满14岁" || intakeData?.age === "14–17岁") items.push("分别了解未成年人本人、监护人和学校视角，并确认监护同意、校园安全与家庭环境。");
    return items;
  }

  function buildNextStep(hasUrgentRisk, hasElevatedResult, resultCount) {
    if (hasUrgentRisk) return "暂停常规自动解释，优先完成安全评估，并根据现实危险程度联系监护人、可信任支持者、急救、公安或精神卫生医疗机构。";
    if (hasElevatedResult) return "建议优先安排较完整的初访，核对症状、功能影响、既往史、躯体疾病、用药和物质使用；必要时建议精神科或相关医疗机构评估。";
    if (!resultCount) return "根据主要求助主题选择 1–3 份适合的量表，再结合访谈形成初步个案理解。";
    return "可在咨询中结合求助目标、量表线索、现实处境和资源优势进一步形成个案理解；低分不能排除实际困扰。";
  }

  async function saveReportImage() {
    const button = document.getElementById("saveReportBtn");
    if (typeof window.html2canvas !== "function") {
      window.alert("截图组件未能加载，请刷新页面后再试。");
      return;
    }
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "正在生成图片…";
    try {
      const canvas = await window.html2canvas(document.getElementById("reportCapture"), {
        scale: Math.min(window.devicePixelRatio * 2, 3),
        backgroundColor: "#ffffff",
        useCORS: true
      });
      await downloadCanvas(canvas, `PsyHealth-初筛报告-${new Date().toISOString().slice(0, 10)}.png`);
    } catch (error) {
      window.alert("报告截图生成失败，请刷新页面后重试。");
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
})();
