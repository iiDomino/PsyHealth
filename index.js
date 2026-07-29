(function () {
  "use strict";
  const access = window.PsyHealthAccess;
  const section = document.getElementById("allScalesSection");
  const report = document.getElementById("currentReportCard");
  const intakeEntry = document.getElementById("intakeEntryCard");
  const notice = document.getElementById("accessNotice");
  const disclaimer = document.getElementById("homeDisclaimer");
  const consentCheck = document.getElementById("autoConsentCheck");
  const consentMessage = document.getElementById("consentMessage");
  intakeEntry?.addEventListener("click", event => {
    event.preventDefault();
    if (!access?.intake && !consentCheck?.checked) {
      if (consentMessage) consentMessage.textContent = "请先勾选同意说明后再进入。";
      consentCheck?.focus();
      consentCheck?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    location.href = intakeEntry.href;
  });
  consentCheck?.addEventListener("change", () => {
    if (consentCheck.checked && consentMessage) consentMessage.textContent = "";
  });
  if (!access?.intake) {
    section.hidden = true; report.hidden = true; notice.hidden = false; return;
  }
  if (disclaimer) disclaimer.hidden = true;
  if (intakeEntry) {
    intakeEntry.querySelector("strong").textContent = "更新来访资料";
    const cardText = intakeEntry.querySelector(".scale-copy span, span span");
    if (cardText) cardText.textContent = "可更换机构代码或调整基本信息。";
  }
  document.querySelectorAll("[data-scale]").forEach(item => { item.closest("li").hidden = !access.canAccess(Number(item.dataset.scale)); });
  notice.hidden = true;
})();
