# ai-job-api 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-05-13
> 关联方案 doc：`.codestable/features/2026-05-13-ai-job-api/ai-job-api-design.md`

## 1. 接口契约核对

**接口示例逐项核对**：
- [x] 示例 A（`src/web/ai/handlers.ts:210`）：`POST /api/ai/jobs/import` 只给背景材料 -> 创建 job，随后 `GET job` 返回 `needs_input + target_jd` 问题；代码实际行为一致
- [x] 示例 B（`src/web/ai/handlers.ts:314`）：`POST /api/ai/jobs/:job_id/answers` 提交 `target_jd` 后 -> 返回 202 并继续推进；代码实际行为一致
- [x] 示例 C（`src/web/ai/handlers.ts:305`）：`GET /api/ai/jobs/:job_id` 返回 durable job state；代码实际行为一致

**名词层“现状 -> 变化”逐项核对**：
- [x] `AiJobRow`：已在 `src/web/db/schema.ts` 落地，对应 `ai_jobs` 表
- [x] `AiJobMessageRow`：已在 `src/web/db/schema.ts` 落地，对应 `ai_job_messages` 表
- [x] `AiJobQuestion`：已在 `src/web/ai/handlers.ts` 落地
- [x] `AiJobHandlers`：已在 `src/web/ai/handlers.ts` 落地，并由 `src/web/server.ts` 接入

**流程图核对**：
- [x] 图中的 create job -> needs_input -> answers -> sidecar -> persist result 关系均已在代码中出现

## 2. 行为与决策核对

**需求摘要逐项验证**：
- [x] 新增了创建 job、查询 job、提交 answers 的对外 API
- [x] Bun 持久化了 `ai_jobs` 和 `ai_job_messages`
- [x] 仅提交背景时，job 进入 `needs_input` 并要求 `target_jd`
- [x] 补完 `target_jd` 后，Bun 调 sidecar 并持久化 sidecar 返回状态
- [x] ownership、401/403/404/400/409 语义与现有 API 风格一致

**明确不做逐项核对**：
- [x] 未新增浏览器 UI 文件或 dashboard 主页面结构
- [x] 未创建 draft resume，也未写 `resumes` 表新记录
- [x] 未把 `/api/resumes/import` 改造成 AI 主入口
- [x] 未实现真实简历结构化、JD match 或 prompt 编排逻辑

**关键决策落地**：
- [x] 决策 D1：背景优先、JD 第二 -> 代码体现为无 JD 时直接 `needs_input`，而不是把 JD 设为硬前置
- [x] 决策 D2：Bun 是状态机唯一真相源 -> sidecar 结果通过 `pushToSidecar()` 回写到 `ai_jobs`
- [x] 决策 D3：sidecar 仍是 stub 但 Bun 状态机真实工作 -> tests 已覆盖
- [x] 决策 D4：对外 API 维持四组接口，不暴露阶段专用 endpoint -> 代码体现为 import / compose / get / answers 四组 route

**编排层“现状 -> 变化”逐项核对**：
- [x] 新增 Bun 侧 AI job 状态机
- [x] 新增持久化消息轨迹
- [x] 新增 `GET /api/ai/jobs/:id` 查询语义

**流程级约束核对**：
- [x] 鉴权失败 401、非 owner 403、job 不存在 404、payload 非法 400、非法状态 409 都已在 handler 里收口
- [x] sidecar 调用失败进入 durable `failed`，而不是直接把创建请求打崩
- [x] 无 JD 时不调用 sidecar，优先返回 `needs_input`

**挂载点反向核对**：
- [x] `src/web/server.ts` 已挂上 `/api/ai/jobs/import`、`/api/ai/jobs/compose`、`/api/ai/jobs/:job_id`、`/api/ai/jobs/:job_id/answers`
- [x] `src/web/db/schema.ts` 已扩展 `ai_jobs` / `ai_job_messages`
- [x] `src/web/ai/handlers.ts` 已成为 `createAiClient()` 的首个真实消费方
- [x] 认证边界复用了现有 JWT Bearer 校验链路
- [x] 反向 grep 未发现超出清单的隐藏挂载点

## 3. 验收场景核对

- [x] **S1**：`POST /api/ai/jobs/import` 只提交背景材料 -> `GET job` 返回 `needs_input + target_jd`
  - 证据来源：自动化测试 `handlers.test.ts`
  - 结果：通过

- [x] **S2**：`POST /api/ai/jobs/compose` 在背景和 JD 都齐时 -> `GET job` 返回 sidecar 的持久化状态 `failed/not_implemented`
  - 证据来源：自动化测试
  - 结果：通过

- [x] **S3**：对 `needs_input` job 提交 `target_jd` 后，job 不再停留在旧问题上
  - 证据来源：自动化测试
  - 结果：通过

- [x] **S4**：对 `failed` job 再提交 answers -> 409 `invalid_state`
  - 证据来源：自动化测试
  - 结果：通过

- [x] **S5**：用户 A 访问用户 B 的 job -> 403
  - 证据来源：自动化测试
  - 结果：通过

- [x] **S6**：不存在 job -> 404
  - 证据来源：handler 路径核查 + automated path covered by lookup branch
  - 结果：通过

- [x] **S7**：sidecar 不可达 -> job 进入 `failed` 且错误被持久化
  - 证据来源：自动化测试
  - 结果：通过

- [x] 本 feature 无浏览器 UI 变更，无需浏览器肉眼验证

## 4. 术语一致性

- [x] `AI job` 在 design、schema、handlers、tests 里命名一致
- [x] `target_jd` 在问题 key、answers key、状态机分支里命名一致
- [x] `needs_input` / `failed` / `processing` 状态命名一致
- [x] grep 未发现与本 feature 冲突的旧命名或旁路概念

## 5. 架构归并

- [x] `D:\xm\resume-cli\.codestable\architecture\ARCHITECTURE.md`
  - 归并了新名词：`AI job`、`Clarification question`
  - Web 路由顺序更新为包含 `/api/ai/jobs/*`
  - `src/web/ai/` 从“client only”升级为“client + AI job handlers”
  - 关键架构决定新增：AI 主入口按“背景优先、JD 第二、再继续生成”的状态机建模

## 6. requirement 回写

- [x] `requirement` 为空；本 feature 主要是内部 API / 状态机基础设施，不单独形成新的用户可感 requirement，结论为“无 requirement 回写”

## 7. roadmap 回写

- [x] `roadmap=ai-resume-agent`，`roadmap_item=ai-job-api`
- [x] `.codestable/roadmap/ai-resume-agent/ai-resume-agent-items.yaml` 已从 `in-progress` 改为 `done`
- [x] `.codestable/roadmap/ai-resume-agent/ai-resume-agent-roadmap.md` 主文档对应条目已同步为 `done`
- [x] YAML 校验通过

## 8. attention.md 候选盘点

- [x] 候选 1：`bun run check` 目前仍会被旧的 `src/web/import/*` 未收尾代码拖挂；做 AI feature 时如果要跑全局 typecheck，先知道这不是 `ai-job-api` 新引入的问题
- [x] 候选 2：`ai-job-api` 的最小真实流程是“先背景，再 JD”，后续任何 UI 或 client 接它都不能反着来

## 9. 遗留

- 已知限制：当前 sidecar 仍是 scaffold，只会把 job 推到 `failed/not_implemented`
- 顺手发现：旧的 `src/web/import/*` 和 `src/web/server.ts` 仍有未收尾类型问题，不在本 feature 范围
- 后续优化点：如果 AI 路由继续增多，`src/web/server.ts` 路由分发可能需要单独拆分
