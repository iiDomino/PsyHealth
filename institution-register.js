(function () {
  "use strict";
  const form = document.getElementById("registerForm");
  const message = document.getElementById("message");
  const trialCodeState = document.getElementById("trialCodeState");
  const sendButton = document.getElementById("sendCode");
  let cooldownTimer = null;
  let trialCodeStatus = {code:"", valid:false, empty:true};

  function value(name) {
    return String(new FormData(form).get(name) || "").trim();
  }

  function setMessage(text) {
    message.textContent = text || "";
  }
  function setTrialMessage(text) {
    if (trialCodeState) trialCodeState.textContent = text || "";
  }

  function setupDigitGrid(targetName, options = {}) {
    const hidden = form.elements[targetName];
    const grid = form.querySelector(`[data-digit-target="${targetName}"]`);
    if (!hidden || !grid) return;
    const inputs = [...grid.querySelectorAll(".digit-input")];
    const sync = () => {
      const value = inputs.map(input => input.value).join("").replace(/\D/g, "").slice(0, inputs.length);
      hidden.value = value;
      return value;
    };
    const setDigits = value => {
      const digits = String(value || "").replace(/\D/g, "").slice(0, inputs.length);
      inputs.forEach((input, index) => { input.value = digits[index] || ""; });
      hidden.value = digits;
      return digits;
    };
    const leave = () => {
      inputs.forEach(input => input.blur());
      if (options.next) setTimeout(() => options.next.scrollIntoView({behavior:"smooth", block:"center"}), 80);
    };
    inputs.forEach((input, index) => {
      input.addEventListener("input", event => {
        const digits = event.target.value.replace(/\D/g, "");
        event.target.value = digits.slice(-1);
        const value = sync();
        if (event.target.value && index < inputs.length - 1) inputs[index + 1].focus();
        if (value.length === inputs.length) {
          leave();
          options.onComplete?.(value);
        } else {
          options.onChange?.(value);
        }
      });
      input.addEventListener("keydown", event => {
        if (event.key === "Backspace" && !input.value && index > 0) inputs[index - 1].focus();
      });
      input.addEventListener("paste", event => {
        const digits = (event.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (!digits) return;
        event.preventDefault();
        const value = setDigits(digits);
        if (value.length === inputs.length) {
          leave();
          options.onComplete?.(value);
        } else {
          inputs[Math.max(0, value.length - 1)]?.focus();
          options.onChange?.(value);
        }
      });
    });
  }

  function phoneReady() {
    if (!/^1\d{10}$/.test(value("phone").replace(/[\s-]/g, ""))) {
      return "请输入正确的手机号。";
    }
    return "";
  }

  async function checkTrialCode() {
    const code = value("trialCode").replace(/\D/g, "");
    trialCodeStatus = {code, valid:false, empty:!code};
    if (!code) {
      setTrialMessage("未填写邀请码，将正常注册；注册后可由系统管理员授权使用期限。");
      return trialCodeStatus;
    }
    if (code.length < 4) {
      setTrialMessage("请输入 4 位数字邀请码，或留空。");
      return trialCodeStatus;
    }
    const phoneProblem = phoneReady();
    if (phoneProblem) {
      setTrialMessage("填写手机号后可检查邀请码状态。");
      return trialCodeStatus;
    }
    setTrialMessage("正在检查邀请码…");
    try {
      const result = await PsyHealthStorage.trialInviteStatus(code, value("phone"));
      if (result.status === "valid") {
        trialCodeStatus = {code, valid:true, empty:false};
        setTrialMessage("邀请码可用，注册成功后将获得 3 天试用时长。");
      } else if (result.status === "already_used") {
        setTrialMessage("该手机号已经使用过试用邀请码，本次注册不会重复获得试用时长。");
      } else {
        setTrialMessage("邀请码无效或已停用；可删除后继续普通注册。");
      }
    } catch (error) {
      setTrialMessage(error.message || "邀请码暂时无法检查，请稍后重试。");
    }
    return trialCodeStatus;
  }

  setupDigitGrid("token", {next: form.querySelector('button[type="submit"]')});
  setupDigitGrid("trialCode", {
    next: message,
    onChange: value => {
      trialCodeStatus = {code:value, valid:false, empty:!value};
      setTrialMessage(value ? "请输入完整 4 位邀请码，或留空。" : "未填写邀请码，将正常注册；注册后可由系统管理员授权使用期限。");
    },
    onComplete: () => checkTrialCode()
  });
  form.elements.phone.addEventListener("input", () => {
    if (value("trialCode").length === 4) checkTrialCode();
  });

  function readyForCode() {
    if (!value("name")) return "请先填写机构名称。";
    if (value("password").length < 8) return "请先设置至少 8 位密码，再发送验证码。";
    return phoneReady();
  }

  function startCooldown(seconds = 60) {
    clearInterval(cooldownTimer);
    let left = seconds;
    sendButton.disabled = true;
    sendButton.textContent = `${left}秒后重发`;
    cooldownTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(cooldownTimer);
        sendButton.disabled = false;
        sendButton.textContent = "重新发送";
      } else {
        sendButton.textContent = `${left}秒后重发`;
      }
    }, 1000);
  }

  sendButton.onclick = async () => {
    const problem = readyForCode();
    if (problem) {
      setMessage(problem);
      return;
    }
    sendButton.disabled = true;
    sendButton.textContent = "正在发送…";
    setMessage("正在发送验证码，请稍候…");
    try {
      await PsyHealthStorage.signUp(value("phone"), value("password"), value("name"));
      setMessage("");
      startCooldown();
    } catch (error) {
      if (error.message.includes("验证码暂时发送失败")) {
        setMessage(error.message);
        startCooldown();
        return;
      }
      setMessage(error.message);
      sendButton.disabled = false;
      sendButton.textContent = "发送验证码";
    }
  };

  form.onsubmit = async event => {
    event.preventDefault();
    const problem = readyForCode();
    if (problem) {
      setMessage(problem);
      return;
    }
    const token = value("token");
    if (token.length !== 6) {
      setMessage("请输入收到的短信验证码。");
      return;
    }
    const trialCode = value("trialCode").replace(/\D/g, "");
    if (trialCode && trialCode.length !== 4) {
      setMessage("试用邀请码应为 4 位数字；也可以留空后继续注册。");
      return;
    }
    if (trialCode) {
      const status = await checkTrialCode();
      if (!status.valid) {
        setMessage("请填写有效邀请码，或清空邀请码后继续普通注册。");
        return;
      }
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "正在注册…";
    try {
      await PsyHealthStorage.verifyPhone(value("phone"), token);
      setMessage("验证码已通过，正在设置登录密码…");
      try {
        await PsyHealthStorage.adminChangePassword(value("password"));
      } catch (error) {
        if (error.message !== "新密码与当前密码相同。") {
          throw error;
        }
      }
      setMessage("正在开通机构账号…");
      const org = await PsyHealthStorage.ensureOrganization(value("name"), trialCode);
      setMessage(org.trialGranted ? "注册成功，已获得 3 天试用时长，即将进入机构管理中心。" : "注册成功，当前未获得试用时长；可联系系统管理员授权使用期限。");
      setTimeout(() => location.href = "history.html", 1000);
    } catch (error) {
      setMessage(error.message);
      submitButton.disabled = false;
      submitButton.textContent = "验证并完成注册";
    }
  };
})();
