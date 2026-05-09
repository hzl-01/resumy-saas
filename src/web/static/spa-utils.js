function $(sel) {
  return document.querySelector(sel);
}

function $$(sel) {
  return document.querySelectorAll(sel);
}

function showView(name) {
  $$(".view").forEach(function (v) {
    v.style.display = v.id === "view-" + name ? "block" : "none";
  });
}

function getToken() {
  return localStorage.getItem("jwt_token");
}

function setToken(token) {
  localStorage.setItem("jwt_token", token);
}

function clearToken() {
  localStorage.removeItem("jwt_token");
}

function showError(msg) {
  var el = $("#error-msg");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

function hideError() {
  var el = $("#error-msg");
  if (el) el.style.display = "none";
}

async function apiFetch(path, body) {
  var headers = { "Content-Type": "application/json" };
  var token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  var res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  var data = null;
  try {
    data = await res.json();
  } catch (_) {}

  return { ok: res.ok, status: res.status, data: data };
}
