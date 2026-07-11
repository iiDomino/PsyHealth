(function () {
  "use strict";
  const form = document.getElementById("intakeForm");
  const app = document.getElementById("intakeApp");
  const PROFILE_KEY = "psyhealth-client-profile-memory-v1";
  const nameInput = form.elements.name;
  function readProfiles() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); } catch (_) { return {}; } }
  function profileKey(name) { return String(name || "").trim().replace(/\s+/g, " ").toLowerCase(); }
  function applyProfile(profile) {
    if (!profile) return;
    ["gender","age","education","occupation","marital","birthCity","referralCode"].forEach(name => {
      if (profile[name] !== undefined && form.elements[name]) form.elements[name].value = profile[name];
    });
    form.querySelectorAll('input[name="topic"]').forEach(box => { box.checked = (profile.topics || []).includes(box.value); });
    document.getElementById("formError").textContent = "已自动填入上次保存的信息，可按需手动修改。";
  }
  function rememberProfile(intake, code) {
    const profiles = readProfiles();
    profiles[profileKey(intake.name)] = {
      name: intake.name,
      gender: intake.gender,
      age: intake.age,
      education: intake.education,
      occupation: intake.occupation,
      marital: intake.marital,
      birthCity: intake.birthCity,
      topics: intake.topics || [],
      referralCode: code,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  }
  nameInput.addEventListener("change", () => applyProfile(readProfiles()[profileKey(nameInput.value)]));
  nameInput.addEventListener("blur", () => applyProfile(readProfiles()[profileKey(nameInput.value)]));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form); const topics = data.getAll("topic");
    if (!topics.length) { document.getElementById("formError").textContent = "请至少选择一个咨询问题分类。"; return; }
    const code = String(data.get("referralCode") || "").trim();
    const submitButton = form.querySelector('[type="submit"]'); submitButton.disabled = true; submitButton.textContent = "正在保存…";
    let intake;
    try { intake = await window.PsyHealthStorage.begin({name:data.get("name"),gender:data.get("gender"),age:data.get("age"),education:data.get("education"),occupation:data.get("occupation"),marital:data.get("marital"),birthCity:data.get("birthCity"),topics}, code); }
    catch (error) { document.getElementById("formError").textContent = error.message; submitButton.disabled = false; submitButton.textContent = "保存来访者信息"; return; }
    rememberProfile(intake, code);
    const existingNotice = intake.isExisting ? '<div class="notice consent-notice"><strong>已进入同名档案。</strong>如这不是你的个人档案，请返回并更换一个便于机构识别的姓名。</div>' : "";
    app.innerHTML = `<p class="eyebrow">${intake.isExisting ? "档案已读取" : "已建立档案"}</p><h1>${escapeHTML(intake.name)}的来访者档案</h1>${existingNotice}<dl class="report-facts"><div><dt>性别</dt><dd>${escapeHTML(intake.gender)}</dd></div><div><dt>年龄</dt><dd>${escapeHTML(intake.age)} 岁</dd></div><div><dt>最高学历</dt><dd>${escapeHTML(intake.education)}</dd></div><div><dt>职业</dt><dd>${escapeHTML(intake.occupation)}</dd></div><div><dt>婚姻状况</dt><dd>${escapeHTML(intake.marital)}</dd></div><div><dt>出生城市</dt><dd>${escapeHTML(intake.birthCity)}</dd></div><div class="wide"><dt>咨询问题</dt><dd>${escapeHTML(intake.topics.join("、"))}</dd></div></dl><div class="actions"><a class="primary-btn button-link" href="index.html#allScalesTitle">开始选择测评</a><a class="secondary-btn button-link" href="report.html">查看我的测评结果</a></div>`;
  });
  if (new URLSearchParams(location.search).has("required")) document.getElementById("formError").textContent = "请先完整填写来访者信息并输入有效机构代码。";
  function escapeHTML(value) { return String(value).replace(/[&<>"']/gu, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]); }
})();
