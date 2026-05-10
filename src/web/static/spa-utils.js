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
  el.style.display = msg ? "block" : "none";
}

function hideError() {
  var el = $("#error-msg");
  if (el) el.style.display = "none";
}

function esc(s) {
  if (!s) return "";
  var d = document.createElement("div");
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

function formatDate(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

async function apiFetch(path, body, method) {
  var headers = { "Content-Type": "application/json" };
  var token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  var m = method || (body ? "POST" : "GET");
  var res = await fetch(path, {
    method: m,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  var data = null;
  try {
    data = await res.json();
  } catch (_) {}

  return { ok: res.ok, status: res.status, data: data };
}
