---
doc_type: feature-design
feature: 2026-05-13-ai-schema-guard
requirement:
roadmap: ai-resume-agent
roadmap_item: ai-schema-guard
status: approved
summary: 由 Bun 侧用 normalizeResumeDocument 作为 AI 输出最终收口，并决定 ready/failed/draft 落库行为
tags: [ai, schema, guard, validation, bun]
---

## 0. 术语约定
| 术语 | 定义 | 防冲突结论 |
|---|---|---|
| Schema guard | Bun 侧对 AI 输出做的最终校验与收口步骤 | 复用 `normalizeResumeDocument` |
| Ready gate | 只有通过 schema guard 的 AI 输出，才能落草稿并返回 ready | 与 AI sidecar 分工清晰 |

## 1. 决策与约束
- **做什么**：Bun 侧使用 `normalizeResumeDocument()` 作为最终守门人，决定是否允许 AI 输出落草稿。
- **成功标准**：
  - AI 输出先过 schema guard
  - 合法才创建 draft resume
  - 非法则 failed 或 needs_input
- **明确不做**：不把 schema 校验逻辑下沉到 sidecar 替代 Bun。

## 2. 名词与编排
### 2.1 名词层
- `createDraftResume()`
- `normalizeResumeDocument()`
- `result_resume_id`

### 2.2 编排层
1. AI sidecar 返回 JSON
2. Bun 调 `normalizeResumeDocument()`
3. 通过 -> insert draft resume
4. 不通过 -> 阻止落库

### 2.3 挂载点清单
- `src/web/ai/handlers.ts`
- `src/schema/resume.ts`

### 2.4 推进策略
1. AI 输出入 Bun
2. schema validate
3. 落草稿 / 回状态

### 2.5 结构健康度与微重构
结论：不做微重构。

## 3. 验收契约
- 不合法 ResumeDocument 不应直接落草稿
- 合法输出可创建 draft resume 并回 `draft_resume_id`

## 4. 与项目级架构文档的关系
- 需回写：schema guard 是 Bun 侧最终守门人
