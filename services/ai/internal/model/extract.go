package model

import (
	"regexp"
	"strings"
)

type ExtractedProfile struct {
	Name       string
	Email      string
	Phone      string
	Location   string
	Title      string
	Summary    string
	Skills     []string
	Education  []map[string]any
	Experience []map[string]any
}

var (
	emailRe = regexp.MustCompile(`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`)
	phoneRe = regexp.MustCompile(`1[3-9][0-9]{9}`)
	dateRe  = regexp.MustCompile(`20[0-9]{2}(?:\.[0-9]{2})?(?:-|—|–|至今|至今)?`)
)

func ExtractProfileFromText(input string) ExtractedProfile {
	lines := splitLines(input)
	profile := ExtractedProfile{}

	for _, line := range lines {
		if profile.Name == "" && looksLikeName(line) {
			profile.Name = line
		}
		if profile.Email == "" {
			profile.Email = emailRe.FindString(line)
		}
		if profile.Phone == "" {
			profile.Phone = phoneRe.FindString(line)
		}
		if profile.Location == "" && strings.Contains(line, "期望城市") {
			profile.Location = strings.TrimSpace(afterMarker(line, "期望城市："))
		}
		if profile.Title == "" && strings.Contains(line, "工作经验") && strings.Contains(line, "|") {
			parts := splitPipe(line)
			for _, part := range parts {
				if strings.Contains(part, "工程师") || strings.Contains(part, "开发") || strings.Contains(part, "技术员") || strings.Contains(part, "实施") {
					profile.Title = part
					break
				}
			}
		}
	}

	profile.Summary = extractSummary(lines)
	profile.Skills = extractSkills(lines)
	profile.Education = extractEducation(lines)
	profile.Experience = extractExperience(lines)

	return profile
}

func MergeExtractedProfile(document map[string]any, extracted ExtractedProfile) map[string]any {
	basic := asMap(document["basics"])
	basic["name"] = chooseBetterString(basic["name"], extracted.Name, "待确认姓名")
	basic["title"] = chooseBetterString(basic["title"], extracted.Title, "待确认职位")
	basic["email"] = chooseOptional(basic["email"], extracted.Email)
	basic["phone"] = chooseOptional(basic["phone"], extracted.Phone)
	basic["location"] = chooseOptional(basic["location"], extracted.Location)
	basic["summary"] = chooseOptional(basic["summary"], extracted.Summary)
	if _, ok := basic["links"]; !ok {
		basic["links"] = []any{}
	}
	document["basics"] = basic

	experience := normalizeExperienceForMerge(asSlice(document["experience"]), extracted.Experience, extracted.Title, extracted.Summary)
	document["experience"] = experience

	if len(asSlice(document["education"])) == 0 && len(extracted.Education) > 0 {
		document["education"] = mapsToAny(extracted.Education)
	}

	if len(asSlice(document["skills"])) == 0 && len(extracted.Skills) > 0 {
		document["skills"] = []any{map[string]any{"name": "技能", "items": stringsToAny(extracted.Skills)}}
	}

	ensureSections(document)
	return document
}

func normalizeExperienceForMerge(current []any, extracted []map[string]any, title string, summary string) []any {
	if len(current) == 0 && len(extracted) == 0 {
		if title == "" && summary == "" {
			return []any{}
		}
		return []any{map[string]any{
			"company":      "待确认公司",
			"role":         fallbackText(title, "待确认职位"),
			"summary":      optionalText(summary),
			"highlights":   []any{},
			"technologies": []any{},
		}}
	}

	if len(current) == 0 {
		return mapsToAny(extracted)
	}

	first := asMap(current[0])
	if len(extracted) > 0 {
		first["company"] = chooseBetterString(first["company"], stringValue(extracted[0]["company"]), "待确认公司")
		first["role"] = chooseBetterString(first["role"], stringValue(extracted[0]["role"]), "待确认职位")
		first["summary"] = chooseOptional(first["summary"], stringValue(extracted[0]["summary"]))
		if len(asSlice(first["highlights"])) == 0 {
			first["highlights"] = extracted[0]["highlights"]
		}
	}
	current[0] = first
	return current
}

func extractSummary(lines []string) string {
	collected := []string{}
	inSummary := false
	for _, line := range lines {
		if strings.Contains(line, "个人优势") {
			inSummary = true
			continue
		}
		if inSummary && strings.Contains(line, "工作经历") {
			break
		}
		if inSummary && line != "" {
			collected = append(collected, line)
			if len(collected) >= 3 {
				break
			}
		}
	}
	return strings.Join(collected, " ")
}

func extractSkills(lines []string) []string {
	collected := []string{}
	inSkills := false
	for _, line := range lines {
		if strings.Contains(line, "专业技能") {
			inSkills = true
			continue
		}
		if inSkills && (strings.Contains(line, "教育经历") || strings.Contains(line, "资格证书")) {
			continue
		}
		if inSkills && line != "" {
			for _, piece := range strings.FieldsFunc(line, func(r rune) bool { return r == '•' || r == ',' || r == '，' }) {
				part := strings.TrimSpace(piece)
				if part != "" {
					collected = append(collected, part)
				}
			}
		}
	}
	return uniqueStrings(collected)
}

func extractEducation(lines []string) []map[string]any {
	for _, line := range lines {
		if strings.Contains(line, "学院") || strings.Contains(line, "大学") {
			parts := strings.Fields(line)
			entry := map[string]any{
				"institution": line,
				"degree":      "待确认学位",
				"highlights":  []any{},
			}
			if len(parts) >= 2 {
				entry["institution"] = parts[0]
				entry["degree"] = strings.Join(parts[1:], " ")
			}
			return []map[string]any{entry}
		}
	}
	return nil
}

func extractExperience(lines []string) []map[string]any {
	entries := []map[string]any{}
	for i, line := range lines {
		if strings.Contains(line, "工作经历") || line == "" {
			continue
		}
		if strings.Contains(line, "有限公司") || strings.Contains(line, "集团") || strings.Contains(line, "科技") || strings.Contains(line, "公司") {
			company, role := splitCompanyRole(line)
			entry := map[string]any{
				"company":      fallbackText(company, line),
				"role":         fallbackText(role, "待确认职位"),
				"highlights":   []any{},
				"technologies": []any{},
			}
			if i+1 < len(lines) && lines[i+1] != "" && !strings.Contains(lines[i+1], "项目经历") {
				entry["summary"] = lines[i+1]
			}
			entries = append(entries, entry)
			if len(entries) >= 2 {
				break
			}
		}
	}
	return entries
}

func splitCompanyRole(line string) (string, string) {
	markers := []string{"有限公司", "集团", "科技", "公司"}
	for _, marker := range markers {
		index := strings.Index(line, marker)
		if index >= 0 {
			cut := index + len(marker)
			company := strings.TrimSpace(line[:cut])
			role := strings.TrimSpace(line[cut:])
			return company, role
		}
	}
	return line, ""
}

func splitLines(input string) []string {
	parts := strings.Split(strings.ReplaceAll(input, "\r", ""), "\n")
	result := []string{}
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func looksLikeName(line string) bool {
	if line == "" || strings.Contains(line, "@") || strings.Contains(line, "工作经验") {
		return false
	}
	return len([]rune(line)) <= 8 && !strings.Contains(line, " ")
}

func afterMarker(line string, marker string) string {
	index := strings.Index(line, marker)
	if index < 0 {
		return ""
	}
	return line[index+len(marker):]
}

func splitPipe(line string) []string {
	raw := strings.Split(line, "|")
	parts := []string{}
	for _, part := range raw {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

func chooseBetterString(current any, extracted string, placeholder string) string {
	value := stringValue(current)
	if value == "" || value == placeholder || strings.HasPrefix(value, "待确认") {
		if extracted != "" {
			return extracted
		}
	}
	if value != "" {
		return value
	}
	if extracted != "" {
		return extracted
	}
	return placeholder
}

func chooseOptional(current any, extracted string) any {
	value := stringValue(current)
	if value != "" && !strings.HasPrefix(value, "待确认") {
		return value
	}
	if extracted != "" {
		return extracted
	}
	return nil
}

func stringValue(value any) string {
	if text, ok := value.(string); ok {
		return text
	}
	return ""
}

func fallbackText(value string, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}

func optionalText(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func mapsToAny(items []map[string]any) []any {
	result := make([]any, 0, len(items))
	for _, item := range items {
		result = append(result, item)
	}
	return result
}

func stringsToAny(items []string) []any {
	result := make([]any, 0, len(items))
	for _, item := range items {
		result = append(result, item)
	}
	return result
}

func ensureSections(document map[string]any) {
	for _, key := range []string{"education", "experience", "projects", "skills", "customSections"} {
		if _, ok := document[key]; !ok {
			document[key] = []any{}
		}
	}
}

func uniqueStrings(items []string) []string {
	seen := map[string]struct{}{}
	result := []string{}
	for _, item := range items {
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		result = append(result, item)
	}
	return result
}
