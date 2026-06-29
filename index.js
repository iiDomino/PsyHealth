(function () {
  "use strict";
  const access = window.PsyHealthAccess;
  const section = document.getElementById("allScalesSection");
  const report = document.getElementById("currentReportCard");
  const intakeEntry = document.getElementById("intakeEntryCard");
  const notice = document.getElementById("accessNotice");
  if (!access?.intake) {
    section.hidden = true; report.hidden = true; notice.hidden = false; return;
  }
  intakeEntry.hidden = true;
  document.querySelectorAll("[data-scale]").forEach(item => { item.closest("li").hidden = !access.canAccess(Number(item.dataset.scale)); });
  notice.hidden = true;
})();
