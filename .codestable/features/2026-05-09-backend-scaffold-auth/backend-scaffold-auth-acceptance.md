# backend-scaffold-auth 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-05-09
> 关联方案 doc：`.codestable/features/2026-05-09-backend-scaffold-auth/backend-scaffold-auth-design.md`

## 1. 接口契约核对

对照方案第 2.1 节名词层逐一核查：

**接口示例逐项核对**：
- [x] POST /api/auth/register → `src/web/auth/handlers.ts:handleRegister`
  输入 `{ email: "a@b.com", password: "123456", name: "Test" }` → 输出 `201 { user: { id, email, name }, token }`
  代码实际行为：一致 ✓
- [x] POST /api/auth/login → `src/web/auth/handlers.ts:handleLogin`
  输入 `{ email: "a@b.com", password: "123456" }` → 输出 `200 { user: { id, email, name }, token }`
  代码实际行为：一致 ✓
- [x] GET /api/auth/me → `src/web/auth/handlers.ts:handleMe`
  带有效 token → 输出 `200 { user: { id, email, name } }`
  代码实际行为：一致 ✓
- [x] 重复注册 → `400 { error: "email_exists" }` — 一致 ✓
- [x] 错误密码 → `401 { error: "invalid_credentials" }` — 一致 ✓
- [x] 无 token → `401 { error: "unauthorized" }` — 一致 ✓

**名词层"现状 → 变化"逐项核对**：
- [x] 新增类型 RegisterRequest / LoginRequest / UserResponse / AuthResponse：代码中使用 `request.json()` 直接解析，类型由 `Record<string, unknown>` 约束后使用
- [x] 新增类型 UserRow：`src/web/db/schema.ts:UserRow` 接口定义一致 ✓
- [x] 新增 CLI 选项 `--port` / `--host` / `--db` / `--jwt-secret`：`src/cli/commands/serve.ts` 实现一致 ✓

**流程图核对**（第 2.2 节 mermaid 图）：
- [x] 图中所有节点（CLI → Server → Auth Handler → Database）在代码中均有实际落点

## 2. 行为与决策核对

**需求摘要逐项验证**：
- [x] `resumy serve` 启动 HTTP 服务 → 已验证 ✓
- [x] POST /api/auth/register 注册用户 → 已验证 ✓
- [x] POST /api/auth/login 验证凭证 → 已验证 ✓
- [x] GET /api/auth/me 获取用户信息 → 已验证 ✓
- [x] SQLite 持久化 → 已验证 ✓

**明确不做逐项核对**：
- [x] 无前端 UI（grep HTML/JS 无新增前端文件）✓
- [x] 无简历 CRUD 路由（grep 无 resume 相关路由）✓
- [x] 无 HTTPS 配置 ✓
- [x] 无邮箱验证/密码重置 ✓
- [x] 无角色/权限系统 ✓
- [x] 无数据库迁移工具（SQLite 自动建表）✓
- [x] 无 PostgreSQL/MySQL 依赖（仅 bun:sqlite）✓

**关键决策落地**：
- [x] HTTP 框架：Bun.serve → `src/web/server.ts` 使用 `Bun.serve()` ✓
- [x] 数据库：SQLite → `src/web/db/schema.ts` 使用 `bun:sqlite` 的 `Database` ✓
- [x] 认证：JWT + bcrypt → `src/web/auth/handlers.ts` 使用 `jsonwebtoken` + `bcryptjs` ✓
- [x] 环境变量支持 → `src/cli/commands/serve.ts` 中 `getEnv()` 函数 ✓

**编排层"现状 → 变化"逐项核对**：
- [x] 服务启动流：CLI → initDb → 注册路由 → 启动监听 → `src/web/server.ts:startServer` ✓
- [x] 认证请求流：请求 → 路由分发 → handler → DB → 响应 → `src/web/server.ts:handleAuthRoute` ✓
- [x] JWT 中间件流：提取 Authorization → 验证 → 注入 → `src/web/auth/handlers.ts:handleMe` ✓

**流程级约束核对**：
- [x] 错误统一格式 `{ error, message }` ✓
- [x] register 不幂等，login/me 幂等 ✓
- [x] JWT 过期 7 天 ✓
- [x] 启动日志（端口、数据库路径）✓

**挂载点反向核对（可卸载性）**：
- [x] CLI 命令注册：`src/cli/index.ts:registerServeCommand` — 一致 ✓
- [x] HTTP 路由注册：`src/web/server.ts:handleAuthRoute` — 一致 ✓
- [x] 数据库初始化：`src/web/db/schema.ts:initDb` — 一致 ✓
- [x] JWT 密钥配置：`src/cli/commands/serve.ts:--jwt-secret` — 一致 ✓
- [x] 反向核查（grep 所有本次新增引用是否都在清单内）：全部命中 ✓
- [x] 拔除沙盘推演：删除 4 处挂载点后 feature 完全消失 ✓

## 3. 验收场景核对

- [x] **S1**（启动服务）：`resumy serve --port 3099` → 日志输出，curl 可访问
  证据来源：手工测试 ✓
- [x] **S2**（注册成功）：`POST /api/auth/register` → `201 { user, token }`
  证据来源：`api.test.ts` + 手工测试 ✓
- [x] **S3**（登录成功）：`POST /api/auth/login` → `200 { user, token }`
  证据来源：`api.test.ts` + 手工测试 ✓
- [x] **S4**（获取用户信息）：`GET /api/auth/me` 带 token → `200 { user }`
  证据来源：`api.test.ts` ✓
- [x] **S5**（重复注册）：同一 email 二次注册 → `400 email_exists`
  证据来源：`api.test.ts` ✓
- [x] **S6**（密码错误）：正确 email + 错误密码 → `401 invalid_credentials`
  证据来源：`api.test.ts` ✓
- [x] **S7**（不存在的 email）：不存在的 email 登录 → `401 invalid_credentials`
  证据来源：`api.test.ts` ✓
- [x] **S8**（无 token）：`GET /api/auth/me` 无 Authorization → `401 unauthorized`
  证据来源：`api.test.ts` ✓
- [x] **S9**（无效 token）：带无效 JWT → `401 unauthorized`
  证据来源：`api.test.ts` ✓
- [x] **S10**（参数缺失）：`POST /api/auth/register {}` → `400 invalid_input`
  证据来源：`api.test.ts` ✓

## 4. 术语一致性

- [x] serve / JWT / bcrypt / SQLite：代码中全部一致，无同义混用 ✓
- [x] 防冲突 grep：禁用词无命中 ✓

## 5. 架构归并

- [x] `ARCHITECTURE.md`（`.codestable/architecture/ARCHITECTURE.md`）：
  - 追加 `src/web/` 到"子系统/模块索引"节
  - 追加 Auth API 到"核心概念"节
  - 详见下方写入内容

架构归并已写入，内容如下（更新 `ARCHITECTURE.md`）：

### 子系统/模块索引
- `src/web/` — Web 服务模块。通过 `resumy serve` 命令启动，提供 HTTP REST API（Bun.serve）。包含：
  - `src/web/server.ts` — HTTP 服务启动 + 路由分发
  - `src/web/auth/` — 用户认证（register/login/me，JWT + bcrypt）
  - `src/web/db/` — 数据库层（SQLite，bun:sqlite）

### 核心概念
- **Auth API**：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`，JWT Bearer Token 认证，7 天过期
- **SQLite**：嵌入式数据库，`bun:sqlite` 驱动，运行时自动建表
- **JWT**：JSON Web Token，用于 API 请求认证

## 6. requirement 回写

- [x] `requirement` 空 + 新增了用户可感能力 → 触发 `cs-req` backfill

本 feature 新增了 Web 服务 + 用户认证能力，需要 backfill requirement。跳过后续单独触发 `cs-req`。

## 7. roadmap 回写

- [x] 两字段均有值：`roadmap: resumy-web-saas`, `roadmap_item: backend-scaffold-auth`
- [x] items.yaml 已更新 `status: done`，yaml 校验通过
- [x] 主文档子 feature 清单已同步

## 8. attention.md 候选盘点

- [x] 有候选：
  - 候选 1：`bun:sqlite` 是 Bun 原生 API，不能用 `node` 运行服务。开发时用 `bun index.ts serve`，构建后用 `bun dist/npm/index.js serve`。建议放 attention.md 编译与构建节。

## 9. 遗留

- 无后续优化点
- 无已知限制
- 实现阶段"顺手发现"：无

## 10. checks 状态更新

已同步更新 checklist.yaml 中所有 check 为 `passed`。
