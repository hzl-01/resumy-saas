# user-auth-frontend 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-05-09
> 关联方案 doc：`.codestable/features/2026-05-09-user-auth-frontend/user-auth-frontend-design.md`

## 1. 接口契约核对

**接口示例逐项核对**：

- [x] `GET /` → 200 index.html, `Content-Type: text/html`
  - `src/web/server.ts:74-93` `handleStaticRoute()` — ✅ 一致

- [x] `GET /static/app.js` → 200 application/javascript
  - `src/web/server.ts:74-93` `handleStaticRoute()` — ✅ 一致

- [x] `GET /static/style.css` → 200 text/css
  - `src/web/server.ts:74-93` `handleStaticRoute()` — ✅ 一致

- [x] `GET /static/spa-utils.js` → 200 application/javascript
  - `src/web/server.ts:74-93` `handleStaticRoute()` — ✅ 一致

- [x] `GET /nonexistent` → 404 (fallthrough)
  - `src/web/server.ts:40` — ✅ 一致

- [x] `apiFetch("/api/auth/me")` → `GET` with `Authorization: Bearer <token>`
  - `src/web/static/spa-utils.js:37-52` — ✅ 一致

- [x] `apiFetch("/api/auth/register", { email, password, name })` → `POST` with JSON
  - `src/web/static/spa-utils.js:37-52` — ✅ 一致

- [x] `apiFetch("/api/auth/login", { email, password })` → `POST` with JSON
  - `src/web/static/spa-utils.js:37-52` — ✅ 一致

- [x] `showView("login")` → `#view-login` block, others none
  - `src/web/static/spa-utils.js:7-11` — ✅ 一致

- [x] `showView("register")` → `#view-register` block, others none
  - `src/web/static/spa-utils.js:7-11` — ✅ 一致

- [x] `showView("dashboard")` → `#view-dashboard` block, others none
  - `src/web/static/spa-utils.js:7-11` — ✅ 一致

**名词层"现状 → 变化"逐项核对**：

- [x] 新增 `src/web/static/index.html` — SPA 容器，3 视图 — ✅ 一致
- [x] 新增 `src/web/static/app.js` — 客户端路由/API/DOM/JWT — ✅ 一致
- [x] 新增 `src/web/static/style.css` — 全局样式 — ✅ 一致
- [x] 新增 `src/web/static/spa-utils.js` — 共享 DOM 工具 — ✅ 一致
- [x] 修改 `src/web/server.ts` — 新增 `handleStaticRoute()` — ✅ 一致

**流程图核对**（第 2.2 节 mermaid 图）：

- [x] `GET /` → server → read static/index.html → browser
- [x] Token 不存在 → showView("login") → POST login → 存 token → dashboard
- [x] Token 存在 → GET /api/auth/me → 有效 → dashboard / 无效 → 清除 → login
- 所有节点在代码中均有实际落点（grep 确认）

## 2. 行为与决策核对

**需求摘要逐项验证**：

- [x] 浏览器打开 `http://localhost:3000` → 看到登录页面 ✅ 实测：200 index.html 含 `#view-login`
- [x] 注册新账号 → 自动登录 → 跳转仪表盘 ✅ 实测：register POST → 201 → token → showDashboard
- [x] 已注册用户登录 → 跳转仪表盘 ✅ 实测：login POST → 200 → token → showDashboard
- [x] 仪表盘显示用户姓名 + 登出按钮 ✅ `#user-name` + `#logout-btn`
- [x] 未登录用户访问受保护页 → 重定向到登录页 ✅ `init()` → 无 token → showView("login")

**明确不做逐项核对**：

- [x] 不引入前端框架/构建工具 → `index.html` 无 `<script src="https://">`，无 `package.json`/`vite.config.*`
- [x] 不做密码找回/重置 → 代码无相关 API 调用或 UI
- [x] 不做第三方 OAuth 登录 → 代码无 OAuth 相关逻辑
- [x] 不做简历 CRUD 操作 → dashboard 只显示占位文字
- [x] 不做响应式适配 → 仅桌面可用（max-width: 420px 居中布局）

**关键决策落地**：

- [x] 原生 HTML/CSS/JS → 零构建、零前端依赖 ✅
- [x] SPA 方案（display: none/block 切换） → index.html 三视图 + showView() ✅
- [x] 静态文件 serve 方式 → server.ts handleStaticRoute() ✅
- [x] Token 存 localStorage jwt_token → spa-utils.js getToken/setToken/clearToken ✅

**编排层"现状 → 变化"逐项核对**：

- [x] server.ts fetch 流程：handleAuthRoute → handleStaticRoute → 404 ✅
- [x] app.js init() → 检查 JWT → verifyAndShowDashboard / showView("login") ✅
- [x] login/register 表单提交 → apiFetch → token → showDashboard ✅
- [x] logout → clearToken → showView("login") ✅

**流程级约束核对**：

- [x] 错误语义：API 返回错误 → 页面顶部红色错误消息（`showError()`）✅
- [x] 幂等性：提交按钮 disabled 防止重复提交 ✅
- [x] 顺序约束：`app.js` 在 DOMContentLoaded 后执行（if/else check）✅
- [x] 可观测点：fetch 错误默认透传 ✅

**挂载点反向核对（可卸载性）**：

- [x] 挂载点 1：HTTP 路由表 — `GET /` → `server.ts:37` `handleStaticRoute()` ✅
- [x] 挂载点 2：HTTP 路由表 — `GET /static/*` → `server.ts:38` `handleStaticRoute()` ✅
- [x] 挂载点 3：localStorage `jwt_token` → `spa-utils.js:13-23` ✅

- [x] **反向核查（grep）**：grep `handleStaticRoute` → 仅 server.ts 中出现 2 次（定义 + 调用）。grep `jwt_token` → 仅 spa-utils.js 中出现 3 次。所有引用均在清单内。✅

- [x] **拔除沙盘推演**：
  1. 删除 `handleStaticRoute()` → `GET /` 和 `GET /static/*` 变 404 → 前端完全不可达 ✅
  2. 删除 `jwt_token` 读写 → 页面无论有/无 token 都显示 login → 无法 dashboard ✅
  3. 删除 `app.js` → HTML 内容可见但无交互 → 功能消失 ✅
  移除清单外无残留。

## 3. 验收场景核对

- [x] **S1**：首次访问看到登录页
  - 证据来源：实测 `GET /` 200，`index.html` 含 `#view-login`（默认 display: block）
  - 结果：通过 ✅

- [x] **S2**：注册成功 → JWT → dashboard
  - 证据来源：集成测试 POST /api/auth/register → 201 + token；代码 `handleRegister()` → setToken → showDashboard
  - 结果：通过 ✅

- [x] **S3**：登录成功 → JWT → dashboard
  - 证据来源：集成测试 POST /api/auth/login → 200 + token；代码 `handleLogin()` → setToken → showDashboard
  - 结果：通过 ✅

- [x] **S4**：仪表盘显示"你好，{name}" + 登出按钮
  - 证据来源：代码 `showDashboard(user)` → `#user-name` = `user.name`；HTML 含 `#logout-btn`
  - 结果：通过 ✅

- [x] **S5**：登出清除 JWT → 登录页
  - 证据来源：代码 `handleLogout()` → clearToken() + showView("login") 清空表单
  - 结果：通过 ✅

- [x] **S6**：已登录 F5 刷新 → 仪表盘
  - 证据来源：代码 `init()` → getToken() → verifyAndShowDashboard() → showDashboard
  - 结果：通过 ✅

- [x] **S7**：token 过期 → 401 → 清除 token → 登录页
  - 证据来源：代码 `verifyAndShowDashboard()` → !res.ok → clearToken() + showView("login")
  - 结果：通过 ✅

- [x] **S8**：注册已存在邮箱 → 400 email_exists → 红色错误
  - 证据来源：集成测试重复 register → 400；代码 `handleRegister()` → showError(res.data.message)
  - 结果：通过 ✅

- [x] **S9**：登录错误密码 → 401 → 红色错误
  - 证据来源：集成测试 wrong password → 401；代码 `handleLogin()` → showError(res.data.message)
  - 结果：通过 ✅

- [x] **S10/11**：登录 ↔ 注册页面切换
  - 证据来源：代码 `#goto-register` / `#goto-login` click → hideError() + showView()
  - 结果：通过 ✅

**前端浏览器验证**：

- [x] 页面加载后 DOM 结构正确：index.html 含 `#view-login` / `#view-register` / `#view-dashboard`，CSS 引用 /static/style.css，JS 引用 /static/spa-utils.js + /static/app.js
- [x] 所有静态资源通过 `/static/*` 路由 200 响应

## 4. 术语一致性

- [x] **SPA**：代码中无直接字符串"SPA"，但 `showView("login")` / `showView("register")` / `showView("dashboard")` 模式对应 SPA 方案 ✅
- [x] **JWT**：`localStorage.getItem("jwt_token")`, `apiFetch` 中的 `Authorization: Bearer` — 全部一致 ✅
- [x] **Auth API**：`/api/auth/register` / `/api/auth/login` / `/api/auth/me` 在 `app.js` 中全部引用一致 ✅
- [x] **Dashboard**：`showView("dashboard")`、`showDashboard(user)`、`#view-dashboard` — 全部一致 ✅
- [x] 防冲突 grep：无术语与其他模块冲突 ✅

## 5. 架构归并

**名词归并**：

- [x] `src/web/static/` — 前端 SPA 静态资源目录 → 已写入 ARCHITECTURE.md

**动词骨架归并**：

- [x] 静态文件服务流程：`GET /` → index.html, `GET /static/*` → file → 已写入 ARCHITECTURE.md

**流程级约束归并**：

- [x] API 路由优先于静态路由 → 已写入 ARCHITECTURE.md

**具体更新**：

- [x] `ARCHITECTURE.md` 第 3 节（Web 服务模块）— 追加 `static/` 子目录描述

## 6. requirement 回写

- [x] `requirement: web-auth` — 已存在且 `status: current`（此前 cs-req backfill 已完成）
  - 本 feature 未改变用户故事 / 边界 / pitch，无需更新
  - 结论：req-web-auth 未变，已符合当前能力现状

## 7. roadmap 回写

- [x] `roadmap: resumy-web-saas`, `roadmap_item: user-auth-frontend` — 两字段一致
- [x] items.yaml 条目已从 `status: in-progress` 更新为 `done`，`feature: 2026-05-09-user-auth-frontend`
- [x] 主文档 `resumy-web-saas-roadmap.md` 第 5 节条目 2 状态已同步

## 8. attention.md 候选盘点

- [x] 无候选：本 feature 未暴露需要补入 attention.md 的内容。静态文件通过 `import.meta.dir` 定位无异常，前端无构建流程，无新增命令或环境变量。

## 9. 遗留

- **后续优化点**：
  - 前端密码输入可增加 show/hide toggle
  - 长时间运行后 static 文件变动不会热重载（需重启 server）
  - 登录失败错误消息目前为英文（来自后端 handler），可后续做 i18n
- **顺手发现**：无
