(function () {
  var state = {
    jobId: null,
    pollTimer: null,
    lastJob: null,
    openedResumeId: null,
  };

  function init() {
    var startBtn = document.querySelector("#ai-start-btn");
    if (startBtn) startBtn.addEventListener("click", handleStart);

    var dropzone = document.querySelector("#ai-dropzone");
    var fileInput = document.querySelector("#ai-file");
    if (dropzone && fileInput) {
      dropzone.addEventListener("click", function () {
        fileInput.click();
      });
      dropzone.addEventListener("dragover", function (event) {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
      });
      dropzone.addEventListener("dragleave", function () {
        dropzone.classList.remove("is-dragover");
      });
      dropzone.addEventListener("drop", function (event) {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
        if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          fileInput.files = event.dataTransfer.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      fileInput.addEventListener("change", function () {
        syncFileState();
      });
      syncFileState();
    }
  }

  function onDashboardShown() {
    syncFileState();
    renderJobPanel();
  }

  function stop() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  async function handleStart() {
    hideError();
    stop();

    var background = (document.querySelector("#ai-background")?.value || "").trim();
    var jd = (document.querySelector("#ai-jd")?.value || "").trim();
    var targetRole = (document.querySelector("#ai-target-role")?.value || "").trim();
    var fileInput = document.querySelector("#ai-file");
    var file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    var btn = document.querySelector("#ai-start-btn");

    if (!background && !file) {
      showError("请先上传旧简历或粘贴背景材料");
      return;
    }

    if (btn) btn.disabled = true;
    setStatus("processing", { message: file ? "正在上传并解析简历..." : (jd ? "正在提交背景和 JD..." : "正在提交背景材料...") });

    var res;
    if (file) {
      var formData = new FormData();
      formData.append("file", file);
      if (jd) formData.append("jd_text", jd);
      if (targetRole) formData.append("target_role", targetRole);
      if (background) formData.append("notes", background);
      res = await uploadAiImport(formData);
    } else {
      var endpoint = jd ? "/api/ai/jobs/compose" : "/api/ai/jobs/import";
      var body = { text: background };
      if (jd) body.jd_text = jd;
      if (targetRole) body.target_role = targetRole;
      res = await apiFetch(endpoint, body);
    }
    if (btn) btn.disabled = false;

    if (!res.ok || !res.data || !res.data.job_id) {
      setStatus("failed", { message: (res.data && res.data.message) ? res.data.message : "创建 AI 任务失败" });
      return;
    }

    state.jobId = res.data.job_id;
    state.lastJob = { id: state.jobId, status: "processing" };
    renderJobPanel();
    startPolling();
  }

  async function uploadAiImport(formData) {
    var token = getToken();
    var headers = {};
    if (token) headers.Authorization = "Bearer " + token;

    var response = await fetch("/api/ai/jobs/import", {
      method: "POST",
      headers: headers,
      body: formData,
    });

    var data = null;
    try {
      data = await response.json();
    } catch (_) {}

    return { ok: response.ok, status: response.status, data: data };
  }

  function startPolling() {
    stop();
    state.pollTimer = setInterval(async function () {
      if (!state.jobId) return;
      var res = await apiFetch("/api/ai/jobs/" + state.jobId);
      if (!res.ok || !res.data) {
        stop();
        setStatus("failed", { message: (res.data && res.data.message) ? res.data.message : "查询 AI 任务失败" });
        return;
      }

      state.lastJob = res.data;
      renderJobPanel();

      if (res.data.status === "ready" && res.data.result && res.data.result.draft_resume_id && window.resumyApp && window.resumyApp.openEditor && state.openedResumeId !== res.data.result.draft_resume_id) {
        state.openedResumeId = res.data.result.draft_resume_id;
        window.resumyApp.openEditor(res.data.result.draft_resume_id);
        stop();
        return;
      }

      if (res.data.status === "needs_input" || res.data.status === "failed" || res.data.status === "ready") {
        stop();
      }
    }, 1500);
  }

  async function submitAnswers() {
    hideError();
    if (!state.jobId || !state.lastJob || !state.lastJob.questions) return;

    var answers = [];
    var hasMissing = false;

    state.lastJob.questions.forEach(function (question) {
      var input = document.querySelector('[data-ai-question-key="' + question.key + '"]');
      var value = (input && input.value || "").trim();
      if (question.required && !value) hasMissing = true;
      answers.push({ key: question.key, value: value });
    });

    if (hasMissing) {
      showError("请先填写所有必填问题");
      return;
    }

    var btn = document.querySelector("#ai-answer-btn");
    if (btn) btn.disabled = true;

    var res = await apiFetch("/api/ai/jobs/" + state.jobId + "/answers", { answers: answers });
    if (btn) btn.disabled = false;

    if (!res.ok) {
      showError((res.data && res.data.message) ? res.data.message : "提交补充信息失败");
      return;
    }

    setStatus("processing", { message: "已提交补充信息，继续生成中..." });
    startPolling();
  }

  function setStatus(status, options) {
    state.lastJob = {
      id: state.jobId,
      status: status,
      error: status === "failed" ? { message: options.message } : undefined,
      questions: options.questions || undefined,
    };
    renderJobPanel(options.message);
  }

  function renderJobPanel(messageOverride) {
    var panel = document.querySelector("#ai-job-panel");
    if (!panel) return;

    if (!state.lastJob) {
      panel.innerHTML = '<p class="ai-panel-empty">先上传旧简历并填写目标岗位 JD。只有没有文件时，再用文本框直接粘贴背景材料。</p>';
      return;
    }

    var status = state.lastJob.status;
    var title = {
      processing: "正在处理",
      needs_input: "需要补充信息",
      failed: "生成失败",
      ready: "已生成",
    }[status] || "任务状态";

    var html = '<div class="ai-job-status ai-job-' + esc(status) + '"><div class="ai-job-status-title">' + esc(title) + '</div>';

    if (status === "processing") {
      html += '<p>AI 正在整理你的材料，请稍等...</p>';
    }

    if (status === "failed") {
      var msg = messageOverride || (state.lastJob.error && state.lastJob.error.message) || "未知错误";
      html += '<p>' + esc(msg) + '</p>';
    }

    if (status === "ready") {
      html += '<p>AI 已生成可编辑草稿，正在为你打开编辑器...</p>';
    }

    if (status === "needs_input" && Array.isArray(state.lastJob.questions)) {
      html += '<div class="ai-question-list">';
      state.lastJob.questions.forEach(function (question) {
        html += '<div class="form-group"><label>' + esc(question.question) + (question.required ? ' *' : '') + '</label><textarea rows="4" data-ai-question-key="' + esc(question.key) + '"></textarea></div>';
      });
      html += '<button id="ai-answer-btn" class="btn btn-primary">继续生成</button></div>';
    }

    html += '</div>';
    panel.innerHTML = html;

    var answerBtn = document.querySelector("#ai-answer-btn");
    if (answerBtn) answerBtn.addEventListener("click", submitAnswers);
  }

  function syncFileState() {
    var dropzone = document.querySelector("#ai-dropzone");
    var fileInput = document.querySelector("#ai-file");
    if (!dropzone || !fileInput) return;

    var file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    var title = dropzone.querySelector(".ai-dropzone-title");
    var sub = dropzone.querySelector(".ai-dropzone-sub");
    if (!title || !sub) return;

    if (file) {
      title.textContent = "已选择文件：" + file.name;
      sub.textContent = "可以直接开始生成，或重新拖入/点击更换文件";
    } else {
      title.textContent = "拖拽旧简历到这里";
      sub.textContent = "支持 .txt / .docx / .pdf。优先上传文件，没有文件时再用文本框。";
    }
  }

  window.aiIntake = {
    init: init,
    onDashboardShown: onDashboardShown,
    stop: stop,
  };
})();
