# eino-service-scaffold 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-05-12
> 关联方案 doc：`.codestable/features/2026-05-12-eino-service-scaffold/eino-service-scaffold-design.md`

## 1. 接口契约核对

对照方案第 2.1 节名词层逐一核查。

**接口示例逐项核对**：
- [x] 示例 A（`services/ai/cmd/server/main.go:12`）：`GET /healthz -> 200 {"status":"ok"}` → 代码实际行为：一致，由 `httpapi.NewHandler()` 挂载 `handleHealthz()`，本地 smoke 返回 200 和 `status=ok`
- [x] 示例 B（`services/ai/internal/httpapi/routes.go:26`）：`POST /internal/ai/intake` 合法 payload -> `status: "failed" + error.code: "not_implemented"` → 代码实际行为：一致
- [x] 示例 C（`src/web/ai/client.ts:50`）：Bun internal client 调 `intake()` 返回 typed stub result → 代码实际行为：一致，`createAiClient().intake(...)` 返回 `AiStubResponse`

**名词层“现状 -> 变化”逐项核对**：
- [x] `services/ai/`：已新增 `go.mod`、`cmd/server/`、`internal/config/`、`internal/httpapi/`
- [x] Internal AI API envelope：已在 `services/ai/internal/httpapi/types.go` 与 `src/web/ai/client.ts` 落地
- [x] Bun internal AI client：已新增 `src/web/ai/client.ts`
- [x] 根运行约定：已通过 `go.work` + `package.json` 的 `ai:serve` 建立

**流程图核对**（第 2.2 节开头 mermaid 图）：
- [x] 图中节点 / 调用关系在代码均有实际落点：Go sidecar 启动、internal route、Bun internal client、invalid_input / not_implemented 分支都已落地

## 2. 行为与决策核对

对照方案第 1 节 + 第 2.2 节。

**需求摘要逐项验证**：
- [x] 新增 Go + Eino sidecar service 骨架：`services/ai/` 已存在，可单独启动
- [x] 提供 healthcheck：`GET /healthz` 已可用
- [x] 提供 Internal AI API stub endpoint：`POST /internal/ai/intake`、`POST /internal/ai/continue` 已可用
- [x] Bun 侧最小内部客户端封装：`src/web/ai/client.ts` 已落地
- [x] 后续 feature 不需要再讨论 sidecar 目录、启动方式和 internal API 基础协议：本 feature 已定死这些边界

**明确不做逐项核对**：
- [x] 未实现真实模型调用、prompt 编排或 ResumeDocument 结构化生成（grep 无命中）
- [x] 未实现浏览器端 AI 入口、AI job 存储表、权限路由或对外 API（grep `/api/ai/` 无命中）
- [x] AI service 未直接连接主数据库（grep 无 sqlite / DB 连接相关命中）
- [x] 未把 Bun 主服务改成多进程 supervisor
- [x] 未替换现有 `src/web/server.ts`、CLI 入口或 PDF 生成链路

**关键决策落地**：
- [x] 决策 D1：AI 服务作为 sidecar 独立进程落在 `services/ai/` → 代码体现：新增 `services/ai/`，未把 sidecar 逻辑塞进 `src/web/`
- [x] 决策 D2：Internal AI API 返回确定性 stub 结果 → 代码体现：合法请求统一返回 `status=failed + error.code=not_implemented`
- [x] 决策 D3：Bun 侧同步建立 typed internal client → 代码体现：`src/web/ai/client.ts`
- [x] 决策 D4：AI service 默认监听回环地址 → 代码体现：`defaultHost = "127.0.0.1"`

**编排层“现状 -> 变化”逐项核对**：
- [x] 运行拓扑从单 runtime 扩展为双 runtime：Bun 主服务 + Go sidecar
- [x] 请求拓扑新增“Bun internal client -> internal HTTP service”链路
- [x] AI service 内部流程已覆盖：配置解析 -> 路由注册 -> payload 校验 -> stub 响应

**流程级约束核对**：
- [x] payload 非法 -> 400 `invalid_input`
- [x] endpoint 存在但 workflow 未实现 -> 200 + `status=failed` + `error.code=not_implemented`
- [x] sidecar 默认仅回环监听
- [x] Bun internal client 对网络失败和超时做统一错误封装

**挂载点反向核对（可卸载性）**：
- [x] 挂载点 M1：`services/ai/` 目录 -> 已存在，承载 sidecar
- [x] 挂载点 M2：`package.json` scripts -> 已新增 `ai:serve` / `ai:smoke`
- [x] 挂载点 M3：`src/web/ai/client.ts` -> 已新增
- [x] 挂载点 M4：internal route 表 -> 已在 `httpapi.NewHandler()` 挂上 3 个 route
- [x] 反向核查（grep）：与本 feature 相关的实际挂入点均落在清单内，无额外挂点漏记
- [x] 拔除沙盘推演：移除上述 4 个挂点中的任一项，这个 feature 都不成立；无额外残留入口

## 3. 验收场景核对

- [x] **S1**：本地执行 Go 服务启动命令 -> 进程成功启动并输出监听地址
  - 证据来源：手工
  - 结果：通过（`go run ./services/ai/cmd/server` 输出 `ai service listening on http://127.0.0.1:8081`）

- [x] **S2**：`GET /healthz` -> 返回 200 和 `{ "status": "ok" }`
  - 证据来源：手工 / smoke
  - 结果：通过

- [x] **S3**：合法 `intake` 请求 -> 返回 `status: "failed"` 和 `error.code: "not_implemented"`
  - 证据来源：手工 / smoke
  - 结果：通过

- [x] **S4**：合法 `continue` 请求 -> 返回 `status: "failed"` 和 `error.code: "not_implemented"`
  - 证据来源：手工
  - 结果：通过

- [x] **S5**：缺少 `job_id` 或 source 非法 -> 返回 400 `invalid_input`
  - 证据来源：手工
  - 结果：通过（返回 `job_id is required`、`answers is required` 等字段级错误）

- [x] **S6**：Bun 侧通过 internal client 调用 stub endpoint -> 得到 typed result
  - 证据来源：手工
  - 结果：通过（`createAiClient().intake(...)` 返回 `AiStubResponse`）

- [x] **S7**：AI service 不可达 -> Bun client 抛统一错误类型
  - 证据来源：手工
  - 结果：通过（`AiClientError { code: "network_error", status: 0 }`）

前端肉眼验证：
- [x] 本 feature 无浏览器 UI 变更，无需浏览器肉眼核对

## 4. 术语一致性

- [x] `AI sidecar service`：代码命中与文档一致，均指 `services/ai/` 独立 Go 服务
- [x] `Internal AI API`：代码命中与文档一致，均指 `/internal/ai/intake` 和 `/internal/ai/continue`
- [x] `Bun internal AI client`：代码命中与文档一致，均指 `src/web/ai/client.ts`
- [x] 防冲突：grep `prompt`、`openai`、`anthropic`、`gemini`、`/api/ai/` 无误用命中

## 5. 架构归并

- [x] 架构 doc `D:\xm\resume-cli\.codestable\architecture\ARCHITECTURE.md`：
  - 归并了新名词：AI sidecar service、Internal AI API、Bun internal AI client
  - 归并了新子系统：`services/ai/`
  - 归并了新的运行拓扑：Bun 主服务通过 internal client 调 sidecar
  - 归并了系统级约束：sidecar 默认回环监听；schema guard 仍留在 Bun 侧

## 6. requirement 回写

- [x] `requirement` 为空，但本 feature 本身是基础设施骨架，不是直接对用户可感的新能力；本次不做 requirement 回写，结论为“无 requirement 回写”

## 7. roadmap 回写

- [x] 方案 frontmatter 含 `roadmap=ai-resume-agent`、`roadmap_item=eino-service-scaffold`
- [x] `.codestable/roadmap/ai-resume-agent/ai-resume-agent-items.yaml` 已从 `in-progress` 改为 `done`
- [x] `.codestable/roadmap/ai-resume-agent/ai-resume-agent-roadmap.md` 主文档子 feature 清单已同步为 `done`
- [x] roadmap YAML 状态机一致

## 8. attention.md 候选盘点

- [x] 候选 1：仓库根新增 `go.work`，因此后续启动 AI sidecar 要用 `go run ./services/ai/cmd/server` 或 `bun run ai:serve`，否则从根目录直接跑 Go 命令会找不到 module
- [x] 候选 2：AI sidecar 默认监听 `127.0.0.1:8081`，本地 smoke 走 `bun run ai:smoke`

## 9. 遗留

- 已知限制：当前 sidecar 仍是 stub workflow，只返回 `not_implemented`，未接入真实模型调用
- 顺手发现：`src/web/import/*` 与 `src/web/server.ts` 存在未收尾 TypeScript 问题，导致 `bun run check` 当前失败；不在本 feature 范围
- 后续优化点：`ai-job-api` feature 里可继续评估是否需要把 `src/web/server.ts` 路由分发继续拆细
