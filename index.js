(function () {
  "use strict";
  const access = window.PsyHealthAccess;
  const section = document.getElementById("allScalesSection");
  const report = document.getElementById("currentReportCard");
  const intakeEntry = document.getElementById("intakeEntryCard");
  const notice = document.getElementById("accessNotice");
  const consentCheck = document.getElementById("autoConsentCheck");
  function readConsent() {
    try { return localStorage.getItem("psyhealth-disclaimer-agreed-v1") === "yes"; } catch (_) { return false; }
  }
  if (readConsent() && consentCheck) {
    consentCheck.checked = true;
  }
  intakeEntry?.addEventListener("click", event => {
    event.preventDefault();
    if (consentCheck && !consentCheck.checked) {
      alert("请先勾选已阅读并同意免责声明与风险提示。");
      consentCheck.focus();
      return;
    }
    try { localStorage.setItem("psyhealth-disclaimer-agreed-v1", "yes"); } catch (_) {}
    location.href = intakeEntry.href;
  });
  if (!access?.intake) {
    section.hidden = true; report.hidden = true; notice.hidden = false; return;
  }
  intakeEntry.hidden = true;
  document.querySelectorAll("[data-scale]").forEach(item => { item.closest("li").hidden = !access.canAccess(Number(item.dataset.scale)); });
  notice.hidden = true;
})();
