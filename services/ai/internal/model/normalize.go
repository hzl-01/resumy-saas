package model

import "fmt"

func NormalizeResumeDocumentMap(input map[string]any) map[string]any {
	return map[string]any{
		"basics":         normalizeBasics(asMap(input["basics"])),
		"education":      normalizeEducationArray(input["education"]),
		"experience":     normalizeExperienceArray(input["experience"]),
		"projects":       normalizeProjectArray(input["projects"]),
		"skills":         normalizeSkillArray(input["skills"]),
		"customSections": normalizeCustomSections(input["customSections"]),
	}
}

func normalizeBasics(input map[string]any) map[string]any {
	return map[string]any{
		"name":     firstString(input, "name", "fullName", "candidateName", "待确认姓名"),
		"title":    firstString(input, "title", "label", "targetTitle", "待确认职位"),
		"email":    optionalString(input, "email"),
		"phone":    optionalString(input, "phone"),
		"location": optionalString(input, "location"),
		"website":  optionalString(input, "website", "portfolio"),
		"summary":  optionalString(input, "summary", "description", "profile"),
		"links":    normalizeLinks(input["links"]),
	}
}

func normalizeEducationArray(value any) []any {
	result := []any{}
	for _, raw := range asSlice(value) {
		item := asMap(raw)
		result = append(result, map[string]any{
			"institution": firstString(item, "institution", "school", "待确认学校"),
			"degree":      firstString(item, "degree", "studyType", "area", "待确认学位"),
			"startDate":   optionalString(item, "startDate"),
			"endDate":     optionalString(item, "endDate"),
			"location":    optionalString(item, "location"),
			"highlights":  normalizeStringList(item["highlights"]),
		})
	}
	return result
}

func normalizeExperienceArray(value any) []any {
	result := []any{}
	for _, raw := range asSlice(value) {
		item := asMap(raw)
		result = append(result, map[string]any{
			"company":      firstString(item, "company", "organization", "待确认公司"),
			"role":         firstString(item, "role", "position", "title", "待确认职位"),
			"startDate":    optionalString(item, "startDate"),
			"endDate":      optionalString(item, "endDate"),
			"location":     optionalString(item, "location"),
			"summary":      optionalString(item, "summary", "description"),
			"highlights":   normalizeStringList(item["highlights"]),
			"technologies": normalizeStringList(firstValue(item, "technologies", "keywords", "stack")),
		})
	}
	return result
}

func normalizeProjectArray(value any) []any {
	result := []any{}
	for _, raw := range asSlice(value) {
		item := asMap(raw)
		result = append(result, map[string]any{
			"name":         firstString(item, "name", "title", "待确认项目"),
			"role":         optionalString(item, "role", "position"),
			"url":          optionalString(item, "url", "link"),
			"summary":      optionalString(item, "summary", "description"),
			"highlights":   normalizeStringList(item["highlights"]),
			"technologies": normalizeStringList(firstValue(item, "technologies", "keywords", "stack")),
		})
	}
	return result
}

func normalizeSkillArray(value any) []any {
	result := []any{}
	for _, raw := range asSlice(value) {
		item := asMap(raw)
		result = append(result, map[string]any{
			"name":  firstString(item, "name", "category", "Skills"),
			"items": normalizeStringList(firstValue(item, "items", "keywords")),
		})
	}
	return result
}

func normalizeCustomSections(value any) []any {
	result := []any{}
	for _, raw := range asSlice(value) {
		item := asMap(raw)
		result = append(result, map[string]any{
			"title": firstString(item, "title", "name", "待确认板块"),
			"items": normalizeStringList(firstValue(item, "items", "highlights", "content")),
		})
	}
	return result
}

func normalizeLinks(value any) []any {
	result := []any{}
	for _, raw := range asSlice(value) {
		item := asMap(raw)
		label := firstString(item, "label", "name", "链接")
		url := firstString(item, "url", "href", "")
		if url == "" {
			continue
		}
		result = append(result, map[string]any{"label": label, "url": url})
	}
	return result
}

func normalizeStringList(value any) []any {
	result := []any{}
	for _, raw := range asSlice(value) {
		if text, ok := raw.(string); ok && text != "" {
			result = append(result, text)
		}
	}
	return result
}

func asMap(value any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	if typed, ok := value.(map[string]any); ok {
		return typed
	}
	return map[string]any{}
}

func asSlice(value any) []any {
	if value == nil {
		return []any{}
	}
	if typed, ok := value.([]any); ok {
		return typed
	}
	return []any{}
}

func firstValue(input map[string]any, keys ...string) any {
	for _, key := range keys {
		if value, ok := input[key]; ok {
			return value
		}
	}
	return nil
}

func firstString(input map[string]any, keys ...string) string {
	for _, key := range keys {
		if value, ok := input[key]; ok {
			if text, ok := value.(string); ok && text != "" {
				return text
			}
		}
	}
	return fmt.Sprint(keys[len(keys)-1])
}

func optionalString(input map[string]any, keys ...string) any {
	for _, key := range keys {
		if value, ok := input[key]; ok {
			if text, ok := value.(string); ok && text != "" {
				return text
			}
		}
	}
	return nil
}
