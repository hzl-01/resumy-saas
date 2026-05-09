---
doc_type: feature-ff-note
feature: resume-crud-api
date: 2026-05-09
requirement: web-auth
tags: [api, resume, crud, database]
---

## 做了什么

为 `resumy serve` 添加了简历 CRUD API：支持用户创建、列出、查看、更新、删除自己的简历。所有端点需 JWT 认证，每人只能操作自己的简历。

## 改了哪些

- `src/web/db/schema.ts` — 新增 `resumes` 表 + CRUD 函数（insertResume, getResumesByUserId, getResumeById, updateResume, deleteResume）；initDb 同步建表
- `src/web/resume/handlers.ts` — 新增，5 个 handler（list / create / get / update / delete），使用 `normalizeResumeDocument` 校验数据
- `src/web/server.ts` — 新增 `handleResumeRoute()`，路由顺序：auth → resume → static → 404

## 怎么验证的

启动 server，注册用户 → 创建简历（201）→ 列表（200）→ 查看（200）→ 更新（200）→ 删除（204）→ 删除后 404；无 token 401；无效数据 400；预测试套件 18 例全部通过。

## 顺手发现（可选，不阻塞）

- `src/web/auth/handlers.ts:44` — auth handler 内联 `jwtSecret || "dev-secret"` 模式需要 resume handlers 手工对齐。建议后续抽取共享的 `verifyToken(db, jwtSecret)` 函数，避免分散在多处
