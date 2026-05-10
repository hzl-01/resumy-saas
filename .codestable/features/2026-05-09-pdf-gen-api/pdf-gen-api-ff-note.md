---
doc_type: feature-ff-note
feature: pdf-gen-api
date: 2026-05-10
requirement: web-auth
tags: [api, pdf, generation, playwright]
---

## 做了什么

为 `resumy serve` 添加了异步 PDF 生成 API。用户可通过 `POST /api/resumes/:id/generate` 触发生成，通过 `GET /api/resumes/:id/generate/:job_id/status` 查询状态，通过 `GET /api/resumes/:id/generate/:job_id/download` 下载 PDF。

## 改了哪些

- `src/web/pdf/handlers.ts` — 新增，3 个 handler（generate / status / download），异步任务队列，60s 超时，1h 自动清理
- `src/web/pdf/generate-pdf.mjs` — 新增，Node.js 子进程脚本，接收 HTML 文件 + 输出路径，用 Playwright 生成 PDF
- `src/web/server.ts` — 新增 `handlePdfRoute()`，路由顺序：auth → pdf → resume → static
- `src/web/resume/handlers.ts` — 修复：create/update 使用 `normalizeResumeDocument` 返回值（之前只校验不保存）

## 怎么验证的

启动 server → 创建简历 → 触发生成（202）→ 轮询至 ready → 下载（200, application/pdf, 13KB）；无 token 401；无效模板 400；预测试套件 18 例通过。

## 顺手发现

- Bun 不兼容 Playwright（chromium.launch 永久挂起）。使用 `Bun.spawn("node", [...])` 绕开，Node.js 子进程处理 Playwright 渲染
