(function () {
  "use strict";

  const form = document.getElementById("intakeForm");
  const app = document.getElementById("intakeApp");
  const catalog = window.PSY_CATALOG;

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const topics = data.getAll("topic");
    const risks = data.getAll("risk");

    if (!topics.length) {
      document.getElementById("formError").textContent = "请至少选择一个目前最想解决的问题。";
      return;
    }

    const role = data.get("role");
    const age = data.get("age");
    const duration = data.get("duration");
    const impact = data.get("impact");
    try {
      window.sessionStorage.setItem("psyhealth-session-intake", JSON.stringify({
        role, age, duration, impact, topics, risks, completedAt: new Date().toISOString()
      }));
    } catch (error) {
      // 会话存储不可用时仍可显示当前结果。
    }
    const riskMarkup = risks.length
      ? `<div class="urgent-box"><strong>需要优先人工评估</strong><p>你勾选了安全或紧急情况。请不要仅依赖在线测评；如存在现实危险，请立即联系当地急救、公安或精神卫生医疗机构，并让可信任的人陪同。</p><ul>${risks.map(item => `<li>${item}</li>`).join("")}</ul></div>`
      : `<div class="result-detail"><strong>当前未勾选紧急风险</strong><p>这不代表完全没有风险；咨询师仍需在访谈中进一步确认。</p></div>`;

    const recommendations = topics.map(id => {
      const category = catalog.categories[id];
      const available = catalog.scales.filter(item => item.category === id);
      return `
        <article class="recommend-card">
          <span class="card-icon">${category.icon}</span>
          <div>
            <strong>${category.title}</strong>
            <p>${category.description}</p>
            <a class="secondary-btn inline-btn" href="category.html?category=${id}">${available.length ? `查看 ${available.length} 份可用测评` : "查看分类与后续量表"}</a>
          </div>
        </article>
      `;
    }).join("");

    app.innerHTML = `
      <p class="eyebrow">咨询前初筛摘要</p>
      <h1>建议的测评方向</h1>
      <div class="result-detail intake-summary">
        <p><strong>填写身份：</strong>${role}</p>
        <p><strong>年龄阶段：</strong>${age}</p>
        <p><strong>持续时间：</strong>${duration}</p>
        <p><strong>生活影响：</strong>${impact}</p>
      </div>
      ${riskMarkup}
      <div class="recommend-list">${recommendations}</div>
      <p class="notice">这份摘要只用于安排测评与初访，不是诊断结论。若求助者不满 14 周岁，后续处理心理健康信息需取得监护人同意。</p>
      <div class="actions"><button class="secondary-btn" id="restartIntake" type="button">重新填写</button><a class="primary-btn button-link" href="report.html">查看本次初筛报告</a></div>
    `;

    document.getElementById("restartIntake").addEventListener("click", () => window.location.reload());
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
