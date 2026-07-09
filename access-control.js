(function () {
  "use strict";
  function currentScale() {
    const file = decodeURIComponent(location.pathname.split("/").pop() || "");
    if (file === "心理健康90自测量表ByDOMINO.html.html") return 1;
    if (file === "人格85自测量表.html") return 2;
    if (file === "爱情关系合适度测评.html") return 3;
    if (file === "common-scale.html") return ({psq:4,interpersonal:5,sds:6,enrich:7,wellbeing:8,sas:9,ucla:10})[new URLSearchParams(location.search).get("scale")];
    return null;
  }
  const intake = window.PsyHealthStorage?.readSessionIntake();
  const scale = currentScale();
  const allowedScales = Array.isArray(intake?.allowedScales) ? intake.allowedScales.map(Number) : [];
  if (scale && (!intake || !allowedScales.includes(scale))) location.replace("intake.html?required=1");
  window.PsyHealthAccess = {intake,allowedScales,canAccess:number => Boolean(intake && allowedScales.includes(number))};
})();
