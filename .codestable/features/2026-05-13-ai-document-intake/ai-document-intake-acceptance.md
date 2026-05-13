# ai-document-intake 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-05-13
> 关联方案 doc：`.codestable/features/2026-05-13-ai-document-intake/ai-document-intake-design.md`

## 1. 接口契约核对
- [x] `src/web/ai/intake.ts` 已提供统一 `UploadedIntake`
- [x] `src/web/ai/extract-pdf.mjs` 已作为 PDF 子进程提取脚本落地
- [x] `src/web/ai/handlers.ts` 的 `/api/ai/jobs/import` 已支持 multipart

## 2. 行为与决策核对
- [x] 只做文本提取，不在 Bun 里做重结构化解析
- [x] PDF 提取走 Node 子进程，避开 Bun 兼容性问题
- [x] 上传文件后直接交给 AI sidecar，不插入独立规则解析阶段

## 3. 验收场景核对
- [x] txt 上传可走 AI 主链路
- [x] 真实 PDF 上传（`简历/黄泽林简历.pdf`）可走 AI 主链路
- [x] 真实 PDF 上传 + JD 后，已验证可自动进 editor 并继续生成 PDF
- [x] 浏览器下载已落到本地 Downloads 目录

## 4. 术语一致性
- [x] UploadedIntake / Text extraction / Import job 口径一致

## 5. 架构归并
- [x] architecture 已明确：Document Intake Layer 只做文本提取；PDF 提取走 Node 子进程

## 6. requirement 回写
- [x] 无 requirement 回写；这是 AI 主入口底层能力，不单独新建 requirement

## 7. roadmap 回写
- [x] `ai-document-intake` 已从 `planned` 更新为 `done`
- [x] 主文档对应条目已同步为 `done`

## 8. attention.md 候选盘点
- [x] 候选 1：真实 PDF 提取依赖 Node 子进程脚本 `src/web/ai/extract-pdf.mjs`

## 9. 遗留
- 后续质量提升不再是 intake 层，而是 sidecar 的 agent 生成质量
