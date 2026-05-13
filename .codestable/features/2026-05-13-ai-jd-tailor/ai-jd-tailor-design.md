---
doc_type: feature-design
feature: 2026-05-13-ai-jd-tailor
requirement:
roadmap: ai-resume-agent
roadmap_item: ai-jd-tailor
status: approved
summary: 支持基于已有 resume + 新 JD 生成派生定制版 AI 草稿，而不是只能从上传文件或纯文本起稿
tags: [ai, jd, tailor, resume, derivative]
---

## 0. 术语约定
| 术语 | 定义 | 防冲突结论 |
|---|---|---|
| Source resume | 用户已有的一份 resume 草稿或简历记录，通过 `source_resume_id` 传入 AI job | 对应 `resumes` 表已有记录 |
| Derived draft | 基于 source resume + 新 JD 生成的新定制版草稿，不覆盖原始 resume | 与 editor 内直接修改原件区分 |
| JD tailor | 以既有背景为基础，按目标岗位信号重写 summary / emphasis / ordering 的过程 | 区别于 upload intake 起稿 |

## 1. 决策与约束
- **做什么**：支持 `source_resume_id + jd_text` 直出新的派生草稿。
- **成功标准**：
  - 前端已有 resume 列表旁可点击 `AI 定制`
  - 选中既有 resume 后提交 JD，可以生成新的 AI 草稿并进入 editor
  - 原 source resume 不被覆盖
- **明确不做**：不引入独立版本树 UI；仍以现有 `resumes` 表存派生结果。

## 2. 名词与编排
### 2.1 名词层
- `source_resume_id`
- `resume_document` 作为 sidecar 输入源之一
- 派生 draft resume 继续落到 `resumes`

### 2.2 编排层
1. 用户在已有 resume 上点击 `AI 定制`
2. 前端保存 `sourceResumeId`
3. 提交 `POST /api/ai/jobs/compose`
4. Bun 读取 source resume，转成背景文本 / 直接传 resume_document
5. sidecar 结合 JD 生成新草稿
6. Bun 落新 draft，前端进 editor

### 2.3 挂载点清单
- `src/web/static/app.js`：resume 列表项的 `AI 定制` 按钮
- `src/web/static/ai-intake.js`：source resume 选择与 compose 提交
- `src/web/ai/handlers.ts`：`source_resume_id` 装载和 sidecar 输入

### 2.4 推进策略
1. source resume 选择入口
2. compose 提交 source_resume_id
3. Bun 读取并传递 resume_document
4. 派生草稿验证

### 2.5 结构健康度与微重构
结论：不做微重构。

## 3. 验收契约
- 选择已有 resume + 新 JD -> 生成新的 AI 草稿
- 原始 resume 不被覆盖
- 派生草稿进入 editor 并可继续生成 PDF

## 4. 与项目级架构文档的关系
- 需回写：AI 不只从文件起稿，也可从已有 resume 派生定制版
