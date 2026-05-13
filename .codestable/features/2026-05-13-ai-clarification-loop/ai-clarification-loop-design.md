---
doc_type: feature-design
feature: 2026-05-13-ai-clarification-loop
requirement:
roadmap: ai-resume-agent
roadmap_item: ai-clarification-loop
status: approved
summary: 让 AI sidecar 在关键事实缺失时返回结构化问题，前端提交 answers 后继续生成，而不是一次性盲出大量占位符
tags: [ai, clarification, questions, needs-input, loop]
---

## 0. 术语约定
| 术语 | 定义 | 防冲突结论 |
|---|---|---|
| Clarification loop | 当 AI 缺关键事实时返回 `needs_input + questions[]`，前端提交 answers 后再继续生成 | 与 `ai-job-api` 状态机对齐 |
| Critical missing fact | 会明显影响草稿真实性或可用性的缺口，例如姓名、核心经历公司/职位、JD 本身 | 不把无关细节都升级成补问 |
| Answers round | 一轮结构化 answers 提交后重新推进 AI job | 与聊天 UI 区分 |

## 1. 决策与约束
- **做什么**：让 sidecar / Bun 的 AI job 支持多轮关键缺口追问，而不是缺字段就直接铺满 placeholder。
- **成功标准**：
  - sidecar 能生成结构化问题
  - Bun 能持久化 `needs_input`
  - 前端能提交 answers 并重新推进 job
- **明确不做**：不做富聊天消息 UI，只做结构化问题回路。

## 2. 名词与编排
### 2.1 名词层
- `ClarificationQuestion`
- `questions[]`
- `needs_input`

### 2.2 编排层
1. AI 生成初稿前检测关键缺口
2. 若缺失 -> `needs_input + questions[]`
3. 前端提交 answers
4. Bun 合并 answers
5. 再次调用 sidecar

### 2.3 挂载点清单
- `services/ai/internal/model/clarify.go`
- `services/ai/internal/httpapi/routes.go`
- `src/web/ai/handlers.ts`
- `src/web/static/ai-intake.js`

### 2.4 推进策略
1. sidecar 问题生成
2. Bun 持久化 needs_input
3. 前端 answers 提交
4. 再次推进生成

### 2.5 结构健康度与微重构
结论：不做微重构。

## 3. 验收契约
- 缺 JD 时会问 `target_jd`
- 缺姓名/核心公司/职位时会问关键问题
- answers 提交后 job 能继续推进

## 4. 与项目级架构文档的关系
- 需回写：AI 主链路支持结构化 `needs_input` 多轮追问
