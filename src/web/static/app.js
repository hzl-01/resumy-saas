(function () {
  var currentResumeId = null;
  var resumeData = null;

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
    $("#goto-register").addEventListener("click", function () { hideError(); showView("register"); });
    $("#goto-login").addEventListener("click", function () { hideError(); showView("login"); });
    $("#login-btn").addEventListener("click", handleLogin);
    $("#register-btn").addEventListener("click", handleRegister);
    $("#logout-btn").addEventListener("click", handleLogout);
    $("#new-resume-btn").addEventListener("click", handleNewResume);
    $("#editor-back-btn").addEventListener("click", handleEditorBack);
    $("#editor-save-btn").addEventListener("click", handleSave);
    $("#editor-delete-btn").addEventListener("click", handleDelete);
    $("#pdf-generate-btn").addEventListener("click", handlePdfGenerate);

    $("#login-password").addEventListener("keydown", function (e) { if (e.key === "Enter") handleLogin(); });
    $("#reg-password").addEventListener("keydown", function (e) { if (e.key === "Enter") handleRegister(); });
  }

  async function handleLogin() {
    hideError();
    var email = $("#login-email").value.trim();
    var password = $("#login-password").value;
    if (!email || !password) { showError("请填写邮箱和密码"); return; }
    var btn = $("#login-btn"); btn.disabled = true;
    var res = await apiFetch("/api/auth/login", { email: email, password: password });
    btn.disabled = false;
    if (res.ok && res.data && res.data.token) {
      setToken(res.data.token); showDashboard(res.data.user);
    } else if (res.data && res.data.message) { showError(res.data.message); }
    else { showError("登录失败，请重试"); }
  }

  async function handleRegister() {
    hideError();
    var name = $("#reg-name").value.trim();
    var email = $("#reg-email").value.trim();
    var password = $("#reg-password").value;
    if (!name || !email || !password) { showError("请填写所有字段"); return; }
    var btn = $("#register-btn"); btn.disabled = true;
    var res = await apiFetch("/api/auth/register", { email: email, password: password, name: name });
    btn.disabled = false;
    if (res.ok && res.data && res.data.token) {
      setToken(res.data.token); showDashboard(res.data.user);
    } else if (res.data && res.data.message) { showError(res.data.message); }
    else { showError("注册失败，请重试"); }
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

  // ── Dashboard ──

  async function showDashboard(user) {
    $("#user-name").textContent = user.name || user.email;
    showView("dashboard");
    await loadResumeList();
  }

  async function loadResumeList() {
    var container = $("#resume-list");
    container.innerHTML = '<p style="color:#888;font-size:14px;text-align:center;padding:16px">加载中...</p>';
    var res = await apiFetch("/api/resumes");
    if (!res.ok) { container.innerHTML = '<p style="color:#c0392b;text-align:center">加载失败</p>'; return; }
    var list = res.data.resumes || [];
    if (list.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:14px;text-align:center;padding:16px">还没有简历，点击下方创建</p>';
      return;
    }
    container.innerHTML = "";
    list.forEach(function (item) {
      var el = document.createElement("div");
      el.className = "resume-item";
      el.innerHTML = '<div class="resume-item-name">' + esc(item.name) + '</div><div class="resume-item-date">' + formatDate(item.updated_at) + '</div>';
      el.addEventListener("click", function () { openEditor(item.id); });
      container.appendChild(el);
    });
  }

  // ── Editor ──

  async function handleNewResume() {
    var res = await apiFetch("/api/resumes", {
      name: "未命名简历",
      data: {
        basics: { name: "", title: "" },
        education: [], experience: [], projects: [], skills: [], customSections: []
      }
    });
    if (res.ok && res.data && res.data.resume) {
      openEditor(res.data.resume.id);
    } else {
      showError("创建失败");
    }
  }

  async function openEditor(id) {
    currentResumeId = id;
    showView("editor");
    $("#editor-title").textContent = "编辑简历";
    $("#editor-form").style.display = "none";
    $("#editor-loading").style.display = "block";

    var res = await apiFetch("/api/resumes/" + id);
    if (!res.ok || !res.data || !res.data.resume) {
      $("#editor-loading").textContent = "加载失败";
      return;
    }

    resumeData = res.data.resume.data;
    $("#editor-title").textContent = res.data.resume.name;
    $("#editor-loading").style.display = "none";
    $("#editor-form").style.display = "block";
    populateEditor(resumeData);
  }

  function populateEditor(data) {
    var b = data.basics || {};
    $("#ed-name").value = b.name || "";
    $("#ed-title").value = b.title || "";
    $("#ed-email").value = b.email || "";
    $("#ed-phone").value = b.phone || "";
    $("#ed-location").value = b.location || "";
    $("#ed-website").value = b.website || "";
    $("#ed-summary").value = b.summary || "";

    renderArraySection("ed-experience", data.experience || [], renderExperienceItem);
    renderArraySection("ed-education", data.education || [], renderEducationItem);
    renderArraySection("ed-projects", data.projects || [], renderProjectItem);
    renderArraySection("ed-skills", data.skills || [], renderSkillItem);
    renderArraySection("ed-custom", data.customSections || [], renderCustomItem);

    $$(".add-btn").forEach(function (btn) {
      btn.onclick = function () {
        var section = btn.getAttribute("data-section");
        addArrayItem(section);
      };
    });
  }

  function renderArraySection(containerId, items, renderFn) {
    var container = $("#" + containerId);
    container.innerHTML = "";
    items.forEach(function (item, i) {
      var div = document.createElement("div");
      div.className = "array-item";
      div.innerHTML = renderFn(item, i, containerId);
      container.appendChild(div);
    });
  }

  function renderExperienceItem(item, i, prefix) {
    return '<div class="array-item-header"><span>#' + (i + 1) + '</span><button class="btn-remove" data-prefix="' + prefix + '" data-index="' + i + '">✕</button></div>' +
      '<div class="array-item-body">' +
      '<div class="form-row"><div class="form-group"><label>公司</label><input class="f-company" value="' + esc(item.company || "") + '"></div>' +
      '<div class="form-group"><label>职位</label><input class="f-role" value="' + esc(item.role || "") + '"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>开始</label><input class="f-startDate" value="' + esc(item.startDate || "") + '"></div>' +
      '<div class="form-group"><label>结束</label><input class="f-endDate" value="' + esc(item.endDate || "") + '"></div></div>' +
      '<div class="form-group"><label>地点</label><input class="f-location" value="' + esc(item.location || "") + '"></div>' +
      '<div class="form-group"><label>概述</label><textarea class="f-summary" rows="2">' + esc(item.summary || "") + '</textarea></div>' +
      '<div class="form-group"><label>亮点（每行一条）</label><textarea class="f-highlights" rows="2">' + esc((item.highlights || []).join("\n")) + '</textarea></div>' +
      '<div class="form-group"><label>技术（逗号分隔）</label><input class="f-technologies" value="' + esc((item.technologies || []).join(", ")) + '"></div>' +
      '</div>';
  }

  function renderEducationItem(item, i, prefix) {
    return '<div class="array-item-header"><span>#' + (i + 1) + '</span><button class="btn-remove" data-prefix="' + prefix + '" data-index="' + i + '">✕</button></div>' +
      '<div class="array-item-body">' +
      '<div class="form-row"><div class="form-group"><label>学校</label><input class="f-institution" value="' + esc(item.institution || "") + '"></div>' +
      '<div class="form-group"><label>学位</label><input class="f-degree" value="' + esc(item.degree || "") + '"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>开始</label><input class="f-startDate" value="' + esc(item.startDate || "") + '"></div>' +
      '<div class="form-group"><label>结束</label><input class="f-endDate" value="' + esc(item.endDate || "") + '"></div></div>' +
      '<div class="form-group"><label>地点</label><input class="f-location" value="' + esc(item.location || "") + '"></div>' +
      '<div class="form-group"><label>亮点（每行一条）</label><textarea class="f-highlights" rows="2">' + esc((item.highlights || []).join("\n")) + '</textarea></div>' +
      '</div>';
  }

  function renderProjectItem(item, i, prefix) {
    return '<div class="array-item-header"><span>#' + (i + 1) + '</span><button class="btn-remove" data-prefix="' + prefix + '" data-index="' + i + '">✕</button></div>' +
      '<div class="array-item-body">' +
      '<div class="form-row"><div class="form-group"><label>项目名</label><input class="f-name" value="' + esc(item.name || "") + '"></div>' +
      '<div class="form-group"><label>角色</label><input class="f-role" value="' + esc(item.role || "") + '"></div></div>' +
      '<div class="form-group"><label>链接</label><input class="f-url" value="' + esc(item.url || "") + '"></div>' +
      '<div class="form-group"><label>概述</label><textarea class="f-summary" rows="2">' + esc(item.summary || "") + '</textarea></div>' +
      '<div class="form-group"><label>亮点（每行一条）</label><textarea class="f-highlights" rows="2">' + esc((item.highlights || []).join("\n")) + '</textarea></div>' +
      '<div class="form-group"><label>技术（逗号分隔）</label><input class="f-technologies" value="' + esc((item.technologies || []).join(", ")) + '"></div>' +
      '</div>';
  }

  function renderSkillItem(item, i, prefix) {
    return '<div class="array-item-header"><span>#' + (i + 1) + '</span><button class="btn-remove" data-prefix="' + prefix + '" data-index="' + i + '">✕</button></div>' +
      '<div class="array-item-body">' +
      '<div class="form-group"><label>分类名</label><input class="f-name" value="' + esc(item.name || "") + '"></div>' +
      '<div class="form-group"><label>技能（逗号分隔）</label><input class="f-items" value="' + esc((item.items || []).join(", ")) + '"></div>' +
      '</div>';
  }

  function renderCustomItem(item, i, prefix) {
    return '<div class="array-item-header"><span>#' + (i + 1) + '</span><button class="btn-remove" data-prefix="' + prefix + '" data-index="' + i + '">✕</button></div>' +
      '<div class="array-item-body">' +
      '<div class="form-group"><label>标题</label><input class="f-title" value="' + esc(item.title || "") + '"></div>' +
      '<div class="form-group"><label>内容（每行一条）</label><textarea class="f-items" rows="2">' + esc((item.items || []).join("\n")) + '</textarea></div>' +
      '</div>';
  }

  function addArrayItem(section) {
    var empty = { experience: { company: "", role: "" }, education: { institution: "", degree: "" }, projects: { name: "" }, skills: { name: "" }, custom: { title: "" } };
    var map = { experience: "ed-experience", education: "ed-education", projects: "ed-projects", skills: "ed-skills", custom: "ed-custom" };
    var renderMap = { experience: renderExperienceItem, education: renderEducationItem, projects: renderProjectItem, skills: renderSkillItem, custom: renderCustomItem };
    var arr = resumeData[section === "custom" ? "customSections" : section] || [];
    var item = JSON.parse(JSON.stringify(empty[section]));
    arr.push(item);
    var container = $("#" + map[section]);
    var div = document.createElement("div");
    div.className = "array-item";
    div.innerHTML = renderMap[section](item, arr.length - 1, map[section]);
    container.appendChild(div);
    attachRemoveHandlers();
  }

  function attachRemoveHandlers() {
    $$(".btn-remove").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var prefix = btn.getAttribute("data-prefix");
        var idx = parseInt(btn.getAttribute("data-index"), 10);
        var el = btn.closest(".array-item");
        el.parentNode.removeChild(el);
      };
    });
  }

  function collectEditorData() {
    var data = {
      basics: {
        name: $("#ed-name").value.trim(),
        title: $("#ed-title").value.trim(),
        email: $("#ed-email").value.trim() || undefined,
        phone: $("#ed-phone").value.trim() || undefined,
        location: $("#ed-location").value.trim() || undefined,
        website: $("#ed-website").value.trim() || undefined,
        summary: $("#ed-summary").value.trim() || undefined,
        links: []
      },
      education: collectArray("ed-education", collectEducationItem),
      experience: collectArray("ed-experience", collectExperienceItem),
      projects: collectArray("ed-projects", collectProjectItem),
      skills: collectArray("ed-skills", collectSkillItem),
      customSections: collectArray("ed-custom", collectCustomItem)
    };
    return data;
  }

  function collectArray(containerId, collectFn) {
    var container = $("#" + containerId);
    var items = [];
    container.querySelectorAll(".array-item").forEach(function (el) {
      items.push(collectFn(el));
    });
    return items;
  }

  function collectExperienceItem(el) {
    return { company: val(el, "company"), role: val(el, "role"), startDate: val(el, "startDate"), endDate: val(el, "endDate"), location: val(el, "location"), summary: val(el, "summary"), highlights: textareaLines(el, "highlights"), technologies: csvItems(el, "technologies") };
  }

  function collectEducationItem(el) {
    return { institution: val(el, "institution"), degree: val(el, "degree"), startDate: val(el, "startDate"), endDate: val(el, "endDate"), location: val(el, "location"), highlights: textareaLines(el, "highlights") };
  }

  function collectProjectItem(el) {
    return { name: val(el, "name"), role: val(el, "role"), url: val(el, "url"), summary: val(el, "summary"), highlights: textareaLines(el, "highlights"), technologies: csvItems(el, "technologies") };
  }

  function collectSkillItem(el) {
    return { name: val(el, "name"), items: csvItems(el, "items") };
  }

  function collectCustomItem(el) {
    return { title: val(el, "title"), items: textareaLines(el, "items") };
  }

  function val(el, field) {
    var input = el.querySelector(".f-" + field);
    if (!input) return "";
    var v = input.value.trim();
    return v || undefined;
  }

  function textareaLines(el, field) {
    var ta = el.querySelector(".f-" + field);
    if (!ta) return [];
    return ta.value.split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s; });
  }

  function csvItems(el, field) {
    var inp = el.querySelector(".f-" + field);
    if (!inp) return [];
    return inp.value.split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s; });
  }

  async function handleSave() {
    hideError();
    var data = collectEditorData();
    var btn = $("#editor-save-btn");
    btn.disabled = true;
    var res = await apiFetch("/api/resumes/" + currentResumeId, { data: data });
    btn.disabled = false;
    if (res.ok) {
      resumeData = data;
      showError(""); hideError();
      showToast("已保存");
    } else if (res.data && res.data.message) {
      showError(res.data.message);
    } else {
      showError("保存失败");
    }
  }

  async function handleDelete() {
    if (!confirm("确定删除此简历？")) return;
    hideError();
    var del = await apiFetch("/api/resumes/" + currentResumeId, null, "DELETE");
    if (del.ok || del.status === 204) {
      showView("dashboard");
      await loadResumeList();
      return;
    }
    showError("删除失败");
  }

  function handleEditorBack() {
    showView("dashboard");
    loadResumeList();
  }

  // ── PDF Generation ──

  async function handlePdfGenerate() {
    hideError();
    var btn = $("#pdf-generate-btn");
    var statusEl = $("#pdf-status");
    btn.disabled = true;
    statusEl.textContent = "正在保存并生成 PDF...";

    var data = collectEditorData();
    var saveRes = await apiFetch("/api/resumes/" + currentResumeId, { data: data });
    if (!saveRes.ok) {
      btn.disabled = false;
      statusEl.textContent = "";
      showError((saveRes.data && saveRes.data.message) ? saveRes.data.message : "保存失败");
      return;
    }
    resumeData = data;

    var templateId = $("#pdf-template").value;
    var pageSize = $("#pdf-pagesize").value;

    var genRes = await apiFetch("/api/resumes/" + currentResumeId + "/generate", {
      template_id: templateId,
      page_size: pageSize,
    });
    if (!genRes.ok || !genRes.data || !genRes.data.job_id) {
      btn.disabled = false;
      statusEl.textContent = "";
      showError((genRes.data && genRes.data.message) ? genRes.data.message : "生成失败");
      return;
    }

    statusEl.textContent = "正在生成 PDF...";
    pollPdfJob(genRes.data.job_id, statusEl, btn);
  }

  function pollPdfJob(jobId, statusEl, btn) {
    var maxAttempts = 60;
    var attempts = 0;
    var dots = [".", "..", "..."];

    var iv = setInterval(async function () {
      attempts++;
      var res = await apiFetch("/api/resumes/" + currentResumeId + "/generate/" + jobId + "/status");
      if (!res.ok) {
        clearInterval(iv);
        btn.disabled = false;
        statusEl.textContent = "";
        showError("查询状态失败");
        return;
      }

      var s = res.data.status;
      if (s === "ready") {
        clearInterval(iv);
        btn.disabled = false;
        statusEl.innerHTML = 'PDF 已生成！<a href="' + res.data.download_url + '" class="btn" style="display:inline-block;margin-left:8px;padding:6px 12px;font-size:13px;background:#4a90d9;color:#fff;text-decoration:none;border-radius:6px" download>下载 PDF</a>';
      } else if (s === "failed") {
        clearInterval(iv);
        btn.disabled = false;
        statusEl.textContent = "生成失败: " + (res.data.error || "未知错误");
      } else {
        statusEl.textContent = "正在生成 PDF" + dots[(attempts - 1) % 3];
        if (attempts >= maxAttempts) {
          clearInterval(iv);
          btn.disabled = false;
          statusEl.textContent = "生成超时，请重试";
        }
      }
    }, 2000);
  }

  function showToast(msg) {
    var t = document.createElement("div");
    t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;z-index:999";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { document.body.removeChild(t); }, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
