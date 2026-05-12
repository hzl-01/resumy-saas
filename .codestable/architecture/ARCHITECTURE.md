# resumy 架构总入口

> 状态：骨架（待填充）
> 创建日期：2026-05-09

## 1. 项目简介

resumy 最初是基于 Bun + TypeScript 的简历 PDF 生成 CLI，通过结构化命令行参数 + 内置模板生成 PDF 简历。当前仓库已扩展出 Web 服务，并开始引入 AI sidecar 方向：Bun 主服务继续承载用户、简历、模板和 PDF 输出，Go sidecar 负责后续 AI workflow / agent 编排。

## 2. 核心概念 / 术语表

- **ResumeDocument** — 规范化的简历数据模型，见 `src/domain/resume.ts`
- **Auth API** — 用户认证接口：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`，基于 JWT Bearer Token，7 天过期
- **SQLite** — 嵌入式数据库，通过 `bun:sqlite` 驱动，运行时自动建表
- **JWT** — JSON Web Token，无状态认证方案
- **AI sidecar service** — 运行在 `services/ai/` 的独立 Go 进程，默认监听 `127.0.0.1:8081`，承载 Internal AI API 的占位实现
- **Internal AI API** — Bun 主服务调用 AI sidecar 的内部 HTTP 接口，目前占位为 `POST /internal/ai/intake` 与 `POST /internal/ai/continue`
- **Bun internal AI client** — `src/web/ai/client.ts`，统一封装 Bun 到 AI sidecar 的 base URL、timeout、响应解析与错误归一
- **AI job** — Bun 主服务里一条持久化的 AI 任务记录，负责承载状态、问题、结果和所有权；存储在 `ai_jobs` 表
- **Clarification question** — AI 或 Bun 状态机要求用户补充的一条结构化问题；当前第一条问题键是 `target_jd`
- **AI intake first** — 登录后 Web 第一屏先走 AI intake，editor 仅作为 secondary fallback，而不是默认入口

## 3. 子系统 / 模块索引

### CLI 命令层 (`src/cli/`)
- `src/cli/commands/generate.ts` — `resumy generate pdf` 生成简历 PDF
- `src/cli/commands/templates.ts` — `resumy templates` 列出内置模板
- `src/cli/commands/serve.ts` — `resumy serve` 启动 Web 服务

### 域模型层 (`src/domain/`)
- `resume.ts` — ResumeDocument 及所有子类型定义
- `sample-resume.ts` — 示例履历数据

### 模板层 (`src/templates/`)
- `professional` / `minimal` / `classic` 三套内置模板
- 共享渲染入口：`index.ts` → `getTemplate()` / `listTemplates()`

### 渲染层 (`src/render/`)
- `html.ts` — HTML 渲染辅助函数（header、section、list 等）
- `fonts.ts` — 字体嵌入（base64 @font-face CSS）
- `i18n.ts` — 多语言段落标签

### 输出层 (`src/output/`)
- `pdf.ts` — Playwright HTML→PDF 转换

### 数据校验层 (`src/schema/`)
- `resume.ts` — `parseResumeJson()` + `normalizeResumeDocument()` JSON 输入校验

### Web 服务模块 (`src/web/`)
- `server.ts` — HTTP 服务启动 + 路由分发（Bun.serve）
  - 路由顺序：`/api/auth/*` → `/api/ai/jobs/*` → `/api/resumes/import` → `/api/resumes/:id/generate*` → `/api/resumes*` → `/static/*` → 404
- `auth/` — 用户认证 handlers（register / login / me，JWT + bcrypt）
- `db/` — 数据库层（SQLite，bun:sqlite，自动建 users / resumes / ai_jobs / ai_job_messages 表）
- `ai/` — Bun 内部 AI client + AI job handlers（对外提供 `/api/ai/jobs/*`，对内调用 sidecar）
- `static/` — 前端 SPA 静态资源（index.html, app.js, spa-utils.js, style.css）
  - 当前前端主路径：dashboard 第一屏展示 AI intake panel；旧 `new-resume-btn` 已降级为 secondary manual entry

### AI Sidecar (`services/ai/`)
- `cmd/server/` — Go 启动入口，加载配置并启动 HTTP server
- `internal/config/` — sidecar 配置解析（`AI_SERVICE_HOST` / `AI_SERVICE_PORT`）
- `internal/httpapi/` — Internal AI API 路由、payload 类型、输入校验与 stub 响应
- 当前阶段只提供骨架能力：`GET /healthz`、`POST /internal/ai/intake`、`POST /internal/ai/continue`

### IO 层 (`src/io/`)
- `files.ts` — 文件读写工具函数

## 4. 关键架构决定

- AI 能力不直接塞进 Bun 主进程；保持 `Bun Product Surface` 与 `AI sidecar service` 两个 runtime，Bun 通过 internal HTTP client 调 sidecar
- schema guard 和最终入库仍保留在 Bun 侧；AI sidecar 只负责 workflow / agent 编排，不直接写主数据库
- AI 主入口按“背景优先、JD 第二、再继续生成”的状态机建模；无 JD 时 Bun 主服务直接进入 `needs_input`，而不是立刻把请求透传给 sidecar
- Web 产品默认入口从“新建空白简历”切为“AI intake first”；editor 只作为 fallback 路径保留

## 5. 已知约束 / 硬边界

- AI sidecar 默认仅监听回环地址，不作为公网入口
- `go.work` 负责把仓库根运行约定扩展为支持 `go run ./services/ai/cmd/server`
