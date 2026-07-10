(function () {
  "use strict";
  const form = document.getElementById("registerForm");
  const message = document.getElementById("message");
  const sendButton = document.getElementById("sendCode");
  let cooldownTimer = null;

  function value(name) {
    return String(new FormData(form).get(name) || "").trim();
  }

  function setMessage(text) {
    message.textContent = text || "";
  }

  function phoneReady() {
    if (!/^1\d{10}$/.test(value("phone").replace(/[\s-]/g, ""))) {
      return "请输入正确的手机号。";
    }
    return "";
  }

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
      setMessage("验证码已发送，请查看手机短信。");
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
    if (token.length < 4) {
      setMessage("请输入收到的短信验证码。");
      return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "正在注册…";
    try {
      await PsyHealthStorage.verifyPhone(value("phone"), token);
      setMessage("正在确认登录状态…");
      await PsyHealthStorage.adminSignIn(value("phone"), value("password"));
      setMessage("正在开通机构账号…");
      await PsyHealthStorage.ensureOrganization(value("name"));
      setMessage("注册成功，已自动获得 3 天免费使用时长。");
      setTimeout(() => location.href = "history.html", 1000);
    } catch (error) {
      setMessage(error.message);
      submitButton.disabled = false;
      submitButton.textContent = "验证并注册";
    }
  };
})();
