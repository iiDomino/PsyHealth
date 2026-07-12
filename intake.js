(function () {
  "use strict";
  const form = document.getElementById("intakeForm");
  const app = document.getElementById("intakeApp");
  const formError = document.getElementById("formError");
  const PROFILE_KEY = "psyhealth-client-profile-memory-v1";
  const nameInput = form.elements.name;
  const phoneLast4Input = form.elements.phoneLast4;
  const phoneDigitInputs = [...form.querySelectorAll(".phone-digit")];
  const codeInput = form.elements.referralCode;
  const birthYearSelect = form.elements.birthYear;
  let lookupToken = 0;

  populateBirthYears();

  function populateBirthYears() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1920; year -= 1) {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = `${year} 年`;
      birthYearSelect.appendChild(option);
    }
  }

  function readProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); }
    catch (_) { return {}; }
  }

  function profileKey(name, phoneLast4) {
    return `${String(name || "").trim().replace(/\s+/g, " ").toLowerCase()}|${String(phoneLast4 || "").replace(/\D/g, "").slice(-4)}`;
  }

  function applyProfile(profile, source = "本机") {
    if (!profile) return;
    ["gender","birthYear","education","occupation","marital","birthCity","referralCode"].forEach(name => {
      if (profile[name] !== undefined && form.elements[name]) form.elements[name].value = profile[name];
    });
    if (!form.elements.birthYear.value && profile.age) {
      const guessedYear = String(new Date().getFullYear() - Number(profile.age));
      if ([...birthYearSelect.options].some(option => option.value === guessedYear)) form.elements.birthYear.value = guessedYear;
    }
    form.querySelectorAll('input[name="topic"]').forEach(box => { box.checked = (profile.topics || []).includes(box.value); });
    formError.textContent = source === "云端" ? "" : "已自动填入本机保存的信息，可核对后继续，也可以手动修改。";
  }

  function rememberProfile(intake, code) {
    const profiles = readProfiles();
    profiles[profileKey(intake.name, intake.phoneLast4)] = {
      name: intake.name,
      phoneLast4: intake.phoneLast4,
      gender: intake.gender,
      birthYear: intake.birthYear,
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

  function normalizePhoneLast4(value) {
    return String(value || "").replace(/\D/g, "").slice(-4);
  }

  function setPhoneDigits(value) {
    const digits = normalizePhoneLast4(value).padEnd(4, " ");
    phoneDigitInputs.forEach((input, index) => { input.value = digits[index].trim(); });
    phoneLast4Input.value = normalizePhoneLast4(value);
  }

  function syncPhoneDigits() {
    const value = normalizePhoneLast4(phoneDigitInputs.map(input => input.value).join(""));
    phoneLast4Input.value = value;
    return value;
  }

  function showOrganization(name) {
    if (!name) return;
    let badge = document.getElementById("currentOrganizationBadge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "currentOrganizationBadge";
      badge.className = "institution-badge";
      app.insertBefore(badge, app.firstChild);
    }
    badge.textContent = `所属机构：${name}`;
  }

  async function lookupProfile() {
    const name = nameInput.value.trim();
    const phoneLast4 = normalizePhoneLast4(phoneLast4Input.value);
    const code = codeInput.value.trim();
    if (phoneLast4Input.value !== phoneLast4) phoneLast4Input.value = phoneLast4;
    if (!name || phoneLast4.length !== 4) return;

    const local = readProfiles()[profileKey(name, phoneLast4)];
    if (local) applyProfile(local, "本机");

    if (!window.PsyHealthStorage?.lookupClientProfile) return;
    const token = ++lookupToken;
    try {
      const result = await window.PsyHealthStorage.lookupClientProfile(name, phoneLast4, code);
      if (token !== lookupToken) return;
      if (code && result?.organizationName) showOrganization(result.organizationName);
      if (result?.found && result.intake) {
        applyProfile({...result.intake, referralCode: result.accessGroup, organizationName: result.organizationName}, "云端");
      } else if (result?.ambiguous) {
        formError.textContent = result.message || "找到多个匹配档案，请填写机构代码后再继续。";
      }
    } catch (error) {
      if (!local && !String(error.message || "").includes("数据库升级")) formError.textContent = error.message;
    }
  }

  ["change","blur"].forEach(eventName => {
    nameInput.addEventListener(eventName, lookupProfile);
    codeInput.addEventListener(eventName, lookupProfile);
  });
  phoneDigitInputs.forEach((input, index) => {
    input.addEventListener("input", event => {
      const digits = normalizePhoneLast4(event.target.value);
      event.target.value = digits.slice(-1);
      const phoneLast4 = syncPhoneDigits();
      if (event.target.value && index < phoneDigitInputs.length - 1) phoneDigitInputs[index + 1].focus();
      if (phoneLast4.length === 4) lookupProfile();
    });
    input.addEventListener("keydown", event => {
      if (event.key === "Backspace" && !input.value && index > 0) phoneDigitInputs[index - 1].focus();
    });
    input.addEventListener("paste", event => {
      const digits = normalizePhoneLast4(event.clipboardData?.getData("text") || "");
      if (!digits) return;
      event.preventDefault();
      setPhoneDigits(digits);
      phoneDigitInputs[Math.min(digits.length, 4) - 1]?.focus();
      if (digits.length >= 4) lookupProfile();
    });
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    const topics = data.getAll("topic");
    if (!topics.length) { formError.textContent = "请至少选择一个主要咨询议题。"; return; }
    const phoneLast4 = normalizePhoneLast4(data.get("phoneLast4"));
    if (phoneLast4.length !== 4) { formError.textContent = "请填写手机号后四位。"; return; }
    const code = String(data.get("referralCode") || "").trim();
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "正在保存…";
    let intake;
    try {
      intake = await window.PsyHealthStorage.begin({
        name: data.get("name"),
        phoneLast4,
        gender: data.get("gender"),
        birthYear: data.get("birthYear"),
        education: data.get("education"),
        occupation: data.get("occupation"),
        marital: data.get("marital"),
        birthCity: data.get("birthCity"),
        topics
      }, code);
    } catch (error) {
      formError.textContent = error.message || "资料暂未保存成功，请稍后重试。";
      submitButton.disabled = false;
      submitButton.textContent = "下一步";
      return;
    }
    rememberProfile(intake, code);
    const existingNotice = intake.isExisting ? '<div class="notice consent-notice"><strong>已进入原有档案。</strong>系统已按姓名和手机号后四位读取你的个人档案，可继续完成测评。</div>' : "";
    const org = intake.organizationName || "系统直属";
    app.innerHTML = `<div class="institution-badge">所属机构：${escapeHTML(org)}</div><p class="eyebrow">${intake.isExisting ? "档案已读取" : "已建立档案"}</p><h1>${escapeHTML(intake.name)}的来访者档案</h1>${existingNotice}<dl class="report-facts"><div><dt>所属机构</dt><dd>${escapeHTML(org)}</dd></div><div><dt>姓名</dt><dd>${escapeHTML(intake.name)}</dd></div><div><dt>手机号后四位</dt><dd>${escapeHTML(intake.phoneLast4)}</dd></div><div><dt>性别</dt><dd>${escapeHTML(intake.gender)}</dd></div><div><dt>出生年</dt><dd>${escapeHTML(intake.birthYear)} 年</dd></div><div><dt>最高学历</dt><dd>${escapeHTML(intake.education)}</dd></div><div><dt>职业</dt><dd>${escapeHTML(intake.occupation)}</dd></div><div><dt>婚姻状况</dt><dd>${escapeHTML(intake.marital)}</dd></div><div><dt>出生城市</dt><dd>${escapeHTML(intake.birthCity)}</dd></div><div class="wide"><dt>主要咨询议题</dt><dd>${escapeHTML(intake.topics.join("、"))}</dd></div></dl><div class="actions"><a class="primary-btn button-link" href="index.html#allScalesTitle">开始选择测评</a><a class="secondary-btn button-link" href="report.html">查看我的测评结果</a></div>`;
  });

  if (new URLSearchParams(location.search).has("required")) formError.textContent = "请先通过来访入口填写资料，并输入有效的机构代码。";
  function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/gu, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]); }
})();
