---
doc_type: roadmap
slug: resumy-web-saas
status: active
created: 2026-05-09
last_reviewed: 2026-05-09
tags: [web, saas, resume, pdf]
related_requirements: []
related_architecture: []
---

# resumy Web SaaS

## 1. 背景

resumy 现有 CLI 工具可以通过结构化 flags + 内置模板生成简历 PDF。本 roadmap 的目标是把这份能力变成一个多用户 Web SaaS 服务：用户上传已有简历（docx/PDF）或在浏览器中在线编辑，选择模板，系统生成美观的 PDF 下载。

核心痛点解决的是：CLI 有使用门槛，非技术用户无法直接使用。Web 化后任何人都可以上传简历 → 美化 → 下载。

## 2. 范围与明确不做

### 本 roadmap 覆盖
- 用户注册/登录系统
- 在线简历表单编辑
- 上传 docx/PDF → 解析结构化 → 编辑 → 生成 PDF
- 模板选择、预览、PDF 下载
- 简历数据持久化存储（多份简历管理）

### 明确不做
- 付费/订阅系统（MVP 阶段不涉及）
- 多语言简历（一期仅支持单语言）
- 团队协作/共享简历
- AI 辅助写简历内容
- 简历投递/职位匹配

## 3. 模块拆分（概设）

所有模块均在现有 `resumy` 仓库内，通过 CLI 新增 `resumy serve` 命令启动 Web 服务。

```
resumy (现有仓库)
├── src/cli/commands/serve.ts     — resumy serve 命令入口
├── src/web/                       — Web 服务核心
│   ├── server.ts                  — HTTP 服务启动
│   ├── auth/                      — 用户认证模块
│   ├── api/                       — REST API 路由
│   ├── db/                        — 数据库层
│   └── static/                    — 前端静态资源
├── src/domain/                    — 现有 ResumeDocument 类型（复用）
├── src/templates/                 — 现有模板（复用）
├── src/render/                    — 现有 HTML 渲染（复用）
├── src/output/pdf.ts              — 现有 PDF 生成（复用）
├── src/schema/resume.ts           — 现有数据校验（复用）
└── src/io/files.ts                — 现有文件读写（复用）
```

### Web Server Module (`src/web/`)
- **职责**：HTTP 服务、用户认证、REST API 路由、数据库、前端静态资源托管
- **承载的子 feature**：backend-web-auth, resume-crud-api, pdf-gen-api
- **触碰的现有代码**：在 `src/cli/commands/serve.ts` 注册新命令；`src/domain/`、`src/templates/`、`src/render/`、`src/output/pdf.ts` 直接 import 使用

### Frontend SPA (`src/web/static/`)
- **职责**：浏览器端交互界面——登录注册、简历编辑、模板预览、PDF 下载、文件上传
- **承载的子 feature**：user-auth-frontend, resume-form-editor, template-preview-download, file-import-ui
- **触碰的现有代码**：新增目录，与 CLI 无关

### File Import Engine (`src/web/import/`)
- **职责**：解析上传的 docx/PDF 为 ResumeDocument 结构化数据
- **承载的子 feature**：file-import-api
- **触碰的现有代码**：新增模块，复用 `src/domain/resume.ts` 类型

### Core Engine（现有代码，不变）
- **职责**：ResumeDocument → HTML → PDF。`src/domain/`、`src/templates/`、`src/render/`、`src/output/pdf.ts` 直接由 Web Server import 使用
- **承载的子 feature**：pdf-gen-api（内部调用）
- **触碰的现有代码**：无改动，只增加新消费者

## 4. 模块间接口契约 / 共享协议（架构层详设）

### 4.1 共享数据结构：ResumeDocument

沿用现有 `src/domain/resume.ts` 的 `ResumeDocument` 类型。前后端、导入引擎、渲染引擎均以此为统一数据模型。

```typescript
interface ResumeDocument {
  basics: { name, title, email?, phone?, location?, website?, summary?, links[] }
  education: [{ institution, degree, startDate?, endDate?, location?, highlights[] }]
  experience: [{ company, role, startDate?, endDate?, location?, summary?, highlights[], technologies[] }]
  projects: [{ name, role?, url?, summary?, highlights[], technologies[] }]
  skills: [{ name, items[] }]
  customSections: [{ title, items[] }]
}
```

### 4.2 Auth API

**方向**：Frontend → Backend

**契约**：

```
POST /api/auth/register
Request:  { email: string, password: string, name: string }
Response: { user: { id, email, name }, token: string }
错误：    400 email_exists, 400 invalid_input

POST /api/auth/login
Request:  { email: string, password: string }
Response: { user: { id, email, name }, token: string }
错误：    401 invalid_credentials

GET /api/auth/me
Headers:  Authorization: Bearer <token>
Response: { user: { id, email, name } }
错误：    401 unauthorized
```

**约束**：
- Token 使用 JWT，过期时间 7 天
- 密码使用 bcrypt 哈希存储
- 所有需要认证的 API 统一通过 `Authorization: Bearer <token>` 头传递

### 4.3 Resume CRUD API

**方向**：Frontend → Backend

**契约**：

```
GET /api/resumes
Headers:  Authorization: Bearer <token>
Response: { resumes: [{ id, name, updated_at }] }
错误：    401 unauthorized

POST /api/resumes
Headers:  Authorization: Bearer <token>
Request:  { name: string, data: ResumeDocument }
Response: { resume: { id, name, data, updated_at } }
错误：    400 invalid_input, 401 unauthorized

GET /api/resumes/:id
Headers:  Authorization: Bearer <token>
Response: { resume: { id, name, data: ResumeDocument, updated_at } }
错误：    401 unauthorized, 404 not_found, 403 forbidden

PUT /api/resumes/:id
Headers:  Authorization: Bearer <token>
Request:  { name?: string, data?: ResumeDocument }
Response: { resume: { id, name, data, updated_at } }
错误：    401 unauthorized, 404 not_found, 403 forbidden, 400 invalid_input

DELETE /api/resumes/:id
Headers:  Authorization: Bearer <token>
Response: 204 No Content
错误：    401 unauthorized, 404 not_found, 403 forbidden
```

**约束**：
- 每个用户只能操作自己的简历（基于 token 中的 user_id）
- ResumeDocument 的校验复用现有 `src/schema/resume.ts` 的 `normalizeResumeDocument`

### 4.4 PDF Generation API

**方向**：Frontend → Backend（内部调用 Shared Engine）

**契约**：

```
POST /api/resumes/:id/generate
Headers:  Authorization: Bearer <token>
Request:  { template_id: string, density?: "standard"|"compact", page_size?: "letter"|"a4", accent_color?: string }
Response: 202 Accepted { job_id: string, status: "processing" }

GET /api/resumes/:id/generate/:job_id/status
Headers:  Authorization: Bearer <token>
Response: { status: "processing" | "ready" | "failed", download_url?: string }
错误：    401 unauthorized, 404 not_found, 403 forbidden

GET /api/resumes/:id/generate/:job_id/download
Headers:  Authorization: Bearer <token>
Response: 200 application/pdf (binary PDF stream)
错误：    401 unauthorized, 404 not_found, 403 forbidden, 400 not_ready
```

**约束**：
- 模板 ID 从现有模板列表获取（professional/minimal/classic）
- 内部调用路径：API Server → import resumy 核心库 → `getTemplate()` → `.render()` → `renderPdf()`
- PDF 生成结果临时存储，定期清理（建议 1 小时后过期）

### 4.5 File Import API

**方向**：Frontend → Backend（内部调用 File Import Engine）

**契约**：

```
POST /api/resumes/import
Headers:  Authorization: Bearer <token>
Body:     multipart/form-data, field "file" with the uploaded file
Response: { resume: { id, name, data: ResumeDocument, updated_at }, warnings?: string[] }
错误：    400 unsupported_format, 400 file_too_large, 400 parse_failed, 401 unauthorized
```

**约束**：
- 支持格式：application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document
- 文件大小限制：10MB
- 解析结果返回 ResumeDocument，允许不完全准确（带 warnings）
- 解析后自动创建为用户的简历，可直接进入编辑页面

### 4.6 存储模型

```
表: users
  id            UUID PRIMARY KEY
  email         TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  name          TEXT NOT NULL
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()

表: resumes
  id          UUID PRIMARY KEY
  user_id     UUID NOT NULL REFERENCES users(id)
  name        TEXT NOT NULL
  data        JSONB NOT NULL  (ResumeDocument)
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()

表: uploaded_files
  id              UUID PRIMARY KEY
  user_id         UUID NOT NULL REFERENCES users(id)
  filename        TEXT NOT NULL
  format          TEXT NOT NULL  ("docx" | "pdf")
  original_path   TEXT NOT NULL
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()

临时存储:
  generated_pdfs/ 目录，按 job_id 命名，定期清理
```

## 5. 子 feature 清单

1. **backend-web-auth** — `resumy serve` 骨架 + Web 服务器 + 用户认证系统
   - 所属模块：Web Server Module
   - 依赖：无
   - 状态：planned
   - 对应 feature：未启动
   - 备注：注册 `serve` 命令；HTTP 框架选型；SQLite + JWT + bcrypt；现有代码直接 import

2. **user-auth-frontend** — 前端登录/注册页面
   - 所属模块：Frontend SPA
   - 依赖：[backend-scaffold-auth]
   - 状态：done
   - 对应 feature：2026-05-09-user-auth-frontend
   - 备注：原生 HTML/CSS/JS SPA，零前端框架

3. **resume-crud-api** — 简历 CRUD API + 数据库存储
   - 所属模块：Web Server Module
   - 依赖：[backend-scaffold-auth]
   - 状态：done
   - 对应 feature：2026-05-09-resume-crud-api
   - 备注：数据校验复用现有 src/schema/resume.ts 的 normalizeResumeDocument

4. **pdf-gen-api** — PDF 生成 API（直接对接现有渲染引擎）
   - 所属模块：Web Server Module + Core Engine
   - 依赖：[resume-crud-api]
   - 状态：done
   - 对应 feature：2026-05-09-pdf-gen-api
   - 备注：Bun 不兼容 Playwright，通过 Node.js 子进程 + Bun.spawn 绕开

5. **resume-form-editor** — 在线简历编辑表单页面
   - 所属模块：Frontend SPA
   - 依赖：[user-auth-frontend, resume-crud-api]
   - 状态：planned
   - 对应 feature：未启动
   - 备注：表单字段对应 ResumeDocument 所有字段，支持多段 experience/education/project 的增删

6. **template-preview-download** — 模板选择、预览、PDF 下载页面
   - 所属模块：Frontend SPA
   - 依赖：[resume-form-editor, pdf-gen-api]
   - 状态：planned
   - 对应 feature：未启动

7. **file-import-api** — 文件上传 + 解析 API（docx + PDF）
   - 所属模块：File Import Engine + Web Server Module
   - 依赖：[resume-crud-api]
   - 状态：planned
   - 对应 feature：未启动
   - 备注：docx 用成熟 npm 库解析；PDF 解析需调研（现有库 vs AI）

8. **file-import-ui** — 文件上传导入的 UI 界面
   - 所属模块：Frontend SPA
   - 依赖：[file-import-api, user-auth-frontend]
   - 状态：planned
   - 对应 feature：未启动
   - 备注：拖拽上传 + 格式校验 + 解析结果预览

9. **deployment-infra** — 部署基础设施
   - 所属模块：跨模块
   - 依赖：[backend-web-auth, user-auth-frontend]（最小闭环之后）
   - 状态：planned
   - 对应 feature：未启动
   - 备注：需支持 Playwright chromium

**最小闭环**：第 1 条 `backend-scaffold-auth` → 第 2 条 `user-auth-frontend` → 第 3 条 `resume-crud-api` → 第 4 条 `pdf-gen-api` → 第 5 条 `resume-form-editor` → 第 6 条 `template-preview-download`。完成后用户可注册登录 → 创建编辑简历 → 选择模板 → 下载 PDF。

## 6. 排期思路

按**用户价值链路**拆：用户必须先能注册登录，然后才能创建简历，最后才能生成 PDF。前端和后端之间有明确依赖关系。

第 1-4 条完成后端基础能力，第 5-6 条补前端的用户侧操作界面。第 7-8 条（文件导入）是独立于在线编辑的第二条入口，可并行开发。第 9 条部署可在第 2 条完成后就开始准备。

最小闭环（1→6）覆盖了完整的"注册→编辑→下载"链路，建议优先打通。

## 7. 观察项

- 前端技术栈待定（React/Next.js/Vue 等），将影响 `user-auth-frontend` 的设计
- PDF 解析方案（docx 用现成库、PDF 需调研）将在 `file-import-api` 阶段决定
- 部署方案需考虑 Playwright 在服务端的运行环境（Chromium 依赖）
- 现有 `src/schema/resume.ts` 的 `parseResumeJson` 可用于 API 端数据校验
