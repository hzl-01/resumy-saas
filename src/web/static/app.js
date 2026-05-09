(function () {
  function init() {
    setupNavigation();
    var token = getToken();
    if (token) {
      verifyAndShowDashboard(token);
    } else {
      showView("login");
    }
  }

  function setupNavigation() {
    $("#goto-register").addEventListener("click", function () {
      hideError();
      showView("register");
    });

    $("#goto-login").addEventListener("click", function () {
      hideError();
      showView("login");
    });

    $("#login-btn").addEventListener("click", handleLogin);
    $("#register-btn").addEventListener("click", handleRegister);
    $("#logout-btn").addEventListener("click", handleLogout);

    $("#login-password").addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleLogin();
    });
    $("#reg-password").addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleRegister();
    });
  }

  async function handleLogin() {
    hideError();
    var email = $("#login-email").value.trim();
    var password = $("#login-password").value;

    if (!email || !password) {
      showError("请填写邮箱和密码");
      return;
    }

    var btn = $("#login-btn");
    btn.disabled = true;

    var res = await apiFetch("/api/auth/login", { email: email, password: password });
    btn.disabled = false;

    if (res.ok && res.data && res.data.token) {
      setToken(res.data.token);
      showDashboard(res.data.user);
    } else if (res.data && res.data.message) {
      showError(res.data.message);
    } else {
      showError("登录失败，请重试");
    }
  }

  async function handleRegister() {
    hideError();
    var name = $("#reg-name").value.trim();
    var email = $("#reg-email").value.trim();
    var password = $("#reg-password").value;

    if (!name || !email || !password) {
      showError("请填写所有字段");
      return;
    }

    var btn = $("#register-btn");
    btn.disabled = true;

    var res = await apiFetch("/api/auth/register", { email: email, password: password, name: name });
    btn.disabled = false;

    if (res.ok && res.data && res.data.token) {
      setToken(res.data.token);
      showDashboard(res.data.user);
    } else if (res.data && res.data.message) {
      showError(res.data.message);
    } else {
      showError("注册失败，请重试");
    }
  }

  function handleLogout() {
    clearToken();
    showView("login");
    $("#login-email").value = "";
    $("#login-password").value = "";
  }

  async function verifyAndShowDashboard(token) {
    var res = await apiFetch("/api/auth/me");
    if (res.ok && res.data && res.data.user) {
      showDashboard(res.data.user);
    } else {
      clearToken();
      showView("login");
    }
  }

  function showDashboard(user) {
    $("#user-name").textContent = user.name || user.email;
    showView("dashboard");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
