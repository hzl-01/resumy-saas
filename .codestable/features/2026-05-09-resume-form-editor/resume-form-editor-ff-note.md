---
doc_type: feature-ff-note
feature: resume-form-editor
date: 2026-05-10
requirement: web-auth
tags: [frontend, editor, ui, resume]
---

## 做了什么

将 SPA 仪表盘从占位符升级为完整的简历管理界面：简历列表展示 → 新建/编辑/删除。编辑器覆盖 ResumeDocument 全部 6 个板块（basics / education / experience / projects / skills / customSections），支持数组项增删。

## 改了哪些

- `src/web/static/index.html` — 仪表盘替换为简历列表 + "新建简历"按钮；新增 `#view-editor` 含所有表单字段
- `src/web/static/app.js` — 新增 `loadResumeList()` / `openEditor()` / `handleSave()` / `handleDelete()` / 各板块收集函数；编辑器通过 querySelector + 类名约定（`.f-*`）收集数据
- `src/web/static/spa-utils.js` — 新增 `esc()` / `formatDate()` / `pad()`；`apiFetch()` 支持自定义 method 参数
- `src/web/static/style.css` — 新增 resume-item / array-item / section-title / btn-remove / form-row 等样式

## 怎么验证的

API 测试：创建 → 列表 → 更新全部 6 板块 → 查看 → 删除 → 列表空。静态文件 200。预测试套件 18 例通过。浏览器渲染需手工验证。

## 顺手发现（可选，不阻塞）

- 编辑器保存后无残影：每次保存刷新 `resumeData` 引用
