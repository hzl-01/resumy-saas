package model

import "strings"

func ResumeDocumentToBackground(input map[string]any) string {
	if len(input) == 0 {
		return ""
	}
	basic := asMap(input["basics"])
	parts := []string{}
	if name := stringValue(basic["name"]); name != "" {
		parts = append(parts, "姓名："+name)
	}
	if title := stringValue(basic["title"]); title != "" {
		parts = append(parts, "当前标题："+title)
	}
	if summary := stringValue(basic["summary"]); summary != "" {
		parts = append(parts, "简介："+summary)
	}
	for _, raw := range asSlice(input["experience"]) {
		exp := asMap(raw)
		parts = append(parts, strings.TrimSpace("工作经历："+stringValue(exp["company"])+" "+stringValue(exp["role"])+" "+stringValue(exp["summary"])))
	}
	for _, raw := range asSlice(input["projects"]) {
		project := asMap(raw)
		parts = append(parts, strings.TrimSpace("项目："+stringValue(project["name"])+" "+stringValue(project["summary"])))
	}
	for _, raw := range asSlice(input["skills"]) {
		skill := asMap(raw)
		items := []string{}
		for _, item := range asSlice(skill["items"]) {
			if text := stringValue(item); text != "" {
				items = append(items, text)
			}
		}
		if len(items) > 0 {
			parts = append(parts, "技能："+stringValue(skill["name"])+" "+strings.Join(items, ", "))
		}
	}
	return strings.Join(parts, "\n")
}
