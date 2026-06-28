(function (root) {
  "use strict";

  function text(value, fallback = "") {
    return typeof value === "string" ? value.slice(0, 500) : fallback;
  }

  function textList(value, limit) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => typeof item === "string" && item.trim()).slice(0, limit).map(item => item.slice(0, 500));
  }

  function normalizeIntake(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return {
      role: text(value.role, "未填写"),
      age: text(value.age, "未填写"),
      duration: text(value.duration, "未填写"),
      impact: text(value.impact, "未填写"),
      topics: textList(value.topics, 8),
      risks: textList(value.risks, 12),
      completedAt: text(value.completedAt)
    };
  }

  function normalizeResults(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item === "object" && !Array.isArray(item)
      && typeof item.id === "string" && typeof item.resultTitle === "string")
      .slice(0, 30)
      .map(item => {
        const urgent = item.urgent === true;
        const priority = urgent ? "urgent" : item.priority === "priority" ? "priority" : "routine";
        return {
          id: text(item.id),
          shortTitle: text(item.shortTitle, text(item.id)),
          resultTitle: text(item.resultTitle),
          score: text(item.score, "—"),
          scoreLabel: text(item.scoreLabel, "结果"),
          summary: text(item.summary, "请结合访谈进一步核对。"),
          urgent,
          priority
        };
      });
  }

  function assessPriority(intake, results) {
    const urgent = Boolean(intake?.risks?.length) || results.some(item => item.urgent === true);
    const elevated = !urgent && (results.some(item => item.priority === "priority") || intake?.impact === "明显");
    if (urgent) return { urgent: true, elevated: false, level: "urgent", className: "priority-red", label: "红色：需要立即人工评估" };
    if (elevated) return { urgent: false, elevated: true, level: "priority", className: "priority-orange", label: "橙色：建议优先访谈或转介评估" };
    return { urgent: false, elevated: false, level: "routine", className: "priority-yellow", label: "黄色：建议在咨询中进一步探索" };
  }

  root.PSY_REPORT_RULES = { normalizeIntake, normalizeResults, assessPriority };
})(typeof window !== "undefined" ? window : globalThis);
