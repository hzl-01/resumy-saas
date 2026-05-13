---
doc_type: roadmap
slug: ai-resume-agent
status: active
created: 2026-05-12
last_reviewed: 2026-05-12
tags: [ai, resume, agent, eino]
related_requirements: [web-auth]
related_architecture: []
---

# AI Resume Agent

## 1. 背景

resumy 最初是一个 Bun + TypeScript 的 CLI 简历生成工具：用户通过结构化 flags 构造 `ResumeDocument`，选择内置模板，再生成 PDF。后续仓库新增了 Web 服务，但现有主链路仍然是“用户自己提供结构化字段，再导出 PDF”。这更像一个简历编辑器，不是 AI 驱动的简历生产工具。

本 roadmap 的目标是把 resumy 升级为一个 AI 驱动的简历 agent 产品：用户上传旧简历、输入背景材料、提供岗位 JD 或通过多轮对话补充材料，系统通过 Eino / 模型驱动的 agent 直接生成结构化 `ResumeDocument` 草稿，再复用现有模板与 PDF 引擎输出结果。产品主链路改成 `上传旧简历/背景材料 -> 提供 JD -> AI 直出草稿 -> editor fallback -> PDF 导出`；现有 CLI / Web / 渲染内核继续作为底座，这份 roadmap 负责 AI 化演进。

## 2. 范围与明确不做

### 本 roadmap 覆盖
- 原始材料输入：docx / pdf / free text / 对话补充
- AI intake 成为 Web 产品主入口，旧的“新建空白简历再手填”入口降级为 fallback 或移除
- AI 直出草稿：原始材料 + JD -> `ResumeDocument`
- AI 澄清回路：缺失信息追问、确认后继续生成
- AI 定制化：结合 JD 生成定制版简历内容
- Bun 主服务与 AI service 的接口契约
- AI 结果落库、进入现有编辑器、继续现有 PDF 生成链路

### 明确不做
- 替换现有模板与 PDF 引擎（继续复用现有核心）
- 重写现有登录 / 用户 / 简历 CRUD / PDF job 系统
- 一期内做多 Agent 协作可视化编排平台
- 一期内做职位投递、职位抓取、招聘平台自动投递
- 一期内做付费系统、团队协作、企业版权限体系
- 一期内把整个仓库迁移到 Go；仅允许新增 AI sidecar service
- 不再以“空白简历 -> 手工补全”作为产品默认起点

## 3. 模块拆分（概设）

```text
ai-resume-agent
├── Bun Product Surface: 用户、简历、模板、PDF、编辑器、AI 任务入口
├── AI Orchestration Service: 基于 Eino 的 agent/workflow 编排
├── Document Intake Layer: 原始文件提取与标准化文本化
├── Resume Structuring Pipeline: 文本/对话 -> ResumeDocument
├── Clarification Loop: 缺失信息检查、追问、确认
└── Tailoring Pipeline: 结合 JD 生成定制版 ResumeDocument
```

### Bun Product Surface
- **职责**：继续承载用户登录、简历存储、模板选择、PDF 生成、前端交互；新增 AI 主入口与 AI 结果接收入口；保留 editor 作为结果落地后的 fallback
- **承载的子 feature**：ai-job-api, ai-chat-intake-ui, ai-result-apply
- **触碰的现有代码 / 模块**：`src/web/`, `src/schema/resume.ts`, `src/domain/resume.ts`, `src/templates/`, `src/output/pdf.ts`

### AI Orchestration Service
- **职责**：承载 Eino workflow / agent 编排，统一管理模型调用、步骤执行、结构化输出和失败恢复
- **承载的子 feature**：eino-service-scaffold, ai-resume-structuring, ai-jd-tailor
- **触碰的现有代码 / 模块**：新服务，建议放 `services/ai/`；不直接修改现有 Bun 内核

### Document Intake Layer
- **职责**：接收 pdf/docx/raw text，仅做文本提取与最小清洗，随后直接交给 AI agent
- **承载的子 feature**：ai-document-intake
- **触碰的现有代码 / 模块**：Bun 上传入口 + AI service intake module；替代当前纯启发式 import 方向

### Resume Structuring Pipeline
- **职责**：由 Eino / 模型驱动，把原始文本、对话材料、用户补充信息直接生成 `ResumeDocument` 草稿
- **承载的子 feature**：ai-resume-structuring, ai-schema-guard
- **触碰的现有代码 / 模块**：复用 `ResumeDocument` 与 `normalizeResumeDocument`

### Clarification Loop
- **职责**：检查 AI 结果缺口，生成追问问题，让用户补信息后继续运行
- **承载的子 feature**：ai-clarification-loop
- **触碰的现有代码 / 模块**：新增前端 AI 对话界面 + Bun task state + AI service question generator

### Tailoring Pipeline
- **职责**：读取 JD，对基础简历进行定制化生成，输出新的 `ResumeDocument` 版本
- **承载的子 feature**：ai-jd-tailor
- **触碰的现有代码 / 模块**：AI service + 现有 `resumes` 存储模型（新增版本管理或派生简历策略）

## 4. 模块间接口契约 / 共享协议（架构层详设）

### 4.1 共享数据结构：ResumeDocument

**方向**：Bun Product Surface <-> AI Orchestration Service

**形式**：JSON over HTTP

**契约**：

```typescript
interface ResumeDocument {
  basics: {
    name: string
    title: string
    email?: string
    phone?: string
    location?: string
    website?: string
    summary?: string
    links: { label: string; url: string }[]
  }
  education: {
    institution: string
    degree: string
    startDate?: string
    endDate?: string
    location?: string
    highlights: string[]
  }[]
  experience: {
    company: string
    role: string
    startDate?: string
    endDate?: string
    location?: string
    summary?: string
    highlights: string[]
    technologies: string[]
  }[]
  projects: {
    name: string
    role?: string
    url?: string
    summary?: string
    highlights: string[]
    technologies: string[]
  }[]
  skills: {
    name: string
    items: string[]
  }[]
  customSections: {
    title: string
    items: string[]
  }[]
}
```

**约束**：
- AI service 输出必须是 JSON object，不允许直接输出 markdown 简历正文给 Bun 入库
- Bun 侧统一调用 `normalizeResumeDocument()` 做最终收口
- 校验失败不能直接入库，必须返回结构化错误和 warnings；但不把重规则解析器重新塞进 Bun 主服务

### 4.2 AI Job API

**方向**：Frontend / Bun -> Bun Product Surface

**形式**：HTTP API

**契约**：

```text
POST /api/ai/jobs/import
Headers: Authorization: Bearer <token>
Body: multipart/form-data
Fields:
  - file?: uploaded pdf/docx
  - text?: string
  - notes?: string
Response: 202 { job_id: string, status: "processing" }
错误：400 invalid_input, 401 unauthorized

POST /api/ai/jobs/compose
Headers: Authorization: Bearer <token>
Request: {
  source_resume_id?: string,
  raw_material?: string,
  jd_text?: string,
  target_role?: string
}
Response: 202 { job_id: string, status: "processing" }
错误：400 invalid_input, 401 unauthorized

GET /api/ai/jobs/:job_id
Headers: Authorization: Bearer <token>
Response: {
  id: string,
  status: "processing" | "needs_input" | "ready" | "failed",
  result?: {
    draft_resume_id?: string,
    resume_document?: ResumeDocument,
    warnings?: string[]
  },
  questions?: {
    key: string,
    question: string,
    required: boolean
  }[],
  error?: { code: string, message: string }
}
错误：401 unauthorized, 404 not_found, 403 forbidden

POST /api/ai/jobs/:job_id/answers
Headers: Authorization: Bearer <token>
Request: {
  answers: { key: string, value: string }[]
}
Response: 202 { job_id: string, status: "processing" }
错误：400 invalid_input, 401 unauthorized, 404 not_found, 409 invalid_state
```

**约束**：
- Bun 负责 job ownership、权限、持久化状态
- `needs_input` 是一等状态，不允许前端靠字符串猜
- `resume_document` 只有在通过 schema 校验后才能出现在 `ready` 结果里

### 4.3 Bun -> AI Service Internal API

**方向**：Bun Product Surface -> AI Orchestration Service

**形式**：Internal HTTP

**契约**：

```text
POST /internal/ai/intake
Request: {
  job_id: string,
  source: {
    type: "pdf" | "docx" | "text" | "resume_id",
    file_path?: string,
    text?: string,
    resume_document?: ResumeDocument
  },
  mode: "import" | "compose" | "tailor",
  context: {
    jd_text?: string,
    target_role?: string,
    user_notes?: string
  }
}
Response: {
  status: "ready" | "needs_input" | "failed",
  resume_document?: ResumeDocument,
  warnings?: string[],
  questions?: { key: string, question: string, required: boolean }[],
  error?: { code: string, message: string }
}

POST /internal/ai/continue
Request: {
  job_id: string,
  answers: { key: string, value: string }[]
}
Response: {
  status: "ready" | "needs_input" | "failed",
  resume_document?: ResumeDocument,
  warnings?: string[],
  questions?: { key: string, question: string, required: boolean }[],
  error?: { code: string, message: string }
}
```

**约束**：
- AI service 不直接连 Bun 主数据库
- AI service 只处理“理解、生成、追问”，不处理用户鉴权
- Bun 与 AI service 之间必须有 request timeout、retry policy、error code 映射

### 4.4 AI Output Guard

**方向**：AI Orchestration Service -> Bun Product Surface

**形式**：JSON result + Bun schema validation

**契约**：

```text
Validation step:
  normalizeResumeDocument(ai_output)

On success:
  -> create/update draft resume
  -> mark ai job as ready

On failure:
  -> mark ai job as failed OR needs_input
  -> store validation issues as structured warnings
```

**约束**：
- schema guard 是硬收口，不允许旁路
- 对于字段缺失但可追问的情况，优先走 `needs_input`
- 对于结构完全错误或模型失控输出，走 `failed`

### 4.5 AI Job Storage Model

**方向**：Bun Product Surface 内部共享状态

**形式**：SQLite tables

**契约**：

```text
table: ai_jobs
  id                TEXT PRIMARY KEY
  user_id           TEXT NOT NULL
  kind              TEXT NOT NULL        -- import | compose | tailor
  status            TEXT NOT NULL        -- processing | needs_input | ready | failed
  source_type       TEXT NOT NULL        -- pdf | docx | text | resume_id
  source_ref        TEXT NULL
  result_resume_id  TEXT NULL
  warnings_json     TEXT NULL
  questions_json    TEXT NULL
  error_json        TEXT NULL
  created_at        TEXT NOT NULL
  updated_at        TEXT NOT NULL

table: ai_job_messages
  id                TEXT PRIMARY KEY
  job_id            TEXT NOT NULL
  role              TEXT NOT NULL        -- system | assistant | user
  payload_json      TEXT NOT NULL
  created_at        TEXT NOT NULL
```

**约束**：
- Bun 是 job state 的唯一真相源
- AI service 的会话上下文若需要持久化，优先通过 Bun 回存，不允许只存在内存
- `result_resume_id` 指向 `resumes` 表中生成的草稿简历

## 5. 子 feature 清单

1. **eino-service-scaffold** — 新增 Go + Eino AI sidecar service，打通 Bun -> AI service 内部调用
   - 所属模块：AI Orchestration Service
   - 依赖：无
   - 状态：done
   - 对应 feature：2026-05-12-eino-service-scaffold
   - 备注：定义运行方式、配置、healthcheck、internal API 基础骨架

2. **ai-job-api** — 在 Bun 主服务新增 AI job API、状态机和存储表
   - 所属模块：Bun Product Surface
   - 依赖：[eino-service-scaffold]
   - 状态：done
   - 对应 feature：2026-05-13-ai-job-api
   - 备注：AI job ownership、状态持久化、权限控制

3. **ai-document-intake** — 支持 pdf/docx/text 输入并交给 AI service 做统一 intake
   - 所属模块：Document Intake Layer
   - 依赖：[eino-service-scaffold, ai-job-api]
   - 状态：planned
   - 对应 feature：未启动
   - 备注：替代纯启发式 import 方案

4. **ai-resume-structuring** — 实现 AI 将原始材料结构化为 ResumeDocument
   - 所属模块：Resume Structuring Pipeline
   - 依赖：[ai-document-intake]
   - 状态：planned
   - 对应 feature：未启动
   - 备注：核心产物是可通过 schema guard 的结构化 JSON

5. **ai-schema-guard** — 在 Bun 侧落地 AI 输出校验、warnings 与错误收口
   - 所属模块：Resume Structuring Pipeline
   - 依赖：[ai-resume-structuring]
   - 状态：planned
   - 对应 feature：未启动
   - 备注：必须复用 `normalizeResumeDocument`

6. **ai-chat-intake-ui** — 前端新增 AI 主入口页面，用上传/对话取代旧的空白新建入口
   - 所属模块：Bun Product Surface, Clarification Loop
   - 依赖：[ai-job-api]
   - 状态：done
   - 对应 feature：2026-05-13-ai-chat-intake-ui
   - 备注：支持上传文件、贴文本、查看 job 状态；隐藏或删除 dashboard 里的旧“新建简历”主按钮

7. **ai-clarification-loop** — AI 缺信息时向用户追问，用户回答后继续生成
   - 所属模块：Clarification Loop
   - 依赖：[ai-chat-intake-ui, ai-resume-structuring]
   - 状态：planned
   - 对应 feature：未启动
   - 备注：追问必须结构化，不靠自由字符串状态判断

8. **ai-result-apply** — AI 生成结果自动落成 draft resume，并跳转到现有编辑器
   - 所属模块：Bun Product Surface
   - 依赖：[ai-schema-guard, ai-chat-intake-ui]
   - 状态：planned
   - 对应 feature：未启动
   - 备注：保持“AI 生成 -> editor fallback -> PDF 导出”闭环；editor 不再作为默认入口

9. **ai-jd-tailor** — 输入 JD，对已有简历生成定制版 ResumeDocument
   - 所属模块：Tailoring Pipeline
   - 依赖：[ai-schema-guard, ai-clarification-loop]
   - 状态：planned
   - 对应 feature：未启动
   - 备注：以已有 resume 为基础，生成派生简历版本

**最小闭环**：第 8 条 `ai-result-apply` 做完后，用户从 AI 主入口上传原始简历材料、提供 JD，AI 生成结构化草稿，落库并进入现有编辑器继续修改，再用现有链路导出 PDF。

## 6. 排期思路

先搭 AI service 骨架和 Bun job API，是为了先把服务边界和内部协议定死，避免后面在 Bun 里继续堆启发式解析逻辑。然后做 intake 和 structuring，把“原始材料 -> ResumeDocument”这条最难但最核心的链路打通。schema guard 必须早于前端 AI 交互闭环完成，因为它是所有 AI 输出进入现有系统前的硬收口。JD tailor 放到最后，因为它依赖基础导入和澄清回路已经稳定。

## 7. 观察项

- 现有 requirement `web-auth` 明确写了“不支持 AI 辅助写简历内容”，如果本 roadmap 确认推进，后续应补一份新的 requirement 或更新 requirement 边界
- 现有 `resumy-web-saas` roadmap 把 file import 定义为非 AI 解析路径；如果本 roadmap 通过，后续应把那条规划标记为被 AI 方案取代或降级为 fallback
- 现有 architecture 文档还是骨架，AI service 落地后需要由 feature acceptance 回写现状

## 8. 变更日志（update 模式）

- 2026-05-12：将产品主入口明确切换为 AI intake 流程；editor 定位调整为 fallback；`ai-chat-intake-ui` 负责隐藏或移除旧的空白新建入口
