# resumy 架构总入口

> 状态：骨架（待填充）
> 创建日期：2026-05-09

## 1. 项目简介

resumy — 基于 Bun + TypeScript 的简历 PDF 生成 CLI。通过结构化命令行参数 + 内置模板生成 PDF 简历。

## 2. 核心概念 / 术语表

- **ResumeDocument** — 规范化的简历数据模型，见 `src/domain/resume.ts`
- **Auth API** — 用户认证接口：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`，基于 JWT Bearer Token，7 天过期
- **SQLite** — 嵌入式数据库，通过 `bun:sqlite` 驱动，运行时自动建表
- **JWT** — JSON Web Token，无状态认证方案

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
  - 路由顺序：`/api/auth/*` 优先 → `/static/*` 静态文件 → 404
- `auth/` — 用户认证 handlers（register / login / me，JWT + bcrypt）
- `db/` — 数据库层（SQLite，bun:sqlite，自动建 users 表）
- `static/` — 前端 SPA 静态资源（index.html, app.js, spa-utils.js, style.css）

### IO 层 (`src/io/`)
- `files.ts` — 文件读写工具函数

## 4. 关键架构决定

## 5. 已知约束 / 硬边界
