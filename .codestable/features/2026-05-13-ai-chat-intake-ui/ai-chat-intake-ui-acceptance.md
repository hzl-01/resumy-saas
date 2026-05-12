# ai-chat-intake-ui 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-05-13
> 关联方案 doc：`.codestable/features/2026-05-13-ai-chat-intake-ui/ai-chat-intake-ui-design.md`

## 1. 接口契约核对

- [x] `src/web/static/ai-intake.js` 已作为 AI intake 主逻辑文件落地，负责 start / poll / answers submit
- [x] Dashboard 第一屏主入口已切成 AI intake panel，旧 `new-resume-btn` 不再是主 CTA
- [x] `POST /api/ai/jobs/import`、`GET /api/ai/jobs/:id`、`POST /api/ai/jobs/:id/answers` 的前端调用点均存在并与 design 示例一致

## 2. 行为与决策核对

- [x] 主入口先做表单式 AI intake，没有直接做聊天 UI
- [x] 旧 editor 入口保留但降级为 secondary fallback：按钮文案改为“手动创建草稿（备用）”
- [x] 当前主通路只支持“文本背景 + 可选 JD”，没有假装支持文件上传
- [x] `needs_input` 的最小 answers 提交通路已经落地，可提交 `target_jd`
- [x] 微重构已落地：AI intake 逻辑从 `app.js` 拆到 `ai-intake.js`

## 3. 验收场景核对

- [x] 登录后首页：真实浏览器验证，第一屏先看到 AI intake 区块，而不是旧新建按钮
- [x] 提交背景材料：真实浏览器验证，可创建 job 并进入 processing / polling
- [x] 缺少 JD：真实浏览器验证，页面显示 `target_jd` 问题表单
- [x] 提交 answers：真实浏览器验证，提交 `target_jd` 后页面不再停留在旧问题上
- [x] sidecar 失败：真实浏览器验证，页面展示 `AI workflow scaffold is running but continue logic is not implemented yet`
- [x] 历史 resume 保留：dashboard 仍显示历史列表区域
- [x] fallback 入口保留：secondary manual entry 存在，可作为 editor fallback 使用

## 4. 术语一致性

- [x] `AI 主入口`、`Job status panel`、`Secondary manual entry` 在 design 和代码命名中含义一致
- [x] 前端继续使用后端 `questions[]` 驱动补问，没有额外私造步骤名

## 5. 架构归并

- [x] `D:\xm\resume-cli\.codestable\architecture\ARCHITECTURE.md` 已补充“AI intake first + editor fallback”的前端产品骨架

## 6. requirement 回写

- [x] `requirement` 为空；本 feature 主要是入口切换与前端交互骨架，本次不单独新增 requirement，结论为“无 requirement 回写”

## 7. roadmap 回写

- [x] `roadmap=ai-resume-agent`，`roadmap_item=ai-chat-intake-ui`
- [x] `ai-chat-intake-ui` 已从 `planned` 改为 `done`
- [x] roadmap 主文档对应条目已同步为 `done`

## 8. attention.md 候选盘点

- [x] 候选 1：当前 AI 主入口真实可走的最小链路是“文本背景 -> target_jd 补问 -> sidecar stub 失败态”，文件上传和 draft resume 落地都还在后续 feature

## 9. 遗留

- 已知限制：`ready -> 进入 editor` 还没打通，归 `ai-result-apply`
- 已知限制：真正文件上传解析还没打通，归 `ai-document-intake`
- 顺手发现：`resume-list` 空态文案和 AI 主入口已经改了，但更完整的 UI 统一还可以后续再润色
