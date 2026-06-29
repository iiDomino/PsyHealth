(function () {
  "use strict";
  const allowed = {
    "0912": [1,2,3,4,5,6,7,8,9,10],
    "2408": [2,3,4,5,7,8],
    "2403": [1,2,6,9,10]
  };
  function currentScale() {
    const file = decodeURIComponent(location.pathname.split("/").pop() || "");
    if (file === "PsyHealth90自测量表ByDOMINO.html.html") return 1;
    if (file === "人格85自测量表.html") return 2;
    if (file === "爱情关系合适度测评.html") return 3;
    if (file === "common-scale.html") return ({psq:4,interpersonal:5,sds:6,enrich:7,wellbeing:8,sas:9,ucla:10})[new URLSearchParams(location.search).get("scale")];
    return null;
  }
  const intake = window.PsyHealthStorage?.readSessionIntake();
  const code = sessionStorage.getItem("psyhealth-access-code") || intake?.accessCode;
  const scale = currentScale();
  if (scale && (!intake || !allowed[code]?.includes(scale))) location.replace("intake.html?required=1");
  window.PsyHealthAccess = {allowed, code, intake, canAccess:number => Boolean(intake && allowed[code]?.includes(number))};
})();
