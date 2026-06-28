(function () {
  "use strict";

  const app = document.getElementById("categoryApp");
  const catalog = window.PSY_CATALOG;
  const categoryId = new URLSearchParams(window.location.search).get("category");
  const category = catalog.categories[categoryId];

  if (!category) {
    app.innerHTML = `<section class="panel"><h1>没有找到这个分类</h1><a class="home-link" href="index.html">← 返回首页</a></section>`;
    return;
  }

  document.title = `${category.title} · PsyHealth`;
  const scales = catalog.scales.filter(item => item.category === categoryId);
  const scaleMarkup = scales.length
    ? scales.map(item => `
        <a class="scale-card mint" href="scale.html?scale=${item.id}">
          <span class="card-icon">📋</span>
          <span class="card-kicker">${item.meta}</span>
          <strong>${item.title}</strong>
          <span>${item.description}</span>
        </a>
      `).join("")
    : `<div class="empty-state"><strong>该分类的量表正在复核中</strong><p>只有完成版本、计分、适用性和授权检查后才会开放。</p></div>`;

  app.innerHTML = `
    <header class="topbar"><a class="home-link" href="index.html">← 返回首页</a><span class="privacy-pill">🔒 默认本地计算</span></header>
    <section class="category-hero">
      <span class="category-icon">${category.icon}</span>
      <p class="eyebrow">求助主题</p>
      <h1>${category.title}</h1>
      <p class="lead">${category.description}</p>
      <div class="topic-chips">${category.directions.map(item => `<span>${item}</span>`).join("")}</div>
    </section>
    <section class="section-heading"><div><p class="eyebrow">可用测评</p><h2>选择一份量表开始</h2></div></section>
    <section class="scale-grid">${scaleMarkup}</section>
    <aside class="safety-note"><strong>提示</strong><p>量表结果用于咨询前筛查和访谈参考，不等同于诊断。系统不会因为单一分数给出精神障碍结论。</p></aside>
  `;
})();
