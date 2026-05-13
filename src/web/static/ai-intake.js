(function () {
  var state = {
    jobId: null,
    pollTimer: null,
    lastJob: null,
    openedResumeId: null,
    sourceResumeId: null,
    sourceResumeName: null,
  };

  function init() {
    bindDropzone();
    renderJobPanel();
    renderComposer();
  }

  function bindDropzone() {
    var dropzone = document.querySelector('#ai-dropzone');
    var fileInput = document.querySelector('#ai-file');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', function () {
      fileInput.click();
    });
    dropzone.addEventListener('dragover', function (event) {
      event.preventDefault();
      dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragleave', function () {
      dropzone.classList.remove('is-dragover');
    });
    dropzone.addEventListener('drop', function (event) {
      event.preventDefault();
      dropzone.classList.remove('is-dragover');
      if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        fileInput.files = event.dataTransfer.files;
        syncFileState();
        renderComposer();
      }
    });
    fileInput.addEventListener('change', function () {
      syncFileState();
      renderComposer();
    });
    syncFileState();
  }

  function onDashboardShown() {
    renderJobPanel();
    renderComposer();
    syncFileState();
  }

  function stop() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  async function handleSend() {
    hideError();
    stop();

    var input = document.querySelector('#ai-chat-input');
    var text = (input && input.value || '').trim();
    var fileInput = document.querySelector('#ai-file');
    var file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    var button = document.querySelector('#ai-send-btn');

    if (!text && !file && !state.sourceResumeId) {
      showError('请先上传旧简历、选择已有简历，或输入一条消息');
      return;
    }

    if (button) button.disabled = true;

    var res;
    if (state.jobId && state.lastJob && state.lastJob.status === 'needs_input') {
      res = await apiFetch('/api/ai/jobs/' + state.jobId + '/answers', {
        answers: [{ key: state.lastJob.questions[0].key, value: text }],
      });
      if (button) button.disabled = false;
      if (!res.ok) {
        showError((res.data && res.data.message) ? res.data.message : '提交补充信息失败');
        return;
      }
      if (input) input.value = '';
      setStatus('processing', { message: '已提交补充信息，继续生成中...' });
      startPolling();
      renderComposer();
      return;
    }

    if (file) {
      var formData = new FormData();
      formData.append('file', file);
      if (text) formData.append('jd_text', text);
      res = await uploadAiImport(formData);
    } else if (state.sourceResumeId) {
      res = await apiFetch('/api/ai/jobs/compose', {
        source_resume_id: state.sourceResumeId,
        jd_text: text || undefined,
      });
    } else {
      res = await apiFetch('/api/ai/jobs/import', { text: text });
    }

    if (button) button.disabled = false;
    if (!res.ok || !res.data || !res.data.job_id) {
      setStatus('failed', { message: (res.data && res.data.message) ? res.data.message : '创建 AI 任务失败' });
      return;
    }

    if (input) input.value = '';
    state.jobId = res.data.job_id;
    state.lastJob = { id: state.jobId, status: 'processing' };
    renderJobPanel();
    startPolling();
    renderComposer();
  }

  async function uploadAiImport(formData) {
    var token = getToken();
    var headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    var response = await fetch('/api/ai/jobs/import', { method: 'POST', headers: headers, body: formData });
    var data = null;
    try { data = await response.json(); } catch (_) {}
    return { ok: response.ok, status: response.status, data: data };
  }

  function startPolling() {
    stop();
    state.pollTimer = setInterval(async function () {
      if (!state.jobId) return;
      var res = await apiFetch('/api/ai/jobs/' + state.jobId);
      if (!res.ok || !res.data) {
        stop();
        setStatus('failed', { message: (res.data && res.data.message) ? res.data.message : '查询 AI 任务失败' });
        return;
      }

      state.lastJob = res.data;
      renderJobPanel();
      renderComposer();

      if (res.data.status === 'ready' && res.data.result && res.data.result.draft_resume_id && window.resumyApp && window.resumyApp.openEditor && state.openedResumeId !== res.data.result.draft_resume_id) {
        state.openedResumeId = res.data.result.draft_resume_id;
        window.resumyApp.openEditor(res.data.result.draft_resume_id);
        stop();
        return;
      }

      if (res.data.status === 'needs_input' || res.data.status === 'failed' || res.data.status === 'ready') {
        stop();
      }
    }, 1500);
  }

  function setStatus(status, options) {
    state.lastJob = {
      id: state.jobId,
      status: status,
      error: status === 'failed' ? { message: options.message } : undefined,
      questions: options.questions || undefined,
      messages: state.lastJob && state.lastJob.messages ? state.lastJob.messages : [],
    };
    renderJobPanel(options.message);
  }

  function renderJobPanel(messageOverride) {
    var panel = document.querySelector('#ai-job-panel');
    var thread = document.querySelector('#ai-chat-thread');
    if (!panel || !thread) return;

    if (!state.lastJob) {
      renderChatThread([]);
      panel.innerHTML = '<p class="ai-panel-empty">先上传旧简历，再把目标岗位 JD 发给我；只有缺少关键生成信息时，我才会继续问你。</p>';
      return;
    }

    renderChatThread(state.lastJob.messages || []);

    var status = state.lastJob.status;
    var title = { processing: '正在处理', needs_input: '需要补充信息', failed: '生成失败', ready: '已生成' }[status] || '任务状态';
    var html = '<div class="ai-job-status ai-job-' + esc(status) + '"><div class="ai-job-status-title">' + esc(title) + '</div>';
    if (status === 'processing') html += '<p>AI 正在整理你的材料，请稍等...</p>';
    if (status === 'failed') html += '<p>' + esc(messageOverride || (state.lastJob.error && state.lastJob.error.message) || '未知错误') + '</p>';
    if (status === 'ready') html += '<p>AI 已生成可编辑草稿，正在为你打开编辑器...</p>';
    html += '</div>';
    panel.innerHTML = html;
  }

  function renderChatThread(messages) {
    var thread = document.querySelector('#ai-chat-thread');
    if (!thread) return;
    if (!Array.isArray(messages) || messages.length === 0) {
      thread.innerHTML = '<div class="ai-chat-message ai-chat-assistant">把旧简历和目标岗位交给我，我会先生成一版草稿；只有缺少关键生成信息时，我才会继续问你。</div>';
      return;
    }
    thread.innerHTML = messages.map(function (message) {
      var roleClass = 'ai-chat-' + esc(message.role || 'assistant');
      return '<div class="ai-chat-message ' + roleClass + '">' + esc(renderMessagePayload(message.payload || {})) + '</div>';
    }).join('');
  }

  function renderMessagePayload(payload) {
    if (payload.questions && Array.isArray(payload.questions)) {
      return payload.questions.map(function (q) { return q.question; }).join('\n');
    }
    if (payload.background) {
      if (payload.uploaded_file) return '我上传了旧简历：' + payload.uploaded_file;
      if (payload.background.text) return '我提供的背景：' + payload.background.text;
      if (payload.background.source_resume_id) return '请基于我已有的简历继续定制。';
    }
    if (payload.uploaded_file) return '我上传了旧简历：' + payload.uploaded_file;
    if (payload.answers && Array.isArray(payload.answers)) {
      return payload.answers.map(function (a) { return a.value; }).join('\n');
    }
    if (payload.status === 'ready') return 'AI 已生成草稿，正在进入编辑器。';
    if (payload.status === 'needs_input') return 'AI 需要补充信息。';
    return JSON.stringify(payload);
  }

  function renderComposer() {
    var composer = document.querySelector('#ai-chat-composer');
    if (!composer) return;
    var title = '把旧简历和目标岗位发给我';
    var placeholder = '例如：上传旧简历后，把目标岗位 JD 发给我；如果没有旧简历，也可以直接发背景材料。';
    var meta = state.sourceResumeName ? ('当前基于已有简历：' + state.sourceResumeName) : '';
    var fileInput = document.querySelector('#ai-file');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      meta = (meta ? meta + ' | ' : '') + '已选择文件：' + fileInput.files[0].name;
    }
    if (state.lastJob && state.lastJob.status === 'needs_input' && Array.isArray(state.lastJob.questions) && state.lastJob.questions[0]) {
      title = '继续回答后再生成';
      placeholder = state.lastJob.questions[0].question;
    }
    composer.innerHTML = '<div class="ai-composer-box"><div class="ai-composer-title">' + esc(title) + '</div><textarea id="ai-chat-input" class="ai-chat-input" placeholder="' + esc(placeholder) + '"></textarea><div class="ai-composer-actions"><div class="ai-composer-meta">' + esc(meta || '上传旧简历后，直接把目标岗位 JD 发给我。') + '</div><button id="ai-send-btn" class="btn btn-primary">发送</button></div><div class="ai-quick-hint">我会先尽量自己理解旧简历，只有缺少关键生成信息时才继续问你。</div></div>';
    var sendBtn = document.querySelector('#ai-send-btn');
    if (sendBtn) sendBtn.addEventListener('click', handleSend);
  }

  function syncFileState() {
    var dropzone = document.querySelector('#ai-dropzone');
    var fileInput = document.querySelector('#ai-file');
    if (!dropzone || !fileInput) return;
    var file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    var title = dropzone.querySelector('.ai-dropzone-title');
    var sub = dropzone.querySelector('.ai-dropzone-sub');
    if (!title || !sub) return;
    if (file) {
      title.textContent = '已选择文件：' + file.name;
      sub.textContent = '现在在下方像聊天一样把目标岗位 JD 发给我。';
    } else {
      title.textContent = '拖拽旧简历到这里，或点击上传';
      sub.textContent = '支持 .txt / .docx / .pdf。上传后像聊天一样把目标岗位 JD 发给我。';
    }
  }

  function setSourceResume(id, name) {
    state.sourceResumeId = id;
    state.sourceResumeName = name;
    var panel = document.querySelector('#ai-source-resume');
    if (!panel) return;
    panel.style.display = 'block';
    panel.innerHTML = '当前将基于已有简历生成：<strong>' + esc(name) + '</strong> <button id="ai-clear-source" class="btn btn-inline-secondary" style="margin-left:8px">取消</button>';
    var clearBtn = document.querySelector('#ai-clear-source');
    if (clearBtn) clearBtn.onclick = clearSourceResume;
    renderComposer();
  }

  function clearSourceResume() {
    state.sourceResumeId = null;
    state.sourceResumeName = null;
    var panel = document.querySelector('#ai-source-resume');
    if (panel) {
      panel.style.display = 'none';
      panel.innerHTML = '';
    }
    renderComposer();
  }

  window.aiIntake = {
    init: init,
    onDashboardShown: onDashboardShown,
    stop: stop,
    startFromResume: setSourceResume,
  };
})();
