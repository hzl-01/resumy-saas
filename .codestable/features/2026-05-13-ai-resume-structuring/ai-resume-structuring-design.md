---
doc_type: feature-design
feature: 2026-05-13-ai-resume-structuring
requirement:
roadmap: ai-resume-agent
roadmap_item: ai-resume-structuring
status: approved
summary: 由 AI sidecar 直接把原始文本、JD 和已有简历上下文生成 ResumeDocument 草稿
tags: [ai, structuring, resume-document, sidecar]
---

## 0. 术语约定
| 术语 | 定义 | 防冲突结论 |
|---|---|---|
| Resume structuring | AI sidecar 把文本 / source resume / JD 直接生成 `ResumeDocument` | 区别于 document intake 的“只提取文本” |
| Extracted profile | 从旧简历文本里轻量抽出的真实事实，用来补强模型输出 | 只是辅助，不替代 AI 主脑 |
| AI draft | 经过模型 + 轻量归一化后可落库的草稿 ResumeDocument | 与 editor 里的 draft resume 一致 |

## 1. 决策与约束
- **做什么**：把 sidecar 从“最小占位草稿”推进到“AI 直出更像样的 ResumeDocument 草稿”。
- **成功标准**：
  - 真实姓名/电话/邮箱/地点/已有公司/职位/学校/技能尽量从旧简历提取并落到草稿
  - JD 信号参与 title / summary / emphasis
  - AI 输出仍以 JSON ResumeDocument 为唯一产物
- **明确不做**：不做最终人工无感终稿；editor 仍保留最后确认权。

## 2. 名词与编排
### 2.1 名词层
- `services/ai/internal/model/openai.go`：OpenAI-compatible prompt builder
- `services/ai/internal/model/extract.go`：轻量抽取姓名/电话/邮箱/学校/公司/职位等真实字段
- `services/ai/internal/model/normalize.go`：统一字段映射到 ResumeDocument

### 2.2 编排层
1. 输入背景文本 / source resume / JD
2. 轻量提取真实字段
3. AI 生成 ResumeDocument JSON
4. 用提取字段补强 AI 输出
5. 返回 ready/needs_input/failed

### 2.3 挂载点清单
- `services/ai/internal/model/openai.go`
- `services/ai/internal/model/extract.go`
- `services/ai/internal/model/normalize.go`

### 2.4 推进策略
1. 轻量事实抽取
2. Prompt 注入 agent 规则与 JD 分析
3. 模型输出归一化
4. 草稿质量验证

### 2.5 结构健康度与微重构
结论：不做微重构。模型相关代码已集中在 `services/ai/internal/model/`。

## 3. 验收契约
- 上传真实 PDF 后，草稿里应优先出现真实姓名/邮箱/电话/地点
- 至少第一段工作经历的公司/职位不应全是 placeholder
- title 应优先受 JD 影响

## 4. 与项目级架构文档的关系
- 需回写：AI sidecar 不只“起草”，而是承担实际 ResumeDocument structuring 主脑
