(function () {
  "use strict";
  const form = document.getElementById("resetForm");
  const message = document.getElementById("message");
  const sendButton = document.getElementById("sendCode");
  let cooldownTimer = null;

  function value(name) {
    return String(new FormData(form).get(name) || "").trim();
  }

  function setMessage(text) {
    message.textContent = text || "";
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
        if (value.length === inputs.length) leave();
      });
      input.addEventListener("keydown", event => {
        if (event.key === "Backspace" && !input.value && index > 0) inputs[index - 1].focus();
      });
      input.addEventListener("paste", event => {
        const digits = (event.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (!digits) return;
        event.preventDefault();
        const value = setDigits(digits);
        if (value.length === inputs.length) leave();
        else inputs[Math.max(0, value.length - 1)]?.focus();
      });
    });
  }

  setupDigitGrid("token", {next: form.elements.password});

  function checkPhone() {
    if (!/^1\d{10}$/.test(value("phone").replace(/[\s-]/g, ""))) {
      setMessage("请输入正确的手机号。");
      return false;
    }
    return true;
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
    if (!checkPhone()) return;
    sendButton.disabled = true;
    sendButton.textContent = "正在发送…";
    setMessage("正在发送验证码，请稍候…");
    try {
      await PsyHealthStorage.requestPasswordReset(value("phone"));
      setMessage("验证码已发送，请查看手机短信；收到后在下方输入并设置新密码。");
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
    if (!checkPhone()) return;
    if (value("token").length !== 6) {
      setMessage("请输入收到的短信验证码。");
      return;
    }
    if (value("password").length < 8) {
      setMessage("请设置至少 8 位新密码。");
      return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "正在修改…";
    try {
      await PsyHealthStorage.verifyRecovery(value("phone"), value("token"));
      await PsyHealthStorage.adminChangePassword(value("password"));
      setMessage("密码已更新，请重新登录。");
      setTimeout(() => location.href = "admin-login.html", 1000);
    } catch (error) {
      setMessage(error.message);
      submitButton.disabled = false;
      submitButton.textContent = "验证并更新密码";
    }
  };
})();
